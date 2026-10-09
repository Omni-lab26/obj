#!/usr/bin/env bash
# Full build: fonts → checks → audio → 4 video renders → mux → captions → contact sheet → verification.
#   ./build.sh            everything
#   ./build.sh video      renders + mux only
set -euo pipefail
cd "$(dirname "$0")"
step() { printf '\n== %s\n' "$*"; }
FPS=60
mux() { # $1 silent video, $2 output
  ffmpeg -v error -y -i "$1" -i out/audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 \
    -movflags +faststart -shortest "$2"
}
if [[ "${1:-all}" == "all" ]]; then
  step "fonts";  python3 tools/subset.py
  step "contrast"; python3 tools/contrast.py
  step "timing";  node tools/check_timing.mjs
  step "lines";   node tools/linecheck.mjs
  step "audio";   node tools/audio.mjs
fi
step "render 16:9";  node tools/render.mjs --fmt 16x9 --fps $FPS --out out/.v_16x9.mp4
step "render 9:16";  node tools/render.mjs --fmt 9x16 --fps $FPS --out out/.v_9x16.mp4
step "render 1:1";   node tools/render.mjs --fmt 1x1  --fps $FPS --out out/.v_1x1.mp4
step "render 16:9 reduced motion"; node tools/render.mjs --fmt 16x9 --mode reduced --fps $FPS --out out/.v_16x9_reduced.mp4
step "mux"
mux out/.v_16x9.mp4 out/master_16x9.mp4
mux out/.v_9x16.mp4 out/cut_9x16.mp4
mux out/.v_1x1.mp4 out/cut_1x1.mp4
mux out/.v_16x9_reduced.mp4 out/master_16x9_reduced_motion.mp4
rm -f out/.v_*.mp4
step "captions"; node tools/srt.mjs captions.srt; cp captions.srt out/captions.srt
step "contact sheet"; python3 tools/contact.py out/master_16x9.mp4 contact.png
if [[ "${1:-all}" == "all" ]]; then
  step "verify"
  node tools/determinism.mjs
  for f in out/master_16x9.mp4 out/cut_9x16.mp4 out/cut_1x1.mp4 out/master_16x9_reduced_motion.mp4; do
    python3 tools/flash.py "$f"
    python3 tools/audio_check.py "$f"
  done
fi
