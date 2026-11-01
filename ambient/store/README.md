# App Store に出すまで

## このリポジトリでできていること

- **app.json**
  - バンドル ID `com.omnilab.ambient`（Android も同じ）
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
   - バンドル ID `com.omnilab.ambient` でよいか確認します。App Store Connect に登録すると変えられません。
   - 変える場合は、app.json の `ios.bundleIdentifier` と `android.package` を書き換えます。
2. **Apple Developer Program に登録する**
   - https://developer.apple.com/programs/ から申し込みます（年 99 ドル）。
   - 個人なら数時間から1〜2日で使えるようになります。
3. **プライバシーポリシーを公開する**
   - `privacy.html` の `you@example.com` を、問い合わせ先のメールアドレスに書き換えます。
   - 誰でも見られる URL で公開します。GitHub Pages、Notion の公開ページ、自分のサイトなど、どこでもかまいません。
   - この URL を「プライバシーポリシー URL」と「サポート URL」に使います。
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
   - `metadata.md` の文面をコピーします。
   - スクリーンショットは `screenshots/` から入れます。
   - App のプライバシーは「データを収集していない」を選びます。
   - 年齢制限は全部「なし」で 4+ になります。
   - 価格を決めます。
   - 審査は通常 1〜3日です。

## 気をつけること

- **名前の重複**
  - 「Ambient Clock」がすでに使われていたら、別の名前にします。例: 「Ambient Clock — 動く背景の時計」「Ambient: Desk Clock」など。
  - 名前は App Store Connect でアプリを登録するときに決まります。
- **最低限の機能（審査ガイドライン 4.2）**
  - 時計アプリはここで止められることがあります。
  - その場合は、タイマー・ストップウォッチ、動く背景、位置や大きさの編集があることを審査メモで伝えてください（`metadata.md` の審査メモに書いてあります）。
- **Android（Google Play）に出すとき**
  - 同じ eas.json で `npx eas-cli@latest build --platform android --profile production` を実行します。
  - Play Console では、データ セーフティを「データの収集・共有なし」と答えます。
