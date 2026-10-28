import { ReactNode, useEffect, useId, useMemo, useRef } from 'react';
import { GestureResponderEvent, Pressable, StyleProp, StyleSheet, Text, TextProps, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';

import { useStore } from '@/store';
import { bundledFace, faceFor, focus, radius, useT } from '@/theme';
import { haptic } from '@/ui/base';
import { dismiss, press, release } from '@/ui/motion';

// ガリ版 (riso): one purple ink on straw paper, as if the whole app were a
// small zine run off a stencil duplicator. Everything is printed in the one
// ink — subjects too, told apart by shade and pattern (solid, halftone, lines,
// dots, cross-hatch, grid), never by hue. The things you tap answer like
// print: plates slip out of register, stamps thump down.

// ---------- ink ----------
/** The ink and the paper, from the theme (the timer is printed the other way round: paper on deep ink). */
export function useInk() {
  const t = useT();
  return useMemo(() => ({
    ink: t.ink, paper: t.canvas, sheet: t.surface, ink2: t.ink2, ink3: t.ink3, line: t.line, line2: t.line2,
    /** the timer's deep ink, and the paper's tones on it */
    deep: focus.bg, onDeep: t.canvas, onDeep2: 'rgba(229,224,207,0.66)', onDeep3: 'rgba(229,224,207,0.36)',
    /** the ink thinned on paper: 1 = full ink, 0 = bare paper */
    tint: (k: number) => mix(t.ink, t.canvas, k),
  }), [t]);
}
export type Ink = ReturnType<typeof useInk>;
const hex = (c: string) => { const n = parseInt(c.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const mix = (a: string, b: string, k: number) => {
  const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b);
  const c = (x: number, y: number) => Math.round(x * k + y * (1 - k)).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
};

// ---------- type ----------
/** title: bold serif · serif: the book face · mono / monoB: typewriter (Latin and figures only) · sans / sansB: Japanese labels */
type Face = 'title' | 'serif' | 'mono' | 'monoB' | 'sans' | 'sansB';
export function P({ f = 'serif', size = 14, color, lh, ls, num, style, ...rest }: TextProps & { f?: Face; size?: number; color?: string; lh?: number; ls?: number; num?: boolean }) {
  const t = useT(); // renders again when the bundled faces arrive
  const typed = f === 'mono' ? bundledFace('plex') : f === 'monoB' ? bundledFace('plexBold') : undefined;
  const family = f === 'title' ? faceFor('serif', 99) : f === 'serif' ? faceFor('serif', 10)
    : f === 'mono' || f === 'monoB' ? typed ?? faceFor('mono', size) : faceFor('system', size);
  const bold = f === 'title' || f === 'sansB' || (f === 'monoB' && !typed);
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: family, fontSize: size, color: color ?? t.ink, lineHeight: lh ?? Math.round(size * 1.35), letterSpacing: ls },
        bold && { fontWeight: '700' },
        num && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}
/** Latin and figures only: those go in the typewriter face; anything with Japanese in the sans. */
export const latin = (s: string) => /^[\x20-\x7E▶●■□○◀×+−–·:./%]*$/.test(s);

// ---------- patterns ----------
export type PatternKind = 'solid' | 'halftone' | 'lines' | 'dots' | 'cross' | 'grid' | 'none';
export type Plate = { kind: PatternKind; shade: number };
const KINDS: PatternKind[] = ['solid', 'halftone', 'lines', 'dots', 'cross', 'grid'];
/** Each subject's plate: a pattern and a shade of the one ink, by its place in your list. */
export function usePlates() {
  const subjects = useStore((s) => s.subjects);
  return useMemo(() => {
    const m = new Map<string, Plate>();
    subjects.forEach((s, i) => m.set(s.id, { kind: KINDS[i % KINDS.length], shade: Math.floor(i / KINDS.length) % 2 ? 0.58 : 1 }));
    return (id: string): Plate => m.get(id) ?? { kind: 'none', shade: 0.5 };
  }, [subjects]);
}
/** An id for this SVG's patterns (ids are shared across the page on the web). */
export const useSvgId = () => useId().replace(/[^a-zA-Z0-9]/g, '');
/** The patterns, in one ink. Put inside an <Svg>; fill with paint(id, kind). */
export function Patterns({ id, ink, scale = 1 }: { id: string; ink: string; scale?: number }) {
  const u = scale;
  return (
    <Defs>
      <Pattern id={`${id}halftone`} patternUnits="userSpaceOnUse" width={5 * u} height={5 * u}>
        <Circle cx={1.25 * u} cy={1.25 * u} r={1.12 * u} fill={ink} />
        <Circle cx={3.75 * u} cy={3.75 * u} r={1.12 * u} fill={ink} />
      </Pattern>
      <Pattern id={`${id}dots`} patternUnits="userSpaceOnUse" width={6 * u} height={6 * u}>
        <Circle cx={3 * u} cy={3 * u} r={1.5 * u} fill={ink} />
      </Pattern>
      <Pattern id={`${id}lines`} patternUnits="userSpaceOnUse" width={5 * u} height={5 * u} patternTransform="rotate(45)">
        <Rect x={0} y={0} width={1.8 * u} height={5 * u} fill={ink} />
      </Pattern>
      <Pattern id={`${id}cross`} patternUnits="userSpaceOnUse" width={6 * u} height={6 * u} patternTransform="rotate(45)">
        <Rect x={0} y={0} width={1.3 * u} height={6 * u} fill={ink} />
        <Rect x={0} y={0} width={6 * u} height={1.3 * u} fill={ink} />
      </Pattern>
      <Pattern id={`${id}grid`} patternUnits="userSpaceOnUse" width={5 * u} height={5 * u}>
        <Rect x={0} y={0} width={1.1 * u} height={5 * u} fill={ink} />
        <Rect x={0} y={0} width={5 * u} height={1.1 * u} fill={ink} />
      </Pattern>
    </Defs>
  );
}
export const paint = (id: string, kind: PatternKind, ink: string) => (kind === 'solid' ? ink : kind === 'none' ? 'none' : `url(#${id}${kind})`);

/** A subject's swatch: its pattern in a small framed square. */
export function Swatch({ plate, size = 12, ink, paper }: { plate: Plate; size?: number; ink?: string; paper?: string }) {
  const k = useInk();
  const id = useSvgId();
  const c = ink ?? k.ink;
  return (
    <Svg width={size} height={size}>
      <Patterns id={id} ink={c} />
      <Rect x={0.5} y={0.5} width={size - 1} height={size - 1} fill={paper ?? 'none'} />
      <Rect x={0.5} y={0.5} width={size - 1} height={size - 1} fill={paint(id, plate.kind, c)} opacity={plate.shade} />
      <Rect x={0.5} y={0.5} width={size - 1} height={size - 1} fill="none" stroke={c} strokeWidth={1} />
    </Svg>
  );
}

// ---------- marks ----------
/** A dotted rule, like a perforation. */
export function Dotted({ color, style, gap = 3.2 }: { color?: string; style?: StyleProp<ViewStyle>; gap?: number }) {
  const k = useInk();
  return (
    <View style={[{ height: 2, alignSelf: 'stretch' }, style]} pointerEvents="none">
      <Svg width="100%" height={2}>
        <Line x1={1} y1={1} x2="100%" y2={1} stroke={color ?? k.ink} strokeWidth={1.4} strokeDasharray={`0.1 ${gap}`} strokeLinecap="round" opacity={0.75} />
      </Svg>
    </View>
  );
}

/** ○○○●● : how far along, as a row of page dots. */
export function Dots({ n, of, size = 8, color, gap = 3, hollow, a11y }: { n: number; of: number; size?: number; color?: string; gap?: number; hollow?: string; a11y?: string }) {
  const k = useInk();
  const c = color ?? k.ink;
  const filled = Math.max(0, Math.min(of, Math.round(n)));
  return (
    <View style={{ flexDirection: 'row', gap, flexWrap: 'wrap' }} accessible={!!a11y} accessibilityLabel={a11y}>
      {Array.from({ length: of }, (_, i) => (
        <View key={i} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: c, backgroundColor: i < filled ? c : hollow ?? 'transparent' }} />
      ))}
    </View>
  );
}

