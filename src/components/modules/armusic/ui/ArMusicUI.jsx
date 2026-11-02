import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Home, Search, Library, Play, Pause, Plus, Upload, RefreshCw, FolderOpen,
  User, Disc3, ListMusic, Trash2, ListPlus, X, ChevronRight, Music2,
  SlidersHorizontal, Timer, Check, Mic2,
} from 'lucide-react';
import YTMusicWrapper from '../YTMusicWrapper.jsx';
import NowPlaying from './NowPlaying.jsx';

/**
 * ArMusicUI — lapisan tampilan baru untuk modul ArMusic.
 * Fungsional ala Spotify (Beranda / Cari / Pustaka + mini player + Now Playing
 * dengan tab Pemutar, Lirik, Antrean), visual tetap neubrutalist.
 *
 * Semua logika audio (native ExoPlayer, queue, media control, EQ, sleep timer)
 * tetap dipegang ArMusicModule — komponen ini murni presentasi + state UI.
 */

const ACCENTS = ['#FFE600', '#38E54D', '#D8B4FE', '#FF70A6', '#C4FAF8', '#FF525E'];

function fmtDur(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function accentFor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 9973;
  return ACCENTS[h % ACCENTS.length];
}

function coverOf(t) {
  return t?.cover || t?.thumbnail || t?.artwork || null;
}

