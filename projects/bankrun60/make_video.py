# Joins the rendered chunks (1080x1920) and the final mix into out/bank_run_60s.mp4, and writes out/bank_run_60s.srt.
import os, shutil, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
sh = lambda *a: subprocess.run(a, check=True, capture_output=True, text=True).stdout
parts = sorted(f for f in os.listdir(os.path.join(OUT, "chunks")) if f.endswith(".mp4"))
assert len(parts) == 30, f"expected 30 chunks, found {len(parts)}"
with open(os.path.join(OUT, "parts.txt"), "w") as fh:
    fh.writelines(f"file '{os.path.join(OUT, 'chunks', p)}'\n" for p in parts)
silent = os.path.join(OUT, "silent.mp4")
sh("ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", os.path.join(OUT, "parts.txt"), "-c", "copy", silent)
final = os.path.join(OUT, "bank_run_60s.mp4")
sh("ffmpeg", "-y", "-v", "error", "-i", silent, "-i", os.path.join(HERE, "audio", "mix.wav"), "-map", "0:v:0", "-map", "1:a:0",
   "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-t", "60", "-movflags", "+faststart", final)
shutil.copy(os.path.join(HERE, "narration", "captions.srt"), os.path.join(OUT, "bank_run_60s.srt"))
print(final, sh("ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,nb_frames,duration", "-of", "csv=p=0", final).split())
