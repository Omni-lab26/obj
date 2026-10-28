import { ReactNode, useMemo, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { subj } from '@/data';
import type { Block } from '@/screens/layout';
import { clock, go, hmColon, pickLabel, session, Slice, startPick, tickTodo, useCharts, useDeadlines, useNext, usePeers, useSession, useToday, useTodos, useWeekStreak } from '@/screens/model';
import { T } from '@/themes/kit';
import type { HomeKit } from '@/themes/types';
import { setChart, useDmUnread, Todo, useLevel, useStore } from '@/store';
import { useT } from '@/theme';
import { haptic, Press } from '@/ui/base';
import { Screen, useTabPad, useUnread } from '@/ui/Chrome';
import { deadlineActions, deadlineSheet, todoSheet } from '@/ui/Editors';
import { Icon, IconName } from '@/ui/Icon';
import { levelSheet } from '@/ui/Level';
import { toast } from '@/ui/Toast';
import { bricks, messagePages, say, unitFor, useLook } from './look';
import { Cap, Cursor, Fig, fill, Menu, More, PixelArt, Segs, SPRITES, Typed, useTyper, Win } from './ui';

// 8bit's home: the day as a game's status screen. A status window (today's
// time and the level as gauges), a message window that types out how the day
// is going, a command window for what's under way or next, the log as a
// stair-step chart, the streak as a row of hearts (stars at night), ToDos as a
// quest log, deadlines as events, and the party studying right now.

// ---------- page and header ----------
function Page({ header, children }: { header: ReactNode; children: ReactNode }) {
  const tabPad = useTabPad();
  return (
    <Screen>
      {header}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: tabPad + 6, gap: 24 }}>
        {children}
      </ScrollView>
    </Screen>
  );
}

function Square({ name, label, onPress, dot, size }: { name: IconName; label: string; onPress: () => void; dot?: boolean; size: number }) {
  const L = useLook();
  return (
    <Press onPress={onPress} scale={0.9} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}
      style={{ width: size, height: size, backgroundColor: L.win, borderWidth: 2, borderColor: L.edge, alignItems: 'center', justifyContent: 'center', boxShadow: `0px 3px 0px ${L.drop}` }}>
      <Icon name={name} size={16} color={L.text} width={2.2} />
      {dot ? <View style={{ position: 'absolute', top: 2, right: 2, width: 6, height: 6, backgroundColor: L.hp }} /> : null}
    </Press>
  );
}

function Header() {
  const L = useLook();
  const unread = useUnread();
  const dmUnread = useDmUnread();
  const narrow = useWindowDimensions().width < 360;
  const k = narrow ? 32 : 35;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: narrow ? 6 : 8, paddingHorizontal: 14, paddingTop: 6, height: 54 }}>
      <Fig size={narrow ? 17 : 20} color={L.ink}>INCHLY</Fig>
      <View style={{ flex: 1 }} />
      <Square name="search" label="さがす" onPress={go.search} size={k} />
      <Square name="bell" label="お知らせ" onPress={go.notifications} dot={unread > 0} size={k} />
      <Square name="chat" label="メッセージ" onPress={go.messages} dot={dmUnread > 0} size={k} />
    </View>
  );
}

