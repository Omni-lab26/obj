import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { PEOPLE, YEAR_HOURS } from '@/data';
import { toggleFollow, useStore } from '@/store';
import { hair, useT } from '@/theme';
import { Avatar, Btn, Card, haptic, IconBtn, Press, Txt } from '@/ui/base';
import { Screen, TopBar } from '@/ui/Chrome';
import { HoloCard } from '@/ui/MeCard';
import { UnderTabs } from '@/ui/Tabs';
import { Sticker } from '@/ui/Sticker';
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
      hitSlop={{ top: 7, bottom: 7 }} style={{ height: 30, paddingHorizontal: 12, borderRadius: 15, justifyContent: 'center', backgroundColor: on ? t.surface : t.ink, borderWidth: hair, borderColor: on ? t.line2 : t.ink }}>
      <Txt size={12} w="600" color={on ? t.ink2 : t.onInk}>{on ? 'フォロー中' : back ? 'フォローを返す' : 'フォロー'}</Txt>
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
  const a = useStore((s) => s.account);
  const [tab, setTab] = useState<Tab>('posts');
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = setTimeout(() => setShown(true), 150); return () => clearTimeout(id); }, []);

  const count = (n: string, label: string, v: Tab) => (
    <Press onPress={() => setTab(v)} scale={0.95} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }} accessibilityLabel={`${n}${label}`}>
      <Txt num size={15} w="700">{n}</Txt>
      <Txt size={12} tone="ink3">{label}</Txt>
    </Press>
  );

  return (
    <Screen>
      <TopBar title="マイページ" right={<IconBtn filled name="gear" label="設定" onPress={() => router.push('/settings')} />} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <HoloCard name={a?.name ?? 'はる'} handle={a?.handle ?? 'haru_study'} goal={a?.aim ? `${a.aim} 志望` : `${a?.grade ?? ''}`}
          stats={[{ v: shown ? String(Math.round(YEAR_HOURS)) : '000', from: '000', label: '時間 / 1年' }, { v: shown ? '23' : '00', from: '00', label: '日連続' }, { v: shown ? '57' : '00', from: '00', label: '位 / 今週' }]} />
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <Txt size={13} tone="ink2" lh={20}>{a?.via === 'demo' || !a ? '高3。数学は青チャート2周目。朝型にしたい（今は夜型）。' : `${a.grade}。`}</Txt>
          <View style={{ flexDirection: 'row', gap: 16, paddingTop: 8 }}>
            {count('56', '投稿', 'posts')}
            {count(String(following.length + 125), 'フォロー', 'following')}
            {count('342', 'フォロワー', 'followers')}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
          <ActionBtn label="プロフィールを編集" doneLabel="保存しました" msg="プロフィールを保存しました" />
          <ActionBtn label="カードを共有" doneLabel="画像を保存しました" msg="カードの画像を保存しました" />
        </View>
        <View style={{ marginTop: 14 }}>
          <UnderTabs value={tab} onChange={setTab} options={[{ v: 'posts', label: '投稿' }, { v: 'following', label: 'フォロー' }, { v: 'followers', label: 'フォロワー' }]} />
        </View>
        {tab === 'posts'
          ? MY_POSTS.map((p, i) => (
              <Card key={i} style={{ marginHorizontal: 16, marginTop: 10 }}>
                <Txt size={11} tone="ink3">{p.w}</Txt>
                <Txt size={13.5} lh={22} style={{ marginTop: 4 }}>{p.t}</Txt>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6, marginLeft: -4 }}>
                  <Sticker name="bulb" size={24} tilt={-8} />
                  <Txt size={11.5} w="600" tone="ink2">役に立った {p.u}</Txt>
                </View>
              </Card>
            ))
          : (
            <Card style={{ marginHorizontal: 16, marginTop: 10, paddingVertical: 2 }} pad={0}>
              {(tab === 'following' ? PEOPLE : [...PEOPLE].reverse()).map((p, i) => (
                <View key={p.h} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 9 }}>
                  {i ? <View style={{ position: 'absolute', top: 0, left: 56, right: 0, height: hair, backgroundColor: t.line }} /> : null}
                  <Avatar name={p.n} color={p.c} size={32} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt size={13.5} w="600">{p.n}</Txt>
                    <Txt size={11} tone="ink3" numberOfLines={1}>@{p.h} · {p.g}</Txt>
                  </View>
                  <FollowBtn h={p.h} back={tab === 'followers'} />
                </View>
              ))}
            </Card>
          )}
      </ScrollView>
    </Screen>
  );
}
