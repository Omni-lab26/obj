import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { subj } from '@/data';
import type { Moment } from '@/moments';
import { T } from '@/themes/kit';
import type { MomentKit } from '@/themes/types';
import { useLevel } from '@/store';
import { dismiss, present } from '@/ui/motion';
import { GiltFrame, InkCheck, Placard } from './canvas';
import { tierOf, TIERS, useOil } from './look';
import { bristles, type Pt, strokePath } from './paint';

// What the studio makes of a moment: a broad stroke across the screen when you
// start, an ink check in the sketchbook for a ToDo done, a gilt frame round
// 入選 when the target is reached, and the museum label 《完成》 sliding in
// when a session is recorded (a new frame when you level up into one).

type Of<K extends Moment['kind']> = { moment: Extract<Moment, { kind: K }>; done: () => void };

/** Says the show is over once, after ms (the show runs from when it mounts). */
function useOver(done: () => void, ms: number) {
  const fired = useRef(false);
  useEffect(() => {
    const id = setTimeout(() => { if (!fired.current) { fired.current = true; done(); } }, ms);
    return () => clearTimeout(id);
    // the show runs once, from when it mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** A session starts: one broad stroke of its color across the screen, and its title on a label. */
function Start({ moment, done }: Of<'start'>) {
  const { v } = useOil();
  const { width } = useWindowDimensions();
  const s = subj(moment.subject);
  useOver(done, 1500);
  const p = useSharedValue(0);
  const o = useSharedValue(1);
  const lab = useSharedValue(0);
  useEffect(() => {
    p.set(present(1));
    lab.set(withDelay(240, present(1)));
    o.set(withDelay(1100, dismiss(0)));
  }, [p, o, lab]);
  const art = useMemo(() => {
    const line: Pt[] = Array.from({ length: 9 }, (_, k) => [-10 + ((width + 20) * k) / 8, 46 + Math.sin(k * 0.9) * 6] as Pt);
    return { d: strokePath(line, 72, `start${moment.subject}`), hairs: bristles(line, 72, `start${moment.subject}`) };
  }, [width, moment.subject]);
  // the stroke is uncovered from the left: a window slides right while what's in it slides back (only transforms, nothing laid out again)
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: (p.value - 1) * width }] }));
  const sweepIn = useAnimatedStyle(() => ({ transform: [{ translateX: (1 - p.value) * width }] }));
  const fade = useAnimatedStyle(() => ({ opacity: o.value }));
  const label = useAnimatedStyle(() => ({ opacity: Math.min(1, lab.value * 1.4), transform: [{ translateY: (1 - lab.value) * 14 }, { rotate: '-2deg' }] }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { justifyContent: 'center' }, fade]}>
      <Animated.View style={[{ width, height: 92, overflow: 'hidden' }, sweep]}>
        <Animated.View style={sweepIn}>
          <Svg width={width} height={92}>
            <Path d={art.d} fill={s.c} />
            {art.hairs.map((b, j) => <Path key={j} d={b.d} stroke={b.light ? '#FFFFFF' : '#000000'} strokeWidth={b.w} fill="none" opacity={b.light ? 0.25 : 0.14} />)}
          </Svg>
        </Animated.View>
      </Animated.View>
      <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', top: '50%', marginTop: 26 }}>
        <Animated.View style={label}>
          <Placard style={{ alignItems: 'center', minWidth: 180 }}>
            <T size={11.5} lh={16} color={v.paperInk2}>勉強をはじめました</T>
            <T size={22} lh={29} color={v.paperInk} numberOfLines={1}>{`《${s.name}》`}</T>
          </Placard>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/** A ToDo done: a page of the sketchbook with a big check drawn in ink. */
