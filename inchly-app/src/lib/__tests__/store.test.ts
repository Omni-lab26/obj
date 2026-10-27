/// <reference types="jest" />
// AsyncStorage is mapped to its in-memory mock in package.json (jest.moduleNameMapper).
import { TODO_CAP, TODO_EXP } from '../exp';
import { addSubject, commitAll, commitHeld, commitRecord, doneOn, planNow, finishBlock, getState, INITIAL, MAX_TICKETS, migrate, removeSubject, rollDay, setState, splitAtMidnight, startFrom, startStudy, toggleBookmark, toggleTodo, updateSubject } from '../../store';
import { AREA_SHADES, OTHER_COLORS, subj } from '../../data';
import { backdropOf, DEFAULT_DESIGN } from '../../design';
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
    // at noon, so the 25 minutes don't reach back past midnight (they'd be split between two days)
    jest.useFakeTimers({ now: new Date(2026, 9, 21, 12), doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    reset({ running: true, base: 25 * 60, startedAt: Date.now() });
    expect(commitRecord()).toEqual({ min: 25, ticket: false, exp: 25, levelUp: null });
    const s = getState();
    expect(s.sessions.at(-1)?.date).toBe(dateKey());
    expect(s.running).toBe(false);
    expect(s.todayMin).toBe(25);
    jest.useRealTimers();
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

describe('ToDo EXP', () => {
  const todos = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, s: 'en', t: `todo ${i}`, d: false }));
  it('finishing pays, un-finishing today takes it back', () => {
    reset({ todos: todos(1), todoLog: [] });
    expect(toggleTodo('t0')).toBe(TODO_EXP);
    expect(getState().todoLog).toEqual([{ id: 't0', date: dateKey() }]);
    expect(toggleTodo('t0')).toBe(0);
    expect(getState().todoLog).toEqual([]);
  });
  it('stops paying past the daily cap, and the log outlives the cleared list', () => {
    reset({ todos: todos(TODO_CAP + 1), todoLog: [], lastDay: dateKey() });
    const paid = getState().todos.map((x) => toggleTodo(x.id));
    expect(paid.at(-1)).toBe(0);
    expect(paid.filter(Boolean)).toHaveLength(TODO_CAP);
    rollDay(new Date(Date.now() + 86_400_000));
    expect(getState().todos).toEqual([]);
    expect(getState().todoLog).toHaveLength(TODO_CAP + 1);
  });
  it('a record that finishes its ToDo counts it', () => {
    reset({ running: true, base: 10 * 60, startedAt: Date.now(), todos: todos(1), todoLog: [] });
    expect(commitRecord({ todoId: 't0' }).exp).toBe(10 + TODO_EXP);
  });
});

describe('subjects', () => {
  it("adds one in its 教科's next shade, fixed; subj() sees it", () => {
    reset();
    const id = addSubject({ name: '数IA', area: 'ma', c: '#EC4899' });
    const x = subj(id);
    expect(x.name).toBe('数IA');
    // 数学 has the first orange: 数IA takes the next, whatever was asked for
    expect(x.c).toBe(AREA_SHADES.ma[1]);
    updateSubject(id, { name: '数学IA', c: '#EC4899' });
    expect(subj(id).name).toBe('数学IA');
    expect(subj(id).c).toBe(AREA_SHADES.ma[1]);
    // moved to another 教科, it takes that one's shade
    updateSubject(id, { area: 'soc' });
    expect(AREA_SHADES.soc).toContain(subj(id).c);
    // only その他 has a color you pick (from hues no 教科 uses)
    const o = addSubject({ name: '検定', area: 'other', c: OTHER_COLORS[2] });
    expect(subj(o).c).toBe(OTHER_COLORS[2]);
    updateSubject(o, { c: OTHER_COLORS[4] });
    expect(subj(o).c).toBe(OTHER_COLORS[4]);
  });
  it("puts an older save's subjects on their 教科's colors", () => {
    const out = migrate({ v: 3, subjects: [
      { id: 'ph', name: '物理', c: '#30B0C7', area: 'sci' }, { id: 'ch', name: '化学', c: '#FF2D55', area: 'sci' },
      { id: 'x', name: '検定', c: '#EC4899', area: 'other' },
    ] }).subjects!;
    expect(out.map((x) => x.c)).toEqual(['#30B0C7', AREA_SHADES.sci[1], '#EC4899']);
  });
  it('removes an unused subject, hides one with records, keeps at least one', () => {
    reset({ sessions: [{ id: 'r', s: 'en', min: 30, date: dateKey(), at: '20:00' }], subj: 'en' });
    expect(removeSubject('ma')).toBe('removed');
    expect(getState().subjects.some((x) => x.id === 'ma')).toBe(false);
    expect(removeSubject('en')).toBe('hidden');
    expect(subj('en').name).toBe('英語'); // old days keep their name
    expect(getState().subj).not.toBe('en');
    reset({ subjects: [{ id: 'en', name: '英語', c: '#5856D6', area: 'en' }] });
    expect(removeSubject('en')).toBe('last');
  });
  it('fills in chart settings added later', () => {
    const chart = migrate({ v: 3, chart: { range: 'week', kind: 'bar', palette: 'blue' } }).chart!;
    expect(chart).toMatchObject({ range: 'week', detail: 'subject' });
    expect(chart).not.toHaveProperty('palette'); // the charts draw in the subjects' own colors
  });
});

