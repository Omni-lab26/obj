import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ComponentType, ReactNode, useEffect, useState, useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg';

import { hm, pad } from '@/data';
import { TimerPart, Zone, Zones } from '@/screens/layout';
import { jpHm, session, useSession, useToday } from '@/screens/model';
import { type ClockFace, elapsedOf, getState, setClockFace, setTarget, startStudy, togglePause, useStore, useSubjects } from '@/store';
import { focus, useT } from '@/theme';
import { setRevealing } from '@/ui/backdrop/live';
import { haptic, Press, SubjTile, Txt } from '@/ui/base';
import { Screen } from '@/ui/Chrome';
import { LiveDot } from '@/ui/GroupParts';
import { Icon } from '@/ui/Icon';
import { Rolling } from '@/ui/Rolling';
import { SlideToRecord } from '@/ui/SlideToRecord';
import { TimeScrubber } from '@/ui/TimeScrubber';

// The standard timer, as parts: a music app's now-playing page, always dark,
// washed at the top in the subject's color. It only measures: the time you've
// studied, big in the middle (tap it for another face: digits, hands, flip
// cards). Started from the timetable, a line under it fills in green toward the
// block's length and turns red past it. At the bottom, pause and 記録する,
// which stops the clock and opens the memo. Before a session, the subjects you
// study, each ready to start. A theme's timer falls back to these for any part
// it doesn't draw.
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
export const STANDARD_ZONES = (): Zones => ({ head: ['top', 'subject'], center: ['readout', 'today'], foot: ['switcher', 'progress', 'main', 'record'] });

export function StandardTimerPage({ zones }: { zones: Record<Zone, ReactNode> }) {
  return <TimerFrame zones={zones} wash={<Wash />} />;
}

/**
 * The timer's page, made like Apple Music's player: it comes up from the
 * bottom over the app (the screen it was opened from stays under it, dimmed),
 * and pulled down — by its bar, or anywhere — it follows the finger with
 * round corners, the app showing behind; let go far or fast enough and it
 * slides away into the study bar, else it springs back. Always dark, a color
 * wash behind.
 */
export function TimerFrame({ zones, wash, light, over }: {
  zones: Record<Zone, ReactNode>; wash: ReactNode; /** a light page (dark status bar) */ light?: boolean; /** drawn over the zones */ over?: ReactNode;
}) {
  useT(); // the timer's color follows the theme
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const y = useSharedValue(height); // starts below the screen and comes up
  // pulled down (or going), the page under it draws its 背景 again (live.ts)
  useEffect(() => () => { setRevealing(false); }, []);
  const [pull] = useState(() => Gesture.Pan().activeOffsetY(12).failOffsetX([-20, 20])
    .onStart(() => { scheduleOnRN(setRevealing, true); })
    .onUpdate((e) => { y.set(Math.max(0, e.translationY)); })
    .onEnd((e) => {
      if (e.translationY > 140 || e.velocityY > 900) {
        y.set(withTiming(height, { duration: 240, easing: Easing.out(Easing.quad) }, (done) => { if (done) scheduleOnRN(left); }));
      } else y.set(withSpring(0, { duration: 380, dampingRatio: 0.86 }, (done) => { if (done) scheduleOnRN(setRevealing, false); }));
    }));
  useEffect(() => {
    y.set(withSpring(0, { duration: 520, dampingRatio: 0.92 }));
    const out = () => {
      setRevealing(true);
      y.set(withTiming(height, { duration: 300, easing: Easing.in(Easing.cubic) }, (done) => { if (done) scheduleOnRN(left); }));
    };
    leave = out;
    return () => { if (leave === out) leave = null; };
  }, [y, height]);
  const sheet = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    borderRadius: interpolate(y.value, [0, 30], [0, 44], Extrapolation.CLAMP),
  }));
  const dim = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, height], [0.45, 0], Extrapolation.CLAMP) }));
  return (
    <View style={{ flex: 1 }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, dim]} />
      <GestureDetector gesture={pull}>
        <Animated.View style={[{ flex: 1, overflow: 'hidden' }, sheet]}>
          <Screen bg={focus.bg} style={{ paddingBottom: insets.bottom + 12 }}>
            <StatusBar style={light ? 'dark' : 'light'} />
            {wash}
            {zones.head}
            {/* the zones let touches through where they draw nothing (to a background that takes them) */}
            <View pointerEvents="box-none" style={{ flex: 1, minHeight: 0, justifyContent: 'center' }}>{zones.center}</View>
            <View pointerEvents="box-none">{zones.foot}</View>
            {over}
          </Screen>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/** The subject's color over the whole page: strong at the top, still there at the bottom, so the page reads bright, not black. */
function Wash() {
  const c = useSession().subject.c;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="wash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c} stopOpacity={0.82} />
            <Stop offset="0.45" stopColor={c} stopOpacity={0.5} />
            <Stop offset="1" stopColor={c} stopOpacity={0.3} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#wash)" />
      </Svg>
    </View>
  );
}

