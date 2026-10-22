/// <reference types="jest" />
import { badgesOf, statsOf } from '../badges';
import { eventsOf } from '../events';

const now = new Date(2026, 9, 21, 12); // Wednesday
const s = (date: string, sub: string, min: number, at = '20:00') => ({ date, s: sub, min, at });
const base = { restDays: [] as string[], goalMin: 180, todosDone: 0, following: 0, posts: 0, helpfulReceived: 0, groupsJoined: 0, now };

describe('badges', () => {
  it('nothing earned with no records', () => {
    const b = badgesOf({ ...base, sessions: [] });
    expect(b.every((x) => !x.got)).toBe(true);
  });
  it('earns from real records and shows progress toward the rest', () => {
    const sessions = [s('2026-10-19', 'en', 60, '6:30'), s('2026-10-20', 'ma', 200), s('2026-10-21', 'en', 30)];
    const b = Object.fromEntries(badgesOf({ ...base, sessions }).map((x) => [x.id, x]));
    expect(b.first.got).toBe(true);
    expect(b.h1.got).toBe(true);
    expect(b.s3.got).toBe(true);
    expect(b.s7).toMatchObject({ got: false, cur: 3, tot: 7 });
    expect(b.d3.got).toBe(true); // 200 minutes in one day
    expect(b.early10.cur).toBe(1); // started 5:30
  });
  it('a rest ticket bridges the longest run', () => {
    const sessions = [s('2026-10-17', 'en', 30), s('2026-10-18', 'en', 30), s('2026-10-20', 'en', 30), s('2026-10-21', 'en', 30)];
    expect(statsOf({ ...base, sessions }).bestStreak).toBe(2);
    expect(statsOf({ ...base, sessions, restDays: ['2026-10-19'] }).bestStreak).toBe(4);
  });
});

describe('weekly events', () => {
  it('counts only this week (Monday to Sunday)', () => {
    const recs = [s('2026-10-18', 'en', 600, '9:00'), s('2026-10-19', 'en', 30, '6:40'), s('2026-10-21', 'ma', 30, '6:50')];
    const e = Object.fromEntries(eventsOf(recs, now).map((x) => [x.id, x]));
    expect(e.weekend10.cur).toBe(0); // last Sunday doesn't count
    expect(e.morning5.cur).toBe(2);
    expect(e.every7.cur).toBe(2);
    expect(e.weekend10.ends).toBe('2026-10-25');
    expect(e.weekend10.key).toBe('weekend10:2026-10-19');
  });
});
