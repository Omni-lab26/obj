// 画面が使うデータの形。サーバー（Supabase）につないでも、この形のまま返す。

export type PostKind = 'slot' | 'breaking' | 'note' | 'deep';

export type Block =
  | { t: 'p'; x: string }
  | { t: 'h'; x: string }
  | { t: 'video'; len: string; title: string; img?: number }
  | { t: 'fig'; img: string; cap?: string }
  | { t: 'count'; label: string; value: number; dec: number; suf: string; sub?: string }
  | { t: 'compare'; title: string; a: [string, string]; b: [string, string] }
  | { t: 'steps'; title: string; items: [string, string][] }
  | { t: 'poll'; id: string; q: string; opts: [string, number][]; n: number }
  | { t: 'cards'; title: string; items: [string, string][] }
  | { t: 'refs'; items: [string, string, string][] }
  | {
      t: 'bars';
      title: string;
      sub?: string;
      unit: string;
      dec?: number;
      series: [string, string][];
      cols: [string, number[]][];
      thin?: boolean;
    }
  | {
      t: 'line';
      title: string;
      unit: string;
      dec: number;
      def: string;
      frames: Record<string, { base: number; end: number; n: number; vol: number; seed: number }>;
    }
  | {
      t: 'icompare';
      title: string;
      ylab: string;
      xlabels: string[];
      a: { label: string; pts: number[] };
      b: { label: string; pts: number[] };
      note?: string;
    }
  | { t: 'heat'; title: string; rows: string[]; cols: string[]; vals: number[][]; money?: boolean }
  | {
      t: 'calc';
      kind: 'power' | 'loan' | 'fx' | 'rice';
      title: string;
      min: number;
      max: number;
      val: number;
      unit: string;
      label: string;
    }
  | { t: 'swap'; title: string; rate: number; amt: number }
  | { t: 'accordion'; title: string; items: { h: string; x: string; img?: number }[] };

export type Article = {
  id: string;
  img?: number; // 見本の画像の番号（sq / th）
  placeholder?: boolean; // 本文がまだ見本の記事
  type?: 'note' | 'deep';
  brk?: boolean;
  vlen?: string;
  lab?: string;
  tag: string;
  tm: string;
  when: string;
  title: string;
  lead?: string;
  read?: number;
  text?: string; // ひとこと
  link?: [string, string];
  c: number; // 声の数（見本）
  r: number; // 反応の数（見本）
  blocks: Block[] | null;
};

export type Comment = { id: number; who: string; t: string; up: number; min: number; kids: Comment[]; liked?: boolean };

export type UserPost = {
  id: string;
  who: string;
  min: number;
  tag: string;
  up: number;
  t: string;
  link?: { dom: string; title: string };
};

export type Room = {
  id: string;
  kind: 'dm' | 'group';
  icon?: number;
  name: string;
  at: number;
  sub: string;
  n: number;
  members?: number;
  msgs: { me?: number; who?: string; t: string; share?: string; sys?: string }[];
};

export type Notice = {
  day: string;
  type: string;
  who?: string;
  text: string;
  q?: string;
  art?: string;
  at: string;
  unread?: boolean;
};

export type Genre = { name: string; img?: number; ids?: string[]; about?: string };
