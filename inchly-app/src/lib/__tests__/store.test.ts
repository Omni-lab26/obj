/// <reference types="jest" />
// AsyncStorage is mapped to its in-memory mock in package.json (jest.moduleNameMapper).
import { commitRecord, getState, INITIAL, MAX_TICKETS, migrate, rollDay, setState } from '../../store';
import { addDays, dateKey } from '../time';

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
  // the six days before today, each with a record
  const week = () => Array.from({ length: 6 }, (_, i) => ({ id: `w${i}`, s: 'en', min: 30, date: addDays(dateKey(), -(i + 1)), at: '20:00' }));
  it('saves on today’s date and stops the clock', () => {
    reset({ running: true, base: 25 * 60, startedAt: Date.now() });
    expect(commitRecord()).toEqual({ min: 25, ticket: false, exp: 25, levelUp: null });
    const s = getState();
    expect(s.sessions.at(-1)?.date).toBe(dateKey());
    expect(s.running).toBe(false);
    expect(s.todayMin).toBe(25);
  });
  it('a record that crosses a level says so', () => {
    reset({ running: true, base: 80 * 60, startedAt: Date.now() }); // 0 → 80 EXP: Lv.1 → Lv.2 at 72
    expect(commitRecord()).toMatchObject({ exp: 80, levelUp: 2 });
  });
  it('the 7th day in a row earns a rest ticket', () => {
    reset({ running: true, base: 10 * 60, startedAt: Date.now(), restTickets: 0, sessions: week() });
    expect(commitRecord().ticket).toBe(true);
    expect(getState().restTickets).toBe(1);
  });
  it('only the day’s first record counts, and tickets stop at the cap', () => {
    reset({ running: true, base: 10 * 60, startedAt: Date.now(), restTickets: 0, sessions: [...week(), { id: 't', s: 'ma', min: 5, date: dateKey(), at: '6:00' }] });
    expect(commitRecord().ticket).toBe(false);
    reset({ running: true, base: 10 * 60, startedAt: Date.now(), restTickets: MAX_TICKETS, sessions: week() });
    expect(commitRecord().ticket).toBe(false);
    expect(getState().restTickets).toBe(MAX_TICKETS);
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
  it('drops the coins and store that older saves kept', () => {
    const out = migrate({ v: 3, coins: 1240, boost: 1, owned: ['x'], claimed: { day: '', ids: [] }, restTickets: 2 });
    expect(out).toEqual({ restTickets: 2 });
  });
});
