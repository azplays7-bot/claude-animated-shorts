# Sneaky Business Tricks #2: why fancy menus drop the $ sign (60 s vertical cartoon)

Part 2 of the "Sneaky Business Tricks" series (teased at the end of part 1). Same engine and fast style (a camera change
about every 1.5 s, gags every 3-5 s, information on signs in the world, one-word captions, American narrator am_fenrir,
speed 1.15), set in Tony's world.

**Story.** At MAISON D'OR the steak costs "48", not "$48": not a typo, a trick. Cornell researchers tested three
menus at a restaurant run by a cooking school: prices with a $ sign, prices spelled out in words, and plain numbers.
Diners with the plain numbers spent about $5 more; spelled-out prices didn't help. It was a small study (about 200
diners), but many menu designers now recommend it. The researchers think the $ sign triggers the "pain of paying"
(a grey scene with an alarm bell); no sign, no alarm, just a juicy steak. Tony tries it (CLASSIC 5), but it's one
study, so nobody knows for sure. Part three teaser: candy at the checkout. A hidden $ is still your money.

## Fact check

| Claim | Status |
|---|---|
| Cornell study tested three menu price formats | ✅ Yang, Kimes & Sessarego, *Int. J. of Hospitality Management* 2009 ($ sign, numerals only, written out) |
| At a restaurant run by a cooking school | ✅ The Culinary Institute of America's restaurant in Hyde Park, NY |
| Plain numbers: diners spent about $5 more | ✅ Cornell: about $5.55 more per check on average (~8 %) |
| Spelled-out prices didn't help | ✅ No spending difference between $ sign and written-out formats |
| About 200 diners | ✅ 201 diners (said as "a small study") |
| The $ sign triggers the "pain of paying" | ✅ Said as "the researchers think" (it's their explanation, not proven) |
| Menu designers recommend dropping the $ | ✅ Hedged with "lots of"; widely reported menu-engineering advice |

All places are made up (Tony's Burgers, MAISON D'OR).

Sources: Cornell Chronicle "Diners spend more when menus don't use dollar signs" (2009), Cornell eCommons (Kimes
menu price paper), Phys.org.

## Build

```
cd narration && python make_narration.py <kokoro-v1.0.onnx> <voices-v1.0.bin> && python make_words.py
cd ../audio && python make_audio.py
# toon/src is the Remotion composition (NodShort); render with toon/render.mjs, then:
python3 make_video.py <chunk_dir>
```
