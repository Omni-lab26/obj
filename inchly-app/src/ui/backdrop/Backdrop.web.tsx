import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import type { EngineProps } from './EngineSkia';
import { useInView } from './live';
import { GROUND, useBackdrop } from './shared';
import type { ViewProps } from './ViewSkia';

// In a browser, Skia's engine (CanvasKit, public/canvaskit.wasm) loads first;
// until it has, the 背景 is its bare ground.

const opts = { locateFile: (f: string) => `/${f}` };

export function BackdropEngine() {
  const b = useBackdrop();
  const { width, height } = useWindowDimensions();
  if (b === 'none') return null;
  return <WithSkiaWeb<EngineProps> key={b} opts={opts} getComponent={() => import('./EngineSkia')} componentProps={{ kind: b, width, height }} />;
}

export function BackdropView({ always }: { always?: boolean }) {
  const b = useBackdrop();
  const { width, height } = useWindowDimensions();
  const seen = useInView(!always);
  const inView = always || seen;
  if (b === 'none') return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: GROUND[b] }]}>
      {inView ? <WithSkiaWeb<ViewProps> opts={opts} getComponent={() => import('./ViewSkia')} componentProps={{ width, height }} /> : null}
    </View>
  );
}
