import Phaser from "phaser";
import { monster, pizza } from "../entities/art.js";
import { preloadAssets } from "../data/assets.js";
import { guidanceFor } from "../data/guidance.js";
import { backdrop } from "../entities/backdrop.js";
import { pulse, wiggle, burst, reaction } from "../animations/effects.js";
export const INK = 0x2b1d3a;
// Pip's reaction to each effect, when the scene has a chef.
const CHEF_POSES = {
  BOUNCE: "happy",
  HUG: "wave",
  ADD_INGREDIENT: "happy",
  COOK: "happy",
  DELIVER: "wave",
  SERVE: "happy",
  SEND_ORDER: "wave",
  START: "wave",
  NEXT_CUSTOMER: "wave",
};
// The visiting monster's reaction to each effect.
const GUEST_POSES = {
  BOUNCE: "happy",
  HUG: "wave",
  WELCOME: "wave",
  SEND_ORDER: "happy",
  DELIVER: "happy",
  SERVE: "eat",
  START: "wave",
  NEXT_CUSTOMER: "wave",
};
const font = {
  fontFamily: "Trebuchet MS",
  color: "#5b416e",
  fontSize: "24px",
  align: "center",
};
export class RestaurantScene extends Phaser.Scene {
  constructor(key, role) {
    super(key);
    this.role = role;
  }
  preload() {
    preloadAssets(this);
  }
  create() {
    this.audio = this.game.registry.get("audio");
    this.renderSignature = undefined;
    this.refresh();
    const update = () => this.refresh();
    const effect = (event) => this.effect(event.detail);
    const hint = (event) => this.hint(event.detail);
    window.addEventListener("restaurant:state", update);
    window.addEventListener("restaurant:effect", effect);
    window.addEventListener("restaurant:hint", hint);
    this.events.once("shutdown", () => {
      window.removeEventListener("restaurant:state", update);
      window.removeEventListener("restaurant:effect", effect);
      window.removeEventListener("restaurant:hint", hint);
    });
  }
  refresh() {
    const state = this.game.registry.get("snapshot");
    const signature = JSON.stringify([
      state?.game,
      state?.players,
      this.game.registry.get("online"),
    ]);
    if (signature === this.renderSignature) return;
    this.renderSignature = signature;
    this.paint();
    this.audio.guide(guidanceFor(state, this.role));
    const status = state.game?.order.status;
    if (status === "READY_TO_DELIVER" && this.lastStatus !== status)
      this.audio.play("ready");
    this.lastStatus = status;
  }
  update() {
    if (!this.hugButton) return;
    const ready =
      this.game.registry.get("online") &&
      Date.now() >= (this.game.registry.get("hugUntil") || 0);
    this.hugButton.setAlpha(ready ? 1 : 0.45);
    this.hugButton.input.enabled = Boolean(ready);
  }
  label(x, y, text, size = 24) {
    return this.add
      .text(x, y, text, { ...font, fontSize: `${size}px` })
      .setOrigin(0.5);
  }
  // A label on a cream sign, readable over busy artwork. Returns the container.
  plaque(x, y, text, size = 24) {
    const t = this.label(0, 0, text, size);
    const w = t.width + 34,
      h = t.height + 14;
    const g = this.add.graphics();
    g.fillStyle(0xfff7dc, 0.96);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.lineStyle(3, INK);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    return this.add.container(x, y, [g, t]);
  }
  drawBackdrop() {
    backdrop(this, this.role);
  }
  // The cream panel behind the title, rewards, hug and sound buttons, over room art.
  headerPanel() {
    const header = this.add.graphics();
    header.fillStyle(0xfffbef);
    header.fillRoundedRect(28, 24, 484, 96, 28);
    header.lineStyle(3, INK);
    header.strokeRoundedRect(28, 24, 484, 96, 28);
  }
  lobby(snapshot, online) {
    this.guest = monster(this, 270, 345);
    this.label(270, 535, "Let’s open our restaurant!", 29);
    if (this.role === "dining")
      this.button(
        270,
        640,
        430,
        "🚪 Open restaurant",
        () => this.act("START"),
        {
          active:
            online &&
            snapshot.players.length === 2 &&
            snapshot.players.every((p) => p.connected),
          highlight: true,
        },
      );
    else this.label(270, 625, "🛎️ Your friend opens the doors", 24);
    this.button(270, 735, 370, "✨ Bounce together", () => this.act("BOUNCE"), {
      active: online,
    });
  }
  button(
    x,
    y,
    w,
    text,
    callback,
    { active = true, highlight = false, fontSize = 23 } = {},
  ) {
    const c = this.add.container(x, y),
      g = this.add.graphics();
    g.fillStyle(active ? 0x664486 : 0xb5a6bd);
    g.fillRoundedRect(-w / 2, -31, w, 72, 22);
    g.fillStyle(active ? (highlight ? 0xffd77f : 0x8558b3) : 0xd6cadf);
    g.fillRoundedRect(-w / 2, -36, w, 72, 22);
    c.add(g);
    c.add(
      this.add
        .text(0, 0, text, {
          ...font,
          fontSize: `${fontSize}px`,
          color: active && !highlight ? "#ffffff" : "#5b416e",
        })
        .setOrigin(0.5),
    );
    if (active) {
      c.setSize(w, 72).setInteractive({ useHandCursor: true });
      c.on("pointerdown", () => {
        this.audio.unlock();
        this.audio.play("tap");
        this.tweens.add({
          targets: c,
          scale: 0.95,
          duration: 80,
          yoyo: true,
        });
        callback();
      });
    }
    if (highlight && active) {
      pulse(this, g);
      this.guideTarget = c;
    }
    return c;
  }
  // Returns a promise of whether the server accepted the action.
  act(type, payload = {}) {
    return this.game.registry.get("sendAction")(type, {
      orderId: this.game.registry.get("snapshot").game?.order.id,
      ...payload,
    });
  }
  paint() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    // Destroy, not just remove: removed objects stay interactive and keep their listeners.
    for (const child of [...this.children.list]) child.destroy();
    this.guest = null;
    this.chef = null;
    this.dish = null;
    this.prepDish = null;
    this.guideTarget = null;
    const snapshot = this.game.registry.get("snapshot");
    if (!snapshot) return;
    this.drawBackdrop(snapshot);
    this.label(
      270,
      52,
      this.role === "dining" ? "DINING ROOM" : "LITTLE KITCHEN",
      25,
    );
    this.label(
      270,
      94,
      `⭐ ${snapshot.game?.stars || 0}     🪙 ${snapshot.game?.coins || 0}`,
      25,
    );
    const online = this.game.registry.get("online");
    // Hug and sound buttons sit inside the header panel (x 28–512, y 24–120),
    // centred vertically with an even 12px gap at each side.
    this.hugButton = this.button(
      80,
      70,
      80,
      "♥",
      () => this.game.registry.get("sendHug")(),
      { fontSize: 36 },
    );
    this.button(
      460,
      70,
      80,
      "🔊",
      () => {
        this.audio.repeat();
        if (this.guideTarget)
          burst(this, {
            x: this.guideTarget.x,
            y: this.guideTarget.y,
            count: 6,
          });
      },
      { fontSize: 28 },
    );
    if (!snapshot.game) return this.lobby(snapshot, online);
    const order = snapshot.game.order;
    if (this.role === "dining") this.dining(order, online);
    else this.kitchen(order, online);
  }
  hint(text) {
    this.audio.speak(text);
    this.audio.play("pop");
    const toast = this.add.container(270, 390).setDepth(30);
    toast.add(
      this.add.rectangle(0, 0, 490, 100, 0xfff4dc).setStrokeStyle(3, 0xe5b85f),
    );
    toast.add(
      this.add
        .text(0, 0, `🤭 ${text}`, {
          ...font,
          fontSize: "23px",
          wordWrap: { width: 455 },
        })
        .setOrigin(0.5),
    );
    this.tweens.add({
      targets: toast,
      alpha: 0,
      delay: 2200,
      duration: 250,
      onComplete: () => toast.destroy(),
    });
  }
  effect({ type }) {
    const sounds = {
      BOUNCE: "pop",
      HUG: "hug",
      ADD_INGREDIENT: "ingredient",
      COOK: "oven",
      DELIVER: "bell",
      SERVE: "celebration",
      WELCOME: "pop",
      GIVE_MENU: "pop",
      SEND_ORDER: "bell",
      START: "reward",
      NEXT_CUSTOMER: "pop",
    };
    this.audio.play(sounds[type] || "tap");
    this.chef?.pose(CHEF_POSES[type]);
    this.guest?.pose(GUEST_POSES[type]);
    if (type === "HUG") {
      burst(this, { kind: "hearts", y: 580, count: 10 });
      wiggle(this, this.guest || this.chef || this.prepDish);
      return;
    }
    if (type === "DELIVER" && this.role === "dining" && this.dish) {
      this.dish.setPosition(480, 300);
      this.tweens.add({
        targets: this.dish,
        x: 270,
        y: 492,
        duration: 650,
        ease: "Back.out",
      });
    }
    if (type === "DELIVER" && this.role === "kitchen") {
      const dish = pizza(
        this,
        this.prepAt.x,
        this.prepAt.y,
        this.game.registry.get("snapshot").game.order.addedIngredients,
        this.prepAt.scale,
      );
      this.tweens.add({
        targets: dish,
        x: 620,
        y: this.prepAt.y - 120,
        alpha: 0,
        duration: 650,
        onComplete: () => dish.destroy(),
      });
    }
    if (type === "ADD_INGREDIENT" && this.role === "kitchen") {
      // The chef dragged it onto the pizza; celebrate where it landed.
      burst(this, { x: this.prepAt.x, y: this.prepAt.y, count: 10 });
      return;
    }
    if (type === "SERVE" && this.role === "dining") {
      const dish = pizza(
        this,
        270,
        492,
        this.game.registry.get("snapshot").game.order.addedIngredients,
        0.6,
      );
      this.tweens.add({
        targets: dish,
        y: 385,
        scale: 0,
        angle: 40,
        duration: 700,
        onComplete: () => dish.destroy(),
      });
      this.time.delayedCall(450, () => this.audio.play("chew"));
      this.time.delayedCall(950, () => this.audio.play("burp"));
      this.time.delayedCall(1450, () => this.audio.play("reward"));
      reaction(
        this,
        this.guest,
        this.game.registry.get("snapshot").game.completedOrders % 3,
      );
    }
    if (type === "BOUNCE")
      wiggle(this, this.guest || this.chef || this.prepDish);
    if (type === "SERVE" && this.role === "kitchen")
      burst(this, { kind: "confetti", count: 24 });
    if (type !== "SERVE")
      burst(this, {
        kind: type === "BOUNCE" ? "bubbles" : "sparkles",
        count: 10,
      });
  }
}
