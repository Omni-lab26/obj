import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedRef, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { hms, hoursIn, PERSON_COLOR, Post, POSTS, RANK, ROOM, subj } from '@/data';
import { PHOTO } from '@/photos';
import { elapsedOf, getState, setState, startStudy, toggleHelpful, useNow, useStore } from '@/store';
import { ease, useT } from '@/theme';
import { Avatar, Btn, Card, haptic, ListRow, Press, SectionHead, Txt } from '@/ui/base';
import { Page, SearchBtn } from '@/ui/Chrome';
import { Choice, Field } from '@/ui/Form';
import { GroupMark, LiveDot } from '@/ui/GroupParts';
import { Icon } from '@/ui/Icon';
import { Rolling } from '@/ui/Rolling';
import { openSheet } from '@/ui/Sheet';
import { Segmented } from '@/ui/Tabs';
import { toast } from '@/ui/Toast';

type Tab = 'live' | 'rank' | 'posts' | 'groups';

export default function Community() {
  const [tab, setTab] = useState<Tab>('live');
  const ref = useAnimatedRef<Animated.ScrollView>();
  const go = (k: Tab) => { setTab(k); ref.current?.scrollTo({ y: 0, animated: false }); };
  return (
    <Page title="みんな" right={<SearchBtn />} scrollRef={ref}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 18 }}>
        <Segmented value={tab} onChange={go} options={[{ v: 'live', label: '勉強中' }, { v: 'rank', label: 'ランキング' }, { v: 'posts', label: '投稿' }, { v: 'groups', label: 'グループ' }]} />
      </View>
      {tab === 'live' ? <Live /> : tab === 'rank' ? <Rank /> : tab === 'posts' ? <Posts /> : <Groups />}
    </Page>
  );
}

// ---------- 勉強中: a study room, not a list ----------
type RoomFilter = 'all' | 'follow' | 'todai';
function Live() {
  const now = useNow();
  const [start] = useState(() => Date.now());
  const since = Math.floor((now - start) / 1000);
  const [count, setCount] = useState(0);
  const [f, setF] = useState<RoomFilter>('all');
  const following = useStore((x) => x.following);
  const running = useStore((x) => x.running);
  const me = useStore((x) => x.running && x.showLive);
  const mineMin = useStore((x) => Math.floor(elapsedOf(x) / 60));
  useEffect(() => {
    const first = setTimeout(() => setCount(1263), 60);
    // someone sits down every few seconds; the digits roll
    const id = setInterval(() => setCount((c) => c + 1 + Math.floor(Math.random() * 3)), 4200);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);
  const people = ROOM.filter((p) => (f === 'follow' ? following.includes(p.h) : f === 'todai' ? p.g.startsWith('東大') : true));
  const join = () => {
    if (getState().running) { toast('もう勉強中です'); return; }
    startStudy();
    haptic.success();
    toast('みんなと一緒に始めました', '記録はタイマーを止めたときに残ります');
  };
  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ paddingHorizontal: 16, gap: 14 }}>
      <View style={{ paddingHorizontal: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
          <Rolling value={count ? comma(count) : '0,000'} size={44} weight="300" />
          <Txt size={17} tone="ink2" style={{ marginBottom: 8 }}>人が机に向かっています</Txt>
        </View>
      </View>
      {running ? null : <Btn kind="tint" wide icon="play" label="みんなと一緒に始める" onPress={join} />}
      <Segmented small value={f} onChange={setF} options={[{ v: 'all', label: 'みんな' }, { v: 'follow', label: 'フォロー中' }, { v: 'todai', label: '東大志望' }]} />
      <Card pad={0} style={{ flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 6 }}>
        {me ? <Seat name="はる" color={PERSON_COLOR['はる']} label="あなた" sub={subj(getState().subj).name} time={`${mineMin}分`} you /> : null}
        {people.map((p) => <Seat key={p.h} name={p.n} color={p.c} label={p.n} sub={p.s} time={hms(p.t + since).replace(/^00:/, '')} />)}
      </Card>
      <Txt size={13} tone="ink2" style={{ paddingHorizontal: 4 }}>{f === 'follow' ? 'フォロー中の人だけを表示しています。' : '勉強中を公開している人だけが並びます。'}</Txt>
    </Animated.View>
  );
}
/** One seat: the person's photo with a green ring while they study, what and how long. */
function Seat({ name, color, label, sub, time, you }: { name: string; color: string; label: string; sub: string; time: string; you?: boolean }) {
  const t = useT();
  return (
    <View style={{ width: '25%', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 2 }} accessible accessibilityLabel={`${label} ${sub} ${time}`}>
      <View style={{ padding: 2, borderRadius: 40, borderWidth: 2, borderColor: you ? t.tint : 'rgba(42,160,90,0.35)' }}>
        <Avatar name={name} color={color} size={50} />
      </View>
      <Txt size={13} w="600" lh={17} numberOfLines={1} style={{ marginTop: 5 }}>{label}</Txt>
      <Txt size={12} tone="ink2" lh={15} numberOfLines={1}>{sub}</Txt>
      <Txt num size={12} tone="ink3" lh={15}>{time}</Txt>
    </View>
  );
}

