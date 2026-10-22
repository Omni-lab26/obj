import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { dayOf } from '../lib/history';
import { Session, useStore, useStreak } from '../store';
import { ease, useT } from '../theme';
import { Card, Txt } from './base';
import { Rolling } from './Rolling';
import { GraphDeck } from './GraphDeck';
import { Sticker, StickerName } from './Sticker';

// "You are growing": the running total climbing toward the next milestone,
// three comparisons with your past self, and the badges you have collected.
// Everything is computed from your records, so it moves every day you study.

const MILESTONES = [100, 300, 500, 700, 1000, 1500];
const WEEKS = 26;
const PLOT_H = 112;

export function useGrowth(sessions: Session[]) {
  return useMemo(() => {
    const day = (i: number) => dayOf(sessions, i).min;
    const days = Array.from({ length: 365 }, (_, i) => day(i));
    const sum = (a: number, b: number) => days.slice(a, b).reduce((x, y) => x + y, 0);
    const totalMin = sum(0, 365);
    // the running total at the end of each of the last 26 weeks, oldest first
    const curve = Array.from({ length: WEEKS + 1 }, (_, k) => (totalMin - sum(0, (WEEKS - k) * 7)) / 60);
    const next = MILESTONES.find((m) => m * 60 > totalMin) ?? MILESTONES[MILESTONES.length - 1];
    const prev = [...MILESTONES].reverse().find((m) => m * 60 <= totalMin) ?? 0;
    const pace = sum(0, 14) / 14; // minutes a day lately
    const eta = new Date();
    eta.setDate(eta.getDate() + Math.ceil((next * 60 - totalMin) / Math.max(1, pace)));
    return {
      total: totalMin / 60, curve, next, prev, eta,
      vsYesterday: days[0] - days[1],
      vsLastWeek: (sum(0, 7) - sum(7, 14)) / 60,
      avgNow: sum(0, 30) / 30,
      avgThen: sum(30, 60) / 30,
    };
  }, [sessions]);
}

const hm = (m: number) => `${Math.floor(Math.abs(m) / 60)}:${String(Math.round(Math.abs(m) % 60)).padStart(2, '0')}`;

export function Growth({ stacked, badges = true }: { stacked?: boolean; badges?: boolean }) {
  const t = useT();
  const sessions = useStore((s) => s.sessions);
  const g = useGrowth(sessions);
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = setTimeout(() => setShown(true), 200); return () => clearTimeout(id); }, []);
  const left = g.next - g.total;
  const p = (g.total - g.prev) / (g.next - g.prev);

  return (
    <View style={{ paddingTop: 14, gap: 10 }}>
      {/* the graph card: swipe it for the week, the subjects and the grass */}
      <GraphDeck stacked={stacked} first={<>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.ink }} />
          <Txt size={12} w="500" tone="ink2" style={{ flex: 1 }}>これまでの勉強時間</Txt>
          <Txt size={11} tone="ink3">直近1年</Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 4 }}>
          <Rolling value={shown ? g.total.toFixed(1) : '000.0'} size={34} weight="700" />
          <Txt size={13} w="600" tone="ink3" style={{ marginBottom: 6 }}>時間</Txt>
          <View style={{ flex: 1 }} />
          <View style={{ alignItems: 'flex-end', marginBottom: 4 }}>
            <Txt num size={12} w="700" lh={15} color={g.vsLastWeek >= 0 ? t.greenInk : t.red}>{`${g.vsLastWeek >= 0 ? '▲' : '▼'} ${Math.abs(g.vsLastWeek).toFixed(1)}時間`}</Txt>
            <Txt size={10.5} tone="ink3" lh={13}>先週より</Txt>
          </View>
        </View>
        <Climb curve={g.curve} next={g.next} prev={g.prev} />
        {/* the next milestone, and when you'll reach it at this pace */}
        <View style={{ marginTop: 12, padding: 10, borderRadius: 12, backgroundColor: t.canvas, gap: 7 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Txt size={12.5} w="600" style={{ flex: 1 }}>{`次のバッジ · ${g.next}時間`}</Txt>
            <Txt num size={12.5} w="700">{`あと${left.toFixed(1)}時間`}</Txt>
          </View>
          <Meter p={p} />
          <Txt size={11} tone="ink3">{`このペースなら ${g.eta.getMonth() + 1}月${g.eta.getDate()}日に届きます`}</Txt>
        </View>
      </>} />

      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        {/* you vs. your past self */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Versus label="昨日より" up={g.vsYesterday >= 0} value={hm(g.vsYesterday)} />
          <Versus label="先週より" up={g.vsLastWeek >= 0} value={`${Math.abs(g.vsLastWeek).toFixed(1)}h`} />
          <Versus label="1日平均 · 先月より" up={g.avgNow >= g.avgThen} value={`${Math.round(Math.abs(g.avgNow - g.avgThen))}分`} />
        </View>

        {badges ? <Badges total={g.total} /> : null}
      </View>
    </View>
  );
}

