import { useSyncExternalStore } from 'react';

// The look you pick on the デザイン page. Still light only: you choose the
// canvas, the main color (text and primary buttons), how round cards are, the
// My Page card, the streak capsule and the timer's color. The store holds the
// choice and calls applyDesign; theme.ts and useDesign() follow it. (No
// React Native imports here, so the store and its tests can load it.)

export const BGS = {
  cool: { label: 'クール', canvas: '#F4F5F8', sunken: '#EFF1F5' },
  warm: { label: 'ウォーム', canvas: '#F6F3EE', sunken: '#EEEAE3' },
  white: { label: 'ホワイト', canvas: '#FFFFFF', sunken: '#F2F3F6' },
  lilac: { label: 'ラベンダー', canvas: '#F5F3FB', sunken: '#ECE8F6' },
  sky: { label: 'スカイ', canvas: '#F0F5FB', sunken: '#E6EDF6' },
};
export const INKS = {
  black: { label: 'ブラック', ink: '#121417' },
  navy: { label: 'ネイビー', ink: '#16244A' },
  indigo: { label: 'インディゴ', ink: '#2A2870' },
  plum: { label: 'プラム', ink: '#3B1D4A' },
  cocoa: { label: 'ココア', ink: '#3A2A1E' },
};
export const CORNERS = {
  s: { label: '小さめ', card: 10, inner: 8 },
  m: { label: 'ふつう', card: 16, inner: 12 },
  l: { label: '大きめ', card: 22, inner: 16 },
};
/** The My Page card: a gradient (top left → bottom right), its text color, and whether it's dark. */
export const CARDS = {
  pearl: { label: 'パール', grad: ['#FFFFFF', '#F6F7FA', '#E9EDF3'], dark: false, sheen: ['#9EE8FF', '#C9B6FF', '#FFC2E2'] },
  black: { label: 'ブラック', grad: ['#1A1C22', '#101217', '#07080B'], dark: true, sheen: ['#78FFB4', '#8CB4FF', '#D49CFF'] },
  sakura: { label: 'さくら', grad: ['#FFF5F8', '#FDE4EC', '#F8CFDD'], dark: false, sheen: ['#FFFFFF', '#FFC2E2', '#C9B6FF'] },
  sky: { label: 'スカイ', grad: ['#F4FAFF', '#DDEEFF', '#C6DEFA'], dark: false, sheen: ['#FFFFFF', '#9EE8FF', '#C9B6FF'] },
  midnight: { label: 'ミッドナイト', grad: ['#2B2A6B', '#1B1A4A', '#0E0D2B'], dark: true, sheen: ['#9EE8FF', '#C9B6FF', '#FFC2E2'] },
};
export const STREAKS = { black: { label: 'ブラック' }, ink: { label: 'メインの色' }, white: { label: 'ホワイト' } };
export const TIMERS = {
  night: { label: 'ナイト', bg: '#0B0F17' },
  black: { label: 'ブラック', bg: '#000000' },
  indigo: { label: 'インディゴ', bg: '#15133A' },
  plum: { label: 'プラム', bg: '#26102C' },
  cocoa: { label: 'ココア', bg: '#1F150D' },
};
/**
 * Themes: a whole look in one choice. Each sets the colors, the typeface, how
 * round cards are, how they are outlined and shaded, and a texture behind the
 * screens. A theme changes only how things are drawn, never their size or
 * position: outlines are drawn as shadows (not borders, which would take room),
 * textures sit behind the content, and text keeps its size and line height.
 * 'standard' uses the 背景 / メインの色 / 角 picks below instead.
 */
