import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Pembungkus plugin native ArMusicExtractor (NewPipeExtractor di dalam APK).
 *
 * Tujuannya: lagu YouTube bisa dicari dan diputar tanpa server yt-dlp —
 * tidak ada laptop yang harus menyala. Kalau plugin tidak tersedia
 * (mis. dibuka di browser), semua fungsi di sini mengembalikan null
 * dan rantai cadangan lama yang dipakai.
 */
const ArMusicExtractor = registerPlugin('ArMusicExtractor');

/** Apakah ekstraksi di perangkat tersedia? */
export function isDeviceExtractorAvailable() {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('ArMusicExtractor');
  } catch {
    return false;
  }
}

/** Ambil URL audio langsung di perangkat. */
export async function extractAudioOnDevice(videoId) {
  if (!isDeviceExtractorAvailable() || !videoId) return null;
  const res = await ArMusicExtractor.extractAudioUrl({ videoId });
  if (!res || !res.url) return null;
  return {
    url: res.url,
    mimeType: res.mimeType || 'audio/webm',
    bitrate: res.bitrate || 0,
    title: res.title || '',
    uploader: res.uploader || '',
    durationSec: res.durationSec || 0,
  };
}

/** Cari di YouTube langsung di perangkat. */
export async function searchOnDevice(query, limit = 20) {
  if (!isDeviceExtractorAvailable() || !query) return [];
  const res = await ArMusicExtractor.search({ query, limit });
  const rows = Array.isArray(res?.results) ? res.results : [];
  return rows.map((row) => ({
    videoId: row.videoId,
    title: row.title,
    artist: row.artist,
    duration: row.duration,
    cover: row.cover,
  }));
}

/** Info plugin untuk halaman pengaturan/diagnosa. */
export async function deviceExtractorStatus() {
  if (!isDeviceExtractorAvailable()) return { available: false };
  try {
    const res = await ArMusicExtractor.status();
    return { available: Boolean(res?.available), version: res?.version || '' };
  } catch {
    return { available: false };
  }
}
