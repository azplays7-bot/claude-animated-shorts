# Original light score + sound effects for "Why theaters lose money on the movie", all synthesized here, timed to
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
at = lambda needle: next(c["start"] for c in CH if needle in c["text"])
end_ = lambda needle: next(c["end"] for c in CH if needle in c["text"])
TICKET = at("movie TICKET"); LITTLE = at("very LITTLE"); CURTAIN = at("behind this CURTAIN"); STAY = at("Stay to the END")
STUDIO = at("the STUDIO"); HALF = at("over HALF"); RENT = at("Then RENT"); POWER = RENT + 0.62 * (end_("Then RENT") - RENT); SCREENS = at("giant SCREENS")
DIMMED = at("DIMMED"); GONE = at("is GONE"); KEEP = at("might keep"); SURVIVE = at("SURVIVE"); HUNDREDS = at("HUNDREDS"); ALLOWED = at("AREN'T ALLOWED")
PROFITABLE = at("PROFITABLE"); WHAT = at("behind the CURTAIN?"); POPCORN = at("POPCORN."); TUB = at("$9 tub"); THIRD = at("a THIRD"); PROFIT = at("mostly PROFIT")
GETSIN = at("gets you IN"); BILLS = at("pays the BILLS"); PRINTERS = at("PRINTERS"); CONSOLES = at("CONSOLES"); CHEAP = at("looks CHEAP"); FIND = at("find the POPCORN"); ENDT = CH[-1]["end"]
CUTS = [165 / 30, 300 / 30, 735 / 30, 1370 / 30]
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

# ============================================================== music: a bouncy showtime groove (F Dm Bb C), a tense minor pulse in the lobby, drum roll into the reveal
mus = np.zeros((2, N))
def m_place(x, t, g=1.0, p=0.0):
    place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def softpad(notes, dur, bright=1500):
    x = sum(saw(nf(m), dur, d) for m in notes for d in (-0.004, 0.0, 0.004)) / (3 * len(notes))
    return lp(x, bright, 2) * env(len(x), 0.5, 99, 1.0) * fades(np.ones(len(x)), 0.01, min(1.0, dur / 3))
