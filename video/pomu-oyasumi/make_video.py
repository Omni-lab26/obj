#!/usr/bin/env python3
"""「ぽむの おやすみ かぞえうた」 — 未就学児向け・低刺激・キャラクター主導のアニメ動画を生成する。

レポートの推奨（キャラクター主導 / 低刺激・就寝向け / 長尺 / 字幕なしで成立）に沿った構成。
依存: Pillow, numpy, ffmpeg（libx264, aac）, IPA Pゴシック。

使い方:
    python3 make_video.py [出力ディレクトリ]
出力:
    pomu_oyasumi_kazoeuta.mp4  本編 (1920x1080, 24fps, 約2分45秒)
    thumbnail.jpg              サムネイル (1280x720)
    audio.wav                  BGM＋効果音（中間ファイル）
"""
import math
import os
import struct
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1920, 1080
FPS = 24
SR = 44100
FONT_PATH = "/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf"

# ---- 配色（低刺激・パステル） -------------------------------------------------
BG_TOP = (46, 51, 80)
BG_BOTTOM = (84, 92, 140)
CREAM = (253, 251, 243)
BODY = (246, 231, 180)
BODY_SHADE = (228, 208, 150)
CHEEK = (242, 184, 176)
EYE = (59, 59, 79)
STAR = (249, 233, 166)
MOON = (247, 236, 190)
SOFT_TEXT = (230, 226, 240)

# ---- タイムライン（秒） ----------------------------------------------------
T_TITLE = (0, 8)
T_INTRO = (8, 18)
T_COUNT = (18, 78)          # 5つの星、12秒ごと
T_COLOR = (78, 126)         # 4つの色、12秒ごと
T_SLEEP = (126, 156)
T_END = (156, 165)
TOTAL = T_END[1]

NUMBERS = [("1", "いち"), ("2", "に"), ("3", "さん"), ("4", "よん"), ("5", "ご")]
COLORS = [
    ("あか", "りんご", (226, 110, 100)),
    ("きいろ", "バナナ", (243, 216, 110)),
    ("むらさき", "ぶどう", (165, 130, 190)),
    ("みどり", "はっぱ", (140, 190, 140)),
]


# ---- ユーティリティ --------------------------------------------------------
def font(size):
    return ImageFont.truetype(FONT_PATH, size)


def sprite(size, draw_fn, scale=2):
    """2倍で描いて縮小し、アンチエイリアスの効いたRGBAスプライトを作る。"""
    w, h = size
    img = Image.new("RGBA", (w * scale, h * scale), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_fn(d, scale)
    return img.resize((w, h), Image.LANCZOS)


def ease(t):
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)


def paste(base, spr, center, alpha=1.0, scale=1.0):
    if alpha <= 0:
        return
    s = spr
    if scale != 1.0:
        s = spr.resize((max(1, int(spr.width * scale)), max(1, int(spr.height * scale))), Image.BILINEAR)
    if alpha < 1.0:
        a = s.getchannel("A").point(lambda v: int(v * alpha))
        s = s.copy()
        s.putalpha(a)
    x = int(center[0] - s.width / 2)
    y = int(center[1] - s.height / 2)
    base.alpha_composite(s, (x, y))


def text_layer(txt, size, color, center, alpha=1.0, shadow=True):
    f = font(size)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    if shadow:
        d.text((center[0] + 3, center[1] + 4), txt, font=f, fill=(20, 20, 40, int(120 * alpha)), anchor="mm")
    d.text(center, txt, font=f, fill=color + (int(255 * alpha),), anchor="mm")
    return layer


# ---- 背景 ------------------------------------------------------------------
def make_background():
    ys = np.linspace(0, 1, H)[:, None, None]
    top = np.array(BG_TOP, dtype=np.float32)[None, None, :]
    bot = np.array(BG_BOTTOM, dtype=np.float32)[None, None, :]
    arr = top + (bot - top) * ys
    arr = np.repeat(arr, W, axis=1)
    img = Image.fromarray(arr.astype(np.uint8), "RGB").convert("RGBA")
    # なだらかな丘
    d = ImageDraw.Draw(img)
    d.ellipse((-400, 820, 1500, 1500), fill=(62, 72, 112, 255))
    d.ellipse((900, 860, 2500, 1600), fill=(55, 64, 102, 255))
    return img


