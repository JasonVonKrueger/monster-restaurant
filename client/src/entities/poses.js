import Phaser from "phaser";

// Gives a character sprite random blinks and sprite.pose(name). Every sheet uses
// frame 0 for idle and frame 1 for blink; poses are lists of [frame, milliseconds]
// that end back on idle.
export function animateSheet(scene, sprite, poses) {
  let posing = null,
    blinkTimer;
  const show = (frame) => sprite.scene && sprite.setFrame(frame);
  const clearPose = () => posing?.forEach((event) => event.remove(false));
  sprite.pose = (name) => {
    const steps = poses[name];
    if (!steps || !sprite.scene) return;
    clearPose();
    let at = 0;
    posing = steps.map(([frame, ms]) => {
      const event = scene.time.delayedCall(at, () => show(frame));
      at += ms;
      return event;
    });
    posing.push(
      scene.time.delayedCall(at, () => {
        posing = null;
        show(0);
      }),
    );
  };
  const scheduleBlink = () => {
    blinkTimer = scene.time.delayedCall(Phaser.Math.Between(2400, 4800), () => {
      if (!posing) {
        show(1);
        scene.time.delayedCall(130, () => !posing && show(0));
      }
      scheduleBlink();
    });
  };
  scheduleBlink();
  sprite.once("destroy", () => {
    blinkTimer?.remove(false);
    clearPose();
  });
  return sprite;
}
