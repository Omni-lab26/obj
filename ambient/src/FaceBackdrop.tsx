import MaskedViewBase from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import type { ComponentType, ReactElement } from 'react';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

// A slight blur behind the digits that fades out to nothing at its edges, so there is
// no box to see: on iPhone a real blur under a soft round mask, in a browser the same
// with CSS, and on Android (where blurring the scene's web view behind would need it
// rebuilt as a blur target) a soft veil of the background's colour instead.

// (Its class typings predate React 19's JSX types.)
const MaskedView = MaskedViewBase as unknown as ComponentType<ViewProps & { maskElement: ReactElement }>;

function Fade({ color, opacity }: { color: string; opacity: number }) {
  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="fade" cx="50" cy="50" rx="50" ry="50" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.5" stopColor={color} stopOpacity={opacity * 0.85} />
          <Stop offset="0.8" stopColor={color} stopOpacity={opacity * 0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="50" cy="50" rx="50" ry="50" fill="url(#fade)" />
    </Svg>
  );
}

export function FaceBackdrop({ tone }: { tone: 'dark' | 'light' }) {
  const dark = tone === 'dark';
  if (Platform.OS === 'web') {
    const css = {
      backdropFilter: 'blur(9px)',
      WebkitBackdropFilter: 'blur(9px)',
      maskImage: 'radial-gradient(closest-side, #000 45%, rgba(0,0,0,0.6) 70%, transparent)',
      WebkitMaskImage: 'radial-gradient(closest-side, #000 45%, rgba(0,0,0,0.6) 70%, transparent)',
    };
    return <View pointerEvents="none" style={[styles.box, css as object]} />;
  }
  if (Platform.OS === 'ios') {
    return (
      <MaskedView pointerEvents="none" style={styles.box} maskElement={<Fade color="#000" opacity={1} />}>
        <BlurView intensity={22} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      </MaskedView>
    );
  }
  return (
    <View pointerEvents="none" style={styles.box}>
      <Fade color={dark ? '#000000' : '#ffffff'} opacity={dark ? 0.28 : 0.4} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Well past the digits on every side, so the fade is over before anything shows.
  box: {
    position: 'absolute',
    top: -34,
    bottom: -34,
    left: -56,
    right: -56,
  },
});
