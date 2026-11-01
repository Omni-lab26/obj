# App Store の掲載内容

App Store Connect の「App 情報」「価格および配信状況」「App のプライバシー」と、バージョンのページに貼る文面です。
日本語を主言語にし、英語（U.S.）をローカリゼーションとして追加します。文字数は App Store の上限に収まるようにしてあります。

---

## 日本語

**名前**（30文字まで）

```
Lento — 動く背景の時計
```

> Lento（レント）は音楽用語で「ゆっくりと」。ホーム画面に出る名前は app.json の `name` の「Lento」だけです。もし「Lento — 動く背景の時計」が使えなければ「Lento 置き時計」「Lento: 動く背景と時計」などに。

**サブタイトル**（30文字まで）

```
静かに流れる、置き時計
```

**プロモーションテキスト**（170文字まで・審査なしで後から変更可）

```
鯉の泳ぐ夜の池、サメの浅瀬、すりガラス越しの通行人。ゆっくり動く背景の上に、時計・タイマー・ストップウォッチを置いておけるアプリです。
```

**説明**（4000文字まで）

```
Lento（レント）は、動く背景の上に大きな時計を置いておくためのアプリです。机の上やベッドサイドに立てて、眺めていられる時計を目指しました。

■ 背景
・夜の鯉：黒い池を文字でできた錦鯉が泳ぎ、蓮の葉が浮かびます。タップするとエサが落ちて、鯉が寄ってきます。鯉のすぐそばをタップすると、驚いて逃げます。
・浅瀬のサメ：白い浅瀬をシュモクザメやトラフザメが回遊します。
・通りすがり：すりガラスの床を下から見上げたように、靴底だけがくっきり見える人たちが行き交います。タップすると驚いて走り去ります。
・白紙：何もない一枚の紙。

■ 時計・タイマー・ストップウォッチ
・数字を左右にスライドして切り替え。
・タイマーは目盛りをなぞって時間を合わせ、よく使う時間を5つまで保存できます。数字はスロットのように回ります。
・ストップウォッチは数字をタップで開始・停止、長押しでリセット。

■ 自分好みに
・数字の位置と大きさを自由に変えられます（1本指で移動、2本指でつまんで拡大縮小）。縦向きと横向きで別々に覚えます。
・8種類のフォント、好きな色、日付・秒・24時間表示の切り替え。
・画面のどこかを長押しすると、時計を隠して背景だけにできます。

■ そのほか
・画面はスリープしません。置き時計としてそのまま使えます。
・iPhone と iPad、縦向き・横向きに対応。
・日本語と英語に対応。
・アカウント登録なし、広告なし、データの収集なし。すべて端末の中で動き、インターネットにもつながりません。
```

**キーワード**（100文字まで・カンマ区切り）

```
時計,置き時計,卓上時計,タイマー,ストップウォッチ,鯉,アクアリウム,インテリア,デスク,ベッドサイド,大きい時計,スクリーンセーバー,レント
```

**プライバシーポリシー URL / サポート URL**（どちらも同じ）

```
https://omni-lab26.github.io/lento/
```

> GitHub Pages で公開済み（リポジトリ `Omni-lab26/lento` の `index.html`。中身は `store/privacy.html` と同じ）。文面を変えたら、両方を更新してください。

**カテゴリ**：プライマリ「ユーティリティ」、セカンダリ「ライフスタイル」

**著作権**：`2026 omni-lab26`（表記はお好みで）

---

## English (U.S.)

**Name**

```
Lento — Clock on Living Scenes
```

**Subtitle**

```
A quiet clock on living scenes
```

**Promotional Text**

```
Koi in a pond at night, sharks in the shallows, passersby seen through frosted glass: slow, living backgrounds with a clock, timer and stopwatch on top.
```

**Description**

