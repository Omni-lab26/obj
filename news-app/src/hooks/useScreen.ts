import { useWindowDimensions } from 'react-native';

import { clampWidth } from '@/lib/format';
import { layout } from '@theme';

/** 画面幅は 320〜440。広い画面では中央に寄せる（コンテンツの幅と左右の余り） */
export function useScreen() {
  const { width, height } = useWindowDimensions();
  const w = clampWidth(width, layout.minWidth, layout.maxWidth);
  return { width: w, height, side: Math.max(0, (width - w) / 2), windowWidth: width };
}
