import { Platform, StyleSheet, TextStyle, useColorScheme } from 'react-native';
import { Easing } from 'react-native-reanimated';

// Cool blue-white canvas, white cards that float on a soft shadow, near-black
// navy for text and primary buttons. Green is for study and gains, blue for
// actions and accents.
const light = {
  canvas: '#F4F5F8',
  surface: '#FFFFFF',
  sunken: '#EFF1F5',
  line: 'rgba(15,23,42,0.07)',
  line2: 'rgba(15,23,42,0.14)',
  ink: '#111827',
  ink2: '#4F5868',
  ink3: '#848C9A',
  onInk: '#FFFFFF',
  green: '#16A34A',
  greenInk: '#11843B',
  greenSoft: '#E6F6EC',
  amber: '#E58A00',
  amberSoft: '#FFF2DC',
  red: '#EF4444',
  redSoft: '#FDECEC',
  blue: '#2F6BFF',
  blueSoft: '#EAF0FF',
  grass: ['#E6EAF0', '#B5EBC8', '#5ED18A', '#1FAA57', '#0F7F3C'],
  scrim: 'rgba(15,23,42,0.36)',
  dark: false,
};

const dark: typeof light = {
  canvas: '#0B0F17',
  surface: '#151A24',
  sunken: '#1F2531',
  line: 'rgba(255,255,255,0.07)',
  line2: 'rgba(255,255,255,0.14)',
  ink: '#F1F4F9',
  ink2: '#A4ADBD',
  ink3: '#6C7588',
  onInk: '#0B0F17',
  green: '#22C55E',
  greenInk: '#4ADE80',
  greenSoft: '#11291B',
  amber: '#F7A928',
  amberSoft: '#33250E',
  red: '#F87171',
  redSoft: '#3A1A1C',
  blue: '#5B8CFF',
  blueSoft: '#17223D',
  grass: ['#1D2330', '#14532D', '#16803D', '#22C55E', '#4ADE80'],
  scrim: 'rgba(0,0,0,0.55)',
  dark: true,
};

export type Theme = typeof light;

export function useT(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

// The focus timer is always dark, whatever the system setting.
export const focus = {
  bg: '#0B0F17',
  ink: '#F3F5F9',
  ink2: 'rgba(243,245,249,0.62)',
  ink3: 'rgba(243,245,249,0.38)',
  line: 'rgba(255,255,255,0.08)',
  raise: 'rgba(255,255,255,0.08)',
  green: '#22C55E',
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

// Type scale, after the wallet reference: compact objects, one figure per card,
// quiet everything else.
export const type = {
  hero: 32, // the one number a screen leads with
  figure: 24, // card totals
  title: 22, // tab titles
  head: 15, // section and card titles
  body: 14,
  sub: 12,
  cap: 11,
};

/** Cards sit on a faint edge and a short, soft shadow (none in dark mode). */
export const lift = (t: { dark: boolean }, k: 1 | 2 = 1) =>
  t.dark ? null : { boxShadow: k === 1 ? '0px 0px 0px 0.5px rgba(15,23,42,0.06), 0px 1px 2px rgba(15,23,42,0.04), 0px 4px 14px rgba(15,23,42,0.045)' : '0px 0px 0px 0.5px rgba(15,23,42,0.06), 0px 2px 6px rgba(15,23,42,0.06), 0px 12px 28px rgba(15,23,42,0.12)' };
export const radius = { card: 16, inner: 12 };

// Motion measured on bencho.dev: press = .2s (.3,.9,.4,1), springy round buttons = .24s (.28,1.3,.36,1).
export const ease = {
  press: Easing.bezier(0.3, 0.9, 0.4, 1),
  spring: Easing.bezier(0.28, 1.3, 0.36, 1),
  out: Easing.bezier(0.22, 1, 0.36, 1),
};

// Separators: two device pixels on iOS, and the same on a retina browser.
export const hair = Platform.OS === 'web' ? 0.75 : StyleSheet.hairlineWidth * 2;

// Web only: the field draws its own focus border, so drop the browser outline.
export const noOutline: TextStyle | null = Platform.OS === 'web' ? { outlineWidth: 0 } : null;
