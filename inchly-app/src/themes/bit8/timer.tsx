import { StatusBar } from 'expo-status-bar';
import { ReactNode, useEffect, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Zone } from '@/screens/layout';
import { hmColon, session, useSession, useToday } from '@/screens/model';
import { closeTimer, fmt } from '@/screens/timer/standard';
import { T } from '@/themes/kit';
import type { TimerKit } from '@/themes/types';
import { elapsedOf, getState, setTarget, startStudy, togglePause, useStore, useSubjects } from '@/store';
import { focus, useT } from '@/theme';
import { haptic, Press } from '@/ui/base';
import { Screen } from '@/ui/Chrome';
import { L, say, useLook } from './look';
import { Cap, Cursor, Fig, fill, Menu, PixelArt, Segs, SPRITES, STEP, useBlink, Win } from './ui';

// 8bit's timer: an adventure screen. On the road at the top, you walk from
// the start flag toward the target's flag as the session goes on; under it,
// the count in big pixel figures and a gauge. Commands sit in a window at the
// bottom, and recording asks first — はい／いいえ — so a stray tap never ends
// a session.

/** The windows here sit on the timer's own dark ground. */
function useTimerLook(): L {
  const L = useLook();
  useT();
  return { ...L, page: focus.bg };
}

function Page({ zones }: { zones: Record<Zone, ReactNode> }) {
  const L = useTimerLook();
  const insets = useSafeAreaInsets();
  const ss = useSession();
  const title = ss.running ? (ss.paused ? 'ひとやすみ' : ss.over ? 'もくひょう クリア' : 'ぼうけんちゅう') : 'じゅんび';
  return (
    <Screen bg={focus.bg} style={{ paddingBottom: insets.bottom + 10 }}>
      <StatusBar style="light" />
      {zones.head}
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 14, paddingTop: 18, paddingBottom: 8 }} showsVerticalScrollIndicator={false} bounces={false}>
        <Win title={title} look={L} lit={ss.over}>{zones.center}</Win>
      </ScrollView>
      <View style={{ paddingHorizontal: 14, paddingTop: 14 }}>{zones.foot}</View>
    </Screen>
  );
}

// ---------- parts ----------
function Top() {
  const L = useTimerLook();
  const mode = useStore((s) => s.timerMode);
  return (
    <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 }}>
      <Press onPress={closeTimer} scale={0.9} accessibilityRole="button" accessibilityLabel="閉じる" hitSlop={6}
        style={{ height: 32, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderColor: L.edge }}>
        <View style={{ transform: [{ scaleX: -1 }] }}><PixelArt rows={SPRITES.cursor} px={1.5} colors={{ X: L.text }} /></View>
        <T size={13} lh={18} color={L.text}>もどる</T>
      </Press>
      <View style={{ flex: 1 }} />
      <Cap size={10} color={L.dim}>{mode === 'up' ? 'COUNT UP' : 'COUNTDOWN'}</Cap>
    </View>
  );
}

/** What you're on, large, in its own window. */
function Subject() {
  const L = useTimerLook();
  const ss = useSession();
  return (
    <View style={{ paddingHorizontal: 14, paddingTop: 12 }}>
      <Win look={L} title="いまの クエスト" pad={10}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessible accessibilityLabel={`${ss.subject.name} ${ss.task}`}>
          <View style={{ width: 16, height: 16, backgroundColor: ss.subject.c, borderWidth: 2, borderColor: L.edge }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={26} lh={34} color={L.text} numberOfLines={1}>{ss.subject.name}</T>
            {ss.task ? <T size={13} lh={19} color={L.dim} numberOfLines={1}>{ss.task}</T> : null}
          </View>
        </View>
      </Win>
    </View>
  );
}

/** The subjects, while it can still change (before starting and in the first minute). */
function Switcher() {
  const L = useTimerLook();
  const ss = useSession();
  const subjects = useSubjects();
  if (!ss.canSwitch) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 4, rowGap: 2, paddingHorizontal: 14, paddingTop: 10 }} accessibilityRole="radiogroup" accessibilityLabel="科目を変える">
      {subjects.map((x) => {
        const on = x.id === ss.subject.id;
        return (
          <Press key={x.id} onPress={() => session.switchTo(x.id)} haptics={false} scale={0.94} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={x.name}
            hitSlop={{ top: 4, bottom: 4 }} style={{ height: 30, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 7, opacity: on ? 1 : 0 }}><Cursor color={L.cursor} px={1.2} still={!on} /></View>
            <View style={{ width: 8, height: 8, backgroundColor: x.c }} />
            <T size={13} lh={18} color={on ? L.text : L.dim}>{x.name}</T>
          </Press>
        );
      })}
    </View>
  );
}

