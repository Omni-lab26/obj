import { StatusBar } from 'expo-status-bar';
import { ReactNode, useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { subj } from '@/data';
import type { Zone } from '@/screens/layout';
import { hmColon, session, useSession, useToday } from '@/screens/model';
import { closeTimer, fmt } from '@/screens/timer/standard';
import { T } from '@/themes/kit';
import type { TimerKit } from '@/themes/types';
import { elapsedOf, getState, setTarget, startStudy, togglePause, useStore, useSubjects } from '@/store';
import { haptic } from '@/ui/base';
import { Screen } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { toast } from '@/ui/Toast';
import { alpha, cells, P, ring } from './look';
import { Box, DotGrid, J, Key, Label, Mood, Pal, STEPS } from './pixel';

// ピクセル箱's timer: the paper again, not a dark room. The pal stands on the
// session's card and works along with you; the card holds the subject, the big
// count and the session in 12 blocks; under it, chunky keys — and recording
// takes a long press, so a stray tap never ends a session.

function Page({ zones }: { zones: Record<Zone, ReactNode> }) {
  const insets = useSafeAreaInsets();
  return (
    <Screen bg={P.paper} style={{ paddingBottom: insets.bottom + 12 }}>
      <StatusBar style="dark" />
      <DotGrid />
      {zones.head}
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 8 }}>
          <Band />
          <Box>{zones.center}</Box>
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 14, flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 14 }}>
          {zones.foot}
        </View>
      </ScrollView>
    </Screen>
  );
}

/** Above the card: what state you're in, and the pal standing on it. */
function Band() {
  const ss = useSession();
  const mood: Mood = ss.running ? (ss.paused ? 'sleep' : ss.over ? 'cheer' : 'work') : 'idle';
  const text = ss.running ? (ss.paused ? 'PAUSED' : ss.over ? 'OVER TARGET' : 'FOCUS') : 'READY';
  return (
    <View style={{ height: 92, flexDirection: 'row', alignItems: 'flex-end', marginBottom: -2, zIndex: 2 }}>
      <View style={{ flex: 1, paddingBottom: 14 }}>
        <Label text={text} dot={ss.paused ? P.sun : ss.running ? P.coral : P.sky} />
      </View>
      <View style={{ marginRight: 20 }}><Pal mood={mood} px={5} /></View>
    </View>
  );
}

// ---------- parts ----------
function Top() {
  const mode = useStore((s) => s.timerMode);
  return (
    <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 }}>
      <Key label="閉じる" onPress={closeTimer} radius={10} style={{ width: 38 }} face={{ height: 35 }}>
        <View style={{ transform: [{ rotate: '-90deg' }] }}>
          <Icon name="back" size={18} color={P.ink} width={2.4} />
        </View>
      </Key>
      <View style={{ flex: 1 }} />
      <View style={{ height: 26, paddingHorizontal: 9, borderRadius: 8, backgroundColor: P.card, boxShadow: ring(P.ink, 1.5), justifyContent: 'center' }}>
        <T f="label" size={9} lh={12}>{mode === 'up' ? 'COUNT UP' : 'COUNTDOWN'}</T>
      </View>
    </View>
  );
}

/** The subject, on a ground of its own color. */
function Subject() {
  const ss = useSession();
  return (
    <View style={{ backgroundColor: alpha(ss.subject.c, 0.18), borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 2, borderBottomColor: P.ink, flexDirection: 'row', alignItems: 'center', gap: 12 }} accessible accessibilityLabel={`${ss.subject.name} ${ss.task}`}>
      <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: ss.subject.c, boxShadow: ring() }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <J size={24} w="800" lh={30} numberOfLines={1}>{ss.subject.name}</J>
        {ss.task ? <T size={12.5} lh={17} color={P.ink2} numberOfLines={1}>{ss.task}</T> : null}
      </View>
    </View>
  );
}

