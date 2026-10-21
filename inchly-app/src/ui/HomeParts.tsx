import { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';

import { subj } from '@/data';
import { Todo } from '@/store';
import { ease, hair, useT } from '@/theme';
import { haptic, Txt } from '@/ui/base';
import { Icon } from '@/ui/Icon';

// Checklist row: the box fills, the tick draws in, and a line strikes across
// the text (bencho "checklist"), sized to the text rather than the row.
export function TodoRow({ todo, onToggle, onEdit, first }: { todo: Todo; onToggle: () => void; onEdit?: () => void; first: boolean }) {
  const t = useT();
  const p = useSharedValue(todo.d ? 1 : 0);
  const [tw, setTw] = useState(0);
  useEffect(() => { p.value = withTiming(todo.d ? 1 : 0, { duration: 320, easing: ease.out }); }, [todo.d, p]);
  const box = useAnimatedStyle(() => ({ backgroundColor: p.value > 0.5 ? t.green : 'transparent', borderWidth: p.value > 0.5 ? 0 : 1.25, transform: [{ scale: 0.9 + 0.1 * Math.min(1, p.value * 1.4) }] }));
  const tick = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.4 + 0.6 * p.value }] }));
  const strike = useAnimatedStyle(() => ({ width: tw * p.value }));
  const sj = subj(todo.s);
  return (
    <Pressable onPress={() => { haptic.soft(); onToggle(); }} onLongPress={onEdit} accessibilityRole="checkbox" accessibilityState={{ checked: todo.d }} accessibilityLabel={todo.t}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14 }}>
      {first ? null : <View style={{ position: 'absolute', top: 0, left: 42, right: 0, height: hair, backgroundColor: t.line }} />}
      <Animated.View style={[{ width: 18, height: 18, borderRadius: 9, borderColor: t.ink3, alignItems: 'center', justifyContent: 'center' }, box]}>
        <Animated.View style={tick}><Icon name="check" size={12} color="#fff" width={3} /></Animated.View>
      </Animated.View>
      <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
        <View onLayout={(e: LayoutChangeEvent) => setTw(e.nativeEvent.layout.width)}>
          <Txt size={13.5} tone={todo.d ? 'ink3' : 'ink'} numberOfLines={1}>{todo.t}</Txt>
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: '52%', height: 1, backgroundColor: t.ink3 }, strike]} />
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: sj.c }} />
          <Txt size={11} tone="ink3">{sj.name}</Txt>
        </View>
        {todo.carried && !todo.d ? <Txt size={10.5} w="600" tone="amber" lh={13}>{`${todo.carried}日前から`}</Txt> : null}
      </View>
      {onEdit ? (
        <Pressable onPress={onEdit} hitSlop={{ top: 12, bottom: 12, left: 6, right: 10 }} accessibilityRole="button" accessibilityLabel={`${todo.t} を編集`}
          style={({ pressed }) => ({ width: 22, height: 22, marginRight: -4, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}>
          <Icon name="more" size={15} color={t.ink3} />
        </Pressable>
      ) : null}
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
        borderWidth: ticket ? hair : today ? 1.5 : 0, borderColor: ticket ? t.line2 : t.ink }, a]}>
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
    <View style={{ flexDirection: 'row', gap: 2, width: 56 }}>
      {Array.from({ length: total }, (_, i) => <View key={i} style={{ flex: 1, height: 3, borderRadius: 1.5, backgroundColor: i < done ? t.ink : t.sunken }} />)}
    </View>
  );
}

/** A date like the Calendar app's icon: month in red, day in ink. */
export function DateTile({ mo, d, size = 34 }: { mo: number; d: number; size?: number }) {
  const t = useT();
  return (
    <View style={{ width: size, height: size + 2, borderRadius: 8, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line2, alignItems: 'center', overflow: 'hidden' }}>
      <View style={{ alignSelf: 'stretch', alignItems: 'center', backgroundColor: t.red }}>
        <Txt size={8.5} w="700" lh={11} color="#fff">{`${mo}月`}</Txt>
      </View>
      <Txt num size={15} w="600" lh={21}>{d}</Txt>
    </View>
  );
}
