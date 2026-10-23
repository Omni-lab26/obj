import { ReactNode, useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { subj } from '@/data';
import { T } from '@/themes/kit';
import type { MomentKit } from '@/themes/types';
import { P, ring, sit } from './look';
import { J, Mood, Pal, STEPS } from './pixel';

// The pal makes something of what you did: a card pops in (in steps), squares
// burst out, and it's gone in under two seconds. The toast says the facts.

const BITS = [P.coral, P.sun, P.sky, P.violet, P.lime];
function Bit({ i, n }: { i: number; n: number }) {
  const t = useSharedValue(0);
  useEffect(() => { t.set(withTiming(1, { duration: 900, easing: Easing.steps(9) })); }, [t]);
  const ang = (i / n) * Math.PI * 2 + (i % 3) * 0.25;
  const dist = 120 + ((i * 23) % 70);
  const a = useAnimatedStyle(() => ({
    opacity: 1 - t.value * t.value,
    transform: [{ translateX: Math.cos(ang) * dist * t.value }, { translateY: Math.sin(ang) * dist * t.value + 60 * t.value * t.value }],
  }));
  return <Animated.View style={[{ position: 'absolute', width: 10, height: 10, backgroundColor: BITS[i % BITS.length], boxShadow: ring(P.ink, 1.5) }, a]} />;
}
function Burst({ n = 18 }: { n?: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: '50%', top: '44%' }}>
      {Array.from({ length: n }, (_, i) => <Bit key={i} i={i} n={n} />)}
    </View>
  );
}

/** A card that pops in, holds, and fades; done() when it's gone. */
function Pop({ done, ms = 1600, bg = P.card, burst, pal, children }: { done: () => void; ms?: number; bg?: string; burst?: boolean; pal?: Mood; children: ReactNode }) {
  const s = useSharedValue(0.4);
  const o = useSharedValue(0);
  const end = useRef(done);
  useEffect(() => { end.current = done; }, [done]);
  useEffect(() => {
    s.set(withTiming(1, { duration: 170, easing: STEPS }));
    o.set(withSequence(withTiming(1, { duration: 80 }), withDelay(ms - 380, withTiming(0, { duration: 300 }))));
    const id = setTimeout(() => end.current(), ms);
    return () => clearTimeout(id);
  }, [ms, o, s]);
  const a = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 70 }}>
      {burst ? <Burst /> : null}
      <Animated.View style={[{ alignItems: 'center' }, a]}>
        {pal ? <View style={{ marginBottom: -2, zIndex: 2 }}><Pal mood={pal} px={4} talk={false} /></View> : null}
        <View style={{ minWidth: 220, maxWidth: 300, alignItems: 'center', gap: 4, paddingVertical: 16, paddingHorizontal: 22, borderRadius: 22, backgroundColor: bg, boxShadow: sit(5) }}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

export const moments: MomentKit = {
  start: ({ moment, done }) => (
    <Pop done={done} ms={1300} pal="work">
      <T f="label" size={10} lh={14} ls={1.5} color={P.ink3}>READY · GO</T>
      <J size={22} w="800" lh={28}>スタート！</J>
      <T size={12.5} lh={17} color={P.ink2} numberOfLines={1}>{`${subj(moment.subject).name}をはじめました`}</T>
    </Pop>
  ),
  todo: ({ moment, done }) => (
    <Pop done={done} ms={1400} bg={moment.all ? P.sun : P.lime} burst={moment.all} pal="happy">
      <T f="groteskBold" size={34} lh={38} num>{moment.exp ? `+${moment.exp} EXP` : 'DONE!'}</T>
      <T f="pixel" size={15} lh={20}>{moment.all ? 'ToDo ぜんぶクリア！' : 'ToDo クリア！'}</T>
    </Pop>
  ),
  target: ({ moment, done }) => (
    <Pop done={done} ms={1700} bg={P.sun} burst pal="cheer">
      <T f="label" size={10} lh={14} ls={1.5}>TARGET CLEAR</T>
      <J size={22} w="800" lh={28}>{`${moment.min}分 たっせい！`}</J>
      <T size={12.5} lh={17} color={P.ink2}>このまま続けても、記録してもOK</T>
    </Pop>
  ),
  record: ({ moment, done }) => (
    <Pop done={done} ms={1800} bg={moment.level ? P.sun : P.card} burst pal="cheer">
      {moment.level ? (
        <>
          <T f="label" size={11} lh={15} ls={1.5}>LEVEL UP!</T>
          <T f="groteskBold" size={46} lh={50} num>{`LV ${moment.level}`}</T>
        </>
      ) : (
        <T f="groteskBold" size={40} lh={46} num>{`+${moment.exp} EXP`}</T>
      )}
      <T size={12.5} lh={17} color={P.ink2} numberOfLines={1}>{`${subj(moment.subject).name} ${moment.min}分を記録しました`}</T>
      {moment.ticket ? (
        <View style={{ marginTop: 6, height: 24, paddingHorizontal: 9, borderRadius: 7, backgroundColor: P.sky, boxShadow: ring(P.ink, 1.5), justifyContent: 'center' }}>
          <T size={11.5} w="800" lh={15}>休み券 +1</T>
        </View>
      ) : null}
    </Pop>
  ),
};
