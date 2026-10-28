import { router } from 'expo-router';
import { ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolateColor, LayoutAnimationConfig, makeMutable, type SharedValue,
  useAnimatedReaction, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withDelay, withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { subj } from '@/data';
import type { Zone, Zones } from '@/screens/layout';
import { jpHm, session, startBlock, useTicking } from '@/screens/model';
import { jpDate } from '@/lib/time';
import { deckOf, endOf, suggestion, type Block } from '@/lib/timetable';
import { type Backdrop, useDesign } from '@/design';
import { doneOn, elapsedOf, finishBlock, getState, type Held, sameFav, setDesign, toggleFavorite, togglePause, useStore } from '@/store';
import { focus, useT } from '@/theme';
import { Btn, haptic, Press, Txt } from '@/ui/base';
import { Dialog } from '@/ui/Dialog';
import { Icon } from '@/ui/Icon';
import { orderSheet } from '@/ui/OrderSheet';
import { PlanArt } from '@/ui/PlanArt';
import { planSheet } from '@/ui/PlanSheets';
import { fadeIn, fadeOut, layout, M, micro } from '@/ui/motion';
import { glyphOf, SubjectGlyph } from '@/ui/SubjectGlyph';
import { openSheet } from '@/ui/Sheet';
import { TIME_FONTS, timeFontOf } from '@/ui/timeFonts';
import { toast } from '@/ui/Toast';
import { BackdropView } from '@/ui/backdrop/Backdrop';
import { backdropAvoid, feedAt, FLOOR, holdBackdrop, isDarkBackdrop, useBackdrop } from '@/ui/backdrop/shared';
import { WalkerTags } from '@/ui/backdrop/Tags';
import { backdropSheet } from '@/ui/BackdropSheet';
import { Pane } from '@/ui/Glass';
import { closeTimer, fmt, TimerFrame } from './standard';

// The timer as today's plans, one card each, side by side like a music app's
// albums: slide them with a finger and they come to rest one at a time. Each
// card is a plan, and everything about it happens on it: start, pause, go on,
// end. Going on to the next plan is a slide and 始める on its card: the study
// under way is set aside to record later (its card says ✓ 42分). Record each
// one as you go, or all at the end (まとめて記録). A recorded plan's card
// leaves; the card in front adds one. The card is a music player's, opened
// big: the picture, the subject and the memo with ♡ (kept to add again), the
// line toward the plan's end with the time under it, and the buttons (✎,
// ▶ / ❚❚, ✓). Hold the time to pick its face. Under the cards, an ad.
//
// Behind it all, the theme you pick (テーマ): the koi pond (they swim around
// the card, never under it), sharks in a pale sea (the cards frosted glass),
// people walking over a glass floor, or the centered card's color. 眺める fades the words away and leaves the background.

/** The card as drawn (361pt wide, 400 tall); everything in it scales with its width. It grows taller to fill the page, up to TALLEST × its width. */
/** The card's corner, as a share of its width. */
const CORNER = 0.088;
const CARD_W = 361, CARD_RATIO = 400 / 361, TALLEST = 1.8, GAP = 12, SIDE = 0.95, DIM = 0.45;
/** What sits around the cards: the heading, the pager, the ad, and 記録まち when there's some. */
const HEAD_H = 62, PAGER_H = 34, AD_H = 100, WAIT_H = 46;
const ADD_COLOR = '#4A5062';
/** The card's colors: white with a hairline, near-black ink, gray for the rest; past the plan's length the line goes on in orange. */
const CARD = { paper: '#FFFFFF', edge: '#E3E3E3', ink: '#17181A', ink2: '#6E6E73', track: '#E6E6E6', heart: '#FF2D55' };
const EXTRA = '#FF9F0A';
const CRIMSON_ON_DARK = '#FF4D6D';
const CRIMSON = '#D7003A';

/** The page's color, following the centered card (shared with the wash behind the page). */
const washColor = makeMutable(ADD_COLOR);

export const CARD_ZONES = (): Zones => ({ head: ['top'], center: ['switcher'], foot: [] });

// ---------- little shared states ----------
function shared<T>(first: T) {
  let v = first;
  const subs = new Set<() => void>();
  const set = (x: T) => { v = x; subs.forEach((f) => f()); };
  const use = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => v, () => v);
  return { set, use, get: () => v };
}
/** 眺める: the words and buttons fade away and the background is all there is. */
const looking = shared(false);
/** Where the centered card is, in the page's points (the koi and the walkers keep off it). */
type Box = { x: number; y: number; w: number; h: number };
const cardBox = shared<Box | null>(null);

/** The page's words, light on the dark backgrounds and dark on the glass floor. */
type Tone = { light: boolean; ink: string; ink2: string; ink3: string; chip: string; shade: string };
const ON_DARK: Tone = { light: false, ink: '#F3F5F9', ink2: 'rgba(243,245,249,0.66)', ink3: 'rgba(243,245,249,0.4)', chip: 'rgba(255,255,255,0.12)', shade: 'rgba(0,0,0,0.55)' };
const ON_LIGHT: Tone = { light: true, ink: '#161616', ink2: 'rgba(22,22,22,0.6)', ink3: 'rgba(22,22,22,0.38)', chip: 'rgba(22,22,22,0.06)', shade: 'transparent' };
/** The pale backgrounds: the sea and the glass floor (none: the subject's color, dark). */
const isLight = (b: Backdrop) => b !== 'none' && !isDarkBackdrop(b);
const useTone = () => (isLight(useBackdrop()) ? ON_LIGHT : ON_DARK);

