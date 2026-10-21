import { useEffect, useState, useSyncExternalStore } from 'react';

import { GROUPS, Group, subj } from './data';

// One small global store. Updates are immutable so selectors can return
// existing references without re-render loops.
export type Todo = { s: string; t: string; d: boolean; carried?: number }; // carried: days it has slid
export type State = {
  running: boolean;
  paused: boolean;
  startedAt: number; // ms timestamp of the last resume
  base: number; // seconds accumulated before startedAt
  subj: string;
  todayMin: number;
  goalMin: number;
  targetMin: number; // planned length of this focus session
  todos: Todo[];
  following: string[];
  helpful: number[];
  notifRead: number[];
  notifGone: number[];
  groups: Group[];
  joinedFeed: string[];
  showLive: boolean; // appear in みんな while studying
  showRank: boolean; // appear in rankings
};

let state: State = {
  running: true,
  paused: false,
  startedAt: Date.now(),
  base: 2350,
  subj: 'en',
  todayMin: 165,
  goalMin: 180,
  targetMin: 60,
  todos: [
    { s: 'ph', t: '名問の森 15', d: false, carried: 2 },
    { s: 'ma', t: '青チャート 数III 例題41〜50', d: false },
    { s: 'en', t: '長文読解 第3講（時間を測る）', d: true },
    { s: 'ja', t: '古文単語 61〜80', d: true },
    { s: 'ma', t: '復習キュー 4問', d: false },
  ],
  following: ['mio.k', 'sora_06', 'kaito'],
  helpful: [],
  notifRead: [],
  notifGone: [],
  groups: GROUPS,
  joinedFeed: [],
  showLive: true,
  showRank: true,
};

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const getState = () => state;
export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  listeners.forEach((l) => l());
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
/** Stops the timer and adds the minutes to today. Returns the minutes recorded. */
export function commitRecord(): number {
  const s = state;
  const min = Math.max(1, Math.round(elapsedOf(s) / 60));
  setState({ running: false, paused: false, base: 0, todayMin: s.todayMin + min });
  return min;
}
export const currentSubject = () => subj(state.subj);

// ---------- small toggles ----------
export const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export function toggleTodo(i: number) {
  setState((s) => ({ todos: s.todos.map((t, j) => (j === i ? { ...t, d: !t.d } : t)) }));
}
export function toggleFollow(h: string) {
  setState((s) => ({ following: toggleIn(s.following, h) }));
}
export function toggleHelpful(i: number) {
  setState((s) => ({ helpful: toggleIn(s.helpful, i) }));
}
export function updateGroup(id: string, fn: (g: Group) => Group) {
  setState((s) => ({ groups: s.groups.map((g) => (g.id === id ? fn(g) : g)) }));
}
export function addGroup(g: Group) {
  setState((s) => ({ groups: [g, ...s.groups] }));
}
