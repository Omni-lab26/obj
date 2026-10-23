import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { subj } from '@/data';
import type { Moment } from '@/moments';
import { T } from '@/themes/kit';
import type { MomentKit } from '@/themes/types';
import { drops, INK, inky, splatPath } from './paint';
import { Shout } from './parts';

// インク's moments: a splash of ink across the screen with a word on it.
// Starting splashes the subject's color, a finished ToDo stamps クリア, the
// target bursts yellow, and a record throws every color at once.

const S = 320;
/** One splash that lands, holds, and dries away; calls done when gone. */
function Burst({ colors, seed, children, done, hold = 900 }: { colors: string[]; seed: string; children: ReactNode; done: () => void; hold?: number }) {
  const s = useSharedValue(0.2);
  const o = useSharedValue(1);
  const w = useSharedValue(0.6);
  const finished = useRef(done);
  useEffect(() => { finished.current = done; }, [done]);
  useEffect(() => {
    s.set(withTiming(1, { duration: 300, easing: Easing.out(Easing.back(1.8)) }));
    w.set(withDelay(80, withSpring(1, { duration: 520, dampingRatio: 0.45 })));
    o.set(withDelay(300 + hold, withTiming(0, { duration: 380 })));
    const id = setTimeout(() => finished.current(), 300 + hold + 420);
    return () => clearTimeout(id);
  }, [s, o, w, hold]);
  const a = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));
  const word = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ rotate: '-6deg' }, { scale: w.value }] }));
  const shapes = useMemo(() => colors.map((c, i) => {
    const r = S * (0.3 - i * 0.045);
    const cx = S / 2 + (i ? Math.cos(i * 2.1) * S * 0.12 : 0), cy = S / 2 + (i ? Math.sin(i * 2.1) * S * 0.1 : 0);
    return { c, d: splatPath(cx, cy, r, `${seed}${i}`, { wobble: 0.16, bulges: 0.4 }), ds: drops(cx, cy, r, `${seed}${i}`, 6) };
  }), [colors, seed]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      <Animated.View style={[{ width: S, height: S }, a]}>
        <Svg width={S} height={S}>
          {shapes.map((x, i) => (
            <G key={i}>
              <Path d={x.d} fill={x.c} />
              {x.ds.map((d, k) => <Circle key={k} cx={d.x} cy={d.y} r={d.r} fill={x.c} />)}
            </G>
          ))}
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', alignItems: 'center', maxWidth: S - 40 }, word]}>{children}</Animated.View>
    </View>
  );
}

const sub = (text: string) => (
  <View style={{ marginTop: 6, backgroundColor: 'rgba(14,14,14,0.82)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 }}>
    <T size={13} w="800" color={INK.white} numberOfLines={2} style={{ textAlign: 'center' }}>{text}</T>
  </View>
);

function Start({ moment, done }: { moment: Extract<Moment, { kind: 'start' }>; done: () => void }) {
  const s = subj(moment.subject);
  return (
    <Burst colors={[inky(s.c)]} seed={`start${s.id}`} done={done} hold={700}>
      <Shout size={40}>スタート!</Shout>
      {sub(`${s.name}をぬりにいこう`)}
    </Burst>
  );
}

function Todo({ moment, done }: { moment: Extract<Moment, { kind: 'todo' }>; done: () => void }) {
  return (
    <Burst colors={moment.all ? [INK.pink, INK.yellow, INK.blue] : [INK.pink]} seed="todo" done={done} hold={moment.all ? 1000 : 650}>
      <Shout size={moment.all ? 34 : 42}>{moment.all ? 'ぜんぶクリア!' : 'クリア!'}</Shout>
      {moment.exp ? sub(`+${moment.exp} EXP`) : null}
    </Burst>
  );
}

function Target({ moment, done }: { moment: Extract<Moment, { kind: 'target' }>; done: () => void }) {
  return (
    <Burst colors={[INK.yellow, INK.orange]} seed="target" done={done}>
      <Shout size={36} color={INK.black} shadow="rgba(255,255,255,0.6)">目標たっせい!</Shout>
      {sub(`${moment.min}分ぬりきった`)}
    </Burst>
  );
}

function Record({ moment, done }: { moment: Extract<Moment, { kind: 'record' }>; done: () => void }) {
  const s = subj(moment.subject);
  return (
    <Burst colors={[inky(s.c), INK.pink, INK.yellow, INK.blue]} seed={`rec${s.id}`} done={done} hold={1100}>
      <Shout size={46} num>{`+${moment.min}分`}</Shout>
      {moment.level ? <Shout size={22} color={INK.yellow}>{`レベルアップ! Lv.${moment.level}`}</Shout> : null}
      {sub([`${s.name}をぬった`, moment.exp ? `+${moment.exp} EXP` : '', moment.ticket ? '休み券ゲット' : ''].filter(Boolean).join(' · '))}
    </Burst>
  );
}

export const moments: MomentKit = { start: Start, todo: Todo, target: Target, record: Record };