/** A label chip: white on the ink (READ NOW style), or outlined. On the timer, paper on deep ink. */
export function Chip({ label, onPress, a11y, outline, deep, disabled, big, style }: {
  label: string; onPress?: () => void; a11y?: string; outline?: boolean; deep?: boolean; disabled?: boolean; big?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const k = useInk();
  const fg = deep ? (outline ? k.onDeep : k.deep) : outline ? k.ink : k.paper;
  const bg = deep ? (outline ? 'transparent' : k.onDeep) : outline ? 'transparent' : k.ink;
  const line = deep ? k.onDeep : k.ink;
  const mono = latin(label);
  const size = big ? (mono ? 12.5 : 13) : mono ? 10.5 : 11;
  const body = (
    <View style={[{ height: big ? 30 : 21, paddingHorizontal: big ? 12 : 6, borderRadius: radius.inner, borderWidth: 1, borderColor: line, backgroundColor: bg,
      alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', opacity: disabled ? 0.45 : 1 }, style]}>
      <P f={mono ? 'monoB' : 'sansB'} size={size} lh={Math.round(size * 1.3)} ls={mono ? 1.2 : 0.4} color={fg} numberOfLines={1}>{label}</P>
    </View>
  );
  if (!onPress) return body;
  return (
    <Plated onPress={onPress} disabled={disabled} a11y={a11y ?? label} ghost={deep ? k.onDeep3 : k.tint(0.35)} radius={radius.inner} style={{ alignSelf: 'flex-start' }}>
      {body}
    </Plated>
  );
}

// ---------- reactions ----------
/**
 * Where a press began, so a press that travelled — a swipe that happened to
 * start on it — doesn't count as a tap.
 */
function useStill() {
  const at = useRef({ x: 0, y: 0 });
  return {
    began: (e: GestureResponderEvent) => { at.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }; },
    still: (e: GestureResponderEvent) => Math.hypot(e.nativeEvent.pageX - at.current.x, e.nativeEvent.pageY - at.current.y) < 14,
  };
}

/**
 * Pressable print: while held, the inked layer slips out of register (a ghost
 * plate shows on the other side); let go and it settles back into register,
 * never past it.
 */
export function Plated({ children, onPress, a11y, role = 'button', checked, disabled, ghost, radius: r = 0, style, hitSlop }: {
  children: ReactNode; onPress: () => void; a11y: string; role?: 'button' | 'checkbox' | 'tab' | 'radio' | 'link'; checked?: boolean; disabled?: boolean;
  ghost?: string; radius?: number; style?: StyleProp<ViewStyle>; hitSlop?: number;
}) {
  const k = useInk();
  const v = useSharedValue(0);
  const { began, still } = useStill();
  const inked = useAnimatedStyle(() => ({ transform: [{ translateX: 2.2 * v.value }, { translateY: -1.4 * v.value }] }));
  const plate = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.abs(v.value) * 1.6), transform: [{ translateX: -2.6 * v.value }, { translateY: 2 * v.value }] }));
  return (
    <Pressable
      onPressIn={(e) => { began(e); v.set(press(1)); }}
      onPressOut={() => { v.set(release(0)); }}
      onPress={(e) => { if (!still(e)) return; haptic.tap(); onPress(); }}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole={role}
      accessibilityLabel={a11y}
      accessibilityState={role === 'checkbox' || role === 'radio' ? { checked: !!checked, disabled } : role === 'tab' ? { selected: !!checked } : { disabled }}
      style={style}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: r, backgroundColor: ghost ?? k.tint(0.3) }, plate]} />
      <Animated.View style={inked}>{children}</Animated.View>
    </Pressable>
  );
}

