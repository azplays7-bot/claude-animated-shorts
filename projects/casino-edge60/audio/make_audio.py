# Original light score + sound effects for "How casinos make money (and their one weakness)", all synthesized here, timed to
# narration/timing.json and the shots (toon/src/story.ts), mixed with narration/narration.wav: music ducked under the voice,
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
at = lambda needle: next(c["start"] for c in CH if needle in c["text"])
WEAK = at("ONE weakness"); STAY = at("Stay to the END"); MAXB = at("This is MAX"); POCK = at("38 POCKETS"); ZERO = at("plus 0 and 00")
BET = at("Bet $1"); T38 = at("that's $38"); WINS = at("One number WINS"); PAYS = at("35 to 1"); BACK = at("get back $36"); KEEPS = at("keeps $2")
EVERY = at("EVERY SPIN"); EDGE = at("HOUSE EDGE"); SLOTS = at("SLOTS, BLACKJACK"); ROOM = at("ROOM helps"); CHIPS = at("CHIPS don't"); DRINKS = at("free DRINKS")
CLOCKS = at("hide the CLOCKS"); NIGHT = at("ONE night"); MILL = at("MILLIONS"); MATH = at("MATH always"); WHAT = at("WEAKNESS?"); TIME = at("TIME.")
KEEP = at("KEEP PLAYING"); UP = at("UP $50"); WALKS = at("WALKS OUT"); HOUSE = at("can't win back"); LEFT = at("LEFT the building"); ENDT = CH[-1]["end"]
CUTS = [160 / 30, 400 / 30, 755 / 30, 940 / 30, 1160 / 30, 1310 / 30, 1525 / 30]

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

# ============================================================== music: a sly lounge swing (Am7 D9 Gmaj7 E7), suspense before the reveal
mus = np.zeros((2, N))
def m_place(x, t, g=1.0, p=0.0):
    place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def epiano(m, dur=0.9, gain=1.0):
    t = tt(dur); f = nf(m)
    x = np.sin(TAU * f * t + 0.8 * np.sin(TAU * f * t) * np.exp(-t / 0.3)) * np.exp(-t / 0.55) + 0.25 * np.sin(TAU * 2 * f * t) * np.exp(-t / 0.2)
    return gain * x * (1 - np.exp(-t / 0.003)) * fades(np.ones(len(t)), 0.001, 0.05)
def softpad(notes, dur, bright=1500):
    x = sum(saw(nf(m), dur, d) for m in notes for d in (-0.004, 0.0, 0.004)) / (3 * len(notes))
    return lp(x, bright, 2) * env(len(x), 0.5, 99, 1.0) * fades(np.ones(len(x)), 0.01, min(1.0, dur / 3))
