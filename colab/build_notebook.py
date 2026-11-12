# Builds Cartoon_Short_Colab.ipynb: a one-click Google Colab notebook that renders the bridge short to MP4.
# The project source (templates/bridge, templates/audio, templates/project, colab/render.mjs, colab/bed.py) is embedded
# as one base64 tar.gz, so the notebook needs nothing from GitHub. Re-run after changing any template:
#   python colab/build_notebook.py
import base64, gzip, io, json, os, tarfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
OUT = os.path.join(HERE, "Cartoon_Short_Colab.ipynb")


def payload():
    buf = io.BytesIO()
    gz = gzip.GzipFile(fileobj=buf, mode="wb", compresslevel=9, mtime=0)  # mtime=0: identical output on every rebuild
    with tarfile.open(fileobj=gz, mode="w") as tar:
        def add(src, dst):
            for root, _dirs, files in os.walk(src):
                for f in sorted(files):
                    if f.endswith((".pyc", ".npy")) or "__pycache__" in root:
                        continue
                    p = os.path.join(root, f)
                    ti = tar.gettarinfo(p, os.path.join(dst, os.path.relpath(p, src)))
                    ti.mtime, ti.uid, ti.gid, ti.uname, ti.gname = 0, 0, 0, "", ""
                    with open(p, "rb") as fh:
                        tar.addfile(ti, fh)
        add(os.path.join(REPO, "templates/project"), ".")
        add(os.path.join(REPO, "templates/bridge"), "src/videos/bridge")
        add(os.path.join(REPO, "templates/audio"), "audio")
        for f in ("render.mjs", "bed.py"):
            add_one = os.path.join(HERE, f)
            ti = tar.gettarinfo(add_one, f)
            ti.mtime, ti.uid, ti.gid, ti.uname, ti.gname = 0, 0, 0, "", ""
            with open(add_one, "rb") as fh:
                tar.addfile(ti, fh)
    gz.close()
    return base64.b64encode(buf.getvalue()).decode()


def md(text):
    return {"cell_type": "markdown", "metadata": {}, "source": text.strip("\n")}


def code(text, form=True):
    meta = {"cellView": "form"} if form else {}
    return {"cell_type": "code", "metadata": meta, "execution_count": None, "outputs": [], "source": text.strip("\n")}


INTRO = r"""
# 🎬 The Bridge That Fell for a Song: render it in Colab

This notebook builds the whole 3D cartoon short (characters, town, bridge, all 15 shots and camera moves, ink outlines, lens blur, colour grade, music and sound effects) and exports an **MP4**.

**To run:** tap **Runtime → Run all**. When Google asks to connect your Drive, tap **Connect** and allow it.

**Before you start (iPad / iPhone):**
1. **Runtime → Change runtime type → T4 GPU → Save** (free; the notebook tries to use it and falls back to CPU if it can't).
2. Keep this Safari tab **open and in front**, the iPad **plugged in**, and **Auto-Lock off** (Settings → Display & Brightness → Auto-Lock → Never). If Safari goes to sleep, Colab may disconnect.
3. If it disconnects: open the notebook again and **Run all**. Finished pieces are saved to Google Drive, so it carries on where it stopped.

The finished video lands in **Google Drive → My Drive → CartoonShort** (open it in the Drive app), and Safari also offers it as a download.

Change the settings in the first cell before **Run all** if you want a quicker test or a sharper video.
"""

SETTINGS = r"""
# @title ⚙️ Settings (change these, then Runtime → Run all)
QUALITY = "Fast 540x960"  # @param ["Fast 540x960", "HD 1080x1920", "2K 1440x2560"]
PART = "Whole video (67 s)"  # @param ["Whole video (67 s)", "First 10 seconds (quick test)", "Custom (seconds below)"]
CUSTOM_START_SECOND = 0  # @param {type:"number"}
CUSTOM_END_SECOND = 67.5  # @param {type:"number"}
SOUND = "Music + sound effects"  # @param ["Music + sound effects", "My voice + music + sound effects", "No sound"]
SAVE_TO_GOOGLE_DRIVE = True  # @param {type:"boolean"}
# "My voice": put voice.wav and words.json (word timings) in My Drive/CartoonShort/voice/ first.
print("Settings:", QUALITY, "|", PART, "|", SOUND, "| save to Drive:", SAVE_TO_GOOGLE_DRIVE)
"""

