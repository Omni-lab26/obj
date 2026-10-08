# 生命の軌跡 — 地球が紡いだ奇跡

地球の誕生から現在の自然までを、実写映像と音楽で描く短編映像のプロジェクト。
Remotion（編集・合成）、FFmpeg（素材の整形・書き出し）、Pexels API（素材検索）、librosa（音楽解析）で作る。

- 企画・構成・音楽との対応: [docs/concept.md](docs/concept.md)
- 科学的な根拠と出典: [docs/science.md](docs/science.md)
- 素材一覧とクレジット: [docs/credits.md](docs/credits.md)（`docs/assets.csv` も同内容）
- カットごとの時刻表（音楽なし版に曲を付けるときの合わせ位置）: [docs/timing_sheet.md](docs/timing_sheet.md)
- ショットリスト: [data/shots.json](data/shots.json)

## フォルダ構成

```
data/shots.json        ショットリスト（章・内容・検索語・目安秒数・同期・つなぎ・環境音・文字）
data/config.json       全体設定（fps、解像度、曲の開始位置、章と曲の対応、トーン、音量）
data/selects.json      ショットごとの採用素材と調整（使い始め位置、速度、切り出し、色、手ぶれ補正）
data/manifest.json     取得した素材の記録（取得元URL・作者・ライセンス・解像度・ハッシュ）
data/music.json        曲の解析結果（拍・アクセント・構造・音の密度）
scripts/               パイプライン（下記）
src/                   Remotion の作品（Film = 1080p、Film4K = 4K）
src/data/edl.json      生成されたタイムライン（Remotion はこれを読む）
public/clips/          整形済み素材（生成物）
public/audio/          曲（各自で配置）とミックス（生成物）
work/                  候補・比較シート・元素材・環境音（生成物）
out/                   書き出した動画と品質確認（生成物）
```

`public/clips`、`public/audio`、`work`、`out` は容量が大きいため Git に含めない。
`make fetch` 〜 `make render` で再生成できる。

## 準備

```bash
npm ci
pip3 install -r requirements.txt     # librosa, numpy, scipy, soundfile, pyloudnorm, requests, fonttools, matplotlib
# ffmpeg / ffprobe / ImageMagick（montage, convert）が必要
export PEXELS_API_KEY=...            # https://www.pexels.com/api/ で無料発行（任意で PIXABAY_API_KEY も）
```

曲ファイル（権利を確認したもの）は `public/audio/music.wav` に置く（`.flac` `.m4a` `.mp3` も可）。
置かない場合は、仮の拍グリッドで組み、音楽なし版だけを書き出す。

## 制作の流れ

```bash
make fetch      # 1. 素材の検索 → work/sheets/<ショット>.jpg に候補の比較シート → 仮選定 → ダウンロード
make analyze    # 2. 曲の解析（data/music.json, docs/music_analysis.png）
make conform    # 3. タイムライン生成 → 素材を 24fps / 1920x1080 / 共通トーンに整形
make audio      # 4. 環境音の合成とミックス（曲入り・音楽なし）
make render     # 5. 書き出し → 品質確認（out/qc/, docs/qc_*.md）
make conform4k render4k   # 4K 版（全ショットが 2160p 以上の素材のときのみ）
```

素材が届く前は `make animatic` で、スレートと環境音だけの仮編集を書き出して構成と尺を確認できる。

## 再編集

### プレビューしながら直す

```bash
npm run dev     # Remotion Studio（http://localhost:3000/Film）
```

タイムライン上にショットごとの Sequence（`C1-01 …`）が並ぶ。プレビューの音は `public/audio/mix_full.wav`（無ければ音楽なし版）。

### よくある修正

| やりたいこと | 編集する場所 | その後 |
|---|---|---|
| ショットの素材を差し替える | `data/selects.json` の `id`（Pexels の動画ID）と `file` | `python3 scripts/fetch_footage.py download --shots C3-02` → `make conform` |
| 使い始めの位置・速度を変える | `data/selects.json` の `in`（秒）・`speed` | `python3 scripts/conform.py --res 1080 --shots C3-02 --force` |
| 構図（寄り・位置）を変える | `data/selects.json` の `crop`: `{"zoom":1.1,"x":0.5,"y":0.4}` | 同上 |
| 明るさ・色を合わせる | `data/selects.json` の `grade`: `{"exposure":0.02,"contrast":1.05,"saturation":0.95,"temp":6200}` | 同上（`python3 scripts/conform.py measure` で各素材の明るさ・彩度を比較できる） |
| 全体のトーン | `data/config.json` の `look` | `python3 scripts/conform.py --res 1080 --force` |
| ショットの長さの比率 | `data/shots.json` の `dur`（または `selects.json` の `dur` で上書き） | `make edl` |
| ショットを外す | `data/selects.json` に `"drop": true` | `make edl` |
| カットを拍に合わせる/合わせない | `data/shots.json` の `sync`（beat / downbeat / hit / free） | `make edl` |
| 章の位置を曲のどこに置くか | `data/config.json` の `chapter_anchors`（曲の長さに対する割合） | `make edl` |
| 曲の開始位置 | `data/config.json` の `music.offset` | `make edl audio` |
| 文字の内容 | `data/shots.json` の `texts` | `make edl` |
| 環境音の種類 | `data/shots.json` の `amb`。実録音に替える場合は `work/amb_override/<タグ>.wav`（48kHz） | `make audio` |

`make edl` を実行すると、カット位置・章・文字・クレジットが作り直される。タイミングを変えたあとは `make audio render` で音と映像を書き出し直す。

### 書き出しの設定

- 映像: H.264 / yuv420p / bt709 / 24fps。1080p は CRF 15、4K は CRF 17（x264 preset slow）。
- 音声: AAC 320kbps / 48kHz。曲は -14 LUFS に正規化し、最後にリミッター（トゥルーピーク約 -1.5 dB）。
- 音楽なし版の環境音は、曲入り版と同じ音量（投稿先で曲を重ねたときに同じバランスになる）。

## 音楽なし版に、投稿先で曲を付ける場合

`out/seimei-no-kiseki_1080p_nomusic.mp4` を使い、曲の頭（最初の音）を **映像の `music.offset` 秒**（初期値 3.00 秒）に置く。
各カットが曲のどこに当たるかは `docs/timing_sheet.md` の「曲の位置(秒)」列を参照。

## ライセンス

- Remotion は個人・3名以下の組織は無料。それ以上の組織での利用は会社ライセンスが必要（https://www.remotion.pro/license）。
- 映像素材: Pexels License / Pixabay Content License（帰属表示は任意だが、本作ではクレジットに記載する）。
- 書体: しっぽり明朝（SIL Open Font License 1.1）。
- 環境音: 本プロジェクトのスクリプトで合成（外部素材なし）。
- 曲: 本プロジェクトには含めない。利用する場合は権利者の許諾、または投稿先の公式音源を使う。
