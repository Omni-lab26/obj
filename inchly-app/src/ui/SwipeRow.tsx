import { ReactNode, useEffect, useRef, useState } from 'react';
import { Dimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useT } from '../theme';
import { haptic, Txt } from './base';
import { dismiss, M, move } from './motion';

// Horizontal swipe on a list row. Right past the threshold = mark read,
// left = slide out and collapse, then onDelete. Vertical drags pass through to the list.
// The row follows the finger on the UI thread and goes back (or away) keeping the finger's speed, without a bounce.
const TH = 90;

export function SwipeRow({ children, onRead, onDelete, bg }: { children: ReactNode; onRead: () => void; onDelete: () => void; bg: string }) {
  const t = useT();
  const x = useSharedValue(0);
  const h = useSharedValue(-1);
  const measured = useSharedValue(0);
  const crossed = useSharedValue(0);
  const cb = useRef({ onRead, onDelete });
  useEffect(() => { cb.current = { onRead, onDelete }; }, [onRead, onDelete]);

  const tick = () => haptic.tap();
  const read = () => { haptic.soft(); cb.current.onRead(); };
  const gone = () => cb.current.onDelete();
  const away = () => {
    haptic.firm();
    // the row closes up after it has slid out
    h.set(measured.get());
    h.set(withDelay(160, withTiming(0, M.leave, (done) => { if (done) scheduleOnRN(gone); })));
  };
  // The gesture is built once; its worklets read shared values, and the callbacks read the latest handlers from a ref when they fire.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-12, 12])
    .onBegin(() => { crossed.value = 0; })
    .onUpdate((e) => {
      x.value = e.translationX;
      const c = e.translationX > TH ? 1 : e.translationX < -TH ? -1 : 0;
      if (c !== crossed.value) { crossed.value = c; if (c) scheduleOnRN(tick); }
    })
    .onEnd((e) => {
      if (e.translationX > TH) {
        x.value = move(0, e.velocityX);
        scheduleOnRN(read);
      } else if (e.translationX < -TH) {
        x.value = dismiss(-Dimensions.get('window').width * 1.1, Math.min(e.velocityX, -800));
        scheduleOnRN(away);
      } else x.value = move(0, e.velocityX);
    })
    .onFinalize((_, ok) => { if (!ok && x.value !== 0) x.value = move(0); }));

  const content = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const wrap = useAnimatedStyle(() => (h.value < 0 ? {} : { height: h.value, opacity: interpolate(h.value, [0, measured.value || 1], [0, 1]) }));
  const under = useAnimatedStyle(() => ({ backgroundColor: x.value >= 0 ? t.blue : t.red, opacity: x.value === 0 ? 0 : 1 }));
  const readLbl = useAnimatedStyle(() => ({ opacity: x.value > 0 ? interpolate(x.value, [20, TH], [0, 1], 'clamp') : 0 }));
  const delLbl = useAnimatedStyle(() => ({ opacity: x.value < 0 ? interpolate(-x.value, [20, TH], [0, 1], 'clamp') : 0 }));

  return (
    <Animated.View style={[{ overflow: 'hidden' }, wrap]} onLayout={(e) => { if (h.get() < 0) measured.set(e.nativeEvent.layout.height); }}>
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }, under]}>
        <Animated.View style={readLbl}><Txt size={13} w="700" color="#fff">既読にする</Txt></Animated.View>
        <Animated.View style={delLbl}><Txt size={13} w="700" color="#fff">削除</Txt></Animated.View>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ backgroundColor: bg }, content]}>
          <View>{children}</View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