export type ThemeFont = 'system' | 'mono' | 'pixel' | 'rounded' | 'serif' | 'grotesk';
export type Texture = 'oil' | 'oil-dark' | 'scan' | 'scan-dark' | 'pixel' | 'pixel-dark' | 'dots-pink' | 'dots-brown' | 'dots-blue';
export type ThemeDef = {
  label: string; family: 'standard' | 'digital' | '8bit' | 'kawaii' | 'oil' | 'pop'; dark: boolean;
  colors?: { canvas: string; surface: string; sunken: string; line: string; line2: string; ink: string; ink2: string; ink3: string; onInk: string };
  corners?: { card: number; inner: number };
  font: ThemeFont;
  /** boxShadow for cards (level 1 and 2); outlines are drawn here too, as a 0-blur spread */
  shadow?: [string, string];
  texture?: Texture;
  /** the timer's background, when the theme has its own */
  timer?: string;
};
export const FAMILIES = [
  { id: 'standard', label: '基本' },
  { id: 'digital', label: 'デジタル' },
  { id: '8bit', label: '8bit' },
  { id: 'kawaii', label: 'かわいい' },
  { id: 'oil', label: '油絵' },
  { id: 'pop', label: 'ポップ' },
] as const;
const ring = (w: number, c: string) => `0px 0px 0px ${w}px ${c}`;
export const THEMES = {
  standard: { label: 'スタンダード', family: 'standard', dark: false, font: 'system' },
  // デジタル: monospaced type, square corners, scan lines
  lcd: {
    label: 'LCD', family: 'digital', dark: false, font: 'mono', texture: 'scan', timer: '#1F2A16',
    colors: { canvas: '#C5CCB4', surface: '#D3D9C4', sunken: '#BCC3AA', line: 'rgba(30,40,20,0.16)', line2: 'rgba(30,40,20,0.32)', ink: '#1F2A16', ink2: '#3E4A33', ink3: '#5F6B52', onInk: '#D3D9C4' },
    corners: { card: 4, inner: 3 }, shadow: [ring(1.5, 'rgba(30,40,20,0.45)'), `${ring(1.5, 'rgba(30,40,20,0.6)')}, 3px 3px 0px rgba(30,40,20,0.25)`],
  },
  terminal: {
    label: 'ターミナル', family: 'digital', dark: true, font: 'mono', texture: 'scan-dark', timer: '#000000',
    colors: { canvas: '#07090A', surface: '#0E1412', sunken: '#16201C', line: 'rgba(140,255,210,0.12)', line2: 'rgba(140,255,210,0.26)', ink: '#8CFFD2', ink2: '#62C9A4', ink3: '#3F8A70', onInk: '#07090A' },
    corners: { card: 3, inner: 2 }, shadow: [`${ring(1, 'rgba(140,255,210,0.28)')}, 0px 0px 18px rgba(140,255,210,0.08)`, `${ring(1, 'rgba(140,255,210,0.4)')}, 0px 0px 26px rgba(140,255,210,0.14)`],
  },
  cyber: {
    label: 'サイバー', family: 'digital', dark: true, font: 'mono', texture: 'scan-dark', timer: '#0B0A1F',
    colors: { canvas: '#0B0A1F', surface: '#15132F', sunken: '#1E1B42', line: 'rgba(45,226,230,0.15)', line2: 'rgba(45,226,230,0.32)', ink: '#ECEAFF', ink2: '#ABA5DC', ink3: '#716BA6', onInk: '#0B0A1F' },
    corners: { card: 8, inner: 6 }, shadow: [`${ring(1, 'rgba(255,56,200,0.4)')}, 0px 0px 22px rgba(45,226,230,0.12)`, `${ring(1, 'rgba(45,226,230,0.55)')}, 0px 0px 30px rgba(255,56,200,0.18)`],
  },
  // 8bit: the pixel font, no rounding, hard offset shadows
  retro: {
    label: 'レトロゲーム', family: '8bit', dark: false, font: 'pixel', texture: 'pixel', timer: '#1A1A1A',
    colors: { canvas: '#F3E9D2', surface: '#FFFBF0', sunken: '#E8DCC0', line: 'rgba(26,26,26,0.18)', line2: 'rgba(26,26,26,0.5)', ink: '#1A1A1A', ink2: '#4A4238', ink3: '#7C7262', onInk: '#FFFBF0' },
    corners: { card: 0, inner: 0 }, shadow: [`${ring(2, '#1A1A1A')}, 4px 4px 0px #1A1A1A`, `${ring(2, '#1A1A1A')}, 6px 6px 0px #1A1A1A`],
  },
  dotnight: {
    label: 'ドットの夜', family: '8bit', dark: true, font: 'pixel', texture: 'pixel-dark', timer: '#120A24',
    colors: { canvas: '#1A1033', surface: '#2A1B4D', sunken: '#362561', line: 'rgba(255,232,163,0.16)', line2: 'rgba(255,232,163,0.42)', ink: '#FFE8A3', ink2: '#E2CB8C', ink3: '#A8946A', onInk: '#1A1033' },
    corners: { card: 0, inner: 0 }, shadow: [`${ring(2, '#FFE8A3')}, 4px 4px 0px #000000`, `${ring(2, '#FFE8A3')}, 6px 6px 0px #000000`],
  },
  pico: {
    label: 'ピコピコ', family: '8bit', dark: false, font: 'pixel', texture: 'pixel', timer: '#2B2D6E',
    colors: { canvas: '#E9F1FF', surface: '#FFFFFF', sunken: '#D8E6FB', line: 'rgba(43,45,110,0.16)', line2: 'rgba(43,45,110,0.45)', ink: '#2B2D6E', ink2: '#555890', ink3: '#8486B4', onInk: '#FFFFFF' },
    corners: { card: 0, inner: 0 }, shadow: [`${ring(2, '#2B2D6E')}, 3px 3px 0px #2B2D6E`, `${ring(2, '#2B2D6E')}, 5px 5px 0px #2B2D6E`],
  },
  // かわいい: rounded type, very round corners, pastel outlines and polka dots
  yumekawa: {
    label: 'ゆめかわ', family: 'kawaii', dark: false, font: 'rounded', texture: 'dots-pink', timer: '#3B2550',
    colors: { canvas: '#FFF0F7', surface: '#FFFFFF', sunken: '#FCE4F0', line: 'rgba(214,92,150,0.13)', line2: 'rgba(214,92,150,0.26)', ink: '#5B3A6E', ink2: '#87699A', ink3: '#B39BC2', onInk: '#FFFFFF' },
    corners: { card: 26, inner: 18 }, shadow: [`${ring(2, '#F9D2E5')}, 0px 6px 18px rgba(236,120,175,0.16)`, `${ring(2, '#F6C2DC')}, 0px 12px 28px rgba(236,120,175,0.22)`],
  },
  milktea: {
    label: 'ミルクティー', family: 'kawaii', dark: false, font: 'rounded', texture: 'dots-brown', timer: '#3A281E',
    colors: { canvas: '#F7EFE7', surface: '#FFFDFB', sunken: '#F0E4D8', line: 'rgba(150,110,80,0.14)', line2: 'rgba(150,110,80,0.28)', ink: '#6B4A3A', ink2: '#957563', ink3: '#B8A091', onInk: '#FFFFFF' },
    corners: { card: 24, inner: 16 }, shadow: [`${ring(2, '#EADBCB')}, 0px 6px 16px rgba(150,110,80,0.12)`, `${ring(2, '#E3CFBC')}, 0px 12px 26px rgba(150,110,80,0.18)`],
  },
  soda: {
    label: 'ソーダ', family: 'kawaii', dark: false, font: 'rounded', texture: 'dots-blue', timer: '#173A5C',
    colors: { canvas: '#EAF7FF', surface: '#FFFFFF', sunken: '#DCEFFB', line: 'rgba(60,150,220,0.14)', line2: 'rgba(60,150,220,0.28)', ink: '#2D5B8A', ink2: '#5D86AE', ink3: '#93B2CF', onInk: '#FFFFFF' },
    corners: { card: 26, inner: 18 }, shadow: [`${ring(2, '#C9E7FA')}, 0px 6px 18px rgba(60,150,220,0.14)`, `${ring(2, '#B5DDF7')}, 0px 12px 28px rgba(60,150,220,0.2)`],
  },
  // 油絵: serif type, canvas weave and brush strokes, painted offset shadows
  sunflower: {
    label: 'ひまわり', family: 'oil', dark: false, font: 'serif', texture: 'oil', timer: '#2A2015',
    colors: { canvas: '#EADBB8', surface: '#F5EBD3', sunken: '#E3D2AC', line: 'rgba(70,45,15,0.16)', line2: 'rgba(70,45,15,0.3)', ink: '#2E2214', ink2: '#5C4A30', ink3: '#8A7656', onInk: '#F5EBD3' },
    corners: { card: 6, inner: 4 }, shadow: [`${ring(1.5, 'rgba(70,45,15,0.25)')}, 2px 3px 0px rgba(70,45,15,0.2), 0px 8px 18px rgba(70,45,15,0.1)`, `${ring(1.5, 'rgba(70,45,15,0.3)')}, 3px 4px 0px rgba(70,45,15,0.24), 0px 14px 28px rgba(70,45,15,0.16)`],
  },
  starry: {
    label: '星月夜', family: 'oil', dark: true, font: 'serif', texture: 'oil-dark', timer: '#0F1730',
    colors: { canvas: '#18233F', surface: '#22325A', sunken: '#2C3E6A', line: 'rgba(244,211,94,0.13)', line2: 'rgba(244,211,94,0.3)', ink: '#F4E3A3', ink2: '#CBBE8C', ink3: '#918B74', onInk: '#18233F' },
    corners: { card: 6, inner: 4 }, shadow: [`${ring(1.5, 'rgba(244,211,94,0.25)')}, 2px 3px 0px rgba(0,0,0,0.35)`, `${ring(1.5, 'rgba(244,211,94,0.35)')}, 3px 4px 0px rgba(0,0,0,0.4)`],
  },
  lily: {
    label: '睡蓮', family: 'oil', dark: false, font: 'serif', texture: 'oil', timer: '#1D2C3B',
    colors: { canvas: '#DCE6E4', surface: '#EEF2EF', sunken: '#D2DEDC', line: 'rgba(37,58,78,0.14)', line2: 'rgba(37,58,78,0.28)', ink: '#253A4E', ink2: '#4F6577', ink3: '#7D8F9C', onInk: '#EEF2EF' },
    corners: { card: 8, inner: 6 }, shadow: [`${ring(1.5, 'rgba(37,58,78,0.2)')}, 2px 3px 0px rgba(37,58,78,0.16), 0px 8px 18px rgba(37,58,78,0.08)`, `${ring(1.5, 'rgba(37,58,78,0.26)')}, 3px 4px 0px rgba(37,58,78,0.2)`],
  },
  // ポップ: after piixpal.dvkk.dev — warm paper, 2px ink outlines, a solid
  // shadow dropped straight down, a grotesque face, and lime as the one accent
  pop: {
    label: 'クリーム', family: 'pop', dark: false, font: 'grotesk', timer: '#17121F',
    colors: { canvas: '#F3EEE3', surface: '#FBF8F1', sunken: '#EBE4D4', line: '#D8CFBD', line2: '#C9BFAB', ink: '#17121F', ink2: '#2B2436', ink3: '#6C6477', onInk: '#FBF8F1' },
    corners: { card: 22, inner: 12 }, shadow: [`${ring(2, '#17121F')}, 0px 4px 0px 0px #17121F`, `${ring(2, '#17121F')}, 8px 8px 0px 0px #A8D81C`],
  },
  popWhite: {
    label: 'ホワイト', family: 'pop', dark: false, font: 'grotesk', timer: '#17121F',
    colors: { canvas: '#FFFFFF', surface: '#FFFFFF', sunken: '#F3F3F1', line: '#E7E5E0', line2: '#D3D0C9', ink: '#17121F', ink2: '#2B2436', ink3: '#6C6477', onInk: '#FFFFFF' },
    corners: { card: 22, inner: 12 }, shadow: [`${ring(2, '#17121F')}, 0px 4px 0px 0px #17121F`, `${ring(2, '#17121F')}, 8px 8px 0px 0px #6B4CFF`],
  },
  popNight: {
    label: 'ナイト', family: 'pop', dark: true, font: 'grotesk', timer: '#0E0C13',
    colors: { canvas: '#0E0C13', surface: '#16131D', sunken: '#2A2534', line: '#2B2635', line2: '#3B3547', ink: '#F2EEF8', ink2: '#CDC6DA', ink3: '#8E869C', onInk: '#17121F' },
    corners: { card: 22, inner: 12 }, shadow: [`${ring(2, '#F2EEF8')}, 0px 4px 0px 0px #C6F432`, `${ring(2, '#F2EEF8')}, 8px 8px 0px 0px #C6F432`],
  },
} satisfies Record<string, ThemeDef>;
export type ThemeId = keyof typeof THEMES;
export const themeOf = (id: ThemeId): ThemeDef => THEMES[id] ?? THEMES.standard;

export type Design = { theme: ThemeId; bg: keyof typeof BGS; ink: keyof typeof INKS; corners: keyof typeof CORNERS; card: keyof typeof CARDS; streak: keyof typeof STREAKS; timer: keyof typeof TIMERS };
export const DEFAULT_DESIGN: Design = { theme: 'standard', bg: 'cool', ink: 'black', corners: 'm', card: 'pearl', streak: 'black', timer: 'night' };

let design: Design = DEFAULT_DESIGN;
let version = 0;
const listeners = new Set<() => void>();
export const onDesign = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const getDesign = () => design;
export const designVersion = () => version;

/** Called by the store whenever the saved design changes. */
export function applyDesign(d: Design) {
  if (d === design) return;
  design = d;
  version += 1;
  listeners.forEach((l) => l());
}

/** Re-render everything that follows the design without changing it (a font finished loading). */
export function refreshDesign() {
  version += 1;
  listeners.forEach((l) => l());
}

/** The design you picked; re-renders when it changes. */
export function useDesign(): Design {
  useSyncExternalStore(onDesign, designVersion, designVersion);
  return design;
}
