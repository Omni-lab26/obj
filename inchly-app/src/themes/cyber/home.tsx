import { ReactNode, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Defs, Line, Path, Pattern, Polygon, Polyline, Rect } from 'react-native-svg';

import { allSubjects, areaTone, FREE, guessArea, pad, subj } from '@/data';
import { Friends, type FriendsLook } from '@/screens/home/Friends';
import { go, type Friend, useDeadlines, usePeers, useTicking, useToday, useWeekStreak } from '@/screens/model';
import type { HomeKit, SectionProps } from '@/themes/types';
import { elapsedOf, useDmUnread, useLevel, useNow, useStore, useStreak } from '@/store';
import { T } from '@/themes/kit';
import { haptic, Press } from '@/ui/base';
import { Screen, useTabPad, useUnread } from '@/ui/Chrome';
import { replayCharts } from '@/ui/appear';
import { useGrowth } from '@/ui/Growth';
import { Heatmap } from '@/ui/Heatmap';
import { levelSheet } from '@/ui/Level';
import { RefreshScroll } from '@/ui/Loader';
import { flicker } from '@/ui/motion';
import { CIcon } from './icons';
import { C, glow, patternOf } from './look';
import { Avatar, Barcode, type Cell, Cells, Cut, D, Head, Ib, J, Mono, Panel, Plate, useSize } from './parts';
import { plateOf } from './sign';

// サイバー's home, after its parts bible, on the standard layout (the same
// sections in the same places): the yellow band at the top with the ink
// topbar and the system line; the days studied as an LED matrix; the streak
// as UPTIME, with an orange tube flame and tickets; friends studying as a
// crew panel with scope lines; today as a yellow device with a black window;
// the badges as IC chips, and an omamori.

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
/** '1h29' — totals read as hours and minutes; under an hour, '45分'. */
function Dur({ m, size, color = C.t1, med }: { m: number; size: number; color?: string; med?: boolean }) {
  const r = Math.max(0, Math.round(m));
  if (r < 60) return <T f={med ? 'chakraMed' : 'chakra'} size={size} color={color} lh={Math.round(size * 1.15)}>{`${r}`}<T size={Math.max(11, size * 0.6)} w="700" color={color}>分</T></T>;
  return <T f={med ? 'chakraMed' : 'chakra'} size={size} color={color} lh={Math.round(size * 1.15)}>{`${Math.floor(r / 60)}`}<T f="chakra" size={Math.max(9, size * 0.58)} color={color}>h</T>{pad(r % 60)}</T>;
}

// ---------- page, header ----------
function Page({ header, children }: { header: ReactNode; children: ReactNode }) {
  const tabPad = useTabPad();
  return (
    <Screen>
      {header}
      <RefreshScroll onRefresh={replayCharts} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: tabPad, gap: 12 }}>
        {children}
      </RefreshScroll>
    </Screen>
  );
}

