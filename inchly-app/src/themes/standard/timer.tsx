import { ReactNode, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { subj } from '@/data';
import { useDesign } from '@/design';
import { endOf } from '@/lib/timetable';
import { jpHm, session, useTicking } from '@/screens/model';
import { type CardFaceProps, type CardLook, clock } from '@/screens/timer/cards';
import { elapsedOf, type Held, sameFav, setDesign, toggleFavorite, togglePause, useStore } from '@/store';
import { T } from '@/themes/kit';
import { haptic } from '@/ui/base';
import { micro, move } from '@/ui/motion';
import { PlanArt } from '@/ui/PlanArt';
import { planSheet } from '@/ui/PlanSheets';
import { openSheet } from '@/ui/Sheet';
import { glyphOf, SubjectGlyph } from '@/ui/SubjectGlyph';
import { TextureFill } from '@/ui/Texture';
import { TIME_FONTS, timeFontOf } from '@/ui/timeFonts';
import { toast } from '@/ui/Toast';
import type { IconId } from './art';
import { R, ring, S } from './look';
import { Dot, J, Key, Num } from './parts';
import { orderSheet } from './order';
import { Pix } from './pixel';

// スタンダード's timer cards (TimerKit.card), after the mock (docs/app/mock/timer.html):
// behind them, the middle card's subject color mixed into the paper, with its
// dots; each card is paper with the 2pt ink outline, and the one in the middle
// has the lime shadow (it fades over as you slide). On the card: the subject's
// color with dots, its drawing in ink and its name outlined in ink, and a chip
// for how it stands (green 勉強中, crimson 一時停止中); the subject, the memo
// and ♡; the line toward the plan's end over an inch ruler; the time studied,
// the screen's one big number (hold it to change its face); and ✎, the big
// ▶ / ❚❚ on its floor (lime when it starts something), ✓. What the cards do —
// sliding, starting, holding, recording — is the deck's (screens/timer/cards.tsx).

const CARD_W = 361;
/** The card inside its place: 2 clear for the outline, 8 to the right and below for the lime shadow (the place clips). */
const IN = { left: 2, top: 2, right: 8, bottom: 8 };
const LIFT_AT = { left: IN.left + 6, top: IN.top + 6, right: IN.right - 6, bottom: IN.bottom - 6 };
/** the words of a plan gone past its length */
const DUE_INK = '#A65F00';
const INK_FAINT = 'rgba(23,18,31,0.34)';

function StandardCard({ b, w, state, plan, over, held, begin, record, more, centered }: CardFaceProps) {
  const sj = subj(b.s);
  const k = w / CARD_W;
  const pad = Math.round(16 * k);
  const cw = w - IN.left - IN.right;
  const running = state === 'live' || state === 'paused';
  const heldMin = Math.max(1, Math.round((held?.sec ?? 0) / 60));
  const fav = useStore((s) => s.favorites.some((f) => sameFav(f, b)));
  const span = b.start ? (b.min ? `${b.start}–${endOf(b)}` : `${b.start}から`) : '時刻なし';
  const memo = b.note ?? b.t ?? sj.task;
  const toggle = () => { haptic.soft(); togglePause(); };
  const heart = () => { const on = toggleFavorite(b); if (on) { haptic.success(); toast('よく使う予定に入れました', '「予定を追加」から1タップで入れられます'); } else haptic.tap(); };
  const main = state === 'live' ? { icon: 'pause' as const, a11y: `${sj.name}を一時停止`, go: toggle }
    : state === 'paused' ? { icon: 'play' as const, a11y: `${sj.name}を再開`, go: toggle }
    : state === 'held' ? { icon: 'play' as const, a11y: `${sj.name}を続きから始める`, go: () => begin(b) }
    : { icon: 'play' as const, a11y: `${sj.name}を始める（${span}）`, go: () => begin(b) };
  const rec = state === 'held' && held ? () => record(held) : running ? session.finish : null;
  // the lime shadow: the middle card's, fading over to the next as you slide
  const lift = useSharedValue(centered ? 1 : 0);
  useEffect(() => { lift.set(micro(centered ? 1 : 0)); }, [centered, lift]);
  const lit = useAnimatedStyle(() => ({ opacity: lift.value }));
  const [artH, setArtH] = useState(0);
  return (
    <View style={{ flex: 1 }}>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', ...LIFT_AT, borderRadius: R.card, backgroundColor: S.limeDeep }, lit]} />
      <View style={{ position: 'absolute', ...IN, borderRadius: R.card, backgroundColor: S.card, boxShadow: ring(), padding: pad, gap: Math.round(12 * k), justifyContent: 'space-between' }}>
        {/* the picture: what the rest leaves, up to a square (on a short card it gives way, so nothing under it is cut) */}
        <View onLayout={(e) => setArtH(Math.round(e.nativeEvent.layout.height))} style={{ flex: 1, minHeight: 56, maxHeight: cw - 2 * pad, borderRadius: R.mid, overflow: 'hidden', backgroundColor: sj.c }}>
          {b.icon ? (
            <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <PlanArt icon={b.icon} name={sj.name} color={sj.c} size={Math.round(cw - 2 * pad)} radius={0} />
            </View>
          ) : <SubjectArt name={sj.name} area={sj.area} k={k} w={cw - 2 * pad} h={artH} />}
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: R.mid, boxShadow: `inset ${ring()}` }]} />
          <StateChip state={state} over={over} span={span} heldMin={heldMin} k={k} />
        </View>

        {/* the subject, the memo, ♡ */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <J size={Math.max(18, 21 * k)} w="800" lh={Math.round(Math.max(18, 21 * k) * 1.25)} numberOfLines={1}>{sj.name}</J>
            <J size={Math.max(13, 15 * k)} lh={Math.round(Math.max(13, 15 * k) * 1.35)} color={S.ink3} numberOfLines={1}>{memo}</J>
          </View>
          <Ghost onPress={heart} label={fav ? 'よく使う予定から外す' : 'よく使う予定に入れる'} selected={fav} size={44} style={{ marginTop: -6, marginRight: -10 }}>
            <Pix name={fav ? 'heart' : 'heart-o'} color={fav ? S.ink : S.ink3} />
          </Ghost>
        </View>

        {/* the line toward the plan's end, the ruler, the time */}
        <CardClock state={state} plan={plan} over={over} held={held} k={k} cw={cw - 2 * pad} />

        {/* ✎ / ▶ ❚❚ / ✓: the round key is the one with a floor (on the card, the other two have none) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Math.round(34 * k), paddingBottom: 4 }}>
          {/* the card being studied edits without its day (it's today's, under way); the others with day and time */}
          <Ghost onPress={() => { haptic.tap(); planSheet({ existing: b, noDay: running }); }} label={`${sj.name}の予定を編集`} size={52}>
            <Pix name="edit" />
          </Ghost>
          <Key label={main.a11y} onPress={main.go} haptics={false} fill={main.icon === 'play' ? S.lime : S.card} radius={35 * k}
            style={{ width: Math.round(70 * k), height: Math.round(70 * k) }}>
            <View style={{ marginLeft: main.icon === 'play' ? 4 : 0 }}><Pix name={main.icon} px={3} /></View>
          </Key>
          {/* not started yet: ✓ offers ending the plan without studying (the menu), as recording needs a session */}
          <Ghost onPress={rec ?? more} size={52}
            label={state === 'held' ? `${sj.name} ${heldMin}分を記録する` : running ? `${sj.name}を終わって記録する` : `${sj.name}の予定を終わりにする`}>
            <Pix name="check" px={3} />
          </Ghost>
        </View>
      </View>
    </View>
  );
}

