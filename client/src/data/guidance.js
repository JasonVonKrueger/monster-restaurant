import { INGREDIENTS } from "../../../shared/recipes.js";
import { monsterName } from "../../../shared/monsters.js";
export function guidanceFor(snapshot, role) {
  const order = snapshot?.game?.order;
  const name = monsterName(order?.monsterId);
  const wanted = order?.topping
    ? `a ${INGREDIENTS[order.topping].label.toLowerCase()} pizza`
    : "a pizza";
  if (!order)
    return role === "dining"
      ? "Invite your friend, then open the restaurant!"
      : "Your friend will open the restaurant. Send them a hug!";
  if (role === "kitchen") {
    if (["ORDER_SENT", "PREPARING"].includes(order.status)) {
      const next = order.requiredIngredients[order.addedIngredients.length];
      return next
        ? `Drag the ${INGREDIENTS[next].label.toLowerCase()} onto the pizza!`
        : "Drag the pizza into the oven to bake it!";
    }
    return {
      CUSTOMER_ARRIVED: `Your friend is welcoming ${name}. Tap Pip the chef for a giggle!`,
      CUSTOMER_SEATED: `Your friend is giving ${name} the menu.`,
      READING_MENU: `${name} is reading the menu. What will it be?`,
      READY_TO_ORDER: `${name} wants ${wanted}! Here comes your order.`,
      COOKING: "Your pizza is cooking. A little oven magic!",
      READY_TO_DELIVER:
        "Your pizza is ready! Tap it to send it to your friend!",
      DELIVERED: "Your friend is serving the pizza. Great helping!",
      COMPLETE: `Great teamwork! ${name} loved your pizza!`,
    }[order.status];
  }
  return {
    CUSTOMER_ARRIVED: `Look! ${name} is here! Tap to say hello!`,
    CUSTOMER_SEATED: `Drag the menu to ${name}!`,
    READING_MENU: `${name} is reading the menu. Hmm, what looks yummy?`,
    READY_TO_ORDER: `${name} wants ${wanted}! Tap the bell to send the order.`,
    ORDER_SENT: "Your chef has the order. Pop some bubbles while you wait!",
    PREPARING: "Your chef is making a silly pizza!",
    COOKING: "Your pizza is cooking. Send your chef a hug!",
    READY_TO_DELIVER: "Your chef made a pizza! It will be here soon.",
    DELIVERED: `Ding ding! Tap the pizza to serve ${name}!`,
    COMPLETE: "Great teamwork! Tap the door for another hungry visit!",
  }[order.status];
}
