import { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { subj } from '@/data';
import { Todo } from '@/store';
import { ease, hair, useT } from '@/theme';
import { haptic, Txt } from '@/ui/base';
import { Icon } from '@/ui/Icon';

// Reminders-style row: a ring that fills with the tint, a tick drawn in, and
// the title struck through (bencho "checklist"). The subject sits underneath
// in grey; a task that has slid from earlier days says so in orange.
export function TodoRow({ todo, onToggle, first }: { todo: Todo; onToggle: () => void; first: boolean }) {
  const t = useT();
  const p = useSharedValue(todo.d ? 1 : 0);
  const [tw, setTw] = useState(0);
  useEffect(() => { p.value = withTiming(todo.d ? 1 : 0, { duration: 320, easing: ease.out }); }, [todo.d, p]);
  const box = useAnimatedStyle(() => ({ backgroundColor: p.value > 0.5 ? t.tint : 'transparent', borderWidth: p.value > 0.5 ? 0 : 1.5, transform: [{ scale: 0.9 + 0.1 * Math.min(1, p.value * 1.4) }] }));
  const tick = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.4 + 0.6 * p.value }] }));
  const strike = useAnimatedStyle(() => ({ width: tw * p.value }));
  const sj = subj(todo.s);
  return (
    <Pressable onPress={() => { haptic.soft(); onToggle(); }} accessibilityRole="checkbox" accessibilityState={{ checked: todo.d }} accessibilityLabel={todo.t}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 16, minHeight: 56, backgroundColor: pressed ? 'rgba(60,60,67,0.06)' : 'transparent' })}>
      {first ? null : <View style={{ position: 'absolute', top: 0, left: 50, right: 0, height: hair, backgroundColor: t.line }} />}
      <Animated.View style={[{ width: 22, height: 22, borderRadius: 11, borderColor: 'rgba(60,60,67,0.3)', alignItems: 'center', justifyContent: 'center' }, box]}>
        <Animated.View style={tick}><Icon name="check" size={13} color="#fff" width={3} /></Animated.View>
      </Animated.View>
      <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
        <View onLayout={(e: LayoutChangeEvent) => setTw(e.nativeEvent.layout.width)}>
          <Txt size={17} lh={22} tone={todo.d ? 'ink3' : 'ink'} numberOfLines={1}>{todo.t}</Txt>
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: '52%', height: 1, backgroundColor: t.ink3 }, strike]} />
        </View>
        <Txt size={13} lh={18} tone="ink2">
          {sj.name}
          {todo.carried && !todo.d ? <Txt size={13} color={t.amber}>{`  ${todo.carried}日前から`}</Txt> : null}
        </Txt>
      </View>
    </Pressable>
  );
}

/** A date like the Calendar app's icon: month in red, day in black. */
export function DateTile({ mo, d }: { mo: number; d: number }) {
  const t = useT();
  return (
    <View style={{ width: 34, height: 36, borderRadius: 8, backgroundColor: t.surface, borderWidth: 0.5, borderColor: t.line2, alignItems: 'center', overflow: 'hidden' }}>
      <View style={{ alignSelf: 'stretch', alignItems: 'center', backgroundColor: t.red }}>
        <Txt size={9} w="700" lh={12} color="#fff">{`${mo}月`}</Txt>
      </View>
      <Txt num size={17} w="500" lh={22}>{d}</Txt>
    </View>
  );
}
