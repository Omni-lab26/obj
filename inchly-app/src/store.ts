import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { AreaId, demoHistory, fixColors, FREE, GROUPS, Group, OTHER_COLORS, Post, POSTS, setSubjects, shadeFor, SUBJ, subj, Subject } from './data';
import { cancelReminder, configureNotifications, notificationsAllowed, replaceReminders, scheduleReminder } from './lib/notify';
import { deadlineReminders, goalReminderAt, timetableReminders } from './lib/reminders';
import { byDay, streakOf, todayMinutes } from './lib/history';
import { Block } from './lib/timetable';
import { applyDesign, BACKDROPS, DEFAULT_DESIGN, Design, STREAKS, themeId } from './design';
import { Done, expOf, levelOf, TODO_CAP, TODO_EXP } from './lib/exp';
import { celebrate } from './moments';
import { addDays, ageThisYear, dateKey, daysBetween } from './lib/time';

// One small global store, saved on the device (see persist below). Updates
// are immutable so selectors can return existing references without loops.
// A record is dated ('YYYY-MM-DD'); "today" always comes from the device clock.

/** One study session, on the calendar day it was recorded. */
/** what: what it was about — the plan's memo (else its やること) when it came from a plan; note: the memo written when recording. */
/** block: the timetable plan it came from (so 自習 sorted later can change its plan too). kept: 自習 left as 自習 on purpose (several subjects at once, or not worth writing) — not waiting to be sorted. */
export type Session = { id: string; s: string; min: number; date: string; at: string; note?: string; what?: string; manual?: boolean; block?: string; kept?: boolean };
export type Todo = { id: string; s: string; t: string; d: boolean; carried?: number; dl?: string; doneOn?: string }; // carried: days it has slid; dl: deadline id
/** A session stopped to go on to another plan, not recorded yet: its subject, time, when it stopped, and the plan it came from. */
export type Held = { id: string; s: string; sec: number; end: number; blockId?: string; planMin?: number };
/** A photo made into an icon (lib/planIcon), kept to use again; s: the subject it was picked with, which picking it brings along. */
export type MyIcon = { id: string; icon: string; s?: string };
export type Deadline = { id: string; t: string; mo: number; day: number; urgent?: boolean; note?: string };
export type Account = { name: string; handle: string; grade: string; birthYear: number; aim: string; via: 'apple' | 'mail' | 'demo' };
export type LiveScope = 'all' | 'followers' | 'none';
export type DmFrom = 'following' | 'groups' | 'all';
/** How home lists the friends studying now: by today's time, by name, or in your own order (handles). */
export type FriendSort = 'time' | 'name' | 'mine';
export type ExtraTab = 'events' | 'exams' | 'me';
export type ChartKind = 'bar' | 'stack' | 'line';
/** detail: one color per subject, or subjects added up by 教科. (The colors are the subjects' own, fixed: no palette to pick.) */
export type Chart = { range: 'day' | 'week'; kind: ChartKind; detail: 'subject' | 'area' };
/** How the timer counts: up from zero (what gets recorded), or down to a planned length. */
export type TimerMode = 'up' | 'goal';
/** How the timer draws the time: big digits, a clock with hands, or flip cards. */
export type ClockFace = 'digital' | 'analog' | 'flip';
export type { Block };

export type State = {
  account: Account | null; // null until onboarding is done
  running: boolean;
  paused: boolean;
  startedAt: number; // ms timestamp of the last resume
  base: number; // seconds accumulated before startedAt
  subj: string;
  sessions: Session[];
  todayMin: number; // derived from sessions, kept for readers
  goalMin: number;
  targetMin: number; // planned length of this focus session
  planMin: number | null; // started from the timetable: minutes until the next plan starts; null = just measuring
  planNext: { s: string; at: string } | null; // that next plan: its subject and start
  planBlock: string | null; // the timetable block this session was started from (ending it finishes the plan)
  doneBlocks: { id: string; date: string }[]; // plans finished on a day: their cards leave that day's timer
  myIcons: MyIcon[]; // photos made into icons on the plan form, kept to pick again (newest first)
  held: Held[]; // sessions stopped to go on to the next plan, waiting to be recorded (one by one, or all at the end)
  dayOrder: { date: string; ids: string[] } | null; // the order you put the day's plans in (the timer's cards)
  todos: Todo[];
  deadlines: Deadline[];
  following: string[];
  friendSort: FriendSort;
  friendOrder: string[];
  friendHidden: string[]; // handles swiped off home's friends list
  posts: Post[];
  helpful: string[]; // post ids
  bookmarks: string[]; // post ids you saved, newest first
  roomFilters: string[]; // extra 志望校 chips in the study room
  notifRead: number[];
  notifGone: number[];
  groups: Group[];
  joinedFeed: string[];
  liveScope: LiveScope;
  showLive: boolean; // derived: liveScope !== 'none'
  showRank: boolean;
  dmFrom: DmFrom;
  notify: { peers: boolean; deadlines: boolean; goal: boolean; timetable?: boolean }; // timetable: off only when set false (older saves lack it)
  blocked: string[]; // names
  savedAt: number; // ms, last write to this device
  lastDay: string; // the last calendar day the app saw, for rolling over at midnight
  // the game layer
  restTickets: number;
  restDays: string[]; // days a rest ticket covered
  extraTab: ExtraTab | null; // what the right-hand tab became; null = not chosen yet
  chart: Chart; // how home draws the study-time graph
  subjects: Subject[]; // what you study, in your order; hidden ones stay for old records
  design: Design; // the look you picked on the デザイン page
  timetable: Block[]; // study blocks planned by the clock, repeating weekly
  timerMode: TimerMode;
  clockFace: ClockFace;
  studyTodo: string | null; // the ToDo this session works on (picked on the record page)
  todoLog: Done[]; // every ToDo finished and when, kept after the list is cleared (for EXP)
  tourDone: boolean; // the first-run 使い方 (ui/Tour) was seen or skipped
};

