import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { hm, hms, PERSON_COLOR, Post, Rec, ROOM, subj } from '../data';
import { PHOTO } from '../photos';
import { getState, startStudy, useNow } from '../store';
import { ease, hair, lift, radius, useT } from '../theme';
import { Btn, haptic, Press, RingAvatar, Txt } from './base';
import { Icon } from './Icon';
import { openSheet } from './Sheet';
import { Inch } from './Sticker';
import { toast } from './Toast';

// Instagram's post, as a card: who and when on top, the picture (a photo, or
// the study session drawn as a tile), the action row — like, comment, send,
// save — then the count, the caption with the name in bold, and the time.

/** The card shell: white, rounded, a faint edge and a short shadow; media runs edge to edge. */
function Shell({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <View style={[{ borderRadius: radius.card + 2, backgroundColor: t.surface }, lift(t)]}>
      <View style={{ borderRadius: radius.card + 2, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

function Head({ n, c, m, live }: { n: string; c: string; m: string; live?: boolean }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 10, paddingRight: 6, height: 52 }}>
      <RingAvatar name={n} color={c} size={30} live={live} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={13.5} w="600" lh={17} numberOfLines={1}>{n}</Txt>
        <Txt size={11.5} tone="ink3" lh={15} numberOfLines={1}>{m}</Txt>
      </View>
      <Press onPress={() => toast('この投稿をミュートしました', `${n} の記録はしばらく表示しません`)} hitSlop={10} accessibilityLabel="その他" style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="more" size={18} color={t.ink} />
      </Press>
    </View>
  );
}

/** Like · comment · send ··· save, the counts and the caption. */
function Foot({ n, likes, comments, caption, w, tags }: { n: string; likes: number; comments: number; caption: string; w: string; tags?: string[] }) {
  const t = useT();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const like = () => {
    if (!liked) { haptic.soft(); s.set(withSequence(withTiming(1.3, { duration: 110, easing: ease.out }), withSpring(1, { damping: 7, stiffness: 260 }))); }
    setLiked(!liked);
  };
  return (
    <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, height: 44 }}>
        <Press onPress={like} haptics={false} scale={0.9} hitSlop={8} accessibilityLabel={liked ? 'いいねを取り消す' : 'いいね'} accessibilityState={{ selected: liked }}>
          <Animated.View style={a}><Icon name="heart" size={24} color={liked ? t.like : t.ink} filled={liked} width={1.8} /></Animated.View>
        </Press>
        <Press onPress={() => toast('コメントはもうすぐ使えます')} hitSlop={8} scale={0.9} accessibilityLabel="コメント"><Icon name="chat" size={23} color={t.ink} width={1.8} /></Press>
        <Press onPress={() => toast('グループに送りました', '東大 理一 2027')} hitSlop={8} scale={0.9} accessibilityLabel="送る"><Icon name="plane" size={22} color={t.ink} width={1.8} /></Press>
        <View style={{ flex: 1 }} />
        <Press onPress={() => { haptic.tap(); setSaved(!saved); }} haptics={false} hitSlop={8} scale={0.9} accessibilityLabel={saved ? '保存を取り消す' : '保存'}>
          <Icon name="bookmark" size={23} color={t.ink} filled={saved} width={1.8} />
        </Press>
      </View>
      <Txt size={13} w="600" num>{`いいね！ ${likes + (liked ? 1 : 0)}件`}</Txt>
      {caption ? (
        <Txt size={13.5} lh={20} style={{ marginTop: 2 }}>
          <Txt size={13.5} w="600">{`${n}  `}</Txt>{caption}
          {tags?.length ? <Txt size={13.5} color={t.blue}>{`  ${tags.join(' ')}`}</Txt> : null}
        </Txt>
      ) : null}
      {comments ? <Txt size={13} tone="ink3" style={{ marginTop: 3 }}>{`コメント${comments}件をすべて見る`}</Txt> : null}
      <Txt size={10.5} tone="ink3" style={{ marginTop: 4 }}>{w}</Txt>
    </View>
  );
}

