import { ThemeId, themeId, useDesign } from '../design';
import bit8 from './bit8';
import cyber from './cyber';
import digital from './digital';
import grid from './grid';
import ink from './ink';
import kawaii from './kawaii';
import neon from './neon';
import oil from './oil';
import piix from './piix';
import { OWN } from './own';
import riso from './riso';
import standard from './standard';
import type { ThemeKit } from './types';

// The theme apps. A theme listed here can draw its own home, timer, tab bar and
// moments (whatever its kit has). For now most themes keep the standard
// layout and sizes — a theme changes colors, type, corners and textures only
// — so only their kits' moments are used; a theme in OWN (./own.ts) draws the
// rest of its kit too (スタンダード, サイバー: on the standard layout, every part
// their own). クラシック has no kit: the base renderers draw it.
// Adding one — a partner's, say — is a folder (src/themes/<id>/, its kit) plus
// its line here and its tokens in design.ts THEMES. A family's colorways share one kit.
const KITS: Partial<Record<ThemeId, ThemeKit>> = {
  standard,
  lcd: digital, terminal: digital, cyber,
  retro: bit8, dotnight: bit8, pico: bit8,
  yumekawa: kawaii, milktea: kawaii, soda: kawaii,
  sunflower: oil, starry: oil, lily: oil,
  piix, neon, ink, grid, riso,
};
const NONE: ThemeKit = {};
const MOMENTS_ONLY = new Map(Object.values(KITS).map((k) => [k, { moments: k!.moments } as ThemeKit]));

/** The kit of the theme you picked (empty for themes drawn the standard way). */
export function useThemeKit(): ThemeKit {
  const id = themeId(useDesign().theme);
  const kit = KITS[id];
  if (!kit) return NONE;
  return OWN.has(id) ? kit : MOMENTS_ONLY.get(kit)!;
}
