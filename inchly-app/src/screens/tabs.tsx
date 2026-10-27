import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, useAnimatedReaction, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { TABS } from '@/screens/layout';
import { designReveal } from '@/screens/reveal';
import { CRIMSON, NEON, StandardStudyBar } from '@/screens/StudyBar';
import { useThemeKit } from '@/themes';
import type { TabBarProps, TabItem } from '@/themes/types';
import { elapsedOf, useNow, useStore } from '@/store';
import { useT } from '@/theme';
import { Press } from '@/ui/base';
import { showStudyBar, TAB_BAR_H, tabBarBottom, useStudyBarShown } from '@/ui/Chrome';
import { replayCharts } from '@/ui/appear';
import { Glass } from '@/ui/Glass';
import { Icon } from '@/ui/Icon';

/** The tabs (layout.TABS) as the navigator has them, each with what a tap does. The middle one ('study') opens the timer when tapped again while studying. */
export function useTabItems({ state, navigation }: BottomTabBarProps): TabItem[] {
  const running = useStore((s) => s.running);
  return TABS.flatMap((tab) => {
    const i = state.routes.findIndex((r) => r.name === tab.name);
    const r = state.routes[i];
    if (!r) return [];
    const focused = state.index === i;
    const center = tab.name === 'study';
    const onPress = () => {
      if (center && focused && running) { router.push('/timer'); return; }
      const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
      if (!focused && !e.defaultPrevented) navigation.navigate(r.name, r.params);
    };
    return [{ key: r.key, name: tab.name, label: tab.label, icon: tab.icon, focused, center, onPress }];
  });
}

/** The navigator's tab bar (the theme's own, or the standard one), with the study bar on top once you start (swipe it down to put it away). Both step aside while the デザイン page slides in over home. */
export function TabBar(p: BottomTabBarProps) {
  const items = useTabItems(p);
  const kit = useThemeKit();
  const Bar = kit.TabBar ?? StandardTabBar;
  const StudyBar = kit.StudyBar ?? StandardStudyBar;
  // the tab bar itself only needs the minutes (for the clock's spoken label), so it ticks once a minute
  const now = useNow(60_000);
  const running = useStore((s) => s.running);
  const paused = useStore((s) => s.paused);
  const mins = useStore((s) => (s.running ? Math.floor(elapsedOf(s, now) / 60) : 0));
  const barUp = useStudyBarShown();
  // a new session brings the bar back, even if the last one was swiped away
  useEffect(() => { if (running) showStudyBar(); }, [running]);
  // another tab came into view: its charts play their entrance again
  useEffect(() => { replayCharts(); }, [p.state.index]);
  const [away, setAway] = useState(false);
  useAnimatedReaction(() => designReveal.value > 0.02, (now, before) => { if (now !== before) scheduleOnRN(setAway, now); });
  const aside = useAnimatedStyle(() => ({ opacity: 1 - designReveal.value, transform: [{ translateY: designReveal.value * 24 }] }));
  return (
    <Animated.View pointerEvents={away ? 'none' : 'box-none'} style={[StyleSheet.absoluteFill, aside]}>
      {barUp ? (
        <Animated.View pointerEvents="box-none" entering={FadeInDown.duration(260)} exiting={FadeOutDown.duration(180)} style={StyleSheet.absoluteFill}>
          <StudyBar insets={p.insets} />
        </Animated.View>
      ) : null}
      <Bar items={items} running={running} paused={paused} mins={mins} insets={p.insets} />
    </Animated.View>
  );
}

// A floating Liquid Glass capsule over the content, icons only, all alike.
// The selected tab sits in a lighter lens that slides between items; while
// studying, the middle one's clock wears a small live dot (the time itself is
// on the study bar above).
export function StandardTabBar({ items, running, paused, mins, insets }: TabBarProps) {
  const t = useT();
  const [w, setW] = useState(0);
  const item = w ? (w - 8) / items.length : 0;
  const slot = Math.max(0, items.findIndex((x) => x.focused));
  const x = useSharedValue(0);
  useEffect(() => { if (item) x.set(withSpring(4 + slot * item, { duration: 420, dampingRatio: 0.78 })); }, [slot, item, x]);
  const lens = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarBottom(insets.bottom), paddingHorizontal: 20 }}>
      <Glass soft style={{ height: TAB_BAR_H }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="tablist">
          {item ? <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 4, bottom: 4, width: item, borderRadius: 28, backgroundColor: 'rgba(118,118,128,0.14)' }, lens]} /> : null}
          {items.map((it) => (
            <Press key={it.key} scale={0.86} accessibilityRole="tab" accessibilityState={{ selected: it.focused }} onPress={it.onPress}
              accessibilityLabel={it.center ? (running ? `${it.label} · 勉強中 ${mins}分` : `${it.label}（時間割・ToDo・タイマー）`) : it.label}
              style={{ flex: 1, height: TAB_BAR_H - 8, alignItems: 'center', justifyContent: 'center' }}>
              <View>
                <Icon name={it.icon} size={25} color={it.focused ? t.ink : t.ink2} filled={it.focused} width={it.focused ? 1.9 : 1.6} />
                {/* the middle tab while studying, seen from another tab: a fluorescent green dot on the clock (crimson when paused) */}
                {it.center && running && !it.focused ? (
                  <View style={{ position: 'absolute', top: -2, right: -3, width: 9, height: 9, borderRadius: 5, backgroundColor: paused ? CRIMSON : NEON, borderWidth: 1.5, borderColor: t.surface }} />
                ) : null}
              </View>
            </Press>
          ))}
        </View>
      </Glass>
    </View>
  );
}
