import { type ComponentRef, type ReactNode, type Ref, useEffect, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, RefreshControl, ScrollView, type ScrollViewProps, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, type SharedValue, useAnimatedStyle, useSharedValue, withDelay } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Text as SvgText } from 'react-native-svg';

import { type LoaderKind, nextLoader } from '../lib/loaders';
import { font, useT } from '../theme';
import { BRAND_TICKS } from './Brand';
import { fadeIn, fadeOut, micro, spin } from './motion';

export type { LoaderKind };

// The loading marks: a small working thing per 教科 — π being circled (数学),
// electrons round an atom (物理), a benzene ring turning a side at a time
// (化学), DNA's rungs twisting (生物), the moon round the earth (地学), A B C
// lighting in turn (英語), a brush circle (国語, 円相), an hourglass turning
// over (社会), bits flipping (情報). Each loading shows another one, never the
// same twice in a row (nextLoader). They turn only while something loads
// (MOTION.md: spin), on the UI thread.
//
// Where: pulling a tab down to refresh (RefreshScroll), and the timer's cards
// while they're being made (shown only if that takes more than 0.3s).


const [RED, YELLOW, LIGHT, BLUE, PURPLE] = BRAND_TICKS;

const DURATION: Record<LoaderKind, number> = { math: 1000, physics: 1400, chem: 1800, bio: 1600, earth: 1600, english: 1200, japanese: 1300, social: 1600, info: 1600 };

/**
 * A loading mark, turning. `delay` (ms): it turns from the start but shows only
 * after that long, so something quick never flashes it.
 */
export function Loader({ kind, size = 32, delay = 0 }: { kind?: LoaderKind; size?: number; delay?: number }) {
  // without a kind: the next one, kept for as long as this one is up
  const [own] = useState(nextLoader);
  const k = kind ?? own;
  const p = useSharedValue(0);
  const seen = useSharedValue(delay ? 0 : 1);
  useEffect(() => {
    p.set(spin(DURATION[k]));
    if (delay) seen.set(withDelay(delay, micro(1)));
    return () => { cancelAnimation(p); cancelAnimation(seen); };
  }, [k, delay, p, seen]);
  const show = useAnimatedStyle(() => ({ opacity: seen.value }));
  const z = size / 44;
  return (
    <Animated.View style={[{ width: size, height: size }, show]} accessible accessibilityRole="progressbar" accessibilityLabel="読み込み中">
      <View style={{ width: 44, height: 44, transform: [{ scale: z }], transformOrigin: '0% 0%' }}>
        <Mark kind={k} p={p} />
      </View>
    </Animated.View>
  );
}

/** A view the size of the mark (44), turned by `deg(p)`. */
function Turn({ p, deg, children, style }: { p: SharedValue<number>; deg: (p: number) => number; children: ReactNode; style?: object }) {
  const s = useAnimatedStyle(() => ({ transform: [{ rotate: `${deg(p.value)}deg` }] }));
  return <Animated.View style={[StyleSheet.absoluteFill, style, s]}>{children}</Animated.View>;
}
const full = { position: 'absolute' as const, left: 0, top: 0 };

