"""English narration with Kokoro (Apache-2.0, runs locally).

Lines marked "voice": "reader" (quotations) use a second voice.

    pip install "kokoro>=0.9.4" soundfile        # Python 3.10-3.12
    python scripts/tts_en.py                     # all lines
    python scripts/tts_en.py b01 e08             # only these lines
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "src" / "talk" / "lines.en.json"
MANIFEST = ROOT / "src" / "talk" / "voice-manifest.en.json"
OUT = ROOT / "public" / "talk" / "voice-en"
HOST_VOICE = "af_heart"
READER_VOICE = "am_michael"
SR = 24000


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout
    return round(float(out), 3)


def main():
    only = [a for a in sys.argv[1:] if not a.startswith("--")]
    lines = json.loads(SCRIPT.read_text())["lines"]
    OUT.mkdir(parents=True, exist_ok=True)
    if "--manifest-only" not in sys.argv:
        import numpy as np
        import soundfile as sf
        from kokoro import KPipeline

        pipe = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
        for line in lines:
            if only and line["id"] not in only:
                continue
            text = line.get("say") or line["text"].replace("|", " ").replace("*", "")
            reader = line.get("voice") == "reader"
            chunks, phonemes = [], []
            for _, ps, audio in pipe(text, voice=READER_VOICE if reader else HOST_VOICE, speed=0.95 if reader else 1.0):
                chunks.append(np.asarray(audio))
                phonemes.append(ps)
            wav = OUT / f"{line['id']}.wav"
            sf.write(wav, np.concatenate(chunks), SR)
            m4a = OUT / f"{line['id']}.m4a"
            subprocess.run(
                ["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-af",
                 "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.06,areverse,"
                 "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.06,areverse,"
                 "loudnorm=I=-17:TP=-2:LRA=11,aresample=48000",
                 "-c:a", "aac", "-b:a", "160k", str(m4a)],
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
