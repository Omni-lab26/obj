import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { SharedValue, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { Friend, useFriends } from '@/screens/model';
import { FriendSort, setFriendHidden, setFriendOrder, setFriendSort } from '@/store';
import { hair, lift, radius, useT } from '@/theme';
import { useAppear } from '@/ui/appear';
import { Avatar, Btn, haptic, Press, Txt } from '@/ui/base';
import { Dialog } from '@/ui/Dialog';
import { personSheet } from '@/ui/Editors';
import { RadioCards } from '@/ui/Form';
import { LiveDot } from '@/ui/GroupParts';
import { Icon } from '@/ui/Icon';
import { toast } from '@/ui/Toast';

// Friends studying now, like a portfolio's holdings: who, what, how long
// today and against yesterday, and a line of their last seven days. Four at
// most, longest today first unless you choose another order. Drag a row by
// its grip (≡), or press and hold it, to put them in your own order: the row
// lifts and follows the finger, the others slide out of its way on springs.
// Swipe a row left to take that person off the list; もっと見る shows
// everyone, and the ones you took off, in a card in the middle of the screen
// (the order is chosen in one too).

const MAX = 4;
const ROW = 60;
const SPRING = { damping: 22, stiffness: 260, mass: 0.7 };
const SORTS: { v: FriendSort; title: string; sub: string }[] = [
  { v: 'time', title: '勉強時間順', sub: '今日いちばん長く勉強している人から' },
  { v: 'name', title: '名前順', sub: 'あいうえお・ABC順' },
  { v: 'mine', title: '自分で並べる', sub: '右の ≡ をつかむか、行を長押しして上下にずらす' },
];
const hm = (m: number) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, '0')}`;

/** The order, in a card in the middle of the screen: pick one and it applies. */
function SortChoice({ open, current, close }: { open: boolean; current: FriendSort; close: () => void }) {
  const [v, setV] = useState(current);
  useEffect(() => { if (open) setV(current); }, [open, current]); // eslint-disable-line react-hooks/set-state-in-effect
  return (
    <Dialog open={open} close={close} title="並び順">
      <View style={{ gap: 14, paddingHorizontal: 18, paddingBottom: 18, paddingTop: 4 }}>
        <RadioCards<FriendSort> value={v} onChange={setV} options={SORTS} />
        <Btn kind="primary" wide label="この順にする" onPress={() => { setFriendSort(v); haptic.soft(); close(); }} />
      </View>
    </Dialog>
  );
}

const hide = (f: Friend) => {
  setFriendHidden(f.h, true);
  haptic.soft();
  toast(`${f.n} を非表示にしました`, 'もっと見る から戻せます', { label: '元に戻す', run: () => setFriendHidden(f.h, false) });
};

export function Friends() {
  const t = useT();
  const { list, sort } = useFriends();
  const [all, setAll] = useState(false);
  const [sorting, setSorting] = useState(false);
  const shown = list.slice(0, MAX);
  const keys = shown.map((f) => f.h).join(',');
  // where each row sits (handle → slot), the row being dragged ('' for none) and where it is
  const slots = useSharedValue<Record<string, number>>(Object.fromEntries(shown.map((f, i) => [f.h, i])));
  const dragging = useSharedValue('');
  const dragY = useSharedValue(0);
  useEffect(() => { slots.set(Object.fromEntries(keys.split(',').filter(Boolean).map((h, i) => [h, i]))); }, [keys, slots]);
  const commit = (order: Record<string, number>) => {
    const hs = Object.keys(order).sort((a, b) => order[a] - order[b]);
    if (hs.join(',') === keys) return;
    setFriendOrder([...hs, ...list.slice(MAX).map((f) => f.h)]);
  };
  return (
    <View style={[{ borderRadius: radius.card, backgroundColor: t.surface, paddingTop: 12, paddingBottom: 6 }, lift(t)]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingBottom: 4 }}>
        <Txt size={15} w="700">いま勉強中の友達</Txt>
        <LiveDot size={5} />
        <View style={{ flex: 1 }} />
        <Press onPress={() => setSorting(true)} hitSlop={8} scale={0.94} accessibilityRole="button" accessibilityLabel={`並び順 ${SORTS.find((x) => x.v === sort)!.title}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 26, paddingHorizontal: 9, borderRadius: 13, backgroundColor: t.sunken }}>
          <Txt size={11.5} w="600" tone="ink2">{SORTS.find((x) => x.v === sort)!.title}</Txt>
          <View style={{ transform: [{ rotate: '90deg' }] }}><Icon name="chev" size={10} color={t.ink3} /></View>
        </Press>
        <Press onPress={() => setAll(true)} hitSlop={8} scale={0.94} accessibilityRole="button" accessibilityLabel="もっと見る">
          <Txt size={12.5} w="600" color={t.blue}>もっと見る</Txt>
        </Press>
      </View>
      {shown.length ? (
        <View style={{ height: shown.length * ROW }}>
          {shown.map((f, i) => (
            <Row key={f.h} f={f} n={shown.length} first={i === 0} slots={slots} dragging={dragging} dragY={dragY} onDrop={commit} />
          ))}
        </View>
      ) : (
        <Txt size={12.5} tone="ink3" style={{ paddingHorizontal: 14, paddingVertical: 14 }}>いま勉強中の友達はいません</Txt>
      )}
      <Everyone open={all} close={() => setAll(false)} />
      <SortChoice open={sorting} current={sort} close={() => setSorting(false)} />
    </View>
  );
}

