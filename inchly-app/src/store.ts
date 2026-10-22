import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { demoHistory, GROUPS, Group, Post, POSTS, subj } from './data';
import { cancelReminder, configureNotifications, notificationsAllowed, replaceReminders, scheduleReminder } from './lib/notify';
import { deadlineReminders, goalReminderAt } from './lib/reminders';
import { byDay, streakOf, todayMinutes } from './lib/history';
import { Block } from './lib/timetable';
import { addDays, ageThisYear, dateKey, daysBetween } from './lib/time';

// One small global store, saved on the device (see persist below). Updates
// are immutable so selectors can return existing references without loops.
// A record is dated ('YYYY-MM-DD'); "today" always comes from the device clock.

/** One study session, on the calendar day it was recorded. */
export type Session = { id: string; s: string; min: number; date: string; at: string; note?: string; manual?: boolean };
export type Todo = { id: string; s: string; t: string; d: boolean; carried?: number; dl?: string; doneOn?: string }; // carried: days it has slid; dl: deadline id
export type Deadline = { id: string; t: string; mo: number; day: number; urgent?: boolean };
export type Account = { name: string; handle: string; grade: string; birthYear: number; aim: string; via: 'apple' | 'mail' | 'demo' };
export type LiveScope = 'all' | 'followers' | 'none';
export type DmFrom = 'following' | 'groups' | 'all';
export type ExtraTab = 'events' | 'exams' | 'me';
export type ChartKind = 'bar' | 'stack' | 'line';
export type ChartPalette = 'ink' | 'blue' | 'orange' | 'grape';
export type Chart = { range: 'day' | 'week'; kind: ChartKind; palette: ChartPalette };
/** How the timer counts: up from zero (what gets recorded), or down to a planned length. */
export type TimerMode = 'up' | 'goal';
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
  todos: Todo[];
  deadlines: Deadline[];
  following: string[];
  posts: Post[];
  helpful: string[]; // post ids
  roomFilters: string[]; // extra 志望校 chips in the study room
  notifRead: number[];
  notifGone: number[];
  groups: Group[];
  joinedFeed: string[];
  liveScope: LiveScope;
  showLive: boolean; // derived: liveScope !== 'none'
  showRank: boolean;
  dmFrom: DmFrom;
  notify: { peers: boolean; deadlines: boolean; goal: boolean };
  blocked: string[]; // names
  savedAt: number; // ms, last write to this device
  lastDay: string; // the last calendar day the app saw, for rolling over at midnight
  // the game layer
  restTickets: number;
  restDays: string[]; // days a rest ticket covered
  extraTab: ExtraTab | null; // what the right-hand tab became; null = not chosen yet
  chart: Chart; // how home draws the study-time graph
  timetable: Block[]; // study blocks planned by the clock, repeating weekly
  timerMode: TimerMode;
  studyTodo: string | null; // the ToDo this session works on (picked on the record page)
};

let seq = 100;
export const newId = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;
const clockOf = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

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
  todos: [],
  deadlines: [],
  following: [],
  posts: POSTS.filter((p) => !p.mine),
  helpful: [],
  roomFilters: [],
  notifRead: [],
  notifGone: [],
  groups: GROUPS,
  joinedFeed: [],
  liveScope: 'all',
  showLive: true,
  showRank: true,
  dmFrom: 'groups',
  notify: { peers: true, deadlines: true, goal: true },
  blocked: [],
  savedAt: 0,
  lastDay: dateKey(),
  restTickets: 1, // one to start with, so a single missed day doesn't undo the first week
  restDays: [],
  extraTab: null,
  chart: { range: 'day', kind: 'stack', palette: 'ink' },
  timetable: [],
  timerMode: 'up',
  studyTodo: null,
};

