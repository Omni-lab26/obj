# Piixpal（piixpal.dvkk.dev）のすべて

> 出典は次のとおりです。
> - トップページの `index.html`、`site/site.css`、`site/site.js`
> - ライブラリの `piixpal.js` v0.4.0
> - サブページ用の `site/docs.css`
> - スクリーンショット
> - 実測（1440 と 390 を中心に、320〜1440 の21幅）
>
> 数値は CSS からの引用です。「実測」とあるものは、画面から測った値です。

---

## 1. ひとことで言うと

- 答えは CSS の冒頭コメントにある。「warm paper, ink, and a little lime.」
  - 温かい紙と、インクと、少しのライム。
- 面はすべて平ら。グラデーションも、ぼかした影もない。
- 輪郭は 2px の、黒に近いインク色の線。影はぼかしゼロの「塊」。厚紙で作ったおもちゃの手ざわりがある。
- レトロ感は三つだけで出している。
  - ピクセル書体 Silkscreen（小さなラベルにだけ使う）
  - 角のない四角い点
  - canvas で描く、ピクセルの大ロゴ
- 大きな文字は、やわらかい可変グロテスク Bricolage Grotesque。重く、きつく詰めて組む。ピクセルと人の手の字が同じ画面にいる。
- いちばんの魅力は「サイトに小さな生き物が住んでいる」こと。
  - 見出しの字の輪郭を歩く。ボタンにとまる。ナビからぶら下がる。フッターで跳ねる。
  - 人が近づくと反応する。逃げる、のぞく、飛び立つ、そっぽを向く。
  - 手で決めた位置にはいない。ページの本当の形を読み取って、その上で暮らしている。
  - 生き物どうしも、着地の音で反応し合う。だからページ全体が一つの小さな世界になる。
- 文章は短く、少しとぼけている。製品を「住人」として語る。
- 構成は一つの型のくり返し。
  - ピクセルの小見出し → 2行の大見出し → 触れる大きな物 → 中央のボタン列。

---

## 2. 色

### 2.1 基本の色（paper テーマ ＝ `:root`）

`data-theme="paper"` には上書きがない。paper は `:root` そのもの。

- `--paper` `#f3eee3`
  - ページの地。入力欄と分段ボタンの地。
  - `.btn-ink` の文字色。
  - すべての混ぜ色の土台。
- `--paper-2` `#ebe4d4`
  - ホバーの塗り（ナビのリンク、ゴーストボタン、テーマボタン）。
  - 今いるページのナビ。
  - 手順カードの中のインラインコードの地。
- `--paper-3` `#e2d9c6`
  - カードの中の「にせUI」のバー（`.h-card i`）。
  - `.pterm` のバー。
- `--card` `#fbf8f1`
  - すべてのカードの面（`.pal` `.step` `.way` `.table-wrap` `.shelf` `.play-card` `.sandbox`）。
  - 既定のボタン、チップ、`kbd`、テーマ切り替えの地。
- `--ink` `#17121f`
  - 文字。すべての 2px の線。すべての塊の影。
  - 押された分段ボタンの塗り。
- `--ink-2` `#2b2436`
  - 二番手の文字（サブ文、見出しの横の文、カード本文）。
  - ナビのリンクと小見出しの文字。
- `--muted` `#6c6477`
  - 注釈。`No.01 · crawl`、ヒント行、表の見出し、表の既定値の列、棚の名前、`.pw-name`。
- `--line` `#d8cfbd`
  - 表の行の罫（1.5px）。棚の仕切り。インラインコードの枠（1px）。
- `--line-2` `#c9bfab`
  - `kbd` の枠。
- `--code` `#17121f`
  - コード面、帯、スニペット、大舞台、群衆の舞台、API パネル。
  - CSS のコメントどおり、どのテーマでも暗いまま。

### 2.2 アクセント（全テーマ共通）

- `--lime` `#c6f432`：主役の色。
  - 主ボタン `.btn-lime`、言葉の下のマーカー、`::selection`。
  - 大ロゴの影、コピーボタンのホバー、押された舞台ボタン、「NEW」バッジ。
  - 入力欄のフォーカスの輪（`0 0 0 3px var(--lime)`）。
- `--lime-2` `#a8d81c`：濃いライム。
  - コード窓のずれ影、`.btn-ink` の下影、ロゴの一つ目の点、きらめき。
- `--coral` `#ff6b4a`
  - 小見出しの四角の既定色、ロゴの二つ目の点、窓の一つ目のランプ、帯の区切りの2つ目、Boing のカード。
- `--violet` `#6b4cff`
  - フッターの地、フォーカスの輪（`:focus-visible{outline:3px solid var(--violet)}`）。
  - サンドボックスのずれ影、API パネルの下影、Moss のカード。
- `--sky` `#58c8ff`
  - 帯の区切りの3つ目、Lurk のカード、手順「02」の番号、Crowd と How の小見出し。
- `--sun` `#ffd23f`
  - 窓の二つ目のランプ、Thread のカード、手順「03」の番号、`.h-hive`。
- `--mint` `#25b89a`
  - Pip のカードだけに使う。

色の役目の分け方は次のとおり。
- ライムは「ここを押して」の合図と、ブランドの印。一画面に少しだけ置く。
- バイオレットは、フォーカスと、最後の締め（フッター）。
- ほかの色は、キャラの色分けと、小さな四角の飾りだけ。
- 広い面に色を塗るのはフッターの紫だけ。ほかは紙とインク。

### 2.3 黒いコード面の固定色（全テーマ共通）

- `#e8e3f3`：コードの文字と地の文
- `#2e2739`：窓バーの罫、パネル見出しの罫、コピーボタンの地
- `#3a3247`：消えているバーとランプ
- `#9b92ad`：ファイル名
- `#7d7490`：コメント（斜体）
- `#a79fb8`：パネルの説明文、選ばれていないタブ
- `#cfc8db`：大舞台のラベル
- `#f3eee3`：帯の文字
- 構文の色
  - タグ `#ff8fa3`（ピンク）
  - 属性 `#c6f432`（ライム）
  - 文字列 `#ffd23f`（サン）
  - コメント `#7d7490`（斜体）

### 2.4 White テーマ（既定）

```css
html[data-theme=white]{--paper:#ffffff;--paper-2:#f3f3f1;--paper-3:#e8e7e3;--card:#ffffff;--line:#e7e5e0;--line-2:#d3d0c9}
```

- インク、ink-2、muted、アクセントは paper と同じ。
- ページもカードも真っ白になる。カードを分けるのは 2px の線と 4px の影だけ。
- 線の力がいちばんよく見えるテーマ。
- 既定は white。ただし OS が暗い設定なら dark で始まる。

### 2.5 Paper テーマ

- `:root` のまま。上書きはない。
- 地は温かいベージュ `#f3eee3`。カード `#fbf8f1` は地より少し明るく浮く。
- 点と罫も温かい灰になる。
- JS が動かないときはこのテーマになる。
- `<meta name="theme-color" content="#f3eee3">` はこの色で固定。

### 2.6 Dark テーマ

```css
html[data-theme=dark]{
  --paper:#0e0c13;--paper-2:#1a1722;--paper-3:#2a2534;--card:#16131d;
  --ink:#f2eef8;--ink-2:#cdc6da;--muted:#8e869c;--line:#2b2635;--line-2:#3b3547;--lime-2:#a8d81c;
  color-scheme:dark}
html[data-theme=dark] [data-piixpal],html[data-theme=dark] piix-sprite{filter:drop-shadow(0 0 1px rgba(255,255,255,.55))}
html[data-theme=dark] .btn-ink{--sh:var(--lime)}
html[data-theme=dark] .foot{--ink:#17121f}
```

- インクが `#f2eef8`（薄いラベンダーがかった白）に反転する。
  - 線と影がすべて白っぽくなる。カードは「黒の上の白い線画」に見える。
  - コード窓の枠も白い線になる。
- 大ロゴのピクセルも白っぽくなる（`currentColor` で塗るため）。ライムの影は残る。
- 「Backed by」のリボンは白っぽくなり、文字は暗くなる。
- 「Star on GitHub」は白っぽいボタンになり、ライムの影がつく。
- 生き物とスプライトには、薄い白の縁がつく。暗い輪郭が黒に沈まないようにするため。
- フッターは `--ink:#17121f` で固定。紫の上の線とボタンは暗いまま。
- 混ぜ色の面（住みか、特徴タグ）は、くすんだ暗い色（オリーブ、えんじ、紺）になる。

### 2.7 テーマごとの値の比較

| トークン | paper（`:root`） | white | dark |
|---|---|---|---|
| `--paper`（ページ） | `#f3eee3` | `#ffffff` | `#0e0c13` |
| `--paper-2` | `#ebe4d4` | `#f3f3f1` | `#1a1722` |
| `--paper-3` | `#e2d9c6` | `#e8e7e3` | `#2a2534` |
| `--card` | `#fbf8f1` | `#ffffff` | `#16131d` |
| `--ink` | `#17121f` | 同じ | `#f2eef8` |
| `--ink-2` | `#2b2436` | 同じ | `#cdc6da` |
| `--muted` | `#6c6477` | 同じ | `#8e869c` |
| `--line` / `--line-2` | `#d8cfbd` / `#c9bfab` | `#e7e5e0` / `#d3d0c9` | `#2b2635` / `#3b3547` |
| `color-scheme` | light | light | dark |

どのテーマでも変わらないもの：
- アクセント7色
- `--code #17121f`（コード窓、スニペット、帯、大舞台、群衆の舞台、API パネル、インラインタグ）
- 紫のフッター
- 紫のフォーカスの輪

### 2.8 混ぜ色（`color-mix(in oklab, …)`）

- 住みか（`.habitat`）の地は、アクセント 22% ＋ paper。
- 特徴タグ（`.traits li`）は、アクセント 30% ＋ paper。
- API の属性名は、ライム 45% ＋ paper。
- 棚のホバーは、ライム 30% ＋ card。
- ナビの地は、paper 84%（つまり不透明度 84%）。

計算値（white 22% は実測と一致）：

| アクセント | white 22% | white 30% | paper 22% | paper 30% | dark 22% | dark 30% |
|---|---|---|---|---|---|---|
| lime | `#f2fedc` | `#edfdcf` | `#e9f0c6` | `#e5f1bb` | `#303723` | `#3d4828` |
| coral | `#ffe1d8` | `#ffd5ca` | `#fad3c2` | `#fccab6` | `#3b2021` | `#4d2826` |
| violet | `#d9dbff` | `#ccceff` | `#d0cfee` | `#c4c3f2` | `#1f1b3f` | `#262151` |
| sky | `#def4ff` | `#d2efff` | `#d5e7ea` | `#cae4ed` | `#202f3e` | `#263d50` |
| sun | `#fff6dc` | `#fff3cf` | `#f6e9c6` | `#f7e7bb` | `#3a3124` | `#4b4029` |
| mint | `#d7f0e8` | `#c9eae0` | `#cfe3d3` | `#c1decd` | `#1b2c2d` | `#1e3937` |

- ライム 45%（API の属性名）は、white で `#e5fcb5`、paper で `#def2a5`。
- white の上でインクを薄めた値は、22% `#c5c4c8`、14% `#dad9dc`、12% `#dfdfe1`、40% `#99969d`、55% `#75727b`。

### 2.9 選択とフォーカス

- 選択：`::selection{background:var(--lime);color:var(--ink)}`
- フォーカス：`:focus-visible{outline:3px solid var(--violet);outline-offset:3px;border-radius:6px}`
- 入力欄：`outline:none; box-shadow:0 0 0 3px var(--lime)`

---

## 3. 地（点の地）

### 3.1 ヒーローの点

```css
.hero-bg{position:absolute;inset:-72px 0 0;z-index:-1;pointer-events:none;
  background-image:radial-gradient(color-mix(in oklab,var(--ink) 22%,transparent) 1.1px,transparent 1.4px);
  background-size:22px 22px;background-position:-1px -1px;
  mask-image:radial-gradient(ellipse 75% 65% at 50% 30%,#000 30%,transparent 100%)}
```

- 間隔は 22px。
- 点は半径 1.1px まで濃く、1.4px で消える。等倍の画面では 2×2 の点に見える（実測）。
- 色はインクの 22%。
  - white の中央上で約 `#cecdcf`（実測）。
  - 端では約 `#e5e4e5`、さらに外は約 `#ececec` に薄れる。
- マスクは楕円（75% × 65%、中心は横 50%・縦 30%）。中央の上が濃く、端と下に向かって消える。
- `inset:-72px 0 0` で、半透明のナビの裏まで点が続く。ナビ越しに、ぼけて見える。
- 点の色はインクに従う。paper では温かい灰、dark では暗い `#38353d` 前後。

### 3.2 ほかの点の地

共通の作り方：`radial-gradient(<色> 1px, transparent 1.3〜1.4px) 0 0/<間隔>`

| 面 | 点の色 | 半径 | 間隔 | 下の色 |
|---|---|---|---|---|
| `.habitat`（キャラカードの住みか） | インク 14% | 1px / 1.3px | 16px | アクセント 22% |
| `.sb-stage`（サンドボックス） | インク 13% | 1px / 1.3px | 18px | `--paper` |
| `.pw-card`（Superpowers） | インク 12% | 1px / 1.3px | 16px | `--card` |
| `.pw-card.dark` | `rgba(255,255,255,.08)` | 1px / 1.3px | 16px | `#17121f` |
| `.bigstage` | `rgba(255,255,255,.14)` | 1px / 1.4px | 20px | `--code` |
| `piix-crowd` | `rgba(255,255,255,.12)` | 1px / 1.4px | 18px | `--code` |
| `.foot::before` | `rgba(255,255,255,.55)` | 1px / 1.4px | 22px | 紫 |

- フッターの点には、さらに `opacity:.35` と `mask-image:linear-gradient(#000,transparent 70%)` がかかる。下に向かって消える。
- サブページの点：`.scard .s-stage` は 14px 間隔でインク 12%。`.c-stage` は `currentColor` 18% を 18px 間隔。

### 3.3 きらめき（ヒーローの点の上）

- `.sparks` の中に、プラス形のピクセルが16個ある（`z-index:-1`、`aria-hidden`）。
- 位置はランダム。左右 2〜98%、上下 4〜94%。
- 大きさ `--s` は 4、5、6px の順にくり返す。中心の四角に、`::before` と `::after` の腕がつく。腕の長さは3単位。
- 色は `--ink`、`--lime-2`、`--coral`、`--violet`、`--sky` の順にくり返す。
- 動きは `twinkle var(--t) steps(1,end)`。`--t` は 2.6〜5.6s。遅れはマイナス（0〜−5s）。
  - 0%：透明度 0、大きさ .34
  - 12%：.9、.67
  - 24%：1、1
  - 36%：.6、.34
  - 48〜100%：0（消えたまま）
- 段で切り替わるので、なめらかではなく「チカッ」と光る。
- 動きを減らす設定では、まるごと消える。

### 3.4 点の考え方

