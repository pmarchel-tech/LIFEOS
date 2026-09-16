import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  RotateCcw,
  Download,
  Upload,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Info,
  Check,
  Sparkles,
  Cloud,
  Key,
  RefreshCw,
  Copy,
  ExternalLink
} from 'lucide-react';
import { EXPORTED_WEEKLY_RECORDS } from '../data/initialData';
import {
  testSupabaseConnection,
  syncTasksToSupabase,
  fetchTasksFromSupabase,
  isSupabaseConfigured
} from '../lib/supabase';

// RFC-compliant CSV parser that handles quotes and newlines
function parseWeeklyPlanningCSV(text) {
  const rows = [];
  let row = [];
  let inQuotes = false;
  let curVal = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        curVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(curVal);
      curVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(curVal);
      curVal = '';
      if (row.length > 0) {
        rows.push(row);
      }
      row = [];
    } else {
      curVal += char;
    }
  }
  if (curVal.length > 0 || row.length > 0) {
    row.push(curVal);
    rows.push(row);
  }

  if (rows.length < 2) return null;

  const monthMap = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  const parseDateCell = (val) => {
    if (!val || val === '-') return '2026-09-14';
    const clean = val.trim();
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts.length === 2) {
        const monStr = parts[0].toLowerCase();
        const dayStr = parts[1].padStart(2, '0');
        const monthNum = monthMap[monStr] || '09';
        return `2026-${monthNum}-${dayStr}`;
      }
      if (parts.length === 3) return clean;
    }
    return '2026-09-14';
  };

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const leaderIdx = headers.findIndex(h => h.includes('leader'));
  const catIdx = headers.findIndex(h => h.includes('category'));
  const taskIdx = headers.findIndex(h => h === 'task');
  const dueIdx = headers.findIndex(h => h.includes('due'));
  const prioIdx = headers.findIndex(h => h.includes('priority'));
  const projIdx = headers.findIndex(h => h.includes('project'));
  const statusIdx = headers.findIndex(h => h.includes('status'));
  const updateIdx = headers.findIndex(h => h.includes('update') || h.includes('note'));

  if (taskIdx === -1) return null;

  const records = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 2) continue;

    const rawLeader = (leaderIdx !== -1 ? row[leaderIdx] : '').trim();
    const rawCat = (catIdx !== -1 ? row[catIdx] : '').trim().toUpperCase();
    let rawTask = (row[taskIdx] || '').trim();
    const rawDue = (dueIdx !== -1 ? row[dueIdx] : '').trim();
    const rawPrio = (prioIdx !== -1 ? row[prioIdx] : '').trim();
    const rawProj = (projIdx !== -1 ? row[projIdx] : '').trim();
    const rawStatus = (statusIdx !== -1 ? row[statusIdx] : '').trim();
    const rawUpdate = (updateIdx !== -1 ? row[updateIdx] : '').trim();

    if (!rawTask) continue;

    let cleanTask = rawTask;
    if (cleanTask.toLowerCase().startsWith('[overdue] - ')) {
      cleanTask = cleanTask.slice(12).trim();
    }

    const dueDate = parseDateCell(rawDue);
    const updates = [];
    let notes = '';

    if (rawUpdate) {
      notes = rawUpdate;
      const match = rawUpdate.match(/^\[([0-9]{4}-[0-9]{2}-[0-9]{2}|-)\]\s*-\s*([\s\S]*)$/);
      if (match) {
        const uDate = match[1] === '-' ? dueDate : match[1];
        const uText = match[2].trim();
        updates.push({
          id: `upd-csv-${r}-1`,
          date: uDate,
          text: uText,
          createdAt: new Date().toISOString()
        });
        notes = uText;
      } else {
        updates.push({
          id: `upd-csv-${r}-1`,
          date: dueDate,
          text: rawUpdate,
          createdAt: new Date().toISOString()
        });
      }
    }

    let canonStatus = 'Ongoing';
    const sUpper = rawStatus.toUpperCase();
    if (sUpper === 'IN REVIEW') canonStatus = 'In Review';
    else if (sUpper === 'FOLLOW UP') canonStatus = 'Follow Up';
    else if (sUpper === 'NOT YET STARTED' || sUpper === 'NOT STARTED') canonStatus = 'Not yet started';
    else if (sUpper === 'ONGOING' || sUpper === 'ON GOING') canonStatus = 'Ongoing';
    else if (sUpper === 'DONE') canonStatus = 'Done';
    else if (sUpper === 'PENDING') canonStatus = 'Pending';
    else if (sUpper === 'CANCEL') canonStatus = 'Cancel';
    else if (sUpper === 'ARCHIVED' || sUpper === 'ARCHIVE') canonStatus = 'Archived';

    records.push({
      id: `rec-imp-${r}-${Date.now().toString(36)}`,
      task: cleanTask,
      priority: rawPrio || 'P1',
      project: rawProj || 'BETTER FUTURE',
      status: canonStatus,
      taskLeader: rawLeader || 'Pierre Marchel',
      businessLine: rawCat || 'BETTER FUTURE',
      element: rawCat === 'MARKETING' ? 'E3' : 'E2',
      startTime: dueDate,
      dueDate: dueDate,
      dueTime: '09:00',
      reminder: 'NONE',
      notes: notes,
      updates: updates
    });
  }

  return records;
}

