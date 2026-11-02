import React, { useEffect, useState } from 'react';
import { BellOff, BellRing, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import {
  getDndState, setDndAuto, setDndEnabled, openDndSettings,
  dndStatusLabel, shouldEnableDnd, DEFAULT_DND_STATE,
} from '../../../services/dnd.js';
import { isNative } from '../../../services/http.js';

/**
 * Panel Ardoro — Mode Jangan Ganggu (DND) otomatis.
 *
 * Saat sesi fokus berjalan, DND dinyalakan otomatis (hening) lalu dipulihkan
 * ke kondisi asli user saat jeda/selesai. Izin "Akses Jangan Ganggu" harus
 * diaktifkan manual oleh user lewat tombol di panel ini.
 */
export default function DndPanel({ phase = 'focus', running = false }) {
  const [state, setState] = useState(DEFAULT_DND_STATE);
  const [toast, setToast] = useState('');
  const native = isNative();

  const refresh = async () => {
    const s = await getDndState();
    setState(s);
  };

  useEffect(() => {
    if (!native) return;
    refresh();
    // Segarkan status saat user kembali dari Pengaturan sistem.
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    const timer = setInterval(onFocus, 4000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [native]);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  if (!native) {
    return (
      <div className="nb-card p-3 bg-[#F8F5EE] space-y-2">
        <div className="flex items-center gap-1.5">
          <BellOff className="w-4 h-4 text-[#121212]" />
          <span className="text-[11px] font-black uppercase text-gray-600">Jangan Ganggu (Hening)</span>
        </div>
        <p className="text-[10px] font-bold text-gray-600">
          Fitur ini hanya aktif di aplikasi Android (native), bukan di browser web.
        </p>
      </div>
    );
  }

  const toggleAuto = async () => {
    const next = await setDndAuto(!state.auto);
    if (next) setState(next);
    flash(!state.auto ? 'DND otomatis: ON' : 'DND otomatis: OFF');
  };

  const toggleNow = async () => {
    const next = await setDndEnabled(!state.active);
    if (!next) { flash('Gagal mengubah mode Jangan Ganggu'); return; }
    setState(next);
    if (next.needsPermission) {
      flash('Perlu izin — buka Pengaturan');
    } else {
      flash(next.active ? 'Mode hening AKTIF' : 'Mode hening dimatikan');
    }
  };

  return (
    <div className="nb-card p-3 bg-[#F8F5EE] space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-black uppercase text-gray-600">
          {state.active ? <BellOff className="w-4 h-4" /> : <BellRing className="w-4 h-4" />}
          Jangan Ganggu (Hening)
        </span>
        <span className={`text-[11px] font-black px-1.5 py-0.5 rounded border border-[#121212] ${
          !state.supported ? 'bg-white'
            : !state.granted ? 'bg-[#FFE600]'
            : state.active ? 'bg-[#38E54D]'
            : 'bg-white'
        }`}>
          {dndStatusLabel(state)}
        </span>
      </div>

      {toast && (
        <div className="text-[10px] font-black bg-[#121212] text-[#FFE600] px-2 py-1 rounded border border-[#121212]">
          {toast}
        </div>
      )}

      {!state.supported && (
        <p className="text-[10px] font-bold text-gray-600">
          Perangkat ini tidak mendukung kontrol Jangan Ganggu (butuh Android 6+).
        </p>
      )}

      {state.supported && (
        <>
          {/* Izin akses Jangan Ganggu */}
          <div className="nb-card p-2.5 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-gray-600">Izin Akses Jangan Ganggu</span>
              <span className={`text-[11px] font-black px-1.5 py-0.5 rounded border border-[#121212] ${
                state.granted ? 'bg-[#38E54D]' : 'bg-[#FFE600]'
              }`}>
                {state.granted ? 'SUDAH AKTIF' : 'BELUM AKTIF'}
              </span>
            </div>
            <button
              onClick={async () => { await openDndSettings(); }}
              className="nb-btn w-full px-3 py-1.5 text-[10px] font-black bg-[#C4FAF8] text-[#121212]"
            >
              Buka Pengaturan Izin
            </button>
            {!state.granted && (
              <p className="flex items-start gap-1.5 text-[10px] font-bold text-[#8A6D00] bg-[#FFF3C4] border border-[#121212] rounded p-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Android mewajibkan izin ini diaktifkan manual: pilih <b>Arplication</b> →
                <b> Izinkan</b> di halaman yang terbuka.
              </p>
            )}
          </div>

          {/* Kontrol */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={toggleAuto}
              className={`nb-btn px-3 py-1.5 text-[10px] font-black flex items-center gap-1 ${
                state.auto ? 'bg-[#38E54D] text-[#121212]' : 'bg-white text-[#121212]'
              }`}
              aria-pressed={state.auto}
            >
              {state.auto ? <Check className="w-3.5 h-3.5" /> : null}
              Otomatis saat Fokus: {state.auto ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={toggleNow}
              disabled={!state.granted}
              className={`nb-btn px-3 py-1.5 text-[10px] font-black flex items-center gap-1 ${
                state.active ? 'bg-[#FF525E] text-white' : 'bg-[#FFE600] text-[#121212]'
              } ${!state.granted ? 'opacity-50' : ''}`}
            >
              {state.active ? <BellRing className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              Hening Sekarang: {state.active ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={refresh}
              className="nb-btn px-2.5 py-1.5 text-[10px] font-black bg-[#F8F5EE] text-[#121212] flex items-center gap-1"
              title="Segarkan status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[10px] text-gray-600 leading-snug">
            Saat timer <b>FOKUS</b> berjalan, HP otomatis masuk mode hening (tidak bergetar/bunyi).
            Begitu istirahat atau selesai, pengaturan notifikasi dipulihkan persis seperti semula.
          </p>

          {/* Pratinjau: apakah DND seharusnya aktif pada kondisi timer saat ini */}
          <div className={`flex items-center gap-1.5 text-[10px] font-bold border border-[#121212] rounded p-2 ${
            shouldEnableDnd(phase, state.auto) && running ? 'bg-[#C4FAF8] text-[#121212]' : 'bg-white text-gray-600'
          }`}>
            <span className={`w-2 h-2 rounded-full border border-[#121212] ${
              shouldEnableDnd(phase, state.auto) && running ? 'bg-[#38E54D]' : 'bg-gray-300'
            }`} />
            {shouldEnableDnd(phase, state.auto) && running
              ? 'Sedang fokus — mode hening seharusnya aktif sekarang.'
              : 'Mode hening akan aktif saat sesi FOKUS dimulai.'}
          </div>
        </>
      )}
    </div>
  );
}
