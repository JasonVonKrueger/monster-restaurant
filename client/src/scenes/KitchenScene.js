import Phaser from "phaser";
import { RestaurantScene, INK } from "./RestaurantScene.js";
import { pizza } from "../entities/art.js";
import { chef } from "../entities/chef.js";
import { pulse } from "../animations/effects.js";
import { dragToTarget } from "../components/dragToTarget.js";
import { INGREDIENTS, COOK_MS } from "../../../shared/recipes.js";
import { monsterName } from "../../../shared/monsters.js";

// Layout over the kitchen art: header and status sign at the top, Pip at the stove
// between the oven timer and the order ticket, and the work counter from y=430 down.
const PREP = { x: 270, y: 515, scale: 0.72 };
// One long two-row tray holds the ingredients, filling the counter below the pizza.
// It shows cols × rows at a time; with more ingredients, arrows page through them.
const TRAY = {
  x: 20,
  top: 598,
  width: 500,
  height: 192,
  cols: 6,
  rows: 2,
  arrow: 40,
};
TRAY.perPage = TRAY.cols * TRAY.rows;
TRAY.y = TRAY.top + TRAY.height / 2;
const TRAY_IDS = Object.keys(INGREDIENTS);
// The wall timer shows baking progress; the oven's window is on the stove's left door
// (kitchen-back.svg). OVEN is the window's centre and size; the drop area is larger.
const TIMER = { x: 62, y: 236, r: 30 };
const OVEN = { x: 128, y: 383, w: 128, h: 66 };
const OVEN_DROP = { w: 240, h: 180 };
const LOBBY_BUTTON_Y = 735;

