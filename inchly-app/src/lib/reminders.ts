import { daysUntil } from './time';
import { Block, blocksOn, endOf, toMin } from './timetable';

// When each reminder should fire. Pure, so the times can be tested; the
// scheduling itself lives in notify.ts.

export type NextChoice = 'tomorrow' | 'tonight' | 'weekend' | 'none';

const at = (base: Date, days: number, h: number, m = 0) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d;
};

/** "次はいつやる？" → the moment to remind. Tomorrow keeps the clock time the session started. */
export function nextTimeAt(choice: NextChoice, start: Date, now: Date = new Date()): Date | null {
  if (choice === 'none') return null;
  if (choice === 'tomorrow') return at(now, 1, start.getHours(), start.getMinutes());
  if (choice === 'tonight') {
    const t = at(now, 0, 22);
    return t > now ? t : null;
  }
  // the coming Saturday at 9:00 (next week's if it's already Saturday morning past 9 or Sunday)
  const toSat = (6 - now.getDay() + 7) % 7;
  const sat = at(now, toSat, 9);
  return sat > now ? sat : at(now, toSat + 7, 9);
}

/** Labels for the choices, from the same times. */
export function nextTimeLabel(choice: NextChoice, start: Date, now: Date = new Date()): string | null {
  const d = nextTimeAt(choice, start, now);
  if (!d) return null;
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  return choice === 'tomorrow' ? `明日 ${hm}` : choice === 'tonight' ? `今夜 ${hm}` : `土曜 ${hm}`;
}

export type Reminder = { id: string; at: Date; title: string; body: string };

/** Each deadline: three days before at 9:00, and the day before at 20:00 — only the ones still ahead. */
export function deadlineReminders(deadlines: readonly { id: string; t: string; mo: number; day: number }[], now: Date = new Date()): Reminder[] {
  const out: Reminder[] = [];
  for (const d of deadlines) {
    const left = daysUntil(d.mo, d.day, now);
    const three = at(now, left - 3, 9);
    const one = at(now, left - 1, 20);
    if (three > now) out.push({ id: `dl-${d.id}-3`, at: three, title: `${d.t}まで あと3日`, body: 'ひも付けたToDoを確認しておきましょう' });
    if (one > now) out.push({ id: `dl-${d.id}-1`, at: one, title: `${d.t}は明日です`, body: '今日のうちに準備を' });
  }
  return out;
}

/** While the timer runs: the moment today's total comes within 15 minutes of the goal. Null if that's past or never. */
export function goalReminderAt(todayMin: number, elapsedSec: number, goalMin: number, now: Date = new Date()): Date | null {
  const left = goalMin - 15 - todayMin - elapsedSec / 60;
  if (left <= 0) return null;
  return new Date(now.getTime() + left * 60_000);
}

/**
 * The timetable: a nudge when each planned block starts, for the next `days`
 * days (weekly blocks and one-day plans alike). Kept under `max`, earliest
 * first, since a phone holds only so many scheduled notifications.
 */
export function timetableReminders(blocks: readonly Block[], name: (s: string) => string, now: Date = new Date(), days = 7, max = 48): Reminder[] {
  const out: Reminder[] = [];
  for (let i = 0; i < days; i++) {
    const day = at(now, i, 0);
    for (const b of blocksOn(blocks, day)) {
      if (!b.start) continue; // a plan with no time has no moment to remind
      const m = toMin(b.start);
      const when = at(now, i, Math.floor(m / 60), m % 60);
      if (when <= now) continue;
      const key = `${day.getFullYear()}${String(day.getMonth() + 1).padStart(2, '0')}${String(day.getDate()).padStart(2, '0')}`;
      out.push({ id: `tt-${b.id}-${key}`, at: when, title: `${name(b.s)}の時間です`, body: `${b.start}〜${endOf(b)}${b.t ? ` · ${b.t}` : ''}。開くとすぐ始められます` });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, max);
}
