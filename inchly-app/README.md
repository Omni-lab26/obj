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

Expo Go が対応する SDK とプロジェクトの SDK が合っていません。App Store / Google Play の Expo Go を最新にしてから、
このフォルダで `npx expo install --fix` を実行してください（Expo Go 側の SDK が上がったときも同じ手順です）。

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

共通部品は `src/ui/`、色と動きの定数は `src/theme.ts`、サンプルデータは `src/data.ts`、
状態（タイマー・ToDo・フォローなど）は `src/store.ts` にあります。

## 操作のポイント

- 下の真ん中のボタンでタイマーを開く。勉強中はタブの上に「いま勉強中」のバーが出て、押すと操作が広がる
- タイマーは右へスライドして記録 → レシートが印刷されるように出てくる
- 草・グラフは指で押したままなぞると、その日の時間が出る
- お知らせは右スワイプで既読、左スワイプで削除（元に戻せる）
- 上から出る通知は、重なっているところを押すと広がる
- 定員の ＋／− は押し続けると速く変わる
- 大学検索で2校以上チェックすると、比較のトレイが出る

## Expo Go で動かない機能について

ロック画面や iPhone の Dynamic Island に勉強時間を出す機能（Live Activities）は、Expo Go では作れません。
開発ビルド（`eas build --profile development`）が必要なので、このモックではアプリ内の「いま勉強中」バーで代わりにしています。
