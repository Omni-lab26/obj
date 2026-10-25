import { ThemeId, themeId, useDesign } from '../design';
import bit8 from './bit8';
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
// moments (whatever its kit has). For now every theme keeps the standard
// layout and sizes — a theme changes colors, type, corners and textures only
// — so only the kits' moments are used (OWN_LAYOUT turns the rest back on).
// Adding one — a partner's, say — is a folder (src/themes/<id>/, its kit) plus
// its line here and its tokens in design.ts THEMES. A family's colorways share one kit.
const KITS: Partial<Record<ThemeId, ThemeKit>> = {
  lcd: digital, terminal: digital, cyber: digital,
  retro: bit8, dotnight: bit8, pico: bit8,
  yumekawa: kawaii, milktea: kawaii, soda: kawaii,
  sunflower: oil, starry: oil, lily: oil,
  piix, neon, ink, grid, riso,
};
const NONE: ThemeKit = {};
/** Themes draw their own home, timer and bars (off: every theme uses the standard layout). */
const OWN_LAYOUT = false;
const MOMENTS_ONLY = new Map(Object.values(KITS).map((k) => [k, { moments: k!.moments } as ThemeKit]));

/** The kit of the theme you picked (empty for themes drawn the standard way). */
export function useThemeKit(): ThemeKit {
  const kit = KITS[themeId(useDesign().theme)];
  if (!kit) return NONE;
  return OWN_LAYOUT ? kit : MOMENTS_ONLY.get(kit)!;
}
