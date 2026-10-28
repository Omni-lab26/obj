import { ReactNode, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { pad, subj } from '@/data';
import type { Block } from '@/screens/layout';
import { clock, go, hmColon, pickLabel, session, Slice, startPick, tickTodo, useCharts, useDeadlines, useNext, usePeers, useSession, useToday, useTodos, useWeekStreak } from '@/screens/model';
import { T } from '@/themes/kit';
import type { HomeKit } from '@/themes/types';
import { setChart, Todo, useLevel, useStore } from '@/store';
import { Avatar, haptic, Press } from '@/ui/base';
import { Screen, useTabPad, useUnread } from '@/ui/Chrome';
import { deadlineActions, deadlineSheet, todoSheet } from '@/ui/Editors';
import { Icon, IconName } from '@/ui/Icon';
import { levelSheet } from '@/ui/Level';
import { toast } from '@/ui/Toast';
import { alpha, cells, P, ring, sit } from './look';
import { Box, DotGrid, Flame, Key, Label, Mini, Mood, Pal, PalMark, PixelArt } from './pixel';

// ピクセル箱's home. The pal stands on today's card; under it, today in
// 10-minute blocks and what to start; a ticker of the numbers; the log as a
// pixel display in a code window; the streak, ToDos you can tick right here,
// deadlines as cards, and a little crowd you can join.

const DOW_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const TINTS = [P.stage.lilac, P.stage.sky, P.stage.peach, P.stage.cream];

// ---------- page and header ----------
function Page({ header, children }: { header: ReactNode; children: ReactNode }) {
  const tabPad = useTabPad();
  return (
    <Screen bg={P.paper}>
      <DotGrid />
      {header}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabPad + 8, gap: 24 }}>
        {children}
      </ScrollView>
    </Screen>
  );
}

function IconKey({ name, label, onPress, dot, size }: { name: IconName; label: string; onPress: () => void; dot?: boolean; size: number }) {
  return (
    <Key label={label} onPress={onPress} radius={10} depth={3} style={{ width: size }} face={{ height: size - 3 }}>
      <Icon name={name} size={16} color={P.ink} width={2} />
      {dot ? <View style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, backgroundColor: P.coral, boxShadow: ring(P.ink, 1.5) }} /> : null}
    </Key>
  );
}

function Header() {
  const unread = useUnread();
  const me = useStore((s) => s.account?.name ?? 'はる');
  const l = useLevel();
  const narrow = useWindowDimensions().width < 360;
  const k = narrow ? 32 : 35;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: narrow ? 6 : 8, paddingHorizontal: 16, paddingTop: 4, height: 58 }}>
      {narrow ? null : <PalMark px={2} />}
      <T f="groteskBold" size={25} lh={30} ls={-1}>inchly</T>
      <Key label={`レベル${l.lv}。次のレベルまで${Math.round(l.need)} EXP`} onPress={levelSheet} color={P.lime} radius={8} depth={2} face={{ height: 24, paddingHorizontal: 7 }}>
        <T f="label" size={10} lh={13}>{`LV ${l.lv}`}</T>
      </Key>
      <View style={{ flex: 1 }} />
      <IconKey name="search" label="さがす" onPress={go.search} size={k} />
      <IconKey name="bell" label="お知らせ" onPress={go.notifications} dot={unread > 0} size={k} />
      <Press onPress={go.me} scale={0.9} accessibilityLabel="マイページ" style={{ borderRadius: k / 2, boxShadow: ring() }}>
        <Avatar name={me} color="#6E56CF" size={k - 3} />
      </Press>
      <IconKey name="gear" label="設定" onPress={go.settings} size={k} />
    </View>
  );
}

