# AI narration for "What if you invested $20 a month in Bitcoin?" (Kokoro TTS, offline, Apache-2.0 model).
# Each line has a window on the 60 s timeline (from the shot list); the speaking speed is raised just enough for the
# line to fit, never slower than BASE_SPEED. Writes narration.wav (48 kHz mono, exactly 60.000 s) and lines.json
# (start/end of every line, read by the animation and the mix).
#   python make_narration.py <kokoro-v1.0.onnx> <voices-v1.0.bin>
import json, os, sys
import numpy as np
from scipy.signal import resample_poly
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = "am_michael"        # American male
BASE_SPEED = 1.08           # energetic but clear
SR_OUT, DUR = 48000, 60.0

# (start s, latest end s, text). Numbers are spelled out so the voice reads them naturally.
LINES = [
    (0.25, 4.85, "What if you invested just twenty dollars every month into Bitcoin, starting in twenty ten?"),
    (5.15, 11.75, "No big investments. No secret strategy. Just twenty dollars, month after month."),
    (12.15, 19.6, "Back then, Bitcoin was worth pennies. Almost nobody imagined what would happen next."),
    (20.25, 26.75, "As Bitcoin gained attention, prices exploded. But the journey was far from easy."),
    (27.15, 33.75, "There were brutal crashes, market panic, and years when investors lost confidence."),
    (34.15, 39.65, "Yet our imaginary investor never stopped. Every single month, another twenty dollars."),
    (40.25, 45.85, "Fast-forward to November twenty twenty-six. After more than sixteen years of investing..."),
    (46.15, 52.85, "that three thousand, nine hundred forty dollars could have grown to somewhere between ninety-two and one hundred sixteen million dollars!"),
    (53.15, 59.6, "That's the power of starting early. But remember, Bitcoin's incredible past returns were never guaranteed."),
]


def main(model, voices):
    k = Kokoro(model, voices)
    out = np.zeros(int(SR_OUT * DUR), np.float32)
    meta = []
    for i, (t0, t1, text) in enumerate(LINES):
        speed = BASE_SPEED
        for _ in range(12):
            a, sr = k.create(text, voice=VOICE, speed=speed, lang="en-us")
            dur = len(a) / sr
            if dur <= (t1 - t0) or speed >= 1.6:
                break
            speed = min(1.6, speed * (dur / (t1 - t0)) * 1.01)
        a = resample_poly(a, SR_OUT, sr).astype(np.float32)
        n0 = int(t0 * SR_OUT)
        n = min(len(a), len(out) - n0)
        out[n0:n0 + n] += a[:n]
        meta.append({"i": i, "start": t0, "end": round(t0 + n / SR_OUT, 3), "window_end": t1, "speed": round(speed, 3), "text": text})
        print(f"line {i + 1}: {n / SR_OUT:5.2f} s of {t1 - t0:4.2f} s window, speed {speed:.2f}")
    peak = np.abs(out).max()
    out *= 0.89 / max(peak, 1e-9)             # level only; final loudness is set in the mix
    sf.write(os.path.join(HERE, "narration.wav"), out, SR_OUT, subtype="PCM_24")
    json.dump({"voice": VOICE, "lines": meta}, open(os.path.join(HERE, "lines.json"), "w"), indent=1)


if __name__ == "__main__":
    main(*sys.argv[1:3])
