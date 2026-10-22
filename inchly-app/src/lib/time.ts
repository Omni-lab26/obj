// Dates as the app thinks of them: a study day is a local calendar date,
// written 'YYYY-MM-DD'. "Today" always comes from the device clock, so the app
// rolls over at midnight wherever the phone is. Everything here is pure and
// takes `now` as an argument so it can be tested.

const pad2 = (n: number) => String(n).padStart(2, '0');

/** The local calendar date of `d` as 'YYYY-MM-DD'. */
export const dateKey = (d: Date = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Local midnight of a 'YYYY-MM-DD' key. */
export function parseKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The key `n` days after (or before, if negative) `k`. Safe across DST and month ends. */
export function addDays(k: string, n: number): string {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  // noon avoids an hour lost or gained to daylight saving time
  const x = parseKey(a), y = parseKey(b);
  x.setHours(12); y.setHours(12);
  return Math.round((y.getTime() - x.getTime()) / 86_400_000);
}

/** The key of the day `daysAgo` before `now`. */
export const dayKeyAgo = (daysAgo: number, now: Date = new Date()) => addDays(dateKey(now), -daysAgo);

/** Days until the next `mo`/`day` (today counts as 0; a date already gone this year means next year). */
export function daysUntil(mo: number, day: number, now: Date = new Date()): number {
  const today = dateKey(now);
  let y = now.getFullYear();
  if (`${y}-${pad2(mo)}-${pad2(day)}` < today) y += 1;
  return daysBetween(today, `${y}-${pad2(mo)}-${pad2(day)}`);
}

/** Age reached this calendar year — what a birth-year field can tell us. */
export const ageThisYear = (birthYear: number, now: Date = new Date()) => now.getFullYear() - birthYear;

/**
 * The run of consecutive study days ending today. Today still counts as open:
 * if you haven't studied yet today, the run up to yesterday stands. Days covered
 * by a rest ticket keep the run going without adding to it.
 */
export function streak(studied: Set<string>, rest: Set<string>, now: Date = new Date()): number {
  let k = dateKey(now);
  if (!studied.has(k)) k = addDays(k, -1);
  let n = 0;
  for (let guard = 0; guard < 3660; guard++) {
    if (studied.has(k)) n += 1;
    else if (!rest.has(k)) break;
    k = addDays(k, -1);
  }
  return n;
}

/** 0 = Monday … 6 = Sunday. */
export const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;

/** '10月21日（水）' */
const WD = ['日', '月', '火', '水', '木', '金', '土'];
export const jpDate = (d: Date, weekday = true) => `${d.getMonth() + 1}月${d.getDate()}日${weekday ? `（${WD[d.getDay()]}）` : ''}`;
export const weekdayJa = (d: Date) => WD[d.getDay()];
