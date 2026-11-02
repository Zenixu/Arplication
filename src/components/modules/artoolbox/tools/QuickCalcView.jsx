import React, { useState, useMemo } from 'react';
import {
  ArrowLeft, Calculator, Percent, Ruler, Calendar, Users, Check, Save,
} from 'lucide-react';
import {
  discount, markup, vat, splitBill, percentOf, percentChange,
  aspectRatio, ageFromDate, daysBetween, convertUnit, UNIT_CATEGORIES,
  formatRupiah,
} from '../../../../utils/calcTools';
import { addToolboxHistory } from '../../../../services/toolboxDb';
import { saveNote } from '../../../../services/notesDb';

const num = (v) => Number(v) || 0;

// Field & Result di-hoist ke scope modul. Kalau didefinisikan DI DALAM komponen,
// setiap render membuat tipe komponen baru → React meng-unmount & me-remount
// <input>, sehingga fokus hilang di tiap ketikan (bug react/static-components).
const CalcCopyContext = React.createContext(() => {});

function Field({ label, value, onChange, type = 'number', suffix }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-black uppercase text-gray-600">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-2.5 rounded-xl border-2 border-[#121212] bg-[#F8F5EE] font-mono text-sm font-bold outline-none"
        />
        {suffix && <span className="text-xs font-black text-gray-600">{suffix}</span>}
      </div>
    </label>
  );
}

function Result({ label, value, highlight }) {
  const onCopy = React.useContext(CalcCopyContext);
  return (
    <button
      type="button"
      onClick={() => onCopy(label, value)}
      className={`text-left w-full p-3 rounded-xl border-2 border-[#121212] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all ${
        highlight ? 'bg-[#FFE600]' : 'bg-white'
      }`}
    >
      <div className="text-[11px] font-mono font-bold text-gray-600 uppercase">{label}</div>
      <div className="text-base font-black text-[#121212] break-all">{value}</div>
    </button>
  );
}