BPM_ = 104.0; B = 60 / BPM_
PROG = [(45, (60, 64, 67, 72)), (50, (60, 64, 66, 69)), (43, (59, 62, 66, 69)), (40, (59, 62, 64, 68))]   # Am7 D9 Gmaj7 E7
WALK = [[45, 48, 52, 55], [50, 54, 57, 54], [43, 47, 50, 54], [40, 44, 47, 50]]
MEL = [[76, 79, 76, 74], [72, 74, 76, 78], [79, 78, 74, 71], [71, 74, 76, 80]]
SUS0, SUS1 = MATH + 1.0, TIME                                   # the music holds its breath for the question
tb = 0.02; bar = 0
while tb < 59.0:
    r_, ch = PROG[bar % 4]
    if not (SUS0 - 0.5 < tb < SUS1):
        m_place(softpad(ch, 4 * B, 1100), tb, 0.08, 0.0)
        for k in range(4): m_place(bass(WALK[bar % 4][k] - 12, B * 0.85, 380), tb + k * B, 0.17)        # walking bass
        for k in (1, 3): m_place(epiano(ch[k % 4], 0.5, 0.09), tb + k * B, 1.0, -0.25)                   # comp on 2 and 4
        if tb > 4.5:
            for k in range(4):
                m_place(hat(0.04, False), tb + k * B, 1.0, 0.35); m_place(hat(0.03), tb + k * B + B * 0.66, 1.0, 0.35)   # swung ride
                if k % 2 == 1: m_place(snare(0.035), tb + k * B, 1.0, 0.1)
            m_place(kick(0.16), tb)
        if bar % 2 == 0 and tb > 10:
            for k, m in enumerate(MEL[(bar // 2) % 4]): m_place(epiano(m, 0.6, 0.06), tb + k * B + (B * 0.16 if k % 2 else 0), 1.0, 0.2)
    tb += 4 * B; bar += 1
# suspense: a low heartbeat + rising tremolo pad from MATH to TIME
hb = SUS0
while hb < SUS1 - 0.2: m_place(kick(0.3), hb); m_place(kick(0.18), hb + 0.22); hb += 0.75
m_place(riser(SUS1 - SUS0, 0.12, 40), SUS0)
m_place(softpad((57, 60, 64, 69, 72, 76), 60 - LEFT, 2200), LEFT - 0.2, 0.2)   # the closing chord
mus += 0.18 * convolve_st(mus.mean(0), make_ir(1.6, 4, hf=1.2))
mus[:, ns(59.3):] *= np.linspace(1, 0.0, N - ns(59.3)) ** 1.5

# ============================================================== environment + sound effects
fx = np.zeros((2, N))
def f_place(x, t, g=1.0, p=0.0):
    place(fx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def wind(dur, gain=1.0):
    n = ns(dur); x = lp(R.standard_normal(n), 500, 2) * (0.6 + 0.4 * np.sin(TAU * 0.13 * np.arange(n) / SR + 1))
    return gain * widen(x * fades(np.ones(n), 0.5, 0.5), R, 13, 0.9)
def chipclack(gain=1.0):
    t = tt(0.08); return gain * (bp(R.standard_normal(len(t)), 2500, 9000) * np.exp(-t / 0.008) + 0.4 * np.sin(TAU * 3200 * t) * np.exp(-t / 0.02))
def ballroll(dur, gain=1.0):
    n = ns(dur); t = np.arange(n) / SR; u = t / dur
    rate = 22 * (1 - 0.7 * u); ph = np.cumsum(rate) / SR
    clicks = (np.sin(TAU * ph) > 0.97).astype(float)
    x = bp(R.standard_normal(n), 1500, 6000) * (0.3 + clicks) + 0.2 * lp(R.standard_normal(n), 400)
    return gain * x * fades(np.ones(n), 0.1, 0.3)
def slotjingle(gain=1.0):
    out = np.zeros(ns(1.2))
    for k, m in enumerate((84, 88, 91, 96, 91, 96)): c = beep(nf(m), 0.09, 1.0); o = ns(k * 0.09); out[o: o + len(c)] += c
    return gain * lp(out, 5000)
def tickclock(gain=1.0):
    t = tt(0.05); return gain * bp(R.standard_normal(len(t)), 3000, 8000) * np.exp(-t / 0.006)
def step(gain=1.0):
    t = tt(0.12); return gain * lp(R.standard_normal(len(t)), 1800) * np.exp(-t / 0.025) + gain * 0.5 * np.sin(TAU * 90 * t) * np.exp(-t / 0.03)
def buzzer(gain=1.0):
    t = tt(0.5); return gain * lp(np.sign(np.sin(TAU * 110 * t)), 1500) * fades(np.ones(len(t)), 0.005, 0.08) * 0.5
INSIDE = [(160 / 30, 400 / 30), (755 / 30, 1160 / 30), (1310 / 30, 1525 / 30)]
OUTS = [(0.0, 160 / 30), (1160 / 30, 1310 / 30), (1525 / 30, 60.0)]
for a_, b_ in OUTS: f_place(wind(b_ - a_, 0.05), a_); f_place(crowd(b_ - a_, 0.03), a_)
for a_, b_ in INSIDE:
    f_place(crowd(b_ - a_, 0.06), a_)
    tb = a_ + 0.6
    while tb < b_ - 1.0: f_place(slotjingle(0.025), tb, 1.0, R.uniform(-0.8, 0.8)); tb += R.uniform(1.2, 2.6)
for c in CUTS: f_place(whoosh(0.5, 0.22), c - 0.25)
f_place(boom(0.18, 1.6), WEAK + 0.5); f_place(chime((69, 76, 81), 1.4, 0.10), WEAK + 0.5)
f_place(ding(84, 0.12), MAXB)
f_place(ballroll(POCK - 160 / 30 + 5.0, 0.05), 160 / 30 + 0.5)
for i in range(3): f_place(pop(0.12, 600 + 120 * i), ZERO + 0.0 + i * 0.4)
for k in range(38): f_place(chipclack(0.10), BET + 0.07 + k * 0.043 + 0.5, 1.0, R.uniform(-0.5, 0.5))      # 38 chips land
f_place(ballroll(1.4, 0.07), WINS - 1.4); f_place(chime((79, 84, 88), 1.2, 0.14), WINS)
for k in range(36): f_place(chipclack(0.08), BACK - 0.4 + k * 0.033 + 0.5, 1.0, -0.4)                    # 36 back to Max
f_place(chaching(0.11), KEEPS + 0.9)
for k in range(5): f_place(pop(0.09, 700), EVERY + 0.2 + k * 0.53, 1.0, 0.4)
f_place(boom(0.16, 1.2), EDGE)
for i in range(3): f_place(pop(0.1, 520 + 80 * i), SLOTS + 0.45 * i)
for k in range(5): f_place(chipclack(0.08), CHIPS + 0.1 + k * 0.27)
f_place(clink(0.12, 3200), DRINKS + 0.6)
for k in range(6): f_place(tickclock(0.12), CLOCKS + 0.1 + k * 0.33)
f_place(buzzer(0.08), CLOCKS + 2.0)
f_place(ding(88, 0.12), NIGHT + 0.2)
for k in range(40): f_place(chipclack(0.06), MILL + k * 0.07, 1.0, R.uniform(-0.8, 0.8))
f_place(chaching(0.16), MATH + 0.3)
f_place(boom(0.2, 2.4), TIME - 0.12); f_place(chime((69, 76, 81, 88), 2.0, 0.12), TIME + 0.6)
for k in range(8): f_place(tickclock(0.10), TIME + 0.6 + k * 0.5)
for k in range(6): f_place(chipclack(0.08), KEEP + 0.1 + k * 0.24)
f_place(slotjingle(0.05), UP); f_place(chaching(0.10), UP + 0.9)
for k in range(14): f_place(step(0.10), 1516 / 30 + k * 0.52, 1.0, 0.1)
f_place(door_chime(0.10), WALKS - 0.6)
f_place(chime((69, 76, 81, 84, 88), 2.6, 0.18), ENDT + 0.05)
fx += 0.10 * convolve_st(fx.mean(0), make_ir(1.0, 8, hf=1.2))
fx[:, ns(59.3):] *= np.linspace(1, 0.0, N - ns(59.3)) ** 1.5

# ============================================================== mix
v, vsr = read_wav(os.path.join(HERE, "..", "narration", "narration.wav"))
v = st(v)[:, :N]; v = np.pad(v, ((0, 0), (0, N - v.shape[1])))
speech = np.zeros(N)
for s_ in SENT: speech[ns(s_["start"]): ns(s_["end"])] = 1.0
duck = np.convolve(speech, np.ones(ns(0.15)) / ns(0.15), mode="same")
vI = integrated(v)
mus_d = mus * dbg(-7.0 * duck)[None, :]; mus_d *= dbg(vI - 15.0 - integrated(mus_d))   # subtle bed
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
