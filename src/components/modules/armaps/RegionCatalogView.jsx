import React, { useState } from 'react';
import {
  Map, MapPin, Download, RefreshCw, Trash2, HardDrive, Check,
  ChevronRight, ArrowLeft, WifiOff, Database, AlertTriangle, X, Compass,
} from 'lucide-react';
import { formatBytes, formatDataDate, MAPS_DATA_DATE } from '../../../services/armaps/catalog.js';
import { getEntry } from '../../../services/armaps/regionIndex.js';
import { storageLocationLabel } from '../../../services/armaps/settings.js';

/**
 * ArMaps — Katalog wilayah (layar pilih).
 *
 * PENTING: layar ini TIDAK menampilkan peta apa pun dan TIDAK menyiapkan
 * wilayah default. Pengguna memilih sendiri wilayah yang ingin diunduh.
 */
export default function RegionCatalogView({
  catalog, index, installedBytes, settings,
  onDownload, onOpenMap, onUpdate, onDelete, onOpenStorage,
}) {
  const [confirmDelete, setConfirmDelete] = useState(null); // region yang mau dihapus
  const [detail, setDetail] = useState(null);               // region detail sheet

  const installedCount = catalog.filter((r) => getEntry(index, r.id)).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 sm:p-5 bg-[#C4FAF8] rounded-2xl border-[2.5px] border-[#121212] shadow-[4px_4px_0px_#121212] space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212]">
            <Map className="w-3.5 h-3.5 text-[#121212]" />
            <span className="text-[10px] font-mono-code font-black uppercase tracking-wider text-[#121212]">
              ARMaps · PETA OFFLINE
            </span>
          </div>
          <button
            onClick={onOpenStorage}
            className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-[#FFE600] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Penyimpanan</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#121212] flex items-center justify-center shadow-[2px_2px_0px_#121212] shrink-0">
            <Compass className="w-6 h-6 text-[#121212]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#121212] uppercase leading-tight">
              Pilih Wilayah Peta
            </h1>
            <p className="text-xs font-bold text-gray-800 leading-relaxed mt-0.5">
              Unduh wilayah yang kamu butuhkan, lalu pakai tanpa kuota. Belum ada wilayah terpasang —
              pilih satu dari katalog di bawah.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-mono-code font-bold">
          <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-[#121212] shadow-[1px_1px_0px_#121212]">
            <WifiOff className="w-3.5 h-3.5 text-[#38E54D]" />
            <span>Tanpa Kuota</span>
          </div>
          <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-[#121212] shadow-[1px_1px_0px_#121212]">
            <Database className="w-3.5 h-3.5 text-[#121212]" />
            <span>Data OSM: {formatDataDate(MAPS_DATA_DATE)}</span>
          </div>
          <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-[#121212] shadow-[1px_1px_0px_#121212]">
            <HardDrive className="w-3.5 h-3.5 text-[#121212]" />
            <span>{installedCount} terpasang · {formatBytes(installedBytes)}</span>
          </div>
        </div>
      </div>

      {/* Status kosong — pengguna belum memilih apa pun */}
      {installedCount === 0 && (
        <div className="p-4 bg-[#FFFBDF] rounded-2xl border-[2.5px] border-[#121212] shadow-[4px_4px_0px_#121212] flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border-2 border-[#121212] flex items-center justify-center shadow-[2px_2px_0px_#121212] shrink-0">
            <AlertTriangle className="w-4.5 h-4.5 text-[#121212]" />
          </div>
          <div className="text-xs">
            <p className="font-black text-[#121212] uppercase tracking-tight">Belum ada peta terpasang</p>
            <p className="font-semibold text-gray-700 leading-snug mt-0.5">
              Peta disimpan di perangkat, bukan di dalam aplikasi. Ketuk <b>Unduh</b> pada wilayah
              pilihanmu — ukurannya tercantum di tiap kartu.
            </p>
          </div>
        </div>
      )}

      {/* Daftar wilayah */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#121212]">
            Katalog Wilayah
          </h2>
          <span className="text-[11px] font-mono-code font-black bg-white px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#121212]">
            {catalog.length} WILAYAH
          </span>
        </div>

        {catalog.map((region) => {
          const entry = getEntry(index, region.id);
          const isInstalled = Boolean(entry);
          const sizeLabel = formatBytes(region.sizeBytes);
          return (
            <div
              key={region.id}
              className="p-3.5 rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] bg-white space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#C4FAF8] border-2 border-[#121212] flex items-center justify-center shadow-[1.5px_1.5px_0px_#121212] shrink-0">
                    <MapPin className="w-4 h-4 text-[#121212]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-sm text-[#121212] uppercase tracking-tight leading-tight truncate">
                      {region.name}
                    </h3>
                    <p className="text-[11px] font-medium text-gray-600 leading-snug line-clamp-2">
                      {region.description}
                    </p>
                  </div>
                </div>
                {isInstalled && (
                  <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#38E54D] border border-[#121212] shadow-[1px_1px_0px_#121212] text-[11px] font-mono-code font-black uppercase">
                    <Check className="w-3 h-3" /> Terpasang
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-[10px] font-mono-code font-bold text-gray-600">
                <span>≈ {sizeLabel}</span>
                <span>·</span>
                <span>zoom s/d {region.maxzoom}</span>
                {entry?.installedAt && (
                  <>
                    <span>·</span>
                    <span>dipasang {formatDataDate(entry.installedAt.slice(0, 10))}</span>
                  </>
                )}
              </div>

              {/* Aksi */}
              <div className="flex items-center gap-2">
                {!isInstalled && (
                  <button
                    onClick={() => onDownload(region.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#38E54D] hover:bg-[#2fce41] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black uppercase"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh {sizeLabel}
                  </button>
                )}

                {isInstalled && (
                  <>
                    <button
                      onClick={() => onOpenMap(region.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FFE600] hover:bg-[#f2da00] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black uppercase"
                    >
                      <Map className="w-3.5 h-3.5" />
                      Buka
                    </button>
                    <button
                      onClick={() => onUpdate(region.id)}
                      title="Perbarui peta"
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white hover:bg-[#C4FAF8] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(region)}
                      title="Hapus peta"
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white hover:bg-[#FF70A6] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                <button
                  onClick={() => setDetail(region)}
                  className="flex items-center justify-center px-2.5 py-2 bg-white hover:bg-[#F5EEFE] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black"
                  title="Detail wilayah"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Atribusi wajib (ODbL) */}
      <p className="text-center text-[10px] font-mono-code font-bold text-gray-500 pb-2">
        Peta berbasis data © OpenStreetMap contributors (ODbL)
      </p>

      {/* Sheet detail wilayah */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="w-full max-w-md bg-[#F8F5EE] rounded-t-3xl sm:rounded-3xl border-[2.5px] border-[#121212] shadow-[4px_4px_0px_#121212] p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base uppercase tracking-tight">{detail.name}</h3>
              <button onClick={() => setDetail(null)} className="p-1 rounded-lg border-2 border-[#121212] bg-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-semibold text-gray-700">{detail.description}</p>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-code font-bold">
              <div className="p-2 rounded-lg bg-white border border-[#121212]">
                <div className="text-gray-500 text-[11px] uppercase">Ukuran</div>
                ≈ {formatBytes(detail.sizeBytes)}
              </div>
              <div className="p-2 rounded-lg bg-white border border-[#121212]">
                <div className="text-gray-500 text-[11px] uppercase">Zoom maks</div>
                {detail.maxzoom}
              </div>
              <div className="p-2 rounded-lg bg-white border border-[#121212] col-span-2">
                <div className="text-gray-500 text-[11px] uppercase">Batas (bbox)</div>
                {detail.bbox.join(', ')}
              </div>
              <div className="p-2 rounded-lg bg-white border border-[#121212] col-span-2">
                <div className="text-gray-500 text-[11px] uppercase">Data OSM</div>
                {formatDataDate(MAPS_DATA_DATE)}
              </div>
            </div>
            <p className="text-[10px] font-semibold text-gray-600 leading-snug">
              Lokasi simpan: <b>{storageLocationLabel(settings.storageLocation)}</b>. Ubah di tombol
              Penyimpanan pada header.
            </p>
          </div>
        </div>
      )}

      {/* Konfirmasi hapus */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm bg-[#F8F5EE] rounded-3xl border-[2.5px] border-[#121212] shadow-[4px_4px_0px_#121212] p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#FF70A6] border-2 border-[#121212] flex items-center justify-center shadow-[1.5px_1.5px_0px_#121212]">
                <Trash2 className="w-4 h-4" />
              </div>
              <h3 className="font-black text-sm uppercase tracking-tight">Hapus {confirmDelete.name}?</h3>
            </div>
            <p className="text-xs font-semibold text-gray-700 leading-snug">
              File peta ({formatBytes(confirmDelete.sizeBytes)}) akan dihapus dari perangkat untuk
              menghemat ruang. Kamu bisa mengunduhnya lagi kapan saja.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-3 py-2 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black uppercase"
              >
                Batal
              </button>
              <button
                onClick={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }}
                className="flex-1 px-3 py-2 bg-[#FF70A6] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black uppercase"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
