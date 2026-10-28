import { useEffect } from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay } from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';

import { font } from '../theme';
import { M, micro, timed } from './motion';

// Pop stickers: one bold, flat colour per part, a thick white die-cut border
// and a soft shadow under it — like a sticker sheet. Drawn on a 48×48 grid.
// `base` parts make the silhouette (they get the border and shadow); `top`
// parts are details printed on the sticker.
type Part = { d: string; fill?: string; stroke?: string; w?: number; o?: number };
type Spec = { base: Part[]; top?: Part[]; rot?: number };

const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;
const star = (cx: number, cy: number, R: number, r: number, n = 5) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (Math.PI / n) * i - Math.PI / 2;
    const k = i % 2 ? r : R;
    return `${i ? 'L' : 'M'}${(cx + Math.cos(a) * k).toFixed(2)} ${(cy + Math.sin(a) * k).toFixed(2)}`;
  }).join('') + 'z';

const W = '#FFFFFF';
const shine = (d: string, w = 3.2, o = 0.5): Part => ({ d, stroke: W, w, o });

export const POP = {
  blue: '#2F7BFF',
  sky: '#38A6FF',
  red: '#FF4458',
  pink: '#FF5C8A',
  orange: '#FF7A1A',
  yellow: '#FFC23D',
  green: '#1FC16B',
  violet: '#7B5CFF',
  navy: '#1E2A44',
  brown: '#C9773A',
};

