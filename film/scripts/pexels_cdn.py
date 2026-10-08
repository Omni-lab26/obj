#!/usr/bin/env python3
"""Pexels の動画ID から、公開 CDN 上のプレビュー画像と動画ファイルを扱う（API キーが無い場合の経路）。

Pexels API の新規キー発行が停止中で、www.pexels.com もボット対策で取得できないため、
  1. 動画ページの URL（https://www.pexels.com/video/<slug>-<id>/）を Web 検索で集め（data/web_candidates.json）
  2. images.pexels.com のプレビュー（各動画15コマ）で比較シートを作り
  3. videos.pexels.com から、存在する解像度・fps のファイルを特定して取得する
素材は Pexels License（無料・帰属表示任意）。作者名は検索結果に出たものだけを記録する。

  python3 scripts/pexels_cdn.py probe            # 候補ごとに縦横・解像度・fps を調べ、比較シートを作る
  python3 scripts/pexels_cdn.py probe --shots C4-08
  python3 scripts/pexels_cdn.py download         # data/selects.json の選択を取得し manifest に記録
"""
import argparse
import concurrent.futures as cf
import datetime as dt
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "data" / "web_candidates.json"
PROBE = ROOT / "work" / "cdn_probe.json"
THUMBS = ROOT / "work" / "thumbs"
SHEETS = ROOT / "work" / "sheets"
SRC = ROOT / "work" / "src"
SELECTS = ROOT / "data" / "selects.json"
MANIFEST = ROOT / "data" / "manifest.json"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) seimei-no-kiseki-film/1.0"}
FPS = [25, 30, 24, 60, 50, 23, 29, 59, 48, 120]
SIZES = [("uhd", 3840, 2160), ("uhd", 4096, 2160), ("uhd", 2560, 1440), ("hd", 1920, 1080), ("hd", 2048, 1080)]
PREVIEW_IDX = [1, 4, 7, 10, 13]


def load(p, default):
    return json.loads(p.read_text()) if p.exists() else default


def save(p, data):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=1))


def exists(url):
    try:
        r = requests.get(url, headers={**UA, "Range": "bytes=0-0"}, timeout=15)
        return r.status_code in (200, 206)
    except requests.RequestException:
        return False


def file_url(vid, kind, w, h, fps):
    return f"https://videos.pexels.com/video-files/{vid}/{vid}-{kind}_{w}_{h}_{fps}fps.mp4"


def preview_url(vid, n):
    return f"https://images.pexels.com/videos/{vid}/pictures/preview-{n}.jpg"


def poster_size(vid):
    """free-video-<id>.jpg は元動画と同じ解像度で配信されるので、元の縦横が分かる。"""
    dst = THUMBS / str(vid) / "poster.jpg"
    if not dst.exists():
        try:
            r = requests.get(f"https://images.pexels.com/videos/{vid}/free-video-{vid}.jpg", headers=UA, timeout=30)
            if r.status_code != 200:
                return None
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_bytes(r.content)
        except requests.RequestException:
            return None
    wh = subprocess.run(["identify", "-format", "%w %h", str(dst)], capture_output=True, text=True).stdout.split()
    return (int(wh[0]), int(wh[1])) if len(wh) == 2 else None


def kind_for(w, h):
    s = min(w, h)
    return "uhd" if s >= 1440 else ("hd" if s >= 720 else "sd")


