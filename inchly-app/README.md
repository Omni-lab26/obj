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

Apple らしさの定義と実装ルールは [`docs/design/apple-feel.md`](../docs/design/apple-feel.md) にまとめています。要点：

- **ライトのみ**。iOS のシステム色（地 `#F2F2F7`、白いグループ、黒い文字、髪の毛線）と、押せるものに使う緑ひとつ。
- **Liquid Glass**：タブバー、上のボタン、セグメント、シート、通知、チャットの入力欄、タイマーの操作だけがガラス。
  iOS 26 では本物（`expo-glass-effect`）、それ以外はぼかしと半透明で同じ見た目（`src/ui/Glass.tsx`）。中身にはガラスを使いません。
- **文字**：SF Pro とヒラギノ。iOS のテキストスタイル（大見出し 34 / 本文 17 / 補足 13）。大きい数字は時計アプリと同じ細い数字。
- **アイコン**：iPhone では SF Symbols（`expo-symbols`）。
- **シグネチャ**：尺取り虫の「インチ」と定規。スタンプはすべてインチ（`src/ui/Sticker.tsx`）。今日のバーの先にもいます。

## 操作のポイント

- タブバーの右の丸いガラスボタンでタイマーを開く。勉強中はボタンに経過分数が出て、ホームにも勉強中の行が出る
- ホームの今日のバー（科目ごとの色分け）は、押したままなぞるとその科目の時間が出る
- グループのチャットでは、入力欄の左のインチのボタンでスタンプを選べる
- タイマーは時計アプリと同じ2つの丸いボタン。左の「記録」で記録のシートが開き、記録するとインチのスタンプが押される
- 記録の棒グラフ（bencho の stacked bars）: なぞると1本が囲まれてほかが薄くなり、内訳が横に出る。日／週で伸び直す。赤は目標に足りなかった分
- 偏差値のカード: 線をなぞるとその週の値が出る。3か月／半年／1年で切り替え
- タイマー（bencho の time scrubber）: ルーラーをドラッグ・はじいて残り時間を決める。動いている間は残り時間に合わせて流れる
- 数字（bencho の rolling counter）: 桁ごとに回って少し行き過ぎて止まる。定員の ＋／− は長押しで加速、数字を上下にドラッグしてもはじける
- 草は指で押したままなぞると、その日の時間が出る
- お知らせは右スワイプで既読、左スワイプで削除（元に戻せる）
- 上から出る通知（ガラスのバナー）は、重なっているところを押すと広がる
- 大学検索で2校以上チェックすると、比較のトレイが出る

## Expo Go で動かない機能について

ロック画面や iPhone の Dynamic Island に勉強時間を出す機能（Live Activities）は、Expo Go では作れません。
開発ビルド（`eas build --profile development`）が必要なので、このモックではタブの真ん中のボタンと、ホームの「勉強中」の行で代わりにしています。
