export interface CodeFile {
  path: string;
  name: string;
  category: 'Configuration' | 'Model Layer' | 'Database' | 'Data Structures & Engine' | 'UI & Controller' | 'Packaging';
  language: 'xml' | 'java' | 'css' | 'markdown';
  description: string;
  content: string;
}

export const JAVA_PROJECT_FILES: CodeFile[] = [
  {
    path: 'pom.xml',
    name: 'pom.xml',
    category: 'Configuration',
    language: 'xml',
    description: 'Maven Project Object Model with JavaFX 21, SQLite JDBC, Jaudiotagger, and Maven Shade fat-JAR configuration.',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
                             http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.musicplayer</groupId>
    <artifactId>music-player</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>

    <name>MusicPlayer</name>
    <description>Production-grade multithreaded desktop audio player for Windows</description>

    <properties>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <maven.compiler.release>21</maven.compiler.release>
        <javafx.version>21.0.2</javafx.version>
        <sqlite.version>3.45.1.0</sqlite.version>
        <jaudiotagger.version>3.0.1</jaudiotagger.version>
        <slf4j.version>2.0.12</slf4j.version>
    </properties>

    <dependencies>
        <!-- JavaFX Controls -->
        <dependency>
            <groupId>org.openjfx</groupId>
            <artifactId>javafx-controls</artifactId>
            <version>\${javafx.version}</version>
        </dependency>

        <!-- JavaFX FXML -->
        <dependency>
            <groupId>org.openjfx</groupId>
            <artifactId>javafx-fxml</artifactId>
            <version>\${javafx.version}</version>
        </dependency>

        <!-- JavaFX Media (MP3 & WAV audio engine) -->
        <dependency>
            <groupId>org.openjfx</groupId>
            <artifactId>javafx-media</artifactId>
            <version>\${javafx.version}</version>
        </dependency>
        <dependency>
            <groupId>org.openjfx</groupId>
            <artifactId>javafx-media</artifactId>
            <version>\${javafx.version}</version>
            <classifier>win</classifier>
        </dependency>

        <!-- Embedded SQLite JDBC Driver -->
        <dependency>
            <groupId>org.xerial</groupId>
            <artifactId>sqlite-jdbc</artifactId>
            <version>\${sqlite.version}</version>
        </dependency>

        <!-- Jaudiotagger: ID3v1/ID3v2 & Metadata Extraction -->
        <dependency>
            <groupId>net.jthink</groupId>
            <artifactId>jaudiotagger</artifactId>
            <version>\${jaudiotagger.version}</version>
        </dependency>

        <!-- Logging Facade -->
        <dependency>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-api</artifactId>
            <version>\${slf4j.version}</version>
        </dependency>
        <dependency>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-simple</artifactId>
            <version>\${slf4j.version}</version>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <!-- Maven Compiler Plugin -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.12.1</version>
                <configuration>
                    <release>21</release>
                </configuration>
            </plugin>

            <!-- JavaFX Maven Plugin for Development Running -->
            <plugin>
                <groupId>org.openjfx</groupId>
                <artifactId>javafx-maven-plugin</artifactId>
                <version>0.0.8</version>
                <executions>
                    <execution>
                        <id>default-cli</id>
                        <configuration>
                            <mainClass>com.musicplayer.MainApp</mainClass>
                            <options>
                                <option>--add-modules</option>
                                <option>javafx.controls,javafx.fxml,javafx.media</option>
                            </options>
                        </configuration>
                    </execution>
                </executions>
            </plugin>

            <!-- Maven Shade Plugin for Standalone Fat JAR -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-shade-plugin</artifactId>
                <version>3.5.2</version>
                <executions>
                    <execution>
                        <phase>package</phase>
                        <goals>
                            <goal>shade</goal>
                        </goals>
                        <configuration>
                            <shadedArtifactAttached>true</shadedArtifactAttached>
                            <shadedClassifierName>all</shadedClassifierName>
                            <transformers>
                                <transformer implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
                                    <mainClass>com.musicplayer.MainApp</mainClass>
                                </transformer>
                            </transformers>
                            <filters>
                                <filter>
                                    <artifact>*:*</artifact>
                                    <excludes>
                                        <exclude>META-INF/*.SF</exclude>
                                        <exclude>META-INF/*.DSA</exclude>
                                        <exclude>META-INF/*.RSA</exclude>
                                    </excludes>
                                </filter>
                            </filters>
                        </configuration>
                    </execution>
                </executions>
            </plugin>
        </plugins>

        <resources>
            <resource>
                <directory>src/main/resources</directory>
                <filtering>false</filtering>
            </resource>
        </resources>
    </build>
</project>`
  },
  {
    path: 'src/main/java/com/musicplayer/model/Song.java',
    name: 'Song.java',
    category: 'Model Layer',
    language: 'java',
    description: 'POJO with JavaFX property bindings, album art byte storage, duration formatting, and priority scoring.',
    content: `package com.musicplayer.model;

import javafx.beans.property.*;
import javafx.scene.image.Image;

import java.io.ByteArrayInputStream;
import java.util.Objects;

/**
 * Model class representing an audio track in the library.
 * Implements full JavaFX property bindings for seamless UI TableView synchronization.
 */
public class Song {

    private final IntegerProperty id;
    private final StringProperty filePath;
    private final StringProperty title;
    private final StringProperty artist;
    private final StringProperty album;
    private final DoubleProperty durationSeconds;
    private final IntegerProperty playCount;
    private final StringProperty formattedDuration;

    private byte[] albumArtBytes;
    private Image cachedAlbumArt;
    private int priority; // Dynamic weight for shuffle priority queue

    public Song(int id, String filePath, String title, String artist, String album, double durationSeconds, int playCount) {
        this.id = new SimpleIntegerProperty(id);
        this.filePath = new SimpleStringProperty(filePath != null ? filePath : "");
        this.title = new SimpleStringProperty(title != null && !title.isBlank() ? title : "Unknown Title");
        this.artist = new SimpleStringProperty(artist != null && !artist.isBlank() ? artist : "Unknown Artist");
        this.album = new SimpleStringProperty(album != null && !album.isBlank() ? album : "Unknown Album");
        this.durationSeconds = new SimpleDoubleProperty(durationSeconds);
        this.playCount = new SimpleIntegerProperty(playCount);
        this.formattedDuration = new SimpleStringProperty(formatTime(durationSeconds));
        this.priority = 100 - Math.min(playCount * 5, 80);
    }

    public Song(String filePath, String title, String artist, String album, double durationSeconds) {
        this(0, filePath, title, artist, album, durationSeconds, 0);
    }

    public IntegerProperty idProperty() { return id; }
    public StringProperty filePathProperty() { return filePath; }
    public StringProperty titleProperty() { return title; }
    public StringProperty artistProperty() { return artist; }
    public StringProperty albumProperty() { return album; }
    public DoubleProperty durationSecondsProperty() { return durationSeconds; }
    public IntegerProperty playCountProperty() { return playCount; }
    public StringProperty formattedDurationProperty() { return formattedDuration; }

    public int getId() { return id.get(); }
    public void setId(int id) { this.id.set(id); }
    public String getFilePath() { return filePath.get(); }
    public void setFilePath(String filePath) { this.filePath.set(filePath); }
    public String getTitle() { return title.get(); }
    public void setTitle(String title) { this.title.set(title); }
    public String getArtist() { return artist.get(); }
    public void setArtist(String artist) { this.artist.set(artist); }
    public String getAlbum() { return album.get(); }
    public void setAlbum(String album) { this.album.set(album); }
    public double getDurationSeconds() { return durationSeconds.get(); }
    public void setDurationSeconds(double durationSeconds) {
        this.durationSeconds.set(durationSeconds);
        this.formattedDuration.set(formatTime(durationSeconds));
    }
    public int getPlayCount() { return playCount.get(); }
    public void setPlayCount(int playCount) {
        this.playCount.set(playCount);
        this.priority = Math.max(1, 100 - (playCount * 5));
    }
    public void incrementPlayCount() { setPlayCount(getPlayCount() + 1); }
    public String getFormattedDuration() { return formattedDuration.get(); }
    public byte[] getAlbumArtBytes() { return albumArtBytes; }
    public void setAlbumArtBytes(byte[] albumArtBytes) {
        this.albumArtBytes = albumArtBytes;
        this.cachedAlbumArt = null;
    }
    public Image getAlbumArtImage() {
        if (cachedAlbumArt == null && albumArtBytes != null && albumArtBytes.length > 0) {
            try {
                this.cachedAlbumArt = new Image(new ByteArrayInputStream(albumArtBytes), 300, 300, true, true);
            } catch (Exception e) {
                this.cachedAlbumArt = null;
            }
        }
        return cachedAlbumArt;
    }
    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }

    public static String formatTime(double seconds) {
        if (seconds <= 0 || Double.isNaN(seconds)) return "00:00";
        int totalSecs = (int) Math.round(seconds);
        int hours = totalSecs / 3600;
        int minutes = (totalSecs % 3600) / 60;
        int remainingSecs = totalSecs % 60;
        if (hours > 0) return String.format("%d:%02d:%02d", hours, minutes, remainingSecs);
        return String.format("%02d:%02d", minutes, remainingSecs);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Song song = (Song) o;
        return Objects.equals(filePath.get(), song.filePath.get());
    }

    @Override
    public int hashCode() { return Objects.hash(filePath.get()); }

    @Override
    public String toString() {
        return String.format("%s - %s (%s)", getArtist(), getTitle(), getFormattedDuration());
    }
}`
  },
  {
    path: 'src/main/java/com/musicplayer/model/Playlist.java',
    name: 'Playlist.java',
    category: 'Model Layer',
    language: 'java',
    description: 'User playlist entity holding an ObservableList of songs for dynamic JavaFX binding.',
    content: `package com.musicplayer.model;

import javafx.beans.property.IntegerProperty;
import javafx.beans.property.SimpleIntegerProperty;
import javafx.beans.property.SimpleStringProperty;
import javafx.beans.property.StringProperty;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;

public class Playlist {

    private final IntegerProperty id;
    private final StringProperty name;
    private final ObservableList<Song> songs;

    public Playlist(int id, String name) {
        this.id = new SimpleIntegerProperty(id);
        this.name = new SimpleStringProperty(name != null ? name : "Untitled Playlist");
        this.songs = FXCollections.observableArrayList();
    }

    public Playlist(String name) { this(0, name); }

    public IntegerProperty idProperty() { return id; }
    public StringProperty nameProperty() { return name; }

    public int getId() { return id.get(); }
    public void setId(int id) { this.id.set(id); }
    public String getName() { return name.get(); }
    public void setName(String name) { this.name.set(name); }
    public ObservableList<Song> getSongs() { return songs; }

    public void addSong(Song song) {
        if (song != null && !songs.contains(song)) songs.add(song);
    }
    public void removeSong(Song song) { songs.remove(song); }
    public void clear() { songs.clear(); }
    public int getSongCount() { return songs.size(); }
    public double getTotalDurationSeconds() {
        return songs.stream().mapToDouble(Song::getDurationSeconds).sum();
    }
    public String getFormattedTotalDuration() {
        return Song.formatTime(getTotalDurationSeconds());
    }

    @Override
    public String toString() { return getName() + " (" + getSongCount() + " tracks)"; }
}`
  },
  {
    path: 'src/main/java/com/musicplayer/database/DatabaseManager.java',
    name: 'DatabaseManager.java',
    category: 'Database',
    language: 'java',
    description: 'Thread-safe SQLite connection singleton with automated DDL provisioning and indexing.',
    content: `package com.musicplayer.database;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

public class DatabaseManager {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseManager.class);
    private static final String DB_FILE_NAME = "music_player.db";
    private static DatabaseManager instance;

    private final String dbUrl;
    private Connection connection;

    private DatabaseManager() {
        String userHome = System.getProperty("user.home");
        File appDir = new File(userHome, ".musicplayer");
        if (!appDir.exists()) {
            boolean created = appDir.mkdirs();
            if (!created) appDir = new File(".");
        }
        File dbFile = new File(appDir, DB_FILE_NAME);
        this.dbUrl = "jdbc:sqlite:" + dbFile.getAbsolutePath();
        logger.info("Initializing SQLite database at: {}", dbFile.getAbsolutePath());
        initSchema();
    }

    public static synchronized DatabaseManager getInstance() {
        if (instance == null) instance = new DatabaseManager();
        return instance;
    }

    public synchronized Connection getConnection() throws SQLException {
        if (connection == null || connection.isClosed()) {
            connection = DriverManager.getConnection(dbUrl);
            try (Statement stmt = connection.createStatement()) {
                stmt.execute("PRAGMA foreign_keys = ON;");
            }
        }
        return connection;
    }

    private void initSchema() {
        String createSongsTable = """
            CREATE TABLE IF NOT EXISTS songs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                album TEXT NOT NULL,
                duration_seconds REAL NOT NULL DEFAULT 0.0,
                play_count INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """;

        String createPlaylistsTable = """
            CREATE TABLE IF NOT EXISTS playlists (
                playlist_id INTEGER PRIMARY KEY AUTOINCREMENT,
                playlist_name TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """;

        String createPlaylistSongsTable = """
            CREATE TABLE IF NOT EXISTS playlist_songs (
                playlist_id INTEGER NOT NULL,
                song_id INTEGER NOT NULL,
                sort_order INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (playlist_id, song_id),
                FOREIGN KEY (playlist_id) REFERENCES playlists(playlist_id) ON DELETE CASCADE,
                FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
            );
        """;

        String createUserSettingsTable = """
            CREATE TABLE IF NOT EXISTS user_settings (
                setting_key TEXT PRIMARY KEY,
                setting_value TEXT NOT NULL
            );
        """;

        String createIndexes = """
            CREATE INDEX IF NOT EXISTS idx_songs_path ON songs(file_path);
            CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
            CREATE INDEX IF NOT EXISTS idx_songs_album ON songs(album);
            CREATE INDEX IF NOT EXISTS idx_playlist_songs_order ON playlist_songs(playlist_id, sort_order);
        """;

        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {
            stmt.execute(createSongsTable);
            stmt.execute(createPlaylistsTable);
            stmt.execute(createPlaylistSongsTable);
            stmt.execute(createUserSettingsTable);
            for (String sql : createIndexes.split(";")) {
                if (!sql.trim().isEmpty()) stmt.execute(sql.trim());
            }
            logger.info("Database schema and indexes initialized successfully.");
        } catch (SQLException e) {
            logger.error("Failed to initialize database schema", e);
            throw new RuntimeException("Database initialization failure", e);
        }
    }

    public synchronized void closeConnection() {
        if (connection != null) {
            try {
                if (!connection.isClosed()) connection.close();
            } catch (SQLException e) {
                logger.error("Error closing database connection", e);
            }
        }
    }
}`
  },
  {
    path: 'src/main/java/com/musicplayer/database/SongDAO.java',
    name: 'SongDAO.java',
    category: 'Database',
    language: 'java',
    description: 'Data Access Object executing parameterized queries for songs, playlists, and settings.',
    content: `package com.musicplayer.database;