/**
 * The subject's color with the paper's dots, its drawing in ink at the top right, its name in the card's
 * color outlined in ink. Short (a small phone, cards waiting to be recorded), the drawing keeps inside it
 * and the name, said again just under the picture, is left out rather than run into the chip.
 */
function SubjectArt({ name, area, k, w, h }: { name: string; area?: Parameters<typeof glyphOf>[1]; k: number; w: number; h: number }) {
  const g = glyphOf(name, area);
  const size = Math.round(Math.min(w * 0.36, h - 28));
  const fs = Math.round(Math.max(36, 46 * k));
  const named = h >= 12 + 26 + 10 + fs * 1.1 + 12;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <TextureFill texture="dots-paper" opacity={0.9} />
      {g && h && size >= 24 ? <View style={{ position: 'absolute', right: 14, top: 14, opacity: 0.82 }}><SubjectGlyph glyph={g} size={size} color={S.ink} width={1.6} /></View> : null}
      {named ? <Outlined text={name} size={fs} style={{ position: 'absolute', left: 16, bottom: 12, right: 16 }} /> : null}
    </View>
  );
}

const AROUND: [number, number][] = [[-2, 0], [2, 0], [0, -2], [0, 2], [-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]];
/** Big words in the card's color with an ink outline (the outline drawn as eight ink copies under them). */
function Outlined({ text, size, style }: { text: string; size: number; style?: object }) {
  // set roomier than it looks (iOS cuts the top of Japanese set at 1.1), the extra given back below
  const lh = Math.ceil(size * 1.3);
  const t = (color: string, dx = 0, dy = 0, key?: string) => (
    <Text key={key} numberOfLines={1} style={[{ fontSize: size, lineHeight: lh, fontWeight: '800', letterSpacing: -size * 0.03, color },
      dx || dy ? { position: 'absolute', left: dx, top: dy } : null]}>{text}</Text>
  );
  return (
    <View style={[style, { marginBottom: -(lh - Math.round(size * 1.1)) / 2 }]}>
      {AROUND.map(([dx, dy], i) => t(S.ink, dx, dy, String(i)))}
      {t(S.card)}
    </View>
  );
}

