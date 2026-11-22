# Original score + sound effects for "The Great Emu War" (Western Australia, 1932), synthesized here and timed to the
# narration words (narration/words.json) and the camera cuts (CUTS, in sync with toon/src/emu/Emu.tsx): a comic military
# march with banjo, emu drumming, cartoon machine-gun rattles, a jam, a bumpy truck, chalk, a kookaburra laugh and a
# warm outro. -14 LUFS integrated, true peak <= -1 dBTP, exactly 60.000 s.   python make_audio.py
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
BPM = 120.0
BEAT = 60 / BPM
nf = lambda m: 440.0 * 2 ** ((m - 69) / 12)
TM = json.load(open(os.path.join(HERE, "..", "narration", "timing.json")))
SENT = TM["sentences"]
WD = json.load(open(os.path.join(HERE, "..", "narration", "words.json")))
def W(text, n=0):
    hits = [w for w in WD if "".join(ch for ch in w["text"] if ch.isalnum() or ch == "$") == text]
    return hits[n]["start"]
ENDT = WD[-1]["end"]


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

CUTS = [2.3, 4.5, 6.0, 7.7, 10.9, 12.5, 16.3, 21.5, 25.1, 27.2, 28.9, 32.8, 36.0, 39.0, 43.2, 45.9, 49.2, 51.5]
S = [0.0, 7.7, 16.3, 25.1, 32.8, 43.2, 51.5, 60.0]

# ============================================================== music
mus = np.zeros((2, N))
def m_place(x, t, g=1.0, p=0.0):
    place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def brass(notes, dur, gain=1.0):
    x = sum(saw(nf(m), dur, d) for m in notes for d in (-0.003, 0.003)) / (2 * len(notes))
    return gain * lp(x, 2400, 2) * env(len(x), 0.04, 0.4, 0.7) * fades(np.ones(len(x)), 0.005, 0.08)
def knock(gain=1.0):
    t = tt(0.12); return gain * (np.sin(TAU * np.cumsum(420 + 300 * np.exp(-t / 0.01)) / SR) * np.exp(-t / 0.03) + 0.4 * bp(R.standard_normal(len(t)), 1500, 5000) * np.exp(-t / 0.01))
def thud(gain=1.0):
    t = tt(0.25); return gain * (np.sin(TAU * np.cumsum(70 + 60 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.07) + 0.3 * lp(R.standard_normal(len(t)), 600) * np.exp(-t / 0.03))
def cheer(dur=2.0, gain=1.0):
    return crowd(dur, gain * 1.6)
def softpad(notes, dur, bright=1800, att=0.3):
    x = sum(saw(nf(m), dur, d) for m in notes for d in (-0.004, 0.0, 0.004)) / (3 * len(notes))
    return lp(x, bright, 2) * env(len(x), att, 99, 1.0) * fades(np.ones(len(x)), 0.01, min(1.0, dur / 3))
def banjo(m, gain=1.0):
    t = tt(0.4); f = nf(m)
    x = sum(a * np.sign(np.sin(TAU * f * k * t)) * np.exp(-t / d) for k, a, d in ((1, 1, 0.12), (2, 0.4, 0.08), (3, 0.2, 0.05)))
    return gain * bp(x, 300, 5000) * (1 - np.exp(-t / 0.001))
def tuba(m, dur, gain=1.0):
    t = tt(dur); x = np.sin(TAU * nf(m) * t) + 0.5 * np.sin(TAU * 2 * nf(m) * t) + 0.25 * np.sin(TAU * 3 * nf(m) * t)
    return gain * x * env(len(t), 0.03, dur, 0.8) * fades(np.ones(len(t)), 0.01, 0.08)
def march(t0, t1, g=1.0, minor=False):
    """oom-pah tuba + snare rolls + brass hits + banjo roll, 120 bpm"""
    prog = [(36, (60, 64, 67)), (43, (59, 62, 67)), (41, (60, 65, 69)), (43, (59, 62, 67))] if not minor else [(45, (57, 60, 64)), (40, (56, 59, 64)), (45, (57, 60, 64)), (40, (56, 59, 64))]
    b = 0.5; tb = t0; bar = 0
    while tb < t1 - 0.1:
        r_, ch = prog[bar % 4]
        for k in range(4):
            a = tb + k * b
            if a >= t1: break
            m_place(tuba(r_ if k % 2 == 0 else r_ + 7, 0.3, 0.9), a, 0.09 * g)
            m_place(snare(0.05 * g), a + 0.25); m_place(snare(0.03 * g), a + 0.375)
            for j in range(2): m_place(banjo(ch[(k + j) % 3] + 12, 0.8), a + j * 0.25, 0.04 * g, -0.3 + 0.6 * j)
        if bar % 2 == 0: m_place(brass(ch, 0.45, 1.0), tb, 0.06 * g)
        tb += 4 * b; bar += 1
def drumroll(t0, dur, g=0.06):
    k = 0.0
    while k < dur: m_place(snare(g * (0.5 + 0.5 * k / dur)), t0 + k); k += 0.045
march(0.0, 7.7, 1.0)
m_place(brass((48, 55, 60, 64), 1.2, 0.09), 6.6)                         # "and the birds won"
for k, m in enumerate((72, 76, 79, 76, 72, 74, 76, 72)): m_place(banjo(m, 1.0), 7.8 + k * 0.38, 0.05)   # farm
m_place(softpad((48, 55, 64, 67), 4.6, 1600), 7.8, 0.05)
march(12.5, 16.3, 0.7, minor=True)                                          # the emus arrive
drumroll(16.3, 1.2, 0.05); march(17.5, 25.1, 1.1)                          # the army
march(25.1, 32.8, 0.9, minor=True)
m_place(softpad((45, 52, 57, 60), 43.2 - 32.8, 1200, 0.5), 32.8, 0.05)    # the tally: deadpan
for k in range(14): m_place(pluck([57, 60, 64, 60][k % 4], 0.2, 0.05), 39.1 + k * 0.29)   # sneaky guerrilla pizzicato
march(43.2, 51.5, 0.8)
m_place(softpad((48, 55, 60, 64, 67), 60 - 51.5, 2400, 0.6), 51.5, 0.06)
for k, m in enumerate((72, 76, 79, 84, 79, 76, 81, 84)): m_place(banjo(m, 1.0), 51.6 + k * 0.45, 0.05)
m_place(brass((60, 64, 67, 72), 1.6, 0.07), 53.1)
mus += 0.15 * convolve_st(mus.mean(0), make_ir(1.4, 4, hf=1.2))
mus[:, ns(59.3):] *= np.linspace(1, 0.0, N - ns(59.3)) ** 1.5

# ============================================================== sound effects
def boing(gain=1.0):
    t = tt(0.45); f = 220 + 180 * np.exp(-t / 0.1) * np.cos(TAU * 7 * t)
    return gain * np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.18)
