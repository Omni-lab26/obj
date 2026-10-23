import { blobRect, inky, paintTurf, splatPath } from '../paint';

describe('paintTurf', () => {
  it('paints nothing for a day with nothing in it', () => {
    expect(paintTurf(14, 7, [], 240)).toEqual({ cells: [], covered: 0, total: 98 });
    expect(paintTurf(14, 7, [{ id: 'en', c: '#000', min: 0 }], 240).cells).toHaveLength(0);
    expect(paintTurf(0, 7, [{ id: 'en', c: '#000', min: 60 }], 240).cells).toHaveLength(0);
  });

  it('covers the turf in proportion to the goal, each cell once', () => {
    const t = paintTurf(14, 7, [{ id: 'en', c: '#111', min: 60 }, { id: 'ma', c: '#222', min: 60 }], 240);
    expect(t.covered).toBe(Math.round(98 / 2));
    expect(new Set(t.cells.map((c) => c.i)).size).toBe(t.cells.length);
    // equal minutes, equal shares (49 cells: 25 and 24)
    expect(Math.abs(t.cells.filter((c) => c.c === '#111').length - t.cells.filter((c) => c.c === '#222').length)).toBeLessThanOrEqual(1);
    for (const c of t.cells) {
      expect(c.x).toBeGreaterThanOrEqual(0); expect(c.x).toBeLessThan(14);
      expect(c.y).toBeGreaterThanOrEqual(0); expect(c.y).toBeLessThan(7);
    }
  });

  it('stops at the whole turf past the goal, and works with no goal', () => {
    expect(paintTurf(14, 7, [{ id: 'en', c: '#111', min: 600 }], 240).covered).toBe(98);
    expect(paintTurf(14, 7, [{ id: 'en', c: '#111', min: 5 }], 0).covered).toBe(98);
  });

  it('marks the last cells of a part wet for the minutes still under way', () => {
    const t = paintTurf(10, 5, [{ id: 'en', c: '#111', min: 100, live: 50 }], 100);
    expect(t.cells.filter((c) => c.live)).toHaveLength(25);
  });

  it('paints the same day the same way', () => {
    const a = paintTurf(12, 6, [{ id: 'en', c: '#111', min: 70 }, { id: 'ma', c: '#222', min: 20 }], 240);
    const b = paintTurf(12, 6, [{ id: 'en', c: '#111', min: 70 }, { id: 'ma', c: '#222', min: 20 }], 240);
    expect(a).toEqual(b);
  });
});

describe('shapes', () => {
  it('draws closed paths with real numbers', () => {
    for (const d of [splatPath(50, 50, 30, 'a'), blobRect(300, 60, 'b')]) {
      expect(d.startsWith('M')).toBe(true);
      expect(d.endsWith('Z')).toBe(true);
      expect(d).not.toMatch(/NaN|Infinity/);
    }
  });

  it('keeps a blob inside its box', () => {
    const nums = blobRect(320, 64, 'go').match(/-?\d+(\.\d+)?/g)!.map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(-2); expect(Math.max(...xs)).toBeLessThanOrEqual(322);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(-2); expect(Math.max(...ys)).toBeLessThanOrEqual(66);
  });

  it('lifts dark colors off the asphalt and leaves bright ones', () => {
    expect(inky('#FF3E8A')).toBe('#FF3E8A');
    expect(inky('#1E3A8A')).not.toBe('#1E3A8A');
    expect(inky('nope')).toBe('#FF3E8A');
  });
});
