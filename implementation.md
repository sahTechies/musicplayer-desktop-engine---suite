# Project Implementation Report: MusicPlayer Desktop Engine & Suite

> **Target Audience**: B.Tech (Computer Science & Engineering) Final Year / Semester Evaluation, Project Reviewers, and Viva Panels.  
> **Project Title**: High-Performance Desktop Audio Engine with Custom Data Structures & SQLite Persistence.  
> **Technologies Used**: Java 17+, JavaFX 21, SQLite 3, JDBC, Jaudiotagger, SLF4J, Maven, jpackage, Vite, React, TypeScript.

---

## 1. System Architecture & High-Level Design

The application follows the **Model-View-Controller (MVC)** architectural design pattern, supplemented with an independent **Data Access Object (DAO) Layer**, **Engine Subsystem**, and **Background Concurrency Layer**.

```
+-----------------------------------------------------------------------------------+
|                                  USER INTERFACE                                   |
|   PlayerView.fxml (SceneGraph Tree)  <--->  styles.css (JavaFX CSS Skinning)      |
+-----------------------------------------------------------------------------------+
                                          ▲
                                          │ Events & Observables (Bi-directional)
                                          ▼
+-----------------------------------------------------------------------------------+
|                                CONTROLLER LAYER                                   |
|                              PlayerController.java                                |
|  - TableView bindings                - Multi-threaded Task orchestration          |
|  - Real-time search filtering        - Audio event handlers & UI state machine    |
+-----------------------------------+-----------------------------------------------+
         │                          │                          │
         ▼                          ▼                          ▼
+-------------------+      +-------------------+      +-------------------+
|  DATA STRUCTURES  |      |   AUDIO ENGINE    |      | PERSISTENCE (DAO) |
|   ENGINE LAYER    |      |  AudioEngine.java |      |    SongDAO.java   |
| - PlaybackQueue   |      |  (JavaFX Media    |      | - Parameterized   |
|   (DLL + HashMap) |      |   Pipeline)       |      |   PreparedStmts   |
| - ShufflePQ       |      |  - Play / Pause   |      | - ACID Transact.  |
|   (Max-Heap)      |      |  - Scrub / Seek   |      |         │         |
+-------------------+      |  - Buffering      |      +---------│---------+
                           +-------------------+                ▼
                                                       +-------------------+
                                                       |  DatabaseManager  |
                                                       |  (Singleton JDBC) |
                                                       |  SQLite Storage   |
                                                       +-------------------+
```

---

## 2. In-Depth File-by-File Implementation Analysis

### 2.1 Bootstrapping and Execution Lifecycle

#### `Launcher.java`
* **Package**: `com.musicplayer`
* **Role**: Primary executable entry point for the shaded/fat JAR distribution.
* **Why this is needed**: JavaFX 11+ enforces module encapsulation checks. If the main class directly extends `javafx.application.Application`, the JVM verifies modularity before class loading, crashing with `Error: JavaFX runtime components are missing`. `Launcher.java` is a standard Java class with a traditional `public static void main(String[] args)` that delegates to `MainApp.main(args)`, thereby bypassing the modular runtime verification.

#### `MainApp.java`
* **Package**: `com.musicplayer`
* **Role**: JavaFX Application subclass that constructs the primary stage (`Stage`), scenes, stylesheets, and global exception handlers.
* **Key Implementation Details**:
  1. **Uncaught Exception Interception**: Registers `Thread.setDefaultUncaughtExceptionHandler` so uncaught background thread errors are logged through SLF4J rather than silently dying.
  2. **FXML Tree Loading**: Loads `/fxml/PlayerView.fxml` via `FXMLLoader`, obtaining an instance of `PlayerController`.
  3. **Stage & Scene Properties**: Configures default window size ($1200 \times 780$), minimum limits ($960 \times 640$), background base color (`#0f1117`), and applies `/css/styles.css`.
  4. **Graceful Teardown Hook**: Overrides `primaryStage.setOnCloseRequest` to invoke `controller.cleanup()`, ensuring worker thread pools, native media streams, and SQLite locks terminate cleanly before `System.exit(0)`.

---

### 2.2 Model Layer

#### `Song.java`
* **Package**: `com.musicplayer.model`
* **Role**: Core domain model representing an audio track.
* **JavaFX Property Pattern**: Every field (`id`, `filePath`, `title`, `artist`, `album`, `durationSeconds`, `playCount`, `formattedDuration`) is backed by a JavaFX `Property` object (`StringProperty`, `IntegerProperty`, `DoubleProperty`).
* **Why Properties?**: Property binding provides reactive UI updates. When a track's `playCount` or `duration` is updated in the model, any table cell or label bound to it automatically refreshes on screen without manually calling repaint routines.
* **Lazy Album Art Decoding**: Album cover byte arrays (`byte[] albumArtBytes`) are converted to JavaFX `Image` objects lazily via `getAlbumArtImage()` with caching to minimize heap memory allocation.
* **Time Conversion Utility**: `formatTime(double seconds)` formats raw playback floats into `mm:ss` or `hh:mm:ss`.

