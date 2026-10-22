import { byDay, Rec } from './history';
import { dateKey } from './time';

// Experience and level, worked out from your records every time (nothing is
// stored, so it can't drift from what you actually studied):
//   1 EXP for each minute studied, +GOAL_BONUS for each day you reached your goal,
//   +TODO_EXP for each ToDo finished (counting at most TODO_CAP a day, so a list
//   of tiny ToDos can't stand in for studying).
// Reaching Lv.n takes 72·(n−1)² EXP in all, so each level asks a little more.

export const GOAL_BONUS = 30;
export const TODO_EXP = 10;
export const TODO_CAP = 5;
/** One ToDo finished, on the day it was finished. */
export type Done = { id: string; date: string };
const K = 72;

/** Total EXP needed to reach a level. */
export const expFor = (lv: number) => K * (lv - 1) * (lv - 1);

/** ToDos finished per day. */
function doneByDay(done: readonly Done[]) {
  const out = new Map<string, number>();
  for (const x of done) out.set(x.date, (out.get(x.date) ?? 0) + 1);
  return out;
}
const todoExp = (n: number) => Math.min(n, TODO_CAP) * TODO_EXP;

/** Total EXP from your records and finished ToDos. */
export function expOf(recs: readonly Rec[], goalMin: number, done: readonly Done[] = []): number {
  let exp = 0;
  for (const d of byDay(recs).values()) exp += d.min + (d.min >= goalMin ? GOAL_BONUS : 0);
  for (const n of doneByDay(done).values()) exp += todoExp(n);
  return exp;
}

/** EXP earned on one day (today by default). */
export function expOn(recs: readonly Rec[], goalMin: number, done: readonly Done[] = [], date: string = dateKey()): number {
  const d = byDay(recs).get(date);
  return (d ? d.min + (d.min >= goalMin ? GOAL_BONUS : 0) : 0) + todoExp(done.filter((x) => x.date === date).length);
}

export type Level = { lv: number; exp: number; into: number; need: number; p: number };

/** The level for a total, with how far into it you are. */
export function levelOf(exp: number): Level {
  const lv = Math.floor(Math.sqrt(Math.max(0, exp) / K)) + 1;
  const from = expFor(lv), to = expFor(lv + 1);
  return { lv, exp, into: exp - from, need: to - exp, p: (exp - from) / (to - from) };
}
