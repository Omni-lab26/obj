import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOutDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { G, Line, Path, Rect } from 'react-native-svg';

import { pad, subj } from '@/data';
import type { Block } from '@/screens/layout';
import { clock, go, hmColon, jpHm, pickLabel, session, startPick, tickTodo, useCharts, useDeadlines, useNext, usePeers, useSession, useToday, useTodos, useWeekStreak } from '@/screens/model';
import type { HomeKit } from '@/themes/types';
import { MAX_TICKETS, type Todo, useLevel, useStore } from '@/store';
import { haptic, Press } from '@/ui/base';
import { Screen, useBarsTop, useTabPad, useUnread } from '@/ui/Chrome';
import { deadlineActions, deadlineSheet, todoSheet } from '@/ui/Editors';
import { Icon } from '@/ui/Icon';
import { levelSheet } from '@/ui/Level';
import { toast } from '@/ui/Toast';
import { Chip, Cover, Dots, Dotted, P, paint, Patterns, Plated, Swatch, Thump, useInk, usePlates, useSvgId } from './print';

// The home as a zine's contents page: a masthead, then one "issue" per row —
// a framed cover with crop marks on the left, a serif title, a label chip and
// a row of page dots on the right, dotted rules between. The week's chart is
// a printed figure with a caption, and the last page is the colophon.

// ---------- page ----------
/** Frames tell the page where the "now" row ends, so the floating cover can wait until it has scrolled away. */
const NowEdge = createContext<(bottom: number) => void>(() => {});
function Page({ header, children }: { header: ReactNode; children: ReactNode }) {
  const tabPad = useTabPad();
  const running = useStore((s) => s.running);
  const [edge, setEdge] = useState<number | null>(null);
  const [away, setAway] = useState(false);
  return (
    <Screen>
      {header}
      <NowEdge.Provider value={setEdge}>
        <ScrollView showsVerticalScrollIndicator={false} scrollEventThrottle={32} contentContainerStyle={{ paddingBottom: tabPad + (running ? 92 : 0) }}
          onScroll={(e) => { const a = edge !== null && e.nativeEvent.contentOffset.y > edge; if (a !== away) setAway(a); }}>
          {children}
        </ScrollView>
      </NowEdge.Provider>
      {away ? <Floating /> : null}
    </Screen>
  );
}

