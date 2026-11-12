import test from "node:test";
import assert from "node:assert/strict";
import { Rooms } from "../server/src/rooms.js";
import { RECONNECT_MS } from "../shared/constants.js";
const dining = { name: "Raelyn", role: "dining" };
const kitchen = { name: "Cooper", role: "kitchen" };
test("room creation, membership, roles, capacity and token privacy", () => {
  const rooms = new Rooms();
  const { room, player } = rooms.create(dining, "a");
  assert.match(room.code, /^[A-Z2-9]{5}$/);
  assert.throws(
    () => rooms.join({ ...dining, code: room.code }, "b"),
    /already here/,
  );
  assert.throws(
    () => rooms.join({ ...kitchen, role: "dining", code: room.code }, "b"),
    /role is taken/,
  );
  rooms.join({ ...kitchen, code: room.code }, "b");
  assert.throws(
    () => rooms.join({ ...kitchen, code: room.code }, "c"),
    /two friends/,
  );
  assert.throws(
    () => rooms.resume({ code: room.code, token: "fake" }, "c"),
    /join/,
  );
  assert.throws(
    () => rooms.resume({ code: room.code, token: player.token }, "c"),
    /already connected/,
  );
  assert.equal(
    JSON.stringify(rooms.snapshot(room)).includes(player.token),
    false,
  );
  assert.throws(
    () => rooms.create({ name: "Other", role: "kitchen" }, "c"),
    /Choose/,
  );
});
test("authoritative action validation, duplicate handling and cooldown", () => {
  let now = 0;
  const rooms = new Rooms({ now: () => now });
  const { room, player } = rooms.create(dining, "a");
  assert.throws(
    () =>
      rooms.action(room, player, { actionId: "1", type: "REWARD", coins: 999 }),
    /Try/,
  );
  assert.equal(
    rooms.action(room, player, { actionId: "1", type: "BOUNCE" }),
    true,
  );
  assert.equal(
    rooms.action(room, player, { actionId: "1", type: "BOUNCE" }),
    false,
  );
  assert.throws(
    () => rooms.action(room, player, { actionId: "2", type: "BOUNCE" }),
    /rest/,
  );
  now = 600;
  assert.equal(
    rooms.action(room, player, { actionId: "2", type: "BOUNCE" }),
    true,
  );
  assert.equal(room.bounces, 2);
  rooms.disconnect(room.code, player.id, "a");
  assert.throws(
    () => rooms.action(room, player, { actionId: "3", type: "BOUNCE" }),
    /reconnect/,
  );
});
test("reconnection restores identity and expires abandoned slots", () => {
  let now = 0;
  const rooms = new Rooms({ now: () => now });
  const { room, player } = rooms.create(dining, "a");
  rooms.disconnect(room.code, player.id, "a");
  const resumed = rooms.resume({ code: room.code, token: player.token }, "new");
  assert.equal(resumed.player.id, player.id);
  rooms.disconnect(room.code, player.id, "a");
  assert.equal(player.connected, true);
  rooms.disconnect(room.code, player.id, "new");
  now = RECONNECT_MS + 1;
  assert.throws(
    () => rooms.resume({ code: room.code, token: player.token }, "later"),
    /resting/,
  );
  assert.equal(rooms.rooms.size, 0);
});
