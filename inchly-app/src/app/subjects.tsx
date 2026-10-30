import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AREAS, AreaId, guessArea, OTHER_COLORS, PRESETS, shadeFor, Subject } from '@/data';
import { addSubject, deleteSubject, moveSubject, recordsOf, removeSubject, updateSubject, useStore } from '@/store';
import { hair, lift, radius, useT } from '@/theme';
import { Btn, haptic, Press, StdIcon, SubjCoin, Txt } from '@/ui/base';
import { Pix } from '@/themes/standard/pixel';
import { ring, S, useStd } from '@/ui/stdLook';
import { NavBar, Screen } from '@/ui/Chrome';
import { Choice, Field, Label, StdChip } from '@/ui/Form';
import { Icon } from '@/ui/Icon';
import { areaColors } from '@/ui/series';
import { openSheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';
import { Pane } from '@/ui/Glass';

// 科目と色: split subjects as finely as you like (数IA, 古文, 日本史 …), each
// in a 教科 so charts can also add them up. Colors are fixed: a subject takes
// its 教科's next shade when it's made (数学 orange, 数IA a deeper orange …)
// and keeps it; only その他 has colors to pick (data.ts AREA_SHADES).
// 編集 (top right) puts a red − on every subject, as iOS lists do: one with no
// records goes at once; one with records asks first — delete it with its
// records, or put it away (しまう) and keep them in the charts.

export default function Subjects() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const subjects = useStore((s) => s.subjects);
  const shown = subjects.filter((x) => !x.hidden);
  const areaC = areaColors();
  const hidden = subjects.filter((x) => x.hidden);
  const names = new Set(subjects.map((x) => x.name));
  const presets = PRESETS.filter((p) => !names.has(p.name));
  const [editing, setEditing] = useState(false);
  const std = useStd();
  return (
    <Screen>
      <NavBar title="科目と色" right={(
        <Press onPress={() => { haptic.tap(); setEditing(!editing); }} hitSlop={8} accessibilityLabel={editing ? '編集を終える' : '科目を削除する'} style={{ paddingHorizontal: 10, height: 38, justifyContent: 'center' }}>
          <Txt size={15.5} w={editing || std ? '700' : '500'} color={t.blue}>{editing ? '完了' : '編集'}</Txt>
        </Press>
      )} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <Txt size={12.5} tone="ink2" lh={19} style={{ paddingHorizontal: 20, paddingTop: 6 }}>
          科目は細かく分けられます。色は教科で決まっていて（同じ教科の科目は同じ色の濃淡）、グラフでもどこでも同じ色です。グラフは「科目ごと」でも、教科ごとにまとめても見られます（グラフの歯車から切り替え）。
        </Txt>

        {AREAS.map((a) => {
          const list = shown.filter((x) => x.area === a.id);
          if (!list.length) return null;
          return (
            <View key={a.id} style={{ paddingHorizontal: 16, paddingTop: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingBottom: 8 }}>
                <View style={[{ width: 8, height: 8, borderRadius: 2, backgroundColor: areaC[a.id] }, std && { borderRadius: 0, boxShadow: ring(1.5) }]} />
                <Txt size={12} w="700" tone="ink2">{a.name}</Txt>
              </View>
              <View style={[{ backgroundColor: t.surface, borderRadius: radius.card }, lift(t)]}>
                <Pane radius={radius.card} />
                {list.map((x, i) => (
                  <Press key={x.id} onPress={() => (editing ? askDelete(x) : subjectSheet(x))} scale={0.99} accessibilityLabel={editing ? `${x.name}を削除` : `${x.name}。編集`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: std ? 56 : 50, paddingHorizontal: 14, borderTopWidth: i ? (std ? 1.5 : hair) : 0, borderTopColor: t.line }}>
                    {editing ? (
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="minus" size={13} color="#fff" width={2.6} />
                      </View>
                    ) : null}
                    <SubjCoin name={x.name} color={x.c} area={x.area} size={28} />
                    <Txt size={15} w="600" style={{ flex: 1 }}>{x.name}</Txt>
                    {editing ? null : std ? <StdIcon name="chev" color={S.ink3} /> : <Icon name="chev" size={13} color={t.ink3} />}
                  </Press>
                ))}
              </View>
            </View>
          );
        })}

        <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
          {/* スタンダード: a plain key (the ink one is a sheet's decision) */}
          <Btn kind={std ? 'quiet' : 'primary'} wide icon="plus" label="科目を追加" onPress={() => subjectSheet()} />
        </View>

        {presets.length ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 10 }}>
            <Txt size={12} w="700" tone="ink2">よくある分け方（押すと追加）</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {presets.map((p) => std ? (
                <StdChip key={p.name} role="button" a11y={`${p.name}を追加`} label={p.name}
                  onPress={() => { addSubject(p); haptic.tap(); toast(`「${p.name}」を追加しました`, `${AREAS.find((a) => a.id === p.area)?.name}に入れました`); }}>
                  <Pix name="plus" px={1} />
                </StdChip>
              ) : (
                <Press key={p.name} onPress={() => { addSubject(p); haptic.tap(); toast(`「${p.name}」を追加しました`, `${AREAS.find((a) => a.id === p.area)?.name}に入れました`); }}
                  scale={0.94} accessibilityLabel={`${p.name}を追加`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line2 }}>
                  <Icon name="plus" size={11} color={t.ink2} />
                  <Txt size={13} w="600">{p.name}</Txt>
                </Press>
              ))}
            </View>
          </View>
        ) : null}

        {hidden.length ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 22 }}>
            <Txt size={12} w="700" tone="ink2" style={{ paddingHorizontal: 4, paddingBottom: 8 }}>しまった科目（記録はグラフに残ります）</Txt>
            <View style={[{ backgroundColor: t.surface, borderRadius: radius.card }, lift(t)]}>
              <Pane radius={radius.card} />
              {hidden.map((x, i) => (
                <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, paddingHorizontal: 14, borderTopWidth: i ? hair : 0, borderTopColor: t.line }}>
                  <View style={{ opacity: 0.5 }}><SubjCoin name={x.name} color={x.c} area={x.area} size={28} /></View>
                  <Txt size={15} w="500" tone="ink2" style={{ flex: 1 }}>{x.name}</Txt>
                  <Btn small kind="line" label="戻す" onPress={() => { updateSubject(x.id, { hidden: false }); toast(`「${x.name}」を戻しました`); }} />
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const RED = '#FF3B30';

/** Deleting: at once when nothing uses it; with records, asks whether they go too or the subject is only put away. */
function askDelete(x: Subject) {
  const r = deleteSubject(x.id);
  if (r === 'last') { haptic.warn(); toast('科目は1つ以上必要です'); return; }
  if (r === 'removed') { haptic.warn(); toast(`「${x.name}」を削除しました`); return; }
  openSheet((close) => <DeleteForm x={x} close={close} />);
}
function DeleteForm({ x, close }: { x: Subject; close: () => void }) {
  const n = recordsOf(x.id);
  const what = [n.sessions ? `勉強の記録 ${n.sessions}件` : '', n.plans ? `時間割の予定 ${n.plans}件` : '', n.todos ? `ToDo ${n.todos}件` : ''].filter(Boolean).join('・');
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <SubjCoin name={x.name} color={x.c} area={x.area} size={28} />
        <Txt size={18} w="700">{`「${x.name}」を削除`}</Txt>
      </View>
      <Txt size={13.5} tone="ink2" lh={20}>{`この科目には ${what} があります。`}</Txt>
      <Btn kind="primary" wide label="記録ごと削除する" onPress={() => { deleteSubject(x.id, true); haptic.warn(); close(); toast(`「${x.name}」と記録を削除しました`); }} />
      <Btn kind="line" wide label="記録は残して、しまう" onPress={() => { removeSubject(x.id); haptic.tap(); close(); toast(`「${x.name}」をしまいました`, '記録はグラフに残ります。下の「しまった科目」から戻せます'); }} />
      <Btn kind="quiet" wide label="やめる" onPress={close} />
    </View>
  );
}

