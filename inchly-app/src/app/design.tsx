import { router } from 'expo-router';
import { ReactNode, useId, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { BGS, CARDS, CORNERS, DEFAULT_DESIGN, Design, FAMILIES, INKS, STREAKS, THEMES, themeOf, ThemeId, TIMERS, useDesign } from '@/design';
import { setDesign } from '@/store';
import { faceFor, focus, hair, lift, radius, useT } from '@/theme';
import { haptic, Press, Txt } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { Wordmark } from '@/ui/Brand';
import { Sticker } from '@/ui/Sticker';
import { Segmented } from '@/ui/Tabs';
import { TextureFill } from '@/ui/Texture';
import { toast } from '@/ui/Toast';

// デザイン: reached by swiping home to the right. Every choice applies at once
// and the preview at the top shows it; swipe left (or the back arrow) to return.

export default function DesignPage() {
  const t = useT();
  const d = useDesign();
  const insets = useSafeAreaInsets();
  const set = (patch: Partial<Design>) => { haptic.tap(); setDesign(patch); };
  const standard = d.theme === 'standard';
  const [family, setFamily] = useState<(typeof FAMILIES)[number]['id']>(themeOf(d.theme).family);
  // swipe left to go back to home
  const [back] = useState(() => Gesture.Pan().activeOffsetX(-24).failOffsetY([-14, 14])
    .onEnd((e) => { if (e.translationX < -70) scheduleOnRN(router.back); }));
  return (
    <Screen>
      <NavBar title="デザイン" right={
        <Press onPress={() => { setDesign(DEFAULT_DESIGN); haptic.soft(); toast('はじめのデザインに戻しました'); }} hitSlop={8} scale={0.94} accessibilityRole="button">
          <Txt size={13} w="600" tone="ink2">元に戻す</Txt>
        </Press>
      } />
      <GestureDetector gesture={back}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          <Preview />

          <Section title="テーマ" sub="フォント・色・角・質感までまとめて変わります">
            <Segmented fit value={family} onChange={setFamily} options={FAMILIES.map((f) => ({ v: f.id, label: f.label }))} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
              {keys(THEMES).filter((k) => THEMES[k].family === family).map((k) => <ThemeTile key={k} id={k} on={d.theme === k} onPress={() => set({ theme: k })} />)}
            </View>
          </Section>

          {standard ? (
          <>
          <Section title="背景">
            <Options value={d.bg} onChange={(bg) => set({ bg })} cols={5} items={keys(BGS).map((k) => ({ k, label: BGS[k].label, swatch: (
              <View style={{ width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: BGS[k].canvas, borderWidth: hair, borderColor: t.line2, padding: 7, justifyContent: 'flex-end' }}>
                <View style={{ height: '45%', borderRadius: 5, backgroundColor: '#fff', ...lift(t) }} />
              </View>
            ) }))} />
          </Section>

          <Section title="メインの色" sub="文字とボタンの色">
            <Options value={d.ink} onChange={(ink) => set({ ink })} cols={5} items={keys(INKS).map((k) => ({ k, label: INKS[k].label, swatch: (
              <View style={{ width: '100%', aspectRatio: 1, borderRadius: 999, backgroundColor: INKS[k].ink, alignItems: 'center', justifyContent: 'center' }}>
                <Txt size={15} w="800" color="#fff">あ</Txt>
              </View>
            ) }))} />
          </Section>

          <Section title="カードの角">
            <Options value={d.corners} onChange={(corners) => set({ corners })} cols={3} items={keys(CORNERS).map((k) => ({ k, label: CORNERS[k].label, swatch: (
              <View style={{ width: '100%', height: 54, borderRadius: CORNERS[k].card, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line2, ...lift(t) }} />
            ) }))} />
          </Section>
          </>
          ) : <Txt size={11.5} tone="ink3" style={{ paddingHorizontal: 20, paddingTop: 12 }}>背景・メインの色・角・タイマーの色は、テーマで決まります（スタンダードを選ぶと自分で選べます）</Txt>}

          <Section title="マイページのカード">
            <Options value={d.card} onChange={(card) => set({ card })} cols={3} items={keys(CARDS).map((k) => ({ k, label: CARDS[k].label, swatch: <MiniCard look={k} /> }))} />
          </Section>

          <Section title="連続記録のカプセル">
            <Options value={d.streak} onChange={(streak) => set({ streak })} cols={3} items={keys(STREAKS).map((k) => ({ k, label: STREAKS[k].label, swatch: <MiniStreak look={k} /> }))} />
          </Section>

          {standard ? (
          <Section title="タイマーの画面">
            <Options value={d.timer} onChange={(timer) => set({ timer })} cols={5} items={keys(TIMERS).map((k) => ({ k, label: TIMERS[k].label, swatch: (
              <View style={{ width: '100%', aspectRatio: 0.7, borderRadius: 10, backgroundColor: TIMERS[k].bg, alignItems: 'center', justifyContent: 'center' }}>
                <Txt num size={11} w="700" color={focus.ink}>39:14</Txt>
              </View>
            ) }))} />
          </Section>
          ) : null}

          <Txt size={11.5} tone="ink3" style={{ textAlign: 'center', paddingTop: 22, paddingHorizontal: 24 }}>ホームを右にスワイプすると、いつでもここに来られます。左にスワイプで戻ります</Txt>
        </ScrollView>
      </GestureDetector>
    </Screen>
  );
}

const keys = <T extends object>(o: T) => Object.keys(o) as (keyof T)[];

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 22, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 4 }}>
        {/* on a narrow phone the note wraps, never the title */}
        <Txt size={14} w="700" style={{ flexShrink: 0 }}>{title}</Txt>
        {sub ? <Txt size={11.5} tone="ink3" style={{ flex: 1 }}>{sub}</Txt> : null}
      </View>
      {children}
    </View>
  );
}