/* ---------------------------------------------------------------- primitives */

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-[#121212]/45" onClick={onClose} aria-label="Tutup" />
      <div className="relative w-full max-w-4xl mx-auto bg-[#F8F5EE] border-t-[3px] border-x-[3px] border-[#121212] rounded-t-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_0_#121212] max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black uppercase tracking-tight">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white border-2 border-[#121212] shadow-[1.5px_1.5px_0_#121212] flex items-center justify-center" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TrackRow({ track, active, playing, onPlay, onAdd, onRemove, durationLabel }) {
  return (
    <div
      onClick={onPlay}
      className={`group flex items-center gap-2.5 p-2 rounded-xl border-2 cursor-pointer transition-all ${
        active
          ? 'bg-[#FFE600] border-[#121212] shadow-[2px_2px_0_#121212]'
          : 'bg-white border-[#121212]/10 hover:border-[#121212] hover:shadow-[2px_2px_0_#121212]'
      }`}
    >
      <div
        className="w-10 h-10 rounded-lg border-2 border-[#121212] flex items-center justify-center shrink-0 overflow-hidden"
        style={{ background: active ? '#121212' : accentFor(track.title) }}
      >
        {coverOf(track) ? (
          <img src={coverOf(track)} alt="" className="w-full h-full object-cover" />
        ) : active && playing ? (
          <Pause className="w-4 h-4 text-[#FFE600]" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black truncate">{track.title}</p>
        <p className="text-[10px] font-mono-code font-bold text-[#121212]/50 truncate">
          {track.artist || 'Artis Tidak Dikenal'}{track.folder ? ` • ${track.folder}` : ''}
        </p>
      </div>
      {durationLabel ? (
        <span className="text-[10px] font-mono-code font-bold text-[#121212]/40 shrink-0">{durationLabel}</span>
      ) : null}
      {onAdd && (
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(track); }}
          className="w-7 h-7 rounded-lg bg-white border border-[#121212] shadow-[1px_1px_0_#121212] flex items-center justify-center shrink-0"
          aria-label="Tambah ke playlist"
        >
          <ListPlus className="w-3.5 h-3.5" />
        </button>
      )}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(track.id); }}
          className="w-7 h-7 rounded-lg bg-white border border-[#121212] shadow-[1px_1px_0_#121212] flex items-center justify-center text-[#FF525E] shrink-0"
          aria-label="Hapus"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function MiniPlayer({ track, playing, elapsed, duration, onToggle, onNext, onOpen }) {
  if (!track) return null;
  const pct = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;
  return (
    <div className="fixed left-0 right-0 z-50 px-2 bottom-[calc(4.3rem+env(safe-area-inset-bottom,0px))]">
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-white border-[2.5px] border-[#121212] rounded-2xl shadow-[3px_3px_0_#121212] overflow-hidden">
          <div className="h-1 bg-[#F1EFE9]">
            <div className="h-full bg-[#38E54D]" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center gap-2 p-1.5">
            <button onClick={onOpen} className="flex items-center gap-2 flex-1 min-w-0 text-left">
              <div className="w-9 h-9 rounded-lg border-2 border-[#121212] overflow-hidden shrink-0 flex items-center justify-center" style={{ background: accentFor(track.title) }}>
                {coverOf(track) ? <img src={coverOf(track)} alt="" className="w-full h-full object-cover" /> : <Music2 className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black truncate leading-tight">{track.title}</p>
                <p className="text-[11px] font-mono-code font-bold text-[#121212]/50 truncate">{track.artist}</p>
              </div>
            </button>
            <button onClick={onToggle} className="w-9 h-9 rounded-lg bg-[#121212] text-[#FFE600] flex items-center justify-center shrink-0" aria-label={playing ? 'Jeda' : 'Putar'}>
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button onClick={onNext} className="w-9 h-9 rounded-lg bg-white border-2 border-[#121212] shadow-[1.5px_1.5px_0_#121212] flex items-center justify-center shrink-0" aria-label="Berikutnya">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- main */

export default function ArMusicUI(props) {
  const {
    tracks = [], playlists = [], current, currentId, playing,
    elapsed = 0, duration = 0, shuffle, repeatOne,
    scanMsg, scanning, error, lyricsState, eqInfo, eqLoading, sleepStatus,
    query = '', setQuery,
    playTrack, togglePlay, nextTrack, prevTrack, seekTo,
    toggleShuffle, toggleRepeatOne,
    handleScan, handlePickFiles, handleRemove,
    handleCreatePlaylist, handleRenamePlaylist, handleDeletePlaylist,
    handleAddTrackToPlaylist, handleRemoveTrackFromPlaylist, handlePlayPlaylist,
    handleEqToggle, handleEqBand, handleEqPreset, handleEqReset, handleSetSleep,
    refreshEqInfo,
    setActiveTab, onLoadedMeta, toPlayableSrc, formatTrackDuration,
    queue = [], queueIndex = 0, onJumpQueue,
    pl = {},
    onYtDownload,
  } = props;

  const [tab, setTab] = useState('beranda');
  const [libTab, setLibTab] = useState('lagu');
  const [npOpen, setNpOpen] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [addTarget, setAddTarget] = useState(null);
  const fileRef = useRef(null);

  // Tombol back Android / browser: tutup sheet dulu, lalu Now Playing.
  useEffect(() => {
    if (!npOpen && !sheet) return undefined;
    const onPop = () => {
      if (sheet) setSheet(null);
      else setNpOpen(false);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [npOpen, sheet]);

  const q = String(query || '').trim().toLowerCase();
  const localResults = useMemo(() => {
    if (!q) return tracks;
    return tracks.filter((t) => `${t.title} ${t.artist} ${t.folder || ''} ${t.filename || ''}`.toLowerCase().includes(q));
  }, [tracks, q]);

  const artists = useMemo(() => {
    const map = new Map();
    tracks.forEach((t) => {
      const key = t.artist || 'Artis Tidak Dikenal';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    });
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [tracks]);

  const folders = useMemo(() => {
    const map = new Map();
    tracks.forEach((t) => {
      const key = t.folder || 'Tanpa folder';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    });
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [tracks]);

  const recent = useMemo(() => tracks.slice(-8).reverse(), [tracks]);
  const durLabel = (t) => (t.durationSec > 0 ? (formatTrackDuration ? formatTrackDuration(t.durationSec) : fmtDur(t.durationSec)) : '');

  const openSheet = (name) => {
    setSheet(name);
    if (name === 'eq') refreshEqInfo?.();
  };

  const playNow = (track) => {
    playTrack?.(track);
    setNpOpen(true);
  };

  /* ---------------------------------------------------------------- beranda */

  const Beranda = (
    <div className="space-y-4">
      {current ? (
        <div className="p-3.5 bg-[#121212] rounded-2xl border-[2.5px] border-[#121212] shadow-[4px_4px_0_#38E54D]">
          <p className="text-[11px] font-mono-code font-black uppercase tracking-widest text-[#FFE600]/80 mb-2">Lanjutkan mendengarkan</p>
          <div className="flex items-center gap-3">
            <button onClick={() => setNpOpen(true)} className="w-14 h-14 rounded-xl border-2 border-white/20 overflow-hidden shrink-0 flex items-center justify-center" style={{ background: accentFor(current.title) }}>
              {coverOf(current) ? <img src={coverOf(current)} alt="" className="w-full h-full object-cover" /> : <Music2 className="w-6 h-6" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white truncate">{current.title}</p>
              <p className="text-[10px] font-mono-code font-bold text-white/50 truncate">{current.artist}</p>
            </div>
            <button onClick={togglePlay} className="w-11 h-11 rounded-xl bg-[#FFE600] border-2 border-white/20 flex items-center justify-center shrink-0" aria-label={playing ? 'Jeda' : 'Putar'}>
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-[#D8B4FE] rounded-2xl border-[2.5px] border-[#121212] shadow-[4px_4px_0_#121212]">
          <p className="text-[11px] font-mono-code font-black uppercase tracking-widest text-[#121212]/50 mb-1">Belum ada lagu diputar</p>
          <h2 className="text-lg font-black leading-tight mb-2">Mulai dari koleksi atau YouTube Music</h2>
          <div className="flex gap-2">
            <button onClick={handleScan} className="nb-btn px-3 py-2 bg-[#FFE600] text-[11px] font-mono-code uppercase flex items-center gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} /> Pindai
            </button>
            <button onClick={() => fileRef.current?.click()} className="nb-btn px-3 py-2 bg-white text-[11px] font-mono-code uppercase flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Tambah file
            </button>
            <button onClick={() => setTab('cari')} className="nb-btn px-3 py-2 bg-[#38E54D] text-[11px] font-mono-code uppercase flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" /> Cari
            </button>
          </div>
        </div>
      )}

      {/* Playlist */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-mono-code font-black uppercase tracking-widest text-[#121212]/50">Playlist kamu</h3>
          <button onClick={() => openSheet('newpl')} className="text-[10px] font-mono-code font-black uppercase px-2 py-1 bg-white border-2 border-[#121212] rounded-lg shadow-[1.5px_1.5px_0_#121212] flex items-center gap-1">
            <Plus className="w-3 h-3" /> Buat
          </button>
        </div>
        {playlists.length === 0 ? (
          <p className="text-[11px] font-mono-code font-bold text-[#121212]/40 px-1">Belum ada playlist. Buat satu, lalu tambahkan lagu dari tab Pustaka.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {playlists.map((p) => {
              const count = (p.trackIds || p.tracks || []).length;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePlayPlaylist?.(p.id)}
                  className="w-32 shrink-0 p-2 rounded-xl border-2 border-[#121212] shadow-[2.5px_2.5px_0_#121212] text-left active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  style={{ background: accentFor(p.name || p.id) }}
                >
                  <div className="w-full aspect-square rounded-lg bg-white/70 border-2 border-[#121212] flex items-center justify-center mb-1.5">
                    <ListMusic className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-black truncate leading-tight">{p.name}</p>
                  <p className="text-[11px] font-mono-code font-bold text-[#121212]/50">{count} lagu</p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Terakhir ditambahkan */}
      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-mono-code font-black uppercase tracking-widest text-[#121212]/50">Terakhir ditambahkan</h3>
            <button onClick={() => { setTab('pustaka'); setLibTab('lagu'); }} className="text-[10px] font-mono-code font-black uppercase text-[#121212]/50 flex items-center gap-0.5">
              Semua <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            {recent.slice(0, 5).map((t) => (
              <TrackRow
                key={t.id}
                track={t}
                active={t.id === currentId}
                playing={playing}
                onPlay={() => playNow(t)}
                onAdd={(tr) => { setAddTarget(tr); openSheet('addto'); }}
                durationLabel={durLabel(t)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );

  /* ------------------------------------------------------------------- cari */

  const Cari = (
    <div className="space-y-2">
      <YTMusicWrapper
        playTrack={playTrack}
        currentId={currentId}
        playing={playing}
        onDownload={onYtDownload}
        onPlayError={() => {}}
      />
    </div>
  );

  /* ---------------------------------------------------------------- pustaka */

  const libTabs = [
    { id: 'lagu', label: 'Lagu', icon: Music2 },
    { id: 'artis', label: 'Artis', icon: User },
    { id: 'folder', label: 'Folder', icon: FolderOpen },
    { id: 'playlist', label: 'Playlist', icon: ListMusic },
  ];

  const Pustaka = (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-[#121212] rounded-xl shadow-[2px_2px_0_#121212]">
        <Search className="w-4 h-4 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery?.(e.target.value)}
          placeholder="Cari di koleksi kamu…"
          className="flex-1 bg-transparent outline-none text-xs font-bold placeholder:text-[#121212]/35"
        />
        {query && (
          <button onClick={() => setQuery?.('')} className="w-6 h-6 rounded-md bg-[#F1EFE9] border border-[#121212] flex items-center justify-center" aria-label="Bersihkan">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {q && (
        <section>
          <h3 className="text-[10px] font-mono-code font-black uppercase tracking-widest text-[#121212]/50 mb-2">
            Koleksi · {localResults.length} hasil
          </h3>
          <div className="space-y-1.5">
            {localResults.slice(0, 20).map((t) => (
              <TrackRow
                key={t.id}
                track={t}
                active={t.id === currentId}
                playing={playing}
                onPlay={() => playNow(t)}
                onAdd={(tr) => { setAddTarget(tr); openSheet('addto'); }}
                durationLabel={durLabel(t)}
              />
            ))}
            {localResults.length === 0 && (
              <p className="text-[11px] font-mono-code font-bold text-[#121212]/40 px-1">Tidak ada di koleksi.</p>
            )}
          </div>
        </section>
      )}

      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {libTabs.map((t) => {
          const Icon = t.icon;
          const active = libTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setLibTab(t.id)}
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border-2 border-[#121212] text-[10px] font-mono-code font-black uppercase transition-all ${
                active ? 'bg-[#121212] text-[#FFE600] shadow-[2px_2px_0_#38E54D]' : 'bg-white shadow-[1.5px_1.5px_0_#121212]'
              }`}
            >
              <Icon className="w-3 h-3" /> {t.label}
            </button>
          );
        })}
        <div className="flex-1" />
        <button onClick={handleScan} className="shrink-0 w-8 h-8 rounded-lg bg-white border-2 border-[#121212] shadow-[1.5px_1.5px_0_#121212] flex items-center justify-center" aria-label="Pindai folder">
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={() => fileRef.current?.click()} className="shrink-0 w-8 h-8 rounded-lg bg-white border-2 border-[#121212] shadow-[1.5px_1.5px_0_#121212] flex items-center justify-center" aria-label="Tambah file">
          <Upload className="w-3.5 h-3.5" />
        </button>
      </div>

      {scanMsg && <p className="text-[10px] font-mono-code font-bold text-[#121212]/50 truncate px-1">{scanMsg}</p>}

      {libTab === 'lagu' && (
        <div className="space-y-1.5">
          {tracks.length === 0 && <p className="text-[11px] font-mono-code font-bold text-[#121212]/40 px-1">Belum ada lagu. Tekan tombol pindai atau tambah file.</p>}
          {tracks.map((t) => (
            <TrackRow
              key={t.id}
              track={t}
              active={t.id === currentId}
              playing={playing}
              onPlay={() => playNow(t)}
              onAdd={(tr) => { setAddTarget(tr); openSheet('addto'); }}
              onRemove={handleRemove}
              durationLabel={durLabel(t)}
            />
          ))}
        </div>
      )}

      {libTab === 'artis' && (
        <div className="space-y-1.5">
          {artists.length === 0 && <p className="text-[11px] font-mono-code font-bold text-[#121212]/40 px-1">Belum ada artis.</p>}
          {artists.map(([name, list]) => (
            <button
              key={name}
              onClick={() => playTrack?.(list[0], false, list)}
              className="w-full flex items-center gap-2.5 p-2 bg-white border-2 border-[#121212]/10 hover:border-[#121212] hover:shadow-[2px_2px_0_#121212] rounded-xl text-left transition-all"
            >
              <div className="w-10 h-10 rounded-full border-2 border-[#121212] flex items-center justify-center shrink-0" style={{ background: accentFor(name) }}>
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black truncate">{name}</p>
                <p className="text-[10px] font-mono-code font-bold text-[#121212]/50">{list.length} lagu</p>
              </div>
              <Play className="w-4 h-4 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {libTab === 'folder' && (
        <div className="space-y-1.5">
          {folders.length === 0 && <p className="text-[11px] font-mono-code font-bold text-[#121212]/40 px-1">Belum ada folder.</p>}
          {folders.map(([name, list]) => (
            <button
              key={name}
              onClick={() => playTrack?.(list[0], false, list)}
              className="w-full flex items-center gap-2.5 p-2 bg-white border-2 border-[#121212]/10 hover:border-[#121212] hover:shadow-[2px_2px_0_#121212] rounded-xl text-left transition-all"
            >
              <div className="w-10 h-10 rounded-lg border-2 border-[#121212] flex items-center justify-center shrink-0" style={{ background: accentFor(name) }}>
                <FolderOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black truncate">{name}</p>
                <p className="text-[10px] font-mono-code font-bold text-[#121212]/50">{list.length} lagu</p>
              </div>
              <Play className="w-4 h-4 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {libTab === 'playlist' && (
        <div className="space-y-2">
          <button onClick={() => openSheet('newpl')} className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 border-dashed border-[#121212] bg-white/60 text-[11px] font-mono-code font-black uppercase">
            <Plus className="w-3.5 h-3.5" /> Buat playlist baru
          </button>
          {playlists.length === 0 && <p className="text-[11px] font-mono-code font-bold text-[#121212]/40 px-1">Belum ada playlist.</p>}
          {playlists.map((p) => {
            const count = (p.trackIds || p.tracks || []).length;
            return (
              <div key={p.id} className="p-2 bg-white border-2 border-[#121212] rounded-xl shadow-[2px_2px_0_#121212]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg border-2 border-[#121212] flex items-center justify-center shrink-0" style={{ background: accentFor(p.name || p.id) }}>
                    <ListMusic className="w-4 h-4" />
                  </div>
                  <button onClick={() => handlePlayPlaylist?.(p.id)} className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-black truncate">{p.name}</p>
                    <p className="text-[10px] font-mono-code font-bold text-[#121212]/50">{count} lagu</p>
                  </button>
                  <button onClick={() => { pl.setEditingPlaylistId?.(p.id); pl.setEditingName?.(p.name || ''); openSheet('rename'); }} className="w-8 h-8 rounded-lg bg-white border-2 border-[#121212] flex items-center justify-center" aria-label="Ubah nama">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeletePlaylist?.(p.id)} className="w-8 h-8 rounded-lg bg-white border-2 border-[#121212] text-[#FF525E] flex items-center justify-center" aria-label="Hapus playlist">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const TABS = [
    { id: 'beranda', label: 'Beranda', icon: Home },
    { id: 'cari', label: 'Cari', icon: Search },
    { id: 'pustaka', label: 'Pustaka', icon: Library },
  ];

  /* ------------------------------------------------------------------ render */

  return (
    <div className="font-sans">
      {/* Hidden file input + probe durasi (dipakai file-picker) */}
      <input ref={fileRef} type="file" accept="audio/*" multiple className="hidden" onChange={handlePickFiles} />
      <audio
        src={current ? toPlayableSrc?.(current.uri) || undefined : undefined}
        preload="metadata"
        onLoadedMetadata={onLoadedMeta}
        className="hidden"
      />

      <div className="flex items-start gap-3 md:gap-4">
        {/* ================= Sidebar (tablet / desktop) ================= */}
        <aside className="hidden md:flex flex-col gap-1 w-56 shrink-0 sticky top-2 bg-white border-[2.5px] border-[#121212] rounded-2xl shadow-[3px_3px_0_#121212] p-3 max-h-[calc(100vh-7rem)]">
          <div className="flex items-center gap-2 pb-2 mb-1 border-b-2 border-[#121212]/10">
            <span className="w-7 h-7 rounded-lg bg-[#FFE600] border-2 border-[#121212] flex items-center justify-center shrink-0">
              <Music2 className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase leading-none truncate">ArMusic</p>
              <p className="text-[10px] font-mono-code font-bold text-[#121212]/45 truncate">
                {tracks.length} lagu · {playlists.length} playlist
              </p>
            </div>
          </div>

          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-2 py-2 rounded-lg text-[10px] font-mono-code font-black uppercase border-2 transition-all text-left ${
                  active
                    ? 'bg-[#FFE600] border-[#121212] shadow-[2px_2px_0_#121212]'
                    : 'border-transparent hover:bg-[#F8F5EE]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" /> {t.label}
              </button>
            );
          })}

          <p className="text-[10px] font-mono-code font-black text-[#121212]/40 px-2 pt-2">PLAYLIST</p>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5 pr-0.5">
            {playlists.length === 0 ? (
              <p className="text-[11px] font-mono-code font-bold text-[#121212]/35 px-2 py-1">Belum ada playlist</p>
            ) : (
              playlists.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setTab('pustaka'); onPlayPlaylist?.(p.id); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#F8F5EE] text-left"
                >
                  <span className="w-5 h-5 rounded bg-[#C6F24E] border-2 border-[#121212] shrink-0" />
                  <span className="text-[10px] font-bold truncate">{p.name}</span>
                </button>
              ))
            )}
          </div>

          <div className="flex gap-1 pt-2 mt-1 border-t-2 border-[#121212]/10">
            <button
              onClick={() => openSheet('eq')}
              className={`flex-1 h-8 rounded-lg border-2 border-[#121212] shadow-[1.5px_1.5px_0_#121212] flex items-center justify-center ${eqInfo?.enabled ? 'bg-[#FFE600]' : 'bg-white'}`}
              aria-label="Equalizer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => openSheet('sleep')}
              className={`flex-1 h-8 rounded-lg border-2 border-[#121212] shadow-[1.5px_1.5px_0_#121212] flex items-center justify-center ${sleepStatus?.active ? 'bg-[#FFE600]' : 'bg-white'}`}
              aria-label="Sleep timer"
            >
              <Timer className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>

        {/* ================= Kolom utama ================= */}
        <div className="flex-1 min-w-0 space-y-3 pb-2">
          {/* bar atas */}
          {/* baris judul — di HP disembunyikan: tab aktif sudah menyebut halaman,
              dan EQ/sleep tetap bisa dibuka dari pemutar layar penuh */}
          <div className="hidden md:flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-baseline gap-2">
              <h2 className="text-xs md:text-sm font-black uppercase tracking-tight leading-none">
                {TABS.find((t) => t.id === tab)?.label || 'ArMusic'}
              </h2>
              <span className="text-[11px] font-mono-code font-bold text-[#121212]/40">
                {tracks.length} lagu
              </span>
            </div>
            <div className="flex items-center gap-1.5 md:hidden">
              <button
                onClick={() => openSheet('eq')}
                className={`w-7 h-7 rounded-lg border-2 border-[#121212] flex items-center justify-center ${eqInfo?.enabled ? 'bg-[#FFE600]' : 'bg-white'}`}
                aria-label="Equalizer"
              >
                <SlidersHorizontal className="w-3 h-3" />
              </button>
              <button
                onClick={() => openSheet('sleep')}
                className={`w-7 h-7 rounded-lg border-2 border-[#121212] flex items-center justify-center ${sleepStatus?.active ? 'bg-[#FFE600]' : 'bg-white'}`}
                aria-label="Sleep timer"
              >
                <Timer className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* tab utama — hanya di layar sempit (di layar lebar sudah jadi sidebar) */}
          <div className="md:hidden flex gap-1 p-1 bg-white border-2 border-[#121212] rounded-xl shadow-[2px_2px_0_#121212]">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono-code font-black uppercase transition-all ${
                    active ? 'bg-[#121212] text-[#FFE600]' : 'text-[#121212]/60 hover:bg-[#F8F5EE]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              );
            })}
          </div>

          {error && (
            <div className="p-2 bg-[#FF525E] border-2 border-[#121212] rounded-xl shadow-[2px_2px_0_#121212]">
              <p className="text-[10px] font-mono-code font-black text-white">{String(error)}</p>
            </div>
          )}

          {tab === 'beranda' && Beranda}
          {tab === 'cari' && Cari}
          {tab === 'pustaka' && Pustaka}

          {/* ruang untuk mini player (jangan sampai menutupi item terakhir) */}
          {current && <div className="h-24 md:h-28" />}
        </div>
      </div>

      <MiniPlayer
        track={current}
        playing={playing}
        elapsed={elapsed}
        duration={duration}
        onToggle={togglePlay}
        onNext={() => nextTrack?.()}
        onOpen={() => setNpOpen(true)}
      />

      <NowPlaying
        open={npOpen}
        onClose={() => setNpOpen(false)}
        track={current}
        playing={playing}
        elapsed={elapsed}
        duration={duration}
        onToggle={togglePlay}
        onNext={() => nextTrack?.()}
        onPrev={() => prevTrack?.()}
        onSeek={seekTo}
        onShuffle={toggleShuffle}
        onRepeat={toggleRepeatOne}
        shuffle={shuffle}
        repeatOne={repeatOne}
        lyricsState={lyricsState}
        queue={queue}
        queueIndex={queueIndex}
        onJump={onJumpQueue}
        onOpenEq={() => openSheet('eq')}
        onOpenSleep={() => openSheet('sleep')}
        sleepStatus={sleepStatus}
        eqInfo={eqInfo}
        formatTrackDuration={formatTrackDuration}
      />

      {/* ------------------------------------------------------------- sheets */}
      {sheet === 'newpl' && (
        <Sheet title="Playlist baru" onClose={() => setSheet(null)}>
          <div className="flex gap-2">
            <input
              value={pl.newPlaylistName || ''}
              onChange={(e) => pl.setNewPlaylistName?.(e.target.value)}
              placeholder="Nama playlist"
              className="flex-1 px-3 py-2 bg-white border-2 border-[#121212] rounded-xl text-xs font-bold outline-none"
            />
            <button
              onClick={() => { handleCreatePlaylist?.(); setSheet(null); }}
              className="nb-btn px-3 py-2 bg-[#38E54D] text-[11px] font-mono-code uppercase flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Buat
            </button>
          </div>
        </Sheet>
      )}

      {sheet === 'rename' && (
        <Sheet title="Ubah nama playlist" onClose={() => setSheet(null)}>
          <div className="flex gap-2">
            <input
              value={pl.editingName || ''}
              onChange={(e) => pl.setEditingName?.(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border-2 border-[#121212] rounded-xl text-xs font-bold outline-none"
            />
            <button
              onClick={() => { handleRenamePlaylist?.(pl.editingPlaylistId); setSheet(null); }}
              className="nb-btn px-3 py-2 bg-[#FFE600] text-[11px] font-mono-code uppercase flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Simpan
            </button>
          </div>
        </Sheet>
      )}

      {sheet === 'addto' && (
        <Sheet title="Tambah ke playlist" onClose={() => { setSheet(null); setAddTarget(null); }}>
          <div className="space-y-1.5">
            <button
              onClick={() => { setSheet('newpl'); }}
              className="w-full flex items-center gap-2 p-2.5 rounded-xl border-2 border-dashed border-[#121212] bg-white/60 text-[11px] font-mono-code font-black uppercase"
            >
              <Plus className="w-3.5 h-3.5" /> Buat playlist baru
            </button>
            {playlists.length === 0 && <p className="text-[11px] font-mono-code font-bold text-[#121212]/40">Belum ada playlist.</p>}
            {playlists.map((p) => {
              const count = (p.trackIds || p.tracks || []).length;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    if (addTarget) handleAddTrackToPlaylist?.(p.id, addTarget.id);
                    setSheet(null);
                    setAddTarget(null);
                  }}
                  className="w-full flex items-center gap-2.5 p-2 bg-white border-2 border-[#121212] rounded-xl text-left"
                >
                  <div className="w-9 h-9 rounded-lg border-2 border-[#121212] flex items-center justify-center shrink-0" style={{ background: accentFor(p.name || p.id) }}>
                    <ListMusic className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black truncate">{p.name}</p>
                    <p className="text-[10px] font-mono-code font-bold text-[#121212]/50">{count} lagu</p>
                  </div>
                  <Plus className="w-4 h-4 shrink-0" />
                </button>
              );
            })}
          </div>
        </Sheet>
      )}

      {sheet === 'sleep' && (
        <Sheet title="Sleep timer" onClose={() => setSheet(null)}>
          {sleepStatus?.active && (
            <div className="mb-3 p-2 bg-[#FFE600] border-2 border-[#121212] rounded-xl">
              <p className="text-[10px] font-mono-code font-black">Aktif · sisa {Math.ceil((sleepStatus.remainingMs || 0) / 60000)} menit</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {[5, 10, 15, 30, 45, 60].map((m) => (
              <button
                key={m}
                onClick={() => { handleSetSleep?.(m); setSheet(null); }}
                className="nb-btn py-2.5 bg-white text-[11px] font-mono-code uppercase"
              >
                {m} mnt
              </button>
            ))}
          </div>
          {sleepStatus?.active && (
            <button onClick={() => { handleSetSleep?.(0); setSheet(null); }} className="mt-2 w-full nb-btn py-2 bg-[#FF525E] text-white text-[11px] font-mono-code uppercase">
              Batalkan timer
            </button>
          )}
        </Sheet>
      )}

      {sheet === 'eq' && (
        <Sheet title="Equalizer" onClose={() => setSheet(null)}>
          {!eqInfo || eqInfo.supported === false ? (
            <p className="text-[11px] font-mono-code font-bold text-[#121212]/50">Equalizer tidak tersedia di perangkat ini.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono-code font-black uppercase text-[#121212]/50">Aktifkan</p>
                <button
                  onClick={handleEqToggle}
                  className={`w-12 h-7 rounded-full border-2 border-[#121212] transition-colors ${eqInfo.enabled ? 'bg-[#38E54D]' : 'bg-white'}`}
                  aria-label="Aktifkan equalizer"
                >
                  <span className={`block w-5 h-5 rounded-full bg-[#121212] transition-transform ${eqInfo.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {Array.isArray(eqInfo.presetNames) && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {eqInfo.presetNames.map((name, i) => (
                    <button
                      key={name}
                      onClick={() => handleEqPreset?.(i)}
                      className={`shrink-0 px-2.5 py-1 rounded-lg border-2 border-[#121212] text-[10px] font-mono-code font-black uppercase ${eqInfo.presetIndex === i ? 'bg-[#FFE600]' : 'bg-white'}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {(eqInfo.centerFreqs || []).map((freq, i) => {
                  const gain = eqInfo.gains?.[i] ?? 0;
                  const max = eqInfo.maxGainMb || 1500;
                  const min = eqInfo.minGainMb || -1500;
                  return (
                    <div key={freq} className="flex items-center gap-2">
                      <span className="w-10 text-[11px] font-mono-code font-black text-[#121212]/50 shrink-0">
                        {freq >= 1000 ? `${Math.round(freq / 1000)}k` : `${Math.round(freq)}`}
                      </span>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={100}
                        value={gain}
                        onChange={(e) => handleEqBand?.(i, Number(e.target.value))}
                        className="flex-1 accent-[#121212]"
                        aria-label={`Band ${i + 1}`}
                      />
                      <span className="w-10 text-[11px] font-mono-code font-black text-right shrink-0">{Math.round(gain / 100)}</span>
                    </div>
                  );
                })}
              </div>

              <button onClick={handleEqReset} className="w-full nb-btn py-2 bg-white text-[11px] font-mono-code uppercase">
                Reset
              </button>
              {eqLoading && <p className="text-[10px] font-mono-code font-bold text-[#121212]/40 text-center">Memuat…</p>}
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}
