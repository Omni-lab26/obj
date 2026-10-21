import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { dayLog, pad, SUBJ, TODAY } from '../data';
import { ease, useT } from '../theme';
import { haptic, Txt } from './base';
import { Rolling } from './Rolling';
import { Segmented } from './Tabs';

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

function build(mode: Mode): Col[] {
  const goal = mode === 'day' ? 180 : 1260;
  return Array.from({ length: N }, (_, i) => {
    const back = N - 1 - i;
    const span = mode === 'day' ? 1 : 7;
    const days = Array.from({ length: span }, (_, k) => dayLog(back * span + k));
    const parts = SUBJ.map((_, k) => days.reduce((a, d) => a + d.parts[k], 0));
    const total = parts.reduce((a, b) => a + b, 0);
    const d = new Date(TODAY);
    d.setDate(TODAY.getDate() - back * span);
    return { label: `${d.getMonth() + 1}月${d.getDate()}日`, parts, total, short: Math.max(0, goal - total) };
  });
}
const hmLabel = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? pad(m % 60) + '分' : ''}` : `${m}分`);

function Seg({ h, bottom, color, delay, dim }: { h: number; bottom: number; color: string; delay: number; dim: boolean }) {
  const hh = useSharedValue(0);
  const bb = useSharedValue(bottom);
  const o = useSharedValue(1);
  useEffect(() => {
    hh.set(withDelay(delay, withTiming(h, { duration: 600, easing: ease.out })));
    bb.set(withDelay(delay, withTiming(bottom, { duration: 600, easing: ease.out })));
  }, [h, bottom, delay, hh, bb]);
  useEffect(() => { o.set(withTiming(dim ? 0.36 : 1, { duration: 160 })); }, [dim, o]);
  const a = useAnimatedStyle(() => ({ height: hh.value, bottom: bb.value, opacity: o.value }));
  return <Animated.View style={[{ position: 'absolute', left: 0, right: 0, borderRadius: 2.5, backgroundColor: color }, a]} />;
}

export function StackedBars() {
  const t = useT();
  const [mode, setMode] = useState<Mode>('day');
  const data = useMemo(() => ({ day: build('day'), week: build('week') }), []);
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
      tipO.set(withTiming(0, { duration: 160 }));
      ringO.set(withTiming(0, { duration: 160 }));
      return;
    }
    const left = hot * (colW + GAP);
    let x = left + colW + 10;
    if (x + TIP_W > w) x = left - TIP_W - 10;
    tipX.set(tipO.get() < 0.05 ? x : withTiming(x, { duration: 140, easing: ease.out }));
    tipO.set(withTiming(1, { duration: 160 }));
    ringO.set(withTiming(1, { duration: 160 }));
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
    <View style={{ backgroundColor: t.surface, borderRadius: 20, padding: 16, gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Txt size={14} w="500" lh={18}>勉強時間</Txt>
          <Txt size={12} tone="ink3" lh={16}>{mode === 'day' ? '直近20日' : '直近20週'}</Txt>
        </View>
        <Segmented small value={mode} onChange={(m) => { setHot(null); setMode(m); }} options={[{ v: 'day', label: '日' }, { v: 'week', label: '週' }]} style={{ width: 96 }} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: -4 }}>
        <Rolling value={total.toFixed(1)} size={30} weight="500" />
        <Txt size={13} tone="ink3" style={{ marginBottom: 4 }}>時間</Txt>
      </View>

      <View style={{ height: PLOT }} onLayout={(e) => setW(e.nativeEvent.layout.width)} {...pan.panHandlers}
        accessible accessibilityLabel={`${mode === 'day' ? '直近20日' : '直近20週'}の勉強時間。合計${total.toFixed(1)}時間`}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: BASE, height: 1, backgroundColor: t.line2 }} />
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
                      return <Seg key={k} h={h} bottom={bottom} color={SUBJ[k].c} delay={i * 14} dim={dim} />;
                    })}
                    <Seg h={col.short ? Math.max(3, down(col.short)) : 0} bottom={PLOT - BASE - 2 - (col.short ? Math.max(3, down(col.short)) : 0)} color={t.red} delay={i * 14} dim={dim} />
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
          borderRadius: 10, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line2 }, tipA]}>
          {c ? (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt size={12} tone="ink3" lh={16}>{mode === 'day' ? c.label : `${c.label}の週`}</Txt>
                <Txt size={12} w="600" num lh={16}>{hmLabel(c.total)}</Txt>
              </View>
              {top2.map(({ m, k }) => (
                <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 2.5, backgroundColor: SUBJ[k].c }} />
                  <Txt size={12} lh={16} numberOfLines={1} style={{ flex: 1 }}>{SUBJ[k].name}</Txt>
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

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -8 }} pointerEvents="none">
        <Txt size={11} tone="ink3" num lh={14}>{cols[0].label}</Txt>
        <Txt size={11} tone="ink3" num lh={14}>{cols[N - 1].label}</Txt>
      </View>
    </View>
  );
}
