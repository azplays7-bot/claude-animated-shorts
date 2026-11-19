# Cuts vertical 1080x1920 clips from a 16:9 GTA 6 compilation: blurred fill, full frame in the middle (keeps every
# facecam), hook title on top, word-by-word captions (swears starred) below, loudness-normalised audio.
#   python3 make_gta_clips.py <source.mp4> <words.json from faster-whisper> <out_dir> [<kokoro model dir>]
# With the Kokoro folder it adds an AI commentator (COMMENTARY lines) with the game audio ducked under the voice.
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf

SRC, WORDS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
TTS = sys.argv[4] if len(sys.argv) > 4 else None   # folder with kokoro-v1.0.onnx + voices-v1.0.bin -> adds commentary
kokoro = None
if TTS:
    from kokoro_onnx import Kokoro
    kokoro = Kokoro(os.path.join(TTS, "kokoro-v1.0.onnx"), os.path.join(TTS, "voices-v1.0.bin"))
os.makedirs(OUT, exist_ok=True)

CLIPS = [  # (start, end, slug, hook, title, caption, hashtags)
    (19.90, 40.05, "first_glitch", "13 YEARS IN THE MAKING...\\NAND IT'S ALREADY GLITCHING",
     "GTA 6's first glitch already?!", "13 years of waiting and this happens 😭 Is GTA 6 worth the hype?",
     ["#GTA6", "#GTAVI", "#gaming", "#gta6clips", "#streamer"]),
    (97.00, 117.40, "beach_police_escape", "HE REFUSED TO GET OUT\\NOF THE CAR",
     "Craziest police escape in GTA 6", "The cops said get out. He said no 😂 Would you have made it?",
     ["#GTA6", "#GTAVI", "#gaming", "#gta6clips", "#police"]),
    (247.30, 264.70, "speed_chimp_cage", "SPEED FINDS A CHIMP\\NLOCKED IN A CAGE",
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
    (57.40, 79.80, "car_theft_in_front_of_cops", "STEALING A CAR RIGHT IN\\NFRONT OF THE COPS",
     "Stealing a car right in front of the cops in GTA 6", "The cop was RIGHT there 💀 Would you try this?",
     ["#GTA6", "#Lacy", "#gaming", "#gta6clips", "#funny"]),
    (79.80, 97.00, "clix_plane_wasted", "CLIX TRIES TO LAND\\NA PLANE ON WATER",
     "Clix crashes a plane in GTA 6", "\"Relax, relax...\" 💀 Could you have landed it?",
     ["#GTA6", "#Clix", "#gaming", "#gta6clips", "#fail"]),
    (120.70, 147.40, "nothing_goes_right", "NOTHING IS GOING RIGHT\\NIN GTA 6 TODAY",
     "Can't fly, can't drive: GTA 6 is hard", "From planes to construction zones 😭 Who's worse at driving?",
     ["#GTA6", "#GTAVI", "#gaming", "#gta6clips", "#fail"]),
    (147.40, 170.80, "skydive_over_the_city", "TYPICAL GAMER SKYDIVES\\NOVER THE CITY",
     "Skydiving over the GTA 6 map", "This view is unreal 🪂 Would you jump?",
     ["#GTA6", "#TypicalGamer", "#gaming", "#gta6clips", "#skydiving"]),
    (170.80, 191.40, "cant_score_once", "BRO CAN'T MAKE\\NONE BASKET",
     "Bro can't score once in GTA 6", "Third time's the charm... right? 🏀 Could you do better?",
     ["#GTA6", "#GTAVI", "#gaming", "#gta6clips", "#basketball"]),
    (191.40, 209.00, "crashing_looks_real", "CRASHING IN GTA 6\\NLOOKS SO REAL",
     "Crashing in GTA 6 looks so real", "The physics in this game are crazy 🏍️ Rate this crash 1-10",
     ["#GTA6", "#GTAVI", "#gaming", "#gta6clips", "#physics"]),
    (264.70, 283.70, "map_is_massive", "THE GTA 6 MAP\\NIS MASSIVE",
     "The GTA 6 map is massive", "Leonida is HUGE 🗺️ Where are you going first?",
     ["#GTA6", "#GTAVI", "#gaming", "#gta6clips", "#gta6map"]),
    (350.00, 377.60, "typical_gamer_fight", "TYPICAL GAMER PICKS A\\NFIGHT WITH A BIG GUY",
     "Is GTA 6 fighting better than GTA 5?", "\"Big guy, big guy\" 😂 Is the fighting better than GTA 5?",
     ["#GTA6", "#TypicalGamer", "#gaming", "#gta6clips", "#gta5"]),
]

COMMENTARY = {  # clip number -> [(start s, line)], placed in gaps where the streamer isn't talking
    1: [(0.25, "Thirteen years of waiting. Here's his first drive.")],
    2: [(7.55, "He really thought he could outrun them on sand."), (11.55, "Wait. He actually did it?"),
        (16.2, "Okay, that was clean.")],
    3: [(5.4, "He just called the chimp his brother.")],
    4: [(0.25, "He's trying to land this plane. It's not going well."), (7.95, "And that's a crash."),
        (10.35, "Flying in GTA 6 is not easy.")],
    5: [(0.25, "The cops are on him, and he's on foot."), (5.0, "No car. No plan. Just running."),
        (9.0, "So where does he hide?"), (22.9, "Mid police chase. He ordered food."),
        (28.6, "Honestly, that worker deserves a raise.")],
    6: [(4.75, "Look at this lighting."), (24.7, "GTA 6 at night looks unreal.")],
    7: [(0.2, "Stealing a car. Right in front of the cops."), (5.7, "The officer is literally watching."),
        (13.2, "And they just drive off like nothing happened."), (17.0, "Bold strategy.")],
    8: [(6.0, "He's coming in way too low."), (9.4, "Pull up. Pull up!"), (12.2, "That landing is not happening."),
        (15.5, "Wasted.")],
    9: [(1.0, "Trying to take off from the water."), (13.4, "Next up: driving."),
        (16.2, "Through a construction zone. Great idea.")],
    10: [(0.2, "He just jumped out of a plane."), (4.8, "Look at how big this city is."),
         (8.0, "You can see the whole map from up here."), (11.0, "Now pull the chute."),
         (19.4, "That view is insane.")],
    11: [(3.2, "Trying to make just one basket."), (6.2, "Still nothing."), (8.4, "Not even close."),
         (11.9, "How is this so hard?")],
    12: [(1.6, "He's crashing on purpose now."), (4.2, "Look how he flies off the bike."),
         (7.0, "The ragdoll physics are crazy.")],
    13: [(0.1, "This is the GTA 6 map."), (4.0, "And this is just one part of it."), (6.5, "Zoom out. It keeps going."),
         (11.6, "Leonida is huge."), (15.6, "Where do you even start?")],
    14: [(0.2, "Typical Gamer just walked into a fight."), (3.0, "And these guys are not small."),
         (13.3, "He's testing the fighting."), (15.3, "So, is it better than GTA 5?"), (23.1, "Throw him into the wall!")],
}
NOCAPS = {13}                      # clips whose streamer speech-to-text is too garbled to caption
FIX = {"GJ5": "GTA 5"}              # speech-to-text mistakes
ONLY = {int(x) for x in os.environ.get("ONLY", "").split(",") if x}   # e.g. ONLY=7,8 renders just those
VOICE, SPEED = "am_puck", 1.1

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
Style: Com,Inter Black,78,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,3,10,0,8,60,60,1360,1
Style: Cap,Inter Black,84,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,8,3,8,60,60,1360,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

for n, (a, b, slug, hook, title, caption, tags) in enumerate(CLIPS, 1):
    if ONLY and n not in ONLY:
        continue
    d = b - a
    ev = [f"Dialogue: 0,{ts(0)},{ts(d)},Hook,,0,0,0,,{{\\fad(120,0)\\t(0,160,\\fscx106\\fscy106)\\t(160,300,\\fscx100\\fscy100)}}{hook}"]
    ws = [(s - a, e - a, FIX.get(clean(t).upper(), clean(t).upper())) for s, e, t in words if s >= a - 0.05 and e <= b + 0.3 and clean(t)]
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
    voice = np.zeros(int(d * 48000) + 48000, dtype=np.float32); spans = []
    for t0, line in (COMMENTARY.get(n, []) if kokoro else []):
        a24, sr = kokoro.create(line, voice=VOICE, speed=SPEED, lang="en-us")
        a24 = np.asarray(a24, dtype=np.float32); a24 /= max(1e-6, np.abs(a24).max()); a24 *= 0.8
        a48 = np.interp(np.arange(0, len(a24), sr / 48000), np.arange(len(a24)), a24).astype(np.float32)
        nxt = min([s_ for s_, _, _ in ws if s_ > t0 + 0.05], default=d)
        dur = len(a48) / 48000
        assert t0 + dur <= min(nxt, d) + 0.35, (n, line, round(t0 + dur, 2), round(nxt, 2))
        i0 = int(t0 * 48000); voice[i0:i0 + len(a48)] += a48; spans.append((t0, t0 + dur))
        wl = line.upper().split(); per = dur / sum(len(w) + 1 for w in wl); t = t0
        chunks = [wl[i:i + 3] for i in range(0, len(wl), 3)]
        for ch in chunks:
            for j, w in enumerate(ch):
                wd = per * (len(w) + 1)
                txt = " ".join(("{\\c&H5CFF7A&}" + x + "{\\c&HFFFFFF&}") if q == j else x for q, x in enumerate(ch))
                ev.append(f"Dialogue: 2,{ts(t)},{ts(t + wd)},Com,,0,0,0,,{txt}"); t += wd
    if n in NOCAPS:
        caps = []
    caps = [c for c in caps if not any(c[0] < e2 and c[1] > s2 for s2, e2 in spans)]
    vwav = os.path.join(OUT, f"clip{n:02d}_vo.wav"); sf.write(vwav, np.stack([voice, voice], 1), 48000)
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
    af = (f";[0:a]aresample=48000,loudnorm=I=-17:TP=-2[g];[1:a]atrim=0:{d:.3f},asplit[v1][v2];"
          "[g][v1]sidechaincompress=threshold=0.01:ratio=12:attack=15:release=400[gd];"
          "[gd][v2]amix=inputs=2:normalize=0:duration=first,"
          f"loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=in:d=0.1,afade=t=out:st={d - 0.3:.3f}:d=0.3,aresample=48000[aout]")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{a:.3f}", "-t", f"{d:.3f}", "-i", SRC, "-i", vwav,
                    "-filter_complex", vf + af, "-map", "[v]", "-map", "[aout]", "-r", "30",
                    "-c:v", "libx264", "-crf", "19", "-preset", "medium", "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", dst], check=True)
    os.remove(ass); os.remove(vwav)
    open(dst[:-4] + ".txt", "w").write(f"{title}\n\n{caption}\n\n{' '.join(tags)}\n")
    print(f"{os.path.basename(dst)}  {d:.1f} s")
