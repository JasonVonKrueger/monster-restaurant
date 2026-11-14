import Phaser from "phaser";
import { animateSheet } from "./poses.js";

// Pip's sprite sheet frames: 0 idle, 1 blink, 2 wave, 3 happy.
const POSES = {
  wave: [
    [2, 220],
    [0, 160],
    [2, 220],
    [0, 160],
    [2, 260],
  ],
  happy: [[3, 900]],
};

// Pip the chef, standing with feet at (x, y). The counter is drawn over the lower body.
// Returns a sprite with pose(name).
export function chef(scene, x, y, { scale = 0.6, onTap } = {}) {
  const sprite = scene.add
    .sprite(x, y, "pip", 0)
    .setOrigin(0.5, 0.95)
    .setScale(scale);
  if (onTap)
    // Frame-local box around the hat and body, stopping at the counter edge.
    sprite
      .setInteractive({
        hitArea: new Phaser.Geom.Rectangle(100, 20, 260, 388),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      })
      .on("pointerdown", onTap);
  return animateSheet(scene, sprite, POSES);
}
