# Original score + sound effects for "Why are fast food signs red and yellow?", all synthesized here, timed to the
# narration word timings (narration/words.json) and the camera setups (toon/src/story.ts), mixed with narration.wav:
# a thin, grey bed for the grey street, a bright 128 BPM groove from BAM on (busier inside), a whoosh on every
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
import re as _re
_st = open(os.path.join(HERE, "..", "toon", "src", "story.ts")).read()
SETUPS = sorted(set(float(x) for x in _re.findall(r"^\s*\[(\d+\.\d+), \[", _st, _re.M)) - {0.0})
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

# ============================================================== music: grey street = a thin minor pad (no drums), BAM = the
# bright groove (C G Am F, plucks, kick/clap), inside = the same groove with 16th hats and a lead (busier from "faster
# music"), golden ending = the groove, then a big closing chord
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
GREYP = [(45, (57, 60, 64)), (41, (57, 60, 65))]                                               # Am F, slow
MEL = [[79, 76, 72, 76], [74, 79, 83, 79], [76, 72, 69, 72], [77, 81, 84, 81]]
GREY0, BAM = 3.9, W("BAM")
INSIDE0, INSIDE1, FAST = W("INSIDE") - 0.2, W("WALKED") - 0.2, W("FASTER", 1) - 0.1
# hook groove (0 .. grey)
tb = 0.0; bar = 0
while tb < GREY0 - 0.1:
    r_, ch = PROG[bar % 4]; d = min(4 * B, GREY0 - tb)
    m_place(softpad(ch, d, 1900), tb, 0.05)
    for k in range(8):
        if k * B / 2 < d: m_place(pluck(ch[[0, 1, 2, 1][k % 4]] + 12, 0.22, 0.035), tb + k * B / 2, 1.0, -0.25 + 0.5 * (k % 2))
    for k in range(4):
        if k * B < d: m_place(kick(0.13), tb + k * B); m_place(hat(0.03), tb + k * B + B / 2, 1.0, 0.35); m_place(bass(r_ - 12, B * 0.8, 520), tb + k * B, 0.13)
    tb += 4 * B; bar += 1
# grey street: slow, thin
t0 = GREY0; k = 0
while t0 < BAM - 0.1:
    r_, ch = GREYP[k % 2]; d = min(2 * B, BAM - t0)
    m_place(softpad(ch, d, 900), t0, 0.05); m_place(bass(r_ - 12, d * 0.9, 200), t0, 0.08)
    m_place(pluck(ch[0] + 12, 0.5, 0.02), t0 + B * 0.5, 1.0, 0.2)
    t0 += 2 * B; k += 1
