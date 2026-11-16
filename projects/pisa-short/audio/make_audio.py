# Original score (a light comic march) + synthesized sound effects for "The Tower That Leaned Before It Was Finished",
# timed to voice/words.json (frames = seconds x 30, the same constants as the picture's story.ts), mixed with voice.wav:
# music ducked under the voice, standard skill levels (music +3 dB, SFX -6 dB, voice unchanged), -14 LUFS, -1 dBTP.
#   python make_audio.py
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import (SR, TAU, ns, tt, dbg, rng, lp, hp, bp, fades, pan, st, place, widen, make_ir, convolve_st,
                 integrated, true_peak, read_wav, write_wav)
from scipy.ndimage import minimum_filter1d, uniform_filter1d
DUR = 1910 / 30
N = ns(DUR)
R = rng(1173)
nf = lambda m: 440.0 * 2 ** ((m - 69) / 12)
WORDS = json.load(open(os.path.join(HERE, "..", "voice", "words.json")))
FR = lambda f: f / 30.0

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

# ============================================================== music: a light comic march in B-flat (tuba, pizzicato, glockenspiel)
mus = np.zeros((2, N))
def m_place(x, t, g=1.0, p=0.0):
    place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def tuba(m, dur=0.32, gain=1.0):
    t = tt(dur); f = nf(m)
    x = sum((1 / k) * np.sin(TAU * f * k * t) for k in range(1, 6)) * (1 - np.exp(-t / 0.02)) * np.exp(-t / 0.35)
    return gain * lp(x, 900, 2)
def pizz(m, gain=1.0):
    t = tt(0.4); f = nf(m)
    return gain * (np.sin(TAU * f * t) + 0.3 * np.sin(TAU * 2 * f * t)) * np.exp(-t / 0.09) * (1 - np.exp(-t / 0.003))
def glock(m, gain=1.0):
    t = tt(1.0); f = nf(m)
    return gain * (np.sin(TAU * f * t) + 0.25 * np.sin(TAU * 2.76 * f * t) * np.exp(-t / 0.15)) * np.exp(-t / 0.45)
BPM = 112.0; B = 60 / BPM
PROG = [(34, (58, 62, 65)), (41, (57, 60, 65)), (39, (55, 58, 63)), (41, (57, 60, 65))]   # Bb F Eb F
MEL = [70, 72, 74, 70, 77, 74, 72, 70, 69, 70, 72, 69, 65, None, 65, None]
# sections: march (0-15.2), quiet time-lapse (15.2-18.7), march again (18.7-37), pump section heavier (36.6-42), soft (42-50),
# dusk minor + hush (46.8-50.4), lighter march to the end
def section_gain(t):
    if t < 0.15: return 0.0
    if 15.3 < t < 18.6: return 0.35
    if 46.8 < t < 50.3: return 0.0
    return 1.0
nb = int(DUR / B)
for k in range(nb):
    t = 0.12 + k * B
    if t > DUR - 0.6: break
    g = section_gain(t)
    if g <= 0: continue
    bar, beat = divmod(k, 4)
    root, ch = PROG[bar % 4]
    if beat in (0, 2): m_place(tuba(root, 0.36, 0.55 * g), t)
    else: m_place(pizz(ch[(beat + bar) % 3], 0.32 * g), t, 1.0, 0.25); m_place(pizz(ch[(beat + bar + 1) % 3] + 12, 0.18 * g), t, 1.0, -0.25)
    if g >= 1:
        n_ = MEL[(k * 2) % 16]
        if n_ is not None and bar % 2 == 0: m_place(glock(n_ + 12, 0.16), t, 1.0, 0.1)
        if beat == 0: m_place(snare(0.12), t); m_place(kick(0.25), t)
        if beat == 2: m_place(snare(0.07), t)
        m_place(hat(0.03), t + B / 2, 1.0, 0.3)
# dusk (1990): a slow minor chord on strings-like pads
def pad_(notes, dur, bright=1400):
    x = sum(np.sin(TAU * nf(m) * tt(dur)) + 0.4 * np.sin(TAU * 2 * nf(m) * tt(dur)) for m in notes) / len(notes)
    return lp(x, bright) * fades(np.ones(len(x)), 0.6, 0.8)
m_place(pad_((46, 53, 58, 61), 3.6), 46.8, 0.22)
m_place(glock(82, 0.25), 50.05)
m_place(pad_((46, 53, 58, 62, 65), 4.4, 2200), FR(1773), 0.18)                       # warm ending chord under the tourists
m_place(glock(82, 0.3), FR(1846)); m_place(glock(86, 0.3), FR(1846) + 0.25); m_place(glock(89, 0.35), FR(1846) + 0.5)
mus += 0.18 * convolve_st(mus.mean(0), make_ir(1.4, 4, hf=1.2))
mus[:, ns(DUR - 1.2):] *= np.linspace(1, 0.0, N - ns(DUR - 1.2)) ** 1.5

