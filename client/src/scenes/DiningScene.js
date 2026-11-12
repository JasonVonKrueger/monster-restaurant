import { RestaurantScene } from "./RestaurantScene.js";
import { pulse } from "../animations/effects.js";
import { monster, pizza } from "../entities/art.js";
export class DiningScene extends RestaurantScene {
  constructor() {
    super("dining", "dining");
  }
  dining(order, online) {
    const status = order.status;
    this.bubbles = monster(
      this,
      status === "CUSTOMER_ARRIVED" ? 125 : 270,
      345,
      0.9,
    );
    if (status === "CUSTOMER_ARRIVED")
      this.tweens.add({
        targets: this.bubbles,
        x: 150,
        duration: 800,
        ease: "Sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    this.bubbles
      .setSize(250, 270)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        if (status === "CUSTOMER_ARRIVED" && online) this.act("WELCOME");
        else this.effect({ type: "BOUNCE" });
      });
    const table = this.add.graphics();
    table.fillStyle(0xb98567);
    table.fillRoundedRect(65, 468, 410, 120, 35);
    table.fillStyle(0xffeed2);
    table.fillRoundedRect(60, 455, 420, 95, 28);
    if (status === "DELIVERED" || status === "COMPLETE") {
      const dish = pizza(
        this,
        270,
        492,
        status === "COMPLETE" ? [] : order.addedIngredients,
        0.6,
      );
      this.dish = dish;
      if (status === "DELIVERED") pulse(this, dish);
      if (status === "DELIVERED")
        dish
          .setSize(230, 180)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", () => online && this.act("SERVE"));
    }
    const copy = {
      CUSTOMER_ARRIVED: ["👋 Welcome Bubbles!", "👋 Welcome", "WELCOME"],
      CUSTOMER_SEATED: [
        "Bubbles wants a silly pizza!",
        "🛎️ Send order",
        "SEND_ORDER",
      ],
      ORDER_SENT: ["👨‍🍳 Your chef has the order"],
      PREPARING: ["🍅 Your chef is adding yumminess"],
      COOKING: ["🔥 A little oven magic"],
      READY_TO_DELIVER: ["🍕 Your chef’s pizza is ready"],
      DELIVERED: ["🔔 Pizza delivery!", "🍕 Serve Bubbles", "SERVE"],
      COMPLETE: [
        "🎉 Great teamwork! +3 ⭐ +5 🪙",
        "🚪 Next hungry visit",
        "NEXT_CUSTOMER",
      ],
    }[status];
    this.label(270, 600, copy[0], 24);
    if (copy[2])
      this.button(270, 672, 450, copy[1], () => this.act(copy[2]), {
        active: online,
        highlight: true,
      });
    this.button(270, 750, 400, "🫧 Pop some bubbles", () =>
      this.effect({ type: "BOUNCE" }),
    );
  }
}
