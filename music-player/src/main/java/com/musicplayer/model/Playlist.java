package com.musicplayer.model;

import javafx.beans.property.IntegerProperty;
import javafx.beans.property.SimpleIntegerProperty;
import javafx.beans.property.SimpleStringProperty;
import javafx.beans.property.StringProperty;
import javafx.collections.FXCollections;
import javafx.collections.ObservableList;

/**
 * Model class representing a user playlist.
 * Maintains an ObservableList of songs for dynamic UI binding.
 */
public class Playlist {

    private final IntegerProperty id;
    private final StringProperty name;
    private final ObservableList<Song> songs;

    public Playlist(int id, String name) {
        this.id = new SimpleIntegerProperty(id);
        this.name = new SimpleStringProperty(name != null ? name : "Untitled Playlist");
        this.songs = FXCollections.observableArrayList();
    }

    public Playlist(String name) {
        this(0, name);
    }

    // --- Property Getters ---

    public IntegerProperty idProperty() {
        return id;
    }

    public StringProperty nameProperty() {
        return name;
    }

    // --- Getters & Setters ---

    public int getId() {
        return id.get();
    }

    public void setId(int id) {
        this.id.set(id);
    }

    public String getName() {
        return name.get();
    }

    public void setName(String name) {
        this.name.set(name);
    }

    public ObservableList<Song> getSongs() {
        return songs;
    }

    public void addSong(Song song) {
        if (song != null && !songs.contains(song)) {
            songs.add(song);
        }
    }

    public void removeSong(Song song) {
        songs.remove(song);
    }

    public void clear() {
        songs.clear();
    }

    public int getSongCount() {
        return songs.size();
    }

    public double getTotalDurationSeconds() {
        return songs.stream().mapToDouble(Song::getDurationSeconds).sum();
    }

    public String getFormattedTotalDuration() {
        return Song.formatTime(getTotalDurationSeconds());
    }

    @Override
    public String toString() {
        return getName() + " (" + getSongCount() + " tracks)";
    }
}
