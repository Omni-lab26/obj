import { ReactNode, useCallback, useEffect, useState } from 'react';
import { StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Polygon, Rect } from 'react-native-svg';

import { faceFor, radius } from '@/theme';
import { T } from '@/themes/kit';
import { Press } from '@/ui/base';
import { Look, say, useLook } from './look';
import { ALL, cell, colon, layout, point, SEGMENTS } from './seg';

// デジタル: the pieces of a pocket device. Displays set in the case, 7-segment
// figures with the ghost of every unlit segment, a dot-matrix log, keys that
// click down, printed labels, and a ticker running along a band.

// ---------- text ----------
/** Japanese (and mixed) text in the system face: the device faces have no Japanese. */
export function J({ size = 13, w = '600', color, lh, style, ...rest }: TextProps & { size?: number; w?: TextStyle['fontWeight']; color?: string; lh?: number }) {
  const L = useLook();
  return <Text {...rest} style={[{ fontFamily: faceFor('system', size), fontSize: size, fontWeight: w, color: color ?? L.t.ink, lineHeight: lh ?? Math.round(size * 1.42) }, style]} />;
}
/** Figures and Latin words in the monospaced face. */
export function M({ b, ...p }: Parameters<typeof T>[0] & { b?: boolean }) {
  return <T f={b ? 'plexBold' : 'plex'} num {...p} />;
}
/** A printed label: tiny capitals on an LCD, a prompt on a terminal. */
export function Ann({ children, color, size = 9.5, on, plain, look }: { children: string; color?: string; size?: number; on?: boolean; plain?: boolean; look?: Look }) {
  const own = useLook();
  const L = look ?? own;
  const c = color ?? L.t.ink3;
  // a title gets the finish's prefix ('> log'); a unit or a status beside a figure doesn't ('min')
  const text = plain ? (L.lower ? children.toLowerCase() : children.toUpperCase()) : say(L, children);
  const s = L.labelFace === 'plex' ? size + 1.5 : size;
  if (on) {
    return (
      <View style={{ backgroundColor: c, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 1.5 }}>
        <T f={L.labelFace} size={s} lh={Math.round(s * 1.35)} color={L.t.canvas} ls={1} numberOfLines={1}>{text}</T>
      </View>
    );
  }
  return <T f={L.labelFace} size={s} lh={Math.round(s * 1.35)} color={c} ls={1} numberOfLines={1}>{text}</T>;
}

// ---------- 7-segment figures ----------
/**
 * A line of 7-segment figures, `h` tall, with the faint ghost of every unlit
 * segment (a blank shows as a ghost 8, like a real display). Glowing finishes
 * bleed a little light around what's lit. `colonOn` false shows the colon unlit.
 */
export function Seg({ text, h, color, ghost, glow, colonOn = true, style }: {
  text: string; h: number; color: string; ghost: string; glow?: boolean; colonOn?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { width, items } = layout(text, h);
  const pad = glow ? Math.ceil(h * 0.06) : 1;
  const lit: string[] = [];
  const dim: string[] = [];
  for (const it of items) {
    if (it.kind === 'digit') {
      const segs = cell(it.x, h);
      const on = SEGMENTS[it.ch] ?? '';
      for (const s of ALL) (on.includes(s) ? lit : dim).push(segs[s]);
    } else if (it.kind === 'colon') {
      (colonOn ? lit : dim).push(...colon(it.x, h));
    } else {
      lit.push(point(it.x, h));
    }
  }
  return (
    <View style={style} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width + pad * 2} height={h + pad * 2}>
        <G transform={`translate(${pad} ${pad})`}>
          {dim.map((p, i) => <Polygon key={`g${i}`} points={p} fill={ghost} />)}
          {glow ? lit.map((p, i) => <Polygon key={`h${i}`} points={p} fill={color} opacity={0.2} stroke={color} strokeWidth={h * 0.06} strokeLinejoin="round" />) : null}
          {lit.map((p, i) => <Polygon key={`l${i}`} points={p} fill={color} />)}
        </G>
      </Svg>
    </View>
  );
}

