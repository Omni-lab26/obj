import { router } from 'expo-router';
import { ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn, FadeOut, interpolateColor, LayoutAnimationConfig, LinearTransition, makeMutable, type SharedValue,
  useAnimatedReaction, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withDelay, withTiming, ZoomOut,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { hm, subj } from '@/data';
import type { Zone, Zones } from '@/screens/layout';
import { jpHm, session, startBlock, useSession } from '@/screens/model';
import { jpDate } from '@/lib/time';
import { deckOf, endOf, suggestion, type Block } from '@/lib/timetable';
import { type Backdrop, TIMER_FILM, useDesign } from '@/design';
import { doneOn, elapsedOf, finishBlock, getState, type Held, togglePause, useStore } from '@/store';
import { focus } from '@/theme';
import { Btn, haptic, Press, Txt } from '@/ui/base';
import { Dialog } from '@/ui/Dialog';
import { Icon } from '@/ui/Icon';
import { orderSheet } from '@/ui/OrderSheet';
import { PlanArt } from '@/ui/PlanArt';
import { glyphOf, SubjectGlyph } from '@/ui/SubjectGlyph';
import { planSheet } from '@/ui/PlanSheets';
import { BackdropView } from '@/ui/backdrop/Backdrop';
import { backdropAvoid, feedAt, FLOOR, isDarkBackdrop, useBackdrop } from '@/ui/backdrop/shared';
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
// leaves; the card in front adds one. Under the cards, fixed, the time studied
// and the line toward the plan's end: green inside it, red past it.
//
// Behind it all, the theme you pick (テーマ): the koi pond (they swim around
// the card, never under it), sharks in a pale sea (the cards frosted glass),
// people walking over a glass floor, or the centered card's color. 眺める fades the words away and leaves the background.

/** The measured card, in points, on a 393pt-wide screen; everything scales with it. */
const BASE_W = 281, RATIO = 439 / 281, GAP = 10, SIDE = 0.95, DIM = 0.45;
/** What sits around the cards: the heading, the pager, the time studied. */
const AROUND = 220;
const ADD_COLOR = '#4A5062';
const WITHIN = '#30D158';
const OVER = '#FF453A';
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
    opacity: withTiming(look ? 0 : 1, { duration: 450 }),
    transform: [{ translateX: look ? withDelay(460, withTiming(10000, { duration: 0 })) : 0 }],
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
  const ss = useSession();
  const tone = isLight(bg) ? ON_LIGHT : ON_DARK;
  const [hint, setHint] = useState(true);
  useEffect(() => { const id = setTimeout(() => setHint(false), 6000); return () => clearTimeout(id); }, []);
  return (
    <Animated.View entering={FadeIn.duration(600).delay(200)} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {bg === 'walk' ? <WalkerTags /> : null}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: 64, left: 0, right: 0, alignItems: 'center', gap: 8 }}>
        <Txt num size={34} w="700" color={ss.paused ? (tone.light ? CRIMSON : CRIMSON_ON_DARK) : tone.ink} style={{ textShadowColor: tone.shade, textShadowRadius: 12 }}>
          {fmt(ss.running ? ss.elapsed : 0)}
        </Txt>
        <Press onPress={() => { haptic.tap(); looking.set(false); }} scale={0.94} hitSlop={8} accessibilityLabel="眺めるのをやめる"
          style={{ height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: tone.chip, justifyContent: 'center' }}>
          <Txt size={12.5} w="700" color={tone.ink}>戻る</Txt>
        </Press>
      </View>
      {hint ? (
        <Animated.View exiting={FadeOut.duration(800)} pointerEvents="none" style={{ position: 'absolute', bottom: 46, left: 0, right: 0, alignItems: 'center' }}>
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
                <PlanCard b={b} no={i + 1} i={i + 1} x={x} step={step} k={k} tone={tone} live={b.id === live} held={heldOf.get(b.id)}
                  begin={begin} record={record} more={() => { haptic.tap(); setMenu({ kind: 'more', b }); }} />
              </Slide>
            ))}
          </Animated.ScrollView>
        </LayoutAnimationConfig>
      </View>

      <Pager x={x} step={step} n={n} tone={tone} label={shown === 0 ? '追加' : `${shown} / ${cards.length}`} />
      <Elapsed tone={tone} />
      {held.length ? <Waiting held={held} tone={tone} onPress={() => { haptic.tap(); setMenu({ kind: 'all' }); }} /> : null}

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
    <Animated.View layout={LinearTransition.springify().damping(20).stiffness(180)} entering={FadeIn.duration(260)} exiting={ZoomOut.duration(260)} style={{ width: w, height: h }}>
      <Animated.View style={[{ flex: 1, borderRadius: 16 * k, overflow: 'hidden' }, a]}>
        {children}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tone.light ? FLOOR : '#000000' }, dim]} />
        {centered ? null : <Press onPress={onFocus} haptics={false} scale={1} style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }} accessibilityLabel="この予定を真ん中に" />}
      </Animated.View>
    </Animated.View>
  );
}

