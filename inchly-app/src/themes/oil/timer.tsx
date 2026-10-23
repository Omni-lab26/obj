import { StatusBar } from 'expo-status-bar';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, useAnimatedReaction, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { pad } from '@/data';
import type { Zone } from '@/screens/layout';
import { jpHm, session, useSession } from '@/screens/model';
import { closeTimer, fmt } from '@/screens/timer/standard';
import { T } from '@/themes/kit';
import type { TimerKit } from '@/themes/types';
import { elapsedOf, getState, setTarget, startStudy, togglePause, useStore, useSubjects } from '@/store';
import { focus } from '@/theme';
import { haptic, Press } from '@/ui/base';
import { Icon } from '@/ui/Icon';
import { Dab, Easel, Painting, PaintTap, Spotlight } from './canvas';
import { useOil } from './look';
import { dabPath, type Part, type Pt, signature, strokePath } from './paint';

// The timer as the easel at night: one lamp on the canvas, which fills with
// strokes as the session runs and is covered when it reaches the target
// (past it, the painting is retouched). The time hangs under it on its label.
// Recording is signing the painting: move the pen across the line.

/** Lamp-lit paper tones on the dark studio wall. */
const L = { ink: '#F3EAD3', ink2: 'rgba(243,234,211,0.68)', ink3: 'rgba(243,234,211,0.42)', line: 'rgba(243,234,211,0.2)' };

function Page({ zones }: { zones: Record<Zone, ReactNode> }) {
  const { v } = useOil(); // the wall's color follows the theme
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // spread over the screen when it fits; on a short screen it scrolls instead of cutting off the signature
  return (
    <View style={{ flex: 1, backgroundColor: focus.bg }}>
      <StatusBar style="light" />
      <Spotlight w={width} h={height} color={v.accent} />
      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 14 }}>
        {zones.head}
        <View style={{ flex: 1, minHeight: 10 }} />
        {zones.center}
        <View style={{ flex: 1, minHeight: 12 }} />
        {zones.foot}
      </ScrollView>
    </View>
  );
}

function Top() {
  // today's sessions, this one included
  const n = useStore((s) => s.sessions.filter((x) => x.date === s.lastDay).length + (s.running ? 1 : 0));
  return (
    <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
      <Press onPress={closeTimer} scale={0.9} hitSlop={6} accessibilityRole="button" accessibilityLabel="閉じる"
        style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: L.line, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="x" size={14} color={L.ink} />
      </Press>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <T size={11} lh={15} ls={2.6} color={L.ink2}>{`ATELIER · No.${pad(Math.max(1, n))}`}</T>
      </View>
      <View style={{ width: 36 }} />
    </View>
  );
}

function Subject() {
  const ss = useSession();
  return (
    <View style={{ alignItems: 'center', gap: 1, paddingHorizontal: 24 }} accessible accessibilityLabel={`${ss.subject.name} ${ss.task}`}>
      <T size={11.5} lh={16} color={L.ink3}>{ss.running ? (ss.paused ? '一時停止中' : '勉強中') : 'これから描く一枚'}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%' }}>
        <Dab size={20} color={ss.subject.c} seed={ss.subject.id} />
        <T size={28} lh={36} color={L.ink} numberOfLines={1} style={{ flexShrink: 1 }}>{`《${ss.subject.name}》`}</T>
      </View>
      {ss.task ? <T size={13} lh={18} color={L.ink2} numberOfLines={1}>{ss.task}</T> : null}
    </View>
  );
}

/** The subject can change before starting and in the first minute, so the swatches show only then. */
function Switcher() {
  const ss = useSession();
  const subjects = useSubjects();
  if (!ss.canSwitch) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 12 }} accessibilityRole="radiogroup" accessibilityLabel="科目を変える">
      {subjects.map((x) => {
        const on = x.id === ss.subject.id;
        return (
          <Press key={x.id} onPress={() => session.switchTo(x.id)} scale={0.94} hitSlop={{ top: 6, bottom: 6 }}
            accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={x.name}
            style={{ height: 30, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 15, borderWidth: 1,
              borderColor: on ? L.ink : L.line, backgroundColor: on ? 'rgba(243,234,211,0.1)' : 'transparent' }}>
            <Dab size={13} color={x.c} seed={x.id} />
            <T size={12} lh={16} color={on ? L.ink : L.ink2}>{x.name}</T>
          </Press>
        );
      })}
    </View>
  );
}

