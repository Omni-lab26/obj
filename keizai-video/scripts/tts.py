"""Generate narration audio for every line in src/script.json.

Uses Kokoro (Apache-2.0, https://github.com/hexgrad/kokoro) so the audio can be
used on YouTube without a credit line. Any other TTS works too: just write one
audio file per line id into public/voice/ and re-run with --manifest-only.

    pip install "kokoro>=0.9.4" "misaki[ja]" soundfile   # Python 3.10-3.12
    python scripts/tts.py                # all lines
    python scripts/tts.py h1 w3          # only these line ids
    python scripts/tts.py --manifest-only
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "src" / "script.json"
MANIFEST = ROOT / "src" / "voice-manifest.json"
OUT = ROOT / "public" / "voice"
VOICE = "jf_alpha"
SPEED = 1.05
SR = 24000


def duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout
    return round(float(out), 3)


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    manifest_only = "--manifest-only" in sys.argv
    scenes = json.loads(SCRIPT.read_text())["scenes"]
    lines = [l for s in scenes for l in s["lines"]]
    OUT.mkdir(parents=True, exist_ok=True)

    if not manifest_only:
        import numpy as np
        import soundfile as sf
        from kokoro import KPipeline

        pipe = KPipeline(lang_code="j", repo_id="hexgrad/Kokoro-82M")
        for line in lines:
            if args and line["id"] not in args:
                continue
            chunks, phonemes = [], []
            # Kokoro's Japanese G2P drops full-width punctuation, which removes
            # every pause. ASCII punctuation survives, so map to that.
            say = line.get("say", line["text"]).replace("、", ", ").replace("。", ". ").strip()
            for _, ps, audio in pipe(say, voice=VOICE, speed=SPEED):
                chunks.append(np.asarray(audio))
                phonemes.append(ps)
            wav = OUT / f"{line['id']}.wav"
            sf.write(wav, np.concatenate(chunks), SR)
            # Trim leading/trailing silence and encode small.
            m4a = OUT / f"{line['id']}.m4a"
            subprocess.run(
                ["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-af",
                 "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
                 "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
                 "loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000",
                 "-c:a", "aac", "-b:a", "128k", str(m4a)],
                check=True,
            )
            wav.unlink()
            print(line["id"], duration(m4a), " ".join(phonemes), flush=True)

    manifest = {}
    for line in lines:
        f = OUT / f"{line['id']}.m4a"
        if f.exists():
            manifest[line["id"]] = duration(f)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"total narration: {sum(manifest.values()):.1f}s over {len(manifest)}/{len(lines)} lines")


if __name__ == "__main__":
    main()
