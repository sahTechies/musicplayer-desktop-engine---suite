package com.musicplayer.controller;

import com.musicplayer.database.DatabaseManager;
import com.musicplayer.database.SongDAO;
import com.musicplayer.engine.AudioEngine;
import com.musicplayer.engine.PlaybackQueue;
import com.musicplayer.engine.ShufflePriorityQueue;
import com.musicplayer.model.Playlist;
import com.musicplayer.model.Song;
import com.musicplayer.util.MetadataExtractor;
import javafx.application.Platform;
import javafx.beans.property.ReadOnlyObjectWrapper;
import javafx.beans.value.ChangeListener;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.collections.transformation.FilteredList;
import javafx.collections.transformation.SortedList;
import javafx.concurrent.Task;
import javafx.fxml.FXML;
import javafx.fxml.Initializable;
import javafx.geometry.Pos;
import javafx.geometry.Rectangle2D;
import javafx.scene.control.*;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.input.KeyCode;
import javafx.scene.input.MouseButton;
import javafx.scene.layout.HBox;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.layout.StackPane;
import javafx.scene.layout.VBox;
import javafx.scene.shape.Rectangle;
import javafx.stage.DirectoryChooser;
import javafx.stage.FileChooser;
import javafx.stage.Stage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.net.URL;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Predicate;

/**
 * Controller orchestrating the JavaFX UI, background tasks, SQLite persistence,
 * the custom data structures (linked-list queue, shuffle heap) and the audio engine.
 *
 * Playback model: the playback queue is always a snapshot of whatever list the user
 * started playing from (library, artists, albums, a playlist ...). It is only replaced
 * when the user starts playback from a view, never as a side effect of importing files.
 */
public class PlayerController implements Initializable {

    private static final Logger logger = LoggerFactory.getLogger(PlayerController.class);

    /** Name of the built-in playlist behind the heart button. It is hidden from the normal playlist list. */
    private static final String FAVOURITES_NAME = "Favourites";
    private Playlist favourites;

    // --- FXML UI Injections ---
    @FXML private BorderPane rootPane;

    @FXML private Button btnNavAllTracks;
    @FXML private Button btnNavArtists;
    @FXML private Button btnNavAlbums;
    @FXML private Button btnNavFavourites;
    @FXML private Button btnFavourite;
    @FXML private Button btnNavNowPlaying;
    @FXML private ListView<Playlist> playlistListView;
    @FXML private Label lblStorageStatus;
    @FXML private Label lblTrackCount;

    @FXML private Label lblViewTitle;
    @FXML private Label lblViewSubtitle;
    @FXML private TextField searchField;
    @FXML private Button btnPlayPlaylist;
    @FXML private Button btnAddSongsToPlaylist;
    @FXML private Button btnBackToGroups;
    @FXML private ListView<Group> groupListView;

    @FXML private TableView<Song> songsTable;
    @FXML private TableColumn<Song, Number> colIndex;
    @FXML private TableColumn<Song, String> colTitle;
    @FXML private TableColumn<Song, String> colArtist;
    @FXML private TableColumn<Song, String> colAlbum;
    @FXML private TableColumn<Song, String> colDuration;
    @FXML private TableColumn<Song, Number> colPlays;

    @FXML private Label lblTaskStatus;
    @FXML private ProgressBar taskProgressBar;

    @FXML private ImageView imgAlbumArt;
    @FXML private Label lblNowPlayingArtFallback;
    @FXML private Label lblNowPlayingTitle;
    @FXML private Label lblNowPlayingArtist;
    @FXML private Button btnShuffle;
    @FXML private Button btnPlayPause;
    @FXML private Button btnRepeat;
    @FXML private Label lblElapsedTime;
    @FXML private Label lblTotalDuration;
    @FXML private Slider seekSlider;
    @FXML private Button btnMute;
    @FXML private Slider volumeSlider;

    // --- Core systems & data structures ---
    private SongDAO songDAO;
    private AudioEngine audioEngine;
    private PlaybackQueue playbackQueue;               // Doubly linked list + HashMap
    private ShufflePriorityQueue shufflePriorityQueue; // Weighted max-heap

    // --- Observable data ---
    private final ObservableList<Song> masterSongList = FXCollections.observableArrayList();
    private final Set<String> knownPaths = new HashSet<>();      // FX thread only
    private final Set<String> artChecked = new HashSet<>();      // FX thread only
    private final ObservableList<Playlist> playlistList = FXCollections.observableArrayList();

    // --- View state ---
    private FilteredList<Song> viewFiltered;   // what the table currently shows (search applied)
    private Playlist activePlaylist = null;    // non-null while a playlist is open
    private Grouping grouping = null;          // non-null while the Artists / Albums views are active
    private Group openGroup = null;            // non-null while one artist / album is opened
    private Song displayedSong = null;         // song currently shown in the bottom Now Playing bar
    private final ChangeListener<Image> nowPlayingArtListener =
        (obs, o, img) -> applySquareArt(imgAlbumArt, lblNowPlayingArtFallback, img, 54, 12);
    private Label placeholderTitle;
    private Label placeholderSub;

    /** Reusable rounded square thumbnail container with a fallback glyph underneath. */
    private record ThumbNodes(StackPane box, ImageView iv, Label fallback) { }

    /** What the grouped view groups by. */
    private enum Grouping {
        ARTIST("Artists", "👤", "← All Artists", "artist"),
        ALBUM("Albums", "💿", "← All Albums", "album");

        final String title, icon, backText, noun;

        Grouping(String title, String icon, String backText, String noun) {
            this.title = title;
            this.icon = icon;
            this.backText = backText;
            this.noun = noun;
        }
    }

    /** One artist or album together with its songs. */
    private record Group(String name, List<Song> songs) { }

    private final ExecutorService ioExecutor = Executors.newFixedThreadPool(
        Math.max(2, Runtime.getRuntime().availableProcessors() - 1),
        r -> {
            Thread t = new Thread(r, "MusicPlayer-IO-Worker");
            t.setDaemon(true);
            return t;
        }
    );

    private boolean isSeeking = false;
    private boolean isShuffleActive = false;
    private int repeatMode = 0; // 0: Off, 1: Repeat All, 2: Repeat One

    // =======================================================================
    // Initialization
    // =======================================================================

    @Override
    public void initialize(URL location, ResourceBundle resources) {
        logger.info("Initializing PlayerController subsystems...");

        songDAO = new SongDAO();
        audioEngine = new AudioEngine();
        playbackQueue = new PlaybackQueue();
        shufflePriorityQueue = new ShufflePriorityQueue();

        setupTable();
        setupPlaylistList();
        setupGroupList();
        setupTableContextMenu();
        setupSearch();
        setupPlaybackEngineListeners();
        setupSeekSlider();
        setupVolume();

        loadStoredSettings();
        updateHeart();
        showLibrary("Music Library", "All tracks in your library", null, btnNavAllTracks);
        loadLibraryThenPlaylists();
    }

