// Replace files or change this manifest to swap artwork without touching gameplay.
import { MONSTERS } from "../../../shared/monsters.js";
// Sources for the rooms, the monsters and Pip live in artwork/svg; run `npm run art` to re-export.
export const ASSETS = Object.freeze({
  bubbles: { url: "/assets/monsters/bubbles/idle.png" },
  ...Object.fromEntries(
    MONSTERS.map(({ id }) => [
      `${id}-sheet`,
      {
        url: `/assets/monsters/${id}/sheet.png`,
        frames: { frameWidth: 400, frameHeight: 400 },
      },
    ]),
  ),
  pip: {
    url: "/assets/monsters/pip/sheet.png",
    frames: { frameWidth: 460, frameHeight: 500 },
  },
  menu: {
    url: "/assets/props/menu.png",
    frames: { frameWidth: 200, frameHeight: 150 },
  },
  "kitchen-back": { url: "/assets/backgrounds/kitchen-back.png" },
  "kitchen-front": { url: "/assets/backgrounds/kitchen-front.png" },
  "dining-back": { url: "/assets/backgrounds/dining-back.png" },
  "dining-front": { url: "/assets/backgrounds/dining-front.png" },
});
export function preloadAssets(scene) {
  for (const [key, { url, frames }] of Object.entries(ASSETS))
    if (!scene.textures.exists(key))
      frames
        ? scene.load.spritesheet(key, url, frames)
        : scene.load.image(key, url);
}
