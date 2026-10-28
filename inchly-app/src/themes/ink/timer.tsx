import { StatusBar } from 'expo-status-bar';
import { ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { hm } from '@/data';
import type { Zone } from '@/screens/layout';
import { session, useSession } from '@/screens/model';
import { closeTimer, fmt, STANDARD_PARTS, useLeft, useRulerPreview } from '@/screens/timer/standard';
import { T } from '@/themes/kit';
import type { TimerKit } from '@/themes/types';
import { startStudy, togglePause, useStore, useSubjects } from '@/store';
import { focus, onColor, useT } from '@/theme';
import { haptic } from '@/ui/base';
import { Screen } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { M, move } from '@/ui/motion';
import { INK, inky, splatPath } from './paint';
import { Shout, SplashPress, Splat } from './parts';

// インク's timer: a splat of the subject's ink sits behind the clock and
// spreads as the session goes on — at the target it covers the middle of the
// screen, and past it the ink turns yellow at the edge. Record by rolling a
// paint roller across the bottom.

// Where the readout sits, so the splat can sit behind it.
let mid = 0;
const midSubs = new Set<() => void>();
const setMid = (y: number) => { if (Math.abs(y - mid) < 1) return; mid = y; midSubs.forEach((f) => f()); };
const useMid = () => useSyncExternalStore((f) => { midSubs.add(f); return () => { midSubs.delete(f); }; }, () => mid, () => mid);

const BLOB = 360;
/** The splat behind the clock: grows with the session (smoothly, never past its size). */
function InkBlob() {
  const ss = useSession();
  const y = useMid();
  const c = inky(ss.subject.c);
  const p = ss.target ? Math.min(1, ss.elapsed / ss.target) : 0;
  const size = ss.running ? 130 + 220 * Math.sqrt(p) : 120;
  const scale = useSharedValue(size / BLOB);
  useEffect(() => { scale.set(move(size / BLOB)); }, [size, scale]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const id = ss.subject.id;
  const d = useMemo(() => splatPath(BLOB / 2, BLOB / 2, BLOB * 0.3, `timer${id}`, { wobble: 0.12, bulges: 0.35 }), [id]);
  const ring = useMemo(() => splatPath(BLOB / 2, BLOB / 2, BLOB * 0.34, `ring${id}`, { wobble: 0.12, bulges: 0.35 }), [id]);
  if (!y) return null;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: '50%', top: y - BLOB / 2, marginLeft: -BLOB / 2, width: BLOB, height: BLOB, opacity: ss.paused ? 0.45 : ss.running ? 1 : 0.55 }, a]}>
      <Svg width={BLOB} height={BLOB}>
        {ss.over ? <Path d={ring} fill={INK.yellow} /> : null}
        <Path d={d} fill={c} />
      </Svg>
    </Animated.View>
  );
}

function Page({ zones }: { zones: Record<Zone, ReactNode> }) {
  useT();
  const insets = useSafeAreaInsets();
  return (
    <Screen bg={focus.bg} style={{ paddingBottom: insets.bottom + 14 }}>
      <StatusBar style="light" />
      <InkBlob />
      {zones.head}
      <View style={{ flex: 1, minHeight: 20 }} />
      {zones.center}
      <View style={{ flex: 1, minHeight: 20 }} />
      {zones.foot}
    </Screen>
  );
}

// ---------- parts ----------
function Top() {
  return (
    <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
      <SplashPress color={INK.white} splash={44} onPress={closeTimer} scale={0.86} hitSlop={6} accessibilityRole="button" accessibilityLabel="閉じる"
        style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: INK.white, backgroundColor: INK.black, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ transform: [{ rotate: '-90deg' }] }}>
          <Icon name="back" size={18} color={INK.white} width={2.4} />
        </View>
      </SplashPress>
    </View>
  );
}

/** What you're painting: a tilted sticker in the subject's ink. */
function Subject() {
  const ss = useSession();
  const c = inky(ss.subject.c);
  const fg = onColor(c);
  return (
    <View style={{ alignItems: 'center', gap: 6, paddingHorizontal: 24 }} accessible accessibilityLabel={`${ss.subject.name} ${ss.task}`}>
      <View style={{ transform: [{ rotate: '-3deg' }], backgroundColor: c, borderWidth: 3, borderColor: INK.white, borderRadius: 14, paddingHorizontal: 16, paddingTop: 3, paddingBottom: 5, boxShadow: '3px 4px 0px rgba(0,0,0,0.6)', maxWidth: '100%' }}>
        <Shout size={28} color={fg} shadow={fg === '#FFFFFF' ? INK.black : 'rgba(255,255,255,0.5)'} numberOfLines={1}>{ss.subject.name}</Shout>
      </View>
      {ss.task ? <T size={13} w="700" color="rgba(255,255,255,0.75)" numberOfLines={1}>{ss.task}</T> : null}
    </View>
  );
}

