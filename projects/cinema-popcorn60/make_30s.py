# Cuts a 30 s version of out/popcorn_theater_60s.mp4: hook -> theater keeps $2 -> popcorn reveal -> ending,
# joined with short crossfades on sentence boundaries.   python3 make_30s.py  ->  deliverables/popcorn_theater_30s.mp4
import os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "out", "popcorn_theater_60s.mp4")
DST = os.path.join(HERE, "deliverables", "popcorn_theater_30s.mp4")
SEGS = [(0.00, 8.40),    # $15 ticket, theater keeps little, money maker behind the curtain
        (21.35, 26.40),  # from $15 the theater might keep $2 / so how does it survive?
        (32.55, 45.70),  # most profitable thing / POPCORN / $9 tub costs $1.50 / a third of sales, mostly profit
        (52.88, 56.73)]  # next time something looks cheap, find the popcorn + end card
X = 0.15
fc, v, a, t = [], "[v0]", "[a0]", 0.0
for i, (s, e) in enumerate(SEGS):
    fc.append(f"[0:v]trim={s}:{e},setpts=PTS-STARTPTS[v{i}];[0:a]atrim={s}:{e},asetpts=PTS-STARTPTS[a{i}]")
for i in range(1, len(SEGS)):
    t += SEGS[i - 1][1] - SEGS[i - 1][0] - X
    fc.append(f"{v}[v{i}]xfade=transition=fade:duration={X}:offset={t:.3f}[vx{i}];{a}[a{i}]acrossfade=d={X}[ax{i}]")
    v, a = f"[vx{i}]", f"[ax{i}]"
total = sum(e - s for s, e in SEGS) - X * (len(SEGS) - 1)
fc.append(f"{a}afade=t=out:st={total - 0.6:.3f}:d=0.6[aout]")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", SRC, "-filter_complex", ";".join(fc), "-map", v, "-map", "[aout]",
                "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k",
                "-movflags", "+faststart", DST], check=True)
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", DST],
                           capture_output=True, text=True).stdout)
assert abs(dur - 30) < 0.2, dur
print(DST, f"{dur:.2f} s")