/** The yellow band: the topbar in ink, and the system line (the date and time, how many study now, the streak). Its bottom edge steps down in the middle. */
function Header() {
  const unread = useUnread();
  const dm = useDmUnread();
  const l = useLevel();
  const now = useNow(60_000);
  const streak = useStreak();
  const { count } = usePeers();
  const [s, onLayout] = useSize();
  const d = new Date(now);
  return (
    <View onLayout={onLayout} style={{ paddingTop: 8, paddingHorizontal: 14, paddingBottom: 22, gap: 8 }}>
      {s ? <Band w={s.w} h={s.h} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Brand />
        <Press onPress={levelSheet} scale={0.94} hitSlop={6} accessibilityLabel={`レベル${l.lv}`} style={{ height: 30, paddingLeft: 10, paddingRight: 9, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Cut shape="f3" k={7} fill="#000" edge={null} />
          <Mono size={9.5} color="rgba(255,255,255,0.6)" ls={0.1}>LV</Mono>
          <D size={16} color="#fff">{l.lv}</D>
        </Press>
        <View style={{ flex: 1 }} />
        <Ib name="search" label="さがす" kind="ink" onPress={go.search} />
        <Ib name="bell" label="お知らせ" kind="ink" badge={unread} onPress={go.notifications} />
        <Ib name="chat" label="メッセージ" kind="ink" badge={dm} onPress={go.messages} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6, borderTopWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(0,0,0,0.35)', overflow: 'hidden' }}
        accessible accessibilityLabel={`${count.toLocaleString()}人が勉強中。${streak}日連続`}>
        <Mono size={9.5} color="rgba(0,0,0,0.62)" ls={0.1}>INCH/OS</Mono>
        <Mono size={9.5} color="rgba(0,0,0,0.62)" ls={0.1}>{`${d.getMonth() + 1}.${pad(d.getDate())} ${DOW[d.getDay()]} `}<T f="techMono" size={9.5} color="#000">{`${d.getHours()}:${pad(d.getMinutes())}`}</T></Mono>
        <Mono size={9.5} color="rgba(0,0,0,0.62)" ls={0.1}><T f="techMono" size={9.5} color="#000">{count.toLocaleString()}</T> STUDYING</Mono>
        <Mono size={9.5} color="#000" ls={0.1}>{`UPTIME ${streak}D`}</Mono>
        <View style={{ flex: 1 }} />
        <Barcode n={16} h={9} color="#000" />
      </View>
    </View>
  );
}
/** The band itself: yellow with faint stripes and scanlines, its bottom stepping down from 38% to 74%. */
function Band({ w, h }: { w: number; h: number }) {
  const pts = `0,0 ${w},0 ${w},${h - 12} ${w * 0.74},${h - 12} ${w * 0.72},${h} ${w * 0.4},${h} ${w * 0.38},${h - 12} 0,${h - 12}`;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id="bandstripe" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><Rect x={0} y={0} width={2} height={8} fill="rgba(0,0,0,0.045)" /></Pattern>
        <Pattern id="bandscan" width={3} height={3} patternUnits="userSpaceOnUse"><Rect x={0} y={0} width={3} height={1} fill="rgba(0,0,0,0.07)" /></Pattern>
      </Defs>
      <Polygon points={pts} fill={C.y} />
      <Polygon points={pts} fill="url(#bandstripe)" />
      <Polygon points={pts} fill="url(#bandscan)" />
    </Svg>
  );
}
/** The inch ticks and the name, in ink. */
function Brand() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 7 }} accessible accessibilityRole="header" accessibilityLabel="inchly">
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginBottom: 5 }}>
        {[5.7, 8.3, 10.9, 13.4, 16].map((hh) => <View key={hh} style={{ width: 3, height: hh, backgroundColor: '#000', transform: [{ skewX: '-14deg' }] }} />)}
      </View>
      <T f="chakra" size={24} color="#000" lh={26}>inchly</T>
    </View>
  );
}

// ---------- sections ----------
/** The days studied, as an LED matrix (the standard grass: press and drag to read a day). */
function Grass() {
  const year = new Date().getFullYear();
  const days = useStore((s) => s.sessions.filter((x) => x.date.startsWith(String(year))).reduce((a, x) => a.add(x.date), new Set<string>()).size);
  return (
    <Panel style={{ gap: 9 }}>
      <Head mod="MOD.01" name="勉強した日" right={`${days}D / ${year}`} />
      <Heatmap weeks={18} gap={3} />
      <J size={11} color={C.t3}>押さえたまま指を動かすと日を読む</J>
    </Panel>
  );
}

