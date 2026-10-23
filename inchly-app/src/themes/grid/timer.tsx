import { StatusBar } from 'expo-status-bar';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedReaction, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { subj } from '@/data';
import { Zone } from '@/screens/layout';
import { hmColon, session, useSession } from '@/screens/model';
import { closeTimer, fmt, STANDARD_PARTS, useLeft, useRulerPreview } from '@/screens/timer/standard';
import { elapsedOf, startStudy, togglePause, useNow, useStore, useSubjects } from '@/store';
import type { TimerKit } from '@/themes/types';
import { focus, useT } from '@/theme';
import { haptic, Press } from '@/ui/base';
import { Screen } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { Blink, Gradient, J, M, NIGHT as N, pad2, PINK, ScreenFrame, useSvgId, Window } from './parts';

// 方眼 timer: a session file open on a dark desk. The grid behind it sways
// slowly while the clock runs and stands still when it stops; the time sits in
// a window named after what you're doing, in big monospaced figures.

/** The grid behind the timer: it sways while the clock runs, and turns pink past the target. */
function SwayGrid({ live, over }: { live: boolean; over: boolean }) {
  const { width, height } = useWindowDimensions();
  const s = useSharedValue(0);
  useEffect(() => {
    if (live) s.set(withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }), -1, true));
    else cancelAnimation(s);
  }, [live, s]);
  const a = useAnimatedStyle(() => ({ transform: [{ skewX: `${(s.value - 0.5) * 3}deg` }, { scaleY: 1 + s.value * 0.025 }] }));
  const step = 28;
  const d: string[] = [];
  for (let y = -step; y <= height + step; y += step) {
    const bow = Math.sin((y / height) * Math.PI) * 6;
    d.push(`M-40 ${y} Q ${width / 2} ${y + bow} ${width + 40} ${y}`);
  }
  for (let x = -step * 2; x <= width + step * 2; x += step) {
    const lean = (x - width / 2) * 0.05;
    d.push(`M${x} -40 Q ${x + lean} ${height / 2} ${x - lean} ${height + 40}`);
  }
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, a]}>
      <Svg width={width} height={height}>
        <Path d={d.join(' ')} stroke={over ? 'rgba(255,91,216,0.22)' : 'rgba(243,243,255,0.08)'} strokeWidth={1} fill="none" />
      </Svg>
    </Animated.View>
  );
}

function Page({ zones }: { zones: Record<Zone, ReactNode> }) {
  useT(); // follows the theme
  const insets = useSafeAreaInsets();
  const running = useStore((s) => s.running);
  const paused = useStore((s) => s.paused);
  const name = subj(useStore((s) => s.subj)).name;
  const over = useOver();
  return (
    <Screen bg={focus.bg} style={{ paddingBottom: insets.bottom + 14 }}>
      <StatusBar style="light" />
      <SwayGrid live={running && !paused} over={over} />
      <ScreenFrame top={insets.top + 2} bottom={Math.max(6, insets.bottom - 4)} color={N.frame} />
      {zones.head}
      <View style={{ flex: 1, minHeight: 14 }} />
      <View style={{ marginHorizontal: 16 }}>
        <Window id="timer" fixed dark title={`session_${name}.tmp`} meta={(color) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {running ? <Blink on={!paused} /> : null}
            <M size={10.5} lh={14} color={running && !paused ? PINK : color}>{running ? (paused ? 'PAUSED' : 'REC') : 'READY'}</M>
          </View>
        )}>
          <View style={{ paddingTop: 16, paddingBottom: 14, paddingHorizontal: 12 }}>{zones.center}</View>
        </Window>
      </View>
      <View style={{ flex: 1, minHeight: 14 }} />
      {zones.foot}
    </Screen>
  );
}
/** Past the target (only while the clock runs). Ticks once a second, like the clock. */
function useOver() {
  const now = useNow();
  return useStore((s) => s.running && elapsedOf(s, now) > s.targetMin * 60);
}

function NightClock() {
  const now = new Date(useNow());
  return <M size={12} lh={16} num color={N.ink2}>{`${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`}</M>;
}

