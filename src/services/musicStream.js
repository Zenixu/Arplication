import { httpClient, isLocalWeb, isNative } from './http.js';
import {
  resolveYouTubeAudioUrl as youtubeResolveAudioUrl,
} from './scrapers/youtube.js';
import { pickYouTubeMusicAudioUrl, searchYouTubeMusic } from './scrapers/youtubeMusic.js';
import { extractAudioOnDevice, isDeviceExtractorAvailable } from './armusicExtractor.js';

// Priority: 1) Innertube direct (fastest for YouTube Music), 2) Piped (already exists), 3) Convert1s, 4) yt-dlp remote, 5) yt-dlp local

/**
 * Resolve audio URL for a YouTube Music track.
 * Strategy:
 * 1. Try Innertube watch/playlist API untuk get audio stream direkt (fastest, no download)
 * 2. Fallback: Piped streams (reuse from youtube.js)
 * 3. Fallback: Convert1s (Mori engine)
 * 4. Fallback: yt-dlp remote (server konfigurasi)
 * 5. Fallback: yt-dlp lokal (Vite dev mode)
 * 6. Final fallback: full search + multi-candidate resolution (existing youtube logic)
 */

const INNERTUBE_API_URL = 'https://music.youtube.com/youtubei/v1';

const INNERTUBE_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Origin': 'https://music.youtube.com',
  'Referer': 'https://music.youtube.com/',
};

function buildInnertubeWatchBody(videoId) {
  return {
    context: {
      client: {
        clientName: 'WEB_REMIX',
        clientVersion: '2.20240923.01.00',
        hl: 'id',
        gl: 'ID',
        utcOffsetMinutes: 420,
        timezone: 'Asia/Jakarta',
      },
    },
    videoId: videoId,
    playlistId: 'RDAMVM' + videoId,
    params: 'wAEB',
  };
}

/* ---------------------------------------------------------------------------
 * Orkestrasi resolusi audio
 *
 * Pelajaran dari lapangan: lapis cadangan yang "dulu jalan" bisa mati tanpa
 * pemberitahuan (Innertube 404, Piped 500, Convert1s 451). Kalau urutannya
 * tidak diatur, tiap lapis mati tetap memakan timeout-nya sendiri sehingga
 * pengguna menunggu 60-90 detik sebelum sampai ke lapis yang hidup.
 *
 * Aturan sekarang:
 *   1. Cache URL dulu (URL audio berlaku ~6 jam; kita simpan 90 menit).
 *   2. yt-dlp lebih dulu - itu satu-satunya lapis yang benar-benar hidup.
 *   3. Lapis lain: timeout pendek + circuit breaker 24 jam kalau gagal.
 *   4. Kalau server yt-dlp belum diatur, jangan tandai gagal - beri pesan jelas.
 * ------------------------------------------------------------------------- */

const LAYER_HEALTH_KEY = 'armusic_layer_health';
const URL_CACHE_KEY = 'armusic_stream_cache';
const LAYER_TTL_MS = 24 * 60 * 60 * 1000; // lapis gagal dilewati 24 jam
const URL_TTL_MS = 90 * 60 * 1000; // cache URL audio 90 menit
const MAX_CACHE_ENTRIES = 200;

function readStore(key, fallback) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* kuota penuh / mode privat - abaikan */
  }
}

/** URL yt-dlp server yang dikonfigurasi pengguna (dipakai bersama Arloader). */
export function getYtDlpServerUrl() {
  const settings = readStore('arloader_settings', {}) || {};
  return String(settings.ytDlpServerUrl || '').trim().replace(/\/+$/, '');
}

function isLayerBlocked(name) {
  const health = readStore(LAYER_HEALTH_KEY, {}) || {};
  const entry = health[name];
  return Boolean(entry && entry.until && entry.until > Date.now());
}

