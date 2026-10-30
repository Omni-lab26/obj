import MaskedViewBase from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import type { ComponentType, ReactElement } from 'react';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

// One soft veil behind the whole block (date, digits, hint), not a glow round each
// digit: a slight blur, a little darker over a dark scene (lighter over a light one),
// that keeps the digits legible and thins out little by little into the scene, the
// way a wave thins out up the sand. It holds its strength across the digits, then
// fades on a long, gentle curve that leaves nothing at the edge, so there is no line
// anywhere. On iPhone it is a real blur under that fade; in a browser the same with
// CSS; on Android (where blurring the scene's web view behind would need it rebuilt
// as a blur target) a veil of the background's colour that fades the same way.

// (Its class typings predate React 19's JSX types.)
const MaskedView = MaskedViewBase as unknown as ComponentType<ViewProps & { maskElement: ReactElement }>;

// How strong it is from the centre (0) out to the edge (1): whole until 0.45, then
// down a smoothstep, which meets both the whole and the nothing with no slope at all,
// so the eye finds no rim.
const FADE = Array.from({ length: 16 }, (_, i) => {
  const r = i / 15;
  const s = Math.min(1, Math.max(0, (r - 0.45) / 0.55));
  return { at: r, alpha: 1 - s * s * (3 - 2 * s) };
});

function Fade({ color, opacity }: { color: string; opacity: number }) {
  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="face-fade" cx="50" cy="50" rx="50" ry="50" gradientUnits="userSpaceOnUse">
          {FADE.map((f) => (
            <Stop key={f.at} offset={f.at} stopColor={color} stopOpacity={opacity * f.alpha} />
          ))}
        </RadialGradient>
      </Defs>
      <Ellipse cx="50" cy="50" rx="50" ry="50" fill="url(#face-fade)" />
    </Svg>
  );
}

const webMask = `radial-gradient(closest-side, ${FADE.map((f) => `rgba(0,0,0,${f.alpha.toFixed(3)}) ${f.at * 100}%`).join(', ')})`;

/** spread: how far past its parent's box, each side, the veil reaches. */
export function FaceBackdrop({ tone, spread = SPREAD }: { tone: 'dark' | 'light'; spread?: { x: number; y: number } }) {
  const dark = tone === 'dark';
  const box = { position: 'absolute' as const, top: -spread.y, bottom: -spread.y, left: -spread.x, right: -spread.x };
  if (Platform.OS === 'web') {
    const filter = dark ? 'blur(12px) brightness(0.78)' : 'blur(12px) brightness(1.12)';
    const css = {
      backdropFilter: filter,
      WebkitBackdropFilter: filter,
      backgroundColor: dark ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.22)',
      maskImage: webMask,
      WebkitMaskImage: webMask,
    };
    return <View pointerEvents="none" style={[box, css as object]} />;
  }
  if (Platform.OS === 'ios') {
    return (
      <MaskedView pointerEvents="none" style={box} maskElement={<Fade color="#000" opacity={1} />}>
        <BlurView intensity={30} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.2)' }]} />
      </MaskedView>
    );
  }
  return (
    <View pointerEvents="none" style={box}>
      <Fade color={dark ? '#000000' : '#ffffff'} opacity={dark ? 0.45 : 0.6} />
    </View>
  );
}

// Round the whole clock and well past it on every side, so the fade has room to go
// gently.
const SPREAD = { x: 96, y: 64 };
