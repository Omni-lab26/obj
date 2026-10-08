#!/usr/bin/env python3
"""ショットリスト + 曲の解析結果 から編集タイムライン（EDL）を作る。

  python3 scripts/build_edl.py

入力:  data/shots.json, data/config.json, data/music.json（無ければ仮の拍グリッド）,
       data/selects.json（素材の割り当て・ショットごとの上書き）
出力:  src/data/edl.json        Remotion が読むタイムライン
       docs/timing_sheet.md     カットごとの時刻表（音楽なし版に投稿先で曲を付けるときの合わせ位置）
       docs/timing_sheet.csv

カットの決め方:
  1. 章の開始位置を config.chapter_anchors で決め、曲の構造の区切り（無ければアクセント拍）に吸着
  2. 章の中はショットの目安秒数に比例配分
  3. 各カットを、次のショットの sync 指定に応じて拍に吸着
       beat     近くの拍
       downbeat 近くのアクセント拍（強く鳴る拍）
       hit      近くの強いアタック
       free     吸着しない（呼吸・余韻を残すため）
"""
import csv
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load(p, default=None):
    p = ROOT / p
    return json.loads(p.read_text()) if p.exists() else default


def provisional_music(cfg):
    """曲が無い間の仮グリッド。資料にある『テンポが上がり続け、最後は最初の約3倍』を模す。"""
    dur = cfg["music"]["provisional_duration"]
    beats, strength, t, i = [], [], 0.0, 0
    while t < dur - 0.3:
        beats.append(round(t, 3))
        strength.append(1.0 if i % 4 == 0 else 0.5)
        bpm = 66 + (198 - 66) * (t / dur) ** 1.4
        t += 60.0 / bpm
        i += 1
    accents = [b for b, s in zip(beats, strength) if s >= 1.0]
    n_sec = 6
    sections = [{"start": round(dur * k / n_sec, 2), "end": round(dur * (k + 1) / n_sec, 2),
                 "energy": round(0.3 + 0.12 * k, 2)} for k in range(n_sec)]
    return {"provisional": True, "duration": dur, "start_sound": 0.0, "end_sound": dur, "ending": "unknown",
            "beats": beats, "beat_strength": strength, "downbeats": accents, "sections": sections,
            "hits": [], "energy": []}


def music_file(cfg):
    for c in cfg["music"]["file_candidates"]:
        if (ROOT / c).exists():
            return c
    return None


def nearest(cands, target, lo, hi, weights=None):
    best, best_score = None, -1e9
    for k, t in enumerate(cands):
        if t < lo or t > hi:
            continue
        w = weights[k] if weights else 1.0
        score = w - abs(t - target) * 0.9
        if score > best_score:
            best, best_score = t, score
    return best


