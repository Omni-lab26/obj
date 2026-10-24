import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ComponentType, ReactNode, useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { hm, pad } from '@/data';
import { TimerPart, Zone, Zones } from '@/screens/layout';
import { jpHm, session, useSession, useToday } from '@/screens/model';
import { elapsedOf, getState, setTarget, startStudy, togglePause, useStore, useSubjects } from '@/store';
import { focus, useT } from '@/theme';
import { haptic, Press, SubjTile, Txt } from '@/ui/base';
import { Screen } from '@/ui/Chrome';
import { LiveDot } from '@/ui/GroupParts';
import { Icon } from '@/ui/Icon';
import { Rolling } from '@/ui/Rolling';
import { SlideToRecord } from '@/ui/SlideToRecord';
import { TimeScrubber } from '@/ui/TimeScrubber';

// The standard timer, as parts: a music app's now-playing page, always dark,
// washed at the top in the subject's color. It opens from the study bar. On
// top, what you're studying; under it the time and the two rulers (hours
// above, minutes below) that set it — drag or fling either; then the subjects
// you study, each ready to start; at the bottom スタート (or pause) and, once
// under way, slide to record, which pauses the clock and opens the record
// page. By default the readout counts up (the time that gets recorded) and the
// rulers set the 目安; in 目安 mode it counts down. A theme's timer falls back
// to these for any part it doesn't draw.
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
/** Where the standard drawing puts its parts: the subjects sit low, above the button, and fill the room left. */
export const STANDARD_ZONES = (): Zones => ({ head: ['top', 'subject'], center: ['readout', 'progress', 'today'], foot: ['switcher', 'main', 'record'] });

export function StandardTimerPage({ zones }: { zones: Record<Zone, ReactNode> }) {
  useT(); // the timer's color follows the theme
  const insets = useSafeAreaInsets();
  return (
    <Screen bg={focus.bg} style={{ paddingBottom: insets.bottom + 12 }}>
      <StatusBar style="light" />
      <Wash />
      {zones.head}
      <View style={{ paddingTop: 14 }}>{zones.center}</View>
      <View style={{ flex: 1, minHeight: 0 }}>{zones.foot}</View>
    </Screen>
  );
}

/** The subject's color, washed over the top and gone before the rulers (their edges fade into the plain background). */
function Wash() {
  const c = useSession().subject.c;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="wash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c} stopOpacity={0.5} />
            <Stop offset="0.2" stopColor={c} stopOpacity={0.16} />
            <Stop offset="0.3" stopColor={c} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#wash)" />
      </Svg>
    </View>
  );
}

// ---------- parts ----------
export const closeTimer = () => (router.canGoBack() ? router.back() : router.replace('/'));
/** The grabber and a way down, back to the study bar. */
function Top() {
  return (
    <View style={{ height: 40, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
      <Press onPress={closeTimer} scale={0.86} accessibilityLabel="閉じる" hitSlop={6}
        style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ transform: [{ rotate: '-90deg' }] }}>
          <Icon name="back" size={22} color={focus.ink2} />
        </View>
      </Press>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Press onPress={closeTimer} hitSlop={12} accessibilityLabel="小さくする" style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)' }} />
      </View>
      <View style={{ width: 40 }} />
    </View>
  );
}

/** What you're studying, first: its tile, its name, the task. */
function Subject() {
  const ss = useSession();
  const state = ss.running ? (ss.paused ? '一時停止中' : '勉強中') : 'これから';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8 }} accessible accessibilityLabel={`${state} ${ss.subject.name} ${ss.task}`}>
      <View style={{ borderRadius: 14, boxShadow: '0px 8px 20px rgba(0,0,0,0.3)' }}>
        <SubjTile name={ss.subject.name} color={ss.subject.c} size={60} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {ss.running ? <LiveDot size={5} color={ss.paused ? '#F2B705' : undefined} /> : null}
          <Txt size={11.5} w="600" color={focus.ink2}>{state}</Txt>
        </View>
        <Txt size={24} w="800" lh={30} color={focus.ink} numberOfLines={1}>{ss.subject.name}</Txt>
        <Txt size={13} color={focus.ink2} numberOfLines={1}>{ss.task}</Txt>
      </View>
    </View>
  );
}

/**
 * The subjects you study (設定 › 科目と色), each with today's time and スタート.
 * Before a session, a tap picks one and スタート starts it; in the first minute
 * you can still switch; after that, record first (as everywhere).
 */
