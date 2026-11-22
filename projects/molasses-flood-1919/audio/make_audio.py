# Original score + sound effects for "The Day a Giant Wave of Molasses Destroyed a City Neighborhood" (Boston, 1919),
# all synthesized here and timed to the narration word timings (narration/words.json) and the camera cuts (CUTS, kept
# in sync with toon/src/mol/Mol.tsx): ragtime piano on a mild winter noon, groaning steel, popping rivets and the
# burst, the roar of the wave, a quiet bed for the victims, cold wind at night, a music box for the flashback, a
# gavel, a hopeful bed for the new rules and a warm outro in today's park.
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

CUTS = [2.3, 4.5, 7.0, 9.4, 11.4, 12.6, 14.6, 17.2, 20.0, 22.2, 23.5, 25.9, 29.6, 31.8, 35.8, 38.2, 41.6, 44.9, 48.4, 52.9, 55.6]
S = [0.0, 7.0, 17.2, 29.6, 35.8, 44.9, 52.9, 60.0]   # scenes
BURST = W("BURST")

# ============================================================== music
def brass(notes, dur, gain=1.0):
    x = sum(saw(nf(m), dur, d) for m in notes for d in (-0.003, 0.003)) / (2 * len(notes))
    return gain * lp(x, 2400, 2) * env(len(x), 0.04, 0.4, 0.7) * fades(np.ones(len(x)), 0.005, 0.08)
def knock(gain=1.0):
    t = tt(0.12); return gain * (np.sin(TAU * np.cumsum(420 + 300 * np.exp(-t / 0.01)) / SR) * np.exp(-t / 0.03) + 0.4 * bp(R.standard_normal(len(t)), 1500, 5000) * np.exp(-t / 0.01))