// the traveler: a small figure, two frames of walking
const WALK = [
  ['..XX..', '..XX..', '.XXXX.', 'X.XX.X', '..XX..', '.X..X.', '.X..X.'],
  ['..XX..', '..XX..', '.XXXX.', 'X.XX.X', '..XX..', '..XX..', '.X..X.'],
];
/** The road: start flag, the target's flag, and you walking between them as the session goes on; the way behind you is in the subject's color. */
function Road() {
  const L = useTimerLook();
  const ss = useSession();
  const [w, setW] = useState(0);
  const [frame, setFrame] = useState(0);
  const walking = ss.running && !ss.paused;
  useEffect(() => {
    if (!walking) return;
    const id = setInterval(() => setFrame((f) => 1 - f), 380);
    return () => clearInterval(id);
  }, [walking]);
  const p = ss.target ? Math.min(1, ss.elapsed / ss.target) : 0;
  const PX = 3, FIG = 6 * PX, FLAG = 6 * PX, HOME = 6 * 2 + 6; // you set off just past the start flag
  const span = Math.max(0, w - HOME - FLAG - FIG - 2);
  const x = HOME + Math.round((span * p) / PX) * PX; // on the pixel grid
  const targetMin = Math.round(ss.target / 60);
  const hop = useSharedValue(0);
  useEffect(() => {
    if (!ss.over) { hop.set(0); return; }
    hop.set(withRepeat(withSequence(withTiming(-6, { duration: 180, easing: STEP }), withTiming(0, { duration: 180, easing: STEP })), -1));
    return () => cancelAnimation(hop);
  }, [ss.over, hop]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: hop.value }] }));
  const spark = useBlink(ss.over, 260, 0);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} accessible accessibilityLabel={`目安${targetMin}分のうち${Math.round(p * 100)}%`} style={{ height: 66, marginBottom: 6 }}>
      {/* the ground: a dotted path, tiles under it */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 14, height: 2, flexDirection: 'row', justifyContent: 'space-between' }}>
        {Array.from({ length: 24 }, (_, i) => <View key={i} style={{ width: 4, height: 2, backgroundColor: i / 24 < p ? ss.subject.c : L.faint }} />)}
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, flexDirection: 'row', gap: 2 }}>
        {Array.from({ length: 16 }, (_, i) => <View key={i} style={{ flex: 1, backgroundColor: L.faint, opacity: i % 2 ? 0.6 : 1 }} />)}
      </View>
      {/* start and target */}
      <View style={{ position: 'absolute', left: 0, bottom: 16 }}><PixelArt rows={SPRITES.flag} px={2} colors={{ X: L.dim, F: L.dim }} /></View>
      <Animated.View style={[{ position: 'absolute', right: 0, bottom: 16 }, a]}>
        <PixelArt rows={SPRITES.flag} px={PX} colors={{ X: L.edge, F: ss.over ? L.exp : L.hp }} />
      </Animated.View>
      {ss.over ? <Animated.View style={[{ position: 'absolute', right: FLAG + 4, bottom: 44 }, spark]}><PixelArt rows={SPRITES.spark} px={2} colors={{ X: L.exp }} /></Animated.View> : null}
      {/* you */}
      {w ? (
        <View style={{ position: 'absolute', left: x, bottom: 16, opacity: ss.running ? 1 : 0.6 }}>
          <PixelArt rows={WALK[walking ? frame : 0]} px={PX} colors={{ X: L.text }} />
        </View>
      ) : null}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row' }}>
        <Cap size={9} color={L.dim}>START</Cap>
        <View style={{ flex: 1 }} />
        <T size={11} lh={15} color={ss.over ? L.exp : L.dim}>{`もくひょう ${targetMin}分`}</T>
      </View>
    </View>
  );
}

/** The big count: the time studied, or (countdown) the time left. */
function Readout() {
  const L = useTimerLook();
  const ss = useSession();
  const up = ss.mode === 'up';
  const rem = ss.target - ss.elapsed;
  const over = !up && ss.over;
  const sec = up ? ss.elapsed : ss.over ? -rem : ss.running ? rem : ss.target;
  const said = up ? 'けいか' : over ? 'ちょうか' : ss.running ? 'のこり' : 'しゅうちゅうする じかん';
  const text = fmt(sec);
  const narrow = useWindowDimensions().width < 360;
  const big = text.length > 5 ? (narrow ? 38 : 46) : (narrow ? 50 : 60);
  const b = useBlink(ss.paused, 500, 0.25);
  return (
    <View style={{ alignItems: 'center', paddingVertical: 4 }} accessible accessibilityLabel={`${said} ${text}${ss.paused ? '。一時停止中' : ''}`}>
      <T size={13} lh={19} color={over ? L.hp : L.dim}>{said}</T>
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'center' }, b]}>
        {over ? <Fig size={big * 0.7} color={L.hp}>+</Fig> : null}
        <Fig size={big} color={over ? L.hp : L.text}>{text}</Fig>
      </Animated.View>
      {ss.paused ? <Cap size={10} color={L.exp}>PAUSE</Cap> : null}
    </View>
  );
}

