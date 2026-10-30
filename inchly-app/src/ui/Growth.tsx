import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withDelay } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { dayOf } from '../lib/history';
import { Session, useStore, useStreak } from '../store';
import { lift, useT } from '../theme';
import { Card, haptic, Press, StdHead, Txt } from './base';
import { move, timed } from './motion';
import { Rolling } from './Rolling';
import { useReplay } from './appear';
import { DECK_H, GraphDeck } from './GraphDeck';
import { Sticker, StickerName } from './Sticker';
import { PixSticker } from '../themes/standard/pixel';
import { ring, S, useStd } from './stdLook';

// "You are growing": the week and the running total in a deck (its
// 足 — a point a day, a week or a month — set by a little vertical slider), the
// next milestone, three comparisons with your past self, and the themes (the
// badges you have collected are drawn here too, but shown on home).
// Everything is computed from your records, so it moves every day you study.

const MILESTONES = [100, 300, 500, 700, 1000, 1500];
const WEEKS = 26;
/** How the running total is drawn: a point every day (30 days), week (26 weeks) or month (12 months). */
export type Frame = 'day' | 'week' | 'month';
const FRAMES: { id: Frame; label: string; from: string }[] = [
  { id: 'day', label: '日', from: '30日前' },
  { id: 'week', label: '週', from: '半年前' },
  { id: 'month', label: '月', from: '1年前' },
];
const PLOT_H = DECK_H - 28 - 62 - 12 - 18; // the card minus padding, head, gap, the labels under it

export function useGrowth(sessions: Session[]) {
  return useMemo(() => {
    const day = (i: number) => dayOf(sessions, i).min;
    const days = Array.from({ length: 365 }, (_, i) => day(i));
    const sum = (a: number, b: number) => days.slice(a, b).reduce((x, y) => x + y, 0);
    const totalMin = sum(0, 365);
    // the running total at the end of each of the last 26 weeks, oldest first
    const curve = Array.from({ length: WEEKS + 1 }, (_, k) => (totalMin - sum(0, (WEEKS - k) * 7)) / 60);
    const curves: Record<Frame, number[]> = {
      day: Array.from({ length: 31 }, (_, k) => (totalMin - sum(0, 30 - k)) / 60),
      week: curve,
      month: Array.from({ length: 13 }, (_, k) => (totalMin - sum(0, (12 - k) * 30)) / 60),
    };
    const next = MILESTONES.find((m) => m * 60 > totalMin) ?? MILESTONES[MILESTONES.length - 1];
    const prev = [...MILESTONES].reverse().find((m) => m * 60 <= totalMin) ?? 0;
    const pace = sum(0, 14) / 14; // minutes a day lately
    const eta = new Date();
    eta.setDate(eta.getDate() + Math.ceil((next * 60 - totalMin) / Math.max(1, pace)));
    return {
      total: totalMin / 60, curve, curves, next, prev, eta,
      vsYesterday: days[0] - days[1],
      vsLastWeek: (sum(0, 7) - sum(7, 14)) / 60,
      avgNow: sum(0, 30) / 30,
      avgThen: sum(30, 60) / 30,
    };
  }, [sessions]);
}

const hm = (m: number) => `${Math.floor(Math.abs(m) / 60)}:${String(Math.round(Math.abs(m) % 60)).padStart(2, '0')}`;

