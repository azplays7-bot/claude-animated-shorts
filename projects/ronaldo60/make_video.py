# Joins the rendered chunks (1080x1920, 30 fps) with audio/mix.wav into out/boy_nobody_believed_in_60s.mp4 + .srt
import json, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "out"); NAME = "boy_nobody_believed_in_60s"
sh = lambda *a: subprocess.run(a, check=True, capture_output=True, text=True).stdout
parts = sorted(f for f in os.listdir(os.path.join(OUT, "chunks")) if f.endswith(".mp4"))
assert len(parts) == 30, f"expected 30 chunks, found {len(parts)}"
with open(os.path.join(OUT, "parts.txt"), "w") as fh:
    fh.writelines(f"file '{os.path.join(OUT, 'chunks', p)}'\n" for p in parts)
silent = os.path.join(OUT, "silent.mp4"); mix = os.path.join(HERE, "audio", "mix.wav"); out = os.path.join(OUT, NAME + ".mp4")
sh("ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", os.path.join(OUT, "parts.txt"), "-c", "copy", silent)
sh("ffmpeg", "-y", "-v", "error", "-i", silent, "-i", mix, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
   "-t", "60", "-movflags", "+faststart", out)
T = json.load(open(os.path.join(HERE, "narration", "timing.json")))
def ts(x):
    ms = max(0, int(round(x * 1000))); return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
with open(os.path.join(OUT, NAME + ".srt"), "w") as fh:
    for k, c in enumerate(T["chunks"], 1):
        fh.write(f"{k}\n{ts(c['start'])} --> {ts(c['end'])}\n{c['text']}\n\n")
print(out, sh("ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,nb_frames,duration", "-of", "csv=p=0", out).split())