# ---- スプライト ------------------------------------------------------------
def make_pomu(eyes_open=True, mouth="smile"):
    def draw(d, s):
        cx, cy = 230 * s, 230 * s
        rx, ry = 200 * s, 180 * s
        # 影
        d.ellipse((cx - rx, cy - ry + 14 * s, cx + rx, cy + ry + 14 * s), fill=BODY_SHADE + (255,))
        d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=BODY + (255,))
        # 頭のふさ
        d.ellipse((cx - 18 * s, cy - ry - 22 * s, cx + 18 * s, cy - ry + 14 * s), fill=BODY + (255,))
        d.ellipse((cx + 10 * s, cy - ry - 30 * s, cx + 40 * s, cy - ry + 6 * s), fill=BODY + (255,))
        # ほっぺ
        d.ellipse((cx - 140 * s, cy + 10 * s, cx - 80 * s, cy + 50 * s), fill=CHEEK + (255,))
        d.ellipse((cx + 80 * s, cy + 10 * s, cx + 140 * s, cy + 50 * s), fill=CHEEK + (255,))
        # 目
        for ex in (cx - 70 * s, cx + 70 * s):
            if eyes_open:
                d.ellipse((ex - 16 * s, cy - 50 * s, ex + 16 * s, cy - 6 * s), fill=EYE + (255,))
                d.ellipse((ex - 2 * s, cy - 44 * s, ex + 8 * s, cy - 34 * s), fill=(255, 255, 255, 255))
            else:
                d.arc((ex - 20 * s, cy - 44 * s, ex + 20 * s, cy - 10 * s), 20, 160, fill=EYE + (255,), width=5 * s)
        # 口
        if mouth == "smile":
            d.arc((cx - 24 * s, cy + 8 * s, cx + 24 * s, cy + 40 * s), 20, 160, fill=EYE + (255,), width=5 * s)
        elif mouth == "o":
            d.ellipse((cx - 12 * s, cy + 14 * s, cx + 12 * s, cy + 38 * s), fill=EYE + (255,))
        else:  # sleeping
            d.arc((cx - 16 * s, cy + 12 * s, cx + 16 * s, cy + 34 * s), 20, 160, fill=EYE + (255,), width=4 * s)

    return sprite((460, 460), draw)


def make_hand():
    def draw(d, s):
        d.ellipse((0, 0, 70 * s, 70 * s), fill=BODY + (255,))
    return sprite((70, 70), draw)


def make_star(radius=60, color=STAR):
    size = radius * 3

    def draw(d, s):
        cx = cy = size * s / 2
        pts = []
        for i in range(10):
            r = radius * s if i % 2 == 0 else radius * s * 0.45
            a = -math.pi / 2 + i * math.pi / 5
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        d.polygon(pts, fill=color + (255,))

    star = sprite((size, size), draw)
    glow = star.filter(ImageFilter.GaussianBlur(radius * 0.35))
    glow_a = glow.getchannel("A").point(lambda v: int(v * 0.55))
    glow.putalpha(glow_a)
    out = Image.new("RGBA", star.size, (0, 0, 0, 0))
    out.alpha_composite(glow)
    out.alpha_composite(star)
    return out


def make_moon():
    def draw(d, s):
        d.ellipse((0, 0, 260 * s, 260 * s), fill=MOON + (255,))
        d.ellipse((70 * s, -30 * s, 330 * s, 230 * s), fill=(0, 0, 0, 0))
    base = sprite((300, 300), draw)
    glow = base.filter(ImageFilter.GaussianBlur(30))
    glow.putalpha(glow.getchannel("A").point(lambda v: int(v * 0.4)))
    out = Image.new("RGBA", base.size, (0, 0, 0, 0))
    out.alpha_composite(glow)
    out.alpha_composite(base)
    return out


