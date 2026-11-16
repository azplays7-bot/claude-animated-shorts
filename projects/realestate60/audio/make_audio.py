# Original light score + environmental sound effects for "How real estate can build wealth", all synthesized here, timed to
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
at = lambda needle: next(c["start"] for c in CH if needle in c["text"])
B1_MEET = at("Meet ALEX"); B2_DOWN = at("puts down"); B2_LOAN = at("borrows"); B2_BACK = at("pays it back")
B3_RENTS = at("RENTS it"); B3_PAY = at("They pay him"); B3_NOT = at("NOT all profit"); B3_BILLS = at("BILLS to pay")
B4_MORT = at("Mortgage:"); B4_TAX = at("Taxes and"); B4_REP = at("Repairs and"); B4_LEFT = at("That leaves"); B4_WIPE = at("REPAIR could")
B5_EQ = at("EQUITY grows"); B5_DEF = at("EQUITY is the"); B6_GUAR = at("GUARANTEED"); B6_SECRET = at("The SECRET")
C1_OUT, C2_OFFICE, C2_KEYS, C3_BILLS = 3.4, 13.0, B2_BACK - 0.1, B3_NOT - 0.05   # same cuts as src/Scenes.tsx
Y0, Y1 = 40.4, 47.6
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

# ============================================================== music: light, warm and hopeful; every clip starts on a downbeat
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
BPM_ = 100.0; B = 60 / BPM_                                    # one bar = 2.4 s, four bars + a breath per clip
PROG = [(48, (60, 64, 67)), (43, (59, 62, 67)), (45, (60, 64, 69)), (41, (60, 65, 69))]   # C  G/B  Am  F
MEL = [[76, 74, 72, 74], [74, 71, 67, 71], [72, 76, 79, 76], [77, 76, 74, 72]]
for clip in range(6):
    t0 = clip * 10.0
    dark = clip == 3 and False
    for bar in range(4):
        tb = t0 + 0.02 + bar * 4 * B
        r_, ch = PROG[bar % 4]
        m_place(softpad(ch, 4 * B, 1200 + 150 * clip), tb, 0.10, 0.0)
        m_place(bass(r_ - 12, 4 * B * 0.9, 300), tb, 0.16)
        for k in range(8):                                     # e-piano eighths, gently swung
            tk = tb + k * B / 2 + (0.03 if k % 2 else 0)
            m_place(epiano(ch[k % 3] + (12 if k in (3, 7) else 0), 0.7, 0.10), tk, 1.0, (-0.3, 0.3)[k % 2])
        if clip >= 1:
            for k in range(4):
                m_place(kick(0.22), tb + k * B) if k % 2 == 0 else m_place(snare(0.07), tb + k * B, 1.0, 0.1)
                m_place(hat(0.035), tb + k * B + B / 2, 1.0, 0.35)
        if clip in (0, 2, 4, 5):                               # a whistled-sounding top line
            for k, m in enumerate(MEL[bar % 4]):
                m_place(chime((m,), 0.8, 0.05), tb + k * B, 1.0, 0.15)
    m_place(chime((72, 79, 84), 1.4, 0.10), t0 + 0.02)         # each clip opens on a bright hit
m_place(softpad((48, 55, 60, 64, 67, 72), 60 - B6_SECRET, 2400), B6_SECRET, 0.22)   # the closing chord
mus += 0.18 * convolve_st(mus.mean(0), make_ir(1.6, 4, hf=1.2))
mus[:, ns(B4_WIPE): ns(B4_WIPE + 1.8)] *= 0.35                 # the music drops out for the warning
for b_ in range(1, 6):                                          # clean clip edges
    mus[:, ns(b_ * 10 - 0.03): ns(b_ * 10 + 0.01)] *= 0.3
mus[:, ns(59.3):] *= np.linspace(1, 0.0, N - ns(59.3)) ** 1.5

