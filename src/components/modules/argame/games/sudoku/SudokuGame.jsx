import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, RotateCcw, Edit3, Eraser, Sparkles, Play, Pause, 
  HelpCircle, Volume2, VolumeX, Smartphone, ArrowLeft, RefreshCw, CheckCircle2
} from 'lucide-react';
import { generateSudoku, findConflicts, isSolved, EMPTY, countCorrectNumber, canUseHint, hintsRemaining } from './sudokuGenerator';
import { 
  playTapSound, playNumberSound, playEraseSound, 
  playErrorSound, playVictorySound, triggerHaptic 
} from '../../utils/arcadeAudio';
import { 
  getSudokuSavedState, saveSudokuState, clearSudokuState, saveSudokuScore 
} from '../../utils/gameStorage';

export default function SudokuGame({ onBack, soundEnabled, hapticEnabled, onNewScore }) {
  const [difficulty, setDifficulty] = useState('easy'); // 'easy' | 'medium' | 'hard'
  const [puzzle, setPuzzle] = useState([]);      // Initial board (fixed cells)
  const [solution, setSolution] = useState([]);    // Full solution board
  const [board, setBoard] = useState([]);        // Current board values
  const [notes, setNotes] = useState([]);        // 9x9 array of Sets/Arrays for pencil notes
  const [selectedCell, setSelectedCell] = useState(null); // [row, col] or null
  const [isPencilMode, setIsPencilMode] = useState(false);
  const [history, setHistory] = useState([]);     // Action history stack for Undo
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameWon, setIsGameWon] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showConfirmNewGame, setShowConfirmNewGame] = useState(false);

  const timerRef = useRef(null);

  // Inisialisasi atau Pemulihan State Game dari LocalStorage
  useEffect(() => {
    const saved = getSudokuSavedState();
    if (saved && saved.board && saved.board.length === 9) {
      setDifficulty(saved.difficulty || 'easy');
      setPuzzle(saved.puzzle);
      setSolution(saved.solution);
      setBoard(saved.board);
      setNotes(saved.notes ? saved.notes.map((row) => row.map((cell) => new Set(cell))) : createEmptyNotes());
      setMistakes(saved.mistakes || 0);
      setHintsUsed(saved.hintsUsed || 0);
      setTimerSeconds(saved.timerSeconds || 0);
    } else {
      startNewGame('easy');
    }
  }, []);

  // Timer interval
  useEffect(() => {
    if (!isPaused && !isGameWon && board.length > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPaused, isGameWon, board]);

  // Auto-save state setiap kali ada perubahan pada papan / timer
  useEffect(() => {
    if (board.length === 9 && !isGameWon) {
      saveSudokuState({
        difficulty,
        puzzle,
        solution,
        board,
        notes: notes.map((row) => row.map((cell) => Array.from(cell))),
        mistakes,
        hintsUsed,
        timerSeconds,
      });
    }
  }, [board, notes, mistakes, hintsUsed, timerSeconds, difficulty, puzzle, solution, isGameWon]);

  const createEmptyNotes = () => Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));

  // Mulai Game Baru
  const startNewGame = (diff = difficulty) => {
    const { puzzle: newPuzzle, solution: newSolution } = generateSudoku(diff);
    setDifficulty(diff);
    setPuzzle(newPuzzle);
    setSolution(newSolution);
    setBoard(newPuzzle.map((row) => [...row]));
    setNotes(createEmptyNotes());
    setSelectedCell(null);
    setIsPencilMode(false);
    setHistory([]);
    setMistakes(0);
    setHintsUsed(0);
    setTimerSeconds(0);
    setIsPaused(false);
    setIsGameWon(false);
    setIsNewRecord(false);
    setShowConfirmNewGame(false);
    clearSudokuState();
    playTapSound(soundEnabled);
  };

  // Hitung Konflik / Bentrokan Angka pada Papan Saat Ini
  const conflicts = board.length === 9 ? findConflicts(board) : Array.from({ length: 9 }, () => Array(9).fill(false));

  // Hitung berapa kali tiap angka (1-9) sudah ditempatkan dengan BENAR, untuk
  // menonaktifkan angka yang sudah lengkap (9x) — tidak perlu dipakai lagi.
  const numberCounts = board.length === 9
    ? Array.from({ length: 9 }, (_, i) => countCorrectNumber(board, solution, i + 1))
    : Array(9).fill(0);

  // Tangani Input Angka (1-9)
  const handleNumberInput = (num) => {
    if (!selectedCell || isGameWon || isPaused) return;
    const [r, c] = selectedCell;

    // Jika sel merupakan bagian dari puzzle asli (fixed), abaikan
    if (puzzle[r][c] !== EMPTY) return;

    if (isPencilMode) {
      // Toggle angka pada catatan pencil
      const newNotes = notes.map((row) => row.map((cell) => new Set(cell)));
      const cellSet = newNotes[r][c];
      if (cellSet.has(num)) {
        cellSet.delete(num);
      } else {
        cellSet.add(num);
      }
      setNotes(newNotes);
      playTapSound(soundEnabled);
      if (hapticEnabled) triggerHaptic(15);
    } else {
      // Input angka utama
      if (board[r][c] === num) return; // Tidak ada perubahan

      const oldVal = board[r][c];
      const newBoard = board.map((row) => [...row]);
      newBoard[r][c] = num;

      // Bersihkan catatan pencil di sel tersebut jika diisi angka
      const newNotes = notes.map((row) => row.map((cell) => new Set(cell)));
      newNotes[r][c].clear();

      // Tambahkan ke riwayat Undo
      setHistory((prev) => [...prev, { row: r, col: c, oldVal, newVal: num, oldNotes: notes[r][c] }]);
      setBoard(newBoard);
      setNotes(newNotes);

      // Validasi kesalahan jika angka salah dibanding solusi asli
      if (num !== solution[r][c]) {
        setMistakes((prev) => prev + 1);
        playErrorSound(soundEnabled, hapticEnabled);
      } else {
        playNumberSound(num, soundEnabled);
        if (hapticEnabled) triggerHaptic(20);
      }

      // Cek apakah game berhasil diselesaikan
      if (isSolved(newBoard, solution)) {
        handleWin(timerSeconds);
      }
    }
  };

  // Tangani Penghapusan Angka / Catatan
  const handleErase = () => {
    if (!selectedCell || isGameWon || isPaused) return;
    const [r, c] = selectedCell;

    if (puzzle[r][c] !== EMPTY) return; // Tidak bisa menghapus sel awal

    const oldVal = board[r][c];
    if (oldVal === EMPTY && notes[r][c].size === 0) return;

    const newBoard = board.map((row) => [...row]);
    newBoard[r][c] = EMPTY;

    const newNotes = notes.map((row) => row.map((cell) => new Set(cell)));
    newNotes[r][c].clear();

    setHistory((prev) => [...prev, { row: r, col: c, oldVal, newVal: EMPTY, oldNotes: notes[r][c] }]);
    setBoard(newBoard);
    setNotes(newNotes);

    playEraseSound(soundEnabled);
    if (hapticEnabled) triggerHaptic(20);
  };

  // Tangani Tombol Undo
  const handleUndo = () => {
    if (history.length === 0 || isGameWon || isPaused) return;
    const lastAction = history[history.length - 1];

    const newBoard = board.map((row) => [...row]);
    newBoard[lastAction.row][lastAction.col] = lastAction.oldVal;

    const newNotes = notes.map((row) => row.map((cell) => new Set(cell)));
    newNotes[lastAction.row][lastAction.col] = new Set(lastAction.oldNotes);

    setBoard(newBoard);
    setNotes(newNotes);
    setHistory((prev) => prev.slice(0, -1));

    playTapSound(soundEnabled);
    if (hapticEnabled) triggerHaptic(15);
  };

  // Fitur Bantuan (Hint) - Membuka 1 sel dengan jawaban benar (maks 3x per game)
  const handleHint = () => {
    if (!selectedCell || isGameWon || isPaused) return;
    if (!canUseHint(hintsUsed)) return; // Jatah hint habis
    const [r, c] = selectedCell;

    if (puzzle[r][c] !== EMPTY || board[r][c] === solution[r][c]) return;

    const correctVal = solution[r][c];
    const newBoard = board.map((row) => [...row]);
    newBoard[r][c] = correctVal;

    const newNotes = notes.map((row) => row.map((cell) => new Set(cell)));
    newNotes[r][c].clear();

    setBoard(newBoard);
    setNotes(newNotes);
    setHintsUsed((prev) => prev + 1);

    playNumberSound(correctVal, soundEnabled);
    if (hapticEnabled) triggerHaptic(30);

    if (isSolved(newBoard, solution)) {
      handleWin(timerSeconds);
    }
  };

  // Penanganan Kemenangan
  const handleWin = (finalTime) => {
    setIsGameWon(true);
    clearSudokuState();
    playVictorySound(soundEnabled, hapticEnabled);
    const newRecord = saveSudokuScore(difficulty, finalTime);
    setIsNewRecord(newRecord);
    if (onNewScore) onNewScore();
  };

  // Format Waktu MM:SS
  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper Penyorotan Sel
  const isSelected = (r, c) => selectedCell && selectedCell[0] === r && selectedCell[1] === c;
  
  const isRelated = (r, c) => {
    if (!selectedCell) return false;
    const [sr, sc] = selectedCell;
    if (sr === r && sc === c) return false;
    // Baris sama, Kolom sama, atau Subgrid 3x3 sama
    return sr === r || sc === c || (Math.floor(sr / 3) === Math.floor(r / 3) && Math.floor(sc / 3) === Math.floor(c / 3));
  };

  const isSameNumber = (r, c) => {
    if (!selectedCell) return false;
    const [sr, sc] = selectedCell;
    const selVal = board[sr]?.[sc];
    return selVal !== EMPTY && board[r]?.[c] === selVal;
  };

  return (
    <div className="space-y-4 max-w-md mx-auto select-none font-sans pb-6">
      {/* Header Game Navigation & Stats */}
      <div className="flex items-center justify-between gap-2 bg-white p-3 rounded-2xl border-[2.5px] border-[#121212] shadow-[3px_3px_0px_#121212]">
        <button
          onClick={onBack}
          className="p-2 bg-[#F8F5EE] hover:bg-[#FFE600] rounded-xl border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#121212]" />
        </button>

        <div className="flex items-center gap-2">
          {/* Difficulty Selector */}
          <select
            value={difficulty}
            onChange={(e) => startNewGame(e.target.value)}
            className="px-2.5 py-1 bg-[#FFE600] text-[#121212] font-black text-xs uppercase rounded-xl border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212] cursor-pointer outline-none"
          >
            <option value="easy">Mudah</option>
            <option value="medium">Sedang</option>
            <option value="hard">Sulit</option>
          </select>

          {/* Stopwatch */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#121212] text-white font-mono-code font-black text-xs rounded-xl shadow-[1.5px_1.5px_0px_#FFE600]">
            <span>{formatTime(timerSeconds)}</span>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="text-[#FFE600] hover:scale-110 transition-transform cursor-pointer"
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            </button>
          </div>
        </div>

        {/* New Game Button */}
        <button
          onClick={() => setShowConfirmNewGame(true)}
          className="p-2 bg-[#38E54D] hover:bg-[#30c241] rounded-xl border-2 border-[#121212] shadow-[1.5px_1.5px_0px_#121212] transition-all cursor-pointer"
          title="Game Baru"
        >
          <RefreshCw className="w-4 h-4 text-[#121212]" />
        </button>
      </div>

      {/* Info Kesalahan & Kontrol Jeda */}
      <div className="flex items-center justify-between px-2 text-xs font-mono-code font-bold text-[#121212]">
        <span className="flex items-center gap-1.5 bg-[#FF70A6]/20 px-2.5 py-1 rounded-lg border border-[#FF70A6]">
          <span>Kesalahan:</span>
          <span className="font-black text-[#FF70A6]">{mistakes}</span>
        </span>
        <span className="text-[11px] text-gray-500">
          Mode Pencil: <strong className={isPencilMode ? 'text-[#38E54D]' : 'text-gray-400'}>{isPencilMode ? 'AKTIF' : 'OFF'}</strong>
        </span>
      </div>

      {/* Grid Sudoku Utama 9x9 */}
      <div className="relative bg-[#121212] p-1.5 rounded-2xl border-[3px] border-[#121212] shadow-[4px_4px_0px_#121212] aspect-square w-full flex flex-col justify-between">
        {isPaused ? (
          <div className="absolute inset-0 bg-[#F8F5EE]/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center space-y-3 z-20">
            <Pause className="w-10 h-10 text-[#121212] animate-bounce" />
            <span className="font-mono-code font-black text-sm uppercase">Permainan Dijeda</span>
            <button
              onClick={() => setIsPaused(false)}
              className="px-4 py-2 bg-[#FFE600] text-[#121212] font-black text-xs uppercase rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] cursor-pointer"
            >
              Lanjutkan
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-9 gap-[1px] bg-[#121212] w-full h-full rounded-lg overflow-hidden border border-[#121212]">
          {board.map((row, r) =>
            row.map((val, c) => {
              const isFixed = puzzle[r]?.[c] !== EMPTY;
              const hasConflict = conflicts[r]?.[c];
              const active = isSelected(r, c);
              const related = isRelated(r, c);
              const sameNum = isSameNumber(r, c);

              // Styling garis tebal untuk pembatas subgrid 3x3
              const borderRight = c === 2 || c === 5 ? 'border-r-[2.5px] border-r-[#121212]' : '';
              const borderBottom = r === 2 || r === 5 ? 'border-b-[2.5px] border-b-[#121212]' : '';

              // Pewarnaan Latar Belakang Sel
              let bgClass = 'bg-white';
              if (active) {
                bgClass = 'bg-[#FFE600]';
              } else if (hasConflict) {
                bgClass = 'bg-[#FF70A6]';
              } else if (sameNum) {
                bgClass = 'bg-[#C4FAF8]';
              } else if (related) {
                bgClass = 'bg-[#F8F5EE]';
              }

              // Pewarnaan Teks
              let textClass = 'text-[#121212] font-black';
              if (hasConflict) {
                textClass = 'text-white font-black';
              } else if (isFixed) {
                textClass = 'text-[#121212] font-black';
              } else {
                textClass = 'text-[#1A56DB] font-extrabold'; // Warna khusus angka buatan pemain
              }

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => {
                    setSelectedCell([r, c]);
                    playTapSound(soundEnabled);
                  }}
                  className={`relative flex items-center justify-center text-sm sm:text-base cursor-pointer transition-colors ${bgClass} ${borderRight} ${borderBottom}`}
                >
                  {val !== EMPTY ? (
                    <span className={textClass}>{val}</span>
                  ) : notes[r]?.[c]?.size > 0 ? (
                    /* Display Pencil Notes 3x3 Grid */
                    <div className="grid grid-cols-3 gap-[1px] w-full h-full p-0.5 pointer-events-none text-[10px] font-mono-code leading-none text-gray-500 font-bold items-center justify-items-center">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <span key={n}>{notes[r][c].has(n) ? n : ''}</span>
                      ))}
                    </div>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Control Tools Bar */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className={`py-2 px-1 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] flex flex-col items-center justify-center gap-1 font-mono-code font-black text-[10px] uppercase transition-all ${
            history.length > 0 ? 'bg-white hover:bg-gray-100 cursor-pointer' : 'bg-gray-200 opacity-50 cursor-not-allowed'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-[#121212]" />
          <span>Undo</span>
        </button>

        <button
          onClick={handleErase}
          className="py-2 px-1 bg-white hover:bg-gray-100 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] flex flex-col items-center justify-center gap-1 font-mono-code font-black text-[10px] uppercase cursor-pointer transition-all"
        >
          <Eraser className="w-4 h-4 text-[#FF70A6]" />
          <span>Hapus</span>
        </button>

        <button
          onClick={() => setIsPencilMode(!isPencilMode)}
          className={`py-2 px-1 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] flex flex-col items-center justify-center gap-1 font-mono-code font-black text-[10px] uppercase cursor-pointer transition-all ${
            isPencilMode ? 'bg-[#38E54D] text-[#121212]' : 'bg-white text-[#121212] hover:bg-gray-100'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Pencil</span>
        </button>

        <button
          onClick={handleHint}
          disabled={!canUseHint(hintsUsed) || isGameWon}
          className={`py-2 px-1 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] flex flex-col items-center justify-center gap-1 font-mono-code font-black text-[10px] uppercase transition-all ${
            canUseHint(hintsUsed) && !isGameWon
              ? 'bg-white hover:bg-gray-100 cursor-pointer text-[#121212]'
              : 'bg-gray-200 opacity-50 cursor-not-allowed text-gray-500'
          }`}
          title={canUseHint(hintsUsed) ? `Sisa hint: ${hintsRemaining(hintsUsed)}` : 'Jatah hint habis'}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Hint ({hintsRemaining(hintsUsed)})</span>
        </button>
      </div>

      {/* Virtual Numpad 1-9 */}
      <div className="grid grid-cols-9 gap-1.5 pt-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
          const complete = numberCounts[num - 1] >= 9;
          return (
            <button
              key={num}
              onClick={() => handleNumberInput(num)}
              disabled={complete}
              title={complete ? `Angka ${num} sudah lengkap (9x)` : undefined}
              className={`relative py-3 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] font-black text-base transition-all flex items-center justify-center ${
                complete
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60 line-through'
                  : 'bg-white hover:bg-[#FFE600] active:scale-95 text-[#121212] cursor-pointer'
              }`}
            >
              {num}
              {/* Penanda kecil jumlah pemakaian (mis. 9/9) */}
              <span className="absolute bottom-0 right-0.5 text-[7px] font-mono-code font-bold text-gray-400 leading-none">
                {numberCounts[num - 1]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Modal Kemenangan */}
      {isGameWon && (
        <div className="fixed inset-0 bg-[#121212]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#F8F5EE] border-[3px] border-[#121212] shadow-[6px_6px_0px_#121212] rounded-3xl p-6 max-w-sm w-full text-center space-y-4">
            <div className="w-16 h-16 bg-[#FFE600] rounded-2xl border-[2.5px] border-[#121212] shadow-[3px_3px_0px_#121212] mx-auto flex items-center justify-center">
              <Trophy className="w-9 h-9 text-[#121212]" />
            </div>

            <div>
              <h3 className="text-xl font-black uppercase text-[#121212] tracking-tight">
                Selamat! Teka-Teki Selesai!
              </h3>
              <p className="text-xs font-bold text-gray-600 mt-1">
                Anda berhasil memecahkan Sudoku tingkat <strong className="uppercase">{difficulty}</strong>.
              </p>
            </div>

            {isNewRecord && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#38E54D] border-2 border-[#121212] rounded-full shadow-[1.5px_1.5px_0px_#121212] text-xs font-black uppercase">
                <Sparkles className="w-3.5 h-3.5 text-[#121212]" />
                Rekor Waktu Baru!
              </div>
            )}

            <div className="bg-white p-3 rounded-2xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-mono-code font-bold space-y-1">
              <div className="flex justify-between">
                <span>Waktu Selesai:</span>
                <span className="font-black text-[#121212]">{formatTime(timerSeconds)}</span>
              </div>
              <div className="flex justify-between">
                <span>Jumlah Kesalahan:</span>
                <span className="font-black text-[#FF70A6]">{mistakes}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => startNewGame(difficulty)}
                className="flex-1 py-2.5 bg-[#38E54D] text-[#121212] font-black text-xs uppercase rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] cursor-pointer hover:bg-[#30c241] transition-all"
              >
                Main Lagi
              </button>
              <button
                onClick={onBack}
                className="py-2.5 px-4 bg-white text-[#121212] font-black text-xs uppercase rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] cursor-pointer hover:bg-gray-100 transition-all"
              >
                Ke Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Game Baru */}
      {showConfirmNewGame && (
        <div className="fixed inset-0 bg-[#121212]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#F8F5EE] border-[3px] border-[#121212] shadow-[5px_5px_0px_#121212] rounded-2xl p-5 max-w-xs w-full text-center space-y-3">
            <h4 className="font-black text-base uppercase text-[#121212]">Mulai Game Baru?</h4>
            <p className="text-xs font-bold text-gray-600">Progres teka-teki saat ini akan di-reset.</p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => startNewGame(difficulty)}
                className="flex-1 py-2 bg-[#FF70A6] text-white font-black text-xs uppercase rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] cursor-pointer"
              >
                Ya, Reset
              </button>
              <button
                onClick={() => setShowConfirmNewGame(false)}
                className="flex-1 py-2 bg-white text-[#121212] font-black text-xs uppercase rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
