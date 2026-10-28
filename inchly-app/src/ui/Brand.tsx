import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay } from 'react-native-reanimated';

import { font, useT } from '../theme';
import { useReplay } from './appear';
import { haptic, Txt } from './base';
import { timed } from './motion';

// Inch-ly: "a little at a time". The brand's one motif is the measuring tape —
// the same ticks as the timer's ruler — used for the wordmark and for today's progress.

/** Wordmark: three ruler ticks of rising height, then "inchly". */
export function Wordmark({ size = 21, color }: { size?: number; color?: string }) {
  const t = useT();
  const u = size / 21;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 7 * u }} accessible accessibilityLabel="Inchly">
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2.5 * u, marginBottom: 4 * u }}>
        {[7, 11, 16].map((h, i) => (
          <View key={i} style={{ width: 3 * u, height: h * u, borderRadius: 1.5 * u, backgroundColor: i === 2 ? t.green : color ?? t.ink }} />
        ))}
      </View>
      <Txt style={{ fontFamily: font.rounded, fontWeight: '800', fontSize: size, lineHeight: size * 1.15, letterSpacing: -0.03 * size, color: color ?? t.ink }}>inchly</Txt>
    </View>
  );
}

/**
 * Today's tape, a storage bar on a ruler: today's minutes as subject segments
 * (hairline gaps between them), an empty track up to a little past the goal,
 * quarter-hour ticks underneath and a hairline notch at the goal. Press and
 * slide along it: the segment under your finger lifts and a small tag names it.
 */
