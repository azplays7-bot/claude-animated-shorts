# The Great Stink of 1858 (London)

A 60 s vertical short in the detailed style, rendered at 60 fps for smoother motion. Narration: Kokoro `am_fenrir`, speed 1.15.

Smoothness work:
- 60 fps.
- Keyframed poses that ease over 0.4 s instead of snapping.
- Eased camera paths with no shake.
- Captions that fade and scale in.
- Arms and props kept outside bodies (`look/char.ts`).
- An overlap check that warns when characters, obstacles or the camera intersect.

| Claim | Source |
|---|---|
| Summer 1858 heat made the sewage-filled Thames stink: the "Great Stink" | London Museum, Wikipedia, History.co.uk |
| Toilets and drains emptied into the Thames | London Museum, Historic England |
| Parliament, beside the river, was badly affected; curtains were treated with chloride of lime | London Museum, Historic UK |
| Many believed disease spread through bad smells ("miasma") | London Museum |
| John Snow had linked cholera to contaminated water (1854); his idea was not widely accepted then | Wikipedia |
| Sewer bill introduced 15 July and law by 2 August 1858 (about 18 days) | History.co.uk, HowStuffWorks |
| Bazalgette's intercepting sewers carried waste east, plus about 1,100 miles of street sewers | History.co.uk, ICE |
| The new sewers were hidden under new Thames embankments | Historic England, London Museum |
| Much of the system is still in use | ICE, Science Museum |

Unconfirmed details (the Disraeli quote, a plan to move Parliament) are left out.

Code: `toon/src/stink` (composition `StinkShort`, 60 fps) plus the shared `toon/src/look`. Audio: `audio/make_audio.py`. Narration: `narration/`.
