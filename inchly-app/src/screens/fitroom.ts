import { type ThemeId, THEMES_SHOWN, themeShown } from '../design';

// 試着室 (the デザイン page): the themes side by side, each as a photo of home
// and of the timer, slid through with a finger. What the page needs to know
// and decide, kept apart from the drawing so tests can read it (no React Native).

/** The themes on the page, in their order (design.ts THEMES_SHOWN: the main one first, the sub one last). */
export const FIT_IDS: ThemeId[] = THEMES_SHOWN.filter((id) => themeShown(id));

/** What each theme is, in a line, under its name. */
export const FIT_LINE: Partial<Record<ThemeId, string>> = {
  standard: '紙とインクに、ライムの差し色。ドット絵の住人がいる',
  cyber: '夜の街の勉強端末。黒い画面に、黄色とシアンの光',
  classic: '前の見た目。白いカードと、すりガラスのバー',
};

export type FitView = 'home' | 'timer';
/** The photos' shape (assets/themes, shot at 390×740pt): width over height. */
export const FIT_ASPECT = 390 / 740;
/** Room between two cards. */
export const FIT_GAP = 14;

/** The card's size and where it sits, from the room the carousel has. */
export function fitGeometry(w: number, h: number) {
  // room above (6) and below (10) for the frame's outline and shadow
  let ch = Math.max(0, h - 16);
  let cw = Math.round(ch * FIT_ASPECT);
  // a short, wide room (a landscape window): the neighbours still peek in
  if (cw > w * 0.8) { cw = Math.round(w * 0.8); ch = Math.round(cw / FIT_ASPECT); }
  return { w: cw, h: ch, step: cw + FIT_GAP, off: (w - cw) / 2 };
}

/**
 * Past the first or the last, the track gives a third of the finger's way
 * (it shows there's nothing more, and never springs back past its place).
 */
export function fitRubber(p: number, last: number) {
  'worklet';
  if (p < 0) return p / 3;
  if (p > last) return last + (p - last) / 3;
  return p;
}

/**
 * Where a drag lands: the next or previous theme once the finger went a third
 * of a card or flicked (in points a second), else back where it started.
 */
export function fitLanding(from: number, dx: number, vx: number, step: number, count: number) {
  'worklet';
  let to = from;
  if (dx < -step * 0.3 || vx < -350) to = from + 1;
  else if (dx > step * 0.3 || vx > 350) to = from - 1;
  return Math.max(0, Math.min(count - 1, to));
}
