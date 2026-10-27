import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { ReactNode, useId } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useT } from '../theme';

// Liquid Glass for the control layer (tab bar, study bar, nav buttons,
// segmented controls, sheets, toasts, composer, timer controls), and a
// quieter frosted glass for cards over a 背景 (Pane).
// iOS 26: the system material (UIGlassEffect) — clear (what's behind shows
// through, bent at the edges), or regular with a white film where it should
// blur more (the tab bar a little, the study bar most) — interactive when pressable.
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

/** Light across glass: bright at the top left, gone by the middle, a faint return at the bottom right. strength: 1 the bars, about half for cards. */
function Sheen({ radius, dark, strength = 0.55 }: { radius: number; dark: boolean; strength?: number }) {
  const id = useId().replace(/:/g, '');
  const a = (dark ? 0.1 : 0.42) * strength;
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

export function Glass({ children, style, radius = 999, interactive, tint, flat, frost, soft }: {
  children?: ReactNode; style?: StyleProp<ViewStyle>; radius?: number; interactive?: boolean;
  /** a coloured glass (e.g. the tint) instead of clear */ tint?: string;
  /** no drop shadow: glass lying on glass (a pill inside the tab bar) */ flat?: boolean;
  /** frosted, not clear: words on it are read at a glance (the study bar) */ frost?: boolean;
  /** between clear and frosted: what's behind is still there but well blurred (the tab bar) */ soft?: boolean;
}) {
  const dark = useT().dark;
  if (LIQUID) {
    return (
      <GlassView glassEffectStyle={frost || soft ? 'regular' : 'clear'} isInteractive={interactive}
        tintColor={tint ?? (dark ? `rgba(8,12,18,${frost ? 0.5 : soft ? 0.36 : 0.28})` : `rgba(255,255,255,${frost ? 0.55 : soft ? 0.4 : 0.14})`)}
        colorScheme={dark ? 'dark' : 'light'} style={[{ borderRadius: radius }, style]}>
        {children}
      </GlassView>
    );
  }
  const film = tint ?? (dark ? `rgba(18,22,32,${blurs ? (frost ? 0.72 : soft ? 0.6 : 0.4) : 0.86})` : `rgba(255,255,255,${blurs ? (frost ? 0.74 : soft ? 0.62 : 0.3) : 0.86})`);
  return (
    // zIndex: the material sits under the content even when the content is an unpositioned SVG (web)
    <View style={[{ borderRadius: radius, zIndex: 0 }, !flat && { boxShadow: DROP }, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden', zIndex: -1 }]}>
        {blurs ? <BlurView intensity={soft ? (web ? 80 : 95) : web ? 55 : 70} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: film, borderRadius: radius }]} />
        <Sheen radius={radius} dark={dark} strength={1} />
        <View style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: dark ? RIM_DARK : RIM }]} />
      </View>
      {children}
    </View>
  );
}

/**
 * A card's glass over a 背景 (none without one): on the frosted 背景 of the
 * pages, a white film (the frost behind does the blurring; on the timer it
 * blurs itself), light falls across it, and its edge is soft — no line and no shadow, a
 * faint haze of its own color just outside, so the card melts into the koi
 * instead of sitting on them. The card's own background is the film; put the
 * pane first inside it.
 * `liquid`: a little more of Liquid Glass, kept quiet (the timer's cards) —
 * a bright rim catching the light at the top, a hairline of light all round,
 * light gathering just inside the edge, and the card lifted a touch.
 */
const LIQUID_RIM = 'inset 0px 1px 0px rgba(255,255,255,0.92), inset 0px 0px 0px 0.75px rgba(255,255,255,0.5), inset 0px -1px 0px rgba(255,255,255,0.28), inset 0px 0px 22px rgba(255,255,255,0.26), inset 0px -3px 8px rgba(20,40,44,0.035)';
export function Pane({ radius, small, liquid, blur }: {
  radius: number; /** a small tile among many: a denser film instead of a live blur (blurs cost) */ small?: boolean; liquid?: boolean;
  /** blur what's behind (on the timer, where the 背景 isn't frosted); the pages' 背景 is frosted already (backdrop/Veil) */ blur?: boolean;
}) {
  const t = useT();
  if (t.backdrop === 'none') return null;
  const dark = t.dark;
  if (small) {
    return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, zIndex: -1, backgroundColor: dark ? 'rgba(12,18,26,0.55)' : 'rgba(255,255,255,0.55)' }]} />;
  }
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, zIndex: -1,
      boxShadow: dark ? '0px 0px 24px 2px rgba(8,14,20,0.32)' : liquid ? '0px 10px 28px rgba(30,45,50,0.07), 0px 0px 22px 2px rgba(255,255,255,0.32)' : '0px 0px 24px 2px rgba(255,255,255,0.4)' }]}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
        {!(blur || liquid) ? null : blurs ? <BlurView intensity={web ? 60 : 80} tint={dark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'} style={StyleSheet.absoluteFill} />
          : <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? 'rgba(14,20,28,0.62)' : 'rgba(255,255,255,0.6)' }]} />}
        <Sheen radius={radius} dark={dark} strength={liquid ? 0.75 : 0.55} />
        <View style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: dark ? 'inset 0px 1px 0px rgba(255,255,255,0.06)' : liquid ? LIQUID_RIM : 'inset 0px 1px 0px rgba(255,255,255,0.5)' }]} />
      </View>
    </View>
  );
}
