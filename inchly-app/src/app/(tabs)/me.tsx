import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { PEOPLE, YEAR_HOURS } from '@/data';
import { setState, toggleFollow, useStore } from '@/store';
import { useT } from '@/theme';
import { Avatar, Btn, haptic, IconBtn, Press, Txt } from '@/ui/base';
import { Screen, TopBar } from '@/ui/Chrome';
import { HoloCard } from '@/ui/MeCard';
import { openSheet } from '@/ui/Sheet';
import { UnderTabs } from '@/ui/Tabs';
import { toast } from '@/ui/Toast';

type Tab = 'posts' | 'following' | 'followers';

function Setting({ label, sub, k }: { label: string; sub: string; k: 'showLive' | 'showRank' }) {
  const t = useT();
  const on = useStore((x) => x[k]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: t.line }}>
      <View style={{ flex: 1 }}>
        <Txt size={15} w="500">{label}</Txt>
        <Txt size={12.5} tone="ink3">{sub}</Txt>
      </View>
      <Switch value={on} onValueChange={(v) => { haptic.tap(); setState({ [k]: v }); }} trackColor={{ true: t.green, false: t.line2 }} thumbColor="#fff" ios_backgroundColor={t.line2} accessibilityLabel={label} />
    </View>
  );
}
const openSettings = () =>
  openSheet(() => (
    <View>
      <Txt size={18} w="700" style={{ marginBottom: 4 }}>見せ方</Txt>
      <Setting k="showLive" label="勉強中をみんなに見せる" sub="「みんな」の自習室に並びます" />
      <Setting k="showRank" label="順位を公開する" sub="オフでも自分の順位は見られます" />
      <Txt size={12.5} tone="ink3" style={{ marginTop: 14 }}>Inchly 1.0（モック）</Txt>
    </View>
  ));
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

  return (
    <Screen>
      <TopBar title="マイページ" right={<IconBtn name="gear" label="設定" onPress={openSettings} />} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <HoloCard name="はる" handle="haru_study" goal="東大 理一 志望"
          stats={[{ v: shown ? String(Math.round(YEAR_HOURS)) : '000', from: '000', label: '時間 / 1年' }, { v: shown ? '23' : '00', from: '00', label: '日連続' }, { v: shown ? '57' : '00', from: '00', label: '位 / 今週' }]} />
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Txt size={14} tone="ink2" lh={22}>高3。数学は青チャート2周目。朝型にしたい（今は夜型）。</Txt>
          <View style={{ flexDirection: 'row', gap: 18, paddingTop: 10 }}>
            {count('56', '投稿', 'posts')}
            {count(String(following.length + 125), 'フォロー', 'following')}
            {count('342', 'フォロワー', 'followers')}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 14 }}>
          <ActionBtn label="プロフィールを編集" doneLabel="保存しました" msg="プロフィールを保存しました" />
          <ActionBtn label="カードを共有" doneLabel="画像を保存しました" msg="カードの画像を保存しました" />
        </View>
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
