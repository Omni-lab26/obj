# App Store に出すまで

## このリポジトリでできていること

- **app.json**
  - バンドル ID `com.omnilab.lento`（Android も同じ）
  - iPad 対応、縦横4方向
  - 暗号化なしの申告
  - プライバシーマニフェスト（トラッキングなし・収集データなし）
- **アイコン一式**
  - iOS 用 1024px
  - Android のアダプティブアイコン（前景・背景・モノクロ）
  - スプラッシュ画面とファビコン
- **eas.json**
  - development / preview / production の3つのビルド設定
  - ビルド番号は EAS が管理し、production ビルドのたびに自動で上がる
- **掲載文**: `metadata.md`（日本語・英語、キーワード、年齢制限、プライバシーの回答、審査メモ）
- **プライバシーポリシー**: `privacy.html`（日英、そのまま公開できる1ページ）
- **スクリーンショット**: `screenshots/`（iPhone 6.9インチと iPad 13インチ、日英各5枚）

## 自分でやること

1. **ID を決める**
   - バンドル ID `com.omnilab.lento` でよいか確認します。App Store Connect に登録すると変えられません。
   - 変える場合は、app.json の `ios.bundleIdentifier` と `android.package` を書き換えます。
2. **Apple Developer Program に登録する**
   - https://developer.apple.com/programs/ から申し込みます（年 99 ドル）。
   - 個人なら数時間から1〜2日で使えるようになります。
3. **プライバシーポリシーを公開する**（GitHub Pages）
   - 公開リポジトリ `Omni-lab26/lento` に、`privacy.html` を `index.html` として置きます。
   - そのリポジトリの Settings → Pages で、Branch を `main`、フォルダを `/ (root)` にして Save します。
   - **公開済み**: https://omni-lab26.github.io/lento/ 。これを「プライバシーポリシー URL」と「サポート URL」の両方に使います。
4. **Expo のアカウントでログインし、プロジェクトをつなぐ**（`ambient` フォルダで実行）
   ```sh
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```
   `init` を実行すると、app.json に `extra.eas.projectId` と `owner` が書き加えられるので、コミットしてください。
5. **iOS のビルドを作る**（クラウドでビルドするので Mac は不要です）
   ```sh
   npx eas-cli@latest build --platform ios --profile production
   ```
   - 途中で Apple ID でのログインを求められます。
   - 証明書とプロビジョニングプロファイルは、EAS が自動で作ってくれます。
6. **App Store Connect にアップロードする**
   ```sh
   npx eas-cli@latest submit --platform ios --latest
   ```
   - 初回はアプリの登録（名前・言語・バンドル ID・SKU）も一緒に行えます。
   - アップロード後、10〜30分ほどで TestFlight に出ます。
7. **TestFlight で実機確認する**
   - 次の点をひと通り確かめます。
     - ぼかしの見え方
     - 数字の拡大縮小
     - 回転
     - タップで驚く動き
     - スリープしないこと
8. **App Store Connect で掲載内容を入れて審査に出す**
   - **まとめて流し込めるもの**：`ambient` フォルダで `npx eas-cli@latest metadata:push` を実行します。`store.config.json` の内容が App Store Connect に入ります。
     - 入るもの：日英の名前・サブタイトル・プロモーションテキスト・説明・キーワード、サポート URL とプライバシーポリシー URL、カテゴリ、年齢制限の質問（すべて「なし」）、著作権、審査メモ
     - 文面を変えるときは、`store.config.json` を直してもう一度 push します。App Store Connect の画面で直した場合は、先に `npx eas-cli@latest metadata:pull` で取り込んでください（push で上書きしてしまわないように）。
   - **手で入れるもの**（EAS Metadata は扱えません）：
     - スクリーンショット：`screenshots/` から、日本語と英語それぞれに iPhone 6.9インチと iPad 13インチを入れます。
     - App のプライバシー：「データを収集していない」を選びます。
     - 価格および配信状況：価格と配信する国を決めます。
     - 審査の連絡先：名前・メール・電話番号を入れます。
     - ビルド：いちばん新しいビルド番号を選びます。
   - 最後に「審査に提出」を押します。審査は通常 1〜3日です。

## 気をつけること

- **名前の重複**（2026年11月1日に App Store を検索した結果）
  - 「Lento」だけの名前は、すでに別のアプリ（ビジネス系）が使っています。App Store の名前は他と完全に同じにはできないので、「Lento」単独では登録できません。
  - 「Lento: 〜」という名前のアプリもいくつかあります（ブレスレット作り、長時間露光カメラ、呼吸法、カロリー計算、スマホ依存対策など）。どれも時計ではないので、「Lento — 動く背景の時計」のように後ろに言葉を足せば登録できる見込みです。
  - ホーム画面に出る名前は「Lento」のままで問題ありません（重複のチェックは App Store の名前だけです）。
  - もし使えなければ、「Lento 置き時計」「Lento: 動く背景と時計」などにします。名前は App Store Connect でアプリを登録するときに決まります。
- **商標**
  - ネットで探した範囲では、日本でアプリ（第9類・第42類）として「Lento」を登録している例は見つかりませんでした。ただし特許庁のデータベースそのものは確認できていません。
  - 心配なら [J-PlatPat](https://www.j-platpat.inpit.go.jp/) の「商標検索」で「LENTO」「レント」を、区分 9・42 で調べてください（無料）。
- **最低限の機能（審査ガイドライン 4.2）**
  - 時計アプリはここで止められることがあります。
  - その場合は、タイマー・ストップウォッチ、動く背景、位置や大きさの編集があることを審査メモで伝えてください（`metadata.md` の審査メモに書いてあります）。
- **Android（Google Play）に出すとき**
  - 同じ eas.json で `npx eas-cli@latest build --platform android --profile production` を実行します。
  - Play Console では、データ セーフティを「データの収集・共有なし」と答えます。
