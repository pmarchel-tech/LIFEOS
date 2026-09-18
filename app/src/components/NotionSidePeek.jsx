import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Calendar,
  User,
  Tag,
  Clock,
  Bell,
  BellOff,
  Layers,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  History,
  GitCommit,
  Save
} from 'lucide-react';
import {
  BUSINESS_LINES,
  PROJECTS,
  PRIORITIES,
  STATUSES,
  LEADERS,
  REMINDER_OPTIONS,
  DEFAULT_DUE_TIME,
  DEFAULT_REMINDER,
  getStatusConfig,
  canonicalStatus
} from '../data/initialData';
import { ModernTimePicker } from './ModernTimePicker';

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateStr = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function NotionSidePeek({
  isOpen,
  onClose,
  record,
  allRecords = [],
  projects = PROJECTS,
  categories = BUSINESS_LINES,
  leaders = LEADERS,
  onAddLeader,
  onAddProject,
  onUpdateRecord,
  onDeleteRecord,
  onOpenRecord
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  // Update input state (default date today)
  const [updateDate, setUpdateDate] = useState(() => getTodayStr());
  const [updateText, setUpdateText] = useState('');

  // History edit state
  const [editingUpdateId, setEditingUpdateId] = useState(null);
  const [editingUpdateDate, setEditingUpdateDate] = useState('');
  const [editingUpdateText, setEditingUpdateText] = useState('');

  // Ref to automatically focus progress update textarea when opening side peek
  const updateInputRef = useRef(null);

  // Synchronize title and reset update inputs when record changes, and auto-focus textarea
  useEffect(() => {
    if (record) {
      setTitleValue(record.task || '');
      setUpdateDate(getTodayStr());
      setUpdateText('');
      setEditingUpdateId(null);
    }
    if (isOpen && record) {
      const timer = setTimeout(() => {
        if (updateInputRef.current) {
          updateInputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [record?.id, isOpen]);

  // Normalized updates array (handles backwards compatibility with record.notes)
  const getRecordUpdates = () => {
    if (!record) return [];
    if (Array.isArray(record.updates) && record.updates.length > 0) {
      return record.updates;
    }
    if (record.notes && record.notes.trim()) {
      return [{
        id: `legacy-${record.id}`,
        date: record.dueDate || record.startTime || getTodayStr(),
        text: record.notes.trim()
      }];
    }
    return [];
  };

  const updatesList = getRecordUpdates();

  // Save new update entry
  const handleSaveNewUpdate = (e) => {
    e?.preventDefault();
    if (!record || !updateText.trim()) return;

    const newEntry = {
      id: `upd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: updateDate || getTodayStr(),
      text: updateText.trim(),
      createdAt: new Date().toISOString()
    };

    const updatedList = [newEntry, ...updatesList];
    onUpdateRecord(record.id, {
      updates: updatedList,
      notes: newEntry.text // Keeps table 'Latest update' column and Kanban synced
    });

    setUpdateText('');
    setUpdateDate(getTodayStr());
  };

  // Start editing a history entry
  const handleStartEdit = (item) => {
    setEditingUpdateId(item.id);
    setEditingUpdateDate(item.date || getTodayStr());
    setEditingUpdateText(item.text || '');
  };

  // Save edited history entry
  const handleSaveEdit = (itemId) => {
    if (!record || !editingUpdateText.trim()) return;

    const updatedList = updatesList.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          date: editingUpdateDate || item.date || getTodayStr(),
          text: editingUpdateText.trim()
        };
      }
      return item;
    });

    onUpdateRecord(record.id, {
      updates: updatedList,
      notes: updatedList[0]?.text || ''
    });

    setEditingUpdateId(null);
  };

  // Delete a history entry
  const handleDeleteUpdate = (itemId) => {
    if (!record) return;
    if (window.confirm('Hapus riwayat update ini?')) {
      const updatedList = updatesList.filter(item => item.id !== itemId);
      onUpdateRecord(record.id, {
        updates: updatedList,
        notes: updatedList[0]?.text || ''
      });
      if (editingUpdateId === itemId) {
        setEditingUpdateId(null);
      }
    }
  };

  // Keyboard shortcut: Alt + S (or Ctrl/Cmd + Enter) to save update
  useEffect(() => {
    if (!isOpen || !record) return;

    const handleKeyDown = (e) => {
      // Check for Alt + S (or Alt + s) or Ctrl+Enter / Cmd+Enter
      const isAltS = e.altKey && (e.key === 's' || e.key === 'S');
      const isCtrlEnter = (e.ctrlKey || e.metaKey) && e.key === 'Enter';

      if (isAltS || isCtrlEnter) {
        // If user is currently editing an item in the history update list
        if (editingUpdateId) {
          e.preventDefault();
          e.stopPropagation();
          handleSaveEdit(editingUpdateId);
          return;
        }

        // If user has entered text in the new update textarea
        if (updateText.trim()) {
          e.preventDefault();
          e.stopPropagation();
          handleSaveNewUpdate(e);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, record?.id, updateText, updateDate, editingUpdateId, editingUpdateText, editingUpdateDate, updatesList]);

  if (!isOpen || !record) return null;

  const currentLeaders = leaders || LEADERS;
  const statusCfg = getStatusConfig(record.status);
  const projectCfg = projects.find(p => p.name === record.project) || {
    color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  };
  const prioCfg = PRIORITIES[record.priority] || PRIORITIES.P1;
  const currentLeader = currentLeaders.find(l => l.name === record.taskLeader) || {
    name: record.taskLeader || '?',
    avatar: record.taskLeader ? record.taskLeader.slice(0, 2).toUpperCase() : '?',
    color: 'bg-slate-600 text-white'
  };

  // If this record has a parent task, find its details
  const parentTask = record.parentId ? allRecords.find(r => r.id === record.parentId) : null;

  // Available candidates to be chosen as parent task:
  // - Must not be a sub-task itself (!r.parentId)
  // - Same category / business line as this record
  // - Status must NOT be Done, Cancel, Pending, or Archived (except if it is already the current parent)
  // - Excluding self
  // - Sorted alphabetically ascending A-Z by task name
  const excludedStatuses = ['Done', 'Cancel', 'Pending', 'Archived'];
  const candidateParents = allRecords
    .filter(r => {
      if (r.id === record.id) return false;
      if (r.parentId) return false; // Bukan tipe sub task
      if (record.businessLine && r.businessLine !== record.businessLine) return false; // Hanya category itu saja
      if (r.id !== record.parentId && excludedStatuses.includes(canonicalStatus(r.status))) return false;
      return true;
    })
    .sort((a, b) => (a.task || '').localeCompare(b.task || '', undefined, { sensitivity: 'base' }));

  const handleTitleSubmit = () => {
    if (titleValue.trim() && titleValue !== record.task) {
      onUpdateRecord(record.id, { task: titleValue.trim() });
    }
    setIsEditingTitle(false);
  };

  // + Fri: Move due date to the next Friday relative to today (or +7 days if already that Friday)
  const handleSetNextFriday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0: Sun, 1: Mon, ... 5: Fri, 6: Sat
    let daysUntilFri = (5 - dayOfWeek + 7) % 7;
    if (daysUntilFri === 0) daysUntilFri = 7; // If today is Friday, next Friday is in 7 days

    const nextFri = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilFri);
    const nextFriStr = formatDateStr(nextFri);

    if (record.dueDate === nextFriStr) {
      const followingFri = new Date(nextFri.getFullYear(), nextFri.getMonth(), nextFri.getDate() + 7);
      onUpdateRecord(record.id, { dueDate: formatDateStr(followingFri) });
    } else {
      onUpdateRecord(record.id, { dueDate: nextFriStr });
    }
  };

  // + 7D: Move due date +7 days from existing due date (or today +7 days if none set)
  const handleAdd7Days = () => {
    let baseDate = new Date();
    if (record.dueDate) {
      const parts = record.dueDate.split('-').map(Number);
      if (parts.length === 3) {
        baseDate = new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }
    const newDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 7);
    onUpdateRecord(record.id, { dueDate: formatDateStr(newDate) });
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full z-40 bg-white dark:bg-[#191919] border-l border-slate-200 dark:border-neutral-800 shadow-2xl flex flex-col transition-all duration-200 ease-in-out font-sans ${
        isExpanded ? 'w-full md:w-[85vw] lg:w-[75vw]' : 'w-full sm:w-[600px] lg:w-[680px]'
      }`}
    >
      {/* Top Action Bar */}
      <div className="h-12 px-4 border-b border-slate-200 dark:border-neutral-800/80 flex items-center justify-between text-slate-500 dark:text-neutral-400 select-none shrink-0 bg-slate-50/50 dark:bg-[#191919] relative">
        {/* Left top icons & breadcrumb */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-neutral-800 rounded transition text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white"
            title={isExpanded ? 'Collapse to side peek' : 'Expand to wide view'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <span className="text-slate-300 dark:text-neutral-700">|</span>
          {parentTask ? (
            <div className="flex items-center gap-1.5 truncate max-w-[220px]">
              <span className="text-[11px] text-slate-400 dark:text-neutral-500">Subtask of:</span>
              <button
                onClick={() => onOpenRecord && onOpenRecord(parentTask)}
                className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate"
                title={parentTask.task}
              >
                {parentTask.task}
              </button>
            </div>
          ) : (
            <span className="text-[11px] font-medium text-slate-400 dark:text-neutral-500 uppercase tracking-wider">
              {record.businessLine || 'Task Details'}
            </span>
          )}
        </div>

        {/* Center: Delete Task Button (separated far from Close X button) */}
        <div className="flex items-center justify-center">
          <button
            onClick={() => {
              if (window.confirm(`Hapus task "${record.task}"?`)) {
                onDeleteRecord(record.id);
                onClose();
              }
            }}
            className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition cursor-pointer flex items-center gap-1.5 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 active:scale-95"
            title="Hapus Task Ini"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-[11px]">Hapus</span>
          </button>
        </div>

        {/* Right top icons (Only Close button) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200/60 dark:hover:bg-neutral-800 rounded transition text-slate-500 dark:text-neutral-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 text-slate-800 dark:text-neutral-200 space-y-4">
        
        {/* 1. Task Title (Editable Notion-like Title) */}
        <div className="group/title relative">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              className="w-full text-2xl sm:text-3xl font-extrabold bg-transparent text-slate-900 dark:text-white border-b-2 border-blue-500 focus:outline-none pb-1"
              autoFocus
            />
          ) : (
            <h1
              onClick={() => setIsEditingTitle(true)}
              className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug cursor-pointer hover:opacity-80 transition flex items-center justify-between gap-3"
              title="Klik untuk ubah judul"
            >
              <span>{record.task || <span className="text-slate-400 italic font-normal">Untitled Task</span>}</span>
              <Edit2 className="w-4 h-4 text-slate-400 opacity-0 group-hover/title:opacity-100 transition shrink-0" />
            </h1>
          )}
        </div>

        {/* 2. Properties Section - Apple / Notion Modern Clean Inspector */}
        <div className="space-y-3">
          {/* Metadata Card */}
          <div className="py-2 px-3 rounded-xl bg-slate-50/70 dark:bg-neutral-900/60 border border-slate-200/80 dark:border-neutral-800/80 text-xs shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
              
              {/* 1. Priority */}
              <div className="flex items-center h-7 px-1.5 rounded-lg hover:bg-white/80 dark:hover:bg-neutral-800/60 transition group/prop">
                <div className="w-24 flex items-center gap-1.5 text-slate-400 dark:text-neutral-500 font-medium shrink-0 select-none text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                  <span>Priority</span>
                </div>
                <div className="flex-1 min-w-0">
                  <select
                    value={record.priority || 'P1'}
                    onChange={(e) => onUpdateRecord(record.id, { priority: e.target.value })}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded border cursor-pointer focus:outline-none ${prioCfg.color}`}
                  >
                    {Object.keys(PRIORITIES).map(p => (
                      <option key={p} value={p} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-medium">
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Status */}
              <div className="flex items-center h-7 px-1.5 rounded-lg hover:bg-white/80 dark:hover:bg-neutral-800/60 transition group/prop">
                <div className="w-24 flex items-center gap-1.5 text-slate-400 dark:text-neutral-500 font-medium shrink-0 select-none text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80 shrink-0" />
                  <span>Status</span>
                </div>
                <div className="flex-1 min-w-0">
                  <select
                    value={canonicalStatus(record.status)}
                    onChange={(e) => onUpdateRecord(record.id, { status: e.target.value })}
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none ${statusCfg.color}`}
                  >
                    {Object.entries(STATUSES).map(([key, cfg]) => (
                      <option key={key} value={key} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-medium">
                        {cfg.label || key}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Project */}
              <div className="flex items-center h-7 px-1.5 rounded-lg hover:bg-white/80 dark:hover:bg-neutral-800/60 transition group/prop">
                <div className="w-24 flex items-center gap-1.5 text-slate-400 dark:text-neutral-500 font-medium shrink-0 select-none text-[11px]">
                  <Tag className="w-3.5 h-3.5 text-purple-500/80 shrink-0" />
                  <span>Project</span>
                </div>
                <div className="flex-1 min-w-0">
                  <select
                    value={record.project || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__ADD_NEW__') {
                        const input = window.prompt('Masukkan nama project baru:');
                        if (input && input.trim()) {
                          const created = onAddProject ? onAddProject(input.trim()) : input.trim();
                          onUpdateRecord(record.id, { project: created });
                        }
                      } else {
                        onUpdateRecord(record.id, { project: val });
                      }
                    }}
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded border cursor-pointer focus:outline-none max-w-[150px] truncate ${projectCfg.color}`}
                  >
                    {[...projects].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })).map(p => (
                      <option key={p.name} value={p.name} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-medium">
                        {p.name}
                      </option>
                    ))}
                    <option disabled className="bg-white dark:bg-slate-900 text-slate-400">──────────</option>
                    <option value="__ADD_NEW__" className="bg-white dark:bg-slate-900 text-blue-600 font-bold">
                      + Add New Project
                    </option>
                  </select>
                </div>
              </div>

              {/* 4. Task leader */}
              <div className="flex items-center h-7 px-1.5 rounded-lg hover:bg-white/80 dark:hover:bg-neutral-800/60 transition group/prop">
                <div className="w-24 flex items-center gap-1.5 text-slate-400 dark:text-neutral-500 font-medium shrink-0 select-none text-[11px]">
                  <User className="w-3.5 h-3.5 text-blue-500/80 shrink-0" />
                  <span>Task leader</span>
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${currentLeader.color}`}>
                    {currentLeader.avatar}
                  </div>
                  <select
                    value={record.taskLeader || (currentLeaders[0] && currentLeaders[0].name) || 'Pierre Marchel'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__ADD_PERSON__') {
                        const input = window.prompt('Tambahkan person baru (Nama):');
                        if (input && input.trim()) {
                          const created = onAddLeader ? onAddLeader(input.trim()) : input.trim();
                          onUpdateRecord(record.id, { taskLeader: created });
                        }
                      } else {
                        onUpdateRecord(record.id, { taskLeader: val });
                      }
                    }}
                    className="bg-transparent hover:bg-slate-200/50 dark:hover:bg-neutral-800 px-1.5 py-0.5 rounded text-[11px] font-medium text-slate-700 dark:text-neutral-300 border border-transparent hover:border-slate-200 dark:hover:border-neutral-700 focus:outline-none focus:border-blue-500 cursor-pointer max-w-[130px] truncate"
                  >
                    {currentLeaders.map(l => (
                      <option key={l.name} value={l.name} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-medium">
                        {l.name}
                      </option>
                    ))}
                    <option disabled className="bg-white dark:bg-slate-900 text-slate-400">──────────</option>
                    <option value="__ADD_PERSON__" className="bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold">
                      + person
                    </option>
                  </select>
                </div>
              </div>

              {/* 5. Business line */}
              <div className="flex items-center h-7 px-1.5 rounded-lg hover:bg-white/80 dark:hover:bg-neutral-800/60 transition group/prop">
                <div className="w-24 flex items-center gap-1.5 text-slate-400 dark:text-neutral-500 font-medium shrink-0 select-none text-[11px]">
                  <Layers className="w-3.5 h-3.5 text-cyan-500/80 shrink-0" />
                  <span>Category</span>
                </div>
                <div className="flex-1 min-w-0">
                  <select
                    value={record.businessLine || ''}
                    onChange={(e) => onUpdateRecord(record.id, { businessLine: e.target.value })}
                    className="bg-transparent hover:bg-slate-200/50 dark:hover:bg-neutral-800 px-1.5 py-0.5 rounded text-[11px] font-semibold text-slate-700 dark:text-neutral-300 border border-transparent hover:border-slate-200 dark:hover:border-neutral-700 focus:outline-none focus:border-blue-500 cursor-pointer max-w-[140px] truncate"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-medium">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 6. Parent items */}
              <div className="flex items-center h-7 px-1.5 rounded-lg hover:bg-white/80 dark:hover:bg-neutral-800/60 transition group/prop">
                <div className="w-24 flex items-center gap-1.5 text-slate-400 dark:text-neutral-500 font-medium shrink-0 select-none text-[11px]">
                  <GitCommit className="w-3.5 h-3.5 text-indigo-500/80 shrink-0" />
                  <span>Parent</span>
                </div>
                <div className="flex-1 min-w-0">
                  <select
                    value={record.parentId || ''}
                    onChange={(e) => {
                      const newParentId = e.target.value || null;
                      const parentRec = newParentId ? allRecords.find(r => r.id === newParentId) : null;
                      onUpdateRecord(record.id, {
                        parentId: newParentId,
                        businessLine: parentRec ? parentRec.businessLine : record.businessLine
                      });
                    }}
                    className="bg-transparent hover:bg-slate-200/50 dark:hover:bg-neutral-800 px-1.5 py-0.5 rounded text-[11px] font-medium text-slate-700 dark:text-neutral-300 border border-transparent hover:border-slate-200 dark:hover:border-neutral-700 focus:outline-none focus:border-blue-500 cursor-pointer max-w-[150px] truncate"
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-500">
                      -- No Parent --
                    </option>
                    {candidateParents.map(p => (
                      <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-medium">
                        {p.task}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

            </div>
          </div>

          {/* Schedule & Reminder Card (Full-width clean layout, no cramped wrapping) */}
          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-neutral-900/60 border border-slate-200/80 dark:border-neutral-800/80 text-xs space-y-2.5 shadow-2xs">
            {/* Start Date & Due Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-slate-200/60 dark:border-neutral-800/60">
              
              {/* Start Date */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400 font-medium text-[11px] shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Start date</span>
                </div>
                <input
                  type="date"
                  value={record.startTime || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateRecord(record.id, {
                      startTime: val,
                      dueDate: record.dueDate && record.dueDate !== record.startTime ? record.dueDate : val
                    });
                  }}
                  className="px-2 py-1 bg-white dark:bg-neutral-800 rounded-lg border border-slate-200 dark:border-neutral-700 text-slate-800 dark:text-neutral-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                />
              </div>

              {/* Due Date with Quick Advance Buttons */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400 font-medium text-[11px] shrink-0">
                  <Clock className="w-3.5 h-3.5 text-rose-500/80" />
                  <span>Due date</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={record.dueDate || ''}
                    onChange={(e) => onUpdateRecord(record.id, { dueDate: e.target.value })}
                    className="px-2 py-1 bg-white dark:bg-neutral-800 rounded-lg border border-slate-200 dark:border-neutral-700 text-slate-800 dark:text-neutral-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleSetNextFriday}
                      className="px-2 py-1 rounded-md text-[10px] font-black bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-300/50 dark:border-indigo-700/50 transition cursor-pointer active:scale-95 whitespace-nowrap shadow-2xs"
                      title="Pindahkan due date ke hari Jumat berikutnya (+ Fri)"
                    >
                      + Fri
                    </button>
                    <button
                      type="button"
                      onClick={handleAdd7Days}
                      className="px-2 py-1 rounded-md text-[10px] font-black bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-300/50 dark:border-blue-700/50 transition cursor-pointer active:scale-95 whitespace-nowrap shadow-2xs"
                      title="Pindahkan due date maju 7 hari (+ 7D)"
                    >
                      + 7D
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Time & Reminder Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-0.5">
              
              {/* Due Time */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400 font-medium text-[11px] shrink-0">
                  <Clock className="w-3.5 h-3.5 text-indigo-500/80" />
                  <span>Due Time</span>
                </div>
                <div className="flex items-center gap-2">
                  <ModernTimePicker
                    value={record.dueTime || DEFAULT_DUE_TIME}
                    onChange={(newTime) => onUpdateRecord(record.id, { dueTime: newTime })}
                    accent="indigo"
                    label="Jam Jatuh Tempo (Due Time)"
                  />
                </div>
              </div>

              {/* Reminder Settings */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-neutral-400 font-medium text-[11px] shrink-0">
                  {record.reminder === 'NONE' ? (
                    <BellOff className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span>Reminder</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={record.reminder || DEFAULT_REMINDER}
                    onChange={(e) => onUpdateRecord(record.id, { reminder: e.target.value })}
                    className="bg-white dark:bg-neutral-800 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-800 dark:text-neutral-200 border border-slate-200 dark:border-neutral-700 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs max-w-[130px] truncate"
                    title="Pilih opsi pengingat"
                  >
                    {REMINDER_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-medium">
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {record.reminder !== 'NONE' && (
                    <ModernTimePicker
                      value={record.reminderTime || record.dueTime || DEFAULT_DUE_TIME}
                      onChange={(newTime) => onUpdateRecord(record.id, { reminderTime: newTime })}
                      accent="amber"
                      label="Jam Pengingat (Reminder)"
                    />
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* 3. Section: Latest Update (with date default today, save, and history with edit/delete) */}
        <div className="space-y-4 pt-1">
          
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Latest Update</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {updatesList.length} riwayat update
            </span>
          </div>

          {/* New Update Form */}
          <form
            onSubmit={handleSaveNewUpdate}
            className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <label className="text-xs font-semibold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
                <span>Tambah Update Progres</span>
              </label>
              
              {/* Date Input (Default Today) */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-neutral-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-medium text-slate-400">Tanggal:</span>
                <input
                  type="date"
                  value={updateDate}
                  onChange={(e) => setUpdateDate(e.target.value)}
                  className="bg-transparent font-mono text-xs text-slate-700 dark:text-neutral-200 focus:outline-none cursor-pointer"
                  title="Pilih tanggal update (default hari ini)"
                />
              </div>
            </div>

            {/* Update Textarea */}
            <textarea
              ref={updateInputRef}
              rows={3}
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
              placeholder="Tuliskan catatan progres terbaru, hasil follow up, kendala, atau update harian..."
              className="w-full p-3 bg-white dark:bg-neutral-800/90 border border-slate-200 dark:border-neutral-700 rounded-lg text-xs sm:text-sm text-slate-800 dark:text-neutral-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed font-sans resize-y"
            />

            {/* Submit Button */}
            <div className="flex justify-end items-center gap-2">
              <button
                type="submit"
                disabled={!updateText.trim()}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-2 cursor-pointer"
                title="Simpan update (Shortcut: Alt + S atau Ctrl + Enter)"
              >
                <div className="flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Update</span>
                </div>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-blue-700/80 border border-blue-400/40 rounded text-blue-100 shadow-2xs">
                  Alt+S
                </kbd>
              </button>
            </div>
          </form>

          {/* History Update List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
              <History className="w-3.5 h-3.5" />
              <span>History Update ({updatesList.length})</span>
            </div>

            {updatesList.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-neutral-800 text-xs text-slate-400">
                Belum ada history update untuk task ini. Tuliskan update baru di form atas.
              </div>
            ) : (
              <div className="space-y-2.5">
                {updatesList.map((item) => {
                  const isEditingThis = editingUpdateId === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (!isEditingThis) {
                          handleStartEdit(item);
                        }
                      }}
                      className={`p-3.5 rounded-xl bg-white dark:bg-neutral-900/60 border transition space-y-2 group/hist ${
                        isEditingThis
                          ? 'border-blue-500/80 shadow-xs ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-neutral-800/80 hover:border-blue-400/60 dark:hover:border-blue-500/40 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 cursor-pointer'
                      }`}
                    >
                      {/* Item Header: Date + Actions */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-500 dark:text-neutral-400 bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                          <Calendar className="w-3 h-3 text-blue-500" />
                          <span>{item.date || 'No Date'}</span>
                        </div>

                        {/* Action buttons: Edit & Delete */}
                        {!isEditingThis && (
                          <div className="flex items-center gap-1 opacity-80 group-hover/hist:opacity-100 transition">
                            <span className="text-[11px] font-medium text-slate-400 group-hover/hist:text-blue-500 flex items-center gap-1 transition mr-1">
                              <Edit2 className="w-3 h-3" />
                              <span>Klik untuk edit</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteUpdate(item.id);
                              }}
                              className="px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                              title="Hapus update ini"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Item Content or Edit Form */}
                      {isEditingThis ? (
                        <div
                          className="space-y-2 pt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400">Ubah Tanggal:</span>
                            <input
                              type="date"
                              value={editingUpdateDate}
                              onChange={(e) => setEditingUpdateDate(e.target.value)}
                              className="px-2 py-0.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded text-xs font-mono text-slate-700 dark:text-neutral-200 focus:outline-none cursor-pointer"
                            />
                          </div>
                          <textarea
                            rows={3}
                            value={editingUpdateText}
                            onChange={(e) => setEditingUpdateText(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 dark:bg-neutral-800 border border-blue-500 rounded-lg text-xs sm:text-sm text-slate-800 dark:text-neutral-100 focus:outline-none leading-relaxed"
                            autoFocus
                          />
                          <div className="flex justify-between items-center gap-2 pt-1">
                            {/* Delete button inside edit mode */}
                            <button
                              type="button"
                              onClick={() => handleDeleteUpdate(item.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-1 transition cursor-pointer"
                              title="Hapus riwayat update ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingUpdateId(null)}
                                className="px-3 py-1 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(item.id)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                                title="Simpan perubahan (Shortcut: Alt + S atau Ctrl + Enter)"
                              >
                                <Check className="w-3 h-3" />
                                <span>Simpan</span>
                                <kbd className="hidden sm:inline-block px-1 py-0.2 text-[9px] font-mono font-semibold bg-blue-700/80 border border-blue-400/40 rounded text-blue-100">
                                  Alt+S
                                </kbd>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                          {item.text}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
