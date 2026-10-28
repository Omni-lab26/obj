import { type ReactNode, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { FREE, subj } from '@/data';
import { Deadlines } from '@/screens/home/standard';
import { blocksOn, endOf, slotsOf, toMin, type Block, type Slot } from '@/lib/timetable';
import { dateKey, jpDate, mondayIndex } from '@/lib/time';
import { doneOn, keepFree, type Session, sortFree, useNow, useStore, useSubjects } from '@/store';
import { hair, noOutline, type, useT } from '@/theme';
import { Card, haptic, Press, SubjTile, Txt } from '@/ui/base';
import { Screen, useTabPad } from '@/ui/Chrome';
import { ContentHints } from '@/ui/ContentHints';
import { blockSheet } from '@/ui/Editors';
import { planCalendar } from '@/ui/PlanSheets';
import { openSheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';
import { Icon } from '@/ui/Icon';
import { PlanArt } from '@/ui/PlanArt';
import { SubjectMark, subjectKind } from '@/ui/Loader';

// The middle tab: the plan — the timetable and the deadlines. Each row is the
// time, the plan's icon, and its subject with the memo under it; a tap edits it.
// Nothing starts here: studying is run from the study bar above the tab bar
// (勉強を開始, and the timer opens only from there). At the top, あとで仕分け:
// 自習 recorded without a subject, each waiting for one (and what it was).

const DOW = ['月', '火', '水', '木', '金', '土', '日'];

export default function Study() {
  const t = useT();
  const pad = useTabPad();
  return (
    <Screen>
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
          <PlanRow key={b.id} b={b} live={state === 'now'} next={state === 'next'} first={!i} />
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
      {stops.map((st, i) => <StopRow key={st.kind === 'free' ? st.x.id : st.b.id} st={st} first={i === 0} last={false} />)}
      <NowMark at={now} first={!stops.length} last={!rows.length} />
      {rows.map(({ block: b, state }, i) => (
        <AheadRow key={b.id} b={b} live={state === 'now'} next={state === 'next'} last={stops.length + 1 + i === n - 1} />
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
    <Press onPress={() => blockSheet(b)} scale={0.99}
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
    <Press onPress={() => blockSheet(b)} scale={0.99} accessibilityLabel={`${b.start ? `${b.start}から` : '時刻なし'} ${sj.name} ${b.t ?? ''}${live ? '。いまの予定' : next ? '。つぎの予定' : ''}。編集`}
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
    <Press onPress={() => blockSheet(b)} scale={0.99} accessibilityLabel={`${b.start ? `${b.start}から` : '時刻なし'} ${sj.name} ${b.t ?? ''}。編集`}
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
          <Txt size={16} color={t.blue}>やめる</Txt>
        </Press>
        <Txt size={16} w="600" accessibilityRole="header" style={{ flex: 1, textAlign: 'center' }}>仕分ける</Txt>
        <View style={{ minWidth: 64 }} />
      </View>
      <Txt size={13} tone="ink2" style={{ textAlign: 'center' }}>{`${md(x.date)} ${span(x)} · 自習 ${x.min}分`}</Txt>
      <TextInput value={what} onChangeText={(v) => setWhat(v.slice(0, 30))} placeholder="内容（例：相対性理論）" placeholderTextColor={t.ink3} accessibilityLabel="勉強した内容"
        style={[{ height: 44, paddingHorizontal: 14, borderRadius: 10, backgroundColor: t.dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)', fontSize: 16, color: t.ink }, noOutline]} />
      <ContentHints s={null} typed={what} onPick={setWhat} />
      <Txt size={12.5} tone="ink3" style={{ paddingLeft: 4 }}>科目を押すと仕分けられます</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderRadius: 10, paddingVertical: 6, backgroundColor: t.dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)' }} accessibilityRole="radiogroup">
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
        style={{ height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: t.dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)' }}>
        <Txt size={15} w="600" color={t.blue}>自習のままにする</Txt>
        <Txt size={11} tone="ink3">いくつかの科目をまとめてやったときなど</Txt>
      </Press>
    </View>
  );
}
