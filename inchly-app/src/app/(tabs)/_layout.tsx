import { Redirect, router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { View } from 'react-native';

import { elapsedOf, useNow, useStore } from '@/store';
import { hair, useT } from '@/theme';
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
        style={{ flex: 1, alignItems: 'center', gap: 2, paddingTop: 2 }}>
        <Icon name={meta.icon} size={21} color={on ? t.ink : t.ink3} width={on ? 1.9 : 1.6} />
        <Txt size={10} w={on ? '600' : '500'} tone={on ? 'ink' : 'ink3'} lh={12}>{meta.label}</Txt>
      </Press>
    );
  };
  return (
    <View style={{ backgroundColor: t.surface, borderTopWidth: t.dark ? hair : 0, borderTopColor: t.line, boxShadow: t.dark ? undefined : '0px -1px 0px rgba(15,23,42,0.05), 0px -8px 24px rgba(15,23,42,0.04)' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingTop: 7, paddingBottom: Math.max(insets.bottom - 6, 8), paddingHorizontal: 6 }}>
        {btn(0)}
        {btn(1)}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Press onPress={() => router.push('/timer')} scale={0.9} accessibilityLabel={running ? `勉強中 ${mins}分。タイマーを開く` : '勉強を始める'}
            hitSlop={{ top: 8, bottom: 8 }} style={{ height: 34, minWidth: 50, paddingHorizontal: running ? 11 : 0, borderRadius: 17, backgroundColor: t.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            {running ? (
              <>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: paused ? t.amber : '#22C55E' }} />
                <Txt num size={12.5} w="600" color={t.onInk}>{mins}<Txt size={10} color={t.onInk}>分</Txt></Txt>
              </>
            ) : (
              <Icon name="play" size={15} color={t.onInk} />
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
  // first launch (or after deleting the account): set up before anything else
  const signedIn = useStore((s) => !!s.account);
  if (!signedIn) return <Redirect href="/welcome" />;
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="records" />
      <Tabs.Screen name="community" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
