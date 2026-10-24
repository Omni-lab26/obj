import { ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { pad, subj } from '@/data';
import type { Block } from '@/screens/layout';
import { clock, go, hmColon, jpHm, pickLabel, session, startPick, tickTodo, useCharts, useDeadlines, useNext, usePeers, useSession, useToday, useTodos, useWeekStreak } from '@/screens/model';
import { T } from '@/themes/kit';
import type { HomeKit } from '@/themes/types';
import { setChart, Todo, useLevel, useStore } from '@/store';
import { useT } from '@/theme';
import { Avatar, haptic, Press } from '@/ui/base';
import { Screen, useTabPad, useUnread } from '@/ui/Chrome';
import { deadlineActions, deadlineSheet, todoSheet } from '@/ui/Editors';
import { Icon } from '@/ui/Icon';
import { levelSheet } from '@/ui/Level';
import { toast } from '@/ui/Toast';
import { alpha, candy, Mood, pastel } from './look';
import { Bubble, Bubbly, Candy, Card, Chip, Dashed, HeartCheck, Mochi, Pill, R, Shape, Title, Twinkle, usePulse, useV, Wiggle } from './parts';

// かわいい's home: a page of a sticker diary. Today sits on a taped card with
// the mochi perched on its edge, saying how it's going; the day is a candy
// bar up to a heart at the goal. Under it, the days you showed up as stamps,
// the log as jelly bars, a ToDo list with hearts to tick, deadlines as little
// calendar pages, and the people studying now.

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

// ---------- page and header ----------
function Page({ header, children }: { header: ReactNode; children: ReactNode }) {
  const tabPad = useTabPad();
  return (
    <Screen>
      {header}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 2, paddingBottom: tabPad + 10, gap: 24 }}>
        {children}
      </ScrollView>
    </Screen>
  );
}

function Header() {
  const t = useT();
  const v = useV();
  const unread = useUnread();
  const me = useStore((s) => s.account?.name ?? 'はる');
  const l = useLevel();
  const narrow = useWindowDimensions().width < 360;
  const k = narrow ? 32 : 36;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: narrow ? 6 : 8, paddingHorizontal: 16, paddingTop: 4, height: 58 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }} accessible accessibilityLabel="Inchly">
        <R size={narrow ? 22 : 25} lh={30} ls={-0.5} color={t.ink}>inchly</R>
        <View style={{ marginLeft: 1, marginTop: 1 }}><Shape kind="heart" size={12} fill={v.accent} /></View>
      </View>
      <Wiggle label={`レベル${l.lv}。次のレベルまで${Math.round(l.need)} EXP`} onPress={levelSheet}>
        <View style={{ height: 26, paddingHorizontal: 9, borderRadius: 13, backgroundColor: pastel(v.accent2, 0.62), flexDirection: 'row', alignItems: 'center', gap: 4, transform: [{ rotate: '-4deg' }],
          boxShadow: `0px 0px 0px 2px ${t.surface}, 0px 2px 0px 2px ${alpha(v.accent2, 0.35)}` }}>
          <Shape kind="star" size={13} fill={v.sun} stroke={t.ink} sw={8} />
          <R size={12} lh={15} color={t.ink}>{`Lv.${l.lv}`}</R>
        </View>
      </Wiggle>
      <View style={{ flex: 1 }} />
      <Bubbly label="さがす" onPress={go.search} size={k}><Icon name="search" size={16} color={t.ink} width={2} /></Bubbly>
      <Bubbly label="お知らせ" onPress={go.notifications} size={k} dot={unread > 0}><Icon name="bell" size={16} color={t.ink} width={2} /></Bubbly>
      <Press onPress={go.me} scale={0.9} accessibilityLabel="マイページ" style={{ borderRadius: k / 2, boxShadow: `0px 0px 0px 2px ${alpha(v.accent, 0.45)}` }}>
        <Avatar name={me} color="#6E56CF" size={k} />
      </Press>
      <Bubbly label="設定" onPress={go.settings} size={k}><Icon name="gear" size={16} color={t.ink} width={2} /></Bubbly>
    </View>
  );
}

