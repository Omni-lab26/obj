import { Image } from 'expo-image';
import { ReactNode, useEffect, useId, useState } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { type Backdrop, BACKDROPS, BACKDROPS_OPEN, BGS, CARDS, CORNERS, DEFAULT_DESIGN, Design, INKS, STREAK_PEACH, STREAKS, THEME_ROLE, ThemeId, themeId, themeOf, TIMERS, useDesign } from '@/design';
import { FIT_IDS, FIT_LINE, fitGeometry, fitLanding, fitRubber, type FitView } from '@/screens/fitroom';
import { setDesign } from '@/store';
import { focus, hair, lift, radius, useT } from '@/theme';
import { Btn, haptic, IconBtn, Press, Txt } from '@/ui/base';
import { BackdropSwatch, CardFillControl, FrostControl } from '@/ui/BackdropSheet';
import { Wordmark } from '@/ui/Brand';
import { Screen } from '@/ui/Chrome';
import { Pane } from '@/ui/Glass';
import { M, move, present } from '@/ui/motion';
import { openSheet } from '@/ui/Sheet';
import { ring, S, SR, useStd } from '@/ui/stdLook';
import { Sticker } from '@/ui/Sticker';
import { Segmented } from '@/ui/Tabs';
import { toast } from '@/ui/Toast';

// デザイン (試着室, after docs/app/theme-mock/a.html): each theme as a photo of
// home and of the timer in a phone-like card, the neighbours peeking in at the
// sides. Slide it (or ‹ ›, or the dots) to look at the next one; nothing
// changes until 「このテーマにする」. The page itself is drawn in the theme in
// use. The photos are assets/themes (shot from the sample account on the web);
// クラシック's (and サイバー's) own picks are in a sheet. Opened from settings
// 「見た目」 and the side menu's テーマ (src/app/design.tsx).

/** The photos, by theme and screen (assets/themes, 390×740pt shots at 900px wide). */
const SHOTS: Partial<Record<ThemeId, Record<FitView, number>>> = {
  standard: { home: require('../../assets/themes/standard-home.webp'), timer: require('../../assets/themes/standard-timer.webp') },
  cyber: { home: require('../../assets/themes/cyber-home.webp'), timer: require('../../assets/themes/cyber-timer.webp') },
  classic: { home: require('../../assets/themes/classic-home.webp'), timer: require('../../assets/themes/classic-timer.webp') },
};
/** Each card is framed as its theme frames things: ink and lime, a cyan edge with a glow, a hairline and a soft shadow. */
const FRAME: Partial<Record<ThemeId, { r: (w: number) => number; shadow: string }>> = {
  standard: { r: (w) => Math.round(w * 0.11), shadow: `${ring()}, 5px 5px 0px 2px ${S.limeDeep}` },
  cyber: { r: () => 6, shadow: '0px 0px 0px 1px rgba(0,240,255,0.6), 0px 0px 22px rgba(0,240,255,0.18)' },
  classic: { r: (w) => Math.round(w * 0.11), shadow: '0px 0px 0px 0.5px rgba(15,23,42,0.1), 0px 14px 32px rgba(15,23,42,0.16)' },
};
const VIEWS: { v: FitView; label: string }[] = [{ v: 'home', label: 'ホーム' }, { v: 'timer', label: 'タイマー' }];

