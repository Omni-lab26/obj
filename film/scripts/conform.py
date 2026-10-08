#!/usr/bin/env python3
"""選んだ素材を、編集用の統一フォーマットに整える（FFmpeg）。

  python3 scripts/conform.py --res 1080            # 1920x1080 用
  python3 scripts/conform.py --res 2160            # 4K 用（全ショットが 2160p 以上の素材のときのみ）
  python3 scripts/conform.py --res 1080 --shots C1-01,C1-02 --force
  python3 scripts/conform.py measure               # 各素材の明るさ・彩度を測る（色合わせの目安）

出力: public/clips/<shot>_<res>.mp4  （24fps, H.264, bt709, 前後に clip_handle 秒の余白付き）

data/selects.json のショットごとの指定:
  "in":   使い始める位置（素材の秒）。省略時は素材の 30% 付近から
  "speed": 再生速度（1.0 = 実時間）。省略時は「全コマを 24fps で再生」
           （25fps → 0.96倍、30fps → 0.8倍、60fps → 0.4倍のスロー。コマの重複・間引きによるカクつきが出ない）
  "crop": {"zoom": 1.0, "x": 0.5, "y": 0.5}   16:9 で切り出す範囲（zoom>1 で寄る。拡大で解像度が足りなくなる場合はエラー）
  "grade": {"exposure": 0.0, "contrast": 1.0, "saturation": 1.0, "gamma": 1.0, "temp": 6500}
  "stabilize": true      手ぶれ補正（vidstab 2パス）
  "denoise": true        軽いノイズ除去
  "hflip": true          左右反転（文字や地形に注意）
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "clips"
SIZES = {"1080": (1920, 1080), "2160": (3840, 2160)}


def load(p, default=None):
    p = ROOT / p
    return json.loads(p.read_text()) if p.exists() else default


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", str(path)],
                       capture_output=True, text=True, check=True)
    d = json.loads(r.stdout)
    v = next(s for s in d["streams"] if s["codec_type"] == "video")
    num, den = v.get("avg_frame_rate", "0/1").split("/")
    fps = int(num) / max(1, int(den))
    if fps <= 0:
        num, den = v["r_frame_rate"].split("/")
        fps = int(num) / max(1, int(den))
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(sd["rotation"])
    return {"w": v["width"], "h": v["height"], "fps": fps, "dur": float(d["format"]["duration"]),
            "transfer": v.get("color_transfer"), "primaries": v.get("color_primaries"), "rotation": rot}


def build_filter(info, sel, cfg, res, speed):
    W, H = SIZES[res]
    look = cfg["look"]
    f = []
    if info["transfer"] in ("smpte2084", "arib-std-b67"):
        # HDR（PQ/HLG）の素材は SDR bt709 にトーンマップ
        f.append("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,"
                 "zscale=t=bt709:m=bt709:r=tv,format=yuv420p")
    f.append(f"setpts=(PTS-STARTPTS)/{speed:.6f}")
    f.append(f"fps={cfg['fps']}")
    crop = sel.get("crop") or {}
    zoom = float(crop.get("zoom", 1.0))
    sw, sh = info["w"], info["h"]
    cw = min(sw, sh * 16 / 9) / zoom
    ch = cw * 9 / 16
    if ch < H * 0.98:
        raise ValueError(f"source too small for {res}p after crop: {sw}x{sh} zoom {zoom} → {cw:.0f}x{ch:.0f}")
    cx = (sw - cw) * float(crop.get("x", 0.5))
    cy = (sh - ch) * float(crop.get("y", 0.5))
    f.append(f"crop={int(cw) // 2 * 2}:{int(ch) // 2 * 2}:{int(cx)}:{int(cy)}")
    f.append(f"scale={W}:{H}:flags=lanczos")
    if sel.get("hflip"):
        f.append("hflip")
    if sel.get("denoise"):
        f.append("hqdn3d=1.2:1.2:5:5")
    g = sel.get("grade") or {}
    if "temp" in g:
        f.append(f"colortemperature=temperature={g['temp']}:mix=1:pl=1")
    f.append("eq=brightness={:.4f}:contrast={:.4f}:saturation={:.4f}:gamma={:.4f}".format(
        g.get("exposure", 0.0), g.get("contrast", 1.0), g.get("saturation", 1.0) * look["saturation"],
        g.get("gamma", 1.0)))
    f.append(f"curves=master='{look['curves_master']}'")
    f.append("format=yuv420p")
    return ",".join(f)


def stabilize_pre(src, ss, t, workdir):
    trf = workdir / (Path(src).stem + f"_{ss:.2f}.trf")
    if not trf.exists():
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{ss:.3f}", "-t", f"{t:.3f}", "-i", str(src),
                        "-vf", f"vidstabdetect=shakiness=5:accuracy=15:result={trf}", "-f", "null", "-"], check=True)
    return f"vidstabtransform=input={trf}:smoothing=20:zoom=2,unsharp=5:5:0.4:3:3:0.0"


def conform_shot(shot, sel, cfg, res, force):
    out = OUT / f"{shot['id']}_{res}.mp4"
    if out.exists() and not force:
        return out, "exists"
    key = "file_2160" if res == "2160" else "file"
    if not sel.get(key):
        raise ValueError(f"{shot['id']}: no source file for {res}p ({key} in selects.json)")
    src = ROOT / sel[key]
    info = probe(src)
    fps_out = cfg["fps"]
    speed = float(sel.get("speed") or fps_out / info["fps"])
    handle = cfg["clip_handle"]
    need_out = shot["clip_need_s"] + 2 * handle          # 出力側の秒数
    need_src = need_out * speed + 0.2                    # 素材側の秒数
    if need_src > info["dur"]:
        raise ValueError(f"{shot['id']}: source {info['dur']:.2f}s is shorter than needed {need_src:.2f}s "
                         f"(speed {speed:.2f}). Use a slower speed or another clip.")
    ss = sel.get("in")
    if ss is None:
        ss = max(0.3, 0.3 * (info["dur"] - need_src))
    ss = float(ss) - handle * speed
    ss = min(max(0.0, ss), info["dur"] - need_src)
    vf = build_filter(info, sel, cfg, res, speed)
    if sel.get("stabilize"):
        work = ROOT / "work" / "stab"
        work.mkdir(parents=True, exist_ok=True)
        vf = stabilize_pre(src, ss, need_src, work) + "," + vf
    OUT.mkdir(parents=True, exist_ok=True)
    crf = "14" if res == "1080" else "16"
    cmd = ["ffmpeg", "-v", "error", "-y", "-ss", f"{ss:.3f}", "-t", f"{need_src:.3f}", "-i", str(src),
           "-vf", vf, "-an", "-c:v", "libx264", "-preset", "medium", "-crf", crf, "-pix_fmt", "yuv420p",
           "-g", str(fps_out), "-keyint_min", str(fps_out), "-sc_threshold", "0",
           "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
           "-movflags", "+faststart", "-t", f"{need_out:.3f}", str(out)]
    subprocess.run(cmd, check=True)
    return out, f"{info['w']}x{info['h']}@{info['fps']:.2f} speed {speed:.2f} in {ss + handle * speed:.2f}s"


def measure(path, ss, t):
    r = subprocess.run(["ffmpeg", "-v", "info", "-ss", f"{ss:.2f}", "-t", f"{t:.2f}", "-i", str(path), "-vf",
                        "fps=2,scale=480:-2,signalstats,metadata=print", "-f", "null", "-"],
                       capture_output=True, text=True)
    vals = {}
    for k in ("YAVG", "YLOW", "YHIGH", "SATAVG", "UAVG", "VAVG"):
        xs = [float(x) for x in re.findall(rf"lavfi\.signalstats\.{k}=([\d.]+)", r.stderr)]
        if xs:
            vals[k] = round(sum(xs) / len(xs), 1)
    return vals


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", nargs="?", default="run", choices=["run", "measure"])
    ap.add_argument("--res", default="1080", choices=list(SIZES))
    ap.add_argument("--shots")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    cfg = load("data/config.json")
    edl = load("src/data/edl.json")
    selects = load("data/selects.json", {})
    only = set(args.shots.split(",")) if args.shots else None
    stats, errors = {}, []
    for shot in edl["shots"]:
        if only and shot["id"] not in only:
            continue
        sel = selects.get(shot["id"])
        if not isinstance(sel, dict) or not sel.get("file"):
            print(f"{shot['id']}: (no footage selected)")
            continue
        if args.cmd == "measure":
            stats[shot["id"]] = measure(ROOT / sel["file"], float(sel.get("in") or 0), 4.0)
            print(shot["id"], stats[shot["id"]])
            continue
        try:
            out, note = conform_shot(shot, sel, cfg, args.res, args.force)
            print(f"{shot['id']}: {note} → {out.relative_to(ROOT)}")
        except (ValueError, subprocess.CalledProcessError) as e:
            errors.append(f"{shot['id']}: {e}")
            print(f"{shot['id']}: ERROR {e}", file=sys.stderr)
    if args.cmd == "measure":
        (ROOT / "work").mkdir(exist_ok=True)
        (ROOT / "work" / "measure.json").write_text(json.dumps(stats, indent=1))
    if errors:
        print("\n".join(["", "errors:"] + errors), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
