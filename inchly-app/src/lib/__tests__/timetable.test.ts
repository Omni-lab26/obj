/// <reference types="jest" />
import { Block, blocksOn, endOf, minutesUntil, slotsOf, suggestion, toClock, toMin } from '../timetable';

// 2026-10-21 is a Wednesday (Monday index 2)
const at = (h: number, m = 0) => new Date(2026, 9, 21, h, m);
const blocks: Block[] = [
  { id: 'b3', s: 'ma', start: '19:00', min: 60, days: [0, 1, 2, 3, 4] },
  { id: 'b1', s: 'ja', start: '6:30', min: 30, days: [0, 1, 2, 3, 4, 5, 6] },
  { id: 'b2', s: 'en', start: '17:00', min: 60, days: [2] },
  { id: 'b4', s: 'ph', start: '21:00', min: 45, days: [5, 6] },
];

describe('timetable', () => {
  it('reads and writes clock times', () => {
    expect(toMin('6:30')).toBe(390);
    expect(toClock(1290)).toBe('21:30');
    expect(endOf(blocks[0])).toBe('20:00');
  });
  it('keeps the weekday blocks, earliest first', () => {
    expect(blocksOn(blocks, at(12)).map((b) => b.id)).toEqual(['b1', 'b2', 'b3']);
    expect(blocksOn(blocks, new Date(2026, 9, 24, 12)).map((b) => b.id)).toEqual(['b1', 'b4']); // Saturday
  });
  it('marks past, now, next and later', () => {
    expect(slotsOf(blocks, at(17, 20)).map((x) => x.state)).toEqual(['past', 'now', 'next']);
    expect(slotsOf(blocks, at(12)).map((x) => x.state)).toEqual(['past', 'next', 'later']);
  });
  it('suggests the block under way, else the next', () => {
    expect(suggestion(blocks, at(17, 20))?.block.id).toBe('b2');
    expect(suggestion(blocks, at(18, 10))?.block.id).toBe('b3');
    expect(suggestion(blocks, at(23))).toBeNull();
  });
  it('counts down to a block', () => {
    expect(minutesUntil(blocks[0], at(18, 10))).toBe(50);
  });
});
