import { THEMES } from '@/design';
import type { Slice } from '@/screens/model';

// ピクセル箱: warm paper, near-black ink drawn 2px thick, things that sit on a
// hard shadow and sink when pressed, a lime that means "go", and small pixel
// creatures that live on the page. The base colors are the theme's own
// (design.ts), so the screens it shares with every theme match.
const c = THEMES.piix.colors;

export const P = {
  paper: c.canvas,
  card: c.surface,
  sunk: c.sunken,
  ink: c.ink,
  ink2: c.ink2,
  ink3: c.ink3,
  line: c.line,
  /** "go": start buttons, the selected tab, the pal */
  lime: '#C6F432',
  limeDeep: '#A8D81C',
  coral: '#FF6B4A',
  violet: '#6B4CFF',
  sky: '#58C8FF',
  sun: '#FFD23F',
  /** the dark of the code window, the crowd stage and the ticker */
  night: '#17121F',
  nightUp: '#241D30',
  /** pale grounds a card can open with */
  stage: { lime: '#EEF8CF', lilac: '#E6E0FF', sky: '#DCF1FB', peach: '#FFE4D9', cream: '#FFF2C6' },
};

/** A 2px ink outline, drawn as a shadow so it never takes room. */
export const ring = (c2 = P.ink, w = 2) => `0px 0px 0px ${w}px ${c2}`;
/** Outline and a hard shadow straight down: a thing sitting on the page. */
export const sit = (depth = 4, c2 = P.ink) => `${ring()}, 0px ${depth}px 0px 0px ${c2}`;

/** A color with alpha, from #RRGGBB. */
export const alpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Minutes as cells of `unit` minutes, colored by subject; the session under way last, marked live. */
export type Cell = { c: string; live?: boolean };
export function cells(parts: Slice[], live: number, liveColor: string, unit: number): Cell[] {
  const out: Cell[] = [];
  let acc = 0;
  for (const p of parts) {
    const n = Math.floor((acc + p.min) / unit) - Math.floor(acc / unit);
    for (let i = 0; i < n; i++) out.push({ c: p.c });
    acc += p.min;
  }
  const n = Math.floor((acc + live) / unit) - Math.floor(acc / unit);
  for (let i = 0; i < n; i++) out.push({ c: liveColor, live: true });
  return out;
}