// ---------- the card ----------
/** Two colors (#RRGGBB) mixed. */
function mix(a: string, b: string, t: number) {
  const x = parseInt(a.slice(1, 7), 16), y = parseInt(b.slice(1, 7), 16);
  const ch = (s: number) => Math.round(((x >> s) & 255) + (((y >> s) & 255) - ((x >> s) & 255)) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}
/**
 * How a card is colored: quiet, and a little of the background in it. Over
 * a 背景 the card is white glass, a touch of Liquid Glass in it (ui/Glass
 * Pane liquid: a rim catching the light, kept quiet); with no 背景, the
 * subject's color taken down. The subject's own color shows only in its
 * cover, quieted too.
 */
type Skin = {
  paper: string; edge: string; ink: string; ink2: string; ink3: string; solid: string; onSolid: string; outline: string; cover: string; dim: string; live: string; stop: string;
  /** glass: what's behind shows through, blurred */
  frost?: boolean;
};
const COVER_BASE: Record<Exclude<Backdrop, 'none'>, string> = { pond: '#D3DDD9', sea: '#D3D9E0', walk: '#D9D7D0' };
function skinOf(bg: Backdrop, c: string, film = 0.4): Skin {
  if (bg !== 'none') {
    return { paper: `rgba(250,250,248,${film})`, edge: 'transparent', ink: '#1A1A18', ink2: 'rgba(26,26,24,0.64)', ink3: 'rgba(26,26,24,0.44)', solid: '#1A1A18', onSolid: '#FBFBF9',
      outline: 'rgba(26,26,24,0.22)', cover: mix(c, COVER_BASE[bg], 0.48), dim: FLOOR, live: '#1E7A46', stop: CRIMSON, frost: true };
  }
  const base = mix(c, '#12141A', 0.72);
  return { paper: base, edge: 'rgba(255,255,255,0.09)', ink: '#E8ECEF', ink2: 'rgba(232,236,239,0.62)', ink3: 'rgba(232,236,239,0.4)', solid: '#E8ECEF', onSolid: base,
    outline: 'rgba(232,236,239,0.22)', cover: mix(c, '#12141A', 0.38), dim: '#000000', live: '#5FD08E', stop: CRIMSON_ON_DARK };
}
const useSkin = (c: string) => skinOf(useBackdrop(), c, TIMER_FILM[useDesign().cardFill ?? 1]);

/**
 * A plan's card, like a notebook: its picture at the top (the photo you
 * picked, or a plain cover in the subject's quieted color with its name), the
 * subject and time, what to do, the memo, and its buttons at the bottom —
 * 始める; while it runs, 一時停止 and 終わる; paused, 再開 and 終わる; set aside,
 * 記録する and 続ける. ··· has the rest.
 */
function PlanCard({ b, no, i, x, step, k, tone, live, held, begin, record, more }: {
  b: Block; no: number; i: number; x: SharedValue<number>; step: number; k: number; tone: Tone; live: boolean; held?: Held;
  begin: (b: Block) => void; record: (h: Held) => void; more: () => void;
}) {
  const paused = useStore((s) => s.paused);
  const sj = subj(b.s);
  const sk = useSkin(sj.c);
  const art = Math.round(251 * k);
  const glyph = glyphOf(sj.name, sj.area);
  const drift = useAnimatedStyle(() => ({ transform: [{ translateX: Math.max(-1, Math.min(1, (x.value - i * step) / step)) * 0.05 * step }, { scale: 1.14 }] }));
  const time = b.start ? (b.min ? `${b.start}–${endOf(b)}` : `${b.start}から`) : '時刻なし';
  const min = held ? Math.max(1, Math.round(held.sec / 60)) : 0;
  const state = live ? (paused ? '一時停止中' : '勉強中') : held ? `記録まち · ${min}分` : time;
  const fs = (v: number, lo: number) => Math.max(lo, v * k);
  return (
    <View style={{ flex: 1, backgroundColor: sk.paper, borderRadius: 16 * k, borderWidth: sk.frost ? 0 : StyleSheet.hairlineWidth, borderColor: sk.edge }}>
      {sk.frost ? <Pane radius={16 * k} liquid /> : null}
      {/* the picture */}
      <View style={{ position: 'absolute', left: 14 * k, top: 14 * k, width: art + 2 * k, height: art, borderRadius: 10 * k, overflow: 'hidden', backgroundColor: sk.cover }}>
        <Animated.View style={drift}>
          {b.icon ? <PlanArt icon={b.icon} name={sj.name} color={sj.c} size={art + 2 * k} radius={0} /> : <View style={{ width: art + 2 * k, height: art }} />}
        </Animated.View>
        {b.icon ? null : (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { padding: 14 * k, justifyContent: 'space-between' }]}>
            {/* the subject's picture, big and quiet on its cover (化学 a flask …) */}
            {glyph ? <View style={{ position: 'absolute', right: 16 * k, top: 40 * k }}><SubjectGlyph glyph={glyph} size={art * 0.42} color="rgba(255,255,255,0.5)" width={1.4} /></View> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt num size={fs(11, 10)} w="600" color="rgba(255,255,255,0.78)">{String(no).padStart(2, '0')}</Txt>
              <Txt num size={fs(11, 10)} w="600" color="rgba(255,255,255,0.78)">{b.start ?? ''}</Txt>
            </View>
            <View>
              <Txt size={fs(34, 24)} w="800" lh={fs(38, 27)} color="rgba(255,255,255,0.96)" numberOfLines={1}>{sj.name}</Txt>
              {b.t ? <Txt size={fs(12, 10.5)} w="500" color="rgba(255,255,255,0.75)" numberOfLines={1}>{b.t}</Txt> : null}
            </View>
          </View>
        )}
      </View>

      {/* what it is */}
      <View style={{ position: 'absolute', left: 15 * k, right: 15 * k, top: 279 * k, gap: 3 * k }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 7 * k, height: 7 * k, borderRadius: 2, backgroundColor: sj.c }} />
          <Txt size={fs(12, 10.5)} w="600" color={sk.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>{sj.name}</Txt>
          <Txt num size={fs(12, 10.5)} color={live && !paused ? sk.live : live ? sk.stop : sk.ink3} numberOfLines={1}>{`· ${state}`}</Txt>
        </View>
        <Txt size={fs(16.5, 13.5)} lh={fs(21, 17)} w="700" color={sk.ink} numberOfLines={2}>{b.t ?? sj.task}</Txt>
        {b.note ? <Txt size={fs(12.5, 11)} lh={fs(17, 15)} color={sk.ink2} numberOfLines={2}>{b.note}</Txt> : null}
      </View>

      {/* everything about it happens here */}
      <View style={{ position: 'absolute', left: 14 * k, right: 10 * k, top: 384 * k, height: 40 * k, flexDirection: 'row', alignItems: 'center', gap: 8 * k }}>
        {live ? (
          <>
            <CardBtn sk={sk} k={k} solid={paused} label={paused ? '再開' : '一時停止'} icon={paused ? 'play' : 'pause'} a11y={paused ? `${sj.name}を再開` : `${sj.name}を一時停止`}
              onPress={() => { haptic.soft(); togglePause(); }} />
            <CardBtn sk={sk} k={k} solid={!paused} label="終わる" a11y={`${sj.name}を終わる（記録する）`} onPress={session.finish} />
          </>
        ) : held ? (
          <>
            <CardBtn sk={sk} k={k} solid label={`記録する · ${min}分`} a11y={`${sj.name} ${min}分を記録する`} onPress={() => record(held)} />
            <CardBtn sk={sk} k={k} label="続ける" a11y={`${sj.name}を続きから始める`} onPress={() => begin(b)} />
          </>
        ) : (
          <CardBtn sk={sk} k={k} solid label="始める" icon="play" a11y={`${sj.name}を始める（${time}）`} onPress={() => begin(b)} />
        )}
        <Press onPress={more} scale={0.9} hitSlop={6} accessibilityLabel={`${sj.name}の予定のメニュー`}
          style={{ width: 36 * k, height: 40 * k, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="more" size={20 * k} color={sk.ink2} />
        </Press>
      </View>
    </View>
  );
}

/** A button on a card: ink (the next thing to do) or a hairline outline (the other). */
function CardBtn({ sk, k, solid, label, icon, a11y, onPress }: { sk: Skin; k: number; solid?: boolean; label: string; icon?: 'play' | 'pause'; a11y: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} haptics={false} scale={0.96} accessibilityLabel={a11y}
      style={{ flex: 1, height: 40 * k, borderRadius: 10 * k, backgroundColor: solid ? sk.solid : 'transparent', borderWidth: solid ? 0 : 1, borderColor: sk.outline,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 * k }}>
      {icon ? <Icon name={icon} size={11 * k} color={solid ? sk.onSolid : sk.ink} filled /> : null}
      <Txt size={Math.max(12.5, 14 * k)} w="700" color={solid ? sk.onSolid : sk.ink} numberOfLines={1}>{label}</Txt>
    </Press>
  );
}

/** The card in front: adds a plan to today. Clear, with only an edge (over a 背景, clear glass). */
function AddCard({ w, h, k, tone, onPress }: { w: number; h: number; k: number; tone: Tone; onPress: () => void }) {
  // over a 背景 it's glass like the other cards (and needs no edge)
  const glass = useBackdrop() !== 'none';
  return (
    <Press onPress={onPress} haptics={false} scale={0.98} accessibilityLabel="今日の時間割に予定を追加"
      style={{ width: w, height: h, borderRadius: 16 * k, borderWidth: glass ? 0 : 1, borderColor: tone.light ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.22)',
        backgroundColor: glass ? 'rgba(255,255,255,0.22)' : tone.light ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', gap: 6 * k, paddingHorizontal: 24 * k }}>
      {glass ? <Pane radius={16 * k} liquid /> : null}
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
 * The time studied, fixed under the cards so it stays in view whichever plan
 * you look at; the only thing that changes every second. Started from a plan,
 * a line under it fills green toward the plan's end and turns red past it.
 */
function Elapsed({ tone }: { tone: Tone }) {
  const ss = useSession();
  const today = useStore((s) => s.todayMin);
  const sec = ss.running ? ss.elapsed : 0;
  const over = !!ss.plan && sec > ss.plan;
  const top = ss.running ? `${ss.subject.name}${ss.plan ? ` · 予定${jpHm(ss.plan / 60)}` : ''}` : 'カードの「始める」で始まります';
  const below = !ss.running ? `今日 ${hm(today)}`
    : ss.next ? `次 ${ss.next.subject.name} ${ss.next.at}まで`
    : ss.plan ? (over ? `予定を ${fmt(sec - ss.plan)} こえて` : `あと ${fmt(ss.plan - sec)}`)
    : `今日 ${hm(today)}`;
  // over a 背景, the time sits on a quiet pane of glass, so the koi passing under it never cover it
  const glass = useBackdrop() !== 'none';
  const fill = useDesign().cardFill ?? 1;
  return (
    <View pointerEvents="none" accessible accessibilityRole={ss.plan ? 'progressbar' : undefined}
      style={glass ? { marginHorizontal: 10, marginTop: 14, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 12, borderRadius: 18, backgroundColor: `rgba(255,255,255,${TIMER_FILM[fill] * 0.8})` } : { marginHorizontal: 20, marginTop: 22 }}
      accessibilityLabel={ss.running ? `勉強した時間 ${fmt(sec)}${ss.paused ? '（一時停止中）' : ''}。${top}。${below}` : `${top}。${below}`}>
      {glass ? <Pane radius={18} blur /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <Txt num size={40} w="700" lh={46} color={!ss.running ? tone.ink3 : ss.paused ? (tone.light ? CRIMSON : CRIMSON_ON_DARK) : tone.ink}
          style={{ textShadowColor: tone.shade, textShadowRadius: 10 }}>{fmt(sec)}</Txt>
        <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end', paddingBottom: 4 }}>
          <Txt size={12.5} lh={17} color={tone.ink2} numberOfLines={1} style={{ textShadowColor: tone.shade, textShadowRadius: 8 }}>{top}</Txt>
          <Txt num size={12.5} lh={17} color={over ? OVER : tone.ink2} numberOfLines={1} style={{ textShadowColor: tone.shade, textShadowRadius: 8 }}>{below}</Txt>
        </View>
      </View>
      <View style={{ height: 3, borderRadius: 2, marginTop: 12, backgroundColor: tone.light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)', overflow: 'hidden', opacity: ss.running && ss.plan ? 1 : 0 }}>
        <View style={{ width: `${ss.plan ? Math.min(100, (sec / ss.plan) * 100) : 0}%`, height: '100%', borderRadius: 2, backgroundColor: over ? OVER : WITHIN }} />
      </View>
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
