import { usePathname } from 'expo-router';
import { ComponentRef, ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BACKDROPS_OPEN } from '../design';
import { setState, useStore } from '../store';
import { useT } from '../theme';
import { backdropClock, backdropHeld } from './backdrop/shared';
import Svg, { Path } from 'react-native-svg';

import { Creature } from '../themes/standard/pixel';
import { haptic, Press, StdKey, Txt } from './base';
import { fadeIn, fadeOut } from './motion';
import { LIFT, S, useStd } from './stdLook';

// The first-run tour: a few speech bubbles, each pointing at the thing it
// explains (the study bar's 勉強を開始, the bar while studying, the middle tab,
// マイページ, the messages button), with the rest of the screen dimmed around
// it, and where the menu is (slide home to the right). The places mark
// themselves with <TourSpot id>; a step whose place isn't on screen (another
// theme, a session already running) is left out. 次へ goes on, スキップ ends
// it; it shows once (tourDone), and 設定 › 使い方をもう一度見る brings it back.
// Light on purpose: each step is drawn still and only fades in (nothing is
// laid out frame by frame), and the 背景 stands still while it's up.

type Rect = { x: number; y: number; w: number; h: number };
const spots = new Map<string, ComponentRef<typeof View>>();

/** Marks a place the tour can point at. */
export function TourSpot({ id, children, style }: { id: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    const v = ref.current;
    if (v) spots.set(id, v);
    return () => { if (spots.get(id) === v) spots.delete(id); };
  }, [id]);
  return <View ref={ref} collapsable={false} style={style}>{children}</View>;
}

const measure = (id: string) => new Promise<Rect | null>((done) => {
  const v = spots.get(id);
  if (!v) { done(null); return; }
  v.measureInWindow((x, y, w, h) => done(w > 0 && h > 0 ? { x, y, w, h } : null));
});

type Step = { at?: string[]; title: string; body: string };
/** In order; `at`: the places it may point at, the first one on screen wins (none: a bubble in the middle). */
const STEPS: Step[] = [
  { title: 'Inchly へようこそ', body: '使い方を少しだけ紹介します。あとで メニューの 設定 › 使い方をもう一度見る から、いつでも見られます。' },
  { at: ['start'], title: '勉強はここから', body: '「勉強を開始」を押すと、すぐタイマーが始まります。時間割の予定があればその予定で、なければ自習で始まり、科目はあとから付けられます。' },
  { at: ['bar'], title: '勉強中はこのバー', body: '進んでいる時間がここに出ます。押すとタイマーのカード、下に引くと止めて記録できます。' },
  { at: ['tab-study'], title: '時間割と締切', body: '予定を入れておくと、その時刻に下のバーに出て、1タップで始められます。終えた予定には ✓ が付きます。' },
  { at: ['tab-me'], title: 'グラフで振り返る', body: 'マイページで、この7日間とこれまでの勉強時間をグラフで見られます。棒を押すと、何を勉強したかの内訳も出ます。' },
  { at: ['messages'], title: 'メッセージ', body: '右上の吹き出しから、仲間と1対1でやりとりできます。' },
  { title: 'メニューは右にスワイプ', body: `ホームを右にスワイプすると、設定・テーマ・${BACKDROPS_OPEN ? '背景・' : ''}科目と色のメニューが出ます。` },
  { title: '準備OK', body: 'さっそく下の「勉強を開始」から始めてみよう。' },
];

export function TourHost() {
  const done = useStore((s) => s.tourDone);
  const signedIn = useStore((s) => !!s.account);
  const home = usePathname() === '/';
  const [steps, setSteps] = useState<{ step: Step; rect: Rect | null }[] | null>(null);
  const [i, setI] = useState(0);
  // on home, once signed in and not seen yet: look for the places, then begin
  useEffect(() => {
    if (done || !signedIn || !home || steps) return;
    let off = false;
    const id = setTimeout(async () => {
      const list: { step: Step; rect: Rect | null }[] = [];
      for (const s of STEPS) {
        if (!s.at) { list.push({ step: s, rect: null }); continue; }
        let rect: Rect | null = null;
        for (const a of s.at) { rect = await measure(a); if (rect) break; }
        if (rect) list.push({ step: s, rect });
      }
      if (!off) { setI(0); setSteps(list); }
    }, 700);
    return () => { off = true; clearTimeout(id); };
  }, [done, signedIn, home, steps]);
  // the 背景 stands still while the tour is up (released when it ends)
  const up = !done && !!steps;
  useEffect(() => {
    if (!up) return;
    backdropHeld.value = backdropClock.value + 1e9;
    return () => { backdropHeld.value = 0; };
  }, [up]);
  if (done || !steps || !steps[i]) return null;
  // over: forget the places (brought back from 設定, it looks for them afresh)
  const end = () => { haptic.tap(); setSteps(null); setState({ tourDone: true }); };
  const next = () => { if (i + 1 >= steps.length) end(); else { haptic.tap(); setI(i + 1); } };
  // each step is its own still picture, faded in
  return <Bubble key={i} step={steps[i].step} rect={steps[i].rect} n={steps.length} i={i} next={next} skip={end} />;
}

