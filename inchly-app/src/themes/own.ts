import type { ThemeId } from '../design';

/**
 * The themes that draw their whole kit (home, timer, bars, moments — whatever
 * the kit has); the others only their moments. スタンダード and サイバー each
 * draw every part on the standard layout; クラシック has no kit at all (the base
 * renderers draw it). Kept apart from the kits so tests can read it.
 */
export const OWN: ReadonlySet<ThemeId> = new Set<ThemeId>(['standard', 'cyber']);
