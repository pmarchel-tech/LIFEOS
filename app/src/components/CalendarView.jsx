import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Filter,
  User,
  Clock,
  CheckCircle2,
  Tag,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Bell
} from 'lucide-react';
import { PRIORITIES, STATUSES, PROJECTS, LEADERS, getStatusConfig, canonicalStatus, DEFAULT_DUE_TIME, DEFAULT_REMINDER } from '../data/initialData';

export function CalendarView({
  records = [],
  projects = PROJECTS,
  leaders = LEADERS,
  onUpdateRecord,
  onAddRecord,
  onSelectRecord,
  onOpenRecord,
  // External filter props (controlled from LarkNavbar)
  priorityFilter: extPriorityFilter,
  setPriorityFilter: setExtPriorityFilter,
  projectFilter: extProjectFilter,
  setProjectFilter: setExtProjectFilter,
  leaderFilter: extLeaderFilter,
  setLeaderFilter: setExtLeaderFilter,
  statusFilter: extStatusFilter,
  setStatusFilter: setExtStatusFilter,
  activeFiltersCount: extActiveFiltersCount,
  onResetFilters: extOnResetFilters
}) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Current calendar viewing month and selected date
  const [selectedYear, setSelectedYear] = useState(() => today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState(() => todayStr);

  // Filters state (internal fallback if not passed from parent)
  const [localPriorityFilter, setLocalPriorityFilter] = useState('ALL');
  const [localProjectFilter, setLocalProjectFilter] = useState('ALL');
  const [localLeaderFilter, setLocalLeaderFilter] = useState('ALL');
  const [localStatusFilter, setLocalStatusFilter] = useState('ACTIVE');

  const priorityFilter = extPriorityFilter !== undefined ? extPriorityFilter : localPriorityFilter;
  const setPriorityFilter = setExtPriorityFilter || setLocalPriorityFilter;

  const projectFilter = extProjectFilter !== undefined ? extProjectFilter : localProjectFilter;
  const setProjectFilter = setExtProjectFilter || setLocalProjectFilter;

  const leaderFilter = extLeaderFilter !== undefined ? extLeaderFilter : localLeaderFilter;
  const setLeaderFilter = setExtLeaderFilter || setLocalLeaderFilter;

  const statusFilter = extStatusFilter !== undefined ? extStatusFilter : localStatusFilter;
  const setStatusFilter = setExtStatusFilter || setLocalStatusFilter;

  // Month names in Indonesian
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Month navigation
  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const jumpToToday = () => {
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
    setSelectedDate(todayStr);
  };

  // Calendar matrix math
  const daysInCurrentMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 = Sunday

  // Helper date string for current month: YYYY-MM-DD
  const formatDateStr = (day) => {
    const m = String(selectedMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${selectedYear}-${m}-${d}`;
  };

  // 1. Filter records based on active dropdown filters: Priority, Project, Leader, Status
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (priorityFilter !== 'ALL' && r.priority !== priorityFilter) return false;
      if (projectFilter !== 'ALL' && r.project !== projectFilter) return false;
      if (leaderFilter !== 'ALL' && r.taskLeader !== leaderFilter) return false;
      if (statusFilter === 'ACTIVE') {
        const cs = canonicalStatus(r.status);
        if (cs === 'Done' || cs === 'Cancel' || cs === 'Pending' || cs === 'Archived') return false;
      } else if (statusFilter !== 'ALL') {
        if (canonicalStatus(r.status) !== statusFilter) return false;
      } else {
        if (canonicalStatus(r.status) === 'Archived') return false;
      }
      return true;
    });
  }, [records, priorityFilter, projectFilter, leaderFilter, statusFilter]);

  // 2. Map of records by TASK DUE DATE: { 'YYYY-MM-DD': [record, record, ...] }
  const recordsByDueDate = useMemo(() => {
    const map = {};
    filteredRecords.forEach(r => {
      // Focus specifically on Task Due Date
      const dateKey = r.dueDate || r.startTime;
      if (dateKey) {
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(r);
      }
    });
    return map;
  }, [filteredRecords]);

  // Tasks for the active clicked date, sorted by due time nearest to longest
  const tasksForSelectedDate = useMemo(() => {
    const list = recordsByDueDate[selectedDate] || [];
    return [...list].sort((a, b) => {
      const timeA = a.dueTime || DEFAULT_DUE_TIME;
      const timeB = b.dueTime || DEFAULT_DUE_TIME;
      return timeA.localeCompare(timeB);
    });
  }, [recordsByDueDate, selectedDate]);

  // Monthly stats
  const currentMonthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const monthTotalTasks = filteredRecords.filter(r => (r.dueDate || r.startTime || '').startsWith(currentMonthPrefix)).length;
  const monthDoneTasks = filteredRecords.filter(r => (r.dueDate || r.startTime || '').startsWith(currentMonthPrefix) && canonicalStatus(r.status) === 'Done').length;

  // Active filters count
  const activeFiltersCount = extActiveFiltersCount !== undefined
    ? extActiveFiltersCount
    : [
        priorityFilter !== 'ALL',
        projectFilter !== 'ALL',
        leaderFilter !== 'ALL',
        statusFilter !== 'ALL'
      ].filter(Boolean).length;

  const handleResetFilters = () => {
    if (extOnResetFilters) {
      extOnResetFilters();
    } else {
      setPriorityFilter('ALL');
      setProjectFilter('ALL');
      setLeaderFilter('ALL');
      setStatusFilter('ALL');
    }
  };

  // Safe handler to open Side Peek
  const handleOpenTask = (rec) => {
    if (onOpenRecord) {
      onOpenRecord(rec);
    } else if (onSelectRecord) {
      onSelectRecord(rec);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* 1. Header Bar: Month Navigation + Filter Controls */}
      <div className="apple-glass border border-neutral-200/80 dark:border-white/10 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col gap-4">
        
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Month Navigation */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-apple-blue/10 dark:bg-apple-blue/20 text-apple-blue border border-apple-blue/20 shadow-xs">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  {monthNames[selectedMonth]} {selectedYear}
                </h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-apple-blue/15 text-apple-blue dark:text-sky-300 font-semibold border border-apple-blue/30">
                  Due Date Focus
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
                {monthDoneTasks} dari {monthTotalTasks} tugas bulan ini tuntas
              </p>
            </div>
          </div>

          {/* Month Arrows & Today Jump */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 transition cursor-pointer"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={jumpToToday}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/5 transition text-neutral-800 dark:text-neutral-200 cursor-pointer"
            >
              Hari Ini
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 transition cursor-pointer"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Calendar Layout: Grid (3 Cols) + Date Inspector Sidebar (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        
        {/* Left 3 Cols: Monthly Calendar Grid */}
        <div className="lg:col-span-3 apple-glass border border-neutral-200/80 dark:border-white/10 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col min-h-[580px]">
          
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1.5 text-center font-bold text-xs text-slate-500 dark:text-slate-400 pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-rose-500">Min</span>
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span className="text-blue-500">Sab</span>
          </div>

          {/* Month Day Slots */}
          <div className="grid grid-cols-7 gap-1.5 pt-2 flex-1 auto-rows-fr">
            {/* Empty slots before 1st of month */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="min-h-[95px] p-1.5 rounded-xl bg-slate-50/40 dark:bg-slate-950/20 border border-dashed border-slate-100 dark:border-slate-800/40 select-none opacity-40"
              />
            ))}

            {/* Current Month Days */}
            {Array.from({ length: daysInCurrentMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = formatDateStr(dayNum);
              const dayRecords = recordsByDueDate[dateStr] || [];
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`min-h-[100px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 shadow-md ring-2 ring-blue-500/20'
                      : isToday
                      ? 'border-amber-400 bg-amber-50/30 dark:bg-amber-950/20'
                      : 'border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                  }`}
                >
                  {/* Top Bar inside cell: Date number + Badge count */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition ${
                        isToday
                          ? 'bg-amber-500 text-white font-extrabold shadow-xs'
                          : isSelected
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-700 dark:text-slate-300 group-hover:text-blue-600'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {dayRecords.length > 0 && (
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {dayRecords.length}
                      </span>
                    )}
                  </div>

                  {/* Task Pills on Due Date */}
                  <div className="space-y-1 flex-1 overflow-hidden">
                    {dayRecords.slice(0, 3).map((rec) => {
                      const prio = PRIORITIES[rec.priority] || PRIORITIES.P1;
                      const stat = getStatusConfig(rec.status);
                      const isDone = canonicalStatus(rec.status) === 'Done';

                      return (
                        <div
                          key={rec.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(dateStr);
                            handleOpenTask(rec);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center gap-1 border transition hover:scale-[1.02] shadow-2xs ${
                            isDone
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 line-through opacity-70'
                              : 'bg-slate-50 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                          }`}
                          title={`${rec.task} (${rec.project || 'No Project'})`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            prio.label === 'P0' ? 'bg-rose-500' :
                            prio.label === 'P1' ? 'bg-amber-500' :
                            prio.label === 'P2' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`} />
                          <span className="truncate">{rec.task}</span>
                        </div>
                      );
                    })}

                    {dayRecords.length > 3 && (
                      <div className="text-[9px] font-bold text-blue-600 dark:text-blue-400 pl-1">
                        +{dayRecords.length - 3} lagi
                      </div>
                    )}
                  </div>

                  {/* Quick Add icon on hover */}
                  <div className="pt-1 opacity-0 group-hover:opacity-100 transition flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(dateStr);
                        if (onAddRecord) {
                          onAddRecord({
                            dueDate: dateStr,
                            startTime: dateStr,
                            priority: priorityFilter !== 'ALL' ? priorityFilter : 'P1',
                            project: projectFilter !== 'ALL' ? projectFilter : (projects[0]?.name || 'BETTER FUTURE'),
                            taskLeader: leaderFilter !== 'ALL' ? leaderFilter : (leaders[0]?.name || ''),
                            status: statusFilter !== 'ALL' ? statusFilter : 'Not yet started'
                          });
                        }
                      }}
                      className="p-1 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 hover:bg-blue-200 transition cursor-pointer"
                      title="Tambah task dengan due date di tanggal ini"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

        </div>

        {/* Right 1 Col: Selected Date Task Inspector */}
        <div className="apple-glass border border-neutral-200/80 dark:border-white/10 rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col max-h-[720px] lg:sticky lg:top-20">
          
          {/* Header Inspector */}
          <div className="border-b border-neutral-100 dark:border-white/5 pb-3 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Daftar Due Date
                </span>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <span>{selectedDate}</span>
                  {selectedDate === todayStr && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">
                      Hari Ini
                    </span>
                  )}
                </h3>
              </div>

              <button
                onClick={() => {
                  if (onAddRecord) {
                    onAddRecord({
                      dueDate: selectedDate,
                      startTime: selectedDate,
                      dueTime: DEFAULT_DUE_TIME,
                      reminder: DEFAULT_REMINDER,
                      priority: priorityFilter !== 'ALL' ? priorityFilter : 'P1',
                      project: projectFilter !== 'ALL' ? projectFilter : (projects[0]?.name || 'BETTER FUTURE'),
                      taskLeader: leaderFilter !== 'ALL' ? leaderFilter : (leaders[0]?.name || ''),
                      status: statusFilter !== 'ALL' ? statusFilter : 'Not yet started'
                    });
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-apple-blue hover:bg-apple-blueHover text-white text-xs font-semibold shadow-xs transition cursor-pointer shrink-0 active:scale-95"
                title="Tambah task di tanggal ini"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>
            
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
              Klik task untuk membuka <strong>Side Peek Notion</strong>.
            </p>
          </div>

          {/* Subheader Counter */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 pt-3 pb-1 shrink-0">
            <span>TUGAS JATUH TEMPO ({tasksForSelectedDate.length})</span>
          </div>

          {/* Tasks List on this Date (Scrollable with max height) */}
          <div className="space-y-2.5 pr-1.5 overflow-y-auto flex-1 custom-scrollbar">

            {tasksForSelectedDate.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="font-semibold">Tidak ada task yang jatuh tempo</p>
                <p className="text-[11px] text-slate-400 mt-0.5">pada {selectedDate} dengan filter saat ini.</p>
              </div>
            ) : (
              tasksForSelectedDate.map((rec) => {
                const prio = PRIORITIES[rec.priority] || PRIORITIES.P1;
                const stat = getStatusConfig(rec.status);
                const isDone = canonicalStatus(rec.status) === 'Done';
                const proj = projects.find(p => p.name === rec.project) || { color: 'bg-slate-100 text-slate-700' };

                return (
                  <div
                    key={rec.id}
                    onClick={() => handleOpenTask(rec)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex flex-col gap-2 group hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 ${
                      isDone
                        ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-75'
                        : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {/* Top row: Priority, Due Time, Reminder & Open button */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${prio.color}`}>
                          {prio.label}
                        </span>
                        {rec.project && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border truncate max-w-[110px] ${proj.color}`}>
                            {rec.project}
                          </span>
                        )}
                        <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800">
                          {rec.dueTime || DEFAULT_DUE_TIME}
                        </span>
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                          title={`Reminder: ${rec.reminder === 'D_DAY' || !rec.reminder ? 'D DAY (Hari H)' : rec.reminder?.replace(/_/g, ' ')}`}
                        >
                          <Bell className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                          <span>
                            {rec.reminder === '1_DAY_BEFORE' ? '-1D' :
                             rec.reminder === '2_DAYS_BEFORE' ? '-2D' :
                             rec.reminder === '3_DAYS_BEFORE' ? '-3D' :
                             rec.reminder === '7_DAYS_BEFORE' ? '-7D' : 'H'}
                          </span>
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTask(rec);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                        title="Buka Side Peek"
                      >
                        <span>OPEN</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    {/* Task Title & Checkbox */}
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (onUpdateRecord) {
                            onUpdateRecord(rec.id, { status: isDone ? 'Ongoing' : 'Done' });
                          }
                        }}
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                        title="Tandai selesai"
                      />
                      <span className={`text-xs font-semibold leading-snug ${isDone ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                        {rec.task}
                      </span>
                    </div>

                    {/* Notes / Latest Update if any */}
                    {rec.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-5 line-clamp-2 leading-relaxed">
                        {rec.notes}
                      </p>
                    )}

                    {/* Bottom row: Leader & Status */}
                    <div className="flex items-center justify-between pt-1 text-[10px] pl-5 border-t border-slate-100 dark:border-slate-700/60 mt-0.5">
                      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{rec.taskLeader || 'No Leader'}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full font-bold border ${stat.color}`}>
                        {stat.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

    </div>
  );
}