#### `Playlist.java`
* **Package**: `com.musicplayer.model`
* **Role**: Domain model representing a user-curated playlist.
* **Implementation Details**: Wraps a `playlistId`, `name`, and an `ObservableList<Song> songs`. Provides convenience methods to compute total playlist duration and total song count.

---

### 2.3 Data Structures Subsystem (Algorithms in Action)

#### `PlaybackQueue.java` (Doubly Linked List + Dual HashMaps)
* **Package**: `com.musicplayer.engine`
* **Purpose**: Manages sequential playback, circular repeats, and instant lookups.
* **Data Structure Design**:
  * **Doubly Linked List**: Node class `LinkedListNode<Song>` contains `data`, `prev`, and `next` pointers.
  * **Hash Maps (`pathIndex` & `idIndex`)**: Maps `String filePath -> LinkedListNode<Song>` and `Integer id -> LinkedListNode<Song>`.
* **Complexity Guarantees**:
  * **Next / Previous Track**: $\mathcal{O}(1)$ pointer shift (`currentNode = currentNode.next` or `currentNode.prev`).
  * **Insert at Tail / Append**: $\mathcal{O}(1)$ linked list insertion.
  * **Insert After Current ("Play Next")**: $\mathcal{O}(1)$ pointer rewiring.
  * **Jump to Track / Track Selection**: $\mathcal{O}(1)$ via `pathIndex.get(filePath)`. In a standard array list, this would take $\mathcal{O}(N)$.
  * **Remove Song**: $\mathcal{O}(1)$ unlinking once the node reference is obtained from the hash map.
* **Repeat Modes**:
  * `Repeat Off`: When `currentNode.next == null`, playback terminates.
  * `Repeat All`: When `currentNode.next == null`, `currentNode = head` (circular traversal).
  * `Repeat One`: `getNext()` continually returns `currentNode.data`.

#### `ShufflePriorityQueue.java` (Binary Max-Heap with Dynamic Weights)
* **Package**: `com.musicplayer.engine`
* **Purpose**: Algorithmic shuffle engine that prevents repetition and prioritizes lesser-played songs.
* **Data Structure Design**:
  * Implemented using a binary **Max-Heap** stored in an array list (`List<QueueEntry> heap`).
  * `QueueEntry` implements `Comparable<QueueEntry>` based on an evaluated `priorityScore`.
* **Dynamic Weighting Formula**:
  $$\text{Score} = \left(\frac{100.0}{1.0 + \text{playCount} \times 0.5}\right) + (\text{random} \times 60.0) + \text{song.priority}$$
  * **Inverse Play Count Term**: Songs with lower play counts receive a higher baseline score.
  * **Stochastic Jitter (`random * 60.0`)**: Introduces entropy so the shuffle sequence is never identical twice.
* **Complexity Guarantees**:
  * `insert(Song)`: $\mathcal{O}(\log N)$ via `siftUp()`.
  * `pollNext()`: $\mathcal{O}(\log N)$ via `siftDown()` (extracts and removes the highest priority track).
  * `peek()`: $\mathcal{O}(1)$ inspecting root index `0`.
  * `rebuild(List<Song>)`: $\mathcal{O}(N \log N)$ to repopulate the heap.
* **Fallback Algorithm**: Includes an in-place `fisherYatesShuffle(List<Song>)` running in $\mathcal{O}(N)$ time and $\mathcal{O}(1)$ auxiliary space.

---

### 2.4 Audio Playback Engine

#### `AudioEngine.java`
* **Package**: `com.musicplayer.engine`
* **Purpose**: Low-level audio streaming, buffer lifecycle, and playhead synchronization.
* **Underlying Technology**: JavaFX `javafx.scene.media.MediaPlayer` and `javafx.scene.media.Media`.
* **State Machine**:
  ```
  STOPPED  <--->  LOADING  --->  PLAYING  <--->  PAUSED
     ▲               │              │               ▲
     │               ▼              │               │
     +------------- ERROR <---------+---------------+
  ```
* **Thread Offloading**: Audio file URI generation and native buffer allocation are executed on a dedicated background thread pool (`mediaLoadingExecutor`). This ensures the UI remains responsive at 60 FPS even when loading multi-megabyte audio files from disk.
* **Memory Leak Prevention on Windows**:
  Windows file systems lock files if handles remain open. `AudioEngine` implements `disposeCurrentPlayer()`:
  ```java
  mediaPlayer.stop();
  mediaPlayer.dispose();
  mediaPlayer = null;
  ```
  This clears native DirectShow/MediaFoundation audio pipeline handles before allocating a new track.
