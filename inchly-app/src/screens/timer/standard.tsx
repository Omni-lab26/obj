import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ComponentType, ReactNode, useSyncExternalStore } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hm, pad } from '@/data';
import { TimerPart, Zone } from '@/screens/layout';
import { session, useSession } from '@/screens/model';
import { elapsedOf, getState, setTarget, startStudy, togglePause, useStore, useSubjects } from '@/store';
import { focus, hair, useT } from '@/theme';
import { haptic, Press, Txt } from '@/ui/base';
import { Screen } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { Rolling } from '@/ui/Rolling';
import { SlideToRecord } from '@/ui/SlideToRecord';
import { TimeScrubber } from '@/ui/TimeScrubber';

// The standard timer, as parts: always dark. The subject sits on top, large.
// By default the readout counts up (the time that gets recorded) with the
// target as a thin bar; in 目安 mode it counts down the planned session on two
// rulers (hours above, minutes below) — drag or fling either to adjust. Slide
// to record pauses the clock and opens the record page. A theme's timer falls
// back to these for any part it doesn't draw.
export const fmt = (sec: number) => {
  const v = Math.max(0, Math.round(sec));
  const h = Math.floor(v / 3600), m = Math.floor(v / 60) % 60, x = v % 60;
  return h ? `${h}:${pad(m)}:${pad(x)}` : `${pad(m)}:${pad(x)}`;
};
const hourLabel = (h: number) => `${h}時間`;
const minLabel = (m: number) => `${m}分`;

// While a ruler moves, only the readout hears about it, so the screen around it stays still.
type Preview = { h: number | null; m: number | null };
let preview: Preview = { h: null, m: null };
const previewSubs = new Set<() => void>();
const setPreview = (p: Partial<Preview>) => { preview = { ...preview, ...p }; previewSubs.forEach((f) => f()); };
const onPreview = (f: () => void) => { previewSubs.add(f); return () => { previewSubs.delete(f); }; };
/** While a ruler moves: the hours and minutes it is on (null when still). */
export const useRulerPreview = () => useSyncExternalStore(onPreview, () => preview, () => preview);

/** What's left (or planned), split into hours and minutes for the two rulers. */
const split = (min: number) => { const h = Math.min(5, Math.floor(min / 60)); return { h, m: min - h * 60 }; };
export function useLeft() {
  const ss = useSession();
  return split(ss.running ? ss.remaining / 60 : ss.target / 60);
}

// ---------- page ----------
export function StandardTimerPage({ zones }: { zones: Record<Zone, ReactNode> }) {
  useT(); // the timer's color follows the theme
  const insets = useSafeAreaInsets();
  return (
    <Screen bg={focus.bg} style={{ paddingBottom: insets.bottom + 16 }}>
      <StatusBar style="light" />
      {zones.head}
      <View style={{ flex: 1, minHeight: 24 }} />
      {zones.center}
      <View style={{ flex: 1, minHeight: 24 }} />
      {zones.foot}
    </Screen>
  );
}

// ---------- parts ----------
export const closeTimer = () => (router.canGoBack() ? router.back() : router.replace('/'));
function Top() {
  return (
    <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
      <Press onPress={closeTimer} scale={0.86} accessibilityLabel="閉じる" hitSlop={6}
        style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ transform: [{ rotate: '-90deg' }] }}>
          <Icon name="back" size={22} color={focus.ink2} />
        </View>
      </Press>
    </View>
  );
}