const PAD = 6;
function Bubble({ step, rect, n, i, next, skip }: { step: Step; rect: Rect | null; n: number; i: number; next: () => void; skip: () => void }) {
  const t = useT();
  const std = useStd();
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // the hole around the place (none: the whole screen dimmed)
  const r = rect ? { x: rect.x - PAD, y: rect.y - PAD, w: rect.w + PAD * 2, h: rect.h + PAD * 2 } : { x: W / 2, y: H / 2, w: 0, h: 0 };
  // the dim: one still view whose thick border is the dim and whose inside is the hole, so the hole has round corners
  const B = Math.max(W, H);
  const R = 14;

  // the bubble: above the place when it's low on the screen, else below; its tail points at the place's middle
  const BW = Math.min(320, W - 32);
  const below = rect ? r.y + r.h / 2 < H / 2 : false;
  const cx = rect ? r.x + r.w / 2 : W / 2;
  const bx = Math.max(16, Math.min(W - 16 - BW, cx - BW / 2));
  const tail = Math.max(18, Math.min(BW - 18, cx - bx));
  const pos: ViewStyle = !rect
    ? { left: bx, top: H * 0.36 }
    : below ? { left: bx, top: r.y + r.h + 14 } : { left: bx, bottom: H - r.y + 14 };
  const last = i === n - 1;
  if (std) {
    // スタンダード (the mock's tour): the dim in ink, the hole edged in the card's color; the bubble is paper with
    // the ink outline and the lime shadow, its tail drawn in ink; めぶ says hello on the first step and is happy on the last
    const pix = i === 0 ? 'idle' : last ? 'happy' : null;
    const DIM = 'rgba(23,18,31,0.58)';
    // the dim's outer corners are as round as its border is thick: thick enough that they stay past every corner of the screen
    const BS = W + H;
    const tailX = tail - 10;
    return (
      <Animated.View entering={fadeIn()} exiting={fadeOut()} style={StyleSheet.absoluteFill} accessibilityViewIsModal>
        <Pressable style={StyleSheet.absoluteFill} onPress={next} accessibilityLabel="次へ">
          {rect ? (
            <>
              <View style={{ position: 'absolute', left: r.x - BS, top: r.y - BS, width: r.w + BS * 2, height: r.h + BS * 2, borderWidth: BS, borderRadius: BS + R, borderColor: DIM }} />
              <View pointerEvents="none" style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: R, boxShadow: `0px 0px 0px 2px ${S.card}` }} />
            </>
          ) : <View style={[StyleSheet.absoluteFill, { backgroundColor: DIM }]} />}
        </Pressable>
        <View style={[{ position: 'absolute', width: BW }, pos, rect ? (below ? { top: r.y + r.h + 16 } : { bottom: H - r.y + 16 }) : null]} accessibilityLiveRegion="polite">
          <View style={{ backgroundColor: S.card, borderRadius: 18, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 14, gap: 6, boxShadow: LIFT }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {pix ? <Creature id="mebu" face={pix} px={3} /> : null}
              <Txt size={16} w="800" lh={22} style={{ flex: 1 }} accessibilityRole="header">{step.title}</Txt>
            </View>
            <Txt size={14} tone="ink2" lh={23}>{step.body}</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 5, flex: 1 }} accessible accessibilityLabel={`${i + 1} / ${n}`}>
                {Array.from({ length: n }, (_, k) => <View key={k} style={{ width: 7, height: 7, backgroundColor: k === i ? S.ink : S.line2 }} />)}
              </View>
              {last ? null : (
                <Pressable onPress={skip} hitSlop={10} accessibilityRole="button" accessibilityLabel="使い方をスキップ" style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
                  <Txt size={14} w="600" tone="ink3">スキップ</Txt>
                </Pressable>
              )}
              <StdKey onPress={next} label={last ? '使い方を終わる' : '次へ'} kd={3} style={{ minHeight: 32, marginBottom: 3 }} face={{ minHeight: 32, paddingHorizontal: 12 }}>
                <Txt size={13} w="700" lh={17}>{last ? 'はじめる' : '次へ'}</Txt>
              </StdKey>
            </View>
          </View>
          {/* the tail: paper filled, edged in ink, over the bubble's outline */}
          {rect ? (
            <Svg width={20} height={11} viewBox="0 0 20 11" style={{ position: 'absolute', left: tailX, ...(below ? { top: -10 } : { bottom: -10 }) }}>
              {below ? (
                <>
                  <Path d="M0 11L10 1l10 10z" fill={S.card} />
                  <Path d="M0 11L10 1l10 10" fill="none" stroke={S.ink} strokeWidth={2} />
                </>
              ) : (
                <>
                  <Path d="M0 0l10 10L20 0z" fill={S.card} />
                  <Path d="M0 0l10 10L20 0" fill="none" stroke={S.ink} strokeWidth={2} />
                </>
              )}
            </Svg>
          ) : null}
        </View>
        <View style={{ height: insets.bottom }} />
      </Animated.View>
    );
  }
  return (
    <Animated.View entering={fadeIn()} exiting={fadeOut()} style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      {/* the dim around the place (a tap anywhere goes on) */}
      <Pressable style={StyleSheet.absoluteFill} onPress={next} accessibilityLabel="次へ">
        {rect ? (
          <>
            <View style={{ position: 'absolute', left: r.x - B, top: r.y - B, width: r.w + B * 2, height: r.h + B * 2, borderWidth: B, borderRadius: B + R, borderColor: 'rgba(10,14,20,0.55)' }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: R, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)' }} />
          </>
        ) : <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,14,20,0.55)' }]} />}
      </Pressable>
      <View style={[{ position: 'absolute', width: BW }, pos]} accessibilityLiveRegion="polite">
        {rect && below ? <View style={{ position: 'absolute', top: -7, left: tail - 8, width: 16, height: 16, backgroundColor: t.dark ? '#24272B' : '#FFFFFF', transform: [{ rotate: '45deg' }], borderRadius: 3 }} /> : null}
        <View style={{ backgroundColor: t.dark ? '#24272B' : '#FFFFFF', borderRadius: 16, padding: 16, gap: 6, boxShadow: '0px 12px 32px rgba(0,0,0,0.22)' }}>
          <Txt size={16} w="700">{step.title}</Txt>
          <Txt size={14} tone="ink2" lh={21}>{step.body}</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 }}>
            {/* where you are: a dot per step */}
            <View style={{ flexDirection: 'row', gap: 5, flex: 1 }} accessible accessibilityLabel={`${i + 1} / ${n}`}>
              {Array.from({ length: n }, (_, k) => <View key={k} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: k === i ? t.blue : t.line2 }} />)}
            </View>
            {last ? null : (
              <Press onPress={skip} hitSlop={8} scale={0.94} accessibilityLabel="使い方をスキップ">
                <Txt size={14} tone="ink3">スキップ</Txt>
              </Press>
            )}
            <Press onPress={next} scale={0.94} accessibilityLabel={last ? '使い方を終わる' : '次へ'}
              style={{ height: 34, paddingHorizontal: 16, borderRadius: 17, backgroundColor: t.blue, justifyContent: 'center' }}>
              <Txt size={14} w="600" color="#fff">{last ? 'はじめる' : '次へ'}</Txt>
            </Press>
          </View>
        </View>
        {rect && !below ? <View style={{ position: 'absolute', bottom: -7, left: tail - 8, width: 16, height: 16, backgroundColor: t.dark ? '#24272B' : '#FFFFFF', transform: [{ rotate: '45deg' }], borderRadius: 3 }} /> : null}
      </View>
      {/* keep clear of the home indicator */}
      <View style={{ height: insets.bottom }} />
    </Animated.View>
  );
}
