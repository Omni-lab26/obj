import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { View } from 'react-native';

import type { SceneProps } from './scene';

// In a browser, Skia's engine (CanvasKit, public/canvaskit.wasm) loads first;
// until it has, the alley is its night sky.
const opts = { locateFile: (f: string) => `/${f}` };

export function StreetScene(p: SceneProps) {
  const ground = p.part === 'back' ? <View style={{ width: p.geo.w, height: p.geo.h, backgroundColor: '#06070D' }} /> : null;
  return <WithSkiaWeb<SceneProps> opts={opts} getComponent={() => import('./scene')} componentProps={p} fallback={ground} />;
}
