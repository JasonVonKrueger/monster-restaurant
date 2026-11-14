import { animateSheet } from "./poses.js";

// Every monster sheet has the same frames: 0 idle, 1 blink, 2 wave, 3 chomp, 4 happy,
// 5 sad, 6 sad blink, 7 look left, 8 look right, 9 hold pizza (open), 10 hold pizza
// (chewing), 11 hands only, 12 drink, 13 drinking hand only.
export const HANDS_FRAME = { pizza: 11, glass: 13 };
const MONSTER_POSES = {
  wave: [
    [2, 220],
    [0, 160],
    [2, 220],
    [0, 160],
    [2, 260],
  ],
  happy: [[4, 900]],
  // Served: mouth open as the pizza comes up, three big chomps, a long drink of water,
  // then a happy face. RestaurantScene.eatAndDrink moves the food in time with it.
  // Frames 9/10 hold the pizza up (mouth open / chewing); 12 holds the glass.
  feast: [
    [3, 450],
    [9, 150],
    [10, 140],
    [9, 260],
    [10, 140],
    [9, 260],
    [10, 140],
    [9, 160],
    [0, 650],
    [12, 800],
    [0, 650],
    [3, 250],
    [4, 1000],
  ],
};

// Height of each monster's open (chomp) mouth in its 400 × 400 sheet frame.
const MOUTH_Y = {
  bubbles: 284,
  mo: 284,
  fizz: 290,
  gloop: 272,
  puff: 288,
  zuzu: 252,
  tok: 282,
  wiggles: 254,
};
// How far below a monster container's centre its mouth is, at container scale 1
// (sheet frames are drawn at 0.8).
export const mouthOffset = (id) => ((MOUTH_Y[id] ?? 284) - 200) * 0.8;

// A glass of water, standing with its base on (x, y). glass.setLevel(0..1) sets
// how full it is.
export function waterGlass(scene, x, y, level = 0.8) {
  const c = scene.add.container(x, y);
  const ink = 0x2b1d3a;
  const H = 50,
    TOP = 19,
    BOTTOM = 14;
  // The glass's inner edge at height h above the base (it widens toward the top).
  const half = (h) => BOTTOM + ((TOP - BOTTOM) * h) / H;
  const water = scene.add.graphics();
  const glass = scene.add.graphics();
  c.add(scene.add.ellipse(3, 2, 2 * BOTTOM + 14, 9, ink, 0.2));
  c.add(water);
  c.add(glass);
  glass.fillStyle(0xffffff, 0.35);
  glass.fillPoints(
    [
      { x: -TOP, y: -H },
      { x: TOP, y: -H },
      { x: BOTTOM, y: 0 },
      { x: -BOTTOM, y: 0 },
    ],
    true,
  );
  glass.lineStyle(3.5, ink);
  glass.strokePoints(
    [
      { x: -TOP, y: -H },
      { x: -BOTTOM, y: 0 },
      { x: BOTTOM, y: 0 },
      { x: TOP, y: -H },
    ],
    false,
  );
  glass.strokeEllipse(0, -H, TOP * 2, 7);
  glass.lineStyle(4, 0xffffff, 0.8);
  glass.lineBetween(-TOP + 7, -H + 8, -BOTTOM + 5, -8);
  c.setLevel = (l) => {
    const h = Math.max(0, Math.min(1, l)) * (H - 6);
    water.clear();
    if (h <= 0) return c;
    water.fillStyle(0x8fd3ee);
    water.fillPoints(
      [
        { x: -half(h) + 2, y: -h },
        { x: half(h) - 2, y: -h },
        { x: BOTTOM - 2, y: -2 },
        { x: -BOTTOM + 2, y: -2 },
      ],
      true,
    );
    water.fillStyle(0xc4ecfa);
    water.fillEllipse(0, -h, half(h) * 2 - 4, 5);
    return c;
  };
  return c.setLevel(level);
}

