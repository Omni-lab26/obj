#!/usr/bin/env python3
"""環境音を合成して work/amb/<tag>.wav を作る（外部素材なし・権利上の制約なし）。

  python3 scripts/ambience.py            # 全タグ
  python3 scripts/ambience.py rain surf  # 指定タグのみ

各タグは 60 秒・48kHz・ステレオ・ループ可能。ラウドネスは -20 LUFS にそろえ、
実際の音量は mix_audio.py が映像に合わせて決める。

タグ: rumble lava surf thunder wind wind_soft space underwater underwater_close bubbles
      water_lap forest_air wings waterfall rain stream drip birds_far boom(単発)
実録音に差し替えたい場合は、同名の wav を work/amb/ に置けばそちらが使われる
（mix_audio.py は work/amb_override/<tag>.wav を優先する）。
"""
import sys
import zlib
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "work" / "amb"
SR = 48000
DUR = 60.0
XF = 2.0


# ------------------------------------------------------------------ 基本部品
def rng_for(tag, ch=0):
    # 再実行しても同じ音になるよう、文字列から安定したシードを作る
    return np.random.default_rng(zlib.crc32(f"{tag}:{ch}".encode()))


def white(n, r):
    return r.standard_normal(n)


def pink(n, r):
    # 周波数領域で 1/f 形状
    X = np.fft.rfft(r.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    f[0] = 1
    X /= np.sqrt(f)
    y = np.fft.irfft(X, n)
    return y / (np.abs(y).max() + 1e-9)


def brown(n, r):
    X = np.fft.rfft(r.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    f[0] = 1
    X /= f
    X[: int(30 * n / SR)] = 0  # 30Hz 以下を除去（DC・聞こえない超低域でヘッドルームを使わない）
    y = np.fft.irfft(X, n)
    return y / (np.abs(y).max() + 1e-9)


def bp(x, lo, hi, order=4):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lp(x, f, order=4):
    return signal.sosfilt(signal.butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, order=4):
    return signal.sosfilt(signal.butter(order, f, btype="high", fs=SR, output="sos"), x)


def smooth_rand(n, rate, r, lo=0.0, hi=1.0):
    """rate Hz 程度でゆっくり変わる乱数カーブ（3次補間）。"""
    k = max(4, int(n / SR * rate) + 4)
    pts = r.uniform(lo, hi, k)
    xs = np.linspace(0, n, k)
    from scipy.interpolate import CubicSpline
    return np.clip(CubicSpline(xs, pts)(np.arange(n)), min(lo, hi), max(lo, hi))


def shaped_noise(n, r, centers, widths, gains, frame=2048):
    """時間とともに中心周波数・帯域・音量が変わるノイズ（STFT 上で整形）。
    centers/widths/gains はサンプル長 n の配列（Hz, オクターブ幅, 線形）。"""
    f, t, Z = signal.stft(white(n, r), fs=SR, nperseg=frame)
    idx = np.clip((t * SR).astype(int), 0, n - 1)
    c = centers[idx][None, :]
    w = widths[idx][None, :]
    g = gains[idx][None, :]
    ff = np.maximum(f, 1.0)[:, None]
    shape = np.exp(-0.5 * (np.log2(ff / c) / w) ** 2) * g
    _, y = signal.istft(Z * shape, fs=SR, nperseg=frame)
    y = y[:n]
    if len(y) < n:
        y = np.pad(y, (0, n - len(y)))
    return y


def reverb(x, rt60=1.2, mix=0.3, r=None, predelay=0.01):
    r = r or np.random.default_rng(7)
    n = int(rt60 * SR)
    t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-6.9 * t / rt60)
    ir = lp(ir, 6000, 2)
    ir = np.concatenate([np.zeros(int(predelay * SR)), ir])
    ir /= np.sqrt((ir ** 2).sum())
    wet = signal.fftconvolve(x, ir)[: len(x)]
    return (1 - mix) * x + mix * wet


def place(buf, ev, at):
    s = int(at * SR)
    if s >= len(buf):
        return
    e = min(len(buf), s + len(ev))
    buf[s:e] += ev[: e - s]


def env_ar(n, attack, release):
    a = int(attack * SR)
    t = np.arange(n) / SR
    e = np.exp(-np.maximum(0, t - attack) / max(release, 1e-4))
    if a > 0:
        e[:a] = np.linspace(0, 1, a)
    return e


def chirp(f0, f1, dur, decay):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 + (f1 - f0) * (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / decay) * np.minimum(1, t / 0.002)


def poisson_times(rate, dur, r):
    k = r.poisson(rate * dur)
    return np.sort(r.uniform(0, dur, k))


# ------------------------------------------------------------------ 各タグ
def mono_layer(tag, ch, n):
    r = rng_for(tag, ch)
    d = n / SR
    if tag == "rumble":
        y = lp(brown(n, r), 90) * (0.6 + 0.4 * smooth_rand(n, 0.08, r))
        t = np.arange(n) / SR
        y += 0.25 * np.sin(2 * np.pi * (37 + 1.5 * np.sin(2 * np.pi * 0.03 * t)) * t) * smooth_rand(n, 0.05, r, 0.3, 1)
        return y
    if tag == "lava":
        y = np.zeros(n)
        for at in poisson_times(18, d, r):
            m = int(r.uniform(0.002, 0.009) * SR)
            burst = r.standard_normal(m) * np.exp(-np.linspace(0, 6, m)) * r.pareto(2.5) * 0.4
            place(y, burst, at)
        y = bp(y, 700, 5000, 2)
        y += 0.5 * lp(brown(n, r), 160) * smooth_rand(n, 0.6, r, 0.2, 1)
        y += 0.08 * bp(pink(n, r), 300, 2000)
        return y
    if tag == "surf":
        env = np.zeros(n)
        t0 = r.uniform(0, 3)
        while t0 < d:
            period = r.uniform(7, 10)
            m = int(period * SR)
            tt = np.arange(m) / SR
            rise = 0.15 + 0.85 * np.clip(tt / 2.2, 0, 1) ** 2
            crash = np.exp(-np.maximum(0, tt - 2.2) / r.uniform(1.8, 3.0))
            w = np.where(tt < 2.2, rise * 0.35, 0.35 + 0.65 * crash) * r.uniform(0.6, 1.0)
            place(env, w, t0)
            t0 += period * r.uniform(0.85, 1.05)
        env = np.clip(env, 0, 1.2)
        y = shaped_noise(n, r, 350 + 2400 * env, 1.6 + 0.4 * env, 0.08 + env)
        y += 0.5 * lp(brown(n, r), 120) * env
        return y
    if tag == "thunder":
        y = np.zeros(n)
        at = r.uniform(3, 8)
        while at < d - 6:
            m = int(r.uniform(4, 7) * SR)
            e = np.zeros(m)
            for _ in range(r.integers(2, 5)):
                place_at = r.uniform(0, 1.5)
                ee = env_ar(m, 0.15, r.uniform(0.8, 2.5)) * r.uniform(0.4, 1)
                e[int(place_at * SR):] += ee[: m - int(place_at * SR)]
            place(y, lp(brown(m, r), r.uniform(150, 300)) * e, at)
            at += r.uniform(12, 20)
        return reverb(y, 2.5, 0.4, r)
    if tag in ("wind", "wind_soft"):
        c = smooth_rand(n, 0.15, r, 250, 750) if tag == "wind" else smooth_rand(n, 0.12, r, 600, 1400)
        g = smooth_rand(n, 0.1, r, 0.25, 1.0) ** 1.5
        return shaped_noise(n, r, c, smooth_rand(n, 0.2, r, 0.6, 1.0), g)
    if tag == "space":
        t = np.arange(n) / SR
        y = 0.4 * np.sin(2 * np.pi * 55 * t) + 0.25 * np.sin(2 * np.pi * 55.3 * 1.5 * t)
        y *= smooth_rand(n, 0.04, r, 0.4, 1.0)
        return y + 0.6 * lp(brown(n, r), 140)
    if tag in ("underwater", "underwater_close"):
        y = lp(brown(n, r), 380) * (0.6 + 0.4 * smooth_rand(n, 0.12, r))
        bub = np.zeros(n)
        for at in poisson_times(0.8, d, r):
            for k in range(r.integers(1, 5)):
                f0 = r.uniform(250, 700)
                place(bub, chirp(f0, f0 * 1.3, 0.06, 0.02) * r.uniform(0.1, 0.4), at + k * r.uniform(0.03, 0.12))
        y += lp(bub, 1500)
        if tag == "underwater_close":
            clicks = np.zeros(n)
            for at in poisson_times(6, d, r):
                place(clicks, r.standard_normal(40) * np.exp(-np.linspace(0, 5, 40)) * r.uniform(0.05, 0.2), at)
            y += hp(clicks, 2500, 2)
        return reverb(y, 1.6, 0.35, r)
    if tag == "bubbles":
        y = 0.15 * lp(brown(n, r), 400)
        for at in poisson_times(5, d, r):
            for k in range(r.integers(1, 6)):
                f0 = r.uniform(400, 1500)
                place(y, chirp(f0, f0 * r.uniform(1.15, 1.6), 0.08, r.uniform(0.012, 0.035)) * r.uniform(0.15, 0.6),
                      at + k * r.uniform(0.02, 0.09))
        return reverb(y, 0.6, 0.2, r)
    if tag == "water_lap":
        env = np.zeros(n)
        at = 0.0
        while at < d:
            per = r.uniform(2.0, 3.8)
            m = int(per * SR)
            tt = np.arange(m) / SR
            place(env, np.sin(np.pi * np.clip(tt / per, 0, 1)) ** 3 * r.uniform(0.5, 1), at)
            at += per
        y = shaped_noise(n, r, 500 + 900 * env, np.full(n, 1.2), 0.05 + env)
        for at in poisson_times(1.5, d, r):
            f0 = r.uniform(600, 1300)
            place(y, chirp(f0, f0 * 1.3, 0.05, 0.015) * r.uniform(0.05, 0.2), at)
        return y
    if tag == "forest_air":
        y = 0.35 * bp(pink(n, r), 250, 5000, 2) * smooth_rand(n, 0.1, r, 0.5, 1)
        for at in poisson_times(0.35, d, r):
            m = int(r.uniform(0.4, 1.4) * SR)
            e = np.sin(np.linspace(0, np.pi, m)) ** 2
            place(y, hp(white(m, r), 2200, 2) * e * r.uniform(0.05, 0.18), at)
        return y
    if tag == "wings":
        y = 0.2 * shaped_noise(n, r, smooth_rand(n, 0.1, r, 300, 600), np.full(n, 1.0), np.full(n, 0.5))
        for at in poisson_times(0.4, d, r):
            m = int(r.uniform(0.4, 1.1) * SR)
            tt = np.arange(m) / SR
            am = (0.5 + 0.5 * np.sin(2 * np.pi * r.uniform(11, 17) * tt)) ** 2
            e = np.sin(np.pi * tt / tt[-1])
            place(y, bp(white(m, r), 250, 1800, 2) * am * e * r.uniform(0.2, 0.5), at)
        return y
    if tag == "waterfall":
        y = 0.7 * lp(hp(pink(n, r), 70, 2), 5500, 2) + 0.4 * lp(brown(n, r), 180)
        return y * (0.85 + 0.15 * smooth_rand(n, 0.2, r))
    if tag == "rain":
        y = 0.12 * hp(pink(n, r), 900, 2)
        drops = np.zeros(n)
        for at in poisson_times(350, d, r):
            m = int(r.uniform(0.002, 0.006) * SR)
            place(drops, r.standard_normal(m) * np.exp(-np.linspace(0, 5, m)) * r.uniform(0.02, 0.25), at)
        y += hp(drops, 1500, 2)
        for at in poisson_times(2.0, d, r):
            f0 = r.uniform(700, 1600)
            place(y, chirp(f0, f0 * 1.5, 0.05, 0.012) * r.uniform(0.05, 0.25), at)
        return reverb(y, 0.8, 0.2, r)
    if tag == "stream":
        y = 0.25 * shaped_noise(n, r, smooth_rand(n, 3.0, r, 500, 1600), np.full(n, 1.3), smooth_rand(n, 4.0, r, 0.3, 1))
        for at in poisson_times(45, d, r):
            f0 = r.uniform(350, 1400)
            place(y, chirp(f0, f0 * r.uniform(1.1, 1.5), 0.04, r.uniform(0.006, 0.02)) * r.uniform(0.05, 0.3), at)
        return reverb(y, 0.5, 0.15, r)
    if tag == "drip":
        y = 0.04 * lp(brown(n, r), 500)
        at = r.uniform(0.5, 1.5)
        while at < d:
            f0 = r.uniform(1050, 1350)
            place(y, chirp(f0, f0 * 1.45, 0.25, 0.06) * 0.7, at)
            at += r.uniform(2.6, 4.4)
        return reverb(y, 1.8, 0.35, r)
    if tag == "birds_far":
        y = np.zeros(n)
        at = r.uniform(0.5, 3)
        while at < d:
            base = r.uniform(2800, 4800)
            for k in range(r.integers(2, 6)):
                m = int(r.uniform(0.05, 0.14) * SR)
                tt = np.arange(m) / SR
                f = base * (1 + r.uniform(-0.25, 0.25) * tt / tt[-1]) * (1 + 0.04 * np.sin(2 * np.pi * r.uniform(25, 60) * tt))
                note = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / tt[-1]) ** 2
                place(y, note * r.uniform(0.15, 0.4), at + k * r.uniform(0.12, 0.2))
            at += r.uniform(3, 8)
        return reverb(lp(y, 6000, 2), 1.5, 0.5, r)
    raise ValueError(tag)


