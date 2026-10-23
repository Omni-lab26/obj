import { ReactNode, useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';

import { subj } from '@/data';
import { T } from '@/themes/kit';
import type { MomentKit } from '@/themes/types';
import { useT } from '@/theme';
import { alpha, Mood, pastel, Stamp } from './look';
import { Chip, Mochi, R, Shape, Tape, useV } from './parts';

// The sticker diary makes something of what you did: a sticker slaps onto the
// page with the mochi on it, hearts or stars burst out, and it's gone in under
// two seconds. The toast says the facts.

function Bit({ i, n, kind, color }: { i: number; n: number; kind: Stamp | 'sparkle'; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => { p.set(withDelay((i % 4) * 30, withTiming(1, { duration: 950, easing: Easing.out(Easing.cubic) }))); }, [i, p]);
  const ang = (i / n) * Math.PI * 2 + (i % 3) * 0.3;
  const dist = 110 + ((i * 29) % 80);
  const spin = ((i * 47) % 120) - 60;
  const a = useAnimatedStyle(() => ({
    opacity: 1 - p.value * p.value,
    transform: [{ translateX: Math.cos(ang) * dist * p.value }, { translateY: Math.sin(ang) * dist * p.value + 40 * p.value * p.value }, { rotate: `${spin * p.value}deg` }, { scale: 0.5 + 0.7 * p.value }],
  }));
  return <Animated.View style={[{ position: 'absolute', left: -11, top: -11 }, a]}><Shape kind={kind} size={22} fill={color} /></Animated.View>;
}
function Burst({ n = 16, kinds }: { n?: number; kinds: (Stamp | 'sparkle')[] }) {
  const v = useV();
  const colors = [v.accent, v.sun, v.accent2, pastel(v.accent, 0.4), v.deep];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: '50%', top: '45%' }}>
      {Array.from({ length: n }, (_, i) => <Bit key={i} i={i} n={n} kind={kinds[i % kinds.length]} color={colors[i % colors.length]} />)}
    </View>
  );
}

/**
 * A sticker that slaps onto the page, holds, and fades; done() when it's gone.
 * On top sits the mochi (`mood`) — or, where the screen has its own mochi
 * already (the timer), another sticker (`top`).
 */
function Slap({ done, ms = 1600, mood, top, burst, bg, children }: { done: () => void; ms?: number; mood?: Mood; top?: ReactNode; burst?: (Stamp | 'sparkle')[]; bg?: string; children: ReactNode }) {
  const t = useT();
  const v = useV();
  const s = useSharedValue(1.7);
  const r = useSharedValue(-14);
  const o = useSharedValue(0);
  const end = useRef(done);
  useEffect(() => { end.current = done; }, [done]);
  useEffect(() => {
    s.set(withSpring(1, { duration: 420, dampingRatio: 0.45 }));
    r.set(withSpring(-4, { duration: 420, dampingRatio: 0.45 }));
    o.set(withSequence(withTiming(1, { duration: 90 }), withDelay(ms - 400, withTiming(0, { duration: 300 }))));
    const id = setTimeout(() => end.current(), ms);
    return () => clearTimeout(id);
  }, [ms, o, r, s]);
  const a = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }, { rotate: `${r.value}deg` }] }));
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 70 }}>
      {burst ? <Burst kinds={burst} /> : null}
      <Animated.View style={[{ alignItems: 'center' }, a]}>
        <View style={{ marginBottom: -14, zIndex: 2 }}>{mood ? <Mochi mood={mood} size={70} poke={false} /> : top}</View>
        <View style={{ minWidth: 220, maxWidth: 300, alignItems: 'center', gap: 4, paddingTop: 22, paddingBottom: 18, paddingHorizontal: 24, borderRadius: 28, backgroundColor: bg ?? t.surface,
          boxShadow: `0px 0px 0px 5px ${t.surface}, 0px 0px 0px 7px ${alpha(v.accent, 0.4)}, 0px 10px 0px 4px ${alpha(v.accent, 0.22)}` }}>
          {children}
          <Tape color={v.tapes[1]} w={64} angle={10} style={{ top: -12, right: 14 }} />
        </View>
      </Animated.View>
    </View>
  );
}

/** A small crown, for a new level. */
function Crown({ color, ink }: { color: string; ink: string }) {
  return (
    <Svg width={44} height={34} viewBox="0 0 100 78">
      <Path d="M10 66 L16 20 L36 44 L50 10 L64 44 L84 20 L90 66 Z" fill={color} stroke={ink} strokeWidth={6} strokeLinejoin="round" />
      <Rect x={10} y={62} width={80} height={12} rx={5} fill={color} stroke={ink} strokeWidth={6} />
    </Svg>
  );
}

