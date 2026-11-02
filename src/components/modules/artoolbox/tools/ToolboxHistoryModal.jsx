import React, { useState } from 'react';
import { X, Trash2, Copy, Check, Clock, QrCode, Type, Calculator, Palette, Sparkles } from 'lucide-react';
import { deleteToolboxHistoryItem, clearToolboxHistory } from '../../../../services/toolboxDb';

export default function ToolboxHistoryModal({ isOpen, onClose, historyItems = [], onRefreshHistory }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'qr' | 'text' | 'calc' | 'color'
  const [copiedId, setCopiedId] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  if (!isOpen) return null;

  const filteredItems = filter === 'all' 
    ? historyItems 
    : historyItems.filter(item => item.toolType === filter);

  const handleCopy = (id, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDeleteItem = (id) => {
    deleteToolboxHistoryItem(id);
    if (onRefreshHistory) onRefreshHistory();
  };

  const handleClearAll = () => {
    clearToolboxHistory();
    if (onRefreshHistory) onRefreshHistory();
    setShowClearConfirm(false);
  };

  const getToolIcon = (type) => {
    switch (type) {
      case 'qr': return <QrCode className="w-3.5 h-3.5 text-[#121212]" />;
      case 'text': return <Type className="w-3.5 h-3.5 text-[#121212]" />;
      case 'calc': return <Calculator className="w-3.5 h-3.5 text-[#121212]" />;
      case 'color': return <Palette className="w-3.5 h-3.5 text-[#121212]" />;
      default: return <Sparkles className="w-3.5 h-3.5 text-[#121212]" />;
    }
  };

  const getToolColor = (type) => {
    switch (type) {
      case 'qr': return 'bg-[#38E54D]';
      case 'text': return 'bg-[#FFE600]';
      case 'calc': return 'bg-[#FF70A6]';
      case 'color': return 'bg-[#D8B4FE]';
      default: return 'bg-white';
    }
  };

  const formatTime = (isoString) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' • ' + d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn font-sans">
      <div className="w-full max-w-lg max-h-[85vh] bg-[#F8F5EE] rounded-2xl border-[3px] border-[#121212] shadow-[6px_6px_0px_#121212] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 bg-[#FFE600] border-b-[2.5px] border-[#121212] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#121212]" />
            <h3 className="text-base sm:text-lg font-black uppercase text-[#121212]">
              Riwayat ArToolbox ({historyItems.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-white hover:bg-red-100 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
          >
            <X className="w-4 h-4 text-[#121212]" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-2.5 bg-white border-b-2 border-[#121212] flex items-center gap-1.5 overflow-x-auto text-xs font-black">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'qr', label: 'QR' },
            { id: 'text', label: 'Teks' },
            { id: 'calc', label: 'Kalkulator' },
            { id: 'color', label: 'Warna' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg border border-[#121212] transition-all whitespace-nowrap cursor-pointer ${
                filter === tab.id
                  ? 'bg-[#121212] text-white shadow-[1.5px_1.5px_0px_#FFE600]'
                  : 'bg-[#F8F5EE] text-[#121212] hover:bg-[#FFE600]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Items List */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono font-bold text-gray-500">
              Belum ada riwayat tercatat untuk kategori ini.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`p-1 rounded-md border border-[#121212] shadow-[1px_1px_0px_#121212] ${getToolColor(item.toolType)}`}>
                      {getToolIcon(item.toolType)}
                    </span>
                    <span className="text-xs font-black text-[#121212] line-clamp-1">
                      {item.title}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-gray-500 shrink-0">
                    {formatTime(item.timestamp)}
                  </span>
                </div>

                {item.dataPayload && (
                  <div className="p-2 bg-[#F8F5EE] rounded-lg border border-[#121212]/30 font-mono text-[11px] text-gray-800 break-all select-all">
                    {item.dataPayload}
                  </div>
                )}

                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    onClick={() => handleCopy(item.id, item.dataPayload || item.title)}
                    className="px-2.5 py-1 bg-[#FFE600] active:translate-x-0.5 active:translate-y-0.5 rounded-lg border border-[#121212] text-[10.5px] font-black flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === item.id ? <Check className="w-3 h-3 text-green-700" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === item.id ? 'Tersalin' : 'Salin'}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1 text-gray-500 hover:text-red-600 rounded border border-transparent hover:border-red-300 cursor-pointer"
                    title="Hapus item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-white border-t-2 border-[#121212] flex items-center justify-between">
          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={historyItems.length === 0}
              className="px-3 py-1.5 bg-[#FF70A6] hover:bg-[#FF5A8C] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-black rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Semua</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-red-600">Yakin hapus?</span>
              <button
                onClick={handleClearAll}
                className="px-2.5 py-1 bg-red-600 text-white text-xs font-black rounded-lg border border-[#121212] cursor-pointer"
              >
                Ya, Hapus
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-2.5 py-1 bg-gray-200 text-[#121212] text-xs font-bold rounded-lg border border-[#121212] cursor-pointer"
              >
                Batal
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-gray-100 text-xs font-black rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
