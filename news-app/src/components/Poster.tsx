import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { refImage } from '@/lib/data/images';
import type { Article } from '@/lib/data/types';
import { colors, fonts } from '@theme';

// サムネ。見本の画像（assets/ref、手元だけ）があればそれを使い、なければ雑誌・ポスターの文字組みで自動で作る。
// 型は4つ：紙面（paper）・計器（gauge）・光（light）・墨（ink）
type Tpl = 'paper' | 'gauge' | 'light' | 'ink';
const TPLS: Tpl[] = ['paper', 'ink', 'gauge', 'light'];
// ジャンルごとに型を決める（同じ話題は同じ見た目にそろえる）
const BY_TAG: Record<string, Tpl> = {
  株式: 'paper',
  物価: 'paper',
  不動産: 'paper',
  賃金: 'paper',
  仕事と賃金: 'paper',
  物価と家計: 'paper',
  日銀: 'ink',
  FRB: 'ink',
  中央銀行: 'ink',
  財政: 'ink',
  政策と財政: 'ink',
  決算: 'ink',
  雇用統計: 'gauge',
  マクロ: 'gauge',
  債券: 'gauge',
  エネルギー: 'gauge',
  為替: 'light',
  世界経済: 'light',
  テック: 'light',
};

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export const posterWord = (a: Article) => a.tag.replace('#', '');

export function Poster({
  a,
  style,
  aspect = 1,
  compact,
  padTop = 0,
  img,
}: {
  a: Article;
  img?: string; // 見本の画像の名前（sq3、th5 など）
  style?: StyleProp<ViewStyle>;
  aspect?: number;
  compact?: boolean;
  padTop?: number; // 上に重なるボタンの分だけ、上の文字を下げる
}) {
  const [w, setW] = useState(0);
  const h = hash(a.id);
  const tpl = BY_TAG[a.tag.replace('#', '')] ?? TPLS[h % TPLS.length];
  const word = posterWord(a);
  const code = `OR-1104-${(h % 4) + 1}`;
  const en = (a.lab ?? (a.type === 'deep' ? 'Deep dive' : 'Orchard')).toUpperCase();
  const big = compact ? 0.55 : 1;
  // 大きな文字は、サムネの幅に1行で収まる大きさにする
  const fs = Math.max(14, Math.min(w * 0.3, (w * 0.84) / Math.max(1, word.length)));
  const P = PAL[tpl];
  const photo = refImage(img);

  if (photo) {
    return (
      <View style={[{ aspectRatio: aspect, backgroundColor: colors.surface, overflow: 'hidden' }, style]}>
        <Image
          source={photo}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          accessibilityIgnoresInvertColors
        />
      </View>
    );
  }

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[{ aspectRatio: aspect, backgroundColor: P.bg, overflow: 'hidden' }, style]}>
      {tpl === 'paper' && (
        <View
          style={[StyleSheet.absoluteFill, { flexDirection: 'row', justifyContent: 'flex-end', paddingRight: '6%' }]}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ width: '7%', marginLeft: '4%', backgroundColor: P.ink2 }} />
          ))}
        </View>
      )}
      {tpl === 'gauge' && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center' }]}>
          {Array.from({ length: 24 }).map((_, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: `${4 + i * 4}%`,
                top: '24%',
                width: 1.5,
                height: i % 4 === 0 ? 22 : 10,
                backgroundColor: P.ink2,
              }}
            />
          ))}
        </View>
      )}
      {tpl === 'light' && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: P.ink2,
              opacity: 0.55,
              transform: [{ rotate: '-24deg' }, { scaleX: 2 }],
              top: '40%',
              height: '22%',
            },
          ]}
        />
      )}

      <View style={{ flex: 1, padding: '7%', paddingTop: padTop || '7%', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[styles.mono, { color: P.sub, fontSize: 10 * big }]}>{en}</Text>
          <Text style={[styles.mono, { color: P.sub, fontSize: 10 * big }]}>{a.tm}</Text>
        </View>
        <View>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.serif,
              fontSize: fs,
              lineHeight: fs * 1.12,
              color: P.ink,
              fontWeight: '800',
              letterSpacing: -2,
            }}>
            {word}
          </Text>
          <View style={{ height: 2, width: '28%', backgroundColor: P.accent, marginVertical: 8 * big }} />
          <Text style={[styles.mono, { color: P.sub, fontSize: 10 * big }]}>{code}</Text>
        </View>
      </View>
    </View>
  );
}

const PAL: Record<Tpl, { bg: string; ink: string; ink2: string; sub: string; accent: string }> = {
  paper: { bg: '#EFE9DC', ink: '#16161A', ink2: 'rgba(110,150,80,0.55)', sub: '#6B6A66', accent: colors.alert },
  ink: { bg: '#0D0D0F', ink: '#F2F2F3', ink2: '#1E1E22', sub: '#8B8C92', accent: colors.accent },
  gauge: { bg: '#14233D', ink: '#E9EEF8', ink2: 'rgba(233,238,248,0.35)', sub: '#9FB0CC', accent: '#7CC0FF' },
  light: { bg: '#2A1A14', ink: '#FFE9DA', ink2: '#FF6A1A', sub: '#E0B9A2', accent: '#FFD25C' },
};

const styles = StyleSheet.create({ mono: { fontFamily: fonts.mono, letterSpacing: 1 } });