// ---------- status: today and the level, as gauges ----------
function Today() {
  const L = useLook();
  const today = useToday();
  const ss = useSession();
  const l = useLevel();
  const me = useStore((s) => s.account?.name ?? 'はる');
  const N = 20;
  const live = ss.running ? ss.elapsed / 60 : 0;
  // today's gauge: what's recorded in each subject's color, then the session under way, out of the goal
  const unit = Math.max(1, today.goal / N);
  const all = bricks(today.parts, live, ss.subject.c, unit, false);
  const cells = Array.from({ length: N }, (_, i) => all[i]?.c ?? null);
  const H = Math.floor(today.min / 60), M = today.min % 60;
  const up = today.diff >= 0;
  return (
    <Win title="ステータス" onPress={levelSheet} label={`ステータス。今日 ${H}時間${M}分、目標${say(today.goal)}。レベル${l.lv}、次のレベルまで${Math.round(l.need)} EXP`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T size={16} lh={22} color={L.text} numberOfLines={1} style={{ flex: 1 }}>{me}</T>
        <Cap size={11} color={L.dim}>LV</Cap>
        <Fig size={20} color={L.cursor}>{String(l.lv)}</Fig>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 6, gap: 10 }}>
        <T size={13} lh={19} color={L.dim} style={{ marginBottom: 6 }}>きょう</T>
        <Fig size={42} color={L.text}>{`${H}:${String(M).padStart(2, '0')}`}</Fig>
        <View style={{ flex: 1 }} />
        {today.min || today.yesterday ? (
          <View style={{ alignItems: 'flex-end', marginBottom: 4 }}>
            <Cap size={11} color={up ? L.exp : L.hp}>{`${up ? '+' : '-'}${hmColon(Math.abs(today.diff))}`}</Cap>
            <T size={11} lh={15} color={L.dim}>きのうより</T>
          </View>
        ) : null}
      </View>
      <View style={{ marginTop: 10, gap: 5 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <T size={12} lh={17} color={L.dim} style={{ flex: 1 }}>{today.reached ? 'もくひょう たっせい！' : `もくひょう ${say(today.goal)}`}</T>
          <Cap size={10} color={L.dim}>{`${hmColon(today.min)}/${hmColon(today.goal)}`}</Cap>
        </View>
        <Segs cells={cells} h={10} />
      </View>
      <View style={{ marginTop: 10, gap: 5 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Cap size={10} color={L.dim}>EXP</Cap>
          <View style={{ flex: 1 }} />
          <T size={12} lh={17} color={L.dim}>{`つぎのレベルまで ${Math.round(l.need)}`}</T>
        </View>
        <Segs cells={fill(l.p, 1, N, L.mp)} h={6} />
      </View>
    </Win>
  );
}

// ---------- the message window ----------
function Message() {
  const L = useLook();
  const me = useStore((s) => s.account?.name ?? 'はる');
  const today = useToday();
  const running = useStore((s) => s.running);
  const paused = useStore((s) => s.paused);
  const sj = subj(useStore((s) => s.subj));
  const { streak } = useWeekStreak();
  const pick = useNext();
  const nextName = subj(pick.s).name;
  const next = pick.from === 'now' ? `${pick.start}〜${pick.end}の ${nextName}` : pick.from === 'next' ? `${pick.start}からの ${nextName}`
    : pick.from === 'todo' ? `クエスト「${pick.what}」` : nextName;
  const pages = useMemo(() => messagePages({ name: me, running, paused, subject: sj.name, min: today.min, goal: today.goal, streak, next }),
    [me, running, paused, sj.name, today.min, today.goal, streak, next]);
  const [page, setPage] = useState(0);
  const text = pages[page % pages.length] ?? '';
  const ty = useTyper(text, 34);
  const tap = () => {
    if (!ty.done) { ty.finish(); return; }
    haptic.tap();
    setPage((p) => p + 1);
  };
  const lines = Math.max(2, ...pages.map((p) => p.split('\n').length));
  return (
    <Win onPress={tap} label={pages.join('。')}>
      <View style={{ minHeight: lines * 24, paddingRight: 14 }}>
        <Typed text={text} n={ty.n} size={15} lh={24} color={L.text} />
      </View>
      {ty.done && pages.length > 1 ? <View style={{ position: 'absolute', right: 10, bottom: 8 }}><More color={L.cursor} /></View> : null}
    </Win>
  );
}

// ---------- the command window: what's under way, or what's next ----------
function Now() {
  const L = useLook();
  const ss = useSession();
  const pick = useNext();
  if (ss.running) {
    return (
      <Win title={ss.paused ? 'ひとやすみちゅう' : '勉強ちゅう'}>
        <Press onPress={go.timer} scale={0.98} accessibilityLabel={`${ss.subject.name}を勉強中 ${clock(ss.elapsed)}。タイマーを開く`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <View style={{ width: 14, height: 14, backgroundColor: ss.subject.c, borderWidth: 2, borderColor: L.edge }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={17} lh={24} color={L.text} numberOfLines={1}>{ss.subject.name}</T>
            {ss.task ? <T size={12} lh={17} color={L.dim} numberOfLines={1}>{ss.task}</T> : null}
          </View>
          <View style={{ width: 7, height: 7, backgroundColor: ss.paused ? L.exp : L.hp }} />
          <Fig size={22} color={L.text}>{clock(ss.elapsed)}</Fig>
        </Press>
        <Menu cols={3} gap={4} items={[
          { key: 'timer', label: 'タイマー', run: go.timer, a11y: 'タイマーを開く' },
          { key: 'pause', label: ss.paused ? 'さいかい' : 'やすむ', run: session.pause, a11y: ss.paused ? '再開' : '一時停止' },
          { key: 'rec', label: 'きろく', run: session.finish, a11y: '記録する' },
        ]} />
      </Win>
    );
  }
  const p = subj(pick.s);
  return (
    <Win title="つぎは">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <View style={{ width: 14, height: 14, backgroundColor: p.c, borderWidth: 2, borderColor: L.edge }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={17} lh={24} color={L.text} numberOfLines={1}>{p.name}<T size={12} lh={24} color={L.dim}>{pick.what ? `  ${pick.what}` : ''}</T></T>
          {pick.from === 'last' ? null : <T size={12} lh={17} color={L.dim} numberOfLines={1}>{pickLabel(pick).replace('次は · ', '')}</T>}
        </View>
      </View>
      <Menu cols={2} items={[
        { key: 'go', label: 'はじめる', run: () => startPick(pick), a11y: `${p.name}を始める` },
        { key: 'study', label: '勉強のページ', run: go.study, a11y: '勉強のページを開く' },
      ]} />
    </Win>
  );
}

// ---------- the log: a stair-step chart ----------
type Col = { key: string; label: string; name: string; min: number; live: number; parts: Slice[]; mark: boolean; future: boolean };
function Chart() {
  const L = useLook();
  const c = useCharts();
  const ss = useSession();
  const range = useStore((s) => s.chart.range);
  const [sel, setSel] = useState<{ range: string; i: number } | null>(null);
  const day = range === 'day';
  const cols: Col[] = day
    ? c.hours.map((h) => ({ key: String(h.h), label: h.h % 6 === 0 ? String(h.h) : '', name: `${h.h}時台`, min: h.min, live: h.live, parts: h.parts, mark: h.now, future: h.future }))
    : c.week.map((d) => ({ key: d.date, label: d.label, name: `${d.label}曜日`, min: d.min, live: d.live, parts: d.parts, mark: d.today, future: d.future }));
  const ROWS = day ? 12 : 14;
  const max = Math.max(day ? 60 : c.goal, ...cols.map((x) => x.min));
  const unit = unitFor(max, ROWS);
  const bh = day ? 5 : 6, gap = 1;
  const picked = sel && sel.range === range ? sel.i : null;
  const total = cols.reduce((a, x) => a + x.min - x.live, 0);
  const top = cols.reduce((b, x, i) => (x.min > cols[b].min ? i : b), 0);
  const subjects = new Map<string, { c: string; name: string }>();
  cols.forEach((x) => x.parts.forEach((p) => { if (!subjects.has(p.id)) subjects.set(p.id, { c: p.c, name: p.name }); }));
  const goalRows = day ? 0 : Math.ceil(c.goal / unit);
  const foot = picked !== null
    ? `${cols[picked].name}： ${say(cols[picked].min)}${cols[picked].live ? '（勉強中をふくむ）' : ''}`
    : day ? (total ? `ごうけい ${say(total)} · いちばんは ${cols[top].name}` : 'まだ きろくが ない') : `こんしゅう ${say(c.weekTotal)}`;
  const H = ROWS * (bh + gap);
  return (
    <Win title="きろく">
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Cap size={9} color={L.dim}>{`1 BLOCK = ${unit} MIN`}</Cap>
        <View style={{ flex: 1 }} />
        {(['day', 'week'] as const).map((r) => (
          <Press key={r} onPress={() => { if (r !== range) { haptic.tap(); setChart({ range: r }); } }} haptics={false} scale={0.94} accessibilityRole="tab" accessibilityState={{ selected: r === range }}
            accessibilityLabel={r === 'day' ? '1時間ごと' : '1日ごと'} hitSlop={6}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, height: 24 }}>
            <View style={{ width: 7, opacity: r === range ? 1 : 0 }}><Cursor color={L.cursor} px={1.2} /></View>
            <T size={13} lh={18} color={r === range ? L.text : L.dim}>{r === 'day' ? 'ひ' : 'しゅう'}</T>
          </Press>
        ))}
      </View>
      <View style={{ height: H + 12, flexDirection: 'row', gap: day ? 2 : 8 }}>
        {goalRows > 0 && goalRows <= ROWS ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: goalRows * (bh + gap), borderTopWidth: 1, borderTopColor: L.dim, borderStyle: 'dashed' }} />
        ) : null}
        {cols.map((x, i) => (
          <Column key={x.key} x={x} unit={unit} rows={ROWS} bh={bh} gap={gap} h={H + 12} liveColor={ss.subject.c} on={picked === i}
            onPress={() => { haptic.tap(); setSel(picked === i ? null : { range, i }); }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 4, gap: day ? 2 : 8 }}>
        {cols.map((x) => (
          <View key={x.key} style={{ flex: 1, alignItems: day ? 'flex-start' : 'center' }}>
            {day ? <Cap size={8} color={L.dim} ls={0}>{x.label}</Cap> : <T size={11} lh={15} color={x.mark ? L.cursor : L.dim}>{x.label}</T>}
          </View>
        ))}
      </View>
      {subjects.size ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 2, marginTop: 8 }}>
          {[...subjects.values()].map((s) => (
            <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, backgroundColor: s.c }} />
              <T size={11} lh={16} color={L.dim}>{s.name}</T>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1.5, borderTopColor: L.faint }}>
        <Cursor color={L.cursor} />
        <T size={13} lh={19} color={L.text} numberOfLines={1} style={{ flex: 1 }}>{foot}</T>
      </View>
    </Win>
  );
}
function Column({ x, unit, rows, bh, gap, h, liveColor, on, onPress }: { x: Col; unit: number; rows: number; bh: number; gap: number; h: number; liveColor: string; on: boolean; onPress: () => void }) {
  const L = useLook();
  const all = bricks(x.parts, x.live, liveColor, unit, true).slice(0, rows);
  return (
    <Press onPress={onPress} haptics={false} scale={1} accessibilityRole="button" accessibilityLabel={`${x.name} ${say(x.min)}`}
      style={{ flex: 1, height: h, justifyContent: 'flex-end', alignItems: 'stretch' }}>
      {on ? <View style={{ alignItems: 'center', marginBottom: 2 }}><PixelArt rows={SPRITES.down} px={1.2} colors={{ X: L.cursor }} /></View> : null}
      <View style={{ flexDirection: 'column-reverse', gap, opacity: x.future ? 0.4 : 1 }}>
        {all.length ? all.map((k, i) => <View key={i} style={{ height: bh, backgroundColor: k.c }} />) : <View style={{ height: 1.5, backgroundColor: x.mark ? L.cursor : L.faint }} />}
      </View>
    </Press>
  );
}

// ---------- the streak: hearts (stars at night) ----------
function Streak() {
  const L = useLook();
  const { streak, tickets, days } = useWeekStreak();
  const star = L.mark === 'star';
  return (
    <Win title="れんぞく" onPress={() => haptic.soft()} label={`${streak}日連続で勉強中。休み券${tickets}枚`}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <Fig size={30} color={L.text}>{String(streak)}</Fig>
        <T size={14} lh={22} color={L.text} style={{ marginBottom: 2 }}>日 れんぞく</T>
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: 'flex-end', gap: 3, marginBottom: 2 }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {Array.from({ length: 3 }, (_, i) => <View key={i} style={{ opacity: i < tickets ? 1 : 0.25 }}><PixelArt rows={SPRITES.ticket} px={2} colors={{ X: i < tickets ? L.mp : L.dim }} /></View>)}
          </View>
          <T size={10.5} lh={14} color={L.dim}>{`やすみけん ×${tickets}`}</T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        {days.map((d, i) => <Mark key={d.date} label={d.label} studied={d.studied} rest={d.rest} today={d.today} future={d.future} star={star} />)}
      </View>
    </Win>
  );
}
function Mark({ label, studied, rest, today, future, star }: { label: string; studied: boolean; rest: boolean; today: boolean; future: boolean; star: boolean }) {
  const L = useLook();
  const full = studied || rest;
  const rows = full ? (star ? SPRITES.star : SPRITES.heart) : (star ? SPRITES.starEmpty : SPRITES.heartEmpty);
  const color = rest ? L.mp : full ? (star ? L.exp : L.hp) : future ? L.faint : L.dim;
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <PixelArt rows={rows} px={3} colors={{ X: color, W: '#FFFFFF' }} />
      <T size={11} lh={15} color={today ? L.cursor : L.dim}>{label}</T>
    </View>
  );
}

