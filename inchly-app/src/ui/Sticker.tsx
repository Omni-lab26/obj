import { useEffect } from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';

import { font } from '../theme';

// Pop stickers: one bold, flat colour per part, a thick white die-cut border
// and a soft shadow under it — like a sticker sheet. Drawn on a 64×64 grid.
// `base` parts make the silhouette (they get the border and shadow); `top`
// parts are details printed on the sticker.
type Part = { d: string; fill?: string; stroke?: string; w?: number; o?: number };

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

// ---------- Inch, the inchworm ----------
// Inchly's one character. An inchworm moves by arching its body and measures
// the world one inch at a time — the app's idea in a body. Every stamp is Inch
// in a pose with a face and one prop; same die-cut border and shadow as above.
export type InchPose = 'arch' | 'up' | 'flat';
export type InchEyes = 'dot' | 'happy' | 'closed' | 'sparkle' | 'sad' | 'wink';
export type InchMouth = 'smile' | 'open' | 'o';
export type InchProp = 'none' | 'heart' | 'star' | 'zzz' | 'sweat' | 'phone' | 'coffee' | 'book' | 'sun' | 'flame' | 'bulb' | 'check' | 'party';

const BODY = ['#86D35A', '#99DE6C'];
const HEAD = '#A2E476';
const EDGE = '#4F9E36';
const FACE = '#1E2B14';

