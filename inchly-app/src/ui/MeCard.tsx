import { useEffect, useId, useMemo, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { CARDS, useDesign } from '@/design';
import { grassOf } from '@/lib/history';
import { useLevel, useStore } from '@/store';
import { LogoMark } from '@/themes/standard/pixel';
import { Avatar, haptic, Txt } from '@/ui/base';
import { Wordmark } from '@/ui/Brand';
import { move, press as pressTo, release } from '@/ui/motion';
import { Rolling } from '@/ui/Rolling';
import { bundledFace, font, hair, lift, useT } from '@/theme';
import { TextureFill } from '@/ui/Texture';
import { LIFT, ring, S, useStd } from '@/ui/stdLook';

const CARD_GRASS = ['', '#B5EBC8', '#5ED18A', '#1FA35B', '#0F7F3C']; // the app's grass; the empty cell depends on the card

// The study card — the page's centerpiece, in the look picked on the デザイン page, cut to the size of a credit card
// (ISO/IEC 7810 ID-1, 85.60 × 53.98 mm). The last five weeks of grass sit where
// the IC chip would be. The sheen rests at the left edge (nothing drifts on its
// own); drag a finger across it and the sheen follows while the card tilts,
// both going back without a bounce when it lifts.
export const CARD_RATIO = 85.6 / 53.98;
type Props = { name: string; handle: string; goal: string; since: string; stats: { v: string; from: string; label: string }[]; lv: number };
export function HoloCard(props: Props) {
  return useStd() ? <StdCard {...props} /> : <BaseCard {...props} />;
}
function BaseCard({ name, handle, goal, since, stats, lv }: Props) {
  const t = useT();
  const look = CARDS[useDesign().card];
  const fg = look.dark ? '#FFFFFF' : '#121417';
  const sub = (o: number) => (look.dark ? `rgba(255,255,255,${o + 0.08})` : `rgba(17,20,23,${o})`);
  const grass = [look.dark ? 'rgba(255,255,255,0.12)' : 'rgba(17,20,23,0.08)', ...CARD_GRASS.slice(1)];
  // SVG ids are page-wide on the web; keep each card's gradients its own
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
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
    const follow = (x: number, y: number) => {
      if (!cw.value) return;
      const nx = Math.max(-1, Math.min(1, (x / cw.value) * 2 - 1));
      const ny = Math.max(-1, Math.min(1, (y / ch.value) * 2 - 1));
      sheen.value = pressTo(nx);
      ry.value = pressTo(nx * 7);
      rx.value = pressTo(-ny * 7);
    };
    const end = () => {
      dragging = false;
      press.value = release(1);
      rx.value = release(0);
      ry.value = release(0);
      sheen.value = move(-1);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => !dragging,
      onPanResponderGrant: (e) => {
        dragging = true;
        haptic.soft();
        press.value = pressTo(0.98);
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
        style={[{ aspectRatio: CARD_RATIO, borderRadius: 14, backgroundColor: look.grad[1], overflow: 'hidden', paddingHorizontal: 18, paddingVertical: 16, justifyContent: 'space-between', borderWidth: hair, borderColor: look.dark ? 'rgba(255,255,255,0.08)' : 'rgba(17,20,23,0.1)' }, lift(t)]}>
        {/* the card's gradient, top left to bottom right */}
        {w ? (
          <Svg pointerEvents="none" width={w} height={CARD_H} style={{ position: 'absolute', top: 0, left: 0 }}>
            <Defs>
              <LinearGradient id={`face${uid}`} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={look.grad[0]} />
                <Stop offset="0.55" stopColor={look.grad[1]} />
                <Stop offset="1" stopColor={look.grad[2]} />
              </LinearGradient>
            </Defs>
            <Rect width={w} height={CARD_H} fill={`url(#face${uid})`} />
          </Svg>
        ) : null}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, left: -w * 0.25, width: w * 1.5 }, sheenA]}>
          {w ? (
            <Svg width={w * 1.5} height={CARD_H}>
              <Defs>
                <LinearGradient id={`holo${uid}`} x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0.3" stopColor={look.sheen[0]} stopOpacity="0" />
                  <Stop offset="0.44" stopColor={look.sheen[0]} stopOpacity="0.28" />
                  <Stop offset="0.52" stopColor={look.sheen[1]} stopOpacity="0.3" />
                  <Stop offset="0.6" stopColor={look.sheen[2]} stopOpacity="0.22" />
                  <Stop offset="0.7" stopColor={look.sheen[1]} stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Rect width={w * 1.5} height={CARD_H} fill={`url(#holo${uid})`} />
            </Svg>
          ) : null}
        </Animated.View>

        <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Wordmark size={16} color={fg} />
          <Txt num size={12} w="800" color={fg} style={{ letterSpacing: 0.6 }}>{`Lv.${lv}`}</Txt>
        </View>

        {/* the chip: five weeks of grass in a gold frame */}
        <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ padding: 4, borderRadius: 6, backgroundColor: 'rgba(214,180,106,0.14)', borderWidth: 1, borderColor: 'rgba(184,140,50,0.6)' }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 7 * 5 + 2 * 6, gap: 2 }}>
              {cells.map((l, i) => <View key={i} style={{ width: 5, height: 5, borderRadius: 1.2, backgroundColor: grass[l] }} />)}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            {stats.map((x) => (
              <View key={x.label}>
                <Rolling value={x.v} size={21} weight="700" color={fg} />
                <Txt size={10} lh={13} color={sub(0.5)}>{x.label}</Txt>
              </View>
            ))}
          </View>
        </View>

        {/* holder and "valid from", where a card prints them */}
        <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar name={name} color="#6E56CF" size={34} ring={look.dark ? 'rgba(255,255,255,0.2)' : '#FFFFFF'} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={15} w="700" lh={19} color={fg} numberOfLines={1}>{name}</Txt>
            <Txt size={10.5} color={sub(0.55)} numberOfLines={1}>{`@${handle} · ${goal}`}</Txt>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt size={8} w="600" color={sub(0.4)} style={{ letterSpacing: 1 }}>SINCE</Txt>
            <Txt num size={13} w="600" color={sub(0.8)}>{since}</Txt>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ---------- スタンダード (docs/app/mock/me.html .mecard) ----------
