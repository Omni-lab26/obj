import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { faceOf } from '@/lib/data';
import { refImage } from '@/lib/data/images';
import { colors } from '@theme';

/** 人やグループのアイコン。見本の画像があれば使い、なければ頭文字 */
export function Face({ who, size = 34, img, square }: { who: string; size?: number; img?: string; square?: boolean }) {
  const src = refImage(img ?? faceOf(who));
  const r = square ? size * 0.3 : size / 2;
  if (src) {
    return (
      <Image
        source={src}
        style={{ width: size, height: size, borderRadius: r, backgroundColor: colors.surface2 }}
        contentFit="cover"
      />
    );
  }
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: r }]}>
      <Text style={[styles.t, { fontSize: size * 0.4 }]}>{who.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  t: { color: colors.text, fontWeight: '700' },
});
