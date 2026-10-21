# Inchly（Expo アプリ）

勉強時間を草として積み上げ、仲間と一緒に勉強する学習コミュニティアプリのモック実装です。
Expo SDK 57 / Expo Router / React Native。App Store 版の Expo Go が対応している SDK に合わせています。データはすべてサンプルで、サーバーにはつながっていません。

## スマホで見る（Expo Go）

1. スマホに **Expo Go** を入れる（App Store / Google Play）。
2. パソコンに Node.js（20 以上）を入れて、このフォルダで:

   ```bash
   cd inchly-app
   npm install
   npx expo start
   ```

3. ターミナルに出る QR コードを読み取る。
   - iPhone: 標準のカメラで読み取る → Expo Go で開く
   - Android: Expo Go の「Scan QR code」で読み取る

   パソコンとスマホは同じ Wi-Fi につないでください。会社や学校の Wi-Fi などでつながらないときは
   `npx expo start --tunnel` を試してください（初回は Expo アカウントへのログインを求められます）。

ブラウザで見るだけなら `npx expo start --web`。

### 「Project is incompatible with this version of Expo Go」と出たら

Expo Go が対応する SDK とプロジェクトの SDK（いまは 57）が合っていません。まず App Store / Google Play で Expo Go を最新にしてください。
それでも出る場合は、Expo Go の対応 SDK が上がっています。このフォルダで `npx expo install expo@latest --fix` を実行すると、プロジェクトもその SDK に上がります。

## 画面

| タブ / 画面 | ファイル |
| --- | --- |
| ホーム（今日の勉強・ToDo・草・締切） | `src/app/(tabs)/index.tsx` |
| 記録（週・月グラフ、科目、1年の草、偏差値） | `src/app/(tabs)/records.tsx` |
| みんな（いま勉強中・ランキング・投稿・グループ） | `src/app/(tabs)/community.tsx` |
| マイページ（プロフィール・カード・フォロー） | `src/app/(tabs)/me.tsx` |
| タイマー（中央の再生ボタン） | `src/app/timer.tsx` |
| グループ（チャット・イベント・共有） | `src/app/group/[id].tsx` |
| グループを作る / イベントを企画 | `src/app/create-group.tsx` / `src/app/plan-event.tsx` |
| お知らせ / さがす | `src/app/notifications.tsx` / `src/app/search.tsx` |

共通部品は `src/ui/`、色・文字サイズ・影・動きの定数は `src/theme.ts`、サンプルデータは `src/data.ts`、
状態（タイマー・ToDo・フォローなど）は `src/store.ts` にあります。

## デザイン

- **フォント**: Apple のシステムフォント（英数字は SF Pro、日本語はヒラギノ角ゴ）。iPhone では何も読み込まずにそのまま使い、
  20pt 以上は SF Pro Display、それ未満は SF Pro Text に切り替わります。数字は等幅（tabular）で、カウンターが揺れません。
  Android では Roboto になります。
- **配色**: うすい青みのグレーの地に白いカード、文字とメインのボタンは紺に近い黒。緑は勉強と「増えた」数字、青は操作、
  オレンジ・赤は締切と足りない分。科目の色はグラフや小さな点にだけ使います（`src/theme.ts` / `src/data.ts`）。
- **大きさ**: ひとつの画面で大きいのは数字ひとつだけ（32pt）。カードの数字は 24pt、見出し 15pt、本文 14pt、補足 11〜12pt。
  線は細く（髪の毛線）、角丸は 16 / 12 で統一。小さなボタンも押せる範囲は 44pt 以上あります。
- **スタンプ**: `src/ui/Sticker.tsx`。はっきりした色、太い白フチ、やわらかい影のポップなシール。
  グループのチャット（下のハートからスタンプを送れる）、お知らせ、「役に立った」、記録したときのスタンプ、ランキングの上位などで使っています。

## 操作のポイント

- 下の真ん中のボタンでタイマーを開く。勉強中はボタンが「● N分」に変わり、ホームのカードにも勉強中の行が出る
- ホームの今日のバー（科目ごとの色分け）は、押したままなぞるとその科目の時間が出る
- 黒い「日連続」のカプセルを押すと炎がはねる
- グループのチャットでは、入力欄の左のハートでスタンプを選べる
- タイマーは右へスライドして記録 → レシートが印刷されるように出てきて、記録するとスタンプが押される
- 記録の棒グラフ（bencho の stacked bars）: なぞると1本が囲まれてほかが薄くなり、内訳が横に出る。日／週で伸び直す。赤は目標に足りなかった分
- 偏差値のカード（bencho の pull）: 線をなぞるとその週の日付と値が小さなタグで出る。3か月／半年／1年で切り替え。ページの一番上でカードを下に引くと更新
- タイマー（bencho の time scrubber）: ルーラーをドラッグ・はじいて残り時間を決める。動いている間は残り時間に合わせて流れる
- 数字（bencho の rolling counter）: 桁ごとに回って少し行き過ぎて止まる。定員の ＋／− は長押しで加速、数字を上下にドラッグしてもはじける
- 草は指で押したままなぞると、その日の時間が出る
- お知らせは右スワイプで既読、左スワイプで削除（元に戻せる）
- 上から出る通知は、重なっているところを押すと広がる
- 大学検索で2校以上チェックすると、比較のトレイが出る

## Expo Go で動かない機能について

ロック画面や iPhone の Dynamic Island に勉強時間を出す機能（Live Activities）は、Expo Go では作れません。
開発ビルド（`eas build --profile development`）が必要なので、このモックではタブの真ん中のボタンと、ホームの「勉強中」の行で代わりにしています。
