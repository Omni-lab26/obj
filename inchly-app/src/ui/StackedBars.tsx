import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay } from 'react-native-reanimated';

import { pad } from '../data';
import { dayOf } from '../lib/history';
import { Session, useStore } from '../store';
import { hair, lift, radius, type, useT } from '../theme';
import { useReplay } from './appear';
import { haptic, StdHead, Txt } from './base';
import { micro, timed } from './motion';
import { Rolling } from './Rolling';
import { SeriesSet, useSeries } from './series';
import { Segmented } from './Tabs';
import { Pane } from './Glass';
import { ring, S, useStd } from './stdLook';

// bencho "stacked bars": twenty days (or weeks) of study as stacked bars by
// subject. Run a finger along them: one column is ringed, the rest fade, and a
// tooltip glides beside it. 日 / 週 regrows the bars, staggered left to right.
// Below the baseline, in red: minutes short of that day's (week's) goal.
const N = 20;
const PLOT = 127;
const BASE = 104; // baseline, from the top of the plot (bencho: 104 / 127)
const UP = 96; // tallest stack
const DOWN = 18; // deepest shortfall
const GAP = 6;
const TIP_W = 172;

type Mode = 'day' | 'week';
type Col = { label: string; parts: number[]; total: number; short: number };

function build(mode: Mode, sessions: Session[], series: SeriesSet): Col[] {
  const goal = mode === 'day' ? 180 : 1260;
  return Array.from({ length: N }, (_, i) => {
    const back = N - 1 - i;
    const span = mode === 'day' ? 1 : 7;
    const days = Array.from({ length: span }, (_, k) => dayOf(sessions, back * span + k));
    const each = days.map((d) => series.of(d.parts));
    const parts = series.list.map((x) => each.reduce((a, p) => a + (p[x.key] ?? 0), 0));
    const total = parts.reduce((a, b) => a + b, 0);
    const d = new Date();
    d.setDate(d.getDate() - back * span);
    return { label: `${d.getMonth() + 1}月${d.getDate()}日`, parts, total, short: Math.max(0, goal - total) };
  });
}
const hmLabel = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? pad(m % 60) + '分' : ''}` : `${m}分`);

/**
 * One piece of a stack, laid out once where it ends up; it grows out of the
 * baseline by scaling (no layout each frame): pieces above it scale from the
 * baseline up, the shortfall below it from the baseline down.
 */
function Seg({ h, bottom, color, delay, dim, below }: { h: number; bottom: number; color: string; delay: number; dim: boolean; below?: boolean }) {
  const std = useStd();
  const g = useSharedValue(0);
  const o = useSharedValue(1);
  const replay = useReplay();
  // in its turn, and again when the bars change or their page comes back
  useEffect(() => {
    g.set(0);
    g.set(withDelay(delay, timed(1, 500)));
  }, [h, bottom, delay, replay, g]);
  useEffect(() => { o.set(micro(dim ? 0.36 : 1)); }, [dim, o]);
  const rise = bottom - (PLOT - BASE); // how far its bottom sits above the baseline
  const a = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: below ? [{ scaleY: g.value }] : [{ translateY: rise * (1 - g.value) }, { scaleY: g.value }],
  }));
  return <Animated.View style={[{ position: 'absolute', left: 0, right: 0, height: h, bottom, borderRadius: 2.5, backgroundColor: color, transformOrigin: below ? 'top' : 'bottom' },
    // スタンダード: square pieces, each edged in thin ink
    std && h > 0 && { borderRadius: 0, boxShadow: ring(1) }, a]} />;
}

export function StackedBars() {
  const t = useT();
  const std = useStd();
  const [mode, setMode] = useState<Mode>('day');
  const sessions = useStore((s) => s.sessions);
  const series = useSeries(useStore((s) => s.chart.detail));
  const data = useMemo(() => ({ day: build('day', sessions, series), week: build('week', sessions, series) }), [sessions, series]);
  const cols = data[mode];
  const [w, setW] = useState(0);
  const [hot, setHot] = useState<number | null>(null);
  const colW = w ? (w - GAP * (N - 1)) / N : 0;
  const maxUp = Math.max(...cols.map((c) => c.total));
  const maxShort = Math.max(1, ...cols.map((c) => c.short));
  const up = (m: number) => (m / maxUp) * UP;
  const down = (m: number) => (m / maxShort) * DOWN;
  const total = cols.reduce((a, c) => a + c.total, 0) / 60;

  // Tooltip glides between columns; it flips to the left near the right edge.
  const tipX = useSharedValue(0);
  const tipO = useSharedValue(0);
  const ringO = useSharedValue(0);
  useEffect(() => {
    if (hot === null || !colW) {
      tipO.set(micro(0));
      ringO.set(micro(0));
      return;
    }
    const left = hot * (colW + GAP);
    let x = left + colW + 10;
    if (x + TIP_W > w) x = left - TIP_W - 10;
    tipX.set(tipO.get() < 0.05 ? x : micro(x));
    tipO.set(micro(1));
    ringO.set(micro(1));
  }, [hot, colW, w, tipX, tipO, ringO]);
  const tipA = useAnimatedStyle(() => ({ opacity: tipO.value, transform: [{ translateX: tipX.value }] }));
  const ringA = useAnimatedStyle(() => ({ opacity: ringO.value }));

  const geo = useRef({ w: 0 });
  useEffect(() => { geo.current.w = w; }, [w]);
  // The responder is created once; its handlers read refs only when a gesture fires, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => {
    let last: number | null = null;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const at = (x: number) => (geo.current.w ? Math.max(0, Math.min(N - 1, Math.floor((x / geo.current.w) * N))) : null);
    const show = (i: number | null) => {
      clearTimeout(hide);
      if (i !== null && i !== last) haptic.tap();
      last = i;
      setHot(i);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => true,
      onPanResponderGrant: (e) => show(at(e.nativeEvent.locationX)),
      onPanResponderMove: (e) => show(at(e.nativeEvent.locationX)),
      onPanResponderRelease: () => { hide = setTimeout(() => show(null), 1400); },
      onPanResponderTerminate: () => { hide = setTimeout(() => show(null), 500); },
    });
  });

  const c = hot !== null ? cols[hot] : null;
  const top2 = c ? c.parts.map((m, k) => ({ m, k })).sort((a, b) => b.m - a.m).slice(0, 2) : [];
  const ringTop = c ? BASE - up(c.total) - 4 : 0;
  const ringBottom = c ? BASE + (c.short ? down(c.short) + 2 : 0) + 4 : 0;

  return (
    <View style={[{ backgroundColor: t.surface, borderRadius: radius.card, padding: 14, gap: 12 }, lift(t)]}>
      <Pane radius={radius.card} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1 }}>
          {std ? <StdHead title={mode === 'day' ? '勉強時間 · 直近20日' : '勉強時間 · 直近20週'} /> : <Txt size={12} w="500" tone="ink2" lh={16}>{mode === 'day' ? '勉強時間 · 直近20日' : '勉強時間 · 直近20週'}</Txt>}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 2 }}>
            <Rolling value={total.toFixed(1)} size={type.figure + 2} weight="700" />
            <Txt size={12} w="600" tone="ink3" style={{ marginBottom: 4 }}>時間</Txt>
          </View>
        </View>
        <Segmented small value={mode} onChange={(m) => { setHot(null); setMode(m); }} options={[{ v: 'day', label: '日' }, { v: 'week', label: '週' }]} style={std ? undefined : { width: 76 }} />
      </View>

      <View style={{ height: PLOT }} onLayout={(e) => setW(e.nativeEvent.layout.width)} {...pan.panHandlers}
        accessible accessibilityLabel={`${mode === 'day' ? '直近20日' : '直近20週'}の勉強時間。合計${total.toFixed(1)}時間`}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[{ position: 'absolute', left: 0, right: 0, top: BASE, height: 1, backgroundColor: t.line2 }, std && { height: 1.5, backgroundColor: S.ink }]} />
          {colW
            ? cols.map((col, i) => {
                let acc = 0;
                const dim = hot !== null && hot !== i;
                return (
                  <View key={i} style={{ position: 'absolute', left: i * (colW + GAP), width: colW, top: 0, height: PLOT }}>
                    {col.parts.map((m, k) => {
                      const h = Math.max(0, up(m) - 2);
                      const bottom = PLOT - BASE + 1 + up(acc);
                      acc += m;
                      return <Seg key={k} h={h} bottom={bottom} color={series.list[k].c} delay={i * 14} dim={dim} />;
                    })}
                    <Seg below h={col.short ? Math.max(3, down(col.short)) : 0} bottom={PLOT - BASE - 2 - (col.short ? Math.max(3, down(col.short)) : 0)} color={t.red} delay={i * 14} dim={dim} />
                  </View>
                );
              })
            : null}
          {c && colW ? (
            <Animated.View style={[{ position: 'absolute', left: (hot as number) * (colW + GAP) - 3, width: colW + 6, top: ringTop, height: ringBottom - ringTop,
              borderRadius: 5.5, borderWidth: 1, borderColor: t.ink3 }, ringA]} />
          ) : null}
        </View>

        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, width: TIP_W, paddingVertical: 8, paddingHorizontal: 10, gap: 4,
          borderRadius: 12, backgroundColor: t.surface, borderWidth: t.dark ? 1 : 0, borderColor: t.line2 }, lift(t, 2), tipA]}>
          {c ? (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt size={12} tone="ink3" lh={16}>{mode === 'day' ? c.label : `${c.label}の週`}</Txt>
                <Txt size={12} w="600" num lh={16}>{hmLabel(c.total)}</Txt>
              </View>
              {top2.map(({ m, k }) => (
                <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 2.5, backgroundColor: series.list[k].c }} />
                  <Txt size={12} lh={16} numberOfLines={1} style={{ flex: 1 }}>{series.list[k].name}</Txt>
                  <Txt size={12} num lh={16}>{hmLabel(m)}</Txt>
                </View>
              ))}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 2.5, backgroundColor: c.short ? t.red : t.green }} />
                <Txt size={12} lh={16} numberOfLines={1} style={{ flex: 1 }}>{c.short ? '目標まで' : '目標'}</Txt>
                <Txt size={12} num lh={16} color={c.short ? t.red : t.greenInk}>{c.short ? `−${hmLabel(c.short)}` : '達成'}</Txt>
              </View>
            </>
          ) : null}
        </Animated.View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 }} pointerEvents="none">
        <Txt size={10} tone="ink3" num lh={12}>{cols[0].label}</Txt>
        <Txt size={10} tone="ink3" num lh={12}>{cols[N - 1].label}</Txt>
      </View>
      {/* legend, storage-style */}
      <View style={[{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4, paddingTop: 10, borderTopWidth: hair, borderTopColor: t.line }, std && { borderTopWidth: 1.5, rowGap: 6 }]} pointerEvents="none">
        {series.list.filter((x, k) => cols.some((c) => c.parts[k] > 0)).map((x) => (
          <View key={x.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: x.c }, std && { width: 8, height: 8, borderRadius: 0, boxShadow: ring(1.5) }]} />
            <Txt size={11} tone="ink2" lh={14}>{x.name}</Txt>
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.red }, std && { width: 8, height: 8, borderRadius: 0, boxShadow: ring(1.5) }]} />
          <Txt size={11} tone="ink2" lh={14}>目標に足りない分</Txt>
        </View>
      </View>
    </View>
  );
}
