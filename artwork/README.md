# Bubbles artwork

`client/public/assets/monsters/bubbles/idle.png` is a new, project-bound image created with the built-in image generation tool for Phase 3. It is a 1312 × 1199 RGBA PNG with a transparent background. The original generated file was copied into the workspace without editing its pixels. No third-party character or reference artwork was used.

The game loads the file through `client/src/data/assets.js` and keeps the procedural monster as a fallback if loading fails. Replace the image at the same path or change the manifest to use future production artwork. The generated character is also used on the title screen. Current animations are Phaser transformations of the static sprite; sprite sheets can be added later.

Final prompt (built-in tool; `transparent_background: true`):

> Use case: illustration-story. Asset type: transparent character sprite for the Phaser preschool mobile game Monster Restaurant. Primary request: Bubbles, an adorable round purple hungry monster, full body front view, enormous expressive white eyes with dark pupils, tiny soft yellow horns, short rounded arms and feet, pink cheek spots, delighted friendly open smile with little pink tongue. Style: polished 2D children's mobile game illustration, clean rounded silhouette, bright lavender and purple, soft cel shading and subtle highlights, chunky friendly proportions, smooth clean edges, readable at 200 pixels tall. Composition: one single centered isolated character with generous transparent padding, upright neutral pose with arms slightly out, whole feet and horns fully visible. No background, floor, cast shadow, props, lettering, text, watermark, extra characters or scary teeth. Genuine transparent background.

Room backgrounds, food, confetti and other effects are drawn by project code. All sound effects and celebration melodies are original oscillator sequences in `client/src/managers/AudioManager.js`. Spoken guidance uses the browser’s available speech synthesis voices. No external audio samples or copyrighted character voices are bundled.

# Pip, the monster customers, the kitchen and the dining room

The five monster customers each have a sheet in `artwork/svg` with five 400 × 400 frames (idle, blink, wave, chomp, happy): `bubbles-sheet.svg` (Bubbles redrawn in the outlined style), `mo-sheet.svg`, `fizz-sheet.svg`, `gloop-sheet.svg` and `puff-sheet.svg`. They are original hand-written SVG. To add a monster, add it to `shared/monsters.js` and draw `<id>-sheet.svg` with the same frame layout. The game and title screen use the sheets; `idle.png` above remains as a fallback if the sheet fails to load.

`artwork/svg/pip-sheet.svg` (Pip the chef, four 460 × 500 frames: idle, blink, wave, happy), `kitchen-back.svg` (wall and stove), `kitchen-front.svg` (the counter, drawn over Pip), `dining-back.svg` (wall, window and neon) and `dining-front.svg` (the serving counter, drawn over Bubbles) are original hand-written SVG drawn for this project. Edit them and run `npm run art` to re-export the PNGs under `client/public/assets`. The kitchen's order ticket, oven timer and controls are drawn live by `KitchenScene`.
