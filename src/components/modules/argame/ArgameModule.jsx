import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, Volume2, VolumeX, Smartphone, Trophy, Sparkles, ArrowRight, Play, Info
} from 'lucide-react';
import SudokuGame from './games/sudoku/SudokuGame';
import { getGameSettings, saveGameSettings, getHighScores } from './utils/gameStorage';

export default function ArgameModule({ setActiveTab }) {
  const [activeGame, setActiveGame] = useState('hub'); // 'hub' | 'sudoku'
  const [settings, setSettings] = useState(getGameSettings());
  const [highScores, setHighScores] = useState(getHighScores());

  useEffect(() => {
    setHighScores(getHighScores());
  }, [activeGame]);

  const toggleSound = () => {
    const updated = { ...settings, soundEnabled: !settings.soundEnabled };
    setSettings(updated);
    saveGameSettings(updated);
  };

  const toggleHaptic = () => {
    const updated = { ...settings, hapticEnabled: !settings.hapticEnabled };
    setSettings(updated);
    saveGameSettings(updated);
  };

  const formatScoreTime = (seconds) => {
    if (!seconds && seconds !== 0) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Tampilan Hub Utama ArGame */}
      {activeGame === 'hub' && (
        <div className="space-y-4">
          {/* Header Banner ArGame Hub */}
          <div className="p-4 sm:p-5 bg-[#FF8B3D] rounded-2xl border-[2.5px] border-[#121212] shadow-[4px_4px_0px_#121212] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212]">
                <img src="/Argame.png" alt="ArGame Logo" className="w-5 h-5 object-contain" />
                <span className="text-[11px] font-mono-code font-black uppercase tracking-wider text-[#121212]">
                  ARGAME ARCADE
                </span>
              </div>

              {/* Toggle Audio & Haptic Global */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleSound}
                  className={`p-1.5 rounded-xl border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212] cursor-pointer transition-all ${
                    settings.soundEnabled ? 'bg-[#FFE600] text-[#121212]' : 'bg-white text-gray-400'
                  }`}
                  title={settings.soundEnabled ? 'Suara Aktif' : 'Suara Hening'}
                >
                  {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                <button
                  onClick={toggleHaptic}
                  className={`p-1.5 rounded-xl border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212] cursor-pointer transition-all ${
                    settings.hapticEnabled ? 'bg-[#38E54D] text-[#121212]' : 'bg-white text-gray-400'
                  }`}
                  title={settings.hapticEnabled ? 'Getaran Aktif' : 'Getaran Matikan'}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#121212] uppercase leading-tight">
                Mini Arcade Offline
              </h2>
              <p className="text-xs font-bold text-gray-900 leading-relaxed mt-1">
                Koleksi game santai & asah otak bebas iklan. Mainkan secara instan di mana saja tanpa kuota internet.
              </p>
            </div>
          </div>

          {/* Rekor Skor Tertinggi (Sudoku High Scores Summary) */}
          <div className="bg-white p-3.5 rounded-2xl border-[2.5px] border-[#121212] shadow-[3px_3px_0px_#121212] space-y-2">
            <div className="flex items-center gap-1.5 font-mono-code font-black text-xs uppercase text-[#121212]">
              <Trophy className="w-4 h-4 text-[#FFE600]" />
              <span>Rekor Waktu Tercepat (Sudoku)</span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono-code text-xs">
              <div className="bg-[#F8F5EE] p-2 rounded-xl border border-[#121212]">
                <span className="block text-[10px] font-bold text-gray-500 uppercase">Mudah</span>
                <span className="font-black text-[#121212]">{formatScoreTime(highScores?.sudoku?.easy)}</span>
              </div>
              <div className="bg-[#F8F5EE] p-2 rounded-xl border border-[#121212]">
                <span className="block text-[10px] font-bold text-gray-500 uppercase">Sedang</span>
                <span className="font-black text-[#121212]">{formatScoreTime(highScores?.sudoku?.medium)}</span>
              </div>
              <div className="bg-[#F8F5EE] p-2 rounded-xl border border-[#121212]">
                <span className="block text-[10px] font-bold text-gray-500 uppercase">Sulit</span>
                <span className="font-black text-[#121212]">{formatScoreTime(highScores?.sudoku?.hard)}</span>
              </div>
            </div>
          </div>

          {/* Daftar Pilihan Game */}
          <div className="space-y-3">
            <h3 className="font-mono-code font-black text-xs uppercase text-[#121212] tracking-wider px-1">
              Pilih Permainan
            </h3>

            {/* 1. Sudoku (Active) */}
            <div
              onClick={() => setActiveGame('sudoku')}
              className="p-4 bg-white hover:bg-[#FFE600]/10 rounded-2xl border-[2.5px] border-[#121212] shadow-[3.5px_3.5px_0px_#121212] cursor-pointer transition-all group flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#FFE600] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] flex items-center justify-center font-mono-code font-black text-lg text-[#121212]">
                  9×9
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-base uppercase text-[#121212] group-hover:text-[#1A56DB]">
                      Sudoku Klasik
                    </h4>
                    <span className="px-2 py-0.5 bg-[#38E54D] text-[#121212] text-[11px] font-mono-code font-black rounded border border-[#121212]">
                      Siap Main
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-600 mt-0.5">
                    Teka-teki asah otak & logika dengan validasi duplikasi otomatis & mode pencil.
                  </p>
                </div>
              </div>

              <div className="p-2 bg-[#FFE600] rounded-xl border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212] group-hover:translate-x-1 transition-transform">
                <Play className="w-4 h-4 text-[#121212] fill-current" />
              </div>
            </div>

            {/* 2. Flappy Bird (Coming Next) */}
            <div className="p-4 bg-gray-50 opacity-80 rounded-2xl border-[2.5px] border-dashed border-gray-400 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#C4FAF8] rounded-xl border-2 border-gray-400 flex items-center justify-center font-mono-code font-black text-lg text-gray-600">
                  🐦
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-base uppercase text-gray-700">
                      Flappy Bird
                    </h4>
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-[11px] font-mono-code font-black rounded border border-gray-400">
                      Fase 2
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-500 mt-0.5">
                    Game arkade refleks terbang 60 FPS dengan fisika canvas 2D.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Reaction Duel (Coming Next) */}
            <div className="p-4 bg-gray-50 opacity-80 rounded-2xl border-[2.5px] border-dashed border-gray-400 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#FF70A6] rounded-xl border-2 border-gray-400 flex items-center justify-center font-mono-code font-black text-lg text-gray-600">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-base uppercase text-gray-700">
                      Reaction Duel (2P)
                    </h4>
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-[11px] font-mono-code font-black rounded border border-gray-400">
                      Fase 3
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-500 mt-0.5">
                    Adu refleks cepat 2 pemain berhadapan di 1 layar ponsel.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tampilan Game Sudoku saat Aktif */}
      {activeGame === 'sudoku' && (
        <SudokuGame
          onBack={() => setActiveGame('hub')}
          soundEnabled={settings.soundEnabled}
          hapticEnabled={settings.hapticEnabled}
          onNewScore={() => setHighScores(getHighScores())}
        />
      )}
    </div>
  );
}
