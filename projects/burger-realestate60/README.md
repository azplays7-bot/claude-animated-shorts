# How McDonald's makes money from real estate (60 s, 1080×1920)

Cartoon explainer in the same flat-characters-in-a-3D-toon-world style as the Pisa and real-estate shorts (same engine).

- `narration/` – script (`script.json`), Kokoro TTS narration (`make_narration.py`, voice am_puck), `timing.json`, `captions.srt`
- `audio/` – synthesized score + SFX and the final mix (`make_audio.py` → `mix.wav`, −14 LUFS, −1 dBTP)
- `toon/src/` – the Remotion/three.js scene (`story.ts` shots + camera, `world.ts` set, `cast.ts` characters, `overlay.tsx` text)
  Copy it to `src/videos/burger/` of the toon engine project and register `BurgerShort` (1800 frames, 30 fps).
- `make_video.py <chunk_dir>` – joins the rendered chunks with the mix → `out/mcdonalds_real_estate_60s.mp4` + `.srt`

## Facts used (McDonald's 2024 Form 10-K, rounded)
- 43,477 restaurants at end of 2024, ~95 % franchised.
- Franchised-restaurant revenue 2024: rents ≈ $10.0 B, royalties ≈ $5.6 B (initial fees ≈ $0.1 B).
- Rent and royalties are a percent of sales, with minimum rent payments.
- The company owns much of the land and most of the buildings in its major markets, and leases the rest long-term.
- Quote attributed to early executive Harry J. Sonneborn ("…we are in the real estate business"), shown as widely quoted.

The restaurant, sign and characters are generic drawings – no McDonald's logos or trade dress. On-screen small print:
not affiliated with McDonald's, simplified for education, not financial advice.
