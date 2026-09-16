import React from 'react';
import { Sparkles, Award, Shield, Compass, Clock, RotateCcw, Download } from 'lucide-react';
import { MANDATE, EXP_LEVELS } from '../data/initialData';

export function Header({ totalExp, onOpenMandala, onOpenTimer, onResetData, onExportData }) {
  // Determine current level
  const currentLevel = EXP_LEVELS.slice().reverse().find(lvl => totalExp >= lvl.minExp) || EXP_LEVELS[0];
  const nextLevel = EXP_LEVELS.find(lvl => lvl.level === currentLevel.level + 1);
  const expInLevel = totalExp - currentLevel.minExp;
  const expRange = nextLevel ? nextLevel.minExp - currentLevel.minExp : 100;
  const levelProgress = nextLevel ? Math.min(100, Math.round((expInLevel / expRange) * 100)) : 100;

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Brand & Mandate */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-extrabold text-xl">
              ⭐
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-2">
                  HARADA & AVRA <span className="text-amber-400 font-normal">| LIFE OS</span>
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Better Future 2030
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-xl">
                100.000 Siswa • 1.000 Sekolah • Rp 400 Jt/Bln • Rp 9 Miliar • 5 Klinik • 2 LPK Vokasi IT
              </p>
            </div>
          </div>

          {/* Controls: EXP Level, Timer, Mandala & Export */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            
            {/* Level Card */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 flex items-center gap-3">
              <div className="text-xl">{currentLevel.badge}</div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-200">{currentLevel.title}</span>
                  <span className="text-[10px] text-amber-400 font-mono font-semibold">({totalExp} EXP)</span>
                </div>
                <div className="w-24 bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${levelProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 3-Second Composure Tool Button */}
            <button
              onClick={onOpenTimer}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              title="Latihan Aturan Jeda 3 Detik Sebelum Berbicara (E7.8)"
            >
              <Clock className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>Jeda 3 Detik</span>
            </button>

            {/* 9x9 Mandala Button */}
            <button
              onClick={onOpenMandala}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>Mandala 9×9</span>
            </button>

            {/* Export JSON Button */}
            <button
              onClick={onExportData}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Backup Data ke JSON"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Reset Button */}
            <button
              onClick={onResetData}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 border border-slate-700 transition"
              title="Reset ke Data Default"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

          </div>

        </div>
      </div>
    </header>
  );
}
