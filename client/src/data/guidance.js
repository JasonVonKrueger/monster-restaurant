import { INGREDIENTS } from "../../../shared/recipes.js";
export function guidanceFor(snapshot, role) {
  const order = snapshot?.game?.order;
  if (!order)
    return role === "dining"
      ? "Invite your friend, then open the restaurant!"
      : "Your friend will open the restaurant. Send them a hug!";
  if (role === "kitchen") {
    if (["ORDER_SENT", "PREPARING"].includes(order.status)) {
      const next = order.requiredIngredients[order.addedIngredients.length];
      return next
        ? `Drag the ${INGREDIENTS[next].label.toLowerCase()} onto the pizza!`
        : "Tap the oven. Let’s bake your pizza!";
    }
    return {
      CUSTOMER_ARRIVED:
        "Your friend is welcoming Bubbles. Try stirring the silly soup!",
      CUSTOMER_SEATED: "Bubbles wants a pizza! Here comes your order.",
      COOKING: "Your pizza is cooking. A little oven magic!",
      READY_TO_DELIVER: "Your pizza is ready! Send it to your friend!",
      DELIVERED: "Your friend is serving the pizza. Great helping!",
      COMPLETE: "Great teamwork! Bubbles loved your pizza!",
    }[order.status];
  }
  return {
    CUSTOMER_ARRIVED: "Look! Bubbles is here! Tap to say hello!",
    CUSTOMER_SEATED: "Let’s make a pizza! Tap the bell to send the order.",
    ORDER_SENT: "Your chef has the order. Pop some bubbles while you wait!",
    PREPARING: "Your chef is making a silly pizza!",
    COOKING: "Your pizza is cooking. Send your chef a hug!",
    READY_TO_DELIVER: "Your chef made a pizza! It will be here soon.",
    DELIVERED: "Ding ding! Tap the pizza to serve Bubbles!",
    COMPLETE: "Great teamwork! Tap the door for another hungry visit!",
  }[order.status];
}
