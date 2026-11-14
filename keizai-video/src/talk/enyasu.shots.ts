import { PLACES } from "./geo";
import { Shot } from "./shots";

// Episode "enyasu": 1 dollar = 160 yen. From American prices to the Japanese table.
const { washington, tokyo } = PLACES;
const STOP1 = "1か所目　アメリカの物価";
const STOP2 = "2か所目　金利の差";
const STOP3 = "3か所目　160円の防衛線";
const READ = "わたしなりの読み";

export const ENYASU_SHOTS: Shot[] = [
  // 掴み
  { photo: "y_notes.jpg", move: "in", lines: ["a01"] },
  {
    photo: "y_tokyo_sunset.jpg",
    dim: 0.25,
    lines: ["a02"],
    overlay: {
      kind: "big",
      at: "a02",
      delay: 50,
      text: "160円台",
      lead: "11月13日　1ドル＝",
      caption: "9月上旬以来の円安水準（日本経済新聞、TBS NEWS DIG ほか）",
      size: 15,
      top: 11,
    },
  },
  { photo: "y_mof.jpg", move: "right", lines: ["a03"] },
  { photo: "y_usgrocery.jpg", dim: 0.25, move: "out", lines: ["a04"] },
  {
    map: {
      kind: "pacific",
      highlight: "usa-japan",
      marks: [
        { at: washington, label: "アメリカのレジ", side: "left" },
        { at: tokyo, label: "日本の食卓", side: "right", delay: 110 },
      ],
      links: [{ from: washington, to: tokyo, delay: 20, draw: 110, bow: -0.2 }],
    },
    lines: ["a05"],
  },

  // 挨拶と、今日の道のり
  {
    photo: "y_coin500.jpg",
    dim: 0.3,
    move: "right",
    lines: ["b01", "b02"],
    overlay: { kind: "host", at: "b01", delay: 60 },
  },
  {
    map: {
      kind: "pacific",
      highlight: "usa-japan",
      marks: [
        {
          at: washington,
          label: "物価と金利",
          note: "アメリカ",
          side: "left",
          cue: "b03",
          delay: 40,
        },
        {
          at: tokyo,
          label: "160円の防衛線",
          note: "市場が意識する水準",
          side: "right",
          cue: "b03",
          delay: 170,
        },
      ],
      links: [
        {
          from: washington,
          to: tokyo,
          cue: "b03",
          delay: 60,
          draw: 120,
          bow: -0.2,
          label: "金利の差",
        },
      ],
    },
    lines: ["b03"],
  },
  { photo: "y_daikon.jpg", move: "left", lines: ["b04"] },

  // 1か所目
  {
    photo: "y_cartblur.jpg",
    dim: 0.55,
    trail: 0,
    lines: ["c01"],
    overlay: {
      kind: "chapter",
      no: "1",
      kicker: "1か所目",
      title: "アメリカの物価",
    },
  },
  { photo: "y_dc_night.jpg", tag: STOP1, trail: 0, lines: ["c02"] },
  {
    photo: "y_aisle.jpg",
    tag: STOP1,
    trail: 0,
    move: "out",
    lines: ["c03"],
    overlay: {
      kind: "graph",
      graph: {
        kind: "note",
        at: "c03",
        delay: 20,
        title: "消費者物価指数（CPI）って？",
        body: [
          {
            text: "暮らしに必要なモノやサービスの値段を、まとめて追いかける数字",
          },
          { text: "アメリカでは労働省が毎月発表する" },
        ],
      },
    },
  },
  {
    photo: "y_receipt.jpg",
    // the image file is cut above the line with a store manager's name
    tag: STOP1,
    trail: 0,
    dim: 0.2,
    lines: ["c04", "c04b", "c05"],
    overlay: {
      kind: "graph",
      graph: {
        kind: "bars",
        title: "アメリカの10月の消費者物価（前の月と比べて）",
        max: 0.4,
        rows: [
          {
            label: "市場の予想",
            value: 0.3,
            text: "+0.3%",
            tone: "cool",
            at: "c04",
            delay: 20,
          },
          {
            label: "結果",
            value: 0.4,
            text: "+0.4%",
            tone: "accent",
            at: "c04",
            delay: 60,
          },
        ],
        source: "米労働省、11月10日発表（ロイター報道）。前年比は今回公表なし",
      },
    },
  },
  { photo: "y_fed.jpg", tag: STOP1, trail: 0, lines: ["c06", "c06b"] },
  {
    photo: "y_dollars.jpg",
    tag: STOP1,
    trail: 0,
    dim: 0.25,
    move: "left",
    lines: ["c07"],
    overlay: {
      kind: "graph",
      graph: {
        kind: "dots",
        at: "c07",
        delay: 60,
        title: "12月の利上げの幅、市場の見方（11月10日）",
        value: 89,
        label: "0.25ポイントの利上げ",
        rest: { label: "0.5ポイントの利上げ", at: "c07", delay: 200 },
        source:
          "CMEフェドウオッチ（ロイター、Cboe などの報道）。時点によって数字は動く",
      },
    },
  },
  { photo: "y_dc_houses.jpg", tag: STOP1, trail: 1, lines: ["c08"] },

  // 2か所目
  {
    photo: "y_vault.jpg",
    dim: 0.55,
    trail: 1,
    lines: ["d01"],
    overlay: {
      kind: "chapter",
      no: "2",
      kicker: "2か所目",
      title: "金利の差",
    },
  },
  { photo: "y_scale2.jpg", tag: STOP2, trail: 1, lines: ["d02"] },
  {
    photo: "y_counter.jpg",
    tag: STOP2,
    trail: 1,
    move: "out",
    lines: ["d03", "d04"],
  },
  { photo: "y_exchange.jpg", tag: STOP2, trail: 1, lines: ["d05"] },
  {
    photo: "y_fed2.jpg",
    tag: STOP2,
    trail: 1,
    dim: 0.2,
    lines: ["d06"],
    overlay: {
      kind: "graph",
      graph: {
        kind: "bars",
        title: "政策金利",
        max: 8,
        rows: [
          {
            label: "アメリカ",
            value: 4,
            text: "3.75〜4%",
            tone: "accent",
            at: "d06",
            delay: 20,
          },
          {
            label: "日本",
            value: 1.25,
            text: "1.25%",
            tone: "cool",
            at: "d06",
            delay: 100,
          },
        ],
        source: "FRB（10月28日）、日本銀行（10月30日）の決定",
      },
    },
  },
  {
    photo: "y_boj.jpg",
    tag: STOP2,
    trail: 1,
    move: "right",
    lines: ["d07"],
    overlay: {
      kind: "graph",
      graph: {
        kind: "note",
        at: "d07",
        delay: 14,
        title: "政策金利って？",
        body: [
          { text: "中央銀行が決める、世の中の金利のもとになる金利" },
          { text: "上げると、お金を借りにくくなり、物価が落ち着きやすい" },
        ],
      },
    },
  },
  { photo: "y_boj2.jpg", tag: STOP2, trail: 1, lines: ["d08", "d09"] },
  {
    photo: "y_kokkai.jpg",
    tag: STOP2,
    trail: 1,
    dim: 0.2,
    move: "out",
    lines: ["d10", "d11"],
    overlay: {
      kind: "graph",
      graph: {
        kind: "note",
        label: "ほかの見方",
        at: "d10",
        delay: 40,
        title: "円安の理由は、1つじゃない",
        body: [
          { text: "① 日本とアメリカの金利の差" },
          { text: "② 日本の財政が悪くなる心配", at: "d11", delay: 20 },
        ],
        source: "野村総合研究所 木内登英氏のコラム（2026年7月）",
      },
    },
  },
  { photo: "y_notes2.jpg", tag: STOP2, trail: 2, lines: ["d12"] },

  // 3か所目
  {
    photo: "y_kasumi_street.jpg",
    dim: 0.55,
    trail: 2,
    lines: ["e01"],
    overlay: {
      kind: "chapter",
      no: "3",
      kicker: "3か所目",
      title: "160円の防衛線",
    },
  },
  { photo: "y_trading.jpg", tag: STOP3, trail: 2, lines: ["e02"] },
  {
    photo: "y_currencies.jpg",
    tag: STOP3,
    trail: 2,
    dim: 0.2,
    lines: ["e03"],
    overlay: {
      kind: "graph",
      graph: {
        kind: "note",
        at: "e03",
        delay: 14,
        title: "為替介入って？",
        body: [
          { text: "通貨を売り買いして、相場を動かそうとすること" },
          { text: "円安を止めたいとき：ドルを売って円を買う" },
          { text: "決めるのは財務大臣、売り買いは日本銀行" },
        ],
      },
    },
  },
  {
    photo: "y_hand.jpg",
    tag: STOP3,
    trail: 2,
    dim: 0.25,
    lines: ["e04"],
    overlay: {
      kind: "big",
      at: "e04",
      delay: 70,
      text: "7兆9,756億円",
      lead: "7月30日の円買い介入",
      caption: "1日の円買い介入として、公表のある1991年以降で最大（財務省）",
      size: 10,
      top: 12,
    },
  },
  {
    photo: "y_treasury.jpg",
    tag: STOP3,
    trail: 2,
    lines: ["e05"],
    overlay: {
      kind: "big",
      at: "e05",
      delay: 110,
      text: "28年ぶり",
      lead: "日米がそろって円を買う介入（アメリカ東部時間 7月31日）",
      caption: "1998年以来（各社報道）",
      size: 13,
      top: 11,
    },
  },
  {
    photo: "y_calc.jpg",
    tag: STOP3,
    trail: 2,
    dim: 0.3,
    lines: ["e06", "e07", "e07b"],
    overlay: {
      kind: "graph",
      graph: {
        kind: "note",
        label: "夏の介入のあと",
        at: "e06",
        delay: 10,
        title: "日本の介入は合わせて15兆3,993億円。円相場は…",
        timeline: [
          { label: "163円台", note: "7月30日" },
          { label: "155円台", note: "8月3日", at: "e06", delay: 150 },
          { label: "160円台", note: "8月28日", at: "e07", delay: 110 },
          { label: "152円台", note: "9月8日", at: "e07b", delay: 10 },
          {
            label: "160円台",
            note: "11月13日",
            on: true,
            at: "e07b",
            delay: 110,
          },
        ],
        source: "介入額は財務省、相場はOANDA証券・共同通信",
      },
    },
  },
  {
    photo: "y_mic.jpg",
    dim: 0.6,
    tag: STOP3,
    trail: 2,
    lines: ["e08", "q1"],
    overlay: {
      kind: "quote",
      at: "q1",
      name: "片山さつきさん",
      role: "財務大臣",
      about: "円が1ドル160円台をつけた11月13日の午前に",
      source: "TBS NEWS DIG、ANN の報道（2026年11月13日）",
    },
  },
  { photo: "y_kasumi_night.jpg", tag: STOP3, trail: 2, lines: ["e09"] },
  {
    photo: "y_coin100.jpg",
    dim: 0.6,
    tag: STOP3,
    trail: 2,
    lines: ["e10", "q2"],
    overlay: {
      kind: "quote",
      at: "q2",
      name: "木内登英さん",
      role: "野村総合研究所　エグゼクティブ・エコノミスト",
      about: "為替介入について",
      source: "野村総合研究所のコラム（2026年7月6日）",
    },
  },
  { photo: "y_roll.jpg", tag: STOP3, trail: 2, lines: ["e11", "e12"] },
  {
    photo: "y_coins_moss.jpg",
    tag: STOP3,
    trail: 2,
    move: "left",
    lines: ["e12b"],
  },
  { photo: "y_kokkai_wide.jpg", tag: STOP3, trail: 3, lines: ["e13"] },

  // わたしなりの読み
  {
    photo: "y_wheat.jpg",
    dim: 0.45,
    trail: 3,
    lines: ["f01"],
    overlay: {
      kind: "chapter",
      no: "",
      title: "ここからは、\nわたしなりの読み",
    },
  },
  { photo: "y_atm2.jpg", tag: READ, trail: 3, lines: ["f02"] },
  { photo: "y_eagle.jpg", tag: READ, trail: 3, move: "out", lines: ["f03"] },
  { photo: "y_vault2.jpg", tag: READ, trail: 3, lines: ["f04", "f04b"] },
  { photo: "y_wheat2.jpg", tag: READ, trail: 3, move: "right", lines: ["f05"] },
  {
    photo: "y_fish.jpg",
    tag: READ,
    trail: 3,
    dim: 0.5,
    lines: ["f06", "f06b"],
    overlay: {
      kind: "big",
      at: "f06b",
      delay: 90,
      text: "約4万7千円",
      lead: "円安による家計の負担増（4人世帯・1年）",
      caption:
        "円安がなかった場合との比較。野村総合研究所 木内登英氏の試算（2026年7月）",
      tone: "down",
      size: 11,
      top: 11,
    },
  },
  { photo: "y_port.jpg", tag: READ, trail: 3, lines: ["f07", "f07b"] },
  {
    photo: "y_containers.jpg",
    tag: READ,
    trail: 3,
    lines: ["f08"],
  },
  { photo: "y_night_store.jpg", tag: READ, trail: 3, lines: ["f09"] },

  // 締め
  {
    map: {
      kind: "pacific",
      highlight: "usa-japan",
      marks: [
        {
          at: washington,
          label: "アメリカの物価",
          note: "金利が上がりそう",
          side: "left",
          cue: "g02",
        },
        {
          at: tokyo,
          label: "160円の防衛線",
          note: "日本の食卓へ",
          side: "right",
          cue: "g02",
          delay: 110,
        },
      ],
      links: [
        {
          from: washington,
          to: tokyo,
          cue: "g02",
          delay: 30,
          draw: 90,
          bow: -0.2,
          label: "金利の差",
        },
      ],
    },
    tag: "今日の道のり",
    lines: ["g01", "g02", "g03", "g03b"],
  },
  { photo: "y_bread.jpg", tag: "最後に1個だけ", lines: ["g04"] },
  {
    photo: "y_asakusa_night.jpg",
    dim: 0.5,
    move: "out",
    lines: ["g05", "g06"],
    overlay: { kind: "end" },
  },
];
