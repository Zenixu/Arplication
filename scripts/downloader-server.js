import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const PORT = 8787;
const HOST = '127.0.0.1';
const MAX_ERROR_LENGTH = 1_500;

const MIME_TYPES = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

export function isAllowedYouTubeUrl(value) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    return (
      parsed.protocol === 'https:' &&
      (hostname === 'youtu.be' || hostname === 'youtube.com' || hostname.endsWith('.youtube.com'))
    );
  } catch {
    return false;
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function setCorsHeaders(response) {
  // The server is bound to 127.0.0.1, so it is reachable only from this
  // computer. This lets the Vite page call it even when Vite is restarted.
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
}

function runYtDlp(args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn('yt-dlp', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let errorOutput = '';

    child.stderr.on('data', (chunk) => {
      errorOutput = `${errorOutput}${chunk}`.slice(-MAX_ERROR_LENGTH);
    });
    child.once('error', rejectRun);
    child.once('close', (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(errorOutput.trim() || `yt-dlp berhenti dengan kode ${code}.`));
    });
  });
}

function runYtDlpCapture(args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let errorOutput = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (stdout.length > 8_000_000) stdout = stdout.slice(-8_000_000);
    });
    child.stderr.on('data', (chunk) => {
      errorOutput = `${errorOutput}${chunk}`.slice(-MAX_ERROR_LENGTH);
    });
    child.once('error', rejectRun);
    child.once('close', (code) => {
      if (code === 0) resolveRun(stdout);
      else rejectRun(new Error(errorOutput.trim() || `yt-dlp berhenti dengan kode ${code}.`));
    });
  });
}

/**
 * Pencarian lewat yt-dlp (ytsearchN). Dipakai sebagai cadangan karena
 * Innertube/Piped publik sering mati — lihat musicStream.js.
 */
async function search(requestUrl, response) {
  const query = (requestUrl.searchParams.get('q') || '').trim();
  const rawLimit = Number.parseInt(requestUrl.searchParams.get('limit') || '20', 10);
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 20, 1), 40);

  if (!query) {
    sendJson(response, 400, { error: 'Parameter q wajib diisi.' });
    return;
  }

  const raw = await runYtDlpCapture([
    `ytsearch${limit}:${query}`,
    '--flat-playlist',
    '--dump-single-json',
    '--skip-download',
    '--no-warnings',
  ]);

  const data = JSON.parse(raw);
  const entries = Array.isArray(data?.entries) ? data.entries : [];
  const results = entries
    .filter((entry) => entry && entry.id)
    .map((entry) => ({
      videoId: String(entry.id),
      title: entry.title || 'Tanpa Judul',
      artist: entry.uploader || entry.channel || entry.artist || 'YouTube',
      duration: Number(entry.duration) || 0,
      cover: entry.thumbnail
        || (Array.isArray(entry.thumbnails) && entry.thumbnails.length
          ? entry.thumbnails[entry.thumbnails.length - 1].url
          : `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`),
    }));

  sendJson(response, 200, { ok: true, results });
}

