import { useEffect, useMemo, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { grass } from '@/data';
import { Avatar, haptic, Txt } from '@/ui/base';
import { Wordmark } from '@/ui/Brand';
import { Rolling } from '@/ui/Rolling';
import { hair } from '@/theme';

const CARD_GRASS = ['#E5E5EA', '#BCE6C8', '#73CC90', '#2AA05A', '#17733D'];

// The study card — the page's centerpiece, sized like a student ID. The sheen
// drifts on its own; drag a finger across it and the sheen follows while the card tilts.
const CARD_H = 206;
export function HoloCard({ name, handle, goal, stats }: { name: string; handle: string; goal: string; stats: { v: string; from: string; label: string }[] }) {
  const [w, setW] = useState(0);
  const cells = useMemo(() => grass(12, 5, 3), []);
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
      const ny = Math.max(-1, Math.min(1, (y / CARD_H) * 2 - 1));
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
    <Animated.View style={[{ marginHorizontal: 16, marginTop: 4, borderRadius: 22, boxShadow: '0px 1px 2px rgba(0,0,0,0.06), 0px 12px 30px rgba(0,0,0,0.08)' }, cardA]}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} {...pan.panHandlers}
        accessibilityLabel={`${name}の勉強カード。指でなぞると光が動きます`}
        style={{ height: CARD_H, borderRadius: 22, backgroundColor: '#FBFBFA', overflow: 'hidden', padding: 18, justifyContent: 'space-between', borderWidth: hair, borderColor: 'rgba(60,60,67,0.18)' }}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, left: -w * 0.25, width: w * 1.5 }, sheenA]}>
          {w ? (
            <Svg width={w * 1.5} height={CARD_H}>
              <Defs>
                <LinearGradient id="holo" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0.3" stopColor="#7FE0A8" stopOpacity="0" />
                  <Stop offset="0.44" stopColor="#7FE0A8" stopOpacity="0.16" />
                  <Stop offset="0.52" stopColor="#9DB8FF" stopOpacity="0.16" />
                  <Stop offset="0.6" stopColor="#F2A8D8" stopOpacity="0.1" />
                  <Stop offset="0.7" stopColor="#9DB8FF" stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Rect width={w * 1.5} height={CARD_H} fill="url(#holo)" />
            </Svg>
          ) : null}
        </Animated.View>

        <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Wordmark size={16} />
          <Txt num size={11} tone="ink3">No. 0412</Txt>
        </View>

        <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={name} color="#6E56CF" size={44} />
          <View style={{ flex: 1 }}>
            <Txt size={20} w="700" lh={25}>{name}</Txt>
            <Txt size={13} tone="ink2" numberOfLines={1}>{`@${handle}　${goal}`}</Txt>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 12 * 6 + 11 * 2, gap: 2, transform: [{ rotate: '0deg' }] }}>
            {cells.slice(-48).map((l, i) => (
              <View key={i} style={{ width: 6, height: 6, borderRadius: 1.5, backgroundColor: CARD_GRASS[l] }} />
            ))}
          </View>
        </View>

        <View pointerEvents="none" style={{ flexDirection: 'row', gap: 22 }}>
          {stats.map((x) => (
            <View key={x.label}>
              <Rolling value={x.v} size={26} weight="300" />
              <Txt size={12} tone="ink2">{x.label}</Txt>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}
