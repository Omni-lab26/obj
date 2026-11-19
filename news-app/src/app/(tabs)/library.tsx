import { router, useScrollToTop } from 'expo-router';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Page } from '@/components/Page';
import { Poster } from '@/components/Poster';
import { StatusFade } from '@/components/StatusFade';
import { useShrinkOnScroll } from '@/hooks/useTabBar';
import { getFeed, getGenreLead, getGenres, isSaved, useDataVersion } from '@/lib/data';
import { t } from '@/i18n';
import { colors, feedback, space } from '@theme';

// ライブラリ。ページ左上の題名と説明は出さない（オーナー指定）。
export default function Library() {
  useDataVersion();
  const insets = useSafeAreaInsets();
  const onScroll = useShrinkOnScroll();
  const ref = useRef<React.ComponentRef<typeof Animated.ScrollView>>(null);
  useScrollToTop(ref);
  const feed = getFeed().filter((a) => a.type !== 'note');
  const saved = getFeed().filter((a) => isSaved(a.id));
  const open = (id: string) => router.push({ pathname: '/article/[id]', params: { id } });

  return (
    <Page>
      <Animated.ScrollView
        ref={ref}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}>
        <Sec title={t('library.genres')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {getGenres().map((g) => {
            // ジャンルの画面ができるまでは、そのジャンルの代表の記事を開く
            const a = getGenreLead(g) ?? feed[0];
            return (
              <Pressable key={g.name} style={pressedStyle(styles.genre)} onPress={() => open(a.id)}>
                <Poster a={{ ...a, tag: g.name }} img={`sq${g.img}`} compact style={styles.genreImg} />
                <Text style={styles.genreT}>{g.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Sec title={t('library.latest')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {feed.slice(0, 6).map((a) => (
            <Pressable key={a.id} style={pressedStyle(styles.big)} onPress={() => open(a.id)}>
              <Poster a={a} img={`sq${a.img}`} />
              <View style={{ padding: 10 }}>
                <Text style={styles.small}>{a.when.split(' · ')[0]}</Text>
                <Text style={styles.bigT} numberOfLines={2}>
                  {a.title}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <Sec title={t('library.saved')} />
        {saved.length ? null : <Text style={styles.empty}>{t('library.savedEmpty')}</Text>}
        <View style={styles.grid}>
          {saved.map((a) => (
            <Pressable key={a.id} style={pressedStyle(styles.cell)} onPress={() => open(a.id)}>
              <Poster a={a} img={`th${a.img}`} aspect={16 / 10} compact style={{ borderRadius: 12 }} />
              <Text style={styles.cellT} numberOfLines={2}>
                {a.title}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.ScrollView>
      <StatusFade />
    </Page>
  );
}

const pressedStyle =
  <T,>(base: T) =>
  ({ pressed }: { pressed: boolean }) => [base, pressed && { opacity: feedback.pressedOpacity }];

// 見出し。「すべて見る」の画面ができるまでは › を出さない（押せそうで押せない印を残さない）
function Sec({ title }: { title: string }) {
  return (
    <View style={styles.sec}>
      <Text style={styles.secT} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.page,
    paddingTop: 18,
    paddingBottom: 10,
  },
  secT: { color: colors.text, fontSize: 19, fontWeight: '700' },
  row: { gap: 10, paddingHorizontal: space.page },
  genre: { width: 108 },
  genreImg: { width: 108, borderRadius: 12 },
  genreT: { color: colors.text, fontSize: 12.5, fontWeight: '600', marginTop: 6 },
  big: { width: 232, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.surface },
  bigT: { color: colors.text, fontSize: 12.5, lineHeight: 18 },
  small: { color: colors.muted, fontSize: 11, marginBottom: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: space.page },
  cell: { width: '47%' },
  cellT: { color: colors.text, fontSize: 12.5, lineHeight: 18, marginTop: 6 },
  empty: { color: colors.muted, fontSize: 13, lineHeight: 20, paddingHorizontal: space.page },
});
