import { useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { ease, focus } from '../theme';
import { haptic, Txt } from './base';
import { Icon } from './Icon';

// Slide-to-confirm on the dark timer. The track fills behind the knob and the
// label fades as you drag; past 70% it finishes by itself, otherwise it springs back.
const KNOB = 48;
const PADDING = 6;

export function SlideToRecord({ onDone, disabled, label = '右へスライドして記録する' }: { onDone: () => void; disabled?: boolean; label?: string }) {
  const [w, setW] = useState(0);
  const max = Math.max(1, w - KNOB - PADDING * 2);
  const maxRef = useRef(max);
  maxRef.current = max;
  const x = useSharedValue(0);
  const start = useRef(0);
  const passed = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: (_, g) => !disabledRef.current && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { start.current = x.value; passed.current = false; haptic.tap(); },
      onPanResponderMove: (_, g) => {
        const m = maxRef.current;
        const v = Math.max(0, Math.min(m, start.current + g.dx));
        x.value = v;
        const over = v > m * 0.7;
        if (over !== passed.current) { passed.current = over; haptic.tap(); }
      },
      onPanResponderRelease: () => {
        const m = maxRef.current;
        if (x.value > m * 0.7) {
          x.value = withTiming(m, { duration: 220, easing: ease.out });
          haptic.success();
          setTimeout(() => doneRef.current(), 260);
          setTimeout(() => { x.value = withSpring(0, { damping: 18, stiffness: 180 }); }, 900);
        } else {
          x.value = withSpring(0, { damping: 16, stiffness: 220 });
        }
      },
      onPanResponderTerminate: () => { x.value = withSpring(0, { damping: 16, stiffness: 220 }); },
    }),
  ).current;

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fill = useAnimatedStyle(() => ({ width: x.value + KNOB + PADDING * 2 }));
  const lbl = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, max * 0.7], [1, 0], 'clamp') }));

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="adjustable" accessibilityLabel={label}
      accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => !disabled && onDone()}
      style={{ height: 60, borderRadius: 18, backgroundColor: focus.raise, overflow: 'hidden', opacity: disabled ? 0.35 : 1 }}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(46,196,113,0.22)' }, fill]} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: KNOB + PADDING, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }, lbl]}>
        <Txt size={14} color={focus.ink2}>{label}</Txt>
      </Animated.View>
      <Animated.View {...pan.panHandlers} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={[{ position: 'absolute', top: PADDING, left: PADDING, width: KNOB, height: KNOB, borderRadius: 13, backgroundColor: focus.green, alignItems: 'center', justifyContent: 'center' }, knob]}>
        <Icon name="arrow" size={22} color={focus.bg} />
      </Animated.View>
    </View>
  );
}
