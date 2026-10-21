import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PEOPLE } from '@/data';
import { toggleFollow, useStore } from '@/store';
import { useT } from '@/theme';
import { Avatar, Btn, haptic, Press, Txt } from '@/ui/base';
import { Screen, TopBar } from '@/ui/Chrome';
import { HoloCard } from '@/ui/MeCard';
import { Rolling } from '@/ui/Rolling';
import { UnderTabs } from '@/ui/Tabs';
import { toast } from '@/ui/Toast';

type Tab = 'posts' | 'following' | 'followers';
const MY_POSTS = [
  { t: '模試の偏差値、3か月で +6.6。数学の「次にやること」を毎回決めるようにしてから、机に向かうまでが早くなった。', w: '2時間前', u: 54 },
  { t: '古文単語、朝の10分だけでも草が埋まるのがうれしい。', w: '昨日', u: 31 },
];

function FollowBtn({ h, back }: { h: string; back?: boolean }) {
  const t = useT();
  const on = useStore((s) => s.following.includes(h));
  return (
    <Press onPress={() => { haptic.soft(); toggleFollow(h); }} scale={0.95} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={{ height: 32, paddingHorizontal: 14, borderRadius: 9, justifyContent: 'center', backgroundColor: on ? t.sunken : t.ink }}>
      <Txt size={13} w="700" color={on ? t.ink2 : t.onInk}>{on ? 'フォロー中' : back ? 'フォローを返す' : 'フォロー'}</Txt>
    </Press>
  );
}

function ActionBtn({ label, doneLabel, msg }: { label: string; doneLabel: string; msg: string }) {
  const [phase, setPhase] = useState<'idle' | 'busy' | 'done'>('idle');
  const run = () => {
    setPhase('busy');
    setTimeout(() => {
      setPhase('done');
      haptic.success();
      toast(msg);
      setTimeout(() => setPhase('idle'), 1600);
    }, 700);
  };
  return <Btn kind="line" small label={phase === 'done' ? doneLabel : label} loading={phase === 'busy'} done={phase === 'done'} onPress={run} style={{ flex: 1 }} />;
}

export default function Me() {
  const t = useT();
  const following = useStore((s) => s.following);
  const [tab, setTab] = useState<Tab>('posts');
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = setTimeout(() => setShown(true), 150); return () => clearTimeout(id); }, []);

  const count = (n: string, label: string, v: Tab) => (
    <Press onPress={() => setTab(v)} scale={0.95} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }} accessibilityLabel={`${n}${label}`}>
      <Txt num size={16} w="600">{n}</Txt>
      <Txt size={13} tone="ink3">{label}</Txt>
    </Press>
  );
  const stat = (v: string, from: string, label: string, i: number) => (
    <View style={{ flex: 1, paddingVertical: 14, paddingLeft: i ? 16 : 0, borderLeftWidth: i ? StyleSheet.hairlineWidth * 2 : 0, borderLeftColor: t.line, gap: 2 }}>
      <Rolling value={shown ? v : from} size={22} />
      <Txt size={12} tone="ink3">{label}</Txt>
    </View>
  );

  return (
    <Screen>
      <TopBar title="マイページ" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Avatar name="H" color="#6E56CF" size={64} />
            <View>
              <Txt size={20} w="700" lh={28}>はる</Txt>
              <Txt num size={13} tone="ink3">@haru_study</Txt>
            </View>
          </View>
          <Txt size={14} tone="ink2" style={{ marginTop: 12 }}>高3 · 東大 理科一類志望。数学は青チャートを2周目。朝型にしたい。</Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 18, paddingHorizontal: 20, paddingTop: 12 }}>
          {count('56', '投稿', 'posts')}
          {count(String(following.length + 125), 'フォロー', 'following')}
          {count('342', 'フォロワー', 'followers')}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 14 }}>
          <ActionBtn label="プロフィールを編集" doneLabel="保存しました" msg="プロフィールを保存しました" />
          <ActionBtn label="カードを共有" doneLabel="画像を保存しました" msg="カードの画像を保存しました" />
        </View>
        <View style={{ flexDirection: 'row', marginHorizontal: 20, marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth * 2, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderColor: t.line }}>
          {stat('1,284h', '0,000h', '合計時間', 0)}
          {stat('23日', '00日', '連続日数', 1)}
          {stat('57位', '00位', '今週の順位', 2)}
        </View>
        <HoloCard name="はる" />
        <View style={{ marginTop: 18 }}>
          <UnderTabs value={tab} onChange={setTab} options={[{ v: 'posts', label: '投稿' }, { v: 'following', label: 'フォロー' }, { v: 'followers', label: 'フォロワー' }]} />
        </View>
        {tab === 'posts'
          ? MY_POSTS.map((p, i) => (
              <View key={i} style={{ paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: i ? StyleSheet.hairlineWidth * 2 : 0, borderTopColor: t.line }}>
                <Txt size={12} tone="ink3">{p.w}</Txt>
                <Txt size={14.5} lh={25} style={{ marginTop: 6 }}>{p.t}</Txt>
                <Txt size={12} tone="ink3" style={{ marginTop: 8 }}>役に立った {p.u}</Txt>
              </View>
            ))
          : (tab === 'following' ? PEOPLE : [...PEOPLE].reverse()).map((p) => (
              <View key={p.h} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10 }}>
                <Avatar name={p.n} color={p.c} size={38} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt size={14.5} w="500">{p.n}</Txt>
                  <Txt size={12} tone="ink3" numberOfLines={1}>@{p.h} · {p.g}</Txt>
                </View>
                <FollowBtn h={p.h} back={tab === 'followers'} />
              </View>
            ))}
      </ScrollView>
    </Screen>
  );
}
