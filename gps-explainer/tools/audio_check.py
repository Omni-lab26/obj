#!/usr/bin/env python3
"""Audio-only check: loudness / true peak of the final file, and whether every sound cue in TIMELINE lands
on an audible onset (±25 ms). Writes review/audio_check.png (spectrogram with cue markers).
  python3 tools/audio_check.py out/master_16x9.mp4"""
import json, re, subprocess, sys
import numpy as np
import librosa
path = sys.argv[1]
T = json.loads(subprocess.run(["node", "-e", "const T=require('./src/timeline.js');console.log(JSON.stringify({spb:T.spb,cues:T.cues,dur:T.duration}))"],
                              capture_output=True, text=True, check=True).stdout)
log = subprocess.run(["ffmpeg", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", log)[-1]); TP = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", log)[-1])
print(f"loudness {I} LUFS (target -16 ± 1), true peak {TP} dBTP (limit -1.5) → {'ok' if abs(I + 16) <= 1 and TP <= -1.5 else 'FAIL'}")
wav = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", "22050", "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
y, sr = np.frombuffer(wav, np.float32).copy(), 22050
hop = 128
env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
on = librosa.onset.onset_detect(onset_envelope=env, sr=sr, hop_length=hop, units="time", backtrack=False, delta=0.02)
hits = 0
rows = []
for c in T["cues"]:
    t = c["b"] * T["spb"]
    d = np.min(np.abs(on - t)) if len(on) else 9
    ok = d <= 0.025 or c["type"] in ("whoosh_in", "whoosh_out", "error")  # slow-attack sounds have no sharp onset
    hits += ok
    rows.append((round(t, 3), c["type"], round(float(d) * 1000), ok))
print(f"cues with an onset within 25 ms: {hits}/{len(rows)} (slow-attack cues exempt)")
for r in rows:
    if not r[3]: print("  missing:", r)
try:
    import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt; import librosa.display
    fig, ax = plt.subplots(2, 1, figsize=(18, 6), sharex=True)
    S = librosa.amplitude_to_db(np.abs(librosa.stft(y, hop_length=512)), ref=np.max)
    librosa.display.specshow(S, sr=sr, hop_length=512, x_axis="time", y_axis="log", ax=ax[0])
    t = np.arange(len(y)) / sr
    ax[1].plot(t[::50], y[::50], lw=0.3)
    for c in T["cues"]:
        for a in ax: a.axvline(c["b"] * T["spb"], color="r", lw=0.6, alpha=0.6)
    fig.tight_layout(); fig.savefig("review/audio_check.png", dpi=70)
except Exception as e:
    print("plot skipped:", e)
sys.exit(0 if hits == len(rows) and abs(I + 16) <= 1 and TP <= -1.5 else 1)