let seq = 100;
export const newId = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;
const clockOf = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

/**
 * A session that ended at `end` after `min` minutes, as the days it fell on:
 * past midnight, the part before it goes to the day before (so that day keeps
 * its time and its streak), the rest to the day it ended. Earliest first.
 */
export function splitAtMidnight(min: number, end: Date): { min: number; date: string; at: string }[] {
  const out: { min: number; date: string; at: string }[] = [];
  const stop = end.getTime();
  let a = stop - min * 60_000;
  while (a < stop) {
    const day = new Date(a);
    const midnight = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime();
    const b = Math.min(stop, midnight);
    const m = Math.round((b - a) / 60_000);
    if (m > 0) out.push({ min: m, date: dateKey(day), at: b === midnight ? '24:00' : clockOf(new Date(b)) });
    a = b;
  }
  // rounding never loses or adds a minute
  const rest = out.slice(0, -1).reduce((n, x) => n + x.min, 0);
  if (out.length) out[out.length - 1].min = Math.max(1, min - rest);
  return out.length ? out : [{ min, date: dateKey(end), at: clockOf(end) }];
}

/** A fresh account: nothing recorded, nothing planned. */
export const INITIAL: State = {
  account: null,
  running: false,
  paused: false,
  startedAt: Date.now(),
  base: 0,
  subj: 'en',
  sessions: [],
  todayMin: 0,
  goalMin: 180,
  targetMin: 60,
  planMin: null,
  planNext: null,
  planBlock: null,
  doneBlocks: [],
  myIcons: [],
  held: [],
  dayOrder: null,
  todos: [],
  deadlines: [],
  following: [],
  friendSort: 'time',
  friendOrder: [],
  friendHidden: [],
  posts: POSTS.filter((p) => !p.mine),
  helpful: [],
  bookmarks: [],
  roomFilters: [],
  notifRead: [],
  notifGone: [],
  groups: GROUPS,
  joinedFeed: [],
  liveScope: 'all',
  showLive: true,
  showRank: true,
  dmFrom: 'groups',
  notify: { peers: true, deadlines: true, goal: true, timetable: true },
  blocked: [],
  savedAt: 0,
  lastDay: dateKey(),
  restTickets: 1, // one to start with, so a single missed day doesn't undo the first week
  restDays: [],
  extraTab: null,
  chart: { range: 'day', kind: 'stack', detail: 'subject' },
  subjects: SUBJ,
  design: DEFAULT_DESIGN,
  timetable: [],
  timerMode: 'up',
  clockFace: 'digital',
  studyTodo: null,
  todoLog: [],
  tourDone: false,
};

