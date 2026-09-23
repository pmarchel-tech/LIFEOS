import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, Database, AlertCircle, Sparkles, Bell, X } from 'lucide-react';
import { LarkNavbar } from './components/LarkNavbar';
import { LarkTable } from './components/LarkTable';
import { KanbanView } from './components/KanbanView';
import { CalendarView } from './components/CalendarView';
import { RecordModal } from './components/RecordModal';
import { NotionSidePeek } from './components/NotionSidePeek';
import { WeeklyPlanningReport } from './components/WeeklyPlanningReport';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { INITIAL_RECORDS, EXPORTED_WEEKLY_RECORDS, PROJECTS, LEADERS, canonicalStatus, DEFAULT_DUE_TIME, DEFAULT_REMINDER, REMINDER_OPTIONS } from './data/initialData';
import { requestNotificationPermission, getNotificationPermission, sendTaskNotification } from './utils/notificationService';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  fetchTasksFromSupabase,
  syncTasksToSupabase,
  upsertSingleTaskToSupabase,
  deleteTaskFromSupabase,
  fetchProjectsFromSupabase,
  syncProjectsToSupabase,
  upsertProjectToSupabase,
  fetchLeadersFromSupabase,
  syncLeadersToSupabase,
  upsertLeaderToSupabase
} from './lib/supabase';
import { exportWeeklyPlanningExcel } from './lib/exportExcel';
import {
  createActivityLog,
  getLocalLogs,
  syncLogsToSupabase,
  fetchLogsFromSupabase,
  saveLocalLogs
} from './lib/activityLogger';

// Helper to get today's date formatted as YYYY-MM-DD in local time
const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

const matchesDueDateFilter = (dateStr, filterValue) => {
  if (!filterValue || filterValue === 'ALL') return true;
  const targetDate = parseDateOnly(dateStr);
  if (!targetDate) return false;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (filterValue === 'OVERDUE') {
    return targetDate < today;
  }
  if (filterValue === 'TODAY') {
    return targetDate.getTime() === today.getTime();
  }

  // Week bounds: Monday of current week to Sunday of current week
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diffToMonday);
  const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6);

  // Next week bounds: Monday of next week to Sunday of next week
  const startOfNextWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 7);
  const endOfNextWeek = new Date(startOfNextWeek.getFullYear(), startOfNextWeek.getMonth(), startOfNextWeek.getDate() + 6);

  if (filterValue === 'THIS_WEEK') {
    return targetDate >= today && targetDate <= endOfWeek;
  }
  if (filterValue === 'NEXT_WEEK') {
    return targetDate >= startOfNextWeek && targetDate <= endOfNextWeek;
  }
  if (filterValue === 'FUTURE') {
    return targetDate > endOfNextWeek;
  }
  return true;
};