- 点は「ピクセルの世界の方眼紙」。生き物が住む床。
- 明るい面にはインクの薄い点、暗い面には白の薄い点。
- 間隔は 14〜22px。大きな面ほど広くする。
- 点はいつも控えめに置く（12〜22%）。主役にはしない。

---

## 4. 文字

### 4.1 書体

```
https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=JetBrains+Mono:wght@400;600&family=Silkscreen&display=swap
```

```css
--f-sans:"Bricolage Grotesque",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
--f-mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
--f-pix:"Silkscreen",var(--f-mono);
body{font:400 17px/1.55 var(--f-sans);font-optical-sizing:auto;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
```

- **Bricolage Grotesque**
  - 可変フォント。光学サイズ（opsz）が 12〜96、太さ（wght）が 400〜800。
  - `font-optical-sizing:auto` を指定している。大きな見出しは、詰まってコントラストの強い字形になる。本文は読みやすい字形になる。
  - 使う太さは 400、500、550、600、650、720、740、760、780、800。半端な数はわざと選んでいる。
- **JetBrains Mono**
  - 400 と 600 だけ読み込む。500 の指定は近い太さで代用される。
  - リガチャが有効。`<!--` は `←!—`、`-->` は `⟶`、`=>` は `⇒` に見える。
- **Silkscreen**
  - 400 だけ。必ず大文字（`text-transform:uppercase`）。たいてい字間を少し開ける。
  - 補助クラス：`.pix{font-family:var(--f-pix);font-weight:400;letter-spacing:.02em;text-transform:uppercase}`
- 三つの書体の役割
  - Bricolage は人の声。見出し、本文、ボタンに使う。
  - Silkscreen はゲーム機の声。ラベル、番号、操作のヒント、帯に使う。
  - JetBrains Mono はコードの声。

### 4.2 見出しの文字（Bricolage）

| 役目 | CSS | 1440 / 390 |
|---|---|---|
| ヒーローの h1 | `font:760 clamp(34px,4.5vw,60px)/1; letter-spacing:-.04em; margin:0 0 20px; text-wrap:balance` | 60 / 34 |
| セクションの h2 | `font:760 clamp(36px,5vw,68px)/.98; letter-spacing:-.045em; margin:16px 0 0; text-wrap:balance` | 68 / 36 |
| フッターの h2 | `font:780 clamp(44px,7.5vw,110px)/.92; letter-spacing:-.05em` | 108 / 44 |
| サンドボックスの題 | `font:780 clamp(36px,5vw,64px)/1.05; letter-spacing:-.045em` | 64 / 36 |
| サブページの h1 | `font:780 clamp(40px,6vw,76px)/.95; letter-spacing:-.05em` | – |
| キャラカードの h3 | `760 30px/1; -.04em` | – |
| 住みかの見本文字 `.h-text` | `760 46px/1; -.04em` | – |
| Superpowers の見出し `.pw-h` | `780 36px/1; -.04em`（「Let it snow」だけ 44px） | – |
| 数字の箱 `.fact b` | `780 34px/1; -.04em; margin-bottom:8px` | – |
| Install カードの h3 | `740 24px/1.1; -.03em` | – |
| 手順の h3 | `720 21px/1.2; -.02em; margin:0 0 6px` | – |
| ロゴの文字 | `800 24px/1; letter-spacing:-.04em` | – |

決まりは三つ。
- 太さは 720〜800。
- 字間は −0.04〜−0.05em（小さい見出しは −0.02〜−0.03em）。
- 行送りは 1 以下。

### 4.3 本文の文字（Bricolage）

- 本文：`400 17px/1.55`
- ヒーローのサブ文：`clamp(17px,1.5vw,19.5px)`、行送り 1.5、`--ink-2`、`max-width:50ch`、下に 30px、`text-wrap:pretty`
- セクションのリード文：18px、行送り 1.55、`--ink-2`、`max-width:46ch`、`text-wrap:pretty`
- カードの本文：`15.5px/1.5`、`--ink-2`
- ナビのリンク：太さ 550、15.5px、余白 `8px 12px`、角 9px、`--ink-2`
- ボタン：`650 16px/1`、字間 −.01em（小さいボタンは 14.5px）
- チップ：`600 14px/1.2`
- 特徴タグ：`550 12.5px/1`
- ヒント行：13.5px、行送り 2、`--muted`
- 表：15px。見出しの `th` は `600 12.5px/1`、大文字、字間 .04em、muted
- 入力欄のラベル：`600 13.5px/1`、`--ink-2`
- コピーボタン：`600 12.5px/1`
- フッター下段：14.5px
- 数字の箱の続きの文：14.5px、`--ink-2`

### 4.4 ピクセルのラベル（Silkscreen、すべて大文字）

- 小見出し（eyebrow）：`400 13px/1`、字間 .06em、`--ink-2`
- 帯：`400 clamp(15px,1.6vw,19px)/1`、字間 .04em
- 手順の番号：`400 17px/1`
- キャラ番号「No.01 · crawl」：`400 12px/1`、muted
- 表の題とパネルの見出し：`400 12.5px/1`。表の題は muted、パネルの見出しはライム
- Install のタグ：`400 11.5px/1`
- 呼び出しボタン「+ bug」：`400 11.5px/1`
- 住みかのヒント：`400 11px/1`、色は `color-mix(in oklab,var(--ink) 55%,transparent)`
- `.pw-name`、`.play-card small`、棚の名前：`400 11px/1`、muted
- 大舞台のラベル：`400 12px/1`、`#cfc8db`
- フッターの小文字：`400 12px/1`、不透明度 .75
- ナビの「NEW」バッジ：`400 8px/1`、字間 .04em
- サブページ：パンくずは 12px、サイドバーの見出しは 11.5px（字間 .06em）、数は 10.5px

Silkscreen は、数、番号、指示、注釈だけに使う。文章の中身には使わない。

### 4.5 等幅の文字（JetBrains Mono）

- ヒーローのコード窓：`400 14px/1.75`、`tab-size:2`
- サンドボックスのコード：`400 13.5px/1.7`
- API パネル：`400 13px/1.7`
- スニペットのバー：13px。はみ出たら省略記号（…）
- 窓のファイル名：`500 12.5px/1`、`#9b92ad`
- `kbd`：`600 11px/1`
- 表の既定値の列：13px、muted、折り返さない
- 文中のインラインコード：.9em

---

## 5. 形（線・角・影・ハイライト）

### 5.1 線

- **2px solid `var(--ink)`** がすべての基本線。
  - ボタン、チップ、カード、コード窓、サンドボックス、表、棚、舞台、入力欄、分段ボタン、テーマ切り替え、Install のタグ、手順の番号、`.h-card`、`.h-btn`。
- **1.5px** は内側の罫に使う。
  - `--line`：表の行、棚の仕切り。
  - `#2e2739`：窓のバー、パネルの見出しの下。
  - `rgba(255,255,255,.14)`：舞台のバー。`rgba(255,255,255,.25)`：フッター下段の罫。
  - インク 18%：住みかの内側の枠。インク 14%：特徴タグの枠。
  - `kbd`：`1.5px solid var(--line-2)` で、下だけ `border-bottom-width:3px`。キーの形に見える。
- **1px solid `var(--line)`**：インラインコード。
- **破線**：`.fact{border:2px dashed color-mix(in oklab,var(--ink) 40%,transparent)}`。数字の箱だけ。
- **帯**：`border-block:2px solid var(--ink)`。明るいテーマでは帯と同じ色なので見えない。dark では白い線として見える。

### 5.2 角

- 999px：`.chip`、サブページの `.pill`
- 22px（`--r-lg`）：大きなカード全部（`.pal` `.way` `.table-wrap` `.panel` `.sandbox` `.shelf` `.bigstage` `.crowd-stage` `.play-card` `.pw-card` `.fact`）
- 18px：コード窓 `.window`、手順 `.step`、サブページの `.scard`
- 14px（`--r`）：住みか `.habitat`（カードの内側に 10px 入れて置く）
- 12px：`.btn`、`.h-card`、`.h-hive`
- 11px：スニペット `.snip`、テーマ切り替えの外枠
- 10px：`.btn-sm`、入力欄、手順の番号、`.h-btn`、`.h-floor`、`.inline-tag`
- 9px：ナビのリンク、分段ボタン
- 8px：コピーボタン、呼び出しボタン
- 7px：特徴タグ、Install のタグ、テーマボタン
- 6px：`kbd`、インラインコード、`:focus-visible`
- 4px：「NEW」バッジ
- 0（真四角）：ピクセルの飾り全部（小見出しの四角、窓のランプ、ロゴの点、帯の区切り、`.blip`、きらめき）

外側の箱ほど角が大きく、内側ほど小さい。ピクセルの飾りだけは角が 0。

### 5.3 影（どれもぼかしなし）

**ボタンの影：下に敷いた板が、ばねで動く。**
- 普通のボタンは `0 4px 0 0`、小さいボタンは `0 3px 0 0`。
- 詳しくは 6.4 と 8.3。

**カードの影：下に 4px の板。**
- `box-shadow:0 4px 0 0 var(--ink)`
- 対象：`.pal` `.step` `.way` `.table-wrap` `.shelf` `.bigstage` `.crowd-stage` `.play-card` `.pw-card` `.h-hive`、サブページの `.scard` と `.ov a`。
- キャラカードのホバー：`translateY(-4px)`、影 `0 8px 0 0`、`.35s var(--spring)`。
- サブページの `.scard` のホバー：−3px、影 7px。

**色つきのずれ影：右下に 8px。** 特別な一枚だけに使う。
- コード窓：`8px 8px 0 0 var(--lime-2)`
- サンドボックス：`8px 8px 0 var(--violet)`
- サブページ：`.custom` は `8px 8px 0 var(--lime-2)`、`.crowd-box` は `8px 8px 0 var(--sky)`

**色つきの下影**
- API パネル：`0 4px 0 var(--violet)`。暗いパネルの下に紫のふちが出る。

**輪**
- `0 0 0 2px var(--ink)`：8〜9px の四角（小見出しの四角、`.blip`）
- `0 0 0 1.5px var(--ink)`：ロゴの点
- `0 0 0 3px var(--lime)`：入力欄のフォーカス
- サブページで選ばれたカード：`0 4px 0 var(--ink),0 0 0 4px var(--lime)`

影の考え方：
- 普通の物は「下」に影を落とす（0 4px）。押せる板に見える。
- 特別な一枚だけ「右下」に色の影を落とす（8px 8px）。浮いた見本に見える。
- 破線の箱（数字の箱）には影がない。「仕様書」として読ませる。

### 5.4 チャンキーな影の芯

- 影の下端は、どの状態でも同じ位置（+4px）にある。
  - 通常：0 ＋ 4 ＝ 4
  - ホバー：−2 ＋ 6 ＝ 4
  - 押した時：+3 ＋ 1 ＝ 4
- つまり床の位置は変わらない。面だけが上下する。本物のキーのように感じる。

### 5.5 言葉の下のライムのマーカー

```css
.lede em{font-style:normal;background:linear-gradient(transparent 62%,var(--lime) 62% 92%,transparent 92%);padding:0 .06em}
```

- ヒーロー見出しの「live」だけに使う。斜体にはしない。
- 行の高さの 62%〜92% に、ふちのくっきりしたライムの帯を引く。
  - 60px/1 なら帯の高さは 18px。実測で y≈615〜634、純粋な `#c6f432`。
  - x ハイトの下半分から、ベースラインの少し下までを覆う。
- どのテーマでもライムのまま。
- サブページでも `.doc-head em` として同じものを使う。
- 強調する言葉は、ページ全体で一つだけ。

### 5.6 ピクセルの四角という飾り

- 飾りは全部「角 0 の四角」。丸い点の飾りはない。
  - 小見出しの前の 8×8 の四角（2px のインクの輪つき）
  - 窓の 10px のランプ（コーラル、サン、ライム。丸い信号ではない）
  - ロゴの i の点（0.2em の四角）
  - 帯の区切り（10px の四角が3つ）
  - `.blip`（9×9、2px のインクの輪、lime-2 とライムで点滅）
  - きらめき（プラス形）
- アイコンも小さな整数の格子で描く（`shape-rendering="crispEdges"`）。

---

## 6. 部品

### 6.1 ヘッダー

- 構造：`header.nav` > `.wrap.nav-in`。横並び、高さ 72px、`gap:28px`、上下中央そろえ。
- 上に貼りつく（sticky、`z-index:50`）。
- 地は `color-mix(in oklab,var(--paper) 84%,transparent)` に `backdrop-filter:saturate(1.4) blur(12px)`。すりガラスになる。
- 下の線は 2px。ページの一番上では透明。`scrollY > 8` で `.scrolled` がつき、インク色になる（`.3s`）。
- 線を含めた高さは 74px。
- 1440 での位置
  - ロゴ：x=130（112×30）
  - リンク：x=274〜981（高さ 40）
  - テーマ切り替え：x=1009（104×38）
  - GitHub ボタン：x=1145（165×40）。右端は 1310 で、コンテナの右端と一致する。
- リンクは8つ。Components · Superpowers · 3D · Pixel UI · Install · Maker · Builder · Stage
  - 15.5px、太さ 550、`--ink-2`、余白 8×12、角 9px。
  - ホバーと今いるページは `--paper-2` の地。
  - 「Stage」には **NEW** バッジがつく。`position:relative;top:-7px;margin-left:3px;padding:2px 4px;border-radius:4px;background:var(--lime);color:#17121f;font:400 8px/1 var(--f-pix);letter-spacing:.04em`
- GitHub ボタン：`btn btn-sm btn-ink`。「Star on GitHub」と GitHub のマーク。インクの塗り、紙色の文字、lime-2 の下影（0 3px 0）。
- 住人：クモの Thread が、ナビの下端の 70% の位置から 84px の糸でぶら下がる。
- `scroll-padding-top:96px` で、アンカーで飛んだ先がナビに隠れない。
- 生き物は `--piix-z:40` で、ナビ（z 50）の下にもぐる。

### 6.2 ロゴ

**アイコン**（30×30、16×16 の格子、`shape-rendering="crispEdges"`。ファビコンも同じ絵）

```svg
<rect width="16" height="16" rx="3" fill="#17121f"/>
<path fill="#c6f432" d="M4 4h8v1h1v6h-1v1H4v-1H3V5h1z"/>
<path fill="#17121f" d="M5 6h2v2H5zM9 6h2v2H9zM6 9h4v1H6z"/>
<path fill="#fff" d="M5 6h1v1H5zM9 6h1v1H9z"/>
```

- インクの角丸の四角の中に、角を段に欠いたライムの顔がある。
- 目は 2×2 で、左上に 1px の白い光。口は 4×1。
- ホバーで `rotate(-8deg) scale(1.08)` になる（`.35s var(--spring)`）。

**文字**
- `p<span class="i">ı</span><span class="i">ı</span>xpal`。点のない i（U+0131）を使う。
- `800 24px/1`、字間 −.04em、アイコンとの間は 10px。
- i の点は CSS で描いた四角いピクセル。

