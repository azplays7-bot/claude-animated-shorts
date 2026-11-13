# Original score + sound effects for "What if you invested $20 a month in Bitcoin?", all synthesized here (no samples),
# timed to the animation (src/timeline.ts, src/Scenes.tsx), then mixed with narration/narration.wav:
#   music ducked under the voice, master at -14 LUFS integrated, true peak <= -1 dBTP, exactly 60.000 s.
# Writes audio/mix.wav plus stems. Uses the DSP helpers from templates/audio/dsp.py (copied next to this file).
#   python make_audio.py
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dsp import (SR, TAU, ns, tt, dbg, rng, lp, hp, bp, peq, fades, curve, pan, st, place, widen, make_ir, convolve_st,
                 integrated, true_peak, read_wav, write_wav)

DUR = 60.0
N = ns(DUR)
R = rng(2026)
BPM = 120.0
BEAT = 60 / BPM
nf = lambda m: 440.0 * 2 ** ((m - 69) / 12)            # MIDI note -> Hz

# ============================================================== timeline (mirrors src/timeline.ts SC)
SC = dict(bedroom=0, deposit=5.1, chart1=12.2, wallet=18.7, chart2=21.2, crash=27.2, rush=34.2, mystery=38.6, vault=41.3, reveal=47.6, finale=53.2)
DEP = [SC["deposit"] + 0.45 + 6.2 * (1 - (1 - i / 13) ** 1.6) * 0.98 for i in range(13)]   # deposit beats (Scenes.depBeat)

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

# ============================================================== music
mus = np.zeros((2, N))
def m_place(x, t, g=1.0, p=0.0):
    place(mus, pan(x, p) if np.ndim(x) == 1 else x, t, g)

# section 1 (0-12.2): mysterious D minor, clock pulse, bass enters at 5.1
for t0, ch in [(0, (50, 57, 62, 65)), (4, (46, 53, 62, 65)), (8, (48, 55, 60, 64)), (12.2, (50, 57, 62, 65))]:
    m_place(pad(ch, 4.4 if t0 < 12 else 6.6, 900 if t0 < 5 else 1400), t0, 0.5)
for k in range(int(12.2 / (BEAT / 2))):
    t = k * BEAT / 2
    m_place(tick(0.25 if k % 2 else 0.4), t, 1.0, 0.3 if k % 2 else -0.3)
