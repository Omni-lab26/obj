# 線の回（第4版）ずんだもん担当「アメリカの電気代が、日本の株を動かした」

担当キャラクターが語る版です（約11分20秒）。番組名は「Plotline」です。配色を目を引くものに変え、図とグラフを入れました。
声の抑揚を抑え、話の「間」を設計し、用語やほかの見方を補う「ちなみに」のコーナーを足しています。

- 動画: `release/denkidai-talk.mp4`（1920×1080 / 30fps）
- 台本: `src/talk/lines.json`
  - `host` が今回の担当（`zundamon` か `tsumugi`）
  - `text` が字幕。`|` は字幕の区切り、`*…*` で囲んだ語は担当の色で強調
  - `say` は読み上げ用の言い換え（読み間違い対策）
- 場面の割り当て（写真・地図・図）: `src/talk/shots.ts`
- 図とグラフ: `src/talk/Graphs.tsx`　配色: `src/talk/theme.ts`、`src/talk/palettes.json`
- 間の取り方: `src/talk/pacing.ts`

```bash
npm run voice:talk    # ナレーションを作り直す（VOICEVOX が必要。scripts/tts_voicevox.py の冒頭を参照）
npm run render:talk   # 高画質の元動画を out/ に書き出す（1GBを超えます）
npm run encode:talk   # 配布用に圧縮して release/ に置く
```

## 担当の決め方

担当は回ごとにランダムで決めます。今回は乱数で **ずんだもん** になりました。

| 担当 | 口調 | 色 | クレジット |
| --- | --- | --- | --- |
| ずんだもん | です・ます調の話し言葉（「〜なのだ」は使わない）、一人称は「ボク」 | 黄緑 | VOICEVOX:ずんだもん |
| 春日部つむぎ | です・ます調の話し言葉、一人称は「わたし」 | 黄色 | VOICEVOX:春日部つむぎ |

キャラクター特有の語尾は使わず、声だけを借りています。つむぎの回にするときは、`lines.json` の `"host"` を `"tsumugi"` にして、
名乗りを「今日は、つむぎがお送りします」に、「ボク」を「わたし」に変えます。
色（地図の線、強調、章番号、図）は `host` に合わせて自動で切り替わります。

## 決まった言い回し

番組の合言葉は「バラバラのニュースを、1本の線につなげる」です。「つなげる」「つながる」を台本の節目に入れています。

- 挨拶：「頭の中でバラバラになってるニュースを、1本の線につなげる番組です」
- 章の終わり：「これで1つ目。請求書とデータセンターが、線でつながりました」
- 仮説の断り：「ここは点線でつなげさせてください」
- まとめ：「最後に、今日の点を1本の線につなげます」「全部つなげると、…」
- 結び：「次の回も、バラバラのニュースを1本の線につなげます。それでは、また次の線で」

## 発言の紹介（インタビュー）コーナー

「ここで、〇〇さんの声を聞いてみましょう」と振って、実際の発言をカードで見せます。紹介では、その人がどこの誰で、いつ、何について話したのかまで言ってから発言に入ります（16〜18秒）。発言はもう一人の担当（今回は春日部つむぎ）が読み上げます。

| 場所 | 誰の発言か | 出どころ |
| --- | --- | --- |
| 2か所目 | スティーブン・サンダースさん（テキサス州ラボック、反対グループの共同設立者・共和党員） | AP通信の取材 |
| 2か所目 | ダン・ディオリオさん（業界団体「データセンター連合」） | AP通信のインタビュー |
| 読み | ドミニク・トゥブランさん（バークレイズ） | 11月4日付のレポート（CNBCが報道） |

守っていること：

- 報道に引用符つきで載っている発言だけを使い、カードに英語の原文と出どころを入れる
- 日本語は番組の訳だと明記する。読み上げが本人の声ではないことも「読み上げ：春日部つむぎ」で示す
- 本人の映像や写真は使わない（背景は人物の写っていない資料写真）
- 賛成側と反対側の両方の声を入れる

## 声の抑揚と、間の取り方

声は VOICEVOX の抑揚を標準の 0.93 倍に抑え、文の途中の読点の間を 1.15 倍に伸ばしています（`npm run voice:talk -- --intonation 0.93 --pause 1.15` で変えられます）。

セリフとセリフの間は `src/talk/pacing.ts` で1行ずつ決めています。人が目の前の相手に話すときに自然に空く場所で、少し待ちます。