def make_item(name, color):
    def draw(d, s):
        cx, cy = 150 * s, 150 * s
        if name == "りんご":
            d.ellipse((cx - 100 * s, cy - 90 * s, cx + 100 * s, cy + 100 * s), fill=color + (255,))
            d.ellipse((cx - 55 * s, cy - 70 * s, cx - 15 * s, cy - 30 * s), fill=(255, 255, 255, 70))
            d.rounded_rectangle((cx - 7 * s, cy - 130 * s, cx + 7 * s, cy - 80 * s), radius=6 * s, fill=(120, 90, 60, 255))
            d.ellipse((cx + 5 * s, cy - 130 * s, cx + 60 * s, cy - 100 * s), fill=(140, 190, 140, 255))
        elif name == "バナナ":
            d.arc((cx - 120 * s, cy - 110 * s, cx + 120 * s, cy + 90 * s), 20, 160, fill=color + (255,), width=52 * s)
            d.ellipse((cx + 90 * s, cy - 10 * s, cx + 118 * s, cy + 20 * s), fill=(120, 90, 60, 255))
        elif name == "ぶどう":
            r = 30 * s
            rows = [(-2, -70), (-1, -70), (0, -70), (1, -70), (2, -70), (-1.5, -20), (-0.5, -20), (0.5, -20), (1.5, -20), (-1, 30), (0, 30), (1, 30), (-0.5, 80), (0.5, 80), (0, 125)]
            for gx, gy in rows:
                x, y = cx + gx * 2 * r * 0.95, cy + gy * s
                d.ellipse((x - r, y - r, x + r, y + r), fill=color + (255,))
            d.rounded_rectangle((cx - 6 * s, cy - 140 * s, cx + 6 * s, cy - 95 * s), radius=5 * s, fill=(120, 90, 60, 255))
        else:  # はっぱ
            d.ellipse((cx - 120 * s, cy - 60 * s, cx + 120 * s, cy + 60 * s), fill=color + (255,))
            d.line((cx - 100 * s, cy, cx + 100 * s, cy), fill=(100, 150, 100, 255), width=5 * s)

    img = sprite((300, 300), draw)
    if name == "はっぱ":
        img = img.rotate(-30, resample=Image.BICUBIC)
    return img


# ---- 音声 ------------------------------------------------------------------
NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def freq(name):
    n, octv = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((NOTE[n] - 9) / 12 + (octv - 4))


def tone(f, dur, attack=0.05, release=0.3, harmonics=((1, 1.0), (2, 0.25), (3, 0.08))):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n, dtype=np.float32)
    for k, amp in harmonics:
        y += amp * np.sin(2 * math.pi * f * k * t).astype(np.float32)
    env = np.ones(n, dtype=np.float32)
    a = int(attack * SR)
    r = int(release * SR)
    if a > 0:
        env[:a] = np.linspace(0, 1, a)
    if r > 0 and r < n:
        env[-r:] = np.linspace(1, 0, r)
    return y * env


def chime(f, dur=2.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = (np.sin(2 * math.pi * f * t) * np.exp(-t * 2.2)
         + 0.35 * np.sin(2 * math.pi * f * 2.0 * t) * np.exp(-t * 3.5)
         + 0.15 * np.sin(2 * math.pi * f * 3.0 * t) * np.exp(-t * 5.0))
    return y.astype(np.float32)


def build_audio(path):
    total_n = int(TOTAL * SR)
    mix = np.zeros(total_n, dtype=np.float32)

    def add(sig, at, gain):
        i = int(at * SR)
        j = min(total_n, i + len(sig))
        if j > i:
            mix[i:j] += sig[: j - i] * gain

    bar = 4.0  # 60bpm、4/4
    chords = [("C3", "E3", "G3"), ("A2", "C3", "E3"), ("F2", "A2", "C3"), ("G2", "B2", "D3")]
    # 子守唄風メロディ（1小節=4拍、各要素=(音, 拍)）
    melody = [
        [("E4", 1), ("G4", 1), ("A4", 1), ("G4", 1)],
        [("E4", 1.5), ("D4", 0.5), ("C4", 2)],
        [("A3", 1), ("C4", 1), ("D4", 1), ("C4", 1)],
        [("D4", 1.5), ("E4", 0.5), ("D4", 2)],
        [("E4", 1), ("G4", 1), ("A4", 1), ("G4", 1)],
        [("E4", 1.5), ("D4", 0.5), ("C4", 2)],
        [("A3", 1), ("C4", 1), ("D4", 1), ("E4", 1)],
        [("C4", 4)],
    ]
    t0 = 0.0
    bar_i = 0
    while t0 < TOTAL - 2:
        ch = chords[bar_i % len(chords)]
        for nm in ch:
            add(tone(freq(nm), bar + 0.4, attack=1.2, release=1.2, harmonics=((1, 1.0), (2, 0.12))), t0, 0.045)
        if T_INTRO[0] <= t0 < T_END[0]:
            beat_t = t0
            for nm, beats in melody[bar_i % len(melody)]:
                add(tone(freq(nm), beats * 1.0, attack=0.04, release=0.35), beat_t, 0.07)
                beat_t += beats
        t0 += bar
        bar_i += 1

    # 効果音：星が出るとき、色が出るとき
    for k in range(5):
        add(chime(freq(["C5", "D5", "E5", "G5", "A5"][k])), T_COUNT[0] + 12 * k + 1.0, 0.16)
    for k in range(4):
        add(chime(freq(["G4", "A4", "C5", "D5"][k])), T_COLOR[0] + 12 * k + 1.0, 0.13)
    # おやすみ：最後の優しい鐘
    add(chime(freq("C5"), 4.0), T_SLEEP[0] + 1.0, 0.12)
    add(chime(freq("G4"), 5.0), T_SLEEP[0] + 12.0, 0.10)

    # 全体フェードアウト
    fade = int(5 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade).astype(np.float32)
    peak = float(np.max(np.abs(mix))) or 1.0
    mix = mix / peak * 0.6
    pcm = (mix * 32767).astype(np.int16)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())


