import Phaser from "phaser";
export function pulse(scene, target) {
  return scene.tweens.add({
    targets: target,
    alpha: 0.65,
    duration: 650,
    yoyo: true,
    repeat: -1,
  });
}
export function wiggle(scene, target) {
  if (!target) return;
  return scene.tweens.add({
    targets: target,
    angle: { from: -7, to: 7 },
    duration: 140,
    yoyo: true,
    repeat: 2,
    onComplete: () => target.setAngle(0),
  });
}
export function burst(
  scene,
  { x = 270, y = 440, kind = "sparkles", count = 12 } = {},
) {
  const colors = [0xffd66b, 0xfa8da9, 0x9bd8bf, 0xb78bdd, 0xffffff];
  for (let i = 0; i < count; i++) {
    const color = colors[i % colors.length];
    let item;
    if (kind === "hearts")
      item = scene.add
        .text(x + Phaser.Math.Between(-80, 80), y, "♥", {
          fontFamily: "Arial",
          fontSize: `${Phaser.Math.Between(28, 44)}px`,
          color: i % 2 ? "#f374a2" : "#ffb0ca",
        })
        .setOrigin(0.5);
    else if (kind === "bubbles")
      item = scene.add
        .circle(x, y, Phaser.Math.Between(10, 22), 0xffffff, 0.25)
        .setStrokeStyle(2, 0xffffff, 0.85);
    else if (kind === "confetti")
      item = scene.add.rectangle(x, y, 9, 18, color);
    else item = scene.add.star(x, y, 5, 4, 12, color);
    item.setDepth(20);
    scene.tweens.add({
      targets: item,
      x: Phaser.Math.Between(45, 495),
      y:
        kind === "hearts"
          ? Phaser.Math.Between(120, 270)
          : Phaser.Math.Between(150, 620),
      angle: kind === "hearts" ? Phaser.Math.Between(-25, 25) : 180,
      alpha: 0,
      duration: kind === "hearts" ? 1600 : 1000,
      ease: "Sine.out",
      onComplete: () => item.destroy(),
    });
  }
}
export function reaction(scene, target, variant = 0) {
  if (!target) return;
  const scale = target.scaleX;
  if (variant === 0)
    scene.tweens.add({
      targets: target,
      scaleX: scale * 1.24,
      scaleY: scale * 1.2,
      duration: 350,
      yoyo: true,
      repeat: 1,
      ease: "Sine.inOut",
    });
  else if (variant === 1)
    scene.tweens.add({
      targets: target,
      angle: 360,
      duration: 900,
      ease: "Back.out",
      onComplete: () => target.setAngle(0),
    });
  else
    scene.tweens.add({
      targets: target,
      angle: { from: -12, to: 12 },
      scaleY: scale * 0.85,
      duration: 150,
      yoyo: true,
      repeat: 4,
      onComplete: () => target.setAngle(0).setScale(scale),
    });
  burst(scene, { kind: "confetti", count: 24 });
}