/** How the plan stands, on the picture: its time; ● 勉強中 (green); ● 一時停止中 (crimson); past the plan, orange; 記録まち. */
function StateChip({ state, over, span, heldMin, k }: { state: CardFaceProps['state']; over: boolean; span: string; heldMin: number; k: number }) {
  const running = state === 'live' || state === 'paused';
  const label = state === 'idle' ? span : state === 'held' ? `記録まち · ${heldMin}分`
    : over ? `予定クリア · ${state === 'paused' ? '一時停止中' : '延長中'}` : state === 'paused' ? '一時停止中' : '勉強中';
  const dot = running ? (over ? S.over : state === 'paused' ? S.pause : S.run) : null;
  const color = running && over ? DUE_INK : state === 'paused' ? S.pause : S.ink;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 12, top: 12, height: 26, paddingHorizontal: 10, borderRadius: 8, backgroundColor: S.card, boxShadow: ring(1.5),
      flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '90%' }}>
      {dot ? <Dot c={dot} /> : null}
      <J size={Math.max(11, 12 * k)} w="700" lh={16} num color={color} numberOfLines={1}>{label}</J>
    </View>
  );
}

/**
 * The line toward the plan's end (green; past the plan, orange goes on; grey
 * while paused or waiting), an inch ruler under it (a tick each 10 minutes),
 * and the time: the only part of the card that redraws every second.
 */
