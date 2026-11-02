import { isTikTokUrl, scrapeTikTok } from './tiktok.js';
import { isYouTubeUrl, scrapeYouTube } from './youtube.js';
import { isXUrl, scrapeX } from './x.js';
import { isPinterestUrl, scrapePinterest } from './pinterest.js';
import { isInstagramUrl, scrapeInstagram } from './instagram.js';
import { isSpotifyUrl, scrapeSpotify } from './spotify.js';

export function detectPlatform(url) {
  if (isTikTokUrl(url)) return 'tiktok';
  if (isYouTubeUrl(url)) return 'youtube';
  if (isInstagramUrl(url)) return 'instagram';
  if (isSpotifyUrl(url)) return 'spotify';
  if (isXUrl(url)) return 'x';
  if (isPinterestUrl(url)) return 'pinterest';
  return null;
}

export async function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    throw new Error('Tempel tautan dulu ya.');
  }

  const cleanUrl = url.trim();
  const platform = detectPlatform(cleanUrl);

  if (platform === 'tiktok') {
    return await scrapeTikTok(cleanUrl);
  }

  if (platform === 'youtube') {
    return await scrapeYouTube(cleanUrl);
  }

  if (platform === 'instagram') {
    return await scrapeInstagram(cleanUrl);
  }

  if (platform === 'spotify') {
    return await scrapeSpotify(cleanUrl);
  }

  if (platform === 'x') {
    return await scrapeX(cleanUrl);
  }

  if (platform === 'pinterest') {
    return await scrapePinterest(cleanUrl);
  }

  throw new Error(
    'Platform belum didukung. Arloader bisa mengunduh dari TikTok, YouTube, Instagram, Spotify, X, dan Pinterest.'
  );
}

export const scrapeMedia = resolveMediaUrl;
export default resolveMediaUrl;
