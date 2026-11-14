# 線の回（第3版）ずんだもん担当「アメリカの電気代が、日本の株を動かした」

担当キャラクターが語る版です（約8分）。配色を目を引くものに変え、図とグラフを入れました。

- 動画: `release/denkidai-talk.mp4`（1920×1080 / 30fps）
- 台本: `src/talk/lines.json`
  - `host` が今回の担当（`zundamon` か `tsumugi`）
  - `text` が字幕。`|` は字幕の区切り、`*…*` で囲んだ語は担当の色で強調
  - `say` は読み上げ用の言い換え（読み間違い対策）
- 場面の割り当て（写真・地図・図）: `src/talk/shots.ts`
- 図とグラフ: `src/talk/Graphs.tsx`　配色: `src/talk/theme.ts`

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

「ここで、〇〇さんの声を聞いてみましょう」と振って、実際の発言をカードで見せます。発言はもう一人の担当（今回は春日部つむぎ）が読み上げます。

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

## 配色

夜の紺色を地にして、色は3つだけ使っています。

| 色 | 使いどころ |
| --- | --- |
| 担当の色（今回は黄緑） | 答え、強調した語、地図の経路、章番号、図の主役 |
| ピンクがかった赤 | 下落と値上がり（−3,643円、−12%、電気料金の1割以上） |
| 水色 | 比べる相手と、不確かなもの（TOPIX、2〜6%、点線） |

## 図とグラフ

| 場面 | 図 |
| --- | --- |
| 掴み | 日経平均の折れ線（10/30〜11/6、最後の下げを赤で） |
| 1か所目 | 100個の点で「77%」／大きな数字「1割以上」「2〜6%」 |
| 2か所目 | 45個のマスで「45件中44件」／4人の人型で「4人に1人」／オハイオ州を塗った地図 |
| 3か所目 | 日経平均とTOPIXの棒グラフ（TOPIXは「？」から答えに変わる） |
| 読み | 日経平均の折れ線（11/12まで、戻りを担当の色で） |
| 全体 | アメリカ地図と太平洋の地図に、道のりを線で（仮説は点線） |

地図は、周りの国（カナダ・メキシコ）、五大湖、経緯線、海岸線の光、街の明かり（都市の人口に応じた点）を描いています。
写真は41場面すべて別のものです。

## 使った数字と出典

原稿の事実を1か所ずつ採点した表は [`ACCURACY.md`](./ACCURACY.md) にあります（総合79点）。要確認リストは第2版（[`ROUTE.md`](./ROUTE.md)）のものがそのまま当てはまります。
日経平均の終値は 10/30〜11/12 の9営業日分を折れ線に使っています（日本経済新聞、マネックス証券、株探）。

## 概要欄

```
アメリカの電気代が、日本の株を動かした。1枚の請求書の道のりを、ずんだもんが地図でたどります。

■ この話の続き（数字と詳しい解説）と、みんなの議論はHalftickで
《深掘り記事へのリンク》

■ チャプター
00:00 1枚の請求書
00:33 今日の担当と道のり
01:08 1か所目、アメリカの食卓
03:00 2か所目、投票所
04:49 3か所目、株式市場
06:18 ボクなりの読み
07:12 1本の線につなげる

■ 出典
日本経済新聞／AP通信／ロイター・イプソス世論調査（2026年6月）／外為どっとコム／株探

■ クレジット
音声：VOICEVOX:ずんだもん、VOICEVOX:春日部つむぎ　地図：Natural Earth　写真：動画の最後に記載

※この動画は特定の金融商品の売買を勧めるものではありません。
※台本の下書きにAIを使っています。写真は資料写真です。
```

## 英語版

同じ動画の英語版です（約6分45秒）。`REMOTION_LANG=en` を付けて書き出すと、台本・字幕・画面の文字・音声がすべて英語に切り替わります。

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
00:30 Today's route
00:58 Stop 1: The American kitchen table
02:32 Stop 2: The polling place
04:06 Stop 3: The stock market
05:19 My own read
06:03 Connecting the dots

