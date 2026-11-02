import { ScrollView, View } from 'react-native';

import { THEME_ROLE, ThemeId, themeOf, THEMES_SHOWN, themeShown, useDesign } from '@/design';
import { go } from '@/screens/model';
import { setDesign } from '@/store';
import { faceFor, hair, radius, useT } from '@/theme';
import { Card, haptic, Press, Txt } from '@/ui/base';
import { Icon } from '@/ui/Icon';
import { ring, S, SR, useStd } from '@/ui/stdLook';
import { TextureFill } from '@/ui/Texture';

// In 設定 · 見た目: the themes in a row to try one on the spot, and the way to
// the デザイン page (試着室) to look at each on home and the timer first.

/** the themes that are ready (design.ts THEMES_SHOWN) */
const IDS = THEMES_SHOWN.filter((id) => themeShown(id)); // the main one first, the sub one last

/** bare: without its own card (inside a settings group). */
export function ThemeCard({ bare }: { bare?: boolean }) {
  const t = useT();
  const std = useStd();
  const d = useDesign();
  const body = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: bare ? 0 : 14 }}>
        <Txt size={13.5} w="600">テーマ</Txt>
        <Txt size={11.5} tone="ink3" style={{ flex: 1 }} numberOfLines={1}>{`いまは ${themeOf(d.theme).label}`}</Txt>
        <Press onPress={go.design} hitSlop={8} scale={0.94} accessibilityRole="button" accessibilityLabel="デザインをすべて見る"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Txt size={12.5} w={std ? '700' : '600'} color={t.blue}>デザイン</Txt>
          <Icon name="chev" size={11} color={t.blue} width={std ? 2 : undefined} />
        </Press>
      </View>
      {/* スタンダード: the tiles' outline is drawn outside them; the scroller (which clips) leaves room for it, the row still lined up */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={std ? { marginHorizontal: -4 } : undefined}
        contentContainerStyle={[{ gap: 8, paddingHorizontal: bare ? 0 : 12, paddingTop: 10 }, std && { gap: 10, paddingHorizontal: (bare ? 0 : 12) + 4, paddingTop: 12, paddingBottom: 4 }]} accessibilityRole="radiogroup">
        {IDS.map((id) => <ThemeTile key={id} id={id} width={92} on={d.theme === id} onPress={() => { haptic.tap(); setDesign({ theme: id }); }} />)}
      </ScrollView>
    </>
  );
  return bare ? <View style={{ paddingTop: 12, paddingBottom: 12 }}>{body}</View> : <Card pad={0} style={{ paddingTop: 12, paddingBottom: 12 }}>{body}</Card>;
}

/** スタンダード: a choice is the card's color in a thin ink outline; the picked one lime, in the full outline. */
const PICK = (on: boolean) => ({ borderWidth: 0, borderRadius: SR.mid, backgroundColor: on ? S.lime : S.card, boxShadow: ring(on ? 2 : 1.5) });
/** A theme as a small picture: its canvas and texture, a card in its outline and corners, and text in its face. */
function ThemeTile({ id, on, onPress, width = '31.5%' }: { id: ThemeId; on: boolean; onPress: () => void; width?: number | `${number}%` }) {
  const t = useT();
  const std = useStd();
  const th = themeOf(id);
  const c = th.colors ?? { canvas: '#F4F5F8', surface: '#FFFFFF', ink: '#121417', ink3: '#848A96', sunken: '#EFF1F5' };
  const r = th.corners ?? { card: 16, inner: 12 };
  return (
    <Press onPress={onPress} haptics={false} scale={0.96} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`テーマ ${th.label}${THEME_ROLE[id] ? `（${THEME_ROLE[id]}）` : ''}`}
      style={[{ width, padding: 5, gap: 6, borderRadius: radius.inner + 4, backgroundColor: t.surface, borderWidth: on ? 2 : hair, borderColor: on ? t.ink : t.line, alignItems: 'center' }, std && PICK(on)]}>
      <View style={[{ width: '100%', aspectRatio: 0.82, borderRadius: radius.inner, backgroundColor: c.canvas, overflow: 'hidden', padding: 7, gap: 6 }, std && { borderRadius: SR.mid - 5 }]}>
        <TextureFill texture={th.texture ?? null} />
        <View style={{ backgroundColor: c.surface, borderRadius: Math.min(r.card, 12), padding: 6, gap: 2, boxShadow: th.shadow?.[0] ?? '0px 0px 0px 0.5px rgba(15,23,42,0.08)' }}>
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
      {/* メイン / サブ under the name (the others: nothing) */}
      {THEME_ROLE[id] ? <Txt size={9.5} w="700" tone="ink3" lh={12} style={{ marginTop: -4 }}>{THEME_ROLE[id]}</Txt> : null}
    </Press>
  );
}