```css
.logo .i::after{content:"";position:absolute;left:50%;top:-.02em;width:.2em;height:.2em;margin-left:-.1em;background:var(--lime-2);box-shadow:0 0 0 1.5px var(--ink)}
.logo .i:nth-of-type(2)::after{background:var(--coral);animation:dot-hop 3.6s steps(2) infinite}
@keyframes dot-hop{0%,86%,100%{transform:translateY(0)}90%{transform:translateY(-.14em)}}
```

- 一つ目の点は lime-2、二つ目はコーラル。どちらも 1.5px のインクの輪がつく。
- コーラルの点は 3.6 秒ごとに、段で「ぴょこ」と跳ねる。
- フッターのロゴは文字だけで、白（`color:#fff`）。
- 読み上げ用の名前はヘッダーが「Piixpal home」、フッターが「Back to top」。

### 6.3 テーマ切り替え

```css
.theme{display:inline-flex;align-items:center;gap:2px;padding:3px;border:2px solid var(--ink);border-radius:11px;background:var(--card)}
.theme button{width:30px;height:28px;border:0;border-radius:7px;background:transparent}
.theme button[aria-pressed=true]{background:var(--ink);color:var(--paper)}
```

- 三つのアイコンボタン。どれも 8×8 のピクセル SVG を 14×14 で表示する。
  - 太陽（White）：`M3 0h2v1H3zM3 7h2v1H3zM0 3h1v2H0zM7 3h1v2H7zM2 2h4v4H2z`
  - 紙（Paper。折れた角と二本線）：`M1 0h4v1h1v1h1v6H1zM2 3h4v1H2zM2 5h4v1H2z`
  - 三日月（Dark）：`M3 0h3v1H4v1H3v4h1v1h3v1H2V7H1V6H0V2h1V1h2z`
- 押されたボタンはインクの地に紙色のアイコン。ホバーは `--paper-2`。
- 名前は `title` が「White」「Paper」「Dark」、`aria-label` が「White theme」など。外枠は `role="group"`、`aria-label="Theme"`。
- 選んだテーマは `localStorage['piix-theme']` に残る。
- 最初の表示でちらつかない仕組み
  - `<head>` の最初（`<meta charset>` より前）に小さなスクリプトを置く。

```js
(()=>{const d=document.documentElement;d.classList.add('js');let t;try{t=localStorage.getItem('piix-theme')}catch(e){}d.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'white')})()
```

  - 保存した値がなければ、OS の設定で dark か white を選ぶ。paper は自動では選ばれない。
  - OS の設定を読むのは一度だけ。あとから OS が変わっても追いかけない。

### 6.4 ボタン

```css
.btn{ --bg:var(--card); --fg:var(--ink); --sh:var(--ink);
  height:50px;padding:0 22px;border:2px solid var(--ink);border-radius:12px;gap:10px;
  font:650 16px/1 var(--f-sans);letter-spacing:-.01em;
  box-shadow:0 4px 0 0 var(--sh);transform:translateY(0);
  transition:transform .22s var(--spring),box-shadow .22s var(--spring),background-color .2s,color .2s}
.btn:hover{transform:translateY(-2px);box-shadow:0 6px 0 0 var(--sh)}
.btn:active{transform:translateY(3px);box-shadow:0 1px 0 0 var(--sh);transition-duration:.05s}
.btn-lime{--bg:var(--lime)}
.btn-ink{--bg:var(--ink);--fg:var(--paper);--sh:var(--lime-2)}
.btn-ghost{--bg:transparent;box-shadow:none}
.btn-ghost:hover{--bg:var(--paper-2);box-shadow:none;transform:none}
.btn-sm{height:40px;padding:0 16px;font-size:14.5px;border-radius:10px;box-shadow:0 3px 0 0 var(--sh)}
.btn-sm:hover{box-shadow:0 5px 0 0 var(--sh)}
.btn svg{width:18px;height:18px}
```

種類ごとの使い分け：
- **ライム（`.btn-lime`）**：その列の主役の行動に使う。ライムの塗り、インクの文字、インクの影。
  - 「Copy script tag」「Browse all sprites →」「Play with the crowd →」「Open the builder →」「Copy the script tag」、住みかの「Sign up」。
- **普通（`.btn`）**：サブページへの案内に使う。カードの塗りにインクの影。
  - 「Meet all 8 pals, incl. Bumble & Shel →」「Groups: ducks, ants, fish, a choir… →」「All the interactions →」「All 23 superpowers →」「Every install option」。
- **ゴースト（`.btn-ghost`）**：透明で、2px の枠だけ。影はない。ホバーで `--paper-2` の地になるが、持ち上がらない。
  - 「Meet the pals ↓」「Try on any website ↗」。
  - 押した時だけは 3px 沈み、影 1px が出る（`.btn:active` の方が強いため）。
- **インク（`.btn-ink`）**：インクの塗り、紙色の文字、lime-2 の影。GitHub ボタンだけ。dark では影がライムになる。
- **小さい（`.btn-sm`）**：高さ 40、余白 0 16、角 10、影 3px（ホバーで 5px）。

ボタンの細かい決まり：
- アイコンは 18px のピクセル SVG。
- 矢印は文字で、ラベルの後ろにつける。
  - `→`：サブページへ行く。
  - `↓`：同じページの中へ飛ぶ。
  - `↗`：外へ出る、または別の使い方。
  - 矢印は `aria-hidden` の span で包む。
- コピーボタン（ヒーロー）のアイコンは、ピクセルの紙2枚：`M5 1h8v2h2v12H5v-2H3V1h2zm0 2v8h8V3H5zm-1 10h9v-1H4z`
- 例外は GitHub のマーク（なめらかな形）と、Vercel の三角（`viewBox 0 0 76 65`、15×13）。

### 6.5 小さな押せる部品

- **呼び出しボタン**（`.spawn`、「+ BUG」「+ JELLY」「+ TOY」「CLEAR」）
  - Silkscreen 11.5px の大文字。2px のインクの枠、角 8、影 `0 2px 0`。
  - ホバー：ライムの塗り、−1px、影 3px。押した時：+2px、影 0。`.18s` のばね。
- **分段ボタン**（`.seg button`）
  - `600 13.5px/1`、余白 9×12、角 9、2px のインクの枠、`--paper` の地。
  - 押されたらインクの塗りに紙色の文字。ホバーで −1px（`.2s` のばね）。
  - 暗い舞台の上（`.bs-modes`）では透明の地、白い文字、枠は `rgba(255,255,255,.5)`。押されたらライムの塗り、`#17121f` の文字、ライムの枠。
- **キー（`kbd`、「poke」「drag」）**
  - 等幅 600 11px、余白 4×6、`1.5px solid var(--line-2)`、下だけ 3px、角 6、`--card` の地。
- **入力欄**
  - `500 16px`、余白 11×13、2px の枠、角 10、`--paper` の地。
  - フォーカスはアウトラインを消して `0 0 0 3px var(--lime)` の輪にする。
  - 範囲スライダーは `accent-color:var(--ink)`。
- **住みかのにせボタン**（`.h-btn`）
  - 影 `0 3px 0 var(--ink)`。ホバーで −2px、影 5px（`.2s` のばね）。

### 6.6 チップ・タグ・バッジ

- **`.chip`**（トップには出てこない部品）
  - 丸い錠剤の形、余白 `7px 14px 7px 11px`、2px のインクの枠、カードの地、`600 14px/1.2`、影 `0 3px 0`。
  - ホバーで −2px、影 5px。中の矢印 `.arr` が `translateX(3px)` で右へ動く。
- **特徴タグ**（`.traits li`）
  - `padding:6px 9px; border-radius:7px; background:color-mix(in oklab,var(--accent) 30%,var(--paper)); border:1.5px solid color-mix(in oklab,var(--ink) 14%,transparent)`、間は 6px。
  - 文字は `550 12.5px/1`。全部小文字で、一枚のカードに3つ。
- **Install のタグ**（`.way .tag`）
  - Silkscreen 11.5px の大文字、余白 6×8、2px のインクの枠、角 7、アクセント色をそのまま塗る。
  - 「Everything」ライム、「Lightest」スカイ、「No markup」サン、「Frameworks」紫。
- **小見出しの四角**
  - `::before{width:8px;height:8px;background:var(--accent,var(--coral));box-shadow:0 0 0 2px var(--ink)}`、文字との間は 10px。
  - 見た目は「12px の、枠つきのピクセル」。
- **手順の番号**
  - 46×46、Silkscreen 17px、中身は `"0" counter(s)`（01、02、03）。2px のインクの枠、角 10。
  - 地はライム、スカイ、サンの順。
- **API の属性名**
  - `td:first-child code{font-weight:600;background:color-mix(in oklab,var(--lime) 45%,var(--paper));padding:3px 7px;border-radius:6px}`
- **手順の中のインラインコード**
  - `font-size:.9em;padding:1px 6px;border-radius:6px;background:var(--paper-2);border:1px solid var(--line)`
- **サブページの錠剤**（「Scenes · 10」など）
  - `600 12.5px/1`、余白 7×10、角 999、`1.5px solid var(--ink)`、カードの地。

### 6.7 カード

- **キャラカード**（`.pal`）
  - カードの面、2px のインクの枠、角 22、影 `0 4px 0`。
  - 上に住みか（`.habitat`）
    - 高さ 230px、`margin:10px 10px 0`、角 14、はみ出しは隠す、インク 18% の 1.5px の枠。
    - 地はアクセント 22% に、点の格子（16px、インク 14%）を重ねる。
    - 右上（右から 12、上から 10）に、Silkscreen 11px の遊び方のヒント。
  - 下に本文。`padding:20px 22px 22px`、縦並び、`gap:12px`。
    - 上の段：左に名前（h3 30px）、右に `No.0X · 動詞`（Silkscreen 12px、muted、ベースラインでそろえる）。
    - 説明（15.5px、3文）。
    - 特徴タグ3つ。
    - コードのスニペット（`margin-top:auto` で一番下に押しつける。カードの高さが違ってもそろう）。
- **手順カード**（`.step`）
  - 2px の枠、角 18、影 4px、余白 `22px 22px 22px 84px`。左に番号の札を置く場所を空ける。
- **Install カード**（`.way`）
  - 余白 24、縦並び、`gap:12px`、2px の枠、角 22、影 4px。
- **数字の箱**（`.fact`）
  - 2px の破線（インク 40%）、角 22、余白 22、影なし。「仕様書」の顔をしている。
- **遊びのカード**（`.play-card`）
  - 余白 18、最低の高さ 190、中身は下にそろえる（`justify-content:flex-end`、`gap:14px`）。最後に Silkscreen の説明がつく。
- **Superpowers のカード**（`.pw-card`）
  - 16px の点の地、中身は絶対配置。
  - 左上（16, 14）にラベル、見出しは 36px で左 22・下 70 に置く。
- **サンドボックス**（`.sandbox`）
  - カードの面、2px の枠、角 22、紫のずれ影 8px。
- **棚**（`.shelf`）
  - 一枚の枠の中に 6 列の格子。高さ 180 のマスを 1.5px の `--line` で仕切る。
  - ホバーでマスが `color-mix(in oklab,var(--lime) 30%,var(--card))` になる。
- **舞台**（`.bigstage`、`.crowd-stage`）
  - `--code` の暗い面、白い点の格子、2px の枠、角 22、影 4px。
  - 下にバーがあり、左に Silkscreen のラベル、右に分段ボタンを置く。

### 6.8 コードの黒いカード

**ヒーローのコード窓**（`.window`）

```css
.window{position:relative;background:var(--code);color:#e8e3f3;border:2px solid var(--ink);border-radius:18px;box-shadow:8px 8px 0 0 var(--lime-2)}
.window-bar{display:flex;align-items:center;gap:7px;padding:13px 16px;border-bottom:1.5px solid #2e2739}
.window-bar i{width:10px;height:10px;background:#3a3247}
.window-bar i:nth-child(1){background:var(--coral)}.window-bar i:nth-child(2){background:var(--sun)}.window-bar i:nth-child(3){background:var(--lime)}
.window-bar span{margin-left:8px;font:500 12.5px/1 var(--f-mono);color:#9b92ad}
.window pre{margin:0;padding:18px 20px 22px;font:400 14px/1.75 var(--f-mono);overflow-x:auto;white-space:pre;tab-size:2}
.c-t{color:#ff8fa3}.c-a{color:#c6f432}.c-s{color:#ffd23f}.c-c{color:#7d7490;font-style:italic}.c-x{color:#e8e3f3}
```

- ランプは「四角」が3つ（コーラル、サン、ライム）。ファイル名は `index.html`。
- 中身は次の7行。コメントが番号つきの手順書になっている。
  ```
  <!-- 1. add the script -->
  <script src="piixpal.js"></script>

  <!-- 2. put a pal inside anything -->
  <h1>Hello world
    <piix-pal pal="bitbug"></piix-pal>
  </h1>
  ```
- 窓の上のふち（74% の位置）から、青い Lurk がのぞく。

**API パネル**（`.panel`）
- 2px の枠、角 22、`--code` の面、`0 4px 0 var(--violet)`。
- 見出しは Silkscreen 12.5px のライム、`padding:16px 20px`、下に `1.5px solid #2e2739`。
- `pre` は `16px 20px 20px`、13px/1.7。説明文は `#a79fb8` 14px。

**スニペット**（`.snip`。カードの中に置く）
- `display:flex;gap:8px;padding:6px 6px 6px 14px;border-radius:11px;background:var(--code);color:#e8e3f3`
- コードは 13px で、はみ出たら省略記号。キャラ名（`b`）はライムの 600。
- コピーボタン：`600 12.5px/1;padding:8px 11px;border-radius:8px;background:#2e2739;color:#e8e3f3`
  - ホバーと押した後はライムの塗りにインクの文字。ラベルは 1.4 秒だけ「Copied」になる。

**サンドボックスのコード**（`.sb-code`）
- 余白 16×20、13.5px/1.7、`pre-wrap`。コピーボタンは右上（右 10・上 10）。

**インラインタグ**（`.inline-tag`）
- `font-size:14px;padding:12px 14px;border-radius:10px;background:var(--code)`。ボタン列の中に置く。

**住みかのにせUI**
- `.h-floor`：高さ 44 の暗いバー。コーラルの 70px の錠剤と、`#3a3247` の 40px の錠剤（高さ 6）。
- `.h-nav`：高さ 46 の暗い上のバー。18px のライムの角丸四角と、34×6 の錠剤。

### 6.9 帯（ティッカー）

```css
.ticker{position:relative;background:var(--code);color:#f3eee3;border-block:2px solid var(--ink);overflow:hidden;--gap:34px}
.ticker-track{display:flex;width:max-content;gap:var(--gap);padding:18px 0;animation:tick 38s linear infinite}
.ticker:hover .ticker-track{animation-play-state:paused}
.ticker-track span{display:inline-flex;align-items:center;gap:var(--gap);font:400 clamp(15px,1.6vw,19px)/1 var(--f-pix);text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}
.ticker-track span::after{content:"";width:10px;height:10px;background:var(--lime);box-shadow:12px 0 0 var(--coral),24px 0 0 var(--sky);margin-right:24px}
.ticker-track span:nth-child(3n+2){color:var(--lime)}
@keyframes tick{to{transform:translateX(calc(-50% - var(--gap) / 2))}}
```

