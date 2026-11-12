# 経済ニュース解説動画（Remotion）

このフォルダには動画が3本あります。

| 動画 | 見た目 | 資料 |
| --- | --- | --- |
| `release/denkidai-route.mp4` | 写真と地図のドキュメンタリー風（最新） | [`ROUTE.md`](./ROUTE.md) |
| `release/denkidai-line.mp4` | 写真ドキュメンタリー風（第1版） | [`LINE.md`](./LINE.md) |
| `release/nikkei-ai-shock.mp4` | 図とグラフ中心（初版） | [`YOUTUBE.md`](./YOUTUBE.md) |

雰囲気の比較用ページは `moods/index.html` です。以下は初版の動画の説明です。

「日経平均 3,643円安 ―『AI規制ショック』の正体」を約4分43秒で解説する YouTube 向け動画のソース一式です。

- 完成動画: `release/nikkei-ai-shock.mp4`（1920×1080 / 30fps / ナレーション・字幕入り）
- サムネイル: `release/thumbnail.png`（1280×720）
- 投稿用のタイトル・概要欄・チャプター: [`YOUTUBE.md`](./YOUTUBE.md)

## 使い方

```bash
npm install
npm run dev        # Remotion Studio でプレビュー
npm run render     # release/nikkei-ai-shock.mp4 を書き出し
npm run thumbnail  # release/thumbnail.png を書き出し
```

## 構成

| ファイル | 役割 |
| --- | --- |
| `src/script.json` | 台本。`text` が字幕、`say` が読み上げ用テキスト |
| `src/voice-manifest.json` | 各行の音声の長さ（秒）。`scripts/tts.py` が生成 |
| `src/timeline.ts` | 音声の長さからシーンと字幕のタイミングを計算 |
| `src/scenes/*.tsx` | 10個のシーン（映像） |
| `src/components/Narration.tsx` | 音声と字幕をタイムラインに配置 |
| `src/data.ts` | チャート用の日経平均終値 |
| `public/voice/*.m4a` | 行ごとのナレーション音声 |

映像の動きは台本の行（`h1`, `w3` など）の開始フレームに同期しているので、
台本や音声を差し替えても映像は自動で追従します。

## ナレーションを作り直す

音声は [Kokoro](https://github.com/hexgrad/kokoro)（Apache-2.0）で生成しています。
商用利用可・クレジット表記不要のため、YouTube にそのまま使えます。

```bash
# Python 3.10〜3.12
pip install "kokoro>=0.9.4" "misaki[ja]" soundfile
python -m unidic download
npm run voice               # 全行を生成
python scripts/tts.py h1 w3 # 指定した行だけ生成
```

別の音声（VOICEVOX、自分の声など）を使う場合は、`public/voice/<行ID>.m4a` を置き換えて
`python scripts/tts.py --manifest-only` を実行すると、長さだけ再計測されます。

## データと出所

数値は 2026年11月10日の取引終了時点のものです。出所は `YOUTUBE.md` の概要欄にまとめています。
この動画は情報提供を目的としたもので、投資の勧誘を目的としたものではありません。

フォントは Noto Sans JP（SIL Open Font License）です。
