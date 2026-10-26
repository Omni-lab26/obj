import { Canvas, createPicture, Picture, Skia } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import { backdropPicture } from './shared';

// A page's view of the 背景: the engine's latest picture, put on the screen.

const EMPTY = createPicture(() => {}, Skia.XYWHRect(0, 0, 1, 1));

export type ViewProps = { width: number; height: number };

export default function ViewSkia({ width, height }: ViewProps) {
  const pic = useDerivedValue(() => backdropPicture.value ?? EMPTY);
  return (
    <Canvas style={{ width, height }}>
      <Picture picture={pic} />
    </Canvas>
  );
}
