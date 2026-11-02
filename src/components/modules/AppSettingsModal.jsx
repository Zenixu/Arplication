import React, { useState, useRef } from 'react';
import { 
  X, Settings, Volume2, 
  Trash2, RefreshCw, Sparkles, Download,
  DatabaseBackup, Upload, KeyRound
} from 'lucide-react';
import { APP_VERSION, checkForAppUpdate } from '../../services/updater';
import { clearToolboxHistory } from '../../services/toolboxDb';
import {
  downloadBackup,
  parseBackupText,
  summarizeBackup,
  restoreBackup,
  formatBytes,
} from '../../services/backupService';
import RestoreConfirmModal from './RestoreConfirmModal';

export default function AppSettingsModal({ isOpen, onClose }) {
  const [hapticEnabled, setHapticEnabled] = useState(() => {
    return localStorage.getItem('ar_setting_haptic') !== 'false';
  });
  const [autoScanMusic, setAutoScanMusic] = useState(() => {
    return localStorage.getItem('ar_setting_autoscan') !== 'false';
  });
  const [downloadSubfolder, setDownloadSubfolder] = useState(() => {
    return localStorage.getItem('arloader_folder_preset') || 'auto';
  });
  const [clearedMsg, setClearedMsg] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);

  // Backup & Restore
  const [includeSensitive, setIncludeSensitive] = useState(false);
  const [backupStatus, setBackupStatus] = useState(null); // { type, msg }
  const [busy, setBusy] = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null); // { data, summary }
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleToggleHaptic = () => {
    const next = !hapticEnabled;
    setHapticEnabled(next);
    localStorage.setItem('ar_setting_haptic', String(next));
  };

  const handleToggleAutoScan = () => {
    const next = !autoScanMusic;
    setAutoScanMusic(next);
    localStorage.setItem('ar_setting_autoscan', String(next));
  };

  const handleFolderChange = (val) => {
    setDownloadSubfolder(val);
    localStorage.setItem('arloader_folder_preset', val);
  };

  const handleClearCache = () => {
    try {
      clearToolboxHistory();
      localStorage.removeItem('arloader_history');
      setClearedMsg('Cache dan riwayat sementara berhasil dibersihkan!');
      setTimeout(() => setClearedMsg(null), 2500);
    } catch {
      setClearedMsg('Gagal membersihkan cache.');
    }
  };

  const handleBackup = async () => {
    setBusy(true);
    setBackupStatus(null);
    try {
      const res = await downloadBackup({ includeSensitive });
      const s = res.summary;
      setBackupStatus({
        type: 'ok',
        msg: `Cadangan dibuat: ${res.filename} (${s.keys} kunci, ${s.notes} catatan, ${formatBytes(s.bytes)}). Tersimpan di folder Download/Aruthtale/Backup.`,
      });
    } catch (err) {
      setBackupStatus({ type: 'error', msg: `Gagal membuat cadangan: ${err?.message || err}` });
    } finally {
      setBusy(false);
    }
  };

  const handlePickRestoreFile = () => {
    setBackupStatus(null);
    fileInputRef.current?.click();
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // izinkan pilih file yang sama lagi
    if (!file) return;
    try {
      const text = await file.text();
      const data = parseBackupText(text);
      const summary = summarizeBackup(data);
      setPendingRestore({ data, summary });
    } catch (err) {
      setBackupStatus({ type: 'error', msg: `File cadangan tidak bisa dibaca: ${err?.message || err}` });
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    setBusy(true);
    try {
      const res = await restoreBackup(pendingRestore.data, { includeSensitive });
      setPendingRestore(null);
      setBackupStatus({
        type: 'ok',
        msg: `Pemulihan berhasil (${res.localWritten} kunci, ${res.idbWritten} item). Memuat ulang…`,
      });
      setTimeout(() => {
        if (typeof window !== 'undefined') window.location.reload();
      }, 1200);
    } catch (err) {
      setPendingRestore(null);
      setBackupStatus({ type: 'error', msg: `Gagal memulihkan: ${err?.message || err}` });
      setBusy(false);
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    try {
      const res = await checkForAppUpdate();
      if (res?.hasUpdate) {
        setUpdateStatus({
          type: 'update',
          msg: `Versi baru v${res.latestVersion} tersedia!`,
          url: res.downloadUrl,
        });
      } else {
        setUpdateStatus({
          type: 'latest',
          msg: `Aplikasi sudah dalam versi terbaru (v${APP_VERSION}).`,
        });
      }
    } catch {
      setUpdateStatus({
        type: 'error',
        msg: 'Gagal mengecek pembaruan. Periksa koneksi internet.',
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="w-full max-w-lg max-h-[88vh] bg-[#F8F5EE] rounded-2xl border-[3px] border-[#121212] shadow-[6px_6px_0px_#121212] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 bg-[#FFE600] border-b-[2.5px] border-[#121212] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#121212]" />
            <h3 className="text-base sm:text-lg font-black uppercase text-[#121212]">
              Pengaturan Aplikasi
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-white hover:bg-red-100 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
          >
            <X className="w-4 h-4 text-[#121212]" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          
          {/* Section 1: Penyimpanan & Download */}
          <div className="p-3.5 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-[#121212] border-b border-[#121212]/15 pb-2">
              <Download className="w-4 h-4 text-[#38E54D]" />
              <span>Penyimpanan & Unduhan</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Struktur Folder Unduhan</label>
              <select
                value={downloadSubfolder}
                onChange={(e) => handleFolderChange(e.target.value)}
                className="w-full p-2 rounded-xl border-2 border-[#121212] font-mono font-bold text-xs bg-[#F8F5EE] cursor-pointer"
              >
                <option value="auto">Folder Otomatis (TikTok, YouTube, Instagram, Spotify)</option>
                <option value="flat">Satu Folder Utama (Download/Aruthtale)</option>
                <option value="media_type">Berdasarkan Tipe (Video, Audio, Gambar)</option>
              </select>
            </div>
          </div>

          {/* Section 2: Pemutar Musik & Notifikasi */}
          <div className="p-3.5 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-[#121212] border-b border-[#121212]/15 pb-2">
              <Volume2 className="w-4 h-4 text-[#D8B4FE]" />
              <span>Pemutar Musik & Audio</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-black text-[#121212]">Pindai Musik Otomatis</div>
                <div className="text-[10px] text-gray-600">Otomatis deteksi lagu baru saat membuka ArMusic</div>
              </div>
              <button
                onClick={handleToggleAutoScan}
                className={`w-12 h-6 rounded-full border-2 border-[#121212] p-0.5 transition-colors cursor-pointer ${
                  autoScanMusic ? 'bg-[#38E54D]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white border border-[#121212] shadow-sm transform transition-transform ${
                    autoScanMusic ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#121212]/10">
              <div>
                <div className="text-xs font-black text-[#121212]">Suara Notifikasi & Haptik</div>
                <div className="text-[10px] text-gray-600">Getaran konfirmasi saat aksi selesai</div>
              </div>
              <button
                onClick={handleToggleHaptic}
                className={`w-12 h-6 rounded-full border-2 border-[#121212] p-0.5 transition-colors cursor-pointer ${
                  hapticEnabled ? 'bg-[#38E54D]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white border border-[#121212] shadow-sm transform transition-transform ${
                    hapticEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section: Cadangan & Pemulihan */}
          <div className="p-3.5 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-[#121212] border-b border-[#121212]/15 pb-2">
              <DatabaseBackup className="w-4 h-4 text-[#4D8BFF]" />
              <span>Cadangan & Pemulihan Data</span>
            </div>

            <p className="text-[10px] text-gray-600 leading-relaxed">
              Simpan seluruh data (pengaturan, catatan ArNote, playlist ArMusic, statistik
              Ardoro, riwayat) ke satu file. Pulihkan kapan saja — mis. setelah pasang ulang.
            </p>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#FF9F1C]" />
                <div>
                  <div className="text-[11px] font-black text-[#121212]">Sertakan login</div>
                  <div className="text-[11px] text-gray-500">Token YouTube Music (opsional)</div>
                </div>
              </div>
              <button
                onClick={() => setIncludeSensitive((v) => !v)}
                className={`w-12 h-6 rounded-full border-2 border-[#121212] p-0.5 transition-colors cursor-pointer ${
                  includeSensitive ? 'bg-[#FF9F1C]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white border border-[#121212] shadow-sm transform transition-transform ${
                    includeSensitive ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleBackup}
                disabled={busy}
                className="py-2 bg-[#38E54D] hover:bg-[#2FCC42] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 text-[11px] font-black rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{busy ? 'Memproses…' : 'Cadangkan'}</span>
              </button>
              <button
                onClick={handlePickRestoreFile}
                disabled={busy}
                className="py-2 bg-white hover:bg-[#FFE600] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 text-[11px] font-black rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Pulihkan</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleRestoreFile}
              className="hidden"
            />

            {backupStatus && (
              <div className={`p-2 rounded-lg border text-[11px] font-bold ${
                backupStatus.type === 'ok'
                  ? 'bg-[#E8FCE8] border-green-700 text-green-900'
                  : 'bg-red-100 border-red-500 text-red-800'
              }`}>
                {backupStatus.msg}
              </div>
            )}
          </div>

          {/* Section 3: Pembersihan Cache */}
          <div className="p-3.5 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-black uppercase text-[#121212]">Bersihkan Cache & Riwayat</div>
                <div className="text-[10px] text-gray-600">Kosongkan log download dan riwayat perkakas tanpa menghapus file unduhan</div>
              </div>
              <button
                onClick={handleClearCache}
                className="px-3 py-1.5 bg-[#FF70A6] hover:bg-[#FF5A8C] active:translate-x-0.5 active:translate-y-0.5 text-xs font-black rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan</span>
              </button>
            </div>

            {clearedMsg && (
              <div className="p-2 bg-[#E8FCE8] border border-[#121212] rounded-lg text-xs font-bold text-green-800 text-center">
                {clearedMsg}
              </div>
            )}
          </div>

          {/* Section 4: Info Versi & Pembaruan */}
          <div className="p-3.5 bg-[#FFFDE6] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#121212]" />
                <span className="text-xs font-black uppercase text-[#121212]">Versi Aplikasi</span>
              </div>
              <span className="px-2 py-0.5 bg-[#38E54D] border border-[#121212] rounded text-[10px] font-mono font-black">
                v{APP_VERSION}
              </span>
            </div>

            <button
              onClick={handleCheckUpdate}
              disabled={checkingUpdate}
              className="w-full py-2 bg-white hover:bg-[#FFE600] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 text-xs font-black rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
              <span>{checkingUpdate ? 'Memeriksa GitHub...' : 'Periksa Pembaruan'}</span>
            </button>

            {updateStatus && (
              <div className={`p-2.5 rounded-lg border text-xs font-bold ${
                updateStatus.type === 'update' 
                  ? 'bg-[#38E54D]/25 border-green-700 text-green-900' 
                  : updateStatus.type === 'latest'
                  ? 'bg-white border-[#121212] text-gray-800'
                  : 'bg-red-100 border-red-500 text-red-800'
              }`}>
                {updateStatus.msg}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t-2 border-[#121212] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#FFE600] hover:bg-[#FFD700] active:translate-x-0.5 active:translate-y-0.5 text-xs font-black rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] cursor-pointer"
          >
            Selesai
          </button>
        </div>

      </div>

      <RestoreConfirmModal
        isOpen={pendingRestore !== null}
        onClose={() => setPendingRestore(null)}
        onConfirm={handleConfirmRestore}
        summary={pendingRestore?.summary}
      />
    </div>
  );
}
