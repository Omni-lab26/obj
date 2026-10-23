import { useSyncExternalStore } from 'react';
import { Platform, StyleSheet, TextStyle } from 'react-native';
import { Easing } from 'react-native-reanimated';

import { BGS, CORNERS, designVersion, FAMILIES, getDesign, INKS, onDesign, Reaction, refreshDesign, Texture, themeOf, ThemeFont, TIMERS } from './design';

// Light only. A cool blue-white canvas, white cards on a faint edge and a
// short soft shadow, near-black ink for text and primary buttons. Green is for
// study and gains, blue for actions, red for shortfalls.
const light = {
  canvas: '#F4F5F8',
  surface: '#FFFFFF',
  sunken: '#EFF1F5',
  line: 'rgba(17,20,23,0.08)',
  line2: 'rgba(17,20,23,0.15)',
  ink: '#121417',
  ink2: '#4F5663',
  ink3: '#848A96',
  onInk: '#FFFFFF',
  tint: '#1FA35B',
  tintSoft: '#E5F6EC',
  green: '#1FA35B',
  greenInk: '#148246',
  greenSoft: '#E5F6EC',
  amber: '#E58A00',
  amberSoft: '#FFF2DC',
  red: '#F0443A',
  redSoft: '#FDECEB',
  blue: '#2F6BFF',
  blueSoft: '#EAF0FF',
  grass: ['#E6EAF0', '#B5EBC8', '#5ED18A', '#1FA35B', '#0F7F3C'], // green: more study = deeper
  scrim: 'rgba(17,20,23,0.36)',
  dark: false,
  // how cards are shaded and outlined (lift), and what lies behind screens: cards lie flat, with
  // only a hairline edge (so a white card still shows on the white background); things that float
  // over the page — toasts, tooltips — keep a shadow
  shadow1: '0px 0px 0px 0.5px rgba(15,23,42,0.08)',
  shadow2: '0px 0px 0px 0.5px rgba(15,23,42,0.06), 0px 2px 6px rgba(15,23,42,0.06), 0px 12px 28px rgba(15,23,42,0.12)',
  texture: null as Texture | null,
  /** cards get the texture too (the painted themes) */
  cardTexture: false,
  /** how things answer a tap (Press) */
  press: 'scale' as Reaction,
};

export type Theme = typeof light;

// ---------- following the design you pick (design.ts) ----------
let palette: Theme = light;
function follow() {
  const d = getDesign();
  const th = themeOf(d.theme);
  const press = th.press ?? FAMILIES.find((f) => f.id === th.family)?.press ?? 'scale';
  if (th.colors) {
    palette = { ...light, ...th.colors, dark: th.dark, shadow1: th.shadow?.[0] ?? light.shadow1, shadow2: th.shadow?.[1] ?? light.shadow2,
      texture: th.texture ?? null, cardTexture: th.family === 'oil', scrim: th.dark ? 'rgba(0,0,0,0.5)' : light.scrim, press };
  } else {
    palette = { ...light, canvas: BGS[d.bg].canvas, sunken: BGS[d.bg].sunken, ink: INKS[d.ink].ink, press };
  }
  // radius, focus and the typeface are plain values read during render;
  // components that read them also read the theme, so they re-render with them
  Object.assign(radius, th.corners ?? { card: CORNERS[d.corners].card, inner: CORNERS[d.corners].inner });
  focus.bg = th.timer ?? TIMERS[d.timer].bg;
  current = th.font;
}
onDesign(follow);

/** The theme, following the design you picked. */
export function useT(): Theme {
  useSyncExternalStore(onDesign, designVersion, designVersion);
  return palette;
}

