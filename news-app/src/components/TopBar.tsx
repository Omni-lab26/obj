import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@theme';

export const TOP_BAR_H = 52;
const FADE = 36;

/**
 * スクロールしても上に残るバー。下の境目に線を作らず、ぼかしと色を下へ向かってだんだん消す。
 */
export function TopBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const h = insets.top + TOP_BAR_H;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { height: h + FADE }]}>
      {Platform.OS === 'ios' ? <BlurView intensity={24} tint="dark" style={[styles.blur, { height: h }]} /> : null}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(17,18,20,0.86)', 'rgba(17,18,20,0.62)', 'rgba(17,18,20,0)']}
        locations={[0, (h * 0.8) / (h + FADE), 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.row, { marginTop: insets.top, height: TOP_BAR_H }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  blur: { position: 'absolute', top: 0, left: 0, right: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
});

/** スクロールの中身の上に空ける高さ（バーの分＋少しのゆとり） */
export const useTopInset = () => {
  const insets = useSafeAreaInsets();
  return insets.top + TOP_BAR_H + 6;
};

export const topBarColors = { bg: colors.bg };
