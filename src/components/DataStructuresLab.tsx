import React, { useState } from 'react';
import {
  GitCommit,
  Layers,
  Search,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  TrackItem,
  SimulationPlaybackQueue,
  SimulationPriorityQueue,
  DllNode
} from '../utils/dataStructures';

interface DataStructuresLabProps {
  playbackQueue: SimulationPlaybackQueue;
  priorityQueue: SimulationPriorityQueue;
  allTracks: TrackItem[];
  onQueueModified: () => void;
}

export const DataStructuresLab: React.FC<DataStructuresLabProps> = ({
  playbackQueue,
  priorityQueue,
  allTracks,
  onQueueModified,
}) => {
  const [activeTab, setActiveTab] = useState<'dll' | 'pq' | 'hash'>('dll');
  const [lookupQuery, setLookupQuery] = useState(allTracks[0]?.filePath || '');
  const [lookupResult, setLookupResult] = useState<TrackItem | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastAction, setLastAction] = useState<string>('Initialized data structures.');

  // DLL actions
  const handleStepNext = () => {
    const next = playbackQueue.getNext();
    setLastAction(next ? `Advanced O(1) to next track: "${next.title}"` : 'Reached end of queue.');
    onQueueModified();
  };

  const handleStepPrev = () => {
    const prev = playbackQueue.getPrevious();
    setLastAction(prev ? `Stepped back O(1) to previous track: "${prev.title}"` : 'Reached start of queue.');
    onQueueModified();
  };

  const handleInsertTail = () => {
    const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
    const uniquePath = `C:\\Music\\Track_${Date.now().toString().slice(-4)}.mp3`;
    const newTrack: TrackItem = {
      ...randomTrack,
      id: Date.now() % 10000,
      filePath: uniquePath,
      title: `${randomTrack.title} (Clone ${Math.floor(Math.random() * 99)})`,
    };
    playbackQueue.insertAtTail(newTrack);
    setLastAction(`Inserted node at tail in O(1): "${newTrack.title}"`);
    onQueueModified();
  };

  const handleInsertAfterCurrent = () => {
    const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
    const uniquePath = `C:\\Music\\Next_${Date.now().toString().slice(-4)}.mp3`;
    const newTrack: TrackItem = {
      ...randomTrack,
      id: Date.now() % 10000,
      filePath: uniquePath,
      title: `${randomTrack.title} (Play Next)`,
    };
    playbackQueue.insertAfterCurrent(newTrack);
    setLastAction(`Inserted node after current in O(1): "${newTrack.title}"`);
    onQueueModified();
  };

  const handleDeleteNode = (node: DllNode<TrackItem>) => {
    playbackQueue.removeNode(node);
    setLastAction(`Removed node "${node.data.title}" in O(1) without array re-indexing.`);
    onQueueModified();
  };

  // Priority Queue actions
  const handlePollPriority = () => {
    const song = priorityQueue.pollNext();
    setLastAction(song ? `Polled top priority track (O(log N)): "${song.title}"` : 'Heap is empty.');
    onQueueModified();
  };

  const handleRebuildHeap = () => {
    priorityQueue.rebuild(allTracks);
    setLastAction(`Rebuilt binary max-heap with ${allTracks.length} items (O(N log N)).`);
    onQueueModified();
  };

  // Hash map lookup
  const handleHashLookup = () => {
    const node = playbackQueue.pathIndex.get(lookupQuery.trim());
    setLookupResult(node ? node.data : null);
    setHasSearched(true);
    setLastAction(`Executed Hash Map lookup for key "${lookupQuery}" in O(1) time.`);
  };

  const nodeList = playbackQueue.toNodeList();

  return (
    <div className="w-full bg-[#0c0d14] border border-slate-800 rounded-xl p-6 text-slate-200 shadow-2xl space-y-6 font-sans">
      {/* HEADER & SUB-TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-sky-400" />
            <span>In-Memory Data Structures Acceleration Lab</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time interactive engine demonstrating O(1) Doubly Linked List, O(log N) Priority Queue, and O(1) Hash Map.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTab('dll')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'dll'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Doubly Linked List (O(1))</span>
          </button>

          <button
            onClick={() => setActiveTab('pq')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'pq'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Shuffle Priority Queue</span>
          </button>

          <button
            onClick={() => setActiveTab('hash')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'hash'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Hash Map Index</span>
          </button>
        </div>
      </div>

      {/* ACTION BANNER */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-300">
        <span className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-sky-400 font-bold">EVENT LOG:</span>
          <span>{lastAction}</span>
        </span>
        <span className="text-[10px] text-slate-400 font-mono">
          Heap size: {priorityQueue.heap.length} · DLL size: {playbackQueue.size}
        </span>
      </div>

      {/* TAB 1: DOUBLY LINKED LIST */}
      {activeTab === 'dll' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white">PlaybackQueue &lt;LinkedListNode&lt;Song&gt;&gt;</h3>
              <p className="text-xs text-slate-400">
                Bidirectional pointers allow instant forward/backward track changes without array shifting.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleStepPrev}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171a26] hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>getPrevious() [O(1)]</span>
              </button>

              <button
                onClick={handleStepNext}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 rounded-lg text-xs font-semibold text-white shadow-sm transition-colors"
              >
                <span>getNext() [O(1)]</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleInsertTail}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171a26] hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>insertAtTail()</span>
              </button>

              <button
                onClick={handleInsertAfterCurrent}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171a26] hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-sky-400 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>insertAfterCurrent()</span>
              </button>
            </div>
          </div>

          {/* VISUAL CHAIN OF NODES */}
          <div className="p-4 bg-[#11131e] border border-slate-800/80 rounded-xl overflow-x-auto">
            {nodeList.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">Queue is currently empty.</div>
            ) : (
              <div className="flex items-center gap-2 min-w-max py-2">
                {nodeList.map((node, idx) => {
                  const isCurrent = playbackQueue.currentNode?.id === node.id;
                  const isHead = playbackQueue.head?.id === node.id;
                  const isTail = playbackQueue.tail?.id === node.id;

                  return (
                    <React.Fragment key={node.id}>
                      {/* Node Box */}
                      <div
                        className={`relative w-44 p-3 rounded-lg border transition-all ${
                          isCurrent
                            ? 'bg-sky-500/15 border-sky-400 ring-2 ring-sky-500/30'
                            : 'bg-[#181b29] border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Pointers badges */}
                        <div className="flex items-center justify-between text-[9px] font-mono mb-1.5">
                          <span className={isHead ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                            {isHead ? 'HEAD' : `prev: #${idx}`}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 bg-sky-500 text-black font-bold rounded">
                              CURRENT
                            </span>
                          )}
                          <span className={isTail ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                            {isTail ? 'TAIL' : `next: #${idx + 2}`}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-white truncate">{node.data.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{node.data.artist}</p>

                        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-mono">Plays: {node.data.playCount}</span>
                          <button
                            onClick={() => handleDeleteNode(node)}
                            className="p-1 hover:text-rose-400 transition-colors"
                            title="removeNode() in O(1)"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Bidirectional Arrow Connector */}
                      {idx < nodeList.length - 1 && (
                        <div className="flex flex-col items-center px-1 text-slate-400">
                          <span className="text-[10px] font-mono text-sky-400">⇄</span>
                          <span className="text-[8px] font-mono text-slate-400">O(1)</span>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SHUFFLE PRIORITY QUEUE (BINARY MAX HEAP) */}
      {activeTab === 'pq' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white">ShufflePriorityQueue (Binary Max-Heap)</h3>
              <p className="text-xs text-slate-400">
                Formula: <code className="text-sky-400">score = (100 / (1 + playCount * 0.5)) + entropy + priority</code>. Lesser played songs bubble up!
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePollPriority}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 rounded-lg text-xs font-semibold text-white shadow-sm transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>pollNext() [O(log N)]</span>
              </button>

              <button
                onClick={handleRebuildHeap}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#171a26] hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors"
              >
                <span>rebuild() [O(N log N)]</span>
              </button>
            </div>
          </div>

          {/* HEAP ARRAY & TREE REPRESENTATION */}
          <div className="p-4 bg-[#11131e] border border-slate-800/80 rounded-xl space-y-3">
            <p className="text-xs font-semibold text-slate-300">
              Internal Binary Heap Storage (Top item index 0 is served next):
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {priorityQueue.heap.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border text-xs ${
                    idx === 0
                      ? 'bg-amber-500/10 border-amber-400/80 ring-1 ring-amber-400/40'
                      : 'bg-[#181b28] border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>Heap Index: #{idx}</span>
                    <span className="text-amber-400 font-bold font-mono">Score: {item.score}</span>
                  </div>
                  <p className="font-semibold text-white truncate">{item.song.title}</p>
                  <p className="text-[11px] text-slate-400 truncate">{item.song.artist}</p>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Plays: {item.song.playCount}</span>
                    <span>Parent: #{Math.floor((idx - 1) / 2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HASH MAP INDEX */}
      {activeTab === 'hash' && (
        <div className="space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-white">HashMap Index (O(1) Exact Path & ID Lookup)</h3>
            <p className="text-xs text-slate-400">
              Guarantees instantaneous O(1) track lookup by canonical file path, live search matching, and duplicate track detection.
            </p>
          </div>

          <div className="flex items-center gap-2 max-w-xl">
            <input
              type="text"
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              placeholder="Enter canonical file path to test O(1) lookup..."
              className="flex-1 bg-[#171a26] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            />
            <button
              onClick={handleHashLookup}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              Execute O(1) Lookup
            </button>
          </div>

          {/* QUERY RESULT */}
          {hasSearched && (
            <div className={`p-4 rounded-lg border text-xs ${
              lookupResult
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}>
              {lookupResult ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>O(1) Hash Map Hit Found!</span>
                  </div>
                  <p><strong>Title:</strong> {lookupResult.title}</p>
                  <p><strong>Artist:</strong> {lookupResult.artist}</p>
                  <p><strong>Album:</strong> {lookupResult.album}</p>
                  <p><strong>Canonical Path:</strong> <code className="font-mono text-[11px]">{lookupResult.filePath}</code></p>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>No entry exists in HashMap for this file path. Ready for O(1) insertion.</span>
                </div>
              )}
            </div>
          )}

          {/* INDEXED ENTRIES OVERVIEW */}
          <div className="p-4 bg-[#11131e] border border-slate-800 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-slate-300">
              Active In-Memory HashMap Index Keys ({playbackQueue.pathIndex.size} indexed keys):
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {Array.from(playbackQueue.pathIndex.entries()).map(([path, node], idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setLookupQuery(path);
                    setLookupResult(node.data);
                    setHasSearched(true);
                  }}
                  className="p-2 rounded bg-[#181b28] hover:bg-[#202436] cursor-pointer flex items-center justify-between text-[11px] text-slate-300 font-mono transition-colors"
                >
                  <span className="truncate max-w-md">{path}</span>
                  <span className="text-sky-400 font-bold shrink-0">→ {node.data.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
