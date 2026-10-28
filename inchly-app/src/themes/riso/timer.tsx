import { StatusBar } from 'expo-status-bar';
import { ReactNode, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { pad } from '@/data';
import type { Zone } from '@/screens/layout';
import { jpHm, session, useSession } from '@/screens/model';
import { closeTimer, fmt } from '@/screens/timer/standard';
import type { TimerKit } from '@/themes/types';
import { elapsedOf, getState, setTarget, startStudy, togglePause, useStore, useSubjects } from '@/store';
import { haptic, Press } from '@/ui/base';
import { Icon } from '@/ui/Icon';
import { micro, press as pressIn, release } from '@/ui/motion';
import { Chip, Dots, Dotted, P, Patterns, Swatch, useInk, usePlates, useSvgId } from './print';

// The timer as the press itself, printed the other way round: paper-colored
// ink on a deep purple sheet. The time sits in metal-type figures over a
// halftone dial that fills as the session runs; recording is a rubber stamp
// you hold down until it has inked.

function Page({ zones }: { zones: Record<Zone, ReactNode> }) {
  const k = useInk();
  const insets = useSafeAreaInsets();
  // spread over the screen when it fits; on a short screen it scrolls instead of cutting off the stamp
  return (
    <View style={{ flex: 1, backgroundColor: k.deep }}>
      <StatusBar style="light" />
      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 14 }}>
        {zones.head}
        <View style={{ flex: 1, minHeight: 12 }} />
        {zones.center}
        <View style={{ flex: 1, minHeight: 12 }} />
        {zones.foot}
      </ScrollView>
    </View>
  );
}

function Top() {
  const k = useInk();
  // the print run: today's sessions, this one included
  const n = useStore((s) => s.sessions.filter((x) => x.date === s.lastDay).length + (s.running ? 1 : 0));
  return (
    <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
      <Press onPress={closeTimer} react="misprint" scale={0.9} hitSlop={6} accessibilityRole="button" accessibilityLabel="閉じる"
        style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: k.onDeep3, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="x" size={14} color={k.onDeep} />
      </Press>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <P f="monoB" size={10.5} ls={2.2} color={k.onDeep2}>{`PRESS No.${pad(Math.max(1, n))}`}</P>
      </View>
      <View style={{ width: 36 }} />
    </View>
  );
}

function Subject() {
  const k = useInk();
  const ss = useSession();
  const pl = usePlates()(ss.subject.id);
  return (
    <View style={{ alignItems: 'center', gap: 6, paddingHorizontal: 24, paddingTop: 2 }} accessible accessibilityLabel={`${ss.subject.name} ${ss.task}`}>
      <Chip deep outline={!ss.running || ss.paused} label={ss.running ? (ss.paused ? 'PAUSED' : 'NOW PRINTING') : 'READY'} style={{ alignSelf: 'center' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: '100%' }}>
        <Swatch plate={pl} size={16} ink={k.onDeep} />
        <P f="title" size={32} lh={40} color={k.onDeep} numberOfLines={1} style={{ flexShrink: 1 }}>{ss.subject.name}</P>
      </View>
      {ss.task ? <P f="serif" size={13} color={k.onDeep2} numberOfLines={1}>{ss.task}</P> : null}
    </View>
  );
}

/** The subject can change before starting and in the first minute, so the chips show only then. */
function Switcher() {
  const k = useInk();
  const ss = useSession();
  const subjects = useSubjects();
  const plates = usePlates();
  if (!ss.canSwitch) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 14 }} accessibilityRole="radiogroup" accessibilityLabel="科目を変える">
      {subjects.map((x) => {
        const on = x.id === ss.subject.id;
        return (
          <Press key={x.id} onPress={() => session.switchTo(x.id)} react="misprint" scale={0.95} hitSlop={{ top: 6, bottom: 6 }}
            accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={x.name}
            style={{ height: 28, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 2, borderWidth: 1,
              borderColor: on ? k.onDeep : k.onDeep3, backgroundColor: on ? k.onDeep : 'transparent' }}>
            <Swatch plate={plates(x.id)} size={9} ink={on ? k.deep : k.onDeep} />
            <P f="sansB" size={12} lh={16} color={on ? k.deep : k.onDeep2}>{x.name}</P>
          </Press>
        );
      })}
    </View>
  );
}

