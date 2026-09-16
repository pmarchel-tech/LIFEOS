import React from 'react';
import { X, Compass, Award, ExternalLink } from 'lucide-react';
import { MANDALA_GRID, MANDATE } from '../data/initialData';

export function MandalaModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-lg sm:text-xl flex items-center gap-2">
                TAKASHI HARADA MANDALA CHART (9×9)
              </h2>
              <p className="text-xs text-slate-400">
                Cetak biru 64-Grid sub-target di sekeliling Pusat Mandat Generasi 2030
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mandala Body (Scrollable) */}
        <div className="p-5 overflow-y-auto space-y-6">
          
          {/* Central Mandate Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/40 text-center">
            <h3 className="text-xs uppercase font-extrabold tracking-widest text-amber-400 mb-1">
              THE 2030 COVENANT
            </h3>
            <p className="text-base sm:text-lg font-extrabold text-white">
              "{MANDATE.quote}"
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs text-amber-200">
              {MANDATE.targets.map((t, idx) => (
                <span key={idx} className="bg-slate-900/60 px-3 py-1 rounded-full border border-amber-500/20">
                  {t.label}: <strong className="text-white">{t.value}</strong>
                </span>
              ))}
            </div>
          </div>

          {/* 8 Outer Quadrants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(MANDALA_GRID).map(([key, data]) => (
              <div
                key={key}
                className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2 border-b border-slate-700/60 pb-1.5 flex items-center justify-between">
                    <span>{data.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">8 Aksi</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {data.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-snug">
                        <span className="text-amber-400/80 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 text-center text-xs text-slate-500 italic">
          "Apa yang kamu tulis di 64 grid ini, jika kamu hidupi setiap hari, 2030 bukan target tapi kepastian." — Takashi Harada
        </div>

      </div>
    </div>
  );
}
