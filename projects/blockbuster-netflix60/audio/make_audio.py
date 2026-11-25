# Original score + sound effects for "Blockbuster vs Netflix", synthesized here and timed to the narration words
# (../narration/words.json): a bright retro synth-pop groove (video-store era) that turns minor for the fall, cash
# registers, a door chime, flying mailers, a "no" buzzer, a streaming chime, a power-down, a gavel and a tape rewind.
# -14 LUFS integrated, true peak <= -1 dBTP, exactly 60.000 s.      python make_audio.py   -> mix.wav
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import (SR, TAU, ns, tt, dbg, rng, lp, hp, bp, fades, pan, st, place, widen, make_ir, convolve_st,
                 integrated, true_peak, read_wav, write_wav)
from scipy.ndimage import minimum_filter1d, uniform_filter1d

PD = os.path.join(HERE, "..")
DUR = 60.0
N = ns(DUR)
R = rng(2010)
nf = lambda m: 440.0 * 2 ** ((m - 69) / 12)
TM = json.load(open(os.path.join(PD, "narration", "timing.json")))
SENT = TM["sentences"]
SC = {int(k): v for k, v in TM["scenes"].items()}
WD = json.load(open(os.path.join(PD, "narration", "words.json")))
def W(text, n=0):
    hits = [w for w in WD if "".join(ch for ch in w["text"] if ch.isalnum()) == text]
    return hits[n]["start"]

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


