# MusicPlayer Application – Technical Documentation

> **Audience**: B.Tech (Computer Science/Engineering) students who want a deep understanding of the source code, architectural decisions, and implementation details of the **MusicPlayer** desktop application.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Core JavaFX Client (Java)](#core-javafx-client-java)
   - [Launcher.java](#launcherjava)
   - [MainApp.java](#mainappjava)
   - [PlayerController.java](#playercontrollerjava)
   - [Model Layer](#model-layer)
     - [Song.java](#songjava)
     - [Playlist.java](#playlistjava)
   - [Data‑Access Layer](#data‑access-layer)
     - [DatabaseManager.java](#databasemanagerjava)
     - [SongDAO.java](#songdaojava)
   - [Engine Layer](#engine-layer)
     - [AudioEngine.java](#audioenginejava)
     - [PlaybackQueue.java](#playbackqueuejava)
     - [ShufflePriorityQueue.java](#shufflepriorityqueuejava)
   - [Utility Layer](#utility-layer)
     - [MetadataExtractor.java](#metadataextractorjava)
3. [Resources (FXML / CSS)](#resources-fxml--css)
4. [Packaging & Build (Maven / Vite)](#packaging--build)
   - [pom.xml](#pomxml)
   - [BUILD_AND_PACKAGING_GUIDE.md](#build_and_packaging_guidemd)
   - [vite.config.ts](#viteconfigts)
5. [Optional Web UI (React/TypeScript)](#optional-web-ui-reacttypescript)
   - Overview of the `src/` folder
6. [Runtime Artifacts](#runtime-artifacts)
7. [Key Technical Concepts]
   - JavaFX Property Bindings
   - Thread‑pool I/O Executor
   - SQLite persistence
   - Dynamic weighted shuffle (max‑heap)
   - Audio playback via JavaFX `MediaPlayer`
8. [Further Reading & References]

---

## Project Overview
The **MusicPlayer** project is a cross‑platform desktop audio player built with **JavaFX** for the UI and **SQLite** for local metadata storage.  It follows a classic **MVC** pattern:

* **Model** – immutable POJOs with JavaFX‑compatible property fields (`IntegerProperty`, `StringProperty`, …).
* **View** – `PlayerView.fxml` (FXML) and `styles.css` (CSS) defining the layout and look‑and‑feel.
* **Controller** – `PlayerController.java` which wires UI events to the underlying engine, manages background tasks, and coordinates persistence.

The application also ships a **native installer** generated via `jpackage` (see the `dist/` folder) and a **React‑based demo UI** under the top‑level `src/` directory (used for documentation / experimentation, not required for the core player).

---

## Core JavaFX Client (Java)
### Launcher.java
```java
package com.musicplayer;

/**
 * Bootstrap entry point for JavaFX shaded fat JAR and native launchers.
 * Does NOT extend Application, circumventing the JVM JavaFX module check on startup.
 */
public class Launcher {
    public static void main(String[] args) {
        MainApp.main(args);
    }
}
```
* **Purpose** – Provides a thin shim that forwards the `main` call to `MainApp`.  This class exists so that the generated *fat JAR* can be launched without the JVM performing the automatic JavaFX module validation (which would otherwise require `--add-modules=javafx.controls,javafx.fxml`).
* **Technical note** – The native launcher created by `jpackage` points to this class, keeping the JAR‑only entry point clean.

---

### MainApp.java
```java
public class MainApp extends Application {
    private static final Logger logger = LoggerFactory.getLogger(MainApp.class);
    private PlayerController controller;

    @Override
    public void start(Stage primaryStage) {
        Thread.setDefaultUncaughtExceptionHandler(...);
        try {
            URL fxmlUrl = getClass().getResource("/fxml/PlayerView.fxml");
            FXMLLoader loader = new FXMLLoader(fxmlUrl);
            Parent root = loader.load();
            this.controller = loader.getController();
            Scene scene = new Scene(root, 1200, 780);
            // stylesheet, stage configuration, shutdown hook …
        } catch (Exception e) { … }
    }

    public static void main(String[] args) { launch(args); }
}
```
* **Bootstraps** the JavaFX runtime, loads `PlayerView.fxml`, captures the generated `PlayerController` instance, and configures the primary `Stage`.
* Registers a **global uncaught‑exception handler** that forwards stack traces to **SLF4J** (`logger.error`).
* Adds a **shutdown hook** (`primaryStage.setOnCloseRequest`) that disposes of the `AudioEngine`, closes the SQLite connection via `DatabaseManager`, and exits the JVM cleanly.
* The `Scene` dimensions (1200 × 780) and dark background colour `#0f1117` are hard‑coded but could be made configurable.

---

### PlayerController.java
*Length: ~720 lines* – the heart of the application.  Below we highlight the most important sections.

#### 1. Dependency Injection (FXML fields)
```java
@FXML private TableView<Song> songsTable;
@FXML private TableColumn<Song, Number> colIndex;
@FXML private TableColumn<Song, String> colTitle;
// … many more UI components …
```
All UI components defined in `PlayerView.fxml` are injected via the `@FXML` annotation, giving the controller full programmatic access.

#### 2. Core Sub‑systems
```java
private SongDAO songDAO;
private AudioEngine audioEngine;
private PlaybackQueue playbackQueue;            // Custom doubly linked list + HashMap
private ShufflePriorityQueue shufflePriorityQueue; // Dynamic weighted Max‑Heap
```
* `SongDAO` – persistence façade for the `songs` table.
* `AudioEngine` – wraps JavaFX `MediaPlayer` and exposes observable properties (`playbackState`, `currentPositionSeconds`, `totalDurationSeconds`).
* `PlaybackQueue` – a hand‑rolled doubly linked list that stores the *sequential* play order and provides O(1) navigation (`next`, `previous`).
* `ShufflePriorityQueue` – a max‑heap where each `Song` gets a **priority** based on play‑count (less‑played songs get higher priority).  This implements the “dynamic weighted shuffle” described in the project README.

#### 3. Concurrency Model
```java
private final ExecutorService ioExecutor = Executors.newFixedThreadPool(
        Math.max(2, Runtime.getRuntime().availableProcessors() - 1),
        r -> { Thread t = new Thread(r, "MusicPlayer-IO-Worker"); t.setDaemon(true); return t; });
```
* A **daemon thread‑pool** dedicated to heavyweight I/O such as scanning the file system for new audio files and writing DB updates.
* All UI‑affecting callbacks (`Platform.runLater`) are marshalled back onto the JavaFX Application Thread.

#### 4. UI Binding & Search
* TableView columns are bound to the `Song` property getters (`titleProperty()`, …) – enabling *automatic* UI refresh when model values change.
* A `FilteredList` + `SortedList` combo implements **instant search**; the predicate checks title, artist, and album case‑insensitively.

#### 5. Playback Controls Wiring
* `setupPlaybackEngineListeners()` attaches listeners to `AudioEngine` observable properties to update the **play/pause button**, **seek slider**, **elapsed/total time labels**, and **error alerts**.
* `setupSeekSliderInteraction()` prevents “slider fight” by toggling a local flag `isSeeking` while the user drags the slider.
* `setupVolumeAndControls()` synchronises the volume slider with the engine and persists the setting in SQLite (`songDAO.saveSetting`).

#### 6. Core Playback Flow (`playSelectedSong`)
```java
private void playSelectedSong(Song song) {
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
```
* Updates UI, pushes the song into the **playback queue**, starts playback, and asynchronously increments the play‑count in the DB.

#### 7. Shuffle Logic
* When shuffle is toggled, `shufflePriorityQueue.rebuild(playbackQueue.toList())` constructs a heap where each song’s **priority** = `100 - min(playCount * 5, 80)`.  This makes rarely‑played tracks more likely to appear earlier.
* `handleNext()` chooses the next song from either the heap (`pollNext()`) or the sequential queue, depending on `isShuffleActive`.

#### 8. Cleanup (`cleanup`)
* Called from `MainApp` shutdown hook – shuts down the `ioExecutor`, closes DB connections, and disposes of the `AudioEngine`.

---

### Model Layer
#### Song.java
*Represents a single audio track.*
* Uses **JavaFX properties** (`IntegerProperty`, `StringProperty`, `DoubleProperty`) enabling direct binding to TableView columns.
* Stores raw album‑art bytes (`byte[] albumArtBytes`) and lazily creates a cached `Image` for UI rendering.
* Implements a **dynamic priority** field (`int priority`) used by the shuffle heap.
* Provides a static helper `formatTime(double seconds)` converting seconds → `mm:ss` or `hh:mm:ss`.

#### Playlist.java (not fully shown)
*Simple POJO* containing `id`, `name`, and a `List<Song>` (or a reference table in SQLite).  Used by the UI’s sidebar `playlistListView`.

---

### Data‑Access Layer
#### DatabaseManager.java (not fully shown)
*Singleton* that opens a **SQLite** database (`musicplayer.db`) in the user's app‑data directory, creates tables (`songs`, `playlists`, `settings`) if they do not exist, and provides a raw `Connection`.
* Manages **transaction boundaries** for batch inserts.

#### SongDAO.java (not fully shown)
*High‑level DAO* with methods such as:
* `List<Song> getAllSongs()` – maps DB rows to `Song` objects.
* `void incrementPlayCount(int songId)` – `UPDATE songs SET play_count = play_count + 1 WHERE id = ?`.
* `void saveSetting(String key, String value)` – persists UI‑level settings (volume, last played track, shuffle flag).
* Uses **prepared statements** to avoid SQL injection.

---

### Engine Layer
#### AudioEngine.java (not fully shown)
*Wraps a JavaFX `MediaPlayer`.*
* Exposes **observable properties** (`ObjectProperty<PlaybackState> playbackState`, `DoubleProperty currentPositionSeconds`, `DoubleProperty totalDurationSeconds`).
* Provides `play(Song)`, `togglePlayPause()`, `stop()`, `seek(double seconds)`, `setVolume(double)`, `setOnEndOfMedia(Runnable)`, and `setOnError(Consumer<Exception>)`.
* Handles **audio format detection** via file extension and creates a `Media` object from the song’s absolute path.

#### PlaybackQueue.java (custom doubly linked list)
* Stores songs in insertion order.
* Maintains a `Map<Integer, Node>` for O(1) access by song ID (important for “jump to” operations).
* Provides `getNext()`, `getPrevious()`, `setCurrentSong(Song)`, and `toList()` for flattening into an `ArrayList` (used by the shuffle heap).

#### ShufflePriorityQueue.java (max‑heap implementation)
* Uses `java.util.PriorityQueue<Song>` with a custom comparator `Comparator.comparingInt(Song::getPriority).reversed()`.
* `rebuild(List<Song> songs)` recomputes each song’s priority based on the current play‑count, then clears & re‑inserts all entries.
* `pollNext()` returns and removes the highest‑priority song; when the heap is empty it is rebuilt from the playback queue.

---

## Resources (FXML / CSS)
* **PlayerView.fxml** – defines the UI hierarchy (BorderPane root, TableView for the library, side‑pane for playlists, playback bar at the bottom).  All IDs map to the `@FXML` fields in `PlayerController`.
* **styles.css** – dark theme with custom colours for buttons, sliders, and the playlist list‑cell.  Uses CSS variables for easy theme changes.

---

## Packaging & Build (Maven / Vite)
### pom.xml
* Maven configuration for the Java module:
  * **Dependencies** – `javafx-controls`, `javafx-fxml`, `slf4j-api`, `sqlite-jdbc`.
  * **Plugins** – `javafx-maven-plugin` for packaging a **shaded fat JAR**, and `jpackage-maven-plugin` for generating a native Windows installer (`MusicPlayerInstaller‑1.0.0.exe`).
  * `build` profile sets `skipTests` and defines the main class as `com.musicplayer.Launcher`.

### BUILD_AND_PACKAGING_GUIDE.md
Provides step‑by‑step instructions for:
1. Installing Java 17+ and Maven.
2. Running `mvn clean package` to produce `target/music-player-*.jar`.
3. Using `jpackage` (via the Maven plugin) to create a Windows installer.
4. Optional “debug” mode launching the JAR directly (`java -jar ...`).

### vite.config.ts & top‑level `src/` folder
The project also contains a **Vite‑powered React/TypeScript UI** (used for documentation / demo).  It is **not required** for the core JavaFX player but shows how the same backend could be driven by a web front‑end.
* `vite.config.ts` configures TypeScript compilation and assets handling.
* `src/main.tsx` bootstraps a React root, rendering components such as `DesktopPlayerSimulator` that mimic the JavaFX UI.
* The `components/` folder includes:
  * `CodeExplorer.tsx` – a view that displays the source code hierarchy (useful for teaching).
  * `DatabaseExplorer.tsx` – visualises the SQLite database schema.
  * `DataStructuresLab.tsx` – interactive demonstration of the custom linked‑list and heap.
  * `PackagingGuideView.tsx` – renders the content of `BUILD_AND_PACKAGING_GUIDE.md` inside the web UI.

---

## Runtime Artifacts
* `dist/` – generated by `jpackage`; contains the native Windows executable, bundled JRE, and runtime resources.
* `target/` – Maven compiled classes (`.class` files) and packaged JARs.
* `metadata.json` – project‑level metadata used by the Antigravity IDE.

---

## Key Technical Concepts
### 1. JavaFX Property Bindings
JavaFX properties (`StringProperty`, `IntegerProperty`, etc.) fire **change listeners** automatically, allowing UI components (TableView, Labels) to stay synchronized with the model without manual refresh calls.

### 2. Thread‑pool I/O Executor
All disk‑heavy operations (folder scanning, DB writes) run on a **daemon thread‑pool** (`ioExecutor`).  This prevents UI freezes and ensures graceful shutdown (executor is shut down in `PlayerController.cleanup()`).

### 3. SQLite Persistence
A lightweight embedded database stores song metadata, play‑counts, user preferences, and playlist definitions.  The DAO layer abstracts SQL operations behind typed Java methods.

### 4. Dynamic Weighted Shuffle
The shuffle algorithm is **not purely random**; it favours songs that have been played fewer times.  Priority calculation:
```
priority = 100 - Math.min(playCount * 5, 80);
```
Higher priority → higher chance of being polled first from the max‑heap.

### 5. Audio Playback via JavaFX `MediaPlayer`
`AudioEngine` creates a `Media` object from the song’s file path and controls playback through `MediaPlayer`.  Listeners forward playback state changes to observable properties, which the controller uses to update UI elements.

---

## Further Reading & References
* **JavaFX Documentation** – https://openjfx.io
* **SQLite JDBC Driver** – https://github.com/xerial/sqlite-jdbc
* **jpackage Tool** – https://docs.oracle.com/en/java/javase/21/docs/specs/man/jpackage.html
* **Maven Shade Plugin** – https://maven.apache.org/plugins/maven-shade-plugin/
* **Design Patterns** – *Observer* (JavaFX properties), *Singleton* (`DatabaseManager`), *Factory* (`AudioEngine` creates `MediaPlayer`).

---

*Generated by Antigravity on 2026‑10‑28.*
