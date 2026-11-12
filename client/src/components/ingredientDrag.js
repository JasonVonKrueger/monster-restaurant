// Dragging only changes presentation. The server still decides whether a drop
// adds this ingredient to this particular order.
export function ingredientDrag(
  scene,
  tile,
  { ingredientId, orderId, target, highlight },
) {
  const home = { x: tile.x, y: tile.y };
  let dragging = false,
    overTarget = false,
    returnTween;
  scene.input.setDraggable(tile);
  const resetHighlight = () => highlight(false);
  const returnHome = () => {
    if (!tile.scene) return;
    tile.setDepth(0);
    returnTween = scene.tweens.add({
      targets: tile,
      x: home.x,
      y: home.y,
      scale: 1,
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
  tile.on("pointerdown", () => {
    scene.audio.unlock();
    scene.audio.play("tap");
  });
  tile.on("dragstart", () => {
    returnTween?.stop();
    dragging = true;
    overTarget = false;
    tile.setDepth(25).setScale(1.08);
  });
  tile.on("drag", (_pointer, x, y) => {
    if (dragging)
      tile.setPosition(
        Math.max(0, Math.min(540, x)),
        Math.max(0, Math.min(800, y)),
      );
  });
  tile.on("dragenter", (_pointer, zone) => {
    if (dragging && zone === target) {
      overTarget = true;
      highlight(true);
    }
  });
  tile.on("dragleave", (_pointer, zone) => {
    if (zone === target) {
      overTarget = false;
      resetHighlight();
    }
  });
  tile.on("drop", (_pointer, zone) => {
    if (!dragging || zone !== target) return;
    // Capture the order from drag creation, not whichever order happens to be
    // current when a delayed pointer event arrives.
    dragging = false;
    overTarget = false;
    resetHighlight();
    returnHome();
    scene.act("ADD_INGREDIENT", { ingredientId, orderId });
  });
  tile.on("dragend", () => {
    if (!dragging) return;
    const missed = !overTarget;
    cancel();
    if (missed)
      scene.hint("Drag the ingredient onto the pizza. Let’s try again!");
  });
  scene.input.on("gameout", cancel);
  scene.game.events.on("blur", cancel);
  tile.once("destroy", () => {
    dragging = false;
    returnTween?.stop();
    scene.input.off("gameout", cancel);
    scene.game.events.off("blur", cancel);
  });
}
