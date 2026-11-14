import { RestaurantScene, SERVED_DISH } from "./RestaurantScene.js";
import Phaser from "phaser";
import { pulse, burst } from "../animations/effects.js";
import { dragToTarget } from "../components/dragToTarget.js";
import {
  monster,
  pizza,
  waterGlass,
  mouthOffset,
  HANDS_FRAME,
} from "../entities/art.js";
import { monsterName } from "../../../shared/monsters.js";
import { INGREDIENTS } from "../../../shared/recipes.js";

// Layout over the dining art: header and status sign at the top, the visiting monster
// in front of the big window, the dish on the counter top, and controls on the counter base.
const BUTTON_Y = 650;
const POP_Y = 740;
// The menu stands on the counter, and is held up in front of the monster to read.
const MENU_HOME = { x: 84, y: 468, scale: 0.62 };
const MENU_HELD = { x: 270, y: 446, scale: 1 };
// A glass of water stands on the counter beside the served pizza (its base at y).
const GLASS = { x: 392, y: 486 };
const ROCKET = {
  every: 45000,
  flight: 4500,
  x0: 40,
  y0: 360,
  x1: 500,
  y1: 230,
};
const THOUGHTS = ["🍕", "🍓", "🤔", "🧀"];

export class DiningScene extends RestaurantScene {
  constructor() {
    super("dining", "dining");
  }
  drawBackdrop(snapshot) {
    this.add.image(270, 400, "dining-back");
    this.rocket();
    this.customer(snapshot.game?.order);
    this.add.image(270, 400, "dining-front");
    this.headerPanel();
  }
  // Every ROCKET.every ms a little rocket zooms past the window, left or right,
  // clipped to the glass.
  // Its flight follows the wall clock, so a repaint mid-flight picks up where it was.
  rocket() {
    if (!this.anims.exists("rocket-flame"))
      this.anims.create({
        key: "rocket-flame",
        frames: this.anims.generateFrameNumbers("rocket", { start: 0, end: 2 }),
        frameRate: 12,
        repeat: -1,
      });
    const glass = this.make.graphics({ add: false });
    glass.fillStyle(0xffffff);
    glass.fillRoundedRect(82, 194, 376, 232, 46);
    const ship = this.add
      .sprite(0, 0, "rocket")
      .setScale(0.5)
      .setMask(glass.createGeometryMask())
      .setVisible(false)
      .play("rocket-flame");
    // Each flight picks a direction from its number, so every repaint agrees on it.
    const leftward = (flight) => {
      const x = Math.sin(flight * 12.9898) * 43758.5453;
      return x - Math.floor(x) < 0.5;
    };
    const fly = (from) => {
      // A gentle climb with a little wobble across the sky, either way.
      const flipped = leftward(Math.floor(Date.now() / ROCKET.every));
      const [x0, x1] = flipped
        ? [ROCKET.x1, ROCKET.x0]
        : [ROCKET.x0, ROCKET.x1];
      ship.setFlipX(flipped);
      const t = { p: from };
      const place = () => {
        const { p } = t;
        ship.setPosition(
          Phaser.Math.Linear(x0, x1, p),
          Phaser.Math.Linear(ROCKET.y0, ROCKET.y1, p) +
            Math.sin(p * Math.PI * 4) * 6,
        );
        const tilt = -8 + Math.cos(p * Math.PI * 4) * 6;
        ship.setAngle(flipped ? -tilt : tilt);
      };
      place();
      ship.setVisible(true);
      this.tweens.add({
        targets: t,
        p: 1,
        duration: ROCKET.flight * (1 - from),
        onUpdate: place,
        onComplete: () => {
          ship.setVisible(false);
          this.time.delayedCall(
            ROCKET.every - (Date.now() % ROCKET.every),
            () => fly(0),
          );
        },
      });
    };
    const phase = Date.now() % ROCKET.every;
    if (phase < ROCKET.flight) fly(phase / ROCKET.flight);
    else this.time.delayedCall(ROCKET.every - phase, () => fly(0));
  }
  // The monster sits behind the counter; tapping says hello on arrival, otherwise bounces.
  // Nobody is in the dining room until the restaurant opens and the first guest arrives.
  customer(order) {
    this.sad = false;
    if (!order) return;
    const online = this.game.registry.get("online");
    const arriving = order?.status === "CUSTOMER_ARRIVED";
    this.guest = monster(
      this,
      arriving ? 125 : 270,
      345,
      0.9,
      order?.monsterId,
    );
    this.sad = this.patience(order);
    this.guest.setSad(this.sad);
    if (arriving)
      this.tweens.add({
        targets: this.guest,
        x: 150,
        duration: 800,
        ease: "Sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    this.guest
      .setSize(250, 270)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.audio.unlock();
        if (arriving && online) this.act("WELCOME");
        else this.effect({ type: "BOUNCE" });
      });
  }
  lobby(snapshot, online) {
    this.menu(null, false);
    this.plaque(270, 152, "Let’s open our restaurant!", 24);
    this.button(
      270,
      BUTTON_Y,
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
    this.button(
      270,
      POP_Y,
      370,
      "✨ Bounce together",
      () => this.act("BOUNCE"),
      { active: online },
    );
  }
  menu(order, online, name) {
    const status = order?.status;
    if (status === "READING_MENU") return this.readMenu();
    const card = this.add
      .sprite(MENU_HOME.x, MENU_HOME.y, "menu", 0)
      .setScale(MENU_HOME.scale);
    if (status === "READY_TO_ORDER" && this.lastStatus === "READING_MENU") {
      // Just finished reading: close the menu and set it back on the counter.
      card.setPosition(MENU_HELD.x, MENU_HELD.y).setScale(MENU_HELD.scale);
      card.setFrame(1);
      this.time.delayedCall(250, () => card.scene && card.setFrame(0));
      this.tweens.add({
        targets: card,
        ...MENU_HOME,
        angle: { from: -8, to: 0 },
        delay: 250,
        duration: 550,
        ease: "Back.out",
      });
      this.guest?.pose("happy");
      this.audio.play("pop");
    }
    if (status !== "CUSTOMER_SEATED" || !online) return;
    // Hand the menu over: drag it onto the monster.
    pulse(this, card);
    this.guideTarget = card;
    const target = this.add
      .zone(270, 330, 280, 290)
      .setRectangleDropZone(280, 290);
    const orderId = order.id;
    // No outline: the monster grows a little when the menu is over it.
    const guest = this.guest,
      baseScale = guest?.scaleX;
    dragToTarget(this, card, {
      target,
      highlight: (over) =>
        guest?.scene &&
        this.tweens.add({
          targets: guest,
          scale: over ? baseScale * 1.08 : baseScale,
          duration: 120,
        }),
      onDrop: () => this.act("GIVE_MENU", { orderId }),
      missHint: `Drag the menu to ${name}!`,
    });
  }
  // The monster holds the open menu up and thinks about what looks yummy.
  // The server's clock decides when reading is done.
  readMenu() {
    const open = this.add
      .sprite(MENU_HELD.x, MENU_HELD.y, "menu", 1)
      .setScale(MENU_HELD.scale);
    this.tweens.add({
      targets: open,
      angle: { from: -4, to: 4 },
      y: MENU_HELD.y - 6,
      duration: 900,
      ease: "Sine.inOut",
      yoyo: true,
      repeat: -1,
    });
    const bubble = this.add.container(392, 214);
    bubble.add([
      this.add.circle(-34, 44, 6, 0xffffff).setStrokeStyle(3, 0x2b1d3a),
      this.add.circle(-20, 30, 9, 0xffffff).setStrokeStyle(3, 0x2b1d3a),
      this.add.circle(0, 0, 30, 0xffffff).setStrokeStyle(3, 0x2b1d3a),
    ]);
    const thought = this.add.text(0, 0, THOUGHTS[0], { fontSize: "30px" });
    bubble.add(thought.setOrigin(0.5));
    let i = 0;
    this.time.addEvent({
      delay: 800,
      loop: true,
      callback: () => {
        thought.setText(THOUGHTS[++i % THOUGHTS.length]);
        bubble.setScale(Phaser.Math.FloatBetween(0.95, 1.05));
      },
    });
  }
  effect(event) {
    super.effect(event);
    if (event.type === "SERVE") this.eatAndDrink();
  }
  // Served: the pizza comes up off the plate and gets shoved into the monster's mouth
  // in three big chomps, then the monster gulps down the glass of water and burps.
  // The scene has already been redrawn for COMPLETE (empty plate, empty glass), so
  // this plays on top; the timing matches the monster's "feast" pose.
  eatAndDrink() {
    const guest = this.guest;
    const order = this.game.registry.get("snapshot")?.game?.order;
    if (!guest || !order) return;
    const mouth = {
      x: guest.x,
      y: guest.y + mouthOffset(order.monsterId) * guest.scaleY,
    };
    const food = pizza(
      this,
      SERVED_DISH.x,
      SERVED_DISH.y,
      order.addedIngredients,
      SERVED_DISH.scale,
      { plate: false },
    );
    // Up to the mouth, tipped toward the monster.
    this.tweens.add({
      targets: food,
      x: mouth.x,
      y: mouth.y + 18,
      scale: 0.42,
      angle: -12,
      duration: 500,
      ease: "Sine.out",
    });
    // The monster's hands grip it once it reaches the mouth, until the last bite.
    const hands = guest.hands(HANDS_FRAME.pizza);
    this.time.delayedCall(450, () => hands?.setVisible(true));
    this.time.delayedCall(1550, () => hands?.destroy());
    // Three chomps: each shoves it in, takes a bite (it shrinks a little, staying in
    // the hands) and drops crumbs; the last bite finishes it.
    [600, 1000, 1400].forEach((at, i) =>
      this.time.delayedCall(at, () => {
        if (!food.scene) return;
        this.audio.play("chew");
        burst(this, { x: mouth.x, y: mouth.y + 20, count: 6 });
        this.tweens.add({
          targets: food,
          y: mouth.y + 6,
          scale: [0.38, 0.34, 0][i],
          duration: 140,
          ease: "Quad.in",
          onComplete: () => {
            if (i === 2) food.destroy();
            else
              this.tweens.add({
                targets: food,
                y: mouth.y + 18,
                duration: 160,
              });
          },
        });
      }),
    );
    // Then a big drink: the glass lifts to the mouth, tips, drains and goes back.
    const glass = waterGlass(this, GLASS.x, GLASS.y, 0.8);
    this.glass?.setVisible(false);
    // While drinking, one hand holds the glass (drawn over it).
    const hand = guest.hands(HANDS_FRAME.glass);
    this.time.delayedCall(2350, () => hand?.setVisible(true));
    this.time.delayedCall(3150, () => hand?.destroy());
    const drink = { level: 0.8 };
    this.tweens.chain({
      targets: glass,
      tweens: [
        {
          x: mouth.x + 34,
          y: mouth.y + 40,
          angle: -35,
          delay: 1900,
          duration: 450,
          ease: "Sine.out",
        },
        {
          targets: drink,
          level: 0,
          duration: 800,
          onUpdate: () => glass.setLevel(drink.level),
          onStart: () => this.audio.play("pop"),
        },
        {
          x: GLASS.x,
          y: GLASS.y,
          angle: 0,
          duration: 450,
          ease: "Sine.inOut",
          onComplete: () => {
            glass.destroy();
            this.glass?.scene && this.glass.setVisible(true);
          },
        },
      ],
    });
    this.time.delayedCall(3800, () => this.audio.play("burp"));
    this.time.delayedCall(4300, () => {
      this.audio.play("reward");
      burst(this, { kind: "confetti", count: 24 });
    });
  }
  dining(order, online) {
    const status = order.status,
      name = monsterName(order.monsterId);
    this.menu(order, online, name);
    if (status === "DELIVERED" || status === "COMPLETE") {
      const dish = pizza(
        this,
        SERVED_DISH.x,
        SERVED_DISH.y,
        status === "COMPLETE" ? [] : order.addedIngredients,
        SERVED_DISH.scale,
      );
      this.dish = dish;
      // Full while waiting to be served; empty once the monster has had its drink.
      this.glass = waterGlass(
        this,
        GLASS.x,
        GLASS.y,
        status === "COMPLETE" ? 0 : 0.8,
      );
      if (status === "DELIVERED") {
        // A gentle breathing grow (no blinking) shows the pizza is ready to tap.
        this.tweens.add({
          targets: dish,
          scale: SERVED_DISH.scale * 1.06,
          duration: 700,
          ease: "Sine.inOut",
          yoyo: true,
          repeat: -1,
        });
        dish
          .setSize(230, 180)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", () => online && this.act("SERVE"));
      }
    }
    const copy = {
      CUSTOMER_ARRIVED: [`👋 Welcome ${name}!`, "👋 Welcome", "WELCOME"],
      CUSTOMER_SEATED: [`📖 Give ${name} the menu!`],
      READING_MENU: [`📖 ${name} is reading the menu…`],
      READY_TO_ORDER: [
        order.topping
          ? `${name} wants a ${INGREDIENTS[order.topping].icon} ${INGREDIENTS[order.topping].label.toLowerCase()} pizza!`
          : `${name} wants a silly pizza!`,
        "🛎️ Send order",
        "SEND_ORDER",
      ],
      ORDER_SENT: ["👨‍🍳 Your chef has the order"],
      PREPARING: ["🍅 Your chef is adding yumminess"],
      COOKING: ["🔥 A little oven magic"],
      READY_TO_DELIVER: ["🍕 Your chef’s pizza is ready"],
      DELIVERED: ["🔔 Pizza delivery!", `🍕 Serve ${name}`, "SERVE"],
      COMPLETE: [
        "🎉 Great teamwork! +3 ⭐ +5 🪙",
        "🚪 Next hungry visit",
        "NEXT_CUSTOMER",
      ],
    }[status];
    // A hungry monster says so, unless the sign is telling the child what to do.
    const waitingOnly = !copy[2] && status !== "CUSTOMER_SEATED";
    const sign =
      this.sad && waitingOnly ? `😟 ${name} is getting hungry…` : copy[0];
    this.plaque(270, 152, sign, 22);
    if (copy[2])
      this.button(270, BUTTON_Y, 450, copy[1], () => this.act(copy[2]), {
        active: online,
        highlight: true,
      });
    this.button(270, POP_Y, 400, "🫧 Pop some bubbles", () =>
      this.effect({ type: "BOUNCE" }),
    );
  }
}