export function CardTimerPage({ zones }: { zones: Record<Zone, ReactNode> }) {
  const bg = useBackdrop();
  const look = looking.use() && bg !== 'none';
  // the timer opens with its words, whatever it was left as
  useEffect(() => () => looking.set(false), []);
  // faded out, the page also steps aside (its layout kept), so nothing of it is in the way of the background
  const fade = useAnimatedStyle(() => ({
    opacity: micro(look ? 0 : 1),
    transform: [{ translateX: look ? withDelay(M.micro.duration, withTiming(10000, { duration: 0 })) : 0 }],
  }), [look]);
  const wrap = (n: ReactNode, grow?: boolean) => (
    <Animated.View pointerEvents={look ? 'none' : 'box-none'} style={[grow ? { flex: 1, alignSelf: 'stretch' } : null, fade]}>{n}</Animated.View>
  );
  return (
    <TimerFrame light={isLight(bg)} zones={{ head: wrap(zones.head), center: wrap(zones.center, true), foot: wrap(zones.foot) }}
      wash={<Back bg={bg} look={look} />} over={look ? <Looking bg={bg} /> : null} />
  );
}

/** What's behind the page: the 背景 (the same koi as on every page; here they keep off the card), or the card's color. */
function Back({ bg, look }: { bg: Backdrop; look: boolean }) {
  const box = cardBox.use();
  // while you look, nothing to keep off
  const avoid = look ? null : box;
  useEffect(() => { backdropAvoid.set(avoid); }, [avoid]);
  useEffect(() => () => { backdropAvoid.set(null); }, []);
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <BackProbe />
      {bg === 'none' ? <DeckWash /> : <Water feedable={bg !== 'walk'} look={look} />}
    </View>
  );
}
/** The 背景 behind the timer — kept sharp, a little paler; clear while you look — and a tap on the water feeds the koi (or the sharks). */
function Water({ feedable, look }: { feedable: boolean; look: boolean }) {
  const [tap] = useState(() => Gesture.Tap().maxDuration(400).onEnd((e) => {
    'worklet';
    feedAt(e.x, e.y);
    scheduleOnRN(haptic.soft);
  }));
  tap.enabled(feedable);
  return (
    <GestureDetector gesture={tap}>
      <View pointerEvents={feedable ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
        <BackdropView always look={look ? 'clear' : 'pale'} />
      </View>
    </GestureDetector>
  );
}

/** The centered card's color over the page: strong at the top, darker toward the bottom. */
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

const HINTS: Record<Backdrop, string> = {
  pond: '水面をタップすると、エサをあげられます', sea: '海をタップすると、サメが寄ってきます', walk: 'いま勉強している人たちが、上を歩いていきます', none: '',
};
/** 眺める: the time, small and quiet at the top, a way back, and (for a while) what you can do. */
function Looking({ bg }: { bg: Backdrop }) {
  const paused = useStore((s) => s.paused);
  const time = useTicking((s, now) => fmt(s.running ? elapsedOf(s, now) : 0));
  const tone = isLight(bg) ? ON_LIGHT : ON_DARK;
  const [hint, setHint] = useState(true);
  useEffect(() => { const id = setTimeout(() => setHint(false), 6000); return () => clearTimeout(id); }, []);
  return (
    <Animated.View entering={fadeIn()} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {bg === 'walk' ? <WalkerTags /> : null}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: 64, left: 0, right: 0, alignItems: 'center', gap: 8 }}>
        <Txt num size={34} w="700" color={paused ? (tone.light ? CRIMSON : CRIMSON_ON_DARK) : tone.ink} style={{ textShadowColor: tone.shade, textShadowRadius: 12 }}>
          {time}
        </Txt>
        <Press onPress={() => { haptic.tap(); looking.set(false); }} scale={0.94} hitSlop={8} accessibilityLabel="眺めるのをやめる"
          style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: tone.chip, justifyContent: 'center' }}>
          <Txt size={12.5} w="700" color={tone.ink}>戻る</Txt>
        </Press>
      </View>
      {hint ? (
        <Animated.View exiting={fadeOut()} pointerEvents="none" style={{ position: 'absolute', bottom: 46, left: 0, right: 0, alignItems: 'center' }}>
          <Txt size={12.5} color={tone.ink2}>{HINTS[bg]}</Txt>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/** The grabber (pull the page down by it, or anywhere, to make it small again), 背景, where things stand, 眺める. */
export function CardTop() {
  // only what it shows (not the ticking time), so it doesn't redraw every second
  const ss = { running: useStore((s) => s.running), paused: useStore((s) => s.paused) };
  const name = subj(useStore((s) => s.subj)).name;
  const tone = useTone();
  const bg = useBackdrop();
  const state = ss.running ? `${name}を勉強中` : 'これから';
  return (
    <View pointerEvents="box-none" style={{ alignItems: 'center' }}>
      <Press onPress={() => closeTimer()} hitSlop={14} accessibilityLabel="小さくする（下にスライドでも）" style={{ marginTop: 6, width: 40, height: 5, borderRadius: 3, backgroundColor: tone.light ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.45)' }} />
      <View pointerEvents="box-none" style={{ height: 44, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 }}>
        <TopChip tone={tone} label="背景" a11y="背景を選ぶ" onPress={backdropSheet} />
        <View pointerEvents="none" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {ss.running && !ss.paused ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#39FF14' }} /> : null}
          <Txt size={12} w="700" color={ss.paused ? (tone.light ? CRIMSON : CRIMSON_ON_DARK) : tone.ink2} numberOfLines={1}>{state}</Txt>
        </View>
        {bg !== 'none' ? <TopChip tone={tone} label="眺める" a11y="背景を眺める（文字とボタンを消す）" onPress={() => looking.set(true)} /> : <View style={{ width: 64 }} />}
      </View>
    </View>
  );
}
function TopChip({ tone, label, a11y, onPress }: { tone: Tone; label: string; a11y: string; onPress: () => void }) {
  return (
    <Press onPress={() => { haptic.tap(); onPress(); }} scale={0.94} hitSlop={6} accessibilityLabel={a11y}
      style={{ minWidth: 64, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: tone.chip, alignItems: 'center', justifyContent: 'center' }}>
      <Txt size={12} w="700" color={tone.ink}>{label}</Txt>
    </Press>
  );
}

/** Today's cards (see deckOf), the sessions waiting to be recorded, and which card is under way. */
function useDeck() {
  const all = useStore((s) => s.timetable);
  const doneList = useStore((s) => s.doneBlocks);
  const held = useStore((s) => s.held);
  const order = useStore((s) => s.dayOrder);
  const lastDay = useStore((s) => s.lastDay); // a new day, a new set of cards
  const live = useStore((s) => (s.running ? s.planBlock : null));
  return useMemo(() => {
    const d = new Date();
    const { list, locked } = deckOf({
      blocks: all, day: d, done: doneOn({ doneBlocks: doneList }, d), held: held.flatMap((h) => (h.blockId ? [h.blockId] : [])), live,
      order: order && order.date === lastDay ? order.ids : undefined,
    });
    const heldOf = new Map(held.flatMap((h) => (h.blockId ? [[h.blockId, h] as const] : [])));
    return { cards: list, locked, heldOf, live };
  }, [all, doneList, held, order, lastDay, live]);
}

type Menu = { kind: 'more'; b: Block } | { kind: 'all' } | null;

/** The cards and the time studied under them; sized to the room the page leaves. */
export function PlanDeck() {
  const [h, setH] = useState(0);
  return (
    <View pointerEvents="box-none" style={{ flex: 1, alignSelf: 'stretch' }} onLayout={(e) => setH(Math.round(e.nativeEvent.layout.height))}>
      {h ? <Deck height={h} /> : null}
    </View>
  );
}

function Deck({ height }: { height: number }) {
  const { width } = useWindowDimensions();
  const tone = useTone();
  const { cards, heldOf, live } = useDeck();
  const held = useStore((s) => s.held);
  const [menu, setMenu] = useState<Menu>(null);

  // the card: as wide as leaves the next ones peeking in, narrower when the page is short; taller to fill the room, so no gap is left under it
  const room = height - HEAD_H - PAGER_H - AD_H - (held.length ? WAIT_H : 0);
  const W = Math.round(Math.max(200, Math.min(width - 62, CARD_W, room / CARD_RATIO)));
  const H = Math.round(Math.max(W * CARD_RATIO, Math.min(room, W * TALLEST)));
  const k = W / CARD_W;
  const gap = Math.round(GAP * k);
  const step = W + gap;

  // the card to open on: the plan under way, else the one now or next, else the first (0 is the empty card)
  const [start] = useState(() => {
    const i = live ? cards.findIndex((b) => b.id === live) : -1;
    if (i >= 0) return i + 1;
    const s = suggestion(cards.filter((b) => !heldOf.has(b.id)));
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
      // the cards are moving: the 背景's mosaic waits, so the swipe has the thread
      holdBackdrop();
      x.value = e.contentOffset.x;
      const i = Math.max(0, Math.min(n - 1, Math.round(e.contentOffset.x / step)));
      if (i !== page.value) { page.value = i; scheduleOnRN(turned, i); }
    },
  }, [step, n]);

  // the page's color (with 科目の色): the centered card's, mixed as you slide between two
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
  // a plan just added: slide to it; the cards moved under you (one recorded, or another started): stay with the one you were on
  const ids = useRef(cards.map((b) => b.id));
  useEffect(() => {
    const before = ids.current;
    ids.current = cards.map((b) => b.id);
    const added = cards.findIndex((b) => !before.includes(b.id));
    if (added >= 0) { setTimeout(() => goTo(added + 1), 350); return; }
    const was = before[shown - 1];
    const now = was ? cards.findIndex((b) => b.id === was) : -1;
    if (now >= 0 && now + 1 !== shown) setTimeout(() => goTo(now + 1), 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  // where the centered card sits on the page, for the background to keep off it
  const row = useRef<View>(null);
  const measure = () => {
    row.current?.measureInWindow((rx, ry) => {
      const sheet = backOrigin.get();
      cardBox.set({ x: rx - sheet.x + (width - W) / 2, y: ry - sheet.y, w: W, h: H });
    });
  };
  useEffect(() => () => cardBox.set(null), []);

  const begin = (b: Block) => { haptic.firm(); startBlock(b); };
  const add = () => { haptic.tap(); planSheet({ date: new Date() }); };
  const record = (h: Held) => { haptic.tap(); router.push({ pathname: '/record', params: { held: h.id } }); };
  const d = new Date();
  const rest = cards.length - heldOf.size;

  return (
    <View pointerEvents="box-none" style={{ flex: 1 }}>
      {/* today's timetable, and putting it in another order */}
      <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 2, paddingBottom: 14 }}>
        <Press onPress={() => closeTimer(() => router.navigate('/study'))} scale={0.98} accessibilityRole="link" accessibilityLabel="今日の時間割を開く" style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Txt size={21} w="700" lh={26} color={tone.ink} style={{ textShadowColor: tone.shade, textShadowRadius: 10 }}>今日の時間割</Txt>
            <View style={{ transform: [{ rotate: '180deg' }], opacity: 0.6 }}><Icon name="back" size={15} color={tone.ink} /></View>
          </View>
          {/* the day, plainly: bigger, in the page's ink, with a shadow on the dark backgrounds */}
          <Txt size={16} lh={22} w="600" color={tone.ink} numberOfLines={1} style={{ opacity: 0.88, letterSpacing: 0.3, textShadowColor: tone.shade, textShadowRadius: 12 }}>
            {jpDate(d)}
          </Txt>
        </Press>
        {rest > 1 ? (
          <Press onPress={() => { haptic.tap(); orderSheet(); }} scale={0.94} hitSlop={6} accessibilityLabel="今日の予定の順番を入れ替える"
            style={{ height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: tone.chip, flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <Icon name="sort" size={13} color={tone.ink} />
            <Txt size={12} w="700" color={tone.ink}>並べ替え</Txt>
          </Press>
        ) : null}
      </View>

      {/* the cards */}
      <View ref={row} onLayout={measure} style={{ height: H }}>
        <LayoutAnimationConfig skipEntering>
          <Animated.ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}
            snapToInterval={step} decelerationRate="fast" disableIntervalMomentum contentOffset={{ x: start * step, y: 0 }}
            contentContainerStyle={{ paddingHorizontal: (width - W) / 2, gap }} accessibilityRole="adjustable" accessibilityLabel="今日の予定">
            <Slide key="add" i={0} x={x} step={step} w={W} h={H} k={k} tone={tone} centered={shown === 0} onFocus={() => goTo(0)}>
              <AddCard w={W} h={H} k={k} tone={tone} onPress={add} />
            </Slide>
            {cards.map((b, i) => (
              <Slide key={b.id} i={i + 1} x={x} step={step} w={W} h={H} k={k} tone={tone} centered={shown === i + 1} onFocus={() => goTo(i + 1)}>
                <PlanCard b={b} w={W} h={H} live={b.id === live} held={heldOf.get(b.id)}
                  begin={begin} record={record} more={() => { haptic.tap(); setMenu({ kind: 'more', b }); }} />
              </Slide>
            ))}
          </Animated.ScrollView>
        </LayoutAnimationConfig>
      </View>

      <Pager x={x} step={step} n={n} tone={tone} label={shown === 0 ? '追加' : `${shown} / ${cards.length}`} />
      {held.length ? <Waiting held={held} tone={tone} onPress={() => { haptic.tap(); setMenu({ kind: 'all' }); }} /> : null}
      {/* what's left of the page goes above the ad, which keeps to the bottom */}
      <View pointerEvents="none" style={{ flex: 1 }} />
      <AdCard tone={tone} />

      <MenuDialog menu={menu} close={() => setMenu(null)} record={record} begin={begin} />
    </View>
  );
}

/** Where the page's background starts on the screen (it moves while the page slides up), to place the card on it. */
const backOrigin = shared({ x: 0, y: 0 });
/** The background's layer reports where it is on the screen. */
function BackProbe() {
  const me = useRef<View>(null);
  return (
    <View ref={me} pointerEvents="none" style={StyleSheet.absoluteFill}
      onLayout={() => me.current?.measureInWindow((x, y) => backOrigin.set({ x, y }))} />
  );
}

/** One place in the row: smaller and dimmer the further it is from the middle; a side card comes to the middle when tapped. */
function Slide({ i, x, step, w, h, k, tone, centered, onFocus, children }: {
  i: number; x: SharedValue<number>; step: number; w: number; h: number; k: number; tone: Tone; centered: boolean; onFocus: () => void; children: ReactNode;
}) {
  const a = useAnimatedStyle(() => {
    const d = Math.min(1, Math.abs(x.value - i * step) / step);
    return { transform: [{ scale: 1 - (1 - SIDE) * d }] };
  });
  const dim = useAnimatedStyle(() => ({ opacity: (tone.light ? 0.55 : DIM) * Math.min(1, Math.abs(x.value - i * step) / step) }));
  return (
    <Animated.View layout={layout()} entering={fadeIn()} exiting={fadeOut()} style={{ width: w, height: h }}>
      <Animated.View style={[{ flex: 1, borderRadius: CORNER * w, overflow: 'hidden' }, a]}>
        {children}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tone.light ? FLOOR : '#000000' }, dim]} />
        {centered ? null : <Press onPress={onFocus} haptics={false} scale={1} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }} accessibilityLabel="この予定を真ん中に" />}
      </Animated.View>
    </Animated.View>
  );
}

