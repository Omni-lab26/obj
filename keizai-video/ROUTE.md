# 線の回（第2版）「アメリカの電気代が、日本の株を動かした」

1枚の請求書がオハイオの食卓から東京の株式市場に届くまでの道のりを、地図と写真でたどる動画です（約7分半）。

- 動画: `release/denkidai-route.mp4`（1920×1080 / 30fps）
- 台本: `src/route/lines.json`（`text` が字幕、`|` が字幕の区切り、`say` が読み上げ）
- 場面の割り当て（写真・地図）: `src/route/shots.ts`
- 地図: `src/route/geo.ts` と `src/route/Maps.tsx`

```bash
npm run render:route   # 高画質の元動画を out/ に書き出す（1GBを超えます）
npm run encode:route   # 配布用に圧縮して release/ に置く
npm run voice:route    # ナレーションを作り直す
```

## 前の版から変えたところ

| 項目 | 変えた内容 |
| --- | --- |
| 声 | Style-Bert-VITS2 の JVNV 男性話者（M1）に変更。手元で動くので、台本が外部に送られません |
| 台本 | 参考動画の決まり文句を使わず、「道のりをたどる」という独自の枠組みに書き直しました |
| 口調 | 丁寧語のまま、「〜ですよね」「〜してみましょう」「よかったら」など、やわらかい言い方に |
| 画面 | 写真に加えて、自分で描いた地図（オハイオ → ワシントン → ニューヨーク → 東京）を入れました |

独自の言い回しとして決めたもの：

- 章の呼び方は「立ち寄るのは、3か所です」「1か所目、アメリカの食卓」
- 予想の間は「ここで、ひとつ当ててみてください」
- 仮説の旗は「ここは、点線で描かせてください」（地図でも点線で描きます）
- 私見の宣言は「ここからは、僕なりの読みです」
- まとめは「ひとことに畳むなら」

Halftick 自身の言葉である「バラバラのニュースを、1本の線に」「また次の線で」はそのまま使っています。

## 使った数字と出典

| 数字 | 出典 |
| --- | --- |
| 日経平均 3,643円安（11月6日、過去3番目の下げ幅） | 日本経済新聞 |
| 「AIで電気代が上がる」と心配 77%（台本では「8割近く」） | ロイター／イプソス世論調査（2026年6月、4,531人） |
| 家庭の電気料金、2024年から1割以上の上昇 | 米エネルギー情報局の統計（ロイター報道） |
| データセンターによる卸電力価格の押し上げ 2〜6% | ダラス連銀の試算 |
| 住民投票 47件・12州、うち21件がオハイオ州。開票済み45件中44件で制限側が勝利 | AP通信が伝えた Redbud Consulting の集計 |
| データセンターを投票の決め手に挙げた人は約4人に1人 | AP通信の有権者調査 |
| 米半導体株指数、11月5日に約12%安（2020年3月以来） | 外為どっとコム |
| 月〜木の日経平均 −3.5%、TOPIX −0.6% | 各日の終値から計算 |
| その後4日間の取引で約3,400円の戻り（57,434円 → 60,819円） | 日本経済新聞、株探（11月12日終値） |

## 要確認リスト

- **書き手名と立場が未設定です。** 挨拶は「こんにちは、Halftickです」とし、立場からの一言は入れていません。
- **冒頭の「オハイオ州のとある家に請求書が届く」は、説明のための場面です。** 特定の家庭を取材したものではありません。「この2年ほどで上がってきた」は、オハイオ州の家庭向け電気料金が2年で2割超上がったという報道（EIA統計）に基づきますが、元の統計は直接確認できていません。
- **77%、電気料金の1割、ダラス連銀の2〜6%は、記事の要約や転載で確認したものです。** 元資料での照合が必要です。
- **住民投票の件数は集計によって違います。** 別の集計（The Conversation）は10州・41件中40件です。
- **TOPIXの−0.6%は、個人の相場まとめ記事に載っていた終値から計算しました。**
- **「日本でも住民との摩擦が報じられている」は検索結果の要約で確認しただけです。**
- **写真は資料写真です。** ニュースの現場を写したものではありません（エンドカードに明記）。
- **ナレーションは合成音声です。** 音声認識で読みを確認し、不明瞭な行は言い換えて作り直しました。「オハイオ」は「オハイヨ」に近い発音になり、「中間選挙」が1か所「中華選挙」に聞こえる箇所が残っています。抑揚の自然さは耳で確認していません。