function Switcher() {
  const ss = useSession();
  const subjects = useSubjects();
  const parts = useToday().parts;
  const locked = ss.running && !ss.canSwitch;
  const start = (id: string) => {
    if (!ss.running) { startStudy(id); haptic.firm(); return; }
    session.switchTo(id);
  };
  return (
    <View style={{ flex: 1, minHeight: 120, marginTop: 16 }}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 6 }}>
        <Txt size={15} w="700" color={focus.ink}>科目</Txt>
        <Txt size={11.5} color={focus.ink3}>
          {!ss.running ? 'タップで選ぶ · スタートですぐ始まる' : locked ? '記録すると、ほかの科目を始められます' : 'はじめの1分は、ほかの科目に切り替えられます'}
        </Txt>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}>
        {subjects.map((x) => {
          const on = x.id === ss.subject.id;
          const min = parts.find((p) => p.id === x.id)?.min ?? 0;
          const live = on && ss.running;
          return (
            <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingRight: 8, backgroundColor: on ? focus.raise : 'transparent' }}>
              <Press onPress={() => session.switchTo(x.id)} scale={0.98} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${x.name} 今日${jpHm(min)}`}
                style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingLeft: 8 }}>
                <SubjTile name={x.name} color={x.c} size={40} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt size={14.5} w="700" lh={19} color={focus.ink} numberOfLines={1}>{x.name}</Txt>
                  {x.task ? <Txt size={11.5} lh={15} color={focus.ink2} numberOfLines={1}>{x.task}</Txt> : null}
                </View>
                <Txt num size={11.5} color={focus.ink3}>{min ? `今日 ${jpHm(min)}` : '今日 まだ'}</Txt>
              </Press>
              {live ? (
                <View style={{ width: 72, height: 32, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 }}>
                  <LiveDot size={5} color={ss.paused ? '#F2B705' : undefined} />
                  <Txt size={11.5} w="700" color={focus.ink}>{ss.paused ? '停止中' : '勉強中'}</Txt>
                </View>
              ) : (
                <Press onPress={() => start(x.id)} haptics={false} scale={0.92} hitSlop={4} accessibilityLabel={`${x.name}をスタート`}
                  style={{ width: 72, height: 32, borderRadius: 16, backgroundColor: locked ? 'transparent' : 'rgba(255,255,255,0.14)', borderWidth: locked ? 1 : 0, borderColor: focus.line,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <Icon name="play" size={10} color={locked ? focus.ink3 : focus.ink} filled />
                  <Txt size={12.5} w="700" color={locked ? focus.ink3 : focus.ink}>スタート</Txt>
                </Press>
              )}
            </View>
          );
        })}
      </ScrollView>
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
  const sec = up ? (ss.running ? ss.elapsed : ss.target) : ss.over ? -rem : ss.running ? rem : ss.target;
  const over = !up && ss.over;
  const side = up ? (ss.running ? '勉強した時間' : 'に集中') : ss.over ? '超過' : ss.running ? '残り' : 'に集中';
  const moving = p.h !== null || p.m !== null;
  const set = Math.min(300, (p.h ?? left.h) * 60 + (p.m ?? Math.floor(left.m))) * 60;
  const shown = moving ? (up && ss.running ? ss.elapsed + set : set) : sec;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, opacity: ss.paused && !moving ? 0.5 : 1 }}
      accessible accessibilityLabel={`${side} ${fmt(shown)}`}>
      {over && !moving ? <Txt num size={38} w="500" color={focus.green} style={{ marginBottom: 6 }}>+</Txt> : null}
      <Rolling value={fmt(shown)} size={56} weight="600" color={over && !moving ? focus.green : focus.ink} />
      <Txt size={13} w="600" color={over && !moving ? focus.green : focus.ink2} style={{ marginBottom: 10 }}>{moving ? (up && ss.running ? 'を目安に' : 'に設定') : side}</Txt>
    </View>
  );
}

/** The two rulers that set the time (in 目安 mode, the time left; counting up, the 目安), under a line that says where things stand. */
function Progress() {
  const ss = useSession();
  const left = useLeft();
  const targetMin = ss.target / 60;
  const up = ss.mode === 'up';
  const caption = ss.paused ? '一時停止中'
    : up ? (ss.running ? (ss.over ? `目安の${Math.round(targetMin)}分をこえました` : `目安 ${Math.round(targetMin)}分まで あと ${fmt(ss.remaining)}`) : '目盛りを横にずらして、集中する時間を決めます')
    : ss.running ? `勉強した時間 ${fmt(ss.elapsed)}` : '目盛りを動かして、集中する時間を決めます';
  return (
    <>
      <Txt size={11.5} color={focus.ink3} style={{ textAlign: 'center', marginTop: 2 }}>{caption}</Txt>
      <View style={{ marginTop: up ? 14 : 22, marginHorizontal: 20, gap: 4 }}>
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

/** スタート, then pause and resume: one wide button under the subjects. */
function Main() {
  const running = useStore((s) => s.running);
  const paused = useStore((s) => s.paused);
  const playing = running && !paused;
  const press = () => {
    haptic.firm();
    if (!running) startStudy();
    else togglePause();
  };
  const label = playing ? '一時停止' : running ? '再開' : 'スタート';
  return (
    <View style={{ marginTop: 10, marginHorizontal: 24 }}>
      <Press onPress={press} haptics={false} scale={0.96} accessibilityLabel={label}
        style={{ height: 56, borderRadius: 28, backgroundColor: playing ? focus.raise : focus.ink, borderWidth: playing ? 1 : 0, borderColor: focus.line,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
        <Icon name={playing ? 'pause' : 'play'} size={18} color={playing ? focus.ink : focus.bg} filled />
        <Txt size={17} w="800" color={playing ? focus.ink : focus.bg}>{label}</Txt>
      </Press>
    </View>
  );
}

/** Slide to record, once under way: stop the clock where it is and fill in the record page. */
function Record() {
  const running = useStore((s) => s.running);
  if (!running) return null;
  return (
    <View style={{ marginHorizontal: 24, marginTop: 12 }}>
      <SlideToRecord onDone={session.finish} />
    </View>
  );
}

/** The standard drawing of every timer part. */
export const STANDARD_PARTS: Record<TimerPart, ComponentType> = {
  top: Top, subject: Subject, switcher: Switcher, readout: Readout, progress: Progress, today: Today, main: Main, record: Record,
};
