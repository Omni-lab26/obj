import { Canvas, createPicture, Picture, Skia } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { useDerivedValue } from 'react-native-reanimated';

import { backdropPicture, backdropSoft, sharpUsers, softUsers } from './shared';

// A page's view of the 背景: the engine's latest picture, put on the screen —
// the soft one (behind frosted pages) or the mosaic. While it's shown, the
// engine knows to draw that one.

const EMPTY = createPicture(() => {}, Skia.XYWHRect(0, 0, 1, 1));

export type ViewProps = { width: number; height: number; soft?: boolean };

export default function ViewSkia({ width, height, soft }: ViewProps) {
  useEffect(() => {
    const users = soft ? softUsers : sharpUsers;
    users.value = users.value + 1;
    return () => { users.value = Math.max(0, users.value - 1); };
  }, [soft]);
  const pic = useDerivedValue(() => (soft ? backdropSoft.value : backdropPicture.value) ?? EMPTY);
  return (
    <Canvas style={{ width, height }}>
      <Picture picture={pic} />
    </Canvas>
  );
}
