# Elon Musk: How Much Does His Fortune Grow Every Second?

A 60-second vertical documentary short (1080×1920, 30 fps), delivered as six separate 10-second clips that join seamlessly in CapCut.

- **3D:** three.js in Remotion.
- **Narration:** Kokoro `am_puck`.
- **Captions:** word-by-word, with yellow keywords.
- **Score and sound effects:** synthesized in code.

## Numbers
Every number is an average of one estimated figure: Musk's **+$454 billion** year-over-year change in net worth on the Bloomberg Billionaires Index profile. The profile was last updated November 13, 2026, and showed a net worth of $883B and −$7.24B on the day. Because the index updates daily, these figures are a snapshot. This sandbox could not open bloomberg.com directly, so the figures were checked through search excerpts of the profile.

| Period | Formula | Value |
|---|---|---|
| Second | 454e9 / 31,536,000 | $14,396 |
| Minute | 454e9 / 525,600 | $863,775 |
| Hour | 454e9 / 8,760 | $51.8 million |
| Day | 454e9 / 365 | $1.24 billion |
| Month | 454e9 / 12 | $37.8 billion |

- **Not income:** the figures are labelled on screen as *estimated average net-worth growth, not cash income*.
- **The "decade" comparison:** median full-time weekly earnings of $1,232 (BLS, Q3 2026) × 52 × 10 ≈ $640,000, less than one "minute" ($863,775).

## Likeness
The lead is a stylised, generic cartoon figure in a black suit and dark shirt, not a realistic or recognisable likeness of the real person. The rocket, car and charts are generic designs with no company logos.

## Rebuild
1. `python narration/make_narration.py <kokoro.onnx> <voices.bin>`
2. `python audio/make_audio.py`
3. Render with `render.mjs` (`"comp":"Fortune60","scale":1.5`).
4. `python make_clips.py`
