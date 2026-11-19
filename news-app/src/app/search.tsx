import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Page } from '@/components/Page';
import { getFeed } from '@/lib/data';
import { searchArticles } from '@/lib/format';
import { t } from '@/i18n';
import { colors, feedback, space } from '@theme';

export default function Search() {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const feed = getFeed();
  const hits = searchArticles(feed, q);
  const trends = [...feed].sort((a, b) => b.c - a.c).slice(0, 5);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const row = ({ pressed }: { pressed: boolean }) => [styles.row, pressed && { opacity: feedback.pressedOpacity }];
  // 下にあるタブの画面まで戻ってから記事を開く（タブの画面を重ねて作らない）
  const open = (id: string) => router.dismissTo({ pathname: '/article/[id]', params: { id } });
  return (
    <Page>
      <View style={[styles.bar, { paddingTop: insets.top + 10 }]}>
        <View style={styles.field}>
          <Icon name="search" size={18} color={colors.muted} />
          <TextInput
            autoFocus
            value={q}
            onChangeText={setQ}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.muted}
            style={styles.input}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            // パソコンの Enter では、いちばん上の記事を開く
            onSubmitEditing={() => Platform.OS === 'web' && hits[0] && open(hits[0].id)}
          />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={back} style={styles.x}>
          <Icon name="close" size={16} />
        </Pressable>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ padding: space.page, gap: 4 }}>
        {!q.trim() ? (
          <>
            <Text style={styles.h}>{t('search.trends')}</Text>
            {trends.map((a) => (
              <Pressable key={a.id} accessibilityRole="link" onPress={() => open(a.id)} style={row}>
                <Text style={styles.tag}>{a.tag}</Text>
                <Text style={styles.title} numberOfLines={2}>
                  {a.title}
                </Text>
                <Text style={styles.sub}>{t('search.voices', { n: a.c })}</Text>
              </Pressable>
            ))}
          </>
        ) : hits.length ? (
          hits.map((a) => (
            <Pressable key={a.id} accessibilityRole="link" onPress={() => open(a.id)} style={row}>
              <Text style={styles.title}>{a.title}</Text>
              <Text style={styles.sub}>{a.when.split(' · ')[0]}</Text>
            </Pressable>
          ))
        ) : (
          // 見つからないときは、言い換えの例を出す（押すとその言葉で探す）
          <View style={styles.none}>
            <Text style={styles.noneT}>{t('search.none', { q: q.trim() })}</Text>
            <Text style={styles.noneS}>{t('search.noneHint')}</Text>
            <View style={styles.tries}>
              {trends.slice(0, 3).map((a) => (
                <Pressable
                  key={a.id}
                  accessibilityRole="button"
                  onPress={() => setQ(a.tag.replace(/^#/, ''))}
                  style={styles.try}>
                  <Text style={styles.tag}>{a.tag}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.page, paddingBottom: 8 },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 14,
    backgroundColor: colors.surface2,
  },
  input: { flex: 1, color: colors.text, fontSize: 15 },
  x: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  h: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  tag: { color: colors.tag, fontSize: 15, fontWeight: '600' },
  title: { color: colors.text, fontSize: 14, lineHeight: 20 },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  none: { alignItems: 'center', paddingTop: 40, gap: 8 },
  noneT: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  noneS: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  tries: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 6 },
  try: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.surface2,
  },
});
