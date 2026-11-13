import test from "node:test";
import assert from "node:assert/strict";
import { Rooms } from "../server/src/rooms.js";
import { advanceTimers } from "../server/src/game/restaurant.js";
import { COOK_MS, MENU_READ_MS, PIZZA } from "../shared/recipes.js";
import { MONSTERS } from "../shared/monsters.js";
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
  const order = () => {
    act(dining, "WELCOME");
    act(dining, "GIVE_MENU");
    time += MENU_READ_MS;
    advanceTimers(room, time);
    act(dining, "SEND_ORDER");
  };
  const prepare = () => {
    act(dining, "START");
    order();
    for (const ingredientId of PIZZA.requiredIngredients)
      act(kitchen, "ADD_INGREDIENT", { ingredientId });
  };
  return {
    rooms,
    room,
    dining,
    kitchen,
    act,
    order,
    prepare,
    advance: (ms) => {
      time += ms;
      return advanceTimers(room, time);
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
  const { room, dining, kitchen, act, order } = setup();
  assert.throws(() => act(kitchen, "START"), /friend/);
  act(dining, "START");
  assert.throws(() => act(kitchen, "DELIVER"), /little step/);
  assert.throws(() => act(dining, "SERVE"), /little step/);
  assert.throws(
    () => act(kitchen, "ADD_INGREDIENT", { ingredientId: "dough" }),
    /little step/,
  );
  order();
  assert.throws(
    () => act(dining, "ADD_INGREDIENT", { ingredientId: "dough" }),
    /friend/,
  );
  assert.throws(
    () => act(kitchen, "ADD_INGREDIENT", { ingredientId: "lemon" }),
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
  const { room, rooms, dining, kitchen, act, advance, order } = setup();
  rooms.disconnect(room.code, kitchen.id, "k");
  assert.throws(() => act(dining, "START"), /Invite/);
  rooms.resume({ code: room.code, token: kitchen.token }, "k2");
  act(dining, "START");
  order();
  for (const ingredientId of PIZZA.requiredIngredients)
    act(kitchen, "ADD_INGREDIENT", { ingredientId });
  act(kitchen, "COOK");
  advance(COOK_MS);
  act(kitchen, "DELIVER");
  act(dining, "SERVE", { stars: 999, coins: 999, role: "kitchen" });
  assert.equal(room.game.stars, 3);
  assert.equal(room.game.coins, 5);
});

test("each visit brings one of the five monsters, never the same one twice in a row", () => {
  const { room, dining, act } = setup();
  const ids = MONSTERS.map((m) => m.id);
  assert.equal(ids.length, 5);
  act(dining, "START");
  const seen = [room.game.order.monsterId];
  for (let visit = 0; visit < 60; visit++) {
    // Skip straight to a finished order; the full loop is covered above.
    room.game.order.status = "COMPLETE";
    assert.equal(act(dining, "NEXT_CUSTOMER"), true);
    const id = room.game.order.monsterId;
    assert.ok(ids.includes(id));
    assert.notEqual(id, seen.at(-1));
    seen.push(id);
  }
  assert.deepEqual(new Set(seen), new Set(ids));
});

test("the monster reads the menu on the server clock before the order can be sent", () => {
  const { room, rooms, dining, kitchen, act, advance } = setup();
  act(dining, "START");
  assert.throws(() => act(dining, "GIVE_MENU"), /little step/);
  act(dining, "WELCOME");
  assert.throws(() => act(dining, "SEND_ORDER"), /little step/);
  assert.throws(() => act(kitchen, "GIVE_MENU"), /friend/);
  act(dining, "GIVE_MENU", {}, "menu");
  assert.equal(room.game.order.status, "READING_MENU");
  assert.equal(act(dining, "GIVE_MENU", {}, "menu"), false);
  assert.throws(() => act(dining, "SEND_ORDER"), /little step/);
  // A refresh while reading does not interrupt the server's timer.
  rooms.disconnect(room.code, dining.id, "d");
  assert.equal(advance(MENU_READ_MS - 1), false);
  assert.equal(advance(1), true);
  assert.equal(room.game.order.status, "READY_TO_ORDER");
  rooms.resume({ code: room.code, token: dining.token }, "d2");
  act(dining, "SEND_ORDER");
  assert.equal(room.game.order.status, "ORDER_SENT");
});

test("the monster's waiting clock restarts on every step, but not on hugs or bounces", () => {
  const { room, dining, kitchen, act, advance } = setup();
  act(dining, "START");
  const arrived = room.game.order.waitingSince;
  advance(5000);
  act(dining, "HUG");
  act(kitchen, "BOUNCE");
  assert.equal(room.game.order.waitingSince, arrived);
  act(dining, "WELCOME");
  assert.equal(room.game.order.waitingSince, arrived + 5000);
  act(dining, "GIVE_MENU");
  advance(MENU_READ_MS);
  assert.equal(room.game.order.status, "READY_TO_ORDER");
  const read = room.game.order.waitingSince;
  assert.equal(read, arrived + 5000 + MENU_READ_MS);
  advance(40000);
  act(dining, "SEND_ORDER");
  act(kitchen, "ADD_INGREDIENT", { ingredientId: "dough" });
  assert.equal(room.game.order.waitingSince, read + 40000);
  assert.throws(() => act(kitchen, "ADD_INGREDIENT", { ingredientId: "fish" }));
  assert.equal(room.game.order.waitingSince, read + 40000);
  assert.equal(room.game.stars, 0);
});
