import { ReactNode, useEffect, useMemo, useState } from 'react';
import { View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Line, Rect } from 'react-native-svg';

import { dayOf } from '../lib/history';
import { useStore } from '../store';
import { lift, radius, useT } from '../theme';
import { cascade, useAppear } from './appear';
import { haptic, Press, StdHead, SubjTile, Txt } from './base';
import { move } from './motion';
import { breakdownSheet } from './Breakdown';
import { useSeries } from './series';
import { Pane } from './Glass';
import { ring, S, useStd } from './stdLook';

// The graph card on My Page's 成長 page, as a deck: swipe it sideways for a
// different graph — this week first, then the running total (the card My
// Page passes in). It moves one card per swipe and clicks into
// place — no free scrolling — and every card is the same height. The swipe
// runs on the UI thread; dots under the deck say which card you're on.

const GAP = 10;
const WD = ['日', '月', '火', '水', '木', '金', '土'];
const PAGES = 2;
/** Every card's height (padding included). */
export const DECK_H = 312;

export function GraphDeck({ last }: { last: ReactNode }) {
  const t = useT();
  const std = useStd();
  const [w, setW] = useState(0);
  const h = DECK_H;
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
      x.value = move(-p * step, e.velocityX);
    }), [step]); // eslint-disable-line react-hooks/exhaustive-deps
  const row = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  // keep the current card in place if the width changes (rotation, split view)
  useEffect(() => { x.set(-page.get() * step); }, [step, x, page]);

  const go = (d: number) => {
    const p = Math.max(0, Math.min(PAGES - 1, page.get() + d));
    page.set(p);
    x.set(move(-p * step));
    setShown(p);
  };

  const sized = { width: cardW, height: h, borderRadius: radius.card, backgroundColor: t.surface, padding: 14, ...lift(t) };
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {cardW ? (
        <>
          {/* スタンダード: the cards' 2pt outline is drawn outside them, so the clipping window leaves room above and below */}
          <GestureDetector gesture={pan}>
            <View style={[{ overflow: 'hidden', paddingBottom: 6 }, std && { paddingTop: 4, marginTop: -4, paddingBottom: 8 }]} accessible accessibilityRole="adjustable"
              accessibilityLabel={`グラフ ${shown + 1}/${PAGES}。左右にスワイプで切り替え`}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={(e) => go(e.nativeEvent.actionName === 'increment' ? 1 : -1)}>
              <Animated.View style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: GAP, paddingHorizontal: 16 }, row]}>
                <View style={sized}><Pane radius={radius.card} /><WeekPage w={cardW - 28} h={h} /></View>
                <View style={sized}><Pane radius={radius.card} />{last}</View>
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
  const std = useStd();
  const a = useAnimatedStyle(() => {
    const d = Math.min(1, Math.abs(-x.value / step - i));
    return { width: 6 + 12 * (1 - d), opacity: 0.25 + 0.75 * (1 - d) };
  });
  return <Animated.View style={[{ height: 6, borderRadius: std ? 0 : 3, backgroundColor: t.ink }, a]} />;
}

/** The head every card shares: a label, one big number, how it compares. */
function Head({ label, aside, value, unit, delta, up = true, size = 34 }: { label: string; aside?: string; value: string; unit?: string; delta?: string; up?: boolean; size?: number }) {
  const t = useT();
  const std = useStd();
  return (
    <View>
      {std ? (
        // スタンダード: the heading with its square, in DotGothic16
        <StdHead title={label} right={aside ? <Txt size={12} w="600" tone="ink3" num>{aside}</Txt> : null} />
      ) : (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.ink }} />
        <Txt size={12} w="500" tone="ink2" style={{ flex: 1 }}>{label}</Txt>
        {aside ? <Txt size={11} tone="ink3">{aside}</Txt> : null}
      </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 4 }}>
        <Txt num size={size} w="700" lh={Math.round(size * 1.2)} style={size < 34 ? { marginBottom: Math.round((34 - size) * 0.35) } : null}>{value}</Txt>
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

