// The monster customers. Each id has a five-frame sprite sheet at
// /assets/monsters/<id>/sheet.png (idle, blink, wave, chomp, happy).
export const MONSTERS = Object.freeze([
  { id: "bubbles", name: "Bubbles" },
  { id: "mo", name: "Mo" },
  { id: "fizz", name: "Fizz" },
  { id: "gloop", name: "Gloop" },
  { id: "puff", name: "Puff" },
  { id: "zuzu", name: "Zuzu" },
  { id: "tok", name: "Tok" },
  { id: "wiggles", name: "Wiggles" },
]);
export const monsterName = (id) =>
  MONSTERS.find((m) => m.id === id)?.name || "Bubbles";