// ---------- the card ----------
type CardState = 'idle' | 'live' | 'paused' | 'held';
type CardProps = { b: Block; w: number; h: number; live: boolean; held?: Held; begin: (b: Block) => void; record: (h: Held) => void; more: () => void };

/** A plan's card. The others are still; the one under way (LiveCard) redraws only when it pauses or goes past its plan — its time and line tick on their own (CardClock). */
function PlanCard(p: CardProps) {
  if (p.live) return <LiveCard {...p} />;
  return <CardFace {...p} state={p.held ? 'held' : 'idle'} plan={(p.b.min ?? 0) * 60} over={false} />;
}
function LiveCard(p: CardProps) {
  const paused = useStore((s) => s.paused);
  const plan = useStore((s) => (s.planMin ? Math.round(s.planMin * 60) : null)) ?? (p.b.min ?? 0) * 60;
  const over = useTicking((s, now) => s.running && plan > 0 && elapsedOf(s, now) > plan);
  return <CardFace {...p} state={paused ? 'paused' : 'live'} plan={plan} over={over} />;
}

/** The card's time: m:ss, h:mm:ss from an hour on. */
const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

/**
 * The card, a music player's opened big: the picture at the top (the plan's
 * photo, or the subject's color with its drawing and name) with how it
 * stands on it; the subject, the memo under it (what to do if there's none)
 * and ♡ (keeps the plan, to add again from 予定を追加); the line toward the
 * plan's end, the time studied under it on the left (big, in the face you
 * picked: hold it to change) and what's left on the right (−20:43; past the
 * plan +4:12 in orange, the line going on in orange too); and the buttons:
 * ✎ edits the plan, ▶ / ❚❚ big in the middle, ✓ ends and records (not started: ends the plan).
 */
