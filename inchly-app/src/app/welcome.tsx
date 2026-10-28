import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SUBJ } from '@/data';
import { ageOf, gradeNow, OTHER_GRADES, pickGrade, SCHOOL } from '@/lib/grade';
import { notificationsAllowed } from '@/lib/notify';
import { Account, setState, signIn } from '@/store';
import { hair, useT } from '@/theme';
import { Btn, haptic, Press, Txt } from '@/ui/base';
import { Wordmark } from '@/ui/Brand';
import { GoalPick, goalLabel, Opens, PickChip, SMOOTH, YearMonthPick } from '@/ui/DateTime';
import { Choice, Field, Label } from '@/ui/Form';
import { Icon } from '@/ui/Icon';
import { fadeIn } from '@/ui/motion';
import { toast } from '@/ui/Toast';

// First launch: sign in (Apple, Google or mail), who you are, what you aim for,
// which notices you want. Four short steps.
// Who you are: a nickname, the year and month you were born — the grade comes
// from it (and moves up by itself every April, lib/grade), and can be changed
// (a year ahead or behind, 浪人, 大学生 …). Anyone from 小学生 can use it;
// under 13 we ask that a parent has agreed. Everyone starts with studying
// shown to all: seeing each other study is what the app is for.
type Step = 0 | 1 | 2 | 3;
const DEMO: Account = { name: 'はる', handle: 'haru_study', birthYear: 2008, birthMonth: 5, aim: '東大 理一', via: 'demo' };
const THIS_YEAR = new Date().getFullYear();

