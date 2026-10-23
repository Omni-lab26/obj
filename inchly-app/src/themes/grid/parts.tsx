import { ReactNode, useEffect, useId, useState, useSyncExternalStore } from 'react';
import { StyleProp, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Line, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg';

import { T } from '@/themes/kit';
import { font, useT } from '@/theme';
import { haptic, Press } from '@/ui/base';

// 方眼: the pieces the grid app is built from. Lavender paper, a 1px frame
// round the whole screen, everything in windows with a filename on top,
// figures in a monospaced face, and one pink-to-blue gradient kept for the
// moments that matter.

export const PINK = '#FF5BD8';
export const BLUE = '#3D7BFF';
/** window frames and the screen's frame */
export const FRAME = '#565656';
/** the timer: lavender on near-black */
export const NIGHT = { ink: '#F3F3FF', ink2: 'rgba(243,243,255,0.66)', ink3: 'rgba(243,243,255,0.4)', frame: 'rgba(243,243,255,0.4)', line: 'rgba(243,243,255,0.12)' };

export const pad2 = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, '0');
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
/** '2026.10.23 FRI' */
export const stamp = (d: Date) => `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())} ${DOW[d.getDay()]}`;

/** Japanese (and mixed) text in the system face: the monospaced faces have no Japanese. */
export function J({ size = 13, w = '400', color, lh, style, ...rest }: TextProps & { size?: number; w?: TextStyle['fontWeight']; color?: string; lh?: number }) {
  const t = useT();
  return <Text {...rest} style={[{ fontFamily: size >= 20 ? font.display : font.text, fontSize: size, fontWeight: w, color: color ?? t.ink, lineHeight: lh ?? Math.round(size * 1.45) }, style]} />;
}

/** Figures and Latin labels in the monospaced face (regular, or semibold with `b`). */
export function M({ b, ...p }: Parameters<typeof T>[0] & { b?: boolean }) {
  return <T f={b ? 'plexBold' : 'plex'} {...p} />;
}

// ---------- folding windows ----------
// A window folds to its title bar when you tap the title, for as long as the app is open.
let folded = new Set<string>();
let foldVer = 0;
const foldSubs = new Set<() => void>();
const onFold = (f: () => void) => { foldSubs.add(f); return () => { foldSubs.delete(f); }; };
function useFolded(id: string): [boolean, () => void] {
  useSyncExternalStore(onFold, () => foldVer, () => foldVer);
  const toggle = () => {
    folded = new Set(folded);
    if (folded.has(id)) folded.delete(id);
    else folded.add(id);
    foldVer += 1;
    foldSubs.forEach((f) => f());
  };
  return [folded.has(id), toggle];
}

/**
 * A window: a filename bar on top, the content below, a 1px frame. Tap the bar
 * and the window folds to it (the bar turns black); tap again to open it.
 */
export function Window({ id, title, meta, children, style, dark, fixed, row }: {
  id: string; title: string; children?: ReactNode; style?: StyleProp<ViewStyle>; dark?: boolean;
  /** what the bar says on the right, in the color it is given */ meta?: string | ((color: string) => ReactNode);
  /** a window that never folds (the timer's) */ fixed?: boolean;
  /** one of a row: folded, it shrinks to its bar instead of keeping its neighbour's height */ row?: boolean;
}) {
  const t = useT();
  const [folded, fold] = useFolded(id);
  const shut = folded && !fixed;
  // a narrow window keeps its name whole and drops the note on the right
  const [w, setW] = useState(0);
  const roomy = w >= 168;
  const ink = dark ? NIGHT.ink : t.ink;
  const paper = dark ? 'rgba(16,16,22,0.72)' : t.surface;
  const bar = shut ? ink : dark ? 'rgba(243,243,255,0.06)' : t.canvas;
  const onBar = shut ? (dark ? '#101016' : t.canvas) : ink;
  const edge = dark ? NIGHT.frame : FRAME;
  const barStyle: ViewStyle = { height: 26, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 8, paddingRight: 7, backgroundColor: bar, borderBottomWidth: shut ? 0 : 1, borderBottomColor: edge };
  const inside = (
    <>
      <View style={{ width: 6, height: 6, backgroundColor: onBar }} />
      <M size={11} lh={14} color={onBar} numberOfLines={1} style={{ flexShrink: 1 }}>{title}</M>
      <View style={{ flex: 1 }} />
      {!roomy ? null : typeof meta === 'function' ? meta(shut ? onBar : dark ? NIGHT.ink3 : t.ink3)
        : meta ? <M size={10.5} lh={14} color={shut ? onBar : dark ? NIGHT.ink3 : t.ink3} numberOfLines={1} style={{ flexShrink: 1 }}>{meta}</M> : null}
      {fixed ? null : <M size={11} lh={14} color={onBar}>{shut ? '[+]' : '[–]'}</M>}
    </>
  );
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[{ backgroundColor: paper, borderWidth: 1, borderColor: edge, borderRadius: 4, overflow: 'hidden' }, style, shut && row ? { alignSelf: 'flex-start' } : null]}>
      {fixed ? <View style={barStyle}>{inside}</View> : (
        <Press onPress={() => { haptic.tap(); fold(); }} haptics={false} react="step" scale={1} hitSlop={{ top: 4 }}
          accessibilityRole="button" accessibilityState={{ expanded: !shut }} accessibilityLabel={`${title}を${shut ? 'ひらく' : 'たたむ'}`} style={barStyle}>
          {inside}
        </Press>
      )}
      {shut ? null : children}
    </View>
  );
}