B = 60 / 108.0
PROG = [(41, (60, 65, 69)), (38, (62, 65, 69)), (46, (62, 65, 70)), (48, (60, 64, 67))]      # F Dm Bb C
TENSE = [(45, (57, 60, 64)), (41, (57, 60, 65)), (45, (57, 60, 64)), (40, (56, 59, 64))]      # Am F Am E
MEL = [[77, 76, 74, 72], [74, 77, 81, 77], [74, 72, 70, 69], [72, 74, 76, 79]]
HUSH0, HUSH1 = WHAT - 0.2, POPCORN
TEN0, TEN1 = SURVIVE - 0.3, HUSH0                          # the lobby: minor pulse, no snare
tb = 0.02; bar = 0
while tb < 59.0:
    if HUSH0 - 0.3 < tb < HUSH1: tb += 4 * B; bar += 1; continue
    tense = TEN0 - 0.5 < tb < TEN1
    r_, ch = (TENSE if tense else PROG)[bar % 4]
    m_place(softpad(ch, 4 * B, 1200 if tense else 1500), tb, 0.06, 0.0)
    if tense:
        for k in range(8): m_place(pluck(ch[k % 3] + 12, 0.2, 0.035), tb + k * B / 2, 1.0, -0.2 + 0.1 * (k % 3))
        for k in range(4): m_place(bass(r_ - 12, B * 0.45, 300), tb + k * B, 0.17)
        m_place(kick(0.12), tb); m_place(kick(0.10), tb + 2 * B)
    else:
        for k in range(8):                                     # bouncy stabs on the off-beats
            if k in (1, 3, 5, 7):
                for j, m in enumerate(ch): m_place(pluck(m + 12, 0.28, 0.04), tb + k * B / 2 + j * 0.01, 1.0, -0.3 + 0.2 * j)
        m_place(bass(r_ - 12, B * 0.9, 380), tb, 0.2); m_place(bass(r_ - 5, B * 0.9, 380), tb + B, 0.15)
        m_place(bass(r_ - 12, B * 0.9, 380), tb + 2 * B, 0.18); m_place(bass(r_ - 5, B * 0.9, 380), tb + 3 * B, 0.15)
        if tb > 4.5:
            for k in range(4):
                m_place(hat(0.035), tb + k * B + B / 2, 1.0, 0.35)
                if k % 2 == 1: m_place(snare(0.045), tb + k * B, 1.0, 0.1)
            m_place(kick(0.18), tb); m_place(kick(0.12), tb + 2 * B)
            if tb > 10 and bar % 2 == 0:
                for k, m in enumerate(MEL[(bar // 2) % 4]): m_place(chime((m,), 0.6, 0.05), tb + k * B, 1.0, 0.25)
    tb += 4 * B; bar += 1
# the hush: a snare roll building into the reveal
t_ = HUSH0 + 0.2
while t_ < HUSH1 - 0.05:
    u_ = (t_ - HUSH0) / (HUSH1 - HUSH0); m_place(snare(0.012 + 0.05 * u_ ** 2), t_, 1.0, 0.0); t_ += 0.11 - 0.06 * u_
m_place(riser(HUSH1 - HUSH0, 0.08, 48), HUSH0)
m_place(softpad((41, 48, 53, 57, 60, 65, 69), 60 - ENDT, 2400), ENDT - 0.3, 0.2)       # the closing chord (F)
mus += 0.18 * convolve_st(mus.mean(0), make_ir(1.6, 4, hf=1.2))
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
for a_, b_ in [(0.0, CUTS[0]), (CUTS[3], 60.0)]: f_place(wind(b_ - a_, 0.05), a_); f_place(crowd(b_ - a_, 0.025), a_)
for a_, b_ in [(CUTS[0], CUTS[1]), (CUTS[2], CUTS[3])]: f_place(crowd(b_ - a_, 0.03), a_)
f_place(crowd(POPCORN - HUNDREDS, 0.05), HUNDREDS)
for c in CUTS: f_place(whoosh(0.5, 0.2), c - 0.25)
f_place(paper(0.12), TICKET + 0.2); f_place(ding(84, 0.12), TICKET + 0.6)
f_place(womp(0.06), LITTLE + 0.6)
f_place(swish(1.0, 0.12), CURTAIN + 0.3); f_place(pop(0.12, 600), CURTAIN + 0.73)
for k in range(15): f_place(coin(0.05), F(296 + k * 1.6 + 12), 1.0, -0.3)
for k in range(8): f_place(coin(0.05), F(HALF * 30 + k * 3.0 + 14), 1.0, -0.4)
for k in range(3): f_place(coin(0.05), F(RENT * 30 + k * 3.0 + 14), 1.0, 0.0)
for k in range(2): f_place(coin(0.05), F(POWER * 30 + k * 3.0 + 14), 1.0, 0.4)
f_place(pop(0.1, 520), STUDIO)
f_place(boom(0.10, 1.2), GONE)
f_place(womp(0.08), KEEP + 0.5)
for k in range(4): f_place(growl(0.06), F(HUNDREDS * 30 + 30 + k * 12), 1.0, R.uniform(-0.6, 0.6))
f_place(buzzer(0.06), ALLOWED + 0.15)
f_place(chime((79, 84, 88), 1.4, 0.06), PROFITABLE + 0.2)
f_place(boom(0.22, 2.4), POPCORN - 0.05); f_place(chime((65, 72, 77, 81, 84), 2.2, 0.14), POPCORN + 0.05)
f_place(swish(0.8, 0.14), POPCORN); f_place(popping(GETSIN - POPCORN - 0.5, 0.05), POPCORN + 0.1); f_place(crowd(3.0, 0.10), POPCORN + 0.1)
f_place(ding(84, 0.10), TUB + 0.2); f_place(pop(0.1, 500), TUB + 1.4); f_place(chaching(0.10), TUB + 2.3)
for k in range(10): f_place(coin(0.04), THIRD + 0.15 + k * 0.4, 1.0, R.uniform(-0.5, 0.5))
f_place(chaching(0.08), PROFIT)
f_place(door_chime(0.08), GETSIN + 0.1); f_place(chaching(0.10), BILLS + 0.1)
f_place(whirr(0.9, 0.05), PRINTERS + 0.05); f_place(pop(0.1, 700), PRINTERS + 0.55)
f_place(blips(0.05), CONSOLES + 0.05); f_place(pop(0.1, 760), CONSOLES + 0.55)
f_place(pop(0.1, 600), CHEAP); f_place(boom(0.10, 1.4), FIND); f_place(popping(1.2, 0.05, 20), FIND + 0.05)
f_place(chime((65, 69, 72, 77, 81), 2.6, 0.16), ENDT + 0.05)
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