def crunch(gain=1.0):
    t = tt(0.22); x = bp(R.standard_normal(len(t)), 600, 4000) * (R.random(len(t)) < 0.3) * np.exp(-t / 0.08)
    return gain * x * 3
def womp(gain=1.0, m0=58):
    out = np.zeros(ns(1.6))
    for k, (m, d) in enumerate(((m0, 0.3), (m0 - 1, 0.3), (m0 - 2, 0.3), (m0 - 3, 0.7))):
        t = tt(d); x = lp(saw(nf(m), d), 900, 2) * env(len(t), 0.02, d, 0.6) * fades(np.ones(len(t)), 0.01, 0.06)
        o = ns(0.3 * k); out[o: o + len(x)] += x[: len(out) - o]
    return gain * out
def swish(dur=0.9, gain=1.0):
    n = ns(dur); t = np.arange(n) / SR
    return gain * widen(bp(R.standard_normal(n), 600, 5000) * np.sin(np.pi * t / dur) ** 2, R, 7, 0.8)
def cricket(gain=1.0):
    t = tt(0.5); x = np.sin(TAU * 4400 * t) * (np.sin(TAU * 30 * t) > 0) * (t < 0.12) + np.sin(TAU * 4400 * t) * (np.sin(TAU * 30 * t) > 0) * ((t > 0.25) & (t < 0.37))
    return gain * x * 0.6
