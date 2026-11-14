// Pauses for the "enyasu" episode (1 dollar = 160 yen). Same beats as pacing.ts.
const breath = 0.25;
const turn = 0.45;
const land = 0.6;
const think = 1.1;
const hand = 0.7;
const back = 0.9;
const close = 0.85;

export const ENYASU_PACING: Record<
  string,
  { before?: number; after?: number }
> = {
  // 掴み
  a01: { after: land },
  a02: { after: land },
  a03: { after: turn },
  a04: { after: land },
  a05: { after: close },
  // 挨拶
  b02: { after: turn },
  b03: { after: breath },
  b04: { after: close },
  // 1か所目
  c01: { after: breath },
  c02: { after: turn },
  c03: { after: turn },
  c04: { after: land },
  c04b: { after: turn },
  c05: { after: turn },
  c06: { after: breath },
  c06b: { after: land },
  c07: { after: land },
  c08: { after: close },
  // 2か所目
  d01: { after: breath },
  d02: { after: think },
  d03: { after: breath },
  d04: { after: think },
  d05: { after: land },
  d06: { after: land },
  d07: { after: turn },
  d08: { after: land },
  d09: { after: turn },
  d10: { after: breath },
  d11: { after: turn },
  d12: { after: close },
  // 3か所目
  e01: { after: breath },
  e02: { after: turn },
  e03: { after: turn },
  e04: { after: land },
  e05: { after: land },
  e06: { after: turn },
  e07: { after: breath },
  e07b: { after: land },
  e08: { after: hand },
  q1: { after: back },
  e09: { after: turn },
  e10: { after: hand },
  q2: { after: back },
  e11: { after: turn },
  e12: { after: breath },
  e12b: { after: land },
  e13: { after: close },
  // 読み
  f01: { after: breath },
  f02: { after: turn },
  f03: { after: land },
  f04: { after: breath },
  f04b: { after: land },
  f05: { after: turn },
  f06: { after: breath },
  f06b: { after: land },
  f07: { after: breath },
  f07b: { after: turn },
  f08: { after: breath },
  f09: { after: close },
  // 締め
  g01: { after: breath },
  g02: { after: turn },
  g03: { after: turn },
  g03b: { after: back },
  g04: { after: think + 0.2 },
  g05: { after: breath },
};
