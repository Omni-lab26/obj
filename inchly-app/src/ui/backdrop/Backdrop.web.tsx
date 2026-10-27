import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import type { EngineProps } from './EngineSkia';
import { useInView } from './live';
import { useDesign } from '../../design';
import { GROUND, SOFT_BLUR, useBackdrop } from './shared';
import { Veil, type VeilLook } from './Veil';
import type { ViewProps } from './ViewSkia';

// In a browser, Skia's engine (CanvasKit, public/canvaskit.wasm) loads first;
// until it has, the 背景 is its bare ground.

const opts = { locateFile: (f: string) => `/${f}` };

export function BackdropEngine() {
  const b = useBackdrop();
  const { width, height } = useWindowDimensions();
  const blur = SOFT_BLUR[useDesign().frost ?? 2] || SOFT_BLUR[2];
  if (b === 'none') return null;
  return <WithSkiaWeb<EngineProps> key={b} opts={opts} getComponent={() => import('./EngineSkia')} componentProps={{ kind: b, width, height, blur }} />;
}

/**
 * The 背景 behind a page, filling the screen (from its top left corner); drawn
 * while the page is in view (live.ts). always: the timer's. look: frosted
 * (the pages: the soft drawing under a white film), a little paler (the
 * timer: the mosaic), or clear (眺める) — Veil.tsx.
 */
export function BackdropView({ always, look = 'frost' }: { always?: boolean; look?: VeilLook }) {
  const b = useBackdrop();
  const { width, height } = useWindowDimensions();
  const frost = useDesign().frost ?? 2;
  const seen = useInView(!always);
  const inView = always || seen;
  // frosted pages show the soft drawing (unless 背景のぼかし is off); the timer and 眺める, the mosaic
  const soft = look === 'frost' && frost > 0;
  if (b === 'none') return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: GROUND[b] }]}>
      {inView ? <WithSkiaWeb<ViewProps> key={soft ? 'soft' : 'sharp'} opts={opts} getComponent={() => import('./ViewSkia')} componentProps={{ width, height, soft }} /> : null}
      <Veil look={look} />
    </View>
  );
}