/** 1: the last seven days, stacked by subject, against the daily goal. Tap a bar for that day; tap it again to let go. */
function WeekPage({ w, h }: { w: number; h: number }) {
  const t = useT();
  const std = useStd();
  const sessions = useStore((s) => s.sessions);
  const goal = useStore((s) => s.goalMin);
  const series = useSeries(useStore((s) => s.chart.detail));
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const x = dayOf(sessions, 6 - i);
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return { min: x.min, parts: series.of(x.parts), date };
  }), [sessions, series]);
  const used = series.list.filter((x) => days.some((d) => (d.parts[x.key] ?? 0) > 0));
  const prev = useMemo(() => Array.from({ length: 7 }, (_, i) => dayOf(sessions, 7 + i).min).reduce((a, b) => a + b, 0), [sessions]);
  const [sel, setSel] = useState<number | null>(null);
  const appear = useAppear(100);
  const total = days.reduce((a, d) => a + d.min, 0);
  const d = (total - prev) / 60;
  const ch = Math.max(90, h - 28 - 62 - 12 - 18 - 40); // card minus padding, head, gaps, labels, legend or the day's detail
  const gap = 10;
  const bw = (w - gap * 6) / 7;
  const top = Math.max(goal, ...days.map((x) => x.min)) * 1.06;
  const gy = ch - (goal / top) * ch;
  const pick = (i: number) => { haptic.tap(); setSel((v) => (v === i ? null : i)); };
  const day = sel === null ? null : days[sel];
  const label = (i: number) => (i === 6 ? '今日' : WD[days[i].date.getDay()]);
  return (
    <View style={{ flex: 1 }}>
      {/* スタンダード: nothing to compare yet (the first week), no ▲ 0.0 */}
      <Head label="この7日間" aside={`1日の目標 ${goal / 60}時間`} value={(total / 60).toFixed(1)} unit="時間" up={d >= 0} delta={std && !total && !prev ? undefined : `${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)}時間`} />
      <View style={{ marginTop: 12 }}>
        {/* each day's bar grows up from the floor in turn */}
        <View style={{ width: w, height: ch }}>
          {days.map((x, i) => {
            let y = ch;
            const op = sel === null ? (i === 6 ? 1 : 0.8) : i === sel ? 1 : 0.22;
            return (
              <Grow key={i} i={i} p={appear} style={{ position: 'absolute', left: i * (bw + gap), top: 0, width: bw, height: ch }}>
                {std ? <StdStack parts={used.map((s) => ({ c: s.c, h: ((x.parts[s.key] ?? 0) / top) * ch }))} w={bw} h={ch} op={sel === null ? (i === 6 ? 1 : 0.82) : i === sel ? 1 : 0.25} /> : (
                <Svg width={bw} height={ch}>
                  {used.map((s) => {
                    const bh = ((x.parts[s.key] ?? 0) / top) * ch;
                    y -= bh;
                    return bh > 0 ? <Rect key={s.key} x={0} y={y} width={bw} height={Math.max(0, bh - 1.5)} rx={3} fill={s.c} opacity={op} /> : null;
                  })}
                </Svg>
                )}
              </Grow>
            );
          })}
          <Svg width={w} height={ch} style={{ position: 'absolute' }} pointerEvents="none">
            <Line x1={0} x2={w} y1={gy} y2={gy} stroke={std ? S.ink : t.amber} strokeWidth={std ? 1.5 : 1} strokeDasharray="3 4" />
          </Svg>
        </View>
        {/* the bars are buttons: a whole column, so a short day is as easy to tap as a long one */}
        <View style={{ position: 'absolute', left: 0, top: 0, width: w, height: ch, flexDirection: 'row', gap }}>
          {days.map((x, i) => (
            <Press key={i} onPress={() => pick(i)} haptics={false} scale={0.97} accessibilityRole="button" accessibilityState={{ selected: sel === i }}
              accessibilityLabel={`${label(i)} ${jpHm(x.min)}`} style={{ width: bw, height: ch }} />
          ))}
        </View>
        {day && sel !== null ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: Math.max(0, ch - (day.min / top) * ch - 26), left: Math.min(w - 86, Math.max(0, sel * (bw + gap) + bw / 2 - 43)), width: 86, alignItems: 'center' }}>
            <View style={{ backgroundColor: t.ink, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Txt num size={11.5} w="700" lh={15} color={t.onInk}>{`${label(sel)} ${hmc(day.min)}`}</Txt>
            </View>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap, marginTop: 4 }}>
          {days.map((_, i) => <Txt key={i} size={11} w={i === sel || (sel === null && i === 6) ? '700' : '500'} tone={i === sel || (sel === null && i === 6) ? 'ink' : 'ink3'} style={{ width: bw, textAlign: 'center' }}>{label(i)}</Txt>)}
        </View>
      </View>
      <View style={{ flex: 1 }} />
      {day ? (
        // the day's detail: its date and total, then each subject's minutes; a tap opens what was studied (Breakdown)
        <Press onPress={() => breakdownSheet(day.date)} disabled={!day.min} scale={0.98} accessibilityRole="button" accessibilityLabel={`${label(sel!)}に勉強した内容を見る`} style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Txt size={12} w="700" lh={16} style={{ flex: 1 }}>{`${day.date.getMonth() + 1}月${day.date.getDate()}日（${WD[day.date.getDay()]}）· ${day.min ? jpHm(day.min) : '記録なし'}`}</Txt>
            {day.min ? <Txt size={11.5} w="600" color={t.blue}>内訳 ›</Txt> : null}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 2 }}>
            {used.filter((s) => (day.parts[s.key] ?? 0) > 0).map((s) => (
              <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <SubjTile name={s.name} color={s.c} area={s.area} size={13} radius={3} />
                <Txt num size={11} tone="ink2">{`${s.name} ${hmc(day.parts[s.key] ?? 0)}`}</Txt>
              </View>
            ))}
          </View>
        </Press>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {used.map((s) => (
            <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <SubjTile name={s.name} color={s.c} area={s.area} size={13} radius={3} />
              <Txt size={11} tone="ink3">{s.name}</Txt>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: std ? 12 : 10, height: 0, borderTopWidth: std ? 1.5 : 1, borderStyle: 'dashed', borderColor: std ? S.ink : t.amber }} />
            <Txt size={11} tone="ink3">目標</Txt>
          </View>
        </View>
      )}
    </View>
  );
}
/** '2:35' (hours:minutes) */
const hmc = (m: number) => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, '0')}`;
/** '2時間35分' / '45分' */
const jpHm = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}時間${Math.round(m % 60) ? `${Math.round(m % 60)}分` : ''}` : `${Math.round(m)}分`);

/**
 * スタンダード's bar: the subjects stacked in their colors (a little faded but today's),
 * an ink line between them and a thin ink outline around the whole, square cornered.
 */
function StdStack({ parts, w, h, op }: { parts: { c: string; h: number }[]; w: number; h: number; op: number }) {
  const list = parts.filter((p) => p.h > 0);
  const total = list.reduce((a, p) => a + p.h, 0);
  if (!total) return null;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: total, boxShadow: ring(1.5), backgroundColor: S.card }}>
      {[...list].reverse().map((p, k) => (
        <View key={k} style={{ height: p.h, backgroundColor: p.c, opacity: op, borderTopWidth: k ? 1.5 : 0, borderTopColor: S.ink }} />
      ))}
    </View>
  );
}

/** A bar that grows up from the floor on its turn (day i of 7). */
function Grow({ i, p, style, children }: { i: number; p: SharedValue<number>; style: ViewStyle; children: ReactNode }) {
  const a = useAnimatedStyle(() => ({ transform: [{ scaleY: cascade(p.value, i, 7, 0.45) }], transformOrigin: 'bottom' }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}