function markLayerFailed(name, reason = '') {
  const health = readStore(LAYER_HEALTH_KEY, {}) || {};
  health[name] = { until: Date.now() + LAYER_TTL_MS, reason: String(reason).slice(0, 160), at: Date.now() };
  writeStore(LAYER_HEALTH_KEY, health);
  console.warn(`[ArMusic] lapis "${name}" dilewati 24 jam: ${reason}`);
}

function markLayerOk(name) {
  const health = readStore(LAYER_HEALTH_KEY, {}) || {};
  if (health[name]) {
    delete health[name];
    writeStore(LAYER_HEALTH_KEY, health);
  }
}

/** Ringkasan kesehatan lapis - dipakai UI untuk diagnosa. */
export function getLayerHealth() {
  return readStore(LAYER_HEALTH_KEY, {}) || {};
}

/** Pulihkan semua lapis ("coba lagi semua sumber"). */
export function resetLayerHealth() {
  writeStore(LAYER_HEALTH_KEY, {});
}

function cacheGet(videoId) {
  const cache = readStore(URL_CACHE_KEY, {}) || {};
  const entry = cache[videoId];
  if (!entry) return null;
  if (!entry.expiresAt || entry.expiresAt <= Date.now()) {
    delete cache[videoId];
    writeStore(URL_CACHE_KEY, cache);
    return null;
  }
  return entry.url || null;
}

function cacheSet(videoId, url) {
  const cache = readStore(URL_CACHE_KEY, {}) || {};
  cache[videoId] = { url, expiresAt: Date.now() + URL_TTL_MS };
  const keys = Object.keys(cache);
  if (keys.length > MAX_CACHE_ENTRIES) {
    keys
      .sort((a, b) => (cache[a].expiresAt || 0) - (cache[b].expiresAt || 0))
      .slice(0, keys.length - MAX_CACHE_ENTRIES)
      .forEach((k) => delete cache[k]);
  }
  writeStore(URL_CACHE_KEY, cache);
}

