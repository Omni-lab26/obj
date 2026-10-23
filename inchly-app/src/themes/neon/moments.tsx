import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { subj } from '@/data';
import type { Moment } from '@/moments';
import type { MomentKit } from '@/themes/types';
import { D, glow, J, Label, N } from './ui';

// ネオン's moments: the HUD answers. A session starting is a link coming up,
// a ToDo done is a mission cleared, the target is an alarm frame, and a
// record is an upload — with LEVEL UP when it brings one.

/** Calls done once, after ms (the first done: a new moment remounts the show). */
function useAutoDone(done: () => void, ms: number) {
  const [first] = useState(() => done);
  useEffect(() => { const id = setTimeout(first, ms); return () => clearTimeout(id); }, [first, ms]);
}

/** In fast, hold, out: 0 → 1 → 0 over the show. */
function useShow(hold: number) {
  const k = useSharedValue(0);
  useEffect(() => {
    k.set(withSequence(withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }), withDelay(hold, withTiming(0, { duration: 240 }))));
  }, [k, hold]);
  return k;
}

/** Thin bars that streak across, the glitch around a show. */
function Streaks({ color, rows }: { color: string; rows: number[] }) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(-1);
  useEffect(() => { x.set(withRepeat(withTiming(1, { duration: 420, easing: Easing.linear }), 3)); }, [x]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * width }] }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, a]}>
      {rows.map((y, i) => <View key={i} style={{ position: 'absolute', top: `${y}%`, left: '10%', width: '45%', height: i % 2 ? 2 : 4, backgroundColor: color, opacity: 0.7 }} />)}
    </Animated.View>
  );
}

function Start({ moment, done }: { moment: Extract<Moment, { kind: 'start' }>; done: () => void }) {
  useAutoDone(done, 1500);
  const k = useShow(950);
  const band = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ scaleY: 0.2 + 0.8 * k.value }] }));
  const sj = subj(moment.subject);
  const { width } = useWindowDimensions();
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <Animated.View style={[{ paddingVertical: 18, paddingHorizontal: 26, backgroundColor: 'rgba(5,5,5,0.94)', borderTopWidth: 2, borderBottomWidth: 2, borderColor: N.yellow }, band]}>
        <Label>{'// SESSION_START'}</Label>
        <D size={Math.min(40, Math.floor((width - 64) / 8.2))} color={N.yellow} numberOfLines={1} style={glow('rgba(252,238,10,0.6)', 14)}>LINK ESTABLISHED</D>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <View style={{ width: 8, height: 18, backgroundColor: sj.c, transform: [{ skewX: '-16deg' }] }} />
          <J size={16} w="800" numberOfLines={1} style={{ flexShrink: 1 }}>{`${sj.name} を開始`}</J>
        </View>
      </Animated.View>
      <Streaks color={N.cyan} rows={[38, 41, 59, 62]} />
    </View>
  );
}
function Todo({ moment, done }: { moment: Extract<Moment, { kind: 'todo' }>; done: () => void }) {
  useAutoDone(done, 1400);
  const k = useShow(850);
  const { width } = useWindowDimensions();
  const a = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ translateX: (k.value - 1) * width * 0.6 }, { skewX: '-12deg' }] }));
  const title = moment.all ? 'ALL MISSIONS CLEAR' : 'MISSION CLEAR';
  return (
    <View style={{ flex: 1, paddingTop: '30%' }}>
      <Animated.View style={[{ marginLeft: -20, marginRight: 40, paddingVertical: 12, paddingLeft: 40, paddingRight: 20, backgroundColor: N.yellow }, a]}>
        <D size={12} color="rgba(10,10,10,0.6)" style={{ letterSpacing: 1.5 }}>{'// MISSION_LOG'}</D>
        <D size={Math.min(34, Math.floor((width - 100) / (title.length * 0.5)))} color="#0A0A0A" numberOfLines={1}>{title}</D>
        {moment.exp ? <D size={18} color="#0A0A0A">{`+${moment.exp} XP`}</D> : null}
      </Animated.View>
    </View>
  );
}

function Target({ moment, done }: { moment: Extract<Moment, { kind: 'target' }>; done: () => void }) {
  useAutoDone(done, 1700);
  const f = useSharedValue(0);
  useEffect(() => {
    f.set(withSequence(withTiming(1, { duration: 90 }), withTiming(0.2, { duration: 120 }), withTiming(1, { duration: 90 }), withDelay(900, withTiming(0, { duration: 300 }))));
  }, [f]);
  const a = useAnimatedStyle(() => ({ opacity: f.value }));
  return (
    <Animated.View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: N.yellow }, a]}>
      <View style={{ paddingVertical: 16, paddingHorizontal: 22, backgroundColor: 'rgba(5,5,5,0.92)', borderWidth: 1, borderColor: N.yellow, alignItems: 'center' }}>
        <Label>{'// TARGET_REACHED'}</Label>
        <D size={44} color={N.yellow} style={glow('rgba(252,238,10,0.6)', 14)}>{`${moment.min} MIN`}</D>
        <J size={13} w="700" color={N.ink2}>目標の時間に届きました</J>
      </View>
    </Animated.View>
  );
}

function Record({ moment, done }: { moment: Extract<Moment, { kind: 'record' }>; done: () => void }) {
  useAutoDone(done, moment.level ? 2000 : 1600);
  const k = useShow(moment.level ? 1300 : 950);
  const box = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ scale: 0.92 + 0.08 * k.value }] }));
  const sj = subj(moment.subject);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
      <Animated.View style={[{ alignSelf: 'stretch', paddingVertical: 18, paddingHorizontal: 20, backgroundColor: 'rgba(5,5,5,0.95)', borderWidth: 1, borderColor: moment.level ? N.cyan : N.yellow }, box]}>
        <Label>{'// UPLOAD_COMPLETE'}</Label>
        {moment.level ? (
          <>
            <D size={46} color={N.cyan} style={glow('rgba(0,240,255,0.65)', 16)}>LEVEL UP</D>
            <D size={24} color={N.ink}>{`LV.${moment.level}`}</D>
          </>
        ) : (
          <D size={40} color={N.yellow} style={glow('rgba(252,238,10,0.55)', 14)}>{`${moment.min} MIN`}</D>
        )}
        <J size={13} w="700" color={N.ink2} numberOfLines={1}>{`${sj.name} ${moment.min}分を記録`}</J>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
          <D size={18} color={N.yellow}>{`+${moment.exp} XP`}</D>
          {moment.ticket ? <D size={18} color={N.cyan}>+1 REST TICKET</D> : null}
        </View>
      </Animated.View>
      <Streaks color={moment.level ? N.cyan : N.yellow} rows={[28, 31, 70, 73]} />
    </View>
  );
}

export const moments: MomentKit = { start: Start, todo: Todo, target: Target, record: Record };
