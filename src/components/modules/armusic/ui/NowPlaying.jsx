import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  ListMusic, Mic2, Disc3, SlidersHorizontal, Timer, Music2, X,
} from 'lucide-react';

/**
 * Now Playing full-screen sheet — fungsional ala Spotify, visual tetap neubrutalist.
 * Tiga tab: Pemutar · Lirik · Antrean.
 */

function fmt(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function coverOf(track) {
  return track?.cover || track?.thumbnail || track?.artwork || null;
}

function Artwork({ track, size = 'lg' }) {
  const cover = coverOf(track);
  const box = size === 'lg' ? 'w-full h-full' : 'w-12 h-12';
  if (cover) {
    return (
      <img
        src={cover}
        alt=""
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
        className={`${box} object-cover rounded-2xl border-[2.5px] border-[#121212] shadow-[4px_4px_0px_#121212]`}
      />
    );
  }
  const initial = (track?.title || '?').trim().charAt(0).toUpperCase();
  return (
    <div className={`${box} rounded-2xl border-[2.5px] border-[#121212] shadow-[4px_4px_0px_#121212] bg-[#D8B4FE] flex items-center justify-center overflow-hidden relative`}>
      <span className="absolute -right-2 -bottom-3 text-[7rem] font-black text-[#121212]/15 leading-none select-none">{initial}</span>
      <Disc3 className="w-16 h-16 text-[#121212]/70" strokeWidth={1.6} />
    </div>
  );
}

function LyricsView({ lyricsState, elapsed, onSeek }) {
  const boxRef = useRef(null);
  const lines = lyricsState?.synced || [];

  const activeIdx = useMemo(() => {
    if (!lines.length) return -1;
    let idx = -1;
    for (let i = 0; i < lines.length; i += 1) {
      const t = Number(lines[i]?.time ?? lines[i]?.t ?? 0);
      if (t <= elapsed + 0.15) idx = i; else break;
    }
    return idx;
  }, [lines, elapsed]);

  useEffect(() => {
    if (activeIdx < 0 || !boxRef.current) return;
    const el = boxRef.current.querySelector(`[data-line="${activeIdx}"]`);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeIdx]);

  if (lyricsState?.status === 'loading') {
    return <p className="text-xs font-mono-code font-bold text-center text-[#121212]/60 py-8">Memuat lirik…</p>;
  }
  if (!lines.length && lyricsState?.plain) {
    return (
      <div className="h-full overflow-y-auto px-1 py-2">
        <p className="text-sm font-bold leading-7 whitespace-pre-line text-[#121212]/85">{lyricsState.plain}</p>
      </div>
    );
  }
  if (!lines.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Mic2 className="w-8 h-8 text-[#121212]/30" />
        <p className="text-xs font-mono-code font-bold text-[#121212]/50">Lirik tidak tersedia untuk lagu ini</p>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="h-full overflow-y-auto py-6 px-1 space-y-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {lines.map((line, i) => (
        <button
          key={i}
          data-line={i}
          onClick={() => onSeek(Number(line?.time ?? line?.t ?? 0))}
          className={`block w-full text-left px-3 py-2 rounded-xl transition-all duration-200 ${
            i === activeIdx
              ? 'bg-[#FFE600] border-2 border-[#121212] shadow-[2px_2px_0px_#121212] scale-[1.01]'
              : 'border-2 border-transparent hover:bg-white/70'
          }`}
        >
          <span className={`text-sm leading-6 ${i === activeIdx ? 'font-black text-[#121212]' : 'font-bold text-[#121212]/55'}`}>
            {line?.text ?? line?.line ?? ''}
          </span>
        </button>
      ))}
      <div className="h-24" />
    </div>
  );
}

