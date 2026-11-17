import React, { useState } from 'react';
import { Database, Table, Terminal, Play, CheckCircle2, RefreshCw } from 'lucide-react';
import { TrackItem } from '../utils/dataStructures';

interface DatabaseExplorerProps {
  tracks: TrackItem[];
}

export const DatabaseExplorer: React.FC<DatabaseExplorerProps> = ({ tracks }) => {
  const [activeTable, setActiveTable] = useState<'songs' | 'playlists' | 'playlist_songs' | 'user_settings'>('songs');
  const [sqlQuery, setSqlQuery] = useState('SELECT id, title, artist, play_count FROM songs ORDER BY play_count DESC LIMIT 5;');
  const [queryResult, setQueryResult] = useState<string | null>(null);

  // Playlists table data
  const playlists = [
    { playlist_id: 1, playlist_name: 'Synthwave Chill', created_at: '2026-10-20 04:12:00' },
    { playlist_id: 2, playlist_name: 'Deep Focus Ambient', created_at: '2026-10-20 05:30:15' },
    { playlist_id: 3, playlist_name: 'Gym High-BPM', created_at: '2026-10-20 05:44:22' },
  ];

  // Playlist Songs join table
  const playlistSongs = [
    { playlist_id: 1, song_id: 1, sort_order: 1 },
    { playlist_id: 1, song_id: 2, sort_order: 2 },
    { playlist_id: 1, song_id: 7, sort_order: 3 },
    { playlist_id: 2, song_id: 3, sort_order: 1 },
    { playlist_id: 2, song_id: 4, sort_order: 2 },
    { playlist_id: 2, song_id: 6, sort_order: 3 },
  ];

  // User Settings table
  const userSettings = [
    { setting_key: 'last_volume', setting_value: '0.80' },
    { setting_key: 'shuffle_enabled', setting_value: 'true' },
    { setting_key: 'repeat_mode', setting_value: '1' },
    { setting_key: 'last_played_path', setting_value: 'C:\\Music\\Resonance - Home.mp3' },
  ];

  const handleRunQuery = () => {
    const q = sqlQuery.trim().toLowerCase();
    if (q.includes('select') && q.includes('songs')) {
      const topTracks = [...tracks].sort((a, b) => b.playCount - a.playCount).slice(0, 5);
      const formatted = topTracks.map(t => `| ${t.id} | ${t.title.padEnd(20)} | ${t.artist.padEnd(16)} | ${t.playCount.toString().padStart(4)} |`).join('\n');
      setQueryResult(`Query Executed: 200 OK (${(Math.random() * 2 + 0.5).toFixed(2)}ms)\n-------------------------------------------------------------\n| ID | TITLE                | ARTIST           | PLAYS|\n-------------------------------------------------------------\n${formatted}\n-------------------------------------------------------------\n(${topTracks.length} rows returned)`);
    } else if (q.includes('select') && q.includes('playlists')) {
      const formatted = playlists.map(p => `| ${p.playlist_id} | ${p.playlist_name.padEnd(22)} | ${p.created_at} |`).join('\n');
      setQueryResult(`Query Executed: 200 OK (0.84ms)\n-------------------------------------------------------------\n| ID | PLAYLIST NAME          | CREATED AT          |\n-------------------------------------------------------------\n${formatted}\n-------------------------------------------------------------\n(3 rows returned)`);
    } else if (q.includes('select') && q.includes('user_settings')) {
      const formatted = userSettings.map(s => `| ${s.setting_key.padEnd(18)} | ${s.setting_value.padEnd(30)} |`).join('\n');
      setQueryResult(`Query Executed: 200 OK (0.61ms)\n-------------------------------------------------------------\n| KEY                | VALUE                          |\n-------------------------------------------------------------\n${formatted}\n-------------------------------------------------------------\n(4 rows returned)`);
    } else {
      setQueryResult(`Query Executed Successfully: 1 row affected.\nParametric PreparedStatement committed to SQLite database.`);
    }
  };

  return (
    <div className="w-full bg-[#0c0d14] border border-slate-800 rounded-xl p-6 text-slate-200 shadow-2xl space-y-6 font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-sky-400" />
            <span>SQLite Local Persistence Explorer (`music_player.db`)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Embedded relational database architecture managed via JDBC PreparedStatement queries in SongDAO.
          </p>
        </div>

        {/* Table Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          {(['songs', 'playlists', 'playlist_songs', 'user_settings'] as const).map((table) => (
            <button
              key={table}
              onClick={() => setActiveTable(table)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTable === table
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>{table}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SCHEMA & TABLE DATA VIEW */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-300">
            Table: <code className="text-sky-400 font-mono">{activeTable}</code>
          </p>
          <span className="text-[11px] text-slate-400 font-mono">
            {activeTable === 'songs' && `${tracks.length} rows`}
            {activeTable === 'playlists' && `${playlists.length} rows`}
            {activeTable === 'playlist_songs' && `${playlistSongs.length} rows`}
            {activeTable === 'user_settings' && `${userSettings.length} rows`}
          </span>
        </div>

        {/* DATA TABLE CONTAINER */}
        <div className="border border-slate-800 rounded-lg overflow-x-auto bg-[#11131e]">
          {activeTable === 'songs' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#171a28] text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="p-2.5">id (PK)</th>
                  <th className="p-2.5">file_path (UNIQUE)</th>
                  <th className="p-2.5">title</th>
                  <th className="p-2.5">artist</th>
                  <th className="p-2.5">album</th>
                  <th className="p-2.5 text-right">duration_seconds</th>
                  <th className="p-2.5 text-right">play_count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300 font-mono text-[11px]">
                {tracks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/40">
                    <td className="p-2.5 text-sky-400">{t.id}</td>
                    <td className="p-2.5 text-slate-400 truncate max-w-xs">{t.filePath}</td>
                    <td className="p-2.5 font-sans font-medium text-white">{t.title}</td>
                    <td className="p-2.5 font-sans text-slate-400">{t.artist}</td>
                    <td className="p-2.5 font-sans text-slate-400">{t.album}</td>
                    <td className="p-2.5 text-right">{t.durationSeconds}s</td>
                    <td className="p-2.5 text-right font-bold text-amber-400">{t.playCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTable === 'playlists' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#171a28] text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="p-2.5">playlist_id (PK)</th>
                  <th className="p-2.5">playlist_name (UNIQUE)</th>
                  <th className="p-2.5">created_at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300 font-mono text-[11px]">
                {playlists.map((p) => (
                  <tr key={p.playlist_id} className="hover:bg-slate-800/40">
                    <td className="p-2.5 text-sky-400">{p.playlist_id}</td>
                    <td className="p-2.5 font-sans font-medium text-white">{p.playlist_name}</td>
                    <td className="p-2.5 text-slate-400">{p.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTable === 'playlist_songs' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#171a28] text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="p-2.5">playlist_id (FK)</th>
                  <th className="p-2.5">song_id (FK)</th>
                  <th className="p-2.5 text-right">sort_order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300 font-mono text-[11px]">
                {playlistSongs.map((ps, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-2.5 text-sky-400">{ps.playlist_id}</td>
                    <td className="p-2.5 text-emerald-400">{ps.song_id}</td>
                    <td className="p-2.5 text-right">{ps.sort_order}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTable === 'user_settings' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#171a28] text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="p-2.5">setting_key (PK)</th>
                  <th className="p-2.5">setting_value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300 font-mono text-[11px]">
                {userSettings.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-2.5 text-sky-400">{s.setting_key}</td>
                    <td className="p-2.5 text-amber-400 font-bold">{s.setting_value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* INTERACTIVE SQL QUERY CONSOLE */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-white flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-sky-400" />
            <span>Interactive SQL Query Runner (Simulated SQLite JDBC)</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSqlQuery('SELECT id, title, artist, play_count FROM songs ORDER BY play_count DESC LIMIT 5;')}
              className="text-[11px] text-sky-400 hover:underline"
            >
              Top Played Songs
            </button>
            <span className="text-slate-600">·</span>
            <button
              onClick={() => setSqlQuery('SELECT * FROM user_settings;')}
              className="text-[11px] text-sky-400 hover:underline"
            >
              User Settings
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            className="flex-1 bg-[#151724] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
          />
          <button
            onClick={handleRunQuery}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Execute</span>
          </button>
        </div>

        {queryResult && (
          <pre className="p-3 bg-[#0a0b10] border border-slate-800/80 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre">
            {queryResult}
          </pre>
        )}
      </div>
    </div>
  );
};
