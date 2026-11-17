# Original light score + sound effects for "From empty shop to owner", all synthesized here, timed to
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
EMPTY = at("This EMPTY"); STAY = at("Stay to the END"); BECOMES = at("what it BECOMES"); ROSA = at("This is ROSA"); WORKS = at("9 to 5")
HOURS = at("her hours"); SOMEONE = at("SOMEONE ELSE"); OWNING = at("OWNING"); FRAN = at("a FRANCHISE"); BRAND = at("proven BRAND"); FEE = at("pay a FEE")
ROYAL = at("ROYALTIES"); OWN = at("OWN IDEA"); CHEAP = at("CHEAPER"); ALL = at("ALL on you"); MATHS = at("MATH is simple"); SALES = at("SALES, minus")
SALES_E = next(c["end"] for c in CH if "SALES, minus" in c["text"]); COSTS = SALES + 0.36 * (SALES_E - SALES); PROFIT = SALES + 0.74 * (SALES_E - SALES)
TEAM = at("TEAM"); EARNS = at("EARNS"); NOTEASY = at("NOT easy"); HALF = at("HALF"); SMALL = at("start SMALL"); TEST = at("TEST the"); READ = at("READ every")
BECOME = at("BECOME?"); BAKERY = at("ROSA'S BAKERY"); MANAGER = at("MANAGER"); SHOP2 = at("SHOP #2"); FREE = at("FREE:"); PROBS = at("3 PROBLEMS"); ENDT = CH[-1]["end"]
CUTS = [180 / 30, 345 / 30, 775 / 30, 1015 / 30, 1270 / 30, 1545 / 30]

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

# ============================================================== music: a warm plucked pop groove (C G Am F), hush + drum roll before the reveal
mus = np.zeros((2, N))
def m_place(x, t, g=1.0, p=0.0):
    place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def softpad(notes, dur, bright=1500):
    x = sum(saw(nf(m), dur, d) for m in notes for d in (-0.004, 0.0, 0.004)) / (3 * len(notes))
    return lp(x, bright, 2) * env(len(x), 0.5, 99, 1.0) * fades(np.ones(len(x)), 0.01, min(1.0, dur / 3))
