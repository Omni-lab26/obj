import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '@/store';
import { useT } from '@/theme';
import { Empty } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { PostRow } from '@/ui/PostParts';
import { Pane } from '@/ui/Glass';
import { S, useStd } from '@/ui/stdLook';

// Posts you saved from the timeline, the last one saved first. Opened from the
// menu home slides aside for; take one out with its bookmark button.
export default function Bookmarks() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const ids = useStore((s) => s.bookmarks);
  const posts = useStore((s) => s.posts);
  const list = ids.map((id) => posts.find((p) => p.id === id)).filter((p) => !!p);
  const std = useStd();
  return (
    <Screen>
      <NavBar title="ブックマーク" />
      <View style={[{ flex: 1, backgroundColor: t.surface }, std && { borderTopWidth: 2, borderTopColor: S.ink }]}>
      <Pane radius={0} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {list.length ? list.map((p, i) => <PostRow key={p.id} p={p} first={i === 0} />) : (
          <View style={{ paddingTop: 40 }}>
            <Empty title="ブックマークはまだありません" sub="タイムラインの投稿の しおりのボタンを押すと、ここに残ります" />
          </View>
        )}
      </ScrollView>
      </View>
    </Screen>
  );
}