| 間の種類 | 長さの目安 | 入れる場所 |
| --- | --- | --- |
| 息つぎ | 0.25秒 | 次の話に移る前 |
| 切り返し | 0.45秒 | 「ただ」「ちなみに」など、話の向きが変わる前 |
| 着地 | 0.6秒 | 数字や答えを言った直後。頭に入るのを待つ |
| 考える時間 | 1.1〜1.3秒 | 見ている人に質問した直後。質問の字幕は出したまま |
| 受け渡し | 0.7秒 | 発言を紹介する直前。この間に発言の文字が先に出る |
| 戻り | 0.9秒 | 発言を読み終えた直後。カードを見せたまま待つ |
| 区切り | 0.85秒 | 章の終わり |

どれも、行と行の間にもともとある約0.2秒に足す長さです。日本語版と英語版で同じ表を使います。

## 「ちなみに」のコーナー

知識があいまいな人が置いていかれないように、用語とほかの見方を短いカードで補います。白い帯のカードが目印です。

| 場所 | 補うこと | 出どころ |
| --- | --- | --- |
| 1か所目 | データセンターとは何か。大きいものは1か所で10万世帯分の電気 | 国際エネルギー機関（IEA）「Energy and AI」 |
| 1か所目 | 心配ごとは電気代だけではない。水への影響を強く心配する人が57% | AP通信・NORC／シカゴ大学の世論調査（2026年7月） |
| 1か所目 | 「卸値」は電力会社が電気を仕入れるときの値段 | 用語の説明 |
| 2か所目 | 中間選挙とは何か（年表つき） | 制度の説明 |
| 2か所目 | 45件のうち残りの1件はどこか（ノースダコタ州ハーウッド） | ブルームバーグ、ワシントン・ポストほか |
| 2か所目 | 業界側の言う「代償」とは、地元に入る税金などのこと | AP通信 |
| 3か所目 | SOX指数とは何か（半導体関連の約30社） | OANDA証券の解説ほか |
| 3か所目 | 株が下がったほかの理由（金利、半導体の会社の決算） | OANDA証券、外為どっとコム |

挨拶では「東京証券取引所のある兜町」と、地名にもひとこと添えています。

## 配色

夜の紺色を地にして、色は3つだけ使っています。

| 色 | 使いどころ |
| --- | --- |
| 担当の色（今回は黄緑） | 答え、強調した語、地図の経路、章番号、図の主役 |
| ピンクがかった赤 | 下落と値上がり（−3,643円、−12%、電気料金の1割以上） |
| 水色 | 比べる相手と、不確かなもの（TOPIX、2〜6%、点線） |

トピックごとに色を変えるための参考リストを `palettes/index.html` に作りました（10種類）。
台本ファイルに `"palette": "kawase"` のように書くと、主役色・注意色・比較色がその配色に切り替わります。
書かなければ、これまでどおり担当の色が主役になります。ページは `python scripts/build_palette_page.py` で `src/talk/palettes.json` から作り直せます。

## 図とグラフ

| 場面 | 図 |
| --- | --- |
| 掴み | 日経平均の折れ線（10/30〜11/6、最後の下げを赤で） |
| 1か所目 | 100個の点で「77%」／大きな数字「1割以上」「2〜6%」 |
| 2か所目 | 45個のマスで「45件中44件」（残りの1マスを水色で囲んで町の名前を出す）／中間選挙の年表／4人の人型で「4人に1人」／オハイオ州を塗った地図 |
| 3か所目 | 日経平均とTOPIXの棒グラフ（TOPIXは「？」から答えに変わる） |
| 読み | 日経平均の折れ線（11/12まで、戻りを担当の色で） |
| 全体 | アメリカ地図と太平洋の地図に、道のりを線で（仮説は点線） |

地図は、周りの国（カナダ・メキシコ）、五大湖、経緯線、海岸線の光、街の明かり（都市の人口に応じた点）を描いています。
写真は50場面すべて別のものです。

## 使った数字と出典

原稿の事実を1か所ずつ採点した表は [`ACCURACY.md`](./ACCURACY.md) にあります（総合82点）。理解しやすさの採点は [`CLARITY.md`](./CLARITY.md)、制作の決まりごとは [`PLAYBOOK.md`](./PLAYBOOK.md)。要確認リストは第2版（[`ROUTE.md`](./ROUTE.md)）のものがそのまま当てはまります。
日経平均の終値は 10/30〜11/12 の9営業日分を折れ線に使っています（日本経済新聞、マネックス証券、株探）。

