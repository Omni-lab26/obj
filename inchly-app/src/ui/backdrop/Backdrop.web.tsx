import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import type { EngineProps } from './EngineSkia';
import { useInView } from './live';
import { GROUND, useBackdrop } from './shared';
import { Veil, type VeilLook } from './Veil';
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

/**
 * The 背景 behind a page, filling the screen (from its top left corner); drawn
 * while the page is in view (live.ts). always: the timer's. look: frosted
 * over (the pages), a little paler (the timer), or clear (眺める) — Veil.tsx.
 */
export function BackdropView({ always, look = 'frost' }: { always?: boolean; look?: VeilLook }) {
  const b = useBackdrop();
  const { width, height } = useWindowDimensions();
  const seen = useInView(!always);
  const inView = always || seen;
  if (b === 'none') return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: GROUND[b] }]}>
      {inView ? <WithSkiaWeb<ViewProps> opts={opts} getComponent={() => import('./ViewSkia')} componentProps={{ width, height }} /> : null}
      <Veil look={look} still={!inView} />
    </View>
  );
}
