import { router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { elapsedOf, useNow, useStore } from '@/store';
import { useT } from '@/theme';
import { haptic, Press, Txt } from '@/ui/base';
import { Glass } from '@/ui/Glass';
import { Icon, IconName } from '@/ui/Icon';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: '今日', icon: 'home' },
  records: { label: '記録', icon: 'bars' },
  community: { label: 'みんな', icon: 'users' },
  me: { label: 'マイページ', icon: 'user' },
};

// iOS 26 tab bar: a floating glass capsule over the content, the selected tab
// sitting in a lighter lens that slides between items. The timer is its own
// glass button beside it (where Music keeps search): tinted when idle, showing
// the running minutes while you study.
function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const t = useT();
  useNow();
  const st = useStore((s) => s);
  const running = st.running, paused = st.paused;
  const mins = Math.floor(elapsedOf(st) / 60);
  const [w, setW] = useState(0);
  const item = w ? (w - 8) / 4 : 0;
  const x = useSharedValue(0);
  useEffect(() => { if (item) x.set(withSpring(4 + state.index * item, { duration: 420, dampingRatio: 0.78 })); }, [state.index, item, x]);
  const lens = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom - 8, 10), flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 }}>
      <Glass style={{ flex: 1, height: 64 }}>
        <View style={{ flex: 1, flexDirection: 'row', paddingHorizontal: 4, alignItems: 'center' }} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="tablist">
          {item ? <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 4, bottom: 4, width: item, borderRadius: 28, backgroundColor: 'rgba(118,118,128,0.14)' }, lens]} /> : null}
          {state.routes.map((r, i) => {
            const meta = TABS[r.name];
            if (!meta) return null;
            const on = state.index === i;
            return (
              <Press key={r.key} scale={0.9} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={meta.label}
                onPress={() => {
                  const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
                  if (!on && !e.defaultPrevented) navigation.navigate(r.name, r.params);
                }}
                style={{ flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <Icon name={meta.icon} size={23} color={on ? t.tint : t.ink} filled={on} width={1.7} />
                <Txt size={10} w={on ? '600' : '500'} lh={12} color={on ? t.tint : t.ink}>{meta.label}</Txt>
              </Press>
            );
          })}
        </View>
      </Glass>
      <Press onPress={() => { haptic.soft(); router.push('/timer'); }} haptics={false} scale={0.9}
        accessibilityLabel={running ? `勉強中 ${mins}分。タイマーを開く` : 'タイマーを開いて勉強を始める'}>
        <Glass interactive tint={running ? undefined : 'rgba(42,160,90,0.92)'} style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
          {running ? (
            <View style={{ alignItems: 'center' }}>
              <Txt num size={19} w="600" lh={22} color={paused ? t.amber : t.tint}>{mins}</Txt>
              <Txt size={9.5} w="600" lh={11} color={paused ? t.amber : t.tint}>{paused ? '停止中' : '分'}</Txt>
            </View>
          ) : (
            <Icon name="play" size={22} color="#fff" />
          )}
        </Glass>
      </Press>
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
