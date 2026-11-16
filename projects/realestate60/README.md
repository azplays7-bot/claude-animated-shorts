# How Real Estate Can Build Wealth

A 60-second vertical 3D explainer (1080×1920, 30 fps), delivered as **six separate 10-second clips** that join seamlessly in an editor.

- **3D:** three.js in Remotion, with real-time shadows. The cast is the same in every clip: Alex (25, blue cardigan), a lender, and a renting family.
- **Narration:** Kokoro TTS `am_puck`. Each scene's speech fits inside its own 10-second clip.
- **Captions:** word-by-word, with yellow keywords. Each clip also gets its own `.srt`.
- **Score and sound effects:** synthesized in code (`audio/make_audio.py`), mixed to −14 LUFS.

## Clips
| Clip | Time | Story |
|---|---|---|
| 1 | 0–10 s | Alex tired at his desk with his paycheck. Cut to the street: rent flows from a house to his phone. "Meet Alex." |
| 2 | 10–20 s | FOR SALE $250,000. At the lender: $50,000 down plus a $200,000 loan. Keys, then monthly payments to the bank. |
| 3 | 20–30 s | FOR RENT. The family moves in and pays $1,800 a month. Then the bills arrive. |
| 4 | 30–40 s | The monthly math, as 36 bundles of $50: $1,200 + $250 + $200 out, $150 left, and a repair can wipe it out. |
| 5 | 40–50 s | A five-year time-lapse through the seasons. The loan shrinks and the value (hypothetically) rises, so equity grows. |
| 6 | 50–60 s | Rent, payoff and rising value can build wealth, but nothing is guaranteed. Closing card. |

## The numbers (all checked)
- **Purchase:** $250,000 price = $50,000 down + $200,000 mortgage.
- **Monthly:** $1,800 rent − $1,200 (principal + interest) − $250 (property taxes + insurance) − $200 (maintenance + vacancy savings) = $1,650 in expenses and **+$150** cash flow.
- **The $1,200 payment:** this is a $200,000, 30-year fixed loan at 6.0%, which works out to $1,199.10 a month.
- **After 5 years** (60 payments): the loan balance is $186,109.
  - If the home's value rises to a hypothetical $300,000 (+$50,000), equity is $300,000 − $186,109 = **$113,891**, up from $50,000 at purchase.
- **On screen:** a footnote marks the value as hypothetical and says prices can also fall. Every clip carries the line "rent and home values are never guaranteed".

## Rebuild
1. `python narration/make_narration.py <kokoro.onnx> <voices.bin>`
2. `python audio/make_audio.py`
3. `node render.mjs '{"mode":"render","comp":"RealEstate60","gl":"swangle","chromeMode":"headless-shell","scale":1.5,"from":0,"to":1799,"chunk":60,"out":"out/chunks","concurrency":2,"crf":16}'`
4. `python make_clips.py`, which writes `out/real_estate_clip1..6.mp4` plus their `.srt` files.
