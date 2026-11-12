# 線の回「アメリカの電気代が、日本の株を動かした」

Halftick の「点を線にする」型で作った中尺動画（約6分50秒）の資料です。

- 動画: `release/denkidai-line.mp4`（1920×1080 / 30fps）
- サムネイル: `release/denkidai-line-thumbnail.png`
- 台本: `src/line/lines.json`（`text` が字幕、`|` が字幕の区切り、`say` が読み上げ）
- 場面と写真の割り当て: `src/line/shots.ts`

```bash
npm run render:line      # 高画質の元動画を out/ に書き出す（粒子が入るため約1.2GB）
npm run encode:line      # 配布用に圧縮して release/ に置く（約80MB）
npm run thumbnail:line   # サムネイルを書き出す
npm run voice:line       # ナレーションを作り直す（手順は README.md）
```

## 骨組み

| 項目 | 内容 |
| --- | --- |
| 今日つなぐ点 | 民主党の勝利／データセンターの住民投票／日経平均 3,643円安 |
| 問い | なぜアメリカの選挙で、日本の株がここまで下がったのか |
| 掴みの型 | 「最近こんなニュースを見かけませんでしたか」 |
| 1つ目 | アメリカの住民は何に怒っているのか → AIではなく電気代 |
| 2つ目 | その怒りは選挙でどこに出たのか → 住民投票45件中44件。選挙結果とのつながりは仮説 |
| 3つ目 | なぜ日本の株に届いたのか → 半導体株の急落と、日経平均の中身 |
| 予想の間 | ①何に怒っているか（答え：電気代）②TOPIXの下げ（答え：0.6%） |
| たとえ | 電気代を人数で均等に払うシェアハウス。ずれる点：データセンターも自分の電気代は払っている |
| 自分から出す留保 | 選挙結果との因果は言えない／金曜は銀行や食品も売られた／利上げ観測も重し／今週3日で約3,800円戻した |
| 僕の見立て | AIの技術ではなく、置き場所と電気代という地元の暮らしの問題が株価に届いた |
| 友達に一言で | アメリカの電気代が、日本の株を動かした |
| 自分で答える問い | 家の近くにデータセンターが建つことになったら、賛成しますか |

## つながり図

図のタイトル：アメリカの電気代が、日本の株を動かした

| 矢印 | ラベル | 確からしさ |
| --- | --- | --- |
| 電気代 → 住民投票 | 原因 | 状況証拠（世論調査で8割近くが電気代を心配） |
| 住民投票 ⋯ 中間選挙 | 同じ日（つながりは仮説） | 仮説。APは「上位の争点ではなかった」と報道 |
| 中間選挙 → AI・半導体株 | 市場の読み | 報道（各社が規制懸念による売りと説明） |
| AI・半導体株 → 日経平均 | 指数のしくみ | 一次情報で裏づけ可（日経平均は株価の高い銘柄の影響が大きい） |

動画では、章が終わるたびに右上の点が1つずつ埋まり、締めで全体の線を見せます。

## 使った数字と出典

| 数字 | 出典 |
| --- | --- |
| 日経平均 3,643円安（11月6日、歴代3位） | 日本経済新聞 |
| 「AIで電気代が上がる」と心配 77%（台本では「8割近い人」） | ロイター／イプソス世論調査（2026年6月、4,531人） |
| 家庭の電気料金、2024年から1割以上の上昇 | 米エネルギー情報局の統計（ロイター報道） |
| 住民投票、開票済み45件中44件で制限側が勝利・12州 | AP通信が伝えた Redbud Consulting の集計 |
| データセンターは多くの有権者にとって上位の争点ではなかった | AP通信 |
| 米半導体株指数、11月5日に約12%安（2020年3月以来） | 外為どっとコム |
| 月〜木の日経平均 −3.5%、TOPIX −0.6% | 各日の終値から計算 |
| 下落率 約6% | 日本経済新聞（−5.96%） |
| 3日で約3,800円の戻り（57,434円 → 61,248円） | 日本経済新聞、株探（11月11日終値） |

## 要確認リスト

配信前に、人の目で確かめてほしい点です。

