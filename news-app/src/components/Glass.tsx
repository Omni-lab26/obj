import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@theme';

// iOS 26 以降は OS の Liquid Glass。ほかは「ぼかし＋薄い色の膜＋縁の光」で近づける。
const nativeGlass = (() => {
  try {
    return Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
})();

type Props = { style?: StyleProp<ViewStyle>; children?: ReactNode; interactive?: boolean };

export function Glass({ style, children, interactive }: Props) {
  if (nativeGlass) {
    return (
      <GlassView style={style} glassEffectStyle="regular" colorScheme="dark" isInteractive={interactive}>
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[styles.wrap, style]}>
      {Platform.OS === 'android' ? (
        <View style={[StyleSheet.absoluteFill, styles.androidFill]} />
      ) : (
        <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <View style={[StyleSheet.absoluteFill, styles.tint]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.edge]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  androidFill: { backgroundColor: 'rgba(30,30,34,0.9)' },
  tint: { backgroundColor: colors.glassTint },
  edge: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.glassEdge,
    borderLeftColor: colors.glassEdge,
    borderRightColor: colors.glassEdgeSoft,
    borderBottomColor: colors.glassEdgeSoft,
  },
});
