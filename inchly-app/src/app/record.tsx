import { router, useLocalSearchParams } from 'expo-router';
import { ReactNode, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { hm, pad, PERSON_COLOR, subj } from '@/data';
import { celebrate } from '@/moments';
import { addPost, commitHeld, commitRecord, elapsedOf, getState, splitAtMidnight, togglePause, useStore } from '@/store';
import { dateKey } from '@/lib/time';
import { hair, useT } from '@/theme';
import { Empty, haptic, Press, SubjCoin, Txt } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { Stamp } from '@/ui/Sticker';
import { toast } from '@/ui/Toast';
import { Pane } from '@/ui/Glass';

// "Record this study": opened by 終わる on the timer (the clock is paused), or
// for a study set aside when you went on to the next plan (?held=id).
// Written like a post: the subject and the time at the top (the time can be
// fixed by 5 minutes), a memo of how far you got and how it went, and whether
// it stays yours or goes to the timeline too. 記録する saves it and goes back
// to where you were (the timer stays as it was); 続ける goes back too, and the
// clock runs again.

const clock = (d: Date) => `${d.getHours()}:${pad(d.getMinutes())}`;
const MAX = 140;
const POST_BLUE = '#1D9BF0';

export default function Record() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const running = useStore((s) => s.running);
  const before = useStore((s) => s.todayMin);
  const { held: heldId } = useLocalSearchParams<{ held?: string }>();
  const [h] = useState(() => getState().held.find((x) => x.id === heldId));
  const livePlan = useStore((s) => s.planMin);
  const plan = h ? h.planMin ?? null : livePlan;
  const [sid] = useState(() => h?.s ?? getState().subj);
  const sj = subj(sid);
  const [min, setMin] = useState(() => Math.max(1, Math.round((h ? h.sec : elapsedOf(getState())) / 60)));
  const [end] = useState(() => (h ? new Date(h.end) : new Date()));
  const start = new Date(end.getTime() - min * 60_000);
  const [todoId] = useState(() => (h ? undefined : getState().studyTodo ?? undefined));
  const [note, setNote] = useState('');
  const [share, setShare] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'done'>('idle');

  if (!h && !running && phase === 'idle') {
    return (
      <Screen>
        <NavBar title="この勉強を記録" />
        <Empty title="記録する勉強がありません" sub="タイマーで勉強を始めると、ここで記録できます" />
      </Screen>
    );
  }

  // past midnight, the part before it goes to the day before
  const todayPart = splitAtMidnight(min, end).filter((x) => x.date === dateKey(end)).reduce((n, x) => n + x.min, 0);
  const left = MAX - note.length;
  const tooLong = left < 0;
  const adjust = (d: number) => { haptic.tap(); setMin((m) => Math.max(1, Math.min(600, m + d))); };
  const back = () => { const c = getState(); if (!h && c.running && c.paused) togglePause(); router.back(); };

  const save = () => {
    if (tooLong) { haptic.warn(); return; }
    setPhase('saving');
    const text = note.trim();
    const done = h ? commitHeld(h.id, { note: text || undefined, min }) : commitRecord({ todoId, note: text || undefined, min });
    if (!done) { router.back(); return; }
    const { min: m, ticket, exp, levelUp } = done;
    if (share) {
      const a = getState().account;
      addPost({ n: a?.name ?? 'はる', h: a?.handle ?? 'haru_study', c: PERSON_COLOR['はる'], m: a?.grade ?? '高3', mine: true, w: 'たった今',
        t: text || `${sj.name}を${m}分`, tags: [], u: 0, r: 0, rec: { s: sid, min: m, note: text || undefined } });
    }
    haptic.success();
    setPhase('done');
    setTimeout(() => {
      router.back(); // back where you were: the timer stays as you left it
      const sub = [`+${exp} EXP`, ticket ? '7日連続！休み券を1枚もらいました' : '', share ? 'タイムラインにも投稿しました' : ''].filter(Boolean).join(' · ');
      toast(levelUp ? `レベルアップ！ Lv.${levelUp}` : `${sj.name} ${m}分を記録しました`, levelUp ? `${sj.name} ${m}分を記録 · ${sub}` : sub);
      celebrate({ kind: 'record', subject: sid, min: m, exp, level: levelUp, ticket });
    }, 1100); // long enough to see the stamp land
  };

  return (
    <Screen bg={t.backdrop !== 'none' ? undefined : t.surface}>
      {/* over a 背景, the composer is one sheet of glass */}
      {t.backdrop !== 'none' ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.surface }]}><Pane radius={0} /></View> : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* 続ける on the left, 記録する on the right, as a post would have them */}
        <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <Press onPress={back} hitSlop={10} scale={0.94} accessibilityLabel="続ける（タイマーにもどる）">
            <Txt size={15.5} w="500">続ける</Txt>
          </Press>
          <Press onPress={save} haptics={false} scale={0.95} disabled={phase !== 'idle'} accessibilityLabel={`${sj.name} ${min}分を記録する`}
            style={{ height: 36, paddingHorizontal: 18, borderRadius: 18, backgroundColor: POST_BLUE, opacity: tooLong ? 0.5 : 1, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={14.5} w="800" color="#fff">{phase === 'done' ? '記録しました' : '記録する'}</Txt>
          </Press>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <SubjCoin name={sj.name} color={sj.c} size={42} />
            <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Txt size={15} w="800">{sj.name}</Txt>
                <Txt size={12.5} tone="ink3" numberOfLines={1} style={{ flex: 1 }}>{sj.task}</Txt>
              </View>
              <TextInput value={note} onChangeText={setNote} multiline placeholder="どこまでやった？ どうだった？" placeholderTextColor={t.ink3}
                accessibilityLabel="メモ" style={{ minHeight: 120, fontSize: 18, lineHeight: 26, color: t.ink, textAlignVertical: 'top', padding: 0, marginTop: -4, outlineStyle: 'none' } as object} />
              {/* what's attached: the subject, the time (fixable), how it went against the plan */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <Chip>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: sj.c }} />
                  <Txt size={12.5} w="700" tone="ink2">{sj.name}</Txt>
                </Chip>
                <Chip>
                  <Press onPress={() => adjust(-5)} haptics={false} hitSlop={8} scale={0.85} accessibilityLabel="5分へらす"><Icon name="minus" size={13} color={POST_BLUE} width={2.4} /></Press>
                  <Txt num size={13} w="800" accessibilityLabel={`勉強した時間 ${min}分`}>{`${min}分`}</Txt>
                  <Press onPress={() => adjust(5)} haptics={false} hitSlop={8} scale={0.85} accessibilityLabel="5分ふやす"><Icon name="plus" size={13} color={POST_BLUE} width={2.4} /></Press>
                </Chip>
                <Chip><Txt num size={12.5} w="700" tone="ink2">{`${clock(start)}〜${start.getDate() !== end.getDate() ? '翌' : ''}${clock(end)}`}</Txt></Chip>
                {plan ? <Chip><Txt size={12.5} w="700" tone="ink2">{min > plan ? `予定の${plan}分をこえて` : `予定の${plan}分の中で`}</Txt></Chip> : null}
              </View>
              <Press onPress={() => { haptic.tap(); setShare((v) => !v); }} scale={0.98} accessibilityRole="switch" accessibilityState={{ checked: share }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 8, borderBottomWidth: hair, borderBottomColor: t.line }}>
                <Icon name={share ? 'users' : 'user'} size={15} color={POST_BLUE} />
                <Txt size={13.5} w="700" color={POST_BLUE}>{share ? 'タイムラインにも投稿する' : '自分だけのメモ'}</Txt>
              </Press>
            </View>
          </View>
        </ScrollView>

        {/* along the bottom: today's total, and how much room the memo has left */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 10, borderTopWidth: hair, borderTopColor: t.line }}>
          <Txt num size={12.5} tone="ink3" style={{ flex: 1 }}>{`今日 ${hm(before)} → `}<Txt num size={12.5} w="700">{hm(before + todayPart)}</Txt>{todayPart < min ? <Txt size={12} tone="ink3">{`（前の日に${min - todayPart}分）`}</Txt> : null}</Txt>
          {note.length ? <Txt num size={12} color={tooLong ? t.red : t.ink3}>{String(left)}</Txt> : null}
          <Ring used={note.length} />
        </View>
      </KeyboardAvoidingView>

      {phase === 'done' ? (
        <Animated.View entering={FadeIn.duration(150)} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(244,245,248,0.6)' }}>
          <Stamp id="erai" size={150} pop />
        </Animated.View>
      ) : null}
    </Screen>
  );
}

function Chip({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: hair * 2, borderColor: t.line2 }}>
      {children}
    </View>
  );
}

/** How much of the 140 the memo uses, as a small ring: blue, then amber near the end, red past it. */
function Ring({ used }: { used: number }) {
  const t = useT();
  const r = 10, c = 2 * Math.PI * r, f = Math.min(1, used / MAX);
  const col = used > MAX ? t.red : used > MAX - 20 ? t.amber : POST_BLUE;
  return (
    <Svg width={26} height={26} accessible={false}>
      <Circle cx={13} cy={13} r={r} fill="none" stroke={t.sunken} strokeWidth={2.5} />
      <Circle cx={13} cy={13} r={r} fill="none" stroke={col} strokeWidth={2.5} strokeDasharray={`${c * f} ${c}`} strokeLinecap="round" transform="rotate(-90 13 13)" />
    </Svg>
  );
}