function Top() {
  return (
    <View style={{ height: 50, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18 }}>
      <Press onPress={closeTimer} react="step" scale={0.9} hitSlop={8} accessibilityRole="button" accessibilityLabel="閉じる"
        style={{ height: 28, paddingHorizontal: 9, borderRadius: 4, borderWidth: 1, borderColor: N.frame, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <View style={{ transform: [{ rotate: '-90deg' }] }}><Icon name="back" size={12} color={N.ink} width={2} /></View>
        <M size={11} lh={14} color={N.ink}>esc</M>
      </Press>
      <M size={11} lh={14} color={N.ink3} numberOfLines={1} style={{ flex: 1 }}>~/inchly/timer</M>
      <NightClock />
    </View>
  );
}

/** What you're doing, as a command and then large. */
function Subject() {
  const ss = useSession();
  return (
    <View style={{ paddingHorizontal: 22, paddingTop: 8, gap: 4 }} accessible accessibilityLabel={`${ss.subject.name} ${ss.task}`}>
      <M size={11} lh={14} color={N.ink3}>{'> study --subject'}</M>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 12, height: 12, backgroundColor: ss.subject.c }} />
        <J size={28} w="800" lh={36} color={N.ink} numberOfLines={1} style={{ flexShrink: 1 }}>{ss.subject.name}</J>
      </View>
      {ss.task ? <J size={13} lh={18} color={N.ink2} numberOfLines={1}>{ss.task}</J> : null}
    </View>
  );
}

/** Other subjects as bordered tags (before starting and in the first minute only). */
function Switcher() {
  const ss = useSession();
  const subjects = useSubjects();
  if (!ss.canSwitch) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 22, paddingTop: 12 }} accessibilityRole="radiogroup" accessibilityLabel="科目を変える">
      {subjects.map((x) => {
        const on = x.id === ss.subject.id;
        return (
          <Press key={x.id} onPress={() => session.switchTo(x.id)} haptics={false} react="step" scale={0.92} hitSlop={{ top: 6, bottom: 6 }}
            accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={x.name}
            style={{ height: 28, paddingHorizontal: 9, borderRadius: 4, borderWidth: 1, borderColor: on ? N.ink : N.frame, backgroundColor: on ? N.ink : 'transparent',
              flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 160 }}>
            <View style={{ width: 6, height: 6, backgroundColor: x.c }} />
            <J size={12} w="600" lh={16} color={on ? '#101016' : N.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>{x.name}</J>
          </Press>
        );
      })}
    </View>
  );
}

/** The time studied (or, in 目安 mode, left), as big as the window allows; what a moving ruler is on, while it moves. */
function Readout() {
  const ss = useSession();
  const p = useRulerPreview();
  const left = useLeft();
  const { width } = useWindowDimensions();
  const rem = ss.target - ss.elapsed;
  const up = ss.mode === 'up';
  const sec = up ? ss.elapsed : ss.over ? -rem : ss.running ? rem : ss.target;
  const over = !up && ss.over;
  const side = up ? '勉強した時間' : ss.over ? '超過' : ss.running ? '残り' : 'に集中';
  const moving = !up && (p.h !== null || p.m !== null);
  const shown = moving ? Math.min(300, (p.h ?? left.h) * 60 + (p.m ?? Math.floor(left.m))) * 60 : sec;
  const text = `${over && !moving ? '+' : ''}${fmt(shown)}`;
  // the figures fill the window: 0.6em each in the monospaced face
  const size = Math.min(64, Math.floor((width - 32 - 2 - 24 - 8) / (text.length * 0.62)));
  return (
    <View accessible accessibilityLabel={`${side} ${fmt(shown)}`} style={{ alignItems: 'center', gap: 2, opacity: ss.paused && !moving ? 0.5 : 1 }}>
      <J size={11} lh={15} color={over && !moving ? PINK : N.ink3}>{moving ? 'に設定' : side}</J>
      <M b size={size} lh={Math.round(size * 1.12)} num ls={-1} color={over && !moving ? PINK : N.ink}>{text}</M>
    </View>
  );
}