/** The study card in スタンダード: the page's one lead card (paper with its dots, the ink outline and the lime shadow), the same gesture. */
const STD_GRASS = ['#E6E0D2', '#B5EBC8', '#5ED18A', '#1FA35B', '#0F7F3C'];
function StdCard({ name, handle, goal, since, stats, lv }: Props) {
  useT(); // the faces arrive later: render again then
  const level = useLevel();
  const [w, setW] = useState(0);
  const sessions = useStore((s) => s.sessions);
  const cells = useMemo(() => grassOf(sessions, 5), [sessions]);
  const sheen = useSharedValue(-1);
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const press = useSharedValue(1);
  const cw = useSharedValue(0);
  const ch = useSharedValue(1);
  useEffect(() => { cw.value = w; ch.value = Math.max(1, w / CARD_RATIO); }, [w, cw, ch]);
  const [pan] = useState(() => {
    let dragging = false;
    const follow = (x: number, y: number) => {
      if (!cw.value) return;
      const nx = Math.max(-1, Math.min(1, (x / cw.value) * 2 - 1));
      const ny = Math.max(-1, Math.min(1, (y / ch.value) * 2 - 1));
      sheen.value = pressTo(nx);
      ry.value = pressTo(nx * 5);
      rx.value = pressTo(-ny * 5);
    };
    const end = () => { dragging = false; press.value = release(1); rx.value = release(0); ry.value = release(0); sheen.value = move(-1); };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => !dragging,
      onPanResponderGrant: (e) => { dragging = true; haptic.soft(); press.value = pressTo(0.98); follow(e.nativeEvent.locationX, e.nativeEvent.locationY); },
      onPanResponderMove: (e) => follow(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });
  });
  const cardA = useAnimatedStyle(() => ({ transform: [{ perspective: 600 }, { rotateX: `${rx.value}deg` }, { rotateY: `${ry.value}deg` }, { scale: press.value }] }));
  const sheenA = useAnimatedStyle(() => ({ transform: [{ translateX: sheen.value * w * 0.75 }] }));
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const H = w / CARD_RATIO;
  return (
    // the lime shadow reaches 6 to the right: the card keeps 6 more clear on that side
    <Animated.View style={[{ marginLeft: 16, marginRight: 22, marginTop: 6 }, cardA]}>
      <View style={{ borderRadius: 22, boxShadow: LIFT }}>
        <View onLayout={(e) => setW(e.nativeEvent.layout.width)} {...pan.panHandlers} accessibilityLabel={`${name}の勉強カード。指でなぞると光が動きます`}
          style={{ aspectRatio: CARD_RATIO, borderRadius: 22, backgroundColor: S.card, overflow: 'hidden', paddingTop: 16, paddingHorizontal: 18, paddingBottom: 15, justifyContent: 'space-between' }}>
          <TextureFill texture="dots-paper" />
          {/* the band of light: white, sky and sun, soft at its edges (no lime: lime means start and picked) */}
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, left: -w * 0.25, width: w * 1.5 }, sheenA]}>
            {w ? (
              <Svg width={w * 1.5} height={H}>
                <Defs>
                  <LinearGradient id={`band${uid}`} x1="0" y1="0.45" x2="1" y2="0.55">
                    <Stop offset="0.3" stopColor="#FFFFFF" stopOpacity="0" />
                    <Stop offset="0.36" stopColor="#FFFFFF" stopOpacity="0.55" />
                    <Stop offset="0.42" stopColor={S.sky} stopOpacity="0.14" />
                    <Stop offset="0.47" stopColor={S.sun} stopOpacity="0.16" />
                    <Stop offset="0.53" stopColor={S.sun} stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Rect width={w * 1.5} height={H} fill={`url(#band${uid})`} />
              </Svg>
            ) : null}
          </Animated.View>

          <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} accessible accessibilityLabel="Inchly">
              <LogoMark size={20} />
              <Txt style={{ fontFamily: bundledFace('groteskBold') ?? font.display, fontSize: 18, lineHeight: 22, letterSpacing: -0.8, color: S.ink, fontWeight: bundledFace('groteskBold') ? undefined : '800' }}>inchly</Txt>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Txt num size={13} w="800" lh={16}>{`Lv.${lv}`}</Txt>
              <View style={{ width: 26, height: 6, backgroundColor: S.paper2, boxShadow: ring(1.5) }}>
                <View style={{ width: `${Math.round(level.p * 100)}%`, height: '100%', backgroundColor: S.ink }} />
              </View>
            </View>
          </View>

          {/* the chip: five weeks of grass on a sunny tile with a thin ink edge */}
          <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ padding: 5, borderRadius: 7, backgroundColor: '#F8E9B1', boxShadow: ring(1.5) }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 7 * 5 + 2 * 6, gap: 2 }}>
                {cells.map((l, i) => <View key={i} style={{ width: 5, height: 5, backgroundColor: STD_GRASS[l] }} />)}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 18, flexShrink: 1 }}>
              {stats.map((x) => (
                <View key={x.label} style={{ gap: 3 }}>
                  <Rolling value={x.v} size={24} weight="700" color={S.ink} />
                  <Txt size={11} lh={13} tone="ink3" numberOfLines={1}>{x.label}</Txt>
                </View>
              ))}
            </View>
          </View>

          <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Avatar name={name} color="#6E56CF" size={34} />
            <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
              <Txt size={15} w="700" lh={19} numberOfLines={1}>{name}</Txt>
              <Txt size={12} lh={16} tone="ink3" numberOfLines={1}>{`@${handle} · ${goal}`}</Txt>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Txt style={{ fontFamily: bundledFace('label') ?? font.text, fontSize: 11, lineHeight: 13, letterSpacing: 0.6, color: S.ink3 }}>SINCE</Txt>
              <Txt num size={13} w="700" lh={15}>{since}</Txt>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