// ---------- ToDos: the quest log ----------
const startTodo = (t: Todo) => startPick({ s: t.s, what: t.t, todoId: t.id, from: 'todo' });
function Todos() {
  const L = useLook();
  const { todos, done, total } = useTodos();
  const open = todos.filter((x) => !x.d);
  const cleared = todos.filter((x) => x.d);
  const shown = open.slice(0, 4);
  return (
    <Win title={total ? `クエスト ${done}/${total}` : 'クエスト'}>
      {total ? (
        <View style={{ gap: 2 }}>
          {shown.map((t, i) => <Quest key={t.id} t={t} first={i === 0} />)}
          {open.length > shown.length ? <T size={12} lh={18} color={L.dim} style={{ marginLeft: 30 }}>{`ほか ${open.length - shown.length}けん`}</T> : null}
          {cleared.slice(0, 2).map((t) => <Quest key={t.id} t={t} first={false} />)}
          {cleared.length > 2 ? <T size={12} lh={18} color={L.dim} style={{ marginLeft: 30 }}>{`クリアずみ ほか ${cleared.length - 2}けん`}</T> : null}
          {!open.length ? <T size={13} lh={20} color={L.cursor} style={{ marginTop: 4 }}>すべての クエストを クリアした！</T> : null}
        </View>
      ) : (
        <T size={13.5} lh={21} color={L.dim}>{'クエストは まだ ない。\nやることを ひとつ きめておくと はじめやすい。'}</T>
      )}
      <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1.5, borderTopColor: L.faint }}>
        <Menu cols={2} items={[
          { key: 'add', label: 'ついか', run: () => todoSheet(), a11y: 'ToDoを追加' },
          { key: 'all', label: 'ぜんぶみる', run: go.study, a11y: 'ToDoをぜんぶ見る（勉強のページ）' },
        ]} size={14} />
      </View>
    </Win>
  );
}
function Quest({ t, first }: { t: Todo; first: boolean }) {
  const L = useLook();
  const sj = subj(t.s);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 38 }}>
      <Press onPress={() => tickTodo(t.id)} scale={0.9} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: t.d }} accessibilityLabel={`${t.t}${t.d ? '（完了）' : ''}`}
        style={{ width: 20, height: 20, borderWidth: 2, borderColor: t.d ? L.dim : L.edge, alignItems: 'center', justifyContent: 'center', backgroundColor: t.d ? L.faint : 'transparent' }}>
        {t.d ? <PixelArt rows={['.....X', '....XX', 'X..XX.', 'XXXX..', '.XX...']} px={2} colors={{ X: L.cursor }} /> : null}
      </Press>
      <Press onPress={() => todoSheet(t)} scale={0.99} accessibilityLabel={`${t.t}を編集`} style={{ flex: 1, minWidth: 0 }}>
        <T size={14} lh={20} color={t.d ? L.dim : L.text} numberOfLines={1} style={t.d ? { textDecorationLine: 'line-through' } : null}>{t.t}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 6, height: 6, backgroundColor: sj.c }} />
          <T size={11} lh={15} color={L.dim} numberOfLines={1}>{sj.name}</T>
        </View>
      </Press>
      {t.d ? null : (
        <Press onPress={() => startTodo(t)} scale={0.9} hitSlop={6} accessibilityLabel={`${t.t}を始める`}
          style={{ width: 30, height: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: first ? L.cursor : L.faint }}>
          <Cursor color={first ? L.cursor : L.dim} />
        </Press>
      )}
    </View>
  );
}