/** Counting up: the target as a ruler, ticks every five minutes, filled in the subject's color. 目安 mode: the two rulers. */
function Progress() {
  const ss = useSession();
  const [w, setW] = useState(0);
  if (ss.mode !== 'up') {
    const Rulers = STANDARD_PARTS.progress;
    return <Rulers />;
  }
  const targetMin = ss.target / 60;
  const f = Math.min(1, ss.elapsed / Math.max(1, ss.target));
  const ticks = Math.max(1, Math.floor(targetMin / 5));
  return (
    <View style={{ marginTop: 16, gap: 8 }}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: 22 }} accessible accessibilityLabel={`目安 ${Math.round(targetMin)}分のうち ${Math.floor(ss.elapsed / 60)}分`}>
        {w ? (
          <Svg width={w} height={22}>
            <Rect x={0} y={0} width={w * f} height={9} fill={ss.over ? PINK : ss.subject.c} />
            <Rect x={0.5} y={0.5} width={w - 1} height={9} fill="none" stroke={N.ink} strokeWidth={1} />
            {Array.from({ length: ticks + 1 }, (_, i) => {
              const x = Math.min(w - 0.5, Math.max(0.5, (w * i * 5) / Math.max(5, targetMin)));
              return <Line key={i} x1={x} y1={11} x2={x} y2={i % 3 ? 14 : 18} stroke={N.ink3} strokeWidth={1} />;
            })}
            <Path d={`M${Math.max(4, Math.min(w - 4, w * f))} 12 l-4 7 h8 z`} fill={N.ink} />
          </Svg>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row' }}>
        <M size={10} lh={13} color={N.ink3} style={{ flex: 1 }}>0m</M>
        <J size={11} lh={15} color={ss.over ? PINK : N.ink3} numberOfLines={1}>
          {ss.paused ? '一時停止中' : ss.over ? `目安の${Math.round(targetMin)}分をこえました` : `目安まで あと ${fmt(ss.remaining)}`}
        </J>
        <M size={10} lh={13} color={N.ink3} style={{ flex: 1, textAlign: 'right' }}>{`${Math.round(targetMin)}m`}</M>
      </View>
    </View>
  );
}

function TodayLine() {
  const today = useStore((s) => s.todayMin);
  const goal = useStore((s) => s.goalMin);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 14 }}>
      <M size={11} lh={14} color={N.ink3}>{'today '}<M b size={11} lh={14} num color={N.ink}>{hmColon(today)}</M></M>
      <M size={11} lh={14} color={N.ink3}>{'goal '}<M b size={11} lh={14} num color={N.ink}>{hmColon(goal)}</M></M>
    </View>
  );
}

/** START (the gradient), PAUSE and RESUME (outlined); held down, it fills in. */
function Main() {
  const running = useStore((s) => s.running);
  const paused = useStore((s) => s.paused);
  const playing = running && !paused;
  const id = useSvgId('go');
  const p = useSharedValue(0);
  const fill = useAnimatedStyle(() => ({ opacity: p.value }));
  const label = playing ? 'PAUSE' : running ? 'RESUME' : 'START';
  const press = () => {
    haptic.firm();
    if (!running) startStudy();
    else togglePause();
  };
  return (
    <View style={{ alignItems: 'center', marginBottom: 16 }}>
      <Pressable onPressIn={() => p.set(withTiming(1, { duration: 70 }))} onPressOut={() => p.set(withTiming(0, { duration: 220 }))} onPress={press}
        accessibilityRole="button" accessibilityLabel={playing ? '一時停止' : running ? '再開' : '開始'}
        style={{ height: 56, minWidth: 210, paddingHorizontal: 28, borderRadius: 28, borderWidth: 1, borderColor: N.ink, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        {running ? null : <Gradient id={id} />}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: N.ink }, fill]} />
        <Icon name={playing ? 'pause' : 'play'} size={14} color={running ? N.ink : '#fff'} />
        <M b size={15} lh={18} ls={1} color={running ? N.ink : '#fff'}>{label}</M>
        {/* the same, dark, on top of the fill while held */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, fill]}>
          <Icon name={playing ? 'pause' : 'play'} size={14} color="#101016" />
          <M b size={15} lh={18} ls={1} color="#101016">{label}</M>
        </Animated.View>
      </Pressable>
    </View>
  );
}

