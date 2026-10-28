import { TIME_FONTS, timeFontOf } from '../timeFonts';

describe('the faces for the timer card\'s time', () => {
  it('finds the one picked, and falls back to the first (縦長) when none or an unknown one is saved', () => {
    expect(timeFontOf('round').name).toBe('丸い');
    expect(timeFontOf(undefined).id).toBe('tall');
    expect(timeFontOf('gone').id).toBe('tall');
  });
  it('has eight, each with its own id and a size that keeps "39:17" inside the card', () => {
    expect(TIME_FONTS).toHaveLength(8);
    expect(new Set(TIME_FONTS.map((f) => f.id)).size).toBe(8);
    for (const f of TIME_FONTS) {
      expect(f.size).toBeGreaterThan(0.2);
      expect(f.size).toBeLessThan(0.4);
    }
  });
});