/** A slow gleam across paint that's still wet. */
function Glint({ w, h }: { w: number; h: number }) {
  const x = useSharedValue(-w * 0.4);
  useEffect(() => { x.set(withRepeat(withTiming(w * 1.3, { duration: 3400, easing: Easing.inOut(Easing.quad) }), -1, false)); }, [w, x]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { rotate: '18deg' }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -h * 0.3, width: w * 0.14, height: h * 1.6, backgroundColor: 'rgba(255,255,255,0.12)' }, a]} />;
}

/** This session's canvas on the easel, and the time on its label. */
function Readout() {
  const { v } = useOil();
  const ss = useSession();
  const no = useStore((s) => s.sessions.filter((x) => x.date === s.lastDay).length);
  const { width, height } = useWindowDimensions();
  const cw = Math.round(Math.max(150, Math.min(width - 120, 250, height * (height < 760 ? 0.24 : 0.28))));
  const ch = Math.round(cw * 0.76);
  const up = ss.mode === 'up';
  const sec = up ? ss.elapsed : ss.over ? ss.elapsed - ss.target : ss.running ? ss.remaining : ss.target;
  const side = up ? (ss.over ? '目安をこえて、加筆中' : '勉強した時間') : ss.over ? '超過' : ss.running ? '残り' : 'に集中';
  const min = ss.elapsed / 60;
  const wet = ss.running && !ss.paused;
  const parts: Part[] = min >= 1 ? [{ id: ss.subject.id, c: ss.subject.c, min, live: wet ? min : 0 }] : [];
  return (
    <View style={{ alignItems: 'center', opacity: ss.paused ? 0.72 : 1 }}>
      <Easel w={cw} h={ch}>
        <PaintTap a11y={`この勉強の一枚。${jpHm(min)}ぶん描きました`} colors={[ss.subject.c, v.accent]}>
          <View style={{ width: cw, height: ch, overflow: 'hidden' }}>
            <Painting w={cw} h={ch} parts={parts} goal={ss.target / 60} seed={`session:${ss.subject.id}:${no}`} />
            {wet ? <Glint w={cw} h={ch} /> : null}
          </View>
        </PaintTap>
      </Easel>
      <View style={{ marginTop: 8, alignItems: 'center' }} accessible accessibilityLabel={`${side} ${fmt(sec)}`}>
        <T size={52} lh={60} num color={!up && ss.over ? v.accent : L.ink}>{`${!up && ss.over ? '+' : ''}${fmt(sec)}`}</T>
        <T size={12.5} lh={17} color={L.ink2}>{side}</T>
      </View>
    </View>
  );
}