/** The running total as a rising line, with the milestone you passed and the one ahead. */
function Climb({ curve, next, prev }: { curve: number[]; next: number; prev: number }) {
  const t = useT();
  const [w, setW] = useState(0);
  const lo = Math.min(curve[0], prev) - 10, hi = next + 10;
  const X = (i: number) => (w - 4) * (i / (curve.length - 1)) + 2;
  const Y = (v: number) => 6 + (PLOT_H - 12) * (1 - (v - lo) / (hi - lo));
  const line = curve.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
  const reveal = useSharedValue(0);
  useEffect(() => { if (w) reveal.value = withDelay(150, withTiming(1, { duration: 1100, easing: ease.out })); }, [w, reveal]);
  const clip = useAnimatedStyle(() => ({ width: w * reveal.value }));
  const end = curve[curve.length - 1];
  return (
    <View style={{ height: PLOT_H, marginTop: 12 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessible accessibilityLabel={`半年で${(end - curve[0]).toFixed(0)}時間ふえました`}>
      {w ? (
        <>
          <Svg width={w} height={PLOT_H} style={{ position: 'absolute' }}>
            {[prev, next].filter((m) => m > lo).map((m) => (
              <Line key={m} x1={0} x2={w} y1={Y(m)} y2={Y(m)} stroke={m === next ? t.ink2 : t.line2} strokeWidth={0.75} strokeDasharray="3 4" />
            ))}
          </Svg>
          <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' }, clip]}>
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
          <Txt num size={10} w="600" lh={12} tone="ink2" style={{ position: 'absolute', left: 0, top: Y(next) - 14 }}>{`${next}時間`}</Txt>
          {prev > lo ? <Txt num size={10} lh={12} tone="ink3" style={{ position: 'absolute', left: 0, top: Y(prev) - 14 }}>{`${prev}時間 達成`}</Txt> : null}
          <Txt size={10} lh={12} tone="ink3" style={{ position: 'absolute', left: 0, bottom: -14 }}>半年前</Txt>
          <Txt size={10} lh={12} tone="ink3" style={{ position: 'absolute', right: 0, bottom: -14 }}>今日</Txt>
        </>
      ) : null}
    </View>
  );
}

function Meter({ p }: { p: number }) {
  const t = useT();
  const v = useSharedValue(0);
  useEffect(() => { v.value = withDelay(400, withTiming(Math.max(0, Math.min(1, p)), { duration: 900, easing: ease.out })); }, [p, v]);
  const a = useAnimatedStyle(() => ({ width: `${v.value * 100}%` }));
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: t.sunken, overflow: 'hidden' }}>
      <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: t.ink }, a]} />
    </View>
  );
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

/** Collected badges, pop stickers; the next ones wait in grey with what's left. */
function Badges({ total }: { total: number }) {
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
