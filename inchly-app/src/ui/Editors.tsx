import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ROOM, subj } from '../data';
import { addDays, dateKey, daysUntil as untilDate, jpDate, parseKey } from '../lib/time';
import { Block } from '../lib/timetable';
import { addSession, addTodo, block, getState, moveTodo, removeDeadline, removeSession, removeTodo, Session, Todo, toggleFollow, updateSession, updateTodo, useStore, useSubjects } from '../store';
import { hair, useT } from '../theme';
import { ring, S, SR, useStd } from './stdLook';
import { Avatar, Btn, haptic, Txt } from './base';
import { DatePick, DurationPick, Opens, PickChip, SMOOTH } from './DateTime';
import { openDm } from './DmParts';
import { Choice, Field, Label, RadioCards } from './Form';
import { planCalendar, planSheet } from './PlanSheets';
import { openSheet } from './Sheet';
import { toast } from './Toast';

// The sheets that turn the mock into a tool: add and fix records, manage the
// ToDo list and deadlines, and act on a person (follow, block, report).

const clockNow = () => { const d = new Date(); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
/** Subjects to pick from, in your order. */
const useSubjOpts = () => useSubjects().map((x) => ({ v: x.id, label: x.name }));

// ---------- a session: add by hand, or fix one ----------
export function sessionSheet(existing?: Session) {
  openSheet((close) => <SessionForm close={close} existing={existing} />);
}
function SessionForm({ close, existing }: { close: () => void; existing?: Session }) {
  const t = useT();
  const std = useStd();
  const subjOpts = useSubjOpts();
  const [s, setS] = useState(existing?.s ?? getState().subj);
  const [min, setMin] = useState(existing?.min ?? 30);
  const today = dateKey();
  const yesterday = addDays(today, -1);
  const [date, setDate] = useState(existing?.date ?? today);
  const [note, setNote] = useState(existing?.note ?? '');
  const [open, setOpen] = useState<'date' | 'len' | null>(null);
  const toggle = (k: 'date' | 'len') => { haptic.tap(); setOpen(open === k ? null : k); };
  const save = () => {
    if (existing) updateSession(existing.id, { s, min, date, note: note.trim() || undefined });
    else addSession({ s, min, date, at: date === today ? clockNow() : '—', note: note.trim() || undefined, manual: true });
    haptic.success();
    close();
    toast(existing ? '記録を直しました' : `${subj(s).name} ${min}分を追加しました`, date === today ? '今日の合計に入りました' : `${date === yesterday ? '昨日' : jpDate(parseKey(date), false)}の記録に入りました`);
  };
  return (
    <View style={{ gap: 18 }}>
      <Txt size={18} w="700">{existing ? '記録を直す' : '記録を手で追加'}</Txt>
      <View>
        <Label>科目</Label>
        <Choice value={s} onChange={setS} options={subjOpts} />
      </View>
      {/* when and how long, picked as on an iPhone, right under their row */}
      {/* スタンダード: a card with the ink outline (on this view; the rows inside don't reach its edge) */}
      <Animated.View layout={SMOOTH} style={[{ borderRadius: 16, backgroundColor: t.sunken, overflow: 'hidden' }, std && { borderRadius: SR.mid, backgroundColor: S.card, boxShadow: ring(), overflow: 'visible' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 14 }}>
          <Txt size={15.5} style={{ flex: 1 }}>いつ</Txt>
          <PickChip on={open === 'date'} onPress={() => toggle('date')} label={date === today ? '今日' : date === yesterday ? '昨日' : jpDate(parseKey(date), false)} a11y="勉強した日を変える" />
        </View>
        {open === 'date' ? <Opens><DatePick value={parseKey(date)} max={new Date()} onChange={(x) => setDate(dateKey(x))} onDone={() => setOpen(null)} /></Opens> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 14, borderTopWidth: std ? 1.5 : hair, borderTopColor: t.line }}>
          <Txt size={15.5} style={{ flex: 1 }}>勉強した時間</Txt>
          <PickChip on={open === 'len'} onPress={() => toggle('len')} label={min >= 60 ? `${Math.floor(min / 60)}時間${min % 60 ? `${min % 60}分` : ''}` : `${min}分`} a11y="勉強した時間を変える" />
        </View>
        {open === 'len' ? <Opens><DurationPick value={min} onChange={setMin} /></Opens> : null}
      </Animated.View>
      <Field label="メモ（任意）" value={note} onChangeText={setNote} max={40} />
      <Btn kind="primary" wide label={existing ? '保存する' : '追加する'} onPress={save} />
      {existing ? (
        <Btn kind="ghost" wide label="この記録を削除" onPress={() => { removeSession(existing.id); haptic.warn(); close(); toast('記録を削除しました'); }} />
      ) : null}
    </View>
  );
}

// ---------- a ToDo ----------
export function todoSheet(existing?: Todo) {
  openSheet((close) => <TodoForm close={close} existing={existing} />);
}
function TodoForm({ close, existing }: { close: () => void; existing?: Todo }) {
  const subjOpts = useSubjOpts();
  const deadlines = useStore((x) => x.deadlines);
  const [text, setText] = useState(existing?.t ?? '');
  const [s, setS] = useState(existing?.s ?? getState().subj);
  const [dl, setDl] = useState(existing?.dl ?? 'none');
  const [touched, setTouched] = useState(false);
  const err = touched && !text.trim() ? 'やることを入れてください' : undefined;
  const save = () => {
    if (!text.trim()) { setTouched(true); return; }
    const patch = { t: text.trim(), s, dl: dl === 'none' ? undefined : dl };
    if (existing) updateTodo(existing.id, patch);
    else addTodo(patch);
    haptic.success();
    close();
    if (!existing) toast('ToDoに追加しました');
  };
  return (
    <View style={{ gap: 18 }}>
      <Txt size={18} w="700">{existing ? 'ToDoを編集' : 'ToDoを追加'}</Txt>
      <Field label="やること" value={text} onChangeText={setText} max={40} error={err} onBlur={() => setTouched(true)} />
      <View>
        <Label>科目</Label>
        <Choice value={s} onChange={setS} options={subjOpts} />
      </View>
      <View>
        <Label sub="締切の進み具合に数えます">どの締切に向けて？</Label>
        <Choice value={dl} onChange={setDl} options={[{ v: 'none', label: 'なし' }, ...deadlines.map((d) => ({ v: d.id, label: d.t }))]} />
      </View>
      <Btn kind="primary" wide label={existing ? '保存する' : '追加する'} onPress={save} />
      {existing ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn kind="quiet" label="上へ" style={{ flex: 1 }} onPress={() => { moveTodo(existing.id, -1); haptic.tap(); }} />
          <Btn kind="quiet" label="下へ" style={{ flex: 1 }} onPress={() => { moveTodo(existing.id, 1); haptic.tap(); }} />
          <Btn kind="quiet" label="削除" style={{ flex: 1 }} onPress={() => { removeTodo(existing.id); haptic.warn(); close(); toast('ToDoを削除しました'); }} />
        </View>
      ) : null}
    </View>
  );
}

