import React, { useState, useRef } from 'react';
import { ArrowLeft, Palette, Image as ImageIcon, Copy, Check, Pipette, Sparkles, Upload, Eye } from 'lucide-react';
import { addToolboxHistory } from '../../../../services/toolboxDb';
import { saveNote } from '../../../../services/notesDb';

export default function ColorStudioView({ onBack, onRefreshHistory }) {
  const [activeTab, setActiveTab] = useState('picker'); // 'picker' | 'extractor' | 'shades'
  const [currentColor, setCurrentColor] = useState('#38E54D');
  const [copiedFormat, setCopiedFormat] = useState(null);
  const [extractedPalette, setExtractedPalette] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [noteSaved, setNoteSaved] = useState(false);

  const saveColorPaletteToNote = async (title, paletteColors = [], extraInfo = '') => {
    try {
      const colorsList = paletteColors.length > 0 
        ? paletteColors.map(c => `- \`${c}\``).join('\n')
        : `- **HEX**: \`${currentColor.toUpperCase()}\`\n- **RGB**: \`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})\`\n- **HSL**: \`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)\`\n- **HSV**: \`hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)\`\n- **Kontras Teks Hitam**: \`${contrastBlack}:1\`\n- **Kontras Teks Putih**: \`${contrastWhite}:1\``;

      await saveNote({
        title: `Color Studio: ${title}`,
        content: `# ${title}\n\n- **Waktu**: ${new Date().toLocaleString('id-ID')}\n${extraInfo ? `- ${extraInfo}\n` : ''}\n### Daftar Warna / Nilai:\n${colorsList}\n`,
        tags: ['artoolbox', 'color', 'palette'],
        color: 'cyan',
        isPinned: false,
      });
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } catch (err) {
      console.error('Gagal menyimpan warna ke ArNote:', err);
    }
  };

  const canvasRef = useRef(null);

  // Helper conversions
  const hexToRgb = (hex) => {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    const num = parseInt(clean, 16);
    if (isNaN(num)) return { r: 0, g: 0, b: 0 };
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };

  const rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  };

  const rgbToHsv = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (max !== min) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      v: Math.round(v * 100),
    };
  };

  const rgb = hexToRgb(currentColor);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

  // Luminance & WCAG Contrast
  const getLuminance = (r, g, b) => {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  const bgLum = getLuminance(rgb.r, rgb.g, rgb.b);
  const contrastWhite = (1.05 / (bgLum + 0.05)).toFixed(2);
  const contrastBlack = ((bgLum + 0.05) / 0.05).toFixed(2);

  const copyColor = (text, format) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 1800);

    addToolboxHistory({
      toolType: 'color',
      title: `Warna: ${currentColor.toUpperCase()}`,
      dataPayload: `${format}: ${text}`,
    });
    if (onRefreshHistory) onRefreshHistory();
  };

  // Generate Shades and Tints
  const generateShadesAndTints = (hex) => {
    const baseRgb = hexToRgb(hex);
    const steps = [0.1, 0.25, 0.4, 0.6, 0.75, 0.9];
    
    // Tints (mix with white)
    const tints = steps.map(factor => {
      const r = Math.round(baseRgb.r + (255 - baseRgb.r) * factor);
      const g = Math.round(baseRgb.g + (255 - baseRgb.g) * factor);
      const b = Math.round(baseRgb.b + (255 - baseRgb.b) * factor);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    });

    // Shades (mix with black)
    const shades = steps.map(factor => {
      const r = Math.round(baseRgb.r * (1 - factor));
      const g = Math.round(baseRgb.g * (1 - factor));
      const b = Math.round(baseRgb.b * (1 - factor));
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    });

    return { tints: tints.reverse(), shades };
  };

  const { tints, shades } = generateShadesAndTints(currentColor);

  // Extract Palette from uploaded image using HTML Canvas
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    setIsExtracting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setPreviewImage(event.target?.result);
        const canvas = canvasRef.current || document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // Resize down to 80x80 for fast client-side pixel extraction
        canvas.width = 80;
        canvas.height = 80;
        ctx.drawImage(img, 0, 0, 80, 80);

        const imgData = ctx.getImageData(0, 0, 80, 80).data;
        const colorCounts = {};

        // Sample pixels with quantisation (rounding to nearest 24)
        for (let i = 0; i < imgData.length; i += 16) {
          const r = Math.round(imgData[i] / 24) * 24;
          const g = Math.round(imgData[i + 1] / 24) * 24;
          const b = Math.round(imgData[i + 2] / 24) * 24;
          const a = imgData[i + 3];

          if (a >= 128) {
            const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
            colorCounts[hex] = (colorCounts[hex] || 0) + 1;
          }
        }

        const sorted = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([hex]) => hex);

        setExtractedPalette(sorted);
        setIsExtracting(false);

        addToolboxHistory({
          toolType: 'color',
          title: `Ekstraksi Palet: ${file.name}`,
          dataPayload: sorted.join(', '),
        });
        if (onRefreshHistory) onRefreshHistory();
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#D8B4FE] rounded-2xl border-2 border-[#121212] shadow-[4px_4px_0px_#121212]">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white border-2 border-[#121212] shadow-[2px_2px_0px_#121212] hover:shadow-[1px_1px_0px_#121212] hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-[#121212]" />
        </button>
        <h2 className="text-xl font-black text-[#121212] uppercase tracking-tight">Color Studio</h2>
        <div className="w-9" />
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-[#FFE600] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] p-1 gap-1">
        <button
          onClick={() => setActiveTab('picker')}
          className={`flex-1 py-2 px-2 rounded-lg font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'picker' ? 'bg-white shadow-[1px_1px_0px_#121212] text-[#121212]' : 'text-[#121212]/70 hover:bg-white/50'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Picker & Info</span>
        </button>
        <button
          onClick={() => setActiveTab('extractor')}
          className={`flex-1 py-2 px-2 rounded-lg font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'extractor' ? 'bg-white shadow-[1px_1px_0px_#121212] text-[#121212]' : 'text-[#121212]/70 hover:bg-white/50'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Palet Gambar</span>
        </button>
        <button
          onClick={() => setActiveTab('shades')}
          className={`flex-1 py-2 px-2 rounded-lg font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'shades' ? 'bg-white shadow-[1px_1px_0px_#121212] text-[#121212]' : 'text-[#121212]/70 hover:bg-white/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Shades & Tints</span>
        </button>
      </div>

      {/* Tab: Picker & Info */}
      {activeTab === 'picker' && (
        <div className="space-y-3.5">
          {/* Main Color Swatch & Native Picker */}
          <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
            <div
              className="w-full h-24 sm:h-28 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] flex items-center justify-center transition-colors relative overflow-hidden"
              style={{ backgroundColor: currentColor }}
            >
              <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl text-white font-mono font-black text-sm tracking-wider flex items-center gap-2">
                <span>{currentColor.toUpperCase()}</span>
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => setCurrentColor(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
                placeholder="#HEX..."
                className="flex-1 p-2.5 rounded-xl border-2 border-[#121212] font-mono font-black text-sm uppercase bg-[#F8F5EE]"
              />
              <label className="px-3 py-2.5 bg-[#FFE600] active:translate-x-0.5 active:translate-y-0.5 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black flex items-center gap-1.5 cursor-pointer">
                <Pipette className="w-4 h-4" />
                <span>Pilih</span>
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => setCurrentColor(e.target.value)}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Formats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { label: 'HEX', val: currentColor.toUpperCase() },
              { label: 'RGB', val: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
              { label: 'HSL', val: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
              { label: 'HSV', val: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)` },
            ].map((f) => (
              <div
                key={f.label}
                onClick={() => copyColor(f.val, f.label)}
                className="p-3 bg-white hover:bg-[#FFFDE6] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-between"
              >
                <div>
                  <div className="text-[10px] font-mono font-bold text-gray-500 uppercase">{f.label}</div>
                  <div className="text-xs font-mono font-black text-[#121212] truncate">{f.val}</div>
                </div>
                <div className="p-1 rounded bg-[#F8F5EE] border border-[#121212]">
                  {copiedFormat === f.label ? <Check className="w-3.5 h-3.5 text-green-700" /> : <Copy className="w-3.5 h-3.5 text-gray-700" />}
                </div>
              </div>
            ))}
          </div>

          {/* WCAG Contrast Ratio */}
          <div className="p-4 bg-[#C4FAF8] rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-2">
            <h4 className="text-xs font-black uppercase text-[#121212]">Rasio Kontras Keterbacaan (WCAG)</h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold">
              <div
                className="p-3 rounded-xl border border-[#121212] flex flex-col justify-between"
                style={{ backgroundColor: currentColor, color: '#000000' }}
              >
                <div>Teks Hitam</div>
                <div className="text-lg font-black">{contrastBlack}:1</div>
                <div className="text-[11px] font-bold">{Number(contrastBlack) >= 4.5 ? '✅ Lolos AA/AAA' : '⚠️ Kontras Rendah'}</div>
              </div>

              <div
                className="p-3 rounded-xl border border-[#121212] flex flex-col justify-between"
                style={{ backgroundColor: currentColor, color: '#FFFFFF' }}
              >
                <div>Teks Putih</div>
                <div className="text-lg font-black">{contrastWhite}:1</div>
                <div className="text-[11px] font-bold">{Number(contrastWhite) >= 4.5 ? '✅ Lolos AA/AAA' : '⚠️ Kontras Rendah'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Extractor */}
      {activeTab === 'extractor' && (
        <div className="space-y-3.5">
          <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-[#121212]">Ekstrak Warna dari Foto</h3>
              <label className="px-3 py-1.5 bg-[#38E54D] hover:bg-[#30CC43] active:translate-x-0.5 active:translate-y-0.5 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {previewImage && (
              <div className="relative w-full h-36 rounded-xl border-2 border-[#121212] overflow-hidden bg-black/5">
                <img src={previewImage} alt="Pratinjau" className="w-full h-full object-cover" />
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            {isExtracting && (
              <div className="p-4 text-center text-xs font-mono font-bold animate-pulse text-gray-600">
                Memproses piksel gambar...
              </div>
            )}

            {extractedPalette.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-mono font-black uppercase text-gray-700">Palet Warna Terdeteksi:</div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {extractedPalette.map((color, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setCurrentColor(color);
                        copyColor(color, `Palet #${idx + 1}`);
                      }}
                      className="group cursor-pointer flex flex-col items-center gap-1"
                    >
                      <div
                        className="w-full h-12 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] group-hover:scale-105 group-active:translate-y-0.5 transition-all"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[10px] font-mono font-bold text-gray-700">{color}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Shades & Tints */}
      {activeTab === 'shades' && (
        <div className="space-y-3.5">
          <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-4">
            <div>
              <div className="text-xs font-mono font-black uppercase text-gray-700 mb-2">Tints (Variasi Terang)</div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {tints.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setCurrentColor(c);
                      copyColor(c, `Tint ${i + 1}`);
                    }}
                    className="cursor-pointer group flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full h-12 rounded-xl border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212] group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                    <span className="text-[11px] font-mono font-bold text-gray-700">{c}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[#121212]/15">
              <div className="text-xs font-mono font-black uppercase text-gray-700 mb-2">Shades (Variasi Gelap)</div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {shades.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setCurrentColor(c);
                      copyColor(c, `Shade ${i + 1}`);
                    }}
                    className="cursor-pointer group flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full h-12 rounded-xl border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212] group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                    <span className="text-[11px] font-mono font-bold text-gray-700">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
