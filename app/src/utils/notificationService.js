// Browser notification & reminder chime utility for Harada Life OS

/**
 * Request notification permission from browser (Chrome / Edge / Firefox / Safari)
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }
  return Notification.permission;
}

/**
 * Check if notifications are currently supported and granted
 */
export function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Play a gentle Apple-style reminder chime using Web Audio API
 */
export function playReminderChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    
    // Primary chime tone (E6)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1318.51, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Harmonic chime tone (G#6) slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1661.22, now + 0.08);
    gain2.gain.setValueAtTime(0.2, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.9);
  } catch (err) {
    console.warn('Audio chime playback failed:', err);
  }
}

/**
 * Trigger an OS / Browser / Windows Action Center notification for a reminder task
 */
export function sendTaskNotification(task) {
  playReminderChime();

  if (!('Notification' in window)) {
    console.warn('Browser does not support desktop notifications.');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted yet:', Notification.permission);
    return null;
  }

  const title = `⏰ Reminder: ${task.task || 'Tugas Life OS'}`;
  const scheduledTime = task.reminderTime || task.dueTime || '09:00';
  const bodyText = `Jatuh tempo: ${task.dueDate || 'Hari ini'} pukul ${scheduledTime} | ${task.taskLeader || 'Pierre Marchel'} (${task.priority || 'P1'})`;

  // Options optimized for Windows Action Center / Chrome Toast
  const options = {
    body: bodyText,
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⏰</text></svg>',
    tag: `task-reminder-${task.id || Date.now()}`,
    renotify: true,
    requireInteraction: true,
    silent: false
  };

  try {
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return notification;
  } catch (err) {
    console.error('Failed to create Windows notification:', err);
    return null;
  }
}

/**
 * Send a test Windows notification immediately
 */
export function sendTestNotification() {
  return sendTaskNotification({
    id: 'test-reminder',
    task: 'Uji Coba Notifikasi Windows & Chrome Berhasil!',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: 'Sekarang',
    reminderTime: 'Sekarang',
    taskLeader: 'Pierre Marchel',
    priority: 'P1'
  });
}