    private void setupTable() {
        colIndex.setCellValueFactory(c -> new ReadOnlyObjectWrapper<>(0));
        colIndex.setCellFactory(col -> new TableCell<>() {
            @Override
            protected void updateItem(Number item, boolean empty) {
                super.updateItem(item, empty);
                setText(empty ? null : String.valueOf(getIndex() + 1));
            }
        });
        colTitle.setCellValueFactory(c -> c.getValue().titleProperty());
        colTitle.setCellFactory(col -> new TableCell<>() {
            private final ThumbNodes thumb = createThumbBox(38, 8, "♫");
            private Song bound;
            private final ChangeListener<Image> listener =
                (obs, o, img) -> applySquareArt(thumb.iv(), thumb.fallback(), img, 38, 8);

            @Override
            protected void updateItem(String title, boolean empty) {
                super.updateItem(title, empty);
                if (bound != null) {
                    bound.albumArtProperty().removeListener(listener);
                    bound = null;
                }
                Song rowSong = getTableRow() != null ? getTableRow().getItem() : null;
                if (empty || title == null || rowSong == null) {
                    setText(null);
                    setGraphic(null);
                    return;
                }
                bound = rowSong;
                bound.albumArtProperty().addListener(listener);
                applySquareArt(thumb.iv(), thumb.fallback(), bound.getAlbumArtImage(), 38, 8);
                loadAlbumArtIfMissing(bound);
                setText(title);
                setGraphic(thumb.box());
                setContentDisplay(ContentDisplay.LEFT);
                setGraphicTextGap(12);
            }
        });
        colArtist.setCellValueFactory(c -> c.getValue().artistProperty());
        colAlbum.setCellValueFactory(c -> c.getValue().albumProperty());
        colDuration.setCellValueFactory(c -> c.getValue().formattedDurationProperty());
        colPlays.setCellValueFactory(c -> c.getValue().playCountProperty());

        songsTable.getSelectionModel().setSelectionMode(SelectionMode.MULTIPLE);

        songsTable.setRowFactory(tv -> {
            TableRow<Song> row = new TableRow<>();
            row.setOnMouseClicked(e -> {
                if (e.getButton() == MouseButton.PRIMARY && e.getClickCount() == 2 && !row.isEmpty()) {
                    startPlaybackFromView(row.getItem());
                }
            });
            return row;
        });
        songsTable.setOnKeyPressed(e -> {
            if (e.getCode() == KeyCode.ENTER) {
                Song s = songsTable.getSelectionModel().getSelectedItem();
                if (s != null) startPlaybackFromView(s);
            }
        });

        placeholderTitle = new Label();
        placeholderTitle.setStyle("-fx-text-fill: #64748b; -fx-font-size: 15px;");
        placeholderSub = new Label();
        placeholderSub.setStyle("-fx-text-fill: #475569; -fx-font-size: 13px;");
        VBox box = new VBox(10, placeholderTitle, placeholderSub);
        box.setAlignment(Pos.CENTER);
        songsTable.setPlaceholder(box);
    }

    private void setupPlaylistList() {
        playlistListView.setItems(playlistList);
        playlistListView.setCellFactory(lv -> {
            ListCell<Playlist> cell = new ListCell<>() {
                @Override
                protected void updateItem(Playlist item, boolean empty) {
                    super.updateItem(item, empty);
                    if (empty || item == null) {
                        setText(null);
                        setStyle("-fx-background-color: transparent;");
                    } else {
                        setText("📁 " + item.getName());
                        setStyle("-fx-text-fill: #94a3b8; -fx-background-color: transparent; -fx-padding: 6 8; -fx-cursor: hand;");
                    }
                }
            };

            // Mouse handler (not a selection listener) so that re-clicking an already
            // selected playlist still opens it. Single click = open, double click = play.
            cell.setOnMouseClicked(e -> {
                Playlist p = cell.getItem();
                if (cell.isEmpty() || p == null || e.getButton() != MouseButton.PRIMARY) return;
                openPlaylist(p);
                if (e.getClickCount() == 2) playPlaylist(p);
            });

            MenuItem open = new MenuItem("📂  Open");
            MenuItem play = new MenuItem("▶  Play Playlist");
            MenuItem delete = new MenuItem("🗑  Delete Playlist");
            open.setOnAction(e -> { if (cell.getItem() != null) openPlaylist(cell.getItem()); });
            play.setOnAction(e -> { if (cell.getItem() != null) playPlaylist(cell.getItem()); });
            delete.setOnAction(e -> { if (cell.getItem() != null) confirmDeletePlaylist(cell.getItem()); });
            cell.setContextMenu(new ContextMenu(open, play, new SeparatorMenuItem(), delete));
            return cell;
        });
    }

    /** Right-click menu on tracks: play next, add to playlist, remove from playlist. */
    private void setupTableContextMenu() {
        MenuItem playNext = new MenuItem("▶  Play Next");
        playNext.setOnAction(e -> {
            Song s = songsTable.getSelectionModel().getSelectedItem();
            if (s != null) {
                playbackQueue.insertAfterCurrent(s);
                lblTaskStatus.setText("\"" + s.getTitle() + "\" will play next.");
            }
        });

        Menu addToPlaylist = new Menu("➕  Add to Playlist");
        MenuItem removeFromPlaylist = new MenuItem("➖  Remove from this Playlist");
        removeFromPlaylist.setOnAction(e -> {
            if (activePlaylist != null) {
                removeSongsFromPlaylist(new ArrayList<>(songsTable.getSelectionModel().getSelectedItems()), activePlaylist);
            }
        });

        ContextMenu menu = new ContextMenu(playNext, addToPlaylist, removeFromPlaylist);
        menu.setOnShowing(e -> {
            addToPlaylist.getItems().clear();
            if (favourites != null) {
                MenuItem fav = new MenuItem("♥  Favourites");
                fav.setOnAction(ev -> addSongsToPlaylist(
                    new ArrayList<>(songsTable.getSelectionModel().getSelectedItems()), favourites));
                addToPlaylist.getItems().add(fav);
            }
            if (playlistList.isEmpty()) {
                if (favourites == null) {
                    MenuItem none = new MenuItem("(create a playlist first with the + button)");
                    none.setDisable(true);
                    addToPlaylist.getItems().add(none);
                }
            } else {
                for (Playlist pl : playlistList) {
                    MenuItem mi = new MenuItem(pl.getName());
                    mi.setOnAction(ev -> addSongsToPlaylist(
                        new ArrayList<>(songsTable.getSelectionModel().getSelectedItems()), pl));
                    addToPlaylist.getItems().add(mi);
                }
            }
            removeFromPlaylist.setVisible(activePlaylist != null);
        });
        songsTable.setContextMenu(menu);
    }

    private void setupSearch() {
        searchField.textProperty().addListener((obs, o, n) -> {
            if (isGroupListShowing()) {
                rebuildGroups();
            } else if (viewFiltered != null) {
                viewFiltered.setPredicate(searchPredicate());
            }
        });
        // Keep the artist/album list in sync when songs are imported while it is on screen.
        masterSongList.addListener((javafx.collections.ListChangeListener<Song>) c -> {
            if (isGroupListShowing()) rebuildGroups();
        });
    }

