import { Redirect, router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { elapsedOf, useNow, useStore } from '@/store';
import { useT } from '@/theme';
import { haptic, Press, Txt } from '@/ui/base';
import { TAB_BAR_H, tabBarBottom } from '@/ui/Chrome';
import { Glass } from '@/ui/Glass';
import { Icon, IconName } from '@/ui/Icon';

const TABS: Record<string, { label: string; icon: IconName; slot: number }> = {
  index: { label: 'ホーム', icon: 'home', slot: 0 },
  timeline: { label: 'タイムライン', icon: 'feed', slot: 1 },
  community: { label: 'みんな', icon: 'users', slot: 3 },
  me: { label: 'マイページ', icon: 'user', slot: 4 },
};
const SLOTS = 5; // slot 2 is the timer

// A floating Liquid Glass capsule over the content, icons only. The selected
// tab sits in a lighter lens that slides between items; the timer keeps the
// middle, a dark pill that shows the running minutes.
function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const t = useT();
  useNow();
  const st = useStore((s) => s);
  const running = st.running, paused = st.paused;
  const mins = Math.floor(elapsedOf(st) / 60);
  const [w, setW] = useState(0);
  const item = w ? (w - 8) / SLOTS : 0;
  const slot = TABS[state.routes[state.index]?.name]?.slot ?? 0;
  const x = useSharedValue(0);
  useEffect(() => { if (item) x.set(withSpring(4 + slot * item, { duration: 420, dampingRatio: 0.78 })); }, [slot, item, x]);
  const lens = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const tab = (name: string) => {
    const i = state.routes.findIndex((r) => r.name === name);
    const r = state.routes[i];
    const meta = TABS[name];
    if (!r) return null;
    const on = state.index === i;
    return (
      <Press key={r.key} scale={0.86} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={meta.label}
        onPress={() => {
          const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
          if (!on && !e.defaultPrevented) navigation.navigate(r.name, r.params);
        }}
        style={{ flex: 1, height: TAB_BAR_H - 8, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={meta.icon} size={25} color={on ? t.ink : t.ink2} filled={on} width={on ? 1.9 : 1.6} />
      </Press>
    );
  };

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarBottom(insets.bottom), paddingHorizontal: 20 }}>
      <Glass style={{ height: TAB_BAR_H }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="tablist">
          {item ? <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 4, bottom: 4, width: item, borderRadius: 28, backgroundColor: 'rgba(118,118,128,0.14)' }, lens]} /> : null}
          {tab('index')}
          {tab('timeline')}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Press onPress={() => { haptic.soft(); router.push('/timer'); }} haptics={false} scale={0.9} hitSlop={{ top: 10, bottom: 10 }}
              accessibilityLabel={running ? `勉強中 ${mins}分。タイマーを開く` : 'タイマーを開いて勉強を始める'}
              style={{ height: 40, minWidth: 52, paddingHorizontal: running ? 12 : 0, borderRadius: 20, backgroundColor: t.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {running ? (
                <>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: paused ? t.amber : '#22C55E' }} />
                  <Txt num size={13} w="600" color={t.onInk}>{mins}<Txt size={10} color={t.onInk}>分</Txt></Txt>
                </>
              ) : (
                <Icon name="play" size={16} color={t.onInk} />
              )}
            </Press>
          </View>
          {tab('community')}
          {tab('me')}
        </View>
      </Glass>
    </View>
  );
}

export default function TabLayout() {
  // first launch (or after deleting the account): set up before anything else
  const signedIn = useStore((s) => !!s.account);
  if (!signedIn) return <Redirect href="/welcome" />;
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="timeline" />
      <Tabs.Screen name="community" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
