import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, View } from 'react-native';
import { Gesture, GestureDetector, NativeGesture } from 'react-native-gesture-handler';
import Animated, { Easing, FadeIn, SharedValue, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Path } from 'react-native-svg';

import { rng, TODAY } from '../data';
import { useT } from '../theme';
import { haptic, Txt } from './base';
import { Rolling } from './Rolling';
import { toast } from './Toast';

// bencho "pull": a value card with a line you can scrub, a time-window switch,
// and pull-to-refresh — pull the card down and it stretches, six dots gather
// at the top; let go past the line and it refreshes, then springs back.
// Here: weekly mock-test deviation scores.
const PLOT_H = 104;
const THRESH = 70; // pull past this to refresh
const HOLD = 58; // where the card waits while refreshing
const DOTS = 6;

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

function Dot({ i, pull, spinning }: { i: number; pull: SharedValue<number>; spinning: boolean }) {
  const t = useT();
  const a = useAnimatedStyle(() => {
    // dots gather one by one as the pull nears the line
    const p = Math.min(1, pull.value / THRESH) * DOTS - i;
    return { opacity: spinning ? 1 : Math.max(0, Math.min(1, p)), transform: [{ scale: spinning ? 1 : 0.6 + 0.4 * Math.max(0, Math.min(1, p)) }] };
  });
  const ang = (i / DOTS) * Math.PI * 2 - Math.PI / 2;
  return (
    <Animated.View style={[{ position: 'absolute', left: 13 + Math.cos(ang) * 15, top: 13 + Math.sin(ang) * 15, width: 4, height: 4, borderRadius: 2,
      backgroundColor: t.ink, opacity: 0.32 }, a]} />
  );
}

