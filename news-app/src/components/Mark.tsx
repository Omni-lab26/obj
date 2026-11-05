import { View } from 'react-native';

import { colors } from '@theme';

// ハーフティックの印：長い棒と、半分の長さの棒
export function Mark({ height = 15, color = colors.accent }: { height?: number; color?: string }) {
  const w = Math.max(2.5, height / 5);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: w * 0.7, height }}>
      <View style={{ width: w, height, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: w, height: height / 2, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}
