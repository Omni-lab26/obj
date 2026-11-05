import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAnimatedScrollHandler, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { scrollRules } from '@theme';

// 下のタブを小さくするかどうか（0＝全部、1＝小さい）。どの画面のスクロールからも動かせるように共有する。
type Ctx = { mini: SharedValue<number>; hidden: SharedValue<number> };
const TabBarCtx = createContext<Ctx | null>(null);

export function TabBarProvider({ children }: { children: ReactNode }) {
  const mini = useSharedValue(0);
  const hidden = useSharedValue(0); // コメント欄が開いている間は、下のタブを下へ隠す
  const v = useMemo(() => ({ mini, hidden }), [mini, hidden]);
  return <TabBarCtx.Provider value={v}>{children}</TabBarCtx.Provider>;
}

export const useTabBar = () => {
  const c = useContext(TabBarCtx);
  if (!c) throw new Error('TabBarProvider がありません');
  return c;
};

/** 下にスクロールで小さく、上にスクロールで元に戻す */
export function useShrinkOnScroll() {
  const { mini } = useTabBar();
  const last = useSharedValue(0);
  return useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
      const dy = y - last.get();
      if (y < scrollRules.topZone) mini.set(0);
      else if (dy > scrollRules.downStep) mini.set(1);
      else if (dy < -scrollRules.upStep) mini.set(0);
      last.set(y);
    },
  });
}