/** A friend's study session as a post: the time large, the subject's colour, today's ruler with Inch. */
export function RecordPost({ r }: { r: Rec }) {
  const t = useT();
  const sj = subj(r.s);
  const share = Math.min(1, r.min / 180);
  return (
    <Shell>
      <Head n={r.n} c={r.c} m={`${r.m}・${sj.name}を記録`} live={r.live} />
      <View style={{ aspectRatio: 1.45, backgroundColor: sj.c + '16', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: sj.c }} />
          <Txt size={12} w="600" color={t.ink2}>{sj.name}</Txt>
          <Txt size={12} tone="ink3">{sj.task}</Txt>
        </View>
        <View>
          <Txt num size={52} w="700" lh={58} style={{ letterSpacing: -1.5 }}>{`${Math.floor(r.min / 60)}:${String(r.min % 60).padStart(2, '0')}`}</Txt>
          <Txt size={12} tone="ink2">{`今日の合計 ${hm(r.min + 35)}`}</Txt>
        </View>
        {/* the inch ruler, with Inch where the session ends */}
        <View style={{ height: 30, justifyContent: 'flex-end' }}>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(17,20,23,0.07)', overflow: 'hidden' }}>
            <View style={{ width: `${share * 100}%`, height: 8, borderRadius: 4, backgroundColor: sj.c }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
            {Array.from({ length: 13 }, (_, i) => <View key={i} style={{ width: 1, height: i % 4 === 0 ? 5 : 3, backgroundColor: t.ink3, opacity: 0.5 }} />)}
          </View>
          <View style={{ position: 'absolute', left: `${share * 100}%`, bottom: 10, marginLeft: -22 }}>
            <Inch pose="arch" eyes="happy" size={30} border={false} />
          </View>
        </View>
      </View>
      <Foot n={r.n} likes={r.likes} comments={r.comments} caption={r.note} w={r.w} />
    </Shell>
  );
}

/** A photo or text post. */
export function PhotoPost({ p }: { p: Post }) {
  const t = useT();
  return (
    <Shell>
      <Head n={p.n} c={p.c} m={p.m} />
      {p.img ? (
        <Image source={PHOTO[p.img]} style={{ width: '100%', aspectRatio: 1, backgroundColor: t.sunken }} resizeMode="cover" />
      ) : (
        // a text-only post becomes a quiet quote card, like a text story
        <View style={{ marginHorizontal: 12, borderRadius: radius.inner, backgroundColor: t.canvas, borderWidth: hair, borderColor: t.line, padding: 16, minHeight: 120, justifyContent: 'center' }}>
          <Txt size={17} w="600" lh={26}>{p.t}</Txt>
        </View>
      )}
      <Foot n={p.n} likes={p.u} comments={p.r} caption={p.img ? p.t : ''} w={p.w} tags={p.tags} />
    </Shell>
  );
}

// ---------- stories: who is studying right now ----------
export function Stories({ running }: { running: boolean }) {
  const t = useT();
  const now = useNow();
  const [start] = useState(() => Date.now());
  const since = Math.floor((now - start) / 1000);
  const people = ROOM.slice(0, 8);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 6, paddingVertical: 6 }}>
      <Press onPress={() => router.push('/timer')} scale={0.94} accessibilityLabel={running ? 'あなたは勉強中' : '勉強を始める'} style={{ width: 72, alignItems: 'center' }}>
        <View>
          <RingAvatar name="はる" color={PERSON_COLOR['はる']} size={58} live={running} />
          {running ? null : (
            <View style={{ position: 'absolute', right: 2, bottom: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: t.blue, borderWidth: 2.5, borderColor: t.canvas, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={11} color="#fff" width={3} />
            </View>
          )}
        </View>
        <Txt size={11.5} lh={15} tone="ink2" numberOfLines={1} style={{ marginTop: 3 }}>{running ? '勉強中' : '始める'}</Txt>
      </Press>
      {people.map((p, i) => (
        <Press key={p.h} onPress={() => story(p.n, p.c, p.s, p.t + since)} scale={0.94} accessibilityLabel={`${p.n} ${p.s}を勉強中`} style={{ width: 72, alignItems: 'center' }}>
          <RingAvatar name={p.n} color={p.c} size={58} live seen={i > 5} />
          <Txt size={11.5} lh={15} numberOfLines={1} style={{ marginTop: 3 }}>{p.n}</Txt>
        </Press>
      ))}
    </ScrollView>
  );
}

/** Tapping a story: who, what, for how long — and one button to join them. */
function story(n: string, c: string, s: string, sec: number) {
  openSheet((close) => (
    <View style={{ alignItems: 'center', paddingTop: 6 }}>
      <RingAvatar name={n} color={c} size={84} live />
      <Txt size={17} w="700" style={{ marginTop: 8 }}>{n}</Txt>
      <Txt size={13} tone="ink3">{`${s}を勉強中`}</Txt>
      <Txt num size={44} w="700" lh={50} style={{ marginTop: 10, letterSpacing: -1 }}>{hms(sec).replace(/^00:/, '')}</Txt>
      <Btn kind="primary" wide icon="play" label="一緒に始める" style={{ marginTop: 18 }} onPress={() => {
        close();
        if (getState().running) { toast('もう勉強中です'); return; }
        startStudy();
        haptic.success();
        toast(`${n}と一緒に始めました`, '記録はタイマーを止めたときに残ります');
      }} />
    </View>
  ));
}
