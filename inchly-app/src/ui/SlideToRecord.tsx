import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { focus } from '../theme';
import { haptic, Txt } from './base';
import { Icon } from './Icon';
import { M, move } from './motion';

// Slide-to-confirm on the dark timer. The track fills behind the knob and the
// label fades as you drag; past 70% it finishes by itself, otherwise it slides
// back at the finger's speed, without a bounce. The drag runs on the UI thread; React hears only "passed the line" and "done".
const KNOB = 48;
const PADDING = 6;

export function SlideToRecord({ onDone, disabled, label = '右へスライドして記録する' }: { onDone: () => void; disabled?: boolean; label?: string }) {
  const [w, setW] = useState(0);
  const max = useSharedValue(1);
  const x = useSharedValue(0);
  const off = useSharedValue(disabled ? 1 : 0);
  const start = useSharedValue(0);
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; off.set(disabled ? 1 : 0); }, [onDone, disabled, off]);

  const finish = () => {
    haptic.success();
    doneRef.current();
    // put the knob back once the next screen covers this one
    setTimeout(() => x.set(move(0)), 700);
  };
  // one tick as the knob crosses the line, either way
  useAnimatedReaction(() => x.get() > max.get() * 0.7, (over, prev) => { if (prev !== null && over !== prev) scheduleOnRN(haptic.tap); });

  // The gesture is built once; its worklets read shared values, and finish reads onDone from a ref when it fires.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => Gesture.Pan()
    .activeOffsetX([-2, 2])
    .onBegin(() => { start.set(x.get()); })
    .onUpdate((e) => {
      if (off.get()) return;
      x.set(Math.max(0, Math.min(max.get(), start.get() + e.translationX)));
    })
    .onEnd((e) => {
      if (off.get()) return;
      const m = max.get(), v = x.get();
      // a quick flick counts too
      if (v > m * 0.7 || (e.velocityX > 900 && v > m * 0.35)) {
        x.set(withTiming(m, M.micro, (done) => { if (done) scheduleOnRN(finish); }));
      } else {
        x.set(move(0, e.velocityX));
      }
    }));

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  // the fill is the track's full width, slid in from the left behind the knob (moved, not resized)
  const fill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value + KNOB + PADDING * 2 - w }] }));
  const lbl = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, max.value * 0.7], [1, 0], 'clamp') }));

  return (
    <View onLayout={(e) => { const lw = e.nativeEvent.layout.width; setW(lw); max.set(Math.max(1, lw - KNOB - PADDING * 2)); }}
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
      accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => !disabled && onDone()}
      style={{ height: 60, borderRadius: 18, backgroundColor: focus.raise, overflow: 'hidden', opacity: disabled ? 0.35 : 1 }}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, width: w, backgroundColor: 'rgba(46,196,113,0.22)' }, fill]} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: KNOB + PADDING, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }, lbl]}>
        <Txt size={14} color={focus.ink2}>{label}</Txt>
      </Animated.View>
      {w ? (
        <GestureDetector gesture={pan}>
          <Animated.View hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={[{ position: 'absolute', top: PADDING, left: PADDING, width: KNOB, height: KNOB, borderRadius: 13, backgroundColor: focus.green, alignItems: 'center', justifyContent: 'center' }, knob]}>
            <Icon name="arrow" size={22} color={focus.bg} />
          </Animated.View>
        </GestureDetector>
      ) : null}
    </View>
  );
}
