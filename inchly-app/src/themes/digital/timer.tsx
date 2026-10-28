import { StatusBar } from 'expo-status-bar';
import { ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Zone } from '@/screens/layout';
import { hmColon, session, useSession } from '@/screens/model';
import { closeTimer, STANDARD_PARTS, useLeft, useRulerPreview } from '@/screens/timer/standard';
import type { TimerKit } from '@/themes/types';
import { startStudy, togglePause, useNow, useStore, useSubjects } from '@/store';
import { focus, useT } from '@/theme';
import { haptic, Press } from '@/ui/base';
import { Screen } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { micro, press as pressDown, release } from '@/ui/motion';
import { toast } from '@/ui/Toast';
import { useLook } from './look';
import { Ann, Blink, Cells, J, Key, M, Seg, useFlicker } from './parts';
import { heightFor } from './seg';

// デジタル's timer: a stopwatch. The case is dark; the figures sit in a
// display window set into it, the colon blinking while the clock runs. Two
// annunciators say which mode it's in (CHRONO counts up, TIMER counts down).
// One big key starts and pauses; recording is a key you hold.

const two = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, '0');
const clock = (sec: number) => {
  const v = Math.max(0, Math.floor(sec));
  const h = Math.floor(v / 3600);
  return h ? `${h}:${two((v / 60) % 60)}:${two(v % 60)}` : `${two(v / 60)}:${two(v % 60)}`;
};

/** Four screw heads in the corners of the case. */
function Screws({ top, bottom }: { top: number; bottom: number }) {
  const L = useLook();
  const s = (pos: object) => (
    <View pointerEvents="none" style={[{ position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: L.key.base, boxShadow: `inset 0px 1px 0px ${L.key.edge}`, alignItems: 'center', justifyContent: 'center' }, pos]}>
      <View style={{ width: 5, height: 1.2, backgroundColor: L.key.face, transform: [{ rotate: '35deg' }] }} />
    </View>
  );
  return <>{s({ top: top + 8, left: 8 })}{s({ top: top + 8, right: 8 })}{s({ bottom: bottom + 8, left: 8 })}{s({ bottom: bottom + 8, right: 8 })}</>;
}

function Page({ zones }: { zones: Record<Zone, ReactNode> }) {
  useT(); // the case's color follows the theme
  const insets = useSafeAreaInsets();
  return (
    <Screen bg={focus.bg} style={{ paddingBottom: insets.bottom + 16 }}>
      <StatusBar style="light" />
      <Screws top={insets.top} bottom={insets.bottom} />
      {zones.head}
      <View style={{ flex: 1, minHeight: 14 }} />
      {zones.center}
      <View style={{ flex: 1, minHeight: 14 }} />
      {zones.foot}
    </Screen>
  );
}

// ---------- parts ----------
function Mode({ on, children }: { on: boolean; children: string }) {
  const L = useLook();
  return (
    <View style={{ alignItems: 'center' }}>
      <M size={8} lh={9} color={on ? L.bodyInk : 'transparent'}>▼</M>
      <Ann plain color={on ? L.bodyInk : L.bodyInk3}>{children}</Ann>
    </View>
  );
}

function Top() {
  const L = useLook();
  const now = useNow();
  const ss = useSession();
  const d = new Date(now);
  return (
    <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingLeft: 22, paddingRight: 24, gap: 14 }}>
      <Key onPress={closeTimer} label="閉じる" h={30} depth={2} face={{ width: 40, paddingHorizontal: 0 }}>
        <View style={{ transform: [{ rotate: '-90deg' }] }}><Icon name="back" size={15} color={L.key.ink} width={2} /></View>
      </Key>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', gap: 10 }} accessible accessibilityLabel={ss.mode === 'up' ? '勉強した時間を数えています' : '目安まで数えています'}>
        <Mode on={ss.mode === 'up'}>CHRONO</Mode>
        <Mode on={ss.mode !== 'up'}>TIMER</Mode>
      </View>
      <M b size={13} color={L.bodyInk2}>{`${two(d.getHours())}:${two(d.getMinutes())}`}</M>
    </View>
  );
}