/** A small square that blinks while something is live (paused: steady and grey). */
export function Blink({ on = true, color = PINK, size = 6 }: { on?: boolean; color?: string; size?: number }) {
  const o = useSharedValue(1);
  useEffect(() => {
    if (on) o.set(withRepeat(withSequence(withTiming(0.15, { duration: 520 }), withTiming(1, { duration: 520 })), -1));
    else { cancelAnimation(o); o.set(1); }
  }, [on, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: size, height: size, backgroundColor: on ? color : FRAME }, a]} />;
}

/** Diagonal hatching (for time still running, rest days), as an SVG pattern to fill with. */
export function HatchDef({ id, color }: { id: string; color: string }) {
  return (
    <Defs>
      <Pattern id={id} patternUnits="userSpaceOnUse" width={4} height={4} patternTransform="rotate(45)">
        <Rect x={0} y={0} width={4} height={4} fill="transparent" />
        <Line x1={0} y1={0} x2={0} y2={4} stroke={color} strokeWidth={1.6} />
      </Pattern>
    </Defs>
  );
}

/** An id that SVG accepts (no colons), unique on the page. */
export function useSvgId(name: string) {
  return `${name}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
}

/** A dashed rule across. */
export function Dash({ color = FRAME, inset = 0 }: { color?: string; inset?: number }) {
  return (
    <View style={{ height: 1, marginHorizontal: inset, overflow: 'hidden' }} pointerEvents="none">
      <Svg width="100%" height={1}>
        <Line x1={0} y1={0.5} x2="100%" y2={0.5} stroke={color} strokeWidth={1} strokeDasharray="3 3" />
      </Svg>
    </View>
  );
}

/** The 1px frame round the whole screen, with crop marks at its corners. */
export function ScreenFrame({ top, bottom = 6, color = FRAME }: { top: number; bottom?: number; color?: string }) {
  const mark = (s: ViewStyle) => (
    <View style={[{ position: 'absolute', width: 9, height: 9 }, s]}>
      <View style={{ position: 'absolute', left: 4, top: 0, bottom: 0, width: 1, backgroundColor: color }} />
      <View style={{ position: 'absolute', top: 4, left: 0, right: 0, height: 1, backgroundColor: color }} />
    </View>
  );
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top, left: 6, right: 6, bottom, borderWidth: 1, borderColor: color, borderRadius: 2 }}>
      {mark({ left: -5, top: -5 })}
      {mark({ right: -5, top: -5 })}
      {mark({ left: -5, bottom: -5 })}
      {mark({ right: -5, bottom: -5 })}
    </View>
  );
}

/** A fill from pink to blue (drawn behind something, the size of its parent). */
export function Gradient({ radius = 0, id }: { radius?: number; id: string }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: radius, overflow: 'hidden' }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={PINK} />
            <Stop offset="1" stopColor={BLUE} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/**
 * A grid that bends a little, like a surface seen from above: the vertical
 * lines lean in toward the bottom and the rows open up as they come closer.
 */
export function WarpGrid({ w, h, color, cols = 12, rows = 6 }: { w: number; h: number; color: string; cols?: number; rows?: number }) {
  if (w <= 0 || h <= 0) return null;
  const d: string[] = [];
  for (let i = 0; i <= rows; i++) {
    const y = h * (1 - Math.pow(1 - i / rows, 1.35));
    const bow = Math.sin((i / rows) * Math.PI) * 2.5;
    d.push(`M0 ${y.toFixed(1)} Q ${(w / 2).toFixed(1)} ${(y + bow).toFixed(1)} ${w} ${y.toFixed(1)}`);
  }
  for (let i = 0; i <= cols; i++) {
    const x = (w * i) / cols;
    const lean = (x - w / 2) * 0.06;
    d.push(`M${x.toFixed(1)} 0 Q ${(x + lean * 0.4).toFixed(1)} ${(h / 2).toFixed(1)} ${(x - lean).toFixed(1)} ${h}`);
  }
  return (
    <Svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      <Path d={d.join(' ')} stroke={color} strokeWidth={0.75} fill="none" />
    </Svg>
  );
}

/** Bars like a barcode, from a string: the same string always gives the same code. */
export function Barcode({ code, h = 26, color }: { code: string; h?: number; color: string }) {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (let i = 0; i < code.length; i++) {
    const c = code.charCodeAt(i);
    for (const k of [c % 3, (c >> 2) % 3, (c >> 4) % 2]) {
      const w = 1 + k;
      bars.push({ x, w });
      x += w + 1 + ((c + k) % 2);
    }
  }
  return (
    <Svg width={x} height={h}>
      {bars.map((b, i) => <Rect key={i} x={b.x} y={0} width={b.w} height={h} fill={color} />)}
    </Svg>
  );
}

const DIGITS = '0123456789';
/**
 * Figures that tumble before they settle, like a counter being worked out:
 * on first show, and again whenever `run` changes.
 */
export function useScramble(text: string, run: number, ms = 440) {
  const frames = Math.round(ms / 40);
  const [left, setLeft] = useState(frames);
  useEffect(() => {
    let n = frames;
    const id = setInterval(() => {
      n -= 1;
      setLeft(Math.max(0, n));
      if (n <= 0) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [run, frames]);
  if (left <= 0) return text;
  let i = 0;
  return text.replace(/[0-9]/g, () => DIGITS[(left * 7 + (i++) * 3 + text.length) % 10]);
}