import com.musicplayer.model.Playlist;
import com.musicplayer.model.Song;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class SongDAO {

    private static final Logger logger = LoggerFactory.getLogger(SongDAO.class);
    private final DatabaseManager dbManager;

    public SongDAO() { this.dbManager = DatabaseManager.getInstance(); }

    public synchronized Song insertOrUpdateSong(Song song) {
        String upsertSql = """
            INSERT INTO songs (file_path, title, artist, album, duration_seconds, play_count)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(file_path) DO UPDATE SET
                title = excluded.title,
                artist = excluded.artist,
                album = excluded.album,
                duration_seconds = excluded.duration_seconds;
        """;
        try (Connection conn = dbManager.getConnection();
             PreparedStatement stmt = conn.prepareStatement(upsertSql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, song.getFilePath());
            stmt.setString(2, song.getTitle());
            stmt.setString(3, song.getArtist());
            stmt.setString(4, song.getAlbum());
            stmt.setDouble(5, song.getDurationSeconds());
            stmt.setInt(6, song.getPlayCount());

            int affectedRows = stmt.executeUpdate();
            if (affectedRows > 0) {
                try (ResultSet rs = stmt.getGeneratedKeys()) {
                    if (rs.next()) song.setId(rs.getInt(1));
                }
            }
            if (song.getId() == 0) {
                Song existing = getSongByPath(song.getFilePath());
                if (existing != null) {
                    song.setId(existing.getId());
                    song.setPlayCount(existing.getPlayCount());
                }
            }
            return song;
        } catch (SQLException e) {
            logger.error("Failed to insert or update song: {}", song.getFilePath(), e);
            return null;
        }
    }

    public List<Song> getAllSongs() {
        List<Song> songs = new ArrayList<>();
        String sql = "SELECT id, file_path, title, artist, album, duration_seconds, play_count FROM songs ORDER BY title ASC";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                songs.add(new Song(
                    rs.getInt("id"), rs.getString("file_path"), rs.getString("title"),
                    rs.getString("artist"), rs.getString("album"), rs.getDouble("duration_seconds"),
                    rs.getInt("play_count")
                ));
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch all songs", e);
        }
        return songs;
    }

    public Song getSongByPath(String filePath) {
        String sql = "SELECT id, file_path, title, artist, album, duration_seconds, play_count FROM songs WHERE file_path = ?";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, filePath);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return new Song(
                        rs.getInt("id"), rs.getString("file_path"), rs.getString("title"),
                        rs.getString("artist"), rs.getString("album"), rs.getDouble("duration_seconds"),
                        rs.getInt("play_count")
                    );
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch song by path: {}", filePath, e);
        }
        return null;
    }

    public synchronized void incrementPlayCount(int songId) {
        String sql = "UPDATE songs SET play_count = play_count + 1 WHERE id = ?";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, songId);
            stmt.executeUpdate();
        } catch (SQLException e) {
            logger.error("Failed to increment play count for song ID: {}", songId, e);
        }
    }

    public synchronized int createPlaylist(String name) {
        String sql = "INSERT OR IGNORE INTO playlists (playlist_name) VALUES (?)";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, name);
            int affected = stmt.executeUpdate();
            if (affected > 0) {
                try (ResultSet rs = stmt.getGeneratedKeys()) {
                    if (rs.next()) return rs.getInt(1);
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to create playlist: {}", name, e);
        }
        return -1;
    }

    public List<Playlist> getAllPlaylists() {
        List<Playlist> playlists = new ArrayList<>();
        String sql = "SELECT playlist_id, playlist_name FROM playlists ORDER BY playlist_name ASC";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                int pId = rs.getInt("playlist_id");
                Playlist playlist = new Playlist(pId, rs.getString("playlist_name"));
                playlist.getSongs().addAll(getSongsForPlaylist(pId));
                playlists.add(playlist);
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch all playlists", e);
        }
        return playlists;
    }

    public List<Song> getSongsForPlaylist(int playlistId) {
        List<Song> songs = new ArrayList<>();
        String sql = """
            SELECT s.id, s.file_path, s.title, s.artist, s.album, s.duration_seconds, s.play_count
            FROM songs s
            JOIN playlist_songs ps ON s.id = ps.song_id
            WHERE ps.playlist_id = ?
            ORDER BY ps.sort_order ASC;
        """;
        try (Connection conn = dbManager.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, playlistId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    songs.add(new Song(
                        rs.getInt("id"), rs.getString("file_path"), rs.getString("title"),
                        rs.getString("artist"), rs.getString("album"), rs.getDouble("duration_seconds"),
                        rs.getInt("play_count")
                    ));
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch songs for playlist ID: {}", playlistId, e);
        }
        return songs;
    }

    public synchronized void saveSetting(String key, String value) {
        String sql = "INSERT OR REPLACE INTO user_settings (setting_key, setting_value) VALUES (?, ?)";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, key);
            stmt.setString(2, value);
            stmt.executeUpdate();
        } catch (SQLException e) {
            logger.error("Failed to save setting key: {}", key, e);
        }
    }

    public String getSetting(String key, String defaultValue) {
        String sql = "SELECT setting_value FROM user_settings WHERE setting_key = ?";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, key);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) return rs.getString("setting_value");
            }
        } catch (SQLException e) {
            logger.error("Failed to read setting key: {}", key, e);
        }
        return defaultValue;
    }
}`
  },
  {
    path: 'src/main/java/com/musicplayer/engine/PlaybackQueue.java',
    name: 'PlaybackQueue.java',
    category: 'Data Structures & Engine',
    language: 'java',
    description: 'Custom Doubly Linked List with LinkedListNode<Song> providing O(1) traversal and integrated HashMap index.',
    content: `package com.musicplayer.engine;

