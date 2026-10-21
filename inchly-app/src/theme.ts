import { Platform, StyleSheet, TextStyle } from 'react-native';
import { Easing } from 'react-native-reanimated';

// Light only, in iOS system colours: grouped background, white groups, black
// labels with two lighter steps, hairline separators. One app colour — the
// grass green — marks everything you can press. See docs/design/apple-feel.md.
const light = {
  canvas: '#F2F2F7', // systemGroupedBackground
  surface: '#FFFFFF', // secondarySystemGroupedBackground
  sunken: 'rgba(118,118,128,0.12)', // tertiarySystemFill
  line: 'rgba(60,60,67,0.18)', // separator (a touch lighter)
  line2: 'rgba(60,60,67,0.29)', // separator
  ink: '#000000', // label
  ink2: '#6C6C70', // secondaryLabel, kept readable
  ink3: '#8A8A8E', // tertiary, still 3.4:1 on white
  onInk: '#FFFFFF',
  tint: '#2AA05A', // Inchly green: the one interactive colour
  tintSoft: 'rgba(42,160,90,0.12)',
  green: '#2AA05A',
  greenInk: '#1E8449',
  greenSoft: 'rgba(42,160,90,0.12)',
  amber: '#C46F00', // deadlines close: text-safe orange
  amberSoft: 'rgba(255,149,0,0.14)',
  red: '#FF3B30',
  redSoft: 'rgba(255,59,48,0.12)',
  blue: '#2AA05A', // legacy name: actions use the tint
  blueSoft: 'rgba(42,160,90,0.12)',
  grass: ['#E5E5EA', '#BCE6C8', '#73CC90', '#2AA05A', '#17733D'],
  scrim: 'rgba(0,0,0,0.25)',
  dark: false,
};

export type Theme = typeof light;

/** The app is light only (app.json: userInterfaceStyle "light"). */
export function useT(): Theme {
  return light;
}

// The focus timer, light like the rest: a quiet grey room, black thin digits.
export const focus = {
  bg: '#F2F2F7',
  ink: '#000000',
  ink2: '#6C6C70',
  ink3: '#8A8A8E',
  line: 'rgba(60,60,67,0.18)',
  raise: 'rgba(118,118,128,0.12)',
  green: '#2AA05A',
};

// Apple's system face everywhere: SF Pro for Latin and figures, Hiragino Sans
// for Japanese. Native iOS gets it with no fontFamily at all (and picks Text or
// Display by size); the web needs the stack spelled out. Android falls back to Roboto.
const JA = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans CJK JP", "Noto Sans JP", sans-serif';
const web = Platform.OS === 'web';
export const font = {
  text: web ? `-apple-system, BlinkMacSystemFont, "SF Pro Text", ${JA}` : undefined,
  display: web ? `-apple-system, BlinkMacSystemFont, "SF Pro Display", ${JA}` : undefined,
  // SF Pro Rounded, for stickers and the wordmark
  rounded: web ? `ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", ${JA}` : Platform.OS === 'ios' ? 'ui-rounded' : undefined,
};
/** SF Pro Display from 20pt up, SF Pro Text below — the same switch iOS makes. */
export const face = (size: number) => (size >= 20 ? font.display : font.text);

// iOS text styles.
export const type = {
  large: 34, // Large Title
  title2: 22,
  title3: 20,
  head: 17, // Headline (semibold)
  body: 17,
  callout: 16,
  sub: 15, // Subheadline
  foot: 13, // Footnote
  cap: 12, // Caption 1
  // kept for older call sites
  hero: 34,
  figure: 28,
  title: 34,
};

/** Content does not float; only glass does. k=2 is for small floating tags. */
export const lift = (_t: { dark: boolean }, k: 1 | 2 = 1) =>
  k === 1 ? null : { boxShadow: '0px 2px 6px rgba(0,0,0,0.08), 0px 10px 24px rgba(0,0,0,0.12)' };
// Concentric corners: screen → group 26 → inner 14; buttons are capsules.
export const radius = { card: 26, inner: 14 };

// Motion measured on bencho.dev: press = .2s (.3,.9,.4,1), springy round buttons = .24s (.28,1.3,.36,1).
export const ease = {
  press: Easing.bezier(0.3, 0.9, 0.4, 1),
  spring: Easing.bezier(0.28, 1.3, 0.36, 1),
  out: Easing.bezier(0.22, 1, 0.36, 1),
};

// Separators: two device pixels on iOS, and the same on a retina browser.
export const hair = Platform.OS === 'web' ? 0.5 : StyleSheet.hairlineWidth;

// Web only: the field draws its own focus border, so drop the browser outline.
export const noOutline: TextStyle | null = Platform.OS === 'web' ? { outlineWidth: 0 } : null;
