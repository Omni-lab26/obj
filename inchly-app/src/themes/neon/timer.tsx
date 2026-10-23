import { StatusBar } from 'expo-status-bar';
import { ReactNode, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';

import type { Zone } from '@/screens/layout';
import { hmColon, session, useSession } from '@/screens/model';
import { closeTimer, fmt, STANDARD_PARTS, useLeft, useRulerPreview } from '@/screens/timer/standard';
import type { TimerKit } from '@/themes/types';
import { startStudy, togglePause, useNow, useStore, useSubjects } from '@/store';
import { focus, useT } from '@/theme';
import { haptic, Press } from '@/ui/base';
import { Screen } from '@/ui/Chrome';
import { Rolling } from '@/ui/Rolling';
import { Blink, Cut, D, Glitch, glow, I, J, Label, Meter, N } from './ui';

// ネオン's timer: a HUD over a grid floor. Everything lines up on the left —
// what's running, the big yellow count, the target as a charge bar — with one
// wide button to start or pause, and a bar you hold to record.

/** A grid floor running off toward the horizon, faint. */
function Floor() {
  const { width } = useWindowDimensions();
  const H = 230;
  const rows = [0, 10, 24, 44, 70, 104, 148, 204];
  const cols = Array.from({ length: 13 }, (_, i) => i - 6);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: H, opacity: 0.55 }}>
      <Svg width={width} height={H}>
        {rows.map((y) => <Line key={`r${y}`} x1={0} y1={y + 20} x2={width} y2={y + 20} stroke="rgba(0,240,255,0.16)" strokeWidth={1} />)}
        {cols.map((c) => <Line key={`c${c}`} x1={width / 2 + c * 24} y1={20} x2={width / 2 + c * width * 0.32} y2={H} stroke="rgba(0,240,255,0.12)" strokeWidth={1} />)}
      </Svg>
    </View>
  );
}

/** Corner marks around the whole screen. */
function Corners({ top, bottom }: { top: number; bottom: number }) {
  const L = 18;
  const mark = (pos: object, sides: object) => <View pointerEvents="none" style={[{ position: 'absolute', width: L, height: L, borderColor: 'rgba(252,238,10,0.7)' }, pos, sides]} />;
  return (
    <>
      {mark({ top: top + 4, left: 8 }, { borderTopWidth: 2, borderLeftWidth: 2 })}
      {mark({ top: top + 4, right: 8 }, { borderTopWidth: 2, borderRightWidth: 2 })}
      {mark({ bottom: bottom + 4, left: 8 }, { borderBottomWidth: 2, borderLeftWidth: 2 })}
      {mark({ bottom: bottom + 4, right: 8 }, { borderBottomWidth: 2, borderRightWidth: 2 })}
    </>
  );
}

function Page({ zones }: { zones: Record<Zone, ReactNode> }) {
  useT(); // the timer's color follows the theme
  const insets = useSafeAreaInsets();
  return (
    <Screen bg={focus.bg} style={{ paddingBottom: insets.bottom + 16 }}>
      <StatusBar style="light" />
      <Floor />
      <Corners top={insets.top} bottom={insets.bottom} />
      {zones.head}
      <View style={{ flex: 1, minHeight: 18 }} />
      {zones.center}
      <View style={{ flex: 1, minHeight: 18 }} />
      {zones.foot}
    </Screen>
  );
}

// ---------- parts ----------
function Top() {
  const now = useNow();
  const ss = useSession();
  const d = new Date(now);
  const p2 = (n: number) => String(n).padStart(2, '0');
  return (
    <View style={{ height: 54, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 20 }}>
      <Press onPress={closeTimer} scale={0.9} hitSlop={8} accessibilityLabel="閉じる" style={{ height: 32, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Cut fill="transparent" stroke={N.cyanLine} cut={7} />
        <I name="x" size={12} color={N.cyan} />
        <D size={13} color={N.cyan} style={{ letterSpacing: 1.5 }}>CLOSE</D>
      </Press>
      <View style={{ flex: 1 }} />
      <View style={{ alignItems: 'flex-end' }}>
        <D size={17} color={N.ink}>{`${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`}</D>
        <Label size={9}>{ss.mode === 'up' ? '// MODE: COUNT-UP' : '// MODE: TARGET'}</Label>
      </View>
    </View>
  );
}

function Subject() {
  const ss = useSession();
  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 10, gap: 2 }} accessible accessibilityLabel={`${ss.subject.name} ${ss.task}`}>
      <Label>{ss.running ? '// ACTIVE_TASK' : '// STANDBY'}</Label>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 }}>
        <View style={{ width: 10, height: 28, backgroundColor: ss.subject.c, transform: [{ skewX: '-16deg' }], boxShadow: `0px 0px 10px ${ss.subject.c}` }} />
        <J size={30} w="800" lh={38} numberOfLines={1} style={{ flexShrink: 1 }}>{ss.subject.name}</J>
      </View>
      {ss.task ? <J size={13} w="500" color={N.ink2} numberOfLines={1}>{ss.task}</J> : null}
    </View>
  );
}