function CardFace({ b, w, state, plan, over, held, begin, record, more, h }: CardProps & { state: CardState; plan: number; over: boolean }) {
  const sj = subj(b.s);
  const k = w / CARD_W;
  const fs = (v: number) => Math.max(v * 0.85, v * k);
  const pad = Math.round(18 * k);
  const running = state === 'live' || state === 'paused';
  const heldMin = Math.max(1, Math.round((held?.sec ?? 0) / 60));
  const face = timeFontOf(useDesign().timeFont);
  const fav = useStore((s) => s.favorites.some((f) => sameFav(f, b)));
  const span = b.start ? (b.min ? `${b.start}–${endOf(b)}` : `${b.start}から`) : '時刻なし';
  const memo = b.note ?? b.t ?? sj.task;
  // the picture takes what the rest leaves, up to a square
  const rest = 2 * pad + 62 * k + 26 * k + face.size * w * 0.42 + 92 * k;
  const artH = Math.round(Math.max(110, Math.min(w - 2 * pad, h - rest)));
  const badge = state === 'idle' ? span : state === 'held' ? `記録まち · ${heldMin}分`
    : over ? `予定クリア · ${state === 'paused' ? '一時停止中' : '延長中'}` : state === 'paused' ? '一時停止中' : '勉強中';
  const dot = state === 'paused' ? '#FF453A' : state === 'live' ? (over ? EXTRA : '#34C759') : null;
  const glyph = glyphOf(sj.name, sj.area);
  const toggle = () => { haptic.soft(); togglePause(); };
  const heart = () => { const on = toggleFavorite(b); if (on) { haptic.success(); toast('よく使う予定に入れました', '「予定を追加」から1タップで入れられます'); } else haptic.tap(); };
  const main = state === 'live' ? { icon: 'pause' as const, a11y: `${sj.name}を一時停止`, go: toggle }
    : state === 'paused' ? { icon: 'play' as const, a11y: `${sj.name}を再開`, go: toggle }
    : state === 'held' ? { icon: 'play' as const, a11y: `${sj.name}を続きから始める`, go: () => begin(b) }
    : { icon: 'play' as const, a11y: `${sj.name}を始める（${span}）`, go: () => begin(b) };
  const rec = state === 'held' && held ? () => record(held) : running ? session.finish : null;
  return (
    <View style={{ flex: 1, backgroundColor: CARD.paper, borderRadius: CORNER * w, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: CARD.edge, padding: pad, justifyContent: 'space-between' }}>
      {/* the picture */}
      <View style={{ height: artH, borderRadius: 22 * k, overflow: 'hidden', backgroundColor: sj.c }}>
        {b.icon ? (
          <View style={{ position: 'absolute', left: 0, top: (artH - (w - 2 * pad)) / 2 }}>
            <PlanArt icon={b.icon} name={sj.name} color={sj.c} size={Math.round(w - 2 * pad)} radius={0} />
          </View>
        ) : (
          <>
            <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id={`art-${b.id}`} x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.28} />
                  <Stop offset="1" stopColor="#000000" stopOpacity={0.12} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill={`url(#art-${b.id})`} />
            </Svg>
            {glyph ? <View pointerEvents="none" style={{ position: 'absolute', right: 18 * k, top: 18 * k }}><SubjectGlyph glyph={glyph} size={Math.min(artH * 0.5, w * 0.36)} color="rgba(255,255,255,0.55)" width={1.4} /></View> : null}
            <Text pointerEvents="none" numberOfLines={1} style={{ position: 'absolute', left: 18 * k, bottom: 14 * k, right: 18 * k, fontSize: Math.min(artH * 0.24, 54 * k), fontWeight: '800', color: 'rgba(255,255,255,0.96)', letterSpacing: -1 }}>{sj.name}</Text>
          </>
        )}
        {/* how it stands */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 12 * k, top: 12 * k, height: 26 * k, paddingHorizontal: 10 * k, borderRadius: 13 * k, backgroundColor: 'rgba(0,0,0,0.32)', flexDirection: 'row', alignItems: 'center', gap: 6 * k }}>
          {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} /> : null}
          <Text numberOfLines={1} style={{ fontSize: fs(12), fontWeight: '600', color: '#fff', fontVariant: ['tabular-nums'] }}>{badge}</Text>
        </View>
      </View>

      {/* the subject, the memo, ♡ */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 * k }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 * k }}>
          <Text numberOfLines={1} style={{ fontSize: fs(23), fontWeight: '600', color: CARD.ink, letterSpacing: -0.4 }}>{sj.name}</Text>
          <Text numberOfLines={1} style={{ fontSize: fs(17), color: CARD.ink2 }}>{memo}</Text>
        </View>
        <Press onPress={heart} haptics={false} scale={0.82} hitSlop={10} accessibilityRole="button" accessibilityState={{ selected: fav }}
          accessibilityLabel={fav ? 'よく使う予定から外す' : 'よく使う予定に入れる'} style={{ paddingTop: 4 * k }}>
          <Icon name="heart" size={26 * k} color={fav ? CARD.heart : CARD.ink2} filled={fav} />
        </Press>
      </View>

      {/* the line, and the time under it */}
      <CardClock state={state} plan={plan} over={over} held={held} w={w} family={face.family} size={face.size * w * 0.42} spacing={face.spacing} />

      {/* ✎ 編集 / ▶ ❚❚ / ✓ 記録 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 34 * k }}>
        <Side k={k} icon="edit" a11y={`${sj.name}の予定を編集`} onPress={() => { haptic.tap(); planSheet({ existing: b }); }} />
        <Press onPress={main.go} haptics={false} scale={0.9} accessibilityLabel={main.a11y}
          style={{ width: 70 * k, height: 70 * k, borderRadius: 35 * k, backgroundColor: CARD.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={main.icon} size={26 * k} color="#fff" filled />
        </Press>
        {/* not started yet: ✓ offers ending the plan without studying (the menu), as recording needs a session */}
        <Side k={k} icon="check" a11y={state === 'held' ? `${sj.name} ${heldMin}分を記録する` : running ? `${sj.name}を終わって記録する` : `${sj.name}の予定を終わりにする`} onPress={rec ?? more} />
      </View>
    </View>
  );
}

