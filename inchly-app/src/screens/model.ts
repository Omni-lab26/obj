import { router } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';

import { PEOPLE, subj } from '../data';
import { celebrate } from '../moments';
import { dayOf, hourlyOf, Parts, weekOf, withLive } from '../lib/history';
import { daysUntil, dateKey } from '../lib/time';
import { endOf, minutesUntil, suggestion } from '../lib/timetable';
import { elapsedOf, FriendSort, getState, setSubject, startFrom, startStudy, togglePause, toggleTodo, useNow, useStore, useStreak } from '../store';
import { haptic } from '../ui/base';
import { toast } from '../ui/Toast';

// What every theme app shows and does, worked out once. A theme app (see
// src/themes) only decides how it looks: these hooks give it today's numbers,
// what's next, the session under way and the actions, the same for all of them.

const DOW = ['月', '火', '水', '木', '金', '土', '日'];

/** A subject's share of some minutes, with its name and color. */
export type Slice = { id: string; name: string; c: string; min: number };
const slices = (parts: Parts, subjects: { id: string; name: string; c: string }[]): Slice[] => {
  const known = subjects.map((x) => ({ id: x.id, name: x.name, c: x.c, min: parts[x.id] ?? 0 }));
  const gone = Object.entries(parts).filter(([id]) => !subjects.some((x) => x.id === id)).reduce((a, [, m]) => a + m, 0);
  return [...known, ...(gone ? [{ id: '?', name: '削除した科目', c: '#8C93A0', min: gone }] : [])].filter((x) => x.min > 0);
};

