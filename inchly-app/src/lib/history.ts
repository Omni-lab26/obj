import { addDays, dateKey, dayKeyAgo, parseKey, streak } from './time';

// What the charts, the grass and the totals read: your records, grouped by day.
// Pure functions over the session list, cached per list so a screen that asks
// many questions of the same history does the grouping once.

export const SUBJECT_IDS = ['en', 'ma', 'ph', 'ch', 'ja'] as const;
export type Rec = { s: string; min: number; date: string };
export type Day = { min: number; parts: number[] }; // parts in SUBJECT_IDS order

const cache = new WeakMap<readonly Rec[], Map<string, Day>>();
export function byDay(recs: readonly Rec[]): Map<string, Day> {
  const hit = cache.get(recs);
  if (hit) return hit;
  const out = new Map<string, Day>();
  for (const r of recs) {
    const d = out.get(r.date) ?? { min: 0, parts: [0, 0, 0, 0, 0] };
    const k = SUBJECT_IDS.indexOf(r.s as (typeof SUBJECT_IDS)[number]);
    d.min += r.min;
    if (k >= 0) d.parts[k] += r.min;
    out.set(r.date, d);
  }
  cache.set(recs, out);
  return out;
}

const EMPTY: Day = { min: 0, parts: [0, 0, 0, 0, 0] };

/** The day `daysAgo` before now. */
export const dayOf = (recs: readonly Rec[], daysAgo: number, now: Date = new Date()): Day => byDay(recs).get(dayKeyAgo(daysAgo, now)) ?? EMPTY;

/** Minutes studied today. */
export const todayMinutes = (recs: readonly Rec[], now: Date = new Date()) => dayOf(recs, 0, now).min;

/** Minutes in the last `days` days, today included. */
export function minutesIn(recs: readonly Rec[], days: number, now: Date = new Date()): number {
  let m = 0;
  for (let i = 0; i < days; i++) m += dayOf(recs, i, now).min;
  return m;
}

/** Grass level for a day's minutes: 0 none … 4 a long day. */
export const levelOf = (min: number) => (min === 0 ? 0 : min < 60 ? 1 : min < 120 ? 2 : min < 200 ? 3 : 4);

/** Grass levels for the last `weeks` weeks, oldest first, ending today. */
export function grassOf(recs: readonly Rec[], weeks: number, now: Date = new Date()): number[] {
  const n = weeks * 7;
  return Array.from({ length: n }, (_, i) => levelOf(dayOf(recs, n - 1 - i, now).min));
}

/** Consecutive study days ending today (rest-ticket days keep it alive). */
export function streakOf(recs: readonly Rec[], restDays: readonly string[] = [], now: Date = new Date()): number {
  return streak(new Set(byDay(recs).keys()), new Set(restDays), now);
}

/** Whether you studied on the day `daysAgo` before now. */
export const studiedOn = (recs: readonly Rec[], daysAgo: number, now: Date = new Date()) => dayOf(recs, daysAgo, now).min > 0;

/** Minutes in each clock hour of a day, by subject. */
export type Hours = { min: number[]; parts: number[][] }; // 24 entries; parts in SUBJECT_IDS order

const clock = (at: string) => {
  const [h, m] = at.split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : NaN;
};
const emptyHours = (): Hours => ({ min: Array.from({ length: 24 }, () => 0), parts: Array.from({ length: 24 }, () => [0, 0, 0, 0, 0]) });

/** Add the span [from, to) minutes after midnight onto the hours it touches. */
function spread(h: Hours, from: number, to: number, s: string) {
  const k = SUBJECT_IDS.indexOf(s as (typeof SUBJECT_IDS)[number]);
  for (let i = Math.max(0, Math.floor(from / 60)); i < 24 && i * 60 < to; i++) {
    const m = Math.min(to, (i + 1) * 60) - Math.max(from, i * 60);
    if (m <= 0) continue;
    h.min[i] += m;
    if (k >= 0) h.parts[i][k] += m;
  }
}

/**
 * Where a day's study fell on the clock. A record is stamped with the time it
 * ended, so it covers [at − min, at); that span is split across the hours it
 * touches. A record that started before midnight puts the early part on the
 * day before, where it happened.
 */
export function hourlyOf(recs: readonly (Rec & { at?: string })[], date: string): Hours {
  const out = emptyHours();
  const next = addDays(date, 1);
  for (const r of recs) {
    const end = clock(r.at ?? '');
    if (!Number.isFinite(end)) continue;
    if (r.date === date) spread(out, Math.max(0, end - r.min), end, r.s);
    else if (r.date === next && end - r.min < 0) spread(out, 1440 + end - r.min, 1440, r.s);
  }
  return out;
}

/** The same hours with a live, unrecorded span (a running timer) added on. */
export function withLive(h: Hours, startMs: number, endMs: number, date: string, s: string): Hours {
  const day = parseKey(date).getTime();
  const out = { min: [...h.min], parts: h.parts.map((p) => [...p]) };
  spread(out, (startMs - day) / 60_000, (endMs - day) / 60_000, s);
  return out;
}

/** The calendar week (Monday first) that holds `now`, day by day. */
export function weekOf(recs: readonly Rec[], now: Date = new Date()): (Day & { date: string })[] {
  const today = dateKey(now);
  const monday = addDays(today, -((now.getDay() + 6) % 7));
  const days = byDay(recs);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    return { date, ...(days.get(date) ?? EMPTY) };
  });
}

export { dateKey };
