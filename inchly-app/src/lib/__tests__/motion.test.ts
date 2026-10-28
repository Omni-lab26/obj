/// <reference types="jest" />
/// <reference types="node" />
// MOTION.md: nothing in the app bounces. A guard over the source, besides the
// lint rules: no under-damped spring, no curve that goes past its end, no
// bouncy entrance, written anywhere.
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..', '..');
const files = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  if (statSync(p).isDirectory()) return n === '__tests__' ? [] : files(p);
  return /\.(ts|tsx)$/.test(n) ? [p] : [];
});
const all = files(SRC).map((p) => ({ p: p.slice(SRC.length + 1), s: readFileSync(p, 'utf8') }));

describe('no bounce anywhere (MOTION.md)', () => {
  it('springs are critically damped', () => {
    const bad = all.flatMap(({ p, s }) => [...s.matchAll(/dampingRatio\s*[:(]\s*(0?\.\d+|0)\b/g)].map((m) => `${p}: ${m[0]}`));
    expect(bad).toEqual([]);
  });
  it('no easing curve goes past its end (a bezier with a y above 1 or below 0)', () => {
    const bad = all.flatMap(({ p, s }) => [...s.matchAll(/Easing\.bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/g)]
      .filter((m) => [m[2], m[4]].some((y) => Number(y) > 1 || Number(y) < 0)).map((m) => `${p}: ${m[0]}`));
    expect(bad).toEqual([]);
  });
  it('no bouncy or zooming entrances, and springs only in ui/motion', () => {
    const bad = all.filter(({ p }) => p !== join('ui', 'motion.ts')).flatMap(({ p, s }) =>
      [...s.matchAll(/\b(withSpring|Bounce(In|Out)\w*|Zoom(In|Out)\w*|Easing\.(back|elastic|bounce))\b/g)].map((m) => `${p}: ${m[0]}`));
    expect(bad).toEqual([]);
  });
});