- **書き手名と立場が未設定です。** 挨拶は「こんにちは、Halftickです」とし、「立場からの一言」は入れていません。
- **住民投票の件数は集計によって違います。** AP（Redbud Consulting）は12州・45件中44件、The Conversation は10州・41件中40件です。台本はAPの数字を使っています。
- **77%と電気料金の1割は、通信社記事の転載や要約で確認したものです。** ロイターの元記事とEIAの統計を直接は読めていません。
- **TOPIXの−0.6%は、個人の相場まとめ記事に載っていた終値から計算しました。** 取引所か日経のデータで照合してください。
- **「日本でも住民との摩擦が報じられている」は検索結果の要約で確認しただけです。** 時事通信（7月）、千葉日報（印西市）、しんぶん赤旗（日野市）の記事が該当します。
- **写真は資料写真です。** 今回のニュースの現場ではありません（エンドカードにも明記）。日経平均のボードは古い写真なので、数字が見えない位置で切り取っています。
- **ナレーションは合成音声です。** 音声認識で読みを確認し、誤読は直しましたが、抑揚は耳で確認していません。

## タイトル案

1. なぜアメリカの選挙で、日本の株が3,643円も下がったのか
2. 日経平均を動かしたのは、AIではなく「電気代」だった
3. アメリカの電気代と日本の株価の、意外な関係

サムネの文字案：「犯人は電気代」／「AIより電気代」／「電気代と日本株」

## 概要欄

```
アメリカの電気代が、日本の株を動かした。3つのニュースを1本の線でつなぎます。

■ この話の続き（数字と詳しい解説）と、みんなの議論はHalftickで
《深掘り記事へのリンク》

■ 今日つないだ点
・民主党が中間選挙で勝利 《リンク》
・データセンターの住民投票 《リンク》
・日経平均 3,643円安 《リンク》

■ チャプター
00:00 最近こんなニュースを見かけませんでしたか
00:48 今日の問い
01:15 1つ目、アメリカの住民は何に怒っているのか
02:33 2つ目、その怒りは選挙でどこに出たのか
03:48 3つ目、それがなぜ日本の株に届いたのか
05:26 僕の見立て
06:03 今日の線

■ 出典
日本経済新聞／AP通信／ロイター・イプソス世論調査（2026年6月）／外為どっとコム／株探

※この動画は特定の金融商品の売買を勧めるものではありません。
※台本の下書きにAIを使っています。写真は資料写真です。
```

## 写真

すべて再利用が認められた写真（CC BY、CC BY-SA、CC0、パブリックドメイン）です。
動画のエンドカードに撮影者名を載せています。