import com.musicplayer.model.Song;
import java.util.*;

/**
 * Custom Doubly Linked List playback queue providing O(1) bidirectional track traversal,
 * O(1) insertion, O(1) removal, and integrated HashMap indexing for O(1) track lookup.
 */
public class PlaybackQueue {

    public static class LinkedListNode<T> {
        public T data;
        public LinkedListNode<T> prev;
        public LinkedListNode<T> next;

        public LinkedListNode(T data) {
            this.data = data;
            this.prev = null;
            this.next = null;
        }

        public T getData() { return data; }
    }

    private LinkedListNode<Song> head;
    private LinkedListNode<Song> tail;
    private LinkedListNode<Song> currentNode;
    private int size;

    private final Map<String, LinkedListNode<Song>> pathIndex;
    private final Map<Integer, LinkedListNode<Song>> idIndex;

    private boolean repeatAll = false;
    private boolean repeatOne = false;

    public PlaybackQueue() {
        this.pathIndex = new HashMap<>();
        this.idIndex = new HashMap<>();
    }

    public synchronized LinkedListNode<Song> insertAtTail(Song song) {
        if (song == null) return null;
        if (pathIndex.containsKey(song.getFilePath())) {
            return pathIndex.get(song.getFilePath());
        }

        LinkedListNode<Song> newNode = new LinkedListNode<>(song);
        if (head == null) {
            head = newNode;
            tail = newNode;
            currentNode = newNode;
        } else {
            tail.next = newNode;
            newNode.prev = tail;
            tail = newNode;
        }

        size++;
        pathIndex.put(song.getFilePath(), newNode);
        if (song.getId() > 0) idIndex.put(song.getId(), newNode);
        return newNode;
    }

    public synchronized LinkedListNode<Song> insertAfterCurrent(Song song) {
        if (song == null) return null;
        if (currentNode == null || currentNode == tail) return insertAtTail(song);

        LinkedListNode<Song> newNode = new LinkedListNode<>(song);
        LinkedListNode<Song> nextNode = currentNode.next;

        currentNode.next = newNode;
        newNode.prev = currentNode;
        newNode.next = nextNode;
        if (nextNode != null) nextNode.prev = newNode;

        size++;
        pathIndex.put(song.getFilePath(), newNode);
        if (song.getId() > 0) idIndex.put(song.getId(), newNode);
        return newNode;
    }

    public synchronized boolean removeNode(LinkedListNode<Song> node) {
        if (node == null || size == 0) return false;

        if (node == head && node == tail) {
            head = null; tail = null; currentNode = null;
        } else if (node == head) {
            head = head.next;
            if (head != null) head.prev = null;
            if (currentNode == node) currentNode = head;
        } else if (node == tail) {
            tail = tail.prev;
            if (tail != null) tail.next = null;
            if (currentNode == node) currentNode = tail;
        } else {
            if (node.prev != null) node.prev.next = node.next;
            if (node.next != null) node.next.prev = node.prev;
            if (currentNode == node) currentNode = node.next;
        }

        if (node.data != null) {
            pathIndex.remove(node.data.getFilePath());
            idIndex.remove(node.data.getId());
        }

        node.prev = null;
        node.next = null;
        size--;
        return true;
    }

    public synchronized Song getNext() {
        if (currentNode == null) {
            currentNode = head;
            return currentNode != null ? currentNode.data : null;
        }
        if (repeatOne) return currentNode.data;
        if (currentNode.next != null) {
            currentNode = currentNode.next;
            return currentNode.data;
        } else if (repeatAll && head != null) {
            currentNode = head;
            return currentNode.data;
        }
        return null;
    }

    public synchronized Song getPrevious() {
        if (currentNode == null) {
            currentNode = tail;
            return currentNode != null ? currentNode.data : null;
        }
        if (repeatOne) return currentNode.data;
        if (currentNode.prev != null) {
            currentNode = currentNode.prev;
            return currentNode.data;
        } else if (repeatAll && tail != null) {
            currentNode = tail;
            return currentNode.data;
        }
        return null;
    }

    public synchronized Song getCurrent() { return currentNode != null ? currentNode.data : null; }
    public synchronized LinkedListNode<Song> getCurrentNode() { return currentNode; }

    public synchronized boolean setCurrentSong(Song song) {
        if (song == null) return false;
        LinkedListNode<Song> node = pathIndex.get(song.getFilePath());
        if (node != null) {
            this.currentNode = node;
            return true;
        }
        return false;
    }

    public Song findByPath(String filePath) {
        LinkedListNode<Song> node = pathIndex.get(filePath);
        return node != null ? node.data : null;
    }

    public synchronized void clear() {
        head = null; tail = null; currentNode = null; size = 0;
        pathIndex.clear(); idIndex.clear();
    }

    public synchronized int size() { return size; }
    public synchronized boolean isEmpty() { return size == 0; }
    public synchronized void setRepeatAll(boolean repeatAll) { this.repeatAll = repeatAll; }
    public synchronized void setRepeatOne(boolean repeatOne) { this.repeatOne = repeatOne; }

    public synchronized List<Song> toList() {
        List<Song> list = new ArrayList<>(size);
        LinkedListNode<Song> curr = head;
        while (curr != null) {
            list.add(curr.data);
            curr = curr.next;
        }
        return list;
    }