// ---------- the hero: the pal on today's card ----------
function HeroFrame({ children }: { children: ReactNode }) {
  const d = new Date();
  return (
    <View>
      <View style={{ height: 78, flexDirection: 'row', alignItems: 'flex-end', marginBottom: -2, zIndex: 2 }}>
        <View style={{ flex: 1, paddingBottom: 14 }}>
          <Label text={`TODAY · ${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${DOW_EN[d.getDay()]}`} />
        </View>
        <View style={{ marginRight: 18 }}><HomePal /></View>
      </View>
      <Box>{children}</Box>
    </View>
  );
}
function HomePal() {
  const running = useStore((s) => s.running);
  const paused = useStore((s) => s.paused);
  const today = useToday();
  const mood: Mood = running ? (paused ? 'idle' : 'work') : today.reached ? 'happy' : today.min === 0 ? 'sleep' : 'idle';
  return <Pal mood={mood} px={4} />;
}

/** Today: the total, how it compares with yesterday, and the day so far in 10-minute blocks. */
function Today() {
  const today = useToday();
  const running = useStore((s) => s.running);
  const ss = useSession();
  const next = useDeadlines()[0];
  const H = Math.floor(today.min / 60), M = today.min % 60;
  const up = today.diff >= 0;
  const liveMin = running ? ss.elapsed / 60 : 0;
  const unit = 10;
  const left = Math.max(0, Math.ceil((today.goal - today.min) / unit));
  return (
    <View>
      <View style={{ backgroundColor: P.stage.lime, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, overflow: 'hidden' }}>
        <DotGrid color="rgba(23,18,31,0.09)" gap={12} />
        <T size={12} w="700" color={P.ink2}>今日の勉強</T>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 }} accessible accessibilityLabel={`今日 ${H}時間${M}分。昨日より${today.diff}分`}>
          <T f="groteskBold" size={64} lh={68} ls={-2.5} num>{H}</T>
          <T size={15} w="800" style={{ marginBottom: 11, marginLeft: 3, marginRight: 10 }}>時間</T>
          <T f="groteskBold" size={64} lh={68} ls={-2.5} num>{pad(M)}</T>
          <T size={15} w="800" style={{ marginBottom: 11, marginLeft: 3 }}>分</T>
        </View>
        {today.min || today.yesterday || next ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {today.min || today.yesterday ? <Tag bg={up ? P.lime : P.stage.peach}>{`${up ? '▲' : '▼'} ${hmColon(Math.abs(today.diff))}  昨日より`}</Tag> : null}
            {next ? <Tag bg={next.days <= 7 ? P.sun : P.card}>{`${next.t}まで ${next.days}日`}</Tag> : null}
          </View>
        ) : null}
      </View>
      <View style={{ height: 2, backgroundColor: P.ink }} />
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, gap: 9 }}>
        <Blocks parts={today.parts} live={liveMin} liveColor={ss.subject.c} goal={today.goal} unit={unit} />
        <T size={11.5} color={P.ink2} numberOfLines={2}>
          {today.reached ? `目標 ${hmColon(today.goal)} クリア！` : `目標 ${hmColon(today.goal)} まで あと ${left}マス`}
          <T size={11.5} color={P.ink3}>{`  ·  1マス = ${unit}分${running ? '  ·  点滅は勉強中' : ''}`}</T>
        </T>
      </View>
    </View>
  );
}

function Tag({ bg, children }: { bg: string; children: string }) {
  return (
    <View style={{ height: 24, maxWidth: '100%', flexShrink: 1, paddingHorizontal: 8, borderRadius: 7, backgroundColor: bg, boxShadow: ring(P.ink, 1.5), justifyContent: 'center' }}>
      <T size={11.5} w="700" lh={15} numberOfLines={1}>{children}</T>
    </View>
  );
}

