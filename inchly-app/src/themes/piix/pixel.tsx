import { memo, ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AccessibilityRole, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { T } from '@/themes/kit';
import { font } from '@/theme';
import { haptic } from '@/ui/base';
import { M, micro } from '@/ui/motion';
import { PixelArt } from '../standard/pixel';
import { P, sit } from './look';

// The pieces ピクセル箱 is built from: pixel art drawn from rows of letters (../standard/pixel),
// the pal (a small box creature that lives on the page), the dotted paper,
// keys that sit on a hard shadow and sink when pressed, and the little
// pixel-type labels.

export const STEPS = Easing.steps(3);

// ---------- pixel art ----------
// Rows of letters to pixels: shared with スタンダード, which grew from this kit.
export { PixelArt };

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

/** The pal: blinks now and then, dozes, cheers — and answers a tap with a happy face and a word (it stands still: nothing bobs or hops). */
export function Pal({ mood, px = 4, talk = true, label = 'パル' }: { mood: Mood; px?: number; talk?: boolean; label?: string }) {
  const [blink, setBlink] = useState(false);
  const [poked, setPoked] = useState<string | null>(null);
  const line = useRef(0);
  // blink now and then
  useEffect(() => {
    if (mood === 'sleep') return;
    let id: ReturnType<typeof setTimeout>;
    const next = () => { id = setTimeout(() => { setBlink(true); id = setTimeout(() => { setBlink(false); next(); }, 140); }, 2400 + Math.random() * 2200); };
    next();
    return () => clearTimeout(id);
  }, [mood]);
  useEffect(() => {
    if (!poked) return;
    const id = setTimeout(() => setPoked(null), 1700);
    return () => clearTimeout(id);
  }, [poked]);
  const poke = () => {
    haptic.soft();
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
        <PixelArt rows={rows} px={px} colors={PAL_COLORS} />
      </Pressable>
    </View>
  );
}

/** A speech bubble to the left of whoever says it. */
function Bubble({ text, right, top }: { text: string; right: number; top: number }) {
  // it fades in where it is (no pop)
  const s = useSharedValue(0);
  useEffect(() => { s.set(micro(1)); }, [s]);
  const a = useAnimatedStyle(() => ({ opacity: s.value }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', right, top, zIndex: 3, maxWidth: 170, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, backgroundColor: P.card, boxShadow: sit(2) }, a]}>
      <T f="pixel" size={12} lh={16} numberOfLines={1}>{text}</T>
    </Animated.View>
  );
}

/** A z over a dozing pal (it doesn't drift up: nothing loops). */
function Zzz({ px }: { px: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', right: -px, top: 0, opacity: 0.7, transform: [{ translateY: -3 * px }, { translateX: px }] }}>
      <T f="label" size={3 * px} color={P.ink3}>z</T>
    </View>
  );
}

// ---------- small sprites ----------
const FLAME = [
  ['...C....', '...CC...', '..CCC...', '..CSCC..', '.CCSSC..', '.CSSSCC.', 'CCSWSSC.', 'CSSWWSCC', 'CSSWWSSC', '.CCSSCC.'],
  ['....C...', '...CC...', '...CCC..', '..CCSC..', '..CSSCC.', '.CCSSSC.', '.CSSWSCC', 'CCSWWSSC', 'CSSWWSSC', '.CCSSCC.'],
];
const FLAME_COLORS = { C: P.coral, S: P.sun, W: '#FFF6D6' };
/** The streak's flame (one frame: it doesn't flicker or leap — nothing loops or hops, and nothing redraws it twice a second). */
export function Flame({ px = 4, lit = true }: { px?: number; lit?: boolean }) {
  return (
    <View style={{ opacity: lit ? 1 : 0.35 }}>
      <PixelArt rows={FLAME[0]} px={px} colors={lit ? FLAME_COLORS : { C: P.ink3, S: P.sunk, W: P.card }} />
    </View>
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
      onPressIn={() => p.set(withTiming(1, M.press))}
      onPressOut={() => p.set(withTiming(0, { duration: M.micro.duration, easing: STEPS }))}
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
