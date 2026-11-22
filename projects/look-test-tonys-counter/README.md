# Look test: Tony's counter in the detailed style

A 5-second remake of the Part 5 moment "So Tony added a medium soda. Small $2, medium $3.50, large $4", made to compare our style with the reference video on Drive.

Deliverables:
- `deliverables/look_test_new_style_5s.mp4`: the new shot, 1080x1920, with the Part 5 audio.
- `deliverables/look_test_side_by_side.mp4`: the old Part 5 shot, the new style and the reference, side by side.

What changed (code in `toon/src`, composition `LookTest`):
- **Lighting:** realistic materials with image-based lighting, soft shadows, real floor reflections, ambient occlusion (N8AO), bloom only on lights and screens, ACES tone mapping.
- **Set:** dressed with code-built props: subway tiles with grout, ceiling tiles, pendant lamps, three glowing menu screens, a soda fountain, cup towers, a fryer with baskets and steam, a heat lamp with fries and burgers, a ticket rail, shelves with jars and boxes, posters, a clock, a window with blinds, a door with an exit sign, a fire extinguisher, a register display, cups with price tents, a tray, napkins, straws, a tip jar.
- **Characters:** 3D with constant-width ink outlines, caps with visor and logo, hair tufts, ears, a painted face that blinks and talks, an apron with pocket, a name tag, a pen, a backpack, shoes, and tube arms that move.
- **Facts on screen:** prices are on the menu screen, which highlights each row as it is read.
- **Camera:** slow push-in over the customer's shoulder that tilts up to the menu.
- **Captions:** small white mixed-case words in the lower third.

Render speed: about 6 s per frame on this CPU-only machine, the same as the current episodes. Depth of field is off; with bloom it veiled the frame.