/** The day in blocks: one per `unit` minutes, up to the goal (and on past it), two rows of 15 at most. */
function Blocks({ parts, live, liveColor, goal, unit }: { parts: Slice[]; live: number; liveColor: string; goal: number; unit: number }) {
  const [w, setW] = useState(0);
  const all = cells(parts, live, liveColor, unit);
  const PER = 15, GAP = 4, MAX = PER * 2;
  const slots = Math.min(MAX, Math.max(Math.ceil(goal / unit), all.length));
  const more = Math.max(0, all.length - MAX);
  const size = w ? (w - GAP * (PER - 1)) / PER : 0;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP, minHeight: size || 18 }}
      accessible accessibilityLabel={`今日 ${all.length}マス（1マス${unit}分）。目標は${Math.ceil(goal / unit)}マス`}>
      {size ? Array.from({ length: slots }, (_, i) => {
        const c = all[i];
        if (!c) return <View key={i} style={{ width: size, height: size, borderRadius: 3, borderWidth: 1.5, borderColor: alpha(P.ink, 0.28), borderStyle: 'dashed' }} />;
        const cell = <View style={{ width: size, height: size, borderRadius: 3, backgroundColor: c.c, borderWidth: 1.5, borderColor: P.ink }} />;
        return <View key={i}>{cell}</View>;
      }) : null}
      {more ? <T f="label" size={9} lh={size || 18} color={P.ink2}>{`+${more}`}</T> : null}
    </View>
  );
}

/** At the foot of the card: the session under way, or what's next with a key to start it. */
function Now() {
  const ss = useSession();
  const pick = useNext();
  const row = { borderTopWidth: 2, borderTopColor: P.ink, paddingVertical: 12, paddingLeft: 14, paddingRight: 12, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 };
  if (ss.running) {
    return (
      <View style={row}>
        <Press onPress={go.timer} scale={0.98} accessibilityLabel={`${ss.subject.name}を勉強中 ${clock(ss.elapsed)}。タイマーを開く`} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: ss.subject.c, boxShadow: ring() }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T f="label" size={9} lh={12} color={ss.paused ? P.coral : P.ink3}>{ss.paused ? 'PAUSED' : 'NOW'}</T>
            <T size={14} w="800" lh={19} numberOfLines={1}>{ss.subject.name}<T size={12} color={P.ink3}>{ss.task ? `  ${ss.task}` : ''}</T></T>
          </View>
          <T f="groteskBold" size={24} lh={28} num>{clock(ss.elapsed)}</T>
        </Press>
        <Key label={ss.paused ? '再開' : '一時停止'} onPress={session.pause} feel="soft" radius={11} style={{ width: 40 }} face={{ height: 37 }}>
          <Icon name={ss.paused ? 'play' : 'pause'} size={14} color={P.ink} />
        </Key>
      </View>
    );
  }
  const p = subj(pick.s);
  return (
    <View style={row}>
      <Press onPress={go.study} scale={0.98} accessibilityLabel={`${pickLabel(pick)} ${p.name} ${pick.what}。勉強のページを開く`} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: p.c, boxShadow: ring() }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={11} lh={14} color={P.ink3} numberOfLines={1}>{pickLabel(pick)}</T>
          <T size={14} w="800" lh={19} numberOfLines={1}>{p.name}<T size={12} color={P.ink3}>{pick.what ? `  ${pick.what}` : ''}</T></T>
        </View>
      </Press>
      <Key label={`${p.name}を始める`} onPress={() => startPick(pick)} feel="none" color={P.lime} depth={4} radius={14} face={{ height: 42, paddingHorizontal: 15, flexDirection: 'row', gap: 6 }}>
        <Icon name="play" size={12} color={P.ink} />
        <T size={14} w="800" lh={18}>始める</T>
      </Key>
    </View>
  );
}

// ---------- the ticker ----------
const SEP = [P.coral, P.sun, P.sky, P.violet];
function TickerRow({ items }: { items: string[] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {items.map((x, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <T f="label" size={11} lh={14} color={P.paper} ls={1.5}>{x}</T>
          <View style={{ width: 8, height: 8, marginHorizontal: 14, backgroundColor: SEP[i % SEP.length] }} />
        </View>
      ))}
    </View>
  );
}
/** The day's numbers on a dark band, edge to edge. */
function Ticker() {
  const today = useToday();
  const { streak } = useWeekStreak();
  const l = useLevel();
  const { weekTotal } = useCharts();
  const todos = useTodos();
  const pick = useNext();
  const items = [
    `TODAY ${hmColon(today.min)}`, `STREAK ${streak}D`, `LV ${l.lv}`, `WEEK ${hmColon(weekTotal)}`,
    ...(todos.total ? [`TODO ${todos.done}/${todos.total}`] : []),
    ...(pick.from === 'now' || pick.from === 'next' ? [`NEXT ${pick.start}`] : []),
  ];
  // it stands still (nothing in the app scrolls by itself): the first items, as many as fit
  return (
    <View style={{ marginHorizontal: -16, height: 36, backgroundColor: P.night, overflow: 'hidden', justifyContent: 'center', borderTopWidth: 2, borderBottomWidth: 2, borderColor: P.ink }}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <View style={{ flexDirection: 'row', position: 'absolute', left: 16 }}>
        <TickerRow items={items} />
      </View>
    </View>
  );
}

