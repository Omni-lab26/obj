"""Narration with Style-Bert-VITS2 (runs locally, no text leaves the machine).

Voices are the JVNV models (CC BY-SA 4.0): jvnv-F1-jp, jvnv-F2-jp, jvnv-M1-jp, jvnv-M2-jp.
Credit line for the video: "音声: Style-Bert-VITS2 / JVNV コーパス".

    pip install style-bert-vits2 soundfile          # Python 3.10-3.12
    python scripts/tts_sbv2.py --script src/route/lines.json \
        --out public/route/voice --manifest src/route/voice-manifest.json --voice jvnv-M1-jp
    python scripts/tts_sbv2.py ... a01 b03          # only these line ids
    python scripts/tts_sbv2.py ... --manifest-only
"""
import json
import subprocess
import sys
from pathlib import Path

REPO = "litagin/style_bert_vits2_jvnv"
FILES = {
    "jvnv-F1-jp": "jvnv-F1-jp_e160_s14000.safetensors",
    "jvnv-F2-jp": "jvnv-F2_e166_s20000.safetensors",
    "jvnv-M1-jp": "jvnv-M1-jp_e158_s14000.safetensors",
    "jvnv-M2-jp": "jvnv-M2-jp_e159_s17000.safetensors",
}
BERT = "ku-nlp/deberta-v2-large-japanese-char-wwm"


def opt(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout
    return round(float(out), 3)


def main():
    script = Path(opt("--script", "src/route/lines.json"))
    out = Path(opt("--out", "public/route/voice"))
    manifest_path = Path(opt("--manifest", "src/route/voice-manifest.json"))
    voice = opt("--voice", "jvnv-M1-jp")
    length = float(opt("--length", "1.0"))  # >1 is slower
    valued = {"--script", "--out", "--manifest", "--voice", "--length"}
    argv = sys.argv[1:]
    only = [a for i, a in enumerate(argv) if not a.startswith("--") and (i == 0 or argv[i - 1] not in valued)]
    lines = json.loads(script.read_text())["lines"]
    out.mkdir(parents=True, exist_ok=True)

    if "--manifest-only" not in sys.argv:
        import soundfile as sf
        from huggingface_hub import hf_hub_download
        from style_bert_vits2.constants import Languages
        from style_bert_vits2.nlp import bert_models
        from style_bert_vits2.tts_model import TTSModel

        # Newer transformers load this checkpoint in half precision, which CPU inference cannot mix.
        bert_models.load_model(Languages.JP, BERT).float()
        bert_models.load_tokenizer(Languages.JP, BERT)
        get = lambda name: hf_hub_download(REPO, f"{voice}/{name}")
        model = TTSModel(
            model_path=Path(get(FILES[voice])),
            config_path=Path(get("config.json")),
            style_vec_path=Path(get("style_vectors.npy")),
            device="cpu",
        )
        for line in lines:
            if only and line["id"] not in only:
                continue
            sr, audio = model.infer(
                text=line.get("say", line["text"]).replace("|", ""),
                language=Languages.JP,
                style="Neutral",
                # Steadier than the defaults: clearer consonants, fewer slurred phrase starts.
                sdp_ratio=0.0,
                noise=0.4,
                noise_w=0.5,
                length=length,
            )
            wav = out / f"{line['id']}.wav"
            sf.write(wav, audio, sr)
            m4a = out / f"{line['id']}.m4a"
            subprocess.run(
                ["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-af",
                 # keep a little room at both ends so soft consonants are not clipped
                 "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse,"
                 "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse,"
                 "loudnorm=I=-17:TP=-2:LRA=11,aresample=48000",
                 "-c:a", "aac", "-b:a", "160k", str(m4a)],
                check=True,
            )
            wav.unlink()
            print(line["id"], duration(m4a), flush=True)

    manifest = {}
    for line in lines:
        f = out / f"{line['id']}.m4a"
        if f.exists():
            manifest[line["id"]] = duration(f)
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"total narration: {sum(manifest.values()):.1f}s over {len(manifest)}/{len(lines)} lines")


if __name__ == "__main__":
    main()
