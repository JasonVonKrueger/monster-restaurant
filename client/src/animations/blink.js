import Phaser from "phaser";

// Eyelids belong to the character container, so only the eyes move when blinking.
// Eye coordinates are local to the artwork, independent of scene position/scale.
export function blink(scene, target, eyes) {
  const lids = scene.add.graphics();
  target.add(lids);
  const state = { closed: 0 };
  let timer, tween;
  const draw = () => {
    lids.clear();
    if (state.closed <= 0) return;
    for (const eye of eyes) {
      const { x, y, rx, ry, color, rotation = 0 } = eye;
      const point = (dx, dy) => ({
        x: x + dx * Math.cos(rotation) - dy * Math.sin(rotation),
        y: y + dx * Math.sin(rotation) + dy * Math.cos(rotation),
      });
      const angle = Math.asin(1 - state.closed);
      lids.fillStyle(color);
      // Upper and lower elliptical caps meet over the pupils, then reopen.
      for (const [start, end] of [
        [Math.PI + angle, 2 * Math.PI - angle],
        [angle, Math.PI - angle],
      ]) {
        const points = Array.from({ length: 25 }, (_, i) => {
          const a = start + ((end - start) * i) / 24;
          return point(rx * Math.cos(a), ry * Math.sin(a));
        });
        lids.fillPoints(points, true);
      }
      if (state.closed > 0.85) {
        const edge = rx * 0.9;
        const points = Array.from({ length: 17 }, (_, i) => {
          const dx = -edge + (2 * edge * i) / 16;
          return point(dx, 3 * (1 - (dx / edge) ** 2));
        });
        lids.lineStyle(2, 0x77369e, (state.closed - 0.85) / 0.15);
        lids.strokePoints(points, false);
      }
    }
  };
  const schedule = () => {
    timer = scene.time.delayedCall(Phaser.Math.Between(2400, 4800), () => {
      tween = scene.tweens.add({
        targets: state,
        closed: 1,
        duration: 100,
        hold: 60,
        yoyo: true,
        ease: "Sine.inOut",
        onUpdate: draw,
        onComplete: () => {
          lids.clear();
          schedule();
        },
      });
    });
  };
  schedule();
  target.once("destroy", () => {
    timer?.remove();
    tween?.stop();
  });
}