/** The sample account: a year of history, a plan, people it follows, a session under way. */
export function demoState(now: Date = new Date()): Partial<State> {
  const today = dateKey(now);
  const yesterday = addDays(today, -1);
  const past: Session[] = demoHistory(now).map((h, i) => ({ id: `h${i}`, s: h.s, min: h.min, date: addDays(today, -h.daysAgo), at: h.at, what: h.what }));
  const recent: Session[] = [
    { id: 's1', s: 'ja', min: 30, date: today, at: '6:30', note: '古文単語 61〜80' },
    { id: 's2', s: 'en', min: 60, date: today, at: '7:40', note: '長文読解 第3講' },
    { id: 's3', s: 'en', min: 35, date: today, at: '17:40', what: '長文読解' },
    { id: 's4', s: 'ma', min: 40, date: today, at: '19:00', note: '青チャート 例題38〜40' },
    { id: 's5', s: 'ph', min: 55, date: yesterday, at: '20:10', what: '相対性理論' },
    { id: 's6', s: 'ma', min: 33, date: yesterday, at: '22:05', what: 'ベクトル' },
  ];
  return {
    running: true, paused: false, startedAt: now.getTime(), base: 2350, subj: 'en', planMin: 60, targetMin: 60, planNext: { s: 'ma', at: '19:00' }, planBlock: 'b2', doneBlocks: [{ id: 'b1', date: today }],
    sessions: [...past, ...recent],
    todos: [
      { id: 't1', s: 'ph', t: '名問の森 15', d: false, carried: 2, dl: 'd1' },
      { id: 't2', s: 'ma', t: '青チャート 数III 例題41〜50', d: false, dl: 'd1' },
      { id: 't3', s: 'en', t: '長文読解 第3講（時間を測る）', d: true, dl: 'd1', doneOn: today },
      { id: 't4', s: 'ja', t: '古文単語 61〜80', d: true, dl: 'd2', doneOn: today },
      { id: 't5', s: 'ma', t: '復習キュー 4問', d: false },
    ],
    timetable: [
      { id: 'b1', s: 'ja', t: '古文単語', start: '6:30', min: 30, days: [0, 1, 2, 3, 4] },
      { id: 'b2', s: 'en', t: '長文読解', start: '17:00', min: 60, days: [0, 1, 2, 3, 4] },
      { id: 'b3', s: 'ma', t: '青チャート', start: '19:00', min: 60, days: [0, 1, 2, 3, 4] },
      { id: 'b4', s: 'ph', t: '名問の森', start: '21:00', min: 45, days: [0, 2, 4] },
      { id: 'b5', s: 'en', t: '過去問', start: '9:00', min: 120, days: [5, 6] },
      { id: 'b6', s: 'ma', t: '模試の復習', start: '13:00', min: 90, days: [5, 6] },
    ],
    deadlines: [
      { id: 'd1', t: '第4回 記述模試', mo: 11, day: 8, urgent: true },
      { id: 'd2', t: '共通テスト', mo: 1, day: 16 },
      { id: 'd3', t: '東大 二次試験', mo: 2, day: 25 },
    ],
    todoLog: [{ id: 't3', date: today }, { id: 't4', date: today }],
    following: ['mio.k', 'sora_06', 'kaito'],
    posts: POSTS,
    restTickets: 2,
    lastDay: today,
  };
}

let state: State = INITIAL;

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const derive = (s: State): State => {
  setSubjects(s.subjects); // so subj() anywhere sees renames and new subjects
  applyDesign(s.design); // so useT() everywhere follows the look you picked
  return { ...s, todayMin: todayMinutes(s.sessions), showLive: s.liveScope !== 'none' };
};

export const getState = () => state;
export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = derive({ ...state, ...p });
  listeners.forEach((l) => l());
  save();
}
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(state));
}

// ---------- timer ----------
export const elapsedOf = (s: State, now = Date.now()) =>
  Math.floor(s.base + (s.running && !s.paused ? (now - s.startedAt) / 1000 : 0));

/** Re-renders once per second while mounted. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
export function useElapsed() {
  useNow();
  const s = useStore((x) => x);
  return elapsedOf(s);
}

export function startStudy(id?: string) {
  const s = state;
  const next = id ?? s.subj;
  if (s.running && next === s.subj) {
    if (s.paused) setState({ paused: false, startedAt: Date.now() });
    return;
  }
  setState({ running: true, paused: false, startedAt: Date.now(), base: 0, subj: next, studyTodo: null, planMin: null, planNext: null, planBlock: null });
  if (!s.running) celebrate({ kind: 'start', subject: next });
}
/**
 * Start from something planned: a timetable block or a ToDo. The subject is
 * set from it, the block's length becomes the target, and a ToDo is carried
 * to the record page; a block is remembered, so ending the session finishes
 * that plan for the day. While already studying something else, that session
 * stops and waits to be recorded (held) — so going on to the next plan takes
 * one tap — unless it's under a minute old, when it just switches. A plan
 * that was held picks up its time again. Always starts (true).
 */
export function startFrom(x: { s: string; todoId?: string; min?: number; next?: { s: string; at: string }; blockId?: string }, now = Date.now()): boolean {
  const s = state;
  const same = s.running && (x.blockId ? x.blockId === s.planBlock : !s.planBlock && x.s === s.subj);
  const sec = s.running ? elapsedOf(s, now) : 0;
  let held = s.held;
  if (s.running && !same && sec >= 60) {
    held = [...held, { id: newId('k'), s: s.subj, sec, end: now, ...(s.planBlock ? { blockId: s.planBlock } : {}), ...(s.planMin ? { planMin: s.planMin } : {}) }];
  }
  // a plan held before goes on from where it stopped
  const back = x.blockId ? held.find((h) => h.blockId === x.blockId) : undefined;
  if (back) held = held.filter((h) => h !== back);
  setState({
    running: true, paused: false, startedAt: now, base: same ? sec : back?.sec ?? (s.running && sec < 60 && x.s === s.subj ? sec : 0),
    subj: x.s, studyTodo: x.todoId ?? null, planMin: x.min || null, planNext: x.min ? x.next ?? null : null, planBlock: x.blockId ?? null, ...(x.min ? { targetMin: x.min } : {}),
    held,
  });
  if (!s.running) celebrate({ kind: 'start', subject: x.s });
  return true;
}
/** Puts the day's plans in this order (the timer's cards). */
export function setDayOrder(ids: string[], now: Date = new Date()) {
  setState({ dayOrder: { date: dateKey(now), ids } });
}
export function setClockFace(f: ClockFace) {
  setState({ clockFace: f });
}
export function setTimerMode(m: TimerMode) {
  setState({ timerMode: m });
}
/**
 * Studying something the timetable doesn't have yet: it goes in as today's
 * plan, starting now (to the 5 minutes) and running until the next plan.
 * Returns that plan, to start it from.
 */
