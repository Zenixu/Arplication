import React from 'react';
import { Map as MapIcon } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'home', label: 'Hub', iconUrl: '/logo.png', activeColor: 'bg-[#FFE600]' },
    { id: 'arloader', label: 'Arloader', iconUrl: '/arloader.png', activeColor: 'bg-[#38E54D]' },
    { id: 'armusic', label: 'ArMusic', iconUrl: '/armusic.png', activeColor: 'bg-[#D8B4FE]' },
    { id: 'armaps', label: 'ArMaps', Icon: MapIcon, activeColor: 'bg-[#C4FAF8]' },
    { id: 'artoolbox', label: 'Toolbox', iconUrl: '/artoolbox.png', activeColor: 'bg-[#C4FAF8]' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#F8F5EE] border-t-[3px] border-[#121212] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="max-w-md mx-auto flex items-stretch gap-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const IconComp = item.Icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? `${item.activeColor} text-[#121212] border-2 border-[#121212] shadow-[2.5px_2.5px_0px_#121212] -translate-y-0.5 font-black`
                  : 'text-[#121212] hover:bg-white/80 border-2 border-transparent font-bold'
              }`}
            >
              <div className="relative w-6 h-6 flex items-center justify-center">
                {IconComp ? (
                  <IconComp className={`w-5 h-5 ${isActive ? '' : 'opacity-80'}`} />
                ) : (
                  <img
                    src={item.iconUrl}
                    alt={item.label}
                    className={`w-5 h-5 object-contain transition-transform ${isActive ? 'scale-110' : 'grayscale opacity-80'}`}
                  />
                )}
              </div>
              <span className="w-full text-center truncate text-[10px] mt-0.5 tracking-tight font-mono-code uppercase">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
