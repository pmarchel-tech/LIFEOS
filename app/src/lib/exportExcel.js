import XLSX from 'xlsx-js-style';
import { canonicalStatus } from '../data/initialData';

// Helper: Format date string YYYY-MM-DD to "Sep-14" format (matching user table cells)
export const formatCellDate = (dateStr) => {
  if (!dateStr || dateStr === '-') return '-';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mIdx = parseInt(parts[1], 10) - 1;
    const dNum = parseInt(parts[2], 10);
    if (!isNaN(mIdx) && mIdx >= 0 && mIdx < 12) {
      return `${months[mIdx]}-${String(dNum).padStart(2, '0')}`;
    }
  }
  return dateStr;
};

// Helper: Format Date object to YYYY-MM-DD
export const formatYMD = (d) => {
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: Extract latest update note with formatted date
export const getLatestUpdateString = (task) => {
  if (Array.isArray(task.updates) && task.updates.length > 0) {
    const first = task.updates[0];
    const d = first.date ? formatCellDate(first.date) : '';
    return d ? `[${d}] - ${first.text || ''}` : (first.text || '');
  }
  if (task.notes && task.notes.trim()) {
    const d = task.dueDate ? formatCellDate(task.dueDate) : '';
    return d ? `[${d}] - ${task.notes.trim()}` : task.notes.trim();
  }
  return '';
};

// Helper: Check if category is 'PERSONAL' (case-insensitive)
export const isPersonalCategory = (cat) => {
  return String(cat || '').trim().toUpperCase() === 'PERSONAL';
};

// Helper: Compute weekly planning data if not provided
export const computeWeeklyPlanningData = (records, mondayInput) => {
  const today = new Date();
  let baseMonday;

  if (mondayInput instanceof Date && !isNaN(mondayInput.getTime())) {
    baseMonday = new Date(mondayInput.getFullYear(), mondayInput.getMonth(), mondayInput.getDate());
  } else if (typeof mondayInput === 'string' && mondayInput.includes('-')) {
    const parts = mondayInput.split('-').map(Number);
    baseMonday = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    baseMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const day = baseMonday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    baseMonday.setDate(baseMonday.getDate() + diff);
  }

  const baseSunday = new Date(baseMonday);
  baseSunday.setDate(baseSunday.getDate() + 6);

  const weekStart = new Date(baseMonday.getFullYear(), baseMonday.getMonth(), baseMonday.getDate(), 0, 0, 0);
  const weekEnd = new Date(baseSunday.getFullYear(), baseSunday.getMonth(), baseSunday.getDate(), 23, 59, 59, 999);

  let overdueCnt = 0;
  const recordsWithMeta = [];
  const addedIds = new Set();
  const recordsMap = new Map((records || []).map(r => [r.id, r]));

  (records || []).forEach(r => {
    const canon = canonicalStatus(r.status);
    if (canon === 'Archived') return;
    // Exclude PERSONAL category from export
    if (isPersonalCategory(r.businessLine)) return;

    let targetDate = null;
    const dateStr = r.dueDate || r.startTime;
    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) targetDate = d;
      }
    }
    if (!targetDate) return;

    if (targetDate >= weekStart && targetDate <= weekEnd) {
      recordsWithMeta.push({ ...r, isOverduePrior: false });
      addedIds.add(r.id);
    } else if (targetDate < weekStart && canon !== 'Done') {
      overdueCnt += 1;
      recordsWithMeta.push({ ...r, isOverduePrior: true });
      addedIds.add(r.id);
    }
  });

  // Ensure parent tasks of included children are present
  recordsWithMeta.forEach(r => {
    if (r.parentId && !addedIds.has(r.parentId)) {
      const parentRec = recordsMap.get(r.parentId);
      if (parentRec) {
        addedIds.add(parentRec.id);
        recordsWithMeta.push({ ...parentRec, isOverduePrior: false, isParentIncludedForChild: true });
      }
    }
  });

  // Group by Leader
  const groups = {};
  recordsWithMeta.forEach(r => {
    const leader = (r.taskLeader && r.taskLeader.trim()) || 'Unassigned';
    if (!groups[leader]) groups[leader] = [];
    groups[leader].push(r);
  });

  const getPriorityRank = (p) => {
    const upper = String(p || '').toUpperCase().trim();
    if (upper === 'P0') return 0;
    if (upper === 'P1') return 1;
    if (upper === 'P2') return 2;
    if (upper === 'P3') return 3;
    return 4;
  };

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

  Object.keys(groups).forEach(leader => {
    const allTasks = groups[leader];
    const parents = [];
    const childrenByParent = {};
    const taskById = new Map(allTasks.map(t => [t.id, t]));

    allTasks.forEach(t => {
      if (t.parentId) {
        if (!childrenByParent[t.parentId]) childrenByParent[t.parentId] = [];
        childrenByParent[t.parentId].push(t);
      } else {
        parents.push(t);
      }
    });

    parents.sort(taskSorter);
    const structuredTasks = [];
    const visitedChildren = new Set();

    parents.forEach(parent => {
      const children = childrenByParent[parent.id] || [];
      children.sort(taskSorter);
      structuredTasks.push({ ...parent, isSubTask: false, hasSubTasks: children.length > 0 });
      children.forEach(child => {
        visitedChildren.add(child.id);
        structuredTasks.push({ ...child, isSubTask: true, parentTaskTitle: parent.task });
      });
    });

    Object.keys(childrenByParent).forEach(pId => {
      if (!taskById.has(pId)) {
        (childrenByParent[pId] || []).forEach(child => {
          if (!visitedChildren.has(child.id)) {
            structuredTasks.push({ ...child, isSubTask: true, parentTaskTitle: 'Parent Task' });
          }
        });
      }
    });

    groups[leader] = structuredTasks;
  });

  const sortedLeaderNames = Object.keys(groups).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const groupedByLeader = sortedLeaderNames.map(name => ({
    leader: name,
    tasks: groups[name]
  }));

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const periodStr = `${months[baseMonday.getMonth()]} ${baseMonday.getDate()} - ${months[baseSunday.getMonth()]} ${baseSunday.getDate()}, ${baseSunday.getFullYear()}`;

  return {
    weeklyRecords: recordsWithMeta,
    overdueCount: overdueCnt,
    groupedByLeader,
    currentMonday: baseMonday,
    currentSunday: baseSunday,
    periodStr
  };
};

