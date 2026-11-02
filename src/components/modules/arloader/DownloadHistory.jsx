import React, { useState } from 'react';
import { History, Trash2, Eye, Music, Video, Image as ImageIcon } from 'lucide-react';
import PreviewModal from './PreviewModal.jsx';
import { removeDownloadRecord, clearDownloadHistory } from '../../../utils/history.js';

function kindIcon(type, ext) {
  const e = String(ext || '').toLowerCase();
  if (type === 'audio' || ['mp3', 'm4a', 'ogg', 'wav', 'opus', 'flac'].includes(e)) {
    return <Music className="w-4 h-4 text-[#121212]" />;
  }
  if (type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(e)) {
    return <ImageIcon className="w-4 h-4 text-[#FF70A6]" />;
  }
  return <Video className="w-4 h-4 text-[#121212]" />;
}

export default function DownloadHistory({ items, onChange, setActiveTab }) {
  const [preview, setPreview] = useState(null);

  if (!items || items.length === 0) return null;

  const handleRemove = (key) => {
    onChange(removeDownloadRecord(key));
  };

  const handleClear = () => {
    onChange(clearDownloadHistory());
  };

  return (
    <div className="nb-card p-4 bg-white space-y-3 font-sans shadow-[3px_3px_0px_#121212]">
      <div className="flex items-center justify-between border-b-2 border-black pb-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#121212]" />
          <h3 className="font-mono-code font-black text-xs text-[#121212] uppercase tracking-wider">
            RIWAYAT UNDUHAN ({items.length})
          </h3>
        </div>
        <button
          onClick={handleClear}
          className="nb-btn px-2 py-1 bg-white hover:bg-red-50 text-red-600 text-[10px] flex items-center gap-1 shadow-[1.5px_1.5px_0px_#121212]"
        >
          <Trash2 className="w-3 h-3" />
          <span>Hapus Semua</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
        {items.map((item) => (
          <div
            key={item.key}
            className="nb-card p-2.5 bg-[#F8F5EE] hover:bg-white flex items-center gap-2.5 transition-all shadow-[1.5px_1.5px_0px_#121212]"
          >
            <div className="w-8 h-8 rounded-lg bg-[#FFE600] border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#121212]">
              {kindIcon(item.type, item.ext)}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-mono-code font-black uppercase text-emerald-800 bg-[#38E54D]/30 px-1 rounded border border-black inline-block">
                {item.platform}
              </span>
              <p className="text-xs font-black text-[#121212] truncate mt-0.5">{item.filename || item.title}</p>
              <span className="text-[11px] font-mono-code font-bold text-gray-500">
                {new Date(item.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {(item.type === 'audio' || ['mp3', 'm4a', 'wav'].some(e => String(item.filename || item.title).toLowerCase().includes(e))) && setActiveTab && (
                <button
                  onClick={() => setActiveTab('armusic')}
                  className="px-2 h-7 rounded-lg bg-[#D8B4FE] hover:bg-purple-300 border border-black flex items-center gap-1 text-[10px] font-black text-[#121212] transition-colors shadow-[1px_1px_0px_#121212]"
                  title="Buka di ArMusic"
                >
                  <Music className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ArMusic</span>
                </button>
              )}
              <button
                onClick={() => setPreview(item)}
                className="w-7 h-7 rounded-lg bg-[#C4FAF8] hover:bg-cyan-200 border border-black flex items-center justify-center text-[#121212] transition-colors shadow-[1px_1px_0px_#121212]"
                title="Lihat / Putar"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleRemove(item.key)}
                className="w-7 h-7 rounded-lg bg-white hover:bg-red-100 border border-black flex items-center justify-center text-red-600 transition-colors shadow-[1px_1px_0px_#121212]"
                title="Hapus dari riwayat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <PreviewModal preview={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