export default function QuickCalcView({ onBack, onRefreshHistory }) {
  const [activeTab, setActiveTab] = useState('harga'); // harga | persen | unit | tanggal | tagihan
  const [copied, setCopied] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  // Harga / diskon / PPN
  const [price, setPrice] = useState(100000);
  const [discPct, setDiscPct] = useState(20);
  const [vatPct, setVatPct] = useState(11);
  const [vatMode, setVatMode] = useState('exclusive');
  const [markupPct, setMarkupPct] = useState(25);

  // Persen
  const [pctOfPct, setPctOfPct] = useState(15);
  const [pctOfVal, setPctOfVal] = useState(200000);
  const [chgFrom, setChgFrom] = useState(100);
  const [chgTo, setChgTo] = useState(150);
  const [ratioW, setRatioW] = useState(1920);
  const [ratioH, setRatioH] = useState(1080);

  // Unit
  const [unitCat, setUnitCat] = useState('panjang');
  const [unitFrom, setUnitFrom] = useState('m');
  const [unitTo, setUnitTo] = useState('cm');
  const [unitVal, setUnitVal] = useState(1);

  // Tanggal
  const [birth, setBirth] = useState('2000-01-01');
  const [dateA, setDateA] = useState('2024-01-01');
  const [dateB, setDateB] = useState('2024-12-31');

  // Tagihan
  const [bill, setBill] = useState(250000);
  const [people, setPeople] = useState(4);
  const [tipPct, setTipPct] = useState(5);

  const disc = useMemo(() => discount(price, discPct), [price, discPct]);
  const tax = useMemo(() => vat(price, vatPct, vatMode), [price, vatPct, vatMode]);
  const up = useMemo(() => markup(price, markupPct), [price, markupPct]);
  const billSplit = useMemo(() => splitBill(bill, people, tipPct), [bill, people, tipPct]);
  const age = useMemo(() => ageFromDate(birth), [birth]);
  const diffDays = useMemo(() => daysBetween(dateA, dateB), [dateA, dateB]);
  const ratio = useMemo(() => aspectRatio(num(ratioW), num(ratioH)), [ratioW, ratioH]);

  const cat = UNIT_CATEGORIES[unitCat];
  const unitKeys = Object.keys(cat.units);
  const converted = useMemo(
    () => convertUnit(unitVal, unitFrom, unitTo, unitCat),
    [unitVal, unitFrom, unitTo, unitCat],
  );

  const copy = async (label, val) => {
    try {
      await navigator.clipboard.writeText(String(val ?? ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      logHistory(`Salin: ${label}`, String(val ?? ''));
    } catch { /* abaikan */ }
  };

  const logHistory = (title, payload) => {
    addToolboxHistory({ toolType: 'calc', title, dataPayload: payload });
    if (onRefreshHistory) onRefreshHistory();
  };

  const saveToNote = async () => {
    const lines = [
      '# QuickCalc — Ringkasan Perhitungan',
      '',
      `- **Waktu**: ${new Date().toLocaleString('id-ID')}`,
      '',
      '## Diskon',
      `- Harga awal: ${formatRupiah(price)}`,
      `- Diskon ${discPct}%: -${formatRupiah(disc.amount)}`,
      `- Harga akhir: **${formatRupiah(disc.final)}**`,
      '',
      '## PPN',
      `- Dasar: ${formatRupiah(tax.base)}`,
      `- Pajak ${vatPct}%: ${formatRupiah(tax.tax)}`,
      `- Total: **${formatRupiah(tax.total)}**`,
      '',
      '## Bagi Tagihan',
      `- Total: ${formatRupiah(billSplit.grand)} (tip ${tipPct}%)`,
      `- Per orang (${people}): **${formatRupiah(billSplit.perPerson)}**`,
    ].join('\n');

    try {
      await saveNote({
        title: 'QuickCalc — Ringkasan',
        content: lines,
        tags: ['artoolbox', 'calc'],
        color: 'yellow',
        isPinned: false,
      });
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } catch (e) {
      console.error('Gagal simpan ke ArNote:', e);
    }
  };

  const tabs = [
    { id: 'harga', label: 'Harga & PPN', icon: Calculator },
    { id: 'persen', label: 'Persen', icon: Percent },
    { id: 'unit', label: 'Konversi', icon: Ruler },
    { id: 'tanggal', label: 'Tanggal', icon: Calendar },
    { id: 'tagihan', label: 'Bagi Tagihan', icon: Users },
  ];

  return (
    <CalcCopyContext.Provider value={copy}>
    <div className="space-y-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#FFE600] rounded-2xl border-2 border-[#121212] shadow-[4px_4px_0px_#121212]">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white border-2 border-[#121212] shadow-[2px_2px_0px_#121212] hover:shadow-[1px_1px_0px_#121212] hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-[#121212]" />
        </button>
        <h2 className="text-xl font-black text-[#121212] uppercase tracking-tight">Quick Calculator</h2>
        <div className="w-9" />
      </div>

      {/* Tabs */}
      <div className="flex bg-[#C4FAF8] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] p-1 gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 min-w-max py-2 px-2.5 rounded-lg font-black text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === t.id ? 'bg-white shadow-[1px_1px_0px_#121212]' : 'text-[#121212]/70 hover:bg-white/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Harga & PPN */}
      {activeTab === 'harga' && (
        <div className="space-y-3.5">
          <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
            <h3 className="text-sm font-black uppercase">Harga, Diskon & PPN</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Harga (Rp)" value={price} onChange={setPrice} />
              <Field label="Diskon (%)" value={discPct} onChange={setDiscPct} suffix="%" />
              <Field label="PPN (%)" value={vatPct} onChange={setVatPct} suffix="%" />
              <Field label="Markup (%)" value={markupPct} onChange={setMarkupPct} suffix="%" />
            </div>
            <div className="flex bg-[#FFE600] rounded-lg border-2 border-[#121212] p-0.5 gap-0.5 w-max">
              {[['exclusive', 'Harga + PPN'], ['inclusive', 'Harga sudah termasuk']].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setVatMode(id)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-black cursor-pointer ${vatMode === id ? 'bg-white' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Result label="Potongan Diskon" value={formatRupiah(disc.amount)} />
            <Result label="Harga Setelah Diskon" value={formatRupiah(disc.final)} highlight />
            <Result label="Dasar Pajak" value={formatRupiah(tax.base)} />
            <Result label="Nilai PPN" value={formatRupiah(tax.tax)} />
            <Result label={`Total + PPN ${vatPct}%`} value={formatRupiah(tax.total)} highlight />
            <Result label={`Harga + Markup ${markupPct}%`} value={formatRupiah(up.final)} />
          </div>
        </div>
      )}

      {/* Persen */}
      {activeTab === 'persen' && (
        <div className="space-y-3.5">
          <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
            <h3 className="text-sm font-black uppercase">Kalkulator Persen</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Persen (%)" value={pctOfPct} onChange={setPctOfPct} suffix="%" />
              <Field label="Dari Nilai" value={pctOfVal} onChange={setPctOfVal} />
            </div>
            <Result
              label={`${pctOfPct}% dari ${formatRupiah(pctOfVal)}`}
              value={formatRupiah(percentOf(pctOfPct, pctOfVal))}
              highlight
            />
          </div>

          <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
            <h3 className="text-sm font-black uppercase">Perubahan Nilai</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nilai Awal" value={chgFrom} onChange={setChgFrom} />
              <Field label="Nilai Akhir" value={chgTo} onChange={setChgTo} />
            </div>
            <Result
              label="Perubahan"
              value={percentChange(chgFrom, chgTo) === null ? '—' : `${percentChange(chgFrom, chgTo)}%`}
              highlight
            />
          </div>

          <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-2">
            <h3 className="text-sm font-black uppercase">Rasio Aspek (W:H)</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lebar" value={ratioW} onChange={setRatioW} />
              <Field label="Tinggi" value={ratioH} onChange={setRatioH} />
            </div>
            <Result label="Rasio" value={ratio ? `${ratio.label}  (${ratio.decimal})` : '—'} highlight />
          </div>
        </div>
      )}

      {/* Konversi unit */}
      {activeTab === 'unit' && (
        <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
          <h3 className="text-sm font-black uppercase">Konversi Satuan</h3>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(UNIT_CATEGORIES).map(([id, c]) => (
              <button
                key={id}
                onClick={() => {
                  setUnitCat(id);
                  const keys = Object.keys(c.units);
                  setUnitFrom(keys[0]);
                  setUnitTo(keys[1] || keys[0]);
                }}
                className={`px-2.5 py-1.5 rounded-lg border-2 border-[#121212] text-[10px] font-black cursor-pointer ${
                  unitCat === id ? 'bg-[#FFE600] shadow-[1.5px_1.5px_0px_#121212]' : 'bg-[#F8F5EE]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-600">Dari</span>
              <select
                value={unitFrom}
                onChange={(e) => setUnitFrom(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-[#121212] bg-[#F8F5EE] font-mono text-sm font-bold outline-none"
              >
                {unitKeys.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-600">Ke</span>
              <select
                value={unitTo}
                onChange={(e) => setUnitTo(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-[#121212] bg-[#F8F5EE] font-mono text-sm font-bold outline-none"
              >
                {unitKeys.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
          </div>
          <Field label="Nilai" value={unitVal} onChange={setUnitVal} />
          <Result
            label={`${unitVal} ${unitFrom} =`}
            value={converted === null ? '—' : `${converted} ${unitTo}`}
            highlight
          />
        </div>
      )}

      {/* Tanggal */}
      {activeTab === 'tanggal' && (
        <div className="space-y-3.5">
          <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
            <h3 className="text-sm font-black uppercase">Hitung Umur</h3>
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-600">Tanggal Lahir</span>
              <input
                type="date"
                value={birth}
                onChange={(e) => setBirth(e.target.value)}
                className="w-full p-2.5 rounded-xl border-2 border-[#121212] bg-[#F8F5EE] font-mono text-sm font-bold outline-none"
              />
            </label>
            {age && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <Result label="Tahun" value={age.years} highlight />
                <Result label="Bulan" value={age.months} />
                <Result label="Hari" value={age.days} />
                <Result label="Total Hari" value={age.totalDays.toLocaleString('id-ID')} />
              </div>
            )}
          </div>

          <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
            <h3 className="text-sm font-black uppercase">Selisih Dua Tanggal</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-600">Tanggal A</span>
                <input type="date" value={dateA} onChange={(e) => setDateA(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-2 border-[#121212] bg-[#F8F5EE] font-mono text-sm font-bold outline-none" />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-600">Tanggal B</span>
                <input type="date" value={dateB} onChange={(e) => setDateB(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-2 border-[#121212] bg-[#F8F5EE] font-mono text-sm font-bold outline-none" />
              </label>
            </div>
            <Result
              label="Selisih (hari)"
              value={diffDays === null ? '—' : `${diffDays.toLocaleString('id-ID')} hari`}
              highlight
            />
          </div>
        </div>
      )}

      {/* Bagi tagihan */}
      {activeTab === 'tagihan' && (
        <div className="space-y-3.5">
          <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
            <h3 className="text-sm font-black uppercase">Bagi Tagihan</h3>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Total (Rp)" value={bill} onChange={setBill} />
              <Field label="Jumlah Orang" value={people} onChange={setPeople} />
              <Field label="Tip (%)" value={tipPct} onChange={setTipPct} suffix="%" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Result label="Nilai Tip" value={formatRupiah(billSplit.tip)} />
            <Result label="Total + Tip" value={formatRupiah(billSplit.grand)} />
            <Result label={`Per Orang (${people})`} value={formatRupiah(billSplit.perPerson)} highlight />
            <Result label="Pembulatan ke atas/orang" value={formatRupiah(Math.ceil(billSplit.perPerson / 500) * 500)} />
          </div>
        </div>
      )}

      {/* Save */}
      <button
        onClick={saveToNote}
        className="w-full px-3 py-2.5 bg-[#38E54D] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
      >
        {noteSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {noteSaved ? 'Tersimpan ke ArNote!' : 'Simpan Ringkasan ke ArNote'}
      </button>

      {copied && (
        <div className="text-center text-[11px] font-black text-green-700">Tersalin ke clipboard</div>
      )}
    </div>
    </CalcCopyContext.Provider>
  );
}
