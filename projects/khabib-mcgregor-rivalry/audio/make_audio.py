# Original score + sound effects for the "Khabib vs McGregor" series, synthesized here and timed to each part's
# narration words (partN/narration/words.json): a tense minor trap beat, crowd beds, camera shutters, phone pings, a slap,
# shattering glass, sirens, the fight bell and a gavel. -14 LUFS integrated, true peak <= -1 dBTP, exactly 60.000 s.
#   python make_audio.py <part 1|2|3>      -> ../partN/audio/mix.wav
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import (SR, TAU, ns, tt, dbg, rng, lp, hp, bp, fades, pan, st, place, widen, make_ir, convolve_st,
                 integrated, true_peak, read_wav, write_wav)
from scipy.ndimage import minimum_filter1d, uniform_filter1d

PART = int(sys.argv[1])
PD = os.path.join(HERE, "..", f"part{PART}")
DUR = 60.0
N = ns(DUR)
R = rng(2000 + PART)
nf = lambda m: 440.0 * 2 ** ((m - 69) / 12)
TM = json.load(open(os.path.join(PD, "narration", "timing.json")))
SENT = TM["sentences"]
SC = {int(k): v for k, v in TM["scenes"].items()}
WD = json.load(open(os.path.join(PD, "narration", "words.json")))
def W(text, n=0):
    hits = [w for w in WD if "".join(ch for ch in w["text"] if ch.isalnum()) == text]
    return hits[n]["start"]

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