function CardClock({ state, plan, over, held, k, cw }: { state: CardFaceProps['state']; plan: number; over: boolean; held?: Held; k: number; cw: number }) {
  const running = state === 'live' || state === 'paused';
  const ticked = useTicking((s, now) => (running && s.running ? elapsedOf(s, now) : -1));
  const sec = running ? Math.max(0, ticked) : held?.sec ?? 0;
  const left = state === 'idle' ? '0:00' : clock(sec);
  const right = state === 'idle' ? (plan ? `−${clock(plan)}` : '') : state === 'held' ? '記録まち' : over ? `+${clock(sec - plan)}` : plan ? `−${clock(plan - sec)}` : '';
  const done = over ? plan / sec : plan && state !== 'idle' ? Math.min(1, sec / plan) : 0;
  const [track, setTrack] = useState(0);
  const timeFont = useDesign().timeFont;
  const picked = timeFont ? timeFontOf(timeFont) : null;
  // a long time (1:04:12) is drawn smaller, so what's left beside it isn't cut
  const long = left.split(':').length > 2;
  const size = picked ? picked.size * (cw + 32) * 0.42 : Math.round(long ? Math.min(62 * k, (cw - 58) / 3.4) : 62 * k);
  const dim = state === 'idle' || state === 'paused';
  const bar = { position: 'absolute' as const, left: 0, top: 0, bottom: 0, width: '100%' as const };
  const mins = plan / 60;
  return (
    <View style={{ gap: 3 }}>
      <View onLayout={(e) => setTrack(e.nativeEvent.layout.width)} style={{ height: 10, borderRadius: 3, backgroundColor: S.paper2, boxShadow: ring(1.5), overflow: 'hidden', opacity: track ? 1 : 0 }}>
        <View style={[bar, { backgroundColor: state === 'paused' || state === 'held' ? S.ink3 : S.run, transform: [{ translateX: -(1 - done) * track }] }]} />
        {over ? <View style={[bar, { backgroundColor: S.over, transform: [{ translateX: done * track }] }]} /> : null}
      </View>
      {mins > 0 ? (
        <View pointerEvents="none" style={{ height: 5, marginHorizontal: 1 }}>
          {Array.from({ length: Math.floor(mins / 10) + 1 }, (_, i) => i * 10).map((m) => (
            <View key={m} style={{ position: 'absolute', top: 0, left: `${(m / mins) * 100}%`, marginLeft: -0.75, width: 1.5, height: m % 30 ? 4 : 5, backgroundColor: S.ink, opacity: m % 30 ? 0.4 : 0.7 }} />
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginTop: 2 }}>
        <Pressable onLongPress={() => { haptic.firm(); timeFaceSheet(); }} delayLongPress={450} style={{ flexShrink: 1, minWidth: 0 }}
          accessibilityRole="button" accessibilityLabel={`勉強した時間 ${left}`} accessibilityHint="長押しで時間のフォントを変えられます">
          {picked ? (
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}
              style={{ fontFamily: picked.family, fontSize: size, paddingVertical: size * 0.06, includeFontPadding: false, letterSpacing: picked.spacing * size, color: dim ? S.ink3 : S.ink, fontVariant: ['tabular-nums'] }}>{left}</Text>
          ) : <Num size={size} lh={Math.round(size * 1.02)} ls={-size * 0.03} color={dim ? S.ink3 : S.ink} numberOfLines={1}>{left}</Num>}
        </Pressable>
        <J size={Math.max(13, 15 * k)} lh={18} w={over ? '700' : '500'} num color={over ? DUE_INK : S.ink3} style={{ flexShrink: 0, paddingBottom: 6 }} numberOfLines={1}>{right}</J>
      </View>
    </View>
  );
}

/** A button on the card with no floor (only the round key has one): pressed, a faint ground. */
function Ghost({ onPress, label, selected, size, style, children }: { onPress: () => void; label: string; selected?: boolean; size: number; style?: object; children: ReactNode }) {
  const g = useSharedValue(0);
  const ground = useAnimatedStyle(() => ({ opacity: g.value }));
  return (
    <Pressable onPress={onPress} onPressIn={() => g.set(micro(1))} onPressOut={() => g.set(micro(0))} hitSlop={4}
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={selected === undefined ? undefined : { selected }}
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 12, backgroundColor: 'rgba(23,18,31,0.08)' }, ground]} />
      {children}
    </Pressable>
  );
}

