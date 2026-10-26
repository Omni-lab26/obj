import { StyleSheet, useWindowDimensions, View } from 'react-native';

import EngineSkia from './EngineSkia';
import { useInView } from './live';
import { GROUND, useBackdrop } from './shared';
import ViewSkia from './ViewSkia';

// The 背景 (see shared.ts): the engine, once at the root, and a page's view of
// it. On the phone, Skia is there from the start (the web loads it first:
// Backdrop.web.tsx).

/** Runs the 背景 while there is one. */
export function BackdropEngine() {
  const b = useBackdrop();
  const { width, height } = useWindowDimensions();
  return b === 'none' ? null : <EngineSkia key={b} kind={b} width={width} height={height} />;
}

/** The 背景 behind a page, filling the screen (from its top left corner); drawn while the page is in view (live.ts). always: the timer's. */
export function BackdropView({ always }: { always?: boolean }) {
  const b = useBackdrop();
  const { width, height } = useWindowDimensions();
  const seen = useInView(!always);
  const inView = always || seen;
  if (b === 'none') return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: GROUND[b] }]}>
      {inView ? <ViewSkia width={width} height={height} /> : null}
    </View>
  );
}
