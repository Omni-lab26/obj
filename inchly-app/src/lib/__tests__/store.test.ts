/// <reference types="jest" />
// AsyncStorage is mapped to its in-memory mock in package.json (jest.moduleNameMapper).
import { buy, claimMission, commitRecord, getState, INITIAL, levelOf, migrate, missionsOf, rollDay, setState } from '../../store';
import { dateKey } from '../time';

const reset = (patch = {}) => setState({ ...INITIAL, ...patch });

describe('a new day', () => {
  it('clears finished ToDos and carries the rest over', () => {
    reset({
      lastDay: '2026-10-20',
      todos: [
        { id: 'a', s: 'en', t: 'done', d: true },
        { id: 'b', s: 'ma', t: 'open', d: false, carried: 1 },
      ],
    });
    rollDay(new Date(2026, 9, 21, 7));
    expect(getState().todos).toEqual([{ id: 'b', s: 'ma', t: 'open', d: false, carried: 2 }]);
    expect(getState().lastDay).toBe('2026-10-21');
  });
  it('covers a missed day with a rest ticket when the run was alive', () => {
    reset({
      lastDay: '2026-10-19',
      restTickets: 1,
      sessions: [{ id: 'x', s: 'en', min: 30, date: '2026-10-19', at: '20:00' }],
    });
    rollDay(new Date(2026, 9, 21, 7)); // 10-20 was missed
    expect(getState().restDays).toEqual(['2026-10-20']);
    expect(getState().restTickets).toBe(0);
  });
  it('does nothing on the same day', () => {
    reset({ lastDay: dateKey(), todos: [{ id: 'a', s: 'en', t: 'done', d: true }] });
    rollDay();
    expect(getState().todos).toHaveLength(1);
  });
});

describe('recording', () => {
  it('saves on today’s date and pays a coin a minute', () => {
    reset({ running: true, base: 25 * 60, startedAt: Date.now(), coins: 10 });
    const r = commitRecord();
    expect(r).toEqual({ min: 25, coins: 25 });
    const s = getState();
    expect(s.sessions.at(-1)?.date).toBe(dateKey());
    expect(s.coins).toBe(35);
    expect(s.running).toBe(false);
    expect(s.todayMin).toBe(25);
  });
  it('a boost doubles the coins and is used up', () => {
    reset({ running: true, base: 10 * 60, startedAt: Date.now(), boost: 1 });
    expect(commitRecord().coins).toBe(20);
    expect(getState().boost).toBe(0);
  });
});

describe('missions and the store', () => {
  it('a mission pays once, only when complete', () => {
    reset({ coins: 0, sessions: [{ id: 'x', s: 'en', min: 30, date: dateKey(), at: '20:00' }] });
    expect(missionsOf(getState()).find((m) => m.id === 'm30')?.cur).toBe(30);
    expect(claimMission('m30')).toBe(30);
    expect(claimMission('m30')).toBe(0);
    expect(claimMission('todo2')).toBe(0);
    expect(getState().coins).toBe(30);
  });
  it('buying needs the coins; a rest ticket adds a ticket', () => {
    reset({ coins: 150, restTickets: 0 });
    expect(buy('rest')).toBe(false);
    setState({ coins: 450 });
    expect(buy('rest')).toBe(true);
    expect(getState()).toMatchObject({ coins: 250, restTickets: 1 });
  });
  it('one-off items can be bought once', () => {
    reset({ coins: 2000 });
    expect(buy('card-aurora')).toBe(true);
    expect(buy('card-aurora')).toBe(false);
  });
  it('levels grow with hours', () => {
    expect(levelOf(0).lv).toBe(1);
    expect(levelOf(662.5).lv).toBe(23);
    expect(levelOf(691.2).lv).toBe(24);
  });
});

describe('migrate', () => {
  it('dates v2 records counted back from today', () => {
    const now = new Date(2026, 9, 21, 9);
    const out = migrate({ sessions: [{ id: 'a', s: 'en', min: 30, day: 0, at: '7:00' }, { id: 'b', s: 'ma', min: 20, day: 1, at: '22:00' }], helpful: [1, 'p2'], syncedAt: 5 }, now);
    expect(out.sessions).toEqual([
      { id: 'a', s: 'en', min: 30, date: '2026-10-21', at: '7:00' },
      { id: 'b', s: 'ma', min: 20, date: '2026-10-20', at: '22:00' },
    ]);
    expect(out.helpful).toEqual(['p2']);
    expect('syncedAt' in out).toBe(false);
  });
  it('leaves v3 saves as they are', () => {
    const out = migrate({ v: 3, sessions: [{ id: 'a', s: 'en', min: 30, date: '2026-10-21', at: '7:00' }] });
    expect(out.sessions).toHaveLength(1);
    expect('v' in out).toBe(false);
  });
});
