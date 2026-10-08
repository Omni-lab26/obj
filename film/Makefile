# 生命の軌跡 — 制作パイプライン
# 詳しい手順は README.md を参照。
#
#   make fetch     素材の検索・比較シート作成・仮選定・ダウンロード（PEXELS_API_KEY が必要）
#   make analyze   曲の解析（public/audio/music.* を置いてから）
#   make edl       タイムライン・クレジット・字幕用フォントを生成
#   make conform   素材を 24fps / 1920x1080 に整える（make conform4k で 4K 用）
#   make audio     環境音の合成とミックス
#   make render    1080p の書き出し（曲入り・音楽なし）→ 品質確認
#   make render4k  4K の書き出し（全ショットが 2160p 以上の素材のときのみ）
#   make share     共有用の小さいコピー（約28MB）
#   make all       analyze〜render を順に実行

PY      := python3
NAME    := seimei-no-kiseki
OUT     := out
MUSIC   ?= $(firstword $(wildcard public/audio/music.wav public/audio/music.flac public/audio/music.m4a public/audio/music.mp3 public/audio/music.aac))
RENDER  := npx remotion render --muted --codec=h264 --pixel-format=yuv420p --color-space=bt709 \
           --x264-preset=slow --jpeg-quality=95 --concurrency=4

.PHONY: all setup fetch analyze edl conform conform4k audio render render4k share animatic qc clean-render

all: analyze edl conform audio render

setup:
	npm ci
	pip3 install -r requirements.txt

fetch:
	$(PY) scripts/fetch_footage.py search
	$(PY) scripts/fetch_footage.py autopick
	$(PY) scripts/fetch_footage.py download

analyze:
	@if [ -n "$(MUSIC)" ]; then $(PY) scripts/analyze_music.py $(MUSIC); \
	else echo "曲ファイルがありません（public/audio/music.wav など）。仮の拍グリッドで続行します"; rm -f data/music.json; fi

edl:
	$(PY) scripts/build_edl.py
	$(PY) scripts/credits.py
	$(PY) scripts/subset_font.py

conform: edl
	$(PY) scripts/conform.py --res 1080
	$(PY) scripts/build_edl.py
	$(PY) scripts/credits.py

conform4k: edl
	$(PY) scripts/conform.py --res 2160

audio:
	@[ -f work/amb/forest_air.wav ] || $(PY) scripts/ambience.py
	$(PY) scripts/mix_audio.py

render:
	mkdir -p $(OUT)
	$(RENDER) --crf=15 Film $(OUT)/video_1080.mp4
	@if [ -f public/audio/mix_full.wav ]; then \
	  ffmpeg -v error -y -i $(OUT)/video_1080.mp4 -i public/audio/mix_full.wav -map 0:v -map 1:a -c:v copy \
	    -c:a aac -b:a 320k -movflags +faststart $(OUT)/$(NAME)_1080p.mp4 && \
	  $(PY) scripts/qc.py $(OUT)/$(NAME)_1080p.mp4; fi
	ffmpeg -v error -y -i $(OUT)/video_1080.mp4 -i public/audio/mix_nomusic.wav -map 0:v -map 1:a -c:v copy \
	  -c:a aac -b:a 320k -movflags +faststart $(OUT)/$(NAME)_1080p_nomusic.mp4
	$(PY) scripts/qc.py $(OUT)/$(NAME)_1080p_nomusic.mp4

render4k:
	mkdir -p $(OUT)
	$(RENDER) --crf=17 Film4K $(OUT)/video_2160.mp4
	@if [ -f public/audio/mix_full.wav ]; then \
	  ffmpeg -v error -y -i $(OUT)/video_2160.mp4 -i public/audio/mix_full.wav -map 0:v -map 1:a -c:v copy \
	    -c:a aac -b:a 320k -movflags +faststart $(OUT)/$(NAME)_4k.mp4; fi
	ffmpeg -v error -y -i $(OUT)/video_2160.mp4 -i public/audio/mix_nomusic.wav -map 0:v -map 1:a -c:v copy \
	  -c:a aac -b:a 320k -movflags +faststart $(OUT)/$(NAME)_4k_nomusic.mp4

# 共有用の小さいコピー（約28MB。チャットやメッセージで送れる上限 30MB 未満に収める 2 パス）
share:
	mkdir -p $(OUT)/share
	ffmpeg -v error -y -i $(OUT)/$(NAME)_1080p.mp4 -c:v libx264 -preset slow -tune film -b:v 1640k -pass 1 \
	  -passlogfile $(OUT)/share/2pass -an -f null -
	ffmpeg -v error -y -i $(OUT)/$(NAME)_1080p.mp4 -c:v libx264 -preset slow -tune film -b:v 1640k -maxrate 3280k \
	  -bufsize 6560k -pass 2 -passlogfile $(OUT)/share/2pass -c:a aac -b:a 128k -movflags +faststart \
	  $(OUT)/share/$(NAME)_1080p_share.mp4

# 素材が届く前の仮編集（スレート + 環境音）。構成と尺の確認用
animatic: edl audio
	mkdir -p $(OUT)
	$(RENDER) --crf=20 Film $(OUT)/video_animatic.mp4
	ffmpeg -v error -y -i $(OUT)/video_animatic.mp4 -i public/audio/mix_nomusic.wav -map 0:v -map 1:a -c:v copy \
	  -c:a aac -b:a 256k -movflags +faststart $(OUT)/$(NAME)_animatic.mp4
	$(PY) scripts/qc.py --animatic $(OUT)/$(NAME)_animatic.mp4

clean-render:
	rm -f $(OUT)/video_*.mp4