    public synchronized void loadPlaylist(List<Song> songs) {
        clear();
        if (songs != null) {
            for (Song song : songs) insertAtTail(song);
        }
    }
}`
  },
  {
    path: 'src/main/java/com/musicplayer/engine/ShufflePriorityQueue.java',
    name: 'ShufflePriorityQueue.java',
    category: 'Data Structures & Engine',
    language: 'java',
    description: 'Binary Max-Heap data structure calculating dynamic weighted shuffle priorities based on play count.',
    content: `package com.musicplayer.engine;

import com.musicplayer.model.Song;
import java.util.*;

public class ShufflePriorityQueue {

    public static class QueueEntry implements Comparable<QueueEntry> {
        public final Song song;
        public double priorityScore;

        public QueueEntry(Song song, double priorityScore) {
            this.song = song;
            this.priorityScore = priorityScore;
        }

        @Override
        public int compareTo(QueueEntry other) {
            return Double.compare(other.priorityScore, this.priorityScore);
        }
    }

    private final List<QueueEntry> heap;
    private final Random random;

    public ShufflePriorityQueue() {
        this.heap = new ArrayList<>();
        this.random = new Random();
    }

    public synchronized void insert(Song song) {
        if (song == null) return;
        double baseWeight = 100.0 / (1.0 + song.getPlayCount() * 0.5);
        double jitter = random.nextDouble() * 60.0;
        double totalScore = baseWeight + jitter + song.getPriority();

        QueueEntry entry = new QueueEntry(song, totalScore);
        heap.add(entry);
        siftUp(heap.size() - 1);
    }

    public synchronized void rebuild(List<Song> songs) {
        heap.clear();
        if (songs == null) return;
        for (Song song : songs) insert(song);
    }

    public synchronized Song pollNext() {
        if (heap.isEmpty()) return null;
        Song topSong = heap.get(0).song;
        QueueEntry last = heap.remove(heap.size() - 1);
        if (!heap.isEmpty()) {
            heap.set(0, last);
            siftDown(0);
        }
        return topSong;
    }

    public synchronized Song peek() { return heap.isEmpty() ? null : heap.get(0).song; }
    public synchronized int size() { return heap.size(); }
    public synchronized boolean isEmpty() { return heap.isEmpty(); }
    public synchronized void clear() { heap.clear(); }

    private void siftUp(int index) {
        int current = index;
        while (current > 0) {
            int parent = (current - 1) / 2;
            if (heap.get(current).compareTo(heap.get(parent)) < 0) {
                swap(current, parent);
                current = parent;
            } else break;
        }
    }

    private void siftDown(int index) {
        int current = index;
        int size = heap.size();
        while (true) {
            int left = 2 * current + 1;
            int right = 2 * current + 2;
            int highestPriority = current;

            if (left < size && heap.get(left).compareTo(heap.get(highestPriority)) < 0) highestPriority = left;
            if (right < size && heap.get(right).compareTo(heap.get(highestPriority)) < 0) highestPriority = right;

            if (highestPriority != current) {
                swap(current, highestPriority);
                current = highestPriority;
            } else break;
        }
    }

    private void swap(int i, int j) {
        QueueEntry temp = heap.get(i);
        heap.set(i, heap.get(j));
        heap.set(j, temp);
    }
}`
  },
  {
    path: 'src/main/java/com/musicplayer/util/MetadataExtractor.java',
    name: 'MetadataExtractor.java',
    category: 'Data Structures & Engine',
    language: 'java',
    description: 'Jaudiotagger ID3v1/ID3v2 parser, album art extractor, and heuristic filename fallback engine.',
    content: `package com.musicplayer.util;

import com.musicplayer.model.Song;
import javafx.application.Platform;
import javafx.concurrent.Task;
import org.jaudiotagger.audio.AudioFile;
import org.jaudiotagger.audio.AudioFileIO;
import org.jaudiotagger.audio.AudioHeader;
import org.jaudiotagger.tag.FieldKey;
import org.jaudiotagger.tag.Tag;
import org.jaudiotagger.tag.datatype.Artwork;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

public class MetadataExtractor {

    private static final Logger logger = LoggerFactory.getLogger(MetadataExtractor.class);

    private static final ExecutorService metadataExecutor = Executors.newFixedThreadPool(
        Math.max(2, Runtime.getRuntime().availableProcessors() - 1),
        r -> {
            Thread t = new Thread(r, "MetadataExtractor-Worker");
            t.setDaemon(true);
            return t;
        }
    );

    public static Song extractMetadata(File file) {
        if (file == null || !file.exists() || !file.canRead()) return null;

        String filePath = file.getAbsolutePath();
        String defaultTitle = getFallbackTitle(file);
        String defaultArtist = "Unknown Artist";
        String defaultAlbum = "Unknown Album";
        double durationSeconds = 0.0;
        byte[] artworkBytes = null;

        try {
            AudioFile audioFile = AudioFileIO.read(file);
            AudioHeader header = audioFile.getAudioHeader();
            if (header != null) durationSeconds = header.getTrackLength();

            Tag tag = audioFile.getTag();
            if (tag != null) {
                String title = tag.getFirst(FieldKey.TITLE);
                String artist = tag.getFirst(FieldKey.ARTIST);
                String album = tag.getFirst(FieldKey.ALBUM);

                if (title != null && !title.isBlank()) defaultTitle = title.trim();
                if (artist != null && !artist.isBlank()) defaultArtist = artist.trim();
                if (album != null && !album.isBlank()) defaultAlbum = album.trim();

                Artwork artwork = tag.getFirstArtwork();
                if (artwork != null) artworkBytes = artwork.getBinaryData();
            } else {
                String[] parsed = parseFilenameHeuristic(file.getName());
                if (parsed != null) {
                    defaultArtist = parsed[0];
                    defaultTitle = parsed[1];
                }
            }
        } catch (Exception e) {
            String[] parsed = parseFilenameHeuristic(file.getName());
            if (parsed != null) {
                defaultArtist = parsed[0];
                defaultTitle = parsed[1];
            }
        }

        Song song = new Song(filePath, defaultTitle, defaultArtist, defaultAlbum, durationSeconds);
        if (artworkBytes != null && artworkBytes.length > 0) {
            song.setAlbumArtBytes(artworkBytes);
        }
        return song;
    }

    private static String getFallbackTitle(File file) {
        String name = file.getName();
        int dotIdx = name.lastIndexOf('.');
        if (dotIdx > 0) return name.substring(0, dotIdx).replace('_', ' ').trim();
        return name;
    }

    private static String[] parseFilenameHeuristic(String filename) {
        int dotIdx = filename.lastIndexOf('.');
        String baseName = (dotIdx > 0) ? filename.substring(0, dotIdx) : filename;
        if (baseName.contains(" - ")) {
            String[] parts = baseName.split(" - ", 2);
            if (parts.length == 2 && !parts[0].isBlank() && !parts[1].isBlank()) {
                return new String[]{parts[0].trim(), parts[1].trim()};
            }
        }
        return null;
    }

    public static void shutdown() { metadataExecutor.shutdown(); }
}`
  },
  {
    path: 'src/main/java/com/musicplayer/engine/AudioEngine.java',
    name: 'AudioEngine.java',
    category: 'Data Structures & Engine',
    language: 'java',
    description: 'Multithreaded audio engine with background media buffer loading, scrub seeking, and leak-free disposal.',
    content: `package com.musicplayer.engine;

import com.musicplayer.model.Song;
import javafx.application.Platform;
import javafx.beans.property.*;
import javafx.scene.media.Media;
import javafx.scene.media.MediaPlayer;
import javafx.util.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

public class AudioEngine {

    private static final Logger logger = LoggerFactory.getLogger(AudioEngine.class);

    public enum PlaybackState { STOPPED, PLAYING, PAUSED, LOADING, ERROR }

    private MediaPlayer mediaPlayer;
    private Song currentSong;

    private final ObjectProperty<PlaybackState> playbackState = new SimpleObjectProperty<>(PlaybackState.STOPPED);
    private final DoubleProperty currentPositionSeconds = new SimpleDoubleProperty(0.0);
    private final DoubleProperty totalDurationSeconds = new SimpleDoubleProperty(0.0);
    private final DoubleProperty volume = new SimpleDoubleProperty(0.8);
    private final BooleanProperty muted = new SimpleBooleanProperty(false);

    private Runnable onEndOfMediaCallback;
    private Consumer<Throwable> onErrorCallback;
    private final ExecutorService mediaLoadingExecutor;

