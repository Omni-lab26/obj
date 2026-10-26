import { router } from 'expo-router';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn, interpolateColor, LayoutAnimationConfig, LinearTransition, makeMutable, type SharedValue,
  useAnimatedReaction, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, ZoomOut,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { hm, subj } from '@/data';
import type { Zone, Zones } from '@/screens/layout';
import { jpHm, session, startBlock, useSession } from '@/screens/model';
import { jpDate } from '@/lib/time';
import { blocksOn, endOf, suggestion, type Block } from '@/lib/timetable';
import { doneOn, finishBlock, getState, togglePause, useStore } from '@/store';
import { focus, onColor } from '@/theme';
import { Btn, haptic, Press, Txt } from '@/ui/base';
import { Dialog } from '@/ui/Dialog';
import { LiveDot } from '@/ui/GroupParts';
import { Icon } from '@/ui/Icon';
import { PlanArt } from '@/ui/PlanArt';
import { planSheet } from '@/ui/PlanSheets';
import { closeTimer, fmt, TimerFrame } from './standard';

// The timer as today's plans, one card each, side by side like a music app's
// albums: slide them with a finger and they come to rest one at a time. Each
// card is a plan: its icon big at the top, then the subject, what to do and
// the memo, and a button — ▶ with its time to start it, or ❚❚ while it runs.
// The page takes the centered card's color as you slide. A plan you end
// (終わる) leaves; the empty card in front adds one. Under the cards, fixed
// (it doesn't move with them), the time studied and the line toward the plan's
// end: green inside it, red past it.

/** The measured card, in points, on a 393pt-wide screen; everything scales with it. */
const BASE_W = 281, RATIO = 439 / 281, GAP = 10, SIDE = 0.95, DIM = 0.45;
/** What sits around the cards: the heading, the pager, the time studied, the buttons. */
const AROUND = 280;
const ADD_COLOR = '#4A5062';
const WITHIN = '#30D158';
const OVER = '#FF453A';

/** The page's color, following the centered card (shared with the wash behind the page). */
const washColor = makeMutable(ADD_COLOR);

export const CARD_ZONES = (): Zones => ({ head: ['top'], center: ['switcher'], foot: [] });

export function CardTimerPage({ zones }: { zones: Record<Zone, ReactNode> }) {
  return <TimerFrame zones={zones} wash={<DeckWash />} />;
}

/** The centered card's color over the page: strong at the top, darker toward the buttons. */
function DeckWash() {
  const a = useAnimatedStyle(() => ({ backgroundColor: washColor.value }));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, a]} />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="deckwash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={focus.bg} stopOpacity={0.3} />
            <Stop offset="0.5" stopColor={focus.bg} stopOpacity={0.62} />
            <Stop offset="1" stopColor={focus.bg} stopOpacity={0.88} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#deckwash)" />
      </Svg>
    </View>
  );
}

/** A way down (back to the study bar), and where things stand. */
export function CardTop() {
  const ss = useSession();
  const state = ss.running ? (ss.paused ? '一時停止中' : `${ss.subject.name}を勉強中`) : 'これから';
  return (
    <View>
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
          <Txt size={12} w="700" color={focus.ink2} numberOfLines={1}>{state}</Txt>
        </View>
        <View style={{ width: 36 }} />
      </View>
    </View>
  );
}

/** Today's plans still to do (a plan under way stays, whatever its day), earliest first. */
function useCards() {
  const all = useStore((s) => s.timetable);
  const doneList = useStore((s) => s.doneBlocks);
  const lastDay = useStore((s) => s.lastDay); // a new day, a new set of cards
  const live = useStore((s) => (s.running ? s.planBlock : null));
  return useMemo(() => {
    const d = new Date();
    const done = doneOn({ doneBlocks: doneList }, d);
    const list = blocksOn(all, d).filter((b) => !done.has(b.id) || b.id === live);
    const b = live ? all.find((x) => x.id === live) : undefined;
    if (b && !list.includes(b)) list.unshift(b);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, doneList, lastDay, live]);
}

type Menu = { kind: 'more'; b: Block } | { kind: 'busy' } | null;

/** The cards, the time studied under them, and the buttons; sized to the room the page leaves. */
export function PlanDeck() {
  const [h, setH] = useState(0);
  return (
    <View style={{ flex: 1, alignSelf: 'stretch' }} onLayout={(e) => setH(Math.round(e.nativeEvent.layout.height))}>
      {h ? <Deck height={h} /> : null}
    </View>
  );
}

