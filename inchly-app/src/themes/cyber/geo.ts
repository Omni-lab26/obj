import { signLayout, type SignLayout } from './sign';

// Where everything in the timer card's alley goes, for a picture of w × h
// (the parts bible's is 337 × 272): the street along the bottom (56 high),
// the subject's sign hanging 30 in from the right with 勉強中 under it, the
// tower behind the sign and two tenants' signs to its left, the pole and the
// vending machine on the left. The sign fits the room above 勉強中, and the
// tower, the tenants, 勉強中 and the reflection all follow the sign's box.

export const STREET = 56;
export type Box = { x: number; y: number; w: number; h: number };
export type AlleyGeo = {
  w: number; h: number;
  /** the top of the street */
  street0: number;
  L: SignLayout;
  /** the sign's box (with its padding) */
  sign: Box;
  /** each column of the sign, right to left: its text and box */
  cols: (Box & { text: string })[];
  /** 勉強中: standing under the sign when it fits, else level beside the street (right: its right edge, from the picture's) */
  open: { right: number; y: number; vert: boolean };
  /** the tenants' signs: where their right edge is (from the picture's right) and their tops */
  tenantRight: number;
  tenants: { y: number; floor: string; text: string; off?: boolean; dead?: number[] }[];
  /** the tower's left edge */
  towerX: number;
};

/** The vertical 勉強中 box: 12pt characters with 6 around them. */
export const OPEN_W = 26, OPEN_H = 46;
/** A tenant's acrylic sign: 14pt characters. */
const TENANT = 14;
const boxH = (n: number, ls: number) => n * Math.round(ls * 1.3) + (n - 1) * 2 + 4;

export function alleyGeo(w: number, h: number, S: { name: string; short?: string }): AlleyGeo {
  const street0 = h - STREET, top = 20;
  // the kit's sign has 124 of room in a 272-high picture: what's left above 勉強中 and the street
  const L = signLayout(S, Math.max(48, h - 148));
  const sign = { x: w - 30 - L.w, y: top, w: L.w, h: L.h };
  let cols: AlleyGeo['cols'] = [];
  if (!L.plate) {
    const cw = L.tube ? L.size : Math.round(L.ls * 1.3) + 4;
    const gap = L.tube ? Math.round(L.size * 0.08) : 2;
    cols = L.cols.map((text, i) => {
      const n = [...text].length;
      const ch = L.tube ? n * L.size + (n - 1) * gap : boxH(n, L.ls);
      return { text, x: sign.x + L.w - 10 - (i + 1) * cw - i * 10, y: top + 12, w: cw, h: ch };
    });
  }
  const openTop = top + L.h + 8;
  const vert = openTop + OPEN_H <= street0;
  const open = vert ? { right: Math.round(30 + L.w / 2 - OPEN_W / 2), y: openTop, vert } : { right: 30, y: Math.min(openTop, street0 - 26), vert };
  const tenantRight = 30 + L.w + 16;
  const tenants: AlleyGeo['tenants'] = [];
  // upstairs, another subject's sign, out (only the one you're on is lit); on 3F the study room, one panel dead
  if (24 + boxH(2, TENANT) <= street0 - 6) tenants.push({ y: 24, floor: '5F', text: S.name.includes('数学') ? '英語' : '数学', off: true });
  if (88 + boxH(3, TENANT) <= street0 - 6) tenants.push({ y: 88, floor: '3F', text: '自習室', dead: [2] });
  const towerX = w - Math.max(w * 0.5, tenantRight + 44);
  return { w, h, street0, L, sign, cols, open, tenantRight, tenants, towerX };
}
/** A tenant's sign size in points. */
export const TENANT_SIZE = TENANT;