- 画面の端から端まで続く、暗い帯。どのテーマでも暗い。
- 高さは約 59px（18 ＋ 19 ＋ 18 ＋ 枠 4）。
- 句と句の間に、10px の四角が3つ並ぶ（ライム、コーラル、スカイ。間は 2px）。
- 3つに1つ（`3n+2`）の句がライム色になる。
- 9つの句を2回並べて、継ぎ目なくループさせる。
- ホバーで止まる。`aria-hidden`。
- 上のふちを、青緑に色を変えた Bitbug が歩く。

### 6.10 「Backed by」のリボン

- インクの塗り、紙色の文字、`600 14px/1`、`height:34px; padding:0 30px; gap:8px`。
- 両端を燕の尾の形に切る：`clip-path:polygon(0 0,100% 0,calc(100% - 13px) 50%,100% 100%,0 100%,13px 50%)`
- 揺れる：`backed-sway 3.2s ease-in-out infinite`。`translateY(0) rotate(-.7deg)` と `translateY(-3px) rotate(.7deg)` を行き来する。回転の中心は `50% 0`。
- ホバーで地が `--ink-2` になる。
- 両端（8% と 92%）を、鳥の Pip とハチの Bumble（どちらも scale 2）が持ち上げている。

### 6.11 表（API）

- 枠つきのカード（2px、角 22、影 4px）。文字は 15px。
- 左上に表の題。`<piix-pal>` を Silkscreen 12.5px の muted で。
- 見出しの行：「Attribute · What it does · Default」。`600 12.5px/1`、大文字、字間 .04em、muted。
- 行：1.5px の `--line` で仕切る。余白 13×20。
- 属性名の列：ライム 45% のチップ。
- 既定値の列：等幅 13px、muted、折り返さない。
- `.table-wrap{overflow:auto}`、`table{min-width:560px}`。狭い画面では表の中だけ横にスクロールする。

### 6.12 フッターと屋根の波

```css
.foot{position:relative;margin-top:clamp(120px,14vw,180px);background:var(--violet);color:#fff;border-top:0;overflow:visible;isolation:isolate}
.foot::before{content:"";position:absolute;inset:0;z-index:-1;opacity:.35;
  background:radial-gradient(rgba(255,255,255,.55) 1px,transparent 1.4px) 0 0/22px 22px;
  mask-image:linear-gradient(#000,transparent 70%)}
.foot::after{content:"";position:absolute;left:0;right:0;top:-14px;height:16px;pointer-events:none;
  background:url("data:image/svg+xml,…56×16 の段々の SVG…") repeat-x 0 0/56px 16px}
```

- 地は全幅の紫 `#6b4cff`、文字は白。
- 白い点（22px）が 35% の濃さで、下に向かって消える。
- **屋根の波**
  - フッターの上のふちはまっすぐではない。56×16 の SVG を横にくり返して、段々の山にしている。
  - フッターの上 14px にはみ出し、フッターの上端 2px に重なる。
  - インクの道：段の幅は 8px、高さは 4px。8px ごとの上端の高さは 14、10、6、2、6、10、14。下は y=16 まで塗る。
  - 紫の道：同じ段を 2px 下げ、一段内側に入れる（8〜48 の列で 14、10、6、10、14）。
  - 結果として、紫の段々の山に、約 4px のインクのふちがつく。谷（0〜8 と 48〜56）では 2px のインクの線になり、フッターの上端につながる。
  - 山は 56px ごとに一つ。山と谷の差は 12px。
  - 色は SVG に直接書いてある（`#17121f` と `#6b4cff`）。テーマに合わせては変わらない。
- 屋根の上で、大きな Boing（scale 5、コーラルのゼリー）が跳ねる。

### 6.13 大ロゴ（ピクセル文字 `<piix-type>`）

```html
<piix-type id="mark" text="piixpal" rows="22" cell="15" depth="1" gap=".08" shade="#c6f432" fit>
```

- 置き場所は `.wordmark{position:relative;margin:30px 0 0;color:var(--ink)}`、`piix-type{width:100%}`。
- 作り方
  1. 本物の書体をピクセルに変える。見えない canvas に `800 22px` の Bricolage Grotesque で「piixpal」を描く。透明度が 110 より大きい点を、一つのマスにする。余白は切り落とす。結果はおよそ 70 列 × 20 行（「l」の上から「p」の下まで。i の点は別のかたまり）。
  2. マスの大きさは `min(15, floor(使える幅 / (列数+1)))`。1440 では 15px、390 では 4px。
  3. マスの隙間は `round(マス × .08)`。15px なら 1px で、各ブロックは 14×14。マスが 7 未満なら隙間は 0 になり、字はべた塗りに見える。
  4. 押し出しの影
     - 深さは `round(マス × 1 × .6)`。デスクトップで 9px、スマホで 2px。
     - まずライム `#c6f432` で全マスを、右に 9px・下に 9px ずらして塗る。その上にインク（`currentColor`）のマスを塗る。
     - インクの隙間からライムが細い格子の線として見える（各画の右下側）。字の外にはみ出たところは、右と下に 9px のライムの段になる。左上の隙間からは紙と点が見える。
  5. canvas
     - 幅は `列数 × マス + 深さ`。上に3マス（45px）の余白を取り、`margin-top:-45px` で打ち消す（持ち上がるピクセルの居場所）。
     - `image-rendering:pixelated`、DPR は最大 2。
     - 形は `square`（使用）のほか、`dot`、`round`（半径 `s×.32`）、`plus`、`diamond` がある。
- 1440 での実測：インクは x=130〜約1180、ライムは約1188まで。「l」の上は y≈172、「p」の下は y≈470。
- `role="img"`、`aria-label="piixpal"`。canvas は `aria-hidden`。
- 作り直すなら：重いグロテスクを約 22px の高さでピクセルに変える。ライムの写しを（0.6 × マス、0.6 × マス）ずらして塗り、その上にインクの四角を「マス − round(マス × 0.08)」の大きさで重ねる。背景は透明にして、点の地に乗せる。

---

## 7. ページの構成

### 7.0 骨組み

- トークン
  ```css
  --r:14px; --r-lg:22px;
  --px:3px;                       /* 「UI の1ピクセル」。--shadow は宣言のみで未使用 */
  --shadow:0 var(--px) 0 0 var(--ink);
  --ease:cubic-bezier(.2,.8,.2,1);
  --spring:cubic-bezier(.34,1.56,.64,1);
  --wrap:min(1180px, 100% - 48px);
  --piix-z:40;
  ```
- コンテナは `.wrap{width:var(--wrap);margin-inline:auto}`。
  - 1440 では幅 1180（左右 130 の余白）。390 では幅 342（左右 24）。
- 余白の値：2、3、4、6、7、8、9、10、12、14、16、18、20、22、24、28、30、32、34、44、56、64、72、84、110px。
- 主なリズムは **22px**。格子の間（pals、install、api、facts、side）、カードの余白、`--r-lg` がどれも 22。
- セクションのリズム
  - `.sec{padding:clamp(80px,11vw,140px) 0 0}`。上の余白だけ。デスクトップで 140、スマホで 80。
  - 見出しの下は 44px。
  - 中身の下に「more」のボタン列を `margin-top:30px` で置く（`display:flex; gap:14px; justify-content:center`、折り返しあり）。
  - フッターの上は `clamp(120px,14vw,180px)`。
- ページの並び（1440。y と高さ）

| 区画 | id | y | 高さ |
|---|---|---|---|
| ヘッダー（上に貼りつく） | `#nav` | 0 | 74 |
| ヒーロー | `.hero` | 74 | 1027 |
| 帯 | `#ticker` | 1101 | 59 |
| The pals | `#pals` | 1160 | 1490 |
| Sprites | `#sprites` | 2649 | 1234 |
| Crowd | `#crowd` | 3883 | 888 |
| New ways to play | `#play` | 4771 | 818 |
| Superpowers | `#powers` | 5589 | 914 |
| How it works | `#how` | 6502 | 954 |
| API | `#api` | 7456 | 990 |
| Install | `#install` | 8446 | 885 |
| フッター | `#foot` | 9511 | 420 |

- ページ全体の高さは、1440 で約 9931px、390 で約 16784px。
- くり返しの型：見出し（左に小見出しと2行の大見出し、右にリード文、下でそろえる）→ 触れる大きな物（カードの格子、舞台、表）→ 中央のボタン列（1〜3個。サブページへの案内）。
- トップには住人が 27 匹いる。飾りではなく構成の一部。
- ページの題：`Piixpal: tiny pixel creatures that live on your website`
- 説明文（meta description）：「A free, open-source library of animated pixel characters. They crawl on your headings, nap on your paragraphs, perch on your buttons and bounce on your footer. One script tag.」
- 目印（ランドマーク）：`<header class="nav">`、`<nav aria-label="Site">`、`<main id="top">`、`<footer>`、`<nav aria-label="Footer">`。各セクションは `aria-labelledby` で自分の h2 を指す。

> 以下の英文は理解のための引用です。Inchly にそのまま使ってはいけません（12章）。

### 7.1 ヘッダー

- 目的：迷わないための道しるべ。テーマを選ぶ所と、GitHub の星を求める所。
- レイアウトは 6.1 のとおり。
- 調子：静かで、すりガラス。スクロールすると下に線が出て、床ができる。
- クモが一匹ぶら下がって、ここも住みかだと示す。

### 7.2 ヒーロー

- 目的：一目で「何か」と「生きている」を伝える。すぐコピーさせる。
- 余白は上 34px、下 110px。地は点とマスク、きらめき16個。
- 上から順に次のとおり。
  1. **「Backed by ▲ Vercel」のリボン**（左上、y≈107）。二匹が持ち上げている。
  2. **大ロゴ**（`margin-top:30px`、1180×354、y≈127 から）。Bitbug（scale 4）が字の輪郭を歩く。
  3. **2列の格子**（`margin-top:34px; grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr); gap:clamp(28px,5vw,64px); align-items:end`）
     - 左の列（幅 603、y=515 から）
       - h1（60px、3行に折れる）：「Tiny pixel creatures / that **live** on / your website.」。「live」にライムのマーカーを引く。1行目の右端（「creatures」の上）に Moss が座って本を読む。
       - サブ文（19.5px、下に 30px）：「They crawl on your headings, nap on your paragraphs, perch on your buttons and bounce on your footer. Throw them around. Line them up. Fill a stage with hundreds. One script tag, zero dependencies, free forever.」
       - ボタン（`gap:12px`）
         - 主：`btn btn-lime perch`。ピクセルのクリップボードの絵と「Copy script tag」（192×50）。押すと `<script src="https://cdn.jsdelivr.net/npm/piixpal@0.4/piixpal.min.js"></script>` をコピーし、1.6 秒「Copied!」になる。
         - 副：`btn btn-ghost perch`、「Meet the pals ↓」（169×50）。`#pals` へ飛ぶ。
       - ヒント行（13.5px、行送り 2、muted、上に 22px）：「`poke` them. `drag` the jelly. Hover the buttons and see who flies off.」。poke と drag は `kbd`。続けて呼び出しボタン「+ BUG」「+ JELLY」「+ TOY」。一度呼ぶと「CLEAR」が出る。
     - 右の列：コード窓（513×255）。左の列の下端（y≈991）にそろえる。Lurk がのぞく。
- 全体に、鳥の Pip が一羽だけいる（`<piix-pal pal="pip" on=".perch">`。コメントは「one bird, many perches」）。ヒーローの二つのボタンとフッターのボタンを行き来する。
- 現れる順番（遅れ）：リボン 0、大ロゴ .07、h1 .14、サブ文 .21、ボタン .28、ヒント .35、窓 .42 秒。
- 文の調子：言い切りの一文と、短い命令の重ね。最後は「無料・依存なし・一行」の三点で締める。

### 7.3 帯

- 目的：ヒーローとセクションの間の区切り。できることを並べて見せる。
- 文句（大文字のピクセル書体）：「crawls on headings · bounces on footers · peeks over cards · perches on buttons · dangles from navs · minds its own business · zero dependencies · one script tag · free forever」
- ライムになる句：「bounces on footers」「dangles from navs」「one script tag」。
- 調子：「どこで何をするか」を動詞と場所で言う。最後の三つは約束。

### 7.4 見出しの型（8つのセクションで共通）

- `header.sec-head`：`grid-template-columns:minmax(0,1fr) minmax(0,.8fr); gap:32px; align-items:end; margin-bottom:44px`
- 左（1440 で幅約 638）：小見出し → 16px → h2。
  - 小見出しは `Topic · qualifier` の形で、中黒「·」でつなぐ。
  - h2 は、列の幅で **短い2行** に折れるように作る。1行に一文か一節。それぞれ句点で終わる。
- 右（x=800、幅約 510）：リード文（18px、46ch）。h2 の最後の行に下をそろえる。だからリード文は見出しの頭より低い位置にある。
- 860px 以下では1列になる（小見出し → h2 → リード文）。

| # | 小見出し（四角の色） | h2（/ は 1440 での改行） | リード文 |
|---|---|---|---|
| 1 | The pals · 42 and counting（コーラル） | Tiny roommates. / Each one has a job. | Every pal is a component with its own personality: what it lives on, what scares it, what happens when you poke it. Play with them, then copy the tag. |
| 2 | Sprites · 20 and counting（サン） | Or just paste / a little face. | Sprites sit inline like an image: no positioning, no setup. Their eyes follow your cursor, they blink, breathe and hop when clicked. Go on, wave at them. |
| 3 | Crowd · hundreds on one stage（スカイ） | Or bring the / whole crowd. | One tag, a stage full of tiny agents. They wander and high-five, swarm your cursor, or walk into place to spell a word. Click the floor to drop one in. Grab one and throw it. |
| 4 | New ways to play（コーラル） | They notice / what you do. | Type a password and Peeper covers its eyes. Tick the robot box and Beep panics. Scroll and Scrolly runs along the bottom of your screen. Select text, copy it, hit deploy. |
| 5 | Superpowers（紫） | They leave the page.（1行） | Play your site as a game. Snow that settles on your letters. Toasts by pigeon. A pull-chain for dark mode. Pets in browser tabs, desktop plants, tours, uploads, carts, cookie banners. |
| 6 | How it works（スカイ） | Two lines of HTML. / Zero lines of config. | A pal lives on whatever element it's inside. It reads the page for itself: letter outlines, edges, buttons, scroll. You never position anything. |
| 7 | API（紫） | Every attribute / is optional. | Great defaults with nothing set. When you want control, it's plain HTML attributes, two events and two functions. |
| 8 | Install（ライム） | Free, open / source, yours. | MIT licensed. Use it on client work, side projects, your portfolio, your 404 page. No sign-up and no tracking. A star on GitHub is plenty. |

### 7.5 The pals（`#pals`）