def thud(gain=1.0):
    t = tt(0.25); return gain * (np.sin(TAU * np.cumsum(70 + 60 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.07) + 0.3 * lp(R.standard_normal(len(t)), 600) * np.exp(-t / 0.03))
def softpad(notes, dur, bright=1800, att=0.3):
    x = sum(saw(nf(m), dur, d) for m in notes for d in (-0.004, 0.0, 0.004)) / (3 * len(notes))
    return lp(x, bright, 2) * env(len(x), att, 99, 1.0) * fades(np.ones(len(x)), 0.01, min(1.0, dur / 3))
def piano(m, dur=0.6, gain=1.0):
    t = tt(dur); f = nf(m)
    x = sum(a * np.sin(TAU * f * k * (1 + 0.0004 * k * k) * t) * np.exp(-t / (d)) for k, a, d in ((1, 1, 0.5), (2, 0.45, 0.3), (3, 0.25, 0.2), (4, 0.12, 0.12)))
    return gain * x * (1 - np.exp(-t / 0.002))
def gavel(gain=1.0):
    t = tt(0.4); return gain * (np.sin(TAU * np.cumsum(300 + 250 * np.exp(-t / 0.01)) / SR) * np.exp(-t / 0.06) + 0.6 * bp(R.standard_normal(len(t)), 800, 5000) * np.exp(-t / 0.015))

# ============================================================== music: a tense minor beat (92 BPM), drops out for hits
mus = np.zeros((2, N))
def m_place(x, t, g=1.0, p=0.0):
    place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def sub808(m, dur, gain=1.0):
    t = tt(dur); f = nf(m) * (1 + 0.6 * np.exp(-t / 0.03))
    return gain * np.tanh(1.6 * np.sin(TAU * np.cumsum(f) / SR)) * env(len(t), 0.004, dur * 0.8, 0.5) * fades(np.ones(len(t)), 0.002, 0.05)
def stab(notes, dur, gain=1.0, bright=2600):
    x = sum(saw(nf(m), dur, d) for m in notes for d in (-0.005, 0.0, 0.006)) / (3 * len(notes))
    return gain * lp(x, bright, 2) * env(len(x), 0.005, 0.25, 0.25) * fades(np.ones(len(x)), 0.003, 0.06)
BPM = 92.0; B = 60 / BPM
PROG = [(45, (57, 60, 64)), (41, (57, 60, 65)), (43, (55, 59, 62)), (40, (56, 59, 64))]   # Am F G E
def beat(t0, t1, g=0.05, drums=True, intensity=1.0):
    k = 0; tb = t0
    while tb < t1 - 0.05:
        r_, ch = PROG[(k // 4) % 4]
        if k % 4 == 0:
            m_place(softpad(ch, min(4 * B, t1 - tb), 1500, 0.2), tb, g * 0.55)
            m_place(sub808(r_ - 12, min(1.6 * B, t1 - tb), 1.0), tb, g * 1.1)
        if k % 4 == 2: m_place(sub808(r_ - 12, 0.9 * B, 0.8), tb + 0.5 * B, g * 0.9)
        if drums:
            if k % 2 == 0: m_place(kick(1.0), tb, g * 1.3)
            if k % 4 == 1 or k % 4 == 3: m_place(snare(1.0), tb, g * 0.9 * intensity)
            for h in range(2 if intensity < 1.2 else 4):
                hh = tb + h * B / (2 if intensity < 1.2 else 4)
                if hh < t1: m_place(hat(0.6 + 0.3 * (h % 2)), hh, g * 0.5, 0.3)
        if k % 8 == 7: m_place(stab(ch, 0.4, 0.8), tb + 0.5 * B, g * 0.6, -0.2)
        tb += B; k += 1

# ============================================================== sound effects
fx = np.zeros((2, N))
def f_place(x, t, g=1.0, p=0.0):
    place(fx, pan(x, p) if np.ndim(x) == 1 else x, t, g)
def roar(dur, gain=1.0):      # arena crowd: many band-limited voices + a cheer swell
    n = ns(dur); x = sum(bp(R.standard_normal(n), f, f * 5) for f in (180, 260, 380, 520)) / 4
    t = np.arange(n) / SR
    return gain * widen(x * (0.7 + 0.3 * np.sin(TAU * 0.4 * t)) * fades(np.ones(n), 0.4, 0.6), R, 13, 0.9)
def shutter(gain=1.0):
    t = tt(0.08); x = hp(R.standard_normal(len(t)), 2500) * (np.exp(-t / 0.006) + 0.7 * np.exp(-np.maximum(t - 0.04, 0) / 0.006) * (t > 0.04))
    return gain * x
def ping(gain=1.0):
    return chime((88, 93), 0.6, gain)
def slap(gain=1.0):
    t = tt(0.18); return gain * (hp(R.standard_normal(len(t)), 1200) * np.exp(-t / 0.012) * 2 + 0.4 * np.sin(TAU * 220 * t) * np.exp(-t / 0.03))
def shatter(gain=1.0):
    out = np.zeros(ns(1.6)); hit = hp(R.standard_normal(ns(0.2)), 1500) * np.exp(-tt(0.2) / 0.03); out[:len(hit)] += 1.5 * hit
    for k in range(40):
        c = clink(R.uniform(0.2, 0.6), R.uniform(2500, 6000)); o = ns(R.uniform(0.02, 1.0)); out[o:o + len(c)] += c[:len(out) - o]
    return gain * out
def clang(gain=1.0):
    return gain * clink(1.0, 420) * 1.2
def siren(dur, gain=1.0):
    t = tt(dur); f = 900 + 350 * np.sin(TAU * 0.6 * t); return gain * np.sin(TAU * np.cumsum(f) / SR) * fades(np.ones(len(t)), 0.5, 0.8)
def fightbell(gain=1.0):
    return bell(gain) * 1.0
def thump(gain=1.0):
    return thud(gain)
def engine(dur, gain=1.0):
    t = tt(dur); return gain * lp(np.sign(np.sin(TAU * 38 * t)) * 0.4 + 0.3 * R.standard_normal(len(t)), 300) * fades(np.ones(len(t)), 0.3, 0.5)

if PART == 1:
    m_place(riser(1.2, 0.8), 0.0, 0.05); beat(0.0, SC[1][1] + 0.4, 0.05)
    m_place(softpad((57, 64, 69, 72), SC[2][1] - SC[2][0] + 0.5, 2400, 0.4), SC[2][0] - 0.3, 0.05)
    beat(SC[3][0] - 0.2, SC[4][0], 0.05); beat(SC[4][0], SC[5][0], 0.055, intensity=1.4); beat(SC[5][0], SC[6][0], 0.05)
    beat(SC[6][0], 60.0, 0.045, drums=True); m_place(boom(0.9), W("EXPLODED") + 0.3, 0.07)
    f_place(roar(SC[1][1] + 0.5, 0.05), 0.0); f_place(boom(0.6), 0.05, 0.05)
    f_place(ping(0.07), W("FRIENDLY")); f_place(ping(0.06), W("MESSAGES") + 0.3); f_place(ping(0.06), W("ONLINE") + 0.4)
    f_place(roar(2.0, 0.04), W("SUPERSTAR") - 0.3)
    for k in range(10): f_place(shutter(0.05), SC[4][0] + 0.2 + k * 0.42 + R.uniform(0, 0.15), R.uniform(-0.6, 0.6))
    f_place(roar(SC[4][1] - SC[4][0] + 0.5, 0.035), SC[4][0])
    f_place(roar(SC[5][1] - SC[5][0] + 0.5, 0.06), SC[5][0]); f_place(fightbell(0.06), W("BELT"))
    f_place(paper(0.04), SC[6][0] + 0.3)
elif PART == 2:
    m_place(riser(1.2, 0.8), 0.0, 0.04); beat(0.0, SC[2][0], 0.045)
    beat(SC[2][0], SC[3][0], 0.05, intensity=1.4); f_place(slap(0.12), W("SLAPPED"))
    beat(SC[3][0], SC[4][0], 0.05); f_place(engine(4.0, 0.03), SC[3][0] + 0.5)
    beat(SC[4][0], W("THREW"), 0.055, intensity=1.4); f_place(engine(SC[4][1] - SC[4][0], 0.03), SC[4][0])
    f_place(riser(1.0, 0.6), W("DOLLY") - 0.3, 0.05); f_place(shatter(0.12), W("WINDOW") + 0.15); f_place(clang(0.07), W("WINDOW") + 0.2)
    m_place(boom(1.0), W("WINDOW") + 0.15, 0.07); beat(SC[5][0], SC[6][0], 0.045, drums=False)
    f_place(siren(SC[6][1] - SC[6][0] + 0.5, 0.025), SC[6][0]); beat(SC[6][0], SC[7][0], 0.045)
    f_place(gavel(0.08), W("GUILTY"))
    beat(SC[7][0], 60.0, 0.05, intensity=1.4); f_place(roar(4.0, 0.06), SC[7][0]); f_place(fightbell(0.06), W("ANYWAY"))
elif PART == 3:
    m_place(riser(1.2, 0.8), 0.0, 0.05); beat(0.0, SC[3][0], 0.05)
    f_place(roar(SC[1][1] + 0.6, 0.05), 0.0)
    for k in range(8): f_place(shutter(0.045), SC[2][0] + 0.3 + k * 0.6 + R.uniform(0, 0.2), R.uniform(-0.6, 0.6))
    f_place(fightbell(0.07), SC[3][0] + 0.1); beat(SC[3][0], SC[4][0], 0.055, intensity=1.4)
    f_place(roar(SC[3][1] - SC[3][0] + 0.5, 0.06), SC[3][0]); f_place(thump(0.08), W("DOWN")); f_place(thump(0.08), W("AGAIN", 1))
    f_place(thump(0.06), W("TAPPED")); f_place(thump(0.06), W("TAPPED") + 0.25); f_place(fightbell(0.07), W("TAPPED") + 0.5)
    beat(SC[4][0], SC[5][0], 0.055, intensity=1.4); f_place(roar(SC[4][1] - SC[4][0] + 0.5, 0.08), SC[4][0])
    beat(SC[5][0], SC[6][0], 0.045, drums=False); f_place(gavel(0.07), W("FINED"))
    m_place(softpad((57, 64, 69, 72, 76), 60 - SC[6][0], 2200, 0.8), SC[6][0], 0.05)
    for k, m in enumerate((69, 72, 76, 81)): m_place(piano(m, 1.4, 0.8), W("GLOVES") + k * 0.3, 0.035)
    f_place(thump(0.05), W("GLOVES") + 0.2); f_place(roar(3.0, 0.03), W("GLOVES"))
    beat(SC[7][0], 60.0, 0.05)
cuts = [SC[k][0] for k in sorted(SC) if k > 1]
for c in cuts: f_place(whoosh(0.32, 0.06), c - 0.35)

mus += 0.15 * convolve_st(mus.mean(0), make_ir(1.4, 4, hf=1.1))
mus[:, ns(59.3):] *= np.linspace(1, 0.0, N - ns(59.3)) ** 1.5
fx += 0.10 * convolve_st(fx.mean(0), make_ir(0.9, 8, hf=1.1))
fx[:, ns(59.3):] *= np.linspace(1, 0.0, N - ns(59.3)) ** 1.5
# ============================================================== mix
v, vsr = read_wav(os.path.join(PD, "narration", "narration.wav"))
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
write_wav(os.path.join(PD, "audio", "mix.wav"), mix)
print(f"mix: {mix.shape[1] / SR:.3f} s, {integrated(mix):.2f} LUFS, true peak {true_peak(mix):.2f} dBTP")
for i, s_ in enumerate(SENT):
    a, b = ns(s_["start"]), ns(s_["end"])
    m = integrated(np.stack([v[0, a:b]] * 2)) - integrated(mus_d[:, a:b] + fx_d[:, a:b])
    if m < 7: print(f"  sentence {i + 1}: voice only {m:.1f} LU over the bed")
