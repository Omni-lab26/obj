import { memo, ReactNode, useEffect, useRef, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

import { T } from '@/themes/kit';
import { haptic, Press } from '@/ui/base';
import { L, useLook } from './look';

// What 8bit is built from: windows with a double edge and nicked corners, the
// ▶ cursor that marks the command, text that types itself out, gauges in
// segments, and small sprites drawn from rows of letters. What moves, moves in
// steps; nothing hops, bobs or blinks on and on (MOTION.md) — the game is in
// the look.

export const STEP = Easing.steps(1);

// ---------- pixel art ----------
/** Draws rows like '.XX.XX.' — one letter a pixel, '.' empty — in the colors given. Runs of a color are one rect. */
export const PixelArt = memo(function PixelArt({ rows, px, colors }: { rows: string[]; px: number; colors: Record<string, string> }) {
  const w = rows[0]?.length ?? 0;
  const h = rows.length;
  const rects: ReactNode[] = [];
  rows.forEach((r, y) => {
    let x = 0;
    while (x < w) {
      const fill = colors[r[x]];
      if (!fill) { x++; continue; }
      let e = x;
      while (e + 1 < w && r[e + 1] === r[x]) e++;
      rects.push(<Rect key={`${x}.${y}`} x={x} y={y} width={e - x + 1} height={1} fill={fill} />);
      x = e + 1;
    }
  });
  return <Svg width={w * px} height={h * px} viewBox={`0 0 ${w} ${h}`}>{rects}</Svg>;
});

export const SPRITES = {
  cursor: ['X...', 'XX..', 'XXX.', 'XXXX', 'XXX.', 'XX..', 'X...'],
  down: ['XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  heart: ['.XX.XX.', 'XWXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'],
  heartEmpty: ['.XX.XX.', 'X..X..X', 'X.....X', '.X...X.', '..X.X..', '...X...'],
  star: ['...X...', '...X...', 'XXXWXXX', '.XXXXX.', '..XXX..', '.XX.XX.', 'XX...XX'],
  starEmpty: ['...X...', '..X.X..', 'XX...XX', '.X...X.', '..X.X..', '.X.X.X.', 'XX...XX'],
  ticket: ['XXXXXXXXX', 'X.X.....X', 'XXX.XXX.X', 'X.X.....X', 'XXXXXXXXX'],
  flag: ['XFFFF.', 'XFFFFF', 'XFFFF.', 'X.....', 'X.....', 'X.....', 'X.....', 'XX....'],
  sword: ['......XX', '.....XWX', '....XWX.', 'X..XWX..', '.XXWX...', '..XX....', '.X.X....', 'X.......'],
  spark: ['...X...', '...X...', '.......', 'XX...XX', '.......', '...X...', '...X...'],
  face: ['.XXXX.', 'XSSSSX', 'XSESEX', 'XSSSSX', '.XSSX.', 'XBBBBX'],
};

// ---------- marks ----------
/** The ▶ cursor, still at the command it points to. */
export function Cursor({ color, px = 1.5 }: { color: string; px?: number }) {
  return <PixelArt rows={SPRITES.cursor} px={px} colors={{ X: color }} />;
}

/** The ▼ at the end of a message that has more to say. */
export function More({ color }: { color: string }) {
  return <PixelArt rows={SPRITES.down} px={1.5} colors={{ X: color }} />;
}

// ---------- typing ----------
/** Text that types itself out, a character at a time; a new text starts over. finish() shows it all. */
export function useTyper(text: string, speed = 32) {
  const [st, setSt] = useState({ text, n: 0 });
  const n = st.text === text ? st.n : 0;
  const done = n >= text.length;
  useEffect(() => {
    if (done) return;
    const id = setTimeout(() => setSt((s) => ({ text, n: (s.text === text ? s.n : 0) + 1 })), speed);
    return () => clearTimeout(id);
  }, [text, n, done, speed]);
  return { n, done, finish: () => setSt({ text, n: text.length }) };
}
/** Typed text: the part not yet typed is there but clear, so nothing moves as it types. */
export function Typed({ text, n, size = 15, lh, color }: { text: string; n: number; size?: number; lh?: number; color: string }) {
  return (
    <T size={size} lh={lh ?? Math.round(size * 1.6)} color={color}>
      {text.slice(0, n)}
      <T size={size} lh={lh ?? Math.round(size * 1.6)} color="transparent">{text.slice(n)}</T>
    </T>
  );
}

// ---------- windows ----------
type WinProps = {
  children?: ReactNode; title?: string; style?: StyleProp<ViewStyle>; pad?: number;
  /** tap the window: its edge blinks, then this runs */ onPress?: () => void; label?: string;
  /** keep the window lit (picked) */ lit?: boolean;
  /** draw on this look (for the timer, where the page is the window's own color) */ look?: L;
};
/** A window: a double edge with nicked corners, a title sitting on the top edge. Tapped, the edge blinks. */
export function Win({ children, title, style, pad = 12, onPress, label, lit, look }: WinProps) {
  const own = useLook();
  const L = look ?? own;
  const f = useSharedValue(0);
  const glow = useAnimatedStyle(() => ({ opacity: f.value }));
  const blink = () => f.set(withSequence(withTiming(1, { duration: 70, easing: STEP }), withTiming(0, { duration: 70, easing: STEP }), withTiming(1, { duration: 70, easing: STEP }), withTiming(0, { duration: 110, easing: STEP })));
  const nick = { position: 'absolute' as const, width: 3, height: 3, backgroundColor: L.page };
  const body = (
    <View style={[{ backgroundColor: L.win, borderWidth: 2, borderColor: lit ? L.cursor : L.edge, padding: 3, boxShadow: `0px 4px 0px ${L.drop}` }, style]}>
      <View style={{ flexGrow: 1, borderWidth: 1.5, borderColor: lit ? L.cursor : L.edge, paddingHorizontal: pad, paddingTop: title ? pad + 5 : pad, paddingBottom: pad }}>
        {children}
      </View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { margin: -2, borderWidth: 2, borderColor: L.cursor }, glow]} />
      {title ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: -12, left: 10, paddingHorizontal: 6, backgroundColor: L.win }}>
          <T size={13} lh={19} color={lit ? L.cursor : L.text} numberOfLines={1}>{title}</T>
        </View>
      ) : null}
      {/* the corners, nicked a pixel in */}
      <View pointerEvents="none" style={[nick, { top: -2, left: -2 }]} />
      <View pointerEvents="none" style={[nick, { top: -2, right: -2 }]} />
      <View pointerEvents="none" style={[nick, { bottom: -2, left: -2 }]} />
      <View pointerEvents="none" style={[nick, { bottom: -2, right: -2 }]} />
    </View>
  );
  if (!onPress) return body;
  return (
    <Press onPress={() => { blink(); onPress(); }} scale={0.99} accessibilityRole="button" accessibilityLabel={label}>
      {body}
    </Press>
  );
}