- 目的：看板の6匹を、遊べるカードとして紹介する。
- レイアウト：`.pals` は3列、間は 22。1440 で各カード 379×514、2段 × 3列。1040 以下で2列、680 以下で1列。
- カードの作りは 6.7 のとおり。
- 6枚の中身

| 番号 | 名前 | 色 | 住みかの小道具 | ヒント | 特徴タグ |
|---|---|---|---|---|---|
| No.01 · crawl | Bitbug | ライム | 中央に大きな「Hello, world.」（46px/760）。Bitbug（scale 3）が字の上を歩く | hover close | climbs letters · cursor-shy · flips when poked |
| No.02 · bounce | Boing | コーラル | 暗い「フッター」のバー（内側 18、高さ 44、角 10）。コーラルの錠剤と灰色の錠剤2つ。上でゼリーが跳ねる | drag + throw | draggable · throwable · gets dizzy |
| No.03 · mind | Moss | 紫 | 一行の文「Some light reading for a slow afternoon.」（17px/500）。右端に Moss | poke ×3 | reads · naps · holds grudges |
| No.04 · peek | Lurk | スカイ | 小さな白いカード（幅 68%、高さ 104、2px の枠、角 12）。中に骨組みのバーが3本（インクの題 50%、灰色の全幅、灰色の 70%）。Lurk が上からのぞく | come closer | peeks · watches you · ducks |
| No.05 · hang | Thread | サン | 上に暗い「ナビ」（高さ 46）。18px のライムの四角と、右に灰色の錠剤3つ。クモが 70px の糸でぶら下がる | reach for it（このカードだけ右下） | swings · scroll-aware · yo-yos |
| No.06 · perch | Pip | ミント | 中央に二つのボタン（間 22）。「Sign up」（ライム）と「Log in」（白）。どちらも 2px の枠と 3px の影。鳥がとまる | hover a button | perches · flies · sings |

- 説明文（各3文）
  - Bitbug：「A lime beetle with one very curious antenna. Walks the real outline of your letters, hops across spaces, and bolts when your cursor gets close.」
  - Boing：「A coral jelly drop with more energy than sense. Hops along your footer, leaps at your cursor, and goes boing when you throw it.」
  - Moss：「A mushroom with a book and no interest in you. Reads on your paragraphs, flips pages, dozes off. Poke it three times and it moves somewhere quieter.」
  - Lurk：「Big eyes, little hands, zero courage. Hides behind your cards and peeks over the edge. Its eyes follow you, but only from a safe distance.」
  - Thread：「A small spider on a long string. Dangles from your nav, swings when you scroll, zips up when you reach for it and lowers itself back down.」
  - Pip：「A round bird who loves a good button. Sits on your CTAs, pecks, sings. Hover its perch and it flies a loop, then lands on the next one.」
- スニペットは `<piix-pal pal="NAME"></piix-pal>`。
- ボタン列：普通のボタン「Meet all 8 pals, incl. Bumble & Shel →」（333×50）。`components/pals.html` へ。
- 調子：住人の紹介。見た目と性格の欠点 → あなたのページで何をするか → あなたへの反応、の順。

### 7.6 Sprites（`#sprites`）

- 目的：もう一つの、より簡単な製品。画像のように置ける「顔」。
- 大舞台（`.bigstage`、1180×409）
  - 暗い面に白い点（20px、14%）、2px の枠、角 22、影 4px。
  - 大きなボクセルのスプライトが3体。gloop（橙赤のゼリー）、hops（薄紫のウサギ）、inky（紫のタコ）。大きさは 210 / 200 / 210。
  - 横並びで `space-around`、余白 56/24/34、最低の高さ 330。
  - 下のバー：上に 1.5px（白 14%）の罫、余白 14×18。
    - 左：Silkscreen 12px `#cfc8db`「Big sprites · chunky 3D, turn toward your cursor」
    - 右：分段ボタン「3D voxel / Pixel / Dots」。描き方が切り替わる。
- 棚（`.shelf`、22px 下）
  - 6列 × 2段。マスは 196×180。右と下に 1.5px の罫。
  - スプライト（scale 5）を下にそろえ、その下に Silkscreen 11px の muted で名前。名前は `components/sprites.html#s-NAME` へのリンク。
  - 12体：mochi、toast、robo、cloud、ufo、egg、loaf、onigiri、cactus、planet、candle、pudding。
  - ホバーでマスがライム 30% になる。
- ボタン列：暗いインラインタグ `<piix-sprite name="mochi"></piix-sprite>` → 主ボタン「Browse all sprites →」。
- 調子：「Or …」で前のセクションから話をつなぐ。「Go on, wave at them.」と遊びに誘って終わる。

### 7.7 Crowd（`#crowd`）

- 目的：規模を見せる。一つのタグで何百もの小さな住人。
- 舞台（1180×449）は大舞台と同じ作り。点は 18px。
  - `<piix-crowd mode="form" text="PIIXPAL" count="240" height="380">`。240体の色とりどりの小さな四角い生き物（目つき）が、歩いて「PIIXPAL」の字になる。
  - バーの左は Silkscreen で `<piix-crowd mode="…">`。右は分段ボタン「Formation / Crowd / Swarm」（数は 240 / 110 / 160 に変わる）。
- ボタン列：普通のボタン「Groups: ducks, ants, fish, a choir… →」（`pals.html#groups`）→ 主ボタン「Play with the crowd →」（`crowd.html`）。
- 調子：「Or bring the whole crowd.」で前とつなぐ。最後は命令形の遊びの誘い。

### 7.8 New ways to play（`#play`）

- 目的：本物の UI の出来事（入力、チェック、ボタン、端末）に反応する住人を見せる。
- レイアウト：4列、間 18。カードは 282×190。
- 5枚
  1. メール欄：ラベル「Email」（13px/600）、入力欄（空のとき「you@site.com」）。Peeper（白い毛玉）が欄の上にいる。説明「peeper · try typing」。
  2. パスワード欄：ラベル「Password」、空のとき「shh」。Peeper が目をおおう。説明「peeper · it won't look」。
  3. チェック：枠つきの箱（2px、角 10、余白 14）に「☐ I'm not a robot」。小さなロボットの Beep が立つ。説明「beep · tick it」。
  4. デプロイ：中央にライムの「Deploy」ボタンと、上にロケット。説明「rocket · click it」。
  5. 端末（横長、4列ぶち抜き、最低の高さ 170）：灰色の平たいバーが床。モニター頭の Termi が、暗い吹き出しに `npm i piixpal` / `added 1 package, 0 vulnerabilities` / `✓ 95 pals moved in` と打つ。バーの 90% の位置に緑のカエル。説明「termi + frog · the frog wants your cursor」。
- このセクションには `<piix-pal pal="scrolly">` もいる。画面の下に貼りついたライムの読書進捗バーの上を走る。
- ボタン列：普通のボタン「All the interactions →」。
- 調子：「They …」と、製品を主語にする。リード文は「〜すると、〜する」を三回重ねて、最後に命令を三つ並べる。

### 7.9 Superpowers（`#powers`）

- 目的：飾りを超えた働き（ゲーム、天気、通知、ダークモードのスイッチ）を見せる。
- レイアウト：2列、間 18。カードは 581×260。
- 4枚
  1. 「pix · click it, then ← → ↑」：見出し「Play me」。二つの小さなボタン「Jump」（白）と「Higher」（ライム）が足場になる。赤いハチマキの Pix を矢印キーで動かし、コインを3枚集める。
  2. 「weather · swipe through it」：見出し「Let it snow」（44px、中央）。ピクセルの雪が降り、字の上に積もる。
  3. 「pidge · toasts by pigeon」：左上に小さなライムの「Save」ボタン。押すとハトが「Saved your changes」の通知を運んでくる。
  4. 「bulb · pull the chain」：見出し「Lights?」。ピクセルの電球が玉の鎖で 80% の位置に下がる（長さ 80）。引くとカードが暗くなる。
- ボタン列：普通のボタン「All 23 superpowers →」。
- 調子：一行の見出し「They leave the page.」。リード文は体言止めの短い文を重ねる。

### 7.10 How it works（`#how`）

- 目的：二行で使える、と信じさせる。その場で試させる。
- レイアウト：`.9fr 1.1fr`、間 `clamp(24px,4vw,56px)`、上そろえ。左が手順（506）、右がサンドボックス（618、`top:96px` に貼りつく）。960 以下で1列。
- 手順（`ol.steps`、間 14）
  1. 「Add the script.」 One file, no build step, no dependencies. Works in plain HTML, React, Vue, Svelte, Astro, Webflow and Framer embeds.
  2. 「Drop a pal inside something.」 Put `<piix-pal pal="moss">` inside a heading, a card, a footer. Or point it from anywhere with `on="#footer"`.
  3. 「It figures out the rest.」 Bitbug walks the real glyph contours, Lurk finds the card's edge, Pip hops between every match of `on=".btn"`. They pause off-screen, respect reduced motion and never block a click.
- サンドボックス
  - 舞台は高さ 300、紙の地に 18px の点。中央に「Type anything here」（64px、780）。その上に住人がいる。
  - 操作部：上に 2px の枠、余白 18×20。各行は「86px のラベル | 残り」の格子。
    - Headline：文字の入力欄（最大 32 字）。
    - Pal：分段ボタン「Bitbug / Moss / Boing / Lurk」。
    - Hue：0〜350、10 刻みのスライダー。横に「0°」の表示。
  - 下に暗いコード。入力に合わせて書き換わる。右上にコピーボタン。
- 調子：対句の見出し「Two lines of HTML. / Zero lines of config.」。手順の題は短い命令か、言い切り。

### 7.11 API（`#api`）

- 目的：「何も設定しなくていい。でも全部変えられる」を示す。
- レイアウト：`1.25fr .75fr`、間 22。表は 724、横の列は 434。980 以下で1列。
- 表の中身

| Attribute | What it does | Default |
|---|---|---|
| pal | Which character: `bitbug boing moss lurk thread pip` | bitbug |
| on | CSS selector of what to live on. Several matches give Pip more perches. | parent |
| do | Swap the behaviour: `crawl bounce mind peek hang perch` | its own |
| at | Where along the element, from 0 (left) to 1 (right). | random |
| scale | Size of one sprite pixel, in CSS pixels. | 3–4 |
| hue | Recolour it by rotating the hue, in degrees. | 0 |
| edge | `text` walks the glyph outlines, `box` walks the element's top edge. | text |
| speed energy length | Crawl speed, bounce energy, thread length. | 1 · 1 · 70 |

- 横の列：暗いパネルが二枚。
  1. 「EVENTS + METHODS」
     ```
     // a pal was poked
     pal.addEventListener('piix:poke', e => …)

     // poke it yourself
     pal.poke()

     // tuck pals under a sticky header
     :root { --piix-z: 40 }
     ```
  2. 「DRAW YOUR OWN PAL」：`Piixpal.sprite('blip', {...})` で、6×4 のドット絵を文字列で書く。最後に `#a79fb8` 14px で「Pixels are strings. Any pal works with any behaviour that finds the clips it needs.」
- 調子：見出しは安心させる一文。リード文は「既定値がいい。必要なら素の HTML 属性で」。

### 7.12 Install（`#install`）

- 目的：入れ方を選ばせる。数字で安心させる。
- 4列の格子（間 22）。カードは 279×281。

| タグ（色） | h3 | 本文 | スニペット |
|---|---|---|---|
| EVERYTHING（ライム） | One script tag | All 124 components, about 106 KB gzipped, served free by jsDelivr. Then paste any tag. | `<script src="…/piixpal.min.js">` |
| LIGHTEST（スカイ） | Just the ones you use | Every pal and sprite has its own 1–4 KB file. The shared engine loads itself, once. | `…/dist/c/kitty.min.js`（kitty はライム） |
| NO MARKUP（サン） | Webflow, Framer, WordPress | Say what goes where, right on the script tag. Nothing else to touch. | `data-pals="bitbug@h1, boing@footer"` |
| FRAMEWORKS（紫） | React, Vue, Svelte | Drop-in wrappers and TypeScript types. Or just use the tags: they're web components. | `<PiixPal pal="bitbug" />` |

- ボタン列：主「Open the builder →」、普通「Every install option」（矢印なし）、ゴースト「Try on any website ↗」（ブックマークレット）。
- 数字の箱（4列、間 22、上に 22）。279×143、破線、影なし。大きな数字（34px、780）のあとに、小さな文（14.5px）が続いて一文になる。
  - **1–4 KB** per component, plus a 16 KB shared engine
  - **1 loop** one shared animation loop, paused off-screen
  - **0 clicks** blocked. Pals only catch clicks on themselves
  - **A11y** respects reduced motion, hidden from screen readers
- 調子：見出しは三つ並べ「Free, open source, yours.」。謙虚な締め「A star on GitHub is plenty.」。

### 7.13 フッター

- 目的：最後のひと押し。
- 紫の全幅。上は屋根の波。Boing が跳ねる。内側の余白は上 72、下 36。
- 呼びかけの段（`.foot-cta`）：`grid-template-columns:minmax(0,1fr) auto; gap:28px; align-items:end`
  - h2（108px、行送り .92、780、字間 −.05em、幅 960）：「Your website is / lonely. **Get it a pal.**」。後半はライム。
  - 右下に主ボタン「Copy the script tag」（192×50、`--sh:var(--ink)`）。h2 の最後の行にそろえる。Pip のとまり木でもある。
- 下の段（`.foot-bottom`）：`margin-top:64px; padding-top:24px; border-top:1.5px solid rgba(255,255,255,.25); font-size:14.5px; gap:16px 28px`、両端そろえ。
  - 左：白い「piixpal」の文字ロゴ（アイコンなし、色つきの点つき）。上に戻るリンク。
  - 中：「Pals · How it works · API · GitHub · Request a pal」（最後は GitHub の issues へ）。間は `6px 22px`、不透明度 .85。ホバーで 1 になり、下線（3px 下）がつく。
  - 右：Silkscreen 12px、不透明度 .75 で「MIT · made of tiny squares」。
- 調子：診断して、処方する。「あなたのサイトはさびしい。住人を一匹どうぞ。」の型。

---

## 8. 動き

### 8.1 原則

- **ピクセルの物は段で動く。体のある物はばねで動く。**
  - 吹き出し、通知カード、きらめき、ロゴの点は `steps()` で動く。コマ送りに見える。
  - ボタンとカードは、行き過ぎて戻るばね（`--spring`）で動く。
  - 生き物は本物の重力、ばね、振り子で動く。
- **触る前から反応する。** 近づいただけで逃げる、のぞく、飛び立つ。
- **逃げるのは速く、戻るのはゆっくり。**
- **控えめにする。** クリックを奪わない。画面の外では眠る。動きを減らす設定では静かな姿勢で止まる。

### 8.2 時間とイージングの早見表

