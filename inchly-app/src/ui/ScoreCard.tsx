import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { rng, TODAY } from '../data';
import { lift, radius, type, useT } from '../theme';
import { haptic, Txt } from './base';
import { Rolling } from './Rolling';

// A value card with a line you can scrub and a time-window switch.
// Here: weekly mock-test deviation scores.
const PLOT_H = 112;
const AXIS = 30; // right gutter for the value labels

type Win = '3m' | '6m' | '1y';
const WINS: { v: Win; label: string; n: number; from: string }[] = [
  { v: '3m', label: '3か月', n: 13, from: '3か月前から' },
  { v: '6m', label: '半年', n: 26, from: '半年前から' },
  { v: '1y', label: '1年', n: 52, from: '1年前から' },
];

function series(): number[] {
  const r = rng(41);
  const out: number[] = [];
  let v = 55.2;
  for (let i = 0; i < 52; i++) {
    v += (r() - 0.38) * 1.1;
    out.push(Math.round(v * 10) / 10);
  }
  // land on the latest real result
  const shift = 64.8 - out[51];
  return out.map((x, i) => Math.round((x + (shift * i) / 51) * 10) / 10);
}
const weekLabel = (back: number) => {
  const d = new Date(TODAY);
  d.setDate(TODAY.getDate() - back * 7);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};