def thud(gain=1.0):
    t = tt(0.25); return gain * (np.sin(TAU * np.cumsum(70 + 60 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.07) + 0.3 * lp(R.standard_normal(len(t)), 600) * np.exp(-t / 0.03))
def cheer(dur=2.0, gain=1.0):
    return crowd(dur, gain * 1.6)
mus = np.zeros((2, N))
def m_place(x, t, g=1.0, p=0.0):
    place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def softpad(notes, dur, bright=1800, att=0.3):
    x = sum(saw(nf(m), dur, d) for m in notes for d in (-0.004, 0.0, 0.004)) / (3 * len(notes))
    return lp(x, bright, 2) * env(len(x), att, 99, 1.0) * fades(np.ones(len(x)), 0.01, min(1.0, dur / 3))
def piano(m, dur=0.6, gain=1.0):
    t = tt(dur); f = nf(m)
    x = sum(a * np.sin(TAU * f * k * (1 + 0.0004 * k * k) * t) * np.exp(-t / (d)) for k, a, d in ((1, 1, 0.5), (2, 0.45, 0.3), (3, 0.25, 0.2), (4, 0.12, 0.12)))
    return gain * x * (1 - np.exp(-t / 0.002))
def ragtime(t0, t1, g=0.05):
    """oom-pah left hand + syncopated right hand, C - A7 - Dm7 - G7"""
    prog = [(36, (64, 67, 72)), (33, (61, 64, 69)), (38, (65, 69, 72)), (31, (65, 67, 71))]
    mel = [76, 79, 81, 79, 76, 74, 72, 74]
    q = 0.25; tb = t0; bar = 0
    while tb < t1 - 0.1:
        r_, ch = prog[bar % 4]
        for k in range(8):
            a = tb + k * q
            if a >= t1: break
            if k % 2 == 0: m_place(piano(r_ if k % 4 == 0 else r_ + 7, 0.4, 0.9), a, g, -0.2)
            else:
                for m in ch: m_place(piano(m, 0.3, 0.45), a, g, 0.0)
            if k in (0, 3, 5, 6): m_place(piano(mel[(bar * 3 + k) % 8] + 12, 0.35, 0.8), a + (0.06 if k == 3 else 0), g, 0.25)
        tb += 8 * q; bar += 1
def drone(t0, dur, m=33, g=0.05):
    x = softpad((m, m + 7, m + 12), dur, 600, 1.0); m_place(x, t0, g)
def tremolo(notes, dur, g=0.04, rate=11):
    x = softpad(notes, dur, 2600, 0.05); t = np.arange(len(x)) / SR
    return x * (0.55 + 0.45 * np.sin(TAU * rate * t)) * g
def taiko(gain=1.0):
    t = tt(0.7); return gain * (np.sin(TAU * np.cumsum(55 + 70 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.25) + 0.3 * lp(R.standard_normal(len(t)), 700) * np.exp(-t / 0.04))
def musicbox(notes, t0, step=0.32, g=0.05):
    for k, m in enumerate(notes):
        t = tt(1.2); x = (np.sin(TAU * nf(m) * t) + 0.3 * np.sin(TAU * nf(m) * 3.98 * t)) * np.exp(-t / 0.45) * (1 - np.exp(-t / 0.001))
        m_place(x, t0 + k * step, g, 0.2 * np.sin(k))
# hook: low brass stab + taiko under the wave
m_place(brass((38, 45, 50), 1.6, 0.09), 0.0); m_place(taiko(0.14), 0.0); m_place(taiko(0.12), 2.3); m_place(brass((41, 48, 53), 1.4, 0.08), 2.3)
drone(0.0, 7.0, 26, 0.05)
m_place(brass((50, 57, 62), 0.9, 0.08), W("MOLASSES")); m_place(taiko(0.14), W("MOLASSES"))
# a mild winter noon: ragtime piano until the steel starts to groan
ragtime(S[1], BURST - 1.3, 0.055)
drone(9.4, BURST - 9.4 + 0.2, 31, 0.045)
# the wave: driving minor tremolo + taiko, then silence for the victims
for k, notes in enumerate([(50, 57, 62, 65), (46, 53, 58, 62), (48, 55, 60, 63), (45, 52, 57, 61)]):
    a = BURST + 0.6 + k * 3.4; d = min(3.4, 25.9 - a)
    if d > 0.2: m_place(tremolo(notes, d, 0.05), a)
b_ = BURST + 0.6
while b_ < 25.6:
    m_place(taiko(0.1), b_); m_place(taiko(0.06), b_ + 0.43); b_ += 0.86
m_place(softpad((50, 53, 57, 62), 29.6 - 25.9, 900, 1.0), 25.9, 0.05)
for k, m in enumerate((74, 72, 69, 65)): m_place(piano(m, 1.6, 0.8), 26.1 + k * 0.9, 0.035)
# night: icy pad + high bells
m_place(softpad((45, 52, 55, 60, 64), S[4] - S[3], 1100, 1.2), S[3], 0.05)
for k in range(6): m_place(chime((88 + (k % 3) * 3,), 1.2, 0.025), S[3] + 0.4 + k * 1.0)
# flashback music box, a sneaky pizzicato for the paint job, low strings in court
musicbox([72, 76, 79, 76, 74, 77, 81, 77, 72], 35.9, 0.3, 0.05)
for k in range(12): m_place(pluck([57, 60, 64, 60][k % 4], 0.2, 0.05), 38.3 + k * 0.27)
m_place(softpad((38, 45, 50, 53), S[5] - 41.6, 900, 0.5), 41.6, 0.06)
# rules: hopeful; summer: light waltz; today: warm outro
m_place(softpad((48, 55, 60, 64, 67), 48.4 - S[5], 2000, 0.6), S[5], 0.05); m_place(brass((60, 64, 67), 1.2, 0.04), W("STRICTER"))
for k in range(int((S[6] - 48.4) / 0.42)):
    a = 48.4 + k * 0.42; m_place(piano([48, 55, 52][k % 3] if k % 3 == 0 else [64, 67, 72][k % 3], 0.4, 0.7), a, 0.04, 0.1 * (k % 2))
for k, (r_, ch) in enumerate([(48, (60, 64, 67)), (45, (60, 64, 69)), (41, (60, 65, 69)), (43, (62, 67, 71))]):
    a = S[6] + k * 1.8; d = min(1.8, 60 - a)
    if d > 0.2: m_place(softpad(ch, d, 2200), a, 0.05); m_place(bass(r_ - 12, min(1.4, d), 380), a, 0.08)
    for h in range(4):
        if h * 0.45 < d: m_place(piano(ch[h % 3] + 12, 0.4, 0.7), a + h * 0.45, 0.035, 0.2)
m_place(chime((72, 76, 79, 84), 2.2, 0.07), 56.0)
mus += 0.18 * convolve_st(mus.mean(0), make_ir(1.8, 4, hf=1.2))
mus[:, ns(59.3):] *= np.linspace(1, 0.0, N - ns(59.3)) ** 1.5

# ============================================================== sound effects
fx = np.zeros((2, N))
def f_place(x, t, g=1.0, p=0.0):
    place(fx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def roar(dur, gain=1.0):
    n = ns(dur); t = np.arange(n) / SR
    x = lp(R.standard_normal(n), 380, 2) * 2.5 + 0.5 * bp(R.standard_normal(n), 400, 1800) * (0.6 + 0.4 * np.sin(TAU * 0.7 * t))
    return gain * widen(x * fades(np.ones(n), 0.08, 0.8), R, 17, 0.9)
def groan(dur=1.6, gain=1.0):
    t = tt(dur); f = 70 + 25 * np.sin(TAU * 0.9 * t) + 15 * t
    x = np.sign(np.sin(TAU * np.cumsum(f) / SR)) * 0.4 + np.sin(TAU * np.cumsum(f * 2.01) / SR) * 0.3
    return gain * bp(x, 80, 900) * np.sin(np.pi * t / dur) ** 0.7
def rivets(dur, gain=1.0, rate=16):
    out = np.zeros(ns(dur)); t_ = 0.0
    while t_ < dur - 0.05:
        c = knock(R.uniform(0.5, 1.0)); o = ns(t_); out[o: o + len(c)] += c[: len(out) - o]; t_ += R.exponential(1 / rate) * (1 - 0.6 * t_ / dur)
    return gain * out
def screech(dur=1.2, gain=1.0):
    t = tt(dur); f = 900 + 500 * np.sin(TAU * 1.7 * t) + 300 * t
    return gain * bp(np.sign(np.sin(TAU * np.cumsum(f) / SR)) * 0.4 + 0.2 * R.standard_normal(len(t)), 500, 5000) * np.sin(np.pi * t / dur)
def crash(gain=1.0):
    t = tt(1.4); x = lp(R.standard_normal(len(t)), 2500) * np.exp(-t / 0.35)
    for k in range(10):
        c = knock(R.uniform(0.3, 0.9)); o = ns(R.uniform(0, 0.9)); x[o: o + len(c)] += c[: len(x) - o]
    return gain * x
def squelch(gain=1.0):
    t = tt(0.4); f = 220 + 160 * np.sin(TAU * 6 * t); return gain * lp(np.sin(TAU * np.cumsum(f) / SR) * bp(R.standard_normal(len(t)), 200, 1500), 1200) * np.sin(np.pi * t / 0.4) * 3
def clop(gain=1.0):
    return knock(gain) * 0.8
def ship_horn(dur=1.8, gain=1.0):
    t = tt(dur); x = sum(np.sign(np.sin(TAU * f * t)) for f in (92, 138)) * 0.3
    return gain * lp(x, 700) * fades(np.ones(len(t)), 0.1, 0.4)
def fire_bell(dur=2.0, gain=1.0):
    out = np.zeros(ns(dur))
    for k in range(int(dur / 0.22)): b2 = bell(1.0)[: ns(0.5)]; o = ns(k * 0.22); out[o: o + len(b2)] += b2[: len(out) - o]
    return gain * out
def brush(gain=1.0):
    t = tt(0.5); return gain * bp(R.standard_normal(len(t)), 1500, 6000) * np.sin(np.pi * t / 0.5) ** 2 * 0.8
def gavel(gain=1.0):
    t = tt(0.4); return gain * (np.sin(TAU * np.cumsum(300 + 250 * np.exp(-t / 0.01)) / SR) * np.exp(-t / 0.06) + 0.6 * bp(R.standard_normal(len(t)), 800, 5000) * np.exp(-t / 0.015))
def stamp(gain=1.0):
    return thud(gain)
def bird(gain=1.0):
    t = tt(0.3); f = 3200 + 900 * np.sin(TAU * 13 * t); return gain * np.sin(TAU * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.3) ** 2
def bat_crack(gain=1.0):
    t = tt(0.25); return gain * (bp(R.standard_normal(len(t)), 1500, 8000) * np.exp(-t / 0.02) + 0.5 * np.sin(TAU * 900 * t) * np.exp(-t / 0.03))
def wind2(dur, gain=1.0):
    n = ns(dur); t = np.arange(n) / SR
    x = bp(R.standard_normal(n), 300, 1600) * (0.5 + 0.5 * np.sin(TAU * 0.21 * t + 1) * np.sin(TAU * 0.13 * t))
    return gain * widen(x * fades(np.ones(n), 0.5, 0.5), R, 13, 0.9)
# beds: busy 1919 street, the roar of the wave, night wind, court room tone, summer, today's park
f_place(crowd(BURST - 7.0, 0.035), 7.0)
for k in range(9): f_place(clop(0.03), 7.3 + k * 0.38, 0.4)
f_place(ship_horn(1.8, 0.05), 8.2, -0.5)
f_place(roar(7.0, 0.06), 0.0)
f_place(groan(1.6, 0.08), BURST - 1.6); f_place(rivets(1.2, 0.06), BURST - 1.0)
f_place(boom(0.16, 3.0), BURST); f_place(screech(1.0, 0.04), BURST + 0.05); f_place(crash(0.08), BURST + 0.1)
f_place(roar(25.9 - BURST - 0.2, 0.08), BURST + 0.2)
f_place(crash(0.09), W("SMASHED")); f_place(screech(1.4, 0.06), W("BENT")); f_place(crash(0.05), W("BENT") + 0.3)
f_place(fire_bell(2.4, 0.025), 23.6, 0.4)
f_place(paper(0.05), 26.0)
f_place(wind2(S[4] - S[3], 0.05), S[3]); f_place(squelch(0.05), 32.3); f_place(squelch(0.05), 33.4); f_place(squelch(0.05), 34.5)
f_place(crowd(41.6 - S[4], 0.02), S[4])
for k in range(4): f_place(pop(0.03, 300), 36.9 + k * 0.35)   # drips
for k in range(5): f_place(brush(0.06), 39.4 + k * 0.45)
f_place(gavel(0.09), W("RESPONSIBLE")); f_place(gavel(0.07), W("RESPONSIBLE") + 0.28)
f_place(paper(0.05), 45.2); f_place(stamp(0.09), W("STRICTER"))
for k in range(5): f_place(bird(0.03), 48.6 + k * 0.8, 0.3 * (-1) ** k)
f_place(crowd(60 - S[6], 0.03), S[6]); f_place(bat_crack(0.06), 54.2); f_place(cheer(1.5, 0.04), 54.3)
for c in CUTS: f_place(whoosh(0.32, 0.07), c - 0.16)
fx += 0.12 * convolve_st(fx.mean(0), make_ir(1.1, 8, hf=1.1))
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