for k in range(int((12.2 - 5.1) / BEAT)):
    t = 5.1 + k * BEAT
    m_place(bass([38, 38, 34, 36][(k // 2) % 4], BEAT * 0.9), t, 0.55)
    m_place(kick(0.55), t, 1.0) if k % 2 == 0 else None
# section 2 (12.2-18.7): build, 8th-note bass, more drums, riser into the wallet hit
for k in range(int((18.7 - 12.2) / (BEAT / 2))):
    t = 12.2 + k * BEAT / 2
    m_place(bass([38, 38, 41, 38, 34, 34, 36, 36][(k // 2) % 8], BEAT / 2 * 0.85, 520), t, 0.5)
    if k % 2 == 0: m_place(kick(0.7), t)
    m_place(hat(0.25), t, 1.0, 0.25)
    if k % 4 == 2: m_place(snare(0.35), t)
m_place(pad((50, 57, 62, 69), 6.5, 1800), 12.2, 0.35)
m_place(riser(2.2, 0.45), 16.5)
# wallet (18.7-21.2): shimmering chord across the clip cut
m_place(chime((62, 66, 69, 74), 2.6, 0.5), 18.72, 1.0)
m_place(pad((50, 57, 62, 66), 2.6, 2400, 0.05), 18.7, 0.45)
# section 3 (21.2-27.2): energetic, rising optimism (D major-ish)
prog = [(50, 57, 62, 66), (47, 54, 62, 66), (43, 55, 59, 62), (45, 52, 61, 64)]
for b in range(3):
    m_place(pad(prog[b % 4], 2.05, 2200, 0.05), 21.2 + b * 2, 0.4)
for k in range(int(6.0 / (BEAT / 2))):
    t = 21.2 + k * BEAT / 2
    m_place(bass([38, 38, 35, 35, 31, 31, 33, 33][(k // 3) % 8], BEAT / 2 * 0.8, 650), t, 0.5)
    if k % 2 == 0: m_place(kick(0.85), t)
    if k % 4 == 2: m_place(snare(0.5), t)
    m_place(hat(0.3, k % 4 == 3), t, 1.0, 0.3)
# section 4 (27.2-34.2): crash: dark drone, dissonant stabs, heartbeat kick
m_place(pad((38, 45, 51), 7.0, 500, 0.02), 27.2, 0.7)
for k in range(14):
    t = 27.2 + k * BEAT
    m_place(kick(0.6), t); m_place(kick(0.35), t + 0.18)
for t in (27.2, 30.4):
    m_place(pad((63, 64, 70), 0.6, 2500, 0.005), t, 0.45)
# section 5 (34.2-38.6): rush, fast build
for k in range(int(4.4 / (BEAT / 4))):
    t = 34.2 + k * BEAT / 4
    m_place(hat(0.22 + 0.2 * k / 35), t, 1.0, 0.3 * (-1) ** k)
    if k % 2 == 0: m_place(bass(38 + (k // 8) * 2, BEAT / 2 * 0.7, 900), t, 0.45)
    if k % 4 == 0: m_place(kick(0.8), t)
m_place(riser(4.3, 0.5, 50), 34.3)
# section 6 (38.6-47.6): mystery + vault: suspense pulse and long riser into the reveal
m_place(pad((50, 53, 57, 60), 2.8, 1000, 0.3), 38.6, 0.55)
m_place(pad((50, 53, 57, 64), 6.4, 1300, 0.6), 41.3, 0.5)
for k in range(int((47.6 - 41.3) / (BEAT / 2))):
    t = 41.3 + k * BEAT / 2
    m_place(bass(38, BEAT / 2 * 0.6, 400 + 60 * k), t, 0.45)
    if k % 2 == 0: m_place(kick(0.5 + 0.03 * k), t)
m_place(riser(3.0, 0.6, 52), 44.6)
# section 7 (47.6-57): triumphant reveal in D major
win = [(50, 57, 62, 66, 69), (47, 54, 62, 66, 71), (43, 55, 62, 67, 71), (45, 57, 61, 64, 69)]
for b in range(5):
    m_place(pad(win[b % 4], 2.05, 3000, 0.03), 47.6 + b * 2, 0.45)
m_place(chime((62, 66, 69, 74, 78), 3.0, 0.6), 47.6)
for k in range(int((57.0 - 47.6) / (BEAT / 2))):
    t = 47.6 + k * BEAT / 2
    m_place(bass([38, 38, 35, 35, 31, 31, 33, 33][(k // 4) % 8], BEAT / 2 * 0.8, 700), t, 0.5)
    if k % 2 == 0: m_place(kick(0.85), t)
    if k % 4 == 2: m_place(snare(0.5), t)
    m_place(hat(0.28, k % 4 == 3), t, 1.0, -0.3)
# outro (57-60): final chord swells and fades to silence by 59.95
m_place(pad((38, 50, 57, 62, 66, 69), 3.0, 2600, 0.4), 57.0, 0.6)
m_place(chime((62, 69, 74), 3.0, 0.45), 57.0)
music_rev = convolve_st(mus.mean(0), make_ir(2.2, 5, hf=1.4))
mus = mus + 0.25 * music_rev

# ============================================================== sound effects
fx = np.zeros((2, N))
def f_place(x, t, g=1.0, p=0.0):
    place(fx, pan(x, p) if np.ndim(x) == 1 else x, t, g)

for k in range(18):                                    # bedroom: keyboard typing
    f_place(tick(0.35), 0.4 + k * 0.13 + 0.03 * np.sin(k * 7), 1.0, -0.2)
f_place(chime((74, 81), 1.2, 0.5), 0.65)               # the B lights up on screen
f_place(whoosh(1.1, 0.7), 2.55)                        # fast zoom to the $20 bill
f_place(boom(0.35, 1.2), 3.7)
for at in (SC["deposit"], SC["chart1"], SC["chart2"], SC["rush"], SC["finale"]):
    f_place(whoosh(0.6, 0.8), at - 0.35)               # cut transitions
for i, b in enumerate(DEP):                            # deposits: calendar flip, bill swish, coin clink
    f_place(paper(0.5), b, 1.0, -0.4)
    f_place(whoosh(0.32, 0.35), b, 1.0, 0.2)
    f_place(clink(0.45, 2500 + 90 * (i % 4)), b + 0.32, 1.0, 0.35)
for k in range(int(6.5 * 2.2)):                        # chart: coin tossed to the line each month
    f_place(clink(0.28, 3000 + 120 * (k % 3)), SC["chart1"] + (k + 0.85) / 2.2, 1.0, 0.1)
f_place(boom(0.6), SC["wallet"]); f_place(chime((74, 78, 81, 86), 2.0, 0.35), SC["wallet"] + 0.05)
for i in range(5):                                     # newspapers flying past
    f_place(paper(0.6), SC["chart2"] + 0.5 + i * 1.05, 1.0, (-1) ** i * 0.4)
    f_place(whoosh(0.9, 0.35), SC["chart2"] + 0.8 + i * 1.05, 1.0)
for at in (SC["crash"], SC["crash"] + 3.2):            # crashes: boom, glitch down-sweep, alarm
    f_place(boom(0.95, 2.8), at)
    t = tt(0.9); f_place(0.3 * np.sin(TAU * np.cumsum(900 * np.exp(-t / 0.3) + 60) / SR) * np.exp(-t / 0.5), at + 0.05)
    for k in range(5):
        f_place(beep(1040 if k % 2 else 780, 0.18, 0.12), at + 0.3 + k * 0.32, 1.0, 0.5)
f_place(whoosh(0.4, 0.3), SC["crash"] + 4.2)           # the nervous $20 goes in anyway
f_place(chime((79, 84), 0.9, 0.45), SC["crash"] + 4.65)
for t0 in (0.15, 1.0, 1.85, 2.7):                      # year cards rushing past
    f_place(whoosh(0.7, 0.6), SC["rush"] + t0 + 0.4)
f_place(boom(0.45, 2.0), SC["mystery"])
f_place(whoosh(1.0, 0.7), SC["vault"] - 0.6); f_place(boom(0.7, 2.5), SC["vault"])
for k in range(30):                                    # counters rolling: 197 investments, $3,940
    f_place(tick(0.25), 41.7 + k * 0.05); f_place(tick(0.2), 43.0 + k * 0.053)
f_place(boom(1.0, 3.0), SC["reveal"])                  # THE reveal: boom, cha-ching, coin shower
f_place(chime((86, 90, 93), 1.5, 0.55), SC["reveal"] + 0.02)
for k in range(40):
    f_place(clink(0.18 + 0.1 * R.random(), 2200 + 1400 * R.random()), SC["reveal"] + 0.05 + 1.6 * R.random() ** 1.5, 1.0, R.uniform(-0.8, 0.8))
for k in range(26):                                    # coins piling up in the split screen
    f_place(clink(0.18, 2600 + 900 * R.random()), SC["finale"] + 0.3 + 1.7 * (k / 26) ** 0.8, 1.0, 0.5)
f_place(boom(0.4, 1.0), 54.6)
for k in range(5):                                     # closing card lines
    f_place(boom(0.22, 0.5), 57.0 + k * 0.22)
fx = fx + 0.18 * convolve_st(fx.mean(0), make_ir(1.4, 9, hf=1.2))

# ============================================================== mix
v, vsr = read_wav(os.path.join(HERE, "..", "narration", "narration.wav"))
assert vsr == SR
v = st(v)[:, :N]
v = np.pad(v, ((0, 0), (0, N - v.shape[1])))
lines = json.load(open(os.path.join(HERE, "..", "narration", "lines.json")))["lines"]
speech = np.zeros(N)
for L in lines:
    speech[ns(L["start"]): ns(L["end"])] = 1.0
duck = np.convolve(speech, np.ones(ns(0.15)) / ns(0.15), mode="same")          # smooth 150 ms
mus_d = mus * dbg(-7.0 * duck)[None, :]
fx_d = fx * dbg(-3.0 * duck)[None, :]
# levels relative to the voice: music about 13 LU under while speaking, sfx about 8 LU under
vI = integrated(v)
mus_d *= dbg(vI - 9.0 - integrated(mus))
fx_d *= dbg(vI - 7.0 - integrated(fx))
mix = v + mus_d + fx_d
# master: gain toward -14 LUFS through a look-ahead peak limiter (ceiling -1.3 dBFS sample peak, 5 ms look-ahead)
from scipy.ndimage import minimum_filter1d, uniform_filter1d
def limit(x, ceil_db=-1.3, look=0.005):
    w = ns(look)
    g = np.minimum(1.0, dbg(ceil_db) / np.maximum(np.abs(x).max(0), 1e-9))
    g = minimum_filter1d(g, 2 * w + 1)                 # every peak's gain is reached w samples early
    g = uniform_filter1d(g, w + 1)                     # smooth attack/release (stays <= the needed gain)
    g = minimum_filter1d(g, w + 1)
    return x * g[None, :]
pre = mix.copy()
G = -14.0 - integrated(pre)
for it in range(10):
    mix = limit(pre * dbg(G))
    L = integrated(mix)
    if abs(L + 14.0) < 0.05: break
    G += -14.0 - L
mix *= np.minimum(1.0, dbg(-1.0 - true_peak(mix)))
end = ns(59.15)
mix[:, end:] *= np.linspace(1, 0, N - end) ** 2                                   # matches the fade to black
mix = fades(mix, 0.005, 0.02)
write_wav(os.path.join(HERE, "mix.wav"), mix)
write_wav(os.path.join(HERE, "stem_music.wav"), mus_d); write_wav(os.path.join(HERE, "stem_sfx.wav"), fx_d)
print(f"mix: {mix.shape[1] / SR:.3f} s, {integrated(mix):.2f} LUFS, true peak {true_peak(mix):.2f} dBTP")