/** The sample account: a year of history, a plan, people it follows, a session under way. */
export function demoState(now: Date = new Date()): Partial<State> {
  const today = dateKey(now);
  const yesterday = addDays(today, -1);
  const past: Session[] = demoHistory(now).map((h, i) => ({ id: `h${i}`, s: h.s, min: h.min, date: addDays(today, -h.daysAgo), at: h.at }));
  const recent: Session[] = [
    { id: 's1', s: 'ja', min: 30, date: today, at: '6:30', note: '古文単語 61〜80' },
    { id: 's2', s: 'en', min: 60, date: today, at: '7:40', note: '長文読解 第3講' },
    { id: 's3', s: 'en', min: 35, date: today, at: '17:40' },
    { id: 's4', s: 'ma', min: 40, date: today, at: '19:00', note: '青チャート 例題38〜40' },
    { id: 's5', s: 'ph', min: 55, date: yesterday, at: '20:10' },
    { id: 's6', s: 'ma', min: 33, date: yesterday, at: '22:05' },
  ];
  return {
    running: true, paused: false, startedAt: now.getTime(), base: 2350, subj: 'en',
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
const derive = (s: State): State => ({ ...s, todayMin: todayMinutes(s.sessions), showLive: s.liveScope !== 'none' });

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
  setState({ running: true, paused: false, startedAt: Date.now(), base: 0, subj: next, studyTodo: null });
}
/**
 * Start from something planned: a timetable block or a ToDo. The subject is
 * set from it, the block's length becomes the target, and a ToDo is carried
 * to the record page. While already studying, this switches only if the
 * session is under a minute old (as the timer allows).
 */
export function startFrom(x: { s: string; todoId?: string; min?: number }): boolean {
  const s = state;
  if (s.running && elapsedOf(s) > 60 && x.s !== s.subj) return false;
  setState({
    running: true, paused: false, startedAt: Date.now(), base: s.running && x.s === s.subj ? elapsedOf(s) : 0,
    subj: x.s, studyTodo: x.todoId ?? null, ...(x.min ? { targetMin: x.min } : {}),
  });
  return true;
}
export function setTimerMode(m: TimerMode) {
  setState({ timerMode: m });
}
export function saveBlock(b: Omit<Block, 'id'> & { id?: string }) {
  setState((s) => ({
    timetable: b.id ? s.timetable.map((x) => (x.id === b.id ? { ...x, ...b, id: x.id } : x)) : [...s.timetable, { ...b, id: newId('b') }],
  }));
}
export function removeBlock(id: string) {
  setState((s) => ({ timetable: s.timetable.filter((x) => x.id !== id) }));
}
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
export function setChart(patch: Partial<Chart>) {
  setState((s) => ({ chart: { ...s.chart, ...patch } }));
}

/** A rest ticket for every 7 days in a row, holding at most this many. */
export const MAX_TICKETS = 3;
/**
 * Ends the session and saves it on today's date. The chosen ToDo is marked
 * done. The day's first record that brings the run to a multiple of 7 days
 * earns a rest ticket. Returns the minutes and whether a ticket was earned.
 */
export function commitRecord(opts?: { todoId?: string; note?: string; min?: number }): { min: number; ticket: boolean } {
  const s = state;
  const now = new Date();
  const today = dateKey(now);
  const min = Math.max(1, Math.round(opts?.min ?? elapsedOf(s) / 60));
  const todo = s.todos.find((x) => x.id === opts?.todoId);
  const sessions = [...s.sessions, { id: newId('s'), s: s.subj, min, date: today, at: clockOf(now), note: opts?.note ?? todo?.t }];
  const run = streakOf(sessions, s.restDays, now);
  const ticket = !byDay(s.sessions).has(today) && run > 0 && run % 7 === 0 && s.restTickets < MAX_TICKETS;
  setState({
    running: false, paused: false, base: 0, studyTodo: null,
    sessions,
    todos: todo ? s.todos.map((x) => (x.id === todo.id ? { ...x, d: true, doneOn: today } : x)) : s.todos,
    restTickets: s.restTickets + (ticket ? 1 : 0),
  });
  return { min, ticket };
}

// ---------- sessions ----------
export function addSession(x: Omit<Session, 'id'>) {
  setState((s) => ({ sessions: [...s.sessions, { ...x, id: newId('s') }] }));
}
export function updateSession(id: string, patch: Partial<Session>) {
  setState((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
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
  setState((s) => ({
    todos: s.todos.map((x) => (x.id === id ? { ...x, ...patch, ...(patch.d === true ? { doneOn: today } : patch.d === false ? { doneOn: undefined } : {}) } : x)),
  }));
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
 * deadlines (3 days and 1 day before) and, while the timer runs, a nudge when
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
  useEffect(() => { configureNotifications(); }, []);
  useEffect(() => {
    notificationsAllowed(false).then((ok) => replaceReminders('dl-', ok && signedIn && onDeadlines ? deadlineReminders(deadlines) : []));
  }, [signedIn, deadlines, onDeadlines]);
  useEffect(() => {
    const at = running && onGoal ? goalReminderAt(todayMin, elapsedOf(getState()), goalMin) : null;
    if (!at) { cancelReminder('goal'); return; }
    notificationsAllowed(false).then((ok) => { if (ok) scheduleReminder({ id: 'goal', at, title: '目標まであと15分', body: `今日の目標 ${goalMin / 60}時間 まで、もう少しです` }); });
  }, [running, startedAt, todayMin, goalMin, onGoal]);
}

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
export function toggleFollow(h: string) {
  setState((s) => ({ following: toggleIn(s.following, h) }));
}
export function toggleHelpful(id: string) {
  setState((s) => ({ helpful: toggleIn(s.helpful, id) }));
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
