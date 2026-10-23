import { themeId, useDesign } from '@/design';
import { useT } from '@/theme';

// 8bit, drawn as one app with three cartridges: レトロゲーム (black windows on
// cream), ドットの夜 (gold on a purple night) and ピコピコ (white on navy over a
// pale blue). The page colors are each theme's own (design.ts THEMES), so the
// screens it shares with every theme match; the windows, the cursor and the
// gauges come from here.

export type Variant = 'retro' | 'dotnight' | 'pico';
type Look = {
  /** a window's ground, its double edge, its text */
  win: string; edge: string; text: string; dim: string; faint: string;
  /** the ▶ cursor, and what is picked */
  cursor: string;
  /** today's gauge, the level gauge, past the goal */
  hp: string; mp: string; exp: string;
  /** the streak's marks */
  mark: 'heart' | 'star';
  /** a window's drop under it, on the page */
  drop: string;
};
const LOOKS: Record<Variant, Look> = {
  retro: {
    win: '#1A1A1A', edge: '#FFFBF0', text: '#FFFBF0', dim: 'rgba(255,251,240,0.62)', faint: 'rgba(255,251,240,0.2)',
    cursor: '#FFD23F', hp: '#F2545B', mp: '#5B8CFF', exp: '#FFB627', mark: 'heart', drop: 'rgba(26,26,26,0.28)',
  },
  dotnight: {
    win: '#241645', edge: '#FFE8A3', text: '#FFE8A3', dim: 'rgba(255,232,163,0.62)', faint: 'rgba(255,232,163,0.2)',
    cursor: '#FFFFFF', hp: '#FF6F91', mp: '#8EC5FF', exp: '#FFD45C', mark: 'star', drop: 'rgba(0,0,0,0.45)',
  },
  pico: {
    win: '#2B2D6E', edge: '#FFFFFF', text: '#FFFFFF', dim: 'rgba(255,255,255,0.66)', faint: 'rgba(255,255,255,0.2)',
    cursor: '#FFD23F', hp: '#FF5C7A', mp: '#5CC8FF', exp: '#FFC233', mark: 'heart', drop: 'rgba(43,45,110,0.3)',
  },
};
const isVariant = (id: string): id is Variant => id in LOOKS;

/** The cartridge in play, its colors, and the page it sits on. */
export function useLook() {
  const id = themeId(useDesign().theme);
  const t = useT();
  const variant: Variant = isVariant(id) ? id : 'retro';
  return { variant, ...LOOKS[variant], page: t.canvas, ink: t.ink, ink2: t.ink2, ink3: t.ink3, dark: t.dark };
}
export type L = ReturnType<typeof useLook>;

export { alpha, bricks, messagePages, say, unitFor } from './count';
export type { Brick } from './count';
