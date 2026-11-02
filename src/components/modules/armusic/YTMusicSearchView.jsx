import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, X, Loader2, Play, Pause, Download, Music, AlertCircle,
  Clock, User, Sparkles, CheckCircle,
} from 'lucide-react';
import { searchYouTubeMusic, resolveYouTubeMusicAudioUrl } from '../../../services/musicStream.js';
import { isDeviceExtractorAvailable } from '../../../services/armusicExtractor.js';
import { isBotBlockError, formatResolverError } from '../../../services/scrapers/youtube.js';
import { downloadMedia } from '../../../utils/download.js';
import { addDownloadRecord } from '../../../utils/history.js';

const RECENT_KEY = 'yt_music_recent_searches';
const MAX_RECENT = 10;

function loadRecent() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(RECENT_KEY) : null;
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecent(list) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
    }
  } catch { /* abaikan */ }
}

export default function YTMusicSearchView({ playTrack, onDownload, currentId, playing, onPlayError }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [recent, setRecent] = useState(() => loadRecent());
  const [resolvingId, setResolvingId] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [downloadedIds, setDownloadedIds] = useState(new Set());
  const inputRef = useRef(null);
  const searchAbortRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (inputRef.current && !hasSearched) {
      inputRef.current.focus();
    }
  }, [hasSearched]);

  const runSearch = useCallback(async (q) => {
    const clean = String(q || '').trim();
    if (!clean) return;

    // Batalkan pencarian lama
    const reqId = ++searchAbortRef.current;
    setSearching(true);
    setError(null);
    setHasSearched(true);

    // Tambahkan ke recent
    const nextRecent = [clean, ...loadRecent().filter((r) => r !== clean)];
    saveRecent(nextRecent);
    setRecent(nextRecent);

    try {
      const tracks = await searchYouTubeMusic(clean, 20);
      if (searchAbortRef.current !== reqId || !isMountedRef.current) return;
      setResults(Array.isArray(tracks) ? tracks : []);
      if (!tracks || tracks.length === 0) {
        setError(null); // kosong = tidak ada hasil, bukan error
      }
    } catch (err) {
      if (searchAbortRef.current !== reqId || !isMountedRef.current) return;
      setResults([]);
      const friendly = formatResolverError(err, clean);
      setError(isBotBlockError(err)
        ? 'YouTube Music sedang rate-limit/blok. Tunggu 1–2 menit lalu coba lagi.'
        : friendly);
    } finally {
      if (searchAbortRef.current === reqId && isMountedRef.current) {
        setSearching(false);
      }
    }
  }, []);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setError(null);
    setHasSearched(false);
    setRecent(loadRecent());
    if (inputRef.current) inputRef.current.focus();
  };

  const handlePlay = async (track) => {
    if (!track?.videoId || resolvingId) return;
    setError(null);
    setResolvingId(track.videoId);

    try {
      const audioUrl = await resolveYouTubeMusicAudioUrl({
        videoId: track.videoId,
        query: `${track.title} ${track.artist}`,
        onProgress: null,
      });

      if (!isMountedRef.current) return;
      if (!audioUrl) {
        throw new Error('Stream audio tidak dapat di-resolve.');
      }

      // Bangun track object ala ArMusic library
      const toPlayable = (row, uri) => ({
        id: `ytm:${row.videoId}`,
        title: row.title,
        artist: row.artist || 'YouTube Music',
        filename: `${row.title}.mp3`,
        folder: 'YouTube Music',
        uri,
        durationSec: row.duration || 0,
        source: 'stream',
        streamRef: row,
        videoId: row.videoId,
      });

      const playableTrack = toPlayable(track, audioUrl);
      // Antrean = seluruh hasil pencarian, supaya "berikutnya" melanjutkan ke
      // hasil berikutnya, bukan melompat ke lagu yang sudah diunduh.
      // Item lain belum punya URI — di-resolve saat gilirannya tiba.
      const queue = results.map((row) =>
        row.videoId === track.videoId ? playableTrack : toPlayable(row, null),
      );

      await playTrack(playableTrack, false, queue);
    } catch (err) {
      if (isMountedRef.current) {
        const msg = formatResolverError(err, track?.title || query);
        setError(isBotBlockError(err)
          ? 'YouTube Music sedang memblokir permintaan. Tunggu sebentar lalu coba lagi.'
          : msg);
        if (onPlayError) onPlayError(msg);
      }
    } finally {
      if (isMountedRef.current) {
        setResolvingId(null);
      }
    }
  };

  const handleDownload = async (track) => {
    if (!track?.videoId || downloadingId) return;
    setDownloadingId(track.videoId);
    setDownloadProgress({ [track.videoId]: { percent: 0, status: 'Memulai download...' } });

    try {
      // Resolve audio URL dulu
      const audioUrl = await resolveYouTubeMusicAudioUrl({
        videoId: track.videoId,
        query: `${track.title} ${track.artist}`,
        onProgress: (pct, msg) => {
          if (pct < 100) {
            setDownloadProgress({ [track.videoId]: { percent: pct, status: msg || 'Resolving...' } });
          }
        },
      });

      if (!audioUrl) {
        throw new Error('Gagal mendapatkan stream audio');
      }

      // Download file
      const filename = `${track.title} - ${track.artist || 'YouTube Music'}.mp3`;
      const downloadRes = await downloadMedia({
        url: audioUrl,
        filename,
        platform: 'youtube',
        subfolder: 'Aruthtale',
        onProgress: (pct, msg) => {
          setDownloadProgress({ [track.videoId]: { percent: pct, status: msg } });
        },
      });

      const downloadPath = typeof downloadRes === 'string' ? downloadRes : (downloadRes?.path || '');

      // Save ke download history
      addDownloadRecord({
        url: `https://music.youtube.com/watch?v=${track.videoId}`,
        platform: 'YouTube Music',
        title: track.title,
        artist: track.artist,
        cover: track.cover,
        downloadPath,
        timestamp: Date.now(),
      });

      // Mark sebagai downloaded
      setDownloadedIds((prev) => new Set(prev).add(track.videoId));
      setDownloadProgress({ [track.videoId]: { percent: 100, status: 'Selesai!' } });

      // Trigger refresh library ArMusic (via onDownload callback)
      if (onDownload) {
        onDownload({
          videoId: track.videoId,
          title: track.title,
          artist: track.artist,
          cover: track.cover,
          duration: track.duration,
          downloadPath,
          filename,
        });
      }

      // Clear progress setelah 2 detik
      setTimeout(() => {
        setDownloadProgress((prev) => {
          const next = { ...prev };
          delete next[track.videoId];
          return next;
        });
      }, 2000);
    } catch (err) {
      console.error('Download failed:', err);
      setDownloadProgress({
        [track.videoId]: {
          percent: 0,
          status: `Error: ${err.message || 'Download gagal'}`,
        },
      });
      setTimeout(() => {
        setDownloadProgress((prev) => {
          const next = { ...prev };
          delete next[track.videoId];
          return next;
        });
      }, 3000);
    } finally {
      setDownloadingId(null);
    }
  };

  const isTrackPlaying = (videoId) => currentId === `ytm:${videoId}` && playing;
  const isTrackCurrent = (videoId) => currentId === `ytm:${videoId}`;

  // ============ RENDER ============

  const renderSearchBar = () => (
    <>
    <div className="flex items-center gap-2 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] px-3 py-2">
      <Search className="w-4 h-4 text-[#121212] shrink-0" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') runSearch(query); }}
        placeholder="Cari lagu, artis, album..."
        className="flex-1 min-w-0 bg-transparent outline-none text-sm font-bold text-[#121212] placeholder:text-gray-400"
      />
      {query && (
        <button onClick={handleClear} className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0" title="Bersihkan">
          <X className="w-3 h-3 text-[#121212]" />
        </button>
      )}
      <button
        onClick={() => runSearch(query)}
        disabled={searching || !query.trim()}
        className="px-2.5 py-1 rounded-lg bg-[#121212] text-[#FFE600] text-[10px] font-mono-code font-black uppercase border-2 border-black shrink-0 disabled:opacity-40"
      >
        {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cari'}
      </button>
    </div>
    {isDeviceExtractorAvailable() && (
      <p className="text-[10px] font-mono-code text-gray-500 px-1 mt-1.5">
        Ekstraksi audio berjalan di HP ini — tanpa server
      </p>
    )}
    </>
  );

  const renderRecentSearches = () => {
    if (recent.length === 0) return null;
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] font-mono-code font-black uppercase text-gray-500 tracking-wider">Pencarian Terakhir</p>
        <div className="flex flex-wrap gap-1.5">
          {recent.map((r, i) => (
            <button
              key={`${r}-${i}`}
              onClick={() => { setQuery(r); runSearch(r); }}
              className="px-2.5 py-1 rounded-lg bg-[#F8F5EE] hover:bg-[#FFE600]/40 border border-black text-[11px] font-bold text-[#121212] shadow-[1px_1px_0px_#121212]"
            >
              <Clock className="w-3 h-3 inline mr-1 -mt-0.5 text-gray-500" />
              {r}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderEmptyState = () => {
    if (searching) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-[#D8B4FE]" />
          <p className="text-xs font-bold text-gray-600">Mencari di YouTube Music...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-2 px-4 text-center">
          <AlertCircle className="w-8 h-8 text-[#FF525E]" />
          <p className="text-sm font-black text-[#121212]">Oops!</p>
          <p className="text-xs font-bold text-gray-600">{error}</p>
        </div>
      );
    }
    if (hasSearched && results.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-2 px-4 text-center">
          <Music className="w-8 h-8 text-gray-300" />
          <p className="text-sm font-black text-[#121212]">Tidak ada hasil</p>
          <p className="text-xs font-bold text-gray-500">Coba kata kunci lain atau ganti judul lagu.</p>
        </div>
      );
    }
    // Belum pernah search
    return (
      <div className="space-y-4">
        {renderRecentSearches()}
        <div className="flex flex-col items-center justify-center py-8 gap-2 px-4 text-center rounded-xl bg-[#F8F5EE] border-2 border-dashed border-gray-300">
          <Music className="w-10 h-10 text-[#121212]/20" />
          <p className="text-sm font-black text-[#121212]">YouTube Music ArMusic</p>
          <p className="text-xs font-bold text-gray-500 max-w-xs">
            Cari lagu di YouTube Music lalu putar langsung (streaming) atau unduh ke koleksi offline.
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono-code font-bold text-gray-400">
            <Sparkles className="w-3 h-3" />
            <span>No login required</span>
          </div>
        </div>
      </div>
    );
  };

  const renderResults = () => (
    <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
      {results.map((track) => {
        const playingNow = isTrackPlaying(track.videoId);
        const isCurrent = isTrackCurrent(track.videoId);
        const isDownloading = downloadingId === track.videoId;
        const progress = downloadProgress[track.videoId];
        const isDownloaded = downloadedIds.has(track.videoId);
        
        return (
          <div key={track.videoId} className="space-y-1">
            <div
              onClick={() => handlePlay(track)}
              className={`nb-card p-2.5 flex items-center gap-2.5 cursor-pointer transition-all shadow-[1.5px_1.5px_0px_#121212] ${isCurrent ? 'bg-[#FFE600]' : 'bg-[#F8F5EE] hover:bg-white'}`}
            >
              <div className="w-11 h-11 rounded-lg overflow-hidden border border-black bg-[#D8B4FE] shrink-0 flex items-center justify-center shadow-[1px_1px_0px_#121212]">
                {track.cover ? (
                  <img src={track.cover} alt={track.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <Music className="w-5 h-5 text-[#121212]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-black truncate ${isCurrent ? 'text-[#121212]' : 'text-[#121212]'}`}>{track.title}</p>
                <p className="text-[10px] font-mono-code font-bold text-gray-500 truncate flex items-center gap-1">
                  <User className="w-2.5 h-2.5" />
                  {track.artist}{track.durationFormatted ? ` • ${track.durationFormatted}` : ''}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handlePlay(track); }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-black shadow-[1px_1px_0px_#121212] ${playingNow ? 'bg-[#121212] text-[#FFE600]' : 'bg-white text-[#121212] hover:bg-[#FFE600]'}`}
                title={playingNow ? 'Sedang diputar' : 'Putar'}
              >
                {resolvingId === track.videoId ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : playingNow ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5 ml-0.5" />
                )}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(track); }}
                disabled={isDownloading}
                className={`w-8 h-8 rounded-lg border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#121212] ${
                  isDownloaded 
                    ? 'bg-[#38E54D] text-[#121212]' 
                    : isDownloading 
                    ? 'bg-gray-200 text-gray-400' 
                    : 'bg-white text-[#121212] hover:bg-[#38E54D]'
                }`}
                title={isDownloaded ? 'Sudah diunduh' : isDownloading ? 'Mengunduh...' : 'Unduh ke koleksi'}
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isDownloaded ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            
            {/* Download progress bar */}
            {progress && (
              <div className="px-2 py-1.5 bg-white border border-black rounded-lg shadow-[1px_1px_0px_#121212] text-[10px] font-mono-code space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-[#121212]">{progress.status}</span>
                  <span className="text-[#38E54D]">{progress.percent}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden border border-black">
                  <div 
                    className="h-full bg-[#38E54D] transition-all duration-300"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3">
      {renderSearchBar()}
      {searching && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#D8B4FE]/30 border border-black/20">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#121212]" />
          <p className="text-[11px] font-bold text-[#121212]/70">Menghubungi YouTube Music...</p>
        </div>
      )}
      {error && !searching && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white border-2 border-[#FF525E] shadow-[2px_2px_0px_#FF525E]">
          <AlertCircle className="w-4 h-4 text-[#FF525E] shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-[#121212]">{error}</p>
        </div>
      )}
      {results.length > 0 ? renderResults() : renderEmptyState()}
    </div>
  );
}