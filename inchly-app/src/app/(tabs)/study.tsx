import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { FREE, subj } from '@/data';
import { Deadlines } from '@/screens/home/standard';
import { blocksOn, endOf, slotsOf, type Block, type Slot } from '@/lib/timetable';
import { jpDate, mondayIndex } from '@/lib/time';
import { doneOn, type Session, updateSession, useNow, useStore, useSubjects } from '@/store';
import { hair, noOutline, type, useT } from '@/theme';
import { Card, haptic, Press, SubjTile, Txt } from '@/ui/base';
import { Screen, useTabPad } from '@/ui/Chrome';
import { blockSheet } from '@/ui/Editors';
import { planCalendar } from '@/ui/PlanSheets';
import { openSheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';
import { Icon } from '@/ui/Icon';
import { PlanArt } from '@/ui/PlanArt';

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
          <Txt size={type.title + 4} w="800">勉強</Txt>
          <Txt size={12} tone="ink3">{jpDate(new Date())}</Txt>
        </View>
        <Unsorted />
        <Timetable />
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}><Deadlines /></View>
        <View style={{ height: 8, backgroundColor: t.backdrop !== 'none' ? 'transparent' : t.canvas }} />
      </ScrollView>
    </Screen>
  );
}

// ---------- the timetable ----------
function Timetable() {
  const t = useT();
  const now = useNow(30_000);
  const d = new Date(now);
  const today = mondayIndex(d);
  const [day, setDay] = useState(today);
  const blocks = useStore((x) => x.timetable);
  const doneList = useStore((x) => x.doneBlocks);
  const done = doneOn({ doneBlocks: doneList }, d);
  // the chosen weekday: today with live states, another day as a plain list
  const list: (Slot | { block: Block; state: 'plain' })[] = day === today
    ? slotsOf(blocks, d)
    : blocksOn(blocks, new Date(d.getFullYear(), d.getMonth(), d.getDate() + (day - today))).map((block) => ({ block, state: 'plain' as const }));
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
        {list.length ? list.map(({ block: b, state }, i) => {
          const sj = subj(b.s);
          const finished = day === today && done.has(b.id);
          const past = state === 'past' || finished;
          const live = state === 'now' && !finished;
          return (
            <Press key={b.id} onPress={() => blockSheet(b)} scale={0.99} accessibilityLabel={`${b.start ? `${b.start}から` : '時刻なし'} ${sj.name} ${b.t ?? ''}。編集`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingLeft: 12, paddingRight: 10, borderTopWidth: i ? hair : 0, borderTopColor: t.line,
                backgroundColor: live ? t.sunken : 'transparent', opacity: past ? 0.45 : 1 }}>
              <View style={{ width: 48 }}>
                {b.start ? (
                  <>
                    <Txt num size={13} w="700" lh={16}>{b.start}</Txt>
                    {b.min ? <Txt num size={11} tone="ink3" lh={14}>{endOf(b)}</Txt> : <Txt size={11} tone="ink3" lh={14}>から</Txt>}
                  </>
                ) : <Txt size={10.5} w="600" tone="ink3" lh={14} numberOfLines={1}>時刻なし</Txt>}
              </View>
              {/* the plan's icon: its photo, or its subject's picture */}
              <PlanArt icon={b.icon} name={sj.name} color={sj.c} size={38} radius={9} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Txt size={14.5} w="700" numberOfLines={1} style={{ flexShrink: 1 }}>{sj.name}</Txt>
                  {live ? <View style={{ paddingHorizontal: 6, height: 18, borderRadius: 9, backgroundColor: t.ink, justifyContent: 'center' }}><Txt size={10} w="800" color={t.onInk}>いま</Txt></View> : null}
                  {finished ? <Txt size={11} w="600" tone="ink3">終わった</Txt> : state === 'next' ? <Txt size={11} w="600" tone="ink3">つぎ</Txt> : null}
                  {b.date ? <Txt size={11} w="600" tone="ink3">この日だけ</Txt> : null}
                </View>
                {/* under it, the memo (no memo: what to do) */}
                {b.note || b.t ? <Txt size={12} tone="ink2" numberOfLines={1}>{b.note || b.t}</Txt> : null}
              </View>
            </Press>
          );
        }) : (
          <Press onPress={() => planCalendar()} style={{ paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center', gap: 4 }}>
            <Txt size={13.5} w="600">{day === today ? '今日の時間割はまだありません' : `${DOW[day]}曜日の時間割はまだありません`}</Txt>
            <Txt size={12} tone="ink3">「追加」で日と始める時刻と科目を決めておくと、1タップで始められます。次の予定の時刻に知らせます</Txt>
          </Press>
        )}
      </Card>
    </>
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
/** 自習 recorded with no subject: one row each, newest first; a tap gives it one (charts are by subject). */
function Unsorted() {
  const t = useT();
  const sessions = useStore((x) => x.sessions);
  const list = sessions.filter((x) => x.s === FREE).slice().reverse();
  if (!list.length) return null;
  return (
    <View style={{ paddingTop: 14 }}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Txt size={type.head} w="700">あとで仕分け</Txt>
        <Txt size={12} tone="ink3" style={{ flex: 1 }} numberOfLines={1}>{`科目のない自習 ${list.length}件`}</Txt>
      </View>
      <Card style={{ marginHorizontal: 16 }} pad={0}>
        {list.map((x, i) => (
          <Press key={x.id} onPress={() => sortSheet(x)} scale={0.99} accessibilityLabel={`${md(x.date)} ${span(x)} ${x.min}分の自習。科目を付ける`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingLeft: 12, paddingRight: 12, borderTopWidth: i ? hair : 0, borderTopColor: t.line }}>
            <View style={{ width: 48 }}>
              <Txt num size={13} w="700" lh={16}>{md(x.date)}</Txt>
              <Txt num size={11} tone="ink3" lh={14}>{x.at}</Txt>
            </View>
            <SubjTile name="自習" color={subj(FREE).c} area="other" size={38} radius={9} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={14.5} w="700">{`自習 ${x.min}分`}</Txt>
              <Txt size={12} tone={x.what || x.note ? 'ink2' : 'ink3'} numberOfLines={1}>{x.what || x.note || span(x)}</Txt>
            </View>
            <Txt size={12.5} w="600" color={t.blue}>仕分ける</Txt>
          </Press>
        ))}
      </Card>
    </View>
  );
}
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
    updateSession(x.id, { s: id, what: what.trim() || undefined });
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
    </View>
  );
}
