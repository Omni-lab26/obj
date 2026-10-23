import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { TabBarProps } from '@/themes/types';
import { useT } from '@/theme';
import { haptic, Press } from '@/ui/base';
import { tabBarBottom } from '@/ui/Chrome';
import { Gradient, M, useSvgId } from './parts';

// 方眼 tab bar: a thin outlined pill of monospaced capitals. The black pill
// behind the tab you're on jumps across in hard steps, like a cursor; the
// middle one turns into the gradient and counts the minutes while you study.

const NAMES: Record<string, string> = { index: 'HOME', timeline: 'FEED', study: 'STUDY', community: 'PEOPLE', me: 'ME' };
const H = 52; // within the tab bar's 62 (TAB_BAR_H), lifted 5 off its bottom

export function TabBar({ items, running, paused, mins, insets }: TabBarProps) {
  const t = useT();
  const id = useSvgId('tabs');
  const [w, setW] = useState(0);
  const slot = w ? (w - 10) / items.length : 0;
  const at = Math.max(0, items.findIndex((x) => x.focused));
  const x = useSharedValue(0);
  useEffect(() => { if (slot) x.set(withTiming(4 + at * slot, { duration: 200, easing: Easing.steps(4) })); }, [at, slot, x]);
  const cursor = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarBottom(insets.bottom) + 5, paddingHorizontal: 16 }}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="tablist"
        style={{ height: H, borderRadius: H / 2, borderWidth: 1, borderColor: t.ink, backgroundColor: t.canvas, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4,
          boxShadow: '0px 6px 18px rgba(16,16,22,0.10)' }}>
        {slot ? <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 4, bottom: 4, width: slot, borderRadius: (H - 8) / 2, backgroundColor: t.ink }, cursor]} /> : null}
        {items.map((it) => {
          const on = it.focused;
          const name = NAMES[it.name] ?? it.name.toUpperCase().slice(0, 6);
          if (it.center) {
            return (
              <Press key={it.key} onPress={() => { haptic.soft(); it.onPress(); }} haptics={false} react="step" scale={0.92}
                accessibilityRole="tab" accessibilityState={{ selected: on }}
                accessibilityLabel={running ? `${it.label} · 勉強中 ${mins}分` : `${it.label}（時間割・ToDo・タイマー）`}
                style={{ flex: 1, height: H - 8, alignItems: 'center', justifyContent: 'center' }}>
                {running ? (
                  <View style={{ height: 30, paddingHorizontal: 9, borderRadius: 15, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    {paused ? <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: t.ink3 }} /> : <Gradient id={id} />}
                    <View style={{ width: 5, height: 5, backgroundColor: '#fff' }} />
                    <M b size={11} lh={14} num color="#fff">{`${mins}M`}</M>
                  </View>
                ) : (
                  <View style={{ height: 30, paddingHorizontal: 9, borderRadius: 15, borderWidth: 1, borderColor: on ? t.canvas : t.ink, justifyContent: 'center' }}>
                    <M b size={10.5} lh={13} color={on ? t.canvas : t.ink}>{name}</M>
                  </View>
                )}
              </Press>
            );
          }
          return (
            <Press key={it.key} onPress={it.onPress} react="step" scale={0.9} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={it.label}
              style={{ flex: 1, height: H - 8, alignItems: 'center', justifyContent: 'center' }}>
              <M b size={10.5} lh={13} ls={0.3} color={on ? t.canvas : t.ink} numberOfLines={1}>{name}</M>
            </Press>
          );
        })}
      </View>
    </View>
  );
}