/**
 * The line toward the plan's end and the time under it: the only part of the
 * card that redraws every second (useTicking). The line moves by sliding a
 * bar under its rounded window, not by changing a width (MOTION.md).
 */
function CardClock({ state, plan, over, held, w, family, size, spacing }: {
  state: CardState; plan: number; over: boolean; held?: Held; w: number; family: string; size: number; spacing: number;
}) {
  const k = w / CARD_W;
  const fs = (v: number) => Math.max(v * 0.85, v * k);
  const running = state === 'live' || state === 'paused';
  const ticked = useTicking((s, now) => (running && s.running ? elapsedOf(s, now) : -1));
  const sec = running ? Math.max(0, ticked) : held?.sec ?? 0;
  const left = state === 'idle' ? '0:00' : clock(sec);
  const right = state === 'idle' ? (plan ? `−${clock(plan)}` : '') : state === 'held' ? '記録まち' : over ? `+${clock(sec - plan)}` : plan ? `−${clock(plan - sec)}` : '';
  const done = over ? plan / sec : plan && state !== 'idle' ? Math.min(1, sec / plan) : 0;
  const [track, setTrack] = useState(0);
  const bar = { position: 'absolute' as const, left: 0, top: 0, bottom: 0, width: '100%' as const, borderRadius: 3 };
  return (
    <View style={{ gap: 6 * k }}>
      <View onLayout={(e) => setTrack(e.nativeEvent.layout.width)} style={{ height: 5 * k, borderRadius: 3, backgroundColor: CARD.track, overflow: 'hidden', opacity: track ? 1 : 0 }}>
        <View style={[bar, { backgroundColor: CARD.ink, transform: [{ translateX: -(1 - done) * track }] }]} />
        {over ? <View style={[bar, { backgroundColor: EXTRA, transform: [{ translateX: done * track + 2 }] }]} /> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Press onLongPress={() => { haptic.firm(); timeFontSheet(); }} delayLongPress={450} haptics={false} scale={1.04}
          accessibilityRole="button" accessibilityLabel={`勉強した時間 ${left}`} accessibilityHint="長押しで時間のフォントを変えられます" style={{ flexShrink: 1, minWidth: 0 }}>
          {/* no set line height: the tall faces (縦長) would be cut at the top and bottom; a long time shrinks to fit rather than being cut at the side */}
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}
            style={{ fontFamily: family, fontSize: size, paddingVertical: size * 0.06, includeFontPadding: false, letterSpacing: spacing * size, color: state === 'idle' || state === 'paused' ? CARD.ink2 : CARD.ink, fontVariant: ['tabular-nums'] }}>{left}</Text>
        </Press>
        <Text numberOfLines={1} style={{ flexShrink: 0, marginLeft: 10 * k, fontSize: fs(15), color: over ? EXTRA : CARD.ink2, fontWeight: over ? '700' : '400', fontVariant: ['tabular-nums'], paddingBottom: 4 * k }}>{right}</Text>
      </View>
    </View>
  );
}

