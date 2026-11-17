# From empty shop to owner: 60 s vertical short

1080×1920, 30 fps, 60 s, in the same flat-characters-in-a-3D-toon-world style as the other shorts (Remotion + three.js).

**Story:** The hook shows an empty "FOR LEASE" shop and promises to reveal what it becomes; a locked badge stays on screen until the reveal. Rosa works 9 to 5 and her hours make money for her boss. Owning flips that: path one is a franchise (proven brand and playbook, but an up-front fee plus royalties, often 4–8% of sales); path two is your own idea (cheaper, but you build everything). The math: sales − costs = profit (a $10 sale, $9 of costs, $1 profit). Train a team and the shop earns while you're away. It's not easy: about half of new businesses close within five years, so start small, test the idea and read every contract. The reveal: the empty shop is **Rosa's Bakery**; a year later her manager gets the keys and she opens shop #2. Call to action: write down 3 problems people pay to fix.

**Facts:** franchise royalties vary by brand (commonly ~4–8% of gross sales); US BLS Business Employment Dynamics shows roughly half of new establishments gone within 5 years; the FTC Franchise Rule requires the Franchise Disclosure Document at least 14 days before signing or paying. The $10/$1 sale is an illustrative example. Not financial advice.

| Path | Contents |
|---|---|
| `narration/` | `script.json`, `make_narration.py` (Kokoro TTS, am_puck), `narration.wav`, `timing.json`, `captions.srt` |
| `audio/` | `make_audio.py` and `dsp.py` (synthesized plucked-pop score and SFX), `mix.wav` (−14 LUFS, ≤ −1 dBTP) |
| `toon/src/` | Scene code (`story.ts` shots and camera, `world.ts` sets, `cast.ts` characters and effects, `overlay.tsx` titles and captions); copy into the engine project as `src/videos/bakery` and register `BakeryShort` |
| `toon/render.mjs` | Chunked, resumable renderer |
| `make_video.py <chunk_dir>` | Joins the chunks and the mix into `out/rosas_bakery_owner_60s.mp4` and its `.srt` |
| `deliverables/` | Final video, captions, contact sheet |