    public AudioEngine() {
        this.mediaLoadingExecutor = Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "AudioEngine-MediaLoader");
            t.setDaemon(true);
            return t;
        });

        this.volume.addListener((obs, oldVal, newVal) -> {
            if (mediaPlayer != null) mediaPlayer.setVolume(newVal.doubleValue());
        });
        this.muted.addListener((obs, oldVal, newVal) -> {
            if (mediaPlayer != null) mediaPlayer.setMute(newVal);
        });
    }

    public synchronized void play(Song song) {
        if (song == null) return;
        if (currentSong != null && currentSong.equals(song) && mediaPlayer != null) {
            if (playbackState.get() == PlaybackState.PAUSED) {
                resume();
                return;
            }
        }

        this.currentSong = song;
        setPlaybackState(PlaybackState.LOADING);

        mediaLoadingExecutor.submit(() -> {
            try {
                File file = new File(song.getFilePath());
                String uriString = file.toURI().toString();
                Media media = new Media(uriString);
                Platform.runLater(() -> initMediaPlayer(media, song));
            } catch (Exception ex) {
                logger.error("Failed to load audio media", ex);
                Platform.runLater(() -> {
                    setPlaybackState(PlaybackState.ERROR);
                    if (onErrorCallback != null) onErrorCallback.accept(ex);
                });
            }
        });
    }

    private void initMediaPlayer(Media media, Song song) {
        disposeCurrentPlayer();
        try {
            mediaPlayer = new MediaPlayer(media);
            mediaPlayer.setVolume(volume.get());
            mediaPlayer.setMute(muted.get());

            mediaPlayer.currentTimeProperty().addListener((obs, oldTime, newTime) -> {
                if (newTime != null) currentPositionSeconds.set(newTime.toSeconds());
            });

            mediaPlayer.setOnReady(() -> {
                Duration mediaDuration = mediaPlayer.getTotalDuration();
                if (mediaDuration != null && !mediaDuration.isUnknown()) {
                    totalDurationSeconds.set(mediaDuration.toSeconds());
                    if (song.getDurationSeconds() <= 0) song.setDurationSeconds(mediaDuration.toSeconds());
                }
                mediaPlayer.play();
                setPlaybackState(PlaybackState.PLAYING);
            });

            mediaPlayer.setOnEndOfMedia(() -> {
                setPlaybackState(PlaybackState.STOPPED);
                currentPositionSeconds.set(0.0);
                if (onEndOfMediaCallback != null) onEndOfMediaCallback.run();
            });

            mediaPlayer.setOnError(() -> {
                Throwable err = mediaPlayer.getError();
                setPlaybackState(PlaybackState.ERROR);
                if (onErrorCallback != null) onErrorCallback.accept(err);
            });
        } catch (Exception ex) {
            setPlaybackState(PlaybackState.ERROR);
            if (onErrorCallback != null) onErrorCallback.accept(ex);
        }
    }

    public synchronized void resume() {
        if (mediaPlayer != null && playbackState.get() == PlaybackState.PAUSED) {
            mediaPlayer.play();
            setPlaybackState(PlaybackState.PLAYING);
        }
    }

    public synchronized void pause() {
        if (mediaPlayer != null && playbackState.get() == PlaybackState.PLAYING) {
            mediaPlayer.pause();
            setPlaybackState(PlaybackState.PAUSED);
        }
    }

    public synchronized void togglePlayPause() {
        if (playbackState.get() == PlaybackState.PLAYING) pause();
        else if (playbackState.get() == PlaybackState.PAUSED) resume();
        else if (currentSong != null) play(currentSong);
    }

    public synchronized void stop() {
        if (mediaPlayer != null) {
            mediaPlayer.stop();
            currentPositionSeconds.set(0.0);
            setPlaybackState(PlaybackState.STOPPED);
        }
    }

    public synchronized void seek(double seconds) {
        if (mediaPlayer != null) {
            double clamped = Math.max(0.0, Math.min(seconds, totalDurationSeconds.get()));
            mediaPlayer.seek(Duration.seconds(clamped));
            currentPositionSeconds.set(clamped);
        }
    }

    private void disposeCurrentPlayer() {
        if (mediaPlayer != null) {
            try {
                mediaPlayer.stop();
                mediaPlayer.dispose();
            } catch (Exception ignored) {}
            mediaPlayer = null;
        }
    }

    private void setPlaybackState(PlaybackState state) {
        Platform.runLater(() -> this.playbackState.set(state));
    }

    public ReadOnlyObjectProperty<PlaybackState> playbackStateProperty() { return playbackState; }
    public PlaybackState getPlaybackState() { return playbackState.get(); }
    public ReadOnlyDoubleProperty currentPositionSecondsProperty() { return currentPositionSeconds; }
    public ReadOnlyDoubleProperty totalDurationSecondsProperty() { return totalDurationSeconds; }
    public DoubleProperty volumeProperty() { return volume; }
    public double getVolume() { return volume.get(); }
    public void setVolume(double vol) { this.volume.set(Math.max(0.0, Math.min(1.0, vol))); }
    public BooleanProperty mutedProperty() { return muted; }
    public boolean isMuted() { return muted.get(); }
    public void setMuted(boolean mute) { this.muted.set(mute); }
    public Song getCurrentSong() { return currentSong; }
    public void setOnEndOfMedia(Runnable callback) { this.onEndOfMediaCallback = callback; }
    public void setOnError(Consumer<Throwable> callback) { this.onErrorCallback = callback; }

    public void shutdown() {
        disposeCurrentPlayer();
        mediaLoadingExecutor.shutdown();
    }
}`
  },
  {
    path: 'src/main/java/com/musicplayer/controller/PlayerController.java',
    name: 'PlayerController.java',
    category: 'UI & Controller',
    language: 'java',
    description: 'Primary JavaFX Controller orchestrating FXML widgets, TableView data binding, and async workers.',
    content: `package com.musicplayer.controller;

import com.musicplayer.database.DatabaseManager;
import com.musicplayer.database.SongDAO;
import com.musicplayer.engine.AudioEngine;
import com.musicplayer.engine.PlaybackQueue;
import com.musicplayer.engine.ShufflePriorityQueue;
import com.musicplayer.model.Playlist;
import com.musicplayer.model.Song;
import com.musicplayer.util.MetadataExtractor;
import javafx.application.Platform;
import javafx.beans.binding.Bindings;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.collections.transformation.FilteredList;
import javafx.collections.transformation.SortedList;
import javafx.concurrent.Task;
import javafx.fxml.FXML;
import javafx.fxml.Initializable;
import javafx.scene.control.*;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.HBox;
import javafx.stage.DirectoryChooser;
import javafx.stage.FileChooser;
import javafx.stage.Stage;

