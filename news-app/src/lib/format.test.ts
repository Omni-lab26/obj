import type { Article, Comment } from './data/types';
import {
  calcOut,
  clampWidth,
  countComments,
  kfmt,
  kindOf,
  linePoints,
  readingMinutes,
  sortComments,
  splitMarks,
} from './format';

const c = (id: number, up: number, min: number, kids: Comment[] = []): Comment => ({
  id,
  who: 'x',
  t: '',
  up,
  min,
  kids,
});

const base: Article = { id: 'a', tag: '#t', tm: '1:00', when: '', title: 't', c: 0, r: 0, blocks: null };

describe('format', () => {
  it('kfmt', () => {
    expect(kfmt(412)).toBe('412');
    expect(kfmt(1200)).toBe('1.2k');
  });

  it('kindOf', () => {
    expect(kindOf(base)).toBe('slot');
    expect(kindOf({ ...base, brk: true })).toBe('breaking');
    expect(kindOf({ ...base, type: 'note' })).toBe('note');
  });

  it('readingMinutes counts text and headings only, at least 2', () => {
    expect(readingMinutes({ ...base, blocks: [{ t: 'p', x: 'a'.repeat(100) }] })).toBe(2);
    expect(
      readingMinutes({
        ...base,
        blocks: [
          { t: 'p', x: 'a'.repeat(2000) },
          { t: 'h', x: 'b'.repeat(500) },
          { t: 'refs', items: [] },
        ],
      })
    ).toBe(5);
  });

  it('counts nested comments', () => {
    expect(countComments([c(1, 0, 0, [c(2, 0, 0, [c(3, 0, 0)])]), c(4, 0, 0)])).toBe(4);
  });

  it('sorts by top and by new, including replies', () => {
    const list = [c(1, 5, 30, [c(11, 1, 5), c(12, 9, 50)]), c(2, 20, 60)];
    expect(sortComments(list, 'top').map((x) => x.id)).toEqual([2, 1]);
    expect(sortComments(list, 'top')[1].kids.map((x) => x.id)).toEqual([12, 11]);
    expect(sortComments(list, 'new').map((x) => x.id)).toEqual([1, 2]);
  });

  it('splits <mark>', () => {
    expect(splitMarks('賃金は<mark>一部に</mark>みられる')).toEqual([
      { t: '賃金は', mark: false },
      { t: '一部に', mark: true },
      { t: 'みられる', mark: false },
    ]);
  });

  it('line points start at base and end at end, same every time', () => {
    const f = { base: 100, end: 120, n: 10, vol: 5, seed: 3 };
    const p = linePoints(f);
    expect(p).toHaveLength(10);
    expect(p[0]).toBe(100);
    expect(p[9]).toBe(120);
    expect(linePoints(f)).toEqual(p);
  });

  it('clamps width', () => {
    expect(clampWidth(300)).toBe(320);
    expect(clampWidth(393)).toBe(393);
    expect(clampWidth(800)).toBe(440);
  });
});

describe('calcOut', () => {
  it('power and rice', () => {
    expect(calcOut('power', 260).main).toBe('+299円');
    expect(calcOut('rice', 4).main).toBe('+34,560円');
  });
  it('loan: 0.25% more on 40M yen over 35 years is about 5,000 yen a month', () => {
    const v = Number(calcOut('loan', 4000).main.replace(/[^\d]/g, ''));
    expect(v).toBeGreaterThan(4500);
    expect(v).toBeLessThan(5500);
  });
});
