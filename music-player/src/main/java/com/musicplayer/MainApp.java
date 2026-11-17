package com.musicplayer;

import com.musicplayer.controller.PlayerController;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.paint.Color;
import javafx.stage.Stage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URL;

/**
 * Main application launcher for the MusicPlayer desktop client.
 * Configures the primary stage, loads Scene Builder FXML views,
 * registers clean shutdown hooks, and handles global uncaught exceptions.
 */
public class MainApp extends Application {

    private static final Logger logger = LoggerFactory.getLogger(MainApp.class);
    private PlayerController controller;

    @Override
    public void start(Stage primaryStage) {
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            logger.error("Uncaught exception on thread: " + thread.getName(), throwable);
        });

        try {
            URL fxmlUrl = getClass().getResource("/fxml/PlayerView.fxml");
            if (fxmlUrl == null) {
                throw new IllegalStateException("Cannot find /fxml/PlayerView.fxml on classpath.");
            }

            FXMLLoader loader = new FXMLLoader(fxmlUrl);
            Parent root = loader.load();
            this.controller = loader.getController();

            Scene scene = new Scene(root, 1200, 780);
            scene.setFill(Color.web("#0f1117"));

            URL cssUrl = getClass().getResource("/css/styles.css");
            if (cssUrl != null) {
                scene.getStylesheets().add(cssUrl.toExternalForm());
            }

            primaryStage.setTitle("MusicPlayer — Windows Audio Engine");
            primaryStage.setMinWidth(960);
            primaryStage.setMinHeight(640);
            primaryStage.setScene(scene);

            // Shutdown hook to gracefully close threads and SQLite DB
            primaryStage.setOnCloseRequest(event -> {
                logger.info("Application closing, executing shutdown sequence...");
                if (controller != null) {
                    controller.cleanup();
                }
                Platform.exit();
                System.exit(0);
            });

            primaryStage.show();
            logger.info("MusicPlayer initialized and window displayed successfully.");

        } catch (Exception e) {
            logger.error("Fatal startup error in MainApp", e);
            Platform.exit();
        }
    }

    public static void main(String[] args) {
        launch(args);
    }
}
