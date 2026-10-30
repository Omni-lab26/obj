import { BlurView } from 'expo-blur';
import { ReactNode, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { radius, useT } from '../theme';
import { Press, Txt } from './base';
import { Icon } from './Icon';
import { Pix } from '../themes/standard/pixel';
import { dismiss, M, present, timed } from './motion';
import { LIFT, S, SR, useStd } from './stdLook';

const WEB = Platform.OS === 'web';
const BLUR = WEB ? 28 : 40;

// A card in the middle of the screen, over the page blurred and a little
// darker. Opening, the blur fades in (at its full strength: the blur itself is
// never animated, it's costly) while the card rises a little and settles
// without going past (ui/motion present), its contents following a beat later;
// closing runs it back, quicker. It closes from ✕, a tap outside or back.
export function Dialog({ open, close, title, aside, children }: { open: boolean; close: () => void; title: string; aside?: string; children: ReactNode }) {
  const t = useT();
  const std = useStd();
  const { height } = useWindowDimensions();
  // stays up after `open` turns false, until the closing motion has run
  const [shown, setShown] = useState(open);
  if (open && !shown) setShown(true);
  const back = useSharedValue(0);
  const card = useSharedValue(0);

  useEffect(() => {
    if (open) {
      back.set(timed(1, 330));
      card.set(withDelay(40, present(1)));
    } else {
      card.set(dismiss(0));
      back.set(withTiming(0, M.leave, (done) => { if (done) scheduleOnRN(setShown, false); }));
    }
  }, [open, back, card]);

  const blurIn = useAnimatedStyle(() => ({ opacity: back.value }));
  const tint = useAnimatedStyle(() => ({ opacity: back.value }));
  const box = useAnimatedStyle(() => {
    const v = card.value;
    return {
      opacity: interpolate(v, [0, 0.45], [0, 1], 'clamp'),
      transform: [{ translateY: (1 - v) * 12 }, { scale: 0.98 + 0.02 * v }],
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
          {/* スタンダード: only dimmed, in ink (no blur) */}
          {std ? null : <Animated.View style={[StyleSheet.absoluteFill, blurIn]}><BlurView intensity={BLUR} tint={t.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /></Animated.View>}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: std ? 'rgba(23,18,31,0.38)' : t.dark ? 'rgba(0,0,0,0.35)' : 'rgba(17,20,23,0.18)' }, tint]} />
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="閉じる" />
        </View>
        <View pointerEvents="box-none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Animated.View accessibilityViewIsModal pointerEvents={open ? 'auto' : 'none'}
            style={[{ width: '100%', maxWidth: 420, maxHeight: height * 0.72, borderRadius: radius.card + 6, backgroundColor: t.backdrop !== 'none' ? (t.dark ? 'rgba(16,22,30,0.78)' : 'rgba(250,250,252,0.8)') : t.surface, boxShadow: t.shadow2, overflow: 'hidden' },
              // スタンダード: paper, the ink outline and the lime shadow of what floats (not clipped: the clipping is inside)
              std && { borderRadius: SR.card, backgroundColor: S.card, boxShadow: LIFT, overflow: 'visible' }, box]}>
            <Animated.View style={[{ flexShrink: 1 }, std && { borderRadius: SR.card, overflow: 'hidden' }, inner]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 }}>
                <Txt size={17} w="700">{title}</Txt>
                <Txt num size={13} tone="ink3" style={{ flex: 1 }}>{aside ?? ''}</Txt>
                <Press onPress={close} hitSlop={10} scale={0.9} accessibilityRole="button" accessibilityLabel="閉じる"
                  style={[{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }, std && { borderRadius: 10, backgroundColor: S.paper2 }]}>
                  {std ? <Pix name="x" /> : <Icon name="x" size={13} color={t.ink2} />}
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
