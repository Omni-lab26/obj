import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SUBJ, TODAY } from '@/data';
import { Account, setState, signIn } from '@/store';
import { hair, useT } from '@/theme';
import { Btn, haptic, Press, Txt } from '@/ui/base';
import { Wordmark } from '@/ui/Brand';
import { Choice, Field, Label, Stepper } from '@/ui/Form';
import { Icon } from '@/ui/Icon';
import { toast } from '@/ui/Toast';

// First launch: sign in, who you are, what you aim for, which notices you want.
// Four short steps; everything can be changed later in 設定.
type Step = 0 | 1 | 2 | 3;
const GRADES = ['中3', '高1', '高2', '高3', '既卒'] as const;
const DEMO: Account = { name: 'はる', handle: 'haru_study', grade: '高3', birthYear: 2008, aim: '東大 理一', via: 'demo' };

export default function Welcome() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(0);
  const [via, setVia] = useState<Account['via']>('apple');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<(typeof GRADES)[number]>('高3');
  const [year, setYear] = useState(2008);
  const [aim, setAim] = useState('');
  const [goal, setGoal] = useState(180);
  const [notify, setNotify] = useState({ peers: true, deadlines: true, goal: true });
  const [touched, setTouched] = useState(false);

  const age = TODAY.getFullYear() - year;
  const tooYoung = age < 13;
  const minor = age < 18;
  const nameErr = touched && !name.trim() ? 'ニックネームを入れてください' : undefined;

  const finish = (a: Account) => {
    signIn(a);
    setState({ goalMin: goal, notify });
    haptic.success();
    router.replace('/');
    toast(`ようこそ、${a.name}さん`, '最初の記録はホームの「始める」から');
  };
  const next = () => {
    if (step === 1) {
      setTouched(true);
      if (!name.trim() || tooYoung) return;
    }
    if (step === 3) {
      finish({ name: name.trim(), handle: `${name.trim()}_${(year % 100).toString().padStart(2, '0')}`, grade, birthYear: year, aim: aim.trim(), via });
      return;
    }
    haptic.tap();
    setStep((step + 1) as Step);
  };

  if (step === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: t.canvas, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}>
        <Wordmark size={30} />
        <Txt size={28} w="700" lh={38} style={{ marginTop: 28 }}>少しずつ、毎日。</Txt>
        <Txt size={15} tone="ink2" lh={24} style={{ marginTop: 8 }}>
          勉強した時間を記録して、積み上がりを目で見る。{'\n'}同じ目標の仲間と、同じ時間に机に向かう。
        </Txt>
        <View style={{ gap: 14, marginTop: 32 }}>
          {[['clock', '測る', 'タイマーを止めると記録になる'], ['bars', '見える', '今日のバー、草、連続日数'], ['users', '一緒に', 'いま勉強中の仲間と始める'], ['flag', '次', 'ToDoと締切で、次にやることが決まる']].map(([ic, a, b]) => (
            <View key={a} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={ic as 'clock'} size={18} color={t.ink} />
              </View>
              <View>
                <Txt size={14} w="600">{a}</Txt>
                <Txt size={12.5} tone="ink3">{b}</Txt>
              </View>
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ gap: 10 }}>
          <Btn kind="primary" wide label="Appleでサインイン" onPress={() => { setVia('apple'); setStep(1); }} />
          <Btn kind="line" wide label="メールアドレスで続ける" onPress={() => { setVia('mail'); setStep(1); }} />
          <Press onPress={() => finish(DEMO)} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 8 }}>
            <Txt size={13} tone="ink2">サンプルのアカウントで見る</Txt>
          </Press>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.canvas }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Press onPress={() => setStep((step - 1) as Step)} hitSlop={8} accessibilityLabel="戻る" style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={22} color={t.ink} />
        </Press>
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
          {[1, 2, 3].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? t.ink : t.sunken }} />)}
        </View>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 22 }}>
        <Animated.View key={step} entering={FadeIn.duration(220)} style={{ gap: 22 }}>
          {step === 1 ? (
            <>
              <View>
                <Txt size={24} w="700" lh={32}>あなたのこと</Txt>
                <Txt size={13} tone="ink3">あとで設定から変えられます</Txt>
              </View>
              <Field label="ニックネーム" value={name} onChangeText={setName} max={16} error={nameErr} onBlur={() => setTouched(true)} />
              <View>
                <Label>学年</Label>
                <Choice value={grade} onChange={setGrade} options={GRADES.map((g) => ({ v: g, label: g }))} />
              </View>
              <View>
                <Label sub="年齢の確認だけに使い、ほかの人には見えません">生まれた年</Label>
                <Stepper value={year} min={1990} max={2016} onChange={setYear} unit="年" label="生まれた年" />
                {tooYoung ? (
                  <Txt size={12.5} tone="red" style={{ marginTop: 8 }}>Inchly は13歳から使えます。</Txt>
                ) : minor ? (
                  <View style={{ marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line, gap: 2 }}>
                    <Txt size={13} w="600">18歳未満なので、安全な設定で始めます</Txt>
                    <Txt size={12.5} tone="ink2" lh={19}>勉強中はフォロワーにだけ見えます。メッセージはフォロー中の人からだけ届きます。</Txt>
                  </View>
                ) : null}
              </View>
            </>
          ) : step === 2 ? (
            <>
              <View>
                <Txt size={24} w="700" lh={32}>目標</Txt>
                <Txt size={13} tone="ink3">同じ志望の人が、いま勉強中に並びます</Txt>
              </View>
              <Field label="志望校（任意）" value={aim} onChangeText={setAim} max={24} />
              <View>
                <Label sub="今日のバーの目標の線になります">1日の目標</Label>
                <Choice value={String(goal)} onChange={(v) => setGoal(Number(v))} options={[60, 120, 180, 240, 300].map((m) => ({ v: String(m), label: `${m / 60}時間` }))} />
              </View>
              <View>
                <Label>勉強する科目</Label>
                <Txt size={13} tone="ink2">{SUBJ.map((x) => x.name).join('・')}</Txt>
              </View>
            </>
          ) : (
            <>
              <View>
                <Txt size={24} w="700" lh={32}>お知らせ</Txt>
                <Txt size={13} tone="ink3">いるものだけ選んでください</Txt>
              </View>
              <View style={{ backgroundColor: t.surface, borderRadius: 16, borderWidth: hair, borderColor: t.line, paddingHorizontal: 14 }}>
                {([['peers', '仲間が勉強を始めた', '一緒に始めるきっかけに'], ['deadlines', '締切が近い', '模試や申込の3日前と前日'], ['goal', '目標まであと少し', '今日の目標まで15分のとき']] as const).map(([k, a, b], i) => (
                  <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i ? hair : 0, borderTopColor: t.line }}>
                    <View style={{ flex: 1 }}>
                      <Txt size={14} w="500">{a}</Txt>
                      <Txt size={12} tone="ink3">{b}</Txt>
                    </View>
                    <Switch value={notify[k]} onValueChange={(v) => { haptic.tap(); setNotify({ ...notify, [k]: v }); }} trackColor={{ true: t.green, false: t.line2 }} thumbColor="#fff" ios_backgroundColor={t.line2} accessibilityLabel={a} />
                  </View>
                ))}
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>
      <View style={{ padding: 20, paddingBottom: insets.bottom + 16 }}>
        <Btn kind="primary" wide label={step === 3 ? 'はじめる' : '次へ'} disabled={step === 1 && tooYoung} onPress={next} />
      </View>
    </KeyboardAvoidingView>
  );
}