function Mark({ kind, p }: { kind: LoaderKind; p: SharedValue<number> }) {
  const t = useT();
  const ink = t.ink;
  switch (kind) {
    case 'math':
      return (
        <>
          <Svg width={44} height={44} style={full}><Circle cx={22} cy={22} r={17} fill="none" stroke={t.line2} strokeWidth={3.5} /></Svg>
          <Turn p={p} deg={(v) => { 'worklet'; return v * 360; }}>
            <Svg width={44} height={44}><Circle cx={22} cy={22} r={17} fill="none" stroke={BLUE} strokeWidth={3.5} strokeDasharray="70 107" strokeLinecap="round" /></Svg>
          </Turn>
          <Svg width={44} height={44} style={full}><SvgText x={22} y={28} fontSize={16} fontWeight="800" textAnchor="middle" fill={ink} fontFamily="Georgia">π</SvgText></Svg>
        </>
      );
    case 'physics':
      return (
        <>
          {[0, 60, 120].map((a, i) => (
            <View key={a} style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${a}deg` }] }]}>
              <Svg width={44} height={44} style={full}><Ellipse cx={22} cy={22} rx={18} ry={7} fill="none" stroke={LIGHT} strokeWidth={1.6} /></Svg>
              <View style={[StyleSheet.absoluteFill, { transform: [{ scaleY: 7 / 18 }] }]}>
                <Turn p={p} deg={(v) => { 'worklet'; return v * 360 + i * 120; }}>
                  <View style={{ position: 'absolute', left: 37.4, top: 19.4, width: 5.2, height: 5.2, borderRadius: 2.6, backgroundColor: BLUE }} />
                </Turn>
              </View>
            </View>
          ))}
          <View style={{ position: 'absolute', left: 18.5, top: 18.5, width: 7, height: 7, borderRadius: 3.5, backgroundColor: RED }} />
        </>
      );
    case 'chem':
      // a side at a time: the turn moves in steps of 60°
      return (
        <Turn p={p} deg={(v) => { 'worklet'; return Math.floor(v * 6) * 60; }}>
          <Svg width={44} height={44}>
            <Path d="M22 4 L37.6 13 V31 L22 40 L6.4 31 V13Z" fill="none" stroke={PURPLE} strokeWidth={3} strokeLinejoin="round" />
            <Path d="M22 9 L33 15.5 M33 28.5 L22 35 M11 28.5 V15.5" stroke={PURPLE} strokeWidth={2.4} strokeLinecap="round" opacity={0.55} />
            <Circle cx={22} cy={4} r={3} fill={YELLOW} />
          </Svg>
        </Turn>
      );
    case 'bio':
      return <>{Array.from({ length: 6 }, (_, i) => <Rung key={i} i={i} p={p} color={i % 2 ? RED : BLUE} />)}</>;
    case 'earth':
      return (
        <>
          <Svg width={44} height={44} style={full}>
            <Circle cx={22} cy={22} r={17} fill="none" stroke={t.line2} strokeWidth={1.5} strokeDasharray="2 3" />
            <Circle cx={22} cy={22} r={9} fill={BLUE} />
            <Path d="M15 19 q4 -3 7 0 q3 3 6 1" stroke="#fff" strokeWidth={2} fill="none" opacity={0.8} />
          </Svg>
          <Turn p={p} deg={(v) => { 'worklet'; return v * 360; }}>
            <View style={{ position: 'absolute', left: 35.4, top: 18.4, width: 7.2, height: 7.2, borderRadius: 3.6, backgroundColor: YELLOW }} />
          </Turn>
        </>
      );
    case 'english':
      return <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }]}>{['A', 'B', 'C'].map((c, i) => <Letter key={c} c={c} i={i} n={3} p={p} color={ink} />)}</View>;
    case 'japanese':
      return (
        <Turn p={p} deg={(v) => { 'worklet'; return v * 360; }}>
          <Svg width={44} height={44}>
            <Path d="M22 4 A18 18 0 1 1 6.4 31" fill="none" stroke={ink} strokeWidth={4.5} strokeLinecap="round" />
            <Path d="M6.4 31 A18 18 0 0 1 8 15" fill="none" stroke={ink} strokeWidth={1.6} strokeLinecap="round" opacity={0.5} />
          </Svg>
        </Turn>
      );
    case 'social':
      // still for most of the turn, then over in one smooth half turn
      return (
        <Turn p={p} deg={(v) => { 'worklet'; const q = v < 0.6 ? 0 : (v - 0.6) / 0.4; return q * q * (3 - 2 * q) * 180; }}>
          <Svg width={44} height={44}>
            <Path d="M12 5 H32 M12 39 H32" stroke={ink} strokeWidth={3} strokeLinecap="round" />
            <Path d="M14 6 C14 16 30 18 30 22 C30 26 14 28 14 38 H30 C30 28 14 26 14 22 C14 18 30 16 30 6Z" fill="none" stroke={ink} strokeWidth={2} />
            <Path d="M17 33 h10 l-5 -5z" fill={YELLOW} />
          </Svg>
        </Turn>
      );
    case 'info':
      return <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>{[0, 1, 2, 3].map((i) => <Bit key={i} i={i} p={p} color={BLUE} />)}</View>;
  }
}

/** One of DNA's rungs: narrows and widens as the ladder twists (each a step behind the one above). */
function Rung({ i, p, color }: { i: number; p: SharedValue<number>; color: string }) {
  const s = useAnimatedStyle(() => ({ transform: [{ scaleX: 0.25 + 0.75 * Math.abs(Math.cos(Math.PI * (2 * p.value + i / 6))) }] }));
  return <Animated.View style={[{ position: 'absolute', left: 9, top: 5 + i * 6.4, width: 26, height: 3, borderRadius: 1.5, backgroundColor: color }, s]} />;
}
/** A letter that lights in its turn. */
function Letter({ c, i, n, p, color }: { c: string; i: number; n: number; p: SharedValue<number>; color: string }) {
  const s = useAnimatedStyle(() => ({ opacity: 0.25 + 0.75 * Math.max(0, Math.sin(Math.PI * 2 * (p.value - i / (n * 2))) ) }));
  return <Animated.Text style={[{ fontSize: 14, fontWeight: '800', color, fontFamily: font.rounded }, s]}>{c}</Animated.Text>;
}
/** A bit: 0 or 1 by turns (each a step behind the last). */
function Bit({ i, p, color }: { i: number; p: SharedValue<number>; color: string }) {
  const one = useAnimatedStyle(() => ({ opacity: (Math.floor(p.value * 4) + i) % 2 }));
  const zero = useAnimatedStyle(() => ({ opacity: 1 - ((Math.floor(p.value * 4) + i) % 2) }));
  const txt = { fontSize: 12.5, fontWeight: '700' as const, color, fontFamily: 'JetBrainsMono_600SemiBold', fontVariant: ['tabular-nums' as const] };
  return (
    <View style={{ width: 9, alignItems: 'center' }}>
      <Animated.Text style={[txt, zero]}>0</Animated.Text>
      <Animated.Text style={[txt, { position: 'absolute' }, one]}>1</Animated.Text>
    </View>
  );
}

/**
 * A page's scroll view that refreshes when pulled down: the loading mark comes
 * in as you pull and turns while it refreshes (iOS's own spinner is hidden).
 * What's on the phone is already up to date, so a refresh redraws (onRefresh)
 * and the mark shows for a moment; with a server it will wait for the answer.
 */
export function RefreshScroll({ ref, onRefresh, onScroll, children, ...rest }: ScrollViewProps & { ref?: Ref<ComponentRef<typeof ScrollView>>; onRefresh?: () => void }) {
  const [refreshing, setRefreshing] = useState(false);
  const [pulling, setPulling] = useState(false);
  // the same mark from the pull to the end of the refresh; the next refresh has another
  const [kind, setKind] = useState(nextLoader);
  const pull = useSharedValue(0);
  const run = () => {
    setRefreshing(true);
    onRefresh?.();
    setTimeout(() => { setRefreshing(false); setKind(nextLoader()); }, 900);
  };
  const scrolled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = -e.nativeEvent.contentOffset.y;
    pull.set(y);
    if ((y > 4) !== pulling) setPulling(y > 4);
    onScroll?.(e);
  };
  const shown = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, pull.value / 60)) }));
  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={ref} {...rest} onScroll={scrolled} scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={run} tintColor="transparent" colors={['transparent']} progressBackgroundColor="transparent" />}>
        {children}
      </ScrollView>
      {refreshing ? (
        <Animated.View entering={fadeIn()} exiting={fadeOut()} pointerEvents="none" style={{ position: 'absolute', top: 14, left: 0, right: 0, alignItems: 'center' }}>
          <Loader kind={kind} size={30} />
        </Animated.View>
      ) : pulling ? (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 14, left: 0, right: 0, alignItems: 'center' }, shown]}>
          <Loader kind={kind} size={30} />
        </Animated.View>
      ) : null}
    </View>
  );
}
