/**
 * TypeScript implementations mirroring the exact Java PlaybackQueue, ShufflePriorityQueue,
 * and HashMap structures for interactive visualization and client simulation.
 */

export interface TrackItem {
  id: number;
  filePath: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  playCount: number;
  priorityScore?: number;
  albumArtColor?: string;
  audioBlobUrl?: string;
}

export class DllNode<T> {
  data: T;
  prev: DllNode<T> | null = null;
  next: DllNode<T> | null = null;
  id: string;

  constructor(data: T) {
    this.data = data;
    this.id = Math.random().toString(36).substring(2, 9);
  }
}

export class SimulationPlaybackQueue {
  head: DllNode<TrackItem> | null = null;
  tail: DllNode<TrackItem> | null = null;
  currentNode: DllNode<TrackItem> | null = null;
  size = 0;
  pathIndex = new Map<string, DllNode<TrackItem>>();

  repeatAll = false;
  repeatOne = false;

  insertAtTail(song: TrackItem): DllNode<TrackItem> {
    if (this.pathIndex.has(song.filePath)) {
      return this.pathIndex.get(song.filePath)!;
    }

    const newNode = new DllNode(song);
    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;
      this.currentNode = newNode;
    } else {
      this.tail!.next = newNode;
      newNode.prev = this.tail;
      this.tail = newNode;
    }

    this.size++;
    this.pathIndex.set(song.filePath, newNode);
    return newNode;
  }

  insertAfterCurrent(song: TrackItem): DllNode<TrackItem> {
    if (!this.currentNode || this.currentNode === this.tail) {
      return this.insertAtTail(song);
    }

    const newNode = new DllNode(song);
    const nextNode = this.currentNode.next;

    this.currentNode.next = newNode;
    newNode.prev = this.currentNode;
    newNode.next = nextNode;
    if (nextNode) {
      nextNode.prev = newNode;
    }

    this.size++;
    this.pathIndex.set(song.filePath, newNode);
    return newNode;
  }

  removeNode(node: DllNode<TrackItem>): boolean {
    if (this.size === 0) return false;

    if (node === this.head && node === this.tail) {
      this.head = null;
      this.tail = null;
      this.currentNode = null;
    } else if (node === this.head) {
      this.head = this.head.next;
      if (this.head) this.head.prev = null;
      if (this.currentNode === node) this.currentNode = this.head;
    } else if (node === this.tail) {
      this.tail = this.tail.prev;
      if (this.tail) this.tail.next = null;
      if (this.currentNode === node) this.currentNode = this.tail;
    } else {
      if (node.prev) node.prev.next = node.next;
      if (node.next) node.next.prev = node.prev;
      if (this.currentNode === node) this.currentNode = node.next;
    }

    this.pathIndex.delete(node.data.filePath);
    node.prev = null;
    node.next = null;
    this.size--;
    return true;
  }

  getNext(): TrackItem | null {
    if (!this.currentNode) {
      this.currentNode = this.head;
      return this.currentNode ? this.currentNode.data : null;
    }
    if (this.repeatOne) return this.currentNode.data;

    if (this.currentNode.next) {
      this.currentNode = this.currentNode.next;
      return this.currentNode.data;
    } else if (this.repeatAll && this.head) {
      this.currentNode = this.head;
      return this.currentNode.data;
    }
    return null;
  }

  getPrevious(): TrackItem | null {
    if (!this.currentNode) {
      this.currentNode = this.tail;
      return this.currentNode ? this.currentNode.data : null;
    }
    if (this.repeatOne) return this.currentNode.data;

    if (this.currentNode.prev) {
      this.currentNode = this.currentNode.prev;
      return this.currentNode.data;
    } else if (this.repeatAll && this.tail) {
      this.currentNode = this.tail;
      return this.currentNode.data;
    }
    return null;
  }

  setCurrentByPath(filePath: string): boolean {
    const node = this.pathIndex.get(filePath);
    if (node) {
      this.currentNode = node;
      return true;
    }
    return false;
  }

  toList(): TrackItem[] {
    const list: TrackItem[] = [];
    let curr = this.head;
    while (curr) {
      list.push(curr.data);
      curr = curr.next;
    }
    return list;
  }

  toNodeList(): DllNode<TrackItem>[] {
    const list: DllNode<TrackItem>[] = [];
    let curr = this.head;
    while (curr) {
      list.push(curr);
      curr = curr.next;
    }
    return list;
  }

  clear() {
    this.head = null;
    this.tail = null;
    this.currentNode = null;
    this.size = 0;
    this.pathIndex.clear();
  }
}