/** Today: minutes, the change from yesterday, the goal, and the minutes by subject. */
export function useToday() {
  const sessions = useStore((s) => s.sessions);
  const goal = useStore((s) => s.goalMin);
  const lastDay = useStore((s) => s.lastDay); // a new day starts a new today
  const subjects = useStore((s) => s.subjects);
  return useMemo(() => {
    const today = dayOf(sessions, 0);
    const yesterday = dayOf(sessions, 1).min;
    return { min: today.min, yesterday, diff: today.min - yesterday, goal, reached: today.min >= goal, parts: slices(today.parts, subjects) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, goal, lastDay, subjects]);
}

/** The session under way (or the subject that would start), and what to do with it. */
export function useSession() {
  const now = useNow();
  const s = useStore((x) => x);
  const sj = subj(s.subj);
  const elapsed = elapsedOf(s, now);
  const target = Math.round(s.targetMin * 60);
  const todo = s.todos.find((x) => x.id === s.studyTodo && x.s === s.subj);
  return {
    running: s.running, paused: s.paused, subject: sj, task: todo?.t ?? sj.task,
    elapsed, target, remaining: Math.max(0, target - elapsed), over: s.running && elapsed > target,
    /** the timetable block's length in seconds when started from it; null when just measuring */
    plan: s.planMin ? Math.round(s.planMin * 60) : null,
    /** 'up' counts the time studied (what is recorded); 'goal' counts down to the target */
    mode: s.timerMode,
    /** the subject can change before starting and in the first minute */
    canSwitch: !s.running || elapsed <= 60,
  };
}
export const session = {
  pause() { haptic.soft(); togglePause(); },
  /** Stops the clock where it is and opens the record page. */
  finish() { const c = getState(); if (c.running && !c.paused) togglePause(); router.push('/record'); },
  /** Starts (or resumes) the selected subject without opening the timer. */
  start() { haptic.firm(); startStudy(); },
  switchTo(id: string) {
    const c = getState();
    if (id === c.subj) return;
    if (c.running && elapsedOf(c) > 60) { haptic.warn(); toast('勉強中の科目は変えられません', '記録してから切り替えましょう'); return; }
    haptic.tap();
    if (c.running) startStudy(id);
    else setSubject(id);
  },
};

/** One nudge when the timetable block's length is reached, while the timer is open (just measuring, there is none). */
export function useTargetNudge() {
  const now = useNow();
  const running = useStore((s) => s.running);
  const target = useStore((s) => s.planMin ?? 0);
  const over = useStore((s) => s.running && !!s.planMin && elapsedOf(s, now) > s.planMin * 60);
  const nudged = useRef(false);
  useEffect(() => {
    if (!running) nudged.current = false;
    else if (over && !nudged.current) {
      nudged.current = true;
      haptic.success();
      toast(`予定の${Math.round(target)}分に届きました`, 'このまま続けても、記録してもOK');
      celebrate({ kind: 'target', min: Math.round(target) });
    }
  }, [over, running, target]);
}

/**
 * What to start next: the timetable's block under way ('now') or next today
 * ('next'), else the first open ToDo ('todo'), else the last subject ('last').
 */
export type Pick = {
  s: string; what: string; min?: number; todoId?: string;
  from: 'now' | 'next' | 'todo' | 'last';
  /** the block's times, and the minutes until it starts */
  start?: string; end?: string; inMin?: number;
};
export function useNext(): Pick {
  const now = useNow(30_000);
  const timetable = useStore((s) => s.timetable);
  const todos = useStore((s) => s.todos);
  const cur = useStore((s) => s.subj);
  const slot = suggestion(timetable, new Date(now));
  if (slot) {
    const b = slot.block;
    return { s: b.s, what: b.t ?? subj(b.s).task, min: b.min || undefined, from: slot.state === 'now' ? 'now' : 'next', start: b.start, end: endOf(b), inMin: minutesUntil(b, new Date(now)) };
  }
  const todo = todos.find((x) => !x.d);
  if (todo) return { s: todo.s, what: todo.t, todoId: todo.id, from: 'todo' };
  return { s: cur, what: subj(cur).task, from: 'last' };
}
/** 'いま · 17:00〜18:00', '次は · 19:00から', '次は · ToDo' or '次は' */
export const pickLabel = (p: Pick) =>
  p.from === 'now' ? `いま · ${p.start}〜${p.end}` : p.from === 'next' ? `次は · ${p.start}から` : p.from === 'todo' ? '次は · ToDo' : '次は';
/** Starts what was picked and opens the timer. False when another subject is already under way. */
export function startPick(p: Pick): boolean {
  if (!startFrom({ s: p.s, min: p.min, todoId: p.todoId })) {
    haptic.warn();
    toast(`いまは${subj(getState().subj).name}を勉強中です`, '記録してから次の科目を始めましょう');
    return false;
  }
  haptic.firm();
  router.push('/timer');
  return true;
}

/** The streak and this week (Monday first): studied, today, still to come. */
export function useWeekStreak() {
  const now = useNow(60_000);
  const sessions = useStore((s) => s.sessions);
  const tickets = useStore((s) => s.restTickets);
  const restDays = useStore((s) => s.restDays);
  const streak = useStreak();
  const d = new Date(now);
  const days = weekOf(sessions, d).map((x, i) => ({
    label: DOW[i], date: x.date, min: x.min, studied: x.min > 0, rest: restDays.includes(x.date),
    today: x.date === dateKey(d), future: x.date > dateKey(d),
  }));
  return { streak, tickets, days };
}

/** Today hour by hour (24), and this week day by day (7) — a running session included, marked as live. */
export function useCharts() {
  const now = useNow(30_000);
  const sessions = useStore((s) => s.sessions);
  const running = useStore((s) => s.running);
  const subjId = useStore((s) => s.subj);
  const subjects = useStore((s) => s.subjects);
  const elapsed = useStore((s) => elapsedOf(s, now));
  const goal = useStore((s) => s.goalMin);
  return useMemo(() => {
    const d = new Date(now);
    const today = dateKey(d);
    const rec = hourlyOf(sessions, today);
    const all = running ? withLive(rec, now - elapsed * 1000, now, today, subjId) : rec;
    const hours = rec.min.map((m, h) => ({ h, min: all.min[h], live: all.min[h] - m, parts: slices(rec.parts[h], subjects), now: h === d.getHours(), future: h > d.getHours() }));
    const week = weekOf(sessions, d).map((x, i) => {
      const isToday = x.date === today;
      const live = isToday && running ? elapsed / 60 : 0;
      return { label: DOW[i], date: x.date, min: x.min + live, live, parts: slices(x.parts, subjects), today: isToday, future: x.date > today };
    });
    return { hours, week, goal, weekTotal: week.reduce((a, x) => a + x.min - x.live, 0) };
  }, [now, sessions, running, subjId, subjects, elapsed, goal]);
}

/** Today's ToDos, and ticking one off (with its EXP, said in a toast). */
export function useTodos() {
  const todos = useStore((s) => s.todos);
  const done = todos.filter((x) => x.d).length;
  return { todos, done, total: todos.length, next: todos.find((x) => !x.d) };
}
export function tickTodo(id: string) {
  const before = getState().todos;
  const willAll = before.length > 0 && before.every((x) => (x.id === id ? !x.d : x.d));
  const exp = toggleTodo(id);
  if (willAll) { haptic.success(); toast('今日のToDo、ぜんぶ終わり', exp ? `+${exp} EXP` : undefined); }
  else if (exp) { haptic.soft(); toast('ToDoを完了しました', `+${exp} EXP`); }
}

/** Deadlines, nearest first, with the progress of the ToDos tied to each. */
export function useDeadlines() {
  const deadlines = useStore((s) => s.deadlines);
  const todos = useStore((s) => s.todos);
  return useMemo(() => deadlines
    .map((d) => {
      const linked = todos.filter((x) => x.dl === d.id);
      return { ...d, days: daysUntil(d.mo, d.day), done: linked.filter((x) => x.d).length, total: linked.length };
    })
    .sort((a, b) => a.days - b.days), [deadlines, todos]);
}

/** People studying now (sample people; the blocked never show). */
export function usePeers() {
  const blocked = useStore((s) => s.blocked);
  const people = PEOPLE.filter((p) => !blocked.includes(p.n));
  return { people, count: 1263 + people.length };
}

/** A friend studying now: what, how long today (a session under way included), and their last seven days. */
export type Friend = { n: string; h: string; c: string; s: string; g: string; live: number; today: number; diff: number; week: number[] };
const opened = Date.now();
/** Seven days of minutes for a sample person, the same every time (seeded by their handle), today last. */
function weekOf7(h: string): number[] {
  let seed = [...h].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 233280;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: 7 }, (_, i) => (i === 6 ? 70 + Math.round(rnd() * 150) : 60 + Math.round(rnd() * 200)));
}
/**
 * Friends studying now (sample people; the blocked never show), in the order
 * you chose: by today's time (the default), by name, or your own — and the
 * ones you hid from the list.
 */
