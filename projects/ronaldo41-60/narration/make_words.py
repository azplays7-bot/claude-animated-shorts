# Word-by-word caption timing: transcribes narration.wav with faster-whisper (word timestamps) and maps every script
# word onto the recognised words (difflib alignment), so the captions show the script's spelling at the spoken time.
# Writes words.json: [{start, end, text, emph}]; emph = keyword shown in yellow.   python3 make_words.py
import difflib, json, os, re
import soundfile as sf
from scipy.signal import resample_poly
from faster_whisper import WhisperModel
HERE = os.path.dirname(os.path.abspath(__file__))
EMPH = {"RONALDO", "SLEEP", "NAPS", "PROTEIN", "SUGAR", "WATER", "DRINK", "TRAINING", "SPRINTS", "WEIGHTS", "EXTRA", "FIRST", "LAST", "HEADER", "ICE", "BRRR", "REPEAT", "RESULT", "HISTORY", "HABITS", "TALENT", "WORKOUT", "SODA"}
a, sr = sf.read(os.path.join(HERE, "narration.wav"), dtype="float32")
a16 = resample_poly(a, 1, 3).astype("float32")
segs, _ = WhisperModel("small.en", device="cpu", compute_type="int8").transcribe(a16, word_timestamps=True, language="en")
rec = [(w.start, w.end, w.word.strip()) for s in segs for w in s.words]
norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
script = " ".join(x["chunks"][0][0] for x in json.load(open(os.path.join(HERE, "script.json")))).split()
sm = difflib.SequenceMatcher(None, [norm(w) for w in script], [norm(w[2]) for w in rec], autojunk=False)
times = [None] * len(script)
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag in ("equal", "replace"):
        for k in range(i2 - i1):
            j = j1 + min(k * max(1, j2 - j1) // max(1, i2 - i1), j2 - j1 - 1) if j2 > j1 else None
            if j is not None: times[i1 + k] = rec[j][:2]
# fill gaps by interpolation between known neighbours
for i, t in enumerate(times):
    if t is None:
        p = next((times[k] for k in range(i - 1, -1, -1) if times[k]), (0, 0)); n = next((times[k] for k in range(i + 1, len(times)) if times[k]), (p[1] + 0.3, p[1] + 0.6))
        times[i] = (p[1], max(p[1] + 0.1, n[0]))
out = []
for w, (s0, e0) in zip(script, times):
    txt = w.upper().strip(",.:?!")
    out.append({"start": round(s0, 3), "end": round(e0, 3), "text": txt, "emph": re.sub(r"[^A-Z]", "", txt) in EMPH})
# show numbers as numbers: "FOUR DOLLAR" -> "90 SECONDS"
MERGE = [(["THIRTY-FIVE"], "35"), (["FORTY-ONE"], "41"), (["FORTY-ONE?"], "41"), (["ONE", "THOUSAND", "GOALS"], "1,000 GOALS"), (["NINE", "HUNDRED", "AND", "SEVENTY", "GOALS"], "970+ GOALS"), (["TWO", "AND", "A", "HALF", "METERS"], "2.5 METERS"), (["FORTY-ONE", "YEAR"], "41-YEAR"), (["SIX", "WORLD", "CUPS"], "6 WORLD CUPS")]
i = 0
while i < len(out):
    for pat, rep in MERGE:
        if [w["text"] for w in out[i:i + len(pat)]] == pat:
            out[i:i + len(pat)] = [{"start": out[i]["start"], "end": out[i + len(pat) - 1]["end"], "text": rep, "emph": True}]
            break
    i += 1
# every caption word gets at least 0.12 s on screen (whisper sometimes squeezes a word to a frame or two)
for a, b in zip(out, out[1:]):
    if b["start"] - a["start"] < 0.12: b["start"] = round(min(a["start"] + 0.12, b["end"] - 0.04), 3)
json.dump(out, open(os.path.join(HERE, "words.json"), "w"), indent=0)
miss = sum(1 for tag, i1, i2, *_ in sm.get_opcodes() if tag in ("delete", "insert"))
print(len(out), "words; unmatched spans", miss); print(" ".join(f"{w['start']:.1f}:{w['text']}" for w in out))