// ---------- commands ----------
export type Cmd = { key: string; label: string; run: () => void; a11y?: string; disabled?: boolean; color?: string };
/**
 * A command menu. The cursor sits on `at` (the likely pick); tap a command and
 * the cursor moves to it first, then it runs.
 */
export function Menu({ items, at = 0, look, size = 15, cols, gap = 10 }: { items: Cmd[]; at?: number; look?: L; size?: number; cols?: number; gap?: number }) {
  const own = useLook();
  const L = look ?? own;
  const [picked, setPicked] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const on = picked ?? items[Math.min(at, items.length - 1)]?.key;
  const pick = (c: Cmd) => {
    if (c.disabled) return;
    haptic.tap();
    setPicked(c.key);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { c.run(); setPicked(null); }, 140);
  };
  return (
    <View style={{ flexDirection: cols ? 'row' : 'column', flexWrap: cols ? 'wrap' : undefined, rowGap: 6, columnGap: gap }}>
      {items.map((c) => {
        const here = c.key === on;
        return (
          <Press key={c.key} onPress={() => pick(c)} haptics={false} disabled={c.disabled} scale={0.97} accessibilityRole="button" accessibilityLabel={c.a11y ?? c.label}
            hitSlop={{ top: 4, bottom: 4 }}
            style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 30 }, cols ? { width: `${100 / cols - 4}%` } : null]}>
            <View style={{ width: 9, alignItems: 'center', opacity: here ? 1 : 0 }}><Cursor color={L.cursor} /></View>
            <T size={size} lh={Math.round(size * 1.45)} color={c.color ?? (here ? L.text : L.dim)} numberOfLines={1} style={{ flexShrink: 1 }}>{c.label}</T>
          </Press>
        );
      })}
    </View>
  );
}

// ---------- gauges ----------
/** A gauge in segments: each cell a color (filled) or null (empty). */
export function Segs({ cells, h = 10, gap = 2, look }: { cells: (string | null)[]; h?: number; gap?: number; look?: L }) {
  const own = useLook();
  const L = look ?? own;
  return (
    <View style={{ flexDirection: 'row', gap, padding: 2, borderWidth: 1.5, borderColor: L.edge }}>
      {cells.map((c, i) => <View key={i} style={{ flex: 1, height: h, backgroundColor: c ?? L.faint }} />)}
    </View>
  );
}
/** `value` of `max` as `n` cells of `color`; past the max, the rest in `over`. */
export const fill = (value: number, max: number, n: number, color: string): (string | null)[] => {
  const k = max > 0 ? Math.min(n, Math.floor((value / max) * n + 1e-9)) : 0;
  return Array.from({ length: n }, (_, i) => (i < k ? color : null));
};

// ---------- small things ----------
/** A Latin label in the pixel capitals (Silkscreen); figures too. */
export function Cap({ children, size = 10, color, ls = 1 }: { children: string; size?: number; color: string; ls?: number }) {
  return <T f="label" size={size} lh={Math.round(size * 1.4)} ls={ls} color={color} numberOfLines={1}>{children}</T>;
}
/** A big figure in the pixel capitals. */
export function Fig({ children, size, color }: { children: string; size: number; color: string }) {
  return <T f="label" size={size} lh={Math.round(size * 1.15)} color={color} num numberOfLines={1}>{children}</T>;
}