* **Bi-directional Scrub Seeking**:
  * `currentPositionSeconds` continuously reflects `mediaPlayer.currentTimeProperty()`.
  * `seek(double seconds)` performs clamped positioning $\max(0.0, \min(seconds, totalDuration))$.

---

### 2.5 Metadata Extraction & File I/O

#### `MetadataExtractor.java`
* **Package**: `com.musicplayer.util`
* **Library**: `jaudiotagger` (v3.0.1)
* **Capabilities**:
  * Reads ID3v1, ID3v2.3, ID3v2.4, and WAV INFO chunks.
  * Extracts Title, Artist, Album, Track Duration, and embedded APIC binary image bytes (album artwork).
* **Two-Tier Resilient Fallback**:
  * If ID3 tags are missing or corrupted, it applies a regex-based heuristic filename parser:
    $$\text{"Artist - SongTitle.mp3"} \longrightarrow \{\text{Artist}, \text{SongTitle}\}$$
  * If no delimiter exists, the filename is sanitized and used as the title.
* **Asynchronous Offloading**: Provides `extractAsync(...)` wrapped in a JavaFX `Task<Song>` executed across an I/O worker thread pool sized according to host CPU cores:
  $$\text{Pool Size} = \max(2, \text{Available Processors} - 1)$$

---

### 2.6 Persistence & Database Architecture

#### `DatabaseManager.java` (Singleton)
* **Package**: `com.musicplayer.database`
* **Purpose**: SQLite connection factory, pool management, and relational DDL executor.
* **Database File Location**: Stored under `<user.home>/.musicplayer/music_player.db`.
* **Schema Design**:
  1. `songs`: Primary song repository.
  2. `playlists`: Playlist master table.
  3. `playlist_songs`: Join table with composite key `(playlist_id, song_id)` and foreign keys with `ON DELETE CASCADE`.
  4. `user_settings`: Key-value pair configuration table.
* **B-Tree Indexes**:
  * `idx_songs_path` on `songs(file_path)` ($\mathcal{O}(\log N)$ duplicate check).
  * `idx_songs_artist`, `idx_songs_album` for grouping and filtering.
  * `idx_playlist_songs_order` for ordered playlist retrieval.
* **Pragma Configuration**: Explicitly enables `PRAGMA foreign_keys = ON;`.

#### `SongDAO.java`
* **Package**: `com.musicplayer.database`
* **Purpose**: Data Access Object layer abstracting raw SQL statements.
* **Security & Reliability**: Strictly parameterized `PreparedStatement` usage prevents SQL Injection attacks.
* **Key Operations**:
  * **Upsert Operation (`insertOrUpdateSong`)**:
    Uses SQLite's `INSERT ... ON CONFLICT(file_path) DO UPDATE SET ...` to update metadata without duplicate records.
  * **Play Count Increment (`incrementPlayCount`)**:
    Executes an atomic SQL update: `UPDATE songs SET play_count = play_count + 1 WHERE id = ?`.
  * **Transactional Playlist Association (`addSongToPlaylist`)**:
    Maps track order and persists custom user sequences.
  * **Settings Persistence**: Saves last-used volume, repeat mode, and shuffle state across app launches.

---

### 2.7 UI Orchestration & Controller

#### `PlayerController.java`
* **Package**: `com.musicplayer.controller`
* **Interface**: `javafx.fxml.Initializable`
* **Responsibilities**:
  1. **UI Injection**: Bridges ~30 `@FXML` components including `TableView`, `Sliders`, `Buttons`, and `Labels`.
  2. **Reactive Table Binding**:
     ```java
     colTitle.setCellValueFactory(cellData -> cellData.getValue().titleProperty());
     ```
  3. **Real-time Predicate Filtering**:
     Combines `FilteredList<Song>` and `SortedList<Song>`. As the user types in the search bar, the filter predicate executes in $\mathcal{O}(N)$ without re-querying SQLite:
     ```java
     filteredSongList.setPredicate(song ->
         song.getTitle().toLowerCase().contains(query) ||
         song.getArtist().toLowerCase().contains(query) ||
         song.getAlbum().toLowerCase().contains(query)
     );
     ```
  4. **Slider Scrubbing Synchronization ("Slider Fight" Prevention)**:
     During active playback, progress slider updates could conflict with user drag interactions. This is resolved by tracking a boolean flag `isSeeking`:
     * On `MousePressed` / `valueChangingProperty == true` $\rightarrow$ set `isSeeking = true` (suspends automatic slider repositioning).
     * On `MouseReleased` $\rightarrow$ set `isSeeking = false` and commit `audioEngine.seek(slider.getValue())`.
  5. **Background Batch Importer**:
     When the user adds a folder, recursive directory traversal runs inside a `Task<List<File>>`. The UI displays a progress bar bound to `importTask.progressProperty()`.

