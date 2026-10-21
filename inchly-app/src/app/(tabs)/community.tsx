import { router } from 'expo-router';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { hms, hoursIn, PERSON_COLOR, Post, POSTS, RANK, ROOM, subj } from '@/data';
import { PHOTO } from '@/photos';
import { elapsedOf, getState, setState, toggleHelpful, useNow, useStore } from '@/store';
import { ease, useT } from '@/theme';
import { Avatar, Btn, haptic, Press, Txt } from '@/ui/base';
import { Screen, SearchBtn, TopBar } from '@/ui/Chrome';
import { Choice, Field } from '@/ui/Form';
import { GroupMark, LiveDot } from '@/ui/GroupParts';
import { Icon } from '@/ui/Icon';
import { Rolling } from '@/ui/Rolling';
import { openSheet } from '@/ui/Sheet';
import { Segmented, UnderTabs } from '@/ui/Tabs';
import { toast } from '@/ui/Toast';

type Tab = 'live' | 'rank' | 'posts' | 'groups';

export default function Community() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('live');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const go = (k: Tab) => { setTab(k); scroll.current?.scrollTo({ y: 0, animated: false }); };
  return (
    <Screen>
      <TopBar title="みんな" right={<SearchBtn />} />
      <UnderTabs value={tab} onChange={go} options={[{ v: 'live', label: 'いま勉強中' }, { v: 'rank', label: 'ランキング' }, { v: 'posts', label: '投稿' }, { v: 'groups', label: 'グループ' }]} />
      <ScrollView ref={scroll} style={{ flex: 1, backgroundColor: t.canvas }} contentContainerStyle={{ paddingBottom: 40 }}>
        {tab === 'live' ? <Live /> : tab === 'rank' ? <Rank /> : tab === 'posts' ? <Posts /> : <Groups />}
      </ScrollView>
    </Screen>
  );
}

// ---------- いま勉強中: a study room, not a list ----------
type RoomFilter = 'all' | 'follow' | 'todai';
function Live() {
  const t = useT();
  const now = useNow();
  const [start] = useState(() => Date.now());
  const since = Math.floor((now - start) / 1000);
  const [count, setCount] = useState(0);
  const [f, setF] = useState<RoomFilter>('all');
  const following = useStore((x) => x.following);
  const me = useStore((x) => x.running && x.showLive);
  const mineMin = useStore((x) => Math.floor(elapsedOf(x) / 60));
  useEffect(() => {
    const first = setTimeout(() => setCount(1263), 60);
    // Someone joins every few seconds; the digits roll.
    const id = setInterval(() => setCount((c) => c + 1 + Math.floor(Math.random() * 3)), 4200);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);
  const people = ROOM.filter((p) => (f === 'follow' ? following.includes(p.h) : f === 'todai' ? p.g.startsWith('東大') : true));
  const chip = (v: RoomFilter, label: string) => (
    <Press key={v} onPress={() => setF(v)} scale={0.94} accessibilityRole="radio" accessibilityState={{ checked: f === v }}
      style={{ height: 30, paddingHorizontal: 12, borderRadius: 15, justifyContent: 'center', backgroundColor: f === v ? t.ink : t.sunken }}>
      <Txt size={12.5} w={f === v ? '600' : '400'} color={f === v ? t.onInk : t.ink2}>{label}</Txt>
    </Press>
  );
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 18 }}>
        <LiveDot size={9} />
        <Rolling value={count ? comma(count) : '0,000'} size={34} weight="600" />
        <Txt size={14} tone="ink2" style={{ marginTop: 8 }}>人が机に向かってる</Txt>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 }}>
        {chip('all', 'みんな')}
        {chip('follow', 'フォロー中')}
        {chip('todai', '東大志望')}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingTop: 8 }}>
        {me ? <Seat name="はる" color={PERSON_COLOR['はる']} label="あなた" sub={subj(getState().subj).name} time={`${mineMin}分`} you /> : null}
        {people.map((p) => <Seat key={p.h} name={p.n} color={p.c} label={p.n} sub={p.s} time={hms(p.t + since).replace(/^00:/, '')} />)}
      </View>
    </Animated.View>
  );
}
/** One seat in the room: the person's icon with a live ring, what and how long. */
function Seat({ name, color, label, sub, time, you }: { name: string; color: string; label: string; sub: string; time: string; you?: boolean }) {
  const t = useT();
  return (
    <View style={{ width: '33.33%', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 }} accessible accessibilityLabel={`${label} ${sub} ${time}`}>
      <View style={{ padding: 2.5, borderRadius: 40, borderWidth: 2, borderColor: you ? t.green : t.dark ? '#2B4F3B' : '#BFE3CC' }}>
        <Avatar name={name} color={color} size={58} />
      </View>
      <Txt size={13.5} w="600" numberOfLines={1} style={{ marginTop: 6 }}>{label}</Txt>
      <Txt size={12} tone="ink3" numberOfLines={1}>{sub} · <Txt num size={12} tone="ink2">{time}</Txt></Txt>
    </View>
  );
}

