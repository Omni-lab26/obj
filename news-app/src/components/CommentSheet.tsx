import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import {
  addComment,
  getComments,
  getCommentSort,
  isLiked,
  roleOf,
  setCommentSort,
  toggleLike,
  useDataVersion,
} from '@/lib/data';
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

type ReplyTo = { id: number; who: string };

// 字下げは4段まで。それより深い返信は4段目と同じ位置に並べる（docs/screens.md）
const MAX_INDENT = 4;

function Item({ c, depth, onReply }: { c: Comment; depth: number; onReply: (to: ReplyTo) => void }) {
  const liked = isLiked(c.id);
  const ups = c.up + (liked ? 1 : 0);
  const indent = depth > 0 && depth <= MAX_INDENT;
  return (
    <View style={indent ? styles.kidWrap : null}>
      <View style={styles.cm}>
        <View style={styles.cmH}>
          <Text style={styles.who}>{c.who}</Text>
          <Text style={styles.meta}>
            {roleOf(c.who) ? `${roleOf(c.who)} · ` : ''}
            {ago(c.min)}
          </Text>
        </View>
        <Text style={styles.cmT}>{c.t}</Text>
        <View style={styles.cmF}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('comments.like', { n: ups })}
            accessibilityState={{ selected: liked }}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              toggleLike(c.id);
            }}
            style={styles.act}>
            <Icon name={liked ? 'upFilled' : 'up'} size={13} color={liked ? colors.accent : colors.muted} />
            <Text style={[styles.fT, liked && styles.fTOn]}>{ups}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => onReply({ id: c.id, who: c.who })} style={styles.act}>
            <Text style={styles.fT}>{t('comments.reply')}</Text>
          </Pressable>
          {c.kids.length ? <Text style={styles.fT}>{t('comments.replies', { n: countComments(c.kids) })}</Text> : null}
        </View>
      </View>
      {c.kids.map((k) => (
        <Item key={k.id} c={k} depth={depth + 1} onReply={onReply} />
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
  const sort = getCommentSort();
  const [writing, setWriting] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [text, setText] = useState('');
  const [inputH, setInputH] = useState(42);
  const [kb, setKb] = useState(false);
  const [mine, setMine] = useState<number[]>([]); // いま書いたコメントは、並び順にかかわらず上に出す
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const closeBtn = useRef<React.ComponentRef<typeof View>>(null);
  const full = useSharedValue(0);
  const drag = useSharedValue(0);
  const all = getComments(articleId);
  const sorted = sortComments(all, sort, (c) => isLiked(c.id));
  const list = [...sorted.filter((c) => mine.includes(c.id)), ...sorted.filter((c) => !mine.includes(c.id))];
  const total = countComments(all);
  const halfH = Math.round(height * 0.56);
  const fullH = Math.round(height * 0.92);

  // 図を付けて開いたときは、全体に広げて入力欄を出す
  useEffect(() => {
    if (quote) full.set(withTiming(1, { duration: motion.sheet }));
  }, [quote, full]);
  const isWriting = writing || !!quote || !!replyTo;

  const close = () => {
    Keyboard.dismiss();
    setWriting(false);
    setReplyTo(null);
    full.set(withTiming(0, { duration: motion.morph - 60 }));
    onClose();
  };
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  // 開いている間は、Android の戻るボタンとパソコンの Esc でコメント欄だけを閉じる
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeRef.current();
      return true;
    });
    const doc = Platform.OS === 'web' ? globalThis.document : undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    doc?.addEventListener('keyup', onKey);
    // キーボードで操作している人のために、開いたら閉じるボタンへ移る
    if (Platform.OS === 'web') setTimeout(() => (closeBtn.current as unknown as HTMLElement | null)?.focus?.(), 60);
    return () => {
      sub.remove();
      doc?.removeEventListener('keyup', onKey);
    };
  }, [visible]);

  // キーボードが出ている間は、入力欄の下の余白（ホームバーの分）を小さくする
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () =>
      setKb(true)
    );
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setKb(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const pan = Gesture.Pan()
    .onChange((e) => {
      drag.set(e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 90 || e.velocityY > 900) {
        if (full.get() === 1 && e.translationY < 260) full.set(withTiming(0, { duration: motion.sheet }));
        else scheduleOnRN(close);
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

  const startWriting = (to: ReplyTo | null) => {
    setReplyTo(to);
    setWriting(true);
    full.set(withTiming(1, { duration: motion.sheet }));
    // 入力欄がすでに出ているとき（別の人に返信し直す）は、そこへ移る
    input.current?.focus();
  };

  const send = () => {
    const body = [quote ? `〔${t('comments.figure', { title: quote })}〕` : '', text.trim()].filter(Boolean).join('\n');
    if (!body) return;
    const c = addComment(articleId, body, replyTo?.id);
    if (!replyTo) setMine((m) => [c.id, ...m]);
    setText('');
    setInputH(42);
    setReplyTo(null);
    clearQuote();
    setWriting(false);
    Keyboard.dismiss();
    toast(t('comments.posted'));
  };

  return (
    <>
      {visible ? (
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrim]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityLabel={t('article.close')}
            tabIndex={-1}
          />
        </Animated.View>
      ) : null}
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        accessibilityViewIsModal={visible}
        style={[styles.sheet, sheet]}>
        {/* 閉じている間は中身を作らない（見えないボタンにキーボードで止まらない・伸び縮みで並べ直さない） */}
        {visible ? (
          <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={height - fullH} style={{ flex: 1 }}>
            <Animated.View style={[{ flex: 1 }, inner]}>
              <GestureDetector gesture={pan}>
                <View>
                  <View style={styles.grab}>
                    <View style={styles.grabI} />
                  </View>
                  <View style={styles.head}>
                    <Text style={styles.title} accessibilityRole="header">
                      {t('comments.title')} <Text style={styles.count}>{total}</Text>
                    </Text>
                    <Pressable
                      ref={closeBtn}
                      accessibilityRole="button"
                      accessibilityLabel={t('article.close')}
                      onPress={close}
                      style={styles.xHit}>
                      <View style={styles.x}>
                        <Icon name="close" size={16} />
                      </View>
                    </Pressable>
                  </View>
                  <View style={styles.sorts}>
                    {(['top', 'new'] as const).map((k) => (
                      <Pressable
                        key={k}
                        accessibilityRole="button"
                        accessibilityState={{ selected: sort === k }}
                        onPress={() => setCommentSort(k)}
                        style={styles.chipHit}>
                        <View style={[styles.chip, sort === k && styles.chipOn]}>
                          <Text style={[styles.chipT, sort === k && styles.chipTOn]}>{t(`comments.${k}`)}</Text>
                        </View>
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
                  <Item key={c.id} c={c} depth={0} onReply={startWriting} />
                ))}
              </ScrollView>
              {isWriting ? (
                <View style={[styles.composer, { paddingBottom: kb ? 12 : Math.max(insets.bottom, 12) }]}>
                  {quote ? (
                    <View style={styles.quote}>
                      <Text style={styles.quoteT} numberOfLines={1}>
                        {t('comments.figure', { title: quote })}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('comments.removeFigure')}
                        hitSlop={12}
                        onPress={clearQuote}>
                        <Icon name="close" size={13} color={colors.muted} />
                      </Pressable>
                    </View>
                  ) : null}
                  {replyTo ? (
                    <View style={styles.quote}>
                      <Text style={styles.quoteT} numberOfLines={1}>
                        {t('comments.replyTo', { who: replyTo.who })}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('comments.cancelReply')}
                        hitSlop={12}
                        onPress={() => setReplyTo(null)}>
                        <Icon name="close" size={13} color={colors.muted} />
                      </Pressable>
                    </View>
                  ) : null}
                  <View style={styles.row}>
                    <TextInput
                      ref={input}
                      autoFocus
                      multiline
                      value={text}
                      onChangeText={setText}
                      // スマホは文に合わせて自分で伸びる。ブラウザだけ高さを渡す（120 まで）
                      onContentSizeChange={(e) =>
                        setInputH(Math.max(42, Math.min(120, Math.ceil(e.nativeEvent.contentSize.height))))
                      }
                      placeholder={quote ? t('comments.figurePh') : t('comments.placeholder')}
                      placeholderTextColor={colors.muted}
                      style={[styles.input, Platform.OS === 'web' ? { height: inputH } : null]}
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
                  onPress={() => startWriting(null)}
                  style={[styles.fab, { bottom: insets.bottom + 18 }]}>
                  <Icon name="pen" size={16} color={colors.white} strokeWidth={2} />
                  <Text style={styles.fabT}>{t('comments.write')}</Text>
                </Pressable>
              )}
            </Animated.View>
          </KeyboardAvoidingView>
        ) : null}
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
    paddingLeft: 16,
    paddingRight: 11,
    paddingBottom: 4,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  count: { color: colors.muted, fontWeight: '500' },
  // 押せる範囲は 44 四方。見た目の丸は 34
  xHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  x: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sorts: { flexDirection: 'row', gap: 2, paddingHorizontal: 12, paddingBottom: 4 },
  chipHit: { minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface2 },
  chipOn: { backgroundColor: colors.white },
  chipT: { color: '#D7D8DC', fontSize: 11.5, fontWeight: '600' },
  chipTOn: { color: '#111' },
  kidWrap: { marginLeft: 4, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: colors.line },
  cm: { paddingTop: 10 },
  cmH: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  who: { color: colors.text, fontSize: 12.5, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 11.5 },
  cmT: { color: colors.text, fontSize: 13.5, lineHeight: 21, marginTop: 3 },
  cmF: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: -8 },
  // ▲と「返信する」は、見た目は小さいまま押せる高さを 44 にする
  act: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 8 },
  fT: { color: colors.muted, fontSize: 11.5, fontFamily: fonts.mono },
  fTOn: { color: colors.accent, fontFamily: fonts.monoBold },
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
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
    color: colors.text,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
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