# ============================================================== sound effects
fx = np.zeros((2, N))
def f_place(x, t, g=1.0, p=0.0):
    place(fx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def creak(dur=0.9, gain=1.0, f0=110):
    t = tt(dur); f = f0 * (1 + 0.25 * np.sin(TAU * 3 * t)) * (1 + 0.4 * t)
    x = np.sign(np.sin(TAU * np.cumsum(f) / SR)) * (0.5 + 0.5 * np.sin(TAU * 23 * t))
    return gain * bp(x, 300, 2400) * fades(np.ones(len(t)), 0.05, 0.2)
def thud(gain=1.0):
    t = tt(0.8); return gain * (np.sin(TAU * np.cumsum(55 + 60 * np.exp(-t / 0.04)) / SR) * np.exp(-t / 0.22) + 0.4 * lp(R.standard_normal(len(t)), 700) * np.exp(-t / 0.06))
def hammer(gain=1.0):
    t = tt(0.25); return gain * (bp(R.standard_normal(len(t)), 1500, 6000) * np.exp(-t / 0.02) + 0.5 * np.sin(TAU * 1800 * t) * np.exp(-t / 0.05))
def splash(gain=1.0, dur=1.6):
    n = ns(dur); t = tt(dur); x = bp(R.standard_normal(n), 400, 5000) * np.exp(-t / 0.5) * (1 - np.exp(-t / 0.02))
    return gain * widen(x, R, 9, 0.7)
def bubbles(dur, gain=1.0):
    out = np.zeros(ns(dur))
    for k in range(int(dur * 9)):
        t0 = R.uniform(0, dur - 0.1); f0 = R.uniform(300, 900); tb = tt(0.08)
        b_ = np.sin(TAU * np.cumsum(f0 * (1 + 2 * tb)) / SR) * np.exp(-tb / 0.03); i = ns(t0); out[i:i + len(b_)] += b_[: len(out) - i]
    return gain * out
def engine(dur, gain=1.0, rate=7.0):
    t = tt(dur); x = lp(R.standard_normal(len(t)), 300) * (0.6 + 0.4 * np.sign(np.sin(TAU * rate * t))) + 0.3 * np.sin(TAU * 48 * t)
    return gain * x * fades(np.ones(len(t)), 0.3, 0.4)
def whir(dur, gain=1.0):
    t = tt(dur); x = np.sin(TAU * 180 * t + 3 * np.sin(TAU * 6 * t)) + 0.4 * bp(R.standard_normal(len(t)), 800, 3000)
    return gain * x * fades(np.ones(len(t)), 0.3, 0.4)
def birds(dur, gain=1.0):
    out = np.zeros(ns(dur))
    for k in range(int(dur * 2.5)):
        t0 = R.uniform(0, dur - 0.3); tb = tt(0.12); f0 = R.uniform(2500, 4200)
        b_ = np.sin(TAU * np.cumsum(f0 * (1 + 0.3 * np.sin(TAU * 25 * tb))) / SR) * np.sin(np.pi * tb / 0.12); i = ns(t0); out[i:i + len(b_)] += b_[: len(out) - i]
    return gain * out
def crickets(dur, gain=1.0):
    t = tt(dur); return gain * np.sin(TAU * 4300 * t) * (np.sin(TAU * 30 * t) > 0.3) * (np.sin(TAU * 1.1 * t) > -0.2) * 0.5
def slam(gain=1.0):
    t = tt(0.6); return gain * (lp(R.standard_normal(len(t)), 900) * np.exp(-t / 0.05) + np.sin(TAU * np.cumsum(90 + 80 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.15))
def boing(gain=1.0):
    t = tt(0.7); f = 220 + 120 * np.sin(TAU * 9 * t) * np.exp(-t / 0.3)
    return gain * np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.35)
def bwomp(gain=1.0):
    t = tt(0.9); return gain * lp(np.sign(np.sin(TAU * np.cumsum(98 * (1 - 0.18 * t)) / SR)), 700) * fades(np.ones(len(t)), 0.03, 0.3)
def shutter(gain=1.0):
    t = tt(0.12); return gain * (hp(R.standard_normal(len(t)), 3000) * np.exp(-t / 0.01) + 0.5 * hp(R.standard_normal(len(t)), 3000) * np.exp(-np.maximum(0, t - 0.05) / 0.01) * (t > 0.05))
def footsteps(t0, t1, rate, gain=0.4, p=0.0):
    t = t0
    while t < t1: f_place(thud(gain * 0.22), t, 1.0, p); t += 1 / rate
# the hook and the bell
f_place(creak(1.4, 0.5, 90), FR(48)); f_place(thud(0.25), FR(60))
f_place(whoosh(0.5, 0.35), FR(106)); f_place(bell(0.35), FR(112))
# 1173: the crowd cheers, hammers on the scaffold
for k in range(10): f_place(hammer(0.18), FR(118) + k * 0.5 + 0.13 * (k % 3), 1.0, (k % 3 - 1) * 0.4)
f_place(crowd(1.8, 0.55), FR(184)); f_place(crowd(1.4, 0.5), FR(228))
# five years in... it's leaning
footsteps(FR(250), FR(285), 2.3, 0.45)
f_place(creak(1.2, 0.6, 100), FR(306)); f_place(thud(0.6), FR(314)); f_place(boom(0.3, 1.4), FR(314))
f_place(bubbles(1.4, 0.25), FR(340))
# blocks on a mattress: wooden clacks, then a slow lean
for k in range(4): f_place(clink(0.12, 900 + 120 * k), FR(388) + k * 0.25)
f_place(creak(1.0, 0.25, 160), FR(430))
# war: drum roll + distant horn, tools dropped, a century passes (whoosh + ticking clock)
for k in range(14): f_place(snare(0.12 + 0.01 * k), FR(468) + k * 0.06)
f_place(boom(0.35, 1.6), FR(477)); f_place(clink(0.25, 1300), FR(482)); f_place(clink(0.2, 1700), FR(486))
f_place(whoosh(2.0, 0.35), FR(505)); [f_place(tick(0.2), FR(505) + k * 0.12) for k in range(18)]
# luckily: birds; unluckily: bwomp
f_place(birds(2.6, 0.12), FR(565)); footsteps(FR(580), FR(640), 2.0, 0.35, 0.2)
f_place(bwomp(0.3), FR(690))
# cheating: busy hammering in tempo, a rope creak
for k in range(22): f_place(hammer(0.16), FR(705) + k * B * (1 if k % 2 else 0.5) * 0.9, 1.0, (k % 3 - 1) * 0.35)
f_place(creak(1.2, 0.2, 140), FR(780))
# banana
f_place(boing(0.45), FR(906))
# 1838: digging, the water rushes in, it leans more
for k in range(9): f_place(paper(0.25) * 1.0, FR(952) + k * 0.33, 1.0, (k % 2) * 0.3 - 0.15); f_place(thud(0.12), FR(952) + k * 0.33 + 0.05)
f_place(splash(0.6, 2.2), FR(1040)); f_place(bubbles(1.6, 0.3), FR(1046))
f_place(creak(1.0, 0.55, 95), FR(1062)); f_place(thud(0.7), FR(1069)); f_place(boom(0.35, 1.5), FR(1069))
# 1934: the pump chugs, the drill, it leans more
f_place(engine(4.4, 0.35), FR(1112)); f_place(whir(1.6, 0.15), FR(1194))
f_place(creak(1.0, 0.55, 85), FR(1238)); f_place(thud(0.8), FR(1245)); f_place(boom(0.4, 1.6), FR(1245))
# books: a soft thump of the stack, the press, the sink
for k in range(3): f_place(thud(0.12), FR(1280) + k * 0.2)
f_place(creak(0.6, 0.18, 200), FR(1326)); f_place(creak(0.7, 0.22, 170), FR(1378))
# 1990 dusk: crickets, the doors swing shut, the padlock
f_place(crickets(3.8, 0.04), FR(1402)); f_place(creak(1.0, 0.3, 120), FR(1478)); f_place(slam(0.6), FR(1501)); f_place(clink(0.3, 2400), FR(1506))
# the fix: augers whir, soil trickles, the tower settles back
f_place(whir(5.0, 0.18), FR(1520)); f_place(bubbles(4.0, 0.08), FR(1540))
f_place(creak(2.2, 0.35, 70), FR(1676))
# the end: birds, tourists, camera shutters
f_place(birds(3.0, 0.1), FR(1722)); f_place(crowd(4.0, 0.3), FR(1776))
for k in range(5): f_place(shutter(0.25), FR(1790) + k * 0.7, 1.0, (k % 3 - 1) * 0.5)
fx += 0.12 * convolve_st(fx.mean(0), make_ir(1.2, 8, hf=1.2))
fx[:, ns(DUR - 1.0):] *= np.linspace(1, 0.0, N - ns(DUR - 1.0)) ** 1.5

# ============================================================== mix
v, vsr = read_wav(os.path.join(HERE, "..", "voice", "voice.wav"))
v = st(v)[:, :N]; v = np.pad(v, ((0, 0), (0, N - v.shape[1])))
speech = np.zeros(N)
for w_ in WORDS: speech[ns(w_["start"]): ns(w_["end"]) + ns(0.05)] = 1.0
duck = np.convolve(speech, np.ones(ns(0.15)) / ns(0.15), mode="same")
vI = integrated(v)
mus_d = mus * dbg(-6.0 * duck)[None, :]; mus_d *= dbg(vI - 14.0 + 3.0 - integrated(mus_d))   # music +3 dB (skill standard)
fx_d = fx * dbg(-2.0 * duck)[None, :]; fx_d *= dbg(vI - 6.0 - 6.0 - integrated(fx_d))   # SFX -6 dB (skill standard)
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
lines = sorted(set(w_["line"] for w_ in WORDS))
for li in lines:
    ws = [w_ for w_ in WORDS if w_["line"] == li]; a, b = ns(ws[0]["start"]), ns(ws[-1]["end"])
    m = integrated(np.stack([v[0, a:b]] * 2)) - integrated(mus_d[:, a:b] + fx_d[:, a:b])
    if m < 7: print(f"  line {li}: voice only {m:.1f} LU over the bed")