/** The masthead: the name in bold serif between two rules, the volume (your level) and the date. */
function Header() {
  const k = useInk();
  const unread = useUnread();
  const l = useLevel();
  const d = new Date();
  const date = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()]}`;
  return (
    <View style={{ paddingHorizontal: 12 }}>
      <View style={{ height: 54, flexDirection: 'row', alignItems: 'center' }}>
        <Press onPress={go.notifications} react="misprint" scale={0.9} hitSlop={6} accessibilityRole="button" accessibilityLabel="お知らせ"
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bell" size={24} color={k.ink} filled />
          {unread > 0 ? <View style={{ position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: k.ink, borderWidth: 1.5, borderColor: k.paper }} /> : null}
        </Press>
        <View style={{ flex: 1, alignItems: 'center' }} accessible accessibilityRole="header" accessibilityLabel="Inchly">
          <P f="title" size={30} lh={36} ls={-0.3}>Inchly</P>
        </View>
        <Press onPress={go.settings} react="misprint" scale={0.9} hitSlop={6} accessibilityRole="button" accessibilityLabel="設定"
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="gear" size={24} color={k.ink} filled />
        </Press>
      </View>
      <View style={{ height: 1.5, backgroundColor: k.ink }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 26, gap: 8 }}>
        <Press onPress={levelSheet} react="misprint" hitSlop={6} accessibilityRole="button" accessibilityLabel={`レベル${l.lv}。次のレベルまで${Math.round(l.need)} EXP`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <P f="monoB" size={10.5} ls={1.4}>{`VOL.${l.lv}`}</P>
          <Dots n={l.p * 8} of={8} size={6} gap={2} />
        </Press>
        <View style={{ flex: 1 }} />
        <P f="mono" size={10.5} ls={1}>{date}</P>
      </View>
      <View style={{ height: 1, backgroundColor: k.ink }} />
    </View>
  );
}

/** Each block is one row of the contents, dotted rules between. */
function Frame({ block, index, children }: { block: Block; index: number; children: ReactNode }) {
  const list = Array.isArray(children) ? children : [children];
  const setEdge = useContext(NowEdge);
  const now = block.sections.includes('now');
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 }}
      onLayout={now ? (e) => setEdge(e.nativeEvent.layout.y + e.nativeEvent.layout.height - 48) : undefined}>
      {index > 0 ? <Dotted style={{ position: 'absolute', top: 0, left: 12, right: 12 }} /> : null}
      {block.row ? <View style={{ flexDirection: 'row', gap: 12 }}>{list.map((c, i) => <View key={i} style={{ flex: 1, minWidth: 0 }}>{c}</View>)}</View> : <View style={{ gap: 18 }}>{children}</View>}
    </View>
  );
}

const ORDER = (): Block[] => [
  { id: 'grass', sections: ['grass'] },
  { id: 'streak', sections: ['streak'] },
  { id: 'today', sections: ['today'] },
  { id: 'peers', sections: ['peers'] },
  { id: 'colophon', sections: ['x:colophon'] },
];

/** A small purple bookmark on the left edge: the デザイン page. */
function Ribbon({ onPress }: { onPress: () => void }) {
  const k = useInk();
  return (
    <Press onPress={onPress} react="misprint" scale={0.9} hitSlop={{ top: 16, bottom: 16, left: 4, right: 12 }} accessibilityRole="button" accessibilityLabel="デザインを変える"
      style={{ position: 'absolute', left: 0, top: '46%', width: 13, height: 68, backgroundColor: k.ink }}>
      <View style={{ position: 'absolute', width: 68, height: 13, left: -27.5, top: 27.5, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-90deg' }] }}>
        <P f="monoB" size={8} lh={11} ls={1.8} color={k.paper}>THEME</P>
      </View>
    </Press>
  );
}

// ---------- covers ----------
/** Today's cover: the day's minutes stacked from the foot of the sheet, each subject in its pattern, the goal as a dashed line. */
function DayArt({ w, h, parts, goal, min }: { w: number; h: number; parts: { id: string; min: number }[]; goal: number; min: number }) {
  const k = useInk();
  const id = useSvgId();
  const plates = usePlates();
  const top = h * 0.3;
  const scale = (h - top) / Math.max(goal, min, 1);
  const gy = h - goal * scale;
  // each subject's band, stacked up from the foot
  const bands = parts.map((p, i) => ({ ...p, y: h - parts.slice(0, i + 1).reduce((a, x) => a + x.min, 0) * scale, hh: p.min * scale }));
  return (
    <Svg width={w} height={h}>
      <Patterns id={id} ink={k.ink} />
      {bands.map((b) => {
        const pl = plates(b.id);
        return <Rect key={b.id} x={0} y={b.y} width={w} height={b.hh} fill={paint(id, pl.kind === 'none' ? 'halftone' : pl.kind, k.ink)} opacity={pl.shade} />;
      })}
      {bands.slice(0, -1).map((b) => <Line key={'b' + b.id} x1={0} y1={b.y} x2={w} y2={b.y} stroke={k.sheet} strokeWidth={1.5} />)}
      <Line x1={0} y1={gy} x2={w} y2={gy} stroke={k.ink} strokeWidth={1} strokeDasharray="3 2.5" />
    </Svg>
  );
}

/** A subject's cover: its plate all over, its first character in a paper disc. */
function SubjectArt({ w, h, id, name, no }: { w: number; h: number; id: string; name: string; no?: number }) {
  const k = useInk();
  const sid = useSvgId();
  const pl = usePlates()(id);
  const d = Math.round(w * 0.58);
  return (
    <View style={{ width: w, height: h }}>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Patterns id={sid} ink={k.ink} />
        <Rect x={0} y={0} width={w} height={h} fill={paint(sid, pl.kind === 'none' ? 'halftone' : pl.kind, k.ink)} opacity={pl.shade} />
      </Svg>
      <View style={{ position: 'absolute', left: (w - d) / 2, top: (h - d) / 2, width: d, height: d, borderRadius: d / 2, backgroundColor: k.sheet, borderWidth: 1, borderColor: k.ink, alignItems: 'center', justifyContent: 'center' }}>
        <P f="title" size={Math.round(d * 0.5)} lh={Math.round(d * 0.62)}>{[...name][0] ?? '?'}</P>
      </View>
      {no !== undefined ? (
        <View style={{ position: 'absolute', left: 4, top: 4, paddingHorizontal: 3, backgroundColor: k.sheet }}>
          <P f="monoB" size={8.5} lh={11} ls={0.8}>{`No.${pad(no)}`}</P>
        </View>
      ) : null}
    </View>
  );
}
const useNo = (id: string) => useStore((s) => s.subjects.findIndex((x) => x.id === id) + 1);
function useCoverSize(big?: boolean) {
  const { width } = useWindowDimensions();
  const w = big ? (width < 360 ? 92 : 108) : width < 360 ? 74 : 86;
  return { w, h: Math.round(w * 1.34) };
}

// ---------- sections ----------
/** Today, as the lead issue: the total, the change from yesterday, and the goal as page dots. */
function Today() {
  const k = useInk();
  const today = useToday();
  const next = useDeadlines()[0];
  const { w, h } = useCoverSize(true);
  const d = new Date();
  const p = today.goal ? Math.min(1, today.min / today.goal) : 0;
  const up = today.diff >= 0;
  return (
    <View style={{ flexDirection: 'row', gap: 18 }}>
      <Cover w={w} h={h} onPress={go.me} a11y={`今日の勉強 ${jpHm(today.min)}。記録を見る`}>
        <DayArt w={w} h={h} parts={today.parts} goal={today.goal} min={today.min} />
        <View style={{ position: 'absolute', left: 6, right: 6, top: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
          <P f="monoB" size={9} lh={12} ls={1}>TODAY</P>
          <P f="mono" size={9} lh={12}>{`${pad(d.getMonth() + 1)}.${pad(d.getDate())}`}</P>
        </View>
        <View style={{ position: 'absolute', left: 0, right: 0, top: h * 0.12, alignItems: 'center' }}>
          <View style={{ backgroundColor: k.sheet, borderWidth: 1, borderColor: k.ink, paddingHorizontal: 6, paddingVertical: 1 }}>
            <P f="monoB" size={w < 100 ? 17 : 19} lh={w < 100 ? 22 : 25} num>{hmColon(today.min)}</P>
          </View>
        </View>
      </Cover>
      <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
        <P f="serif" size={12.5} color={k.ink2}>今日の勉強</P>
        <P f="title" size={26} lh={31} numberOfLines={1} adjustsFontSizeToFit>{jpHm(today.min)}</P>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Chip label={`${up ? '+' : '−'}${hmColon(Math.abs(today.diff))}`} outline={!up} a11y={`昨日より${today.diff}分`} />
          <P f="serif" size={11.5} color={k.ink2}>昨日より</P>
        </View>
        <Dots n={p * 12} of={12} a11y={`目標の${Math.round(p * 100)}%`} />
        <P f="serif" size={12} color={k.ink2} numberOfLines={1}>{`目標 ${jpHm(today.goal)} · ${today.reached ? '達成' : `あと${jpHm(today.goal - today.min)}`}`}</P>
        {next ? <P f="serif" size={11.5} color={k.ink3} numberOfLines={1}>{`◆ ${next.t}まで ${next.days}日`}</P> : null}
      </View>
    </View>
  );
}

/** What's on the press now — or what's next, with the chip that starts it. */
function Now() {
  const k = useInk();
  const ss = useSession();
  const pick = useNext();
  const { w, h } = useCoverSize();
  const noNow = useNo(ss.subject.id);
  const noNext = useNo(pick.s);
  if (ss.running) {
    const p = ss.target ? Math.min(1, ss.elapsed / ss.target) : 0;
    return (
      <View style={{ flexDirection: 'row', gap: 18 }}>
        <Cover w={w} h={h} onPress={go.timer} a11y={`${ss.subject.name}を勉強中 ${clock(ss.elapsed)}。タイマーを開く`} live={!ss.paused}>
          <SubjectArt w={w} h={h} id={ss.subject.id} name={ss.subject.name} no={noNow} />
        </Cover>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <Chip label={ss.paused ? 'PAUSED' : 'NOW PRINTING'} outline={ss.paused} />
          <P f="title" size={19} lh={25} numberOfLines={1}>{ss.subject.name}</P>
          {ss.task ? <P f="serif" size={12.5} color={k.ink2} numberOfLines={1}>{ss.task}</P> : null}
          <P f="monoB" size={22} lh={27} num accessibilityLabel={`経過 ${clock(ss.elapsed)}`}>{clock(ss.elapsed)}</P>
          <Dots n={p * 12} of={12} a11y={`目安の${Math.round(p * 100)}%`} />
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
            <Chip label={ss.paused ? '再開' : '一時停止'} outline onPress={session.pause} />
            <Chip label="記録する" onPress={session.finish} />
          </View>
        </View>
      </View>
    );
  }
  const p = subj(pick.s);
  const kicker = pick.from === 'now' ? 'NOW' : pick.from === 'next' ? 'NEXT' : pick.from === 'todo' ? 'TODO' : 'NEXT';
  return (
    <View style={{ flexDirection: 'row', gap: 18 }}>
      <Cover w={w} h={h} onPress={go.study} a11y={`${pickLabel(pick)} ${p.name} ${pick.what}。勉強のページを開く`}>
        <SubjectArt w={w} h={h} id={p.id} name={p.name} no={noNext} />
      </Cover>
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Chip label={kicker} outline />
          <P f="serif" size={11.5} color={k.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>{pickLabel(pick).replace(/^(いま|次は)( · )?/, '')}</P>
        </View>
        <P f="title" size={19} lh={25} numberOfLines={1}>{p.name}</P>
        {pick.what ? <P f="serif" size={12.5} color={k.ink2} numberOfLines={2}>{pick.what}</P> : null}
        <Chip big label="▶ はじめる" a11y={`${p.name}を始める`} onPress={() => startPick(pick)} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

/** The week (or today by the hour) as a printed figure: bars in each subject's pattern, a caption under it. */
function Chart() {
  const k = useInk();
  const c = useCharts();
  const plates = usePlates();
  const subjects = useStore((s) => s.subjects);
  const id = useSvgId();
  const [range, setRange] = useState<'week' | 'day'>('week');
  const [w, setW] = useState(0);
  const week = range === 'week';
  const bars = week
    ? c.week.map((d) => ({ key: d.date, label: d.label, min: d.min, live: d.live, parts: d.parts, mark: d.today, future: d.future }))
    : c.hours.map((x) => ({ key: String(x.h), label: x.h % 6 === 0 ? String(x.h) : '', min: x.min, live: x.live, parts: x.parts, mark: x.now, future: x.future }));
  const recorded = week ? c.weekTotal : c.hours.reduce((a, x) => a + x.min - x.live, 0);
  const live = bars.reduce((a, b) => a + b.live, 0);
  const max = week ? Math.max(c.goal, ...bars.map((b) => b.min), 1) * 1.12 : 60;
  const H = 128, TOP = 16, FOOT = 20;
  const plotH = H - TOP - FOOT;
  const slot = w / bars.length;
  const bw = week ? Math.min(28, slot * 0.58) : Math.max(3, slot * 0.62);
  const y = (m: number) => TOP + plotH - (m / max) * plotH;
  // subjects in this figure, for the key
  const sums = new Map<string, number>();
  bars.forEach((b) => b.parts.forEach((p) => sums.set(p.id, (sums.get(p.id) ?? 0) + p.min)));
  const key = [...subjects.filter((s) => sums.has(s.id)).map((s) => ({ id: s.id, name: s.name })), ...(sums.has('?') ? [{ id: '?', name: '削除した科目' }] : [])].slice(0, 6);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <P f="title" size={19} lh={25}>{week ? '今週' : '今日'}</P>
        <P f="monoB" size={14} num>{hmColon(recorded)}</P>
        {live >= 1 ? <P f="serif" size={11} color={k.ink3}>{`＋勉強中 ${Math.round(live)}分`}</P> : null}
        <View style={{ flex: 1 }} />
        <Chip label="WEEK" outline={!week} a11y="週ごと" onPress={() => setRange('week')} />
        <Chip label="DAY" outline={week} a11y="時間ごと" onPress={() => setRange('day')} />
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H, borderWidth: 1, borderColor: k.ink, backgroundColor: k.sheet }}
        accessible accessibilityLabel={`${week ? '今週' : '今日'}の勉強時間 ${jpHm(recorded)}`}>
        {w ? (
          <Svg width={w - 2} height={H - 2}>
            <Patterns id={id} ink={k.ink} />
            {/* baseline */}
            <Line x1={6} y1={TOP + plotH} x2={w - 8} y2={TOP + plotH} stroke={k.ink} strokeWidth={1} />
            {week ? (
              <>
                <Line x1={6} y1={y(c.goal)} x2={w - 8} y2={y(c.goal)} stroke={k.ink} strokeWidth={1} strokeDasharray="2 3" />
              </>
            ) : [6, 12, 18].map((hh) => <Line key={hh} x1={slot * hh} y1={TOP} x2={slot * hh} y2={TOP + plotH} stroke={k.ink} strokeWidth={0.6} strokeDasharray="1 3" opacity={0.6} />)}
            {bars.map((b, i) => {
              const cx = slot * i + slot / 2;
              const x = cx - bw / 2;
              let acc = 0;
              const segs = b.parts.map((p) => {
                const pl = plates(p.id);
                const y1 = y(acc + p.min);
                const hh = (p.min / max) * plotH;
                acc += p.min;
                return <Rect key={p.id} x={x} y={y1} width={bw} height={Math.max(0, hh)} fill={paint(id, pl.kind === 'none' ? 'halftone' : pl.kind, k.ink)} opacity={pl.shade} />;
              });
              const liveH = (b.live / max) * plotH;
              return (
                <G key={b.key}>
                  {segs}
                  {b.min > 0 ? <Rect x={x} y={y(b.min)} width={bw} height={(b.min / max) * plotH} fill="none" stroke={k.ink} strokeWidth={1} /> : null}
                  {b.live > 0 ? <Rect x={x} y={y(b.min)} width={bw} height={liveH} fill={`url(#${id}halftone)`} stroke={k.ink} strokeWidth={1} strokeDasharray="2 2" /> : null}
                  {b.future && week ? <Rect x={x} y={TOP + plotH - 3} width={bw} height={3} fill="none" stroke={k.ink} strokeWidth={0.8} strokeDasharray="1.5 2" /> : null}
                  {b.mark && !week ? <Path d={`M${cx - 3.5} ${TOP - 9}h7l-3.5 5z`} fill={k.ink} /> : null}
                </G>
              );
            })}
          </Svg>
        ) : null}
        {/* labels: figures over the week's bars, days (or hours) under them */}
        {w ? bars.map((b, i) => {
          const cx = slot * i + slot / 2;
          return (
            <View key={'l' + b.key} pointerEvents="none" style={StyleSheet.absoluteFill}>
              {week && b.min >= 1 ? (
                <View style={{ position: 'absolute', left: cx - 22, width: 44, top: y(b.min) - 15, alignItems: 'center' }}>
                  <P f="mono" size={8.5} lh={11} num style={{ backgroundColor: k.sheet, paddingHorizontal: 2 }}>{hmColon(b.min)}</P>
                </View>
              ) : null}
              {b.label ? (
                <View style={{ position: 'absolute', left: cx - 12, width: 24, top: H - FOOT, height: FOOT - 2, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: week && b.mark ? k.ink : 'transparent' }}>
                  <P f={week ? 'serif' : 'mono'} size={week ? 11 : 9} lh={14} color={week && b.mark ? k.paper : k.ink}>{b.label}</P>
                </View>
              ) : null}
            </View>
          );
        }) : null}
        {week ? (
          <View pointerEvents="none" style={{ position: 'absolute', right: 8, top: y(c.goal) - 14 }}>
            <P f="monoB" size={8} lh={11} ls={1}>GOAL</P>
          </View>
        ) : null}
      </View>
      {key.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 6 }}>
          {key.map((s) => (
            <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Swatch plate={plates(s.id)} size={11} />
              <P f="serif" size={11} lh={15} numberOfLines={1}>{s.name}</P>
            </View>
          ))}
        </View>
      ) : null}
      <P f="serif" size={11} color={k.ink3}>{recorded + live > 0 ? `図1　${week ? '今週の勉強時間（日ごと・科目ごと）' : '今日の勉強時間（時間ごと）'}` : `図1　${week ? '今週' : '今日'}はまだ記録がありません`}</P>
    </View>
  );
}

