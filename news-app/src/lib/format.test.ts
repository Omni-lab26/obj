import type { Article, Comment } from './data/types';
import {
  calcOut,
  calcSnap,
  ago,
  searchArticles,
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

  it('counts my own ▲ when sorting by top', () => {
    const list = [c(1, 5, 0), c(2, 5, 0)];
    expect(sortComments(list, 'top', (x) => x.id === 2).map((x) => x.id)).toEqual([2, 1]);
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

describe('searchArticles', () => {
  const a = (id: string, title: string, extra: Partial<Article> = {}): Article =>
    ({ id, title, tag: '', tm: '', when: '', c: 0, r: 0, blocks: null, ...extra }) as Article;
  const list = [
    a('fomc', 'FOMCは利下げ', { tag: '#FOMC' }),
    a('boj', '日銀は据え置き', { blocks: [{ t: 'p', x: '金利は0.75%のまま' }] }),
  ];
  it('ignores case and full-width letters', () => {
    expect(searchArticles(list, 'fomc').map((x) => x.id)).toEqual(['fomc']);
    expect(searchArticles(list, 'ＦＯＭＣ').map((x) => x.id)).toEqual(['fomc']);
  });
  it('needs every word, and searches the body', () => {
    expect(searchArticles(list, '日銀 金利').map((x) => x.id)).toEqual(['boj']);
    expect(searchArticles(list, '日銀 FOMC')).toEqual([]);
    expect(searchArticles(list, '   ')).toEqual([]);
  });
});

describe('ago', () => {
  it('steps from minutes to hours to days', () => {
    expect(ago(59)).toMatch(/59/);
    expect(ago(60)).toMatch(/1/);
    expect(ago(1439)).toMatch(/23/);
    expect(ago(1440)).toMatch(/1/);
    expect(ago(1440)).not.toMatch(/24/);
    expect(ago(4320)).toMatch(/3/);
  });
});

describe('calcSnap', () => {
  it('keeps values on the step grid and inside the range', () => {
    expect(calcSnap(260 + 10, 120, 600, 10)).toBe(270);
    expect(calcSnap(4000 - 100, 1000, 8000, 100)).toBe(3900);
    expect(calcSnap(5, 120, 600, 10)).toBe(120);
    expect(calcSnap(999, 120, 600, 10)).toBe(600);
  });
});

describe('calcOut', () => {
  it('power and rice', () => {
    // 通貨の書き方（300円 / ¥300）は端末の言語で変わるので、数字だけを見る
    expect(calcOut('power', 260).main).toMatch(/^\+\D*300\D*$/);
    expect(calcOut('rice', 4).main).toMatch(/^\+\D*34,560\D*$/);
  });
  it('loan: 0.25% more on 40M yen over 35 years is about 5,000 yen a month', () => {
    const v = Number(calcOut('loan', 4000).main.replace(/[^\d]/g, ''));
    expect(v).toBeGreaterThan(4500);
    expect(v).toBeLessThan(5500);
  });
});