Sources
Nikkei / Associated Press / Reuters-Ipsos poll (June 2026) / Dallas Fed working paper (March 2026) / CNBC / Gaitame.com / Kabutan

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
| b01 | Hi, this is Halftick. |
| b02 | We take the news that's scattered around in your head and connect it into one line. |
| b03 | Today we go from a kitchen table in Ohio to Kabutocho, Tokyo's financial district. We'll connect the bill and the stock price on a map. |
| b04 | We'll make three stops. First, the American kitchen table. Second, the polling place. Third, the stock market. |
| b05 | At the end, I'll connect all three into one line and give you my own read. |
| c01 | First stop: the American kitchen table. |
| c02 | Right now, across the United States, people are pushing back against new data centers. |
| c03 | Here's a quick guess for you. What's a worry that keeps coming up among the people who object? |
| c04 | That AI will take their jobs. That's what most of us would say, right? |
| c05 | One that keeps coming up is the power bill. |
| c06 | In a Reuters/Ipsos poll taken in June, nearly eight in ten people said they worry that AI will make electricity more expensive. |
| c07 | And that held true no matter which party they support. |
| c08 | Prices really are going up. According to government data reported by Reuters, home electricity prices have risen more than 10 percent since 2024. |
| c09 | So why would a data center affect what a household pays? Think of it like a neighborhood association. |
| c10 | Say a huge mansion moves into the neighborhood. To serve it, the road gets widened and more streetlights go up. |
| c11 | The mansion pays its own electricity bill, of course. But the cost of the road and the streetlights gets added to the neighborhood dues. In other words, everyone pays. |
| c12 | Power lines and power plants work in roughly the same way. |
| c13 | To be fair, though: electricity isn't the only reason people object, and data centers aren't behind the whole price increase either. |
| c14 | A Dallas Fed working paper estimates that data centers have pushed up wholesale power prices by about 2 to 6 percent. |
| c15 | Even so, when people look at their bill, their eyes go to the big building going up nearby. |
| c16 | That's stop one. The bill and the data center are now connected by a line. |
| d01 | Second stop: the polling place. |
| d02 | November 3 was the U.S. midterm election. |
| d03 | On that same day, in 12 states, people also voted on local measures about data center construction. |
| d04 | According to a tally reported by the AP, in 44 of the 45 measures that had been counted, the side restricting construction won. |
| d05 | That's almost all of them. And of the 47 measures in total, 21 were in Ohio. |
| d05b | Let's hear from someone in the opposition movement. This is Stephen Sanders, from Texas. Here's what he told the AP. |
| q1 | (quotation, second voice) I would say data centers were on the ballot. |
| d05c | By the way, he's a Republican. So you can see this isn't really a party-line issue. |
| d06 | In the congressional elections that same day, Democrats won both the House and the Senate. |
| d07 | But let me connect these two with a dotted line. |
| d08 | We can't honestly say that anger over power bills is what won it for the Democrats. |
| d09 | In the AP's voter survey, only about one in four voters called data centers crucial to their vote. |
| d10 | They happened on the same day. That's as far as the facts go. |
| d11 | Also, a lot of headlines said "AI regulation," but not a single federal law has changed. What got decided were local rules. |
| d11b | Let's hear from the other side, too. This is Dan Diorio of the Data Center Coalition, an industry group. |
| q2 | (quotation, second voice) We should expect them to want to deliver on those promises, but there are going to be real-world consequences of that. |
| d12 | Even so, the market connected these two with a line and reacted hard. |
| e01 | Third stop: the stock market. |
| e02 | In New York, two days after the election, an index of semiconductor stocks fell about 12 percent in a single day. |
| e03 | According to Gaitame.com, that was its biggest drop since March 2020. |
| e04 | The logic: if data centers don't get built, the chips that go inside them don't get sold. That's how investors read it. |
| e05 | The next day, the line crosses the Pacific and reaches Tokyo. The Nikkei average fell 3,643 yen. |
| e06 | Here's one more guess for you. |
| e07 | From Monday through Thursday of that week, the Nikkei average fell 3.5 percent. |
| e08 | So how much do you think the TOPIX fell, the index that tracks the whole Tokyo market? |
| e09 | 0.6 percent. Same Tokyo stocks, and yet the gap is nearly sixfold. |
| e10 | Here's why. In the Nikkei average, companies with a higher share price carry more weight, and AI and chip companies make up a very large part of it. |
| e11 | So it was the yardstick most sensitive to AI news from America. |
| e12 | To be clear, on Friday even banks and food companies were sold, and there was also talk that U.S. interest rates were about to rise. |
| e13 | So power bills alone don't explain everything. |
| f01 | From here, this is my own read. |
| f02 | What got shaken this time, I think, wasn't faith in how capable AI is. |
| f03 | What got shaken was where AI gets put, and who pays its power bill. A much more down-to-earth problem. |
| f03b | Let's look at one professional view as well. This is from a note that Dominique Toublan of Barclays put out the day after the election. |
| q3 | (quotation, second voice) AI pushback is bipartisan but local, making the buildout pricier rather than stalling it. |
| f04 | Over the next four trading days, the Nikkei average recovered about 3,400 yen. Some say the selling was overdone. |
| f05 | But the bill comes every month, doesn't it? That doesn't stop when the election is over. |
| f06 | So I think this line will keep connecting to other news from here on. |
| g01 | Finally, let's connect today's dots into one line. |
| g02a | The bill that arrived at a kitchen table in Ohio. The "not so fast" at the polling place. |
| g02b | Chip stocks in New York. And the Nikkei average in Tokyo. |
| g03 | Connect them all, and you get: "America's power bills moved Japan's stocks." |
| g04 | One last thing. In Japan, too, friction with residents over data center construction has been reported. |
| g05 | If one were going to be built near your home, would you be for it? Or against it? |
| g06 | If you like, tell us in the comments on Halftick. You'll find the rest of this story at the link in the description. |
| g07 | Next time, we'll connect more scattered news into one line. See you on the next line. |