    private Predicate<Song> searchPredicate() {
        String q = searchField.getText();
        if (q == null || q.isBlank()) return s -> true;
        String lower = q.toLowerCase().trim();
        return s -> matches(s, lower);
    }

    private static boolean matches(Song s, String lowerQuery) {
        return s.getTitle().toLowerCase().contains(lowerQuery)
            || s.getArtist().toLowerCase().contains(lowerQuery)
            || s.getAlbum().toLowerCase().contains(lowerQuery);
    }

    private void setupPlaybackEngineListeners() {
        audioEngine.playbackStateProperty().addListener((obs, o, state) ->
            btnPlayPause.setText(state == AudioEngine.PlaybackState.PLAYING ? "⏸" : "▶"));

        audioEngine.currentPositionSecondsProperty().addListener((obs, o, n) -> {
            if (!isSeeking) {
                seekSlider.setValue(n.doubleValue());
                lblElapsedTime.setText(Song.formatTime(n.doubleValue()));
            }
        });

        audioEngine.totalDurationSecondsProperty().addListener((obs, o, n) -> {
            if (n.doubleValue() > 0) {
                seekSlider.setMax(n.doubleValue());
                lblTotalDuration.setText(Song.formatTime(n.doubleValue()));
            }
        });

        audioEngine.setOnEndOfMedia(() -> Platform.runLater(this::handleTrackEnded));

        audioEngine.setOnError(err -> Platform.runLater(() -> {
            String msg = err != null && err.getMessage() != null ? err.getMessage() : "Unknown playback error";
            lblTaskStatus.setText("Playback error: " + msg);
        }));
    }

    private void setupSeekSlider() {
        seekSlider.setOnMousePressed(e -> isSeeking = true);
        seekSlider.setOnMouseReleased(e -> {
            isSeeking = false;
            audioEngine.seek(seekSlider.getValue());
        });
    }

    private void setupVolume() {
        volumeSlider.setValue(audioEngine.getVolume());
        volumeSlider.valueProperty().addListener((obs, o, n) -> {
            audioEngine.setVolume(n.doubleValue());
            updateMuteButton();
        });
        // Persist only when the user lets go, not on every pixel of movement.
        volumeSlider.setOnMouseReleased(e -> saveSettingAsync("last_volume", String.valueOf(volumeSlider.getValue())));
    }

    // =======================================================================
    // View management
    // =======================================================================

    /** Points the table at a source list; search filtering + header sorting are layered on top. */
    private void showSongs(ObservableList<Song> source, Comparator<Song> fixedOrder) {
        viewFiltered = new FilteredList<>(source, searchPredicate());
        SortedList<Song> sorted = new SortedList<>(viewFiltered);
        if (fixedOrder != null) {
            sorted.setComparator(fixedOrder);
        } else {
            sorted.comparatorProperty().bind(songsTable.comparatorProperty());
        }
        songsTable.setItems(sorted);
    }

    private void setPlaceholder(String title, String sub) {
        placeholderTitle.setText(title);
        placeholderSub.setText(sub);
    }

    private void setPlaylistMode(boolean on) {
        for (Button b : new Button[]{btnPlayPlaylist, btnAddSongsToPlaylist}) {
            b.setVisible(on);
            b.setManaged(on);
        }
    }

    private void setActiveNav(Button active) {
        for (Button b : new Button[]{btnNavAllTracks, btnNavArtists, btnNavAlbums, btnNavFavourites, btnNavNowPlaying}) {
            setStyleClassActive(b, b == active);
        }
        if (active != null) playlistListView.getSelectionModel().clearSelection();
    }

    private static void setStyleClassActive(Button b, boolean active) {
        b.getStyleClass().remove("active");
        if (active) b.getStyleClass().add("active");
    }

    private void showLibrary(String title, String subtitle, Comparator<Song> order, Button nav) {
        activePlaylist = null;
        leaveGroups();
        setPlaylistMode(false);
        setActiveNav(nav);
        lblViewTitle.setText(title);
        lblViewSubtitle.setText(subtitle);
        setPlaceholder("No tracks in library yet.",
            "Click '+ Add Files' or '📁 Add Folder' to import music.");
        showSongs(masterSongList, order);
    }

    @FXML private void handleNavAllTracks() {
        showLibrary("Music Library", "All tracks in your library", null, btnNavAllTracks);
    }

    @FXML private void handleNavArtists() { showGroups(Grouping.ARTIST, btnNavArtists); }

    @FXML private void handleNavAlbums() { showGroups(Grouping.ALBUM, btnNavAlbums); }

    @FXML private void handleNavQueue() {
        activePlaylist = null;
        leaveGroups();
        setPlaylistMode(false);
        setActiveNav(btnNavNowPlaying);
        lblViewTitle.setText("Active Queue");
        lblViewSubtitle.setText(playbackQueue.size() + " tracks · play order of the doubly linked list");
        setPlaceholder("The queue is empty.", "Double-click any track to start playing.");
        showSongs(FXCollections.observableArrayList(playbackQueue.toList()), null);
    }

    // -----------------------------------------------------------------------
    // Grouped views: Artists / Albums
    // -----------------------------------------------------------------------

    private void setupGroupList() {
        groupListView.setCellFactory(lv -> {
            ListCell<Group> cell = new ListCell<>() {
                private final ThumbNodes thumb = createThumbBox(42, 10, "♫");
                private Song bound;
                private final ChangeListener<Image> listener =
                    (obs, o, img) -> applySquareArt(thumb.iv(), thumb.fallback(), img, 42, 10);

                @Override
                protected void updateItem(Group g, boolean empty) {
                    super.updateItem(g, empty);
                    if (bound != null) {
                        bound.albumArtProperty().removeListener(listener);
                        bound = null;
                    }
                    if (empty || g == null) {
                        setGraphic(null);
                        setText(null);
                        return;
                    }
                    thumb.fallback().setText(grouping != null ? grouping.icon : "♫");
                    Song rep = g.songs().stream()
                        .filter(s -> s.getAlbumArtImage() != null)
                        .findFirst()
                        .orElse(g.songs().isEmpty() ? null : g.songs().get(0));
                    if (rep != null) {
                        bound = rep;
                        bound.albumArtProperty().addListener(listener);
                        applySquareArt(thumb.iv(), thumb.fallback(), bound.getAlbumArtImage(), 42, 10);
                        loadAlbumArtIfMissing(bound);
                    } else {
                        applySquareArt(thumb.iv(), thumb.fallback(), null, 42, 10);
                    }

                    Label name = new Label(g.name());
                    name.setStyle("-fx-text-fill: #e2e8f0; -fx-font-size: 14px; -fx-font-weight: bold;");
                    Region spacer = new Region();
                    HBox.setHgrow(spacer, Priority.ALWAYS);
                    int n = g.songs().size();
                    Label count = new Label(n + (n == 1 ? " song" : " songs"));
                    count.setStyle("-fx-text-fill: #64748b; -fx-font-size: 12px;");
                    HBox row = new HBox(12, thumb.box(), name, spacer, count);
                    row.setAlignment(Pos.CENTER_LEFT);
                    setGraphic(row);
                    setText(null);
                }
            };

            // Single click opens the group, double click plays it.
            cell.setOnMouseClicked(e -> {
                Group g = cell.getItem();
                if (cell.isEmpty() || g == null || e.getButton() != MouseButton.PRIMARY) return;
                if (e.getClickCount() == 2) playGroup(g); else openGroup(g);
            });

            MenuItem open = new MenuItem("📂  Open");
            MenuItem play = new MenuItem("▶  Play All");
            open.setOnAction(e -> { if (cell.getItem() != null) openGroup(cell.getItem()); });
            play.setOnAction(e -> { if (cell.getItem() != null) playGroup(cell.getItem()); });
            cell.setContextMenu(new ContextMenu(open, play));
            return cell;
        });
    }