/** The run of days, as a rubber stamp you can thump; the week as dots; rest tickets as tickets. */
function Streak() {
  const k = useInk();
  const { streak, tickets, days } = useWeekStreak();
  return (
    <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center' }}>
      <Thump size={92} a11y={`${streak}日連続で勉強中。休み券${tickets}枚`}>
        <View style={{ width: 92, height: 92, borderRadius: 46, borderWidth: 2.5, borderColor: k.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: k.sheet }}>
          <View style={[StyleSheet.absoluteFill, { margin: 5, borderRadius: 41, borderWidth: 1, borderColor: k.ink }]} />
          <P f="title" size={streak >= 100 ? 26 : 32} lh={36} num>{streak}</P>
          <P f="sansB" size={10} lh={13}>日連続</P>
        </View>
      </Thump>
      <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
        <View>
          <P f="title" size={19} lh={25}>連続記録</P>
          <P f="serif" size={12} color={k.ink2} numberOfLines={1}>{streak ? `${streak}日、続いています` : '今日から数えはじめます'}</P>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', maxWidth: 230 }}>
          {days.map((d) => (
            <View key={d.date} style={{ alignItems: 'center', gap: 4 }} accessible accessibilityLabel={`${d.label}曜 ${d.studied ? '勉強した' : d.rest ? '休み' : d.future ? 'これから' : 'まだ'}`}>
              <View style={{ paddingHorizontal: 3, backgroundColor: d.today ? k.ink : 'transparent' }}>
                <P f="serif" size={10.5} lh={14} color={d.today ? k.paper : k.ink}>{d.label}</P>
              </View>
              <View style={{ width: 13, height: 13, borderRadius: 7, borderWidth: 1, borderColor: k.ink, borderStyle: d.future ? 'dashed' : 'solid',
                backgroundColor: d.studied ? k.ink : d.rest ? k.tint(0.35) : 'transparent', opacity: d.future ? 0.6 : 1 }} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {Array.from({ length: MAX_TICKETS }, (_, i) => (
            <View key={i} style={{ width: 26, height: 15, borderWidth: 1, borderColor: k.ink, borderStyle: i < tickets ? 'solid' : 'dashed', backgroundColor: i < tickets ? k.ink : 'transparent',
              alignItems: 'center', justifyContent: 'center', opacity: i < tickets ? 1 : 0.5 }}>
              <P f="sansB" size={8.5} lh={11} color={i < tickets ? k.paper : k.ink}>券</P>
            </View>
          ))}
          <P f="serif" size={11} color={k.ink2}>{`休み券 ${tickets}/${MAX_TICKETS}`}</P>
        </View>
      </View>
    </View>
  );
}

/** Today's ToDos, ticked off with a stamp. */
function Todos() {
  const k = useInk();
  const { todos, done, total } = useTodos();
  const plates = usePlates();
  const shown = [...todos.filter((x) => !x.d), ...todos.filter((x) => x.d)].slice(0, 5);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <P f="title" size={19} lh={25}>ToDo</P>
        {total ? <Chip label={`${done}/${total}`} a11y={`${total}個中${done}個完了`} /> : null}
        <View style={{ flex: 1 }} />
        <Chip label="＋ 追加" outline a11y="ToDoを追加" onPress={() => todoSheet()} />
      </View>
      {total ? shown.map((td, i) => <TodoLine key={td.id} td={td} first={i === 0} plates={plates} />) : (
        <Plated onPress={() => todoSheet()} a11y="ToDoを追加" style={{ paddingVertical: 12 }}>
          <P f="serif" size={13} color={k.ink3}>やることを書いておくと、始めやすくなります</P>
        </Plated>
      )}
      {total ? (
        <Press onPress={go.study} react="misprint" hitSlop={8} accessibilityRole="link" accessibilityLabel="ToDoをすべて見る" style={{ alignSelf: 'flex-end', marginTop: 4 }}>
          <P f="serif" size={12} style={{ textDecorationLine: 'underline' }}>{total > shown.length ? `すべて見る（${total}）→` : '勉強のページへ →'}</P>
        </Press>
      ) : null}
    </View>
  );
}
function TodoLine({ td, first, plates }: { td: Todo; first: boolean; plates: ReturnType<typeof usePlates> }) {
  const k = useInk();
  const s = subj(td.s);
  // the stamp thumps down when the ToDo is ticked (not when it is shown already done)
  const v = useSharedValue(td.d ? 1 : 0);
  const was = useRef(td.d);
  useEffect(() => {
    if (td.d && !was.current) { v.set(0); v.set(withTiming(1, { duration: 170, easing: Easing.in(Easing.quad) })); }
    else if (!td.d) v.set(0);
    was.current = td.d;
  }, [td.d, v]);
  const stamp = useAnimatedStyle(() => ({ opacity: Math.min(1, v.value * 3), transform: [{ scale: 2.1 - 1.1 * v.value }, { rotate: '-14deg' }] }));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 }}>
      {first ? null : <Dotted style={{ position: 'absolute', top: 0, left: 30, right: 0 }} />}
      <Plated onPress={() => tickTodo(td.id)} role="checkbox" checked={td.d} a11y={td.t} hitSlop={8}>
        <View style={{ width: 20, height: 20, borderWidth: 1.5, borderColor: k.ink, backgroundColor: k.sheet }} />
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -3, top: -3, width: 26, height: 26, borderRadius: 13, backgroundColor: k.ink, alignItems: 'center', justifyContent: 'center' }, stamp]}>
          <View style={[StyleSheet.absoluteFill, { margin: 2, borderRadius: 11, borderWidth: 1, borderColor: k.paper }]} />
          <P f="title" size={12} lh={15} color={k.paper}>済</P>
        </Animated.View>
      </Plated>
      <Press onPress={() => todoSheet(td)} react="misprint" accessibilityRole="button" accessibilityLabel={`${td.t}を編集`} style={{ flex: 1, minWidth: 0 }}>
        <P f="serif" size={14} numberOfLines={1} color={td.d ? k.ink3 : k.ink} style={td.d ? { textDecorationLine: 'line-through' } : null}>{td.t}</P>
      </Press>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 96 }}>
        <Swatch plate={plates(td.s)} size={10} />
        <P f="serif" size={11} color={k.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>{s.name}</P>
      </View>
    </View>
  );
}

