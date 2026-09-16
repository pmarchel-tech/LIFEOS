import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, ChevronUp, ChevronDown, Check } from 'lucide-react';

const PRESETS = [
  { label: '09:00', desc: 'Pagi', time: '09:00' },
  { label: '13:00', desc: 'Siang', time: '13:00' },
  { label: '17:00', desc: 'Sore', time: '17:00' },
  { label: '20:00', desc: 'Malam', time: '20:00' },
];

/**
 * ModernTimePicker
 * Modern Apple-style segmented time picker with keyboard navigation,
 * direct numeric typing, stepper buttons (up/down), and quick presets.
 */
export function ModernTimePicker({
  value = '09:00',
  onChange,
  className = '',
  accent = 'indigo',
  label = '',
  align = 'auto' // 'auto' | 'left' | 'right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const popupRef = useRef(null);
  const hoursInputRef = useRef(null);
  const minutesInputRef = useRef(null);

  const parts = (value || '09:00').split(':');
  const hours = String(parts[0] || '09').padStart(2, '0');
  const minutes = String(parts[1] || '00').padStart(2, '0');

  // Compute position to prevent clipping outside viewport or side peek panel
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const popupWidth = 260; // Approximate width (16rem = 256px)
      const popupHeight = 290;
      const margin = 12;

      let top = rect.bottom + 6;
      let left = rect.left;

      // Check vertical overflow: if bottom would overflow viewport, show above
      if (top + popupHeight > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - popupHeight - 6);
      }

      // Check horizontal overflow
      if (align === 'right' || (rect.right + popupWidth > window.innerWidth - margin && rect.right - popupWidth >= margin)) {
        left = rect.right - popupWidth;
      } else if (left + popupWidth > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - popupWidth - margin);
      }

      setPopupPos({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, align]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        popupRef.current && !popupRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const updateTime = (newH, newM) => {
    const clampedH = Math.max(0, Math.min(23, parseInt(newH, 10) || 0));
    const clampedM = Math.max(0, Math.min(59, parseInt(newM, 10) || 0));
    const formatted = `${String(clampedH).padStart(2, '0')}:${String(clampedM).padStart(2, '0')}`;
    onChange && onChange(formatted);
  };

  const handleStepHours = (delta) => {
    const current = parseInt(hours, 10) || 0;
    const next = (current + delta + 24) % 24;
    updateTime(next, minutes);
  };

  const handleStepMinutes = (delta) => {
    const current = parseInt(minutes, 10) || 0;
    const next = (current + delta + 60) % 60;
    updateTime(hours, next);
  };

  const handleHoursKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleStepHours(1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleStepHours(-1);
    } else if (e.key === 'ArrowRight' || e.key === ':') {
      e.preventDefault();
      minutesInputRef.current && minutesInputRef.current.focus();
      minutesInputRef.current && minutesInputRef.current.select();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleMinutesKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleStepMinutes(5);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleStepMinutes(-5);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      hoursInputRef.current && hoursInputRef.current.focus();
      hoursInputRef.current && hoursInputRef.current.select();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const isAmber = accent === 'amber';
  const pillStyles = isAmber
    ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-900 dark:text-amber-200'
    : 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/25 text-indigo-900 dark:text-indigo-200';
  const iconStyles = isAmber ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400';

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Pill */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono font-bold transition shadow-2xs select-none cursor-pointer ${pillStyles}`}
        title="Klik untuk atur jam dan menit"
      >
        <Clock className={`w-3 h-3 shrink-0 transition-transform group-hover:scale-110 ${iconStyles}`} />
        <span className="tracking-wider text-[11px] font-semibold">{hours}:{minutes}</span>
      </button>

      {/* Modern Popover rendered via Portal to prevent any parent clipping or overflow-hidden issues */}
      {isOpen && createPortal(
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            top: `${popupPos.top}px`,
            left: `${popupPos.left}px`,
            width: '16rem',
            zIndex: 99999
          }}
          className="p-3 bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-neutral-700/80 backdrop-blur-md animate-in fade-in zoom-in-95 select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-neutral-800">
            <span className="text-[11px] font-bold text-slate-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {label || 'Pilih Waktu (24 Jam)'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {parseInt(hours, 10) < 12 ? 'AM' : 'PM'}
            </span>
          </div>

          {/* Stepper / Direct Inputs */}
          <div className="flex items-center justify-center gap-2 py-2">
            {/* Hours Column */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => handleStepHours(1)}
                className="w-8 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition active:scale-90 cursor-pointer"
                title="Tambah 1 Jam"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <input
                ref={hoursInputRef}
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={hours}
                onFocus={(e) => e.target.select()}
                onKeyDown={handleHoursKeyDown}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val === '') {
                    updateTime(0, minutes);
                  } else {
                    updateTime(val, minutes);
                  }
                }}
                className="w-12 h-10 text-center text-lg font-mono font-black bg-slate-100/80 dark:bg-neutral-800 rounded-xl border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <button
                type="button"
                onClick={() => handleStepHours(-1)}
                className="w-8 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition active:scale-90 cursor-pointer"
                title="Kurang 1 Jam"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5 tracking-wider">Jam</span>
            </div>

            <div className="text-xl font-black text-slate-400 -mt-5">:</div>

            {/* Minutes Column */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => handleStepMinutes(5)}
                className="w-8 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition active:scale-90 cursor-pointer"
                title="Tambah 5 Menit"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <input
                ref={minutesInputRef}
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={minutes}
                onFocus={(e) => e.target.select()}
                onKeyDown={handleMinutesKeyDown}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val === '') {
                    updateTime(hours, 0);
                  } else {
                    updateTime(hours, val);
                  }
                }}
                className="w-12 h-10 text-center text-lg font-mono font-black bg-slate-100/80 dark:bg-neutral-800 rounded-xl border border-slate-200 dark:border-neutral-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <button
                type="button"
                onClick={() => handleStepMinutes(-5)}
                className="w-8 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition active:scale-90 cursor-pointer"
                title="Kurang 5 Menit"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5 tracking-wider">Menit</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
            <div className="text-[10px] font-semibold text-slate-400 dark:text-neutral-500 mb-1.5">
              Preset Cepat:
            </div>
            <div className="grid grid-cols-4 gap-1">
              {PRESETS.map((p) => {
                const isSelected = `${hours}:${minutes}` === p.time;
                return (
                  <button
                    key={p.time}
                    type="button"
                    onClick={() => {
                      onChange && onChange(p.time);
                    }}
                    className={`px-1.5 py-1 rounded-lg text-[10px] font-mono flex flex-col items-center transition cursor-pointer active:scale-95 ${
                      isSelected
                        ? (isAmber ? 'bg-amber-500 text-white font-bold' : 'bg-indigo-600 text-white font-bold')
                        : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-indigo-50 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <span className="font-bold">{p.label}</span>
                    <span className="text-[8px] opacity-75">{p.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Done */}
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-neutral-800 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-xs cursor-pointer active:scale-95"
            >
              <Check className="w-3 h-3" />
              Selesai
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