// ---------- today, on a taped card with the mochi on top ----------
function HeroFrame({ children }: { children: ReactNode }) {
  const v = useV();
  const narrow = useWindowDimensions().width < 370;
  return (
    <View style={{ paddingTop: 58 }}>
      {/* a twinkle or two in the margin, where the mochi's bubble doesn't reach */}
      {narrow ? null : <Twinkle color={v.sun} size={16} style={{ left: 8, top: 22 }} />}
      {narrow ? null : <Twinkle color={v.accent2} size={11} delay={600} style={{ left: 34, top: 8 }} />}
      <Card pad={0} tape={v.tapes[0]}>{children}</Card>
      <View style={{ position: 'absolute', right: 12, top: 4 }}><HomeMochi /></View>
    </View>
  );
}
function HomeMochi() {
  const ss = useSession();
  const today = useToday();
  const mood: Mood = ss.running ? (ss.paused ? 'sleep' : 'work') : today.reached ? 'happy' : 'idle';
  const line = ss.running
    ? ss.paused ? 'ひとやすみ中…' : `${ss.subject.name} ${Math.floor(ss.elapsed / 60)}分め！`
    : today.reached ? '目標クリア！えらい'
    : today.min ? `あと${jpHm(Math.max(1, today.goal - today.min))}で目標！` : 'きょうも ちょっとずつね';
  return <Mochi mood={mood} size={74} line={line} lift={0.2} />;
}

function Today() {
  const t = useT();
  const v = useV();
  const today = useToday();
  const ss = useSession();
  const next = useDeadlines()[0];
  const H = Math.floor(today.min / 60), M = today.min % 60;
  const { pieces, goalAt } = candy(today.parts, ss.running ? ss.elapsed / 60 : 0, ss.subject.c, today.goal);
  const d = new Date();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingRight: 70 }}>
        <T size={13} w="800" color={t.ink2}>今日の勉強</T>
        <T size={12} color={t.ink3}>{`${d.getMonth() + 1}月${d.getDate()}日(${DOW[d.getDay()]})`}</T>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }} accessible accessibilityLabel={`今日 ${H}時間${M}分。昨日より${today.diff}分`}>
        <R size={56} lh={62} num color={t.ink}>{H}</R>
        <T size={16} w="800" color={t.ink2} style={{ marginBottom: 10, marginLeft: 3, marginRight: 8 }}>時間</T>
        <R size={56} lh={62} num color={t.ink}>{pad(M)}</R>
        <T size={16} w="800" color={t.ink2} style={{ marginBottom: 10, marginLeft: 3 }}>分</T>
      </View>
      {today.min || today.yesterday || next ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {today.min || today.yesterday ? <Chip bg={pastel(v.accent2, 0.72)}>{`${today.diff >= 0 ? '▲' : '▼'} ${hmColon(Math.abs(today.diff))} きのうより`}</Chip> : null}
          {next ? <Chip bg={next.days <= 7 ? v.soft : pastel(v.sun, 0.55)}>{`${next.t}まで ${next.days}日`}</Chip> : null}
        </View>
      ) : null}
      <View style={{ marginTop: 6 }}>
        <Candy pieces={pieces} goalAt={goalAt} />
      </View>
      <T size={12} lh={17} color={t.ink2} numberOfLines={2}>
        {today.reached ? '目標クリア！ きょうのシールをもらえたよ' : `目標 ${hmColon(today.goal)} まで あと ${jpHm(Math.max(1, today.goal - today.min))}`}
      </T>
    </View>
  );
}