---

## 3. Data Structures & Algorithmic Complexity Reference

| Operation | Component | Underlying Data Structure / Algorithm | Time Complexity | Space Complexity |
| :--- | :--- | :--- | :---: | :---: |
| Next / Prev Track | `PlaybackQueue` | Doubly Linked List Pointers | $\mathcal{O}(1)$ | $\mathcal{O}(1)$ |
| Lookup by Path/ID | `PlaybackQueue` | `HashMap<String, Node>` | $\mathcal{O}(1)$ avg | $\mathcal{O}(N)$ |
| "Play Next" Insert | `PlaybackQueue` | Node Splice after Current | $\mathcal{O}(1)$ | $\mathcal{O}(1)$ |
| Weighted Next Track | `ShufflePriorityQueue` | Binary Max-Heap `poll()` | $\mathcal{O}(\log N)$ | $\mathcal{O}(1)$ |
| Rebuild Shuffle Heap | `ShufflePriorityQueue` | Iterative Sift-Up Insertions | $\mathcal{O}(N \log N)$ | $\mathcal{O}(N)$ |
| Instant Search Filter | `PlayerController` | Predicate Filter on ObservableList | $\mathcal{O}(N)$ | $\mathcal{O}(N)$ |
| SQLite Path Duplicate Check | `SongDAO` / `DatabaseManager` | B-Tree Index on `file_path` | $\mathcal{O}(\log N)$ | $\mathcal{O}(N)$ |

---

## 4. Multi-Threading and Concurrency Model

```
[ JavaFX Application Thread (UI) ]
       │
       ├──── User clicks "Import Folder"
       │
       ▼ (Dispatches Task to Worker Pool)
[ ioExecutor (Thread Pool: N-1 daemon threads) ]
       │
       ├── 1. Recursively traverses disk directories
       ├── 2. Reads binary audio headers via jaudiotagger
       ├── 3. Executes SQLite UPSERT statements via SongDAO
       │
       ▼ (Reports progress & completion)
[ Platform.runLater(() -> UI Updates) ]
       │
       ▼
[ JavaFX Application Thread updates TableView & Status Bar ]
```

* **UI Thread Isolation**: All disk I/O, ID3 parsing, and database transactions occur off the JavaFX Application Thread.
* **Thread Safety**: Crucial state access methods in `PlaybackQueue`, `ShufflePriorityQueue`, `AudioEngine`, and `SongDAO` are marked `synchronized` to eliminate race conditions.
* **Thread Pool Clean-up**: Daemon threads ensure that background tasks do not block JVM termination during shutdown.

---

## 5. Build, Packaging, and Distribution Pipeline

1. **Maven Build System (`pom.xml`)**:
   * Uses `maven-compiler-plugin` targeting Java 17+.
   * Utilizes `maven-shade-plugin` to package all project dependencies (`javafx-controls`, `javafx-fxml`, `javafx-media`, `sqlite-jdbc`, `jaudiotagger`, `slf4j-simple`) into a single self-contained executable JAR (`music-player-1.0.0-all.jar`).
2. **Native Windows Packaging (`jpackage`)**:
   * Bundles a minimal Java Runtime Environment (JRE) using `jlink` alongside the shaded JAR.
   * Produces an installer executable (`MusicPlayerInstaller-1.0.0.exe`) and a standalone application folder (`MusicPlayer.exe`) in the `dist/` directory, allowing deployment on target machines without requiring a pre-installed JDK.

---

## 6. Summary for B.Tech Viva / Project Defense

* **Why SQLite over JSON/XML?**  
  SQLite provides transactional safety (ACID), handles thousands of tracks without loading the entire dataset into RAM at once, supports indexing on search columns, and preserves playlist relational mapping via foreign keys.
* **Why Doubly Linked List over `java.util.ArrayList` for Queue?**  
  An `ArrayList` requires $\mathcal{O}(N)$ element shifting when adding tracks into the middle of the queue (e.g. "Play Next") or when removing items. A Doubly Linked List performs both in $\mathcal{O}(1)$ time. Paired with a `HashMap`, it provides $\mathcal{O}(1)$ random access as well.
* **Why Weighted Shuffle over simple `Collections.shuffle()`?**  
  Pure random shuffle can feel repetitive or play recently heard tracks repeatedly. The custom Max-Heap dynamically weights songs inversely against their play counts with random jitter, ensuring fair distribution and playback variety.
* **How are UI freezes avoided during 1000+ song imports?**  
  Through asynchronous concurrency using `javafx.concurrent.Task` and an `ExecutorService`, updating the UI through `Platform.runLater()` and tracking progress with JavaFX property bindings.