/** Segments that blink when tapped: [style, kick]. */
export function useFlicker(): [ReturnType<typeof useAnimatedStyle>, () => void] {
  const o = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  const kick = useCallback(() => {
    o.set(withSequence(withTiming(0.12, { duration: 40 }), withTiming(1, { duration: 50 }), withTiming(0.3, { duration: 45 }), withTiming(1, { duration: 55 }),
      withTiming(0.55, { duration: 40 }), withTiming(1, { duration: 70 })));
  }, [o]);
  return [style, kick];
}

/** Something that blinks while `on` (REC, PAUSE, an alarm). */
export function Blink({ on = true, children, period = 1000, style }: { on?: boolean; children: ReactNode; period?: number; style?: StyleProp<ViewStyle> }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.set(on ? withRepeat(withSequence(withTiming(1, { duration: period / 2 }), withTiming(0.12, { duration: 1 }), withTiming(0.12, { duration: period / 2 - 1 }), withTiming(1, { duration: 1 })), -1) : withTiming(1, { duration: 80 }));
  }, [on, o, period]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[a, style]}>{children}</Animated.View>;
}

// ---------- displays ----------
/** A display set into the case: a recessed panel with a printed frame. */
export function Panel({ children, pad = 14, style }: { children?: ReactNode; pad?: number; style?: StyleProp<ViewStyle> }) {
  const L = useLook();
  return <View style={[{ backgroundColor: L.t.surface, borderRadius: radius.card, padding: pad, boxShadow: L.inset }, style]}>{children}</View>;
}

/** A row of segments toward something: each cell a color, or unlit. */
export function Cells({ cells, h = 10, gap = 3, off, style }: { cells: (string | null)[]; h?: number; gap?: number; off: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', gap }, style]}>
      {cells.map((c, i) => <View key={i} style={{ flex: 1, height: h, borderRadius: 1, backgroundColor: c ?? off }} />)}
    </View>
  );
}

export type Column = { lit: string[]; live: number; future?: boolean; picked?: boolean };
/**
 * A dot-matrix log: one data column per entry (`span` dots wide, `gap` dots
 * apart), lit from the bottom. Dots of the session under way blink.
 */
export function Matrix({ data, rows, pitch, span = 1, gap = 0, off, live, goalRow, goalColor }: {
  data: Column[]; rows: number; pitch: number; span?: number; gap?: number; off: string; live: string; goalRow?: number; goalColor?: string;
}) {
  const r = pitch * 0.36;
  const cols = data.length * (span + gap) - gap;
  const W = cols * pitch;
  const H = rows * pitch;
  const still: ReactNode[] = [];
  const blinking: ReactNode[] = [];
  data.forEach((d, i) => {
    for (let s = 0; s < span; s++) {
      const cx = ((i * (span + gap)) + s) * pitch + pitch / 2;
      for (let k = 0; k < rows; k++) {
        const cy = H - k * pitch - pitch / 2;
        const key = `${i}-${s}-${k}`;
        if (k < d.lit.length) still.push(<Circle key={key} cx={cx} cy={cy} r={r} fill={d.lit[k]} opacity={d.picked === false ? 0.4 : 1} />);
        else if (k < d.lit.length + d.live) blinking.push(<Circle key={key} cx={cx} cy={cy} r={r} fill={live} />);
        else still.push(<Circle key={key} cx={cx} cy={cy} r={r * 0.9} fill={off} opacity={d.future ? 0.5 : 1} />);
      }
    }
  });
  return (
    <View style={{ width: W, height: H }}>
      <Svg width={W} height={H}>
        {still}
        {goalRow !== undefined && goalRow > 0 && goalRow <= rows ? (
          <Rect x={0} y={H - goalRow * pitch - 0.75} width={W} height={1.5} fill={goalColor ?? live} opacity={0.75} />
        ) : null}
      </Svg>
      {blinking.length ? (
        <Blink period={1200} style={StyleSheet.absoluteFill}>
          <Svg width={W} height={H}>{blinking}</Svg>
        </Blink>
      ) : null}
    </View>
  );
}