## 概要欄

```
アメリカの電気代が、日本の株を動かした。1枚の請求書の道のりを、地図でたどります。

■ この話の続き（数字と詳しい解説）と、みんなの議論はHalftickで
《深掘り記事へのリンク》

■ 今日つないだ点
・データセンターをめぐる住民投票 《リンク》
・アメリカ中間選挙 《リンク》
・日経平均 3,643円安 《リンク》

■ チャプター
00:00 1枚の請求書
00:37 今日の道のり
01:07 1か所目、アメリカの食卓
02:59 2か所目、投票所
04:18 3か所目、株式市場
05:54 僕なりの読み
06:35 道のりを振り返る

■ 出典
日本経済新聞／AP通信／ロイター・イプソス世論調査（2026年6月）／外為どっとコム／株探

■ クレジット
音声：Style-Bert-VITS2（JVNVコーパス）　地図：Natural Earth　写真：動画の最後に記載

※この動画は特定の金融商品の売買を勧めるものではありません。
※台本の下書きにAIを使っています。写真は資料写真です。
```

## 台本

| 行 | 字幕 |
| --- | --- |
| a01 | アメリカ、オハイオ州。とある家のポストに、電気代の請求書が届きます。 |
| a02 | その金額は、この2年ほどで、じわじわと上がってきました。 |
| a03 | そしてこの1枚の紙が、めぐりめぐって、東京の株式市場を動かすことになります。 |
| a04 | 11月6日、日経平均は1日で3,643円の下落。過去3番目に大きい値下がりでした。 |
| a05 | 請求書と、株式市場。かなり離れた2つですよね。 |
| b01 | こんにちは、Halftickです。 |
| b02 | バラバラに見えるニュースを、1本の線でつないでみる番組です。 |
| b03 | 今日は、オハイオの食卓から、東京の兜町まで。その道のりを、地図の上で一緒にたどっていきましょう。 |
| b04 | 立ち寄るのは、3か所です。アメリカの食卓、投票所、そして株式市場。 |
| b05 | 最後に、僕なりの読みもお話ししますね。 |
| c01 | まずは1か所目、アメリカの食卓です。 |
| c02 | いま、アメリカの各地で、データセンターの建設に反対する声が広がっています。 |
| c03 | ここで、ひとつ当ててみてください。反対している人たちが、いちばん気にしているのは何でしょうか。 |
| c04 | AIに仕事を取られること。そう思った方も、多いかもしれません。 |
| c05 | 実は、電気代なんです。 |
| c06 | ロイターとイプソスが6月に行った調査では、「AIのせいで電気代が上がる」と心配する人が、8割近くにのぼりました。 |
| c07 | しかも、支持する政党による差は、ほとんどありませんでした。 |
| c08 | 実際の料金も上がっています。ロイターが伝えた政府の統計では、家庭向けの電気料金は、2024年から1割以上の上昇です。 |
| c09 | なぜデータセンターが、家庭の料金に関係するのか。町内会にたとえると、わかりやすいと思います。 |
| c10 | 同じ町内に、とても大きなお屋敷が引っ越してきたとします。そのために道路を広げ、街灯も増やすことになりました。 |
| c11 | お屋敷は、自分の家の電気代はきちんと払います。でも、道路や街灯の費用は、町内会費に上乗せされて、みんなで負担することになる。 |
| c12 | 送電線や発電所も、これとよく似た仕組みなんですね。 |
| c13 | 公平のために付け加えると、値上がりのすべてが、データセンターのせいではありません。 |
| c14 | ダラス連銀の試算では、卸の電気の値段を押し上げた分は、2%から6%ほどです。 |
| c15 | それでも、請求書を手にした人の目は、すぐそばに建つ大きな建物に向かいました。 |
| d01 | 2か所目は、投票所です。 |
| d02 | 11月3日、アメリカでは、中間選挙の投票が行われました。 |
| d03 | この日、全米12の州で、データセンターの建設をめぐる住民投票も行われています。 |
| d04 | AP通信が伝えた集計では、開票が済んだ45件のうち44件で、建設を制限する側が勝ちました。 |
| d05 | 全部で47件あった住民投票のうち、21件は、オハイオ州に集中していました。 |
| d06 | 同じ日、議会の選挙では、民主党が上院と下院の両方で多数を取っています。 |
| d07 | ここは、点線で描かせてください。 |
| d08 | 毎月の電気代への不満が民主党を勝たせた、とは言い切れないんです。 |
| d09 | AP通信の調査で、データセンターを投票の決め手に挙げた人は、4人に1人ほどでした。 |
| d10 | 同じ日に起きた。確かなのは、そこまでです。 |
| d11 | それと、「AI規制」という見出しをよく見かけましたが、国の法律が変わったわけではありません。決まったのは、地元の自治体のルールです。 |
| d12 | それでも市場は、この結果に強く反応しました。 |
| e01 | 3か所目は、株式市場です。 |
| e02 | 選挙から2日たった、ニューヨーク。半導体メーカーの株価をまとめた指数が、1日でおよそ12%下がりました。 |
| e03 | 外為どっとコムによると、2020年3月以来の下げ幅です。 |
| e04 | データセンターが建たなければ、中に入れる半導体も売れなくなる。投資家は、そう考えたわけですね。 |
| e05 | そして翌日、波は太平洋を渡ります。東京で、日経平均が3,643円下がりました。 |
| e06 | ここで、もうひとつ当ててみてください。 |
| e07 | その週の月曜から木曜まで、日経平均は3.5%下がっています。 |
| e08 | では、東京証券取引所全体の値動きを表すTOPIXは、どのくらいのマイナスだったでしょうか。 |
| e09 | 0.6%です。同じ東京の株なのに、6倍近い差がありました。 |
| e10 | この日経平均という指数は、1株の値段が高い会社ほど影響が大きくなる仕組みで、AIや半導体の会社の比重が、とても大きいんです。 |
| e11 | つまり、アメリカのAIの話に、いちばん敏感に反応する物差しだった、ということになります。 |
| e12 | 念のため付け加えると、金曜日は銀行や食品の会社まで売られましたし、アメリカの金利が上がる、という見方も重なっていました。 |
| e13 | 電気代だけで、説明できるわけではありません。 |
| f01 | ここからは、僕なりの読みです。 |
| f02 | 今回揺らいだのは、AIの性能への期待ではない、と僕は見ています。 |
| f03 | 揺らいだのは、AIというものを「どこに置くのか」。そして、その電気代を「誰が払うのか」という、とても身近な問題のほうです。 |
| f04 | 日経平均は、その後の4日間の取引で、3,400円ほど戻しました。売られすぎだった、という見方もあります。 |
| f05 | ただ、毎月の請求書は、選挙が終わっても届き続けます。 |
| f06 | この道は、これからも何度か通ることになりそうです。 |
| g01 | 今日の道のりを、振り返ってみます。 |
| g02a | オハイオ州の食卓に届いた請求書。投票所での「待った」。 |
| g02b | ニューヨークの半導体株。そして、東京の日経平均。 |
| g03 | ひとことに畳むなら、「アメリカの電気代が、日本の株を動かした」。 |
| g04 | 最後に、ひとつだけ。日本でも、データセンターの建設をめぐって、住民との摩擦が報じられています。 |
| g05 | もし、あなたの家の近くに建つことになったら。賛成しますか。それとも、反対しますか。 |
| g06 | よかったら、Halftickのコメント欄で聞かせてください。この話の続きは、概要欄のリンクからどうぞ。 |
| g07 | それでは、また次の線で。 |