// ---------- the log: a pixel display in a code window ----------
function Chart() {
  const range = useStore((s) => s.chart.range);
  const ch = useCharts();
  const liveColor = subj(useStore((s) => s.subj)).c;
  const [w, setW] = useState(0);
  const day = range === 'day';
  // day: 24 hours, 10 minutes a cell (6 at most); week: 7 days, cells sized so the tallest day fits in 10
  const cols = day ? ch.hours.map((x) => ({ key: String(x.h), min: x.min, live: x.live, parts: x.parts, hi: x.now, future: x.future }))
    : ch.week.map((x) => ({ key: x.date, min: x.min, live: x.live, parts: x.parts, hi: x.today, future: x.future }));
  const top = Math.max(...cols.map((c) => c.min), day ? 60 : ch.goal);
  const unit = day ? 10 : Math.max(15, Math.ceil(top / 10 / 15) * 15);
  const rows = day ? 6 : Math.max(4, Math.ceil(top / unit));
  const gap = day ? 2 : 6;
  const cw = w ? (w - gap * (cols.length - 1)) / cols.length : 0;
  const ch2 = day ? cw : 9;
  const total = cols.reduce((a, c) => a + c.min, 0);
  const peak = cols.reduce((a, c, i) => (c.min > cols[a].min ? i : a), 0);
  const recorded = day ? total - cols.reduce((a, c) => a + c.live, 0) : ch.weekTotal;
  const days = ch.week.filter((x) => !x.future).length || 1;
  const line = day
    ? total ? `合計 ${hmColon(total)} · いちばんは ${peak}時台` : 'まだ記録はありません'
    : `今週 ${hmColon(recorded)} · 1日平均 ${hmColon(recorded / days)}`;
  const goalRow = !day && ch.goal ? Math.round(ch.goal / unit) : 0;
  return (
    <View style={{ borderRadius: 18, backgroundColor: P.night, boxShadow: `${ring()}, 7px 7px 0px 0px ${P.violet}` }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: P.ink, backgroundColor: P.nightUp, borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
        {[P.coral, P.sun, P.sky].map((c) => <View key={c} style={{ width: 9, height: 9, backgroundColor: c }} />)}
        <T f="plex" size={12} lh={16} color={alpha(P.paper, 0.7)} style={{ marginLeft: 6, flex: 1 }} numberOfLines={1}>{day ? 'today.log' : 'week.log'}</T>
        {(['day', 'week'] as const).map((r) => {
          const on = range === r;
          return (
            <Pressable key={r} onPress={() => { haptic.tap(); setChart({ range: r }); }} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={r === 'day' ? '今日を時間ごとに' : '今週を日ごとに'} hitSlop={6}
              style={{ height: 22, paddingHorizontal: 7, borderRadius: 6, justifyContent: 'center', backgroundColor: on ? P.lime : 'transparent', boxShadow: on ? ring(P.ink, 1.5) : ring(alpha(P.paper, 0.25), 1.5) }}>
              <T f="label" size={9} lh={12} color={on ? P.ink : alpha(P.paper, 0.7)}>{r === 'day' ? 'DAY' : 'WEEK'}</T>
            </Pressable>
          );
        })}
      </View>
      <View style={{ padding: 14, paddingTop: 10, gap: 8 }}>
        <T size={11} color={alpha(P.paper, 0.45)}>{`// 1マス = ${unit}分`}</T>
        <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: rows * ch2 + (rows - 1) * 2, flexDirection: 'row', alignItems: 'flex-end', gap }}
          accessible accessibilityLabel={`${day ? '今日の時間ごとの' : '今週の日ごとの'}勉強時間。${line}`}>
          {cw ? cols.map((c) => {
            const list = cells(c.parts, c.live, liveColor, unit).slice(0, rows);
            return (
              <View key={c.key} style={{ width: cw, height: '100%', justifyContent: 'flex-end', gap: 2 }}>
                {Array.from({ length: rows }, (_, i) => {
                  const k = rows - 1 - i; // from the top
                  const cell = list[k];
                  const st = { width: cw, height: ch2, borderRadius: day ? 2 : 3 };
                  if (!cell) return <View key={i} style={[st, { backgroundColor: c.future ? 'transparent' : alpha(P.paper, 0.07) }]} />;
                  return <View key={i} style={[st, { backgroundColor: cell.c }]} />;
                })}
              </View>
            );
          }) : null}
          {goalRow && goalRow <= rows ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: goalRow * (ch2 + 2) - 2, borderTopWidth: 1.5, borderColor: P.sun, borderStyle: 'dashed' }} />
          ) : null}
        </View>
        {/* the axis */}
        <View style={{ height: 14 }}>
          {cw ? (day ? [0, 6, 12, 18, 23] : cols.map((_, i) => i)).map((i) => (
            <View key={i} style={{ position: 'absolute', left: i * (cw + gap), width: day ? 24 : cw, alignItems: day ? 'flex-start' : 'center' }}>
              {day
                ? <T f="plex" size={9} lh={12} color={cols[i].hi ? P.sun : alpha(P.paper, 0.45)}>{String(i)}</T>
                : <T size={10} lh={13} w="700" color={cols[i].hi ? P.sun : alpha(P.paper, 0.5)}>{ch.week[i].label}</T>}
            </View>
          )) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T f="plexBold" size={12} lh={16} color={P.sun}>{'>'}</T>
          <T size={12} lh={16} color={alpha(P.paper, 0.85)} numberOfLines={1} style={{ flexShrink: 1 }}>{line}</T>
          <Cursor />
        </View>
      </View>
    </View>
  );
}
/** The prompt's cursor: a lit block (it doesn't blink: nothing pulses). */
function Cursor() {
  return <View style={{ width: 7, height: 13, backgroundColor: P.sun }} />;
}

