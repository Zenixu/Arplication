import React, { useEffect, useMemo, useState } from 'react';
import {
  Play, Pause, Music2, ArrowRight, ChevronRight, Download, StickyNote, Layers,
} from 'lucide-react';
import { getDownloadHistory } from '../../utils/history.js';
import { getAllNotes } from '../../services/notesDb.js';
import { readNowPlaying, readRecentPlays } from '../../services/nowPlaying.js';
import { ARMUSIC_LIBRARY_KEY } from '../../services/localMusic.js';
import { loadTimerState } from '../../utils/pomodoro.js';

/**
 * Homescreen "bento" — mengikuti desain di ~/figcraft/home-redesign.figcraft.
 *
 *   SEDANG BERJALAN  → kartu pemutar (klik = buka ArMusic)
 *   TERAKHIR DIPUTAR → geser ke samping
 *   AKTIVITAS        → jumlah unduhan + catatan yang di-pin
 *   ALAT             → bento 4 kolom (kartu lebar & tinggi bervariasi)
 *
 * Semua data dibaca dari penyimpanan lokal modul masing-masing. Kalau datanya
 * belum ada, kartu menampilkan keadaan kosong — bukan angka karangan.
 */

/**
 * layout:
 *   'wide' → logo memenuhi sisi kiri (setinggi kartu), separuh kanan untuk info
 *   'tile' → logo besar di tengah, teks di bawah, tanpa info tambahan
 *   'tall' → logo besar di atas (tengah), info di bawahnya
 */
const MODULES = [
  { id: 'arloader',  title: 'Arloader',  short: 'Arloader',  info: 'Unduh video & audio',      icon: '/arloader.png',  accent: '#FFE600', span: 'col-span-2',            layout: 'wide' },
  { id: 'armaps',    title: 'ArMaps',    short: 'Armaps',    info: 'Peta offline',             icon: '/armaps.png',    accent: '#D8B4FE', span: 'col-span-1',            layout: 'tile' },
  { id: 'ardoro',    title: 'Ardoro',    short: 'Ardoro',    info: 'Pomodoro 25 menit',        icon: '/ardoro.png',    accent: '#FF70A6', span: 'col-span-1 row-span-2', layout: 'tall' },
  { id: 'artoolbox', title: 'ArToolbox', short: 'Artoolbox', info: 'QR · Kalkulator · Warna',  icon: '/artoolbox.png', accent: '#9AD7FF', span: 'col-span-1 row-span-2', layout: 'tall' },
  { id: 'arnote',    title: 'ArNote',    short: 'Arnotes',   info: 'Catatan & checklist',      icon: '/arnote.png',    accent: '#C6F24E', span: 'col-span-1',            layout: 'tile' },
  { id: 'aruthtale', title: 'Aruthtale', short: 'Aruthtale', info: 'Info & diagnostik',        icon: '/logo.png',      accent: '#E7E3D8', span: 'col-span-1',            layout: 'tile' },
  { id: 'argame',    title: 'ArGame',    short: 'Argame',    info: 'Game santai',              icon: '/Argame.png',    accent: '#FFC46B', span: 'col-span-1',            layout: 'tile' },
  { id: 'armusic',   title: 'ArMusic',   short: 'Armusic',   info: 'Pemutar musik',            icon: '/armusic.png',   accent: '#C6F24E', span: 'col-span-2',            layout: 'wide' },
];

function readLibraryCount() {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const list = JSON.parse(localStorage.getItem(ARMUSIC_LIBRARY_KEY) || '[]');
    return Array.isArray(list) ? list.length : 0;
  } catch {
    return 0;
  }
}

