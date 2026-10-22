/// <reference types="jest" />
import { expFor, expOf, expOn, GOAL_BONUS, levelOf } from '../exp';

const recs = [
  { s: 'en', min: 120, date: '2026-10-20' },
  { s: 'ma', min: 70, date: '2026-10-20' }, // 190 min: goal reached
  { s: 'ph', min: 40, date: '2026-10-21' }, // short day
];

describe('exp', () => {
  it('a minute is 1 EXP, a goal day adds the bonus', () => {
    expect(expOf(recs, 180)).toBe(190 + GOAL_BONUS + 40);
    expect(expOf(recs, 300)).toBe(230);
  });
  it('counts one day', () => {
    expect(expOn(recs, 180, '2026-10-20')).toBe(190 + GOAL_BONUS);
    expect(expOn(recs, 180, '2026-10-19')).toBe(0);
  });
  it('levels start at 1 and each asks a little more', () => {
    expect(levelOf(0)).toMatchObject({ lv: 1, into: 0, need: expFor(2) });
    expect(levelOf(expFor(5)).lv).toBe(5);
    expect(levelOf(expFor(5) - 1).lv).toBe(4);
    expect(expFor(11) - expFor(10)).toBeGreaterThan(expFor(3) - expFor(2));
  });
  it('progress runs from 0 to just under 1 within a level', () => {
    const l = levelOf(expFor(7) + (expFor(8) - expFor(7)) / 2);
    expect(l.lv).toBe(7);
    expect(l.p).toBeCloseTo(0.5);
  });
});