# from BAM: the bright groove to the end
tb = BAM; bar = 0
while tb < 59.4:
    r_, ch = PROG[bar % 4]
    inside = INSIDE0 <= tb < INSIDE1
    busy = inside and tb >= FAST - 4 * B
    m_place(softpad(ch, 4 * B, 2200 if inside else 1900), tb, 0.05)
    step = B / 4 if busy else B / 2
    for k in range(16 if busy else 8):
        m_place(pluck(ch[[0, 1, 2, 1][k % 4]] + 12, 0.18 if busy else 0.22, 0.032), tb + k * step, 1.0, -0.25 + 0.5 * (k % 2))
    for k in range(4):
        m_place(kick(0.14), tb + k * B); m_place(bass(r_ - 12 + (7 if k % 2 else 0), B * 0.8, 520), tb + k * B, 0.13)
        if k % 2 == 1: m_place(clap(0.055), tb + k * B, 1.0, -0.1)
        if inside:
            for h in range(4): m_place(hat(0.026), tb + k * B + h * B / 4, 1.0, 0.35)
        else: m_place(hat(0.03), tb + k * B + B / 2, 1.0, 0.35)
    if bar % 2 == 0 or inside:
        for k, m in enumerate(MEL[(bar if inside else bar // 2) % 4]): m_place(chime((m,), 0.5, 0.04), tb + k * B, 1.0, 0.25)
    tb += 4 * B; bar += 1
m_place(riser(1.0, 0.06, 50), BAM - 1.0)
m_place(softpad((48, 55, 60, 64, 67, 72, 76), 60 - ENDT + 0.3, 2600), ENDT - 0.3, 0.18)
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

def sizzle(dur, gain=1.0):
    n = ns(dur); x = hp(R.standard_normal(n), 3000) * (0.6 + 0.4 * (R.random(n) < 0.02))
    return gain * widen(lp(x, 9000) * fades(np.ones(n), 0.2, 0.2), R, 5, 0.6)
def crunch(gain=1.0):
    t = tt(0.22); x = bp(R.standard_normal(len(t)), 600, 4000) * (R.random(len(t)) < 0.3) * np.exp(-t / 0.08)
    return gain * x * 3
def knock(gain=1.0):
    t = tt(0.12); return gain * (np.sin(TAU * np.cumsum(420 + 300 * np.exp(-t / 0.01)) / SR) * np.exp(-t / 0.03) + 0.4 * bp(R.standard_normal(len(t)), 1500, 5000) * np.exp(-t / 0.01))
def slurp(gain=1.0):
    t = tt(0.6); x = bp(R.standard_normal(len(t)), 400, 2500) * (0.5 + 0.5 * np.sin(TAU * 18 * t)) * np.sin(np.pi * t / 0.6)
    return gain * x
def tictoc(n=4, gain=1.0):
    out = np.zeros(ns(0.3 * n + 0.1))
    for k in range(n): c = clink(1.0, 2200 if k % 2 else 3000)[: ns(0.08)]; o = ns(0.3 * k); out[o: o + len(c)] += c
    return gain * out
def neon(dur, gain=1.0):
    t = tt(dur); return gain * lp(np.sign(np.sin(TAU * 120 * t)) * 0.3 + 0.2 * np.sin(TAU * 240 * t), 1200) * fades(np.ones(len(t)), 0.05, 0.2)

STORE0, STORE1 = W("INSIDE") - 0.2, W("WALKED") - 0.2
f_place(wind(STORE0, 0.04), 0.0); f_place(crowd(STORE0, 0.012), 0.0)
f_place(lp(R.standard_normal(ns(STORE0)), 160, 2) * 0.5, 0.0, 0.05)                      # far traffic rumble
f_place(store_air(STORE1 - STORE0, 0.04), STORE0); f_place(crowd(STORE1 - STORE0, 0.03), STORE0); f_place(sizzle(STORE1 - STORE0, 0.012), STORE0)
f_place(wind(60 - STORE1, 0.04), STORE1); f_place(crowd(60 - STORE1, 0.014), STORE1)
for c in SETUPS: f_place(whoosh(0.32, 0.10), c - 0.16)
f_place(whoosh(0.9, 0.22, up=True), 0.0); f_place(neon(3.8, 0.03), 0.2)
f_place(ding(84, 0.08), W("RED")); f_place(ding(88, 0.08), W("YELLOW")); f_place(boing(0.07), W("ACCIDENT") + 0.1)
f_place(womp(0.05, 50), W("HUNGRY") + 0.1)
f_place(boom(0.16, 1.4), W("BAM")); f_place(chime((72, 76, 79, 84), 1.2, 0.08), W("BAM") + 0.05); f_place(neon(1.5, 0.04), W("BAM"))
f_place(thud(0.12), W("GIANT") + 0.1)
for k in range(4): f_place(ding(91, 0.04), W("GRABS") + k * 0.42)
f_place(pop(0.1, 700), W("EYE"))
f_place(chime((84, 88, 91, 96), 1.8, 0.07), W("YELLOW", 2) + 0.1); f_place(whoosh(1.2, 0.08, up=False), W("FAR") - 0.6)
f_place(buzzer(0.05), W("TOGETHER") + 0.05); f_place(beep(880, 0.14, 0.05), W("STOP")); f_place(beep(1175, 0.14, 0.05), W("NOW"))
f_place(growl(0.10), W("APPETITE")); f_place(growl(0.08), W("APPETITE") + 0.75)
f_place(slurp(0.07), W("STARVING") + 0.1)
f_place(whoosh(0.5, 0.18), W("TURN") - 0.1); f_place(popping(0.6, 0.05, 20), W("TURN"))
f_place(door_chime(0.08), W("INSIDE") - 0.1); f_place(chime((84, 88, 91), 1.0, 0.06), W("BRIGHT") + 0.05)
f_place(blips(0.05), W("HURRY")); f_place(blips(0.04), W("HURRY") + 0.4)
for k in range(3): f_place(crunch(0.12), W("CHOMP", k) + 0.04, 1.0, -0.2 + 0.2 * k)
f_place(pop(0.08, 600), W("GONE")); f_place(tictoc(3, 0.05), W("90SECONDS") - 0.4); f_place(ding(91, 0.08), W("90SECONDS") + 0.5)
f_place(knock(0.14), W("PLASTIC") - 0.12); f_place(knock(0.14), W("PLASTIC") + 0.15)
f_place(squeak(0.06), W("STAY") - 0.15); f_place(swish(0.5, 0.08), W("EMPTIES"))
f_place(pop(0.1, 700), W("NEXT") + 0.9)
f_place(ding(84, 0.06), W("NEXT", 1)); f_place(ding(88, 0.06), W("NEXT", 1) + 0.2)
for k in range(4): f_place(swish(0.3, 0.06), W("NEXT", 2) - 0.2 + k * 0.2, 1.0, -0.4 + 0.25 * k)
for k in range(6): f_place(thud(0.04), W("NEXT", 3) + k * 0.17)
f_place(popping(1.2, 0.04, 16), W("ALL"))
f_place(door_chime(0.07), W("WALKED") - 0.1); f_place(womp(0.05, 50), W("NOTHING") + 0.1)
f_place(chaching(0.08), W("COMBO") + 0.1); f_place(slurp(0.08), W("MILKSHAKE") + 0.1)
f_place(chime((79, 84, 88), 1.4, 0.06), W("DESIGN") + 0.1)
f_place(boing(0.07), W("ASK")); f_place(boing(0.08), W("AM"))
f_place(slurp(0.10), W("SIGN", 3) + 0.15); f_place(slurp(0.08), W("SIGN", 3) + 0.9)
f_place(cheer(2.5, 0.08), ENDT + 0.2); f_place(chime((72, 76, 79, 84, 88), 2.6, 0.14), ENDT + 0.05)
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
