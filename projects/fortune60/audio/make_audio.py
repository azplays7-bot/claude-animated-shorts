# Original suspense score + sound effects for "Elon Musk: how much does his fortune grow every second?",
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
C2_WORKER = at("More than many workers"); C3_HOUSES = at("HOUSES"); C3_ROOF = at("only getting"); C4_ORBIT = 32.6
C5_COMMAND = at("Across a whole"); C6_TWIST = at("The TWIST"); FINAL_AT = at("NOT a paycheck")
SCN = [0, 10, 20, 30, 40, 50, 60]

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

# ============================================================== music: suspense pulse that builds clip by clip, a stop at the twist
mus = np.zeros((2, N))
def m_place(x, t, g=1.0, p=0.0):
    place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def strings(notes, dur, bright=1800, att=1.2):
    x = sum(saw(nf(m), dur, d) for m in notes for d in (-0.003, 0.0, 0.0035)) / (3 * len(notes))
    return lp(x * (1 + 0.004 * np.sin(TAU * 5.2 * tt(dur))), bright, 2) * env(len(x), att, 99, 1.0) * fades(np.ones(len(x)), 0.01, min(1.0, dur / 3))
def timp(m=40, gain=1.0):
    t = tt(1.6); f = nf(m) * (1 + 0.05 * np.exp(-t / 0.05))
    return gain * (np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.5) + 0.3 * lp(R.standard_normal(len(t)), 500) * np.exp(-t / 0.03))
BPM_ = 120.0; B = 60 / BPM_
CH_ = [(38, (50, 53, 57)), (34, (50, 53, 58)), (36, (48, 52, 55)), (33, (49, 52, 57))]   # D minor: Dm Bb C A
for clip in range(6):
    t0 = clip * 10.0
    energy = 0.6 + 0.08 * clip
    for bar in range(5):
        tb = t0 + bar * 4 * B
        if clip == 5 and tb >= C6_TWIST - 0.05: break
        r_, ch = CH_[bar % 4]
        m_place(strings((r_ - 12, r_), 4 * B, 700, 0.1), tb, 0.3)
        m_place(strings(ch, 4 * B, 1400 + 200 * clip, 0.4), tb, 0.12 + 0.02 * clip)
        for k in range(8):
            tk = tb + k * B / 2
            if tk >= t0 + 9.95 or (clip == 5 and tk >= C6_TWIST - 0.05): continue
            m_place(bass(r_ - 12, B * 0.4, 360), tk, 0.33 * energy)
            if k % 2 == 0: m_place(kick(0.42 * energy), tk)
            if clip >= 2 and k % 4 == 2: m_place(snare(0.2 * energy), tk)
            if clip >= 1: m_place(hat(0.06 * energy), tk + B / 4, 1.0, 0.3)
    m_place(timp(38, 0.6), t0 + 0.02)                                   # every clip opens on a hit
    if clip < 5: m_place(riser(1.4, 0.22 + 0.03 * clip, 48), t0 + 8.5)
m_place(strings((26, 38, 50, 57, 62, 65), 60 - FINAL_AT, 2600, 0.2), FINAL_AT, 0.4)   # after the twist: one wide chord
m_place(timp(26, 0.8), FINAL_AT)
mus += 0.2 * convolve_st(mus.mean(0), make_ir(1.8, 4, hf=1.2))
mus[:, ns(C6_TWIST - 0.05): ns(FINAL_AT)] *= 0.0                    # the music stops at "The twist?"
for b_ in range(1, 6):                                              # each clip starts and ends clean
    mus[:, ns(b_ * 10 - 0.03): ns(b_ * 10 + 0.01)] *= 0.3
mus[:, ns(59.3):] *= np.linspace(1, 0.0, N - ns(59.3)) ** 1.5

# ============================================================== sound effects
fx = np.zeros((2, N))
def f_place(x, t, g=1.0, p=0.0):
    place(fx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def rumble(dur, gain=1.0):
    n = ns(dur); return gain * widen(lp(R.standard_normal(n), 160, 2) * np.minimum(1, np.arange(n) / ns(0.4)), R, 9, 0.6)
for k in range(10): f_place(tick(0.35), 0.02 + k, 1.0, 0.25)                       # clock, once a second
for k in range(1, 10): f_place(pop(0.18, 900), k + 0.03, 1.0, -0.2)               # counter steps
f_place(whoosh(1.2, 0.4, up=False), 0.9); f_place(boom(0.5, 1.8), 1.05)
for k in range(6): f_place(chaching(0.12), 5.7 + k * 0.3, 1.0, (-1) ** k * 0.4)   # stacks rising
f_place(whoosh(0.6, 0.35), 9.75)
for k in range(30): f_place(tick(0.12), 10.6 + k * (C2_WORKER - 11) / 30 * (1 - k / 60), 1.0, 0.3)   # accelerating countdown
f_place(boom(0.55, 1.6), C2_WORKER - 0.05)
f_place(whoosh(1.0, 0.45), 20.05); f_place(whoosh(0.8, 0.35), C3_HOUSES - 0.2)
for k in range(12): f_place(pop(0.1, 500 + 40 * k), C3_HOUSES + 0.1 + k * 0.12, 1.0, (k % 3 - 1) * 0.4)   # houses lighting up
f_place(boom(0.4, 1.4), C3_ROOF)
f_place(rumble(2.8, 0.7), 30.3); f_place(boom(0.6, 2.2), 30.4)                     # launch
f_place(whoosh(1.2, 0.4), C4_ORBIT - 0.3)
for k in range(24): f_place(chime((84,), 0.4, 0.05), C4_ORBIT + k * 0.22, 1.0, (k % 5 - 2) * 0.2)   # 24 hour icons
for k in range(24): f_place(paper(0.16), 40.2 + k * 0.13, 1.0, 0.2)                 # calendar flips
f_place(boom(0.45, 1.6), C5_COMMAND)
f_place(whoosh(0.7, 0.35), 50.05)
f_place(boom(0.9, 2.6), FINAL_AT)                                                  # the final impact after the silence
fx += 0.12 * convolve_st(fx.mean(0), make_ir(1.2, 8, hf=1.2))
fx[:, ns(C6_TWIST + 0.05): ns(FINAL_AT - 0.02)] *= 0.0
fx[:, ns(59.3):] *= np.linspace(1, 0.0, N - ns(59.3)) ** 1.5

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
