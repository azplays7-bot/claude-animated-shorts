# Converts the Anton and Inter ExtraBold fonts (SIL OFL) into SVG path data, so the page draws text as plain paths.
# This keeps the look identical in the browser and in the exported MP4 (no web-font loading inside SVG images).
import json, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
CHARS = "".join(chr(c) for c in range(32, 127)) + "·→×’'–—…"
def extract(path):
    f = TTFont(path); gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f["head"].unitsPerEm
    out = {}
    for ch in CHARS:
        g = cmap.get(ord(ch))
        if not g: continue
        pen = SVGPathPen(gs, ntos=lambda v: str(int(round(v))))
        gs[g].draw(TransformPen(pen, (1, 0, 0, -1, 0, 0)))
        out[ch] = [gs[g].width, pen.getCommands()]
    return {"upm": upm, "g": out}
fonts = {"anton": extract(sys.argv[1]), "inter": extract(sys.argv[2])}
json.dump(fonts, open(sys.argv[3], "w"), separators=(",", ":"))
print({k: len(json.dumps(v)) for k, v in fonts.items()})
