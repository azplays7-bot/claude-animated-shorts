# Narration for "The Tower That Leaned Before It Was Finished": Kokoro TTS, one steady voice, one clip per sentence,
# laid end to end with short pauses. Writes voice.wav (48 kHz mono) and words.json ([{word, start, end}]) with word
# times estimated from syllable shares inside each sentence, snapped to the quietest 20 ms nearby.
import json, os, re, sys
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
from kokoro_onnx import Kokoro
HERE = os.path.dirname(os.path.abspath(__file__))
VOICE, SPEED, SR = "am_michael", 1.34, 48000
LINES = [
 "The most famous tower in Italy started falling over before it was even finished.",
 "Pisa, eleven seventy-three. The city is rich, proud, and building a bell tower to show it.",
 "Five years in, the builders step back, and notice something. It's leaning.",
 "One side is standing on soft clay. It's like building a tower of blocks on a mattress.",
 "Then war breaks out, and the work stops. For almost a hundred years.",
 "Luckily, the long pause let the ground settle and get stronger.",
 "Unluckily, the tower was still crooked.",
 "So the next builders cheated. They made every new floor a little taller on the short side, to bend the tower back up.",
 "That's why it isn't straight today. It's slightly banana-shaped.",
 "In eighteen thirty-eight, an architect dug around the base to show off the steps. Water poured in. It leaned more.",
 "In nineteen thirty-four, Mussolini wanted it straight. Engineers pumped concrete into the foundation. It leaned more.",
 "Picture a stack of books on a soft bed. Press on the low side, and it only sinks deeper.",
 "By nineteen ninety, the tower was declared unsafe, and the doors were shut.",
 "So engineers did the opposite. Under the high side, they pulled out tiny scoops of soil, a little at a time, and the tower slowly leaned back.",
 "But they stopped long before it was straight.",
 "Because in Pisa, a tower that stands up straight is just a tower.",
]
LEAD, GAP, TAIL = 0.25, 0.3, 1.8
def syl(w):
    w = w.lower(); n = len(re.findall(r"[aeiouy]+", w)); return max(1, n - (1 if w.endswith("e") and n > 1 else 0))
k = Kokoro(sys.argv[1], sys.argv[2])
out, words, t = [], [], LEAD
for li, s in enumerate(LINES):
    a, sr = k.create(s, voice=VOICE, speed=SPEED, lang="en-us")
    a = resample_poly(a, SR, sr).astype(np.float32)
    nz = np.where(np.abs(a) > 0.01)[0]; a = a[max(0, nz[0] - 480): nz[-1] + 960]
    dur = len(a) / SR
    env = np.sqrt(np.convolve(a ** 2, np.ones(960) / 960, mode="same"))
    toks = s.split(); sy = [syl(x) for x in toks]; tot = sum(sy)
    cuts, acc = [0.0], 0
    for x in sy[:-1]:
        acc += x; g = dur * acc / tot
        i0, i1 = int(max(0, g - 0.12) * SR), int(min(dur, g + 0.12) * SR)
        cuts.append((i0 + int(np.argmin(env[i0:i1]))) / SR if i1 > i0 else g)
    cuts.append(dur)
    for w, c0, c1 in zip(toks, cuts[:-1], cuts[1:]):
        words.append({"word": re.sub(r"[^\w'-]", "", w), "start": round(t + c0, 3), "end": round(t + c1, 3), "line": li})
    out.append((t, a)); t += dur + GAP
total = t - GAP + TAIL
buf = np.zeros(int(total * SR), np.float32)
for t0, a in out: buf[int(t0 * SR): int(t0 * SR) + len(a)] += a
buf *= 0.9 / np.abs(buf).max()
sf.write(os.path.join(HERE, "voice.wav"), buf, SR, subtype="PCM_24")
json.dump(words, open(os.path.join(HERE, "words.json"), "w"), indent=0)
print(f"total {total:.2f} s, {len(words)} words")
for li in range(len(LINES)):
    ws = [w for w in words if w["line"] == li]; print(li, ws[0]["start"], ws[-1]["end"], " ".join(w["word"] for w in ws[:6]))
