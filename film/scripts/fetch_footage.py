#!/usr/bin/env python3
"""素材の検索・比較・取得。

  python3 scripts/fetch_footage.py search [--shots C1-01,C2-03] [--provider pexels|pixabay|all]
      各ショットの queries で検索し、候補を work/candidates/<shot>.json に保存。
      候補ごとのプレビュー（数コマのフィルムストリップ）を並べた比較シート
      work/sheets/<shot>.jpg を作る（構図・動き・前後のつながりを目で比較するため）。

  python3 scripts/fetch_footage.py autopick
      解像度・長さ・検索順位・重複を点数化して data/selects.json に仮選定を書く
      （既に人が選んだショットは上書きしない）。

  python3 scripts/fetch_footage.py download [--shots ...]
      data/selects.json で選ばれた素材をダウンロードし、data/manifest.json に
      取得元URL・作者・ライセンス・クレジット・解像度・ハッシュを記録する。

環境変数:
  PEXELS_API_KEY   必須（https://www.pexels.com/api/ で無料発行）
  PIXABAY_API_KEY  任意

ライセンス方針（docs/credits.md にも記載）:
  - Pexels License / Pixabay Content License の素材のみ。透かし付きプレビューは使わない
    （API が返す元ファイルのみを取得）。
  - 解像度が 1920x1080 未満の素材は候補から除外（無理な拡大をしない）。
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlencode

import requests

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "work"
CAND = WORK / "candidates"
SHEETS = WORK / "sheets"
THUMBS = WORK / "thumbs"
SRC = WORK / "src"
CACHE = WORK / "cache"
SELECTS = ROOT / "data" / "selects.json"
MANIFEST = ROOT / "data" / "manifest.json"
SHOTS = ROOT / "data" / "shots.json"

UA = {"User-Agent": "seimei-no-kiseki-film/1.0 (+non-commercial film production)"}

LICENSES = {
    "pexels": {"name": "Pexels License", "url": "https://www.pexels.com/license/",
               "attribution_required": False,
               "credit": "Video by {author} on Pexels"},
    "pixabay": {"name": "Pixabay Content License", "url": "https://pixabay.com/service/license-summary/",
                "attribution_required": False,
                "credit": "Video by {author} on Pixabay"},
}


def load_json(p: Path, default):
    return json.loads(p.read_text()) if p.exists() else default


def save_json(p: Path, data):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=1))


def cached_get(url, headers=None, params=None, ttl_h=72):
    key = hashlib.sha1((url + "?" + urlencode(sorted((params or {}).items()))).encode()).hexdigest()
    cp = CACHE / f"{key}.json"
    if cp.exists() and (time.time() - cp.stat().st_mtime) < ttl_h * 3600:
        return json.loads(cp.read_text())
    for attempt in range(4):
        r = requests.get(url, headers={**UA, **(headers or {})}, params=params, timeout=30)
        if r.status_code == 429:
            wait = int(r.headers.get("Retry-After", "30"))
            print(f"  rate limited, waiting {wait}s", file=sys.stderr)
            time.sleep(wait)
            continue
        r.raise_for_status()
        data = r.json()
        CACHE.mkdir(parents=True, exist_ok=True)
        cp.write_text(json.dumps(data))
        return data
    raise RuntimeError(f"failed: {url}")


# ---------------------------------------------------------------- providers
def search_pexels(query, per_page=15):
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        raise SystemExit("PEXELS_API_KEY が未設定です（環境の Network secrets / 環境変数に登録してください）")
    data = cached_get("https://api.pexels.com/videos/search", headers={"Authorization": key},
                      params={"query": query, "per_page": per_page, "orientation": "landscape", "size": "medium"})
    out = []
    for rank, v in enumerate(data.get("videos", [])):
        files = [f for f in v.get("video_files", []) if f.get("file_type") == "video/mp4" and f.get("width")]
        if not files:
            continue
        best = max(files, key=lambda f: (f["width"] * f["height"], f.get("fps") or 0))
        if best["height"] < 1080:
            continue
        out.append({
            "provider": "pexels", "id": v["id"], "rank": rank, "query": query,
            "page_url": v["url"], "author": v["user"]["name"], "author_url": v["user"]["url"],
            "width": v["width"], "height": v["height"], "duration": v["duration"],
            "fps": round(best.get("fps") or 0, 3),
            "files": [{"w": f["width"], "h": f["height"], "fps": f.get("fps"), "link": f["link"],
                       "quality": f.get("quality")} for f in files],
            "preview": v.get("image"),
            "pictures": [p["picture"] for p in sorted(v.get("video_pictures", []), key=lambda p: p.get("nr", 0))],
        })
    return out


def search_pixabay(query, per_page=20):
    key = os.environ.get("PIXABAY_API_KEY")
    if not key:
        return []
    data = cached_get("https://pixabay.com/api/videos/",
                      params={"key": key, "q": query, "per_page": per_page, "safesearch": "true"})
    out = []
    for rank, h in enumerate(data.get("hits", [])):
        vids = [dict(v, size_name=k) for k, v in h.get("videos", {}).items() if v.get("url") and v.get("width")]
        if not vids:
            continue
        best = max(vids, key=lambda f: f["width"] * f["height"])
        if best["height"] < 1080:
            continue
        out.append({
            "provider": "pixabay", "id": h["id"], "rank": rank, "query": query,
            "page_url": h["pageURL"], "author": h["user"],
            "author_url": f"https://pixabay.com/users/{h['user']}-{h['user_id']}/",
            "width": best["width"], "height": best["height"], "duration": h["duration"], "fps": None,
            "files": [{"w": v["width"], "h": v["height"], "fps": None, "link": v["url"], "quality": v["size_name"]}
                      for v in vids],
            "preview": best.get("thumbnail"), "pictures": [best.get("thumbnail")] if best.get("thumbnail") else [],
        })
    return out


# ---------------------------------------------------------------- search
def shot_list(only=None):
    shots = load_json(SHOTS, {})["shots"]
    if only:
        ids = set(only.split(","))
        shots = [s for s in shots if s["id"] in ids]
    return shots


def fetch_img(url, dst: Path):
    if dst.exists():
        return dst
    dst.parent.mkdir(parents=True, exist_ok=True)
    try:
        r = requests.get(url, headers=UA, timeout=30)
        r.raise_for_status()
        dst.write_bytes(r.content)
        return dst
    except Exception as e:  # noqa: BLE001
        print(f"  thumb failed {url}: {e}", file=sys.stderr)
        return None


def make_sheet(shot, cands):
    """候補ごとに 5 コマのフィルムストリップを横に並べ、縦に候補を積んだ比較シート。"""
    rows = []
    tdir = THUMBS / shot["id"]
    for i, c in enumerate(cands[:12]):
        pics = c["pictures"] or ([c["preview"]] if c["preview"] else [])
        if not pics:
            continue
        idx = sorted(set(int(round(k * (len(pics) - 1) / 4)) for k in range(5)))
        frames = []
        for j in idx:
            p = fetch_img(pics[j], tdir / f"{c['provider']}_{c['id']}_{j}.jpg")
            if p:
                frames.append(str(p))
        if not frames:
            continue
        label = (f"#{i} {c['provider']}:{c['id']}  {c['width']}x{c['height']}  "
                 f"{c['fps'] or '?'}fps  {c['duration']}s  by {c['author']}  [{c['query']}]")
        row = tdir / f"row_{i}.jpg"
        subprocess.run(["montage", *frames, "-tile", f"{len(frames)}x1", "-geometry", "320x180+2+2",
                        "-background", "#111", str(row)], check=True)
        subprocess.run(["convert", str(row), "-gravity", "north", "-background", "#111", "-splice", "0x26",
                        "-fill", "#eee", "-pointsize", "16", "-annotate", "+0+4", label, str(row)], check=True)
        rows.append(str(row))
    if rows:
        SHEETS.mkdir(parents=True, exist_ok=True)
        out = SHEETS / f"{shot['id']}.jpg"
        subprocess.run(["convert", *rows, "-append", "-gravity", "north", "-background", "#000",
                        "-splice", "0x34", "-fill", "#fc6", "-pointsize", "20",
                        "-annotate", "+0+6", f"{shot['id']}  {shot['desc']}", str(out)], check=True)
        return out
    return None


def cmd_search(args):
    for shot in shot_list(args.shots):
        seen, cands = set(), []
        for q in shot["queries"]:
            results = []
            if args.provider in ("pexels", "all"):
                results += search_pexels(q)
            if args.provider in ("pixabay", "all"):
                results += search_pixabay(q)
            for c in results:
                k = (c["provider"], c["id"])
                if k not in seen:
                    seen.add(k)
                    cands.append(c)
        save_json(CAND / f"{shot['id']}.json", cands)
        sheet = make_sheet(shot, rank_candidates(shot, cands, set()))
        print(f"{shot['id']}: {len(cands)} candidates  sheet={sheet}")


# ---------------------------------------------------------------- scoring
def rank_candidates(shot, cands, used):
    need = shot.get("dur", 3.0) + 2.5  # 尺 + ハンドル
    def score(c):
        s = 0.0
        s += 2.0 if c["height"] >= 2160 else 1.0
        s += 1.0 if c["duration"] >= need * 1.6 else (0.5 if c["duration"] >= need else -2.0)
        s += max(0, 1.2 - 0.12 * c["rank"])
        s += 0.3 if shot["queries"].index(c["query"]) == 0 else 0
        if (c["provider"], c["id"]) in used:
            s -= 5.0
        return s
    return sorted(cands, key=score, reverse=True)


def cmd_autopick(args):
    selects = load_json(SELECTS, {})
    used = {(v["provider"], v["id"]) for v in selects.values() if isinstance(v, dict) and "provider" in v}
    for shot in shot_list(args.shots):
        if shot["id"] in selects and not selects[shot["id"]].get("auto"):
            continue
        cands = load_json(CAND / f"{shot['id']}.json", [])
        if not cands:
            print(f"{shot['id']}: no candidates")
            continue
        best = rank_candidates(shot, cands, used)[0]
        used.add((best["provider"], best["id"]))
        selects[shot["id"]] = {"provider": best["provider"], "id": best["id"], "auto": True,
                               "in": None, "note": "autopick: 要目視確認"}
        print(f"{shot['id']}: {best['provider']}:{best['id']} {best['width']}x{best['height']} {best['duration']}s")
    save_json(SELECTS, selects)


# ---------------------------------------------------------------- download
def find_candidate(shot_id, provider, vid):
    for c in load_json(CAND / f"{shot_id}.json", []):
        if c["provider"] == provider and c["id"] == vid:
            return c
    # 別ショットの候補リストにあるかもしれない
    for p in CAND.glob("*.json"):
        for c in load_json(p, []):
            if c["provider"] == provider and c["id"] == vid:
                return c
    return None


def pick_file(c, max_w=4096):
    files = [f for f in c["files"] if f["w"] <= max_w]
    return max(files, key=lambda f: (f["w"] * f["h"], f.get("fps") or 0))


def ffprobe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format",
                        str(path)], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def cmd_download(args):
    selects = load_json(SELECTS, {})
    manifest = load_json(MANIFEST, {})
    ids = set(args.shots.split(",")) if args.shots else None
    for shot_id, sel in selects.items():
        if ids and shot_id not in ids or not isinstance(sel, dict) or "provider" not in sel:
            continue
        c = find_candidate(shot_id, sel["provider"], sel["id"])
        if not c:
            print(f"{shot_id}: candidate metadata missing; run search first", file=sys.stderr)
            continue
        f = pick_file(c)
        dst = SRC / f"{c['provider']}_{c['id']}_{f['w']}x{f['h']}.mp4"
        if not dst.exists():
            dst.parent.mkdir(parents=True, exist_ok=True)
            print(f"{shot_id}: downloading {f['w']}x{f['h']} {f['link'][:80]}")
            with requests.get(f["link"], headers=UA, stream=True, timeout=60) as r:
                r.raise_for_status()
                tmp = dst.with_suffix(".part")
                with open(tmp, "wb") as fh:
                    for chunk in r.iter_content(1 << 20):
                        fh.write(chunk)
                tmp.rename(dst)
        info = ffprobe(dst)
        vs = next(s for s in info["streams"] if s["codec_type"] == "video")
        has_audio = any(s["codec_type"] == "audio" for s in info["streams"])
        num, den = (vs.get("r_frame_rate") or "0/1").split("/")
        lic = LICENSES[c["provider"]]
        sha1 = hashlib.sha1(dst.read_bytes()).hexdigest()
        asset_id = f"{c['provider']}_{c['id']}"
        manifest[asset_id] = {
            "asset_id": asset_id, "shots": sorted(set(manifest.get(asset_id, {}).get("shots", []) + [shot_id])),
            "provider": c["provider"], "provider_id": c["id"], "source_url": c["page_url"],
            "author": c["author"], "author_url": c["author_url"],
            "license": lic["name"], "license_url": lic["url"],
            "attribution_required": lic["attribution_required"],
            "credit": lic["credit"].format(author=c["author"]),
            "file": str(dst.relative_to(ROOT)), "file_url": f["link"],
            "width": vs["width"], "height": vs["height"], "fps": round(int(num) / max(1, int(den)), 3),
            "duration": float(info["format"]["duration"]), "codec": vs["codec_name"],
            "pix_fmt": vs.get("pix_fmt"), "color_transfer": vs.get("color_transfer"),
            "has_audio": has_audio, "sha1": sha1,
            "retrieved": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            "query": c["query"],
        }
        sel["file"] = str(dst.relative_to(ROOT))
        print(f"{shot_id}: ok {vs['width']}x{vs['height']} {manifest[asset_id]['fps']}fps "
              f"{manifest[asset_id]['duration']:.1f}s audio={has_audio}")
    save_json(MANIFEST, manifest)
    save_json(SELECTS, selects)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search")
    s.add_argument("--shots")
    s.add_argument("--provider", default="all")
    a = sub.add_parser("autopick")
    a.add_argument("--shots")
    d = sub.add_parser("download")
    d.add_argument("--shots")
    args = ap.parse_args()
    {"search": cmd_search, "autopick": cmd_autopick, "download": cmd_download}[args.cmd](args)


if __name__ == "__main__":
    main()
