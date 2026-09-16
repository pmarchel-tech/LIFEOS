import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qyoelnhsqjxidgyeafka.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5b2VsbmhzcWp4aWRneWVhZmthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MjU2MDIsImV4cCI6MjEwNTEwMTYwMn0.9fM5Tc6oyz-6-TOgpddMNBMeb7UDuGw7y-DJAbtpp4Y';

const getAnonKey = () => {
  return import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('life_os_supabase_anon_key') || DEFAULT_ANON_KEY;
};

export const getSupabaseClient = () => {
  const anonKey = getAnonKey();
  if (!SUPABASE_URL || !anonKey) return null;
  return createClient(SUPABASE_URL, anonKey);
};

export const isSupabaseConfigured = () => {
  return Boolean(getAnonKey());
};

// Convert app record (camelCase) to Supabase row (snake_case)
export const toDbRow = (r) => ({
  id: String(r.id),
  task: r.task || 'Untitled Task',
  priority: r.priority || 'P1',
  project: r.project || 'BETTER FUTURE',
  status: r.status || 'Not yet started',
  task_leader: r.taskLeader || 'Pierre Marchel',
  business_line: r.businessLine || 'BETTER FUTURE',
  element: r.element || 'E2',
  start_time: r.startTime || null,
  due_date: r.dueDate || null,
  due_time: r.dueTime || '09:00',
  reminder: r.reminder || 'NONE',
  reminder_time: r.reminderTime || null,
  notes: r.notes || '',
  updates: Array.isArray(r.updates) ? r.updates : [],
  parent_id: r.parentId || null,
  updated_at: new Date().toISOString()
});

// Convert Supabase row (snake_case) to app record (camelCase)
export const fromDbRow = (row) => ({
  id: row.id,
  task: row.task || '',
  priority: row.priority || 'P1',
  project: row.project || 'BETTER FUTURE',
  status: row.status || 'Not yet started',
  taskLeader: row.task_leader || 'Pierre Marchel',
  businessLine: row.business_line || 'BETTER FUTURE',
  element: row.element || 'E2',
  startTime: row.start_time || '',
  dueDate: row.due_date || '',
  dueTime: row.due_time || '09:00',
  reminder: row.reminder || 'NONE',
  reminderTime: row.reminder_time || '',
  notes: row.notes || '',
  updates: Array.isArray(row.updates) ? row.updates : [],
  parentId: row.parent_id || null
});

// Fetch all tasks from Supabase
export async function fetchTasksFromSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Supabase fetch error:', error);
      return null;
    }
    return data.map(fromDbRow);
  } catch (err) {
    console.warn('Failed connecting to Supabase:', err);
    return null;
  }
}

// Bulk upsert tasks to Supabase
export async function syncTasksToSupabase(records) {
  const supabase = getSupabaseClient();
  if (!supabase || !Array.isArray(records) || records.length === 0) return false;

  try {
    const rows = records.map(toDbRow);
    const { error } = await supabase
      .from('tasks')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase sync error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed syncing to Supabase:', err);
    return false;
  }
}

// Single task upsert
export async function upsertSingleTaskToSupabase(record) {
  const supabase = getSupabaseClient();
  if (!supabase || !record) return false;

  try {
    const row = toDbRow(record);
    const { error } = await supabase
      .from('tasks')
      .upsert([row], { onConflict: 'id' });

    if (error) {
      console.warn('Supabase single upsert error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed upserting task to Supabase:', err);
    return false;
  }
}

// Delete task from Supabase
export async function deleteTaskFromSupabase(id) {
  const supabase = getSupabaseClient();
  if (!supabase || !id) return false;

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', String(id));

    if (error) {
      console.warn('Supabase delete error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed deleting task from Supabase:', err);
    return false;
  }
}

// Test connection
export async function testSupabaseConnection(overrideKey = null) {
  const key = overrideKey || getAnonKey();
  if (!key) return { success: false, message: 'Anon key belum diisi.' };

  try {
    const client = createClient(SUPABASE_URL, key);
    const { data, error } = await client
      .from('tasks')
      .select('id')
      .limit(1);

    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Koneksi ke Supabase berhasil!' };
  } catch (err) {
    return { success: false, message: err.message || 'Koneksi gagal' };
  }
}
