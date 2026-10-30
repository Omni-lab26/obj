import { ReactNode, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useT } from '../theme';
import { haptic, Txt } from './base';
import { move } from './motion';
import { ring, S, SR, useStd } from './stdLook';

// A row that slides right under the finger to show 削除 at its left. Past half
// the button it stays open (or a quick flick), short of that it goes back; the
// row keeps the finger's speed and stops without going past (MOTION.md move).
// Only one row is open at a time; a tap on the open row closes it. Vertical
// drags pass through to the list. The button itself only asks: onDelete
// confirms before anything is gone.
const W = 88;
let openRow: { id: number; close: () => void } | null = null;
let seq = 0;

export function RevealRow({ children, onDelete, label }: { children: ReactNode; onDelete: (close: () => void) => void; /** what the button deletes, for VoiceOver */ label: string }) {
  const t = useT();
  const std = useStd();
  const x = useSharedValue(0);
  const from = useSharedValue(0);
  const past = useSharedValue(0);
  const [open, setOpen] = useState(false);
  const [id] = useState(() => ++seq);
  const shut = () => { x.set(move(0)); setOpen(false); if (openRow?.id === id) openRow = null; };
  const opened = (v: boolean) => {
    setOpen(v);
    if (v) {
      if (openRow && openRow.id !== id) openRow.close();
      openRow = { id, close: shut };
    } else if (openRow?.id === id) openRow = null;
  };
  useEffect(() => () => { if (openRow?.id === id) openRow = null; }, [id]);

  const tick = () => haptic.tap();
  // The gesture is built once; its worklets read shared values only.
  const [pan] = useState(() => Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onBegin(() => { from.value = x.value; past.value = x.value >= W / 2 ? 1 : 0; })
    .onUpdate((e) => {
      const v = from.value + e.translationX;
      // follows the finger; past the button it gives way (no overshoot when let go)
      x.value = v <= 0 ? 0 : v <= W ? v : W + (v - W) * 0.25;
      const p = x.value >= W / 2 ? 1 : 0;
      if (p !== past.value) { past.value = p; if (p) scheduleOnRN(tick); }
    })
    .onEnd((e) => {
      const keep = x.value > 0 && (x.value >= W / 2 || e.velocityX > 500) && e.velocityX > -500;
      x.value = move(keep ? W : 0, e.velocityX);
      scheduleOnRN(opened, keep);
    }));

  const content = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], backgroundColor: x.value > 0 ? t.surface : 'transparent' }));
  const under = useAnimatedStyle(() => ({ opacity: x.value > 0 ? 1 : 0 }));

  return (
    <View style={{ overflow: 'hidden' }}>
      {/* closed, the button is not there for touch or VoiceOver (VoiceOver deletes with the row's own 削除 action) */}
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, width: W }, under]} pointerEvents={open ? 'auto' : 'none'}
        accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}>
        <Pressable onPress={() => { haptic.soft(); onDelete(shut); }} accessibilityRole="button" accessibilityLabel={`${label}を削除`}
          style={({ pressed }) => std
            ? { flex: 1, margin: 8, borderRadius: SR.key, backgroundColor: S.pause, boxShadow: ring(), alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 }
            : { flex: 1, backgroundColor: t.red, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 }}>
          <Txt size={14} w="700" color="#FFFFFF">削除</Txt>
        </Pressable>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={content}>
          {children}
          {/* open: a tap on the row closes it instead of opening the plan */}
          {open ? <Pressable onPress={shut} accessibilityRole="button" accessibilityLabel="削除をやめる" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} /> : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
