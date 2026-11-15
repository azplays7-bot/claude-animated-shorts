# Original score + sound effects for "The 9-5 Trap",
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
at = lambda needle: next(c["start"] for c in CH if needle in c["text"])
# cut points, the same rule as src/Scenes.tsx
C1_BUS = at("ALARM") + 0.75; C1_DESK = at("ALARM") + 1.3; C1_PAY = at("PAYDAY"); C1_FACE = at("So is the")
C2_CLOCK = at("By 1940"); C3_RENT = at("nearly HALF"); C4_BORROW = at("So many BORROW"); C5_GROW = at("$200 a month")
C6_EXIT = at("The 9-to-5 isn't"); FINAL_AT = at("ENTIRE LIFE")
SCN = [0.0, (SP[1][1] + SP[2][0]) / 2, 20.0, (SP[3][1] + SP[4][0]) / 2, 40.0, (SP[5][1] + SP[6][0]) / 2, 60.0]

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

# ============================================================== music
mus = np.zeros((2, N))
def m_place(x, t, g=1.0, p=0.0):
    place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def piano(m, dur=2.5, vel=1.0):
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
def timp(m=40, gain=1.0):
    t = tt(1.6); f = nf(m) * (1 + 0.05 * np.exp(-t / 0.05))
    return gain * (np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.5) + 0.3 * lp(R.standard_normal(len(t)), 500) * np.exp(-t / 0.03))
# 1 (0 - S1): the grind — ticking pulse in A minor, getting tighter
B1 = 60 / 104
for k in range(int(SCN[1] / (B1 / 2))):
    t = k * B1 / 2
    m_place(tick(0.16), t, 1.0, (-1) ** k * 0.3)
    if k % 2 == 0: m_place(bass(33, B1 * 0.45, 300), t, 0.35)
    if k % 4 == 0: m_place(kick(0.4), t)
m_place(strings((45, 52, 57), SCN[1], 900, 0.4), 0.0, 0.25)
for t, m in ((C1_PAY, 76), (C1_PAY + 0.5, 72), (C1_PAY + 1.0, 69), (C1_PAY + 1.5, 64)): m_place(piano(m, 1.6, 0.35), t, 1.0, 0.2)   # money draining down
m_place(riser(1.2, 0.25, 50), C1_FACE - 1.2)
# 2 (S1 - 20): history — march snare + low brass-like strings, warm at 1940
for k in range(int((C2_CLOCK - SCN[1]) / 0.3)):
    t = SCN[1] + 0.2 + k * 0.3
    m_place(snare(0.22 if k % 4 else 0.35), t, 1.0, 0.15)
    if k % 4 == 0: m_place(timp(33, 0.45), t)
for i, (r_, ch) in enumerate([(45, (57, 60, 64)), (41, (57, 60, 65)), (43, (55, 59, 62)), (40, (56, 59, 64))]):
    t0 = SCN[1] + i * 1.55
    if t0 < C2_CLOCK: m_place(strings((r_ - 12, r_, ch[0], ch[2]), 1.7, 1300, 0.15), t0, 0.28)
m_place(strings((48, 55, 60, 64, 67), 20 - C2_CLOCK, 2200, 0.8), C2_CLOCK, 0.28)                 # C major: the win
for k, m in enumerate((60, 64, 67, 72, 67, 64)): m_place(piano(m, 1.5, 0.3), C2_CLOCK + 0.4 + k * 0.6, 1.0, -0.2)
# 3-4 (20 - 40): the squeeze — low minor strings, a slow heartbeat pulse that tightens at "borrow"
for i, (r_, ch) in enumerate([(45, (57, 60, 64)), (41, (57, 60, 65)), (38, (57, 62, 65)), (40, (56, 59, 64))] * 2):
    t0 = 20 + i * 2.5
    m_place(strings((r_ - 12, r_), 2.7, 650, 0.5), t0, 0.32)
    m_place(strings(ch, 2.7, 1500, 0.9), t0, 0.16)
    m_place(piano(ch[2] + 12, 2.0, 0.2), t0 + 1.25, 1.0, 0.3)
k = 0
while 20 + k * 0.85 < 39.6:
    t = 20 + k * 0.85 * (0.75 if 20 + k * 0.85 > C4_BORROW else 1.0)
    m_place(kick(0.3), t); m_place(kick(0.18), t + 0.22); k += 1
