/// <reference types="jest" />
import { deadlineReminders, goalReminderAt, nextTimeAt, nextTimeLabel } from '../reminders';

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
