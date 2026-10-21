import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { ease, font, useT } from '../theme';
import { haptic, Txt } from './base';
import { Inch } from './Sticker';

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
  const end = Math.max(goal + 60, Math.ceil((minutes + 30) / 60) * 60);
  const x = (m: number) => (m / end) * w;
  const reveal = useSharedValue(0);
  useEffect(() => { if (w) reveal.set(withDelay(150, withTiming(x(Math.min(minutes, end)), { duration: 900, easing: ease.out }))); }, [w, minutes]); // eslint-disable-line react-hooks/exhaustive-deps
  const ra = useAnimatedStyle(() => ({ width: reveal.value }));
  // Inch rides the end of today's bar: the brand's two halves, the worm and the ruler, in one place.
  const ia = useAnimatedStyle(() => ({ transform: [{ translateX: reveal.value - 30 }] }));
  const segs = parts.filter((p) => p.min > 0);
  const starts = segs.map((_, i) => segs.slice(0, i).reduce((a, p) => a + p.min, 0));
  const reached = minutes >= goal;

  const geo = useRef({ w: 0, starts, segs });
  useEffect(() => { geo.current = { w, starts, segs }; });
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => {
    let last: number | null = null;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const at = (px: number) => {
      const { w: ww, starts: st, segs: sg } = geo.current;
      if (!ww) return null;
      const m = (px / ww) * end;
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
            <Animated.View style={[{ position: 'absolute', top: 2, left: 0, height: BAR + 12, overflow: 'hidden' }, ra]}>
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
            {/* ruler: a hairline tick every quarter hour, longer on the hour */}
            {Array.from({ length: end / 15 + 1 }, (_, i) => {
              const m = i * 15;
              const hour = m % 60 === 0;
              return <View key={i} style={{ position: 'absolute', top: 23, left: Math.min(w - 1, x(m)), width: 1, height: hour ? 6 : 3, backgroundColor: t.ink3, opacity: hour ? 0.7 : 0.4 }} />;
            })}
            {Array.from({ length: end / 60 + 1 }, (_, h) => (h * 60 === goal ? null : (
              <Txt key={h} num size={10} tone="ink3" lh={12}
                style={{ position: 'absolute', top: 30, left: Math.min(w - 16, Math.max(0, x(h * 60) - 8)), width: 16, textAlign: h === 0 ? 'left' : h * 60 === end ? 'right' : 'center' }}>
                {h === 0 ? '0' : `${h}h`}
              </Txt>
            )))}
            {/* goal: a hairline notch through the bar */}
            <View style={{ position: 'absolute', top: 3, left: x(goal) - 0.75, width: 1.5, height: BAR + 13, borderRadius: 1, backgroundColor: reached ? t.greenInk : t.ink }} />
            <Txt size={10} w="700" lh={12} tone={reached ? 'greenInk' : 'ink'} style={{ position: 'absolute', top: 30, left: Math.min(w - 50, x(goal) - 25), width: 50, textAlign: 'center' }}>{`目標 ${goal / 60}h`}</Txt>
            <Animated.View style={[{ position: 'absolute', left: 0, top: -27 }, ia]}>
              <Inch pose="arch" eyes={reached ? 'happy' : 'dot'} size={36} border={false} />
            </Animated.View>
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginTop: 8 }}>
        {segs.map((p) => (
          <View key={p.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.c }} />
            <Txt size={13} tone="ink2" lh={17}>{p.name}</Txt>
            <Txt num size={13} tone="ink3" lh={17}>{fmt(p.min)}</Txt>
          </View>
        ))}
      </View>
    </View>
  );
}
