import React, { useState, useMemo } from 'react';
import {
  ArrowLeft, Type, Copy, Check, Trash2, Wand2, Hash, Braces, FileText, Sparkles, Save,
} from 'lucide-react';
import {
  toUpperText, toLowerText, toTitleCase, toSentenceCase, toCamelCase, toPascalCase,
  toSnakeCase, toKebabCase, slugify, toAlternatingCase, reverseText,
  sortLines, uniqueLines, removeEmptyLines, trimLines,
  countText, base64Encode, base64Decode, hashText, formatJson, minifyJson, loremIpsum,
} from '../../../../utils/textTools';
import { addToolboxHistory } from '../../../../services/toolboxDb';
import { saveNote } from '../../../../services/notesDb';

const CASE_ACTIONS = [
  { id: 'upper', label: 'HURUF BESAR', fn: toUpperText },
  { id: 'lower', label: 'huruf kecil', fn: toLowerText },
  { id: 'title', label: 'Title Case', fn: toTitleCase },
  { id: 'sentence', label: 'Sentence case', fn: toSentenceCase },
  { id: 'camel', label: 'camelCase', fn: toCamelCase },
  { id: 'pascal', label: 'PascalCase', fn: toPascalCase },
  { id: 'snake', label: 'snake_case', fn: toSnakeCase },
  { id: 'kebab', label: 'kebab-case', fn: toKebabCase },
  { id: 'slug', label: 'slug-untuk-url', fn: slugify },
  { id: 'alt', label: 'aLtErNaTiNg', fn: toAlternatingCase },
  { id: 'reverse', label: 'esreveR', fn: reverseText },
];

const LINE_ACTIONS = [
  { id: 'sort', label: 'Urutkan A→Z', fn: (t) => sortLines(t) },
  { id: 'sortdesc', label: 'Urutkan Z→A', fn: (t) => sortLines(t, { descending: true }) },
  { id: 'unique', label: 'Hapus Duplikat', fn: uniqueLines },
  { id: 'empty', label: 'Hapus Baris Kosong', fn: removeEmptyLines },
  { id: 'trim', label: 'Rapikan Spasi', fn: trimLines },
];

