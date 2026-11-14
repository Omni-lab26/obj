/**
 * Pauses between lines, in seconds, on top of the short default gap.
 * The same table drives both language versions (line ids are shared).
 *
 * The idea is to pause where a person talking to you would:
 *   breath – a small rest before moving on
 *   turn   – before the talk changes direction ("but…", "by the way…")
 *   land   – after a number or an answer, so it can sink in
 *   think  – after a question to the viewer: time to come up with an answer
 *   hand   – handing over to another voice, just before a quotation
 *   back   – after a quotation, before the host speaks again
 *   close  – the end of a section
 */
const breath = 0.25;
const turn = 0.45;
const land = 0.6;
const think = 1.1;
const hand = 0.7;
const back = 0.9;
const close = 0.85;

export const PACING: Record<string, { before?: number; after?: number }> = {
  // 掴み
  a01: { after: breath },
  a02: { after: land },
  a03: { after: land },
  a04: { after: turn },
  a05: { after: close },
  // 挨拶
  b02: { after: turn },
  b04: { after: breath },
  b05: { after: close },
  // 1か所目
  c01: { after: breath },
  c02: { after: turn },
  c02c: { after: land },
  c03: { after: think },
  c04: { after: land },
  c05: { after: land },
  c06: { after: turn },
  c07: { after: turn },
  c07b: { after: breath },
  c07c: { after: turn },
  c08: { after: land },
  c09: { after: breath },
  c11: { after: land },
  c12: { after: turn },
  c14: { after: land },
  c15: { after: turn },
  c16: { after: close },
  // 2か所目
  d01: { after: breath },
  d02: { after: breath },
  d02b: { after: turn },
  d04: { after: land },
  d04b: { after: land },
  d04c: { after: turn },
  d05: { after: turn },
  d05b: { after: hand },
  q1: { after: back },
  d05c: { after: land },
  d06: { after: turn },
  d08: { after: breath },
  d09: { after: breath },
  d10: { after: land },
  d11: { after: turn },
  d11b: { after: hand },
  q2: { after: back },
  d11c: { after: turn },
  d12: { after: close },
  // 3か所目
  e01: { after: breath },
  e02: { after: land },
  e03: { after: breath },
  e03b: { after: turn },
  e04: { after: land },
  e05: { after: land },
  e07: { after: breath },
  e08: { after: think + 0.2 },
  e09: { after: land },
  e10: { after: breath },
  e11: { after: land },
  e12: { after: breath },
  e12b: { after: breath },
  e13: { after: close },
  // ボクなりの読み
  f01: { after: breath },
  f02: { after: turn },
  f03: { after: land },
  f03b: { after: hand },
  q3: { after: back },
  f04: { after: turn },
  f05: { after: turn },
  f06: { after: close },
  // 締め
  g01: { after: breath },
  g02a: { after: breath },
  g02b: { after: turn },
  g03: { after: turn }, // a held breath before the conclusion
  g03b: { after: back },
  g04: { after: turn },
  g05: { after: think + 0.2 },
  g06: { after: breath },
};
