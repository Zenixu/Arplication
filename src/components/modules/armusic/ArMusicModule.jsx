import React, { useState, useEffect, useRef } from 'react';
import {
  Music, Play, Pause, SkipBack, SkipForward, Search, FolderOpen,
  FileUp, ScanLine, Trash2, ListMusic, Loader2, AlertCircle,
  Shuffle, Repeat, Home, Clock3, Mic, ChevronDown, ChevronRight,
  SlidersHorizontal, Timer, TimerOff, ListPlus, Plus, X, Pencil, Check,
} from 'lucide-react';
import { isNative } from '../../../services/http.js';
import { loadLibrary, saveLibrary, addOrUpdateTrackInLibrary, removeTrack, mergeScanResults, scanLocalAudio, toPlayableSrc, formatTrackDuration, isAudioFilename, } from '../../../services/localMusic.js';
import { publishNowPlaying, setPlaybackState, setPositionState, clearNowPlaying, showNativeNowPlaying, dismissNativeNowPlaying, onNativeMediaControl, nativePlaybackSupported, shouldUseNativePlayback, playNativeQueue, updateNativeQueue, pauseNativePlayback, resumeNativePlayback, nextNativeTrack, prevNativeTrack, stopNativePlayback, seekNativePlayback, getNativePlaybackState, getNativeEqualizer, setNativeEqualizerEnabled, setNativeEqualizerBand, setNativeEqualizerPreset, setNativeSleepTimer, getNativeSleepTimer, formatEqFreq, formatEqGain, formatSleepRemaining, } from '../../../services/armusicNative.js';
import { loadPlaylists, savePlaylists, createPlaylist, renamePlaylist, deletePlaylist, addTrackToPlaylist, removeTrackFromPlaylist, resolvePlaylistTracks, purgeTrackFromPlaylists, isTrackInPlaylist, groupTracksBy, } from '../../../services/playlistManager.js';
import { fetchLyrics, activeLyricIndex, } from '../../../services/lyrics.js';
import { registerBackHandler } from '../../../services/backHandler.js';
import YTMusicWrapper from './YTMusicWrapper.jsx';
import ArMusicUI from './ui/ArMusicUI.jsx';

function filterTracks(tracks, query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return tracks;
  return tracks.filter((t) =>
    `${t.title} ${t.artist} ${t.filename || ''}`.toLowerCase().includes(q)
  );
}

