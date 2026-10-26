import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

import type { PondProps } from './KoiCanvas';

// In a browser, Skia's engine (CanvasKit, public/canvaskit.wasm) loads first;
// until it has, the water is just dark.
export function KoiPond(props: PondProps) {
  return <WithSkiaWeb opts={{ locateFile: (f: string) => `/${f}` }} getComponent={() => import('./KoiCanvas')} componentProps={props} />;
}
