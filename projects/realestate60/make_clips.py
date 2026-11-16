# "How real estate can build wealth": joins the rendered chunks (1080x1920) with the final mix and cuts six exact 10 s clips (frames 0-299, 300-599, ...),
# each with its own slice of audio (10 ms edge fades). Writes out/real_estate_clip1..6.mp4, out/real_estate_60s.mp4 and the SRTs.
import json, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "out")
sh = lambda *a: subprocess.run(a, check=True, capture_output=True, text=True).stdout
parts = sorted(f for f in os.listdir(os.path.join(OUT, "chunks")) if f.endswith(".mp4"))
assert len(parts) == 30, f"expected 30 chunks, found {len(parts)}"
with open(os.path.join(OUT, "parts.txt"), "w") as fh:
    fh.writelines(f"file '{os.path.join(OUT, 'chunks', p)}'\n" for p in parts)
silent = os.path.join(OUT, "silent.mp4"); mix = os.path.join(HERE, "audio", "mix.wav")
sh("ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", os.path.join(OUT, "parts.txt"), "-c", "copy", silent)
sh("ffmpeg", "-y", "-v", "error", "-i", silent, "-i", mix, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
   "-t", "60", "-movflags", "+faststart", os.path.join(OUT, "real_estate_60s.mp4"))
T = json.load(open(os.path.join(HERE, "narration", "timing.json")))
def ts(x):
    ms = max(0, int(round(x * 1000))); return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
def srt(t0, t1, path):
    with open(path, "w") as fh:
        k = 0
        for c in T["chunks"]:
            if t0 <= c["start"] < t1:
                k += 1; fh.write(f"{k}\n{ts(c['start'] - t0)} --> {ts(min(c['end'], t1) - t0)}\n{c['text']}\n\n")
srt(0, 60, os.path.join(OUT, "real_estate_60s.srt"))
for k in range(6):
    out = os.path.join(OUT, f"real_estate_clip{k + 1}.mp4")
    sh("ffmpeg", "-y", "-v", "error", "-i", silent, "-ss", str(10 * k), "-t", "10", "-i", mix,
       "-vf", f"trim=start_frame={300 * k}:end_frame={300 * (k + 1)},setpts=PTS-STARTPTS",
       "-af", "afade=t=in:d=0.01,afade=t=out:st=9.99:d=0.01", "-map", "0:v:0", "-map", "1:a:0",
       "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", out)
    srt(10 * k, 10 * k + 10, os.path.join(OUT, f"real_estate_clip{k + 1}.srt"))
    print(out, sh("ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,nb_frames,duration", "-of", "csv=p=0", out).split())
