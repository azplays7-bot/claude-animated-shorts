# Assembles dist/index.html (artifact page body) and dist/standalone.html (full document) from src/.
import os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
page = open(os.path.join(ROOT, "src/page.html")).read()
page = page.replace("/*__GLYPHS__*/", open(os.path.join(HERE, "glyphs.json")).read())
page = page.replace("/*__CHUNKS__*/", open(os.path.join(HERE, "chunks.json")).read())
page = page.replace("/*__FILM__*/", open(os.path.join(ROOT, "src/film.js")).read())
os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
open(os.path.join(ROOT, "dist/index.html"), "w").write(page)
full = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>html,body{margin:0}[hidden]{display:none!important}</style></head><body>' + page + '</body></html>')
open(os.path.join(ROOT, "dist/standalone.html"), "w").write(full)
print("built", len(page) // 1024, "KB")