const SPECS = {
  check: { base: [{ d: circ(24, 24, 19), fill: POP.blue }], top: [{ d: 'M15.5 24.5l6 6 11-12', stroke: W, w: 5 }, shine('M13.5 17.5a12.5 12.5 0 0 1 6.5-6.2')] },
  done: { base: [{ d: circ(24, 24, 19), fill: POP.green }], top: [{ d: 'M15.5 24.5l6 6 11-12', stroke: W, w: 5 }, shine('M13.5 17.5a12.5 12.5 0 0 1 6.5-6.2')] },
  x: { base: [{ d: circ(24, 24, 19), fill: POP.red }], top: [{ d: 'M17.5 17.5l13 13M30.5 17.5l-13 13', stroke: W, w: 5 }, shine('M13.5 17.5a12.5 12.5 0 0 1 6.5-6.2')] },
  heart: {
    base: [{ d: 'M24 41C14.5 34.5 6.5 27.6 6.5 18.8 6.5 13 10.8 8.5 16.3 8.5c3.4 0 6.1 1.7 7.7 4.4 1.6-2.7 4.3-4.4 7.7-4.4 5.5 0 9.8 4.5 9.8 10.3C41.5 27.6 33.5 34.5 24 41z', fill: POP.red }],
    top: [shine('M12 17a5.5 5.5 0 0 1 4.5-4.2', 3.4, 0.55)],
  },
  sun: {
    base: [
      { d: 'M24 7v4.5M11 12.5l3.2 3.2M37 12.5l-3.2 3.2M5.5 24.5H10M42.5 24.5H38', stroke: POP.yellow, w: 4 },
      { d: 'M10.5 31a13.5 13.5 0 0 1 27 0z', fill: POP.yellow },
      { d: rr(4.5, 31, 39, 7.5, 3.75), fill: POP.orange },
      { d: rr(12, 40, 24, 4.5, 2.25), fill: POP.orange },
    ],
    top: [shine('M16 26a9 9 0 0 1 5-5', 3, 0.6)],
  },
  globe: {
    base: [{ d: circ(24, 24, 19), fill: POP.sky }],
    top: [
      { d: 'M24 5c-5.5 5-8.2 11.3-8.2 19s2.7 14 8.2 19c5.5-5 8.2-11.3 8.2-19S29.5 10 24 5z', stroke: W, w: 2.4, o: 0.9 },
      { d: 'M5.5 24h37M8.5 14.5h31M8.5 33.5h31', stroke: W, w: 2.4, o: 0.9 },
    ],
  },
  share: {
    base: [{ d: rr(5.5, 5.5, 37, 37, 11), fill: POP.violet }],
    top: [{ d: 'M14.5 34c0-9 5.5-14 14-14h4.5', stroke: W, w: 4.5 }, { d: 'M27.5 13.5l7 6.5-7 6.5', stroke: W, w: 4.5 }, shine('M11.5 15a5.5 5.5 0 0 1 3.5-3.5', 3, 0.45)],
  },
  person: {
    base: [{ d: circ(24, 15.5, 8.5), fill: POP.orange }, { d: 'M8.5 41.5c0-9.3 6.8-15.5 15.5-15.5s15.5 6.2 15.5 15.5z', fill: POP.orange }],
    top: [shine('M18.5 12.5a6 6 0 0 1 3.5-3', 2.6, 0.55)],
  },
  phone: {
    rot: -12,
    base: [{ d: rr(13, 3.5, 22, 41, 6), fill: POP.navy }],
    top: [{ d: rr(16, 8.5, 16, 28.5, 2.5), fill: POP.sky }, { d: rr(21, 39.5, 6, 2, 1), fill: W, o: 0.65 }, { d: 'M19 12l4.5-0M18.5 16.5l9-4.5', stroke: W, w: 2.2, o: 0.45 }],
  },
  fire: {
    base: [{ d: 'M24 44.5c-8.8 0-15-5.9-15-13.8 0-6.4 3.4-10.2 6.1-13.3.4 3 1.9 5 4 6-1-7 2.3-14 8.9-19.4 0 5.6 2.6 8.7 5.6 11.7 3.1 3.1 6.4 7.1 6.4 14.6 0 8.1-6.4 14.2-16 14.2z', fill: POP.orange }],
    top: [{ d: 'M24 44.5c-4.5 0-7.5-3-7.5-7 0-4 2.5-6.6 5-8.6 0 2.5 1.2 4 3 4.5-.4-3.6 1.1-6.6 3.6-8.6.5 3.6 3.4 5.6 3.4 10.1 0 5.5-3 9.6-7.5 9.6z', fill: POP.yellow }],
  },
  star: { base: [{ d: star(24, 25.5, 20.5, 9.8), fill: POP.yellow, stroke: POP.yellow, w: 3 }], top: [shine('M17.5 20.5l3-6', 2.8, 0.6)] },
  sparkle: {
    base: [{ d: 'M21 5c1.4 8.4 4.1 11.1 12.5 12.5C25.1 18.9 22.4 21.6 21 30c-1.4-8.4-4.1-11.1-12.5-12.5C16.9 16.1 19.6 13.4 21 5z', fill: POP.yellow }, { d: 'M35 27c.9 5 2.6 6.6 7.5 7.5-4.9.9-6.6 2.6-7.5 7.5-.9-4.9-2.6-6.6-7.5-7.5 4.9-.9 6.6-2.5 7.5-7.5z', fill: POP.pink }],
  },
  bulb: {
    base: [
      { d: 'M24 4.5a13.3 13.3 0 0 0-8 24c1.6 1.2 2.7 3 2.7 5v1.8h10.6v-1.8c0-2 1.1-3.8 2.7-5a13.3 13.3 0 0 0-8-24z', fill: POP.yellow },
      { d: rr(18.5, 35, 11, 8.5, 3.2), fill: '#8E9AAF' },
    ],
    top: [{ d: 'M20.5 24.5l3.5 3.5 3.5-3.5', stroke: POP.orange, w: 2.4 }, shine('M15 15a9 9 0 0 1 5-5', 3, 0.6), { d: 'M19 39h10', stroke: W, w: 1.6, o: 0.5 }],
  },
  book: {
    rot: -8,
    base: [{ d: rr(10, 5.5, 28, 37, 5), fill: POP.green }],
    top: [{ d: rr(13.5, 34, 24.5, 5.5, 2), fill: W }, { d: rr(16, 12, 16, 7, 2), fill: W, o: 0.9 }, { d: 'M15 6v28', stroke: '#000', w: 1.6, o: 0.12 }],
  },
  pencil: {
    rot: 40,
    base: [
      { d: rr(19, 2.5, 10, 6.5, 2.5), fill: POP.pink },
      { d: 'M19 8.5h10V34H19z', fill: POP.yellow },
      { d: 'M19 34h10l-5 10z', fill: '#F6D7A7' },
    ],
    top: [{ d: 'M19 8.5h10V11H19z', fill: '#B4BDCB' }, { d: 'M22.3 40.6h3.4L24 44z', fill: POP.navy }, { d: 'M24 11v23', stroke: '#000', w: 1.2, o: 0.12 }],
  },
  coffee: {
    base: [
      { d: 'M33.5 20.5h3a5.5 5.5 0 0 1 0 11h-3.5', stroke: POP.brown, w: 4 },
      { d: 'M8.5 17.5h26v12a10.5 10.5 0 0 1-10.5 10.5h-5A10.5 10.5 0 0 1 8.5 29.5z', fill: POP.brown },
      { d: 'M17 5c-2 3 2 5 0 8M25 5c-2 3 2 5 0 8', stroke: '#B8C1CF', w: 3 },
    ],
    top: [{ d: rr(8.5, 17.5, 26, 4, 2), fill: W, o: 0.3 }, shine('M13 26v4', 2.6, 0.45)],
  },
  moon: { base: [{ d: 'M29.5 5.5a18.5 18.5 0 1 0 13 31A15.5 15.5 0 0 1 29.5 5.5z', fill: POP.yellow }], top: [shine('M12 20a12 12 0 0 1 5-7', 3, 0.5)] },
  trophy: {
    base: [
      { d: 'M14 10H9.5a5 5 0 0 0 5.5 8M34 10h4.5a5 5 0 0 1-5.5 8', stroke: POP.yellow, w: 3.5 },
      { d: 'M13.5 6.5h21v10.5a10.5 10.5 0 0 1-21 0z', fill: POP.yellow },
      { d: rr(21.5, 26, 5, 8, 1), fill: '#F2A900' },
      { d: rr(14.5, 33, 19, 8, 3), fill: POP.navy },
    ],
    top: [shine('M18 10v6', 2.8, 0.55)],
  },
  cal: {
    base: [{ d: rr(6.5, 8.5, 35, 33, 8), fill: '#F2F4F8' }, { d: rr(14.5, 4.5, 4.5, 9, 2.25), fill: POP.navy }, { d: rr(29, 4.5, 4.5, 9, 2.25), fill: POP.navy }],
    top: [
      { d: 'M6.5 16.5a8 8 0 0 1 8-8h19a8 8 0 0 1 8 8v2.5h-35z', fill: POP.red },
      { d: rr(14.5, 4.5, 4.5, 9, 2.25), fill: POP.navy }, { d: rr(29, 4.5, 4.5, 9, 2.25), fill: POP.navy },
      { d: rr(13, 24, 5.5, 5, 1.5), fill: '#C9D0DC' }, { d: rr(21.25, 24, 5.5, 5, 1.5), fill: '#C9D0DC' }, { d: rr(29.5, 24, 5.5, 5, 1.5), fill: POP.red },
      { d: rr(13, 31.5, 5.5, 5, 1.5), fill: '#C9D0DC' }, { d: rr(21.25, 31.5, 5.5, 5, 1.5), fill: '#C9D0DC' },
    ],
  },
  target: {
    base: [{ d: circ(24, 24, 19), fill: POP.red }],
    top: [{ d: circ(24, 24, 12.5), fill: W }, { d: circ(24, 24, 6.5), fill: POP.red }, shine('M13.5 17.5a12.5 12.5 0 0 1 6.5-6.2', 3, 0.45)],
  },
  flag: {
    base: [{ d: 'M12.5 6v36', stroke: '#5A6478', w: 4 }, { d: 'M14 7.5h23l-5 8 5 8H14z', fill: POP.red, stroke: POP.red, w: 2 }],
    top: [shine('M18 11.5h8', 2.6, 0.5)],
  },
  bell: {
    base: [{ d: circ(24, 37.5, 4.5), fill: '#F2A900' }, { d: 'M24 5.5a11.5 11.5 0 0 0-11.5 11.5v7.5l-3.5 6.5h30l-3.5-6.5V17A11.5 11.5 0 0 0 24 5.5z', fill: POP.yellow }],
    top: [shine('M17 17a7 7 0 0 1 4-5.5', 2.8, 0.55)],
  },
  chat: {
    base: [{ d: 'M9 8.5h30a5 5 0 0 1 5 5v16a5 5 0 0 1-5 5H23l-9 7.5v-7.5H9a5 5 0 0 1-5-5v-16a5 5 0 0 1 5-5z', fill: POP.blue }],
    top: [{ d: circ(15.5, 21.5, 2.6), fill: W }, { d: circ(24, 21.5, 2.6), fill: W }, { d: circ(32.5, 21.5, 2.6), fill: W }],
  },
  play: { base: [{ d: circ(24, 24, 19), fill: POP.green }], top: [{ d: 'M20 15.5v17l13.5-8.5z', fill: W, stroke: W, w: 2.5 }, shine('M13.5 17.5a12.5 12.5 0 0 1 6.5-6.2', 3, 0.45)] },
  clap: {
    // a party popper: cone and confetti
    base: [
      { d: 'M7 41.5l9-25 16 16z', fill: POP.yellow, stroke: POP.yellow, w: 2 },
      { d: circ(37.5, 9.5, 3.2), fill: POP.pink }, { d: circ(41, 22, 2.6), fill: POP.blue }, { d: circ(26, 7.5, 2.6), fill: POP.green },
      { d: 'M27 18c2-4 6-5 9-3', stroke: POP.violet, w: 3 },
    ],
    top: [{ d: 'M11.5 29l7.5 7.5M14.5 21.5l12 12', stroke: POP.orange, w: 3 }],
  },
} satisfies Record<string, Spec>;