    private boolean isGroupListShowing() {
        return grouping != null && openGroup == null;
    }

    /** Switches the centre area back to the normal song table. */
    private void leaveGroups() {
        grouping = null;
        openGroup = null;
        setNodeShown(groupListView, false);
        setNodeShown(songsTable, true);
        setNodeShown(btnBackToGroups, false);
    }

    private static void setNodeShown(javafx.scene.Node n, boolean shown) {
        n.setVisible(shown);
        n.setManaged(shown);
    }

    /** Shows the list of artists or albums. */
    private void showGroups(Grouping g, Button nav) {
        activePlaylist = null;
        openGroup = null;
        grouping = g;
        setPlaylistMode(false);
        setActiveNav(nav);
        setNodeShown(btnBackToGroups, false);
        setNodeShown(songsTable, false);
        setNodeShown(groupListView, true);
        lblViewTitle.setText(g.title);
        rebuildGroups();
    }

    /** Recomputes the groups from the library, applying the search box to groups and their songs. */
    private void rebuildGroups() {
        if (grouping == null) return;
        String q = searchField.getText() == null ? "" : searchField.getText().toLowerCase().trim();

        Map<String, Group> byKey = new LinkedHashMap<>();
        for (Song s : masterSongList) {
            for (String name : groupNamesOf(s, grouping)) {
                byKey.computeIfAbsent(name.toLowerCase(), k -> new Group(name, new ArrayList<>())).songs().add(s);
            }
        }

        List<Group> groups = new ArrayList<>();
        for (Group g : byKey.values()) {
            boolean keep = q.isEmpty() || g.name().toLowerCase().contains(q)
                || g.songs().stream().anyMatch(s -> matches(s, q));
            if (keep) groups.add(g);
        }
        // Alphabetical, with "Unknown ..." pushed to the bottom.
        groups.sort(Comparator
            .comparing((Group g) -> g.name().startsWith("Unknown "))
            .thenComparing(Group::name, String.CASE_INSENSITIVE_ORDER));

        groupListView.setItems(FXCollections.observableArrayList(groups));
        lblViewSubtitle.setText(groups.size() + " " + grouping.noun + (groups.size() == 1 ? "" : "s")
            + " · click one to see its songs, double-click to play it");
        if (groups.isEmpty()) {
            groupListView.setPlaceholder(new Label(masterSongList.isEmpty()
                ? "No tracks in library yet." : "Nothing matches your search."));
        }
    }

    /**
     * Names a song is filed under. A collaboration such as "Arijit Singh & Amaal Mallik" or
     * "Achint, Arijit Singh feat. X" appears under every credited artist, so opening
     * "Arijit Singh" lists all of his songs. Albums are not split.
     */
    private static List<String> groupNamesOf(Song s, Grouping by) {
        if (by == Grouping.ALBUM) return List.of(s.getAlbum().trim());

        List<String> names = new ArrayList<>();
        for (String part : s.getArtist().split("(?i)\\s*(?:,|;|&|\\bfeat\\.?|\\bft\\.?|\\bfeaturing\\b)\\s*")) {
            String name = part.trim();
            if (!name.isEmpty() && names.stream().noneMatch(n -> n.equalsIgnoreCase(name))) names.add(name);
        }
        return names.isEmpty() ? List.of("Unknown Artist") : names;
    }

    /** Opens one artist/album: shows its songs in the table with Back and Play All buttons. */
    private void openGroup(Group g) {
        if (grouping == null) return;
        openGroup = g;
        activePlaylist = null;
        setNodeShown(groupListView, false);
        setNodeShown(songsTable, true);
        setNodeShown(btnBackToGroups, true);
        btnBackToGroups.setText(grouping.backText);
        setNodeShown(btnPlayPlaylist, true);
        btnPlayPlaylist.setText("▶ Play All");
        setNodeShown(btnAddSongsToPlaylist, false);

        List<Song> songs = new ArrayList<>(g.songs());
        songs.sort(Comparator.comparing(Song::getTitle, String.CASE_INSENSITIVE_ORDER));
        lblViewTitle.setText(g.name());
        lblViewSubtitle.setText(songs.size() + " songs · " + Song.formatTime(
            songs.stream().mapToDouble(Song::getDurationSeconds).sum()));
        setPlaceholder("No songs here.", "Try clearing the search box.");
        showSongs(FXCollections.observableArrayList(songs), null);
    }

    private void playGroup(Group g) {
        openGroup(g);
        List<Song> songs = songsTable.getItems();
        if (songs.isEmpty()) return;
        Song first = isShuffleActive ? songs.get(new Random().nextInt(songs.size())) : songs.get(0);
        startPlaybackFromView(first);
        lblTaskStatus.setText("Playing " + grouping.noun + " \"" + g.name() + "\" (" + songs.size() + " tracks)");
    }

    @FXML private void handleBackToGroups() {
        if (grouping != null) showGroups(grouping, grouping == Grouping.ARTIST ? btnNavArtists : btnNavAlbums);
    }

    @FXML private void handleToggleQueueDrawer() {
        handleNavQueue();
    }

    private void updateLibraryStats() {
        lblTrackCount.setText(masterSongList.size() + " tracks indexed");
        lblStorageStatus.setText("SQLite: " + masterSongList.size() + " records");
    }

    @FXML private void handleNavFavourites() {
        if (favourites == null) {
            lblTaskStatus.setText("Favourites is still loading — try again in a moment.");
            return;
        }
        openPlaylist(favourites);
        setPlaceholder("No favourites yet.",
            "Press the ♡ heart next to the playing song, or use '➕ Add Songs' above.");
    }

