import { Image } from 'expo-image';
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { FREE, subj } from '@/data';
import { Deadlines } from '@/screens/home/standard';
import { iconUri } from '@/lib/planIcon';
import { blocksOn, endOf, slotsOf, toMin, type Block, type Slot } from '@/lib/timetable';
import { dateKey, jpDate, mondayIndex } from '@/lib/time';
import { useDeadlines } from '@/screens/model';
import { doneOn, keepFree, type Session, sortFree, useNow, useStore, useSubjects } from '@/store';
import { Creature, Pix, PixSticker } from '@/themes/standard/pixel';
import { bundledFace, font, hair, noOutline, type, useT } from '@/theme';
import { Card, haptic, PixHead, Press, StdHead, StdKey, SubjTile, Txt } from '@/ui/base';
import { ring, S, SR, useStd } from '@/ui/stdLook';
import { Screen, useTabPad } from '@/ui/Chrome';
import { ContentHints } from '@/ui/ContentHints';
import { askDeletePlan, DeletePlanHost } from '@/ui/DeletePlan';
import { blockSheet, deadlineActions, deadlineSheet } from '@/ui/Editors';
import { planCalendar } from '@/ui/PlanSheets';
import { openSheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';
import { Icon } from '@/ui/Icon';
import { PlanArt } from '@/ui/PlanArt';
import { RevealRow } from '@/ui/RevealRow';
import { SubjectMark, subjectKind } from '@/ui/Loader';

// The middle tab: the plan — the timetable and the deadlines. Each row is the
// time, the plan's icon, and its subject with the memo under it; a tap edits it.
// Nothing starts here: studying is run from the study bar above the tab bar
// (勉強を開始, and the timer opens only from there). At the top, あとで仕分け:
// 自習 recorded without a subject, each waiting for one (and what it was).

const DOW = ['月', '火', '水', '木', '金', '土', '日'];

export default function Study() {
  const t = useT();
  const std = useStd();
  const pad = useTabPad();
  if (std) return <StdStudy pad={pad} />;
  return (
    <Screen>
      <DeletePlanHost />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: pad }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4, flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          {/* no page name (the tab bar says where you are): just today's date */}
          <Txt size={13} w="600" tone="ink2" accessibilityRole="header">{jpDate(new Date())}</Txt>
        </View>
        <Timetable />
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}><Deadlines /></View>
        <View style={{ height: 8, backgroundColor: t.backdrop !== 'none' ? 'transparent' : t.canvas }} />
      </ScrollView>
    </Screen>
  );
}

// ---------- the timetable ----------
/**
 * The day as one line (today): what's behind you is small on it — a plan
 * done (✓ and the minutes recorded), a plan whose time went by, a 自習 still
 * without a subject (仕分ける) — in the order of the day; under it the plan
 * under way, big, and the ones still to come as rows. Another weekday: its
 * plans as rows.
 */
