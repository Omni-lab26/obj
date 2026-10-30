import { ReactNode, useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, PanResponder, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, makeMutable, useAnimatedStyle, useSharedValue, withDelay } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { pad } from '@/data';
import { jpDate } from '@/lib/time';
import { Friends, type FriendsLook } from '@/screens/home/Friends';
import { go, type Friend, type Slice, useDeadlines, useToday, useWeekStreak } from '@/screens/model';
import type { HomeKit, SectionProps } from '@/themes/types';
import { T } from '@/themes/kit';
import { useDmUnread, useLevel, useStore, useStreak } from '@/store';
import { haptic } from '@/ui/base';
import { Screen, useTabPad, useUnread } from '@/ui/Chrome';
import { replayCharts, useReplay } from '@/ui/appear';
import { useGrowth } from '@/ui/Growth';
import { Heatmap } from '@/ui/Heatmap';
import { levelSheet } from '@/ui/Level';
import { RefreshScroll } from '@/ui/Loader';
import { flicker, micro, present } from '@/ui/motion';
import { Rolling } from '@/ui/Rolling';
import { TourSpot } from '@/ui/Tour';
import type { StickerId } from './art';
import { GAP, GUTTER, R, ring, S } from './look';
import { Aux, B, Card, Dot, J, Key, Link, Person, Plate, PlateBtn, SecHead, Tag } from './parts';
import { Creature, LogoMark, Pix, PixSticker } from './pixel';

// スタンダード's home, after the mock (docs/app/mock/home.html, home-live.html,
// home-new.html): the base blocks in the base order — the days studied (the
// grass), the streak with ボッ, friends studying now, today (the one lead card,
// with the inch tape) and the badges as stickers — on dotted paper, under a
// header with the logo's mark, the level and one plate of buttons. Everything
// home did stays: sorting and swiping friends away, pressing along the grass
// and the tape to read them, the menu home slides aside for, the tour's spots.

const hm = (m: number) => `${Math.floor(m / 60)}:${pad(Math.round(m % 60))}`;
/** The page has scrolled (0 / 1, fading): the header draws its ink line. */
const scrolled = makeMutable(0);

// ---------- page, header ----------
function Page({ header, children }: { header: ReactNode; children: ReactNode }) {
  const tabPad = useTabPad();
  const on = useRef(false);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const now = e.nativeEvent.contentOffset.y > 4;
    if (now !== on.current) { on.current = now; scrolled.set(micro(now ? 1 : 0)); }
  };
  useEffect(() => () => { scrolled.set(0); }, []);
  return (
    <Screen>
      {header}
      <RefreshScroll onRefresh={replayCharts} onScroll={onScroll} scrollEventThrottle={32} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: tabPad, gap: GAP }}>
        {children}
      </RefreshScroll>
    </Screen>
  );
}

