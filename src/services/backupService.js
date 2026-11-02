/**
 * Backup & Restore Arplication (100% offline, tanpa backend).
 *
 * Menghasilkan satu file JSON berisi seluruh data pengguna (localStorage +
 * IndexedDB) sehingga bisa dipulihkan di perangkat baru setelah reinstall.
 *
 * Desain: fungsi MURNI (build/validate/summarize/apply) dipisah dari
 * orkestrasi async (collect/restore) yang menyentuh localStorage & IndexedDB,
 * agar logika inti mudah diuji di Node tanpa DOM.
 */

import { APP_VERSION } from './updater.js';

export const BACKUP_APP = 'Arplication';
export const BACKUP_SCHEMA = 1;

/** Kunci localStorage yang IKUT dicadangkan (whitelist). */
export const BACKUP_LOCAL_KEYS = [
  // Arloader
  'arloader_settings',
  'arloader_folder_preset',
  'arloader_downloads',
  'arloader_history',
  // ArMusic
  'armusic_library',
  'armusic_playlists',
  'armusic_recent_plays',
  'armusic_lyrics_cache',
  'yt_music_recent_searches',
  // Ardoro
  'ardoro_settings_v1',
  'ardoro_stats_v1',
  'ardoro_timer_state_v1',
  // ArToolbox
  'artoolbox_history_v1',
  // ArMaps (hanya preferensi — indeks wilayah TIDAK ikut karena file
  // .pmtiles-nya besar & disimpan di storage terpisah, bukan di backup)
  'armaps_settings_v1',
  // ArGame
  'argame_high_scores',
  'argame_settings',
  'argame_sudoku_state',
  // Global settings
  'ar_setting_autoscan',
  'ar_setting_haptic',
  'ar_setting_notifsound',
];

/** Kunci sensitif (token login) — hanya ikut bila diminta eksplisit. */
export const BACKUP_SENSITIVE_KEYS = ['ytmusic_auth'];

/** Definisi store IndexedDB yang dicadangkan. */
export const BACKUP_IDB_STORES = [
  { db: 'arnote_db', store: 'notes', version: 1, keyPath: 'id' },
  { db: 'artoolbox_pdf_maker_db', store: 'draft_pages', version: 1, keyPath: 'id' },
];

/** Daftar kunci efektif berdasarkan opsi sensitif. */
export function resolveLocalKeys({ includeSensitive = false } = {}) {
  return includeSensitive
    ? [...BACKUP_LOCAL_KEYS, ...BACKUP_SENSITIVE_KEYS]
    : [...BACKUP_LOCAL_KEYS];
}

/**
 * Ambil nilai-nilai kunci dari objek storage mirip-localStorage.
 * @returns {Object<string,string>} peta kunci → nilai mentah (string)
 */
export function extractLocalData(storage, keys) {
  const out = {};
  if (!storage || typeof storage.getItem !== 'function') return out;
  for (const key of keys || []) {
    try {
      const val = storage.getItem(key);
      if (val !== null && val !== undefined) out[key] = val;
    } catch {
      /* lewati kunci bermasalah */
    }
  }
  return out;
}

/**
 * Tulis balik peta kunci → nilai ke storage mirip-localStorage.
 * @returns {number} jumlah kunci yang ditulis
 */
export function applyLocalData(storage, data) {
  if (!storage || typeof storage.setItem !== 'function' || !data) return 0;
  let n = 0;
  for (const [key, val] of Object.entries(data)) {
    try {
      storage.setItem(key, val);
      n += 1;
    } catch {
      /* lewati kunci bermasalah */
    }
  }
  return n;
}

/**
 * Bangun objek backup (murni).
 * @param {Object} opts
 * @param {Object} [opts.localData]  peta kunci → string
 * @param {Object} [opts.idbData]    peta "db/store" → array item
 * @param {string} [opts.version]
 * @param {string} [opts.now]        ISO timestamp (untuk determinisme tes)
 */
export function buildBackup({
  localData = {},
  idbData = {},
  version = APP_VERSION,
  now = new Date().toISOString(),
} = {}) {
  return {
    meta: {
      app: BACKUP_APP,
      schema: BACKUP_SCHEMA,
      version: String(version),
      exportedAt: now,
    },
    localStorage: { ...localData },
    indexedDB: { ...idbData },
  };
}

/**
 * Validasi objek backup. Melempar Error bila tidak valid.
 * @returns {{ meta: Object, localCount: number, idbStoreCount: number, idbItemCount: number }}
 */
export function validateBackup(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('File cadangan tidak valid (bukan objek JSON).');
  }
  const meta = obj.meta;
  if (!meta || typeof meta !== 'object') {
    throw new Error('File cadangan tidak memiliki metadata.');
  }
  if (meta.app !== BACKUP_APP) {
    throw new Error(`File cadangan bukan milik ${BACKUP_APP} (app: ${meta.app ?? 'tidak dikenal'}).`);
  }
  const schema = Number(meta.schema);
  if (!Number.isFinite(schema) || schema < 1) {
    throw new Error('Versi skema cadangan tidak valid.');
  }
  if (schema > BACKUP_SCHEMA) {
    throw new Error(
      `File cadangan dibuat oleh versi lebih baru (skema ${schema}). Perbarui aplikasi lalu coba lagi.`,
    );
  }
  const localData = obj.localStorage && typeof obj.localStorage === 'object' ? obj.localStorage : {};
  const idbData = obj.indexedDB && typeof obj.indexedDB === 'object' ? obj.indexedDB : {};

  let idbItemCount = 0;
  for (const val of Object.values(idbData)) {
    if (Array.isArray(val)) idbItemCount += val.length;
  }

  return {
    meta,
    localCount: Object.keys(localData).length,
    idbStoreCount: Object.keys(idbData).length,
    idbItemCount,
  };
}