SETUP = r"""
# @title 1️⃣ Install everything (about 2-4 minutes)
import os, sys, json, base64, io, tarfile, subprocess, shutil, time, math

def sh(cmd, quiet=True):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout[-3000:], r.stderr[-3000:])
        raise RuntimeError(f"command failed: {cmd}")
    if not quiet:
        print(r.stdout[-2000:])
    return r.stdout

IN_COLAB = "google.colab" in sys.modules
PROJ = "/content/short" if IN_COLAB else os.path.abspath("short")
FPS, TOTAL_FRAMES = 30, 2025

# ---- where results go
if IN_COLAB and SAVE_TO_GOOGLE_DRIVE:
    from google.colab import drive
    drive.mount("/content/drive")
    SAVE = "/content/drive/MyDrive/CartoonShort"
else:
    SAVE = "/content/CartoonShort" if IN_COLAB else os.path.abspath("CartoonShort")
os.makedirs(SAVE, exist_ok=True)
print("Saving to:", SAVE)

# ---- GPU?
GPU = shutil.which("nvidia-smi") is not None and subprocess.run("nvidia-smi -L", shell=True, capture_output=True).returncode == 0
print("GPU:", sh("nvidia-smi -L").strip() if GPU else "none (CPU only: slower; Runtime -> Change runtime type -> T4 GPU)")

# ---- system libraries Chrome needs (Colab's Ubuntu lacks a few)
if IN_COLAB:
    print("Installing system libraries...")
    sh("apt-get -qq update")
    for pkg in ["libnss3", "libdbus-1-3", "libatk1.0-0", "libatk-bridge2.0-0", "libgbm1", "libasound2", "libxrandr2",
                "libxkbcommon0", "libxfixes3", "libxcomposite1", "libxdamage1", "libpango-1.0-0", "libcairo2", "libcups2",
                "libxshmfence1", "libegl1", "libgl1", "libvulkan1"]:
        subprocess.run(f"apt-get -qq install -y {pkg}", shell=True, capture_output=True)

# ---- Node.js 20+
def node_major():
    try:
        return int(sh("node --version").strip().lstrip("v").split(".")[0])
    except Exception:
        return 0
if node_major() < 20:
    print("Installing Node.js 20...")
    sh("curl -fsSL https://nodejs.org/dist/v20.18.1/node-v20.18.1-linux-x64.tar.xz -o /tmp/node.tar.xz")
    sh("tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1")
print("Node", sh("node --version").strip())

# ---- unpack the project (characters, world, story/cameras, post effects, sound code)
os.makedirs(PROJ, exist_ok=True)
with tarfile.open(fileobj=io.BytesIO(base64.b64decode(PROJECT_TGZ)), mode="r:gz") as tar:
    tar.extractall(PROJ, **({"filter": "data"} if hasattr(tarfile, "data_filter") else {}))
os.chdir(PROJ)
print("Project unpacked to", PROJ)

# ---- npm packages (Remotion, three.js, React Three Fiber, postprocessing)
if not os.path.exists("node_modules/@remotion/renderer"):
    print("Installing npm packages...")
    sh("npm install --no-audit --no-fund --loglevel=error")
print("✅ Setup done")
"""