export default function Welcome() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(0);
  const [via, setVia] = useState<Account['via']>('apple');
  const [name, setName] = useState('');
  const [year, setYear] = useState(THIS_YEAR - 18);
  const [month, setMonth] = useState(5);
  // the grade picked by hand (null: the one the birthday gives)
  const [picked, setPicked] = useState<string | null>(null);
  const [open, setOpen] = useState<'birth' | 'grade' | 'goal' | null>(null);
  const [consent, setConsent] = useState(false);
  const [aim, setAim] = useState('');
  const [goal, setGoal] = useState(180);
  const [notify, setNotify] = useState({ peers: true, deadlines: true, goal: true });
  const [touched, setTouched] = useState(false);

  const age = ageOf(year, month);
  const child = age < 13;
  const auto = gradeNow({ birthYear: year, birthMonth: month });
  const grade = picked ?? auto;
  const nameErr = touched && !name.trim() ? 'ニックネームを入れてください' : undefined;
  const toggle = (k: 'birth' | 'grade' | 'goal') => { haptic.tap(); setOpen(open === k ? null : k); };

  const finish = (a: Account) => {
    signIn(a);
    setState({ goalMin: goal, notify });
    // the system asks once, right after you chose which notices you want
    if (a.via !== 'demo' && (notify.deadlines || notify.goal)) notificationsAllowed(true);
    haptic.success();
    router.replace('/');
    toast(`ようこそ、${a.name}さん`, '最初の記録は、下の「勉強を開始」から');
  };
  const next = () => {
    if (step === 1) {
      setTouched(true);
      if (!name.trim()) return;
      if (child && !consent) { haptic.warn(); toast('保護者の同意を確認してください'); return; }
    }
    if (step === 3) {
      finish({
        name: name.trim(), handle: `${name.trim()}_${(year % 100).toString().padStart(2, '0')}`, birthYear: year, birthMonth: month,
        ...(picked ? pickGrade(picked, year, month) : {}), aim: aim.trim(), via, ...(child ? { parentConsent: true } : {}),
      });
      return;
    }
    haptic.tap();
    setOpen(null);
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
          <Btn kind="line" wide label="Googleでサインイン" onPress={() => { setVia('google'); setStep(1); }} />
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
        <Animated.View key={step} entering={fadeIn()} style={{ gap: 22 }}>
          {step === 1 ? (
            <>
              <View>
                <Txt size={24} w="700" lh={32}>あなたのこと</Txt>
                <Txt size={13} tone="ink3">ニックネームと学年は、あとで設定から変えられます</Txt>
              </View>
              <Field label="ニックネーム" value={name} onChangeText={setName} max={16} error={nameErr} onBlur={() => setTouched(true)} />
              {/* the year and month you were born, then the grade it gives (which you can change) */}
              <Animated.View layout={SMOOTH} style={{ borderRadius: 14, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line, overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Txt size={15.5}>生まれた年月</Txt>
                    <Txt size={11.5} tone="ink3">ほかの人には見えません</Txt>
                  </View>
                  <PickChip on={open === 'birth'} onPress={() => toggle('birth')} label={`${year}年${month}月`} a11y="生まれた年月を変える" />
                </View>
                {open === 'birth' ? <Opens><YearMonthPick year={year} month={month} min={1950} max={THIS_YEAR - 5} onChange={(y, m) => { setYear(y); setMonth(m); }} /></Opens> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 14, borderTopWidth: hair, borderTopColor: t.line }}>
                  <View style={{ flex: 1 }}>
                    <Txt size={15.5}>学年</Txt>
                    <Txt size={11.5} tone="ink3">{picked ? '自分で選んだ学年（毎年4月に上がります）' : '生まれた年月から自動（毎年4月に上がります）'}</Txt>
                  </View>
                  <PickChip on={open === 'grade'} onPress={() => toggle('grade')} label={grade} a11y="学年を変える" />
                </View>
                {open === 'grade' ? (
                  <Opens>
                    <View style={{ alignSelf: 'stretch', padding: 12, gap: 10 }}>
                      <Choice value={grade} onChange={(g) => { haptic.tap(); setPicked(g === auto ? null : g); }} options={[...SCHOOL, ...OTHER_GRADES].map((g) => ({ v: g, label: g }))} />
                      {picked ? (
                        <Press onPress={() => { haptic.tap(); setPicked(null); }} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
                          <Txt size={13} w="600" color={t.blue}>{`生まれた年月に合わせる（${auto}）`}</Txt>
                        </Press>
                      ) : null}
                    </View>
                  </Opens>
                ) : null}
              </Animated.View>
              {/* under 13: a parent has to have agreed */}
              {child ? (
                <Animated.View entering={fadeIn()} style={{ padding: 14, borderRadius: 14, backgroundColor: t.surface, borderWidth: hair, borderColor: consent ? t.line : t.line2, gap: 10 }}>
                  <View style={{ gap: 2 }}>
                    <Txt size={14} w="700">13歳未満の方へ</Txt>
                    <Txt size={12.5} tone="ink2" lh={19}>使う前に、おうちの人に Inchly を使ってよいか聞いてください。勉強の記録は、ほかの人にも見えます。</Txt>
                  </View>
                  <Press onPress={() => { haptic.tap(); setConsent(!consent); }} accessibilityRole="checkbox" accessibilityState={{ checked: consent }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: consent ? 0 : 1.5, borderColor: t.line2, backgroundColor: consent ? t.ink : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {consent ? <Icon name="check" size={14} color={t.onInk} width={3} /> : null}
                    </View>
                    <Txt size={14.5} w="600" style={{ flex: 1 }}>保護者の同意を得ています</Txt>
                  </Press>
                </Animated.View>
              ) : null}
            </>
          ) : step === 2 ? (
            <>
              <View>
                <Txt size={24} w="700" lh={32}>目標</Txt>
                <Txt size={13} tone="ink3">同じ志望の人が、いま勉強中に並びます</Txt>
              </View>
              <Field label="志望校（任意）" value={aim} onChangeText={setAim} max={24} />
              <Animated.View layout={SMOOTH} style={{ borderRadius: 14, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line, overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Txt size={15.5}>1日の目標</Txt>
                    <Txt size={11.5} tone="ink3">今日のバーの目標の線になります</Txt>
                  </View>
                  <PickChip on={open === 'goal'} onPress={() => toggle('goal')} label={goalLabel(goal)} a11y="1日の目標を変える" />
                </View>
                {open === 'goal' ? <Opens><GoalPick value={goal} onChange={setGoal} /></Opens> : null}
              </Animated.View>
              <View>
                <Label sub="あとで 設定 › 科目と色 から、数IA・古文のように細かく分けられます">勉強する科目</Label>
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
        <Btn kind="primary" wide label={step === 3 ? 'はじめる' : '次へ'} disabled={step === 1 && child && !consent} onPress={next} />
      </View>
    </KeyboardAvoidingView>
  );
}
