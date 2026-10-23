import { compose, fullCount, palettePath, paletteSpots, shares, signature, strokePath, taper } from '../paint';

describe('shares', () => {
  it('splits by minutes and adds up', () => {
    const q = shares(10, [60, 30, 10]);
    expect(q.reduce((a, x) => a + x, 0)).toBe(10);
    expect(q).toEqual([6, 3, 1]);
  });
  it('gives anyone with minutes a stroke when there are enough to go round', () => {
    expect(shares(4, [500, 2, 1])).toEqual([2, 1, 1]);
    expect(shares(1, [5, 5]).reduce((a, x) => a + x, 0)).toBe(1);
  });
  it('gives nothing for nothing', () => {
    expect(shares(0, [10, 20])).toEqual([0, 0]);
    expect(shares(5, [0, 0])).toEqual([0, 0]);
  });
});

describe('compose', () => {
  const parts = [{ id: 'en', c: '#111111', min: 90 }, { id: 'ma', c: '#222222', min: 30 }];
  it('paints nothing for a day with nothing in it (only the underdrawing shows)', () => {
    expect(compose(200, 150, [], 180, 'dab', 's')).toEqual({ strokes: [], cover: 0 });
    expect(compose(200, 150, [{ id: 'en', c: '#000', min: 0 }], 180, 'dab', 's').strokes).toHaveLength(0);
    expect(compose(0, 150, parts, 180, 'dab', 's').strokes).toHaveLength(0);
  });
  it('covers the canvas at the goal, in proportion before it, a little more past it', () => {
    const full = fullCount(200, 150);
    expect(compose(200, 150, parts, 120, 'dab', 's').strokes).toHaveLength(full);
    expect(compose(200, 150, parts, 240, 'dab', 's').strokes).toHaveLength(Math.round(full / 2));
    expect(compose(200, 150, parts, 240, 'dab', 's').cover).toBe(0.5);
    expect(compose(200, 150, parts, 60, 'dab', 's').strokes).toHaveLength(Math.round(full * 1.3));
    expect(compose(200, 150, parts, 60, 'dab', 's').cover).toBe(1);
    expect(compose(200, 150, parts, 0, 'dab', 's').cover).toBe(1);
  });
  it('gives each subject strokes by its minutes, its colors spread out, the last of them wet for the minutes under way', () => {
    const p = compose(300, 220, [{ id: 'en', c: '#111111', min: 90, live: 30 }, { id: 'ma', c: '#222222', min: 30 }], 120, 'swirl', 'x');
    const en = p.strokes.filter((s) => s.c === '#111111');
    const ma = p.strokes.filter((s) => s.c === '#222222');
    expect(en.length).toBe(Math.round(p.strokes.length * 0.75));
    expect(en.length + ma.length).toBe(p.strokes.length);
    expect(en.filter((s) => s.wet)).toHaveLength(Math.round(en.length / 3));
    expect(ma.some((s) => s.wet)).toBe(false);
    // the wet ones are the last laid of that color
    const order = p.strokes.map((s) => s.c === '#111111' && s.wet);
    expect(order.lastIndexOf(false) < order.length).toBe(true);
    expect(en.slice(-1)[0].wet).toBe(true);
    // the minority color isn't bunched at the end
    expect(p.strokes.findIndex((s) => s.c === '#222222')).toBeLessThan(p.strokes.length / 2);
  });
  it('paints the same day the same way', () => {
    expect(compose(200, 150, parts, 180, 'wash', 'today')).toEqual(compose(200, 150, parts, 180, 'wash', 'today'));
  });
});

describe('strokes and the rest', () => {
  it('thins at both ends and is full in the middle', () => {
    expect(taper(0.5)).toBe(1);
    expect(taper(0)).toBeLessThan(0.3);
    expect(taper(1)).toBeLessThan(0.3);
  });
  it('draws closed outlines and open signatures that stay in their box', () => {
    expect(strokePath([[0, 0], [10, 2], [20, 0]], 6, 1)).toMatch(/^M.*Z$/);
    const sig = signature(240, 40, 'はる');
    expect(sig.d.startsWith('M')).toBe(true);
    expect(sig.len).toBeGreaterThan(240);
    const nums = sig.d.replace(/[MC]/g, ' ').trim().split(/\s+/).map(Number);
    for (let i = 1; i < nums.length; i += 2) { expect(nums[i]).toBeGreaterThanOrEqual(-6); expect(nums[i]).toBeLessThanOrEqual(46); }
  });
  it('puts the week on the palette, inside it', () => {
    const spots = paletteSpots(170, 120);
    expect(spots).toHaveLength(7);
    for (const [x, y] of spots) { expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(170); expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(120); }
    expect(palettePath(170, 120)).toMatch(/Z.*A.*Z$/);
  });
});
