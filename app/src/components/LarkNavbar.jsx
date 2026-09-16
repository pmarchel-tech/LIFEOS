import React, { useState, useEffect } from 'react';
import {
  Layers,
  ArrowUpDown,
  Search,
  Plus,
  Compass,
  Clock,
  LayoutGrid,
  Kanban,
  User,
  Table as TableIcon,
  Calendar as CalendarIcon,
  ChevronDown,
  Sparkles,
  Download,
  RotateCcw,
  Check,
  X,
  Sun,
  Moon,
  FileSpreadsheet,
  Bell,
  BellOff,
  Database,
  Cloud,
  History
} from 'lucide-react';
import { MANDATE, ELEMENTS, PRIORITIES, STATUSES, BUSINESS_LINES, canonicalStatus, REMINDER_OPTIONS } from '../data/initialData';
import { requestNotificationPermission, getNotificationPermission, sendTestNotification } from '../utils/notificationService';
import { NotificationDrawer, calculateNotificationItems } from './NotificationDrawer';
import { ActivityLogDrawer } from './ActivityLogDrawer';

export function LarkNavbar({
  activeView,
  setActiveView,
  onAddRecord,
  searchQuery,
  setSearchQuery,
  elementFilter,
  setElementFilter,
  sortField,
  sortOrder,
  onSort,
  onOpenMandala,
  onOpenTimer,
  onExportData,
  onResetData,
  onRestoreData,
  onLoadTemplateData,
  totalRecords,
  // Kanban filter props
  kanbanPriorityFilter,
  setKanbanPriorityFilter,
  kanbanProjectFilter,
  setKanbanProjectFilter,
  kanbanStatusFilter,
  setKanbanStatusFilter,
  kanbanLeaderFilter,
  setKanbanLeaderFilter,
  kanbanDueDateFilter,
  setKanbanDueDateFilter,
  activeKanbanFiltersCount,
  onResetKanbanFilters,
  projects,
  leaders,
  categories = BUSINESS_LINES,
  isDarkMode = true,
  onToggleDarkMode,
  allRecords = [],
  dismissedNotifIds = [],
  onDismissNotification,
  onDismissAllNotifications,
  onSelectRecord,
  activityLogs = [],
  onUpdateActivityLogs
}) {
  const hasFilterToolbar = ['table', 'priority', 'leader', 'progress', 'calendar', 'due_date'].includes(activeView);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showAddRecordMenu, setShowAddRecordMenu] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [notifStatus, setNotifStatus] = useState(() => getNotificationPermission());

  useEffect(() => {
    setNotifStatus(getNotificationPermission());
  }, []);

  const handleRequestNotif = async () => {
    const res = await requestNotificationPermission();
    setNotifStatus(res);
    if (res === 'granted') {
      sendTestNotification();
    } else if (res === 'denied') {
      alert('Izin notifikasi diblokir di browser. Klik ikon gembok / pengaturan situs di sebelah URL browser dan pilih "Izinkan / Allow" untuk Notifications.');
    }
  };

  // Calculate unread notification count badge for the bell button (exactly matches Notification Center items)
  const unreadCount = React.useMemo(() => {
    return calculateNotificationItems(allRecords, dismissedNotifIds).totalUnread;
  }, [allRecords, dismissedNotifIds]);

  useEffect(() => {
    const handleDocumentClick = () => {
      setShowSortMenu(false);
      setShowFilterMenu(false);
      setShowAddRecordMenu(false);
      setShowNavMenu(false);
      setShowNotifDrawer(false);
    };
    if (showSortMenu || showFilterMenu || showAddRecordMenu || showNavMenu || showNotifDrawer) {
      document.addEventListener('click', handleDocumentClick);
      return () => document.removeEventListener('click', handleDocumentClick);
    }
  }, [showSortMenu, showFilterMenu, showAddRecordMenu, showNavMenu, showNotifDrawer]);

  const views = [
    { id: 'table', label: 'Task list', icon: TableIcon },
    { id: 'priority', label: 'Priority kanban', icon: Kanban },
    { id: 'leader', label: 'Task leader kanban', icon: User },
    { id: 'progress', label: 'Progress kanban', icon: Layers },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'due_date', label: 'Task Due', icon: Clock },
    { id: 'weekly_planning', label: 'Weekly Planning', icon: FileSpreadsheet }
  ];

  return (
    <header className="apple-glass border-b border-neutral-200/80 dark:border-white/10 select-none shadow-[0_1px_3px_rgba(0,0,0,0.05)] sticky top-0 z-30 transition-colors">
      
      {/* Top Bar: macOS window-style header with title and utility actions */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/50 dark:border-white/5">
        
        {/* Breadcrumb / Title with Apple typography and Menu Dropdown */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowNavMenu(prev => !prev);
              }}
              className="flex items-center gap-2 cursor-pointer font-semibold text-neutral-900 dark:text-neutral-100 hover:text-apple-blue transition text-sm sm:text-[15px] tracking-tight group px-2 py-1 -ml-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
            >
              <span className="w-5 h-5 rounded-md bg-apple-blue/10 dark:bg-apple-blue/20 text-apple-blue flex items-center justify-center font-bold text-xs">
                {activeView === 'weekly_planning' ? '􀉉' : '􀋊'}
              </span>
              <span className="font-semibold">
                {activeView === 'weekly_planning' ? 'Reporting' : 'Task Management'}
              </span>
              {activeView === 'weekly_planning' && (
                <>
                  <span className="text-neutral-400 dark:text-neutral-500 font-normal text-xs">/</span>
                  <span className="text-xs font-semibold text-apple-blue dark:text-sky-400">Operasional</span>
                  <span className="text-neutral-400 dark:text-neutral-500 font-normal text-xs">/</span>
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Weekly Planning</span>
                </>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 dark:text-neutral-500 dark:group-hover:text-neutral-300 transition-transform" />
            </button>

            {/* Navigation Menu Dropdown: Task Management & Reporting (Operasional > Weekly Planning) */}
            {showNavMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-2 w-72 bg-white/95 dark:bg-[#252528]/95 backdrop-blur-2xl border border-black/10 dark:border-white/15 rounded-2xl shadow-[0_16px_36px_rgba(0,0,0,0.25)] z-50 p-2 text-xs animate-in fade-in zoom-in-95"
              >
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 border-b border-black/5 dark:border-white/5 mb-1">
                  Navigasi Modul
                </div>

                {/* Section 1: Task Management */}
                <div className="mb-2">
                  <div className="px-3 py-1 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-apple-blue" />
                    Task Management
                  </div>
                  <div className="mt-0.5 space-y-0.5 pl-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveView('table');
                        setShowNavMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl font-medium transition cursor-pointer ${
                        activeView === 'table' ? 'bg-apple-blue text-white' : 'hover:bg-black/5 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <TableIcon className="w-3.5 h-3.5" />
                        <span>Task list</span>
                      </div>
                      {activeView === 'table' && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveView('priority');
                        setShowNavMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl font-medium transition cursor-pointer ${
                        activeView === 'priority' ? 'bg-apple-blue text-white' : 'hover:bg-black/5 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Kanban className="w-3.5 h-3.5" />
                        <span>Kanban Views</span>
                      </div>
                      {['priority', 'leader', 'progress', 'due_date'].includes(activeView) && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Section 2: Reporting > Operasional > Weekly Planning */}
                <div className="pt-2 border-t border-black/5 dark:border-white/5">
                  <div className="px-3 py-1 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    Reporting
                  </div>
                  
                  <div className="mt-1 pl-3">
                    <div className="text-[10px] uppercase font-semibold text-neutral-400 dark:text-neutral-500 px-2 py-0.5">
                      ↳ Operasional
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveView('weekly_planning');
                        setShowNavMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 mt-0.5 rounded-xl font-medium transition cursor-pointer ${
                        activeView === 'weekly_planning'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'hover:bg-purple-50 dark:hover:bg-purple-950/30 text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-purple-500 group-hover:text-purple-600" />
                        <span className="font-semibold">Weekly Planning</span>
                      </div>
                      {activeView === 'weekly_planning' ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold">NEW</span>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-400 dark:text-neutral-500">
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">{totalRecords} records</span>
          </div>
        </div>

        {/* Action Shortcuts with Apple button style & Theme Switcher */}
        <div className="flex items-center gap-1.5">
          {/* Notification Center Popover & Browser Permission Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowNotifDrawer(prev => !prev);
              }}
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                showNotifDrawer
                  ? 'bg-amber-500 text-white shadow-xs'
                  : unreadCount > 0
                  ? 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
              }`}
              title="Buka Pusat Notifikasi (Reminder & Due Date Hari Ini)"
            >
              <Bell className={`w-3.5 h-3.5 ${unreadCount > 0 ? 'text-amber-600 dark:text-amber-400 fill-amber-500/20' : ''}`} />
              <span className="hidden sm:inline font-semibold">Notifikasi</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-white shadow-2xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Center Drawer */}
            <NotificationDrawer
              isOpen={showNotifDrawer}
              onClose={() => setShowNotifDrawer(false)}
              records={allRecords}
              dismissedIds={dismissedNotifIds}
              onDismissNotification={onDismissNotification}
              onDismissAllNotifications={onDismissAllNotifications}
              onSelectRecord={onSelectRecord}
            />
          </div>

          {/* Activity Log Popover & Drawer */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowLogDrawer(prev => !prev);
              }}
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                showLogDrawer
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
              }`}
              title="Buka Log Aktivitas (Riwayat Add, Edit, Change, Delete Task & Sub-task)"
            >
              <History className={`w-3.5 h-3.5 ${showLogDrawer ? 'text-white' : 'text-blue-600 dark:text-sky-400'}`} />
              <span className="hidden sm:inline font-semibold">Log</span>
            </button>

            {/* Activity Log Drawer */}
            <ActivityLogDrawer
              isOpen={showLogDrawer}
              onClose={() => setShowLogDrawer(false)}
              logs={activityLogs}
              onUpdateLogs={onUpdateActivityLogs}
              records={allRecords}
              onSelectRecordById={(targetId) => {
                const rec = allRecords.find(r => r.id === targetId);
                if (rec && onSelectRecord) {
                  onSelectRecord(rec);
                  setShowLogDrawer(false);
                }
              }}
            />
          </div>

          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-medium transition cursor-pointer"
              title={isDarkMode ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>
          )}

          {onRestoreData && (
            <button
              onClick={onRestoreData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 active:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-semibold transition cursor-pointer border border-emerald-500/20"
              title="Database Supabase & Pusat Cadangan Data"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Database & Cloud</span>
            </button>
          )}

          {/* Export Button with Direct Action & Dropdown */}
          <div className="relative inline-flex items-center">
            <button
              onClick={() => onExportData && onExportData('excel_weekly')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg bg-neutral-100 hover:bg-neutral-200/80 active:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-medium transition cursor-pointer"
              title="Export Excel Weekly Planning (.xlsx - Format Persis Tampilan Layar)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-1.5 py-1.5 rounded-r-lg bg-neutral-100 hover:bg-neutral-200/80 active:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 border-l border-neutral-200 dark:border-neutral-700 transition cursor-pointer"
              title="Pilihan Opsi Export"
            >
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Export Dropdown Menu */}
            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-[#202022] border border-neutral-200 dark:border-white/10 rounded-xl shadow-xl z-50 p-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    Opsi Unduh & Ekspor
                  </div>
                  
                  {/* Option 1: Excel Weekly Planning (Default / Focus) */}
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportData && onExportData('excel_weekly');
                    }}
                    className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-neutral-800 dark:text-neutral-100 text-left transition cursor-pointer group"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center gap-1.5">
                        <span>Weekly Planning (.xlsx)</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold">Rekomendasi</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 dark:text-neutral-500">
                        Format rapi persis tampilan layar (Grup Leader, Indentasi, & Kolom)
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Raw JSON Backup */}
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportData && onExportData('json');
                    }}
                    className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-800 dark:text-neutral-100 text-left transition cursor-pointer mt-1"
                  >
                    <Download className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-neutral-900 dark:text-white">
                        Backup Mentah (.json)
                      </div>
                      <div className="text-[11px] text-neutral-400 dark:text-neutral-500">
                        File JSON lengkap untuk restore offline / backup sistem
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Integrated Controls & Views Bar (Clean macOS Unified Toolbar) */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs bg-black/[0.02] dark:bg-white/[0.02]">
        
        {/* Left: Add Record (outside overflow) + View Switcher (inside overflow-x-auto) */}
        <div className="flex items-center gap-2.5 min-w-0 max-w-full">
          
          {/* Primary + Add Record Button with Category Dropdown (Apple System Blue Pill) */}
          <div className="relative inline-flex rounded-xl shadow-[0_2px_8px_rgba(0,113,227,0.3)] shrink-0 z-40">
            <button
              type="button"
              onClick={() => onAddRecord && onAddRecord()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-l-xl bg-apple-blue hover:bg-apple-blueHover active:scale-[0.98] text-white font-medium transition cursor-pointer"
              title="Tambah Record Baru"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Record</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAddRecordMenu(prev => !prev);
              }}
              className="px-2 py-1.5 rounded-r-xl bg-apple-blue hover:bg-apple-blueHover active:scale-[0.98] text-white border-l border-white/20 transition cursor-pointer"
              title="Pilih Category untuk Add Record"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu: List of Categories (Apple macOS Context Menu) */}
            {showAddRecordMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-2 w-64 bg-white/95 dark:bg-[#252528]/95 backdrop-blur-2xl border border-black/10 dark:border-white/15 rounded-2xl shadow-[0_16px_36px_rgba(0,0,0,0.25)] z-50 p-1.5 text-xs animate-in fade-in zoom-in-95"
              >
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 border-b border-black/5 dark:border-white/5 mb-1 flex items-center justify-between">
                  <span>Add Record ke Category</span>
                  <span className="font-mono text-[9px]">{categories.length} kategori</span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        onAddRecord && onAddRecord(cat);
                        setShowAddRecordMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-neutral-800 dark:text-neutral-200 hover:bg-apple-blue hover:text-white transition-all font-medium cursor-pointer group"
                    >
                      <span className="w-2 h-2 rounded-full bg-apple-blue group-hover:bg-white transition-colors shrink-0" />
                      <span className="truncate">{cat}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-1 mt-1 border-t border-black/5 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      onAddRecord && onAddRecord();
                      setShowAddRecordMenu(false);
                    }}
                    className="w-full flex items-center gap-1.5 px-3 py-2 rounded-xl text-left text-apple-blue dark:text-sky-400 hover:bg-apple-blue/10 dark:hover:bg-apple-blue/20 text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Record Tanpa Preset</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* View Switcher (Sleek Apple Segmented Pill) inside horizontal scroll area */}
          <div className="overflow-x-auto no-scrollbar">
            <div className="inline-flex p-1 bg-neutral-200/80 dark:bg-white/10 rounded-xl gap-1 shadow-inner shrink-0">
              {views.map((v) => {
                const Icon = v.icon;
                const isActive = activeView === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setActiveView(v.id)}
                    className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all duration-150 whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-[#252528] text-neutral-900 dark:text-white font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.06)] ring-1 ring-black/5 dark:ring-white/15'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5 font-medium'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-apple-blue dark:text-sky-400' : 'text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300'}`} />
                    <span>{v.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Search Box */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-7 py-1.5 bg-neutral-200/60 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15 border border-black/5 dark:border-white/10 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:bg-white dark:focus:bg-[#252528] focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/30 w-36 sm:w-52 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition cursor-pointer"
                title="Reset pencarian"
                aria-label="Reset search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Row 3: Dedicated Filter Deck (Crisp, High Contrast, Distinct macOS Buttons) */}
      {hasFilterToolbar && (
        <div className="px-4 py-2 flex flex-wrap items-center gap-2 text-xs border-t border-neutral-200/50 dark:border-white/5 bg-white/40 dark:bg-[#141416]/60 backdrop-blur-md">
          <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mr-1">
            Filters:
          </span>

          {/* Filter 1: Priority */}
          <select
            value={kanbanPriorityFilter || 'ALL'}
            onChange={(e) => setKanbanPriorityFilter && setKanbanPriorityFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-apple-blue/30 transition shadow-xs ${
              kanbanPriorityFilter && kanbanPriorityFilter !== 'ALL'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-900 dark:text-amber-200 font-bold ring-1 ring-amber-500/30'
                : 'bg-white dark:bg-[#252528] border-neutral-300 dark:border-white/10 text-neutral-800 dark:text-neutral-200 hover:border-neutral-400 dark:hover:border-white/20'
            }`}
            title="Filter Priority"
          >
            <option value="ALL" className="bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white">Priority: All</option>
            {Object.keys(PRIORITIES).map(p => (
              <option key={p} value={p} className="bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white">Priority {p}</option>
            ))}
          </select>

          {/* Filter 2: Project */}
          <select
            value={kanbanProjectFilter || 'ALL'}
            onChange={(e) => setKanbanProjectFilter && setKanbanProjectFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-apple-blue/30 transition max-w-[150px] sm:max-w-[180px] truncate shadow-xs ${
              kanbanProjectFilter && kanbanProjectFilter !== 'ALL'
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-900 dark:text-purple-200 font-bold ring-1 ring-purple-500/30'
                : 'bg-white dark:bg-[#252528] border-neutral-300 dark:border-white/10 text-neutral-800 dark:text-neutral-200 hover:border-neutral-400 dark:hover:border-white/20'
            }`}
            title="Filter Project"
          >
            <option value="ALL" className="bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white">Project: All</option>
            {[...(projects || [])]
              .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
              .map(p => (
                <option key={p.name} value={p.name} className="bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white">{p.name}</option>
              ))}
          </select>

          {/* Filter 3: Status (Default: ACTIVE) */}
          <select
            value={kanbanStatusFilter || 'ACTIVE'}
            onChange={(e) => setKanbanStatusFilter && setKanbanStatusFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-apple-blue/30 transition max-w-[150px] sm:max-w-[170px] truncate shadow-xs ${
              kanbanStatusFilter === 'ACTIVE'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-900 dark:text-emerald-300 font-bold ring-1 ring-emerald-500/30'
                : kanbanStatusFilter && kanbanStatusFilter !== 'ALL'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-900 dark:text-emerald-300 font-bold ring-1 ring-emerald-500/30'
                : 'bg-white dark:bg-[#252528] border-neutral-300 dark:border-white/10 text-neutral-800 dark:text-neutral-200 hover:border-neutral-400 dark:hover:border-white/20'
            }`}
            title="Filter Status (Pilih ACTIVE untuk menyembunyikan Done, Cancel, Pending, Archived)"
          >
            <option value="ACTIVE" className="bg-white dark:bg-[#1c1c1e] text-emerald-600 dark:text-emerald-400 font-bold">⚡ Active Tasks</option>
            <option value="ALL" className="bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white">All Status</option>
            {Object.entries(STATUSES).map(([sKey, sCfg]) => (
              <option key={sKey} value={sKey} className="bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white">
                {sCfg.label || sKey}
              </option>
            ))}
          </select>

          {/* Filter 4: Task Leader */}
          <select
            value={kanbanLeaderFilter || 'ALL'}
            onChange={(e) => setKanbanLeaderFilter && setKanbanLeaderFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-apple-blue/30 transition max-w-[140px] sm:max-w-[170px] truncate shadow-xs ${
              kanbanLeaderFilter && kanbanLeaderFilter !== 'ALL'
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-900 dark:text-indigo-200 font-bold ring-1 ring-indigo-500/30'
                : 'bg-white dark:bg-[#252528] border-neutral-300 dark:border-white/10 text-neutral-800 dark:text-neutral-200 hover:border-neutral-400 dark:hover:border-white/20'
            }`}
            title="Filter Task Leader"
          >
            <option value="ALL" className="bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white">Leader: All</option>
            {(leaders || []).map(l => (
              <option key={l.name} value={l.name} className="bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white">{l.name}</option>
            ))}
          </select>

          {/* Filter 5: Due Date */}
          <select
            value={kanbanDueDateFilter || 'ALL'}
            onChange={(e) => setKanbanDueDateFilter && setKanbanDueDateFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-apple-blue/30 transition max-w-[150px] sm:max-w-[180px] truncate shadow-xs ${
              kanbanDueDateFilter && kanbanDueDateFilter !== 'ALL'
                ? 'bg-apple-blue/20 border-apple-blue/50 text-apple-blue dark:text-sky-300 font-bold ring-1 ring-apple-blue/30'
                : 'bg-white dark:bg-[#252528] border-neutral-300 dark:border-white/10 text-neutral-800 dark:text-neutral-200 hover:border-neutral-400 dark:hover:border-white/20'
            }`}
            title="Filter Jatuh Tempo (Overdue, Today, This Week, Future)"
          >
            <option value="ALL" className="bg-white dark:bg-[#1c1c1e] text-neutral-900 dark:text-white">Due Date: All</option>
            <option value="OVERDUE" className="bg-white dark:bg-[#1c1c1e] text-rose-600 dark:text-rose-400 font-bold">⚠️ Overdue</option>
            <option value="TODAY" className="bg-white dark:bg-[#1c1c1e] text-amber-600 dark:text-amber-400 font-bold">🔔 Due Today</option>
            <option value="THIS_WEEK" className="bg-white dark:bg-[#1c1c1e] text-blue-600 dark:text-blue-400 font-semibold">📅 Due This Week</option>
            <option value="NEXT_WEEK" className="bg-white dark:bg-[#1c1c1e] text-indigo-600 dark:text-indigo-400 font-semibold">📆 Due Next Week</option>
            <option value="FUTURE" className="bg-white dark:bg-[#1c1c1e] text-neutral-700 dark:text-neutral-300 font-semibold">🔮 Future</option>
          </select>

          {/* Reset Filters button */}
          <button
            onClick={onResetKanbanFilters}
            disabled={activeKanbanFiltersCount === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer active:scale-95 shadow-xs ${
              activeKanbanFiltersCount > 0
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 hover:bg-rose-500/25 border-rose-500/30 font-bold'
                : 'bg-white/60 dark:bg-[#252528]/60 text-neutral-400 dark:text-neutral-500 border-neutral-200 dark:border-white/5 cursor-not-allowed opacity-60'
            }`}
            title={activeKanbanFiltersCount > 0 ? "Reset semua filter & pencarian" : "Tidak ada filter atau pencarian yang aktif"}
          >
            <RotateCcw className={`w-3 h-3 ${activeKanbanFiltersCount > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-neutral-400 dark:text-neutral-500'}`} />
            <span>Reset Filter{activeKanbanFiltersCount > 0 ? ` (${activeKanbanFiltersCount})` : ''}</span>
          </button>
        </div>
      )}

    </header>
  );
}
