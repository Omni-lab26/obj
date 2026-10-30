import { THEMES } from '@/design';

// スタンダード: the introduction site's look in the app — paper, ink drawn 2pt
// thick, a lime that means "start" and "picked", and Inchly's own pixel
// creatures. The base colors are the theme's (design.ts THEMES.standard), so
// the screens it shares with every theme match; these are the rest.
//
// The one rule for edges and shadows:
//   ring (2pt ink)            a thing that rests (cards, row boxes, tags): no shadow
//   ring + floor (ink below)  a thing you press (keys, chips, the header's plate, the two bars)
//   ring + lift (lime, 6/6)   what floats, and the one lead card a screen
//   sticker shadow            badges and stamps (white rim, slanted faint shadow)
const c = THEMES.standard.colors;

export const S = {
  paper: c.canvas,
  paper2: c.sunken,
  card: c.surface,
  ink: c.ink,
  ink2: c.ink2,
  ink3: c.ink3,
  line: c.line,
  line2: c.line2,
  onInk: c.onInk,
  /** start, and what's picked (tabs, chips) — never data */
  lime: '#C6F432',
  limeDeep: '#A8D81C',
  /** the clock running (the green of study and the grass), its words */
  run: '#1FA35B',
  runInk: '#148246',
  /** paused: the app's crimson */
  pause: '#D7003A',
  /** a deadline close, the plan's time gone by */
  due: '#E58A00',
  over: '#FF9F0A',
  up: '#148246',
  down: '#C8302A',
  /** unread dots only */
  unread: '#FF6B4A',
  /** decoration (the dotted wells, a heading's square, the week's boxes): never data */
  sun: '#FFD23F',
  sky: '#58C8FF',
  coral: '#FF6B4A',
  /** the logo's five ticks, low to high */
  ticks: ['#E5484D', '#F2C46D', '#9AB8DB', '#5B8DEF', '#9D7BF5'],
};

/** How tall a pressable thing's floor is. */
export const KD = 4;
/** An outline, drawn as a shadow so it never takes room. */
export const ring = (w = 2, color = S.ink) => `0px 0px 0px ${w}px ${color}`;
/** The ink floor under something you press (as wide as its outline). */
export const floor = (kd = KD, color = S.ink) => `0px ${kd}px 0px 2px ${color}`;
/** The lime shadow of what floats, and of the one lead card. */
export const LIFT = `${ring()}, 6px 6px 0px 0px ${S.limeDeep}`;
/** The faint outline of a tag. */
export const RING_SOFT = ring(1.5, 'rgba(23,18,31,0.16)');

/** Corners. */
export const R = { card: 22, mid: 14, key: 12, chip: 9, bar: 20, tile: 10 };
/** The page's side margin, and the room between blocks. */
export const GUTTER = 16;
export const GAP = 12;

/** a mixed with b: `t` of a (both #rrggbb), as color-mix in the mock does it. */
export function mix(a: string, b: string, t: number) {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(ch(a, i) * t + ch(b, i) * (1 - t)).toString(16).padStart(2, '0')).join('')}`;
}
/** The sticker's shadow: a white rim, the ink outline, and a faint slanted shadow (never the floor's: it isn't pressable). */
export const STICKER = `0px 0px 0px 3px #FFFFFF, 0px 0px 0px 5px ${S.ink}, 3px 4px 0px 5px rgba(23,18,31,0.22)`;
