import { StyleSheet, useWindowDimensions, View } from 'react-native';

import EngineSkia from './EngineSkia';
import { useInView } from './live';
import { useDesign } from '../../design';
import { GROUND, SOFT_BLUR, useBackdrop } from './shared';
import { Veil, type VeilLook } from './Veil';
import ViewSkia from './ViewSkia';

// The 背景 (see shared.ts): the engine, once at the root, and a page's view of
// it. On the phone, Skia is there from the start (the web loads it first:
// Backdrop.web.tsx).

/** Runs the 背景 while there is one. */
export function BackdropEngine() {
  const b = useBackdrop();
  const { width, height } = useWindowDimensions();
  const blur = SOFT_BLUR[useDesign().frost ?? 2] || SOFT_BLUR[2];
  return b === 'none' ? null : <EngineSkia key={b} kind={b} width={width} height={height} blur={blur} />;
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
      {inView ? <ViewSkia width={width} height={height} soft={soft} /> : null}
      <Veil look={look} />
    </View>
  );
}