const comma = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ---------- ランキング ----------
const DIST = [2, 4, 7, 11, 16, 22, 27, 31, 33, 32, 29, 25, 21, 17, 13, 10, 7, 5, 3, 2];
const RANK_BY: Record<'w' | 'm' | 't', { rank: number; top: number; note: string; me: number; scale: number }> = {
  w: { rank: 57, top: 18, note: '先週より9つ上がりました', me: hoursIn(7), scale: 1 },
  m: { rank: 71, top: 23, note: '先月より4つ上がりました', me: 69.3, scale: 3.1 },
  t: { rank: 38, top: 12, note: '今日はいい調子です', me: 2.8, scale: 0.13 },
};
function Rank() {
  const t = useT();
  const [p, setP] = useState<'w' | 'm' | 't'>('w');
  const r = RANK_BY[p];
  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ paddingHorizontal: 16, gap: 14 }}>
      <Segmented small value={p} onChange={setP} options={[{ v: 'w', label: '今週' }, { v: 'm', label: '今月' }, { v: 't', label: '今日' }]} />
      <Card style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Txt size={13} tone="ink2">東大志望 312人の中で</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
            <Rolling value={String(r.rank)} size={44} weight="300" />
            <Txt size={17} tone="ink2" style={{ marginBottom: 8 }}>位</Txt>
          </View>
          <Txt size={15} color={t.greenInk}>{r.note}</Txt>
          <Txt size={13} tone="ink2">{`上位${r.top}%`}</Txt>
        </View>
        <Dist pos={Math.round(14 - (r.rank - 57) / 12)} />
      </Card>
      <Card pad={0} style={{ overflow: 'hidden' }}>
        {RANK.map((x, i) => (
          <ListRow key={x.n} first={i === 0}
            lead={<Txt num size={17} w={i < 3 ? '700' : '400'} color={i < 3 ? t.tint : t.ink3}>{i + 1}</Txt>}
            title={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Avatar name={x.n} color={x.c} size={32} /><Txt size={17}>{x.n}</Txt></View>}
            detail={<Txt size={17} tone="ink2" num>{`${(x.h * r.scale).toFixed(1)}時間`}</Txt>} />
        ))}
        <View style={{ backgroundColor: t.tintSoft }}>
          <ListRow lead={<Txt num size={17} w="700" color={t.tint}>{r.rank}</Txt>}
            title={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Avatar name="はる" color={PERSON_COLOR['はる']} size={32} /><Txt size={17} w="600">あなた</Txt></View>}
            detail={<Txt size={17} w="600" num>{`${r.me.toFixed(1)}時間`}</Txt>} />
        </View>
      </Card>
    </Animated.View>
  );
}
function Dist({ pos }: { pos: number }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 52, width: 118 }} accessibilityLabel="分布の中のあなたの位置">
      {DIST.map((x, i) => <DistBar key={i} h={(x / 33) * 52} on={i === pos} color={i === pos ? t.tint : 'rgba(118,118,128,0.16)'} delay={i * 18} />)}
    </View>
  );
}
function DistBar({ h, color, delay, on }: { h: number; color: string; delay: number; on: boolean }) {
  const s = useSharedValue(0);
  useEffect(() => { s.value = 0; s.value = withTiming(1, { duration: 500 + delay, easing: ease.out }); }, [s, delay, on]);
  const a = useAnimatedStyle(() => ({ height: Math.max(2, h * s.value) }));
  return <Animated.View style={[{ flex: 1, borderRadius: 2, backgroundColor: color }, a]} />;
}

// ---------- 投稿 ----------
// New posts live at module level so they survive tab switches.
let mine: Post[] = [];
const mineSubs = new Set<() => void>();

