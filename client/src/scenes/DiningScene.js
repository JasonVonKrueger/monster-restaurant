import { RestaurantScene } from "./RestaurantScene.js";
import Phaser from "phaser";
import { pulse } from "../animations/effects.js";
import { dragToTarget } from "../components/dragToTarget.js";
import { monster, pizza } from "../entities/art.js";
import { monsterName } from "../../../shared/monsters.js";

// Layout over the dining art: header and status sign at the top, the visiting monster
// in front of the big window, the dish on the counter top, and controls on the counter base.
const BUTTON_Y = 650;
const POP_Y = 740;
// The menu stands on the counter, and is held up in front of the monster to read.
const MENU_HOME = { x: 84, y: 468, scale: 0.62 };
const MENU_HELD = { x: 270, y: 446, scale: 1 };
const THOUGHTS = ["🍕", "🍓", "🤔", "🧀"];

export class DiningScene extends RestaurantScene {
  constructor() {
    super("dining", "dining");
  }
  drawBackdrop(snapshot) {
    const art =
      this.textures.exists("dining-back") &&
      this.textures.exists("dining-front");
    if (!art) {
      super.drawBackdrop();
      this.customer(snapshot.game?.order);
      const table = this.add.graphics();
      table.fillStyle(0xb98567);
      table.fillRoundedRect(65, 468, 410, 120, 35);
      table.fillStyle(0xffeed2);
      table.fillRoundedRect(60, 455, 420, 95, 28);
      return;
    }
    this.add.image(270, 400, "dining-back");
    this.customer(snapshot.game?.order);
    this.add.image(270, 400, "dining-front");
    this.headerPanel();
  }
  // The monster sits behind the counter; tapping says hello on arrival, otherwise bounces.
  customer(order) {
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
    if (!this.textures.exists("menu")) return;
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
  dining(order, online) {
    const status = order.status,
      name = monsterName(order.monsterId);
    this.menu(order, online, name);
    if (status === "DELIVERED" || status === "COMPLETE") {
      const dish = pizza(
        this,
        270,
        492,
        status === "COMPLETE" ? [] : order.addedIngredients,
        0.6,
      );
      this.dish = dish;
      if (status === "DELIVERED") {
        pulse(this, dish);
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
        `${name} wants a silly pizza!`,
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
