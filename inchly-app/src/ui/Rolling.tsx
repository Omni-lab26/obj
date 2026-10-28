import { useEffect, useRef, useState } from 'react';
import { StyleProp, Text, TextStyle, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { face, useT } from '../theme';
import { fadeOut, layout, M, move } from './motion';

// Odometer digits, after bencho's "rolling counter":
// - each digit is a strip that rolls to its value on iOS's curve and stops there (no bounce),
// - columns start right to left, 45 ms apart (stagger),
// - counting up carries forward (9 → 0 keeps rolling up) and counting down rolls back,
// - a short motion trail stands in for blur (RN has no text blur filter on iOS),
// - a new leading column grows in from zero width; a dropped one fades out.
const STRIP = '01234567890123456789'.split('');
const STAGGER = 45;

const num = (s: string) => {
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

function Col({ d, dir, h, w, delay, style, grow, blur }: { d: number; dir: number; h: number; w: number; delay: number; style: StyleProp<TextStyle>; grow: boolean; blur: boolean }) {
  const pos = useSharedValue(d);
  const width = useSharedValue(grow ? 0 : w);
  const prev = useRef(d);
  useEffect(() => {
    const from = prev.current;
    prev.current = d;
    if (from === d) return;
    // Carry: rolling up past 9 lands on the second copy, then snaps back silently.
    if (dir > 0 && d < from) {
      const snap = () => { pos.set(d); };
      pos.set(withDelay(delay, withTiming(d + 10, M.micro, (done) => { if (done) scheduleOnRN(snap); })));
    } else if (dir < 0 && d > from) {
      pos.set(from + 10);
      pos.set(withDelay(delay, withTiming(d, M.micro)));
    } else {
      pos.set(withDelay(delay, withTiming(d, M.micro)));
    }
  }, [d, dir, delay, pos]);
  useEffect(() => {
    if (!w) return;
    // Only a newly added leading column grows in; the rest take their width at once.
    if (grow) width.set(move(w));
    else width.set(w);
  }, [w, grow, width]);

  const strip = useAnimatedStyle(() => ({ transform: [{ translateY: -pos.value * h }] }));
  // Trail: strongest halfway between two digits, gone at rest.
  const trail = useAnimatedStyle(() => {
    const f = Math.abs(pos.value - Math.round(pos.value));
    return { opacity: blur ? Math.min(0.28, f * 0.8) : 0 };
  });
  const main = useAnimatedStyle(() => {
    const f = Math.abs(pos.value - Math.round(pos.value));
    return { opacity: blur ? 1 - f * 0.45 : 1 };
  });
  const box = useAnimatedStyle(() => ({ width: width.value }));
  const strips = (dy: number) =>
    STRIP.map((x, i) => (
      <Text key={i} style={[style, { height: h, lineHeight: h, textAlign: 'center', transform: dy ? [{ translateY: dy }] : undefined }]}>{x}</Text>
    ));
  return (
    <Animated.View exiting={fadeOut()} layout={layout()} style={[{ height: h, overflow: 'hidden' }, w ? box : null]}>
      <Animated.View style={strip}>
        <Animated.View style={main}>{strips(0)}</Animated.View>
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0 }, trail]} pointerEvents="none">{strips(-h * 0.09)}</Animated.View>
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0 }, trail]} pointerEvents="none">{strips(h * 0.09)}</Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

export function Rolling({
  value, size = 22, weight = '600', color, style, blur = true,
}: { value: string; size?: number; weight?: '200' | '300' | '400' | '500' | '600' | '700' | '800'; color?: string; style?: StyleProp<TextStyle>; blur?: boolean }) {
  const t = useT();
  const h = Math.round(size * 1.2);
  const ts: StyleProp<TextStyle> = [{ fontSize: size, fontFamily: face(size), fontWeight: weight, color: color ?? t.ink, fontVariant: ['tabular-nums'], letterSpacing: size >= 22 ? -size * 0.025 : 0 }, style];

  // Direction of change decides carry vs. roll-back (derived state, updated during render).
  const [roll, setRoll] = useState({ shown: value, n: num(value), dir: 0, len0: [...value].length });
  if (roll.shown !== value) {
    const n = num(value);
    setRoll({ shown: value, n, dir: n > roll.n ? 1 : n < roll.n ? -1 : 0, len0: roll.len0 });
  }
  const { dir, len0 } = roll;

  // Digit width, measured from a hidden "0" (tabular figures are all the same width);
  // measured again whenever it changes, e.g. when a theme switches the font.
  const [dw, setDw] = useState(0);
  const chars = [...roll.shown];
  const digits = chars.filter((c) => /\d/.test(c)).length;
  let di = 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }} accessible accessibilityLabel={value}>
      <Text style={[ts, { position: 'absolute', opacity: 0 }]} onLayout={(e) => { const w = e.nativeEvent.layout.width; if (Math.abs(w - dw) > 0.5) setDw(w); }}>0</Text>
      {chars.map((ch, i) => {
        const fromRight = chars.length - i;
        if (!/\d/.test(ch)) {
          return (
            <Animated.Text key={'s' + fromRight + ch} exiting={fadeOut()} layout={layout()}
              style={[ts, { height: h, lineHeight: h }]}>{ch}</Animated.Text>
          );
        }
        const k = digits - 1 - di++; // 0 = rightmost digit
        return (
          <Col key={'d' + k} d={+ch} dir={dir} h={h} w={dw} delay={k * STAGGER} style={ts} blur={blur}
            grow={chars.length > len0 && i === 0} />
        );
      })}
    </View>
  );
}