/** UPTIME: the streak, an orange tube flame (it sways: the one repeating motion allowed, MOTION.md), the week as diamonds, and rest tickets. */
function Streak() {
  const { streak, tickets, days } = useWeekStreak();
  return (
    <Press onPress={() => haptic.soft()} haptics={false} scale={0.98} accessibilityLabel={`${streak}日連続で勉強中。休み券${tickets}枚`}
      style={{ height: 70, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 8, paddingRight: 14 }}>
      <Cut shape="f1" k={12} fill="rgba(8,16,26,0.9)" edge="rgba(255,122,0,0.75)" glow={0.35} term={['tr']}
        grad={[[0, 'rgba(255,122,0,0.15)'], [0.55, 'rgba(255,45,85,0.05)'], [1, 'rgba(8,16,26,0.9)']]} />
      <Flame lit={streak > 0} />
      <View>
        <Mono size={9.5} color={C.o} ls={0.14}>UPTIME</Mono>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <D size={34} color="#FFE3C8" style={glow(C.o, 10)}>{streak}</D>
          <J size={12} w="700" color={C.t2}>日連続</J>
        </View>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ alignItems: 'flex-end', gap: 7 }}>
        <View style={{ flexDirection: 'row', gap: 7 }}>
          {days.map((d) => (
            <View key={d.label} style={{ alignItems: 'center', gap: 4 }}>
              <J size={11} lh={12} color={d.today ? C.o : C.t3}>{d.label}</J>
              <View style={{ width: 8, height: 8, transform: [{ rotate: '45deg' }], opacity: d.future ? 0.4 : 1,
                backgroundColor: d.studied ? C.o : 'transparent', borderWidth: d.studied ? 0 : d.future ? 1 : 1.5, borderColor: C.t3,
                boxShadow: d.studied ? '0px 0px 8px rgba(255,122,0,0.9)' : undefined }} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {Array.from({ length: Math.min(tickets, 3) }, (_, i) => <Ticket key={i} />)}
          <J size={11} color={C.t2} lh={14}>{`休み券 ×${tickets}`}</J>
        </View>
      </View>
    </Press>
  );
}
/** A rest ticket: an orange stub with notched ends and a perforation. */
function Ticket() {
  return (
    <Svg width={26} height={14}>
      <Polygon points="0,0 26,0 26,4 23,7 26,10 26,14 0,14 0,10 3,7 0,4" fill={C.o} />
      <Line x1={9.5} y1={2} x2={9.5} y2={12} stroke="#000" strokeWidth={1} strokeDasharray="2 2" />
    </Svg>
  );
}
/** The flame as a neon tube: the outline in pale orange, the core lit, the glow around it; unlit, it's dark glass. It sways at its foot while lit. */
function Flame({ lit }: { lit: boolean }) {
  const sway = useSharedValue(0);
  useEffect(() => {
    if (lit) sway.set(flicker());
    else { cancelAnimation(sway); sway.set(0); }
    return () => cancelAnimation(sway);
  }, [lit, sway]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 + sway.value * 0.03 }, { scaleY: 1 - sway.value * 0.03 }] }));
  const outer = 'M24 4L33 18L36 30L30 42H18L12 30L15 20L20 26L22 14Z', inner = 'M24 22L28 31L26 38H22L20 31Z';
  return (
    <Animated.View style={[{ width: 46, height: 46, transformOrigin: '50% 90%', opacity: lit ? 1 : 0.4 }, style]}>
      <Svg width={46} height={46} viewBox="0 0 48 48" style={{ overflow: 'visible' }}>
        {lit ? [[12, 0.12], [7, 0.22], [4, 0.5]].map(([sw, o]) => <Path key={sw} d={outer} fill="none" stroke={C.o} strokeWidth={sw} strokeLinejoin="round" opacity={o} />) : null}
        <Path d={outer} fill="none" stroke={lit ? '#FFD9B0' : '#3A4A52'} strokeWidth={2.4} strokeLinejoin="round" />
        <Path d={inner} fill={lit ? '#FFF3C4' : '#3A4A52'} />
      </Svg>
    </Animated.View>
  );
}

