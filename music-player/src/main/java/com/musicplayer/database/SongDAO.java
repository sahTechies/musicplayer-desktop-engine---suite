package com.musicplayer.database;

import com.musicplayer.model.Playlist;
import com.musicplayer.model.Song;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Data Access Object (DAO) for songs, playlists, playlist associations, and user settings.
 * All SQL interactions use strictly parameterized PreparedStatements.
 */
public class SongDAO {

    private static final Logger logger = LoggerFactory.getLogger(SongDAO.class);
    private final DatabaseManager dbManager;

    public SongDAO() {
        this.dbManager = DatabaseManager.getInstance();
    }

    // --- Song CRUD Operations ---

    /**
     * Inserts a new song or updates an existing record based on unique file path.
     */
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
             PreparedStatement stmt = conn.prepareStatement(upsertSql)) {

            stmt.setString(1, song.getFilePath());
            stmt.setString(2, song.getTitle());
            stmt.setString(3, song.getArtist());
            stmt.setString(4, song.getAlbum());
            stmt.setDouble(5, song.getDurationSeconds());
            stmt.setInt(6, song.getPlayCount());
            stmt.executeUpdate();
        } catch (SQLException e) {
            logger.error("Failed to insert or update song: {}", song.getFilePath(), e);
            return null;
        }

        // Always read the row back by its unique path. getGeneratedKeys() is unreliable after an
        // upsert that updated an existing row (SQLite returns the last *inserted* rowid, which
        // would be some other song's id).
        Song stored = getSongByPath(song.getFilePath());
        if (stored == null) return null;
        song.setId(stored.getId());
        song.setPlayCount(stored.getPlayCount());
        return song;
    }

    /**
     * Retrieves all persisted songs ordered by title.
     */
    public List<Song> getAllSongs() {
        List<Song> songs = new ArrayList<>();
        String sql = "SELECT id, file_path, title, artist, album, duration_seconds, play_count FROM songs ORDER BY title ASC";

        try (Connection conn = dbManager.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                Song song = new Song(
                    rs.getInt("id"),
                    rs.getString("file_path"),
                    rs.getString("title"),
                    rs.getString("artist"),
                    rs.getString("album"),
                    rs.getDouble("duration_seconds"),
                    rs.getInt("play_count")
                );
                songs.add(song);
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch all songs", e);
        }
        return songs;
    }

    /**
     * Retrieves a song by its canonical file path.
     */
    public Song getSongByPath(String filePath) {
        String sql = "SELECT id, file_path, title, artist, album, duration_seconds, play_count FROM songs WHERE file_path = ?";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, filePath);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return new Song(
                        rs.getInt("id"),
                        rs.getString("file_path"),
                        rs.getString("title"),
                        rs.getString("artist"),
                        rs.getString("album"),
                        rs.getDouble("duration_seconds"),
                        rs.getInt("play_count")
                    );
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch song by path: {}", filePath, e);
        }
        return null;
    }

    /**
     * Increments the play count of a track when played.
     */
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

    // --- Playlist Operations ---

    /**
     * Creates a new playlist with the given unique name.
     */
    public synchronized int createPlaylist(String name) {
        String sql = "INSERT OR IGNORE INTO playlists (playlist_name) VALUES (?)";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            stmt.setString(1, name);
            int affected = stmt.executeUpdate();
            if (affected > 0) {
                try (ResultSet rs = stmt.getGeneratedKeys()) {
                    if (rs.next()) {
                        return rs.getInt(1);
                    }
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to create playlist: {}", name, e);
        }
        return -1;
    }

    /**
     * Retrieves all playlists including their associated songs.
     *
     * Bug fix (v1.1): collect playlist IDs/names first (closing the ResultSet /
     * Connection), then load songs for each playlist using separate connections.
     * The original code called getSongsForPlaylist() while the outer ResultSet
     * was still open on the same Connection, which caused
     * "stmt pointer is closed" errors in SQLite.
     */
    public List<Playlist> getAllPlaylists() {
        // Step 1: collect (id, name) pairs – fully close RS and Connection before step 2
        List<int[]>    ids   = new ArrayList<>();
        List<String>   names = new ArrayList<>();
        String sql = "SELECT playlist_id, playlist_name FROM playlists ORDER BY playlist_name ASC";

        try (Connection conn = dbManager.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {

            while (rs.next()) {
                ids.add(new int[]{ rs.getInt("playlist_id") });
                names.add(rs.getString("playlist_name"));
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch all playlists", e);
        }

        // Step 2: build Playlist objects, each using its own fresh Connection
        List<Playlist> playlists = new ArrayList<>();
        for (int i = 0; i < ids.size(); i++) {
            int pId = ids.get(i)[0];
            Playlist playlist = new Playlist(pId, names.get(i));
            playlist.getSongs().addAll(getSongsForPlaylist(pId));
            playlists.add(playlist);
        }
        return playlists;
    }

    /**
     * Adds a song to a playlist with a specified sort order.
     */
    public synchronized boolean addSongToPlaylist(int playlistId, int songId, int sortOrder) {
        String sql = "INSERT OR REPLACE INTO playlist_songs (playlist_id, song_id, sort_order) VALUES (?, ?, ?)";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, playlistId);
            stmt.setInt(2, songId);
            stmt.setInt(3, sortOrder);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Failed to add song ID {} to playlist ID {}", songId, playlistId, e);
            return false;
        }
    }

    /**
     * Removes a song from a playlist.
     */
    public synchronized boolean removeSongFromPlaylist(int playlistId, int songId) {
        String sql = "DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, playlistId);
            stmt.setInt(2, songId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Failed to remove song ID {} from playlist ID {}", songId, playlistId, e);
            return false;
        }
    }

    /**
     * Deletes a playlist by ID.
     */
    public synchronized boolean deletePlaylist(int playlistId) {
        String sql = "DELETE FROM playlists WHERE playlist_id = ?";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setInt(1, playlistId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            logger.error("Failed to delete playlist ID: {}", playlistId, e);
            return false;
        }
    }

    /**
     * Retrieves all songs assigned to a playlist ordered by sort_order.
     */
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
                    Song song = new Song(
                        rs.getInt("id"),
                        rs.getString("file_path"),
                        rs.getString("title"),
                        rs.getString("artist"),
                        rs.getString("album"),
                        rs.getDouble("duration_seconds"),
                        rs.getInt("play_count")
                    );
                    songs.add(song);
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to fetch songs for playlist ID: {}", playlistId, e);
        }
        return songs;
    }

    // --- User Settings Persistence ---

    /**
     * Saves a setting key/value pair.
     */
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

    /**
     * Retrieves a saved setting, returning defaultValue if not found.
     */
    public String getSetting(String key, String defaultValue) {
        String sql = "SELECT setting_value FROM user_settings WHERE setting_key = ?";
        try (Connection conn = dbManager.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {

            stmt.setString(1, key);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getString("setting_value");
                }
            }
        } catch (SQLException e) {
            logger.error("Failed to read setting key: {}", key, e);
        }
        return defaultValue;
    }
}