// ---------- parts ----------
/** The open timer's way out (slide down, then leave), while one is open. */
let leave: (() => void) | null = null;
/** What to do once the timer has gone (e.g. open the study tab). */
let afterLeave: (() => void) | undefined;
function left() {
  if (router.canGoBack()) router.back(); else router.replace('/');
  const then = afterLeave;
  afterLeave = undefined;
  if (then) setTimeout(then, 30);
}
/** Slides the timer down into the study bar, then `after` (a press handler's event is ignored). */
export function closeTimer(after?: unknown) {
  afterLeave = typeof after === 'function' ? (after as () => void) : undefined;
  if (leave) leave(); else left();
}
/** A way down (back to the study bar), where things stand, and the button for another clock face. */
function Top() {
  const ss = useSession();
  const face = useStore((x) => x.clockFace);
  const state = ss.running ? (ss.paused ? '一時停止中' : '勉強中') : 'これから';
  return (
    <View>
    {/* the bar on top: pull it down to make the timer small again */}
    <Press onPress={closeTimer} hitSlop={12} accessibilityLabel="小さくする（下にスライドでも）" style={{ alignSelf: 'center', marginTop: 6, width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' }} />
    <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
      <Press onPress={closeTimer} scale={0.86} accessibilityLabel="小さくする" hitSlop={6}
        style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <View style={{ transform: [{ rotate: '-90deg' }] }}>
          <Icon name="back" size={18} color={focus.ink2} />
        </View>
      </Press>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {ss.running ? <LiveDot size={5} color={ss.paused ? '#F2B705' : undefined} /> : null}
        <Txt size={12} w="700" color={focus.ink2}>{state}</Txt>
      </View>
      <Press onPress={nextFace} scale={0.86} accessibilityLabel={`文字盤を変える（いまは${FACE_NAME[face]}）`} hitSlop={6}
        style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <Icon name="clock" size={17} color={focus.ink2} />
      </Press>
    </View>
    </View>
  );
}

/** What you're studying: its tile, its name, the task. */
function Subject() {
  const ss = useSession();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8 }} accessible accessibilityLabel={`${ss.subject.name} ${ss.task}`}>
      <View style={{ borderRadius: 14, boxShadow: '0px 8px 20px rgba(0,0,0,0.3)' }}>
        <SubjTile name={ss.subject.name} color={ss.subject.c} size={56} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={22} w="800" lh={28} color={focus.ink} numberOfLines={1}>{ss.subject.name}</Txt>
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
  if (ss.running) return null; // under way, the page is just the clock
  const start = (id: string) => {
    if (!ss.running) { startStudy(id); haptic.firm(); return; }
    session.switchTo(id);
  };
  return (
    <View style={{ maxHeight: 280, marginTop: 4 }}>
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

const FACES: ClockFace[] = ['digital', 'analog', 'flip'];
const FACE_NAME: Record<ClockFace, string> = { digital: 'デジタル', analog: '針', flip: 'めくり' };
const nextFace = () => { haptic.tap(); const f = getState().clockFace; setClockFace(FACES[(FACES.indexOf(f) + 1) % FACES.length]); };

/** The time studied, big: as digits, a clock with hands, or flip cards. Tap it for the next face. */
function Readout() {
  const ss = useSession();
  const face = useStore((x) => x.clockFace);
  const sec = ss.running ? ss.elapsed : 0;
  const v = Math.max(0, Math.floor(sec));
  const h = Math.floor(v / 3600), m = Math.floor(v / 60) % 60, x = v % 60;
  return (
    <Press onPress={nextFace} haptics={false} scale={0.98} accessibilityLabel={`勉強した時間 ${fmt(sec)}。押すと文字盤が変わります`}
      style={{ alignItems: 'center', gap: 10, opacity: ss.paused ? 0.55 : 1 }}>
      {face === 'analog' ? <Hands sec={v} color={ss.subject.c} /> : face === 'flip' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {h ? <><Card2 text={String(h)} narrow /><Txt num size={40} w="700" color={focus.ink3}>:</Txt></> : null}
          <Card2 text={pad(m)} />
          <Txt num size={40} w="700" color={focus.ink3}>:</Txt>
          <Card2 text={pad(x)} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <Rolling value={h ? `${h}:${pad(m)}` : pad(m)} size={80} weight="600" color={focus.ink} />
          <Txt num size={38} w="600" lh={46} color={focus.ink3}>{`:${pad(x)}`}</Txt>
        </View>
      )}
      {face === 'analog' ? <Txt num size={20} w="700" color={focus.ink}>{fmt(sec)}</Txt> : null}
      <Txt size={11} color={focus.ink3}>{`押すと文字盤が変わります（${FACE_NAME[face]}）`}</Txt>
    </Press>
  );
}
/** One flip card. */
function Card2({ text, narrow }: { text: string; narrow?: boolean }) {
  return (
    <View style={{ width: narrow ? 64 : 100, height: 120, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 8px 18px rgba(0,0,0,0.35)' }}>
      <Txt num size={70} w="700" lh={80} color={focus.ink}>{text}</Txt>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 59, height: 2, backgroundColor: focus.bg }} />
    </View>
  );
}
/** A clock with hands: the long one goes round once an hour, the thin one (the subject's color) once a minute. */
function Hands({ sec, color }: { sec: number; color: string }) {
  const S = 220, c = S / 2;
  const at = (deg: number, r: number) => { const t = (deg * Math.PI) / 180; return { x: c + Math.sin(t) * r, y: c - Math.cos(t) * r }; };
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const big = i % 5 === 0, a = at(i * 6, big ? c - 14 : c - 9), b = at(i * 6, c - 3);
    return <Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={big ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.28)'} strokeWidth={big ? 3 : 1.5} strokeLinecap="round" />;
  });
  const mm = at(((sec / 60) % 60) * 6, c - 36), ss = at((sec % 60) * 6, c - 16), tail = at((sec % 60) * 6 + 180, 16);
  return (
    <Svg width={S} height={S} accessible={false}>
      <Circle cx={c} cy={c} r={c - 1} fill="rgba(255,255,255,0.06)" />
      {ticks}
      <Line x1={c} y1={c} x2={mm.x} y2={mm.y} stroke="#fff" strokeWidth={6} strokeLinecap="round" />
      <Line x1={tail.x} y1={tail.y} x2={ss.x} y2={ss.y} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={c} cy={c} r={6} fill="#fff" />
    </Svg>
  );
}