function Deck({ height }: { height: number }) {
  const { width } = useWindowDimensions();
  const cards = useCards();
  const live = useStore((s) => (s.running ? s.planBlock : null));
  const running = useStore((s) => s.running);
  const [menu, setMenu] = useState<Menu>(null);

  // the card: the measured one on a 393pt screen, smaller when the page is short
  const W = Math.round(Math.max(190, Math.min(width - 112, 340, (height - AROUND) / RATIO)));
  const k = W / BASE_W;
  const gap = Math.round(GAP * k);
  const step = W + gap;
  const H = Math.round(W * RATIO);

  // the card to open on: the plan under way, else the one now or next, else the first (0 is the empty card)
  const [start] = useState(() => {
    const i = live ? cards.findIndex((b) => b.id === live) : -1;
    if (i >= 0) return i + 1;
    const s = suggestion(cards);
    const j = s ? cards.indexOf(s.block) : -1;
    return j >= 0 ? j + 1 : cards.length ? 1 : 0;
  });
  const x = useSharedValue(start * step);
  const page = useSharedValue(start);
  const [shown, setShown] = useState(start);
  const ref = useAnimatedRef<Animated.ScrollView>();
  const n = cards.length + 1;

  const turned = (i: number) => { setShown(i); haptic.tap(); };
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      x.value = e.contentOffset.x;
      const i = Math.max(0, Math.min(n - 1, Math.round(e.contentOffset.x / step)));
      if (i !== page.value) { page.value = i; scheduleOnRN(turned, i); }
    },
  }, [step, n]);

  // the page's color: the centered card's, mixed as you slide between two
  const colors = useMemo(() => [ADD_COLOR, ...cards.map((b) => subj(b.s).c)], [cards]);
  useAnimatedReaction(() => x.value, (v) => {
    washColor.value = colors.length > 1 ? interpolateColor(v, colors.map((_, i) => i * step), colors) : colors[0];
  }, [colors, step]);

  const goTo = (i: number, animated = true) => ref.current?.scrollTo({ x: i * step, y: 0, animated });
  // open on the right card (the web ignores contentOffset)
  useEffect(() => {
    goTo(start, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // a plan just added: slide to it
  const ids = useRef(cards.map((b) => b.id));
  useEffect(() => {
    const added = cards.findIndex((b) => !ids.current.includes(b.id));
    ids.current = cards.map((b) => b.id);
    if (added >= 0) setTimeout(() => goTo(added + 1), 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  const begin = (b: Block) => {
    if (!startBlock(b)) { haptic.warn(); setMenu({ kind: 'busy' }); return; }
    haptic.firm();
  };
  const add = () => { haptic.tap(); planSheet({ date: new Date() }); };
  const centered: Block | 'add' | null = shown === 0 ? 'add' : cards[shown - 1] ?? null;
  const d = new Date();

  return (
    <View style={{ flex: 1 }}>
      {/* today's timetable */}
      <Press onPress={() => { closeTimer(); setTimeout(() => router.navigate('/study'), 60); }} scale={0.98} accessibilityRole="link" accessibilityLabel="今日の時間割を開く"
        style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14, alignSelf: 'flex-start' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt size={21} w="700" lh={26} color={focus.ink}>今日の時間割</Txt>
          <View style={{ transform: [{ rotate: '180deg' }], opacity: 0.6 }}><Icon name="back" size={15} color={focus.ink} /></View>
        </View>
        <Txt size={15} lh={20} color={focus.ink2}>{`${jpDate(d)} · ${cards.length ? `のこり${cards.length}つ` : '予定はまだありません'}`}</Txt>
      </Press>

      {/* the cards */}
      <View style={{ height: H }}>
        <LayoutAnimationConfig skipEntering>
          <Animated.ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}
            snapToInterval={step} decelerationRate="fast" disableIntervalMomentum contentOffset={{ x: start * step, y: 0 }}
            contentContainerStyle={{ paddingHorizontal: (width - W) / 2, gap }} accessibilityRole="adjustable" accessibilityLabel="今日の予定">
            <Slide key="add" i={0} x={x} step={step} w={W} h={H} k={k} centered={shown === 0} onFocus={() => goTo(0)}>
              <AddCard w={W} h={H} k={k} onPress={add} />
            </Slide>
            {cards.map((b, i) => (
              <Slide key={b.id} i={i + 1} x={x} step={step} w={W} h={H} k={k} centered={shown === i + 1} onFocus={() => goTo(i + 1)}>
                <PlanCard b={b} i={i + 1} x={x} step={step} k={k} live={b.id === live} begin={begin} more={() => { haptic.tap(); setMenu({ kind: 'more', b }); }} />
              </Slide>
            ))}
          </Animated.ScrollView>
        </LayoutAnimationConfig>
      </View>

      <Pager x={x} step={step} n={n} label={shown === 0 ? '追加' : `${shown} / ${cards.length}`} />
      <Elapsed />
      <View style={{ flex: 1 }} />
      <Foot running={running} centered={centered} begin={begin} add={add} />

      <MenuDialog menu={menu} close={() => setMenu(null)} />
    </View>
  );
}

/** One place in the row: smaller and darker the further it is from the middle; a side card comes to the middle when tapped. */
function Slide({ i, x, step, w, h, k, centered, onFocus, children }: { i: number; x: SharedValue<number>; step: number; w: number; h: number; k: number; centered: boolean; onFocus: () => void; children: ReactNode }) {
  const a = useAnimatedStyle(() => {
    const d = Math.min(1, Math.abs(x.value - i * step) / step);
    return { transform: [{ scale: 1 - (1 - SIDE) * d }] };
  });
  const dim = useAnimatedStyle(() => ({ opacity: DIM * Math.min(1, Math.abs(x.value - i * step) / step) }));
  return (
    <Animated.View layout={LinearTransition.springify().damping(20).stiffness(180)} entering={FadeIn.duration(260)} exiting={ZoomOut.duration(260)} style={{ width: w, height: h }}>
      <Animated.View style={[{ flex: 1, borderRadius: 20 * k, overflow: 'hidden' }, a]}>
        {children}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, dim]} />
        {centered ? null : <Press onPress={onFocus} haptics={false} scale={1} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }} accessibilityLabel="この予定を真ん中に" />}
      </Animated.View>
    </Animated.View>
  );
}

