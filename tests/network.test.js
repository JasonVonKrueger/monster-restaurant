import test from "node:test";
import assert from "node:assert/strict";
import { io } from "socket.io-client";
import { createApp } from "../server/src/app.js";
import { EVENTS } from "../shared/events.js";
const once = (socket, event) =>
  new Promise((resolve) => socket.once(event, resolve));
const send = (socket, event, data) =>
  new Promise((resolve, reject) =>
    socket
      .timeout(2000)
      .emit(event, data, (err, result) =>
        err ? reject(err) : resolve(result),
      ),
  );
test(
  "two real sockets share effects, isolate rooms and reconnect securely",
  { timeout: 10000 },
  async () => {
    const app = createApp();
    await new Promise((resolve) => app.http.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${app.http.address().port}`;
    const clients = [];
    const connect = async () => {
      const s = io(url, { transports: ["websocket"], forceNew: true });
      clients.push(s);
      await once(s, "connect");
      return s;
    };
    try {
      const a = await connect(),
        b = await connect(),
        outsider = await connect();
      assert.equal(
        (await send(outsider, EVENTS.ACTION, { type: "BOUNCE", actionId: "x" }))
          .ok,
        false,
      );
      const created = await send(a, EVENTS.CREATE, {
        name: "Raelyn",
        role: "dining",
      });
      assert.equal(created.ok, true);
      const joined = await send(b, EVENTS.JOIN, {
        code: created.state.code,
        name: "Cooper",
        role: "kitchen",
      });
      assert.equal(joined.state.players.length, 2);
      const effectA = once(a, EVENTS.EFFECT),
        effectB = once(b, EVENTS.EFFECT);
      assert.equal(
        (await send(a, EVENTS.ACTION, { actionId: "bounce-1", type: "BOUNCE" }))
          .ok,
        true,
      );
      assert.equal((await effectA).type, "BOUNCE");
      assert.equal((await effectB).type, "BOUNCE");
      assert.equal(app.rooms.get(created.state.code).bounces, 1);
      await send(a, EVENTS.ACTION, { actionId: "bounce-1", type: "BOUNCE" });
      assert.equal(app.rooms.get(created.state.code).bounces, 1);
      const disconnected = once(b, EVENTS.STATE);
      a.disconnect();
      assert.equal(
        (await disconnected).players.find((p) => p.id === created.playerId)
          .connected,
        false,
      );
      const back = await connect();
      const resumed = await send(back, EVENTS.RESUME, {
        code: created.state.code,
        token: created.token,
      });
      assert.equal(resumed.playerId, created.playerId);
      const invalid = await send(outsider, EVENTS.RESUME, {
        code: created.state.code,
        token: joined.playerId,
      });
      assert.equal(invalid.ok, false);
    } finally {
      clients.forEach((s) => s.disconnect());
      await app.close();
    }
  },
);

function untilState(socket, predicate) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      socket.off(EVENTS.STATE, onState);
    };
    const onState = (state) => {
      if (predicate(state)) {
        cleanup();
        resolve(state);
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Expected game snapshot did not arrive"));
    }, 5000);
    socket.on(EVENTS.STATE, onState);
  });
}
test(
  "pizza loop synchronizes both roles, survives cooking reconnect, and isolates another room",
  { timeout: 15000 },
  async () => {
    const app = createApp();
    await new Promise((resolve) => app.http.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${app.http.address().port}`,
      clients = [];
    const connect = async () => {
      const s = io(url, { transports: ["websocket"], forceNew: true });
      clients.push(s);
      await once(s, "connect");
      return s;
    };
    try {
      const dining = await connect(),
        kitchen = await connect(),
        other = await connect();
      const created = await send(dining, EVENTS.CREATE, {
        name: "Raelyn",
        role: "dining",
      });
      const joined = await send(kitchen, EVENTS.JOIN, {
        code: created.state.code,
        name: "Cooper",
        role: "kitchen",
      });
      const otherRoom = await send(other, EVENTS.CREATE, {
        name: "Raelyn",
        role: "dining",
      });
      let foreignEffects = 0;
      other.on(EVENTS.EFFECT, () => foreignEffects++);
      let serial = 0;
      const act = async (
        socket,
        type,
        payload = {},
        actionId = `network-${++serial}`,
      ) => {
        const result = await send(socket, EVENTS.ACTION, {
          actionId,
          type,
          payload: {
            orderId: app.rooms.get(created.state.code).game?.order.id,
            ...payload,
          },
        });
        assert.equal(result.ok, true, result.message);
        return result;
      };
      const hugA = once(dining, EVENTS.EFFECT),
        hugB = once(kitchen, EVENTS.EFFECT);
      const beforeHug = app.rooms.snapshot(app.rooms.get(created.state.code));
      const hugResult = await send(dining, EVENTS.ACTION, {
        type: "HUG",
        actionId: "shared-hug",
        playerId: joined.playerId,
      });
      assert.equal(hugResult.ok, true);
      const [sentHug, receivedHug] = await Promise.all([hugA, hugB]);
      assert.equal(sentHug.type, "HUG");
      assert.equal(receivedHug.type, "HUG");
      assert.equal(receivedHug.playerId, created.playerId);
      assert.deepEqual(
        app.rooms.snapshot(app.rooms.get(created.state.code)),
        beforeHug,
      );
      let repeatedHugs = 0;
      dining.on(EVENTS.EFFECT, (e) => {
        if (e.type === "HUG") repeatedHugs++;
      });
      assert.equal(
        (
          await send(dining, EVENTS.ACTION, {
            type: "HUG",
            actionId: "shared-hug",
          })
        ).ok,
        true,
      );
      assert.equal(
        (
          await send(dining, EVENTS.ACTION, {
            type: "HUG",
            actionId: "too-soon",
          })
        ).ok,
        false,
      );
      await act(dining, "START");
      await act(dining, "WELCOME");
      await act(dining, "SEND_ORDER");
      for (const ingredientId of ["dough", "sauce", "cheese", "strawberry"])
        await act(kitchen, "ADD_INGREDIENT", { ingredientId });
      const ready = untilState(
        dining,
        (s) => s.game?.order.status === "READY_TO_DELIVER",
      );
      await act(kitchen, "COOK");
      const disconnected = untilState(
        dining,
        (s) => !s.players.find((p) => p.id === joined.playerId).connected,
      );
      kitchen.disconnect();
      await disconnected;
      await ready;
      const kitchenBack = await connect();
      const resumed = await send(kitchenBack, EVENTS.RESUME, {
        code: created.state.code,
        token: joined.token,
      });
      assert.equal(resumed.state.game.order.status, "READY_TO_DELIVER");
      await act(kitchenBack, "DELIVER");
      const servedA = untilState(
          dining,
          (s) => s.game?.order.status === "COMPLETE",
        ),
        servedB = untilState(
          kitchenBack,
          (s) => s.game?.order.status === "COMPLETE",
        );
      await act(dining, "SERVE", {}, "network-serve");
      const [a, b] = await Promise.all([servedA, servedB]);
      assert.deepEqual(a.game, b.game);
      assert.equal(a.game.stars, 3);
      assert.equal(a.game.coins, 5);
      await act(dining, "SERVE", {}, "network-serve");
      assert.equal(app.rooms.get(created.state.code).game.stars, 3);
      await act(dining, "NEXT_CUSTOMER");
      assert.equal(
        app.rooms.get(created.state.code).game.order.status,
        "CUSTOMER_ARRIVED",
      );
      assert.equal(repeatedHugs, 0);
      assert.equal(foreignEffects, 0);
      assert.equal(app.rooms.get(otherRoom.state.code).game, undefined);
    } finally {
      clients.forEach((s) => s.disconnect());
      await app.close();
    }
  },
);