/** Deadlines as dated issues, nearest first; the ToDos tied to each as dots. */
function Deadlines() {
  const k = useInk();
  const deadlines = useDeadlines();
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <P f="title" size={19} lh={25}>締切</P>
        <View style={{ flex: 1 }} />
        <Chip label="＋ 追加" outline a11y="締切を追加" onPress={deadlineSheet} />
      </View>
      {deadlines.length ? deadlines.map((d, i) => {
        const soon = d.days <= 21;
        return (
          <Plated key={d.id} onPress={() => deadlineActions(d.id, d.t)} a11y={`${d.t} あと${d.days}日`} style={{ paddingVertical: 8 }}>
            {i ? <Dotted style={{ position: 'absolute', top: -8, left: 62, right: 0 }} /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 50, borderWidth: 1, borderColor: k.ink, backgroundColor: k.sheet }}>
                <View style={{ height: 16, backgroundColor: k.ink, alignItems: 'center', justifyContent: 'center' }}>
                  <P f="sansB" size={9.5} lh={12} color={k.paper}>{`${d.mo}月`}</P>
                </View>
                <View style={{ height: 32, alignItems: 'center', justifyContent: 'center' }}>
                  <P f="title" size={21} lh={26} num>{d.day}</P>
                </View>
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                <P f="title" size={15} lh={20} numberOfLines={1}>{d.t}</P>
                {d.total ? <Dots n={d.done} of={Math.min(10, d.total)} size={7} a11y={`ToDo ${d.done}/${d.total}`} /> : <P f="serif" size={11} color={k.ink3}>ToDoなし</P>}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ paddingHorizontal: soon ? 5 : 0, backgroundColor: soon ? k.ink : 'transparent' }}>
                  <P f="monoB" size={18} lh={23} num color={soon ? k.paper : k.ink}>{d.days}</P>
                </View>
                <P f="serif" size={10.5} color={k.ink3}>日後</P>
              </View>
            </View>
          </Plated>
        );
      }) : (
        <Plated onPress={deadlineSheet} a11y="締切を追加" style={{ paddingVertical: 12 }}>
          <P f="serif" size={13} color={k.ink3}>締切や大事な日を入れておきましょう</P>
        </Plated>
      )}
    </View>
  );
}

