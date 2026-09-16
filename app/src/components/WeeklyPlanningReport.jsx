import React, { useState, useMemo, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Printer,
  Download,
  Filter,
  FileSpreadsheet,
  User,
  Clock,
  Tag,
  CheckCircle2,
  ExternalLink,
  Plus,
  X,
  Check,
  CornerDownRight
} from 'lucide-react';
import { PRIORITIES, STATUSES, PROJECTS, LEADERS, BUSINESS_LINES, getStatusConfig, canonicalStatus } from '../data/initialData';
import { exportWeeklyPlanningExcel } from '../lib/exportExcel';

// Helper: Format Date object to 'YYYY-MM-DD'
const formatYMD = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: Parse YYYY-MM-DD or date string to local Date object
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

// Helper: Format to "Sep 14" (like user's Excel sample: Sep 14 - Sep 20)
const formatShortDate = (d) => {
  if (!d) return '-';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

// Helper: Format to "Sep-14" (as seen in user table cells)
const formatCellDate = (dateStr) => {
  const d = parseDateOnly(dateStr);
  if (!d) return '-';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]}-${String(d.getDate()).padStart(2, '0')}`;
};

// Helper: Given any Date, return Monday of that week
const getMondayOfWeek = (d) => {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
};

export function WeeklyPlanningReport({
  records = [],
  projects = PROJECTS,
  leaders = LEADERS,
  categories = BUSINESS_LINES,
  onOpenRecord,
  onOpenAddRecordWithLeader,
  onAddTaskUnderLeader,
  onUpdateRecord
}) {
  // Current selected Monday (Default: Monday of current week)
  const [currentMonday, setCurrentMonday] = useState(() => {
    return getMondayOfWeek(new Date());
  });

  // Calculate Sunday of current week (Monday + 6 days)
  const currentSunday = useMemo(() => {
    const sun = new Date(currentMonday);
    sun.setDate(sun.getDate() + 6);
    return sun;
  }, [currentMonday]);

  // Period string: e.g. "Sep 14 - Sep 20" (like Excel screenshot)
  const periodStr = useMemo(() => {
    return `${formatShortDate(currentMonday)} - ${formatShortDate(currentSunday)}, ${currentSunday.getFullYear()}`;
  }, [currentMonday, currentSunday]);

  // Collapsed state for Task Leader groups
  const [collapsedLeaders, setCollapsedLeaders] = useState({});

  const toggleLeaderCollapse = (leaderName) => {
    setCollapsedLeaders(prev => ({
      ...prev,
      [leaderName]: !prev[leaderName]
    }));
  };

  // Collapsed state for Parent Tasks' Subtasks
  const [collapsedSubTasks, setCollapsedSubTasks] = useState({});

  const toggleSubTaskCollapse = (parentId) => {
    setCollapsedSubTasks(prev => ({
      ...prev,
      [parentId]: !prev[parentId]
    }));
  };

  // State for inline adding task under a specific leader
  const [inlineAddingLeader, setInlineAddingLeader] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState(categories && categories.length > 0 ? categories[0] : 'BETTER FUTURE');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('P1');
  const [newTaskProject, setNewTaskProject] = useState('BETTER FUTURE');
  const [newTaskStatus, setNewTaskStatus] = useState('Not yet started');
  const inlineInputRef = useRef(null);

  // State for adding under another leader who has 0 tasks in this week
  const [isAddingForNewLeader, setIsAddingForNewLeader] = useState(false);
  const [selectedNewLeader, setSelectedNewLeader] = useState('');

  const allLeadersList = useMemo(() => {
    return leaders && leaders.length > 0 ? leaders : LEADERS;
  }, [leaders]);

  // Default date falling inside the currently viewed week
  const getDefaultWeekDate = () => {
    const today = new Date();
    const todayStr = formatYMD(today);
    const mStr = formatYMD(currentMonday);
    const sStr = formatYMD(currentSunday);
    if (todayStr >= mStr && todayStr <= sStr) {
      return todayStr;
    }
    return mStr;
  };

  const startAddingForLeader = (leaderName) => {
    setInlineAddingLeader(leaderName);
    setNewTaskTitle('');
    setNewTaskCategory(categories && categories.length > 0 ? categories[0] : 'BETTER FUTURE');
    setNewTaskProject('BETTER FUTURE');
    setNewTaskPriority('P1');
    setNewTaskStatus('Not yet started');
    setNewTaskDate(getDefaultWeekDate());

    // Ensure the leader group is uncollapsed so the user sees the input!
    setCollapsedLeaders(prev => ({
      ...prev,
      [leaderName]: false
    }));

    setTimeout(() => {
      if (inlineInputRef.current) {
        inlineInputRef.current.focus();
      }
    }, 50);
  };

  const handleSubmitNewTask = (leaderName) => {
    if (!newTaskTitle.trim()) return;

    const taskData = {
      task: newTaskTitle.trim(),
      businessLine: newTaskCategory || (categories && categories[0]) || 'BETTER FUTURE',
      dueDate: newTaskDate || getDefaultWeekDate(),
      startTime: newTaskDate || getDefaultWeekDate(),
      priority: newTaskPriority || 'P1',
      project: newTaskProject || 'BETTER FUTURE',
      status: newTaskStatus || 'Not yet started',
      notes: ''
    };

    if (onAddTaskUnderLeader) {
      onAddTaskUnderLeader(leaderName, taskData);
    }

    // Clear title and keep focus ready for next task
    setNewTaskTitle('');
    setTimeout(() => {
      if (inlineInputRef.current) {
        inlineInputRef.current.focus();
      }
    }, 50);
  };

  const handleOpenFullForm = (leaderName) => {
    const defaultDate = newTaskDate || getDefaultWeekDate();
    if (onOpenAddRecordWithLeader) {
      onOpenAddRecordWithLeader(leaderName, defaultDate);
    }
    setInlineAddingLeader(null);
  };

  // Move week navigation
  const prevWeek = () => {
    setCurrentMonday(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const nextWeek = () => {
    setCurrentMonday(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const jumpToCurrentWeek = () => {
    setCurrentMonday(getMondayOfWeek(new Date()));
  };

  // Handle user picking any Monday or date from standard datepicker
  const handleDatePick = (e) => {
    const val = e.target.value;
    if (!val) return;
    const picked = parseDateOnly(val);
    if (picked) {
      setCurrentMonday(getMondayOfWeek(picked));
    }
  };

  // Start & End timestamps for the selected week (Monday 00:00:00 to Sunday 23:59:59)
  const weekStart = useMemo(() => new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate(), 0, 0, 0), [currentMonday]);
  const weekEnd = useMemo(() => new Date(currentSunday.getFullYear(), currentSunday.getMonth(), currentSunday.getDate(), 23, 59, 59, 999), [currentSunday]);

  // Filter tasks:
  // 1. Current week tasks: dueDate falls between weekStart and weekEnd
  // 2. Overdue tasks from previous weeks: dueDate < weekStart, and status is NOT Done or Archived
  // 3. Parent tasks of any included child tasks to ensure context integrity
  const { weeklyRecords, overdueCount } = useMemo(() => {
    let overdueCnt = 0;
    const recordsWithMeta = [];
    const addedIds = new Set();
    const recordsMap = new Map(records.map(r => [r.id, r]));

    records.forEach(r => {
      const canon = canonicalStatus(r.status);
      if (canon === 'Archived') return;

      const targetDate = parseDateOnly(r.dueDate || r.startTime);
      if (!targetDate) return;

      // Check if it falls within current week
      if (targetDate >= weekStart && targetDate <= weekEnd) {
        recordsWithMeta.push({
          ...r,
          isOverduePrior: false
        });
        addedIds.add(r.id);
      }
      // Check if it is overdue from previous weeks and NOT finished
      else if (targetDate < weekStart && canon !== 'Done') {
        overdueCnt += 1;
        recordsWithMeta.push({
          ...r,
          isOverduePrior: true
        });
        addedIds.add(r.id);
      }
    });

    // If any child task was included, make sure its parent task is also included in weeklyRecords
    // so the child task can sit underneath its parent
    recordsWithMeta.forEach(r => {
      if (r.parentId && !addedIds.has(r.parentId)) {
        const parentRec = recordsMap.get(r.parentId);
        if (parentRec) {
          addedIds.add(parentRec.id);
          recordsWithMeta.push({
            ...parentRec,
            isOverduePrior: false,
            isParentIncludedForChild: true
          });
        }
      }
    });

    return { weeklyRecords: recordsWithMeta, overdueCount: overdueCnt };
  }, [records, weekStart, weekEnd]);

  // Group weekly tasks by Task Leader, sorted ascending by leader name
  // IMPORTANT: Sub-tasks (child tasks) are ALWAYS placed directly underneath their parent task!
  const groupedByLeader = useMemo(() => {
    const groups = {};

    weeklyRecords.forEach(r => {
      const leader = (r.taskLeader && r.taskLeader.trim()) || 'Unassigned';
      if (!groups[leader]) groups[leader] = [];
      groups[leader].push(r);
    });

    // Priority ranking helper (P0: 0, P1: 1, P2: 2, P3: 3, unknown: 4)
    const getPriorityRank = (p) => {
      if (!p) return 4;
      const upper = String(p).toUpperCase().trim();
      if (upper === 'P0') return 0;
      if (upper === 'P1') return 1;
      if (upper === 'P2') return 2;
      if (upper === 'P3') return 3;
      return 4;
    };

    // Sort comparator function
    const taskSorter = (a, b) => {
      if (a.isOverduePrior && !b.isOverduePrior) return -1;
      if (!a.isOverduePrior && b.isOverduePrior) return 1;

      const dateA = a.dueDate || a.startTime || '';
      const dateB = b.dueDate || b.startTime || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);

      const prioDiff = getPriorityRank(a.priority) - getPriorityRank(b.priority);
      if (prioDiff !== 0) return prioDiff;

      return (a.dueTime || '09:00').localeCompare(b.dueTime || '09:00');
    };

    // Sort tasks inside each leader group with parent-child hierarchy:
    // 1. Separate into parent tasks (no parentId) and child tasks (parentId exists)
    // 2. Sort parent tasks with taskSorter
    // 3. For each parent, find all its child tasks (and sort them with taskSorter)
    // 4. Flatten so children are placed IMMEDIATELY underneath their parent
    // 5. Any orphaned child tasks (parent not in group) are placed in sorted order
    Object.keys(groups).forEach(leader => {
      const allTasks = groups[leader];
      const parents = [];
      const childrenByParent = {};
      const taskById = new Map(allTasks.map(t => [t.id, t]));

      allTasks.forEach(t => {
        if (t.parentId) {
          if (!childrenByParent[t.parentId]) {
            childrenByParent[t.parentId] = [];
          }
          childrenByParent[t.parentId].push(t);
        } else {
          parents.push(t);
        }
      });

      // Sort parents
      parents.sort(taskSorter);

      // Build structured ordered list
      const structuredTasks = [];
      const visitedChildren = new Set();

      parents.forEach(parent => {
        const children = childrenByParent[parent.id] || [];
        children.sort(taskSorter);

        // Add parent with subtask metadata
        structuredTasks.push({
          ...parent,
          isSubTask: false,
          hasSubTasks: children.length > 0,
          subTaskCount: children.length
        });

        // Add children directly underneath their parent
        children.forEach(child => {
          visitedChildren.add(child.id);
          structuredTasks.push({
            ...child,
            isSubTask: true,
            parentTaskTitle: parent.task
          });
        });
      });

      // Add any child tasks whose parents were not in this leader's parent list
      const orphanChildren = [];
      Object.keys(childrenByParent).forEach(pId => {
        if (!taskById.has(pId)) {
          (childrenByParent[pId] || []).forEach(child => {
            if (!visitedChildren.has(child.id)) {
              orphanChildren.push({
                ...child,
                isSubTask: true,
                parentTaskTitle: 'Parent Task'
              });
            }
          });
        }
      });
      orphanChildren.sort(taskSorter);
      structuredTasks.push(...orphanChildren);

      groups[leader] = structuredTasks;
    });

    // Sort leader keys ascending alphabetically
    const sortedLeaderNames = Object.keys(groups).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    return sortedLeaderNames.map(name => ({
      leader: name,
      tasks: groups[name]
    }));
  }, [weeklyRecords]);

  // Export to Excel (.xlsx) matching the exact view layout
  const handleExportExcel = () => {
    exportWeeklyPlanningExcel({
      records,
      groupedByLeader,
      weeklyRecords,
      currentMonday,
      currentSunday,
      periodStr
    });
  };

  // Export to CSV fallback
  const handleExportCSV = () => {
    const headers = ['Task Leader', 'Category', 'Task', 'Task Due Date', 'Priority', 'Project', 'Status', 'Latest update'];
    const rows = [];

    groupedByLeader.forEach(grp => {
      const nonPersonalTasks = grp.tasks.filter(t => (t.businessLine || '').trim().toUpperCase() !== 'PERSONAL');
      nonPersonalTasks.forEach(t => {
        let latestUpdateStr = '';
        if (Array.isArray(t.updates) && t.updates.length > 0) {
          const first = t.updates[0];
          latestUpdateStr = `[${first.date || '-'}] - ${first.text || ''}`;
        } else if (t.notes) {
          latestUpdateStr = `[${t.dueDate || '-'}] - ${t.notes}`;
        }

        let taskDisplayName = t.isOverduePrior ? `[overdue] - ${t.task}` : t.task;
        if (t.isSubTask) {
          taskDisplayName = `   ↳ ${taskDisplayName}`;
        }

        rows.push([
          `"${grp.leader}"`,
          `"${t.businessLine || ''}"`,
          `"${(taskDisplayName || '').replace(/"/g, '""')}"`,
          `"${formatCellDate(t.dueDate || t.startTime)}"`,
          `"${t.priority || ''}"`,
          `"${t.project || ''}"`,
          `"${canonicalStatus(t.status)}"`,
          `"${latestUpdateStr.replace(/"/g, '""')}"`
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Weekly_Planning_${formatYMD(currentMonday)}_to_${formatYMD(currentSunday)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 select-none animate-in fade-in duration-200">
      
      {/* Top Banner & Control Deck (STAY DI ATAS / STICKY) */}
      <div className="sticky top-[53px] z-20 apple-glass rounded-2xl border border-neutral-200/80 dark:border-white/10 p-4 shadow-[0_10px_25px_rgba(0,0,0,0.1)] backdrop-blur-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all">
        
        {/* Left: Title & Subtitle */}
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-apple-blue/15 text-apple-blue border border-apple-blue/30 uppercase tracking-wider">
              Operasional
            </span>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">
              Weekly Planning Report
            </h2>
          </div>
          <div className="flex items-baseline gap-2 mt-1 flex-wrap">
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Period :</span>
            <span className="text-sm font-extrabold text-neutral-900 dark:text-neutral-100 font-mono tracking-tight bg-black/5 dark:bg-white/10 px-2.5 py-0.5 rounded-lg border border-black/5 dark:border-white/10">
              {periodStr}
            </span>
            <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">
              ({weeklyRecords.length} tugas{overdueCount > 0 ? `, termasuk ${overdueCount} overdue` : ''})
            </span>
            {overdueCount > 0 && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                {overdueCount} OVERDUE DARI MINGGU SEBELUMNYA
              </span>
            )}
          </div>
        </div>

        {/* Right: Date Picker, Week Controls, and Export */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          
          {/* Week Date Picker (Select any Monday / date to auto-calculate that entire week) */}
          <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <CalendarIcon className="w-3.5 h-3.5 text-apple-blue" />
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Pilih Minggu:</span>
            <input
              type="date"
              value={formatYMD(currentMonday)}
              onChange={handleDatePick}
              className="bg-transparent text-xs font-mono font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-none cursor-pointer"
              title="Pilih tanggal (otomatis minggu penuh: Senin - Minggu)"
            />
          </div>

          {/* Previous / Today / Next Week buttons */}
          <div className="inline-flex items-center gap-1 bg-neutral-100 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl p-0.5">
            <button
              onClick={prevWeek}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition cursor-pointer"
              title="Minggu Sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={jumpToCurrentWeek}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-white dark:hover:bg-white/10 text-neutral-800 dark:text-neutral-200 transition cursor-pointer"
              title="Kembali ke Minggu Ini"
            >
              Minggu Ini
            </button>
            <button
              onClick={nextWeek}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-300 transition cursor-pointer"
              title="Minggu Berikutnya"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export to Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-xs active:scale-95 ml-auto md:ml-0"
            title="Download Report Excel (.xlsx) dengan format persis tampilan"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

        </div>

      </div>

      {/* Main Report Table (Exact format matching user's spreadsheet attachment) */}
      <div className="apple-glass rounded-2xl border border-neutral-200/80 dark:border-white/10 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        
        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-sans">
            
            {/* Table Header: Category, Task, Task Due date, Priority, Project, Status, Latest update */}
            <thead>
              <tr className="bg-neutral-100/90 dark:bg-[#202022] border-b border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 font-semibold text-[11px] tracking-tight">
                <th className="py-2.5 px-4 w-36 border-r border-neutral-200/60 dark:border-white/5">
                  Category
                </th>
                <th className="py-2.5 px-4 min-w-[240px] border-r border-neutral-200/60 dark:border-white/5">
                  Task
                </th>
                <th className="py-2.5 px-4 w-28 border-r border-neutral-200/60 dark:border-white/5 whitespace-nowrap">
                  Task Due date
                </th>
                <th className="py-2.5 px-3 w-16 border-r border-neutral-200/60 dark:border-white/5 text-center">
                  Priority
                </th>
                <th className="py-2.5 px-4 w-48 border-r border-neutral-200/60 dark:border-white/5">
                  Project
                </th>
                <th className="py-2.5 px-4 w-32 border-r border-neutral-200/60 dark:border-white/5 whitespace-nowrap">
                  Status
                </th>
                <th className="py-2.5 px-4 min-w-[260px]">
                  Latest update
                </th>
              </tr>
            </thead>

            {/* Table Body: Group by Task Leader (Ascending) */}
            <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
              
              {groupedByLeader.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 px-4 text-neutral-400 dark:text-neutral-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-neutral-400" />
                    <p className="font-semibold text-sm">Tidak ada task untuk periode {periodStr}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">Silakan pilih minggu lain menggunakan kontrol tanggal di atas.</p>
                  </td>
                </tr>
              ) : (
                groupedByLeader.map(group => {
                  const isCollapsed = !!collapsedLeaders[group.leader];
                  const leaderObj = (leaders || LEADERS).find(l => l.name.toLowerCase() === group.leader.toLowerCase()) || {
                    name: group.leader,
                    avatar: group.leader.slice(0, 2).toUpperCase(),
                    color: 'bg-neutral-600 text-white'
                  };

                  return (
                    <React.Fragment key={group.leader}>
                      
                      {/* Leader Group Header Row: "> [Leader Name]" */}
                      <tr
                        onClick={() => toggleLeaderCollapse(group.leader)}
                        className="bg-neutral-50/95 dark:bg-[#18181a] border-t-2 border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-[#222225] cursor-pointer transition select-none"
                      >
                        <td colSpan={7} className="py-2.5 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-neutral-400 dark:text-neutral-500 transition-transform duration-150">
                                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </span>
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-2xs ${leaderObj.color}`}>
                                {leaderObj.avatar}
                              </div>
                              <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100 tracking-tight">
                                {group.leader}
                              </span>
                              <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 font-normal">
                                ({group.tasks.length} task)
                              </span>
                            </div>

                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startAddingForLeader(group.leader);
                                }}
                                className="px-2 py-0.5 rounded-md bg-apple-blue/10 hover:bg-apple-blue/20 text-apple-blue dark:text-sky-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                                title={`Tambah task untuk ${group.leader}`}
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Task</span>
                              </button>
                              <span className="text-[11px] text-apple-blue dark:text-sky-400 font-medium">
                                {isCollapsed ? 'Klik untuk membuka' : 'Klik untuk menciutkan'}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Task Rows for this Leader */}
                      {!isCollapsed && group.tasks.map(task => {
                        // If this is a sub-task and its parent's subtasks are collapsed, don't render
                        if (task.isSubTask && task.parentId && collapsedSubTasks[task.parentId]) {
                          return null;
                        }

                        const prio = PRIORITIES[task.priority] || PRIORITIES.P1;
                        const stat = getStatusConfig(task.status);
                        const proj = projects.find(p => p.name === task.project) || { color: 'bg-neutral-100 text-neutral-700' };
                        const isSubTaskCollapsed = task.hasSubTasks ? !!collapsedSubTasks[task.id] : false;

                        // Latest update extraction: [date] - [updates] (matching user format)
                        let latestUpdateDate = '';
                        let latestUpdateText = '';

                        if (Array.isArray(task.updates) && task.updates.length > 0) {
                          const first = task.updates[0];
                          latestUpdateDate = first.date ? formatCellDate(first.date) : '';
                          latestUpdateText = first.text || '';
                        } else if (task.notes && task.notes.trim()) {
                          latestUpdateDate = task.dueDate ? formatCellDate(task.dueDate) : '';
                          latestUpdateText = task.notes.trim();
                        }

                        return (
                          <tr
                            key={task.id}
                            onClick={() => onOpenRecord && onOpenRecord(task)}
                            className={`${
                              task.isSubTask
                                ? 'bg-indigo-50/25 dark:bg-indigo-950/15 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30'
                                : 'hover:bg-apple-blue/5 dark:hover:bg-white/[0.03]'
                            } transition cursor-pointer group`}
                            title={task.isSubTask ? `Sub-task dari "${task.parentTaskTitle || 'Parent Task'}". Klik untuk detail.` : 'Klik untuk melihat / mengedit detail task di Side Peek'}
                          >
                            
                            {/* 1. Category */}
                            <td className="py-2.5 px-4 font-semibold text-neutral-700 dark:text-neutral-300 border-r border-neutral-100 dark:border-white/5">
                              {task.isSubTask ? (
                                <span className="text-xs text-neutral-400 font-normal">
                                  {task.businessLine || '-'}
                                </span>
                              ) : (
                                task.businessLine || '-'
                              )}
                            </td>

                            {/* 2. Task Title (with Sub-task hierarchy indentation and icon) */}
                            <td className={`py-2.5 px-4 font-medium text-neutral-900 dark:text-neutral-100 border-r border-neutral-100 dark:border-white/5 ${
                              task.isSubTask ? 'pl-8' : ''
                            }`}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                                  
                                  {/* Sub-task indent indicator icon */}
                                  {task.isSubTask && (
                                    <div className="flex items-center text-neutral-400 dark:text-neutral-500 shrink-0 mr-1" title={`Sub-task dari "${task.parentTaskTitle || 'Parent Task'}"`}>
                                      <CornerDownRight className="w-3.5 h-3.5" />
                                    </div>
                                  )}

                                  {/* Parent collapse toggle if it has sub-tasks */}
                                  {task.hasSubTasks && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSubTaskCollapse(task.id);
                                      }}
                                      className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition shrink-0 mr-0.5"
                                      title={isSubTaskCollapsed ? 'Buka sub-task' : 'Ciutkan sub-task'}
                                    >
                                      {isSubTaskCollapsed ? (
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      ) : (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  )}

                                  {task.isOverduePrior && (
                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 shrink-0">
                                      [overdue]
                                    </span>
                                  )}
                                  {task.isOverduePrior && (
                                    <span className="text-rose-500 font-semibold">-</span>
                                  )}

                                  <span className={`truncate ${canonicalStatus(task.status) === 'Done' ? 'line-through text-neutral-400' : ''} ${
                                    task.isOverduePrior ? 'text-rose-900 dark:text-rose-200 font-semibold' : ''
                                  } ${task.isSubTask ? 'text-neutral-700 dark:text-neutral-200 text-[13px]' : ''}`}>
                                    {task.task}
                                  </span>

                                  {/* Sub-task counter badge on parent task */}
                                  {task.hasSubTasks && (
                                    <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-500 dark:text-neutral-400 border border-neutral-200/80 dark:border-white/10 shrink-0">
                                      {task.subTaskCount} sub-task
                                    </span>
                                  )}
                                </div>

                                <ExternalLink className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
                              </div>
                            </td>

                            {/* 3. Task Due Date (e.g. Sep-14) */}
                            <td className="py-2.5 px-4 font-mono font-medium text-neutral-800 dark:text-neutral-200 border-r border-neutral-100 dark:border-white/5 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-md ${task.isSubTask ? 'bg-indigo-50/60 dark:bg-indigo-950/30 text-xs' : 'bg-neutral-100 dark:bg-white/5'}`}>
                                {formatCellDate(task.dueDate || task.startTime)}
                              </span>
                            </td>

                            {/* 4. Priority */}
                            <td className="py-2.5 px-3 text-center border-r border-neutral-100 dark:border-white/5 font-mono">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${prio.color}`}>
                                {prio.label}
                              </span>
                            </td>

                            {/* 5. Project */}
                            <td className="py-2.5 px-4 font-medium text-neutral-800 dark:text-neutral-200 border-r border-neutral-100 dark:border-white/5 truncate max-w-[200px]">
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${proj.color}`}>
                                {task.project || '-'}
                              </span>
                            </td>

                            {/* 6. Status */}
                            <td className="py-2.5 px-4 border-r border-neutral-100 dark:border-white/5 whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${stat.color}`}>
                                {stat.label}
                              </span>
                            </td>

                            {/* 7. Latest update: [date] - [updates] */}
                            <td className="py-2.5 px-4 text-neutral-600 dark:text-neutral-300 text-xs leading-relaxed max-w-sm">
                              {latestUpdateText ? (
                                <div className="flex items-baseline gap-1.5">
                                  {latestUpdateDate && (
                                    <span className="font-mono text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 shrink-0">
                                      [{latestUpdateDate}]
                                    </span>
                                  )}
                                  <span className="line-clamp-2">
                                    {latestUpdateText}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-neutral-400 italic text-[11px]">
                                  Belum ada update
                                </span>
                              )}
                            </td>

                          </tr>
                        );
                      })}

                      {/* Add Task row at the very BOTTOM of the leader group */}
                      {!isCollapsed && (
                        inlineAddingLeader === group.leader ? (
                          <tr className="bg-apple-blue/10 dark:bg-apple-blue/20 border-y-2 border-apple-blue animate-in fade-in">
                            {/* 1. Category */}
                            <td className="py-2 px-2 border-r border-apple-blue/20">
                              <select
                                value={newTaskCategory}
                                onChange={(e) => setNewTaskCategory(e.target.value)}
                                className="w-full px-2 py-1.5 bg-white dark:bg-[#252528] border border-apple-blue/50 rounded-lg text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-apple-blue shadow-2xs"
                              >
                                {(categories && categories.length > 0 ? categories : BUSINESS_LINES).map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </td>

                            {/* 2. Task Name Input */}
                            <td className="py-2 px-3 border-r border-apple-blue/20">
                              <input
                                ref={inlineInputRef}
                                type="text"
                                placeholder={`Ketik nama tugas untuk ${group.leader}... (Tekan Enter)`}
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSubmitNewTask(group.leader);
                                  } else if (e.key === 'Escape') {
                                    setInlineAddingLeader(null);
                                  }
                                }}
                                className="w-full px-3 py-1.5 bg-white dark:bg-[#252528] border border-apple-blue rounded-lg text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none ring-2 ring-apple-blue/30 shadow-2xs"
                                autoFocus
                              />
                            </td>

                            {/* 3. Task Due Date */}
                            <td className="py-2 px-2 border-r border-apple-blue/20">
                              <input
                                type="date"
                                value={newTaskDate}
                                onChange={(e) => setNewTaskDate(e.target.value)}
                                className="w-full px-2 py-1.5 bg-white dark:bg-[#252528] border border-neutral-300 dark:border-white/15 rounded-lg text-xs font-mono font-semibold text-neutral-900 dark:text-white focus:outline-none shadow-2xs"
                              />
                            </td>

                            {/* 4. Priority */}
                            <td className="py-2 px-1 border-r border-apple-blue/20 text-center">
                              <select
                                value={newTaskPriority}
                                onChange={(e) => setNewTaskPriority(e.target.value)}
                                className="w-full px-1 py-1.5 bg-white dark:bg-[#252528] border border-neutral-300 dark:border-white/15 rounded-lg text-xs font-bold text-center text-neutral-900 dark:text-white focus:outline-none shadow-2xs"
                              >
                                <option value="P0">P0</option>
                                <option value="P1">P1</option>
                                <option value="P2">P2</option>
                                <option value="P3">P3</option>
                              </select>
                            </td>

                            {/* 5. Project */}
                            <td className="py-2 px-2 border-r border-apple-blue/20">
                              <select
                                value={newTaskProject}
                                onChange={(e) => setNewTaskProject(e.target.value)}
                                className="w-full px-2 py-1.5 bg-white dark:bg-[#252528] border border-neutral-300 dark:border-white/15 rounded-lg text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none shadow-2xs"
                              >
                                {projects.map(p => (
                                  <option key={p.name} value={p.name}>{p.name}</option>
                                ))}
                              </select>
                            </td>

                            {/* 6. Status */}
                            <td className="py-2 px-2 border-r border-apple-blue/20">
                              <select
                                value={newTaskStatus}
                                onChange={(e) => setNewTaskStatus(e.target.value)}
                                className="w-full px-1.5 py-1.5 bg-white dark:bg-[#252528] border border-neutral-300 dark:border-white/15 rounded-lg text-xs font-medium text-neutral-900 dark:text-white focus:outline-none shadow-2xs"
                              >
                                {Object.keys(STATUSES).map(s => (
                                  <option key={s} value={s}>{STATUSES[s].label}</option>
                                ))}
                              </select>
                            </td>

                            {/* 7. Action Buttons */}
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleSubmitNewTask(group.leader)}
                                  className="px-3 py-1.5 bg-apple-blue hover:bg-apple-blueHover text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1 shrink-0 cursor-pointer"
                                  title="Simpan task (atau tekan Enter di kolom nama)"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Tambah</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenFullForm(group.leader)}
                                  className="px-2 py-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-xs font-medium shrink-0 transition cursor-pointer"
                                  title="Buka form lengkap di Modal / Side Peek"
                                >
                                  Form Lengkap
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setInlineAddingLeader(null)}
                                  className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg transition shrink-0 cursor-pointer"
                                  title="Batal (Esc)"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr
                            onClick={() => startAddingForLeader(group.leader)}
                            className="bg-neutral-50/40 dark:bg-white/[0.01] hover:bg-apple-blue/5 dark:hover:bg-white/[0.04] text-neutral-400 hover:text-apple-blue dark:hover:text-sky-400 cursor-pointer transition border-b border-neutral-100 dark:border-white/5 select-none group/addrow"
                          >
                            <td colSpan={7} className="py-2.5 px-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-semibold">
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Add Task langsung ke {group.leader}... (New Record)</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenFullForm(group.leader);
                                  }}
                                  className="opacity-0 group-hover/addrow:opacity-100 text-[11px] font-medium text-neutral-500 hover:text-apple-blue dark:hover:text-sky-300 transition"
                                >
                                  Buka Form Lengkap ↗
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      )}

                    </React.Fragment>
                  );
                })
              )}

              {/* Add Task for any other Leader (New Leader group in this week) */}
              <tr className="bg-neutral-50/60 dark:bg-white/[0.02] border-t-2 border-dashed border-neutral-200 dark:border-white/10">
                <td colSpan={7} className="py-3 px-4">
                  {isAddingForNewLeader ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                        Pilih Task Leader untuk dibuatkan task di minggu ini:
                      </span>
                      <select
                        value={selectedNewLeader}
                        onChange={(e) => setSelectedNewLeader(e.target.value)}
                        className="px-2.5 py-1.5 bg-white dark:bg-[#252528] border border-apple-blue rounded-lg text-xs font-bold text-neutral-900 dark:text-white shadow-2xs"
                      >
                        {allLeadersList.map(l => (
                          <option key={l.name} value={l.name}>
                            {l.name} ({l.role || 'Member'})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const leader = selectedNewLeader || allLeadersList[0]?.name || 'Pierre Marchel';
                          startAddingForLeader(leader);
                          setIsAddingForNewLeader(false);
                        }}
                        className="px-3.5 py-1.5 bg-apple-blue hover:bg-apple-blueHover text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                      >
                        Lanjut Tambah Task
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingForNewLeader(false)}
                        className="px-2.5 py-1.5 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-xs transition cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const firstLeader = (leaders && leaders[0]?.name) || 'Pierre Marchel';
                        setSelectedNewLeader(firstLeader);
                        setIsAddingForNewLeader(true);
                      }}
                      className="flex items-center gap-1.5 text-apple-blue dark:text-sky-400 hover:underline font-bold text-xs px-2 py-1 rounded-md hover:bg-apple-blue/10 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Tambah Task under Task Leader Lain (New Record)</span>
                    </button>
                  )}
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-4 py-3 bg-neutral-50/80 dark:bg-[#18181a]/80 border-t border-neutral-200 dark:border-white/5 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Grouped by <strong>Task Leader</strong> (Ascending: A → Z)</span>
          </div>
          <span>Total: <strong>{weeklyRecords.length}</strong> task di minggu ini</span>
        </div>

      </div>

    </div>
  );
}