describe('a session across midnight', () => {
  it('splits into the day before and the day it ended', () => {
    expect(splitAtMidnight(90, new Date(2026, 9, 22, 0, 30))).toEqual([
      { min: 60, date: '2026-10-21', at: '24:00' },
      { min: 30, date: '2026-10-22', at: '0:30' },
    ]);
    expect(splitAtMidnight(45, new Date(2026, 9, 22, 21, 0))).toEqual([{ min: 45, date: '2026-10-22', at: '21:00' }]);
    expect(splitAtMidnight(30, new Date(2026, 9, 22, 0, 0))).toEqual([{ min: 30, date: '2026-10-21', at: '24:00' }]);
  });
  it('records both parts, so the day before keeps its streak', () => {
    reset({ running: true, paused: true, base: 90 * 60, subj: 'ma', lastDay: '2026-10-22' });
    commitRecord({ now: new Date(2026, 9, 22, 0, 30) });
    expect(getState().sessions.map((x) => [x.date, x.min])).toEqual([['2026-10-21', 60], ['2026-10-22', 30]]);
  });
});

describe('bookmarks', () => {
  it('saves newest first and takes one out again', () => {
    reset();
    expect(toggleBookmark('p1')).toBe(true);
    expect(toggleBookmark('p4')).toBe(true);
    expect(getState().bookmarks).toEqual(['p4', 'p1']);
    expect(toggleBookmark('p1')).toBe(false);
    expect(getState().bookmarks).toEqual(['p4']);
  });
});

describe('the plan a session measures against', () => {
  it('comes from a timetable block, is none when just starting, and clears on record', () => {
    reset();
    startFrom({ s: 'ma', min: 45 });
    expect(getState().planMin).toBe(45);
    commitRecord({ min: 10 });
    expect(getState().planMin).toBeNull();
    startStudy('en');
    expect(getState().planMin).toBeNull();
  });
});