export function planNow(s: string, now: Date = new Date()): Block {
  const m = Math.floor((now.getHours() * 60 + now.getMinutes()) / 5) * 5;
  const b: Block = { id: newId('b'), s, start: `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`, min: 0, days: [], date: dateKey(now) };
  setState((st) => ({ timetable: [...st.timetable, b] }));
  return b;
}
/** Your own icons: a photo picked on the plan form is kept (with the subject it was picked with), newest first, a dozen at most. */
export const MAX_ICONS = 12;
export function keepIcon(icon: string, s?: string) {
  setState((st) => ({ myIcons: [{ id: newId('i'), icon, ...(s ? { s } : {}) }, ...st.myIcons.filter((x) => x.icon !== icon)].slice(0, MAX_ICONS) }));
}
export function dropIcon(id: string) {
  setState((st) => ({ myIcons: st.myIcons.filter((x) => x.id !== id) }));
}
export function saveBlock(b: Omit<Block, 'id'> & { id?: string }) {
  setState((s) => ({
    timetable: b.id ? s.timetable.map((x) => (x.id === b.id ? { ...x, ...b, id: x.id } : x)) : [...s.timetable, { ...b, id: newId('b') }],
  }));
}
export function removeBlock(id: string) {
  setState((s) => ({ timetable: s.timetable.filter((x) => x.id !== id), planBlock: s.planBlock === id ? null : s.planBlock }));
}
/** Finished on a day (a week of these is kept): the plan's card leaves that day's timer. */
const withDone = (list: State['doneBlocks'], id: string, date: string) =>
  [...list.filter((x) => x.date >= addDays(date, -7) && !(x.id === id && x.date === date)), { id, date }];
/** Finishes a plan for today without recording anything (its card goes). */
export function finishBlock(id: string, now: Date = new Date()) {
  setState((s) => ({ doneBlocks: withDone(s.doneBlocks, id, dateKey(now)) }));
}
/** The ids of the plans finished on that day. */
export const doneOn = (s: Pick<State, 'doneBlocks'>, d: Date = new Date()) => {
  const k = dateKey(d);
  return new Set(s.doneBlocks.filter((x) => x.date === k).map((x) => x.id));
};
export function togglePause() {
  const s = state;
  if (!s.running) return;
  if (s.paused) setState({ paused: false, startedAt: Date.now() });
  else setState({ paused: true, base: elapsedOf(s) });
}
export function adjustElapsed(deltaSec: number) {
  const s = state;
  const e = Math.max(0, elapsedOf(s) + deltaSec);
  setState({ base: e, startedAt: Date.now() });
}
export function setTarget(min: number) {
  // kept to the second, so a snapped ruler gives an exact remaining time
  setState({ targetMin: Math.max(1 / 60, Math.round(min * 60) / 60) });
}
export function setSubject(id: string) {
  setState({ subj: id });
}
export function setDesign(patch: Partial<Design>) {
  setState((s) => ({ design: { ...s.design, ...patch } }));
}
export function setChart(patch: Partial<Chart>) {
  setState((s) => ({ chart: { ...s.chart, ...patch } }));
}

// ---------- subjects ----------
/** Subjects you can pick (not hidden), in your order. */
export const useSubjects = () => {
  const list = useStore((s) => s.subjects);
  return useMemo(() => list.filter((x) => !x.hidden), [list]);
};
/**
 * Adds a subject. Its color is fixed (data.ts AREA_SHADES): its 教科's next
 * shade; only one in その他 takes the color given (else the first free one). Returns its id.
 */
export function addSubject(x: { name: string; area: AreaId; c?: string }): string {
  const s = state;
  const id = newId('sj');
  const c = x.area === 'other' && x.c && OTHER_COLORS.includes(x.c) ? x.c : shadeFor(x.area, s.subjects);
  setState({ subjects: [...s.subjects, { id, name: x.name.trim(), area: x.area, c }] });
  return id;
}
/** Renames, moves to another 教科, hides …; a subject's color changes only with its 教科 (its new 教科's next shade), or by choice in その他. */
export function updateSubject(id: string, patch: Partial<Omit<Subject, 'id'>>) {
  setState((s) => ({
    subjects: s.subjects.map((x) => {
      if (x.id !== id) return x;
      const next = { ...x, ...patch };
      const others = s.subjects.filter((y) => y.id !== id);
      if (next.area === 'other') next.c = patch.c && OTHER_COLORS.includes(patch.c) ? patch.c : x.area === 'other' ? x.c : shadeFor('other', others);
      else next.c = next.area === x.area ? x.c : shadeFor(next.area, others);
      return next;
    }),
  }));
}
/**
 * Removes a subject. One with records is hidden instead, so old days keep
 * their name and color. Never leaves you with no subject to pick.
 */
