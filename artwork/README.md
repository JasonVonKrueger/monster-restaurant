# Artwork

Room backgrounds, food, confetti and other effects are drawn by project code. All sound effects and celebration melodies are original oscillator sequences in `client/src/managers/AudioManager.js`. Spoken guidance uses the browser’s available speech synthesis voices. No external audio samples or copyrighted character voices are bundled.

# Pip, the monster customers, the kitchen and the dining room

The monster customers each have a sheet in `artwork/svg` with fourteen 400 × 400 frames (idle, blink, wave, chomp, happy, sad, sad blink, look left, look right, hold pizza open, hold pizza chewing, hands only, drink, drinking hand only): `bubbles-sheet.svg` (Bubbles redrawn in the outlined style), `mo-sheet.svg`, `fizz-sheet.svg`, `gloop-sheet.svg`, `puff-sheet.svg`, `zuzu-sheet.svg`, `tok-sheet.svg` and `wiggles-sheet.svg`. They are original hand-written SVG. To add a monster, add it to `shared/monsters.js` and draw `<id>-sheet.svg` with the same frame layout. The game and title screen use the sheets.

`artwork/svg/pip-sheet.svg` (Pip the chef, four 460 × 500 frames: idle, blink, wave, happy), `kitchen-back.svg` (wall and stove), `kitchen-front.svg` (the counter, drawn over Pip), `dining-back.svg` (wall, window and neon), `dining-front.svg` (the serving counter, drawn over Bubbles) and `rocket-sheet.svg` (three 160 × 80 flame frames for the rocket that flies past the dining-room window) are original hand-written SVG drawn for this project. Edit them and run `npm run art` to re-export the PNGs under `client/public/assets`. The kitchen's order ticket, oven timer and controls are drawn live by `KitchenScene`.
