import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { hair, lift, useT } from '../theme';
import { haptic, Press, StdKey, Txt } from './base';
import { Sticker } from './Sticker';
import { Pane } from './Glass';
import { dismiss as away, fadeOut, M, micro, move, present } from './motion';
import { LIFT, S, useStd } from './stdLook';

// Toast stack (bencho "notification stack"): newest in front, the two behind
// peek out above it. Tapping the stack spreads it into a list; it collapses
// again on its own. Flick one up and it's gone, like a phone's banner. Each
// toast can carry one action ("一緒に始める", "元に戻す").
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

/** Taken off once a flick has carried it out of sight. */
const dismissAfter = (id: number) => { setTimeout(() => dismiss(id), M.dismiss.duration); };

const PEEK = 8;
const GAP = 66;

function ToastCard({ item, index, spread, onPress }: { item: Item; index: number; spread: boolean; onPress: () => void }) {
  const t = useT();
  const std = useStd();
  const y = useSharedValue(-60);
  const s = useSharedValue(0.96);
  const o = useSharedValue(0);
  useEffect(() => {
    const ty = spread ? index * GAP : -index * PEEK;
    const ts = spread ? 1 : 1 - index * 0.05;
    const to = index > 2 ? 0 : spread || index === 0 ? 1 : 0.9 - index * 0.2;
    // it comes down and the stack makes room, settling without a bounce
    y.value = present(ty);
    s.value = micro(ts);
    o.value = micro(to);
  }, [index, spread, y, s, o]);
  // flick it up to dismiss: it follows the finger up (and only a little down)
  const drag = useSharedValue(0);
  const flick = useMemo(() => Gesture.Pan().activeOffsetY([-6, 6]).failOffsetX([-20, 20])
    .onUpdate((e) => { drag.set(e.translationY < 0 ? e.translationY : e.translationY * 0.25); })
    .onEnd((e) => {
      if (e.translationY < -22 || e.velocityY < -450) {
        // away up at the finger's speed; it's taken off once it's out of sight
        drag.set(away(-140, Math.min(e.velocityY, -600)));
        scheduleOnRN(dismissAfter, item.id);
      } else drag.set(move(0, e.velocityY));
    }), [drag, item.id]);
  const a = useAnimatedStyle(() => ({
    opacity: o.value * (1 - Math.min(0.8, Math.max(0, -drag.value) / 140)),
    transform: [{ translateY: y.value + drag.value }, { scale: s.value }],
  }));
  return (
    // the exit animation sits on its own layer, so it doesn't fight the stack's opacity and position
    <Animated.View exiting={fadeOut()} style={{ position: 'absolute', left: 0, right: 0, zIndex: 10 - index }}>
      <GestureDetector gesture={flick}>
        <Animated.View style={a}>
          {std ? (
            // スタンダード: paper with the ink outline and the lime shadow of what floats (it leaves 6 clear on the right); words only, the action a small key
            <Pressable onPress={onPress}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10, paddingLeft: 14, paddingRight: 12, marginRight: 6, borderRadius: 16, backgroundColor: S.card, boxShadow: LIFT }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={15} w="700" lh={20} numberOfLines={1}>{item.title}</Txt>
                {item.sub ? <Txt size={12} lh={16} tone="ink2" numberOfLines={1}>{item.sub}</Txt> : null}
              </View>
              {item.action ? (
                <StdKey onPress={() => { item.action!.run(); dismiss(item.id); }} label={item.action.label} kd={3} style={{ minHeight: 32, marginBottom: 3 }} face={{ minHeight: 32, paddingHorizontal: 12 }}>
                  <Txt size={13} w="700" lh={17}>{item.action.label}</Txt>
                </StdKey>
              ) : null}
            </Pressable>
          ) : (
          <Pressable onPress={onPress}
            style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingLeft: 8, paddingRight: item.action ? 8 : 14, borderRadius: 20,
              backgroundColor: t.surface, borderWidth: t.dark ? hair : 0, borderColor: t.line2 }, t.dark ? { boxShadow: '0px 8px 24px rgba(0,0,0,0.5)' } : lift(t, 2)]}>
            <Pane radius={20} blur />
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
          )}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

// A screen shown over everything (the timer) mounts its own host; only the newest shows the toasts.
let hostSeq = 0;
const hosts: number[] = [];
const hostSubs = new Set<() => void>();
const hostsChanged = () => hostSubs.forEach((f) => f());

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [me] = useState(() => ++hostSeq);
  const [top, setTop] = useState(true);
  useEffect(() => {
    const f = () => setTop(hosts[hosts.length - 1] === me);
    hostSubs.add(f);
    hosts.push(me);
    hostsChanged();
    return () => { hosts.splice(hosts.indexOf(me), 1); hostSubs.delete(f); hostsChanged(); };
  }, [me]);
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
  if (!top) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 6, left: 12, right: 12, zIndex: 100, height: spread ? list.length * GAP : 70 }}>
      {list.map((it, i) => <ToastCard key={it.id} item={it} index={i} spread={spread} onPress={onPress} />)}
    </View>
  );
}
