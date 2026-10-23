import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { T } from '@/themes/kit';
import type { TabBarProps, TabItem } from '@/themes/types';
import { haptic, Press } from '@/ui/base';
import { TAB_BAR_H, tabBarBottom } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { INK } from './paint';
import { Splat } from './parts';

// インク's tab bar: a black sticker strip with a white edge. The tab you're
// on sits on a fresh pink splat that lands with a wobble; the middle is a
// yellow splat that shows the minutes while you study.

const H = TAB_BAR_H; // the room every screen leaves (Chrome.tsx)

function Tab({ it }: { it: TabItem }) {
  const s = useSharedValue(it.focused ? 1 : 0);
  useEffect(() => {
    s.set(it.focused ? withSequence(withTiming(1.25, { duration: 110 }), withSpring(1, { duration: 520, dampingRatio: 0.35 })) : withTiming(0, { duration: 140 }));
  }, [it.focused, s]);
  const a = useAnimatedStyle(() => ({ opacity: Math.min(1, s.value), transform: [{ scaleX: s.value }, { scaleY: s.value > 1 ? 2 - s.value : s.value }] }));
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
  const breath = useSharedValue(1);
  const live = running && !paused;
  useEffect(() => {
    breath.set(live ? withRepeat(withSequence(withTiming(1.07, { duration: 900 }), withTiming(1, { duration: 900 })), -1) : withTiming(1));
  }, [live, breath]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }, { rotate: '-6deg' }] }));
  return (
    <View style={{ flex: 1.15, alignItems: 'center' }}>
      <Press onPress={() => { haptic.soft(); it.onPress(); }} haptics={false} scale={0.86} hitSlop={{ top: 8, bottom: 8 }}
        accessibilityRole="tab" accessibilityState={{ selected: it.focused }}
        accessibilityLabel={running ? `${it.label} · 勉強中 ${mins}分` : `${it.label}（時間割・ToDo・タイマー）`}
        style={{ width: 64, height: H - 6, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute' }, a]}>
          <Splat size={84} color={paused ? '#BDBDBD' : INK.yellow} seed="center" drops={4} />
        </Animated.View>
        {running ? (
          <View style={{ alignItems: 'center' }}>
            <T f="heavy" size={mins >= 100 ? 15 : 18} lh={21} color={INK.black} num>{mins}</T>
            <T size={9} w="800" lh={11} color={INK.black}>{paused ? '一時停止' : '分'}</T>
          </View>
        ) : (
          <View><Icon name="play" size={20} color={INK.black} /></View>
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
