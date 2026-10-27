import { useState } from 'react';
import { Keyboard, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AREAS, guessArea, OTHER_COLORS, shadeFor, subj } from '../data';
import { dateKey, mondayIndex, parseKey } from '../lib/time';
import { pickPlanIcon } from '../lib/planIcon';
import { Block, toClock, toMin } from '../lib/timetable';
import { addDeadline, addSubject, removeBlock, saveBlock, useSubjects } from '../store';
import { font, hair, noOutline, useT } from '../theme';
import { haptic, Press, SubjTile, Txt } from './base';
import { DatePick, Opens, PickChip, SMOOTH, TimePick } from './DateTime';
import { Icon } from './Icon';
import { PlanArt } from './PlanArt';
import { openSheet } from './Sheet';
import { toast } from './Toast';

// Adding to the timetable, or a deadline (each its own sheet): やめる, what this
// is and 追加 along the top, then only what a plan needs — the icon and what to
// do side by side (the top of its card in the timer), the start time, a memo.
// The icon is the subject: tap it to pick one from the subjects' pictures (化学
// is a flask …) or make a new one; 足す picks a photo to stand in for the
// picture. The end is optional: left empty, the plan runs until the next one (a
// weekly one stays weekly). Things move with iOS's curve, never a bounce.
// Drawn the way iOS draws a new event, and kept low in contrast: やめる and 追加
// as blue text, small grey names over white groups, 日付 and 時刻 (start 〜 end)
// as Calendar's rows, in grey chips that open iOS's pickers.
// The keyboard waits for a tap.

const DOW = ['月', '火', '水', '木', '金', '土', '日'];
const day0 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const shortDate = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日（${DOW[mondayIndex(d)]}）`;
// the day in its chip, as compact as Calendar's
const chipDate = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日(${DOW[mondayIndex(d)]})`;
const DEADLINE_RED = '#FF3B30';

type Kind = 'plan' | 'deadline';
export function planSheet(o: { date?: Date; existing?: Block; kind?: Kind } = {}) {
  openSheet((close) => <Editor close={close} date={o.date} existing={o.existing} kind={o.kind ?? 'plan'} />, { grouped: true, center: true, corner: 12 });
}
/** The timetable's 追加: a new plan for today (the day can be changed in the sheet). */
export const planCalendar = () => planSheet({ date: new Date() });

