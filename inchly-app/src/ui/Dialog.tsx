import { BlurView } from 'expo-blur';
import { ReactNode, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { radius, useT } from '../theme';
import { Press, Txt } from './base';
import { Icon } from './Icon';

const ABlur = Animated.createAnimatedComponent(BlurView);
const WEB = Platform.OS === 'web';
const BLUR = WEB ? 28 : 40;
// the card settles with a spring that barely overshoots; leaving is quicker than arriving
const ARRIVE = { duration: 520, dampingRatio: 0.84 };
const LEAVE = { duration: 170, easing: Easing.in(Easing.quad) };

// A card in the middle of the screen, over the page blurred and a little
// darker. Opening, the blur deepens while the card rises a little and settles,
// its contents following a beat later; closing runs it back, quicker. It closes
// from ✕, a tap outside or back.
export function Dialog({ open, close, title, aside, children }: { open: boolean; close: () => void; title: string; aside?: string; children: ReactNode }) {
  const t = useT();
  const { height } = useWindowDimensions();
  // stays up after `open` turns false, until the closing motion has run
  const [shown, setShown] = useState(open);
  if (open && !shown) setShown(true);
  const back = useSharedValue(0);
  const card = useSharedValue(0);

  useEffect(() => {
    if (open) {
      back.set(withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) }));
      card.set(withDelay(40, withSpring(1, ARRIVE)));
    } else {
      card.set(withTiming(0, LEAVE));
      back.set(withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) }, (done) => { if (done) scheduleOnRN(setShown, false); }));
    }
  }, [open, back, card]);

  const blur = useAnimatedProps(() => ({ intensity: BLUR * back.value }));
  const blurWeb = useAnimatedStyle(() => ({ opacity: back.value }));
  const tint = useAnimatedStyle(() => ({ opacity: back.value }));
  const box = useAnimatedStyle(() => {
    const v = card.value;
    return {
      opacity: interpolate(v, [0, 0.45], [0, 1], 'clamp'),
      transform: [{ translateY: (1 - v) * 22 }, { scale: 0.93 + 0.07 * v }],
    };
  });
  const inner = useAnimatedStyle(() => {
    const v = card.value;
    return { opacity: interpolate(v, [0.35, 0.9], [0, 1], 'clamp'), transform: [{ translateY: (1 - Math.min(v, 1)) * 8 }] };
  });

  return (
    <Modal visible={shown} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={StyleSheet.absoluteFill} pointerEvents={open ? 'auto' : 'none'}>
          {WEB
            ? <Animated.View style={[StyleSheet.absoluteFill, blurWeb]}><BlurView intensity={BLUR} tint={t.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /></Animated.View>
            : <ABlur animatedProps={blur} tint={t.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.dark ? 'rgba(0,0,0,0.35)' : 'rgba(17,20,23,0.18)' }, tint]} />
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="閉じる" />
        </View>
        <View pointerEvents="box-none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Animated.View accessibilityViewIsModal pointerEvents={open ? 'auto' : 'none'}
            style={[{ width: '100%', maxWidth: 420, maxHeight: height * 0.72, borderRadius: radius.card + 6, backgroundColor: t.backdrop !== 'none' ? (t.dark ? 'rgba(16,22,30,0.78)' : 'rgba(250,250,252,0.8)') : t.surface, boxShadow: t.shadow2, overflow: 'hidden' }, box]}>
            <Animated.View style={[{ flexShrink: 1 }, inner]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 }}>
                <Txt size={17} w="700">{title}</Txt>
                <Txt num size={13} tone="ink3" style={{ flex: 1 }}>{aside ?? ''}</Txt>
                <Press onPress={close} hitSlop={10} scale={0.9} accessibilityRole="button" accessibilityLabel="閉じる"
                  style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="x" size={13} color={t.ink2} />
                </Press>
              </View>
              {children}
            </Animated.View>
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