/** A row of choices, each a picture of the result with its name under it. */
function Options<K extends string | number | symbol>({ value, onChange, items, cols }: { value: K; onChange: (k: K) => void; items: { k: K; label: string; swatch: ReactNode }[]; cols: number }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
      {items.map((x) => {
        const on = x.k === value;
        return (
          <Press key={String(x.k)} onPress={() => onChange(x.k)} haptics={false} scale={0.95} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={x.label}
            style={{ width: `${(100 - (cols - 1) * 2.4) / cols}%`, padding: cols > 3 ? 4 : 6, gap: 6, borderRadius: radius.inner + 4, alignItems: 'center',
              backgroundColor: t.surface, borderWidth: on ? 2 : hair, borderColor: on ? t.ink : t.line }}>
            {x.swatch}
            <Txt size={cols > 3 ? 10 : 11} w={on ? '700' : '500'} tone={on ? 'ink' : 'ink2'} numberOfLines={1} style={{ letterSpacing: cols > 3 ? -0.3 : 0 }}>{x.label}</Txt>
          </Press>
        );
      })}
    </View>
  );
}

/** A theme as a small picture: its canvas and texture, a card in its outline and corners, and text in its face. */
function ThemeTile({ id, on, onPress }: { id: ThemeId; on: boolean; onPress: () => void }) {
  const t = useT();
  const th = themeOf(id);
  const c = th.colors ?? { canvas: '#F4F5F8', surface: '#FFFFFF', ink: '#121417', ink3: '#848A96', sunken: '#EFF1F5' };
  const r = th.corners ?? { card: 16, inner: 12 };
  return (
    <Press onPress={onPress} haptics={false} scale={0.96} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`テーマ ${th.label}`}
      style={{ width: '31.5%', padding: 5, gap: 6, borderRadius: radius.inner + 4, backgroundColor: t.surface, borderWidth: on ? 2 : hair, borderColor: on ? t.ink : t.line, alignItems: 'center' }}>
      <View style={{ width: '100%', aspectRatio: 0.82, borderRadius: radius.inner, backgroundColor: c.canvas, overflow: 'hidden', padding: 7, gap: 6 }}>
        <TextureFill texture={th.texture ?? null} />
        <View style={{ backgroundColor: c.surface, borderRadius: Math.min(r.card, 12), padding: 6, gap: 2, boxShadow: th.shadow?.[0] ?? '0px 1px 3px rgba(15,23,42,0.1)' }}>
          <Txt size={8} color={c.ink3} style={{ fontFamily: faceFor(th.font, 8) }}>今日の勉強</Txt>
          <Txt num size={15} w="700" lh={18} color={c.ink} style={{ fontFamily: faceFor(th.font, 20) }}>3:24</Txt>
        </View>
        <View style={{ height: 14, borderRadius: r.inner, backgroundColor: c.ink }} />
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <View style={{ flex: 1, height: 14, borderRadius: r.inner, backgroundColor: c.sunken }} />
          <View style={{ flex: 1, height: 14, borderRadius: r.inner, backgroundColor: c.sunken }} />
        </View>
      </View>
      <Txt size={11} w={on ? '700' : '500'} tone={on ? 'ink' : 'ink2'} numberOfLines={1}>{th.label}</Txt>
    </Press>
  );
}