m_place(riser(1.6, 0.3, 45), 38.3)
# 5-6 (40 - 60): the way out — bright piano arpeggios in C, strings swell, final chord on FINAL_AT
PROG = [(48, (60, 64, 67)), (43, (59, 62, 67)), (45, (57, 60, 64)), (41, (57, 60, 65))]
BAR = 4 * 60 / 84
for b in range(int(20 / BAR) + 1):
    t0 = 40 + b * BAR
    if t0 >= FINAL_AT - 0.1: break
    r_, ch = PROG[b % 4]
    m_place(piano(r_ - 12, BAR + 1, 0.42), t0, 1.0, -0.2)
    for j in range(8):
        tj = t0 + j * BAR / 8
        if tj < FINAL_AT - 0.1: m_place(piano(ch[[0, 1, 2, 1][j % 4]] + 12 * (j // 4), 1.4, 0.32), tj, 1.0, 0.25)
    m_place(strings((r_, ch[0], ch[1] + 12), min(BAR + 0.2, FINAL_AT - t0), 2400, 0.6), t0, 0.2 + 0.03 * b)
m_place(strings((36, 48, 55, 60, 64, 67, 72), 60 - FINAL_AT, 3200, 0.25), FINAL_AT, 0.42)
m_place(piano(36, 4, 0.7), FINAL_AT); m_place(piano(60, 4, 0.4), FINAL_AT); m_place(piano(67, 4, 0.35), FINAL_AT); m_place(piano(76, 4, 0.3), FINAL_AT)
m_place(timp(36, 0.6), FINAL_AT)
mus += 0.22 * convolve_st(mus.mean(0), make_ir(2.0, 4, hf=1.2))
for b_ in (20.0, 40.0):                                           # clean part boundaries: tiny dip so each part starts/ends tidy
    mus[:, ns(b_ - 0.04): ns(b_ + 0.04)] *= 0.5
mus[:, ns(59.2):] *= np.linspace(1, 0.0, N - ns(59.2)) ** 1.5

# ============================================================== sound effects
fx = np.zeros((2, N))
def f_place(x, t, g=1.0, p=0.0):
    place(fx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def alarm(dur=0.7, gain=1.0):
    out = np.zeros(ns(dur))
    for k in range(4): b_ = beep(1760 if k % 2 == 0 else 1320, 0.08, 1.0); out[ns(k * 0.16): ns(k * 0.16) + len(b_)] += b_
    return gain * lp(out, 6000)
def rumble(dur, gain=1.0):
    n = ns(dur); return gain * widen(lp(R.standard_normal(n), 220, 2) * (0.8 + 0.2 * np.sin(TAU * 2 * tt(dur))), R, 9, 0.6)
def hiss(dur, gain=1.0):
    n = ns(dur); return gain * widen(bp(R.standard_normal(n), 2500, 9000) * fades(np.ones(n), 0.2, 0.4), R, 7, 0.8)
def clank(gain=1.0):
    return clink(gain, 900) + clink(gain * 0.6, 1300)
f_place(alarm(0.7, 0.18), 0.05, 1.0, 0.3)
f_place(rumble(C1_DESK - C1_BUS, 0.35), C1_BUS)
for k in range(10): f_place(tick(0.15), C1_DESK + k * 0.06, 1.0, -0.3)                           # keyboard
f_place(chaching(0.3), C1_PAY + 0.05)
for k in range(6): f_place(pop(0.22, 700 - 70 * k), C1_PAY + 0.55 + k * 0.32)                     # money leaving
f_place(whoosh(0.6, 0.35), C1_FACE - 0.25)
f_place(boom(0.45, 1.6), SCN[1] + 0.05)
f_place(crowd(C2_CLOCK - SCN[1], 0.35), SCN[1])
f_place(whoosh(0.6, 0.3), C2_CLOCK - 0.2)
f_place(clank(0.25), C2_CLOCK + 1.65); f_place(kick(0.35), C2_CLOCK + 1.65)                     # time card stamp
f_place(whoosh(0.7, 0.3, up=False), 20.05)
for k in range(10): f_place(paper(0.18), C3_RENT + 0.3 + k * 0.42, 1.0, 0.3)                      # envelopes stacking
f_place(hiss(C4_BORROW - SCN[3], 0.12), SCN[3] + 0.1, 1.0, 0.3)                                 # radiator steam
for k in range(7): f_place(clank(0.12), C4_BORROW + 0.35 + k * 0.2, 1.0, -0.2 + 0.06 * k)       # chain forming
f_place(boom(0.35, 1.4), C4_BORROW + 1.9)
f_place(whoosh(0.8, 0.3), 40.05)
for k in range(9): f_place(clink(0.1, 2300 + 150 * (k % 3)), 40.6 + k * 0.38, 1.0, 0.2)       # coins into the jar
f_place(chime((72, 76, 79, 84), 2.0, 0.22), C5_GROW + 0.2)
f_place(whoosh(0.7, 0.3), C6_EXIT - 0.2)
fx += 0.12 * convolve_st(fx.mean(0), make_ir(1.2, 8, hf=1.2))
fx[:, ns(59.2):] *= np.linspace(1, 0.0, N - ns(59.2)) ** 1.5
from scipy.ndimage import uniform_filter1d as _uf
def dip(buf, a_, b_, g, r=0.2):
    e = np.ones(N); e[ns(a_):ns(b_)] = g; buf *= _uf(e, ns(r))[None, :]
dip(fx, S(0), E(1), 0.6); dip(mus, S(0), E(1), 0.75)
dip(fx, S(8), E(8), 0.6)

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
