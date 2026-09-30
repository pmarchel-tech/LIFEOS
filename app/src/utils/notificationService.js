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
 * Trigger an OS / Browser / Mobile PWA notification for a reminder task
 */
export async function sendTaskNotification(task) {
  playReminderChime();

  // Trigger hardware vibration on mobile phone immediately
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([300, 150, 300, 150, 300]);
    }
  } catch (vibErr) {}

  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications.');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted yet:', Notification.permission);
    return null;
  }

  const title = `⏰ Reminder: ${task.task || 'Tugas Life OS'}`;
  const scheduledTime = task.reminderTime || task.dueTime || '09:00';
  const bodyText = `Jatuh tempo: ${task.dueDate || 'Hari ini'} pukul ${scheduledTime} | ${task.taskLeader || 'Pierre Marchel'} (${task.priority || 'P1'})`;

  // Standard static icon path required by Android Notification Manager
  const options = {
    body: bodyText,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: `task-reminder-${task.id || Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 150, 300, 150, 300],
    data: { url: '/' }
  };

  // 1. Try Service Worker first (MANDATORY for Android Chrome & mobile PWA)
  if ('serviceWorker' in navigator) {
    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }

      // Check if registration is active or wait briefly
      if (reg) {
        if (!reg.active) {
          await new Promise((resolve) => {
            const timer = setTimeout(resolve, 1500);
            navigator.serviceWorker.ready.then(() => {
              clearTimeout(timer);
              resolve();
            }).catch(resolve);
          });
        }

        if (reg.showNotification) {
          await reg.showNotification(title, options);
          return { success: true, via: 'serviceWorker' };
        }
      }
    } catch (swErr) {
      console.warn('Service Worker showNotification error, falling back to Notification constructor:', swErr);
    }
  }

  // 2. Desktop Notification fallback
  try {
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return { success: true, via: 'desktopNotification' };
  } catch (err) {
    console.error('Failed to create browser notification:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send a test notification immediately (Mobile PWA & Desktop)
 */
export async function sendTestNotification() {
  return await sendTaskNotification({
    id: 'test-reminder-' + Date.now(),
    task: 'Uji Coba Notifikasi HP & Desktop Berhasil! 🔔',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: 'Sekarang',
    reminderTime: 'Sekarang',
    taskLeader: 'Pierre Marchel',
    priority: 'P1'
  });
}