// ---------- streak ----------
function Streak() {
  const { streak, tickets, days } = useWeekStreak();
  return (
    <Press onPress={() => haptic.soft()} scale={0.98} accessibilityLabel={`${streak}日連続で勉強中。休み券${tickets}枚`}
      style={{ borderRadius: 22, backgroundColor: P.card, boxShadow: sit(4), padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Flame px={4} lit={streak > 0} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Label text="STREAK" dot={P.sun} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
            <T f="groteskBold" size={40} lh={44} num>{streak}</T>
            <T size={14} w="800" style={{ marginBottom: 7 }}>日連続</T>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 5 }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {Array.from({ length: 3 }, (_, i) => <Ticket key={i} on={i < tickets} />)}
          </View>
          <T size={11} color={P.ink3}>{`休み券 ${tickets}枚`}</T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {days.map((d) => (
          <View key={d.date} style={{ alignItems: 'center', gap: 5 }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
              backgroundColor: d.studied ? (d.today ? P.coral : P.sun) : d.rest ? P.sky : d.future ? 'transparent' : P.card,
              borderWidth: 2, borderColor: d.future ? alpha(P.ink, 0.3) : P.ink, borderStyle: d.future ? 'dashed' : 'solid' }}>
              {d.studied ? <Icon name="check" size={13} color={P.ink} width={3} /> : d.rest ? <T size={11} w="800" lh={14}>休</T> : null}
            </View>
            <T size={10.5} w={d.today ? '800' : '600'} lh={13} color={d.today ? P.ink : P.ink3}>{d.label}</T>
          </View>
        ))}
      </View>
    </Press>
  );
}
function Ticket({ on }: { on: boolean }) {
  return (
    <View style={{ width: 18, height: 12, borderRadius: 2, backgroundColor: on ? P.sky : 'transparent', borderWidth: 1.5, borderColor: on ? P.ink : alpha(P.ink, 0.3), borderStyle: on ? 'solid' : 'dashed', alignItems: 'center', justifyContent: 'center' }}>
      {on ? <View style={{ width: 1.5, height: 6, backgroundColor: P.ink }} /> : null}
    </View>
  );
}

