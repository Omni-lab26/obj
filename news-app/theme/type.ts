import { Platform } from 'react-native';

// 書体：アプリの文字は端末の文字。数字・時刻・番号は Geist Mono。
export const fonts = {
  mono: 'GeistMono_500Medium',
  monoBold: 'GeistMono_600SemiBold',
  // サムネの中だけで使う明朝（端末にある書体を使う）
  serif: Platform.select({ ios: 'HiraMinProN-W6', android: 'serif', default: 'serif' }) as string,
} as const;

// 文字の役割（大きさ / 行の高さ）。拡大の上限は maxFontSizeMultiplier で付ける。
export const type = {
  display: { fontSize: 30, lineHeight: 39, fontWeight: '800' as const, max: 1.3 },
  title: { fontSize: 21, lineHeight: 28, fontWeight: '700' as const, max: 1.6 },
  headline: { fontSize: 17, lineHeight: 24, fontWeight: '700' as const, max: 1.8 },
  body: { fontSize: 15, lineHeight: 28, fontWeight: '400' as const, max: 2 },
  comment: { fontSize: 13.5, lineHeight: 21, fontWeight: '400' as const, max: 2 },
  caption: { fontSize: 11.5, lineHeight: 16, fontWeight: '400' as const, max: 1.6 },
  label: { fontSize: 10.5, lineHeight: 12, fontWeight: '700' as const, max: 1.3 },
} as const;