export class KitchenScene extends RestaurantScene {
  constructor() {
    super("kitchen", "kitchen");
    this.prepAt = PREP;
    this.trayPage = 0;
  }
  // Where ingredient i sits on the tray, or the tray's middle if it is on another page.
  tileAt(i) {
    const paged = TRAY_IDS.length > TRAY.perPage;
    const inset = paged ? TRAY.arrow : 0;
    const slot = (TRAY.width - 2 * inset) / TRAY.cols;
    const rowHeight = (TRAY.height - 20) / TRAY.rows;
    const page = Math.floor(i / TRAY.perPage),
      onPage = i % TRAY.perPage;
    if (page !== this.trayPage) return { x: 270, y: TRAY.y, visible: false };
    return {
      x: TRAY.x + inset + slot * ((onPage % TRAY.cols) + 0.5),
      y: TRAY.top + 10 + rowHeight * (Math.floor(onPage / TRAY.cols) + 0.5),
      visible: true,
    };
  }
  create() {
    this.input.dragDistanceThreshold = 8;
    super.create();
  }
  drawBackdrop(snapshot) {
    const order = snapshot.game?.order;
    this.add.image(270, 400, "kitchen-back");
    this.ovenTimer(order);
    this.ticket(order);
    this.chef = chef(this, 270, 470, {
      onTap: () => {
        this.audio.unlock();
        this.effect({ type: "BOUNCE" });
      },
    });
    this.add.image(270, 400, "kitchen-front");
    this.headerPanel();
  }
  // The wall timer shows the bake: the needle sweeps and the face fills while the
  // pizza is in the oven, paced by the server clock.
  ovenTimer(order) {
    const { x, y, r } = TIMER,
      half = r + 8;
    const g = this.add.graphics();
    g.fillStyle(0x9aa6bc);
    g.fillRoundedRect(x - half, y - half, half * 2, half * 2, 14);
    g.lineStyle(4, INK);
    g.strokeRoundedRect(x - half, y - half, half * 2, half * 2, 14);
    g.fillStyle(0xf7f4fb);
    g.fillCircle(x, y, r);
    g.strokeCircle(x, y, r);
    g.lineStyle(3, 0xc9bde0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.lineBetween(
        x + Math.cos(a) * (r - 8),
        y + Math.sin(a) * (r - 8),
        x + Math.cos(a) * (r - 3),
        y + Math.sin(a) * (r - 3),
      );
    }
    const fill = this.add.graphics();
    const needle = this.add
      .rectangle(x, y, 4, r - 6, 0xff4d6d)
      .setOrigin(0.5, 1);
    this.add.circle(x, y, 5, INK);
    this.add.text(x, y + 12, "🔥", { fontSize: "12px" }).setOrigin(0.5);
    const draw = (t) => {
      fill.clear();
      if (t > 0) {
        fill.fillStyle(0xffa64d, 0.85);
        fill.slice(x, y, r - 3, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
        fill.fillPath();
      }
      needle.setRotation(t * Math.PI * 2);
    };
    if (order?.status === "COOKING") {
      // cookEndsAt is server time; clamping keeps small clock differences harmless.
      const remaining = Phaser.Math.Clamp(
        order.cookEndsAt - Date.now(),
        0,
        COOK_MS,
      );
      const progress = { t: 1 - remaining / COOK_MS };
      draw(progress.t);
      this.tweens.add({
        targets: progress,
        t: 1,
        duration: remaining,
        onUpdate: () => draw(progress.t),
      });
    } else draw(order?.status === "READY_TO_DELIVER" ? 1 : 0);
  }
  // The order ticket lists the recipe, ticking off what is on the pizza.
  ticket(order) {
    const c = this.add.container(470, 182).setRotation(0.05);
    const g = this.add.graphics();
    const points = [
      { x: -44, y: 0 },
      { x: 44, y: 0 },
      { x: 44, y: 148 },
    ];
    for (let i = 7; i >= 0; i--)
      points.push({ x: -44 + i * 11, y: i % 2 ? 140 : 148 });
    g.fillStyle(0xfff7dc);
    g.fillPoints(points, true);
    g.lineStyle(3, INK);
    g.strokePoints(points, true);
    g.fillStyle(0xff5d73);
    g.fillCircle(0, 6, 6);
    g.strokeCircle(0, 6, 6);
    c.add(g);
    // A sad sticker when the customer has waited too long.
    if (this.patience(order)) {
      const sticker = this.add
        // Just below the ticket, clear of the sign at the top.
        .text(0, 182, "😟", { fontSize: "40px" })
        .setOrigin(0.5);
      c.add(sticker);
      this.tweens.add({
        targets: sticker,
        angle: { from: -10, to: 10 },
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    }
    const added = order?.addedIngredients || [];
    const next = order?.requiredIngredients[added.length];
    (order?.requiredIngredients || []).forEach((id, i) => {
      const done = added.includes(id);
      const row = this.add
        .text(-12, 34 + i * 30, INGREDIENTS[id].icon, { fontSize: "24px" })
        .setOrigin(0.5)
        .setAlpha(done || id === next ? 1 : 0.45);
      c.add(row);
      if (done)
        c.add(
          this.add
            .text(22, 34 + i * 30, "✓", {
              fontFamily: "Trebuchet MS",
              fontSize: "24px",
              fontStyle: "bold",
              color: "#3f9a5c",
            })
            .setOrigin(0.5),
        );
    });
  }
  lobby(_snapshot, online) {
    this.plaque(270, 152, "Let’s open our restaurant!", 24);
    this.prepDish = pizza(this, PREP.x, PREP.y, [], PREP.scale);
    this.plaque(270, 640, "🛎️ Your friend opens the doors", 22);
    this.button(
      270,
      LOBBY_BUTTON_Y,
      370,
      "✨ Bounce together",
      () => this.act("BOUNCE"),
      {
        active: online,
      },
    );
  }
  tray(order, { canPrepare, preparing, next, target }) {
    const pages = Math.ceil(TRAY_IDS.length / TRAY.perPage);
    // Open on the page holding the next ingredient whenever it changes.
    if (next !== this.trayNext) {
      this.trayNext = next;
      const i = TRAY_IDS.indexOf(next);
      if (i >= 0) this.trayPage = Math.floor(i / TRAY.perPage);
    }
    this.trayPage = Phaser.Math.Clamp(this.trayPage, 0, pages - 1);
    const { x, y, top, width, height } = TRAY;
    const g = this.add.graphics();
    g.fillStyle(INK, 0.35);
    g.fillRoundedRect(x + 4, top + 8, width, height, 26);
    g.fillStyle(0xf6e7cf);
    g.fillRoundedRect(x, top, width, height, 26);
    g.lineStyle(4, INK);
    g.strokeRoundedRect(x, top, width, height, 26);
    g.fillStyle(0xecd6b4);
    g.fillRoundedRect(x + 10, top + 10, width - 20, height - 20, 18);
    TRAY_IDS.forEach((id, i) => {
      const spot = this.tileAt(i);
      if (!spot.visible) return;
      g.fillStyle(0xe0c49a);
      g.fillEllipse(spot.x, spot.y + 22, 56, 16);
      const added = order.addedIngredients.includes(id);
      if (preparing && id === next) {
        const glow = this.add.circle(spot.x, spot.y, 36, 0xfff2a8, 0.9);
        this.tweens.add({
          targets: glow,
          scale: 1.15,
          alpha: 0.5,
          duration: 650,
          yoyo: true,
          repeat: -1,
        });
      }
      // Just the ingredient: no tile behind it. The drag area is a little larger
      // than the picture so small fingers can grab it.
      const item = this.add
        .text(spot.x, spot.y, INGREDIENTS[id].icon, { fontSize: "46px" })
        .setOrigin(0.5)
        .setAlpha(added ? 0.3 : 1);
      if (preparing && id === next) this.guideTarget = item;
      if (!canPrepare || added) return;
      item.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(
          -14,
          -12,
          item.width + 28,
          item.height + 24,
        ),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });
      dragToTarget(this, item, {
        target,
        // No ring around the pizza: it grows a little while an ingredient is over it.
        highlight: (over) =>
          this.prepDish?.scene &&
          this.tweens.add({
            targets: this.prepDish,
            scale: over ? PREP.scale * 1.08 : PREP.scale,
            duration: 120,
          }),
        // Capture this order's id now, not whichever order is current when a
        // delayed pointer event arrives.
        onDrop: () =>
          this.act("ADD_INGREDIENT", { ingredientId: id, orderId: order.id }),
        missHint: "Drag the ingredient onto the pizza. Let’s try again!",
      });
    });
    if (pages > 1)
      for (const [dir, ax, label] of [
        [-1, x + TRAY.arrow / 2 + 4, "◀"],
        [1, x + width - TRAY.arrow / 2 - 4, "▶"],
      ]) {
        const enabled = this.trayPage + dir >= 0 && this.trayPage + dir < pages;
        const arrow = this.add
          .text(ax, y, label, { fontSize: "26px", color: "#5b416e" })
          .setOrigin(0.5)
          .setAlpha(enabled ? 1 : 0.25);
        if (enabled)
          arrow
            .setInteractive({
              hitArea: new Phaser.Geom.Rectangle(
                -10,
                -24,
                arrow.width + 20,
                arrow.height + 48,
              ),
              hitAreaCallback: Phaser.Geom.Rectangle.Contains,
              useHandCursor: true,
            })
            .on("pointerdown", () => {
              this.audio.unlock();
              this.audio.play("tap");
              this.trayPage += dir;
              this.paint();
            });
      }
  }
  kitchen(order, online) {
    const status = order.status,
      preparing = ["ORDER_SENT", "PREPARING"].includes(status);
    const next = order.requiredIngredients[order.addedIngredients.length];
    const hints = {
      CUSTOMER_ARRIVED: `🛎️ Your friend is welcoming ${monsterName(order.monsterId)}`,
      CUSTOMER_SEATED: `📖 Your friend is giving ${monsterName(order.monsterId)} the menu`,
      READING_MENU: `📖 ${monsterName(order.monsterId)} is reading the menu…`,
      READY_TO_ORDER: "🛎️ Here comes your order…",
      ORDER_SENT: "Drag the glowing ingredient to the pizza!",
      PREPARING: next
        ? "Drag the glowing ingredient to the pizza!"
        : "🔥 Drag the pizza into the oven!",
      COOKING: "🔥 Baking… watch the timer!",
      READY_TO_DELIVER: "✨ Tap the pizza to send it!",
      DELIVERED: "🛎️ Your friend is serving!",
      COMPLETE: "🎉 Great teamwork! +3 ⭐ +5 🪙",
    };
    this.plaque(270, 152, hints[status], 21);
    // The pizza goes into the oven on its plate, and both are gone once it has been
    // sent; a fresh plate is set out for the next customer.
    const away = ["COOKING", "DELIVERED", "COMPLETE"].includes(status);
    this.prepDish = away
      ? null
      : pizza(this, PREP.x, PREP.y, order.addedIngredients, PREP.scale);
    if (status === "PREPARING" && !next && online) this.readyForOven();
    if (status === "COOKING") this.ovenGlow();
    if (status === "READY_TO_DELIVER") this.servePizza(order, online);
    const canPrepare = online && preparing && Boolean(next);
    let target;
    if (canPrepare) {
      target = this.add
        .zone(PREP.x, PREP.y, 380, 150)
        .setRectangleDropZone(380, 150);
    }
    this.tray(order, { canPrepare, preparing, next, target });
  }
  // Every ingredient is on: the pizza glows and the oven window shows a soft preheat
  // light. Dragging the pizza into the oven bakes it and starts the timer.
  readyForOven() {
    const dish = this.prepDish;
    const preheat = this.add
      .rectangle(OVEN.x, OVEN.y, OVEN.w, OVEN.h, 0xff9a3c, 0.35)
      .setStrokeStyle(3, INK);
    this.tweens.add({
      targets: preheat,
      alpha: 0.6,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
    const target = this.add
      .zone(OVEN.x, OVEN.y, OVEN_DROP.w, OVEN_DROP.h)
      .setRectangleDropZone(OVEN_DROP.w, OVEN_DROP.h);
    pulse(this, dish);
    this.guideTarget = dish;
    dish.setSize(212, 212);
    dragToTarget(this, dish, {
      target,
      // The oven window brightens while the pizza is over it.
      highlight: (over) => preheat.setFillStyle(0xff9a3c, over ? 1 : 0.35),
      onDrop: () => this.act("COOK"),
      missHint: "Drag the pizza into the oven!",
    });
  }
  // A warm, flickering glow in the oven door's window while the pizza bakes.
  ovenGlow() {
    const glow = this.add
      .rectangle(OVEN.x, OVEN.y, OVEN.w, OVEN.h, 0xff9a3c, 0.85)
      .setStrokeStyle(3, INK);
    this.tweens.add({
      targets: glow,
      alpha: 0.45,
      duration: 300,
      yoyo: true,
      repeat: -1,
    });
    this.add
      .text(OVEN.x, OVEN.y, "🔥 🍕 🔥", { fontSize: "26px" })
      .setOrigin(0.5);
  }
  // The baked pizza slides out of the oven onto the counter; tap it to send it.
  servePizza(order, online) {
    const dish = this.prepDish;
    if (this.lastStatus === "COOKING") {
      dish.setPosition(OVEN.x, OVEN.y).setScale(0.2).setAlpha(0);
      this.tweens.add({
        targets: dish,
        x: PREP.x,
        y: PREP.y,
        scale: PREP.scale,
        alpha: 1,
        duration: 550,
        ease: "Back.out",
      });
    }
    if (!online) return;
    // A gentle breathing grow (no blinking) shows the pizza is ready to tap.
    this.tweens.add({
      targets: dish,
      scale: PREP.scale * 1.06,
      duration: 700,
      ease: "Sine.inOut",
      yoyo: true,
      repeat: -1,
      delay: this.lastStatus === "COOKING" ? 550 : 0,
    });
    this.guideTarget = dish;
    dish
      .setSize(230, 180)
      .setInteractive({ useHandCursor: true })
      .once("pointerdown", () => {
        this.audio.unlock();
        this.act("DELIVER").then(
          (ok) => !ok && dish.scene && this.servePizza(order, online),
        );
      });
  }
  effect(event) {
    super.effect(event);
    // Into the oven: the dropped pizza shrinks away through the oven door.
    if (event.type === "COOK") {
      const dish = pizza(
        this,
        OVEN.x,
        OVEN.y,
        this.game.registry.get("snapshot").game.order.addedIngredients,
        PREP.scale,
      );
      this.tweens.add({
        targets: dish,
        scale: 0.15,
        alpha: 0,
        duration: 300,
        ease: "Sine.in",
        onComplete: () => dish.destroy(),
      });
    }
  }
}
