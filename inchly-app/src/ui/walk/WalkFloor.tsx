import WalkCanvas, { type FloorProps } from './WalkCanvas';

// On the phone, Skia is there from the start.
export function WalkFloor(props: FloorProps) {
  return <WalkCanvas {...props} />;
}