PROBE = r"""
# @title 2️⃣ Pick the fastest renderer that works (about 2-5 minutes)
SCALE, DPR, LABEL = {"Fast 540x960": (0.5, 0.5, "540x960"), "HD 1080x1920": (1.0, None, "1080x1920"),
                     "2K 1440x2560": (1.3333, None, "1440x2560")}[QUALITY]
if PART.startswith("Whole"):
    F0, F1 = 0, TOTAL_FRAMES - 1
elif PART.startswith("First"):
    F0, F1 = 0, 10 * FPS - 1
else:
    F0 = max(0, int(round(CUSTOM_START_SECOND * FPS)))
    F1 = min(TOTAL_FRAMES - 1, int(round(CUSTOM_END_SECOND * FPS)) - 1)
assert F1 > F0, "Custom end must be after the start"
NFRAMES = F1 - F0 + 1

BROWSER = os.environ.get("CS_BROWSER")  # only for testing outside Colab
candidates = []
if GPU:
    candidates += [["angle-egl", "chrome-for-testing"], ["vulkan", "chrome-for-testing"], ["egl", "headless-shell"]]
candidates += [["swangle", "headless-shell"]]
if BROWSER:
    candidates = [c for c in candidates if c[1] == "headless-shell"]

def run_driver(cfg, on_line):
    p = subprocess.Popen(["node", "render.mjs", json.dumps(cfg)], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    tail = []
    for line in p.stdout:
        line = line.strip()
        if line.startswith("{"):
            try:
                on_line(json.loads(line)); continue
            except json.JSONDecodeError:
                pass
        if line and "404" not in line and "kenney" not in line:
            tail = (tail + [line])[-15:]
    p.wait()
    return p.returncode, tail

print(f"Testing {len(candidates)} render mode(s) on 8 real frames at {LABEL}...")
results = []
code_, tail = run_driver({"mode": "probe", "comp": "BridgeShort", "candidates": candidates, "frame": 400, "scale": SCALE,
                          "dpr": DPR, "out": "out/probe", "browser": BROWSER}, results.append)
for r in results:
    state = f"works, {r['sec']:.1f} s/frame" if r.get("ok") else ("blank frames" if "bytes" in r else "failed: " + r.get("error", "?"))
    print(f"  {r['gl']:>9} / {r['chromeMode']:<18} {state}")
good = sorted([r for r in results if r.get("ok")], key=lambda r: r["sec"])
if not good:
    print("\n".join(tail))
    raise RuntimeError("No render mode worked. Runtime -> Disconnect and delete runtime, then Run all again.")
BEST = good[0]
CONC = 2 if BEST["gl"] != "swangle" else 1    # CPU (swangle) is slower with parallel tabs
eta = NFRAMES * BEST["sec"] / (1.6 if CONC == 2 else 1)
print(f"\n✅ Using {BEST['gl']} ({'GPU' if BEST['gl'] != 'swangle' else 'CPU'}), about {BEST['sec']:.1f} s per frame")
print(f"⏱️ {NFRAMES} frames at {LABEL}: roughly {eta/3600:.1f} h ({eta/60:.0f} min). Keep this tab open.")
"""

RENDER = r"""
# @title 3️⃣ Render the animation (the long step; safe to re-run, it resumes)
from IPython.display import display, HTML
CHUNKS = os.path.join(SAVE, f"chunks_{LABEL}_{F0}-{F1}")
os.makedirs(CHUNKS, exist_ok=True)
bar = display(HTML(""), display_id=True)
t_start = time.time()

def show(ev):
    if "done" in ev and "total" in ev:
        pct = 100 * ev["done"] / ev["total"]
        el = time.time() - t_start
        rate = el / max(1, ev["done"] - skipped[0]) if ev["done"] > skipped[0] else None
        left = f"{(ev['total'] - ev['done']) * rate / 60:.0f} min left" if rate else "starting..."
        bar.update(HTML(f"<b>Rendering {ev['done']}/{ev['total']} frames ({pct:.0f}%)</b> · {left}"
                        f"<div style='background:#ddd;height:14px;width:100%'><div style='background:#2a7;height:14px;width:{pct:.1f}%'></div></div>"))
    if "skip" in ev:
        skipped[0] = ev["done"]
    if ev.get("fatal"):
        print("Error:", ev["fatal"])

skipped = [0]
cfg = {"mode": "render", "comp": "BridgeShort", "gl": BEST["gl"], "chromeMode": BEST["chromeMode"], "scale": SCALE, "dpr": DPR,
       "from": F0, "to": F1, "chunk": 60, "out": CHUNKS, "concurrency": CONC, "crf": 18, "browser": BROWSER}
code_, tail = run_driver(cfg, show)
if code_ != 0:
    print("\n".join(tail))
    raise RuntimeError("Rendering stopped. Run all again: finished pieces are kept and it resumes.")
print(f"✅ Rendered in {(time.time() - t_start)/60:.1f} min")
"""