// ---------- the time's face ----------
/** Held, the time offers its faces: スタンダード's own (Bricolage), then the app's; the card changes as you tap, ✓ keeps it, ✕ goes back. */
function timeFaceSheet() {
  openSheet((close) => <TimeFaceChoice close={close} />, { grouped: true });
}
function TimeFaceChoice({ close }: { close: () => void }) {
  const cur = useDesign().timeFont;
  const [first] = useState(cur);
  const pick = (id: string | undefined) => { haptic.tap(); setDesign({ timeFont: id }); };
  const tiles = [{ id: undefined, name: 'スタンダード', family: undefined as string | undefined, spacing: -0.03 }, ...TIME_FONTS];
  return (
    <View style={{ gap: 14, paddingTop: 2, paddingBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ghost onPress={() => { setDesign({ timeFont: first }); close(); }} label="やめる（元のフォントに戻す）" size={44}><Pix name="x" /></Ghost>
        <J size={17} w="700" style={{ flex: 1, textAlign: 'center' }} accessibilityRole="header">時間のフォント</J>
        <Key label="決定" onPress={close} fill={S.ink} under={S.limeDeep} kd={3} style={{ width: 44, height: 36 }}><Pix name="check" color={S.onInk} /></Key>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: '2.66%' }} accessibilityRole="radiogroup">
        {tiles.map((f) => {
          const on = f.id === cur;
          return (
            <Pressable key={f.id ?? 'standard'} onPress={() => pick(f.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={f.name}
              style={{ width: '23%', alignItems: 'center', gap: 6 }}>
              <View style={{ alignSelf: 'stretch', height: 62, borderRadius: R.key, backgroundColor: on ? S.lime : S.card, boxShadow: ring(), alignItems: 'center', justifyContent: 'center' }}>
                {f.family ? <Text style={{ fontFamily: f.family, fontSize: 28, lineHeight: 34, color: S.ink, letterSpacing: f.spacing * 28 }}>39</Text>
                  : <Num size={28} lh={32}>39</Num>}
              </View>
              <J size={11} w={on ? '700' : '500'} color={on ? S.ink : S.ink3} numberOfLines={1}>{f.name}</J>
            </Pressable>
          );
        })}
      </View>
      <J size={12} color={S.ink3} style={{ textAlign: 'center' }}>選ぶとすぐカードに反映されます</J>
    </View>
  );
}

// ---------- around the cards ----------
/** The card in front, that adds a plan: half-clear paper, a dashed ink edge, a ＋ tile. */
function AddCard({ w, h, k, onPress }: { w: number; h: number; k: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="今日の時間割に予定を追加" style={{ width: w, height: h }}>
      {({ pressed }) => (
        <View style={{ position: 'absolute', ...IN, borderRadius: R.card, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(23,18,31,0.45)',
          backgroundColor: pressed ? 'rgba(251,248,241,0.8)' : 'rgba(251,248,241,0.55)', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 * k }}>
          <View style={{ width: 44, height: 44, borderRadius: R.key, backgroundColor: S.card, boxShadow: ring(), alignItems: 'center', justifyContent: 'center' }}><Pix name="plus" /></View>
          <J size={16} w="700" lh={21}>予定を追加</J>
          <J size={13} color={S.ink2} style={{ textAlign: 'center' }}>今日の時間割に入れます</J>
        </View>
      )}
    </Pressable>
  );
}

/** Over a card to the side: the paper laid over it, in its shape (the deck sets how strong). */
function Shade() {
  return <View style={{ position: 'absolute', ...IN, borderRadius: R.card, backgroundColor: S.paper2 }} />;
}

/** Behind the cards: the paper, the middle card's color mixed into it (as you slide, toward the next), and the dots. */
function Wash({ color }: { color: SharedValue<string> }) {
  const a = useAnimatedStyle(() => ({ backgroundColor: color.value }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: S.paper }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: 0.58 }, a]} />
      <TextureFill texture="dots-paper" />
    </View>
  );
}

