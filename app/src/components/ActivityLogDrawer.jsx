import React, { useState, useMemo } from 'react';
import {
  History,
  X,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Upload,
  Download,
  Trash2,
  User,
  Clock,
  ChevronRight,
  Sparkles,
  Layers,
  FileText,
  Calendar
} from 'lucide-react';
import {
  formatLogTimestamp,
  getActiveUserName,
  setActiveUserName,
  fetchLogsFromSupabase,
  syncLogsToSupabase,
  saveLocalLogs
} from '../lib/activityLogger';
import { isSupabaseConfigured } from '../lib/supabase';

/**
 * ActivityLogDrawer
 * Displays audit log history:
 * - Date and Time
 * - Task Name
 * - Change (ADD, EDIT, CHANGE, DELETE)
 * - Description
 * - User
 * Syncable to Supabase with real-time feedback
 */
export function ActivityLogDrawer({
  isOpen,
  onClose,
  logs = [],
  onUpdateLogs,
  onSelectRecordById,
  records = []
}) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'ADD' | 'EDIT' | 'CHANGE' | 'DELETE'
  const [filterDate, setFilterDate] = useState(''); // 'YYYY-MM-DD' or '' for all dates
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null); // { type: 'success'|'error', message: string }
  const [editingUser, setEditingUser] = useState(false);
  const [currentUserName, setCurrentUserName] = useState(() => getActiveUserName());

  const handleSaveUserName = (e) => {
    e.preventDefault();
    if (currentUserName.trim()) {
      setActiveUserName(currentUserName.trim());
      setEditingUser(false);
    }
  };

  // Sync to Supabase
  const handleSyncToSupabase = async () => {
    if (!isSupabaseConfigured()) {
      setSyncStatus({
        type: 'error',
        message: 'Supabase anon key belum disetel. Hubungkan di menu Database & Cloud.'
      });
      return;
    }
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const ok = await syncLogsToSupabase(logs);
      if (ok) {
        setSyncStatus({
          type: 'success',
          message: `Berhasil menyinkronkan ${logs.length} catatan log ke Supabase!`
        });
      } else {
        setSyncStatus({
          type: 'error',
          message: 'Gagal menyinkronkan log. Pastikan tabel "activity_logs" sudah dibuat di Supabase.'
        });
      }
    } catch (e) {
      setSyncStatus({
        type: 'error',
        message: e.message || 'Terjadi kesalahan saat sync ke Supabase.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull latest from Supabase
  const handlePullFromSupabase = async () => {
    if (!isSupabaseConfigured()) {
      setSyncStatus({
        type: 'error',
        message: 'Supabase belum dikonfigurasi.'
      });
      return;
    }
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const cloudLogs = await fetchLogsFromSupabase(300);
      if (cloudLogs) {
        // Merge with local logs by ID
        const map = new Map();
        cloudLogs.forEach(l => map.set(l.id, l));
        logs.forEach(l => {
          if (!map.has(l.id)) map.set(l.id, l);
        });
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        onUpdateLogs(merged);
        saveLocalLogs(merged);
        setSyncStatus({
          type: 'success',
          message: `Berhasil memuat ${cloudLogs.length} log terbaru dari Supabase!`
        });
      } else {
        setSyncStatus({
          type: 'error',
          message: 'Gagal mengambil log dari Supabase. Periksa tabel "activity_logs".'
        });
      }
    } catch (e) {
      setSyncStatus({
        type: 'error',
        message: e.message || 'Gagal memuat log dari Supabase'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Clear local logs
  const handleClearLogs = () => {
    if (window.confirm('Hapus semua riwayat log aktivitas lokal?')) {
      onUpdateLogs([]);
      saveLocalLogs([]);
    }
  };

  // Export logs as CSV
  const handleExportCSV = () => {
    if (!logs || logs.length === 0) return;
    const header = ['ID', 'Date & Time', 'Task Name', 'Change', 'Description', 'User', 'Type'];
    const rows = logs.map(l => [
      `"${l.id}"`,
      `"${formatLogTimestamp(l.timestamp)}"`,
      `"${(l.taskName || '').replace(/"/g, '""')}"`,
      `"${l.changeType}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
      `"${(l.userName || '').replace(/"/g, '""')}"`,
      `"${l.isSubtask ? 'Sub-task' : 'Task'}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `activity_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(item => {
      // 1. Change type filter
      if (filterType !== 'ALL' && item.changeType !== filterType) {
        return false;
      }
      // 2. Date filter (item.timestamp ISO YYYY-MM-DD)
      if (filterDate) {
        const itemDate = (item.timestamp || '').slice(0, 10);
        if (itemDate !== filterDate) return false;
      }
      // 3. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTask = (item.taskName || '').toLowerCase().includes(q);
        const matchDesc = (item.description || '').toLowerCase().includes(q);
        const matchUser = (item.userName || '').toLowerCase().includes(q);
        return matchTask || matchDesc || matchUser;
      }
      return true;
    });
  }, [logs, filterType, filterDate, search]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-full mt-2 w-[92vw] sm:w-[580px] max-h-[85vh] bg-white/95 dark:bg-[#1E1E20]/95 backdrop-blur-2xl border border-neutral-200/90 dark:border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-neutral-800 dark:text-neutral-100 font-sans"
    >
      {/* Header (Clean title without count badge) */}
      <div className="px-4 py-3 border-b border-neutral-200/60 dark:border-white/10 flex items-center justify-between bg-neutral-50/50 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center">
            <History className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold tracking-tight">Activity Audit Log</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Active User Indicator */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-100 dark:bg-white/5 text-[11px] text-neutral-600 dark:text-neutral-300">
            <User className="w-3 h-3 text-neutral-400" />
            {editingUser ? (
              <form onSubmit={handleSaveUserName} className="flex items-center gap-1">
                <input
                  type="text"
                  value={currentUserName}
                  onChange={(e) => setCurrentUserName(e.target.value)}
                  className="w-24 px-1 py-0.2 rounded bg-white dark:bg-neutral-800 text-[11px] border border-blue-500 font-semibold focus:outline-none"
                  autoFocus
                />
                <button type="submit" className="text-[10px] text-blue-600 font-bold hover:underline">
                  OK
                </button>
              </form>
            ) : (
              <span
                onClick={() => setEditingUser(true)}
                className="font-semibold text-neutral-700 dark:text-neutral-200 hover:text-apple-blue cursor-pointer truncate max-w-[120px]"
                title="Klik untuk ubah nama User yang sedang aktif mencatat aksi"
              >
                {currentUserName}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Toolbar: Sync actions, Search, Filter */}
      <div className="p-3 border-b border-neutral-200/60 dark:border-white/10 bg-neutral-100/60 dark:bg-white/[0.02] space-y-2">
        {/* Supabase Actions Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleSyncToSupabase}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
              title="Kirim semua log lokal ke Supabase Cloud (tabel activity_logs)"
            >
              <Upload className={`w-3 h-3 ${isSyncing ? 'animate-bounce' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync ke Supabase'}</span>
            </button>
            <button
              type="button"
              disabled={isSyncing}
              onClick={handlePullFromSupabase}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-neutral-200/70 dark:bg-neutral-800 hover:bg-neutral-300/80 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50"
              title="Tarik log terbaru dari Supabase Cloud"
            >
              <Download className="w-3 h-3" />
              <span>Tarik dari Cloud</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-neutral-200/70 dark:bg-neutral-800 hover:bg-neutral-300/80 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[11px] font-medium transition cursor-pointer"
              title="Export Log ke CSV (.csv)"
            >
              <FileText className="w-3 h-3 text-emerald-500" />
              <span>CSV</span>
            </button>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleClearLogs}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-rose-500/15 text-neutral-400 hover:text-rose-500 text-[11px] transition cursor-pointer"
                title="Hapus semua log riwayat"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Sync Status Banner */}
        {syncStatus && (
          <div
            className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
              syncStatus.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300'
            }`}
          >
            {syncStatus.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
            )}
            <span className="flex-1">{syncStatus.message}</span>
            <button
              type="button"
              onClick={() => setSyncStatus(null)}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Search & Filter Pills */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Cari task, perubahan, atau user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {['ALL', 'ADD', 'EDIT', 'CHANGE', 'DELETE'].map(type => {
              const active = filterType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilterType(type)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider transition cursor-pointer ${
                    active
                      ? type === 'ADD'
                        ? 'bg-emerald-600 text-white'
                        : type === 'EDIT'
                        ? 'bg-apple-blue text-white'
                        : type === 'CHANGE'
                        ? 'bg-amber-600 text-white'
                        : type === 'DELETE'
                        ? 'bg-rose-600 text-white'
                        : 'bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900'
                      : 'bg-neutral-200/70 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300/80 dark:hover:bg-white/10'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-200/50 dark:border-white/5 text-[11px]">
          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
            <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="font-semibold text-[10.5px]">Filter Tanggal:</span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 font-mono text-[11px] text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            />
            {filterDate && (
              <button
                type="button"
                onClick={() => setFilterDate('')}
                className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-[10px] hover:bg-neutral-300 dark:hover:bg-neutral-600 transition cursor-pointer"
                title="Reset filter tanggal"
              >
                Reset
              </button>
            )}
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                setFilterDate(todayStr);
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                filterDate === new Date().toISOString().slice(0, 10)
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-200/70 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-white/10'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                const yestStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                setFilterDate(yestStr);
              }}
              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-200/70 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-white/10 transition cursor-pointer"
            >
              Kemarin
            </button>
            <button
              type="button"
              onClick={() => setFilterDate('')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                !filterDate
                  ? 'bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900'
                  : 'bg-neutral-200/70 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300 dark:hover:bg-white/10'
              }`}
            >
              Semua
            </button>
          </div>
        </div>
      </div>

      {/* Log Entries List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-neutral-100 dark:divide-white/5">
        {filteredLogs.length === 0 ? (
          <div className="py-14 px-4 text-center">
            <History className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
            <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Belum Ada Log Aktivitas
            </p>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 max-w-[260px] mx-auto">
              Setiap penambahan (ADD), pengeditan (EDIT), perubahan status/detail (CHANGE), dan penghapusan (DELETE) pada task maupun sub-task akan dicatat secara otomatis di sini.
            </p>
          </div>
        ) : (
          filteredLogs.map(log => {
            const badgeColor =
              log.changeType === 'ADD'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                : log.changeType === 'EDIT'
                ? 'bg-blue-500/15 text-blue-700 dark:text-sky-400 border-blue-500/30'
                : log.changeType === 'DELETE'
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';

            return (
              <div
                key={log.id}
                onClick={() => {
                  if (log.taskId && onSelectRecordById) {
                    onSelectRecordById(log.taskId);
                  }
                }}
                className="pt-1.5 first:pt-0 group relative p-2.5 rounded-xl hover:bg-neutral-100/70 dark:hover:bg-white/5 transition cursor-pointer border border-transparent hover:border-neutral-200 dark:hover:border-white/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Action Badge */}
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold font-mono uppercase tracking-wider border ${badgeColor}`}
                    >
                      {log.changeType}
                    </span>

                    {/* Subtask pill if applicable */}
                    {log.isSubtask && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-mono">
                        SUB-TASK
                      </span>
                    )}

                    {/* Date & Time */}
                    <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatLogTimestamp(log.timestamp)}
                    </span>
                  </div>

                  {/* User who performed the action */}
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 shrink-0">
                    <User className="w-2.5 h-2.5 text-neutral-400" />
                    <span>{log.userName || 'Pierre Marchel'}</span>
                  </div>
                </div>

                {/* Task Name */}
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 mt-1.5 group-hover:text-blue-600 dark:group-hover:text-sky-400 transition truncate">
                  {log.taskName || 'Untitled Task'}
                </h4>

                {/* Description of what changed */}
                {log.description && (
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-300 mt-0.5 leading-relaxed break-words bg-neutral-50 dark:bg-white/[0.03] p-1.5 rounded-lg border border-neutral-200/50 dark:border-white/5 font-sans">
                    {log.description}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-neutral-200/60 dark:border-white/10 bg-neutral-50/50 dark:bg-white/5 flex items-center justify-between text-[11px] text-neutral-400">
        <span>Menampilkan {filteredLogs.length} dari {logs.length} log</span>
        <span className="font-mono text-[10px]">Life OS Audit v2.0</span>
      </div>
    </div>
  );
}