    /** Heart button: add / remove the song that is playing now from Favourites. */
    @FXML private void handleToggleFavourite() {
        Song current = activeOrDisplayedSong();
        if (current == null) return;
        if (favourites == null) {
            lblTaskStatus.setText("Favourites is still loading — try again in a moment.");
            return;
        }
        if (favourites.getSongs().contains(current)) {
            removeSongsFromPlaylist(List.of(current), favourites);
        } else {
            addSongsToPlaylist(List.of(current), favourites);
        }
    }

    /** Heart is filled and red when the playing song is in Favourites, hollow and grey otherwise. */
    private void updateHeart() {
        Song current = activeOrDisplayedSong();
        boolean liked = current != null && favourites != null && favourites.getSongs().contains(current);
        btnFavourite.setText(liked ? "♥" : "♡");
        btnFavourite.getStyleClass().remove("liked");
        if (liked) btnFavourite.getStyleClass().add("liked");
        btnFavourite.setDisable(current == null);
        btnFavourite.setTooltip(new Tooltip(liked ? "Remove from Favourites" : "Add to Favourites"));
    }

    private Song activeOrDisplayedSong() {
        Song current = audioEngine.getCurrentSong();
        return current != null ? current : displayedSong;
    }

    // =======================================================================
    // Playlists
    // =======================================================================

    private void openPlaylist(Playlist p) {
        leaveGroups();
        activePlaylist = p;
        setPlaylistMode(true);
        btnPlayPlaylist.setText("▶ Play Playlist");
        setActiveNav(p == favourites ? btnNavFavourites : null);
        playlistListView.getSelectionModel().select(p);
        lblViewTitle.setText(p == favourites ? "♥ " + p.getName() : p.getName());
        updatePlaylistSubtitle();
        setPlaceholder("This playlist is empty.", "Click '➕ Add Songs' above to pick tracks from your library.");
        showSongs(p.getSongs(), null);
    }

    private void updatePlaylistSubtitle() {
        if (activePlaylist != null) {
            lblViewSubtitle.setText(activePlaylist.getSongCount() + " songs · "
                + activePlaylist.getFormattedTotalDuration());
        }
    }

    private void playPlaylist(Playlist p) {
        if (p.getSongs().isEmpty()) {
            openPlaylist(p);
            lblTaskStatus.setText("\"" + p.getName() + "\" is empty — add some songs first.");
            return;
        }
        openPlaylist(p);
        List<Song> songs = p.getSongs();
        Song first = isShuffleActive ? songs.get(new Random().nextInt(songs.size())) : songs.get(0);
        startPlaybackFromView(first);
        lblTaskStatus.setText("Playing playlist \"" + p.getName() + "\" (" + songs.size() + " tracks)");
    }

    @FXML private void handlePlayPlaylist() {
        if (activePlaylist != null) playPlaylist(activePlaylist);
        else if (openGroup != null) playGroup(openGroup);
    }

    @FXML private void handleNewPlaylist() {
        TextInputDialog dialog = new TextInputDialog("New Playlist");
        dialog.setTitle("Create Playlist");
        dialog.setHeaderText("Create a new playlist");
        dialog.setContentText("Name:");
        dialog.showAndWait().ifPresent(raw -> {
            String name = raw.trim();
            if (name.isEmpty()) return;
            ioExecutor.submit(() -> {
                int id = songDAO.createPlaylist(name);
                Platform.runLater(() -> {
                    if (id > 0) {
                        Playlist p = new Playlist(id, name);
                        playlistList.add(p);
                        openPlaylist(p);
                        lblTaskStatus.setText("Playlist \"" + name + "\" created — click '➕ Add Songs'.");
                    } else {
                        lblTaskStatus.setText("A playlist named \"" + name + "\" already exists.");
                    }
                });
            });
        });
    }

    /** Opens a picker listing library songs that are not yet in the open playlist. */
    @FXML private void handleAddSongsToPlaylist() {
        Playlist pl = activePlaylist;
        if (pl == null) return;

        List<Song> candidates = new ArrayList<>();
        for (Song s : masterSongList) {
            if (!pl.getSongs().contains(s)) candidates.add(s);
        }
        if (candidates.isEmpty()) {
            lblTaskStatus.setText(masterSongList.isEmpty()
                ? "Your library is empty — import some music first."
                : "Every song in your library is already in this playlist.");
            return;
        }

        Dialog<ButtonType> dlg = new Dialog<>();
        dlg.setTitle("Add songs to \"" + pl.getName() + "\"");
        dlg.setHeaderText("Select songs (Ctrl/Shift for multiple), then press Add");
        dlg.initOwner(rootPane.getScene().getWindow());

        TextField search = new TextField();
        search.setPromptText("Search title, artist, album...");
        FilteredList<Song> filtered = new FilteredList<>(FXCollections.observableArrayList(candidates), s -> true);
        search.textProperty().addListener((obs, o, n) -> {
            String q = n == null ? "" : n.toLowerCase().trim();
            filtered.setPredicate(q.isEmpty() ? s -> true : s -> matches(s, q));
        });

        ListView<Song> list = new ListView<>(filtered);
        list.getSelectionModel().setSelectionMode(SelectionMode.MULTIPLE);
        list.setPrefSize(560, 380);
        list.setCellFactory(lv -> new ListCell<>() {
            private final ThumbNodes thumb = createThumbBox(34, 6, "♫");
            private Song bound;
            private final ChangeListener<Image> listener =
                (obs, o, img) -> applySquareArt(thumb.iv(), thumb.fallback(), img, 34, 6);

            @Override
            protected void updateItem(Song s, boolean empty) {
                super.updateItem(s, empty);
                if (bound != null) {
                    bound.albumArtProperty().removeListener(listener);
                    bound = null;
                }
                if (empty || s == null) {
                    setText(null);
                    setGraphic(null);
                    return;
                }
                bound = s;
                bound.albumArtProperty().addListener(listener);
                applySquareArt(thumb.iv(), thumb.fallback(), s.getAlbumArtImage(), 34, 6);
                loadAlbumArtIfMissing(s);
                setText(s.getTitle() + "   —   " + s.getArtist());
                setGraphic(thumb.box());
                setContentDisplay(ContentDisplay.LEFT);
                setGraphicTextGap(10);
            }
        });

        dlg.getDialogPane().setContent(new VBox(8, search, list));
        dlg.getDialogPane().getButtonTypes().addAll(ButtonType.OK, ButtonType.CANCEL);
        ((Button) dlg.getDialogPane().lookupButton(ButtonType.OK)).setText("Add Selected");

        dlg.showAndWait().ifPresent(bt -> {
            if (bt == ButtonType.OK) {
                addSongsToPlaylist(new ArrayList<>(list.getSelectionModel().getSelectedItems()), pl);
            }
        });
    }

