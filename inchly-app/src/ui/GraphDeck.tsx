import { ReactNode, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Line, Rect } from 'react-native-svg';

import { grass, SUBJ, TODAY } from '../data';
import { dayOf, useStore } from '../store';
import { lift, radius, useT } from '../theme';
import { haptic, Txt } from './base';

// The graph card on My Page's 成長 page, as a deck: swipe it sideways for a
// different graph. It moves one card per swipe and clicks into place — no
// free scrolling — and every card takes the first card's size. The swipe runs
// on the UI thread; dots under the deck say which card you're on.

const GAP = 10;
const WD = ['日', '月', '火', '水', '木', '金', '土'];
const PAGES = 4;
const CLICK = { duration: 260, easing: Easing.bezier(0.2, 0.9, 0.25, 1) };

export function GraphDeck({ first }: { first: ReactNode }) {
  const t = useT();
  const [w, setW] = useState(0);
  const [h, setH] = useState(0); // the first card's height, which the others take
  const cardW = Math.max(0, w - 32);
  const step = cardW + GAP;
  const x = useSharedValue(0); // how far the row has moved, in px (0, -step, -2·step…)
  const page = useSharedValue(0);
  const start = useSharedValue(0);
  const [shown, setShown] = useState(0);
  const turned = (p: number) => { setShown(p); haptic.tap(); };

  const pan = useMemo(() => Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onBegin(() => { start.value = x.value; })
    .onUpdate((e) => {
      const next = start.value + e.translationX;
      // past either end it pulls back like a rubber band
      const minX = -(PAGES - 1) * step;
      x.value = next > 0 ? next * 0.3 : next < minX ? minX + (next - minX) * 0.3 : next;
    })
    .onEnd((e) => {
      // one card per swipe: a short drag or a flick turns it, never more
      let p = page.value;
      if (e.translationX < -step * 0.18 || e.velocityX < -500) p += 1;
      else if (e.translationX > step * 0.18 || e.velocityX > 500) p -= 1;
      p = Math.max(0, Math.min(PAGES - 1, p));
      if (p !== page.value) { page.value = p; scheduleOnRN(turned, p); }
      x.value = withTiming(-p * step, CLICK);
    }), [step]); // eslint-disable-line react-hooks/exhaustive-deps
  const row = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  // keep the current card in place if the width changes (rotation, split view)
  useEffect(() => { x.set(-page.get() * step); }, [step, x, page]);

  const go = (d: number) => {
    const p = Math.max(0, Math.min(PAGES - 1, page.get() + d));
    page.set(p);
    x.set(withTiming(-p * step, CLICK));
    setShown(p);
  };

  const card = { width: cardW, borderRadius: radius.card, backgroundColor: t.surface, padding: 14, ...lift(t) };
  const sized = { ...card, height: h || undefined };
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {cardW ? (
        <>
          <GestureDetector gesture={pan}>
            <View style={{ overflow: 'hidden', paddingBottom: 6 }} accessible accessibilityRole="adjustable"
              accessibilityLabel={`グラフ ${shown + 1}/${PAGES}。左右にスワイプで切り替え`}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={(e) => go(e.nativeEvent.actionName === 'increment' ? 1 : -1)}>
              <Animated.View style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: GAP, paddingHorizontal: 16 }, row]}>
                <View style={card} onLayout={(e) => setH(e.nativeEvent.layout.height)}>{first}</View>
                <View style={sized}><WeekPage w={cardW - 28} h={h} /></View>
                <View style={sized}><SubjectsPage w={cardW - 28} /></View>
                <View style={sized}><GrassPage w={cardW - 28} h={h} /></View>
              </Animated.View>
            </View>
          </GestureDetector>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 6 }} pointerEvents="none">
            {Array.from({ length: PAGES }, (_, i) => <Dot key={i} i={i} x={x} step={step} />)}
          </View>
        </>
      ) : null}
    </View>
  );
}