async function download(requestUrl, response) {
  const sourceUrl = requestUrl.searchParams.get('url') || '';
  const query = requestUrl.searchParams.get('query') || '';
  const format = requestUrl.searchParams.get('format');
  const quality = requestUrl.searchParams.get('quality') || '';

  let target = '';
  if (query.trim()) {
    target = `ytsearch1:${query.trim()}`;
  } else if (isAllowedYouTubeUrl(sourceUrl)) {
    target = sourceUrl;
  } else {
    sendJson(response, 400, { error: 'Hanya URL YouTube HTTPS atau query pencarian yang diizinkan.' });
    return;
  }

  if (!['video', 'audio'].includes(format)) {
    sendJson(response, 400, { error: 'Format unduhan harus video atau audio.' });
    return;
  }

  const jobDir = await mkdtemp(join(tmpdir(), 'arplication-yt-'));
  const outputTemplate = join(jobDir, '%(title).120B-%(id)s.%(ext)s');
  const commonArgs = ['--no-playlist', '--no-warnings', '--restrict-filenames', '-o', outputTemplate];
  
  let formatArgs = [];
  if (format === 'audio') {
    const kbps = quality.replace(/[^0-9]/g, '');
    formatArgs = ['-x', '--audio-format', 'mp3', '--audio-quality', kbps ? `${kbps}K` : '0'];
  } else {
    const height = quality.replace(/[^0-9]/g, '');
    if (height) {
      formatArgs = ['-f', `bv*[height<=${height}]+ba/b[height<=${height}]/b`, '--merge-output-format', 'mp4'];
    } else {
      formatArgs = ['-f', 'bv*+ba/b', '--merge-output-format', 'mp4'];
    }
  }

  try {
    await runYtDlp([...commonArgs, ...formatArgs, target]);
    const files = await readdir(jobDir);
    const filename = files.find((file) => !file.endsWith('.part'));
    if (!filename) throw new Error('yt-dlp tidak menghasilkan berkas unduhan.');

    const filePath = join(jobDir, filename);
    const extension = extname(filename).toLowerCase();
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${basename(filename).replace(/"/g, '')}"`,
      'Cache-Control': 'no-store',
    });
    await pipeline(createReadStream(filePath), response);
  } finally {
    await rm(jobDir, { recursive: true, force: true });
  }
}

async function inspectPlaylist(requestUrl, response) {
  const url = requestUrl.searchParams.get('url') || '';
  if (!isAllowedYouTubeUrl(url)) {
    sendJson(response, 400, { error: 'Hanya URL YouTube HTTPS yang diizinkan.' });
    return;
  }

  const child = spawn('yt-dlp', ['--flat-playlist', '--dump-single-json', '--no-warnings', url], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.once('close', (code) => {
    if (code === 0) {
      try {
        const data = JSON.parse(stdout);
        const entries = (data.entries || []).map((e, idx) => ({
          id: e.id,
          index: idx + 1,
          title: e.title || `Track ${idx + 1}`,
          duration: e.duration,
          uploader: e.uploader || e.channel || data.uploader || 'YouTube',
          url: `https://www.youtube.com/watch?v=${e.id}`,
          cover: e.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`,
        }));
        sendJson(response, 200, {
          ok: true,
          id: data.id,
          title: data.title || 'YouTube Playlist',
          author: data.uploader || data.channel || 'YouTube',
          trackCount: entries.length,
          entries,
        });
      } catch (err) {
        sendJson(response, 502, { error: 'Gagal memproses data playlist yt-dlp.' });
      }
    } else {
      sendJson(response, 502, { error: stderr.slice(-500) || `yt-dlp error ${code}` });
    }
  });
}

async function getAudioUrl(requestUrl, response) {
  const sourceUrl = requestUrl.searchParams.get('url') || '';
  const query = requestUrl.searchParams.get('q') || requestUrl.searchParams.get('query') || '';

  let target = '';
  if (query.trim()) {
    target = isAllowedYouTubeUrl(query.trim()) ? query.trim() : `ytsearch1:${query.trim()}`;
  } else if (isAllowedYouTubeUrl(sourceUrl)) {
    target = sourceUrl;
  } else {
    sendJson(response, 400, { error: 'Hanya URL YouTube HTTPS atau query pencarian yang diizinkan.' });
    return;
  }

  const child = spawn('yt-dlp', [
    '--no-playlist',
    '--no-warnings',
    '-f', 'bestaudio/best',
    '--get-url',
    '--no-check-certificate',
    target,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  child.once('close', (code) => {
    if (code === 0 && stdout.trim()) {
      const audioUrl = stdout.trim().split('\n')[0];
      sendJson(response, 200, { ok: true, audioUrl });
    } else {
      sendJson(response, 502, { error: stderr.slice(-500) || `yt-dlp error ${code}` });
    }
  });

  child.once('error', (err) => {
    sendJson(response, 502, { error: err.message || 'Gagal menjalankan yt-dlp.' });
  });
}

export function createDownloaderServer() {
  return createServer(async (request, response) => {
    setCorsHeaders(response);
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }
    const requestUrl = new URL(request.url || '/', `http://${HOST}:${PORT}`);
    const pathname = requestUrl.pathname.replace(/^\/api\/yt-dlp/, '');
    if (request.method === 'GET' && pathname === '/health') {
      sendJson(response, 200, { ok: true, service: 'arplication-yt-dlp' });
      return;
    }
    if (request.method === 'GET' && pathname === '/search') {
      try {
        await search(requestUrl, response);
      } catch (error) {
        if (!response.headersSent) {
          sendJson(response, 502, { error: error.message || 'Gagal mencari lewat yt-dlp.' });
        } else {
          response.destroy(error);
        }
      }
      return;
    }
    if (request.method === 'GET' && pathname === '/playlist-inspect') {
      try {
        await inspectPlaylist(requestUrl, response);
      } catch (error) {
        if (!response.headersSent) {
          sendJson(response, 502, { error: error.message || 'Gagal inspeksi playlist.' });
        } else {
          response.destroy(error);
        }
      }
      return;
    }
    if (request.method === 'GET' && pathname === '/audio-url') {
      try {
        await getAudioUrl(requestUrl, response);
      } catch (error) {
        if (!response.headersSent) {
          sendJson(response, 502, { error: error.message || 'Gagal resolve audio URL.' });
        } else {
          response.destroy(error);
        }
      }
      return;
    }
    if (request.method === 'GET' && pathname === '/download') {
      try {
        await download(requestUrl, response);
      } catch (error) {
        if (!response.headersSent) {
          sendJson(response, 502, { error: error.message || 'Unduhan YouTube gagal.' });
        } else {
          response.destroy(error);
        }
      }
      return;
    }
    sendJson(response, 404, { error: 'Endpoint tidak ditemukan.' });
  });
}

const isEntrypoint = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  createDownloaderServer().listen(PORT, HOST, () => {
    console.log(`Arloader yt-dlp server berjalan di http://${HOST}:${PORT}`);
  });
}
