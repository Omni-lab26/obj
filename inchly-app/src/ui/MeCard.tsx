import { useEffect, useMemo, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { grass } from '@/data';
import { haptic, Txt } from '@/ui/base';

const CARD_GRASS = ['rgba(255,255,255,0.1)', '#1B5E3A', '#258A50', '#36B86B', '#6DE09E'];

// The holo study card. The sheen drifts on its own; drag a finger across the
// card and the sheen follows it while the card tilts slightly toward the touch.
export function HoloCard({ name }: { name: string }) {
  const [w, setW] = useState(0);
  const cells = useMemo(() => grass(4, 5, 3), []);
  const sheen = useSharedValue(-1); // -1..1 across the card
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const press = useSharedValue(1);
  const cw = useSharedValue(0); // card width, readable from gesture callbacks
  useEffect(() => { cw.value = w; }, [w, cw]);

  // All gesture logic lives inside the responder so render never touches refs.
  const [pan] = useState(() => {
    let dragging = false;
    const idle = () => { sheen.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }), -1, true); };
    const follow = (x: number, y: number) => {
      if (!cw.value) return;
      const nx = Math.max(-1, Math.min(1, (x / cw.value) * 2 - 1));
      const ny = Math.max(-1, Math.min(1, (y / 92) * 2 - 1));
      sheen.value = withTiming(nx, { duration: 90 });
      ry.value = withTiming(nx * 7, { duration: 90 });
      rx.value = withTiming(-ny * 7, { duration: 90 });
    };
    const end = () => {
      dragging = false;
      press.value = withSpring(1, { damping: 14 });
      rx.value = withSpring(0, { damping: 12 });
      ry.value = withSpring(0, { damping: 12 });
      idle();
    };
    idle();
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => !dragging,
      onPanResponderGrant: (e) => {
        dragging = true;
        haptic.soft();
        press.value = withTiming(0.98, { duration: 140 });
        follow(e.nativeEvent.locationX, e.nativeEvent.locationY);
      },
      onPanResponderMove: (e) => follow(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });
  });

  const cardA = useAnimatedStyle(() => ({
    transform: [{ perspective: 600 }, { rotateX: `${rx.value}deg` }, { rotateY: `${ry.value}deg` }, { scale: press.value }],
  }));
  const sheenA = useAnimatedStyle(() => ({ transform: [{ translateX: sheen.value * w * 0.75 }] }));

  return (
    <Animated.View style={[{ marginHorizontal: 20, marginTop: 18 }, cardA]}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} {...pan.panHandlers}
        accessibilityLabel={`${name}のカード。指でなぞると光が動きます`}
        style={{ height: 92, borderRadius: 16, backgroundColor: '#17181A', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, left: -w * 0.25, width: w * 1.5 }, sheenA]}>
          {w ? (
            <Svg width={w * 1.5} height={92}>
              <Defs>
                <LinearGradient id="holo" x1="0" y1="0" x2="1" y2="0.35">
                  <Stop offset="0.3" stopColor="#78FFB4" stopOpacity="0" />
                  <Stop offset="0.44" stopColor="#78FFB4" stopOpacity="0.22" />
                  <Stop offset="0.52" stopColor="#8CB4FF" stopOpacity="0.24" />
                  <Stop offset="0.6" stopColor="#D49CFF" stopOpacity="0.12" />
                  <Stop offset="0.7" stopColor="#8CB4FF" stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Rect width={w * 1.5} height={92} fill="url(#holo)" />
            </Svg>
          ) : null}
        </Animated.View>
        <View pointerEvents="none">
          <Txt size={15} w="700" color="#fff">{name}のカード</Txt>
          <Txt size={12} color="rgba(255,255,255,0.6)">ホロ加工 · Plus 会員</Txt>
        </View>
        <View pointerEvents="none" style={{ flexDirection: 'row', flexWrap: 'wrap', width: 14 * 7 + 13 * 2, gap: 2 }}>
          {cells.map((l, i) => (
            <View key={i} style={{ width: 7, height: 7, borderRadius: 1.5, backgroundColor: CARD_GRASS[l] }} />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}