// ---------- deadlines: events ahead ----------
function Deadlines() {
  const L = useLook();
  const deadlines = useDeadlines();
  return (
    <Win title="イベント">
      {deadlines.length ? (
        <View style={{ gap: 8 }}>
          {deadlines.map((d) => {
            const near = d.days <= 21;
            return (
              <Press key={d.id} onPress={() => deadlineActions(d.id, d.t)} scale={0.99} accessibilityLabel={`${d.t} あと${d.days}日`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 62, alignItems: 'center', paddingVertical: 3, borderWidth: 1.5, borderColor: near ? L.hp : L.faint }}>
                  <T size={10} lh={13} color={L.dim}>あと</T>
                  <Fig size={16} color={near ? L.hp : L.text}>{`${d.days}`}</Fig>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T size={14} lh={20} color={L.text} numberOfLines={1}>{d.t}</T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <T size={11} lh={16} color={L.dim}>{`${d.mo}月${d.day}日`}</T>
                    {d.total ? (
                      <View style={{ flexDirection: 'row', gap: 2 }}>
                        {Array.from({ length: Math.min(8, d.total) }, (_, i) => <View key={i} style={{ width: 6, height: 6, backgroundColor: i < d.done ? L.exp : 'transparent', borderWidth: 1, borderColor: L.dim }} />)}
                      </View>
                    ) : <T size={11} lh={16} color={L.dim}>ToDoなし</T>}
                  </View>
                </View>
              </Press>
            );
          })}
        </View>
      ) : (
        <T size={13.5} lh={21} color={L.dim}>{'よていは まだ ない。\n試験や 申込の日を 入れておこう。'}</T>
      )}
      <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1.5, borderTopColor: L.faint }}>
        <Menu items={[{ key: 'add', label: 'ついか', run: deadlineSheet, a11y: '締切を追加' }]} size={14} />
      </View>
    </Win>
  );
}