/**
 * Main export function: generates a high-fidelity Excel (.xlsx) file
 * with formatting matching the Weekly Planning report screen display.
 */
export function exportWeeklyPlanningExcel({
  records = [],
  groupedByLeader: providedGrouped,
  currentMonday: providedMonday,
  currentSunday: providedSunday,
  periodStr: providedPeriod,
  filenameOverride
}) {
  let groupedByLeader = providedGrouped;
  let currentMonday = providedMonday;
  let currentSunday = providedSunday;
  let periodStr = providedPeriod;

  // If groupedByLeader is not supplied, auto-compute from records
  if (!groupedByLeader) {
    const computed = computeWeeklyPlanningData(records, currentMonday);
    groupedByLeader = computed.groupedByLeader;
    currentMonday = computed.currentMonday;
    currentSunday = computed.currentSunday;
    periodStr = computed.periodStr;
  }

  // Ensure all PERSONAL category tasks are strictly excluded from export, and prune any empty leader groups
  groupedByLeader = (groupedByLeader || [])
    .map(group => ({
      ...group,
      tasks: (group.tasks || []).filter(t => !isPersonalCategory(t.businessLine))
    }))
    .filter(group => group.tasks.length > 0);

  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // Common Styles for Premium Apple/Notion Theme
  // -------------------------------------------------------------
  const fontBase = { name: 'Segoe UI' };

  const borderThin = {
    top: { style: 'thin', color: { rgb: 'E2E8F0' } },
    bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
    left: { style: 'thin', color: { rgb: 'E2E8F0' } },
    right: { style: 'thin', color: { rgb: 'E2E8F0' } }
  };

  const headerStyle = {
    font: { ...fontBase, bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '0071E3' } }, // Apple System Blue
    alignment: { vertical: 'center', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '005BB5' } },
      bottom: { style: 'medium', color: { rgb: '005BB5' } },
      left: { style: 'thin', color: { rgb: '005BB5' } },
      right: { style: 'thin', color: { rgb: '005BB5' } }
    }
  };

  const leaderHeaderStyle = {
    font: { ...fontBase, bold: true, sz: 11, color: { rgb: '0369A1' } }, // Sky-700
    fill: { fgColor: { rgb: 'E0F2FE' } }, // Soft Ice Blue
    alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
    border: {
      top: { style: 'thin', color: { rgb: 'BAE6FD' } },
      bottom: { style: 'thin', color: { rgb: 'BAE6FD' } },
      left: { style: 'thin', color: { rgb: 'BAE6FD' } },
      right: { style: 'thin', color: { rgb: 'BAE6FD' } }
    }
  };

  // -------------------------------------------------------------
  // SHEET 1: Weekly Planning (Exact View Layout)
  // -------------------------------------------------------------
  const wsData1 = [];
  const merges1 = [];
  const rowsConfig1 = [];

  // Row 0: Title Banner
  wsData1.push(['WEEKLY PLANNING REPORT', '', '', '', '', '', '']);
  merges1.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } });
  rowsConfig1.push({ hpt: 26 });

  // Row 1: Period Subtitle
  let totalTasksCount = 0;
  groupedByLeader.forEach(g => { totalTasksCount += g.tasks.length; });
  wsData1.push([`Periode : ${periodStr || ''}   |   Total : ${totalTasksCount} Tugas`, '', '', '', '', '', '']);
  merges1.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 6 } });
  rowsConfig1.push({ hpt: 18 });

  // Row 2: Empty Spacer
  wsData1.push(['', '', '', '', '', '', '']);
  rowsConfig1.push({ hpt: 8 });

  // Row 3: Column Headers (matching screen display: Category, Task, Task Due date, Priority, Project, Status, Latest update)
  const headers1 = ['Category', 'Task', 'Task Due date', 'Priority', 'Project', 'Status', 'Latest update'];
  wsData1.push(headers1);
  rowsConfig1.push({ hpt: 22 });

  // Row index tracker for styling
  let currentRowIdx = 4;
  const leaderRowIndices = [];
  const taskRowInfos = [];

  groupedByLeader.forEach(group => {
    // Leader Section Row: "▶ [Leader Name] ([Count] task)"
    const leaderLabel = `▶  ${group.leader} (${group.tasks.length} task)`;
    wsData1.push([leaderLabel, '', '', '', '', '', '']);
    merges1.push({ s: { r: currentRowIdx, c: 0 }, e: { r: currentRowIdx, c: 6 } });
    leaderRowIndices.push(currentRowIdx);
    rowsConfig1.push({ hpt: 22 });
    currentRowIdx++;

    // Tasks under this leader
    group.tasks.forEach(t => {
      let taskTitle = t.task || '';
      if (t.isOverduePrior) {
        taskTitle = `[overdue] - ${taskTitle}`;
      }
      if (t.isSubTask) {
        taskTitle = `   ↳ ${taskTitle}`;
      }

      const categoryVal = t.businessLine || '-';
      const dueDateVal = formatCellDate(t.dueDate || t.startTime);
      const priorityVal = t.priority || 'P1';
      const projectVal = t.project || '-';
      const statusVal = canonicalStatus(t.status);
      const latestUpdateVal = getLatestUpdateString(t);

      wsData1.push([
        categoryVal,
        taskTitle,
        dueDateVal,
        priorityVal,
        projectVal,
        statusVal,
        latestUpdateVal
      ]);

      taskRowInfos.push({
        rowIdx: currentRowIdx,
        isSubTask: t.isSubTask,
        isOverdue: t.isOverduePrior,
        priority: priorityVal,
        status: statusVal
      });

      rowsConfig1.push({ hpt: 20 });
      currentRowIdx++;
    });
  });

  const ws1 = XLSX.utils.aoa_to_sheet(wsData1);
  ws1['!merges'] = merges1;
  ws1['!rows'] = rowsConfig1;
  ws1['!cols'] = [
    { wch: 18 }, // Category
    { wch: 46 }, // Task
    { wch: 15 }, // Task Due date
    { wch: 12 }, // Priority
    { wch: 22 }, // Project
    { wch: 16 }, // Status
    { wch: 60 }  // Latest update
  ];

  // Apply Styles to Sheet 1
  if (ws1['A1']) {
    ws1['A1'].s = {
      font: { ...fontBase, bold: true, sz: 14, color: { rgb: '0F172A' } },
      alignment: { vertical: 'center' }
    };
  }
  if (ws1['A2']) {
    ws1['A2'].s = {
      font: { ...fontBase, italic: true, sz: 10, color: { rgb: '64748B' } },
      alignment: { vertical: 'center' }
    };
  }

  // Headers (Row 3 -> index 3, Excel row 4)
  const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  colLetters.forEach(col => {
    const cellRef = `${col}4`;
    if (ws1[cellRef]) {
      ws1[cellRef].s = {
        ...headerStyle,
        alignment: {
          vertical: 'center',
          horizontal: col === 'A' || col === 'B' || col === 'G' ? 'left' : 'center'
        }
      };
    }
  });

  // Leader Rows
  leaderRowIndices.forEach(rIdx => {
    const excelRow = rIdx + 1;
    colLetters.forEach(col => {
      const cellRef = `${col}${excelRow}`;
      if (!ws1[cellRef]) ws1[cellRef] = { t: 's', v: '' };
      ws1[cellRef].s = leaderHeaderStyle;
    });
  });

  // Task Rows
  taskRowInfos.forEach(info => {
    const excelRow = info.rowIdx + 1;
    const isAlt = info.rowIdx % 2 === 0;
    const bgFill = isAlt ? { fgColor: { rgb: 'F8FAFC' } } : { fgColor: { rgb: 'FFFFFF' } };

    colLetters.forEach(col => {
      const cellRef = `${col}${excelRow}`;
      if (!ws1[cellRef]) ws1[cellRef] = { t: 's', v: '' };

      const isCenter = col === 'C' || col === 'D' || col === 'F';
      const cellFont = {
        ...fontBase,
        sz: 9.5,
        color: info.isSubTask ? { rgb: '475569' } : { rgb: '0F172A' },
        bold: col === 'D' || (col === 'B' && !info.isSubTask)
      };

      ws1[cellRef].s = {
        font: cellFont,
        fill: bgFill,
        border: borderThin,
        alignment: {
          vertical: 'center',
          horizontal: isCenter ? 'center' : 'left',
          wrapText: col === 'B' || col === 'G'
        }
      };
    });
  });

  XLSX.utils.book_append_sheet(wb, ws1, 'Weekly Planning');

  // -------------------------------------------------------------
  // SHEET 2: Data Mentah (Filterable Table with Task Leader column)
  // -------------------------------------------------------------
  const wsData2 = [];
  const rowsConfig2 = [];
  const headers2 = ['Task Leader', 'Category', 'Task', 'Task Due Date', 'Priority', 'Project', 'Status', 'Latest update'];
  wsData2.push(headers2);
  rowsConfig2.push({ hpt: 22 });

  groupedByLeader.forEach(group => {
    group.tasks.forEach(t => {
      let taskTitle = t.task || '';
      if (t.isOverduePrior) taskTitle = `[overdue] - ${taskTitle}`;
      if (t.isSubTask) taskTitle = `   ↳ ${taskTitle}`;

      wsData2.push([
        group.leader,
        t.businessLine || '-',
        taskTitle,
        formatCellDate(t.dueDate || t.startTime),
        t.priority || 'P1',
        t.project || '-',
        canonicalStatus(t.status),
        getLatestUpdateString(t)
      ]);
      rowsConfig2.push({ hpt: 19 });
    });
  });

  const ws2 = XLSX.utils.aoa_to_sheet(wsData2);
  ws2['!rows'] = rowsConfig2;
  ws2['!cols'] = [
    { wch: 18 }, // Task Leader
    { wch: 18 }, // Category
    { wch: 46 }, // Task
    { wch: 15 }, // Task Due Date
    { wch: 12 }, // Priority
    { wch: 22 }, // Project
    { wch: 16 }, // Status
    { wch: 60 }  // Latest update
  ];

  // AutoFilter for Sheet 2
  if (wsData2.length > 1) {
    ws2['!autofilter'] = {
      ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: wsData2.length - 1, c: 7 } })
    };
  }

  // Style Sheet 2 Header
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
    const cellRef = `${col}1`;
    if (ws2[cellRef]) {
      ws2[cellRef].s = {
        ...headerStyle,
        alignment: {
          vertical: 'center',
          horizontal: col === 'D' || col === 'E' || col === 'G' ? 'center' : 'left'
        }
      };
    }
  });

  // Style Sheet 2 Data
  for (let r = 1; r < wsData2.length; r++) {
    const excelRow = r + 1;
    const bgFill = r % 2 === 0 ? { fgColor: { rgb: 'F8FAFC' } } : { fgColor: { rgb: 'FFFFFF' } };
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
      const cellRef = `${col}${excelRow}`;
      if (!ws2[cellRef]) ws2[cellRef] = { t: 's', v: '' };
      const isCenter = col === 'D' || col === 'E' || col === 'G';
      ws2[cellRef].s = {
        font: { ...fontBase, sz: 9.5, color: { rgb: '0F172A' } },
        fill: bgFill,
        border: borderThin,
        alignment: {
          vertical: 'center',
          horizontal: isCenter ? 'center' : 'left',
          wrapText: col === 'C' || col === 'H'
        }
      };
    });
  }

  XLSX.utils.book_append_sheet(wb, ws2, 'Tabel Filter');

  // -------------------------------------------------------------
  // SHEET 3: Semua Task (Master Database)
  // -------------------------------------------------------------
  const masterRecords = (Array.isArray(records) ? records : []).filter(r => !isPersonalCategory(r.businessLine));
  if (masterRecords.length > 0) {
    const wsData3 = [];
    const headers3 = ['ID', 'Task Leader', 'Category', 'Task', 'Due Date', 'Due Time', 'Priority', 'Project', 'Status', 'Reminder', 'Latest Update', 'Total Riwayat'];
    wsData3.push(headers3);

    masterRecords.forEach(r => {
      wsData3.push([
        r.id || '',
        r.taskLeader || 'Unassigned',
        r.businessLine || '',
        r.task || '',
        r.dueDate || '',
        r.dueTime || '09:00',
        r.priority || 'P1',
        r.project || '',
        canonicalStatus(r.status),
        r.reminder || 'NONE',
        getLatestUpdateString(r),
        Array.isArray(r.updates) ? r.updates.length : (r.notes ? 1 : 0)
      ]);
    });

    const ws3 = XLSX.utils.aoa_to_sheet(wsData3);
    ws3['!cols'] = [
      { wch: 14 }, // ID
      { wch: 18 }, // Task Leader
      { wch: 18 }, // Category
      { wch: 45 }, // Task
      { wch: 14 }, // Due Date
      { wch: 10 }, // Due Time
      { wch: 10 }, // Priority
      { wch: 20 }, // Project
      { wch: 15 }, // Status
      { wch: 12 }, // Reminder
      { wch: 55 }, // Latest Update
      { wch: 14 }  // Total Riwayat
    ];

    if (wsData3.length > 1) {
      ws3['!autofilter'] = {
        ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: wsData3.length - 1, c: 11 } })
      };
    }

    const headerLetters3 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    headerLetters3.forEach(col => {
      const cellRef = `${col}1`;
      if (ws3[cellRef]) {
        ws3[cellRef].s = {
          ...headerStyle,
          fill: { fgColor: { rgb: '334155' } }, // Slate-700
          border: {
            top: { style: 'thin', color: { rgb: '1E293B' } },
            bottom: { style: 'medium', color: { rgb: '1E293B' } },
            left: { style: 'thin', color: { rgb: '1E293B' } },
            right: { style: 'thin', color: { rgb: '1E293B' } }
          }
        };
      }
    });

    for (let r = 1; r < wsData3.length; r++) {
      const excelRow = r + 1;
      const bgFill = r % 2 === 0 ? { fgColor: { rgb: 'F8FAFC' } } : { fgColor: { rgb: 'FFFFFF' } };
      headerLetters3.forEach(col => {
        const cellRef = `${col}${excelRow}`;
        if (!ws3[cellRef]) ws3[cellRef] = { t: 's', v: '' };
        const isCenter = col === 'A' || col === 'E' || col === 'F' || col === 'G' || col === 'I' || col === 'J' || col === 'L';
        ws3[cellRef].s = {
          font: { ...fontBase, sz: 9.5, color: { rgb: '0F172A' } },
          fill: bgFill,
          border: borderThin,
          alignment: {
            vertical: 'center',
            horizontal: isCenter ? 'center' : 'left',
            wrapText: col === 'D' || col === 'K'
          }
        };
      });
    }

    XLSX.utils.book_append_sheet(wb, ws3, 'Semua Task (Master)');
  }

  // -------------------------------------------------------------
  // Trigger File Download in Browser
  // -------------------------------------------------------------
  const mondayStr = formatYMD(currentMonday) || 'week';
  const sundayStr = formatYMD(currentSunday) || '';
  const finalFilename = filenameOverride || `Weekly_Planning_${mondayStr}${sundayStr ? `_to_${sundayStr}` : ''}.xlsx`;

  XLSX.writeFile(wb, finalFilename);
  return finalFilename;
}