## 台本

| 行 | 字幕 |
| --- | --- |
| a01 | アメリカのオハイオ州で、ある家に電気代の請求書が届くんですけど、これ、この2年ぐらいでじわじわ上がってるんですよ。 |
| a02 | で、この1枚の紙が、めぐりめぐって、東京の株価を動かすことになります。 |
| a03 | 11月6日、日経平均が1日で3,643円下がりました。下げ幅としては、過去3番目の大きさです。 |
| a04 | 請求書と株価。めちゃくちゃ遠い2つじゃないですか。 |
| a05 | でも実はこれ、1本の線でつながってるんです。 |
| b01 | こんにちは、Halftickです。今日は、ずんだもんがお送りします。 |
| b02 | 頭の中でバラバラになってるニュースを、1本の線につなげる番組です。 |
| b03 | 今日は、オハイオの食卓から東京の兜町まで。請求書と株価を、地図の上で1本の線につなげていきます。 |
| b04 | 立ち寄るのは3か所。1か所目がアメリカの食卓。2か所目が投票所。3か所目が株式市場です。 |
| b05 | 最後に、この3か所を1本の線につなげて、ボクなりの読みを話しますね。 |
| c01 | まず1か所目、アメリカの食卓の話です。 |
| c02 | 今アメリカでは、あちこちでデータセンターの建設に反対する動きが出てるんですよ。 |
| c03 | ここでちょっと当ててみてほしいんですけど、反対の声でよく出てくる心配ごとって、何だと思います？ |
| c04 | AIに仕事を取られるから。まあ、普通そう思いますよね。 |
| c05 | よく出てくるのは、電気代なんです。 |
| c06 | ロイターとイプソスが6月にやった世論調査だと、「AIのせいで電気代が上がる」と心配してる人が、8割近くいたんですよ。 |
| c07 | しかもこれ、支持してる政党に関係なく、なんです。 |
| c08 | 実際に料金も上がってます。ロイターが伝えた政府の統計だと、家庭の電気料金は2024年から1割以上、上がってるんですね。 |
| c09 | じゃあなんでデータセンターが、家の電気代に関係あるのか。これ、町内会で考えるとわかりやすいんですよ。 |
| c10 | 町内にめちゃくちゃ大きいお屋敷が引っ越してきたとします。そのために道路を広げて、街灯も増やすことになった。 |
| c11 | お屋敷は、自分の家の電気代はちゃんと払うんです。でも道路とか街灯のお金は、町内会費に乗っかってくる。つまり、みんなで払うことになるわけです。 |
| c12 | 送電線とか発電所も、ざっくり言うとこれと同じ仕組みなんですよね。 |
| c13 | ただ、ここは公平に言っておきます。反対の理由は電気代だけじゃないですし、値上がりが全部データセンターのせい、というわけでもないです。 |
| c14 | ダラス連銀の試算だと、データセンターが卸の電気の値段を押し上げた分は、2%から6%ぐらいなんですよ。 |
| c15 | それでも、請求書を見た人の目は、すぐそばに建ってる大きな建物に向かうわけです。 |
| c16 | これで1つ目。請求書とデータセンターが、線でつながりました。 |
| d01 | 2か所目は、投票所の話です。 |
| d02 | 11月3日、アメリカは中間選挙でした。 |
| d03 | 実はこの日、全米12の州で、データセンターの建設をめぐる住民投票もやってたんですよ。 |
| d04 | AP通信が伝えた集計だと、開票が終わった45件のうち44件で、建設を制限する側が勝ってます。 |
| d05 | ほぼ全部ですよね。しかも47件のうち21件は、オハイオ州なんです。 |
| d05b | ここで、反対運動をしてる人の声を聞いてみましょう。テキサス州の、スティーブン・サンダースさん。AP通信の取材に、こう答えています。 |
| q1 | （つむぎが読む引用）データセンターが、投票にかけられていたんだと思う。 |
| d05c | ちなみにこの人、共和党員なんですよ。党派の話じゃない、というのがよくわかりますよね。 |
| d06 | 同じ日の議会選挙では、民主党が上院も下院も、両方取りました。 |
| d07 | ただ、ここは点線でつなげさせてください。 |
| d08 | 電気代への不満が民主党を勝たせた、とまでは正直言えないんですよ。 |
| d09 | AP通信の調査だと、データセンターを投票の決め手にした人は、4人に1人ぐらいなんですね。 |
| d10 | 同じ日に起きた。確かなのは、そこまでです。 |
| d11 | あと、ニュースだと「AI規制」という見出しが並んだんですけど、国の法律は1本も変わってないんですよ。決まったのは、地元の自治体のルールなんです。 |
| d11b | 逆の立場の声も聞いてみましょう。業界団体、データセンター連合のダン・ディオリオさんです。 |
| q2 | （つむぎが読む引用）当選した人たちは、公約を果たそうとするでしょう。ただ、それには現実の代償がともないます。 |
| d12 | それでも市場は、この2つを線でつなげて、めちゃくちゃ反応しました。 |
| e01 | 3か所目は、株式市場の話です。 |
| e02 | 選挙の2日後のニューヨークで、半導体メーカーの株をまとめた指数が、1日でだいたい12%下がったんですよ。 |
| e03 | 外為どっとコムによると、これ、2020年3月以来の下げなんですね。 |
| e04 | 要は、データセンターが建たないなら、中に入れる半導体も売れないよね、と。投資家はそう読んだわけです。 |
| e05 | その翌日、この線が太平洋を渡って、東京までつながります。日経平均が3,643円下がりました。 |
| e06 | ここでもう1個、当ててみてください。 |
| e07 | その週の月曜から木曜で、日経平均は3.5%下がってます。 |
| e08 | じゃあ、東証全体の動きを見るTOPIXのほうは、どれぐらい下がったと思います？ |
| e09 | 0.6%なんですよ。同じ東京の株なのに、6倍近く違うんです。 |
| e10 | なんでかと言うと、日経平均は、1株の値段が高い会社ほど影響が大きくなる仕組みで、AIとか半導体の会社の比重がめちゃくちゃ大きいんですよ。 |
| e11 | つまり、アメリカのAIの話に一番敏感に反応しちゃう物差しだったんです。 |
| e12 | 念のため言っておくと、金曜は銀行とか食品の会社まで売られてますし、アメリカの金利が上がりそうだ、という話も重なってました。 |
| e13 | だから、電気代だけで全部説明できるわけじゃないです。 |
| f01 | ここからは、ボクなりの読みの話です。 |
| f02 | 今回揺らいだのは、AIの性能への期待じゃないと思うんですよ。 |
| f03 | 揺らいだのは、AIをどこに置くのか。その電気代を誰が払うのか、という、めちゃくちゃ身近な問題のほうなんです。 |
| f03b | プロの見方も1つ見てみましょう。バークレイズのドミニク・トゥブランさんが、選挙の翌日に出したレポートです。 |
| q3 | （つむぎが読む引用）AIへの反発は、党派を超えているが、地元の話だ。建設を止めるというより、高くつくものにしている。 |
| f04 | 日経平均はその後の4日間で、3,400円ぐらい戻してます。売られすぎだった、という見方もあります。 |
| f05 | ただ、請求書って毎月届くじゃないですか。選挙が終わっても、これは止まらないんですよね。 |
| f06 | だからこの線は、これからも別のニュースとつながっていくと思います。 |
| g01 | 最後に、今日の点を1本の線につなげます。 |
| g02a | オハイオの食卓に届いた請求書。投票所での「待った」。 |
| g02b | ニューヨークの半導体株。そして、東京の日経平均。 |
| g03 | 全部つなげると、「アメリカの電気代が、日本の株を動かした」です。 |
| g04 | 最後に1個だけ。日本でも、データセンターの建設をめぐって住民との摩擦が報じられてるんですよ。 |
| g05 | もし自分の家の近くに建つとなったら、賛成しますか。それとも反対しますか。 |
| g06 | よかったら、Halftickのコメント欄で聞かせてください。この話の続きは、概要欄のリンクからどうぞ。 |
| g07 | 次の回も、バラバラのニュースを1本の線につなげます。それでは、また次の線で。 |
