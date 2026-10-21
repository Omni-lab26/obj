import { router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';

import { elapsedOf, useNow, useStore } from '@/store';
import { useT } from '@/theme';
import { Press, Txt } from '@/ui/base';
import { Icon, IconName } from '@/ui/Icon';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'ホーム', icon: 'home' },
  records: { label: '記録', icon: 'bars' },
  community: { label: 'みんな', icon: 'users' },
  me: { label: 'マイページ', icon: 'user' },
};

function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const t = useT();
  useNow();
  const st = useStore((s) => s);
  const running = st.running, paused = st.paused;
  const mins = Math.floor(elapsedOf(st) / 60);
  const routes = state.routes;
  const btn = (i: number) => {
    const r = routes[i];
    const meta = TABS[r.name];
    if (!meta) return null;
    const on = state.index === i;
    return (
      <Press key={r.key} onPress={() => {
        const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
        if (!on && !e.defaultPrevented) navigation.navigate(r.name, r.params);
      }} scale={0.88} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={meta.label}
        style={{ flex: 1, alignItems: 'center', gap: 3, paddingTop: 2 }}>
        <Icon name={meta.icon} size={23} color={on ? t.ink : t.ink3} width={on ? 2 : 1.8} />
        <Txt size={10.5} w={on ? '600' : '500'} tone={on ? 'ink' : 'ink3'} lh={13}>{meta.label}</Txt>
      </Press>
    );
  };
  return (
    <View style={{ backgroundColor: t.surface, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: t.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingTop: 8, paddingBottom: Math.max(insets.bottom, 10), paddingHorizontal: 6 }}>
        {btn(0)}
        {btn(1)}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Press onPress={() => router.push('/timer')} scale={0.9} accessibilityLabel={running ? `勉強中 ${mins}分。タイマーを開く` : '勉強を始める'}
            style={{ height: 38, minWidth: 56, paddingHorizontal: running ? 12 : 0, borderRadius: 19, backgroundColor: running ? t.ink : t.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {running ? (
              <>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: paused ? t.amber : '#2EC471' }} />
                <Txt num size={14} w="600" color={t.onInk}>{mins}<Txt size={11} color={t.onInk}>分</Txt></Txt>
              </>
            ) : (
              <Icon name="play" size={19} color="#fff" />
            )}
          </Press>
        </View>
        {btn(2)}
        {btn(3)}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="records" />
      <Tabs.Screen name="community" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
