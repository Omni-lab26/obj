import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { AreaId } from '../data';

// A subject as a picture instead of its first letter: 化学 a flask, 物理 an
// atom, 生物 a leaf, 地学 a mountain, 数学 π, 英語 a speech bubble with an A
// (リスニング headphones, 英作文 a pen), 国語 an open book (古文 a scroll, 漢文 a
// brush), 世界史 a temple, 日本史 a torii, 地理 a map, 公民 the scales, 情報 a
// laptop. Found from the subject's name, else from its 教科; a subject that
// matches neither keeps its first letter. Line drawings on a 24 grid, one
// color, so they sit on the subject's color like the letter did.

export type Glyph =
  | 'flask' | 'atom' | 'leaf' | 'mountain' | 'pi' | 'bubble' | 'headphones' | 'pen'
  | 'book' | 'scroll' | 'brush' | 'temple' | 'torii' | 'map' | 'scales' | 'laptop';

// the first that matches wins, so the narrower words come first
const BY_NAME: [RegExp, Glyph][] = [
  [/リスニング|listening/i, 'headphones'],
  [/英作文|作文|小論文|writing/i, 'pen'],
  [/古文/, 'scroll'],
  [/漢文|書道/, 'brush'],
  [/化学|化基|chem/i, 'flask'],
  [/物理|物基|phys/i, 'atom'],
  [/生物|生基|bio/i, 'leaf'],
  [/地学|地基/, 'mountain'],
  [/世界史/, 'temple'],
  [/日本史/, 'torii'],
  [/地理/, 'map'],
  [/政治|経済|公共|倫理|公民|現社/, 'scales'],
  [/情報|プログラ/, 'laptop'],
  [/数|算|math/i, 'pi'],
  [/英|english/i, 'bubble'],
  [/国語|現代文|現文|読解/, 'book'],
];
const BY_AREA: Partial<Record<AreaId, Glyph>> = { en: 'bubble', ma: 'pi', ja: 'book', sci: 'flask', soc: 'map', info: 'laptop' };

/** The picture for a subject, or null (keep its first letter). */
export function glyphOf(name: string, area?: AreaId): Glyph | null {
  for (const [re, g] of BY_NAME) if (re.test(name)) return g;
  return (area && BY_AREA[area]) || null;
}

export function SubjectGlyph({ glyph, size, color, width = 1.8 }: { glyph: Glyph; size: number; color: string; width?: number }) {
  const line = { stroke: color, strokeWidth: width, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const p = (d: string) => <Path d={d} {...line} />;
  let body;
  switch (glyph) {
    case 'flask':
      body = <>{p('M9.5 3.5h5M10.5 3.5v5.3L5.3 17.6A2 2 0 0 0 7 20.5h10a2 2 0 0 0 1.7-2.9l-5.2-8.8V3.5')}{p('M7.4 14.6h9.2')}<Circle cx={11} cy={17.3} r={0.9} fill={color} /><Circle cx={14} cy={16.6} r={0.7} fill={color} /></>;
      break;
    case 'atom':
      body = <><Circle cx={12} cy={12} r={1.4} fill={color} />{[0, 60, 120].map((a) => <G key={a} transform={`rotate(${a} 12 12)`}><Ellipse cx={12} cy={12} rx={9} ry={3.6} {...line} /></G>)}</>;
      break;
    case 'leaf':
      body = <>{p('M5 19C5 10.5 10.5 5 19 5c0 8.5-5.5 14-14 14z')}{p('M5 19l9-9M10 14.2V11M12.6 11.4H15')}</>;
      break;
    case 'mountain':
      body = <>{p('M2.5 19.5l6.5-10 4 6 2.5-3.5 6 7.5z')}{p('M7.2 12.3l1.8 1.3 1.6-1.4')}<Circle cx={17.5} cy={6} r={1.8} {...line} /></>;
      break;
    case 'pi':
      body = p('M4.5 8c.9-1.3 2.1-2 3.6-2h11.4M9.6 6v12.5M15 6v9.8c0 1.5.8 2.6 2.4 2.6.9 0 1.6-.4 2.1-1');
      break;
    case 'bubble':
      body = <>{p('M5 4.5h14a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-8l-4.5 3.5v-3.5H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z')}{p('M9.4 14l2.6-6.4 2.6 6.4M10.3 12h3.4')}</>;
      break;
    case 'headphones':
      body = <>{p('M4.5 15v-3a7.5 7.5 0 0 1 15 0v3')}<Rect x={3.5} y={13.5} width={4} height={6.5} rx={1.6} {...line} /><Rect x={16.5} y={13.5} width={4} height={6.5} rx={1.6} {...line} /></>;
      break;
    case 'pen':
      body = p('M4.5 19.5l1.2-4.3L15.8 5.1a2 2 0 0 1 2.8 0l.3.3a2 2 0 0 1 0 2.8L8.8 18.3zM14 7l3 3M4.5 19.5h7');
      break;
    case 'book':
      body = p('M12 6.6C9.6 5 6.6 4.7 3.5 5.4v13c3.1-.7 6.1-.4 8.5 1.2 2.4-1.6 5.4-1.9 8.5-1.2v-13c-3.1-.7-6.1-.4-8.5 1.2zM12 6.6v13');
      break;
    case 'scroll':
      body = p('M7 4h10.5A2.5 2.5 0 0 1 20 6.5V8h-3M7 4a2.5 2.5 0 0 0-2.5 2.5V8H7M7 4a2.5 2.5 0 0 1 2.5 2.5v11A2.5 2.5 0 0 0 12 20h7.5M17 8v9.5a2.5 2.5 0 0 0 2.5 2.5M12.5 9.5h2.5M12.5 12.5h2.5M12.5 15.5h2');
      break;
    case 'brush':
      body = p('M14.5 4.2l5.3 5.3-6.3 6.3-5.3-5.3zM8.2 10.5l5.3 5.3-2.6 2.6c-1.6 1.6-4.2 2.1-6.9 2.1 0-2.7.5-5.3 2.1-6.9z');
      break;
    case 'temple':
      body = p('M3.5 9L12 4l8.5 5zM5.8 9.5v7.5M9.9 9.5v7.5M14.1 9.5v7.5M18.2 9.5v7.5M4 17.5h16M3 20h18');
      break;
    case 'torii':
      body = p('M3 5.2c6 1.3 12 1.3 18 0M4.5 9.2h15M7 6.2V20M17 6.2V20M12 6.6v2.6');
      break;
    case 'map':
      body = p('M3 6.5L9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20zM9 4v13.5M15 6.5V20');
      break;
    case 'scales':
      body = p('M12 4v15.5M8 19.5h8M5 7.5h14M12 4.5h0M5 7.5l-2.6 6h5.2zM19 7.5l-2.6 6h5.2zM2.4 13.5a2.6 2.6 0 0 0 5.2 0M16.4 13.5a2.6 2.6 0 0 0 5.2 0');
      break;
    case 'laptop':
      body = <><Rect x={5} y={5.5} width={14} height={10} rx={1.6} {...line} />{p('M3 18.5h18M10.2 8.8l-1.9 1.9 1.9 1.9M13.8 8.8l1.9 1.9-1.9 1.9')}</>;
      break;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}
