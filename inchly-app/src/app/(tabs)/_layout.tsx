import { router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { View } from 'react-native';

import { elapsedOf, useNow, useStore } from '@/store';
import { useT } from '@/theme';
import { Avatar, Press, Txt } from '@/ui/base';
import { Glass } from '@/ui/Glass';
import { Icon, IconName } from '@/ui/Icon';

const TABS: Record<string, { label: string; icon: IconName | 'me' }> = {
  index: { label: 'ホーム', icon: 'home' },
  records: { label: '記録', icon: 'bars' },
  community: { label: 'みんな', icon: 'users' },
  me: { label: 'マイページ', icon: 'me' },
};

// Instagram's tab bar — icons only, the profile tab is your own photo — on a
// floating glass capsule. The middle slot is the timer: a dark pill that
// shows the running minutes with a live dot while you study.
function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const t = useT();
  useNow();
  const st = useStore((s) => s);
  const running = st.running, paused = st.paused;
  const mins = Math.floor(elapsedOf(st) / 60);
  const btn = (i: number) => {
    const r = state.routes[i];
    const meta = TABS[r.name];
    if (!meta) return null;
    const on = state.index === i;
    return (
      <Press key={r.key} scale={0.86} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={meta.label}
        onPress={() => {
          const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
          if (!on && !e.defaultPrevented) navigation.navigate(r.name, r.params);
        }}
        style={{ flex: 1, height: 52, alignItems: 'center', justifyContent: 'center' }}>
        {meta.icon === 'me' ? (
          <View style={{ padding: 1.5, borderRadius: 16, borderWidth: on ? 1.6 : 0, borderColor: t.ink }}>
            <Avatar name="はる" color="#6E56CF" size={on ? 24 : 26} />
          </View>
        ) : (
          <Icon name={meta.icon} size={25} color={t.ink} filled={on} width={on ? 2.1 : 1.7} />
        )}
      </Press>
    );
  };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 14, right: 14, bottom: Math.max(insets.bottom - 10, 10) }}>
      <Glass radius={30} style={{ height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 }}>
        {btn(0)}
        {btn(1)}
        <View style={{ flex: 1.2, alignItems: 'center' }}>
          <Press onPress={() => router.push('/timer')} scale={0.9} hitSlop={{ top: 8, bottom: 8 }} accessibilityLabel={running ? `勉強中 ${mins}分。タイマーを開く` : '勉強を始める'}
            style={{ height: 38, minWidth: 54, paddingHorizontal: running ? 12 : 0, borderRadius: 19, backgroundColor: t.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {running ? (
              <>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: paused ? t.amber : '#2FD07A' }} />
                <Txt num size={13} w="600" color={t.onInk}>{mins}<Txt size={10} color={t.onInk}>分</Txt></Txt>
              </>
            ) : (
              <Icon name="play" size={16} color={t.onInk} />
            )}
          </Press>
        </View>
        {btn(2)}
        {btn(3)}
      </Glass>
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
