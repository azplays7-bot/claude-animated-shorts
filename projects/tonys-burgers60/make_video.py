# "How is Ronaldo still scoring at 41?": joins the rendered chunks (1080x1920, 30 fps) with audio/mix.wav into
# out/tonys_burgers_cheap_to_make_60s.mp4 (+ .srt).   python3 make_video.py <chunk_dir>
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "out"); CH = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
sh = lambda *a: subprocess.run(a, check=True, capture_output=True, text=True).stdout
parts = sorted(f for f in os.listdir(CH) if f.endswith(".mp4"))
assert len(parts) == 30, f"expected 30 chunks, found {len(parts)}"
with open(os.path.join(OUT, "parts.txt"), "w") as fh:
    fh.writelines(f"file '{os.path.join(CH, p)}'\n" for p in parts)
silent = os.path.join(OUT, "silent.mp4")
sh("ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", os.path.join(OUT, "parts.txt"), "-c", "copy", silent)
final = os.path.join(OUT, "tonys_burgers_cheap_to_make_60s.mp4")
sh("ffmpeg", "-y", "-v", "error", "-i", silent, "-i", os.path.join(HERE, "audio", "mix.wav"), "-map", "0:v:0", "-map", "1:a:0",
   "-c:v", "libx264", "-crf", "20", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-t", "60", "-movflags", "+faststart", final)
T = json.load(open(os.path.join(HERE, "narration", "timing.json")))
T["chunks"] = [{"start": s["start"], "end": s["end"], "text": c["chunks"][0][1]} for s, c in zip(T["sentences"], json.load(open(os.path.join(HERE, "narration", "script.json"))))]
def ts(x):
    ms = max(0, int(round(x * 1000))); return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
with open(final.replace(".mp4", ".srt"), "w") as fh:
    for k, c in enumerate(T["chunks"], 1): fh.write(f"{k}\n{ts(c['start'])} --> {ts(c['end'])}\n{c['text']}\n\n")
print(final, sh("ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,nb_frames,duration", "-of", "csv=p=0", final).split())
