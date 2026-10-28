import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Group } from '@/data';
import { addGroup } from '@/store';
import { hair, radius, useT } from '@/theme';
import { Btn, haptic, Press, Txt } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { Field, Label, RadioCards, Stepper } from '@/ui/Form';
import { Icon, IconName } from '@/ui/Icon';
import { micro } from '@/ui/motion';
import { toast } from '@/ui/Toast';

const THEMES: { v: string; icon: IconName }[] = [
  { v: '志望校', icon: 'flag' }, { v: '科目', icon: 'book' }, { v: '朝活・夜活', icon: 'sun' },
  { v: '資格', icon: 'cert' }, { v: '友だち', icon: 'heart' }, { v: 'その他', icon: 'chat' },
];
type Join = '招待制' | '公開';

const nameError = (x: string) => (!x.trim() ? '名前がまだです' : x.trim().length < 2 ? '2文字以上にしてね' : undefined);

export default function CreateGroup() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [theme, setTheme] = useState('志望校');
  const [picked, setPicked] = useState(false);
  const [join, setJoin] = useState<Join>('招待制');
  const [cap, setCap] = useState(10);
  const [touched, setTouched] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'done'>('idle');
  const err = touched ? nameError(name) : undefined;

  const create = () => {
    if (nameError(name)) {
      setTouched(true);
      haptic.warn();
      return;
    }
    setPhase('saving');
    setTimeout(() => {
      const g: Group = {
        id: 'g' + Date.now(), n: name.trim(), m: 1, join, cs: ['#6E56CF', '#1F8A70', '#D9653B', '#C99A22'], studying: [],
        msgs: [{ kind: 'sys', t: 'グループを作りました。招待リンクでメンバーを呼びましょう' }], events: [], shared: [],
      };
      addGroup(g);
      haptic.success();
      setPhase('done');
      setTimeout(() => {
        router.replace(`/group/${g.id}`);
        toast(`「${g.n}」を作りました`, '招待リンクをコピーしました');
      }, 600);
    }, 900);
  };

  return (
    <Screen>
      <NavBar title="グループを作る" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 22, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 14 }}>
            <Field label="グループ名" value={name} onChangeText={setName} max={24} error={err} onBlur={() => setTouched(true)} returnKeyType="next" />
            <Field label="どんな人と、何をがんばる？（任意）" value={desc} onChangeText={setDesc} multiline max={120} />
          </View>
          <View>
            <Label>テーマ</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {THEMES.map((x) => (
                <ThemeTile key={x.v} label={x.v} icon={x.icon} on={theme === x.v} dim={picked && theme !== x.v}
                  onPress={() => { setTheme(x.v); setPicked(true); }} />
              ))}
            </View>
          </View>
          <View>
            <Label>参加のしかた</Label>
            <RadioCards value={join} onChange={setJoin} options={[
              { v: '招待制', title: '招待制', sub: 'リンクを知っている人だけ' },
              { v: '公開', title: '公開', sub: '検索に出て、誰でも入れる' },
            ]} />
          </View>
          <View>
            <Label>定員</Label>
            <Stepper value={cap} min={2} max={50} onChange={setCap} unit="人" label="定員" />
          </View>
        </ScrollView>
        {/* sticky summary + action */}
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: t.canvas, borderTopWidth: hair, borderTopColor: t.line, gap: 10 }}>
          <Txt size={12} tone="ink2" numberOfLines={1}>
            <Txt size={12} w="700" tone={name.trim() ? 'ink' : 'ink3'}>{name.trim() || '名前未入力'}</Txt>
            {`  · ${theme} · ${join} · 定員${cap}人`}
          </Txt>
          <Btn kind="primary" wide label={phase === 'done' ? '作成しました' : '作成する'} loading={phase === 'saving'} done={phase === 'done'} onPress={create} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function ThemeTile({ label, icon, on, dim, onPress }: { label: string; icon: IconName; on: boolean; dim: boolean; onPress: () => void }) {
  const t = useT();
  const s = useSharedValue(on ? 1.03 : 1);
  const o = useSharedValue(1);
  useEffect(() => {
    s.value = micro(on ? 1.03 : 1);
    o.value = micro(dim ? 0.62 : 1);
  }, [on, dim, s, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[{ width: '31.8%' }, a]}>
      <Press onPress={onPress} scale={0.95} accessibilityRole="radio" accessibilityState={{ checked: on }}
        style={{ height: 64, borderRadius: radius.inner, alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: on ? t.ink : t.surface,
          borderWidth: hair, borderColor: on ? t.ink : t.line2 }}>
        <Icon name={icon} size={19} color={on ? t.onInk : t.ink} />
        <Txt size={12} w="600" color={on ? t.onInk : t.ink}>{label}</Txt>
      </Press>
    </Animated.View>
  );
}
