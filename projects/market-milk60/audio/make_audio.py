# Original score + sound effects for "Why is the milk at the back of the store?", all synthesized here, timed to the
# narration word timings (narration/words.json) and the camera setups (toon/src/story.ts), mixed with narration.wav:
# a bright, light 128 BPM groove kept well under the voice, a mysterious turn for "the trick", a whoosh on every
# camera change, -14 LUFS integrated, true peak <= -1 dBTP, exactly 60.000 s.   python make_audio.py
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
BPM = 128.0
BEAT = 60 / BPM
nf = lambda m: 440.0 * 2 ** ((m - 69) / 12)
TM = json.load(open(os.path.join(HERE, "..", "narration", "timing.json")))
SENT = TM["sentences"]
WD = json.load(open(os.path.join(HERE, "..", "narration", "words.json")))
def W(text, n=0):
    hits = [w for w in WD if "".join(ch for ch in w["text"] if ch.isalnum() or ch == "$") == text]
    return hits[n]["start"]
ENDT = WD[-1]["end"]
# camera setup starts (story.ts) -> a light whoosh on every change
SETUPS = [1.9, 3.25, 4.33, 5.35, 6.83, 8.05, 9.2, 10.9, 12.35, 13.4, 15.0, 16.4, 17.9, 19.5, 21.05, 22.1, 23.9, 25.2, 25.9, 27.1, 28.3,
          29.6, 31.9, 34.3, 35.5, 37.0, 40.65, 42.0, 44.2, 46.6, 48.85, 50.6, 52.25, 54.15, 55.6]
F = lambda fr: fr / 30.0

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

# ============================================================== music: a bright pluck groove (C G Am F) at 128 BPM, a mysterious
# minor turn for "the trick" (Am F Dm E, no drums), back to the groove for the dock / shelves, a big finish outside
mus = np.zeros((2, N))
def m_place(x, t, g=1.0, p=0.0):
    place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def softpad(notes, dur, bright=1800):
    x = sum(saw(nf(m), dur, d) for m in notes for d in (-0.004, 0.0, 0.004)) / (3 * len(notes))
    return lp(x, bright, 2) * env(len(x), 0.3, 99, 1.0) * fades(np.ones(len(x)), 0.01, min(1.0, dur / 3))
def clap(gain=1.0):
    t = tt(0.2); x = sum(np.roll(bp(R.standard_normal(len(t)), 1000, 6000), ns(0.008 * k)) for k in range(3))
    return gain * x * np.exp(-t / 0.05)