const comma = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ---------- ランキング ----------
const DIST = [2, 4, 7, 11, 16, 22, 27, 31, 33, 32, 29, 25, 21, 17, 13, 10, 7, 5, 3, 2];
const RANK_BY: Record<'w' | 'm' | 't', { rank: number; delta: string; me: number; scale: number }> = {
  w: { rank: 57, delta: '上位18% · 先週から9つ上がりました', me: hoursIn(7), scale: 1 },
  m: { rank: 71, delta: '上位23% · 先月から4つ上がりました', me: 69.3, scale: 3.1 },
  t: { rank: 38, delta: '上位12% · 今日はいい調子です', me: 2.8, scale: 0.13 },
};
function Rank() {
  const t = useT();
  const [p, setP] = useState<'w' | 'm' | 't'>('w');
  const r = RANK_BY[p];
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <Segmented value={p} onChange={setP} options={[{ v: 'w', label: '今週' }, { v: 'm', label: '今月' }, { v: 't', label: '今日' }]} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16, gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Txt size={12.5} tone="ink3">東大志望 312人の中で</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
            <Rolling value={String(r.rank)} size={46} weight="700" />
            <Txt size={15} tone="ink3" style={{ marginBottom: 6 }}>位</Txt>
          </View>
          <Txt size={12.5} w="600" tone="greenInk">{r.delta}</Txt>
        </View>
        <Dist pos={Math.round(14 - (r.rank - 57) / 12)} />
      </View>
      {RANK.map((x, i) => (
        <View key={x.n} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 9 }}>
          <Txt num size={14} w="600" tone="ink3" style={{ width: 22, textAlign: 'center' }}>{i + 1}</Txt>
          <Avatar name={x.n} color={x.c} size={32} />
          <Txt size={14.5} w="500" style={{ flex: 1 }}>{x.n}</Txt>
          <Txt num size={13.5} tone="ink2">{(x.h * r.scale).toFixed(1)}時間</Txt>
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 11, marginTop: 4, backgroundColor: t.greenSoft }}>
        <Txt num size={14} w="700" tone="greenInk" style={{ width: 22, textAlign: 'center' }}>{r.rank}</Txt>
        <Avatar name="はる" color={PERSON_COLOR['はる']} size={32} />
        <Txt size={14.5} w="600" style={{ flex: 1 }}>あなた</Txt>
        <Txt num size={13.5} w="600">{r.me.toFixed(1)}時間</Txt>
      </View>
    </Animated.View>
  );
}
function Dist({ pos }: { pos: number }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 52, width: 120 }} accessibilityLabel="分布の中のあなたの位置">
      {DIST.map((x, i) => <DistBar key={i} h={(x / 33) * 52} on={i === pos} color={i === pos ? t.green : t.line2} delay={i * 18} />)}
    </View>
  );
}
function DistBar({ h, color, delay, on }: { h: number; color: string; delay: number; on: boolean }) {
  const s = useSharedValue(0);
  useEffect(() => { s.value = 0; s.value = withTiming(1, { duration: 500 + delay, easing: ease.out }); }, [s, delay, on]);
  const a = useAnimatedStyle(() => ({ height: Math.max(2, h * s.value) }));
  return <Animated.View style={[{ flex: 1, borderRadius: 1.5, backgroundColor: color }, a]} />;
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
    <Animated.View entering={FadeIn.duration(200)}>
      <Press onPress={compose} scale={0.985}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, margin: 20, marginBottom: 6, padding: 12, borderRadius: 14, backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.line }}>
        <Avatar name="はる" color={PERSON_COLOR['はる']} size={30} />
        <Txt size={14} tone="ink3" style={{ flex: 1 }} numberOfLines={1}>いま何してる？</Txt>
      </Press>
      {list.map((p, i) => (
        <Animated.View key={p.n + p.t.slice(0, 12)} entering={i < mine.length ? FadeInDown.duration(320) : undefined}
          style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: t.line }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Avatar name={p.n} color={p.c} size={34} />
            <View style={{ flex: 1 }}>
              <Txt size={14.5} w="600" lh={20}>{p.n}</Txt>
              <Txt size={12} tone="ink3" lh={17}>{p.m}</Txt>
            </View>
          </View>
          <Txt size={15} lh={25} style={{ marginTop: 10 }}>{p.t}</Txt>
          {p.img ? <Image source={PHOTO[p.img]} style={{ width: '62%', aspectRatio: 1, borderRadius: 14, marginTop: 10, backgroundColor: t.sunken }} resizeMode="cover" /> : null}
          {p.tags.length ? <Txt size={13} tone="ink2" style={{ marginTop: 6 }}>{p.tags.join(' ')}</Txt> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 8 }}>
            <Helpful i={i} base={p.u} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name="chat" size={16} color={t.ink3} />
              <Txt size={13} tone="ink3">返信 {p.r}</Txt>
            </View>
          </View>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

function Helpful({ i, base }: { i: number; base: number }) {
  const t = useT();
  const on = useStore((s) => s.helpful.includes(i));
  const s = useSharedValue(1);
  const [burst, setBurst] = useState(0);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const press = () => {
    if (!on) { haptic.soft(); s.set(withSequence(withTiming(1.35, { duration: 120, easing: ease.out }), withSpring(1, { damping: 8, stiffness: 260 }))); setBurst((b) => b + 1); }
    toggleHelpful(i);
  };
  return (
    <Press onPress={press} haptics={false} scale={0.94} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel="役に立った"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 10, marginLeft: -10, borderRadius: 16, backgroundColor: on ? t.greenSoft : 'transparent' }}>
      <View>
        <Animated.View style={a}><Icon name="bulb" size={17} color={on ? t.greenInk : t.ink3} /></Animated.View>
        {burst ? <Burst key={burst} color={t.green} /> : null}
      </View>
      <Txt size={13} w={on ? '600' : '400'} tone={on ? 'greenInk' : 'ink3'}>役に立った</Txt>
      <Rolling value={String(base + (on ? 1 : 0))} size={13} weight={on ? '600' : '500'} color={on ? t.greenInk : t.ink3} />
    </Press>
  );
}