/** The top: the grabber, and where things stand on a small tag (● 国語を勉強中; paused, the words crimson). */
function Top({ state, name, close, onBackdrop, onLook }: { state: 'idle' | 'live' | 'paused'; name: string; close: () => void; onBackdrop?: () => void; onLook?: () => void }) {
  return (
    <View pointerEvents="box-none" style={{ alignItems: 'center' }}>
      <Pressable onPress={close} hitSlop={{ top: 4, bottom: 18 }} accessibilityRole="button" accessibilityLabel="小さくする（下にスライドでも）"
        style={{ width: 96, height: 22, alignItems: 'center', paddingTop: 7 }}>
        <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: INK_FAINT }} />
      </Pressable>
      <View pointerEvents="box-none" style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 4, marginBottom: 6, minHeight: 30 }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>{onBackdrop ? <Small label="背景" a11y="背景を選ぶ" onPress={onBackdrop} /> : null}</View>
        <View pointerEvents="none" accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 26, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, backgroundColor: S.card, boxShadow: ring(1.5) }}>
          {state === 'live' ? <Dot c={S.run} /> : null}
          <J size={12} w="700" lh={16} color={state === 'paused' ? S.pause : S.ink} numberOfLines={1}>{state === 'idle' ? 'これから' : `${name}を勉強中`}</J>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>{onLook ? <Small label="眺める" a11y="背景を眺める（文字とボタンを消す）" onPress={onLook} /> : null}</View>
      </View>
    </View>
  );
}
/** A small key (32 tall, 44 to the finger). `quiet`: the handler taps itself (the deck's). */
function Small({ label, a11y, icon, onPress, quiet }: { label: string; a11y?: string; icon?: IconId; onPress: () => void; quiet?: boolean }) {
  return (
    <Key label={a11y ?? label} onPress={onPress} haptics={!quiet} kd={3} hitSlop={{ top: 6, bottom: 6 }} style={{ height: 32 }} face={{ paddingHorizontal: 11, gap: 6 }}>
      {icon ? <Pix name={icon} /> : null}
      <J size={13} w="700" lh={16}>{label}</J>
    </Key>
  );
}