/** A rubber stamp: held, it presses down and turns a little; let go, it comes straight back up (no bounce) and leaves a fading impression. */
export function Thump({ children, onPress, a11y, size, tilt = -8 }: { children: ReactNode; onPress?: () => void; a11y: string; size: number; tilt?: number }) {
  const k = useInk();
  const s = useSharedValue(1);
  const r = useSharedValue(tilt);
  const ring = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }, { rotate: `${r.value}deg` }] }));
  const imp = useAnimatedStyle(() => ({ opacity: (1 - ring.value) * 0.5, transform: [{ scale: 1 + ring.value * 0.35 }, { rotate: `${tilt}deg` }] }));
  const thump = () => {
    haptic.firm();
    ring.set(0);
    ring.set(dismiss(1));
  };
  return (
    <Pressable onPress={() => { thump(); onPress?.(); }} accessibilityRole="button" accessibilityLabel={a11y} style={{ width: size, height: size }}
      onPressIn={() => { s.set(press(0.94)); r.set(press(tilt + 3)); }}
      onPressOut={() => { s.set(release(1)); r.set(release(tilt)); }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: 2, borderColor: k.ink }, imp]} />
      <Animated.View style={[{ width: size, height: size }, a]}>{children}</Animated.View>
    </Pressable>
  );
}

