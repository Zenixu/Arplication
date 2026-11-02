import { httpClient, isLocalWeb, isNative } from '../http.js';
import { searchOnDevice } from '../armusicExtractor.js';
import { PIPED_API_INSTANCES, pipedGet, pipedSearchVideos, pipedGetStreams, pickPipedAudioUrl, isBotBlockError, formatResolverError } from './youtube.js';

/**
 * YouTube Music (Innertube) public search endpoints
 * No authentication required — works with public music metadata
 */
const INNERTUBE_ENDPOINTS = [
  'https://music.youtube.com/youtubei/v1/search',
  'https://www.youtube.com/youtubei/v1/search',
];

/**
 * YouTube Music (Innertube) browse endpoint for getting music-specific results
 */
const INNERTUBE_BROWSE_ENDPOINTS = [
  'https://music.youtube.com/youtubei/v1/browse',
  'https://www.youtube.com/youtubei/v1/browse',
];

const INNERTUBE_CLIENT_VERSION = '2.20240923.01.00';
const INNERTUBE_CLIENT_NAME = 'WEB_REMIX';

const BASE_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Origin': 'https://music.youtube.com',
  'Referer': 'https://music.youtube.com/',
};

/**
 * Build Innertube request body for music search
 */
function buildInnertubeSearchBody(query, limit = 20) {
  return {
    context: {
      client: {
        clientName: INNERTUBE_CLIENT_NAME,
        clientVersion: INNERTUBE_CLIENT_VERSION,
        hl: 'id',
        gl: 'ID',
        deviceMake: '',
        deviceModel: '',
        osName: 'Windows',
        osVersion: '10.0',
        platform: 'DESKTOP',
        userAgent: BASE_HEADERS['User-Agent'],
        acceptHeader: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        utcOffsetMinutes: 420,
        timezone: 'Asia/Jakarta',
      },
      capabilities: {},
      request: {
        returnLogEntry: true,
        internalExperimentFlags: [],
      },
      user: {},
    },
    query: query,
    params: 'Eg-KAQwIARAAGA==', // Music filter (equivalent to "Songs" tab)
    musicVideoType: 'MUSIC_VIDEO_TYPE_OMV',
  };
}

/**
 * Build Innertube request body for getting track details / watch playlist
 */
function buildInnertubeWatchBody(videoId) {
  return {
    context: {
      client: {
        clientName: INNERTUBE_CLIENT_NAME,
        clientVersion: INNERTUBE_CLIENT_VERSION,
        hl: 'id',
        gl: 'ID',
      },
    },
    videoId: videoId,
    playlistId: 'RDAMVM' + videoId, // Radio/mix playlist
    params: 'wAEB', // Music mode
  };
}

/**
 * Extract videoId from Innertube search result
 */
function extractVideoIdFromResult(item) {
  // Search results have various shapes: videoRenderer, musicTwoRowItemRenderer, etc.
  if (item?.videoRenderer?.videoId) return item.videoRenderer.videoId;
  if (item?.musicTwoRowItemRenderer?.navigationEndpoint?.watchEndpoint?.videoId) {
    return item.musicTwoRowItemRenderer.navigationEndpoint.watchEndpoint.videoId;
  }
  if (item?.musicResponsiveListItemRenderer?.navigationEndpoint?.watchEndpoint?.videoId) {
    return item.musicResponsiveListItemRenderer.navigationEndpoint.watchEndpoint.videoId;
  }
  if (item?.musicShelfRenderer?.contents) {
    // Sometimes nested inside shelves
    for (const content of item.musicShelfRenderer.contents) {
      const vid = extractVideoIdFromResult(content);
      if (vid) return vid;
    }
  }
  return null;
}

/**
 * Extract track metadata from Innertube search result
 */
