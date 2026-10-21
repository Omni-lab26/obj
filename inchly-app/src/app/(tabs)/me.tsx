import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';

import { PEOPLE, YEAR_HOURS } from '@/data';
import { setState, toggleFollow, useStore } from '@/store';
import { useT } from '@/theme';
import { Avatar, Btn, Card, haptic, IconBtn, ListRow, Press, Txt } from '@/ui/base';
import { Page } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { HoloCard } from '@/ui/MeCard';
import { openSheet } from '@/ui/Sheet';
import { Segmented } from '@/ui/Tabs';
import { toast } from '@/ui/Toast';

type Tab = 'posts' | 'following' | 'followers';

function Setting({ label, sub, k, first }: { label: string; sub: string; k: 'showLive' | 'showRank'; first?: boolean }) {
  const t = useT();
  const on = useStore((x) => x[k]);
  return (
    <ListRow first={first} title={label} sub={sub}
      trail={<Switch value={on} onValueChange={(v) => { haptic.tap(); setState({ [k]: v }); }} trackColor={{ true: t.tint, false: 'rgba(120,120,128,0.16)' }} thumbColor="#fff" ios_backgroundColor="rgba(120,120,128,0.16)" accessibilityLabel={label} />} />
  );
}
const openSettings = () =>
  openSheet(() => (
    <View>
      <Txt size={22} w="700" style={{ marginBottom: 12 }}>見せ方</Txt>
      <View style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' }}>
        <Setting first k="showLive" label="勉強中をみんなに見せる" sub="「みんな」の自習室に並びます" />
        <Setting k="showRank" label="順位を公開する" sub="オフでも自分の順位は見られます" />
      </View>
      <Txt size={13} tone="ink2" style={{ marginTop: 12, paddingHorizontal: 16 }}>Inchly 1.0（モック）</Txt>
    </View>
  ));
const MY_POSTS = [
  { t: '模試の偏差値、3か月で +6.6。数学の「次にやること」を毎回決めるようにしてから、机に向かうまでが早くなった。', w: '2時間前', u: 54 },
  { t: '古文単語、朝の10分だけでも草が埋まるのがうれしい。', w: '昨日', u: 31 },
];

function FollowBtn({ h, back }: { h: string; back?: boolean }) {
  const on = useStore((s) => s.following.includes(h));
  return <Btn small kind={on ? 'quiet' : 'primary'} label={on ? 'フォロー中' : back ? 'フォローを返す' : 'フォロー'} onPress={() => { haptic.soft(); toggleFollow(h); }} />;
}

function ActionBtn({ label, doneLabel, msg }: { label: string; doneLabel: string; msg: string }) {
  const [phase, setPhase] = useState<'idle' | 'busy' | 'done'>('idle');
  const run = () => {
    setPhase('busy');
    setTimeout(() => {
      setPhase('done');
      haptic.success();
      toast(msg);
      setTimeout(() => setPhase('idle'), 1600);
    }, 700);
  };
  return <Btn kind="quiet" small label={phase === 'done' ? doneLabel : label} loading={phase === 'busy'} done={phase === 'done'} onPress={run} style={{ flex: 1 }} />;
}

export default function Me() {
  const t = useT();
  const following = useStore((s) => s.following);
  const [tab, setTab] = useState<Tab>('posts');
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = setTimeout(() => setShown(true), 150); return () => clearTimeout(id); }, []);

  const count = (n: string, label: string, v: Tab) => (
    <Press onPress={() => setTab(v)} scale={0.95} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }} accessibilityLabel={`${n}${label}`}>
      <Txt num size={17} w="600">{n}</Txt>
      <Txt size={15} tone="ink2">{label}</Txt>
    </Press>
  );

  return (
    <Page title="マイページ" right={<IconBtn filled name="gear" label="設定" onPress={openSettings} />}>
      <HoloCard name="はる" handle="haru_study" goal="東大 理一 志望"
        stats={[{ v: shown ? String(Math.round(YEAR_HOURS)) : '000', from: '000', label: '時間（1年）' }, { v: shown ? '23' : '00', from: '00', label: '日連続' }, { v: shown ? '57' : '00', from: '00', label: '位（今週）' }]} />
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Txt size={15} lh={22}>高3。数学は青チャート2周目。朝型にしたい（今は夜型）。</Txt>
        <View style={{ flexDirection: 'row', gap: 18, paddingTop: 8 }}>
          {count('56', '投稿', 'posts')}
          {count(String(following.length + 125), 'フォロー', 'following')}
          {count('342', 'フォロワー', 'followers')}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14 }}>
        <ActionBtn label="プロフィールを編集" doneLabel="保存しました" msg="プロフィールを保存しました" />
        <ActionBtn label="カードを共有" doneLabel="保存しました" msg="カードの画像を保存しました" />
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 22, paddingBottom: 12 }}>
        <Segmented value={tab} onChange={setTab} options={[{ v: 'posts', label: '投稿' }, { v: 'following', label: 'フォロー' }, { v: 'followers', label: 'フォロワー' }]} />
      </View>
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        {tab === 'posts'
          ? MY_POSTS.map((p, i) => (
              <Card key={i}>
                <Txt size={16} lh={24}>{p.t}</Txt>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Icon name="bulb" size={17} color={t.ink2} />
                    <Txt size={15} tone="ink2">{`役に立った ${p.u}`}</Txt>
                  </View>
                  <Txt size={13} tone="ink3">{p.w}</Txt>
                </View>
              </Card>
            ))
          : (
            <Card pad={0}>
              {(tab === 'following' ? PEOPLE : [...PEOPLE].reverse()).map((p, i) => (
                <ListRow key={p.h} first={i === 0} lead={<Avatar name={p.n} color={p.c} size={36} />} title={p.n} sub={`@${p.h}　${p.g}`}
                  trail={<FollowBtn h={p.h} back={tab === 'followers'} />} />
              ))}
            </Card>
          )}
      </View>
    </Page>
  );
}