function MiniCard({ look }: { look: keyof typeof CARDS }) {
  const c = CARDS[look];
  const id = `mc${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={{ width: '100%', aspectRatio: 85.6 / 53.98, borderRadius: 6, overflow: 'hidden', borderWidth: hair, borderColor: c.dark ? 'transparent' : 'rgba(17,20,23,0.12)' }}>
      <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c.grad[0]} />
            <Stop offset="0.55" stopColor={c.grad[1]} />
            <Stop offset="1" stopColor={c.grad[2]} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      <View style={{ padding: 5 }}>
        <Wordmark size={8} color={c.dark ? '#fff' : '#121417'} />
      </View>
    </View>
  );
}

function MiniStreak({ look }: { look: keyof typeof STREAKS }) {
  const t = useT();
  const light = look === 'white';
  return (
    <View style={{ width: '100%', height: 30, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 4,
      backgroundColor: look === 'ink' ? t.ink : light ? t.surface : '#0B0D12', borderWidth: light ? hair : 0, borderColor: t.line2 }}>
      <Sticker name="fire" size={20} />
      <Txt num size={12} w="800" color={light ? t.ink : '#fff'}>23</Txt>
    </View>
  );
}

/** The look as a whole: canvas, a card with the main color's button, the streak, the My Page card. */
function Preview() {
  const t = useT();
  const d = useDesign();
  return (
    <View style={{ marginHorizontal: 16, marginTop: 6, borderRadius: radius.card + 6, backgroundColor: t.canvas, borderWidth: hair, borderColor: t.line2, padding: 12, gap: 10 }}>
      <View style={[{ backgroundColor: t.surface, borderRadius: radius.card, padding: 12, gap: 8 }, lift(t)]}>
        <Txt size={11} tone="ink2">今日の勉強</Txt>
        <Txt num size={24} w="700">3<Txt size={11} tone="ink3">時間 </Txt>24<Txt size={11} tone="ink3">分</Txt></Txt>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View style={{ flex: 1, height: 30, borderRadius: radius.inner, backgroundColor: t.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={12} w="700" color={t.onInk}>始める</Txt>
          </View>
          <View style={{ flex: 1, height: 30, borderRadius: radius.inner, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={12} w="600">ToDo</Txt>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={{ flex: 1 }}><MiniStreak look={d.streak} /></View>
        <View style={{ width: '34%' }}><MiniCard look={d.card} /></View>
        <View style={{ width: 34, height: 48, borderRadius: 8, backgroundColor: focus.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Txt num size={8} w="700" color={focus.ink}>39:14</Txt>
        </View>
      </View>
    </View>
  );
}