def scaled(W, H, w):
    h = W and H * w / W
    return sorted({int(h) // 2 * 2, int(round(h)), int(h)})


def probe_by_poster(vid, out):
    """16:9 以外（4096x2160 など）の素材: 元の縦横から命名を推定して確かめる。"""
    size = poster_size(vid)
    if not size:
        return out
    W, H = size
    out["orientation"] = "landscape" if W >= H else "portrait"
    if W < H:
        return out
    for fps in FPS:
        if exists(file_url(vid, kind_for(W, H), W, H, fps)):
            out["fps"] = fps
            out["files"].append({"w": W, "h": H, "url": file_url(vid, kind_for(W, H), W, H, fps)})
            break
    if out["fps"] is None:
        return out
    for w in (3840, 2560, 2048, 1920):
        if w >= W:
            continue
        for h in scaled(W, H, w):
            u = file_url(vid, kind_for(w, h), w, h, out["fps"])
            if exists(u):
                out["files"].append({"w": w, "h": h, "url": u})
                break
    return out


def probe_one(vid):
    """存在するファイル（解像度×fps）と、プレビュー画像の縦横を調べる。"""
    out = {"id": vid, "fps": None, "files": [], "orientation": None, "previews": []}
    for fps in FPS:
        if exists(file_url(vid, "sd", 640, 360, fps)) or exists(file_url(vid, "sd", 960, 540, fps)) \
                or exists(file_url(vid, "hd", 1280, 720, fps)):
            out["fps"] = fps
            break
    if out["fps"] is None:
        # 縦長（sd_360_640 など）かどうか
        for fps in FPS[:5]:
            if exists(file_url(vid, "sd", 360, 640, fps)) or exists(file_url(vid, "sd", 540, 960, fps)):
                out["orientation"] = "portrait"
                return out
        return out
    for kind, w, h in SIZES:
        if exists(file_url(vid, kind, w, h, out["fps"])):
            out["files"].append({"w": w, "h": h, "url": file_url(vid, kind, w, h, out["fps"])})
    return out


def probe_full(vid):
    out = probe_one(vid)
    if out["orientation"] != "portrait" and (out["fps"] is None or not out["files"]):
        out = probe_by_poster(vid, {"id": vid, "fps": None, "files": [], "orientation": None, "previews": []})
    if out["orientation"] == "portrait" or not out["files"]:
        return out
    tdir = THUMBS / str(vid)
    tdir.mkdir(parents=True, exist_ok=True)
    for n in PREVIEW_IDX:
        dst = tdir / f"p{n:02d}.jpg"
        if not dst.exists():
            try:
                r = requests.get(preview_url(vid, n), headers=UA, timeout=20)
                if r.status_code == 200:
                    dst.write_bytes(r.content)
            except requests.RequestException:
                pass
        if dst.exists():
            out["previews"].append(str(dst.relative_to(ROOT)))
    if out["previews"]:
        wh = subprocess.run(["identify", "-format", "%w %h", str(ROOT / out["previews"][0])],
                            capture_output=True, text=True).stdout.split()
        if len(wh) == 2:
            out["orientation"] = "landscape" if int(wh[0]) >= int(wh[1]) else "portrait"
    return out


def preview_from_video(vid, out):
    """CDN にプレビュー画像が無い動画: 小さい SD 版を取得してコマを抜き出す（尺も分かる）。"""
    tdir = THUMBS / str(vid)
    tdir.mkdir(parents=True, exist_ok=True)
    sd = tdir / "sd.mp4"
    if not sd.exists():
        fps = out["fps"]
        urls = [file_url(vid, "sd", 640, 360, fps), file_url(vid, "sd", 960, 540, fps),
                file_url(vid, "hd", 1280, 720, fps)] + [f["url"] for f in sorted(out["files"], key=lambda f: f["w"])]
        for u in urls:
            try:
                r = requests.get(u, headers=UA, timeout=60)
                if r.status_code == 200 and len(r.content) > 10000:
                    sd.write_bytes(r.content)
                    break
            except requests.RequestException:
                continue
    if not sd.exists():
        return out
    info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams",
                                      "-show_format", str(sd)], capture_output=True, text=True).stdout or "{}")
    v = next((x for x in info.get("streams", []) if x["codec_type"] == "video"), None)
    if not v:
        return out
    dur = float(info["format"]["duration"])
    out["duration"] = round(dur, 2)
    out["orientation"] = "landscape" if v["width"] >= v["height"] else "portrait"
    out["previews"] = []
    for k, frac in enumerate([0.07, 0.29, 0.5, 0.71, 0.93]):
        dst = tdir / f"v{k}.jpg"
        if not dst.exists():
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{dur * frac:.2f}", "-i", str(sd), "-frames:v", "1",
                            "-vf", "scale=387:-2", str(dst)])
        if dst.exists():
            out["previews"].append(str(dst.relative_to(ROOT)))
    return out


