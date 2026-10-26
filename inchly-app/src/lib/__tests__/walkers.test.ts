/// <reference types="jest" />
import { crowdUniforms, makeCrowd, MAX_WALKERS, stepCrowd } from '../walkers';

describe('people walking over the floor', () => {
  it('come and go, a few at a time', () => {
    const c = makeCrowd(393, 852, 4, 3);
    const seen = new Set<number>();
    for (let i = 0; i < 30 * 90; i++) { stepCrowd(c, 1 / 30); c.walkers.forEach((w) => seen.add(w.id)); expect(c.walkers.length).toBeLessThanOrEqual(3); }
    expect(seen.size).toBeGreaterThan(3);
  });
  it('step with one foot planted while the other swings', () => {
    const c = makeCrowd(393, 852, 4, 1);
    let both = 0, frames = 0;
    for (let i = 0; i < 30 * 20; i++) {
      stepCrowd(c, 1 / 30);
      const w = c.walkers[0];
      if (!w || w.v < 10) continue;
      frames++;
      if (w.feet[0].lift > 0.05 && w.feet[1].lift > 0.05) both++;
    }
    expect(frames).toBeGreaterThan(100);
    expect(both).toBe(0);
  });
  it('keep their feet off the card', () => {
    const c = makeCrowd(393, 852, 9, 4);
    c.avoid = { x0: 56, y0: 200, x1: 337, y1: 640 };
    let on = 0, steps = 0;
    for (let i = 0; i < 30 * 120; i++) {
      stepCrowd(c, 1 / 30);
      for (const w of c.walkers) for (const f of w.feet) {
        if (f.lift > 0.05) continue;
        steps++;
        if (f.x > 70 && f.x < 323 && f.y > 214 && f.y < 626) on++;
      }
    }
    expect(steps).toBeGreaterThan(500);
    expect(on / steps).toBeLessThan(0.02);
  });
  it('pack into the shader uniforms, empty places out of sight', () => {
    const c = makeCrowd(393, 852, 4, 2);
    for (let i = 0; i < 60; i++) stepCrowd(c, 1 / 30);
    const u = { bodies: new Array(MAX_WALKERS * 4).fill(0), heads: new Array(MAX_WALKERS * 4).fill(0), feet: new Array(MAX_WALKERS * 8).fill(0) };
    crowdUniforms(c, u);
    expect(u.bodies[(MAX_WALKERS - 1) * 4 + 3]).toBe(0);
    expect(u.feet[(MAX_WALKERS * 2 - 1) * 4 + 3]).toBe(1);
  });
});