describe('finishing a plan', () => {
  it('ending a session started from a plan finishes that plan on the day it started', () => {
    reset();
    startFrom({ s: 'ma', min: 60, blockId: 'b3' });
    expect(getState().planBlock).toBe('b3');
    const now = new Date(2026, 9, 27, 0, 20); // 40 minutes, from 23:40 the day before
    commitRecord({ min: 40, now });
    expect(getState().planBlock).toBeNull();
    expect(doneOn(getState(), new Date(2026, 9, 26))).toEqual(new Set(['b3']));
    expect(doneOn(getState(), now).size).toBe(0);
  });
  it('just measuring finishes nothing', () => {
    reset();
    startStudy('en');
    commitRecord({ min: 10 });
    expect(getState().doneBlocks).toEqual([]);
  });
  it('can finish a plan for today without recording, once, and keeps only a week', () => {
    const today = new Date(2026, 9, 26, 12);
    reset({ doneBlocks: [{ id: 'old', date: addDays(dateKey(today), -9) }] });
    finishBlock('b1', today);
    finishBlock('b1', today);
    expect(getState().doneBlocks).toEqual([{ id: 'b1', date: '2026-10-26' }]);
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
  it("turns the timer's background into the 背景 behind every page", () => {
    const design = { theme: 'standard', bg: 'warm' };
    expect(migrate({ v: 3, design, studyBg: 'sea' }).design?.backdrop).toBe('sea');
    // 科目の色 was the timer without a background
    expect(migrate({ v: 3, design, studyBg: 'color' }).design?.backdrop).toBe('none');
    expect(migrate({ v: 3, design }).design).toMatchObject({ backdrop: 'pond', bg: 'warm' });
    expect('studyBg' in migrate({ v: 3, design, studyBg: 'walk' })).toBe(false);
    // a choice made since stays
    expect(migrate({ v: 3, design: { ...design, backdrop: 'walk' }, studyBg: 'pond' }).design?.backdrop).toBe('walk');
  });
  it('gives older saves the usual frost on the 背景, and keeps a choice', () => {
    expect(migrate({ v: 3, design: { theme: 'standard' } }).design?.frost).toBe(2);
    expect(migrate({ v: 3, design: { theme: 'standard', frost: 0 } }).design?.frost).toBe(0);
    expect(migrate({ v: 3, design: { theme: 'standard', frost: 9 } }).design?.frost).toBe(2);
    expect(migrate({ v: 3, design: { theme: 'standard' } }).design?.cardFill).toBe(1);
    expect(migrate({ v: 3, design: { theme: 'standard', cardFill: 3 } }).design?.cardFill).toBe(3);
  });
});

describe('背景', () => {
  it('goes with the standard theme only', () => {
    expect(backdropOf({ ...DEFAULT_DESIGN, backdrop: 'sea' })).toBe('sea');
    expect(backdropOf({ ...DEFAULT_DESIGN, theme: 'terminal', backdrop: 'sea' })).toBe('none');
  });
});

describe('going on to the next plan', () => {
  const t0 = new Date(2026, 9, 26, 19, 0).getTime();
  it('holds the session under way, and picks it up again when its plan starts again', () => {
    reset();
    startFrom({ s: 'ma', blockId: 'c' }, t0);
    startFrom({ s: 'ph', blockId: 'd' }, t0 + 42 * 60_000);
    expect(getState().held).toEqual([expect.objectContaining({ s: 'ma', sec: 42 * 60, blockId: 'c' })]);
    expect(getState().planBlock).toBe('d');
    startFrom({ s: 'ma', blockId: 'c' }, t0 + 50 * 60_000);
    expect(getState().held).toEqual([expect.objectContaining({ s: 'ph', sec: 8 * 60, blockId: 'd' })]);
    expect(getState().base).toBe(42 * 60);
  });
  it('just switches in the first minute', () => {
    reset();
    startFrom({ s: 'ma', blockId: 'c' }, t0);
    startFrom({ s: 'ph', blockId: 'd' }, t0 + 30_000);
    expect(getState().held).toEqual([]);
  });
  it('records a held session on its own, and finishes its plan', () => {
    reset();
    startFrom({ s: 'ma', blockId: 'c' }, t0);
    startFrom({ s: 'ph', blockId: 'd' }, t0 + 42 * 60_000);
    const id = getState().held[0].id;
    expect(commitHeld(id, { note: '例題41〜50' })?.min).toBe(42);
    expect(getState().held).toEqual([]);
    expect(getState().running).toBe(true);
    expect(getState().sessions.slice(-1)[0]).toEqual(expect.objectContaining({ s: 'ma', min: 42, note: '例題41〜50' }));
    expect(doneOn(getState(), new Date(t0)).has('c')).toBe(true);
  });
  it('records everything at the end', () => {
    reset();
    startFrom({ s: 'ma', blockId: 'c' }, t0);
    startFrom({ s: 'ph', blockId: 'd' }, t0 + 42 * 60_000);
    const r = commitAll(new Date(t0 + 72 * 60_000));
    expect(r?.min).toBe(72);
    expect(getState().running).toBe(false);
    expect(getState().held).toEqual([]);
    expect(getState().sessions.slice(-2).map((x) => [x.s, x.min])).toEqual([['ma', 42], ['ph', 30]]);
    expect(doneOn(getState(), new Date(t0))).toEqual(new Set(['c', 'd']));
  });
});

describe('studying something not in the timetable', () => {
  it('puts it in today\'s timetable from now (to the 5 minutes), running until the next plan', () => {
    reset();
    const b = planNow('ch', new Date(2026, 9, 26, 11, 13));
    expect(b).toEqual(expect.objectContaining({ s: 'ch', start: '11:10', min: 0, days: [], date: '2026-10-26' }));
    expect(getState().timetable).toContainEqual(b);
  });
});
