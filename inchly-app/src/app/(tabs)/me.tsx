import { router } from 'expo-router';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { gradeOf, useLevel, useStore, useStreak } from '@/store';
import { useT } from '@/theme';
import { Btn, Empty, IconBtn, Press, Txt } from '@/ui/base';
import { Screen, TopBar, useTabPad } from '@/ui/Chrome';
import { Growth, useGrowth } from '@/ui/Growth';
import { HoloCard } from '@/ui/MeCard';
import { composeSheet, PostRow } from '@/ui/PostParts';
import { ChartsPage, LogPage } from '@/ui/RecordsPanel';
import { UnderTabs } from '@/ui/Tabs';
import { toast } from '@/ui/Toast';
import { Pane } from '@/ui/Glass';
import { RefreshScroll } from '@/ui/Loader';
import { replayCharts } from '@/ui/appear';

type Tab = 'growth' | 'log' | 'charts' | 'posts';

function Count({ n, label, onPress }: { n: string; label: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} scale={0.95} hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }} accessibilityRole="button" accessibilityLabel={`${n}${label}`}
      style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
      <Txt num size={15} w="700">{n}</Txt>
      <Txt size={12} tone="ink3">{label}</Txt>
    </Press>
  );
}

// My Page: the card and who you are, then your data in pages — 成長 (how far
// you've come), 記録 (what you did), グラフ (how it adds up) and 投稿. The page
// tabs stick under the top bar. Who you follow / who follows you open from the counts.
export default function Me() {
  const t = useT();
  const pad = useTabPad();
  const a = useStore((s) => s.account);
  const following = useStore((s) => s.following);
  const posts = useStore((s) => s.posts);
  const mine = posts.filter((p) => p.mine);
  const g = useGrowth(useStore((s) => s.sessions));
  const streak = useStreak();
  const level = useLevel();
  const [tab, setTab] = useState<Tab>('growth');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const tabsY = useRef(0);
  const offset = useRef(0);
  // switching pages keeps the tabs in view instead of leaving you halfway down the old page
  const go = (k: Tab) => {
    setTab(k);
    if (offset.current > tabsY.current) scroll.current?.scrollTo({ y: tabsY.current, animated: false });
  };
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = setTimeout(() => setShown(true), 150); return () => clearTimeout(id); }, []);


  return (
    <Screen>
      <TopBar title="マイページ" right={<IconBtn filled name="gear" label="設定" onPress={() => router.push('/settings')} />} />
      <RefreshScroll ref={scroll} onRefresh={replayCharts} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: pad }} stickyHeaderIndices={[3]}
        onScroll={(e) => { offset.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={32}>
        <HoloCard lv={level.lv} name={a?.name ?? 'はる'} handle={a?.handle ?? 'haru_study'} goal={a?.aim ? `${a.aim} 志望` : gradeOf(a ?? null)} since="04/26"
          stats={[{ v: shown ? String(Math.floor(g.total)) : '000', from: '000', label: '時間 / 1年' }, { v: shown ? String(streak) : '00', from: '00', label: '日連続' }, { v: shown ? '57' : '00', from: '00', label: '位 / 今週' }]} />
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <Txt size={13} tone="ink2" lh={20}>{a?.via === 'demo' || !a ? '高3。数学は青チャート2周目。朝型にしたい（今は夜型）。' : `${gradeOf(a)}。`}</Txt>
          <View style={{ flexDirection: 'row', gap: 18, paddingTop: 8 }}>
            <Count n={String(mine.length)} label="投稿" onPress={() => go('posts')} />
            <Count n={String(following.length + 125)} label="フォロー" onPress={() => router.push('/follows?tab=following')} />
            <Count n="342" label="フォロワー" onPress={() => router.push('/follows?tab=followers')} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
          <Btn kind="line" small label="プロフィールを編集" onPress={() => toast('プロフィールの編集はこれから作ります')} style={{ flex: 1 }} />
          <Btn kind="line" small label="カードを共有" onPress={() => toast('カードの画像を保存しました')} style={{ flex: 1 }} />
        </View>

        <View style={{ paddingTop: 14, backgroundColor: t.backdrop !== 'none' ? t.surface : t.canvas }} onLayout={(e) => { tabsY.current = e.nativeEvent.layout.y + 14; }}>
          <Pane radius={0} />
          <UnderTabs value={tab} onChange={go} options={[{ v: 'growth', label: '成長' }, { v: 'log', label: '記録' }, { v: 'charts', label: 'グラフ' }, { v: 'posts', label: '投稿' }]} />
        </View>
        {tab === 'growth' ? <Growth /> : tab === 'log' ? <LogPage /> : tab === 'charts' ? <ChartsPage /> : (
          <View style={{ backgroundColor: t.surface }}>
            <Pane radius={0} />
            {mine.length ? mine.map((p, i) => <PostRow key={p.id} p={p} first={i === 0} />) : <Empty title="まだ投稿していません" sub="今日の記録をつけて投稿できます" />}
            <View style={{ padding: 16 }}>
              <Btn kind="quiet" wide icon="plus" label="投稿する" onPress={composeSheet} />
            </View>
          </View>
        )}
      </RefreshScroll>
    </Screen>
  );
}