// ---------- a timetable block ----------
/** A timetable block: an existing one opens in the planner's form; a new one starts from the month. */
export function blockSheet(existing?: Block) {
  if (existing) planSheet({ existing });
  else planCalendar();
}

// ---------- a deadline ----------
const daysUntil = (mo: number, day: number) => untilDate(mo, day);
export { daysUntil };

/** A new deadline: the same sheet as a plan, on 締切. */
export function deadlineSheet() {
  planSheet({ kind: 'deadline' });
}
export function deadlineActions(id: string, name: string) {
  openSheet((close) => (
    <View style={{ gap: 12 }}>
      <Txt size={18} w="700">{name}</Txt>
      <Btn kind="quiet" wide label="この締切を削除" onPress={() => { removeDeadline(id); haptic.warn(); close(); toast('締切を削除しました', 'ひも付いていたToDoは残ります'); }} />
      <Btn kind="ghost" wide label="やめる" onPress={close} />
    </View>
  ));
}

// ---------- a person: follow, block, report ----------
export function personSheet(name: string, color: string) {
  openSheet((close) => <Person name={name} color={color} close={close} />);
}
type Reason = 'spam' | 'harass' | 'adult' | 'other';
function Person({ name, color, close }: { name: string; color: string; close: () => void }) {
  const t = useT();
  const p = ROOM.find((x) => x.n === name);
  const following = useStore((s) => (p ? s.following.includes(p.h) : false));
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<Reason>('harass');
  if (reporting) {
    return (
      <View style={{ gap: 16 }}>
        <Txt size={18} w="700">{`${name} を通報`}</Txt>
        <RadioCards<Reason> value={reason} onChange={setReason} options={[
          { v: 'harass', title: 'いやがらせ・悪口', sub: '人を傷つけるメッセージや投稿' },
          { v: 'spam', title: 'スパム・宣伝', sub: '勧誘、外部サイトへの誘導' },
          { v: 'adult', title: '不適切な内容', sub: '性的・暴力的な内容、出会い目的' },
          { v: 'other', title: 'その他', sub: '運営に伝えたいこと' },
        ]} />
        <Txt size={12} tone="ink3" lh={18}>通報したことは相手に伝わりません。内容を確認して、必要なら運営が対応します。</Txt>
        <Btn kind="primary" wide label="通報する" onPress={() => { block(name); haptic.success(); close(); toast('通報しました', `${name} はブロックもしました`); }} />
      </View>
    );
  }
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Avatar name={name} color={color} size={64} />
      <Txt size={17} w="700" style={{ marginTop: 6 }}>{name}</Txt>
      {p ? <Txt size={12.5} tone="ink3">{`@${p.h} · ${p.g} 志望`}</Txt> : null}
      <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 16 }}>
        {p ? <Btn kind={following ? 'quiet' : 'primary'} wide label={following ? 'フォロー中' : 'フォローする'} onPress={() => { toggleFollow(p.h); haptic.soft(); }} /> : null}
        <Btn kind="line" wide label="メッセージを送る" onPress={() => { close(); openDm(name); }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn kind="line" label="ブロック" style={{ flex: 1 }} onPress={() => { block(name); haptic.warn(); close(); toast(`${name} をブロックしました`, '勉強中・投稿・チャットに表示されません'); }} />
          <Btn kind="line" label="通報" style={{ flex: 1 }} onPress={() => setReporting(true)} />
        </View>
      </View>
      <View style={{ alignSelf: 'stretch', marginTop: 12, paddingTop: 10, borderTopWidth: hair, borderTopColor: t.line }}>
        <Txt size={11.5} tone="ink3" style={{ textAlign: 'center' }}>ブロックは 設定 › ブロック中の人 から解除できます</Txt>
      </View>
    </View>
  );
}
