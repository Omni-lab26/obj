import { StatusBar } from 'expo-status-bar';
import { ReactNode, useEffect, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, useAnimatedReaction, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Rect } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import type { Zone } from '@/screens/layout';
import { hmColon, session, useSession, useToday } from '@/screens/model';
import { closeTimer, fmt } from '@/screens/timer/standard';
import { T } from '@/themes/kit';
import type { TimerKit } from '@/themes/types';
import { elapsedOf, getState, setTarget, startStudy, togglePause, useStore, useSubjects } from '@/store';
import { useT } from '@/theme';
import { haptic, Press } from '@/ui/base';
import { Screen } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { alpha, candy, Mood, pastel } from './look';
import { Bubbly, Candy, Mochi, Pill, R, Shape, useV } from './parts';

// かわいい's timer: the diary page again, not a dark room. The session is a
// donut that gets its icing as you go (sprinkles and all, glazed gold past the
// target), with the mochi sitting on top — hopping while you study, asleep
// while you rest. To record, you peel the heart sticker off and stick it on
// the page: slide it to the right.

function Page({ zones }: { zones: Record<Zone, ReactNode> }) {
  const insets = useSafeAreaInsets();
  return (
    <Screen style={{ paddingBottom: insets.bottom + 12 }}>
      <StatusBar style="dark" />
      {zones.head}
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 6, gap: 10 }}>{zones.center}</View>
        <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 14 }}>{zones.foot}</View>
      </ScrollView>
    </Screen>
  );
}

// ---------- parts ----------
function Top() {
  const t = useT();
  const v = useV();
  const mode = useStore((s) => s.timerMode);
  return (
    <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 }}>
      <Bubbly label="閉じる" onPress={closeTimer} size={38}>
        <View style={{ transform: [{ rotate: '-90deg' }] }}><Icon name="back" size={17} color={t.ink} width={2.4} /></View>
      </Bubbly>
      <View style={{ flex: 1 }} />
      <View style={{ height: 28, paddingHorizontal: 11, borderRadius: 14, backgroundColor: v.soft, flexDirection: 'row', alignItems: 'center', gap: 5, transform: [{ rotate: '3deg' }] }}>
        <Shape kind={mode === 'up' ? 'star' : 'heart'} size={12} fill={mode === 'up' ? v.sun : v.accent} stroke={t.ink} sw={8} />
        <T size={12} w="800" lh={16} color={t.ink2}>{mode === 'up' ? 'かぞえる' : 'のこりを数える'}</T>
      </View>
    </View>
  );
}

/** The day so far on a thin candy bar, under the top. */
function Today() {
  const t = useT();
  const today = useToday();
  const ss = useSession();
  const live = ss.running ? ss.elapsed / 60 : 0;
  const total = today.min + Math.floor(live);
  const { pieces, goalAt } = candy(today.parts, live, ss.subject.c, today.goal);
  return (
    <View style={{ paddingHorizontal: 20, gap: 2 }} accessible accessibilityLabel={`今日 ${total}分。目標 ${today.goal}分`}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <T size={12} w="800" color={t.ink2} style={{ flex: 1 }}>きょうの合計</T>
        <R size={14} lh={18} num color={t.ink}>{hmColon(total)}</R>
        <R size={14} lh={18} num color={t.ink3}>{` / ${hmColon(today.goal)}`}</R>
      </View>
      <Candy pieces={pieces} goalAt={goalAt} h={12} />
    </View>
  );
}