/** The logo (its mark and the word), the level, and one plate: さがす · お知らせ · メッセージ. An ink line under it once the page scrolls. */
function Header() {
  const unread = useUnread();
  const dm = useDmUnread();
  const l = useLevel();
  const { width } = useWindowDimensions();
  const line = useAnimatedStyle(() => ({ opacity: scrolled.value }));
  return (
    <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: GUTTER, zIndex: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }} accessible accessibilityRole="header" accessibilityLabel="Inchly">
        <LogoMark />
        {/* on the smallest phones the word gives its room to the buttons */}
        {width >= 360 ? <T f="groteskBold" size={22} lh={26} ls={-1} style={{ marginTop: -2 }}>inchly</T> : null}
      </View>
      <Key label={`レベル${l.lv}。次のレベルまで${Math.round(l.need).toLocaleString('ja-JP')} EXP`} onPress={levelSheet} kd={3} style={{ height: 32 }} face={{ paddingHorizontal: 9, gap: 6 }}
        hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}>
        <J size={13} w="700" lh={16} num>{`Lv.${l.lv}`}</J>
        <View style={{ width: 22, height: 6, backgroundColor: S.paper2, boxShadow: ring(1.5), overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(l.p * 100)}%`, height: '100%', backgroundColor: S.ink }} />
        </View>
      </Key>
      <View style={{ flex: 1 }} />
      <Plate>
        <PlateBtn first icon="search" label="さがす" onPress={go.search} />
        <PlateBtn icon="bell" label="お知らせ" dot={unread > 0} onPress={go.notifications} />
        {/* one-to-one messages (マイページ is the tab bar's; 設定 is in the menu home slides aside for) */}
        <TourSpot id="messages"><PlateBtn icon="chat" label={dm ? `メッセージ 未読${dm}件` : 'メッセージ'} dot={dm > 0} onPress={go.messages} /></TourSpot>
      </Plate>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: S.ink }, line]} />
    </View>
  );
}

// ---------- the days studied ----------
/** The grass, first: square cells in the app's greens, today framed in ink. Press and drag to read a day. */
function Grass() {
  const days = useStore((s) => s.sessions.filter((x) => x.date.startsWith(String(new Date().getFullYear()))).reduce((a, x) => a.add(x.date), new Set<string>()).size);
  return (
    <Card style={{ gap: 12 }}>
      <SecHead title="勉強した日" accent={S.run} right={<Aux>今年 <B>{days}</B>日</Aux>} />
      <Heatmap weeks={18} gap={3} square />
    </Card>
  );
}

// ---------- the streak ----------
/** ボッ, the count, the rest tickets, and this week as seven boxes. ボッ sways slowly while the streak is lit (the one repeating motion allowed); at 0 it sleeps, grey. */
function Streak() {
  const { streak, tickets, days } = useWeekStreak();
  const week = days.filter((d) => d.studied).map((d) => `${d.label}${d.today ? '（今日）' : ''}`);
  return (
    <Pressable onPress={() => haptic.soft()} accessibilityLabel={`${streak}日連続で勉強中。休み券${tickets}枚。今週：${week.length ? `${week.join('・')}に勉強した` : 'まだ勉強した日はありません'}`}>
      <Card style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 10, paddingVertical: 12 }}>
        <Flame lit={streak > 0} />
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Rolling value={String(streak)} size={24} weight="800" />
            <J size={13} w="700" lh={16} color={S.ink3} style={{ marginLeft: 3, marginBottom: 4 }}>日連続</J>
          </View>
          <J size={12} lh={15} color={S.ink3}>{`休み券 ${tickets}`}</J>
        </View>
        <View style={{ marginLeft: 'auto', flexDirection: 'row', gap: 4 }}>
          {days.map((d) => <Day key={d.label} d={d} />)}
        </View>
      </Card>
    </Pressable>
  );
}
function Flame({ lit }: { lit: boolean }) {
  const sway = useSharedValue(0);
  useEffect(() => {
    if (lit) sway.set(flicker());
    else { cancelAnimation(sway); sway.set(0); }
    return () => cancelAnimation(sway);
  }, [lit, sway]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 + sway.value * 0.03 }, { scaleY: 1 - sway.value * 0.03 }] }));
  return (
    <Animated.View style={[{ transformOrigin: '50% 100%', opacity: lit ? 1 : 0.35 }, style]}>
      <Creature id="bo" face={lit ? 'idle' : 'sleep'} grey={!lit} />
    </Animated.View>
  );
}
type WeekDay = ReturnType<typeof useWeekStreak>['days'][number];
/** A day of this week: sun when studied, coral today (an ink frame while today waits), sky a rest day, dashed still to come. */
function Day({ d }: { d: WeekDay }) {
  const bg = d.today ? (d.studied ? S.coral : S.card) : d.studied ? S.sun : d.rest ? S.sky : d.future ? 'transparent' : S.card;
  return (
    <View style={{ alignItems: 'center', gap: 5, minWidth: 20 }}>
      <View style={{ width: 20, height: 20, borderRadius: 5, backgroundColor: bg, alignItems: 'center', justifyContent: 'center',
        ...(d.future && !d.today ? { borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(23,18,31,0.38)' } : { boxShadow: ring(d.today && !d.studied ? 2 : 1.5) }) }}>
        {d.studied ? <Pix name="check" px={1.5} /> : d.rest ? <J size={10} w="700" lh={12}>休</J> : null}
      </View>
      <T f="pixel" size={11} lh={12} color={d.today ? S.ink : S.ink3}>{d.label}</T>
    </View>
  );
}

// ---------- friends studying now ----------
function FriendsPanel({ children }: { children: ReactNode }) {
  // the rows are clipped to the card's corners (the outline is a shadow, so it stays)
  return <View style={{ backgroundColor: S.card, borderRadius: R.card, boxShadow: ring(), paddingTop: 14, paddingBottom: 6, overflow: 'hidden' }}>{children}</View>;
}
function FriendsHead({ sort, onSort, onAll }: { sort: string; onSort: () => void; onAll: () => void }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 2 }}>
      <SecHead title="いま勉強中の友達" accent={S.run} right={
        <>
          <Key label={`並び順 ${sort}`} onPress={onSort} kd={2} radius={R.chip} style={{ height: 32 }} face={{ paddingLeft: 8, paddingRight: 6, gap: 3 }} hitSlop={{ top: 6, bottom: 6 }}>
            <J size={11.5} w="600" lh={14} color={S.ink2}>{sort}</J>
            <Pix name="down" px={1.5} color={S.ink3} />
          </Key>
          <Link label="もっと見る" onPress={onAll} size={12.5} />
        </>
      } />
    </View>
  );
}
function FriendRow({ f }: { f: Friend }) {
  const up = f.diff >= 0;
  return (
    <>
      <Person name={f.n} color={f.c} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <J size={15} w="700" lh={19} numberOfLines={1}>{f.n}</J>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Dot c={S.run} size={6} />
          <J size={12} lh={16} color={S.ink3} numberOfLines={1} style={{ flexShrink: 1 }}>{`${f.s}を勉強中`}</J>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', minWidth: 42, gap: 2 }}>
        <J size={15} w="700" lh={18} num>{hm(f.today)}</J>
        <J size={12} w="700" lh={15} num color={up ? S.up : S.down}>{`${up ? '▲' : '▼'} ${hm(Math.abs(f.diff))}`}</J>
      </View>
      <Spark week={f.week} color={up ? S.ink : S.down} />
    </>
  );
}
/** Seven days as a short line, today marked with a square: ink when up, red when down (no green in a chart). */
function Spark({ week, color }: { week: number[]; color: string }) {
  const W = 52, H = 26;
  const lo = Math.min(...week), hi = Math.max(...week), span = Math.max(1, hi - lo);
  const p = week.map((m, i) => [(i / (week.length - 1)) * (W - 6) + 3, H - 4 - ((m - lo) / span) * (H - 8)] as const);
  const d = p.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  const [ex, ey] = p[p.length - 1];
  return (
    <View aria-hidden>
      <Svg width={W} height={H}>
        <Path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <Path d={`M${(ex - 3).toFixed(1)} ${(ey - 3).toFixed(1)}h6v6h-6z`} fill={color} />
      </Svg>
    </View>
  );
}
const FRIENDS: FriendsLook = { Panel: FriendsPanel, Head: FriendsHead, Row: FriendRow, ground: S.card, line: S.line };
const Peers = () => <Friends look={FRIENDS} />;

// ---------- today ----------
/** The lead card (the lime shadow, the one 32pt figure): today's total, against yesterday, the nearest deadline, and the inch tape. */
function Today() {
  const today = useToday();
  const next = useDeadlines()[0];
  // the figures roll up from zero when the screen is shown (and when home comes back)
  const [shown, setShown] = useState(false);
  const replay = useReplay();
  useEffect(() => {
    const a = setTimeout(() => setShown(false), 0);
    const b = setTimeout(() => setShown(true), 120);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [replay]);
  const diff = today.diff;
  return (
    <Card hero>
      <SecHead title="今日の勉強" accent={S.ink} right={next ? <Tag dot={S.due}>{`${next.t}まで `}<J size={12} lh={16} w="800" num>{next.days}</J>日</Tag> : null} />
      <J size={12} lh={16} num color={S.ink3} style={{ marginTop: 2 }}>{jpDate(new Date())}</J>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 10 }} accessible
        accessibilityLabel={`今日 ${Math.floor(today.min / 60)}時間${today.min % 60}分。昨日より${Math.floor(Math.abs(diff) / 60)}時間${Math.abs(diff) % 60}分${diff >= 0 ? '多い' : '少ない'}`}>
        <Rolling value={shown ? String(Math.floor(today.min / 60)) : '0'} size={32} weight="800" />
        <J size={13} w="700" lh={16} color={S.ink3} style={{ marginLeft: 3, marginRight: 7, marginBottom: 5 }}>時間</J>
        <Rolling value={shown ? pad(today.min % 60) : '00'} size={32} weight="800" />
        <J size={13} w="700" lh={16} color={S.ink3} style={{ marginLeft: 3, marginBottom: 5 }}>分</J>
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: 'flex-end', gap: 2, marginBottom: 2 }}>
          <J size={12} w="700" lh={15} num color={diff >= 0 ? S.up : S.down}>{`${diff >= 0 ? '▲' : '▼'} ${hm(Math.abs(diff))}`}</J>
          <J size={11} lh={13} color={S.ink3}>昨日より</J>
        </View>
      </View>
      <View style={{ marginTop: 18 }}>
        <Tape minutes={today.min} goal={today.goal} parts={today.parts} />
      </View>
    </Card>
  );
}

/**
 * The inch tape: today's minutes as subject segments (an ink line after each)
 * on a ruler — quarter hours, the hours named, the goal marked ▼. It draws in
 * from the left when it appears (scaleX); press and slide along it to read a
 * subject (the others dim, a small ink tag under it names it).
 */
function Tape({ minutes, goal, parts }: { minutes: number; goal: number; parts: Slice[] }) {
  const [w, setW] = useState(0);
  const [hot, setHot] = useState<number | null>(null);
  const segs = parts.filter((p) => p.min > 0);
  const end = Math.max(goal + 60, Math.ceil((minutes + 30) / 60) * 60);
  const x = (m: number) => (m / end) * w;
  const starts = segs.map((_, i) => segs.slice(0, i).reduce((a, p) => a + p.min, 0));
  const reached = minutes >= goal;
  const reveal = useSharedValue(0);
  const replay = useReplay();
  useEffect(() => {
    if (!w) return;
    reveal.set(0);
    reveal.set(withDelay(150, present(1)));
  }, [w, minutes, replay, reveal]);
  const grow = useAnimatedStyle(() => ({ transform: [{ scaleX: reveal.value }] }));

  const geo = useRef({ w, starts, segs, end });
  useEffect(() => { geo.current = { w, starts, segs, end }; });
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => {
    let last: number | null = null;
    let hide: ReturnType<typeof setTimeout> | undefined;
    const at = (px: number) => {
      const g = geo.current;
      if (!g.w) return null;
      const m = (px / g.w) * g.end;
      for (let i = g.segs.length - 1; i >= 0; i--) if (m >= g.starts[i] && m <= g.starts[i] + g.segs[i].min + 4) return i;
      return null;
    };
    const show = (i: number | null) => { clearTimeout(hide); if (i !== null && i !== last) haptic.tap(); last = i; setHot(i); };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => true,
      onPanResponderGrant: (e) => show(at(e.nativeEvent.locationX)),
      onPanResponderMove: (e) => show(at(e.nativeEvent.locationX)),
      onPanResponderRelease: () => { hide = setTimeout(() => show(null), 1200); },
      onPanResponderTerminate: () => show(null),
    });
  });

  const hours = Array.from({ length: end / 60 + 1 }, (_, h) => h).filter((h) => Math.abs(h * 60 - goal) >= 40);
  const dim = (i: number) => (hot === null || hot === i ? 1 : 0.4);
  return (
    <View accessible accessibilityLabel={`今日 ${Math.floor(minutes / 60)}時間${minutes % 60}分。目標は${goal / 60}時間。${segs.map((p) => `${p.name} ${p.min}分`).join('、')}`}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ paddingTop: 2 }}>
        {/* the bar: press and slide along it */}
        <View {...pan.panHandlers} style={{ height: 16, borderRadius: 3, backgroundColor: S.paper2, boxShadow: ring(), overflow: 'hidden' }}>
          {w ? (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transformOrigin: '0% 50%' }, grow]}>
              {segs.map((p, i) => (
                <View key={p.id} style={{ position: 'absolute', top: 0, bottom: 0, left: x(starts[i]), width: x(p.min), backgroundColor: p.c, opacity: dim(i) }}>
                  <View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 2, backgroundColor: S.ink }} />
                </View>
              ))}
            </Animated.View>
          ) : null}
        </View>
        {/* the ruler: a tick every quarter hour, longer on the hour; the hours named; the goal */}
        <View pointerEvents="none" style={{ height: 30, marginTop: 2 }}>
          {w ? (
            <>
              {Array.from({ length: end / 15 + 1 }, (_, i) => {
                const h = (i * 15) % 60 === 0;
                return <View key={i} style={{ position: 'absolute', top: 0, left: x(i * 15) - (h ? 1 : 0.75), width: h ? 2 : 1.5, height: h ? 8 : 4, backgroundColor: S.ink, opacity: h ? 0.85 : 0.45 }} />;
              })}
              {hours.map((h) => (
                <J key={h} size={10} w="500" lh={12} num color={S.ink3}
                  style={{ position: 'absolute', top: 11, width: 30, left: h === 0 ? 0 : h * 60 === end ? w - 30 : x(h * 60) - 15, textAlign: h === 0 ? 'left' : h * 60 === end ? 'right' : 'center' }}>
                  {h === 0 ? '0' : `${h}h`}
                </J>
              ))}
              <View style={{ position: 'absolute', top: -22, left: x(goal) - 1, width: 2, height: 30, backgroundColor: S.ink }} />
              <Svg width={10} height={5} style={{ position: 'absolute', top: -26, left: x(goal) - 5 }}><Path d="M0 0h10L5 5z" fill={S.ink} /></Svg>
              <J size={11} w="800" lh={13} color={reached ? S.runInk : S.ink} style={{ position: 'absolute', top: 11, width: 60, left: Math.min(w - 60, x(goal) - 30), textAlign: 'center' }}>
                {`目標 ${goal % 60 ? hm(goal) : `${goal / 60}h`}`}
              </J>
            </>
          ) : null}
        </View>
        {/* the subject pressed, named under the bar */}
        {hot !== null && segs[hot] && w ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: 23, left: Math.max(0, Math.min(w - 120, x(starts[hot] + segs[hot].min / 2) - 60)), width: 120, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 24, paddingHorizontal: 9, borderRadius: 7, backgroundColor: S.ink }}>
              <View style={{ width: 7, height: 7, backgroundColor: segs[hot].c, boxShadow: ring(1.5, S.onInk) }} />
              <J size={11} w="700" lh={13} color={S.onInk}>{segs[hot].name}</J>
              <J size={11} w="500" lh={13} num color="rgba(251,248,241,0.72)">{hm(segs[hot].min)}</J>
            </View>
          </View>
        ) : null}
      </View>
      {/* the key */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginTop: 2 }}>
        {segs.map((p, i) => (
          <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: dim(i) }}>
            <View style={{ width: 8, height: 8, backgroundColor: p.c, boxShadow: ring(1.5) }} />
            <J size={11} lh={14} color={S.ink2}>{p.name}</J>
            <J size={11} w="600" lh={14} num color={S.ink3}>{hm(p.min)}</J>
          </View>
        ))}
        {!reached ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: hot === null ? 1 : 0.4 }}>
            <View style={{ width: 8, height: 8, boxShadow: `inset 0px 0px 0px 1.5px ${S.ink3}` }} />
            <J size={11} lh={14} color={S.ink2}>目標まで</J>
            <J size={11} w="600" lh={14} num color={S.ink3}>{hm(goal - minutes)}</J>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ---------- badges ----------
/** The badges as stickers on the paper, earned first (a little tilted); the rest grey with what's left. Scroll sideways. */
function Badges() {
  const g = useGrowth(useStore((s) => s.sessions));
  const streak = useStreak();
  const list: { s: StickerId; label: string; got: boolean; left?: string }[] = [
    ...[100, 300, 500, 700, 1000].map((m) => ({ s: 'trophy' as StickerId, label: `${m}時間`, got: g.total >= m, left: `あと${Math.ceil(m - g.total)}時間` })),
    ...[7, 21, 30, 100].map((d) => ({ s: 'flame' as StickerId, label: `${d}日連続`, got: streak >= d, left: `あと${d - streak}日` })),
    { s: 'star', label: '1日5時間', got: true },
    { s: 'sun', label: '朝勉10回', got: true },
  ];
  list.sort((a, b) => Number(b.got) - Number(a.got));
  const got = list.filter((x) => x.got).length;
  return (
    <Card style={{ gap: 8 }}>
      <SecHead title="バッジ" accent={S.sun} right={<Aux><B>{got}</B>{` / ${list.length}`}</Aux>} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 14, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 2 }}
        accessibilityLabel="バッジ（横にスクロールできます）">
        {list.map((b) => (
          <View key={b.label} style={{ width: 76, alignItems: 'center', gap: 6 }} accessible accessibilityLabel={b.got ? `${b.label} 達成` : `${b.label} ${b.left}`}>
            <View style={{ height: 48, justifyContent: 'center' }}><PixSticker name={b.s} locked={!b.got} tilt={b.got ? -6 : 0} /></View>
            <J size={12} w="700" lh={15}>{b.label}</J>
            <J size={11} w={b.got ? '700' : '500'} lh={13} color={b.got ? S.runInk : S.ink3}>{b.got ? '達成' : b.left}</J>
          </View>
        ))}
      </ScrollView>
    </Card>
  );
}

const sections: HomeKit['sections'] = { grass: Grass, streak: Streak, peers: Peers, today: Today, badges: Badges };
/** Each section brings its own card. */
const Frame = ({ children }: { block: SectionProps['block']; index: number; children: ReactNode }) => <>{children}</>;
export const home: HomeKit = { Page, Header, Frame, sections };
