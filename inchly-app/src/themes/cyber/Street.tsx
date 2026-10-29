import Scene, { type SceneProps } from './scene';

// The alley's Skia drawing. On the phone Skia is there from the start (the
// web loads it first: Street.web.tsx).
export function StreetScene(p: SceneProps) {
  return <Scene {...p} />;
}
