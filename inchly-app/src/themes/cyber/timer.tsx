import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Defs, Line, LinearGradient, Pattern, Polygon, Rect, Stop } from 'react-native-svg';

import { subj } from '@/data';
import { useDesign } from '@/design';
import { iconUri } from '@/lib/planIcon';
import { endOf } from '@/lib/timetable';
import { session, useTicking } from '@/screens/model';
import { type CardFaceProps, type CardLook, clock } from '@/screens/timer/cards';
import { elapsedOf, sameFav, setDesign, toggleFavorite, togglePause, useStore } from '@/store';
import { T } from '@/themes/kit';
import { haptic, Press } from '@/ui/base';
import { planSheet } from '@/ui/PlanSheets';
import { openSheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';
import { AlleyArt } from './art';
import { CIcon } from './icons';
import { C, glow } from './look';
import { Btn, cellW, Cut, Ib, J, Mono } from './parts';
import { plateOf } from './sign';

// サイバー's timer card (TimerKit.card), after the parts bible: a panel cut at
// the top left and bottom right with a step down its right side, cyan-edged;
// the alley at night with the subject's sign (art.tsx); the subject and the
// memo; the plan as 30 LED cells (past the plan, orange stripes); the time
// studied big in Chakra Petch, each figure in a fixed cell with a ghost
// 88:88 behind it (hold it to pick サイバー's three faces); and the buttons:
// 編集, the big yellow ▶ / ❚❚, 記録. The deck — sliding, starting, recording —
// is the standard one (screens/timer/cards.tsx).

const CARD_W = 361;
/** The card's outline: the corners cut, and the step down its right side. */
const f2 = (k: number) => (w: number, h: number, i: number) =>
  `${k},${i} ${w - i},${i} ${w - i},26 ${w - 10 - i},36 ${w - 10 - i},${h - k} ${w - 10 - k},${h - i} ${i},${h - i} ${i},${k}`;

function CyberCard({ b, w, h, state, plan, over, held, begin, record, more, centered }: CardFaceProps) {
  const sj = subj(b.s);
  const short = useStore((s) => s.subjects.find((x) => x.id === b.s)?.short);
  const k = w / CARD_W, kk = Math.max(0.85, k);
  const pad = Math.round(12 * k);
  const running = state === 'live' || state === 'paused';
  const heldMin = Math.max(1, Math.round((held?.sec ?? 0) / 60));
  const fav = useStore((s) => s.favorites.some((f) => sameFav(f, b)));
  const span = b.start ? (b.min ? `${b.start}–${endOf(b)}` : `${b.start}から`) : '時刻なし';
  const memo = b.note ?? b.t ?? sj.task;
  const { code, no } = plateOf(sj);
  // what's left after the words, the line, the time and the buttons goes to the picture
  const timeSize = Math.round(86 * kk);
  const rest = pad + Math.round(16 * k) + 4 * Math.round(12 * k) + Math.round(24 * kk * 1.25) + Math.round(15 * kk * 1.45) + 29 + Math.round(timeSize * 0.98) + Math.round(84 * kk);
  const artW = w - 2 * pad;
  const artH = Math.round(Math.max(120, Math.min(artW * 0.95, h - rest)));
  const toggle = () => { haptic.soft(); togglePause(); };
  const heart = () => { const on = toggleFavorite(b); if (on) { haptic.success(); toast('よく使う予定に入れました', '「予定を追加」から1タップで入れられます'); } else haptic.tap(); };
  const main = state === 'live' ? { icon: 'pause' as const, a11y: `${sj.name}を一時停止`, go: toggle }
    : state === 'paused' ? { icon: 'play' as const, a11y: `${sj.name}を再開`, go: toggle }
    : state === 'held' ? { icon: 'play' as const, a11y: `${sj.name}を続きから始める`, go: () => begin(b) }
    : { icon: 'play' as const, a11y: `${sj.name}を始める（${span}）`, go: () => begin(b) };
  const rec = state === 'held' && held ? () => record(held) : running ? session.finish : null;
  return (
    <View style={{ flex: 1, paddingTop: pad, paddingHorizontal: pad, paddingBottom: Math.round(16 * k), gap: Math.round(12 * k) }}>
      <Cut points={f2(Math.round(18 * k))} fill="rgba(8,14,22,0.97)" edge={C.c} glow={0.5} term={['bl']} />
      {/* the picture: the alley, or the plan's photo in two colors with scanlines */}
      <View style={{ height: artH }}>
        {b.icon ? <Photo icon={b.icon} color={sj.c} w={artW} h={artH} />
          : <AlleyArt name={sj.name} short={short} color={sj.c} code={code} no={no} w={artW} h={artH} state={state} over={over} span={span} rain={centered} />}
      </View>
      {/* the subject, the memo, ♡ */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 4 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <J size={24 * kk} w="900" lh={Math.round(24 * kk * 1.25)} numberOfLines={1}>{sj.name}</J>
          <J size={15 * kk} color={C.t2} numberOfLines={1}>{memo}</J>
        </View>
        <Press onPress={heart} haptics={false} scale={0.86} hitSlop={10} accessibilityRole="button" accessibilityState={{ selected: fav }}
          accessibilityLabel={fav ? 'よく使う予定から外す' : 'よく使う予定に入れる'} style={{ paddingTop: 4, marginRight: 6 }}>
          <CIcon name="heart" size={Math.round(26 * kk)} color={C.y} accent={fav ? '#000' : C.y} filled={fav} />
        </Press>
      </View>
      <Progress state={state} plan={plan} over={over} held={held} start={b.start} end={b.start && b.min ? endOf(b) : ''} />
      <Clock state={state} plan={plan} over={over} held={held} size={timeSize} width={artW - 8} />
      {/* 編集 / ▶ ❚❚ / 記録 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4 }}>
        <Side icon="edit" label="編集" a11y={`${sj.name}の予定を編集`} onPress={() => { haptic.tap(); planSheet({ existing: b, noDay: running }); }} />
        <Press onPress={main.go} haptics={false} scale={0.94} accessibilityLabel={main.a11y}
          style={{ width: Math.round(84 * kk), height: Math.round(84 * kk), alignItems: 'center', justifyContent: 'center', boxShadow: '0px 0px 30px rgba(252,238,10,0.35)' }}>
          <Cut shape="f1" k={Math.round(16 * kk)} fill={C.y} edge={null} />
          <Brackets size={Math.round(84 * kk)} />
          <CIcon name={main.icon} size={Math.round(30 * kk)} color="#000" accent="#000" />
        </Press>
        <Side icon="check" label={running || state === 'held' ? '記録' : '終える'}
          a11y={state === 'held' ? `${sj.name} ${heldMin}分を記録する` : running ? `${sj.name}を終わって記録する` : `${sj.name}の予定を終わりにする`} onPress={rec ?? more} />
      </View>
    </View>
  );
}

/** The big button's corner marks (top right, bottom left), in black. */
function Brackets({ size }: { size: number }) {
  const s = size - 14;
  return (
    <Svg width={s} height={s} style={{ position: 'absolute', left: 7, top: 7, opacity: 0.55 }}>
      <Polygon points={`${s - 10},0 ${s},0 ${s},10 ${s - 2},10 ${s - 2},2 ${s - 10},2`} fill="#000" />
      <Polygon points={`0,${s - 10} 2,${s - 10} 2,${s - 2} 10,${s - 2} 10,${s} 0,${s}`} fill="#000" />
    </Svg>
  );
}

function Side({ icon, label, a11y, onPress }: { icon: 'edit' | 'check'; label: string; a11y: string; onPress: () => void }) {
  return (
    <View style={{ alignItems: 'center', gap: 5 }}>
      <Ib name={icon} label={a11y} kind="c" size={46} onPress={onPress} />
      <J size={11} w="700" color={C.t2} lh={14} accessibilityElementsHidden>{label}</J>
    </View>
  );
}

/** A plan's photo, in the subject's color, with scanlines (the alley is for plans without one). */
function Photo({ icon, color, w, h }: { icon: string; color: string; w: number; h: number }) {
  return (
    <View style={{ width: w, height: h, overflow: 'hidden', backgroundColor: C.void }}>
      <Image source={{ uri: iconUri(icon) }} style={{ width: w, height: h }} contentFit="cover" accessibilityIgnoresInvertColors />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color, mixBlendMode: 'color' }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(3,6,10,0.35)' }]} />
      <Scan w={w} h={h} />
    </View>
  );
}
function Scan({ w, h, a = 0.22 }: { w: number; h: number; a?: number }) {
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs><Pattern id="scan" width={3} height={3} patternUnits="userSpaceOnUse"><Rect x={0} y={0} width={3} height={1} fill={`rgba(0,0,0,${a})`} /></Pattern></Defs>
      <Rect x={0} y={0} width={w} height={h} fill="url(#scan)" />
    </Svg>
  );
}

// ---------- the plan, as LED cells ----------
const N = 30;
/** The plan as 30 cells: lit as far as you've come; past the plan, the plan's cells and then orange stripes. Redraws only when a cell changes. */
function Progress({ state, plan, over, held, start, end }: { state: CardFaceProps['state']; plan: number; over: boolean; held?: CardFaceProps['held']; start?: string; end: string }) {
  const running = state === 'live' || state === 'paused';
  // the seconds studied, to the minute (the cells and the minutes are all it shows)
  const min = useTicking((s, now) => (running && s.running ? Math.floor(elapsedOf(s, now) / 60) : -1));
  const m = running ? Math.max(0, min) : state === 'held' ? Math.floor((held?.sec ?? 0) / 60) : 0;
  const p = plan / 60;
  // past the plan, the whole bar is what you did: the plan's share of it lit, the rest striped
  const lit = over ? Math.round((p / Math.max(m, 1)) * N) : p ? Math.min(N, Math.round((m / p) * N)) : 0;
  const ex = over ? N - lit : 0;
  const endAt = over ? lit / N : 1;
  const [w, setW] = useState(0);
  const label = state === 'held' ? `記録まち ${m}分` : over ? `延長 +${Math.max(0, m - Math.round(p))}分` : p ? `${m} / ${Math.round(p)}分` : `${m}分`;
  return (
    <View style={{ gap: 5, paddingHorizontal: 4 }}>
      <View style={{ height: 9 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w ? <Leds w={w} lit={lit} ex={ex} /> : null}
        {w && plan ? <View style={{ position: 'absolute', top: -4, bottom: -4, width: 2, left: endAt * w - 1, backgroundColor: C.y, boxShadow: `0px 0px 6px ${C.y}` }} /> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Mono size={9.5} ls={0.1}>{`START ${start ?? '--:--'}`}</Mono>
        <J size={11} w="700" lh={14} color={over ? C.o : C.c}>{label}</J>
        <Mono size={9.5} ls={0.1}>{`END ${end || '--:--'}`}</Mono>
      </View>
    </View>
  );
}
function Leds({ w, lit, ex }: { w: number; lit: number; ex: number }) {
  const h = 9, gap = 2, sk = h * 0.58; // skewed at 30°
  const cw = (w - sk - gap * (N - 1)) / N;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <Pattern id="ex" width={4} height={4} patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <Rect x={0} y={0} width={2} height={4} fill={C.o} /><Rect x={2} y={0} width={2} height={4} fill="#000" />
        </Pattern>
      </Defs>
      {Array.from({ length: N }, (_, i) => {
        const x0 = i * (cw + gap);
        const pts = `${x0 + sk},0 ${x0 + sk + cw},0 ${x0 + cw},${h} ${x0},${h}`;
        return <Polygon key={i} points={pts} fill={i < lit ? C.c : i < lit + ex ? 'url(#ex)' : '#142029'} />;
      })}
    </Svg>
  );
}

// ---------- the time ----------
/** The time studied, big, and what's left (or past the plan) on the right. The only part of the card that redraws every second. */
function Clock({ state, plan, over, held, size, width }: { state: CardFaceProps['state']; plan: number; over: boolean; held?: CardFaceProps['held']; size: number; width: number }) {
  const running = state === 'live' || state === 'paused';
  const ticked = useTicking((s, now) => (running && s.running ? elapsedOf(s, now) : -1));
  const sec = running ? Math.max(0, ticked) : held?.sec ?? 0;
  const left = state === 'idle' ? '0:00' : clock(sec);
  const right = state === 'idle' ? (plan ? `-${clock(plan)}` : '') : state === 'held' ? '' : over ? `+${clock(sec - plan)}` : plan ? `-${clock(plan - sec)}` : '';
  const note = state === 'idle' ? '予定' : state === 'held' ? '記録まち' : over ? '予定より長く' : plan ? 'のこり' : '';
  const face = useDesign().cyberClock ?? 'chakra';
  // a long time shrinks to fit beside what's left
  const fit = Math.min(size, (width - 96) / [...left].reduce((a, c) => a + cellW(c), 0));
  const dim = state === 'idle' || state === 'paused';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 4 }}>
      <Press onLongPress={() => { haptic.firm(); clockSheet(); }} delayLongPress={450} haptics={false} scale={1}
        accessibilityRole="button" accessibilityLabel={`勉強した時間 ${left}`} accessibilityHint="長押しで時間の字を変えられます">
        <BigTime text={left} size={fit} face={face} dim={dim} />
      </Press>
      <View style={{ alignItems: 'flex-end', gap: 2, marginBottom: 4 }}>
        {right ? <Figs text={right} size={19} color={over ? C.o : C.t2} med /> : null}
        {note ? <J size={11} w="700" color={C.t3} lh={14}>{note}</J> : null}
      </View>
    </View>
  );
}

/** A clock string, each character in its fixed cell (Chakra Petch has no even figures). */
function Figs({ text, size, color, med, style }: { text: string; size: number; color: string; med?: boolean; style?: object }) {
  return (
    <View style={[{ flexDirection: 'row' }, style]}>
      {[...text].map((c, i) => (
        <T key={i} f={med ? 'chakraMed' : 'chakra'} size={size} color={color} lh={Math.round(size * 1.02)} style={{ width: size * cellW(c), textAlign: 'center' }}>{c}</T>
      ))}
    </View>
  );
}

/** The big time in サイバー's face: Chakra Petch with a ghost 88:88 and a slight color split; the departure board's dots; or a cyan tube. */
function BigTime({ text, size, face, dim }: { text: string; size: number; face: 'chakra' | 'led' | 'tube'; dim: boolean }) {
  if (face === 'led') {
    return (
      <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#050504', boxShadow: 'inset 0px 0px 0px 1px #1d1c0a' }}>
        <T f="pixel" size={size * 0.78} color={dim ? '#7A6E52' : C.warm} lh={Math.round(size * 0.92)} style={dim ? undefined : glow('rgba(255,227,166,0.6)', 7)}>{text}</T>
      </View>
    );
  }
  if (face === 'tube') {
    return <Figs text={text} size={size} color={dim ? C.t2 : '#E9FDFF'} med style={dim ? undefined : glow(C.c, 14)} />;
  }
  const ghost = text.replace(/\d/g, '8');
  return (
    <View>
      <Figs text={ghost} size={size} color="rgba(0,240,255,0.06)" style={{ position: 'absolute', left: 0, top: 0 }} />
      {dim ? null : <Figs text={text} size={size} color="rgba(255,45,85,0.55)" style={{ position: 'absolute', left: -1, top: 0 }} />}
      {dim ? null : <Figs text={text} size={size} color="rgba(0,240,255,0.55)" style={{ position: 'absolute', left: 1, top: 0 }} />}
      <Figs text={text} size={size} color={dim ? C.t2 : C.t1} style={dim ? undefined : glow('rgba(0,240,255,0.3)', 11)} />
    </View>
  );
}

const FACES: { id: 'chakra' | 'led' | 'tube'; name: string; sub: string }[] = [
  { id: 'chakra', name: 'CHAKRA', sub: '標準' }, { id: 'led', name: 'LED', sub: '発車標' }, { id: 'tube', name: 'TUBE', sub: 'ネオン管' },
];
/** サイバー's three faces for the time, picked by holding it: the card changes as you tap; ✓ keeps it, ✕ goes back. */
function clockSheet() {
  openSheet((close) => <ClockChoice close={close} />, { grouped: true });
}
function ClockChoice({ close }: { close: () => void }) {
  const cur = useDesign().cyberClock ?? 'chakra';
  const [first] = useState(cur);
  return (
    <View style={{ gap: 14, paddingTop: 2, paddingBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Ib name="x" label="やめる（元の字に戻す）" onPress={() => { setDesign({ cyberClock: first }); close(); }} size={36} />
        <J size={17} w="700" accessibilityRole="header">時間の字</J>
        <Ib name="check" label="決定" kind="yp" onPress={close} size={36} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }} accessibilityRole="radiogroup">
        {FACES.map((f) => {
          const on = f.id === cur;
          return (
            <Press key={f.id} onPress={() => { haptic.tap(); setDesign({ cyberClock: f.id }); }} scale={0.96} haptics={false}
              accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${f.name} ${f.sub}`} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View style={{ alignSelf: 'stretch', height: 70, alignItems: 'center', justifyContent: 'center' }}>
                <Cut shape="f1" k={10} fill={C.panel} edge={on ? C.y : C.ln2} glow={on ? 0.6 : 0} />
                <BigTime text="39:20" size={30} face={f.id} dim={false} />
              </View>
              <Mono size={10.5} color={on ? C.y : C.t3}>{f.name}</Mono>
              <J size={11} w={on ? '700' : '500'} color={on ? C.y : C.t3} lh={14}>{f.sub}</J>
            </Press>
          );
        })}
      </View>
      <J size={12} color={C.t3} style={{ textAlign: 'center' }}>選ぶとすぐカードに反映されます</J>
    </View>
  );
}

// ---------- around the cards ----------
/** The card in front, that adds a plan: an empty panel (hatched, as empty things are), yellow-edged. */
function CyberAdd({ w, h, k, onPress }: { w: number; h: number; k: number; onPress: () => void }) {
  return (
    <Press onPress={onPress} haptics={false} scale={0.98} accessibilityLabel="今日の時間割に予定を追加"
      style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center', gap: 8 * k, paddingHorizontal: 24 * k }}>
      <Cut points={f2(Math.round(18 * k))} fill="rgba(8,14,22,0.6)" edge={C.lny} />
      <Svg width={w - 30} height={h - 40} style={{ position: 'absolute', left: 10, top: 20, opacity: 0.5 }}>
        <Defs><Pattern id="addhatch" width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><Line x1={0} y1={0} x2={0} y2={7} stroke="rgba(107,128,135,0.25)" strokeWidth={1.5} /></Pattern></Defs>
        <Rect x={0} y={0} width={w - 30} height={h - 40} fill="url(#addhatch)" />
      </Svg>
      <Mono size={10.5} color={C.c}>{'/// NEW ENTRY'}</Mono>
      <CIcon name="plus" size={Math.round(26 * k)} color={C.y} />
      <J size={Math.max(15, 17 * k)} w="900" color={C.y}>予定を追加</J>
      <J size={Math.max(11.5, 12.5 * k)} color={C.t2} style={{ textAlign: 'center' }}>今日の時間割に入れます</J>
    </Press>
  );
}

/** The dimming over a card to the side, in the card's shape. */
function Shade({ w, h }: { w: number; h: number }) {
  return (
    <Svg width={w} height={h}>
      <Polygon points={f2(Math.round(18 * (w / CARD_W)))(w, h, 0)} fill="#000" />
    </Svg>
  );
}

/** Behind the cards: the night, a little of the centered card's color at the top, and scanlines. */
function Wash({ color }: { color: SharedValue<string> }) {
  const a = useAnimatedStyle(() => ({ backgroundColor: color.value }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: C.void }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: 0.2 }, a]} />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="cyberwash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.void} stopOpacity={0.2} />
            <Stop offset="0.55" stopColor={C.void} stopOpacity={0.92} />
            <Stop offset="1" stopColor={C.void} stopOpacity={1} />
          </LinearGradient>
          <Pattern id="washscan" width={3} height={3} patternUnits="userSpaceOnUse"><Rect x={0} y={0} width={3} height={1} fill="rgba(0,0,0,0.22)" /></Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#cyberwash)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#washscan)" />
      </Svg>
    </View>
  );
}

/** The ad, as a sign in the city: warm-edged, always tagged AD · 広告, still. (For now a sample.) */
function CyberAd() {
  return (
    <View accessibilityLabel="広告" style={{ marginHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 16, paddingBottom: 12, paddingHorizontal: 12 }}>
      <Cut shape="btn" k={10} fill="rgba(14,16,20,0.95)" edge="rgba(255,227,166,0.5)" />
      <View style={{ position: 'absolute', left: 10, top: 0, backgroundColor: C.t2, paddingHorizontal: 6 }}><J size={11} w="700" color="#000" lh={14}>AD · 広告</J></View>
      <View style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D0B06', boxShadow: 'inset 0px 0px 0px 1px rgba(255,227,166,0.5), 0px 0px 14px rgba(255,227,166,0.18)' }}>
        <CIcon name="book" size={24} color={C.warm} accent={C.warm} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <J size={14} w="700" numberOfLines={1}>英単語3000をスキマ時間で</J>
        <J size={11.5} color={C.t2} numberOfLines={1}>ことばラボ（例） · 7日間無料</J>
      </View>
      <Btn label="見る" kind="ysec" small onPress={() => toast('広告の例です', 'まだ広告は配信していません')} a11y="広告を見る" />
    </View>
  );
}

export const card: CardLook = { Face: CyberCard, Add: CyberAdd, corner: 0, Shade, Wash, Ad: CyberAd };
