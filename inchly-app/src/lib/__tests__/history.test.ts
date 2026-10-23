/// <reference types="jest" />
import { dayOf, grassOf, hourlyOf, levelOf, minutesIn, regroup, streakOf, todayMinutes, weekOf, withLive } from '../history';

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
    expect(dayOf(recs, 0, now).parts).toEqual({ en: 60, ma: 40 });
    expect(dayOf(recs, 1, now)).toEqual({ min: 55, parts: { ph: 55 } });
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

  it('spreads a record over the hours it covered', () => {
    // ended 7:10 after 60 min: 6:10–7:10 → 50 in the 6 o'clock hour, 10 in 7
    const h = hourlyOf([{ s: 'en', min: 60, date: '2026-10-21', at: '7:10' }], '2026-10-21');
    expect(h.min[6]).toBe(50);
    expect(h.min[7]).toBe(10);
    expect(h.parts[6]).toEqual({ en: 50 });
    expect(h.min.reduce((a, b) => a + b, 0)).toBe(60);
  });
  it('puts the part before midnight on the day before', () => {
    const r = [{ s: 'ma', min: 50, date: '2026-10-22', at: '0:20' }];
    expect(hourlyOf(r, '2026-10-22').min[0]).toBe(20);
    expect(hourlyOf(r, '2026-10-21').min[23]).toBe(30);
    expect(hourlyOf(r, '2026-10-21').min.reduce((a, b) => a + b, 0)).toBe(30);
  });
  it('skips records without a clock time', () => {
    expect(hourlyOf([{ s: 'en', min: 30, date: '2026-10-21' }], '2026-10-21').min.every((m) => m === 0)).toBe(true);
  });
  it('adds a running timer without touching the original', () => {
    const base = hourlyOf([], '2026-10-21');
    const live = withLive(base, new Date(2026, 9, 21, 9, 40).getTime(), new Date(2026, 9, 21, 10, 5).getTime(), '2026-10-21', 'ph');
    expect(live.min[9]).toBe(20);
    expect(live.min[10]).toBe(5);
    expect(live.parts[9].ph).toBe(20);
    expect(base.min[9]).toBe(0);
  });
  it('the week runs Monday to Sunday around today', () => {
    const w = weekOf(recs, now); // 2026-10-21 is a Wednesday
    expect(w.map((d) => d.date)).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
    expect(w.map((d) => d.min)).toEqual([0, 55, 100, 0, 0, 0, 0]);
  });
  it('adds subjects up into their 教科', () => {
    const area: Record<string, string> = { ph: 'sci', ch: 'sci', en: 'en', sj1: 'ma' };
    expect(regroup({ ph: 30, ch: 20, en: 10, sj1: 5 }, (id) => area[id])).toEqual({ sci: 50, en: 10, ma: 5 });
  });
});