type Open = 'date' | 'start' | 'end' | 'subject' | 'new' | null;
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
  // the end is optional: a length in minutes, 0 for none (the plan then runs until the next one starts).
  // Moving the start keeps the length, as in Calendar.
  const [len, setLen] = useState(existing?.min ?? 0);
  const end = start + len;
  // the end picked on its wheel, after the start (past midnight: the next day)
  const setEnd = (m: number) => setLen(((m - start + DAY) % DAY) || DAY);
  // a weekly plan stays weekly; a new one is for its day (repeat is set from the timetable's …)
  const weekly = !!existing && !existing.date;
  const known = existing ? subjects.find((x) => x.id === existing.s) : undefined;
  const [name, setName] = useState(known?.name ?? '');
  const [color, setColor] = useState(known?.c ?? OTHER_COLORS[0]);
  const [note, setNote] = useState(existing?.note ?? '');
  const [icon, setIcon] = useState(existing?.icon);
  const [open, setOpen] = useState<Open>(null);

  const plan = kind === 'plan';
  const match = subjects.find((x) => x.name === name.trim());
  const toggle = (k: Open) => { haptic.tap(); if (k !== 'new') Keyboard.dismiss(); setOpen(open === k ? null : k); };
  // typing closes whatever picker is open, as in Calendar
  const typing = () => { if (open && open !== 'new') setOpen(null); };
  const nextDay = end >= DAY;
  const choose = async () => {
    Keyboard.dismiss();
    setOpen(null);
    const got = await pickPlanIcon().catch(() => null);
    if (got) { haptic.soft(); setIcon(got); }
  };

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
    if (!name.trim()) { haptic.warn(); setOpen('subject'); toast('アイコン（科目）を選んでください', '記録とグラフは科目ごとに分かれます'); return; }
    // the subject: one you have, or a new one
    let s = match?.id;
    // a new one goes in the 教科 its name points to, in that 教科's color (colors are fixed: data.ts)
    if (!s) s = addSubject({ name: name.trim(), area: guessArea(name), c: color });
    saveBlock({
      id: existing?.id, s, t: title.trim(), note: note.trim() || undefined, icon,
      start: toClock(start), min: len,
      days: weekly ? (existing && !existing.date ? existing.days : [mondayIndex(d)]) : [], date: weekly ? undefined : dateKey(d),
    });
    haptic.success();
    close();
    toast(existing ? '予定を保存しました' : '予定を追加しました', `${weekly ? `毎週${DOW[mondayIndex(d)]}曜` : shortDate(d)} ${toClock(start)}から${len ? `${nextDay ? '翌' : ''}${toClock(end % DAY)}まで` : ''} · ${name.trim()}`);
  };

  const lenLabel = len % 60 === 0 ? `${len / 60}時間` : len > 60 ? `${Math.floor(len / 60)}時間${len % 60}分` : `${len}分`;
  const daysLeft = Math.round((day0(d).getTime() - today.getTime()) / 86_400_000);
  const accent = plan ? t.blue : DEADLINE_RED;

  return (
    <View style={{ gap: 16, paddingTop: 2 }}>
      {/* やめる · what this is · 追加, as text buttons the way iOS lays a new event out */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 }}>
        <Press onPress={close} scale={0.94} hitSlop={8} accessibilityLabel="やめる" style={{ minWidth: 64 }}>
          <Txt size={16} color={accent}>やめる</Txt>
        </Press>
        <Txt size={16} w="600" accessibilityRole="header" style={{ flex: 1, textAlign: 'center' }}>{plan ? (existing ? '予定を編集' : '予定を追加') : '締切を追加'}</Txt>
        <Press onPress={save} scale={0.94} hitSlop={8} accessibilityLabel={existing ? '保存する' : '追加する'} style={{ minWidth: 64, alignItems: 'flex-end' }}>
          <Txt size={16} w="600" color={accent}>{existing ? '保存' : '追加'}</Txt>
        </Press>
      </View>

      {plan ? (
        <>
          {/* the icon (which is the subject) big on the left, what to do beside it — the top of a timer card */}
          <Field label="アイコン・やること">
            <Group>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12 }}>
                <Press onPress={() => toggle('subject')} scale={0.95} accessibilityLabel={name.trim() ? `アイコン（科目）：${name.trim()}。変える` : 'アイコン（科目）を選ぶ'} accessibilityState={{ expanded: open === 'subject' }}
                  style={{ alignItems: 'center', gap: 5 }}>
                  {name.trim() || icon ? (
                    <View style={{ borderRadius: 9, borderWidth: 2, borderColor: open === 'subject' ? t.blue : 'transparent', padding: 1 }}>
                      <PlanArt icon={icon} name={name.trim() || '？'} color={color} size={80} radius={7} />
                    </View>
                  ) : (
                    <View style={{ width: 84, height: 84, borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line2, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                      <Icon name="plus" size={18} color={t.ink2} />
                      <Txt size={11} tone="ink3">科目</Txt>
                    </View>
                  )}
                  <Txt size={11.5} tone={name.trim() ? 'ink2' : 'ink3'} numberOfLines={1} style={{ maxWidth: 84 }}>{name.trim() || 'アイコン'}</Txt>
                </Press>
                <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 40))} placeholder="青チャート 例題41〜50"
                  placeholderTextColor={t.ink3} multiline onFocus={typing} accessibilityLabel="何をやるか"
                  style={[{ flex: 1, minWidth: 0, minHeight: 84, paddingTop: 2, fontSize: 17, lineHeight: 24, fontFamily: font.text, fontWeight: '600', color: t.ink, textAlignVertical: 'top' }, noOutline]} />
              </View>
              {/* the subjects as the icons to pick; a photo can stand in for the picture */}
              {open === 'subject' ? (
                <Opens>
                  <View style={{ alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 }} accessibilityRole="radiogroup">
                    {subjects.map((x) => {
                      const on = match?.id === x.id;
                      return (
                        <Press key={x.id} onPress={() => { haptic.tap(); setName(x.name); setColor(x.c); setOpen(null); }} scale={0.92} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${x.name}にする`}
                          style={{ width: '25%', alignItems: 'center', gap: 4, paddingVertical: 6 }}>
                          <View style={{ padding: 2, borderRadius: 8, borderWidth: 2, borderColor: on ? t.blue : 'transparent' }}>
                            <SubjTile name={x.name} color={x.c} area={x.area} size={38} radius={5} />
                          </View>
                          <Txt size={11.5} w={on ? '600' : '400'} color={on ? t.blue : t.ink2} numberOfLines={1}>{x.name}</Txt>
                        </Press>
                      );
                    })}
                    {/* 足す: a photo of your own as the icon (the subject stays what it is) */}
                    <Press onPress={choose} scale={0.92} accessibilityLabel={icon ? 'アイコンの写真を選び直す' : 'アイコンにする写真を選ぶ'} accessibilityState={{ checked: !!icon }}
                      style={{ width: '25%', alignItems: 'center', gap: 4, paddingVertical: 6 }}>
                      <View style={{ padding: 2, borderRadius: 8, borderWidth: 2, borderColor: icon ? t.blue : 'transparent' }}>
                        {icon ? <PlanArt icon={icon} name={name.trim() || '？'} color={color} size={38} radius={5} /> : (
                          <View style={{ width: 38, height: 38, borderRadius: 5, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line2, alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="plus" size={15} color={t.ink2} />
                          </View>
                        )}
                      </View>
                      <Txt size={11.5} w={icon ? '600' : '400'} color={icon ? t.blue : t.ink2}>{icon ? '写真' : '足す'}</Txt>
                    </Press>
                  </View>
                  <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: hair, borderTopColor: t.line }}>
                    <Press onPress={() => toggle('new')} hitSlop={8} scale={0.94} accessibilityLabel="科目を足す" style={{ flex: 1, height: 30, justifyContent: 'center' }}>
                      <Txt size={13} w="500" color={t.blue}>新しい科目をつくる</Txt>
                    </Press>
                    {icon ? (
                      <Press onPress={() => { haptic.tap(); setIcon(undefined); }} hitSlop={8} scale={0.94} accessibilityLabel="アイコンの写真を外す"
                        style={{ height: 30, paddingHorizontal: 12, borderRadius: 6, backgroundColor: t.sunken, justifyContent: 'center' }}>
                        <Txt size={13} w="500" color={t.ink2}>写真を外す</Txt>
                      </Press>
                    ) : null}
                  </View>
                </Opens>
              ) : null}
              {open === 'new' ? <Opens><NewSubject onAdd={(x) => { setName(x.name); setColor(x.c); setOpen(null); }} /></Opens> : null}
            </Group>
          </Field>

          {/* 日付, then 時刻 with the start and the end side by side, as grey chips that open iOS's pickers under their row; the end can stay empty */}
          <Field>
            <Group>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 10, minHeight: 52 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt size={16}>日付</Txt>
                  {weekly ? <Txt size={12} tone="ink3" numberOfLines={1}>{`毎週${DOW[mondayIndex(d)]}曜`}</Txt> : null}
                </View>
                <PickChip label={chipDate(d)} on={open === 'date'} onPress={() => toggle('date')} a11y="始める日を変える" />
              </View>
              {open === 'date' ? <Opens><DatePick value={d} min={today} onChange={(x) => setD(day0(x))} onDone={() => setOpen(null)} /></Opens> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16, paddingRight: 10, minHeight: 52, borderTopWidth: hair, borderTopColor: t.line }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt size={16}>時刻</Txt>
                  <Txt num size={12} tone="ink3" numberOfLines={1}>{len ? `${nextDay ? '翌日まで · ' : ''}${lenLabel}` : '終わりはなくてもOK'}</Txt>
                </View>
                <PickChip label={toClock(start)} on={open === 'start'} onPress={() => toggle('start')} a11y="始める時刻を変える" />
                <Txt size={15} tone="ink3">〜</Txt>
                <PickChip label={len ? toClock(end % DAY) : 'なし'} on={open === 'end'} a11y={len ? '終わる時刻を変える' : '終わる時刻を入れる'}
                  onPress={() => { if (!len) setLen(60); toggle('end'); }} />
                {len ? (
                  <Press onPress={() => { haptic.tap(); setLen(0); if (open === 'end') setOpen(null); }} hitSlop={10} scale={0.9} accessibilityLabel="終わる時刻を消す"
                    style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="x" size={11} color={t.ink3} />
                  </Press>
                ) : null}
              </View>
              {open === 'start' ? <Opens><TimePick value={start} onChange={setStart} onDone={() => setOpen(null)} /></Opens> : null}
              {open === 'end' && len ? <Opens><TimePick value={end % DAY} onChange={setEnd} onDone={() => setOpen(null)} /></Opens> : null}
            </Group>
          </Field>
        </>
      ) : (
        <>
          <Field label="締切">
            <Group>
              <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 40))} placeholder="英検 申込"
                placeholderTextColor={t.ink3} multiline onFocus={typing} accessibilityLabel="締切の名前"
                style={[{ minHeight: 56, paddingHorizontal: 16, paddingTop: 15, paddingBottom: 12, fontSize: 17, lineHeight: 24, fontFamily: font.text, fontWeight: '600', color: t.ink, textAlignVertical: 'top' }, noOutline]} />
            </Group>
          </Field>
          <Field>
            <Group>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 10, minHeight: 56 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt size={16}>締切日</Txt>
                  <Txt num size={12} color={daysLeft <= 3 ? DEADLINE_RED : t.ink3}>{daysLeft <= 0 ? '今日' : `あと${daysLeft}日`}</Txt>
                </View>
                <PickChip label={chipDate(d)} on={open === 'date'} onPress={() => toggle('date')} a11y="日付を変える" />
              </View>
              {open === 'date' ? <Opens><DatePick value={d} min={today} onChange={(x) => setD(day0(x))} onDone={() => setOpen(null)} /></Opens> : null}
            </Group>
          </Field>
        </>
      )}

      <Field label="メモ">
        <Group>
          <TextInput value={note} onChangeText={(v) => setNote(v.slice(0, 200))} placeholder={plan ? '持ち物、気をつけること、前回の続きなど' : '受付の時間、持ち物など'} placeholderTextColor={t.ink3}
            multiline onFocus={typing} accessibilityLabel="メモ" style={[{ minHeight: 76, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, lineHeight: 22, fontFamily: font.text, color: t.ink, textAlignVertical: 'top' }, noOutline]} />
          <Txt num size={11} tone="ink3" style={{ textAlign: 'right', paddingHorizontal: 12, paddingBottom: 8 }}>{`${note.length}/200`}</Txt>
        </Group>
      </Field>

      {existing ? (
        <Group>
          <Press onPress={() => { removeBlock(existing.id); haptic.warn(); close(); toast('予定を削除しました'); }} accessibilityLabel="この予定を削除"
            style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={16} color={DEADLINE_RED}>予定を削除</Txt>
          </Press>
        </Group>
      ) : null}
    </View>
  );
}

/** Adds a subject on the spot, and hands it back to put on the plan. Its 教科 comes from its name (日本史 → 社会) and with it its fixed color; only one in その他 has a color to pick. */
function NewSubject({ onAdd }: { onAdd: (x: { name: string; c: string }) => void }) {
  const t = useT();
  const subjects = useSubjects();
  const [name, setName] = useState('');
  const area = guessArea(name);
  const [mine, setMine] = useState(() => shadeFor('other', subjects));
  const c = area === 'other' ? mine : shadeFor(area, subjects);
  const add = () => {
    const n = name.trim();
    if (!n) { haptic.warn(); toast('科目の名前を入れてください'); return; }
    const same = subjects.find((x) => x.name === n);
    if (same) { haptic.tap(); toast(`「${n}」はもうあります`, 'その科目にしました'); onAdd({ name: same.name, c: same.c }); return; }
    const id = addSubject({ name: n, area, c });
    haptic.success();
    toast(`科目に「${n}」を足しました`, `${AREAS.find((a) => a.id === area)!.name}の色 · 設定 › 科目と色 から直せます`);
    onAdd({ name: n, c: subj(id).c });
  };
  return (
    <View style={{ alignSelf: 'stretch', padding: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: c }} />
        <TextInput value={name} onChangeText={(v) => setName(v.slice(0, 12))} placeholder="新しい科目（例：日本史）" placeholderTextColor={t.ink3} accessibilityLabel="新しい科目の名前"
          onSubmitEditing={add} returnKeyType="done"
          style={[{ flex: 1, minWidth: 0, fontSize: 16, fontFamily: font.text, color: t.ink, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: t.sunken }, noOutline]} />
        <Press onPress={add} scale={0.94} accessibilityLabel="この科目を足す"
          style={{ height: 38, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={16} w="600" color={t.blue}>足す</Txt>
        </Press>
      </View>
      {area === 'other' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {OTHER_COLORS.map((x) => (
            <Press key={x} onPress={() => { haptic.tap(); setMine(x); }} scale={0.88} accessibilityRole="radio" accessibilityState={{ checked: x === c }} accessibilityLabel={`色 ${x}`}
              style={{ width: 26, height: 26, borderRadius: 5, backgroundColor: x, borderWidth: x === c ? 3 : 0, borderColor: t.surface, boxShadow: x === c ? `0px 0px 0px 2px ${x}` : undefined }} />
          ))}
        </View>
      ) : (
        <Txt size={12} tone="ink3">{`${AREAS.find((a) => a.id === area)!.name}の科目として、${AREAS.find((a) => a.id === area)!.name}の色になります`}</Txt>
      )}
    </View>
  );
}

/** A card on the frosted pane: near-white, square-ish, a hairline edge, no shadow. */
function Group({ children }: { children: React.ReactNode }) {
  const t = useT();
  return (
    <Animated.View layout={SMOOTH} style={{ backgroundColor: t.dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)', borderRadius: 10, overflow: 'hidden' }}>
      {children}
    </Animated.View>
  );
}
/** A part of the form: its name (if the row doesn't say it), small and grey as over a group in iOS's Settings, then its card. */
function Field({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <Animated.View layout={SMOOTH} style={{ gap: 6 }}>
      {label ? <Txt size={13} tone="ink3" style={{ paddingLeft: 16 }}>{label}</Txt> : null}
      {children}
    </Animated.View>
  );
}