function Title({ children, color }: { children: string; color?: string }) {
  const t = useT();
  return <T size={22} w="800" lh={30} color={color ?? t.ink}>{children}</T>;
}
function Sub({ children }: { children: string }) {
  const t = useT();
  return <T size={12.5} lh={18} color={t.ink2} numberOfLines={1}>{children}</T>;
}

/** A rosette: a round medal on two ribbons, with a star in it. */
function Medal() {
  const t = useT();
  const v = useV();
  return (
    <Svg width={62} height={70} viewBox="0 0 100 112">
      <Path d="M34 58 L20 106 L36 96 L46 110 L54 64 Z" fill={v.accent} stroke={t.ink} strokeWidth={5} strokeLinejoin="round" />
      <Path d="M66 58 L80 106 L64 96 L54 110 L46 64 Z" fill={v.accent2} stroke={t.ink} strokeWidth={5} strokeLinejoin="round" />
      <Path d="M50 6 C62 6 64 14 72 16 C80 18 88 24 86 34 C84 42 92 48 88 56 C84 64 76 64 72 70 C66 76 60 82 50 80 C40 82 34 76 28 70 C24 64 16 64 12 56 C8 48 16 42 14 34 C12 24 20 18 28 16 C36 14 38 6 50 6 Z" fill={v.sun} stroke={t.ink} strokeWidth={5} strokeLinejoin="round" />
      <Path d="M50 22 L55 36 L70 37 L58 46 L62 61 L50 52 L38 61 L42 46 L30 37 L45 36 Z" fill={t.surface} stroke={t.ink} strokeWidth={4} strokeLinejoin="round" />
    </Svg>
  );
}

export const moments: MomentKit = {
  start: ({ moment, done }) => <StartShow subject={moment.subject} done={done} />,
  todo: ({ moment, done }) => <TodoShow all={moment.all} exp={moment.exp} done={done} />,
  target: ({ moment, done }) => <TargetShow min={moment.min} done={done} />,
  record: ({ moment, done }) => <RecordShow {...moment} done={done} />,
};

function TodoShow({ all, exp, done }: { all: boolean; exp: number; done: () => void }) {
  const v = useV();
  return (
    <Slap done={done} ms={all ? 1800 : 1400} mood="happy" burst={all ? ['heart', 'sparkle', 'heart', 'star'] : ['heart']} bg={all ? pastel(v.sun, 0.55) : undefined}>
      <R size={32} lh={38} num color={v.deep}>{exp ? `+${exp} EXP` : 'できた！'}</R>
      <Title>{all ? 'ToDo ぜんぶできた！' : 'ToDo できた！'}</Title>
    </Slap>
  );
}
function StartShow({ subject, done }: { subject: string; done: () => void }) {
  const t = useT();
  const v = useV();
  return (
    <Slap done={done} ms={1300} top={<Shape kind="star" size={60} fill={v.sun} stroke={t.ink} sw={5} />} burst={['sparkle', 'star']}>
      <Title>スタート！</Title>
      <Sub>{`${subj(subject).name}をはじめたよ`}</Sub>
    </Slap>
  );
}
function TargetShow({ min, done }: { min: number; done: () => void }) {
  const v = useV();
  return (
    <Slap done={done} ms={1700} top={<Medal />} burst={['star', 'sparkle']} bg={pastel(v.sun, 0.55)}>
      <Title>目安クリア！</Title>
      <Sub>{`${min}分 がんばったね。このまま続けてもOK`}</Sub>
    </Slap>
  );
}
function RecordShow({ subject, min, exp, level, ticket, done }: { subject: string; min: number; exp: number; level: number | null; ticket: boolean; done: () => void }) {
  const t = useT();
  const v = useV();
  return (
    <Slap done={done} ms={1900} mood="cheer" burst={['heart', 'star', 'sparkle', 'flower']} bg={level ? pastel(v.sun, 0.55) : undefined}>
      {level ? (
        <>
          <Crown color={v.sun} ink={t.ink} />
          <R size={30} lh={36} num color={t.ink}>{`Lv.${level}`}</R>
          <Title>レベルアップ！</Title>
        </>
      ) : (
        <R size={34} lh={40} num color={v.deep}>{`+${exp} EXP`}</R>
      )}
      <Sub>{`${subj(subject).name} ${min}分 きろくしたよ`}</Sub>
      {ticket ? <View style={{ marginTop: 6 }}><Chip bg={pastel(v.accent2, 0.6)}>おやすみ券 +1</Chip></View> : null}
    </Slap>
  );
}