## 概要欄

```
アメリカの電気代が、日本の株を動かした。1枚の請求書の道のりを、ずんだもんが地図でたどります。

■ この話の続き（数字と詳しい解説）と、みんなの議論はPlotlineで
《深掘り記事へのリンク》

■ チャプター
00:00 1枚の請求書
00:36 今日の担当と道のり
01:15 1か所目、アメリカの食卓
03:56 2か所目、投票所
07:05 3か所目、株式市場
09:18 ボクなりの読み
10:26 1本の線につなげる

■ 出典
日本経済新聞／AP通信／ロイター・イプソス世論調査（2026年6月）／AP通信・NORC・シカゴ大学の世論調査（2026年7月）／国際エネルギー機関／ブルームバーグ／外為どっとコム／OANDA証券／株探

■ クレジット
音声：VOICEVOX:ずんだもん、VOICEVOX:春日部つむぎ　地図：Natural Earth　写真：動画の最後に記載

※この動画は特定の金融商品の売買を勧めるものではありません。
※台本の下書きにAIを使っています。写真は資料写真です。
```

## 英語版

同じ動画の英語版です（約8分40秒）。
**いま `release/` にある英語版の動画は1つ前の版です**（番組名が Halftick のまま、発言の紹介も短い版）。下の台本は新しい内容に直してありますが、音声と動画はまだ作り直していません。`REMOTION_LANG=en` を付けて書き出すと、台本・字幕・画面の文字・音声がすべて英語に切り替わります。

- 動画: `release/denkidai-talk-en.mp4`
- 台本: `src/talk/lines.en.json`
- 画面の文字の対訳: `src/talk/lang.ts`（日本語のまま残った文字があると、書き出しがエラーで止まります）
- 音声: Kokoro TTS（Apache-2.0）。VOICEVOX は日本語専用なので、英語は別の音声です。引用は別の声で読みます

```bash
npm run voice:talk:en    # 英語ナレーションを作り直す
npm run render:talk:en   # 高画質の元動画を out/ に書き出す
npm run encode:talk:en   # 配布用に圧縮して release/ に置く
```

日本語版と違うところ：

- 担当キャラクターの名乗りと「今日の担当」のカードはありません（声が別のため）
- 引用は英語の原文をそのまま見せます（訳文はなし）。読み上げは本人の声ではないとカードに明記
- 金額は「¥3,643」「3,643 yen」、指数名は画面では「Nikkei 225」

英語版の概要欄：

```
America's power bills moved Japan's stocks. We follow one electricity bill from a kitchen table in Ohio to the Tokyo stock market, on a map.

Chapters
00:00 One electricity bill
00:33 Today's route
01:03 Stop 1: The American kitchen table
03:14 Stop 2: The polling place
05:30 Stop 3: The stock market
07:06 My own read
07:55 Connecting the dots

Sources
Nikkei / Associated Press / Reuters-Ipsos poll (June 2026) / AP-NORC and University of Chicago poll (July 2026) / International Energy Agency / Dallas Fed working paper (March 2026) / Bloomberg / CNBC / Gaitame.com / OANDA Japan / Kabutan

Credits
Voice: Kokoro TTS. Map data: Natural Earth. Photos: credited at the end of the video.

This video is not a recommendation to buy or sell any financial product.
The script was drafted with AI assistance. Photos are stock images.
```

英語の台本：

