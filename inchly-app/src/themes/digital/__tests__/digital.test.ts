import { litDots, liveDots, meter } from '../dots';
import { cell, colon, heightFor, layout, SEGMENTS } from '../seg';

const part = (c: string, min: number) => ({ c, min });

describe('7-segment figures', () => {
  it('lights the right segments', () => {
    expect(SEGMENTS['8']).toBe('abcdefg');
    expect(SEGMENTS['1']).toBe('bc');
    expect([...SEGMENTS['0']].sort().join('')).toBe('abcdef');
  });

  it('lays a time out left to right, and its width grows with the figures', () => {
    const a = layout('2:45', 80);
    expect(a.items.map((i) => i.kind)).toEqual(['digit', 'colon', 'digit', 'digit']);
    expect(a.items.map((i) => Math.round(i.x))).toEqual([0, 48, 69, 117]);
    expect(layout('12:45', 80).width).toBeGreaterThan(a.width);
    // the same text at twice the height is twice as wide
    expect(layout('2:45', 160).width).toBeCloseTo(a.width * 2, 5);
  });

  it('finds the tallest figures that fit a width', () => {
    const h = heightFor('39:10', 300);
    expect(layout('39:10', h).width).toBeCloseTo(300, 5);
  });

  it('draws seven segments and two colon dots, all inside the cell', () => {
    const c = cell(0, 100);
    expect(Object.keys(c).sort().join('')).toBe('abcdefg');
    for (const pts of [...Object.values(c), ...colon(0, 100)]) {
      for (const p of pts.split(' ')) {
        const [x, y] = p.split(',').map(Number);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(100);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(50 + 10.5);
      }
    }
  });
});

describe('dots and cells', () => {
  it('lights a dot per unit, colored by the subject at its middle', () => {
    // 30 + 20 minutes, a dot per 10: three of A, two of B
    expect(litDots([part('A', 30), part('B', 20)], 10, 6)).toEqual(['A', 'A', 'A', 'B', 'B']);
  });

  it('shows any time at all, and never more than fits', () => {
    expect(litDots([part('A', 3)], 10, 6)).toEqual(['A']);
    expect(litDots([part('A', 200)], 10, 6)).toHaveLength(6);
    expect(litDots([], 10, 6)).toEqual([]);
  });

  it('adds the session under way within the room left', () => {
    expect(liveDots(25, 10, 6)).toBe(3);
    expect(liveDots(2, 10, 6)).toBe(1);
    expect(liveDots(40, 10, 2)).toBe(2);
    expect(liveDots(0, 10, 6)).toBe(0);
  });

  it('fills a bar toward the goal, subject by subject', () => {
    // a 60-minute goal in 6 cells; 25 min of A and 10 of B fill the first cells
    expect(meter([part('A', 25), part('B', 10)], 60, 6)).toEqual(['A', 'A', 'B', null, null, null]);
    expect(meter([], 60, 3)).toEqual([null, null, null]);
  });
});
