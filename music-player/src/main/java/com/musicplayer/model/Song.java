package com.musicplayer.model;

import javafx.beans.property.*;
import javafx.scene.image.Image;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Objects;
import javax.imageio.ImageIO;

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
    private final ObjectProperty<Image> albumArt = new SimpleObjectProperty<>();

    private byte[] albumArtBytes;
    private int priority; // Dynamic weight for shuffle priority queue

    /**
     * Full constructor for database and metadata extraction instantiation.
     */
    public Song(int id, String filePath, String title, String artist, String album, double durationSeconds, int playCount) {
        this.id = new SimpleIntegerProperty(id);
        this.filePath = new SimpleStringProperty(filePath != null ? filePath : "");
        this.title = new SimpleStringProperty(title != null && !title.isBlank() ? title : "Unknown Title");
        this.artist = new SimpleStringProperty(artist != null && !artist.isBlank() ? artist : "Unknown Artist");
        this.album = new SimpleStringProperty(album != null && !album.isBlank() ? album : "Unknown Album");
        this.durationSeconds = new SimpleDoubleProperty(durationSeconds);
        this.playCount = new SimpleIntegerProperty(playCount);
        this.formattedDuration = new SimpleStringProperty(formatTime(durationSeconds));
        this.priority = 100 - Math.min(playCount * 5, 80); // Higher initial priority for lesser-played songs
    }

    /**
     * Convenience constructor for new files before database persistence.
     */
    public Song(String filePath, String title, String artist, String album, double durationSeconds) {
        this(0, filePath, title, artist, album, durationSeconds, 0);
    }

    // --- Property Getters for JavaFX TableView bindings ---

    public IntegerProperty idProperty() {
        return id;
    }

    public StringProperty filePathProperty() {
        return filePath;
    }

    public StringProperty titleProperty() {
        return title;
    }

    public StringProperty artistProperty() {
        return artist;
    }

    public StringProperty albumProperty() {
        return album;
    }

    public DoubleProperty durationSecondsProperty() {
        return durationSeconds;
    }

    public IntegerProperty playCountProperty() {
        return playCount;
    }

    public StringProperty formattedDurationProperty() {
        return formattedDuration;
    }

    // --- Standard Getters & Setters ---

    public int getId() {
        return id.get();
    }

    public void setId(int id) {
        this.id.set(id);
    }

    public String getFilePath() {
        return filePath.get();
    }

    public void setFilePath(String filePath) {
        this.filePath.set(filePath);
    }

    public String getTitle() {
        return title.get();
    }

    public void setTitle(String title) {
        this.title.set(title);
    }

    public String getArtist() {
        return artist.get();
    }

    public void setArtist(String artist) {
        this.artist.set(artist);
    }

    public String getAlbum() {
        return album.get();
    }

    public void setAlbum(String album) {
        this.album.set(album);
    }

    public double getDurationSeconds() {
        return durationSeconds.get();
    }

    public void setDurationSeconds(double durationSeconds) {
        this.durationSeconds.set(durationSeconds);
        this.formattedDuration.set(formatTime(durationSeconds));
    }

    public int getPlayCount() {
        return playCount.get();
    }

    public void setPlayCount(int playCount) {
        this.playCount.set(playCount);
        this.priority = 100 - Math.min(playCount * 5, 80); // same formula as the constructor
    }

    public void incrementPlayCount() {
        setPlayCount(getPlayCount() + 1);
    }

    public String getFormattedDuration() {
        return formattedDuration.get();
    }

    public ObjectProperty<Image> albumArtProperty() {
        return albumArt;
    }

    public byte[] getAlbumArtBytes() {
        return albumArtBytes;
    }

    public void setAlbumArtBytes(byte[] albumArtBytes) {
        this.albumArtBytes = albumArtBytes;
        this.albumArt.set(decodeAlbumArt(albumArtBytes));
    }

    public void setAlbumArtImage(Image image) {
        this.albumArt.set(image);
    }

    public Image getAlbumArtImage() {
        Image current = albumArt.get();
        if (current == null && albumArtBytes != null && albumArtBytes.length > 0) {
            current = decodeAlbumArt(albumArtBytes);
            albumArt.set(current);
        }
        return current;
    }

    /**
     * Decodes raw APIC cover bytes into a scaled JavaFX Image (safe on background threads).
     * Validates Image.isError() because JavaFX Image does not throw on unsupported color spaces;
     * falls back to ImageIO RGB conversion if needed.
     */
    public static Image decodeAlbumArt(byte[] bytes) {
        if (bytes == null || bytes.length == 0) return null;
        try {
            Image img = new Image(new ByteArrayInputStream(bytes), 240, 240, true, true);
            if (!img.isError() && img.getWidth() > 0 && img.getHeight() > 0) {
                return img;
            }
        } catch (Throwable ignored) { }

        // Fallback for CMYK JPEGs or formats ImageIO can transcode to RGB PNG
        try {
            BufferedImage src = ImageIO.read(new ByteArrayInputStream(bytes));
            if (src != null && src.getWidth() > 0 && src.getHeight() > 0) {
                BufferedImage rgb = new BufferedImage(src.getWidth(), src.getHeight(), BufferedImage.TYPE_INT_RGB);
                Graphics2D g = rgb.createGraphics();
                g.drawImage(src, 0, 0, null);
                g.dispose();
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                ImageIO.write(rgb, "png", out);
                Image converted = new Image(new ByteArrayInputStream(out.toByteArray()), 240, 240, true, true);
                if (!converted.isError() && converted.getWidth() > 0) return converted;
            }
        } catch (Throwable ignored) { }
        return null;
    }

    public int getPriority() {
        return priority;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }

    /**
     * Formats duration in seconds to standard mm:ss or hh:mm:ss format.
     */
    public static String formatTime(double seconds) {
        if (seconds <= 0 || Double.isNaN(seconds)) {
            return "00:00";
        }
        int totalSecs = (int) Math.round(seconds);
        int hours = totalSecs / 3600;
        int minutes = (totalSecs % 3600) / 60;
        int remainingSecs = totalSecs % 60;

        if (hours > 0) {
            return String.format("%d:%02d:%02d", hours, minutes, remainingSecs);
        } else {
            return String.format("%02d:%02d", minutes, remainingSecs);
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Song song = (Song) o;
        return Objects.equals(filePath.get(), song.filePath.get());
    }

    @Override
    public int hashCode() {
        return Objects.hash(filePath.get());
    }

    @Override
    public String toString() {
        return String.format("%s - %s (%s)", getArtist(), getTitle(), getFormattedDuration());
    }
}
