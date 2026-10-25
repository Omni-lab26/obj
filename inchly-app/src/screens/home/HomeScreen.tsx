import { ComponentType, useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { DesignPage } from '@/screens/DesignPage';
import { arrange, HOME, Kind, SectionKind } from '@/screens/layout';
import { designReveal } from '@/screens/reveal';
import type { HomeKit, SectionProps } from '@/themes/types';
import { haptic } from '@/ui/base';
import { STANDARD_SECTIONS, StandardFrame, StandardHandle, StandardHeader, StandardPage } from './standard';

// Home, for every theme: the base blocks (layout.ts) in the theme's order,
// each piece drawn by the theme or, where it draws nothing of its own, the
// standard way in its colors. Slide it to the right and the デザイン page comes
// in from the left with your finger (the handle on the left edge brings it in
// too); slide that page back to the left, or tap back, and home returns.

const SETTLE = { duration: 420, dampingRatio: 0.9 };
/** The slide to デザイン (and its handle) is put away for now; デザイン is still in 設定. */
const DESIGN_SLIDE = false;
/** Past a third of the way, or flung, it goes the rest of the way; otherwise it slides back. */
const decide = (at: number, v: number, opening: boolean) => {
  'worklet';
  return opening ? at > 0.33 || v > 650 : at > 0.67 && v > -650;
};

export function HomeScreen({ kit = {} }: { kit?: HomeKit }) {
  const blocks = useMemo(() => arrange(HOME, kit.arrange), [kit.arrange]);
  const Page = kit.Page ?? StandardPage;
  const Header = kit.Header ?? StandardHeader;
  const Frame = kit.Frame ?? StandardFrame;
  const Handle = kit.DesignHandle ?? StandardHandle;
  const { width } = useWindowDimensions();
  const w = useSharedValue(width);
  useEffect(() => { w.set(width); }, [width, w]);
  // the デザイン page is there: coming in, open, or going back out
  const [shown, setShown] = useState(false);
  const moving = useSharedValue(false);

  const settle = useCallback((open: boolean) => {
    designReveal.set(withSpring(open ? 1 : 0, SETTLE, (done) => { if (done && !open) scheduleOnRN(setShown, false); }));
  }, []);
  const open = useCallback(() => { setShown(true); haptic.soft(); settle(true); }, [settle]);
  const close = useCallback(() => settle(false), [settle]);

  // home → デザイン: only a slide to the right, so scrolling up and down is left alone
  const [bringIn] = useState(() => Gesture.Pan().enabled(DESIGN_SLIDE).activeOffsetX(14).failOffsetY([-22, 22])
    .onStart(() => { moving.set(true); scheduleOnRN(setShown, true); })
    .onUpdate((e) => { designReveal.set(Math.min(1, Math.max(0, e.translationX / w.get()))); })
    .onFinalize((e) => {
      if (!moving.get()) return;
      moving.set(false);
      const go = decide(designReveal.get(), e.velocityX, true);
      if (go) scheduleOnRN(haptic.soft);
      designReveal.set(withSpring(go ? 1 : 0, SETTLE, (done) => { if (done && !go) scheduleOnRN(setShown, false); }));
    }));
  // デザイン → home: a slide to the left
  const [takeOut] = useState(() => Gesture.Pan().activeOffsetX(-14).failOffsetY([-22, 22])
    .onStart(() => { moving.set(true); })
    .onUpdate((e) => { designReveal.set(Math.min(1, Math.max(0, 1 + e.translationX / w.get()))); })
    .onFinalize((e) => {
      if (!moving.get()) return;
      moving.set(false);
      const stay = decide(designReveal.get(), e.velocityX, false);
      designReveal.set(withSpring(stay ? 1 : 0, SETTLE, (done) => { if (done && !stay) scheduleOnRN(setShown, false); }));
    }));

  // Android's back button closes it; leaving home puts it away
  useEffect(() => {
    if (!shown) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    return () => sub.remove();
  }, [shown, close]);
  useEffect(() => () => { designReveal.set(0); }, []);

  // home gives way a little and dims; the page comes in from the left edge
  const homeAway = useAnimatedStyle(() => ({ transform: [{ translateX: designReveal.value * w.value * 0.28 }] }));
  const dim = useAnimatedStyle(() => ({ opacity: designReveal.value * 0.32 }));
  const page = useAnimatedStyle(() => ({ transform: [{ translateX: (designReveal.value - 1) * w.value }] }));
  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={bringIn}>
        <Animated.View style={[{ flex: 1 }, homeAway]} collapsable={false}>
          <Page header={<Header />}>
            {blocks.map((b, i) => (
              <Frame key={b.id} block={b} index={i}>
                {b.sections.map((k, j) => <Section key={k} kind={k} own={kit.sections?.[k]} props={{ block: b, index: j, count: b.sections.length }} />)}
              </Frame>
            ))}
          </Page>
          {DESIGN_SLIDE ? <Handle onPress={open} /> : null}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, dim]} />
        </Animated.View>
      </GestureDetector>
      {shown ? (
        <GestureDetector gesture={takeOut}>
          <Animated.View style={[StyleSheet.absoluteFill, { boxShadow: '8px 0px 28px rgba(0,0,0,0.18)' }, page]}>
            <DesignPage onClose={close} />
          </Animated.View>
        </GestureDetector>
      ) : null}
    </View>
  );
}

/** A section as the theme draws it, else the standard way; a theme's own ('x:…') only if it draws it. */
function Section({ kind, own, props }: { kind: Kind; own?: ComponentType<SectionProps>; props: SectionProps }) {
  const C = own ?? (kind in STANDARD_SECTIONS ? STANDARD_SECTIONS[kind as SectionKind] : undefined);
  return C ? <C {...props} /> : null;
}