/** A plan's card: the icon (it drifts a little against the slide), the subject, what to do, the memo, and its button. */
function PlanCard({ b, i, x, step, k, live, begin, more }: { b: Block; i: number; x: SharedValue<number>; step: number; k: number; live: boolean; begin: (b: Block) => void; more: () => void }) {
  const paused = useStore((s) => s.paused);
  const sj = subj(b.s);
  const ink = onColor(sj.c);
  const light = ink === '#FFFFFF';
  const soft = light ? 'rgba(255,255,255,' : 'rgba(0,0,0,';
  const art = Math.round(251 * k);
  const drift = useAnimatedStyle(() => ({ transform: [{ translateX: Math.max(-1, Math.min(1, (x.value - i * step) / step)) * 0.05 * step }, { scale: 1.14 }] }));
  const time = b.start ? (b.min ? `${b.start}〜${endOf(b)}` : `${b.start}から`) : 'はじめる';
  const press = () => { if (live) { haptic.soft(); togglePause(); } else begin(b); };
  return (
    <View style={{ flex: 1, backgroundColor: sj.c, borderRadius: 20 * k, borderWidth: 1, borderColor: `${soft}0.16)` }}>
      <View style={{ position: 'absolute', left: 15 * k, top: 15 * k, width: art, height: art, borderRadius: 11 * k, overflow: 'hidden' }}>
        <Animated.View style={drift}>
          <PlanArt icon={b.icon} name={sj.name} color={sj.c} size={art} radius={0} />
        </Animated.View>
      </View>
      <View style={{ position: 'absolute', left: 15 * k, right: 15 * k, top: 284 * k, gap: 4 * k }}>
        <Txt size={Math.max(10, 11 * k)} lh={14 * k} w="600" color={`${soft}0.66)`} style={{ letterSpacing: 0.7 }} numberOfLines={1}>{sj.name}</Txt>
        <Txt size={Math.max(12.5, 15 * k)} lh={Math.max(16, 19 * k)} w="700" color={ink} numberOfLines={2}>{b.t ?? sj.task}</Txt>
        {b.note ? <Txt size={Math.max(11, 12.5 * k)} lh={Math.max(15, 17 * k)} color={`${soft}0.76)`} numberOfLines={2}>{b.note}</Txt> : null}
      </View>
      <Press onPress={press} haptics={false} scale={0.95}
        accessibilityLabel={live ? (paused ? `${sj.name}を再開` : `${sj.name}を一時停止`) : `${sj.name}を始める（${time}）`}
        style={{ position: 'absolute', left: 19 * k, top: 381 * k, width: 190 * k, height: 43 * k, borderRadius: 22 * k, backgroundColor: ink,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 * k }}>
        <Icon name={live && !paused ? 'pause' : 'play'} size={13 * k} color={sj.c} filled />
        <Txt num size={Math.max(12.5, 14 * k)} w="700" color={light ? focus.bg : '#fff'} numberOfLines={1}>{live ? (paused ? '再開' : '勉強中') : time}</Txt>
      </Press>
      <Press onPress={more} scale={0.9} hitSlop={4} accessibilityLabel={`${sj.name}の予定のメニュー`}
        style={{ position: 'absolute', left: 220 * k, top: 381 * k, width: 43 * k, height: 43 * k, borderRadius: 22 * k, borderWidth: 1.5, borderColor: `${soft}0.3)`, alignItems: 'center', justifyContent: 'center' }}>
        <Txt size={16 * k} w="800" color={ink} style={{ letterSpacing: 1 }}>···</Txt>
      </Press>
    </View>
  );
}

