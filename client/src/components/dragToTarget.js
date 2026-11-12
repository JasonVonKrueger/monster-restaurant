// Drag an object onto a drop zone. Dragging only changes presentation: onDrop asks
// the server, which still decides whether anything happens. If onDrop returns a
// promise, the object waits where it was dropped and goes home only if the answer
// is false (an accepted action redraws the scene anyway). A missed drop returns the
// object home and shows missHint.
export function dragToTarget(
  scene,
  item,
  { target, highlight, onDrop, missHint },
) {
  const home = { x: item.x, y: item.y, scale: item.scaleX };
  let dragging = false,
    overTarget = false,
    returnTween;
  if (!item.input) item.setInteractive({ useHandCursor: true });
  scene.input.setDraggable(item);
  const resetHighlight = () => highlight(false);
  const returnHome = () => {
    if (!item.scene) return;
    item.setDepth(0);
    returnTween = scene.tweens.add({
      targets: item,
      x: home.x,
      y: home.y,
      scale: home.scale,
      duration: 200,
      ease: "Back.out",
    });
  };
  const cancel = () => {
    if (!dragging) return;
    dragging = false;
    overTarget = false;
    resetHighlight();
    returnHome();
  };
  item.on("pointerdown", () => {
    scene.audio.unlock();
    scene.audio.play("tap");
  });
  item.on("dragstart", () => {
    returnTween?.stop();
    dragging = true;
    overTarget = false;
    item.setDepth(25).setScale(home.scale * 1.08);
  });
  item.on("drag", (_pointer, x, y) => {
    if (dragging)
      item.setPosition(
        Math.max(0, Math.min(540, x)),
        Math.max(0, Math.min(800, y)),
      );
  });
  item.on("dragenter", (_pointer, zone) => {
    if (dragging && zone === target) {
      overTarget = true;
      highlight(true);
    }
  });
  item.on("dragleave", (_pointer, zone) => {
    if (zone === target) {
      overTarget = false;
      resetHighlight();
    }
  });
  item.on("drop", (_pointer, zone) => {
    if (!dragging || zone !== target) return;
    dragging = false;
    overTarget = false;
    resetHighlight();
    const answer = onDrop();
    if (answer?.then) answer.then((accepted) => !accepted && returnHome());
    else returnHome();
  });
  item.on("dragend", () => {
    if (!dragging) return;
    const missed = !overTarget;
    cancel();
    if (missed) scene.hint(missHint);
  });
  scene.input.on("gameout", cancel);
  scene.game.events.on("blur", cancel);
  item.once("destroy", () => {
    dragging = false;
    returnTween?.stop();
    scene.input.off("gameout", cancel);
    scene.game.events.off("blur", cancel);
  });
}
