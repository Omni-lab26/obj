import { useEffect, useMemo, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { rng, SUBJ } from '@/data';
import { ease, font, useT } from '@/theme';
import { dot, haptic, Txt } from '@/ui/base';

export type Period = { key: 'week' | 'month'; x: string[]; v: number[] };

// Splits a day's hours across subjects, the same way for the same day every time.
export function splitDay(val: number, seed: number) {
  const r = rng(seed);
  const w = SUBJ.map(() => 0.4 + r());
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map((x) => (x / sum) * val);
}

const H = 170;
const AXIS = 22;
const MAX = 6;
const TIP_W = 150;

function Bar({ parts, i, hot, dim, period }: { parts: number[]; i: number; hot: boolean; dim: boolean; period: string }) {
  const t = useT();
  const s = useSharedValue(0);
  useEffect(() => {
    s.value = 0;
    s.value = withDelay(i * 22, withTiming(1, { duration: 500, easing: ease.out }));
  }, [period, i, s]);
  const a = useAnimatedStyle(() => ({ transform: [{ scaleY: s.value }] }));
  return (
    <View style={{ flex: 1, height: '100%', justifyContent: 'flex-end', opacity: dim && !hot ? 0.35 : 1 }}>
      {hot ? <View style={{ position: 'absolute', top: -4, bottom: -4, left: -3, right: -3, borderRadius: 8, borderWidth: 1.5, borderColor: t.ink }} /> : null}
      <Animated.View style={[{ gap: 2, flexDirection: 'column-reverse', transformOrigin: 'bottom' }, a]}>
        {parts.map((p, k) => (
          <View key={k} style={{ height: Math.max(0, (p / MAX) * (H - AXIS) - 2), borderRadius: 3, backgroundColor: SUBJ[k].c }} />
        ))}
      </Animated.View>
    </View>
  );
}

/** Stacked bars by subject. Press and drag across the chart; a tooltip glides beside the bar under your finger. */
export function StackedBars({ period }: { period: Period }) {
  const t = useT();
  const [w, setW] = useState(0);
  const [hot, setHot] = useState<number | null>(null);
  const n = period.v.length;
  const parts = useMemo(() => period.v.map((v, i) => splitDay(v, i + 3)), [period]);
  const gap = n > 10 ? 3 : 5;
  const colW = w ? (w - gap * (n - 1)) / n : 0;
  const cw = useSharedValue(0); // chart width, readable from gesture callbacks
  useEffect(() => { cw.value = w; }, [w, cw]);
  const tipX = useSharedValue(0);
  const tipO = useSharedValue(0);

  useEffect(() => {
    if (hot === null || !colW) { tipO.value = withTiming(0, { duration: 160 }); return; }
    const barL = hot * (colW + gap);
    let x = barL + colW + 8;
    if (x + TIP_W > w) x = barL - TIP_W - 8;
    tipX.value = tipO.value === 0 ? x : withTiming(x, { duration: 180, easing: ease.out });
    tipO.value = withTiming(1, { duration: 160 });
  }, [hot, colW, gap, w, tipX, tipO]);

  // Gesture state lives in this closure; the chart is remounted per period, so n is fixed.
  const [pan] = useState(() => {
    let last: number | null = null;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const at = (x: number) => (cw.value ? Math.max(0, Math.min(n - 1, Math.floor((x / cw.value) * n))) : null);
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
      onPanResponderRelease: () => { hide = setTimeout(() => show(null), 1200); },
      onPanResponderTerminate: () => { hide = setTimeout(() => show(null), 400); },
    });
  });
  const tipA = useAnimatedStyle(() => ({ opacity: tipO.value, transform: [{ translateX: tipX.value }] }));

  const labels = period.key === 'week' ? period.x : [period.x[0], period.x[6], period.x[13], period.x[20]].map((x) => x + '日');
  return (
    <View style={{ height: H }} accessibilityLabel="科目ごとの勉強時間の棒グラフ">
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} {...pan.panHandlers} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: AXIS }}>
        <View pointerEvents="none" style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap }}>
          {parts.map((p, i) => <Bar key={`${period.key}-${i}`} parts={p} i={i} hot={hot === i} dim={hot !== null} period={period.key} />)}
        </View>
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between' }}>
        {labels.map((x) => <Txt key={x} num size={11} tone="ink3">{x}</Txt>)}
      </View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, width: TIP_W, padding: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: t.surface,
        borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.line2, shadowColor: '#000', shadowOpacity: t.dark ? 0.4 : 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 }, tipA]}>
        {hot !== null ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Txt size={12.5} w="700">{period.key === 'week' ? `${period.x[hot]}曜日` : `10月${period.x[hot]}日`}</Txt>
              <Txt size={12.5} w="600" num>{period.v[hot].toFixed(1)}h</Txt>
            </View>
            {parts[hot].map((p, k) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {dot(SUBJ[k].c)}
                <Txt size={12.5} tone="ink2" style={{ flex: 1 }}>{SUBJ[k].name}</Txt>
                <Txt size={12.5} num>{Math.round(p * 60)}分</Txt>
              </View>
            ))}
          </>
        ) : null}
      </Animated.View>
    </View>
  );
}

/** Mock-exam deviation score over five months, with a dashed target line. */
export function DeviationChart() {
  const t = useT();
  const [w, setW] = useState(0);
  const pts: [string, number][] = [['6月', 58.2], ['7月', 60.1], ['8月', 61.4], ['9月', 63.0], ['10月', 64.8]];
  const Hc = 120, lo = 56, hi = 66;
  const X = (i: number) => 14 + (i * (w - 64)) / 4;
  const Y = (y: number) => 6 + Hc - ((y - lo) / (hi - lo)) * Hc;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: Hc + 30 }} accessible accessibilityLabel="偏差値は6月58.2から10月64.8">
      {w ? (
        <Svg width={w} height={Hc + 30}>
          <Line x1={0} x2={w} y1={Y(65)} y2={Y(65)} stroke={t.ink3} strokeDasharray="3 4" strokeWidth={1} />
          <SvgText x={w} y={Y(65) - 6} textAnchor="end" fontSize={11} fill={t.ink3}>目標 65.0</SvgText>
          <Polyline points={pts.map((p, i) => `${X(i)},${Y(p[1])}`).join(' ')} fill="none" stroke={t.green} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((p, i) => (
            <Circle key={p[0]} cx={X(i)} cy={Y(p[1])} r={i === 4 ? 4.5 : 3} fill={i === 4 ? t.green : t.canvas} stroke={t.green} strokeWidth={2} />
          ))}
          {pts.map((p, i) => (
            <SvgText key={'l' + p[0]} x={X(i)} y={Hc + 26} textAnchor="middle" fontSize={11} fill={t.ink3}>{p[0]}</SvgText>
          ))}
          <SvgText x={X(4) + 10} y={Y(64.8) + 4} fontSize={13} fontWeight="700" fill={t.ink} fontFamily={font.num7}>64.8</SvgText>
        </Svg>
      ) : null}
    </View>
  );
}
