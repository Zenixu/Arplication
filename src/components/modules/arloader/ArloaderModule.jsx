import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertCircle, Settings, Folder, History, Trash2,
  Sparkles, Layers, Download, CheckCircle2, RotateCcw, Loader2,
  HardDrive, ShieldCheck, Activity, Home
} from 'lucide-react';
import UrlInput, { extractLinks } from './UrlInput.jsx';
import MediaCard from './MediaCard.jsx';
import DownloadHistory from './DownloadHistory.jsx';
import DownloadSettingsModal from './DownloadSettingsModal.jsx';
import { scrapeMedia } from '../../../services/scrapers/index.js';
import { loadScraperHistory, saveScraperHistory, clearScraperHistory } from '../../../utils/history.js';

// Logo platform dari simple-icons (open source), disimpan lokal di
// public/platforms/*.svg supaya tetap tampil tanpa internet.
const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', icon: 'tiktok' },
  { id: 'instagram', name: 'Instagram', icon: 'instagram' },
  { id: 'youtube', name: 'YouTube', icon: 'youtube' },
  { id: 'spotify', name: 'Spotify', icon: 'spotify' },
];
import { getDownloadSettings, formatFileSize } from '../../../utils/download.js';
import { getDownloadHistory, addDownloadRecord } from '../../../utils/history.js';
import { readClipboard } from '../../../utils/clipboard.js';
import { APP_VERSION } from '../../../services/updater.js';