/** The big count: the time studied, or (countdown) the time left. */
function Readout() {
  const ss = useSession();
  const up = ss.mode === 'up';
  const rem = ss.target - ss.elapsed;
  const over = !up && ss.over;
  const sec = up ? ss.elapsed : ss.over ? -rem : ss.running ? rem : ss.target;
  const label = ss.paused ? 'PAUSED' : up ? (ss.running ? 'ELAPSED' : 'READY') : over ? 'OVER' : ss.running ? 'LEFT' : 'PLAN';
  const said = up ? '勉強した時間' : over ? '超過' : ss.running ? '残り' : '集中する時間';
  const text = fmt(sec);
  const long = text.length > 5;
  return (
    <View style={{ alignItems: 'center', paddingTop: 14, paddingHorizontal: 12 }} accessible accessibilityLabel={`${said} ${text}${ss.paused ? '。一時停止中' : ''}`}>
      <T f="label" size={10} lh={14} color={over ? P.coral : P.ink3} ls={1.5}>{label}</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', opacity: ss.paused ? 0.45 : 1 }}>
        {over ? <T f="groteskBold" size={long ? 40 : 52} lh={long ? 66 : 84} color={P.coral}>+</T> : null}
        <T f="groteskBold" size={long ? 58 : 80} lh={long ? 66 : 84} ls={long ? -2 : -3.5} num color={over ? P.coral : P.ink}>{text}</T>
      </View>
    </View>
  );
}

/** The session in 12 blocks toward the target; in countdown, keys to set it. */
function Progress() {
  const ss = useSession();
  const up = ss.mode === 'up';
  const N = 12;
  const filled = ss.target ? Math.min(N, Math.floor((ss.elapsed / ss.target) * N)) : 0;
  const targetMin = Math.round(ss.target / 60);
  const caption = ss.paused ? '一時停止中' : up
    ? ss.over ? `目安の${targetMin}分をこえました` : `目安 ${targetMin}分まで あと ${fmt(ss.remaining)}`
    : ss.running ? `勉強した時間 ${fmt(ss.elapsed)}` : '集中する時間を選んで、はじめます';
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 4 }} accessible accessibilityLabel={`目安${targetMin}分のうち${Math.min(100, Math.round((ss.elapsed / Math.max(1, ss.target)) * 100))}%`}>
        {Array.from({ length: N }, (_, i) => {
          const on = i < filled;
          return <View key={i} style={{ flex: 1, height: 16, borderRadius: 3, backgroundColor: on ? (ss.over ? P.sun : ss.subject.c) : 'transparent', borderWidth: 1.5, borderColor: on ? P.ink : alpha(P.ink, 0.28), borderStyle: on ? 'solid' : 'dashed' }} />;
        })}
      </View>
      <T size={12} lh={16} color={P.ink2} style={{ textAlign: 'center' }}>{caption}</T>
      {up ? null : <Presets />}
    </View>
  );
}
/** Countdown: the time left (or planned), set with keys instead of rulers. */
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
  const running = useStore((s) => s.running);
  const plan = useStore((s) => s.targetMin);
  const keys: { k: string; label: string; run: () => void; on?: boolean }[] = [
    { k: '-5', label: '5分へらす', run: () => setLeft(leftNow() - 5) },
    ...[15, 25, 45, 60].map((m) => ({ k: String(m), label: `${running ? 'のこり' : ''}${m}分にする`, run: () => setLeft(m), on: !running && Math.round(plan) === m })),
    { k: '+5', label: '5分ふやす', run: () => setLeft(leftNow() + 5) },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {keys.map((x) => (
        <Key key={x.k} label={x.label} onPress={x.run} color={x.on ? P.lime : P.card} depth={2} radius={9} style={{ flex: 1 }} face={{ height: 30 }}>
          <T f="groteskBold" size={13} lh={16} num>{x.k}</T>
        </Key>
      ))}
    </View>
  );
}

/** The subject chips: only while the subject can still change. */
function Switcher() {
  const ss = useSession();
  const subjects = useSubjects();
  if (!ss.canSwitch) return null;
  return (
    <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="科目を変える">
      {subjects.map((x) => {
        const on = x.id === ss.subject.id;
        return (
          <Key key={x.id} label={x.name} role="radio" checked={on} onPress={() => session.switchTo(x.id)} feel="none" color={on ? P.lime : P.card} depth={2} radius={9}
            face={{ height: 30, paddingHorizontal: 10, flexDirection: 'row', gap: 6 }}>
            <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: x.c, boxShadow: ring(P.ink, 1) }} />
            <T size={12.5} w="800" lh={16}>{x.name}</T>
          </Key>
        );
      })}
    </View>
  );
}

/** Start, pause, resume: the big lime key. */
function Main() {
  const running = useStore((s) => s.running);
  const paused = useStore((s) => s.paused);
  const playing = running && !paused;
  const press = () => {
    haptic.firm();
    if (!running) startStudy();
    else togglePause();
  };
  const said = playing ? '一時停止' : running ? '再開' : 'はじめる';
  return (
    <Key label={playing ? '一時停止' : running ? '再開' : '開始'} onPress={press} feel="none" color={P.lime} depth={5} radius={16} style={{ flexGrow: 1, flexBasis: '40%' }}
      face={{ height: 58, flexDirection: 'row', gap: 8 }}>
      <Icon name={playing ? 'pause' : 'play'} size={17} color={P.ink} />
      <T size={16} w="800" lh={20}>{said}</T>
    </Key>
  );
}

