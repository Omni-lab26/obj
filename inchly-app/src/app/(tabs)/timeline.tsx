import { ComponentRef, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ROOM } from '@/data';
import { useStore } from '@/store';
import { useT } from '@/theme';
import { Empty, Press } from '@/ui/base';
import { Screen, SearchBtn, TopBar, useBarsTop, useTabPad } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { fadeIn } from '@/ui/motion';
import { composeSheet, PostRow } from '@/ui/PostParts';
import { UnderTabs } from '@/ui/Tabs';
import { Pane } from '@/ui/Glass';
import { RefreshScroll } from '@/ui/Loader';

type Feed = 'all' | 'following';

// The timeline: what people are studying and saying, newest first. Study
// records ride along with posts, so "I did 70 minutes of physics" reads as news.
export default function Timeline() {
  const t = useT();
  const barsTop = useBarsTop();
  const pad = useTabPad();
  const [feed, setFeed] = useState<Feed>('all');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const posts = useStore((s) => s.posts);
  const blocked = useStore((s) => s.blocked);
  const following = useStore((s) => s.following);
  const followNames = ROOM.filter((p) => following.includes(p.h)).map((p) => p.n);
  const list = posts.filter((p) => !blocked.includes(p.n) && (feed === 'all' || p.mine || followNames.includes(p.n)));
  const go = (f: Feed) => { setFeed(f); scroll.current?.scrollTo({ y: 0, animated: false }); };
  return (
    <Screen>
      <TopBar title="タイムライン" right={<SearchBtn />} />
      <UnderTabs value={feed} onChange={go} options={[{ v: 'all', label: 'おすすめ' }, { v: 'following', label: 'フォロー中' }]} />
      <View style={{ flex: 1, backgroundColor: t.surface }}>
      <Pane radius={0} />
      <RefreshScroll ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: pad + 40 }}>
        <Animated.View key={feed} entering={fadeIn()}>
          {list.length ? list.map((p, i) => <PostRow key={p.id} p={p} first={i === 0} />) : (
            <View style={{ paddingTop: 40 }}>
              <Empty title="まだ投稿がありません" sub="フォローした人の投稿がここに並びます" />
            </View>
          )}
        </Animated.View>
      </RefreshScroll>
      </View>
      {/* write: a round button above the tab bar and the study bar, where the thumb already is */}
      <Press onPress={composeSheet} scale={0.9} accessibilityLabel="投稿する"
        style={{ position: 'absolute', right: 20, bottom: barsTop + 12, width: 54, height: 54, borderRadius: 27, backgroundColor: t.ink,
          alignItems: 'center', justifyContent: 'center', boxShadow: '0px 6px 18px rgba(18,20,23,0.28)' }}>
        <Icon name="plus" size={24} color={t.onInk} width={2.4} />
      </Press>
    </Screen>
  );
}
