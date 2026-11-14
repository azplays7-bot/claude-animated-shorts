# Original score (emotional piano building to cinematic) + sound effects for "Your Life Could Be Completely Different in
# 10 Years", all synthesized here, timed to
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
CLOCK_AT = (E(0) + S(1)) / 2; SPLIT_AT = S(1) + 1.55; RESEARCH_AT = S(3) + 2.0; DRIVEWAY_AT = S(3) + 4.6; CHART_AT = S(4) + 2.6
CUSTOMERS_AT = (E(7) + S(8)) / 2; TEAM_AT = S(8) + 2.8; MONTAGE_AT = (E(9) + S(10)) / 2; PULLBACK_AT = (E(11) + S(12)) / 2

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
BPM_P = 76.0; B4 = 60 / BPM_P; BAR = 4 * B4                      # slow, emotional
PROG = [(48, (60, 64, 67)), (43, (59, 62, 67)), (45, (57, 60, 64)), (41, (57, 60, 65))]   # C  G  Am  F
stage = lambda t: 0 if t < SCN[2] else 1 if t < SCN[3] else 2 if t < SCN[5] else 3      # build in four stages
nb = int(np.ceil(60 / BAR))
for b in range(nb):
    t0 = b * BAR; root, ch = PROG[b % 4]; st_ = stage(t0)
    m_place(piano(root - 12, BAR + 1.0, 0.55), t0, 1.0, -0.2)                    # left hand
    for k in range(8):                                                           # right-hand arpeggio in 8ths
        t = t0 + k * B4 / 2
        if t >= 59.0: break
        m_place(piano(ch[[0, 1, 2, 1][k % 4]] + 12 * (k // 4), 1.6, 0.32 + 0.08 * st_), t, 1.0, 0.25)
    if st_ >= 1: m_place(strings((root, ch[0], ch[1] + 12), BAR + 0.2, 1500 + 600 * st_), t0, 0.22 + 0.08 * st_)
    if st_ >= 2:
        for k in range(4):
            m_place(kick(0.35 + 0.15 * (st_ - 2)), t0 + k * B4)
            if st_ == 3 and k % 2 == 1: m_place(snare(0.25), t0 + k * B4)
    if st_ == 3:
        m_place(strings((ch[0] + 12, ch[1] + 12, ch[2] + 12), BAR + 0.2, 3200, 0.4), t0, 0.22)
        m_place(boom(0.25, 2.0), t0)                                             # cinematic low hit each bar
# setbacks: thin the music for a moment, then it comes back
mus[:, ns(SCN[4]): ns(MONTAGE_AT)] *= 0.55
m_place(riser(2.0, 0.3, 48), 56.6 - 2.0)
m_place(strings((48, 60, 64, 67, 72, 76), 3.5, 3600, 0.15), 56.6, 0.45)        # final swell on START TODAY
m_place(piano(72, 3.4, 0.7), 56.6); m_place(piano(76, 3.4, 0.6), 56.6); m_place(piano(79, 3.4, 0.6), 56.6)
mus += 0.28 * convolve_st(mus.mean(0), make_ir(2.4, 4, hf=1.2))                # concert-hall reverb
mus[:, ns(59.2):] *= np.linspace(1, 0.0, N - ns(59.2)) ** 1.5

# ============================================================== sound effects
fx = np.zeros((2, N))
def f_place(x, t, g=1.0, p=0.0):
    place(fx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def spray(dur, gain=1.0):
    return gain * bp(R.standard_normal(ns(dur)), 1800, 9000) * fades(np.ones(ns(dur)), 0.05, 0.2)
for k in range(int((CLOCK_AT - 0.2) / 0.5)): f_place(tick(0.25), 0.2 + k * 0.5, 1.0, 0.3)   # quiet clock in the bedroom
f_place(whoosh(1.4, 0.5), CLOCK_AT - 0.2)                                        # clock spins forward
for k in range(18): f_place(tick(0.3 + 0.02 * k), CLOCK_AT + k * 0.08 * (1 - k / 30))
f_place(boom(0.5, 1.8), SPLIT_AT); f_place(chime((76, 83), 1.2, 0.3), SPLIT_AT + 0.1)
f_place(paper(0.5), SCN[1] + 0.3)                                                # paycheck
f_place(clink(0.4, 2600), S(3) + 1.3); f_place(ding(88, 0.3), S(3) + 1.35)      # $100 into the jar
for k in range(14): f_place(tick(0.18), RESEARCH_AT + 0.3 + k * 0.11, 1.0, 0.2) # typing
f_place(whoosh(0.5, 0.35), DRIVEWAY_AT - 0.2); f_place(pop(0.4, 500), DRIVEWAY_AT + 1.4)
drops = int((CHART_AT - SCN[2]) / 0.45)
for k in range(drops): f_place(clink(0.25, 2800 + 150 * (k % 4)), SCN[2] + k * 0.45 + 0.4, 1.0, 0.3)   # $100 a month into the fund
for y in (1, 5, 10): f_place(pop(0.4, 600), CHART_AT + 0.2 + (S(5) + 1.0 - CHART_AT - 0.2) * (y / 10) ** 0.5)
f_place(chaching(0.4), S(5) + 1.2)                                               # ~$17,300
f_place(spray(2.0, 0.12), SCN[3] + 0.2)                                          # washing the first car
f_place(chaching(0.4), S(7) + 1.5)                                               # +$50
f_place(spray(2.4, 0.1), CUSTOMERS_AT + 0.4)
for k in range(3): f_place(pop(0.35, 600 + 100 * k), CUSTOMERS_AT + 0.2 + 0.5 * k)
for k in range(3): f_place(pop(0.35, 650 + 100 * k), TEAM_AT + 0.2 + [0, 0.6, 1.3][k])
f_place(crowd(1.0, 0.0), TEAM_AT)
rain = hp(R.standard_normal(ns(MONTAGE_AT - SCN[4])), 1500) * 0.06
f_place(fades(rain, 0.3, 0.3), SCN[4])                                           # rain on the setbacks
f_place(boom(0.3, 1.5), S(9) + 0.4)
for k in range(10): f_place(paper(0.3), MONTAGE_AT + 0.2 + k * (SCN[5] - MONTAGE_AT - 0.5) / 10, 1.0, -0.3)  # calendar years
f_place(whoosh(1.2, 0.4), SCN[5] - 0.4)
f_place(whoosh(2.0, 0.3), PULLBACK_AT)
for k in range(3): f_place(pop(0.35, 550 + 80 * k), PULLBACK_AT + 0.2 + 0.7 * k)
f_place(boom(0.6, 2.4), 56.6)                                                    # START TODAY
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
