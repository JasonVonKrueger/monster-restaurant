import Phaser from "phaser";
import { RestaurantScene, INK } from "./RestaurantScene.js";
import { pizza } from "../entities/art.js";
import { chef } from "../entities/chef.js";
import { pulse } from "../animations/effects.js";
import { dragToTarget } from "../components/dragToTarget.js";
import { INGREDIENTS, PIZZA, COOK_MS } from "../../../shared/recipes.js";
import { monsterName } from "../../../shared/monsters.js";

// Layout over the kitchen art: header and status sign at the top, Pip at the stove
// between the oven timer and the order ticket, and the work counter from y=430 down.
const PREP = { x: 270, y: 515, scale: 0.72 };
// One long tray holds the ingredients. It shows TRAY.perPage at a time; with more
// ingredients than that, arrows at the ends page through them.
const TRAY = { x: 20, y: 640, width: 500, height: 92, perPage: 6, arrow: 40 };
const TRAY_IDS = Object.keys(INGREDIENTS);
const ACTION_Y = 735;

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
    const slot = (TRAY.width - 2 * inset) / TRAY.perPage;
    const page = Math.floor(i / TRAY.perPage);
    if (page !== this.trayPage) return { x: 270, y: TRAY.y, visible: false };
    return {
      x: TRAY.x + inset + slot * ((i % TRAY.perPage) + 0.5),
      y: TRAY.y,
      visible: true,
    };
  }
  create() {
    this.input.dragDistanceThreshold = 8;
    super.create();
  }
  drawBackdrop(snapshot) {
    if (!this.textures.exists("kitchen-back")) return super.drawBackdrop();
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
    if (this.textures.exists("kitchen-front"))
      this.add.image(270, 400, "kitchen-front");
    this.headerPanel();
  }
  // A wall timer: the needle sweeps and the face fills while the pizza cooks.
  ovenTimer(order) {
    const x = 72,
      y = 250,
      r = 40;
    const g = this.add.graphics();
    g.fillStyle(0x9aa6bc);
    g.fillRoundedRect(x - 50, y - 50, 100, 100, 20);
    g.lineStyle(4, INK);
    g.strokeRoundedRect(x - 50, y - 50, 100, 100, 20);
    g.fillStyle(0xf7f4fb);
    g.fillCircle(x, y, r);
    g.strokeCircle(x, y, r);
    g.lineStyle(3, 0xc9bde0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.lineBetween(
        x + Math.cos(a) * (r - 10),
        y + Math.sin(a) * (r - 10),
        x + Math.cos(a) * (r - 4),
        y + Math.sin(a) * (r - 4),
      );
    }
    const fill = this.add.graphics();
    const needle = this.add
      .rectangle(x, y, 5, r - 8, 0xff4d6d)
      .setOrigin(0.5, 1);
    this.add.circle(x, y, 6, INK);
    const draw = (t) => {
      fill.clear();
      if (t > 0) {
        fill.fillStyle(0xffa64d, 0.85);
        fill.slice(x, y, r - 4, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
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
    const added = order?.addedIngredients || [];
    const next = order?.requiredIngredients[added.length];
    PIZZA.requiredIngredients.forEach((id, i) => {
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
      ACTION_Y,
      370,
      "✨ Bounce together",
      () => this.act("BOUNCE"),
      {
        active: online,
      },
    );
  }
  tray(order, { canPrepare, preparing, next, target, outline }) {
    const pages = Math.ceil(TRAY_IDS.length / TRAY.perPage);
    // Open on the page holding the next ingredient whenever it changes.
    if (next !== this.trayNext) {
      this.trayNext = next;
      const i = TRAY_IDS.indexOf(next);
      if (i >= 0) this.trayPage = Math.floor(i / TRAY.perPage);
    }
    this.trayPage = Phaser.Math.Clamp(this.trayPage, 0, pages - 1);
    const { x, y, width, height } = TRAY;
    const g = this.add.graphics();
    g.fillStyle(INK, 0.35);
    g.fillRoundedRect(x + 4, y - height / 2 + 8, width, height, 26);
    g.fillStyle(0xf6e7cf);
    g.fillRoundedRect(x, y - height / 2, width, height, 26);
    g.lineStyle(4, INK);
    g.strokeRoundedRect(x, y - height / 2, width, height, 26);
    g.fillStyle(0xecd6b4);
    g.fillRoundedRect(x + 10, y - height / 2 + 10, width - 20, height - 20, 18);
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
        highlight: (over) =>
          outline.setStrokeStyle(over ? 6 : 4, over ? 0x7fbd94 : 0xffd77f, 1),
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
        : "🔥 Ready for the oven!",
      COOKING: "🔥 Cooking a little magic…",
      READY_TO_DELIVER: "✨ Your pizza is ready!",
      DELIVERED: "🛎️ Your friend is serving!",
      COMPLETE: "🎉 Great teamwork! +3 ⭐ +5 🪙",
    };
    this.plaque(270, 152, hints[status], 21);
    // Once the pizza has gone to the dining room, the counter shows an empty plate.
    const sent = ["DELIVERED", "COMPLETE"].includes(status);
    this.prepDish = pizza(
      this,
      PREP.x,
      PREP.y,
      sent ? [] : order.addedIngredients,
      PREP.scale,
    );
    const canPrepare = online && preparing && Boolean(next);
    let target, outline;
    if (canPrepare) {
      outline = this.add
        .ellipse(PREP.x, PREP.y, 270, 160)
        .setStrokeStyle(4, 0xffd77f, 0.9);
      pulse(this, outline);
      target = this.add
        .zone(PREP.x, PREP.y, 380, 150)
        .setRectangleDropZone(380, 150);
    }
    this.tray(order, { canPrepare, preparing, next, target, outline });
    if (status === "COOKING") {
      const oven = this.plaque(270, ACTION_Y, "🔥 🍕 🔥", 40);
      this.tweens.add({
        targets: oven,
        alpha: 0.6,
        scale: 1.08,
        duration: 450,
        yoyo: true,
        repeat: -1,
      });
    } else if (status === "READY_TO_DELIVER")
      this.button(
        270,
        ACTION_Y,
        450,
        "🍕 Send to your friend →",
        () => this.act("DELIVER"),
        {
          active: online,
          highlight: true,
        },
      );
    else if (preparing)
      this.button(
        270,
        ACTION_Y,
        450,
        "🔥 Into the oven!",
        () => this.act("COOK"),
        {
          active: online && !next,
          highlight: !next,
        },
      );
  }
}
