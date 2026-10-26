import { StyleSheet, View } from 'react-native';

import { type Backdrop, BACKDROPS, themeId, themeOf, useDesign } from '../design';
import { setDesign } from '../store';
import { FLOOR, GROUND } from './backdrop/shared';
import { Btn, haptic, Press, Txt } from './base';
import { openSheet } from './Sheet';

// 背景: what moves behind every page and the timer (design.ts Backdrop) — the
// koi pond, sharks in a pale sea, people walking over a glass floor, or none.
// Chosen here (from the side menu, the timer's 背景, or the デザイン page). It
// goes with the standard theme only; the other themes have their own ground.

export const BACKDROP_NOTES: Record<Backdrop, string> = {
  none: 'いつもの地の色。タイマーは科目の色に染まります',
  pond: '暗い池を鯉がゆっくり泳ぎます。カードはすりガラス。タイマーでは水面をタップするとエサ',
  sea: '白い海を、シュモクザメやジンベエザメが泳ぎます。カードはすりガラス',
  walk: 'ガラスの床の下から見上げるように、いま勉強している人たちが上を歩いていきます',
};
const ORDER: Backdrop[] = ['pond', 'sea', 'walk', 'none'];

export function backdropSheet() {
  openSheet((close) => <BackdropChoice close={close} />, { grouped: true });
}
function BackdropChoice({ close }: { close: () => void }) {
  const d = useDesign();
  const standard = themeId(d.theme) === 'standard';
  const cur = standard ? d.backdrop : 'none';
  return (
    <View style={{ gap: 12, paddingTop: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 64 }} />
        <Txt size={17} w="700" style={{ flex: 1, textAlign: 'center' }} accessibilityRole="header">背景</Txt>
        <Btn kind="primary" small label="できた" onPress={close} style={{ width: 64 }} />
      </View>
      <Txt size={12.5} tone="ink3" style={{ textAlign: 'center' }}>
        {standard ? 'すべてのページとタイマーのうしろで動きます' : `背景はスタンダードのテーマで使えます（いまは ${themeOf(d.theme).label}）。選ぶとスタンダードに戻ります`}
      </Txt>
      {ORDER.map((id) => {
        const on = cur === id;
        return (
          <Press key={id} onPress={() => { haptic.tap(); setDesign(standard ? { backdrop: id } : { backdrop: id, theme: 'standard' }); }} scale={0.98}
            accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={BACKDROPS[id].label}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: on ? '#161616' : 'transparent' }}>
            <BackdropSwatch id={id} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Txt size={15.5} w="700" color="#161616">{BACKDROPS[id].label}</Txt>
              <Txt size={12.5} color="#848A96">{BACKDROP_NOTES[id]}</Txt>
            </View>
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: on ? 6 : 1.5, borderColor: on ? '#161616' : '#C7CBD3' }} />
          </Press>
        );
      })}
    </View>
  );
}
/** A tiny picture of each background. */
export function BackdropSwatch({ id }: { id: Backdrop }) {
  const cell = (c: string, i: number) => <View key={i} style={{ width: 6, height: 6, borderRadius: 1.5, backgroundColor: c }} />;
  const frame = { width: 50, height: 64, borderRadius: 10, overflow: 'hidden' as const, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.12)' };
  if (id === 'pond') {
    return (
      <View style={[frame, { backgroundColor: GROUND.pond, padding: 8, gap: 3, justifyContent: 'center' }]}>
        <View style={{ flexDirection: 'row', gap: 2 }}>{['#F1EBE0', '#D8442A', '#D8442A', '#F1EBE0'].map(cell)}</View>
        <View style={{ flexDirection: 'row', gap: 2, marginLeft: 8 }}>{['#D8442A', '#F1EBE0', '#F1EBE0'].map(cell)}</View>
        <View style={{ flexDirection: 'row', gap: 2, marginLeft: 4, marginTop: 6 }}>{['#E2B04A', '#E2B04A', '#E2B04A'].map(cell)}</View>
      </View>
    );
  }
  if (id === 'sea') {
    // a hammerhead, from above
    const g = (x: number, y: number, w: number, h: number, c: string) => <View style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 1.5, backgroundColor: c }} />;
    return (
      <View style={[frame, { backgroundColor: GROUND.sea }]}>
        {g(12, 14, 26, 6, '#6F7A8A')}
        {g(22, 20, 6, 22, '#7E8999')}
        {g(23, 42, 4, 10, '#AEB7C3')}
        {g(8, 50, 7, 1.5, '#AEB6C0')}
        {g(34, 8, 7, 1.5, '#AEB6C0')}
      </View>
    );
  }
  if (id === 'walk') {
    return (
      <View style={[frame, { backgroundColor: FLOOR }]}>
        <View style={{ position: 'absolute', left: 13, top: 14, width: 8, height: 20, borderRadius: 4, backgroundColor: '#1B1B1B', transform: [{ rotate: '-18deg' }] }} />
        <View style={{ position: 'absolute', left: 26, top: 26, width: 8, height: 20, borderRadius: 4, backgroundColor: 'rgba(27,27,27,0.35)', transform: [{ rotate: '-18deg' }] }} />
      </View>
    );
  }
  // none: the plain ground, a card on it
  return (
    <View style={[frame, { backgroundColor: '#ECEDF0', padding: 8, justifyContent: 'flex-end' }]}>
      <View style={{ height: 22, borderRadius: 5, backgroundColor: '#fff' }} />
    </View>
  );
}
