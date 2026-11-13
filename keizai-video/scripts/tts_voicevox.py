"""Narration with VOICEVOX (runs locally).

Hosts: zundamon (ずんだもん) and tsumugi (春日部つむぎ). The script file names the
host in its "host" field; --host overrides it, and --host random picks one.
Credit line for the video: "VOICEVOX:ずんだもん" / "VOICEVOX:春日部つむぎ".

Needs voicevox_core plus its onnxruntime library, an Open JTalk dictionary and
the .vvm voice files. Point VOICEVOX_DIR at a folder laid out like this:

    $VOICEVOX_DIR/onnxruntime/libvoicevox_onnxruntime.so.*
    $VOICEVOX_DIR/open_jtalk_dic_utf_8-1.11/
    $VOICEVOX_DIR/vvm/0.vvm ...

    python scripts/tts_voicevox.py --script src/talk/lines.json \
        --out public/talk/voice --manifest src/talk/voice-manifest.json
    python scripts/tts_voicevox.py ... a01 b03      # only these lines
    python scripts/tts_voicevox.py ... --kana       # print the readings, write nothing
"""
import glob
import json
import os
import random
import subprocess
import sys
from pathlib import Path

HOSTS = {"zundamon": ("ずんだもん", 3), "tsumugi": ("春日部つむぎ", 8)}
VALUED = {"--script", "--out", "--manifest", "--host", "--speed"}


def opt(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout
    return round(float(out), 3)


def spoken(line):
    """Text handed to the voice: the `say` override, or the subtitle without its markup."""
    return line.get("say") or line["text"].replace("|", "").replace("*", "").replace("　", "")


def main():
    script = Path(opt("--script", "src/talk/lines.json"))
    out = Path(opt("--out", "public/talk/voice"))
    manifest_path = Path(opt("--manifest", "src/talk/voice-manifest.json"))
    speed = float(opt("--speed", "1.15"))
    argv = sys.argv[1:]
    only = [a for i, a in enumerate(argv) if not a.startswith("--") and (i == 0 or argv[i - 1] not in VALUED)]
    data = json.loads(script.read_text())
    host = opt("--host", data.get("host", "zundamon"))
    if host == "random":
        host = random.choice(list(HOSTS))
    name, style_id = HOSTS[host]
    lines = data["lines"]

    if "--manifest-only" not in sys.argv:
        from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile

        root = Path(os.environ["VOICEVOX_DIR"])
        ort = sorted(glob.glob(str(root / "onnxruntime" / "libvoicevox_onnxruntime.so.*")))[-1]
        synth = Synthesizer(Onnxruntime.load_once(filename=ort), OpenJtalk(str(root / "open_jtalk_dic_utf_8-1.11")))
        for vvm in sorted((root / "vvm").glob("*.vvm")):
            with VoiceModelFile.open(vvm) as model:
                if any(st.id == style_id for ch in model.metas for st in ch.styles):
                    synth.load_voice_model(model)
                    break
        out.mkdir(parents=True, exist_ok=True)
        print(f"host: {name}", flush=True)
        for line in lines:
            if only and line["id"] not in only:
                continue
            query = synth.create_audio_query(spoken(line), style_id)
            if "--kana" in sys.argv:
                print(line["id"], query.kana, flush=True)
                continue
            query.speed_scale = speed
            query.intonation_scale = 1.1
            query.pre_phoneme_length = 0.08
            query.post_phoneme_length = 0.08
            wav = out / f"{line['id']}.wav"
            wav.write_bytes(synth.synthesis(query, style_id))
            m4a = out / f"{line['id']}.m4a"
            subprocess.run(
                ["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-af",
                 "loudnorm=I=-17:TP=-2:LRA=11,aresample=48000", "-c:a", "aac", "-b:a", "160k", str(m4a)],
                check=True,
            )
            wav.unlink()
            print(line["id"], duration(m4a), flush=True)
        if "--kana" in sys.argv:
            return

    manifest = {}
    for line in lines:
        f = out / f"{line['id']}.m4a"
        if f.exists():
            manifest[line["id"]] = duration(f)
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"total narration: {sum(manifest.values()):.1f}s over {len(manifest)}/{len(lines)} lines")


if __name__ == "__main__":
    main()