function Posts() {
  const t = useT();
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); mineSubs.add(f); return () => { mineSubs.delete(f); }; }, []);
  const list = [...mine, ...POSTS];
  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ paddingHorizontal: 16, gap: 12 }}>
      <Card pad={0}>
        <ListRow first onPress={compose} lead={<Avatar name="はる" color={PERSON_COLOR['はる']} size={32} />}
          title={<Txt size={17} tone="ink3">いま何してる？</Txt>} trail={<Icon name="edit" size={20} color={t.tint} />} a11y="投稿する" />
      </Card>
      {list.map((p, i) => (
        <Animated.View key={p.n + p.t.slice(0, 12)} entering={i < mine.length ? FadeInDown.duration(320) : undefined}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar name={p.n} color={p.c} size={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={15} w="600" lh={20}>{p.n}</Txt>
                <Txt size={13} tone="ink2" lh={17}>{p.m}</Txt>
              </View>
              <Txt size={13} tone="ink3">{p.w}</Txt>
            </View>
            <Txt size={16} lh={24} style={{ marginTop: 10 }}>{p.t}</Txt>
            {p.img ? <Image source={PHOTO[p.img]} style={{ width: 180, height: 180, borderRadius: 14, marginTop: 10, backgroundColor: t.sunken }} resizeMode="cover" /> : null}
            {p.tags.length ? <Txt size={15} color={t.tint} style={{ marginTop: 6 }}>{p.tags.join(' ')}</Txt> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 10 }}>
              <Helpful i={i} base={p.u} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Icon name="chat" size={18} color={t.ink2} />
                <Txt size={15} tone="ink2" num>{p.r}</Txt>
              </View>
            </View>
          </Card>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

function Helpful({ i, base }: { i: number; base: number }) {
  const t = useT();
  const on = useStore((s) => s.helpful.includes(i));
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const press = () => {
    if (!on) { haptic.soft(); s.set(withSequence(withTiming(1.3, { duration: 110, easing: ease.out }), withSpring(1, { damping: 8, stiffness: 260 }))); }
    toggleHelpful(i);
  };
  return (
    <Press onPress={press} haptics={false} scale={0.94} hitSlop={10} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel="役に立った"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <Animated.View style={a}><Icon name="bulb" size={18} color={on ? t.tint : t.ink2} filled={on} /></Animated.View>
      <Txt size={15} color={on ? t.tint : t.ink2}>役に立った</Txt>
      <Rolling value={String(base + (on ? 1 : 0))} size={15} weight="400" color={on ? t.tint : t.ink2} />
    </Press>
  );
}

function compose() {
  openSheet((close) => <Compose close={close} />);
}
function Compose({ close }: { close: () => void }) {
  const [text, setText] = useState('');
  const [tag, setTag] = useState<'#勉強の記録' | '#質問' | '#おすすめ'>('#勉強の記録');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const err = touched && !text.trim() ? 'なにか書いてね' : undefined;
  const post = () => {
    if (!text.trim()) { setTouched(true); return; }
    setBusy(true);
    setTimeout(() => {
      mine = [{ n: 'はる', c: PERSON_COLOR['はる'], m: '高3', w: 'たった今', t: text.trim(), tags: [tag], u: 0, r: 0 }, ...mine];
      // "Helpful" marks are stored by list position, so shift them past the new post.
      setState((s) => ({ helpful: s.helpful.map((x) => x + 1) }));
      mineSubs.forEach((f) => f());
      haptic.success();
      close();
      toast('投稿しました');
    }, 700);
  };
  return (
    <View>
      <Txt size={22} w="700" style={{ marginBottom: 14 }}>投稿</Txt>
      <Field label="本文" value={text} onChangeText={setText} multiline max={280} error={err} onBlur={() => setTouched(true)} autoFocus />
      <View style={{ marginTop: 14 }}>
        <Choice value={tag} onChange={setTag} options={[{ v: '#勉強の記録', label: '#勉強の記録' }, { v: '#質問', label: '#質問' }, { v: '#おすすめ', label: '#おすすめ' }]} />
      </View>
      <Btn kind="primary" wide label="投稿する" loading={busy} disabled={!text.trim()} onPress={post} style={{ marginTop: 20 }} />
    </View>
  );
}

// ---------- グループ ----------
function Groups() {
  const t = useT();
  const groups = useStore((s) => s.groups);
  return (
    <Animated.View entering={FadeIn.duration(200)} style={{ paddingHorizontal: 16, gap: 24 }}>
      <View>
        <SectionHead title="参加中" />
        <Card pad={0}>
          {groups.map((g, i) => (
            <ListRow key={g.id} first={i === 0} onPress={() => router.push(`/group/${g.id}`)} chevron a11y={g.n}
              lead={<GroupMark colors={g.cs} members={g.members} icon={g.icon} size={40} />}
              title={g.n} sub={`${g.m}人・${g.join}`}
              detail={g.studying.length ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <LiveDot size={6} />
                  <Txt size={15} color={t.greenInk}>{`${g.studying.length}人`}</Txt>
                </View>
              ) : <Txt size={15} tone="ink3">静か</Txt>} />
          ))}
        </Card>
      </View>
      <Btn kind="quiet" wide icon="plus" label="グループを作る" onPress={() => router.push('/create-group')} />
    </Animated.View>
  );
}
