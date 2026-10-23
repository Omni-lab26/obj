import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

import { subj } from '@/data';
import type { Moment } from '@/moments';
import type { MomentKit } from '@/themes/types';
import { Chip, P, Patterns, StampMark, useInk, useOver, useSvgId } from './print';

// What the press makes of a moment: a fresh sheet runs through when you start,
// and a rubber stamp thumps down for a ToDo done, the target reached, and a
// session recorded (a second stamp, the new issue number, when you level up).

type Of<K extends Moment['kind']> = { moment: Extract<Moment, { kind: K }>; done: () => void };

/** A stamp's arc: slammed down from big and faint, held, then lifted away. */
function useSlam(delay = 0, hold = 700) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withDelay(delay, withSequence(withTiming(1, { duration: 150, easing: Easing.in(Easing.quad) }), withDelay(hold, withTiming(2, { duration: 260 })))));
  }, [v, delay, hold]);
  return useAnimatedStyle(() => {
    const x = v.value;
    return x <= 1
      ? { opacity: Math.min(1, x * 2.5), transform: [{ scale: 2.2 - 1.2 * x }] }
      : { opacity: 2 - x, transform: [{ scale: 1 + (x - 1) * 0.06 }] };
  });
}

/** A session starts: a sheet runs through the press with the subject printed on it. */
function Start({ moment, done }: Of<'start'>) {
  const k = useInk();
  const id = useSvgId();
  const { width } = useWindowDimensions();
  useOver(done, 1400);
  const x = useSharedValue(-width);
  useEffect(() => {
    x.set(withSequence(withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) }), withDelay(650, withTiming(width, { duration: 300, easing: Easing.in(Easing.cubic) }))));
  }, [x, width]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={[StyleSheet.absoluteFill, { justifyContent: 'center' }]}>
      <Animated.View style={[{ height: 124, backgroundColor: k.paper, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: k.ink, justifyContent: 'center', paddingHorizontal: 28 }, a]}>
        <Svg width={width} height={8} style={{ position: 'absolute', top: 4, left: 0 }}>
          <Patterns id={id} ink={k.ink} />
          <Rect x={0} y={0} width={width} height={8} fill={`url(#${id}halftone)`} />
        </Svg>
        <Svg width={width} height={8} style={{ position: 'absolute', bottom: 4, left: 0 }}>
          <Patterns id={`${id}b`} ink={k.ink} />
          <Rect x={0} y={0} width={width} height={8} fill={`url(#${id}bhalftone)`} />
        </Svg>
        <P f="monoB" size={11} ls={3}>PRINTING ▶</P>
        <P f="title" size={30} lh={38} numberOfLines={1}>{subj(moment.subject).name}</P>
        <P f="serif" size={12} color={k.ink2}>勉強をはじめました</P>
      </Animated.View>
    </View>
  );
}

/** A ToDo done: 済 (or 完, the day's last one). */
function TodoDone({ moment, done }: Of<'todo'>) {
  useOver(done, 1200);
  const a = useSlam();
  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingBottom: '18%' }]}>
      <Animated.View style={[{ alignItems: 'center', gap: 12 }, a]}>
        <StampMark word={moment.all ? '完' : '済'} sub={moment.all ? 'ALL DONE' : 'DONE'} size={116} />
        {moment.exp ? <Chip label={`+${moment.exp} EXP`} /> : null}
      </Animated.View>
    </View>
  );
}

/** The target reached, while the timer runs on. */
function Target({ moment, done }: Of<'target'>) {
  useOver(done, 1500);
  const a = useSlam(0, 900);
  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingBottom: '22%' }]}>
      <Animated.View style={a}>
        <StampMark box word="目標到達" sub={`${moment.min} MIN`} size={84} tilt={-6} />
      </Animated.View>
    </View>
  );
}

/** A session recorded: 記録, the minutes and the EXP; a level gained is a new issue. */
function Recorded({ moment, done }: Of<'record'>) {
  useOver(done, moment.level ? 2100 : 1500);
  const first = useSlam(0, moment.level ? 1300 : 900);
  const second = useSlam(520, 900);
  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingBottom: '14%', gap: 16 }]}>
      <Animated.View style={[{ alignItems: 'center', gap: 12 }, first]}>
        <StampMark word="記録" sub={`${moment.min} MIN`} size={132} tilt={-9} />
        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
          {moment.exp ? <Chip label={`+${moment.exp} EXP`} /> : null}
          {moment.ticket ? <Chip label="休み券 +1" outline /> : null}
        </View>
      </Animated.View>
      {moment.level ? (
        <Animated.View style={second}>
          <StampMark box word={`第${moment.level}号`} sub="LEVEL UP" size={78} tilt={5} />
        </Animated.View>
      ) : null}
    </View>
  );
}

export const moments: MomentKit = { start: Start, todo: TodoDone, target: Target, record: Recorded };
