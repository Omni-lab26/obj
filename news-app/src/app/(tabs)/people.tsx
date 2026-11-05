import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Page } from '@/components/Page';
import { useShrinkOnScroll } from '@/hooks/useTabBar';
import { getPosts, roleOf } from '@/lib/data';
import { ago, kfmt } from '@/lib/format';
import { colors, fonts, space } from '@theme';

// みんなの投稿。ページ左上の題名と説明は出さない（オーナー指定）。
export default function People() {
  const insets = useSafeAreaInsets();
  const onScroll = useShrinkOnScroll();
  return (
    <Page>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}>
        {getPosts().map((p) => (
          <View key={p.id} style={styles.post}>
            <View style={styles.by}>
              <View style={styles.av}>
                <Text style={styles.avT}>{p.who.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.who}>{p.who}</Text>
                <Text style={styles.meta}>
                  {roleOf(p.who)} · {ago(p.min)}
                </Text>
              </View>
            </View>
            <Text style={styles.t}>{p.t}</Text>
            {p.link ? (
              <View style={styles.link}>
                <Icon name="link" size={14} color={colors.muted} />
                <Text style={styles.linkT} numberOfLines={1}>
                  {p.link.title} · {p.link.dom}
                </Text>
              </View>
            ) : null}
            <View style={styles.acts}>
              <Text style={styles.tag}>{p.tag}</Text>
              <View style={styles.act}>
                <Icon name="up" size={14} color={colors.faint} />
                <Text style={styles.actT}>{kfmt(p.up)}</Text>
              </View>
            </View>
          </View>
        ))}
      </Animated.ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  post: {
    paddingHorizontal: space.page,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    gap: 8,
  },
  by: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  av: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avT: { color: colors.text, fontWeight: '700' },
  who: { color: colors.text, fontSize: 13.5, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 11 },
  t: { color: colors.text, fontSize: 14, lineHeight: 22 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  linkT: { color: colors.text, fontSize: 12.5, flex: 1 },
  acts: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: { color: colors.tag, fontSize: 12 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actT: { color: colors.faint, fontFamily: fonts.mono, fontSize: 12.5 },
});