/** At the foot of the card: the session under way, or what's next with a button to start it. */
function Now() {
  const t = useT();
  const v = useV();
  const ss = useSession();
  const pick = useNext();
  const pulse = usePulse(ss.running && !ss.paused);
  const dot = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, paddingHorizontal: 16, paddingVertical: 12 };
  if (ss.running) {
    return (
      <View>
        <Dashed color={alpha(v.accent, 0.45)} style={{ marginHorizontal: 14 }} />
        <View style={row}>
          <Press onPress={go.timer} scale={0.98} accessibilityLabel={`${ss.subject.name}を勉強中 ${clock(ss.elapsed)}。タイマーを開く`} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Animated.View style={dot}><Shape kind="heart" size={18} fill={ss.subject.c} stroke={t.ink} sw={8} /></Animated.View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T size={11} lh={14} color={ss.paused ? v.deep : t.ink3}>{ss.paused ? 'ひとやすみ中' : 'いま勉強中'}</T>
              <T size={14} w="800" lh={19} numberOfLines={1}>{ss.subject.name}<T size={12} color={t.ink3}>{ss.task ? `  ${ss.task}` : ''}</T></T>
            </View>
            <R size={22} lh={26} num color={t.ink}>{clock(ss.elapsed)}</R>
          </Press>
          <Bubbly label={ss.paused ? '再開' : '一時停止'} onPress={session.pause} size={38}>
            <Icon name={ss.paused ? 'play' : 'pause'} size={14} color={t.ink} />
          </Bubbly>
        </View>
      </View>
    );
  }
  const p = subj(pick.s);
  return (
    <View>
      <Dashed color={alpha(v.accent, 0.45)} style={{ marginHorizontal: 14 }} />
      <View style={row}>
        <Press onPress={go.study} scale={0.98} accessibilityLabel={`${pickLabel(pick)} ${p.name} ${pick.what}。勉強のページを開く`} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Shape kind="heart" size={18} fill={p.c} stroke={t.ink} sw={8} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={11} lh={14} color={t.ink3} numberOfLines={1}>{pickLabel(pick)}</T>
            <T size={14} w="800" lh={19} numberOfLines={1}>{p.name}<T size={12} color={t.ink3}>{pick.what ? `  ${pick.what}` : ''}</T></T>
          </View>
        </Press>
        <Pill label="はじめる" a11y={`${p.name}を始める`} h={40} onPress={() => startPick(pick)} icon={<Icon name="play" size={12} color="#FFFFFF" />} />
      </View>
    </View>
  );
}

