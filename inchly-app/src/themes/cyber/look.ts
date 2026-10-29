import type { AreaId } from '@/data';
import { THEMES } from '@/design';

// サイバー's tokens, from its parts bible: a blue-black ground (never pure
// black, so neon has something to fall on), four signals that speak only of
// state, subjects in colors of their own, and city light (warm windows,
// steel distance) that never means anything.

export const C = {
  void: '#03060A', deep: '#060A0F', panel: '#08101A', panel2: '#0C1620', panel3: '#12202B', steel: '#1B2A35',
  /** pressable, selected, goal */
  y: '#FCEE0A',
  /** information, progress, connection (someone studying) */
  c: '#00F0FF',
  /** now, timing, stopped, not done, alerts */
  r: '#FF2D55',
  /** streak, past the plan */
  o: '#FF7A00',
  t1: '#E6F4F5', t2: '#93A9AE', t3: '#6B8087',
  ln: 'rgba(0,240,255,0.15)', ln2: 'rgba(0,240,255,0.4)', lny: 'rgba(252,238,10,0.5)',
  /** city light only: windows, acrylic signs, the departure board's characters */
  warm: '#FFE3A6',
  /** distant city light */
  sky: '#6E8BB8',
};

/** A soft glow around text, in a color. */
export const glow = (c: string, r = 8) => ({ textShadowColor: c, textShadowRadius: r, textShadowOffset: { width: 0, height: 0 } });

// ---------- subjects ----------
/**
 * Each subject wears a pattern inside LED cells too, so two subjects never
 * rely on hue alone: a 教科 and its place among its shades pick one (英語
 * plain, 数学 vertical lines, 国語 dots, 物理 horizontal lines, 化学 a
 * checker, 世界史 hatching — then round again).
 */
export type Pattern = 'none' | 'v' | 'dots' | 'h' | 'check' | 'hatch';
const PATTERNS: Pattern[] = ['none', 'v', 'dots', 'h', 'check', 'hatch'];
const AREA_ORDER: AreaId[] = ['en', 'ma', 'ja', 'sci', 'soc', 'info', 'other'];
const SHADES = THEMES.cyber.subjects.shades as Partial<Record<AreaId, string[]>>;
const OTHERS = Object.values(THEMES.cyber.subjects.other);
/** The pattern of a subject, from its 教科 and its color as サイバー shows it (data.ts toneOf). */
export function patternOf(x: { area: AreaId; c: string }): Pattern {
  const list = SHADES[x.area] ?? OTHERS;
  const at = Math.max(0, list.indexOf(x.c));
  return PATTERNS[(AREA_ORDER.indexOf(x.area) + at) % PATTERNS.length];
}
