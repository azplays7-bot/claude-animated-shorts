# Joins the rendered chunks into the 60 s picture and cuts the three parts for editing at the scene boundaries
# (scenes 1-2, 3-4, 5-6; same rule as PARTS in src/timeline.ts). For each part writes:
#   out/part<N>.mp4   picture + final mix (subtitles burned in, as rendered)
#   out/part<N>.srt   that part's subtitles, re-timed to start at 0
# plus out/full_60s.mp4 and out/full_60s.srt.
import json, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
FPS = 30
sh = lambda *a: subprocess.run(a, check=True, capture_output=True, text=True).stdout

T = json.load(open(os.path.join(HERE, "narration", "timing.json")))
SP = {int(k): v for k, v in T["scenes"].items()}
snap = lambda x: round(x * FPS)
b1, b2 = snap((SP[2][1] + SP[3][0]) / 2), snap((SP[4][1] + SP[5][0]) / 2)
PARTS = [(0, b1), (b1, b2), (b2, 60 * FPS)]

parts = sorted(f for f in os.listdir(os.path.join(OUT, "chunks")) if f.endswith(".mp4"))
assert len(parts) == 30, f"expected 30 chunks, found {len(parts)}"
with open(os.path.join(OUT, "parts.txt"), "w") as fh:
    fh.writelines(f"file '{os.path.join(OUT, 'chunks', p)}'\n" for p in parts)
silent = os.path.join(OUT, "silent.mp4")
sh("ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", os.path.join(OUT, "parts.txt"), "-c", "copy", silent)
mix = os.path.join(HERE, "audio", "mix.wav")
sh("ffmpeg", "-y", "-v", "error", "-i", silent, "-i", mix, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
   "-movflags", "+faststart", os.path.join(OUT, "full_60s.mp4"))

def ts(x):
    ms = max(0, int(round(x * 1000))); return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
def srt(chunks, t0, t1, path):
    with open(path, "w") as fh:
        k = 0
        for c in chunks:
            if c["start"] >= t0 and c["start"] < t1:
                k += 1; fh.write(f"{k}\n{ts(c['start'] - t0)} --> {ts(min(c['end'], t1) - t0)}\n{c['text']}\n\n")
srt(T["chunks"], 0, 60, os.path.join(OUT, "full_60s.srt"))
for k, (f0, f1) in enumerate(PARTS, 1):
    t0, d = f0 / FPS, (f1 - f0) / FPS
    out = os.path.join(OUT, f"part{k}.mp4")
    sh("ffmpeg", "-y", "-v", "error", "-i", silent, "-ss", f"{t0:.4f}", "-t", f"{d:.4f}", "-i", mix,
       "-vf", f"trim=start_frame={f0}:end_frame={f1},setpts=PTS-STARTPTS",
       "-af", f"afade=t=in:d=0.01,afade=t=out:st={d - 0.01:.4f}:d=0.01",
       "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p", "-r", "30",
       "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", out)
    srt(T["chunks"], t0, t0 + d, os.path.join(OUT, f"part{k}.srt"))
    print(f"part{k}: frames {f0}-{f1 - 1} ({t0:.2f}-{t0 + d:.2f} s, {d:.2f} s)",
          sh("ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,nb_frames,duration", "-of", "csv=p=0", out).split())