/** People studying now, printed as a little crowd; one chip to start along with them. */
function Peers() {
  const k = useInk();
  const { people, count } = usePeers();
  const peers = people.slice(0, 3);
  const running = useStore((s) => s.running);
  const [joined, setJoined] = useState(false);
  const join = () => {
    if (running) { toast('もう勉強中です'); return; }
    session.start();
    setJoined(true);
    haptic.success();
    toast('みんなと一緒に始めました');
  };
  return (
    <Press onPress={go.community} react="misprint" scale={0.99} accessibilityRole="button" accessibilityLabel={`いま${count}人が勉強中。みんなのページを開く`}
      style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
      <View style={{ width: 92, height: 56 }}>
        {peers.map((p, i) => (
          <View key={p.n} style={{ position: 'absolute', left: i * 26, top: i % 2 ? 12 : 0, width: 42, height: 42, borderRadius: 21, backgroundColor: i === 1 ? k.sheet : k.ink,
            borderWidth: 1.5, borderColor: i === 1 ? k.ink : k.paper, alignItems: 'center', justifyContent: 'center' }}>
            <P f="title" size={17} lh={21} color={i === 1 ? k.ink : k.paper}>{[...p.n][0]}</P>
          </View>
        ))}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <P f="title" size={17} lh={22}>いっしょに勉強中</P>
        <P f="serif" size={12} color={k.ink2} numberOfLines={1}><P f="monoB" size={12} num>{count.toLocaleString('en-US')}</P>{`人 · ${peers.map((p) => p.n).join('、')}`}</P>
        <Chip label={joined ? '勉強中' : '一緒に始める'} onPress={join} disabled={joined || running} a11y="一緒に始める" />
      </View>
    </Press>
  );
}

