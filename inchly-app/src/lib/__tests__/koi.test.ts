/// <reference types="jest" />
import { feed, makePond, MARKS, paint, POND, SEA, step, WATER } from '../koi';

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
  it('is pale water (so the app stays white), dark only when asked, and a koi still stands out from it', () => {
    const p = makePond(36, 78, 3, 5);
    expect(p.pale).toBe(true);
    expect(p.water).toBe(POND);
    expect(makePond(36, 78, 3, 5, 'koi', 'dark').water).toBe(WATER);
    for (let i = 0; i < 60; i++) step(p, 1 / 30);
    paint(p);
    // the marks around each koi are darker than the water
    const lum = (c: number) => ((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11;
    let n = 0, sum = 0;
    for (let i = 0; i < p.cols * p.rows; i++) if (p.cover[i] > 0 && p.tile[i] === 0 && p.mark[i]) { n++; sum += lum(p.markRGB[i]); }
    expect(n).toBeGreaterThan(20);
    expect(sum / n).toBeLessThan(lum(POND) - 40);
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

describe('the sea, with sharks', () => {
  it('has only sharks, on pale water, and no lily pads', () => {
    const p = makePond(44, 95, 31, 4, 'shark');
    expect(p.sea).toBe(true);
    expect(p.water).toBe(SEA);
    expect(p.pads.length).toBe(0);
    expect(p.koi.every((k) => k.kind >= 6)).toBe(true);
    // slimmer than koi, for their length
    expect(p.koi.every((k) => k.w / k.len < 0.15)).toBe(true);
  });
  it('keeps them in the sea and off the card', () => {
    const p = makePond(44, 95, 31, 4, 'shark');
    p.avoid = { x0: 6, y0: 13, x1: 37, y1: 62 };
    for (let i = 0; i < 300; i++) step(p, 1 / 30); // as in the app: already swimming when it shows
    let under = 0, seen = 0;
    for (let i = 0; i < 30 * 120; i++) {
      step(p, 1 / 30);
      if (i % 30) continue;
      for (const k of p.koi) {
        seen++;
        if (k.x > 6 && k.x < 37 && k.y > 13 && k.y < 62) under++;
      }
    }
    expect(under / seen).toBeLessThan(0.03);
    for (const k of p.koi) {
      expect(k.x).toBeGreaterThan(-k.len * 0.6);
      expect(k.x).toBeLessThan(p.cols + k.len * 0.6);
    }
  });
  it('paints the sharks, and the light on the water as dashes', () => {
    const p = makePond(44, 95, 31, 4, 'shark');
    for (let i = 0; i < 60; i++) step(p, 1 / 30);
    paint(p);
    const tiles = p.tile.reduce((n, v) => n + (v > 0.5 ? 1 : 0), 0);
    const dashes = p.mark.reduce((n, v) => n + (MARKS[v] === 'dash' ? 1 : 0), 0);
    expect(tiles).toBeGreaterThan(80);
    expect(dashes).toBeGreaterThan(10);
  });
});
