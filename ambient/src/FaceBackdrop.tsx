import MaskedViewBase from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import type { ComponentType, ReactElement } from 'react';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

// A slight blur behind the digits that thins out little by little into the scene, the
// way a wave thins out up the sand: strongest behind the digits, then fading on a long,
// gentle curve that has quite gone before the edge, so there is no line anywhere. On
// iPhone it is a real blur under that fade; in a browser the same with CSS; on Android
// (where blurring the scene's web view behind would need it rebuilt as a blur target)
// a veil of the background's colour that fades the same way.

// (Its class typings predate React 19's JSX types.)
const MaskedView = MaskedViewBase as unknown as ComponentType<ViewProps & { maskElement: ReactElement }>;

// How strong it is from the centre (0) out to the edge (1): (1 - r²)², which leaves the
// edge with no slope at all, so the eye finds no rim.
const FADE = Array.from({ length: 11 }, (_, i) => {
  const r = i / 10;
  return { at: r, alpha: (1 - r * r) ** 2 };
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

export function FaceBackdrop({ tone }: { tone: 'dark' | 'light' }) {
  const dark = tone === 'dark';
  if (Platform.OS === 'web') {
    const css = {
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      maskImage: webMask,
      WebkitMaskImage: webMask,
    };
    return <View pointerEvents="none" style={[styles.box, css as object]} />;
  }
  if (Platform.OS === 'ios') {
    return (
      <MaskedView pointerEvents="none" style={styles.box} maskElement={<Fade color="#000" opacity={1} />}>
        <BlurView intensity={24} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      </MaskedView>
    );
  }
  return (
    <View pointerEvents="none" style={styles.box}>
      <Fade color={dark ? '#000000' : '#ffffff'} opacity={dark ? 0.32 : 0.45} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Well past the digits on every side, so the fade has room to go gently.
  box: {
    position: 'absolute',
    top: -56,
    bottom: -56,
    left: -80,
    right: -80,
  },
});
