import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addComment, getComments, isLiked, roleOf, toggleLike, useDataVersion } from '@/lib/data';
import type { Comment } from '@/lib/data/types';
import { ago, countComments, sortComments } from '@/lib/format';
import { t } from '@/i18n';
import { colors, fonts, motion, radius } from '@theme';

import { Icon } from './Icon';
import { toast } from './Toast';

export type BarGeo = { left: number; right: number; bottom: number; height: number };

type Props = {
  articleId: string;
  open: SharedValue<number>; // 0＝閉じている、1＝開いている（バーからふくらむ）
  visible: boolean;
  barFull: BarGeo; // タブを全部出しているときのバーの位置
  barMini: BarGeo; // タブが小さいときのバーの位置
  miniP: SharedValue<number>;
  height: number;
  onClose: () => void;
  quote: string | null;
  clearQuote: () => void;
};

function Item({ c, depth, onReply }: { c: Comment; depth: number; onReply: (who: string) => void }) {
  const liked = isLiked(c.id);
  return (
    <View style={depth ? styles.kidWrap : null}>
      <View style={styles.cm}>
        <View style={styles.cmH}>
          <Text style={styles.who}>{c.who}</Text>
          <Text style={styles.meta}>
            {roleOf(c.who) ? `${roleOf(c.who)} · ` : ''}
            {c.min === 0 ? t('comments.now') : ago(c.min)}
          </Text>
        </View>
        <Text style={styles.cmT}>{c.t}</Text>
        <View style={styles.cmF}>
          <Pressable
            accessibilityRole="button"
            hitSlop={6}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              toggleLike(c.id);
            }}
            style={styles.like}>
            <Icon name="up" size={13} color={liked ? colors.accent : colors.muted} />
            <Text style={[styles.fT, liked && { color: colors.accent }]}>{c.up + (liked ? 1 : 0)}</Text>
          </Pressable>
          <Pressable hitSlop={6} onPress={() => onReply(c.who)}>
            <Text style={styles.fT}>{t('comments.reply')}</Text>
          </Pressable>
          {c.kids.length ? <Text style={styles.fT}>返信 {countComments(c.kids)}</Text> : null}
        </View>
      </View>
      {c.kids.map((k) => (
        <Item key={k.id} c={k} depth={Math.min(depth + 1, 4)} onReply={onReply} />
      ))}
    </View>
  );
}

