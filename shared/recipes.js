export const INGREDIENTS = Object.freeze({
  dough: { icon: "🫓", label: "Dough", color: 0xf5d392 },
  sauce: { icon: "🍅", label: "Sauce", color: 0xe87564 },
  cheese: { icon: "🧀", label: "Cheese", color: 0xffd666 },
  strawberry: { icon: "🍓", label: "Strawberry", color: 0xf58b9f },
  lemon: { icon: "🍋", label: "Lemon", color: 0xfff176 },
  cookie: { icon: "🍪", label: "Cookie", color: 0xc68a4e },
  fish: { icon: "🐟", label: "Fish", color: 0x7fb8e6 },
  banana: { icon: "🍌", label: "Banana", color: 0xffe066 },
  grapes: { icon: "🍇", label: "Grapes", color: 0x9b6bd6 },
});
// Every pizza starts with crust, sauce and cheese, in that order; then each monster
// asks for one topping, picked fresh for every order.
const BASE_INGREDIENTS = Object.freeze(["dough", "sauce", "cheese"]);
export const TOPPINGS = Object.freeze([
  "strawberry",
  "lemon",
  "cookie",
  "fish",
  "banana",
  "grapes",
]);
export const pizzaIngredients = (topping) => [...BASE_INGREDIENTS, topping];
export const COOK_MS = 2200;
// How long a monster reads the menu before it is ready to order.
export const MENU_READ_MS = 3000;
