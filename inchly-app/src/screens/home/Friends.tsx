import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { Friend, go, useFriends } from '@/screens/model';
import { FriendSort, setFriendOrder, setFriendSort } from '@/store';
import { hair, lift, radius, useT } from '@/theme';
import { Avatar, Btn, haptic, Press, Txt } from '@/ui/base';
import { personSheet } from '@/ui/Editors';
import { RadioCards } from '@/ui/Form';
import { LiveDot } from '@/ui/GroupParts';
import { Icon } from '@/ui/Icon';
import { openSheet } from '@/ui/Sheet';

// Friends studying now, like a portfolio's holdings: who, what, how long
// today and against yesterday, and a line of their last seven days. Four at
// most, longest today first unless you choose another order; press and hold
// a row, then slide it, to put them in your own order.

const MAX = 4;
const ROW = 60;
const SORTS: { v: FriendSort; title: string; sub: string }[] = [
  { v: 'time', title: '勉強時間順', sub: '今日いちばん長く勉強している人から' },
  { v: 'name', title: '名前順', sub: 'あいうえお・ABC順' },
  { v: 'mine', title: '自分で並べる', sub: '行を長押しして、上下にずらして並べ替え' },
];
const hm = (m: number) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, '0')}`;

function sortSheet(current: FriendSort) {
  openSheet((close) => <SortChoice current={current} close={close} />);
}
function SortChoice({ current, close }: { current: FriendSort; close: () => void }) {
  const [v, setV] = useState(current);
  return (
    <View style={{ gap: 14 }}>
      <Txt size={18} w="700">並び順</Txt>
      <RadioCards<FriendSort> value={v} onChange={setV} options={SORTS} />
      <Btn kind="primary" wide label="この順にする" onPress={() => { setFriendSort(v); haptic.soft(); close(); }} />
    </View>
  );
}

export function Friends() {
  const t = useT();
  const { list, sort } = useFriends();
  const shown = list.slice(0, MAX);
  // the row being dragged (-1: none) and how far it has moved
  const active = useSharedValue(-1);
  const dy = useSharedValue(0);
  const drop = (from: number, to: number) => {
    active.set(-1);
    dy.set(0);
    if (from === to) return;
    const hs = shown.map((f) => f.h);
    const [moved] = hs.splice(from, 1);
    hs.splice(to, 0, moved);
    setFriendOrder([...hs, ...list.slice(MAX).map((f) => f.h)]);
    haptic.soft();
  };
  return (
    <View style={[{ borderRadius: radius.card, backgroundColor: t.surface, paddingTop: 12, paddingBottom: 6 }, lift(t)]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingBottom: 4 }}>
        <Txt size={15} w="700">いま勉強中の友達</Txt>
        <LiveDot size={5} />
        <View style={{ flex: 1 }} />
        <Press onPress={() => sortSheet(sort)} hitSlop={8} scale={0.94} accessibilityRole="button" accessibilityLabel={`並び順 ${SORTS.find((x) => x.v === sort)!.title}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 26, paddingHorizontal: 9, borderRadius: 13, backgroundColor: t.sunken }}>
          <Txt size={11.5} w="600" tone="ink2">{SORTS.find((x) => x.v === sort)!.title}</Txt>
          <View style={{ transform: [{ rotate: '90deg' }] }}><Icon name="chev" size={10} color={t.ink3} /></View>
        </Press>
        <Press onPress={go.community} hitSlop={8} scale={0.94} accessibilityRole="button" accessibilityLabel="もっと見る">
          <Txt size={12.5} w="600" color={t.blue}>もっと見る</Txt>
        </Press>
      </View>
      {shown.length ? (
        <View style={{ height: shown.length * ROW }}>
          {shown.map((f, i) => <Row key={f.h} f={f} i={i} n={shown.length} active={active} dy={dy} onDrop={drop} last={i === shown.length - 1} />)}
        </View>
      ) : (
        <Txt size={12.5} tone="ink3" style={{ paddingHorizontal: 14, paddingVertical: 14 }}>いま勉強中の友達はいません</Txt>
      )}
    </View>
  );
}

function Row({ f, i, n, active, dy, onDrop, last }: { f: Friend; i: number; n: number; active: SharedValue<number>; dy: SharedValue<number>; onDrop: (from: number, to: number) => void; last: boolean }) {
  const t = useT();
  const pan = useMemo(() => Gesture.Pan().activateAfterLongPress(320)
    .onStart(() => { active.set(i); dy.set(0); scheduleOnRN(haptic.firm); })
    .onUpdate((e) => { dy.set(Math.max(-i * ROW, Math.min((n - 1 - i) * ROW, e.translationY))); })
    .onEnd(() => {
      const to = Math.max(0, Math.min(n - 1, Math.round((i * ROW + dy.get()) / ROW)));
      scheduleOnRN(onDrop, i, to);
    })
    .onFinalize(() => { if (active.get() === i) { active.set(-1); dy.set(0); } }), [i, n, active, dy, onDrop]);
  // the dragged row follows the finger; the ones it passes step aside
  const a = useAnimatedStyle(() => {
    const from = active.value;
    if (from < 0) return { transform: [{ translateY: 0 }, { scale: 1 }], zIndex: 0, opacity: 1 };
    if (from === i) return { transform: [{ translateY: dy.value }, { scale: 1.03 }], zIndex: 2, opacity: 0.96 };
    const to = Math.max(0, Math.min(n - 1, Math.round((from * ROW + dy.value) / ROW)));
    const shift = from < i && i <= to ? -ROW : to <= i && i < from ? ROW : 0;
    return { transform: [{ translateY: withTiming(shift, { duration: 160 }) }, { scale: 1 }], zIndex: 0, opacity: 1 };
  });
  const up = f.diff >= 0;
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: i * ROW, height: ROW, backgroundColor: t.surface }, a]}>
        <Press onPress={() => personSheet(f.n, f.c)} scale={0.99} accessibilityLabel={`${f.n} ${f.s}を勉強中。今日${hm(f.today)}。長押しで並べ替え`}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14 }}>
          <Avatar name={f.n} color={f.c} size={36} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={14} w="600" lh={18} numberOfLines={1}>{f.n}</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <LiveDot size={4} />
              <Txt size={11.5} tone="ink3" lh={15} numberOfLines={1}>{`${f.s}を勉強中`}</Txt>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt num size={14.5} w="700" lh={18}>{hm(f.today)}</Txt>
            <Txt num size={11} w="600" lh={14} color={up ? t.greenInk : t.red}>{`${up ? '▲' : '▼'} ${hm(Math.abs(f.diff))}`}</Txt>
          </View>
          <Spark week={f.week} color={up ? t.blue : t.red} />
        </Press>
        {last ? null : <View style={{ position: 'absolute', left: 61, right: 14, bottom: 0, height: hair, backgroundColor: t.line }} />}
      </Animated.View>
    </GestureDetector>
  );
}

/** Seven days as a small line, today's point marked. */
function Spark({ week, color }: { week: number[]; color: string }) {
  const W = 58, H = 26;
  const lo = Math.min(...week), hi = Math.max(...week), span = Math.max(1, hi - lo);
  const pts = week.map((m, i) => [(i / (week.length - 1)) * (W - 4) + 2, H - 3 - ((m - lo) / span) * (H - 6)] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [ex, ey] = pts[pts.length - 1];
  return (
    <Svg width={W} height={H} accessibilityElementsHidden>
      <Path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={ex} cy={ey} r={2.4} fill={color} />
    </Svg>
  );
}
