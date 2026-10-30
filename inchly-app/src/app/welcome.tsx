import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SUBJ } from '@/data';
import { ageOf, gradeNow, OTHER_GRADES, pickGrade, SCHOOL } from '@/lib/grade';
import { notificationsAllowed } from '@/lib/notify';
import { Account, setState, signIn } from '@/store';
import { bundledFace, font, hair, useT } from '@/theme';
import { Btn, haptic, IconBtn, Press, StdIcon, StdLink, Txt } from '@/ui/base';
import { Wordmark } from '@/ui/Brand';
import { Creature, LogoMark } from '@/themes/standard/pixel';
import { ring, S, SR, useStd } from '@/ui/stdLook';
import { TextureFill } from '@/ui/Texture';
import { GoalPick, goalLabel, Opens, PickChip, SMOOTH, YearMonthPick } from '@/ui/DateTime';
import { Choice, Field, Label, StdSwitch } from '@/ui/Form';
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
  const std = useStd();
  // スタンダード: the boxes are cards with the 2pt ink outline (on the outer view; the inner one clips its rows)
  const box = std ? { borderRadius: SR.mid, backgroundColor: S.card, borderWidth: 0, boxShadow: ring() } : null;
  const insets = useSafeAreaInsets();
  const short = useWindowDimensions().height < 700;
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

  if (step === 0 && std) {
    // スタンダード: paper with its dots, the logo, めぶ (who greets the first-timers), the four promises with pixel icons, and keys.
    // On a short phone (the iPhone SE, its status bar 20 high) it sits closer, and it scrolls rather than run past the bottom.
    return (
      <View style={{ flex: 1, backgroundColor: S.paper }}>
        <TextureFill texture="dots-paper" />
        <ScrollView bounces={false} showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + (short ? 24 : 44), paddingBottom: insets.bottom + 20, paddingHorizontal: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessible accessibilityRole="header" accessibilityLabel="Inchly">
          <LogoMark size={32} />
          <Txt style={{ fontFamily: bundledFace('groteskBold') ?? font.display, fontWeight: bundledFace('groteskBold') ? undefined : '800', fontSize: 30, lineHeight: 36, letterSpacing: -1.2, color: S.ink }}>inchly</Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: short ? 18 : 26 }}>
          <Txt size={28} w="800" lh={38} style={{ flex: 1 }}>少しずつ、毎日。</Txt>
          <Creature id="mebu" face="happy" px={3} />
        </View>
        {/* each sentence on its own line (at 15pt the first one leaves る。 alone on the next) */}
        <Txt size={14} tone="ink2" lh={23} style={{ marginTop: 8 }}>
          勉強した時間を記録して、積み上がりを目で見る。{'\n'}同じ目標の仲間と、同じ時間に机に向かう。
        </Txt>
        <View style={{ gap: short ? 10 : 14, marginTop: short ? 18 : 26 }}>
          {([['clock', '測る', 'タイマーを止めると記録になる'], ['feed', '見える', '今日のバー、草、連続日数'], ['users', '一緒に', 'いま勉強中の仲間と始める'], ['cal', '次', 'ToDoと締切で、次にやることが決まる']] as const).map(([ic, a, b]) => (
            <View key={a} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: SR.tile, backgroundColor: S.card, boxShadow: ring(), alignItems: 'center', justifyContent: 'center' }}>
                <StdIcon name={ic} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={15} w="700" lh={20}>{a}</Txt>
                <Txt size={13} tone="ink2" lh={18}>{b}</Txt>
              </View>
            </View>
          ))}
        </View>
        <View style={{ flex: 1, minHeight: 20 }} />
        <View style={{ gap: short ? 12 : 14 }}>
          <Btn kind="primary" wide label="Appleでサインイン" onPress={() => { setVia('apple'); setStep(1); }} />
          <Btn wide label="Googleでサインイン" onPress={() => { setVia('google'); setStep(1); }} />
          <Btn wide label="メールアドレスで続ける" onPress={() => { setVia('mail'); setStep(1); }} />
          <View style={{ alignSelf: 'center', marginTop: 2 }}><StdLink label="サンプルのアカウントで見る" onPress={() => finish(DEMO)} /></View>
        </View>
        </ScrollView>
      </View>
    );
  }
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
      {std ? <TextureFill texture="dots-paper" /> : null}
      <View style={[{ paddingTop: insets.top + 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }, std && { paddingHorizontal: 16, paddingBottom: 4, gap: 12 }]}>
        {std ? <IconBtn name="back" label="戻る" onPress={() => setStep((step - 1) as Step)} /> : (
        <Press onPress={() => setStep((step - 1) as Step)} hitSlop={8} accessibilityLabel="戻る" style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" size={22} color={t.ink} />
        </Press>
        )}
        {/* スタンダード: three ink-edged cells, the steps done filled in ink */}
        <View style={{ flex: 1, flexDirection: 'row', gap: std ? 6 : 4 }} accessible accessibilityLabel={`${step} / 3`}>
          {[1, 2, 3].map((i) => <View key={i} style={[{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? t.ink : t.sunken }, std && { height: 8, borderRadius: 0, backgroundColor: i <= step ? S.ink : S.card, boxShadow: ring(1.5) }]} />)}
        </View>
        <View style={{ width: std ? 44 : 40 }} />
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
              <Animated.View layout={SMOOTH} style={[{ borderRadius: 14, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line, overflow: 'hidden' }, box, std && { overflow: 'visible' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Txt size={15.5}>生まれた年月</Txt>
                    <Txt size={11.5} tone="ink3">ほかの人には見えません</Txt>
                  </View>
                  <PickChip on={open === 'birth'} onPress={() => toggle('birth')} label={`${year}年${month}月`} a11y="生まれた年月を変える" />
                </View>
                {open === 'birth' ? <Opens><YearMonthPick year={year} month={month} min={1950} max={THIS_YEAR - 5} onChange={(y, m) => { setYear(y); setMonth(m); }} /></Opens> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 14, borderTopWidth: std ? 1.5 : hair, borderTopColor: t.line }}>
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
                <Animated.View entering={fadeIn()} style={[{ padding: 14, borderRadius: 14, backgroundColor: t.surface, borderWidth: hair, borderColor: consent ? t.line : t.line2, gap: 10 }, box]}>
                  <View style={{ gap: 2 }}>
                    <Txt size={14} w="700">13歳未満の方へ</Txt>
                    <Txt size={12.5} tone="ink2" lh={19}>使う前に、おうちの人に Inchly を使ってよいか聞いてください。勉強の記録は、ほかの人にも見えます。</Txt>
                  </View>
                  <Press onPress={() => { haptic.tap(); setConsent(!consent); }} accessibilityRole="checkbox" accessibilityState={{ checked: consent }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[{ width: 24, height: 24, borderRadius: 7, borderWidth: consent ? 0 : 1.5, borderColor: t.line2, backgroundColor: consent ? t.ink : 'transparent', alignItems: 'center', justifyContent: 'center' },
                      std && { borderWidth: 0, backgroundColor: consent ? S.lime : S.card, boxShadow: ring() }]}>
                      {consent ? <Icon name="check" size={14} color={std ? S.ink : t.onInk} width={3} /> : null}
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
              <Animated.View layout={SMOOTH} style={[{ borderRadius: 14, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line, overflow: 'hidden' }, box, std && { overflow: 'visible' }]}>
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
                <Label sub={std ? 'あとで 設定 › 科目と色 から、\n数IA・古文のように細かく分けられます' : 'あとで 設定 › 科目と色 から、数IA・古文のように細かく分けられます'}>勉強する科目</Label>
                <Txt size={13} tone="ink2">{SUBJ.map((x) => x.name).join('・')}</Txt>
              </View>
            </>
          ) : (
            <>
              <View>
                <Txt size={24} w="700" lh={32}>お知らせ</Txt>
                <Txt size={13} tone="ink3">いるものだけ選んでください</Txt>
              </View>
              <View style={[{ backgroundColor: t.surface, borderRadius: 16, borderWidth: hair, borderColor: t.line, paddingHorizontal: 14 }, box]}>
                {([['peers', '仲間が勉強を始めた', '一緒に始めるきっかけに'], ['deadlines', '締切が近い', '模試や申込の3日前と前日'], ['goal', '目標まであと少し', '今日の目標まで15分のとき']] as const).map(([k, a, b], i) => (
                  <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i ? (std ? 1.5 : hair) : 0, borderTopColor: t.line }}>
                    <View style={{ flex: 1 }}>
                      <Txt size={14} w="500">{a}</Txt>
                      <Txt size={12} tone="ink3">{b}</Txt>
                    </View>
                    {std ? <StdSwitch value={notify[k]} onChange={(v) => setNotify({ ...notify, [k]: v })} label={a} /> : <Switch value={notify[k]} onValueChange={(v) => { haptic.tap(); setNotify({ ...notify, [k]: v }); }} trackColor={{ true: t.green, false: t.line2 }} thumbColor="#fff" ios_backgroundColor={t.line2} accessibilityLabel={a} />}
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
