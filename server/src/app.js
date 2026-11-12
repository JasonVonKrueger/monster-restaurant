import { advanceCooking } from "./game/restaurant.js";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { fileURLToPath } from "node:url";
import { Rooms } from "./rooms.js";
import { EVENTS } from "../../shared/events.js";
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.get("/health", (_req, res) => res.json({ ok: true }));
  const dist = fileURLToPath(new URL("../../client/dist/", import.meta.url));
  app.use(express.static(dist));
  const http = createServer(app);
  const io = new Server(http, { maxHttpBufferSize: 8192 });
  const rooms = new Rooms();
  const publish = (room) =>
    io.to(room.code).emit(EVENTS.STATE, rooms.snapshot(room));
  const cleanup = setInterval(() => {
    rooms.sweep();
    for (const room of rooms.rooms.values()) publish(room);
  }, 30000);
  cleanup.unref();
  const cooking = setInterval(() => {
    for (const room of rooms.rooms.values())
      if (advanceCooking(room, Date.now())) publish(room);
  }, 100);
  cooking.unref();
  io.on("connection", (socket) => {
    let membership;
    let requests = [];
    const handle = (event, fn) =>
      socket.on(event, (input, ack) => {
        try {
          const now = Date.now();
          requests = requests.filter((t) => now - t < 10000);
          if (requests.length >= 30)
            throw new Error("A little pause, then try again.");
          requests.push(now);
          const result = fn(input && typeof input === "object" ? input : {});
          if (typeof ack === "function") ack({ ok: true, ...result });
        } catch (error) {
          if (typeof ack === "function")
            ack({ ok: false, message: error.message });
        }
      });
    for (const [event, method] of [
      [EVENTS.CREATE, "create"],
      [EVENTS.JOIN, "join"],
      [EVENTS.RESUME, "resume"],
    ])
      handle(event, (input) => {
        if (membership) throw new Error("You already joined a restaurant.");
        membership = rooms[method](input, socket.id);
        socket.join(membership.room.code);
        publish(membership.room);
        return {
          state: rooms.snapshot(membership.room),
          playerId: membership.player.id,
          token: membership.player.token,
        };
      });
    handle(EVENTS.ACTION, (input) => {
      if (!membership) throw new Error("Join a restaurant first.");
      const { room, player } = membership;
      if (rooms.action(room, player, input)) {
        if (input.type !== "HUG") publish(room);
        io.to(room.code).emit(EVENTS.EFFECT, {
          type: input.type,
          playerId: player.id,
          ingredientId:
            input.type === "ADD_INGREDIENT"
              ? input.payload.ingredientId
              : undefined,
        });
      }
      return {};
    });
    handle(EVENTS.LEAVE, () => {
      if (membership) {
        const { room, player } = membership;
        room.players.delete(player.id);
        socket.leave(room.code);
        publish(room);
        membership = undefined;
        rooms.sweep();
      }
      return {};
    });
    socket.on("disconnect", () => {
      if (membership) {
        const { room, player } = membership;
        rooms.disconnect(room.code, player.id, socket.id);
        publish(room);
      }
    });
  });
  return {
    http,
    io,
    rooms,
    close: () => {
      clearInterval(cleanup);
      clearInterval(cooking);
      return new Promise((resolve) => io.close(resolve));
    },
  };
}
