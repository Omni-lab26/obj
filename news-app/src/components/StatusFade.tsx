import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@theme';

/**
 * 画面の一番上（時計や電池の表示の下）に、地の色を薄く敷く。
 * スクロールした中身が時計の文字と重なって読めなくなるのを防ぐ。上のバーがない画面で使う。
 */
export function StatusFade() {
  const insets = useSafeAreaInsets();
  if (!insets.top) return null;
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[colors.bg, 'rgba(17,18,20,0.9)', 'rgba(17,18,20,0)']}
      locations={[0, 0.7, 1]}
      style={[styles.fade, { height: insets.top + 12 }]}
    />
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5 },
});
