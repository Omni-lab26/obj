import { router } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { subj } from '@/data';
import { clock, go, jpHm, useNext, useTicking } from '@/screens/model';
import { SwipeToRecord } from '@/screens/StudyBar';
import type { TabBarProps, TabItem } from '@/themes/types';
import { elapsedOf, startFree, startFrom, togglePause, useStore } from '@/store';
import { haptic } from '@/ui/base';
import { STUDY_BAR_H, studyBarBottom, TAB_BAR_H, tabBarBottom } from '@/ui/Chrome';
import { micro } from '@/ui/motion';
import { TourSpot } from '@/ui/Tour';
import type { IconId } from './art';
import { floor, KD, R, ring, S } from './look';
import { J, Key, SubjSquare, useSink, useTap } from './parts';
import { Pix } from './pixel';

// スタンダード's two bars at the bottom, after the mock: opaque paper with the
// 2pt ink outline, standing on an ink floor (the whole bar is something you
// press). The tab you're on sits on a lime plate; the middle tab is 勉強, the
// same shape as the others. The study bar is the timetable's next plan with
// ▶ 勉強を開始 in lime, or the session: its subject, the time, the plan, and a
// line toward the plan's end in the study green (crimson words when paused).
// It keeps everything the standard bar does: tap for the timer, ❚❚ / ▶, pull
// it down to stop and record.

const ICON: Record<string, IconId> = { index: 'home', timeline: 'feed', study: 'clock', community: 'people', me: 'person' };

// ---------- the tab bar ----------
export function TabBar({ items, running, paused, mins, insets }: TabBarProps) {
  return (
    <>
    {/* under the bar's floor, paper: what scrolls under the bars doesn't show below them */}
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: tabBarBottom(insets.bottom) + 2, backgroundImage: `linear-gradient(to bottom, rgba(243,238,227,0), ${S.paper} 8px)` }} />
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarBottom(insets.bottom), paddingHorizontal: 16 }}>
      <View accessibilityRole="tablist" style={{ height: TAB_BAR_H, borderRadius: R.bar, backgroundColor: S.card, boxShadow: `${ring()}, ${floor()}`, flexDirection: 'row', paddingHorizontal: 4 }}>
        {items.map((it) => (
          <TourSpot key={it.key} id={`tab-${it.name}`} style={{ flex: 1 }}>
            <Tab it={it} pip={it.center && running && !it.focused} paused={paused}
              label={it.center ? (running ? `${it.label} · 勉強中 ${mins}分` : `${it.label}（時間割・ToDo・タイマー）`) : it.label} />
          </TourSpot>
        ))}
      </View>
    </View>
    </>
  );
}

/** One tab: its icon on a plate that turns lime (fading, 0.2s) when it's the one you're on; pressed, the plate sinks 2. */
function Tab({ it, pip, paused, label }: { it: TabItem; pip: boolean; paused: boolean; label: string }) {
  const s = useSink(2);
  const tap = useTap(() => { haptic.tap(); it.onPress(); }, s.down);
  const on = useSharedValue(it.focused ? 1 : 0);
  useEffect(() => { on.set(micro(it.focused ? 1 : 0)); }, [it.focused, on]);
  const lit = useAnimatedStyle(() => ({ opacity: on.value }));
  return (
    <Pressable onPress={tap.onPress} onPressIn={tap.onPressIn} onPressOut={s.up}
      accessibilityRole="tab" accessibilityState={{ selected: it.focused }} accessibilityLabel={label}
      style={{ flex: 1, height: TAB_BAR_H, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ width: 54, height: 40, alignItems: 'center', justifyContent: 'center' }, s.style]}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: R.key, backgroundColor: S.lime, boxShadow: ring() }, lit]} />
        {/* above the plate (on the web a positioned plate would otherwise cover it) */}
        <View style={{ zIndex: 1 }}><Pix name={ICON[it.name] ?? 'home'} color={it.focused ? S.ink : S.ink3} /></View>
        {/* the middle tab while studying, seen from another tab: a green square (crimson when paused) */}
        {pip ? <View pointerEvents="none" style={{ position: 'absolute', top: 5, right: 10, width: 8, height: 8, backgroundColor: paused ? S.pause : S.run, boxShadow: ring(1.5) }} /> : null}
      </Animated.View>
    </Pressable>
  );
}