def main():
    cfg = load("data/config.json")
    sh = load("data/shots.json")
    selects = load("data/selects.json", {})
    fps = cfg["fps"]

    mfile = music_file(cfg)
    music = load("data/music.json")
    if not music or not mfile or music.get("provisional"):
        music = provisional_music(cfg)
        mfile_used = None
    else:
        mfile_used = mfile
    m0 = cfg["music"]["offset"]
    m_end = m0 + music["end_sound"]
    mdur = music["end_sound"]

    beats = [m0 + b for b in music["beats"]]
    bstr = music.get("beat_strength") or [0.5] * len(beats)
    accents = [m0 + b for b in music.get("downbeats", [])]
    hits = [m0 + h for h in music.get("hits", [])]
    sec_bounds = [m0 + s["start"] for s in music["sections"]]
    snap = cfg["snap"]

    # ---------------------------------------------------------- 章の開始位置
    anchors = cfg["chapter_anchors"]
    chapters = sh["chapters"]
    ch_start = {}
    for ch in chapters:
        a = anchors[str(ch["id"])]
        if a.get("at") == "film_start":
            t = 0.0
        elif "music_frac" in a:
            target = m0 + mdur * a["music_frac"]
            t = nearest(sec_bounds, target, target - snap["section_window"], target + snap["section_window"])
            if t is None:
                t = nearest(accents, target, target - snap["accent_window"], target + snap["accent_window"])
            if t is None:
                t = nearest(beats, target, target - 1, target + 1, bstr) or target
        elif "music_at" in a:
            t = m0 + a["music_at"]
        elif "music_end" in a:
            t = m_end + a["music_end"]
        else:
            raise ValueError(a)
        ch_start[ch["id"]] = round(t * fps) / fps
    last_ch = chapters[-1]["id"]
    shots_end = ch_start[last_ch] + cfg["chapter6_len"]
    ch_end = {}
    ids = [c["id"] for c in chapters]
    for i, cid in enumerate(ids):
        ch_end[cid] = ch_start[ids[i + 1]] if i + 1 < len(ids) else shots_end

    # ---------------------------------------------------------- 章ごとの配分
    def shot_over(s):
        o = selects.get(s["id"], {}) if isinstance(selects.get(s["id"]), dict) else {}
        return {**s, **{k: o[k] for k in ("dur", "sync", "transition_in", "drop", "hold") if k in o}}

    timeline = []
    for ch in chapters:
        cid = ch["id"]
        L = ch_end[cid] - ch_start[cid]
        items = [shot_over(s) for s in sh["shots"] if s["chapter"] == cid]
        items = [s for s in items if not s.get("drop")]
        min_avg = 1.25 if cid == 4 else 1.7
        # 章が短すぎる場合は optional のショットを後ろから外す
        while len(items) > 1 and L / len(items) < min_avg:
            opt = [s for s in items if s.get("optional")]
            if not opt:
                break
            items.remove(opt[-1])
        W = sum(s["dur"] for s in items)
        mn = snap["min_shot_fast"] if cid == 4 else snap["min_shot"]
        cuts = [ch_start[cid]]
        acc = ch_start[cid]
        for i, s in enumerate(items[:-1]):
            acc += s["dur"] * L / W
            nxt = items[i + 1]
            remaining = len(items) - (i + 1)
            lo = max(cuts[-1] + mn, acc - 0.6)
            hi = min(ch_end[cid] - mn * remaining, acc + 0.6)
            t = None
            sync = nxt.get("sync", "beat")
            if sync == "hit":
                t = nearest(hits, acc, max(lo, acc - snap["accent_window"]), min(hi, acc + snap["accent_window"]))
                sync = "downbeat" if t is None else sync
            if t is None and sync == "downbeat":
                t = nearest(accents, acc, max(lo, acc - snap["accent_window"]), min(hi, acc + snap["accent_window"]))
                sync = "beat" if t is None else sync
            if t is None and sync == "beat":
                t = nearest(beats, acc, max(lo, acc - snap["beat_window"]), min(hi, acc + snap["beat_window"]), bstr)
            if t is None:
                t = min(max(acc, lo), hi)
            cuts.append(t)
        cuts.append(ch_end[cid])
        for i, s in enumerate(items):
            timeline.append({"shot": s, "t0": cuts[i], "t1": cuts[i + 1], "chapter": cid})

    # ---------------------------------------------------------- フレーム化とトランジション
    tr = cfg["transitions"]
    H = cfg["clip_handle"]
    out_shots = []
    for k, item in enumerate(timeline):
        s = item["shot"]
        f0, f1 = round(item["t0"] * fps), round(item["t1"] * fps)
        kind_in = s.get("transition_in", "cut")
        if k == 0:
            kind_in = "fade_from_black"
        if kind_in == "dissolve":
            ov = tr["dissolve_frames"]
        elif kind_in == "match":
            ov = tr["match_frames"]
        else:
            ov = 0
        pre = ov // 2
        nxt_kind = timeline[k + 1]["shot"].get("transition_in", "cut") if k + 1 < len(timeline) else None
        nxt_ov = {"dissolve": tr["dissolve_frames"], "match": tr["match_frames"]}.get(nxt_kind, 0)
        post = nxt_ov - nxt_ov // 2
        fade_in = ov if kind_in in ("dissolve", "match") else (tr["fade_from_black_frames"] if kind_in == "fade_from_black" else 0)
        fade_out = tr["fade_to_black_frames"] if k == len(timeline) - 1 else 0
        sel = selects.get(s["id"]) if isinstance(selects.get(s["id"]), dict) else None
        src_rel = None
        for res in ("1080",):
            cand = ROOT / "public" / "clips" / f"{s['id']}_{res}.mp4"
            if cand.exists():
                src_rel = f"clips/{s['id']}"
        out_shots.append({
            "id": s["id"], "chapter": item["chapter"], "kind": s["kind"], "desc": s["desc"],
            "queries": s["queries"], "hold": bool(s.get("hold")), "sync": s.get("sync", "beat"),
            "cut_frame": f0, "end_frame": f1,
            "from": f0 - pre, "dur": (f1 + post) - (f0 - pre),
            "fade_in": fade_in, "fade_out": fade_out, "transition_in": kind_in,
            "clip": src_rel, "clip_trim": int(round(H * fps)) - pre,
            "clip_need_s": round(((f1 + post) - (f0 - pre)) / fps, 3),
            "move": (sel or {}).get("move"),
            "amb": s.get("amb", []), "fx": s.get("fx", []), "text": s.get("text"),
            "source": ({"provider": sel.get("provider"), "id": sel.get("id")} if sel and "provider" in sel else None),
        })

    # ---------------------------------------------------------- 文字
    texts = []
    tdefs = sh["texts"]
    for s in out_shots:
        if not s["text"]:
            continue
        d = tdefs[s["text"]]
        if d["style"] == "era":
            a, b = s["cut_frame"] + int(0.7 * fps), s["end_frame"] - int(0.3 * fps)
        else:
            a, b = s["cut_frame"] + int(1.0 * fps), s["end_frame"] - int(0.2 * fps)
        texts.append({"id": s["text"], "from": a, "dur": max(int(2.2 * fps), b - a), "text": d["text"],
                      "style": d["style"]})
    t_title = round(shots_end * fps)
    tl = round(cfg["title_len"] * fps)
    texts.append({"id": "title", "from": t_title, "dur": tl, "text": tdefs["title"]["text"],
                  "sub": tdefs["title"].get("sub"), "style": "title"})
    cr_from = t_title + tl
    cr_len = round(cfg["credits_len"] * fps)
    total = cr_from + cr_len + round(cfg["end_black"] * fps)

    edl = {
        "title": cfg["title"], "fps": fps, "width": cfg["width"], "height": cfg["height"],
        "durationInFrames": total,
        "provisional_music": bool(music.get("provisional")),
        "music": {"file": mfile_used, "offset_frames": round(m0 * fps), "offset_s": m0,
                  "end_s": round(m_end, 3), "duration_s": music["duration"]},
        "chapters": [{"id": c["id"], "name": c["name"], "en": c["en"], "from": round(ch_start[c["id"]] * fps),
                      "to": round(ch_end[c["id"]] * fps)} for c in chapters],
        "shots": out_shots,
        "texts": texts,
        "credits": {"from": cr_from, "dur": cr_len},
        "intentional_black": [
            {"from": 0, "to": out_shots[0]["from"] + out_shots[0]["fade_in"], "why": "冒頭の暗闇からのフェードイン"},
            {"from": out_shots[-1]["end_frame"] - out_shots[-1]["fade_out"] // 2, "to": total,
             "why": "余韻のフェードアウト → タイトル・クレジット（黒地）"},
        ],
    }
    (ROOT / "src" / "data").mkdir(parents=True, exist_ok=True)
    (ROOT / "src" / "data" / "edl.json").write_text(json.dumps(edl, ensure_ascii=False, indent=1))
    write_timing_sheet(edl, music, m0)
    n_clip = sum(1 for s in out_shots if s["clip"])
    print(f"EDL: {len(out_shots)} shots ({n_clip} with footage), {total} frames = {total / fps:.2f}s, "
          f"music {'PROVISIONAL' if music.get('provisional') else mfile_used} @ {m0}s → {m_end:.2f}s")
    for c in edl["chapters"]:
        print(f"  ch{c['id']} {c['name']:<10} {c['from'] / fps:7.2f} – {c['to'] / fps:7.2f}")