import java.io.File;
import java.net.URL;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class PlayerController implements Initializable {

    @FXML private BorderPane rootPane;
    @FXML private Button btnNavAllTracks;
    @FXML private Button btnNavArtists;
    @FXML private Button btnNavAlbums;
    @FXML private Button btnNavNowPlaying;
    @FXML private Button btnNewPlaylist;
    @FXML private ListView<Playlist> playlistListView;
    @FXML private Label lblStorageStatus;
    @FXML private Label lblTrackCount;

    @FXML private Label lblViewTitle;
    @FXML private Label lblViewSubtitle;
    @FXML private TextField searchField;
    @FXML private Button btnAddFiles;
    @FXML private Button btnAddFolder;
    @FXML private Button btnRescan;

    @FXML private TableView<Song> songsTable;
    @FXML private TableColumn<Song, Number> colIndex;
    @FXML private TableColumn<Song, String> colTitle;
    @FXML private TableColumn<Song, String> colArtist;
    @FXML private TableColumn<Song, String> colAlbum;
    @FXML private TableColumn<Song, String> colDuration;
    @FXML private TableColumn<Song, Number> colPlays;

    @FXML private HBox statusBanner;
    @FXML private Label lblTaskStatus;
    @FXML private ProgressBar taskProgressBar;

    @FXML private ImageView imgAlbumArt;
    @FXML private Label lblNowPlayingTitle;
    @FXML private Label lblNowPlayingArtist;
    @FXML private Button btnShuffle;
    @FXML private Button btnPrevious;
    @FXML private Button btnPlayPause;
    @FXML private Button btnStop;
    @FXML private Button btnNext;
    @FXML private Button btnRepeat;
    @FXML private Label lblElapsedTime;
    @FXML private Label lblTotalDuration;
    @FXML private Slider seekSlider;
    @FXML private Button btnMute;
    @FXML private Slider volumeSlider;
    @FXML private Button btnQueueDrawer;

    private SongDAO songDAO;
    private AudioEngine audioEngine;
    private PlaybackQueue playbackQueue;
    private ShufflePriorityQueue shufflePriorityQueue;

    private final ObservableList<Song> masterSongList = FXCollections.observableArrayList();
    private FilteredList<Song> filteredSongList;
    private final ObservableList<Playlist> playlistList = FXCollections.observableArrayList();

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
    private int repeatMode = 0;

    @Override
    public void initialize(URL location, ResourceBundle resources) {
        this.songDAO = new SongDAO();
        this.audioEngine = new AudioEngine();
        this.playbackQueue = new PlaybackQueue();
        this.shufflePriorityQueue = new ShufflePriorityQueue();

        setupTableColumns();
        setupSearchAndFilter();
        setupPlaybackEngineListeners();
        setupSeekSliderInteraction();
        setupVolumeAndControls();
        loadStoredSettings();
        loadSongsFromDatabase();
        loadPlaylistsFromDatabase();
    }

    private void setupTableColumns() {
        colIndex.setCellValueFactory(cellData ->
            Bindings.createIntegerBinding(() -> songsTable.getItems().indexOf(cellData.getValue()) + 1)
        );
        colTitle.setCellValueFactory(cellData -> cellData.getValue().titleProperty());
        colArtist.setCellValueFactory(cellData -> cellData.getValue().artistProperty());
        colAlbum.setCellValueFactory(cellData -> cellData.getValue().albumProperty());
        colDuration.setCellValueFactory(cellData -> cellData.getValue().formattedDurationProperty());
        colPlays.setCellValueFactory(cellData -> cellData.getValue().playCountProperty());

        songsTable.setRowFactory(tv -> {
            TableRow<Song> row = new TableRow<>();
            row.setOnMouseClicked(event -> {
                if (event.getClickCount() == 2 && (!row.isEmpty())) {
                    playSelectedSong(row.getItem());
                }
            });
            return row;
        });

        playlistListView.setItems(playlistList);
        playlistListView.getSelectionModel().selectedItemProperty().addListener((obs, oldVal, newVal) -> {
            if (newVal != null) displayPlaylistSongs(newVal);
        });
    }

    private void setupSearchAndFilter() {
        filteredSongList = new FilteredList<>(masterSongList, p -> true);
        searchField.textProperty().addListener((observable, oldValue, newValue) -> {
            filteredSongList.setPredicate(song -> {
                if (newValue == null || newValue.isBlank()) return true;
                String lower = newValue.toLowerCase().trim();
                return song.getTitle().toLowerCase().contains(lower) ||
                       song.getArtist().toLowerCase().contains(lower) ||
                       song.getAlbum().toLowerCase().contains(lower);
            });
        });
        SortedList<Song> sortedList = new SortedList<>(filteredSongList);
        sortedList.comparatorProperty().bind(songsTable.comparatorProperty());
        songsTable.setItems(sortedList);
    }

    private void setupPlaybackEngineListeners() {
        audioEngine.playbackStateProperty().addListener((obs, oldState, newState) -> {
            Platform.runLater(() -> btnPlayPause.setText(newState == AudioEngine.PlaybackState.PLAYING ? "⏸" : "▶"));
        });
        audioEngine.currentPositionSecondsProperty().addListener((obs, oldVal, newVal) -> {
            Platform.runLater(() -> {
                if (!isSeeking && newVal != null) {
                    seekSlider.setValue(newVal.doubleValue());
                    lblElapsedTime.setText(Song.formatTime(newVal.doubleValue()));
                }
            });
        });
        audioEngine.totalDurationSecondsProperty().addListener((obs, oldVal, newVal) -> {
            Platform.runLater(() -> {
                if (newVal != null && newVal.doubleValue() > 0) {
                    seekSlider.setMax(newVal.doubleValue());
                    lblTotalDuration.setText(Song.formatTime(newVal.doubleValue()));
                }
            });
        });
        audioEngine.setOnEndOfMedia(() -> Platform.runLater(this::handleNext));
    }

    private void setupSeekSliderInteraction() {
        seekSlider.valueChangingProperty().addListener((obs, wasChanging, isChangingNow) -> {
            this.isSeeking = isChangingNow;
            if (!isChangingNow) audioEngine.seek(seekSlider.getValue());
        });
        seekSlider.setOnMousePressed(e -> isSeeking = true);
        seekSlider.setOnMouseReleased(e -> {
            isSeeking = false;
            audioEngine.seek(seekSlider.getValue());
        });
    }

    private void setupVolumeAndControls() {
        volumeSlider.setValue(audioEngine.getVolume());
        volumeSlider.valueProperty().addListener((obs, oldVal, newVal) -> {
            audioEngine.setVolume(newVal.doubleValue());
            songDAO.saveSetting("last_volume", String.valueOf(newVal.doubleValue()));
        });
    }

    private void playSelectedSong(Song song) {
        if (song == null) return;
        playbackQueue.setCurrentSong(song);
        lblNowPlayingTitle.setText(song.getTitle());
        lblNowPlayingArtist.setText(song.getArtist() + " · " + song.getAlbum());

        Image cover = song.getAlbumArtImage();
        imgAlbumArt.setImage(cover);

        audioEngine.play(song);
        ioExecutor.submit(() -> {
            songDAO.incrementPlayCount(song.getId());
            Platform.runLater(song::incrementPlayCount);
        });
        songDAO.saveSetting("last_played_path", song.getFilePath());
    }

    @FXML private void handleTogglePlayPause() {
        if (audioEngine.getPlaybackState() == AudioEngine.PlaybackState.STOPPED) {
            Song target = playbackQueue.getCurrent();
            if (target == null && !masterSongList.isEmpty()) target = masterSongList.get(0);
            if (target != null) playSelectedSong(target);
        } else {
            audioEngine.togglePlayPause();
        }
    }

    @FXML private void handleStop() {
        audioEngine.stop();
        lblElapsedTime.setText("00:00");
        seekSlider.setValue(0.0);
    }

    @FXML private void handleNext() {
        Song nextSong = isShuffleActive ? shufflePriorityQueue.pollNext() : playbackQueue.getNext();
        if (nextSong != null) {
            playSelectedSong(nextSong);
            songsTable.getSelectionModel().select(nextSong);
        } else handleStop();
    }

    @FXML private void handlePrevious() {
        Song prevSong = playbackQueue.getPrevious();
        if (prevSong != null) {
            playSelectedSong(prevSong);
            songsTable.getSelectionModel().select(prevSong);
        }
    }

    @FXML private void handleToggleShuffle() {
        isShuffleActive = !isShuffleActive;
        if (isShuffleActive) {
            btnShuffle.getStyleClass().add("active");
            shufflePriorityQueue.rebuild(playbackQueue.toList());
        } else {
            btnShuffle.getStyleClass().remove("active");
        }
    }

    @FXML private void handleToggleRepeat() {
        repeatMode = (repeatMode + 1) % 3;
        playbackQueue.setRepeatAll(repeatMode == 1);
        playbackQueue.setRepeatOne(repeatMode == 2);
    }

    @FXML private void handleToggleMute() {
        audioEngine.setMuted(!audioEngine.isMuted());
        btnMute.setText(audioEngine.isMuted() ? "🔇" : "🔊");
    }

    @FXML private void handleToggleQueueDrawer() {
        lblTaskStatus.setText("Queue size: " + playbackQueue.size() + " songs loaded in memory.");
    }

    @FXML private void handleAddFiles() {
        FileChooser chooser = new FileChooser();
        chooser.getExtensionFilters().add(new FileChooser.ExtensionFilter("Audio Files (*.mp3, *.wav)", "*.mp3", "*.wav"));
        List<File> files = chooser.showOpenMultipleDialog((Stage) rootPane.getScene().getWindow());
        if (files != null) processImportFilesAsync(files);
    }

    @FXML private void handleAddFolder() {
        DirectoryChooser chooser = new DirectoryChooser();
        File folder = chooser.showDialog((Stage) rootPane.getScene().getWindow());
        if (folder != null) scanDirectoryAsync(folder);
    }

    @FXML private void handleRescan() { loadSongsFromDatabase(); }

    private void scanDirectoryAsync(File directory) {
        taskProgressBar.setVisible(true);
        Task<List<File>> scanTask = new Task<>() {
            @Override
            protected List<File> call() {
                List<File> audioFiles = new ArrayList<>();
                collectFilesRecursively(directory, audioFiles);
                return audioFiles;
            }
        };
        scanTask.setOnSucceeded(e -> {
            taskProgressBar.setVisible(false);
            processImportFilesAsync(scanTask.getValue());
        });
        ioExecutor.submit(scanTask);
    }

    private void collectFilesRecursively(File dir, List<File> accumulator) {
        File[] files = dir.listFiles();
        if (files == null) return;
        for (File f : files) {
            if (f.isDirectory()) collectFilesRecursively(f, accumulator);
            else if (f.getName().toLowerCase().endsWith(".mp3") || f.getName().toLowerCase().endsWith(".wav")) accumulator.add(f);
        }
    }

    private void processImportFilesAsync(List<File> files) {
        taskProgressBar.setVisible(true);
        Task<List<Song>> importTask = new Task<>() {
            @Override
            protected List<Song> call() {
                List<Song> processed = new ArrayList<>();
                for (int i = 0; i < files.size(); i++) {
                    Song song = MetadataExtractor.extractMetadata(files.get(i));
                    if (song != null) {
                        Song saved = songDAO.insertOrUpdateSong(song);
                        processed.add(saved != null ? saved : song);
                    }
                    updateProgress(i + 1, files.size());
                }
                return processed;
            }
        };
        taskProgressBar.progressProperty().bind(importTask.progressProperty());
        importTask.setOnSucceeded(e -> {
            taskProgressBar.progressProperty().unbind();
            taskProgressBar.setVisible(false);
            for (Song s : importTask.getValue()) {
                if (!masterSongList.contains(s)) {
                    masterSongList.add(s);
                    playbackQueue.insertAtTail(s);
                }
            }
            lblTrackCount.setText(masterSongList.size() + " tracks indexed");
        });
        ioExecutor.submit(importTask);
    }

    private void loadSongsFromDatabase() {
        Task<List<Song>> task = new Task<>() {
            @Override
            protected List<Song> call() { return songDAO.getAllSongs(); }
        };
        task.setOnSucceeded(e -> {
            masterSongList.clear();
            playbackQueue.clear();
            List<Song> songs = task.getValue();
            masterSongList.addAll(songs);
            playbackQueue.loadPlaylist(songs);
            lblTrackCount.setText(songs.size() + " tracks indexed");
        });
        ioExecutor.submit(task);
    }

    private void loadPlaylistsFromDatabase() {
        Task<List<Playlist>> task = new Task<>() {
            @Override
            protected List<Playlist> call() { return songDAO.getAllPlaylists(); }
        };
        task.setOnSucceeded(e -> {
            playlistList.clear();
            playlistList.addAll(task.getValue());
        });
        ioExecutor.submit(task);
    }

    private void loadStoredSettings() {
        String savedVolume = songDAO.getSetting("last_volume", "0.8");
        try { volumeSlider.setValue(Double.parseDouble(savedVolume)); } catch (Exception ignored) {}
    }

    @FXML private void handleNavAllTracks() { songsTable.setItems(new SortedList<>(filteredSongList)); }
    @FXML private void handleNavArtists() { songsTable.setItems(new SortedList<>(filteredSongList, Comparator.comparing(Song::getArtist))); }
    @FXML private void handleNavAlbums() { songsTable.setItems(new SortedList<>(filteredSongList, Comparator.comparing(Song::getAlbum))); }
    @FXML private void handleNavQueue() { songsTable.setItems(FXCollections.observableArrayList(playbackQueue.toList())); }

    @FXML private void handleNewPlaylist() {
        TextInputDialog dialog = new TextInputDialog("New Playlist");
        dialog.showAndWait().ifPresent(name -> {
            if (!name.isBlank()) {
                ioExecutor.submit(() -> {
                    songDAO.createPlaylist(name.trim());
                    Platform.runLater(this::loadPlaylistsFromDatabase);
                });
            }
        });
    }

    private void displayPlaylistSongs(Playlist playlist) {
        songsTable.setItems(playlist.getSongs());
        playbackQueue.loadPlaylist(playlist.getSongs());
    }

    public void cleanup() {
        if (audioEngine != null) audioEngine.shutdown();
        MetadataExtractor.shutdown();
        ioExecutor.shutdown();
        DatabaseManager.getInstance().closeConnection();
    }
}`
  },
  {
    path: 'src/main/java/com/musicplayer/MainApp.java',
    name: 'MainApp.java',
    category: 'UI & Controller',
    language: 'java',
    description: 'Application entry point launching JavaFX primary stage with graceful shutdown hooks.',
    content: `package com.musicplayer;

