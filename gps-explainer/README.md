# 青い点は、見られていない — GPSのしくみ

An 83-second explainer film (Japanese, captions only) that leaves a map-app user with one new understanding:

> スマホは衛星に何も送らない。届いた時刻の「遅れ」を距離に変え、円が交わる一点を自分で計算している。
> （時計のずれも一緒に解くので、立体では衛星が4つ要る）

## Deliverables

| File | What it is |
|---|---|
| `out/master_16x9.mp4` | 16:9 master, 1920×1080, 60 fps, H.264 crf 16 yuv420p, AAC 48 kHz |
| `out/cut_9x16.mp4` | 9:16 recomposition, 1080×1920 |
| `out/cut_1x1.mp4` | 1:1 recomposition, 1080×1080 |
| `out/master_16x9_reduced_motion.mp4` | Reduced-motion cut: same ideas, same timing; zooms become cuts, moves become fades, no expanding rings |
| `captions.srt` (also `out/captions.srt`) | Captions, generated from the timeline. Captions are also burned into every video |
| `contact.png` | One frame per story beat, taken from the rendered master |
| `directions/directions.html` | Four visual directions side by side with the decision log (A chosen) |
| `SCENES.md` | Scene-by-scene spec: teaches / frame / motion / words / sound / check |
| `DECISIONS.md` | Every call made where the brief was open |
| `SOURCES.md` | Source for every number and claim on screen |

The mp4 files are committed (about 1–8 MB each); `./build.sh` recreates them byte-for-byte from the source.

## How it is built

- `src/timeline.js` holds the one `TIMELINE` object: tempo, true-scale geometry, camera track, named moves, wavefronts, sound cues, captions, on-screen labels and scenes. Everything else reads it.
- `src/render.js` paints a canvas. `window.seek(t)` draws the frame at time `t` (seconds), and every frame is a pure function of `t` plus the URL parameters `fmt` (16x9 | 9x16 | 1x1), `mode` (normal | reduced) and `dir` (A–D, directions only). There are no clocks and no `Math.random`.
- `src/audio.js` renders the score offline with Web Audio (`OfflineAudioContext`). It is tempo-locked at 72 BPM, its noise is seeded, and a three-note motif returns on the key ideas. `tools/audio.mjs` loudness-normalises it (two-pass loudnorm).
- `tools/render.mjs` runs headless Chrome (Playwright, using the system Chromium). It steps `t = n / 60` and pipes PNG frames to ffmpeg (libx264, crf 16, yuv420p, bt709). Parallel pages render contiguous chunks, which are concatenated without re-encoding.
- `brand/tokens.json` is the single source of colour, type, spacing, easing and strokes. The typefaces are IBM Plex Sans JP and IBM Plex Mono (OFL), subset into `fonts/` by `tools/subset.py`.

```bash
npm ci                    # playwright-core + font packages
pip3 install fonttools numpy librosa matplotlib
./build.sh                # fonts → checks → audio → 4 renders → mux → captions → contact sheet → verification
./build.sh video          # renders + mux + captions + contact sheet only
node tools/stills.mjs --fmt 9x16 --beats 30,77 --out review/stills   # stills at any beat
```

`build.sh` expects Chromium at `/opt/pw-browsers/...`. Set `CHROME_PATH` to use another Chrome.

## What was tested

Every item below was run in this environment on the final source. Results of the last full build:

| Check | Result |
|---|---|
| Frames | 5,000 per output (83.33 s × 60 fps), as expected |
| Determinism | 12 / 12 frame pairs byte-identical (4 per format, two sessions, second in reverse order) |
| Contrast | lowest text pair 4.76:1 |
| Caption speed | 2.6–3.95 characters per second (limit 4.0) |
| Lines on screen | max 2 caption lines and 2 label lines, every ¼ beat, all formats |
| Flashes | 0 per second in 16:9, 9:16 and 1:1; 1 per second in the reduced-motion cut (a cut replacing a zoom) |
| Loudness | −15.9 LUFS integrated, −1.9 dBTP true peak, all four outputs |
| Sound cues | 31 / 31 land on an audible onset within 25 ms, all four outputs |

The full log is written to `out/build.log` on each build (not committed); review images are in `review/`.

- **Determinism** (`tools/determinism.mjs`): four frames per format, rendered in two separate browser sessions with the second session in reverse order. Each pair's PNG bytes are compared.
- **Contrast** (`tools/contrast.py`): every declared text colour pair is ≥ 4.5:1 (lowest 4.76:1).
- **Timing** (`tools/check_timing.mjs`):
  - Every caption is ≤ 4.0 characters per second, counted after its fade-in.
  - No caption is on screen during a camera move, and no two captions overlap.
  - Every sound cue sits on the half-beat grid, except wavefront arrivals, which follow the geometry.
- **Line count** (`tools/linecheck.mjs`): every quarter beat in all three formats has at most 2 caption lines and at most 2 label lines.
- **SRT** (`tools/srt.mjs`): every caption is ≤ 2 lines of ≤ 13 characters.
- **Flashes** (`tools/flash.py`): no more than 3 flashes in any 1-second window, on the whole frame and on each cell of a 4×4 grid, for every output.
- **Audio** (`tools/audio_check.py`):
  - Integrated loudness is within -16 ± 1 LUFS and true peak is ≤ -1.5 dBTP, for every output.
  - Every timeline cue has an audible onset within 25 ms (slow-attack cues exempt).
  - `review/audio_check.png` shows the spectrogram with the cue markers.
- **Muted viewing**: stills at every key beat in every format and mode (`review/storyboard_*.png`), plus frame sequences across every camera move (`review/motion_*.png`).
- **Legibility at 390 px**: every key frame of every format scaled to exactly 390 px wide (`review/w390_*.png`).
- **Reviews**: a design review (Meaghan Choi's three questions, run by a subagent) and an accessibility review. Their findings and the changes made are in `DECISIONS.md`. Each fix has a before/after pair in `review/fixes/`.

## What was not done

- No voiceover. No licensed Japanese voice was available offline, so the narration is carried by captions. As a result, "duck the bed under voice" has nothing to duck.
- `./brand`, `./refs` and `./screens` did not exist. `brand/tokens.json` was created as the brand source; there are no real UI screenshots. The map-app element is drawn, and its meaning is sourced to Google Maps Help.
- The 9:16, 1:1 and reduced-motion cuts were checked from stills, the 390 px sheets and the automated checks. Only the 16:9 master was also checked across its camera moves frame by frame.
