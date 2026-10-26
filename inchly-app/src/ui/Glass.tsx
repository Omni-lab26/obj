import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { ReactNode, useId } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useT } from '../theme';

// Liquid Glass for the control layer (tab bar, study bar, nav buttons,
// segmented controls, sheets, toasts, composer, timer controls), and a
// quieter frosted glass for cards over a 背景 (Pane).
// iOS 26: the system material (UIGlassEffect), clear — the most glass-like:
// what's behind shows through, bent at the edges — interactive when pressable.
// Everywhere else: a strong blur with the color pulled up, a thin film, light
// falling across it from the top left, and a bright, soft rim — so the layer
// reads as glass on older iPhones, Android and the web too.
export const LIQUID = Platform.OS === 'ios' && isLiquidGlassAvailable();

// the rim: a bright top edge, a fainter bottom one, a hairline all round, and light caught just inside the edge
const RIM = 'inset 0px 1px 0px rgba(255,255,255,0.95), inset 0px -1px 0px rgba(255,255,255,0.35), inset 0px 0px 0px 0.5px rgba(255,255,255,0.6), inset 0px 0px 16px rgba(255,255,255,0.32)';
const RIM_DARK = 'inset 0px 1px 0px rgba(255,255,255,0.3), inset 0px -1px 0px rgba(255,255,255,0.08), inset 0px 0px 0px 0.5px rgba(255,255,255,0.16), inset 0px 0px 16px rgba(255,255,255,0.07)';
const DROP = '0px 0px 0px 0.5px rgba(0,0,0,0.05), 0px 1px 3px rgba(0,0,0,0.06), 0px 12px 30px rgba(0,0,0,0.12)';
const web = Platform.OS === 'web';
// Android blurs only what's wrapped for it; there the glass is a thicker film instead
const blurs = Platform.OS !== 'android';

/** Light across glass: bright at the top left, gone by the middle, a faint return at the bottom right. */
function Sheen({ radius, dark, strong }: { radius: number; dark: boolean; strong?: boolean }) {
  const id = useId().replace(/:/g, '');
  const a = (dark ? 0.1 : 0.42) * (strong ? 1 : 0.55);
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={a} />
          <Stop offset="0.38" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="0.82" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={a * 0.35} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" rx={radius} ry={radius} fill={`url(#${id})`} />
    </Svg>
  );
}

export function Glass({ children, style, radius = 999, interactive, tint, flat }: {
  children?: ReactNode; style?: StyleProp<ViewStyle>; radius?: number; interactive?: boolean;
  /** a coloured glass (e.g. the tint) instead of clear */ tint?: string;
  /** no drop shadow: glass lying on glass (a pill inside the tab bar) */ flat?: boolean;
}) {
  const dark = useT().dark;
  if (LIQUID) {
    return (
      <GlassView glassEffectStyle="clear" isInteractive={interactive} tintColor={tint ?? (dark ? 'rgba(8,12,18,0.28)' : 'rgba(255,255,255,0.14)')}
        colorScheme={dark ? 'dark' : 'light'} style={[{ borderRadius: radius }, style]}>
        {children}
      </GlassView>
    );
  }
  const film = tint ?? (dark ? `rgba(18,22,32,${blurs ? 0.4 : 0.86})` : `rgba(255,255,255,${blurs ? 0.3 : 0.86})`);
  return (
    // zIndex: the material sits under the content even when the content is an unpositioned SVG (web)
    <View style={[{ borderRadius: radius, zIndex: 0 }, !flat && { boxShadow: DROP }, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden', zIndex: -1 }]}>
        {blurs ? <BlurView intensity={web ? 55 : 70} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: film, borderRadius: radius }]} />
        <Sheen radius={radius} dark={dark} strong />
        <View style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: dark ? RIM_DARK : RIM }]} />
      </View>
      {children}
    </View>
  );
}

/**
 * A card's glass over a 背景 (none without one): what's behind is blurred,
 * light falls across it, and its edge is soft — no line and no shadow, a
 * faint haze of its own color just outside, so the card melts into the koi
 * instead of sitting on them. The card's own background is the film; put the
 * pane first inside it.
 */
export function Pane({ radius, small }: { radius: number; /** a small tile among many: a denser film instead of a live blur (blurs cost) */ small?: boolean }) {
  const t = useT();
  if (t.backdrop === 'none') return null;
  const dark = t.dark;
  if (small) {
    return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, zIndex: -1, backgroundColor: dark ? 'rgba(12,18,26,0.55)' : 'rgba(255,255,255,0.55)' }]} />;
  }
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, zIndex: -1, boxShadow: dark ? '0px 0px 24px 2px rgba(8,14,20,0.32)' : '0px 0px 24px 2px rgba(255,255,255,0.4)' }]}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
        {blurs ? <BlurView intensity={web ? 60 : 80} tint={dark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'} style={StyleSheet.absoluteFill} />
          : <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? 'rgba(14,20,28,0.62)' : 'rgba(255,255,255,0.6)' }]} />}
        <Sheen radius={radius} dark={dark} />
        <View style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: dark ? 'inset 0px 1px 0px rgba(255,255,255,0.06)' : 'inset 0px 1px 0px rgba(255,255,255,0.5)' }]} />
      </View>
    </View>
  );
}
