import NeonCanvas, { type NeonCanvasProps } from './neonCanvas';

// A neon sign outside the alley. On the phone Skia is there from the start
// (the web loads it first: Neon.web.tsx). Check canTube (sign.ts) first: a
// sign that can't be tubes is a Lightbox.
export function NeonSign(p: NeonCanvasProps) {
  return <NeonCanvas {...p} />;
}
