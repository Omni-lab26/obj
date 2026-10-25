import { arrange, arrangeZones, Block, HOME as BASE_HOME, TIMER } from '../layout';

// arrange() is tested on a fuller home than the base has now, so every rule has something to bite on.
const HOME: Block[] = [
  { id: 'today', sections: ['today', 'chart', 'now'] },
  { id: 'streak', sections: ['streak'] },
  { id: 'todos', sections: ['todos'] },
  { id: 'deadlines', sections: ['deadlines'] },
  { id: 'peers', sections: ['peers'] },
];

const kinds = (bs: Block[]) => bs.flatMap((b) => b.sections);

describe('the base home', () => {
  it('opens with the grass, then the streak', () => {
    expect(BASE_HOME.flatMap((b) => b.sections).slice(0, 2)).toEqual(['grass', 'streak']);
  });

  it('puts a section the base gained before everything when a theme never mentions it', () => {
    const out = arrange(BASE_HOME, () => [{ id: 'streak', sections: ['streak'] }, { id: 'peers', sections: ['peers'] }, { id: 'today', sections: ['today'] }]);
    expect(out.flatMap((b) => b.sections)).toEqual(['grass', 'streak', 'peers', 'today', 'badges']);
  });
});

describe('arrange', () => {
  it('keeps the base when a theme has no arrangement', () => {
    expect(arrange(HOME)).toBe(HOME);
  });

  it('follows the theme’s order, groups and rows', () => {
    const out = arrange(HOME, () => [
      { id: 'top', sections: ['streak', 'todos'], row: true },
      { id: 'today', sections: ['today', 'chart', 'now'] },
      { id: 'deadlines', sections: ['deadlines'] },
      { id: 'peers', sections: ['peers'] },
    ]);
    expect(out[0]).toEqual({ id: 'top', sections: ['streak', 'todos'], row: true });
    expect(kinds(out)).toEqual(['streak', 'todos', 'today', 'chart', 'now', 'deadlines', 'peers']);
  });

  it('never loses a base section the theme leaves out: it comes after the block before it in the base', () => {
    const out = arrange(HOME, () => [{ id: 'today', sections: ['today', 'now'] }, { id: 'peers', sections: ['peers'] }]);
    expect(kinds(out).sort()).toEqual(kinds(HOME).sort());
    // chart lands right after the rest of its base block
    expect(out[1]).toEqual({ id: 'today+', sections: ['chart'], row: undefined });
    // streak, todos and deadlines follow in base order, before peers
    expect(kinds(out)).toEqual(['today', 'now', 'chart', 'streak', 'todos', 'deadlines', 'peers']);
  });

  it('drops sections the base no longer has, keeps the theme’s own, and draws nothing twice', () => {
    const out = arrange(HOME, (base) => [
      { id: 'mine', sections: ['x:ticker', 'gone' as never, 'today'] },
      { id: 'again', sections: ['today'] },
      ...base.slice(1),
    ]);
    expect(out[0].sections).toEqual(['x:ticker', 'today']);
    expect(out.find((b) => b.id === 'again')).toBeUndefined();
    expect(kinds(out).filter((k) => k === 'today')).toHaveLength(1);
    expect(kinds(out)).toContain('chart');
  });
});

describe('arrangeZones', () => {
  it('keeps the base when a theme has no arrangement', () => {
    expect(arrangeZones(TIMER)).toBe(TIMER);
  });

  it('moves parts between zones and keeps the ones left out in their base zone', () => {
    const out = arrangeZones(TIMER, () => ({ head: ['top', 'x:pal'], center: ['subject', 'readout'], foot: ['main', 'record'] }));
    // the switcher stays in the head, after the part before it that's still there
    expect(out.head).toEqual(['top', 'switcher', 'x:pal']);
    expect(out.center).toEqual(['subject', 'readout', 'progress', 'today']);
    expect(out.foot).toEqual(['main', 'record']);
    const all = [...out.head, ...out.center, ...out.foot];
    expect(new Set(all).size).toBe(all.length);
  });
});