type Shared = { slots: SharedValue<Record<string, number>>; dragging: SharedValue<string>; dragY: SharedValue<number> };

function Row({ f, n, first, slots, dragging, dragY, onDrop }: Shared & { f: Friend; n: number; first: boolean; onDrop: (order: Record<string, number>) => void }) {
  const t = useT();
  const h = f.h;
  const start = useSharedValue(0);
  const swipe = useSharedValue(0);
  const width = useSharedValue(360);

  // the drag: the same for the grip (at once) and for the row (after a hold)
  const drag = useMemo(() => {
    const make = (g: ReturnType<typeof Gesture.Pan>) => g
      .onStart(() => {
        start.set((slots.get()[h] ?? 0) * ROW);
        dragY.set(start.get());
        dragging.set(h);
        scheduleOnRN(haptic.firm);
      })
      .onUpdate((e) => {
        const y = Math.max(0, Math.min((n - 1) * ROW, start.get() + e.translationY));
        dragY.set(y);
        const at = Math.round(y / ROW);
        const cur = slots.get();
        if (at !== cur[h]) {
          // swap places with whoever is there: they slide into the gap
          const other = Object.keys(cur).find((k) => cur[k] === at);
          const next = { ...cur, [h]: at };
          if (other) next[other] = cur[h];
          slots.set(next);
          scheduleOnRN(haptic.tap);
        }
      })
      .onFinalize(() => {
        if (dragging.get() !== h) return;
        const order = slots.get();
        // settle into the slot, then let go
        dragY.set(withSpring((order[h] ?? 0) * ROW, SPRING, (done) => { if (done) dragging.set(''); }));
        scheduleOnRN(onDrop, order);
      });
    return { grip: make(Gesture.Pan().minDistance(0)), hold: make(Gesture.Pan().activateAfterLongPress(280)) };
  }, [h, n, slots, dragging, dragY, start, onDrop]);

  // swipe left to take them off the list
  const away = useMemo(() => Gesture.Pan().activeOffsetX(-12).failOffsetY([-10, 10])
    .onUpdate((e) => { swipe.set(Math.min(0, e.translationX)); })
    .onEnd((e) => {
      if (swipe.get() < -96 || e.velocityX < -900) {
        swipe.set(withTiming(-width.get(), { duration: 200 }, (done) => { if (done) scheduleOnRN(hide, f); }));
      } else swipe.set(withSpring(0, SPRING));
    }), [f, swipe, width]);
  const rowGesture = useMemo(() => Gesture.Race(drag.hold, away), [drag, away]);

  const place = useAnimatedStyle(() => {
    const lifted = dragging.value === h;
    const y = lifted ? dragY.value : withSpring((slots.value[h] ?? 0) * ROW, SPRING);
    return { transform: [{ translateY: y }, { scale: withSpring(lifted ? 1.035 : 1, SPRING) }], zIndex: lifted ? 3 : 1 };
  });
  const shadow = useAnimatedStyle(() => ({ opacity: withTiming(dragging.value === h ? 1 : 0, { duration: 160 }) }));
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: swipe.value }] }));
  const behind = useAnimatedStyle(() => ({ opacity: Math.min(1, -swipe.value / 60) }));
  const up = f.diff >= 0;
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: ROW }, place]}
      onLayout={(e) => width.set(e.nativeEvent.layout.width)}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 6, right: 6, top: 2, bottom: 2, borderRadius: 14, backgroundColor: t.surface,
        boxShadow: '0px 10px 24px rgba(15,23,42,0.16), 0px 2px 6px rgba(15,23,42,0.08)' }, shadow]} />
      {/* under the row: what a left swipe does */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: t.red, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 18 }, behind]}>
        <Txt size={13} w="700" color="#fff">非表示</Txt>
      </Animated.View>
      <GestureDetector gesture={rowGesture}>
        <Animated.View style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface }, slide]}>
          <Press onPress={() => personSheet(f.n, f.c)} scale={0.99} accessibilityLabel={`${f.n} ${f.s}を勉強中。今日${hm(f.today)}。左にスワイプで非表示`}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11, paddingLeft: 14, height: ROW }}>
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
          {/* the grip: drag from here at once */}
          <GestureDetector gesture={drag.grip}>
            <View accessibilityRole="adjustable" accessibilityLabel={`${f.n}を並べ替える`} style={{ width: 40, height: ROW, alignItems: 'center', justifyContent: 'center' }}>
              <Grip />
            </View>
          </GestureDetector>
        </Animated.View>
      </GestureDetector>
      {first ? null : <View pointerEvents="none" style={{ position: 'absolute', left: 61, right: 14, top: 0, height: hair, backgroundColor: t.line }} />}
    </Animated.View>
  );
}