/** Subjects as tags, while the subject can still change. */
function Switcher() {
  const ss = useSession();
  const subjects = useSubjects();
  if (!ss.canSwitch) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 22, paddingTop: 14 }} accessibilityRole="radiogroup" accessibilityLabel="科目を変える">
      {subjects.map((x) => {
        const on = x.id === ss.subject.id;
        return (
          <Pressable key={x.id} onPress={() => session.switchTo(x.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={x.name} hitSlop={{ top: 6, bottom: 6 }}
            style={({ pressed }) => ({ height: 28, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? 0.6 : 1 })}>
            <Cut fill={on ? N.yellow : 'transparent'} stroke={on ? undefined : 'rgba(255,255,255,0.18)'} cut={6} />
            <View style={{ width: 6, height: 6, backgroundColor: x.c }} />
            <J size={12} w="700" color={on ? '#0A0A0A' : N.ink2}>{x.name}</J>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The count: time studied, or (目安 mode) time left — or what a moving ruler is on. */
function Readout() {
  const ss = useSession();
  const p = useRulerPreview();
  const left = useLeft();
  const [kick, setKick] = useState(0);
  const up = ss.mode === 'up';
  const rem = ss.target - ss.elapsed;
  const moving = !up && (p.h !== null || p.m !== null);
  const sec = moving ? Math.min(300, (p.h ?? left.h) * 60 + (p.m ?? Math.floor(left.m))) * 60
    : up ? ss.elapsed : ss.over ? -rem : ss.running ? rem : ss.target;
  const over = ss.over && !moving;
  const label = moving ? 'SET TIME' : up ? (over ? 'ELAPSED · OVER TARGET' : 'ELAPSED') : over ? 'OVERTIME' : ss.running ? 'REMAINING' : 'SESSION LENGTH';
  const color = over ? N.red : N.yellow;
  const value = `${!up && over ? '+' : ''}${fmt(sec)}`;
  return (
    <Press onPress={() => { haptic.soft(); setKick((k) => k + 1); }} haptics={false} react="flicker" scale={0.99}
      accessibilityLabel={`${label} ${fmt(sec)}`} style={{ paddingHorizontal: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Label color={over ? N.red : N.cyan}>{`// ${label}`}</Label>
        {ss.paused && !moving ? <Blink><D size={12} color={N.yellow} style={{ letterSpacing: 2 }}>PAUSED</D></Blink> : null}
      </View>
      <View style={{ opacity: ss.paused && !moving ? 0.55 : 1, marginTop: 2 }}>
        <Glitch kick={kick} copy={(c) => <D size={84} lh={101} color={c} style={{ letterSpacing: -84 * 0.025 }}>{value}</D>}>
          <Rolling value={value} size={84} weight="700" color={color} style={glow(over ? 'rgba(255,0,60,0.6)' : 'rgba(252,238,10,0.55)', 16)} />
        </Glitch>
      </View>
    </Press>
  );
}

/** Counting up: the target as a charge bar. 目安 mode: the standard rulers that set it. */
function Progress() {
  const ss = useSession();
  if (ss.mode !== 'up') {
    const Rulers = STANDARD_PARTS.progress;
    return <Rulers />;
  }
  const n = 30;
  const filled = Math.min(n, Math.floor((ss.elapsed / Math.max(1, ss.target)) * n));
  const cells = Array.from({ length: n }, (_, i) => (ss.over ? N.red : i < filled ? N.yellow : null));
  const targetMin = Math.round(ss.target / 60);
  return (
    <View style={{ marginTop: 14, paddingHorizontal: 22, gap: 8 }}>
      <Meter cells={cells} h={12} gap={2} />
      <D size={12.5} color={ss.over ? N.red : N.ink2} style={{ letterSpacing: 1 }}>
        {ss.paused ? `PAUSED · TARGET ${targetMin} MIN` : ss.over ? `TARGET ${targetMin} MIN CLEARED · +${fmt(ss.elapsed - ss.target)}` : `TARGET ${targetMin} MIN · ${fmt(ss.remaining)} LEFT`}
      </D>
    </View>
  );
}

function Today() {
  const today = useStore((s) => s.todayMin);
  const goal = useStore((s) => s.goalMin);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 16, paddingHorizontal: 22, marginTop: 16 }} accessible accessibilityLabel={`今日 ${hmColon(today)}、目標 ${hmColon(goal)}`}>
      <D size={13} color={N.ink3} style={{ letterSpacing: 1.2 }}>TODAY <D size={17} color={N.ink}>{hmColon(today)}</D></D>
      <D size={13} color={N.ink3} style={{ letterSpacing: 1.2 }}>GOAL <D size={17} color={N.ink}>{hmColon(goal)}</D></D>
    </View>
  );
}

/** One wide button: start, pause, resume. */
function Main() {
  const running = useStore((s) => s.running);
  const paused = useStore((s) => s.paused);
  const [kick, setKick] = useState(0);
  const playing = running && !paused;
  const word = playing ? 'PAUSE' : running ? 'RESUME' : 'START';
  const press = () => {
    haptic.firm();
    setKick((k) => k + 1);
    if (!running) startStudy();
    else togglePause();
  };
  const ink = playing ? N.yellow : '#0A0A0A';
  return (
    <Press onPress={press} haptics={false} react="flicker" scale={0.96} accessibilityLabel={playing ? '一時停止' : running ? '再開' : '開始'}
      style={{ marginTop: 22, marginHorizontal: 22, height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Cut fill={playing ? 'rgba(252,238,10,0.06)' : N.yellow} stroke={playing ? N.yellow : undefined} cut={18} sw={1.5} />
      <I name={playing ? 'pause' : 'play'} size={20} color={ink} />
      <Glitch kick={kick} copy={(c) => <D size={26} color={c} style={{ letterSpacing: 4 }}>{word}</D>}>
        <D size={26} color={ink} style={{ letterSpacing: 4 }}>{word}</D>
      </Glitch>
    </Press>
  );
}

/** Hold to record: the bar fills while you hold it; let go early and it drains. */
function Record() {
  const running = useStore((s) => s.running);
  const fill = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const HOLD = 650;
  const finish = () => {
    haptic.success();
    session.finish();
    fill.set(withDelay(600, withTiming(0, { duration: 1 })));
  };
  return (
    <View style={{ marginHorizontal: 22 }}>
      <Pressable disabled={!running} delayLongPress={HOLD}
        onPressIn={() => { haptic.soft(); fill.set(withTiming(1, { duration: HOLD, easing: Easing.linear })); }}
        onPressOut={() => { if (fill.get() < 1) fill.set(withTiming(0, { duration: 180 })); }}
        onLongPress={finish}
        accessibilityRole="button" accessibilityLabel="長押しで記録する" accessibilityState={{ disabled: !running }}
        accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => { if (running) session.finish(); }}
        style={{ height: 58, justifyContent: 'center', opacity: running ? 1 : 0.35 }}>
        <Cut fill="#0C0C0C" stroke={N.cyanLine} cut={14} />
        <View pointerEvents="none" style={{ position: 'absolute', left: 6, right: 6, top: 6, bottom: 6, overflow: 'hidden' }}>
          <Animated.View style={[{ height: '100%', backgroundColor: 'rgba(252,238,10,0.28)' }, a]} />
        </View>
        <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <D size={15} color={N.yellow} style={{ letterSpacing: 2.5 }}>HOLD TO RECORD</D>
          <J size={12} w="600" color={N.ink2}>長押しで記録</J>
        </View>
      </Pressable>
    </View>
  );
}

export const timer: TimerKit = {
  Page,
  parts: { top: Top, subject: Subject, switcher: Switcher, readout: Readout, progress: Progress, today: Today, main: Main, record: Record },
};
