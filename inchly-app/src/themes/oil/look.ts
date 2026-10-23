import { useMemo } from 'react';

import { themeId, useDesign } from '@/design';
import { useT } from '@/theme';
import type { Brush } from './paint';

// 油絵: one studio, three lights. ひまわり paints at noon in dabs, 星月夜 at
// night in swirls, 睡蓮 by the water in long washes. The screens' colors come
// from the theme (design.ts); what a variant adds is here: the brush, the
// canvas and its ground, the wood, the label paper, and the words.

export type OilId = 'sunflower' | 'starry' | 'lily';
type Variant = {
  brush: Brush;
  /** unprimed canvas, and the wash the day is painted over */
  raw: string; ground: string;
  /** paint that's still wet, the start button, the focused tab; `mark` is the same hue dark enough for text on the wall */
  accent: string; onAccent: string; mark: string;
  /** the easel, the palette */
  wood: string; woodDark: string; woodLight: string;
  /** museum labels */
  paper: string; paperInk: string; paperInk2: string;
  /** the tab bar: a tray along the foot of the easel */
  tray: string; trayInk: string; trayInk2: string;
  /** what the variant adds to a finished canvas, apart from the data */
  deco: 'none' | 'stars' | 'ripples';
  /** today's painting is called 《title》; the studio */
  title: string; room: string;
};
export const OIL: Record<OilId, Variant> = {
  sunflower: {
    brush: 'dab', raw: '#F4EBD6', ground: '#E2B65A', accent: '#D98E04', onAccent: '#2E2214', mark: '#9A5F00',
    wood: '#8A5A2B', woodDark: '#5E3B19', woodLight: '#B07A43',
    paper: '#FBF6EA', paperInk: '#2E2214', paperInk2: '#6B5838',
    tray: '#3A2A19', trayInk: '#F5EBD3', trayInk2: 'rgba(245,235,211,0.62)',
    deco: 'none', title: '真昼', room: '昼のアトリエ',
  },
  starry: {
    brush: 'swirl', raw: '#E9E2CF', ground: '#1F3474', accent: '#F4D35E', onAccent: '#18233F', mark: '#F4D35E',
    wood: '#7A5C40', woodDark: '#4A3424', woodLight: '#A68260',
    paper: '#F4ECD6', paperInk: '#1A2240', paperInk2: '#59607A',
    tray: '#0C1430', trayInk: '#F4E3A3', trayInk2: 'rgba(244,227,163,0.58)',
    deco: 'stars', title: '夜更け', room: '夜のアトリエ',
  },
  lily: {
    brush: 'wash', raw: '#F2EFE8', ground: '#A9BED3', accent: '#C46F98', onAccent: '#FFFFFF', mark: '#A2416F',
    wood: '#B4A182', woodDark: '#857456', woodLight: '#D3C4A6',
    paper: '#FAFAF6', paperInk: '#253A4E', paperInk2: '#5E7183',
    tray: '#22384B', trayInk: '#EEF2EF', trayInk2: 'rgba(238,242,239,0.6)',
    deco: 'ripples', title: '水面', room: '水辺のアトリエ',
  },
};
const isOil = (id: string): id is OilId => id in OIL;

/** The theme's colors and this variant's studio. */
export function useOil() {
  const t = useT();
  const raw = themeId(useDesign().theme);
  const id: OilId = isOil(raw) ? raw : 'sunflower';
  return useMemo(() => ({ t, v: OIL[id], id }), [t, id]);
}
export type Oil = ReturnType<typeof useOil>;

// ---------- frames: they get grander as you level up ----------
export type Tier = 'wood' | 'silver' | 'gold' | 'grand';
export const TIERS: Record<Tier, { label: string; from: number; hi: string; mid: string; lo: string; line: string }> = {
  wood: { label: '木の額', from: 1, hi: '#B98A57', mid: '#8A5E34', lo: '#5A3B1E', line: '#3E2914' },
  silver: { label: '銀の額', from: 10, hi: '#F1F3F5', mid: '#B9BEC6', lo: '#7D838D', line: '#5A606A' },
  gold: { label: '金の額', from: 20, hi: '#F6DE8D', mid: '#C99A2E', lo: '#86601A', line: '#5E420F' },
  grand: { label: '飾り金の額', from: 30, hi: '#FFE9A8', mid: '#D4A63A', lo: '#8F6516', line: '#5E420F' },
};
export const tierOf = (lv: number): Tier => (lv >= TIERS.grand.from ? 'grand' : lv >= TIERS.gold.from ? 'gold' : lv >= TIERS.silver.from ? 'silver' : 'wood');
/** The next frame, and the level that brings it (none past the grandest). */
export const nextTier = (lv: number): { tier: Tier; at: number } | null => {
  const t = tierOf(lv);
  const next: Tier | null = t === 'wood' ? 'silver' : t === 'silver' ? 'gold' : t === 'gold' ? 'grand' : null;
  return next ? { tier: next, at: TIERS[next].from } : null;
};

/** A hex color made lighter (k > 0, toward white) or darker (k < 0, toward black). */
export function shade(hex: string, k: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  if (Number.isNaN(n)) return hex;
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k)));
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
