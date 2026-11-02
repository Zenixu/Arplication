import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Upload, Download, Sparkles, Sliders, Image as ImageIcon, 
  Check, RefreshCw, Layers, Zap, Eye, Trash2, Maximize2 
} from 'lucide-react';
import { addToolboxHistory } from '../../../../services/toolboxDb';
import { saveToolboxBlobFile } from '../../../../utils/download';

export default function ImageStudioView({ onBack, onRefreshHistory }) {
  const [activeTab, setActiveTab] = useState('compress'); // 'compress' | 'hd'
  const [sourceImage, setSourceImage] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);
  const [originalDimensions, setOriginalDimensions] = useState({ w: 0, h: 0 });

  // Compression & Format State
  const [quality, setQuality] = useState(80);
  const [outputFormat, setOutputFormat] = useState('image/jpeg'); // 'image/jpeg' | 'image/png' | 'image/webp'
  const [scalePercent, setScalePercent] = useState(100);
  const [compressedResult, setCompressedResult] = useState(null);
  const [compressedSize, setCompressedSize] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // HD Enhancer State
  const [hdIntensity, setHdIntensity] = useState(50); // 0 - 100
  const [contrastBoost, setContrastBoost] = useState(15); // 0 - 50
  const [saturationBoost, setSaturationBoost] = useState(15); // 0 - 50
  const [showHdOriginal, setShowHdOriginal] = useState(false);
  const [hdResult, setHdResult] = useState(null);

  const canvasRef = useRef(null);

  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    setOriginalFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      setSourceImage(dataUrl);

      const img = new Image();
      img.onload = () => {
        setOriginalDimensions({ w: img.width, h: img.height });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // ------------------------------------------------------------- 1. Kompresi & Resize
  const processCompression = () => {
    if (!sourceImage) return;
    setIsProcessing(true);

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current || document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const targetW = Math.max(1, Math.round((img.width * scalePercent) / 100));
      const targetH = Math.max(1, Math.round((img.height * scalePercent) / 100));

      canvas.width = targetW;
      canvas.height = targetH;
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const q = outputFormat === 'image/png' ? 1.0 : quality / 100;
      const resultDataUrl = canvas.toDataURL(outputFormat, q);

      setCompressedResult(resultDataUrl);

      // Hitung perkiraan ukuran data URL
      const head = `data:${outputFormat};base64,`;
      const base64Str = resultDataUrl.replace(head, '');
      const approxBytes = Math.round((base64Str.length * 3) / 4);
      setCompressedSize(approxBytes);
      setIsProcessing(false);

      addToolboxHistory({
        toolType: 'image',
        title: `Kompres: ${originalFile?.name || 'Foto'} (${formatBytes(approxBytes)})`,
        dataPayload: `Format: ${outputFormat.split('/')[1].toUpperCase()} | Kualitas: ${quality}% | Dimensi: ${targetW}x${targetH}`,
      });
      if (onRefreshHistory) onRefreshHistory();
    };
    img.src = sourceImage;
  };

  useEffect(() => {
    if (sourceImage && activeTab === 'compress') {
      queueMicrotask(() => processCompression());
    }
  }, [sourceImage, quality, outputFormat, scalePercent, activeTab]);

  // ------------------------------------------------------------- 2. HD Photo Enhancer (Sharpen & Clarity)
  const processHdEnhance = () => {
    if (!sourceImage) return;
    setIsProcessing(true);

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current || document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imgData.data;
      const w = img.width;
      const h = img.height;

      // 1. Color and Contrast Adjustment
      const contrastFactor = (259 * (contrastBoost + 255)) / (255 * (259 - contrastBoost));
      const satFactor = 1 + saturationBoost / 100;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Contrast
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;

        // Saturation
        const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
        r = gray + (r - gray) * satFactor;
        g = gray + (g - gray) * satFactor;
        b = gray + (b - gray) * satFactor;

        data[i] = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, b));
      }

      // 2. Convolution Sharpening Matrix based on hdIntensity
      if (hdIntensity > 0) {
        const amount = (hdIntensity / 100) * 1.5; // weight
        const copy = new Uint8ClampedArray(data);

        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            for (let c = 0; c < 3; c++) {
              const val = copy[idx + c];
              const up = copy[((y - 1) * w + x) * 4 + c];
              const down = copy[((y + 1) * w + x) * 4 + c];
              const left = copy[(y * w + (x - 1)) * 4 + c];
              const right = copy[(y * w + (x + 1)) * 4 + c];

              // Unsharp Laplace edge mask
              const laplace = val * 5 - up - down - left - right;
              const sharpened = val + (laplace - val) * amount;

              data[idx + c] = Math.min(255, Math.max(0, sharpened));
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const resultDataUrl = canvas.toDataURL('image/png');
      setHdResult(resultDataUrl);
      setIsProcessing(false);
    };
    img.src = sourceImage;
  };

  useEffect(() => {
    if (sourceImage && activeTab === 'hd') {
      queueMicrotask(() => processHdEnhance());
    }
  }, [sourceImage, hdIntensity, contrastBoost, saturationBoost, activeTab]);

  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Download Handler
  const downloadResult = async (dataUrl, defaultName = 'image-processed') => {
    if (!dataUrl || downloading) return;
    try {
      setDownloading(true);
      const ext = outputFormat === 'image/webp' ? 'webp' : outputFormat === 'image/png' ? 'png' : 'jpg';
      const filename = `${defaultName}-${Date.now()}.${activeTab === 'hd' ? 'png' : ext}`;
      const mime = activeTab === 'hd' ? 'image/png' : outputFormat;
      await saveToolboxBlobFile({
        data: dataUrl,
        filename,
        subfolder: 'Aruthtale/Images',
        mimeType: mime,
      });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('Gagal mengunduh gambar:', err);
    } finally {
      setDownloading(false);
    }
  };

  const savingsPercent = originalFile && compressedSize > 0
    ? Math.max(0, Math.round(((originalFile.size - compressedSize) / originalFile.size) * 100))
    : 0;

  return (
    <div className="space-y-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#C4FAF8] rounded-2xl border-2 border-[#121212] shadow-[4px_4px_0px_#121212]">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white border-2 border-[#121212] shadow-[2px_2px_0px_#121212] hover:shadow-[1px_1px_0px_#121212] hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-[#121212]" />
        </button>
        <h2 className="text-xl font-black text-[#121212] uppercase tracking-tight">Image Studio & HD</h2>
        <div className="w-9" />
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-[#FFE600] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] p-1 gap-1">
        <button
          onClick={() => setActiveTab('compress')}
          className={`flex-1 py-2 px-2 rounded-lg font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'compress' ? 'bg-white shadow-[1px_1px_0px_#121212] text-[#121212]' : 'text-[#121212]/70 hover:bg-white/50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Kompres & Format</span>
        </button>
        <button
          onClick={() => setActiveTab('hd')}
          className={`flex-1 py-2 px-2 rounded-lg font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'hd' ? 'bg-white shadow-[1px_1px_0px_#121212] text-[#121212]' : 'text-[#121212]/70 hover:bg-white/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>HD Photo Enhancer</span>
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Upload Banner if no image selected */}
      {!sourceImage ? (
        <div className="p-8 bg-white rounded-2xl border-2 border-[#121212] shadow-[4px_4px_0px_#121212] text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#FFE600] border-2 border-[#121212] shadow-[2px_2px_0px_#121212] mx-auto flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-[#121212]" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#121212] uppercase">Pilih atau Unggah Foto</h3>
            <p className="text-xs font-semibold text-gray-600 mt-1 max-w-sm mx-auto">
              Proses kompresi, konversi JPG/PNG/WEBP, dan penajaman HD 100% diproses di browser tanpa internet.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#38E54D] hover:bg-[#30CC43] active:translate-x-0.5 active:translate-y-0.5 rounded-xl border-2 border-[#121212] shadow-[2.5px_2.5px_0px_#121212] text-xs font-black cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Pilih Foto dari Galeri</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          {/* File Info Bar */}
          <div className="p-3 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#121212] line-clamp-1 max-w-[200px]">
                {originalFile?.name}
              </span>
              <span className="text-[10px] font-mono font-bold bg-[#F8F5EE] px-2 py-0.5 rounded border border-[#121212]">
                {originalDimensions.w}x{originalDimensions.h}px • {formatBytes(originalFile?.size)}
              </span>
            </div>
            <label className="px-2.5 py-1 bg-[#FFE600] active:translate-x-0.5 active:translate-y-0.5 rounded-lg border border-[#121212] text-xs font-black flex items-center gap-1 cursor-pointer">
              <RefreshCw className="w-3 h-3" />
              <span>Ganti</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* TAB 1: COMPRESSION & FORMAT */}
          {activeTab === 'compress' && (
            <div className="space-y-3.5">
              {/* Controls */}
              <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Format */}
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-700 mb-1">Format Output</label>
                    <select
                      value={outputFormat}
                      onChange={(e) => setOutputFormat(e.target.value)}
                      className="w-full p-2 rounded-xl border-2 border-[#121212] font-mono font-black text-xs bg-[#F8F5EE] cursor-pointer"
                    >
                      <option value="image/jpeg">JPG (Foto Biasa)</option>
                      <option value="image/webp">WEBP (Ukuran Paling Kecil)</option>
                      <option value="image/png">PNG (Lossless Transparan)</option>
                    </select>
                  </div>

                  {/* Quality Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-black uppercase text-gray-700">Kualitas</label>
                      <span className="text-xs font-mono font-black text-[#121212]">{quality}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={quality}
                      disabled={outputFormat === 'image/png'}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="w-full accent-[#121212] disabled:opacity-40"
                    />
                  </div>

                  {/* Scale / Resize */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-black uppercase text-gray-700">Skala Dimensi</label>
                      <span className="text-xs font-mono font-black text-[#121212]">{scalePercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      step="5"
                      value={scalePercent}
                      onChange={(e) => setScalePercent(Number(e.target.value))}
                      className="w-full accent-[#121212]"
                    />
                  </div>
                </div>
              </div>

              {/* Preview & Result */}
              <div className="p-4 bg-[#E8FCE8] rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-black uppercase text-[#121212]">Hasil Kompresi</span>
                  {savingsPercent > 0 && (
                    <span className="text-[10px] font-black uppercase bg-[#38E54D] px-2 py-0.5 border border-[#121212] rounded-md">
                      Hemat {savingsPercent}% Ukuran File
                    </span>
                  )}
                </div>

                <div className="relative w-full max-h-56 rounded-xl border-2 border-[#121212] overflow-hidden bg-black/5 flex items-center justify-center">
                  <img
                    src={compressedResult || sourceImage}
                    alt="Hasil Kompres"
                    className="max-h-56 object-contain"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold">
                  <div className="p-2.5 bg-white rounded-xl border border-[#121212]">
                    <div className="text-gray-500 text-[11px]">UKURAN ASLI</div>
                    <div className="text-sm font-black">{formatBytes(originalFile?.size)}</div>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-[#121212]">
                    <div className="text-gray-500 text-[11px]">UKURAN BARU</div>
                    <div className="text-sm font-black text-green-700">{formatBytes(compressedSize)}</div>
                  </div>
                </div>

                <button
                  onClick={() => downloadResult(compressedResult, 'compressed-image')}
                  className="w-full py-2.5 bg-[#38E54D] hover:bg-[#30CC43] active:translate-x-0.5 active:translate-y-0.5 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Foto Hasil Kompres ({formatBytes(compressedSize)})</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: HD PHOTO ENHANCER */}
          {activeTab === 'hd' && (
            <div className="space-y-3.5">
              {/* Controls */}
              <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-black uppercase text-gray-700">Tingkat Ketajaman (HD)</label>
                      <span className="text-xs font-mono font-black text-[#121212]">{hdIntensity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={hdIntensity}
                      onChange={(e) => setHdIntensity(Number(e.target.value))}
                      className="w-full accent-[#121212]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-black uppercase text-gray-700">Kontras & Detail</label>
                      <span className="text-xs font-mono font-black text-[#121212]">+{contrastBoost}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={contrastBoost}
                      onChange={(e) => setContrastBoost(Number(e.target.value))}
                      className="w-full accent-[#121212]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-black uppercase text-gray-700">Kejelasan Warna (Vibrance)</label>
                      <span className="text-xs font-mono font-black text-[#121212]">+{saturationBoost}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={saturationBoost}
                      onChange={(e) => setSaturationBoost(Number(e.target.value))}
                      className="w-full accent-[#121212]"
                    />
                  </div>
                </div>
              </div>

              {/* HD Preview Area with Toggle Original Button */}
              <div className="p-4 bg-[#FFFDE6] rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-black uppercase text-[#121212]">Pratinjau Hasil HD</span>
                  <button
                    onMouseDown={() => setShowHdOriginal(true)}
                    onMouseUp={() => setShowHdOriginal(false)}
                    onTouchStart={() => setShowHdOriginal(true)}
                    onTouchEnd={() => setShowHdOriginal(false)}
                    className="px-2.5 py-1 bg-white hover:bg-yellow-200 rounded-lg border border-[#121212] text-[10.5px] font-black flex items-center gap-1 cursor-pointer select-none"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Tahan untuk Bandingkan Asli</span>
                  </button>
                </div>

                <div className="relative w-full max-h-56 rounded-xl border-2 border-[#121212] overflow-hidden bg-black/5 flex items-center justify-center">
                  <img
                    src={showHdOriginal ? sourceImage : (hdResult || sourceImage)}
                    alt="HD Result"
                    className="max-h-56 object-contain"
                  />
                  {showHdOriginal && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white rounded text-[10px] font-mono font-black">
                      FOTO ASLI
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    downloadResult(hdResult, 'hd-enhanced-image');
                    addToolboxHistory({
                      toolType: 'image',
                      title: `HD Enhance: ${originalFile?.name || 'Foto'}`,
                      dataPayload: `Ketajaman: ${hdIntensity}% | Kontras: +${contrastBoost}% | Saturasi: +${saturationBoost}%`,
                    });
                    if (onRefreshHistory) onRefreshHistory();
                  }}
                  className="w-full py-2.5 bg-[#FFE600] hover:bg-[#FFD700] active:translate-x-0.5 active:translate-y-0.5 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Unduh Foto HD Tajam (PNG Jernih)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