def tc(frames, fps):
    s = frames / fps
    return f"{int(s // 60):d}:{s % 60:05.2f}"


def write_timing_sheet(edl, music, m0):
    fps = edl["fps"]
    rows = []
    for s in edl["shots"]:
        t = s["cut_frame"] / fps
        rows.append({"shot": s["id"], "chapter": s["chapter"], "film_tc": tc(s["cut_frame"], fps),
                     "film_s": round(t, 3), "music_s": round(t - m0, 3) if t >= m0 else "",
                     "len_s": round((s["end_frame"] - s["cut_frame"]) / fps, 2), "sync": s["sync"],
                     "transition": s["transition_in"], "desc": s["desc"]})
    with open(ROOT / "docs" / "timing_sheet.csv", "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    lines = [
        "# タイミングシート",
        "",
        f"- 全長: {tc(edl['durationInFrames'], fps)}（{edl['durationInFrames']} frames @ {fps}fps）",
        f"- 曲の開始位置: 映像の **{m0:.2f} 秒**（= {tc(round(m0 * fps), fps)}）。曲の頭（最初の音）をここに合わせる。",
        f"- 曲の終わり: 映像の {edl['music']['end_s']:.2f} 秒",
        "- 状態: " + ("**仮**（曲ファイル未解析。仮の拍グリッドで組んでいる）" if edl["provisional_music"]
                     else f"解析済み（{edl['music']['file']}）"),
        "",
        "投稿先で公式音源を付ける場合: 音楽なし版を読み込み、曲の頭を上の開始位置に置く。"
        "下表の music_s は曲の頭からの秒数で、各カットが曲のどこに当たるかを示す。",
        "",
        "## 章",
        "",
        "| 章 | 名前 | 開始 | 終了 |",
        "|---|---|---|---|",
    ]
    for c in edl["chapters"]:
        lines.append(f"| {c['id']} | {c['name']} | {tc(c['from'], fps)} | {tc(c['to'], fps)} |")
    lines += ["", "## カット", "", "| ショット | 映像TC | 曲の位置(秒) | 長さ | 同期 | つなぎ | 内容 |",
              "|---|---|---|---|---|---|---|"]
    for r in rows:
        lines.append(f"| {r['shot']} | {r['film_tc']} | {r['music_s']} | {r['len_s']}s | {r['sync']} | "
                     f"{r['transition']} | {r['desc']} |")
    (ROOT / "docs" / "timing_sheet.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
