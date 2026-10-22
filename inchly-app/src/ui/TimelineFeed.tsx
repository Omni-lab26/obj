import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ROOM } from '@/data';
import { useStore } from '@/store';
import { useT } from '@/theme';
import { Empty } from '@/ui/base';
import { PostRow } from '@/ui/PostParts';
import { Segmented } from '@/ui/Tabs';

type Feed = 'all' | 'following';

// The timeline, inside Community: what people are studying and saying, newest
// first. Study records ride along with posts, so "70 minutes of physics" reads as news.
export function TimelineFeed() {
  const t = useT();
  const [feed, setFeed] = useState<Feed>('all');
  const posts = useStore((s) => s.posts);
  const blocked = useStore((s) => s.blocked);
  const following = useStore((s) => s.following);
  const followNames = ROOM.filter((p) => following.includes(p.h)).map((p) => p.n);
  const list = posts.filter((p) => !blocked.includes(p.n) && (feed === 'all' || p.mine || followNames.includes(p.n)));
  return (
    <View style={{ gap: 10, paddingTop: 12 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <Segmented value={feed} onChange={setFeed} options={[{ v: 'all', label: 'おすすめ' }, { v: 'following', label: 'フォロー中' }]} />
      </View>
      <Animated.View key={feed} entering={FadeIn.duration(200)} style={{ backgroundColor: t.surface }}>
        {list.length ? list.map((p, i) => <PostRow key={p.id} p={p} first={i === 0} />) : (
          <View style={{ paddingTop: 20 }}>
            <Empty title="まだ投稿がありません" sub="フォローした人の投稿がここに並びます" />
          </View>
        )}
      </Animated.View>
    </View>
  );
}
