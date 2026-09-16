import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Check,
  Calendar,
  User,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Edit2,
  Edit3,
  Trash2,
  MoreHorizontal,
  X,
  CornerDownRight,
  GitCommit,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Bell,
  BellOff,
  RotateCcw
} from 'lucide-react';
import { PRIORITIES, STATUSES, PROJECTS, LEADERS, getStatusConfig, canonicalStatus, REMINDER_OPTIONS, DEFAULT_DUE_TIME, DEFAULT_REMINDER } from '../data/initialData';

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function LarkTable({
  records,
  categories = ['EMS', 'BETTER FUTURE', 'LPK OS', 'MARKETING'],
  projects = PROJECTS,
  leaders = LEADERS,
  onAddLeader,
  onAddProject,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onInlineAddTask,
  onInlineAddSubTask,
  sortField,
  sortOrder,
  onSort,
  onUpdateRecord,
  onAddRecordInGroup,
  onSelectRecord,
  onOpenRecord,
  onDeleteRecord,
  selectedRecordId,
  isSidePeekOpen,
  inlineAddCategory,
  setInlineAddCategory,
  kanbanPriorityFilter = 'ALL',
  kanbanProjectFilter = 'ALL',
  kanbanLeaderFilter = 'ALL'
}) {
  // Collapsed state per business line
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [collapsedSubTasks, setCollapsedSubTasks] = useState({}); // { [parentId]: boolean }
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  // Category renaming state
  const [editingCategory, setEditingCategory] = useState(null); // category name being renamed
  const [editingCatName, setEditingCatName] = useState('');
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(null); // which category menu is open

  // Task & Sub-task 3-dots action menu state: recordId
  const [taskMenuOpen, setTaskMenuOpen] = useState(null);
  const [taskMenuTargetRecord, setTaskMenuTargetRecord] = useState(null); // stores rec or sub record
  const [taskMenuPosition, setTaskMenuPosition] = useState({ top: 0, left: 0 });

  // Close menus on click outside or window scroll/resize
  useEffect(() => {
    const handleDocumentClick = (e) => {
      // If clicked inside the portal menu itself, don't close
      if (e.target.closest && e.target.closest('[data-task-portal-menu]')) return;
      setTaskMenuOpen(null);
      setTaskMenuTargetRecord(null);
      setCategoryMenuOpen(null);
    };

    const handleScrollOrResize = () => {
      if (taskMenuOpen) {
        setTaskMenuOpen(null);
        setTaskMenuTargetRecord(null);
      }
      if (categoryMenuOpen) {
        setCategoryMenuOpen(null);
      }
    };

    if (taskMenuOpen || categoryMenuOpen) {
      document.addEventListener('click', handleDocumentClick);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        document.removeEventListener('click', handleDocumentClick);
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [taskMenuOpen, categoryMenuOpen]);

  // Inline task adding state: { [groupName]: true/false }
  const [inlineAddingGroup, setInlineAddingGroup] = useState(null);
  const [inlineTaskName, setInlineTaskName] = useState('');

  // Handle external trigger for inline adding under a specific category (e.g. from navbar dropdown)
  useEffect(() => {
    if (inlineAddCategory) {
      // 1. Ensure category group is expanded
      setCollapsedGroups(prev => ({ ...prev, [inlineAddCategory]: false }));
      // 2. Set inline adding active for this category
      setInlineAddingGroup(inlineAddCategory);
      setInlineTaskName('');
      // 3. Scroll to and focus the input element directly under the category
      const timer = setTimeout(() => {
        const inputEl = document.getElementById(`inline-task-input-${inlineAddCategory}`);
        if (inputEl) {
          inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          inputEl.focus();
        } else {
          const headerEl = document.getElementById(`category-header-${inlineAddCategory}`);
          if (headerEl) {
            headerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        if (setInlineAddCategory) setInlineAddCategory(null);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [inlineAddCategory, setInlineAddCategory]);

  // Inline sub-task adding state: parentId
  const [inlineSubTaskParentId, setInlineSubTaskParentId] = useState(null);
  const [inlineSubTaskName, setInlineSubTaskName] = useState('');

  // Inline cell editing state: { recordId, field }
  const [editingCell, setEditingCell] = useState(null);
  const [cellValue, setCellValue] = useState('');

  // Drag-and-drop state to convert tasks into sub-tasks or reorder
  const [draggedRecordId, setDraggedRecordId] = useState(null);
  const [dragOverTargetId, setDragOverTargetId] = useState(null);

  // Column reordering (click and drag headers to reorder columns in Task List)
  const DEFAULT_COLUMN_ORDER = [
    'priority',
    'project',
    'status',
    'taskLeader',
    'businessLine',
    'startTime',
    'dueDate',
    'latestUpdate',
    'parentItems'
  ];

  const [columnOrder, setColumnOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('lark_task_list_column_order_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure all known columns exist in parsed
          const set = new Set(parsed);
          const complete = [...parsed];
          DEFAULT_COLUMN_ORDER.forEach(col => {
            if (!set.has(col)) complete.push(col);
          });
          return complete;
        }
      }
    } catch (e) {
      console.warn('Failed to load column order from localStorage:', e);
    }
    return DEFAULT_COLUMN_ORDER;
  });

  const [draggedColKey, setDraggedColKey] = useState(null);
  const [dragOverColKey, setDragOverColKey] = useState(null);

  const handleColDragStart = (e, colKey) => {
    e.stopPropagation();
    setDraggedColKey(colKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `col:${colKey}`);
  };

  const handleColDragOver = (e, colKey) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedColKey && draggedColKey !== colKey) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverColKey(colKey);
    }
  };

  const handleColDragLeave = (e, colKey) => {
    e.stopPropagation();
    if (dragOverColKey === colKey) {
      setDragOverColKey(null);
    }
  };

  const handleColDrop = (e, targetColKey) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceColKey = draggedColKey;
    setDraggedColKey(null);
    setDragOverColKey(null);

    if (!sourceColKey || sourceColKey === targetColKey) return;

    setColumnOrder(prevOrder => {
      const fromIdx = prevOrder.indexOf(sourceColKey);
      const toIdx = prevOrder.indexOf(targetColKey);
      if (fromIdx === -1 || toIdx === -1) return prevOrder;

      const newOrder = [...prevOrder];
      const [moved] = newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, moved);

      try {
        localStorage.setItem('lark_task_list_column_order_v1', JSON.stringify(newOrder));
      } catch (err) {
        console.warn('Failed to save column order:', err);
      }
      return newOrder;
    });
  };

  const DEFAULT_COLUMN_WIDTHS = {
    task: 340,
    priority: 110,
    project: 140,
    status: 140,
    taskLeader: 140,
    businessLine: 130,
    startTime: 120,
    dueDate: 140,
    latestUpdate: 220,
    parentItems: 150
  };

  const [columnWidths, setColumnWidths] = useState(() => {
    try {
      const saved = localStorage.getItem('lark_task_list_column_widths_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_COLUMN_WIDTHS, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to load column widths from localStorage:', e);
    }
    return DEFAULT_COLUMN_WIDTHS;
  });

  // Resizing ref to track mousemove and mouseup cleanly
  const resizingColRef = useRef(null);

  const handleResizeMouseDown = (e, colKey) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey] || 120;
    resizingColRef.current = { colKey, startX, startWidth };

    const handleMouseMove = (moveEvent) => {
      if (!resizingColRef.current) return;
      const deltaX = moveEvent.clientX - resizingColRef.current.startX;
      const minWidth = colKey === 'task' ? 200 : 70;
      const newWidth = Math.max(minWidth, Math.min(800, resizingColRef.current.startWidth + deltaX));

      setColumnWidths(prev => {
        const updated = { ...prev, [colKey]: newWidth };
        return updated;
      });
    };

    const handleMouseUp = () => {
      if (resizingColRef.current) {
        setColumnWidths(currentWidths => {
          try {
            localStorage.setItem('lark_task_list_column_widths_v1', JSON.stringify(currentWidths));
          } catch (err) {
            console.warn('Failed to save column widths:', err);
          }
          return currentWidths;
        });
      }
      resizingColRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResetColumnOrder = () => {
    setColumnOrder(DEFAULT_COLUMN_ORDER);
    setColumnWidths(DEFAULT_COLUMN_WIDTHS);
    try {
      localStorage.removeItem('lark_task_list_column_order_v1');
      localStorage.removeItem('lark_task_list_column_widths_v1');
    } catch (err) {}
  };

  // Helper to check if target is descendant of ancestor (to prevent circular hierarchy loops)
  const isDescendantOf = (childId, ancestorId) => {
    let curr = records.find(r => r.id === childId);
    while (curr && curr.parentId) {
      if (curr.parentId === ancestorId) return true;
      curr = records.find(r => r.id === curr.parentId);
    }
    return false;
  };

  // Helper to get eligible parents for a record:
  // - Must not be a sub-task itself (!r.parentId)
  // - Same category / business line as the record
  // - Status must NOT be Done, Cancel, Pending, or Archived
  // - Excluding self and descendants
  // - Sorted alphabetically ascending A-Z by task name
  const getEligibleParents = (recordId) => {
    const currentRec = records.find(r => r.id === recordId);
    const category = currentRec ? currentRec.businessLine : null;
    const excludedStatuses = ['Done', 'Cancel', 'Pending', 'Archived'];

    return records
      .filter(r => {
        if (r.id === recordId) return false;
        if (r.parentId) return false; // Bukan tipe sub task
        if (category && r.businessLine !== category) return false; // Hanya category itu saja
        if (excludedStatuses.includes(canonicalStatus(r.status))) return false; // Status selain done, cancel, pending, archived
        if (isDescendantOf(r.id, recordId)) return false;
        return true;
      })
      .sort((a, b) => (a.task || '').localeCompare(b.task || '', undefined, { sensitivity: 'base' }));
  };

  // Helper to save inline notes and synchronize updates history
  const handleSaveInlineNotes = (targetRec, val) => {
    const clean = (val || '').trim();
    let currentUpdates = Array.isArray(targetRec.updates) ? [...targetRec.updates] : [];
    if (clean) {
      if (currentUpdates.length > 0) {
        currentUpdates[0] = { ...currentUpdates[0], text: clean };
      } else {
        currentUpdates = [{
          id: `upd-${Date.now()}`,
          date: targetRec.dueDate || targetRec.startTime || getTodayStr(),
          text: clean
        }];
      }
    }
    onUpdateRecord(targetRec.id, { notes: clean, updates: currentUpdates });
  };

  const handleDragStart = (e, recId) => {
    setDraggedRecordId(recId);
    e.dataTransfer.setData('text/plain', recId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverTask = (e, targetId) => {
    e.preventDefault();
    if (draggedRecordId && draggedRecordId !== targetId && !isDescendantOf(targetId, draggedRecordId)) {
      setDragOverTargetId(targetId);
    }
  };

  const handleDragLeaveTask = (e, targetId) => {
    if (dragOverTargetId === targetId) {
      setDragOverTargetId(null);
    }
  };

  const handleDropOnTask = (e, targetRecord) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedRecordId;
    setDragOverTargetId(null);
    setDraggedRecordId(null);

    if (!sourceId || sourceId === targetRecord.id) return;
    if (isDescendantOf(targetRecord.id, sourceId)) {
      alert('Tidak bisa menjadikan parent task sebagai sub-task dari anaknya sendiri.');
      return;
    }

    // Convert sourceId into a sub-task of targetRecord
    onUpdateRecord(sourceId, {
      parentId: targetRecord.id,
      businessLine: targetRecord.businessLine
    });
  };

  const handleDropOnGroupHeader = (e, groupName) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedRecordId;
    setDragOverTargetId(null);
    setDraggedRecordId(null);

    if (!sourceId) return;

    // Convert sourceId back to top-level task in this group
    onUpdateRecord(sourceId, {
      parentId: null,
      businessLine: groupName
    });
  };

  // Group records by business line (ensuring all categories are present)
  const groupedRecords = categories.reduce((acc, grp) => {
    acc[grp] = [];
    return acc;
  }, {});

  records.forEach(rec => {
    const group = rec.businessLine || 'OTHER';
    if (!groupedRecords[group]) groupedRecords[group] = [];
    groupedRecords[group].push(rec);
  });

  const handleCreateCategory = (e) => {
    e.preventDefault();
    const trimmed = newCatInput.trim().toUpperCase();
    if (trimmed) {
      onAddCategory && onAddCategory(trimmed);
      setNewCatInput('');
      setIsAddingNewCategory(false);
    }
  };

  const toggleGroup = (groupName) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const cycleStatus = (rec) => {
    const statusKeys = Object.keys(STATUSES);
    const currentIndex = statusKeys.indexOf(rec.status);
    const nextStatus = statusKeys[(currentIndex + 1) % statusKeys.length];
    onUpdateRecord(rec.id, { status: nextStatus });
  };

  const cyclePriority = (rec) => {
    const priorityKeys = Object.keys(PRIORITIES);
    const currentIndex = priorityKeys.indexOf(rec.priority);
    const nextPriority = priorityKeys[(currentIndex + 1) % priorityKeys.length];
    onUpdateRecord(rec.id, { priority: nextPriority });
  };

  // Helper component to render sort indicator
  const SortIndicator = ({ field }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-600 dark:text-blue-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-600 dark:text-blue-400" />
    );
  };

  return (
    <div className="overflow-x-auto bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.03)] transition-colors">
      <table className="w-full text-left text-xs border-collapse table-fixed">
        
        {/* Table Header Columns (macOS Table View Header) */}
        <thead>
          <tr className="bg-neutral-50/80 dark:bg-[#252528]/80 text-neutral-600 dark:text-neutral-300 font-semibold border-b border-black/5 dark:border-white/5 select-none text-[11px] tracking-tight">
            <th className="py-2.5 px-3 w-10 text-center border-r border-black/5 dark:border-white/5">
              <input type="checkbox" className="rounded-md border-neutral-300 text-apple-blue focus:ring-0 cursor-pointer" />
            </th>

            {/* Task (Non-sortable as requested, resizable) */}
            <th
              style={{ width: `${columnWidths.task || 340}px`, minWidth: `${columnWidths.task || 340}px`, maxWidth: `${columnWidths.task || 340}px` }}
              className="relative py-2.5 px-3 border-r border-black/5 dark:border-white/5 font-semibold text-neutral-700 dark:text-neutral-200 select-none group"
            >
              <div className="flex items-center justify-between">
                <span>Task</span>
              </div>
              {/* Resize Handle */}
              <div
                onMouseDown={(e) => handleResizeMouseDown(e, 'task')}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500/40 active:bg-blue-600 transition-colors z-20 select-none"
                title="Tarik untuk mengatur lebar kolom Task"
              />
            </th>

            {/* Draggable & Reorderable Columns with Column Resizing */}
            {columnOrder.map((colKey) => {
              const isDragging = draggedColKey === colKey;
              const isOver = dragOverColKey === colKey;
              const colWidth = columnWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey] || 120;

              const dragProps = {
                draggable: true,
                onDragStart: (e) => handleColDragStart(e, colKey),
                onDragOver: (e) => handleColDragOver(e, colKey),
                onDragLeave: (e) => handleColDragLeave(e, colKey),
                onDrop: (e) => handleColDrop(e, colKey),
              };

              const commonThClass = `relative py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 transition select-none group cursor-grab active:cursor-grabbing ${
                isDragging ? 'opacity-30 bg-blue-100/60 dark:bg-blue-900/40' : ''
              } ${
                isOver ? 'ring-2 ring-inset ring-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''
              }`;

              const resizerHandle = (
                <div
                  onMouseDown={(e) => handleResizeMouseDown(e, colKey)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500/40 active:bg-blue-600 transition-colors z-20 select-none"
                  title={`Tarik untuk mengatur lebar kolom`}
                />
              );

              if (colKey === 'priority') {
                return (
                  <th
                    key="priority"
                    {...dragProps}
                    style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
                    onClick={() => onSort && onSort('priority')}
                    className={`${commonThClass} hover:bg-slate-100 dark:hover:bg-slate-700/60 ${
                      sortField === 'priority' ? 'bg-blue-50/60 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
                    }`}
                    title="Drag untuk memindahkan kolom • Klik untuk mengurutkan Priority"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0 truncate">
                        <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 shrink-0" />
                        <span className="truncate">Priority</span>
                      </div>
                      <SortIndicator field="priority" />
                    </div>
                    {resizerHandle}
                  </th>
                );
              }

              if (colKey === 'project') {
                return (
                  <th
                    key="project"
                    {...dragProps}
                    style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
                    onClick={() => onSort && onSort('project')}
                    className={`${commonThClass} hover:bg-slate-100 dark:hover:bg-slate-700/60 ${
                      sortField === 'project' ? 'bg-blue-50/60 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
                    }`}
                    title="Drag untuk memindahkan kolom • Klik untuk mengurutkan Proyek"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0 truncate">
                        <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 shrink-0" />
                        <span className="truncate">PROJECTS</span>
                      </div>
                      <SortIndicator field="project" />
                    </div>
                    {resizerHandle}
                  </th>
                );
              }

              if (colKey === 'status') {
                return (
                  <th
                    key="status"
                    {...dragProps}
                    style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
                    onClick={() => onSort && onSort('status')}
                    className={`${commonThClass} whitespace-nowrap hover:bg-slate-100 dark:hover:bg-slate-700/60 ${
                      sortField === 'status' ? 'bg-blue-50/60 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
                    }`}
                    title="Drag untuk memindahkan kolom • Klik untuk mengurutkan Status"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0 truncate">
                        <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 shrink-0" />
                        <span className="truncate">Status</span>
                      </div>
                      <SortIndicator field="status" />
                    </div>
                    {resizerHandle}
                  </th>
                );
              }

              if (colKey === 'taskLeader') {
                return (
                  <th
                    key="taskLeader"
                    {...dragProps}
                    style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
                    onClick={() => onSort && onSort('taskLeader')}
                    className={`${commonThClass} hover:bg-slate-100 dark:hover:bg-slate-700/60 ${
                      sortField === 'taskLeader' ? 'bg-blue-50/60 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
                    }`}
                    title="Drag untuk memindahkan kolom • Klik untuk mengurutkan Penanggung Jawab"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0 truncate">
                        <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 shrink-0" />
                        <span className="truncate">Task leader</span>
                      </div>
                      <SortIndicator field="taskLeader" />
                    </div>
                    {resizerHandle}
                  </th>
                );
              }

              if (colKey === 'businessLine') {
                return (
                  <th
                    key="businessLine"
                    {...dragProps}
                    style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
                    onClick={() => onSort && onSort('businessLine')}
                    className={`${commonThClass} hover:bg-slate-100 dark:hover:bg-slate-700/60 ${
                      sortField === 'businessLine' ? 'bg-blue-50/60 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
                    }`}
                    title="Drag untuk memindahkan kolom • Klik untuk mengurutkan Business Line"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0 truncate">
                        <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 shrink-0" />
                        <span className="truncate">Business line</span>
                      </div>
                      <SortIndicator field="businessLine" />
                    </div>
                    {resizerHandle}
                  </th>
                );
              }

              if (colKey === 'startTime') {
                return (
                  <th
                    key="startTime"
                    {...dragProps}
                    style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
                    onClick={() => onSort && onSort('startTime')}
                    className={`${commonThClass} hover:bg-slate-100 dark:hover:bg-slate-700/60 ${
                      sortField === 'startTime' ? 'bg-blue-50/60 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
                    }`}
                    title="Drag untuk memindahkan kolom • Klik untuk mengurutkan Tanggal Mulai"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0 truncate">
                        <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 shrink-0" />
                        <span className="truncate">Task start time</span>
                      </div>
                      <SortIndicator field="startTime" />
                    </div>
                    {resizerHandle}
                  </th>
                );
              }

              if (colKey === 'dueDate') {
                return (
                  <th
                    key="dueDate"
                    {...dragProps}
                    style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
                    onClick={() => onSort && onSort('dueDate')}
                    className={`${commonThClass} hover:bg-slate-100 dark:hover:bg-slate-700/60 ${
                      sortField === 'dueDate' ? 'bg-blue-50/60 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
                    }`}
                    title="Drag untuk memindahkan kolom • Klik untuk mengurutkan Deadline"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0 truncate">
                        <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 shrink-0" />
                        <span className="truncate">Task due date</span>
                      </div>
                      <SortIndicator field="dueDate" />
                    </div>
                    {resizerHandle}
                  </th>
                );
              }

              if (colKey === 'latestUpdate') {
                return (
                  <th
                    key="latestUpdate"
                    {...dragProps}
                    style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
                    className={`${commonThClass} hover:bg-slate-100 dark:hover:bg-slate-700/60`}
                    title="Drag untuk memindahkan kolom"
                  >
                    <div className="flex items-center gap-1 truncate">
                      <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 shrink-0" />
                      <span className="truncate">Latest update</span>
                    </div>
                    {resizerHandle}
                  </th>
                );
              }

              if (colKey === 'parentItems') {
                return (
                  <th
                    key="parentItems"
                    {...dragProps}
                    style={{ width: `${colWidth}px`, minWidth: `${colWidth}px` }}
                    className={`${commonThClass} hover:bg-slate-100 dark:hover:bg-slate-700/60`}
                    title="Drag untuk memindahkan kolom"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 truncate">
                        <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 shrink-0" />
                        <span className="truncate">Parent items</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetColumnOrder();
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                        title="Reset urutan & lebar kolom ke bawaan"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                    {resizerHandle}
                  </th>
                );
              }

              return null;
            })}
          </tr>
        </thead>

        {/* Table Body Grouped by Business Line */}
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {Object.entries(groupedRecords).map(([groupName, groupItems]) => {
            const isCollapsed = !!collapsedGroups[groupName];
            const isEditingThisCat = editingCategory === groupName;
            const isMenuOpen = categoryMenuOpen === groupName;

            return (
              <React.Fragment key={groupName}>
                
                {/* Group Divider Banner Row with Category Rename / Delete options */}
                <tr
                  id={`category-header-${groupName}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedRecordId) setDragOverTargetId(`group-${groupName}`);
                  }}
                  onDragLeave={() => {
                    if (dragOverTargetId === `group-${groupName}`) setDragOverTargetId(null);
                  }}
                  onDrop={(e) => handleDropOnGroupHeader(e, groupName)}
                  className={`font-bold text-neutral-800 dark:text-neutral-200 border-t-2 border-neutral-200 dark:border-white/10 transition ${
                    dragOverTargetId === `group-${groupName}`
                      ? 'bg-apple-blue/20 dark:bg-apple-blue/30 ring-2 ring-apple-blue'
                      : 'bg-neutral-100/90 dark:bg-[#252528]/90'
                  }`}
                >
                  <td colSpan={10} className="py-2 px-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 select-none">
                        <button
                          onClick={() => toggleGroup(groupName)}
                          className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>

                        {/* Category Name (Display or Inline Rename Input) */}
                        {isEditingThisCat ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingCatName}
                              onChange={(e) => setEditingCatName(e.target.value)}
                              className="px-2 py-0.5 rounded text-xs font-extrabold bg-white dark:bg-slate-900 border border-blue-500 text-blue-700 dark:text-blue-300 focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  onRenameCategory && onRenameCategory(groupName, editingCatName);
                                  setEditingCategory(null);
                                } else if (e.key === 'Escape') {
                                  setEditingCategory(null);
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                onRenameCategory && onRenameCategory(groupName, editingCatName);
                                setEditingCategory(null);
                              }}
                              className="px-2 py-0.5 rounded bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700"
                            >
                              Simpan
                            </button>
                            <button
                              onClick={() => setEditingCategory(null)}
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group/cat">
                            <span
                              onClick={() => toggleGroup(groupName)}
                              className="cursor-pointer px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-apple-blue/15 dark:bg-apple-blue/25 text-apple-blue dark:text-sky-300 border border-apple-blue/30 hover:opacity-85"
                            >
                              {groupName}
                            </span>
                            <span className="text-neutral-500 dark:text-neutral-400 font-normal text-[11px]">
                              {groupItems.length} records
                            </span>

                            {/* + Add Task Langsung button placed directly beside [number of records] */}
                            <button
                              type="button"
                              onClick={() => {
                                setCollapsedGroups(prev => ({ ...prev, [groupName]: false }));
                                setInlineAddingGroup(groupName);
                                setInlineTaskName('');
                                setTimeout(() => {
                                  const inputEl = document.getElementById(`inline-task-input-${groupName}`);
                                  if (inputEl) {
                                    inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    inputEl.focus();
                                  }
                                }, 50);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-apple-blue dark:text-sky-400 hover:underline px-2 py-0.5 rounded-lg hover:bg-apple-blue/10 transition cursor-pointer"
                              title={`Tambah Task langsung ke ${groupName}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Add Task Langsung</span>
                            </button>

                            {/* Category Action Menu (Rename / Delete) */}
                            <div className="relative">
                              <button
                                onClick={() => setCategoryMenuOpen(isMenuOpen ? null : groupName)}
                                className="opacity-0 group-hover/cat:opacity-100 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded transition cursor-pointer"
                                title="Edit / Hapus Kategori ini"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>

                              {isMenuOpen && (
                                <div className="absolute left-0 mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 p-1 text-xs">
                                  <button
                                    onClick={() => {
                                      setEditingCategory(groupName);
                                      setEditingCatName(groupName);
                                      setCategoryMenuOpen(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Rename Kategori</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCategoryMenuOpen(null);
                                      onDeleteCategory && onDeleteCategory(groupName);
                                    }}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Hapus Kategori</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Inline New Task Row directly below category header */}
                {!isCollapsed && inlineAddingGroup === groupName && (
                  <tr className="bg-apple-blue/10 dark:bg-apple-blue/20 border-y-2 border-apple-blue animate-in fade-in">
                    <td className="py-2.5 px-2 text-center text-apple-blue font-bold">
                      <Plus className="w-3.5 h-3.5 mx-auto" />
                    </td>
                    <td colSpan={9} className="py-2 px-3 sticky left-0 z-10 bg-apple-blue/5 dark:bg-[#1c1c1e]">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (inlineTaskName.trim()) {
                            onInlineAddTask && onInlineAddTask(groupName, inlineTaskName.trim());
                            setInlineTaskName('');
                            setInlineAddingGroup(null);
                          }
                        }}
                        className="flex items-center gap-2 max-w-2xl w-full"
                      >
                        <input
                          id={`inline-task-input-${groupName}`}
                          type="text"
                          placeholder={`Ketik nama tugas baru untuk ${groupName}... (Tekan Enter)`}
                          value={inlineTaskName}
                          onChange={(e) => setInlineTaskName(e.target.value)}
                          className="flex-1 w-[480px] max-w-lg px-3.5 py-1.5 bg-white dark:bg-[#252528] border border-apple-blue rounded-xl text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none shadow-xs ring-2 ring-apple-blue/30"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setInlineAddingGroup(null);
                          }}
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 bg-apple-blue hover:bg-apple-blueHover text-white rounded-xl text-xs font-semibold transition shadow-xs shrink-0 whitespace-nowrap cursor-pointer"
                        >
                          Tambah Task
                        </button>
                        <button
                          type="button"
                          onClick={() => setInlineAddingGroup(null)}
                          className="px-3 py-1.5 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl text-xs font-medium shrink-0 whitespace-nowrap cursor-pointer"
                        >
                          Batal
                        </button>
                      </form>

                      {/* Active Filter Default Info Badges */}
                      {(kanbanPriorityFilter !== 'ALL' || kanbanProjectFilter !== 'ALL' || kanbanLeaderFilter !== 'ALL') && (
                        <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-apple-blue/20 text-[10px]">
                          <span className="text-neutral-500 dark:text-neutral-400 font-medium">Default filter aktif:</span>
                          {kanbanLeaderFilter !== 'ALL' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold font-mono">
                              Leader: {kanbanLeaderFilter}
                            </span>
                          )}
                          {kanbanProjectFilter !== 'ALL' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300 font-bold font-mono">
                              Project: {kanbanProjectFilter}
                            </span>
                          )}
                          {kanbanPriorityFilter !== 'ALL' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 font-bold font-mono">
                              Priority: {kanbanPriorityFilter}
                            </span>
                          )}
                          <span className="text-slate-400 italic">
                            (Kategori: {groupName}, Status: Not yet started, Due: Hari ini)
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                )}

                {/* Group Record Rows with Sub-tasks support */}
                {!isCollapsed &&
                  (() => {
                    // Map all top-level parent IDs
                    const allParentIds = new Set(records.filter(r => !r.parentId).map(r => r.id));
                    // Parent records within this business line group (also catch any orphans)
                    const parentRecords = groupItems.filter(r => !r.parentId || !allParentIds.has(r.parentId));

                    // Map all subtasks by parentId from full records list so subtasks always follow their parent
                    const subTasksByParent = records.reduce((acc, r) => {
                      if (r.parentId) {
                        if (!acc[r.parentId]) acc[r.parentId] = [];
                        acc[r.parentId].push(r);
                      }
                      return acc;
                    }, {});

                    return parentRecords.map((rec, idx) => {
                      const priorityConfig = PRIORITIES[rec.priority] || PRIORITIES.P1;
                      const statusConfig = getStatusConfig(rec.status);
                      const projectConfig = projects.find(p => p.name === rec.project) || { color: 'bg-slate-100 text-slate-700' };
                      const leaderObj = (leaders || LEADERS).find(l => l.name === rec.taskLeader) || {
                        avatar: rec.taskLeader ? rec.taskLeader.slice(0, 2).toUpperCase() : '?',
                        color: 'bg-slate-600 text-white'
                      };

                      const subTasks = subTasksByParent[rec.id] || [];
                      const hasSubTasks = subTasks.length > 0;
                      const isSubCollapsed = !!collapsedSubTasks[rec.id];

                      return (
                        <React.Fragment key={rec.id}>
                          {/* Parent Task Row */}
                          <tr
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, rec.id)}
                            onDragOver={(e) => handleDragOverTask(e, rec.id)}
                            onDragLeave={(e) => handleDragLeaveTask(e, rec.id)}
                            onDrop={(e) => handleDropOnTask(e, rec)}
                            onClick={(e) => {
                              if (e.target.closest('button, select, input, textarea, a, [data-no-row-click]')) return;
                              onOpenRecord ? onOpenRecord(rec) : (onSelectRecord && onSelectRecord(rec));
                            }}
                            className={`transition group border-b border-slate-100 dark:border-slate-800 cursor-pointer ${
                              selectedRecordId === rec.id && isSidePeekOpen
                                ? 'bg-blue-50/90 dark:bg-blue-950/40 ring-1 ring-blue-500/50 border-l-4 border-l-blue-600'
                                : dragOverTargetId === rec.id
                                ? 'bg-blue-100/90 dark:bg-blue-900/60 ring-2 ring-blue-500 scale-[1.003] z-10'
                                : 'bg-white dark:bg-slate-900 hover:bg-blue-50/40 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            
                            {/* 1. Selection & Index with Drag Handle */}
                            <td className="py-2 px-1 text-center text-slate-400 border-r border-slate-100 dark:border-slate-800/80 font-mono text-[11px]">
                              <div className="flex items-center justify-center gap-0.5">
                                <GripVertical
                                  className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 hover:text-blue-500 cursor-grab active:cursor-grabbing shrink-0"
                                  title="Tarik & letakkan (drag & drop) ke task lain untuk menjadikannya sub-task"
                                />
                                <span className="text-slate-400 min-w-[14px]">{idx + 1}</span>
                                <input
                                  type="checkbox"
                                  checked={rec.status === 'Done'}
                                  onChange={() => onUpdateRecord(rec.id, { status: rec.status === 'Done' ? 'Ongoing' : 'Done' })}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                                />
                              </div>
                            </td>

                            {/* 2. Task Name (with Sub-task toggle & + sub-task button) */}
                            <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/80 font-medium text-slate-800 dark:text-slate-100" style={{ width: `${columnWidths.task || 340}px`, maxWidth: `${columnWidths.task || 340}px`, overflow: 'hidden' }}>
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                  {/* Toggle chevron if has subtasks */}
                                  {hasSubTasks ? (
                                    <button
                                      onClick={() => setCollapsedSubTasks(prev => ({ ...prev, [rec.id]: !prev[rec.id] }))}
                                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0 p-0.5"
                                      title={isSubCollapsed ? 'Buka Sub-tasks' : 'Tutup Sub-tasks'}
                                    >
                                      {isSubCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                  ) : (
                                    <div className="w-4 shrink-0" />
                                  )}

                                  {editingCell && editingCell.id === rec.id && editingCell.field === 'task' ? (
                                    <input
                                      type="text"
                                      value={cellValue}
                                      onChange={(e) => setCellValue(e.target.value)}
                                      onBlur={() => {
                                        onUpdateRecord(rec.id, { task: cellValue });
                                        setEditingCell(null);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          onUpdateRecord(rec.id, { task: cellValue });
                                          setEditingCell(null);
                                        } else if (e.key === 'Escape') {
                                          setEditingCell(null);
                                        }
                                      }}
                                      className="flex-1 px-2 py-0.5 bg-white dark:bg-slate-800 border border-blue-500 rounded text-xs text-slate-800 dark:text-white font-semibold focus:outline-none"
                                      autoFocus
                                    />
                                  ) : (
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenRecord ? onOpenRecord(rec) : (onSelectRecord && onSelectRecord(rec));
                                      }}
                                      onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCell({ id: rec.id, field: 'task' });
                                        setCellValue(rec.task || '');
                                      }}
                                      className={`cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition truncate font-medium ${
                                        rec.status === 'Done' ? 'line-through text-slate-400' : ''
                                      }`}
                                      title="Klik untuk membuka di Side Peek (Double-klik untuk edit nama)"
                                    >
                                      {rec.task || <span className="italic text-slate-400">Klik untuk isi nama task...</span>}
                                    </span>
                                  )}
                                </div>

                                {/* + Sub-task and OPEN shortcut buttons on hover */}
                                <div className="flex items-center gap-1 shrink-0">
                                  {hasSubTasks && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold border border-slate-200 dark:border-slate-700">
                                      {subTasks.length}
                                    </span>
                                  )}

                                  {/* OPEN button (Notion-style side peek) */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenRecord ? onOpenRecord(rec) : (onSelectRecord && onSelectRecord(rec));
                                    }}
                                    className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition shadow-xs"
                                    title="Buka Task di Panel Samping (Notion Side Peek)"
                                  >
                                    OPEN
                                  </button>

                                  {/* + Button to add sub-task */}
                                  <button
                                    onClick={() => {
                                      setInlineSubTaskParentId(rec.id);
                                      setInlineSubTaskName('');
                                      // Expand parent if collapsed
                                      if (isSubCollapsed) {
                                        setCollapsedSubTasks(prev => ({ ...prev, [rec.id]: false }));
                                      }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-700 hover:bg-blue-100 transition"
                                    title="Tambah Sub-task (+)"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>

                                   {/* 3 Dots Menu Button for Parent Task */}
                                  <div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (taskMenuOpen === rec.id) {
                                          setTaskMenuOpen(null);
                                          setTaskMenuTargetRecord(null);
                                        } else {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const menuWidth = 180;
                                          const left = Math.max(10, Math.min(window.innerWidth - menuWidth - 10, rect.right - menuWidth));
                                          const top = rect.bottom + 4;
                                          setTaskMenuPosition({ top, left });
                                          setTaskMenuTargetRecord(rec);
                                          setTaskMenuOpen(rec.id);
                                        }
                                      }}
                                      className={`${
                                        taskMenuOpen === rec.id
                                          ? 'opacity-100 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white'
                                          : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                      } p-1 rounded transition`}
                                      title="Opsi Task (Edit / Hapus)"
                                    >
                                      <MoreHorizontal className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Dynamic Draggable Columns */}
                            {columnOrder.map(colKey => {
                              if (colKey === 'priority') {
                                return (
                                  <td key="priority" className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/80" style={{ width: `${columnWidths.priority || 110}px`, maxWidth: `${columnWidths.priority || 110}px`, overflow: 'hidden' }}>
                                    <select
                                      value={rec.priority || 'P1'}
                                      onChange={(e) => onUpdateRecord(rec.id, { priority: e.target.value })}
                                      className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${priorityConfig.color}`}
                                      title="Pilih Priority (P0, P1, P2, P3)"
                                    >
                                      {Object.entries(PRIORITIES).map(([key, cfg]) => (
                                        <option key={key} value={key} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
                                          {cfg.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                );
                              }

                              if (colKey === 'project') {
                                return (
                                  <td key="project" className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/80" style={{ width: `${columnWidths.project || 140}px`, maxWidth: `${columnWidths.project || 140}px`, overflow: 'hidden' }}>
                                    <select
                                      value={rec.project || 'BETTER FUTURE'}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '__ADD_NEW_PROJECT__') {
                                          const input = window.prompt("Nama Project Baru:");
                                          if (input && input.trim()) {
                                            const created = onAddProject ? onAddProject(input.trim()) : input.trim();
                                            onUpdateRecord(rec.id, { project: created });
                                          }
                                        } else {
                                          onUpdateRecord(rec.id, { project: val });
                                        }
                                      }}
                                      className="bg-transparent font-semibold border-0 text-[11px] cursor-pointer focus:ring-0 focus:outline-none py-0.5 px-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 max-w-[130px] truncate"
                                      title="Pilih Project atau tambah Project Baru"
                                    >
                                      {projects.map(p => (
                                        <option key={p.name} value={p.name} className="dark:bg-slate-800 text-slate-900 dark:text-white font-semibold">
                                          {p.name}
                                        </option>
                                      ))}
                                      <option disabled className="dark:bg-slate-800 text-slate-400">──────────</option>
                                      <option value="__ADD_NEW_PROJECT__" className="dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold">
                                        + Add New Project
                                      </option>
                                    </select>
                                  </td>
                                );
                              }

                              if (colKey === 'status') {
                                return (
                                  <td key="status" className="py-2 px-2 border-r border-slate-100 dark:border-slate-800/80 whitespace-nowrap" style={{ width: `${columnWidths.status || 140}px`, maxWidth: `${columnWidths.status || 140}px`, overflow: 'hidden' }}>
                                    <select
                                      value={canonicalStatus(rec.status)}
                                      onChange={(e) => onUpdateRecord(rec.id, { status: e.target.value })}
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 transition whitespace-nowrap inline-flex items-center justify-center shrink-0 ${statusConfig.color}`}
                                      title="Pilih Status"
                                    >
                                      {Object.entries(STATUSES).map(([key, cfg]) => (
                                        <option key={key} value={key} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold">
                                          {cfg.label}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                );
                              }

                              if (colKey === 'taskLeader') {
                                return (
                                  <td key="taskLeader" className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/80" style={{ width: `${columnWidths.taskLeader || 140}px`, maxWidth: `${columnWidths.taskLeader || 140}px`, overflow: 'hidden' }}>
                                    <div className="flex items-center gap-1.5">
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm shrink-0 ${leaderObj.color}`}>
                                        {leaderObj.avatar}
                                      </div>
                                      <select
                                        value={rec.taskLeader || (leaders && leaders[0] && leaders[0].name) || 'Pierre Marchel'}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === '__ADD_PERSON__') {
                                            const input = window.prompt('Tambahkan person baru (Nama):');
                                            if (input && input.trim()) {
                                              const created = onAddLeader ? onAddLeader(input.trim()) : input.trim();
                                              onUpdateRecord(rec.id, { taskLeader: created });
                                            }
                                          } else {
                                            onUpdateRecord(rec.id, { taskLeader: val });
                                          }
                                        }}
                                        className="bg-transparent text-slate-700 dark:text-slate-200 text-[11px] border-0 cursor-pointer focus:ring-0 focus:outline-none py-0.5 truncate max-w-[110px]"
                                        title="Pilih Leader atau tambah Person Baru"
                                      >
                                        {(leaders || LEADERS).map(l => (
                                          <option key={l.name} value={l.name} className="dark:bg-slate-800 text-slate-900 dark:text-white">
                                            {l.name}
                                          </option>
                                        ))}
                                        <option disabled className="dark:bg-slate-800 text-slate-400">──────────</option>
                                        <option value="__ADD_PERSON__" className="dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold">
                                          + person
                                        </option>
                                      </select>
                                    </div>
                                  </td>
                                );
                              }

                              if (colKey === 'businessLine') {
                                return (
                                  <td key="businessLine" className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/80" style={{ width: `${columnWidths.businessLine || 130}px`, maxWidth: `${columnWidths.businessLine || 130}px`, overflow: 'hidden' }}>
                                    <select
                                      value={rec.businessLine || groupName}
                                      onChange={(e) => onUpdateRecord(rec.id, { businessLine: e.target.value })}
                                      className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-medium cursor-pointer"
                                    >
                                      {categories.map(c => (
                                        <option key={c} value={c} className="dark:bg-slate-800 text-slate-900 dark:text-white">
                                          {c}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                );
                              }

                              if (colKey === 'startTime') {
                                return (
                                  <td key="startTime" className="py-2 px-2 border-r border-slate-100 dark:border-slate-800/80 text-slate-500 font-mono text-[11px]" style={{ width: `${columnWidths.startTime || 120}px`, maxWidth: `${columnWidths.startTime || 120}px`, overflow: 'hidden' }}>
                                    <input
                                      type="date"
                                      value={rec.startTime || ''}
                                      onChange={(e) => {
                                        const newDate = e.target.value;
                                        onUpdateRecord(rec.id, {
                                          startTime: newDate,
                                          dueDate: newDate
                                        });
                                      }}
                                      className="bg-transparent border-0 cursor-pointer focus:ring-0 text-[11px] font-mono text-slate-600 dark:text-slate-300 w-full"
                                    />
                                  </td>
                                );
                              }

                              if (colKey === 'dueDate') {
                                return (
                                  <td key="dueDate" className="py-1.5 px-2 border-r border-slate-100 dark:border-slate-800/80 text-slate-500 font-mono text-[11px] whitespace-nowrap" style={{ width: `${columnWidths.dueDate || 140}px`, maxWidth: `${columnWidths.dueDate || 140}px`, overflow: 'hidden' }}>
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="date"
                                          value={rec.dueDate || ''}
                                          onChange={(e) => onUpdateRecord(rec.id, { dueDate: e.target.value })}
                                          className="bg-transparent border-0 cursor-pointer focus:ring-0 text-[11px] font-mono text-slate-600 dark:text-slate-300 w-24 p-0"
                                        />
                                        <span className="text-[10px] text-blue-600 dark:text-sky-400 font-semibold cursor-pointer" title="Due Time (Default 9 AM)">
                                          {rec.dueTime || DEFAULT_DUE_TIME}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {rec.reminder === 'NONE' ? (
                                          <span
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onOpenRecord ? onOpenRecord(rec) : (onSelectRecord && onSelectRecord(rec));
                                            }}
                                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-pointer transition shadow-2xs"
                                            title="Reminder: NO REMINDER (Tidak ada pengingat). Klik untuk ubah di Side Peek."
                                          >
                                            <BellOff className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                            <span>Off</span>
                                          </span>
                                        ) : (
                                          <span
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onOpenRecord ? onOpenRecord(rec) : (onSelectRecord && onSelectRecord(rec));
                                            }}
                                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 cursor-pointer transition shadow-2xs"
                                            title={`Reminder: ${rec.reminder === 'D_DAY' || !rec.reminder ? 'D DAY (Hari H)' : rec.reminder?.replace(/_/g, ' ')} @ ${rec.reminderTime || rec.dueTime || DEFAULT_DUE_TIME}. Klik untuk ubah di Side Peek.`}
                                          >
                                            <Bell className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                            <span>
                                              {rec.reminder === '1_DAY_BEFORE' ? '-1D' :
                                               rec.reminder === '2_DAYS_BEFORE' ? '-2D' :
                                               rec.reminder === '3_DAYS_BEFORE' ? '-3D' :
                                               rec.reminder === '7_DAYS_BEFORE' ? '-7D' : 'H'}
                                            </span>
                                            {rec.reminderTime && rec.reminderTime !== rec.dueTime && (
                                              <span className="font-mono text-[8px] opacity-80">
                                                {rec.reminderTime}
                                              </span>
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                );
                              }

                              if (colKey === 'latestUpdate') {
                                return (
                                  <td key="latestUpdate" className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 truncate" style={{ width: `${columnWidths.latestUpdate || 220}px`, maxWidth: `${columnWidths.latestUpdate || 220}px`, overflow: 'hidden' }}>
                                    <div
                                      onClick={() => onOpenRecord && onOpenRecord(rec)}
                                      className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center justify-between gap-1 group/note"
                                      title="Buka Side Peek untuk melihat riwayat atau menambah update"
                                    >
                                      <span className="truncate">
                                        {rec.notes || <span className="text-slate-400 italic">No update</span>}
                                      </span>
                                      <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover/note:opacity-100 shrink-0" />
                                    </div>
                                  </td>
                                );
                              }

                              if (colKey === 'parentItems') {
                                return (
                                  <td key="parentItems" className="py-1.5 px-2 text-slate-400 font-mono text-[11px] whitespace-nowrap" style={{ width: `${columnWidths.parentItems || 150}px`, maxWidth: `${columnWidths.parentItems || 150}px`, overflow: 'hidden' }}>
                                    <select
                                      value={rec.parentId || ''}
                                      onChange={(e) => {
                                        const newParentId = e.target.value;
                                        if (newParentId) {
                                          const parentRec = records.find(r => r.id === newParentId);
                                          onUpdateRecord(rec.id, {
                                            parentId: newParentId,
                                            businessLine: parentRec ? parentRec.businessLine : rec.businessLine
                                          });
                                        } else {
                                          onUpdateRecord(rec.id, { parentId: null });
                                        }
                                      }}
                                      className="bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 font-medium text-[11px] border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded px-1.5 py-0.5 cursor-pointer max-w-[150px] truncate focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      title="Pilih Parent Task jika ingin menjadikan tugas ini sub-task"
                                    >
                                      <option value="" className="dark:bg-slate-800 text-slate-400 font-normal">— (Task Utama)</option>
                                      {getEligibleParents(rec.id).map(p => (
                                        <option key={p.id} value={p.id} className="dark:bg-slate-800 text-slate-800 dark:text-white font-medium">
                                          ↳ Sub-task dari: {p.task || 'Tugas'} ({p.businessLine})
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                );
                              }

                              return null;
                            })}
                          </tr>

                          {/* Sub-task Inline Input Form */}
                          {!isSubCollapsed && inlineSubTaskParentId === rec.id && (
                            <tr className="bg-indigo-50/50 dark:bg-indigo-950/30 border-b border-indigo-200 dark:border-indigo-800/60 animate-in fade-in">
                              <td className="py-2 px-2 text-center text-indigo-500">
                                <CornerDownRight className="w-3.5 h-3.5 mx-auto text-indigo-500" />
                              </td>
                              <td colSpan={10} className="py-2 px-3 pl-8">
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    if (inlineSubTaskName.trim()) {
                                      onInlineAddSubTask && onInlineAddSubTask(rec, inlineSubTaskName.trim());
                                      setInlineSubTaskName('');
                                      setInlineSubTaskParentId(null);
                                    }
                                  }}
                                  className="flex items-center gap-2 max-w-xl"
                                >
                                  <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 shrink-0">
                                    Sub-task untuk: {rec.task.slice(0, 20)}...
                                  </span>
                                  <input
                                    type="text"
                                    placeholder="Ketik nama sub-task... (Tekan Enter)"
                                    value={inlineSubTaskName}
                                    onChange={(e) => setInlineSubTaskName(e.target.value)}
                                    className="flex-1 px-3 py-1 bg-white dark:bg-slate-900 border border-indigo-400 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:outline-none"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Escape') setInlineSubTaskParentId(null);
                                    }}
                                  />
                                  <button
                                    type="submit"
                                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                                  >
                                    Tambah
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setInlineSubTaskParentId(null)}
                                    className="px-2 py-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs"
                                  >
                                    Batal
                                  </button>
                                </form>
                              </td>
                            </tr>
                          )}

                          {/* Sub-tasks Rows */}
                          {!isSubCollapsed &&
                            subTasks.map((sub, sIdx) => {
                              const subPriorityConfig = PRIORITIES[sub.priority] || PRIORITIES.P1;
                              const subStatusConfig = getStatusConfig(sub.status);
                              const subProjectConfig = projects.find(p => p.name === sub.project) || { color: 'bg-slate-100 text-slate-700' };
                              const subLeaderObj = (leaders || LEADERS).find(l => l.name === sub.taskLeader) || {
                                avatar: sub.taskLeader ? sub.taskLeader.slice(0, 2).toUpperCase() : '?',
                                color: 'bg-slate-600 text-white'
                              };

                              return (
                                <tr
                                  key={sub.id}
                                  draggable={true}
                                  onDragStart={(e) => handleDragStart(e, sub.id)}
                                  onDragOver={(e) => handleDragOverTask(e, sub.id)}
                                  onDragLeave={(e) => handleDragLeaveTask(e, sub.id)}
                                  onDrop={(e) => handleDropOnTask(e, sub)}
                                  onClick={(e) => {
                                    if (e.target.closest('button, select, input, textarea, a, [data-no-row-click]')) return;
                                    onOpenRecord ? onOpenRecord(sub) : (onSelectRecord && onSelectRecord(sub));
                                  }}
                                  className={`transition group border-b border-slate-100 dark:border-slate-800/60 cursor-pointer ${
                                    selectedRecordId === sub.id && isSidePeekOpen
                                      ? 'bg-indigo-50/90 dark:bg-indigo-950/40 ring-1 ring-indigo-500/50 border-l-4 border-l-indigo-600'
                                      : dragOverTargetId === sub.id
                                      ? 'bg-indigo-100/90 dark:bg-indigo-950/60 ring-2 ring-indigo-500 scale-[1.003] z-10'
                                      : 'bg-slate-50/60 dark:bg-slate-900/60 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20'
                                  }`}
                                >
                                  {/* 1. Selection & Sub Indicator with Drag Handle */}
                                  <td className="py-2 px-1 text-center text-slate-400 border-r border-slate-100 dark:border-slate-800/80 font-mono text-[11px]">
                                    <div className="flex items-center justify-center gap-0.5 pl-1">
                                      <GripVertical
                                        className="w-3 h-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 hover:text-indigo-500 cursor-grab active:cursor-grabbing shrink-0"
                                        title="Tarik & letakkan ke task lain"
                                      />
                                      <CornerDownRight className="w-3 h-3 text-indigo-400 shrink-0" />
                                      <input
                                        type="checkbox"
                                        checked={sub.status === 'Done'}
                                        onChange={() => onUpdateRecord(sub.id, { status: sub.status === 'Done' ? 'Ongoing' : 'Done' })}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                                      />
                                    </div>
                                  </td>

                                  {/* 2. Sub-Task Name (Indented with sub indicator) */}
                                  <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/80 font-medium text-slate-800 dark:text-slate-100 pl-8" style={{ width: `${columnWidths.task || 340}px`, maxWidth: `${columnWidths.task || 340}px`, overflow: 'hidden' }}>
                                    {editingCell && editingCell.id === sub.id && editingCell.field === 'task' ? (
                                      <input
                                        type="text"
                                        value={cellValue}
                                        onChange={(e) => setCellValue(e.target.value)}
                                        onBlur={() => {
                                          onUpdateRecord(sub.id, { task: cellValue });
                                          setEditingCell(null);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            onUpdateRecord(sub.id, { task: cellValue });
                                            setEditingCell(null);
                                          } else if (e.key === 'Escape') {
                                            setEditingCell(null);
                                          }
                                        }}
                                        className="w-full px-2 py-0.5 bg-white dark:bg-slate-800 border border-indigo-500 rounded text-xs text-slate-800 dark:text-white font-semibold focus:outline-none"
                                        autoFocus
                                      />
                                    ) : (
                                      <div className="flex items-center justify-between gap-1.5">
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenRecord ? onOpenRecord(sub) : (onSelectRecord && onSelectRecord(sub));
                                          }}
                                          onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            setEditingCell({ id: sub.id, field: 'task' });
                                            setCellValue(sub.task || '');
                                          }}
                                          className="cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-1.5 truncate flex-1 min-w-0 font-medium"
                                          title="Klik untuk membuka di Side Peek (Double-klik untuk edit nama)"
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                          <span className={`truncate ${sub.status === 'Done' ? 'line-through text-slate-400' : ''}`}>
                                            {sub.task || <span className="italic text-slate-400">Klik untuk isi nama sub-task...</span>}
                                          </span>
                                        </div>

                                        {/* Subtask Action Buttons: OPEN + 3 Dots Menu Button */}
                                        <div className="flex items-center gap-1 shrink-0">
                                          {/* OPEN button (Notion-style side peek) */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onOpenRecord ? onOpenRecord(sub) : (onSelectRecord && onSelectRecord(sub));
                                            }}
                                            className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition shadow-xs"
                                            title="Buka Sub-task di Panel Samping (Notion Side Peek)"
                                          >
                                            OPEN
                                          </button>

                                           <div>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (taskMenuOpen === sub.id) {
                                                  setTaskMenuOpen(null);
                                                  setTaskMenuTargetRecord(null);
                                                } else {
                                                  const rect = e.currentTarget.getBoundingClientRect();
                                                  const menuWidth = 192;
                                                  const left = Math.max(10, Math.min(window.innerWidth - menuWidth - 10, rect.right - menuWidth));
                                                  const top = rect.bottom + 4;
                                                  setTaskMenuPosition({ top, left });
                                                  setTaskMenuTargetRecord(sub);
                                                  setTaskMenuOpen(sub.id);
                                                }
                                              }}
                                              className={`${
                                                taskMenuOpen === sub.id
                                                  ? 'opacity-100 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white'
                                                  : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                              } p-1 rounded transition`}
                                              title="Opsi Sub-task (Edit / Hapus)"
                                            >
                                              <MoreHorizontal className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </td>

                                  {/* Dynamic Draggable Columns for Sub-task */}
                                  {columnOrder.map(colKey => {
                                    if (colKey === 'priority') {
                                      return (
                                        <td key="priority" className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/80" style={{ width: `${columnWidths.priority || 110}px`, maxWidth: `${columnWidths.priority || 110}px`, overflow: 'hidden' }}>
                                          <select
                                            value={sub.priority || 'P1'}
                                            onChange={(e) => onUpdateRecord(sub.id, { priority: e.target.value })}
                                            className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${subPriorityConfig.color}`}
                                            title="Pilih Priority (P0, P1, P2, P3)"
                                          >
                                            {Object.entries(PRIORITIES).map(([key, cfg]) => (
                                              <option key={key} value={key} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
                                                {cfg.label}
                                              </option>
                                            ))}
                                          </select>
                                        </td>
                                      );
                                    }

                                    if (colKey === 'project') {
                                      return (
                                        <td key="project" className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/80" style={{ width: `${columnWidths.project || 140}px`, maxWidth: `${columnWidths.project || 140}px`, overflow: 'hidden' }}>
                                          <select
                                            value={sub.project || rec.project || 'BETTER FUTURE'}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              if (val === '__ADD_NEW_PROJECT__') {
                                                const input = window.prompt("Nama Project Baru:");
                                                if (input && input.trim()) {
                                                  const created = onAddProject ? onAddProject(input.trim()) : input.trim();
                                                  onUpdateRecord(sub.id, { project: created });
                                                }
                                              } else {
                                                onUpdateRecord(sub.id, { project: val });
                                              }
                                            }}
                                            className="bg-transparent font-semibold border-0 text-[11px] cursor-pointer focus:ring-0 focus:outline-none py-0.5 px-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 max-w-[130px] truncate"
                                            title="Pilih Project atau buat Project Baru"
                                          >
                                            {projects.map(p => (
                                              <option key={p.name} value={p.name} className="dark:bg-slate-800 text-slate-900 dark:text-white font-semibold">
                                                {p.name}
                                              </option>
                                            ))}
                                            <option disabled className="dark:bg-slate-800 text-slate-400">──────────</option>
                                            <option value="__ADD_NEW_PROJECT__" className="dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold">
                                              + Add New Project
                                            </option>
                                          </select>
                                        </td>
                                      );
                                    }

                                    if (colKey === 'status') {
                                      return (
                                        <td key="status" className="py-2 px-2 border-r border-slate-100 dark:border-slate-800/80 whitespace-nowrap" style={{ width: `${columnWidths.status || 140}px`, maxWidth: `${columnWidths.status || 140}px`, overflow: 'hidden' }}>
                                          <select
                                            value={canonicalStatus(sub.status)}
                                            onChange={(e) => onUpdateRecord(sub.id, { status: e.target.value })}
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 transition whitespace-nowrap inline-flex items-center justify-center shrink-0 ${subStatusConfig.color}`}
                                            title="Pilih Status Sub-task"
                                          >
                                            {Object.entries(STATUSES).map(([key, cfg]) => (
                                              <option key={key} value={key} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold">
                                                {cfg.label}
                                              </option>
                                            ))}
                                          </select>
                                        </td>
                                      );
                                    }

                                    if (colKey === 'taskLeader') {
                                      return (
                                        <td key="taskLeader" className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/80" style={{ width: `${columnWidths.taskLeader || 140}px`, maxWidth: `${columnWidths.taskLeader || 140}px`, overflow: 'hidden' }}>
                                          <div className="flex items-center gap-1.5">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm shrink-0 ${subLeaderObj.color}`}>
                                              {subLeaderObj.avatar}
                                            </div>
                                            <select
                                              value={sub.taskLeader || rec.taskLeader || (leaders && leaders[0] && leaders[0].name) || 'Pierre Marchel'}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '__ADD_PERSON__') {
                                                  const input = window.prompt('Tambahkan person baru (Nama):');
                                                  if (input && input.trim()) {
                                                    const created = onAddLeader ? onAddLeader(input.trim()) : input.trim();
                                                    onUpdateRecord(sub.id, { taskLeader: created });
                                                  }
                                                } else {
                                                  onUpdateRecord(sub.id, { taskLeader: val });
                                                }
                                              }}
                                              className="bg-transparent text-slate-700 dark:text-slate-200 text-[11px] border-0 cursor-pointer focus:ring-0 focus:outline-none py-0.5 truncate max-w-[110px]"
                                              title="Pilih Leader atau tambah Person Baru"
                                            >
                                              {(leaders || LEADERS).map(l => (
                                                <option key={l.name} value={l.name} className="dark:bg-slate-800 text-slate-900 dark:text-white">
                                                  {l.name}
                                                </option>
                                              ))}
                                              <option disabled className="dark:bg-slate-800 text-slate-400">──────────</option>
                                              <option value="__ADD_PERSON__" className="dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold">
                                                + person
                                              </option>
                                            </select>
                                          </div>
                                        </td>
                                      );
                                    }

                                    if (colKey === 'businessLine') {
                                      return (
                                        <td key="businessLine" className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/80" style={{ width: `${columnWidths.businessLine || 130}px`, maxWidth: `${columnWidths.businessLine || 130}px`, overflow: 'hidden' }}>
                                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                            {sub.businessLine || rec.businessLine}
                                          </span>
                                        </td>
                                      );
                                    }

                                    if (colKey === 'startTime') {
                                      return (
                                        <td key="startTime" className="py-2 px-2 border-r border-slate-100 dark:border-slate-800/80 text-slate-500 font-mono text-[11px]" style={{ width: `${columnWidths.startTime || 120}px`, maxWidth: `${columnWidths.startTime || 120}px`, overflow: 'hidden' }}>
                                          <input
                                            type="date"
                                            value={sub.startTime || ''}
                                            onChange={(e) => {
                                              const newDate = e.target.value;
                                              onUpdateRecord(sub.id, {
                                                startTime: newDate,
                                                dueDate: newDate
                                              });
                                            }}
                                            className="bg-transparent border-0 cursor-pointer focus:ring-0 text-[11px] font-mono text-slate-600 dark:text-slate-300 w-full"
                                          />
                                        </td>
                                      );
                                    }

                                    if (colKey === 'dueDate') {
                                      return (
                                        <td key="dueDate" className="py-1.5 px-2 border-r border-slate-100 dark:border-slate-800/80 text-slate-500 font-mono text-[11px] whitespace-nowrap" style={{ width: `${columnWidths.dueDate || 140}px`, maxWidth: `${columnWidths.dueDate || 140}px`, overflow: 'hidden' }}>
                                          <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1">
                                              <input
                                                type="date"
                                                value={sub.dueDate || ''}
                                                onChange={(e) => onUpdateRecord(sub.id, { dueDate: e.target.value })}
                                                className="bg-transparent border-0 cursor-pointer focus:ring-0 text-[11px] font-mono text-slate-600 dark:text-slate-300 w-24 p-0"
                                              />
                                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer" title="Due Time (Default 9 AM)">
                                                {sub.dueTime || DEFAULT_DUE_TIME}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              {sub.reminder === 'NONE' ? (
                                                <span
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenRecord ? onOpenRecord(sub) : (onSelectRecord && onSelectRecord(sub));
                                                  }}
                                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-pointer transition shadow-2xs"
                                                  title="Reminder: NO REMINDER (Tidak ada pengingat). Klik untuk ubah di Side Peek."
                                                >
                                                  <BellOff className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                                  <span>Off</span>
                                                </span>
                                              ) : (
                                                <span
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenRecord ? onOpenRecord(sub) : (onSelectRecord && onSelectRecord(sub));
                                                  }}
                                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 cursor-pointer transition shadow-2xs"
                                                  title={`Reminder: ${sub.reminder === 'D_DAY' || !sub.reminder ? 'D DAY (Hari H)' : sub.reminder?.replace(/_/g, ' ')} @ ${sub.reminderTime || sub.dueTime || DEFAULT_DUE_TIME}. Klik untuk ubah di Side Peek.`}
                                                >
                                                  <Bell className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                                  <span>
                                                    {sub.reminder === '1_DAY_BEFORE' ? '-1D' :
                                                     sub.reminder === '2_DAYS_BEFORE' ? '-2D' :
                                                     sub.reminder === '3_DAYS_BEFORE' ? '-3D' :
                                                     sub.reminder === '7_DAYS_BEFORE' ? '-7D' : 'H'}
                                                  </span>
                                                  {sub.reminderTime && sub.reminderTime !== sub.dueTime && (
                                                    <span className="font-mono text-[8px] opacity-80">
                                                      {sub.reminderTime}
                                                    </span>
                                                  )}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                      );
                                    }

                                    if (colKey === 'latestUpdate') {
                                      return (
                                        <td key="latestUpdate" className="py-2 px-3 border-r border-slate-100 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 truncate" style={{ width: `${columnWidths.latestUpdate || 220}px`, maxWidth: `${columnWidths.latestUpdate || 220}px`, overflow: 'hidden' }}>
                                          <div
                                            onClick={() => onOpenRecord && onOpenRecord(sub)}
                                            className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center justify-between gap-1 group/note"
                                            title="Buka Side Peek untuk melihat riwayat atau menambah update"
                                          >
                                            <span className="truncate">
                                              {sub.notes || <span className="text-slate-400 italic">No update</span>}
                                            </span>
                                            <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover/note:opacity-100 shrink-0" />
                                          </div>
                                        </td>
                                      );
                                    }

                                    if (colKey === 'parentItems') {
                                      return (
                                        <td key="parentItems" className="py-1.5 px-2 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px] whitespace-nowrap" style={{ width: `${columnWidths.parentItems || 150}px`, maxWidth: `${columnWidths.parentItems || 150}px`, overflow: 'hidden' }}>
                                          <div className="flex items-center gap-1">
                                            <GitCommit className="w-3 h-3 text-indigo-500 shrink-0" />
                                            <select
                                              value={sub.parentId || ''}
                                              onChange={(e) => {
                                                const newParentId = e.target.value;
                                                if (newParentId) {
                                                  const parentRec = records.find(r => r.id === newParentId);
                                                  onUpdateRecord(sub.id, {
                                                    parentId: newParentId,
                                                    businessLine: parentRec ? parentRec.businessLine : sub.businessLine
                                                  });
                                                } else {
                                                  // Detach: convert sub-task to top-level task!
                                                  onUpdateRecord(sub.id, { parentId: null });
                                                }
                                              }}
                                              className="bg-indigo-50/80 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] border border-indigo-200 dark:border-indigo-800 rounded px-1.5 py-0.5 cursor-pointer max-w-[140px] truncate focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                              title="Ganti parent atau pisahkan menjadi Task Utama"
                                            >
                                              <option value="" className="dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                ⬆ Pisahkan (Jadikan Task Utama)
                                              </option>
                                              {getEligibleParents(sub.id).map(p => (
                                                <option key={p.id} value={p.id} className="dark:bg-slate-800 text-slate-800 dark:text-white font-medium">
                                                  {p.id === sub.parentId ? `✓ ${p.task || 'Parent Saat Ini'}` : `↳ Pindah ke: ${p.task || 'Tugas'}`}
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                        </td>
                                      );
                                    }

                                    return null;
                                  })}
                                </tr>
                              );
                            })}
                        </React.Fragment>
                      );
                    });
                  })()}

                {/* Shortcut button at the BOTTOM of the group */}
                {!isCollapsed && inlineAddingGroup !== groupName && (
                  <tr className="bg-slate-50/40 dark:bg-slate-900/40 text-neutral-400 hover:text-apple-blue dark:hover:text-sky-400 cursor-pointer transition">
                    <td
                      colSpan={10}
                      className="py-2.5 px-6"
                      onClick={() => {
                        setInlineAddingGroup(groupName);
                        setInlineTaskName('');
                        setTimeout(() => {
                          const inputEl = document.getElementById(`inline-task-input-${groupName}`);
                          if (inputEl) {
                            inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            inputEl.focus();
                          }
                        }, 50);
                      }}
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add Task langsung ke {groupName}...</span>
                      </div>
                    </td>
                  </tr>
                )}

              </React.Fragment>
            );
          })}

          {/* + Add New Business Line / Category Button at Bottom */}
          <tr className="bg-slate-100/50 dark:bg-slate-800/40 border-t-2 border-dashed border-slate-200 dark:border-slate-700">
            <td colSpan={10} className="py-2.5 px-4">
              {isAddingNewCategory ? (
                <form onSubmit={handleCreateCategory} className="flex items-center gap-2 max-w-sm">
                  <input
                    type="text"
                    placeholder="Nama Kategori Baru (misal: HR, SALES)..."
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-blue-500 rounded-lg text-xs font-semibold text-slate-800 dark:text-white focus:outline-none shadow-xs"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNewCategory(false);
                      setNewCatInput('');
                    }}
                    className="px-2.5 py-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-medium"
                  >
                    Batal
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingNewCategory(true)}
                  className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold text-xs px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Kategori Baru (New Category / Business Line)</span>
                </button>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Portal Dropdown Menu for Parent Tasks and Sub-tasks */}
      {taskMenuOpen && taskMenuTargetRecord && createPortal(
        <div
          data-task-portal-menu
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: `${taskMenuPosition.top}px`,
            left: `${taskMenuPosition.left}px`,
            zIndex: 99999
          }}
          className="w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl p-1 text-xs animate-in fade-in zoom-in-95 select-none"
        >
          {taskMenuTargetRecord.parentId ? (
            /* Sub-task Actions */
            <>
              <button
                type="button"
                onClick={() => {
                  const target = taskMenuTargetRecord;
                  setTaskMenuOpen(null);
                  setTaskMenuTargetRecord(null);
                  onSelectRecord && onSelectRecord(target);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition text-left"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Edit Detail Sub-task</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = taskMenuTargetRecord;
                  setTaskMenuOpen(null);
                  setTaskMenuTargetRecord(null);
                  onUpdateRecord && onUpdateRecord(target.id, { parentId: null });
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/30 text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 font-medium transition text-left"
                title="Jadikan tugas utama mandiri (bukan sub-task)"
              >
                <CornerDownRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Pisahkan Jadi Task Utama</span>
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

              <button
                type="button"
                onClick={() => {
                  const targetId = taskMenuTargetRecord.id;
                  setTaskMenuOpen(null);
                  setTaskMenuTargetRecord(null);
                  onDeleteRecord && onDeleteRecord(targetId);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium transition text-left"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Hapus Sub-task</span>
              </button>
            </>
          ) : (
            /* Parent Task Actions */
            <>
              <button
                type="button"
                onClick={() => {
                  const target = taskMenuTargetRecord;
                  setTaskMenuOpen(null);
                  setTaskMenuTargetRecord(null);
                  onSelectRecord && onSelectRecord(target);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition text-left"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Edit Detail Task</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = taskMenuTargetRecord;
                  setInlineSubTaskParentId(target.id);
                  setInlineSubTaskName('');
                  setCollapsedSubTasks(prev => ({ ...prev, [target.id]: false }));
                  setTaskMenuOpen(null);
                  setTaskMenuTargetRecord(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition text-left"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Tambah Sub-task</span>
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

              <button
                type="button"
                onClick={() => {
                  const targetId = taskMenuTargetRecord.id;
                  setTaskMenuOpen(null);
                  setTaskMenuTargetRecord(null);
                  onDeleteRecord && onDeleteRecord(targetId);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium transition text-left"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Hapus Task</span>
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
