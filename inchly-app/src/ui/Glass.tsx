import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { ReactNode } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useT } from '../theme';

// Liquid Glass for the control layer (tab bar, nav buttons, segmented controls,
// sheets, toasts, composer, timer controls) — never for content.
// iOS 26: the system material (UIGlassEffect), interactive when pressable.
// Everywhere else: blur + a milky white film + a bright rim and a soft shadow,
// so the layer reads the same on older iPhones, Android and the web.
export const LIQUID = Platform.OS === 'ios' && isLiquidGlassAvailable();

const RIM = 'inset 0px 1px 0px rgba(255,255,255,0.95), inset 0px 0px 0px 0.5px rgba(255,255,255,0.7), inset 0px -1px 0px rgba(0,0,0,0.03)';
const RIM_DARK = 'inset 0px 1px 0px rgba(255,255,255,0.12), inset 0px 0px 0px 0.5px rgba(255,255,255,0.1)';
const DROP = '0px 0px 0px 0.5px rgba(0,0,0,0.06), 0px 1px 3px rgba(0,0,0,0.06), 0px 10px 28px rgba(0,0,0,0.10)';

export function Glass({ children, style, radius = 999, interactive, tint, flat }: {
  children?: ReactNode; style?: StyleProp<ViewStyle>; radius?: number; interactive?: boolean;
  /** a coloured glass (e.g. the tint) instead of clear */ tint?: string;
  /** no drop shadow: glass lying on glass (a pill inside the tab bar) */ flat?: boolean;
}) {
  const dark = useT().dark;
  if (LIQUID) {
    return (
      <GlassView glassEffectStyle="regular" isInteractive={interactive} tintColor={tint} style={[{ borderRadius: radius }, style]}>
        {children}
      </GlassView>
    );
  }
  return (
    // zIndex: the material sits under the content even when the content is an unpositioned SVG (web)
    <View style={[{ borderRadius: radius, zIndex: 0 }, !flat && { boxShadow: DROP }, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden', zIndex: -1 }]}>
        <BlurView intensity={Platform.OS === 'web' ? 24 : 40} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tint ?? (dark ? 'rgba(18,18,28,0.62)' : 'rgba(255,255,255,0.62)'), borderRadius: radius, boxShadow: dark ? RIM_DARK : RIM }]} />
      </View>
      {children}
    </View>
  );
}
