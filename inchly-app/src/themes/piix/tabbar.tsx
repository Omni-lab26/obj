import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { T } from '@/themes/kit';
import type { TabBarProps, TabItem } from '@/themes/types';
import { haptic } from '@/ui/base';
import { TAB_BAR_H, tabBarBottom } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { P, sit } from './look';
import { Key, STEPS } from './pixel';

// A paper bar sitting on its shadow. The tab you're on gets a lime block that
// pops in, in steps; the middle is a key of its own — lime to start, dark with
// the minutes while you study.

function Tab({ it }: { it: TabItem }) {
  const s = useSharedValue(it.focused ? 1 : 0);
  useEffect(() => { s.set(withTiming(it.focused ? 1 : 0, { duration: 150, easing: STEPS })); }, [it.focused, s]);
  const a = useAnimatedStyle(() => ({ opacity: s.value, transform: [{ scale: 0.5 + 0.5 * s.value }] }));
  return (
    <Pressable onPress={() => { haptic.tap(); it.onPress(); }} accessibilityRole="tab" accessibilityState={{ selected: it.focused }} accessibilityLabel={it.label}
      style={{ flex: 1, height: TAB_BAR_H - 8, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: 46, height: 40, borderRadius: 12, backgroundColor: P.lime, borderWidth: 2, borderColor: P.ink }, a]} />
      {/* above the block (on the web a positioned block would otherwise cover it) */}
      <View style={{ zIndex: 1 }}>
        <Icon name={it.icon} size={22} color={P.ink} filled={it.focused} width={it.focused ? 2.2 : 1.8} />
      </View>
    </Pressable>
  );
}

export function TabBar({ items, running, paused, mins, insets }: TabBarProps) {
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarBottom(insets.bottom), paddingHorizontal: 14 }}>
      <View accessibilityRole="tablist" style={{ height: TAB_BAR_H, borderRadius: 20, backgroundColor: P.card, boxShadow: sit(4), flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 }}>
        {items.map((it) => it.center ? (
          <View key={it.key} style={{ flex: 1.25, alignItems: 'center' }}>
            <Key label={running ? `${it.label} · 勉強中 ${mins}分` : `${it.label}（時間割・ToDo・タイマー）`} role="tab" selected={it.focused} onPress={it.onPress} feel="soft"
              color={running ? P.night : P.lime} depth={4} radius={14} style={{ minWidth: 58 }} face={{ height: 42, paddingHorizontal: running ? 11 : 0, flexDirection: 'row', gap: 6 }}>
              {running ? (
                <>
                  <View style={{ width: 7, height: 7, backgroundColor: paused ? P.sun : P.lime }} />
                  <T f="groteskBold" size={17} lh={20} num color={P.paper}>{mins}</T>
                  <T size={10} lh={13} w="700" color={P.paper}>分</T>
                </>
              ) : (
                <Icon name="clock" size={17} color={P.ink} />
              )}
            </Key>
          </View>
        ) : <Tab key={it.key} it={it} />)}
      </View>
    </View>
  );
}