/** Record: hold it — the key fills as you hold, and lets go of the session when full. */
function Record() {
  const running = useStore((s) => s.running);
  const fill = useSharedValue(0);
  const sink = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const k = useAnimatedStyle(() => ({ transform: [{ translateY: 5 * sink.value }] }));
  const sj = subj(useStore((s) => s.subj));
  return (
    <Pressable disabled={!running} delayLongPress={650} accessibilityRole="button" accessibilityLabel="長押しで記録する" accessibilityHint={`${sj.name}の勉強を止めて記録します`}
      accessibilityState={{ disabled: !running }} accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => running && session.finish()}
      onPressIn={() => { sink.set(withTiming(1, { duration: 40 })); fill.set(withTiming(1, { duration: 650 })); }}
      onPressOut={() => { sink.set(withTiming(0, { duration: 140, easing: STEPS })); cancelAnimation(fill); fill.set(withTiming(0, { duration: 160 })); }}
      onLongPress={() => { haptic.success(); session.finish(); }}
      onPress={() => { haptic.tap(); toast('長押しで記録します', '押したまま、キーがいっぱいになるまで'); }}
      style={{ flexGrow: 1, flexBasis: '40%', paddingBottom: 5, opacity: running ? 1 : 0.4 }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 5, bottom: 0, borderRadius: 16, backgroundColor: P.ink }} />
      <Animated.View style={[{ height: 58, borderRadius: 16, backgroundColor: P.card, borderWidth: 2, borderColor: P.ink, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, k]}>
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: P.coral }, a]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="stop" size={15} color={P.ink} />
          <T size={16} w="800" lh={20}>記録する</T>
        </View>
        <T f="label" size={8} lh={10} color={P.ink2}>HOLD</T>
      </Animated.View>
    </Pressable>
  );
}

/** The day so far as a strip of 10-minute blocks, the session under way blinking at its end. */
function Today() {
  const today = useToday();
  const ss = useSession();
  const all = cells(today.parts, ss.running ? ss.elapsed / 60 : 0, ss.subject.c, 10);
  const slots = Math.min(30, Math.max(Math.ceil(today.goal / 10), all.length));
  const blink = useSharedValue(1);
  const live = ss.running && !ss.paused;
  useEffect(() => {
    if (!live) { blink.set(1); return; }
    blink.set(withRepeat(withSequence(withTiming(0.35, { duration: 450, easing: Easing.steps(2) }), withTiming(1, { duration: 450, easing: Easing.steps(2) })), -1));
    return () => cancelAnimation(blink);
  }, [live, blink]);
  const b = useAnimatedStyle(() => ({ opacity: blink.value }));
  const total = today.min + (ss.running ? Math.floor(ss.elapsed / 60) : 0);
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 2, gap: 8 }} accessible accessibilityLabel={`今日 ${total}分。目標 ${today.goal}分`}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}><Label text="TODAY" dot={P.violet} /></View>
        <T f="groteskBold" size={14} lh={18} num>{hmColon(total)}</T>
        <T f="groteskBold" size={14} lh={18} num color={P.ink3}>{` / ${hmColon(today.goal)}`}</T>
      </View>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {Array.from({ length: slots }, (_, i) => {
          const c = all[i];
          const st = { flex: 1, height: 12, borderRadius: 2.5 };
          if (!c) return <View key={i} style={[st, { borderWidth: 1.5, borderColor: alpha(P.ink, 0.25), borderStyle: 'dashed' }]} />;
          return c.live ? <Animated.View key={i} style={[st, { backgroundColor: c.c, borderWidth: 1.5, borderColor: P.ink }, b]} />
            : <View key={i} style={[st, { backgroundColor: c.c, borderWidth: 1.5, borderColor: P.ink }]} />;
        })}
      </View>
    </View>
  );
}

export const timer: TimerKit = {
  Page,
  parts: { top: Top, subject: Subject, readout: Readout, progress: Progress, switcher: Switcher, main: Main, record: Record, today: Today },
  arrange: () => ({ head: ['top', 'today'], center: ['subject', 'readout', 'progress'], foot: ['switcher', 'main', 'record'] }),
};
