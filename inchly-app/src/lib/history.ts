import { dateKey, dayKeyAgo, streak } from './time';

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

export { dateKey };
