# 設定の反映手順と app.json のチェックリスト

## 1. パッケージを入れる

```bash
# テスト・整形・pre-commit・撮影
npx expo install jest-expo jest @types/jest -- --save-dev
npm i -D prettier lefthook playwright
npx playwright install chromium
npx lefthook install

# lint の初期設定（eslint-config-expo が入る）
npx expo lint

# 言語の判定（Intl の既定に頼らない）
npx expo install expo-localization

# 開発用ビルドを使うなら
npx expo install expo-dev-client
```

## 2. package.json に足す
`setup/package-scripts.json` の `scripts` と `jest` を、package.json にマージする。

## 3. .gitignore に足す
`setup/gitignore-append.txt` の行を追記する。

## 4. app.json に最初から入れる項目
あとから入れると手戻りになったものです。`{ }` は brief.md で決めた値に。

| 項目 | 例 | なぜ最初に |
| --- | --- | --- |
| `name` / `slug` / `scheme` | brief.md の値 | 改名すると識別子・保存キー・ストア情報まで影響する |
| `ios.bundleIdentifier` / `android.package` | `com.xxx.yyy` | 後から変えると別のアプリ扱いになる |
| `orientation` | `"portrait"` | 縦固定かどうかでレイアウトの前提が変わる |
| `userInterfaceStyle` | `"light"` / `"automatic"` | ダークモード対応の有無 |
| `backgroundColor`（ルート） | テーマの背景色 | 起動直後や遷移時のちらつき |
| `ios.supportsTablet` | `false` / `true` | iPad での表示の前提 |
| `ios.config.usesNonExemptEncryption` | `false` | 提出のたびに聞かれる |
| `ios.privacyManifests` | 使う API の申告 | 審査で求められる |
| `android.adaptiveIcon.backgroundColor` | テーマの色 | アイコンの見え方 |
| `plugins` | `expo-localization`、`expo-system-ui`、`expo-status-bar`、`expo-navigation-bar` など | 言語・ステータスバー・ナビゲーションバーの色 |
| `plugins` の `expo-localization` | `supportedLocales`（日本語を含める） | 日本語の端末で英語が出る問題（Lento） |
| `experiments.typedRoutes` | `true` | 遷移先の書き間違いを型で防ぐ |

## 5. EAS
```bash
npm i -g eas-cli
eas login
eas init         # projectId が app.json に入る
```
`eas.json` はこのテンプレートのものを使う。`ascAppId` は App Store Connect でアプリを作ったあとに入れる。
無料プランは iOS ビルドの月の回数に上限がある。JS だけの変更はビルド不要（Expo Go / 開発用ビルドで確かめる）。