export function DesignPage({ onClose }: { onClose: () => void }) {
  const std = useStd();
  const insets = useSafeAreaInsets();
  const cur = themeId(useDesign().theme);
  const count = FIT_IDS.length;
  // the theme looked at (where the track is, rounded; it follows the finger while dragging)
  const [at, setAt] = useState(() => Math.max(0, FIT_IDS.indexOf(cur)));
  const [view, setView] = useState<FitView>('home');
  const [room, setRoom] = useState<{ w: number; h: number } | null>(null);
  const geo = room ? fitGeometry(room.w, room.h) : null;

  // the track, in themes (fractional while it moves)
  const pos = useSharedValue(at);
  const step = useSharedValue(geo?.step ?? 1);
  useEffect(() => { if (geo) step.set(geo.step); }, [geo, step]);
  const near = useSharedValue(at);
  const start = useSharedValue(0);
  const active = useSharedValue(false);
  // the finger moves the track 1:1; let go, it lands on the nearer theme or where it was flicked, keeping the finger's speed
  const [drag] = useState(() => Gesture.Pan().activeOffsetX([-10, 10]).failOffsetY([-14, 14])
    .onStart(() => { start.set(pos.get()); active.set(true); })
    .onUpdate((e) => {
      const p = fitRubber(start.get() - e.translationX / step.get(), count - 1);
      pos.set(p);
      const n = Math.max(0, Math.min(count - 1, Math.round(p)));
      if (n !== near.get()) { near.set(n); scheduleOnRN(setAt, n); }
    })
    .onFinalize((e) => {
      if (!active.get()) return;
      active.set(false);
      const from = Math.max(0, Math.min(count - 1, Math.round(start.get())));
      const to = fitLanding(from, e.translationX, e.velocityX, step.get(), count);
      const v = -e.velocityX / step.get();
      pos.set(to === from ? move(to, v) : present(to, v));
      if (to !== near.get()) { near.set(to); scheduleOnRN(setAt, to); }
    }));
  const go = (i: number) => {
    const to = Math.max(0, Math.min(count - 1, i));
    if (to === at) return;
    pos.set(present(to));
    near.set(to);
    setAt(to);
    AccessibilityInfo.announceForAccessibility(`${themeOf(FIT_IDS[to]).label}。${FIT_LINE[FIT_IDS[to]] ?? ''}`);
  };
  const track = useAnimatedStyle(() => ({ transform: [{ translateX: (geo?.off ?? 0) - pos.value * (geo?.step ?? 0) }] }), [geo?.off, geo?.step]);

  const id = FIT_IDS[at];
  const th = themeOf(id);
  const mine = id === cur;
  const choose = () => {
    if (mine) return;
    setDesign({ theme: id });
    toast(`${th.label}にしました`, '記録はそのまま。見た目だけが変わります');
  };
  const pickLabel = id === 'classic' ? '色・角を選ぶ' : id === 'cyber' ? 'カードを選ぶ' : null;

  return (
    <Screen>
      {/* back, the title and the theme in use, home or the timer */}
      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: std ? 12 : 6, paddingHorizontal: std ? 16 : 10, paddingBottom: std ? 4 : 0 }}>
        <IconBtn name="back" label="戻る" onPress={onClose} />
        {/* by the back key (a centered title wouldn't leave the switch room on a small phone) */}
        <View style={{ flex: 1, minWidth: 0 }} accessible accessibilityRole="header" accessibilityLabel={`テーマ。いまは ${themeOf(cur).label}`}>
          <Txt size={16} w={std ? '800' : '700'} lh={20}>テーマ</Txt>
          <Txt size={11.5} tone="ink3" lh={15} numberOfLines={1}>いま：<Txt size={11.5} w="700" lh={15}>{themeOf(cur).label}</Txt></Txt>
        </View>
        <Segmented small={std} value={view} onChange={setView} options={VIEWS} style={std ? undefined : { width: 116 }} />
      </View>

      {/* the cards: one element for VoiceOver, swiped up and down to move through them */}
      <GestureDetector gesture={drag}>
        <View style={{ flex: 1, overflow: 'hidden' }} onLayout={(e) => setRoom({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <View accessible accessibilityRole="adjustable" accessibilityLabel={`テーマの見本（${view === 'home' ? 'ホーム' : 'タイマー'}）。左右にすべらせて見くらべる`}
            accessibilityValue={{ text: `${th.label}${THEME_ROLE[id] ? `、${THEME_ROLE[id]}` : ''}${mine ? '、いまのテーマ' : ''}。${at + 1} / ${count}` }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(e) => go(at + (e.nativeEvent.actionName === 'increment' ? 1 : -1))}
            style={{ flex: 1 }}>
            {geo ? (
              <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 6, flexDirection: 'row', gap: 14 }, track]}>
                {FIT_IDS.map((k, i) => (
                  <Slide key={k} id={k} index={i} pos={pos} w={geo.w} h={geo.h} view={view} shown={Math.abs(i - at) <= 1} />
                ))}
              </Animated.View>
            ) : null}
          </View>
          {geo && at > 0 ? <Side left onPress={() => go(at - 1)} /> : null}
          {geo && at < count - 1 ? <Side onPress={() => go(at + 1)} /> : null}
        </View>
      </GestureDetector>

      {/* the theme looked at: its name and what it is, the dots, and choosing it */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(14, insets.bottom + 4), gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 }}>
          <Txt size={23} w="800" lh={30} numberOfLines={1} style={{ flexShrink: 1 }}>{th.label}</Txt>
          {THEME_ROLE[id] ? <Tag>{THEME_ROLE[id]}</Tag> : null}
          <View style={{ flex: 1 }} />
          {mine ? <Tag on>いまのテーマ</Tag> : null}
        </View>
        <Txt size={13.5} tone="ink2" lh={20} numberOfLines={2} style={{ minHeight: 40 }}>{FIT_LINE[id] ?? ''}</Txt>
        <Dots at={at} onPick={go} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
          {pickLabel ? <Btn label={pickLabel} kind="line" onPress={() => picksSheet(id)} tight style={{ height: 52 }} /> : null}
          <Btn label={mine ? 'いまのテーマ' : 'このテーマにする'} kind="primary" disabled={mine} onPress={choose} style={{ flex: 1, height: 52 }} />
        </View>
      </View>
    </Screen>
  );
}