export type StickerName = keyof typeof SPECS;

const BORDER = 3.4; // white die-cut, in grid units

/** One sticker. `tilt` rotates it a little, like it was stuck on by hand. */
export function Sticker({ name, size = 40, tilt = 0, style }: { name: StickerName; size?: number; tilt?: number; style?: StyleProp<ViewStyle> }) {
  const spec: Spec = SPECS[name];
  const rot = (spec.rot ?? 0) + tilt;
  const outline = (p: Part, k: number, color: string, extra = 0) => (
    <Path key={k} d={p.d} fill={p.fill ? color : 'none'} stroke={color} strokeWidth={(p.w ?? 0) + BORDER * 2 + extra} strokeLinejoin="round" strokeLinecap="round" />
  );
  const paint = (p: Part, k: number) => (
    <Path key={k} d={p.d} fill={p.fill ?? 'none'} stroke={p.stroke ?? 'none'} strokeWidth={p.w ?? 0} strokeLinejoin="round" strokeLinecap="round" opacity={p.o ?? 1} />
  );
  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="-5 -5 58 58">
        {/* soft shadow: two offset copies of the silhouette, always straight down */}
        <G opacity={0.08} transform={`translate(0 3.5) rotate(${rot} 24 24)`}>{spec.base.map((p, k) => outline(p, k, '#0F172A', 2.5))}</G>
        <G opacity={0.1} transform={`translate(0 1.6) rotate(${rot} 24 24)`}>{spec.base.map((p, k) => outline(p, k, '#0F172A'))}</G>
        <G transform={`rotate(${rot} 24 24)`}>
          {spec.base.map((p, k) => outline(p, k, W))}
          {spec.base.map(paint)}
          {spec.top?.map(paint)}
        </G>
      </Svg>
    </View>
  );
}