/** Batasi waktu satu lapis supaya lapis mati tidak menyandera pengguna. */
function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timeout ${Math.round(ms / 1000)}s`)),
      ms,
    );
    Promise.resolve(promise).then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Resolve audio URL untuk satu track YouTube Music.
 * Urutan: cache -> yt-dlp (remote/local) -> Piped -> all-in-one -> Innertube -> Convert1s.
 */
export async function resolveYouTubeMusicAudioUrl({
  videoId = null,
  url = null,
  query = '',
  onProgress = null,
  quality = '128',
} = {}) {
  const startedAt = Date.now();
  const vid = videoId || extractVideoIdFromUrl(url) || (query ? await extractVideoIdFromQuery(query) : null);
  if (!vid) throw new Error('ID Video YouTube tidak valid atau tidak bisa diekstrak.');

  const cached = cacheGet(vid);
  if (cached) {
    if (onProgress) onProgress(100, 'Memakai tautan tersimpan...');
    console.log(`[ArMusic] cache hit untuk ${vid} (${Date.now() - startedAt}ms)`);
    return cached;
  }

  const serverUrl = getYtDlpServerUrl();

  const layers = [
    {
      // Ekstraksi langsung di HP lewat NewPipeExtractor: tidak butuh server sama sekali.
      name: 'device',
      ms: 30000,
      when: () => isDeviceExtractorAvailable(),
      run: async () => {
        if (onProgress) onProgress(35, 'Mengekstrak di perangkat...');
        const result = await extractAudioOnDevice(vid);
        return result?.url || null;
      },
    },
    {
      name: 'ytdlp-remote',
      ms: 25000,
      when: () => Boolean(serverUrl) && isNative(),
      run: () => resolveYtDlpRemote(vid, quality, onProgress),
    },
    {
      name: 'ytdlp-local',
      ms: 20000,
      when: () => isLocalWeb(),
      run: () => resolveYtDlpLocal(vid, quality, onProgress),
    },
    { name: 'piped', ms: 6000, run: () => resolvePipedStream(vid, onProgress) },
    { name: 'all-in-one', ms: 20000, run: () => resolveYouTubeMusicAllInOne(vid, query, onProgress) },
    { name: 'innertube', ms: 6000, run: () => resolveInnertubeStream(vid, onProgress) },
    { name: 'convert1s', ms: 12000, run: () => resolveConvert1s(vid, quality, onProgress) },
  ];

  let lastError = null;
  for (const layer of layers) {
    if (layer.when && !layer.when()) continue;
    if (isLayerBlocked(layer.name)) continue;

    const t0 = Date.now();
    try {
      const audioUrl = await withTimeout(layer.run(), layer.ms, layer.name);
      if (audioUrl && String(audioUrl).startsWith('http')) {
        markLayerOk(layer.name);
        cacheSet(vid, audioUrl);
        console.log(`[ArMusic] ${layer.name} berhasil dalam ${Date.now() - t0}ms`);
        return audioUrl;
      }
      markLayerFailed(layer.name, 'tidak mengembalikan URL');
      lastError = new Error(`${layer.name}: tidak mengembalikan URL`);
    } catch (err) {
      const msg = err?.message || String(err);
      lastError = err instanceof Error ? err : new Error(msg);
      if (/tidak dikonfigurasi/i.test(msg)) {
        console.warn(`[ArMusic] ${layer.name} belum dikonfigurasi`);
      } else {
        markLayerFailed(layer.name, msg);
      }
    }
  }

  const deviceTried = isDeviceExtractorAvailable();
  let hint;
  if (deviceTried && serverUrl) {
    hint = 'Ekstraksi di perangkat dan server yt-dlp sama-sama gagal. Coba lagi, atau periksa koneksi internet.';
  } else if (deviceTried) {
    hint = 'Ekstraksi di perangkat gagal. Coba lagi sebentar lagi — kalau tetap gagal, video ini mungkin dibatasi YouTube.';
  } else if (serverUrl) {
    hint = 'Server yt-dlp tidak merespons. Periksa apakah server masih jalan dan bisa dijangkau dari HP.';
  } else {
    hint = 'Tidak ada sumber audio yang tersedia di perangkat ini.';
  }
  throw new Error(
    `Tidak bisa memutar lagu ini. ${hint}${lastError ? ` (${lastError.message})` : ''}`,
  );
}

async function resolveInnertubeStream(videoId, onProgress) {
  const body = buildInnertubeWatchBody(videoId);
  const data = await httpClient({
    url: INNERTUBE_API_URL,
    method: 'POST',
    headers: INNERTUBE_HEADERS,
    data: body,
    timeout: 15000,
  });

  // Berbasiskan respons Innertube: streaming URL langsung atau download URL
  if (data?.streamingData?.formats) {
    // Coba streaming URL
    for (const fmt of data.streamingData.formats) {
      if (fmt?.url?.startsWith('http')) return fmt.url;
    }
  }

  if (data?.streamingData?.adaptiveFormats) {
    // Audio-only adaptive formats
    for (const fmt of data.streamingData.adaptiveFormats) {
      if (fmt?.url?.startsWith('http') && fmt?.mimeType?.includes('audio')) {
        return fmt.url;
      }
    }
    // Fallback ke video formats yang contain audio
    for (const fmt of data.streamingData.adaptiveFormats) {
      if (fmt?.url?.startsWith('http')) return fmt.url;
    }
  }

  if (data?.download) {
    return data.download;
  }

  if (data?.audioUrl) {
    return data.audioUrl;
  }

  throw new Error('Streaming URL tidak ditemukan di respons Innertube.');
}

async function resolvePipedStream(videoId, onProgress) {
  const { pipedGetStreams } = await import('./scrapers/youtube.js');
  const streamData = await pipedGetStreams(videoId);
  // streamData = { title, artist, duration, thumbnailUrl, audioStreams: [...], videoStreams: [...] }
  const audioUrl = pickYouTubeMusicAudioUrl(streamData.audioStreams || []);
  if (audioUrl) return audioUrl;
  throw new Error('Stream audio Piped tidak tersedia.');
}

async function resolveConvert1s(videoId, quality, onProgress) {
  const headers = {
    Origin: 'https://media.ytmp3.gg',
    Referer: 'https://media.ytmp3.gg/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  // Kirim request ke Convert1s API
  const outQuality = quality ? (quality.endsWith('p') ? quality : `${quality}p`) : '128';

  const convRes = await httpClient({
    url: 'https://hub.convert1s.com/api/download',
    method: 'POST',
    headers,
    data: {
      url: `https://www.youtube.com/watch?v=${videoId}`,
      os: 'macos',
      output: {
        type: 'audio',
        format: 'mp3',
        quality: outQuality,
      },
      audio: { bitrate: quality + 'k' },
    },
    timeout: 25000,
  });

  if (!convRes?.statusUrl) throw new Error('Convert1s tidak mengembalikan status URL.');

  // Polling status
  for (let i = 0; i < 30; i += 1) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (onProgress) onProgress(20 + Math.min(70, i * 2), `Mengonversi audio (Convert1s)...`);

    try {
      const poll = await httpClient({
        url: convRes.statusUrl,
        headers,
        timeout: 15000,
      });

      if (poll?.status === 'completed' && poll?.downloadUrl) {
        return poll.downloadUrl;
      }

      if (poll?.status === 'error' || poll?.status === 'failed') {
        break;
      }
    } catch (e) {}
  }

  throw new Error('Convert1s audio conversion timeout atau gagal.');
}

