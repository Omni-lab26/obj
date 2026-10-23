import { ComponentType, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

import { arrange, HOME, Kind, SectionKind } from '@/screens/layout';
import { go } from '@/screens/model';
import type { HomeKit, SectionProps } from '@/themes/types';
import { STANDARD_SECTIONS, StandardFrame, StandardHandle, StandardHeader, StandardPage } from './standard';

const openDesign = () => go.design();

// Home, for every theme: the base blocks (layout.ts) in the theme's order,
// each piece drawn by the theme or, where it draws nothing of its own, the
// standard way in its colors. Swiping right (or the handle on the left edge)
// opens the デザイン page, whatever the theme.
export function HomeScreen({ kit = {} }: { kit?: HomeKit }) {
  const blocks = useMemo(() => arrange(HOME, kit.arrange), [kit.arrange]);
  const Page = kit.Page ?? StandardPage;
  const Header = kit.Header ?? StandardHeader;
  const Frame = kit.Frame ?? StandardFrame;
  const Handle = kit.DesignHandle ?? StandardHandle;
  const [swipe] = useState(() => Gesture.Pan().activeOffsetX(24).failOffsetY([-14, 14])
    .onEnd((e) => { if (e.translationX > 70) scheduleOnRN(openDesign); }));
  return (
    <GestureDetector gesture={swipe}>
      <View style={{ flex: 1 }} collapsable={false}>
        <Page header={<Header />}>
          {blocks.map((b, i) => (
            <Frame key={b.id} block={b} index={i}>
              {b.sections.map((k, j) => <Section key={k} kind={k} own={kit.sections?.[k]} props={{ block: b, index: j, count: b.sections.length }} />)}
            </Frame>
          ))}
        </Page>
        <Handle onPress={openDesign} />
      </View>
    </GestureDetector>
  );
}

/** A section as the theme draws it, else the standard way; a theme's own ('x:…') only if it draws it. */
function Section({ kind, own, props }: { kind: Kind; own?: ComponentType<SectionProps>; props: SectionProps }) {
  const C = own ?? (kind in STANDARD_SECTIONS ? STANDARD_SECTIONS[kind as SectionKind] : undefined);
  return C ? <C {...props} /> : null;
}