/** Catmull-Rom through the points, as cubic Béziers. */
function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export function ScoreCard() {
  const t = useT();
  const [data] = useState(series);
  const [win, setWin] = useState<Win>('3m');
  const W = WINS.find((x) => x.v === win)!;
  const pts = data.slice(-W.n);
  const [w, setW] = useState(0);
  const [hot, setHot] = useState<number | null>(null);

  // ---- line geometry
  const lo = Math.min(...pts) - 0.6, hi = Math.max(...pts) + 0.6;
  const X = (i: number) => (w - AXIS - 8) * (i / (pts.length - 1)) + 2;
  // three quiet gridlines with their values, like a trading chart
  const grid = [hi - 0.6, (lo + hi) / 2, lo + 0.6].map((v) => ({ v, y: 6 + (PLOT_H - 12) * (1 - (v - lo) / (hi - lo)) }));
  const Y = (v: number) => 6 + (PLOT_H - 12) * (1 - (v - lo) / (hi - lo));
  const xy = useMemo(() => pts.map((v, i) => [X(i), Y(v)] as [number, number]), [pts, w]); // eslint-disable-line react-hooks/exhaustive-deps
  const path = w ? smoothPath(xy) : '';
  const idx = hot ?? pts.length - 1;
  const shown = pts[idx];
  const delta = shown - pts[0];

  // ---- scrub: press or drag across the plot
  const geo = useRef({ w: 0, n: 0 });
  useEffect(() => { geo.current = { w, n: pts.length }; }, [w, pts.length]);
  // The responder is created once; its handlers read refs only when a gesture fires, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [scrub] = useState(() => {
    let last: number | null = null;
    const at = (x: number) => {
      const { w: ww, n } = geo.current;
      return ww ? Math.max(0, Math.min(n - 1, Math.round(((x - 2) / (ww - AXIS - 8)) * (n - 1)))) : null;
    };
    const show = (i: number | null) => { if (i !== null && i !== last) haptic.tap(); last = i; setHot(i); };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => true,
      onPanResponderGrant: (e) => show(at(e.nativeEvent.locationX)),
      onPanResponderMove: (e) => show(at(e.nativeEvent.locationX)),
      onPanResponderRelease: () => show(null),
      onPanResponderTerminate: () => show(null),
    });
  });

  // ---- window switch: a grey pill slides under the active label
  const [boxW, setBoxW] = useState(0);
  const pillX = useSharedValue(0);
  const wi = WINS.findIndex((x) => x.v === win);
  useEffect(() => { if (boxW) pillX.set(withSpring((boxW / 3) * wi, { duration: 420, dampingRatio: 0.72 })); }, [wi, boxW, pillX]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: pillX.value }] }));

  const [whole, dec] = shown.toFixed(1).split('.');
  return (
    <View style={[{ borderRadius: radius.card, backgroundColor: t.surface }, lift(t)]}>
      <View style={{ paddingTop: 14, paddingHorizontal: 14, paddingBottom: 12, borderRadius: radius.card, backgroundColor: t.surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.ink }} />
          <Txt size={12} w="500" tone="ink2" style={{ flex: 1 }}>全統記述模試 · 偏差値</Txt>
          <Txt size={11} tone="ink3">{hot === null ? '最新' : weekLabel(pts.length - 1 - idx)}</Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }} accessible accessibilityLabel={`偏差値 ${shown}`}>
            <Rolling value={whole} size={type.figure + 2} weight="700" />
            <Txt num size={18} w="700" tone="ink3" style={{ marginBottom: 2 }}>.{dec}</Txt>
          </View>
          <Txt num size={12} w="600" lh={16} color={delta >= 0 ? t.greenInk : t.red} style={{ marginBottom: 5 }}>{`${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}`}</Txt>
          <Txt size={11} lh={16} tone="ink3" style={{ marginBottom: 5 }}>{W.from}</Txt>
        </View>

        <View style={{ height: PLOT_H, marginTop: 16, marginBottom: 4 }} onLayout={(e) => setW(e.nativeEvent.layout.width)} {...scrub.panHandlers}
          accessible accessibilityLabel={`偏差値の推移。${W.label}で${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)}`}>
          {w ? (
            <Animated.View key={win + data.length + data[data.length - 1]} entering={FadeIn.duration(260)} pointerEvents="none" style={{ flex: 1 }}>
              <Svg width={w} height={PLOT_H}>
                <Defs>
                  <LinearGradient id="pullArea" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={t.ink} stopOpacity={0.12} />
                    <Stop offset="1" stopColor={t.ink} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                {grid.map((g) => <Line key={g.v} x1={0} x2={w - AXIS + 2} y1={g.y} y2={g.y} stroke={t.line2} strokeWidth={0.75} strokeDasharray="2 4" />)}
                <Path d={`${path}L${xy[xy.length - 1][0]} ${PLOT_H}L${xy[0][0]} ${PLOT_H}Z`} fill="url(#pullArea)" />
                <Path d={path} fill="none" stroke={t.ink} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
                {hot !== null ? <Line x1={xy[idx][0]} x2={xy[idx][0]} y1={0} y2={PLOT_H} stroke={t.ink} strokeWidth={0.75} strokeDasharray="2 3" opacity={0.5} /> : null}
              </Svg>
              {grid.map((g) => (
                <Txt key={g.v} num size={10} lh={12} tone="ink3" style={{ position: 'absolute', right: 0, top: g.y - 6, width: AXIS - 4, textAlign: 'right' }}>{g.v.toFixed(1)}</Txt>
              ))}
              <View style={{ position: 'absolute', left: xy[idx][0] - 4, top: xy[idx][1] - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: t.ink, borderWidth: 1.5, borderColor: t.surface,
                boxShadow: '0px 0px 0px 3px rgba(18,20,23,0.12)' }} />
              {/* the value under your finger, in a small dark tag */}
              {hot !== null ? (
                <View pointerEvents="none" style={{ position: 'absolute', top: Math.max(-14, xy[idx][1] - 34), left: Math.max(0, Math.min(w - AXIS - 104, xy[idx][0] - 52)), width: 104, alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, height: 22, borderRadius: 6, backgroundColor: t.ink }}>
                    <Txt size={10.5} lh={13} color={t.dark ? t.ink3 : 'rgba(255,255,255,0.6)'}>{weekLabel(pts.length - 1 - idx)}</Txt>
                    <Txt num size={11} w="700" lh={13} color={t.onInk}>{shown.toFixed(1)}</Txt>
                  </View>
                </View>
              ) : null}
            </Animated.View>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginRight: AXIS }} pointerEvents="none">
          {[pts.length - 1, Math.floor((pts.length - 1) / 2), 0].map((b) => <Txt key={b} size={10} lh={12} tone="ink3">{weekLabel(b)}</Txt>)}
        </View>
        <View style={{ flexDirection: 'row', height: 28, marginTop: 12, padding: 2, borderRadius: 14, backgroundColor: t.sunken }} onLayout={(e) => setBoxW(e.nativeEvent.layout.width - 4)} accessibilityRole="tablist">
          {boxW ? <Animated.View style={[{ position: 'absolute', left: 2, top: 2, width: boxW / 3, height: 24, borderRadius: 12, backgroundColor: t.surface, boxShadow: '0px 1px 2px rgba(15,23,42,0.12)' }, pill]} /> : null}
          {WINS.map((x) => (
            <Pressable key={x.v} onPress={() => { if (x.v !== win) { haptic.tap(); setHot(null); setWin(x.v); } }} accessibilityRole="tab" accessibilityState={{ selected: x.v === win }}
              style={({ pressed }) => ({ flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}>
              <Txt size={11.5} w="600" color={x.v === win ? t.ink : t.ink3}>{x.label}</Txt>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

