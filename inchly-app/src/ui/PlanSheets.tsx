import { useState } from 'react';
import { Keyboard, Platform, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { SUBJECT_COLORS } from '../data';
import { dateKey, mondayIndex, parseKey } from '../lib/time';
import { pickPlanIcon } from '../lib/planIcon';
import { Block, toClock, toMin } from '../lib/timetable';
import { addDeadline, addSubject, removeBlock, saveBlock, updateSubject, useSubjects } from '../store';
import { bundledFace, font, hair, noOutline, useT } from '../theme';
import { haptic, Press, SubjTile, Txt } from './base';
import { DatePick, Opens, SMOOTH, TimePick } from './DateTime';
import { Icon } from './Icon';
import { PlanArt } from './PlanArt';
import { openSheet } from './Sheet';
import { toast } from './Toast';

// Adding to the timetable, or a deadline (each its own sheet), in the order of
// a calendar's new event — やめる, what this is and 追加 along the top; the
// task; when (start → end, the end can be the next day, and repeat); the
// subject with its color (for the charts); a memo — drawn crisp and quiet:
// near-white, square-cornered cards on the frosted pane, small mono labels (TASK, WHEN …), the
// times big in mono with the length between them, the subjects as tiles with
// their pictures. A plan has an icon, shown big on its card in the timer: a
// photo, or the subject's picture. Days and times are picked as on an iPhone,
// opening right under their row; the keyboard waits until you tap a field.

const DOW = ['月', '火', '水', '木', '金', '土', '日'];
const day0 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const shortDate = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日（${DOW[mondayIndex(d)]}）`;
const DEADLINE_RED = '#FF3B30';
// the labels' and the times' face: the bundled mono (Plex) once loaded, the system's until then
const MONO_FALLBACK = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, monospace' });
const mono = () => bundledFace('plex') ?? MONO_FALLBACK;

type Kind = 'plan' | 'deadline';
export function planSheet(o: { date?: Date; existing?: Block; kind?: Kind } = {}) {
  openSheet((close) => <Editor close={close} date={o.date} existing={o.existing} kind={o.kind ?? 'plan'} />, { grouped: true, center: true, corner: 12 });
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

  const len = end - start;
  const lenLabel = len % 60 === 0 ? `${len / 60}時間` : len > 60 ? `${Math.floor(len / 60)}時間${len % 60}分` : `${len}分`;
  const daysLeft = Math.round((day0(d).getTime() - today.getTime()) / 86_400_000);
  const accent = plan ? t.ink : DEADLINE_RED;

  return (
    <View style={{ gap: 16, paddingTop: 2 }}>
      {/* やめる · what this is · 追加 (a solid pill) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 }}>
        <Press onPress={close} scale={0.94} hitSlop={8} accessibilityLabel="やめる" style={{ minWidth: 64 }}>
          <Txt size={15} w="500" tone="ink2">やめる</Txt>
        </Press>
        <View style={{ flex: 1, alignItems: 'center', gap: 1 }}>
          <Txt size={10} w="600" tone="ink3" style={{ fontFamily: mono(), letterSpacing: 1.6 }}>{plan ? (existing ? 'EDIT PLAN' : 'NEW PLAN') : 'DEADLINE'}</Txt>
          <Txt size={16} w="800" accessibilityRole="header" style={{ letterSpacing: -0.2 }}>{plan ? (existing ? '予定を編集' : '予定を追加') : '締切を追加'}</Txt>
        </View>
        <Press onPress={save} scale={0.94} hitSlop={6} accessibilityLabel={existing ? '保存する' : '追加する'}
          style={{ minWidth: 64, height: 32, paddingHorizontal: 16, borderRadius: 6, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={14} w="800" color={plan ? t.onInk : '#fff'}>{existing ? '保存' : '追加'}</Txt>
        </Press>
      </View>

      {/* the task, big, and (a plan) its icon */}
      <Field en="TASK" ja={plan ? 'やること' : '締切'}>
        <Group>
          <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 40))} placeholder={plan ? '青チャート 例題41〜50' : '英検 申込'}
            placeholderTextColor={t.ink3} multiline onFocus={typing} accessibilityLabel={plan ? '何をやるか' : '締切の名前'}
            style={[{ minHeight: 56, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, fontSize: 22, lineHeight: 29, fontFamily: font.display, fontWeight: '800', letterSpacing: -0.4, color: t.ink, textAlignVertical: 'top' }, noOutline]} />
          {plan ? (
            // the icon: tap it to pick a photo
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: hair, borderTopColor: t.line }}>
              <Press onPress={choose} scale={0.94} accessibilityLabel={icon ? 'アイコンの写真を選び直す' : 'アイコンにする写真を選ぶ'}>
                <PlanArt icon={icon} name={name.trim() || '？'} color={color} size={42} radius={6} />
              </Press>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={13.5} w="700">アイコン</Txt>
                <Txt size={11.5} tone="ink3" numberOfLines={1}>{icon ? 'タイマーのカードに大きく出ます' : '押すと写真から選べます。なければ科目の絵'}</Txt>
              </View>
              {icon ? (
                <Press onPress={() => { haptic.tap(); setIcon(undefined); }} hitSlop={8} scale={0.94} accessibilityLabel="アイコンの写真を外す"
                  style={{ height: 28, paddingHorizontal: 12, borderRadius: 4, borderWidth: hair, borderColor: t.line2, justifyContent: 'center' }}>
                  <Txt size={12} w="700" tone="ink2">外す</Txt>
                </Press>
              ) : (
                <Press onPress={choose} hitSlop={8} scale={0.94} accessibilityLabel="写真を選ぶ"
                  style={{ height: 28, paddingHorizontal: 12, borderRadius: 4, borderWidth: hair, borderColor: t.line2, justifyContent: 'center' }}>
                  <Txt size={12} w="700" tone="ink2">選ぶ</Txt>
                </Press>
              )}
            </View>
          ) : null}
        </Group>
      </Field>

      {/* when: start → end, big, with the length between; repeat under it */}
      <Field en="WHEN" ja="いつ">
        <Group>
          {plan ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>
                <Stamp tag="START" time={toClock(start)} day={shortDate(d)} timeOn={open === 'start'} dayOn={open === 'date'}
                  onTime={() => toggle('start')} onDay={() => toggle('date')} a11yTime="始める時刻を変える" a11yDay="始める日を変える" />
                <View style={{ flex: 0.8, alignItems: 'center', justifyContent: 'center', paddingTop: 12 }}>
                  <View style={{ alignSelf: 'stretch', height: hair * 1.5, backgroundColor: t.line2 }} />
                  <View style={{ position: 'absolute', top: 18, paddingHorizontal: 7, height: 20, borderRadius: 3, backgroundColor: t.ink, justifyContent: 'center' }}>
                    <Txt size={11} w="700" color={t.onInk} style={{ fontFamily: mono() }}>{lenLabel}</Txt>
                  </View>
                </View>
                <Stamp tag="END" right time={toClock(end % DAY)} day={`${nextDay ? '翌 ' : ''}${shortDate(endDay)}`} timeOn={open === 'end'} dayOn={open === 'endDate'}
                  onTime={() => toggle('end')} onDay={() => toggle('endDate')} a11yTime="終わる時刻を変える" a11yDay={`終わる日を変える${nextDay ? '（翌日）' : ''}`} />
              </View>
              {open === 'date' ? <Opens><DatePick value={d} min={today} onChange={(x) => setD(day0(x))} onDone={() => setOpen(null)} /></Opens> : null}
              {open === 'start' ? <Opens><TimePick value={start} onChange={moveStart} onDone={() => setOpen(null)} /></Opens> : null}
              {open === 'endDate' ? (
                <Opens>
                  <DatePick value={endDay} min={d} max={new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)} onDone={() => setOpen(null)}
                    onChange={(x) => moveEnd(end % DAY, Math.round((day0(x).getTime() - d.getTime()) / 86_400_000))} />
                </Opens>
              ) : null}
              {open === 'end' ? <Opens><TimePick value={end % DAY} onChange={(m) => moveEnd(m)} onDone={() => setOpen(null)} /></Opens> : null}
              {/* repeat: two choices side by side */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: hair, borderTopColor: t.line }}>
                <Txt size={13.5} w="600" style={{ flex: 1 }}>繰り返し</Txt>
                <View style={{ flexDirection: 'row', padding: 2, borderRadius: 6, backgroundColor: t.sunken }} accessibilityRole="radiogroup">
                  {[false, true].map((w) => (
                    <Press key={String(w)} onPress={() => { haptic.tap(); setWeekly(w); }} scale={0.96} accessibilityRole="radio" accessibilityState={{ checked: weekly === w }}
                      accessibilityLabel={w ? `毎週${DOW[mondayIndex(d)]}曜` : '繰り返さない'}
                      style={{ height: 28, paddingHorizontal: 12, borderRadius: 4, justifyContent: 'center', backgroundColor: weekly === w ? t.ink : 'transparent' }}>
                      <Txt size={12} w="700" color={weekly === w ? t.onInk : t.ink2}>{w ? `毎週${DOW[mondayIndex(d)]}曜` : 'この日だけ'}</Txt>
                    </Press>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <>
              <Press onPress={() => toggle('date')} scale={0.98} accessibilityLabel="日付を変える" accessibilityState={{ expanded: open === 'date' }}
                style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 14 }}>
                <View style={{ flex: 1 }}>
                  <Txt size={10} w="600" tone="ink3" style={{ fontFamily: mono(), letterSpacing: 1.4 }}>DATE</Txt>
                  <Txt size={26} w="800" color={open === 'date' ? DEADLINE_RED : t.ink} style={{ letterSpacing: -0.5 }}>{shortDate(d)}</Txt>
                </View>
                <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 3, backgroundColor: 'rgba(255,59,48,0.1)', justifyContent: 'center', marginBottom: 4 }}>
                  <Txt size={12} w="700" color={DEADLINE_RED} style={{ fontFamily: mono() }}>{daysLeft <= 0 ? '今日' : `あと${daysLeft}日`}</Txt>
                </View>
              </Press>
              {open === 'date' ? <Opens><DatePick value={d} min={today} onChange={(x) => setD(day0(x))} onDone={() => setOpen(null)} /></Opens> : null}
            </>
          )}
        </Group>
      </Field>

      {plan ? (
        <Field en="SUBJECT" ja="科目">
          <Group>
            {/* type one (a new one is added), or pick below; the color is the subject's */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 10, paddingVertical: 8 }}>
              <Icon name="search" size={15} color={t.ink3} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <TextInput value={name} onChangeText={(v) => typeName(v.slice(0, 12))} placeholder="科目を入力、または下から選ぶ" placeholderTextColor={t.ink3} onFocus={typing} accessibilityLabel="科目"
                  style={[{ fontSize: 15.5, fontFamily: font.text, fontWeight: '700', color: t.ink, paddingVertical: 6 }, noOutline]} />
                {name.trim() ? <Txt size={11} tone="ink3">{match ? 'いまの科目' : '新しい科目として足します'}</Txt> : null}
              </View>
              <Press onPress={() => toggle('color')} scale={0.92} accessibilityLabel="科目の色を選ぶ" accessibilityState={{ expanded: open === 'color' }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingLeft: 6, paddingRight: 10, borderRadius: 6, borderWidth: hair, borderColor: t.line2 }}>
                <View style={{ width: 18, height: 18, borderRadius: 3, backgroundColor: color }} />
                <Txt size={11.5} w="700" tone="ink2">色</Txt>
              </Press>
            </View>
            {open === 'color' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 12 }}>
                {SUBJECT_COLORS.map((c) => (
                  <Press key={c} onPress={() => { haptic.tap(); setColor(c); }} scale={0.88} accessibilityRole="radio" accessibilityState={{ checked: c === color }} accessibilityLabel={`色 ${c}`}
                    style={{ width: 28, height: 28, borderRadius: 5, backgroundColor: c, borderWidth: c === color ? 3 : 0, borderColor: t.surface, boxShadow: c === color ? `0px 0px 0px 2px ${c}` : undefined }} />
                ))}
              </View>
            ) : null}
            {/* the subjects as tiles, each with its picture */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 10, paddingBottom: 8, borderTopWidth: hair, borderTopColor: t.line }} accessibilityRole="radiogroup">
              {subjects.map((x) => {
                const on = match?.id === x.id;
                return (
                  <Press key={x.id} onPress={() => { haptic.tap(); setName(x.name); setColor(x.c); }} scale={0.92} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${x.name}にする`}
                    style={{ width: '25%', alignItems: 'center', gap: 4, paddingVertical: 6 }}>
                    <View style={{ padding: 2, borderRadius: 8, borderWidth: 2, borderColor: on ? t.ink : 'transparent' }}>
                      <SubjTile name={x.name} color={x.c} area={x.area} size={38} radius={5} />
                    </View>
                    <Txt size={11} w={on ? '800' : '600'} tone={on ? 'ink' : 'ink2'} numberOfLines={1}>{x.name}</Txt>
                  </Press>
                );
              })}
              {/* a new subject, right here: its name and color */}
              <Press onPress={() => toggle('new')} scale={0.92} accessibilityLabel="科目を足す" accessibilityState={{ expanded: open === 'new' }}
                style={{ width: '25%', alignItems: 'center', gap: 4, paddingVertical: 6 }}>
                <View style={{ padding: 2 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 5, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line2, alignItems: 'center', justifyContent: 'center', backgroundColor: open === 'new' ? t.sunken : 'transparent' }}>
                    <Icon name="plus" size={15} color={t.ink2} />
                  </View>
                </View>
                <Txt size={11} w="600" tone="ink2">足す</Txt>
              </Press>
            </View>
            {open === 'new' ? <Opens><NewSubject onAdd={(x) => { setName(x.name); setColor(x.c); setOpen(null); }} /></Opens> : null}
          </Group>
        </Field>
      ) : null}

      <Field en="NOTE" ja="メモ">
        <Group>
          <TextInput value={note} onChangeText={(v) => setNote(v.slice(0, 200))} placeholder={plan ? '持ち物、気をつけること、前回の続きなど' : '受付の時間、持ち物など'} placeholderTextColor={t.ink3}
            multiline onFocus={typing} accessibilityLabel="メモ" style={[{ minHeight: 76, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, lineHeight: 22, fontFamily: font.text, color: t.ink, textAlignVertical: 'top' }, noOutline]} />
          <Txt size={10} tone="ink3" style={{ fontFamily: mono(), textAlign: 'right', paddingHorizontal: 12, paddingBottom: 8 }}>{`${note.length}/200`}</Txt>
        </Group>
      </Field>

      {existing ? (
        <Press onPress={() => { removeBlock(existing.id); haptic.warn(); close(); toast('予定を削除しました'); }} accessibilityLabel="この予定を削除"
          style={{ height: 44, borderRadius: 6, borderWidth: hair, borderColor: 'rgba(255,59,48,0.35)', alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={14.5} w="700" color={DEADLINE_RED}>予定を削除</Txt>
        </Press>
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
        <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: c }} />
        <TextInput value={name} onChangeText={(v) => setName(v.slice(0, 12))} placeholder="新しい科目（例：日本史）" placeholderTextColor={t.ink3} accessibilityLabel="新しい科目の名前"
          onSubmitEditing={add} returnKeyType="done"
          style={[{ flex: 1, minWidth: 0, fontSize: 16, fontFamily: font.text, fontWeight: '600', color: t.ink, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 4, backgroundColor: t.sunken }, noOutline]} />
        <Press onPress={add} scale={0.94} accessibilityLabel="この科目を足す"
          style={{ height: 38, paddingHorizontal: 14, borderRadius: 6, backgroundColor: t.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={14} w="700" color={t.onInk}>足す</Txt>
        </Press>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SUBJECT_COLORS.map((x) => (
          <Press key={x} onPress={() => { haptic.tap(); setC(x); }} scale={0.88} accessibilityRole="radio" accessibilityState={{ checked: x === c }} accessibilityLabel={`色 ${x}`}
            style={{ width: 26, height: 26, borderRadius: 5, backgroundColor: x, borderWidth: x === c ? 3 : 0, borderColor: t.surface, boxShadow: x === c ? `0px 0px 0px 2px ${x}` : undefined }} />
        ))}
      </View>
    </View>
  );
}

/** A card on the frosted pane: near-white, square-ish, a hairline edge, no shadow. */
function Group({ children }: { children: React.ReactNode }) {
  const t = useT();
  return (
    <Animated.View layout={SMOOTH} style={{ backgroundColor: t.dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.84)', borderRadius: 8, overflow: 'hidden',
      borderWidth: hair, borderColor: t.dark ? 'rgba(255,255,255,0.12)' : 'rgba(11,13,14,0.11)' }}>
      {children}
    </Animated.View>
  );
}
/** A part of the form: a small mono label in English with its Japanese name, then its card. */
function Field({ en, ja, children }: { en: string; ja: string; children: React.ReactNode }) {
  return (
    <Animated.View layout={SMOOTH} style={{ gap: 7 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingLeft: 4 }}>
        <Txt size={10} w="600" tone="ink3" style={{ fontFamily: mono(), letterSpacing: 1.6 }}>{en}</Txt>
        <Txt size={12} w="700" tone="ink2">{ja}</Txt>
      </View>
      {children}
    </Animated.View>
  );
}
/** One end of a plan: its tag, the time big in mono, and the day under it — each tappable for its picker. */
function Stamp({ tag, time, day, timeOn, dayOn, onTime, onDay, a11yTime, a11yDay, right }: {
  tag: string; time: string; day: string; timeOn: boolean; dayOn: boolean; onTime: () => void; onDay: () => void; a11yTime: string; a11yDay: string; right?: boolean;
}) {
  const t = useT();
  return (
    <View style={{ flex: 1, alignItems: right ? 'flex-end' : 'flex-start', gap: 2 }}>
      <Txt size={10} w="600" tone="ink3" style={{ fontFamily: mono(), letterSpacing: 1.4 }}>{tag}</Txt>
      <Press onPress={() => { Keyboard.dismiss(); onTime(); }} scale={0.95} hitSlop={6} accessibilityLabel={a11yTime} accessibilityState={{ expanded: timeOn }}>
        <Txt num size={32} w="600" lh={38} color={timeOn ? t.blue : t.ink} style={{ fontFamily: mono(), letterSpacing: -1 }}>{time}</Txt>
      </Press>
      <Press onPress={() => { Keyboard.dismiss(); onDay(); }} scale={0.95} hitSlop={6} accessibilityLabel={a11yDay} accessibilityState={{ expanded: dayOn }}
        style={{ height: 22, paddingHorizontal: 7, borderRadius: 3, backgroundColor: dayOn ? 'rgba(47,107,255,0.12)' : t.sunken, justifyContent: 'center' }}>
        <Txt size={11.5} w="600" color={dayOn ? t.blue : t.ink2}>{day}</Txt>
      </Press>
    </View>
  );
}
