// 動きの長さ（ms）。docs/design.md の「動き」の表と同じ。
export const motion = {
  tabShrink: 340,
  sheet: 420,
  morph: 460,
  reveal: 500,
  press: 120,
} as const;

// スクロールでタブを小さくする判定（px）
export const scrollRules = { topZone: 40, downStep: 6, upStep: 10 } as const;
