import { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';

import { subj } from '@/data';
import { Todo } from '@/store';
import { ease, useT } from '@/theme';
import { dot, haptic, Txt } from '@/ui/base';
import { Icon } from '@/ui/Icon';

// Checklist row: the box fills, the tick draws in, and a line strikes across
// the text (bencho "checklist"), sized to the text rather than the row.
export function TodoRow({ todo, onToggle, first }: { todo: Todo; onToggle: () => void; first: boolean }) {
  const t = useT();
  const p = useSharedValue(todo.d ? 1 : 0);
  const [tw, setTw] = useState(0);
  useEffect(() => { p.value = withTiming(todo.d ? 1 : 0, { duration: 320, easing: ease.out }); }, [todo.d, p]);
  const box = useAnimatedStyle(() => ({ backgroundColor: p.value > 0.5 ? t.green : 'transparent', borderWidth: p.value > 0.5 ? 0 : 1.6, transform: [{ scale: 0.9 + 0.1 * Math.min(1, p.value * 1.4) }] }));
  const tick = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.4 + 0.6 * p.value }] }));
  const strike = useAnimatedStyle(() => ({ width: tw * p.value }));
  const sj = subj(todo.s);
  return (
    <Pressable onPress={() => { haptic.soft(); onToggle(); }} accessibilityRole="checkbox" accessibilityState={{ checked: todo.d }} accessibilityLabel={todo.t}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth * 2, borderTopColor: t.line }}>
      <Animated.View style={[{ width: 22, height: 22, borderRadius: 6, borderColor: t.line2, alignItems: 'center', justifyContent: 'center' }, box]}>
        <Animated.View style={tick}><Icon name="check" size={15} color="#fff" width={3} /></Animated.View>
      </Animated.View>
      <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
        <View onLayout={(e: LayoutChangeEvent) => setTw(e.nativeEvent.layout.width)}>
          <Txt size={15} tone={todo.d ? 'ink3' : 'ink'} numberOfLines={1}>{todo.t}</Txt>
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: '52%', height: 1.5, backgroundColor: t.ink3 }, strike]} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        {dot(sj.c)}
        <Txt size={12} tone="ink3">{sj.name}</Txt>
      </View>
    </Pressable>
  );
}

// One day tile in the week strip. A rest-ticket day is hatched instead of filled.
export function DayTile({ level, ticket, label, today, index }: { level: number; ticket?: boolean; label: string; today?: boolean; index: number }) {
  const t = useT();
  const s = useSharedValue(0.6);
  const o = useSharedValue(0);
  useEffect(() => {
    s.value = withDelay(index * 40, withTiming(1, { duration: 420, easing: ease.spring }));
    o.value = withDelay(index * 40, withTiming(1, { duration: 260 }));
  }, [index, s, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 5 }}>
      <Animated.View style={[{ width: '100%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: ticket ? 'transparent' : t.grass[level],
        borderWidth: ticket ? StyleSheet.hairlineWidth * 2 : today ? 1.5 : 0, borderColor: ticket ? t.line2 : t.ink }, a]}>
        {ticket ? (
          <Svg width="100%" height="100%">
            <Defs>
              <Pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                <Line x1="0" y1="0" x2="0" y2="8" stroke={t.grass[0]} strokeWidth="8" />
              </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#hatch)" />
          </Svg>
        ) : null}
      </Animated.View>
      <Txt size={11} w={today ? '700' : '400'} tone={today ? 'ink' : 'ink3'} lh={14}>{label}</Txt>
    </View>
  );
}

export function MiniSeg({ done, total }: { done: number; total: number }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', gap: 2, marginTop: 6, width: 140 }}>
      {Array.from({ length: total }, (_, i) => <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < done ? t.ink2 : t.grass[0] }} />)}
    </View>
  );
}