/** The buttons beside the big one: an outline symbol alone, as a player's ⏮ ⏭ (the name is for VoiceOver). */
function Side({ k, icon, a11y, onPress }: { k: number; icon: 'edit' | 'check'; a11y: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} scale={0.86} hitSlop={8} accessibilityLabel={a11y}
      style={{ width: 52 * k, height: 52 * k, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={26 * k} color={CARD.ink} width={1.8} />
    </Press>
  );
}

// ---------- the time's face ----------
/** Picked by holding the card's time: a tile per face, the card changes as you tap; ✓ keeps it, ✕ goes back. */
export function timeFontSheet() {
  openSheet((close) => <TimeFontChoice close={close} />, { grouped: true });
}
function TimeFontChoice({ close }: { close: () => void }) {
  const t = useT();
  const cur = timeFontOf(useDesign().timeFont).id;
  const [first] = useState(cur);
  const pick = (id: string) => { haptic.tap(); setDesign({ timeFont: id }); };
  return (
    <View style={{ gap: 14, paddingTop: 2, paddingBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Press onPress={() => { setDesign({ timeFont: first }); close(); }} scale={0.92} hitSlop={8} accessibilityLabel="やめる（元のフォントに戻す）"
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(120,120,128,0.16)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={15} color={t.ink} />
        </Press>
        <Txt size={17} w="700" style={{ flex: 1, textAlign: 'center' }} accessibilityRole="header">時間のフォント</Txt>
        <Press onPress={close} scale={0.92} hitSlop={8} accessibilityLabel="決定"
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.blue, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={18} color="#fff" />
        </Press>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: '2.66%' }} accessibilityRole="radiogroup">
        {TIME_FONTS.map((f) => {
          const on = f.id === cur;
          return (
            <Press key={f.id} onPress={() => pick(f.id)} scale={0.95} haptics={false} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={f.name}
              style={{ width: '23%', alignItems: 'center', gap: 6 }}>
              <View style={{ alignSelf: 'stretch', height: 66, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: on ? t.blue : 'transparent' }}>
                <Text style={{ fontFamily: f.family, fontSize: 30, lineHeight: 36, color: '#1C1C1E', letterSpacing: f.spacing * 30 }}>39</Text>
              </View>
              <Txt size={11} w={on ? '700' : '400'} color={on ? t.blue : t.ink3}>{f.name}</Txt>
            </Press>
          );
        })}
      </View>
      <Txt size={12} tone="ink3" style={{ textAlign: 'center' }}>選ぶとすぐカードに反映されます</Txt>
    </View>
  );
}

/** The card in front: adds a plan to today. Clear, with only an edge (over a 背景, clear glass). */
function AddCard({ w, h, k, tone, onPress }: { w: number; h: number; k: number; tone: Tone; onPress: () => void }) {
  // over a 背景 it's glass like the other cards (and needs no edge)
  const glass = useBackdrop() !== 'none';
  return (
    <Press onPress={onPress} haptics={false} scale={0.98} accessibilityLabel="今日の時間割に予定を追加"
      style={{ width: w, height: h, borderRadius: CORNER * w, borderWidth: glass ? 0 : 1, borderColor: tone.light ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.22)',
        backgroundColor: glass ? 'rgba(255,255,255,0.22)' : tone.light ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', gap: 6 * k, paddingHorizontal: 24 * k }}>
      {glass ? <Pane radius={CORNER * w} liquid /> : null}
      <Icon name="plus" size={22 * k} color={tone.ink} width={1.6} />
      <Txt size={Math.max(14, 16 * k)} w="700" color={tone.ink}>予定を追加</Txt>
      <Txt size={Math.max(11.5, 12.5 * k)} color={tone.ink2} style={{ textAlign: 'center' }}>今日の時間割に入れます</Txt>
    </Press>
  );
}

/** Where you are in the row: a short line with a thumb that slides with the cards, and the count. */
function Pager({ x, step, n, tone, label }: { x: SharedValue<number>; step: number; n: number; tone: Tone; label: string }) {
  const TRACK = 56;
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: Math.max(0, Math.min(n - 1, x.value / step)) * (TRACK / n) }] }));
  return (
    <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }} accessible accessibilityLabel={label}>
      <View style={{ width: TRACK, height: 3, borderRadius: 2, backgroundColor: tone.light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
        <Animated.View style={[{ width: TRACK / n, height: 3, borderRadius: 2, backgroundColor: tone.light ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)' }, thumb]} />
      </View>
      <Txt num size={12} color={tone.ink3}>{label}</Txt>
    </View>
  );
}

/**
 * The ad, under the cards and still while they slide: quiet, in the page's
 * colors, no movement or sound, always marked 広告. (For now a sample.)
 */
function AdCard({ tone }: { tone: Tone }) {
  return (
    <View accessibilityLabel="広告" style={{ marginHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 24,
      backgroundColor: tone.light ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.1)', borderWidth: StyleSheet.hairlineWidth, borderColor: tone.light ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.16)' }}>
      <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: '#E2E8F6', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="book" size={24} color="#3A4F86" />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Txt size={9.5} w="700" color={tone.ink3} style={{ letterSpacing: 0.8 }}>広告</Txt>
        <Txt size={13.5} w="700" color={tone.ink} numberOfLines={1}>英単語3000をスキマ時間で</Txt>
        <Txt size={11} color={tone.ink2} numberOfLines={1}>ことばラボ（例） · 7日間無料</Txt>
      </View>
      <Press onPress={() => toast('広告の例です', 'まだ広告は配信していません')} scale={0.94} hitSlop={6} accessibilityLabel="広告を見る"
        style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: tone.ink, justifyContent: 'center' }}>
        <Txt size={12.5} w="700" color={tone.light ? '#FFFFFF' : '#161616'}>見る</Txt>
      </Press>
    </View>
  );
}