export default function App() {
  // Safe loader that checks all possible cache/storage keys and picks the most complete dataset
  const [records, setRecords] = useState(() => {
    try {
      const candidateKeys = [
        'lark_task_records_clean_v1',
        'lark_backup_latest',
        'lark_task_records_v1',
        'lark_task_records',
        'lark_records_v1',
        'harada_lark_records_v1',
        'harada_life_os_tasks'
      ];

      // Scan all candidate keys and pick candidate with the most tasks
      let bestCandidate = null;
      for (const k of candidateKeys) {
        const saved = localStorage.getItem(k);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.task !== undefined) {
              if (!bestCandidate || parsed.length > bestCandidate.records.length) {
                bestCandidate = { key: k, records: parsed };
              }
            }
          } catch (err) {}
        }
      }

      // If no valid candidate exists or if candidate has fewer records than the 40-task CSV export,
      // prioritize the user's exported 40-task dataset!
      if (!bestCandidate || bestCandidate.records.length < (EXPORTED_WEEKLY_RECORDS?.length || 0)) {
        bestCandidate = { key: 'weekly_planning_csv_export', records: EXPORTED_WEEKLY_RECORDS };
      }

      if (bestCandidate) {
        const parsed = bestCandidate.records;
        // Self-heal: ensure subtasks have parent's businessLine
        const parentMap = new Map();
        parsed.forEach(r => {
          if (!r.parentId) parentMap.set(r.id, r.businessLine);
        });

        return parsed.map(r => {
          const updated = {
            ...r,
            dueTime: r.dueTime || DEFAULT_DUE_TIME,
            reminder: r.reminder || 'NONE'
          };
          if (r.parentId && parentMap.has(r.parentId)) {
            updated.businessLine = parentMap.get(r.parentId);
          }
          return updated;
        });
      }
    } catch (e) {
      console.error('Failed loading records:', e);
    }
    return EXPORTED_WEEKLY_RECORDS || [];
  });

  // Dynamic business line categories
  const [categories, setCategories] = useState(() => {
    const defaultCats = ['EMS', 'BETTER FUTURE', 'LPK OS', 'MARKETING', 'ACSENT', 'PERSONAL'];
    try {
      const saved = localStorage.getItem('lark_business_lines_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return Array.from(new Set([...parsed, ...defaultCats]));
        }
      }
    } catch (e) {
      console.error('Failed loading categories:', e);
    }
    return defaultCats;
  });

  // Dynamic projects list state — starts from localStorage, synced with Supabase
  const [projects, setProjects] = useState(() => {
    try {
      const saved = localStorage.getItem('lark_projects_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const names = new Set(parsed.map(p => p.name.toLowerCase()));
          const missing = PROJECTS.filter(p => !names.has(p.name.toLowerCase()));
          return [...parsed, ...missing];
        }
      }
    } catch (e) {
      console.error('Failed loading projects:', e);
    }
    return PROJECTS;
  });

  // Keep projects sorted alphabetically (ascending A-Z)
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [projects]);

  // Dynamic leaders/people list state — starts from localStorage, synced with Supabase
  const [leaders, setLeaders] = useState(() => {
    try {
      const saved = localStorage.getItem('lark_leaders_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const names = new Set(parsed.map(l => l.name.toLowerCase()));
          const missing = LEADERS.filter(l => !names.has(l.name.toLowerCase()));
          return [...parsed, ...missing];
        }
      }
    } catch (e) {
      console.error('Failed loading leaders:', e);
    }
    return LEADERS;
  });

  const [activeView, setActiveView] = useState(() => {
    try {
      const savedView = localStorage.getItem('life_os_active_view');
      if (savedView) return savedView;
    } catch (e) {}
    return 'table';
  });

  useEffect(() => {
    try {
      localStorage.setItem('life_os_active_view', activeView);
    } catch (e) {}
  }, [activeView]);

  const [searchQuery, setSearchQuery] = useState('');
  const [elementFilter, setElementFilter] = useState('ALL'); // 'ALL' | 'E1' | 'E2' ...
  const [sortField, setSortField] = useState('dueDate'); // Default sort: task due date nearest to longest ('dueDate' asc)
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  
  // Filters state (controlled from LarkNavbar across Table & Kanban views)
  const [kanbanPriorityFilter, setKanbanPriorityFilter] = useState('ALL');
  const [kanbanProjectFilter, setKanbanProjectFilter] = useState('ALL');
  const [kanbanStatusFilter, setKanbanStatusFilter] = useState('ACTIVE'); // Default: ACTIVE (hides Cancel, Pending, Done, Archived)
  const [kanbanLeaderFilter, setKanbanLeaderFilter] = useState('ALL');
  const [kanbanDueDateFilter, setKanbanDueDateFilter] = useState('ALL');

  const activeKanbanFiltersCount = [
    kanbanPriorityFilter !== 'ALL',
    kanbanProjectFilter !== 'ALL',
    kanbanStatusFilter !== 'ACTIVE',
    kanbanLeaderFilter !== 'ALL',
    kanbanDueDateFilter !== 'ALL',
    !!searchQuery.trim()
  ].filter(Boolean).length;

  const handleResetKanbanFilters = () => {
    setKanbanPriorityFilter('ALL');
    setKanbanProjectFilter('ALL');
    setKanbanStatusFilter('ACTIVE');
    setKanbanLeaderFilter('ALL');
    setKanbanDueDateFilter('ALL');
    setSearchQuery('');
  };

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSidePeekOpen, setIsSidePeekOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [inlineAddCategory, setInlineAddCategory] = useState(null);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [isMandalaOpen, setIsMandalaOpen] = useState(false);

  // Activity Audit Logs state
  const [activityLogs, setActivityLogs] = useState(() => getLocalLogs());

  // Helper to append a new activity log
  const logAction = (data) => {
    createActivityLog(data).then(newEntry => {
      if (newEntry) {
        setActivityLogs(prev => [newEntry, ...prev]);
      }
    });
  };

  // Dark / Light theme toggle state with localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('life_os_theme');
    if (savedTheme) return savedTheme === 'dark';
    return true; // Default to dark mode
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('life_os_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('life_os_theme', 'light');
    }
  }, [isDarkMode]);

  // Supabase Realtime & Initial Cloud Fetch Sync
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let isMounted = true;
    const initCloudSync = async () => {
      try {
        // 1. Sync tasks
        const remoteTasks = await fetchTasksFromSupabase();
        if (!isMounted) return;

        if (remoteTasks && remoteTasks.length > 0) {
          // Cloud has tasks, hydrate local records
          setRecords(remoteTasks);
        } else if (remoteTasks && remoteTasks.length === 0 && records.length > 0) {
          // Cloud table is empty, auto-seed with current records!
          await syncTasksToSupabase(records);
        }

        // 2. Sync projects
        const remoteProjects = await fetchProjectsFromSupabase();
        if (isMounted) {
          if (remoteProjects && remoteProjects.length > 0) {
            // Cloud is the SINGLE source of truth — replace local state entirely
            setProjects(remoteProjects);
          } else if (remoteProjects && remoteProjects.length === 0) {
            // Cloud empty — seed from local state
            const localProjects = (() => {
              try {
                const saved = localStorage.getItem('lark_projects_v1');
                if (saved) { const p = JSON.parse(saved); if (Array.isArray(p) && p.length > 0) return p; }
              } catch (e) {}
              return PROJECTS;
            })();
            await syncProjectsToSupabase(localProjects);
          }
        }

        // 3. Sync leaders
        const remoteLeaders = await fetchLeadersFromSupabase();
        if (isMounted) {
          if (remoteLeaders && remoteLeaders.length > 0) {
            // Cloud is the SINGLE source of truth — replace local state entirely
            setLeaders(remoteLeaders);
          } else if (remoteLeaders && remoteLeaders.length === 0) {
            const localLeaders = (() => {
              try {
                const saved = localStorage.getItem('lark_leaders_v1');
                if (saved) { const l = JSON.parse(saved); if (Array.isArray(l) && l.length > 0) return l; }
              } catch (e) {}
              return LEADERS;
            })();
            await syncLeadersToSupabase(localLeaders);
          }
        }

        // 4. Sync activity logs
        const localLogs = getLocalLogs();
        const remoteLogs = await fetchLogsFromSupabase(300);
        if (!isMounted) return;

        if (remoteLogs && remoteLogs.length > 0) {
          // Merge remote logs with local logs
          const map = new Map();
          remoteLogs.forEach(l => map.set(l.id, l));
          localLogs.forEach(l => {
            if (!map.has(l.id)) map.set(l.id, l);
          });
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setActivityLogs(merged);
          saveLocalLogs(merged);
          // If local had logs not yet in cloud, upload merged
          if (merged.length > remoteLogs.length) {
            await syncLogsToSupabase(merged);
          }
        } else if (localLogs && localLogs.length > 0) {
          // Cloud logs table is empty/has no records, auto-seed all local logs to Supabase
          await syncLogsToSupabase(localLogs);
        }
      } catch (e) {
        console.warn('Cloud sync error on mount:', e);
      }
    };

    initCloudSync();

    // Subscribe to Realtime Postgres changes
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const taskChannel = supabase
      .channel('public:tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async () => {
        const refreshed = await fetchTasksFromSupabase();
        if (isMounted && refreshed && refreshed.length > 0) {
          setRecords(refreshed);
        }
      })
      .subscribe();

    const logChannel = supabase
      .channel('public:activity_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, async () => {
        const refreshed = await fetchLogsFromSupabase(300);
        if (isMounted && refreshed) {
          setActivityLogs(refreshed);
          saveLocalLogs(refreshed);
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      try {
        supabase.removeChannel(taskChannel);
        supabase.removeChannel(logChannel);
      } catch (err) {}
    };
  }, []);

  // Browser Notification & Reminder Schedule Engine
  // Checks active tasks and triggers Chrome / browser desktop notifications when target time is reached
  const [notifiedTaskKeys, setNotifiedTaskKeys] = useState(() => new Set());
  const [activeNotificationToast, setActiveNotificationToast] = useState(null);
  // Dismissed Notifications state with localStorage persistence
  const [dismissedNotifIds, setDismissedNotifIds] = useState(() => {
    try {
      const saved = localStorage.getItem('life_os_dismissed_notifs');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const handleDismissNotification = (notifKey) => {
    setDismissedNotifIds(prev => {
      if (prev.includes(notifKey)) return prev;
      const next = [...prev, notifKey];
      try {
        localStorage.setItem('life_os_dismissed_notifs', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleDismissAllNotifications = () => {
    // Collect all current active notif keys from records
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const keysToDismiss = [];

    records.forEach(rec => {
      const status = canonicalStatus(rec.status);
      if (status === 'Done' || status === 'Archived' || status === 'Cancel') return;
      const taskDate = rec.dueDate || rec.startTime;
      if (!taskDate) return;

      if (rec.reminder && rec.reminder !== 'NONE') {
        keysToDismiss.push(`rem-${rec.id}`);
      }
      if (taskDate <= todayStr) {
        keysToDismiss.push(`due-${rec.id}`);
      }
    });

    setDismissedNotifIds(prev => {
      const merged = Array.from(new Set([...prev, ...keysToDismiss]));
      try {
        localStorage.setItem('life_os_dismissed_notifs', JSON.stringify(merged));
      } catch (e) {}
      return merged;
    });
  };

  useEffect(() => {
    // Check every 10 seconds
    const interval = setInterval(() => {
      const now = new Date();
      const todayStr = getTodayStr(); // YYYY-MM-DD
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`; // HH:MM

      records.forEach(rec => {
        // Only consider incomplete tasks with active reminder (not NONE)
        if (!rec.reminder || rec.reminder === 'NONE') return;
        if (canonicalStatus(rec.status) === 'Done' || canonicalStatus(rec.status) === 'Archived') return;

        const taskDueDate = rec.dueDate || rec.startTime;
        if (!taskDueDate) return;

        const targetDueObj = parseDateOnly(taskDueDate);
        if (!targetDueObj) return;

        // Calculate reminder date based on reminder option (D_DAY: 0, 1_DAY_BEFORE: 1, etc.)
        const opt = REMINDER_OPTIONS.find(o => o.id === rec.reminder);
        const daysBefore = opt && typeof opt.daysBefore === 'number' ? opt.daysBefore : 0;

        const reminderDateObj = new Date(targetDueObj);
        reminderDateObj.setDate(reminderDateObj.getDate() - daysBefore);
        const reminderDateStr = `${reminderDateObj.getFullYear()}-${String(reminderDateObj.getMonth() + 1).padStart(2, '0')}-${String(reminderDateObj.getDate()).padStart(2, '0')}`;

        // Scheduled reminder time (user customizable via reminderTime, default dueTime or 09:00)
        const scheduledTime = rec.reminderTime || rec.dueTime || DEFAULT_DUE_TIME;

        // Trigger condition: today is the reminder date and current time matches scheduled time
        if (todayStr === reminderDateStr && currentTimeStr === scheduledTime) {
          const uniqueFireKey = `${rec.id}-${reminderDateStr}-${scheduledTime}`;
          if (!notifiedTaskKeys.has(uniqueFireKey)) {
            setNotifiedTaskKeys(prev => new Set(prev).add(uniqueFireKey));

            // 1. Send Web / Browser Notification (Chrome popup + gentle audio chime)
            sendTaskNotification(rec);

            // 2. Also trigger In-App Apple Notification Toast
            setActiveNotificationToast(rec);
            setTimeout(() => {
              setActiveNotificationToast(null);
            }, 10000);
          }
        }
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [records, notifiedTaskKeys]);

  // Sync records to localStorage safely (preserve backup)
  useEffect(() => {
    try {
      localStorage.setItem('lark_task_records_clean_v1', JSON.stringify(records));
      if (records && records.length > 0) {
        localStorage.setItem('lark_backup_latest', JSON.stringify(records));
      }
    } catch (e) {
      console.error('Failed saving records:', e);
    }
  }, [records]);

  // Sync categories to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lark_business_lines_v1', JSON.stringify(categories));
    } catch (e) {
      console.error('Failed saving categories:', e);
    }
  }, [categories]);

  // Sync projects to localStorage + Supabase
  useEffect(() => {
    try {
      localStorage.setItem('lark_projects_v1', JSON.stringify(projects));
    } catch (e) {
      console.error('Failed saving projects to localStorage:', e);
    }
  }, [projects]);

  // Sync leaders/people to localStorage + Supabase
  useEffect(() => {
    try {
      localStorage.setItem('lark_leaders_v1', JSON.stringify(leaders));
    } catch (e) {
      console.error('Failed saving leaders to localStorage:', e);
    }
  }, [leaders]);

  // Add new leader/person dynamically
  const handleAddLeader = (newName) => {
    if (!newName) return null;
    const clean = newName.trim();
    if (!clean) return null;
    const exists = leaders.find(l => l.name.toLowerCase() === clean.toLowerCase());
    if (exists) return exists.name;

    const colors = [
      "bg-indigo-600 text-white",
      "bg-emerald-600 text-white",
      "bg-amber-600 text-white",
      "bg-sky-600 text-white",
      "bg-pink-600 text-white",
      "bg-purple-600 text-white",
      "bg-rose-600 text-white",
      "bg-teal-600 text-white",
      "bg-orange-600 text-white",
      "bg-blue-600 text-white"
    ];
    const words = clean.split(' ').filter(Boolean);
    const initials = words.length > 1
      ? (words[0][0] + words[1][0]).toUpperCase()
      : clean.slice(0, 2).toUpperCase();

    const newPerson = {
      name: clean,
      avatar: initials,
      role: 'Member',
      color: colors[leaders.length % colors.length]
    };
    setLeaders(prev => [...prev, newPerson]);
    // Sync new leader to Supabase immediately
    upsertLeaderToSupabase(newPerson).catch(e => console.warn('Failed to sync leader to Supabase:', e));
    return clean;
  };

  // Add new project
  const handleAddProject = (newProjName) => {
    if (!newProjName) return null;
    const clean = newProjName.trim();
    if (!clean) return null;
    const exists = projects.find(p => p.name.toLowerCase() === clean.toLowerCase());
    if (exists) return exists.name;

    const colors = [
      "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800",
      "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800",
      "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-800",
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
      "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800",
      "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800",
      "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
    ];
    const newObj = {
      name: clean,
      color: colors[projects.length % colors.length]
    };
    setProjects(prev => [...prev, newObj]);
    // Sync new project to Supabase immediately
    upsertProjectToSupabase(newObj).catch(e => console.warn('Failed to sync project to Supabase:', e));
    return clean;
  };

  // Add new business line category
  const handleAddCategory = (newCat) => {
    if (!newCat) return;
    const clean = newCat.trim().toUpperCase();
    if (!categories.includes(clean)) {
      setCategories(prev => [...prev, clean]);
    }
  };

  // Rename existing business line category
  const handleRenameCategory = (oldName, newName) => {
    if (!newName || oldName === newName) return;
    const cleanNew = newName.trim().toUpperCase();
    setCategories(prev => prev.map(c => (c === oldName ? cleanNew : c)));
    // Also update any records that belong to oldName
    setRecords(prev => prev.map(r => (r.businessLine === oldName ? { ...r, businessLine: cleanNew } : r)));
  };

  // Delete business line category
  const handleDeleteCategory = (catToDelete) => {
    if (window.confirm(`Hapus kategori "${catToDelete}"? Task di dalamnya akan dipindahkan ke OTHER.`)) {
      setCategories(prev => prev.filter(c => c !== catToDelete));
      setRecords(prev => prev.map(r => (r.businessLine === catToDelete ? { ...r, businessLine: 'OTHER' } : r)));
    }
  };

  // Create inline task directly in table without popup
  const handleCreateInlineTask = (groupName, taskName = '', parentId = null) => {
    const today = getTodayStr();

    // Check active filters (exclude status and dueDate):
    const defaultPriority = (kanbanPriorityFilter && kanbanPriorityFilter !== 'ALL') ? kanbanPriorityFilter : 'P1';
    const defaultProject = (kanbanProjectFilter && kanbanProjectFilter !== 'ALL')
      ? kanbanProjectFilter
      : (groupName === 'EMS' ? 'UID' : groupName === 'LPK OS' ? 'LPK OS' : 'BETTER FUTURE');
    const defaultLeader = (kanbanLeaderFilter && kanbanLeaderFilter !== 'ALL') ? kanbanLeaderFilter : 'Pierre Marchel';

    const newRec = {
      id: `rec-${Date.now()}`,
      task: taskName,
      priority: defaultPriority,
      project: defaultProject,
      status: 'Not yet started',
      taskLeader: defaultLeader,
      businessLine: groupName,
      startTime: today,
      dueDate: today,
      dueTime: DEFAULT_DUE_TIME,
      reminder: DEFAULT_REMINDER,
      notes: '',
      parentId: parentId || null
    };
    setRecords(prev => [...prev, newRec]);
    if (isSupabaseConfigured()) {
      upsertSingleTaskToSupabase(newRec);
    }
    logAction({
      taskName: newRec.task || 'Untitled Task',
      taskId: newRec.id,
      changeType: 'ADD',
      description: `Membuat task baru di kategori ${groupName} [${newRec.priority}]`,
      userName: newRec.taskLeader,
      isSubtask: false
    });
    return newRec.id;
  };

  // Create sub task for a specific parent record
  const handleCreateSubTask = (parentRecord, subTaskName = '') => {
    if (!parentRecord) return;
    const today = getTodayStr();

    // Use parent attributes, but if filter is active, filter can be respected or parent inherited
    const defaultPriority = (kanbanPriorityFilter && kanbanPriorityFilter !== 'ALL')
      ? kanbanPriorityFilter
      : (parentRecord.priority || 'P1');
    const defaultProject = (kanbanProjectFilter && kanbanProjectFilter !== 'ALL')
      ? kanbanProjectFilter
      : (parentRecord.project || 'BETTER FUTURE');
    const defaultLeader = (kanbanLeaderFilter && kanbanLeaderFilter !== 'ALL')
      ? kanbanLeaderFilter
      : (parentRecord.taskLeader || 'Pierre Marchel');

    const newRec = {
      id: `rec-${Date.now()}`,
      task: subTaskName,
      priority: defaultPriority,
      project: defaultProject,
      status: 'Not yet started', // Status always starts as "Not yet started" / NOT STARTED
      taskLeader: defaultLeader,
      businessLine: parentRecord.businessLine || 'BETTER FUTURE',
      startTime: today, // task start = today
      dueDate: today,   // task due date = today
      dueTime: parentRecord.dueTime || DEFAULT_DUE_TIME,
      reminder: parentRecord.reminder || DEFAULT_REMINDER,
      notes: '',
      parentId: parentRecord.id
    };
    setRecords(prev => [...prev, newRec]);
    if (isSupabaseConfigured()) {
      upsertSingleTaskToSupabase(newRec);
    }
    logAction({
      taskName: newRec.task || 'Untitled Sub-task',
      taskId: newRec.id,
      changeType: 'ADD',
      description: `Membuat sub-task baru di bawah "${parentRecord.task || 'Parent Task'}"`,
      userName: newRec.taskLeader,
      isSubtask: true
    });
    return newRec.id;
  };

  // Create task directly under a specific Task Leader (e.g. from Weekly Planning Report)
  const handleCreateTaskUnderLeader = (leaderName, taskData = {}) => {
    const today = getTodayStr();
    const taskDate = taskData.dueDate || today;
    const defaultPriority = taskData.priority || (kanbanPriorityFilter && kanbanPriorityFilter !== 'ALL' ? kanbanPriorityFilter : 'P1');
    const defaultProject = taskData.project || (kanbanProjectFilter && kanbanProjectFilter !== 'ALL' ? kanbanProjectFilter : 'BETTER FUTURE');
    const defaultCategory = taskData.businessLine || (categories && categories[0]) || 'BETTER FUTURE';

    const newRec = {
      id: `rec-${Date.now()}`,
      task: taskData.task || '',
      priority: defaultPriority,
      project: defaultProject,
      status: taskData.status || 'Not yet started',
      taskLeader: leaderName,
      businessLine: defaultCategory,
      element: taskData.element || 'E2',
      startTime: taskData.startTime || taskDate,
      dueDate: taskDate,
      dueTime: taskData.dueTime || DEFAULT_DUE_TIME,
      reminder: taskData.reminder || DEFAULT_REMINDER,
      notes: taskData.notes || '',
      parentId: null
    };

    setRecords(prev => [...prev, newRec]);
    if (isSupabaseConfigured()) {
      upsertSingleTaskToSupabase(newRec);
    }
    logAction({
      taskName: newRec.task || 'Untitled Task',
      taskId: newRec.id,
      changeType: 'ADD',
      description: `Membuat task di Weekly Planning untuk leader ${leaderName} [${newRec.priority}]`,
      userName: leaderName,
      isSubtask: false
    });
    return newRec;
  };

  // Open Add Record modal with a pre-filled Task Leader and due date
  const handleOpenAddRecordWithLeader = (leaderName, defaultDueDate = null) => {
    const today = getTodayStr();
    const taskDate = defaultDueDate || today;
    const defaultPriority = (kanbanPriorityFilter && kanbanPriorityFilter !== 'ALL') ? kanbanPriorityFilter : 'P1';
    const defaultProject = (kanbanProjectFilter && kanbanProjectFilter !== 'ALL') ? kanbanProjectFilter : 'BETTER FUTURE';

    setSelectedRecord({
      task: '',
      priority: defaultPriority,
      project: defaultProject,
      status: 'Not yet started',
      taskLeader: leaderName,
      businessLine: categories[0] || 'BETTER FUTURE',
      element: 'E2',
      startTime: taskDate,
      dueDate: taskDate,
      dueTime: DEFAULT_DUE_TIME,
      reminder: DEFAULT_REMINDER,
      notes: ''
    });
    setIsRecordModalOpen(true);
  };

  // Handle column header sort toggle
  const handleSort = (field) => {
    // Disallowed fields
    if (field === 'task' || field === 'notes') return;

    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        // Reset sort to default: dueDate asc (nearest to longest)
        setSortField('dueDate');
        setSortOrder('asc');
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filtered and Sorted records (Archived tasks excluded from task list and active kanban boards)
  const filteredRecords = records
    .filter(r => {
      if (elementFilter !== 'ALL' && r.element !== elementFilter) {
        return false;
      }
      if (canonicalStatus(r.status) === 'Archived') {
        return false;
      }
      // Priority filter
      if (kanbanPriorityFilter !== 'ALL' && r.priority !== kanbanPriorityFilter) {
        return false;
      }
      // Project filter
      if (kanbanProjectFilter !== 'ALL' && r.project !== kanbanProjectFilter) {
        return false;
      }
      // Status filter
      if (kanbanStatusFilter === 'ACTIVE') {
        const cs = canonicalStatus(r.status);
        if (cs === 'Done' || cs === 'Cancel' || cs === 'Pending' || cs === 'Archived') {
          return false;
        }
      } else if (kanbanStatusFilter !== 'ALL') {
        if (canonicalStatus(r.status) !== kanbanStatusFilter) {
          return false;
        }
      }
      // Task Leader filter
      if (kanbanLeaderFilter !== 'ALL' && r.taskLeader !== kanbanLeaderFilter) {
        return false;
      }
      // Due Date filter (Overdue, Due Today, Due this week, Future)
      if (kanbanDueDateFilter !== 'ALL' && !matchesDueDateFilter(r.dueDate || r.startTime, kanbanDueDateFilter)) {
        return false;
      }

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        (r.task && r.task.toLowerCase().includes(query)) ||
        (r.project && r.project.toLowerCase().includes(query)) ||
        (r.businessLine && r.businessLine.toLowerCase().includes(query)) ||
        (r.taskLeader && r.taskLeader.toLowerCase().includes(query)) ||
        (r.notes && r.notes.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      const activeSort = sortField || 'dueDate';
      const activeOrder = sortOrder || 'asc';

      let valA = a[activeSort];
      let valB = b[activeSort];

      // Due Date sorting: nearest to longest (earliest date first in asc)
      if (activeSort === 'dueDate') {
        const dateA = a.dueDate || a.startTime || '';
        const dateB = b.dueDate || b.startTime || '';
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1; // empty dates go to end
        if (!dateB) return -1;
        // Also compare dueTime if dates are equal
        const timeA = a.dueTime || DEFAULT_DUE_TIME;
        const timeB = b.dueTime || DEFAULT_DUE_TIME;
        const fullA = `${dateA}T${timeA}`;
        const fullB = `${dateB}T${timeB}`;
        if (fullA < fullB) return activeOrder === 'asc' ? -1 : 1;
        if (fullA > fullB) return activeOrder === 'asc' ? 1 : -1;
        return 0;
      }

      // Start Time sorting
      if (activeSort === 'startTime') {
        const dateA = a.startTime || '';
        const dateB = b.startTime || '';
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        if (dateA < dateB) return activeOrder === 'asc' ? -1 : 1;
        if (dateA > dateB) return activeOrder === 'asc' ? 1 : -1;
        return 0;
      }

      // Update Age sorting (elapsed days since latest update)
      if (activeSort === 'updateAge') {
        const getAgeDays = (rec) => {
          let dStr = null;
          if (Array.isArray(rec.updates) && rec.updates.length > 0) {
            dStr = rec.updates[0].date || (rec.updates[0].createdAt ? rec.updates[0].createdAt.split('T')[0] : null);
          } else if (rec.notes && rec.notes.trim()) {
            dStr = rec.updated_at ? rec.updated_at.split('T')[0] : (rec.dueDate || rec.startTime || null);
          }
          if (!dStr) return null;
          try {
            const parts = dStr.split('T')[0].split('-');
            if (parts.length < 3) return null;
            const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
          } catch (e) {
            return null;
          }
        };
        const ageA = getAgeDays(a);
        const ageB = getAgeDays(b);
        if (ageA === null && ageB === null) return 0;
        if (ageA === null) return 1;
        if (ageB === null) return -1;
        if (ageA < ageB) return activeOrder === 'asc' ? -1 : 1;
        if (ageA > ageB) return activeOrder === 'asc' ? 1 : -1;
        return 0;
      }

      // Priority ordering rank: P0 < P1 < P2 < P3
      if (activeSort === 'priority') {
        const priorityRank = { P0: 0, P1: 1, P2: 2, P3: 3 };
        valA = priorityRank[a.priority] !== undefined ? priorityRank[a.priority] : 99;
        valB = priorityRank[b.priority] !== undefined ? priorityRank[b.priority] : 99;
      } else if (activeSort === 'status') {
        const statusRank = {
          "Not yet started": 0, "NOT STARTED": 0,
          "Ongoing": 1, "ON GOING": 1,
          "In Review": 2, "IN REVIEW": 2,
          "Follow Up": 3, "FOLLOW UP": 3,
          "Done": 4, "DONE": 4,
          "Pending": 5, "PENDING": 5,
          "Cancel": 6, "CANCEL": 6,
          "Archived": 7, "ARCHIVED": 7
        };
        valA = statusRank[a.status] !== undefined ? statusRank[a.status] : 99;
        valB = statusRank[b.status] !== undefined ? statusRank[b.status] : 99;
      } else {
        // String comparison
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return activeOrder === 'asc' ? -1 : 1;
      if (valA > valB) return activeOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Handlers
  const handleUpdateRecord = (id, updates) => {
    const target = records.find(r => r.id === id);
    if (!target) return;

    const isArchiving = updates.status && canonicalStatus(updates.status) === 'Archived' && canonicalStatus(target.status) !== 'Archived';
    const isBusinessLineUpdated = updates.businessLine && updates.businessLine !== target.businessLine;

    // Find all descendant subtask IDs recursively if archiving or businessLine changed
    let descendantIds = [];
    if (isArchiving || isBusinessLineUpdated) {
      const queue = [id];
      while (queue.length > 0) {
        const currId = queue.shift();
        const children = records.filter(r => r.parentId === currId);
        for (const c of children) {
          descendantIds.push(c.id);
          queue.push(c.id);
        }
      }
    }

    // If archiving a parent task with child tasks, check if any child is unfinished
    if (isArchiving && descendantIds.length > 0) {
      const descendantRecords = records.filter(r => descendantIds.includes(r.id));
      const unfinishedTasks = descendantRecords.filter(r => {
        const cs = canonicalStatus(r.status);
        return cs !== 'Done' && cs !== 'Cancel' && cs !== 'Pending' && cs !== 'Archived';
      });

      if (unfinishedTasks.length > 0) {
        const sampleTasks = unfinishedTasks
          .slice(0, 4)
          .map(t => `• ${t.task || 'Untitled'} [${canonicalStatus(t.status)}]`)
          .join('\n');
        const extraCount = unfinishedTasks.length > 4 ? `\n...dan ${unfinishedTasks.length - 4} task lainnya` : '';
        const confirmMsg =
          `ARE YOU SURE?\n\n` +
          `There's task(s) that are not Done / Cancel / Pending:\n\n` +
          `${sampleTasks}${extraCount}\n\n` +
          `Archive this parent task and ALL its child tasks?\n` +
          `• Click OK to Archive all\n` +
          `• Click Cancel to Let it be`;

        const confirmed = window.confirm(confirmMsg);
        if (!confirmed) {
          // User selected Cancel / No -> "ELSE LET IT BE"
          // Force a state refresh so controlled inputs snap back to previous status
          setRecords(prev => [...prev]);
          return;
        }
      }
    }

    setRecords(prev => {
      return prev.map(r => {
        if (r.id === id) {
          const next = { ...r, ...updates };
          if (updates.status === 'Done' && r.status !== 'Done') {
            confetti({
              particleCount: 40,
              spread: 60,
              origin: { y: 0.8 },
              colors: ['#0284C7', '#10B981', '#F59E0B']
            });
          }
          return next;
        }
        // Cascade to descendant subtasks
        if (descendantIds.includes(r.id)) {
          let updatedChild = { ...r };
          if (isBusinessLineUpdated) {
            updatedChild.businessLine = updates.businessLine;
          }
          if (isArchiving) {
            updatedChild.status = 'Archived';
          }
          return updatedChild;
        }
        return r;
      });
    });

    // Background sync to Supabase
    if (isSupabaseConfigured()) {
      const target = records.find(r => r.id === id);
      if (target) {
        upsertSingleTaskToSupabase({ ...target, ...updates });
      }
      // If cascading to descendants, sync them too!
      if (descendantIds.length > 0) {
        descendantIds.forEach(childId => {
          const childTarget = records.find(r => r.id === childId);
          if (childTarget) {
            let childUpdate = { ...childTarget };
            if (isBusinessLineUpdated) childUpdate.businessLine = updates.businessLine;
            if (isArchiving) childUpdate.status = 'Archived';
            upsertSingleTaskToSupabase(childUpdate);
          }
        });
      }
    }

    // Activity Audit Logging
    try {
      const changedKeys = Object.keys(updates).filter(k => k !== 'updated_at');
      if (changedKeys.length > 0) {
        const descParts = [];
        let changeType = 'CHANGE';

        if (updates.task && updates.task !== target.task) {
          changeType = 'EDIT';
          descParts.push(`Nama task diubah menjadi "${updates.task}"`);
        }
        if (updates.status && updates.status !== target.status) {
          descParts.push(`Status diubah dari "${target.status}" ke "${updates.status}"`);
        }
        if (updates.priority && updates.priority !== target.priority) {
          descParts.push(`Priority diubah dari "${target.priority}" ke "${updates.priority}"`);
        }
        if (updates.dueDate && updates.dueDate !== target.dueDate) {
          descParts.push(`Due date diubah ke "${updates.dueDate}"`);
        }
        if (updates.taskLeader && updates.taskLeader !== target.taskLeader) {
          descParts.push(`Task leader diubah ke "${updates.taskLeader}"`);
        }
        if (updates.businessLine && updates.businessLine !== target.businessLine) {
          descParts.push(`Category diubah ke "${updates.businessLine}"`);
        }
        if (updates.project && updates.project !== target.project) {
          descParts.push(`Project diubah ke "${updates.project}"`);
        }
        if (updates.parentId !== undefined && updates.parentId !== target.parentId) {
          changeType = 'EDIT';
          descParts.push(updates.parentId ? `Dijadikan sub-task dari parent ID: ${updates.parentId}` : 'Diubah menjadi Task Utama');
        }
        if (updates.updates && Array.isArray(updates.updates) && (!target.updates || updates.updates.length > target.updates.length)) {
          changeType = 'EDIT';
          const latest = updates.updates[0];
          descParts.push(`Menambah progres update: "${latest?.text || ''}"`);
        } else if (updates.notes && updates.notes !== target.notes && !descParts.some(p => p.includes('progres update'))) {
          descParts.push(`Catatan/notes diperbarui: "${updates.notes}"`);
        }

        if (descParts.length === 0) {
          descParts.push(`Memperbarui properti: ${changedKeys.join(', ')}`);
        }

        logAction({
          taskName: updates.task || target.task || 'Untitled Task',
          taskId: target.id,
          changeType: changeType,
          description: descParts.join(' • '),
          userName: updates.taskLeader || target.taskLeader,
          isSubtask: Boolean(target.parentId || updates.parentId)
        });
      }
    } catch (err) {
      console.warn('Failed logging update action:', err);
    }
  };

  const handleSaveRecord = (formData) => {
    if (selectedRecord && selectedRecord.id) {
      // Edit
      handleUpdateRecord(selectedRecord.id, formData);
    } else {
      // Create new
      const newRec = {
        id: `rec-${Date.now()}`,
        ...formData
      };
      setRecords(prev => [newRec, ...prev]);
      if (isSupabaseConfigured()) {
        upsertSingleTaskToSupabase(newRec);
      }
      logAction({
        taskName: newRec.task || 'Untitled Task',
        taskId: newRec.id,
        changeType: 'ADD',
        description: `Membuat ${newRec.parentId ? 'sub-task' : 'task'} baru via modal [${newRec.priority} • ${newRec.businessLine}]`,
        userName: newRec.taskLeader,
        isSubtask: Boolean(newRec.parentId)
      });
    }
    setIsRecordModalOpen(false);
    setSelectedRecord(null);
  };

  const handleDeleteRecord = (id) => {
    const targetRec = records.find(r => r.id === id);
    const childTasks = records.filter(r => r.parentId === id);
    const hasSubTasks = childTasks.length > 0;
    const msg = hasSubTasks
      ? `Hapus "${targetRec?.task || 'Task'}" beserta semua sub-task di dalamnya?`
      : `Hapus "${targetRec?.task || 'Task'}"?`;

    if (window.confirm(msg)) {
      setRecords(prev => prev.filter(r => r.id !== id && r.parentId !== id));
      if (isSupabaseConfigured()) {
        deleteTaskFromSupabase(id);
        childTasks.forEach(child => deleteTaskFromSupabase(child.id));
      }
      logAction({
        taskName: targetRec?.task || 'Untitled Task',
        taskId: id,
        changeType: 'DELETE',
        description: hasSubTasks
          ? `Menghapus task parent beserta ${childTasks.length} sub-task terkait`
          : `Menghapus ${targetRec?.parentId ? 'sub-task' : 'task'}`,
        userName: targetRec?.taskLeader,
        isSubtask: Boolean(targetRec?.parentId)
      });
      setIsRecordModalOpen(false);
      setSelectedRecord(null);
    }
  };

  const handleOpenAddRecord = (presetParam = null) => {
    if (presetParam && typeof presetParam === 'string') {
      // User selected a category from dropdown: switch to table view and focus the inline add task directly under that category
      setActiveView('table');
      setIsRecordModalOpen(false);
      setSelectedRecord(null);
      setInlineAddCategory(null);
      setTimeout(() => {
        setInlineAddCategory(presetParam);
      }, 50);
    } else {
      // General Add Record button or custom preset object: open record modal with prefilled options
      const today = getTodayStr();
      const presets = (presetParam && typeof presetParam === 'object') ? presetParam : {};

      const defaultPriority = presets.priority || ((kanbanPriorityFilter && kanbanPriorityFilter !== 'ALL') ? kanbanPriorityFilter : 'P1');
      const defaultProject = presets.project || ((kanbanProjectFilter && kanbanProjectFilter !== 'ALL') ? kanbanProjectFilter : 'BETTER FUTURE');
      const defaultLeader = presets.taskLeader || ((kanbanLeaderFilter && kanbanLeaderFilter !== 'ALL') ? kanbanLeaderFilter : 'Pierre Marchel');
      const defaultCategory = presets.businessLine || categories[0] || 'BETTER FUTURE';
      const defaultStatus = presets.status || 'Not yet started';
      const defaultDueDate = presets.dueDate || today;
      const defaultStartTime = presets.startTime || today;

      setSelectedRecord({
        task: presets.task || '',
        priority: defaultPriority,
        project: defaultProject,
        status: defaultStatus,
        taskLeader: defaultLeader,
        businessLine: defaultCategory,
        element: presets.element || 'E2',
        startTime: defaultStartTime,
        dueDate: defaultDueDate,
        dueTime: presets.dueTime || DEFAULT_DUE_TIME,
        reminder: presets.reminder || DEFAULT_REMINDER,
        notes: presets.notes || ''
      });
      setIsRecordModalOpen(true);
    }
  };

  const handleAddRecordInGroup = (groupName) => {
    const today = getTodayStr();
    const defaultPriority = (kanbanPriorityFilter && kanbanPriorityFilter !== 'ALL') ? kanbanPriorityFilter : 'P1';
    const defaultProject = (kanbanProjectFilter && kanbanProjectFilter !== 'ALL')
      ? kanbanProjectFilter
      : (groupName === 'EMS' ? 'UID' : groupName === 'LPK OS' ? 'LPK OS' : 'BETTER FUTURE');
    const defaultLeader = (kanbanLeaderFilter && kanbanLeaderFilter !== 'ALL') ? kanbanLeaderFilter : 'Pierre Marchel';

    setSelectedRecord({
      task: '',
      priority: defaultPriority,
      project: defaultProject,
      status: 'Not yet started',
      taskLeader: defaultLeader,
      businessLine: groupName,
      element: 'E2',
      startTime: today,
      dueDate: today,
      dueTime: DEFAULT_DUE_TIME,
      reminder: DEFAULT_REMINDER,
      notes: ''
    });
    setIsRecordModalOpen(true);
  };

  const handleSelectRecord = (record) => {
    setSelectedRecord(record);
    setIsRecordModalOpen(true);
  };

  const handleOpenSidePeek = (record) => {
    setSelectedRecord(record);
    setIsSidePeekOpen(true);
  };

  const handleResetData = () => {
    if (window.confirm("Kosongkan semua task (bersihkan data)?")) {
      setRecords([]);
      localStorage.removeItem('lark_task_records_clean_v1');
    }
  };

  const handleRestoreRecords = (restoredList) => {
    if (!Array.isArray(restoredList) || restoredList.length === 0) return;
    const parentMap = new Map();
    restoredList.forEach(r => {
      if (!r.parentId) parentMap.set(r.id, r.businessLine);
    });
    const healed = restoredList.map(r => {
      const updated = {
        ...r,
        dueTime: r.dueTime || DEFAULT_DUE_TIME,
        reminder: r.reminder || 'NONE'
      };
      if (r.parentId && parentMap.has(r.parentId)) {
        updated.businessLine = parentMap.get(r.parentId);
      }
      return updated;
    });

    setRecords(healed);
    try {
      localStorage.setItem('lark_task_records_clean_v1', JSON.stringify(healed));
      localStorage.setItem('lark_backup_latest', JSON.stringify(healed));
    } catch (e) {}

    // Synchronize categories if any new businessLine found
    const distinctCats = Array.from(new Set(healed.map(r => r.businessLine).filter(Boolean)));
    if (distinctCats.length > 0) {
      setCategories(prev => {
        const merged = Array.from(new Set([...prev, ...distinctCats]));
        try {
          localStorage.setItem('lark_business_lines_v1', JSON.stringify(merged));
        } catch (e) {}
        return merged;
      });
    }
  };

  const handleRestoreFromStorage = () => {
    setIsBackupModalOpen(true);
  };

  const handleLoadTemplateData = () => {
    const defaultData = EXPORTED_WEEKLY_RECORDS && EXPORTED_WEEKLY_RECORDS.length > 0
      ? EXPORTED_WEEKLY_RECORDS
      : INITIAL_RECORDS.map(r => ({
          ...r,
          dueTime: r.dueTime || DEFAULT_DUE_TIME,
          reminder: 'NONE'
        }));
    handleRestoreRecords(defaultData);
  };

  const handleExportData = (exportType = 'excel_weekly') => {
    if (exportType === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `lark_tasks_backup.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      return;
    }

    // Default: Export Excel focused on Weekly Planning with exact screen view formatting
    exportWeeklyPlanningExcel({
      records
    });
  };

  // Unified records for all Kanban views (filtered by search, element, and the navbar kanban filters)
  const kanbanRecords = useMemo(() => {
    return records.filter(r => {
      if (elementFilter !== 'ALL' && r.element !== elementFilter) return false;
      
      // 1. Kanban Priority filter
      if (kanbanPriorityFilter !== 'ALL' && r.priority !== kanbanPriorityFilter) return false;
      
      // 2. Kanban Project filter
      if (kanbanProjectFilter !== 'ALL' && r.project !== kanbanProjectFilter) return false;
      
      // 3. Kanban Task Leader filter
      if (kanbanLeaderFilter !== 'ALL' && r.taskLeader !== kanbanLeaderFilter) return false;
      
      // 4. Kanban Due Date filter (Overdue, Due Today, Due this week, Future)
      if (kanbanDueDateFilter !== 'ALL' && !matchesDueDateFilter(r.dueDate || r.startTime, kanbanDueDateFilter)) return false;

      // 5. Kanban Status filter (Progress kanban displays ALL status columns unless explicit single status filter is selected)
      if (activeView === 'progress') {
        if (kanbanStatusFilter !== 'ALL' && kanbanStatusFilter !== 'ACTIVE') {
          if (canonicalStatus(r.status) !== kanbanStatusFilter) return false;
        }
      } else {
        if (kanbanStatusFilter === 'ACTIVE') {
          const cs = canonicalStatus(r.status);
          if (cs === 'Done' || cs === 'Cancel' || cs === 'Pending' || cs === 'Archived') return false;
        } else if (kanbanStatusFilter !== 'ALL') {
          if (canonicalStatus(r.status) !== kanbanStatusFilter) return false;
        } else {
          // Default: If statusFilter is 'ALL', hide Archived tasks in priority, leader, and due_date kanbans
          if (canonicalStatus(r.status) === 'Archived') return false;
        }
      }

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        (r.task && r.task.toLowerCase().includes(query)) ||
        (r.project && r.project.toLowerCase().includes(query)) ||
        (r.businessLine && r.businessLine.toLowerCase().includes(query)) ||
        (r.taskLeader && r.taskLeader.toLowerCase().includes(query)) ||
        (r.notes && r.notes.toLowerCase().includes(query))
      );
    });
  }, [
    records,
    elementFilter,
    searchQuery,
    kanbanPriorityFilter,
    kanbanProjectFilter,
    kanbanLeaderFilter,
    kanbanStatusFilter,
    kanbanDueDateFilter,
    activeView
  ]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#161618] text-neutral-900 dark:text-neutral-100 flex flex-col font-sans transition-colors selection:bg-apple-blue/20 selection:text-apple-blue">
      
      {/* Lark Base Navigation & Actions Toolbar */}
      <LarkNavbar
        activeView={activeView}
        setActiveView={setActiveView}
        onAddRecord={handleOpenAddRecord}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        elementFilter={elementFilter}
        setElementFilter={setElementFilter}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        onExportData={handleExportData}
        onResetData={handleResetData}
        onRestoreData={handleRestoreFromStorage}
        onLoadTemplateData={handleLoadTemplateData}
        totalRecords={records.length}
        kanbanPriorityFilter={kanbanPriorityFilter}
        setKanbanPriorityFilter={setKanbanPriorityFilter}
        kanbanProjectFilter={kanbanProjectFilter}
        setKanbanProjectFilter={setKanbanProjectFilter}
        kanbanStatusFilter={kanbanStatusFilter}
        setKanbanStatusFilter={setKanbanStatusFilter}
        kanbanLeaderFilter={kanbanLeaderFilter}
        setKanbanLeaderFilter={setKanbanLeaderFilter}
        kanbanDueDateFilter={kanbanDueDateFilter}
        setKanbanDueDateFilter={setKanbanDueDateFilter}
        activeKanbanFiltersCount={activeKanbanFiltersCount}
        onResetKanbanFilters={handleResetKanbanFilters}
        projects={sortedProjects}
        leaders={leaders}
        categories={categories}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
        allRecords={records}
        dismissedNotifIds={dismissedNotifIds}
        onDismissNotification={handleDismissNotification}
        onDismissAllNotifications={handleDismissAllNotifications}
        onSelectRecord={handleOpenSidePeek}
        activityLogs={activityLogs}
        onUpdateActivityLogs={setActivityLogs}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 p-3 sm:p-5 max-w-[1700px] w-full mx-auto">
        
        {/* Safe Data Recovery Banner if records are empty */}
        {records.length === 0 && (
          <div className="mb-5 p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Data Belum Tampil atau Baru Saja Dibersihkan
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ingin memulihkan data tugas yang pernah diinput dari cache browser, atau memuat template data Lark Base?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={handleRestoreFromStorage}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Pulihkan dari Cache Browser</span>
              </button>
              <button
                onClick={handleLoadTemplateData}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Muat Data Asli Lark (EMS, BF, LPK, MKT)</span>
              </button>
            </div>
          </div>
        )}
        
        {/* View 1: Task List (Lark Table View matching screenshot) */}
        {activeView === 'table' && (
          <LarkTable
            records={filteredRecords}
            categories={categories}
            projects={sortedProjects}
            leaders={leaders}
            onAddLeader={handleAddLeader}
            onAddProject={handleAddProject}
            onAddCategory={handleAddCategory}
            onRenameCategory={handleRenameCategory}
            onDeleteCategory={handleDeleteCategory}
            onInlineAddTask={handleCreateInlineTask}
            onInlineAddSubTask={handleCreateSubTask}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
            onUpdateRecord={handleUpdateRecord}
            onAddRecordInGroup={handleAddRecordInGroup}
            onSelectRecord={handleSelectRecord}
            onOpenRecord={handleOpenSidePeek}
            onDeleteRecord={handleDeleteRecord}
            selectedRecordId={selectedRecord ? selectedRecord.id : null}
            isSidePeekOpen={isSidePeekOpen}
            inlineAddCategory={inlineAddCategory}
            setInlineAddCategory={setInlineAddCategory}
            kanbanPriorityFilter={kanbanPriorityFilter}
            kanbanProjectFilter={kanbanProjectFilter}
            kanbanLeaderFilter={kanbanLeaderFilter}
          />
        )}

        {/* View 2: Priority Kanban */}
        {activeView === 'priority' && (
          <KanbanView
            records={kanbanRecords}
            viewType="priority"
            projects={sortedProjects}
            leaders={leaders}
            onAddLeader={handleAddLeader}
            onUpdateRecord={handleUpdateRecord}
            onAddRecord={handleOpenAddRecord}
            onSelectRecord={handleOpenSidePeek}
            selectedRecordId={selectedRecord ? selectedRecord.id : null}
            isSidePeekOpen={isSidePeekOpen}
          />
        )}

        {/* View 4: Leader Kanban */}
        {activeView === 'leader' && (
          <KanbanView
            records={kanbanRecords}
            viewType="leader"
            projects={sortedProjects}
            leaders={leaders}
            onAddLeader={handleAddLeader}
            onUpdateRecord={handleUpdateRecord}
            onAddRecord={handleOpenAddRecord}
            onSelectRecord={handleOpenSidePeek}
            selectedRecordId={selectedRecord ? selectedRecord.id : null}
            isSidePeekOpen={isSidePeekOpen}
          />
        )}

        {/* View 5: Progress Kanban */}
        {activeView === 'progress' && (
          <KanbanView
            records={kanbanRecords}
            viewType="status"
            projects={sortedProjects}
            leaders={leaders}
            onAddLeader={handleAddLeader}
            onUpdateRecord={handleUpdateRecord}
            onAddRecord={handleOpenAddRecord}
            onSelectRecord={handleOpenSidePeek}
            selectedRecordId={selectedRecord ? selectedRecord.id : null}
            isSidePeekOpen={isSidePeekOpen}
          />
        )}

        {/* View 6: Calendar View (Task Due Date Focus) */}
        {activeView === 'calendar' && (
          <CalendarView
            records={records}
            projects={sortedProjects}
            leaders={leaders}
            onUpdateRecord={handleUpdateRecord}
            onAddRecord={handleOpenAddRecord}
            onSelectRecord={handleOpenSidePeek}
            onOpenRecord={handleOpenSidePeek}
            priorityFilter={kanbanPriorityFilter}
            setPriorityFilter={setKanbanPriorityFilter}
            projectFilter={kanbanProjectFilter}
            setProjectFilter={setKanbanProjectFilter}
            statusFilter={kanbanStatusFilter}
            setStatusFilter={setKanbanStatusFilter}
            leaderFilter={kanbanLeaderFilter}
            setLeaderFilter={setKanbanLeaderFilter}
            activeFiltersCount={activeKanbanFiltersCount}
            onResetFilters={handleResetKanbanFilters}
          />
        )}

        {/* View 7: Task Due Kanban (Overdue, Due Today, Due this week, Future) */}
        {activeView === 'due_date' && (
          <KanbanView
            records={kanbanRecords}
            viewType="due_date"
            projects={sortedProjects}
            leaders={leaders}
            onAddLeader={handleAddLeader}
            onUpdateRecord={handleUpdateRecord}
            onAddRecord={handleOpenAddRecord}
            onSelectRecord={handleOpenSidePeek}
            selectedRecordId={selectedRecord ? selectedRecord.id : null}
            isSidePeekOpen={isSidePeekOpen}
          />
        )}

        {/* View 8: Reporting > Operasional > Weekly Planning */}
        {activeView === 'weekly_planning' && (
          <WeeklyPlanningReport
            records={records}
            projects={sortedProjects}
            leaders={leaders}
            categories={categories}
            onOpenRecord={handleOpenSidePeek}
            onOpenAddRecordWithLeader={handleOpenAddRecordWithLeader}
            onAddTaskUnderLeader={handleCreateTaskUnderLeader}
            onUpdateRecord={handleUpdateRecord}
          />
        )}

      </main>

      {/* Notion-style Side Peek Drawer */}
      <NotionSidePeek
        isOpen={isSidePeekOpen}
        onClose={() => {
          setIsSidePeekOpen(false);
          setSelectedRecord(null);
        }}
        record={selectedRecord ? (records.find(r => r.id === selectedRecord.id) || selectedRecord) : null}
        allRecords={records}
        projects={sortedProjects}
        categories={categories}
        leaders={leaders}
        onAddLeader={handleAddLeader}
        onAddProject={handleAddProject}
        onUpdateRecord={handleUpdateRecord}
        onDeleteRecord={handleDeleteRecord}
        onAddSubTask={handleCreateSubTask}
        onOpenRecord={handleOpenSidePeek}
      />

      {/* Record Modal */}
      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setSelectedRecord(null);
        }}
        record={selectedRecord}
        categories={categories}
        projects={sortedProjects}
        leaders={leaders}
        onAddLeader={handleAddLeader}
        onAddProject={handleAddProject}
        onAddCategory={handleAddCategory}
        onSave={handleSaveRecord}
        onDelete={handleDeleteRecord}
      />

      {/* Backup & Restore Data Manager Modal */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        currentRecords={records}
        onRestoreRecords={handleRestoreRecords}
        onExportRecords={handleExportData}
        onLoadTemplate={handleLoadTemplateData}
      />

      {/* Floating Apple-style Reminder Banner Toast */}
      {activeNotificationToast && (
        <div
          onClick={() => handleOpenSidePeek(activeNotificationToast)}
          className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-white/95 dark:bg-[#1e1e20]/95 backdrop-blur-2xl border border-amber-500/30 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.3)] p-4 flex items-start gap-3.5 cursor-pointer animate-in slide-in-from-bottom-5 duration-300 ring-1 ring-amber-500/20 group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 dark:bg-amber-500/25 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-2xs">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                ⏰ Reminder Task
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveNotificationToast(null);
                }}
                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 mt-0.5 line-clamp-1 group-hover:text-apple-blue transition">
              {activeNotificationToast.task}
            </h4>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Jatuh tempo: {activeNotificationToast.dueDate || 'Hari ini'}</span>
              <span>•</span>
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                @{activeNotificationToast.reminderTime || activeNotificationToast.dueTime || DEFAULT_DUE_TIME}
              </span>
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