/** The empty card in front: adds a plan to today. */
function AddCard({ w, h, k, onPress }: { w: number; h: number; k: number; onPress: () => void }) {
  return (
    <Press onPress={onPress} haptics={false} scale={0.98} accessibilityLabel="今日の時間割に予定を追加"
      style={{ width: w, height: h, borderRadius: 20 * k, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center', justifyContent: 'center', gap: 12 * k, paddingHorizontal: 24 * k }}>
      <View style={{ width: 72 * k, height: 72 * k, borderRadius: 36 * k, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={28 * k} color={focus.ink} width={2.4} />
      </View>
      <Txt size={Math.max(15, 18 * k)} w="800" color={focus.ink}>予定を追加</Txt>
      <Txt size={Math.max(11.5, 12.5 * k)} color={focus.ink2} style={{ textAlign: 'center' }}>今日の時間割に入れます。写真のアイコンも選べます</Txt>
    </Press>
  );
}

/** Where you are in the row: a short line with a thumb that slides with the cards, and the count. */
function Pager({ x, step, n, label }: { x: SharedValue<number>; step: number; n: number; label: string }) {
  const TRACK = 56;
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: Math.max(0, Math.min(n - 1, x.value / step)) * (TRACK / n) }] }));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }} accessible accessibilityLabel={label}>
      <View style={{ width: TRACK, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
        <Animated.View style={[{ width: TRACK / n, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.85)' }, thumb]} />
      </View>
      <Txt num size={12} color={focus.ink3}>{label}</Txt>
    </View>
  );
}

/**
 * The time studied, fixed under the cards so it stays in view whichever plan
 * you look at; the only thing that changes every second. Started from a plan,
 * a line under it fills green toward the plan's end and turns red past it.
 */
function Elapsed() {
  const ss = useSession();
  const today = useStore((s) => s.todayMin);
  const sec = ss.running ? ss.elapsed : 0;
  const over = !!ss.plan && sec > ss.plan;
  const top = ss.running ? `${ss.paused ? '一時停止中 · ' : ''}${ss.subject.name}${ss.plan ? ` · 予定${jpHm(ss.plan / 60)}` : ''}` : 'カードの ▶ で始めます';
  const below = !ss.running ? `今日 ${hm(today)}`
    : ss.next ? `次 ${ss.next.subject.name} ${ss.next.at}まで`
    : ss.plan ? (over ? `予定を ${fmt(sec - ss.plan)} こえて` : `あと ${fmt(ss.plan - sec)}`)
    : `今日 ${hm(today)}`;
  return (
    <View style={{ marginHorizontal: 20, marginTop: 22, marginBottom: 18 }} accessible accessibilityRole={ss.plan ? 'progressbar' : undefined}
      accessibilityLabel={ss.running ? `勉強した時間 ${fmt(sec)}。${top}。${below}` : `${top}。${below}`}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <Txt num size={40} w="700" lh={46} color={ss.running ? focus.ink : focus.ink3} style={{ opacity: ss.paused ? 0.55 : 1 }}>{fmt(sec)}</Txt>
        <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end', paddingBottom: 4 }}>
          <Txt size={12.5} lh={17} color={focus.ink2} numberOfLines={1}>{top}</Txt>
          <Txt num size={12.5} lh={17} color={over ? OVER : focus.ink2} numberOfLines={1}>{below}</Txt>
        </View>
      </View>
      <View style={{ height: 3, borderRadius: 2, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden', opacity: ss.running && ss.plan ? 1 : 0 }}>
        <View style={{ width: `${ss.plan ? Math.min(100, (sec / ss.plan) * 100) : 0}%`, height: '100%', borderRadius: 2, backgroundColor: over ? OVER : WITHIN }} />
      </View>
    </View>
  );
}

/** Under way: pause and 終わる (the clock stops and the memo opens; the plan's card goes once it's recorded). Before: start the centered plan, or add one. */
function Foot({ running, centered, begin, add }: { running: boolean; centered: Block | 'add' | null; begin: (b: Block) => void; add: () => void }) {
  const paused = useStore((s) => s.paused);
  const wide = { flex: 1, height: 56, borderRadius: 28, backgroundColor: '#fff', flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8 };
  if (running) {
    return (
      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 20 }}>
        <Press onPress={() => { haptic.soft(); togglePause(); }} haptics={false} scale={0.92} accessibilityLabel={paused ? '再開' : '一時停止'}
          style={{ width: 62, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={paused ? 'play' : 'pause'} size={20} color={focus.ink} filled />
        </Press>
        <Press onPress={session.finish} scale={0.96} accessibilityLabel="終わる（記録する）" style={wide}>
          <Txt size={17} w="800" color={focus.bg}>終わる</Txt>
        </Press>
      </View>
    );
  }
  const b = centered === 'add' ? null : centered;
  return (
    <View style={{ flexDirection: 'row', marginHorizontal: 20 }}>
      {b ? (
        <Press onPress={() => begin(b)} haptics={false} scale={0.96} accessibilityLabel={`${subj(b.s).name}を始める`} style={wide}>
          <Icon name="play" size={16} color={focus.bg} filled />
          <Txt size={17} w="800" color={focus.bg} numberOfLines={1}>{`${subj(b.s).name}を始める`}</Txt>
        </Press>
      ) : (
        <Press onPress={add} scale={0.96} accessibilityLabel="予定を追加" style={wide}>
          <Icon name="plus" size={16} color={focus.bg} width={2.4} />
          <Txt size={17} w="800" color={focus.bg}>予定を追加</Txt>
        </Press>
      )}
    </View>
  );
}

/** A card's ··· (end the plan for today, or edit it), and why another plan can't start yet. */
function MenuDialog({ menu, close }: { menu: Menu; close: () => void }) {
  // keep what it said while it closes
  const [last, setLast] = useState<Menu>(menu);
  if (menu && menu !== last) setLast(menu);
  const m = menu ?? last;
  const cur = getState();
  if (m?.kind === 'busy') {
    return (
      <Dialog open={!!menu} close={close} title={`いまは${subj(cur.subj).name}を勉強中です`}>
        <View style={{ gap: 10, paddingHorizontal: 20, paddingBottom: 20 }}>
          <Txt size={14} tone="ink2" style={{ marginBottom: 6 }}>「終わる」で記録すると、次の予定を始められます</Txt>
          <Btn kind="primary" wide label="わかった" onPress={close} />
        </View>
      </Dialog>
    );
  }
  const b = m?.kind === 'more' ? m.b : null;
  const live = !!b && cur.running && cur.planBlock === b.id;
  const later = (f: () => void) => { close(); setTimeout(f, 260); };
  return (
    <Dialog open={!!menu} close={close} title={b ? `${subj(b.s).name}${b.t ? ` · ${b.t}` : ''}` : ''}>
      <View style={{ gap: 10, paddingHorizontal: 20, paddingBottom: 20 }}>
        {live ? (
          <Btn kind="primary" wide label="終わる（記録する）" onPress={() => later(session.finish)} />
        ) : (
          <Btn kind="primary" wide label="この予定を終わりにする" onPress={() => { if (b) { haptic.success(); finishBlock(b.id); } close(); }} />
        )}
        <Btn kind="quiet" wide label="予定を編集" onPress={() => later(() => b && planSheet({ existing: b }))} />
        <Btn kind="ghost" wide label="やめる" onPress={close} />
      </View>
    </Dialog>
  );
}

/** The card drawing of the timer's parts: the page is the deck; the other parts are in it. */
const Nothing = () => null;
export const CARD_PARTS = {
  top: CardTop, switcher: PlanDeck,
  subject: Nothing, readout: Nothing, progress: Nothing, today: Nothing, main: Nothing, record: Nothing,
};