import com.musicplayer.controller.PlayerController;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.paint.Color;
import javafx.stage.Stage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URL;

public class MainApp extends Application {

    private static final Logger logger = LoggerFactory.getLogger(MainApp.class);
    private PlayerController controller;

    @Override
    public void start(Stage primaryStage) {
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            logger.error("Uncaught exception on thread: " + thread.getName(), throwable);
        });

        try {
            URL fxmlUrl = getClass().getResource("/fxml/PlayerView.fxml");
            FXMLLoader loader = new FXMLLoader(fxmlUrl);
            Parent root = loader.load();
            this.controller = loader.getController();

            Scene scene = new Scene(root, 1200, 780);
            scene.setFill(Color.web("#0f1117"));

            URL cssUrl = getClass().getResource("/css/styles.css");
            if (cssUrl != null) scene.getStylesheets().add(cssUrl.toExternalForm());

            primaryStage.setTitle("MusicPlayer — Windows Audio Engine");
            primaryStage.setMinWidth(960);
            primaryStage.setMinHeight(640);
            primaryStage.setScene(scene);

            primaryStage.setOnCloseRequest(event -> {
                if (controller != null) controller.cleanup();
                Platform.exit();
                System.exit(0);
            });

            primaryStage.show();
        } catch (Exception e) {
            logger.error("Fatal startup error in MainApp", e);
            Platform.exit();
        }
    }

    public static void main(String[] args) { launch(args); }
}`
  },
  {
    path: 'src/main/resources/fxml/PlayerView.fxml',
    name: 'PlayerView.fxml',
    category: 'UI & Controller',
    language: 'xml',
    description: 'Scene Builder compatible FXML definition with 3-zone layout and TableView binding.',
    content: `<?xml version="1.0" encoding="UTF-8"?>

<?import javafx.geometry.Insets?>
<?import javafx.scene.control.*?>
<?import javafx.scene.image.ImageView?>
<?import javafx.scene.layout.*?>