function TodoDone({ moment, done }: Of<'todo'>) {
  const { v } = useOil();
  useOver(done, 1300);
  const [ink, setInk] = useState(false);
  useEffect(() => { const id = setTimeout(() => setInk(true), 140); return () => clearTimeout(id); }, []);
  const pop = useSharedValue(0);
  useEffect(() => { pop.set(withSequence(present(1), withDelay(560, dismiss(0)))); }, [pop]);
  const a = useAnimatedStyle(() => ({ opacity: pop.value, transform: [{ scale: 0.98 + 0.02 * pop.value }, { rotate: '-3deg' }] }));
  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingBottom: '16%' }]}>
      <Animated.View style={[{ width: 196, paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center', gap: 8, backgroundColor: v.paper,
        borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.15)', boxShadow: '0px 10px 26px rgba(0,0,0,0.25)' }, a]}>
        <InkCheck on={ink} size={58} color={v.paperInk} />
        <T size={16} lh={22} color={v.paperInk}>{moment.all ? '今日のスケッチ、全部できました' : 'ToDo 完了'}</T>
        {moment.exp ? <T size={12.5} lh={17} color={v.paperInk2}>{`+${moment.exp} EXP`}</T> : null}
      </Animated.View>
    </View>
  );
}

/** The target reached: the session's canvas is 入選 — a gilt frame round its label. */
function Target({ moment, done }: Of<'target'>) {
  const { v } = useOil();
  const tier = tierOf(useLevel().lv);
  useOver(done, 1600);
  const z = useSharedValue(0);
  useEffect(() => {
    z.set(withSequence(present(1), withDelay(900, dismiss(2))));
  }, [z]);
  // in from just a touch small, out to just a touch small: never past its size
  const a = useAnimatedStyle(() => (z.value <= 1
    ? { opacity: z.value, transform: [{ scale: 0.98 + 0.02 * z.value }] }
    : { opacity: 2 - z.value, transform: [{ scale: 1 - (z.value - 1) * 0.02 }] }));
  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingBottom: '20%' }]}>
      <Animated.View style={a}>
        <GiltFrame tier={tier} thick={11}>
          <View style={{ backgroundColor: v.paper, paddingHorizontal: 28, paddingVertical: 16, alignItems: 'center', gap: 2 }}>
            <T size={10.5} lh={14} ls={3} color={v.paperInk2}>SELECTED</T>
            <T size={34} lh={44} color={v.paperInk}>入選</T>
            <T size={12.5} lh={17} color={v.paperInk2}>{`目安の${moment.min}分に届きました`}</T>
          </View>
        </GiltFrame>
      </Animated.View>
    </View>
  );
}

/** A session recorded: its museum label slides in — 《完成》, the minutes, the EXP; a level gained, and a grander frame if it brings one. */
function Recorded({ moment, done }: Of<'record'>) {
  const { v } = useOil();
  const s = subj(moment.subject);
  useOver(done, 1900);
  const y = useSharedValue(1);
  useEffect(() => {
    y.set(withSequence(present(0), withDelay(1150, dismiss(1))));
  }, [y]);
  const a = useAnimatedStyle(() => ({ opacity: 1 - y.value * 0.9, transform: [{ translateY: y.value * 150 }, { rotate: '-1.5deg' }] }));
  const tierNow = moment.level ? tierOf(moment.level) : null;
  const newFrame = moment.level && tierNow && tierNow !== tierOf(moment.level - 1) ? TIERS[tierNow] : null;
  const g = tierNow ? TIERS[tierNow] : null;
  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '26%' }]}>
      <Animated.View style={[{ width: 264 }, a]}>
        <Placard style={{ gap: 2 }}>
          <T size={10.5} lh={14} ls={3} color={v.paperInk2}>COMPLETED</T>
          <T size={28} lh={36} color={v.paperInk}>《完成》</T>
          <T size={14} lh={20} color={v.paperInk} numberOfLines={1}>{`${s.name} · ${moment.min}分`}</T>
          <T size={11.5} lh={16} color={v.paperInk2}>{['油彩・カンヴァス', moment.exp ? `+${moment.exp} EXP` : '', moment.ticket ? '休み券 +1' : ''].filter(Boolean).join(' · ')}</T>
          {moment.level && g ? (
            <View style={{ marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, backgroundColor: g.mid, borderWidth: 1.5,
              borderTopColor: g.hi, borderLeftColor: g.hi, borderBottomColor: g.lo, borderRightColor: g.lo }}>
              <T size={12.5} lh={17} color={g.line}>{`レベルアップ Lv.${moment.level}${newFrame ? ` · ${newFrame.label}になりました` : ''}`}</T>
            </View>
          ) : null}
        </Placard>
      </Animated.View>
    </View>
  );
}

export const moments: MomentKit = { start: Start, todo: TodoDone, target: Target, record: Recorded };
