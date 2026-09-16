import React, { useState, useMemo } from 'react';
import {
  Bell,
  BellOff,
  Clock,
  AlertCircle,
  Calendar,
  CheckCheck,
  X,
  User,
  ExternalLink,
  ChevronRight,
  Flame,
  ArrowUpDown
} from 'lucide-react';
import { canonicalStatus, REMINDER_OPTIONS, PRIORITIES } from '../data/initialData';

const getPriorityRank = (p) => {
  if (!p) return 4;
  const upper = String(p).toUpperCase().trim();
  if (upper === 'P0') return 0;
  if (upper === 'P1') return 1;
  if (upper === 'P2') return 2;
  if (upper === 'P3') return 3;
  return 4;
};

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateOnly = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length < 3) return null;
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
};

/**
 * Pure function to compute active notifications and total count.
 * Used by both NotificationDrawer and LarkNavbar to ensure 100% count consistency.
 */
export function calculateNotificationItems(records = [], dismissedIds = [], sortOption = 'date_desc') {
  const todayStr = getTodayStr();
  const dismissedSet = new Set(dismissedIds);
  const reminders = [];
  const dueToday = [];
  const overdue = [];

  records.forEach(rec => {
    const status = canonicalStatus(rec.status);
    if (status === 'Done' || status === 'Archived' || status === 'Cancel') return;

    const taskDate = rec.dueDate || rec.startTime;
    if (!taskDate) return;

    // 1. Check Reminder
    if (rec.reminder && rec.reminder !== 'NONE') {
      const opt = REMINDER_OPTIONS.find(o => o.id === rec.reminder);
      const daysBefore = opt && typeof opt.daysBefore === 'number' ? opt.daysBefore : 0;
      const targetDueObj = parseDateOnly(taskDate);
      if (targetDueObj) {
        const reminderDateObj = new Date(targetDueObj);
        reminderDateObj.setDate(reminderDateObj.getDate() - daysBefore);
        const reminderDateStr = `${reminderDateObj.getFullYear()}-${String(reminderDateObj.getMonth() + 1).padStart(2, '0')}-${String(reminderDateObj.getDate()).padStart(2, '0')}`;
        
        // If reminder is scheduled for today or already passed today, and not dismissed
        const notifKey = `rem-${rec.id}`;
        if (reminderDateStr <= todayStr && !dismissedSet.has(notifKey)) {
          reminders.push({
            key: notifKey,
            type: 'reminder',
            record: rec,
            time: rec.reminderTime || rec.dueTime || '09:00',
            label: opt ? opt.label : 'Reminder'
          });
        }
      }
    }

    // 2. Check Due Today
    const dueKey = `due-${rec.id}`;
    if (taskDate === todayStr && !dismissedSet.has(dueKey)) {
      dueToday.push({
        key: dueKey,
        type: 'due_today',
        record: rec,
        time: rec.dueTime || '09:00'
      });
    } else if (taskDate < todayStr && !dismissedSet.has(dueKey)) {
      // 3. Check Overdue
      overdue.push({
        key: dueKey,
        type: 'overdue',
        record: rec,
        time: rec.dueTime || '09:00',
        dueDate: taskDate
      });
    }
  });

  // Sorting by Date and Priority
  const sorter = (a, b) => {
    const dateA = a.dueDate || a.record?.dueDate || a.record?.startTime || '';
    const dateB = b.dueDate || b.record?.dueDate || b.record?.startTime || '';
    const prioA = getPriorityRank(a.record?.priority);
    const prioB = getPriorityRank(b.record?.priority);
    const timeA = a.time || a.record?.dueTime || '09:00';
    const timeB = b.time || b.record?.dueTime || '09:00';

    if (sortOption === 'priority_first') {
      if (prioA !== prioB) return prioA - prioB;
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      if (timeA !== timeB) return timeA.localeCompare(timeB);
      return (a.record?.task || '').localeCompare(b.record?.task || '');
    }

    if (sortOption === 'date_asc') {
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      if (prioA !== prioB) return prioA - prioB;
      if (timeA !== timeB) return timeA.localeCompare(timeB);
      return (a.record?.task || '').localeCompare(b.record?.task || '');
    }

    // Default: 'date_desc' (Most recent date first, then highest priority P0 -> P3)
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    if (prioA !== prioB) return prioA - prioB;
    if (timeA !== timeB) return timeA.localeCompare(timeB);
    return (a.record?.task || '').localeCompare(b.record?.task || '');
  };

  reminders.sort(sorter);
  dueToday.sort(sorter);
  overdue.sort(sorter);

  return {
    reminderItems: reminders,
    dueTodayItems: dueToday,
    overdueItems: overdue,
    totalUnread: reminders.length + dueToday.length + overdue.length
  };
}

