import React, { useState } from 'react';
import { Check, Flame, Plus, ShieldCheck, Sparkles, AlertCircle, ArrowUpRight } from 'lucide-react';
import { ELEMENTS } from '../data/initialData';

export function DailyTaskTracker({ tasksForDate, onToggleTask, onAddTask }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newText, setNewText] = useState('');
  const [newElem, setNewElem] = useState('E2');
  const [newCategory, setNewCategory] = useState('Micro-Kaizen');

  // Split tasks into Core Habits (Top Layer) and Tactical Missions (Bottom Layer)
  const coreHabits = tasksForDate.filter(t => t.isDailyCore);
  const tacticalTasks = tasksForDate.filter(t => !t.isDailyCore);

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newText.trim()) return;
    onAddTask({
      text: newText.trim(),
      element: newElem,
      category: newCategory,
      isDailyCore: false,
      exp: 10
    });
    setNewText('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">

      {/* 1. TOP LAYER: RUTINITAS HARIAN (HABIT PONDASI JIWA & SISTEM) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base tracking-wide flex items-center gap-2">
                ☀️ RUTINITAS HARIAN MUTLAK
                <span className="text-[11px] font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  Dijalankan Setiap Hari
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pilar penopang: E1 Spiritual, E2 Nadi Server, & E7 Aturan Jeda 3 Detik
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            +2 EXP / Task
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {coreHabits.map((task) => {
            const elemMeta = ELEMENTS[task.element] || ELEMENTS.E1;
            return (
              <div
                key={task.id}
                onClick={() => onToggleTask(task.id)}
                className={`group relative p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between gap-3 ${
                  task.completed
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${elemMeta.badgeBg}`}>
                      {task.element} • {task.category}
                    </span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center transition border ${
                      task.completed
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold'
                        : 'border-slate-600 group-hover:border-amber-400'
                    }`}
                  >
                    {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>

                <div className={`text-sm font-medium leading-snug ${task.completed ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                  {task.text}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-700/40">
                  <span className="truncate italic text-slate-500">{elemMeta.name}</span>
                  <span className={task.completed ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {task.completed ? '✓ Selesai' : `+${task.exp} EXP`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. BOTTOM LAYER: MISI TAKTIS BERGILIR (MINGGUAN / BULANAN) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base tracking-wide flex items-center gap-2">
                🎯 MISI TAKTIS HARI INI
                <span className="text-[11px] font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  Target Taktis Elemen 3 s/d 8
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Langkah nyata eksekusi operasional, marketing, sales, atau tim
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Tugas</span>
          </button>
        </div>

        {/* Quick Add Form Modal/Drawer inline */}
        {showAddForm && (
          <form onSubmit={handleCreateTask} className="mb-4 p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Tambah Target Kustom Hari Ini
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={newElem}
                onChange={(e) => setNewElem(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                {Object.values(ELEMENTS).map((el) => (
                  <option key={el.code} value={el.code}>
                    {el.code} - {el.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Kategori (mis: Kaizen, Pitching, Audit)"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 sm:col-span-2"
              />
            </div>
            <textarea
              placeholder="Deskripsi tindakan spesifik..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950"
              >
                Simpan Tugas (+10 EXP)
              </button>
            </div>
          </form>
        )}

        {/* Tactical Tasks List */}
        <div className="space-y-3">
          {tacticalTasks.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm italic border border-dashed border-slate-800 rounded-xl">
              Tidak ada misi taktis tambahan untuk hari ini. Fokus pada rutinitas inti atau istirahat kudus.
            </div>
          ) : (
            tacticalTasks.map((task) => {
              const elemMeta = ELEMENTS[task.element] || ELEMENTS.E3;
              return (
                <div
                  key={task.id}
                  onClick={() => onToggleTask(task.id)}
                  className={`group p-4 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-4 ${
                    task.completed
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition border flex-shrink-0 ${
                        task.completed
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold'
                          : 'border-slate-600 group-hover:border-amber-400'
                      }`}
                    >
                      {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${elemMeta.badgeBg}`}>
                          {task.element} • {elemMeta.name}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60">
                          {task.category}
                        </span>
                      </div>
                      <p className={`text-sm font-medium leading-relaxed ${task.completed ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                        {task.text}
                      </p>
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                      task.completed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-amber-400 border border-slate-700'
                    }`}>
                      {task.completed ? '✓ SELESAI' : `+${task.exp} EXP`}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