function inch(pose: InchPose, eyes: InchEyes, mouth: InchMouth, prop: InchProp) {
  const base: Part[] = [];
  const top: Part[] = [];
  let segs: [number, number][] = [];
  let head: [number, number, number];
  let front = true; // face the viewer (up) or look right (arch, flat)
  if (pose === 'arch') {
    segs = Array.from({ length: 10 }, (_, i) => { const u = i / 9; return [7 + 40 * u, 54 - 30 * Math.pow(Math.sin(Math.PI * u), 0.85)]; });
    head = [54, 44, 9.5];
    front = false;
  } else if (pose === 'up') {
    segs = Array.from({ length: 7 }, (_, i) => [32 + 1.6 * Math.sin(i * 0.9), 59 - 5.2 * i]);
    head = [32, 19, 10.5];
  } else {
    segs = Array.from({ length: 8 }, (_, i) => [5 + 5.6 * i, 53 - 1.4 * Math.sin(i * 1.1)]);
    head = [52, 48, 9.5];
    front = false;
  }
  const [hx, hy, hr] = head;
  // feet: little dark prolegs where the body meets the ground
  const feet: [number, number][] = pose === 'arch' ? [[7, 60], [12, 60], [44, 60], [49, 60]] : pose === 'up' ? [[29, 64], [35, 64]] : [[6, 59.5], [16, 59.5], [28, 59.5], [40, 59.5]];
  feet.forEach(([x, y]) => base.push({ d: circ(x, y, 2.2), fill: EDGE }));
  segs.forEach(([x, y], i) => base.push({ d: circ(x, y, 6.4), fill: BODY[i % 2], stroke: EDGE, w: 1.2 }));
  // antennae
  const ant = front ? [[hx - 4, hy - hr + 1.5, -2.5], [hx + 4, hy - hr + 1.5, 2.5]] : [[hx - 1, hy - hr + 1.5, 0.5], [hx + 5, hy - hr + 2.5, 3.5]];
  ant.forEach(([x, y, dx]) => {
    base.push({ d: `M${x} ${y}l${dx} -6`, stroke: EDGE, w: 1.6 });
    base.push({ d: circ(x + dx, y - 6.5, 1.8), fill: '#FFCC00', stroke: EDGE, w: 1 });
  });
  base.push({ d: circ(hx, hy, hr), fill: HEAD, stroke: EDGE, w: 1.2 });

  // face
  const ex = front ? [hx - 3.8, hx + 3.8] : [hx - 1, hx + 5];
  const ey = hy - 1;
  const mx = (ex[0] + ex[1]) / 2;
  const my = hy + 3.6;
  top.push({ d: circ(ex[0] - 1.6, hy + 2.8, 1.7), fill: '#FF8FA3', o: 0.6 }, { d: circ(ex[1] + 1.6, hy + 2.8, 1.7), fill: '#FF8FA3', o: 0.6 });
  const dotEye = (x: number) => { top.push({ d: circ(x, ey, 1.8), fill: FACE }, { d: circ(x + 0.6, ey - 0.6, 0.6), fill: '#fff' }); };
  const arcUp = (x: number) => top.push({ d: `M${x - 2} ${ey + 0.8}q2 -2.8 4 0`, stroke: FACE, w: 1.5 });
  const arcDown = (x: number) => top.push({ d: `M${x - 2} ${ey - 0.4}q2 2.4 4 0`, stroke: FACE, w: 1.5 });
  ex.forEach((x, i) => {
    if (eyes === 'dot') dotEye(x);
    else if (eyes === 'happy') arcUp(x);
    else if (eyes === 'closed') arcDown(x);
    else if (eyes === 'sparkle') top.push({ d: `M${x} ${ey - 2.6}l.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8z`, fill: FACE });
    else if (eyes === 'sad') { dotEye(x); top.push({ d: i ? `M${x - 2} ${ey - 3.4}l3.4 1.2` : `M${x + 2} ${ey - 3.4}l-3.4 1.2`, stroke: FACE, w: 1.2 }); }
    else if (eyes === 'wink') { if (i) arcUp(x); else dotEye(x); }
  });
  if (mouth === 'smile') top.push({ d: `M${mx - 2.2} ${my}q2.2 2.4 4.4 0`, stroke: FACE, w: 1.4 });
  else if (mouth === 'open') top.push({ d: `M${mx - 2.4} ${my - 0.4}h4.8a2.4 2.4 0 0 1-4.8 0z`, fill: '#C2453A', stroke: FACE, w: 1 });
  else top.push({ d: circ(mx, my + 0.6, 1.3), fill: FACE });

  // one prop, in the empty corner of the pose
  const [ax, ay] = pose === 'arch' ? [52, 21] : pose === 'up' ? [52, 30] : [32, 24];
  const add = (b: Part[], t: Part[] = []) => { base.push(...b); top.push(...t); };
  if (prop === 'heart') add([{ d: `M${ax} ${ay + 7}c-5-3.4-8-6.3-8-9.6 0-2.4 1.8-4.2 4-4.2 1.7 0 3 .9 4 2.3 1-1.4 2.3-2.3 4-2.3 2.2 0 4 1.8 4 4.2 0 3.3-3 6.2-8 9.6z`, fill: '#FF3B5C' }], [shine(`M${ax - 5} ${ay - 2}a2.5 2.5 0 0 1 2-2`, 1.6, 0.6)]);
  if (prop === 'star') add([{ d: star(ax, ay, 9, 4.2), fill: '#FFC93C', stroke: '#FFC93C', w: 2 }]);
  if (prop === 'zzz') add([{ d: `M${ax - 9} ${ay - 2}h5l-5 5h5M${ax} ${ay - 9}h6.5l-6.5 6.5h6.5M${ax + 10} ${ay - 15}h4l-4 4h4`, stroke: '#5856D6', w: 2 }]);
  if (prop === 'sweat') add([{ d: `M${hx - hr - 1} ${hy - hr - 2}c-2.6 3.4-3.6 5.4-3.6 6.8a3.6 3.6 0 0 0 7.2 0c0-1.4-1-3.4-3.6-6.8z`, fill: '#5AC8FA' }]);
  if (prop === 'phone') add([{ d: rr(ax - 6, ay - 10, 12, 20, 3), fill: '#1C1C1E' }], [{ d: rr(ax - 4.2, ay - 7.6, 8.4, 14.6, 1.5), fill: '#3A3A3C' }, { d: `M${ax - 3} ${ay + 9}h6`, stroke: '#8E8E93', w: 1 }]);
  if (prop === 'coffee') add([
    { d: `M${ax + 4.5} ${ay - 1}h1.8a3 3 0 0 1 0 6h-2.2`, stroke: '#C9773A', w: 2.2 },
    { d: `M${ax - 7} ${ay - 3}h12v6a5.5 5.5 0 0 1-5.5 5.5h-1A5.5 5.5 0 0 1 ${ax - 7} ${ay + 3}z`, fill: '#C9773A' },
    { d: `M${ax - 3} ${ay - 12}c-1.5 2 1.5 3 0 5M${ax + 1.5} ${ay - 12}c-1.5 2 1.5 3 0 5`, stroke: '#C7C7CC', w: 1.6 },
  ], [{ d: rr(ax - 7, ay - 3, 12, 2.2, 1.1), fill: '#fff', o: 0.35 }]);
  if (prop === 'book') add([{ d: `M${ax} ${ay + 6}c-3-2-7-2-10 0v-12c3-2 7-2 10 0 3-2 7-2 10 0v12c-3-2-7-2-10 0z`, fill: '#5856D6' }], [
    { d: `M${ax} ${ay + 4}c-2.6-1.6-5.8-1.6-8.2-.2v-9.8c2.4-1.4 5.6-1.4 8.2.2 2.6-1.6 5.8-1.6 8.2-.2v9.8c-2.4-1.4-5.6-1.4-8.2.2z`, fill: '#fff' },
    { d: `M${ax} ${ay - 5.8}v9.8`, stroke: '#C7C7CC', w: 0.8 },
  ]);
  if (prop === 'sun') add([
    { d: `M${ax} ${ay - 13}v3M${ax - 9} ${ay - 9}l2 2M${ax + 9} ${ay - 9}l-2 2M${ax - 13} ${ay}h3M${ax + 13} ${ay}h-3M${ax - 9} ${ay + 9}l2-2M${ax + 9} ${ay + 9}l-2-2`, stroke: '#FF9500', w: 2.2 },
    { d: circ(ax, ay, 6.5), fill: '#FFC93C' },
  ]);
  if (prop === 'flame') add([{ d: `M${ax} ${ay + 9}c-5 0-8-3.3-8-7.6 0-3.6 2-5.6 3.4-7.3.2 1.6 1 2.7 2.2 3.3-.5-3.8 1.3-7.6 4.8-10.4 0 3 1.4 4.7 3 6.3 1.7 1.7 3.6 3.9 3.6 7.9 0 4.6-3.6 7.8-9 7.8z`, fill: '#FF7A1A' }],
    [{ d: `M${ax} ${ay + 9}c-2.4 0-4-1.6-4-3.8 0-2.2 1.4-3.6 2.7-4.6 0 1.3.7 2.2 1.6 2.4-.2-1.9.6-3.5 1.9-4.6.3 1.9 1.8 3 1.8 5.4 0 3-1.6 5.2-4 5.2z`, fill: '#FFC93C' }]);
  if (prop === 'bulb') add([
    { d: `M${ax} ${ay - 11}a7.4 7.4 0 0 0-4.4 13.3c.9.7 1.5 1.7 1.5 2.8v1h5.8v-1c0-1.1.6-2.1 1.5-2.8A7.4 7.4 0 0 0 ${ax} ${ay - 11}z`, fill: '#FFD23F' },
    { d: rr(ax - 3, ay + 6.1, 6, 4.4, 1.6), fill: '#8E8E93' },
  ], [shine(`M${ax - 4} ${ay - 5}a4.5 4.5 0 0 1 2.6-2.8`, 1.6, 0.7)]);
  if (prop === 'check') add([{ d: circ(ax, ay, 8.5), fill: '#2AA05A' }], [{ d: `M${ax - 4} ${ay}l2.8 2.8 5.2-5.4`, stroke: '#fff', w: 2.4 }]);
  if (prop === 'party') add([
    { d: `M${ax - 9} ${ay + 9}l4.5-12.5 8 8z`, fill: '#FFC93C', stroke: '#FFC93C', w: 1.5 },
    { d: circ(ax + 6, ay - 9, 2), fill: '#FF2D55' }, { d: circ(ax + 9, ay - 1, 1.7), fill: '#5856D6' }, { d: circ(ax - 1, ay - 11, 1.7), fill: '#30B0C7' },
    { d: `M${ax - 1} ${ay - 4}c1.2-2.6 3.8-3.2 5.8-2`, stroke: '#FF9500', w: 1.8 },
  ]);
  return { base, top };
}

