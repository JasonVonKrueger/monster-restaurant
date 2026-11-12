import { randomUUID } from "node:crypto";
import { PIZZA, INGREDIENTS, COOK_MS } from "../../../shared/recipes.js";
export const GAME_ACTIONS = new Set([
  "START",
  "WELCOME",
  "SEND_ORDER",
  "ADD_INGREDIENT",
  "COOK",
  "DELIVER",
  "SERVE",
  "NEXT_CUSTOMER",
]);
const requireThat = (condition, message) => {
  if (!condition) throw new Error(message);
};
export function newOrder(now) {
  return {
    id: randomUUID(),
    monsterId: "bubbles",
    recipeId: PIZZA.id,
    requiredIngredients: [...PIZZA.requiredIngredients],
    addedIngredients: [],
    status: "CUSTOMER_ARRIVED",
    createdAt: now,
    cookEndsAt: null,
  };
}
export function applyGameAction(room, player, { type, payload = {} }, now) {
  const role = ["ADD_INGREDIENT", "COOK", "DELIVER"].includes(type)
    ? "kitchen"
    : "dining";
  requireThat(
    player.role === role,
    "That is your friend’s job. Try something on your side!",
  );
  if (type === "START") {
    requireThat(!room.game, "Your restaurant is already open.");
    requireThat(
      room.players.size === 2 &&
        [...room.players.values()].every((p) => p.connected),
      "Invite your friend before opening.",
    );
    room.game = {
      order: newOrder(now),
      stars: 0,
      coins: 0,
      completedOrders: 0,
    };
    return;
  }
  requireThat(room.game, "Let’s open the restaurant first.");
  const { order } = room.game;
  requireThat(
    payload && payload.orderId === order.id,
    "A new customer is here. Try again!",
  );
  const status = (expected) =>
    requireThat(
      expected.includes(order.status),
      "There’s another little step first.",
    );
  switch (type) {
    case "WELCOME":
      status(["CUSTOMER_ARRIVED"]);
      order.status = "CUSTOMER_SEATED";
      break;
    case "SEND_ORDER":
      status(["CUSTOMER_SEATED"]);
      order.status = "ORDER_SENT";
      break;
    case "ADD_INGREDIENT": {
      status(["ORDER_SENT", "PREPARING"]);
      requireThat(
        typeof payload.ingredientId === "string" &&
          Object.hasOwn(INGREDIENTS, payload.ingredientId),
        "Choose a yummy ingredient.",
      );
      const next = order.requiredIngredients[order.addedIngredients.length];
      requireThat(
        payload.ingredientId === next,
        `Oops, a silly pizza! Try the ${INGREDIENTS[next]?.label.toLowerCase() || "oven"} picture.`,
      );
      order.addedIngredients.push(next);
      order.status = "PREPARING";
      break;
    }
    case "COOK":
      status(["PREPARING"]);
      requireThat(
        order.addedIngredients.length === order.requiredIngredients.length,
        "Add the glowing ingredient first.",
      );
      order.status = "COOKING";
      order.cookEndsAt = now + COOK_MS;
      break;
    case "DELIVER":
      status(["READY_TO_DELIVER"]);
      order.status = "DELIVERED";
      break;
    case "SERVE":
      status(["DELIVERED"]);
      order.status = "COMPLETE";
      room.game.stars += 3;
      room.game.coins += 5;
      room.game.completedOrders++;
      break;
    case "NEXT_CUSTOMER":
      status(["COMPLETE"]);
      room.game.order = newOrder(now);
      break;
    default:
      throw new Error("Choose an action in your restaurant.");
  }
}
export function advanceCooking(room, now) {
  const order = room.game?.order;
  if (order?.status !== "COOKING" || now < order.cookEndsAt) return false;
  order.status = "READY_TO_DELIVER";
  return true;
}
