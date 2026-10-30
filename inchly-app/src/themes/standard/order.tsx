import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { subj } from '@/data';
import { deckOf, endOf, type Block } from '@/lib/timetable';
import { doneOn, setDayOrder, useStore } from '@/store';
import { haptic } from '@/ui/base';
import { micro, move } from '@/ui/motion';
import { openSheet } from '@/ui/Sheet';
import { LIFT, R, ring, S } from './look';
import { J, Key, SubjSquare } from './parts';
import { Pix } from './pixel';

// Today's plans in another order (the timer's cards follow it), スタンダード's way: the plans as rows in
// one card (the subject's square, 1.5pt lines between), ≡ to hold and move one up or down — held, it
// rises on the lime shadow and the others slide out of its way (ui/motion move: no bounce). Plans done
// and waiting to be recorded, and the one under way, stay first with a lock. The same as ui/OrderSheet.

export function orderSheet() {
  openSheet((close) => <Order close={close} />, { grouped: true });
}

const ROW = 64;

function Order({ close }: { close: () => void }) {
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
    <View style={{ gap: 14, paddingTop: 2, paddingBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
        <View style={{ width: 72 }} />
        <J size={17} w="700" lh={22} style={{ flex: 1, textAlign: 'center' }} accessibilityRole="header">今日の順番</J>
        <View style={{ width: 72, alignItems: 'flex-end' }}>
          <Key label="できた" onPress={close} fill={S.ink} under={S.limeDeep} kd={3} style={{ height: 36 }} face={{ paddingHorizontal: 14 }}>
            <J size={14} w="800" lh={18} color={S.onInk}>できた</J>
          </Key>
        </View>
      </View>
      {/* two short lines, so neither ends in one lone character on a small phone */}
      <View style={{ gap: 2, paddingHorizontal: 2 }}>
        <J size={12.5} lh={18} color={S.ink3}>≡ をつかんで上下に動かすと、カードの順番が変わります</J>
        <J size={12.5} lh={18} color={S.ink3}>終わった予定と勉強中の予定は動かせません</J>
      </View>
      {/* the rows are clear on the card, the lines between them under them (a row held covers them as it passes) */}
      <View style={{ backgroundColor: S.card, borderRadius: R.card, boxShadow: ring() }}>
        {list.slice(1).map((b, i) => (
          <View key={b.id} pointerEvents="none" style={{ position: 'absolute', left: 14, right: 14, top: (i + 1) * ROW - 0.75, height: 1.5, backgroundColor: S.line }} />
        ))}
        {fixed.map((b) => <Line key={b.id} b={b} locked note={held.some((h) => h.blockId === b.id) ? '記録まち' : '勉強中'} />)}
        {movable.length ? <DragList items={movable} onDrop={drop} /> : null}
      </View>
    </View>
  );
}

/** A plan as a row: its subject's square, its name and task, its time; ≡ to move it, or a lock. */
function Line({ b, locked, note }: { b: Block; locked?: boolean; note?: string }) {
  const sj = subj(b.s);
  return (
    <View style={{ height: ROW, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14, paddingRight: 6 }}>
      <View style={{ opacity: locked ? 0.55 : 1 }}><SubjSquare name={sj.name} color={sj.c} area={sj.area} size={36} /></View>
      <View style={{ flex: 1, minWidth: 0, gap: 2, opacity: locked ? 0.55 : 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <J size={15} w="700" lh={19} numberOfLines={1} style={{ flexShrink: 1 }}>{sj.name}</J>
          {note ? <J size={11.5} w="700" lh={15} color={S.ink3}>{note}</J> : null}
        </View>
        <J size={12} lh={16} num color={S.ink3} numberOfLines={1}>{[b.t ?? sj.task, b.start ? (b.min ? `${b.start}〜${endOf(b)}` : `${b.start}から`) : ''].filter(Boolean).join(' · ')}</J>
      </View>
      <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Pix name={locked ? 'lock' : 'grip'} color={locked ? S.ink3 : S.line2} />
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
    return { zIndex: lifted.value ? 10 : 0, transform: [{ translateY: lifted.value ? y.value : move(at) }, { scale: micro(lifted.value ? 1.03 : 1) }] };
  });
  // held: its own ground, the outline and the lime shadow fade in under it (the shadow itself never changes)
  const up = useAnimatedStyle(() => ({ opacity: micro(lifted.value ? 1 : 0) }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0 }, a]}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 4, right: 4, top: 2, bottom: 2, borderRadius: R.mid, backgroundColor: S.card, boxShadow: LIFT }, up]} />
      <Line b={b} />
      <GestureDetector gesture={pan}>
        <View accessible accessibilityLabel={`${sj.name}を動かす`} accessibilityHint="押したまま上下に動かします"
          style={{ position: 'absolute', right: 6, top: (ROW - 44) / 2, width: 44, height: 44, borderRadius: 10, cursor: 'grab' } as object} />
      </GestureDetector>
    </Animated.View>
  );
}
