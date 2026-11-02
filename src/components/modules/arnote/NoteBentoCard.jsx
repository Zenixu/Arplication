import React from 'react';
import { Pin, Trash2, Download, Tag, CheckSquare, Square, Edit3, FileText } from 'lucide-react';

const COLOR_MAP = {
  yellow: { bg: 'bg-[#FFE600]', border: 'border-[#121212]', shadow: 'shadow-[2.5px_2.5px_0px_#121212]' },
  mint:   { bg: 'bg-[#38E54D]', border: 'border-[#121212]', shadow: 'shadow-[2.5px_2.5px_0px_#121212]' },
  pink:   { bg: 'bg-[#FF70A6]', border: 'border-[#121212]', shadow: 'shadow-[2.5px_2.5px_0px_#121212]' },
  cyan:   { bg: 'bg-[#C4FAF8]', border: 'border-[#121212]', shadow: 'shadow-[2.5px_2.5px_0px_#121212]' },
  purple: { bg: 'bg-[#D8B4FE]', border: 'border-[#121212]', shadow: 'shadow-[2.5px_2.5px_0px_#121212]' },
  white:  { bg: 'bg-[#FFFFFF]', border: 'border-[#121212]', shadow: 'shadow-[2.5px_2.5px_0px_#121212]' }
};

export default function NoteBentoCard({ note, onEdit, onDelete, onTogglePin, onExport, onExportPdf, onToggleChecklist }) {
  const colorScheme = COLOR_MAP[note.color] || COLOR_MAP.yellow;

  // Split lines for checklist and content preview
  const lines = (note.content || '').split('\n').filter(Boolean);

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <div
      onClick={onEdit}
      className={`group relative flex flex-col justify-between h-full p-3 sm:p-4 rounded-xl border-2 border-[#121212] ${colorScheme.bg} ${colorScheme.shadow} hover:shadow-[3.5px_3.5px_0px_#121212] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#121212] transition-all cursor-pointer select-none`}
    >
      {/* Top Row: Title + Pin indicator */}
      <div>
        <div className="flex items-start justify-between gap-1.5 mb-1.5 sm:mb-2">
          <h3 className="font-black text-[#121212] text-xs sm:text-sm leading-snug line-clamp-2 break-words flex-1">
            {note.title || 'Tanpa Judul'}
          </h3>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(note.id);
            }}
            title={note.isPinned ? 'Lepas Sematan' : 'Sematkan di Atas'}
            className={`shrink-0 p-1 sm:p-1.5 rounded-md border border-[#121212] transition-transform active:scale-90 ${
              note.isPinned
                ? 'bg-[#121212] text-[#FFE600] shadow-[1px_1px_0px_#121212]'
                : 'bg-white/90 text-[#121212] hover:bg-white'
            }`}
          >
            <Pin className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${note.isPinned ? 'fill-[#FFE600]' : ''}`} />
          </button>
        </div>

        {/* Content / Checklist Preview */}
        <div className="space-y-1 text-[11px] sm:text-xs text-[#121212]/90 mb-2.5 min-h-[44px]">
          {lines.slice(0, 3).map((line, idx) => {
            const isUnchecked = line.startsWith('- [ ] ');
            const isChecked = line.startsWith('- [x] ') || line.startsWith('- [X] ');

            if (isUnchecked || isChecked) {
              const text = line.replace(/^-\s*\[[ xX]\]\s*/, '');
              return (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleChecklist) onToggleChecklist(note, idx, !isChecked);
                  }}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                >
                  {isChecked ? (
                    <CheckSquare className="w-3.5 h-3.5 shrink-0 text-[#121212] fill-[#121212]/20" />
                  ) : (
                    <Square className="w-3.5 h-3.5 shrink-0 text-[#121212]" />
                  )}
                  <span className={`truncate text-[10.5px] sm:text-xs ${isChecked ? 'line-through opacity-50' : 'font-medium'}`}>
                    {text}
                  </span>
                </div>
              );
            }

            return (
              <p key={idx} className="line-clamp-2 text-[10.5px] sm:text-[11.5px] leading-relaxed font-mono opacity-80">
                {line}
              </p>
            );
          })}

          {lines.length === 0 && (
            <p className="text-[#121212]/40 italic text-[10.5px]">Kosong...</p>
          )}
        </div>
      </div>

      {/* Footer Area: Tags & Action Buttons */}
      <div className="pt-2 border-t border-[#121212]/15 flex flex-col gap-1.5 mt-auto">
        {/* Tags */}
        {Array.isArray(note.tags) && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {note.tags.slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 bg-[#121212] text-white rounded border border-[#121212] truncate max-w-[80px]"
              >
                <Tag className="w-2 h-2 shrink-0" />
                <span className="truncate">{tag}</span>
              </span>
            ))}
            {note.tags.length > 2 && (
              <span className="text-[10px] font-bold px-1 py-0.5 bg-black/10 rounded text-[#121212]">
                +{note.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Date and Action Controls */}
        <div className="flex items-center justify-between text-[11px] sm:text-[10.5px] font-bold text-[#121212]/70">
          <span className="font-mono text-[11px] sm:text-[10px]">{formatDate(note.updatedAt)}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExportPdf(note);
              }}
              title="Ekspor ke PDF"
              className="p-1 sm:p-1.5 rounded bg-white/80 hover:bg-white text-[#121212] border border-[#121212] shadow-[1px_1px_0px_#121212] active:translate-y-0.5"
            >
              <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExport(note);
              }}
              title="Ekspor ke .md"
              className="p-1 sm:p-1.5 rounded bg-white/80 hover:bg-white text-[#121212] border border-[#121212] shadow-[1px_1px_0px_#121212] active:translate-y-0.5"
            >
              <Download className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(note.id);
              }}
              title="Hapus Catatan"
              className="p-1 sm:p-1.5 rounded bg-red-100 hover:bg-red-200 text-red-700 border border-[#121212] shadow-[1px_1px_0px_#121212] active:translate-y-0.5"
            >
              <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