/** Three short lines: something you can pick up and move. */
function Grip() {
  const t = useT();
  return (
    <View style={{ gap: 3 }}>
      {[0, 1, 2].map((i) => <View key={i} style={{ width: 14, height: 1.8, borderRadius: 1, backgroundColor: t.ink3 }} />)}
    </View>
  );
}

/** Seven days as a small line, today's point marked; on home it draws itself in when it appears, in the もっと見る card it is just there. */
function Spark({ week, color, still }: { week: number[]; color: string; still?: boolean }) {
  const W = 52, H = 26;
  const p = useAppear(260, 820);
  const clip = useAnimatedStyle(() => ({ width: still ? W : W * p.value }));
  const lo = Math.min(...week), hi = Math.max(...week), span = Math.max(1, hi - lo);
  const pts = week.map((m, i) => [(i / (week.length - 1)) * (W - 4) + 2, H - 3 - ((m - lo) / span) * (H - 6)] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [ex, ey] = pts[pts.length - 1];
  return (
    <View style={{ width: W, height: H }} accessibilityElementsHidden>
      <Animated.View style={[{ height: H, overflow: 'hidden' }, clip]}>
        <Svg width={W} height={H}>
          <Path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={ex} cy={ey} r={2.4} fill={color} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** もっと見る: everyone studying now, one under another, and the ones you took off the list — a card in the middle of the screen. */
function Everyone({ open, close }: { open: boolean; close: () => void }) {
  const t = useT();
  const { list, hidden } = useFriends();
  const see = (f: Friend) => { close(); setTimeout(() => personSheet(f.n, f.c), 220); };
  return (
    <Dialog open={open} close={close} title="いま勉強中の友達" aside={`${list.length}人`}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        {list.map((f) => <Line key={f.h} f={f} onPress={() => see(f)} />)}
        {hidden.length ? (
          <>
            <Txt size={12.5} w="600" tone="ink3" style={{ paddingTop: 14, paddingBottom: 2 }}>非表示にした人</Txt>
            {hidden.map((f) => (
              <Line key={f.h} f={f} dim right={
                <Press onPress={() => { setFriendHidden(f.h, false); haptic.soft(); }} scale={0.94} accessibilityRole="button" accessibilityLabel={`${f.n}をホームに戻す`}
                  style={{ height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: t.sunken, justifyContent: 'center' }}>
                  <Txt size={12} w="600">表示する</Txt>
                </Press>
              } />
            ))}
          </>
        ) : null}
      </ScrollView>
    </Dialog>
  );
}
function Line({ f, onPress, right, dim }: { f: Friend; onPress?: () => void; right?: ReactNode; dim?: boolean }) {
  const t = useT();
  const up = f.diff >= 0;
  return (
    <Press onPress={onPress} disabled={!onPress} scale={0.99} accessibilityLabel={`${f.n} ${f.s}を勉強中。今日${hm(f.today)}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 8, opacity: dim ? 0.6 : 1 }}>
      <Avatar name={f.n} color={f.c} size={38} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={14.5} w="600" lh={19} numberOfLines={1}>{f.n}</Txt>
        <Txt size={11.5} tone="ink3" lh={15} numberOfLines={1}>{`${f.s}を勉強中 · ${f.g} 志望`}</Txt>
      </View>
      {right ?? (
        <>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt num size={15} w="700" lh={19}>{hm(f.today)}</Txt>
            <Txt num size={11} w="600" lh={14} color={up ? t.greenInk : t.red}>{`${up ? '▲' : '▼'} ${hm(Math.abs(f.diff))}`}</Txt>
          </View>
          <Spark still week={f.week} color={up ? t.blue : t.red} />
        </>
      )}
    </Press>
  );
}
