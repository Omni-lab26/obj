// 余白は 4 の倍数。画面の左右は 16、記事の本文は 18。
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, page: 16, article: 18 } as const;

export const radius = { chip: 999, card: 18, thumb: 16, thumbSm: 10, sheet: 28, group: 14 } as const;

// 画面幅（brief.md：320〜440。それより広いときは中央に寄せる）
export const layout = { minWidth: 320, maxWidth: 440, tabBarHeight: 60, tabBarMini: 48, tabBarBottom: 18 } as const;
