# Cuts vertical 1080x1920 clips from a 16:9 GTA 6 compilation: blurred fill, full frame in the middle (keeps every
# facecam), hook title on top, word-by-word captions (swears starred) below, loudness-normalised audio.
#   python3 make_gta_clips.py <source.mp4> <words.json from faster-whisper> <out_dir>
import json, os, re, subprocess, sys

SRC, WORDS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)

CLIPS = [  # (start, end, slug, hook, title, caption, hashtags)
    (19.90, 40.05, "first_glitch", "13 YEARS IN THE MAKING...\\NAND IT'S ALREADY GLITCHING",
     "GTA 6's first glitch already?!", "13 years of waiting and this happens 😭 Is GTA 6 worth the hype?",
     ["#GTA6", "#GTAVI", "#gaming", "#gta6clips", "#streamer"]),
    (97.00, 117.40, "beach_police_escape", "HE REFUSED TO GET OUT\\NOF THE CAR",
     "Craziest police escape in GTA 6", "The cops said get out. He said no 😂 Would you have made it?",
     ["#GTA6", "#GTAVI", "#gaming", "#gta6clips", "#police"]),
    (244.50, 264.70, "speed_chimp_cage", "SPEED FINDS A CHIMP\\NLOCKED IN A CAGE",
     "Speed finds a chimp locked in a cage in GTA 6", "\"Why do you got him in a cage, bro?\" 😭 Free him or nah?",
     ["#GTA6", "#IShowSpeed", "#Speed", "#gaming", "#gta6clips"]),
    (304.40, 320.20, "hardest_game_ever", "\"THIS MIGHT BE THE HARDEST\\NGAME OF ALL TIME\"",
     "He can't land the plane in GTA 6", "Flying in GTA 6 is NOT easy 💀 Could you land it?",
     ["#GTA6", "#GTAVI", "#gaming", "#gta6clips", "#fail"]),
    (388.50, 427.50, "drive_through_escape", "LOSING THE COPS...\\NAT THE DRIVE-THROUGH",
     "Running from the cops into a drive-through", "Mid police chase: \"Can I get a double double please?\" 😂",
     ["#GTA6", "#GTAVI", "#gaming", "#gta6clips", "#funny"]),
    (444.70, 476.50, "how_is_this_real", "\"HOW IS THIS GAME\\NREAL, BRO?\"",
     "GTA 6 graphics are unreal", "Driving around at night in GTA 6 hits different 🌴 Best-looking game ever?",
     ["#GTA6", "#IShowSpeed", "#Speed", "#gaming", "#gta6clips"]),
]

SWEARS = re.compile(r"^(fuck\w*|fucking|shit\w*|bitch\w*|pussy|motherfuck\w*|nigg\w*|bullshit)$", re.I)
def clean(w):
    core = re.sub(r"[^\w']", "", w)
    if SWEARS.match(core):
        return core[0] + "*" * (len(core) - 1)
    return core
def ts(t):
    t = max(0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"

segs = json.load(open(WORDS))
words = [(w[0], w[1], w[2].strip()) for s in segs for w in s["words"] if w[2].strip()]

HEAD = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Hook,Inter Black,82,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,7,0,8,50,50,330,1
Style: Cap,Inter Black,84,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,8,3,8,60,60,1360,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

for n, (a, b, slug, hook, title, caption, tags) in enumerate(CLIPS, 1):
    d = b - a
    ev = [f"Dialogue: 0,{ts(0)},{ts(d)},Hook,,0,0,0,,{{\\fad(120,0)\\t(0,160,\\fscx106\\fscy106)\\t(160,300,\\fscx100\\fscy100)}}{hook}"]
    ws = [(s - a, e - a, clean(t).upper()) for s, e, t in words if s >= a - 0.05 and e <= b + 0.3 and clean(t)]
    groups, cur = [], []
    for w in ws:  # groups of up to 3 words, broken on pauses
        if cur and (len(cur) == 3 or w[0] - cur[-1][1] > 0.6):
            groups.append(cur); cur = []
        cur.append(w)
    if cur: groups.append(cur)
    caps = []  # (start, end, text): one on screen at a time
    for g in groups:
        for i, (s, e, _) in enumerate(g):
            end = g[i + 1][0] if i + 1 < len(g) else min(e + 0.35, d)
            txt = " ".join(("{\\c&H00E5FF&}" + t + "{\\c&HFFFFFF&}") if j == i else t for j, (_, _, t) in enumerate(g))
            caps.append([max(0, s), min(end, d), txt])
    for k in range(len(caps) - 1):
        caps[k][1] = min(caps[k][1], caps[k + 1][0])
    ev += [f"Dialogue: 1,{ts(s)},{ts(e)},Cap,,0,0,0,,{t}" for s, e, t in caps if e - s > 0.02]
    ass = os.path.join(OUT, f"clip{n:02d}.ass")
    open(ass, "w").write(HEAD + "\n".join(ev) + "\n")
    dst = os.path.join(OUT, f"clip{n:02d}_{slug}.mp4")
    vf = ("[0:v]split[a][b];"
          "[a]scale=-2:1920,crop=1080:1920,boxblur=28:2,eq=brightness=-0.18:saturation=1.2[bg];"
          "[b]scale=1080:-2[fg];"
          f"[bg][fg]overlay=0:(H-h)/2,ass={ass},fade=t=in:d=0.15,fade=t=out:st={d - 0.25:.3f}:d=0.25[v]")
    af = f"loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=in:d=0.1,afade=t=out:st={d - 0.3:.3f}:d=0.3,aresample=48000"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{a:.3f}", "-t", f"{d:.3f}", "-i", SRC,
                    "-filter_complex", vf, "-map", "[v]", "-map", "0:a", "-af", af, "-r", "30",
                    "-c:v", "libx264", "-crf", "19", "-preset", "medium", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", dst], check=True)
    os.remove(ass)
    open(dst[:-4] + ".txt", "w").write(f"{title}\n\n{caption}\n\n{' '.join(tags)}\n")
    print(f"{os.path.basename(dst)}  {d:.1f} s")
