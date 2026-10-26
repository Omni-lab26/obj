/// <reference types="jest" />
import { deadlineReminders, goalReminderAt, nextTimeAt, nextTimeLabel, timetableReminders } from '../reminders';

const now = new Date(2026, 9, 21, 19, 30); // Wednesday 21 Oct, 19:30
const start = new Date(2026, 9, 21, 18, 50);

describe('nextTimeAt', () => {
  it('tomorrow keeps the start time', () => {
    expect(nextTimeAt('tomorrow', start, now)).toEqual(new Date(2026, 9, 22, 18, 50));
    expect(nextTimeLabel('tomorrow', start, now)).toBe('明日 18:50');
  });
  it('tonight is 22:00, or nothing once it has passed', () => {
    expect(nextTimeAt('tonight', start, now)).toEqual(new Date(2026, 9, 21, 22, 0));
    expect(nextTimeAt('tonight', start, new Date(2026, 9, 21, 22, 30))).toBeNull();
  });
  it('the weekend is the coming Saturday at 9:00', () => {
    expect(nextTimeAt('weekend', start, now)).toEqual(new Date(2026, 9, 24, 9, 0));
    expect(nextTimeAt('weekend', start, new Date(2026, 9, 24, 10, 0))).toEqual(new Date(2026, 9, 31, 9, 0));
  });
  it('none is none', () => {
    expect(nextTimeAt('none', start, now)).toBeNull();
  });
});

describe('deadlineReminders', () => {
  it('three days before and the day before, only ahead of now', () => {
    const r = deadlineReminders([{ id: 'd1', t: '模試', mo: 11, day: 8 }, { id: 'd2', t: '申込', mo: 10, day: 23 }], now);
    expect(r.map((x) => [x.id, x.at.getMonth() + 1, x.at.getDate(), x.at.getHours()])).toEqual([
      ['dl-d1-3', 11, 5, 9],
      ['dl-d1-1', 11, 7, 20],
      ['dl-d2-1', 10, 22, 20],
    ]);
  });
});

describe('goalReminderAt', () => {
  it('fires when the total comes within 15 minutes of the goal', () => {
    // 120 recorded + 10 running = 130; goal 180 → remind at 165, 35 minutes from now
    expect(goalReminderAt(120, 600, 180, now)).toEqual(new Date(now.getTime() + 35 * 60_000));
  });
  it('nothing if already that close', () => {
    expect(goalReminderAt(170, 0, 180, now)).toBeNull();
  });
});

describe('timetable reminders', () => {
  // 2026-10-21 is a Wednesday
  const now = new Date(2026, 9, 21, 18, 30);
  const blocks = [
    { id: 'w', s: 'ma', start: '19:00', min: 60, days: [2], t: '青チャート' }, // Wednesdays
    { id: 'm', s: 'en', start: '7:00', min: 30, days: [0, 1, 2, 3, 4] }, // weekday mornings
    { id: 'd', s: 'ch', start: '15:00', min: 90, days: [], date: '2026-10-24' }, // one Saturday only
  ];
  const name = (s: string) => ({ ma: '数学', en: '英語', ch: '化学' })[s] ?? s;
  it('nudges at each start in the coming week, never in the past', () => {
    const r = timetableReminders(blocks, name, now);
    expect(r[0]).toMatchObject({ id: 'tt-w-20261021', title: '数学の時間です' });
    expect(r[0].at).toEqual(new Date(2026, 9, 21, 19, 0));
    expect(r[0].body).toContain('19:00から · 青チャート');
    expect(r[0].body).toContain('ストップするまでいまの勉強はそのまま続きます'); // studying something else goes on
    expect(r.some((x) => x.id === 'tt-m-20261021')).toBe(false); // this morning has passed
    expect(r.filter((x) => x.id.startsWith('tt-m-')).length).toBe(4); // Thu, Fri, Mon, Tue
    expect(r.filter((x) => x.id.startsWith('tt-d-')).map((x) => x.at)).toEqual([new Date(2026, 9, 24, 15, 0)]);
    expect(r.every((x, i) => i === 0 || x.at >= r[i - 1].at)).toBe(true);
  });
  it('keeps to the limit, earliest first', () => {
    expect(timetableReminders(blocks, name, now, 7, 2).map((x) => x.id)).toEqual(['tt-w-20261021', 'tt-m-20261022']);
  });
});

describe('timetable reminders for a plan with no time', () => {
  it('sends none: there is no moment to remind', () => {
    const r = timetableReminders([{ id: 'f', s: 'en', min: 0, days: [], date: '2026-10-22' }, { id: 'b', s: 'ma', start: '19:00', min: 60, days: [], date: '2026-10-22' }], () => '数学', now);
    expect(r.map((x) => x.id)).toEqual(['tt-b-20261022']);
  });
});
