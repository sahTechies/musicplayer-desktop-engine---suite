import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Search,
  Plus,
  FolderPlus,
  RefreshCw,
  Music,
  User,
  Disc,
  ListMusic,
  Upload,
  CheckCircle2,
  Minus,
  Maximize2,
  X
} from 'lucide-react';
import { TrackItem, SimulationPlaybackQueue, SimulationPriorityQueue } from '../utils/dataStructures';
import { audioSynth } from '../utils/audioSynth';

interface DesktopPlayerProps {
  tracks: TrackItem[];
  onAddTracks: (newTracks: TrackItem[]) => void;
  onUpdateTrackPlays: (trackId: number) => void;
  playbackQueue: SimulationPlaybackQueue;
  priorityQueue: SimulationPriorityQueue;
  onSelectDataStructureTab?: () => void;
}

export const DesktopPlayerSimulator: React.FC<DesktopPlayerProps> = ({
  tracks,
  onAddTracks,
  onUpdateTrackPlays,
  playbackQueue,
  priorityQueue,
}) => {
  const [currentTrack, setCurrentTrack] = useState<TrackItem | null>(tracks[0] || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(tracks[0]?.durationSeconds || 180);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<0 | 1 | 2>(0); // 0: Off, 1: All, 2: One
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNav, setActiveNav] = useState<'all' | 'artists' | 'albums' | 'queue' | 'playlist'>('all');
  const [playlists, setPlaylists] = useState<{ id: number; name: string; trackIds: number[] }[]>([
    { id: 1, name: 'Synthwave Chill', trackIds: [1, 2, 7] },
    { id: 2, name: 'Deep Focus Ambient', trackIds: [3, 4, 6] },
  ]);
  const [activePlaylistId, setActivePlaylistId] = useState<number | null>(null);
  const [newPlaylistModalOpen, setNewPlaylistModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [statusMessage, setStatusMessage] = useState('SQLite database online: 7 tracks loaded.');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync AudioSynth callbacks
  useEffect(() => {
    audioSynth.setCallbacks(
      (pos) => setCurrentPosition(pos),
      () => handleNext()
    );
  }, [currentTrack, isShuffle, repeatMode, tracks]);

  // Waveform visualization loop
  useEffect(() => {
    let animId: number;
    const renderWave = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const freqs = audioSynth.getFrequencyData();
          const barWidth = 3;
          const gap = 2;
          const totalBars = Math.floor(canvas.width / (barWidth + gap));

          for (let i = 0; i < totalBars; i++) {
            const val = freqs[i % freqs.length] || 0;
            const barHeight = isPlaying ? Math.max(3, (val / 255) * canvas.height * 0.9) : 3;
            const x = i * (barWidth + gap);
            const y = (canvas.height - barHeight) / 2;

            ctx.fillStyle = isPlaying ? '#38bdf8' : '#334155';
            ctx.fillRect(x, y, barWidth, barHeight);
          }
        }
      }
      animId = requestAnimationFrame(renderWave);
    };
    renderWave();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Play a song
  const playTrack = (track: TrackItem) => {
    setCurrentTrack(track);
    setDuration(track.durationSeconds);
    setCurrentPosition(0);
    setIsPlaying(true);
    playbackQueue.setCurrentByPath(track.filePath);

    if (track.audioBlobUrl) {
      audioSynth.playAudioFile(track.audioBlobUrl);
    } else {
      audioSynth.playSyntheticTrack(track.id, track.durationSeconds);
    }

    onUpdateTrackPlays(track.id);
    setStatusMessage(`Playing: ${track.artist} - ${track.title}`);
  };

  const handleTogglePlay = () => {
    if (!currentTrack) {
      if (tracks.length > 0) playTrack(tracks[0]);
      return;
    }

    if (isPlaying) {
      audioSynth.pause();
      setIsPlaying(false);
      setStatusMessage(`Paused: ${currentTrack.title}`);
    } else {
      if (currentPosition > 0) {
        audioSynth.resume();
      } else {
        if (currentTrack.audioBlobUrl) {
          audioSynth.playAudioFile(currentTrack.audioBlobUrl, currentPosition);
        } else {
          audioSynth.playSyntheticTrack(currentTrack.id, currentTrack.durationSeconds, currentPosition);
        }
      }
      setIsPlaying(true);
      setStatusMessage(`Resumed: ${currentTrack.title}`);
    }
  };

  const handleStop = () => {
    audioSynth.stop();
    setIsPlaying(false);
    setCurrentPosition(0);
    setStatusMessage('Playback stopped.');
  };

  const handleNext = () => {
    let nextTrack: TrackItem | null = null;
    if (isShuffle) {
      nextTrack = priorityQueue.pollNext();
      if (!nextTrack) {
        priorityQueue.rebuild(tracks);
        nextTrack = priorityQueue.pollNext();
      }
    } else {
      nextTrack = playbackQueue.getNext();
    }

    if (nextTrack) {
      playTrack(nextTrack);
    } else {
      handleStop();
    }
  };

  const handlePrevious = () => {
    const prevTrack = playbackQueue.getPrevious();
    if (prevTrack) {
      playTrack(prevTrack);
    }
  };

  const handleSeek = (newVal: number) => {
    setCurrentPosition(newVal);
    audioSynth.seek(newVal);
  };

  const handleVolumeChange = (newVal: number) => {
    setVolume(newVal);
    audioSynth.setVolume(newVal);
    if (newVal === 0) setIsMuted(true);
    else setIsMuted(false);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioSynth.setMute(nextMuted);
  };

  const handleToggleShuffle = () => {
    const nextShuffle = !isShuffle;
    setIsShuffle(nextShuffle);
    if (nextShuffle) {
      priorityQueue.rebuild(tracks);
      setStatusMessage('Shuffle enabled via ShufflePriorityQueue (Dynamic Max-Heap)');
    } else {
      setStatusMessage('Shuffle disabled. Sequential Doubly Linked List active.');
    }
  };

  const handleToggleRepeat = () => {
    const nextMode = ((repeatMode + 1) % 3) as 0 | 1 | 2;
    setRepeatMode(nextMode);
    playbackQueue.repeatAll = nextMode === 1;
    playbackQueue.repeatOne = nextMode === 2;
    const msgs = ['Repeat: Off', 'Repeat: All Tracks', 'Repeat: Single Track'];
    setStatusMessage(msgs[nextMode]);
  };

  // File import (native file picker & ID3 tag simulation)
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newTracks: TrackItem[] = [];
    const colors = [
      'from-emerald-500 to-teal-800',
      'from-amber-600 to-rose-700',
      'from-violet-600 to-indigo-900',
      'from-pink-600 to-purple-900'
    ];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const blobUrl = URL.createObjectURL(file);
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      let artist = 'Local Artist';
      let title = nameWithoutExt;

      if (nameWithoutExt.includes(' - ')) {
        const parts = nameWithoutExt.split(' - ');
        artist = parts[0].trim();
        title = parts[1].trim();
      }

      const newTrack: TrackItem = {
        id: tracks.length + i + 1,
        filePath: `C:\\Music\\Imports\\${file.name}`,
        title: title || 'Imported Track',
        artist: artist || 'Local Artist',
        album: 'Local Import Library',
        durationSeconds: 195,
        playCount: 0,
        albumArtColor: colors[(tracks.length + i) % colors.length],
        audioBlobUrl: blobUrl,
      };

      newTracks.push(newTrack);
      playbackQueue.insertAtTail(newTrack);
      priorityQueue.insert(newTrack);
    }

    onAddTracks(newTracks);
    setStatusMessage(`Imported ${newTracks.length} audio file(s) into SQLite database.`);
  };

  // Filtered tracks based on search & sidebar navigation
  const displayedTracks = useMemo(() => {
    let list = [...tracks];

    if (activeNav === 'playlist' && activePlaylistId) {
      const pl = playlists.find(p => p.id === activePlaylistId);
      if (pl) {
        list = list.filter(t => pl.trackIds.includes(t.id));
      }
    } else if (activeNav === 'artists') {
      list.sort((a, b) => a.artist.localeCompare(b.artist));
    } else if (activeNav === 'albums') {
      list.sort((a, b) => a.album.localeCompare(b.album));
    } else if (activeNav === 'queue') {
      list = playbackQueue.toList();
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        t => t.title.toLowerCase().includes(q) ||
             t.artist.toLowerCase().includes(q) ||
             t.album.toLowerCase().includes(q)
      );
    }

    return list;
  }, [tracks, activeNav, activePlaylistId, playlists, searchQuery, playbackQueue]);

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const newPl = {
      id: playlists.length + 1,
      name: newPlaylistName.trim(),
      trackIds: tracks.slice(0, 3).map(t => t.id),
    };
    setPlaylists([...playlists, newPl]);
    setNewPlaylistName('');
    setNewPlaylistModalOpen(false);
    setStatusMessage(`Playlist "${newPl.name}" created and saved to SQLite.`);
  };

  const formatSeconds = (sec: number) => {
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-800 bg-[#0c0d14] shadow-2xl flex flex-col font-sans select-none">
      {/* WINDOW CHROME / TITLEBAR (Windows 11 Fluent) */}
      <div className="h-9 bg-[#11131c] border-b border-slate-800/80 px-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
            M
          </div>
          <span className="font-medium text-slate-300">MusicPlayer — Windows Audio Engine (64-bit)</span>
          <span className="text-[10px] text-slate-400 font-mono">SQLite: Connected</span>
        </div>
        <div className="flex items-center">
          <button className="h-9 px-3 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors" title="Minimize">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button className="h-9 px-3 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors" title="Maximize">
            <Maximize2 className="w-3 h-3" />
          </button>
          <button className="h-9 px-3 hover:bg-rose-600 hover:text-white text-slate-400 transition-colors" title="Close">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* MAIN BODY: SIDEBAR + CONTENT */}
      <div className="flex flex-1 min-h-[520px]">
        {/* LEFT SIDEBAR (PlayerView.fxml layout) */}
        <div className="w-60 bg-[#12141f] border-r border-slate-800/80 p-3.5 flex flex-col justify-between shrink-0">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-2 mb-1.5">
                Library
              </p>
              <div className="space-y-0.5">
                <button
                  onClick={() => { setActiveNav('all'); setActivePlaylistId(null); }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeNav === 'all'
                      ? 'bg-sky-500/15 text-sky-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>All Tracks</span>
                  <span className="ml-auto text-[10px] text-slate-400 font-mono">{tracks.length}</span>
                </button>

                <button
                  onClick={() => { setActiveNav('artists'); setActivePlaylistId(null); }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeNav === 'artists'
                      ? 'bg-sky-500/15 text-sky-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Artists</span>
                </button>

                <button
                  onClick={() => { setActiveNav('albums'); setActivePlaylistId(null); }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeNav === 'albums'
                      ? 'bg-sky-500/15 text-sky-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Disc className="w-3.5 h-3.5" />
                  <span>Albums</span>
                </button>

                <button
                  onClick={() => { setActiveNav('queue'); setActivePlaylistId(null); }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeNav === 'queue'
                      ? 'bg-sky-500/15 text-sky-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <ListMusic className="w-3.5 h-3.5" />
                  <span>Active Queue</span>
                  <span className="ml-auto text-[10px] text-sky-400/80 font-mono">O(1)</span>
                </button>
              </div>
            </div>

            {/* Playlists */}
            <div>
              <div className="flex items-center justify-between px-2 mb-1.5">
                <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  Playlists
                </p>
                <button
                  onClick={() => setNewPlaylistModalOpen(true)}
                  className="p-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  title="Create New Playlist"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-0.5">
                {playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => { setActiveNav('playlist'); setActivePlaylistId(pl.id); }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors truncate ${
                      activeNav === 'playlist' && activePlaylistId === pl.id
                        ? 'bg-sky-500/15 text-sky-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="text-slate-400">📁</span>
                    <span className="truncate">{pl.name}</span>
                    <span className="ml-auto text-[10px] text-slate-400 font-mono">{pl.trackIds.length}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SQLite & Engine Status Footer */}
          <div className="pt-3 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-400">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>SQLite DB: music_player.db</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {tracks.length} songs · {playbackQueue.size} in queue
            </p>
          </div>
        </div>

        {/* RIGHT / CENTER CONTENT AREA */}
        <div className="flex-1 bg-[#0f1118] p-5 flex flex-col justify-between overflow-hidden">
          <div className="space-y-4">
            {/* Top Action & Search Bar */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {activeNav === 'all' && 'Music Library'}
                  {activeNav === 'artists' && 'Artists View'}
                  {activeNav === 'albums' && 'Albums View'}
                  {activeNav === 'queue' && 'Active Playback Queue'}
                  {activeNav === 'playlist' && (playlists.find(p => p.id === activePlaylistId)?.name || 'Playlist')}
                </h1>
                <p className="text-xs text-slate-400">
                  {displayedTracks.length} track{displayedTracks.length === 1 ? '' : 's'} available
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Search Bar */}
                <div className="relative w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search title, artist..."
                    className="w-full bg-[#171a26] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/mp3,audio/wav,audio/*"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Files</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1e2d] hover:bg-[#22273a] text-slate-300 border border-slate-800 rounded-lg text-xs font-medium transition-colors"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Scan Folder</span>
                </button>

                <button
                  onClick={() => {
                    playbackQueue.clear();
                    tracks.forEach(t => playbackQueue.insertAtTail(t));
                    priorityQueue.rebuild(tracks);
                    setStatusMessage('Rescanned library and rebuilt in-memory indexes.');
                  }}
                  className="p-1.5 bg-[#1a1e2d] hover:bg-[#22273a] text-slate-300 border border-slate-800 rounded-lg transition-colors"
                  title="Rescan Library"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Track Table (TableView simulation) */}
            <div className="border border-slate-800/80 rounded-lg overflow-hidden bg-[#12141e]/50">
              <div className="grid grid-cols-12 px-3 py-2 bg-[#141724] border-b border-slate-800/80 text-[11px] font-semibold text-slate-400">
                <div className="col-span-1">#</div>
                <div className="col-span-4">TITLE</div>
                <div className="col-span-3">ARTIST</div>
                <div className="col-span-2">ALBUM</div>
                <div className="col-span-1 text-right">TIME</div>
                <div className="col-span-1 text-right">PLAYS</div>
              </div>

              <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-800/40">
                {displayedTracks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No tracks found matching query.
                  </div>
                ) : (
                  displayedTracks.map((track, idx) => {
                    const isSelected = currentTrack?.id === track.id;
                    return (
                      <div
                        key={track.id}
                        onDoubleClick={() => playTrack(track)}
                        onClick={() => setCurrentTrack(track)}
                        className={`grid grid-cols-12 px-3 py-2 text-xs items-center cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-sky-500/10 text-sky-300 font-medium'
                            : 'text-slate-300 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="col-span-1 font-mono text-[11px] text-slate-400 flex items-center gap-1.5">
                          {isSelected && isPlaying ? (
                            <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>
                        <div className="col-span-4 font-medium truncate pr-2 flex items-center gap-2">
                          <div className={`w-5 h-5 rounded bg-gradient-to-br ${track.albumArtColor || 'from-sky-500 to-indigo-600'} shrink-0 flex items-center justify-center text-[10px] text-white/90`}>
                            ♫
                          </div>
                          <span className="truncate">{track.title}</span>
                        </div>
                        <div className="col-span-3 text-slate-400 truncate pr-2">
                          {track.artist}
                        </div>
                        <div className="col-span-2 text-slate-400 truncate pr-2">
                          {track.album}
                        </div>
                        <div className="col-span-1 text-right font-mono text-[11px] text-slate-400">
                          {formatSeconds(track.durationSeconds)}
                        </div>
                        <div className="col-span-1 text-right font-mono text-[11px] text-slate-400">
                          {track.playCount}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Engine Status Line */}
          <div className="mt-3 py-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60">
            <span>{statusMessage}</span>
            <span className="font-mono text-[10px]">AudioEngine: JavaFX Media & WebAudio Subsystem</span>
          </div>
        </div>
      </div>

      {/* BOTTOM PERSISTENT PLAYBACK BAR */}
      <div className="h-20 bg-[#12141f] border-t border-slate-800 px-5 flex items-center justify-between gap-6 shrink-0">
        {/* Left: Now Playing Metadata */}
        <div className="flex items-center gap-3 w-64 shrink-0">
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-tr ${currentTrack?.albumArtColor || 'from-sky-500 to-indigo-600'} shadow-md flex items-center justify-center text-white text-lg font-bold shrink-0`}>
            ♫
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">
              {currentTrack?.title || 'No track selected'}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {currentTrack?.artist || 'Select a song to play'}
            </p>
          </div>
        </div>

        {/* Center: Controls & Seek Scrub Bar */}
        <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5">
          {/* Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleToggleShuffle}
              className={`p-1.5 rounded-full transition-colors ${
                isShuffle ? 'text-sky-400 bg-sky-500/10' : 'text-slate-400 hover:text-white'
              }`}
              title={isShuffle ? 'Shuffle (Priority Queue Active)' : 'Shuffle Off'}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={handlePrevious}
              className="p-1 text-slate-300 hover:text-white transition-colors"
              title="Previous Track"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={handleTogglePlay}
              className="w-9 h-9 rounded-full bg-white hover:bg-sky-400 text-slate-950 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              onClick={handleStop}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Stop"
            >
              <Square className="w-4 h-4" />
            </button>

            <button
              onClick={handleNext}
              className="p-1 text-slate-300 hover:text-white transition-colors"
              title="Next Track"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={handleToggleRepeat}
              className={`p-1.5 rounded-full transition-colors ${
                repeatMode > 0 ? 'text-sky-400 bg-sky-500/10' : 'text-slate-400 hover:text-white'
              }`}
              title={repeatMode === 2 ? 'Repeat One' : repeatMode === 1 ? 'Repeat All' : 'Repeat Off'}
            >
              {repeatMode === 2 ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Seek Bar + Canvas Waveform */}
          <div className="w-full flex items-center gap-2.5">
            <span className="text-[10px] font-mono text-slate-400 w-9 text-right">
              {formatSeconds(currentPosition)}
            </span>

            <div className="relative flex-1 flex items-center group">
              {/* Audio waveform visualization canvas behind slider */}
              <canvas
                ref={canvasRef}
                width={360}
                height={16}
                className="absolute inset-0 w-full h-full opacity-60 pointer-events-none"
              />

              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.5}
                value={currentPosition}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 z-10 opacity-80 group-hover:opacity-100 transition-opacity"
              />
            </div>

            <span className="text-[10px] font-mono text-slate-400 w-9">
              {formatSeconds(duration)}
            </span>
          </div>
        </div>

        {/* Right: Volume & Options */}
        <div className="flex items-center gap-3 w-52 justify-end shrink-0">
          <button
            onClick={handleToggleMute}
            className="text-slate-400 hover:text-white transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />

          <span className="text-[10px] font-mono text-slate-400 w-7">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>

      {/* CREATE PLAYLIST MODAL */}
      {newPlaylistModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#161825] border border-slate-700 rounded-xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Create New Playlist</h3>
            <p className="text-xs text-slate-400">
              Enter a name for the new playlist. This will be stored in SQLite table <code className="text-sky-400">playlists</code>.
            </p>
            <input
              type="text"
              autoFocus
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="e.g. Chill Synthwave"
              className="w-full bg-[#1e2233] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreatePlaylist();
              }}
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setNewPlaylistModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlaylist}
                className="px-3.5 py-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors"
              >
                Save to SQLite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
