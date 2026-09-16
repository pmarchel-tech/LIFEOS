import React, { useState } from 'react';
import { ELEMENTS } from '../data/initialData';
import { MANDALA_ELEMENT_DETAILS } from '../data/mandalaElementsData';
import { 
  Target, BarChart3, CheckCircle2, TrendingUp, Calendar, 
  Clock, ListTodo, ChevronRight, Sparkles, BookmarkCheck
} from 'lucide-react';

export function ElementProgressDashboard({ allTasks = [], tasksForDate = [], records = [] }) {
  const [selectedElement, setSelectedElement] = useState('E1');
  const [activeTab, setActiveTab] = useState('actions'); // 'actions' | 'dates' | 'tasks'

  // Calculate statistics per element
  const elementStats = Object.keys(ELEMENTS).map((code) => {
    const elemTasks = allTasks.filter(t => t.element === code);
    const total = elemTasks.length;
    const done = elemTasks.filter(t => t.completed).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      code,
      meta: ELEMENTS[code],
      detail: MANDALA_ELEMENT_DETAILS[code] || {},
      total,
      done,
      percent
    };
  });

  const totalAllTasks = allTasks.length;
  const doneAllTasks = allTasks.filter(t => t.completed).length;
  const totalOverallPercent = totalAllTasks > 0 ? Math.round((doneAllTasks / totalAllTasks) * 100) : 0;

  const currentStat = elementStats.find(s => s.code === selectedElement) || elementStats[0];
  const currentDetail = MANDALA_ELEMENT_DETAILS[selectedElement] || currentStat.detail;
  const currentMeta = ELEMENTS[selectedElement] || currentStat.meta;

  // Live records matching this element
  const matchedRecords = records.filter(r => r.element === selectedElement);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5">
      
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h2 className="font-bold text-white text-base tracking-wide">
              PROGRESS 8 ELEMEN MANDAT HARADA
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Pilih salah satu elemen di sebelah kiri untuk melihat daftar 8-sub tindakan, frekuensi eksekusi, dan jadwal tanggal di kalender.
          </p>
        </div>

        {/* Global Stats Capsule */}
        <div className="flex items-center gap-3 bg-slate-950/70 px-4 py-2 rounded-xl border border-slate-800">
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total Capaian Mandat</span>
            <span className="text-xs font-bold text-white font-mono">
              {doneAllTasks} / {totalAllTasks} Selesai ({totalOverallPercent}%)
            </span>
          </div>
          <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border border-amber-500/40 relative">
            <span className="text-xs font-black text-amber-400 font-mono">{totalOverallPercent}%</span>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left 8 Elements Vertical Selector | Right Detailed Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ================= LEFT COLUMN: 8 ELEMEN LIST (lg:col-span-4) ================= */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1 flex items-center justify-between">
            <span>Daftar 8 Elemen Mandat</span>
            <span className="text-[10px] text-slate-500 font-normal">Klik untuk inspect</span>
          </div>

          <div className="space-y-1.5">
            {elementStats.map(({ code, meta, total, done, percent }) => {
              const isSelected = selectedElement === code;
              return (
                <button
                  key={code}
                  onClick={() => setSelectedElement(code)}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                    isSelected
                      ? `${meta.bgClass} ring-2 ring-amber-400/50 border-amber-400/80 shadow-lg scale-[1.01]`
                      : 'bg-slate-950/40 hover:bg-slate-800/50 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Element Badge */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono shrink-0 shadow-sm ${
                      isSelected ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {code}
                    </div>

                    {/* Element Name & Subtitle */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                          {meta.name}
                        </h4>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        {meta.sub}
                      </p>

                      {/* Mini Progress Bar */}
                      <div className="mt-1.5 w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-white/5">
                        <div
                          className={`h-full ${meta.barColor} transition-all duration-500 rounded-full`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Percentage Pill */}
                  <div className="text-right shrink-0 pl-1">
                    <span className={`text-xs font-extrabold font-mono px-2 py-0.5 rounded border ${
                      isSelected 
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/40' 
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}>
                      {percent}%
                    </span>
                    <div className="text-[9px] text-slate-500 mt-0.5 font-mono">
                      {done}/{total}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: DETAIL INSPECTOR (lg:col-span-8) ================= */}
        <div className="lg:col-span-8 bg-slate-950/60 border border-slate-800/90 rounded-xl p-4 sm:p-5 space-y-4">
          
          {/* Header of Selected Element */}
          <div className={`p-4 rounded-xl border ${currentMeta.bgClass} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-slate-950/70 rounded border border-white/20 text-xs font-mono font-bold text-white">
                  {currentStat.code}
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-white">
                  {currentMeta.name}
                </h3>
                <span className="text-xs text-slate-300 opacity-90 hidden sm:inline">
                  • {currentDetail.title}
                </span>
              </div>
              <p className="text-xs italic text-slate-200/90 pl-0.5">
                "{currentDetail.quote || currentMeta.quote}"
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0 bg-slate-950/60 sm:bg-transparent p-2 sm:p-0 rounded-lg border border-white/10 sm:border-none">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Capaian Elemen</span>
              <span className="text-base font-black font-mono text-amber-400">
                {currentStat.percent}%
              </span>
              <span className="text-[10px] text-slate-400">
                {currentStat.done} dari {currentStat.total} tugas selesai
              </span>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setActiveTab('actions')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'actions'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span>8 Aksi Mandala & Frekuensi</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 text-current font-mono">
                  {currentDetail.actions ? currentDetail.actions.length : 8}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('dates')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'dates'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Jadwal Tanggal (Sep 2026)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 text-current font-mono">
                  {currentDetail.dates ? currentDetail.dates.length : 0}
                </span>
              </button>

              {matchedRecords.length > 0 && (
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'tasks'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>Tugas Terdaftar</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 text-current font-mono">
                    {matchedRecords.length}
                  </span>
                </button>
              )}
            </div>

            <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
              {selectedElement} Inspector
            </span>
          </div>

          {/* TAB 1: 8 SUB-ACTIONS & FREQUENCIES */}
          {activeTab === 'actions' && (
            <div className="space-y-2">
              <div className="text-[11px] text-slate-400 flex items-center justify-between pb-1">
                <span>Daftar 8 target output & ritme eksekusi spesifik:</span>
                <span className="text-amber-400/90 text-[10px] font-medium">Formula 9x9 Takashi Harada</span>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-semibold text-slate-400">
                      <th className="p-2.5 w-12 text-center font-mono">#</th>
                      <th className="p-2.5">Tindakan Spesifik (Target Output)</th>
                      <th className="p-2.5 w-36 sm:w-44">Frekuensi Eksekusi</th>
                      <th className="p-2.5 w-28 text-right hidden sm:table-cell">Kategori</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {currentDetail.actions && currentDetail.actions.map((act) => (
                      <tr key={act.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-2.5 font-mono font-bold text-amber-400 text-center bg-slate-950/20">
                          {act.id}
                        </td>
                        <td className="p-2.5 font-medium text-slate-200">
                          {act.action}
                        </td>
                        <td className="p-2.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Clock className="w-3 h-3 text-amber-400" />
                            {act.frequency}
                          </span>
                        </td>
                        <td className="p-2.5 text-right hidden sm:table-cell">
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/60">
                            {act.type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: SCHEDULED DATES (SEPTEMBER 2026) */}
          {activeTab === 'dates' && (
            <div className="space-y-3">
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Jadwal tanggal pelaksanaan di kalender September 2026:</span>
                <span className="text-slate-500 text-[10px]">Total {currentDetail.dates ? currentDetail.dates.length : 0} tanggal terjadwal</span>
              </div>

              {currentDetail.dates && currentDetail.dates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
                  {currentDetail.dates.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                        item.highlight
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className={`px-2 py-1 rounded-lg text-xs font-bold font-mono shrink-0 ${
                        item.highlight
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {item.date}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-relaxed font-medium">
                          {item.task}
                        </p>
                        {item.highlight && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-400 mt-1 uppercase tracking-wider">
                            <Sparkles className="w-2.5 h-2.5" /> Prioritas Utama
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-900/30 rounded-xl border border-slate-800 text-slate-500 text-xs">
                  Belum ada tanggal terjadwal khusus untuk elemen ini di bulan September.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LIVE REGISTERED TASKS IN APP */}
          {activeTab === 'tasks' && (
            <div className="space-y-2">
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Tugas real-time dari database aplikasi untuk elemen {selectedElement}:</span>
                <span className="text-slate-500 text-[10px]">{matchedRecords.length} Tugas terdaftar</span>
              </div>

              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                {matchedRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${rec.status === 'Done' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span className="font-medium text-slate-200 truncate">
                        {rec.task}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                        {rec.dueDate || rec.startTime || 'Sep 2026'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        rec.status === 'Done' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {rec.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Bottom Summary Note */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>
            Formula Takashi Harada: Integrasi 8 pilar hidup & bisnis menuju Mandat 2030 (100.000 siswa, 1.000 sekolah, Rp 9 Miliar)
          </span>
        </div>
        <div className="italic text-slate-500 text-[11px]">
          Arahkan fokus harian pada akar mandat (E1) dan perbaikan sistem tanpa kompromi.
        </div>
      </div>

    </div>
  );
}
