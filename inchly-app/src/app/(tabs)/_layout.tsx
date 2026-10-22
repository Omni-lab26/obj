import { Redirect, router } from 'expo-router';
import TopTabs, { type MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import { View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { elapsedOf, ExtraTab, useNow, useStore } from '@/store';
import { useT } from '@/theme';
import { haptic, Press, Txt } from '@/ui/base';
import { TAB_BAR_H, tabBarBottom } from '@/ui/Chrome';
import { Glass } from '@/ui/Glass';
import { Hud } from '@/ui/Hud';
import { Icon, IconName } from '@/ui/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The lobby. Five pages side by side with home in the middle, like a game's
// main menu: swipe one page at a time, or tap the bar. The top bar (level,
// streak, coins) stays put while the pages move underneath.

const EXTRA: Record<ExtraTab | 'none', { label: string; icon: IconName }> = {
  none: { label: '未定', icon: 'q' },
  events: { label: 'イベント', icon: 'gift' },
  exams: { label: '模試・締切', icon: 'cal' },
  me: { label: 'マイページ', icon: 'user' },
};

function TabBar({ state, navigation }: MaterialTopTabBarProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  useNow();
  const st = useStore((s) => s);
  const extra = EXTRA[st.extraTab ?? 'none'];
  const running = st.running;
  const mins = Math.floor(elapsedOf(st) / 60);
  const META: Record<string, { label: string; icon: IconName }> = {
    store: { label: 'ストア', icon: 'bag' },
    collection: { label: 'バッジ', icon: 'medal' },
    index: { label: 'ホーム', icon: 'home' },
    community: { label: 'コミュニティ', icon: 'users' },
    extra,
  };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarBottom(insets.bottom), paddingHorizontal: 14 }}>
      <Glass style={{ height: TAB_BAR_H }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, gap: 2 }} accessibilityRole="tablist">
          {state.routes.map((r: { key: string; name: string; params?: object }, i: number) => {
            const meta = META[r.name];
            if (!meta) return null;
            const on = state.index === i;
            const home = r.name === 'index';
            // home shows the running minutes, like the battle button showing a match in progress
            const live = home && running;
            return (
              <Animated.View key={r.key} layout={LinearTransition.springify().dampingRatio(0.85).duration(300)} style={{ flex: on ? 2.6 : 1 }}>
                <Press scale={0.9} haptics={false} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={live ? `ホーム 勉強中 ${mins}分` : meta.label}
                  onPress={() => {
                    haptic.tap();
                    const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
                    if (!on && !e.defaultPrevented) navigation.navigate(r.name, r.params);
                    else if (on && live) router.push('/timer');
                  }}
                  style={{ height: TAB_BAR_H - 10, borderRadius: (TAB_BAR_H - 10) / 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                    backgroundColor: on ? (home ? t.ink : 'rgba(118,118,128,0.16)') : 'transparent' }}>
                  {live ? (
                    <>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: st.paused ? t.amber : '#22C55E' }} />
                      <Txt num size={14} w="700" color={on ? t.onInk : t.ink}>{mins}<Txt size={10} color={on ? t.onInk : t.ink}>分</Txt></Txt>
                    </>
                  ) : (
                    <>
                      <Icon name={meta.icon} size={23} color={on ? (home ? t.onInk : t.ink) : t.ink2} filled={on} width={on ? 2 : 1.6} />
                      {on ? <Txt size={12} w="700" numberOfLines={1} color={home ? t.onInk : t.ink}>{meta.label}</Txt> : null}
                    </>
                  )}
                </Press>
              </Animated.View>
            );
          })}
        </View>
      </Glass>
    </View>
  );
}

export default function LobbyLayout() {
  const t = useT();
  // first launch (or after deleting the account): set up before anything else
  const signedIn = useStore((s) => !!s.account);
  if (!signedIn) return <Redirect href="/welcome" />;
  return (
    <View style={{ flex: 1, backgroundColor: t.canvas }}>
      <Hud onCoins={() => router.navigate('/store')} />
      <TopTabs initialRouteName="index" tabBarPosition="bottom" tabBar={(p: MaterialTopTabBarProps) => <TabBar {...p} />}
        screenOptions={{ swipeEnabled: true, lazy: true, lazyPreloadDistance: 1, sceneStyle: { backgroundColor: t.canvas } }}>
        <TopTabs.Screen name="store" />
        <TopTabs.Screen name="collection" />
        <TopTabs.Screen name="index" />
        <TopTabs.Screen name="community" />
        <TopTabs.Screen name="extra" />
      </TopTabs>
    </View>
  );
}