/** Figures set like metal type: every digit in a cell of the same width, so the time never wobbles. */
function Figures({ text, size, color }: { text: string; size: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {[...text].map((ch, i) => (
        <View key={i} style={{ width: /[\d+]/.test(ch) ? size * 0.62 : size * 0.34, alignItems: 'center' }}>
          <P f="title" size={size} lh={Math.round(size * 1.2)} color={color}>{ch}</P>
        </View>
      ))}
    </View>
  );
}

/** A wedge of the dial, from twelve o'clock, clockwise. */
const wedge = (c: number, r: number, p: number) => {
  if (p >= 0.999) return `M${c} ${c - r}A${r} ${r} 0 1 1 ${c} ${c + r}A${r} ${r} 0 1 1 ${c} ${c - r}Z`;
  const a = p * 2 * Math.PI - Math.PI / 2;
  return `M${c} ${c}L${c} ${c - r}A${r} ${r} 0 ${p > 0.5 ? 1 : 0} 1 ${c + r * Math.cos(a)} ${c + r * Math.sin(a)}Z`;
};

/** The time over the halftone dial: counting up (with the target as the full dial), or counting down in 目安 mode. */
function Readout() {
  const k = useInk();
  const ss = useSession();
  const id = useSvgId();
  const { width, height } = useWindowDimensions();
  // a smaller dial on a short screen, so the stamp at the foot still fits
  const D = Math.round(Math.max(160, Math.min(width - 84, 248, height * (height < 760 ? 0.25 : 0.27))));
  const up = ss.mode === 'up';
  const p = up ? (ss.target ? Math.min(1, ss.elapsed / ss.target) : 0) : ss.running ? (ss.target ? ss.remaining / ss.target : 0) : 1;
  const sec = up ? ss.elapsed : ss.over ? ss.elapsed - ss.target : ss.running ? ss.remaining : ss.target;
  const side = up ? (ss.over ? '目安をこえました' : '勉強した時間') : ss.over ? '超過' : ss.running ? '残り' : 'に集中';
  const c = D / 2, r = c - 10;
  const size = D > 220 ? 46 : 38;
  return (
    <View style={{ alignItems: 'center', opacity: ss.paused ? 0.62 : 1 }} accessible accessibilityLabel={`${side} ${fmt(sec)}`}>
      <View style={{ width: D, height: D }}>
        <Svg width={D} height={D}>
          <Patterns id={id} ink={k.onDeep} scale={1.3} />
          <Circle cx={c} cy={c} r={c - 1} fill="none" stroke={k.onDeep3} strokeWidth={1} />
          <Circle cx={c} cy={c} r={r} fill={`url(#${id}halftone)`} opacity={0.13} />
          {p > 0 ? <Path d={wedge(c, r, p)} fill={`url(#${id}halftone)`} opacity={0.92} /> : null}
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * 2 * Math.PI;
            return <Line key={i} x1={c + (c - 1) * Math.sin(a)} y1={c - (c - 1) * Math.cos(a)} x2={c + (c - 6) * Math.sin(a)} y2={c - (c - 6) * Math.cos(a)} stroke={k.onDeep2} strokeWidth={i % 3 ? 1 : 2} />;
          })}
        </Svg>
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
          <View style={{ backgroundColor: k.deep, paddingHorizontal: 8, borderWidth: 1, borderColor: k.onDeep3 }}>
            <Figures text={`${!up && ss.over ? '+' : ''}${fmt(sec)}`} size={size} color={k.onDeep} />
          </View>
          <View style={{ marginTop: 6, paddingHorizontal: 6, backgroundColor: k.deep }}>
            <P f="serif" size={12.5} color={k.onDeep2}>{side}</P>
          </View>
        </View>
      </View>
    </View>
  );
}

