# AI narration + synced captions for "Why theaters lose money on the movie" (Kokoro TTS, voice am_puck).
# Each sentence is spoken in one go (natural intonation) and placed on a 60 s timeline: short pauses between sentences,
# longer ones at scene changes. Subtitle chunks inside a sentence are timed by their share of the spoken syllables,
# then snapped to the quietest point nearby (the real pause in the audio).
# Writes narration.wav (48 kHz, exactly 60.000 s), timing.json (scenes, sentences, subtitle chunks) and captions.srt.
#   python make_narration.py <kokoro-v1.0.onnx> <voices-v1.0.bin>
import json, os, re, sys
import numpy as np
from scipy.signal import resample_poly
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE, SPEED = "am_puck", 1.05
SR, DUR = 48000, 60.0
LEAD, GAP, SCENE_GAP = 0.35, 0.35, 0.9
TARGET = {}   # one continuous 60 s video
SCENE_SPEED = {}

def syllables(text):
    n = 0
    for w in re.findall(r"[a-zA-Z']+", text.lower()):
        n += max(1, len(re.findall(r"[aeiouy]+", w)) - (1 if w.endswith("e") and len(w) > 3 else 0))
    return n

def main(model, voices):
    k = Kokoro(model, voices)
    script = json.load(open(os.path.join(HERE, "script.json")))
    clips = []
    for s in script:
        text = " ".join(c[0] for c in s["chunks"])
        a, sr = k.create(text, voice=VOICE, speed=SPEED * SCENE_SPEED.get(s["scene"], 1.0), lang="en-us")
        clips.append(resample_poly(a, SR, sr).astype(np.float32))
    out = np.zeros(int(SR * DUR), np.float32)
    t, prev_scene, sentences, chunks, scenes = LEAD, None, [], [], {}
    for s, a in zip(script, clips):
        if prev_scene is not None:
            t += (SCENE_GAP if s["scene"] != prev_scene else GAP) + s.get("pause", 0)
            if s["scene"] != prev_scene and s["scene"] in TARGET:
                t = max(t, TARGET[s["scene"]])
        n0 = int(t * SR)
        out[n0:n0 + len(a)] += a[: len(out) - n0]
        dur = len(a) / SR
        sentences.append({"scene": s["scene"], "start": round(t, 3), "end": round(t + dur, 3)})
        scenes.setdefault(s["scene"], [t, t + dur])[1] = t + dur
        # chunk boundaries: syllable share, snapped to the quietest 20 ms window within +-0.25 s
        syl = [syllables(c[0]) for c in s["chunks"]]
        env = np.sqrt(np.convolve(a ** 2, np.ones(960) / 960, mode="same"))
        cut, acc = [0.0], 0
        for x in syl[:-1]:
            acc += x
            guess = dur * acc / sum(syl)
            i0, i1 = int(max(0, guess - 0.25) * SR), int(min(dur, guess + 0.25) * SR)
            cut.append((i0 + int(np.argmin(env[i0:i1]))) / SR if i1 > i0 else guess)
        cut.append(dur)
        for c, a0, a1 in zip(s["chunks"], cut[:-1], cut[1:]):
            chunks.append({"scene": s["scene"], "start": round(t + a0, 3), "end": round(t + a1, 3), "text": c[1]})
        t += dur
        prev_scene = s["scene"]
    assert t < DUR - 0.6, f"narration too long: ends at {t:.2f} s"
    print(f"speech ends at {t:.2f} s ({DUR - t:.2f} s for the closing card)")
    out *= 0.89 / np.abs(out).max()
    sf.write(os.path.join(HERE, "narration.wav"), out, SR, subtype="PCM_24")
    json.dump({"voice": VOICE, "speed": SPEED, "scenes": {str(k_): [round(v[0], 3), round(v[1], 3)] for k_, v in scenes.items()},
               "sentences": sentences, "chunks": chunks}, open(os.path.join(HERE, "timing.json"), "w"), indent=1)
    def ts(x):
        ms = int(round(x * 1000)); return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
    with open(os.path.join(HERE, "captions.srt"), "w") as fh:
        for i, c in enumerate(chunks, 1):
            fh.write(f"{i}\n{ts(c['start'])} --> {ts(c['end'])}\n{c['text']}\n\n")
    for k_, v in scenes.items():
        print(f"scene {k_}: speech {v[0]:5.2f} - {v[1]:5.2f} s")

if __name__ == "__main__":
    main(*sys.argv[1:3])
