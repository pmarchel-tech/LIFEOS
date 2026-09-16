import React, { useState, useEffect } from 'react';
import { X, Trash2, Save, Calendar, User, Tag, Layers, CheckCircle2, Clock, Bell, BellOff } from 'lucide-react';
import { BUSINESS_LINES, PROJECTS, PRIORITIES, STATUSES, LEADERS, REMINDER_OPTIONS, DEFAULT_DUE_TIME, DEFAULT_REMINDER } from '../data/initialData';
import { ModernTimePicker } from './ModernTimePicker';

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function RecordModal({
  isOpen,
  onClose,
  record,
  onSave,
  onDelete,
  categories = BUSINESS_LINES,
  onAddCategory,
  projects = PROJECTS,
  onAddProject,
  leaders = LEADERS,
  onAddLeader
}) {
  const [formData, setFormData] = useState({
    task: '',
    priority: 'P1',
    project: 'BETTER FUTURE',
    status: 'Not yet started',
    taskLeader: (leaders && leaders[0] && leaders[0].name) || 'Pierre Marchel',
    businessLine: categories[0] || 'BETTER FUTURE',
    startTime: getTodayStr(),
    dueDate: getTodayStr(),
    dueTime: DEFAULT_DUE_TIME,
    reminder: DEFAULT_REMINDER,
    reminderTime: DEFAULT_DUE_TIME,
    notes: ''
  });
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (record) {
      setFormData({
        task: record.task || '',
        priority: record.priority || 'P1',
        project: record.project || 'BETTER FUTURE',
        status: record.status || 'Not yet started',
        taskLeader: record.taskLeader || (leaders && leaders[0] && leaders[0].name) || 'Pierre Marchel',
        businessLine: record.businessLine || categories[0] || 'BETTER FUTURE',
        element: record.element || 'E2',
        startTime: record.startTime || getTodayStr(),
        dueDate: record.dueDate || getTodayStr(),
        dueTime: record.dueTime || DEFAULT_DUE_TIME,
        reminder: record.reminder || DEFAULT_REMINDER,
        reminderTime: record.reminderTime || record.dueTime || DEFAULT_DUE_TIME,
        notes: record.notes || ''
      });
    } else {
      const today = getTodayStr();
      setFormData({
        task: '',
        priority: 'P1',
        project: 'BETTER FUTURE',
        status: 'Not yet started',
        taskLeader: (leaders && leaders[0] && leaders[0].name) || 'Pierre Marchel',
        businessLine: categories[0] || 'BETTER FUTURE',
        element: 'E2',
        startTime: today,
        dueDate: today,
        dueTime: DEFAULT_DUE_TIME,
        reminder: DEFAULT_REMINDER,
        reminderTime: DEFAULT_DUE_TIME,
        notes: ''
      });
    }
  }, [record, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.task.trim()) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
            {record && record.id ? 'Edit Record' : 'Add New Record'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Task Name */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider text-[11px]">
              Task Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. RESIGN MOBILE APP"
              value={formData.task}
              onChange={(e) => setFormData({ ...formData, task: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Priority */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold"
              >
                {Object.keys(PRIORITIES).map(p => (
                  <option key={p} value={p}>{p} Priority</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
              >
                {Object.entries(STATUSES).map(([s, cfg]) => (
                  <option key={s} value={s}>{cfg.label || s}</option>
                ))}
              </select>
            </div>

            {/* Business Line / Category */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Business Line / Category
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  {isAddingCategory ? 'Pilih yang Ada' : '+ Kategori Baru'}
                </button>
              </div>

              {isAddingCategory ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Nama Kategori baru..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-blue-400 dark:border-blue-600 rounded-lg text-slate-900 dark:text-white focus:outline-none font-semibold text-xs"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = newCategoryName.trim().toUpperCase();
                      if (trimmed) {
                        onAddCategory && onAddCategory(trimmed);
                        setFormData({ ...formData, businessLine: trimmed });
                        setIsAddingCategory(false);
                        setNewCategoryName('');
                      }
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700"
                  >
                    Tambah
                  </button>
                </div>
              ) : (
                <select
                  value={formData.businessLine}
                  onChange={(e) => setFormData({ ...formData, businessLine: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
                >
                  {categories.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Project */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Project
              </label>
              <select
                value={formData.project}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__ADD_NEW_PROJECT__') {
                    const input = window.prompt("Masukkan nama project baru:");
                    if (input && input.trim()) {
                      const created = onAddProject ? onAddProject(input.trim()) : input.trim();
                      setFormData(prev => ({ ...prev, project: created }));
                    }
                  } else {
                    setFormData(prev => ({ ...prev, project: val }));
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
              >
                {projects.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
                <option disabled>──────────</option>
                <option value="__ADD_NEW_PROJECT__" className="text-blue-600 dark:text-blue-400 font-bold">
                  + Add New Project
                </option>
              </select>
            </div>

            {/* Task Leader */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Task Leader
              </label>
              <select
                value={formData.taskLeader}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__ADD_PERSON__') {
                    const input = window.prompt('Tambahkan person baru (Nama):');
                    if (input && input.trim()) {
                      const created = onAddLeader ? onAddLeader(input.trim()) : input.trim();
                      setFormData(prev => ({ ...prev, taskLeader: created }));
                    }
                  } else {
                    setFormData(prev => ({ ...prev, taskLeader: val }));
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
              >
                {(leaders || LEADERS).map(l => (
                  <option key={l.name} value={l.name}>{l.name}</option>
                ))}
                <option disabled className="text-slate-400">──────────</option>
                <option value="__ADD_PERSON__" className="text-blue-600 dark:text-blue-400 font-bold">+ person</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startTime}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    startTime: val,
                    dueDate: prev.dueDate && prev.dueDate !== prev.startTime ? prev.dueDate : val
                  }));
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Due Date & Time */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Due Date</span>
                <span className="text-[10px] text-blue-600 dark:text-sky-400 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Default: 9 AM
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                />
                <ModernTimePicker
                  value={formData.dueTime || DEFAULT_DUE_TIME}
                  onChange={(newTime) => setFormData({ ...formData, dueTime: newTime })}
                  accent="indigo"
                  label="Jam Jatuh Tempo (Due Time)"
                />
              </div>
            </div>

            {/* Reminder Setting */}
            <div className="col-span-1 sm:col-span-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  {formData.reminder === 'NONE' ? (
                    <BellOff className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span>Reminder</span>
                </label>
                <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                  formData.reminder === 'NONE'
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-300/40'
                }`}>
                  {formData.reminder === 'NONE' ? 'NO REMINDER' : formData.reminder === 'D_DAY' ? 'HARI H' : formData.reminder?.replace('_', ' ')}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={formData.reminder || DEFAULT_REMINDER}
                  onChange={(e) => setFormData({ ...formData, reminder: e.target.value })}
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
                >
                  {REMINDER_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {formData.reminder !== 'NONE' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-amber-700 dark:text-amber-400 font-bold">Jam:</span>
                    <ModernTimePicker
                      value={formData.reminderTime || formData.dueTime || DEFAULT_DUE_TIME}
                      onChange={(newTime) => setFormData({ ...formData, reminderTime: newTime })}
                      accent="amber"
                      label="Jam Pengingat (Reminder)"
                    />
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400 mt-1.5">
                {formData.reminder === 'NONE'
                  ? 'Tidak ada pengingat / reminder yang akan dikirim untuk tugas ini.'
                  : `Notifikasi pengingat otomatis berbunyi & muncul di browser pada pukul ${formData.reminderTime || formData.dueTime || DEFAULT_DUE_TIME}.`}
              </p>
            </div>

          </div>

          {/* Notes / Latest Update */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Latest Update
            </label>
            <textarea
              rows={3}
              placeholder="Progres atau update terkini, kendala, status..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            {record && record.id ? (
              <button
                type="button"
                onClick={() => onDelete(record.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 font-semibold transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition"
              >
                <Save className="w-4 h-4" />
                <span>Save Record</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
