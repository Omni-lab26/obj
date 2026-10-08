# 制作状況

最終更新: 2026-10-08

## できていること

| 工程 | 状態 | 成果物 |
|---|---|---|
| 1. コンセプト・構成・音楽との対応 | 完了 | `docs/concept.md`, `data/shots.json`（50ショット、6章） |
| 科学的な裏付け | 完了 | `docs/science.md` |
| 素材の検索・選定・取得の仕組み | 完了（モックAPIで動作確認） | `scripts/fetch_footage.py`, `docs/sourcing.md` |
| 素材の整形（24fps・16:9切り出し・HDR変換・色・手ぶれ補正） | 完了（テスト素材で動作確認） | `scripts/conform.py` |
| 曲の解析（拍・アクセント・構造・密度・終わり方） | 完了（加速するテスト曲で検証。拍の検出率100%） | `scripts/analyze_music.py` |
| タイムライン生成（章を曲の区切りに、カットを拍に吸着） | 完了 | `scripts/build_edl.py`, `src/data/edl.json`, `docs/timing_sheet.md` |
| 環境音（18種を合成）とミックス | 完了 | `scripts/ambience.py`, `scripts/mix_audio.py` |
| Remotion の作品（1080p / 4K、文字、クレジット） | 完了 | `src/` |
| 品質確認（黒・静止・無音・ラウドネス・カット前後のフレーム） | 完了 | `scripts/qc.py` |
| 2. 粗編集 | **仮編集（スレート）まで** | `out/seimei-no-kiseki_animatic.mp4`（2:19.5） |

## 止まっていること

### 実写素材が取得できない（ネットワーク）

この制作環境のネットワークポリシーで、素材サイトへの接続がすべて拒否されている（HTTP 403）。

- `api.pexels.com`, `videos.pexels.com`, `images.pexels.com`, `www.pexels.com`
- `pixabay.com`, `cdn.pixabay.com`
- （参考）`commons.wikimedia.org`, `upload.wikimedia.org`, `images-api.nasa.gov`, `images-assets.nasa.gov`, `svs.gsfc.nasa.gov`, `freesound.org`

必要な対応:

1. 環境設定の Network access で、上記（少なくとも Pexels の4つ）を Allowed domains に追加
2. Pexels APIキー（無料）を環境の Network secrets、または環境変数 `PEXELS_API_KEY` に登録
3. 新しいセッションで `cd film && make fetch` から再開（設定は新しいセッションで反映される）

### 曲ファイル

「Can You Hear the Music」の音源は本プロジェクトに含めていない（商用音源のため、こちらでは取得しない）。

- 権利を確認した音源ファイルを `film/public/audio/music.wav`（または .flac / .m4a / .mp3）に置けば、
  `make analyze edl` で実際の拍・構造に合わせてカットが組み直される。
- 置かない場合は、仮の拍グリッドで組み、音楽なし版と合わせ位置（`docs/timing_sheet.md`）を納品する。

## 素材がそろった後の手順

```bash
cd film
make fetch                 # 検索 → 比較シート（work/sheets/）→ 仮選定 → 取得
#   比較シートを見て data/selects.json を確定（構図・動き・色・前後のつながり）
make analyze               # 曲の解析（曲ファイルがある場合）
make conform               # タイムライン → 素材の整形
make audio render          # ミックス → 書き出し → 品質確認
#   out/qc/ のシートで色・構図・透かし・黒フレームを確認し、selects.json の grade/crop/in を調整して繰り返す
make conform4k render4k    # 4K版（全ショットが 2160p 以上のとき）
```
