import { existsSync } from 'fs';
import { join } from 'path';

import { THEMES_SHOWN, themeShown } from '../../design';
import { FIT_ASPECT, FIT_GAP, FIT_IDS, FIT_LINE, fitGeometry, fitLanding, fitRubber } from '../fitroom';

describe('the fitting room (デザイン)', () => {
  it('lists the themes that can be picked, in their order', () => {
    expect(FIT_IDS).toEqual(THEMES_SHOWN.filter((id) => themeShown(id)));
  });

  it('has a line and both photos for every theme on it', () => {
    for (const id of FIT_IDS) {
      expect(FIT_LINE[id]).toBeTruthy();
      for (const view of ['home', 'timer']) expect(existsSync(join(__dirname, '../../../assets/themes', `${id}-${view}.webp`))).toBe(true);
    }
  });

  it('lands back where the finger started for a short, slow drag', () => {
    expect(fitLanding(1, -40, -100, 260, 3)).toBe(1);
    expect(fitLanding(1, 40, 100, 260, 3)).toBe(1);
  });

  it('goes on past a third of a card, or with a flick, one theme at a time', () => {
    expect(fitLanding(1, -90, 0, 260, 3)).toBe(2);
    expect(fitLanding(1, 90, 0, 260, 3)).toBe(0);
    expect(fitLanding(1, -20, -800, 260, 3)).toBe(2);
    expect(fitLanding(1, 20, 800, 260, 3)).toBe(0);
    // a long drag still moves one
    expect(fitLanding(0, -700, -2000, 260, 3)).toBe(1);
  });

  it('never lands past the first or the last', () => {
    expect(fitLanding(0, 200, 900, 260, 3)).toBe(0);
    expect(fitLanding(2, -200, -900, 260, 3)).toBe(2);
  });

  it('gives a third of the way past the ends, and follows the finger in between', () => {
    expect(fitRubber(1.4, 2)).toBe(1.4);
    expect(fitRubber(-0.6, 2)).toBeCloseTo(-0.2);
    expect(fitRubber(2.9, 2)).toBeCloseTo(2.3);
  });

  it('fits the card to the room, the photo uncut, the neighbours still in sight', () => {
    const g = fitGeometry(390, 500);
    expect(g.h).toBe(484);
    expect(g.w).toBe(Math.round(484 * FIT_ASPECT));
    expect(g.step).toBe(g.w + FIT_GAP);
    expect(g.off).toBeCloseTo((390 - g.w) / 2);
    // a wide, short room: the card is at most 80% of it
    const wide = fitGeometry(400, 1200);
    expect(wide.w).toBe(320);
    expect(wide.h).toBe(Math.round(320 / FIT_ASPECT));
  });
});