function Dot({ i, x, step }: { i: number; x: SharedValue<number>; step: number }) {
  const t = useT();
  const a = useAnimatedStyle(() => {
    const d = Math.min(1, Math.abs(-x.value / step - i));
    return { width: 6 + 12 * (1 - d), opacity: 0.25 + 0.75 * (1 - d) };
  });
  return <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: t.ink }, a]} />;
}

/** The head every card shares: a label, one big number, how it compares. */
function Head({ label, aside, value, unit, delta, up = true }: { label: string; aside?: string; value: string; unit?: string; delta?: string; up?: boolean }) {
  const t = useT();
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.ink }} />
        <Txt size={12} w="500" tone="ink2" style={{ flex: 1 }}>{label}</Txt>
        {aside ? <Txt size={11} tone="ink3">{aside}</Txt> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 4 }}>
        <Txt num size={34} w="700" lh={41}>{value}</Txt>
        {unit ? <Txt size={13} w="600" tone="ink3" style={{ marginBottom: 6 }}>{unit}</Txt> : null}
        <View style={{ flex: 1 }} />
        {delta ? (
          <View style={{ alignItems: 'flex-end', marginBottom: 4 }}>
            <Txt num size={12} w="700" lh={15} color={up ? t.greenInk : t.red}>{delta}</Txt>
            <Txt size={10.5} tone="ink3" lh={13}>先週より</Txt>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** 2: the last seven days, stacked by subject, against the daily goal. */
function WeekPage({ w, h }: { w: number; h: number }) {
  const t = useT();
  const sessions = useStore((s) => s.sessions);
  const goal = useStore((s) => s.goalMin);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => dayOf(sessions, 6 - i)), [sessions]);
  const prev = useMemo(() => Array.from({ length: 7 }, (_, i) => dayOf(sessions, 7 + i).min).reduce((a, b) => a + b, 0), [sessions]);
  const total = days.reduce((a, d) => a + d.min, 0);
  const d = (total - prev) / 60;
  const ch = Math.max(90, h - 28 - 62 - 12 - 18 - 30); // card minus padding, head, gaps, labels, legend
  const gap = 10;
  const bw = (w - gap * 6) / 7;
  const top = Math.max(goal, ...days.map((x) => x.min)) * 1.06;
  const gy = ch - (goal / top) * ch;
  return (
    <View style={{ flex: 1 }}>
      <Head label="この7日間" aside={`1日の目標 ${goal / 60}時間`} value={(total / 60).toFixed(1)} unit="時間" up={d >= 0} delta={`${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)}時間`} />
      <View style={{ marginTop: 12 }} accessible accessibilityLabel={`この7日間で${(total / 60).toFixed(1)}時間`}>
        <Svg width={w} height={ch}>
          {days.map((day, i) => {
            let y = ch;
            return SUBJ.map((s, k) => {
              const bh = (day.parts[k] / top) * ch;
              y -= bh;
              return bh > 0 ? <Rect key={`${i}-${k}`} x={i * (bw + gap)} y={y} width={bw} height={Math.max(0, bh - 1.5)} rx={3} fill={s.c} opacity={i === 6 ? 1 : 0.8} /> : null;
            });
          })}
          <Line x1={0} x2={w} y1={gy} y2={gy} stroke={t.amber} strokeWidth={1} strokeDasharray="3 4" />
        </Svg>
        <View style={{ flexDirection: 'row', gap, marginTop: 4 }}>
          {days.map((_, i) => {
            const dt = new Date(TODAY);
            dt.setDate(TODAY.getDate() - (6 - i));
            return <Txt key={i} size={11} w={i === 6 ? '700' : '500'} tone={i === 6 ? 'ink' : 'ink3'} style={{ width: bw, textAlign: 'center' }}>{i === 6 ? '今日' : WD[dt.getDay()]}</Txt>;
          })}
        </View>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {SUBJ.map((s) => (
          <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: s.c }} />
            <Txt size={11} tone="ink3">{s.name}</Txt>
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 10, height: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: t.amber }} />
          <Txt size={11} tone="ink3">目標</Txt>
        </View>
      </View>
    </View>
  );
}