# ---- フレーム生成 ----------------------------------------------------------
class Scene:
    def __init__(self):
        self.bg = make_background()
        self.pomu_open = make_pomu(True, "smile")
        self.pomu_blink = make_pomu(False, "smile")
        self.pomu_o = make_pomu(True, "o")
        self.pomu_sleep = make_pomu(False, "sleep")
        self.hand = make_hand()
        self.star = make_star(60)
        self.star_small = make_star(22, (220, 215, 240))
        self.moon = make_moon()
        self.items = {name: make_item(name, col) for _, name, col in COLORS}
        rng = np.random.default_rng(7)
        self.bg_stars = [(int(x), int(y), float(p)) for x, y, p in zip(rng.uniform(40, W - 40, 28), rng.uniform(40, 560, 28), rng.uniform(0, 6.28, 28))]
        self.blinks = [8 + i * 4.3 for i in range(60)]

    def pomu_sprite(self, t, sleeping=False, mouth_o=False):
        if sleeping:
            return self.pomu_sleep
        for b in self.blinks:
            if b <= t < b + 0.16:
                return self.pomu_blink
        return self.pomu_o if mouth_o else self.pomu_open

    def frame(self, t):
        img = self.bg.copy()
        # 背景の小さな星（ゆっくりまたたく）
        for x, y, p in self.bg_stars:
            a = 0.35 + 0.3 * math.sin(t * 0.6 + p)
            paste(img, self.star_small, (x, y), alpha=a)

        breath = 1 + 0.02 * math.sin(2 * math.pi * t / 4.0)
        pomu_pos = (560, 700)

        if t < T_TITLE[1]:
            fade = ease((t - 0.5) / 1.5)
            paste(img, self.pomu_sprite(t), pomu_pos, alpha=fade, scale=breath)
            img.alpha_composite(text_layer("ぽむの おやすみ かぞえうた", 96, CREAM, (1250, 420), alpha=fade))
            img.alpha_composite(text_layer("1 から 5 と、よっつの いろ", 54, SOFT_TEXT, (1250, 540), alpha=ease((t - 1.5) / 1.5)))

        elif t < T_INTRO[1]:
            lt = t - T_INTRO[0]
            paste(img, self.pomu_sprite(t, mouth_o=(2.0 < lt < 3.5)), pomu_pos, scale=breath)
            # 手をふる
            wave_a = math.sin(lt * 3.0) * 0.5 if lt < 6 else 0.0
            hx = pomu_pos[0] + 230 + 40 * math.cos(wave_a - 0.4)
            hy = pomu_pos[1] - 20 - 90 * math.sin(wave_a + 0.6)
            paste(img, self.hand, (hx, hy))
            a = ease((lt - 1.0) / 1.0) * (1 - ease((lt - 8.0) / 1.5))
            img.alpha_composite(text_layer("こんばんは、ぽむだよ", 80, CREAM, (1250, 400), alpha=a))
            img.alpha_composite(text_layer("おほしさまを いっしょに かぞえよう", 56, SOFT_TEXT, (1250, 520), alpha=ease((lt - 3.5) / 1.0) * (1 - ease((lt - 8.0) / 1.5))))

        elif t < T_COUNT[1]:
            lt = t - T_COUNT[0]
            k = int(lt // 12)
            st = lt - 12 * k
            paste(img, self.pomu_sprite(t, mouth_o=(1.0 < st < 2.2)), pomu_pos, scale=breath)
            # これまでの星（並んで浮かぶ）
            for i in range(k + 1):
                ex, ey = 1000 + i * 190, 330
                if i < k:
                    paste(img, self.star, (ex, ey + 8 * math.sin(t + i)), alpha=1.0)
                else:
                    p = ease((st - 0.6) / 1.6)
                    sx = ex + (1 - p) * 500
                    sy = ey - (1 - p) * 300 + 8 * math.sin(t + i)
                    paste(img, self.star, (sx, sy), alpha=p, scale=0.6 + 0.4 * p)
            num, yomi = NUMBERS[k]
            a = ease((st - 2.0) / 1.0) * (1 - ease((st - 11.0) / 1.0))
            img.alpha_composite(text_layer(num, 260, CREAM, (1380, 620), alpha=a))
            img.alpha_composite(text_layer(yomi, 84, SOFT_TEXT, (1380, 800), alpha=a))

        elif t < T_COLOR[1]:
            lt = t - T_COLOR[0]
            k = int(lt // 12)
            st = lt - 12 * k
            paste(img, self.pomu_sprite(t, mouth_o=(1.0 < st < 2.2)), pomu_pos, scale=breath)
            colname, item, col = COLORS[k]
            p = ease((st - 0.5) / 1.8)
            out = ease((st - 11.0) / 1.0)
            iy = 430 - (1 - p) * 260 + 10 * math.sin(t * 0.8)
            paste(img, self.items[item], (1380, iy), alpha=p * (1 - out), scale=0.9 + 0.5 * p)
            a = ease((st - 2.2) / 1.0) * (1 - out)
            img.alpha_composite(text_layer(colname, 150, col, (1380, 740), alpha=a))
            img.alpha_composite(text_layer(item, 80, SOFT_TEXT, (1380, 880), alpha=a))

        elif t < T_SLEEP[1]:
            lt = t - T_SLEEP[0]
            sleeping = lt > 10
            p = ease(lt / 20.0)
            paste(img, self.moon, (1700, 760 - 480 * p), alpha=ease(lt / 3.0))
            slow_breath = 1 + 0.025 * math.sin(2 * math.pi * t / 6.0)
            paste(img, self.pomu_sprite(t, sleeping=sleeping), pomu_pos, scale=slow_breath)
            a1 = ease((lt - 1.0) / 1.5) * (1 - ease((lt - 9.0) / 1.0))
            img.alpha_composite(text_layer("おほしさま、ぜんぶ かぞえたね", 72, CREAM, (1200, 380), alpha=a1))
            a2 = ease((lt - 11.0) / 2.0) * (1 - ease((lt - 28.0) / 2.0))
            img.alpha_composite(text_layer("おやすみなさい", 110, CREAM, (1050, 430), alpha=a2))

        else:
            lt = t - T_END[0]
            a = ease(lt / 1.5) * (1 - ease((lt - 7.0) / 2.0))
            paste(img, self.pomu_sleep, (960, 640), alpha=a, scale=0.8)
            img.alpha_composite(text_layer("また あした ね", 100, CREAM, (960, 300), alpha=a))

        return img


def render_video(out_dir):
    audio_path = os.path.join(out_dir, "audio.wav")
    build_audio(audio_path)
    scene = Scene()
    mp4 = os.path.join(out_dir, "pomu_oyasumi_kazoeuta.mp4")
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-i", audio_path,
        "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", mp4,
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    n_frames = TOTAL * FPS
    for i in range(n_frames):
        img = scene.frame(i / FPS)
        proc.stdin.write(img.convert("RGB").tobytes())
        if i % (FPS * 10) == 0:
            print(f"  {i // FPS:3d}s / {TOTAL}s", flush=True)
    proc.stdin.close()
    proc.wait()
    if proc.returncode != 0:
        raise SystemExit(f"ffmpeg failed: {proc.returncode}")

    # サムネイル
    thumb = scene.bg.copy()
    for x, y, p in scene.bg_stars:
        paste(thumb, scene.star_small, (x, y), alpha=0.5)
    paste(thumb, scene.pomu_open, (520, 640), scale=1.25)
    for i in range(5):
        paste(thumb, scene.star, (1000 + i * 190, 300))
    thumb.alpha_composite(text_layer("おやすみ", 150, CREAM, (1330, 560)))
    thumb.alpha_composite(text_layer("かぞえうた 1〜5", 110, STAR, (1330, 760)))
    thumb.convert("RGB").resize((1280, 720), Image.LANCZOS).save(os.path.join(out_dir, "thumbnail.jpg"), quality=92)
    return mp4


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
    os.makedirs(out, exist_ok=True)
    print("rendering ->", out)
    print(render_video(out))
