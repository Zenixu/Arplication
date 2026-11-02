import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  ShieldBan, ShieldCheck, Search, RefreshCw, Lock, Unlock,
  AlertTriangle, ChevronDown, Check, Hourglass, X,
} from 'lucide-react';
import {
  getBlockerConfig, setBlockerConfig, getInstalledApps,
  openAccessibilitySettings, openOverlaySettings,
  filterApps, isBlocked, DEFAULT_BLOCKER_CONFIG,
} from '../../../services/appBlocker.js';
import {
  needsGrace, clampGrace, formatCountdown, graceWarningText, strictLabel,
} from '../../../utils/focusLock.js';
import { isNative } from '../../../services/http.js';

/**
 * Panel Ardoro Focus Lock — pilih aplikasi yang diblokir selama sesi fokus.
 * Semua pengaturan disimpan di native (SharedPreferences) via bridge AppBlocker.
 *
 * Mode Ketat Level 3 (Jeda Wajib): saat sesi fokus berjalan, mematikan blokir
 * tidak instan — user harus menunggu countdown dulu.
 *
 * @param {{focusRunning?: boolean, focusElapsedSec?: number}} props
 */
export default function FocusLockPanel({ focusRunning = false, focusElapsedSec = 0 }) {
  const [config, setConfig] = useState(DEFAULT_BLOCKER_CONFIG);
  const [apps, setApps] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [toast, setToast] = useState('');
  const [grace, setGrace] = useState(null); // { action, remaining, message }

  const native = isNative();

  const refresh = async ({ reloadApps = false } = {}) => {
    setLoading(true);
    const c = await getBlockerConfig();
    if (c) setConfig(c);
    if (reloadApps || apps.length === 0) {
      const list = await getInstalledApps();
      setApps(list);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!native) return;
    refresh({ reloadApps: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [native]);

  // Saat user kembali dari Settings (izin berubah), segarkan status izin.
  useEffect(() => {
    if (!native || !expanded) return;
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    const timer = setInterval(onFocus, 4000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [native, expanded]);

  // Countdown jeda wajib (Mode Ketat Level 3).
  const graceTimer = useRef(null);
  useEffect(() => {
    if (!grace) return undefined;
    if (grace.remaining <= 0) {
      // Selesai — jalankan aksi yang tertunda.
      const { action } = grace;
      setGrace(null);
      persist(action.patch, action.msg);
      return undefined;
    }
    graceTimer.current = setTimeout(() => {
      setGrace((g) => (g ? { ...g, remaining: g.remaining - 1 } : null));
    }, 1000);
    return () => clearTimeout(graceTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grace]);

  const selected = useMemo(
    () => new Set(Array.isArray(config.packages) ? config.packages : []),
    [config.packages],
  );

  const visibleApps = useMemo(() => filterApps(apps, query), [apps, query]);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const persist = async (patch, msg) => {
    const next = await setBlockerConfig(patch);
    if (next) setConfig(next);
    if (msg) flash(msg);
  };

  /**
   * Jalankan aksi; bila Mode Ketat + sesi fokus aktif + mematikan → tampilkan jeda wajib.
   */
  const runAction = (patch, msg) => {
    const nextValue = patch.enabled !== undefined ? patch.enabled : patch.auto;
    if (needsGrace(config, { focusRunning, nextValue })) {
      setGrace({
        patch,
        msg,
        remaining: clampGrace(config.graceSeconds),
        message: graceWarningText(focusElapsedSec),
      });
      return;
    }
    persist(patch, msg);
  };

  const cancelGrace = () => {
    clearTimeout(graceTimer.current);
    setGrace(null);
    flash('Dibatalkan — blokir tetap aktif');
  };

  const togglePackage = (pkg) => {
    const list = new Set(selected);
    if (list.has(pkg)) list.delete(pkg);
    else list.add(pkg);
    const packages = Array.from(list);
    setConfig((c) => ({ ...c, packages }));
    persist({ packages });
  };

  const ready = config.accessibilityEnabled;

  if (!native) {
    return (
      <div className="nb-card p-3 bg-[#F8F5EE] space-y-2">
        <div className="flex items-center gap-1.5">
          <ShieldBan className="w-4 h-4 text-[#121212]" />
          <span className="text-[11px] font-black uppercase text-gray-600">Focus Lock (Blokir Aplikasi)</span>
        </div>
        <p className="text-[10px] font-bold text-gray-600">
          Fitur ini hanya aktif di aplikasi Android (native), bukan di browser web.
        </p>
      </div>
    );
  }

  return (
    <div className="nb-card p-3 bg-[#F8F5EE] space-y-3">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-1.5">
          <ShieldBan className="w-4 h-4 text-[#121212]" />
          <span className="text-[11px] font-black uppercase text-gray-600">Focus Lock — Blokir Aplikasi</span>
        </span>
        <span className="flex items-center gap-1.5">
          {config.strict && (
            <span className="text-[11px] font-black px-1.5 py-0.5 rounded border border-[#121212] bg-[#C4FAF8] text-[#121212]">
              KETAT
            </span>
          )}
          <span className={`text-[11px] font-black px-1.5 py-0.5 rounded border border-[#121212] ${
            ready && config.enabled ? 'bg-[#FF525E] text-white' : 'bg-white text-[#121212]'
          }`}>
            {ready ? (config.enabled ? 'AKTIF' : 'SIAP') : 'PERLU IZIN'}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {toast && (
        <div className="text-[10px] font-black bg-[#121212] text-[#FFE600] px-2 py-1 rounded border border-[#121212]">
          {toast}
        </div>
      )}

      {/* Overlay Jeda Wajib (Mode Ketat Level 3) */}
      {grace && (
        <div className="nb-card p-3 bg-[#FFE600] border-2 border-[#121212] space-y-2">
          <div className="flex items-center gap-1.5">
            <Hourglass className="w-4 h-4 text-[#121212]" />
            <span className="text-[10px] font-black uppercase text-[#121212]">Jeda Wajib — Mode Ketat</span>
          </div>
          <p className="text-[11px] font-bold text-[#121212] leading-snug">{grace.message}</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black text-[#121212] tabular-nums">
              {formatCountdown(grace.remaining)}
            </span>
            <button
              onClick={cancelGrace}
              className="nb-btn px-3 py-1.5 text-[10px] font-black bg-white text-[#121212] flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Batal (tetap fokus)
            </button>
          </div>
          <p className="text-[11px] font-bold text-[#121212]/70 leading-snug">
            Tombol akan aktif otomatis setelah hitungan selesai. Gunakan jeda ini untuk berpikir ulang.
          </p>
        </div>
      )}

      {expanded && (
        <div className="space-y-3 pt-1">
          {/* Step 1 — izin */}
          <div className="nb-card p-3 bg-white space-y-2">
            <span className="text-[10px] font-black uppercase text-gray-600">1. Izin Aksesibilitas</span>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border border-[#121212] ${
                config.accessibilityEnabled ? 'bg-[#38E54D]' : 'bg-[#FFE600]'
              }`}>
                {config.accessibilityEnabled ? 'SUDAH AKTIF' : 'BELUM AKTIF'}
              </span>
              <button
                onClick={() => openAccessibilitySettings()}
                className="nb-btn px-3 py-1.5 text-[10px] font-black bg-[#C4FAF8] text-[#121212]"
              >
                Buka Pengaturan
              </button>
            </div>
            <p className="text-[10px] text-gray-600 leading-snug">
              Aktifkan <b>Arplication Fokus</b> di <i>Settings → Accessibility</i>. Izin ini wajib
              agar Ardoro bisa mendeteksi aplikasi yang dibuka selama sesi fokus.
            </p>
          </div>

          {/* Izin overlay (opsional) */}
          <div className="nb-card p-3 bg-white space-y-2">
            <span className="text-[10px] font-black uppercase text-gray-600">2. Izin Overlay (opsional)</span>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border border-[#121212] ${
                config.overlayGranted ? 'bg-[#38E54D]' : 'bg-white'
              }`}>
                {config.overlayGranted ? 'DIIZINKAN' : 'BELUM'}
              </span>
              <button
                onClick={() => openOverlaySettings()}
                className="nb-btn px-3 py-1.5 text-[10px] font-black bg-[#F8F5EE] text-[#121212]"
              >
                Buka Pengaturan
              </button>
            </div>
            <p className="text-[10px] text-gray-600 leading-snug">
              Dengan izin ini, Ardoro menampilkan layar &quot;Fokus Dulu!&quot; sebelum kembali ke Home.
              Tanpa izin ini aplikasi tetap diblokir, hanya tanpa overlay.
            </p>
          </div>

          {/* Step 3 — mode + auto */}
          <div className="nb-card p-3 bg-white space-y-2.5">
            <span className="text-[10px] font-black uppercase text-gray-600">3. Mode Blokir</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => persist({ mode: 'blacklist' }, 'Mode: Blacklist')}
                className={`nb-btn px-2 py-2 text-[10px] font-black flex items-center justify-center gap-1 ${
                  config.mode !== 'whitelist' ? 'bg-[#FF525E] text-white' : 'bg-[#F8F5EE] text-[#121212]'
                }`}
              >
                <ShieldBan className="w-3.5 h-3.5" /> Blacklist
              </button>
              <button
                onClick={() => persist({ mode: 'whitelist' }, 'Mode: Whitelist')}
                className={`nb-btn px-2 py-2 text-[10px] font-black flex items-center justify-center gap-1 ${
                  config.mode === 'whitelist' ? 'bg-[#38E54D] text-[#121212]' : 'bg-[#F8F5EE] text-[#121212]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Whitelist
              </button>
            </div>
            <p className="text-[10px] text-gray-600 leading-snug">
              {config.mode === 'whitelist'
                ? 'WHITELIST: hanya aplikasi yang dicentang boleh dibuka. Sisanya diblokir.'
                : 'BLACKLIST: aplikasi yang dicentang akan diblokir. Sisanya bebas.'}
            </p>

            <div className="flex flex-wrap gap-2 pt-0.5">
              <button
                onClick={() => runAction(
                  { auto: !config.auto },
                  config.auto ? 'Auto: OFF' : 'Auto: ON',
                )}
                className={`nb-btn px-3 py-1.5 text-[10px] font-black flex items-center gap-1 ${
                  config.auto ? 'bg-[#38E54D] text-[#121212]' : 'bg-white text-[#121212]'
                }`}
                aria-pressed={config.auto}
              >
                {config.auto ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                Auto saat Fokus: {config.auto ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => runAction(
                  { enabled: !config.enabled },
                  config.enabled ? 'Blokir dimatikan' : 'Blokir diaktifkan',
                )}
                className={`nb-btn px-3 py-1.5 text-[10px] font-black ${
                  config.enabled ? 'bg-[#FF525E] text-white' : 'bg-[#FFE600] text-[#121212]'
                }`}
              >
                Blokir Manual: {config.enabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Step 4 — Mode Ketat Level 3 */}
          <div className="nb-card p-3 bg-white space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-gray-600">4. Mode Ketat (Level 3)</span>
              <span className={`text-[11px] font-black px-1.5 py-0.5 rounded border border-[#121212] ${
                config.strict ? 'bg-[#C4FAF8]' : 'bg-white'
              }`}>
                {strictLabel(config)}
              </span>
            </div>
            <button
              onClick={() => persist(
                { strict: !config.strict },
                config.strict ? 'Mode Ketat: OFF' : 'Mode Ketat: ON',
              )}
              className={`nb-btn w-full px-3 py-2 text-[10px] font-black flex items-center justify-center gap-1.5 ${
                config.strict ? 'bg-[#C4FAF8] text-[#121212]' : 'bg-[#F8F5EE] text-[#121212]'
              }`}
              aria-pressed={config.strict}
            >
              <Hourglass className="w-3.5 h-3.5" />
              Jeda Wajib: {config.strict ? 'ON' : 'OFF'}
            </button>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-600">
                <span>Lama jeda</span>
                <span className="font-black text-[#121212]">{clampGrace(config.graceSeconds)} detik</span>
              </div>
              <input
                type="range"
                min="3"
                max="60"
                step="1"
                value={clampGrace(config.graceSeconds)}
                onChange={(e) => setConfig((c) => ({ ...c, graceSeconds: Number(e.target.value) }))}
                onMouseUp={(e) => persist({ graceSeconds: Number(e.target.value) })}
                onTouchEnd={(e) => persist({ graceSeconds: Number(e.target.value) })}
                className="w-full"
                aria-label="Lama jeda wajib (detik)"
              />
            </div>
            <p className="text-[10px] text-gray-600 leading-snug">
              Saat sesi fokus berjalan, mematikan blokir tidak instan: kamu harus menunggu hitungan
              mundur <b>{clampGrace(config.graceSeconds)} detik</b>. Ini memberi jeda berpikir, bukan
              mengunci permanen — timer habis tetap membebaskanmu.
            </p>
            {config.strict && focusRunning && (
              <div className="flex items-start gap-1.5 text-[10px] font-bold text-[#121212] bg-[#FFE600] border border-[#121212] rounded p-2">
                <Hourglass className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Sesi fokus sedang berjalan — Mode Ketat aktif sekarang.
              </div>
            )}
          </div>

          {/* Step 5 — pilih aplikasi */}
          <div className="nb-card p-3 bg-white space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-gray-600">
                5. Pilih Aplikasi ({selected.size})
              </span>
              <button
                onClick={() => refresh({ reloadApps: true })}
                className="nb-btn px-2 py-1 text-[10px] font-black bg-[#F8F5EE] text-[#121212] flex items-center gap-1"
                disabled={loading}
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Muat Ulang
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari aplikasi (TikTok, Instagram, Discord…)"
                className="w-full bg-[#F8F5EE] border-2 border-[#121212] rounded-lg pl-8 pr-2 py-1.5 text-xs font-bold text-[#121212] outline-none"
              />
            </div>

            {config.mode === 'whitelist' && selected.size === 0 && (
              <div className="flex items-start gap-1.5 text-[10px] font-bold text-[#8A6D00] bg-[#FFF3C4] border border-[#121212] rounded p-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Whitelist kosong — tidak ada aplikasi yang diblokir. Centang minimal satu aplikasi.
              </div>
            )}

            <div className="max-h-64 overflow-y-auto border-2 border-[#121212] rounded-lg divide-y-2 divide-[#121212] bg-[#F8F5EE]">
              {loading && apps.length === 0 && (
                <p className="text-[10px] font-bold text-gray-600 p-3">Memuat daftar aplikasi…</p>
              )}
              {!loading && visibleApps.length === 0 && (
                <p className="text-[10px] font-bold text-gray-600 p-3">Tidak ada aplikasi yang cocok.</p>
              )}
              {visibleApps.map((app) => {
                const checked = selected.has(app.packageName);
                const blocked = isBlocked(app.packageName, config);
                return (
                  <button
                    key={app.packageName}
                    onClick={() => togglePackage(app.packageName)}
                    className="w-full flex items-center gap-2.5 p-2 text-left hover:bg-white"
                  >
                    {app.icon ? (
                      <img src={app.icon} alt="" className="w-7 h-7 rounded-md border border-[#121212] shrink-0" />
                    ) : (
                      <span className="w-7 h-7 rounded-md border border-[#121212] bg-white shrink-0" />
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block text-[11px] font-black text-[#121212] truncate">{app.label}</span>
                      <span className="block text-[11px] font-mono-code text-gray-500 truncate">{app.packageName}</span>
                    </span>
                    {blocked && (
                      <span className="text-[10px] font-black bg-[#FF525E] text-white px-1 py-0.5 rounded border border-[#121212] shrink-0">
                        BLOKIR
                      </span>
                    )}
                    <span className={`w-5 h-5 rounded border-2 border-[#121212] flex items-center justify-center shrink-0 ${
                      checked ? 'bg-[#38E54D]' : 'bg-white'
                    }`}>
                      {checked && <Check className="w-3.5 h-3.5 text-[#121212]" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] text-gray-600 leading-snug">
              Tips cepat: blokir <b>TikTok</b>, <b>Instagram</b>, dan <b>Discord</b> agar tidak
              bisa dibuka selama timer fokus Ardoro berjalan.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
