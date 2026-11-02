import React, { useState, useEffect } from 'react';
import { 
  Settings, Folder, Check, RotateCcw, X, Key, Eye, EyeOff, 
  HelpCircle, ChevronDown, ChevronUp, ShieldCheck, Info, FileCode,
  Laptop, Smartphone, Lock, Server
} from 'lucide-react';
import { getDownloadSettings, saveDownloadSettings, DEFAULT_DOWNLOAD_SETTINGS } from '../../../utils/download.js';

export default function DownloadSettingsModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState(DEFAULT_DOWNLOAD_SETTINGS);
  const [savedStatus, setSavedStatus] = useState(false);
  const [showSessionId, setShowSessionId] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [activeTabGuide, setActiveTabGuide] = useState('pc'); // 'pc' | 'phone'

  useEffect(() => {
    if (isOpen) {
      setSettings(getDownloadSettings());
      setSavedStatus(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveDownloadSettings(settings);
    setSavedStatus(true);
    setTimeout(() => {
      setSavedStatus(false);
      onClose();
    }, 400);
  };

  const handleReset = () => {
    setSettings(DEFAULT_DOWNLOAD_SETTINGS);
    saveDownloadSettings(DEFAULT_DOWNLOAD_SETTINGS);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 1000);
  };

  const cleanSubfolder = String(settings.subfolder || '').trim().replace(/^\/+|\/+$/g, '');
  const dirLabel = settings.directory === 'Documents' ? 'Documents' : 'Download';
  const previewPath = cleanSubfolder ? `${dirLabel}/${cleanSubfolder}/` : `${dirLabel}/`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="w-full max-w-[480px] max-h-[90vh] overflow-y-auto bg-[#F8F5EE] border-[3.5px] border-[#121212] rounded-t-[32px] sm:rounded-3xl p-5 sm:p-6 shadow-[6px_6px_0px_#121212] space-y-4 text-[#121212] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFE600] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#121212]">
              <Settings className="w-5 h-5 text-[#121212]" />
            </div>
            <div>
              <h4 className="font-black text-sm sm:text-base text-[#121212] uppercase tracking-tight">
                PENGATURAN PENYIMPANAN & SESI
              </h4>
              <p className="text-[10px] font-mono-code font-bold text-gray-600">
                Konfigurasi folder, penamaan file, & akses Instagram
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 bg-white nb-btn p-0 flex items-center justify-center font-black text-xs shrink-0"
            title="Tutup"
          >
            ✕
          </button>
        </div>

        {/* 1. Direktori Utama HP */}
        <div className="nb-card p-3.5 bg-white space-y-2.5 shadow-[2.5px_2.5px_0px_#121212]">
          <div>
            <label className="font-black text-xs text-[#121212] uppercase tracking-wide flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-[#121212]" />
              <span>1. Direktori Utama Penyimpanan</span>
            </label>
            <p className="text-[11px] font-medium text-gray-600 mt-0.5 leading-relaxed">
              Pilih folder utama di memori internal HP tempat file unduhan Anda akan diletakkan.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, directory: 'Downloads' }))}
              className={`border-2 border-black rounded-xl p-2.5 flex items-center justify-between shadow-[2px_2px_0px_#121212] transition-all cursor-pointer ${
                settings.directory === 'Downloads'
                  ? 'bg-[#38E54D] text-[#121212] font-black'
                  : 'bg-white text-gray-700 font-bold hover:bg-gray-50'
              }`}
            >
              <div>
                <div className="font-black text-xs">Folder Download</div>
                <div className="text-[10px] text-gray-700 font-normal mt-0.5">/storage/emulated/0/Download</div>
              </div>
              {settings.directory === 'Downloads' && <Check className="w-4 h-4 text-[#121212] shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, directory: 'Documents' }))}
              className={`border-2 border-black rounded-xl p-2.5 flex items-center justify-between shadow-[2px_2px_0px_#121212] transition-all cursor-pointer ${
                settings.directory === 'Documents'
                  ? 'bg-[#38E54D] text-[#121212] font-black'
                  : 'bg-white text-gray-700 font-bold hover:bg-gray-50'
              }`}
            >
              <div>
                <div className="font-black text-xs">Folder Documents</div>
                <div className="text-[10px] text-gray-700 font-normal mt-0.5">/storage/emulated/0/Documents</div>
              </div>
              {settings.directory === 'Documents' && <Check className="w-4 h-4 text-[#121212] shrink-0" />}
            </button>
          </div>
        </div>

        {/* 2. Subfolder Penyimpanan */}
        <div className="nb-card p-3.5 bg-white space-y-2.5 shadow-[2.5px_2.5px_0px_#121212]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <label className="font-black text-xs text-[#121212] uppercase tracking-wide block">
                2. Subfolder / Folder Khusus
              </label>
              <p className="text-[11px] font-medium text-gray-600 mt-0.5 leading-relaxed">
                Buat sub-folder di dalam folder utama agar file rapi dan tidak bercampur dengan unduhan lain.
              </p>
            </div>
            <span className="text-[10px] font-mono-code font-black text-[#121212] bg-[#FFE600] px-2 py-0.5 border border-black rounded shrink-0 shadow-[1px_1px_0px_#121212]">
              {previewPath}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
            {[
              { id: 'Aruthtale/{platform}', label: '⚡ Otomatis Platform', desc: 'Otomatis pisah: Aruthtale/TikTok, Aruthtale/Spotify, Aruthtale/YouTube' },
              { id: 'Aruthtale', label: 'Folder Aruthtale', desc: 'Semua file di satu folder Aruthtale' },
              { id: 'Aruthtale/Media', label: 'Aruthtale/Media', desc: 'Disimpan di folder Aruthtale/Media' },
            ].map((preset) => {
              const isSelected = settings.subfolder === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, subfolder: preset.id }))}
                  className={`nb-btn py-1.5 px-2 text-[10px] text-center flex flex-col justify-center items-center ${
                    isSelected ? 'bg-[#FFE600] text-black font-black' : 'bg-white text-gray-700 font-bold hover:bg-gray-50'
                  }`}
                  title={preset.desc}
                >
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>

          <input
            type="text"
            value={settings.subfolder || ''}
            onChange={(e) => setSettings((s) => ({ ...s, subfolder: e.target.value }))}
            placeholder="Contoh: Aruthtale atau Aruthtale/{platform}"
            className="w-full bg-[#F8F5EE] border-2 border-black rounded-xl p-2.5 text-xs font-mono-code font-bold text-[#121212] focus:outline-none shadow-[1.5px_1.5px_0px_#121212]"
          />
          <p className="text-[10px] text-gray-500 font-mono-code">
            * Tips: Gunakan tanda <code className="bg-gray-200 px-1 rounded text-black font-bold">&#123;platform&#125;</code> untuk membuat folder otomatis sesuai asal media (YouTube, Spotify, TikTok, dll).
          </p>
        </div>

        {/* 3. Pola Nama File */}
        <div className="nb-card p-3.5 bg-white space-y-2.5 shadow-[2.5px_2.5px_0px_#121212]">
          <div>
            <label className="font-black text-xs text-[#121212] uppercase tracking-wide block">
              3. Format Penamaan File
            </label>
            <p className="text-[11px] font-medium text-gray-600 mt-0.5 leading-relaxed">
              Pilih format bagaimana nama file musik atau video disimpan di galeri / file manager Anda.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { 
                id: 'title_id', 
                label: 'Judul_ID', 
                desc: 'Direkomendasikan (Judul-Lagu_dQw4w9Wg.mp3). Mencegah file tertimpa jika ada judul lagu sama.' 
              },
              { 
                id: 'clean_title', 
                label: 'Judul Bersih', 
                desc: 'Nama file rapi hanya judul (Judul-Lagu.mp3). Cocok untuk pemutar musik bawaan HP.' 
              },
              { 
                id: 'id_only', 
                label: 'ID Saja', 
                desc: 'Nama file pendek berupa kode ID unik (dQw4w9Wg.mp3).' 
              },
            ].map((pat) => {
              const isSelected = (settings.filenamePattern || 'title_id') === pat.id;
              return (
                <button
                  key={pat.id}
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, filenamePattern: pat.id }))}
                  className={`nb-btn p-2 text-left flex flex-col justify-between ${
                    isSelected ? 'bg-[#FFE600] text-black font-black' : 'bg-white text-gray-700 font-bold hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[11px]">{pat.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#121212]" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-[10px] font-mono-code text-gray-600 bg-[#F8F5EE] p-2 rounded-lg border border-gray-300">
            {settings.filenamePattern === 'clean_title' && (
              <p>Contoh: <strong>Garam-Dan-Madu.mp3</strong> (Rapi, tanpa embel-embel kode unik)</p>
            )}
            {settings.filenamePattern === 'id_only' && (
              <p>Contoh: <strong>vX2aBc91.mp3</strong> (Hanya kode ID platform)</p>
            )}
            {(settings.filenamePattern === 'title_id' || !settings.filenamePattern) && (
              <p>Contoh: <strong>Garam-Dan-Madu_vX2aBc91.mp3</strong> (Aman dari bentrok nama file)</p>
            )}
          </div>
        </div>

        {/* 4. Instagram Session ID Section (Detail & Layman Friendly) */}
        <div className="nb-card p-3.5 bg-white space-y-3 shadow-[2.5px_2.5px_0px_#121212]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Key className="w-4 h-4 text-[#121212]" />
              <span className="font-mono-code font-black text-xs text-[#121212] uppercase">
                4. Instagram Session ID (Opsional)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowTutorial((v) => !v)}
              className="text-[10px] font-mono-code font-black bg-[#C4FAF8] px-2 py-0.5 border border-black rounded shadow-[1px_1px_0px_#121212] text-black cursor-pointer"
            >
              {showTutorial ? 'Tutup Panduan' : '📖 Panduan Orang Awam'}
            </button>
          </div>

          {/* Penjelasan Singkat & Keamanan */}
          <div className="text-[11px] text-gray-700 leading-relaxed bg-[#F8F5EE] p-2.5 rounded-xl border border-black space-y-1">
            <div className="flex items-center gap-1 text-[#121212] font-black text-[11px]">
              <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Apa itu Session ID dan untuk apa fungsinya?</span>
            </div>
            <p className="text-[10px] text-gray-600">
              Instagram sering membatasi unduhan untuk <strong>Story, Reel tertentu, atau akun Private / Close Friends</strong> jika tidak login. Session ID adalah kunci login sementara akun Anda yang mengizinkan Aruthtale mengunduh postingan tersebut.
            </p>
            <div className="flex items-center gap-1 text-emerald-800 font-bold text-[10px] pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>100% Aman: Kunci ini hanya disimpan di memori HP Anda sendiri dan tidak pernah dikirim ke pihak lain.</span>
            </div>
          </div>

          {/* Input Session ID */}
          <div className="relative">
            <input
              type={showSessionId ? 'text' : 'password'}
              value={settings.instagramSessionId || ''}
              onChange={(e) => setSettings((s) => ({ ...s, instagramSessionId: e.target.value }))}
              placeholder="Tempel (Paste) kode sessionid di sini..."
              className="w-full bg-[#F8F5EE] border-2 border-black rounded-xl p-2.5 text-xs font-mono-code font-bold text-[#121212] focus:outline-none pr-10 shadow-[1.5px_1.5px_0px_#121212]"
            />
            <button
              type="button"
              onClick={() => setShowSessionId((v) => !v)}
              className="absolute right-2.5 top-3 text-gray-700 hover:text-black"
              title={showSessionId ? 'Sembunyikan' : 'Tampilkan'}
            >
              {showSessionId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Step-by-Step Layman Guide Accordion */}
          {showTutorial && (
            <div className="nb-card p-3 bg-[#FFE600] space-y-2.5 text-xs border-2 border-black shadow-[2px_2px_0px_#121212]">
              <div className="flex items-center justify-between border-b-2 border-black pb-1.5">
                <span className="font-black text-[11px] uppercase tracking-wide text-black">
                  Langkah Mudah Mengambil Session ID:
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTabGuide('pc')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold border border-black ${
                      activeTabGuide === 'pc' ? 'bg-white text-black' : 'bg-transparent text-gray-700'
                    }`}
                  >
                    💻 Lewat PC / Laptop
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTabGuide('phone')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold border border-black ${
                      activeTabGuide === 'phone' ? 'bg-white text-black' : 'bg-transparent text-gray-700'
                    }`}
                  >
                    📱 Lewat HP
                  </button>
                </div>
              </div>

              {activeTabGuide === 'pc' ? (
                <div className="space-y-1.5 text-[11px] font-medium text-black bg-white p-2.5 rounded-xl border border-black">
                  <p className="font-black text-black">Cara Tercepat & Termudah (Via Laptop/PC):</p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-800 text-[10px] leading-relaxed">
                    <li>Buka browser (Google Chrome, Edge, atau Firefox) lalu buka <strong>instagram.com</strong> dan pastikan sudah login.</li>
                    <li>Klik kanan di mana saja pada layar, lalu pilih <strong>Inspeksi (Inspect)</strong> atau tekan tombol <strong>F12</strong> di keyboard.</li>
                    <li>Pilih tab <strong>Application</strong> di menu atas (atau tab <strong>Storage</strong> jika di Firefox).</li>
                    <li>Di menu sebelah kiri, klik <strong>Cookies</strong> → klik <strong>https://www.instagram.com</strong>.</li>
                    <li>Cari baris yang bernama <strong>sessionid</strong>.</li>
                    <li>Klik 2x pada kolom <strong>Value</strong>-nya, tekan <strong>Salin (Copy)</strong>, lalu tempel (Paste) ke kolom di atas.</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-1.5 text-[11px] font-medium text-black bg-white p-2.5 rounded-xl border border-black">
                  <p className="font-black text-black">Cara Mengambil Lewat Browser HP:</p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-800 text-[10px] leading-relaxed">
                    <li>Gunakan browser yang mendukung ekstensi di HP (seperti Kiwi Browser atau Yandex).</li>
                    <li>Pasang ekstensi gratis <strong>Cookie-Editor</strong> dari Chrome Web Store.</li>
                    <li>Buka <strong>instagram.com</strong> dan login ke akun Anda.</li>
                    <li>Buka ekstensi Cookie-Editor, cari item bernama <strong>sessionid</strong>, lalu salin isinya.</li>
                    <li>Kembali ke Aruthtale dan tempelkan di kotak isian di atas.</li>
                  </ol>
                </div>
              )}

              <p className="text-[10px] text-gray-900 font-bold italic">
                * Catatan: Jika Anda melakukan 'Log Out' dari Instagram di browser tersebut, session ID akan berubah dan perlu disalin ulang.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="nb-btn px-4 py-2.5 bg-white text-gray-700 text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_#121212]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="nb-btn flex-1 py-2.5 bg-[#38E54D] text-[#121212] text-xs flex items-center justify-center gap-2 shadow-[2.5px_2.5px_0px_#121212]"
          >
            <Check className="w-4 h-4" />
            <span>{savedStatus ? 'Tersimpan!' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