// ---------- the study bar ----------
export function StudyBar({ insets }: { insets: EdgeInsets }) {
  const running = useStore((s) => s.running);
  return running ? <Running insets={insets} /> : <Plan insets={insets} />;
}

/** Where the bar sits: the standard place, 2 higher so its floor clears the tab bar's outline. */
function Place({ insets, children }: { insets: EdgeInsets; children: ReactNode }) {
  return <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: studyBarBottom(insets.bottom) + 2, paddingHorizontal: 16 }}>{children}</View>;
}
/**
 * The bar: an ink floor, and the face on it (paper, the outline). The main part
 * — tap for the timer — sinks the whole face; the bar's own buttons answer by themselves.
 */
function Shell({ children, sink }: { children: ReactNode; sink: ReturnType<typeof useSink>['style'] }) {
  return (
    <View style={{ height: STUDY_BAR_H }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: -2, right: -2, top: KD - 2, bottom: -KD - 2, borderRadius: R.bar + 2, backgroundColor: S.ink }} />
      <Animated.View style={[{ flex: 1, borderRadius: R.bar, backgroundColor: S.card, boxShadow: ring(), flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 8 }, sink]}>
        {children}
      </Animated.View>
    </View>
  );
}
/** The bar's main part: what's on it, and tap for the timer. */
function Main({ label, sink, children }: { label: string; sink: ReturnType<typeof useSink>; children: ReactNode }) {
  // pulled down (to stop and record), it isn't a tap: the timer doesn't open under the question
  const tap = useTap(() => { haptic.tap(); go.timer(); }, sink.down);
  return (
    <Pressable onPress={tap.onPress} onPressIn={tap.onPressIn} onPressOut={sink.up} accessibilityRole="button" accessibilityLabel={label}
      style={{ flex: 1, minWidth: 0, height: STUDY_BAR_H, flexDirection: 'row', alignItems: 'center', gap: 11 }}>
      {children}
    </Pressable>
  );
}

/**
 * Not studying: the plan whose time has come (or the next one, half strength)
 * and 勉強を開始 — that plan, or with none left today, 自習 at once.
 */
function Plan({ insets }: { insets: EdgeInsets }) {
  const pick = useNext();
  const blocks = useStore((s) => s.timetable);
  const sink = useSink(KD - 1);
  const now = pick.from === 'now';
  const timed = now || pick.from === 'next';
  const sj = subj(pick.s);
  const b = pick.blockId ? blocks.find((x) => x.id === pick.blockId) : undefined;
  const when = now ? (pick.end ? `いま · ${pick.start}–${pick.end}` : `いま · ${pick.start}から`)
    : timed ? `次 · ${pick.start}から${pick.inMin && pick.inMin > 0 && pick.inMin < 90 ? `（あと${pick.inMin}分）` : ''}` : '';
  const begin = () => {
    // the plan the bar shows (its time come, or the next one started early): that one
    haptic.firm();
    if (timed) { startFrom({ s: pick.s, min: pick.min, next: pick.next, blockId: pick.blockId }); return; }
    // no plan left today: 自習 at once, straight to the timer
    startFree();
    router.push('/timer');
  };
  return (
    <Place insets={insets}>
      <Shell sink={sink.style}>
        <Main sink={sink} label={timed ? `${when} ${sj.name} ${b?.t ?? ''}。タイマーを開く` : '今日の時間割。タイマーを開く'}>
          {timed ? <SubjSquare name={sj.name} color={sj.c} area={sj.area} next={!now} /> : <SubjSquare none />}
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <J size={15} w="700" lh={19} numberOfLines={1}>{timed ? (now ? (b?.t ?? sj.name) : `${sj.name}${b?.t ? ` · ${b.t}` : ''}`) : '今日の時間割'}</J>
            <J size={12} w="500" lh={16} num color={now ? S.ink2 : S.ink3} numberOfLines={1}>{timed ? (now && b?.note ? `${when} · ${b.note}` : when) : 'このあとの予定はありません'}</J>
          </View>
        </Main>
        <TourSpot id="start" style={{ marginRight: 2 }}>
          <Key label={timed ? `${sj.name}の勉強を開始` : '勉強を開始（自習）'} onPress={begin} haptics={false} fill={S.lime} kd={3} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            style={{ height: 32 }} face={{ paddingLeft: 11, paddingRight: 12, gap: 6 }}>
            <Pix name="play" />
            <J size={13} w="700" lh={16}>勉強を開始</J>
          </Key>
        </TourSpot>
      </Shell>
    </Place>
  );
}

