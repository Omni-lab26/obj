import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { T } from '@/themes/kit';
import type { TabBarProps, TabItem } from '@/themes/types';
import { haptic, Press } from '@/ui/base';
import { TAB_BAR_H, tabBarBottom } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { micro } from '@/ui/motion';
import { INK } from './paint';
import { Splat } from './parts';

// インク's tab bar: a black sticker strip with a white edge. The tab you're
// on sits on a fresh pink splat that fades in (no wobble: MOTION.md); the
// middle is a yellow splat that shows the minutes while you study.

const H = TAB_BAR_H; // the room every screen leaves (Chrome.tsx)

function Tab({ it }: { it: TabItem }) {
  const s = useSharedValue(it.focused ? 1 : 0);
  useEffect(() => {
    s.set(micro(it.focused ? 1 : 0));
  }, [it.focused, s]);
  const a = useAnimatedStyle(() => ({ opacity: s.value, transform: [{ scale: 0.98 + 0.02 * s.value }] }));
  return (
    <Press onPress={it.onPress} scale={0.86} accessibilityRole="tab" accessibilityState={{ selected: it.focused }} accessibilityLabel={it.label}
      style={{ flex: 1, height: H - 8, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute' }, a]}>
        <Splat size={58} color={INK.pink} seed={`tab${it.name}`} drops={3} />
      </Animated.View>
      <View><Icon name={it.icon} size={23} color={it.focused ? INK.white : '#9C9C9C'} filled={it.focused} width={it.focused ? 2.1 : 1.8} /></View>
    </Press>
  );
}

function Center({ it, running, paused, mins }: { it: TabItem; running: boolean; paused: boolean; mins: number }) {
  return (
    <View style={{ flex: 1.15, alignItems: 'center' }}>
      <Press onPress={() => { haptic.soft(); it.onPress(); }} haptics={false} scale={0.86} hitSlop={{ top: 8, bottom: 8 }}
        accessibilityRole="tab" accessibilityState={{ selected: it.focused }}
        accessibilityLabel={running ? `${it.label} · 勉強中 ${mins}分` : `${it.label}（時間割・ToDo・タイマー）`}
        style={{ width: 64, height: H - 6, alignItems: 'center', justifyContent: 'center' }}>
        <View pointerEvents="none" style={{ position: 'absolute', transform: [{ rotate: '-6deg' }] }}>
          <Splat size={84} color={paused ? '#BDBDBD' : INK.yellow} seed="center" drops={4} />
        </View>
        {running ? (
          <View style={{ alignItems: 'center' }}>
            <T f="heavy" size={mins >= 100 ? 15 : 18} lh={21} color={INK.black} num>{mins}</T>
            <T size={9} w="800" lh={11} color={INK.black}>{paused ? '一時停止' : '分'}</T>
          </View>
        ) : (
          <View><Icon name="clock" size={20} color={INK.black} /></View>
        )}
      </Press>
    </View>
  );
}

export function TabBar({ items, running, paused, mins, insets }: TabBarProps) {
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarBottom(insets.bottom), paddingHorizontal: 14 }}>
      <View accessibilityRole="tablist"
        style={{ height: H, borderRadius: H / 2, backgroundColor: INK.black, borderWidth: 2.5, borderColor: INK.white, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, boxShadow: '3px 5px 0px rgba(0,0,0,0.55)', overflow: 'hidden' }}>
        {items.map((it) => (it.center ? <Center key={it.key} it={it} running={running} paused={paused} mins={mins} /> : <Tab key={it.key} it={it} />))}
      </View>
    </View>
  );
}