export function useFriends(): { list: Friend[]; hidden: Friend[]; sort: FriendSort } {
  const now = useNow(30_000);
  const blocked = useStore((s) => s.blocked);
  const sort = useStore((s) => s.friendSort);
  const order = useStore((s) => s.friendOrder);
  const off = useStore((s) => s.friendHidden);
  return useMemo(() => {
    const since = Math.floor((now - opened) / 1000);
    const list = PEOPLE.filter((p) => !blocked.includes(p.n)).map((p) => {
      const week = weekOf7(p.h);
      const live = p.t + since;
      const today = week[6] + Math.floor(live / 60);
      week[6] = today;
      return { n: p.n, h: p.h, c: p.c, s: p.s, g: p.g, live, today, diff: today - week[5], week };
    });
    const byTime = (a: Friend, b: Friend) => b.today - a.today;
    if (sort === 'name') list.sort((a, b) => a.n.localeCompare(b.n, 'ja'));
    else if (sort === 'mine') {
      // your order first; anyone new comes after, by time
      const at = (f: Friend) => { const i = order.indexOf(f.h); return i < 0 ? Infinity : i; };
      list.sort((a, b) => at(a) - at(b) || byTime(a, b));
    } else list.sort(byTime);
    // the ones you swiped away stay out of the list (and can be brought back)
    return { list: list.filter((f) => !off.includes(f.h)), hidden: list.filter((f) => off.includes(f.h)), sort };
  }, [now, blocked, sort, order, off]);
}

/** Where things are, for any theme. */
export const go = {
  timer: () => router.push('/timer'),
  study: () => router.navigate('/study'),
  record: () => router.push('/record'),
  me: () => router.navigate('/me'),
  settings: () => router.push('/settings'),
  design: () => router.push('/design'),
  notifications: () => router.push('/notifications'),
  search: () => router.push('/search'),
  community: () => router.navigate('/community'),
};

/** '3時間24分' / '45分' */
export const jpHm = (m: number) => {
  const r = Math.max(0, Math.round(m));
  return r >= 60 ? `${Math.floor(r / 60)}時間${r % 60 ? `${r % 60}分` : ''}` : `${r}分`;
};
/** '3:24' (hours:minutes) */
export const hmColon = (m: number) => {
  const r = Math.max(0, Math.round(m));
  return `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`;
};
/** '1:02:03' or '02:03' */
export const clock = (sec: number) => {
  const v = Math.max(0, Math.floor(sec));
  const h = Math.floor(v / 3600), m = Math.floor(v / 60) % 60, x = v % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`;
};
