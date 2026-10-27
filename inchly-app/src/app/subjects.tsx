import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AREAS, AreaId, PRESETS, Subject, SUBJECT_COLORS } from '@/data';
import { addSubject, moveSubject, removeSubject, updateSubject, useStore } from '@/store';
import { hair, lift, radius, useT } from '@/theme';
import { Btn, haptic, Press, SubjCoin, Txt } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { Choice, Field, Label } from '@/ui/Form';
import { Icon } from '@/ui/Icon';
import { useAreaColors } from '@/ui/series';
import { openSheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';
import { Pane } from '@/ui/Glass';

// 科目と色: split subjects as finely as you like (数IA, 古文, 日本史 …), each
// in a 教科 so charts can also add them up, each with its own color.

export default function Subjects() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const subjects = useStore((s) => s.subjects);
  const shown = subjects.filter((x) => !x.hidden);
  const areaC = useAreaColors();
  const hidden = subjects.filter((x) => x.hidden);
  const names = new Set(subjects.map((x) => x.name));
  const presets = PRESETS.filter((p) => !names.has(p.name));
  return (
    <Screen>
      <NavBar title="科目と色" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <Txt size={12.5} tone="ink2" lh={19} style={{ paddingHorizontal: 20, paddingTop: 6 }}>
          科目は細かく分けられます。グラフは「科目ごと」でも、教科ごとにまとめても見られます（グラフの歯車から切り替え）。
        </Txt>

        {AREAS.map((a) => {
          const list = shown.filter((x) => x.area === a.id);
          if (!list.length) return null;
          return (
            <View key={a.id} style={{ paddingHorizontal: 16, paddingTop: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingBottom: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: areaC[a.id] }} />
                <Txt size={12} w="700" tone="ink2">{a.name}</Txt>
              </View>
              <View style={[{ backgroundColor: t.surface, borderRadius: radius.card }, lift(t)]}>
                <Pane radius={radius.card} />
                {list.map((x, i) => (
                  <Press key={x.id} onPress={() => subjectSheet(x)} scale={0.99} accessibilityLabel={`${x.name}。編集`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, paddingHorizontal: 14, borderTopWidth: i ? hair : 0, borderTopColor: t.line }}>
                    <SubjCoin name={x.name} color={x.c} area={x.area} size={28} />
                    <Txt size={15} w="600" style={{ flex: 1 }}>{x.name}</Txt>
                    <Icon name="chev" size={13} color={t.ink3} />
                  </Press>
                ))}
              </View>
            </View>
          );
        })}

        <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
          <Btn kind="primary" wide icon="plus" label="科目を追加" onPress={() => subjectSheet()} />
        </View>

        {presets.length ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 22, gap: 10 }}>
            <Txt size={12} w="700" tone="ink2">よくある分け方（押すと追加）</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {presets.map((p) => (
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

function subjectSheet(existing?: Subject) {
  openSheet((close) => <SubjectForm close={close} existing={existing} />);
}
function SubjectForm({ close, existing }: { close: () => void; existing?: Subject }) {
  const t = useT();
  const subjects = useStore((s) => s.subjects);
  const [name, setName] = useState(existing?.name ?? '');
  const [area, setArea] = useState<AreaId>(existing?.area ?? 'other');
  const taken = new Set(subjects.filter((x) => x.id !== existing?.id).map((x) => x.c));
  const [c, setC] = useState(existing?.c ?? SUBJECT_COLORS.find((k) => !taken.has(k)) ?? SUBJECT_COLORS[0]);
  const [touched, setTouched] = useState(false);
  const dup = subjects.some((x) => x.id !== existing?.id && !x.hidden && x.name === name.trim());
  const err = touched && !name.trim() ? '科目の名前を入れてください' : dup ? '同じ名前の科目があります' : undefined;
  const save = () => {
    if (!name.trim() || dup) { setTouched(true); return; }
    if (existing) updateSubject(existing.id, { name: name.trim(), area, c });
    else addSubject({ name, area, c });
    haptic.success();
    close();
    toast(existing ? '科目を保存しました' : `「${name.trim()}」を追加しました`);
  };
  const remove = () => {
    if (!existing) return;
    const r = removeSubject(existing.id);
    if (r === 'last') { haptic.warn(); toast('科目は1つ以上必要です'); return; }
    haptic.warn();
    close();
    toast(r === 'hidden' ? `「${existing.name}」をしまいました` : `「${existing.name}」を削除しました`, r === 'hidden' ? '記録があるので、グラフには残ります' : undefined);
  };
  return (
    <View style={{ gap: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c }} />
        <Txt size={18} w="700">{existing ? '科目を編集' : '科目を追加'}</Txt>
      </View>
      <Field label="名前（例：数IA、古文、日本史）" value={name} onChangeText={setName} max={12} error={err} onBlur={() => setTouched(true)} />
      <View>
        <Label sub="「教科ごと」のグラフでまとめる先">教科</Label>
        <Choice value={area} onChange={setArea} options={AREAS.map((a) => ({ v: a.id, label: a.name }))} />
      </View>
      <View>
        <Label sub="ほかの科目で使っている色には点が付いています">色</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} accessibilityRole="radiogroup">
          {SUBJECT_COLORS.map((k) => {
            const on = k === c;
            return (
              <Press key={k} onPress={() => { haptic.tap(); setC(k); }} scale={0.88} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`色 ${k}`}
                style={{ width: '16%', aspectRatio: 1, borderRadius: 999, backgroundColor: k, alignItems: 'center', justifyContent: 'center',
                  borderWidth: on ? 3 : 0, borderColor: t.surface, boxShadow: on ? `0px 0px 0px 2px ${k}` : undefined }}>
                {on ? <Icon name="check" size={16} color="#fff" width={3} /> : taken.has(k) ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.85)' }} /> : null}
              </Press>
            );
          })}
        </View>
      </View>
      <Btn kind="primary" wide label={existing ? '保存する' : '追加する'} onPress={save} />
      {existing ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn kind="quiet" label="上へ" style={{ flex: 1 }} onPress={() => { moveSubject(existing.id, -1); haptic.tap(); }} />
          <Btn kind="quiet" label="下へ" style={{ flex: 1 }} onPress={() => { moveSubject(existing.id, 1); haptic.tap(); }} />
          <Btn kind="quiet" label="削除" style={{ flex: 1 }} onPress={remove} />
        </View>
      ) : null}
    </View>
  );
}