export function Growth() {
  const t = useT();
  const std = useStd();
  const sessions = useStore((s) => s.sessions);
  const g = useGrowth(sessions);
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = setTimeout(() => setShown(true), 200); return () => clearTimeout(id); }, []);
  const left = g.next - g.total;
  const p = (g.total - g.prev) / (g.next - g.prev);

  const [frame, setFrame] = useState<Frame>('week');

  return (
    <View style={{ paddingTop: 14, gap: 10 }}>
      {/* the graph card: the week first; swipe it for the running total */}
      <GraphDeck last={<>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {std ? <StdHead title="これまでの勉強時間" /> : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.ink }} />
              <Txt size={12} w="500" tone="ink2" style={{ flex: 1 }}>これまでの勉強時間</Txt>
            </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 4 }}>
              <Rolling value={shown ? g.total.toFixed(1) : '000.0'} size={34} weight="700" />
              <Txt size={13} w="600" tone="ink3" style={{ marginBottom: 6 }}>時間</Txt>
              <Txt num size={11.5} w="700" color={g.vsLastWeek >= 0 ? t.greenInk : t.red} style={{ marginBottom: 7, marginLeft: 4 }}>
                {`${g.vsLastWeek >= 0 ? '▲' : '▼'} ${Math.abs(g.vsLastWeek).toFixed(1)}`}<Txt size={10} tone="ink3">{' 先週より'}</Txt>
              </Txt>
            </View>
          </View>
          <FrameSlider value={frame} onChange={setFrame} />
        </View>
        <Climb key={frame} curve={g.curves[frame]} next={g.next} prev={g.prev} from={FRAMES.find((f) => f.id === frame)!.from} />
      </>} />

      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {/* the next milestone, and when you'll reach it at this pace */}
        {std ? (
          // スタンダード: the badge to come as a grey sticker beside its ink meter
          <Card pad={0} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16 }}>
            <PixSticker name="trophy" locked />
            <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Txt size={14} w="700" numberOfLines={1} style={{ flex: 1 }}>{`次のバッジ · ${g.next}時間`}</Txt>
                <Txt num size={14} w="800">{`あと${left.toFixed(1)}時間`}</Txt>
              </View>
              <Meter p={p} />
              <Txt size={12} tone="ink3">{'このペースなら '}<Txt size={12} w="700">{`${g.eta.getMonth() + 1}月${g.eta.getDate()}日`}</Txt>{'に届きます'}</Txt>
            </View>
          </Card>
        ) : (
        <Card pad={14} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Txt size={13} w="600" style={{ flex: 1 }}>{`次のバッジ · ${g.next}時間`}</Txt>
            <Txt num size={13} w="700">{`あと${left.toFixed(1)}時間`}</Txt>
          </View>
          <Meter p={p} />
          <Txt size={11} tone="ink3">{`このペースなら ${g.eta.getMonth() + 1}月${g.eta.getDate()}日に届きます`}</Txt>
        </Card>
        )}

        {/* you vs. your past self */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Versus label="昨日より" up={g.vsYesterday >= 0} value={hm(g.vsYesterday)} />
          <Versus label="先週より" up={g.vsLastWeek >= 0} value={`${Math.abs(g.vsLastWeek).toFixed(1)}h`} />
          <Versus label="1日平均 · 先月より" up={g.avgNow >= g.avgThen} value={`${Math.round(Math.abs(g.avgNow - g.avgThen))}分`} />
        </View>

      </View>
    </View>
  );
}

const STOP = 20; // the slider's room per 足
/** The 足 of the running total, as a short vertical slider in the card's corner: slide it (or tap a label) for 日・週・月. */
function FrameSlider({ value, onChange }: { value: Frame; onChange: (f: Frame) => void }) {
  const t = useT();
  const std = useStd();
  const at = FRAMES.findIndex((f) => f.id === value);
  const y = useSharedValue(at * STOP);
  useEffect(() => { y.set(move(at * STOP)); }, [at, y]);
  const lens = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const set = (i: number) => { if (FRAMES[i] && FRAMES[i].id !== value) { haptic.tap(); onChange(FRAMES[i].id); } };
  // only a vertical slide: a sideways one still turns the deck
  const pan = useMemo(() => Gesture.Pan().activeOffsetY([-4, 4]).failOffsetX([-10, 10])
    .onUpdate((e) => {
      const i = Math.max(0, Math.min(FRAMES.length - 1, Math.round((at * STOP + e.translationY) / STOP)));
      scheduleOnRN(set, i);
    }), [at, value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <GestureDetector gesture={pan}>
      <View accessible accessibilityRole="adjustable" accessibilityLabel={`グラフの足 ${FRAMES[at].label}`}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => set(at + (e.nativeEvent.actionName === 'increment' ? 1 : -1))}
        style={[{ width: 34, padding: 2, borderRadius: 12, backgroundColor: t.sunken }, std && { backgroundColor: S.card, boxShadow: ring(1.5) }]}>
        {/* スタンダード: the picked 足 in lime (what's picked), on the card's color */}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 2, right: 2, top: 2, height: STOP, borderRadius: 10, backgroundColor: t.surface, ...lift(t) }, std && { borderRadius: 9, backgroundColor: S.lime, boxShadow: ring(1.5) }, lens]} />
        {FRAMES.map((f, i) => (
          <Press key={f.id} onPress={() => set(i)} haptics={false} scale={0.9} hitSlop={{ left: 6, right: 6 }} accessibilityLabel={`${f.label}足`}
            style={{ height: STOP, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={11.5} w={i === at ? '700' : '500'} tone={i === at ? 'ink' : 'ink3'}>{f.label}</Txt>
          </Press>
        ))}
      </View>
    </GestureDetector>
  );
}

