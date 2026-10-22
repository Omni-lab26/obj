import { useEffect, useMemo, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { grassOf } from '@/lib/history';
import { useStore } from '@/store';
import { Avatar, haptic, Txt } from '@/ui/base';
import { Wordmark } from '@/ui/Brand';
import { Rolling } from '@/ui/Rolling';
import { hair } from '@/theme';

const CARD_GRASS = ['rgba(255,255,255,0.1)', '#14532D', '#16803D', '#22C55E', '#6EE7A0'];

// The study card — the page's centerpiece, cut to the size of a credit card
// (ISO/IEC 7810 ID-1, 85.60 × 53.98 mm). The last five weeks of grass sit where
// the IC chip would be. The sheen drifts on its own; drag a finger across it
// and the sheen follows while the card tilts.
export const CARD_RATIO = 85.6 / 53.98;
export function HoloCard({ name, handle, goal, since, stats }: { name: string; handle: string; goal: string; since: string; stats: { v: string; from: string; label: string }[] }) {
  const [w, setW] = useState(0);
  const CARD_H = w / CARD_RATIO;
  const sessions = useStore((s) => s.sessions);
  const cells = useMemo(() => grassOf(sessions, 5), [sessions]);
  const sheen = useSharedValue(-1); // -1..1 across the card
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const press = useSharedValue(1);
  const cw = useSharedValue(0); // card size, readable from gesture callbacks
  const ch = useSharedValue(1);
  useEffect(() => { cw.value = w; ch.value = Math.max(1, w / CARD_RATIO); }, [w, cw, ch]);

  // All gesture logic lives inside the responder so render never touches refs.
  const [pan] = useState(() => {
    let dragging = false;
    const idle = () => { sheen.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }), -1, true); };
    const follow = (x: number, y: number) => {
      if (!cw.value) return;
      const nx = Math.max(-1, Math.min(1, (x / cw.value) * 2 - 1));
      const ny = Math.max(-1, Math.min(1, (y / ch.value) * 2 - 1));
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
    <Animated.View style={[{ marginHorizontal: 16, marginTop: 6 }, cardA]}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} {...pan.panHandlers}
        accessibilityLabel={`${name}の勉強カード。指でなぞると光が動きます`}
        style={{ aspectRatio: CARD_RATIO, borderRadius: 14, backgroundColor: '#0B0D12', overflow: 'hidden', paddingHorizontal: 18, paddingVertical: 16, justifyContent: 'space-between', borderWidth: hair, borderColor: 'rgba(255,255,255,0.08)' }}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, left: -w * 0.25, width: w * 1.5 }, sheenA]}>
          {w ? (
            <Svg width={w * 1.5} height={CARD_H}>
              <Defs>
                <LinearGradient id="holo" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0.3" stopColor="#78FFB4" stopOpacity="0" />
                  <Stop offset="0.44" stopColor="#78FFB4" stopOpacity="0.2" />
                  <Stop offset="0.52" stopColor="#8CB4FF" stopOpacity="0.22" />
                  <Stop offset="0.6" stopColor="#D49CFF" stopOpacity="0.12" />
                  <Stop offset="0.7" stopColor="#8CB4FF" stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Rect width={w * 1.5} height={CARD_H} fill="url(#holo)" />
            </Svg>
          ) : null}
        </Animated.View>

        <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Wordmark size={16} color="#F2F3F1" />
          <Txt num size={10} w="600" color="rgba(255,255,255,0.5)" style={{ letterSpacing: 1.2 }}>STUDENT · PLUS</Txt>
        </View>

        {/* the chip: five weeks of grass in a gold frame */}
        <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ padding: 4, borderRadius: 6, backgroundColor: 'rgba(214,180,106,0.16)', borderWidth: 1, borderColor: 'rgba(214,180,106,0.55)' }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 7 * 5 + 2 * 6, gap: 2 }}>
              {cells.map((l, i) => <View key={i} style={{ width: 5, height: 5, borderRadius: 1.2, backgroundColor: CARD_GRASS[l] }} />)}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            {stats.map((x) => (
              <View key={x.label}>
                <Rolling value={x.v} size={21} weight="700" color="#fff" />
                <Txt size={10} lh={13} color="rgba(255,255,255,0.55)">{x.label}</Txt>
              </View>
            ))}
          </View>
        </View>

        {/* holder and "valid from", where a card prints them */}
        <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar name={name} color="#6E56CF" size={34} ring="rgba(255,255,255,0.18)" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={15} w="700" lh={19} color="#fff" numberOfLines={1}>{name}</Txt>
            <Txt size={10.5} color="rgba(255,255,255,0.6)" numberOfLines={1}>{`@${handle} · ${goal}`}</Txt>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt size={8} w="600" color="rgba(255,255,255,0.45)" style={{ letterSpacing: 1 }}>SINCE</Txt>
            <Txt num size={13} w="600" color="rgba(255,255,255,0.85)">{since}</Txt>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