// ---------- the party studying right now ----------
function Peers() {
  const L = useLook();
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
  const party = people.slice(0, 3);
  return (
    <Win title={`なかま ${(count + (joined ? 1 : 0)).toLocaleString('en-US')}にん`} onPress={go.community} label={`いま${count}人が勉強中。みんなのページを開く`}>
      <View style={{ gap: 6 }}>
        {party.map((p) => (
          <View key={p.n} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <PixelArt rows={SPRITES.face} px={3} colors={{ X: L.edge, S: p.c, E: L.win, B: L.dim }} />
            <T size={14} lh={20} color={L.text} numberOfLines={1} style={{ flex: 1 }}>{p.n}</T>
            <T size={12} lh={18} color={L.dim} numberOfLines={1}>{`${p.s}を 勉強中`}</T>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1.5, borderTopColor: L.faint }}>
        {joined || running ? (
          <T size={14} lh={22} color={L.cursor}>いっしょに 勉強している！</T>
        ) : (
          <Menu items={[{ key: 'join', label: 'いっしょに はじめる', run: join, a11y: '一緒に始める' }]} size={14} />
        )}
      </View>
    </Win>
  );
}

// ---------- the handle to the デザイン page ----------
function Handle({ onPress }: { onPress: () => void }) {
  const L = useLook();
  return (
    <Press onPress={onPress} hitSlop={{ top: 20, bottom: 20, left: 4, right: 14 }} scale={0.9} accessibilityRole="button" accessibilityLabel="デザインを変える"
      style={{ position: 'absolute', left: 0, top: '44%', width: 16, height: 56, backgroundColor: L.win, borderWidth: 2, borderLeftWidth: 0, borderColor: L.edge, alignItems: 'center', justifyContent: 'center' }}>
      <Cursor color={L.cursor} px={1.2} />
    </Press>
  );
}

// ---------- the kit ----------
const OWN = new Set(['today', 'x:message', 'now', 'chart', 'streak', 'todos', 'deadlines', 'peers']);
function Frame({ block, children }: { block: Block; index: number; children: ReactNode }) {
  const L = useLook();
  const t = useT();
  if (block.row) return <View style={{ flexDirection: 'row', gap: 12 }}>{(Array.isArray(children) ? children : [children]).map((c, i) => <View key={i} style={{ flex: 1, minWidth: 0 }}>{c}</View>)}</View>;
  if (block.sections.every((k) => OWN.has(k))) return <View style={{ gap: 24 }}>{children}</View>;
  // a section the base gained later: the standard drawing, on a plain page-colored panel with a pixel edge
  return <View style={{ backgroundColor: t.surface, borderWidth: 2, borderColor: L.ink, padding: 12 }}>{children}</View>;
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
    { id: 'status', sections: ['today'] },
    { id: 'message', sections: ['x:message'] },
  ],
  sections: { today: Today, 'x:message': Message, now: Now, chart: Chart, streak: Streak, todos: Todos, deadlines: Deadlines, peers: Peers },
};
