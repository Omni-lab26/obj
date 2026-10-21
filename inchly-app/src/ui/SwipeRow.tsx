import { ReactNode, useRef } from 'react';
import { Dimensions, PanResponder, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ease, useT } from '../theme';
import { haptic, Txt } from './base';

// Horizontal swipe on a list row. Right past the threshold = mark read,
// left = slide out and collapse, then onDelete. Vertical drags pass through to the list.
const TH = 90;

export function SwipeRow({ children, onRead, onDelete, bg }: { children: ReactNode; onRead: () => void; onDelete: () => void; bg: string }) {
  const t = useT();
  const x = useSharedValue(0);
  const h = useSharedValue(-1);
  const measured = useSharedValue(0);
  const crossed = useRef(0);
  const cb = useRef({ onRead, onDelete });
  cb.current = { onRead, onDelete };
  const W = Dimensions.get('window').width;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { crossed.current = 0; },
      onPanResponderMove: (_, g) => {
        x.value = g.dx;
        const c = g.dx > TH ? 1 : g.dx < -TH ? -1 : 0;
        if (c !== crossed.current) { crossed.current = c; if (c) haptic.tap(); }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > TH) {
          x.value = withTiming(0, { duration: 300, easing: ease.out });
          haptic.soft();
          cb.current.onRead();
        } else if (g.dx < -TH) {
          haptic.firm();
          h.value = measured.value;
          x.value = withTiming(-W * 1.1, { duration: 180, easing: ease.out });
          // Timers on the JS side keep the callbacks out of worklets.
          setTimeout(() => { h.value = withTiming(0, { duration: 260, easing: ease.out }); }, 180);
          setTimeout(() => cb.current.onDelete(), 460);
        } else {
          x.value = withTiming(0, { duration: 300, easing: ease.out });
        }
      },
      onPanResponderTerminate: () => { x.value = withTiming(0, { duration: 300, easing: ease.out }); },
    }),
  ).current;

  const content = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const wrap = useAnimatedStyle(() => (h.value < 0 ? {} : { height: h.value, opacity: interpolate(h.value, [0, measured.value || 1], [0, 1]) }));
  const under = useAnimatedStyle(() => ({ backgroundColor: x.value >= 0 ? t.blue : t.red, opacity: x.value === 0 ? 0 : 1 }));
  const readLbl = useAnimatedStyle(() => ({ opacity: x.value > 0 ? interpolate(x.value, [20, TH], [0, 1], 'clamp') : 0 }));
  const delLbl = useAnimatedStyle(() => ({ opacity: x.value < 0 ? interpolate(-x.value, [20, TH], [0, 1], 'clamp') : 0 }));

  return (
    <Animated.View style={[{ overflow: 'hidden' }, wrap]} onLayout={(e) => { if (h.value < 0) measured.value = e.nativeEvent.layout.height; }}>
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }, under]}>
        <Animated.View style={readLbl}><Txt size={13} w="700" color="#fff">既読にする</Txt></Animated.View>
        <Animated.View style={delLbl}><Txt size={13} w="700" color="#fff">削除</Txt></Animated.View>
      </Animated.View>
      <Animated.View {...pan.panHandlers} style={[{ backgroundColor: bg }, content]}>
        <View>{children}</View>
      </Animated.View>
    </Animated.View>
  );
}