// ---------- ToDos, ticked right here ----------
function Todos() {
  const { todos, done, total } = useTodos();
  const open = todos.filter((x) => !x.d);
  const shown = [...open.slice(0, 4), ...todos.filter((x) => x.d).slice(0, Math.max(0, 3 - open.length))];
  const more = total - shown.length;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}><Label text={total ? `TODO · ${done}/${total} DONE` : 'TODO'} dot={P.violet} /></View>
        <Key label="ToDoを追加" onPress={() => todoSheet()} radius={9} depth={2} face={{ height: 26, paddingHorizontal: 9, flexDirection: 'row', gap: 4 }}>
          <Icon name="plus" size={11} color={P.ink} width={2.6} />
          <T size={12} w="800" lh={15}>追加</T>
        </Key>
      </View>
      {total ? shown.map((td, i) => <TodoChip key={td.id} td={td} tint={TINTS[i % TINTS.length]} />)
        : <EmptyCard text="やることを1つ書いておくと、始めやすくなります" action="ToDoを追加" onPress={() => todoSheet()} />}
      {more > 0 ? (
        <Press onPress={go.study} accessibilityLabel={`ほかのToDo ${more}件。勉強のページを開く`} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}>
          <T size={12.5} w="800">{`ほか ${more}件`}</T>
          <Icon name="chev" size={12} color={P.ink} />
        </Press>
      ) : null}
    </View>
  );
}
function TodoChip({ td, tint }: { td: Todo; tint: string }) {
  const s = subj(td.s);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingVertical: 8, paddingLeft: 10, paddingRight: 12, borderRadius: 14, backgroundColor: td.d ? P.sunk : tint, boxShadow: sit(3) }}>
      <Check on={td.d} label={`${td.t}を${td.d ? '未完了に戻す' : '完了にする'}`} onPress={() => tickTodo(td.id)} />
      <Press onPress={() => todoSheet(td)} scale={0.98} accessibilityLabel={`${td.t}を編集`} style={{ flex: 1, minWidth: 0 }}>
        <T size={14} w="800" lh={19} numberOfLines={1} color={td.d ? P.ink3 : P.ink} style={td.d ? { textDecorationLine: 'line-through' } : null}>{td.t}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: s.c, boxShadow: ring(P.ink, 1) }} />
          <T size={11} lh={14} color={P.ink3} numberOfLines={1}>{s.name}</T>
        </View>
      </Press>
    </View>
  );
}
/** A square box; ticked, it fills lime and the mark lands with a stamp. */
function Check({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label} hitSlop={10}>
      <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: on ? P.lime : P.card, borderWidth: 2, borderColor: P.ink, alignItems: 'center', justifyContent: 'center' }}>
        {on ? <Icon name="check" size={14} color={P.ink} width={3} /> : null}
      </View>
    </Pressable>
  );
}

function EmptyCard({ text, action, onPress }: { text: string; action: string; onPress: () => void }) {
  return (
    <View style={{ borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: alpha(P.ink, 0.35), padding: 14, gap: 12, alignItems: 'flex-start' }}>
      <T size={13} color={P.ink2}>{text}</T>
      <Key label={action} onPress={onPress} color={P.lime} radius={11} face={{ height: 34, paddingHorizontal: 12, flexDirection: 'row', gap: 5 }}>
        <Icon name="plus" size={12} color={P.ink} width={2.6} />
        <T size={13} w="800" lh={17}>{action}</T>
      </Key>
    </View>
  );
}