/** 3: where this week's hours went, by subject, against each subject's weekly goal. */
function SubjectsPage({ w }: { w: number }) {
  const t = useT();
  const sessions = useStore((s) => s.sessions);
  const mins = useMemo(() => SUBJ.map((_, k) => Array.from({ length: 7 }, (_, i) => dayOf(sessions, i).parts[k]).reduce((a, b) => a + b, 0)), [sessions]);
  const total = mins.reduce((a, b) => a + b, 0) || 1;
  const rows = SUBJ.map((s, k) => ({ s, m: mins[k] })).sort((a, b) => b.m - a.m);
  const top = rows[0];
  return (
    <View style={{ flex: 1 }}>
      <Head label="この7日間の内訳" aside="科目別" value={top.s.name} unit={`がいちばん · ${Math.round((top.m / total) * 100)}%`} />
      <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2, marginTop: 12, width: w }}>
        {rows.filter((x) => x.m > 0).map((x) => <View key={x.s.id} style={{ flex: x.m, backgroundColor: x.s.c }} />)}
      </View>
      <View style={{ flex: 1, justifyContent: 'space-evenly', marginTop: 6 }}>
        {rows.map((x) => {
          const p = Math.min(1, x.m / 60 / x.s.goal);
          return (
            <View key={x.s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessible accessibilityLabel={`${x.s.name} ${(x.m / 60).toFixed(1)}時間、週の目標${x.s.goal}時間`}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: x.s.c }} />
              <Txt size={13} w="600" style={{ width: 34 }}>{x.s.name}</Txt>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: t.sunken, overflow: 'hidden' }}>
                <View style={{ width: `${p * 100}%`, height: 6, borderRadius: 3, backgroundColor: x.s.c }} />
              </View>
              <Txt num size={12.5} w="600" style={{ width: 70, textAlign: 'right' }}>{(x.m / 60).toFixed(1)}<Txt size={11} tone="ink3">{` / ${x.s.goal}h`}</Txt></Txt>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** 4: the grass, as many weeks as fit. */
function GrassPage({ w, h }: { w: number; h: number }) {
  const t = useT();
  const todayMin = useStore((s) => s.todayMin);
  const gap = 3;
  const room = Math.max(90, h - 28 - 62 - 12 - 26); // card minus padding, head, gap, legend
  const size = Math.max(7, Math.min(16, Math.floor((room - gap * 6) / 7)));
  const weeks = Math.max(8, Math.floor((w + gap) / (size + gap)));
  const cells = useMemo(() => grass(weeks, 0, todayMin ? Math.min(4, 1 + Math.floor(todayMin / 60)) : 0), [weeks, todayMin]);
  const studied = cells.filter((l) => l > 0).length;
  return (
    <View style={{ flex: 1 }}>
      <Head label="草" aside={`${weeks}週間`} value={String(studied)} unit={`日 / ${cells.length}日 勉強した`} />
      <View style={{ flexDirection: 'row', gap, marginTop: 12 }} accessible accessibilityLabel={`${weeks}週間のうち${studied}日勉強しました`}>
        {Array.from({ length: weeks }, (_, c) => (
          <View key={c} style={{ gap }}>
            {cells.slice(c * 7, c * 7 + 7).map((l, r) => <View key={r} style={{ width: size, height: size, borderRadius: 3, backgroundColor: t.grass[l] }} />)}
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
        <Txt size={10.5} tone="ink3">少</Txt>
        {t.grass.map((c) => <View key={c} style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: c }} />)}
        <Txt size={10.5} tone="ink3">多</Txt>
      </View>
    </View>
  );
}