export function InchTape({ minutes, goal, parts }: { minutes: number; goal: number; parts: { name: string; c: string; min: number }[] }) {
  const t = useT();
  const [w, setW] = useState(0);
  const [hot, setHot] = useState<number | null>(null);
  // the scale stretches with a long day; labels and ticks thin out so they never crowd
  const rough = Math.max(goal + 60, Math.ceil((minutes + 30) / 60) * 60);
  const perHour = w ? w / (rough / 60) : 60;
  const step = [1, 2, 3, 4, 6, 8, 12].find((h) => perHour * h >= 34) ?? 12; // hours between labels
  const end = Math.ceil(rough / (step * 60)) * step * 60;
  const px = w ? w / (end / 60) : 60; // px per hour on the final scale
  const tick = px >= 64 ? 15 : px >= 32 ? 30 : 60; // minutes between small ticks
  const x = (m: number) => (m / end) * w;
  const reveal = useSharedValue(0);
  const replay = useReplay();
  useEffect(() => {
    if (!w) return;
    reveal.set(0);
    reveal.set(withDelay(150, timed(x(Math.min(minutes, end)), 500)));
  }, [w, minutes, end, replay]); // eslint-disable-line react-hooks/exhaustive-deps
  // the reveal is a window sliding open, moved rather than resized (no layout each frame): the window slides in from the left by what's
  // still hidden, and what's in it slides back the same amount, so the segments stay put
  const ra = useAnimatedStyle(() => ({ transform: [{ translateX: reveal.value - w }] }));
  const rb = useAnimatedStyle(() => ({ transform: [{ translateX: w - reveal.value }] }));
  const segs = parts.filter((p) => p.min > 0);
  const starts = segs.map((_, i) => segs.slice(0, i).reduce((a, p) => a + p.min, 0));
  const reached = minutes >= goal;

  const geo = useRef({ w: 0, starts, segs, end });
  useEffect(() => { geo.current = { w, starts, segs, end }; });
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => {
    let last: number | null = null;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const at = (px: number) => {
      const { w: ww, starts: st, segs: sg, end: e } = geo.current;
      if (!ww) return null;
      const m = (px / ww) * e;
      for (let i = sg.length - 1; i >= 0; i--) if (m >= st[i] && m <= st[i] + sg[i].min + 4) return i;
      return null;
    };
    const show = (i: number | null) => { clearTimeout(hide); if (i !== null && i !== last) haptic.tap(); last = i; setHot(i); };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => true,
      onPanResponderGrant: (e) => show(at(e.nativeEvent.locationX)),
      onPanResponderMove: (e) => show(at(e.nativeEvent.locationX)),
      onPanResponderRelease: () => { hide = setTimeout(() => show(null), 1200); },
      onPanResponderTerminate: () => show(null),
    });
  });

  const fmt = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  const BAR = 10;
  return (
    <View accessible accessibilityLabel={`今日 ${Math.floor(minutes / 60)}時間${minutes % 60}分。目標は${goal / 60}時間。${segs.map((p) => `${p.name} ${p.min}分`).join('、')}`}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: 40 }} {...pan.panHandlers}>
        {w ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {/* track */}
            <View style={{ position: 'absolute', top: 8, left: 0, right: 0, height: BAR, borderRadius: BAR / 2, backgroundColor: t.sunken }} />
            {/* studied: subject segments, revealed left to right */}
            <Animated.View style={[{ position: 'absolute', top: 2, left: 0, width: w, height: BAR + 12, overflow: 'hidden' }, ra]}>
              <Animated.View style={[StyleSheet.absoluteFill, rb]}>
              {segs.map((p, i) => {
                const on = hot === i;
                const first = i === 0, lastSeg = i === segs.length - 1;
                return (
                  <View key={p.name} style={{ position: 'absolute', left: x(starts[i]) + (first ? 0 : 1), width: Math.max(2, x(p.min) - (first ? 1 : 2)),
                    top: on ? 3 : 6, height: on ? BAR + 6 : BAR, backgroundColor: p.c, opacity: hot === null || on ? 1 : 0.4,
                    borderTopLeftRadius: first ? BAR / 2 : 2, borderBottomLeftRadius: first ? BAR / 2 : 2, borderTopRightRadius: lastSeg ? BAR / 2 : 2, borderBottomRightRadius: lastSeg ? BAR / 2 : 2 }} />
                );
              })}
              </Animated.View>
            </Animated.View>
            {/* ruler: small ticks as room allows, a longer one at each label */}
            {Array.from({ length: end / tick + 1 }, (_, i) => {
              const m = i * tick;
              const major = m % (step * 60) === 0;
              return <View key={i} style={{ position: 'absolute', top: 23, left: Math.min(w - 1, x(m)), width: 1, height: major ? 6 : 3, backgroundColor: t.ink3, opacity: major ? 0.7 : 0.4 }} />;
            })}
            {Array.from({ length: end / (step * 60) + 1 }, (_, k) => {
              const h = k * step;
              // the goal's label wins where they'd overlap
              if (h * 60 === goal || Math.abs(x(h * 60) - x(goal)) < 30) return null;
              return (
                <Txt key={h} num size={10} tone="ink3" lh={12}
                  style={{ position: 'absolute', top: 30, left: Math.min(w - 20, Math.max(0, x(h * 60) - 10)), width: 20, textAlign: h === 0 ? 'left' : h * 60 === end ? 'right' : 'center' }}>
                  {h === 0 ? '0' : `${h}h`}
                </Txt>
              );
            })}
            {/* goal: a hairline notch through the bar */}
            <View style={{ position: 'absolute', top: 3, left: x(goal) - 0.75, width: 1.5, height: BAR + 13, borderRadius: 1, backgroundColor: reached ? t.greenInk : t.ink }} />
            <Txt size={10} w="700" lh={12} tone={reached ? 'greenInk' : 'ink'} style={{ position: 'absolute', top: 30, left: Math.min(w - 50, x(goal) - 25), width: 50, textAlign: 'center' }}>{`目標 ${goal / 60}h`}</Txt>
            {/* tag over the pressed segment */}
            {hot !== null && segs[hot] ? (
              <View style={{ position: 'absolute', top: -26, left: Math.max(0, Math.min(w - 112, x(starts[hot] + segs[hot].min / 2) - 56)), width: 112, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 22, paddingHorizontal: 8, borderRadius: 6, backgroundColor: t.ink }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: segs[hot].c }} />
                  <Txt size={11} w="600" lh={13} color={t.onInk}>{segs[hot].name}</Txt>
                  <Txt num size={11} lh={13} color={t.dark ? t.ink3 : 'rgba(255,255,255,0.6)'}>{fmt(segs[hot].min)}</Txt>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      {/* legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4, marginTop: 6 }}>
        {segs.map((p) => (
          <View key={p.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.c }} />
            <Txt size={11} tone="ink2" lh={14}>{p.name}</Txt>
            <Txt num size={11} tone="ink3" lh={14}>{fmt(p.min)}</Txt>
          </View>
        ))}
        {!reached ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: t.ink3 }} />
            <Txt size={11} tone="ink2" lh={14}>目標まで</Txt>
            <Txt num size={11} tone="ink3" lh={14}>{fmt(goal - minutes)}</Txt>
          </View>
        ) : null}
      </View>
    </View>
  );
}