/**
 * Ringkasan isi backup untuk ditampilkan di UI (murni).
 */
export function summarizeBackup(obj) {
  const info = validateBackup(obj);
  const notes = Array.isArray(obj.indexedDB?.['arnote_db/notes'])
    ? obj.indexedDB['arnote_db/notes'].length
    : 0;
  const drafts = Array.isArray(obj.indexedDB?.['artoolbox_pdf_maker_db/draft_pages'])
    ? obj.indexedDB['artoolbox_pdf_maker_db/draft_pages'].length
    : 0;
  let bytes = 0;
  try {
    bytes = new TextEncoder().encode(JSON.stringify(obj)).length;
  } catch {
    bytes = JSON.stringify(obj).length;
  }
  return {
    ...info,
    notes,
    drafts,
    keys: info.localCount,
    bytes,
    exportedAt: info.meta.exportedAt || '',
    version: info.meta.version || '',
  };
}

/** Format byte ke string ringkas (KB/MB). */
export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/** Serialize backup ke teks JSON rapi (indent 2). */
export function serializeBackup(obj) {
  return JSON.stringify(obj, null, 2);
}

/** Parse teks → objek backup tervalidasi. Melempar Error bila gagal. */
export function parseBackupText(text) {
  let obj;
  try {
    obj = JSON.parse(String(text));
  } catch {
    throw new Error('File bukan JSON yang valid.');
  }
  validateBackup(obj);
  return obj;
}

// ─────────────────────────── IndexedDB (opsional) ───────────────────────────

function openDb(name, version, store, keyPath) {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const req = indexedDB.open(name, version);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readStore({ db, store, version, keyPath }) {
  const conn = await openDb(db, version, store, keyPath);
  if (!conn) return [];
  return new Promise((resolve) => {
    try {
      const tx = conn.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

async function writeStore({ db, store, version, keyPath }, items) {
  const conn = await openDb(db, version, store, keyPath);
  if (!conn || !Array.isArray(items)) return 0;
  return new Promise((resolve) => {
    try {
      const tx = conn.transaction(store, 'readwrite');
      const os = tx.objectStore(store);
      os.clear();
      let n = 0;
      for (const item of items) {
        if (item && typeof item === 'object') {
          os.put(item);
          n += 1;
        }
      }
      tx.oncomplete = () => resolve(n);
      tx.onerror = () => resolve(n);
    } catch {
      resolve(0);
    }
  });
}

// ─────────────────────────── Orkestrasi (async) ─────────────────────────────

/**
 * Kumpulkan seluruh data menjadi objek backup.
 */
export async function collectBackup({ includeSensitive = false } = {}) {
  const localData =
    typeof localStorage !== 'undefined'
      ? extractLocalData(localStorage, resolveLocalKeys({ includeSensitive }))
      : {};
  const idbData = {};
  for (const def of BACKUP_IDB_STORES) {
    idbData[`${def.db}/${def.store}`] = await readStore(def);
  }
  return buildBackup({ localData, idbData });
}

/**
 * Pulihkan data dari objek backup. Validasi dulu, baru tulis.
 * @returns {{ localWritten: number, idbWritten: number }}
 */
export async function restoreBackup(obj, { includeSensitive = false } = {}) {
  validateBackup(obj);

  const allowed = new Set(resolveLocalKeys({ includeSensitive }));
  const filtered = {};
  for (const [key, val] of Object.entries(obj.localStorage || {})) {
    if (allowed.has(key)) filtered[key] = val;
  }
  const localWritten =
    typeof localStorage !== 'undefined' ? applyLocalData(localStorage, filtered) : 0;

  let idbWritten = 0;
  for (const def of BACKUP_IDB_STORES) {
    const items = obj.indexedDB?.[`${def.db}/${def.store}`];
    if (Array.isArray(items)) {
      idbWritten += await writeStore(def, items);
    }
  }

  return { localWritten, idbWritten };
}

/** Nama file backup bertimestamp. */
export function backupFilename(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
  return `arplication-backup-${stamp}.json`;
}

/**
 * Unduh backup sebagai file .json (web & native via saveTextFile).
 * @returns {Promise<{ success: boolean, filename: string, summary: Object }>}
 */
export async function downloadBackup({ includeSensitive = false } = {}) {
  const backup = await collectBackup({ includeSensitive });
  const summary = summarizeBackup(backup);
  const text = serializeBackup(backup);
  const filename = backupFilename();

  // Gunakan saveTextFile yang sudah menangani web + native (Capacitor Filesystem).
  const { saveTextFile } = await import('../utils/download.js');
  await saveTextFile({ text, filename, subfolder: 'Aruthtale/Backup' });

  return { success: true, filename, summary };
}
