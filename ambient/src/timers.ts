import { useEffect, useRef } from 'react';
import { Vibration } from 'react-native';

import type { Settings } from './settings';

// Timer and stopwatch keep wall-clock timestamps rather than counting ticks, so they
// stay right while the app is in the background and survive a restart.


export type Timer = Settings['timer'];
export type Stopwatch = Settings['stopwatch'];

/** Milliseconds left on the timer (0 when finished). */
export function timerLeft(t: Timer, now: number): number {
  // Never more than it had when it started, even for a "now" read just before that.
  return t.endAt != null ? Math.max(0, Math.min(t.left, t.endAt - now)) : t.left;
}

export function timerRunning(t: Timer): boolean {
  return t.endAt != null;
}

/** Ran out (as opposed to empty: nothing set). */
export function timerDone(t: Timer): boolean {
  return t.endAt == null && t.left <= 0 && t.duration > 0;
}

/** Tap: start, pause, resume, or (once finished) set it back to its full time. */
export function toggleTimer(t: Timer, now: number): Timer {
  if (t.endAt != null) return { ...t, endAt: null, left: Math.max(0, t.endAt - now) };
  if (t.duration <= 0) return t;
  if (t.left <= 0) return { ...t, left: t.duration };
  return { ...t, endAt: now + t.left };
}

/** Hold: back to nothing, 00:00:00. */
export function resetTimer(_t: Timer): Timer {
  return { duration: 0, endAt: null, left: 0 };
}

export function setTimerDuration(duration: number): Timer {
  return { duration, endAt: null, left: duration };
}

export function stopwatchElapsed(s: Stopwatch, now: number): number {
  // A "now" read a moment before the start would count back past zero.
  return s.startAt != null ? s.elapsed + Math.max(0, now - s.startAt) : s.elapsed;
}

export function toggleStopwatch(s: Stopwatch, now: number): Stopwatch {
  return s.startAt != null ? { startAt: null, elapsed: s.elapsed + (now - s.startAt) } : { ...s, startAt: now };
}

export function resetStopwatch(): Stopwatch {
  return { startAt: null, elapsed: 0 };
}

/** "01:04:05": always hours, minutes and seconds, two digits each ("01:04" without seconds). */
export function formatFixed(ms: number, seconds = true): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const two = (n: number) => String(n).padStart(2, '0');
  const hm = `${two(Math.floor(total / 3600))}:${two(Math.floor((total % 3600) / 60))}`;
  return seconds ? `${hm}:${two(total % 60)}` : hm;
}

/** "4:05", or "1:04:05" from an hour up. */
export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** "5分", "1時間30分" — how long the timer is set for. */
export function durationLabel(ms: number): string {
  const min = Math.round(ms / 60_000);
  return min >= 60 ? `${Math.floor(min / 60)}時間${min % 60 ? `${min % 60}分` : ''}` : `${min}分`;
}

/**
 * Finishes the timer when its time comes: marks it done and buzzes. A timer that ran
 * out while the app was closed is marked done quietly.
 */
export function useTimerAlarm(timer: Timer, update: (change: (s: Settings) => Settings) => void, onRing: () => void) {
  const ring = useRef(onRing);
  useEffect(() => {
    ring.current = onRing;
  });
  useEffect(() => {
    if (timer.endAt == null) return;
    const endAt = timer.endAt;
    const t = setTimeout(() => {
      update((s) => (s.timer.endAt === endAt ? { ...s, timer: { ...s.timer, endAt: null, left: 0 } } : s));
      if (Date.now() - endAt < 10_000) {
        Vibration.vibrate([0, 400, 200, 400, 200, 400]);
        ring.current();
      }
    }, Math.max(0, endAt - Date.now()));
    return () => clearTimeout(t);
  }, [timer.endAt, update]);
}
