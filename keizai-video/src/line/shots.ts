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
      warm?: boolean;
      /** Extra frames after the line starts */
      delay?: number;
    }
  | {
      kind: "tri";
      items: {
        photo: string;
        label: string;
        focus?: string;
        /** Enlarge the photo inside its panel, growing from `origin` */
        zoom?: number;
        origin?: string;
      }[];
    }
  | { kind: "chapter"; no: string; title: string }
  | { kind: "diagram" }
  | { kind: "end" };

export type Shot = {
  photo: string;
  /** CSS object-position, to keep the subject in frame */
  focus?: string;
  move?: "in" | "out" | "left" | "right";
  /** Small label in the top-left corner */
  tag?: string;
  /** How many of the three points are already on the line */
  trail?: number;
  /** Extra darkening, 0-1 */
  dim?: number;
  lines: string[];
  overlay?: Overlay;
};

const TAG1 = "1　何に怒っているのか";
const TAG2 = "2　選挙でどこに出たのか";
const TAG3 = "3　なぜ日本の株に届いたのか";

// One photograph per thought. Order here is the order on screen.
export const SHOTS: Shot[] = [
  // 掴み
  { photo: "readers.jpg", focus: "50% 35%", lines: ["a01"] },
  { photo: "capitol.jpg", move: "left", lines: ["a02"] },
  { photo: "cranes.jpg", focus: "50% 60%", lines: ["a03"] },
  { photo: "board.jpg", focus: "50% 100%", move: "out", lines: ["a04"] },
  {
    photo: "capitol_dusk.jpg",
    lines: ["a05"],
    overlay: {
      kind: "tri",
      items: [
        { photo: "capitol_dusk.jpg", label: "ワシントン" },
        { photo: "cranes.jpg", label: "全米のあちこち", focus: "30% 60%" },
        {
          photo: "board.jpg",
          label: "東京",
          focus: "72% 100%",
          zoom: 1.5,
          origin: "70% 100%",
        },
      ],
    },
  },
  // 挨拶
  { photo: "bundles.jpg", move: "right", lines: ["b01", "b02"] },
  {
    photo: "capitol_dusk.jpg",
    lines: ["b03"],
    overlay: {
      kind: "tri",
      items: [
        { photo: "capitol_dusk.jpg", label: "民主党の勝利" },
        {
          photo: "votesign2.jpg",
          label: "データセンターの住民投票",
          focus: "25% 50%",
        },
        {
          photo: "board.jpg",
          label: "日経平均 3,643円安",
          focus: "72% 100%",
          zoom: 1.5,
          origin: "70% 100%",
        },
      ],
    },
  },
  // 問い
  { photo: "whitehouse.jpg", lines: ["c01", "c02"] },
  {
    photo: "tokyo_dusk.jpg",
    move: "left",
    tag: "今日の問い",
    lines: ["c03", "d01"],
  },
  // 予告
  { photo: "suburb_night.jpg", tag: TAG1, lines: ["d02"] },
  { photo: "votesign.jpg", tag: TAG2, move: "right", lines: ["d03"] },
  { photo: "tse.jpg", tag: TAG3, lines: ["d04"] },
  { photo: "towers_pink.jpg", move: "out", lines: ["d05"] },

  // 1つ目
  {
    photo: "suburb.jpg",
    dim: 0.5,
    trail: 0,
    lines: ["e01"],
    overlay: {
      kind: "chapter",
      no: "1",
      title: "アメリカの住民は\n何に怒っているのか",
    },
  },
  { photo: "townhall.jpg", tag: TAG1, trail: 0, lines: ["e02", "e03"] },
  {
    photo: "meters.jpg",
    tag: TAG1,
    trail: 0,
    lines: ["e04"],
    overlay: {
      kind: "big",
      at: "e04",
      text: "電気代",
      warm: true,
      delay: 24,
      top: 17,
    },
  },
  {
    photo: "windows.jpg",
    tag: TAG1,
    trail: 0,
    move: "out",
    lines: ["e05", "e06"],
    overlay: {
      kind: "big",
      at: "e05",
      delay: 100,
      text: "77",
      unit: "%",
      lead: "「AIで電気代が上がる」と心配",
      caption: "ロイター／イプソス世論調査（2026年6月、約4,500人）",
      size: 17,
      top: 9,
    },
  },
  {
    photo: "meters2.jpg",
    tag: TAG1,
    trail: 0,
    lines: ["e07"],
    overlay: {
      kind: "big",
      at: "e07",
      delay: 130,
      text: "1割以上",
      lead: "家庭の電気料金　2024年から",
      caption: "米エネルギー情報局の統計（ロイター報道）",
      size: 12,
      top: 12,
    },
  },
  { photo: "kitchen.jpg", tag: TAG1, trail: 0, move: "right", lines: ["e08"] },
  { photo: "living.jpg", tag: TAG1, trail: 0, lines: ["e09"] },
  { photo: "server_person.jpg", tag: TAG1, trail: 0, lines: ["e10"] },
  {
    photo: "living_night.jpg",
    tag: TAG1,
    trail: 0,
    move: "out",
    lines: ["e11"],
  },
  { photo: "mailboxes.jpg", tag: TAG1, trail: 1, move: "left", lines: ["e12"] },

  // 2つ目
  {
    photo: "votesign2.jpg",
    dim: 0.5,
    trail: 1,
    lines: ["f01"],
    overlay: {
      kind: "chapter",
      no: "2",
      title: "その怒りは\n選挙でどこに出たのか",
    },
  },
  { photo: "polling.jpg", tag: TAG2, trail: 1, lines: ["f02"] },
  {
    photo: "sticker_hand.jpg",
    focus: "30% 50%",
    tag: TAG2,
    trail: 1,
    lines: ["f03"],
    overlay: {
      kind: "big",
      at: "f03",
      delay: 70,
      text: "44",
      unit: " / 45件",
      lead: "建設を制限する側が勝った",
      caption: "開票が済んだ住民投票（AP通信が伝えた集計）",
      size: 17,
      top: 9,
    },
  },
  {
    photo: "capitol_dusk.jpg",
    tag: TAG2,
    trail: 1,
    move: "right",
    lines: ["f04"],
  },
  { photo: "booths.jpg", tag: TAG2, trail: 1, lines: ["f05"] },
  { photo: "newsprint.jpg", tag: TAG2, trail: 1, move: "left", lines: ["f06"] },
  {
    photo: "sticker.jpg",
    tag: TAG2,
    trail: 1,
    lines: ["f07"],
    overlay: {
      kind: "big",
      at: "f07",
      delay: 120,
      text: "僕の仮説",
      lead: "ここから先は",
      warm: true,
      size: 11,
      top: 15,
    },
  },
  {
    photo: "jpaper.jpg",
    focus: "50% 30%",
    tag: TAG2,
    trail: 1,
    lines: ["f08"],
  },
  { photo: "courthouse.jpg", tag: TAG2, trail: 1, move: "out", lines: ["f09"] },
  {
    photo: "tokyo_dawn.jpg",
    tag: TAG2,
    trail: 2,
    move: "left",
    lines: ["f10"],
  },

  // 3つ目
  {
    photo: "tse.jpg",
    dim: 0.5,
    trail: 2,
    lines: ["g01"],
    overlay: {
      kind: "chapter",
      no: "3",
      title: "それがなぜ\n日本の株に届いたのか",
    },
  },
  {
    photo: "wafer.jpg",
    tag: TAG3,
    trail: 2,
    lines: ["g02", "g03"],
    overlay: {
      kind: "big",
      at: "g02",
      delay: 110,
      text: "−12",
      unit: "%",
      lead: "アメリカの半導体株指数",
      caption: "11月5日、1日の下落率（外為どっとコム）",
      size: 17,
      top: 9,
    },
  },
  { photo: "servers.jpg", tag: TAG3, trail: 2, lines: ["g04"] },
  {
    photo: "floor.jpg",
    tag: TAG3,
    trail: 2,
    move: "out",
    lines: ["g05"],
    overlay: {
      kind: "big",
      at: "g05",
      delay: 30,
      text: "−3,643",
      unit: "円",
      lead: "11月6日　日経平均",
      caption: "下げ幅は歴代3位（日本経済新聞）",
      size: 14,
      top: 11,
    },
  },
  {
    photo: "station.jpg",
    focus: "50% 40%",
    tag: TAG3,
    trail: 2,
    lines: ["g06", "g07", "g08"],
    overlay: {
      kind: "big",
      at: "g07",
      delay: 50,
      text: "−3.5",
      unit: "%",
      lead: "日経平均　月曜〜木曜",
      size: 14,
      top: 11,
    },
  },
  {
    photo: "shotengai.jpg",
    tag: TAG3,
    trail: 2,
    lines: ["g09"],
    overlay: {
      kind: "big",
      at: "g09",
      delay: 26,
      text: "−0.6",
      unit: "%",
      lead: "TOPIX　同じ4日間",
      caption: "終値から計算",
      warm: true,
      size: 17,
      top: 9,
    },
  },
  { photo: "chip.jpg", tag: TAG3, trail: 2, lines: ["g10"] },
  { photo: "tse_wide.jpg", tag: TAG3, trail: 2, move: "right", lines: ["g11"] },
  { photo: "aisle.jpg", tag: TAG3, trail: 2, lines: ["g12"] },
  { photo: "fed.jpg", tag: TAG3, trail: 2, move: "out", lines: ["g13"] },
  {
    photo: "crossing.jpg",
    tag: TAG3,
    trail: 3,
    lines: ["g14"],
    overlay: {
      kind: "big",
      at: "g14",
      delay: 120,
      text: "約6",
      unit: "%",
      lead: "歴代3位の下げ幅も、率では",
      size: 14,
      top: 11,
    },
  },

  // 見立て
  {
    photo: "towers_orange.jpg",
    dim: 0.35,
    trail: 3,
    lines: ["h01"],
    overlay: { kind: "chapter", no: "", title: "ここからは、\n僕の見立てです" },
  },
  { photo: "chip2.jpg", tag: "僕の見立て", trail: 3, lines: ["h02"] },
  {
    photo: "suburb.jpg",
    tag: "僕の見立て",
    trail: 3,
    move: "out",
    lines: ["h03"],
  },
  {
    photo: "tokyo_dusk.jpg",
    tag: "僕の見立て",
    trail: 3,
    move: "right",
    lines: ["h04"],
    overlay: {
      kind: "big",
      at: "h04",
      delay: 50,
      text: "+3,800",
      unit: "円",
      lead: "今週の戻り（3日間）",
      caption: "11月9日〜11日、終値で約3,814円",
      size: 12,
      top: 11,
    },
  },
  { photo: "meters.jpg", tag: "僕の見立て", trail: 3, lines: ["h05"] },

  // 締め
  {
    photo: "towers_pink.jpg",
    dim: 0.34,
    tag: "今日の線",
    lines: ["i01", "i02", "i03"],
    overlay: { kind: "diagram" },
  },
  { photo: "alley.jpg", tag: "最後にひとつ", lines: ["i04", "i05", "i06"] },
  {
    photo: "city_night.jpg",
    dim: 0.45,
    lines: ["j01", "j02"],
    overlay: { kind: "end" },
  },
];
