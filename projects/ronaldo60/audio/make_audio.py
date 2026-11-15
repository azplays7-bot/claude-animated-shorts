# Original orchestral-style score + sound effects for "The Boy Nobody Believed In",
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
# cut times mirrored from src/Scenes.tsx
FATHER_AT = S(4); ALONE_AT = 17.6; DORM_AT = (E(5) + S(6)) / 2; MOCK_AT = (E(6) + S(7)) / 2; BOOTS_AT = (E(7) + S(8)) / 2
MONITOR_AT = (E(10) + S(11)) / 2; SPRINT_AT = S(11) + 1.3
M_SHOT, M_CROWD, M_CUP, M_AWARD, M_ALONE = 43.6, 45.2, 47.0, 48.8, 50.8
SILENCE_AT, TURN_AT, ERUPT_AT = 54.3, 54.75, 55.85

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

# ============================================================== music: heartbeat -> piano -> strings -> full build -> silence -> eruption
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
def brass(notes, dur, bright=1400, att=0.25):
    x = sum(saw(nf(m), dur, d) for m in notes for d in (-0.002, 0.002)) / (2 * len(notes))
    e = env(len(x), att, 99, 1.0)
    return lp(x, bright, 2) * e * fades(np.ones(len(x)), 0.01, min(0.6, dur / 3))
def timpani(m=38, gain=1.0, dur=2.2):
    t = tt(dur); f = nf(m) * (1 + 0.06 * np.exp(-t / 0.05))
    x = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.6) + 0.35 * np.sin(TAU * np.cumsum(f * 1.5) / SR) * np.exp(-t / 0.3)
    x += 0.3 * lp(R.standard_normal(len(t)), 600) * np.exp(-t / 0.03)
    return gain * x
