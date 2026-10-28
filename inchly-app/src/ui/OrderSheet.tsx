import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { subj } from '../data';
import { deckOf, endOf, type Block } from '../lib/timetable';
import { doneOn, setDayOrder, useStore } from '../store';
import { hair, useT } from '../theme';
import { haptic, Press, Txt } from './base';
import { Icon } from './Icon';
import { micro, move } from './motion';
import { openSheet } from './Sheet';

// Today's plans in another order (the timer's cards follow it): hold a plan's
// ≡ and move it up or down; the others make room. Plans already done and
// waiting to be recorded, and the one under way, stay where they are, first.
// The order is for today only; the times stay as planned.

export function orderSheet() {
  openSheet((close) => <Order close={close} />, { grouped: true });
}

const ROW = 64;

function Order({ close }: { close: () => void }) {
  const t = useT();
  const all = useStore((s) => s.timetable);
  const doneList = useStore((s) => s.doneBlocks);
  const held = useStore((s) => s.held);
  const order = useStore((s) => s.dayOrder);
  const lastDay = useStore((s) => s.lastDay);
  const live = useStore((s) => (s.running ? s.planBlock : null));
  const { list, locked } = useMemo(() => {
    const d = new Date();
    return deckOf({
      blocks: all, day: d, done: doneOn({ doneBlocks: doneList }, d), held: held.flatMap((h) => (h.blockId ? [h.blockId] : [])), live,
      order: order && order.date === lastDay ? order.ids : undefined,
    });
  }, [all, doneList, held, order, lastDay, live]);
  const fixed = list.slice(0, locked);
  const movable = list.slice(locked);
  const drop = (ids: string[]) => { haptic.soft(); setDayOrder(ids); };
  return (
    <View style={{ gap: 14, paddingTop: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 64 }} />
        <Txt size={17} w="700" style={{ flex: 1, textAlign: 'center' }} accessibilityRole="header">今日の順番</Txt>
        <Press onPress={close} scale={0.92} hitSlop={6} accessibilityLabel="できた" style={{ width: 64, height: 36, borderRadius: 18, backgroundColor: t.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={14} w="700" color={t.onInk}>できた</Txt>
        </Press>
      </View>
      <Txt size={12.5} tone="ink3" style={{ paddingHorizontal: 4 }}>≡ を押したまま上下に動かすと、タイマーのカードがその順に並びます。終わった予定と勉強中の予定は動かせません</Txt>
      <View style={{ backgroundColor: t.surface, borderRadius: 18, overflow: 'hidden' }}>
        {/* every line has a hairline on top; the card's edge hides the first one */}
        <View style={{ marginTop: -hair }}>
          {fixed.map((b) => <Line key={b.id} b={b} locked note={held.some((h) => h.blockId === b.id) ? '記録まち' : '勉強中'} />)}
          {movable.length ? <DragList items={movable} onDrop={drop} /> : null}
        </View>
      </View>
    </View>
  );
}

/** A plan as a line: its color, subject and task, its time; ≡ to move it, or a lock. */
function Line({ b, locked, note }: { b: Block; locked?: boolean; note?: string }) {
  const t = useT();
  const sj = subj(b.s);
  return (
    <View style={{ height: ROW, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14, paddingRight: 6, borderTopWidth: hair, borderTopColor: t.line, backgroundColor: t.surface, opacity: locked ? 0.6 : 1 }}>
      <View style={{ width: 4, height: 36, borderRadius: 2, backgroundColor: sj.c }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={15} w="700" numberOfLines={1}>{sj.name}{note ? <Txt size={11.5} w="600" tone="ink3">{`  ${note}`}</Txt> : null}</Txt>
        <Txt size={12} tone="ink3" numberOfLines={1}>{[b.t ?? sj.task, b.start ? (b.min ? `${b.start}〜${endOf(b)}` : `${b.start}から`) : ''].filter(Boolean).join(' · ')}</Txt>
      </View>
      <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={locked ? 'lock' : 'grip'} size={locked ? 16 : 20} color={t.ink3} />
      </View>
    </View>
  );
}

/** The plans that can move: each sits at its place in `pos` and slides there (no bounce); the one held follows the finger. */
function DragList({ items, onDrop }: { items: Block[]; onDrop: (ids: string[]) => void }) {
  const pos = useSharedValue<Record<string, number>>(Object.fromEntries(items.map((b, i) => [b.id, i])));
  useEffect(() => { pos.set(Object.fromEntries(items.map((b, i) => [b.id, i]))); }, [items, pos]);
  return (
    <View style={{ height: items.length * ROW }}>
      {items.map((b) => <DragRow key={b.id} b={b} pos={pos} n={items.length} onDrop={onDrop} />)}
    </View>
  );
}

function DragRow({ b, pos, n, onDrop }: { b: Block; pos: SharedValue<Record<string, number>>; n: number; onDrop: (ids: string[]) => void }) {
  const sj = subj(b.s);
  const lifted = useSharedValue(false);
  const y = useSharedValue(0);
  const from = useSharedValue(0);
  const [pan] = useState(() => Gesture.Pan().minDistance(1)
    .onStart(() => { from.value = pos.value[b.id] * ROW; y.value = from.value; lifted.value = true; scheduleOnRN(haptic.tap); })
    .onUpdate((e) => {
      y.value = Math.max(-8, Math.min((n - 1) * ROW + 8, from.value + e.translationY));
      const to = Math.max(0, Math.min(n - 1, Math.round(y.value / ROW)));
      const was = pos.value[b.id];
      if (to !== was) {
        const next = { ...pos.value };
        for (const id of Object.keys(next)) if (next[id] === to) next[id] = was;
        next[b.id] = to;
        pos.value = next;
        scheduleOnRN(haptic.tap);
      }
    })
    .onFinalize(() => {
      if (!lifted.value) return;
      lifted.value = false;
      scheduleOnRN(onDrop, Object.entries(pos.value).sort((a, c) => a[1] - c[1]).map(([id]) => id));
    }));
  const a = useAnimatedStyle(() => {
    const at = (pos.value[b.id] ?? 0) * ROW;
    return {
      zIndex: lifted.value ? 10 : 0,
      transform: [{ translateY: lifted.value ? y.value : move(at) }, { scale: micro(lifted.value ? 1.03 : 1) }],
      boxShadow: lifted.value ? '0px 10px 24px rgba(0,0,0,0.18)' : '0px 0px 0px rgba(0,0,0,0)',
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0 }, a]}>
      <Line b={b} />
      <GestureDetector gesture={pan}>
        <View accessible accessibilityLabel={`${sj.name}を動かす`} accessibilityHint="押したまま上下に動かします"
          style={{ position: 'absolute', right: 6, top: (ROW - 44) / 2, width: 44, height: 44, borderRadius: 10, backgroundColor: 'transparent', cursor: 'grab' } as object} />
      </GestureDetector>
    </Animated.View>
  );
}