/** What's waiting to be recorded, and まとめて記録. */
function Waiting({ held, tone, onPress }: { held: Held[]; tone: Tone; onPress: () => void }) {
  const min = held.reduce((n, h) => n + Math.max(1, Math.round(h.sec / 60)), 0);
  return (
    <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginTop: 16 }}>
      <View pointerEvents="none" style={{ flexDirection: 'row' }}>
        {held.slice(0, 4).map((h, i) => (
          <View key={h.id} style={{ width: 10, height: 10, borderRadius: 3, marginLeft: i ? -3 : 0, backgroundColor: subj(h.s).c, borderWidth: 1.5, borderColor: tone.light ? FLOOR : 'rgba(0,0,0,0.35)' }} />
        ))}
      </View>
      <Txt size={13} color={tone.ink2} style={{ flex: 1, textShadowColor: tone.shade, textShadowRadius: 8 }} numberOfLines={1}>{`記録まち ${held.length}つ · ${jpHm(min)}`}</Txt>
      <Press onPress={onPress} scale={0.94} hitSlop={6} accessibilityLabel={`まとめて記録（${held.length}つ）`}
        style={{ height: 30, paddingHorizontal: 14, borderRadius: 15, backgroundColor: tone.chip, justifyContent: 'center' }}>
        <Txt size={12.5} w="700" color={tone.ink}>まとめて記録</Txt>
      </Press>
    </View>
  );
}