/** The target as a stroke of paint: how far along it is. */
function BrushBar({ w, p, color }: { w: number; p: number; color: string }) {
  const d = useMemo(() => {
    if (p < 0.02) return '';
    const end = 3 + (w - 6) * Math.min(1, p);
    const line: Pt[] = Array.from({ length: 7 }, (_, k) => [3 + ((end - 3) * k) / 6, 6 + Math.sin(k * 1.7) * 0.8] as Pt);
    return strokePath(line, 9, `bar${Math.round(p * 40)}`);
  }, [w, p]);
  return (
    <Svg width={w} height={12}>
      <Path d={`M3 6L${w - 3} 6`} stroke={L.line} strokeWidth={2} strokeLinecap="round" />
      {d ? <Path d={d} fill={color} /> : null}
    </Svg>
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
function Chip({ label, a11y, on, onPress }: { label: string; a11y: string; on?: boolean; onPress: () => void }) {
  const { v } = useOil();
  return (
    <Press onPress={onPress} scale={0.92} hitSlop={{ top: 6, bottom: 6 }} accessibilityRole="button" accessibilityLabel={a11y}
      style={{ minWidth: 40, height: 30, paddingHorizontal: 9, borderRadius: 15, borderWidth: 1, borderColor: on ? v.accent : L.line, backgroundColor: on ? v.accent : 'transparent',
        alignItems: 'center', justifyContent: 'center' }}>
      <T size={13} lh={17} num color={on ? v.onAccent : L.ink}>{label}</T>
    </Press>
  );
}

/** Counting up: the target as a stroke of paint. 目安 mode: the length, from a few presets or 5 minutes at a time. */
function Progress() {
  const { v } = useOil();
  const ss = useSession();
  const { width, height } = useWindowDimensions();
  const short = height < 760;
  const targetMin = Math.round(ss.target / 60);
  if (ss.mode === 'up') {
    const p = ss.target ? Math.min(1, ss.elapsed / ss.target) : 0;
    return (
      <View style={{ alignItems: 'center', gap: 6, marginTop: short ? 8 : 14, paddingHorizontal: 24 }}>
        <BrushBar w={Math.min(width - 96, 280)} p={p} color={ss.over ? v.accent : ss.subject.c} />
        <T size={12} lh={17} color={L.ink2} numberOfLines={1}>
          {ss.paused ? '一時停止中' : ss.over ? `目安の${targetMin}分をこえました` : `目安 ${targetMin}分まで あと ${fmt(ss.remaining)}`}
        </T>
      </View>
    );
  }
  const left = ss.running ? ss.remaining / 60 : ss.target / 60;
  return (
    <View style={{ alignItems: 'center', gap: 10, marginTop: short ? 8 : 14, paddingHorizontal: 16 }}>
      <T size={12} lh={17} color={L.ink2}>{ss.paused ? '一時停止中' : ss.running ? `勉強した時間 ${fmt(ss.elapsed)}` : '集中する時間を選びます（分）'}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
        <Chip label="−5" a11y="5分へらす" onPress={() => setLeft(left - 5)} />
        {PRESETS.map((m) => <Chip key={m} label={String(m)} on={!ss.running && Math.round(left) === m} a11y={ss.running ? `のこり${m}分にする` : `${m}分にする`} onPress={() => setLeft(m)} />)}
        <Chip label="+5" a11y="5分ふやす" onPress={() => setLeft(left + 5)} />
      </View>
    </View>
  );
}

/** Today so far, and the day's goal. */
function Today() {
  const today = useStore((s) => s.todayMin);
  const goal = useStore((s) => s.goalMin);
  const short = useWindowDimensions().height < 760;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: short ? 8 : 12 }}>
      <T size={12} lh={17} color={L.ink2}>今日 <T size={12.5} lh={17} color={L.ink}>{jpHm(today)}</T></T>
      <T size={12} lh={17} color={L.ink2}>目標 <T size={12.5} lh={17} color={L.ink}>{jpHm(goal)}</T></T>
    </View>
  );
}