SOUND_CELL = r"""
# @title 4️⃣ Make the sound (about 1-2 minutes)
AUDIO = None
if SOUND == "No sound":
    print("No sound selected")
elif SOUND.startswith("My voice"):
    vdir = os.path.join(SAVE, "voice")
    if not (os.path.exists(os.path.join(vdir, "voice.wav")) and os.path.exists(os.path.join(vdir, "words.json"))):
        raise FileNotFoundError(f"Put voice.wav and words.json in {vdir} (Google Drive: My Drive/CartoonShort/voice), or pick another SOUND.")
    shutil.copytree(vdir, os.path.join(PROJ, "voice"), dirs_exist_ok=True)
    sh("pip -q install numpy scipy")
    print(sh(f"cd {PROJ}/audio && python mix.py")[-1500:])
    AUDIO = os.path.join(PROJ, "audio", "mix.wav")
else:
    sh("pip -q install numpy scipy")
    print(sh(f"python bed.py {PROJ}/audio {PROJ}/out/bed.wav").strip())
    AUDIO = os.path.join(PROJ, "out", "bed.wav")
"""

EXPORT = r"""
# @title 5️⃣ Join everything into the final MP4 and download it
parts = sorted(f for f in os.listdir(CHUNKS) if f.endswith(".mp4") and os.path.exists(os.path.join(CHUNKS, f[:-4] + ".done")))
with open("out/parts.txt", "w") as fh:
    fh.writelines(f"file '{os.path.join(CHUNKS, p)}'\n" for p in parts)
silent = "out/video_silent.mp4"
sh(f"ffmpeg -y -v error -f concat -safe 0 -i out/parts.txt -c copy {silent}")
name = f"bridge_short_{LABEL}" + ("" if (F0, F1) == (0, TOTAL_FRAMES - 1) else f"_{F0/FPS:.0f}-{(F1+1)/FPS:.0f}s") + ".mp4"
final = os.path.join(SAVE, name)
if AUDIO:
    sh(f"ffmpeg -y -v error -i {silent} -ss {F0/FPS:.3f} -t {NFRAMES/FPS:.3f} -i {AUDIO} -map 0:v:0 -map 1:a:0 "
       f"-c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart {final}")
else:
    sh(f"ffmpeg -y -v error -i {silent} -c copy -movflags +faststart {final}")
dur = float(sh(f"ffprobe -v error -show_entries format=duration -of csv=p=0 '{final}'"))
print(f"🎉 Done: {final}  ({dur:.1f} s, {os.path.getsize(final)/1e6:.0f} MB)")
if SAVE.startswith("/content/drive"):
    print("It is in Google Drive → My Drive → CartoonShort (open it in the Drive app to save it to Photos).")
if IN_COLAB:
    from google.colab import files
    files.download(final)
"""


def build():
    nb = {
        "nbformat": 4, "nbformat_minor": 0,
        "metadata": {"colab": {"provenance": [], "toc_visible": False, "gpuType": "T4"}, "accelerator": "GPU",
                     "kernelspec": {"name": "python3", "display_name": "Python 3"}, "language_info": {"name": "python"}},
        "cells": [md(INTRO), code(SETTINGS),
                  code("# @title 📦 Project files (characters, scenes, cameras, effects, sound; embedded)\nPROJECT_TGZ = \"" + payload() + "\""),
                  code(SETUP), code(PROBE), code(RENDER), code(SOUND_CELL), code(EXPORT)],
    }
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(nb, fh, indent=1, ensure_ascii=False)
    print("wrote", OUT, f"{os.path.getsize(OUT)/1024:.0f} KB")


if __name__ == "__main__":
    build()