B = 60 / 100.0
PROG = [(48, (60, 64, 67)), (43, (59, 62, 67)), (45, (60, 64, 69)), (41, (60, 65, 69))]      # C G Am F
MEL = [[76, 79, 81, 79], [74, 79, 74, 71], [72, 76, 79, 76], [77, 76, 74, 72]]
HUSH0, HUSH1 = BECOME - 0.3, BAKERY
SAD0, SAD1 = NOTEASY - 0.2, SMALL                                  # the "not easy" bars: minor colour, no drums
tb = 0.02; bar = 0
while tb < 59.0:
    r_, ch = PROG[bar % 4]
    if HUSH0 - 0.2 < tb < HUSH1: tb += 4 * B; bar += 1; continue
    sad = SAD0 - 0.5 < tb < SAD1
    if sad: r_, ch = [(45, (57, 60, 64)), (41, (57, 60, 65)), (45, (57, 60, 64)), (40, (56, 59, 64))][bar % 4]
    m_place(softpad(ch, 4 * B, 1300), tb, 0.06, 0.0)
    for k in range(8):                                             # ukulele-ish strum pattern in 8ths
        if k in (0, 3, 4, 6):
            for j, m in enumerate(ch): m_place(pluck(m + 12, 0.32, 0.045), tb + k * B / 2 + j * 0.012, 1.0, -0.3 + 0.2 * j)
    m_place(bass(r_ - 12, B * 1.8, 360), tb, 0.2); m_place(bass(r_ - 12, B * 0.9, 360), tb + 2.5 * B, 0.16)
    if tb > 5.5 and not sad:
        for k in range(4):
            m_place(hat(0.035), tb + k * B + B / 2, 1.0, 0.35)
            if k % 2 == 1: m_place(snare(0.04), tb + k * B, 1.0, 0.1)
        m_place(kick(0.18), tb); m_place(kick(0.12), tb + 2 * B)
        if tb > 11 and bar % 2 == 0:
            for k, m in enumerate(MEL[(bar // 2) % 4]): m_place(chime((m,), 0.6, 0.05), tb + k * B, 1.0, 0.25)
    tb += 4 * B; bar += 1
# the hush: a snare roll building into the reveal
t_ = HUSH0 + 0.2; n_ = 0
while t_ < HUSH1 - 0.05:
    u_ = (t_ - HUSH0) / (HUSH1 - HUSH0); m_place(snare(0.012 + 0.05 * u_ ** 2), t_, 1.0, 0.0); t_ += 0.11 - 0.06 * u_
m_place(riser(HUSH1 - HUSH0, 0.08, 48), HUSH0)
m_place(softpad((48, 55, 60, 64, 67, 72, 76), 60 - ENDT, 2400), ENDT - 0.3, 0.2)       # the closing chord
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
def tickclock(gain=1.0):
    t = tt(0.05); return gain * bp(R.standard_normal(len(t)), 3000, 8000) * np.exp(-t / 0.006)
def typing(dur, gain=1.0):
    out = np.zeros(ns(dur)); t_ = 0.0
    while t_ < dur - 0.05: c = tick(1.0); o = ns(t_); out[o: o + len(c)] += c[: len(out) - o]; t_ += R.uniform(0.06, 0.16)
    return gain * out
def shutter(gain=1.0):
    t = tt(0.6); return gain * lp(R.standard_normal(len(t)), 1200) * (0.5 + 0.5 * np.sign(np.sin(TAU * 18 * t))) * np.exp(-t / 0.25)
OUTS = [(0.0, 180 / 30), (1015 / 30, 60.0)]
for a_, b_ in OUTS: f_place(wind(b_ - a_, 0.05), a_); f_place(crowd(b_ - a_, 0.025), a_)
f_place(typing(345 / 30 - 180 / 30 - 0.4, 0.05), 180 / 30 + 0.2)                        # the office
for c in CUTS: f_place(whoosh(0.5, 0.2), c - 0.25)
f_place(chime((72, 79, 84), 1.4, 0.10), EMPTY + 0.4); f_place(pop(0.12, 600), BECOMES + 0.2)
f_place(ding(84, 0.12), ROSA)
for k in range(12): f_place(tickclock(0.10), WORKS + k * 0.18)
for k in range(5): f_place(paper(0.10), HOURS + 0.1 + k * 0.2, 1.0, 0.5)
f_place(chaching(0.10), SOMEONE + 0.2)
f_place(boom(0.12, 1.2), OWNING); f_place(chime((72, 76, 79, 84), 1.2, 0.10), OWNING + 0.1)
f_place(pop(0.12, 520), FRAN); f_place(pop(0.12, 640), BRAND + 0.35)
for k in range(4): f_place(paper(0.09), FEE + 0.1 + k * 0.17, 1.0, -0.4)
for k in range(9): f_place(coin(0.05), ROYAL + 0.3 + k * 0.27, 1.0, -0.6)
f_place(ding(88, 0.12), OWN + 0.1); f_place(pop(0.1, 700), CHEAP)
for k in range(4): f_place(pop(0.09, 500 + 90 * k), ALL + 0.1 + k * 0.23, 1.0, 0.4)
for k in range(10): f_place(coin(0.06), (SALES * 30 - 4 + k * 2.2 + 12) / 30, 1.0, -0.2)
for k in range(9): f_place(coin(0.05), (COSTS * 30 + k * 3.2 + 14) / 30, 1.0, R.uniform(-0.5, 0.5))
f_place(chaching(0.10), PROFIT + 0.1)
f_place(ding(86, 0.10), TEAM); f_place(ding(91, 0.08), TEAM + 0.17)
for k in range(8): f_place(coin(0.04), EARNS + 0.4 + k * 0.3, 1.0, -0.3)
for k in range(4): f_place(shutter(0.06), HALF + 8 / 30 + k * 10 / 30, 1.0, R.uniform(-0.6, 0.6))
f_place(pop(0.1, 600), SMALL); f_place(pop(0.1, 720), TEST)
for k in range(2): f_place(paper(0.1), READ + 0.1 + k * 0.25)
f_place(boom(0.22, 2.4), BAKERY - 0.05); f_place(chime((72, 79, 84, 88, 91), 2.2, 0.14), BAKERY + 0.05)
f_place(crowd(3.0, 0.10), BAKERY + 0.1); f_place(door_chime(0.09), BAKERY + 1.0)
f_place(clink(0.10, 2800), MANAGER + 0.8)
f_place(chime((79, 84, 88), 1.6, 0.12), SHOP2 + 0.15); f_place(crowd(2.0, 0.07), SHOP2 + 0.2)
f_place(pop(0.1, 600), FREE); f_place(paper(0.1), PROBS + 0.2)
f_place(chime((72, 76, 79, 84, 88), 2.6, 0.16), ENDT + 0.05)
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