function Timetable() {
  const t = useT();
  const std = useStd();
  const now = useNow(30_000);
  const d = new Date(now);
  const key = dateKey(d);
  const today = mondayIndex(d);
  const [day, setDay] = useState(today);
  const blocks = useStore((x) => x.timetable);
  const doneList = useStore((x) => x.doneBlocks);
  const sessions = useStore((x) => x.sessions);
  const done = doneOn({ doneBlocks: doneList }, d);
  const isToday = day === today;
  // the chosen weekday: today with live states, another day as a plain list
  const list: (Slot | { block: Block; state: 'plain' })[] = isToday
    ? slotsOf(blocks, d)
    : blocksOn(blocks, new Date(d.getFullYear(), d.getMonth(), d.getDate() + (day - today))).map((block) => ({ block, state: 'plain' as const }));
  // today: behind you (done, or its time gone) on the line; the rest as rows
  const behind = (x: (typeof list)[number]) => isToday && (done.has(x.block.id) || x.state === 'past');
  const rows = list.filter((x) => !behind(x));
  const stops: Stop[] = isToday ? [
    ...list.filter(behind).map(({ block: b }) => {
      const min = sessions.filter((x) => x.block === b.id && x.date === key).reduce((n, x) => n + x.min, 0);
      return { kind: 'plan' as const, b, at: b.start ? toMin(b.start) : -1, finished: done.has(b.id), min };
    }),
    ...sessions.filter((x) => x.s === FREE && !x.kept && x.date === key).map((x) => ({ kind: 'free' as const, x, at: toMin(x.at) - x.min })),
  ].sort((a, b) => a.at - b.at) : [];
  if (std) return <StdTimetable day={day} setDay={setDay} today={today} isToday={isToday} stops={stops} rows={rows} now={clockOf(d.getHours() * 60 + d.getMinutes())} />;
  return (
    <>
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Txt size={type.head} w="700" style={{ flex: 1 }}>時間割</Txt>
        <AddLink label="追加" onPress={() => planCalendar()} />
      </View>
      <View style={{ flexDirection: 'row', gap: 4, marginHorizontal: 16, marginBottom: 8 }}>
        {DOW.map((w, i) => {
          const on = i === day;
          return (
            <Press key={w} onPress={() => setDay(i)} scale={0.92} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${w}曜日${i === today ? '（今日）' : ''}`}
              style={{ flex: 1, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.ink : 'transparent' }}>
              <Txt size={12.5} w={i === today || on ? '800' : '500'} color={on ? t.onInk : i === today ? t.ink : t.ink3}>{w}</Txt>
            </Press>
          );
        })}
      </View>
      <Card style={{ marginHorizontal: 16 }} pad={0}>
        {isToday && (stops.length || rows.length) ? <TodayLine stops={stops} rows={rows} now={clockOf(d.getHours() * 60 + d.getMinutes())} /> : rows.map(({ block: b, state }, i) => (
          <Slide key={b.id} b={b}><PlanRow b={b} live={state === 'now'} next={state === 'next'} first={!i} /></Slide>
        ))}
        {!rows.length && !stops.length ? (
          <Press onPress={() => planCalendar()} style={{ paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center', gap: 4 }}>
            <Txt size={13.5} w="600">{isToday ? '今日の時間割はまだありません' : `${DOW[day]}曜日の時間割はまだありません`}</Txt>
            <Txt size={12} tone="ink3">「追加」で日と始める時刻と科目を決めておくと、1タップで始められます。次の予定の時刻に知らせます</Txt>
          </Press>
        ) : null}
      </Card>
    </>
  );
}

type Stop = { kind: 'plan'; b: Block; at: number; finished: boolean; min: number } | { kind: 'free'; x: Session; at: number };
/** A plan's row slides right to show 削除 (消しますか？ before it goes). */
function Slide({ b, children }: { b: Block; children: ReactNode }) {
  return <RevealRow label={subj(b.s).name} onDelete={(back) => askDeletePlan(b, back)}>{children}</RevealRow>;
}
/** The same, for VoiceOver: a 削除 action on the row. */
const delA11y = (b: Block) => ({
  accessibilityActions: [{ name: 'delete', label: '削除' }],
  onAccessibilityAction: (e: { nativeEvent: { actionName: string } }) => { if (e.nativeEvent.actionName === 'delete') askDeletePlan(b, () => {}); },
});
const clockOf = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;

// Today as one line through the day, like a route map (MOTION.md aside, nothing here moves):
// - the times right-aligned in one column of fixed-width figures, beside the line;
// - the line solid where the day is behind you, dotted where it's still to come,
//   and a thin red mark at this minute;
// - every row on one grid (time · line · text · right end), so nothing drifts;
// - what a stop is, by its shape: done, its icon small on the line with a black ✓
//   (and, on the right, a small bar of the minutes against the plan, orange past
//   it); its time gone by undone, its icon faded with a gray ×, crossed out, and
//   やらなかった; a 自習 not sorted yet, a dashed ring (仕分ける); to come, a small
//   white ring (its icon, larger, on the right); the plan under way, its icon on
//   the line itself and a red Now.
const TIME_W = 50, RAIL_W = 38, PAD = 12;
const rowStyle = { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: PAD };
const OVER = '#FF9F0A';
/** A subject's tile mark (the loading marks, ui/Loader): still, or turning on the plan being studied. */
const markOf = (name: string, size: number, moving = false) => {
  const k = subjectKind(name);
  return k ? <SubjectMark kind={k} size={Math.round(size * 0.68)} moving={moving} /> : undefined;
};
const NOW_RED = '#FF3B30';
function TodayLine({ stops, rows, now }: { stops: Stop[]; rows: (Slot | { block: Block; state: 'plain' })[]; now: string }) {
  const n = stops.length + 1 + rows.length;
  return (
    <View style={{ paddingVertical: 8 }}>
      {stops.map((st, i) => st.kind === 'free' ? <StopRow key={st.x.id} st={st} first={i === 0} last={false} />
        : <Slide key={st.b.id} b={st.b}><StopRow st={st} first={i === 0} last={false} /></Slide>)}
      <NowMark at={now} first={!stops.length} last={!rows.length} />
      {rows.map(({ block: b, state }, i) => (
        <Slide key={b.id} b={b}><AheadRow b={b} live={state === 'now'} next={state === 'next'} last={stops.length + 1 + i === n - 1} /></Slide>
      ))}
    </View>
  );
}

/** The line's piece in one row: solid (behind) or dotted (to come), from above its node and below it. */
function Rail({ first, last, ahead, children }: { first?: boolean; last?: boolean; ahead?: boolean; children?: ReactNode }) {
  const t = useT();
  const piece = (top: boolean) => ahead ? (
    <View style={{ flex: 1, width: 2, overflow: 'hidden', alignItems: 'center', gap: 3, paddingTop: top ? 0 : 3 }}>
      {Array.from({ length: 12 }, (_, k) => <View key={k} style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: t.line2 }} />)}
    </View>
  ) : <View style={{ flex: 1, width: 2, backgroundColor: t.ink3, opacity: 0.75 }} />;
  return (
    <View style={{ width: RAIL_W, alignSelf: 'stretch', alignItems: 'center' }}>
      {first ? <View style={{ flex: 1 }} /> : piece(true)}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>{children}</View>
      {last ? <View style={{ flex: 1 }} /> : piece(false)}
    </View>
  );
}
/** The card's own white, solid (a ring around a node so the line seems to pass behind it). */
const useBlank = () => (useT().dark ? '#24272B' : '#FFFFFF');
function Node({ kind }: { kind: 'free' | 'later' }) {
  const t = useT();
  const blank = useBlank();
  const d = kind === 'later' ? 10 : 12;
  return (
    <View style={{ width: d + 5, height: d + 5, borderRadius: (d + 5) / 2, backgroundColor: blank, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: d, height: d, borderRadius: d / 2,
        backgroundColor: blank, borderWidth: 2, borderStyle: kind === 'free' ? 'dashed' : 'solid', borderColor: kind === 'free' ? subj(FREE).c : t.line2 }} />
    </View>
  );
}
function TimeCol({ children }: { children: ReactNode }) {
  return <View style={{ width: TIME_W, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 4 }}>{children}</View>;
}
/** A time in the column: always one line (shrinks a little rather than wrap). */
function Clock({ children, ...p }: Parameters<typeof Txt>[0]) {
  return <Txt num numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} {...p}>{children}</Txt>;
}
/**
 * A plan behind you, its icon small on the line (on the card's white, so the line
 * seems to pass behind it), told apart at a glance: done, in full color with a
 * black ✓ badge; not done, faded with a gray × badge.
 */
function StopArt({ b, done }: { b: Block; done: boolean }) {
  const t = useT();
  const blank = useBlank();
  const sj = subj(b.s);
  return (
    <View style={{ padding: 2, borderRadius: 8, backgroundColor: blank }}>
      <View style={{ opacity: done ? 1 : 0.32 }}><PlanArt icon={b.icon} name={sj.name} color={sj.c} size={22} radius={6} mark={markOf(sj.name, 22)} /></View>
      <View style={{ position: 'absolute', right: -4, bottom: -4, width: 15, height: 15, borderRadius: 7.5, borderWidth: 2, borderColor: blank,
        backgroundColor: done ? t.ink : t.ink3, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={done ? 'check' : 'x'} size={8} color={done ? t.onInk : blank} width={3} />
      </View>
    </View>
  );
}

/** Behind you: one thin line. */
function StopRow({ st, first, last }: { st: Stop; first: boolean; last: boolean }) {
  const t = useT();
  if (st.kind === 'free') {
    const x = st.x, at = clockOf(Math.max(0, st.at));
    return (
      <Press onPress={() => sortSheet(x)} scale={0.99} accessibilityLabel={`${at}から自習 ${x.min}分${x.what ? ` ${x.what}` : ''}。科目を付けて仕分ける`}
        style={[rowStyle, { minHeight: 34 }]}>
        <TimeCol><Clock size={12} tone="ink3">{at}</Clock></TimeCol>
        <Rail first={first} last={last}><Node kind="free" /></Rail>
        <Txt size={12.5} tone="ink2" numberOfLines={1} style={{ flex: 1, minWidth: 0, paddingLeft: 6 }}>
          <Txt size={12.5} w="600">{`自習 ${x.min}分`}</Txt>{x.what || x.note ? ` · ${x.what || x.note}` : ''}
        </Txt>
        <Txt size={12.5} w="600" color={t.blue}>仕分ける</Txt>
      </Press>
    );
  }
  const b = st.b, sj = subj(b.s), plan = b.min ?? 0;
  return (
    <Press onPress={() => blockSheet(b)} scale={0.99} {...delA11y(b)}
      accessibilityLabel={`${b.start ? `${b.start}から` : '時刻なし'} ${sj.name} ${b.t ?? ''}。${st.finished ? `終わった${st.min ? ` ${st.min}分${plan ? `（予定${plan}分）` : ''}` : ''}` : 'やらずに時間が過ぎた'}。編集`}
      style={[rowStyle, { minHeight: 40 }]}>
      <TimeCol><Clock size={12} tone="ink3">{b.start ?? '—'}</Clock></TimeCol>
      <Rail first={first} last={last}><StopArt b={b} done={st.finished} /></Rail>
      <Txt size={13} tone={st.finished ? 'ink2' : 'ink3'} numberOfLines={1} style={{ flex: 1, minWidth: 0, paddingLeft: 6 }}>
        <Txt size={13} w={st.finished ? '700' : '500'} tone={st.finished ? 'ink' : 'ink3'} style={st.finished ? null : { textDecorationLine: 'line-through' }}>{sj.name}</Txt>
        {b.note || b.t ? ` · ${b.note || b.t}` : ''}
      </Txt>
      {st.finished ? <Meter min={st.min} plan={plan} color={sj.c} /> : (
        <View style={{ marginLeft: 8, paddingHorizontal: 7, height: 20, borderRadius: 10, borderWidth: hair, borderColor: t.line2, justifyContent: 'center' }}>
          <Txt size={10.5} w="600" tone="ink3">やらなかった</Txt>
        </View>
      )}
    </Press>
  );
}
/** How long it was studied against its plan: a small bar in the subject's color (orange on past the plan), and the minutes. */
function Meter({ min, plan, color }: { min: number; plan: number; color: string }) {
  const t = useT();
  if (!min) return <Txt size={11.5} w="600" tone="ink2" style={{ marginLeft: 8 }}>完了</Txt>;
  const done = plan ? Math.min(1, min / plan) : 1;
  const extra = plan && min > plan ? Math.min(0.4, (min - plan) / plan) : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 }}>
      <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.line, flexDirection: 'row', gap: 1, overflow: 'hidden' }}>
        <View style={{ flex: done, backgroundColor: color, borderRadius: 2 }} />
        {extra ? <View style={{ flex: extra, backgroundColor: OVER, borderRadius: 2 }} /> : null}
        {done < 1 ? <View style={{ flex: 1 - done }} /> : null}
      </View>
      <Txt num size={11.5} tone="ink3">{`${min}分`}</Txt>
    </View>
  );
}
/** This minute: a red dot on the line and a thin red rule across the day. */
function NowMark({ at, first, last }: { at: string; first: boolean; last: boolean }) {
  return (
    <View style={[rowStyle, { minHeight: 22 }]} accessible accessibilityLabel={`いま ${at}`}>
      <TimeCol><Clock size={12} w="700" color={NOW_RED}>{at}</Clock></TimeCol>
      <Rail first={first} last={last}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: NOW_RED }} /></Rail>
      <View style={{ flex: 1, marginLeft: 6, height: 1.5, backgroundColor: NOW_RED, opacity: 0.55 }} />
    </View>
  );
}
/** The plan under way (its icon on the line, on a gray ground) and the ones to come (a white ring; the icon on the right). */
function AheadRow({ b, live, next, last }: { b: Block; live: boolean; next: boolean; last: boolean }) {
  const t = useT();
  const blank = useBlank();
  const sj = subj(b.s);
  // the plan under way turns its mark while you're studying it (not while paused)
  const studying = useStore((s) => live && s.running && !s.paused && (s.planBlock === b.id || s.subj === b.s));
  return (
    <Press onPress={() => blockSheet(b)} scale={0.99} {...delA11y(b)} accessibilityLabel={`${b.start ? `${b.start}から` : '時刻なし'} ${sj.name} ${b.t ?? ''}${live ? '。いまの予定' : next ? '。つぎの予定' : ''}。編集`}
      // the live row's gray ground is inset, and its padding takes up the inset, so its columns stay on the grid
      style={[rowStyle, { minHeight: 64 }, live ? { marginHorizontal: 6, paddingHorizontal: PAD - 6, borderRadius: 12, backgroundColor: t.sunken } : null]}>
      <TimeCol><Times b={b} /></TimeCol>
      <Rail ahead={!live} last={last}>
        {live ? (
          <View style={{ padding: 3, borderRadius: 10, backgroundColor: blank }}><PlanArt icon={b.icon} name={sj.name} color={sj.c} size={30} radius={8} mark={markOf(sj.name, 30, studying)} /></View>
        ) : <Node kind="later" />}
      </Rail>
      <View style={{ flex: 1, minWidth: 0, paddingLeft: 6, paddingRight: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt size={14.5} w="700" numberOfLines={1} style={{ flexShrink: 1 }}>{sj.name}</Txt>
          {live ? <NowBadge /> : null}
          {next ? <Txt size={11} w="600" tone="ink3">つぎ</Txt> : null}
        </View>
        {b.note || b.t ? <Txt size={12} tone="ink2" numberOfLines={1}>{b.note || b.t}</Txt> : null}
      </View>
      {live ? null : <PlanArt icon={b.icon} name={sj.name} color={sj.c} size={46} radius={11} mark={markOf(sj.name, 46)} />}
    </Press>
  );
}

/** The plan under way: Now, in the same red as this minute's mark. */
function NowBadge() {
  return (
    <View style={{ paddingHorizontal: 7, height: 18, borderRadius: 9, backgroundColor: NOW_RED, justifyContent: 'center' }}>
      <Txt size={10.5} w="800" color="#FFFFFF" lh={13}>Now</Txt>
    </View>
  );
}

/** A plan's start over its end (or から), each on one line. */
function Times({ b }: { b: Block }) {
  if (!b.start) return <Clock size={10.5} w="600" tone="ink3">時刻なし</Clock>;
  return (
    <>
      <Clock size={13} w="700" lh={16}>{b.start}</Clock>
      {b.min ? <Clock size={11} tone="ink3" lh={14}>{endOf(b)}</Clock> : <Txt size={11} tone="ink3" lh={14} numberOfLines={1}>から</Txt>}
    </>
  );
}

/** A plan as a row: the time, its icon, the subject with Now / つぎ, and the memo (no memo: what to do). */
function PlanRow({ b, live, next, first }: { b: Block; live: boolean; next: boolean; first: boolean }) {
  const t = useT();
  const sj = subj(b.s);
  return (
    <Press onPress={() => blockSheet(b)} scale={0.99} {...delA11y(b)} accessibilityLabel={`${b.start ? `${b.start}から` : '時刻なし'} ${sj.name} ${b.t ?? ''}。編集`}
      style={[rowStyle, { gap: 10, paddingVertical: 10, borderTopWidth: first ? 0 : hair, borderTopColor: t.line, backgroundColor: live ? t.sunken : 'transparent' }]}>
      <TimeCol><Times b={b} /></TimeCol>
      {/* the plan's icon: its photo, or its subject's picture */}
      <PlanArt icon={b.icon} name={sj.name} color={sj.c} size={38} radius={9} mark={markOf(sj.name, 38)} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt size={14.5} w="700" numberOfLines={1} style={{ flexShrink: 1 }}>{sj.name}</Txt>
          {live ? <NowBadge /> : null}
          {next ? <Txt size={11} w="600" tone="ink3">つぎ</Txt> : null}
        </View>
        {/* under it, the memo (no memo: what to do) */}
        {b.note || b.t ? <Txt size={12} tone="ink2" numberOfLines={1}>{b.note || b.t}</Txt> : null}
      </View>
    </Press>
  );
}

function AddLink({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useT();
  return (
    <Press onPress={onPress} hitSlop={12} scale={0.94} accessibilityRole="button" accessibilityLabel={label}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'center' }}>
      <Icon name="plus" size={12} color={t.greenInk} />
      <Txt size={12.5} w="600" color={t.greenInk}>{label}</Txt>
    </Press>
  );
}

// ---------- あとで仕分け ----------
const md = (key: string) => { const [, m, d] = key.split('-').map(Number); return `${m}/${d}`; };
const span = (x: Session) => {
  const [h, m] = x.at.split(':').map(Number);
  const a = h * 60 + m - x.min;
  const c = (v: number) => `${Math.floor(((v % 1440) + 1440) % 1440 / 60)}:${String(((v % 60) + 60) % 60).padStart(2, '0')}`;
  return `${c(a)}〜${x.at}`;
};
function sortSheet(x: Session) {
  openSheet((close) => <SortForm x={x} close={close} />, { grouped: true, center: true, corner: 12 });
}
/** One 自習 record: what it was (optional), then a tap on its subject saves it. */
function SortForm({ x, close }: { x: Session; close: () => void }) {
  const t = useT();
  const std = useStd();
  // スタンダード: the boxes are cards with the ink outline; やめる and the other words in ink
  const box = std ? { backgroundColor: S.card, boxShadow: ring() } : { backgroundColor: t.dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)' };
  const subjects = useSubjects();
  const [what, setWhat] = useState(x.what ?? '');
  const put = (id: string) => {
    haptic.success();
    sortFree(x.id, id, what);
    close();
    toast(`${subj(id).name}に仕分けました`, `${md(x.date)} ${x.min}分${what.trim() ? ` · ${what.trim()}` : ''}`);
  };
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40 }}>
        <Press onPress={close} scale={0.94} hitSlop={8} accessibilityLabel="やめる" style={{ minWidth: 64 }}>
          <Txt size={std ? 15 : 16} w={std ? '700' : '400'} color={t.blue}>やめる</Txt>
        </Press>
        <Txt size={16} w="600" accessibilityRole="header" style={{ flex: 1, textAlign: 'center' }}>仕分ける</Txt>
        <View style={{ minWidth: 64 }} />
      </View>
      <Txt size={13} tone="ink2" style={{ textAlign: 'center' }}>{`${md(x.date)} ${span(x)} · 自習 ${x.min}分`}</Txt>
      <TextInput value={what} onChangeText={(v) => setWhat(v.slice(0, 30))} placeholder="内容（例：相対性理論）" placeholderTextColor={t.ink3} accessibilityLabel="勉強した内容"
        style={[{ height: 44, paddingHorizontal: 14, borderRadius: 10, backgroundColor: t.dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)', fontSize: 16, color: t.ink }, std && { height: 48, borderRadius: SR.key, backgroundColor: S.card, boxShadow: ring(1.5) }, noOutline]} />
      <ContentHints s={null} typed={what} onPick={setWhat} />
      <Txt size={12.5} tone="ink3" style={{ paddingLeft: 4 }}>科目を押すと仕分けられます</Txt>
      <View style={[{ flexDirection: 'row', flexWrap: 'wrap', borderRadius: 10, paddingVertical: 6 }, box, std && { borderRadius: SR.mid, paddingVertical: 8 }]} accessibilityRole="radiogroup">
        {subjects.map((s) => (
          <Press key={s.id} onPress={() => put(s.id)} scale={0.92} accessibilityLabel={`${s.name}に仕分ける`}
            style={{ width: '25%', alignItems: 'center', gap: 4, paddingVertical: 6 }}>
            <SubjTile name={s.name} color={s.c} area={s.area} size={40} radius={8} />
            <Txt size={11.5} tone="ink2" numberOfLines={1}>{s.name}</Txt>
          </Press>
        ))}
      </View>
      {/* several subjects at once, or not worth sorting: it stays 自習 and leaves the list */}
      <Press onPress={() => { haptic.tap(); keepFree(x.id, what); close(); toast('自習のままにしました', 'グラフでは「自習」として残ります'); }} scale={0.97} accessibilityLabel="自習のままにする"
        style={[{ height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, box, std && { height: 52, borderRadius: SR.mid }]}>
        <Txt size={15} w={std ? '700' : '600'} color={t.blue}>自習のままにする</Txt>
        <Txt size={11} tone="ink3">いくつかの科目をまとめてやったときなど</Txt>
      </Press>
    </View>
  );
}

// ---------- スタンダード (docs/app/mock/study.html) ----------
// The same page drawn the site's way: headings with their square and a small
// ＋ 追加 key, the weekdays on one plate (the picked day lime), the day as a
// route map — stations in the subject's color, the line solid behind you and
// dotted ahead, now a crimson square and rule — and the deadlines with stickers.
function StdStudy({ pad }: { pad: number }) {
  return (
    <Screen>
      <DeletePlanHost />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: pad, gap: 20 }}>
        {/* no page name (the tab bar says where you are): just today's date */}
        <Txt size={15} w="700" lh={22} accessibilityRole="header" style={{ paddingHorizontal: 2 }}>{jpDate(new Date())}</Txt>
        <Timetable />
        <StdDeadlines />
      </ScrollView>
    </Screen>
  );
}

/** ＋ 追加: a small key by a heading. */
function AddKey({ a11y, onPress }: { a11y: string; onPress: () => void }) {
  return (
    <StdKey onPress={onPress} label={a11y} kd={3} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }} style={{ minHeight: 32, marginBottom: 3 }} face={{ minHeight: 32, paddingHorizontal: 12, gap: 6 }}>
      <Pix name="plus" />
      <Txt size={13} w="700" lh={17}>追加</Txt>
    </StdKey>
  );
}

/** The weekdays on one plate on an ink floor: the picked day lime, today in bold. */
function StdWeek({ day, today, onPick }: { day: number; today: number; onPick: (i: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 3 }} accessibilityRole="tablist">
      <View pointerEvents="none" style={{ position: 'absolute', left: -2, right: -2, top: 1, bottom: -5, borderRadius: SR.key + 2, backgroundColor: S.ink }} />
      <View style={{ flex: 1, flexDirection: 'row', borderRadius: SR.key, backgroundColor: S.card, boxShadow: ring(), overflow: 'hidden' }}>
        {DOW.map((w, i) => {
          const on = i === day;
          return (
            <Pressable key={w} onPress={() => { if (!on) { haptic.tap(); onPick(i); } }} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${w}曜日${i === today ? '（今日）' : ''}`}
              style={({ pressed }) => [{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? S.lime : pressed ? S.paper2 : 'transparent' }, i > 0 && { borderLeftWidth: 2, borderLeftColor: S.ink }]}>
              <Text style={{ fontSize: 14, lineHeight: 18, fontFamily: font.text, fontWeight: i === today || on ? '800' : '600', color: i === today || on ? S.ink : S.ink2 }}>{w}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** A plan's picture: its photo, or its subject's color with the picture drawn in ink. No edge (the caller gives it one). */
function StdArt({ b, size, r }: { b: Block; size: number; r: number }) {
  const sj = subj(b.s);
  if (b.icon) return <Image source={{ uri: iconUri(b.icon) }} style={{ width: size, height: size, borderRadius: r }} contentFit="cover" transition={150} accessibilityIgnoresInvertColors />;
  return <SubjTile name={sj.name} color={sj.c} size={size} radius={r} />;
}

type Row = Slot | { block: Block; state: 'plain' };
function StdTimetable({ day, setDay, today, isToday, stops, rows, now }: { day: number; setDay: (i: number) => void; today: number; isToday: boolean; stops: Stop[]; rows: Row[]; now: string }) {
  const empty = !rows.length && !stops.length;
  return (
    <View style={{ gap: 10 }}>
      <StdHead title="時間割" accent={S.sky} right={<AddKey a11y="時間割に予定を追加" onPress={() => planCalendar()} />} />
      <StdWeek day={day} today={today} onPick={setDay} />
      {empty ? (
        // nothing that day: a dashed box, めぶ asleep in it; a tap adds a plan
        <Pressable onPress={() => { haptic.tap(); planCalendar(); }} accessibilityRole="button" accessibilityLabel="時間割に予定を追加"
          style={({ pressed }) => ({ alignItems: 'center', gap: 8, paddingVertical: 20, paddingHorizontal: 16, borderRadius: SR.mid, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(23,18,31,0.32)', backgroundColor: pressed ? S.paper2 : S.card })}>
          <Creature id="mebu" face="sleep" />
          <Txt size={15} w="700" lh={21} style={{ textAlign: 'center' }}>{isToday ? '今日の時間割はまだありません' : `${DOW[day]}曜日の時間割はまだありません`}</Txt>
          {/* broken where the phrases end (a Japanese line would otherwise split a word: 1タ／ップ) */}
          <Txt size={13} tone="ink2" lh={20} style={{ textAlign: 'center' }}>{'「追加」で日と始める時刻と科目を決めておくと、\n1タップで始められます。\n次の予定の時刻に知らせます'}</Txt>
        </Pressable>
      ) : (
        <Card pad={0}>
          {isToday ? (
            <View style={{ paddingVertical: 8 }}>
              {stops.map((st, i) => st.kind === 'free' ? <StdStopRow key={st.x.id} st={st} first={i === 0} />
                : <Slide key={st.b.id} b={st.b}><StdStopRow st={st} first={i === 0} /></Slide>)}
              <StdNowRow at={now} first={!stops.length} last={!rows.length} />
              {rows.map(({ block: b, state }, i) => <Slide key={b.id} b={b}><StdAheadRow b={b} live={state === 'now'} next={state === 'next'} last={i === rows.length - 1} /></Slide>)}
            </View>
          ) : (
            <View style={{ paddingVertical: 2, paddingHorizontal: 12 }}>
              {rows.map(({ block: b }, i) => <Slide key={b.id} b={b}><StdPlainRow b={b} first={!i} /></Slide>)}
            </View>
          )}
        </Card>
      )}
    </View>
  );
}

const ROW = { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 12 };
/** The line in one row: from the top to the node and from the node to the bottom, solid (behind) or dotted (ahead), drawn behind the node. */
function StdRail({ first, last, ahead, behind, children }: { first?: boolean; last?: boolean; ahead?: boolean; /** this minute: solid above, dotted below */ behind?: boolean; children?: ReactNode }) {
  const piece = (top: boolean) => ahead && !(behind && top) ? (
    <View style={{ position: 'absolute', left: RAIL_W / 2 - 1, width: 2, ...(top ? { top: 0, bottom: '50%' } : { top: '50%', bottom: 0 }), overflow: 'hidden', gap: 3, paddingTop: top ? 0 : 3 }}>
      {Array.from({ length: 24 }, (_, k) => <View key={k} style={{ width: 2, height: 2, backgroundColor: S.ink3 }} />)}
    </View>
  ) : <View style={{ position: 'absolute', left: RAIL_W / 2 - 1, width: 2, backgroundColor: S.ink, ...(top ? { top: 0, bottom: '50%' } : { top: '50%', bottom: 0 }) }} />;
  return (
    <View style={{ width: RAIL_W, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
      {first ? null : piece(true)}
      {last ? null : piece(false)}
      {children}
    </View>
  );
}
function StdTime({ children }: { children: ReactNode }) {
  return <View style={{ width: TIME_W, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 6 }}>{children}</View>;
}
/** A tag by a plan's name: つぎ (paper, a thin ink edge, DotGothic16) or NOW (crimson). */
function StdTag({ now }: { now?: boolean }) {
  useT(); // the faces arrive later: render again then
  return now ? (
    <View style={{ minHeight: 18, paddingHorizontal: 6, justifyContent: 'center', borderRadius: 6, backgroundColor: S.pause, boxShadow: ring(1.5) }}>
      <Text style={{ fontFamily: bundledFace('label') ?? font.text, fontSize: 10, lineHeight: 12, letterSpacing: 0.6, color: '#FFFFFF' }}>NOW</Text>
    </View>
  ) : (
    <View style={{ minHeight: 20, paddingHorizontal: 6, justifyContent: 'center', borderRadius: 7, backgroundColor: S.card, boxShadow: ring(1.5) }}>
      <PixHead size={11}>つぎ</PixHead>
    </View>
  );
}
function StdTimes({ b }: { b: Block }) {
  if (!b.start) return <Clock size={10.5} w="600" tone="ink3">時刻なし</Clock>;
  return (
    <>
      <Clock size={13} w="700" lh={16}>{b.start}</Clock>
      {b.min ? <Clock size={11} tone="ink3" lh={14}>{endOf(b)}</Clock> : <Txt size={11} tone="ink3" lh={14} numberOfLines={1}>から</Txt>}
    </>
  );
}
/** Behind you: done (its picture small on the line with an ink ✓), its time gone by (faded, ×), or a 自習 to sort. */
function StdStopRow({ st, first }: { st: Stop; first: boolean }) {
  if (st.kind === 'free') {
    const x = st.x, at = clockOf(Math.max(0, st.at));
    return (
      <Press onPress={() => sortSheet(x)} scale={0.99} accessibilityLabel={`${at}から自習 ${x.min}分${x.what ? ` ${x.what}` : ''}。科目を付けて仕分ける`} style={[ROW, { minHeight: 44 }]}>
        <StdTime><Clock size={12} w="500" tone="ink3">{at}</Clock></StdTime>
        <StdRail first={first}>
          <View style={{ padding: 3, backgroundColor: S.card }}><View style={{ width: 12, height: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: S.ink3, backgroundColor: S.card }} /></View>
        </StdRail>
        <Txt size={13} tone="ink2" numberOfLines={1} style={{ flex: 1, minWidth: 0, paddingLeft: 6 }}>
          <Txt size={13} w="700">{`自習 ${x.min}分`}</Txt>{x.what || x.note ? ` · ${x.what || x.note}` : ''}
        </Txt>
        <Text style={{ fontSize: 13, lineHeight: 18, fontWeight: '700', color: S.ink, fontFamily: font.text, textDecorationLine: 'underline' }}>仕分ける</Text>
      </Press>
    );
  }
  const b = st.b, sj = subj(b.s), plan = b.min ?? 0;
  return (
    <Press onPress={() => blockSheet(b)} scale={0.99} {...delA11y(b)}
      accessibilityLabel={`${b.start ? `${b.start}から` : '時刻なし'} ${sj.name} ${b.t ?? ''}。${st.finished ? `終わった${st.min ? ` ${st.min}分${plan ? `（予定${plan}分）` : ''}` : ''}` : 'やらずに時間が過ぎた'}。編集`}
      style={[ROW, { minHeight: 44 }]}>
      <StdTime><Clock size={12} w="500" tone="ink3">{b.start ?? '—'}</Clock></StdTime>
      <StdRail first={first}>
        <View style={{ padding: 2, borderRadius: 8, backgroundColor: S.card }}>
          <View style={{ opacity: st.finished ? 1 : 0.35 }}><StdArt b={b} size={22} r={6} /></View>
          <View style={{ position: 'absolute', right: -5, bottom: -5, width: 13, height: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: st.finished ? S.ink : S.ink3, boxShadow: ring(2, S.card) }}>
            <Icon name={st.finished ? 'check' : 'x'} size={9} color={S.onInk} width={3} />
          </View>
        </View>
      </StdRail>
      <Txt size={13} tone={st.finished ? 'ink2' : 'ink3'} numberOfLines={1} style={{ flex: 1, minWidth: 0, paddingLeft: 6, paddingRight: 8 }}>
        <Txt size={13} w="700" tone={st.finished ? 'ink' : 'ink3'} style={st.finished ? null : { textDecorationLine: 'line-through' }}>{sj.name}</Txt>
        {b.note || b.t ? ` · ${b.note || b.t}` : ''}
      </Txt>
      {st.finished ? <StdMeter min={st.min} plan={plan} color={sj.c} /> : (
        <View style={{ minHeight: 20, paddingHorizontal: 7, justifyContent: 'center', borderRadius: 7, backgroundColor: S.paper2, boxShadow: ring(1.5, 'rgba(23,18,31,0.16)') }}>
          <Txt size={11} w="600" tone="ink3" lh={14}>やらなかった</Txt>
        </View>
      )}
    </Press>
  );
}
/** How long it was studied against its plan: a small bar in the subject's color (the overtime orange), and the minutes. */
function StdMeter({ min, plan, color }: { min: number; plan: number; color: string }) {
  if (!min) return <Txt size={11} w="700" tone="ink2">完了</Txt>;
  const done = plan ? Math.min(1, min / plan) : 1;
  const extra = plan && min > plan ? Math.min(0.4, (min - plan) / plan) : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 40, height: 6, backgroundColor: S.paper2, boxShadow: ring(1.5), flexDirection: 'row', overflow: 'hidden' }}>
        <View style={{ flex: done, backgroundColor: color }} />
        {extra ? <View style={{ flex: extra, backgroundColor: S.over }} /> : null}
        {done < 1 ? <View style={{ flex: 1 - done }} /> : null}
      </View>
      <Txt num size={11} w="700" tone="ink2">{`${min}分`}</Txt>
    </View>
  );
}
/** This minute: a crimson square on the line and a crimson rule across the day. */
function StdNowRow({ at, first, last }: { at: string; first: boolean; last: boolean }) {
  return (
    <View style={[ROW, { minHeight: 26 }]} accessible accessibilityLabel={`いま ${at}`}>
      <StdTime><Clock size={12} w="800" color={S.pause}>{at}</Clock></StdTime>
      <StdRail first={first} last={last} ahead behind><View style={{ width: 10, height: 10, backgroundColor: S.pause, boxShadow: ring(2, S.card) }} /></StdRail>
      <View style={{ flex: 1, marginLeft: 6, height: 2, backgroundColor: S.pause }} />
    </View>
  );
}
/** The plan under way (paper 2 behind it, its picture on the line in a still lime ring, NOW) and the ones to come (a station in its color; the picture on the right). */
function StdAheadRow({ b, live, next, last }: { b: Block; live: boolean; next: boolean; last: boolean }) {
  const sj = subj(b.s);
  return (
    <Press onPress={() => blockSheet(b)} scale={0.99} {...delA11y(b)} accessibilityLabel={`${b.start ? `${b.start}から` : '時刻なし'} ${sj.name} ${b.t ?? ''}${live ? '。いまの予定' : next ? '。つぎの予定' : ''}。編集`}
      // the live row's ground is inset and its padding takes up the inset, so its columns stay on the grid
      style={[ROW, { minHeight: live ? 66 : 74 }, live ? { marginHorizontal: 6, marginVertical: 2, paddingHorizontal: 6, borderRadius: 14, backgroundColor: S.paper2 } : null]}>
      <StdTime><StdTimes b={b} /></StdTime>
      <StdRail ahead last={last}>
        {live ? (
          <View style={{ padding: 3, borderRadius: 11, backgroundColor: S.paper2 }}>
            <View style={{ borderRadius: 8, boxShadow: `0px 0px 0px 2px ${S.ink}, 0px 0px 0px 5px ${S.lime}, 0px 0px 0px 7px ${S.ink}` }}><StdArt b={b} size={28} r={8} /></View>
          </View>
        ) : <View style={{ width: 12, height: 12, backgroundColor: sj.c, boxShadow: `0px 0px 0px 2px ${S.ink}, 0px 0px 0px 4px ${S.card}` }} />}
      </StdRail>
      <View style={{ flex: 1, minWidth: 0, paddingLeft: live ? 10 : 6, paddingRight: 8, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Txt size={15} w="700" lh={20} numberOfLines={1} style={{ flexShrink: 1 }}>{sj.name}</Txt>
          {live ? <StdTag now /> : next ? <StdTag /> : null}
        </View>
        {b.note || b.t ? <Txt size={12} tone="ink2" lh={17} numberOfLines={1}>{b.note || b.t}</Txt> : null}
      </View>
      {live ? null : <View style={{ borderRadius: 10, boxShadow: ring() }}><StdArt b={b} size={42} r={10} /></View>}
    </Press>
  );
}
/** Another weekday: its plans as plain rows (the time, the picture, the subject and its memo). */
function StdPlainRow({ b, first }: { b: Block; first: boolean }) {
  const sj = subj(b.s);
  return (
    <Press onPress={() => blockSheet(b)} scale={0.99} {...delA11y(b)} accessibilityLabel={`${b.start ? `${b.start}から` : '時刻なし'} ${sj.name} ${b.t ?? ''}。編集`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 62, paddingVertical: 8, borderTopWidth: first ? 0 : 1.5, borderTopColor: S.line }}>
      <View style={{ width: TIME_W, alignItems: 'flex-end', justifyContent: 'center' }}><StdTimes b={b} /></View>
      <View style={{ borderRadius: 10, boxShadow: ring() }}><StdArt b={b} size={40} r={10} /></View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Txt size={15} w="700" lh={20} numberOfLines={1}>{sj.name}</Txt>
        {b.note || b.t ? <Txt size={12} tone="ink2" lh={17} numberOfLines={1}>{b.note || b.t}</Txt> : null}
      </View>
    </Press>
  );
}

/** The deadlines: a sticker each (a flag within 21 days, then a calendar, then a trophy; tilted in turn), the days left and the ToDos done. */
function StdDeadlines() {
  const deadlines = useDeadlines();
  return (
    <View style={{ gap: 10 }}>
      <StdHead title="締切" accent={S.coral} sub="ToDoの進み具合" right={<AddKey a11y="締切を追加" onPress={deadlineSheet} />} />
      <Card pad={0} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
        {deadlines.length ? null : (
          <Pressable onPress={() => { haptic.tap(); deadlineSheet(); }} accessibilityRole="button" style={{ minHeight: 56, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={13} tone="ink3">模試や申込の日を入れておきましょう</Txt>
          </Pressable>
        )}
        {deadlines.map((d, i) => {
          const soon = d.days <= 21;
          return (
            <Press key={d.id} onPress={() => deadlineActions(d.id, d.t)} scale={0.99} accessibilityLabel={`${d.t} あと${d.days}日`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 8, borderTopWidth: i ? 1.5 : 0, borderTopColor: S.line }}>
              <View style={{ width: 40, alignItems: 'center' }}><PixSticker name={soon ? 'flag' : i === 1 ? 'cal' : 'trophy'} tilt={i % 2 ? 6 : -6} /></View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Txt size={15} w="700" lh={20} numberOfLines={1}>{d.t}</Txt>
                <Txt size={12} tone="ink3" lh={16} numberOfLines={1}>{`${d.mo}月${d.day}日 · ${d.note ?? (d.total ? `ToDo ${d.done}/${d.total}` : 'ToDoなし')}`}</Txt>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                  <Txt num size={17} w="700" lh={20} color={soon ? '#A65F00' : S.ink}>{d.days}</Txt>
                  <Txt size={11} w="500" tone="ink3" lh={14}>日</Txt>
                </View>
                {d.total ? (
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {Array.from({ length: Math.min(d.total, 8) }, (_, k) => <View key={k} style={{ width: 8, height: 8, backgroundColor: k < d.done ? S.ink : 'transparent', boxShadow: ring(1.5) }} />)}
                  </View>
                ) : null}
              </View>
            </Press>
          );
        })}
      </Card>
    </View>
  );
}