function Subject() {
  const L = useLook();
  const ss = useSession();
  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 6, gap: 2 }} accessible accessibilityLabel={`${ss.subject.name} ${ss.task}`}>
      <Ann color={L.bodyInk3}>{ss.running ? 'NOW' : 'READY'}</Ann>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 6, height: 26, borderRadius: 1, backgroundColor: ss.subject.c }} />
        <J size={28} w="800" lh={36} color={L.bodyInk} numberOfLines={1} style={{ flexShrink: 1 }}>{ss.subject.name}</J>
      </View>
      {ss.task ? <J size={13} w="500" color={L.bodyInk2} numberOfLines={1}>{ss.task}</J> : null}
    </View>
  );
}

/** Subjects as keys, while the subject can still change; the one set stays down. */
function Switcher() {
  const L = useLook();
  const ss = useSession();
  const subjects = useSubjects();
  if (!ss.canSwitch) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 22, paddingTop: 12 }} accessibilityRole="radiogroup" accessibilityLabel="科目を変える">
      {subjects.map((x) => {
        const on = x.id === ss.subject.id;
        return (
          <Key key={x.id} onPress={() => session.switchTo(x.id)} label={x.name} role="radio" checked={on} latched={on} haptics={false} h={28} depth={2} face={{ paddingHorizontal: 9, gap: 5 }}>
            <View style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: x.c }} />
            <J size={12} w="700" color={on ? L.bodyInk : L.key.ink}>{x.name}</J>
          </Key>
        );
      })}
    </View>
  );
}

