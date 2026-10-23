import { bricks, messagePages, say, unitFor } from '../count';

describe('bricks', () => {
  const parts = [{ c: 'a', min: 25 }, { c: 'b', min: 10 }];
  it('rounds a chart column up, so any minutes show', () => {
    expect(bricks(parts, 0, 'x', 10).map((b) => b.c)).toEqual(['a', 'a', 'a', 'b']);
    expect(bricks([{ c: 'a', min: 1 }], 0, 'x', 10)).toHaveLength(1);
  });
  it('fills a gauge with whole blocks only', () => {
    expect(bricks(parts, 0, 'x', 10, false).map((b) => b.c)).toEqual(['a', 'a', 'b']);
    expect(bricks([{ c: 'a', min: 9 }], 0, 'x', 10, false)).toHaveLength(0);
  });
  it('puts the live minutes last, marked', () => {
    const out = bricks(parts, 20, 'x', 10, false);
    expect(out.slice(-2)).toEqual([{ c: 'x', live: true }, { c: 'x', live: true }]);
    expect(out.filter((b) => b.live)).toHaveLength(2);
  });
});

describe('unitFor', () => {
  it('picks a multiple of 5 that fits the tallest column', () => {
    expect(unitFor(60, 12)).toBe(5);
    expect(unitFor(180, 14)).toBe(15);
    expect(unitFor(0, 14)).toBe(5);
    expect(Math.ceil(301 / unitFor(301, 14))).toBeLessThanOrEqual(14);
  });
});

describe('say', () => {
  it('says minutes the way the windows do', () => {
    expect(say(0)).toBe('0分');
    expect(say(45)).toBe('45分');
    expect(say(120)).toBe('2時間');
    expect(say(165)).toBe('2時間45分');
  });
});

describe('messagePages', () => {
  const base = { name: 'はる', running: false, paused: false, subject: '英語', min: 0, goal: 180, streak: 0 };
  it('greets a day with nothing yet', () => {
    expect(messagePages(base)).toEqual(['はるの きょうが はじまった。\nまずは 5分だけ やってみよう。']);
  });
  it('tells the session under way first, then the day', () => {
    const p = messagePages({ ...base, running: true, min: 60 });
    expect(p[0]).toContain('英語を 勉強している');
    expect(p[1]).toContain('1時間 勉強した');
  });
  it('celebrates the goal, the streak, and offers what is next', () => {
    const p = messagePages({ ...base, min: 200, streak: 5, next: '19:00からの 数学' });
    expect(p[0]).toContain('たっせい');
    expect(p).toContain('5日 れんぞくで つづけている！');
    expect(p[p.length - 1]).toContain('19:00からの 数学');
  });
});