export function removeSubject(id: string): 'removed' | 'hidden' | 'last' {
  const s = state;
  if (s.subjects.filter((x) => !x.hidden && x.id !== id).length === 0) return 'last';
  const used = s.sessions.some((r) => r.s === id) || s.timetable.some((b) => b.s === id) || s.todos.some((t) => t.s === id);
  const fallback = s.subjects.find((x) => !x.hidden && x.id !== id)!.id;
  setState({
    subjects: used ? s.subjects.map((x) => (x.id === id ? { ...x, hidden: true } : x)) : s.subjects.filter((x) => x.id !== id),
    subj: s.subj === id ? fallback : s.subj,
  });
  return used ? 'hidden' : 'removed';
}
export function moveSubject(id: string, by: -1 | 1) {
  setState((s) => {
    const i = s.subjects.findIndex((x) => x.id === id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= s.subjects.length) return {};
    const list = [...s.subjects];
    [list[i], list[j]] = [list[j], list[i]];
    return { subjects: list };
  });
}

/** A rest ticket for every 7 days in a row, holding at most this many. */
export const MAX_TICKETS = 3;
/**
 * Ends the session and saves it on today's date. The chosen ToDo is marked
 * done. The day's first record that brings the run to a multiple of 7 days
 * earns a rest ticket. Returns the minutes, whether a ticket was earned, the
 * EXP it brought, and the new level if it went up.
 */
export type Recorded = { min: number; ticket: boolean; exp: number; levelUp: number | null };
/** s and what: given on the record page for 自習 (the subject and what it was), else the session's own. */
type Rec = { s: string; min: number; end: Date; note?: string; todoId?: string; blockId?: string; what?: string; kept?: boolean };
/** Saves these records (each split at midnight; a plan's is finished on the day it started), with what they earned; `rest` goes into the same update. */
function saveRecords(recs: Rec[], now: Date, rest: Partial<State>): Recorded {
  const s = state;
  const today = dateKey(now);
  let sessions = s.sessions, todos = s.todos, todoLog = s.todoLog, doneBlocks = s.doneBlocks, timetable = s.timetable;
  for (const r of recs) {
    const todo = todos.find((x) => x.id === r.todoId);
    const note = r.note ?? todo?.t;
    // what it was about: the plan's memo (else its やること), so a chart can show more than the subject
    const plan = r.blockId ? s.timetable.find((b) => b.id === r.blockId) : undefined;
    const what = r.what?.trim() || plan?.note?.trim() || plan?.t?.trim() || undefined;
    // 自習's plan becomes what it turned out to be: its subject, and what was studied
    if (plan && plan.s === FREE && r.s !== FREE) timetable = timetable.map((b) => (b.id === plan.id ? { ...b, s: r.s, ...(what ? { t: what } : {}) } : b));
    sessions = [...sessions, ...splitAtMidnight(r.min, r.end).map((x) => ({ id: newId('s'), s: r.s, note, ...(what ? { what } : {}), ...(r.blockId ? { block: r.blockId } : {}), ...(r.kept ? { kept: true } : {}), ...x }))];
    if (todo) {
      if (!todo.d) todoLog = [...todoLog, { id: todo.id, date: today }];
      todos = todos.map((x) => (x.id === todo.id ? { ...x, d: true, doneOn: today } : x));
    }
    if (r.blockId) doneBlocks = withDone(doneBlocks, r.blockId, dateKey(new Date(r.end.getTime() - r.min * 60_000)));
  }
  const run = streakOf(sessions, s.restDays, now);
  const ticket = !byDay(s.sessions).has(today) && run > 0 && run % 7 === 0 && s.restTickets < MAX_TICKETS;
  setState({ ...rest, sessions, todos, todoLog, doneBlocks, timetable, restTickets: s.restTickets + (ticket ? 1 : 0) });
  const before = expOf(s.sessions, s.goalMin, s.todoLog), after = expOf(sessions, s.goalMin, todoLog);
  const lv0 = levelOf(before).lv, lv1 = levelOf(after).lv;
  return { min: recs.reduce((n, r) => n + r.min, 0), ticket, exp: after - before, levelUp: lv1 > lv0 ? lv1 : null };
}
const STOPPED: Partial<State> = { running: false, paused: false, base: 0, studyTodo: null, planMin: null, planNext: null, planBlock: null };
/** The session under way, as a record. */
type RecOpts = { todoId?: string; note?: string; min?: number; s?: string; what?: string; kept?: boolean };
const current = (s: State, now: Date, opts?: RecOpts): Rec => ({
  s: opts?.s ?? s.subj, min: Math.max(1, Math.round(opts?.min ?? elapsedOf(s, now.getTime()) / 60)), end: now,
  note: opts?.note, todoId: opts?.todoId, blockId: s.planBlock ?? undefined, what: opts?.what, kept: opts?.kept,
});
const ofHeld = (h: Held, opts?: RecOpts): Rec => ({
  s: opts?.s ?? h.s, min: Math.max(1, Math.round(opts?.min ?? h.sec / 60)), end: new Date(h.end), note: opts?.note, blockId: h.blockId, what: opts?.what, kept: opts?.kept,
});

