import React, { useState } from 'react';
import { LayoutGrid, Sparkles, Settings } from 'lucide-react';
import { APP_VERSION } from '../../services/updater.js';
import AppSettingsModal from '../modules/AppSettingsModal.jsx';

export default function Header({ activeTab, setActiveTab }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const getTabLabel = () => {
    switch (activeTab) {
      case 'home':
        return 'HUB';
      case 'arloader':
        return 'ARLOADER';
      case 'ardoro':
        return 'ARDORO';
      case 'arnote':
        return 'ARNOTE';
      case 'armusic':
        return 'ARMUSIC';
      case 'artoolbox':
        return 'TOOLBOX';
      case 'argame':
        return 'ARGAME';
      case 'aruthtale':
        return 'ARUTHTALE';
      default:
        return activeTab.toUpperCase();
    }
  };

  return (
    <header className="safe-top sticky top-0 z-40 w-full bg-[#F8F5EE] border-b-[2.5px] border-[#121212] text-[#121212] select-none">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div 
          className="flex items-center gap-2 cursor-pointer group select-none py-1"
          onClick={() => setActiveTab('home')}
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FFE600] flex items-center justify-center border-2 border-[#121212] shadow-[2px_2px_0px_#121212] transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5 overflow-hidden p-1">
            <img src="/logo.png" alt="Arplication Logo" className="w-full h-full object-contain" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-black text-sm sm:text-base uppercase tracking-wider text-[#121212]">
                ARPLICATION
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono-code font-black bg-[#38E54D] text-[#121212] px-1.5 py-0.5 border border-[#121212] rounded shadow-[1px_1px_0px_#121212]">
                v{APP_VERSION}
              </span>
            </div>
            <span className="hidden sm:block text-[8.5px] sm:text-[9px] font-mono-code font-bold text-[#121212]/60 tracking-wider mt-0.5">
              MORI SUITE • BENTO
            </span>
          </div>
        </div>

        {/* Right Tab & Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Active Tab Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border-2 border-[#121212] text-xs font-mono-code font-black text-[#121212] shadow-[2px_2px_0px_#121212]">
            <span className="w-2 h-2 rounded-full bg-[#38E54D] border border-[#121212] animate-pulse" />
            <span className="text-[10px] sm:text-[11px] tracking-wide">
              {getTabLabel()}
            </span>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border-2 border-[#121212] flex items-center justify-center transition-all shadow-[2px_2px_0px_#121212] overflow-hidden p-1.5 cursor-pointer bg-white hover:bg-yellow-100 text-[#121212] active:translate-y-0.5 active:shadow-[1px_1px_0px_#121212]"
            title="Pengaturan Aplikasi"
          >
            <Settings className="w-4 h-4 text-[#121212]" />
          </button>

          {/* Aruthtale Diagnostics / Info Button */}
          <button
            onClick={() => setActiveTab('aruthtale')}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg border-2 border-[#121212] flex items-center justify-center transition-all shadow-[2px_2px_0px_#121212] overflow-hidden p-1.5 cursor-pointer active:translate-y-0.5 active:shadow-[1px_1px_0px_#121212] ${
              activeTab === 'aruthtale'
                ? 'bg-[#FF70A6] text-[#121212]'
                : 'bg-white hover:bg-yellow-100 text-[#121212]'
            }`}
            title="Aruthtale Diagnostics & Info"
          >
            <Sparkles className="w-4 h-4 text-[#121212]" />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <AppSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      )}
    </header>
  );
}