def thud(gain=1.0):
    t = tt(0.25); return gain * (np.sin(TAU * np.cumsum(70 + 60 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.07) + 0.3 * lp(R.standard_normal(len(t)), 600) * np.exp(-t / 0.03))
def softpad(notes, dur, bright=1800, att=0.3):
    x = sum(saw(nf(m), dur, d) for m in notes for d in (-0.004, 0.0, 0.004)) / (3 * len(notes))
    return lp(x, bright, 2) * env(len(x), att, 99, 1.0) * fades(np.ones(len(x)), 0.01, min(1.0, dur / 3))
def piano(m, dur=0.6, gain=1.0):
    t = tt(dur); f = nf(m)
    x = sum(a * np.sin(TAU * f * k * (1 + 0.0004 * k * k) * t) * np.exp(-t / (d)) for k, a, d in ((1, 1, 0.5), (2, 0.45, 0.3), (3, 0.25, 0.2), (4, 0.12, 0.12)))
    return gain * x * (1 - np.exp(-t / 0.002))
def gavel(gain=1.0):
    t = tt(0.4); return gain * (np.sin(TAU * np.cumsum(300 + 250 * np.exp(-t / 0.01)) / SR) * np.exp(-t / 0.06) + 0.6 * bp(R.standard_normal(len(t)), 800, 5000) * np.exp(-t / 0.015))

# ============================================================== music: retro synth-pop, 108 BPM; minor for the fall
mus = np.zeros((2, N))
def m_place(x, t, g=1.0, p=0.0):
    place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def stab(notes, dur, gain=1.0, bright=3200):
    x = sum(saw(nf(m), dur, d) for m in notes for d in (-0.005, 0.0, 0.006)) / (3 * len(notes))
    return gain * lp(x, bright, 2) * env(len(x), 0.005, 0.18, 0.2) * fades(np.ones(len(x)), 0.003, 0.05)
BPM = 108.0; B = 60 / BPM
MAJOR = [(36, (60, 64, 67)), (43, (59, 62, 67)), (45, (60, 64, 69)), (41, (60, 65, 69))]   # C G Am F
MINOR = [(45, (57, 60, 64)), (41, (57, 60, 65)), (43, (55, 59, 62)), (40, (56, 59, 64))]   # Am F G E
def groove(t0, t1, g=0.05, prog=MAJOR, drums=True, arp=True):
    k = 0; tb = t0
    while tb < t1 - 0.05:
        r_, ch = prog[(k // 4) % 4]
        if k % 4 == 0: m_place(softpad(ch, min(4 * B, t1 - tb), 2200, 0.05), tb, g * 0.45)
        for e in range(2):
            if tb + e * B / 2 < t1: m_place(bass(r_ + (12 if e else 0), 0.45 * B, 700), tb + e * B / 2, g * 0.9)
        if arp:
            for e in range(2):
                if tb + e * B / 2 < t1: m_place(pluck(ch[(k * 2 + e) % 3] + 12, 0.25, 0.8), tb + e * B / 2, g * 0.35, 0.35 * (1 if e else -1))
        if drums:
            if k % 2 == 0: m_place(kick(1.0), tb, g * 1.1)
            if k % 2 == 1: m_place(snare(1.0), tb, g * 0.8)
            for h in range(2):
                if tb + h * B / 2 < t1: m_place(hat(0.7, open_=h == 1), tb + h * B / 2, g * 0.35, 0.3)
        if k % 8 == 6: m_place(stab(ch, 0.3, 0.8), tb + 0.5 * B, g * 0.45, -0.2)
        tb += B; k += 1

# ============================================================== sound effects
fx = np.zeros((2, N))
def f_place(x, t, g=1.0, p=0.0):
    place(fx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def buzzer(gain=1.0):
    t = tt(0.45); x = np.sign(np.sin(TAU * 110 * t)) * 0.5 + np.sign(np.sin(TAU * 116 * t)) * 0.5
    return gain * lp(x, 1800) * fades(np.ones(len(t)), 0.005, 0.06)
def flick(gain=1.0):
    t = tt(0.1); return gain * hp(R.standard_normal(len(t)), 2000) * np.exp(-t / 0.01)
def powerdown(gain=1.0):
    t = tt(1.4); f = 180 * np.exp(-t / 0.5) + 30
    return gain * np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.6) * fades(np.ones(len(t)), 0.005, 0.2)
def rewind(dur, gain=1.0):
    t = tt(dur); f = 300 + 1400 * t / dur
    x = 0.5 * np.sin(TAU * np.cumsum(f) / SR) + 0.3 * bp(R.standard_normal(len(t)), 1500, 5000)
    return gain * x * fades(np.ones(len(t)), 0.05, 0.2)
def murmur(dur, gain=1.0):
    n = ns(dur); x = sum(bp(R.standard_normal(n), f, f * 4) for f in (200, 320, 480)) / 3
    return gain * widen(x * fades(np.ones(n), 0.5, 0.6), R, 7, 0.8)
def snicker(gain=1.0):
    out = np.zeros(ns(0.9))
    for k in range(4):
        t = tt(0.09); s = bp(R.standard_normal(len(t)), 700, 2400) * np.sin(np.pi * np.arange(len(t)) / len(t)) ** 2
        o = ns(k * 0.17); out[o:o + len(s)] += s
    return gain * out

S1, S2, S3, S4, S5, S6, S7 = (SC[k][0] for k in range(1, 8))
# 1. cold open in the store
m_place(riser(1.0, 0.8), 0.0, 0.04); groove(0.0, W("NO") - 0.1, 0.05)
f_place(door_chime(0.06), 0.15); f_place(murmur(S2 - 0.2, 0.02), 0.0)
f_place(buzzer(0.07), W("NO")); m_place(boom(0.7), W("NO"), 0.05)
# 2. the store in its prime
groove(S2 - 0.1, S3, 0.05); f_place(murmur(S3 - S2, 0.025), S2)
f_place(chaching(0.08), W("800MILLION")); f_place(chaching(0.06), W("800MILLION") + 0.9, 0.3); f_place(chaching(0.06), W("FEES") + 0.2, -0.3)
# 3. the start-up
groove(S3 - 0.1, S4, 0.045, drums=True, arp=True)
for k in range(10): f_place(whoosh(0.25, 0.035, up=k % 2 == 0), S3 + 0.4 + k * 1.1, R.uniform(-0.5, 0.5))
m_place(stab((57, 60, 64), 0.6, 0.9), W("LOSING"), 0.05)
# 4. Dallas: tension, the "no", the stifled laugh
groove(S4 - 0.1, W("NO", 1) - 0.1, 0.04, prog=MINOR, drums=False)
f_place(buzzer(0.06), W("NO", 1)); m_place(boom(0.7), W("NO", 1), 0.05)
groove(W("NO", 1) + 0.6, S5, 0.035, prog=MINOR, drums=False, arp=False)
f_place(snicker(0.05), W("LAUGH") + 0.1)
# 5. no late fees + streaming
groove(S5 - 0.1, S6, 0.05); f_place(paper(0.05), S5 + 0.2)
f_place(chime((76, 79, 84), 1.4, 0.07), W("STREAMING")); f_place(ding(88, 0.05), W("2007"))
# 6. the peak, then the fall
groove(S6 - 0.1, W("BUT") - 0.1, 0.05); f_place(door_chime(0.05), S6 + 0.6); f_place(murmur(4.0, 0.03), S6)
m_place(softpad((57, 60, 64), W("2010") - W("BUT"), 1400, 0.1), W("BUT"), 0.05)
f_place(flick(0.08), W("ONLINE")); f_place(powerdown(0.06), W("ONLINE") + 0.05)
groove(W("2010") - 0.35, S7, 0.04, prog=MINOR, drums=True, arp=False); f_place(gavel(0.08), W("BANKRUPT"))
# 7. Netflix today, the last store
groove(S7 - 0.1, 60.0, 0.05); f_place(chaching(0.05), W("BILLIONS"))
f_place(door_chime(0.06), W("ONE") - 0.1); f_place(rewind(1.6, 0.04), W("REWIND") + 0.1)
for c in [S2, S3, S4, W("BLOCKBUSTERS") - 0.25 + 0.35, S5, S6, W("BUT") - 0.3 + 0.35, W("2010"), S7, W("AND", 4)]: f_place(whoosh(0.32, 0.05), c - 0.35)

mus += 0.15 * convolve_st(mus.mean(0), make_ir(1.4, 4, hf=1.1))
mus[:, ns(59.3):] *= np.linspace(1, 0.0, N - ns(59.3)) ** 1.5
fx += 0.10 * convolve_st(fx.mean(0), make_ir(0.9, 8, hf=1.1))
fx[:, ns(59.3):] *= np.linspace(1, 0.0, N - ns(59.3)) ** 1.5
# ============================================================== mix
v, vsr = read_wav(os.path.join(PD, "narration", "narration.wav"))
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
