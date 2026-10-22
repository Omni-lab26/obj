import { useEffect, useState, useSyncExternalStore } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { Day, dayLog, GROUPS, Group, Post, POSTS, subj, SUBJ, TODAY } from './data';

const TODAY_YEAR = TODAY.getFullYear();

// One small global store, saved on the device (see persist below). Updates
// are immutable so selectors can return existing references without loops.

/** One study session. `day` counts back from today (0 = today, 1 = yesterday). */
export type Session = { id: string; s: string; min: number; day: number; at: string; note?: string; manual?: boolean };
export type Todo = { id: string; s: string; t: string; d: boolean; carried?: number; dl?: string }; // carried: days it has slid; dl: deadline id
export type Deadline = { id: string; t: string; mo: number; day: number; urgent?: boolean };
export type Account = { name: string; handle: string; grade: string; birthYear: number; aim: string; via: 'apple' | 'mail' | 'demo' };
export type LiveScope = 'all' | 'followers' | 'none';
export type DmFrom = 'following' | 'groups' | 'all';

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
  syncedAt: number; // ms, mock server sync
};

let seq = 100;
export const newId = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

const SEED_SESSIONS: Session[] = [
  { id: 's1', s: 'ja', min: 30, day: 0, at: '6:30', note: '古文単語 61〜80' },
  { id: 's2', s: 'en', min: 60, day: 0, at: '7:10', note: '長文読解 第3講' },
  { id: 's3', s: 'en', min: 35, day: 0, at: '17:40' },
  { id: 's4', s: 'ma', min: 40, day: 0, at: '19:00', note: '青チャート 例題38〜40' },
  { id: 's5', s: 'ph', min: 55, day: 1, at: '20:10' },
  { id: 's6', s: 'ma', min: 33, day: 1, at: '22:05' },
];

const todayOf = (sessions: Session[]) => sessions.filter((x) => x.day === 0).reduce((a, x) => a + x.min, 0);

export const INITIAL: State = {
  account: null,
  running: true,
  paused: false,
  startedAt: Date.now(),
  base: 2350,
  subj: 'en',
  sessions: SEED_SESSIONS,
  todayMin: todayOf(SEED_SESSIONS),
  goalMin: 180,
  targetMin: 60,
  todos: [
    { id: 't1', s: 'ph', t: '名問の森 15', d: false, carried: 2, dl: 'd1' },
    { id: 't2', s: 'ma', t: '青チャート 数III 例題41〜50', d: false, dl: 'd1' },
    { id: 't3', s: 'en', t: '長文読解 第3講（時間を測る）', d: true, dl: 'd1' },
    { id: 't4', s: 'ja', t: '古文単語 61〜80', d: true, dl: 'd2' },
    { id: 't5', s: 'ma', t: '復習キュー 4問', d: false },
  ],
  deadlines: [
    { id: 'd1', t: '第4回 記述模試', mo: 11, day: 8, urgent: true },
    { id: 'd2', t: '共通テスト', mo: 1, day: 16 },
    { id: 'd3', t: '東大 二次試験', mo: 2, day: 25 },
  ],
  following: ['mio.k', 'sora_06', 'kaito'],
  posts: POSTS,
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
  syncedAt: Date.now(),
};
let state: State = INITIAL;

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const getState = () => state;
export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  const next = { ...state, ...p };
  next.todayMin = todayOf(next.sessions);
  next.showLive = next.liveScope !== 'none';
  state = next;
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
  setState({ running: true, paused: false, startedAt: Date.now(), base: 0, subj: next });
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
const clock = () => { const d = new Date(); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };

/** Stops the timer and saves the session. Marks the ToDo you moved forward as done. Returns the minutes. */
export function commitRecord(opts?: { todoId?: string; note?: string }): number {
  const s = state;
  const min = Math.max(1, Math.round(elapsedOf(s) / 60));
  const todo = s.todos.find((x) => x.id === opts?.todoId);
  setState({
    running: false, paused: false, base: 0,
    sessions: [...s.sessions, { id: newId('s'), s: s.subj, min, day: 0, at: clock(), note: opts?.note ?? todo?.t }],
    todos: todo ? s.todos.map((x) => (x.id === todo.id ? { ...x, d: true } : x)) : s.todos,
  });
  return min;
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
  setState((s) => ({ todos: s.todos.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
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

// ---------- safety ----------
export function block(name: string) {
  setState((s) => ({ blocked: s.blocked.includes(name) ? s.blocked : [...s.blocked, name] }));
}
export function unblock(name: string) {
  setState((s) => ({ blocked: s.blocked.filter((x) => x !== name) }));
}
export const currentSubject = () => subj(state.subj);

/** A day for the charts: today and yesterday come from your records, older days from the history. */
export function dayOf(sessions: Session[], daysAgo: number): Day {
  if (daysAgo > 1) return dayLog(daysAgo);
  const mine = sessions.filter((x) => x.day === daysAgo);
  const parts = SUBJ.map((x) => mine.filter((r) => r.s === x.id).reduce((a, r) => a + r.min, 0));
  return { min: parts.reduce((a, b) => a + b, 0), parts };
}

// ---------- small toggles ----------
export const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export function toggleTodo(i: number) {
  setState((s) => ({ todos: s.todos.map((t, j) => (j === i ? { ...t, d: !t.d } : t)) }));
}

// ---------- account ----------
/** Under 18: studying is shown to followers only, messages come from people you follow. */
export const isMinor = (a: Account | null) => !!a && TODAY_YEAR - a.birthYear < 18;
export function signIn(a: Account) {
  const minor = TODAY_YEAR - a.birthYear < 18;
  setState({ account: a, liveScope: minor ? 'followers' : 'all', dmFrom: minor ? 'following' : 'groups', syncedAt: Date.now() });
}
/** Deletes the account and everything on this device. */
export function wipe() {
  state = { ...INITIAL, account: null, startedAt: Date.now(), running: false, base: 0, sessions: [], todos: [], following: [], blocked: [], posts: POSTS.filter((p) => !p.mine) };
  state.todayMin = 0;
  listeners.forEach((l) => l());
  AsyncStorage.removeItem(KEY).catch(() => {});
}

// ---------- on-device storage ----------
// Everything lives on this phone first, so the app works offline and a
// running timer survives the app being closed. A real build syncs to the
// server when online; here the sync time is only shown.
const KEY = 'inchly.v2';
let ready = false;
let timer: ReturnType<typeof setTimeout> | undefined;
function save() {
  if (!ready) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const { todayMin: _t, showLive: _l, ...keep } = state;
    AsyncStorage.setItem(KEY, JSON.stringify(keep)).catch(() => {});
  }, 300);
}
export async function hydrate() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<State>;
      state = { ...state, ...saved, syncedAt: Date.now() };
      state.todayMin = todayOf(state.sessions);
      state.showLive = state.liveScope !== 'none';
      state.helpful = state.helpful.filter((x) => typeof x === 'string'); // older saves kept list positions
    }
  } catch {
    // a broken save starts fresh rather than blocking the app
  }
  ready = true;
  listeners.forEach((l) => l());
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