function Record() {
  const running = useStore((s) => s.running);
  return (
    <View style={{ marginHorizontal: 16, gap: 6 }}>
      <M size={10.5} lh={14} color={N.ink3}>{'> commit session'}</M>
      <Commit disabled={!running} onDone={session.finish} />
    </View>
  );
}

// Slide to record, the grid's way: a framed track the gradient fills as the
// square knob moves; past 70% it finishes by itself, otherwise it steps back.
// The drag runs on the UI thread; React hears only "passed the line" and "done".
const KNOB = 46;
const GAP = 5;
const LABEL = '右へスライドして記録する';
function Commit({ onDone, disabled }: { onDone: () => void; disabled: boolean }) {
  const id = useSvgId('commit');
  const [w, setW] = useState(0);
  const max = useSharedValue(1);
  const x = useSharedValue(0);
  const off = useSharedValue(disabled ? 1 : 0);
  const start = useSharedValue(0);
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; off.set(disabled ? 1 : 0); }, [onDone, disabled, off]);
  const finish = () => {
    haptic.success();
    doneRef.current();
    // put the knob back once the record page covers this one
    setTimeout(() => x.set(withTiming(0, { duration: 200, easing: Easing.steps(5) })), 700);
  };
  // one tick as the knob crosses the line, either way
  useAnimatedReaction(() => x.get() > max.get() * 0.7, (over, prev) => { if (prev !== null && over !== prev) scheduleOnRN(haptic.tap); });
  // The gesture is built once; its worklets read shared values, and finish reads onDone from a ref when it fires.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => Gesture.Pan()
    .activeOffsetX([-2, 2])
    .onBegin(() => { start.set(x.get()); })
    .onUpdate((e) => {
      if (off.get()) return;
      x.set(Math.max(0, Math.min(max.get(), start.get() + e.translationX)));
    })
    .onEnd((e) => {
      if (off.get()) return;
      const m = max.get(), v = x.get();
      if (v > m * 0.7 || (e.velocityX > 900 && v > m * 0.35)) {
        x.set(withTiming(m, { duration: 160 }, (done) => { if (done) scheduleOnRN(finish); }));
      } else {
        x.set(withTiming(0, { duration: 240, easing: Easing.steps(6) }));
      }
    }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fill = useAnimatedStyle(() => ({ width: x.value + KNOB + GAP * 2 }));
  const lbl = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, max.value * 0.6], [1, 0], 'clamp') }));
  return (
    <View onLayout={(e) => { const lw = e.nativeEvent.layout.width; setW(lw); max.set(Math.max(1, lw - 2 - KNOB - GAP * 2)); }}
      accessibilityRole="button" accessibilityLabel={LABEL} accessibilityState={{ disabled }}
      accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => { if (!disabled) onDone(); }}
      style={{ height: KNOB + GAP * 2 + 2, borderRadius: (KNOB + GAP * 2 + 2) / 2, borderWidth: 1, borderColor: N.frame, backgroundColor: 'rgba(243,243,255,0.04)', overflow: 'hidden', opacity: disabled ? 0.35 : 1 }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden', borderRadius: (KNOB + GAP * 2) / 2 }, fill]}>
        <Gradient id={id} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: KNOB + GAP, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 1 }, lbl]}>
        <M size={11} lh={14} color={N.ink2}>{'slide to commit →'}</M>
        <J size={10.5} lh={14} color={N.ink3}>{LABEL}</J>
      </Animated.View>
      {w ? (
        <GestureDetector gesture={pan}>
          <Animated.View hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={[{ position: 'absolute', top: GAP, left: GAP, width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: N.ink, alignItems: 'center', justifyContent: 'center' }, knob]}>
            <Icon name="arrow" size={20} color="#101016" width={2.2} />
          </Animated.View>
        </GestureDetector>
      ) : null}
    </View>
  );
}

export const timer: TimerKit = {
  Page,
  parts: { top: Top, subject: Subject, switcher: Switcher, readout: Readout, progress: Progress, today: TodayLine, main: Main, record: Record },
  // the readout, its ruler and today sit in the session window; start/pause moves down by the record slider
  arrange: () => ({ head: ['top', 'subject', 'switcher'], center: ['readout', 'progress', 'today'], foot: ['main', 'record'] }),
};