/** A card's ··· (end, record or go on with it, or edit it), and まとめて記録: everything waiting, and the one under way. */
function MenuDialog({ menu, close, record, begin }: { menu: Menu; close: () => void; record: (h: Held) => void; begin: (b: Block) => void }) {
  // keep what it said while it closes
  const [last, setLast] = useState<Menu>(menu);
  if (menu && menu !== last) setLast(menu);
  const m = menu ?? last;
  const cur = getState();
  const later = (f: () => void) => { close(); setTimeout(f, 260); };
  if (m?.kind === 'all') {
    const held = cur.held;
    const now = cur.running ? Math.max(1, Math.round(elapsedOf(cur) / 60)) : 0;
    const total = held.reduce((n, h) => n + Math.max(1, Math.round(h.sec / 60)), 0) + now;
    return (
      <Dialog open={!!menu} close={close} title="まとめて記録">
        <View style={{ gap: 10, paddingHorizontal: 20, paddingBottom: 20 }}>
          {held.map((h) => (
            <Row key={h.id} color={subj(h.s).c} name={subj(h.s).name} min={Math.max(1, Math.round(h.sec / 60))} action="メモを書く" onPress={() => later(() => record(h))} />
          ))}
          {cur.running ? <Row color={subj(cur.subj).c} name={`${subj(cur.subj).name}（勉強中）`} min={now} /> : null}
          <Btn kind="primary" wide label={`ぜんぶ記録する（${jpHm(total)}）`} onPress={() => { close(); session.saveAll(); }} />
          <Btn kind="ghost" wide label="やめる" onPress={close} />
        </View>
      </Dialog>
    );
  }
  const b = m?.kind === 'more' ? m.b : null;
  const live = !!b && cur.running && cur.planBlock === b.id;
  const h = b ? cur.held.find((x) => x.blockId === b.id) : undefined;
  return (
    <Dialog open={!!menu} close={close} title={b ? `${subj(b.s).name}${b.t ? ` · ${b.t}` : ''}` : ''}>
      <View style={{ gap: 10, paddingHorizontal: 20, paddingBottom: 20 }}>
        {live ? (
          <Btn kind="primary" wide label="終わる（記録する）" onPress={() => later(session.finish)} />
        ) : h ? (
          <>
            <Btn kind="primary" wide label={`${Math.max(1, Math.round(h.sec / 60))}分を記録する`} onPress={() => later(() => record(h))} />
            <Btn kind="quiet" wide label="続きから始める" onPress={() => { close(); if (b) begin(b); }} />
          </>
        ) : (
          <Btn kind="primary" wide label="この予定を終わりにする" onPress={() => { if (b) { haptic.success(); finishBlock(b.id); } close(); }} />
        )}
        <Btn kind="quiet" wide label="予定を編集" onPress={() => later(() => b && planSheet({ existing: b }))} />
        <Btn kind="ghost" wide label="やめる" onPress={close} />
      </View>
    </Dialog>
  );
}
function Row({ color, name, min, action, onPress }: { color: string; name: string; min: number; action?: string; onPress?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Txt size={15} w="600" style={{ flex: 1 }} numberOfLines={1}>{name}</Txt>
      <Txt num size={14} tone="ink2">{`${min}分`}</Txt>
      {action && onPress ? (
        <Press onPress={onPress} hitSlop={8} scale={0.94} accessibilityLabel={`${name}に${action}`}>
          <Txt size={13} w="700" tone="ink">{action}</Txt>
        </Press>
      ) : null}
    </View>
  );
}

/** The card drawing of the timer's parts: the page is the deck; the other parts are in it. */
const Nothing = () => null;
export const CARD_PARTS = {
  top: CardTop, switcher: PlanDeck,
  subject: Nothing, readout: Nothing, progress: Nothing, today: Nothing, main: Nothing, record: Nothing,
};