/** The subjects as little splats; only before starting and in the first minute. */
function Switcher() {
  const ss = useSession();
  const subjects = useSubjects();
  if (!ss.canSwitch) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, paddingHorizontal: 18, paddingTop: 12 }} accessibilityRole="radiogroup" accessibilityLabel="科目を変える">
      {subjects.map((x) => {
        const on = x.id === ss.subject.id;
        const c = inky(x.c);
        return (
          <Pressable key={x.id} onPress={() => session.switchTo(x.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={x.name} hitSlop={{ top: 8, bottom: 8 }}
            style={({ pressed }) => ({ height: 30, paddingLeft: 4, paddingRight: 11, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 2,
              backgroundColor: on ? 'rgba(255,255,255,0.1)' : 'transparent', borderWidth: 2, borderColor: on ? INK.white : 'transparent',
              transform: [{ scaleX: pressed ? 1.06 : 1 }, { scaleY: pressed ? 0.9 : 1 }] })}>
            <Splat size={24} color={c} seed={`chip${x.id}`} drops={2} />
            <T size={12} w="800" color={on ? INK.white : 'rgba(255,255,255,0.6)'}>{x.name}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The clock, big and heavy, on the splat. */
function Readout() {
  const ss = useSession();
  const p = useRulerPreview();
  const left = useLeft();
  const up = ss.mode === 'up';
  const rem = ss.target - ss.elapsed;
  const sec = up ? ss.elapsed : ss.over ? -rem : ss.running ? rem : ss.target;
  const over = !up && ss.over;
  const moving = !up && (p.h !== null || p.m !== null);
  const shown = moving ? Math.min(300, (p.h ?? left.h) * 60 + (p.m ?? Math.floor(left.m))) * 60 : sec;
  const side = moving ? 'に設定' : up ? 'ぬった時間' : ss.over ? '超過' : ss.running ? 'のこり' : 'に集中';
  const text = `${over && !moving ? '+' : ''}${fmt(shown)}`;
  return (
    <View onLayout={(e) => setMid(e.nativeEvent.layout.y + e.nativeEvent.layout.height / 2)} style={{ alignItems: 'center', opacity: ss.paused && !moving ? 0.6 : 1 }}
      accessible accessibilityLabel={`${side} ${fmt(shown)}`}>
      <Shout size={text.length > 6 ? 54 : 64} lh={text.length > 6 ? 64 : 76} color={over && !moving ? INK.yellow : INK.white} num>{text}</Shout>
      <View style={{ marginTop: 2, backgroundColor: 'rgba(14,14,14,0.7)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 2 }}>
        <T size={12.5} w="800" color={over && !moving ? INK.yellow : 'rgba(255,255,255,0.85)'}>{side}</T>
      </View>
    </View>
  );
}

/** Counting up: how much of the target is painted. 目安 mode keeps the two rulers. */
function Progress() {
  const ss = useSession();
  if (ss.mode !== 'up') { const Rulers = STANDARD_PARTS.progress; return <Rulers />; }
  const targetMin = Math.round(ss.target / 60);
  const p = ss.target ? Math.min(1, ss.elapsed / ss.target) : 0;
  const c = inky(ss.subject.c);
  return (
    <View style={{ marginTop: 20, marginHorizontal: 36, gap: 7 }}>
      <View style={{ height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <View style={{ width: `${p * 100}%`, height: 12, borderRadius: 6, backgroundColor: ss.over ? INK.yellow : c }} />
      </View>
      <T size={12} w="700" color="rgba(255,255,255,0.7)" style={{ textAlign: 'center' }}>
        {ss.paused ? '一時停止中' : ss.over ? `目安の${targetMin}分をぬりきった!` : `目安 ${targetMin}分まで あと ${fmt(ss.remaining)}`}
      </T>
    </View>
  );
}

function Today() {
  const today = useStore((s) => s.todayMin);
  const goal = useStore((s) => s.goalMin);
  const chip = (k: string, v: string, c: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)' }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
      <T size={11.5} w="700" color="rgba(255,255,255,0.7)">{k}</T>
      <T f="heavy" size={13} lh={17} num>{v}</T>
    </View>
  );
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14 }}>
      {chip('きょう', hm(today), INK.pink)}
      {chip('目標', hm(goal).replace('00分', ''), INK.yellow)}
    </View>
  );
}

/** Start, pause, resume: a big splat that gives under the finger. */
function Main() {
  const running = useStore((s) => s.running);
  const paused = useStore((s) => s.paused);
  const ss = useSession();
  const playing = running && !paused;
  const c = playing ? INK.white : inky(ss.subject.c);
  const fg = playing ? INK.black : onColor(c);
  const press = () => {
    haptic.firm();
    if (!running) startStudy();
    else togglePause();
  };
  return (
    <View style={{ alignItems: 'center', marginTop: 22 }}>
      <SplashPress color={INK.white} splash={110} onPress={press} haptics={false} scale={0.86} accessibilityRole="button" accessibilityLabel={playing ? '一時停止' : running ? '再開' : '開始'}
        style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}>
        <Splat size={130} color={c} seed={playing ? 'pause' : 'play'} drops={4} style={{ position: 'absolute' }} />
        <View><Icon name={playing ? 'pause' : 'play'} size={30} color={fg} /></View>
      </SplashPress>
    </View>
  );
}

// ---------- record: roll the paint roller across ----------
const KNOB = 54;
const PAD = 5;
function Record() {
  const running = useStore((s) => s.running);
  const ss = useSession();
  const c = inky(ss.subject.c);
  const disabled = !running;
  const [w, setW] = useState(0);
  const max = useSharedValue(1);
  const x = useSharedValue(0);
  const off = useSharedValue(disabled ? 1 : 0);
  const start = useSharedValue(0);
  useEffect(() => { off.set(disabled ? 1 : 0); }, [disabled, off]);
  const finish = () => {
    haptic.success();
    session.finish();
    // the roller goes back once the record page covers this one
    setTimeout(() => x.set(move(0)), 700);
  };
  // one tick as the roller crosses the line, either way
  useAnimatedReaction(() => x.get() > max.get() * 0.7, (over, prev) => { if (prev !== null && over !== prev) scheduleOnRN(haptic.tap); });
  // the gesture is built once; its worklets read shared values
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
        x.set(withTiming(m, M.micro, (done) => { if (done) scheduleOnRN(finish); }));
      } else {
        x.set(move(0, e.velocityX));
      }
    }));
  const knob = useAnimatedStyle(() => ({ transform: [{ rotate: `${interpolate(x.value, [0, max.value], [0, 720])}deg` }] }));
  const knobBody = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  // the stripe is the track's full width, slid in from the left (moved, not resized, every frame)
  const paint = useAnimatedStyle(() => ({ transform: [{ translateX: x.value + KNOB / 2 + PAD - w }] }), [w]);
  const lbl = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, max.value * 0.6], [1, 0], 'clamp') }));
  const label = '右へぬって記録する';
  return (
    <View style={{ marginHorizontal: 22 }}>
      <View onLayout={(e) => { const lw = e.nativeEvent.layout.width; setW(lw); max.set(Math.max(1, lw - KNOB - PAD * 2)); }}
        accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
        accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => !disabled && session.finish()}
        style={{ height: KNOB + PAD * 2, borderRadius: (KNOB + PAD * 2) / 2, backgroundColor: '#242424', borderWidth: 2, borderColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', opacity: disabled ? 0.35 : 1 }}>
        {/* the stripe the roller leaves */}
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, width: w, backgroundColor: c, opacity: 0.85 }, paint]} />
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: KNOB + PAD, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }, lbl]}>
          <T size={14} w="800" color="rgba(255,255,255,0.75)">{label}</T>
        </Animated.View>
        {w ? (
          <GestureDetector gesture={pan}>
            <Animated.View hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={[{ position: 'absolute', top: PAD - 2, left: PAD - 2, width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: INK.white, borderWidth: 2, borderColor: INK.black, alignItems: 'center', justifyContent: 'center' }, knobBody]}>
              <Animated.View style={knob}>
                <Roller color={c} />
              </Animated.View>
            </Animated.View>
          </GestureDetector>
        ) : null}
      </View>
    </View>
  );
}
/** A paint roller, seen from the end: it turns as it rolls. */
function Roller({ color }: { color: string }) {
  return (
    <Svg width={34} height={34} viewBox="0 0 34 34">
      <Rect x={3} y={3} width={28} height={28} rx={14} fill={color} />
      <Rect x={14} y={5} width={6} height={10} rx={3} fill="rgba(255,255,255,0.75)" />
      <Rect x={14} y={19} width={6} height={10} rx={3} fill="rgba(0,0,0,0.25)" />
    </Svg>
  );
}

export const timer: TimerKit = {
  Page,
  parts: { top: Top, subject: Subject, switcher: Switcher, readout: Readout, progress: Progress, today: Today, main: Main, record: Record },
};
