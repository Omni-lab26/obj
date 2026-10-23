import { memo, ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AccessibilityRole, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { T } from '@/themes/kit';
import { font } from '@/theme';
import { haptic } from '@/ui/base';
import { P, sit } from './look';

// The pieces ピクセル箱 is built from: pixel art drawn from rows of letters,
// the pal (a small box creature that lives on the page), the dotted paper,
// keys that sit on a hard shadow and sink when pressed, and the little
// pixel-type labels.

export const STEPS = Easing.steps(3);

// ---------- pixel art ----------
/** Draws rows like '..XXLL..' — one letter a pixel, '.' empty — in the colors given. Runs of a color are one rect. */
export const PixelArt = memo(function PixelArt({ rows, px, colors }: { rows: string[]; px: number; colors: Record<string, string> }) {
  const w = rows[0]?.length ?? 0;
  const h = rows.length;
  const rects: ReactNode[] = [];
  rows.forEach((r, y) => {
    let x = 0;
    while (x < w) {
      const ch = r[x];
      const fill = colors[ch];
      if (!fill) { x++; continue; }
      let e = x;
      while (e + 1 < w && r[e + 1] === ch) e++;
      rects.push(<Rect key={`${x}.${y}`} x={x} y={y} width={e - x + 1} height={1} fill={fill} />);
      x = e + 1;
    }
  });
  return <Svg width={w * px} height={h * px} viewBox={`0 0 ${w} ${h}`}>{rects}</Svg>;
});

// ---------- the pal ----------
// A box with a lid, two eyes and small feet. 16 × 14.
const BODY = [
  '................',
  '....XXXXXXXX....',
  '...XLLLLLLLLX...',
  '..XXXXXXXXXXXX..',
  '.XLLLLLLLLLLLDX.',
  '.XLLLLLLLLLLLDX.',
  '.XLLLLLLLLLLLDX.',
  '.XLLLLLLLLLLLDX.',
  '.XLLLLLLLLLLLDX.',
  '.XLLLLLLLLLLLDX.',
  '.XLLLLLLLLLLLDX.',
  '.XDDDDDDDDDDDDX.',
  '..XXXXXXXXXXXX..',
  '...XX......XX...',
];
type Eyes = 'open' | 'shut' | 'happy' | 'side';
type Mouth = 'smile' | 'flat' | 'open' | 'o';
const EYES: Record<Eyes, [string, string, string, string]> = {
  open: ['W', 'X', 'X', 'X'], // a shine at the top left
  shut: ['L', 'L', 'X', 'X'],
  happy: ['X', 'X', 'L', 'L'],
  side: ['X', 'W', 'X', 'X'],
};
function palRows(eyes: Eyes, mouth: Mouth, o: { blush?: boolean; arms?: boolean; lid?: boolean } = {}) {
  const g = BODY.map((r) => r.split(''));
  const e = EYES[eyes];
  for (const x of [3, 10]) { g[5][x] = e[0]; g[5][x + 1] = e[1]; g[6][x] = e[2]; g[6][x + 1] = e[3]; }
  if (mouth === 'smile') { g[8][6] = 'X'; g[8][9] = 'X'; g[9][7] = 'X'; g[9][8] = 'X'; }
  if (mouth === 'flat') { g[8][7] = 'X'; g[8][8] = 'X'; }
  if (mouth === 'o') { g[8][7] = 'X'; g[8][8] = 'X'; g[9][7] = 'X'; g[9][8] = 'X'; }
  if (mouth === 'open') { for (let x = 6; x <= 9; x++) g[8][x] = 'X'; g[9][6] = 'X'; g[9][7] = 'C'; g[9][8] = 'C'; g[9][9] = 'X'; g[10][7] = 'X'; g[10][8] = 'X'; }
  if (o.blush) { g[7][2] = 'C'; g[7][12] = 'C'; }
  // the lid hops up a pixel (the box stands open under it)
  if (o.lid) { g[0] = g[1]; g[1] = g[2]; g[2] = g[3]; g[3] = '................'.split(''); }
  if (o.arms) { g[3][0] = 'X'; g[4][0] = 'X'; g[3][15] = 'X'; g[4][15] = 'X'; }
  return g.map((r) => r.join(''));
}
const PAL_COLORS = { X: P.ink, L: P.lime, D: P.limeDeep, W: '#FFFFFF', C: P.coral };
const MARK = palRows('open', 'smile');
/** The pal, small and still: the app's mark. */
export const PalMark = ({ px = 2 }: { px?: number }) => <PixelArt rows={MARK} px={px} colors={PAL_COLORS} />;

export type Mood = 'idle' | 'work' | 'sleep' | 'happy' | 'cheer';
const FACES: Record<Mood, { eyes: Eyes; mouth: Mouth; blush?: boolean; arms?: boolean; lid?: boolean }> = {
  idle: { eyes: 'open', mouth: 'smile' },
  work: { eyes: 'side', mouth: 'flat' },
  sleep: { eyes: 'shut', mouth: 'o' },
  happy: { eyes: 'happy', mouth: 'open', blush: true },
  cheer: { eyes: 'happy', mouth: 'open', blush: true, arms: true, lid: true },
};
const LINES: Record<Mood, string[]> = {
  idle: ['やるか！', '5分だけでも', 'つぎ、なにする？', 'いっしょにやろ'],
  work: ['いい調子！', 'しゅうちゅう…', 'その調子', 'もうひといき'],
  sleep: ['zzz…', 'ねむい…', 'おこして〜'],
  happy: ['えらい！', '目標クリア！', 'きょうは最高'],
  cheer: ['やった！', 'すごい！'],
};

/** The pal: blinks, bobs as it works, dozes, cheers — and answers a tap with a hop and a word. */
export function Pal({ mood, px = 4, talk = true, label = 'パル' }: { mood: Mood; px?: number; talk?: boolean; label?: string }) {
  const [blink, setBlink] = useState(false);
  const [poked, setPoked] = useState<string | null>(null);
  const line = useRef(0);
  const y = useSharedValue(0);
  const hop = useSharedValue(0);
  // blink now and then
  useEffect(() => {
    if (mood === 'sleep') return;
    let id: ReturnType<typeof setTimeout>;
    const next = () => { id = setTimeout(() => { setBlink(true); id = setTimeout(() => { setBlink(false); next(); }, 140); }, 2400 + Math.random() * 2200); };
    next();
    return () => clearTimeout(id);
  }, [mood]);
  // bob: slow when idle or asleep, quick while working, hops when happy
  useEffect(() => {
    const u = px;
    cancelAnimation(y);
    if (mood === 'work') y.set(withRepeat(withSequence(withTiming(-u, { duration: 220, easing: STEPS }), withTiming(0, { duration: 220, easing: STEPS })), -1));
    else if (mood === 'happy' || mood === 'cheer') y.set(withRepeat(withSequence(withTiming(-3 * u, { duration: 180, easing: STEPS }), withTiming(0, { duration: 180, easing: STEPS }), withDelay(900, withTiming(0, { duration: 1 }))), -1));
    else if (mood === 'sleep') y.set(withRepeat(withSequence(withTiming(u * 0.5, { duration: 1400, easing: STEPS }), withTiming(0, { duration: 1400, easing: STEPS })), -1));
    else y.set(withRepeat(withSequence(withTiming(-u * 0.5, { duration: 700, easing: STEPS }), withTiming(0, { duration: 700, easing: STEPS })), -1));
    return () => cancelAnimation(y);
  }, [mood, px, y]);
  useEffect(() => {
    if (!poked) return;
    const id = setTimeout(() => setPoked(null), 1700);
    return () => clearTimeout(id);
  }, [poked]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value + hop.value }] }));
  const poke = () => {
    haptic.soft();
    hop.set(withSequence(withTiming(-4 * px, { duration: 120, easing: STEPS }), withTiming(0, { duration: 160, easing: STEPS })));
    const ls = LINES[mood];
    setPoked(ls[line.current++ % ls.length]);
  };
  const face = poked && mood !== 'sleep' ? 'happy' : mood;
  const rows = useMemo(() => {
    const f = FACES[face];
    return palRows(blink && (f.eyes === 'open' || f.eyes === 'side') ? 'shut' : f.eyes, f.mouth, f);
  }, [face, blink]);
  const w = 16 * px, h = 14 * px;
  return (
    <View style={{ width: w, height: h }}>
      {talk && poked ? <Bubble text={poked} right={w - 2 * px} top={-2} /> : null}
      {mood === 'sleep' && !poked ? <Zzz px={px} /> : null}
      <Pressable onPress={poke} accessibilityRole="button" accessibilityLabel={`${label}をつつく`} hitSlop={8}>
        <Animated.View style={a}>
          <PixelArt rows={rows} px={px} colors={PAL_COLORS} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

/** A speech bubble to the left of whoever says it. */
function Bubble({ text, right, top }: { text: string; right: number; top: number }) {
  const s = useSharedValue(0.6);
  useEffect(() => { s.set(withTiming(1, { duration: 120, easing: STEPS })); }, [s]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', right, top, zIndex: 3, maxWidth: 170, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, backgroundColor: P.card, boxShadow: sit(2) }, a]}>
      <T f="pixel" size={12} lh={16} numberOfLines={1}>{text}</T>
    </Animated.View>
  );
}

/** Zs rising off a dozing pal. */
function Zzz({ px }: { px: number }) {
  const t = useSharedValue(0);
  useEffect(() => { t.set(withRepeat(withTiming(1, { duration: 1800, easing: STEPS }), -1)); return () => cancelAnimation(t); }, [t]);
  const a = useAnimatedStyle(() => ({ opacity: 1 - t.value * 0.8, transform: [{ translateY: -t.value * 6 * px }, { translateX: t.value * 2 * px }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', right: -px, top: 0 }, a]}>
      <T f="label" size={3 * px} color={P.ink3}>z</T>
    </Animated.View>
  );
}

// ---------- small sprites ----------
const FLAME = [
  ['...C....', '...CC...', '..CCC...', '..CSCC..', '.CCSSC..', '.CSSSCC.', 'CCSWSSC.', 'CSSWWSCC', 'CSSWWSSC', '.CCSSCC.'],
  ['....C...', '...CC...', '...CCC..', '..CCSC..', '..CSSCC.', '.CCSSSC.', '.CSSWSCC', 'CCSWWSSC', 'CSSWWSSC', '.CCSSCC.'],
];
const FLAME_COLORS = { C: P.coral, S: P.sun, W: '#FFF6D6' };
/** The streak's flame, flickering between two frames; pass `jump` to make it leap. */
export function Flame({ px = 4, lit = true, jump = 0 }: { px?: number; lit?: boolean; jump?: number }) {
  const [f, setF] = useState(0);
  const y = useSharedValue(0);
  useEffect(() => {
    if (!lit) return;
    const id = setInterval(() => setF((x) => 1 - x), 420);
    return () => clearInterval(id);
  }, [lit]);
  useEffect(() => {
    if (!jump) return;
    y.set(withSequence(withTiming(-3 * px, { duration: 110, easing: STEPS }), withTiming(0, { duration: 160, easing: STEPS })));
  }, [jump, px, y]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={[{ opacity: lit ? 1 : 0.35 }, a]}>
      <PixelArt rows={FLAME[f]} px={px} colors={lit ? FLAME_COLORS : { C: P.ink3, S: P.sunk, W: P.card }} />
    </Animated.View>
  );
}

const MINI = ['.XXXX.', 'XBBBBX', 'XWBBWX', 'XBBBBX', 'XBBBBX', '.X..X.'];
/** A tiny someone, for the crowd. */
export const Mini = memo(function Mini({ color, px = 3 }: { color: string; px?: number }) {
  return <PixelArt rows={MINI} px={px} colors={{ X: P.ink, B: color, W: '#FFFFFF' }} />;
});

// ---------- the paper ----------
/** Dotted paper behind everything (square dots, a pixel each). */
export function DotGrid({ color = 'rgba(23,18,31,0.12)', gap = 16 }: { color?: string; gap?: number }) {
  const id = `dots${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} x={0} y={0} width={gap} height={gap} patternUnits="userSpaceOnUse">
            <Rect x={gap / 2} y={gap / 2} width={1.5} height={1.5} fill={color} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

// ---------- keys ----------
type KeyProps = {
  onPress?: () => void; label: string; children: ReactNode;
  /** the key's face */ color?: string;
  /** how far it sits above its base, and so how far it sinks */ depth?: number;
  radius?: number; disabled?: boolean; selected?: boolean; checked?: boolean; role?: AccessibilityRole;
  /** the outer box: size, flex, margins */ style?: StyleProp<ViewStyle>;
  /** the face: padding, height, layout of what's on it */ face?: StyleProp<ViewStyle>;
  feel?: 'tap' | 'soft' | 'firm' | 'none';
};
/** A key on a hard ink base: pressed, the face sinks onto it. */
export function Key({ onPress, label, children, color = P.card, depth = 3, radius = 12, disabled, selected, checked, role = 'button', style, face, feel = 'tap' }: KeyProps) {
  const p = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: depth * p.value }] }));
  return (
    <Pressable accessibilityRole={role} accessibilityLabel={label} accessibilityState={{ disabled, selected, checked }} disabled={disabled} hitSlop={6}
      onPressIn={() => p.set(withTiming(1, { duration: 40 }))}
      onPressOut={() => p.set(withTiming(0, { duration: 140, easing: STEPS }))}
      onPress={() => { if (feel !== 'none') haptic[feel](); onPress?.(); }}
      style={[{ paddingBottom: depth, opacity: disabled ? 0.4 : 1 }, style]}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: depth, bottom: 0, borderRadius: radius, backgroundColor: P.ink }} />
      <Animated.View style={[{ borderRadius: radius, backgroundColor: color, borderWidth: 2, borderColor: P.ink, alignItems: 'center', justifyContent: 'center' }, face, a]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ---------- text ----------
/** Japanese text: always the system face (the theme's display face has no Japanese). */
export function J(props: Parameters<typeof T>[0]) {
  return <T {...props} style={[props.style, { fontFamily: (props.size ?? 14) >= 20 ? font.display : font.text }]} />;
}

// ---------- labels and boxes ----------
/** A section's small pixel-type label, after a colored square. Latin and figures only. */
export function Label({ text, dot = P.coral, color = P.ink, size = 10 }: { text: string; dot?: string; color?: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, backgroundColor: dot, boxShadow: `0px 0px 0px 1.5px ${P.ink}` }} />
      <T f="label" size={size} lh={size + 4} color={color} ls={1} upper numberOfLines={1}>{text}</T>
    </View>
  );
}

/** A card sitting on the page: ink outline and a hard shadow. */
export function Box({ children, style, bg = P.card, depth = 4, radius = 22 }: { children?: ReactNode; style?: StyleProp<ViewStyle>; bg?: string; depth?: number; radius?: number }) {
  return <View style={[{ backgroundColor: bg, borderRadius: radius, boxShadow: sit(depth) }, style]}>{children}</View>;
}
