import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useScreen } from '@/hooks/useScreen';
import { useTabBar } from '@/hooks/useTabBar';
import { t } from '@/i18n';
import { colors, layout, motion } from '@theme';

import { Glass } from './Glass';
import { Icon, type IconName } from './Icon';

type TabName = 'index' | 'library' | 'people' | 'chat';
const TABS: {
  name: TabName;
  href: '/' | '/library' | '/people' | '/chat';
  icon: IconName;
  label: 'tab.home' | 'tab.library' | 'tab.people' | 'tab.chat';
}[] = [
  { name: 'index', href: '/', icon: 'home', label: 'tab.home' },
  { name: 'library', href: '/library', icon: 'library', label: 'tab.library' },
  { name: 'people', href: '/people', icon: 'people', label: 'tab.people' },
  { name: 'chat', href: '/chat', icon: 'chat', label: 'tab.chat' },
];
const isTabName = (n: string | undefined): n is TabName => TABS.some((x) => x.name === n);
const GAP = 10;
const PAD = 6;
const MINI_W = 58;

// 浮いたガラスのタブ。アイコンだけ（文字なし）。下にスクロールすると、今のタブと検索の丸だけの小さな形になる。
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width, side } = useScreen();
  const { mini, hidden } = useTabBar();
  const p = useDerivedValue(() => withTiming(mini.get(), { duration: motion.tabShrink }));
  const h = useDerivedValue(() => withTiming(hidden.get(), { duration: motion.sheet }));
  const hide = useAnimatedStyle(() => ({ opacity: 1 - h.get(), transform: [{ translateY: h.get() * 90 }] }));
  // コメント欄で隠している間は、読み上げやキーボードの移動でも止まらないようにする
  const [away, setAway] = useState(false);
  useAnimatedReaction(
    () => hidden.get() > 0.5,
    (v, prev) => {
      if (v !== prev) scheduleOnRN(setAway, v);
    }
  );

  const current = state.routes[state.index]?.name;
  const inTab = isTabName(current);
  // 記事を読んでいる間は、記事を開く前にいたタブを今のタブとして見せる
  const [lastTab, setLastTab] = useState<TabName>(inTab ? current : 'index');
  if (inTab && current !== lastTab) setLastTab(current);
  const activeName: TabName = inTab ? current : lastTab;
  const activeIdx = Math.max(
    0,
    TABS.findIndex((x) => x.name === activeName)
  );

  const fullW = width - 28 - layout.tabBarHeight - GAP;
  const slot = (fullW - PAD * 2) / TABS.length;

  const capsule = useAnimatedStyle(() => ({
    width: interpolate(p.get(), [0, 1], [fullW, MINI_W]),
    height: interpolate(p.get(), [0, 1], [layout.tabBarHeight, layout.tabBarMini]),
  }));
  const row = useAnimatedStyle(() => ({
    transform: [{ translateX: p.get() * (MINI_W / 2 - (PAD + slot * (activeIdx + 0.5))) }],
  }));
  const search = useAnimatedStyle(() => {
    const s = interpolate(p.get(), [0, 1], [layout.tabBarHeight, layout.tabBarMini]);
    return { width: s, height: s };
  });
  const dim = useAnimatedStyle(() => ({ opacity: 1 - p.get() }));

  return (
    <Animated.View
      pointerEvents={away ? 'none' : 'box-none'}
      accessibilityElementsHidden={away}
      importantForAccessibility={away ? 'no-hide-descendants' : 'auto'}
      style={[styles.bar, { left: side + 14, right: side + 14, bottom: insets.bottom + layout.tabBarBottom }, hide]}>
      <Animated.View style={[styles.capsuleWrap, capsule]}>
        <Glass style={[StyleSheet.absoluteFill, { borderRadius: 999 }]} interactive />
        <Animated.View style={[styles.row, { width: fullW, paddingHorizontal: PAD }, row]}>
          {TABS.map((tab, i) => {
            const on = i === activeIdx;
            return (
              <Animated.View key={tab.name} style={[{ width: slot }, i === activeIdx ? null : dim]}>
                <Pressable
                  accessibilityRole="tab"
                  accessibilityLabel={t(tab.label)}
                  accessibilityState={{ selected: on }}
                  tabIndex={away ? -1 : 0}
                  onPress={() => {
                    // 小さいときに今のタブを押したら、まず元の大きさに戻すだけ
                    if (mini.get() === 1 && i === activeIdx) {
                      mini.set(0);
                      return;
                    }
                    mini.set(0);
                    const r = state.routes.find((x) => x.name === tab.name);
                    if (!r) return;
                    // 今いるタブをもう一度押したら、画面が一番上に戻る（useScrollToTop が受け取る）
                    const ev = emitter.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
                    if (current === tab.name || ev.defaultPrevented) return;
                    Haptics.selectionAsync().catch(() => {});
                    // 記事を読んでいるときは、記事を閉じてタブへ（戻るで記事が出てこないように履歴から外す）
                    if (inTab) navigateToTab(r.key);
                    else router.replace(tab.href);
                  }}
                  style={[styles.tab, on && styles.tabOn]}>
                  <Icon name={tab.icon} size={23} color={on ? colors.white : 'rgba(242,242,243,0.72)'} />
                </Pressable>
              </Animated.View>
            );
          })}
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.searchWrap, search]}>
        <Glass style={[StyleSheet.absoluteFill, { borderRadius: 999 }]} interactive />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tab.search')}
          tabIndex={away ? -1 : 0}
          onPress={() => router.push('/search')}
          style={styles.searchBtn}>
          <Icon name="search" size={22} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  capsuleWrap: { borderRadius: 999, overflow: 'hidden', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', height: '100%' },
  tab: { height: 46, marginHorizontal: 4, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: 'rgba(255,255,255,0.14)' },
  searchWrap: { borderRadius: 999, overflow: 'hidden' },
  searchBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