/** While studying: only the time and its line redraw every second (BarTime, BarLine). Pull it down to stop and record. */
function Running({ insets }: { insets: EdgeInsets }) {
  const subject = subj(useStore((s) => s.subj));
  const paused = useStore((s) => s.paused);
  const plan = useStore((s) => (s.planMin ? Math.round(s.planMin * 60) : null));
  const next = useStore((s) => (s.planMin && s.planNext ? `次 ${subj(s.planNext.s).name} ${s.planNext.at}` : null));
  const sink = useSink(KD - 1);
  const rest = next ? ` · ${next}` : plan ? ` · 予定 ${jpHm(plan / 60)}` : '';
  return (
    <Place insets={insets}>
      <TourSpot id="bar">
        <SwipeToRecord>
          <Shell sink={sink.style}>
            <Main sink={sink} label={`${subject.name}を${paused ? '一時停止中' : '勉強中'}${rest}。タイマーを開く`}>
              <SubjSquare name={subject.name} color={subject.c} area={subject.area} live paused={paused} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <J size={15} w="700" lh={19} color={paused ? S.pause : S.ink} numberOfLines={1}>{subject.name}</J>
                <BarTime color={paused ? S.pause : S.ink3} rest={rest} />
              </View>
            </Main>
            <PauseBtn paused={paused} />
            {plan ? <BarLine plan={plan} paused={paused} /> : null}
          </Shell>
        </SwipeToRecord>
      </TourSpot>
    </Place>
  );
}
/** The time studied and what follows it: the one part of the bar that redraws every second. */
function BarTime({ color, rest }: { color: string; rest: string }) {
  const time = useTicking((s, now) => clock(elapsedOf(s, now)));
  return <J size={12} w="500" lh={16} num color={color} numberOfLines={1}>{`${time}${rest}`}</J>;
}
/** ❚❚ / ▶ inside the bar: no floor (it's on the bar); pressed, a faint ground. */
function PauseBtn({ paused }: { paused: boolean }) {
  const g = useSharedValue(0);
  const ground = useAnimatedStyle(() => ({ opacity: g.value }));
  const tap = useTap(() => { haptic.soft(); togglePause(); }, () => g.set(micro(1)));
  return (
    <Pressable onPress={tap.onPress} onPressIn={tap.onPressIn} onPressOut={() => g.set(micro(0))}
      accessibilityRole="button" accessibilityLabel={paused ? '再開' : '一時停止'} hitSlop={6}
      style={{ width: 44, height: 44, marginRight: 2, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 12, backgroundColor: 'rgba(23,18,31,0.08)' }, ground]} />
      <Pix name={paused ? 'play' : 'pause'} />
    </Pressable>
  );
}
/** How far toward the plan's end: green inside it, orange past it, grey while paused — slid under its window, not resized (MOTION.md). */
function BarLine({ plan, paused }: { plan: number; paused: boolean }) {
  const done = useTicking((s, now) => Math.round(Math.min(1, elapsedOf(s, now) / plan) * 1000) / 1000);
  const over = useTicking((s, now) => elapsedOf(s, now) > plan);
  const [w, setW] = useState(0);
  return (
    <View pointerEvents="none" onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ position: 'absolute', left: 14, right: 14, bottom: 5, height: 3, borderRadius: 2, backgroundColor: 'rgba(23,18,31,0.10)', overflow: 'hidden', opacity: w ? 1 : 0 }}>
      <View style={{ width: '100%', height: '100%', backgroundColor: paused ? S.ink3 : over ? S.over : S.run, transform: [{ translateX: -(1 - done) * w }] }} />
    </View>
  );
}
