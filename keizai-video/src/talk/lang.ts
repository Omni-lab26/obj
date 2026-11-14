import en from "./lines.en.json";
import ja from "./lines.json";
import enVoice from "./voice-manifest.en.json";
import jaVoice from "./voice-manifest.json";

/**
 * Language of the video. Chosen when rendering:
 *   REMOTION_LANG=en npx remotion render DenkidaiTalk …
 */
export const EN = process.env.REMOTION_LANG === "en";

type Line = { id: string; text: string; say?: string; voice?: string };
export const script: { host: string; lines: Line[] } = EN ? en : ja;
export const voiceSeconds: Record<string, number> = EN ? enVoice : jaVoice;
export const voiceDir = EN ? "talk/voice-en" : "talk/voice";

// On-screen strings are written in Japanese in shots.ts; this maps them to English.
const DICT: Record<string, string> = {
  // tags and chapter cards
  "1か所目": "STOP 1",
  "2か所目": "STOP 2",
  "3か所目": "STOP 3",
  "1か所目　アメリカの食卓": "STOP 1 · THE KITCHEN TABLE",
  "2か所目　投票所": "STOP 2 · THE POLLING PLACE",
  "3か所目　株式市場": "STOP 3 · THE STOCK MARKET",
  アメリカの食卓: "The American\nkitchen table",
  投票所: "The polling place",
  株式市場: "The stock market",
  "ここからは、\nボクなりの読み": "From here,\nmy own read",
  ボクなりの読み: "MY READ",
  今日の道のり: "TODAY'S ROUTE",
  最後に1個だけ: "ONE LAST THING",
  // maps
  アメリカ: "USA",
  日本: "JAPAN",
  カナダ: "CANADA",
  メキシコ: "MEXICO",
  大西洋: "ATLANTIC",
  太平洋: "PACIFIC OCEAN",
  オハイオ: "Ohio",
  オハイオ州: "Ohio",
  オハイオ州ほか: "Ohio and elsewhere",
  ワシントン: "Washington",
  ニューヨーク: "New York",
  東京: "Tokyo",
  "東京・兜町": "Kabutocho, Tokyo",
  食卓: "Kitchen table",
  // short labels for the map, where the chapter titles would not fit
  "map:投票所": "Polls",
  "map:株式市場": "Stock market",
  住民投票: "Local votes",
  議会の選挙: "Congress election",
  請求書と住民投票: "Bills & local votes",
  半導体株: "Chip stocks",
  日経平均: "Nikkei 225",
  ここは点線: "a dotted line here",
  "47件のうち21件": "21 of the 47 measures",
  "11月5日": "Nov. 5",
  "11月6日": "Nov. 6",
  // big words and charts
  電気代: "Power bills",
  "1割以上": "+10%",
  "家庭の電気料金　2024年から": "Home electricity prices since 2024",
  "米エネルギー情報局の統計（ロイター報道）":
    "U.S. EIA data, as reported by Reuters",
  データセンターが押し上げた分: "Pushed up by data centers",
  "卸電力価格への影響（ダラス連銀の試算）":
    "Effect on wholesale power prices (Dallas Fed estimate)",
  アメリカの半導体株指数: "U.S. semiconductor index",
  "11月5日、1日の下落率（外為どっとコム）":
    "One-day fall on Nov. 5 (Gaitame.com)",
  "日経平均株価（終値）": "Nikkei 225 (closing price)",
  "−3,643円": "−¥3,643",
  "+3,385円": "+¥3,385",
  "11月6日は過去3番目の下げ幅（日本経済新聞）":
    "Nov. 6 was the third-largest point drop on record (Nikkei)",
  "11月12日の終値まで（日本経済新聞、株探）":
    "Through the close on Nov. 12 (Nikkei, Kabutan)",
  "「AIのせいで電気代が上がる」と心配している人":
    "People who worry AI will make electricity cost more",
  "ロイター／イプソス世論調査（2026年6月、約4,500人）":
    "Reuters/Ipsos poll (June 2026, about 4,500 people)",
  "住民投票で、建設を制限する側が勝った数":
    "Local votes won by the side restricting construction",
  件: "",
  "開票が済んだ45件（AP通信が伝えた集計）":
    "Of 45 measures counted (tally reported by the AP)",
  データセンターを投票の決め手にした人:
    "Voters who called data centers crucial to their vote",
  "4人に1人": "1 in 4",
  AP通信の有権者調査: "AP voter survey",
  "同じ週の月曜〜木曜、どれだけ下がった？":
    "Same week, Monday to Thursday: how far did each fall?",
  "6倍近い差": "Nearly a sixfold gap",
  "11月2日〜5日、終値から計算": "Nov. 2–5, calculated from closing prices",
  "6万円": "¥60,000",
  // quotations
  スティーブン・サンダースさん: "Stephen Sanders",
  "テキサス州ラボック　データセンター反対グループの共同設立者（共和党員）":
    "Co-founder of a data center protest group in Lubbock, Texas (Republican)",
  "AP通信の取材に（2026年11月）": "To the Associated Press, November 2026",
  ダン・ディオリオさん: "Dan Diorio",
  "業界団体「データセンター連合」":
    "Data Center Coalition, an industry association",
  建設の一時停止を公約して当選した人たちについて:
    "On election winners who pledged moratoriums",
  "AP通信のインタビューで（2026年11月）":
    "In an interview with the Associated Press, November 2026",
  ドミニク・トゥブランさん: "Dominique Toublan",
  "バークレイズ　米国クレジット戦略責任者":
    "Head of U.S. credit strategy, Barclays",
  "11月4日付のレポート（CNBCが報道）":
    "Research note dated Nov. 4, as reported by CNBC",
  // end card and credits
  "写真：": "Photo: ",
  "バラバラのニュースを、1本の線に。":
    "Scattered news, connected into one line.",
  "※この動画は特定の金融商品の売買を勧めるものではありません。　※写真は資料写真で、ニュースの現場を写したものではありません。":
    "This video is not a recommendation to buy or sell any financial product. Photos are stock images, not pictures of the events described.",
};

const JAPANESE = /[぀-ヿ一-鿿]/;

/** Translate an on-screen string. In English mode a missing entry is an error, so nothing slips through in Japanese. */
export const t = (s: string, where?: "map"): string => {
  if (!EN) return s;
  const hit = (where ? DICT[`${where}:${s}`] : undefined) ?? DICT[s];
  if (hit !== undefined) return hit;
  if (JAPANESE.test(s)) throw new Error(`No English text for: ${s}`);
  return s;
};