async function resolveYtDlpRemote(videoId, quality, onProgress) {
  if (!isNative()) {
    throw new Error('yt-dlp remote hanya tersedia di aplikasi Android.');
  }

  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('arloader_settings') : null;
    const settings = raw ? JSON.parse(raw) : {};
    const serverUrl = String(settings.ytDlpServerUrl || '').trim();
    if (!serverUrl) throw new Error('URL yt-dlp server tidak dikonfigurasi.');

    const base = serverUrl.replace(/\/+$/, '');
    const res = await httpClient({
      url: `${base}/api/yt-dlp/audio-url?q=${encodeURIComponent(`https://music.youtube.com/watch?v=${videoId}`)}`,
      timeout: 25000,
    });

    if (res?.ok && res?.audioUrl) return res.audioUrl;
    throw new Error('Remote yt-dlp tidak mengembalikan URL audio.');
  } catch (e) {
    throw new Error(`Remote yt-dlp error: ${e.message || e}`);
  }
}

async function resolveYtDlpLocal(videoId, quality, onProgress) {
  if (!isLocalWeb()) {
    throw new Error('yt-dlp lokal hanya tersedia di Vite dev mode (web).');
  }

  try {
    const localRes = await httpClient({
      url: `/api/yt-dlp/audio-url?q=${encodeURIComponent(`https://music.youtube.com/watch?v=${videoId}`)}`,
      timeout: 20000,
    });

    if (localRes?.audioUrl) return localRes.audioUrl;
    throw new Error('Local yt-dlp tidak mengembalikan URL audio.');
  } catch (e) {
    throw new Error(`Local yt-dlp error: ${e.message || e}`);
  }
}

async function resolveYouTubeMusicAllInOne(videoId, query, onProgress) {
  // Gunakan existing resolver dari youtube.js (multi-layer resolver)
  return await youtubeResolveAudioUrl({ videoId, query, onProgress });
}

function extractVideoIdFromUrl(url = '') {
  const clean = String(url || '').trim();
  if (!clean) return null;

  const match = clean.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

async function extractVideoIdFromQuery(query = '') {
  if (!query) return null;

  // Coba gunakan YouTube web search untuk videoId
  try {
    const data = await httpClient({
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      raw: true,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
    });

    const html = typeof data === 'string' ? data : (data?.data || '');
    const videoIdMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (videoIdMatch && videoIdMatch[1]) return videoIdMatch[1];
  } catch (e) {}

  return null;
}

export { searchYouTubeMusic };

export default {
  searchYouTubeMusic,
  resolveYouTubeMusicAudioUrl,
};