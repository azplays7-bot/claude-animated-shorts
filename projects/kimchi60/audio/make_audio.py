# Original score (suspense -> inspirational) + sound effects for "The Crypto Trader Who Shocked the Internet: Kimchi",
# all synthesized here, timed to
# narration/timing.json and the scenes (src/Scenes.tsx), mixed with narration/narration.wav: music ducked under the voice,
# -14 LUFS integrated, true peak <= -1 dBTP, exactly 60.000 s.   python make_audio.py
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import (SR, TAU, ns, tt, dbg, rng, lp, hp, bp, fades, pan, st, place, widen, make_ir, convolve_st,
                 integrated, true_peak, read_wav, write_wav)
from scipy.ndimage import minimum_filter1d, uniform_filter1d

DUR = 60.0
N = ns(DUR)
R = rng(1000)
BPM = 112.0
BEAT = 60 / BPM
nf = lambda m: 440.0 * 2 ** ((m - 69) / 12)
TM = json.load(open(os.path.join(HERE, "..", "narration", "timing.json")))
SENT = TM["sentences"]; CH = TM["chunks"]
S = lambda i: SENT[i]["start"]; E = lambda i: SENT[i]["end"]
chunk = lambda needle: next(c["start"] for c in CH if needle in c["text"])
SP = {int(k): v for k, v in TM["scenes"].items()}
SCN = [0.0] + [round((SP[k][1] + SP[k + 1][0]) / 2 * 30) / 30 for k in range(1, 6)] + [60.0]   # scene starts (+ end)
PUSH_AT = 3.0; GRAPH_AT = (E(2) + S(3)) / 2; CRASH_AT = S(4); SURGE_AT = (E(5) + S(6)) / 2
STAT_AT = (E(9) + S(10)) / 2; WATCH_AT = (E(10) + S(11)) / 2

# ============================================================== instruments
def env(n, a, d, s=0.0, r=0.0, hold=None):
    """ADSR-ish envelope over n samples (a, d, r in seconds)"""
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    if r and hold is not None:
        e *= np.where(t < hold, 1.0, np.exp(-(t - hold) / r))
    return e

def saw(f, dur, detune=0.0):
    t = tt(dur); ph = (f * (1 + detune)) * t
    return 2 * (ph % 1) - 1

def pad(notes, dur, bright=1200, att=0.8):
    x = sum(saw(nf(m), dur, d) for m in notes for d in (-0.004, 0.0, 0.005)) / (3 * len(notes))
    x = lp(x, bright, 2) * env(len(x), att, 99, 1.0)
    return fades(x, 0.01, min(1.2, dur / 3))

def bass(m, dur, cut=420):
    x = 0.6 * saw(nf(m), dur) + 0.4 * np.sin(TAU * nf(m) * tt(dur))
    return lp(x, cut, 2) * env(len(x), 0.004, dur * 0.6, 0.35) * fades(np.ones(len(x)), 0.002, 0.03)

def kick(gain=1.0):
    t = tt(0.45); f = 45 + 85 * np.exp(-t / 0.035)
    x = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.16) + 0.25 * R.standard_normal(len(t)) * np.exp(-t / 0.004)
    return gain * x

def snare(gain=1.0):
    t = tt(0.3)
    x = bp(R.standard_normal(len(t)), 900, 7000) * np.exp(-t / 0.07) + 0.4 * np.sin(TAU * 190 * t) * np.exp(-t / 0.05)
    return gain * x

def hat(gain=1.0, open_=False):
    t = tt(0.25 if open_ else 0.06)
    return gain * hp(R.standard_normal(len(t)), 7000) * np.exp(-t / (0.08 if open_ else 0.018))

def tick(gain=1.0):
    t = tt(0.03)
    return gain * hp(R.standard_normal(len(t)), 3000) * np.exp(-t / 0.004)

def clink(gain=1.0, base=2600.0):
    t = tt(0.5)
    x = sum(a * np.sin(TAU * base * k * t + R.uniform(0, 6)) * np.exp(-t / d) for k, a, d in ((1, 1, 0.12), (1.47, 0.7, 0.09), (2.09, 0.5, 0.07), (2.76, 0.35, 0.05)))
    return gain * x * (1 - np.exp(-t / 0.0008))

def chime(notes, dur=1.6, gain=1.0):
    t = tt(dur)
    return gain * sum(np.sin(TAU * nf(m) * t) * np.exp(-t / 0.5) + 0.3 * np.sin(TAU * nf(m) * 2.01 * t) * np.exp(-t / 0.25) for m in notes) / len(notes)