    private void addSongsToPlaylist(List<Song> songs, Playlist playlist) {
        List<Song> toAdd = new ArrayList<>();
        for (Song s : songs) {
            if (s.getId() > 0 && !playlist.getSongs().contains(s)) toAdd.add(s);
        }
        if (toAdd.isEmpty()) {
            lblTaskStatus.setText(songs.isEmpty()
                ? "Select one or more songs first."
                : "Selected song(s) are already in \"" + playlist.getName() + "\".");
            return;
        }

        int base = playlist.getSongCount();
        ioExecutor.submit(() -> {
            List<Song> saved = new ArrayList<>();
            for (int i = 0; i < toAdd.size(); i++) {
                if (songDAO.addSongToPlaylist(playlist.getId(), toAdd.get(i).getId(), base + i)) {
                    saved.add(toAdd.get(i));
                }
            }
            Platform.runLater(() -> {
                saved.forEach(playlist::addSong);
                lblTaskStatus.setText(saved.size() + " song(s) added to \"" + playlist.getName() + "\".");
                if (playlist == activePlaylist) updatePlaylistSubtitle();
            });
        });
    }

    private void removeSongsFromPlaylist(List<Song> songs, Playlist playlist) {
        if (songs.isEmpty()) return;
        ioExecutor.submit(() -> {
            List<Song> removed = new ArrayList<>();
            for (Song s : songs) {
                if (songDAO.removeSongFromPlaylist(playlist.getId(), s.getId())) removed.add(s);
            }
            Platform.runLater(() -> {
                playlist.getSongs().removeAll(removed);
                lblTaskStatus.setText(removed.size() + " song(s) removed from \"" + playlist.getName() + "\".");
                if (playlist == activePlaylist) updatePlaylistSubtitle();
            });
        });
    }

    private void confirmDeletePlaylist(Playlist playlist) {
        Alert confirm = new Alert(Alert.AlertType.CONFIRMATION);
        confirm.setTitle("Delete Playlist");
        confirm.setHeaderText("Delete \"" + playlist.getName() + "\"?");
        confirm.setContentText("The playlist is removed; your songs are not deleted.");
        confirm.showAndWait().ifPresent(btn -> {
            if (btn != ButtonType.OK) return;
            ioExecutor.submit(() -> {
                songDAO.deletePlaylist(playlist.getId());
                Platform.runLater(() -> {
                    playlistList.remove(playlist);
                    if (activePlaylist == playlist) handleNavAllTracks();
                    lblTaskStatus.setText("Playlist \"" + playlist.getName() + "\" deleted.");
                });
            });
        });
    }

    // =======================================================================
    // Playback
    // =======================================================================

    /** Makes the currently visible list the playback queue, then plays the given song. */
    private void startPlaybackFromView(Song song) {
        List<Song> view = new ArrayList<>(songsTable.getItems());
        if (!view.contains(song)) view.add(0, song);
        playbackQueue.loadPlaylist(view);
        playbackQueue.setCurrentSong(song);
        if (isShuffleActive) shufflePriorityQueue.rebuild(view);
        logger.info("Queue loaded with {} tracks", view.size());
        playSelectedSong(song);
    }

    private void playSelectedSong(Song song) {
        if (song == null) return;
        playbackQueue.setCurrentSong(song);
        bindNowPlayingBanner(song);

        audioEngine.play(song);
        updateHeart();

        ioExecutor.submit(() -> {
            songDAO.incrementPlayCount(song.getId());
            songDAO.saveSetting("last_played_path", song.getFilePath());
            Platform.runLater(song::incrementPlayCount);
        });
    }

    /** Updates the bottom Now Playing bar (title, artist, cover art + reactive listener) for a song. */
    private void bindNowPlayingBanner(Song song) {
        if (displayedSong != null) {
            displayedSong.albumArtProperty().removeListener(nowPlayingArtListener);
        }
        displayedSong = song;
        if (song == null) {
            applySquareArt(imgAlbumArt, lblNowPlayingArtFallback, null, 54, 12);
            return;
        }
        lblNowPlayingTitle.setText(song.getTitle());
        lblNowPlayingArtist.setText(song.getArtist() + " · " + song.getAlbum());
        song.albumArtProperty().addListener(nowPlayingArtListener);
        applySquareArt(imgAlbumArt, lblNowPlayingArtFallback, song.getAlbumArtImage(), 54, 12);
        loadAlbumArtIfMissing(song);
        updateHeart();
    }

    /** Builds a fixed-size rounded thumbnail StackPane with fallback glyph behind a clipped ImageView. */
    private static ThumbNodes createThumbBox(double size, double arc, String fallbackGlyph) {
        Label fallback = new Label(fallbackGlyph);
        fallback.getStyleClass().add("art-fallback-icon-sm");

        ImageView iv = new ImageView();
        iv.setFitWidth(size);
        iv.setFitHeight(size);
        iv.setSmooth(true);
        iv.setVisible(false);
        Rectangle clip = new Rectangle(size, size);
        clip.setArcWidth(arc);
        clip.setArcHeight(arc);
        iv.setClip(clip);

        StackPane box = new StackPane(fallback, iv);
        box.getStyleClass().add("thumb-box");
        box.setPrefSize(size, size);
        box.setMinSize(size, size);
        box.setMaxSize(size, size);
        return new ThumbNodes(box, iv, fallback);
    }

    /** Applies a center-cropped square viewport and rounded clip to an ImageView, or shows the fallback icon. */
    private static void applySquareArt(ImageView iv, Label fallback, Image img, double size, double arc) {
        if (iv.getClip() == null) {
            Rectangle clip = new Rectangle(size, size);
            clip.setArcWidth(arc);
            clip.setArcHeight(arc);
            iv.setClip(clip);
        }
        if (img != null && !img.isError() && img.getWidth() > 0 && img.getHeight() > 0) {
            double w = img.getWidth();
            double h = img.getHeight();
            double side = Math.min(w, h);
            iv.setViewport(new Rectangle2D((w - side) / 2.0, (h - side) / 2.0, side, side));
            iv.setPreserveRatio(false);
            iv.setImage(img);
            iv.setVisible(true);
            if (fallback != null) fallback.setVisible(false);
        } else {
            iv.setImage(null);
            iv.setVisible(false);
            if (fallback != null) fallback.setVisible(true);
        }
    }

    /** Songs loaded from SQLite carry no cover art; extract and decode on background worker once. */
    private void loadAlbumArtIfMissing(Song song) {
        if (song == null || song.getAlbumArtImage() != null || !artChecked.add(song.getFilePath())) return;
        MetadataExtractor.submitArtworkTask(() -> {
            byte[] artBytes = MetadataExtractor.extractArtworkBytes(new File(song.getFilePath()));
            Image decoded = Song.decodeAlbumArt(artBytes);
            if (decoded != null) {
                Platform.runLater(() -> song.setAlbumArtImage(decoded));
            }
        });
    }

    private void handleTrackEnded() {
        Song current = playbackQueue.getCurrent();
        if (repeatMode == 2 && current != null) {
            playSelectedSong(current);
        } else {
            advance(true);
        }
    }

