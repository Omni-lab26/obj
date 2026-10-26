/// <reference types="jest" />
import { feed, makePond, paint, step } from '../koi';

describe('the koi pond', () => {
  it('keeps its koi in (or just past the edge of) the pond, bodies whole', () => {
    const p = makePond(36, 78, 3, 5);
    for (let i = 0; i < 30 * 120; i++) step(p, 1 / 30); // two minutes
    for (const k of p.koi) {
      expect(k.x).toBeGreaterThan(-k.len * 0.6);
      expect(k.x).toBeLessThan(p.cols + k.len * 0.6);
      expect(k.y).toBeGreaterThan(-k.len * 0.6);
      expect(k.y).toBeLessThan(p.rows + k.len * 0.6);
      const seg = Math.hypot(k.sx[1] - k.sx[0], k.sy[1] - k.sy[0]);
      expect(seg).toBeCloseTo(k.len / 10, 3);
    }
  });
  it('draws the deep koi before the ones near the surface', () => {
    const p = makePond(36, 78, 3, 5);
    const d = p.koi.map((k) => k.depth);
    expect([...d].sort((a, b) => b - a)).toEqual(d);
  });
  it('the koi come for food and eat it', () => {
    const p = makePond(30, 50, 9, 4);
    const k = p.koi[p.koi.length - 1];
    feed(p, k.x + Math.cos(k.a) * 4, k.y + Math.sin(k.a) * 4);
    const given = p.food.length;
    expect(given).toBeGreaterThan(2);
    for (let i = 0; i < 30 * 30 && p.food.length; i++) step(p, 1 / 30);
    expect(p.food.length).toBeLessThan(given);
  });
  it('paints tiles and marks into the grid', () => {
    const p = makePond(36, 78, 3, 5);
    for (let i = 0; i < 60; i++) step(p, 1 / 30);
    paint(p);
    const tiles = p.tile.reduce((n, v) => n + (v > 0.5 ? 1 : 0), 0);
    const marks = p.mark.reduce((n, v) => n + (v ? 1 : 0), 0);
    expect(tiles).toBeGreaterThan(100);
    expect(marks).toBeGreaterThan(tiles);
  });
});
