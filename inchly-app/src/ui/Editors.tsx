import { useState } from 'react';
import { View } from 'react-native';

import { ROOM, SUBJ } from '../data';
import { addDays, dateKey, daysUntil as untilDate, jpDate, parseKey } from '../lib/time';
import { Block, toMin } from '../lib/timetable';
import { addDeadline, addSession, addTodo, block, getState, moveTodo, removeBlock, removeDeadline, removeSession, removeTodo, saveBlock, Session, Todo, toggleFollow, toggleIn, updateSession, updateTodo, useStore } from '../store';
import { hair, useT } from '../theme';
import { Avatar, Btn, haptic, Press, Txt } from './base';
import { Choice, Field, Label, RadioCards, Stepper } from './Form';
import { openSheet } from './Sheet';
import { toast } from './Toast';

// The sheets that turn the mock into a tool: add and fix records, manage the
// ToDo list and deadlines, and act on a person (follow, block, report).

const clockNow = () => { const d = new Date(); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
const subjOpts = SUBJ.map((x) => ({ v: x.id, label: x.name }));

// ---------- a session: add by hand, or fix one ----------
export function sessionSheet(existing?: Session) {
  openSheet((close) => <SessionForm close={close} existing={existing} />);
}
function SessionForm({ close, existing }: { close: () => void; existing?: Session }) {
  const [s, setS] = useState(existing?.s ?? getState().subj);
  const [min, setMin] = useState(existing?.min ?? 30);
  const today = dateKey();
  const yesterday = addDays(today, -1);
  const [date, setDate] = useState(existing?.date ?? today);
  const [note, setNote] = useState(existing?.note ?? '');
  // today and yesterday, plus the record's own day when it's older
  const days = [{ v: today, label: '今日' }, { v: yesterday, label: '昨日' }, ...(existing && existing.date < yesterday ? [{ v: existing.date, label: jpDate(parseKey(existing.date), false) }] : [])];
  const save = () => {
    if (existing) updateSession(existing.id, { s, min, date, note: note.trim() || undefined });
    else addSession({ s, min, date, at: date === today ? clockNow() : '—', note: note.trim() || undefined, manual: true });
    haptic.success();
    close();
    toast(existing ? '記録を直しました' : `${SUBJ.find((x) => x.id === s)?.name} ${min}分を追加しました`, date === today ? '今日の合計に入りました' : `${date === yesterday ? '昨日' : jpDate(parseKey(date), false)}の記録に入りました`);
  };
  return (
    <View style={{ gap: 18 }}>
      <Txt size={18} w="700">{existing ? '記録を直す' : '記録を手で追加'}</Txt>
      <View>
        <Label>科目</Label>
        <Choice value={s} onChange={setS} options={subjOpts} />
      </View>
      <View>
        <Label sub="長押しで早送り、数字を上下にドラッグしても変えられます">勉強した時間</Label>
        <Stepper value={min} min={1} max={600} onChange={setMin} unit="分" label="勉強した時間" />
        <View style={{ marginTop: 10 }}>
          <Choice value={String(min)} onChange={(v) => setMin(Number(v))} options={[15, 30, 45, 60, 90].map((m) => ({ v: String(m), label: `${m}分` }))} />
        </View>
      </View>
      <View>
        <Label>いつ</Label>
        <Choice value={date} onChange={setDate} options={days} />
      </View>
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
      <Field label="やること" value={text} onChangeText={setText} max={40} error={err} onBlur={() => setTouched(true)} autoFocus={!existing} />
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
const DOW = ['月', '火', '水', '木', '金', '土', '日'];
export function blockSheet(existing?: Block) {
  openSheet((close) => <BlockForm close={close} existing={existing} />);
}
function BlockForm({ close, existing }: { close: () => void; existing?: Block }) {
  const t = useT();
  const startMin = existing ? toMin(existing.start) : 19 * 60;
  const [s, setS] = useState(existing?.s ?? getState().subj);
  const [hour, setHour] = useState(Math.floor(startMin / 60));
  const [minute, setMinute] = useState(String(Math.round((startMin % 60) / 15) * 15 % 60));
  const [len, setLen] = useState(String(existing?.min ?? 60));
  const [days, setDays] = useState<number[]>(existing?.days ?? [0, 1, 2, 3, 4]);
  const [memo, setMemo] = useState(existing?.t ?? '');
  const save = () => {
    if (!days.length) { haptic.warn(); toast('曜日を1つ以上選んでください'); return; }
    saveBlock({ id: existing?.id, s, t: memo.trim() || undefined, start: `${hour}:${minute.padStart(2, '0')}`, min: Number(len), days: [...days].sort() });
    haptic.success();
    close();
    toast(existing ? '時間割を保存しました' : '時間割に追加しました');
  };
  return (
    <View style={{ gap: 18 }}>
      <Txt size={18} w="700">{existing ? '時間割を編集' : '時間割に追加'}</Txt>
      <View>
        <Label>科目</Label>
        <Choice value={s} onChange={setS} options={subjOpts} />
      </View>
      <View>
        <Label>始める時刻</Label>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Stepper value={hour} min={0} max={23} onChange={setHour} unit="時" label="時" />
          <Choice value={minute} onChange={setMinute} options={['0', '15', '30', '45'].map((m) => ({ v: m, label: `${m.padStart(2, '0')}分` }))} />
        </View>
      </View>
      <View>
        <Label>長さ</Label>
        <Choice value={len} onChange={setLen} options={['30', '45', '60', '90', '120'].map((m) => ({ v: m, label: Number(m) >= 60 ? `${Number(m) / 60}時間` : `${m}分` }))} />
      </View>
      <View>
        <Label sub="選んだ曜日に毎週くり返します">曜日</Label>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {DOW.map((d, i) => {
            const on = days.includes(i);
            return (
              <Press key={d} onPress={() => setDays((x) => toggleIn(x, i))} scale={0.92} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${d}曜日`}
                style={{ flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.ink : t.sunken }}>
                <Txt size={13} w="700" color={on ? t.onInk : t.ink2}>{d}</Txt>
              </Press>
            );
          })}
        </View>
      </View>
      <Field label="何をやる？（例：青チャート）" value={memo} onChangeText={setMemo} max={24} />
      <Btn kind="primary" wide label={existing ? '保存する' : '追加する'} onPress={save} />
      {existing ? <Btn kind="quiet" wide label="この時間割を削除" onPress={() => { removeBlock(existing.id); haptic.warn(); close(); toast('時間割から削除しました'); }} /> : null}
    </View>
  );
}

// ---------- a deadline ----------
const daysUntil = (mo: number, day: number) => untilDate(mo, day);
export { daysUntil };

export function deadlineSheet() {
  openSheet((close) => <DeadlineForm close={close} />);
}
function DeadlineForm({ close }: { close: () => void }) {
  const [t, setT] = useState('');
  const [mo, setMo] = useState(() => (new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2));
  const [day, setDay] = useState(15);
  const [touched, setTouched] = useState(false);
  const err = touched && !t.trim() ? '名前を入れてください' : undefined;
  const save = () => {
    if (!t.trim()) { setTouched(true); return; }
    addDeadline({ t: t.trim(), mo, day, urgent: daysUntil(mo, day) <= 21 });
    haptic.success();
    close();
    toast('締切を追加しました', `あと${daysUntil(mo, day)}日`);
  };
  return (
    <View style={{ gap: 18 }}>
      <Txt size={18} w="700">締切を追加</Txt>
      <Field label="名前（例：英検 申込）" value={t} onChangeText={setT} max={24} error={err} onBlur={() => setTouched(true)} autoFocus />
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ flex: 1 }}>
          <Label>月</Label>
          <Stepper value={mo} min={1} max={12} onChange={setMo} unit="月" label="月" />
        </View>
        <View style={{ flex: 1 }}>
          <Label>日</Label>
          <Stepper value={day} min={1} max={31} onChange={setDay} unit="日" label="日" />
        </View>
      </View>
      <Txt size={13} tone="ink2">{`今日から あと${daysUntil(mo, day)}日`}</Txt>
      <Btn kind="primary" wide label="追加する" onPress={save} />
    </View>
  );
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