B = BEAT
PROG = [(48, (64, 67, 72)), (43, (62, 67, 71)), (45, (64, 69, 72)), (41, (65, 69, 72))]        # C G Am F
MYST = [(45, (57, 60, 64)), (41, (57, 60, 65)), (38, (57, 62, 65)), (40, (56, 59, 64))]        # Am F Dm E
MEL = [[79, 76, 72, 76], [74, 79, 83, 79], [76, 72, 69, 72], [77, 81, 84, 81]]
TRICK0, TRICK1 = W("THATS") - 0.25, 40.65
tb = 0.0; bar = 0
while tb < 59.4:
    myst = TRICK0 - 0.1 < tb < TRICK1 - 0.5
    r_, ch = (MYST if myst else PROG)[bar % 4]
    m_place(softpad(ch, 4 * B, 1300 if myst else 1900), tb, 0.05, 0.0)
    if myst:
        for k in range(8): m_place(pluck(ch[(k * 2) % 3] + 12, 0.35, 0.03), tb + k * B / 2, 1.0, -0.3 + 0.15 * (k % 4))
        m_place(bass(r_ - 12, 4 * B * 0.9, 260), tb, 0.12)
    else:
        for k in range(8):                                 # bright plucks on every 8th, chord tones up and down
            m_place(pluck(ch[[0, 1, 2, 1][k % 4]] + 12, 0.22, 0.035), tb + k * B / 2, 1.0, -0.25 + 0.5 * (k % 2))
        for k in range(4): m_place(bass(r_ - 12 + (7 if k % 2 else 0), B * 0.8, 520), tb + k * B, 0.13)
        if tb > 1.9:
            for k in range(4):
                m_place(kick(0.13), tb + k * B)
                m_place(hat(0.03), tb + k * B + B / 2, 1.0, 0.35)
                if k % 2 == 1: m_place(clap(0.05), tb + k * B, 1.0, -0.1)
            if bar % 2 == 0:
                for k, m in enumerate(MEL[(bar // 2) % 4]): m_place(chime((m,), 0.5, 0.04), tb + k * B, 1.0, 0.25)
    tb += 4 * B; bar += 1
m_place(riser(1.2, 0.06, 50), TRICK1 - 1.2)
m_place(softpad((48, 55, 60, 64, 67, 72, 76), 60 - ENDT + 0.3, 2600), ENDT - 0.3, 0.18)      # the closing chord (C)
mus += 0.15 * convolve_st(mus.mean(0), make_ir(1.4, 4, hf=1.3))
mus[:, ns(59.3):] *= np.linspace(1, 0.0, N - ns(59.3)) ** 1.5

# ============================================================== environment + sound effects

fx = np.zeros((2, N))
def f_place(x, t, g=1.0, p=0.0):
    place(fx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def wind(dur, gain=1.0):
    n = ns(dur); x = lp(R.standard_normal(n), 500, 2) * (0.6 + 0.4 * np.sin(TAU * 0.13 * np.arange(n) / SR + 1))
    return gain * widen(x * fades(np.ones(n), 0.5, 0.5), R, 13, 0.9)
def coin(gain=1.0):
    return clink(gain, 3400)
def womp(gain=1.0, m0=58):
    out = np.zeros(ns(1.6))
    for k, (m, d) in enumerate(((m0, 0.3), (m0 - 1, 0.3), (m0 - 2, 0.3), (m0 - 3, 0.7))):
        t = tt(d); f = nf(m) * (1 - 0.03 * (t / d) * (k == 3))
        x = lp(saw(nf(m), d), 900, 2) * env(len(t), 0.02, d, 0.6) * fades(np.ones(len(t)), 0.01, 0.06)
        o = ns(0.3 * k); out[o: o + len(x)] += x[: len(out) - o]
    return gain * out
def swish(dur=0.9, gain=1.0):
    n = ns(dur); t = np.arange(n) / SR
    return gain * widen(bp(R.standard_normal(n), 600, 5000) * np.sin(np.pi * t / dur) ** 2, R, 7, 0.8)
def growl(gain=1.0):
    t = tt(0.9); x = lp(R.standard_normal(len(t)), 220, 2) * (0.5 + 0.5 * np.sin(TAU * 7 * t)) * np.sin(np.pi * t / 0.9)
    return gain * x * 6
def buzzer(gain=1.0):
    t = tt(0.5); x = np.sign(np.sin(TAU * 110 * t)) * 0.5 + np.sign(np.sin(TAU * 116 * t)) * 0.5
    return gain * lp(x, 1800) * fades(np.ones(len(t)), 0.005, 0.05)
def popping(dur, gain=1.0, rate=14):
    out = np.zeros(ns(dur)); t_ = 0.0
    while t_ < dur - 0.1:
        c = pop(R.uniform(0.6, 1.0), R.uniform(300, 900)); o = ns(t_); out[o: o + len(c)] += c[: len(out) - o]; t_ += R.exponential(1 / rate)
    return gain * out
def whirr(dur=0.9, gain=1.0):
    t = tt(dur); x = np.sign(np.sin(TAU * (180 + 40 * np.sin(TAU * 3 * t)) * t)) * 0.3 + 0.4 * bp(R.standard_normal(len(t)), 800, 3000)
    return gain * lp(x, 2500) * np.sin(np.pi * t / dur) ** 0.5
def blips(gain=1.0):
    out = np.zeros(ns(0.6))
    for k, m in enumerate((72, 76, 79, 84)):
        b2 = beep(nf(m), 0.09, 1.0); o = ns(0.1 * k); out[o: o + len(b2)] += b2
    return gain * out

def squeak(gain=1.0):
    t = tt(0.25); f = 1800 + 600 * np.sin(TAU * 9 * t)
    return gain * np.sin(TAU * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.25) ** 2
def crinkle(dur=0.4, gain=1.0):
    n = ns(dur); x = hp(R.standard_normal(n), 2500) * (R.random(n) < 0.08)
    return gain * lp(x, 9000) * 3 * fades(np.ones(n), 0.01, 0.05)
def boing(gain=1.0):
    t = tt(0.45); f = 220 + 180 * np.exp(-t / 0.1) * np.cos(TAU * 7 * t)
    return gain * np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.18)
def scan(gain=1.0):
    return beep(1975, 0.08, gain)
def thud(gain=1.0):
    t = tt(0.25); return gain * (np.sin(TAU * np.cumsum(70 + 60 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.07) + 0.3 * lp(R.standard_normal(len(t)), 600) * np.exp(-t / 0.03))
def reel(dur=0.8, gain=1.0):
    out = np.zeros(ns(dur)); k = 0.0
    while k < dur - 0.02:
        c = tick(1.0); o = ns(k); out[o: o + len(c)] += c[: len(out) - o]; k += 0.035
    return gain * out
def backup_beep(gain=1.0):
    out = np.zeros(ns(1.6))
    for k in range(3): b2 = beep(1050, 0.32, 1.0); o = ns(0.5 * k); out[o: o + len(b2)] += b2
    return gain * lp(out, 3000)
def store_air(dur, gain=1.0):
    n = ns(dur); x = lp(R.standard_normal(n), 300, 2) + 0.02 * np.sin(TAU * 120 * np.arange(n) / SR)   # hvac rumble + light hum
    return gain * widen(x * fades(np.ones(n), 0.3, 0.3), R, 11, 0.9)
def cheer(dur=2.0, gain=1.0):
    return crowd(dur, gain * 1.6)

IN0, IN1, OUT0 = 6.83, W("NEXT") - 0.2, 4.33
for a_, b_ in [(0.0, OUT0), (IN0, IN1)]: f_place(store_air(b_ - a_, 0.05), a_); f_place(crowd(b_ - a_, 0.018), a_)
for a_, b_ in [(OUT0, IN0), (IN1, 60.0)]: f_place(wind(b_ - a_, 0.04), a_); f_place(crowd(b_ - a_, 0.015), a_)
for c in SETUPS: f_place(whoosh(0.32, 0.10), c - 0.16)
f_place(whoosh(0.9, 0.22, up=True), 0.0)                                                 # the rocket down the aisle
f_place(ding(88, 0.08), W("POSSIBLE") + 0.2); f_place(boing(0.06), W("PURPOSE") + 0.15)
f_place(paper(0.10), W("WATCH") + 0.1); f_place(pop(0.10, 700), W("MILK", 1))
f_place(whirr(0.7, 0.04), W("WALKS")); f_place(door_chime(0.08), W("WALKS") + 0.3)
f_place(boom(0.14, 1.2), W("BAM")); f_place(chime((72, 76, 79, 84), 1.2, 0.07), W("BAM") + 0.05)
f_place(pop(0.10, 520), W("SMELLS")); f_place(swish(0.5, 0.10), W("CART") - 0.3); f_place(thud(0.10), W("CART") + 0.15)
f_place(boing(0.07), W("WHERES")); f_place(whoosh(0.7, 0.12, up=False), W("BACK"))
f_place(crinkle(0.4, 0.08), W("CHIPS")); f_place(thud(0.08), W("CHIPS") + 0.45)
f_place(ding(91, 0.08), W("SAMPLE")); f_place(pop(0.1, 800), W("SAMPLE") + 0.55); f_place(thud(0.07), W("SAMPLE") + 1.0)
for k in range(5): f_place(boing(0.035), W("STARING") - 0.6 + k * 0.18, 1.0, R.uniform(-0.5, 0.5))
f_place(thud(0.07), W("CEREAL") + 0.6)
f_place(chaching(0.10), W("SODA")); f_place(thud(0.09), W("2FOR$5") + 0.45); f_place(thud(0.09), W("2FOR$5") + 0.72)
for k in range(5): f_place(squeak(0.05), W("EVERY") + k * 0.38, 1.0, -0.2)
f_place(womp(0.06, 55), W("HEAVIER") + 0.1)
f_place(chime((76, 79, 84, 88), 1.6, 0.10), W("REACHES") + 0.2); f_place(pop(0.1, 600), W("MILK", 3))
f_place(boom(0.12, 1.2), W("FULL"))
f_place(crinkle(0.3, 0.07), W("CANDY") + 0.3)
t_ = W("CAME") - 0.1
while t_ < W("STUFF") + 0.3: f_place(scan(0.035), t_, 1.0, -0.3); t_ += 0.16 if t_ > W("$63") - 0.4 else 0.5
f_place(chaching(0.07), W("$63") + 0.1); f_place(womp(0.05), W("STUFF") + 0.2)
f_place(boom(0.06, 1.6), W("TRICK")); f_place(reel(0.9, 0.04), W("BAIT") - 0.3); f_place(ding(84, 0.05), W("BAIT"))
for k in range(9): f_place(pop(0.05, 500 + 60 * k), 37.15 + k * 0.29)
f_place(whoosh(2.6, 0.06), 37.1)
f_place(backup_beep(0.05), W("PRACTICAL") - 0.2)
for k in range(6): f_place(thud(0.07), 40.75 + k * 16 / 30 + 1.3, 1.0, R.uniform(-0.4, 0.4))
f_place(chaching(0.08), W("PRICEY") + 0.2); f_place(womp(0.06, 52), W("CHEAP") + 0.2)
for k in range(8):
    ts = 48.9 + k * 0.42; f_place(thud(0.05), ts, 1.0, -0.2 if k % 2 else 0.2); f_place(coin(0.03), ts + 0.05, 1.0, R.uniform(-0.3, 0.3))
f_place(whoosh(0.5, 0.14), W("WALK", 1) - 0.1); f_place(pop(0.12, 700), W("GRAB", 1)); f_place(boom(0.16, 1.6), W("GET", 1))
f_place(cheer(3.0, 0.12), W("GET", 1) + 0.1); f_place(chime((72, 76, 79, 84, 88), 2.6, 0.14), ENDT + 0.05)
fx += 0.10 * convolve_st(fx.mean(0), make_ir(0.9, 8, hf=1.2))
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