/** The last page: the colophon (奥付), with today's numbers in it. */
function Colophon() {
  const k = useInk();
  const l = useLevel();
  const today = useToday();
  const { done, total } = useTodos();
  const d = new Date();
  const rows: [string, string][] = [
    ['発行', 'Inchly'],
    ['号数', `第${l.lv}号`],
    ['発行日', `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`],
    ['本日', `${jpHm(today.min)}${total ? `　ToDo ${done}/${total}` : ''}`],
    ['印刷', 'ガリ版（一色刷り）'],
  ];
  return (
    <View style={{ alignSelf: 'center', width: '82%', maxWidth: 300, borderWidth: 1, borderColor: k.ink, paddingHorizontal: 14, paddingVertical: 12, gap: 4 }} accessible accessibilityLabel="奥付">
      <P f="title" size={13} lh={18} style={{ textAlign: 'center' }}>奥付</P>
      <View style={{ height: 1, backgroundColor: k.ink, marginVertical: 4 }} />
      {rows.map(([a, b]) => (
        <View key={a} style={{ flexDirection: 'row', gap: 10 }}>
          <P f="serif" size={11} color={k.ink3} style={{ width: 44 }}>{a}</P>
          <P f="serif" size={11.5} style={{ flex: 1 }} numberOfLines={1}>{b}</P>
        </View>
      ))}
    </View>
  );
}

