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
export type Design = { bg: keyof typeof BGS; ink: keyof typeof INKS; corners: keyof typeof CORNERS; card: keyof typeof CARDS; streak: keyof typeof STREAKS; timer: keyof typeof TIMERS };
export const DEFAULT_DESIGN: Design = { bg: 'cool', ink: 'black', corners: 'm', card: 'pearl', streak: 'black', timer: 'night' };

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

/** The design you picked; re-renders when it changes. */
export function useDesign(): Design {
  useSyncExternalStore(onDesign, designVersion, designVersion);
  return design;
}