| 値 | 使う所 |
|---|---|
| `--ease: cubic-bezier(.2,.8,.2,1)` | スクロールで現れる（透明度とぼかし .8s、位置 .9s）、通知カードの並べ直し .25s |
| `--spring: cubic-bezier(.34,1.56,.64,1)` | ボタン .22s、カード .35s、チップ .22s、ロゴ .35s、分段 .2s、呼び出しボタン .18s |
| `.05s` | ボタンを押し込む瞬間 |
| `steps(n)` | 吹き出し .14s steps(3)、通知カードの出現 .22s steps(4)／消える .16s steps(3)、きらめき steps(1)、ロゴの点 steps(2) |
| 3.2s ease-in-out | リボンの揺れ（±.7°、3px） |
| 38s linear | 帯の一周（ホバーで止まる） |
| 3.6s | ロゴの点が跳ねる周期 |
| 2.6〜5.6s | きらめきの周期 |
| .35s / 400ms | テーマの色の切り替え／`theming` を外すまで |
| 1600 / 1400 / 1300ms | コピーの反応（ヒーロー／スニペット／サンドボックス） |
| .07s × 順番（最大 .6s） | 現れる時の時間差 |
| 130〜140ms | まばたき（スプライト／Lurk） |
| 760ms | スプライトの呼吸 |
| 25s | スプライトが眠るまで |
| 460ms | スプライトのクリックでの跳ね |
| .7s／1字 | ロケットのカウントダウン |
| 22字／秒 | Termi が打つ速さ |

物理の目安（ドット絵なしで作り直すときも使える）：
- 重力は 2400〜5200 px/s²。
- ばねは k ≈ 260〜320、減衰 c ≈ 14〜22。
- なめらかに近づける式は `1 − e^(−k·dt)`、k = 3〜14。速く逃げて、ゆっくり戻る（Thread は 140 対 18、Lurk は 14 対 3.2）。
- 着地のつぶれは横 1.15〜1.2、縦 .8〜.82。1コマごとに .2 ずつ戻す。
- 跳ねる軌道は二次ベジェか `sin(πp)` の弧。

### 8.3 押す・持ち上げる（CSS）

- **ボタン**
  - ホバーで 2px 上がり、影は 6px になる。
  - 押すと 3px 沈み、影は 1px になる。沈むのは 50ms で一瞬。
  - 離すと、行き過ぎるばねで .22s かけて戻る。
  - 影の下端はいつも +4px（5.4）。
- ほかの部品の反応

| 部品 | 通常 | ホバー | 押す | 時間 |
|---|---|---|---|---|
| 呼び出しボタン | 影 2px | ライムの塗り、−1px、影 3px | +2px、影 0 | .18s ばね |
| `.h-btn` | 影 3px | −2px、影 5px | – | .2s ばね |
| 分段ボタン | – | −1px | – | .2s ばね。押された状態の地は .2s |
| キャラカード | 影 4px | −4px、影 8px | – | .35s ばね |
| `.chip` | 影 3px | −2px、影 5px。矢印が右へ 3px | – | .22s / .25s ばね |
| ナビのリンク | – | `--paper-2` の地 | – | .2s |
| 棚のマス | – | ライム 30% の地 | – | .25s |
| コピーボタン | `#2e2739` | ライムの塗り、インクの文字 | – | .2s |
| ロゴのアイコン | – | `rotate(-8deg) scale(1.08)` | – | .35s ばね |

- ライブラリの通知カードの中のボタン：押すと `translateY(2px)`、影は 3 から 1 へ、`.08s`。

### 8.4 スクロールで現れる

- `.js .rv{opacity:0;transform:translateY(22px);filter:blur(6px)}`。`.in` がつくと元の姿に戻る。
- 透明度 .8s、位置 .9s、ぼかし .8s。すべて `--ease`。
- 時間差は、セクションの中での順番 × .07s（最大 .6s）。
- IntersectionObserver の設定は `rootMargin:'0px 0px -8% 0px'`、`threshold:.08`。一度現れたら、もう見張らない。
- 注意：全ページの画面写真では、まだ現れていない所（Install、フッターの見出し）が白く抜ける。本当の空白ではない。
- ナビの下線は `scrollY > 8` で出る。
- なめらかスクロール：`html{scroll-behavior:smooth; scroll-padding-top:96px}`。
- `?at=セクションid` で開くと、なめらかスクロールを止めて、その場所へ直接飛ぶ。

### 8.5 テーマの切り替え

1. `html.theming` をつける。`*{transition:background-color .35s,color .35s,border-color .35s!important}` で全体の色がふわっと変わる。
2. `data-theme` を書き換え、保存する（try/catch で包む）。
3. 三つのボタンの `aria-pressed` をそろえる。
4. 大ロゴを 0ms と 380ms の二回描き直す。canvas は今の文字色で塗るので、自動では色が変わらないため。
5. 400ms で `theming` を外す。

### 8.6 コピーの反応

- ヒーローとフッターのコピーボタン
  - 中のラベルだけが「Copy script tag」「Copy the script tag」から「Copied!」に変わる。
  - 1600ms で戻る。何度押しても、タイマーは押し直しから数え直す。
  - コピーできない環境では、隠した textarea と `execCommand('copy')` を使う。それも失敗したら「Press Ctrl+C」と出す。
  - そこにとまっていた鳥は、ホバーの時点でたいてい飛び立っている。
- スニペットのコピーボタン：「Copy」から「Copied」になり、ライムの塗りが 1400ms 続く。失敗は黙って無視する。
- サンドボックスのコピー：`<piix-pal pal="…" hue="…"></piix-pal>` をコピーし、「Copied」とライムが 1300ms 続く。
- 「!」を使うのは、ここの「Copied!」だけ。

### 8.7 ずっと動いているもの

- 帯：38 秒で一周。ホバーで止まる。
- リボン：3.2 秒で揺れる。両端の二匹も一緒に揺れる。
- きらめき：段でチカッと光る（3.3）。
- ロゴの二つ目の点：3.6 秒ごとに、段で跳ねる。
- 下の読書進捗バー：スクロールで伸び、上を子どもが走る。

### 8.8 大ロゴの動き

- **ピクセルの雨（読み込み時）**
  - 各マスは `(行数 + 6) × マス + rnd(0, 8マス)` 上から落ちる。
  - 遅れは `x × .012 + rnd(0, .18) + (行数 − y) × .004` 秒。左から右へ、少し乱れて降る。同じ列では下の行が先に着く。
  - 重力は 5200 px/s²。秒速 500px より速く着いたマスは、22% の速さで一度だけ跳ねる。
  - 影（ライム）は、マスが着地の1マス手前に来るまで描かない。ライムの押し出しがマスと一緒に「到着」する。
  - 全体で約 1〜1.5 秒。
- **カーソルで持ち上がる**
  - カーソルが canvas から 8マス（120px）以内に来ると目を覚ます。
  - 7マス以内のブロックが `(1 − d/7)² × マス × 1.4`（最大約 21px）持ち上がる。
  - 各ブロックが自分のばねを持つ（硬さ 320、減衰 22。少し揺れ残る）。
  - 持ち上がるのはインクの層だけ。ライムの影は地面に残る。だから字の中から柔らかいこぶが生まれ、下のライムが見える。
- **クリックの波紋**
  - クリックした所から輪の波が広がる。速さは毎秒 60マス、最大は `列数 + 20` マス。
  - 帯の幅は 2.5マス、持ち上がりは 1.6マス。広がるほど弱まる。
- **住人の着地の波紋**
  - `piixImpact(x, y, power)` を呼ぶ。最大 `5 + 5·power` マス、強さ `.5 + .4·power`。
  - Bitbug の着地、Boing の跳ね、投げたおもちゃで字が波打つ。
- 住人のための情報
  - `piixSurface(x)`：その列の一番上のマスの y を返す。隙間なら `null`。住人は本当のブロックの輪郭を歩く。
  - `piixSettled`：全マスが着地したら true。Bitbug はそれまで隠れている。
- 何も動いていないときは、ループから抜けて休む。

### 8.9 住人のしくみ

- **一つのループ**
  - `requestAnimationFrame` は一つだけ。部品は `sub(fn)` で入り、`unsub(fn)` で出る。誰もいなければループは止まる。
  - `dt = min(.05, 経過秒)`。裏のタブから戻っても瞬間移動しない。
  - スクロールの速さとポインタの速さは、なめらかにならす（`lerp` .25 と .35）。
  - タッチは指が触れている間だけ数える。ポインタが外に出たら「いない」扱い（`-1e5`）にする。
- **一枚の重ね層**
  - `<body>` の最後に `<div data-piixpal aria-hidden="true">` を一つ置く。中は shadow root。
  - 層は `pointer-events:none`。各住人の canvas だけがクリックを受ける（`cursor:grab`、つかめないものは `pointer`）。
  - だから「0 clicks blocked」が本当になる。
  - スタイルは `adoptedStyleSheets` で入れる。厳しい CSP でも動くように、`<style>` も予備に持つ。
- **取りつき方**
  - タグそのものは `display:none`。絵は重ね層に描く。
  - 2回の rAF のあとに置く（レイアウトと書体が落ち着くのを待つ）。
  - `on="セレクタ"` で取りつく先を選ぶ。なければ親要素。
  - 見つからなければ 125ms ごとに 80 回（10 秒）やり直す。
  - `hue` を変えるとフィルタだけが変わる。ほかの属性を変えると置き直す。
  - 押すと `piix:poke` が泡立って上に伝わり、つかむかつつくかの反応をする。準備ができたら `piix:ready` を出す。
- **大きさ**
  - `scale` 属性 → スプライトの指定 → 4、の順で決まる。
  - スマホ（`innerWidth < 640`）では `round(max(2, base × .75))`。Bitbug は 4 → 3、Boing は 5 → 4、Pip は 3 → 2。
  - 距離も `S = s/3` か `s/4` で比例させる。どの大きさでも動きのつり合いが同じになる。
- **描き方**
  - 足の点（横の中心、下端）で位置を持つ。`translate3d` は整数に丸め、文字列が変わったときだけ書く。
  - 伸び縮みは足元を中心にする（`transform-origin: 50% 100%`）。向きは左右反転で変える。
  - ドット絵は文字列で書く（`'.'` が透明、ほかの字がパレットの色）。コマは前もって小さな canvas に焼いておく。既定は毎秒 6 コマ。
  - `image-rendering: pixelated`。
- **吹き出し**（`actor.say(icon, ms = 1200)`）
  - 地は `#fffdf5`。ふちは `#1b1226` の 1単位の影4つで描くピクセルの線。しっぽは1単位の四角。
  - 出るときは `scale(0)` → `scale(1)` を `.14s steps(3)` で。段で「ポン」と出る。
  - アイコン：`! ? !? ... heart zz grr note sweat star vein hi eep leaf copy check x up`。数字は 3×5（`say('#3')`）。
- **音が伝わる**（`shout`）
  - 強く着地すると「thud」を周りに知らせる。範囲の中の住人がそれぞれ反応する。
  - Bitbug は驚いて逃げる。Moss は怒ってそっぽを向く。Lurk は隠れる。Pip は飛び立つ。Thread は揺れて汗をかく。おもちゃは弾かれる。
- **つかんで投げる**
  - 5px より動いたらドラッグになる。それ未満はクリック。
  - 速さは ±2600 までに抑える。離す前に 90ms より長く止まっていたら「置いた」扱いで、投げない。

### 8.10 住人ごとの動き

- **Bitbug**（大ロゴの上。`scale="4" at=".35"`）
  - 字が着地し終わるまで隠れている。それから上から跳んで降り、つぶれて着地する。
  - 秒速約 40px で歩く。10px までの段差は歩いて越える。それより大きければ跳ぶ（跳ぶ時間は .28〜.6 秒）。
  - 136px 先まで着地点を探す。なければ振り返り、あたりを見る。
  - ふだんの流れ：歩く → においをかぐ／見回す／休む → また歩く。
  - カーソルが近づくと「!」を出して .32 秒固まり、3.4 倍の速さで逃げる。
  - つつくとひっくり返って足をばたつかせ（1.4〜2 秒）、起き上がる。
  - 二匹が向かい合うとハートを出す。
- **Thread**（ナビからぶら下がるクモ。`at=".7" length="84"`）
  - 糸は `#1b1226`、不透明度 .75。振り子は糸の上を中心に回る。
  - スクロールで揺れる。ページから少し遅れて振れる。
  - 長さはゆっくり呼吸する（±10S）。
  - カーソルが 75S 以内に来ると、速いばね（硬さ 140）で上まで巻き上がる。怖がって汗をかく。
  - カーソルが離れると 1.2〜2.2 秒待ち、遅くはずむばね（硬さ 18）で降りてくる。
  - つつくとヨーヨーのように落ちる。
- **Pip と Bumble**（リボンを持ち上げる二匹。`do="hoist" scale="2" length="-7"`）
  - リボンのふちを握り、リボンの揺れにそのまま乗る。
  - 上下の揺れはわざとずらしてある。
  - カーソルがかすめると傾く。つつくと喜んで跳ねる。
- **Moss**（ヒーロー見出しの右端）
  - 4〜8 秒読む → ページをめくる → また読む。18 秒読んだら半分の確率でうたた寝する（「zz」）。
  - 1.1 秒見つめられると顔を上げて「...」。
  - 1回つつくと怒って背を向ける。2回で青筋。4 秒以内に3回で「grr」と言い、荷物をまとめて反対側へ跳んで移る。
- **Lurk**（コード窓の上のふち。`at=".74"`）
  - 隠れる → 耳 → 目 → 全身、と段階でのぞく。上がる量はドット1つぶん単位に丸める。
  - 隠れるのは速く、出てくるのは慎重。
  - 目はカーソルを追う。2.2〜5.2 秒ごとに 140ms まばたきする。
  - 近づかれると隠れて、ふちの別の場所から出てくる。
- **Pip**（ボタンを渡り歩く一羽）
  - とまり木：「Copy script tag」「Meet the pals ↓」、フッターの「Copy the script tag」。
  - 1.5〜4 秒ごとに、つつく／見上げる／振り返る／歌う（音符）。
  - ボタンにホバーすると（ボタンの周りに 26S の余白をとって判定）、クリックより前に飛び立つ。横に8の字を描いて回る。
  - 1.1 秒静かになったら、たいてい別のボタンへ降りる。着地でつぶれる。
- **Boing**（フッター。`scale="5"`）
  - 上から落ちてくる。重力は 3000 px/s²。
  - 跳ねる合間に .15〜.9 秒休む。15% は大跳び。
  - カーソルが上にあると、カーソルめがけて跳ぶ。
  - 強く着地すると目を回す（2.2 秒、星）。着地では平たくつぶれて、ばねで戻る（硬さ 260、減衰 14）。
  - つかむとぶら下がって震え、投げると回る。秒速 1600px より速く投げると必ず目を回す。
  - ただのクリックで大跳び（1.6 倍）と回転。
- **Scrolly**（画面下の進捗バー）
  - バーは画面下に固定。高さ 4px（スマホでは 3px）。色は `#c6f432`、`box-shadow:0 0 0 1px rgba(23,18,31,.25)`。
  - 子どもが進み具合の位置まで走る。速くスクロールするほど足も速くなる（毎秒 8〜22 コマ）。
  - 99.5% で星を出して喜ぶ。つつくとページの一番上に戻る。