def heartbeat(gain=1.0):
    def thump(g):
        t = tt(0.25); return g * np.sin(TAU * np.cumsum(42 + 30 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.07)
    out = np.zeros(ns(0.7)); a_ = thump(1.0); b_ = thump(0.7)
    out[: len(a_)] += a_; out[ns(0.28): ns(0.28) + len(b_)] += b_
    return gain * lp(out, 160)
# key: D minor. i - VI - III - VII  (Dm Bb F C); finale resolves to D major
PROG = [(38, (62, 65, 69)), (34, (62, 65, 70)), (41, (60, 65, 69)), (36, (60, 64, 67))]
def section(t0, t1, bpm, fn):
    bar = 4 * 60 / bpm; b = 0
    while t0 + b * bar < t1 - 0.3:
        fn(t0 + b * bar, min(bar, t1 - (t0 + b * bar)), PROG[b % 4], b); b += 1
# 0-9.9 hook: low drone + heartbeat + lonely piano
m_place(strings((26, 38), 9.9, 500, 1.5), 0.0, 0.35)
for k in range(12):
    t = 0.15 + k * 0.92
    if t > 9.4: break
    m_place(heartbeat(0.9 if k < 2 else 0.6), t)
for t, m in ((1.2, 74), (3.0, 72), (4.6, 69), (6.4, 70), (8.0, 69)):
    m_place(piano(m, 3.0, 0.32), t, 1.0, 0.2)
# 9.9-19.9 childhood: warm piano arpeggios, soft strings
def child(t0, d, pc, b):
    root, ch = pc
    m_place(piano(root, d + 1.0, 0.45), t0, 1.0, -0.2)
    for k in range(8):
        t = t0 + k * d / 8
        m_place(piano(ch[[0, 1, 2, 1][k % 4]] + (12 if k >= 4 else 0), 1.6, 0.26), t, 1.0, 0.25)
    m_place(strings((root + 12, ch[0], ch[2]), d + 0.3, 1500, 1.0), t0, 0.18 + 0.03 * b)
section(SCN[1], SCN[2], 84, child)
# 19.9-30.9 sacrifice: cello line over strings, sadder, fuller
def sac(t0, d, pc, b):
    root, ch = pc
    m_place(strings((root - 12, root), d + 0.3, 700, 0.8), t0, 0.3)
    m_place(strings((ch[0], ch[1], ch[2], ch[0] + 12), d + 0.3, 2000, 1.0), t0, 0.22)
    m_place(piano(ch[2] + 12, 2.5, 0.25), t0, 1.0, 0.3); m_place(piano(ch[1] + 12, 2.5, 0.2), t0 + d / 2, 1.0, -0.3)
section(SCN[2], SCN[3], 72, sac)
cello = [(62, 2.0), (65, 1.5), (64, 1.5), (62, 2.5), (60, 1.5), (62, 2.5)]
t = SCN[2] + 0.4
for m, d in cello:
    m_place(strings((m - 12,), d + 0.4, 1100, 0.35), t, 0.32, -0.15); t += d
# 30.9-SPRINT setback: music thins to a drone (ECG beeps are in the SFX); SPRINT: the comeback pulse
m_place(strings((26, 38, 45), SPRINT_AT - SCN[3] + 0.5, 600, 1.0), SCN[3], 0.3)
m_place(strings((62, 69), SPRINT_AT - SCN[3], 1600, 3.0), SCN[3] + 1.5, 0.12)
def comeback(t0, d, pc, b):
    root, ch = pc
    m_place(strings((root, root + 12, ch[0], ch[1], ch[2]), d + 0.3, 2400, 0.5), t0, 0.3)
    for k in range(8):
        m_place(strings((root,), d / 8 * 0.7, 1200, 0.01), t0 + k * d / 8, 0.35)                  # string ostinato
    m_place(timpani(root - 12 + 12, 0.5), t0)
section(SPRINT_AT, SCN[4], 100, comeback)
# 41.9-54.3 rise: full build, rising intensity, timpani on every hit
def rise(t0, d, pc, b):
    root, ch = pc; g = 0.75 + 0.08 * b
    m_place(strings((root - 12, root), d + 0.3, 900, 0.3), t0, 0.35 * g)
    m_place(strings((ch[0], ch[1], ch[2], ch[0] + 12, ch[2] + 12), d + 0.3, 3000, 0.4), t0, 0.3 * g)
    m_place(brass((ch[0] - 12, ch[1] - 12, ch[2] - 12), d + 0.2, 1200 + 150 * b, 0.3), t0, 0.28 * g)
    for k in range(8):
        m_place(strings((ch[[0, 1, 2, 1][k % 4]] + 12,), d / 8 * 0.6, 2400, 0.01), t0 + k * d / 8, 0.22 * g, 0.3)
    m_place(timpani(root - 12, 0.7 * g), t0); m_place(timpani(root - 12, 0.35 * g), t0 + d * 0.625)
section(SCN[4], SILENCE_AT, 108, rise)
for at in (M_CROWD, M_CUP, M_AWARD, M_ALONE): m_place(timpani(38, 0.55), at)
m_place(riser(SILENCE_AT - M_ALONE, 0.3, 50), M_ALONE)
# the music STOPS at SILENCE_AT. One heartbeat in the silence; then the eruption
mus[:, ns(SILENCE_AT):] *= 0.0
mus[:, ns(SILENCE_AT - 0.08): ns(SILENCE_AT)] *= np.linspace(1, 0, ns(SILENCE_AT) - ns(SILENCE_AT - 0.08))[None, :]
m_place(heartbeat(1.0), TURN_AT + 0.05)
m_place(riser(ERUPT_AT - TURN_AT - 0.2, 0.25, 55), TURN_AT + 0.2)
FIN = [(38, (62, 66, 69)), (34, (62, 65, 70)), (36, (64, 67, 72)), (38, (62, 66, 69))]          # D  Bb  C  D
fb = (60 - ERUPT_AT) / 4
for i, (root, ch) in enumerate(FIN):
    t0 = ERUPT_AT + i * fb; d = fb + (1.5 if i == 3 else 0.2)
    m_place(brass((root, root + 12, ch[0], ch[1], ch[2]), d, 2200, 0.05), t0, 0.4)
    m_place(strings((root - 12, root, ch[0], ch[1], ch[2], ch[0] + 12, ch[2] + 12), d, 3600, 0.08), t0, 0.4)
    m_place(timpani(root - 12, 0.9), t0); m_place(boom(0.35, 2.0), t0)
mus += 0.28 * convolve_st(mus.mean(0), make_ir(2.6, 4, hf=1.1))
mus[:, ns(SILENCE_AT): ns(TURN_AT)] *= 0.06                                                  # let the reverb tail die
mus[:, ns(59.0):] *= np.linspace(1, 0.0, N - ns(59.0)) ** 1.5

# ============================================================== sound effects
fx = np.zeros((2, N))
def f_place(x, t, g=1.0, p=0.0):
    place(fx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def rain(dur, gain=1.0):
    n = ns(dur); x = bp(R.standard_normal(n), 800, 9000) * 0.3
    drops = (R.random(n) > 0.9993) * R.uniform(0.3, 1, n); x += hp(np.convolve(drops, np.exp(-np.arange(200) / 30), "same"), 2000)
    return gain * widen(x, R, 13, 0.9)
def kickball(gain=1.0):
    t = tt(0.2); return gain * (np.sin(TAU * np.cumsum(120 + 200 * np.exp(-t / 0.01)) / SR) * np.exp(-t / 0.04) + 0.4 * bp(R.standard_normal(len(t)), 800, 4000) * np.exp(-t / 0.01))
def jet(dur, gain=1.0):
    n = ns(dur); x = lp(R.standard_normal(n), 700, 2) + 0.4 * bp(R.standard_normal(n), 2000, 5000)
    return gain * widen(x * np.sin(np.pi * np.arange(n) / n) ** 0.7, R, 9, 0.6)
f_place(rain(SCN[1], 0.25), 0.0)
f_place(boom(0.5, 1.4), 9.62)                                                                # hard cut to black
for k in range(6): f_place(kickball(0.35), SCN[1] + 0.6 + k * 0.55, 1.0, 0.2)               # dribbling
f_place(crowd(SCN[2] - SCN[1], 0.12), SCN[1])                                                # kids on the pitch
f_place(jet(DORM_AT - SCN[2], 0.3), SCN[2])                                                  # airport
f_place(whoosh(0.8, 0.35), DORM_AT - 0.3)
f_place(crowd(BOOTS_AT - MOCK_AT, 0.18), MOCK_AT)                                            # mocking chatter
f_place(whoosh(0.6, 0.3), BOOTS_AT - 0.2)
for k in range(int((MONITOR_AT + 0.5 - SCN[3]) * 1.2)):                                      # ECG: 72 bpm
    f_place(beep(988, 0.09, 0.07), SCN[3] + 0.3 + k / 1.2, 1.0, 0.4)
k = 0
while MONITOR_AT + k / 1.2 < SPRINT_AT - 0.4:
    f_place(beep(988, 0.1, 0.09), MONITOR_AT + k / 1.2); f_place(heartbeat(0.5), MONITOR_AT + k / 1.2); k += 1
f_place(timpani(38, 0.6), SPRINT_AT); f_place(whoosh(1.0, 0.45), SPRINT_AT - 0.4)
f_place(whoosh(0.6, 0.4), M_SHOT); f_place(kickball(0.8), M_SHOT + 0.35); f_place(boom(0.4, 1.2), M_SHOT + 0.8)
f_place(crowd(SILENCE_AT - M_CROWD, 0.5), M_CROWD)
fx[:, ns(SILENCE_AT):ns(ERUPT_AT)] *= 0.0
f_place(boom(1.0, 3.0), ERUPT_AT); f_place(crowd(60 - ERUPT_AT, 0.75), ERUPT_AT - 0.05)
f_place(boom(0.6, 2.0), 59.0)
fx += 0.15 * convolve_st(fx.mean(0), make_ir(1.4, 8, hf=1.2))
fx[:, ns(SILENCE_AT):ns(ERUPT_AT - 0.05)] *= 0.04
fx[:, ns(59.2):] *= np.linspace(1, 0.0, N - ns(59.2)) ** 1.5
def dip(buf, a, b, g, r=0.25):                                                     # extra ducking where the bed is dense
    e = np.ones(N); e[ns(a):ns(b)] = g; e = uniform_filter1d(e, ns(r)); buf *= e[None, :]
dip(fx, S(11), E(11), 0.35); dip(mus, S(11), E(11), 0.6)
dip(fx, S(16) + 0.15, E(16) + 0.1, 0.22); dip(mus, S(16) + 0.15, E(16) + 0.1, 0.4)
dip(fx, S(17), E(17), 0.5); dip(mus, S(17), E(17), 0.7)

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
for it in range(25):
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