// ---------- pieces ----------
/** Crop marks at a cover's four corners, just outside it. */
export function CropMarks({ color, len = 6, off = 4 }: { color: string; len?: number; off?: number }) {
  const l = { position: 'absolute' as const, backgroundColor: color };
  const corner = (v: 'top' | 'bottom', h: 'left' | 'right') => (
    <View key={v + h} pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[l, { [v]: -off - len, [h]: 0, width: 1, height: len }]} />
      <View style={[l, { [v]: 0, [h]: -off - len, width: len, height: 1 }]} />
    </View>
  );
  return <>{corner('top', 'left')}{corner('top', 'right')}{corner('bottom', 'left')}{corner('bottom', 'right')}</>;
}

/**
 * A cover: a framed sheet with crop marks, its art printed inside. Press it
 * and the art slips out of register inside the frame.
 */
export function Cover({ w, h, children, onPress, a11y, live }: { w: number; h: number; children: ReactNode; onPress?: () => void; a11y?: string; live?: boolean }) {
  const k = useInk();
  const v = useSharedValue(0);
  const { began, still } = useStill();
  const art = useAnimatedStyle(() => ({ transform: [{ translateX: 2.6 * v.value }, { translateY: -1.8 * v.value }] }));
  const ghost = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.abs(v.value) * 1.5) * 0.55, transform: [{ translateX: -3 * v.value }, { translateY: 2.4 * v.value }] }));
  const body = (
    <View style={{ width: w, height: h }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: k.tint(0.32) }, ghost]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: k.sheet, borderWidth: 1, borderColor: k.ink, overflow: 'hidden' }]}>
        <Animated.View style={[StyleSheet.absoluteFill, art]}>{children}</Animated.View>
        {live ? <Roller h={h} /> : null}
      </View>
      <CropMarks color={k.ink} />
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPressIn={(e) => { began(e); v.set(press(1)); }}
      onPressOut={() => { v.set(release(0)); }}
      onPress={(e) => { if (!still(e)) return; haptic.tap(); onPress(); }}
      accessibilityRole="button" accessibilityLabel={a11y}>
      {body}
    </Pressable>
  );
}

/** While printing: a band of fresh ink across the sheet, where the roller is (it stays put: nothing loops). */
function Roller({ h }: { h: number }) {
  const k = useInk();
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 10, transform: [{ translateY: h * 0.62 }] }}>
      <View style={{ height: 2, backgroundColor: k.paper, opacity: 0.9 }} />
      <View style={{ height: 6, backgroundColor: k.ink, opacity: 0.18 }} />
    </View>
  );
}

/**
 * A stamp in the one ink: a double ring (or a box) with a word in it, worn at
 * the edges, sitting on a little paper so it reads on anything.
 */
export function StampMark({ word, sub, size, box, tilt = -10, color, paper }: { word: string; sub?: string; size: number; box?: boolean; tilt?: number; color?: string; paper?: string }) {
  const k = useInk();
  const c = color ?? k.ink;
  const pp = paper ?? k.paper;
  const fs = Math.round(size * (word.length > 2 ? (box ? 0.22 : 0.24) : word.length === 2 ? 0.3 : 0.44));
  const w = box ? size * 1.5 : size;
  return (
    <View style={{ width: w, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: `${tilt}deg` }] }} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { borderRadius: box ? 4 : size / 2, backgroundColor: pp, opacity: 0.92 }]} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: box ? 4 : size / 2, borderWidth: Math.max(2, size * 0.035), borderColor: c }]} />
      <View style={[StyleSheet.absoluteFill, { margin: Math.max(4, size * 0.06), borderRadius: box ? 2 : size / 2, borderWidth: 1, borderColor: c }]} />
      <P f="title" size={fs} lh={Math.round(fs * 1.15)} color={c} style={{ textAlign: 'center' }}>{word}</P>
      {sub ? <P f={latin(sub) ? 'monoB' : 'sansB'} size={Math.max(9, Math.round(size * 0.1))} ls={latin(sub) ? 1.4 : 0} color={c} style={{ marginTop: 2 }}>{sub}</P> : null}
    </View>
  );
}

/** Starts a moment's show and says when it's over (once). */
export function useOver(done: () => void, ms: number) {
  const fired = useRef(false);
  useEffect(() => {
    const id = setTimeout(() => { if (!fired.current) { fired.current = true; done(); } }, ms);
    return () => clearTimeout(id);
    // the show runs once, from when it mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
