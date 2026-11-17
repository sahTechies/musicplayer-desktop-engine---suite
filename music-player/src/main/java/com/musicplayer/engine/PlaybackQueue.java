package com.musicplayer.engine;

import com.musicplayer.model.Song;

import java.util.*;

/**
 * Custom doubly linked list playback queue.
 *  - O(1) next / previous traversal
 *  - O(1) append, O(1) "play next" insertion, O(1) removal
 *  - HashMap index (file path -> node) for O(1) lookup and duplicate prevention
 *
 * Repeat-one is handled by the controller; this class only knows about repeat-all (wrap-around).
 */
public class PlaybackQueue {

    /** Doubly linked list node holding a Song and bidirectional pointers. */
    public static class LinkedListNode<T> {
        public T data;
        public LinkedListNode<T> prev;
        public LinkedListNode<T> next;

        public LinkedListNode(T data) {
            this.data = data;
        }
    }

    private LinkedListNode<Song> head;
    private LinkedListNode<Song> tail;
    private LinkedListNode<Song> currentNode;
    private int size;

    private final Map<String, LinkedListNode<Song>> pathIndex = new HashMap<>();

    private boolean repeatAll = false;

    /** Appends a song to the tail in O(1). Songs already in the queue are ignored. */
    public synchronized LinkedListNode<Song> insertAtTail(Song song) {
        if (song == null) return null;

        LinkedListNode<Song> existing = pathIndex.get(song.getFilePath());
        if (existing != null) return existing;

        LinkedListNode<Song> node = new LinkedListNode<>(song);
        if (head == null) {
            head = tail = currentNode = node;
        } else {
            tail.next = node;
            node.prev = tail;
            tail = node;
        }
        size++;
        pathIndex.put(song.getFilePath(), node);
        return node;
    }

    /**
     * Inserts a song directly after the current node in O(1) ("Play Next").
     * If the song is already queued it is moved rather than duplicated.
     */
    public synchronized LinkedListNode<Song> insertAfterCurrent(Song song) {
        if (song == null) return null;
        if (currentNode == null) return insertAtTail(song);

        LinkedListNode<Song> existing = pathIndex.get(song.getFilePath());
        if (existing == currentNode) return existing; // already playing
        if (existing != null) removeNode(existing);

        LinkedListNode<Song> node = new LinkedListNode<>(song);
        LinkedListNode<Song> after = currentNode.next;

        currentNode.next = node;
        node.prev = currentNode;
        node.next = after;
        if (after != null) {
            after.prev = node;
        } else {
            tail = node;
        }
        size++;
        pathIndex.put(song.getFilePath(), node);
        return node;
    }

    /** Unlinks an arbitrary node in O(1). */
    public synchronized boolean removeNode(LinkedListNode<Song> node) {
        if (node == null || size == 0) return false;

        if (node.prev != null) node.prev.next = node.next; else head = node.next;
        if (node.next != null) node.next.prev = node.prev; else tail = node.prev;

        if (currentNode == node) {
            currentNode = node.next != null ? node.next : node.prev;
        }
        if (node.data != null) pathIndex.remove(node.data.getFilePath());

        node.prev = null;
        node.next = null;
        size--;
        return true;
    }

    /** Advances to the next track in O(1); wraps to the head when repeat-all is on. */
    public synchronized Song getNext() {
        if (currentNode == null) {
            currentNode = head;
            return currentNode != null ? currentNode.data : null;
        }
        if (currentNode.next != null) {
            currentNode = currentNode.next;
            return currentNode.data;
        }
        if (repeatAll && head != null) {
            currentNode = head;
            return currentNode.data;
        }
        return null;
    }

    /** Steps back to the previous track in O(1); wraps to the tail when repeat-all is on. */
    public synchronized Song getPrevious() {
        if (currentNode == null) {
            currentNode = tail;
            return currentNode != null ? currentNode.data : null;
        }
        if (currentNode.prev != null) {
            currentNode = currentNode.prev;
            return currentNode.data;
        }
        if (repeatAll && tail != null) {
            currentNode = tail;
            return currentNode.data;
        }
        return null;
    }

    public synchronized Song getCurrent() {
        return currentNode != null ? currentNode.data : null;
    }

    /** Moves the current pointer to the given song via the O(1) hash lookup. */
    public synchronized boolean setCurrentSong(Song song) {
        if (song == null) return false;
        LinkedListNode<Song> node = pathIndex.get(song.getFilePath());
        if (node == null) return false;
        currentNode = node;
        return true;
    }

    public synchronized void clear() {
        head = tail = currentNode = null;
        size = 0;
        pathIndex.clear();
    }

    public synchronized int size() {
        return size;
    }

    public synchronized boolean isEmpty() {
        return size == 0;
    }

    public synchronized void setRepeatAll(boolean repeatAll) {
        this.repeatAll = repeatAll;
    }

    /** Ordered snapshot of all songs in the queue. */
    public synchronized List<Song> toList() {
        List<Song> list = new ArrayList<>(size);
        for (LinkedListNode<Song> n = head; n != null; n = n.next) {
            list.add(n.data);
        }
        return list;
    }

    /** Replaces the queue contents with the given songs. */
    public synchronized void loadPlaylist(List<Song> songs) {
        clear();
        if (songs != null) {
            for (Song song : songs) insertAtTail(song);
        }
    }
}
