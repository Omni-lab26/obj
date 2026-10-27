import { useState } from 'react';
import { Keyboard, Platform, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { SUBJECT_COLORS } from '../data';
import { dateKey, mondayIndex, parseKey } from '../lib/time';
import { pickPlanIcon } from '../lib/planIcon';
import { Block, blocksOn, toClock, toMin } from '../lib/timetable';
import { addDeadline, addSubject, removeBlock, saveBlock, updateSubject, useStore, useSubjects } from '../store';
import { bundledFace, font, hair, noOutline, useT } from '../theme';
import { haptic, Press, SubjTile, Txt } from './base';
import { DatePick, Opens, SMOOTH, TimePick } from './DateTime';
import { Icon } from './Icon';
import { PlanArt } from './PlanArt';
import { openSheet } from './Sheet';
import { toast } from './Toast';

// Adding to the timetable, or a deadline (each its own sheet): やめる, what this
// is and 追加 along the top, then only what a plan needs — the icon and what to
// do side by side (the top of its card in the timer), the start time, a memo.
// The icon is the subject: tap it to pick one from the subjects' pictures (化学
// is a flask …) or add one; a photo can stand in for the picture. The start is
// big in mono with one-tap picks under it (いまから, 次の空き …); a plan runs 60
// minutes (an edited one keeps its length, and a weekly one stays weekly).
// Drawn crisp and quiet: square-cornered groups on the frosted pane, small mono
// labels (TASK, START …). The keyboard waits until you tap a field.

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

type Open = 'date' | 'start' | 'subject' | 'new' | null;
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
  // only the start is set here: a plan runs an hour (or as long as it did), and the timer can go on past it
  const len = existing?.min || 60;
  const end = start + len;
  // a weekly plan stays weekly; a new one is for its day (repeat is set from the timetable's …)
  const weekly = !!existing && !existing.date;
  const blocks = useStore((x) => x.timetable);
  const known = existing ? subjects.find((x) => x.id === existing.s) : undefined;
  const [name, setName] = useState(known?.name ?? '');
  const [color, setColor] = useState(known?.c ?? SUBJECT_COLORS[0]);
  const [note, setNote] = useState(existing?.note ?? '');
  const [icon, setIcon] = useState(existing?.icon);
  const [open, setOpen] = useState<Open>(null);
  const [picked, setPicked] = useState<string>();

  const plan = kind === 'plan';
  const match = subjects.find((x) => x.name === name.trim());
  const toggle = (k: Open) => { haptic.tap(); if (k !== 'new') Keyboard.dismiss(); setOpen(open === k ? null : k); };
  // typing closes whatever picker is open, as in Calendar
  const typing = () => { if (open && open !== 'new') setOpen(null); };
  const nextDay = end >= DAY;
  // starting times to pick with one tap: from now on (today), or the usual times (another day), and the first gap that fits
  const nowMin = Math.ceil((new Date().getHours() * 60 + new Date().getMinutes()) / 5) * 5;
  const isToday = d.getTime() === today.getTime();
  const firstFree = (from: number) => {
    const taken = blocksOn(blocks, d).filter((b) => b.start && b.id !== existing?.id).map((b) => [toMin(b.start!), toMin(b.start!) + (b.min || 60)] as const).sort((a, b) => a[0] - b[0]);
    let at = from;
    for (const [a, b] of taken) { if (at + len <= a) break; if (at < b) at = b; }
    return at;
  };
  const picks = (isToday
    ? [{ label: 'いまから', m: nowMin }, { label: '30分後', m: nowMin + 30 }, { label: '1時間後', m: nowMin + 60 }, { label: '次の空き', m: firstFree(nowMin) }]
    : [{ label: '朝', m: 7 * 60 }, { label: '夕方', m: 17 * 60 }, { label: '夜', m: 20 * 60 }, { label: '次の空き', m: firstFree(9 * 60) }]
  ).filter((x) => x.m < DAY);
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
    toast(existing ? '予定を保存しました' : '予定を追加しました', `${weekly ? `毎週${DOW[mondayIndex(d)]}曜` : shortDate(d)} ${toClock(start)}から${nextDay ? '（翌日まで）' : ''} · ${name.trim()}`);
  };

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

      {plan ? (
        <>
          {/* the icon (which is the subject) big on the left, what to do beside it — the top of a timer card */}
          <Field en="TASK" ja="アイコン・やること">
            <Group>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12 }}>
                <Press onPress={() => toggle('subject')} scale={0.95} accessibilityLabel={name.trim() ? `アイコン（科目）：${name.trim()}。変える` : 'アイコン（科目）を選ぶ'} accessibilityState={{ expanded: open === 'subject' }}
                  style={{ alignItems: 'center', gap: 5 }}>
                  {name.trim() || icon ? (
                    <View style={{ borderRadius: 9, borderWidth: 2, borderColor: open === 'subject' ? t.ink : 'transparent', padding: 1 }}>
                      <PlanArt icon={icon} name={name.trim() || '？'} color={color} size={80} radius={7} />
                    </View>
                  ) : (
                    <View style={{ width: 84, height: 84, borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line2, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                      <Icon name="plus" size={18} color={t.ink2} />
                      <Txt size={10.5} w="700" tone="ink3">科目</Txt>
                    </View>
                  )}
                  <Txt size={11} w="700" tone={name.trim() ? 'ink2' : 'ink3'} numberOfLines={1} style={{ maxWidth: 84 }}>{name.trim() || 'アイコン'}</Txt>
                </Press>
                <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 40))} placeholder="青チャート 例題41〜50"
                  placeholderTextColor={t.ink3} multiline onFocus={typing} accessibilityLabel="何をやるか"
                  style={[{ flex: 1, minWidth: 0, minHeight: 84, paddingTop: 2, fontSize: 20, lineHeight: 27, fontFamily: font.display, fontWeight: '800', letterSpacing: -0.4, color: t.ink, textAlignVertical: 'top' }, noOutline]} />
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
                          <View style={{ padding: 2, borderRadius: 8, borderWidth: 2, borderColor: on ? t.ink : 'transparent' }}>
                            <SubjTile name={x.name} color={x.c} area={x.area} size={38} radius={5} />
                          </View>
                          <Txt size={11} w={on ? '800' : '600'} tone={on ? 'ink' : 'ink2'} numberOfLines={1}>{x.name}</Txt>
                        </Press>
                      );
                    })}
                    <Press onPress={() => toggle('new')} scale={0.92} accessibilityLabel="科目を足す"
                      style={{ width: '25%', alignItems: 'center', gap: 4, paddingVertical: 6 }}>
                      <View style={{ padding: 2 }}>
                        <View style={{ width: 38, height: 38, borderRadius: 5, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line2, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="plus" size={15} color={t.ink2} />
                        </View>
                      </View>
                      <Txt size={11} w="600" tone="ink2">足す</Txt>
                    </Press>
                  </View>
                  <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: hair, borderTopColor: t.line }}>
                    <Txt size={12} tone="ink3" style={{ flex: 1 }}>{icon ? '写真がアイコンになっています' : '科目の絵の代わりに写真も使えます'}</Txt>
                    <Press onPress={icon ? () => { haptic.tap(); setIcon(undefined); } : choose} hitSlop={8} scale={0.94} accessibilityLabel={icon ? 'アイコンの写真を外す' : 'アイコンにする写真を選ぶ'}
                      style={{ height: 28, paddingHorizontal: 12, borderRadius: 4, borderWidth: hair, borderColor: t.line2, justifyContent: 'center' }}>
                      <Txt size={12} w="700" tone="ink2">{icon ? '写真を外す' : '写真を選ぶ'}</Txt>
                    </Press>
                  </View>
                </Opens>
              ) : null}
              {open === 'new' ? <Opens><NewSubject onAdd={(x) => { setName(x.name); setColor(x.c); setOpen(null); }} /></Opens> : null}
            </Group>
          </Field>

          {/* the start: the time big, its day beside it, and a few times to pick with one tap */}
          <Field en="START" ja="開始時間">
            <Group>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 }}>
                <Press onPress={() => toggle('start')} scale={0.96} hitSlop={6} accessibilityLabel="始める時刻を変える" accessibilityState={{ expanded: open === 'start' }} style={{ flex: 1 }}>
                  <Txt num size={38} w="600" lh={44} color={open === 'start' ? t.blue : t.ink} style={{ fontFamily: mono(), letterSpacing: -1.2 }}>{toClock(start)}</Txt>
                </Press>
                <View style={{ alignItems: 'flex-end', gap: 5, paddingBottom: 4 }}>
                  <Press onPress={() => toggle('date')} scale={0.95} hitSlop={6} accessibilityLabel="始める日を変える" accessibilityState={{ expanded: open === 'date' }}
                    style={{ height: 24, paddingHorizontal: 8, borderRadius: 3, backgroundColor: open === 'date' ? 'rgba(47,107,255,0.12)' : t.sunken, justifyContent: 'center' }}>
                    <Txt size={12} w="600" color={open === 'date' ? t.blue : t.ink2}>{`${shortDate(d)}${weekly ? ` · 毎週${DOW[mondayIndex(d)]}曜` : ''}`}</Txt>
                  </Press>
                  <Txt size={10.5} tone="ink3" style={{ fontFamily: mono() }}>{`${lenLabel} · ${toClock(end % DAY)}まで`}</Txt>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingBottom: 12 }}>
                {picks.map((x, i) => {
                  // two picks can land on the same time (いまから and 次の空き): mark the one tapped, else the first
                  const on = x.m === start && (picked && picks.some((y) => y.label === picked && y.m === start) ? picked === x.label : picks.findIndex((y) => y.m === start) === i);
                  return (
                    <Press key={x.label} onPress={() => { haptic.tap(); setStart(x.m); setPicked(x.label); setOpen(null); }} scale={0.95} accessibilityLabel={`${x.label}（${toClock(x.m)}）から`} accessibilityState={{ selected: on }}
                      style={{ flex: 1, height: 40, borderRadius: 5, borderWidth: hair, borderColor: on ? t.ink : t.line2, backgroundColor: on ? t.ink : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      <Txt size={11} w="700" color={on ? t.onInk : t.ink2}>{x.label}</Txt>
                      <Txt size={10} color={on ? t.onInk : t.ink3} style={{ fontFamily: mono() }}>{toClock(x.m)}</Txt>
                    </Press>
                  );
                })}
              </View>
              {open === 'date' ? <Opens><DatePick value={d} min={today} onChange={(x) => setD(day0(x))} onDone={() => setOpen(null)} /></Opens> : null}
              {open === 'start' ? <Opens><TimePick value={start} onChange={setStart} onDone={() => setOpen(null)} /></Opens> : null}
            </Group>
          </Field>
        </>
      ) : (
        <>
          <Field en="TASK" ja="締切">
            <Group>
              <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 40))} placeholder="英検 申込"
                placeholderTextColor={t.ink3} multiline onFocus={typing} accessibilityLabel="締切の名前"
                style={[{ minHeight: 56, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, fontSize: 22, lineHeight: 29, fontFamily: font.display, fontWeight: '800', letterSpacing: -0.4, color: t.ink, textAlignVertical: 'top' }, noOutline]} />
            </Group>
          </Field>
          <Field en="WHEN" ja="いつ">
            <Group>
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
            </Group>
          </Field>
        </>
      )}

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