/** Inch on its own (empty states, the record stamp, the home ruler). */
export function Inch({ pose = 'arch', eyes = 'dot', mouth = 'smile', prop = 'none', size = 64, tilt = 0, border = true, style }: {
  pose?: InchPose; eyes?: InchEyes; mouth?: InchMouth; prop?: InchProp; size?: number; tilt?: number; border?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { base, top } = inch(pose, eyes, mouth, prop);
  const B = 3.2;
  const outline = (p: Part, k: number, color: string, extra = 0) => (
    <Path key={k} d={p.d} fill={p.fill ? color : 'none'} stroke={color} strokeWidth={(p.w ?? 0) + B * 2 + extra} strokeLinejoin="round" strokeLinecap="round" />
  );
  const paint = (p: Part, k: number) => (
    <Path key={k} d={p.d} fill={p.fill ?? 'none'} stroke={p.stroke ?? 'none'} strokeWidth={p.w ?? 0} strokeLinejoin="round" strokeLinecap="round" opacity={p.o ?? 1} />
  );
  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="-6 -8 76 76">
        {border ? (
          <>
            <G opacity={0.07} transform={`translate(0 3.5) rotate(${tilt} 32 32)`}>{base.map((p, k) => outline(p, k, '#000', 2.5))}</G>
            <G opacity={0.09} transform={`translate(0 1.6) rotate(${tilt} 32 32)`}>{base.map((p, k) => outline(p, k, '#000'))}</G>
          </>
        ) : null}
        <G transform={`rotate(${tilt} 32 32)`}>
          {border ? base.map((p, k) => outline(p, k, W)) : null}
          {base.map(paint)}
          {top.map(paint)}
        </G>
      </Svg>
    </View>
  );
}

