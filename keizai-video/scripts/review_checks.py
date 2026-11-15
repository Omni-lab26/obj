"""Mechanical part of the post-production review (see REVIEW.md).

    python scripts/review_checks.py enyasu
    python scripts/review_checks.py denkidai

Checks only what a script can check: sentence length, banned endings, the fixed
phrases, photo reuse and credits, quotation cards, pauses around quotations and
questions, audio files, and the finished video's size, length and loudness.
Everything that needs eyes, ears or judgement stays on the checklist.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EPISODES = {
    "denkidai": dict(
        lines="src/talk/lines.json", shots="src/talk/shots.ts", pacing="src/talk/pacing.ts",
        manifest="src/talk/voice-manifest.json", voice="public/talk/voice",
        video="release/denkidai-talk.mp4", factcheck="FACTCHECK-denkidai.md",
    ),
    "enyasu": dict(
        lines="src/talk/enyasu.lines.json", shots="src/talk/enyasu.shots.ts", pacing="src/talk/enyasu.pacing.ts",
        manifest="src/talk/enyasu.voice-manifest.json", voice="public/talk/voice-enyasu",
        video="release/enyasu-talk.mp4", factcheck="FACTCHECK-enyasu.md",
    ),
}
results = []


def report(ok, title, detail=""):
    """ok: True = pass, False = fail, None = needs a look."""
    mark = {True: "OK  ", False: "NG  ", None: "要確認"}[ok]
    results.append(ok)
    print(f"[{mark}] {title}" + (f"\n        {detail}" if detail else ""))


def plain(line):
    return line["text"].replace("|", "").replace("*", "")


def main():
    name = sys.argv[1] if len(sys.argv) > 1 else ""
    if name not in EPISODES:
        sys.exit(f"usage: review_checks.py {'|'.join(EPISODES)}")
    ep = {k: ROOT / v for k, v in EPISODES[name].items()}
    script = json.loads(ep["lines"].read_text())
    lines = script["lines"]
    ids = [l["id"] for l in lines]
    shots = ep["shots"].read_text()
    pacing = ep["pacing"].read_text()
    text = "".join(plain(l) for l in lines)

    print(f"== 台本（{len(lines)}行、{len(text)}字）")
    long = [(len(s), l["id"]) for l in lines for s in re.split(r"[。？]", plain(l)) if len(s) > 60]
    report(not long, "1文は60字まで", f"超えている文: {sorted(long, reverse=True)}" if long else "")
    endings = [l["id"] for l in lines if re.search(r"(なのだ|のだ)[。、？]", plain(l))]
    report(not endings, "キャラクター特有の語尾（〜のだ）を使っていない", f"行: {endings}" if endings else "")
    report("Plotline" in text, "番組名 Plotline を名乗っている")
    report("お送りします" in text, "担当の名乗り（今日は〇〇がお送りします）がある")
    report("1本の線につなげる" in text, "決まり文句「1本の線につなげる」がある")
    count = len(re.findall(r"線でつなが|1本の線|次の線", text))
    report(count >= 5, "「線」の言い回しをくり返している（5回以上）", f"{count}回")
    sections = "".join(dict.fromkeys(i[0] for i in ids if i[0] != "q"))
    report(sections == "abcdefg", "構成の順（掴み→挨拶→3つの章→読み→まとめ）", f"並び: {sections}")
    last = [l for l in lines if l["id"].startswith("g")]
    report(any("？" in plain(l) or "か。" in plain(l) for l in last), "最後に視聴者への質問がある")
    notes = sum(1 for l in lines if plain(l).startswith("ちなみに"))
    report(notes >= 2, "「ちなみに」の補足がある（2か所以上）", f"{notes}か所")
    numbers = len(re.findall(r"[0-9][0-9,\.]*", text))
    seconds = sum(json.loads(ep["manifest"].read_text()).values())
    per_min = numbers / (seconds / 60) if seconds else 0
    report(None if per_min > 7 else True, "数字の多さ（目安：1分あたり7個まで）", f"{numbers}個、1分あたり{per_min:.1f}個")

    print("== 発言の紹介")
    quotes = re.findall(r'kind: "quote",\s*at: "([^"]+)"', shots)
    voiced = [l["id"] for l in lines if l.get("voice")]
    report(sorted(quotes) == sorted(voiced), "読み上げの行と発言カードが1対1で対応している", f"カード: {quotes} 読み上げ: {voiced}")
    for q in quotes:
        block = shots[shots.index(f'at: "{q}"'):][:900]
        report("source:" in block.split("},")[0], f"発言カード {q} に出どころがある")
        before = ids[ids.index(q) - 1]
        has = re.search(rf"\b{before}: {{ after: hand", pacing) and re.search(rf"\b{q}: {{ after: back", pacing)
        report(bool(has), f"発言 {q} の前後に間がある（前の行 {before} と発言の直後）")

    print("== 間")
    # "？" is a question put to the viewer: it needs thinking time.
    # "〜か。" is usually the host asking themselves: any pause will do.
    asks = [l["id"] for l in lines if plain(l).rstrip().endswith("？") and not l.get("voice")]
    missing = [i for i in asks if not re.search(rf"\b{i}: {{ after: (think|land)", pacing)]
    report(not missing, "視聴者への質問（？で終わる行）のあとに、考える間がある", f"間がない行: {missing}" if missing else f"対象: {asks}")
    muses = [l["id"] for l in lines if plain(l).rstrip().endswith("か。") and not l.get("voice")]
    missing = [i for i in muses if not re.search(rf"\b{i}: {{ after: ", pacing)]
    report(not missing, "問いかけ（〜か。で終わる行）のあとに、間がある", f"間がない行: {missing}" if missing else f"対象: {muses}")

    print("== 写真")
    photos = re.findall(r'photo: "([^"]+)"', shots)
    dupes = sorted({p for p in photos if photos.count(p) > 1})
    report(not dupes, f"写真を使い回していない（{len(photos)}枚）", f"重複: {dupes}" if dupes else "")
    credits = json.loads((ROOT / "src/line/credits.json").read_text())
    folder = ROOT / "public/line/photos"
    report(all((folder / p).exists() for p in photos), "写真のファイルが全部ある")
    uncredited = [p for p in photos if p not in credits]
    report(not uncredited, "全部の写真に撮影者とライセンスの記載がある", f"記載なし: {uncredited}" if uncredited else "")
    allowed = ("CC BY", "CC0", "Public Domain")
    bad = [p for p in photos if p in credits and not any(a in credits[p] for a in allowed)]
    report(not bad, "ライセンスは再利用できるものだけ", f"要確認: {bad}" if bad else "")
    report(None, "写真の中身（国・看板・数字・個人名・顔）は人が開いて見る", "機械では確かめられません")

    print("== 音声")
    manifest = json.loads(ep["manifest"].read_text())
    lacking = [i for i in ids if i not in manifest or not (ep["voice"] / f"{i}.m4a").exists()]
    report(not lacking, "全部の行に音声がある", f"ない行: {lacking}" if lacking else "")
    tts = (ROOT / "scripts/tts_voicevox.py").read_text()
    report('"--intonation", "0.93"' in tts and '"--pause", "1.15"' in tts, "声の設定が決まりどおり（抑揚0.93、読点の間1.15）")
    report(None, "抑揚・間・読み間違いは人が耳で確かめる", "機械では確かめられません")

    print("== 事実確認")
    if ep["factcheck"].exists():
        body = ep["factcheck"].read_text()
        verdicts = re.findall(r"\*\*(不合格|条件つき合格|合格|文字は合格)[^*]*\*\*", body)
        report(bool(verdicts) and verdicts[-1] == "合格", "事実確認の報告があり、最後の判定が「合格」", f"判定の流れ: {' → '.join(verdicts)}")
    else:
        report(False, "事実確認の報告（FACTCHECK-〈回の名前〉.md）がある", f"{ep['factcheck'].name} がありません")

    print("== 完成した動画")
    if not ep["video"].exists():
        report(False, "動画ファイルがある", str(ep["video"]))
    else:
        size = ep["video"].stat().st_size / 1e6
        report(size < 100, "100MB未満", f"{size:.0f}MB")
        probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(ep["video"])], capture_output=True, text=True)
        minutes = float(probe.stdout) / 60
        report(None if minutes > 9 else True, "長さ（希望は5分くらい。9分を超えたら相談）", f"{int(minutes)}分{round(minutes % 1 * 60):02d}秒")
        vol = subprocess.run(["ffmpeg", "-nostdin", "-i", str(ep["video"]), "-af", "volumedetect", "-vn", "-f", "null", "-"], capture_output=True, text=True).stderr
        mean = float(re.search(r"mean_volume: (-?[0-9.]+)", vol).group(1))
        peak = float(re.search(r"max_volume: (-?[0-9.]+)", vol).group(1))
        report(-24 <= mean <= -16 and peak <= -1, "音量（平均 −24〜−16dB、最大 −1dB以下）", f"平均 {mean}dB、最大 {peak}dB")

    ng = results.count(False)
    look = results.count(None)
    print(f"\n結果: NG {ng}件、要確認 {look}件、OK {results.count(True)}件")
    sys.exit(1 if ng else 0)


if __name__ == "__main__":
    main()
