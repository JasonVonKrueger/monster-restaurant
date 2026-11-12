export function backdrop(scene, role) {
  const kitchen = role === "kitchen",
    g = scene.add.graphics();
  scene.cameras.main.setBackgroundColor(kitchen ? "#e7f4eb" : "#f8e9d9");
  g.fillStyle(kitchen ? 0xd4eadf : 0xefdcf4);
  g.fillRoundedRect(18, 18, 504, 764, 36);
  // Wallpaper, a sunny window, and a warm checked floor.
  if (kitchen) {
    for (let x = 22; x < 520; x += 62)
      for (let y = 150; y < 600; y += 62) {
        g.lineStyle(2, 0xffffff, 0.45);
        g.strokeRoundedRect(x, y, 60, 60, 8);
      }
  } else
    for (let x = 24; x < 520; x += 48) {
      g.fillStyle(0xffffff, 0.2);
      g.fillRect(x, 130, 20, 460);
    }
  g.fillStyle(0xffefce);
  g.fillRoundedRect(18, 594, 504, 188, 36);
  for (let x = 24; x < 520; x += 62)
    for (let y = 602; y < 770; y += 62) {
      if ((Math.floor(x / 62) + Math.floor(y / 62)) % 2) {
        g.fillStyle(0xebbd93, 0.3);
        g.fillRoundedRect(x, y, 60, 60, 8);
      }
    }
  g.fillStyle(0xfffbef);
  g.fillRoundedRect(28, 24, 484, 96, 28);
  if (!kitchen) {
    g.fillStyle(0xffffff);
    g.fillRoundedRect(350, 204, 130, 176, 28);
    g.fillStyle(0xbfe4e9);
    g.fillRoundedRect(361, 215, 108, 152, 19);
    g.fillStyle(0xffdc7b);
    g.fillCircle(439, 244, 19);
    g.lineStyle(7, 0xffffff);
    g.lineBetween(415, 215, 415, 367);
    g.lineBetween(361, 292, 469, 292);
    g.fillStyle(0xb991cf);
    g.fillRoundedRect(344, 370, 142, 14, 7);
  }
  // Paper bunting leaves the recipe and controls clear.
  for (let i = 0; i < 7; i++) {
    g.fillStyle([0xf4a0ad, 0xffd985, 0x98c9b4][i % 3]);
    g.fillTriangle(44 + i * 70, 161, 82 + i * 70, 161, 63 + i * 70, 183);
  }
  return g;
}