/** What you're studying, first and large. */
function Subject() {
  const ss = useSession();
  return (
    <View style={{ alignItems: 'center', gap: 2, paddingHorizontal: 24, paddingTop: 4 }} accessible accessibilityLabel={`${ss.subject.name} ${ss.task}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: ss.subject.c }} />
        <Txt size={32} w="800" color={focus.ink}>{ss.subject.name}</Txt>
      </View>
      <Txt size={13} color={focus.ink2} numberOfLines={1}>{ss.task}</Txt>
    </View>
  );
}

/** The subject can change before starting and in the first minute, so the chips show only then. */
function Switcher() {
  const ss = useSession();
  const subjects = useSubjects();
  if (!ss.canSwitch) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 12 }} accessibilityRole="radiogroup" accessibilityLabel="科目を変える">
      {subjects.map((x) => {
        const on = x.id === ss.subject.id;
        return (
          <Pressable key={x.id} onPress={() => session.switchTo(x.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} hitSlop={{ top: 8, bottom: 8 }}
            style={({ pressed }) => ({ height: 30, paddingHorizontal: 10, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: on ? 'rgba(255,255,255,0.08)' : 'transparent', borderWidth: hair, borderColor: on ? 'rgba(255,255,255,0.16)' : 'transparent', transform: [{ scale: pressed ? 0.95 : 1 }] })}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: x.c, opacity: on ? 1 : 0.6 }} />
            <Txt size={12} w="600" color={on ? '#fff' : 'rgba(255,255,255,0.55)'}>{x.name}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The big number: the time studied, or (目安 mode) the time left — or what a moving ruler is on. */
function Readout() {
  const ss = useSession();
  const p = useRulerPreview();
  const left = useLeft();
  const rem = ss.target - ss.elapsed;
  const up = ss.mode === 'up';
  const sec = up ? ss.elapsed : ss.over ? -rem : ss.running ? rem : ss.target;
  const over = !up && ss.over;
  const side = up ? '勉強した時間' : ss.over ? '超過' : ss.running ? '残り' : 'に集中';
  const moving = !up && (p.h !== null || p.m !== null);
  const shown = moving ? Math.min(300, (p.h ?? left.h) * 60 + (p.m ?? Math.floor(left.m))) * 60 : sec;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, opacity: ss.paused && !moving ? 0.5 : 1 }}
      accessible accessibilityLabel={`${side} ${fmt(shown)}`}>
      {over && !moving ? <Txt num size={40} w="500" color={focus.green} style={{ marginBottom: 6 }}>+</Txt> : null}
      <Rolling value={fmt(shown)} size={60} weight="600" color={over && !moving ? focus.green : focus.ink} />
      <Txt size={13} w="600" color={over && !moving ? focus.green : focus.ink2} style={{ marginBottom: 11 }}>{moving ? 'に設定' : side}</Txt>
    </View>
  );
}

/** Counting up: the target as a thin bar in the subject's color. 目安 mode: the two rulers that set it. */
function Progress() {
  const ss = useSession();
  const left = useLeft();
  const targetMin = ss.target / 60;
  if (ss.mode === 'up') {
    return (
      <View style={{ marginTop: 18, marginHorizontal: 40, gap: 6 }}>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: focus.raise, overflow: 'hidden' }}>
          <View style={{ width: `${Math.min(100, (ss.elapsed / Math.max(1, ss.target)) * 100)}%`, height: 4, borderRadius: 2, backgroundColor: ss.over ? '#F2B705' : ss.subject.c }} />
        </View>
        <Txt size={11.5} color={focus.ink3} style={{ textAlign: 'center' }}>
          {ss.paused ? '一時停止中' : ss.over ? `目安の${Math.round(targetMin)}分をこえました` : `目安 ${Math.round(targetMin)}分まで あと ${fmt(ss.remaining)}`}
        </Txt>
      </View>
    );
  }
  return (
    <>
      <Txt size={11.5} color={focus.ink3} style={{ textAlign: 'center', marginTop: 2 }}>
        {ss.paused ? '一時停止中' : ss.running ? `勉強した時間 ${fmt(ss.elapsed)}` : '目盛りを動かして、集中する時間を決めます'}
      </Txt>
      <View style={{ marginTop: 22, marginHorizontal: 20, gap: 4 }}>
        <Txt size={11} w="600" color={focus.ink3}>時間</Txt>
        <TimeScrubber value={left.h} onChange={onHours} onPreview={onHoursPreview} min={0} max={5} step={1} px={56} minor={0.25} mid={0.5} major={1}
          label={hourLabel} bg={focus.bg} dark a11y={ss.running ? '残り時間の時間' : '集中する時間の時間'} />
        <Txt size={11} w="600" color={focus.ink3} style={{ marginTop: 4 }}>分</Txt>
        <TimeScrubber value={left.m} onChange={onMins} onPreview={onMinsPreview} min={0} max={59} step={5} px={10} minor={1} mid={5} major={15}
          label={minLabel} bg={focus.bg} dark a11y={ss.running ? '残り時間の分' : '集中する時間の分'} />
      </View>
    </>
  );
}
// the rulers' callbacks never change, so a ruler isn't redrawn while the clock ticks
const onHoursPreview = (v: number | null) => setPreview({ h: v });
const onMinsPreview = (v: number | null) => setPreview({ m: v });
/** What's left now (or planned), as the rulers show it. */
const leftNow = () => {
  const cur = getState();
  return split(cur.running ? Math.max(0, cur.targetMin * 60 - elapsedOf(cur)) / 60 : cur.targetMin);
};
// A session is at most 5:00; a 5 on the hours ruler takes the minutes back to 0.
const setTotal = (raw: number) => {
  const total = Math.min(300, raw);
  const cur = getState();
  if (cur.running) setTarget(elapsedOf(cur) / 60 + total);
  else setTarget(Math.max(5, total));
};
const onHours = (h: number) => setTotal(h * 60 + Math.round(leftNow().m));
const onMins = (m: number) => setTotal(leftNow().h * 60 + m);

/** Today so far, and the day's goal. */
function Today() {
  const today = useStore((s) => s.todayMin);
  const goal = useStore((s) => s.goalMin);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 14 }}>
      <Txt size={11.5} color={focus.ink2}>今日 <Txt num size={12} w="600" color="#fff">{hm(today)}</Txt></Txt>
      <Txt size={11.5} color={focus.ink2}>目標 <Txt num size={12} w="600" color="#fff">{hm(goal).replace('00分', '')}</Txt></Txt>
    </View>
  );
}

/** Start, pause, resume. */
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
    <View style={{ alignItems: 'center', marginTop: 26 }}>
      <Press onPress={press} haptics={false} scale={0.92} accessibilityLabel={playing ? '一時停止' : running ? '再開' : '開始'}
        style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: focus.ink, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 0px 0px 6px rgba(255,255,255,0.06)' }}>
        <Icon name={playing ? 'pause' : 'play'} size={24} color={focus.bg} />
      </Press>
    </View>
  );
}

/** Slide to record: stop the clock where it is and fill in the record page. */
function Record() {
  const running = useStore((s) => s.running);
  return (
    <View style={{ marginHorizontal: 24 }}>
      <SlideToRecord disabled={!running} onDone={session.finish} />
    </View>
  );
}

/** The standard drawing of every timer part. */
export const STANDARD_PARTS: Record<TimerPart, ComponentType> = {
  top: Top, subject: Subject, switcher: Switcher, readout: Readout, progress: Progress, today: Today, main: Main, record: Record,
};