export const SUPABASE_SETUP_SQL = `-- 1. Buat tabel tasks
create table if not exists public.tasks (
  id text primary key,
  task text not null,
  priority text default 'P1',
  project text,
  status text default 'Not yet started',
  task_leader text,
  business_line text,
  element text default 'E2',
  start_time text,
  due_date text,
  due_time text default '09:00',
  reminder text default 'NONE',
  reminder_time text,
  notes text,
  updates jsonb default '[]'::jsonb,
  parent_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Buat tabel activity_logs (Audit Log aktivitas Task & Sub-task)
create table if not exists public.activity_logs (
  id text primary key,
  timestamp timestamp with time zone default timezone('utc'::text, now()),
  task_name text not null,
  task_id text,
  change_type text not null, -- 'ADD', 'EDIT', 'CHANGE', 'DELETE'
  description text,
  user_name text default 'Pierre Marchel',
  is_subtask boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Aktifkan Row Level Security (RLS)
alter table public.tasks enable row level security;
alter table public.activity_logs enable row level security;

-- 4. Berikan akses baca & tulis untuk anon / authenticated
create policy "Allow all operations for tasks"
  on public.tasks
  for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "Allow all operations for activity_logs"
  on public.activity_logs
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- 5. Aktifkan Realtime otomatis (Opsional)
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.activity_logs;`;