// The focus timer is always dark, whatever the system setting.
export const focus = {
  bg: '#0B0F17',
  ink: '#F3F5F9',
  ink2: 'rgba(243,245,249,0.62)',
  ink3: 'rgba(243,245,249,0.38)',
  line: 'rgba(255,255,255,0.08)',
  raise: 'rgba(255,255,255,0.08)',
  green: '#2FD07A',
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
// The theme's typeface. Only faces that are always there (system fonts) or
// bundled and already loaded are named: iOS stops on a font name it can't find.
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: `"SF Mono", Menlo, Consolas, "Roboto Mono", monospace, ${JA}` });
const ROUNDED = Platform.select({ ios: 'HiraMaruProN-W4', android: undefined, default: `"Hiragino Maru Gothic ProN", "Zen Maru Gothic", "M PLUS Rounded 1c", ui-rounded, ${JA}` });
const SERIF = Platform.select({ ios: 'HiraMinProN-W3', android: 'serif', default: `"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", "Noto Serif CJK JP", serif` });
const SERIF_BOLD = Platform.select({ ios: 'HiraMinProN-W6', android: 'serif', default: SERIF });
// Bundled faces (expo-font names). Japanese the grotesque lacks falls back to the system face.
export const BUNDLED = {
  pixel: 'DotGothic16_400Regular', // Japanese
  grotesk: 'BricolageGrotesque_500Medium', groteskBold: 'BricolageGrotesque_800ExtraBold', // Latin only
  label: 'Silkscreen_400Regular', // Latin capitals only, for tiny labels
  condensed: 'Rajdhani_600SemiBold', condensedBold: 'Rajdhani_700Bold', // Latin only
  heavy: 'DelaGothicOne_400Regular', // Japanese
  plex: 'IBMPlexMono_400Regular', plexBold: 'IBMPlexMono_600SemiBold', // Latin only
};
export type BundledFace = keyof typeof BUNDLED;
// On the web a face is a stack, so Japanese falls back to the same face as everywhere else (and keeps its width).
const bundled = (name: string) => (web ? `"${name}", ${JA}` : name);
let current: ThemeFont = 'system';
let ready = false;
/**
 * A bundled face by name, once loaded (undefined until then, so the system
 * face stands in). Theme apps read it while rendering; they also read the
 * theme, so they render again when the faces arrive.
 */
export const bundledFace = (k: BundledFace): string | undefined => (ready ? bundled(BUNDLED[k]) : undefined);
/** The root layout calls this once the bundled faces have loaded; until then themes use the system face. */
export function bundledFontsLoaded() {
  if (ready) return;
  ready = true;
  refreshDesign();
}
/** A theme's face at a size (the デザイン page previews every theme in its own). */
export const faceFor = (f: ThemeFont, size: number) => {
  switch (f) {
    case 'mono': return MONO;
    case 'rounded': return ROUNDED;
    case 'serif': return size >= 20 ? SERIF_BOLD : SERIF;
    case 'pixel': if (ready) return bundled(BUNDLED.pixel); break;
    // the grotesque has no Japanese, so it sets only headlines and figures; body text keeps the system face
    case 'grotesk': if (ready && size >= 20) return bundled(BUNDLED.groteskBold); break;
    // likewise Latin-only, or too heavy for small text: headlines and figures only
    case 'condensed': if (ready && size >= 20) return bundled(BUNDLED.condensedBold); break;
    case 'heavy': if (ready && size >= 20) return bundled(BUNDLED.heavy); break;
  }
  return size >= 20 ? font.display : font.text;
};
/** SF Pro Display from 20pt up, SF Pro Text below — the same switch iOS makes — or the current theme's face. */
export const face = (size: number) => faceFor(current, size);

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

/**
 * Cards sit on a faint edge and a short, soft shadow — or the theme's outline
 * and shadow. Always a boxShadow, never a border, so it never takes room.
 */
export const lift = (t: { shadow1: string; shadow2: string }, k: 1 | 2 = 1) => ({ boxShadow: k === 1 ? t.shadow1 : t.shadow2 });
export const radius = { card: 16, inner: 12 }; // follows the 角 you pick (applyDesign)

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

/** Text color for a filled button: white on deep colors, ink on light ones (国語's yellow, 数学's orange). */
export function onColor(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  const lin = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  // pick whichever of white and ink contrasts more
  return (1.05) / (L + 0.05) >= (L + 0.05) / (0.0074 + 0.05) ? '#FFFFFF' : '#121417';
}