// ---------- deadlines ----------
function Deadlines() {
  const list = useDeadlines();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}><Label text={list.length ? `DEADLINES · ${list.length}` : 'DEADLINES'} dot={P.sky} /></View>
        <Key label="締切を追加" onPress={deadlineSheet} radius={9} depth={2} face={{ height: 26, paddingHorizontal: 9, flexDirection: 'row', gap: 4 }}>
          <Icon name="plus" size={11} color={P.ink} width={2.6} />
          <T size={12} w="800" lh={15}>追加</T>
        </Key>
      </View>
      {list.length ? list.map((d, i) => (
        <Press key={d.id} onPress={() => deadlineActions(d.id, d.t)} scale={0.98} accessibilityLabel={`${d.t} あと${d.days}日`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingRight: 12, borderRadius: 18, backgroundColor: P.card, boxShadow: sit(3) }}>
          <View style={{ width: 58, height: 58, borderRadius: 12, backgroundColor: d.days <= 7 ? P.stage.peach : TINTS[i % TINTS.length], boxShadow: ring(), alignItems: 'center', justifyContent: 'center' }}>
            {d.days ? (
              <>
                <T f="groteskBold" size={24} lh={26} num>{d.days}</T>
                <T f="label" size={8} lh={10}>{d.days === 1 ? 'DAY' : 'DAYS'}</T>
              </>
            ) : <T f="label" size={10} lh={13}>TODAY</T>}
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <T size={15} w="800" lh={20} numberOfLines={1}>{d.t}</T>
            <T size={11.5} lh={15} color={P.ink3} numberOfLines={1}>{`${d.mo}月${d.day}日${d.total ? ` · ToDo ${d.done}/${d.total}` : ''}`}</T>
            {d.total ? (
              <View style={{ flexDirection: 'row', gap: 3, marginTop: 2 }}>
                {Array.from({ length: Math.min(d.total, 10) }, (_, k) => (
                  <View key={k} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: k < d.done ? P.violet : 'transparent', borderWidth: 1.5, borderColor: P.ink }} />
                ))}
              </View>
            ) : null}
          </View>
          <Icon name="chev" size={14} color={P.ink3} />
        </Press>
      )) : <EmptyCard text="試験や申込の日を入れておくと、残りの日数を数えます" action="締切を追加" onPress={deadlineSheet} />}
    </View>
  );
}

