import { ComponentProps, ReactNode, useEffect, useMemo, useState } from 'react';
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { T } from '@/themes/kit';
import { Press } from '@/ui/base';
import { Icon, IconName } from '@/ui/Icon';
import { M, timed } from '@/ui/motion';
import { blobRect, drops, HARD, INK, splatPath } from './paint';

// The pieces インク is made of: splats, hand-painted blobs, stickers with a
// white edge, and things that splash where you tap them.

/** A splat with droplets around it, filling a size × size box. */
export function Splat({ size, color, seed, drops: n = 5, wobble, bulges, style }: {
  size: number; color: string; seed: string | number; drops?: number; wobble?: number; bulges?: number; style?: StyleProp<ViewStyle>;
}) {
  const c = size / 2, r = size * 0.3;
  const d = useMemo(() => splatPath(c, c, r, seed, { wobble, bulges }), [c, r, seed, wobble, bulges]);
  const ds = useMemo(() => drops(c, c, r, seed, n), [c, r, seed, n]);
  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Path d={d} fill={color} />
        {ds.map((x, i) => <Circle key={i} cx={x.x} cy={x.y} r={x.r} fill={color} />)}
      </Svg>
    </View>
  );
}

/** A hand-painted blob filling whatever box it's in (behind the content of that box). */
export function BlobFill({ color, seed, wob = 3, stroke, strokeWidth }: { color: string; seed: string | number; wob?: number; stroke?: string; strokeWidth?: number }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const d = useMemo(() => (box.w ? blobRect(box.w, box.h, seed, wob) : ''), [box.w, box.h, seed, wob]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {d ? <Svg width={box.w} height={box.h}><Path d={d} fill={color} stroke={stroke} strokeWidth={strokeWidth} /></Svg> : null}
    </View>
  );
}

/** A sticker: dark slab, white edge, a slight tilt and a hard shadow. */
export function Decal({ children, tilt = 0, edge = INK.white, bg = '#262626', radius = 18, pad = 14, style }: {
  children?: ReactNode; tilt?: number; edge?: string; bg?: string; radius?: number; pad?: number; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ backgroundColor: bg, borderRadius: radius, borderWidth: 2.5, borderColor: edge, padding: pad, boxShadow: HARD, transform: [{ rotate: `${tilt}deg` }] }, style]}>
      {children}
    </View>
  );
}

/** A strip of tape holding a sticker down. */
export function Tape({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View pointerEvents="none" style={[{ position: 'absolute', width: 46, height: 16, backgroundColor: 'rgba(255,255,255,0.32)', borderRadius: 2 }, style]} />;
}

/** Heavy text with a hard shadow, like a sticker's lettering. */
export function Shout({ children, size, color = INK.white, shadow = INK.black, lh, style, ...rest }: {
  children: ReactNode; size: number; color?: string; shadow?: string; lh?: number; style?: StyleProp<TextStyle>;
} & Omit<ComponentProps<typeof T>, 'children' | 'size' | 'color' | 'style'>) {
  const off = Math.max(1.5, size / 16);
  return (
    <T f="heavy" size={size} color={color} lh={lh ?? Math.round(size * 1.18)} {...rest}
      style={[{ textShadowColor: shadow, textShadowOffset: { width: off, height: off * 1.3 }, textShadowRadius: 0.01 }, style]}>
      {children}
    </T>
  );
}

/** A round icon sticker: black disc, white edge. */
export function IconSticker({ name, label, onPress, dot, size = 36 }: { name: IconName; label: string; onPress: () => void; dot?: boolean; size?: number }) {
  return (
    <Press onPress={onPress} scale={0.86} hitSlop={6} accessibilityRole="button" accessibilityLabel={label}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: INK.black, borderWidth: 2, borderColor: INK.white, alignItems: 'center', justifyContent: 'center', boxShadow: '2px 3px 0px rgba(0,0,0,0.55)' }}>
      <Icon name={name} size={size * 0.47} color={INK.white} width={2} />
      {dot ? <View style={{ position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: INK.pink, borderWidth: 2, borderColor: INK.black }} /> : null}
    </Press>
  );
}

let splashes = 0;
/** A splat thrown where you tapped, that fades as it dries. */
function TapSplat({ x, y, color, size }: { x: number; y: number; color: string; size: number }) {
  const o = useSharedValue(0.95);
  const [seed] = useState(() => `tap${++splashes}`);
  // there at once, then dries away (no splat growing or bouncing in: MOTION.md)
  useEffect(() => {
    o.set(withDelay(180, timed(0, M.leave.duration)));
  }, [o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size }, a]}>
      <Splat size={size} color={color} seed={seed} drops={6} />
    </Animated.View>
  );
}

/**
 * Something you tap that splashes: a splat of `color` lands where your finger
 * was and dries away, on top of the squish every インク press has.
 */
export function SplashPress({ color, splash = 64, children, onPressIn, style, ...rest }: ComponentProps<typeof Press> & { color: string; splash?: number }) {
  const [hit, setHit] = useState<{ x: number; y: number; k: number } | null>(null);
  return (
    <Press {...rest} style={style}
      onPressIn={(e) => {
        const { locationX, locationY } = e.nativeEvent;
        setHit({ x: Number.isFinite(locationX) ? locationX : 0, y: Number.isFinite(locationY) ? locationY : 0, k: Date.now() });
        onPressIn?.(e);
      }}>
      {children}
      {hit ? <TapSplat key={hit.k} x={hit.x} y={hit.y} color={color} size={splash} /> : null}
    </Press>
  );
}

/** A drop: studied (full), today (a splat), to come (an outline). */
export function Drop({ size, color, mode }: { size: number; color: string; mode: 'full' | 'empty' | 'dashed' }) {
  const d = `M${size / 2} 1 C${size * 0.78} ${size * 0.36} ${size - 2} ${size * 0.5} ${size - 2} ${size * 0.66} A${size / 2 - 2} ${size / 2 - 2} 0 0 1 2 ${size * 0.66} C2 ${size * 0.5} ${size * 0.22} ${size * 0.36} ${size / 2} 1 Z`;
  return (
    <Svg width={size} height={size}>
      <Path d={d} fill={mode === 'full' ? color : 'none'} stroke={mode === 'full' ? 'none' : color} strokeWidth={1.6} strokeDasharray={mode === 'dashed' ? '3 2.5' : undefined} />
    </Svg>
  );
}
