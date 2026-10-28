import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { iconUri } from '../lib/planIcon';
import { Txt } from './base';
import { glyphOf, SubjectGlyph } from './SubjectGlyph';

// A plan's picture: the photo picked for it, or, without one, the subject's
// color (lighter at the top left) with its picture (SubjectGlyph) or first letter, big.

/** The color mixed toward white (t > 0) or black (t < 0). */
export function tint(hex: string, t: number) {
  const n = parseInt(hex.slice(1, 7), 16);
  const to = t > 0 ? 255 : 0, k = Math.abs(t);
  const ch = (v: number) => Math.round(v + (to - v) * k);
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

/** `mark`: drawn in place of the picture on the subject's tile (the timetable's turning marks, ui/Loader). */
export function PlanArt({ icon, name, color, size, radius, mark }: { icon?: string; name: string; color: string; size: number; radius: number; mark?: ReactNode }) {
  if (icon) {
    return <Image source={{ uri: iconUri(icon) }} style={{ width: size, height: size, borderRadius: radius }} contentFit="cover" transition={150} accessibilityIgnoresInvertColors />;
  }
  const id = `art${color.slice(1)}`;
  const glyph = glyphOf(name);
  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={tint(color, 0.35)} />
            <Stop offset="1" stopColor={tint(color, -0.12)} />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} fill={`url(#${id})`} />
        <Circle cx={size * 0.72} cy={size * 0.76} r={size * 0.3} fill="rgba(255,255,255,0.14)" />
      </Svg>
      {/* in a view of its own, so it's drawn over the gradient on the web too */}
      {mark ? <View>{mark}</View> : glyph ? <View><SubjectGlyph glyph={glyph} size={size * 0.56} color="rgba(255,255,255,0.94)" width={1.7} /></View>
        : <Txt size={size * 0.46} w="800" lh={size * 0.56} color="rgba(255,255,255,0.94)">{[...name][0] ?? ''}</Txt>}
    </View>
  );
}