/** The heading: 今日の時間割 › (opens the timetable) and the day; 並べ替え as a small key (the order in スタンダード's own sheet). */
function Head({ date, canSort, onOpen }: { date: Date; shown: number; count: number; canSort: boolean; onOpen: () => void; onSort: () => void }) {
  const onSort = () => { haptic.tap(); orderSheet(); };
  return (
    <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 }}>
      <Pressable onPress={() => { haptic.tap(); onOpen(); }} accessibilityRole="link" accessibilityLabel={`今日の時間割を開く。${date.getMonth() + 1}月${date.getDate()}日`} style={{ flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center' }}>
        {({ pressed }) => (
          <View style={{ opacity: pressed ? 0.6 : 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <J size={21} w="800" lh={26}>今日の時間割</J>
              <Pix name="right" color={S.ink2} />
            </View>
            <J size={16} w="600" lh={22} color={S.ink2} ls={0.3} numberOfLines={1}>{dayOf(date)}</J>
          </View>
        )}
      </Pressable>
      {canSort ? <View style={{ marginTop: 4 }}><Small label="並べ替え" a11y="今日の予定の順番を入れ替える" icon="sort" onPress={onSort} quiet /></View> : null}
    </View>
  );
}
const DOW = ['日', '月', '火', '水', '木', '金', '土'];
const dayOf = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日（${DOW[d.getDay()]}）`;

/** Where you are in the row: a ＋ for the card that adds, a square for each plan, the ink one sliding to where you are; and the count. */
function Pager({ n, shown }: { n: number; shown: number }) {
  const at = useSharedValue(shown);
  useEffect(() => { at.set(move(shown)); }, [shown, at]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: at.value * 14 }] }));
  return (
    <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 24, marginTop: 2 }}
      accessible accessibilityLabel={shown ? `${n - 1}つのうち ${shown}つ目` : '予定を追加のカード'}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <View style={{ width: 8, height: 8, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ position: 'absolute', width: 8, height: 2, backgroundColor: S.ink2 }} />
          <View style={{ position: 'absolute', width: 2, height: 8, backgroundColor: S.ink2 }} />
        </View>
        {Array.from({ length: n - 1 }, (_, i) => <View key={i} style={{ width: 8, height: 8, backgroundColor: S.card, boxShadow: ring(1.5) }} />)}
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 8, height: 8, backgroundColor: S.ink, boxShadow: ring(1.5) }, thumb]} />
      </View>
      <J size={12} w="700" lh={14} num color={S.ink2} style={{ minWidth: 36 }}>{shown ? `${shown} / ${n - 1}` : '追加'}</J>
    </View>
  );
}

/** What's waiting to be recorded: a square in each subject's color, how many and how long, and まとめて記録. */
function Waiting({ held, onPress }: { held: Held[]; onPress: () => void }) {
  const min = held.reduce((n, h) => n + Math.max(1, Math.round(h.sec / 60)), 0);
  return (
    <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 10, paddingTop: 6, paddingBottom: 10, paddingLeft: 12, paddingRight: 8,
      borderRadius: R.mid, backgroundColor: S.card, boxShadow: ring() }}>
      <View pointerEvents="none" style={{ flexDirection: 'row' }}>
        {held.slice(0, 4).map((h, i) => <View key={h.id} style={{ width: 10, height: 10, marginLeft: i ? -1 : 0, backgroundColor: subj(h.s).c, boxShadow: ring(1.5) }} />)}
      </View>
      <J size={13} color={S.ink2} style={{ flex: 1, minWidth: 0 }} numberOfLines={1}>
        {'記録まち '}<J size={13} w="700">{`${held.length}つ`}</J>{` · ${jpHm(min)}`}
      </J>
      <View style={{ marginTop: 4 }}><Small label="まとめて記録" a11y={`まとめて記録（${held.length}つ）`} onPress={onPress} quiet /></View>
    </View>
  );
}

/** The ad, under the cards and still: a card on the paper, always marked 広告. (For now a sample.) */
function Ad() {
  return (
    <View accessibilityLabel="広告" style={{ marginHorizontal: 16, marginTop: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 10, paddingRight: 12,
      borderRadius: R.mid, backgroundColor: S.card, boxShadow: ring() }}>
      <View style={{ width: 44, height: 44, borderRadius: R.tile, backgroundColor: S.paper2, boxShadow: ring(1.5), alignItems: 'center', justifyContent: 'center' }}>
        <Pix name="book" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T size={10} w="700" lh={13} color={S.ink3} ls={1.2}>広告</T>
        <J size={13.5} w="700" lh={18} numberOfLines={1}>英単語3000をスキマ時間で</J>
        <J size={11} lh={15} color={S.ink2} numberOfLines={1}>ことばラボ（例） · 7日間無料</J>
      </View>
      <Small label="見る" a11y="広告を見る" onPress={() => toast('広告の例です', 'まだ広告は配信していません')} />
    </View>
  );
}

/** A session in まとめて記録: its color as a square with an ink edge, the name, the minutes, and メモを書く as a text link. */
function HeldRow({ color, name, min, action, onPress }: { color: string; name: string; min: number; action?: string; onPress?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 }}>
      <Dot c={color} size={10} />
      <J size={15} w="700" lh={20} style={{ flex: 1, minWidth: 0 }} numberOfLines={1}>{name}</J>
      <J size={14} w="600" lh={18} num color={S.ink2}>{`${min}分`}</J>
      {action && onPress ? (
        <Pressable onPress={() => { haptic.tap(); onPress(); }} hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }} accessibilityRole="button" accessibilityLabel={`${name}に${action}`}>
          {({ pressed }) => <J size={13} w="700" lh={18} style={{ textDecorationLine: 'underline', opacity: pressed ? 0.6 : 1 }}>{action}</J>}
        </Pressable>
      ) : null}
    </View>
  );
}

export const card: CardLook = { Face: StandardCard, Add: AddCard, corner: 0, Shade, Wash, Ad, Top, Head, Pager, Waiting, HeldRow, light: true, addColor: S.paper2 };
