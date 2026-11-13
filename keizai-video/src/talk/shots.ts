import { PLACES } from "../route/geo";
import { Graph } from "./Graphs";
import { MapSpec } from "./Maps";
import { Tone } from "./theme";

export type Overlay =
  | {
      kind: "big";
      /** Line at which the word appears */
      at: string;
      text: string;
      unit?: string;
      lead?: string;
      caption?: string;
      /** Size in layout units (default 15) */
      size?: number;
      top?: number;
      tone?: Tone;
      /** Extra frames after the line starts */
      delay?: number;
    }
  | { kind: "graph"; graph: Graph }
  | { kind: "chapter"; no: string; kicker?: string; title: string }
  | { kind: "host"; at: string; delay?: number }
  | { kind: "end" };

export type Shot = {
  /** A photograph from public/line/photos … */
  photo?: string;
  /** … or a drawn map */
  map?: MapSpec;
  focus?: string;
  move?: "in" | "out" | "left" | "right";
  tag?: string;
  /** How many of the three stops have been visited */
  trail?: number;
  dim?: number;
  lines: string[];
  overlay?: Overlay;
};

const { ohio, washington, newYork, tokyo } = PLACES;
const STOP1 = "1か所目　アメリカの食卓";
const STOP2 = "2か所目　投票所";
const STOP3 = "3か所目　株式市場";
const READ = "ボクなりの読み";