/** Start, pause, resume: a fat dab of paint that squashes under your thumb. */
function Main() {
  const { v } = useOil();
  const running = useStore((s) => s.running);
  const paused = useStore((s) => s.paused);
  const playing = running && !paused;
  const short = useWindowDimensions().height < 760;
  const d = useMemo(() => dabPath(39, 39, 33, 'main'), []);
  const press = () => {
    haptic.firm();
    if (!running) startStudy();
    else togglePause();
  };
  return (
    <View style={{ alignItems: 'center', marginTop: short ? 10 : 18, gap: 4 }}>
      <Press onPress={press} haptics={false} react="squish" scale={0.86} accessibilityRole="button" accessibilityLabel={playing ? '一時停止' : running ? '再開' : '開始'}
        style={{ width: 78, height: 78, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={78} height={78} style={StyleSheet.absoluteFill}>
          <Path d={d} fill={v.accent} />
          <Circle cx={28} cy={27} r={6} fill="#FFFFFF" opacity={0.35} />
        </Svg>
        <View style={{ zIndex: 1 }}><Icon name={playing ? 'pause' : 'play'} size={24} color={v.onAccent} /></View>
      </Press>
      <T size={11.5} lh={16} color={L.ink2}>{playing ? '一時停止' : running ? '再開' : 'はじめる'}</T>
    </View>
  );
}

/** A pen nib, for the signature. */
function Nib({ color }: { color: string }) {
  return (
    <Svg width={18} height={22} viewBox="0 0 18 22">
      <Path d="M4 1H14V8L9 21L4 8Z" fill={color} />
      <Path d="M9 9V17" stroke="rgba(0,0,0,0.35)" strokeWidth={1.2} />
      <Circle cx={9} cy={8} r={1.6} fill="rgba(0,0,0,0.35)" />
    </Svg>
  );
}

const KNOB = 42;
/** Recording is signing the painting: draw the pen across the line and your signature follows it; past most of the way, the session is filed. */
function Record() {
  const { v } = useOil();
  const running = useStore((s) => s.running);
  const name = useStore((s) => s.account?.name ?? 'Inchly');
  const disabled = !running;
  const [w, setW] = useState(0);
  const sig = useMemo(() => (w > 40 ? signature(w - 16, 42, name) : null), [w, name]);
  const max = useSharedValue(1);
  const x = useSharedValue(0);
  const off = useSharedValue(disabled ? 1 : 0);
  const start = useSharedValue(0);
  useEffect(() => { off.set(disabled ? 1 : 0); }, [disabled, off]);
  const finish = () => {
    haptic.success();
    session.finish();
    // the pen goes back once the record page covers this one
    setTimeout(() => x.set(withSpring(0, { damping: 18, stiffness: 180 })), 700);
  };
  // one tick as the pen crosses the line, either way
  useAnimatedReaction(() => x.get() > max.get() * 0.7, (over, prev) => { if (prev !== null && over !== prev) scheduleOnRN(haptic.tap); });
  // the gesture is built once; its worklets read shared values
  const [pan] = useState(() => Gesture.Pan()
    .activeOffsetX([-3, 3])
    .onBegin(() => { start.set(x.get()); })
    .onUpdate((e) => {
      if (off.get()) return;
      x.set(Math.max(0, Math.min(max.get(), start.get() + e.translationX)));
    })
    .onEnd((e) => {
      if (off.get()) return;
      const m = max.get(), p = x.get();
      if (p > m * 0.7 || (e.velocityX > 900 && p > m * 0.35)) {
        x.set(withTiming(m, { duration: 220, easing: Easing.out(Easing.cubic) }, (done) => { if (done) scheduleOnRN(finish); }));
      } else {
        x.set(withSpring(0, { damping: 16, stiffness: 200 }));
      }
    }));
  const reveal = useAnimatedStyle(() => ({ width: Math.max(0, x.value + KNOB * 0.5 - 8) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const hint = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, max.value * 0.45], [1, 0], 'clamp') }));
  return (
    <View style={{ marginHorizontal: 24 }}>
      <View onLayout={(e) => { const lw = e.nativeEvent.layout.width; setW(lw); max.set(Math.max(1, lw - KNOB)); }}
        accessibilityRole="button" accessibilityLabel="サインして記録する" accessibilityHint="ペンを右へ動かすと、この勉強を記録します" accessibilityState={{ disabled }}
        accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => { if (!disabled) session.finish(); }}
        style={{ height: 68, opacity: disabled ? 0.35 : 1 }}>
        {/* the line to sign on */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 8, right: 8, bottom: 12, height: 1, backgroundColor: L.ink3 }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: 8, bottom: 14 }}><T size={11} lh={13} color={L.ink3}>×</T></View>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: KNOB + 4, right: 8, top: 0, bottom: 14, alignItems: 'center', justifyContent: 'center' }, hint]}>
          <T size={13.5} lh={18} color={L.ink2} numberOfLines={1}>ペンを右へ。サインして記録する</T>
        </Animated.View>
        {sig ? (
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 8, top: 10, height: 44, overflow: 'hidden' }, reveal]}>
            <Svg width={w - 16} height={44}><Path d={sig.d} stroke={L.ink} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </Animated.View>
        ) : null}
        {w ? (
          <GestureDetector gesture={pan}>
            <Animated.View hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[{ position: 'absolute', left: 0, top: 8, width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: v.accent, alignItems: 'center', justifyContent: 'center',
                boxShadow: '0px 3px 10px rgba(0,0,0,0.35)' }, knob]}>
              <Nib color={v.onAccent} />
            </Animated.View>
          </GestureDetector>
        ) : null}
      </View>
    </View>
  );
}

export const timer: TimerKit = {
  Page,
  parts: { top: Top, subject: Subject, switcher: Switcher, readout: Readout, progress: Progress, today: Today, main: Main, record: Record },
};
