# Cuts out/popcorn_theater_60s.mp4 into 10 short clips (each <= 7 s, cut on sentence/caption boundaries) with a short
# audio fade at both ends.   python3 make_clips.py   ->  deliverables/clips/clipNN_<name>.mp4
import os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "out", "popcorn_theater_60s.mp4")
OUT = os.path.join(HERE, "deliverables", "clips"); os.makedirs(OUT, exist_ok=True)
CLIPS = [  # (start, end, name)
    (0.00, 5.25, "hook_15_ticket"),
    (5.30, 10.00, "whats_behind_the_curtain"),
    (10.00, 14.95, "studio_takes_its_cut"),
    (14.95, 21.40, "rent_staff_power_gone"),
    (21.40, 24.70, "theater_keeps_2"),
    (24.70, 30.40, "how_do_they_survive"),
    (30.35, 37.30, "no_outside_food_curtain_tease"),
    (37.30, 42.55, "reveal_popcorn"),
    (42.55, 49.20, "popcorn_pays_the_bills"),
    (49.25, 56.20, "find_the_popcorn"),
]
for i, (a, b, name) in enumerate(CLIPS, 1):
    d = b - a; assert 0 < d <= 7.0, (name, d)
    dst = os.path.join(OUT, f"clip{i:02d}_{name}.mp4")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{a:.3f}", "-i", SRC, "-t", f"{d:.3f}",
                    "-af", f"afade=t=in:d=0.08,afade=t=out:st={d - 0.12:.3f}:d=0.12",
                    "-c:v", "libx264", "-crf", "20", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k",
                    "-movflags", "+faststart", dst], check=True)
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", dst], capture_output=True, text=True).stdout.strip()
    print(f"{os.path.basename(dst)}  {float(dur):.2f} s")