fx = np.zeros((2, N))
def f_place(x, t, g=1.0, p=0.0):
    place(fx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def rattle(dur, gain=1.0, rate=11):
    out = np.zeros(ns(dur)); k = 0.0
    while k < dur - 0.05:
        c = knock(1.0); c = c + 0.5 * pop(1.0, 200)[: len(c)]; o = ns(k); out[o: o + len(c)] += c[: len(out) - o]; k += 1 / rate
    return gain * lp(out, 4000)
def emu_drum(gain=1.0):
    t = tt(0.9); x = np.sin(TAU * np.cumsum(70 + 10 * np.sin(TAU * 3 * t)) / SR) * (0.5 + 0.5 * np.sign(np.sin(TAU * 6 * t))) * np.exp(-t / 0.4)
    return gain * lp(x, 400) * 3
def kookaburra(gain=1.0):
    out = np.zeros(ns(2.4)); k = 0.0; f0 = 900
    while k < 2.2:
        t = tt(0.12); f = f0 * (1 + 0.5 * np.sin(TAU * 8 * t)); c = np.sin(TAU * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.12)
        o = ns(k); out[o: o + len(c)] += c; k += 0.13 if k < 1.3 else 0.09; f0 = 900 + 500 * np.sin(k * 3)
    return gain * bp(out, 500, 4000)
def engine(dur, gain=1.0):
    t = tt(dur); x = np.sign(np.sin(TAU * (32 + 4 * np.sin(TAU * 0.5 * t)) * t)) * 0.4 + lp(R.standard_normal(len(t)), 300) * 0.6
    return gain * lp(x, 500) * fades(np.ones(len(t)), 0.2, 0.3)
def click(gain=1.0):
    k_ = knock(gain * 0.5); k_[: ns(0.03)] += tick(gain)[: ns(0.03)]; return k_
def chalk(dur, gain=1.0):
    t = tt(dur); x = bp(R.standard_normal(len(t)), 2500, 8000) * (0.4 + 0.6 * (np.sin(TAU * 7 * t) > 0))
    return gain * x * fades(np.ones(len(t)), 0.02, 0.05)
def typewriter(n, gain=1.0):
    out = np.zeros(ns(0.11 * n + 0.2))
    for k in range(n): c = knock(R.uniform(0.6, 1.0)); o = ns(k * 0.11 + R.uniform(0, 0.02)); out[o: o + len(c)] += c[: len(out) - o]
    return gain * out
def steps(dur, gain=1.0, rate=9):
    out = np.zeros(ns(dur)); k = 0.0
    while k < dur - 0.1:
        c = thud(R.uniform(0.5, 1.0)); o = ns(k); out[o: o + len(c)] += c[: len(out) - o]; k += R.exponential(1 / rate)
    return gain * out
def wind3(dur, gain=1.0):
    n = ns(dur); x = bp(R.standard_normal(n), 200, 1200) * (0.6 + 0.4 * np.sin(TAU * 0.17 * np.arange(n) / SR))
    return gain * widen(x * fades(np.ones(n), 0.5, 0.5), R, 13, 0.9)
f_place(wind3(60, 0.03), 0.0)
f_place(engine(2.4, 0.05), 0.0)
f_place(rattle(1.0, 0.05), 3.3)
f_place(emu_drum(0.07), 5.4); f_place(steps(1.6, 0.05), 6.0); f_place(boing(0.05), W("WON"))
for k in range(4): f_place(bird(0.02) if False else pop(0.02, 1800 + 200 * k), 8.2 + k * 0.7, 0.3)
f_place(steps(3.6, 0.05), 12.6); f_place(crunch(0.05), 14.2); f_place(crunch(0.05), 14.8); f_place(emu_drum(0.06), 13.3)
f_place(knock(0.05), 18.3); f_place(knock(0.05), 19.1); f_place(thud(0.08), W("10000"))
f_place(ding(84, 0.04), W("CAMPION"))
f_place(steps(2.0, 0.07), 25.1); f_place(rattle(0.8, 0.05), 25.4)
f_place(rattle(0.35, 0.05), W("JAMMED") - 0.4); f_place(click(0.08), W("JAMMED")); f_place(click(0.06), W("JAMMED") + 0.25); f_place(womp(0.05), W("JAMMED") + 0.4)
f_place(engine(3.9, 0.06), 28.9)
for k in range(7): f_place(thud(0.07), 29.2 + k * 0.5); f_place(rattle(0.3, 0.03), 29.4 + k * 0.5)
f_place(chalk(0.9, 0.05), 34.1); f_place(chalk(0.6, 0.05), 37.4); f_place(cricket(0.05), 38.6)
f_place(swish(0.5, 0.05), 39.6); f_place(swish(0.5, 0.05), 40.6); f_place(kookaburra(0.06), 41.0)
f_place(engine(2.6, 0.05), 43.2); f_place(boing(0.04), 44.0); f_place(boing(0.04), 44.8)
f_place(typewriter(14, 0.05), 46.0); f_place(chalk(0.8, 0.05), 49.4); f_place(ding(88, 0.05), W("BIRD"))
f_place(emu_drum(0.06), 51.7); f_place(kookaburra(0.05), 55.0); f_place(chime((72, 76, 79, 84), 2.0, 0.07), 53.1)
for c in CUTS: f_place(whoosh(0.32, 0.07), c - 0.16)
fx += 0.10 * convolve_st(fx.mean(0), make_ir(0.8, 8, hf=1.1))
fx[:, ns(59.3):] *= np.linspace(1, 0.0, N - ns(59.3)) ** 1.5
# ============================================================== mix
v, vsr = read_wav(os.path.join(HERE, "..", "narration", "narration.wav"))
v = st(v)[:, :N]; v = np.pad(v, ((0, 0), (0, N - v.shape[1])))
speech = np.zeros(N)
for s_ in SENT: speech[ns(s_["start"]): ns(s_["end"])] = 1.0
duck = np.convolve(speech, np.ones(ns(0.15)) / ns(0.15), mode="same")
vI = integrated(v)
mus_d = mus * dbg(-7.0 * duck)[None, :]; mus_d *= dbg(vI - 16.0 - integrated(mus_d))   # light bed, voice forward
fx_d = fx * dbg(-3.0 * duck)[None, :]; fx_d *= dbg(vI - 12.0 - integrated(fx_d))
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
