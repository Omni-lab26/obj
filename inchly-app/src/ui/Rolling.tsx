import { useEffect } from 'react';
import { StyleProp, Text, TextStyle, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { ease, font, useT } from '../theme';

// Odometer digits: each digit is a 0–9 column that slides to its value.
// Digits further right start first, like bencho's counter.
const DIGITS = '0123456789'.split('');

function Col({ d, h, delay, style }: { d: number; h: number; delay: number; style: StyleProp<TextStyle> }) {
  const y = useSharedValue(-d * h);
  useEffect(() => {
    y.value = withDelay(delay, withTiming(-d * h, { duration: 560, easing: ease.out }));
  }, [d, h, delay, y]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <View style={{ height: h, overflow: 'hidden' }}>
      <Animated.View style={a}>
        {DIGITS.map((x) => (
          <Text key={x} style={[style, { height: h, lineHeight: h, textAlign: 'center' }]}>{x}</Text>
        ))}
      </Animated.View>
    </View>
  );
}

export function Rolling({
  value, size = 22, weight = '600', color, style,
}: { value: string; size?: number; weight?: '500' | '600' | '700'; color?: string; style?: StyleProp<TextStyle> }) {
  const t = useT();
  const h = Math.round(size * 1.18);
  const fam = weight === '700' ? font.num7 : weight === '600' ? font.num6 : font.num;
  const ts: StyleProp<TextStyle> = [{ fontSize: size, fontFamily: fam, color: color ?? t.ink, fontVariant: ['tabular-nums'], letterSpacing: size > 30 ? -size * 0.02 : 0 }, style];
  const chars = [...value];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }} accessible accessibilityLabel={value}>
      {chars.map((ch, i) =>
        /\d/.test(ch) ? (
          <Col key={chars.length - i} d={+ch} h={h} delay={(chars.length - 1 - i) * 35} style={ts} />
        ) : (
          <Text key={'s' + (chars.length - i)} style={[ts, { height: h, lineHeight: h }]}>{ch}</Text>
        ),
      )}
    </View>
  );
}