- **Peeper**（メールとパスワード）
  - 入力のキャレットの位置を追って、欄の上を滑る。
  - パスワード欄では目をおおう。打つたびに 25% の確率で跳ねる。
  - 離れたときに入力が正しければチェック、まちがっていれば汗。
- **Beep**（「I'm not a robot」）
  - アンテナが赤とライムで点滅する。カーソルが近づくと震えて汗をかく。
  - チェックすると「!?」と言って右へ逃げ、しばらくしてとぼとぼ戻り、照れる。
- **ロケット**（「Deploy」）
  - 押すと 3・2・1（.7 秒ずつ）で発射。四角い煙を出して上がり、逆噴射でそっと降りる。着地で「thud」。
- **Termi とカエル**
  - Termi は毎秒 22 字で打つ。四角いキャレットが 2Hz で点滅する。吹き出しは暗い地にライムの等幅。
  - カエルはいつもカーソルを向く。150S 以内に来ると、.14 秒で舌を伸ばす。当たれば喜ぶ。
- **Pix**（Superpowers）：横スクロールのゲームの主人公。矢印で走り、跳ぶ（二段跳びあり）。足場はカードの中の文字の行とボタン。
- **雪**：字の形に積もり、端から転がり落ちる。速くなでる（秒速 220px 超）と払い飛ばせる。
- **Pidge**：封筒を運んで飛んでくる。通知カードは段で出て段で消える。4.2 秒で閉じる。ホバーするとタイマーが止まる。
- **電球**：12 個の輪の鎖。引いて放すか、クリックでカードが暗くなる（.35s）。明るいときは周りを蛾が飛び、暗いと鎖にとまる。

### 8.11 スプライトと群衆

- **スプライト**（`<piix-sprite>`）
  - 目がカーソルを追う。4 秒動きがないと、目がうろうろする。
  - 2.4〜6 秒ごとに 130ms まばたきする。760ms ごとに 1ドット上下して呼吸する。
  - 25 秒何もしないと眠る。「z」が上がり、呼吸は 1400ms に遅くなる。
  - クリックで 460ms 跳ねて、うれしい目になる。
  - 大きいスプライトは、カーソルへ最大 8° 傾く。近づくと少し逃げる。ボクセルは向きに合わせて回る。
  - 描き方は「3D voxel / Pixel / Dots」で切り替わる（ライブラリには halftone、dither、ascii もある）。
- **群衆**
  - 9×8 の住人で、色は8色（`#c6f432 #ff6b4a #6b4cff #58c8ff #ffd23f #ff9cc2 #25b89a #f4f1fa`）。
  - Formation：字の位置まで歩き、9 秒ごとに少し手を振る。床をクリックすると散らばり、1.4 秒後に戻る。
  - Crowd：うろつき、立ち止まり、手を振り、すれ違いざまにハイタッチする（黄色い四角がはじける）。
  - Swarm：カーソルに群がる（30px は空ける）。
  - カーソルは群れを割る。床をクリックすると一体落とせる。つかんで投げられる。強く落ちると目を回す。

### 8.12 遊び場

- **呼び出しボタン**
  - `+ bug`：60% は大ロゴに、ほかは見出しに Bitbug を一匹置く。色はランダム（30° 刻み）。
  - `+ jelly`：大ロゴの上に Boing を置く。字の上で跳ね、隙間から落ちる。
  - `+ toy`：ボール、アヒル、サイコロ、小石、立方体、缶のどれか。本物の見出しや段落に落ちて転がる。速く払う（秒速 900px 超）と弾ける。
  - 最大 24 個。超えたら古いものから消える。
- **サンドボックス**
  - 見出しを打つと文字だけが変わる。住人は置かれたまま。
  - 住人を選ぶと置き直す（Boing と Lurk は `edge="box"`）。
  - 色相を変えるとフィルタだけが変わる。

### 8.13 反応する距離のまとめ

- Bitbug は約 60px で逃げる。
- Lurk は約 100px で隠れる。
- Moss は 1.1 秒見つめると気づく。
- クモは約 75px で巻き上がる。
- 鳥はクリックの前、ホバーで飛ぶ。
- カエルは 150px で舌を出す。
- 大ロゴは約 105px で持ち上がる。

### 8.14 動きを減らす設定（`prefers-reduced-motion: reduce`）

- CSS 側
  - なめらかスクロールを止める。
  - リボンの揺れを止める。
  - 現れる演出をやめて、最初から見せる。
  - 帯を止める。
  - きらめきを消す。
  - 通知カードの出入りの演出をやめる。
- ライブラリ側（毎フレーム確認するので、その場で切り替わる）
  - 全員がコマ送りをやめ、静かな姿勢で止まる。
    - 歩く子は立つ。跳ねる子は座る。クモは静止。持ち上げ役は揺れない。Moss は読む。Lurk は目だけ出す。鳥はとまる。
  - 進捗バーは伸びるが、子どもは位置へ飛ぶ。Termi は一行を全部表示する。
  - 大ロゴは雨も持ち上がりも波紋もない。
  - スプライトは呼吸も跳ねもない。目の追いかけとまばたきは残る。
  - 群衆は止まって描かれる。
  - ライブラリの部品は、自分の shadow root に `*{transition:none!important;animation:none!important}` を入れる。
- 抜けている所：ロゴの点の跳ねと、ボタンのばねは止まらない。
- 読み上げへの配慮
  - 重ね層、帯、きらめき、飾りの SVG は `aria-hidden`。
  - 大ロゴは `role="img"`。群衆は `role="img"` で「A crowd of tiny pixel characters」。
  - 通知カードは隠さない（`role="status"` か `alert`）。

### 8.15 重くしない工夫

1. ループは一つ。誰もいなければ止まる。
2. 画面の中心から 1.5 画面以上離れた住人は眠る。スプライトと群衆は IntersectionObserver で止める（120px と 100px の余裕）。
3. 変わったときだけ書く。位置は整数に丸める。
4. コマは一度だけ焼く。色はフィルタで変える。
5. 形の測定は 16ms に一回まで。全員で使い回す。
6. 音は出さない。

---

## 9. スマホでの姿

### 9.1 方針

- デスクトップから作っている。幅の条件はすべて `max-width`。
- 共通のブレークポイントはない。部品ごとに切り替わる幅が違う。
  - 1100、1040、1000、980、960、900、860、820、760、700、680、640、600、560、520、440。
