import { useState } from 'react';
import { Keyboard, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { SUBJECT_COLORS } from '../data';
import { dateKey, mondayIndex, parseKey } from '../lib/time';
import { pickPlanIcon } from '../lib/planIcon';
import { Block, toClock, toMin } from '../lib/timetable';
import { addDeadline, addSubject, removeBlock, saveBlock, updateSubject, useSubjects } from '../store';
import { font, hair, noOutline, useT } from '../theme';
import { haptic, Press, Txt } from './base';
import { DatePick, Opens, PickChip, SMOOTH, TimePick } from './DateTime';
import { Icon } from './Icon';
import { PlanArt } from './PlanArt';
import { openSheet } from './Sheet';
import { toast } from './Toast';

// Adding to the timetable, or a deadline (each its own sheet), laid out like a
// calendar's new event: ✕, what you're adding, and ✓ along the top; the title; the start and the end (each
// a day and a time — the end can be the next day), and repeat; then the
// subject with its color (for the charts), and a memo. A plan has an icon,
// shown big on its card in the timer: a photo (the pencil opens the library),
// or the subject's color and initial. Days and times are
// picked as on an iPhone, opening right under their row; the keyboard waits
// until you tap a field.

const DOW = ['月', '火', '水', '木', '金', '土', '日'];
const day0 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const shortDate = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日（${DOW[mondayIndex(d)]}）`;
const DEADLINE_RED = '#FF3B30';

type Kind = 'plan' | 'deadline';
export function planSheet(o: { date?: Date; existing?: Block; kind?: Kind } = {}) {
  openSheet((close) => <Editor close={close} date={o.date} existing={o.existing} kind={o.kind ?? 'plan'} />, { grouped: true });
}
/** The timetable's 追加: a new plan for today (the day can be changed in the sheet). */
export const planCalendar = () => planSheet({ date: new Date() });

type Open = 'date' | 'start' | 'endDate' | 'end' | 'color' | 'new' | null;
const DAY = 24 * 60;

function Editor({ close, date, existing, kind: kind0 }: { close: () => void; date?: Date; existing?: Block; kind: Kind }) {
  const t = useT();
  const subjects = useSubjects();
  const today = day0(new Date());
  const kind: Kind = existing ? 'plan' : kind0;
  const [title, setTitle] = useState(existing?.t ?? '');
  const [d, setD] = useState(() => (existing?.date ? parseKey(existing.date) : day0(date ?? new Date())));
  const nextHour = Math.min(22, new Date().getHours() + 1) * 60;
  const [start, setStart] = useState(existing?.start ? toMin(existing.start) : nextHour);
  // the end, in minutes from the start day's midnight: past 24:00 is the next day
  const [end, setEnd] = useState(() => (existing?.start ? toMin(existing.start) + (existing.min || 60) : nextHour + 60));
  const [weekly, setWeekly] = useState(!!existing && !existing.date);
  const known = existing ? subjects.find((x) => x.id === existing.s) : undefined;
  const [name, setName] = useState(known?.name ?? '');
  const [color, setColor] = useState(known?.c ?? SUBJECT_COLORS[0]);
  const [note, setNote] = useState(existing?.note ?? '');
  const [icon, setIcon] = useState(existing?.icon);
  const [open, setOpen] = useState<Open>(null);

  const plan = kind === 'plan';
  const match = subjects.find((x) => x.name === name.trim());
  const accent = plan ? color : DEADLINE_RED;
  const toggle = (k: Open) => { haptic.tap(); if (k !== 'new') Keyboard.dismiss(); setOpen(open === k ? null : k); };
  // typing closes whatever picker is open, as in Calendar
  const typing = () => { if (open && open !== 'new') setOpen(null); };
  const endDay = new Date(d.getFullYear(), d.getMonth(), d.getDate() + Math.floor(end / DAY));
  const nextDay = end >= DAY;
  // moving the start keeps the length; an end before the start goes to the next day
  const moveStart = (m: number) => { setEnd(m + (end - start)); setStart(m); };
  const moveEnd = (m: number, offset = Math.floor(end / DAY)) => { let e = offset * DAY + m; if (e <= start) e += DAY; setEnd(Math.min(start + DAY, e)); };
  const choose = async () => {
    Keyboard.dismiss();
    setOpen(null);
    const got = await pickPlanIcon().catch(() => null);
    if (got) { haptic.soft(); setIcon(got); }
  };
  const typeName = (v: string) => { setName(v); const m = subjects.find((x) => x.name === v.trim()); if (m) setColor(m.c); };

  const save = () => {
    if (!title.trim()) { haptic.warn(); toast(plan ? '何をやるかを入れてください' : '締切の名前を入れてください'); return; }
    if (!plan) {
      const days = Math.round((day0(d).getTime() - day0(new Date()).getTime()) / 86_400_000);
      addDeadline({ t: title.trim(), mo: d.getMonth() + 1, day: d.getDate(), urgent: days <= 21, note: note.trim() || undefined });
      haptic.success();
      close();
      toast('締切を追加しました', `${shortDate(d)} · あと${days}日`);
      return;
    }
    if (!name.trim()) { haptic.warn(); toast('科目を入れてください', '記録とグラフは科目ごとに分かれます'); return; }
    // the subject: one you have (its color follows what you picked), or a new one
    let s = match?.id;
    if (match && match.c !== color) updateSubject(match.id, { c: color });
    if (!s) s = addSubject({ name: name.trim(), area: 'other', c: color });
    saveBlock({
      id: existing?.id, s, t: title.trim(), note: note.trim() || undefined, icon,
      start: toClock(start), min: end - start,
      days: weekly ? (existing && !existing.date ? existing.days : [mondayIndex(d)]) : [], date: weekly ? undefined : dateKey(d),
    });
    haptic.success();
    close();
    toast(existing ? '予定を保存しました' : '予定を追加しました', `${weekly ? `毎週${DOW[mondayIndex(d)]}曜` : shortDate(d)} ${toClock(start)}〜${nextDay ? '翌' : ''}${toClock(end % DAY)} · ${name.trim()}`);
  };

  return (
    <View style={{ gap: 14, paddingTop: 2 }}>
      {/* ✕, what you're adding, ✓ */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Press onPress={close} scale={0.9} hitSlop={6} accessibilityLabel="閉じる"
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={17} color={t.ink} />
        </Press>
        <Txt size={17} w="700" style={{ flex: 1, textAlign: 'center' }} accessibilityRole="header">{plan ? (existing ? '予定を編集' : '予定を追加') : '締切を追加'}</Txt>
        <Press onPress={save} scale={0.9} hitSlop={6} accessibilityLabel={existing ? '保存する' : '追加する'}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={18} color="#fff" />
        </Press>
      </View>

      {/* the title and the when, with the subject's color down the side */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ width: 4, borderRadius: 2, backgroundColor: accent }} />
        <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
          <Group>
            <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 40))} placeholder={plan ? '何をやる？（例：青チャート 例題41〜50）' : '締切の名前（例：英検 申込）'}
              placeholderTextColor={t.ink3} multiline onFocus={typing} accessibilityLabel={plan ? '何をやるか' : '締切の名前'}
              style={[{ minHeight: 64, margin: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: t.sunken, fontSize: 21, lineHeight: 28, fontFamily: font.text, fontWeight: '700', color: t.ink, textAlignVertical: 'top' }, noOutline]} />
            {plan ? (
              // the icon: the pencil on it opens the photo library
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingBottom: 12 }}>
                <Press onPress={choose} scale={0.94} accessibilityLabel={icon ? 'アイコンの写真を選び直す' : 'アイコンにする写真を選ぶ'}>
                  <PlanArt icon={icon} name={name.trim() || '？'} color={color} size={60} radius={12} />
                  <View style={{ position: 'absolute', right: -6, top: -6, width: 26, height: 26, borderRadius: 13, backgroundColor: t.ink, borderWidth: 2, borderColor: t.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="edit" size={12} color={t.onInk} />
                  </View>
                </Press>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt size={15} w="600">アイコン</Txt>
                  <Txt size={12} tone="ink3">{icon ? 'タイマーのカードに大きく出ます' : '鉛筆で写真から選べます。選ばないときは科目の色と頭文字'}</Txt>
                </View>
                {icon ? (
                  <Press onPress={() => { haptic.tap(); setIcon(undefined); }} hitSlop={8} scale={0.94} accessibilityLabel="アイコンの写真を外す">
                    <Txt size={13.5} w="600" color={t.blue}>外す</Txt>
                  </Press>
                ) : null}
              </View>
            ) : null}
          </Group>
          <Group>
            {plan ? (
              <>
                <Row label="開始" first>
                  <PickChip on={open === 'date'} onPress={() => toggle('date')} label={shortDate(d)} a11y="始める日を変える" />
                  <PickChip on={open === 'start'} onPress={() => toggle('start')} label={toClock(start)} a11y="始める時刻を変える" />
                </Row>
                {open === 'date' ? <Opens><DatePick value={d} min={today} onChange={(x) => setD(day0(x))} onDone={() => setOpen(null)} /></Opens> : null}
                {open === 'start' ? <Opens><TimePick value={start} onChange={moveStart} onDone={() => setOpen(null)} /></Opens> : null}
                <Row label="終了">
                  <PickChip on={open === 'endDate'} onPress={() => toggle('endDate')} label={shortDate(endDay)} a11y={`終わる日を変える${nextDay ? '（翌日）' : ''}`} />
                  <PickChip on={open === 'end'} onPress={() => toggle('end')} label={toClock(end % DAY)} a11y="終わる時刻を変える" />
                </Row>
                {open === 'endDate' ? (
                  <Opens>
                    <DatePick value={endDay} min={d} max={new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)} onDone={() => setOpen(null)}
                      onChange={(x) => moveEnd(end % DAY, Math.round((day0(x).getTime() - d.getTime()) / 86_400_000))} />
                  </Opens>
                ) : null}
                {open === 'end' ? <Opens><TimePick value={end % DAY} onChange={(m) => moveEnd(m)} onDone={() => setOpen(null)} /></Opens> : null}
                <Row label="繰り返し" icon="cal">
                  <Press onPress={() => { haptic.tap(); setWeekly(!weekly); }} hitSlop={8} accessibilityLabel={`繰り返し：${weekly ? '毎週' : 'しない'}。変える`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Txt size={15} tone="ink2">{weekly ? `毎週${DOW[mondayIndex(d)]}曜` : 'しない'}</Txt>
                    <Icon name="chev" size={11} color={t.ink3} />
                  </Press>
                </Row>
              </>
            ) : (
              <>
                <Row label="日付" first>
                  <PickChip on={open === 'date'} onPress={() => toggle('date')} label={shortDate(d)} a11y="日付を変える" />
                </Row>
                {open === 'date' ? <Opens><DatePick value={d} min={today} onChange={(x) => setD(day0(x))} onDone={() => setOpen(null)} /></Opens> : null}
              </>
            )}
          </Group>
        </View>
      </View>

      {plan ? (
        <Section title="科目">
          <Group>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 10, minHeight: 64 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <TextInput value={name} onChangeText={(v) => typeName(v.slice(0, 12))} placeholder="科目（例：数学）" placeholderTextColor={t.ink3} onFocus={typing} accessibilityLabel="科目"
                  style={[{ fontSize: 16, fontFamily: font.text, fontWeight: '600', color: t.ink, paddingVertical: 8 }, noOutline]} />
                <Txt size={12} tone="ink3">{name.trim() ? (match ? 'いまの科目' : '新しい科目として足します') : '色はグラフでその科目の色になります'}</Txt>
              </View>
              <Press onPress={() => toggle('color')} scale={0.92} accessibilityLabel="科目の色を選ぶ"
                style={{ width: 52, height: 44, borderRadius: 12, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="edit" size={15} color="#fff" />
              </Press>
            </View>
            {open === 'color' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 12 }}>
                {SUBJECT_COLORS.map((c) => (
                  <Press key={c} onPress={() => { haptic.tap(); setColor(c); }} scale={0.88} accessibilityRole="radio" accessibilityState={{ checked: c === color }} accessibilityLabel={`色 ${c}`}
                    style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c, borderWidth: c === color ? 3 : 0, borderColor: t.surface, boxShadow: c === color ? `0px 0px 0px 2px ${c}` : undefined }} />
                ))}
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: hair, borderTopColor: t.line }}>
              {subjects.map((x) => (
                <Press key={x.id} onPress={() => { haptic.tap(); setName(x.name); setColor(x.c); }} scale={0.94} accessibilityLabel={`${x.name}にする`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: match?.id === x.id ? t.sunken : 'transparent', borderWidth: hair, borderColor: t.line2 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: x.c }} />
                  <Txt size={12.5} w="600" tone="ink2">{x.name}</Txt>
                </Press>
              ))}
              {/* a new subject, right here: its name and color */}
              <Press onPress={() => toggle('new')} scale={0.94} accessibilityLabel="科目を足す" accessibilityState={{ expanded: open === 'new' }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: open === 'new' ? t.blueSoft : 'transparent', borderWidth: hair, borderColor: open === 'new' ? t.blue : t.line2, borderStyle: 'dashed' }}>
                <Icon name="plus" size={11} color={t.blue} />
                <Txt size={12.5} w="600" color={t.blue}>科目を足す</Txt>
              </Press>
            </View>
            {open === 'new' ? <Opens><NewSubject onAdd={(x) => { setName(x.name); setColor(x.c); setOpen(null); }} /></Opens> : null}
          </Group>
        </Section>
      ) : null}

      <Section title="メモ">
        <Group>
          <TextInput value={note} onChangeText={(v) => setNote(v.slice(0, 200))} placeholder={plan ? '持ち物、気をつけること、前回の続きなど' : '受付の時間、持ち物など'} placeholderTextColor={t.ink3}
            multiline onFocus={typing} accessibilityLabel="メモ" style={[{ minHeight: 80, padding: 14, fontSize: 15, lineHeight: 22, fontFamily: font.text, color: t.ink, textAlignVertical: 'top' }, noOutline]} />
        </Group>
      </Section>

      {existing ? (
        <Group>
          <Press onPress={() => { removeBlock(existing.id); haptic.warn(); close(); toast('予定を削除しました'); }} accessibilityLabel="この予定を削除"
            style={{ height: 50, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={15} w="600" color={DEADLINE_RED}>予定を削除</Txt>
          </Press>
        </Group>
      ) : null}
    </View>
  );
}

/** Adds a subject (name and color) on the spot, and hands it back to put on the plan. */
function NewSubject({ onAdd }: { onAdd: (x: { name: string; c: string }) => void }) {
  const t = useT();
  const subjects = useSubjects();
  const used = new Set(subjects.map((x) => x.c));
  const [name, setName] = useState('');
  const [c, setC] = useState(() => SUBJECT_COLORS.find((x) => !used.has(x)) ?? SUBJECT_COLORS[0]);
  const add = () => {
    const n = name.trim();
    if (!n) { haptic.warn(); toast('科目の名前を入れてください'); return; }
    const same = subjects.find((x) => x.name === n);
    if (same) { haptic.tap(); toast(`「${n}」はもうあります`, 'その科目にしました'); onAdd({ name: same.name, c: same.c }); return; }
    addSubject({ name: n, area: 'other', c });
    haptic.success();
    toast(`科目に「${n}」を足しました`, '設定 › 科目と色 から直せます');
    onAdd({ name: n, c });
  };
  return (
    <View style={{ alignSelf: 'stretch', padding: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c }} />
        <TextInput value={name} onChangeText={(v) => setName(v.slice(0, 12))} placeholder="新しい科目（例：日本史）" placeholderTextColor={t.ink3} accessibilityLabel="新しい科目の名前"
          onSubmitEditing={add} returnKeyType="done"
          style={[{ flex: 1, minWidth: 0, fontSize: 16, fontFamily: font.text, fontWeight: '600', color: t.ink, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: t.sunken }, noOutline]} />
        <Press onPress={add} scale={0.94} accessibilityLabel="この科目を足す"
          style={{ height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: t.blue, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={14} w="700" color="#fff">足す</Txt>
        </Press>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SUBJECT_COLORS.map((x) => (
          <Press key={x} onPress={() => { haptic.tap(); setC(x); }} scale={0.88} accessibilityRole="radio" accessibilityState={{ checked: x === c }} accessibilityLabel={`色 ${x}`}
            style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: x, borderWidth: x === c ? 3 : 0, borderColor: t.surface, boxShadow: x === c ? `0px 0px 0px 2px ${x}` : undefined }} />
        ))}
      </View>
    </View>
  );
}

/** A white rounded card on the sheet's gray. */
function Group({ children }: { children: React.ReactNode }) {
  const t = useT();
  return <Animated.View layout={SMOOTH} style={{ backgroundColor: t.surface, borderRadius: 18, overflow: 'hidden' }}>{children}</Animated.View>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Animated.View layout={SMOOTH} style={{ gap: 6 }}>
      <Txt size={13.5} w="600" tone="ink3" style={{ paddingLeft: 12 }}>{title}</Txt>
      {children}
    </Animated.View>
  );
}
/** A labeled line of a group: the label on the left, what it's set to on the right. */
function Row({ label, icon, first, children }: { label: string; icon?: 'clock' | 'cal'; first?: boolean; children: React.ReactNode }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingHorizontal: 14, borderTopWidth: first ? 0 : hair, borderTopColor: t.line }}>
      {icon ? <Icon name={icon} size={16} color={t.ink2} /> : null}
      <Txt size={15.5} style={{ flex: 1 }}>{label}</Txt>
      {children}
    </View>
  );
}