// A monster customer, centred on (x, y), drawn from its sprite sheet. The container
// gets pose(name), setSad(sad) and hands(frame).
export function monster(scene, x, y, scale = 1, id = "bubbles") {
  const c = scene.add.container(x, y).setScale(scale);
  const sheet = `${id}-sheet`;
  const sprite = scene.add.sprite(0, 0, sheet, 0).setScale(0.8);
  c.add(sprite);
  animateSheet(scene, sprite, MONSTER_POSES, { 0: 1, 5: 6 });
  c.pose = (name) => sprite.pose(name);
  c.setSad = (sad) => sprite.setRest(sad ? 5 : 0);
  // A hands-only frame placed exactly over the monster, to go on top of food it is
  // holding (the food is drawn over the body, the hands over the food).
  c.hands = (frame) =>
    scene.add
      .sprite(c.x, c.y, sheet, frame)
      .setScale(c.scaleX * sprite.scaleX)
      .setVisible(false);
  return c;
}
// Each topping draws one piece centred on (x, y); the stroke is already set to ink.
const TOPPING_ART = {
  strawberry(g, x, y) {
    g.fillStyle(0xe85875);
    g.fillTriangle(x - 12, y - 9, x + 12, y - 9, x, y + 16);
    g.strokeTriangle(x - 12, y - 9, x + 12, y - 9, x, y + 16);
    g.fillStyle(0x7fba70);
    g.fillEllipse(x, y - 10, 20, 8);
  },
  lemon(g, x, y) {
    // A round slice: rind, pale pith and juicy wedges.
    g.fillStyle(0xf5d43a);
    g.fillCircle(x, y, 14);
    g.strokeCircle(x, y, 14);
    g.fillStyle(0xfff6b8);
    g.fillCircle(x, y, 10);
    g.fillStyle(0xffe45c);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      g.beginPath();
      g.slice(x, y, 9, a + 0.12, a + Math.PI / 3 - 0.12);
      g.fillPath();
    }
  },
  cookie(g, x, y) {
    g.fillStyle(0xc68a4e);
    g.fillCircle(x, y, 13);
    g.strokeCircle(x, y, 13);
    g.fillStyle(0x5a3520);
    for (const [cx, cy] of [
      [-5, -4],
      [5, -6],
      [2, 4],
      [-6, 6],
      [7, 3],
    ])
      g.fillCircle(x + cx, y + cy, 2.2);
  },
  banana(g, x, y) {
    // A round banana slice: pale flesh with a ring of seeds in the middle.
    g.fillStyle(0xfff3b0);
    g.fillCircle(x, y, 12);
    g.strokeCircle(x, y, 12);
    g.fillStyle(0xf5e08a);
    g.fillCircle(x, y, 7);
    g.fillStyle(0x8a6a3a);
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI) / 5;
      g.fillCircle(x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5, 1.3);
    }
  },
  grapes(g, x, y) {
    // A little bunch: three, two, one, with a stem.
    g.lineStyle(3, 0x6b8f3a);
    g.lineBetween(x, y - 16, x + 3, y - 22);
    g.lineStyle(2.5, 0x2b1d3a);
    for (const [dx, dy] of [
      [-8, -8],
      [0, -8],
      [8, -8],
      [-4, 0],
      [4, 0],
      [0, 8],
    ]) {
      g.fillStyle(0x9b6bd6);
      g.fillCircle(x + dx, y + dy, 5.5);
      g.strokeCircle(x + dx, y + dy, 5.5);
      g.fillStyle(0xd9c2f5);
      g.fillCircle(x + dx - 2, y + dy - 2, 1.5);
    }
  },
  fish(g, x, y) {
    const tail = [
      { x: x + 9, y },
      { x: x + 19, y: y - 8 },
      { x: x + 19, y: y + 8 },
    ];
    g.fillStyle(0x7fb8e6);
    g.fillPoints(tail, true);
    g.strokePoints(tail, true);
    g.fillEllipse(x - 2, y, 26, 15);
    g.strokeEllipse(x - 2, y, 26, 15);
    g.fillStyle(0x2b1d3a);
    g.fillCircle(x - 9, y - 2, 2);
  },
};
// The pizza on its plate. With { plate: false } it is just the pizza, e.g. lifted
// off the plate to be eaten.
export function pizza(
  scene,
  x,
  y,
  ingredients,
  scale = 1,
  { plate = true } = {},
) {
  const outer = scene.add.container(x, y).setScale(scale);
  const ink = 0x2b1d3a;
  // The plate sits on the counter seen from slightly above: everything lying flat
  // is drawn round inside a container squashed vertically by TILT, and the plate's
  // edge (its thickness) and a soft contact shadow sit just below it.
  const TILT = 0.58;
  const ry = 106 * TILT;
  const c = scene.add.container(0, 0).setScale(1, TILT);
  if (plate) {
    outer.add(scene.add.ellipse(4, 16, 236, ry * 2 + 14, ink, 0.22));
    outer.add(
      scene.add.ellipse(0, 10, 212, ry * 2, 0xd6cde3).setStrokeStyle(4, ink),
    );
    // A round plate, a little larger than the pizza (radius 86), with a rim.
    c.add(scene.add.circle(0, 0, 106, 0xffffff).setStrokeStyle(5, ink));
    c.add(scene.add.circle(0, 4, 92, 0xe4dcee));
    c.add(scene.add.circle(0, 0, 90, 0xf1ecf7));
  }
  outer.add(c);
  if (!ingredients.length) return outer;
  // The crust's own thickness peeks out below its top.
  c.add(scene.add.circle(0, 12, 86, 0xc9944f).setStrokeStyle(4, ink));
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
  // Five pieces of the topping, scattered over the cheese.
  const topping = ingredients.find((id) => TOPPING_ART[id]);
  if (topping)
    for (const [dx, dy] of [
      [-35, -30],
      [28, -30],
      [-5, 16],
      [-38, 35],
      [40, 30],
    ]) {
      const g = scene.add.graphics();
      g.lineStyle(2.5, ink);
      TOPPING_ART[topping](g, dx, dy);
      c.add(g);
    }
  return outer;
}