## 写真

すべて再利用が認められた写真（CC BY、CC BY-SA、CC0、パブリックドメイン）です。

- [United States Capitol Building, Washington, D.C.](https://www.flickr.com/photos/75683070@N00/2743651364) / Ken Lund（CC BY-SA 2.0）
- [Concert Gathering, United States Capitol Building, Washingto](https://www.flickr.com/photos/75683070@N00/2742813439) / Ken Lund（CC BY-SA 2.0）
- [Newspaper Stacks](https://www.flickr.com/photos/73993978@N00/9559519298) / shauser（CC BY 2.0）
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
- [Sustainable Kitchen](https://www.flickr.com/photos/25186605@N04/3240119298) / Jeremy Levine Design（CC BY 2.0）
- [living room at night](https://www.flickr.com/photos/16167252@N00/239000610) / andrechinn（CC BY 2.0）
- [Rosie stretches in the golden living room on the wood floor,](https://www.flickr.com/photos/71401718@N00/6724691473) / Wonderlane（CC BY 2.0）
- [Server room at CERN](https://www.flickr.com/photos/8718930@N07/3462606643) / torkildr（CC BY-SA 2.0）
- [Vertical retirement home](https://www.flickr.com/photos/26809429@N02/3221575849) / rutlo（CC BY 2.0）
- [Got Mail????](https://www.flickr.com/photos/8489692@N03/7372776674) / katerha（CC BY 2.0）
- [booths](https://www.flickr.com/photos/52473526@N00/3002212217) / hlkljgk（CC BY-SA 2.0）
- [A person sits at a voting booth at polling place Zion Evange](https://www.flickr.com/photos/11020019@N04/54122849656) / Lorie Shaull（CC BY 2.0）
- [New York City 'I voted' sticker](https://www.flickr.com/photos/7527891@N04/36417938313) / allisonmeier（CC BY 2.0）
- [Ovid - New York - Seneca County Courthouse Complex - 'Three ](https://www.flickr.com/photos/7156765@N05/51513431053) / Onasill - Bill Badzo（Public Domain）
- [Silicon Wafer](https://www.flickr.com/photos/36338618@N02/32126624767) / Quics（CC BY-SA 2.0）
- [CCD Chip](https://www.flickr.com/photos/7493873@N02/1234526868) / fox-orian（CC BY-SA 2.0）
- [EPROM Chip](https://www.flickr.com/photos/96712513@N07/16504280273) / BlueShift 12（CC BY 2.0）
- [Commuter Clocks. JR Rail SEIKO セイコー Clocks 時計 in the Ueno St](https://www.flickr.com/photos/42102924@N02/5349215289) / Arjan Richter（CC BY 2.0）
- [Japanese supermarket](https://www.flickr.com/photos/7710312@N02/24853515426) / Cecile Diener（CC0）
- [Federal Reserve Building in Washington D.C. - Illustration](https://www.flickr.com/photos/47422005@N04/6273179400) / DonkeyHotey（CC BY 2.0）
- [谷中銀座](https://www.flickr.com/photos/82127222@N00/14887989340) / sabamiso（CC BY 2.0）
- [Tokyo - 東京](https://www.flickr.com/photos/16782093@N03/5305789475) / Metro Centric（CC BY 2.0）
- [Construction site cranes](https://wordpress.org/photos/photo/2796228e39/) / Michael Burridge（CC0）
- [Leichhardt Town Hall CSG forum crowd](https://www.flickr.com/photos/62459458@N08/6000183323) / Jeremy Buckingham MLC（CC BY 2.0）
- [All Lit Up](https://www.flickr.com/photos/48627921@N05/11783462103) / Jocey K（CC BY-SA 2.0）
- [United States of America](https://www.flickr.com/photos/24662369@N07/14214064049) / NASA Goddard Space Flight Center（CC BY 2.0）