function parseInnertubeTrack(item) {
  const videoId = extractVideoIdFromResult(item);
  if (!videoId) return null;

  // Title
  let title = 'Unknown Title';
  if (item?.videoRenderer?.title?.runs?.[0]?.text) {
    title = item.videoRenderer.title.runs[0].text;
  } else if (item?.musicTwoRowItemRenderer?.title?.runs?.[0]?.text) {
    title = item.musicTwoRowItemRenderer.title.runs[0].text;
  } else if (item?.musicResponsiveListItemRenderer?.title?.runs?.[0]?.text) {
    title = item.musicResponsiveListItemRenderer.title.runs[0].text;
  }

  // Artist
  let artist = 'Unknown Artist';
  if (item?.videoRenderer?.longBylineText?.runs) {
    artist = item.videoRenderer.longBylineText.runs.map(r => r.text).join(', ');
  } else if (item?.videoRenderer?.ownerText?.runs?.[0]?.text) {
    artist = item.videoRenderer.ownerText.runs[0].text;
  } else if (item?.musicTwoRowItemRenderer?.byline?.runs) {
    artist = item.musicTwoRowItemRenderer.byline.runs.map(r => r.text).join(', ');
  } else if (item?.musicResponsiveListItemRenderer?.byline?.runs) {
    artist = item.musicResponsiveListItemRenderer.byline.runs.map(r => r.text).join(', ');
  }

  // Duration
  let duration = null;
  if (item?.videoRenderer?.lengthText?.simpleText) {
    const parts = item.videoRenderer.lengthText.simpleText.split(':').map(Number);
    if (parts.length === 2) duration = parts[0] * 60 + parts[1];
    else if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (item?.musicTwoRowItemRenderer?.fixedColumns?.[0]?.musicItemThumbnailRenderer?.musicItemThumbnailOverlayRenderer?.content?.musicItemThumbnailOverlayTextRenderer?.text?.simpleText) {
    const durText = item.musicTwoRowItemRenderer.fixedColumns[0].musicItemThumbnailRenderer.musicItemThumbnailOverlayRenderer.content.musicItemThumbnailOverlayTextRenderer.text.simpleText;
    const parts = durText.split(':').map(Number);
    if (parts.length === 2) duration = parts[0] * 60 + parts[1];
  }

  // Thumbnail
  let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  if (item?.videoRenderer?.thumbnail?.thumbnails?.[item.videoRenderer.thumbnail.thumbnails.length - 1]?.url) {
    thumbnail = item.videoRenderer.thumbnail.thumbnails[item.videoRenderer.thumbnail.thumbnails.length - 1].url;
  } else if (item?.musicTwoRowItemRenderer?.thumbnail?.thumbnails?.[item.musicTwoRowItemRenderer.thumbnail.thumbnails.length - 1]?.url) {
    thumbnail = item.musicTwoRowItemRenderer.thumbnail.thumbnails[item.musicTwoRowItemRenderer.thumbnail.thumbnails.length - 1].url;
  }

  return {
    videoId,
    title,
    artist,
    duration,
    durationFormatted: duration ? formatDuration(duration) : null,
    cover: thumbnail,
    platform: 'youtube_music',
    source: 'innertube',
  };
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Basis URL server yt-dlp: server rumah (native) atau proxy dev (web lokal).
 */
function ytDlpSearchBases() {
  const bases = [];
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('arloader_settings') : null;
    const settings = raw ? JSON.parse(raw) : {};
    const server = String(settings.ytDlpServerUrl || '').trim().replace(/\/+$/, '');
    if (isNative() && server) bases.push(server);
  } catch {
    /* abaikan */
  }
  if (isLocalWeb()) bases.push('/api/yt-dlp');
  return bases;
}

/**
 * Pencarian cadangan lewat yt-dlp. Innertube/Piped publik sering mati,
 * sedangkan yt-dlp di server sendiri tetap jalan.
 */
async function searchViaYtDlp(query, limit) {
  const bases = ytDlpSearchBases();
  if (!bases.length) return [];

  let lastError = null;
  for (const base of bases) {
    try {
      const res = await httpClient({
        url: `${base}/search?q=${encodeURIComponent(query)}&limit=${limit}`,
        timeout: 30000,
      });
      const list = Array.isArray(res?.results) ? res.results : [];
      if (list.length) {
        return list.map((r) => ({
          videoId: r.videoId,
          title: r.title,
          artist: r.artist,
          duration: r.duration,
          durationFormatted: r.duration ? formatDuration(r.duration) : null,
          cover: r.cover,
          platform: 'youtube_music',
          source: 'ytdlp',
        }));
      }
    } catch (err) {
      lastError = err;
      console.warn('[YouTube Music] pencarian yt-dlp gagal:', base, err?.message || err);
    }
  }
  if (lastError) throw lastError;
  return [];
}

/**
 * Search YouTube Music via Innertube API
 * Returns array of tracks: [{ videoId, title, artist, duration, cover, platform }]
 */
export async function searchYouTubeMusic(query = '', limit = 20) {
  const q = String(query || '').trim();
  if (!q) return [];

  let lastError = null;

  // 0) Pencarian di perangkat (NewPipeExtractor) — tanpa server, ~1 detik.
  if (isNative()) {
    try {
      const deviceResults = await searchOnDevice(q, limit);
      if (deviceResults.length) {
        return deviceResults.map((r) => ({
          videoId: r.videoId,
          title: r.title,
          artist: r.artist,
          duration: r.duration,
          durationFormatted: r.duration ? formatDuration(r.duration) : null,
          cover: r.cover,
          platform: 'youtube_music',
          source: 'device',
        }));
      }
    } catch (deviceErr) {
      console.warn('[YouTube Music] pencarian di perangkat gagal:', deviceErr?.message || deviceErr);
    }
  }

  for (const endpoint of INNERTUBE_ENDPOINTS) {
    try {
      const body = buildInnertubeSearchBody(q, limit);
      const data = await httpClient({
        url: endpoint,
        method: 'POST',
        headers: BASE_HEADERS,
        data: body,
        timeout: 6000,
      });

      if (!data?.contents) {
        lastError = new Error('Respons Innertube kosong / tidak valid.');
        continue;
      }

      // Navigate to music results (tabRenderer -> tabRenderer -> content)
      let items = [];
      const contents = data.contents;
      if (contents?.tabbedSearchResultsRenderer?.tabs) {
        for (const tab of contents.tabbedSearchResultsRenderer.tabs) {
          if (tab?.tabRenderer?.selected || tab?.tabRenderer?.title === 'Lagu' || tab?.tabRenderer?.title === 'Songs') {
            const tabContent = tab.tabRenderer?.content;
            if (tabContent?.sectionListRenderer?.contents) {
              for (const section of tabContent.sectionListRenderer.contents) {
                if (section?.musicShelfRenderer?.contents) {
                  items.push(...section.musicShelfRenderer.contents);
                } else if (section?.itemSectionRenderer?.contents) {
                  items.push(...section.itemSectionRenderer.contents);
                }
              }
            }
            break;
          }
        }
      } else if (contents?.sectionListRenderer?.contents) {
        for (const section of contents.sectionListRenderer.contents) {
          if (section?.musicShelfRenderer?.contents) {
            items.push(...section.musicShelfRenderer.contents);
          } else if (section?.itemSectionRenderer?.contents) {
            items.push(...section.itemSectionRenderer.contents);
          }
        }
      }

      const results = [];
      for (const item of items) {
        const track = parseInnertubeTrack(item);
        if (track) results.push(track);
        if (results.length >= limit) break;
      }

      if (results.length > 0) return results;
      lastError = new Error('Tidak ada hasil dari Innertube.');

    } catch (err) {
      lastError = err;
      console.warn('[YouTube Music] Innertube endpoint failed:', endpoint, err?.message || err);
    }
  }

  // Fallback 1: Piped search
  console.warn('[YouTube Music] Innertube gagal, fallback ke Piped...');
  try {
    const pipedResults = await pipedSearchVideos(q, limit);
    if (pipedResults?.length) {
      return pipedResults.map((r) => ({
        videoId: r.videoId,
        title: r.title,
        artist: r.uploader,
        duration: r.duration,
        durationFormatted: r.duration ? formatDuration(r.duration) : null,
        cover: r.cover,
        platform: 'youtube_music',
        source: 'piped',
      }));
    }
  } catch (pipedErr) {
    console.warn('[YouTube Music] Piped gagal:', pipedErr?.message || pipedErr);
  }

  // Fallback 2: yt-dlp (server rumah / proxy dev) — jalur paling andal sekarang
  try {
    const ytDlpResults = await searchViaYtDlp(q, limit);
    if (ytDlpResults.length) return ytDlpResults;
  } catch (ytErr) {
    lastError = ytErr;
  }

  const errText = String(lastError?.message || lastError || '');
  if (/unable to resolve host|no address|eai_again|enotfound|dns/i.test(errText)) {
    throw new Error('Server YouTube Music/Piped sedang offline atau gangguan jaringan.');
  }
  throw lastError || new Error('Semua metode pencarian YouTube Music gagal. Atur URL server yt-dlp di Pengaturan untuk pencarian cadangan.');
}

/**
 * Get stream info for a YouTube Music track (reuse Piped streams)
 * Returns { title, artist, duration, thumbnailUrl, audioStreams, videoStreams }
 */
export async function getYouTubeMusicStreams(videoId) {
  const vid = String(videoId || '').trim();
  if (!/^[a-zA-Z0-9_-]{11}$/.test(vid)) {
    throw new Error('Video ID YouTube tidak valid.');
  }
  return pipedGetStreams(vid);
}

/**
 * Pick best audio URL from Innertube/Piped streams (reuse youtube.js logic)
 */
export function pickYouTubeMusicAudioUrl(streamsData) {
  return pickPipedAudioUrl(streamsData);
}

/**
 * NOTE: resolveYouTubeAudioUrl, isBotBlockError, formatResolverError
 * tersedia di './youtube.js' — import langsung dari sana untuk menghindari circular dependency
 */

export default {
  searchYouTubeMusic,
  getYouTubeMusicStreams,
  pickYouTubeMusicAudioUrl,
};