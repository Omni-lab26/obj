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
import riso from './riso';
import type { ThemeKit } from './types';

// The theme apps. A theme listed here can draw its own home, timer, tab bar and
// moments (whatever its kit has). For now most themes keep the standard
// layout and sizes — a theme changes colors, type, corners and textures only
// — so only their kits' moments are used; a theme in OWN draws the rest of
// its kit too (サイバー: on the standard layout, every part its own).
// Adding one — a partner's, say — is a folder (src/themes/<id>/, its kit) plus
// its line here and its tokens in design.ts THEMES. A family's colorways share one kit.
const KITS: Partial<Record<ThemeId, ThemeKit>> = {
  lcd: digital, terminal: digital, cyber,
  retro: bit8, dotnight: bit8, pico: bit8,
  yumekawa: kawaii, milktea: kawaii, soda: kawaii,
  sunflower: oil, starry: oil, lily: oil,
  piix, neon, ink, grid, riso,
};
const NONE: ThemeKit = {};
/** The themes that draw their whole kit (home, timer, bars, moments); the others only their moments. */
const OWN = new Set<ThemeId>(['cyber']);
const MOMENTS_ONLY = new Map(Object.values(KITS).map((k) => [k, { moments: k!.moments } as ThemeKit]));

/** The kit of the theme you picked (empty for themes drawn the standard way). */
export function useThemeKit(): ThemeKit {
  const id = themeId(useDesign().theme);
  const kit = KITS[id];
  if (!kit) return NONE;
  return OWN.has(id) ? kit : MOMENTS_ONLY.get(kit)!;
}
