import { photoMeta, sceneHtml } from './scenes.generated';

export type Scene = {
  id: string;
  title: string;
  caption: string;
  hint: string;
  /** The same in English (photos may have none: the Japanese shows). */
  captionEn?: string;
  hintEn?: string;
  /** Matches the page background so there is no flash while the WebView loads. */
  background: string;
  /** Whether the scene is dark (light chrome) or light (dark chrome). Photos refine this once loaded. */
  tone: 'dark' | 'light';
  kind: 'scene' | 'photo';
  /** Photo credit and licence, shown in settings. */
  credit?: string;
  html: string;
};

const meta: Omit<Scene, 'html' | 'kind'>[] = [
  {
    id: 'koi',
    title: 'Koi',
    caption: '夜の鯉',
    hint: 'タップでエサ・魚の近くで驚いて逃げる',
    captionEn: 'Night koi',
    hintEn: 'Tap to feed · by a fish to startle it',
    background: '#121212',
    tone: 'dark',
  },
  {
    id: 'sharks',
    title: 'Shallows',
    caption: '浅瀬のサメ',
    hint: 'タップでエサ・魚の近くで驚いて逃げる',
    captionEn: 'Sharks in the shallows',
    hintEn: 'Tap to feed · by a fish to startle it',
    background: '#fbfbfa',
    tone: 'light',
  },
  {
    id: 'manta',
    title: 'Mantas',
    caption: '深い海のマンタ',
    hint: 'タップでエサ・近くで驚いて逃げる',
    captionEn: 'Mantas in the deep',
    hintEn: 'Tap to feed · by one to startle it',
    background: '#0a0e17',
    tone: 'dark',
  },
  {
    id: 'nightsharks',
    title: 'Night sharks',
    caption: '夜のサメ',
    hint: 'タップでエサ・近くで驚いて逃げる',
    captionEn: 'Sharks at night',
    hintEn: 'Tap to feed · by one to startle it',
    background: '#070b14',
    tone: 'dark',
  },
  {
    id: 'shrine',
    title: 'Shrine',
    caption: '秋の神社',
    hint: 'タップで落ち葉が舞う',
    captionEn: 'Shrine in autumn',
    hintEn: 'Tap to scatter leaves',
    background: '#1b1c12',
    tone: 'dark',
  },
  {
    id: 'blank',
    title: 'Blank',
    caption: '白紙',
    hint: '何もない一枚の紙',
    captionEn: 'Blank',
    hintEn: 'A plain sheet of paper',
    background: '#fafaf8',
    tone: 'light',
  },
  {
    id: 'walkers',
    title: 'Passersby',
    caption: '通りすがり',
    hint: 'タップすると驚いて逃げる',
    captionEn: 'Passing by',
    hintEn: 'Tap to startle them',
    background: '#f4f4f3',
    tone: 'light',
  },
];

export const scenes: Scene[] = [
  ...meta.map((m) => ({ ...m, kind: 'scene' as const, html: sceneHtml[m.id] })),
  ...photoMeta.map((m) => ({ ...m, kind: 'photo' as const, html: sceneHtml[m.id] })),
];