function Burst({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 8.5, top: 8.5 }}>
      {Array.from({ length: 8 }, (_, k) => <Spark key={k} a={(k / 8) * Math.PI * 2} color={color} />)}
    </View>
  );
}
function Spark({ a, color }: { a: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withTiming(1, { duration: 480, easing: ease.out }); }, [p]);
  const st = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [{ translateX: Math.cos(a) * 18 * p.value }, { translateY: Math.sin(a) * 18 * p.value }, { scale: 1 - p.value * 0.5 }],
  }));
  return <Animated.View style={[{ position: 'absolute', left: -2, top: -2, width: 4, height: 4, borderRadius: 2, backgroundColor: color }, st]} />;
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
      mine = [{ n: 'はる', c: PERSON_COLOR['はる'], m: '高3 · たった今', t: text.trim(), tags: [tag], u: 0, r: 0 }, ...mine];
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
      <Txt size={19} w="700" style={{ marginBottom: 14 }}>投稿</Txt>
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
    <Animated.View entering={FadeIn.duration(200)}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 }}>
        <Btn kind="primary" wide label="グループを作る" icon="plus" onPress={() => router.push('/create-group')} />
      </View>
      <Txt size={12.5} w="600" tone="ink3" style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>参加中</Txt>
      {groups.map((g) => (
        <Press key={g.id} onPress={() => router.push(`/group/${g.id}`)} scale={0.985}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 11 }}>
          <GroupMark colors={g.cs} members={g.members} icon={g.icon} size={44} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={15} w="500" numberOfLines={1}>{g.n}</Txt>
            <Txt size={12} tone="ink3">{g.m}人 · {g.join}</Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {g.studying.length ? <LiveDot size={6} /> : null}
            <Txt size={12.5} w="600" tone={g.studying.length ? 'greenInk' : 'ink3'}>{g.studying.length ? `${g.studying.length}人が勉強中` : 'いまは静か'}</Txt>
          </View>
          <Icon name="chev" size={15} color={t.ink3} />
        </Press>
      ))}
    </Animated.View>
  );
}
