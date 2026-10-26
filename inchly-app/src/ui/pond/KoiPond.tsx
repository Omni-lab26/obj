import KoiCanvas, { type PondProps } from './KoiCanvas';

// On the phone, Skia is there from the start.
export function KoiPond(props: PondProps) {
  return <KoiCanvas {...props} />;
}