/**
 * Started from the timetable: a plain line that fills in green toward the
 * next plan's start and turns all red once past it (the time keeps running
 * until you stop). Just measuring, there's no line — only today's total.
 */
function Progress() {
  const ss = useSession();
  const today = useStore((s) => s.todayMin);
  if (!ss.running || !ss.plan) {
    return <Txt size={12} color={focus.ink3} style={{ textAlign: 'center', marginHorizontal: 20, marginBottom: 14 }}>{`今日 ${hm(today)}`}</Txt>;
  }
  const over = ss.elapsed > ss.plan;
  const f = Math.min(1, ss.elapsed / ss.plan);
  const label = ss.next ? `次の${ss.next.subject.name}（${ss.next.at}）` : `予定 ${Math.round(ss.plan / 60)}分`;
  const col = over ? OVER : WITHIN;
  return (
    <View style={{ marginHorizontal: 20, marginBottom: 16, gap: 8 }} accessible accessibilityRole="progressbar"
      accessibilityLabel={`${label}${over ? `を${fmt(ss.elapsed - ss.plan)}こえて続けています` : `まで あと${fmt(ss.plan - ss.elapsed)}`}`}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Txt size={12} color={focus.ink2} style={{ flex: 1 }} numberOfLines={1}>{label}</Txt>
        <Txt num size={13} w="700" color={col}>{over ? `+${fmt(ss.elapsed - ss.plan)}` : `あと ${fmt(ss.plan - ss.elapsed)}`}</Txt>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.16)', overflow: 'hidden' }}>
        <View style={{ width: `${f * 100}%`, height: '100%', borderRadius: 2, backgroundColor: col }} />
      </View>
    </View>
  );
}
const WITHIN = '#30D158';
const OVER = '#FF453A';

/** The two rulers that set the time (in 目安 mode, the time left; counting up, the 目安). The standard timer only measures now; a theme can still use these. */
export function Rulers() {
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

/** Before a session, スタート; under way, pause (or resume) and 記録する, which stops the clock and opens the memo. */
function Main() {
  const running = useStore((s) => s.running);
  const paused = useStore((s) => s.paused);
  if (!running) {
    return (
      <View style={{ marginTop: 10, marginHorizontal: 24 }}>
        <Press onPress={() => { haptic.firm(); startStudy(); }} haptics={false} scale={0.96} accessibilityLabel="スタート"
          style={{ height: 58, borderRadius: 29, backgroundColor: focus.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
          <Icon name="play" size={18} color={focus.bg} filled />
          <Txt size={17} w="800" color={focus.bg}>スタート</Txt>
        </Press>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 20 }}>
      <Press onPress={() => { haptic.soft(); togglePause(); }} haptics={false} scale={0.92} accessibilityLabel={paused ? '再開' : '一時停止'}
        style={{ width: 62, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={paused ? 'play' : 'pause'} size={20} color={focus.ink} filled />
      </Press>
      <Press onPress={session.finish} scale={0.96} accessibilityLabel="終わる（記録する）"
        style={{ flex: 1, height: 58, borderRadius: 29, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <Txt size={17} w="800" color={focus.bg}>終わる</Txt>
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