<BorderPane fx:id="rootPane" prefHeight="760.0" prefWidth="1180.0"
            stylesheets="@../css/styles.css"
            xmlns="http://javafx.com/javafx/21" xmlns:fx="http://javafx.com/fxml/1"
            fx:controller="com.musicplayer.controller.PlayerController">

    <left>
        <VBox prefWidth="230.0" styleClass="sidebar" spacing="6.0" BorderPane.alignment="CENTER">
            <padding>
                <Insets top="16.0" right="12.0" bottom="16.0" left="12.0"/>
            </padding>
            <HBox alignment="CENTER_LEFT" spacing="10.0">
                <Label text="🎵 MusicPlayer" styleClass="sidebar-title" />
            </HBox>
            <Separator prefWidth="200.0" opacity="0.15" />
            <Label text="LIBRARY" styleClass="sidebar-category-label" />
            <Button fx:id="btnNavAllTracks" maxWidth="Infinity" styleClass="sidebar-button, active" text="♫  All Tracks" onAction="#handleNavAllTracks" />
            <Button fx:id="btnNavArtists" maxWidth="Infinity" styleClass="sidebar-button" text="👤  Artists" onAction="#handleNavArtists" />
            <Button fx:id="btnNavAlbums" maxWidth="Infinity" styleClass="sidebar-button" text="💿  Albums" onAction="#handleNavAlbums" />
            <Button fx:id="btnNavNowPlaying" maxWidth="Infinity" styleClass="sidebar-button" text="▶  Active Queue" onAction="#handleNavQueue" />
            <HBox alignment="CENTER_LEFT" spacing="6.0">
                <Label text="PLAYLISTS" styleClass="sidebar-category-label" HBox.hgrow="ALWAYS" />
                <Button fx:id="btnNewPlaylist" text="+" styleClass="control-button" onAction="#handleNewPlaylist" />
            </HBox>
            <ListView fx:id="playlistListView" VBox.vgrow="ALWAYS" style="-fx-background-color: transparent;" />
            <VBox spacing="4.0" style="-fx-padding: 8 4 0 4;">
                <Label fx:id="lblStorageStatus" text="SQLite: Connected" style="-fx-text-fill: #475569; -fx-font-size: 11px;" />
                <Label fx:id="lblTrackCount" text="0 tracks indexed" style="-fx-text-fill: #475569; -fx-font-size: 11px;" />
            </VBox>
        </VBox>
    </left>

    <center>
        <VBox styleClass="content-area" spacing="18.0" BorderPane.alignment="CENTER">
            <HBox alignment="CENTER_LEFT" spacing="14.0">
                <VBox HBox.hgrow="ALWAYS" spacing="2.0">
                    <Label fx:id="lblViewTitle" text="Music Library" styleClass="library-heading" />
                    <Label fx:id="lblViewSubtitle" text="All local tracks loaded in SQLite database" styleClass="library-subtext" />
                </VBox>
                <TextField fx:id="searchField" promptText="Search title, artist, album..." prefWidth="260.0" styleClass="search-field" />
                <Button fx:id="btnAddFiles" text="+ Add Files" styleClass="action-button-primary" onAction="#handleAddFiles" />
                <Button fx:id="btnAddFolder" text="📁 Add Folder" styleClass="action-button" onAction="#handleAddFolder" />
                <Button fx:id="btnRescan" text="🔄 Rescan" styleClass="action-button" onAction="#handleRescan" />
            </HBox>

            <TableView fx:id="songsTable" VBox.vgrow="ALWAYS" styleClass="table-view">
                <columns>
                    <TableColumn fx:id="colIndex" prefWidth="50.0" text="#" />
                    <TableColumn fx:id="colTitle" prefWidth="300.0" text="TITLE" />
                    <TableColumn fx:id="colArtist" prefWidth="200.0" text="ARTIST" />
                    <TableColumn fx:id="colAlbum" prefWidth="200.0" text="ALBUM" />
                    <TableColumn fx:id="colDuration" prefWidth="90.0" text="DURATION" />
                    <TableColumn fx:id="colPlays" prefWidth="70.0" text="PLAYS" />
                </columns>
            </TableView>

            <HBox fx:id="statusBanner" alignment="CENTER_LEFT" spacing="10.0">
                <Label fx:id="lblTaskStatus" text="Ready" style="-fx-text-fill: #64748b; -fx-font-size: 12px;" />
                <ProgressBar fx:id="taskProgressBar" prefWidth="180.0" visible="false" />
            </HBox>
        </VBox>
    </center>

    <bottom>
        <HBox alignment="CENTER" styleClass="playback-bar" spacing="20.0" BorderPane.alignment="CENTER">
            <HBox alignment="CENTER_LEFT" prefWidth="300.0" spacing="12.0">
                <StackPane prefHeight="54.0" prefWidth="54.0" style="-fx-background-color: #1e2436; -fx-background-radius: 6;">
                    <ImageView fx:id="imgAlbumArt" fitHeight="54.0" fitWidth="54.0" pickOnBounds="true" preserveRatio="true" />
                </StackPane>
                <VBox alignment="CENTER_LEFT" spacing="2.0">
                    <Label fx:id="lblNowPlayingTitle" text="No track selected" styleClass="now-playing-title" />
                    <Label fx:id="lblNowPlayingArtist" text="Choose a song to begin playback" styleClass="now-playing-artist" />
                </VBox>
            </HBox>

            <VBox alignment="CENTER" spacing="6.0" HBox.hgrow="ALWAYS" maxWidth="640.0">
                <HBox alignment="CENTER" spacing="16.0">
                    <Button fx:id="btnShuffle" text="🔀" styleClass="control-button" onAction="#handleToggleShuffle" />
                    <Button fx:id="btnPrevious" text="⏮" styleClass="control-button" onAction="#handlePrevious" />
                    <Button fx:id="btnPlayPause" text="▶" styleClass="control-button-play" onAction="#handleTogglePlayPause" />
                    <Button fx:id="btnStop" text="⏹" styleClass="control-button" onAction="#handleStop" />
                    <Button fx:id="btnNext" text="⏭" styleClass="control-button" onAction="#handleNext" />
                    <Button fx:id="btnRepeat" text="🔁" styleClass="control-button" onAction="#handleToggleRepeat" />
                </HBox>
                <HBox alignment="CENTER" spacing="10.0">
                    <Label fx:id="lblElapsedTime" text="00:00" styleClass="time-label" />
                    <Slider fx:id="seekSlider" HBox.hgrow="ALWAYS" min="0.0" max="100.0" value="0.0" />
                    <Label fx:id="lblTotalDuration" text="00:00" styleClass="time-label" />
                </HBox>
            </VBox>

            <HBox alignment="CENTER_RIGHT" prefWidth="260.0" spacing="10.0">
                <Button fx:id="btnMute" text="🔊" styleClass="control-button" onAction="#handleToggleMute" />
                <Slider fx:id="volumeSlider" prefWidth="110.0" min="0.0" max="1.0" value="0.8" />
                <Button fx:id="btnQueueDrawer" text="📑" styleClass="control-button" onAction="#handleToggleQueueDrawer" />
            </HBox>
        </HBox>
    </bottom>
</BorderPane>`
  },
  {
    path: 'src/main/resources/css/styles.css',
    name: 'styles.css',
    category: 'UI & Controller',
    language: 'css',
    description: 'Windows 11 Fluent Dark stylesheet with Segoe UI typography and custom scrollbars.',
    content: `.root {
    -fx-font-family: 'Segoe UI Variable', 'Segoe UI', -apple-system, sans-serif;
    -fx-background-color: #0f1117;
    -fx-text-fill: #f3f4f6;
}
.sidebar {
    -fx-background-color: #141721;
    -fx-border-color: transparent #232736 transparent transparent;
    -fx-border-width: 0 1 0 0;
    -fx-padding: 16 12 16 12;
}
.sidebar-title { -fx-text-fill: #e2e8f0; -fx-font-size: 15px; -fx-font-weight: bold; }
.sidebar-category-label { -fx-text-fill: #64748b; -fx-font-size: 11px; -fx-font-weight: bold; }
.sidebar-button { -fx-background-color: transparent; -fx-text-fill: #94a3b8; -fx-font-size: 13px; }
.sidebar-button:hover { -fx-background-color: #1e2230; -fx-text-fill: #f8fafc; }
.sidebar-button.active { -fx-background-color: #2b3044; -fx-text-fill: #38bdf8; -fx-font-weight: bold; }
.content-area { -fx-background-color: #0f1117; -fx-padding: 24 28 20 28; }
.library-heading { -fx-text-fill: #ffffff; -fx-font-size: 26px; -fx-font-weight: bold; }
.library-subtext { -fx-text-fill: #94a3b8; -fx-font-size: 13px; }
.search-field { -fx-background-color: #1a1e2d; -fx-text-fill: #f8fafc; -fx-border-color: #2c3247; -fx-border-radius: 8; }
.search-field:focused { -fx-border-color: #38bdf8; }
.action-button { -fx-background-color: #1e2436; -fx-border-color: #2d344d; -fx-text-fill: #cbd5e1; -fx-background-radius: 8; }
.action-button-primary { -fx-background-color: #0284c7; -fx-text-fill: #ffffff; -fx-background-radius: 8; -fx-font-weight: bold; }
.table-view { -fx-background-color: transparent; -fx-border-color: #232736; -fx-border-radius: 8; }
.table-row-cell:selected { -fx-background-color: #1e293b; }
.table-row-cell:selected .table-cell { -fx-text-fill: #38bdf8; }
.playback-bar { -fx-background-color: #131620; -fx-border-color: #232736 transparent transparent transparent; -fx-border-width: 1 0 0 0; }
.control-button-play { -fx-background-color: #ffffff; -fx-text-fill: #0f1117; -fx-background-radius: 50; }
.slider .track { -fx-background-color: #282e42; -fx-pref-height: 4px; }
.slider .thumb { -fx-background-color: #ffffff; -fx-background-radius: 10; }`
  },
  {
    path: 'BUILD_AND_PACKAGING_GUIDE.md',
    name: 'BUILD_AND_PACKAGING_GUIDE.md',
    category: 'Packaging',
    language: 'markdown',
    description: 'Complete build, run, and Windows jpackage EXE installer generation manual.',
    content: `# MusicPlayer: Build, Run & Packaging Guide (Windows 10 / 11)

This guide provides the exact commands and architecture for compiling, running, and packaging **MusicPlayer** into a native Windows \`.exe\` installer or standalone portable distribution.

## 1. Prerequisites on Windows
- Java Development Kit (JDK 21 LTS): Eclipse Temurin 21 or Oracle JDK 21
- Apache Maven (3.9+)
- WiX Toolset (v3.11+) for native .exe/.msi installers

## 2. Compiling and Running in Development
\`\`\`cmd
cd music-player
mvn clean compile javafx:run
\`\`\`

## 3. Packaging Standalone Executable Fat JAR
\`\`\`cmd
mvn clean package
\`\`\`
Generates \`target/music-player-1.0.0-all.jar\`

## 4. Native Windows EXE Packaging via jpackage
\`\`\`cmd
jpackage ^
  --type exe ^
  --name "MusicPlayerInstaller" ^
  --app-version "1.0.0" ^
  --vendor "MusicPlayer Desktop Team" ^
  --input "input_jar" ^
  --main-jar "music-player-1.0.0-all.jar" ^
  --main-class "com.musicplayer.MainApp" ^
  --dest "dist" ^
  --win-dir-chooser ^
  --win-menu ^
  --win-shortcut
\`\`\``
  }
];