/** The running total as a rising line, with the milestone you passed and the one ahead. */
function Climb({ curve, next, prev, from }: { curve: number[]; next: number; prev: number; from: string }) {
  const t = useT();
  const [w, setW] = useState(0);
  // the milestones are drawn when they are near the line (a month of days rises only a little)
  const first = curve[0], last = curve[curve.length - 1], span = Math.max(1, last - first);
  const showNext = next - last < span * 1.5, showPrev = first - prev < span * 1.5 && prev > 0;
  const pad = span * 0.12 + 1;
  const lo = Math.min(first, showPrev ? prev : first) - pad, hi = Math.max(last, showNext ? next : last) + pad;
  const X = (i: number) => (w - 4) * (i / (curve.length - 1)) + 2;
  const Y = (v: number) => 6 + (PLOT_H - 12) * (1 - (v - lo) / (hi - lo));
  const line = curve.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const reveal = useSharedValue(0);
  const replay = useReplay();
  useEffect(() => { if (w) { reveal.value = 0; reveal.value = withDelay(150, timed(1, 500)); } }, [w, reveal, replay]);
  // drawn left to right by a window sliding open (moved, not resized): the window comes in from the left, and the line in it goes the other way
  const clip = useAnimatedStyle(() => ({ transform: [{ translateX: w * (reveal.value - 1) }] }));
  const counter = useAnimatedStyle(() => ({ transform: [{ translateX: w * (1 - reveal.value) }] }));
  const end = curve[curve.length - 1];
  return (
    <View style={{ height: PLOT_H, marginTop: 12 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessible accessibilityLabel={`${from}から${(end - curve[0]).toFixed(0)}時間ふえました`}>
      {w ? (
        <>
          <Svg width={w} height={PLOT_H} style={{ position: 'absolute' }}>
            {[...(showPrev ? [prev] : []), ...(showNext ? [next] : [])].filter((m) => m > lo && m < hi).map((m) => (
              <Line key={m} x1={0} x2={w} y1={Y(m)} y2={Y(m)} stroke={m === next ? t.ink2 : t.line2} strokeWidth={0.75} strokeDasharray="3 4" />
            ))}
          </Svg>
          <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, width: w, overflow: 'hidden' }, clip]}>
            <Animated.View style={counter}>
            <Svg width={w} height={PLOT_H}>
              <Defs>
                <LinearGradient id="climb" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={t.ink} stopOpacity={0.12} />
                  <Stop offset="1" stopColor={t.ink} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Path d={`${line} L${X(curve.length - 1)},${PLOT_H} L${X(0)},${PLOT_H} Z`} fill="url(#climb)" />
              <Path d={line} fill="none" stroke={t.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <Circle cx={X(curve.length - 1)} cy={Y(end)} r={4} fill={t.ink} stroke={t.surface} strokeWidth={1.5} />
            </Svg>
            </Animated.View>
          </Animated.View>
          {showNext ? <Txt num size={10} w="600" lh={12} tone="ink2" style={{ position: 'absolute', left: 0, top: Y(next) - 14 }}>{`${next}時間`}</Txt> : null}
          {showPrev && prev > lo ? <Txt num size={10} lh={12} tone="ink3" style={{ position: 'absolute', left: 0, top: Y(prev) - 14 }}>{`${prev}時間 達成`}</Txt> : null}
          <Txt size={10} lh={12} tone="ink3" style={{ position: 'absolute', left: 0, bottom: -14 }}>{from}</Txt>
          <Txt size={10} lh={12} tone="ink3" style={{ position: 'absolute', right: 0, bottom: -14 }}>今日</Txt>
        </>
      ) : null}
    </View>
  );
}

