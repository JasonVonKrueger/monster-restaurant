import Phaser from "phaser";

// Gives a character sprite random blinks, sprite.pose(name) and sprite.setRest(frame).
// Poses are lists of [frame, milliseconds] that end back on the resting frame (idle,
// unless changed, e.g. to a sad face). `blinks` maps each resting frame to its blink
// frame, so a sad monster keeps blinking with a sad face.
export function animateSheet(scene, sprite, poses, blinks = { 0: 1 }) {
  let posing = null,
    rest = 0,
    blinkTimer;
  const show = (frame) => sprite.scene && sprite.setFrame(frame);
  const clearPose = () => posing?.forEach((event) => event.remove(false));
  sprite.setRest = (frame) => {
    rest = frame;
    if (!posing) show(rest);
  };
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
        show(rest);
      }),
    );
  };
  const scheduleBlink = () => {
    blinkTimer = scene.time.delayedCall(Phaser.Math.Between(2400, 4800), () => {
      const blink = blinks[rest],
        resting = rest;
      if (!posing && blink !== undefined) {
        show(blink);
        scene.time.delayedCall(
          130,
          () => !posing && rest === resting && show(rest),
        );
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
