import { ComponentProps, ReactNode, useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';

import { faceFor } from '@/theme';
import { T } from '@/themes/kit';
import { Icon } from '@/ui/Icon';

// ネオン: a night-city HUD. Black glass, signal yellow, cyan lines, red for
// what's live or late. Panels have two corners cut off; labels read like a
// readout ("// TODAY_LOG"). Latin and figures are set in a condensed face,
// Japanese in the system face.

export const N = {
  bg: '#0A0A0A',
  panel: '#111111',
  panel2: '#171717',
  yellow: '#FCEE0A',
  yellowDim: 'rgba(252,238,10,0.14)',
  cyan: '#00F0FF',
  cyanLine: 'rgba(0,240,255,0.32)',
  cyanFaint: 'rgba(0,240,255,0.1)',
  red: '#FF003C',
  ink: '#F2F2F2',
  ink2: '#BDBDBD',
  ink3: '#7E7E7E',
};

/** A soft glow around text. */
export const glow = (c: string, r = 10): TextStyle => ({ textShadowColor: c, textShadowRadius: r, textShadowOffset: { width: 0, height: 0 } });

/** Japanese (and anything not Latin) in the system face; the condensed face has no Japanese. */
export function J({ size = 14, color = N.ink, w = '600', lh, style, ...rest }: TextProps & { size?: number; color?: string; w?: TextStyle['fontWeight']; lh?: number }) {
  return <Text {...rest} style={[{ fontFamily: faceFor('system', size), fontSize: size, fontWeight: w, color, lineHeight: lh ?? Math.round(size * 1.4) }, style]} />;
}

/** A readout label: "// TODAY_LOG". */
export function Label({ children, color = N.cyan, size = 10.5 }: { children: ReactNode; color?: string; size?: number }) {
  return <T f="plex" size={size} color={color} ls={1.1} lh={Math.round(size * 1.4)} numberOfLines={1}>{children}</T>;
}

/** Condensed figures and Latin words. */
export function D({ size = 16, color = N.ink, lh, style, ...rest }: TextProps & { size?: number; color?: string; lh?: number }) {
  return <T {...rest} f="condensedBold" size={size} color={color} lh={lh ?? Math.round(size * 1.08)} num style={style} />;
}

const chamfer = (w: number, h: number, c: number, sw: number) => {
  const a = sw / 2;
  const k = Math.min(c, w / 2, h / 2);
  return `${k},${a} ${w - a},${a} ${w - a},${h - k} ${w - k},${h - a} ${a},${h - a} ${a},${k}`;
};
/** A background with the top-left and bottom-right corners cut off. Place it first inside the box it shapes. */
export function Cut({ fill = N.panel, stroke, cut = 12, sw = 1 }: { fill?: string; stroke?: string; cut?: number; sw?: number }) {
  const [s, setS] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (!s || Math.abs(s.w - w) > 0.5 || Math.abs(s.h - h) > 0.5) setS({ w, h });
  };
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {s ? (
        <Svg width={s.w} height={s.h}>
          <Polygon points={chamfer(s.w, s.h, cut, stroke ? sw : 0)} fill={fill} stroke={stroke ?? 'none'} strokeWidth={stroke ? sw : 0} />
        </Svg>
      ) : null}
    </View>
  );
}

/** Corner marks on the two corners a panel keeps. */
export function Brackets({ color = N.yellow, size = 10 }: { color?: string; size?: number }) {
  return (
    <>
      <View pointerEvents="none" style={{ position: 'absolute', top: -1, right: -1, width: size, height: size, borderTopWidth: 2, borderRightWidth: 2, borderColor: color }} />
      <View pointerEvents="none" style={{ position: 'absolute', bottom: -1, left: -1, width: size, height: size, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: color }} />
    </>
  );
}

/** A HUD panel: cut corners, a cyan edge, corner marks. */
export function Panel({ children, pad = 14, cut = 14, fill = N.panel, stroke = N.cyanLine, marks = N.yellow, style }: {
  children?: ReactNode; pad?: number; cut?: number; fill?: string; stroke?: string; marks?: string | null; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ padding: pad }, style]}>
      <Cut fill={fill} stroke={stroke} cut={cut} />
      {marks ? <Brackets color={marks} /> : null}
      {children}
    </View>
  );
}

/** A row of cells, filled from the left: a charge meter. `cells` colors each one (or null for empty). */
export function Meter({ cells, h = 10, gap = 3, off = N.yellowDim }: { cells: (string | null)[]; h?: number; gap?: number; off?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap }}>
      {cells.map((c, i) => (
        <View key={i} style={{ flex: 1, height: h, backgroundColor: c ?? off, transform: [{ skewX: '-18deg' }], boxShadow: c ? `0px 0px 6px ${c}66` : undefined }} />
      ))}
    </View>
  );
}

/** Something that blinks while `on` (a live dot, PAUSED). */
export function Blink({ on = true, children, period = 900 }: { on?: boolean; children: ReactNode; period?: number }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.set(on ? withRepeat(withSequence(withTiming(0.25, { duration: period / 2 }), withTiming(1, { duration: period / 2 })), -1) : withTiming(1, { duration: 120 }));
  }, [on, o, period]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={a}>{children}</Animated.View>;
}

/**
 * The glitch: two offset copies, cyan and red, that jump out for a moment.
 * `kick` changes to set it off (a tap, a new number).
 */
export function Glitch({ children, kick, copy }: { children: ReactNode; kick: number; copy: (color: string) => ReactNode }) {
  const g = useSharedValue(0);
  useEffect(() => {
    if (!kick) return;
    g.set(withSequence(withTiming(1, { duration: 40 }), withTiming(0.3, { duration: 50 }), withTiming(1, { duration: 40 }), withTiming(0, { duration: 140 })));
  }, [kick, g]);
  const cyan = useAnimatedStyle(() => ({ opacity: g.value * 0.85, transform: [{ translateX: -3 * g.value }, { translateY: g.value }] }));
  const red = useAnimatedStyle(() => ({ opacity: g.value * 0.85, transform: [{ translateX: 3 * g.value }, { translateY: -g.value }] }));
  return (
    <View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, cyan]}>{copy(N.cyan)}</Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, red]}>{copy(N.red)}</Animated.View>
      {children}
    </View>
  );
}

/** A two-digit code for a row ('01'). */
export const code = (i: number) => String(i + 1).padStart(2, '0');

/**
 * An icon that draws above a Cut. On the web an absolutely placed shape
 * paints over a bare SVG next to it, so the icon gets a view of its own.
 */
export function I(p: ComponentProps<typeof Icon>) {
  return <View><Icon {...p} /></View>;
}