/** What you're studying, on a sticker label. */
function Subject() {
  const t = useT();
  const ss = useSession();
  return (
    <View style={{ alignItems: 'center', gap: 2 }} accessible accessibilityLabel={`${ss.subject.name} ${ss.task}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%' }}>
        <Shape kind="heart" size={22} fill={ss.subject.c} stroke={t.ink} sw={7} />
        <T size={26} w="800" lh={34} color={t.ink} numberOfLines={1} style={{ flexShrink: 1 }}>{ss.subject.name}</T>
      </View>
      {ss.task ? <T size={13} lh={18} color={t.ink2} numberOfLines={1}>{ss.task}</T> : null}
    </View>
  );
}

/** The donut: icing up to how far you are toward the target, sprinkles on the icing, gold past it. */
const SPRINKLES = 26;
const DOUGH = '#F3D6AE';
function Donut({ size, p, color, over }: { size: number; p: number; color: string; over: boolean }) {
  const t = useT();
  const v = useV();
  const sw = size * 0.16;
  const r = (size - sw) / 2 - 6;
  const c = 2 * Math.PI * r;
  const mid = size / 2;
  const icing = over ? v.sun : color;
  const sprinkleColors = [t.surface, v.accent2, v.sun, v.accent, pastel(v.accent2, 0.5)];
  return (
    <Svg width={size} height={size}>
      {/* the plate */}
      <Circle cx={mid} cy={mid} r={mid - 1} fill={t.surface} stroke={alpha(v.accent, 0.3)} strokeWidth={2} />
      {/* the dough */}
      <Circle cx={mid} cy={mid} r={r} fill="none" stroke={DOUGH} strokeWidth={sw} />
      <Circle cx={mid} cy={mid} r={r} fill="none" stroke={alpha('#C98A4B', 0.18)} strokeWidth={sw} strokeDasharray="2 9" />
      {/* the icing */}
      {p > 0 ? (
        <Circle cx={mid} cy={mid} r={r} fill="none" stroke={icing} strokeWidth={sw * 0.86} strokeLinecap="round"
          strokeDasharray={`${Math.max(0.01, c * Math.min(1, p))} ${c}`} transform={`rotate(-90 ${mid} ${mid})`} />
      ) : null}
      {/* sprinkles, only where there's icing */}
      <G>
        {Array.from({ length: SPRINKLES }, (_, k) => {
          const f = (k + 0.5) / SPRINKLES;
          if (f > p) return null;
          const ang = -Math.PI / 2 + f * Math.PI * 2;
          const off = ((k * 37) % 9 - 4) / 9; // -0.44..0.44 across the ring
          const rr = r + off * sw * 0.55;
          const x = mid + Math.cos(ang) * rr, y = mid + Math.sin(ang) * rr;
          const rot = (k * 53) % 180;
          return <Rect key={k} x={x - sw * 0.06} y={y - sw * 0.17} width={sw * 0.12} height={sw * 0.34} rx={sw * 0.06} fill={sprinkleColors[k % sprinkleColors.length]} transform={`rotate(${rot} ${x} ${y})`} />;
        })}
      </G>
      {/* the hole's rim */}
      <Circle cx={mid} cy={mid} r={r - sw / 2 - 2} fill={t.surface} stroke={alpha(v.accent, 0.25)} strokeWidth={2} />
    </Svg>
  );
}

/** The big count inside the donut, the mochi on top. */
function Readout() {
  const t = useT();
  const v = useV();
  const ss = useSession();
  const { width, height } = useWindowDimensions();
  const D = Math.max(180, Math.min(250, width - 120, height * 0.34));
  const up = ss.mode === 'up';
  const rem = ss.target - ss.elapsed;
  const over = !up && ss.over;
  const sec = up ? ss.elapsed : ss.over ? -rem : ss.running ? rem : ss.target;
  const p = ss.target ? ss.elapsed / ss.target : 0;
  const mood: Mood = ss.running ? (ss.paused ? 'sleep' : ss.over ? 'cheer' : 'work') : 'idle';
  const label = ss.paused ? 'ひとやすみ中' : up ? (ss.running ? '勉強した時間' : 'これから') : over ? 'こえた時間' : ss.running ? 'のこり' : '集中する時間';
  const text = `${over ? '+' : ''}${fmt(sec)}`;
  const big = text.length > 6 ? D * 0.17 : D * 0.21;
  // the count squashes a little as each minute turns
  const minute = Math.floor(ss.elapsed / 60);
  const s = useSharedValue(1);
  useEffect(() => {
    if (!minute) return;
    s.set(withSequence(withTiming(0.86, { duration: 90 }), withSpring(1, { duration: 520, dampingRatio: 0.35 })));
  }, [minute, s]);
  const a = useAnimatedStyle(() => ({ transform: [{ scaleY: s.value }, { scaleX: 2 - s.value }] }));
  return (
    <View style={{ alignItems: 'center', paddingTop: 54 }}>
      <View style={{ width: D, height: D }}>
        <Donut size={D} p={ss.over ? 1 : p} color={ss.subject.c} over={ss.over} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={`${label} ${text}`}>
          <T size={12} w="700" lh={16} color={over ? v.deep : t.ink3}>{label}</T>
          <Animated.View style={[{ opacity: ss.paused ? 0.5 : 1 }, a]}>
            <R size={big} lh={Math.round(big * 1.18)} num color={over ? v.deep : t.ink}>{text}</R>
          </Animated.View>
        </View>
      </View>
      <View style={{ position: 'absolute', top: 0 }}>
        <Mochi mood={mood} size={74} lift={0.35} bubbleSide="right" />
      </View>
    </View>
  );
}

/** A line under the donut, and (目安 mode) chips to set the time. */
function Progress() {
  const t = useT();
  const ss = useSession();
  const up = ss.mode === 'up';
  const targetMin = Math.round(ss.target / 60);
  const caption = ss.paused ? 'ひとやすみ中。つづけるときは「つづける」'
    : up ? (ss.over ? `目安の${targetMin}分をこえたよ！ このままでもOK` : `目安 ${targetMin}分まで あと ${fmt(ss.remaining)}`)
    : ss.running ? `勉強した時間 ${fmt(ss.elapsed)}` : '集中する時間をえらんで、はじめよう';
  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <T size={13} lh={18} color={t.ink2} numberOfLines={2} style={{ textAlign: 'center' }}>{caption}</T>
      {up ? null : <Presets />}
    </View>
  );
}
const leftNow = () => {
  const cur = getState();
  return cur.running ? Math.max(0, cur.targetMin * 60 - elapsedOf(cur)) / 60 : cur.targetMin;
};
const setLeft = (min: number) => {
  const cur = getState();
  const m = Math.max(cur.running ? 1 : 5, Math.min(300, min));
  setTarget(cur.running ? elapsedOf(cur) / 60 + m : m);
};
function Presets() {
  const t = useT();
  const v = useV();
  const running = useStore((s) => s.running);
  const plan = useStore((s) => s.targetMin);
  const keys: { k: string; label: string; run: () => void; on?: boolean }[] = [
    { k: '−5', label: '5分へらす', run: () => setLeft(leftNow() - 5) },
    ...[15, 25, 45, 60].map((m) => ({ k: String(m), label: `${running ? 'のこり' : ''}${m}分にする`, run: () => setLeft(m), on: !running && Math.round(plan) === m })),
    { k: '+5', label: '5分ふやす', run: () => setLeft(leftNow() + 5) },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignSelf: 'stretch' }}>
      {keys.map((x) => (
        <Press key={x.k} onPress={x.run} accessibilityRole="button" accessibilityLabel={x.label} scale={0.9}
          style={{ flex: 1, height: 34, borderRadius: 17, backgroundColor: x.on ? v.deep : t.surface, alignItems: 'center', justifyContent: 'center',
            boxShadow: `0px 0px 0px 2px ${x.on ? v.deep : alpha(v.accent, 0.35)}, 0px 3px 0px 0px ${alpha(v.accent, 0.25)}` }}>
          <R size={14} lh={18} num color={x.on ? '#FFFFFF' : t.ink}>{x.k}</R>
        </Press>
      ))}
    </View>
  );
}

/** The subject chips: only while the subject can still change. */
function Switcher() {
  const t = useT();
  const v = useV();
  const ss = useSession();
  const subjects = useSubjects();
  if (!ss.canSwitch) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="科目を変える">
      {subjects.map((x) => {
        const on = x.id === ss.subject.id;
        return (
          <Press key={x.id} onPress={() => session.switchTo(x.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={x.name} scale={0.9} hitSlop={{ top: 6, bottom: 6 }}
            style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? v.soft : t.surface,
              boxShadow: `0px 0px 0px 2px ${on ? v.deep : alpha(v.accent, 0.3)}` }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: x.c }} />
            <T size={12.5} w="800" lh={16} color={t.ink}>{x.name}</T>
          </Press>
        );
      })}
    </View>
  );
}

/** Start, rest, go on: one big soft button. */
function Main() {
  const running = useStore((s) => s.running);
  const paused = useStore((s) => s.paused);
  const playing = running && !paused;
  const press = () => {
    haptic.firm();
    if (!running) startStudy();
    else togglePause();
  };
  return (
    <Pill h={56} label={playing ? 'ひとやすみ' : running ? 'つづける' : 'はじめる'} a11y={playing ? '一時停止' : running ? '再開' : '開始'} onPress={press}
      icon={<Icon name={playing ? 'pause' : 'play'} size={16} color="#FFFFFF" />} />
  );
}

/** Record: peel the heart sticker and stick it on the page — slide it right; past most of the way it sticks by itself. */
const KNOB = 48;
const PAD = 6;
function Record() {
  const t = useT();
  const v = useV();
  const running = useStore((s) => s.running);
  const disabled = !running;
  const [w, setW] = useState(0);
  const max = useSharedValue(1);
  const x = useSharedValue(0);
  const stick = useSharedValue(1);
  const off = useSharedValue(disabled ? 1 : 0);
  const start = useSharedValue(0);
  useEffect(() => { off.set(disabled ? 1 : 0); }, [disabled, off]);
  const finish = () => {
    haptic.success();
    session.finish();
    // the sticker comes back once the record page covers this one
    setTimeout(() => { x.set(withSpring(0, { damping: 18, stiffness: 180 })); }, 700);
  };
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
      const m = max.get(), v0 = x.get();
      if (v0 > m * 0.7 || (e.velocityX > 900 && v0 > m * 0.35)) {
        x.set(withTiming(m, { duration: 170, easing: Easing.out(Easing.cubic) }, (done) => {
          if (!done) return;
          stick.set(withSequence(withTiming(1.25, { duration: 90 }), withSpring(1, { duration: 380, dampingRatio: 0.4 })));
          scheduleOnRN(finish);
        }));
      } else {
        x.set(withSpring(0, { damping: 16, stiffness: 220 }));
      }
    }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { rotate: `${interpolate(x.value, [0, max.value], [-12, 8])}deg` }, { scale: stick.value }] }));
  const lbl = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, max.value * 0.6], [1, 0], 'clamp') }));
  const label = 'ハートを右にはって記録する';
  return (
    <View onLayout={(e) => { const lw = e.nativeEvent.layout.width; setW(lw); max.set(Math.max(1, lw - KNOB - PAD * 2)); }}
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
      accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => !disabled && session.finish()}
      style={{ height: KNOB + PAD * 2, borderRadius: (KNOB + PAD * 2) / 2, backgroundColor: t.surface, opacity: disabled ? 0.45 : 1,
        boxShadow: `0px 0px 0px 2px ${alpha(v.accent, 0.35)}, 0px 4px 0px 0px ${alpha(v.accent, 0.22)}` }}>
      {/* where the sticker goes */}
      <View pointerEvents="none" style={{ position: 'absolute', right: PAD, top: PAD, width: KNOB, height: KNOB, borderRadius: KNOB / 2, borderWidth: 2, borderStyle: 'dashed', borderColor: alpha(v.deep, 0.5), alignItems: 'center', justifyContent: 'center' }}>
        <T size={10} w="800" lh={13} color={alpha(v.deep, 0.8)}>ここ</T>
      </View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: KNOB + PAD, right: KNOB + PAD, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }, lbl]}>
        <T size={13.5} w="800" lh={18} color={t.ink2} numberOfLines={1}>{disabled ? 'はじめると 記録できるよ' : 'ハートを右に はって記録'}</T>
      </Animated.View>
      {w ? (
        <GestureDetector gesture={pan}>
          <Animated.View hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={[{ position: 'absolute', top: PAD, left: PAD, width: KNOB, height: KNOB, alignItems: 'center', justifyContent: 'center' }, knob]}>
            <Shape kind="heart" size={KNOB} fill={v.accent} stroke={t.surface} sw={9} />
            <View pointerEvents="none" style={{ position: 'absolute', top: 15 }}><Icon name="arrow" size={15} color="#FFFFFF" width={2.6} /></View>
          </Animated.View>
        </GestureDetector>
      ) : null}
    </View>
  );
}

export const timer: TimerKit = {
  Page,
  parts: { top: Top, today: Today, subject: Subject, readout: Readout, progress: Progress, switcher: Switcher, main: Main, record: Record },
  arrange: () => ({ head: ['top', 'today'], center: ['subject', 'readout', 'progress'], foot: ['switcher', 'main', 'record'] }),
};
