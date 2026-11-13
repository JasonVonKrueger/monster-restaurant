import { blink } from "../animations/blink.js";
import { animateSheet } from "./poses.js";

// Every monster sheet has the same frames: 0 idle, 1 blink, 2 wave, 3 chomp, 4 happy, 5 sad.
const MONSTER_POSES = {
  wave: [
    [2, 220],
    [0, 160],
    [2, 220],
    [0, 160],
    [2, 260],
  ],
  happy: [[4, 900]],
  eat: [
    [3, 160],
    [0, 140],
    [3, 160],
    [0, 140],
    [3, 160],
    [4, 900],
  ],
};

// A monster customer, centred on (x, y). The container gets pose(name) and
// setSad(sad); they do nothing on the older single-image and procedural fallbacks.
export function monster(scene, x, y, scale = 1, id = "bubbles") {
  const c = scene.add.container(x, y).setScale(scale);
  c.pose = () => {};
  c.setSad = () => {};
  const sheet = [`${id}-sheet`, "bubbles-sheet"].find((key) =>
    scene.textures.exists(key),
  );
  if (sheet) {
    const sprite = scene.add.sprite(0, 0, sheet, 0).setScale(0.8);
    c.add(sprite);
    animateSheet(scene, sprite, MONSTER_POSES);
    c.pose = (name) => sprite.pose(name);
    c.setSad = (sad) => sprite.setRest(sad ? 5 : 0);
    return c;
  }
  if (scene.textures.exists("bubbles")) {
    const image = scene.add.image(0, -8, "bubbles");
    image.setScale(250 / image.width);
    c.add(image);
    const unit = 250 / image.width;
    blink(scene, c, [
      {
        x: (493 - image.width / 2) * unit,
        y: (473 - image.height / 2) * unit - 8,
        rx: 157 * unit,
        ry: 161 * unit,
        rotation: 0.18,
        color: 0xbc63e9,
      },
      {
        x: (842 - image.width / 2) * unit,
        y: (477 - image.height / 2) * unit - 8,
        rx: 157 * unit,
        ry: 161 * unit,
        rotation: -0.18,
        color: 0xb35be3,
      },
    ]);
    return c;
  }
  const g = scene.add.graphics();
  g.fillStyle(0x9a68c4);
  g.fillRoundedRect(-100, -100, 200, 205, 80);
  g.fillEllipse(-100, 25, 48, 70);
  g.fillEllipse(100, 25, 48, 70);
  g.fillEllipse(-50, 105, 60, 35);
  g.fillEllipse(50, 105, 60, 35);
  g.fillStyle(0xffd77f);
  g.fillTriangle(-80, -80, -75, -140, -35, -95);
  g.fillTriangle(80, -80, 75, -140, 35, -95);
  c.add(g);
  for (const dx of [-43, 43]) {
    c.add(scene.add.ellipse(dx, -35, 65, 80, 0xffffff));
    c.add(scene.add.ellipse(dx + 5, -28, 28, 38, 0x403252));
    c.add(scene.add.circle(dx + 10, -36, 6, 0xffffff));
    c.add(scene.add.ellipse(dx * 1.6, 23, 25, 15, 0xf4a5cf));
  }
  c.add(scene.add.ellipse(0, 50, 62, 46, 0x51335e));
  c.add(scene.add.ellipse(0, 63, 35, 16, 0xf0a0ba));
  blink(
    scene,
    c,
    [-43, 43].map((x) => ({ x, y: -35, rx: 33, ry: 40, color: 0x9a68c4 })),
  );
  return c;
}
export function pizza(scene, x, y, ingredients, scale = 1) {
  const c = scene.add.container(x, y).setScale(scale);
  const ink = 0x2b1d3a;
  c.add(scene.add.ellipse(0, 10, 215, 160, 0xffffff).setStrokeStyle(4, ink));
  if (!ingredients.length) return c;
  c.add(scene.add.circle(0, 0, 86, 0xeabf7d).setStrokeStyle(4, ink));
  c.add(
    scene.add.circle(
      0,
      0,
      76,
      ingredients.includes("sauce") ? 0xe87564 : 0xf9dfa5,
    ),
  );
  if (ingredients.includes("cheese"))
    c.add(scene.add.circle(0, 0, 65, 0xffdc72));
  if (ingredients.includes("strawberry"))
    for (const [dx, dy] of [
      [-35, -30],
      [28, -30],
      [-5, 16],
      [-38, 35],
      [40, 30],
    ]) {
      const berry = scene.add.graphics();
      berry.fillStyle(0xe85875);
      berry.fillTriangle(dx - 12, dy - 9, dx + 12, dy - 9, dx, dy + 16);
      berry.lineStyle(2.5, ink);
      berry.strokeTriangle(dx - 12, dy - 9, dx + 12, dy - 9, dx, dy + 16);
      berry.fillStyle(0x7fba70);
      berry.fillEllipse(dx, dy - 10, 20, 8);
      c.add(berry);
    }
  return c;
}