function LyricsPanel({ lyricsState, elapsed, lyricBoxRef }) {
  const { status, synced, plain, instrumental } = lyricsState || {};
  const hasSynced = Array.isArray(synced) && synced.length > 0;
  const idx = hasSynced ? activeLyricIndex(synced, elapsed || 0) : -1;

  // Auto-scroll baris aktif ke tengah panel
  useEffect(() => {
    if (idx < 0) return;
    const box = lyricBoxRef?.current;
    if (!box) return;
    const active = box.querySelector('[data-active="true"]');
    if (active && typeof active.scrollIntoView === 'function') {
      active.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [idx, lyricBoxRef]);

  return (
    <div className="rounded-xl bg-white/5 border border-white/15 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10">
        <Mic className="w-3.5 h-3.5 text-[#FFE600]" />
        <p className="text-[10px] font-mono-code font-black uppercase tracking-wider text-white/70">
          Lirik
        </p>
      </div>
      {status === 'loading' && (
        <div className="flex items-center gap-2 px-3 py-4">
          <Loader2 className="w-4 h-4 animate-spin text-[#FFE600]" />
          <p className="text-xs font-bold text-white/60">Mencari lirik...</p>
        </div>
      )}
      {status === 'notfound' && (
        <p className="px-3 py-4 text-xs font-bold text-white/50">
          Lirik tidak ditemukan untuk lagu ini.
        </p>
      )}
      {status === 'error' && (
        <p className="px-3 py-4 text-xs font-bold text-white/50">
          Gagal memuat lirik. Periksa koneksi lalu ganti lagu untuk coba lagi.
        </p>
      )}
      {status === 'ready' && instrumental && (
        <p className="px-3 py-4 text-xs font-bold text-white/60 italic">
          Lagu instrumental — tidak ada lirik.
        </p>
      )}
      {status === 'ready' && !instrumental && hasSynced && (
        <div ref={lyricBoxRef} className="max-h-56 overflow-y-auto px-3 py-2 space-y-1.5">
          {synced.map((line, i) => {
            const active = i === idx;
            return (
              <p
                key={`${line.t}-${i}`}
                data-active={active ? 'true' : 'false'}
                className={`text-xs leading-relaxed transition-all rounded-md px-2 py-1 ${active ? 'font-black text-[#FFE600] bg-white/10 scale-[1.01]' : 'font-bold text-white/45'}`}
              >
                {line.text}
              </p>
            );
          })}
        </div>
      )}
      {status === 'ready' && !instrumental && !hasSynced && plain && (
        <div className="max-h-56 overflow-y-auto px-3 py-2">
          <p className="text-xs font-bold text-white/70 leading-relaxed whitespace-pre-line">
            {plain}
          </p>
        </div>
      )}
    </div>
  );
}

export default function ArMusicModule({ setActiveTab }) {
  const [tracks, setTracks] = useState(() => loadLibrary());
  const [query, setQuery] = useState('');
  const [currentId, setCurrentId] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatOne, setRepeatOne] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0); // persen 0-100
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [order, setOrder] = useState([]); // index order untuk shuffle
  const [musicView, setMusicView] = useState('semua'); // semua | artis | folder | playlist | ytmusic — sub-navbar ala Spotify
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsState, setLyricsState] = useState({ status: 'idle', synced: [], plain: '', instrumental: false }); // idle | loading | ready | notfound | error
  // Fase 2: EQ + sleep timer + playlist
  const [playlists, setPlaylists] = useState(() => loadPlaylists());
  const [openPlaylistId, setOpenPlaylistId] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingPlaylistId, setEditingPlaylistId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [addToPickTrack, setAddToPickTrack] = useState(null); // track yg mau dimasukkan playlist
  const [groupOpen, setGroupOpen] = useState({}); // artis/folder collapsible: { key: true }
  const [showEq, setShowEq] = useState(false);
  const [eqInfo, setEqInfo] = useState(null);
  const [eqLoading, setEqLoading] = useState(false);
  const [showSleep, setShowSleep] = useState(false);
  const [sleepStatus, setSleepStatus] = useState({ active: false, remainingMs: 0, totalMin: 0 });
  const SLEEP_OPTIONS = [0, 15, 30, 45, 60, 90];

  const showEqRef = useRef(showEq);
  const showSleepRef = useRef(showSleep);
  const addToPickTrackRef = useRef(addToPickTrack);
  const openPlaylistIdRef = useRef(openPlaylistId);

  useEffect(() => { showEqRef.current = showEq; }, [showEq]);
  useEffect(() => { showSleepRef.current = showSleep; }, [showSleep]);
  useEffect(() => { addToPickTrackRef.current = addToPickTrack; }, [addToPickTrack]);
  useEffect(() => { openPlaylistIdRef.current = openPlaylistId; }, [openPlaylistId]);

  useEffect(() => {
    const unregister = registerBackHandler(() => {
      if (showEqRef.current) {
        setShowEq(false);
        return true;
      }
      if (showSleepRef.current) {
        setShowSleep(false);
        return true;
      }
      if (addToPickTrackRef.current) {
        setAddToPickTrack(null);
        return true;
      }
      if (openPlaylistIdRef.current) {
        setOpenPlaylistId(null);
        return true;
      }
      return false;
    });
    return () => unregister();
  }, []);

  const audioRef = useRef(null);
  const fileRef = useRef(null);
  const endRef = useRef(false);
  const lyricBoxRef = useRef(null);
  const lyricReqRef = useRef(0);
  // Routing native-first (ExoPlayer service anti-kill):
  // nativeModeRef=true → audio dimainkan service, WebView <audio> idle (fallback saja).
  const nativeModeRef = useRef(false);
  const nativeSupportRef = useRef(null); // null=belum deteksi, bool=hasil nativePlaybackSupported()
  const effectiveQueueRef = useRef([]); // snapshot list yang dikirim ke native (peta index→id)
  const currentIdRef = useRef(null);
  const pollNativeOnceRef = useRef(null);
  // Refs agar MediaSession action handler selalu memanggil versi terbaru
  const togglePlayRef = useRef(null);
  const nextTrackRef = useRef(null);
  const prevTrackRef = useRef(null);
  const seekToRef = useRef(null);
  const stopRef = useRef(null);
  const toggleShuffleRef = useRef(null);

  const filtered = filterTracks(tracks, query);
  const current = tracks.find((t) => t.id === currentId) || null;

  const persist = (next) => {
    setTracks(next);
    saveLibrary(next);
  };

  // Boot audio element sekali — SINGLETON global agar lagu TIDAK mati
  // saat pindah tab / komponen re-mount. Cleanup hanya lepas listener,
  // TIDAK pernah pause di sini (pause hanya via aksi user / stopPlayback).
  useEffect(() => {
    let audio = globalThis.__arMusicAudio || null;
    if (!audio) {
      audio = document.createElement('audio');
      audio.preload = 'metadata';
      globalThis.__arMusicAudio = audio;
    }
    audioRef.current = audio;
    const onTime = () => setElapsed(audio.currentTime || 0);
    const onMeta = () => setDuration(audio.duration && Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnd = () => { endRef.current = true; setPlaying(false); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    // Sinkronkan state awal kalau audio sudah bunyi sebelum mount (mis. balik ke tab music)
    if (!audio.paused) setPlaying(true);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
      audioRef.current = null;
    };
  }, []);

  // Auto-next setelah track selesai (jalur WebView saja — native memakai
  // auto-advance ExoPlayer + event 'advanced').
  useEffect(() => {
    if (nativeModeRef.current) { endRef.current = false; return; }
    if (!endRef.current) return;
    endRef.current = false;
    if (repeatOne && current) {
      playTrack(current, true);
      return;
    }
    nextTrack(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // Daftar efektif = hasil search (bila aktif) atau seluruh library.
  const effectiveList = () => (filtered.length > 0 ? filtered : tracks);

  // Terapkan urutan shuffle ke list (sinkron dgn state order).
  const buildOrdered = (list, useShuffle) => {
    if (!useShuffle) return list;
    const ord = order.length === list.length ? order : pickFromList(list);
    if (order.length !== list.length) setOrder(ord);
    return ord.map((i) => list[i]).filter(Boolean);
  };

  // Publikasikan metadata ke Web MediaSession + state playback (kedua mode).
  const syncMetaFor = (track, isPlaying) => {
    setPlaybackState(isPlaying);
    if (!track) return;
    publishNowPlaying({
      title: track.title,
      artist: track.artist,
      album: track.folder || 'ArMusic',
      onPlay: () => togglePlayRef.current?.(),
      onPause: () => togglePlayRef.current?.(),
      onPrev: () => prevTrackRef.current?.(),
      onNext: () => nextTrackRef.current?.(),
      onStop: () => stopRef.current?.(),
      onShuffle: () => toggleShuffleRef.current?.(),
      onSeek: (sec) => seekToRef.current?.(sec),
    });
  };

  // Poll sekali state ExoPlayer → sinkronkan UI (posisi, index, playing).
  const pollNativeOnce = async () => {
    const s = await getNativePlaybackState();
    if (!s) return;
    const q = effectiveQueueRef.current;
    if (s.queueSize > 0 && s.index >= 0 && s.index < q.length) {
      const id = q[s.index]?.id ?? q[s.index];
      if (id && id !== currentIdRef.current) {
        currentIdRef.current = id;
        setCurrentId(id);
        setElapsed(0);
      }
    }
    setPlaying(s.playing);
    setPlaybackState(s.playing);
    setElapsed(s.positionMs / 1000);
    if (s.durationMs > 0) setDuration(s.durationMs / 1000);
  };

  // Jalur WebView <audio> — fallback (blob:/data:, browser, atau native gagal).
  const playViaWeb = async (track, src, forceReplay = false) => {
    nativeModeRef.current = false;
    try {
      const audio = audioRef.current;
      if (currentId !== track.id || forceReplay) {
        audio.src = src;
        currentIdRef.current = track.id;
        setCurrentId(track.id);
        setElapsed(0);
        setDuration(track.durationSec || 0);
      }
      await audio.play();
      setPlaying(true);
      syncMetaFor(track, true);
      showNativeNowPlaying({
        title: track.title, artist: track.artist,
        album: track.folder || 'ArMusic', playing: true,
      });
    } catch (e) {
      setError(`Gagal memutar: ${e?.message || e}`);
      setPlaying(false);
    }
  };

  const playTrack = async (track, forceReplay = false, queueOverride = null) => {
    if (!track || track.unavailable) return;
    setError(null);
    const src = toPlayableSrc(track.uri);
    if (!src) {
      setError(`File "${track.filename || track.title}" tidak bisa dibuka. Pilih ulang dari storage.`);
      return;
    }
    // Deteksi dukungan ExoPlayer sekali per sesi
    if (nativeSupportRef.current === null) {
      try {
        nativeSupportRef.current = await nativePlaybackSupported();
      } catch {
        nativeSupportRef.current = false;
      }
    }
    const useNative = shouldUseNativePlayback({
      nativeSupported: nativeSupportRef.current === true,
      uri: track.uri,
    });
    if (!useNative) {
      await playViaWeb(track, src, forceReplay);
      return;
    }
    // Lagu sama sedang dipegang native → lanjutkan saja
    if (nativeModeRef.current && currentIdRef.current === track.id && !forceReplay) {
      await resumeNativePlayback();
      setPlaying(true);
      setPlaybackState(true);
      return;
    }
    // Matikan fallback WebView agar tidak bunyi ganda
    try { audioRef.current?.pause(); } catch { /* abaikan */ }
    // queueOverride dipakai putar-dari-playlist: queue native = isi playlist,
    // bukan list search/library aktif.
    const baseList = (Array.isArray(queueOverride) && queueOverride.length > 0)
      ? queueOverride
      : effectiveList();
    let ordered = buildOrdered(baseList, shuffle);
    let idx = ordered.findIndex((t) => t.id === track.id);
    if (idx < 0) { ordered = [track, ...ordered]; idx = 0; }
    const ok = await playNativeQueue(ordered, idx, { repeatOne });
    if (ok) {
      nativeModeRef.current = true;
      effectiveQueueRef.current = ordered;
      currentIdRef.current = track.id;
      setCurrentId(track.id);
      setElapsed(0);
      setDuration(track.durationSec || 0);
      setPlaying(true);
      syncMetaFor(track, true);
      // Notifikasi kini milik service — JANGAN showNativeNowPlaying (legacy meta-only).
      return;
    }
    // Native gagal terkirim → fallback WebView
    setError('Pemutar native gagal — memakai pemutar WebView.');
    await playViaWeb(track, src, forceReplay);
  };

  const togglePlay = () => {
    if (nativeModeRef.current) {
      if (playing) {
        pauseNativePlayback();
        setPlaying(false);
        setPlaybackState(false);
      } else if (current) {
        resumeNativePlayback();
        setPlaying(true);
        setPlaybackState(true);
        pollNativeOnceRef.current?.();
      } else if (filtered.length > 0) {
        playTrack(filtered[0]);
      }
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      setPlaybackState(false);
      showNativeNowPlaying({
        title: current.title, artist: current.artist,
        album: current.folder || 'ArMusic', playing: false,
      });
    } else if (current) {
      audio.play().then(() => {
        setPlaying(true);
        setPlaybackState(true);
        showNativeNowPlaying({
          title: current.title, artist: current.artist,
          album: current.folder || 'ArMusic', playing: true,
        });
        publishNowPlaying({
          title: current.title,
          artist: current.artist,
          album: current.folder || 'ArMusic',
          onPlay: () => togglePlayRef.current?.(),
          onPause: () => togglePlayRef.current?.(),
          onPrev: () => prevTrackRef.current?.(),
          onNext: () => nextTrackRef.current?.(),
          onStop: () => stopRef.current?.(),
          onShuffle: () => toggleShuffleRef.current?.(),
          onSeek: (sec) => seekToRef.current?.(sec),
        });
      }).catch((e) => setError(`Gagal memutar: ${e?.message || e}`));
    } else if (filtered.length > 0) {
      playTrack(filtered[0]);
    }
  };

  const pickFromList = (fromFiltered) => (shuffle
    ? [...Array(fromFiltered.length).keys()].sort(() => Math.random() - 0.5)
    : [...Array(fromFiltered.length).keys()]);

  const nextTrack = (auto = false) => {
    if (nativeModeRef.current) {
      if (auto) return; // auto-advance dipegang ExoPlayer; event 'advanced' sinkronkan UI
      nextNativeTrack();
      // Optimistic UI — poll koreksi posisi/index aktual
      setTimeout(() => pollNativeOnceRef.current?.(), 350);
      return;
    }
    const list = filtered.length > 0 ? filtered : tracks;
    if (!list.length) return;
    const idx = list.findIndex((t) => t.id === currentId);
    let next;
    if (shuffle) {
      const ord = order.length === list.length ? order : pickFromList(list);
      if (order.length !== list.length) setOrder(ord);
      const pos = ord.indexOf(idx);
      next = list[ord[(pos + 1) % ord.length]];
    } else {
      next = list[(idx + 1) % list.length];
    }
    if (auto && repeatOne && current) return playTrack(current, true);
    playTrack(next);
  };

  const prevTrack = () => {
    if (nativeModeRef.current) {
      prevNativeTrack();
      setTimeout(() => pollNativeOnceRef.current?.(), 350);
      return;
    }
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const list = filtered.length > 0 ? filtered : tracks;
    if (!list.length) return;
    const idx = list.findIndex((t) => t.id === currentId);
    const prev = list[(idx - 1 + list.length) % list.length];
    playTrack(prev);
  };

  const handleSeek = (e) => {
    const pct = Number(e.target.value);
    setProgress(pct);
    if (nativeModeRef.current) {
      if (duration > 0) {
        const sec = (pct / 100) * duration;
        setElapsed(sec);
        seekNativePlayback(sec * 1000);
      }
      return;
    }
    const audio = audioRef.current;
    if (audio && duration > 0) {
      audio.currentTime = (pct / 100) * duration;
    }
  };

  const seekTo = (sec) => {
    if (nativeModeRef.current) {
      if (Number.isFinite(sec) && duration > 0) {
        const clamped = Math.min(Math.max(0, sec), duration);
        setElapsed(clamped);
        seekNativePlayback(clamped * 1000);
      }
      return;
    }
    const audio = audioRef.current;
    if (audio && Number.isFinite(sec) && duration > 0) {
      audio.currentTime = Math.min(Math.max(0, sec), duration);
    }
  };

  const stopPlayback = () => {
    if (nativeModeRef.current) {
      stopNativePlayback();
      nativeModeRef.current = false;
      effectiveQueueRef.current = [];
      setPlaying(false);
      setPlaybackState(false);
      clearNowPlaying();
      try { localStorage.removeItem('armusic-native-queue'); } catch { /* abaikan */ }
      return;
    }
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
    setPlaybackState(false);
    dismissNativeNowPlaying();
    clearNowPlaying();
  };

  const toggleShuffle = () => {
    const nextVal = !shuffle;
    setShuffle(nextVal);
    // Sinkronkan urutan ke ExoPlayer tanpa memutus lagu aktif
    if (nativeModeRef.current && effectiveQueueRef.current.length > 0) {
      let target;
      if (nextVal) {
        target = [...effectiveQueueRef.current].sort(() => Math.random() - 0.5);
        const curId = currentIdRef.current;
        if (curId) {
          const at = target.findIndex((t) => t.id === curId);
          if (at > 0) { const [c] = target.splice(at, 1); target.unshift(c); }
        }
      } else {
        // Kembali ke urutan library/search semula
        const base = effectiveList();
        target = base.filter((t) => effectiveQueueRef.current.some((q) => q.id === t.id));
        if (target.length !== effectiveQueueRef.current.length) {
          target = effectiveQueueRef.current; // fallback aman
        }
      }
      effectiveQueueRef.current = target;
      updateNativeQueue(target, -1, repeatOne);
    }
  };

  const toggleRepeatOne = () => {
    const nextVal = !repeatOne;
    setRepeatOne(nextVal);
    if (nativeModeRef.current && effectiveQueueRef.current.length > 0) {
      updateNativeQueue(effectiveQueueRef.current, -1, nextVal);
    }
  };

  // Terima event dari service + aksi tombol notifikasi/lockscreen/headset.
  // Service SUDAH mengeksekusi perintah secara native — JS hanya sinkronkan UI.
  useEffect(() => {
    const off = onNativeMediaControl((ev) => {
      const action = typeof ev === 'string' ? ev : ev?.action;
      if (!nativeModeRef.current) {
        if (action === 'toggle') togglePlayRef.current?.();
        else if (action === 'next') nextTrackRef.current?.();
        else if (action === 'prev') prevTrackRef.current?.();
        else if (action === 'stop') stopRef.current?.();
        return;
      }
      // Mode native: service sudah eksekusi, JS sinkron UI via poll.
      if (action === 'stop') { stopRef.current?.(); return; }
      if (action === 'sleep-ended' || action === 'sleepended') {
        setPlaying(false);
        setPlaybackState(false);
        refreshSleepStatus();
        return;
      }
      if (action === 'queue-ended' || action === 'queueended') {
        setPlaying(false);
        setPlaybackState(false);
        return;
      }
      if (action === 'error') {
        setError(typeof ev === 'object' && ev?.message ? String(ev.message) : 'Pemutar native error.');
        return;
      }
      if (action === 'advanced' && typeof ev === 'object' && ev?.index != null) {
        const q = effectiveQueueRef.current;
        const item = q[Number(ev.index)];
        const id = item?.id ?? item;
        if (id && id !== currentIdRef.current) {
          currentIdRef.current = id;
          setCurrentId(id);
          setElapsed(0);
          setPlaying(true);
          setPlaybackState(true);
          const track = tracks.find((t) => t.id === id);
          if (track) syncMetaFor(track, true);
        }
      }
      // toggle/next/prev → poll koreksi state aktual
      setTimeout(() => pollNativeOnceRef.current?.(), 250);
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sinkronkan refs agar handler notif/lockscreen tak pernah stale
  useEffect(() => {
    togglePlayRef.current = togglePlay;
    nextTrackRef.current = nextTrack;
    prevTrackRef.current = prevTrack;
    seekToRef.current = seekTo;
    stopRef.current = stopPlayback;
    toggleShuffleRef.current = toggleShuffle;
    pollNativeOnceRef.current = pollNativeOnce;
  });

  // Polling posisi ExoPlayer tiap 1 detik saat mode native agar progress bar,
  // timer, dan lirik tetap hidup walau WebView di-background.
  useEffect(() => {
    if (!playing || !nativeModeRef.current) return undefined;
    const t = setInterval(() => { pollNativeOnceRef.current?.(); }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, currentId]);

  // Progress bar di notif lockscreen/shade
  useEffect(() => {
    if (current && playing && duration > 0) {
      setPositionState({ duration, position: elapsed, playbackRate: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  // Ambil lirik tiap ganti lagu (cache-first, batalkan request basi)
  useEffect(() => {
    if (!current) {
      setLyricsState({ status: 'idle', synced: [], plain: '', instrumental: false });
      return;
    }
    const reqId = ++lyricReqRef.current;
    setLyricsState({ status: 'loading', synced: [], plain: '', instrumental: false });
    fetchLyrics({
      artist: current.artist,
      title: current.title,
      durationSec: current.durationSec || duration || 0,
    }).then((res) => {
      if (lyricReqRef.current !== reqId) return; // lagu sudah ganti — abaikan
      if (res?.found) {
        setLyricsState({
          status: 'ready',
          synced: res.synced || [],
          plain: res.plain || '',
          instrumental: Boolean(res.instrumental),
        });
      } else {
        setLyricsState({ status: 'notfound', synced: [], plain: '', instrumental: false });
      }
    }).catch(() => {
      if (lyricReqRef.current !== reqId) return;
      setLyricsState({ status: 'error', synced: [], plain: '', instrumental: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  useEffect(() => {
    if (duration > 0) setProgress((elapsed / duration) * 100);
  }, [elapsed, duration]);

  const handleScan = async () => {
    setScanning(true);
    setScanMsg('');
    setError(null);
    try {
      const scanned = await scanLocalAudio({
        onProgress: (n, name) => setScanMsg(`${n} file — ${name}`),
      });
      persist(mergeScanResults(loadLibrary(), scanned));
      setScanMsg(scanned.length > 0
        ? `Selesai: ${scanned.length} lagu ditemukan.`
        : 'Selesai: tidak ada file audio di folder Aruthtale/Music.');
    } catch (e) {
      setError(e?.message || 'Scan gagal.');
    } finally {
      setScanning(false);
    }
  };

  const handlePickFiles = (e) => {
    const files = Array.from(e.target.files || []).filter((f) => isAudioFilename(f.name));
    if (!files.length) return;
    const additions = files.map((f) => {
      const base = f.name.replace(/\.[a-zA-Z0-9]+$/, '').replace(/_+/g, ' ').trim();
      return {
        id: `pick:${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: base || f.name,
        artist: 'File Lokal',
        filename: f.name,
        folder: 'Dipilih manual',
        uri: URL.createObjectURL(f),
        durationSec: 0,
        source: 'pick',
      };
    });
    persist([...additions, ...loadLibrary()].slice(0, 500));
    e.target.value = '';
  };

  const handleRemove = (id) => {
    const target = tracks.find((t) => t.id === id);
    if (target && String(target.uri || '').startsWith('blob:')) {
      try { URL.revokeObjectURL(target.uri); } catch { /* abaikan */ }
    }
    if (id === currentId) {
      if (nativeModeRef.current) {
        // Keluarkan dari queue native; bila tersisa lanjutkan, bila habis stop.
        const rest = effectiveQueueRef.current.filter((t) => t.id !== id);
        if (rest.length > 0) {
          effectiveQueueRef.current = rest;
          updateNativeQueue(rest, 0, repeatOne).then(() => pollNativeOnceRef.current?.());
        } else {
          stopPlayback();
        }
        currentIdRef.current = rest[0]?.id ?? null;
        setCurrentId(rest[0]?.id ?? null);
      } else {
        audioRef.current?.pause();
        setPlaying(false);
        setPlaybackState(false);
        dismissNativeNowPlaying();
        clearNowPlaying();
        currentIdRef.current = null;
        setCurrentId(null);
      }
    } else if (nativeModeRef.current) {
      // Hapus lagu lain dari queue native juga
      const rest = effectiveQueueRef.current.filter((t) => t.id !== id);
      if (rest.length !== effectiveQueueRef.current.length) {
        effectiveQueueRef.current = rest;
        updateNativeQueue(rest, -1, repeatOne);
      }
    }
    persist(removeTrack(loadLibrary(), id));
    // Sinkron: keluarkan dari semua playlist agar tak ada track yatim
    setPlaylists((prev) => savePlaylists(purgeTrackFromPlaylists(prev, id)));
  };

  // ---------------------------------------------------------- Fase 2: playlist

  const persistPlaylists = (next) => {
    const clean = savePlaylists(next);
    setPlaylists(clean);
    return clean;
  };

  const handleCreatePlaylist = () => {
    const { next } = createPlaylist(playlists, newPlaylistName);
    persistPlaylists(next);
    setNewPlaylistName('');
    const created = next[next.length - 1];
    if (created) setOpenPlaylistId(created.id);
  };

  const handleRenamePlaylist = (id) => {
    persistPlaylists(renamePlaylist(playlists, id, editingName));
    setEditingPlaylistId(null);
    setEditingName('');
  };

  const handleDeletePlaylist = (id) => {
    persistPlaylists(deletePlaylist(playlists, id));
    if (openPlaylistId === id) setOpenPlaylistId(null);
  };

  const handleAddTrackToPlaylist = (playlistId, trackId) => {
    persistPlaylists(addTrackToPlaylist(playlists, playlistId, trackId));
    setAddToPickTrack(null);
  };

  const handleRemoveTrackFromPlaylist = (playlistId, trackId) => {
    persistPlaylists(removeTrackFromPlaylist(playlists, playlistId, trackId));
  };

  const handlePlayPlaylist = (playlistId) => {
    const list = resolvePlaylistTracks(playlists, playlistId, tracks);
    if (list.length > 0) playTrack(list[0], false, list);
  };

  // ---------------------------------------------------------- Fase 2: sleep timer

  const refreshSleepStatus = async () => {
    const s = await getNativeSleepTimer().catch(() => null);
    if (s) setSleepStatus(s);
    else setSleepStatus({ active: false, remainingMs: 0, totalMin: 0 });
  };

  const handleSetSleep = async (minutes) => {
    await setNativeSleepTimer(minutes).catch(() => {});
    await refreshSleepStatus();
    setShowSleep(false);
  };

  // ---------------------------------------------------------- Fase 2: equalizer

  const refreshEqInfo = async () => {
    setEqLoading(true);
    try {
      if (isNative()) {
        const info = await getNativeEqualizer().catch(() => null);
        if (info) setEqInfo(info);
      } else {
        setEqInfo((prev) => prev || {
          supported: true,
          attached: true,
          enabled: true,
          bandCount: 5,
          minGainMb: -1500,
          maxGainMb: 1500,
          centerFreqs: [60000, 230000, 910000, 3600000, 14000000],
          gains: [0, 0, 0, 0, 0],
          presetCount: 5,
          presetNames: ['Flat', 'Bass Boost', 'Treble Boost', 'Vocal', 'Rock'],
          presetIndex: 0,
        });
      }
    } finally {
      setEqLoading(false);
    }
  };

  const handleEqToggle = async () => {
    const nextVal = !(eqInfo?.enabled ?? false);
    await setNativeEqualizerEnabled(nextVal).catch(() => {});
    setEqInfo((prev) => (prev ? { ...prev, enabled: nextVal } : prev));
  };

  const handleEqBand = async (band, gainMb) => {
    setEqInfo((prev) => {
      if (!prev) return prev;
      const gains = [...(prev.gains || [])];
      gains[band] = gainMb;
      return { ...prev, gains, presetIndex: -1, enabled: true };
    });
    await setNativeEqualizerBand(band, gainMb).catch(() => {});
  };

  const handleEqPreset = async (preset) => {
    if (isNative()) {
      await setNativeEqualizerPreset(preset).catch(() => {});
      await refreshEqInfo();
    } else {
      const presetsMap = [
        [0, 0, 0, 0, 0], // Flat
        [600, 400, 0, -200, -300], // Bass Boost
        [-200, 0, 100, 400, 600], // Treble Boost
        [-100, 200, 500, 200, -100], // Vocal
        [500, 200, -100, 300, 500], // Rock
      ];
      const gains = presetsMap[preset] || [0, 0, 0, 0, 0];
      setEqInfo((prev) => (prev ? { ...prev, gains, presetIndex: preset, enabled: true } : prev));
    }
  };

  const handleEqReset = async () => {
    if (isNative()) {
      for (let b = 0; b < (eqInfo?.bandCount || 5); b++) {
        await setNativeEqualizerBand(b, 0).catch(() => {});
      }
      await refreshEqInfo();
    } else {
      setEqInfo((prev) => (prev ? { ...prev, gains: [0, 0, 0, 0, 0], presetIndex: 0 } : prev));
    }
  };

  // Countdown badge timer — refresh tiap 5 detik saat aktif agar label hidup.
  useEffect(() => {
    if (!sleepStatus.active) return undefined;
    const t = setInterval(() => { refreshSleepStatus(); }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepStatus.active]);

  // Ambil status timer sekali saat modul dibuka (native tahan restart service).
  useEffect(() => {
    refreshSleepStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLoadedMeta = (e) => {
    // Simpan durasi hasil file-picker ke library
    const secs = Math.floor(e.target.duration || 0);
    if (secs > 0 && current && !current.durationSec) {
      const next = tracks.map((t) => (t.id === current.id ? { ...t, durationSec: secs } : t));
      persist(next);
    }
  };

  const renderTrackCard = (track) => {
    const isCurrent = track.id === currentId;
    return (
      <div
        key={track.id}
        onClick={() => playTrack(track)}
        className={`nb-card p-2.5 flex items-center gap-2.5 transition-all cursor-pointer shadow-[1.5px_1.5px_0px_#121212] ${isCurrent ? 'bg-[#FFE600]' : 'bg-[#F8F5EE] hover:bg-white'}`}
      >
        <div className={`w-9 h-9 rounded-lg border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#121212] ${isCurrent ? 'bg-[#121212]' : 'bg-[#D8B4FE]'}`}>
          {isCurrent && playing
            ? <Pause className="w-4 h-4 text-[#FFE600]" />
            : <Play className={`w-4 h-4 ${isCurrent ? 'text-[#FFE600]' : 'text-[#121212]'}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-[#121212] truncate">{track.title}</p>
          <p className="text-[10px] font-mono-code font-bold text-gray-500 truncate">
            {track.artist}{track.folder ? ` • ${track.folder}` : ''}
          </p>
        </div>
        {track.durationSec > 0 && (
          <span className="text-[10px] font-mono-code font-bold text-gray-500 shrink-0">
            {formatTrackDuration(track.durationSec)}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setAddToPickTrack(track); }}
          className="w-7 h-7 rounded-lg bg-white hover:bg-yellow-100 border border-black flex items-center justify-center text-[#121212] transition-colors shadow-[1px_1px_0px_#121212] shrink-0"
          title="Tambah ke playlist"
        >
          <ListPlus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleRemove(track.id); }}
          className="w-7 h-7 rounded-lg bg-white hover:bg-red-100 border border-black flex items-center justify-center text-red-600 transition-colors shadow-[1px_1px_0px_#121212] shrink-0"
          title="Hapus dari koleksi"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  // Antrean yang dipakai Now Playing (mengikuti urutan shuffle bila aktif).
  const queueList = (shuffle && order.length === tracks.length)
    ? order.map((i) => tracks[i]).filter(Boolean)
    : (filtered.length > 0 ? filtered : tracks);
  const queueIndex = Math.max(0, queueList.findIndex((t) => t.id === currentId));

  return (
    <ArMusicUI
      tracks={tracks}
      playlists={playlists}
      current={current}
      currentId={currentId}
      playing={playing}
      elapsed={elapsed}
      duration={duration}
      shuffle={shuffle}
      repeatOne={repeatOne}
      scanMsg={scanMsg}
      scanning={scanning}
      error={error}
      lyricsState={lyricsState}
      eqInfo={eqInfo}
      eqLoading={eqLoading}
      sleepStatus={sleepStatus}
      query={query}
      setQuery={setQuery}
      playTrack={playTrack}
      togglePlay={togglePlay}
      nextTrack={nextTrack}
      prevTrack={prevTrack}
      seekTo={seekTo}
      toggleShuffle={toggleShuffle}
      toggleRepeatOne={toggleRepeatOne}
      handleScan={handleScan}
      handlePickFiles={handlePickFiles}
      handleRemove={handleRemove}
      handleCreatePlaylist={handleCreatePlaylist}
      handleRenamePlaylist={handleRenamePlaylist}
      handleDeletePlaylist={handleDeletePlaylist}
      handleAddTrackToPlaylist={handleAddTrackToPlaylist}
      handleRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
      handlePlayPlaylist={handlePlayPlaylist}
      handleEqToggle={handleEqToggle}
      handleEqBand={handleEqBand}
      handleEqPreset={handleEqPreset}
      handleEqReset={handleEqReset}
      handleSetSleep={handleSetSleep}
      refreshEqInfo={refreshEqInfo}
      setActiveTab={setActiveTab}
      onLoadedMeta={onLoadedMeta}
      toPlayableSrc={toPlayableSrc}
      formatTrackDuration={formatTrackDuration}
      queue={queueList}
      queueIndex={queueIndex}
      onJumpQueue={(i) => { const t = queueList[i]; if (t) playTrack(t, false, queueList); }}
      pl={{ newPlaylistName, setNewPlaylistName, editingName, setEditingName, editingPlaylistId, setEditingPlaylistId }}
      onYtDownload={(metadata) => console.log('YT Music track:', metadata?.title)}
    />
  );
}