- 文字と余白は `clamp()` でなめらかに変わる。
- 横には絶対にスクロールしない（`html{overflow-x:clip}`）。はみ出た物は切れる。
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`。拡大は禁止していない。`-webkit-text-size-adjust:100%`。

### 9.2 `clamp()` で変わる値

| 部品 | 指定 | 390 | 1440 |
|---|---|---|---|
| h1 | `clamp(34px,4.5vw,60px)` | 34 | 60 |
| セクションの h2 | `clamp(36px,5vw,68px)` | 36 | 68 |
| フッターの h2 | `clamp(44px,7.5vw,110px)` | 44 | 108 |
| サンドボックスの題 | `clamp(36px,5vw,64px)` | 36 | 64 |
| サブ文 | `clamp(17px,1.5vw,19.5px)` | 17 | 19.5 |
| 帯の文字 | `clamp(15px,1.6vw,19px)` | 15 | 19 |
| セクションの上の余白 | `clamp(80px,11vw,140px)` | 80 | 140 |
| フッターの上の余白 | `clamp(120px,14vw,180px)` | 120 | 180 |
| ヒーローの列の間 | `clamp(28px,5vw,64px)` | 28 | 64 |
| How の列の間 | `clamp(24px,4vw,56px)` | – | 56 |

変わらない値：
- 本文 17px/1.55、リード文 18px。
- ヒーローの余白 `34px 0 110px`、フッターの内側 `72px 0 36px`。
- 2px の線、4px の影、22px の角。
- ボタンの高さ 50px と 40px。
- ロゴ（24px の文字、30px のアイコン）。

### 9.3 列の数（実測）

| 格子 | 広い | 切り替わり |
|---|---|---|
| ヒーロー | 2 | 900 以下で 1 |
| 見出し | 2 | 860 以下で 1 |
| キャラカード | 3 | 1040 以下で 2、680 以下で 1 |
| 棚 | 6 | 900 以下で 4、560 以下で 3 |
| 遊びのカード | 4 | 1000 以下で 2、600 以下で 1 |
| Superpowers | 2 | 760 以下で 1 |
| How | 2 | 960 以下で 1 |
| API | 2 | 980 以下で 1 |
| Install | 4 | 1100 以下で 2、640 以下で 1 |
| 数字の箱 | 4 | 960 以下で 2（1列にはならない） |
| フッターの呼びかけ | 2 | 820 以下で 1 |

### 9.4 ナビ

- **820px 以下：2段になる**
  - `.nav-in{flex-wrap:wrap;height:auto;row-gap:2px;column-gap:12px;padding:10px 0 6px}`
  - 1段目：左にロゴ、右へ寄せたテーマ切り替え、GitHub ボタン（521px まではラベルつき）。
  - 2段目：リンクが全幅の帯になり、横にスワイプできる。スクロールバーは隠す。各リンクは 14.5px、余白 7×10、高さ 36。
  - ナビの高さは 94〜96px（`scroll-padding-top:96px` とちょうど同じ）。
  - スクロールできる合図は、右端で切れたリンクだけ（390 で「Insta」）。
- **520px 以下**：GitHub は 40×40 のアイコンだけの四角になる。文字は `font-size:0` で見えなくなるが、読み上げ用には残る。テーマボタンは幅 26px（外枠 92×38）。
- **440px 以下**：リンクは 14px、余白 7×6。
- **途中の幅の不具合**（821〜約1227px）
  - 1列のまま縮まないので、はみ出す。
  - 1100 で GitHub ボタンが半分切れる。1000 で消える。860 でテーマ切り替えも消える。
  - はみ出しの量は、1100 で 81px、1000 で 181px、860 で 321px。

### 9.5 390px での各セクション

- **ヒーロー**
  - 1列で積む：リボン → 大ロゴ → h1（34px、3行）→ サブ文 → ボタン → ヒント → コード窓 → 帯。
  - ボタンは約 415px まで横に並ぶ。390 では2段になる。幅いっぱいには伸ばさない。
  - ヒントと呼び出しボタンは行の中で折り返す。
  - 768〜860 では、h1 が1行に収まる（35〜39px）。
  - コード窓は列の幅（342）。文字は 14px のまま。中だけ横スクロールする（390 で 13px、320 で 83px のはみ出し）。
- **大ロゴ**：マスは整数でしか変わらないので、段で大きくなる。

| 幅 | マス | canvas（上の余白を含む） |
|---|---|---|
| 1440 / 1280 | 15 | 1059 × 354（1180 の 90%） |
| 1100 | 14 | 988 × 330 |
| 980〜1040 | 13 | 918 × 307 |
| 900〜960 | 12 | 847 × 283 |
| 860 | 11 | 777 × 260 |
| 768〜820 | 10 | 706 × 236 |
| 700 | 9 | 635 × 212 |
| 640〜680 | 8 | 565 × 189 |
| 560〜600 | 7 | 494 × 165 |
| 520 | 6 | 424 × 142 |
| 440 | 5 | 353 × 118 |
| 360〜390 | 4 | 282 × 94（342 の 82%。左寄せで、右に約 60px 空く） |
| 320 | 3 | 212 × 71 |

  - マスが 7 未満では隙間が 0 になる。スマホではべた塗りの字に見える。押し出しは 2px。
- **帯**：作りは同じで、見える句が減るだけ。
- **キャラカード**：1列で 342×547。住みかは 230px のまま。スニペットは省略記号で切れる。特徴タグは折り返す。
- **大舞台**：スプライトは縮まない。700 以下で3体目を隠す。390 では2体目（ウサギ）が右で切れる。バーは折り返して 101px の高さになる。
- **棚**：3列 × 4段。マスは高さ 150、スプライトは `zoom:.8`。名前のタグは2行に折れる。
- **群衆**：高さ 380 のまま。幅 338 では「PIIXPAL」が詰まり、240体が読めない塊になる。`touch-action:none` なので、この上から始めたスワイプではページがスクロールしない。
- **遊びのカード**：1列。入力欄は 16px なので、iOS がフォーカスで拡大しない。「I'm not a robot」は行全体（302×58）が押せる。
- **Superpowers**：1列で、高さ 260 のまま。中身は固定の px で置いてあるので、390 では「Jump」と「Higher」が右端に斜めに重なる。320 では「Jump」が 12px はみ出して切れる。
- **How**：手順の下にサンドボックスが来る。手順の文の幅は約 232px しかない。住人ボタンは2段になる。
- **API**：表は最低幅が 560px なので、中で横スクロールする。390 では「Default」の列がまるごと隠れ、スクロールの合図もない。パネルのコードの行も右で切れる。
- **Install**：1列。数字の箱は2列のまま（160px の列）。「0 clicks」は2行に折れる。
- **フッター**：h2 は 44px で2行。ボタンは全幅（342×50）。下の段は、ロゴ → 2行に折れるリンク → MIT の行、の順に積む。Boing は scale 4。

### 9.6 押しやすさ（390×844 で実測）

| 部品 | 大きさ | 評価 |
|---|---|---|
| テーマボタン | 26×28 | 小さい |
| GitHub アイコン | 40×40 | – |
| ナビのリンク | 高さ 36 | – |
| 主なボタン（`.btn`） | 高さ 50 | 良い |
| 呼び出しボタン | 64〜78 × 30 | 小さい |
| コピーボタン | 53×29 | 小さい |
| 分段ボタン | 高さ 36 | – |
| 棚の名前リンク | 23〜55 × 11 | とても小さい（マス全体は押せない） |
| フッターのリンク | 高さ 22 | 小さい |
| 入力欄 | 302×45 | 良い |
| 色相スライダー | 200×16 | 小さい |
| ロボットのチェック | 302×58 のラベル | 良い |
| Pix のタッチ用ボタン | 54×54 | 指の端末でだけ出る |

### 9.7 タッチで困ること

- ホバーの効果が `(hover:hover)` で守られていない。タップのあと、浮いたままになることがある。
- カーソル前提の言葉がそのまま残る（「Hover the buttons…」「hover close」「come closer」など）。
- 帯はホバーでしか止まらない。タッチでは止められない。
- ライブラリは、指が触れていない間のタッチの動きを無視する。だからスクロール中に住人が騒がない。

---

## 10. 文章の声

### 10.1 見出し

- 短い2行。それぞれ句点で終わる。
- 型は次のとおり。
  - 短い言い切り：「Tiny roommates. / Each one has a job.」
  - 「Or …」で前のセクションから続ける：「Or just paste a little face.」→「Or bring the whole crowd.」
  - 「They …」で製品を生き物の主語にする：「They notice what you do.」「They leave the page.」
  - 対句：「Two lines of HTML. Zero lines of config.」
  - 三つ並べ：「Free, open source, yours.」
  - 診断から処方へ：「Your website is lonely. Get it a pal.」
- コロンは使わない。疑問符は冗談の「Lights?」だけ。感嘆符は使わない。
- 文頭だけ大文字にする。普段の言葉を使う。強調はヒーローの「live」一語だけ。

### 10.2 リード文

- 2〜4文、約25〜40語。具体的な動詞を使う。
- 短い文の重ねが好き：「Throw them around. Line them up. Fill a stage with hundreds.」
- 並べるときは三つか四つ：「letter outlines, edges, buttons, scroll」。
- 最後は遊びへの一押しの命令で締めることが多い。
  - 「Play with them, then copy the tag.」「Go on, wave at them.」「Grab one and throw it.」「Select text, copy it, hit deploy.」

### 10.3 キャラ紹介の型

1. 一行の肖像：見た目 ＋ おかしな欠点か態度一つ。
   - 「with one very curious antenna」「more energy than sense」「no interest in you」「zero courage」「loves a good button」
2. あなたのページで何をするか：本物の UI の部品に結びついた動詞を並べる。
   - 「Dangles from your nav, swings when you scroll, zips up when you reach for it」
3. あなたへの反応：たいていここがオチ。
   - 「only from a safe distance」「moves somewhere quieter」「goes boing」
- ライブラリの中の文も同じ声：「Mostly harmless, entirely dramatic.」「Famously, completely unbothered.」「like it pays the rent.」「always at 1%. Brave.」

### 10.4 特徴タグ

- ちょうど三つ。小文字。1〜3語。
- 二つは事実、一つは冗談。冗談はたいてい最後（「holds grudges」「gets dizzy」「flips when poked」）。

### 10.5 操作の小さな言葉

- ピクセルの大文字で、短い命令にする：「hover close」「drag + throw」「poke ×3」「come closer」「reach for it」「hover a button」。
- ヒーローのヒントは、キーの形をした動詞を使った小さな命令三つ。
- 説明は `名前 · すること` の型：「peeper · it won't look」「termi + frog · the frog wants your cursor」。

### 10.6 そのほかの癖

- 中黒「·」がこの家の区切り記号。小見出し、`No.01 · crawl`、`1 · 1 · 70`、`Characters · 20`、`MIT · made of tiny squares`。
- 数字は証拠として、気軽に言う：「42 and counting」「20 and counting」「All 23 superpowers」「Meet all 8 pals, incl. Bumble & Shel」「about 106 KB gzipped」。
- 強みは、数字と皮肉な続きで言う：「0 clicks / blocked.」
- 呼びかけは謙虚に：「A star on GitHub is plenty.」
- イギリス綴り（「behaviour」「Recolour」）。
- 感嘆符は「Copied!」だけ。
- ユーモアは、住人の性格（臆病、無関心、根に持つ、元気すぎる）から生まれる。製品自体は自慢しない。

---

## 11. サブページ

### 11.1 共通の作り

- ヘッダーはトップと同じ。今いるページのリンクは `--paper-2` の地になる。
- 左にサイドバー（幅 226）
  - 枠つきの箱に「‹ Hide sidebar [」の切り替え。続いて検索欄「Find a component…」。
  - 平らなリンク：Overview、Install、Pal Maker、Builder、Pals anywhere、Agent pets、GitHub README。
  - 開閉できるグループ。右に Silkscreen で数（Sprites 50、Pals 44、Superpowers 26、3D 6）。その下に Crowd、Pixel type。
  - 選ばれた項目は、インクで塗った錠剤。
  - 開いたグループの中は、色の小さな四角つきの項目。Silkscreen の小見出し（「CHARACTERS」「BEYOND THE PAGE」「PALS WITH JOBS」）で分ける。
- 本文の列
  - Silkscreen のパンくず（「COMPONENTS / PALS」）。
  - 大きな h1（約 72px、780）。言葉の下にライムのマーカー（`.doc-head em`）。
  - 1〜2文のリード（19px）。
  - 枠つきの錠剤の絞り込みチップ。文字には下線（「Characters · 20」「Interactions · 10」「Toys · 6」「Groups · 8」）。
  - 2px のインクの罫。
  - セクションの h2（約 44px）。横に Silkscreen の小さな数。

### 11.2 各ページ

- **components/（Overview）**
  - リード：「130 components, every one a plain web component. One script tag, then copy any tag from these pages into your HTML, React, Vue, Svelte, Astro, Webflow or Framer project.」
  - 3列の分類カード。色つきの絵の枠、名前、数、説明。Sprites 50、Pals 44、Crowd 3、toy box、superpowers、3D。
  - 説明の例：「Small inline characters. Eyes follow the cursor, they blink, breathe, hop and nap. Paste anywhere, like an image.」
- **components/pals.html、powers.html（部品の一覧）**
  - 各項目：h3 の名前、等幅の属性チップ（`pal="bitbug"`）、平易な一文（「A lime beetle that crawls along the real outline of your letters.」）。
  - その下に2列のかたまり。
    - 左：見本のカード（色つきの点の地、2px の枠、4px の影）。
    - 右：暗いコードのパネル。タブは **HTML**（ライムで押された状態）、Single file、No markup、JS、React、shadcn、Vue、Svelte。コピーボタンつき。
  - その下に枠つきの「Options +」の開閉。
  - powers の h1 は「Superpowers」。リードは「Pals that step out of the page, do real interface jobs, or turn your site into a game.」。チップは「Beyond the page · 5 / Pals with jobs · 13 / Play your site · 8」。
- **components/install.html**
  - h1「Install」。リード「Pick whatever suits your site. Nothing to download, no build step, no account. Every option below works on its own.」
  - 「Everything, one tag」（「All 130 components in one file (about 235 KB gzipped)…」）と「npm」（「For projects with a bundler…」）。
  - 全幅の暗いコードにコピーボタン。タブつきのかたまり「React / Next · Vue · Svelte · Anything else」。
- **ui/（Pixel UI）**
  - 同じ骨組み。サイドバーは「GET STARTED」（Introduction、Showcase、Installation、Looks、Palettes）と、グループ（Scenes、Layouts…）。
  - リード：「A component library drawn on the GPU. Backgrounds, heroes, buttons, cards, text effects and form controls, all rendered on a pixel grid and dithered into a palette. 125 components…」
  - 約20の分類チップ。Silkscreen の題がついた三枚の原則カード：**ON THE GPU** / **REAL ELEMENTS** / **POLITE**。
  - 「Scenes 10」の格子。ディザのかかったピクセルの風景の縮小画（Sakura grove、Alpine hills、Sunset lake…）。
- **stage/（「Piixpal Stage · make little plays with your pals」）**
  - ページではなく、全画面の暗い編集アプリ。
  - 上のバー：ロゴ、BETA バッジつきの「STAGE」、作品名「Hello, bug」、Templates、元に戻す・やり直す、「Saved」、Share、ライムの **Export**。
  - 左：「CAST · drag onto the stage」の住人のタイル。「YOUR OWN PAL」（Pal Maker のリンク欄と Add ボタン）。
  - 中央：16:9 のキャンバスにピクセルの野原の背景。ヒントの錠剤「Click a pal to direct it, or drag a new one in from the cast」。その下に録画、時間 `00:02.12 / 00:09.00`、Silkscreen の LOOP、SNAP、GUIDES の切り替え。
  - 右：「SCENE」（形 16:9 / 4:3 / 1:1 / 9:16 / 3:1、長さ）、「BACKDROP」の縮小画（Clear、Paper、Void、Meadow、Sunset、Night、Room、Stage）、「IN THIS SCENE」。
  - 下：「TIMELINE」。住人ごとの段、吹き出しのクリップ（「Oh! Hi there, little bug.」）、効果のチップ（Confetti、Shake、Flash）。
- **その他**（3d.html、make.html「Maker」、builder.html、sprites.html、crowd.html）
  - 同じ骨組みを使う。中身は読み込めなかったので、確認できていない。

---

## 12. 寄せるときに守る芯と、まねてはいけないもの

### 12.1 必ず守る芯（外すと別物になる）

1. **紙とインクと、一点の主役色。**
   - 地は紙（白か温かいベージュ）。文字と線と影は一つのインク色。
   - 主役の色は一つで、少しだけ使う。「押して」の合図と、ブランドの印だけに使う。
   - ほかの色は、小さな四角と色分けだけに使う。広く塗るのは最後の締めの一面だけ。
2. **2px の線と、ぼかしゼロの塊の影。**
   - グラデーションも、ぼかした影もない。
   - 普通の物は下に 4px、特別な一枚だけ右下に 8px の色の影。
3. **床の動かないボタン。**
   - ホバーで −2px・影 6px。押すと +3px・影 1px（50ms）。戻りは行き過ぎるばねで 220ms。
   - 影の下端はいつも同じ位置。
4. **三つの書体の分業。**
   - 重く詰めた見出し（720〜800、字間 −0.04em 前後、行送り 1 以下）。
   - 読みやすい本文（17px/1.55）。
   - ピクセル書体は、数・番号・指示・注釈だけ。大文字で、字間を少し開ける。
5. **ピクセルの飾りは角 0 の四角だけ。** 丸い飾りはない。アイコンも整数の格子で描く。
6. **点の地。** 薄い点の方眼（14〜22px、12〜22%）。ヒーローでは楕円のマスクで端を消す。
7. **ピクセルは段で、体はばねで動く。**
8. **住人は本物の形の上で暮らし、触る前から反応する。** 見出しの字、ボタンの上、ナビの下端。手で位置を決めない。クリックは奪わない。
9. **一つの型をくり返す構成。** 小見出し（四角 ＋ `Topic · qualifier`）→ 2行の大見出し（句点つき）、右に下そろえのリード → 触れる大きな物 → 中央のボタン列。
10. **控えめさ。** 動きを減らす設定では静かな姿勢で止まる。画面の外では眠る。強調は一つだけ。

### 12.2 まねてはいけないもの

- **キャラクターそのもの**
  - Bitbug、Boing、Moss、Lurk、Thread、Pip、Bumble、Shel、Peeper、Beep、Termi、Pix、Pidge、Scrolly、カエル、ロケット、電球、群衆の住人、スプライト（mochi など）。
  - 見た目、ドット絵のデータ、名前、性格の設定、決まった反応（Moss が3回で引っ越す、Lurk がのぞく、など）。
  - Inchly には Inchly の住人を作る。性格と反応も自分で決める。
- **ロゴ**
  - ライムの顔のピクセルアイコン（ファビコンを含む）。
  - 点のない ı を使い、四角い点の一つが跳ねる文字ロゴ。
  - 「piixpal」のピクセル大ロゴ。
  - 作り方（文字をピクセルにして、色の押し出しを重ねる）は参考にしてよい。形と言葉は自分のものにする。
- **文章のコピー**
  - 見出し、リード、キャラの説明、特徴タグ、帯の文句、操作のヒント、数字の箱の言い回し、フッターの「Your website is lonely. Get it a pal.」。
  - 「MIT · made of tiny squares」のような決め台詞。
  - 型（2行・句点、「They …」、対句、三つのタグの最後に冗談）は学んでよい。文そのものは使わない。
- **ほかの人の後ろ盾の見せ方**
  - 「Backed by ▲ Vercel」のリボン。事実でない後ろ盾を表示してはいけない。
- **組み合わせまるごと**
  - ライム `#c6f432` ＋ 紫のフッター `#6b4cff` ＋ Bricolage ＋ Silkscreen ＋ 段々の屋根を全部そろえると、そっくりさんになる。
  - 主役の色か、締めの色の少なくとも一つは自分の色にする。屋根の波も、Inchly らしい形に変える。

### 12.3 まねなくていい弱点

- **dark でライムの上の文字が白くなる。**
  - `.btn-lime` の文字が `var(--ink)` なので、白っぽい文字がライムに乗る（1.12:1）。
  - 手順の番号、Install のタグ、コピーのホバー、マーカーの上の文字も同じ。
  - 対策：明るい色の塗りの上の文字は `#17121f` に固定する。
- **dark でスニペットとロゴの四角が消える。**
  - `#17121f` のスニペットが `#16131d` のカードに乗ると 1.0:1。ロゴの四角も 1.06:1。
  - フッターの屋根の暗い線も消える。
  - 対策：明るい面か枠を足す。屋根の線をテーマに合わせる。
- **`theme-color` が `#f3eee3` で固定。** テーマごとに変える。OS の変化も追う。
- **820〜1227px でナビがはみ出し、テーマ切り替えと GitHub が押せなくなる。**
  - 約 1180px で折りたたむ。横スクロールの帯には、端のフェードか矢印をつける。
- **押す所が小さい。**
  - テーマボタン 26×28、コピー 53×29、呼び出し 30 高、フッターのリンク 22 高、棚の名前 11 高。
  - 44px 以上にする。棚はマス全体を押せるようにする。
- **フォーカスの弱い所。**
  - 入力欄のライムの輪は、白の上で 1.28:1、紙の上で 1.11:1。
  - `clip-path` のリボンは、フォーカスの輪まで切れて見えない。
  - 対策：強い輪にする。リボンは外側の箱に輪をつける。
- **読みにくい小さな文字。**
  - コード窓のコメント `#7d7490` は 4.18:1。フッターのリンク（.85）は 4.14:1。MIT の行（.75）は 3.57:1。住みかのヒントは約 4.0:1。FRAMEWORKS のタグは 3.59:1。
- **群衆の舞台がスマホのスクロールを奪う**（`touch-action:none`）。
  - `pan-y` にする。長押しでつかむ。スマホでは数か高さを減らす。
- **固定 px の配置**（Superpowers のボタン）**と、スマホの表**（隠れる列）。
  - 割合で置く。表は縦に積むか、スクロールの合図をつける。
- **動きを減らす設定で、ロゴの点が止まらない。** 止める。
- **ホバーの効果を `(hover:hover)` で守っていない。** タップで浮いたままにならないようにする。
- **そのほか**
  - スキップリンクがない。
  - コピーの結果が読み上げに伝わらない（`aria-live` がない）。
  - 「Stage」のリンクが「Stagenew」と読まれる（バッジの前に空白がない）。

### 12.4 日本語のアプリに移すときの注意（目安）

- Bricolage Grotesque と Silkscreen には日本語の字がない。
  - 日本語の見出しと本文には、太さを細かく選べる和文ゴシックを合わせる。
  - Bricolage は英数字だけに使う。
- 和文の見出しに −0.045em と行送り .98 は、きつすぎることがある。
  - 字間は軽めに詰める。行送りは少し広げて、和文で読める値を探す。
- ピクセル書体の役目（数・番号・指示）は、英数字のラベルに限る。
  - 例：「No.01」「LV.3」「×3」。
  - 日本語でピクセル感がほしいときは、四角い飾りと点の地で出す。
- 文章の声は、型だけを日本語に移す。
  - 短い2行で、句点で終わる見出し。
  - 製品やキャラを主語にする。
  - 三つの特徴の最後に、小さな冗談を一つ。
  - 最後は、遊びへの一押しの命令で締める。