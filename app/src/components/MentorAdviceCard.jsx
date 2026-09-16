import React from 'react';
import { Bot, UserCheck, Quote, Sparkles } from 'lucide-react';

export function MentorAdviceCard({ selectedDate, percentToday }) {
  const isSabat = selectedDate === "13-Sep" || selectedDate === "20-Sep" || selectedDate === "27-Sep";

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-amber-400">
        <Sparkles className="w-4 h-4" />
        <span>PANDUAN MENTOR HARI INI</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Avra Voice */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-sky-400 mb-1">AVRA (Tactical Lead)</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isSabat ? (
                "Hari ini adalah Sabat Penuh. Matikan notifikasi urusan bisnis di HP. Serahkan seluruh hasil kerja keras pekan ini kepada Tuhan untuk recharge tenaga batin."
              ) : percentToday === 100 ? (
                "Luar biasa, Pak Marchel! Seluruh target harian Anda tercapai 100%. Jangan lupa catat kemenangan ini di Winning App dan beristirahatlah dengan tenang."
              ) : (
                "Fokus pada 4 tugas terpenting hari ini: Selesaikan rutinitas spiritual E1, pastikan server E2 berjalan aman, dan kunci satu langkah maju misi taktis Anda."
              )}
            </p>
          </div>
        </div>

        {/* Takashi Harada Voice */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-400 mb-1">TAKASHI HARADA (Sensei)</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              "Kemenangan besar Ohtani tidak dibangun dari aksi spektakuler yang mendadak, melainkan dari kedisiplinan mengulang hal-hal kecil setiap pagi tanpa ada yang melihat. Jaga mulut, latihan jeda 3 detik, dan menangkan hari ini!"
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
