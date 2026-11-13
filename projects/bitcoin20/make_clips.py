# Joins the rendered chunks into the 60 s picture, then cuts three 20 s clips (frames 0-599, 600-1199, 1200-1799)
# and gives each its slice of audio/mix.wav (with 10 ms edge fades so the cuts don't click). Writes out/clip1..3.mp4
# and out/full_60s.mp4.
import os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
sh = lambda *a: subprocess.run(a, check=True, capture_output=True, text=True).stdout

parts = sorted(f for f in os.listdir(os.path.join(OUT, "chunks")) if f.endswith(".mp4"))
assert len(parts) == 30, f"expected 30 chunks, found {len(parts)}"
with open(os.path.join(OUT, "parts.txt"), "w") as fh:
    fh.writelines(f"file '{os.path.join(OUT, 'chunks', p)}'\n" for p in parts)
silent = os.path.join(OUT, "silent.mp4")
sh("ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", os.path.join(OUT, "parts.txt"), "-c", "copy", silent)
mix = os.path.join(HERE, "audio", "mix.wav")
sh("ffmpeg", "-y", "-v", "error", "-i", silent, "-i", mix, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
   "-movflags", "+faststart", os.path.join(OUT, "full_60s.mp4"))
for k in range(3):
    t0 = 20 * k
    out = os.path.join(OUT, f"clip{k + 1}.mp4")
    # frame-exact video cut (re-encode at high quality), audio slice of the same 20 s
    sh("ffmpeg", "-y", "-v", "error", "-i", silent, "-ss", str(t0), "-t", "20", "-i", mix,
       "-vf", f"trim=start_frame={600 * k}:end_frame={600 * (k + 1)},setpts=PTS-STARTPTS",
       "-af", "afade=t=in:d=0.01,afade=t=out:st=19.99:d=0.01",
       "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p",
       "-r", "30", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", out)
    print(out, sh("ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,nb_frames,duration", "-of", "csv=p=0", out).split())
