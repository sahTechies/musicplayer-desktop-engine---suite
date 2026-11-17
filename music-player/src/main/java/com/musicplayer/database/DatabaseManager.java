package com.musicplayer.database;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Singleton database manager for the embedded SQLite database.
 *
 * Thread-safety fix (v1.1):
 *   Each call to getConnection() now returns a brand-new JDBC Connection.
 *   SQLite in WAL mode handles concurrent reads correctly, and all writes
 *   in SongDAO are already synchronized.  Keeping one shared connection
 *   caused "stmt pointer is closed" errors when two threads tried to use
 *   the same Connection concurrently (one thread's try-with-resources close
 *   invalidated the shared object for the other thread).
 */
public class DatabaseManager {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseManager.class);
    private static final String DB_FILE_NAME = "music_player.db";
    private static DatabaseManager instance;

    private final String dbUrl;

    private DatabaseManager() {
        String userHome = System.getProperty("user.home");
        File appDir = new File(userHome, ".musicplayer");
        if (!appDir.exists()) {
            boolean created = appDir.mkdirs();
            if (!created) {
                logger.warn("Could not create .musicplayer directory – falling back to working dir.");
                appDir = new File(".");
            }
        }
        File dbFile = new File(appDir, DB_FILE_NAME);
        // Enable WAL journal for better concurrent read performance
        this.dbUrl = "jdbc:sqlite:" + dbFile.getAbsolutePath()
                + "?journal_mode=WAL&synchronous=NORMAL";
        logger.info("SQLite database path: {}", dbFile.getAbsolutePath());
        initSchema();
    }

    public static synchronized DatabaseManager getInstance() {
        if (instance == null) {
            instance = new DatabaseManager();
        }
        return instance;
    }

    /**
     * Opens and returns a fresh JDBC Connection for the caller.
     * The caller is responsible for closing it (use try-with-resources).
     */
    public Connection getConnection() throws SQLException {
        Connection conn = DriverManager.getConnection(dbUrl);
        try (Statement pragma = conn.createStatement()) {
            pragma.execute("PRAGMA foreign_keys = ON;");
        }
        return conn;
    }

    /** No-op – kept for API compatibility. Each connection is closed by its owner. */
    public void closeConnection() {
        logger.info("DatabaseManager.closeConnection() called – connections are per-caller, nothing to do.");
    }

    // -----------------------------------------------------------------------
    // Schema initialisation (runs once at startup)
    // -----------------------------------------------------------------------

    private void initSchema() {
        String createSongs = """
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

        String createPlaylists = """
            CREATE TABLE IF NOT EXISTS playlists (
                playlist_id INTEGER PRIMARY KEY AUTOINCREMENT,
                playlist_name TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """;

        String createPlaylistSongs = """
            CREATE TABLE IF NOT EXISTS playlist_songs (
                playlist_id INTEGER NOT NULL,
                song_id     INTEGER NOT NULL,
                sort_order  INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (playlist_id, song_id),
                FOREIGN KEY (playlist_id) REFERENCES playlists(playlist_id) ON DELETE CASCADE,
                FOREIGN KEY (song_id)     REFERENCES songs(id)              ON DELETE CASCADE
            );
            """;

        String createSettings = """
            CREATE TABLE IF NOT EXISTS user_settings (
                setting_key   TEXT PRIMARY KEY,
                setting_value TEXT NOT NULL
            );
            """;

        String[] indexes = {
            "CREATE INDEX IF NOT EXISTS idx_songs_path   ON songs(file_path);",
            "CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);",
            "CREATE INDEX IF NOT EXISTS idx_songs_album  ON songs(album);",
            "CREATE INDEX IF NOT EXISTS idx_pl_songs_ord ON playlist_songs(playlist_id, sort_order);"
        };

        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {

            stmt.execute(createSongs);
            stmt.execute(createPlaylists);
            stmt.execute(createPlaylistSongs);
            stmt.execute(createSettings);
            for (String idx : indexes) stmt.execute(idx);

            logger.info("Database schema and indexes initialized successfully.");
        } catch (SQLException e) {
            logger.error("Failed to initialize database schema", e);
            throw new RuntimeException("Database initialization failure", e);
        }
    }
}