/** The display window: the figures, what they count, and (counting up) the target as segments. */
function Readout() {
  const L = useLook();
  const ss = useSession();
  const p = useRulerPreview();
  const left = useLeft();
  const { width } = useWindowDimensions();
  const [flick, kick] = useFlicker();
  const up = ss.mode === 'up';
  const rem = ss.target - ss.elapsed;
  const moving = !up && (p.h !== null || p.m !== null);
  const sec = moving ? Math.min(300, (p.h ?? left.h) * 60 + (p.m ?? Math.floor(left.m))) * 60
    : up ? ss.elapsed : ss.over ? -rem : ss.running ? rem : ss.target;
  const over = ss.over && !moving;
  const label = moving ? 'SET' : up ? 'ELAPSED' : over ? 'OVER' : ss.running ? 'REMAIN' : 'LENGTH';
  const value = clock(sec);
  const h = Math.min(108, heightFor(value, width - 36 - 32 - 8));
  const ticking = ss.running && !ss.paused;
  const n = 30;
  const filled = Math.min(n, Math.floor((ss.elapsed / Math.max(1, ss.target)) * n));
  const cells = Array.from({ length: n }, (_, i) => (i < filled ? (ss.over ? L.accent : L.win.seg) : null));
  return (
    <Press onPress={() => { haptic.soft(); kick(); }} haptics={false} react="flicker" scale={0.99} accessibilityLabel={`${label} ${value}`}
      style={{ marginHorizontal: 18, borderRadius: 10, backgroundColor: L.win.bg, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16,
        boxShadow: `inset 0px 3px 8px rgba(0,0,0,0.35), 0px 0px 0px 2px ${L.win.edge}` }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ann on color={over ? L.accent : L.win.ink} look={{ ...L, t: { ...L.t, canvas: L.win.bg } }}>{label}</Ann>
        {ss.paused && !moving ? <Blink period={900}><Ann plain color={L.accent}>PAUSE</Ann></Blink> : null}
        <View style={{ flex: 1 }} />
        <Ann plain color={L.win.ink2}>{`TARGET ${Math.round(ss.target / 60)}`}</Ann>
      </View>
      <Animated.View style={[{ alignItems: 'center', marginTop: 10 }, flick]}>
        <Seg text={value} h={h} color={over ? L.accent : L.win.seg} ghost={L.win.ghost} glow={L.glow}
          colonOn={!ticking || Math.floor(ss.elapsed) % 2 === 0} />
      </Animated.View>
      {up ? <Cells cells={cells} h={8} gap={2} off={L.win.ghost} style={{ marginTop: 14 }} /> : null}
    </Press>
  );
}

/** Counting up: what the target bar says. 目安 mode: the standard rulers that set it. */
function Progress() {
  const L = useLook();
  const ss = useSession();
  if (ss.mode !== 'up') {
    const Rulers = STANDARD_PARTS.progress;
    return <Rulers />;
  }
  const targetMin = Math.round(ss.target / 60);
  return (
    <J size={12} w="500" color={ss.over ? L.accent : L.bodyInk2} style={{ textAlign: 'center', marginTop: 12 }}>
      {ss.paused ? '一時停止中' : ss.over ? `目安の${targetMin}分をこえました` : `目安 ${targetMin}分まで あと ${clock(ss.remaining)}`}
    </J>
  );
}

function Today() {
  const L = useLook();
  const today = useStore((s) => s.todayMin);
  const goal = useStore((s) => s.goalMin);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18, marginTop: 14 }} accessible accessibilityLabel={`今日 ${hmColon(today)}、目標 ${hmColon(goal)}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ann plain color={L.bodyInk3}>TODAY</Ann>
        <M b size={15} color={L.bodyInk}>{hmColon(today)}</M>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ann plain color={L.bodyInk3}>GOAL</Ann>
        <M b size={15} color={L.bodyInk}>{hmColon(goal)}</M>
      </View>
    </View>
  );
}

/** The big key: start, pause, resume. */
function Main() {
  const L = useLook();
  const running = useStore((s) => s.running);
  const paused = useStore((s) => s.paused);
  const playing = running && !paused;
  const word = playing ? 'PAUSE' : running ? 'RESUME' : 'START';
  const ja = playing ? '一時停止' : running ? '再開' : '開始';
  const press = () => {
    haptic.firm();
    if (!running) startStudy();
    else togglePause();
  };
  const ink = playing ? L.key.ink : L.keyAccent.ink;
  return (
    <Key onPress={press} label={ja} tone={playing ? 'plain' : 'accent'} h={60} depth={4} haptics={false} style={{ marginTop: 20, marginHorizontal: 22 }} face={{ gap: 10 }}>
      <View><Icon name={playing ? 'pause' : 'play'} size={18} color={ink} /></View>
      <M b size={20} color={ink} ls={4}>{word}</M>
      <J size={12} w="700" color={ink} style={{ opacity: 0.75 }}>{ja}</J>
    </Key>
  );
}

/** A key you hold to record: the bar fills while it's down; let go early and it drains. */
function Record() {
  const L = useLook();
  const running = useStore((s) => s.running);
  const fill = useSharedValue(0);
  const down = useSharedValue(0);
  // the hold's progress as a scale from the left (not a width: no layout every frame)
  const bar = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));
  const face = useAnimatedStyle(() => ({ transform: [{ translateY: down.value * 3 }] }));
  const HOLD = 700;
  const finish = () => {
    haptic.success();
    session.finish();
    fill.set(withDelay(600, withTiming(0, { duration: 1 })));
  };
  return (
    <View style={{ marginHorizontal: 22, paddingBottom: 3, opacity: running ? 1 : 0.38 }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 3, bottom: 0, borderRadius: 8, backgroundColor: L.key.base }} />
      {/* not `disabled`: the whole key fades instead, base and all; the handlers do nothing while nothing runs */}
      <Press delayLongPress={HOLD} haptics={false} react="scale" scale={1}
        onPressIn={() => { if (!running) return; haptic.soft(); down.set(pressDown(1)); fill.set(withTiming(1, { duration: HOLD, easing: Easing.linear })); }}
        onPressOut={() => { down.set(release(0)); if (fill.get() < 1) fill.set(micro(0)); }}
        onLongPress={() => { if (running) finish(); }}
        onPress={() => { if (running) toast('長押しで記録します', 'キーを押したままにしてください'); }}
        accessibilityRole="button" accessibilityLabel="長押しで記録する" accessibilityState={{ disabled: !running }}
        accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => { if (running) session.finish(); }}>
        <Animated.View style={[{ height: 54, borderRadius: 8, backgroundColor: L.key.face, borderTopWidth: 1, borderTopColor: L.key.edge, overflow: 'hidden', justifyContent: 'center' }, face]}>
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: L.accent, opacity: 0.5, transformOrigin: 'left' }, bar]} />
          <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: L.accent }} />
            <M b size={14} color={L.key.ink} ls={2.5}>HOLD · RECORD</M>
            <J size={12} w="600" color={L.key.ink} style={{ opacity: 0.75 }}>長押しで記録</J>
          </View>
        </Animated.View>
      </Press>
    </View>
  );
}

export const timer: TimerKit = {
  Page,
  parts: { top: Top, subject: Subject, switcher: Switcher, readout: Readout, progress: Progress, today: Today, main: Main, record: Record },
};
