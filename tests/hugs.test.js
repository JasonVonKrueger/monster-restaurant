import test from "node:test";
import assert from "node:assert/strict";
import { Rooms } from "../server/src/rooms.js";
import { HUG_COOLDOWN_MS } from "../shared/constants.js";
import { COOK_MS, MENU_READ_MS } from "../shared/recipes.js";
import { advanceTimers } from "../server/src/game/restaurant.js";
test("hugs work in the lobby and every order phase without changing game state", () => {
  let now = 1000,
    id = 0;
  const rooms = new Rooms({ now: () => now });
  const { room, player: dining } = rooms.create(
    { name: "Raelyn", role: "dining" },
    "d",
  );
  const { player: kitchen } = rooms.join(
    { code: room.code, name: "Cooper", role: "kitchen" },
    "k",
  );
  const act = (player, type, payload = {}) =>
    rooms.action(room, player, {
      type,
      actionId: `action-${++id}`,
      payload: { orderId: room.game?.order.id, ...payload },
    });
  const hug = () => {
    const before = rooms.snapshot(room);
    now += HUG_COOLDOWN_MS;
    act(dining, "HUG");
    act(kitchen, "HUG");
    assert.deepEqual(rooms.snapshot(room), before);
  };
  hug();
  act(dining, "START");
  hug();
  act(dining, "WELCOME");
  hug();
  act(dining, "GIVE_MENU");
  hug();
  assert.equal(room.game.order.status, "READING_MENU");
  advanceTimers(room, now + MENU_READ_MS);
  hug();
  act(dining, "SEND_ORDER");
  hug();
  for (const ingredientId of room.game.order.requiredIngredients) {
    act(kitchen, "ADD_INGREDIENT", { ingredientId });
    hug();
  }
  act(kitchen, "COOK");
  hug();
  assert.equal(room.game.order.status, "COOKING");
  advanceTimers(room, now + COOK_MS);
  hug();
  act(kitchen, "DELIVER");
  hug();
  act(dining, "SERVE");
  hug();
  assert.equal(room.game.stars, 3);
});
test("hugs enforce membership, deduplication and a reconnect-safe per-player cooldown", () => {
  let now = 0;
  const rooms = new Rooms({ now: () => now });
  const { room, player } = rooms.create(
    { name: "Raelyn", role: "dining" },
    "a",
  );
  const action = { type: "HUG", actionId: "hug-1" };
  assert.equal(rooms.action(room, player, action), true);
  assert.equal(rooms.action(room, player, action), false);
  assert.throws(
    () => rooms.action(room, player, { type: "HUG", actionId: "hug-2" }),
    /little moment/,
  );
  rooms.disconnect(room.code, player.id, "a");
  assert.throws(
    () => rooms.action(room, player, { type: "HUG", actionId: "hug-2" }),
    /reconnect/,
  );
  rooms.resume({ code: room.code, token: player.token }, "b");
  assert.throws(
    () => rooms.action(room, player, { type: "HUG", actionId: "hug-2" }),
    /little moment/,
  );
  now = HUG_COOLDOWN_MS;
  assert.equal(
    rooms.action(room, player, { type: "HUG", actionId: "hug-2" }),
    true,
  );
  assert.throws(
    () =>
      rooms.action(
        room,
        { ...player, id: "intruder" },
        { type: "HUG", actionId: "stolen" },
      ),
    /reconnect/,
  );
  assert.equal(room.bounces, 0);
});