- [Morning News | KL Street | Apr 12](https://www.flickr.com/photos/40642065@N06/13883703873) / Johnragai-Moment Catcher（CC BY 2.0）
- [United States Capitol Building, Washington, D.C.](https://www.flickr.com/photos/75683070@N00/2743651364) / Ken Lund（CC BY-SA 2.0）
- [Concert Gathering, United States Capitol Building, Washingto](https://www.flickr.com/photos/75683070@N00/2742813439) / Ken Lund（CC BY-SA 2.0）
- [Newspaper Stacks](https://www.flickr.com/photos/73993978@N00/9559519298) / shauser（CC BY 2.0）
- [The White House (Washington DC)](https://www.flickr.com/photos/20119750@N00/2770838680) / ~MVI~ (warped)（CC BY 2.0）
- [Tokyo Sunrise](https://www.flickr.com/photos/52798669@N00/8190868406) / seanmcgrath（CC BY 2.0）
- [Tokyo Morning](https://www.flickr.com/photos/90454079@N00/10590195535) / Jun Seita（CC BY 2.0）
- [Vote Here sign in St Paul, Minnesota](https://www.flickr.com/photos/11020019@N04/44022362092) / Lorie Shaull（CC BY-SA 2.0）
- [Vote Here sign in Minneapolis, Minnesota.](https://www.flickr.com/photos/11020019@N04/50562445028) / Lorie Shaull（CC BY-SA 2.0）
- [Tokyo Stock Exchange](https://www.flickr.com/photos/31029865@N06/6640618773) / Dick Thomas Johnson（CC BY 2.0）
- [Tokyo Stock Exchange](https://www.flickr.com/photos/31029865@N06/6646816187) / Dick Thomas Johnson（CC BY 2.0）
- [Tokyo Stock Exchange](https://www.flickr.com/photos/31029865@N06/6646813363) / Dick Thomas Johnson（CC BY 2.0）
- [Diminishing Perspective](https://www.flickr.com/photos/34745138@N00/6352376941) / kaibara87（CC BY 2.0）
- [Free transmission tower sunset photo](https://www.rawpixel.com/image/5914494/image-public-domain-free-sunset) / rawpixel（CC0）
- [An American suburb](https://www.flickr.com/photos/87913776@N00/4006681320) / futureatlas.com（CC BY 2.0）
- [Electricity meters](https://www.flickr.com/photos/21829715@N08/5130475491) / Drew Stefani（CC BY-SA 2.0）
- [Electric meter](https://www.flickr.com/photos/61338164@N02/18488593585) / haru__q（CC BY-SA 2.0）
- [Sustainable Kitchen](https://www.flickr.com/photos/25186605@N04/3240119298) / Jeremy Levine Design（CC BY 2.0）
- [living room at night](https://www.flickr.com/photos/16167252@N00/239000610) / andrechinn（CC BY 2.0）
- [Rosie stretches in the golden living room on the wood floor,](https://www.flickr.com/photos/71401718@N00/6724691473) / Wonderlane（CC BY 2.0）
- [Datacenter Work](https://www.flickr.com/photos/29479498@N05/4381851322) / Leonardo Rizzi（CC BY-SA 2.0）
- [Server room at CERN](https://www.flickr.com/photos/8718930@N07/3462606643) / torkildr（CC BY-SA 2.0）
- [Vertical retirement home](https://www.flickr.com/photos/26809429@N02/3221575849) / rutlo（CC BY 2.0）
- [Got Mail????](https://www.flickr.com/photos/8489692@N03/7372776674) / katerha（CC BY 2.0）
- [booths](https://www.flickr.com/photos/52473526@N00/3002212217) / hlkljgk（CC BY-SA 2.0）
- [A person sits at a voting booth at polling place Zion Evange](https://www.flickr.com/photos/11020019@N04/54122849656) / Lorie Shaull（CC BY 2.0）
- [New York City 'I voted' sticker](https://www.flickr.com/photos/7527891@N04/36417938313) / allisonmeier（CC BY 2.0）
- [Requisite Photo of 'I Voted' Sticker](https://www.flickr.com/photos/44124483743@N01/8161025124) / brownpau（CC BY 2.0）
- [Magazines](https://www.flickr.com/photos/7912605@N08/472964990) / theseanster93（CC BY-SA 2.0）
- [Ovid - New York - Seneca County Courthouse Complex - 'Three ](https://www.flickr.com/photos/7156765@N05/51513431053) / Onasill - Bill Badzo（Public Domain）
- [Silicon Wafer](https://www.flickr.com/photos/36338618@N02/32126624767) / Quics（CC BY-SA 2.0）
- [CCD Chip](https://www.flickr.com/photos/7493873@N02/1234526868) / fox-orian（CC BY-SA 2.0）
- [EPROM Chip](https://www.flickr.com/photos/96712513@N07/16504280273) / BlueShift 12（CC BY 2.0）
- [Commuter Clocks. JR Rail SEIKO セイコー Clocks 時計 in the Ueno St](https://www.flickr.com/photos/42102924@N02/5349215289) / Arjan Richter（CC BY 2.0）
- [Japanese supermarket](https://www.flickr.com/photos/7710312@N02/24853515426) / Cecile Diener（CC0）
- [Federal Reserve Building in Washington D.C. - Illustration](https://www.flickr.com/photos/47422005@N04/6273179400) / DonkeyHotey（CC BY 2.0）
- [Regina city night lights](https://www.flickr.com/photos/10154402@N03/7572253262) / Bruce Guenter（CC BY 2.0）
- [Bolsa de Tokio](https://www.flickr.com/photos/78173803@N05/7011937319) / Héctor Romero（CC BY 2.0）
- [谷中銀座](https://www.flickr.com/photos/82127222@N00/14887989340) / sabamiso（CC BY 2.0）
- [Tokyo - 東京](https://www.flickr.com/photos/16782093@N03/5305789475) / Metro Centric（CC BY 2.0）
- [In front of Zebra](https://www.flickr.com/photos/93277085@N08/16389090453) / ai3310X（CC BY 2.0）
- [Japanese Newspaper](https://www.flickr.com/photos/8632423@N03/5305451962) / JermJus（CC BY 2.0）
- [Construction site cranes](https://wordpress.org/photos/photo/2796228e39/) / Michael Burridge（CC0）
- [Leichhardt Town Hall CSG forum crowd](https://www.flickr.com/photos/62459458@N08/6000183323) / Jeremy Buckingham MLC（CC BY 2.0）
- [All Lit Up](https://www.flickr.com/photos/48627921@N05/11783462103) / Jocey K（CC BY-SA 2.0）