// ---------- the crowd ----------
const CROWD = ['#FF6B4A', '#FFD23F', '#58C8FF', '#6B4CFF', '#FF9EC7', '#FFB547', '#9B8CFF', '#5AD1FF', '#FF8A65', '#F7C948', '#B39DFF', '#4FC3F7'];
/** One of the crowd, standing in its place (they used to bob; nothing bounces now). */
function Bobbing({ children }: { i: number; children: ReactNode }) {
  return <View>{children}</View>;
}
/** Two rows of tiny someones on two floors; you join at the front when you start. */
const FRONT = [5, 19, 33, 63, 77, 90];
const BACK = [12, 26, 40, 54, 68, 82];
function Stage({ me }: { me: boolean }) {
  return (
    <View style={{ height: 112, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' }}>
      <DotGrid color={alpha(P.paper, 0.1)} gap={14} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 54, height: 2, backgroundColor: alpha(P.paper, 0.1) }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 20, height: 2, backgroundColor: alpha(P.paper, 0.2) }} />
      {BACK.map((x, i) => (
        <View key={`b${i}`} style={{ position: 'absolute', left: `${x}%`, bottom: 56 }}>
          <Bobbing i={i + 6}><Mini color={CROWD[(i + 6) % CROWD.length]} px={3} /></Bobbing>
        </View>
      ))}
      {FRONT.map((x, i) => (
        <View key={`f${i}`} style={{ position: 'absolute', left: `${x}%`, bottom: 22 }}>
          <Bobbing i={i}><Mini color={CROWD[i % CROWD.length]} px={4} /></Bobbing>
        </View>
      ))}
      {me ? (
        <View style={{ position: 'absolute', left: '46%', bottom: 22 }}>
          <Bobbing i={99}><PalMark px={2} /></Bobbing>
        </View>
      ) : null}
    </View>
  );
}
function Peers() {
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
  const names = people.slice(0, 3).map((p) => p.n).join(' · ');
  return (
    <View style={{ gap: 12 }}>
      <Label text={`CROWD · ${(count + (joined ? 1 : 0)).toLocaleString('en-US')} NOW`} dot={P.sun} />
      <Press onPress={go.community} scale={0.985} accessibilityLabel={`いま${count}人が勉強中。みんなのページを開く`} style={{ borderRadius: 22, backgroundColor: P.night, boxShadow: sit(4) }}>
        <Stage me={joined || running} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingLeft: 14, paddingRight: 12, borderTopWidth: 2, borderTopColor: P.ink, backgroundColor: P.nightUp, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={14} w="800" lh={19} color={P.paper} numberOfLines={1}>{`${people.length + 1 + (joined ? 1 : 0)}人が勉強中`}</T>
            <T size={11} lh={15} color={alpha(P.paper, 0.6)} numberOfLines={1}>{names}</T>
          </View>
          {joined || running ? (
            <View accessible accessibilityLabel="いま勉強中" style={{ height: 34, paddingHorizontal: 12, borderRadius: 12, boxShadow: ring(alpha(P.paper, 0.3), 1.5), flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 7, height: 7, backgroundColor: P.lime }} />
              <T size={13} w="800" lh={17} color={P.lime}>勉強中</T>
            </View>
          ) : (
            <Key label="一緒に始める" onPress={join} feel="none" color={P.lime} radius={12} face={{ height: 36, paddingHorizontal: 12 }}>
              <T size={13} w="800" lh={17}>一緒に始める</T>
            </Key>
          )}
        </View>
      </Press>
    </View>
  );
}

// ---------- the handle to the デザイン page ----------
function Handle({ onPress }: { onPress: () => void }) {
  return (
    <Press onPress={onPress} hitSlop={{ top: 20, bottom: 20, left: 4, right: 14 }} scale={0.9} accessibilityRole="button" accessibilityLabel="デザインを変える"
      style={{ position: 'absolute', left: 0, top: '44%', width: 16, height: 58, borderTopRightRadius: 9, borderBottomRightRadius: 9, backgroundColor: P.lime, boxShadow: sit(3), alignItems: 'center', justifyContent: 'center' }}>
      <PixelArt rows={['X..', '.X.', '..X', '.X.', 'X..']} px={2} colors={{ X: P.ink }} />
    </Press>
  );
}

// ---------- the kit ----------
const OWN = new Set(['today', 'now', 'chart', 'streak', 'todos', 'deadlines', 'peers', 'x:ticker']);
function Frame({ block, children }: { block: Block; index: number; children: ReactNode }) {
  if (block.id === 'hero') return <HeroFrame>{children}</HeroFrame>;
  if (block.row) return <View style={{ flexDirection: 'row', gap: 12 }}>{(Array.isArray(children) ? children : [children]).map((c, i) => <View key={i} style={{ flex: 1, minWidth: 0 }}>{c}</View>)}</View>;
  if (block.sections.every((k) => OWN.has(k))) return <>{children}</>;
  // a section the base gained later: the standard drawing, on one of our cards
  return <Box style={{ padding: 14 }}>{children}</Box>;
}

export const home: HomeKit = {
  Page,
  Header,
  Frame,
  DesignHandle: Handle,
  arrange: () => [
    { id: 'grass', sections: ['grass'] },
    { id: 'streak', sections: ['streak'] },
    { id: 'peers', sections: ['peers'] },
    { id: 'hero', sections: ['today'] },
    { id: 'ticker', sections: ['x:ticker'] },
  ],
  sections: { today: Today, now: Now, 'x:ticker': Ticker, chart: Chart, streak: Streak, todos: Todos, deadlines: Deadlines, peers: Peers },
};

