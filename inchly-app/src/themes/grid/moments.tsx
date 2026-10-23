import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { subj } from '@/data';
import type { Moment } from '@/moments';
import { fmt } from '@/screens/timer/standard';
import type { MomentKit } from '@/themes/types';
import { useT } from '@/theme';
import { Barcode, Gradient, J, M, pad2, PINK, useSvgId } from './parts';

// 方眼 moments: small windows that type themselves out, a selection box that
// snaps round a finished ToDo, a scan line for the target, and a receipt for
// what you recorded. Each is over in under two seconds.

type Props<K extends Moment['kind']> = { moment: Extract<Moment, { kind: K }>; done: () => void };

/** Fades in, holds, fades out, then says it's done. */
function useShow(ms: number, done: () => void) {
  const o = useSharedValue(0);
  const ref = useRef(done);
  useEffect(() => { ref.current = done; }, [done]);
  useEffect(() => {
    o.set(withSequence(withTiming(1, { duration: 140 }), withDelay(ms - 320, withTiming(0, { duration: 180 }))));
    const id = setTimeout(() => ref.current(), ms);
    return () => clearTimeout(id);
  }, [ms, o]);
  return useAnimatedStyle(() => ({ opacity: o.value }));
}

/** Text that types itself out, a few characters at a time. */
function useTyped(text: string, cps = 60) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((x) => (x >= text.length ? x : x + 1)), 1000 / cps);
    return () => clearInterval(id);
  }, [text, cps]);
  return text.slice(0, n);
}

const now = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; };

/** A session starts: a small window types the command, then OK. */
function Start({ moment, done }: Props<'start'>) {
  const t = useT();
  const a = useShow(1500, done);
  const [at] = useState(now);
  const cmd = useTyped('$ study --start');
  const name = subj(moment.subject).name;
  return (
    <View style={styles.center}>
      <Animated.View style={[{ width: 250, borderWidth: 1, borderColor: t.ink, borderRadius: 4, backgroundColor: t.surface, overflow: 'hidden', boxShadow: '6px 6px 0px rgba(16,16,22,0.9)' }, a]}>
        <View style={{ height: 24, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 6, backgroundColor: t.ink }}>
          <View style={{ width: 6, height: 6, backgroundColor: t.canvas }} />
          <M size={11} lh={14} color={t.canvas}>process.start</M>
        </View>
        <View style={{ padding: 12, gap: 4 }}>
          <M size={12} lh={16}>{cmd}</M>
          <J size={15} w="700" lh={21} numberOfLines={1}>{name}</J>
          <M b size={12} lh={16} color={PINK}>{`[ OK ] ${at}`}</M>
        </View>
      </Animated.View>
    </View>
  );
}

/** A ToDo done: a dashed selection box snaps round a [x]. */
function Todo({ moment, done }: Props<'todo'>) {
  const t = useT();
  const a = useShow(1200, done);
  const s = useSharedValue(1.25);
  useEffect(() => { s.set(withTiming(1, { duration: 200, easing: Easing.steps(4) })); }, [s]);
  const box = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <View style={styles.center}>
      <Animated.View style={[{ paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: t.ink, backgroundColor: 'rgba(243,243,255,0.92)', alignItems: 'center', gap: 2 }, a, box]}>
        <M b size={20} lh={26}>{moment.all ? '[x] ALL DONE' : '[x] todo.txt'}</M>
        <M size={12} lh={16} color={moment.exp ? PINK : t.ink3}>{moment.exp ? `+${moment.exp} EXP` : 'done'}</M>
      </Animated.View>
    </View>
  );
}

/** The target reached: a gradient scan line runs down the screen with the figure on it. */
function Target({ moment, done }: Props<'target'>) {
  const t = useT();
  const { height } = useWindowDimensions();
  const a = useShow(1600, done);
  const y = useSharedValue(0);
  useEffect(() => { y.set(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) })); }, [y]);
  const line = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * (height * 0.7) + height * 0.12 }] }));
  const id = useSvgId('scan');
  return (
    <Animated.View style={[StyleSheet.absoluteFill, a]}>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, gap: 6 }, line]}>
        <View style={{ height: 2 }}><Gradient id={id} /></View>
        <View style={{ alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 4, backgroundColor: t.ink }}>
          <M b size={12} lh={16} color={t.canvas}>{`TARGET ${fmt(moment.min * 60)} REACHED`}</M>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/** A session recorded: a receipt slides up with the minutes, the EXP and a code. */
function Record({ moment, done }: Props<'record'>) {
  const t = useT();
  const a = useShow(1900, done);
  const y = useSharedValue(40);
  useEffect(() => { y.set(withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) })); }, [y]);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const id = useSvgId('lv');
  const name = subj(moment.subject).name;
  const d = new Date();
  const code = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(Math.floor(moment.min / 60))}${pad2(moment.min % 60)}`;
  return (
    <View style={styles.center}>
      <Animated.View style={[{ width: 236, borderWidth: 1, borderColor: t.ink, borderRadius: 4, backgroundColor: t.surface, overflow: 'hidden', boxShadow: '6px 6px 0px rgba(16,16,22,0.9)' }, a, slide]}>
        <View style={{ height: 24, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 6, backgroundColor: t.ink }}>
          <View style={{ width: 6, height: 6, backgroundColor: t.canvas }} />
          <M size={11} lh={14} color={t.canvas}>saved.log</M>
        </View>
        <View style={{ padding: 12, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <M b size={26} lh={30} num>{`+${moment.min}m`}</M>
            <J size={13} w="600" lh={18} numberOfLines={1} style={{ flex: 1 }}>{name}</J>
          </View>
          <M size={12} lh={16} color={t.ink2}>{`+${moment.exp} EXP${moment.ticket ? '  +1 ticket' : ''}`}</M>
          {moment.level ? (
            <View style={{ height: 26, borderRadius: 13, overflow: 'hidden', justifyContent: 'center', paddingHorizontal: 10 }}>
              <Gradient id={id} />
              <M b size={12} lh={16} color="#fff">{`LEVEL UP → LV.${moment.level}`}</M>
            </View>
          ) : null}
          <View style={{ marginTop: 2 }}>
            <Barcode code={code} h={20} color={t.ink} />
          </View>
          <M size={9.5} lh={12} num color={t.ink3}>{`№ ${code}`}</M>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
});

export const moments: MomentKit = { start: Start, todo: Todo, target: Target, record: Record };