# ============================================================== environment + sound effects
fx = np.zeros((2, N))
def f_place(x, t, g=1.0, p=0.0):
    place(fx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def bird(gain=1.0):
    d = R.uniform(0.12, 0.3); t = tt(d); f0 = R.uniform(2600, 4200)
    f = f0 * (1 + 0.25 * np.sin(TAU * R.uniform(12, 25) * t)) * (1 + R.uniform(-0.3, 0.3) * t / d)
    return gain * np.sin(TAU * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 2
def wind(dur, gain=1.0):
    n = ns(dur); x = lp(R.standard_normal(n), 500, 2) * (0.6 + 0.4 * np.sin(TAU * 0.13 * np.arange(n) / SR + 1))
    return gain * widen(x * fades(np.ones(n), 0.5, 0.5), R, 13, 0.9)
def hum(dur, gain=1.0):
    t = tt(dur); return gain * (np.sin(TAU * 60 * t) * 0.4 + np.sin(TAU * 120 * t) * 0.2 + 0.4 * lp(R.standard_normal(len(t)), 300)) * fades(np.ones(len(t)), 0.05, 0.05)
def step(gain=1.0):
    t = tt(0.12); return gain * lp(R.standard_normal(len(t)), 1800) * np.exp(-t / 0.025) + gain * 0.5 * np.sin(TAU * 90 * t) * np.exp(-t / 0.03)
def thud(gain=1.0, f=110):
    t = tt(0.3); return gain * (np.sin(TAU * f * t) * np.exp(-t / 0.07) + 0.4 * lp(R.standard_normal(len(t)), 900) * np.exp(-t / 0.03))
def jingle(gain=1.0):
    out = np.zeros(ns(0.7))
    for k in range(7): c = clink(1.0, R.uniform(3000, 5200)); o = ns(k * 0.06 + R.uniform(0, 0.03)); out[o: o + len(c)] += c[: len(out) - o]
    return gain * out / 3
def scribble(dur, gain=1.0):
    n = ns(dur); t = np.arange(n) / SR
    return gain * bp(R.standard_normal(n), 2500, 7000) * (0.5 + 0.5 * np.sign(np.sin(TAU * 7 * t + 2 * np.sin(TAU * 3 * t))))
def flutter(gain=1.0):
    t = tt(0.18); return gain * bp(R.standard_normal(len(t)), 1800, 6000) * np.sin(np.pi * t / 0.18) * (0.6 + 0.4 * np.sin(TAU * 40 * t))
def alarm(gain=1.0):
    t = tt(0.9); f = 520 + 180 * np.sign(np.sin(TAU * 4 * t))
    return gain * lp(np.sign(np.sin(TAU * np.cumsum(f) / SR)), 2500) * fades(np.ones(len(t)), 0.005, 0.1) * 0.5
# 1. office: hum, clock, a tired sigh-like low swell; then the street
f_place(hum(C1_OUT, 0.10), 0.0)
for k in range(4): f_place(tick(0.3), 0.3 + k, 1.0, 0.4)
for k in range(9): f_place(tick(0.08), 0.6 + k * 0.17 + (0.4 if k > 4 else 0), 1.0, -0.3)   # keyboard
f_place(whoosh(0.8, 0.4, up=False), C1_OUT - 0.4)
OUT = [(C1_OUT, 30.0), (40.0, 60.0)]                     # outdoor stretches
for a, b in OUT:
    f_place(wind(b - a, 0.05), a)
    tb = a + 0.3
    while tb < b - 0.5:
        f_place(bird(0.07), tb, 1.0, R.uniform(-0.7, 0.7)); tb += R.uniform(0.25, 1.4)
for k in range(int((9.6 - C1_OUT) / 0.22)):                # bills landing in the phone
    tk = C1_OUT + 0.1 + k * 0.22 + 1.4
    if tk < 9.9: f_place(flutter(0.12), tk - 0.3, 1.0, 0.2); f_place(clink(0.05, 3400), tk, 1.0, 0.2) if k % 2 == 0 else None
f_place(chaching(0.12), B1_MEET - 0.1)
# 2. buying
for k in range(5): f_place(step(0.18), 10.15 + k * 0.45, 1.0, -0.2 + 0.1 * k)
f_place(whoosh(0.6, 0.3), C2_OFFICE - 0.25)
for k in range(5): f_place(thud(0.22, 140), B2_DOWN + 0.1 + k * 0.08 + 0.3)
for k in range(20): f_place(paper(0.12), B2_LOAN + 0.1 + k * 0.035 + 0.3, 1.0, 0.25)
f_place(scribble(C2_KEYS - B2_LOAN - 1.45, 0.06), B2_LOAN + 1.4)
f_place(whoosh(0.5, 0.25), C2_KEYS - 0.2)
f_place(jingle(0.35), C2_KEYS + 0.85); f_place(chime((79, 84, 88), 1.0, 0.12), C2_KEYS + 0.9)
for k in range(6): f_place(flutter(0.08), B2_BACK + 0.6 + k * 0.3, 1.0, -0.4)
# 3. renting
for k in range(int((B3_RENTS + 1.2 - 20.1) / 0.42)): f_place(step(0.12), 20.15 + k * 0.42, 1.0, 0.4 - 0.05 * k)
f_place(jingle(0.3), B3_RENTS + 1.25)
for i in range(4): f_place(thud(0.18, 120), B3_PAY - 0.6 + i * 0.3)
f_place(chaching(0.15), B3_PAY + 0.6)
for k in range(10): f_place(flutter(0.07), B3_PAY + 0.9 + k * 0.18, 1.0, -0.2)
f_place(boom(0.18, 1.2), B3_NOT)
for k in range(4): f_place(thud(0.25, 180), B3_BILLS - 0.1 + k * 0.45 + 0.45, 1.0, (-0.3, 0.3)[k % 2]); f_place(paper(0.15), B3_BILLS - 0.1 + k * 0.45 + 0.4)
# 4. the monthly math
for tg in (B4_MORT + 0.35, B4_TAX + 0.6, B4_REP + 0.6, B4_LEFT + 0.4): f_place(whoosh(0.7, 0.3), tg)
f_place(chime((72,), 0.6, 0.12), B4_MORT + 0.9, 1.0, -0.5); f_place(chime((76,), 0.6, 0.12), B4_TAX + 1.15); f_place(chime((79,), 0.6, 0.12), B4_REP + 1.15, 1.0, 0.5)
for k in range(3): f_place(clink(0.12, 3000 + 300 * k), B4_LEFT + 0.95 + k * 0.09, 1.0, 0.4)
f_place(ding(88, 0.18), B4_LEFT + 1.0)
f_place(alarm(0.12), B4_WIPE + 0.05); f_place(boom(0.3, 1.2), B4_WIPE + 0.6); f_place(whoosh(0.6, 0.25), B4_WIPE + 0.6)
# 5. the years fly by
f_place(riser(Y1 - Y0, 0.12, 52), Y0)
for k in range(5): f_place(chime((84,), 0.5, 0.08), Y0 + (k + 1) * (Y1 - Y0) / 5 - 0.02, 1.0, (k % 2 - 0.5) * 0.6)   # each new year
f_place(chime((76, 83, 88), 1.2, 0.14), B5_EQ); f_place(ding(91, 0.14), B5_DEF)
# 6. the ending
for i in range(4): f_place(pop(0.12, 600 + 80 * i), B6_GUAR + i * 0.17)
f_place(whoosh(1.0, 0.3), B6_SECRET - 0.6)
f_place(chime((72, 76, 79, 84), 2.4, 0.18), B6_SECRET + 0.05)
fx += 0.10 * convolve_st(fx.mean(0), make_ir(1.0, 8, hf=1.2))
for b_ in range(1, 6): fx[:, ns(b_ * 10 - 0.02): ns(b_ * 10 + 0.01)] *= 0.3
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