| Line | Subtitle |
| --- | --- |
| a01 | In Ohio, an electricity bill lands in someone's mailbox. And over the past two years or so, that bill has been creeping up. |
| a02 | This one piece of paper, by a long and winding route, ends up moving stock prices in Tokyo. |
| a03 | On November 6, the Nikkei average fell 3,643 yen in a single day. That's the third-largest point drop on record. |
| a04 | A power bill and a stock index. Those two feel miles apart, don't they? |
| a05 | But they're actually connected by a single line. |
| b01 | Hi, this is Plotline. |
| b02 | We take the news that's scattered around in your head and connect it into one line. |
| b03 | Today we go from a kitchen table in Ohio to Kabutocho, home of the Tokyo Stock Exchange. We'll connect the bill and the stock price on a map. |
| b04 | We'll make three stops. First, the American kitchen table. Second, the polling place. Third, the stock market. |
| b05 | At the end, I'll connect all three into one line and give you my own read. |
| c01 | First stop: the American kitchen table. |
| c02 | Right now, across the United States, people are pushing back against new data centers. |
| c02b | By the way, a data center is a building packed with row after row of the computers that run AI. |
| c02c | According to the International Energy Agency, a large AI-focused one can use as much electricity as 100,000 households. |
| c03 | Here's a quick guess for you. What's a worry that keeps coming up among the people who object? |
| c04 | That AI will take their jobs. That's what most of us would say, right? |
| c05 | One that keeps coming up is the power bill. |
| c06 | In a Reuters/Ipsos poll taken in June, nearly eight in ten people said they worry that AI will make electricity more expensive. |
| c07 | And that held true no matter which party they support. |
| c07b | By the way, the power bill isn't the only worry. In a poll by the AP and the University of Chicago, nearly six in ten were also very concerned about local water. |
| c07c | That's because data centers use a lot of water to keep their computers cool. |
| c08 | Prices really are going up. According to government data reported by Reuters, home electricity prices have risen more than 10 percent since 2024. |
| c09 | So why would a data center affect what a household pays? Think of it like a neighborhood association. |
| c10 | Say a huge mansion moves into the neighborhood. To serve it, the road gets widened and more streetlights go up. |
| c11 | The mansion pays its own electricity bill, of course. But the cost of the road and the streetlights gets added to the neighborhood dues. In other words, everyone pays. |
| c12 | Power lines and power plants work in roughly the same way. |
| c13 | To be fair, though: data centers aren't behind the whole price increase. |
| c14 | The Dallas Fed, one branch of America's central bank, has put out an estimate. |
| c14b | It says data centers have pushed up wholesale prices, what utilities pay to buy power, by about 2 to 6 percent. |
| c15 | Even so, when people look at their bill, their eyes go to the big building going up nearby. |
| c16 | That's stop one. The bill and the data center are now connected by a line. |
| d01 | Second stop: the polling place. |
| d02 | November 3 was the U.S. midterm election. |
| d02b | By the way, the midterms are the congressional elections held halfway through a president's four-year term. People often call them a report card on the administration. |
| d03 | On that same day, in 12 states, people also voted on local measures about data center construction. |
| d03b | These are votes where residents decide yes or no directly. There were 47 of them in all. |
| d04 | According to a tally reported by the AP, 45 of them had been counted. In 44 of those 45, the side restricting construction won. |
| d04b | That's almost all of them. So where was the one exception? |
| d04c | Harwood, North Dakota, a town of a little over 800 people. A big data center was already under construction there, and the measure to tighten reviews was voted down. |
| d05 | By the way, 21 of the 47 measures, nearly half, were in Ohio. |
| d05b | Let's hear from someone who is actually part of the opposition. This is Stephen Sanders, who co-founded a data center protest group in Lubbock, Texas. After the election, here's what Sanders told the AP. |
| q1 | I would say data centers were on the ballot. |
| d05c | By the way, Sanders is a Republican. So you can see this isn't really a party-line issue. |
| d06 | In the congressional elections that same day, Democrats won a majority in both chambers of Congress, the House and the Senate. |
| d07 | But let me connect these two with a dotted line. |
| d08 | We can't honestly say that anger over power bills is what won it for the Democrats. |
| d09 | In the AP's voter survey, only about one in four voters called data centers crucial to their vote. |
| d10 | They happened on the same day. That's as far as the facts go. |
| d11 | Also, a lot of headlines said "AI regulation," but not a single federal law has changed. What got decided were local rules. |
| d11b | So how does the other side see it? Let's hear from them, too. This is Dan Diorio of the Data Center Coalition, the industry group for companies that run data centers, on the winners who promised to pause construction. |
| q2 | We should expect them to want to deliver on those promises, but there are going to be real-world consequences of that. |
| d11c | The consequences Diorio means are things like the taxes a data center pays to its host community. Block the project, and that money doesn't arrive either. |
| d12 | Even so, the market connected these two with a line and reacted hard. |
| e01 | Third stop: the stock market. |
| e02 | In New York, two days after the election, an index of companies that make semiconductors, the chips that act as AI's brain, fell about 12 percent in a single day. |
| e03 | According to Gaitame.com, that was its biggest drop since March 2020. |
| e03b | By the way, this index is known as the SOX. It tracks about 30 chip-related companies, Nvidia among them. |
| e04 | The logic: if data centers don't get built, the chips that go inside them don't get sold. That's how investors read it. |
| e05 | The next day, the line crosses the Pacific and reaches Tokyo. The Nikkei average fell 3,643 yen. |
| e06 | Here's one more guess for you. |
| e07 | From Monday through Thursday of that week, the Nikkei average fell 3.5 percent. |
| e08 | So how much do you think the TOPIX fell, the index that tracks the whole Tokyo market? |
| e09 | 0.6 percent. Same Tokyo stocks, and yet the gap is nearly sixfold. |
| e10 | The reason lies in how it's calculated. The Nikkei average is built from the share prices of 225 leading Japanese companies, and the higher a company's share price, the more weight it carries. |
| e10b | And right now, the companies with the highest share prices include a whole row of AI and chip names. |
| e11 | So it was the yardstick most sensitive to AI news from America. |
| e12 | To be clear, that wasn't the only reason. On Friday, even banks and food companies were sold. |
| e12a | There was also talk that U.S. interest rates were about to rise. |
| e12b | Another view is that chip-company earnings fell short. The outlooks from Qualcomm and Arm, out the day before, are the examples people cite. |
| e13 | So power bills alone don't explain everything. |
| f01 | From here, this is my own read. |
| f02 | What got shaken this time, I think, wasn't faith in how capable AI is. |
| f03 | What got shaken was where AI gets put, and who pays its power bill. A much more down-to-earth problem. |
| f03b | Let me also bring in how one market professional sees it. Dominique Toublan heads U.S. credit strategy, the analysis of corporate debt, at Barclays, the big British bank. This is from a note published the day after the election. |
| q3 | AI pushback is bipartisan but local, making the buildout pricier rather than stalling it. |
| f04 | Over the next four trading days, the Nikkei average recovered about 3,400 yen. Some say the selling was overdone. |
| f05 | But the bill comes every month, doesn't it? That doesn't stop when the election is over. |
| f06 | So I think this line will keep connecting to other news from here on. |
| g01 | Finally, let's connect today's dots into one line. |
| g02a | The bill that arrived at a kitchen table in Ohio. The "not so fast" at the polling place. |
| g02b | Chip stocks in New York. And the Nikkei average in Tokyo. |
| g03 | Connect them all, and you get: |
| g03b | "America's power bills moved Japan's stocks." |
| g04 | One last thing. In Japan, too, friction with residents over data center construction has been reported. |
| g05 | If one were going to be built near your home, would you be for it? Or against it? |
| g06 | If you like, tell us in the comments on Plotline. You'll find the rest of this story at the link in the description. |
| g07 | Next time, we'll connect more scattered news into one line. See you on the next line. |