function subjectSheet(existing?: Subject) {
  openSheet((close) => <SubjectForm close={close} existing={existing} />);
}
function SubjectForm({ close, existing }: { close: () => void; existing?: Subject }) {
  const t = useT();
  const subjects = useStore((s) => s.subjects);
  const [name, setName] = useState(existing?.name ?? '');
  const [short, setShort] = useState(existing?.short ?? '');
  // the 教科: what you pick, else what the name points to (数IA → 数学)
  const [picked, setPicked] = useState<AreaId | null>(existing?.area ?? null);
  const area = picked ?? guessArea(name);
  const others = subjects.filter((x) => x.id !== existing?.id);
  const taken = new Set(others.map((x) => x.c));
  const [mine, setMine] = useState(existing?.area === 'other' ? existing.c : shadeFor('other', others));
  // the color it will have: its 教科's (kept if it stays in its 教科), or the one picked in その他
  const c = area === 'other' ? mine : existing && existing.area === area ? existing.c : shadeFor(area, others);
  const [touched, setTouched] = useState(false);
  const dup = subjects.some((x) => x.id !== existing?.id && !x.hidden && x.name === name.trim());
  const err = touched && !name.trim() ? '科目の名前を入れてください' : dup ? '同じ名前の科目があります' : undefined;
  const save = () => {
    if (!name.trim() || dup) { setTouched(true); return; }
    if (existing) updateSubject(existing.id, { name: name.trim(), area, c, short });
    else addSubject({ name, area, c, short });
    haptic.success();
    close();
    toast(existing ? '科目を保存しました' : `「${name.trim()}」を追加しました`);
  };
  const remove = () => {
    if (!existing) return;
    close();
    setTimeout(() => askDelete(existing), 300);
  };
  return (
    <View style={{ gap: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <SubjCoin name={name.trim() || '？'} color={c} area={area} size={28} />
        <Txt size={18} w="700">{existing ? '科目を編集' : '科目を追加'}</Txt>
      </View>
      <Field label="名前（例：数IA、古文、日本史）" value={name} onChangeText={setName} max={12} error={err} onBlur={() => setTouched(true)} />
      {/* for where a long name doesn't fit (サイバーの看板など) */}
      <Field label="略称（4文字まで・なくてもよい）" value={short} onChangeText={(v) => setShort([...v].slice(0, 4).join(''))} max={4}
        helper="看板などで、長い名前の代わりに使います" />
      <View>
        <Label sub="「教科ごと」のグラフでまとめる先。色もこれで決まります">教科</Label>
        <Choice value={area} onChange={setPicked} options={AREAS.map((a) => ({ v: a.id, label: a.name }))} />
      </View>
      <View>
        <Label sub={area === 'other' ? 'その他の科目だけ、教科にない色から選べます' : '教科の色で決まっています（同じ教科の科目は濃淡で分かれます）'}>色</Label>
        {area === 'other' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} accessibilityRole="radiogroup">
            {OTHER_COLORS.map((k) => {
              const on = k === c;
              return (
                <Press key={k} onPress={() => { haptic.tap(); setMine(k); }} scale={0.88} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`色 ${k}`}
                  style={{ width: '16%', aspectRatio: 1, borderRadius: 999, backgroundColor: k, alignItems: 'center', justifyContent: 'center',
                    borderWidth: on ? 3 : 0, borderColor: t.surface, boxShadow: on ? `0px 0px 0px 2px ${k}` : undefined }}>
                  {on ? <Icon name="check" size={16} color="#fff" width={3} /> : taken.has(k) ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.85)' }} /> : null}
                </Press>
              );
            })}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <SubjCoin name={name.trim() || AREAS.find((a) => a.id === area)!.name} color={c} area={area} size={30} />
            <Txt size={13} tone="ink2">{`${AREAS.find((a) => a.id === area)!.name}の色`}</Txt>
          </View>
        )}
      </View>
      <Btn kind="primary" wide label={existing ? '保存する' : '追加する'} onPress={save} />
      {existing ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn kind="quiet" label="上へ" style={{ flex: 1 }} onPress={() => { moveSubject(existing.id, -1); haptic.tap(); }} />
          <Btn kind="quiet" label="下へ" style={{ flex: 1 }} onPress={() => { moveSubject(existing.id, 1); haptic.tap(); }} />
        </View>
      ) : null}
      {existing ? (
        <Press onPress={remove} hitSlop={6} accessibilityLabel={`${existing.name}を削除`} style={{ alignSelf: 'center', paddingVertical: 6 }}>
          <Txt size={15} w="600" color={RED}>この科目を削除</Txt>
        </Press>
      ) : null}
    </View>
  );
}
