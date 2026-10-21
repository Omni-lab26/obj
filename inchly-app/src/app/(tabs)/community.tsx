import { router } from 'expo-router';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { hms, hoursIn, PERSON_COLOR, Post, POSTS, RANK, ROOM, subj } from '@/data';
import { elapsedOf, getState, setState, toggleHelpful, useNow, useStore } from '@/store';
import { ease, hair, lift, radius, type, useT } from '@/theme';
import { Avatar, Btn, Card, haptic, Press, Txt } from '@/ui/base';
import { Screen, SearchBtn, TopBar } from '@/ui/Chrome';
import { personSheet } from '@/ui/Editors';
import { Choice, Field } from '@/ui/Form';
import { GroupMark, LiveDot } from '@/ui/GroupParts';
import { Icon } from '@/ui/Icon';
import { Rolling } from '@/ui/Rolling';
import { openSheet } from '@/ui/Sheet';
import { Segmented, UnderTabs } from '@/ui/Tabs';
import { Sticker } from '@/ui/Sticker';
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
  const scope = useStore((x) => x.liveScope);
  const myName = useStore((x) => x.account?.name ?? 'はる');
  const blocked = useStore((x) => x.blocked);
  const mineMin = useStore((x) => Math.floor(elapsedOf(x) / 60));
  useEffect(() => {
    const first = setTimeout(() => setCount(1263), 60);
    // Someone joins every few seconds; the digits roll.
    const id = setInterval(() => setCount((c) => c + 1 + Math.floor(Math.random() * 3)), 4200);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);
  const people = ROOM.filter((p) => !blocked.includes(p.n)).filter((p) => (f === 'follow' ? following.includes(p.h) : f === 'todai' ? p.g.startsWith('東大') : true));
  const chip = (v: RoomFilter, label: string) => (
    <Press key={v} onPress={() => setF(v)} scale={0.94} accessibilityRole="radio" accessibilityState={{ checked: f === v }} hitSlop={{ top: 9, bottom: 9, left: 3, right: 3 }}
      style={{ height: 26, paddingHorizontal: 11, borderRadius: 13, justifyContent: 'center', backgroundColor: f === v ? t.ink : t.surface, borderWidth: hair, borderColor: f === v ? t.ink : t.line2 }}>
      <Txt size={11.5} w="600" color={f === v ? t.onInk : t.ink2}>{label}</Txt>
    </Press>
  );
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 16 }}>
        <LiveDot size={7} />
        <Rolling value={count ? comma(count) : '0,000'} size={type.figure + 2} weight="700" />
        <Txt size={12} tone="ink2" style={{ marginTop: 8 }}>人が机に向かってる</Txt>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
        {chip('all', 'みんな')}
        {chip('follow', 'フォロー中')}
        {chip('todai', '東大志望')}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, marginTop: 8, paddingVertical: 2, borderRadius: radius.card, backgroundColor: t.surface, ...lift(t) }}>
        {me && (scope === 'all' || f === 'follow') ? <Seat name={myName} color={PERSON_COLOR['はる']} label="あなた" sub={subj(getState().subj).name} time={`${mineMin}分`} you /> : null}
        {people.map((p) => <Seat key={p.h} name={p.n} color={p.c} label={p.n} sub={p.s} time={hms(p.t + since).replace(/^00:/, '')} />)}
      </View>
      <Press onPress={() => router.push('/settings')} hitSlop={6} style={{ paddingHorizontal: 20, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Txt size={11.5} tone="ink3">{scope === 'all' ? '勉強中は全員に見えています' : scope === 'followers' ? '勉強中はフォロワーにだけ見えています' : '勉強中は誰にも見えていません'}</Txt>
        <Txt size={11.5} w="600" color={t.blue}>変更</Txt>
      </Press>
    </Animated.View>
  );
}
/** One seat in the room: the person's icon with a live ring, what and how long. */
function Seat({ name, color, label, sub, time, you }: { name: string; color: string; label: string; sub: string; time: string; you?: boolean }) {
  const t = useT();
  return (
    <View style={{ width: '25%' }}>
      <Press onPress={you ? undefined : () => personSheet(name, color)} disabled={you} scale={0.95} style={{ alignItems: 'center', paddingVertical: 10, paddingHorizontal: 2 }} accessibilityLabel={`${label} ${sub} ${time}`}>
        <View style={{ padding: 2, borderRadius: 40, borderWidth: 1.5, borderColor: you ? t.green : t.dark ? '#1F4A30' : '#B5EBC8' }}>
          <Avatar name={name} color={color} size={44} />
        </View>
        <Txt size={12} w="600" lh={16} numberOfLines={1} style={{ marginTop: 5 }}>{label}</Txt>
        <Txt size={11} tone="ink3" lh={14} numberOfLines={1}>{sub}</Txt>
        <Txt num size={11} tone="ink2" lh={14}>{time}</Txt>
      </Press>
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
  const blocked = useStore((x) => x.blocked);
  const myName = useStore((x) => x.account?.name ?? 'はる');
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Segmented value={p} onChange={setP} options={[{ v: 'w', label: '今週' }, { v: 'm', label: '今月' }, { v: 't', label: '今日' }]} />
      </View>
      <Card style={{ marginHorizontal: 16, marginTop: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 12 }} pad={14}>
        <View style={{ flex: 1 }}>
          <Txt size={12} tone="ink2">東大志望 312人の中で</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
            <Rolling value={String(r.rank)} size={type.hero} weight="700" />
            <Txt size={13} w="600" tone="ink3" style={{ marginBottom: 5 }}>位</Txt>
          </View>
          <Txt size={11} w="600" tone="greenInk">{`▲ ${r.delta}`}</Txt>
        </View>
        <Dist pos={Math.round(14 - (r.rank - 57) / 12)} />
      </Card>
      <Card style={{ marginHorizontal: 16, marginTop: 10, paddingVertical: 4 }} pad={0}>
        {RANK.filter((x) => !blocked.includes(x.n)).map((x, i) => (
          <Press key={x.n} onPress={() => personSheet(x.n, x.c)} scale={0.99} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 7 }}>
            {i < 3 ? <Sticker name={i === 0 ? 'trophy' : 'star'} size={24} tilt={i === 2 ? 8 : -6} /> : <Txt num size={12} w="600" tone="ink3" style={{ width: 24, textAlign: 'center' }}>{i + 1}</Txt>}
            <Avatar name={x.n} color={x.c} size={30} />
            <Txt size={13.5} w="600" style={{ flex: 1 }}>{x.n}</Txt>
            <Txt num size={13.5} w="600">{(x.h * r.scale).toFixed(1)}<Txt size={11} tone="ink3"> 時間</Txt></Txt>
          </Press>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 7, marginHorizontal: 4, marginTop: 2, marginBottom: 0, borderRadius: radius.inner, backgroundColor: t.greenSoft }}>
          <Txt num size={12} w="700" tone="greenInk" style={{ width: 24, textAlign: 'center' }}>{r.rank}</Txt>
          <Avatar name={myName} color={PERSON_COLOR['はる']} size={30} />
          <Txt size={13.5} w="600" style={{ flex: 1 }}>あなた</Txt>
          <Txt num size={13.5} w="700">{r.me.toFixed(1)}<Txt size={11} tone="ink3"> 時間</Txt></Txt>
        </View>
      </Card>
    </Animated.View>
  );
}
function Dist({ pos }: { pos: number }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1.5, height: 44, width: 110 }} accessibilityLabel="分布の中のあなたの位置">
      {DIST.map((x, i) => <DistBar key={i} h={(x / 33) * 44} on={i === pos} color={i === pos ? t.green : t.sunken} delay={i * 18} />)}
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
  const blocked = useStore((x) => x.blocked);
  const myName = useStore((x) => x.account?.name ?? 'はる');
  const list = [...mine, ...POSTS].filter((p) => !blocked.includes(p.n));
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <Press onPress={compose} scale={0.985}
        style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, marginBottom: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.card, backgroundColor: t.surface }, lift(t)]}>
        <Avatar name={myName} color={PERSON_COLOR['はる']} size={28} />
        <Txt size={13} tone="ink3" style={{ flex: 1 }} numberOfLines={1}>いま何してる？</Txt>
        <Sticker name="pencil" size={28} />
      </Press>
      {list.map((p, i) => (
        <Animated.View key={p.n + p.t.slice(0, 12)} entering={i < mine.length ? FadeInDown.duration(320) : undefined}
          style={[{ marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: radius.card, backgroundColor: t.surface }, lift(t)]}>
          <Press onPress={p.mine ? undefined : () => personSheet(p.n, p.c)} disabled={p.mine} scale={0.99} hitSlop={4} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <Avatar name={p.n} color={p.c} size={30} />
            <View style={{ flex: 1 }}>
              <Txt size={13} w="600" lh={17}>{p.n}</Txt>
              <Txt size={11} tone="ink3" lh={14}>{`${p.m} · ${p.w}`}</Txt>
            </View>
          </Press>
          <Txt size={13.5} lh={22} style={{ marginTop: 8 }}>{p.t}</Txt>
          {p.tags.length ? <Txt size={12} w="500" color={t.blue} style={{ marginTop: 6 }}>{p.tags.join(' ')}</Txt> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 8 }}>
            <Helpful i={i} base={p.u} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name="chat" size={14} color={t.ink3} />
              <Txt size={11.5} tone="ink3">返信 {p.r}</Txt>
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
    if (!on) { haptic.soft(); s.set(withSequence(withTiming(1.5, { duration: 120, easing: ease.out }), withSpring(1, { damping: 7, stiffness: 260 }))); setBurst((b) => b + 1); }
    toggleHelpful(i);
  };
  return (
    <Press onPress={press} haptics={false} scale={0.94} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel="役に立った" hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, paddingLeft: on ? 1 : 9, paddingRight: 10, marginLeft: -4, borderRadius: 14, backgroundColor: on ? t.amberSoft : 'transparent', borderWidth: hair, borderColor: on ? 'transparent' : t.line2 }}>
      <View style={{ width: on ? 26 : 14, alignItems: 'center' }}>
        {/* a pop sticker slaps on when you mark it */}
        <Animated.View style={a}>{on ? <Sticker name="bulb" size={26} tilt={-8} /> : <Icon name="bulb" size={14} color={t.ink3} />}</Animated.View>
        {burst ? <Burst key={burst} color="#FFC23D" /> : null}
      </View>
      <Txt size={11.5} w="600" color={on ? '#B86E00' : t.ink3}>役に立った</Txt>
      <Rolling value={String(base + (on ? 1 : 0))} size={11.5} weight="600" color={on ? '#B86E00' : t.ink3} />
    </Press>
  );
}

