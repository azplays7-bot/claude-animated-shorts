# 🏦 What Happens If Everyone Withdraws Their Money at the Same Time?
**Production package:** 60 s · 9:16 · 1080×1920 · 30 fps · ages 10–25 · TikTok, YouTube Shorts, Reels

Already made (free, in this folder):
- `narration/narration.wav`: the full 60.000 s AI voiceover (Kokoro `am_puck`, a young energetic American male voice).
- `narration/captions.srt`: captions synced to the spoken words. Words in CAPS are the ones to highlight yellow.
- `narration/timing.json`: exact start and end times of every sentence and caption.

---

## 1. Fact sheet (checked 2026-11-14)
| # | Fact used | Status | Source |
|---|---|---|---|
| 1 | On Thursday March 9, 2023, depositors and investors tried to pull **$42 billion** from Silicon Valley Bank in one day | ✅ Verified. The figure comes from a California regulator's filing, reported by Bloomberg and Fortune | [Bloomberg](https://www.bloomberg.com/news/articles/2023-03-11/svb-depositors-investors-tried-to-pull-42-billion-on-thursday), [Fortune](https://fortune.com/2023/03/11/silicon-valley-bank-run-42-billion-attempted-withdrawals-in-one-day/) |
| 2 | **The next day** (March 10, 2023) regulators closed it and the FDIC took over | ✅ Verified | [Banking Exchange](https://www.bankingexchange.com/news-feed/item/9594-fdic-assumes-control-of-silicon-valley-bank) |
| 3 | Banks lend out most deposits and keep only a small part as cash | ✅ True as a general rule. ⚠️ Don't put an exact % on screen: it varies by bank, and the Fed's reserve requirement has been 0% since March 2020 | Federal Reserve |
| 4 | In a run, banks may have to sell investments fast, sometimes at a loss | ✅ True. SVB had just sold securities at a **$1.8 billion loss** before its run | [Business Standard / Bloomberg](https://www.business-standard.com/amp/article/international/svb-depositors-investors-tried-to-pull-42-bn-on-thursday-amid-jitters-123031100079_1.html) |
| 5 | Panic can spread to other banks (contagion) | ✅ True. Signature Bank failed two days after SVB | General reporting, March 2023 |
| 6 | **About 9,000 banks** suspended operations in 1930–1933 | ✅ The FDIC's own figure. ⚠️ Say "about"; year-by-year counts vary by source | [FDIC history](https://www.fdic.gov/bank/historical/brief/brhist.pdf) |
| 7 | The FDIC was created by the Banking Act of 1933 (signed June 16, 1933). Insurance began Jan 1, 1934 | ✅ Verified | FDIC |
| 8 | Coverage is **$250,000 per depositor, per insured bank, for each account ownership category** | ✅ Verified. The narration simplifies it to "per depositor, per bank"; the full rule is in the on-screen footnote | [FDIC](https://www.fdic.gov/resources/deposit-insurance/understanding-deposit-insurance) |
| 9 | "Since then, no one has lost a penny of insured money" | ✅ The FDIC's own claim. ⚠️ It applies to **insured** deposits only, so the script says "insured money" | [FDIC](https://www.fdic.gov/bank-failures/when-bank-fails-facts-depositors-creditors-and-borrowers) |
| 10 | The Federal Reserve can lend banks emergency cash (the "discount window", "lender of last resort") | ✅ True | Federal Reserve |

**Don't add without checking:** any specific bank's cash percentage; how much physical cash exists in the U.S. (it changes yearly); claims that "all" depositors are always protected (only insured deposits are guaranteed; SVB's uninsured deposits were covered by a one-time government decision).

---

## 2. Final script (narration as recorded, about 58 s of speech)
| Scene | Time | Narration |
|---|---|---|
| 1 Hook | 0.0–10.0 | In 2023, people tried to pull **$42 billion** out of **one bank**, in **one day**. The next day, it was **shut down**. So what if **everyone** took their money out **at once**? |
| 2 The secret | 10.0–20.0 | Here's the **secret**. Your money **isn't** sitting in a vault. Banks **lend** most of it out, for **houses, cars, and businesses**, and keep only a **small slice** as cash. |
| 3 The run | 20.0–30.0 | That works because people don't all withdraw on the **same day**. But if everyone **panics** at once, the cash **runs out**. That's called a **bank run**. |
| 4 Dominoes | 30.0–38.4 | To pay people back, the bank has to **sell** its investments **fast**, sometimes at a **loss**. And when people at **other banks** see the panic, they start **running too**. |
| 5 The fix | 38.4–49.9 | In the 1930s **Great Depression**, about **9,000 banks** failed. So in 1933, America created the **FDIC**. It insures up to **$250,000** per depositor, per bank. |
| 6 Payoff | 49.9–60.0 | Since then, **no one** has lost a **penny** of insured money. And the Fed can lend banks **emergency cash**. It's **working**, and it's **protected**. **Follow** for more! |

Bold = caption words in bright yellow (#FFE14D). Everything else is white with a black outline.

---

## 3. Consistency bible (paste the STYLE block into every prompt)

**STYLE block (always the same):**
> Stylized 3D cartoon animation, feature-film quality, expressive characters with large eyes and soft rounded shapes, detailed environments, warm cinematic lighting with soft global illumination and gentle rim light, shallow depth of field, smooth natural motion, vibrant but realistic colors, vertical 9:16 composition, 1080x1920, 30 fps.

**NEGATIVE block (if the tool supports it):**
> text, logos, watermarks, real brand names, extra fingers, deformed hands, face morphing, flicker, jittery motion, photorealistic humans, slideshow, static image, zoom-only.

**Characters (generate reference images FIRST, then always attach them):**
| Name | Look (never changes) |
|---|---|
| **MAYA** (hero, 16) | Medium-brown skin, big dark-brown eyes, curly black hair in a high puff with a yellow scrunchie, **mustard-yellow hoodie with a small round coin patch on the chest**, light-blue jeans, white sneakers, small gold hoop earrings |
| **MR. ORTIZ** (bank teller, 45) | Light-tan skin, round tortoiseshell glasses, neat gray mustache, short salt-and-pepper hair, **navy vest over a white shirt, burgundy bow tie**, brass name pin |
| **Crowd** | Varied ages and ethnicities, everyday clothes in muted colors (so Maya's yellow hoodie always pops) |

**Environments:**
- **Brightwater Savings** (fictional bank, no real logos): cream limestone facade, four columns, brass clock above the door, revolving door. Inside: green-veined marble floor, brass teller windows, warm pendant lamps.
- **The vault:** round riveted steel door (open), crates of banded dollar bundles, a few gold bars on a shelf, an old brass lantern glow (from your reference image).
- **Downtown:** mid-size American city, golden morning sun, glass towers, yellow taxis, trees, food cart.
- **Palette:** warm gold, teal shadows, Maya yellow #F2B53A, alarm red only in scenes 3–4.

---

## 4. Step 0: reference images (make these first, 4 images)
Use any image model (Higgsfield / Midjourney / GPT-image / Flux). Generate 2–4 variants each and keep the best.

1. **Maya character sheet:** `Character turnaround sheet of MAYA, a 16-year-old girl, [Maya description], front view, 3/4 view, side view, back view, plus 6 facial expressions (excited, curious, worried, shocked, relieved, laughing), neutral light-gray background. [STYLE block]`
2. **Mr. Ortiz character sheet:** same template with the Mr. Ortiz description and expressions (friendly, nervous, sweating, relieved, explaining).
3. **Bank exterior keyframe:** `Brightwater Savings bank on a sunny downtown street at golden morning, [environment description], wide shot, vertical 9:16. [STYLE block]`
4. **Lobby + vault keyframe:** `Interior of Brightwater Savings, marble lobby with brass teller windows, round steel vault door open in the back showing crates of banded cash and gold bars, lantern glow, vertical 9:16. [STYLE block]`

Then for every shot below, use **image-to-video**: attach the matching character sheet(s) and environment keyframe as references, or as the start frame.

---

## 5. Scenes and shots (18 shots, a new visual every 3–4 s)
Generate each shot at 5 s (the shortest most tools allow) and trim it to the length given. Characters do **not** speak on camera, because the narrator is off-screen. That avoids lip-sync glitches, the most common AI-video failure. Faces only react (blink, gasp, smile).

### SCENE 1: The hook (0.0–10.0 s)
| Shot | Time | Camera | Prompt |
|---|---|---|---|
| 1A | 0.0–2.4 | Fast push-in from the sky down to the street (drone dive) | `Dramatic aerial dive over a sunny American downtown at golden morning, camera plunges toward Brightwater Savings bank where a huge crowd surges toward the doors, people running and waving phones, papers blowing in the wind, high energy. [STYLE] [NEGATIVE]` |
| 1B | 2.4–5.8 | Tracking shot alongside the line | `Tracking shot along an extremely long line of worried people outside Brightwater Savings, the line snakes around the block, a giant animated digital counter in the sky rapidly rolls up dollar bills flying into the air, tension building. [STYLE]` |
| 1C | 5.8–10.0 | Slow dolly onto Maya, then close-up | `MAYA [reference] stops on the sidewalk across the street, holding her phone, sees the crowd, her eyes go wide, she blinks and slowly lowers the phone in shock, the bank's brass clock ticks behind her, shallow depth of field, close-up on her face. [STYLE]` |

**Captions:** "In 2023, people tried to pull" → "**$42 BILLION** out of **ONE** bank, in **ONE DAY**." → "The next day, it was **SHUT DOWN**." → "So what if **EVERYONE** took their money out **AT ONCE**?"
**SFX:** city ambience, crowd murmur swelling, whoosh on the dive, cash flutter, a deep "boom" on "SHUT DOWN", a clock tick.

### SCENE 2: Where your money really goes (10.0–20.0 s)
| Shot | Time | Camera | Prompt |
|---|---|---|---|
| 2A | 10.0–12.8 | Close-up, hand-held feel | `Inside Brightwater Savings, MAYA [reference] slides a neat stack of dollar bills under a brass teller window to MR. ORTIZ [reference], who smiles and nods, warm pendant light, close-up of hands and money. [STYLE]` |
| 2B | 12.8–15.6 | Camera follows the bills into the vault | `The stack of dollar bills magically lifts off the counter and flies through the marble lobby into the open round steel vault, the camera follows them inside, crates of banded cash, gold bars, lantern glow, then most of the bills keep flying straight out the back. [STYLE]` |
| 2C | 15.6–20.0 | Wide magical overhead | `Overhead view of a miniature glowing city: streams of golden dollar bills fly from Brightwater Savings to a family receiving house keys, a teen getting car keys, and a bakery owner opening her shop, while only a small pile of cash stays behind in the vault, warm and wondrous. [STYLE]` |

**Captions:** "Here's the **SECRET**." → "Your money **ISN'T** sitting in a vault." → "Banks **LEND** most of it out," → "for **HOUSES, CARS,** and **BUSINESSES,**" → "and keep only a **SMALL SLICE** as cash."
**On-screen graphic (added in the edit):** a bar split into "KEPT READY (small)" and "LENT OUT (most)". No percentages.
**SFX:** door chime, paper slide, magical whoosh, coin sparkle, keys jingle.

### SCENE 3: The bank run (20.0–30.0 s)
| Shot | Time | Camera | Prompt |
|---|---|---|---|
| 3A | 20.0–23.3 | Calm wide shot, slow drift | `Normal calm day in Brightwater Savings lobby, a few customers come and go one at a time, MR. ORTIZ [reference] relaxed and smiling, sunlight through tall windows, peaceful. [STYLE]` |
| 3B | 23.3–26.0 | Sudden whip-pan, then shaky push | `Sudden chaos: the bank doors burst open and a flood of panicking customers rushes the teller windows waving withdrawal slips, MR. ORTIZ [reference] starts sweating, eyes darting, adjusting his glasses nervously. [STYLE]` |
| 3C | 26.0–30.0 | Push into the vault, red light | `Inside the vault the crates of cash empty fast, bundles flying out the door, the last crate is nearly bare, red alarm lights begin pulsing across the steel walls, dramatic low angle. [STYLE]` |

**Captions:** "That works because people" → "don't all withdraw on the **SAME DAY**." → "But if everyone **PANICS** at once," → "the cash **RUNS OUT**." → "That's called a **BANK RUN**."
**On-screen graphic:** a flashing red "⚠ BANK RUN!" stamp at 27.0 s, plus a "CASH IN VAULT" meter draining from green to red.
**SFX:** music switches to tense minor-key ticking, crowd rumble, alarm (subtle), a heavy impact on "BANK RUN".

### SCENE 4: The domino effect (30.0–38.4 s)
| Shot | Time | Camera | Prompt |
|---|---|---|---|
| 4A | 30.0–33.0 | Medium shot, quick cuts | `MR. ORTIZ [reference] hurriedly hands stacks of government bond certificates over a counter to a calm buyer who pays with a much smaller pile of cash, a price tag flips from "100" to "80", red tint, urgency. [STYLE]` |
| 4B | 33.0–35.5 | Slow-motion low angle | `A long row of giant domino tiles shaped like small classical bank buildings, the first one tips and knocks over the next in dramatic slow motion, dust puffs, red and gold light. [STYLE]` |
| 4C | 35.5–38.4 | Aerial pull-back | `Aerial pull-back over the city: lines of worried people start forming outside several other banks down the street, the panic spreading block by block, dramatic clouds. [STYLE]` |

**Captions:** "To pay people back, the bank has to **SELL**" → "its investments **FAST**, sometimes at a **LOSS**." → "And when people at **OTHER BANKS** see the panic," → "they start **RUNNING TOO**."
**SFX:** cash register, a "price drop" glide sound, domino clacks building into a big crash, wind.

### SCENE 5: How America fixed it (38.4–49.9 s)
| Shot | Time | Camera | Prompt |
|---|---|---|---|
| 5A | 38.4–41.9 | Sepia flashback, slow push | `1930s flashback in warm sepia tones: a crowd in hats and coats outside a closed old bank with a "CLOSED" board on the door, a newspaper blows across the sidewalk, cartoon style, melancholic. [STYLE]` |
| 5B | 41.9–45.4 | Transition from sepia to full color | `The sepia scene sweeps into full color as a giant glowing blue shield labeled FDIC rises behind a 1933 government building with columns, light rays, hopeful music moment. [STYLE]` (No official logo: a generic shield with the letters only.) |
| 5C | 45.4–49.9 | Medium shot, gentle orbit | `Present day, MR. ORTIZ [reference] smiles warmly and gestures to a glowing blue shield bubble protecting MAYA's [reference] piggy bank on the counter, coins drop in safely, MAYA relaxes and smiles, soft blue light. [STYLE]` |

**Captions:** "In the 1930s **GREAT DEPRESSION**," → "about **9,000 BANKS** failed." → "So in 1933, America created the FDIC." → "It insures up to **$250,000** per depositor, per bank."
**On-screen text (big):** "FDIC INSURANCE: UP TO $250,000". **Footnote (small):** "per depositor, per insured bank, for each account ownership category".
**SFX:** old-film crackle in the flashback, a whoosh into color, a warm "shield" swell, coin clinks.

### SCENE 6: The payoff (49.9–60.0 s)
| Shot | Time | Camera | Prompt |
|---|---|---|---|
| 6A | 49.9–53.0 | Wide, slow crane up | `The crowd outside Brightwater Savings calms down and disperses, people smile and chat, MR. ORTIZ [reference] waves from the door, golden afternoon sun, peaceful relief. [STYLE]` |
| 6B | 53.0–56.0 | Stylized inset | `A friendly cartoon Federal Reserve building with columns sends a glowing armored truck of cash zooming to Brightwater Savings, sparkles, playful. [STYLE]` |
| 6C | 56.0–60.0 | Close-up, then pull back to a hero pose | `MAYA [reference] looks at her phone, sees her balance safe, grins, gives a confident thumbs-up to camera and points to the screen, golden backlight, energetic ending pose. [STYLE]` |

**Captions:** "Since then, **NO ONE** has lost a **PENNY**" → "of insured money." → "And the Fed can lend banks **EMERGENCY CASH**." → "It's **WORKING**, and it's **PROTECTED**." → "**FOLLOW** for more!"
**End card (last 2 s):** "FOLLOW FOR MORE 🔥" plus a teaser of the next topic.
**SFX:** music resolves to an upbeat major key, a truck zoom, sparkle, a final "ding" on FOLLOW.

---

## 6. Music and sound
- **Music arc:** curious pulse (0–10) → playful bounce (10–20) → tense ticking minor (20–38) → hopeful swell (38–50) → upbeat payoff (50–60). Use CapCut's royalty-free library (search "suspense build" and "upbeat corporate"), or ask me to synthesize an original track the way I did for the previous videos.
- **Levels:** voice on top; music about 12 dB under the voice while he speaks; SFX subtle. Final loudness about -14 LUFS (TikTok/Shorts standard).

---

## 7. Combining everything (least manual work)
**Option A (recommended, least work):** generate the 18 shots (or 6 × 10 s clips) and send them to me. I'll trim them to the timings above, add the narration, music and SFX, burn in the big centered captions with yellow highlights, add the graphics (BANK RUN stamp, cash meter, FDIC card, footnote), and export the final 1080×1920 30 fps MP4.

**Option B (on your iPad with CapCut, free):**
1. New project → import the clips in order (1A … 6C). Set the canvas to 9:16.
2. Trim each clip to the times in section 5. Use "Smooth" or "Pull in" transitions (0.2 s) between scenes only.
3. Audio → import `narration.wav` and align it to 0:00. It's exactly 60.0 s.
4. Text → Auto captions (English) → style: bold sans font, white with black outline, position center-lower (about 60% down, below the faces). Color the CAPS words from `captions.srt` yellow.
5. Add music from CapCut's library at about 15–20% volume, plus SFX from the list.
6. Export: 1080p, 30 fps, high bitrate.

---

## 8. Tools and honest limits
- **Higgsfield is connected to this session**, but the account has **10 credits**. That isn't enough for 18 shots at 1080p. Good models for this package: **Seedance 2.0** (best for character consistency with up to 9 reference images, 9:16, 1080p), **Kling 3.0** (strong motion, start/end frames), **Wan 2.7**.
- **Consistency:** no AI video tool guarantees identical characters across 18 shots. Using the same reference sheets in every shot and generating 2–3 variants per shot gets close.
- **Lip-sync:** this plan keeps the narrator off-screen on purpose. For on-camera speech, use a model with audio-reference lip-sync (Seedance 2.0 / Wan 2.7) and feed it that line's audio clip cut from `narration.wav`.
- **Free fallback:** I can render this script with my code-based 3D pipeline, like the last three videos. Characters there are guaranteed identical, but the style is simpler cartoon 3D and the faces don't lip-sync.
