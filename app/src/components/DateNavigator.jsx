import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, CheckCircle2 } from 'lucide-react';

export function DateNavigator({ dates, selectedDate, onSelectDate, tasksForDate }) {
  const currentIndex = dates.indexOf(selectedDate);
  const prevDate = currentIndex > 0 ? dates[currentIndex - 1] : null;
  const nextDate = currentIndex < dates.length - 1 ? dates[currentIndex + 1] : null;

  const totalForToday = tasksForDate.length;
  const doneForToday = tasksForDate.filter(t => t.completed).length;
  const percentToday = totalForToday > 0 ? Math.round((doneForToday / totalForToday) * 100) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      
      {/* Prev / Current / Next Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => prevDate && onSelectDate(prevDate)}
          disabled={!prevDate}
          className={`p-2 rounded-xl border border-slate-800 text-slate-300 transition ${
            prevDate ? 'hover:bg-slate-800 hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed'
          }`}
          title="Hari Sebelumnya"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Date Selector Dropdown & Display */}
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2">
          <Calendar className="w-4 h-4 text-amber-400" />
          <select
            value={selectedDate}
            onChange={(e) => onSelectDate(e.target.value)}
            className="bg-transparent text-white font-bold text-sm focus:outline-none cursor-pointer"
          >
            {dates.map((d) => (
              <option key={d} value={d} className="bg-slate-900 text-white">
                Tanggal: {d} 2026
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => nextDate && onSelectDate(nextDate)}
          disabled={!nextDate}
          className={`p-2 rounded-xl border border-slate-800 text-slate-300 transition ${
            nextDate ? 'hover:bg-slate-800 hover:text-white cursor-pointer' : 'opacity-40 cursor-not-allowed'
          }`}
          title="Hari Berikutnya"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Quick jump to today */}
        {selectedDate !== "08-Sep" && (
          <button
            onClick={() => onSelectDate("08-Sep")}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition"
          >
            Hari Ini (08-Sep)
          </button>
        )}
      </div>

      {/* Progress pill for selected date */}
      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
        <div className="text-right">
          <div className="text-xs text-slate-400">Penyelesaian Hari Ini</div>
          <div className="text-sm font-bold text-white flex items-center justify-end gap-1.5">
            <span>{doneForToday} dari {totalForToday} Selesai</span>
            <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
              percentToday === 100 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-amber-400'
            }`}>
              {percentToday}%
            </span>
          </div>
        </div>

        <div className="w-20 sm:w-28 bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700/50">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              percentToday === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-yellow-400'
            }`}
            style={{ width: `${percentToday}%` }}
          />
        </div>
      </div>

    </div>
  );
}