export interface HeapItem {
  song: TrackItem;
  score: number;
}

export class SimulationPriorityQueue {
  heap: HeapItem[] = [];

  insert(song: TrackItem): number {
    const baseWeight = 100.0 / (1.0 + song.playCount * 0.5);
    const jitter = Math.random() * 60.0;
    const totalScore = parseFloat((baseWeight + jitter + (song.priorityScore ?? 50)).toFixed(2));

    this.heap.push({ song, score: totalScore });
    this.siftUp(this.heap.length - 1);
    return totalScore;
  }

  rebuild(songs: TrackItem[]) {
    this.heap = [];
    for (const song of songs) {
      this.insert(song);
    }
  }

  pollNext(): TrackItem | null {
    if (this.heap.length === 0) return null;
    const top = this.heap[0].song;
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  peek(): TrackItem | null {
    return this.heap.length > 0 ? this.heap[0].song : null;
  }

  private siftUp(index: number) {
    let curr = index;
    while (curr > 0) {
      const parent = Math.floor((curr - 1) / 2);
      if (this.heap[curr].score > this.heap[parent].score) {
        this.swap(curr, parent);
        curr = parent;
      } else {
        break;
      }
    }
  }

  private siftDown(index: number) {
    let curr = index;
    const length = this.heap.length;
    while (true) {
      const left = 2 * curr + 1;
      const right = 2 * curr + 2;
      let highest = curr;

      if (left < length && this.heap[left].score > this.heap[highest].score) {
        highest = left;
      }
      if (right < length && this.heap[right].score > this.heap[highest].score) {
        highest = right;
      }

      if (highest !== curr) {
        this.swap(curr, highest);
        curr = highest;
      } else {
        break;
      }
    }
  }

  private swap(i: number, j: number) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  clear() {
    this.heap = [];
  }
}

export const INITIAL_TRACKS: TrackItem[] = [
  {
    id: 1,
    filePath: 'C:\\Music\\Resonance - Home.mp3',
    title: 'Resonance',
    artist: 'HOME',
    album: 'Odyssey',
    durationSeconds: 212,
    playCount: 14,
    albumArtColor: 'from-amber-500 to-indigo-600',
  },
  {
    id: 2,
    filePath: 'C:\\Music\\Midnight City - M83.mp3',
    title: 'Midnight City',
    artist: 'M83',
    album: 'Hurry Up, We\'re Dreaming',
    durationSeconds: 243,
    playCount: 8,
    albumArtColor: 'from-blue-600 to-purple-800',
  },
  {
    id: 3,
    filePath: 'C:\\Music\\Pacific Coast - Tycho.mp3',
    title: 'Pacific Coast Highway',
    artist: 'Tycho',
    album: 'Dive',
    durationSeconds: 265,
    playCount: 22,
    albumArtColor: 'from-rose-500 to-orange-400',
  },
  {
    id: 4,
    filePath: 'C:\\Music\\Sun Models - ODESZA.wav',
    title: 'Sun Models',
    artist: 'ODESZA feat. Madelyn Grant',
    album: 'In Return',
    durationSeconds: 160,
    playCount: 3,
    albumArtColor: 'from-emerald-500 to-cyan-600',
  },
  {
    id: 5,
    filePath: 'C:\\Music\\Days to Come - Bonobo.mp3',
    title: 'Days To Come',
    artist: 'Bonobo feat. Bajka',
    album: 'Days to Come',
    durationSeconds: 231,
    playCount: 5,
    albumArtColor: 'from-fuchsia-600 to-slate-900',
  },
  {
    id: 6,
    filePath: 'C:\\Music\\A Walk - Tycho.mp3',
    title: 'A Walk',
    artist: 'Tycho',
    album: 'Dive',
    durationSeconds: 316,
    playCount: 19,
    albumArtColor: 'from-teal-600 to-blue-900',
  },
  {
    id: 7,
    filePath: 'C:\\Music\\Nightcall - Kavinsky.mp3',
    title: 'Nightcall',
    artist: 'Kavinsky',
    album: 'OutRun',
    durationSeconds: 259,
    playCount: 1,
    albumArtColor: 'from-red-600 to-zinc-950',
  }
];
