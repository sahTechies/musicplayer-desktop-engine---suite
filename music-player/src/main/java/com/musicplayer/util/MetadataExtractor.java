package com.musicplayer.util;

import com.musicplayer.model.Song;
import org.jaudiotagger.audio.AudioFile;
import org.jaudiotagger.audio.AudioFileIO;
import org.jaudiotagger.audio.AudioHeader;
import org.jaudiotagger.tag.FieldKey;
import org.jaudiotagger.tag.Tag;
import org.jaudiotagger.tag.images.Artwork;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * High-performance ID3 tag metadata extraction utility using jaudiotagger
 * with resilient filename heuristic fallback and asynchronous thread-pool offloading.
 */
public class MetadataExtractor {

    private static final Logger logger = LoggerFactory.getLogger(MetadataExtractor.class);

    // Thread pool dedicated to background metadata extraction
    private static final ExecutorService metadataExecutor = Executors.newFixedThreadPool(
        Math.max(2, Runtime.getRuntime().availableProcessors() - 1),
        r -> {
            Thread t = new Thread(r, "MetadataExtractor-Worker");
            t.setDaemon(true);
            return t;
        }
    );

    /**
     * Synchronously extracts metadata from an audio file.
     * Safely catches any Jaudiotagger / I/O errors and falls back to filename heuristics.
     */
    public static Song extractMetadata(File file) {
        if (file == null || !file.exists() || !file.canRead()) {
            return null;
        }

        String filePath = file.getAbsolutePath();
        String defaultTitle = getFallbackTitle(file);
        String defaultArtist = "Unknown Artist";
        String defaultAlbum = "Unknown Album";
        double durationSeconds = 0.0;
        byte[] artworkBytes = null;

        try {
            AudioFile audioFile = AudioFileIO.read(file);
            AudioHeader header = audioFile.getAudioHeader();
            if (header != null) {
                durationSeconds = header.getTrackLength();
            }

            Tag tag = audioFile.getTag();
            if (tag != null) {
                String title = tag.getFirst(FieldKey.TITLE);
                String artist = tag.getFirst(FieldKey.ARTIST);
                String album = tag.getFirst(FieldKey.ALBUM);

                if (title != null && !title.isBlank()) {
                    defaultTitle = title.trim();
                }
                if (artist != null && !artist.isBlank()) {
                    defaultArtist = artist.trim();
                }
                if (album != null && !album.isBlank()) {
                    defaultAlbum = album.trim();
                }

                Artwork artwork = tag.getFirstArtwork();
                if (artwork != null) {
                    artworkBytes = artwork.getBinaryData();
                }
            } else {
                // Parse "Artist - Title" heuristic from filename
                String[] parsed = parseFilenameHeuristic(file.getName());
                if (parsed != null) {
                    defaultArtist = parsed[0];
                    defaultTitle = parsed[1];
                }
            }
        } catch (Exception e) {
            logger.warn("ID3 tag extraction failed for '{}', falling back to filename heuristics: {}",
                file.getName(), e.getMessage());
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

    /**
     * Reads only the embedded APIC / cover-art bytes from an audio file without building a Song.
     */
    public static byte[] extractArtworkBytes(File file) {
        if (file == null || !file.exists() || !file.canRead()) return null;
        try {
            AudioFile audioFile = AudioFileIO.read(file);
            Tag tag = audioFile.getTag();
            if (tag != null) {
                Artwork artwork = tag.getFirstArtwork();
                if (artwork != null) {
                    byte[] data = artwork.getBinaryData();
                    if (data != null && data.length > 0) return data;
                }
            }
        } catch (Exception e) {
            logger.debug("No readable artwork in '{}': {}", file.getName(), e.getMessage());
        }
        return null;
    }

    /** Submits a background artwork-loading task to the dedicated daemon worker pool. */
    public static void submitArtworkTask(Runnable task) {
        if (!metadataExecutor.isShutdown()) {
            metadataExecutor.submit(task);
        }
    }

    /**
     * Extracts a clean fallback title from a file's name without its extension.
     */
    private static String getFallbackTitle(File file) {
        String name = file.getName();
        int dotIdx = name.lastIndexOf('.');
        if (dotIdx > 0) {
            return name.substring(0, dotIdx).replace('_', ' ').trim();
        }
        return name;
    }

    /**
     * Parses standard "Artist - Title" patterns from filename.
     */
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

    /**
     * Shuts down the background thread pool when the application exits.
     */
    public static void shutdown() {
        metadataExecutor.shutdown();
    }
}