function Burst({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: '50%', top: '50%' }}>
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
      const a = getState().account;
      mine = [{ n: a?.name ?? 'はる', c: PERSON_COLOR['はる'], m: a?.grade ?? '高3', mine: true, w: 'たった今', t: text.trim(), tags: [tag], u: 0, r: 0 }, ...mine];
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
      <Txt size={17} w="700" style={{ marginBottom: 12 }}>投稿</Txt>
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
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
        <Btn kind="primary" wide label="グループを作る" icon="plus" onPress={() => router.push('/create-group')} />
      </View>
      <Txt size={type.head} w="600" style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 }}>参加中</Txt>
      <Card style={{ marginHorizontal: 16, paddingVertical: 4 }} pad={0}>
        {groups.map((g, i) => (
          <Press key={g.id} onPress={() => router.push(`/group/${g.id}`)} scale={0.985}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 9 }}>
            {i ? <View style={{ position: 'absolute', top: 0, left: 60, right: 0, height: hair, backgroundColor: t.line }} /> : null}
            <GroupMark colors={g.cs} members={g.members} icon={g.icon} size={36} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={13.5} w="600" numberOfLines={1}>{g.n}</Txt>
              <Txt size={11} tone="ink3">{g.m}人 · {g.join}</Txt>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {g.studying.length ? <LiveDot size={5} /> : null}
              <Txt size={11} w="600" tone={g.studying.length ? 'greenInk' : 'ink3'}>{g.studying.length ? `${g.studying.length}人が勉強中` : 'いまは静か'}</Txt>
            </View>
            <Icon name="chev" size={13} color={t.ink3} />
          </Press>
        ))}
      </Card>
    </Animated.View>
  );
}
