import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { STREAK } from '@/data';
import { useStore } from '@/store';
import { useT } from '@/theme';
import { Btn, Empty, IconBtn, Press, Txt } from '@/ui/base';
import { Screen, TopBar, useTabPad } from '@/ui/Chrome';
import { Growth, useGrowth } from '@/ui/Growth';
import { HoloCard } from '@/ui/MeCard';
import { composeSheet, PostRow } from '@/ui/PostParts';
import { RecordsPanel } from '@/ui/RecordsPanel';
import { UnderTabs } from '@/ui/Tabs';
import { toast } from '@/ui/Toast';

type Tab = 'records' | 'posts';

// My Page: the card, how you're growing, then your records and your posts.
// Who you follow and who follows you open from the counts.
export default function Me() {
  const t = useT();
  const pad = useTabPad();
  const a = useStore((s) => s.account);
  const following = useStore((s) => s.following);
  const posts = useStore((s) => s.posts);
  const mine = posts.filter((p) => p.mine);
  const g = useGrowth(useStore((s) => s.sessions));
  const [tab, setTab] = useState<Tab>('records');
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = setTimeout(() => setShown(true), 150); return () => clearTimeout(id); }, []);

  const count = (n: string, label: string, onPress: () => void) => (
    <Press onPress={onPress} scale={0.95} hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }} accessibilityRole="button" accessibilityLabel={`${n}${label}`}
      style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
      <Txt num size={15} w="700">{n}</Txt>
      <Txt size={12} tone="ink3">{label}</Txt>
    </Press>
  );

  return (
    <Screen>
      <TopBar title="マイページ" right={<IconBtn filled name="gear" label="設定" onPress={() => router.push('/settings')} />} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: pad }}>
        <HoloCard name={a?.name ?? 'はる'} handle={a?.handle ?? 'haru_study'} goal={a?.aim ? `${a.aim} 志望` : a?.grade ?? ''} since="04/26"
          stats={[{ v: shown ? String(Math.floor(g.total)) : '000', from: '000', label: '時間 / 1年' }, { v: shown ? String(STREAK) : '00', from: '00', label: '日連続' }, { v: shown ? '57' : '00', from: '00', label: '位 / 今週' }]} />
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <Txt size={13} tone="ink2" lh={20}>{a?.via === 'demo' || !a ? '高3。数学は青チャート2周目。朝型にしたい（今は夜型）。' : `${a.grade}。`}</Txt>
          <View style={{ flexDirection: 'row', gap: 18, paddingTop: 8 }}>
            {count(String(mine.length), '投稿', () => setTab('posts'))}
            {count(String(following.length + 125), 'フォロー', () => router.push('/follows?tab=following'))}
            {count('342', 'フォロワー', () => router.push('/follows?tab=followers'))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
          <Btn kind="line" small label="プロフィールを編集" onPress={() => toast('プロフィールの編集はこれから作ります')} style={{ flex: 1 }} />
          <Btn kind="line" small label="カードを共有" onPress={() => toast('カードの画像を保存しました')} style={{ flex: 1 }} />
        </View>

        <Growth />

        <View style={{ marginTop: 18 }}>
          <UnderTabs value={tab} onChange={setTab} options={[{ v: 'records', label: '記録' }, { v: 'posts', label: '投稿' }]} />
        </View>
        {tab === 'records' ? <RecordsPanel /> : (
          <View style={{ backgroundColor: t.surface }}>
            {mine.length ? mine.map((p, i) => <PostRow key={p.id} p={p} first={i === 0} />) : <Empty title="まだ投稿していません" sub="今日の記録をつけて投稿できます" />}
            <View style={{ padding: 16 }}>
              <Btn kind="quiet" wide icon="plus" label="投稿する" onPress={composeSheet} />
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
