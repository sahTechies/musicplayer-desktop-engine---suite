package com.musicplayer.engine;

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
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Consumer;

/**
 * Robust multithreaded audio playback engine utilizing JavaFX Media.
 * Offloads media buffer creation to background worker threads, manages MediaPlayer lifecycle,
 * avoids memory leaks through strict disposal protocols, and handles bidirectional scrub seeking.
 */
public class AudioEngine {

    private static final Logger logger = LoggerFactory.getLogger(AudioEngine.class);

    public enum PlaybackState {
        STOPPED,
        PLAYING,
        PAUSED,
        LOADING,
        ERROR
    }

    private MediaPlayer mediaPlayer;
    private Song currentSong;

    // Observable properties for UI synchronization
    private final ObjectProperty<PlaybackState> playbackState;
    private final DoubleProperty currentPositionSeconds;
    private final DoubleProperty totalDurationSeconds;
    private final DoubleProperty volume;
    private final BooleanProperty muted;

    // Callbacks
    private Runnable onEndOfMediaCallback;
    private Consumer<Throwable> onErrorCallback;

    // Background executor for media loading to guarantee zero UI latency
    private final ExecutorService mediaLoadingExecutor;
    private final AtomicLong loadToken = new AtomicLong();

    public AudioEngine() {
        this.playbackState = new SimpleObjectProperty<>(PlaybackState.STOPPED);
        this.currentPositionSeconds = new SimpleDoubleProperty(0.0);
        this.totalDurationSeconds = new SimpleDoubleProperty(0.0);
        this.volume = new SimpleDoubleProperty(0.8);
        this.muted = new SimpleBooleanProperty(false);

        this.mediaLoadingExecutor = Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "AudioEngine-MediaLoader");
            t.setDaemon(true);
            return t;
        });

        // Volume listener
        this.volume.addListener((obs, oldVal, newVal) -> {
            if (mediaPlayer != null) {
                mediaPlayer.setVolume(newVal.doubleValue());
            }
        });

        this.muted.addListener((obs, oldVal, newVal) -> {
            if (mediaPlayer != null) {
                mediaPlayer.setMute(newVal);
            }
        });
    }

    /**
     * Loads and immediately begins playing the specified song asynchronously.
     */
    public synchronized void play(Song song) {
        if (song == null) return;

        // If already playing this song and paused, simply resume
        if (currentSong != null && currentSong.equals(song) && mediaPlayer != null) {
            if (playbackState.get() == PlaybackState.PAUSED) {
                resume();
                return;
            }
        }

        this.currentSong = song;
        setPlaybackState(PlaybackState.LOADING);

        // Token guards against a slow earlier load finishing after a newer song was requested.
        final long token = loadToken.incrementAndGet();

        mediaLoadingExecutor.submit(() -> {
            try {
                File file = new File(song.getFilePath());
                if (!file.exists()) {
                    throw new IllegalArgumentException("Audio file not found: " + song.getFilePath());
                }

                Media media = new Media(file.toURI().toString());

                // Instantiate MediaPlayer on JavaFX application thread
                Platform.runLater(() -> {
                    if (token == loadToken.get()) initMediaPlayer(media, song);
                });
            } catch (Exception ex) {
                logger.error("Failed to load audio media for song: {}", song.getTitle(), ex);
                Platform.runLater(() -> {
                    if (token != loadToken.get()) return;
                    setPlaybackState(PlaybackState.ERROR);
                    if (onErrorCallback != null) {
                        onErrorCallback.accept(ex);
                    }
                });
            }
        });
    }

    private void initMediaPlayer(Media media, Song song) {
        // Dispose existing player safely
        disposeCurrentPlayer();

        try {
            mediaPlayer = new MediaPlayer(media);
            mediaPlayer.setVolume(volume.get());
            mediaPlayer.setMute(muted.get());

            // Track time change listener
            mediaPlayer.currentTimeProperty().addListener((obs, oldTime, newTime) -> {
                if (newTime != null) {
                    currentPositionSeconds.set(newTime.toSeconds());
                }
            });

            // Ready handler
            mediaPlayer.setOnReady(() -> {
                Duration mediaDuration = mediaPlayer.getTotalDuration();
                if (mediaDuration != null && !mediaDuration.isUnknown()) {
                    totalDurationSeconds.set(mediaDuration.toSeconds());
                    if (song.getDurationSeconds() <= 0) {
                        song.setDurationSeconds(mediaDuration.toSeconds());
                    }
                }
                mediaPlayer.play();
                setPlaybackState(PlaybackState.PLAYING);
            });

            // End of media auto-advance handler
            mediaPlayer.setOnEndOfMedia(() -> {
                setPlaybackState(PlaybackState.STOPPED);
                currentPositionSeconds.set(0.0);
                if (onEndOfMediaCallback != null) {
                    onEndOfMediaCallback.run();
                }
            });

            // Error handler
            mediaPlayer.setOnError(() -> {
                Throwable err = mediaPlayer.getError();
                logger.error("MediaPlayer internal error on track: {}", song.getTitle(), err);
                setPlaybackState(PlaybackState.ERROR);
                if (onErrorCallback != null) {
                    onErrorCallback.accept(err);
                }
            });

        } catch (Exception ex) {
            logger.error("Failed to initialize JavaFX MediaPlayer", ex);
            setPlaybackState(PlaybackState.ERROR);
            if (onErrorCallback != null) {
                onErrorCallback.accept(ex);
            }
        }
    }

    /**
     * Resumes playback if currently paused.
     */
    public synchronized void resume() {
        if (mediaPlayer != null && playbackState.get() == PlaybackState.PAUSED) {
            mediaPlayer.play();
            setPlaybackState(PlaybackState.PLAYING);
        }
    }

    /**
     * Pauses active playback.
     */
    public synchronized void pause() {
        if (mediaPlayer != null && playbackState.get() == PlaybackState.PLAYING) {
            mediaPlayer.pause();
            setPlaybackState(PlaybackState.PAUSED);
        }
    }

    /**
     * Toggles between play and pause.
     */
    public synchronized void togglePlayPause() {
        if (playbackState.get() == PlaybackState.PLAYING) {
            pause();
        } else if (playbackState.get() == PlaybackState.PAUSED) {
            resume();
        } else if (currentSong != null) {
            play(currentSong);
        }
    }

    /**
     * Stops playback and resets playhead.
     */
    public synchronized void stop() {
        if (mediaPlayer != null) {
            mediaPlayer.stop();
            currentPositionSeconds.set(0.0);
            setPlaybackState(PlaybackState.STOPPED);
        }
    }

    /**
     * Seeks to a specific timestamp in seconds.
     */
    public synchronized void seek(double seconds) {
        if (mediaPlayer != null) {
            double clamped = Math.max(0.0, Math.min(seconds, totalDurationSeconds.get()));
            mediaPlayer.seek(Duration.seconds(clamped));
            currentPositionSeconds.set(clamped);
        }
    }

    /**
     * Safely releases native media buffers and listeners to prevent memory leaks on Windows.
     */
    private void disposeCurrentPlayer() {
        if (mediaPlayer != null) {
            try {
                mediaPlayer.stop();
                mediaPlayer.dispose();
            } catch (Exception e) {
                logger.warn("Warning disposing MediaPlayer", e);
            }
            mediaPlayer = null;
        }
    }

    private void setPlaybackState(PlaybackState state) {
        Platform.runLater(() -> this.playbackState.set(state));
    }

    // --- Observable Properties & Getters ---

    public ReadOnlyObjectProperty<PlaybackState> playbackStateProperty() {
        return playbackState;
    }

    public PlaybackState getPlaybackState() {
        return playbackState.get();
    }

    public ReadOnlyDoubleProperty currentPositionSecondsProperty() {
        return currentPositionSeconds;
    }

    public double getCurrentPositionSeconds() {
        return currentPositionSeconds.get();
    }

    public ReadOnlyDoubleProperty totalDurationSecondsProperty() {
        return totalDurationSeconds;
    }

    public double getTotalDurationSeconds() {
        return totalDurationSeconds.get();
    }

    public DoubleProperty volumeProperty() {
        return volume;
    }

    public double getVolume() {
        return volume.get();
    }

    public void setVolume(double vol) {
        this.volume.set(Math.max(0.0, Math.min(1.0, vol)));
    }

    public BooleanProperty mutedProperty() {
        return muted;
    }

    public boolean isMuted() {
        return muted.get();
    }

    public void setMuted(boolean mute) {
        this.muted.set(mute);
    }

    public Song getCurrentSong() {
        return currentSong;
    }

    public void setOnEndOfMedia(Runnable callback) {
        this.onEndOfMediaCallback = callback;
    }

    public void setOnError(Consumer<Throwable> callback) {
        this.onErrorCallback = callback;
    }

    /**
     * Shuts down all background media threads.
     */
    public void shutdown() {
        disposeCurrentPlayer();
        mediaLoadingExecutor.shutdown();
    }
}