/**
 * A chat stamp: a sticker with a word on a tilted label, LINE-style.
 * `pop` plays the slap-on animation once when it mounts.
 */
export const STAMPS = [
  { id: 'ganbaro', s: 'fire', label: 'がんばろ', c: POP.orange },
  { id: 'phone', s: 'phone', label: 'スマホ置いた', c: POP.navy },
  { id: 'wakatta', s: 'bulb', label: 'わかった！', c: '#F2A900' },
  { id: 'erai', s: 'star', label: 'えらい！', c: '#F2A900' },
  { id: 'ohayo', s: 'sun', label: 'おはよ', c: POP.orange },
  { id: 'otsu', s: 'coffee', label: 'おつかれ', c: POP.brown },
  { id: 'arigato', s: 'heart', label: 'ありがと', c: POP.red },
  { id: 'muri', s: 'x', label: 'むり〜', c: POP.red },
  { id: 'issho', s: 'person', label: '一緒にやろ', c: POP.orange },
  { id: 'oyasumi', s: 'moon', label: 'おやすみ', c: '#E5A800' },
  { id: 'gokaku', s: 'clap', label: '合格！', c: POP.pink },
  { id: 'ok', s: 'check', label: 'OK', c: POP.blue },
] as const satisfies readonly { id: string; s: StickerName; label: string; c: string }[];
export type StampId = (typeof STAMPS)[number]['id'];
export const stamp = (id: string) => STAMPS.find((x) => x.id === id) ?? STAMPS[0];

export function Stamp({ id, size = 96, pop, delay = 0 }: { id: string; size?: number; pop?: boolean; delay?: number }) {
  const st = stamp(id);
  // sent: it fades in from a touch smaller, and settles without going past (no pop, no spin)
  const o = useSharedValue(pop ? 0 : 1);
  const s = useSharedValue(pop ? 0.98 : 1);
  useEffect(() => {
    if (!pop) return;
    o.set(withDelay(delay, timed(1, M.fadeIn)));
    s.set(withDelay(delay, micro(1)));
  }, [pop, delay, o, s]);
  const a = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));
  const fs = Math.max(11, Math.round(size * 0.15));
  return (
    <Animated.View style={[{ minWidth: size, alignItems: 'center' }, a]} accessible accessibilityLabel={`スタンプ「${st.label}」`}>
      <Sticker name={st.s} size={size * 0.82} />
      <View style={{ marginTop: -size * 0.16, transform: [{ rotate: '-5deg' }], paddingHorizontal: fs * 0.7, paddingVertical: fs * 0.22, borderRadius: fs,
        backgroundColor: st.c, borderWidth: Math.max(2, size * 0.03), borderColor: '#fff', boxShadow: '0px 2px 4px rgba(15,23,42,0.18)' }}>
        <Text numberOfLines={1} style={{ fontFamily: font.rounded, fontSize: fs, lineHeight: Math.round(fs * 1.25), fontWeight: '800', color: '#fff', letterSpacing: 0.2 }}>{st.label}</Text>
      </View>
    </Animated.View>
  );
}
