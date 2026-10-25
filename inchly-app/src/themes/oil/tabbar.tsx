import { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { subj } from '@/data';
import { T } from '@/themes/kit';
import type { TabBarProps, TabItem } from '@/themes/types';
import { useStore } from '@/store';
import { onColor } from '@/theme';
import { haptic, Press } from '@/ui/base';
import { TAB_BAR_H, tabBarBottom } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { Dab } from './canvas';
import { shade, useOil } from './look';
import { dabPath } from './paint';

// The tab bar as the tray along the foot of the easel. The tab you're on gets
// a dab of paint put under it; the middle is a fat dab of its own — the
// accent to start, the subject's color with the minutes while you study.

export function TabBar({ items, running, paused, mins, insets }: TabBarProps) {
  const { v } = useOil();
  const labels = useWindowDimensions().width >= 360;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarBottom(insets.bottom), paddingHorizontal: 14 }}>
      <View accessibilityRole="tablist" style={{ height: TAB_BAR_H, borderRadius: 16, backgroundColor: v.tray, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6,
        borderTopWidth: 2, borderTopColor: shade(v.tray, 0.24), boxShadow: '0px 6px 18px rgba(0,0,0,0.28), 0px 1px 2px rgba(0,0,0,0.3)' }}>
        {items.map((it) => (it.center ? <Middle key={it.key} it={it} running={running} paused={paused} mins={mins} /> : <Tab key={it.key} it={it} labels={labels} />))}
      </View>
    </View>
  );
}

function Tab({ it, labels }: { it: TabItem; labels: boolean }) {
  const { v } = useOil();
  const s = useSharedValue(it.focused ? 1 : 0);
  useEffect(() => { s.set(withSpring(it.focused ? 1 : 0, { duration: 420, dampingRatio: 0.55 })); }, [it.focused, s]);
  // the dab is put down with a twist of the brush
  const a = useAnimatedStyle(() => ({ opacity: Math.min(1, s.value * 1.5), transform: [{ scale: 0.35 + 0.65 * s.value }, { rotate: `${(1 - s.value) * -30}deg` }] }));
  const ink = it.focused ? v.onAccent : v.trayInk2;
  return (
    <Press onPress={it.onPress} scale={0.9} accessibilityRole="tab" accessibilityState={{ selected: it.focused }} accessibilityLabel={it.label}
      style={{ flex: 1, height: TAB_BAR_H - 10, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute' }, a]}><Dab size={labels ? 46 : 40} color={v.accent} seed={`tab${it.name}`} /></Animated.View>
      <View style={{ zIndex: 1, alignItems: 'center', gap: 1 }}>
        <Icon name={it.icon} size={labels ? 20 : 22} color={ink} filled={it.focused} width={it.focused ? 1.9 : 1.6} />
        {labels ? <T size={8.5} lh={11} color={ink} numberOfLines={1}>{it.label}</T> : null}
      </View>
    </Press>
  );
}

function Middle({ it, running, paused, mins }: { it: TabItem; running: boolean; paused: boolean; mins: number }) {
  const { v } = useOil();
  const sc = useStore((s) => subj(s.subj).c);
  const color = running ? (paused ? v.tray : sc) : v.accent;
  const ink = running ? (paused ? v.trayInk : onColor(sc)) : v.onAccent;
  const d = useMemo(() => dabPath(29, 26, 23, 'middle'), []);
  return (
    <View style={{ flex: 1.2, alignItems: 'center' }}>
      <Press onPress={() => { haptic.soft(); it.onPress(); }} haptics={false} react="squish" scale={0.88} hitSlop={{ top: 8, bottom: 8 }}
        accessibilityRole="tab" accessibilityState={{ selected: it.focused }}
        accessibilityLabel={running ? `${it.label} · 勉強中 ${mins}分` : `${it.label}（時間割・ToDo・タイマー）`}
        style={{ width: 58, height: 52, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={58} height={52} style={StyleSheet.absoluteFill}>
          <Path d={d} fill={color} stroke={paused ? v.trayInk2 : 'none'} strokeWidth={1.5} strokeDasharray={paused ? '3 3' : undefined} />
        </Svg>
        <View style={{ zIndex: 1, alignItems: 'center' }}>
          {running ? (
            <T size={16} lh={20} num color={ink}>{mins}<T size={10} lh={20} color={ink}>分</T></T>
          ) : (
            <Icon name="clock" size={18} color={ink} />
          )}
        </View>
        {it.focused ? <View style={{ position: 'absolute', bottom: -3, width: 14, height: 2, borderRadius: 1, backgroundColor: v.trayInk }} /> : null}
      </Press>
    </View>
  );
}
