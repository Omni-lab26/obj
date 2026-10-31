/** A colour for the digits picked from the field in settings: a hue (0-360, across)
 *  and a lightness (1 white at the top, 0.5 the pure hue, 0 black at the bottom). */
export type DigitColor = { h: number; l: number };

/** The colour as #rrggbb (full saturation, as the field shows it). */
export function colorHex({ h, l }: DigitColor): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const hex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

/** The same colour, see-through. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