/** A battery: how far today is toward its goal, in four bars. */
export function Battery({ p, color }: { p: number; color: string }) {
  const n = Math.max(0, Math.min(4, Math.round(p * 4)));
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={26} height={13}>
        <Rect x={0.75} y={0.75} width={21.5} height={11.5} rx={1.5} fill="none" stroke={color} strokeWidth={1.5} />
        <Rect x={23} y={4} width={2.5} height={5} rx={0.5} fill={color} />
        {Array.from({ length: 4 }, (_, i) => <Rect key={i} x={3 + i * 4.8} y={3} width={3.6} height={7} fill={color} opacity={i < n ? 1 : 0.15} />)}
      </Svg>
    </View>
  );
}

// ---------- keys ----------
type KeyProps = {
  onPress?: () => void; label: string; children?: ReactNode; tone?: 'plain' | 'accent';
  h?: number; depth?: number; latched?: boolean; disabled?: boolean; haptics?: boolean;
  role?: 'button' | 'tab' | 'checkbox' | 'radio'; selected?: boolean; checked?: boolean;
  style?: StyleProp<ViewStyle>; face?: StyleProp<ViewStyle>; hitSlop?: number;
};
/**
 * A hardware key: a face over a dark base it clicks down onto. A latched key
 * (the tab you're on, the mode that's set) stays down.
 */
export function Key({ onPress, label, children, tone = 'plain', h = 40, depth = 3, latched, disabled, haptics = true, role = 'button', selected, checked, style, face, hitSlop = 6 }: KeyProps) {
  const L = useLook();
  const k = tone === 'accent' ? L.keyAccent : L.key;
  const r = Math.min(8, radius.inner + 2);
  return (
    <View style={[{ paddingTop: latched ? depth : 0, paddingBottom: latched ? 0 : depth }, style]}>
      {latched ? null : <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: depth, bottom: 0, borderRadius: r, backgroundColor: k.base }} />}
      <Press onPress={onPress} disabled={disabled} haptics={haptics} react="sink" scale={0.96} hitSlop={hitSlop}
        accessibilityRole={role} accessibilityLabel={label} accessibilityState={{ disabled, selected, checked }}
        style={[{ height: h, borderRadius: r, backgroundColor: latched ? k.faceOn : k.face, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10 },
          latched ? { boxShadow: `inset 0px 2px 3px rgba(0,0,0,0.45), inset 0px 0px 0px 1px ${L.t.line2}` } : { borderTopWidth: 1, borderTopColor: k.edge }, face]}>
        {children}
      </Press>
    </View>
  );
}

// ---------- the ticker ----------
/** A band with a line of text running along it, round and round. */
export function Marquee({ text, bg, ink, speed = 34, label }: { text: string; bg: string; ink: string; speed?: number; label: string }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (!w) return;
    x.set(0);
    x.set(withRepeat(withTiming(-w, { duration: (w / speed) * 1000, easing: Easing.linear }), -1));
  }, [w, x, speed]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View accessible accessibilityLabel={label} style={{ height: 30, overflow: 'hidden', backgroundColor: bg, borderRadius: Math.min(4, radius.inner), justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 12000, flexDirection: 'row', alignItems: 'center' }, a]}>
        <T f="pixel" size={14} lh={20} color={ink} numberOfLines={1} onLayout={(e) => { const lw = e.nativeEvent.layout.width; if (Math.abs(lw - w) > 1) setW(lw); }}>{text}</T>
        <T f="pixel" size={14} lh={20} color={ink} numberOfLines={1}>{text}</T>
      </Animated.View>
    </View>
  );
}
