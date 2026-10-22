/// <reference types="jest" />
import { dayOf, grassOf, levelOf, minutesIn, streakOf, todayMinutes } from '../history';

const now = new Date(2026, 9, 21, 12);
const recs = [
  { s: 'en', min: 60, date: '2026-10-21' },
  { s: 'ma', min: 40, date: '2026-10-21' },
  { s: 'ph', min: 55, date: '2026-10-20' },
  { s: 'ja', min: 30, date: '2026-10-14' },
];

describe('history', () => {
  it('sums today', () => {
    expect(todayMinutes(recs, now)).toBe(100);
  });
  it('splits a day by subject', () => {
    expect(dayOf(recs, 0, now).parts).toEqual([60, 40, 0, 0, 0]);
    expect(dayOf(recs, 1, now)).toEqual({ min: 55, parts: [0, 0, 55, 0, 0] });
    expect(dayOf(recs, 2, now).min).toBe(0);
  });
  it('totals a window that includes today', () => {
    expect(minutesIn(recs, 7, now)).toBe(155);
    expect(minutesIn(recs, 8, now)).toBe(185);
  });
  it('rolls over: the same records read differently tomorrow', () => {
    const tomorrow = new Date(2026, 9, 22, 8);
    expect(todayMinutes(recs, tomorrow)).toBe(0);
    expect(dayOf(recs, 1, tomorrow).min).toBe(100);
  });
  it('grass ends today, oldest first', () => {
    const g = grassOf(recs, 1, now);
    expect(g).toHaveLength(7);
    expect(g[6]).toBe(levelOf(100));
    expect(g[5]).toBe(levelOf(55));
    expect(g[0]).toBe(0);
  });
  it('streak counts consecutive days', () => {
    expect(streakOf(recs, [], now)).toBe(2);
    expect(streakOf(recs, ['2026-10-19', '2026-10-18', '2026-10-17', '2026-10-16', '2026-10-15'], now)).toBe(3);
  });
  it('grass levels', () => {
    expect([0, 30, 90, 150, 240].map(levelOf)).toEqual([0, 1, 2, 3, 4]);
  });
});
