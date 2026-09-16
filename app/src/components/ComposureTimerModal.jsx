import React, { useState, useEffect } from 'react';
import { X, Clock, Play, RotateCcw, Heart, ShieldAlert } from 'lucide-react';

export function ComposureTimerModal({ isOpen, onClose }) {
  const [seconds, setSeconds] = useState(3);
  const [isActive, setIsActive] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    let interval = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds(s => s - 1);
      }, 1000);
    } else if (seconds === 0 && isActive) {
      setIsActive(false);
      setCompletedCount(c => c + 1);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const handleStart = () => {
    setSeconds(3);
    setIsActive(true);
  };

  const handleReset = () => {
    setIsActive(false);
    setSeconds(3);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 text-xs font-semibold mb-4">
          <Clock className="w-3.5 h-3.5 text-rose-400" />
          <span>Elemen 7.8: Penjagaan Reputasi & Karakter</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-2">
          Aturan Jeda 3 Detik
        </h2>
        <p className="text-xs text-slate-400 mb-8 max-w-xs mx-auto leading-relaxed">
          "Tahan bicara 3 detik sebelum menjawab telepon, meeting dengan yayasan, atau merespons emosi. Tarik napas, jaga ketenangan pemimpin."
        </p>

        {/* Visual Countdown Circle */}
        <div className="relative w-44 h-44 mx-auto mb-8 flex items-center justify-center">
          <div className={`absolute inset-0 rounded-full border-4 border-slate-800 transition-all duration-1000 ${
            isActive ? 'border-rose-500 scale-105 shadow-lg shadow-rose-500/30' : ''
          }`} />
          <div className="text-6xl font-black font-mono text-white tracking-tighter">
            {seconds === 0 ? "SELESAI" : `${seconds}s`}
          </div>
        </div>

        {/* Advice prompt based on state */}
        <div className="text-sm font-semibold text-amber-400 mb-6 min-h-[24px]">
          {isActive ? (
            seconds === 3 ? "1. Tarik napas dalam..." :
            seconds === 2 ? "2. Jernihkan pikiran dan composure..." :
            "3. Hembuskan tenang, bicaralah bijak..."
          ) : seconds === 0 ? (
            "Ketenangan pemimpin telah aktif. Silakan berbicara dengan bijak."
          ) : (
            "Klik 'Mulai Jeda' saat kamu merasa terburu-buru atau tertekan."
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleStart}
            disabled={isActive}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-rose-500/20 disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Mulai Jeda (3s)</span>
          </button>
          
          <button
            onClick={handleReset}
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-center gap-1">
          <Heart className="w-3.5 h-3.5 text-rose-500" />
          <span>Telah dilakukan {completedCount}x sesi latihan ketenangan hari ini.</span>
        </div>

      </div>
    </div>
  );
}