TAGS = ["rumble", "lava", "surf", "thunder", "wind", "wind_soft", "space", "underwater", "underwater_close",
        "bubbles", "water_lap", "forest_air", "wings", "waterfall", "rain", "stream", "drip", "birds_far"]


def make_loop(tag):
    n = int((DUR + XF) * SR)
    L = mono_layer(tag, 0, n)
    R = mono_layer(tag, 1, n)
    st = np.stack([L, R], axis=1)
    x = int(XF * SR)
    head, tail = st[:x], st[-x:]
    fade = np.linspace(0, 1, x)[:, None]
    body = st[x:].copy()
    body[-x:] = tail * (1 - fade) + head * fade  # 末尾を先頭へクロスフェード → ループ可能
    return body


def make_boom():
    r = np.random.default_rng(3)
    n = int(6 * SR)
    t = np.arange(n) / SR
    f = 30 + 40 * np.exp(-t / 0.25)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ar(n, 0.01, 1.6)
    y += 0.4 * lp(brown(n, r), 220) * env_ar(n, 0.02, 1.2)
    y = reverb(y, 3.0, 0.35, r)
    return np.stack([y, y], axis=1)


def normalize(y, target=-20.0):
    meter = pyln.Meter(SR)
    loud = meter.integrated_loudness(y)
    if not np.isfinite(loud):
        return y
    y = y * 10 ** ((target - loud) / 20)
    peak = np.abs(y).max()
    return y / peak * 0.95 if peak > 0.95 else y


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    tags = sys.argv[1:] or TAGS + ["boom"]
    for tag in tags:
        y = make_boom() if tag == "boom" else make_loop(tag)
        y = normalize(y, -16.0 if tag == "boom" else -20.0)
        sf.write(OUT / f"{tag}.wav", y.astype(np.float32), SR, subtype="PCM_24")
        print(f"{tag}: {len(y) / SR:.1f}s")


if __name__ == "__main__":
    main()
