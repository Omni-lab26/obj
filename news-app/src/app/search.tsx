import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Page } from '@/components/Page';
import { getFeed } from '@/lib/data';
import { t } from '@/i18n';
import { colors, space } from '@theme';

export default function Search() {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const feed = getFeed();
  const hits = q.trim() ? feed.filter((a) => (a.title + a.tag + (a.text ?? '')).includes(q.trim())) : [];
  const open = (id: string) => router.replace({ pathname: '/article/[id]', params: { id } });
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
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          style={styles.x}>
          <Icon name="close" size={16} />
        </Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.page, gap: 4 }}>
        {!q.trim() ? (
          <>
            <Text style={styles.h}>{t('search.trends')}</Text>
            {[...feed]
              .sort((a, b) => b.c - a.c)
              .slice(0, 5)
              .map((a) => (
                <Pressable key={a.id} onPress={() => open(a.id)} style={styles.row}>
                  <Text style={styles.tag}>{a.tag}</Text>
                  <Text style={styles.sub}>{a.c}件の声</Text>
                </Pressable>
              ))}
          </>
        ) : hits.length ? (
          hits.map((a) => (
            <Pressable key={a.id} onPress={() => open(a.id)} style={styles.row}>
              <Text style={styles.title}>{a.title}</Text>
              <Text style={styles.sub}>{a.when.split(' · ')[0]}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.sub}>{t('search.none', { q })}</Text>
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
});