export default function ArloaderModule({ setActiveTab }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaResult, setMediaResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentSettings, setCurrentSettings] = useState(getDownloadSettings());
  const [clipSuggestion, setClipSuggestion] = useState('');

  // Queue state for multi-link batch extraction
  const [queue, setQueue] = useState([]);
  const [queueActive, setQueueActive] = useState(false);
  const queueIndexRef = useRef(0);

  useEffect(() => {
    setHistory(loadScraperHistory());
    setDownloads(getDownloadHistory());

    // Check clipboard for media links
    (async () => {
      try {
        const text = await readClipboard();
        if (text && extractLinks(text).length > 0) {
          setClipSuggestion(text.trim());
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
    setCurrentSettings(getDownloadSettings());
  };

  const processQueueItem = async (link) => {
    const res = await scrapeMedia(link);
    const updatedHistory = saveScraperHistory({
      url: link,
      platform: res.platform,
      title: res.title,
      cover: res.cover,
      data: res,
    });
    setHistory(updatedHistory);
    return res;
  };

  const runQueue = async (links) => {
    setQueueActive(true);
    setLoading(true);
    const updatedQueue = [...queue];

    for (let i = 0; i < links.length; i += 1) {
      queueIndexRef.current = i;
      updatedQueue[i] = { ...updatedQueue[i], status: 'loading' };
      setQueue([...updatedQueue]);

      try {
        const res = await processQueueItem(links[i]);
        updatedQueue[i] = { ...updatedQueue[i], status: 'done', result: res };
        if (!mediaResult) {
          setMediaResult(res);
        }
      } catch (err) {
        console.error(`Queue link failed [${links[i]}]:`, err);
        updatedQueue[i] = { ...updatedQueue[i], status: 'error', error: err.message || 'Gagal mengambil' };
      }
      setQueue([...updatedQueue]);
    }

    setQueueActive(false);
    setLoading(false);
  };

  const handleFetch = async () => {
    const links = extractLinks(url);
    if (!links.length) return;
    setLoading(true);
    setError(null);

    // Multi-link: process as queue
    if (links.length > 1) {
      setMediaResult(null);
      setQueue(links.map((link) => ({ link, status: 'pending', result: null, error: null })));
      await runQueue(links);
      return;
    }

    // Single link: classic flow
    setQueue([]);
    try {
      const res = await processQueueItem(links[0]);
      setMediaResult(res);
    } catch (err) {
      console.error('Resolve failed:', err);
      setError(err.message || 'Failed to extract media from this URL.');
      setMediaResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlatform = (platform) => {
    switch (platform) {
      case 'tiktok':
        setUrl('https://www.tiktok.com/@creative_artist/video/73291823910');
        break;
      case 'instagram':
        setUrl('https://instagram.com/reel/C8xyz123');
        break;
      case 'youtube':
        setUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        break;
      case 'spotify':
        setUrl('https://open.spotify.com/album/2noRn2Aes5aoNVsU6iWThc');
        break;
      default:
        break;
    }
  };

  const sub = String(currentSettings.subfolder || '').trim().replace(/^\/+|\/+$/g, '');
  const dirLabel = currentSettings.directory === 'Documents' ? 'Documents' : 'Download';
  const folderBadgeText = sub ? `${dirLabel}/${sub}` : dirLabel;

  // Calculate total download stats for Bento summary
  const totalDownloads = downloads.length;
  const estimatedBytes = totalDownloads * 12 * 1024 * 1024; // approx 12MB average
  const formattedStorage = formatFileSize(estimatedBytes);

  return (
    <div className="space-y-4 pb-28 pt-1 text-[#121212] font-sans">
      {/* Decorative subtle accents */}
      <div className="relative">
        <div className="absolute -top-1 right-2 text-xs opacity-40 select-none pointer-events-none text-[#FF70A6]">🌸</div>
        <div className="absolute top-48 left-1 text-[10px] opacity-35 select-none pointer-events-none text-[#FF70A6]">🌸</div>
      </div>

      {/* Module Top Bar — satu tombol pengaturan saja (folder + opsi jadi satu) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 bg-[#FFE600] rounded-lg border border-black flex items-center justify-center shadow-[1px_1px_0px_#121212] overflow-hidden p-0.5 shrink-0">
            <img src="/arloader.png" alt="Arloader" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase leading-none">Arloader</p>
            <p className="text-[9px] font-mono-code font-bold text-gray-500 truncate">Unduh media</p>
          </div>
        </div>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="nb-btn px-2.5 py-1.5 bg-white text-[#121212] text-[11px] font-mono-code font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_#121212] shrink-0"
          title="Pengaturan unduhan & folder"
        >
          <Settings className="w-3.5 h-3.5 text-[#121212]" />
          <span>Pengaturan</span>
        </button>
      </div>

      {/* SECTION: Neubrutalist Bento Input Box */}
      <div className="nb-card p-4 sm:p-5 bg-white space-y-3 shadow-[4px_4px_0px_#121212]">
        <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#FFE600] rounded-lg border border-black flex items-center justify-center shadow-[1px_1px_0px_#121212] overflow-hidden p-0.5">
              <img src="/arloader.png" alt="Arloader Emblem" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-[#121212] uppercase tracking-wide">
                ARLOADER MEDIA PIPELINE
              </h2>
            </div>
          </div>
          <span className="text-[9px] font-mono-code font-bold bg-[#F8F5EE] text-gray-700 px-2 py-0.5 border border-black rounded">
            MORI SUITE • v{APP_VERSION}
          </span>
        </div>

        <UrlInput
          url={url}
          setUrl={setUrl}
          onFetch={handleFetch}
          loading={loading}
        />

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-full flex items-center justify-between gap-2 text-[10px] font-mono-code font-bold text-gray-600 bg-[#F8F5EE] border border-black rounded-lg px-2 py-1.5"
          title="Ubah folder penyimpanan"
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <Folder className="w-3 h-3 shrink-0 text-[#121212]" />
            <span className="truncate">Simpan ke: {folderBadgeText}</span>
          </span>
          <span className="underline shrink-0 text-[#121212]">ubah</span>
        </button>

        {/* Error notification */}
        {error && (
          <div className="p-2.5 rounded-xl bg-[#FF6B6B]/15 border-2 border-black shadow-[2px_2px_0px_#121212] flex items-start gap-2 text-xs font-bold text-red-900">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
            <p className="flex-1">{error}</p>
          </div>
        )}
      </div>

      {/* SECTION: PLATFORM STRIP — ringkas, satu baris logo */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-mono-code font-black text-[11px] text-[#121212] uppercase tracking-wider">
            Platform
          </h3>
          <span className="font-mono-code text-[9px] font-bold text-gray-600 bg-white px-1.5 py-0.5 border border-black rounded shadow-[1px_1px_0px_#121212]">
            AUTO DETECT
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PLATFORMS.map((plat) => (
            <button
              key={plat.id}
              onClick={() => handleSelectPlatform(plat.id)}
              title={"Tempel link " + plat.name}
              className="shrink-0 flex items-center gap-1.5 pl-1 pr-2.5 py-1 bg-white border-2 border-black rounded-full shadow-[2px_2px_0px_#121212] active:translate-y-0.5 active:shadow-[1px_1px_0px_#121212] transition-all"
            >
              <span className="w-6 h-6 rounded-full bg-[#F8F5EE] border border-black flex items-center justify-center overflow-hidden p-1 shrink-0">
                <img
                  src={"/platforms/" + plat.icon + ".svg"}
                  alt={plat.name}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </span>
              <span className="font-black text-[10px] uppercase">{plat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Queue Panel for Multi-link */}
      {queue.length > 1 && (
        <div className="nb-card p-4 bg-white space-y-3 shadow-[3px_3px_0px_#121212]">
          <div className="flex items-center justify-between border-b-2 border-black pb-2">
            <h3 className="text-xs font-mono-code font-black text-[#121212] uppercase tracking-wider">
              Antrean Multi-Link ({queue.filter((q) => q.status === 'done').length}/{queue.length})
            </h3>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {queue.map((q, idx) => (
              <button
                key={`${idx}_${q.link}`}
                disabled={q.status !== 'done'}
                onClick={() => {
                  if (q.result) {
                    setMediaResult(q.result);
                    setError(null);
                  }
                }}
                className={`w-full flex items-center gap-2.5 p-2 rounded-xl border-2 border-black text-left transition-all ${
                  q.status === 'done'
                    ? 'bg-[#38E54D]/20 shadow-[1.5px_1.5px_0px_#121212] cursor-pointer'
                    : q.status === 'error'
                      ? 'bg-[#FF6B6B]/20 cursor-default'
                      : 'bg-[#F8F5EE] cursor-default'
                }`}
              >
                <span className="w-5 h-5 rounded-md bg-white border border-black flex items-center justify-center font-mono-code text-[10px] font-black shrink-0">
                  {idx + 1}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="text-xs font-black text-[#121212] truncate block">
                    {q.result?.title || q.link}
                  </span>
                  <span className="text-[10px] font-mono-code text-gray-600 truncate block">
                    {q.status === 'error' ? q.error : q.result ? `${q.result.platform} • ${q.result.options?.length || 0} opsi` : 'Menunggu...'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Media Result Display (Single / Album / Playlist) */}
      {mediaResult && (
        <div>
          <MediaCard
            media={mediaResult}
            onDownloadComplete={(record) => setDownloads(addDownloadRecord(record))}
          />
        </div>
      )}

      {/* Clipboard suggestion banner */}
      {clipSuggestion && !mediaResult && (
        <button
          onClick={() => {
            setUrl(clipSuggestion);
            setClipSuggestion('');
          }}
          className="w-full nb-card p-3 bg-[#FFE600] flex items-center gap-2.5 text-left shadow-[2.5px_2.5px_0px_#121212] transition-all"
        >
          <Sparkles className="w-4 h-4 text-black shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="text-xs font-black text-[#121212] block">Tautan terdeteksi di clipboard</span>
            <span className="text-[10px] font-mono-code font-bold text-gray-800 truncate block">{clipSuggestion}</span>
          </span>
          <span className="nb-btn px-2.5 py-1 bg-white text-black text-[10px]">Tempel</span>
        </button>
      )}

      {/* Download History */}
      <DownloadHistory items={downloads} onChange={setDownloads} setActiveTab={setActiveTab} />

      {/* SECTION: PIPELINE STATUS SUMMARY CARD (Di paling bawah) */}
      <div className="nb-card p-3 bg-white space-y-2 shadow-[3px_3px_0px_#121212]">
        <div className="flex items-center justify-between border-b-2 border-black pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38E54D] border border-black animate-pulse" />
            <h4 className="font-mono-code font-extrabold text-xs text-[#121212] uppercase tracking-wide">
              ANTREAN UNDUHAN
            </h4>
          </div>
          <div className="flex items-center gap-1.5 font-mono-code text-[9px] font-black">
            <span className="bg-[#38E54D] text-black px-1.5 py-0.5 border border-black rounded shadow-[1px_1px_0px_#121212]">
              {totalDownloads} DONE
            </span>
            <span className="bg-[#FFE600] text-black px-1.5 py-0.5 border border-black rounded shadow-[1px_1px_0px_#121212]">
              {queue.length > 0 ? `${queue.length} QUEUED` : 'IDLE'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-[#F8F5EE] border-2 border-black rounded-xl p-2 shadow-[1.5px_1.5px_0px_#121212]">
            <div className="text-[9px] font-mono-code font-black text-gray-600 uppercase">Downloads</div>
            <div className="text-sm font-black text-[#121212] mt-0.5">{totalDownloads}</div>
          </div>
          <div className="bg-[#F8F5EE] border-2 border-black rounded-xl p-2 shadow-[1.5px_1.5px_0px_#121212]">
            <div className="text-[9px] font-mono-code font-black text-gray-600 uppercase">Est. Storage</div>
            <div className="text-sm font-black text-[#121212] mt-0.5">{formattedStorage}</div>
          </div>
          <div className="bg-[#F8F5EE] border-2 border-black rounded-xl p-2 shadow-[1.5px_1.5px_0px_#121212]">
            <div className="text-[9px] font-mono-code font-black text-gray-600 uppercase">Sandbox</div>
            <div className="text-sm font-black text-emerald-800 mt-0.5">100%</div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <DownloadSettingsModal
        isOpen={isSettingsOpen}
        onClose={handleSettingsClose}
      />
    </div>
  );
}
