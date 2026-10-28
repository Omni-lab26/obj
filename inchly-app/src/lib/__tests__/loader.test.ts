/// <reference types="jest" />
import { nextLoader } from '../loaders';

describe('the loading mark', () => {
  it('is another one every time, and all nine come up', () => {
    const seen = new Set<string>();
    let prev = nextLoader();
    seen.add(prev);
    for (let i = 0; i < 400; i++) {
      const k = nextLoader();
      expect(k).not.toBe(prev);
      seen.add(k);
      prev = k;
    }
    expect(seen.size).toBe(9);
  });
});