export default function TextDevView({ onBack, onRefreshHistory }) {
  const [activeTab, setActiveTab] = useState('case'); // case | count | encode | json | lorem
  const [text, setText] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [hashAlgo, setHashAlgo] = useState('SHA-256');
  const [hashValue, setHashValue] = useState('');
  const [b64Input, setB64Input] = useState('');
  const [b64Mode, setB64Mode] = useState('encode'); // encode | decode
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [loremCount, setLoremCount] = useState(2);
  const [loremUnit, setLoremUnit] = useState('paragraphs');
  const [noteSaved, setNoteSaved] = useState(false);

  const stats = useMemo(() => countText(text), [text]);

  const flash = (msg) => {
    setOutput(msg);
    setTimeout(() => setOutput((o) => (o === msg ? '' : o)), 1800);
  };

  const copy = async (val) => {
    try {
      await navigator.clipboard.writeText(String(val ?? ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      flash('Gagal menyalin');
    }
  };

  const logHistory = (title, payload) => {
    addToolboxHistory({ toolType: 'text', title, dataPayload: payload });
    if (onRefreshHistory) onRefreshHistory();
  };

  const applyCase = (action) => {
    const result = action.fn(text);
    setText(result);
    logHistory(`Teks: ${action.label}`, result.slice(0, 120));
  };

  const applyLines = (action) => {
    const result = action.fn(text);
    setText(result);
    logHistory(`Baris: ${action.label}`, result.slice(0, 120));
  };

  const runHash = async () => {
    const h = await hashText(text, hashAlgo);
    setHashValue(h);
    if (h) logHistory(`Hash ${hashAlgo}`, h);
  };

  const runBase64 = () => {
    try {
      const result = b64Mode === 'encode' ? base64Encode(b64Input) : base64Decode(b64Input);
      setOutput(result);
      logHistory(`Base64 ${b64Mode}`, result.slice(0, 120));
    } catch (e) {
      setOutput(`Error: ${e.message}`);
    }
  };

  const runJson = (minify) => {
    const r = minify ? minifyJson(jsonInput) : formatJson(jsonInput);
    if (r.ok) {
      setOutput(r.result);
      setJsonError('');
      logHistory(minify ? 'JSON Minify' : 'JSON Format', r.result.slice(0, 120));
    } else {
      setJsonError(r.error);
    }
  };

  const generateLorem = () => {
    const result = loremIpsum(loremCount, loremUnit);
    setOutput(result);
    logHistory('Lorem Ipsum', `${loremCount} ${loremUnit}`);
  };

  const saveToNote = async () => {
    try {
      await saveNote({
        title: 'TextDev — Hasil Perkakas Teks',
        content: `# TextDev Result\n\n- **Waktu**: ${new Date().toLocaleString('id-ID')}\n- **Statistik**: ${stats.words} kata · ${stats.chars} karakter\n\n## Input\n\n${text || '(kosong)'}\n\n## Output\n\n${output || '(kosong)'}\n`,
        tags: ['artoolbox', 'textdev'],
        color: 'mint',
        isPinned: false,
      });
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } catch (e) {
      console.error('Gagal simpan ke ArNote:', e);
    }
  };

  const tabs = [
    { id: 'case', label: 'Ubah Huruf', icon: Type },
    { id: 'count', label: 'Hitung', icon: FileText },
    { id: 'encode', label: 'Base64 & Hash', icon: Hash },
    { id: 'json', label: 'JSON', icon: Braces },
    { id: 'lorem', label: 'Lorem', icon: Sparkles },
  ];

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
        <h2 className="text-xl font-black text-[#121212] uppercase tracking-tight">Text & Dev Tools</h2>
        <div className="w-9" />
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-[#FFE600] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] p-1 gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 min-w-max py-2 px-2.5 rounded-lg font-black text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === t.id ? 'bg-white shadow-[1px_1px_0px_#121212] text-[#121212]' : 'text-[#121212]/70 hover:bg-white/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: Case converter + line tools */}
      {activeTab === 'case' && (
        <div className="space-y-3.5">
          <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-[#121212] flex items-center gap-1.5">
                <Wand2 className="w-4 h-4" /> Ubah Gaya Huruf
              </h3>
              <button
                onClick={() => { setText(''); setOutput(''); }}
                className="px-2.5 py-1.5 bg-[#FF525E] text-white rounded-lg border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212] text-[10px] font-black flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Bersihkan
              </button>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tempel atau tulis teks di sini…"
              rows={6}
              className="w-full p-3 rounded-xl border-2 border-[#121212] bg-[#F8F5EE] font-mono text-xs text-[#121212] outline-none resize-y"
            />

            <div className="flex flex-wrap gap-2">
              {CASE_ACTIONS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => applyCase(a)}
                  className="px-2.5 py-1.5 bg-[#C4FAF8] rounded-lg border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-[10px] font-black cursor-pointer"
                >
                  {a.label}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t-2 border-[#121212]/10 space-y-2">
              <span className="text-[10px] font-black uppercase text-gray-600">Utak-atik Baris</span>
              <div className="flex flex-wrap gap-2">
                {LINE_ACTIONS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => applyLines(a)}
                    className="px-2.5 py-1.5 bg-[#D8B4FE] rounded-lg border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-[10px] font-black cursor-pointer"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live stats */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { l: 'Kata', v: stats.words },
              { l: 'Karakter', v: stats.chars },
              { l: 'Tanpa Spasi', v: stats.charsNoSpaces },
              { l: 'Baris', v: stats.lines },
              { l: 'Kalimat', v: stats.sentences },
              { l: 'Baca', v: `${stats.readingTimeMin}m` },
            ].map((s) => (
              <div key={s.l} className="p-2.5 bg-white rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-center">
                <div className="text-lg font-black text-[#121212] leading-none">{s.v}</div>
                <div className="text-[11px] font-mono font-bold text-gray-600 uppercase mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Word counter detail */}
      {activeTab === 'count' && (
        <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
          <h3 className="text-sm font-black uppercase text-[#121212]">Hitung Teks</h3>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tulis / tempel teks untuk dihitung…"
            rows={8}
            className="w-full p-3 rounded-xl border-2 border-[#121212] bg-[#F8F5EE] font-mono text-xs outline-none resize-y"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { l: 'Jumlah Kata', v: stats.words },
              { l: 'Jumlah Karakter', v: stats.chars },
              { l: 'Tanpa Spasi', v: stats.charsNoSpaces },
              { l: 'Baris', v: stats.lines },
              { l: 'Kalimat', v: stats.sentences },
              { l: 'Paragraf', v: stats.paragraphs },
              { l: 'Estimasi Baca', v: `${stats.readingTimeMin} menit` },
            ].map((s) => (
              <div key={s.l} className="p-3 bg-[#F8F5EE] rounded-xl border-2 border-[#121212]">
                <div className="text-xl font-black text-[#121212]">{s.v}</div>
                <div className="text-[10px] font-mono font-bold text-gray-600 uppercase">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Base64 & Hash */}
      {activeTab === 'encode' && (
        <div className="space-y-3.5">
          <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-[#121212]">Base64</h3>
              <div className="flex bg-[#FFE600] rounded-lg border-2 border-[#121212] p-0.5 gap-0.5">
                {['encode', 'decode'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setB64Mode(m)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase cursor-pointer ${b64Mode === m ? 'bg-white' : ''}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={b64Input}
              onChange={(e) => setB64Input(e.target.value)}
              placeholder={b64Mode === 'encode' ? 'Teks biasa → Base64' : 'Base64 → teks biasa'}
              rows={3}
              className="w-full p-3 rounded-xl border-2 border-[#121212] bg-[#F8F5EE] font-mono text-xs outline-none resize-y"
            />
            <button
              onClick={runBase64}
              className="px-3 py-2 bg-[#38E54D] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-xs font-black cursor-pointer"
            >
              Proses {b64Mode === 'encode' ? 'Encode' : 'Decode'}
            </button>
          </div>

          <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-[#121212]">Hash</h3>
              <div className="flex bg-[#FFE600] rounded-lg border-2 border-[#121212] p-0.5 gap-0.5">
                {['SHA-1', 'SHA-256', 'SHA-512'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setHashAlgo(m)}
                    className={`px-2 py-1 rounded-md text-[10px] font-black cursor-pointer ${hashAlgo === m ? 'bg-white' : ''}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-gray-600 font-bold">
              Hash dihitung dari teks pada tab &quot;Ubah Huruf&quot; / kotak di bawah.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Teks untuk di-hash…"
              rows={2}
              className="w-full p-3 rounded-xl border-2 border-[#121212] bg-[#F8F5EE] font-mono text-xs outline-none resize-y"
            />
            <button
              onClick={runHash}
              className="px-3 py-2 bg-[#C4FAF8] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-xs font-black cursor-pointer"
            >
              Hitung {hashAlgo}
            </button>
            {hashValue && (
              <div
                onClick={() => copy(hashValue)}
                className="p-3 bg-[#F8F5EE] rounded-xl border-2 border-[#121212] font-mono text-[10px] break-all cursor-pointer flex items-start gap-2"
              >
                <span className="flex-1">{hashValue}</span>
                {copied ? <Check className="w-3.5 h-3.5 shrink-0 text-green-700" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: JSON */}
      {activeTab === 'json' && (
        <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
          <h3 className="text-sm font-black uppercase text-[#121212]">JSON Formatter</h3>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='{"contoh": "tempel JSON di sini"}'
            rows={6}
            className="w-full p-3 rounded-xl border-2 border-[#121212] bg-[#F8F5EE] font-mono text-xs outline-none resize-y"
          />
          <div className="flex gap-2">
            <button
              onClick={() => runJson(false)}
              className="px-3 py-2 bg-[#38E54D] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-xs font-black cursor-pointer"
            >
              Rapikan
            </button>
            <button
              onClick={() => runJson(true)}
              className="px-3 py-2 bg-[#FF70A6] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-xs font-black cursor-pointer"
            >
              Perkecil
            </button>
          </div>
          {jsonError && (
            <div className="p-3 bg-[#FF525E] text-white rounded-xl border-2 border-[#121212] text-[11px] font-bold">
              JSON tidak valid: {jsonError}
            </div>
          )}
        </div>
      )}

      {/* Tab: Lorem */}
      {activeTab === 'lorem' && (
        <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
          <h3 className="text-sm font-black uppercase text-[#121212]">Lorem Ipsum Generator</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black">Jumlah</span>
              <input
                type="number"
                min="1"
                max="500"
                value={loremCount}
                onChange={(e) => setLoremCount(Number(e.target.value))}
                className="w-20 p-2 rounded-lg border-2 border-[#121212] bg-[#F8F5EE] font-mono text-xs outline-none"
              />
            </div>
            <div className="flex bg-[#FFE600] rounded-lg border-2 border-[#121212] p-0.5 gap-0.5">
              {[['paragraphs', 'Paragraf'], ['sentences', 'Kalimat'], ['words', 'Kata']].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setLoremUnit(id)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-black cursor-pointer ${loremUnit === id ? 'bg-white' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={generateLorem}
            className="px-3 py-2 bg-[#D8B4FE] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-xs font-black cursor-pointer"
          >
            Buat Teks
          </button>
        </div>
      )}

      {/* Output area */}
      {output && activeTab !== 'case' && (
        <div className="p-4 bg-[#FFFDE6] rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-gray-600">Hasil</span>
            <button
              onClick={() => copy(output)}
              className="px-2.5 py-1 bg-white rounded-lg border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212] text-[10px] font-black flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-green-700" /> : <Copy className="w-3 h-3" />}
              Salin
            </button>
          </div>
          <pre className="p-3 bg-white rounded-xl border-2 border-[#121212] font-mono text-[10px] whitespace-pre-wrap break-words max-h-72 overflow-y-auto">
            {output}
          </pre>
        </div>
      )}

      {/* Save to ArNote */}
      <button
        onClick={saveToNote}
        className="w-full px-3 py-2.5 bg-[#38E54D] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
      >
        {noteSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {noteSaved ? 'Tersimpan ke ArNote!' : 'Simpan Hasil ke ArNote'}
      </button>
    </div>
  );
}
