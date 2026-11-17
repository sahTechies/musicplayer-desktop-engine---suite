package com.musicplayer.engine;

import com.musicplayer.model.Song;

import java.util.*;

/**
 * Priority Queue data structure managing dynamic shuffle modes and weighted playback.
 * Implements a binary Max-Heap where tracks with higher dynamic priority (e.g. lesser-played
 * tracks or user-favored tracks with randomized jitter) are served first, eliminating repetitive
 * shuffle sequences and providing algorithmic diversity.
 */
public class ShufflePriorityQueue {

    /**
     * Entry wrapper associating a Song with an ephemeral priority score.
     */
    public static class QueueEntry implements Comparable<QueueEntry> {
        public final Song song;
        public double priorityScore;

        public QueueEntry(Song song, double priorityScore) {
            this.song = song;
            this.priorityScore = priorityScore;
        }

        @Override
        public int compareTo(QueueEntry other) {
            // Higher score = higher priority
            return Double.compare(other.priorityScore, this.priorityScore);
        }

        @Override
        public String toString() {
            return String.format("[%s - Priority: %.2f]", song.getTitle(), priorityScore);
        }
    }

    private final List<QueueEntry> heap;
    private final Random random;

    public ShufflePriorityQueue() {
        this.heap = new ArrayList<>();
        this.random = new Random();
    }

    /**
     * Inserts a song into the heap with a dynamic weighted priority score.
     * Complexity: O(log N)
     */
    public synchronized void insert(Song song) {
        if (song == null) return;

        // Weighting algorithm:
        // Priority inversely proportional to play count + high entropy random factor
        // score = (100.0 / (1 + playCount * 0.5)) + (random * 60.0) + song.getPriority()
        double baseWeight = 100.0 / (1.0 + song.getPlayCount() * 0.5);
        double jitter = random.nextDouble() * 60.0;
        double totalScore = baseWeight + jitter + song.getPriority();

        QueueEntry entry = new QueueEntry(song, totalScore);
        heap.add(entry);
        siftUp(heap.size() - 1);
    }

    /**
     * Rebuilds the priority queue from an arbitrary list of songs, resetting shuffle weights.
     * Complexity: O(N log N)
     */
    public synchronized void rebuild(List<Song> songs) {
        heap.clear();
        if (songs == null) return;
        for (Song song : songs) {
            insert(song);
        }
    }

    /**
     * Retrieves and extracts the highest priority song for next playback.
     * Complexity: O(log N)
     */
    public synchronized Song pollNext() {
        if (heap.isEmpty()) {
            return null;
        }

        Song topSong = heap.get(0).song;

        // Swap top with last element
        QueueEntry last = heap.remove(heap.size() - 1);
        if (!heap.isEmpty()) {
            heap.set(0, last);
            siftDown(0);
        }

        return topSong;
    }

    public synchronized int size() {
        return heap.size();
    }

    public synchronized boolean isEmpty() {
        return heap.isEmpty();
    }

    public synchronized void clear() {
        heap.clear();
    }

    // --- Heap Maintenance Operations ---

    private void siftUp(int index) {
        int current = index;
        while (current > 0) {
            int parent = (current - 1) / 2;
            if (heap.get(current).compareTo(heap.get(parent)) < 0) {
                // Current has higher priority than parent
                swap(current, parent);
                current = parent;
            } else {
                break;
            }
        }
    }

    private void siftDown(int index) {
        int current = index;
        int size = heap.size();

        while (true) {
            int left = 2 * current + 1;
            int right = 2 * current + 2;
            int highestPriority = current;

            if (left < size && heap.get(left).compareTo(heap.get(highestPriority)) < 0) {
                highestPriority = left;
            }

            if (right < size && heap.get(right).compareTo(heap.get(highestPriority)) < 0) {
                highestPriority = right;
            }

            if (highestPriority != current) {
                swap(current, highestPriority);
                current = highestPriority;
            } else {
                break;
            }
        }
    }

    private void swap(int i, int j) {
        QueueEntry temp = heap.get(i);
        heap.set(i, heap.get(j));
        heap.set(j, temp);
    }
}