export const SHOTS: Shot[] = [
  // 掴み：1枚の請求書
  {
    map: {
      kind: "us",
      zoom: { from: 1, to: 1.9, on: ohio },
      highlight: "ohio",
      marks: [{ at: ohio, label: "オハイオ州", delay: 30 }],
    },
    lines: ["a01"],
  },
  {
    map: {
      kind: "pacific",
      highlight: "usa-japan",
      marks: [
        { at: ohio, label: "オハイオ", side: "left" },
        { at: tokyo, label: "東京", side: "right", delay: 110 },
      ],
      links: [{ from: ohio, to: tokyo, delay: 20, draw: 110, bow: -0.2 }],
    },
    lines: ["a02"],
  },
  {
    photo: "floor.jpg",
    move: "out",
    dim: 0.2,
    lines: ["a03"],
    overlay: {
      kind: "graph",
      graph: {
        kind: "line",
        at: "a03",
        delay: 10,
        title: "日経平均株価（終値）",
        points: 5,
        drop: "−3,643円",
        source: "11月6日は過去3番目の下げ幅（日本経済新聞）",
      },
    },
  },
  { photo: "mailboxes.jpg", move: "left", lines: ["a04"] },
  { photo: "towers_pink.jpg", lines: ["a05"] },

  // 挨拶と、今日の道のり
  {
    photo: "bundles.jpg",
    move: "right",
    lines: ["b01", "b02"],
    overlay: { kind: "host", at: "b01", delay: 70 },
  },
  {
    map: {
      kind: "pacific",
      highlight: "usa-japan",
      marks: [
        {
          at: ohio,
          label: "食卓",
          note: "オハイオ州",
          side: "left",
          cue: "b04",
          delay: 45,
        },
        {
          at: washington,
          label: "投票所",
          side: "bottom",
          cue: "b04",
          delay: 120,
        },
        {
          at: tokyo,
          label: "株式市場",
          note: "東京・兜町",
          side: "right",
          cue: "b04",
          delay: 180,
        },
      ],
      links: [{ from: ohio, to: tokyo, delay: 50, draw: 140, bow: -0.2 }],
    },
    lines: ["b03", "b04"],
  },
  { photo: "tokyo_dawn.jpg", move: "left", lines: ["b05"] },

  // 1か所目
  {
    photo: "kitchen.jpg",
    dim: 0.55,
    trail: 0,
    lines: ["c01"],
    overlay: {
      kind: "chapter",
      no: "1",
      kicker: "1か所目",
      title: "アメリカの食卓",
    },
  },
  {
    photo: "cranes.jpg",
    focus: "50% 60%",
    tag: STOP1,
    trail: 0,
    lines: ["c02"],
  },
  { photo: "townhall.jpg", tag: STOP1, trail: 0, lines: ["c03", "c04"] },
  {
    photo: "meters.jpg",
    tag: STOP1,
    trail: 0,
    lines: ["c05"],
    overlay: {
      kind: "big",
      at: "c05",
      text: "電気代",
      delay: 24,
      top: 15,
      size: 17,
    },
  },
  {
    photo: "windows.jpg",
    tag: STOP1,
    trail: 0,
    move: "out",
    lines: ["c06", "c07"],
    overlay: {
      kind: "graph",
      graph: {
        kind: "dots",
        at: "c06",
        delay: 130,
        title: "「AIのせいで電気代が上がる」と心配している人",
        value: 77,
        source: "ロイター／イプソス世論調査（2026年6月、約4,500人）",
      },
    },
  },
  {
    photo: "us_night.jpg",
    tag: STOP1,
    trail: 0,
    lines: ["c08"],
    overlay: {
      kind: "big",
      at: "c08",
      delay: 150,
      text: "1割以上",
      lead: "家庭の電気料金　2024年から",
      caption: "米エネルギー情報局の統計（ロイター報道）",
      tone: "down",
      size: 12,
      top: 11,
    },
  },
  { photo: "alley.jpg", tag: STOP1, trail: 0, lines: ["c09"] },
  { photo: "suburb.jpg", tag: STOP1, trail: 0, move: "out", lines: ["c10"] },
  { photo: "living.jpg", tag: STOP1, trail: 0, lines: ["c11"] },
  {
    photo: "towers_orange.jpg",
    tag: STOP1,
    trail: 0,
    move: "left",
    lines: ["c12"],
  },
  {
    photo: "fed.jpg",
    tag: STOP1,
    trail: 0,
    lines: ["c13", "c14"],
    overlay: {
      kind: "big",
      at: "c14",
      delay: 110,
      text: "2〜6",
      unit: "%",
      lead: "データセンターが押し上げた分",
      caption: "卸電力価格への影響（ダラス連銀の試算）",
      tone: "cool",
      size: 14,
      top: 11,
    },
  },
  { photo: "suburb_night.jpg", tag: STOP1, trail: 1, lines: ["c15"] },

  // 2か所目
  {
    photo: "votesign2.jpg",
    dim: 0.55,
    trail: 1,
    lines: ["d01"],
    overlay: { kind: "chapter", no: "2", kicker: "2か所目", title: "投票所" },
  },
  { photo: "polling.jpg", tag: STOP2, trail: 1, lines: ["d02"] },
  {
    photo: "votesign.jpg",
    tag: STOP2,
    trail: 1,
    move: "right",
    lines: ["d03"],
  },
  {
    photo: "sticker_hand.jpg",
    tag: STOP2,
    trail: 1,
    lines: ["d04"],
    overlay: {
      kind: "graph",
      graph: {
        kind: "grid",
        at: "d04",
        delay: 70,
        title: "住民投票で、建設を制限する側が勝った数",
        total: 45,
        on: 44,
        unit: "件",
        source: "開票が済んだ45件（AP通信が伝えた集計）",
      },
    },
  },
  {
    map: {
      kind: "us",
      zoom: { from: 1.25, to: 1.5, on: ohio },
      highlight: "ohio",
      marks: [
        { at: ohio, label: "オハイオ州", note: "47件のうち21件", delay: 50 },
      ],
    },
    tag: STOP2,
    trail: 1,
    lines: ["d05"],
  },
  {
    photo: "capitol_dusk.jpg",
    tag: STOP2,
    trail: 1,
    move: "right",
    lines: ["d06"],
  },
  {
    map: {
      kind: "us",
      zoom: { from: 2.5, to: 2.7, on: [-79.6, 39.6] },
      marks: [
        { at: ohio, label: "住民投票", note: "オハイオ州ほか", side: "left" },
        {
          at: washington,
          label: "議会の選挙",
          note: "ワシントン",
          side: "bottom",
          delay: 30,
        },
      ],
      links: [
        {
          from: ohio,
          to: washington,
          delay: 40,
          draw: 70,
          dotted: true,
          bow: -0.28,
          label: "ここは点線",
        },
      ],
    },
    tag: STOP2,
    trail: 1,
    lines: ["d07", "d08"],
  },
  {
    photo: "booths.jpg",
    tag: STOP2,
    trail: 1,
    lines: ["d09", "d10"],
    overlay: {
      kind: "graph",
      graph: {
        kind: "people",
        at: "d09",
        delay: 90,
        title: "データセンターを投票の決め手にした人",
        total: 4,
        on: 1,
        label: "4人に1人",
        source: "AP通信の有権者調査",
      },
    },
  },
  {
    photo: "courthouse.jpg",
    tag: STOP2,
    trail: 1,
    move: "out",
    lines: ["d11"],
  },
  { photo: "capitol.jpg", tag: STOP2, trail: 2, move: "left", lines: ["d12"] },

  // 3か所目
  {
    photo: "tse.jpg",
    dim: 0.55,
    trail: 2,
    lines: ["e01"],
    overlay: { kind: "chapter", no: "3", kicker: "3か所目", title: "株式市場" },
  },
  {
    photo: "wafer.jpg",
    tag: STOP3,
    trail: 2,
    lines: ["e02", "e03"],
    overlay: {
      kind: "big",
      at: "e02",
      delay: 150,
      text: "−12",
      unit: "%",
      lead: "アメリカの半導体株指数",
      caption: "11月5日、1日の下落率（外為どっとコム）",
      tone: "down",
      size: 17,
      top: 9,
    },
  },
  { photo: "servers.jpg", tag: STOP3, trail: 2, lines: ["e04"] },
  {
    map: {
      kind: "pacific",
      highlight: "usa-japan",
      marks: [
        { at: newYork, label: "ニューヨーク", note: "11月5日", side: "left" },
        {
          at: tokyo,
          label: "東京",
          note: "11月6日",
          side: "right",
          delay: 110,
        },
      ],
      links: [{ from: newYork, to: tokyo, delay: 20, draw: 110, bow: -0.2 }],
    },
    tag: STOP3,
    trail: 2,
    lines: ["e05"],
  },
  {
    photo: "station.jpg",
    focus: "50% 40%",
    tag: STOP3,
    trail: 2,
    lines: ["e06", "e07", "e08", "e09"],
    overlay: {
      kind: "graph",
      graph: {
        kind: "bars",
        title: "同じ週の月曜〜木曜、どれだけ下がった？",
        max: 3.5,
        rows: [
          {
            label: "日経平均",
            value: 3.5,
            text: "−3.5%",
            tone: "down",
            at: "e07",
            delay: 40,
          },
          {
            label: "TOPIX",
            value: 0.62,
            text: "−0.6%",
            tone: "cool",
            at: "e09",
            ask: "e08",
          },
        ],
        note: { at: "e09", delay: 60, text: "6倍近い差" },
        source: "11月2日〜5日、終値から計算",
      },
    },
  },
  { photo: "chip.jpg", tag: STOP3, trail: 2, lines: ["e10"] },
  {
    photo: "tse_wide.jpg",
    tag: STOP3,
    trail: 2,
    move: "right",
    lines: ["e11"],
  },
  { photo: "aisle.jpg", tag: STOP3, trail: 2, lines: ["e12"] },
  { photo: "meters.jpg", tag: STOP3, trail: 3, move: "out", lines: ["e13"] },

  // ボクなりの読み
  {
    photo: "towers_orange.jpg",
    dim: 0.4,
    trail: 3,
    lines: ["f01"],
    overlay: { kind: "chapter", no: "", title: "ここからは、\nボクなりの読み" },
  },
  { photo: "chip2.jpg", tag: READ, trail: 3, lines: ["f02"] },
  { photo: "suburb.jpg", tag: READ, trail: 3, move: "out", lines: ["f03"] },
  {
    photo: "tokyo_dusk.jpg",
    tag: READ,
    trail: 3,
    move: "right",
    dim: 0.2,
    lines: ["f04"],
    overlay: {
      kind: "graph",
      graph: {
        kind: "line",
        at: "f04",
        delay: 6,
        title: "日経平均株価（終値）",
        points: 9,
        drop: "−3,643円",
        rebound: "+3,385円",
        source: "11月12日の終値まで（日本経済新聞、株探）",
      },
    },
  },
  { photo: "mailboxes.jpg", tag: READ, trail: 3, lines: ["f05"] },
  {
    photo: "living_night.jpg",
    tag: READ,
    trail: 3,
    move: "out",
    lines: ["f06"],
  },

  // 締め：今日の道のり
  {
    map: {
      kind: "us",
      zoom: { from: 2.4, to: 2.6, on: [-78.6, 39.9] },
      marks: [
        {
          at: ohio,
          label: "請求書と住民投票",
          note: "オハイオ州ほか",
          side: "left",
          cue: "g02a",
        },
        {
          at: washington,
          label: "議会の選挙",
          note: "ワシントン",
          side: "bottom",
          cue: "g02a",
          delay: 70,
        },
        {
          at: newYork,
          label: "半導体株",
          note: "ニューヨーク",
          side: "top",
          cue: "g02a",
          delay: 105,
        },
      ],
      links: [
        {
          from: ohio,
          to: washington,
          cue: "g02a",
          delay: 40,
          draw: 40,
          dotted: true,
          bow: -0.28,
        },
        {
          from: washington,
          to: newYork,
          cue: "g02a",
          delay: 85,
          draw: 30,
          bow: -0.2,
        },
      ],
    },
    tag: "今日の道のり",
    lines: ["g01", "g02a"],
  },
  {
    map: {
      kind: "pacific",
      highlight: "usa-japan",
      marks: [
        { at: newYork, label: "半導体株", note: "ニューヨーク", side: "left" },
        {
          at: tokyo,
          label: "日経平均",
          note: "東京",
          side: "right",
          cue: "g02b",
          delay: 60,
        },
      ],
      links: [{ from: newYork, to: tokyo, delay: 10, draw: 100, bow: -0.2 }],
    },
    tag: "今日の道のり",
    lines: ["g02b", "g03"],
  },
  { photo: "alley.jpg", tag: "最後に1個だけ", lines: ["g04", "g05"] },
  {
    photo: "us_night.jpg",
    dim: 0.5,
    move: "out",
    lines: ["g06", "g07"],
    overlay: { kind: "end" },
  },
];
