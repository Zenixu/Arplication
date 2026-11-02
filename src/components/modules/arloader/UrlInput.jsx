import React from 'react';
import { Clipboard, ArrowRight, X, Loader2, ListVideo, Link2 } from 'lucide-react';
import { readClipboard } from '../../../utils/clipboard.js';

export function extractLinks(text = '') {
  const matches = String(text).match(/https?:\/\/[^\s,;|]+/gi) || [];
  const cleaned = matches.map((m) => m.replace(/[)\].,;!]+$/g, ''));
  return Array.from(new Set(cleaned.filter(Boolean)));
}

export default function UrlInput({ url, setUrl, onFetch, loading }) {
  const links = extractLinks(url);
  const isMulti = links.length > 1;

  const handlePaste = async () => {
    const text = await readClipboard();
    if (text) {
      setUrl(text);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey)) && !loading && url.trim()) {
      onFetch();
    }
  };

  return (
    <div className="space-y-2.5 font-sans">
      {/* Neubrutalist Input Container */}
      <div className="bg-white border-2 border-[#121212] rounded-2xl p-2.5 px-3 shadow-[2.5px_2.5px_0px_#121212] flex items-start sm:items-center gap-2 transition-all">
        <div className="pt-1 sm:pt-0">
          <Link2 className="w-4 h-4 text-[#121212] shrink-0" />
        </div>

        <textarea
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tempel tautan di sini…"
          rows={isMulti ? 3 : 1}
          className="w-full text-[12.5px] font-bold text-[#121212] placeholder-gray-400 bg-transparent focus:outline-none resize-none min-h-[34px] max-h-[120px] py-1.5 leading-snug"
        />

        <div className="flex items-center gap-1 shrink-0 pt-0.5 sm:pt-0">
          {url && (
            <button
              type="button"
              onClick={() => setUrl('')}
              className="w-7 h-7 bg-white hover:bg-gray-100 border border-black rounded-lg flex items-center justify-center text-gray-700 transition-all shadow-[1px_1px_0px_#121212]"
              title="Hapus tautan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handlePaste}
            className="w-7 h-7 bg-[#FFE600] hover:bg-yellow-300 border border-black rounded-lg flex items-center justify-center text-[#121212] transition-all shadow-[1px_1px_0px_#121212]"
            title="Paste dari clipboard"
          >
            <Clipboard className="w-3.5 h-3.5 text-[#121212]" />
          </button>
        </div>
      </div>

      {/* Multi-link Indicator Chip */}
      {isMulti && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FFE600] border-2 border-black shadow-[1.5px_1.5px_0px_#121212] text-[#121212] text-[11px] font-mono-code font-bold">
          <ListVideo className="w-3.5 h-3.5" />
          <span>{links.length} tautan terdeteksi — diproses berurutan dalam antrean</span>
        </div>
      )}

      {/* Big Neubrutalist Action Button */}
      <button
        onClick={onFetch}
        disabled={loading || !url.trim()}
        className={`w-full font-mono-code font-black text-[12.5px] py-3.5 rounded-xl border-2 border-black transition-all flex items-center justify-center gap-2 uppercase tracking-wider ${
          loading || !url.trim()
            ? 'bg-gray-200 text-gray-500 border-gray-400 cursor-not-allowed shadow-none'
            : 'bg-[#121212] hover:bg-black text-white shadow-[3px_3px_0px_#FFE600] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-[#FFE600]" />
            <span>MENGANALISIS MEDIA...</span>
          </>
        ) : (
          <>
            <ArrowRight className="w-4 h-4 text-[#38E54D]" />
            <span>{isMulti ? `PROSES ${links.length} MEDIA` : 'ANALYZE & DOWNLOAD'}</span>
          </>
        )}
      </button>
    </div>
  );
}