/** Starts 自習: studying with no plan to hand, the subject left for the record page. It goes into today's timetable from now, as the timer's card. */
export function startFree(now: Date = new Date()): boolean {
  const b = planNow(FREE, now);
  return startFrom({ s: FREE, blockId: b.id }, now.getTime());
}

export function commitRecord(opts?: RecOpts & { now?: Date }): Recorded {
  const now = opts?.now ?? new Date();
  return saveRecords([current(state, now, opts)], now, STOPPED);
}
/** Records one held session (the one under way, if any, goes on). */
export function commitHeld(id: string, opts?: RecOpts & { now?: Date }): Recorded | null {
  const h = state.held.find((x) => x.id === id);
  if (!h) return null;
  return saveRecords([ofHeld(h, opts)], opts?.now ?? new Date(), { held: state.held.filter((x) => x !== h) });
}
/** Records everything at once: every held session and the one under way (which stops). */
export function commitAll(now: Date = new Date()): Recorded | null {
  const s = state;
  const recs = [...s.held.map((h) => ofHeld(h)), ...(s.running ? [current(s, now, { todoId: s.studyTodo ?? undefined })] : [])];
  if (!recs.length) return null;
  return saveRecords(recs, now, { held: [], ...(s.running ? STOPPED : {}) });
}

