import { ThemeId, themeId, useDesign } from '../design';
import bit8 from './bit8';
import grid from './grid';
import ink from './ink';
import neon from './neon';
import piix from './piix';
import riso from './riso';
import type { ThemeKit } from './types';

// The theme apps. A theme listed here draws its own home, timer, tab bar and
// moments (whatever its kit has); every other theme is drawn the standard way
// in its own colors and type. Adding one — a partner's, say — is a folder
// (src/themes/<id>/, its kit) plus its line here and its tokens in design.ts THEMES.
const KITS: Partial<Record<ThemeId, ThemeKit>> = { piix, neon, ink, grid, riso, retro: bit8, dotnight: bit8, pico: bit8 };
const NONE: ThemeKit = {};

/** The kit of the theme you picked (empty for themes drawn the standard way). */
export function useThemeKit(): ThemeKit {
  return KITS[themeId(useDesign().theme)] ?? NONE;
}