```
Lento puts a large clock over a slowly moving scene: something to stand on your desk or bedside table and simply look at.

SCENES
• Night koi: koi drawn in type swim a dark pond among lotus leaves. Tap to drop food and they gather; tap right by one and it darts away.
• Sharks in the shallows: hammerheads and a leopard shark circle a bright sandy bay.
• Passing by: people seen from under a frosted glass floor, only their soles sharp. Tap and they startle and run off.
• Blank: a plain sheet of paper.

CLOCK, TIMER, STOPWATCH
• Slide the digits sideways to switch.
• Set the timer by running a finger along its rulers, and keep up to five favourite lengths. The digits roll like a slot machine.
• Tap the stopwatch to start or stop, hold to reset.

MAKE IT YOURS
• Move the digits anywhere and resize them: drag with one finger, pinch with two. Upright and on its side are remembered separately.
• Eight fonts, any colour, and the date, seconds and 24-hour time on or off.
• Hold anywhere to hide the clock and leave just the scene.

ALSO
• The screen stays awake, so it works as a desk clock.
• iPhone and iPad, upright or on its side.
• English and Japanese.
• No account, no ads, no data collected. Everything runs on the device, with no internet connection.
```

**Keywords**

```
clock,desk clock,bedside,timer,stopwatch,koi,aquarium,ambient,screensaver,big clock,minimal,calm
```

**Category**: Primary Utilities, secondary Lifestyle

---

## 年齢制限（App Store Connect の質問）

すべて「なし」と答えると **4+** になります（暴力・性的表現・ギャンブル・ウェブ閲覧・ユーザー作成コンテンツなどはどれも該当しません）。

## App のプライバシー

「データを収集していますか？」→ **いいえ**。これで「データの収集なし」と表示されます。
アプリは通信も解析ツールも広告も使っていません（設定は端末の中にだけ保存されます）。

## 輸出コンプライアンス

app.json に `usesNonExemptEncryption: false` を入れてあるので、アップロードのたびの質問は出ません。

## 審査メモ（App Review への備考）

```
No account or sign-in is needed. Things to try:
- Slide the digits left or right to switch between clock, timer and stopwatch.
- Tap the pen at the top left to move (one finger) and resize (pinch) the digits.
- Use ‹ › at the bottom to change the background scene. In the koi and shark scenes, tap the water to drop food, or tap right by a fish to startle it.
- Hold anywhere on the screen to hide or show the clock.
The app keeps the screen awake on purpose, so it can be used as a desk clock.
```

## スクリーンショット

`store/screenshots/` にあります（JPEG）。App Store Connect にはこちらを入れます。

| 枠 | サイズ | フォルダ |
| --- | --- | --- |
| iPhone 6.9インチ | 1320 × 2868 | `iphone-6.9/ja`, `iphone-6.9/en` |
| iPad 13インチ | 2064 × 2752 | `ipad-13/ja`, `ipad-13/en` |

アイコンと同じ生成りの紙とインクで、上にフェルマータと見出し、下にアプリの画面を置いています。

| # | 画面 | 見出し（日本語） | 見出し（英語） |
| --- | --- | --- | --- |
| 1 | 鯉と時計 | 眺めていられる、置き時計 | A clock you can simply watch |
| 2 | サメとタイマー | 目盛りをなぞって、タイマー | Set the timer by touch |
| 3 | 通りすがりとストップウォッチ | ストップウォッチも、静かに | A quiet stopwatch, too |
| 4 | 設定 | フォントも色も、好みのままに | Your font, your colour |
| 5 | 位置と大きさの編集 | どこにでも、どんな大きさでも | Anywhere, any size |

アプリの画面だけの元画像は `screenshots/raw/` にあります。ウェブ版から撮ったもので、ぼかしの質感などは実機のほうがきれいです。

作り直すときは、次の2つを順に実行します。
1. ウェブ版を書き出して `localhost:8765` で配信し、`node store/tools/shots.cjs` を実行すると、元画像（`raw/`）を撮ります。
2. `NOTO_SERIF_JP=<Noto Serif JP の ttf> python3 store/tools/frame.py` を実行すると、見出し付きに組みます。見出しの文言は `frame.py` の中にあります。