// ---------- the crew ----------
/** Today's running total for a friend, every hour from 6:00 to now (sample people: the same shape every time, seeded by their handle). */
function climbOf(f: Friend, hour: number): number[] {
  let seed = [...f.h].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 11) % 233280;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const n = Math.max(2, hour - 6 + 1);
  const steps = Array.from({ length: n - 1 }, () => (rnd() < 0.3 ? 0 : 0.4 + rnd()));
  const sum = steps.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  return [0, ...steps.map((s) => (acc += (s / sum) * f.today))];
}
/** A friend's day as an oscilloscope trace: cyan climbing past yesterday, red behind it. */
function Scope({ f, hour, time }: { f: Friend; hour: number; time: string }) {
  const W = 64, H = 28;
  const cum = useMemo(() => climbOf(f, hour), [f, hour]);
  const up = f.diff >= 0, col = up ? C.c : C.r;
  const top = Math.max(260, f.today);
  const pts = cum.map((v, i) => `${((i * (W - 4)) / (cum.length - 1)).toFixed(1)},${(H - 2 - (v / top) * (H - 5)).toFixed(1)}`).join(' ');
  const ly = H - 2 - (cum[cum.length - 1] / top) * (H - 5);
  return (
    <View style={{ width: W, height: H, borderWidth: 1, borderColor: C.ln }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={W} height={H} style={{ position: 'absolute', left: -1, top: -1, overflow: 'visible' }}>
        {[1, 2, 3, 4].map((i) => <Line key={`v${i}`} x1={(i * W) / 5} y1={0} x2={(i * W) / 5} y2={H} stroke="rgba(0,240,255,0.10)" strokeWidth={1} />)}
        {[1, 2].map((i) => <Line key={`h${i}`} x1={0} y1={(i * H) / 3} x2={W} y2={(i * H) / 3} stroke="rgba(0,240,255,0.10)" strokeWidth={1} />)}
        <Polyline points={pts} fill="none" stroke={col} strokeWidth={3.5} opacity={0.25} />
        <Polyline points={pts} fill="none" stroke={col} strokeWidth={1.5} />
        <Rect x={W - 6} y={ly - 2} width={4} height={4} fill="#fff" />
      </Svg>
      <Mono size={7.5} ls={0.1} style={{ position: 'absolute', left: 2, top: 0 }}>{`6→${time}`}</Mono>
    </View>
  );
}
function CrewPanel({ children }: { children: ReactNode }) {
  return (
    <View style={{ paddingTop: 10, paddingBottom: 4 }}>
      <Cut shape="f1" k={12} fill={C.panel} edge={C.ln2} term={['tr', 'bl']} ticks />
      {children}
    </View>
  );
}
function CrewHead({ sort, onSort, onAll }: { sort: string; onSort: () => void; onAll: () => void }) {
  return (
    <View style={{ paddingHorizontal: 14, paddingBottom: 4 }}>
      <Head mod="MOD.03" name="勉強中の友達" right={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Press onPress={onSort} hitSlop={8} scale={0.94} accessibilityRole="button" accessibilityLabel={`並び順 ${sort}`}>
            <J size={11} w="700" color={C.y} lh={14}>{`≡ ${sort}`}</J>
          </Press>
          <Press onPress={onAll} hitSlop={8} scale={0.94} accessibilityRole="button" accessibilityLabel="もっと見る">
            <J size={11} w="700" color={C.y} lh={14}>もっと見る ›</J>
          </Press>
        </View>
      } />
    </View>
  );
}
function CrewRow({ f }: { f: Friend }) {
  const now = new Date(useNow(60_000));
  const { code, no } = plateOf({ name: f.s, area: guessArea(f.s) });
  const sc = plateColor(f.s);
  const up = f.diff >= 0;
  return (
    <>
      <Avatar name={f.n} size={40} live />
      <View style={{ flex: 1, minWidth: 0 }}>
        <J size={15} w="700" numberOfLines={1} lh={19}>{f.n}</J>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Plate code={code} no={no} color={sc} size={20} />
          <J size={11.5} color={C.t2} numberOfLines={1} style={{ flexShrink: 1 }}>{`${f.s}を勉強中`}</J>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Dur m={f.today} size={20} />
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <T f="chakraMed" size={12} color={up ? C.c : C.r}>{up ? '▲' : '▼'}</T>
          <Dur m={Math.abs(f.diff)} size={12} color={up ? C.c : C.r} med />
        </View>
      </View>
      <Scope f={f} hour={now.getHours()} time={`${now.getHours()}:${pad(now.getMinutes())}`} />
    </>
  );
}
const CREW: FriendsLook = { Panel: CrewPanel, Head: CrewHead, Row: CrewRow, ground: C.panel, line: C.ln };
const Crew = () => <Friends look={CREW} />;

// ---------- today ----------
/** Today as a yellow device with a black window: the total big, against yesterday, the day as LED cells toward the goal, by subject, and the nearest deadline. */
function Today() {
  const today = useToday();
  const deadlines = useDeadlines();
  const next = deadlines[0];
  const now = useNow(60_000);
  // the session under way, to the minute
  const liveMin = useTicking((s, at) => (s.running ? Math.floor(elapsedOf(s, at) / 60) : 0));
  const liveSubj = useStore((s) => (s.running ? s.subj : null));
  const parts = useMemo(() => {
    const done = today.parts.map((p) => ({ id: p.id, name: p.name, c: p.c, min: p.min, live: false }));
    if (liveSubj && liveMin > 0) { const sj = subj(liveSubj); done.push({ id: liveSubj, name: sj.name, c: sj.c, min: liveMin, live: true }); }
    return done;
  }, [today.parts, liveSubj, liveMin]);
  const total = today.min + liveMin;
  const span = Math.max(240, Math.ceil(Math.max(today.goal, total) / 60) * 60);
  const cells = useMemo<Cell[]>(() => {
    const runs: { p: (typeof parts)[number]; a: number; b: number }[] = [];
    let at = 0;
    for (const p of parts) { runs.push({ p, a: at, b: at + p.min }); at += p.min; }
    return Array.from({ length: 24 }, (_, i) => {
      const mid = ((i + 0.5) * span) / 24;
      const r = runs.find((x) => mid >= x.a && mid < x.b);
      if (!r) return null;
      if (r.p.id === FREE) return 'free';
      const sj = subj(r.p.id);
      return { c: r.p.c, p: patternOf({ area: sj.area, c: r.p.c }), now: r.p.live };
    });
  }, [parts, span]);
  const d = new Date(now);
  const diff = today.diff + liveMin;
  const left = today.goal - total;
  return (
    <View style={{ padding: 14, paddingTop: 13, paddingBottom: 12, gap: 9 }} accessible accessibilityLabel={`今日 ${Math.floor(total / 60)}時間${total % 60}分。昨日より${diff}分`}>
      <Cut shape="f1" k={14} fill={C.y} edge={null} />
      <Stripes />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <J size={13} w="900" color="#000" lh={17}>MOD.04 // 今日の勉強</J>
        <Mono size={10.5} color="#000" ls={0.12}>{`${d.getMonth() + 1}.${pad(d.getDate())} ${DOW[d.getDay()]} · ${d.getHours()}:${pad(d.getMinutes())}`}</Mono>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
        <D size={58} color="#000" style={{ lineHeight: 54 }}>{Math.floor(total / 60)}</D>
        <J size={14} w="900" color="#000" style={{ marginBottom: 6, marginRight: 6, marginLeft: 2 }}>時間</J>
        <D size={58} color="#000" style={{ lineHeight: 54 }}>{pad(total % 60)}</D>
        <J size={14} w="900" color="#000" style={{ marginBottom: 6, marginLeft: 2 }}>分</J>
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: 'flex-end', marginBottom: 4 }}>
          <Mono size={10} color="#000" ls={0.08}>VS 昨日</Mono>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <T f="chakra" size={18} color="#000">{diff >= 0 ? '▲' : '▼'}</T>
            <Dur m={Math.abs(diff)} size={18} color="#000" />
          </View>
        </View>
      </View>
      {/* the window: the day as cells toward the goal */}
      <View style={{ backgroundColor: '#04070A', paddingTop: 17, paddingHorizontal: 10, paddingBottom: 7, gap: 6, boxShadow: 'inset 0px 0px 0px 2px #000000, inset 0px 3px 12px rgba(0,0,0,0.9)' }}>
        <View>
          <Cells cells={cells} h={18} gap={2} skew={0.45} />
          <Goal at={today.goal / span} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {Array.from({ length: span / 60 + 1 }, (_, i) => <Mono key={i} size={9} ls={0.06} color={i * 60 === Math.round(today.goal / 60) * 60 && i ? C.y : C.t3}>{i ? `${i}H` : '0'}</Mono>)}
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 4 }}>
        {parts.map((p) => (
          <View key={p.id + (p.live ? '*' : '')} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 10, height: 10, backgroundColor: p.id === FREE ? 'transparent' : p.c, borderWidth: 1.5, borderColor: '#000' }} />
            <J size={11.5} w="700" color="#000" lh={15}>{`${p.id === FREE ? '自習' : p.name} `}</J>
            <Dur m={p.min} size={12} color="#000" />
          </View>
        ))}
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <J size={11.5} w="700" color="#000" lh={15}>{left > 0 ? '目標まで ' : '目標達成'}</J>
          {left > 0 ? <Dur m={left} size={12} color="#000" /> : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingTop: 7, borderTopWidth: 1.5, borderColor: '#000' }}>
        {next ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
            <J size={11.5} w="700" color="#000">締切</J>
            <View style={{ backgroundColor: '#000', paddingHorizontal: 5, paddingVertical: 1 }}><D size={12} color={C.warm}>{`T-${next.days}`}</D></View>
            <J size={11.5} w="700" color="#000" numberOfLines={1} style={{ flexShrink: 1 }}>{next.t}</J>
          </View>
        ) : <J size={11.5} w="700" color="#000">締切なし</J>}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Barcode n={18} h={12} color="#000" />
          <Mono size={10} color="#000" ls={0.08}>{`IN-${pad(d.getMonth() + 1)}${pad(d.getDate())}`}</Mono>
        </View>
      </View>
    </View>
  );
}
/** The device's faint diagonal stripes. */
function Stripes() {
  const [s, onLayout] = useSize();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {s ? (
        <Svg width={s.w} height={s.h}>
          <Defs><Pattern id="devstripe" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><Rect x={0} y={0} width={2} height={8} fill="rgba(0,0,0,0.045)" /></Pattern></Defs>
          <Polygon points={`14,0 ${s.w},0 ${s.w},${s.h - 14} ${s.w - 14},${s.h} 0,${s.h} 0,14`} fill="url(#devstripe)" />
        </Svg>
      ) : null}
    </View>
  );
}
/** The goal on the tape: a yellow line, GOAL over it. */
function Goal({ at }: { at: number }) {
  if (at <= 0 || at > 1) return null;
  return (
    <>
      <View pointerEvents="none" style={{ position: 'absolute', left: `${at * 100}%`, top: -5, bottom: -5, width: 2, marginLeft: -1, backgroundColor: C.y, boxShadow: `0px 0px 8px ${C.y}` }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: `${at * 100}%`, top: -17, width: 44, marginLeft: -22, alignItems: 'center' }}>
        <Mono size={8.5} color={C.y} ls={0.1}>GOAL</Mono>
      </View>
    </>
  );
}

