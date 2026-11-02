/**
 * Status pemutar untuk homescreen.
 *
 * ArMusic menyimpan potret kecil "sedang diputar" + riwayat putar terakhir ke
 * localStorage supaya HomeHub bisa menampilkannya tanpa harus membuka modul
 * ArMusic lebih dulu. Semua fungsi aman dipanggil di web (tidak ada localStorage)
 * dan tidak pernah melempar error.
 */

const NOW_KEY = 'armusic_now_playing';
const RECENT_KEY = 'armusic_recent_plays';
const MAX_RECENT = 8;
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 jam

function readJson(key, fallback) {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* kuota penuh / mode privat — abaikan */
  }
}

/** Simpan potret lagu yang sedang diputar (dipanggil berkala, bukan tiap detik). */
export function saveNowPlaying(snapshot) {
  if (!snapshot || !snapshot.title) return;
  writeJson(NOW_KEY, {
    title: String(snapshot.title),
    artist: snapshot.artist ? String(snapshot.artist) : '',
    cover: snapshot.cover ? String(snapshot.cover) : '',
    duration: Number(snapshot.duration) || 0,
    elapsed: Number(snapshot.elapsed) || 0,
    playing: !!snapshot.playing,
    updatedAt: Date.now(),
  });
}

/** Potret terakhir, atau null kalau kosong / sudah kedaluwarsa. */
export function readNowPlaying() {
  const data = readJson(NOW_KEY, null);
  if (!data || !data.title) return null;
  if (Date.now() - (Number(data.updatedAt) || 0) > MAX_AGE_MS) return null;
  return data;
}

/** Tambahkan lagu ke depan riwayat (tanpa duplikat). */
export function pushRecentPlay(track) {
  if (!track) return;
  const title = track.title || track.name || '';
  if (!title) return;

  const key = track.videoId || track.id || `${title}|${track.artist || ''}`;
  const rest = readRecentPlays(MAX_RECENT).filter((item) => item.key !== key);
  const entry = {
    key,
    id: track.id || '',
    videoId: track.videoId || '',
    title,
    artist: track.artist || track.uploader || '',
    cover: track.cover || '',
    playedAt: Date.now(),
  };

  writeJson(RECENT_KEY, [entry, ...rest].slice(0, MAX_RECENT));
}

/** Daftar lagu terakhir diputar (terbaru dulu). */
export function readRecentPlays(limit = 3) {
  const list = readJson(RECENT_KEY, []);
  if (!Array.isArray(list)) return [];
  return list.filter((item) => item && item.title).slice(0, limit);
}

export function clearNowPlaying() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(NOW_KEY);
  } catch {
    /* abaikan */
  }
}