/** The session as a gauge toward the target; in countdown, the keys that set it. */
function Progress() {
  const L = useTimerLook();
  const ss = useSession();
  const up = ss.mode === 'up';
  const N = 24;
  const targetMin = Math.round(ss.target / 60);
  const caption = ss.paused ? 'ひとやすみ ちゅう' : up
    ? ss.over ? `もくひょうの ${targetMin}分を こえた！` : `もくひょう ${targetMin}分まで あと ${fmt(ss.remaining)}`
    : ss.running ? `勉強した じかん ${fmt(ss.elapsed)}` : 'しゅうちゅうする じかんを えらぶ';
  return (
    <View style={{ gap: 8, marginTop: 10 }}>
      <Segs look={L} cells={fill(ss.elapsed, Math.max(1, ss.target), N, ss.over ? L.exp : ss.subject.c)} h={12} />
      <T size={12.5} lh={18} color={L.dim} style={{ textAlign: 'center' }}>{caption}</T>
      {up ? null : <Presets look={L} />}
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
function Presets({ look: L }: { look: L }) {
  const running = useStore((s) => s.running);
  const plan = useStore((s) => s.targetMin);
  const keys: { k: string; label: string; run: () => void; on?: boolean }[] = [
    { k: '-5', label: '5分へらす', run: () => setLeft(leftNow() - 5) },
    ...[15, 25, 45, 60].map((m) => ({ k: String(m), label: `${running ? 'のこり' : ''}${m}分にする`, run: () => setLeft(m), on: !running && Math.round(plan) === m })),
    { k: '+5', label: '5分ふやす', run: () => setLeft(leftNow() + 5) },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {keys.map((x) => (
        <Press key={x.k} onPress={() => { haptic.tap(); x.run(); }} haptics={false} scale={0.92} accessibilityRole="button" accessibilityLabel={x.label}
          style={{ flex: 1, height: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: x.on ? L.cursor : L.edge, backgroundColor: x.on ? L.faint : 'transparent' }}>
          <Cap size={10} color={x.on ? L.cursor : L.text} ls={0}>{x.k}</Cap>
        </Press>
      ))}
    </View>
  );
}

/** Today so far, and the day's goal. */
function Today() {
  const L = useTimerLook();
  const today = useToday();
  const ss = useSession();
  const total = today.min + (ss.running ? Math.floor(ss.elapsed / 60) : 0);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 12 }} accessible accessibilityLabel={`今日 ${say(total)}。目標 ${say(today.goal)}`}>
      <T size={12} lh={17} color={L.dim}>きょう <Cap size={11} color={L.text}>{hmColon(total)}</Cap></T>
      <T size={12} lh={17} color={L.dim}>もくひょう <Cap size={11} color={L.text}>{hmColon(today.goal)}</Cap></T>
    </View>
  );
}

/** The command window: start or pause, and record — which asks first. */
function Commands() {
  const L = useTimerLook();
  const running = useStore((s) => s.running);
  const paused = useStore((s) => s.paused);
  const [asking, setAsking] = useState(false);
  const ask = asking && running;
  const main = () => {
    haptic.firm();
    if (!running) startStudy();
    else togglePause();
  };
  return (
    <Win look={L} title={ask ? 'きろくしますか？' : 'コマンド'} lit={ask} pad={10}>
      {ask ? (
        <Menu look={L} cols={2} size={17} items={[
          { key: 'yes', label: 'はい', run: () => { setAsking(false); haptic.success(); session.finish(); }, a11y: '記録する' },
          { key: 'no', label: 'いいえ', run: () => setAsking(false), a11y: '記録しない' },
        ]} />
      ) : (
        <Menu look={L} cols={2} size={17} items={[
          { key: 'main', label: running ? (paused ? 'さいかい' : 'やすむ') : 'はじめる', run: main, a11y: running ? (paused ? '再開' : '一時停止') : '開始' },
          { key: 'rec', label: 'きろくする', run: () => setAsking(true), a11y: '記録する（確認が出ます）', disabled: !running },
        ]} />
      )}
    </Win>
  );
}
const Nothing = () => null;

export const timer: TimerKit = {
  Page,
  parts: { top: Top, subject: Subject, switcher: Switcher, 'x:road': Road, readout: Readout, progress: Progress, today: Today, main: Commands, record: Nothing },
  arrange: () => ({ head: ['top', 'subject', 'switcher'], center: ['x:road', 'readout', 'progress', 'today'], foot: ['main', 'record'] }),
};
