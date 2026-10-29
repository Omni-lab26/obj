import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

import type { NeonCanvasProps } from './neonCanvas';

// In a browser, Skia's engine (CanvasKit, public/canvaskit.wasm) loads first.
const opts = { locateFile: (f: string) => `/${f}` };

export function NeonSign(p: NeonCanvasProps) {
  return <WithSkiaWeb<NeonCanvasProps> opts={opts} getComponent={() => import('./neonCanvas')} componentProps={p} />;
}
