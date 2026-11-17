# MusicPlayer: Build, Run & Packaging Guide (Windows 10 / 11)

This guide provides the exact commands and architecture for compiling, running, and packaging **MusicPlayer** into a native Windows `.exe` installer or standalone portable distribution.

---

## 1. Prerequisites on Windows

1. **Java Development Kit (JDK 21 LTS)**:
   - Install **Eclipse Temurin 21 (x64)** or **Oracle JDK 21**.
   - Verify environment variables:
     ```cmd
     java -version
     javac -version
     echo %JAVA_HOME%
     ```
2. **Apache Maven (3.9+)**:
   - Download Maven and ensure `mvn` is on your Windows `PATH`:
     ```cmd
     mvn -version
     ```
3. **WiX Toolset (v3.11+)** *(Required only for generating native `.exe`/`.msi` installers)*:
   - Download WiX Toolset v3.11 build tools.
   - Add WiX binaries (`C:\Program Files (x86)\WiX Toolset v3.11\bin`) to your Windows `PATH`.

---

## 2. Compiling and Running in Development

### Fast Compile & Development Run via JavaFX Plugin
Open Windows Command Prompt (`cmd.exe`) or PowerShell in the `music-player/` directory:

```cmd
cd music-player
mvn clean compile javafx:run
```

This compiles all modules, attaches the JavaFX runtime module flags (`--add-modules javafx.controls,javafx.fxml,javafx.media`), initializes the embedded SQLite database at `%USERPROFILE%\.musicplayer\music_player.db`, and launches the native UI.

---

## 3. Packaging Standalone Executable Fat JAR

To generate a standalone shaded JAR that includes all SQLite JDBC drivers, jaudiotagger, and SLF4J dependencies:

```cmd
mvn clean package
```

The build will generate two JARs in the `target/` directory:
- `target/music-player-1.0.0.jar` (thin JAR)
- `target/music-player-1.0.0-all.jar` (fat standalone executable shaded JAR)

### Running the Shaded JAR:
```cmd
java --module-path "%PATH_TO_JAVAFX_SDK%\lib" --add-modules javafx.controls,javafx.fxml,javafx.media -jar target\music-player-1.0.0-all.jar
```

---

## 4. Native Windows EXE Packaging via `jpackage`

JDK 21 includes the native `jpackage` utility, which bundles the Java runtime, application code, and native Windows launcher into an isolated directory or installer with zero external JRE dependency.

### Step 4.1: Prepare Output Directory
```cmd
mvn clean package
if not exist "dist" mkdir dist
if not exist "input_jar" mkdir input_jar
copy target\music-player-1.0.0-all.jar input_jar\
```

### Step 4.2: Build Standalone Windows Portable Directory (App Image)
Produces a clean portable folder containing `MusicPlayer.exe` and a minimized runtime:

```cmd
jpackage ^
  --type app-image ^
  --name "MusicPlayer" ^
  --app-version "1.0.0" ^
  --input "input_jar" ^
  --main-jar "music-player-1.0.0-all.jar" ^
  --main-class "com.musicplayer.Launcher" ^
  --dest "dist" ^
  --java-options "-XX:+UseG1GC -XX:MaxGCPauseMillis=20 -Xmx1024m"
```

You can now run:
```cmd
dist\MusicPlayer\MusicPlayer.exe
```

### Step 4.3: Build Native Windows Installer (.exe / .msi)
Generates an enterprise Windows installer using WiX:

```cmd
jpackage ^
  --type exe ^
  --name "MusicPlayerInstaller" ^
  --app-version "1.0.0" ^
  --vendor "MusicPlayer Desktop Team" ^
  --input "input_jar" ^
  --main-jar "music-player-1.0.0-all.jar" ^
  --main-class "com.musicplayer.Launcher" ^
  --dest "dist" ^
  --win-dir-chooser ^
  --win-menu ^
  --win-shortcut
```

This creates:
`dist\MusicPlayerInstaller-1.0.0.exe`

---

## 5. Architectural Invariants Verification

1. **Zero UI Blocking**: All I/O, ID3 parsing, and SQLite statements are executed via `ioExecutor` and `MetadataExtractor.metadataExecutor`. UI updates are routed through `Platform.runLater()`.
2. **$\mathcal{O}(1)$ Playback Navigation**: The `PlaybackQueue` uses custom doubly-linked nodes (`LinkedListNode<Song>`) for instant track stepping.
3. **Dynamic Shuffle Weights**: The `ShufflePriorityQueue` dynamically weights songs based on play count with high-entropy random jitter.
4. **SQLite Persistence**: Database schemas (`songs`, `playlists`, `playlist_songs`, `user_settings`) are verified with parameterized statements and WAL mode compatibility.