// ---------- chat stamps: Inch with a word, LINE-style ----------
export const STAMPS = [
  { id: 'ganbaro', pose: 'arch', eyes: 'dot', mouth: 'open', prop: 'flame', label: 'がんばろ', c: '#FF7A1A' },
  { id: 'phone', pose: 'flat', eyes: 'happy', mouth: 'smile', prop: 'phone', label: 'スマホ置いた', c: '#1C1C1E' },
  { id: 'wakatta', pose: 'up', eyes: 'sparkle', mouth: 'open', prop: 'bulb', label: 'わかった！', c: '#E0A100' },
  { id: 'erai', pose: 'up', eyes: 'happy', mouth: 'open', prop: 'star', label: 'えらい！', c: '#E0A100' },
  { id: 'ohayo', pose: 'up', eyes: 'dot', mouth: 'smile', prop: 'sun', label: 'おはよ', c: '#FF9500' },
  { id: 'otsu', pose: 'flat', eyes: 'happy', mouth: 'smile', prop: 'coffee', label: 'おつかれ', c: '#A2643A' },
  { id: 'arigato', pose: 'arch', eyes: 'happy', mouth: 'smile', prop: 'heart', label: 'ありがと', c: '#FF3B5C' },
  { id: 'muri', pose: 'flat', eyes: 'sad', mouth: 'o', prop: 'sweat', label: 'むり〜', c: '#5856D6' },
  { id: 'issho', pose: 'arch', eyes: 'dot', mouth: 'smile', prop: 'book', label: '一緒にやろ', c: '#2AA05A' },
  { id: 'oyasumi', pose: 'flat', eyes: 'closed', mouth: 'smile', prop: 'zzz', label: 'おやすみ', c: '#5856D6' },
  { id: 'gokaku', pose: 'up', eyes: 'sparkle', mouth: 'open', prop: 'party', label: '合格！', c: '#FF2D55' },
  { id: 'ok', pose: 'up', eyes: 'wink', mouth: 'smile', prop: 'check', label: 'OK', c: '#2AA05A' },
] as const satisfies readonly { id: string; pose: InchPose; eyes: InchEyes; mouth: InchMouth; prop: InchProp; label: string; c: string }[];
export type StampId = (typeof STAMPS)[number]['id'];
export const stamp = (id: string) => STAMPS.find((x) => x.id === id) ?? STAMPS[0];

/** A stamp. `pop` plays the slap-on once when it mounts. */
export function Stamp({ id, size = 96, pop, delay = 0 }: { id: string; size?: number; pop?: boolean; delay?: number }) {
  const st = stamp(id);
  const s = useSharedValue(pop ? 0.2 : 1);
  const r = useSharedValue(pop ? -18 : 0);
  useEffect(() => {
    if (!pop) return;
    s.set(withDelay(delay, withSequence(withTiming(1.12, { duration: 160 }), withSpring(1, { duration: 420, dampingRatio: 0.45 }))));
    r.set(withDelay(delay, withSpring(0, { duration: 520, dampingRatio: 0.5 })));
  }, [pop, delay, s, r]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }, { rotate: `${r.value}deg` }] }));
  const fs = Math.max(11, Math.round(size * 0.14));
  return (
    <Animated.View style={[{ minWidth: size, alignItems: 'center' }, a]} accessible accessibilityLabel={`スタンプ「${st.label}」`}>
      <Inch pose={st.pose} eyes={st.eyes} mouth={st.mouth} prop={st.prop} size={size * 0.86} />
      <View style={{ marginTop: -size * 0.14, transform: [{ rotate: '-4deg' }], paddingHorizontal: fs * 0.7, paddingVertical: fs * 0.2, borderRadius: fs,
        backgroundColor: st.c, borderWidth: Math.max(2, size * 0.03), borderColor: '#fff', boxShadow: '0px 2px 4px rgba(0,0,0,0.16)' }}>
        <Text numberOfLines={1} style={{ fontFamily: font.rounded, fontSize: fs, lineHeight: Math.round(fs * 1.25), fontWeight: '800', color: '#fff', letterSpacing: 0.2 }}>{st.label}</Text>
      </View>
    </Animated.View>
  );
}
