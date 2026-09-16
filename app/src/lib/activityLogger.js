import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const LOGS_STORAGE_KEY = 'life_os_activity_logs_v1';
const CURRENT_USER_KEY = 'life_os_active_user_name';

/**
 * Get active user name from localStorage or fallback to 'Pierre Marchel'
 */
export const getActiveUserName = () => {
  try {
    return localStorage.getItem(CURRENT_USER_KEY) || 'Pierre Marchel';
  } catch (e) {
    return 'Pierre Marchel';
  }
};

/**
 * Set active user name in localStorage
 */
export const setActiveUserName = (name) => {
  try {
    if (name && name.trim()) {
      localStorage.setItem(CURRENT_USER_KEY, name.trim());
    }
  } catch (e) {}
};

/**
 * Get local cached logs (max 500 items to prevent bloat)
 */
export const getLocalLogs = () => {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed reading activity logs:', e);
    return [];
  }
};

/**
 * Save logs to localStorage
 */
export const saveLocalLogs = (logs) => {
  try {
    const trimmed = logs.slice(0, 500); // keep recent 500
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed writing activity logs:', e);
  }
};

/**
 * Format timestamp display (e.g. 2026-09-16 09:45:20)
 */
export const formatLogTimestamp = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
};

/**
 * Convert log entry to Supabase row (snake_case)
 */
export const toDbLog = (entry) => ({
  id: entry.id,
  timestamp: entry.timestamp || new Date().toISOString(),
  task_name: entry.taskName || 'Untitled Task',
  task_id: entry.taskId ? String(entry.taskId) : null,
  change_type: entry.changeType || 'CHANGE',
  description: entry.description || '',
  user_name: entry.userName || getActiveUserName(),
  is_subtask: Boolean(entry.isSubtask),
  metadata: entry.metadata || {}
});

/**
 * Convert Supabase row to log entry (camelCase)
 */
export const fromDbLog = (row) => ({
  id: row.id,
  timestamp: row.timestamp || row.created_at,
  taskName: row.task_name || 'Untitled Task',
  taskId: row.task_id || '',
  changeType: row.change_type || 'CHANGE',
  description: row.description || '',
  userName: row.user_name || 'Pierre Marchel',
  isSubtask: Boolean(row.is_subtask),
  metadata: row.metadata || {}
});

/**
 * Record a single activity log entry.
 * Saves locally first, then syncs to Supabase in the background if configured.
 */
export async function createActivityLog({
  taskName,
  taskId = null,
  changeType = 'CHANGE', // 'ADD' | 'EDIT' | 'CHANGE' | 'DELETE'
  description = '',
  userName = null,
  isSubtask = false,
  metadata = {}
}) {
  const actor = userName || getActiveUserName();
  const newLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    taskName: taskName || 'Untitled Task',
    taskId: taskId ? String(taskId) : null,
    changeType: changeType.toUpperCase(),
    description: description || '',
    userName: actor,
    isSubtask: Boolean(isSubtask),
    metadata: metadata || {}
  };

  // 1. Update localStorage
  const currentLogs = getLocalLogs();
  const updatedLogs = [newLog, ...currentLogs];
  saveLocalLogs(updatedLogs);

  // 2. Background sync to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const client = getSupabaseClient();
      if (client) {
        client
          .from('activity_logs')
          .insert([toDbLog(newLog)])
          .then(({ error }) => {
            if (error) {
              console.warn('Supabase activity log sync error:', error.message);
            }
          })
          .catch((err) => {
            console.warn('Supabase activity log error:', err);
          });
      }
    } catch (e) {
      console.warn('Failed background log sync:', e);
    }
  }

  return newLog;
}

/**
 * Fetch all activity logs from Supabase
 */
export async function fetchLogsFromSupabase(limit = 200) {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('activity_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Error fetching activity logs from Supabase:', error.message);
      return null;
    }

    return (data || []).map(fromDbLog);
  } catch (err) {
    console.warn('Failed connecting to Supabase for logs:', err);
    return null;
  }
}

/**
 * Bulk sync local logs to Supabase
 */
export async function syncLogsToSupabase(logs) {
  const client = getSupabaseClient();
  if (!client || !Array.isArray(logs) || logs.length === 0) return false;

  try {
    const rows = logs.map(toDbLog);
    const { error } = await client
      .from('activity_logs')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.warn('Error syncing logs to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed syncing logs:', err);
    return false;
  }
}