/**
 * NotificationDrawer (Apple Notification Center Popover)
 * Lists:
 * 1. Active Reminders (tasks with reminder enabled today)
 * 2. Due Today & Overdue tasks
 * Supports:
 * - Dismiss / delete single notification (X)
 * - "Read All" / Mark All Dismissed
 * - Direct click to open task in Side Peek
 */
export function NotificationDrawer({
  isOpen,
  onClose,
  records = [],
  dismissedIds = [],
  onDismissNotification,
  onDismissAllNotifications,
  onSelectRecord
}) {
  const [sortOption, setSortOption] = useState('date_desc');

  // Compute Active Notifications from Records using unified function
  const { reminderItems, dueTodayItems, overdueItems, totalUnread } = useMemo(() => {
    return calculateNotificationItems(records, dismissedIds, sortOption);
  }, [records, dismissedIds, sortOption]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[80vh] bg-white/95 dark:bg-[#1E1E20]/95 backdrop-blur-2xl border border-neutral-200/90 dark:border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-neutral-800 dark:text-neutral-100 font-sans"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200/60 dark:border-white/10 flex items-center justify-between bg-neutral-50/50 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold tracking-tight">Pusat Notifikasi</span>
          {totalUnread > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-white shadow-2xs">
              {totalUnread}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {totalUnread > 0 && (
            <button
              type="button"
              onClick={onDismissAllNotifications}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-apple-blue dark:text-sky-400 hover:bg-apple-blue/10 dark:hover:bg-sky-400/10 transition cursor-pointer active:scale-95"
              title="Tandai semua sudah dibaca (Hapus Semua)"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Read All</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sort Filter Bar */}
      {totalUnread > 0 && (
        <div className="px-3.5 py-1.5 bg-neutral-100/80 dark:bg-white/[0.04] border-b border-neutral-200/60 dark:border-white/10 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
            <ArrowUpDown className="w-3 h-3 text-neutral-400 shrink-0" />
            <span className="font-medium">Sort:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="bg-transparent font-semibold text-neutral-800 dark:text-neutral-200 hover:text-apple-blue dark:hover:text-sky-400 cursor-pointer focus:outline-none transition text-[11px]"
              title="Pilih urutan notifikasi"
            >
              <option value="date_desc" className="bg-white dark:bg-[#1E1E20] text-neutral-800 dark:text-neutral-100">
                Tanggal (Terbaru) & Prioritas
              </option>
              <option value="date_asc" className="bg-white dark:bg-[#1E1E20] text-neutral-800 dark:text-neutral-100">
                Tanggal (Terlama) & Prioritas
              </option>
              <option value="priority_first" className="bg-white dark:bg-[#1E1E20] text-neutral-800 dark:text-neutral-100">
                Prioritas Utama (P0 → P3)
              </option>
            </select>
          </div>
          <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
            {totalUnread} notifikasi
          </span>
        </div>
      )}

      {/* Body: Notifications List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-white/5 p-2 space-y-1">
        {totalUnread === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 dark:bg-white/5 flex items-center justify-center text-neutral-400 mb-3">
              <CheckCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Tidak Ada Notifikasi Baru
            </p>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 max-w-[220px] mx-auto">
              Semua reminder dan tugas jatuh tempo hari ini sudah dibaca atau diselesaikan.
            </p>
          </div>
        ) : (
          <>
            {/* 1. SECTION: Active Reminders */}
            {reminderItems.length > 0 && (
              <div className="pb-2">
                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Bell className="w-3 h-3" />
                    Reminder Aktif Hari Ini ({reminderItems.length})
                  </span>
                </div>
                <div className="space-y-1 mt-1">
                  {reminderItems.map(item => (
                    <div
                      key={item.key}
                      onClick={() => {
                        onSelectRecord?.(item.record);
                        onClose();
                      }}
                      className="group relative flex items-start justify-between gap-2.5 p-2.5 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 transition cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono">
                            ⏰ {item.time}
                          </span>
                          <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 truncate">
                            {item.record.project || item.record.businessLine}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition truncate">
                          {item.record.task || 'Untitled Task'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-neutral-400" />
                            {item.record.taskLeader || 'Pierre'}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-rose-500">
                            Due: {item.record.dueDate}
                          </span>
                          <span>•</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${PRIORITIES[item.record.priority]?.color || 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-white/10 dark:text-neutral-300 dark:border-white/10'}`}>
                            {item.record.priority || 'P1'}
                          </span>
                        </div>
                      </div>

                      {/* Dismiss button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismissNotification(item.key);
                        }}
                        className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition shrink-0 cursor-pointer"
                        title="Hapus notifikasi ini"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. SECTION: Due Today Tasks */}
            {dueTodayItems.length > 0 && (
              <div className="py-2">
                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-sky-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Jatuh Tempo Hari Ini ({dueTodayItems.length})
                  </span>
                </div>
                <div className="space-y-1 mt-1">
                  {dueTodayItems.map(item => (
                    <div
                      key={item.key}
                      onClick={() => {
                        onSelectRecord?.(item.record);
                        onClose();
                      }}
                      className="group relative flex items-start justify-between gap-2.5 p-2.5 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 transition cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-500/20 text-blue-700 dark:text-sky-300 font-mono">
                            📅 HARI INI @ {item.time}
                          </span>
                          <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 truncate">
                            {item.record.project || item.record.businessLine}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-sky-400 transition truncate">
                          {item.record.task || 'Untitled Task'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-neutral-400" />
                            {item.record.taskLeader || 'Pierre'}
                          </span>
                          <span>•</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${PRIORITIES[item.record.priority]?.color || 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-white/10 dark:text-neutral-300 dark:border-white/10'}`}>
                            {item.record.priority || 'P1'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismissNotification(item.key);
                        }}
                        className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition shrink-0 cursor-pointer"
                        title="Hapus notifikasi ini"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. SECTION: Overdue Tasks (Past Due Date) */}
            {overdueItems.length > 0 && (
              <div className="py-2">
                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    Terlambat / Overdue ({overdueItems.length})
                  </span>
                </div>
                <div className="space-y-1 mt-1">
                  {overdueItems.map(item => (
                    <div
                      key={item.key}
                      onClick={() => {
                        onSelectRecord?.(item.record);
                        onClose();
                      }}
                      className="group relative flex items-start justify-between gap-2.5 p-2.5 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-500/20 text-rose-700 dark:text-rose-300 font-mono">
                            ⚠️ Overdue: {item.dueDate}
                          </span>
                          <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 truncate">
                            {item.record.project || item.record.businessLine}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition truncate">
                          {item.record.task || 'Untitled Task'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-neutral-400" />
                            {item.record.taskLeader || 'Pierre'}
                          </span>
                          <span>•</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${PRIORITIES[item.record.priority]?.color || 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-white/10 dark:text-neutral-300 dark:border-white/10'}`}>
                            {item.record.priority || 'P1'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismissNotification(item.key);
                        }}
                        className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition shrink-0 cursor-pointer"
                        title="Hapus notifikasi ini"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Quick Action */}
      <div className="px-4 py-2 border-t border-neutral-200/60 dark:border-white/10 bg-neutral-50/50 dark:bg-white/5 flex items-center justify-between text-[11px] text-neutral-400">
        <span>Klik item untuk buka detail task</span>
        <span className="font-mono">Life OS v2.0</span>
      </div>
    </div>
  );
}
