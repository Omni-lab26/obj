import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { ease, font, useT } from '../theme';
import { Txt } from './base';

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
      <Txt style={{ fontFamily: font.num7, fontSize: size, lineHeight: size * 1.15, letterSpacing: -0.04 * size, color: color ?? t.ink }}>inchly</Txt>
    </View>
  );
}

/**
 * Today's tape: a ruler from 0 to a little past the goal. Ticks every 15 minutes,
 * hour marks labelled; the studied part fills green from the left, the goal is a dark notch.
 */
export function InchTape({ minutes, goal }: { minutes: number; goal: number }) {
  const t = useT();
  const [w, setW] = useState(0);
  const end = Math.max(goal + 60, Math.ceil((minutes + 30) / 60) * 60);
  const steps = end / 15;
  const x = (m: number) => (m / end) * w;
  const fill = useSharedValue(0);
  useEffect(() => { if (w) fill.set(withDelay(150, withTiming(x(Math.min(minutes, end)), { duration: 900, easing: ease.out }))); }, [w, minutes]); // eslint-disable-line react-hooks/exhaustive-deps
  const fa = useAnimatedStyle(() => ({ width: fill.value }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: fill.value - 1 }] }));
  const reached = minutes >= goal;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: 50 }}
      accessible accessibilityLabel={`今日 ${Math.floor(minutes / 60)}時間${minutes % 60}分。目標は${goal / 60}時間`}>
      {w ? (
        <>
          {/* the tape */}
          <View style={{ position: 'absolute', top: 6, left: 0, right: 0, height: 12, borderRadius: 4, backgroundColor: t.grass[0], overflow: 'hidden' }}>
            <Animated.View style={[{ height: 12, backgroundColor: t.green }, fa]} />
          </View>
          {/* ticks under the tape */}
          {Array.from({ length: steps + 1 }, (_, i) => {
            const m = i * 15;
            const hour = m % 60 === 0;
            const studied = m <= minutes;
            return (
              <View key={i} style={{ position: 'absolute', top: 20, left: Math.min(w - 1.5, x(m)), width: 1.5, height: hour ? 9 : 5, borderRadius: 1,
                backgroundColor: studied ? t.green : t.ink3, opacity: studied ? 1 : hour ? 0.55 : 0.35 }} />
            );
          })}
          {Array.from({ length: end / 60 + 1 }, (_, h) => (
            <Txt key={h} num size={10.5} tone="ink3" lh={12}
              style={{ position: 'absolute', top: 32, left: Math.min(w - 16, Math.max(0, x(h * 60) - 8)), width: 16, textAlign: h === 0 ? 'left' : 'center' }}>
              {h === 0 ? '0' : `${h}h`}
            </Txt>
          ))}
          {/* goal notch */}
          <View style={{ position: 'absolute', top: 1, left: x(goal) - 1, width: 2, height: 22, borderRadius: 1, backgroundColor: reached ? t.greenInk : t.ink }} />
          <Txt size={10.5} w="600" lh={12} tone={reached ? 'greenInk' : 'ink'}
            style={{ position: 'absolute', top: 32, left: Math.min(w - 40, x(goal) + 4), width: 40 }}>目標</Txt>
          {/* where today is */}
          <Animated.View style={[{ position: 'absolute', top: 2, left: 0, width: 2, height: 20, borderRadius: 1, backgroundColor: t.surface }, knob]} />
        </>
      ) : null}
    </View>
  );
}