/** While studying, once the "now" row has scrolled away: a little cover floats above the tab bar, still printing. */
function Floating() {
  const k = useInk();
  const ss = useSession();
  const barsTop = useBarsTop();
  const no = useNo(ss.subject.id);
  const bob = useSharedValue(0);
  useEffect(() => { bob.set(withRepeat(withSequence(withTiming(-3, { duration: 1300 }), withTiming(0, { duration: 1300 })), -1, false)); }, [bob]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }, { rotate: '3deg' }] }));
  if (!ss.running) return null;
  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(160)} style={[{ position: 'absolute', right: 18, bottom: barsTop + 14 }, a]}>
      <Cover w={56} h={74} onPress={go.timer} a11y={`${ss.subject.name}を勉強中 ${clock(ss.elapsed)}。タイマーを開く`} live={!ss.paused}>
        <SubjectArt w={56} h={74} id={ss.subject.id} name={ss.subject.name} no={no} />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 3, alignItems: 'center' }}>
          <View style={{ backgroundColor: k.ink, paddingHorizontal: 3 }}>
            <P f="monoB" size={9} lh={12} num color={k.paper}>{clock(ss.elapsed)}</P>
          </View>
        </View>
      </Cover>
    </Animated.View>
  );
}

const sections: HomeKit['sections'] = {
  today: Today,
  now: Now,
  chart: Chart,
  streak: Streak,
  todos: Todos,
  deadlines: Deadlines,
  peers: Peers,
  'x:colophon': Colophon,
};

export const home: HomeKit = { Page, Header, Frame, sections, arrange: ORDER, DesignHandle: Ribbon };
