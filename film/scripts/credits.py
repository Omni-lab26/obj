#!/usr/bin/env python3
"""使用素材の一覧とクレジットを作る。

  python3 scripts/credits.py

出力:
  src/data/credits.json   エンドクレジット（Remotion が表示）
  docs/credits.md         素材一覧（取得元URL・作者・ライセンス・クレジット）と概要欄用のクレジット文
  docs/assets.csv         同じ内容の表
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

NOTE = ("本作の映像はすべて、現在の地球で撮影された実写です。"
        "過去の地球や古代の生物を記録したものではなく、地球と生命の歴史を表すために用いています。")


def load(p, default):
    p = ROOT / p
    return json.loads(p.read_text()) if p.exists() else default


def main():
    manifest = load("data/manifest.json", {})
    edl = load("src/data/edl.json", {"shots": []})
    used_shots = {s["id"] for s in edl["shots"] if s.get("clip")}
    music_meta = load("data/music_meta.json", None)

    used = [m for m in manifest.values() if set(m["shots"]) & used_shots]
    used.sort(key=lambda m: min(m["shots"]))
    # 同じ作者は一度だけ表示
    seen, footage = set(), []
    for m in used:
        key = (m["provider"], m["author"])
        if key in seen:
            continue
        seen.add(key)
        footage.append({"credit": m["author"], "source": m["provider"].capitalize()})

    providers = sorted({m["provider"].capitalize() for m in used})
    credits = {
        "note": NOTE,
        "footage": footage,
        "music": music_meta["credit"] if music_meta else None,
        "sound": "合成による環境音（本作のために生成）",
        "font": "しっぽり明朝（SIL Open Font License 1.1）",
        "tools": "映像素材: " + (" / ".join(providers) if providers else "—") + "　制作: Remotion, FFmpeg, librosa",
    }
    (ROOT / "src" / "data").mkdir(parents=True, exist_ok=True)
    (ROOT / "src" / "data" / "credits.json").write_text(json.dumps(credits, ensure_ascii=False, indent=1))

    fields = ["shots", "asset_id", "provider", "source_url", "author", "author_url", "license", "license_url",
              "attribution_required", "credit", "width", "height", "fps", "duration", "codec", "has_audio",
              "sha1", "retrieved", "file"]
    with open(ROOT / "docs" / "assets.csv", "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        for m in used:
            w.writerow({**m, "shots": " ".join(m["shots"])})

    lines = ["# 使用素材とクレジット", "",
             f"> {NOTE}", "",
             "## 映像素材", ""]
    if used:
        lines += ["| ショット | 内容 | 作者 | 取得元 | ライセンス | 解像度 | クレジット表記 |",
                  "|---|---|---|---|---|---|---|"]
        descs = {s["id"]: s["desc"] for s in edl["shots"]}
        for m in used:
            sh = ", ".join(m["shots"])
            d = " / ".join(descs.get(s, "") for s in m["shots"])
            lines.append(f"| {sh} | {d} | [{m['author']}]({m['author_url']}) | [{m['provider']} {m['provider_id']}]({m['source_url']}) | "
                         f"[{m['license']}]({m['license_url']}) | {m['width']}x{m['height']} {m['fps']}fps | {m['credit']} |")
    else:
        lines.append("（まだ素材を取得していません。scripts/fetch_footage.py download 実行後に自動で埋まります）")
    lines += ["", "## 音楽", ""]
    if music_meta:
        lines.append(f"- {music_meta['credit']}（{music_meta.get('rights', '権利情報は data/music_meta.json に記載')}）")
    else:
        lines.append("- 「Can You Hear the Music」（Ludwig Göransson、映画『オッペンハイマー』サウンドトラック）を想定。"
                     "曲ファイルは本プロジェクトに含めていない。投稿先の公式音源を使う場合は docs/timing_sheet.md の開始位置に合わせる。")
    lines += ["", "## 環境音", "", "- scripts/ambience.py で合成（外部素材なし。権利上の制約なし）。", "",
              "## 書体", "", "- しっぽり明朝 Shippori Mincho（SIL Open Font License 1.1, public/fonts/OFL-ShipporiMincho.txt）", "",
              "## 概要欄用クレジット（コピー用）", "", "```"]
    lines.append("映像素材: " + ("、".join(f"{f['credit']}" for f in footage) + "（" + "・".join(providers) + "）" if footage else "—"))
    if music_meta:
        lines.append("音楽: " + music_meta["credit"])
    lines.append("本作の映像はすべて現在の地球で撮影された実写です（古代の記録映像ではありません）。")
    lines += ["```", ""]
    (ROOT / "docs" / "credits.md").write_text("\n".join(lines))
    print(f"credits: {len(footage)} authors from {len(used)} assets")


if __name__ == "__main__":
    main()
