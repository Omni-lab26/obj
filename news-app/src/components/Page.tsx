import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useScreen } from '@/hooks/useScreen';
import { colors } from '@theme';

/** 画面の地。広い画面では中身を 440 までにして中央に寄せる */
export function Page({ children, bg = colors.bg }: { children: ReactNode; bg?: string }) {
  const { width } = useScreen();
  return (
    <View style={[styles.outer, { backgroundColor: bg }]}>
      <View style={{ flex: 1, width }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({ outer: { flex: 1, alignItems: 'center' } });
