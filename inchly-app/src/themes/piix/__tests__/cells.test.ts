import { cells } from '../look';

const part = (c: string, min: number) => ({ id: c, name: c, c, min });

describe('cells', () => {
  it('turns minutes into whole cells, subject by subject, rounding at the running total', () => {
    // 25 + 17 = 42 minutes: cells end at 20 (A), 40 (B); the 2 left over make no cell
    expect(cells([part('A', 25), part('B', 17)], 0, 'L', 10).map((x) => x.c)).toEqual(['A', 'A', 'B', 'B']);
  });

  it('puts the session under way last, marked live', () => {
    const out = cells([part('A', 15)], 26, 'L', 10);
    expect(out).toEqual([{ c: 'A' }, { c: 'L', live: true }, { c: 'L', live: true }, { c: 'L', live: true }]);
  });

  it('has nothing for nothing', () => {
    expect(cells([], 0, 'L', 10)).toEqual([]);
    expect(cells([part('A', 9)], 0, 'L', 10)).toEqual([]);
  });
});