function Meter({ p }: { p: number }) {
  const t = useT();
  const std = useStd();
  const v = useSharedValue(0);
  const replay = useReplay();
  useEffect(() => { v.value = 0; v.value = withDelay(400, timed(Math.max(0, Math.min(1, p)), 500)); }, [p, v, replay]);
  // fills by scaling from the left, not by its width (no layout each frame)
  const a = useAnimatedStyle(() => ({ transform: [{ scaleX: v.value }] }));
  // スタンダード: square, 8 tall, on paper 2 inside a thin ink outline (on a view of its own, so the clipping doesn't take it)
  if (std) return <View style={{ boxShadow: ring(1.5) }}>{bar()}</View>;
  return bar();
  function bar() {
    return (
    <View style={[{ height: 6, borderRadius: 3, backgroundColor: t.sunken, overflow: 'hidden' }, std && { height: 8, borderRadius: 0 }]}>
      <Animated.View style={[{ width: '100%', height: 6, borderRadius: 3, backgroundColor: t.ink, transformOrigin: 'left' }, std && { height: 8, borderRadius: 0 }, a]} />
    </View>
    );
  }
}

function Versus({ label, up, value }: { label: string; up: boolean; value: string }) {
  const t = useT();
  return (
    <Card pad={10} style={{ flex: 1 }}>
      <Txt size={10.5} tone="ink3" numberOfLines={1}>{label}</Txt>
      <Txt num size={16} w="700" lh={21} color={up ? t.greenInk : t.red} style={{ marginTop: 2 }}>{`${up ? '▲' : '▼'} ${value}`}</Txt>
    </Card>
  );
}

/** Collected badges, pop stickers; the next ones wait in grey with what's left. (On home.) */
export function Badges({ total }: { total: number }) {
  const streak = useStreak();
  const list: { s: StickerName; label: string; got: boolean; left?: string }[] = [
    ...[100, 300, 500, 700, 1000].map((m) => ({ s: 'trophy' as StickerName, label: `${m}時間`, got: total >= m, left: total < m ? `あと${Math.ceil(m - total)}時間` : undefined })),
    ...[7, 21, 30, 100].map((d) => ({ s: 'fire' as StickerName, label: `${d}日連続`, got: streak >= d, left: streak < d ? `あと${d - streak}日` : undefined })),
    { s: 'star', label: '1日5時間', got: true },
    { s: 'sun', label: '朝勉10回', got: true },
  ];
  list.sort((a, b) => Number(b.got) - Number(a.got));
  const got = list.filter((x) => x.got).length;
  return (
    <Card pad={0} style={{ paddingTop: 12, paddingBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 14 }}>
        <Txt size={13.5} w="600" style={{ flex: 1 }}>バッジ</Txt>
        <Txt num size={11.5} tone="ink3">{`${got} / ${list.length}`}</Txt>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, paddingHorizontal: 10, paddingTop: 6 }}>
        {list.map((b) => (
          <View key={b.label} style={{ width: 66, alignItems: 'center', gap: 2 }} accessibilityLabel={b.got ? `${b.label} 達成` : `${b.label} ${b.left}`}>
            <View style={{ opacity: b.got ? 1 : 0.28 }}>
              <Sticker name={b.s} size={44} tilt={b.got ? -6 : 0} />
            </View>
            <Txt size={11} w="600" lh={14} tone={b.got ? 'ink' : 'ink3'}>{b.label}</Txt>
            <Txt size={10} lh={12} tone={b.got ? 'greenInk' : 'ink3'}>{b.got ? '達成' : b.left}</Txt>
          </View>
        ))}
      </ScrollView>
    </Card>
  );
}
