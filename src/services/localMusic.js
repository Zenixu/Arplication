import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { isNative } from './http.js';

import { getDownloadHistory } from '../utils/history.js';

export const ARMUSIC_LIBRARY_KEY = 'armusic_library';
export const MAX_LIBRARY_ITEMS = 500;

export const AUDIO_EXTENSIONS = [
  'mp3', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'wav', 'flac', 'mid', 'midi', '3gp',
];

/**
 * True jika nama file berekstensi audio yang didukung <audio>.
 */
export function isAudioFilename(name = '') {
  const ext = String(name).split('.').pop().toLowerCase().split('?')[0];
  return AUDIO_EXTENSIONS.includes(ext);
}

/**
 * Tebak { artist, title } dari nama file.
 * Pola umum Arloader: "Judul_id.mp3" atau "Artis_Judul.mp3" (underscore = spasi).
 */
export function parseFileMetadata(filename = '') {
  const base = String(filename).replace(/\.[a-zA-Z0-9]+$/, '');
  const withSpaces = base.replace(/_+/g, ' ').trim();
  // Pola "Artis - Judul"
  const dashSplit = withSpaces.split(' - ');
  if (dashSplit.length >= 2) {
    return {
      artist: dashSplit[0].trim() || 'Artis Tidak Dikenal',
      title: dashSplit.slice(1).join(' - ').trim() || withSpaces,
    };
  }
  return { artist: 'Artis Tidak Dikenal', title: withSpaces || 'Tanpa Judul' };
}

/**
 * Format detik -> "m:ss" (konsisten dengan formatPipedDuration).
 */
export function formatTrackDuration(totalSeconds) {
  const s = Math.floor(Number(totalSeconds));
  if (!Number.isFinite(s) || s <= 0) return null;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Ubah file URI native menjadi src yang bisa dimainkan WebView.
 */
export function toPlayableSrc(uri = '') {
  if (!uri) return null;
  if (/^(blob:|https?:|data:)/i.test(uri)) return uri;
  if (isNative()) {
    try {
      return Capacitor.convertFileSrc(uri);
    } catch {
      return uri;
    }
  }
  return uri;
}

function readLibrary() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const saved = localStorage.getItem(ARMUSIC_LIBRARY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to read ArMusic library:', e);
  }
  return [];
}

function writeLibrary(items = []) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ARMUSIC_LIBRARY_KEY, JSON.stringify(items.slice(0, MAX_LIBRARY_ITEMS)));
    }
  } catch (e) {
    console.warn('Failed to save ArMusic library:', e);
  }
}

/**
 * Peta nama file → URL cover, diambil dari riwayat unduhan Arloader.
 * Lagu hasil unduhan tidak menyimpan cover di dalam file audio, jadi cover
 * dicocokkan lewat nama file yang sama.
 */
export function buildCoverMap() {
  const map = new Map();
  try {
    for (const rec of getDownloadHistory()) {
      if (rec && rec.filename && rec.cover) map.set(rec.filename, rec.cover);
    }
  } catch {
    /* riwayat tidak terbaca — biarkan kosong */
  }
  return map;
}

/** Lengkapi `cover` pada track yang belum punya, berdasarkan riwayat unduhan. */
export function attachCovers(tracks = []) {
  const map = buildCoverMap();
  if (!map.size) return tracks;
  return tracks.map((t) =>
    t && !t.cover && t.filename && map.has(t.filename) ? { ...t, cover: map.get(t.filename) } : t,
  );
}

export function loadLibrary() {
  // Entri hasil file-picker (blob:) mati setelah reload — tandai agar user pilih ulang.
  const items = readLibrary().map((t) => ({
    ...t,
    unavailable: t.source === 'pick' && String(t.uri || '').startsWith('blob:'),
  }));
  return attachCovers(items);
}

export function saveLibrary(tracks = []) {
  const clean = tracks.map(({ _objectUrl, unavailable, ...rest }) => rest);
  writeLibrary(clean);
  return tracks;
}

export function addOrUpdateTrackInLibrary(track) {
  if (!track || !track.id) return loadLibrary();
  const current = loadLibrary();
  const byId = new Map(current.map((t) => [t.id, t]));
  byId.set(track.id, { ...(byId.get(track.id) || {}), ...track, unavailable: false });
  const updated = attachCovers([...byId.values()].slice(0, MAX_LIBRARY_ITEMS));
  saveLibrary(updated);
  return updated;
}

export function removeTrack(tracks = [], id) {
  return tracks.filter((t) => t.id !== id);
}

/**
 * Jumlah file per batch sebelum yield ke event loop.
 * Mencegah ANR/jank UI saat folder berisi ratusan file: tiap batch beri
 * kesempatan ke render loop + izinkan onProgress update.
 */
export const SCAN_BATCH_SIZE = 25;

function yieldToEventLoop() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Scan folder hasil unduhan Aruthtale di storage HP (native only).
 * Menjelajah Download/Aruthtale/* dan folder Music, kedalaman maks 3 level.
 */
export async function scanLocalAudio({ onProgress } = {}) {
  if (!isNative()) {
    throw new Error('Scan storage hanya tersedia di aplikasi Android.');
  }
  await Filesystem.requestPermissions().catch(() => {});

  const roots = ['Download/Aruthtale', 'Music', 'Download'];
  const found = [];
  const queue = roots.map((r) => ({ path: r, depth: 0 }));
  const seen = new Set();

  while (queue.length > 0 && found.length < MAX_LIBRARY_ITEMS) {
    const { path, depth } = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    let entries = [];
    try {
      const res = await Filesystem.readdir({
        path,
        directory: Directory.ExternalStorage,
      });
      entries = res?.files || [];
    } catch {
      continue; // folder tidak ada / tidak bisa dibaca — lewati
    }
    for (const entry of entries) {
      const name = entry?.name;
      if (!name) continue;
      const fullPath = `${path}/${name}`;
      const isDir = entry.type === 'directory' || (!name.includes('.') && depth < 3);
      if (isDir && depth < 3) {
        queue.push({ path: fullPath, depth: depth + 1 });
      } else if (isAudioFilename(name)) {
        let uri = null;
        try {
          const uriRes = await Filesystem.getUri({
            path: fullPath,
            directory: Directory.ExternalStorage,
          });
          uri = uriRes?.uri || null;
        } catch {
          uri = null;
        }
        if (uri) {
          const { artist, title } = parseFileMetadata(name);
          found.push({
            id: `scan:${fullPath}`,
            title,
            artist,
            filename: name,
            folder: path,
            uri,
            source: 'scan',
          });
          // Chunked: tiap batch yield ke event loop agar UI tetap responsif.
          if (found.length % SCAN_BATCH_SIZE === 0) {
            if (onProgress) onProgress(found.length, name);
            await yieldToEventLoop();
          } else if (onProgress) {
            onProgress(found.length, name);
          }
        }
      }
    }
  }
  return found;
}

/**
 * Gabungkan hasil scan ke library: tambah yang baru, segarkan uri yang berubah.
 */
export function mergeScanResults(library = [], scanned = []) {
  const byId = new Map(library.map((t) => [t.id, t]));
  for (const track of scanned) {
    byId.set(track.id, { ...byId.get(track.id), ...track, unavailable: false });
  }
  return attachCovers([...byId.values()].slice(0, MAX_LIBRARY_ITEMS));
}
