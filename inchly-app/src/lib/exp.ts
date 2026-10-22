import { byDay, Rec } from './history';
import { dateKey } from './time';

// Experience and level, worked out from your records every time (nothing is
// stored, so it can't drift from what you actually studied):
//   1 EXP for each minute studied, +GOAL_BONUS for each day you reached your goal.
// Reaching Lv.n takes 72·(n−1)² EXP in all, so each level asks a little more.

export const GOAL_BONUS = 30;
const K = 72;

/** Total EXP needed to reach a level. */
export const expFor = (lv: number) => K * (lv - 1) * (lv - 1);

/** Total EXP from your records. */
export function expOf(recs: readonly Rec[], goalMin: number): number {
  let exp = 0;
  for (const d of byDay(recs).values()) exp += d.min + (d.min >= goalMin ? GOAL_BONUS : 0);
  return exp;
}

/** EXP earned on one day (today by default). */
export function expOn(recs: readonly Rec[], goalMin: number, date: string = dateKey()): number {
  const d = byDay(recs).get(date);
  return d ? d.min + (d.min >= goalMin ? GOAL_BONUS : 0) : 0;
}

export type Level = { lv: number; exp: number; into: number; need: number; p: number };

/** The level for a total, with how far into it you are. */
export function levelOf(exp: number): Level {
  const lv = Math.floor(Math.sqrt(Math.max(0, exp) / K)) + 1;
  const from = expFor(lv), to = expFor(lv + 1);
  return { lv, exp, into: exp - from, need: to - exp, p: (exp - from) / (to - from) };
}
