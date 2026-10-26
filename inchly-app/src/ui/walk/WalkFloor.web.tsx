import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { StyleSheet, View } from 'react-native';

import type { FloorProps } from './WalkCanvas';

// In a browser, Skia's engine (CanvasKit, public/canvaskit.wasm) loads first;
// until it has, the floor is bare.
export function WalkFloor(props: FloorProps) {
  return (
    <WithSkiaWeb opts={{ locateFile: (f: string) => `/${f}` }} getComponent={() => import('./WalkCanvas')} componentProps={props}
      fallback={<View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: props.floor ?? '#F1F1EE' }]} />} />
  );
}