function formatTime(sec) {
  const total = Math.max(0, Math.floor(Number(sec) || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function HomeHub({ setActiveTab }) {
  const [nowPlaying, setNowPlaying] = useState(() => readNowPlaying());
  const [recent, setRecent] = useState(() => readRecentPlays(3));
  const [downloads, setDownloads] = useState(() => getDownloadHistory().length);
  const [lastDownload, setLastDownload] = useState(() => getDownloadHistory()[0]?.title || '');
  const [timerState, setTimerState] = useState(() => loadTimerState());
  const [libraryCount, setLibraryCount] = useState(() => readLibraryCount());
  const [pinnedNotes, setPinnedNotes] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [showAll, setShowAll] = useState(false);

  // Muat ulang data saat layar kembali aktif / aplikasi dibuka lagi.
  useEffect(() => {
    let alive = true;

    const refresh = async () => {
      setNowPlaying(readNowPlaying());
      setRecent(readRecentPlays(3));
      const riwayat = getDownloadHistory();
      setDownloads(riwayat.length);
      setLastDownload(riwayat[0]?.title || '');
      setTimerState(loadTimerState());
      setLibraryCount(readLibraryCount());
      try {
        const notes = await getAllNotes();
        if (!alive || !Array.isArray(notes)) return;
        setNoteCount(notes.length);
        setPinnedNotes(notes.filter((n) => n && n.isPinned).length);
      } catch {
        /* IndexedDB belum siap / tidak tersedia — biarkan 0 */
      }
    };

    refresh();
    const timer = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const progress = useMemo(() => {
    if (!nowPlaying || !nowPlaying.duration) return 0;
    return Math.min(100, Math.max(0, (nowPlaying.elapsed / nowPlaying.duration) * 100));
  }, [nowPlaying]);

  // Info ringkas yang mengikuti keadaan sebenarnya — bukan teks tetap.
  const dynamicInfo = useMemo(() => {
    const t = timerState;
    let ardoro = 'Pomodoro 25 menit';
    if (t && t.running && t.remaining > 0) {
      ardoro = `${formatTime(t.remaining)} · ${t.phase === 'focus' ? 'fokus' : 'istirahat'}`;
    } else if (t && t.remaining > 0) {
      ardoro = `Jeda · ${formatTime(t.remaining)}`;
    }

    const lagu = nowPlaying?.title
      ? `${nowPlaying.title}${nowPlaying.artist ? ` · ${nowPlaying.artist}` : ''}`
      : '';

    return {
      arloader: lastDownload ? `Terakhir: ${lastDownload}` : 'Belum ada unduhan',
      armusic: lagu || 'Pemutar musik',
      ardoro,
    };
  }, [timerState, nowPlaying, lastDownload]);

  const infoFor = (mod) => dynamicInfo[mod.id] || mod.info;

  const open = (id) => setActiveTab?.(id);

  return (
    <div className="space-y-4 font-sans">
      {/* ============================ SEDANG BERJALAN ============================ */}
      <section className="space-y-2">
        <h2 className="px-1 text-[11px] font-mono-code font-black uppercase tracking-widest text-[#121212]/45">
          Sedang berjalan
        </h2>

        {nowPlaying ? (
          <button
            onClick={() => open('armusic')}
            className="w-full text-left bg-[#121212] border-2 border-[#121212] rounded-2xl shadow-[4px_4px_0_#121212] p-3 flex items-center gap-3 active:translate-y-0.5 active:shadow-[2px_2px_0_#121212] transition-all"
          >
            <div className="w-16 h-16 rounded-xl border-2 border-[#121212] overflow-hidden shrink-0 bg-[#C6F24E] flex items-center justify-center">
              {nowPlaying.cover ? (
                <img src={nowPlaying.cover} alt={nowPlaying.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <Music2 className="w-6 h-6 text-[#121212]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[11.5px] font-black text-white truncate leading-tight">{nowPlaying.title}</p>
              <p className="text-[11px] font-mono-code font-bold text-white/55 truncate mt-0.5">
                {nowPlaying.artist || 'ArMusic'} · {nowPlaying.playing ? 'diputar' : 'dijeda'}
              </p>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-[#FFE600] rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-[10px] font-mono-code font-bold text-white/40">
                {formatTime(nowPlaying.elapsed)} / {formatTime(nowPlaying.duration)}
              </p>
            </div>

            <span className="w-11 h-11 rounded-full bg-[#FFE600] border-2 border-[#121212] flex items-center justify-center shrink-0">
              {nowPlaying.playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </span>
          </button>
        ) : (
          <button
            onClick={() => open('armusic')}
            className="w-full text-left bg-white border-2 border-dashed border-[#121212]/40 rounded-2xl p-3 flex items-center gap-3 hover:border-[#121212] transition-colors"
          >
            <div className="w-11 h-11 rounded-xl border-2 border-[#121212]/30 flex items-center justify-center shrink-0 bg-[#F4F1E8]">
              <Music2 className="w-5 h-5 text-[#121212]/40" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase">Belum ada lagu diputar</p>
              <p className="text-[11px] font-mono-code font-bold text-[#121212]/45">
                {libraryCount > 0 ? `${libraryCount} lagu siap diputar` : 'Tambahkan lagu lewat ArMusic'}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#121212]/40 shrink-0" />
          </button>
        )}
      </section>

      {/* ============================ TERAKHIR DIPUTAR =========================== */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-[11px] font-mono-code font-black uppercase tracking-widest text-[#121212]/45">
            Terakhir diputar
          </h2>
          {recent.length > 0 && (
            <button
              onClick={() => open('armusic')}
              className="text-[11px] font-mono-code font-black uppercase text-[#121212]/45 hover:text-[#121212]"
            >
              lihat semua →
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <p className="px-1 text-[10px] font-mono-code font-bold text-[#121212]/35">
            Riwayat putar akan muncul di sini.
          </p>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recent.map((track) => (
              <button
                key={track.key}
                onClick={() => open('armusic')}
                className="shrink-0 w-[112px] text-left bg-white border-2 border-[#121212] rounded-xl shadow-[3px_3px_0_#121212] p-1.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#121212] transition-all"
              >
                <div className="w-full h-[86px] rounded-lg border-2 border-[#121212] overflow-hidden bg-[#C6F24E] flex items-center justify-center mb-1.5">
                  {track.cover ? (
                    <img src={track.cover} alt={track.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <Music2 className="w-5 h-5 text-[#121212]" />
                  )}
                </div>
                <p className="text-[10px] font-black leading-tight truncate">{track.title}</p>
                <p className="text-[10px] font-mono-code font-bold text-[#121212]/45 truncate">
                  {track.artist || 'ArMusic'}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ================================ AKTIVITAS =============================== */}
      <section className="space-y-2">
        <h2 className="px-1 text-[11px] font-mono-code font-black uppercase tracking-widest text-[#121212]/45">
          Aktivitas
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => open('arloader')}
            className="text-left bg-[#C6F24E] border-2 border-[#121212] rounded-xl shadow-[3px_3px_0_#121212] p-3 active:translate-y-0.5 active:shadow-[1px_1px_0_#121212] transition-all"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Download className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono-code font-black uppercase tracking-wider">Arloader</span>
            </div>
            <p className="text-2xl font-black leading-none">{downloads}</p>
            <p className="text-[10px] font-mono-code font-bold text-[#121212]/60 mt-1">file terunduh</p>
          </button>

          <button
            onClick={() => open('arnote')}
            className="text-left bg-[#D8B4FE] border-2 border-[#121212] rounded-xl shadow-[3px_3px_0_#121212] p-3 active:translate-y-0.5 active:shadow-[1px_1px_0_#121212] transition-all"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <StickyNote className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono-code font-black uppercase tracking-wider">Pin notes</span>
            </div>
            <p className="text-2xl font-black leading-none">{pinnedNotes}</p>
            <p className="text-[10px] font-mono-code font-bold text-[#121212]/60 mt-1">
              {noteCount > 0 ? `dari ${noteCount} catatan` : 'belum ada catatan'}
            </p>
          </button>
        </div>
      </section>

      {/* ================================== ALAT ================================= */}
      <section className="space-y-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-[11px] font-mono-code font-black uppercase tracking-widest text-[#121212]/45">
            Alat
          </h2>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-[11px] font-mono-code font-black uppercase text-[#121212]/45 hover:text-[#121212]"
          >
            {showAll ? 'sembunyikan ↑' : 'lihat semua →'}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 auto-rows-[74px] md:auto-rows-[86px]">
          {MODULES.map((mod) => (
            <button
              key={mod.id}
              onClick={() => open(mod.id)}
              className={`${mod.span} bg-white border-2 border-[#121212] rounded-xl shadow-[3px_3px_0_#121212] overflow-hidden active:translate-y-0.5 active:shadow-[1px_1px_0_#121212] transition-all ${
                mod.layout === 'wide'
                  ? 'p-1 flex items-center gap-2 text-left'
                  : mod.layout === 'tall'
                    ? 'px-1 py-1.5 flex flex-col items-center gap-1 text-center'
                    : 'p-1 flex flex-col items-center justify-center gap-1 text-center'
              }`}
            >
              {/* logo */}
              <span
                className={`rounded-lg border-2 border-[#121212] flex items-center justify-center overflow-hidden shrink-0 ${
                  mod.layout === 'wide'
                    ? 'w-[56px] h-[56px] md:w-[64px] md:h-[64px]'  // memenuhi tinggi kartu
                    : mod.layout === 'tall'
                      ? 'w-12 h-12 md:w-14 md:h-14 mt-0.5'        // lebih besar, di tengah atas
                      : 'w-10 h-10 md:w-11 md:h-11'               // mengisi tile kotak
                }`}
                style={{ backgroundColor: mod.accent }}
              >
                <img src={mod.icon} alt="" className="w-full h-full object-contain p-[3px]" loading="lazy" />
              </span>

              {mod.layout === 'wide' ? (
                /* separuh kanan: nama + informasi */
                <span className="flex-1 min-w-0 flex flex-col justify-center">
                  <span className="block text-[10px] md:text-[11px] font-black uppercase tracking-tight leading-tight truncate">
                    {mod.short}
                  </span>
                  <span className="block text-[10px] font-mono-code font-bold text-[#121212]/45 leading-tight line-clamp-2">
                    {infoFor(mod)}
                  </span>
                </span>
              ) : (
                <span className="block w-full min-w-0">
                  <span className="block text-[10px] md:text-[11px] font-black uppercase tracking-tight leading-tight truncate">
                    {mod.short}
                  </span>
                  {mod.layout === 'tall' && (
                    <span className="block text-[10px] font-mono-code font-bold text-[#121212]/45 leading-tight mt-0.5">
                      {infoFor(mod)}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* daftar lengkap, dibuka lewat "lihat semua" */}
        {showAll && (
          <div className="mt-2 space-y-1.5">
            {MODULES.map((mod) => (
              <button
                key={`row-${mod.id}`}
                onClick={() => open(mod.id)}
                className="w-full flex items-center gap-2.5 bg-white border-2 border-[#121212] rounded-xl shadow-[2px_2px_0_#121212] p-2 text-left active:translate-y-0.5 active:shadow-[1px_1px_0_#121212] transition-all"
              >
                <span
                  className="w-7 h-7 rounded-md border-2 border-[#121212] flex items-center justify-center overflow-hidden shrink-0"
                  style={{ backgroundColor: mod.accent }}
                >
                  <img src={mod.icon} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[10px] font-black uppercase truncate">{mod.title}</span>
                  <span className="block text-[10px] font-mono-code font-bold text-[#121212]/45 truncate">{infoFor(mod)}</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[#121212]/40 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </section>

      <p className="px-1 pb-1 text-[10px] font-mono-code font-bold text-[#121212]/30 flex items-center gap-1">
        <Layers className="w-3 h-3" />
        {libraryCount} lagu di koleksi · {downloads} unduhan tersimpan
      </p>
    </div>
  );
}
