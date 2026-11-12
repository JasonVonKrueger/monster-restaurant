import { RestaurantScene } from "./RestaurantScene.js";
import { pizza } from "../entities/art.js";
import { ingredientDrag } from "../components/ingredientDrag.js";
import { INGREDIENTS } from "../../../shared/recipes.js";
export class KitchenScene extends RestaurantScene {
  constructor() {
    super("kitchen", "kitchen");
  }
  create() {
    this.input.dragDistanceThreshold = 8;
    super.create();
  }
  kitchen(order, online) {
    const status = order.status,
      preparing = ["ORDER_SENT", "PREPARING"].includes(status);
    const next = order.requiredIngredients[order.addedIngredients.length];
    const counter = this.add.graphics();
    counter.fillStyle(0xffedcf);
    counter.fillRoundedRect(30, 205, 480, 210, 30);
    this.prepDish = pizza(this, 270, 305, order.addedIngredients, 0.9);
    const hints = {
      CUSTOMER_ARRIVED: "🛎️ Your friend is welcoming Bubbles",
      CUSTOMER_SEATED: "🛎️ Here comes your order…",
      ORDER_SENT: "Drag the glowing ingredient to the pizza!",
      PREPARING: next
        ? "Drag the glowing ingredient to the pizza!"
        : "🔥 Ready for the oven!",
      COOKING: "🔥 Cooking a little magic…",
      READY_TO_DELIVER: "✨ Your pizza is ready!",
      DELIVERED: "🛎️ Your friend is serving!",
      COMPLETE: "🎉 Great teamwork! +3 ⭐ +5 🪙",
    };
    this.label(270, 185, hints[status], 21);
    const canPrepare = online && preparing && Boolean(next);
    let target, outline;
    if (canPrepare) {
      outline = this.add
        .ellipse(270, 305, 310, 180)
        .setStrokeStyle(3, 0xb39cc8, 0.8);
      target = this.add.zone(270, 305, 420, 200).setRectangleDropZone(420, 200);
      this.label(270, 393, "👇 Drop here", 18);
    }
    Object.entries(INGREDIENTS).forEach(([id, item], i) => {
      const added = order.addedIngredients.includes(id);
      const draggable = canPrepare && !added;
      const tile = this.button(
        105 + (i % 3) * 165,
        465 + Math.floor(i / 3) * 90,
        150,
        `${item.icon}${added ? " ✓" : ""}`,
        null,
        {
          active: draggable,
          draggable: true,
          highlight: preparing && id === next,
          fontSize: 42,
        },
      );
      if (draggable)
        ingredientDrag(this, tile, {
          ingredientId: id,
          orderId: order.id,
          target,
          highlight: (over) =>
            outline.setStrokeStyle(over ? 5 : 3, over ? 0x7fbd94 : 0xb39cc8, 1),
        });
    });
    if (status === "COOKING") {
      const oven = this.label(270, 655, "🔥 🍕 🔥", 46);
      this.tweens.add({
        targets: oven,
        alpha: 0.45,
        scale: 1.08,
        duration: 450,
        yoyo: true,
        repeat: -1,
      });
    } else if (status === "READY_TO_DELIVER")
      this.button(
        270,
        655,
        450,
        "🍕 Send to your friend →",
        () => this.act("DELIVER"),
        { active: online, highlight: true },
      );
    else if (preparing)
      this.button(270, 655, 450, "🔥 Into the oven!", () => this.act("COOK"), {
        active: online && !next,
        highlight: !next,
      });
    else
      this.label(
        270,
        650,
        status === "COMPLETE"
          ? "⭐ A happy, full monster!"
          : "🍽️ Getting ready for yum",
        26,
      );
    this.button(270, 750, 400, "🥣 Stir the silly soup", () =>
      this.effect({ type: "BOUNCE" }),
    );
  }
}