/** One theme's card: its photo (the shown one and its neighbours only), dimmed as it moves off to the side. */
function Slide({ id, index, pos, w, h, view, shown }: { id: ThemeId; index: number; pos: SharedValue<number>; w: number; h: number; view: FitView; shown: boolean }) {
  const f = FRAME[id] ?? FRAME.classic!;
  const r = f.r(w);
  const a = useAnimatedStyle(() => ({ opacity: 1 - 0.45 * Math.min(1, Math.abs(pos.value - index)) }));
  const src = SHOTS[id]?.[view];
  return (
    <Animated.View style={[{ width: w, height: h, borderRadius: r, boxShadow: f.shadow, backgroundColor: themeOf(id).colors?.canvas ?? BGS.cool.canvas }, a]}>
      {shown && src ? (
        <Image source={src} contentFit="cover" transition={M.fadeIn} style={{ width: w, height: h, borderRadius: r }} accessible={false} />
      ) : null}
    </Animated.View>
  );
}

/** ‹ / ›, over the neighbour at that side. */
function Side({ left, onPress }: { left?: boolean; onPress: () => void }) {
  const std = useStd();
  return (
    <View pointerEvents="box-none" style={[{ position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' }, left ? { left: std ? 8 : 6 } : { right: std ? 8 : 6 }]}>
      <IconBtn name={left ? 'back' : 'chev'} label={left ? '前のテーマ' : '次のテーマ'} onPress={onPress} filled />
    </View>
  );
}

/** A small label by the name: メイン / サブ, and (on) いまのテーマ. */
function Tag({ on, children }: { on?: boolean; children: string }) {
  const t = useT();
  const std = useStd();
  if (std) {
    return (
      <View style={{ paddingHorizontal: 8, height: 24, justifyContent: 'center', borderRadius: SR.chip - 2, backgroundColor: on ? S.lime : S.card, boxShadow: ring(on ? 2 : 1.5) }}>
        <Txt size={12} w="700" lh={16} color={S.ink}>{children}</Txt>
      </View>
    );
  }
  return (
    <View style={{ paddingHorizontal: 9, height: 22, justifyContent: 'center', borderRadius: 11, backgroundColor: on ? t.ink : t.sunken }}>
      <Txt size={11.5} w="700" lh={15} color={on ? t.onInk : t.ink2}>{children}</Txt>
    </View>
  );
}

/** One dot a theme; the one looked at filled. Each is a button to it. */
function Dots({ at, onPick }: { at: number; onPick: (i: number) => void }) {
  const t = useT();
  const std = useStd();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
      {FIT_IDS.map((k, i) => {
        const on = i === at;
        return (
          <Pressable key={k} onPress={() => { if (!on) { haptic.tap(); onPick(i); } }} hitSlop={{ top: 8, bottom: 8 }}
            accessibilityRole="button" accessibilityLabel={themeOf(k).label} accessibilityState={{ selected: on }}
            style={{ width: 32, height: 28, alignItems: 'center', justifyContent: 'center' }}>
            {std
              ? <View style={{ width: 8, height: 8, backgroundColor: on ? S.ink : S.card, boxShadow: ring(1.5) }} />
              : <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: on ? t.ink : t.line2 }} />}
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- クラシック's picks (and サイバー's cards), in a sheet ----------
function picksSheet(id: ThemeId) {
  openSheet((close) => <Picks id={id} close={close} />);
}

function Picks({ id, close }: { id: ThemeId; close: () => void }) {
  const t = useT();
  const std = useStd();
  const d = useDesign();
  const set = (patch: Partial<Design>) => { haptic.tap(); setDesign(patch); };
  // クラシック is drawn with your own picks (地の色・メインの色・角・タイマー); サイバー decides those, but not the My Page card
  const classic = id === 'classic';
  const reset = () => {
    const { bg, ink, corners, card, streak, timer } = DEFAULT_DESIGN;
    setDesign(classic ? { bg, ink, corners, card, streak, timer } : { card, streak });
    haptic.soft();
    toast('はじめの色に戻しました');
  };
  return (
    <View style={{ gap: 4 }}>
      <View style={{ gap: 4, paddingBottom: 2 }}>
        <Txt size={std ? 17 : 16} w={std ? '800' : '700'} lh={24} accessibilityRole="header">{classic ? 'クラシックの色と角' : `${themeOf(id).label}のカード`}</Txt>
        <Txt size={12} tone="ink3" lh={17}>{`選ぶとすぐ保存されます（${themeOf(id).label}のときに使われます）。見本の写真は、はじめの色で撮っています`}</Txt>
      </View>

      {classic ? (
      <>
      {BACKDROPS_OPEN ? (
      <Section title="背景" sub="すべてのページとタイマーのうしろで動きます。カードはすりガラスに">
        <Options value={d.backdrop} onChange={(backdrop) => set({ backdrop })} cols={4} items={BACKDROP_ORDER.map((k) => ({ k, label: BACKDROPS[k].label, swatch: (
          <View style={{ alignItems: 'center' }}><BackdropSwatch id={k} /></View>
        ) }))} />
        {d.backdrop !== 'none' ? <><FrostControl /><CardFillControl /></> : null}
      </Section>
      ) : null}

      {!BACKDROPS_OPEN || d.backdrop === 'none' ? (
      <Section title="地の色">
        <Options value={d.bg} onChange={(bg) => set({ bg })} cols={5} items={keys(BGS).map((k) => ({ k, label: BGS[k].label, swatch: (
          <View style={{ width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: BGS[k].canvas, borderWidth: hair, borderColor: t.line2, padding: 7, justifyContent: 'flex-end' }}>
            <View style={{ height: '45%', borderRadius: 5, backgroundColor: '#fff', ...lift(t) }} />
          </View>
        ) }))} />
      </Section>
      ) : null}

      <Section title="メインの色" sub="文字とボタンの色">
        <Options value={d.ink} onChange={(ink) => set({ ink })} cols={5} items={keys(INKS).map((k) => ({ k, label: INKS[k].label, swatch: (
          <View style={{ width: '100%', aspectRatio: 1, borderRadius: 999, backgroundColor: INKS[k].ink, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={15} w="800" color="#fff">あ</Txt>
          </View>
        ) }))} />
      </Section>

      <Section title="カードの角">
        <Options value={d.corners} onChange={(corners) => set({ corners })} cols={3} items={keys(CORNERS).map((k) => ({ k, label: CORNERS[k].label, swatch: (
          <View style={{ width: '100%', height: 54, borderRadius: CORNERS[k].card, backgroundColor: '#fff', borderWidth: hair, borderColor: t.line2 }} />
        ) }))} />
      </Section>

      <Section title="タイマーの画面">
        <Options value={d.timer} onChange={(timer) => set({ timer })} cols={5} items={keys(TIMERS).map((k) => ({ k, label: TIMERS[k].label, swatch: (
          <View style={{ width: '100%', aspectRatio: 0.7, borderRadius: 10, backgroundColor: TIMERS[k].bg, alignItems: 'center', justifyContent: 'center' }}>
            <Txt num size={11} w="700" color={focus.ink}>39:14</Txt>
          </View>
        ) }))} />
      </Section>
      </>
      ) : null}

      <Section title="マイページのカード">
        <Options value={d.card} onChange={(card) => set({ card })} cols={3} items={keys(CARDS).map((k) => ({ k, label: CARDS[k].label, swatch: <MiniCard look={k} /> }))} />
      </Section>

      <Section title="連続記録のカプセル">
        <Options value={d.streak} onChange={(streak) => set({ streak })} cols={3} items={keys(STREAKS).map((k) => ({ k, label: STREAKS[k].label, swatch: <MiniStreak look={k} /> }))} />
      </Section>

      <View style={{ gap: 6, paddingTop: 22 }}>
        <Btn label="できた" kind="primary" wide onPress={close} />
        <Btn label="はじめの色に戻す" kind="ghost" wide onPress={reset} />
      </View>
    </View>
  );
}

const keys = <T extends object>(o: T) => Object.keys(o) as (keyof T)[];
const BACKDROP_ORDER: Backdrop[] = ['pond', 'sea', 'walk', 'none'];

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  const std = useStd();
  return (
    <View style={{ paddingTop: 18, gap: std ? 12 : 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        {/* on a narrow phone the note wraps, never the title */}
        <Txt size={std ? 15 : 14} w="700" style={{ flexShrink: 0 }}>{title}</Txt>
        {sub ? <Txt size={11.5} tone="ink3" style={{ flex: 1 }}>{sub}</Txt> : null}
      </View>
      {children}
    </View>
  );
}

/** スタンダード: a choice is the card's color in a thin ink outline; the picked one lime, in the full outline. */
const PICK = (on: boolean) => ({ borderWidth: 0, borderRadius: SR.mid, backgroundColor: on ? S.lime : S.card, boxShadow: ring(on ? 2 : 1.5) });
/** A row of choices, each a picture of the result with its name under it. */
function Options<K extends string | number | symbol>({ value, onChange, items, cols }: { value: K; onChange: (k: K) => void; items: { k: K; label: string; swatch: ReactNode }[]; cols: number }) {
  const t = useT();
  const std = useStd();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
      {items.map((x) => {
        const on = x.k === value;
        return (
          <Press key={String(x.k)} onPress={() => onChange(x.k)} haptics={false} scale={0.95} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={x.label}
            style={[{ width: `${(100 - (cols - 1) * 2.4) / cols}%`, padding: cols > 3 ? 4 : 6, gap: 6, borderRadius: radius.inner + 4, alignItems: 'center',
              backgroundColor: t.surface, borderWidth: on ? 2 : hair, borderColor: on ? t.ink : t.line }, std && PICK(on)]}>
            <Pane radius={radius.inner + 4} small />
            {x.swatch}
            <Txt size={cols > 3 ? 10 : 11} w={on ? '700' : '500'} tone={on ? 'ink' : 'ink2'} numberOfLines={1} style={{ letterSpacing: cols > 3 ? -0.3 : 0 }}>{x.label}</Txt>
          </Press>
        );
      })}
    </View>
  );
}

function MiniCard({ look }: { look: keyof typeof CARDS }) {
  const c = CARDS[look];
  const id = `mc${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={{ width: '100%', aspectRatio: 85.6 / 53.98, borderRadius: 6, overflow: 'hidden', borderWidth: hair, borderColor: c.dark ? 'transparent' : 'rgba(17,20,23,0.12)' }}>
      <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c.grad[0]} />
            <Stop offset="0.55" stopColor={c.grad[1]} />
            <Stop offset="1" stopColor={c.grad[2]} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      <View style={{ padding: 5 }}>
        <Wordmark size={8} color={c.dark ? '#fff' : '#121417'} />
      </View>
    </View>
  );
}

function MiniStreak({ look }: { look: keyof typeof STREAKS }) {
  const t = useT();
  const light = look === 'white';
  return (
    <View style={{ width: '100%', height: 30, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 4,
      backgroundColor: look === 'ink' ? t.ink : light ? t.surface : STREAK_PEACH.bg, borderWidth: look === 'ink' ? 0 : hair, borderColor: light ? t.line2 : STREAK_PEACH.edge }}>
      <Sticker name="fire" size={20} />
      <Txt num size={12} w="800" color={light ? t.ink : look === 'peach' ? STREAK_PEACH.fg : look === 'ink' ? t.onInk : '#fff'}>23</Txt>
    </View>
  );
}
