import test from "node:test";
import assert from "node:assert/strict";
import { Rooms } from "../server/src/rooms.js";
import { advanceCooking } from "../server/src/game/restaurant.js";
import { COOK_MS, PIZZA } from "../shared/recipes.js";
function setup() {
  let time = 1000,
    serial = 0;
  const rooms = new Rooms({ now: () => time });
  const { room, player: dining } = rooms.create(
    { name: "Raelyn", role: "dining" },
    "d",
  );
  const { player: kitchen } = rooms.join(
    { code: room.code, name: "Cooper", role: "kitchen" },
    "k",
  );
  const act = (player, type, payload = {}, actionId = `action-${++serial}`) =>
    rooms.action(room, player, {
      type,
      actionId,
      payload: { orderId: room.game?.order.id, ...payload },
    });
  const prepare = () => {
    act(dining, "START");
    act(dining, "WELCOME");
    act(dining, "SEND_ORDER");
    for (const ingredientId of PIZZA.requiredIngredients)
      act(kitchen, "ADD_INGREDIENT", { ingredientId });
  };
  return {
    rooms,
    room,
    dining,
    kitchen,
    act,
    prepare,
    advance: (ms) => {
      time += ms;
      return advanceCooking(room, time);
    },
  };
}
test("full pizza loop awards shared rewards once and starts a fresh order", () => {
  const { room, dining, kitchen, act, prepare, advance, rooms } = setup();
  prepare();
  const id = room.game.order.id;
  act(kitchen, "COOK");
  assert.equal(room.game.order.status, "COOKING");
  assert.equal(advance(COOK_MS - 1), false);
  assert.equal(advance(1), true);
  assert.equal(room.game.order.status, "READY_TO_DELIVER");
  act(kitchen, "DELIVER");
  assert.equal(room.game.order.status, "DELIVERED");
  act(dining, "SERVE", {}, "serve-once");
  act(dining, "SERVE", {}, "serve-once");
  assert.equal(room.game.stars, 3);
  assert.equal(room.game.coins, 5);
  assert.equal(room.game.completedOrders, 1);
  assert.throws(() => act(dining, "SERVE"), /little step/);
  const snapshot = rooms.snapshot(room);
  snapshot.game.order.addedIngredients.length = 0;
  assert.equal(room.game.order.addedIngredients.length, 4);
  act(dining, "NEXT_CUSTOMER");
  assert.notEqual(room.game.order.id, id);
  assert.equal(room.game.order.status, "CUSTOMER_ARRIVED");
  assert.equal(room.game.stars, 3);
  assert.throws(() => act(dining, "WELCOME", { orderId: id }), /new customer/);
});
test("roles, legal transitions and ingredients are validated without punishing mistakes", () => {
  const { room, dining, kitchen, act } = setup();
  assert.throws(() => act(kitchen, "START"), /friend/);
  act(dining, "START");
  assert.throws(() => act(kitchen, "DELIVER"), /little step/);
  assert.throws(() => act(dining, "SERVE"), /little step/);
  assert.throws(
    () => act(kitchen, "ADD_INGREDIENT", { ingredientId: "dough" }),
    /little step/,
  );
  act(dining, "WELCOME");
  act(dining, "SEND_ORDER");
  assert.throws(
    () => act(dining, "ADD_INGREDIENT", { ingredientId: "dough" }),
    /friend/,
  );
  assert.throws(
    () => act(kitchen, "ADD_INGREDIENT", { ingredientId: "pickle" }),
    /silly pizza/,
  );
  assert.throws(
    () => act(kitchen, "ADD_INGREDIENT", { ingredientId: "__proto__" }),
    /Choose/,
  );
  assert.deepEqual(room.game.order.addedIngredients, []);
  act(kitchen, "ADD_INGREDIENT", { ingredientId: "dough" });
  assert.throws(() => act(kitchen, "COOK"), /glowing/);
  assert.equal(room.game.order.status, "PREPARING");
  assert.equal(room.game.stars, 0);
});
test("disconnect during cooking does not prevent completion or duplicate rewards after resume", () => {
  const { room, rooms, dining, kitchen, act, prepare, advance } = setup();
  prepare();
  act(kitchen, "COOK");
  rooms.disconnect(room.code, kitchen.id, "k");
  advance(COOK_MS);
  const resumed = rooms.resume({ code: room.code, token: kitchen.token }, "k2");
  assert.equal(resumed.player.role, "kitchen");
  assert.equal(rooms.snapshot(room).game.order.status, "READY_TO_DELIVER");
  act(kitchen, "DELIVER");
  rooms.disconnect(room.code, dining.id, "d");
  rooms.resume({ code: room.code, token: dining.token }, "d2");
  act(dining, "SERVE", {}, "serve");
  rooms.disconnect(room.code, dining.id, "d2");
  rooms.resume({ code: room.code, token: dining.token }, "d3");
  act(dining, "SERVE", {}, "serve");
  assert.equal(room.game.stars, 3);
});
test("start waits for two connected players; malicious payloads cannot choose rewards", () => {
  const { room, rooms, dining, kitchen, act, advance } = setup();
  rooms.disconnect(room.code, kitchen.id, "k");
  assert.throws(() => act(dining, "START"), /Invite/);
  rooms.resume({ code: room.code, token: kitchen.token }, "k2");
  act(dining, "START");
  act(dining, "WELCOME");
  act(dining, "SEND_ORDER");
  for (const ingredientId of PIZZA.requiredIngredients)
    act(kitchen, "ADD_INGREDIENT", { ingredientId });
  act(kitchen, "COOK");
  advance(COOK_MS);
  act(kitchen, "DELIVER");
  act(dining, "SERVE", { stars: 999, coins: 999, role: "kitchen" });
  assert.equal(room.game.stars, 3);
  assert.equal(room.game.coins, 5);
});