## 台本

| 行 | 字幕 |
| --- | --- |
| a01 | アメリカのオハイオ州で、ある家に電気代の請求書が届くんですけど、これ、この2年ぐらいでじわじわ上がってるんですよ。 |
| a02 | で、この1枚の紙が、めぐりめぐって、東京の株価を動かすことになります。 |
| a03 | 11月6日、日経平均が1日で3,643円下がりました。下げ幅としては、過去3番目の大きさです。 |
| a04 | 請求書と株価。めちゃくちゃ遠い2つじゃないですか。 |
| a05 | でも実はこれ、1本の線でつながってるんです。 |
| b01 | こんにちは、Plotlineです。今日は、ずんだもんがお送りします。 |
| b02 | 頭の中でバラバラになってるニュースを、1本の線につなげる番組です。 |
| b03 | 今日は、オハイオの食卓から、東京証券取引所のある兜町まで。請求書と株価を、地図の上で1本の線につなげていきます。 |
| b04 | 立ち寄るのは3か所。1か所目がアメリカの食卓。2か所目が投票所。3か所目が株式市場です。 |
| b05 | 最後に、この3か所を1本の線につなげて、ボクなりの読みを話しますね。 |
| c01 | まず1か所目、アメリカの食卓の話です。 |
| c02 | 今アメリカでは、あちこちでデータセンターの建設に反対する動きが出てるんですよ。 |
| c02b | ちなみにデータセンターというのは、AIを動かすコンピューターを、ずらっと並べた建物のことです。 |
| c02c | 国際エネルギー機関によると、AI向けの大きいものは、1か所で10万世帯分ぐらいの電気を使うんですよ。 |
| c03 | ここでちょっと当ててみてほしいんですけど、反対の声でよく出てくる心配ごとって、何だと思います？ |
| c04 | AIに仕事を取られるから。まあ、普通そう思いますよね。 |
| c05 | よく出てくるのは、電気代なんです。 |
| c06 | ロイターとイプソスが6月にやった世論調査だと、「AIのせいで電気代が上がる」と心配してる人が、8割近くいたんですよ。 |
| c07 | しかもこれ、支持してる政党に関係なく、なんです。 |
| c07b | ちなみに、心配ごとは電気代だけじゃないんですよ。AP通信などの調査だと、地元の水への影響を強く心配する人も、6割近くいました。 |
| c07c | データセンターは、コンピューターを冷やすのに、水をたくさん使うからなんですね。 |
| c08 | 実際に料金も上がってます。ロイターが伝えた政府の統計だと、家庭の電気料金は2024年から1割以上、上がってるんですね。 |
| c09 | じゃあなんでデータセンターが、家の電気代に関係あるのか。これ、町内会で考えるとわかりやすいんですよ。 |
| c10 | 町内にめちゃくちゃ大きいお屋敷が引っ越してきたとします。そのために道路を広げて、街灯も増やすことになった。 |
| c11 | お屋敷は、自分の家の電気代はちゃんと払うんです。でも道路とか街灯のお金は、町内会費に乗っかってくる。つまり、みんなで払うことになるわけです。 |
| c12 | 送電線とか発電所も、ざっくり言うとこれと同じ仕組みなんですよね。 |
| c13 | ただ、ここは公平に言っておきます。値上がりが全部データセンターのせい、というわけではないんです。 |
| c14 | アメリカの中央銀行の一部である、ダラス連銀が試算を出してます。 |
| c14b | 電力会社が電気を仕入れるときの値段、つまり卸値を、データセンターが押し上げた分は、2%から6%ぐらいなんですよ。 |
| c15 | それでも、請求書を見た人の目は、すぐそばに建ってる大きな建物に向かうわけです。 |
| c16 | これで1つ目。請求書とデータセンターが、線でつながりました。 |
| d01 | 2か所目は、投票所の話です。 |
| d02 | 11月3日、アメリカは中間選挙でした。 |
| d02b | ちなみに中間選挙というのは、大統領の任期4年の、ちょうど真ん中にある議会の選挙です。政権の通信簿、なんて言われたりもします。 |
| d03 | 実はこの日、全米12の州で、データセンターの建設をめぐる住民投票もやってたんですよ。 |
| d03b | 住民が直接、賛成か反対かを決める投票です。全部で47件ありました。 |
| d04 | AP通信が伝えた集計だと、そのうち開票が終わったのが45件。その45件のうち44件で、建設を制限する側が勝ってます。 |
| d04b | ほぼ全部ですよね。じゃあ、残りの1件はどこなのか。 |
| d04c | ノースダコタ州の、ハーウッドという人口800人あまりの町です。ここはもうデータセンターの工事が始まっていて、審査を厳しくする案が否決されました。 |
| d05 | ちなみに、全部で47件のうち21件、半分近くがオハイオ州に集まってます。 |
| d05b | ここで、実際に反対運動をしている人の声を聞いてみましょう。テキサス州のラボックという町で、データセンターに反対するグループを立ち上げた一人、スティーブン・サンダースさんです。選挙のあと、AP通信の取材にこう答えています。 |
| q1 | データセンターが、投票にかけられていたんだと思う。 |
| d05c | ちなみにこの人、共和党員なんですよ。党派の話じゃない、というのがよくわかりますよね。 |
| d06 | 同じ日の議会選挙では、議会に2つある院、上院と下院の両方で、民主党が多数を取りました。 |
| d07 | ただ、ここは点線でつなげさせてください。 |
| d08 | 電気代への不満が民主党を勝たせた、とまでは正直言えないんですよ。 |
| d09 | AP通信の調査だと、データセンターを投票の決め手にした人は、4人に1人ぐらいなんですね。 |
| d10 | 同じ日に起きた。確かなのは、そこまでです。 |
| d11 | あと、ニュースだと「AI規制」という見出しが並んだんですけど、国の法律は1本も変わってないんですよ。決まったのは、地元の自治体のルールなんです。 |
| d11b | では、逆の立場の人はどう見ているのか。こちらの声も聞いてみましょう。データセンターを運営する会社でつくる業界団体、データセンター連合の、ダン・ディオリオさんです。建設の一時停止を公約して当選した人たちについて、こう話しています。 |
| q2 | 当選した人たちは、公約を果たそうとするでしょう。ただ、それには現実の代償がともないます。 |
| d11c | ディオリオさんの言う代償は、データセンターが地元に払う税金などのことです。建てなければ、それも入ってこない、という話ですね。 |
| d12 | それでも市場は、この2つを線でつなげて、めちゃくちゃ反応しました。 |
| e01 | 3か所目は、株式市場の話です。 |
| e02 | 選挙の2日後のニューヨークで、AIの頭脳にあたる部品、半導体。それに関わる会社の株価指数が、1日でだいたい12%下がったんですよ。 |
| e03 | 外為どっとコムによると、これ、2020年3月以来の下げなんですね。 |
| e03b | ちなみにこの指数、SOXと呼ばれていて、エヌビディアとか、半導体に関わる会社、約30社の株価を、まとめたものです。 |
| e04 | 要は、データセンターが建たないなら、中に入れる半導体も売れないよね、と。投資家はそう読んだわけです。 |
| e05 | その翌日、この線が太平洋を渡って、東京までつながります。日経平均が3,643円下がりました。 |
| e06 | ここでもう1個、当ててみてください。 |
| e07 | その週の月曜から木曜で、日経平均は3.5%下がってます。 |
| e08 | じゃあ、東証全体の動きを見るTOPIXのほうは、どれぐらい下がったと思います？ |
| e09 | 0.6%なんですよ。同じ東京の株なのに、6倍近く違うんです。 |
| e10 | なんでかと言うと、計算の仕方に理由があります。日経平均は、日本を代表する225社の株価から出すんですけど、1株の値段が高い会社ほど、影響が大きくなる仕組みなんです。 |
| e10b | で、今その値段が高い会社に、AIとか半導体の会社がずらっと並んでるんですよ。 |
| e11 | つまり、アメリカのAIの話に一番敏感に反応しちゃう物差しだったんです。 |
| e12 | 念のため言っておくと、理由はこれだけじゃないです。金曜は、銀行とか食品の会社まで売られてました。 |
| e12a | アメリカの金利が上がりそうだ、という話も重なってたんですよね。 |
| e12b | それと、半導体の会社の決算が物足りなかった、という見方もあるんですよ。前の日に出た、クアルコムとアームの見通しがそうです。 |
| e13 | だから、電気代だけで全部説明できるわけじゃないです。 |
| f01 | ここからは、ボクなりの読みの話です。 |
| f02 | 今回揺らいだのは、AIの性能への期待じゃないと思うんですよ。 |
| f03 | 揺らいだのは、AIをどこに置くのか。その電気代を誰が払うのか、という、めちゃくちゃ身近な問題のほうなんです。 |
| f03b | ここで、市場のプロはどう見ているのかも、1つ紹介させてください。イギリスの大手銀行バークレイズで、会社の借金にあたる「社債」の分析を率いている、ドミニク・トゥブランさん。選挙の翌日に出したレポートに、こう書いています。 |
| q3 | AIへの反発は、党派を超えているが、地元の話だ。建設を止めるというより、高くつくものにしている。 |
| f04 | 日経平均はその後の4日間で、3,400円ぐらい戻してます。売られすぎだった、という見方もあります。 |
| f05 | ただ、請求書って毎月届くじゃないですか。選挙が終わっても、これは止まらないんですよね。 |
| f06 | だからこの線は、これからも別のニュースとつながっていくと思います。 |
| g01 | 最後に、今日の点を1本の線につなげます。 |
| g02a | オハイオの食卓に届いた請求書。投票所での「待った」。 |
| g02b | ニューヨークの半導体株。そして、東京の日経平均。 |
| g03 | 全部つなげると、 |
| g03b | 「アメリカの電気代が、日本の株を動かした」です。 |
| g04 | 最後に1個だけ。日本でも、データセンターの建設をめぐって住民との摩擦が報じられてるんですよ。 |
| g05 | もし自分の家の近くに建つとなったら、賛成しますか。それとも反対しますか。 |
| g06 | よかったら、Plotlineのコメント欄で聞かせてください。この話の続きは、概要欄のリンクからどうぞ。 |
| g07 | 次の回も、バラバラのニュースを1本の線につなげます。それでは、また次の線で。 |
