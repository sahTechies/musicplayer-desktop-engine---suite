import React, { useState, useMemo } from 'react';
import {
  Monitor,
  Zap,
  Database,
  Code2,
  Terminal,
  Download,
  Github,
  CheckCircle2
} from 'lucide-react';
import JSZip from 'jszip';
import { DesktopPlayerSimulator } from './components/DesktopPlayerSimulator';
import { DataStructuresLab } from './components/DataStructuresLab';
import { DatabaseExplorer } from './components/DatabaseExplorer';
import { CodeExplorer } from './components/CodeExplorer';
import { PackagingGuideView } from './components/PackagingGuideView';
import {
  INITIAL_TRACKS,
  TrackItem,
  SimulationPlaybackQueue,
  SimulationPriorityQueue
} from './utils/dataStructures';
import { JAVA_PROJECT_FILES } from './data/sourceCode';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'datastructures' | 'database' | 'code' | 'packaging'>('simulator');
  const [tracks, setTracks] = useState<TrackItem[]>(INITIAL_TRACKS);
  const [isZipping, setIsZipping] = useState(false);

  // Core Data Structures instances
  const playbackQueue = useMemo(() => {
    const queue = new SimulationPlaybackQueue();
    INITIAL_TRACKS.forEach(t => queue.insertAtTail(t));
    return queue;
  }, []);

  const priorityQueue = useMemo(() => {
    const pq = new SimulationPriorityQueue();
    pq.rebuild(INITIAL_TRACKS);
    return pq;
  }, []);

  const handleAddTracks = (newTracks: TrackItem[]) => {
    setTracks(prev => [...prev, ...newTracks]);
  };

  const handleUpdateTrackPlays = (trackId: number) => {
    setTracks(prev =>
      prev.map(t => (t.id === trackId ? { ...t, playCount: t.playCount + 1 } : t))
    );
  };

  const handleDownloadFullProject = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const rootFolder = zip.folder('music-player');

      if (rootFolder) {
        JAVA_PROJECT_FILES.forEach((file) => {
          rootFolder.file(file.path, file.content);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'music-player-desktop-suite.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error bundling ZIP:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a10] text-slate-100 flex flex-col font-sans">
      {/* TOP NAVIGATION BAR (Complies with Top Bar Contract: Zone 1 Wordmark — Zone 2 Nav Links — Zone 3 Primary Action) */}
      <header className="h-16 border-b border-slate-800/80 bg-[#0c0e17]/90 backdrop-blur-md px-6 flex items-center justify-between gap-8 shrink-0 sticky top-0 z-40">
        {/* ZONE 1: Single text element Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-sky-500/20">
            ♫
          </div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            MusicPlayer
          </span>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Java 21 Desktop Engine
          </span>
        </div>

        {/* ZONE 2: 4-5 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-1 bg-[#131622] p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'simulator'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop Player</span>
          </button>

          <button
            onClick={() => setActiveTab('datastructures')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'datastructures'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Data Structures</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'database'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>SQLite Database</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'code'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Java Source Code</span>
          </button>

          <button
            onClick={() => setActiveTab('packaging')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'packaging'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Build &amp; Packaging</span>
          </button>
        </nav>

        {/* ZONE 3: 1 Primary CTA Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleDownloadFullProject}
            disabled={isZipping}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-md shadow-sky-600/20 transition-all disabled:opacity-50 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isZipping ? 'Bundling ZIP...' : 'Download Java Project (.ZIP)'}</span>
          </button>
        </div>
      </header>

      {/* MOBILE SEGMENTED NAV BAR (Visible only on small screens) */}
      <div className="flex md:hidden items-center justify-around bg-[#10121d] border-b border-slate-800 p-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${activeTab === 'simulator' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
        >
          Player
        </button>
        <button
          onClick={() => setActiveTab('datastructures')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${activeTab === 'datastructures' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
        >
          Data Structures
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${activeTab === 'database' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
        >
          SQLite
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${activeTab === 'code' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
        >
          Source Code
        </button>
        <button
          onClick={() => setActiveTab('packaging')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap ${activeTab === 'packaging' ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
        >
          Packaging
        </button>
      </div>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* VIEW 1: DESKTOP PLAYER SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <DesktopPlayerSimulator
              tracks={tracks}
              onAddTracks={handleAddTracks}
              onUpdateTrackPlays={handleUpdateTrackPlays}
              playbackQueue={playbackQueue}
              priorityQueue={priorityQueue}
              onSelectDataStructureTab={() => setActiveTab('datastructures')}
            />

            {/* Architecture Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-[#0f111a] border border-slate-800/80 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Multithreaded Audio</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Zero UI latency. JavaFX MediaPlayer buffer loading isolated on background worker threads.
                </p>
              </div>

              <div className="p-4 bg-[#0f111a] border border-slate-800/80 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>O(1) Doubly Linked List</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Instant bidirectional track stepping without array re-indexing or memory shifting.
                </p>
              </div>

              <div className="p-4 bg-[#0f111a] border border-slate-800/80 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Weighted Priority Queue</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Dynamic Binary Max-Heap prioritizing lesser-played tracks with randomized entropy.
                </p>
              </div>

              <div className="p-4 bg-[#0f111a] border border-slate-800/80 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Embedded SQLite JDBC</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Parameterized PreparedStatements persisting songs, playlists, and user playback states.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: DATA STRUCTURES LAB */}
        {activeTab === 'datastructures' && (
          <DataStructuresLab
            playbackQueue={playbackQueue}
            priorityQueue={priorityQueue}
            allTracks={tracks}
            onQueueModified={() => setTracks([...tracks])}
          />
        )}

        {/* VIEW 3: SQLITE DATABASE EXPLORER */}
        {activeTab === 'database' && (
          <DatabaseExplorer tracks={tracks} />
        )}

        {/* VIEW 4: SOURCE CODE EXPLORER */}
        {activeTab === 'code' && (
          <CodeExplorer />
        )}

        {/* VIEW 5: BUILD & PACKAGING */}
        {activeTab === 'packaging' && (
          <PackagingGuideView />
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 bg-[#0a0b12] py-6 px-6 text-center text-xs text-slate-500">
        <p>
          MusicPlayer Desktop Audio Engine &amp; Suite — Java 21 LTS · JavaFX 21 · SQLite JDBC · Jaudiotagger
        </p>
      </footer>
    </div>
  );
}
