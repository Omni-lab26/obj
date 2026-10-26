import { StyleSheet, View } from 'react-native';

import { setStudyBg, type StudyBg, useStore } from '../store';
import { Btn, haptic, Press, Txt } from './base';
import { openSheet } from './Sheet';

// The theme of the study screen — what's behind the cards while you study:
// the koi pond, people walking over a glass floor, or the centered card's
// color. Chosen from the timer (テーマ) or the side menu.

/** The glass floor's color. */
export const FLOOR = '#F1F1EE';
export const THEME_NAMES: Record<StudyBg, string> = { pond: '鯉の池', walk: '歩く人', color: '科目の色' };

/** The study screen's theme: what's behind it. */
export function themeSheet() {
  openSheet((close) => <BgChoice close={close} />, { grouped: true });
}
function BgChoice({ close }: { close: () => void }) {
  const cur = useStore((s) => s.studyBg);
  const items: { id: StudyBg; name: string; sub: string }[] = [
    { id: 'pond', name: THEME_NAMES.pond, sub: '暗い池を、鯉がカードをよけてゆっくり泳ぎます。水面をタップするとエサ' },
    { id: 'walk', name: THEME_NAMES.walk, sub: 'ガラスの床の下から見上げるように、いま勉強している人たちが上を歩いていきます' },
    { id: 'color', name: THEME_NAMES.color, sub: '真ん中のカードの科目の色に、画面が染まります' },
  ];
  return (
    <View style={{ gap: 12, paddingTop: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 64 }} />
        <Txt size={17} w="700" style={{ flex: 1, textAlign: 'center' }} accessibilityRole="header">テーマ</Txt>
        <Btn kind="primary" small label="できた" onPress={close} style={{ width: 64 }} />
      </View>
      {items.map((x) => {
        const on = cur === x.id;
        return (
          <Press key={x.id} onPress={() => { haptic.tap(); setStudyBg(x.id); }} scale={0.98} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={x.name}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: on ? '#161616' : 'transparent' }}>
            <Swatch id={x.id} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Txt size={15.5} w="700">{x.name}</Txt>
              <Txt size={12.5} tone="ink3">{x.sub}</Txt>
            </View>
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: on ? 6 : 1.5, borderColor: on ? '#161616' : '#C7CBD3' }} />
          </Press>
        );
      })}
    </View>
  );
}
/** A tiny picture of each background. */
function Swatch({ id }: { id: StudyBg }) {
  const cell = (c: string, i: number) => <View key={i} style={{ width: 6, height: 6, borderRadius: 1.5, backgroundColor: c }} />;
  if (id === 'pond') {
    return (
      <View style={{ width: 50, height: 64, borderRadius: 10, backgroundColor: '#0B1117', padding: 8, gap: 3, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 2 }}>{['#F1EBE0', '#D8442A', '#D8442A', '#F1EBE0'].map(cell)}</View>
        <View style={{ flexDirection: 'row', gap: 2, marginLeft: 8 }}>{['#D8442A', '#F1EBE0', '#F1EBE0'].map(cell)}</View>
        <View style={{ flexDirection: 'row', gap: 2, marginLeft: 4, marginTop: 6 }}>{['#E2B04A', '#E2B04A', '#E2B04A'].map(cell)}</View>
      </View>
    );
  }
  if (id === 'walk') {
    return (
      <View style={{ width: 50, height: 64, borderRadius: 10, backgroundColor: FLOOR, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.12)' }}>
        <View style={{ position: 'absolute', left: 13, top: 14, width: 8, height: 20, borderRadius: 4, backgroundColor: '#1B1B1B', transform: [{ rotate: '-18deg' }] }} />
        <View style={{ position: 'absolute', left: 26, top: 26, width: 8, height: 20, borderRadius: 4, backgroundColor: 'rgba(27,27,27,0.35)', transform: [{ rotate: '-18deg' }] }} />
      </View>
    );
  }
  return <View style={{ width: 50, height: 64, borderRadius: 10, backgroundColor: '#5856D6' }} />;
}