// ---------- sessions ----------
export function addSession(x: Omit<Session, 'id'>) {
  setState((s) => ({ sessions: [...s.sessions, { ...x, id: newId('s') }] }));
}
export function updateSession(id: string, patch: Partial<Session>) {
  setState((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
}
/** Sorts a 自習 record recorded with no subject: it takes the subject (and what it was), and so does its 自習 plan in the timetable. */
export function sortFree(id: string, s: string, what?: string) {
  setState((st) => {
    const x = st.sessions.find((y) => y.id === id);
    if (!x) return {};
    const w = what?.trim() || undefined;
    return {
      sessions: st.sessions.map((y) => (y.id === id ? { ...y, s, what: w } : y)),
      timetable: x.block ? st.timetable.map((b) => (b.id === x.block && b.s === FREE ? { ...b, s, ...(w ? { t: w } : {}) } : b)) : st.timetable,
    };
  });
}
/** Leaves a 自習 record as 自習 (it stops waiting to be sorted; the charts keep it as 自習). */
export function keepFree(id: string, what?: string) {
  const w = what?.trim() || undefined;
  setState((st) => ({ sessions: st.sessions.map((y) => (y.id === id ? { ...y, kept: true, ...(w ? { what: w } : {}) } : y)) }));
}
export function removeSession(id: string) {
  setState((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }));
}

// ---------- todos & deadlines ----------
export function addTodo(t: Omit<Todo, 'id' | 'd'>) {
  setState((s) => ({ todos: [...s.todos, { ...t, id: newId('t'), d: false }] }));
}
export function updateTodo(id: string, patch: Partial<Todo>) {
  const today = dateKey();
  setState((s) => {
    const was = s.todos.find((x) => x.id === id);
    // finishing logs it for EXP; un-finishing today takes today's entry back
    const log = !was || patch.d === undefined || patch.d === was.d ? s.todoLog
      : patch.d ? [...s.todoLog, { id, date: today }]
      : s.todoLog.filter((x) => !(x.id === id && x.date === today));
    return {
      todos: s.todos.map((x) => (x.id === id ? { ...x, ...patch, ...(patch.d === true ? { doneOn: today } : patch.d === false ? { doneOn: undefined } : {}) } : x)),
      todoLog: log,
    };
  });
}
/** Tick a ToDo on or off. Returns the EXP that finishing it earned (0 when un-ticking, or past the day's cap). */
export function toggleTodo(id: string): number {
  const s = state;
  const td = s.todos.find((x) => x.id === id);
  if (!td) return 0;
  const today = dateKey();
  const before = s.todoLog.filter((x) => x.date === today).length;
  updateTodo(id, { d: !td.d });
  const exp = !td.d && before < TODO_CAP ? TODO_EXP : 0;
  if (!td.d) celebrate({ kind: 'todo', exp, all: state.todos.every((x) => x.d) });
  return exp;
}
export function removeTodo(id: string) {
  setState((s) => ({ todos: s.todos.filter((x) => x.id !== id) }));
}
export function moveTodo(id: string, by: -1 | 1) {
  setState((s) => {
    const i = s.todos.findIndex((x) => x.id === id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= s.todos.length) return {};
    const todos = [...s.todos];
    [todos[i], todos[j]] = [todos[j], todos[i]];
    return { todos };
  });
}
export function addDeadline(d: Omit<Deadline, 'id'>) {
  setState((s) => ({ deadlines: [...s.deadlines, { ...d, id: newId('d') }] }));
}
export function removeDeadline(id: string) {
  setState((s) => ({ deadlines: s.deadlines.filter((x) => x.id !== id), todos: s.todos.map((x) => (x.dl === id ? { ...x, dl: undefined } : x)) }));
}

// ---------- a new day ----------
/**
 * What happens when the calendar day changes (at midnight, or when the app is
 * opened on a later day): finished ToDos are cleared, unfinished ones carry over
 * and count the days they've slid, and a missed day is covered by a rest ticket
 * if you have one, so the streak survives it.
 */
export function rollDay(now: Date = new Date()) {
  const s = state;
  const today = dateKey(now);
  if (!s.lastDay || s.lastDay === today) {
    if (!s.lastDay) setState({ lastDay: today });
    return;
  }
  const gap = Math.max(0, daysBetween(s.lastDay, today));
  const studied = byDay(s.sessions);
  const restDays = [...s.restDays];
  let tickets = s.restTickets;
  // walk the missed days oldest first; a ticket covers a day only if the run was alive the day before
  for (let k = gap - 1; k >= 1; k--) {
    const day = addDays(today, -k);
    const before = addDays(day, -1);
    const alive = studied.has(before) || restDays.includes(before);
    if (!studied.has(day) && tickets > 0 && alive) { restDays.push(day); tickets -= 1; }
  }
  setState({
    lastDay: today,
    restDays,
    restTickets: tickets,
    todos: s.todos.filter((x) => !x.d).map((x) => ({ ...x, carried: (x.carried ?? 0) + gap })),
  });
}
/** Mount once: checks for a new day every half minute and when the app comes back. */
export function useDayRollover() {
  useEffect(() => {
    rollDay();
    const id = setInterval(() => rollDay(), 30_000);
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') rollDay(); });
    return () => { clearInterval(id); sub.remove(); };
  }, []);
}
/**
 * Mount once: keeps the phone's scheduled reminders in step with your data —
 * deadlines (3 days and 1 day before), each timetable block as it starts, and, while the timer runs, a nudge when
 * today's total is 15 minutes from the goal. Never asks for permission itself.
 */
export function useReminders() {
  const signedIn = useStore((s) => !!s.account);
  const deadlines = useStore((s) => s.deadlines);
  const onDeadlines = useStore((s) => s.notify.deadlines);
  const onGoal = useStore((s) => s.notify.goal);
  const running = useStore((s) => s.running && !s.paused);
  const startedAt = useStore((s) => s.startedAt);
  const todayMin = useStore((s) => s.todayMin);
  const goalMin = useStore((s) => s.goalMin);
  const blocks = useStore((s) => s.timetable);
  const onTimetable = useStore((s) => s.notify.timetable !== false);
  const today = useStore((s) => s.lastDay); // re-plan the week's nudges once a day
  useEffect(() => { configureNotifications(); }, []);
  useEffect(() => {
    notificationsAllowed(false).then((ok) => replaceReminders('tt-', ok && signedIn && onTimetable ? timetableReminders(blocks, (id) => subj(id).name) : []));
  }, [signedIn, blocks, onTimetable, today]);
  useEffect(() => {
    notificationsAllowed(false).then((ok) => replaceReminders('dl-', ok && signedIn && onDeadlines ? deadlineReminders(deadlines) : []));
  }, [signedIn, deadlines, onDeadlines]);
  useEffect(() => {
    const at = running && onGoal ? goalReminderAt(todayMin, elapsedOf(getState()), goalMin) : null;
    if (!at) { cancelReminder('goal'); return; }
    notificationsAllowed(false).then((ok) => { if (ok) scheduleReminder({ id: 'goal', at, title: '目標まであと15分', body: `今日の目標 ${goalMin / 60}時間 まで、もう少しです` }); });
  }, [running, startedAt, todayMin, goalMin, onGoal]);
}

/** Your level, from all your records. */
export const useLevel = () => {
  const sessions = useStore((s) => s.sessions);
  const goalMin = useStore((s) => s.goalMin);
  const todoLog = useStore((s) => s.todoLog);
  return useMemo(() => levelOf(expOf(sessions, goalMin, todoLog)), [sessions, goalMin, todoLog]);
};

/** The current run of study days. */
export const useStreak = () => useStore((s) => streakOf(s.sessions, s.restDays));

// ---------- safety ----------
export function block(name: string) {
  setState((s) => ({ blocked: s.blocked.includes(name) ? s.blocked : [...s.blocked, name] }));
}
export function unblock(name: string) {
  setState((s) => ({ blocked: s.blocked.filter((x) => x !== name) }));
}
export const currentSubject = () => subj(state.subj);

// ---------- small toggles ----------
export const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

// ---------- account ----------
/** Under 18: studying is shown to followers only, messages come from people you follow. */
export const isMinor = (a: Account | null) => !!a && ageThisYear(a.birthYear) < 18;
export function signIn(a: Account) {
  const minor = ageThisYear(a.birthYear) < 18;
  setState({
    ...(a.via === 'demo' ? demoState() : {}),
    account: a, liveScope: minor ? 'followers' : 'all', dmFrom: minor ? 'following' : 'groups',
  });
}
/** Deletes the account and everything on this device. */
export function wipe() {
  state = derive({ ...INITIAL, startedAt: Date.now(), lastDay: dateKey() });
  listeners.forEach((l) => l());
  AsyncStorage.multiRemove([KEY, OLD_KEY]).catch(() => {});
}

// ---------- on-device storage ----------
// Everything lives on this phone, so the app works offline and a running timer
// survives the app being closed. The saved shape carries a version; older
// saves are migrated when they're read.
const KEY = 'inchly.v3';
const OLD_KEY = 'inchly.v2';
const VERSION = 3;
let ready = false;
let timer: ReturnType<typeof setTimeout> | undefined;
function save() {
  if (!ready) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const { todayMin: _t, showLive: _l, ...keep } = state;
    AsyncStorage.setItem(KEY, JSON.stringify({ v: VERSION, ...keep, savedAt: Date.now() })).catch(() => {});
  }, 300);
}
/** v2 saves counted days back from "today" (`day: 0`); v3 dates every record. */
export function migrate(saved: Record<string, unknown>, now: Date = new Date()): Partial<State> {
  const v = typeof saved.v === 'number' ? saved.v : 2;
  const out = { ...saved } as Record<string, unknown>;
  if (v < 3) {
    const today = dateKey(now);
    const sessions = Array.isArray(saved.sessions) ? (saved.sessions as Record<string, unknown>[]) : [];
    out.sessions = sessions.map(({ day, ...x }) => ({ ...x, date: addDays(today, -(Number(day) || 0)) }));
    out.helpful = Array.isArray(saved.helpful) ? (saved.helpful as unknown[]).filter((x) => typeof x === 'string') : [];
    out.lastDay = today;
    delete out.syncedAt;
  }
  // settings saved before a field existed get its default
  if (out.chart && typeof out.chart === 'object') {
    // the chart's own palette is gone: charts draw in the subjects' fixed colors
    const { palette: _gone, ...chart } = out.chart as Record<string, unknown>;
    out.chart = { ...INITIAL.chart, ...chart };
  }
  // colors became fixed by 教科: older saves' subjects take their 教科's shades
  if (Array.isArray(out.subjects)) out.subjects = fixColors(out.subjects as Subject[]);
  if (out.design && typeof out.design === 'object') {
    const d = { ...INITIAL.design, ...(out.design as object) } as Design;
    // the timer's background (studyBg) became the 背景 behind every page; its 科目の色 is 背景 なし
    if (!('backdrop' in (out.design as object)) && typeof saved.studyBg === 'string') d.backdrop = saved.studyBg === 'color' ? 'none' : (saved.studyBg as Design['backdrop']);
    if (!(d.backdrop in BACKDROPS)) d.backdrop = INITIAL.design.backdrop;
    if (![0, 1, 2, 3].includes(d.frost)) d.frost = INITIAL.design.frost;
    if (![0, 1, 2, 3].includes(d.cardFill)) d.cardFill = INITIAL.design.cardFill;
    // a replaced theme becomes its successor; the old black and orange streak capsules are peach now
    out.design = { ...d, theme: themeId(d.theme), streak: d.streak in STREAKS ? d.streak : 'peach' };
  }
  delete out.studyBg;
  // coins, the store and missions are gone; drop what older saves kept for them
  for (const k of ['coins', 'boost', 'owned', 'claimed', 'eventsClaimed']) delete out[k];
  delete out.v;
  return out as Partial<State>;
}
export async function hydrate() {
  try {
    const raw = (await AsyncStorage.getItem(KEY)) ?? (await AsyncStorage.getItem(OLD_KEY));
    if (raw) state = derive({ ...INITIAL, ...migrate(JSON.parse(raw)) });
  } catch {
    // a broken save starts fresh rather than blocking the app
  }
  ready = true;
  rollDay();
  listeners.forEach((l) => l());
  save();
  AsyncStorage.removeItem(OLD_KEY).catch(() => {});
}
export function setFriendSort(sort: FriendSort) {
  setState({ friendSort: sort });
}
/** Your own order of the friends on home (dragging one switches the list to it). */
export function setFriendOrder(order: string[]) {
  setState({ friendSort: 'mine', friendOrder: order });
}
/** Takes a friend off home's list (or puts them back). */
export function setFriendHidden(h: string, hidden: boolean) {
  setState((s) => ({ friendHidden: hidden ? [...s.friendHidden.filter((x) => x !== h), h] : s.friendHidden.filter((x) => x !== h) }));
}
export function toggleFollow(h: string) {
  setState((s) => ({ following: toggleIn(s.following, h) }));
}
export function toggleHelpful(id: string) {
  setState((s) => ({ helpful: toggleIn(s.helpful, id) }));
}
/** Saves a post to your bookmarks, or takes it out. Returns whether it is saved now. */
export function toggleBookmark(id: string): boolean {
  const on = !state.bookmarks.includes(id);
  setState((s) => ({ bookmarks: on ? [id, ...s.bookmarks] : s.bookmarks.filter((x) => x !== id) }));
  return on;
}
export function addPost(p: Omit<Post, 'id'>) {
  setState((s) => ({ posts: [{ ...p, id: newId('m') }, ...s.posts] }));
}
export function updateGroup(id: string, fn: (g: Group) => Group) {
  setState((s) => ({ groups: s.groups.map((g) => (g.id === id ? fn(g) : g)) }));
}
export function addGroup(g: Group) {
  setState((s) => ({ groups: [g, ...s.groups] }));
}
