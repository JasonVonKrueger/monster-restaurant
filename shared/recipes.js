export const INGREDIENTS = Object.freeze({
  dough: { icon: "🫓", label: "Dough", color: 0xf5d392 },
  sauce: { icon: "🍅", label: "Sauce", color: 0xe87564 },
  cheese: { icon: "🧀", label: "Cheese", color: 0xffd666 },
  strawberry: { icon: "🍓", label: "Strawberry", color: 0xf58b9f },
  pickle: { icon: "🥒", label: "Pickle", color: 0x9ecf89 },
  marshmallow: { icon: "☁️", label: "Marshmallow", color: 0xffffff },
});
export const PIZZA = Object.freeze({
  id: "strawberry-pizza",
  requiredIngredients: ["dough", "sauce", "cheese", "strawberry"],
});
export const COOK_MS = 2200;