def cmd_fill(args):
    """ファイルはあるのにプレビューが無い候補を、SD 版から補う。"""
    probes = load(PROBE, {})
    todo = [v for v in probes.values() if v.get("files") and not v.get("previews")]
    print(f"filling previews for {len(todo)} videos")
    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        for res in ex.map(lambda v: preview_from_video(v["id"], v), todo):
            probes[str(res["id"])] = res
    save(PROBE, probes)
    web = load(WEB, {})
    shots = {s["id"]: s for s in load(ROOT / "data" / "shots.json", {})["shots"]}
    for sid, cands in web.items():
        make_sheet(sid, shots.get(sid, {}).get("desc", ""), cands, probes)


def make_sheet(shot_id, desc, cands, probes):
    rows = []
    for i, c in enumerate(cands):
        p = probes.get(str(c["id"]))
        if not p or not p["previews"] or p["orientation"] != "landscape" or not p["files"]:
            continue
        best = max(p["files"], key=lambda f: f["w"] * f["h"])
        if best["h"] < 1080:
            continue
        dur = f"{p['duration']:.0f}s " if p.get("duration") else ""
        label = f"#{i} id {c['id']}  {best['w']}x{best['h']} {p['fps']}fps {dur} {c.get('title', '')[:56]}"
        row = THUMBS / str(c["id"]) / "row.jpg"
        subprocess.run(["montage", *[str(ROOT / x) for x in p["previews"]], "-tile", f"{len(p['previews'])}x1",
                        "-geometry", "256x144+2+2", "-background", "#111", str(row)], check=True)
        subprocess.run(["convert", str(row), "-gravity", "north", "-background", "#111", "-splice", "0x24",
                        "-fill", "#eee", "-pointsize", "15", "-annotate", "+0+4", label, str(row)], check=True)
        rows.append(str(row))
    if not rows:
        return None
    SHEETS.mkdir(parents=True, exist_ok=True)
    out = SHEETS / f"{shot_id}.jpg"
    subprocess.run(["convert", *rows, "-append", "-gravity", "north", "-background", "#000", "-splice", "0x30",
                    "-fill", "#fc6", "-pointsize", "19", "-annotate", "+0+5", f"{shot_id}  {desc}", str(out)],
                   check=True)
    return out


def cmd_probe(args):
    web = load(WEB, {})
    shots = {s["id"]: s for s in load(ROOT / "data" / "shots.json", {})["shots"]}
    probes = load(PROBE, {})
    only = set(args.shots.split(",")) if args.shots else None
    done = {int(k) for k, v in probes.items() if v.get("files") or v.get("orientation") == "portrait"}
    if args.retry:
        done = {int(k) for k, v in probes.items() if v.get("files")}
    ids = sorted({c["id"] for k, cs in web.items() if not only or k in only for c in cs} - done)
    print(f"probing {len(ids)} videos")
    with cf.ThreadPoolExecutor(max_workers=16) as ex:
        for res in ex.map(probe_full, ids):
            probes[str(res["id"])] = res
    save(PROBE, probes)
    for sid, cands in web.items():
        if only and sid not in only:
            continue
        sheet = make_sheet(sid, shots.get(sid, {}).get("desc", ""), cands, probes)
        ok = [c for c in cands if probes.get(str(c["id"]), {}).get("files") and
              probes[str(c["id"])].get("orientation") == "landscape"]
        print(f"{sid}: {len(ok)}/{len(cands)} usable  sheet={sheet}")


