import { useEffect } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { T } from '@/themes/kit';
import type { TabBarProps, TabItem } from '@/themes/types';
import { useT } from '@/theme';
import { haptic, Press } from '@/ui/base';
import { TAB_BAR_H, tabBarBottom } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { micro } from '@/ui/motion';
import { alpha } from './look';
import { R, Shape, useV } from './parts';

// A soft white pill with a pastel edge. The tab you're on gets a pale blob
// that fades in; the middle is a round candy button — a heart beside the
// minutes while you study. Nothing boings or wiggles (MOTION.md).

function Tab({ it, labels }: { it: TabItem; labels: boolean }) {
  const t = useT();
  const v = useV();
  const s = useSharedValue(it.focused ? 1 : 0);
  useEffect(() => { s.set(micro(it.focused ? 1 : 0)); }, [it.focused, s]);
  const blob = useAnimatedStyle(() => ({ opacity: s.value, transform: [{ scale: 0.98 + 0.02 * s.value }] }));
  const press = () => {
    haptic.tap();
    it.onPress();
  };
  return (
    <Pressable onPress={press} accessibilityRole="tab" accessibilityState={{ selected: it.focused }} accessibilityLabel={it.label}
      style={{ flex: 1, height: TAB_BAR_H - 8, alignItems: 'center', justifyContent: 'center', gap: 1 }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: labels ? 54 : 46, height: labels ? 46 : 40, borderRadius: 23, backgroundColor: v.soft }, blob]} />
      {/* above the blob (on the web a positioned blob would otherwise cover it) */}
      <View style={{ zIndex: 1 }}>
        <Icon name={it.icon} size={21} color={it.focused ? v.deep : t.ink3} filled={it.focused} width={2} />
      </View>
      {labels ? <T size={9.5} w="800" lh={12} color={it.focused ? v.deep : t.ink3} numberOfLines={1} style={{ zIndex: 1, maxWidth: '96%' }}>{it.label}</T> : null}
    </Pressable>
  );
}

function Center({ it, running, paused, mins }: { it: TabItem; running: boolean; paused: boolean; mins: number }) {
  const t = useT();
  const v = useV();
  return (
    <View style={{ flex: 1.2, alignItems: 'center' }}>
      <Press onPress={() => { haptic.soft(); it.onPress(); }} haptics={false} scale={0.9} hitSlop={{ top: 6, bottom: 6 }}
        accessibilityRole="tab" accessibilityState={{ selected: it.focused }}
        accessibilityLabel={running ? `${it.label} · 勉強中 ${mins}分` : `${it.label}（時間割・ToDo・タイマー）`}
        style={{ height: 48, minWidth: 48, paddingHorizontal: running ? 12 : 0, borderRadius: 24, backgroundColor: v.deep, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
          boxShadow: `0px 0px 0px 3px ${t.surface}, 0px 0px 0px 5px ${alpha(v.accent, it.focused ? 0.75 : 0.4)}` }}>
        {running ? (
          <>
            <Shape kind="heart" size={13} fill={paused ? v.sun : '#FFFFFF'} />
            <R size={17} lh={20} num color="#FFFFFF">{mins}</R>
            <T size={10} w="800" lh={13} color="#FFFFFF">分</T>
          </>
        ) : (
          <Icon name="clock" size={18} color="#FFFFFF" />
        )}
      </Press>
    </View>
  );
}

export function TabBar({ items, running, paused, mins, insets }: TabBarProps) {
  const t = useT();
  const v = useV();
  const labels = useWindowDimensions().width >= 360;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarBottom(insets.bottom), paddingHorizontal: 14 }}>
      <View accessibilityRole="tablist" style={{ height: TAB_BAR_H, borderRadius: TAB_BAR_H / 2, backgroundColor: t.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6,
        boxShadow: `0px 0px 0px 2px ${alpha(v.accent, 0.4)}, 0px 4px 0px 0px ${alpha(v.accent, 0.22)}, 0px 10px 24px ${alpha(v.deep, 0.14)}` }}>
        {items.map((it) => (it.center
          ? <Center key={it.key} it={it} running={running} paused={paused} mins={mins} />
          : <Tab key={it.key} it={it} labels={labels} />))}
      </View>
    </View>
  );
}