// ---------- badges ----------
type Chip = { code: string; face: string; label: string; got: boolean; left?: string };
/** The badges as IC chips: got ones lit yellow with their pins; the next ones locked. And an omamori for the school you're aiming at. */
function Badges() {
  const g = useGrowth(useStore((s) => s.sessions));
  const streak = useStreak();
  const chips: Chip[] = [
    ...[100, 300, 500, 700, 1000].map((m) => ({ code: `INC-${m}`, face: `${m}H`, label: `${m}時間`, got: g.total >= m, left: `あと${Math.ceil(m - g.total)}時間` })),
    ...[7, 21, 30, 100].map((d) => ({ code: `UPT-${pad(d)}`, face: `${d}D`, label: `${d}日連続`, got: streak >= d, left: `あと${d - streak}日` })),
    { code: 'DAY-5H', face: '5H', label: '1日5時間', got: true },
    { code: 'SUN-10', face: 'AM10', label: '朝勉10回', got: true },
  ];
  chips.sort((a, b) => Number(b.got) - Number(a.got));
  const got = chips.filter((x) => x.got).length;
  return (
    <Panel style={{ gap: 10 }}>
      <Head mod="MOD.05" name="バッジ" right={`${got} / ${chips.length}`} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 }}>
        {chips.map((c) => <IcChip key={c.code} c={c} />)}
        <View style={{ width: '16.66%', alignItems: 'center', gap: 6 }} accessible accessibilityLabel="お守り 合格祈願（志望校）">
          <Omamori />
          <J size={11} w="700" color={C.t1} lh={14}>志望校</J>
        </View>
      </View>
    </Panel>
  );
}
function IcChip({ c }: { c: Chip }) {
  const pins = (y: number) => <View style={{ position: 'absolute', left: 6, right: 6, top: y, height: 5, flexDirection: 'row', justifyContent: 'space-between' }}>
    {Array.from({ length: 6 }, (_, i) => <View key={i} style={{ width: 3, height: 5, backgroundColor: c.got ? C.y : C.t3 }} />)}
  </View>;
  return (
    <View style={{ width: '16.66%', alignItems: 'center', gap: 6 }} accessible accessibilityLabel={c.got ? `${c.label} 達成` : `${c.label} ${c.left}`}>
      <View style={{ width: 52, height: 56, alignItems: 'center', justifyContent: 'center' }}>
        {pins(0)}
        <View style={{ width: 52, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: c.got ? '#17160A' : '#0B1219',
          boxShadow: c.got ? `inset 0px 0px 0px 1px ${C.y}, 0px 0px 16px rgba(252,238,10,0.22)` : `inset 0px 0px 0px 1px ${C.steel}` }}>
          <Mono size={7.5} ls={0.04} color={C.t3} style={{ position: 'absolute', left: 4, top: 2 }}>{c.code}</Mono>
          <View style={{ position: 'absolute', left: -1, top: 17.5, width: 5, height: 9, backgroundColor: C.void }} />
          {c.got ? <D size={14} color={C.y} style={glow('rgba(252,238,10,0.6)', 8)}>{c.face}</D> : <CIcon name="lock" size={16} color={C.t3} accent={C.t3} />}
        </View>
        {pins(51)}
      </View>
      <J size={11} w="700" color={c.got ? C.t1 : C.t2} lh={14} numberOfLines={1}>{c.label}</J>
    </View>
  );
}
/** 合格祈願: a navy omamori with a gold edge and knot. */
function Omamori() {
  return (
    <View style={{ width: 44, height: 56, alignItems: 'center', paddingTop: 14, backgroundImage: 'linear-gradient(170deg, #1A2944, #0B1222)',
      boxShadow: 'inset 0px 0px 0px 1.5px #C9A75A, inset 0px 0px 0px 3px #0B1222, inset 0px 0px 0px 3.5px rgba(201,167,90,0.6)' }}>
      <View style={{ position: 'absolute', top: 4, width: 8, height: 8, transform: [{ rotate: '45deg' }], borderWidth: 1.5, borderColor: '#E9C97E' }} />
      {[...'合格祈願'].map((ch) => <J key={ch} size={10} w="700" color="#E9C97E" lh={10.5}>{ch}</J>)}
    </View>
  );
}

/** A subject name's color as サイバー shows it: yours if it's one of your subjects, else its 教科's. */
function plateColor(name: string) {
  const mine = allSubjects().find((x) => x.name === name);
  return mine ? mine.c : areaTone(guessArea(name));
}

const sections: HomeKit['sections'] = { grass: Grass, streak: Streak, peers: Crew, today: Today, badges: Badges };
const Frame = ({ children }: { block: SectionProps['block']; index: number; children: ReactNode }) => <>{children}</>;
export const home: HomeKit = { Page, Header, Frame, sections };