export function CommentSheet({
  articleId,
  open,
  visible,
  barFull,
  barMini,
  miniP,
  height,
  onClose,
  quote,
  clearQuote,
}: Props) {
  useDataVersion();
  const insets = useSafeAreaInsets();
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState('');
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const full = useSharedValue(0);
  const drag = useSharedValue(0);
  const list = sortComments(getComments(articleId), sort);
  const total = countComments(getComments(articleId));
  const halfH = Math.round(height * 0.56);
  const fullH = Math.round(height * 0.92);

  // 図を付けて開いたときは、全体に広げて入力欄を出す
  useEffect(() => {
    if (quote) full.set(withTiming(1, { duration: motion.sheet }));
  }, [quote, full]);
  const isWriting = writing || !!quote;

  const close = () => {
    setWriting(false);
    full.set(0);
    onClose();
  };

  const pan = Gesture.Pan()
    .onChange((e) => {
      drag.set(e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 90 || e.velocityY > 900) {
        if (full.get() === 1 && e.translationY < 260) full.set(withTiming(0, { duration: motion.sheet }));
        else runOnJS(close)();
      } else if (e.translationY < -60) full.set(withTiming(1, { duration: motion.sheet }));
      drag.set(withTiming(0, { duration: 200 }));
    });

  const sheet = useAnimatedStyle(() => {
    const o = open.get();
    const m = miniP.get();
    const g = {
      left: interpolate(m, [0, 1], [barFull.left, barMini.left]),
      right: interpolate(m, [0, 1], [barFull.right, barMini.right]),
      bottom: interpolate(m, [0, 1], [barFull.bottom, barMini.bottom]),
      height: interpolate(m, [0, 1], [barFull.height, barMini.height]),
    };
    const targetH = Math.min(fullH, interpolate(full.get(), [0, 1], [halfH, fullH]) - drag.get());
    const r = interpolate(o, [0, 1], [g.height / 2, radius.sheet]);
    return {
      left: interpolate(o, [0, 1], [g.left, 0]),
      right: interpolate(o, [0, 1], [g.right, 0]),
      bottom: interpolate(o, [0, 1], [g.bottom, 0]),
      height: interpolate(o, [0, 1], [g.height, Math.max(g.height, targetH)]),
      borderTopLeftRadius: r,
      borderTopRightRadius: r,
      borderBottomLeftRadius: interpolate(o, [0, 1], [g.height / 2, 0]),
      borderBottomRightRadius: interpolate(o, [0, 1], [g.height / 2, 0]),
      opacity: o > 0.01 ? 1 : 0,
    };
  });
  const inner = useAnimatedStyle(() => ({ opacity: interpolate(open.get(), [0.45, 1], [0, 1], 'clamp') }));
  const scrim = useAnimatedStyle(() => ({ opacity: open.get() }));

  const send = () => {
    const body = [quote ? `〔図：${quote}〕` : '', text.trim()].filter(Boolean).join('\n');
    if (!body) return;
    addComment(articleId, body);
    setText('');
    clearQuote();
    setWriting(false);
    setSort('new');
    toast(t('comments.posted'));
  };

  return (
    <>
      <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, styles.scrim, scrim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t('article.close')} />
      </Animated.View>
      <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[styles.sheet, sheet]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Animated.View style={[{ flex: 1 }, inner]}>
            <GestureDetector gesture={pan}>
              <View>
                <View style={styles.grab}>
                  <View style={styles.grabI} />
                </View>
                <View style={styles.head}>
                  <Text style={styles.title}>
                    {t('comments.title')} <Text style={styles.count}>{total}</Text>
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('article.close')}
                    onPress={close}
                    style={styles.x}>
                    <Icon name="close" size={16} />
                  </Pressable>
                </View>
                <View style={styles.sorts}>
                  {(['top', 'new'] as const).map((k) => (
                    <Pressable key={k} onPress={() => setSort(k)} style={[styles.chip, sort === k && styles.chipOn]}>
                      <Text style={[styles.chipT, sort === k && { color: '#111' }]}>{t(`comments.${k}`)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </GestureDetector>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
              keyboardShouldPersistTaps="handled">
              {list.map((c) => (
                <Item
                  key={c.id}
                  c={c}
                  depth={0}
                  onReply={(who) => {
                    setText(`@${who} `);
                    setWriting(true);
                    full.set(withTiming(1, { duration: motion.sheet }));
                    setTimeout(() => input.current?.focus(), 200);
                  }}
                />
              ))}
            </ScrollView>
            {isWriting ? (
              <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                {quote ? (
                  <View style={styles.quote}>
                    <Text style={styles.quoteT} numberOfLines={1}>
                      図：{quote}
                    </Text>
                    <Pressable hitSlop={8} onPress={clearQuote}>
                      <Icon name="close" size={13} color={colors.muted} />
                    </Pressable>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    ref={input}
                    autoFocus={!!quote}
                    value={text}
                    onChangeText={setText}
                    placeholder={quote ? '図について、ひとこと' : t('comments.placeholder')}
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    returnKeyType="send"
                    onSubmitEditing={send}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('comments.send')}
                    onPress={send}
                    style={styles.send}>
                    <Icon name="send" size={17} color={colors.white} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('comments.write')}
                onPress={() => {
                  setWriting(true);
                  full.set(withTiming(1, { duration: motion.sheet }));
                  setTimeout(() => input.current?.focus(), motion.sheet);
                }}
                style={[styles.fab, { bottom: insets.bottom + 18 }]}>
                <Icon name="pen" size={16} color={colors.white} strokeWidth={2} />
                <Text style={styles.fabT}>{t('comments.write')}</Text>
              </Pressable>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: colors.scrim, zIndex: 40 },
  sheet: {
    position: 'absolute',
    zIndex: 41,
    overflow: 'hidden',
    backgroundColor: 'rgba(28,29,33,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  grab: { paddingTop: 10, paddingBottom: 6, alignItems: 'center' },
  grabI: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  count: { color: colors.muted, fontWeight: '500' },
  x: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sorts: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface2 },
  chipOn: { backgroundColor: colors.white },
  chipT: { color: '#D7D8DC', fontSize: 11.5, fontWeight: '600' },
  kidWrap: { marginLeft: 4, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: colors.line },
  cm: { paddingTop: 10, paddingBottom: 6 },
  cmH: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  who: { color: colors.text, fontSize: 12.5, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 11.5 },
  cmT: { color: colors.text, fontSize: 13.5, lineHeight: 21, marginTop: 3 },
  cmF: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 5 },
  like: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fT: { color: colors.muted, fontSize: 11.5, fontFamily: fonts.mono },
  fab: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 46,
    paddingLeft: 15,
    paddingRight: 18,
    borderRadius: 23,
    backgroundColor: colors.accent,
  },
  fabT: { color: colors.white, fontSize: 14, fontWeight: '700' },
  composer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: 'rgba(28,29,33,1)',
  },
  quote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surface2,
  },
  quoteT: { color: colors.text, fontSize: 12, flex: 1 },
  input: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    color: colors.text,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  send: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