export function BackupRestoreModal({
  isOpen,
  onClose,
  currentRecords = [],
  onRestoreRecords,
  onExportRecords,
  onLoadTemplate
}) {
  const [snapshots, setSnapshots] = useState([]);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);

  // Supabase state
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(() => {
    return import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('life_os_supabase_anon_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5b2VsbmhzcWp4aWRneWVhZmthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MjU2MDIsImV4cCI6MjEwNTEwMTYwMn0.9fM5Tc6oyz-6-TOgpddMNBMeb7UDuGw7y-DJAbtpp4Y';
  });
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Scan localStorage for all potential task backups
  const refreshSnapshots = () => {
    const candidateKeys = [
      'lark_task_records_clean_v1',
      'lark_backup_latest',
      'lark_task_records_v1',
      'lark_task_records',
      'lark_records_v1',
      'harada_lark_records_v1',
      'harada_life_os_tasks',
      'harada_tasks',
      'harada_records'
    ];

    const detected = [];
    const seenKeys = new Set();

    // 1. Check known candidate keys
    for (const key of candidateKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          seenKeys.add(key);
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.task !== undefined) {
            detected.push({
              key,
              count: parsed.length,
              sampleTasks: parsed.slice(0, 4).map(t => t.task || 'Untitled'),
              records: parsed,
              isCurrent: JSON.stringify(parsed) === JSON.stringify(currentRecords)
            });
          }
        }
      } catch (e) {
        // ignore parse error
      }
    }

    // 2. Scan any other localStorage key
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!seenKeys.has(k)) {
        try {
          const raw = localStorage.getItem(k);
          if (raw && (raw.startsWith('[') || raw.includes('"task"'))) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.task !== undefined) {
              detected.push({
                key: k,
                count: parsed.length,
                sampleTasks: parsed.slice(0, 4).map(t => t.task || 'Untitled'),
                records: parsed,
                isCurrent: JSON.stringify(parsed) === JSON.stringify(currentRecords)
              });
            }
          }
        } catch (e) {}
      }
    }

    // Sort: current on top, then by record count desc
    detected.sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      return b.count - a.count;
    });

    setSnapshots(detected);
  };

  useEffect(() => {
    if (isOpen) {
      refreshSnapshots();
      setImportError(null);
      setImportSuccess(null);
      // Check initial connection if key exists
      const savedKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('life_os_supabase_anon_key');
      if (savedKey) {
        testSupabaseConnection(savedKey).then(res => setIsSupabaseConnected(res.success));
      }
    }
  }, [isOpen, currentRecords]);

  if (!isOpen) return null;

  const handleRestoreSnapshot = (snap) => {
    if (snap.isCurrent) return;
    const confirmMsg = `Pulihkan cadangan dari "${snap.key}" dengan total ${snap.count} tugas?\n\nPerubahan yang belum tersimpan akan diganti dengan versi ini.`;
    if (window.confirm(confirmMsg)) {
      onRestoreRecords(snap.records);
      refreshSnapshots();
      setImportSuccess(`Berhasil memulihkan ${snap.count} tugas dari ${snap.key}!`);
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  const handleRestoreWeeklyCSVExport = () => {
    if (!EXPORTED_WEEKLY_RECORDS || EXPORTED_WEEKLY_RECORDS.length === 0) return;
    const confirmMsg = `Pulihkan data dari file ekspor CSV Weekly Planning (${EXPORTED_WEEKLY_RECORDS.length} tugas)?\n\nSeluruh 40 task sebelum restart beserta project, leader, dan catatan lengkapnya akan dimuat.`;
    if (window.confirm(confirmMsg)) {
      onRestoreRecords(EXPORTED_WEEKLY_RECORDS);
      refreshSnapshots();
      setImportSuccess(`Berhasil memulihkan ${EXPORTED_WEEKLY_RECORDS.length} tugas dari file ekspor CSV!`);
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  // Handle CSV or JSON file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const isCSV = file.name.toLowerCase().endsWith('.csv');

      if (isCSV) {
        try {
          const parsedCSV = parseWeeklyPlanningCSV(text);
          if (parsedCSV && parsedCSV.length > 0) {
            const confirmMsg = `File CSV "${file.name}" valid berisi ${parsedCSV.length} tugas.\n\nApakah Anda ingin memulihkan dan memuat ${parsedCSV.length} tugas ini sekarang?`;
            if (window.confirm(confirmMsg)) {
              onRestoreRecords(parsedCSV);
              refreshSnapshots();
              setImportSuccess(`Berhasil mengimpor ${parsedCSV.length} tugas dari CSV "${file.name}"!`);
              setTimeout(() => {
                onClose();
              }, 1200);
            }
          } else {
            setImportError('Gagal memproses file CSV: Kolom "Task" tidak ditemukan atau file kosong.');
          }
        } catch (err) {
          setImportError('Terjadi kesalahan saat memproses file CSV.');
        }
      } else {
        // Assume JSON
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.task !== undefined) {
            const confirmMsg = `File JSON "${file.name}" valid berisi ${parsed.length} tugas.\n\nApakah Anda ingin memulihkan dan memuat tugas ini sekarang?`;
            if (window.confirm(confirmMsg)) {
              onRestoreRecords(parsed);
              refreshSnapshots();
              setImportSuccess(`Berhasil mengimpor ${parsed.length} tugas dari file "${file.name}"!`);
              setTimeout(() => {
                onClose();
              }, 1200);
            }
          } else {
            setImportError('File JSON tidak valid atau format tugas tidak dikenali.');
          }
        } catch (err) {
          setImportError('Gagal membaca file JSON: format tidak valid.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Test & Save Supabase Key
  const handleSaveAndTestSupabase = async () => {
    const key = supabaseAnonKey.trim();
    if (!key) {
      setImportError('Harap masukkan anon key Supabase.');
      return;
    }
    setIsTestingSupabase(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      localStorage.setItem('life_os_supabase_anon_key', key);
      const res = await testSupabaseConnection(key);
      if (res.success) {
        setIsSupabaseConnected(true);
        setImportSuccess('Koneksi ke Supabase berhasil terhubung!');
      } else {
        setIsSupabaseConnected(false);
        setImportError(res.message || 'Koneksi gagal. Pastikan tabel "tasks" sudah dibuat di Supabase SQL Editor.');
      }
    } catch (err) {
      setIsSupabaseConnected(false);
      setImportError(err.message || 'Terjadi kesalahan saat menguji koneksi');
    } finally {
      setIsTestingSupabase(false);
    }
  };

  // Sync to Supabase
  const handleSyncToSupabase = async () => {
    setIsSyncingSupabase(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const ok = await syncTasksToSupabase(currentRecords);
      if (ok) {
        setImportSuccess(`Berhasil mengunggah ${currentRecords.length} task ke Cloud Supabase!`);
      } else {
        setImportError('Gagal mengunggah ke Supabase. Pastikan tabel "tasks" sudah dibuat via SQL editor dan RLS sudah diizinkan.');
      }
    } catch (e) {
      setImportError(e.message || 'Gagal sinkronisasi ke Supabase');
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  // Pull from Supabase
  const handlePullFromSupabase = async () => {
    setIsSyncingSupabase(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const remote = await fetchTasksFromSupabase();
      if (remote && remote.length > 0) {
        onRestoreRecords(remote);
        setImportSuccess(`Berhasil menarik ${remote.length} task dari Cloud Supabase!`);
      } else if (remote && remote.length === 0) {
        setImportError('Tabel tasks di Supabase masih kosong. Silakan klik "Unggah ke Cloud Supabase" untuk mengisi data.');
      } else {
        setImportError('Gagal menarik data dari Supabase. Periksa koneksi dan izin tabel tasks.');
      }
    } catch (e) {
      setImportError(e.message || 'Gagal menarik data dari Supabase');
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const isWeeklyCSVActive = currentRecords.length === EXPORTED_WEEKLY_RECORDS?.length &&
    currentRecords[0]?.task === EXPORTED_WEEKLY_RECORDS?.[0]?.task;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5 bg-neutral-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-apple-blue/10 dark:bg-apple-blue/20 flex items-center justify-center text-apple-blue">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                Pusat Cadangan & Database Cloud
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-apple-blue/10 text-apple-blue dark:bg-apple-blue/20 dark:text-apple-blue">
                  {currentRecords.length} task aktif
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Hubungkan ke Supabase Cloud, cadangan browser, atau file CSV / JSON
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {importError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{importError}</span>
          </div>
        )}
        {importSuccess && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{importSuccess}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Section 0: Cloud Supabase Integration (Live Database) */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    Supabase Cloud Database
                    {isSupabaseConnected ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500 text-white flex items-center gap-1 shadow-2xs">
                        <Check className="w-2.5 h-2.5" /> Terhubung
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400">
                        Belum Terhubung
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Project: <code className="font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-300">qyoelnhsqjxidgyeafka</code>
                  </p>
                </div>
              </div>
              <a
                href="https://supabase.com/dashboard/project/qyoelnhsqjxidgyeafka/settings/api"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Buka API Settings</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Anon Key Input Form */}
            <div className="space-y-2 pt-1">
              <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                Masukkan Project "anon / public" API Key:
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Key className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="password"
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-800 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <button
                  type="button"
                  disabled={isTestingSupabase}
                  onClick={handleSaveAndTestSupabase}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                  <span>{isTestingSupabase ? 'Menguji...' : 'Hubungkan'}</span>
                </button>
              </div>
            </div>

            {/* Cloud Sync Buttons */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                type="button"
                disabled={!isSupabaseConnected || isSyncingSupabase}
                onClick={handleSyncToSupabase}
                className="flex-1 min-w-[170px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah {currentRecords.length} Task ke Cloud</span>
              </button>
              <button
                type="button"
                disabled={!isSupabaseConnected || isSyncingSupabase}
                onClick={handlePullFromSupabase}
                className="flex-1 min-w-[170px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tarik Data dari Cloud</span>
              </button>
            </div>

            {/* Expandable SQL Schema Script Guide */}
            <div className="pt-2 border-t border-emerald-500/20">
              <button
                type="button"
                onClick={() => setShowSqlGuide(prev => !prev)}
                className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ChevronRight className={`w-3 h-3 transition-transform ${showSqlGuide ? 'rotate-90' : ''}`} />
                <span>Lihat SQL Query untuk Membuat Tabel 'tasks' & 'activity_logs' di Supabase</span>
              </button>
              {showSqlGuide && (
                <div className="mt-2 p-3 rounded-xl bg-neutral-900 text-neutral-200 text-[11px] font-mono relative space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 border-b border-neutral-700 pb-1.5">
                    <span>Jalankan ini di Supabase &gt; SQL Editor:</span>
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition cursor-pointer"
                    >
                      {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSql ? 'Tersalin!' : 'Salin SQL'}</span>
                    </button>
                  </div>
                  <pre className="overflow-x-auto text-[10.5px] leading-relaxed max-h-48 scrollbar-thin">
                    {SUPABASE_SETUP_SQL}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Featured Card: Pre-Restart CSV Export Dataset */}
          {EXPORTED_WEEKLY_RECORDS && EXPORTED_WEEKLY_RECORDS.length > 0 && (
            <div className="p-4 rounded-xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-950/40 dark:via-orange-950/20 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-amber-500 text-white flex items-center gap-1 shadow-2xs">
                      <Sparkles className="w-3 h-3" /> Rekomendasi Cadangan
                    </span>
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      Weekly Planning CSV (Data Sebelum Restart)
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                      {EXPORTED_WEEKLY_RECORDS.length} Tugas
                    </span>
                    {isWeeklyCSVActive && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Sedang Digunakan
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    Data lengkap dari <code className="font-mono text-[10px] bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">Weekly_Planning_2026-09-14_to_2026-09-20.csv</code> (termasuk Daris, dr. Teguh, Hermes, MELDA, Ocha, Pierre Marchel, Yusup).
                  </p>
                </div>
                <div className="shrink-0">
                  <button
                    type="button"
                    disabled={isWeeklyCSVActive}
                    onClick={handleRestoreWeeklyCSVExport}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
                      isWeeklyCSVActive
                        ? 'opacity-50 bg-neutral-200 dark:bg-neutral-700 text-neutral-500 cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-600 active:scale-95 text-white'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isWeeklyCSVActive ? 'Sudah Aktif' : 'Pulihkan 40 Tugas Ini'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Detected Browser Snapshots */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Snapshot Ditemukan di Browser ({snapshots.length})
              </div>
              <button
                type="button"
                onClick={refreshSnapshots}
                className="text-[11px] font-medium text-apple-blue hover:underline cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Segarkan
              </button>
            </div>

            {snapshots.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-black/10 dark:border-white/10 text-center text-xs text-neutral-400">
                Tidak ada snapshot tugas tersimpan yang ditemukan di browser saat ini.
              </div>
            ) : (
              <div className="space-y-2.5">
                {snapshots.map((snap) => (
                  <div
                    key={snap.key}
                    className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      snap.isCurrent
                        ? 'border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20'
                        : 'border-black/10 dark:border-white/10 hover:border-apple-blue/40 bg-white dark:bg-neutral-800/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          {snap.key}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                          {snap.count} Tugas
                        </span>
                        {snap.isCurrent && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Sedang Digunakan
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5">
                        {snap.sampleTasks.map((t, idx) => (
                          <span
                            key={idx}
                            className="truncate max-w-[180px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[10px]"
                          >
                            {t}
                          </span>
                        ))}
                        {snap.count > snap.sampleTasks.length && (
                          <span className="text-[10px] text-neutral-400 px-1 py-0.5">
                            +{snap.count - snap.sampleTasks.length} lainnya
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        disabled={snap.isCurrent}
                        onClick={() => handleRestoreSnapshot(snap)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                          snap.isCurrent
                            ? 'opacity-40 bg-neutral-200 dark:bg-neutral-700 text-neutral-500 cursor-not-allowed'
                            : 'bg-apple-blue hover:bg-apple-blueHover active:scale-95 text-white shadow-xs'
                        }`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{snap.isCurrent ? 'Aktif' : 'Pulihkan Ini'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Import & Export */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mb-3">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              Impor File CSV / JSON Cadangan
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Export Card */}
              <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-neutral-50/50 dark:bg-neutral-800/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-xs text-neutral-900 dark:text-neutral-100 mb-1">
                    <Download className="w-4 h-4 text-apple-blue" />
                    Ekspor ke File JSON
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-3">
                    Unduh salinan cadangan dari seluruh tugas ({currentRecords.length} tugas) ke perangkat Anda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onExportRecords}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-neutral-700 border border-black/10 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh File Cadangan</span>
                </button>
              </div>

              {/* Import Card */}
              <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-neutral-50/50 dark:bg-neutral-800/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-xs text-neutral-900 dark:text-neutral-100 mb-1">
                    <Upload className="w-4 h-4 text-emerald-500" />
                    Impor File (.csv / .json)
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-3">
                    Pilih file <code className="font-mono text-[10px]">.csv</code> (seperti Weekly Planning) atau <code className="font-mono text-[10px]">.json</code> dari komputer Anda.
                  </p>
                </div>
                <label className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold transition cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Pilih File CSV / JSON...</span>
                  <input
                    type="file"
                    accept=".csv,text/csv,.json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Origin & Localhost Helper Notice */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <span className="font-semibold block">Catatan Penting Domain / Origin Browser:</span>
              <span>
                Browser menyimpan data di localStorage per alamat URL. Jika sebelumnya Anda membuka dari{' '}
                <code className="px-1 py-0.5 rounded bg-amber-500/20 font-mono font-bold">127.0.0.1:5173</code>{' '}
                dan saat ini di{' '}
                <code className="px-1 py-0.5 rounded bg-amber-500/20 font-mono font-bold">localhost:5173</code>,
                buka kembali melalui alamat yang sama untuk mengakses data tersebut.
              </span>
            </div>
          </div>

          {/* Section 4: Load Default Template */}
          <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
            <div className="text-[11px] text-neutral-400">
              Ingin mereset ke template contoh bawaan?
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Muat data template contoh bawaan Lark? Tindakan ini akan menggantikan daftar tugas yang aktif saat ini.")) {
                  onLoadTemplate();
                  onClose();
                }
              }}
              className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 underline cursor-pointer"
            >
              Muat Data Template Lark Bawaan
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-black/5 dark:border-white/5 bg-neutral-50/50 dark:bg-white/[0.02] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