    /** Moves to the next/previous track honouring shuffle and repeat-all. */
    private void advance(boolean forward) {
        Song current = playbackQueue.getCurrent();
        Song next;
        if (forward && isShuffleActive) {
            next = shufflePriorityQueue.pollNext();
            if (next == null && repeatMode == 1) {
                shufflePriorityQueue.rebuild(playbackQueue.toList());
                next = shufflePriorityQueue.pollNext();
            }
            if (next != null && next.equals(current) && playbackQueue.size() > 1) {
                Song other = shufflePriorityQueue.pollNext();
                if (other != null) next = other;
            }
        } else {
            next = forward ? playbackQueue.getNext() : playbackQueue.getPrevious();
        }

        if (next == null) {
            handleStop();
            return;
        }
        playSelectedSong(next);
        songsTable.getSelectionModel().clearSelection();
        songsTable.getSelectionModel().select(next);
        songsTable.scrollTo(next);
    }

    @FXML private void handleTogglePlayPause() {
        AudioEngine.PlaybackState state = audioEngine.getPlaybackState();
        if (state == AudioEngine.PlaybackState.STOPPED || state == AudioEngine.PlaybackState.ERROR) {
            Song target = playbackQueue.getCurrent();
            if (target == null || playbackQueue.isEmpty()) {
                List<Song> view = songsTable.getItems();
                if (view.isEmpty()) {
                    lblTaskStatus.setText("Nothing to play yet — import some music first.");
                    return;
                }
                startPlaybackFromView(view.get(0));
            } else {
                playSelectedSong(target);
            }
        } else {
            audioEngine.togglePlayPause();
        }
    }

    @FXML private void handleStop() {
        audioEngine.stop();
        lblElapsedTime.setText("00:00");
        seekSlider.setValue(0.0);
    }

    @FXML private void handleNext() { advance(true); }

    @FXML private void handlePrevious() { advance(false); }

    @FXML private void handleToggleShuffle() {
        isShuffleActive = !isShuffleActive;
        setStyleClassActive(btnShuffle, isShuffleActive);
        if (isShuffleActive) {
            shufflePriorityQueue.rebuild(playbackQueue.toList());
            lblTaskStatus.setText("Shuffle on (weighted priority queue)");
        } else {
            lblTaskStatus.setText("Shuffle off (sequential linked list)");
        }
        saveSettingAsync("shuffle_enabled", String.valueOf(isShuffleActive));
    }

    @FXML private void handleToggleRepeat() {
        repeatMode = (repeatMode + 1) % 3;
        playbackQueue.setRepeatAll(repeatMode == 1);
        btnRepeat.setText(repeatMode == 2 ? "🔂" : "🔁");
        setStyleClassActive(btnRepeat, repeatMode != 0);
        lblTaskStatus.setText(switch (repeatMode) {
            case 1 -> "Repeat all";
            case 2 -> "Repeat current track";
            default -> "Repeat off";
        });
        saveSettingAsync("repeat_mode", String.valueOf(repeatMode));
    }

    @FXML private void handleToggleMute() {
        audioEngine.setMuted(!audioEngine.isMuted());
        updateMuteButton();
    }

    private void updateMuteButton() {
        boolean muted = audioEngine.isMuted() || volumeSlider.getValue() == 0;
        btnMute.setText(muted ? "🔇" : "🔊");
    }

    // =======================================================================
    // Importing & scanning
    // =======================================================================

    @FXML private void handleAddFiles() {
        FileChooser chooser = new FileChooser();
        chooser.setTitle("Import Audio Files");
        chooser.getExtensionFilters().add(
            new FileChooser.ExtensionFilter("Audio Files (*.mp3, *.wav)", "*.mp3", "*.wav"));
        List<File> files = chooser.showOpenMultipleDialog((Stage) rootPane.getScene().getWindow());
        if (files != null && !files.isEmpty()) importFilesAsync(files);
    }

    @FXML private void handleAddFolder() {
        DirectoryChooser chooser = new DirectoryChooser();
        chooser.setTitle("Select Audio Folder");
        File folder = chooser.showDialog((Stage) rootPane.getScene().getWindow());
        if (folder != null && folder.isDirectory()) scanFoldersAsync(List.of(folder));
    }

    /** Re-scans the Music folder plus every folder that already contains library songs. */
    @FXML private void handleRescan() {
        Set<File> dirs = new LinkedHashSet<>(defaultMusicFolders());
        for (Song s : masterSongList) {
            File parent = new File(s.getFilePath()).getParentFile();
            if (parent != null && parent.isDirectory()) dirs.add(parent);
        }
        if (dirs.isEmpty()) {
            lblTaskStatus.setText("No folders to scan. Use 'Add Folder' first.");
            return;
        }
        scanFoldersAsync(new ArrayList<>(dirs));
    }

    private List<File> defaultMusicFolders() {
        String home = System.getProperty("user.home");
        List<File> result = new ArrayList<>();
        for (String rel : new String[]{"Music", "OneDrive" + File.separator + "Music"}) {
            File dir = new File(home, rel);
            if (dir.isDirectory()) result.add(dir);
        }
        return result;
    }

    /** Runs at every startup: picks up any new MP3/WAV files in the user's Music folder. */
    private void autoScanMusicFolders() {
        List<File> dirs = defaultMusicFolders();
        if (dirs.isEmpty()) {
            lblTaskStatus.setText(masterSongList.isEmpty()
                ? "No Music folder found. Use '+ Add Files' or '📁 Add Folder'."
                : "Library loaded — " + masterSongList.size() + " tracks.");
            return;
        }
        logger.info("Auto-scanning {}", dirs);
        scanFoldersAsync(dirs);
    }

    private void scanFoldersAsync(List<File> dirs) {
        taskProgressBar.setProgress(ProgressBar.INDETERMINATE_PROGRESS);
        taskProgressBar.setVisible(true);
        lblTaskStatus.setText("Scanning for new music…");

        Task<List<File>> scan = new Task<>() {
            @Override
            protected List<File> call() {
                List<File> found = new ArrayList<>();
                for (File d : dirs) collectAudioFiles(d, found);
                return found;
            }
        };
        scan.setOnSucceeded(e -> {
            taskProgressBar.setVisible(false);
            List<File> fresh = new ArrayList<>();
            for (File f : scan.getValue()) {
                if (!knownPaths.contains(f.getAbsolutePath())) fresh.add(f);
            }
            if (fresh.isEmpty()) {
                lblTaskStatus.setText("Library is up to date — " + masterSongList.size() + " tracks.");
            } else {
                importFilesAsync(fresh);
            }
        });
        scan.setOnFailed(e -> {
            taskProgressBar.setVisible(false);
            lblTaskStatus.setText("Scan failed: " + scan.getException().getMessage());
        });
        ioExecutor.submit(scan);
    }

    private void collectAudioFiles(File dir, List<File> out) {
        File[] children = dir.listFiles();
        if (children == null) return;
        for (File f : children) {
            if (f.isDirectory()) {
                collectAudioFiles(f, out);
            } else {
                String n = f.getName().toLowerCase();
                if (n.endsWith(".mp3") || n.endsWith(".wav")) out.add(f);
            }
        }
    }

