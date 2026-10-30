import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { formatDuration } from './timers';

type Props = {
  saves: (number | null)[];
  /** The length on the rulers now (ms): its slot, if saved, is marked. */
  dial: number;
  ink: string;
  inkSoft: string;
  onSave: (i: number) => void;
  onLoad: (i: number) => void;
  onDelete: (i: number) => void;
};

// A slot's tap and hold, built once (like the digits'): the hold is recognised by the
// gesture handler itself, so a scroll or a pan nearby can't swallow it as it could a
// plain long press. While the finger is down the slot sinks a little.
function makeSlotGesture(down: SharedValue<number>) {
  const h = { tap: () => {}, hold: () => {} };
  const hold = Gesture.LongPress()
    .minDuration(450)
    .maxDistance(24)
    .runOnJS(true)
    .onBegin(() => down.set(withTiming(1, { duration: 450 })))
    .onFinalize(() => down.set(withTiming(0, { duration: 160 })))
    .onStart(() => h.hold());
  const tap = Gesture.Tap()
    .maxDuration(440)
    .runOnJS(true)
    .onEnd((_e, ok) => {
      if (ok) h.tap();
    });
  return {
    gesture: Gesture.Exclusive(hold, tap),
    set(next: typeof h) {
      Object.assign(h, next);
    },
  };
}

function Slot({ i, ms, on, ink, inkSoft, onSave, onLoad, onDelete }: { i: number; ms: number | null; on: boolean } & Omit<Props, 'saves' | 'dial'>) {
  const down = useSharedValue(0);
  const [g] = useState(() => makeSlotGesture(down));
  useEffect(() =>
    g.set({
      tap: () => (ms == null ? onSave(i) : onLoad(i)),
      hold: () => {
        if (ms != null) onDelete(i);
      },
    })
  );
  // Sinks while held, a little more the longer (a full slot is about to go).
  const style = useAnimatedStyle(() => ({
    opacity: 1 - 0.35 * down.get(),
    transform: [{ scale: 1 - (ms == null ? 0.04 : 0.1) * down.get() }],
  }));
  return (
    <GestureDetector gesture={g.gesture}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={ms == null ? `保存 ${i + 1}: 空き` : `保存 ${i + 1}: ${formatDuration(ms)}`}
        accessibilityHint={ms == null ? 'いまの時間を保存' : 'この時間にする・長押しで削除'}
        style={[
          styles.slot,
          ms == null ? [styles.empty, { borderColor: inkSoft }] : { backgroundColor: on ? ink : 'rgba(127,127,127,0.16)' },
          style,
        ]}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.text, { color: ms == null ? inkSoft : on ? (ink === '#ffffff' ? '#0b0b0e' : '#ffffff') : ink }]}
        >
          {ms == null ? '＋' : formatDuration(ms)}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

/** Five slots under the timer's rulers: tap an empty one to keep the length set now,
 *  a full one to set it again; hold a full one to empty it. */
export function TimerSaves({ saves, dial, ...rest }: Props) {
  return (
    <View style={styles.row}>
      {saves.map((ms, i) => (
        <Slot key={i} i={i} ms={ms} on={ms != null && ms === dial} {...rest} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 6,
  },
  slot: {
    flex: 1,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
});
