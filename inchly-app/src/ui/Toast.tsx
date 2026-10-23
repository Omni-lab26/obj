import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeOutUp, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ease, hair, lift, useT } from '../theme';
import { haptic, Press, Txt } from './base';
import { Sticker } from './Sticker';

// Toast stack (bencho "notification stack"): newest in front, the two behind
// peek out above it. Tapping the stack spreads it into a list; it collapses
// again on its own. Each toast can carry one action ("一緒に始める", "元に戻す").
type Action = { label: string; run: () => void };
type Item = { id: number; title: string; sub?: string; action?: Action };

let seq = 0;
let items: Item[] = [];
const subs = new Set<(i: Item[]) => void>();
const emit = () => subs.forEach((f) => f(items));
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function schedule(id: number, ms: number) {
  clearTimeout(timers.get(id));
  timers.set(id, setTimeout(() => dismiss(id), ms));
}
export function dismiss(id: number) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  items = items.filter((x) => x.id !== id);
  emit();
}
export function toast(title: string, sub?: string, action?: Action) {
  const id = ++seq;
  items = [{ id, title, sub, action }, ...items].slice(0, 4);
  emit();
  schedule(id, action ? 5200 : 3400);
  if (action) haptic.soft();
}

const PEEK = 8;
const GAP = 66;

function ToastCard({ item, index, spread, onPress }: { item: Item; index: number; spread: boolean; onPress: () => void }) {
  const t = useT();
  const y = useSharedValue(-60);
  const s = useSharedValue(0.96);
  const o = useSharedValue(0);
  useEffect(() => {
    const ty = spread ? index * GAP : -index * PEEK;
    const ts = spread ? 1 : 1 - index * 0.05;
    const to = index > 2 ? 0 : spread || index === 0 ? 1 : 0.9 - index * 0.2;
    y.value = withSpring(ty, { damping: 18, stiffness: 220, mass: 0.8 });
    s.value = withTiming(ts, { duration: 260, easing: ease.out });
    o.value = withTiming(to, { duration: 200 });
  }, [index, spread, y, s, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }, { scale: s.value }] }));
  return (
    <Animated.View exiting={FadeOutUp.duration(220)} style={[{ position: 'absolute', left: 0, right: 0, zIndex: 10 - index }, a]}>
      <Pressable onPress={onPress}
        style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingLeft: 8, paddingRight: item.action ? 8 : 14, borderRadius: 20,
          backgroundColor: t.surface, borderWidth: t.dark ? hair : 0, borderColor: t.line2 }, t.dark ? { boxShadow: '0px 8px 24px rgba(0,0,0,0.5)' } : lift(t, 2)]}>
        <Sticker name="done" size={32} tilt={-6} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={14} w="600" numberOfLines={1}>{item.title}</Txt>
          {item.sub ? <Txt size={12} tone="ink3" numberOfLines={1}>{item.sub}</Txt> : null}
        </View>
        {item.action ? (
          <Press onPress={() => { item.action!.run(); dismiss(item.id); }} style={{ height: 32, paddingHorizontal: 13, borderRadius: 16, backgroundColor: t.ink, justifyContent: 'center' }}>
            <Txt size={12.5} w="600" color={t.onInk}>{item.action.label}</Txt>
          </Press>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<Item[]>(items);
  const [spread, setSpread] = useState(false);
  const collapse = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    const f = (i: Item[]) => { setList(i); if (i.length < 2) setSpread(false); };
    subs.add(f);
    f(items); // anything said between the first render and now
    return () => { subs.delete(f); };
  }, []);
  const onPress = () => {
    if (list.length < 2) return;
    haptic.tap();
    const next = !spread;
    setSpread(next);
    clearTimeout(collapse.current);
    // Hold everything while spread; resume dismissal after it collapses.
    list.forEach((x) => (next ? clearTimeout(timers.get(x.id)) : schedule(x.id, 2400)));
    if (next) collapse.current = setTimeout(() => { setSpread(false); items.forEach((x) => schedule(x.id, 2400)); }, 4500);
  };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 6, left: 12, right: 12, zIndex: 100, height: spread ? list.length * GAP : 70 }}>
      {list.map((it, i) => <ToastCard key={it.id} item={it} index={i} spread={spread} onPress={onPress} />)}
    </View>
  );
}
