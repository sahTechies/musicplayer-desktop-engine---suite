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