const PRESETS = [15, 25, 45, 60, 90];
/** As on the standard rulers: while studying this sets what's left, before it the length (5 minutes at least, 5 hours at most). */
const setLeft = (raw: number) => {
  const total = Math.max(1, Math.min(300, Math.round(raw)));
  const cur = getState();
  if (cur.running) setTarget(elapsedOf(cur) / 60 + total);
  else setTarget(Math.max(5, total));
};

/** Counting up: the target as page dots. 目安 mode: the length, from a few presets or 5 minutes at a time. */
function Progress() {
  const k = useInk();
  const ss = useSession();
  const short = useWindowDimensions().height < 760;
  const targetMin = Math.round(ss.target / 60);
  if (ss.mode === 'up') {
    const p = ss.target ? Math.min(1, ss.elapsed / ss.target) : 0;
    return (
      <View style={{ alignItems: 'center', gap: 8, marginTop: short ? 10 : 16, paddingHorizontal: 24 }}>
        <Dots n={p * 12} of={12} size={9} color={k.onDeep} a11y={`目安の${Math.round(p * 100)}%`} />
        <P f="serif" size={12} color={k.onDeep2} numberOfLines={1}>
          {ss.paused ? '一時停止中' : ss.over ? `目安の${targetMin}分をこえました` : `目安 ${targetMin}分まで あと ${fmt(ss.remaining)}`}
        </P>
      </View>
    );
  }
  const left = ss.running ? ss.remaining / 60 : ss.target / 60;
  return (
    <View style={{ alignItems: 'center', gap: 10, marginTop: short ? 10 : 14, paddingHorizontal: 16 }}>
      <P f="serif" size={12} color={k.onDeep2}>{ss.paused ? '一時停止中' : ss.running ? `勉強した時間 ${fmt(ss.elapsed)}` : '集中する時間を選びます（分）'}</P>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
        <Chip deep outline label="−5" a11y="5分へらす" onPress={() => setLeft(left - 5)} />
        {PRESETS.map((m) => <Chip key={m} deep outline={ss.running || Math.round(left) !== m} label={String(m)} a11y={ss.running ? `のこり${m}分にする` : `${m}分にする`} onPress={() => setLeft(m)} />)}
        <Chip deep outline label="+5" a11y="5分ふやす" onPress={() => setLeft(left + 5)} />
      </View>
    </View>
  );
}

/** Today so far, and the day's goal. */
function Today() {
  const k = useInk();
  const today = useStore((s) => s.todayMin);
  const goal = useStore((s) => s.goalMin);
  const short = useWindowDimensions().height < 760;
  return (
    <View style={{ marginTop: short ? 10 : 16, marginHorizontal: 56, gap: 8, alignItems: 'center' }}>
      <Dotted color={k.onDeep2} />
      <View style={{ flexDirection: 'row', gap: 18 }}>
        <P f="serif" size={12} color={k.onDeep2}>今日 <P f="title" size={12.5} color={k.onDeep}>{jpHm(today)}</P></P>
        <P f="serif" size={12} color={k.onDeep2}>目標 <P f="title" size={12.5} color={k.onDeep}>{jpHm(goal)}</P></P>
      </View>
    </View>
  );
}

