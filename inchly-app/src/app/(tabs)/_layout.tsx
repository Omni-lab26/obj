import { router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';

import { useStore } from '@/store';
import { useT } from '@/theme';
import { Press, Txt } from '@/ui/base';
import { Icon, IconName } from '@/ui/Icon';
import { MiniPlayer } from '@/ui/MiniPlayer';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'ホーム', icon: 'home' },
  records: { label: '記録', icon: 'bars' },
  community: { label: 'みんな', icon: 'users' },
  me: { label: 'マイページ', icon: 'user' },
};

function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const t = useT();
  const running = useStore((s) => s.running);
  const routes = state.routes;
  const btn = (i: number) => {
    const r = routes[i];
    const meta = TABS[r.name];
    if (!meta) return null;
    const on = state.index === i;
    return (
      <Press key={r.key} onPress={() => navigateToTab(r.key)} scale={0.88} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={meta.label}
        style={{ flex: 1, alignItems: 'center', gap: 3, paddingTop: 2 }}>
        <Icon name={meta.icon} size={23} color={on ? t.ink : t.ink3} width={on ? 2 : 1.8} />
        <Txt size={10.5} w={on ? '600' : '500'} tone={on ? 'ink' : 'ink3'} lh={13}>{meta.label}</Txt>
      </Press>
    );
  };
  return (
    <View style={{ backgroundColor: t.surface, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: t.line }}>
      <MiniPlayer />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingTop: 8, paddingBottom: Math.max(insets.bottom, 10), paddingHorizontal: 6 }}>
        {btn(0)}
        {btn(1)}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Press onPress={() => router.push('/timer')} scale={0.9} accessibilityLabel={running ? '勉強中の画面を開く' : '勉強を始める'}
            style={{ width: 54, height: 38, borderRadius: 13, backgroundColor: running ? t.ink : t.green, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={running ? 'stop' : 'play'} size={20} color={running ? t.onInk : '#fff'} />
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