def whoosh(dur=0.7, gain=1.0, up=True):
    n = ns(dur); t = np.arange(n) / SR; u = t / dur
    x = R.standard_normal(n)
    sweep = 400 * np.exp((u if up else 1 - u) * np.log(14))
    out = np.zeros(n); blk = 1024
    for i in range(0, n, blk):                          # time-varying band-pass, block-wise
        f = sweep[i]; out[i:i + blk] = bp(x[i:i + blk + 2048], f * 0.7, min(f * 1.6, 20000), 2)[: len(out[i:i + blk])]
    shape_ = np.sin(np.pi * u) ** 1.5
    return gain * widen(out * shape_, R, 9, 0.8)

def riser(dur, gain=1.0, m0=45):
    t = tt(dur); u = t / dur
    f = nf(m0) * 2 ** (u * 2)
    tone = np.sin(TAU * np.cumsum(f) / SR) + 0.5 * np.sin(TAU * np.cumsum(f * 1.5) / SR)
    noise = hp(R.standard_normal(len(t)), 2000) * u ** 2
    return gain * (0.6 * tone + 0.5 * noise) * u ** 2.2

def boom(gain=1.0, dur=2.5):
    t = tt(dur)
    x = np.sin(TAU * np.cumsum(38 + 50 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.7)
    x += 0.5 * lp(R.standard_normal(len(t)), 900) * np.exp(-t / 0.18)
    return gain * x

def paper(gain=1.0):
    t = tt(0.22)
    return gain * bp(R.standard_normal(len(t)), 1500, 7000) * np.sin(np.pi * np.minimum(t / 0.22, 1)) ** 2

def beep(f, dur=0.12, gain=1.0):
    t = tt(dur)
    return gain * np.sign(np.sin(TAU * f * t)) * 0.5 * fades(np.ones(len(t)), 0.002, 0.01)


def pluck(m, dur=0.35, gain=1.0):
    t = tt(dur); f = nf(m)
    x = (np.sin(TAU * f * t) + 0.35 * np.sin(TAU * 2 * f * t) + 0.12 * np.sin(TAU * 3 * f * t)) * np.exp(-t / 0.12)
    return gain * x * (1 - np.exp(-t / 0.002))

def bell(gain=1.0):
    t = tt(1.4)
    return gain * sum(a * np.sin(TAU * f * t) * np.exp(-t / d) for f, a, d in ((2093, 1, 0.5), (2637, 0.6, 0.4), (3136, 0.4, 0.3), (5274, 0.2, 0.15)))

def chaching(gain=1.0):
    t = tt(0.12); slam = lp(R.standard_normal(len(t)), 2500) * np.exp(-t / 0.02)
    out = np.zeros(ns(1.5)); out[: len(slam)] += 0.6 * slam
    b = bell(1.0); out[ns(0.12): ns(0.12) + len(b)] += b[: len(out) - ns(0.12)]
    return gain * out

def pop(gain=1.0, f0=500):
    t = tt(0.12)
    return gain * np.sin(TAU * np.cumsum(f0 + 900 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.04)

def ding(m=84, gain=1.0):
    return chime((m, m + 7), 0.9, gain)

def door_chime(gain=1.0):
    out = np.zeros(ns(1.6)); a = chime((76,), 1.2, 1.0); b = chime((72,), 1.2, 1.0)
    out[: len(a)] += a; out[ns(0.32): ns(0.32) + len(b)] += b[: len(out) - ns(0.32)]
    return gain * out

def crowd(dur, gain=1.0):
    n = ns(dur); x = np.zeros(n)
    for k in range(24):
        f = R.uniform(140, 320); t = tt(dur)
        voice = bp(R.standard_normal(n), f, f * 6) * (0.5 + 0.5 * np.sin(TAU * R.uniform(1.5, 4) * t + R.uniform(0, 6)))
        x += voice
    return gain * x / 24 * np.sin(np.pi * np.minimum(np.arange(n) / n, 1)) ** 0.5

# ============================================================== music: piano -> strings -> pulse -> cinematic
mus = np.zeros((2, N))
def m_place(x, t, g=1.0, p=0.0):
    place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def piano(m, dur=2.5, vel=1.0):
    """piano-like tone: slightly inharmonic partials, faster decay up high, a soft hammer thump"""
    t = tt(dur); f = nf(m); x = np.zeros(len(t)); B = 0.0004
    for k in range(1, 9):
        fk = f * k * np.sqrt(1 + B * k * k)
        if fk > 16000: break
        x += (1 / k ** 1.25) * np.sin(TAU * fk * t + 0.3 * k) * np.exp(-t / (2.2 / k ** 0.7 * (220 / f) ** 0.3))
    x += 0.05 * lp(R.standard_normal(len(t)), 1800) * np.exp(-t / 0.01)
    return vel * x * (1 - np.exp(-t / 0.002)) * fades(np.ones(len(t)), 0.0, 0.25)
def strings(notes, dur, bright=1800, att=1.2):
    x = sum(saw(nf(m), dur, d) for m in notes for d in (-0.003, 0.0, 0.0035)) / (3 * len(notes))
    vib = 1 + 0.004 * np.sin(TAU * 5.2 * tt(dur))
    return lp(x * vib, bright, 2) * env(len(x), att, 99, 1.0) * fades(np.ones(len(x)), 0.01, min(1.0, dur / 3))
# suspense (0-50 s): low drone, minor pulse, ticking, risers; inspirational (50-60 s): piano + strings in a major key
BPM_P = 92.0; B4 = 60 / BPM_P; BAR = 4 * B4
MINOR = [(45, (57, 60, 64)), (41, (57, 60, 65)), (43, (55, 59, 62)), (40, (56, 59, 64))]   # Am F G E
MAJOR = [(48, (60, 64, 67)), (43, (59, 62, 67)), (45, (57, 60, 64)), (41, (57, 60, 65))]   # C G Am F
nb = int(np.ceil(50 / BAR))
for b in range(nb):
    t0 = b * BAR
    if t0 >= 49.9: break
    root, ch = MINOR[b % 4]
    energy = 0.6 if t0 < 20 else 0.85 if t0 < 40 else 0.7
    m_place(strings((root - 12, root), min(BAR, 50 - t0), 700, 0.3), t0, 0.32)                      # low drone
    for k in range(8):
        t = t0 + k * B4 / 2
        if t >= 50: break
        m_place(bass(root - 12, B4 / 2 * 0.5, 380), t, 0.38 * energy)                                # pulsing bass
        m_place(tick(0.22), t, 1.0, (-1) ** k * 0.4)                                                 # clock / ticker
        if k % 2 == 0: m_place(kick(0.45 * energy), t)
    if t0 >= 20: m_place(piano(ch[2] + 12, BAR, 0.18), t0, 1.0, 0.3)                                 # tense single notes
for at, d in ((7.5, 2.4), (17.6, 1.6), (27.6, 2.4), (37.6, 2.4), (47.4, 2.6)):
    m_place(riser(d, 0.32, 50), at)                                                                  # builds into each clip end
for b in range(int(np.ceil(10 / (4 * 60 / 76)))):                                                    # 50-60 s: inspirational
    BAR2 = 4 * 60 / 76; t0 = 50 + b * BAR2; root, ch = MAJOR[b % 4]
    m_place(piano(root - 12, BAR2 + 1, 0.55), t0, 1.0, -0.2)
    for k in range(8):
        t = t0 + k * BAR2 / 8
        if t >= 59.3: break
        m_place(piano(ch[[0, 1, 2, 1][k % 4]] + 12 * (k // 4), 1.6, 0.4), t, 1.0, 0.25)
    m_place(strings((root, ch[0], ch[1] + 12), BAR2 + 0.2, 2600, 0.6), t0, 0.32)
    m_place(boom(0.2, 2.0), t0)
m_place(strings((48, 60, 64, 67, 72, 76), 4.0, 3600, 0.3), 56.0, 0.4)
mus[:, ns(50.0):] *= 0.7                                                                       # keep the final message clear
mus += 0.24 * convolve_st(mus.mean(0), make_ir(2.2, 4, hf=1.2))
mus[:, ns(59.3):] *= np.linspace(1, 0.0, N - ns(59.3)) ** 1.5

# ============================================================== sound effects
fx = np.zeros((2, N))
def f_place(x, t, g=1.0, p=0.0):
    place(fx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def glitch(dur, gain=1.0):
    n = ns(dur); x = np.sign(np.sin(TAU * np.cumsum(R.uniform(200, 2400, n)) / SR)) * (R.random(n) > 0.5)
    return gain * lp(x, 5000) * fades(np.ones(n), 0.005, 0.02)
f_place(boom(0.6, 1.6), 0.05); f_place(whoosh(1.6, 0.6, up=False), 0.6)                          # hook pull-back
for k in range(40): f_place(tick(0.12), 3.2 + k * 0.17, 1.0, 0.35)                                # keyboard / mouse
f_place(whoosh(0.5, 0.35), GRAPH_AT - 0.2)
for k in range(8): f_place(pop(0.3, 500 + 90 * k), GRAPH_AT + 0.4 + k * 0.4)                     # $100 -> $500
f_place(whoosh(0.9, 0.5, up=False), CRASH_AT + 0.5); f_place(boom(0.55, 1.6), CRASH_AT + 1.4)     # crash to $80
f_place(glitch(0.35, 0.18), 20.1); f_place(boom(0.7, 2.0), 20.15); f_place(glitch(0.2, 0.15), 21.6) # BREAKING
f_place(crowd(SURGE_AT - 20.6, 0.35), 20.6)
f_place(riser(2.0, 0.35, 55), SURGE_AT - 0.2); f_place(chaching(0.4), SURGE_AT + 1.0)            # surge, peak
for k in range(4): f_place(chaching(0.32 + 0.05 * k), 30.4 + k * (S(8) - 0.3 - 30.4) / 4)       # $100K -> $40M
f_place(boom(0.6, 1.6), S(8))                                                                      # "never been verified"
f_place(whoosh(0.5, 0.4), 40.0)
for k in range(5): f_place(beep(1040 if k % 2 else 760, 0.16, 0.08), 40.4 + k * 0.4, 1.0, 0.5)   # liquidation alarm
f_place(boom(0.8, 2.4), STAT_AT); f_place(whoosh(1.2, 0.4, up=False), STAT_AT + 0.1)              # -98%
f_place(whoosh(1.4, 0.4), 50.0); f_place(chime((72, 76, 79), 1.6, 0.3), 50.2)                     # to the sunrise
for k in range(3): f_place(pop(0.35, 600 + 80 * k), S(14) + k * 0.95)
f_place(boom(0.45, 2.0), 56.0); f_place(pop(0.5, 650), 57.8)
fx += 0.15 * convolve_st(fx.mean(0), make_ir(1.2, 8, hf=1.2))

# ============================================================== mix
v, vsr = read_wav(os.path.join(HERE, "..", "narration", "narration.wav"))
v = st(v)[:, :N]; v = np.pad(v, ((0, 0), (0, N - v.shape[1])))
speech = np.zeros(N)
for s_ in SENT: speech[ns(s_["start"]): ns(s_["end"])] = 1.0
duck = np.convolve(speech, np.ones(ns(0.15)) / ns(0.15), mode="same")
vI = integrated(v)
mus_d = mus * dbg(-6.0 * duck)[None, :]; mus_d *= dbg(vI - 11.0 - integrated(mus_d))
fx_d = fx * dbg(-2.0 * duck)[None, :]; fx_d *= dbg(vI - 10.5 - integrated(fx_d))
pre = v + mus_d + fx_d
def limit(x, ceil_db=-1.3, look=0.005):
    w = ns(look)
    g = np.minimum(1.0, dbg(ceil_db) / np.maximum(np.abs(x).max(0), 1e-9))
    g = minimum_filter1d(g, 2 * w + 1); g = uniform_filter1d(g, w + 1); g = minimum_filter1d(g, w + 1)
    return x * g[None, :]
G = -14.0 - integrated(pre)
for it in range(10):
    mix = limit(pre * dbg(G)); L = integrated(mix)
    if abs(L + 14.0) < 0.05: break
    G += -14.0 - L
mix *= np.minimum(1.0, dbg(-1.0 - true_peak(mix)))
mix = fades(mix, 0.005, 0.02)
write_wav(os.path.join(HERE, "mix.wav"), mix)
print(f"mix: {mix.shape[1] / SR:.3f} s, {integrated(mix):.2f} LUFS, true peak {true_peak(mix):.2f} dBTP")
for i, s_ in enumerate(SENT):
    a, b = ns(s_["start"]), ns(s_["end"])
    m = integrated(np.stack([v[0, a:b]] * 2)) - integrated(mus_d[:, a:b] + fx_d[:, a:b])
    if m < 7: print(f"  sentence {i + 1}: voice only {m:.1f} LU over the bed")
