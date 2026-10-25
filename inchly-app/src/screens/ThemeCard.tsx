import { ScrollView, View } from 'react-native';

import { THEMES, themeOf, ThemeId, useDesign } from '@/design';
import { ThemeTile } from '@/screens/DesignPage';
import { go } from '@/screens/model';
import { setDesign } from '@/store';
import { useT } from '@/theme';
import { Card, haptic, Press, Txt } from '@/ui/base';
import { Icon } from '@/ui/Icon';

// On マイページ: the themes in a row to try one on the spot, and the way to
// the デザイン page for the rest (colors, corners, the cards).

const IDS = Object.keys(THEMES) as ThemeId[];

export function ThemeCard() {
  const t = useT();
  const d = useDesign();
  return (
    <Card pad={0} style={{ paddingTop: 12, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: 14 }}>
        <Txt size={13.5} w="600">テーマ</Txt>
        <Txt size={11.5} tone="ink3" style={{ flex: 1 }} numberOfLines={1}>{`いまは ${themeOf(d.theme).label}`}</Txt>
        <Press onPress={go.design} hitSlop={8} scale={0.94} accessibilityRole="button" accessibilityLabel="デザインをすべて見る"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Txt size={12.5} w="600" color={t.blue}>デザイン</Txt>
          <Icon name="chev" size={11} color={t.blue} />
        </Press>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingTop: 10 }} accessibilityRole="radiogroup">
        {IDS.map((id) => <ThemeTile key={id} id={id} width={92} on={d.theme === id} onPress={() => { haptic.tap(); setDesign({ theme: id }); }} />)}
      </ScrollView>
    </Card>
  );
}