def cmd_download(args):
    web = load(WEB, {})
    probes = load(PROBE, {})
    selects = load(SELECTS, {})
    manifest = load(MANIFEST, {})
    meta = {c["id"]: c for cs in web.values() for c in cs}
    only = set(args.shots.split(",")) if args.shots else None
    for sid, sel in selects.items():
        if only and sid not in only or not isinstance(sel, dict) or sel.get("provider") != "pexels":
            continue
        vid = int(sel["id"])
        p = probes.get(str(vid)) or probe_full(vid)
        files = sorted(p["files"], key=lambda f: f["w"] * f["h"])
        if not files:
            print(f"{sid}: no files for {vid}", file=sys.stderr)
            continue
        want_4k = args.res == "2160"
        f = files[-1] if want_4k else next((x for x in files if x["h"] >= 1080 and x["w"] <= 2048), files[-1])
        dst = SRC / f"pexels_{vid}_{f['w']}x{f['h']}.mp4"
        if not dst.exists():
            SRC.mkdir(parents=True, exist_ok=True)
            print(f"{sid}: downloading {vid} {f['w']}x{f['h']}")
            with requests.get(f["url"], headers=UA, stream=True, timeout=120) as r:
                r.raise_for_status()
                tmp = dst.with_suffix(".part")
                with open(tmp, "wb") as fh:
                    for chunk in r.iter_content(1 << 20):
                        fh.write(chunk)
                tmp.rename(dst)
        info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams",
                                          "-show_format", str(dst)], capture_output=True, text=True).stdout)
        vs = next(s for s in info["streams"] if s["codec_type"] == "video")
        num, den = vs["r_frame_rate"].split("/")
        m = meta.get(vid, {})
        aid = f"pexels_{vid}"
        entry = manifest.get(aid, {})
        entry.update({
            "asset_id": aid, "shots": sorted(set(entry.get("shots", []) + [sid])),
            "provider": "pexels", "provider_id": vid,
            "source_url": m.get("url") or f"https://www.pexels.com/video/{vid}/",
            "title": m.get("title"), "author": m.get("author") or "（Pexels 投稿者・名前未確認）",
            "author_url": None,
            "license": "Pexels License", "license_url": "https://www.pexels.com/license/",
            "attribution_required": False,
            "credit": f"Video by {m['author']} on Pexels" if m.get("author") else "Pexels",
            "file_url": f["url"], "width": vs["width"], "height": vs["height"],
            "fps": round(int(num) / max(1, int(den)), 3), "duration": float(info["format"]["duration"]),
            "codec": vs["codec_name"], "color_transfer": vs.get("color_transfer"),
            "has_audio": any(s["codec_type"] == "audio" for s in info["streams"]),
            "sha1": hashlib.sha1(dst.read_bytes()).hexdigest(),
            "retrieved": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        })
        entry[f"file_{'2160' if want_4k else '1080'}"] = str(dst.relative_to(ROOT))
        manifest[aid] = entry
        if want_4k:
            sel["file_2160"] = str(dst.relative_to(ROOT))
        else:
            sel["file"] = str(dst.relative_to(ROOT))
        print(f"{sid}: {vid} {vs['width']}x{vs['height']} {entry['fps']}fps {entry['duration']:.1f}s")
    save(MANIFEST, manifest)
    save(SELECTS, selects)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("probe")
    p.add_argument("--shots")
    p.add_argument("--retry", action="store_true", help="ファイルが見つからなかった候補を調べ直す")
    sub.add_parser("fill")
    d = sub.add_parser("download")
    d.add_argument("--shots")
    d.add_argument("--res", default="1080", choices=["1080", "2160"])
    args = ap.parse_args()
    {"probe": cmd_probe, "fill": cmd_fill, "download": cmd_download}[args.cmd](args)


if __name__ == "__main__":
    main()