/** Start, pause, resume: a paper disc that slips out of register under your thumb. */
function Main() {
  const k = useInk();
  const running = useStore((s) => s.running);
  const paused = useStore((s) => s.paused);
  const playing = running && !paused;
  const short = useWindowDimensions().height < 760;
  const v = useSharedValue(0);
  const disc = useAnimatedStyle(() => ({ transform: [{ translateX: 1.8 * v.value }, { translateY: -1.3 * v.value }, { scale: 1 - 0.04 * v.value }] }));
  const ghost = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.abs(v.value) * 1.5), transform: [{ translateX: -3.4 * v.value }, { translateY: 2.6 * v.value }] }));
  const press = () => {
    haptic.firm();
    if (!running) startStudy();
    else togglePause();
  };
  return (
    <View style={{ alignItems: 'center', marginTop: short ? 12 : 20, gap: 8 }}>
      <Pressable onPress={press} accessibilityRole="button" accessibilityLabel={playing ? '一時停止' : running ? '再開' : '開始'} style={{ width: 76, height: 76 }}
        onPressIn={() => { v.set(pressIn(1)); }}
        onPressOut={() => { v.set(release(0)); }}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 38, borderWidth: 1.5, borderColor: k.onDeep2 }, ghost]} />
        <Animated.View style={[{ width: 76, height: 76, borderRadius: 38, backgroundColor: k.onDeep, alignItems: 'center', justifyContent: 'center' }, disc]}>
          <Icon name={playing ? 'pause' : 'play'} size={25} color={k.deep} />
        </Animated.View>
      </Pressable>
      <P f="monoB" size={10.5} ls={2.4} color={k.onDeep2}>{playing ? 'PAUSE' : running ? 'RESUME' : 'START'}</P>
    </View>
  );
}

const HOLD = 700;
/** Recording is a stamp: hold it down until the ink has spread across, and the session is filed. */
function Record() {
  const k = useInk();
  const running = useStore((s) => s.running);
  const [w, setW] = useState(0);
  const p = useSharedValue(0);
  const fired = useRef(false);
  const fire = () => {
    if (fired.current) return;
    fired.current = true;
    haptic.success();
    session.finish();
    // put the ink back once the record page covers this one
    setTimeout(() => { p.set(micro(0)); fired.current = false; }, 700);
  };
  const down = () => {
    if (!running) return;
    haptic.soft();
    p.set(withTiming(1, { duration: HOLD, easing: Easing.linear }, (done) => { if (done) scheduleOnRN(fire); }));
  };
  const up = () => { if (p.get() < 1) p.set(micro(0)); };
  // the ink spreads from the left: a window slides right while what's in it slides back (transforms only, nothing laid out each frame)
  const W = Math.max(0, w - 3);
  const fill = useAnimatedStyle(() => ({ transform: [{ translateX: (p.value - 1) * W }] }));
  const fillIn = useAnimatedStyle(() => ({ transform: [{ translateX: (1 - p.value) * W }] }));
  const label = (color: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: '100%' }}>
      <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <P f="title" size={9.5} lh={12} color={color}>記</P>
      </View>
      <P f="sansB" size={14} lh={19} color={color}>長押しで記録する</P>
    </View>
  );
  return (
    <View style={{ marginHorizontal: 24 }}>
      <Pressable onPressIn={down} onPressOut={up} disabled={!running} onLayout={(e) => setW(e.nativeEvent.layout.width)}
        accessibilityRole="button" accessibilityLabel="長押しで記録する" accessibilityHint="押したままにすると、この勉強を記録します" accessibilityState={{ disabled: !running }}
        accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => { if (running) session.finish(); }}
        style={{ height: 58, borderWidth: 1.5, borderColor: k.onDeep, opacity: running ? 1 : 0.35, overflow: 'hidden' }}>
        {label(k.onDeep)}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, width: W, backgroundColor: k.onDeep, overflow: 'hidden' }, fill]}>
          <Animated.View style={[{ width: W, height: '100%' }, fillIn]}>{label(k.deep)}</Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

export const timer: TimerKit = {
  Page,
  parts: { top: Top, subject: Subject, switcher: Switcher, readout: Readout, progress: Progress, today: Today, main: Main, record: Record },
};
