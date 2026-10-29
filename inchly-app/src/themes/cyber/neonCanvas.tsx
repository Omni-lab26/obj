import { Canvas } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

import { glowMargin, NeonTubes, tubesOf } from './neon';

// A neon sign on its own (outside the alley): a canvas the size of the sign
// and its glow, laid out as the sign alone (the glow spills over its edges).
export type NeonCanvasProps = { text: string; size: number; color: string; vert?: boolean; off?: boolean; power?: SharedValue<number> };

export default function NeonCanvas({ text, size, color, vert = false, off, power }: NeonCanvasProps) {
  const t = tubesOf(text, size, vert);
  if (!t) return null;
  const m = glowMargin(size);
  return (
    <Canvas style={{ width: t.W + 2 * m, height: t.H + 2 * m, margin: -m }}>
      <NeonTubes tubes={t} color={color} x={m} y={m} off={off} power={power} />
    </Canvas>
  );
}