    /** Extracts tags on a worker thread and upserts each song into SQLite; skips known files. */
    private void importFilesAsync(List<File> input) {
        List<File> files = new ArrayList<>();
        for (File f : input) {
            if (!knownPaths.contains(f.getAbsolutePath())) files.add(f);
        }
        if (files.isEmpty()) {
            lblTaskStatus.setText("Those files are already in your library.");
            return;
        }

        taskProgressBar.setVisible(true);
        lblTaskStatus.setText("Reading metadata for " + files.size() + " file(s)…");

        Task<List<Song>> task = new Task<>() {
            @Override
            protected List<Song> call() {
                List<Song> done = new ArrayList<>();
                for (int i = 0; i < files.size(); i++) {
                    Song song = MetadataExtractor.extractMetadata(files.get(i));
                    if (song != null) {
                        Song saved = songDAO.insertOrUpdateSong(song);
                        if (saved != null) {
                            saved.setAlbumArtBytes(song.getAlbumArtBytes());
                            done.add(saved);
                        }
                    }
                    updateProgress(i + 1, files.size());
                }
                return done;
            }
        };
        taskProgressBar.progressProperty().bind(task.progressProperty());

        task.setOnSucceeded(e -> {
            taskProgressBar.progressProperty().unbind();
            taskProgressBar.setVisible(false);
            int added = 0;
            for (Song s : task.getValue()) {
                if (knownPaths.add(s.getFilePath())) {
                    s.getAlbumArtImage(); // populate albumArtProperty from extracted bytes if present
                    loadAlbumArtIfMissing(s);
                    masterSongList.add(s);
                    added++;
                }
            }
            if (playbackQueue.isEmpty()) playbackQueue.loadPlaylist(masterSongList);
            if (displayedSong == null) restoreLastPlayedBanner();
            updateLibraryStats();
            lblTaskStatus.setText("Import complete: " + added + " new track(s) added.");
        });
        task.setOnFailed(e -> {
            taskProgressBar.progressProperty().unbind();
            taskProgressBar.setVisible(false);
            lblTaskStatus.setText("Import error: " + task.getException().getMessage());
        });
        ioExecutor.submit(task);
    }

    // =======================================================================
    // Loading from SQLite
    // =======================================================================

    /** Loads songs, then playlists (so playlists can reuse the same Song objects), then auto-scans. */
    private void loadLibraryThenPlaylists() {
        Task<List<Song>> task = new Task<>() {
            @Override
            protected List<Song> call() {
                return songDAO.getAllSongs();
            }
        };
        task.setOnSucceeded(e -> {
            masterSongList.setAll(task.getValue());
            knownPaths.clear();
            for (Song s : masterSongList) knownPaths.add(s.getFilePath());
            if (playbackQueue.isEmpty()) playbackQueue.loadPlaylist(masterSongList);
            restoreLastPlayedBanner();
            for (Song s : masterSongList) loadAlbumArtIfMissing(s);
            updateLibraryStats();
            loadPlaylists();
        });
        task.setOnFailed(e -> lblTaskStatus.setText("Could not read library: " + task.getException().getMessage()));
        ioExecutor.submit(task);
    }

    private void loadPlaylists() {
        Task<List<Playlist>> task = new Task<>() {
            @Override
            protected List<Playlist> call() {
                return songDAO.getAllPlaylists();
            }
        };
        task.setOnSucceeded(e -> {
            Map<String, Song> byPath = new HashMap<>();
            for (Song s : masterSongList) byPath.putIfAbsent(s.getFilePath(), s);
            for (Playlist p : task.getValue()) {
                List<Song> shared = new ArrayList<>();
                for (Song s : p.getSongs()) shared.add(byPath.getOrDefault(s.getFilePath(), s));
                p.getSongs().setAll(shared);
            }
            playlistList.setAll(task.getValue());
            adoptFavourites();
            autoScanMusicFolders();
        });
        task.setOnFailed(e -> autoScanMusicFolders());
        ioExecutor.submit(task);
    }

    /** Pulls the built-in Favourites playlist out of the loaded playlists, creating it on first run. */
    private void adoptFavourites() {
        for (Playlist p : playlistList) {
            if (FAVOURITES_NAME.equalsIgnoreCase(p.getName())) {
                setFavourites(p);
                playlistList.remove(p);
                return;
            }
        }
        ioExecutor.submit(() -> {
            int id = songDAO.createPlaylist(FAVOURITES_NAME);
            if (id > 0) Platform.runLater(() -> setFavourites(new Playlist(id, FAVOURITES_NAME)));
        });
    }

    private void setFavourites(Playlist p) {
        favourites = p;
        // Any change to the list (heart, context menu, Add Songs dialog) refreshes the heart.
        p.getSongs().addListener((javafx.collections.ListChangeListener<Song>) c -> updateHeart());
        updateHeart();
    }

    /** Restores the last-played track (and its thumbnail) into the Now Playing bar on startup. */
    private void restoreLastPlayedBanner() {
        if (audioEngine.getCurrentSong() != null || masterSongList.isEmpty()) return;
        String lastPath = songDAO.getSetting("last_played_path", "");
        Song target = null;
        if (lastPath != null && !lastPath.isEmpty()) {
            for (Song s : masterSongList) {
                if (lastPath.equals(s.getFilePath())) {
                    target = s;
                    break;
                }
            }
        }
        if (target == null) target = masterSongList.get(0);
        playbackQueue.setCurrentSong(target);
        bindNowPlayingBanner(target);
        if (target.getDurationSeconds() > 0) {
            seekSlider.setMax(target.getDurationSeconds());
            lblTotalDuration.setText(target.getFormattedDuration());
        }
    }

    private void loadStoredSettings() {
        try {
            double v = Double.parseDouble(songDAO.getSetting("last_volume", "0.8"));
            volumeSlider.setValue(v);
        } catch (NumberFormatException ignored) { }

        if (Boolean.parseBoolean(songDAO.getSetting("shuffle_enabled", "false"))) {
            isShuffleActive = true;
            setStyleClassActive(btnShuffle, true);
        }
        try {
            repeatMode = Integer.parseInt(songDAO.getSetting("repeat_mode", "0")) % 3;
            playbackQueue.setRepeatAll(repeatMode == 1);
            btnRepeat.setText(repeatMode == 2 ? "🔂" : "🔁");
            setStyleClassActive(btnRepeat, repeatMode != 0);
        } catch (NumberFormatException ignored) { }
    }

    private void saveSettingAsync(String key, String value) {
        ioExecutor.submit(() -> songDAO.saveSetting(key, value));
    }

    // =======================================================================
    // Shutdown
    // =======================================================================

    public void cleanup() {
        logger.info("Shutting down MusicPlayer controller...");
        songDAO.saveSetting("last_volume", String.valueOf(volumeSlider.getValue()));
        audioEngine.shutdown();
        MetadataExtractor.shutdown();
        ioExecutor.shutdown();
        DatabaseManager.getInstance().closeConnection();
    }
}
