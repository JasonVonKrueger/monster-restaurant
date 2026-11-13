export const INGREDIENTS = Object.freeze({
  dough: { icon: "🫓", label: "Dough", color: 0xf5d392 },
  sauce: { icon: "🍅", label: "Sauce", color: 0xe87564 },
  cheese: { icon: "🧀", label: "Cheese", color: 0xffd666 },
  strawberry: { icon: "🍓", label: "Strawberry", color: 0xf58b9f },
  lemon: { icon: "🍋", label: "Lemon", color: 0xfff176 },
  cookie: { icon: "🍪", label: "Cookie", color: 0xc68a4e },
  fish: { icon: "🐟", label: "Fish", color: 0x7fb8e6 },
});
export const PIZZA = Object.freeze({
  id: "strawberry-pizza",
  requiredIngredients: ["dough", "sauce", "cheese", "strawberry"],
});
export const COOK_MS = 2200;
// How long a monster reads the menu before it is ready to order.
export const MENU_READ_MS = 3000;