export default function NowPlaying({
  open, onClose,
  track, playing, elapsed, duration,
  onToggle, onNext, onPrev, onSeek, onShuffle, onRepeat,
  shuffle, repeatOne,
  lyricsState, queue = [], queueIndex = 0, onJump,
  onOpenEq, onOpenSleep, sleepStatus, eqInfo,
  formatTrackDuration,
}) {
  const [tab, setTab] = useState('player');

  useEffect(() => { if (!open) setTab('player'); }, [open]);
  if (!open || !track) return null;

  const dur = duration || track.durationSec || 0;
  const pct = dur > 0 ? Math.min(100, (elapsed / dur) * 100) : 0;

  const tabs = [
    { id: 'player', label: 'Pemutar', icon: Disc3 },
    { id: 'lyrics', label: 'Lirik', icon: Mic2 },
    { id: 'queue', label: 'Antrean', icon: ListMusic },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-[#F8F5EE] flex flex-col overflow-hidden safe-top">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl bg-white border-2 border-[#121212] shadow-[2px_2px_0px_#121212] flex items-center justify-center active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          aria-label="Tutup pemutar"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-[11px] font-mono-code font-black uppercase tracking-widest text-[#121212]/50">Sedang diputar</p>
          <p className="text-[11px] font-black truncate max-w-[52vw]">{track.title}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenEq}
            className={`w-9 h-9 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] flex items-center justify-center ${eqInfo?.enabled ? 'bg-[#FFE600]' : 'bg-white'}`}
            aria-label="Equalizer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSleep}
            className={`w-9 h-9 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] flex items-center justify-center ${sleepStatus?.active ? 'bg-[#FFE600]' : 'bg-white'}`}
            aria-label="Sleep timer"
          >
            <Timer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab pills */}
      <div className="px-4 pb-2 shrink-0">
        <div className="flex gap-1 p-1 bg-white border-2 border-[#121212] rounded-xl shadow-[2px_2px_0px_#121212]">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono-code font-black uppercase transition-all ${active ? 'bg-[#121212] text-[#FFE600]' : 'text-[#121212]/60'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 px-4 pb-4">
        {tab === 'player' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0 flex items-center justify-center py-2">
              <div className="h-full max-h-[min(38vh,280px)] aspect-square max-w-full">
                <Artwork track={track} />
              </div>
            </div>

            <div className="pt-3 space-y-3 shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-lg font-black leading-tight truncate">{track.title}</h2>
                  <p className="text-xs font-mono-code font-bold text-[#121212]/55 truncate">
                    {track.artist || 'Artis Tidak Dikenal'}
                    {track.folder ? ` • ${track.folder}` : ''}
                  </p>
                </div>
                {track.source === 'ytmusic' && (
                  <span className="shrink-0 text-[11px] font-mono-code font-black uppercase px-1.5 py-0.5 bg-[#FF70A6] border-2 border-[#121212] rounded-md shadow-[1.5px_1.5px_0px_#121212]">
                    YT
                  </span>
                )}
              </div>

              {/* Progress */}
              <div>
                <div className="relative h-2 bg-white border-2 border-[#121212] rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-[#38E54D]" style={{ width: `${pct}%` }} />
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, Math.round(dur))}
                  step={1}
                  value={Math.min(elapsed, dur || 0)}
                  onChange={(e) => onSeek(Number(e.target.value))}
                  className="w-full mt-1 accent-[#121212] h-5"
                  aria-label="Posisi lagu"
                />
                <div className="flex justify-between text-[10px] font-mono-code font-black text-[#121212]/50 -mt-1">
                  <span>{fmt(elapsed)}</span>
                  <span>{dur > 0 ? (formatTrackDuration ? formatTrackDuration(dur) : fmt(dur)) : '--:--'}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between px-1">
                <button
                  onClick={onShuffle}
                  className={`w-10 h-10 rounded-xl border-2 border-[#121212] flex items-center justify-center ${shuffle ? 'bg-[#38E54D] shadow-[2px_2px_0px_#121212]' : 'bg-white shadow-[2px_2px_0px_#121212]'}`}
                  aria-label="Acak"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
                <button onClick={onPrev} className="w-12 h-12 rounded-xl bg-white border-2 border-[#121212] shadow-[2.5px_2.5px_0px_#121212] flex items-center justify-center active:translate-x-0.5 active:translate-y-0.5 active:shadow-none" aria-label="Sebelumnya">
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={onToggle}
                  className="w-16 h-16 rounded-2xl bg-[#121212] text-[#FFE600] border-[2.5px] border-[#121212] shadow-[3.5px_3.5px_0px_#38E54D] flex items-center justify-center active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  aria-label={playing ? 'Jeda' : 'Putar'}
                >
                  {playing ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
                </button>
                <button onClick={onNext} className="w-12 h-12 rounded-xl bg-white border-2 border-[#121212] shadow-[2.5px_2.5px_0px_#121212] flex items-center justify-center active:translate-x-0.5 active:translate-y-0.5 active:shadow-none" aria-label="Berikutnya">
                  <SkipForward className="w-5 h-5" />
                </button>
                <button
                  onClick={onRepeat}
                  className={`w-10 h-10 rounded-xl border-2 border-[#121212] flex items-center justify-center ${repeatOne ? 'bg-[#38E54D] shadow-[2px_2px_0px_#121212]' : 'bg-white shadow-[2px_2px_0px_#121212]'}`}
                  aria-label="Ulangi"
                >
                  {repeatOne ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'lyrics' && (
          <div className="h-full flex flex-col">
            <div className="shrink-0 flex items-center gap-2 pb-2">
              <div className="w-10 h-10 shrink-0">
                <Artwork track={track} size="sm" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black truncate">{track.title}</p>
                <p className="text-[10px] font-mono-code font-bold text-[#121212]/50 truncate">{track.artist}</p>
              </div>
            </div>
            <div className="flex-1 min-h-0 bg-white border-[2.5px] border-[#121212] rounded-2xl shadow-[3px_3px_0px_#121212] overflow-hidden">
              <LyricsView lyricsState={lyricsState} elapsed={elapsed} onSeek={onSeek} />
            </div>
          </div>
        )}

        {tab === 'queue' && (
          <div className="h-full flex flex-col">
            <div className="shrink-0 flex items-center justify-between pb-2">
              <p className="text-[10px] font-mono-code font-black uppercase tracking-widest text-[#121212]/50">
                Antrean · {queue.length} lagu
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto bg-white border-[2.5px] border-[#121212] rounded-2xl shadow-[3px_3px_0px_#121212] p-1.5 space-y-1">
              {queue.length === 0 && (
                <p className="text-xs font-mono-code font-bold text-[#121212]/40 text-center py-8">Antrean kosong</p>
              )}
              {queue.map((t, i) => {
                const active = i === queueIndex;
                return (
                  <button
                    key={`${t.id}-${i}`}
                    onClick={() => onJump?.(i)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-left transition-colors ${active ? 'bg-[#FFE600] border-2 border-[#121212]' : 'hover:bg-[#F8F5EE] border-2 border-transparent'}`}
                  >
                    <span className="w-5 text-[10px] font-mono-code font-black text-[#121212]/40 shrink-0">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black truncate">{t.title}</p>
                      <p className="text-[11px] font-mono-code font-bold text-[#121212]/45 truncate">{t.artist}</p>
                    </div>
                    {active && <Music2 className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
