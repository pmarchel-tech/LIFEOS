import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  User,
  Layers,
  ArrowUpRight,
  Flame,
  Calendar,
  Filter,
  Check,
  ChevronRight,
  Sparkles,
  Award,
  AlertCircle
} from 'lucide-react';
import { canonicalStatus, PRIORITIES, STATUSES, BUSINESS_LINES } from '../data/initialData';

// Helper: parse date YYYY-MM-DD safely
const parseDateOnly = (str) => {
  if (!str) return null;
  const parts = str.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const formatYMD = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function KpiDashboardDrawer({
  isOpen,
  onClose,
  records = [],
  onSelectRecord
}) {
  const [timeframe, setTimeframe] = useState('week'); // 'week' | 'all'
  const [selectedLeader, setSelectedLeader] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = formatYMD(today);

  // Week bounds (Monday to Sunday)
  const currentDay = today.getDay(); // 0 = Sun, 1 = Mon
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() + diffToMonday);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const startOfWeekStr = formatYMD(startOfWeek);
  const endOfWeekStr = formatYMD(endOfWeek);

  // Prior week bounds for trend comparison
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfWeek.getDate() - 7);
  const endOfLastWeek = new Date(startOfWeek);
  endOfLastWeek.setDate(startOfWeek.getDate() - 1);
  const startOfLastWeekStr = formatYMD(startOfLastWeek);
  const endOfLastWeekStr = formatYMD(endOfLastWeek);

  // KPI Analytics Engine
  const analytics = useMemo(() => {
    let dataset = records.filter(r => {
      const cStatus = canonicalStatus(r.status);
      if (cStatus === 'Archived') return false; // exclude archived
      if (selectedLeader !== 'ALL' && r.taskLeader !== selectedLeader) return false;
      if (selectedCategory !== 'ALL' && r.businessLine !== selectedCategory) return false;
      return true;
    });

    let totalTasks = dataset.length;
    let doneTasks = 0;
    let doneThisWeek = 0;
    let doneLastWeek = 0;
    let activeTasks = 0;
    let pendingTasks = 0;
    let cancelTasks = 0;
    let overdueTasks = 0;

    // Lifespan & Ageing
    let totalLifespanDays = 0;
    let completedWithDatesCount = 0;
    const staleTasks = []; // Active tasks older than 7 days

    // Team Leaderboard Map
    const leaderMap = new Map();
    // Category Breakdown Map
    const categoryMap = new Map();

    dataset.forEach(rec => {
      const cStatus = canonicalStatus(rec.status);
      const isDone = cStatus === 'Done';
      const isCancel = cStatus === 'Cancel';
      const isPending = cStatus === 'Pending';
      const isActive = !isDone && !isCancel && !isPending;

      const dueDateStr = rec.dueDate || rec.startTime || '';
      const startTimeStr = rec.startTime || rec.dueDate || todayStr;
      const startDate = parseDateOnly(startTimeStr) || today;
      const dueDate = parseDateOnly(dueDateStr);

      const leader = rec.taskLeader || 'Unassigned';
      const category = rec.businessLine || 'General';

      // Leader stats init
      if (!leaderMap.has(leader)) {
        leaderMap.set(leader, {
          name: leader,
          total: 0,
          done: 0,
          doneThisWeek: 0,
          active: 0,
          overdue: 0,
          p0p1Done: 0
        });
      }
      const lStats = leaderMap.get(leader);
      lStats.total++;

      // Category stats init
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { name: category, total: 0, done: 0, active: 0 });
      }
      const catStats = categoryMap.get(category);
      catStats.total++;

      if (isDone) {
        doneTasks++;
        lStats.done++;
        catStats.done++;

        const isP0P1 = rec.priority === 'P0' || rec.priority === 'P1';
        if (isP0P1) lStats.p0p1Done++;

        // Check if finished in current week
        const finishDateStr = rec.updated_at ? formatYMD(new Date(rec.updated_at)) : dueDateStr;
        if (finishDateStr >= startOfWeekStr && finishDateStr <= endOfWeekStr) {
          doneThisWeek++;
          lStats.doneThisWeek++;
        } else if (finishDateStr >= startOfLastWeekStr && finishDateStr <= endOfLastWeekStr) {
          doneLastWeek++;
        }

        // Cycle time calculation (start to finish)
        const finishDate = parseDateOnly(finishDateStr) || today;
        const diffMs = finishDate.getTime() - startDate.getTime();
        const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        totalLifespanDays += diffDays;
        completedWithDatesCount++;
      } else if (isActive) {
        activeTasks++;
        lStats.active++;
        catStats.active++;

        // Check if Overdue
        if (dueDate && dueDate < today) {
          overdueTasks++;
          lStats.overdue++;
        }

        // Check Task Ageing (How long it has been live)
        const ageMs = today.getTime() - startDate.getTime();
        const ageDays = Math.max(0, Math.round(ageMs / (1000 * 60 * 60 * 24)));

        if (ageDays >= 7) {
          staleTasks.push({
            record: rec,
            ageDays,
            dueDateStr,
            leader,
            priority: rec.priority || 'P1'
          });
        }
      } else if (isPending) {
        pendingTasks++;
      } else if (isCancel) {
        cancelTasks++;
      }
    });

    // Average Cycle Time (days to completion)
    const avgCycleTimeDays = completedWithDatesCount > 0
      ? (totalLifespanDays / completedWithDatesCount).toFixed(1)
      : '0.0';

    // Sort Stale tasks (longest living task first)
    staleTasks.sort((a, b) => b.ageDays - a.ageDays);

    // Leaderboard sorted by Done This Week then Total Done
    const leadersList = Array.from(leaderMap.values()).sort((a, b) => {
      if (b.doneThisWeek !== a.doneThisWeek) return b.doneThisWeek - a.doneThisWeek;
      return b.done - a.done;
    });

    // Categories sorted by Total Tasks
    const categoriesList = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);

    // Completion percentage
    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const overdueRate = activeTasks > 0 ? Math.round((overdueTasks / activeTasks) * 100) : 0;

    // Week over Week Growth
    const wowDiff = doneThisWeek - doneLastWeek;

    return {
      totalTasks,
      doneTasks,
      doneThisWeek,
      doneLastWeek,
      wowDiff,
      activeTasks,
      pendingTasks,
      cancelTasks,
      overdueTasks,
      overdueRate,
      avgCycleTimeDays,
      completionRate,
      staleTasks,
      leadersList,
      categoriesList
    };
  }, [records, selectedLeader, selectedCategory, startOfWeekStr, endOfWeekStr, startOfLastWeekStr, endOfLastWeekStr, today, todayStr]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-full mt-2 w-[92vw] sm:w-[580px] md:w-[680px] lg:w-[760px] max-h-[85vh] bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-3xl border border-neutral-200/90 dark:border-white/10 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.3)] z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-neutral-800 dark:text-neutral-100 font-sans"
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-neutral-200/70 dark:border-white/10 flex items-center justify-between bg-neutral-50/60 dark:bg-white/[0.03]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight">Executive Dashboard & KPI</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-500/20">
                Live Analytics
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
              Metrik kecepatan eksekusi, top performer, dan deteksi dini task macet
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="px-5 py-2 bg-neutral-100/70 dark:bg-white/[0.02] border-b border-neutral-200/60 dark:border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-neutral-400" />
            Minggu Ini:
          </span>
          <span className="font-mono text-[11px] font-bold text-neutral-700 dark:text-neutral-300 bg-white/80 dark:bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">
            {startOfWeekStr} s/d {endOfWeekStr}
          </span>
        </div>

        {/* Filter Leader & Category */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer focus:outline-none"
          >
            <option value="ALL">Semua Kategori</option>
            {BUSINESS_LINES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={selectedLeader}
            onChange={(e) => setSelectedLeader(e.target.value)}
            className="px-2 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer focus:outline-none"
          >
            <option value="ALL">Semua Leader</option>
            {analytics.leadersList.map(l => (
              <option key={l.name} value={l.name}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Body Scrollable */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* ROW 1: 4 Key Executive Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. Achieved This Week */}
          <div className="p-3.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/25 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Achieved
              </span>
              <span className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded-full ${
                analytics.wowDiff >= 0
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
              }`}
              >
                {analytics.wowDiff >= 0 ? `+${analytics.wowDiff}` : analytics.wowDiff} vs lw
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold text-emerald-950 dark:text-emerald-100 font-mono tracking-tight">
                {analytics.doneThisWeek} <span className="text-xs font-normal text-emerald-700/80 dark:text-emerald-300/80">task</span>
              </div>
              <p className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70 mt-0.5 font-medium">
                Total selesai: {analytics.doneTasks} ({analytics.completionRate}%)
              </p>
            </div>
          </div>

          {/* 2. Average Task Lifespan (Cycle Time) */}
          <div className="p-3.5 rounded-xl bg-sky-500/10 dark:bg-sky-500/10 border border-sky-500/25 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-sky-700 dark:text-sky-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Cycle Time
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold">
                Avg Lifespan
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold text-sky-950 dark:text-sky-100 font-mono tracking-tight">
                {analytics.avgCycleTimeDays} <span className="text-xs font-normal text-sky-700/80 dark:text-sky-300/80">Hari</span>
              </div>
              <p className="text-[10px] text-sky-700/70 dark:text-sky-400/70 mt-0.5 font-medium">
                Rata-rata dari buat s/d selesai
              </p>
            </div>
          </div>

          {/* 3. Task Ageing / Stale (>7 Hari belum selesai) */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/25 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> Task Ageing
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                &gt; 7 Hari
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold text-amber-950 dark:text-amber-100 font-mono tracking-tight">
                {analytics.staleTasks.length} <span className="text-xs font-normal text-amber-700/80 dark:text-amber-300/80">stale</span>
              </div>
              <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70 mt-0.5 font-medium">
                Aktif & belum disentuh/selesai
              </p>
            </div>
          </div>

          {/* 4. Overdue Risk Rate */}
          <div className="p-3.5 rounded-xl bg-rose-500/10 dark:bg-rose-500/10 border border-rose-500/25 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-rose-700 dark:text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Overdue
              </span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                analytics.overdueRate > 15 ? 'bg-rose-500 text-white' : 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
              }`}
              >
                {analytics.overdueRate}% rate
              </span>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold text-rose-950 dark:text-rose-100 font-mono tracking-tight">
                {analytics.overdueTasks} <span className="text-xs font-normal text-rose-700/80 dark:text-rose-300/80">task</span>
              </div>
              <p className="text-[10px] text-rose-700/70 dark:text-rose-400/70 mt-0.5 font-medium">
                Dari {analytics.activeTasks} task aktif
              </p>
            </div>
          </div>
        </div>

        {/* ROW 2: Two Column Grid: Top Performers (Leaderboard) & Stale Task Radar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Performers Leaderboard */}
          <div className="p-4 rounded-xl bg-neutral-50/80 dark:bg-white/[0.03] border border-neutral-200/70 dark:border-white/10 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Top Performer & Workload
                </h4>
              </div>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                Sorted: Task Done
              </span>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto max-h-[220px] pr-1">
              {analytics.leadersList.length === 0 ? (
                <div className="text-xs text-neutral-400 text-center py-6">Belum ada data leader</div>
              ) : (
                analytics.leadersList.map((leader, idx) => {
                  const completion = leader.total > 0 ? Math.round((leader.done / leader.total) * 100) : 0;
                  return (
                    <div
                      key={leader.name}
                      className="p-2.5 rounded-lg bg-white dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-white/5 flex items-center justify-between text-xs hover:border-indigo-400/40 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          idx === 0
                            ? 'bg-amber-500 text-white shadow-xs'
                            : idx === 1
                            ? 'bg-slate-300 dark:bg-slate-600 text-neutral-800 dark:text-white'
                            : idx === 2
                            ? 'bg-amber-700/60 text-white'
                            : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'
                        }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold truncate text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                            {leader.name}
                            {leader.p0p1Done > 0 && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 font-mono font-bold">
                                {leader.p0p1Done} High Impact
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-neutral-400 flex items-center gap-2 mt-0.5">
                            <span>Aktif: <strong className="text-neutral-700 dark:text-neutral-300 font-mono">{leader.active}</strong></span>
                            <span>•</span>
                            <span>Overdue: <strong className={leader.overdue > 0 ? 'text-rose-500 font-mono' : 'text-neutral-400 font-mono'}>{leader.overdue}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                          {leader.done} <span className="text-[10px] font-normal text-neutral-400">Done</span>
                        </div>
                        <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                          +{leader.doneThisWeek} mgg ini ({completion}%)
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Stale Tasks Alert Radar (Berapa lama live) */}
          <div className="p-4 rounded-xl bg-neutral-50/80 dark:bg-white/[0.03] border border-neutral-200/70 dark:border-white/10 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Stale Tasks Radar (Usia &gt; 7 Hari)
                </h4>
              </div>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                Butuh Follow Up
              </span>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto max-h-[220px] pr-1">
              {analytics.staleTasks.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Eksekusi Sehat & Cepat!
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    Tidak ada task aktif yang mangkrak lebih dari 7 hari.
                  </p>
                </div>
              ) : (
                analytics.staleTasks.map((item) => (
                  <div
                    key={item.record.id}
                    onClick={() => {
                      onSelectRecord?.(item.record);
                      onClose();
                    }}
                    className="p-2 rounded-lg bg-white dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-white/5 hover:border-amber-500/40 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="px-1.5 py-0.2 rounded font-mono font-extrabold text-[9px] bg-amber-500/20 text-amber-700 dark:text-amber-300">
                          {item.ageDays} HARI LIVE
                        </span>
                        <span className={`px-1 py-0.2 rounded text-[9px] font-bold border ${PRIORITIES[item.priority]?.color || 'bg-neutral-100 text-neutral-600'}`}>
                          {item.priority}
                        </span>
                        <span className="text-[10px] text-neutral-400 truncate">
                          {item.record.businessLine}
                        </span>
                      </div>
                      <h5 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                        {item.record.task || 'Untitled Task'}
                      </h5>
                      <div className="text-[10px] text-neutral-400 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <User className="w-2.5 h-2.5" />
                          {item.leader}
                        </span>
                        <span>•</span>
                        <span>Due: {item.dueDateStr || '-'}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ROW 3: Energy Distribution per Business Line */}
        <div className="p-4 rounded-xl bg-neutral-50/80 dark:bg-white/[0.03] border border-neutral-200/70 dark:border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-500" />
              <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                Alokasi Energi & Eksekusi per Unit Bisnis
              </h4>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono">
              Total {analytics.totalTasks} Task Tercatat
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {analytics.categoriesList.map(cat => {
              const pct = analytics.totalTasks > 0 ? Math.round((cat.total / analytics.totalTasks) * 100) : 0;
              const donePct = cat.total > 0 ? Math.round((cat.done / cat.total) * 100) : 0;
              return (
                <div
                  key={cat.name}
                  className="p-3 rounded-lg bg-white dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-white/5 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-neutral-800 dark:text-neutral-200 truncate">
                      {cat.name}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {pct}% beban
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden mb-2">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${donePct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span>{cat.done} / {cat.total} Selesai</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{donePct}% Done</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
