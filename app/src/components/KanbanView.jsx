import React, { useState } from 'react';
import { PRIORITIES, STATUSES, LEADERS, PROJECTS, getStatusConfig, canonicalStatus, DEFAULT_DUE_TIME } from '../data/initialData';
import { Plus, Check, Clock, Calendar, ArrowRight, User, GripVertical, Bell } from 'lucide-react';

const parseDate = (str) => {
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

const getDaysDiff = (targetDate, refDate) => {
  const diffTime = targetDate.getTime() - refDate.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

const formatMonthDay = (dateObj) => {
  if (!dateObj) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[dateObj.getMonth()];
  const day = dateObj.getDate();
  return `${monthName} ${day}`;
};

export function KanbanView({
  records = [],
  viewType, // 'priority' | 'status' | 'leader' | 'due_date'
  projects = PROJECTS,
  leaders = LEADERS,
  onAddLeader,
  onUpdateRecord,
  onAddRecord,
  onSelectRecord,
  selectedRecordId,
  isSidePeekOpen
}) {
  const [draggedRecordId, setDraggedRecordId] = useState(null);
  const [dragOverColumnKey, setDragOverColumnKey] = useState(null);

  const currentLeaders = leaders || LEADERS;

  // Calculate Today & Week Bounds for due_date kanban
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Week bounds: Monday of current week to Sunday of current week
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diffToMonday);
  const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6);

  // Next week bounds: Monday of next week to Sunday of next week
  const startOfNextWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 7);
  const endOfNextWeek = new Date(startOfNextWeek.getFullYear(), startOfNextWeek.getMonth(), startOfNextWeek.getDate() + 6);

  let columns = [];

  if (viewType === 'priority') {
    columns = Object.keys(PRIORITIES).map(p => ({
      key: p,
      title: `Priority ${p}`,
      color: PRIORITIES[p].color,
      filter: (r) => r.priority === p
    }));
  } else if (viewType === 'status') {
    columns = Object.keys(STATUSES).map(s => ({
      key: s,
      title: STATUSES[s].label || s,
      color: STATUSES[s].color,
      filter: (r) => canonicalStatus(r.status) === s
    }));
  } else if (viewType === 'leader') {
    columns = currentLeaders.map(l => ({
      key: l.name,
      title: l.name,
      color: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100',
      avatar: l.avatar,
      avatarColor: l.color,
      filter: (r) => r.taskLeader === l.name
    }));
  } else if (viewType === 'due_date') {
    columns = [
      {
        key: 'overdue',
        title: 'Overdue',
        color: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
        badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        filter: (r) => {
          const d = parseDate(r.dueDate || r.startTime);
          if (!d) return false;
          return d < today;
        }
      },
      {
        key: 'today',
        title: 'Due Today',
        color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        filter: (r) => {
          const d = parseDate(r.dueDate || r.startTime);
          if (!d) return false;
          return d.getTime() === today.getTime();
        }
      },
      {
        key: 'this_week',
        title: 'Due This Week',
        color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800',
        badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        filter: (r) => {
          const d = parseDate(r.dueDate || r.startTime);
          if (!d) return false;
          return d > today && d <= endOfWeek;
        }
      },
      {
        key: 'next_week',
        title: 'Due Next Week',
        color: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
        badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        filter: (r) => {
          const d = parseDate(r.dueDate || r.startTime);
          if (!d) return false;
          return d >= startOfNextWeek && d <= endOfNextWeek;
        }
      },
      {
        key: 'future',
        title: 'Future',
        color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        filter: (r) => {
          const d = parseDate(r.dueDate || r.startTime);
          if (!d) return true; // Tasks with no due date also placed in Future
          return d > endOfNextWeek;
        }
      }
    ];
  }

  // Handle Drag Start
  const handleDragStart = (e, rec) => {
    setDraggedRecordId(rec.id);
    e.dataTransfer.setData('text/plain', rec.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedRecordId(null);
    setDragOverColumnKey(null);
  };

  // Handle Drag Over Column
  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnKey !== colKey) {
      setDragOverColumnKey(colKey);
    }
  };

  const handleDragLeave = (e, colKey) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (dragOverColumnKey === colKey) {
      setDragOverColumnKey(null);
    }
  };

  // Handle Drop on Column
  const handleDrop = (e, targetColKey) => {
    e.preventDefault();
    setDragOverColumnKey(null);
    const recId = e.dataTransfer.getData('text/plain') || draggedRecordId;
    if (!recId) return;

    const recordToMove = records.find(r => r.id === recId);
    if (!recordToMove) return;

    // Apply update based on current viewType
    if (viewType === 'priority') {
      if (recordToMove.priority !== targetColKey) {
        onUpdateRecord(recId, { priority: targetColKey });
      }
    } else if (viewType === 'status') {
      if (canonicalStatus(recordToMove.status) !== targetColKey) {
        onUpdateRecord(recId, { status: targetColKey });
      }
    } else if (viewType === 'leader') {
      if (recordToMove.taskLeader !== targetColKey) {
        onUpdateRecord(recId, { taskLeader: targetColKey });
      }
    } else if (viewType === 'due_date') {
      const formatYMD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (targetColKey === 'today') {
        onUpdateRecord(recId, { dueDate: todayStr });
      } else if (targetColKey === 'overdue') {
        const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
        onUpdateRecord(recId, { dueDate: formatYMD(yesterday) });
      } else if (targetColKey === 'this_week') {
        // If today is not Sunday, move to next upcoming day or end of week
        const targetDay = today < endOfWeek ? new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1) : endOfWeek;
        onUpdateRecord(recId, { dueDate: formatYMD(targetDay) });
      } else if (targetColKey === 'next_week') {
        // Move to Monday of next week
        onUpdateRecord(recId, { dueDate: formatYMD(startOfNextWeek) });
      } else if (targetColKey === 'future') {
        // Move to 2 days after next week (e.g. into the future)
        const futureDay = new Date(endOfNextWeek.getFullYear(), endOfNextWeek.getMonth(), endOfNextWeek.getDate() + 2);
        onUpdateRecord(recId, { dueDate: formatYMD(futureDay) });
      }
    }

    setDraggedRecordId(null);
  };

  return (
    <div className="space-y-3.5 select-none">
      {/* Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 select-none">
        {columns.map(col => {
          const colItems = records.filter(col.filter);
        const isColumnTargeted = dragOverColumnKey === col.key;

        return (
          <div
            key={col.key}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDragLeave={(e) => handleDragLeave(e, col.key)}
            onDrop={(e) => handleDrop(e, col.key)}
            className={`flex-shrink-0 w-80 bg-white/70 dark:bg-[#1c1c1e]/70 backdrop-blur-lg border rounded-2xl flex flex-col max-h-[82vh] transition-all duration-200 ${
              isColumnTargeted
                ? 'border-apple-blue bg-apple-blue/5 dark:bg-apple-blue/10 ring-2 ring-apple-blue/40 shadow-lg'
                : 'border-black/5 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
            }`}
          >
            {/* Column Header with Apple styling */}
            <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-white/40 dark:bg-white/[0.02] rounded-t-2xl">
              <div className="flex items-center gap-2">
                {col.avatar && (
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${col.avatarColor}`}>
                    {col.avatar}
                  </div>
                )}
                <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  {col.title}
                </h3>
                {viewType === 'leader' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddRecord({
                        taskLeader: col.key,
                        priority: 'P1',
                        project: 'UID',
                        businessLine: 'EMS',
                        status: 'Not yet started',
                        dueDate: todayStr,
                        startTime: todayStr
                      });
                    }}
                    className="p-1 rounded-lg text-neutral-500 hover:text-apple-blue hover:bg-apple-blue/10 dark:hover:bg-apple-blue/20 transition cursor-pointer active:scale-90"
                    title={`Tambah task untuk ${col.title} (Priority: P1, Project: UID, Business Line: EMS, Status: Not started, Due: Today)`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-neutral-600 dark:text-neutral-300">
                {colItems.length}
              </span>
            </div>

            {/* Cards List (Droppable area) */}
            <div className="p-3 flex-1 overflow-y-auto space-y-2.5 min-h-[140px] custom-scrollbar">
              {colItems.length === 0 && isColumnTargeted && (
                <div className="h-24 rounded-xl border-2 border-dashed border-apple-blue/50 bg-apple-blue/5 dark:bg-apple-blue/10 flex items-center justify-center text-xs font-medium text-apple-blue animate-pulse">
                  Lepaskan untuk memindahkan ke sini
                </div>
              )}

              {colItems.map(rec => {
                const prio = PRIORITIES[rec.priority] || PRIORITIES.P2;
                const stat = getStatusConfig(rec.status);
                const proj = projects.find(p => p.name === rec.project) || { color: 'bg-neutral-100' };
                const leader = currentLeaders.find(l => l.name === rec.taskLeader) || {
                  avatar: rec.taskLeader ? rec.taskLeader.slice(0, 2).toUpperCase() : '?',
                  color: 'bg-neutral-600 text-white'
                };
                const isBeingDragged = draggedRecordId === rec.id;

                return (
                  <div
                    key={rec.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, rec)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onSelectRecord(rec)}
                    className={`p-3.5 bg-white dark:bg-[#2c2c2e] rounded-xl border transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col gap-2.5 relative group ${
                      selectedRecordId === rec.id && isSidePeekOpen
                        ? 'border-apple-blue bg-apple-blue/[0.03] dark:bg-apple-blue/10 ring-2 ring-apple-blue/50 shadow-md -translate-y-0.5'
                        : isBeingDragged
                        ? 'opacity-30 scale-95 border-dashed border-apple-blue shadow-none'
                        : 'border-black/5 dark:border-white/5 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)] hover:border-black/10 dark:hover:border-white/15 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
                    }`}
                  >
                    {/* Header card: Priority & Project + Drag handle hint */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${prio.color}`}>
                          {prio.label}
                        </span>
                        {rec.element === 'E1' ? (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                            ⭐ E1
                          </span>
                        ) : rec.element ? (
                          <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-neutral-600 dark:text-neutral-300">
                            {rec.element}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border truncate max-w-[120px] ${proj.color}`}>
                          {rec.project}
                        </span>
                        <GripVertical className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 transition shrink-0" />
                      </div>
                    </div>

                    {/* Task Title */}
                    <h4 className={`text-xs font-semibold leading-snug tracking-tight ${rec.status === 'Done' ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                      {rec.task}
                    </h4>

                    {/* Latest Update / Notes */}
                    {rec.notes && (
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                        {rec.notes}
                      </p>
                    )}

                    {/* Due Date Indicator (Enhanced visibility with Apple semantic styling) */}
                    {(() => {
                      const d = parseDate(rec.dueDate || rec.startTime);
                      if (!d) return null;
                      const diff = getDaysDiff(d, today);
                      let label = '';
                      let badgeStyle = '';
                      let containerStyle = '';
                      let iconColor = '';
                      let dateTextColor = '';

                      if (diff < 0) {
                        label = `${diff} D`;
                        badgeStyle = 'bg-apple-red text-white font-bold shadow-xs';
                        containerStyle = 'bg-apple-red/10 border-apple-red/25';
                        iconColor = 'text-apple-red';
                        dateTextColor = 'text-apple-red font-bold';
                      } else if (diff === 0) {
                        label = 'Today';
                        badgeStyle = 'bg-apple-orange text-white font-bold shadow-xs animate-pulse';
                        containerStyle = 'bg-apple-orange/10 border-apple-orange/30';
                        iconColor = 'text-apple-orange';
                        dateTextColor = 'text-apple-orange font-bold';
                      } else if (diff <= 7) {
                        label = `+${diff} D`;
                        badgeStyle = 'bg-apple-blue text-white font-bold shadow-xs';
                        containerStyle = 'bg-apple-blue/10 border-apple-blue/20';
                        iconColor = 'text-apple-blue';
                        dateTextColor = 'text-apple-blue font-semibold';
                      } else {
                        label = `+${diff} D`;
                        badgeStyle = 'bg-black/10 dark:bg-white/10 text-neutral-700 dark:text-neutral-200 font-medium';
                        containerStyle = 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5';
                        iconColor = 'text-neutral-400 dark:text-neutral-500';
                        dateTextColor = 'text-neutral-700 dark:text-neutral-300 font-medium';
                      }

                      return (
                        <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all ${containerStyle}`}>
                          <div className="flex items-center gap-2">
                            <Clock className={`w-3.5 h-3.5 ${iconColor} shrink-0`} />
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">Due</span>
                              <span className={`text-sm font-bold tracking-tight ${dateTextColor}`}>
                                {formatMonthDay(d)}
                              </span>
                              <span className="text-[10px] font-semibold text-blue-600 dark:text-sky-400">
                                {rec.dueTime || DEFAULT_DUE_TIME}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20"
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
                            <span className={`px-2 py-0.5 rounded-lg font-mono text-xs tracking-wide ${badgeStyle}`}>
                              {label}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Footer: Leader & Status */}
                    <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${leader.color}`}>
                          {leader.avatar}
                        </div>
                        <span className="text-neutral-600 dark:text-neutral-400 truncate max-w-[90px]">{rec.taskLeader}</span>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full font-medium border ${stat.color}`}>
                        {stat.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Add Button */}
            <div className="p-2 border-t border-black/5 dark:border-white/5">
              <button
                onClick={() => {
                  let defaultDue = todayStr;
                  if (viewType === 'due_date') {
                    const formatYMD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    if (col.key === 'overdue') {
                      const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
                      defaultDue = formatYMD(yesterday);
                    } else if (col.key === 'today') {
                      defaultDue = todayStr;
                    } else if (col.key === 'this_week') {
                      const targetDay = today < endOfWeek ? new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1) : endOfWeek;
                      defaultDue = formatYMD(targetDay);
                    } else if (col.key === 'future') {
                      const nextWeekDay = new Date(endOfWeek.getFullYear(), endOfWeek.getMonth(), endOfWeek.getDate() + 2);
                      defaultDue = formatYMD(nextWeekDay);
                    }
                  }

                  if (viewType === 'leader') {
                    onAddRecord({
                      taskLeader: col.key,
                      priority: 'P1',
                      project: 'UID',
                      businessLine: 'EMS',
                      status: 'Not yet started',
                      dueDate: todayStr,
                      startTime: todayStr
                    });
                  } else {
                    onAddRecord({
                      priority: viewType === 'priority' ? col.key : 'P1',
                      status: viewType === 'status' ? col.key : 'Not yet started',
                      taskLeader: (currentLeaders[0] && currentLeaders[0].name) || 'Pierre Marchel',
                      dueDate: viewType === 'due_date' ? defaultDue : todayStr,
                      startTime: viewType === 'due_date' ? defaultDue : todayStr
                    });
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-medium text-neutral-500 hover:text-apple-blue hover:bg-apple-blue/10 dark:hover:bg-apple-blue/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>

          </div>
        );
      })}
      </div>
    </div>
  );
}