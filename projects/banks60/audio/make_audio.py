# Original fun/upbeat score + sound effects for "How banks make money using your money", all synthesized here, timed to
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
SPLIT_AT, FUND_AT, TEEN_END = (E(8) + S(9)) / 2, (E(10) + S(11)) / 2, (E(15) + S(16)) / 2

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

# ============================================================== music: bouncy C major, 112 bpm
mus = np.zeros((2, N))
def m_place(x, t, g=1.0, p=0.0):
    place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
PROG = [(48, (60, 64, 67)), (45, (57, 60, 64)), (41, (57, 60, 65)), (43, (59, 62, 67))]   # C  Am  F  G
BAR = 4 * BEAT
nbars = int(np.ceil(60 / BAR))
for b in range(nbars):
    t0 = b * BAR
    root, ch = PROG[b % 4]
    sec = next(i for i in range(6) if t0 < SCN[i + 1])            # scene 0..5
    energy = [0.6, 0.8, 0.85, 0.7, 0.85, 1.0][sec]
    m_place(pad(ch, BAR, 1600 + 600 * energy, 0.05), t0, 0.28)
    for k in range(8):                                            # bass: root/fifth bounce on 8ths
        t = t0 + k * BEAT / 2
        if t >= 60: break
        m_place(bass(root - 12 + (7 if k % 4 == 3 else 0), BEAT / 2 * 0.7, 600), t, 0.45)
        if k % 2 == 0: m_place(kick(0.7 * energy), t)
        if k % 4 == 2: m_place(snare(0.4 * energy), t)
        m_place(hat(0.22, k % 2 == 1), t, 1.0, 0.3)
        # plucky melody: arpeggio of the chord, an octave up
        if energy > 0.65 and (k % 2 == 0 or energy > 0.9):
            m_place(pluck(ch[(k // 2 + b) % 3] + 12, 0.3, 0.35), t + 0.01, 1.0, -0.25)
# lift into the reveal + final chord
m_place(riser(1.6, 0.35, 55), SCN[5] - 1.7)
m_place(pad((48, 60, 64, 67, 72), 1.4, 2600, 0.02), 58.6, 0.4)
mus += 0.18 * convolve_st(mus.mean(0), make_ir(1.6, 4, hf=1.4))
mus[:, ns(59.3):] *= np.linspace(1, 0.0, N - ns(59.3)) ** 1.5      # ends with the video (edit-friendly tail)

# ============================================================== sound effects
fx = np.zeros((2, N))
def f_place(x, t, g=1.0, p=0.0):
    place(fx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
f_place(door_chime(0.5), 0.15)                                    # bank door
for k in range(6): f_place(tick(0.3), 0.3 + k * 0.42, 1.0, -0.2)  # footsteps on marble
f_place(paper(0.6), 2.85); f_place(chaching(0.45), 3.4)            # cash handed over
for k in range(10): f_place(whoosh(0.35, 0.18), 3.65 + k * 0.08, 1.0, (k % 3 - 1) * 0.5)  # bills fly off
f_place(boom(0.35, 1.4), 4.9); f_place(whoosh(1.2, 0.5), 5.4)      # vault opens, money zooms away
for c in (SCN[1], SCN[3], SCN[5], SPLIT_AT, FUND_AT, TEEN_END):  # scene changes
    f_place(whoosh(0.5, 0.55), c - 0.3)
f_place(whoosh(1.2, 0.35), S(3) + 0.3)                           # loan arc draws
for k in range(18): f_place(paper(0.25), S(3) + 1.2 + k * 0.28, 1.0, 0.3)
keyAt = S(4) + 2.2
for k in range(5): f_place(clink(0.35, 3800 + 400 * k), keyAt + 1.0 + k * 0.05, 1.0, 0.3)  # key jingle
f_place(ding(88, 0.4), keyAt + 1.05)
f_place(whoosh(1.0, 0.3), 15.2)                                    # payments arc
for k in range(16): f_place(clink(0.25, 2600 + 300 * (k % 4)), 16.07 + k * 0.55 + 1.6, 1.0, -0.3)
f_place(pop(0.5, 600), 16.6)                                       # 8% badge
f_place(pop(0.6, 500), chunk("If you borrow")); f_place(pop(0.6, 700), chunk("at 8%") + 0.6)
f_place(chaching(0.55), chunk("that's $80"))
f_place(whoosh(0.6, 0.3), S(7) + 0.4); f_place(ding(91, 0.35), S(7) + 1.0)        # phone slides in
for k in range(12): f_place(tick(0.22), chunk("You earn just") + 0.25 + k * 0.17)   # balance counting
f_place(ding(96, 0.4), chunk("on your $1,000") + 0.9)
f_place(pop(0.5, 500), SPLIT_AT + 0.1)
for k in range(8): f_place(clink(0.3, 2500 + 200 * k), SPLIT_AT + 0.2 + k * 0.14, 1.0, 0.4)
f_place(whoosh(1.0, 0.3), 35.3)                                    # bonds arc
for k in range(6): f_place(paper(0.25), 35.8 + k * 0.22, 1.0, 0.3)
f_place(paper(0.6), 37.0); f_place(chaching(0.35), 38.0)
f_place(pop(0.5, 450), 40.6)                                       # basket appears
for k in range(8): f_place(pop(0.35, 700 + 80 * k), 41.4 + k * 0.32 + 0.4, 1.0, (k % 2 - 0.5))
f_place(clink(0.4, 3000), 41.4); f_place(clink(0.35, 3300), 42.2) # fee coin
f_place(crowd(TEEN_END - SCN[5], 0.28), SCN[5])          # city crowd
f_place(boom(0.3, 2.0), S(13)); f_place(chaching(0.3), S(13) + 0.05)
for k in range(20): f_place(clink(0.08, 2400 + 1600 * R.random()), S(13) + 0.1 + 1.2 * R.random(), 1.0, R.uniform(-0.8, 0.8))
f_place(pop(0.5, 300), S(14) + 0.5); f_place(pop(0.5, 250), S(14) + 1.9)        # expenses / losses
f_place(ding(84, 0.35), S(15))
f_place(pop(0.6, 600), TEEN_END + 0.1); f_place(chime((72, 76, 79, 84), 1.6, 0.4), 58.2)  # CTA
fx += 0.15 * convolve_st(fx.mean(0), make_ir(1.2, 8, hf=1.2))

# ============================================================== mix
v, vsr = read_wav(os.path.join(HERE, "..", "narration", "narration.wav"))
v = st(v)[:, :N]; v = np.pad(v, ((0, 0), (0, N - v.shape[1])))
speech = np.zeros(N)
for s_ in SENT: speech[ns(s_["start"]): ns(s_["end"])] = 1.0
duck = np.convolve(speech, np.ones(ns(0.15)) / ns(0.15), mode="same")
vI = integrated(v)
mus_d = mus * dbg(-6.0 * duck)[None, :]; mus_d *= dbg(vI - 12.5 - integrated(mus_d))
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