export function PullCard({ scrollY, scroll }: { scrollY: SharedValue<number>; scroll: NativeGesture }) {
  const t = useT();
  const [data, setData] = useState(series);
  const [win, setWin] = useState<Win>('3m');
  const W = WINS.find((x) => x.v === win)!;
  const pts = data.slice(-W.n);
  const [w, setW] = useState(0);
  const [hot, setHot] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ---- line geometry
  const lo = Math.min(...pts) - 0.6, hi = Math.max(...pts) + 0.6;
  const X = (i: number) => (w - 12) * (i / (pts.length - 1)) + 2;
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
      return ww ? Math.max(0, Math.min(n - 1, Math.round(((x - 2) / (ww - 12)) * (n - 1)))) : null;
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

  // ---- pull to refresh (only when the page is scrolled to the top)
  const pull = useSharedValue(0);
  const startT = useSharedValue<number | null>(null);
  const armed = useSharedValue(0);
  const spin = useSharedValue(0);
  const busy = useSharedValue(0);
  const finish = () => {
    // a new result arrives: append it and spring back
    setData((d) => {
      const next = Math.round((d[d.length - 1] + 0.5) * 10) / 10;
      return [...d.slice(1), next];
    });
    haptic.success();
    toast('第4回 記述模試の結果を反映しました', '偏差値 +0.5');
    setRefreshing(false);
    busy.set(0);
    pull.set(withSpring(0, { duration: 650, dampingRatio: 0.62 }));
  };
  const begin = () => {
    setRefreshing(true);
    haptic.firm();
    setTimeout(finish, 1300);
  };
  const crossed = () => haptic.soft();
  useEffect(() => {
    spin.set(refreshing ? withRepeat(withTiming(spin.get() + 360, { duration: 900, easing: Easing.linear }), -1, false) : withTiming(0, { duration: 200 }));
  }, [refreshing, spin]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(6)
        .failOffsetX([-14, 14])
        .simultaneousWithExternalGesture(scroll)
        .onUpdate((e) => {
          if (busy.value) return;
          if (scrollY.value > 0.5) { startT.value = null; return; }
          if (startT.value === null) startT.value = e.translationY;
          const dy = Math.max(0, e.translationY - startT.value);
          // rubber band: easy at first, stiffer as it stretches
          pull.value = 150 * (1 - Math.exp(-dy / 190));
          const over = pull.value > THRESH ? 1 : 0;
          if (over !== armed.value) { armed.value = over; if (over) scheduleOnRN(crossed); }
        })
        .onEnd(() => {
          startT.value = null;
          if (busy.value) return;
          if (pull.value > THRESH) {
            busy.value = 1;
            armed.value = 0;
            pull.value = withSpring(HOLD, { duration: 420, dampingRatio: 0.8 });
            scheduleOnRN(begin);
          } else {
            pull.value = withSpring(0, { duration: 500, dampingRatio: 0.7 });
          }
        }),
    // gesture callbacks are worklets; the JS functions are stable for the card's lifetime
    [scroll], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [baseH, setBaseH] = useState(0);
  const card = useAnimatedStyle(() => ({ height: baseH ? baseH + pull.value : undefined }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: pull.value }] }));
  const spinner = useAnimatedStyle(() => ({
    top: Math.max(6, pull.value / 2 - 15),
    opacity: Math.min(1, pull.value / 24),
    transform: [{ rotate: `${spin.value + pull.value * 1.6}deg` }],
  }));

  // ---- window switch: a grey pill slides under the active label
  const [boxW, setBoxW] = useState(0);
  const pillX = useSharedValue(0);
  const wi = WINS.findIndex((x) => x.v === win);
  useEffect(() => { if (boxW) pillX.set(withSpring((boxW / 3) * wi, { duration: 420, dampingRatio: 0.72 })); }, [wi, boxW, pillX]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: pillX.value }] }));

  const [whole, dec] = shown.toFixed(1).split('.');
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ backgroundColor: t.surface, borderRadius: 20, overflow: 'hidden' }, card]}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: '50%', marginLeft: -15, width: 30, height: 30 }, spinner]}>
          {Array.from({ length: DOTS }, (_, i) => <Dot key={i} i={i} pull={pull} spinning={refreshing} />)}
        </Animated.View>
        <Animated.View style={sheet} onLayout={(e) => !baseH && setBaseH(e.nativeEvent.layout.height)}>
          <View style={{ paddingTop: 22, paddingHorizontal: 14, paddingBottom: 12, backgroundColor: t.surface }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }} accessible accessibilityLabel={`偏差値 ${shown}`}>
              <Rolling value={whole} size={30} weight="500" />
              <Txt num size={20} w="500" color={t.ink} style={{ opacity: 0.34, marginBottom: 2 }}>.{dec}</Txt>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <Txt num size={12} lh={18} color={delta >= 0 ? t.greenInk : t.red}>{`${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)} · ${W.from}`}</Txt>
              <Txt size={12} lh={18} tone="ink3">{hot === null ? '最新' : weekLabel(pts.length - 1 - idx)}</Txt>
            </View>

            <View style={{ height: PLOT_H, marginTop: 20, marginBottom: 6 }} onLayout={(e) => setW(e.nativeEvent.layout.width)} {...scrub.panHandlers}
              accessible accessibilityLabel={`偏差値の推移。${W.label}で${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)}`}>
              {w ? (
                <Animated.View key={win + data.length + data[data.length - 1]} entering={FadeIn.duration(260)} pointerEvents="none" style={{ flex: 1 }}>
                  <Svg width={w} height={PLOT_H}>
                    <Path d={path} fill="none" stroke={t.green} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  {hot !== null ? <View style={{ position: 'absolute', left: xy[idx][0] - 0.5, top: 0, bottom: 0, width: 1, backgroundColor: t.green, opacity: 0.28 }} /> : null}
                  <View style={{ position: 'absolute', left: xy[idx][0] - 4.5, top: xy[idx][1] - 4.5, width: 9, height: 9, borderRadius: 5, backgroundColor: t.surface, borderWidth: 2, borderColor: t.green,
                    transform: [{ scale: hot !== null ? 1.25 : 1 }] }} />
                </Animated.View>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', height: 32, marginTop: 10 }} onLayout={(e) => setBoxW(e.nativeEvent.layout.width)} accessibilityRole="tablist">
              {boxW ? <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: boxW / 3, height: 32, borderRadius: 12, backgroundColor: t.sunken }, pill]} /> : null}
              {WINS.map((x) => (
                <Pressable key={x.v} onPress={() => { if (x.v !== win) { haptic.tap(); setHot(null); setWin(x.v); } }} accessibilityRole="tab" accessibilityState={{ selected: x.v === win }}
                  style={({ pressed }) => ({ flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}>
                  <Txt size={12} w="500" tone={x.v === win ? 'ink' : 'ink3'}>{x.label}</Txt>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