// ---------- streak: a stamp for every day you showed up ----------
function Streak() {
  const t = useT();
  const v = useV();
  const { streak, tickets, days } = useWeekStreak();
  const { week, goal } = useCharts();
  const [kick, setKick] = useState(0);
  return (
    <Press onPress={() => { haptic.soft(); setKick((k) => k + 1); }} scale={0.98} accessibilityLabel={`${streak}日連続で勉強中。休み券${tickets}枚`}>
      <Card tape={v.tapes[1]} tapeAt="right" style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Shape kind="star" size={50} fill={streak ? v.sun : v.soft} stroke={t.ink} sw={5} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={12} w="800" color={t.ink3} numberOfLines={1}>{streak ? 'つづいてる日' : 'きょうから はじめよ'}</T>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
              <R size={32} lh={36} num color={t.ink}>{streak}</R>
              <T size={15} w="800" color={t.ink2} style={{ marginBottom: 5 }}>日れんぞく</T>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {Array.from({ length: 3 }, (_, i) => (
                <View key={i} style={{ width: 16, height: 20, borderRadius: 4, backgroundColor: i < tickets ? pastel(v.accent2, 0.5) : 'transparent', borderWidth: 1.5, borderColor: i < tickets ? alpha(v.accent2, 0.9) : alpha(v.accent2, 0.4), borderStyle: i < tickets ? 'solid' : 'dashed', transform: [{ rotate: `${(i - 1) * 6}deg` }] }} />
              ))}
            </View>
            <T size={10.5} color={t.ink3}>{`休み券 ${tickets}`}</T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {days.map((d, i) => <Day key={d.date} d={d} i={i} kick={kick} reached={!d.future && week[i] ? week[i].min >= goal : false} />)}
        </View>
      </Card>
    </Press>
  );
}
type DayInfo = ReturnType<typeof useWeekStreak>['days'][number];
function Day({ d, i, kick, reached }: { d: DayInfo; i: number; kick: number; reached: boolean }) {
  const t = useT();
  const v = useV();
  const r = useSharedValue(0);
  useEffect(() => {
    if (!kick) return;
    r.set(withDelay(i * 45, withSequence(withTiming(-14, { duration: 80 }), withTiming(12, { duration: 100 }), withSpring(0, { duration: 420, dampingRatio: 0.35 }))));
  }, [kick, i, r]);
  const a = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value + (d.studied ? (i % 2 ? 8 : -8) : 0)}deg` }] }));
  const S = 34;
  let face: ReactNode;
  if (d.studied) face = <Shape kind={v.stamps[i % v.stamps.length]} size={S} fill={reached ? v.accent : pastel(v.accent, 0.55)} stroke={t.ink} sw={6} />;
  else if (d.rest) face = <View style={{ alignItems: 'center', justifyContent: 'center' }}><Shape kind="cloud" size={S} fill={pastel(v.accent2, 0.6)} stroke={t.ink} sw={5} /><T size={8.5} w="800" lh={10} color={t.ink} style={{ position: 'absolute', top: 15 }}>やすみ</T></View>;
  else face = <View style={{ width: S - 6, height: S - 6, margin: 3, borderRadius: S, borderWidth: 2, borderColor: d.today ? alpha(v.deep, 0.6) : alpha(v.accent, 0.35), borderStyle: 'dashed' }} />;
  return (
    <View style={{ alignItems: 'center', gap: 4 }} accessible accessibilityLabel={`${d.label}曜日 ${d.studied ? `勉強した${reached ? '・目標クリア' : ''}` : d.rest ? '休み券を使った' : d.future ? 'これから' : '勉強しなかった'}`}>
      <Animated.View style={a}>{face}</Animated.View>
      {reached ? <View style={{ position: 'absolute', top: -5, right: -4 }}><Shape kind="sparkle" size={12} fill={v.sun} stroke={t.ink} sw={6} /></View> : null}
      <T size={10.5} w={d.today ? '800' : '600'} lh={13} color={d.today ? v.deep : t.ink3}>{d.today ? 'きょう' : d.label}</T>
    </View>
  );
}

// ---------- the log: jelly bars ----------
type Col = { key: string; label: string; min: number; live: number; parts: { id: string; c: string; min: number }[]; hi: boolean; future: boolean };
function Chart() {
  const t = useT();
  const v = useV();
  const range = useStore((s) => s.chart.range);
  const ch = useCharts();
  const liveColor = subj(useStore((s) => s.subj)).c;
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<{ range: string; i: number } | null>(null);
  const day = range === 'day';
  const cols: Col[] = day
    ? ch.hours.map((x) => ({ key: String(x.h), label: `${x.h}時`, min: x.min, live: x.live, parts: x.parts, hi: x.now, future: x.future }))
    : ch.week.map((x) => ({ key: x.date, label: `${x.label}曜日`, min: x.min, live: x.live, parts: x.parts, hi: x.today, future: x.future }));
  const PLOT = 128;
  const top = Math.max(...cols.map((c) => c.min), day ? 60 : ch.goal, 1);
  const gap = day ? 3 : 10;
  const bw = w ? (w - gap * (cols.length - 1)) / cols.length : 0;
  const total = cols.reduce((a, c) => a + c.min, 0);
  const peak = cols.reduce((a, c, i) => (c.min > cols[a].min ? i : a), 0);
  const days = ch.week.filter((x) => !x.future).length || 1;
  const line = day
    ? total ? `合計 ${hmColon(total)} · いちばんは ${peak}時台` : 'まだ きろくはないよ'
    : `今週 ${hmColon(ch.weekTotal)} · 1日平均 ${hmColon(ch.weekTotal / days)}`;
  const picked = sel && sel.range === range ? sel.i : null;
  const goalY = !day && ch.goal ? PLOT - (ch.goal / top) * PLOT : null;
  const narrow = useWindowDimensions().width < 360;
  return (
    <Card tape={v.tapes[2]} style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Shape kind="flower" size={20} fill={v.accent2} stroke={t.ink} sw={6} />
        <T size={16} w="800" lh={22} numberOfLines={1} style={{ flex: 1 }}>{narrow ? 'きろく' : 'じかんの きろく'}</T>
        {(['day', 'week'] as const).map((r) => {
          const on = range === r;
          return (
            <Pressable key={r} onPress={() => { haptic.tap(); setChart({ range: r }); }} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={r === 'day' ? '今日を時間ごとに' : '今週を日ごとに'} hitSlop={6}
              style={{ height: 28, paddingHorizontal: 11, borderRadius: 14, justifyContent: 'center', backgroundColor: on ? v.deep : v.soft }}>
              <T size={12} w="800" lh={16} color={on ? '#FFFFFF' : t.ink2}>{r === 'day' ? 'きょう' : 'こんしゅう'}</T>
            </Pressable>
          );
        })}
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: PLOT + 30 }}
        accessible accessibilityLabel={`${day ? '今日の時間ごとの' : '今週の日ごとの'}勉強時間。${line}`}>
        {/* dotted guide lines */}
        {[0.25, 0.5, 0.75].map((f) => <Dashed key={f} color={alpha(v.accent, 0.18)} style={{ position: 'absolute', left: 0, right: 0, top: 30 + PLOT * f }} />)}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 30 + PLOT, height: 2, borderRadius: 1, backgroundColor: alpha(v.accent, 0.35) }} />
        {goalY !== null ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 30 + goalY - 1 }}>
            <Dashed color={v.deep} />
            <View style={{ position: 'absolute', right: -2, top: -9 }}><Shape kind="heart" size={18} fill={v.deep} stroke={t.surface} sw={10} /></View>
          </View>
        ) : null}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 30, height: PLOT, flexDirection: 'row', alignItems: 'flex-end', gap }}>
          {bw ? cols.map((c, i) => (
            <Jelly key={c.key} c={c} bw={bw} h={c.min ? Math.max(bw, (c.min / top) * PLOT) : 0} liveColor={liveColor} on={picked === i}
              onPress={() => setSel(picked === i ? null : { range, i })} />
          )) : null}
        </View>
        {picked !== null && bw ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: Math.max(0, 30 + PLOT - (cols[picked].min ? Math.max(bw, (cols[picked].min / top) * PLOT) : 0) - 36),
            left: Math.min(Math.max(0, picked * (bw + gap) + bw / 2 - 60), w - 120), width: 120, alignItems: 'center' }}>
            <Bubble tail="down" size={11.5} text={`${cols[picked].label} ${cols[picked].min ? jpHm(cols[picked].min) : 'なし'}`} />
          </View>
        ) : null}
      </View>
      {/* the axis */}
      <View style={{ height: 14, marginTop: -6 }}>
        {bw ? (day ? [0, 6, 12, 18, 23] : cols.map((_, i) => i)).map((i) => (
          <View key={i} style={{ position: 'absolute', left: day ? Math.min(i * (bw + gap), w - 22) : i * (bw + gap), width: day ? 22 : bw, alignItems: day ? 'flex-start' : 'center' }}>
            <T size={10} w={cols[i].hi ? '800' : '600'} lh={13} color={cols[i].hi ? v.deep : t.ink3}>{day ? String(i) : ch.week[i].label}</T>
          </View>
        )) : null}
      </View>
      <T size={12} lh={16} color={t.ink2} numberOfLines={1}>{line}</T>
    </Card>
  );
}
/** One jelly bar: subjects stacked in a capsule with a shine, the session under way glowing on top; it wobbles when tapped. */
function Jelly({ c, bw, h, liveColor, on, onPress }: { c: Col; bw: number; h: number; liveColor: string; on: boolean; onPress: () => void }) {
  const t = useT();
  const v = useV();
  const s = useSharedValue(1);
  const pulse = usePulse(c.live > 0);
  const live = useAnimatedStyle(() => ({ opacity: 0.4 + 0.35 * pulse.value }));
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - s.value) * h * 0.5 }, { scaleY: s.value }, { scaleX: 2 - s.value }] }));
  const press = () => {
    haptic.tap();
    s.set(withSequence(withTiming(0.8, { duration: 90 }), withSpring(1, { duration: 520, dampingRatio: 0.3 })));
    onPress();
  };
  const recorded = c.min - c.live;
  return (
    <Pressable onPress={press} accessibilityRole="button" accessibilityLabel={`${c.label} ${c.min ? jpHm(c.min) : 'なし'}`} hitSlop={{ top: 8, bottom: 8 }}
      style={{ width: bw, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
      {h ? (
        <Animated.View style={[{ width: bw, height: h, borderRadius: bw / 2, overflow: 'hidden', backgroundColor: v.soft, flexDirection: 'column-reverse',
          boxShadow: on ? `0px 0px 0px 2px ${t.ink}` : undefined }, a]}>
          {c.parts.map((p) => <View key={p.id} style={{ height: (p.min / Math.max(1, c.min)) * h, backgroundColor: p.c }} />)}
          {c.live > 0 ? <Animated.View style={[{ height: (c.live / Math.max(1, c.min)) * h, backgroundColor: liveColor }, live]} /> : null}
          {recorded <= 0 && c.live <= 0 ? null : (
            <View pointerEvents="none" style={{ position: 'absolute', left: bw * 0.2, width: Math.max(2, bw * 0.22), top: Math.min(bw * 0.35, h * 0.2), bottom: Math.min(bw * 0.35, h * 0.2), borderRadius: bw, backgroundColor: 'rgba(255,255,255,0.45)' }} />
          )}
        </Animated.View>
      ) : (
        <View style={{ width: Math.min(bw, 8), height: Math.min(bw, 8), borderRadius: 4, backgroundColor: c.future ? 'transparent' : alpha(v.accent, 0.22), marginBottom: 2 }} />
      )}
    </Pressable>
  );
}

// ---------- ToDos, ticked with hearts ----------
function Todos() {
  const t = useT();
  const v = useV();
  const { todos, done, total } = useTodos();
  const open = todos.filter((x) => !x.d);
  const shown = [...open.slice(0, 4), ...todos.filter((x) => x.d).slice(0, Math.max(0, 3 - open.length))];
  const more = total - shown.length;
  return (
    <Card style={{ gap: 4 }}>
      <Title sticker="heart" text="やること" sub={total ? `${done} / ${total}` : undefined}
        action={<Pill label="追加" a11y="ToDoを追加" kind="paper" h={30} onPress={() => todoSheet()} icon={<Icon name="plus" size={11} color={t.ink} width={2.6} />} />} />
      {total ? shown.map((td, i) => <TodoRow key={td.id} td={td} first={i === 0} />) : (
        <View style={{ paddingVertical: 10, gap: 10, alignItems: 'flex-start' }}>
          <T size={13} lh={19} color={t.ink2}>やることを1つ書いておくと、はじめやすくなるよ</T>
          <Pill label="ToDoを追加" kind="deep" h={36} onPress={() => todoSheet()} icon={<Icon name="plus" size={12} color="#FFFFFF" width={2.6} />} />
        </View>
      )}
      {more > 0 ? (
        <Press onPress={go.study} accessibilityLabel={`ほかのToDo ${more}件。勉強のページを開く`} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 3, paddingTop: 6 }}>
          <T size={12.5} w="800" color={v.deep}>{`ほか ${more}件`}</T>
          <Icon name="chev" size={12} color={v.deep} />
        </Press>
      ) : null}
    </Card>
  );
}
function TodoRow({ td, first }: { td: Todo; first: boolean }) {
  const t = useT();
  const v = useV();
  const s = subj(td.s);
  return (
    <View>
      {first ? null : <Dashed color={alpha(v.accent, 0.3)} style={{ marginLeft: 38 }} />}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingVertical: 6 }}>
        <HeartCheck on={td.d} label={`${td.t}を${td.d ? '未完了に戻す' : '完了にする'}`} onPress={() => tickTodo(td.id)} />
        <Press onPress={() => todoSheet(td)} scale={0.98} accessibilityLabel={`${td.t}を編集`} style={{ flex: 1, minWidth: 0 }}>
          <T size={14} w="700" lh={19} numberOfLines={1} color={td.d ? t.ink3 : t.ink} style={td.d ? { textDecorationLine: 'line-through' } : null}>{td.t}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.c }} />
            <T size={11} lh={14} color={t.ink3} numberOfLines={1}>{s.name}</T>
          </View>
        </Press>
        {td.d ? null : (
          <Bubbly label={`${td.t}を始める`} onPress={() => startPick({ s: td.s, what: td.t, todoId: td.id, from: 'todo' })} size={32}>
            <Icon name="play" size={11} color={v.deep} />
          </Bubbly>
        )}
      </View>
    </View>
  );
}

// ---------- deadlines: little calendar pages ----------
function Deadlines() {
  const t = useT();
  const v = useV();
  const list = useDeadlines();
  const [w, setW] = useState(0);
  const half = w ? (w - 12) / 2 : 0;
  return (
    <View style={{ gap: 12 }}>
      <Title sticker="star" text="しめきり" sub={list.length ? `${list.length}件` : undefined}
        action={<Pill label="追加" a11y="締切を追加" kind="paper" h={30} onPress={deadlineSheet} icon={<Icon name="plus" size={11} color={t.ink} width={2.6} />} />} />
      {list.length ? (
        <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {half ? list.map((d, i) => (
            <Wiggle key={d.id} label={`${d.t} あと${d.days}日`} onPress={() => deadlineActions(d.id, d.t)} amount={5} style={{ width: half }}>
              <View style={{ borderRadius: 18, backgroundColor: t.surface, overflow: 'hidden', transform: [{ rotate: `${i % 2 ? 1.5 : -1.5}deg` }],
                boxShadow: `0px 0px 0px 2px ${alpha(v.accent, 0.3)}, 0px 4px 0px 0px ${alpha(v.accent, 0.2)}` }}>
                <View style={{ height: 24, backgroundColor: d.days <= 7 ? v.deep : v.soft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.surface }} />
                  <T size={11.5} w="800" lh={15} color={d.days <= 7 ? '#FFFFFF' : t.ink2}>{`${d.mo}月`}</T>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.surface }} />
                </View>
                <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 10, paddingHorizontal: 10, gap: 2 }}>
                  <R size={30} lh={36} num color={t.ink}>{d.day}</R>
                  <T size={12.5} w="800" lh={17} numberOfLines={1}>{d.t}</T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <Chip bg={d.days <= 7 ? pastel(v.deep, 0.8) : pastel(v.accent2, 0.75)}>{d.days ? `あと${d.days}日` : 'きょう！'}</Chip>
                  </View>
                  {d.total ? (
                    <View style={{ flexDirection: 'row', gap: 2, marginTop: 4 }} accessible accessibilityLabel={`ToDo ${d.done}/${d.total}`}>
                      {Array.from({ length: Math.min(d.total, 8) }, (_, k) => <Shape key={k} kind="heart" size={11} fill={k < d.done ? v.accent : t.surface} stroke={k < d.done ? v.deep : alpha(v.deep, 0.4)} sw={9} />)}
                    </View>
                  ) : <T size={10.5} lh={14} color={t.ink3}>ToDoなし</T>}
                </View>
              </View>
            </Wiggle>
          )) : null}
        </View>
      ) : (
        <View style={{ borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: alpha(v.accent, 0.45), padding: 14, gap: 10, alignItems: 'flex-start' }}>
          <T size={13} lh={19} color={t.ink2}>大事な日を入れておくと、あと何日か数えるよ</T>
          <Pill label="締切を追加" kind="deep" h={36} onPress={deadlineSheet} icon={<Icon name="plus" size={12} color="#FFFFFF" width={2.6} />} />
        </View>
      )}
    </View>
  );
}

// ---------- the people studying now ----------
function Peers() {
  const t = useT();
  const v = useV();
  const { people, count } = usePeers();
  const running = useStore((s) => s.running);
  const [joined, setJoined] = useState(false);
  const join = () => {
    if (running) { toast('もう勉強中です'); return; }
    session.start();
    setJoined(true);
    haptic.success();
    toast('みんなと一緒に始めました');
  };
  const shown = people.slice(0, 5);
  return (
    <Press onPress={go.community} scale={0.985} accessibilityLabel={`いま${count}人が勉強中。みんなのページを開く`}>
      <Card style={{ gap: 12 }}>
        <Title sticker="sparkle" text="いっしょに勉強中" sub={`${(count + (joined ? 1 : 0)).toLocaleString('ja-JP')}人`} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', flexShrink: 1 }}>
            {shown.map((p, i) => (
              <View key={p.n} style={{ marginLeft: i ? -9 : 0, zIndex: 10 - i, transform: [{ rotate: `${(i % 2 ? 6 : -6)}deg` }], borderRadius: 18, boxShadow: `0px 0px 0px 2.5px ${t.surface}, 0px 0px 0px 4px ${alpha(v.accent, 0.35)}` }}>
                <Avatar name={p.n} color={p.c} size={32} />
              </View>
            ))}
          </View>
          <View style={{ flex: 1 }} />
          {joined || running ? (
            <View accessible accessibilityLabel="いま勉強中" style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: v.soft, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Shape kind="heart" size={12} fill={v.deep} />
              <T size={12.5} w="800" lh={16} color={t.ink}>勉強中</T>
            </View>
          ) : <Pill label="いっしょに はじめる" a11y="一緒に始める" h={36} onPress={join} />}
        </View>
        <T size={11.5} lh={15} color={t.ink3} numberOfLines={1}>{people.slice(0, 3).map((p) => p.n).join(' · ')}</T>
      </Card>
    </Press>
  );
}

// ---------- the handle to the デザイン page ----------
function Handle({ onPress }: { onPress: () => void }) {
  const t = useT();
  const v = useV();
  return (
    <Press onPress={onPress} hitSlop={{ top: 20, bottom: 20, left: 4, right: 14 }} scale={0.9} accessibilityRole="button" accessibilityLabel="デザインを変える"
      style={{ position: 'absolute', left: 0, top: '44%', width: 18, height: 58, borderTopRightRadius: 14, borderBottomRightRadius: 14, backgroundColor: v.soft, alignItems: 'center', justifyContent: 'center',
        boxShadow: `0px 0px 0px 2px ${alpha(v.accent, 0.45)}, 2px 3px 0px 0px ${alpha(v.accent, 0.25)}` }}>
      <Shape kind="heart" size={11} fill={v.deep} stroke={t.surface} sw={8} />
    </Press>
  );
}

// ---------- the kit ----------
const OWN = new Set(['today', 'now', 'chart', 'streak', 'todos', 'deadlines', 'peers']);
function Frame({ block, children }: { block: Block; index: number; children: ReactNode }) {
  if (block.id === 'hero') return <HeroFrame>{children}</HeroFrame>;
  if (block.row) return <View style={{ flexDirection: 'row', gap: 12 }}>{(Array.isArray(children) ? children : [children]).map((c, i) => <View key={i} style={{ flex: 1, minWidth: 0 }}>{c}</View>)}</View>;
  if (block.sections.every((k) => OWN.has(k))) return <>{children}</>;
  // a section the base gained later: the standard drawing, on one of our cards
  return <Card>{children}</Card>;
}

export const home: HomeKit = {
  Page,
  Header,
  Frame,
  DesignHandle: Handle,
  arrange: () => [
    { id: 'grass', sections: ['grass'] },
    { id: 'streak', sections: ['streak'] },
    { id: 'hero', sections: ['today'] },
    { id: 'peers', sections: ['peers'] },
  ],
  sections: { today: Today, now: Now, chart: Chart, streak: Streak, todos: Todos, deadlines: Deadlines, peers: Peers },
};
