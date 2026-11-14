import { randomBytes, randomInt, randomUUID } from "node:crypto";
import {
  NAMES,
  ROLES,
  RECONNECT_MS,
  HUG_COOLDOWN_MS,
} from "../../shared/constants.js";
import {
  GAME_ACTIONS,
  applyGameAction,
  advanceTimers,
} from "./game/restaurant.js";
const fail = (message) => {
  throw new Error(message);
};
export class Rooms {
  constructor({ now = Date.now } = {}) {
    this.rooms = new Map();
    this.now = now;
  }
  sweep() {
    for (const [code, room] of this.rooms) {
      for (const [id, p] of room.players)
        if (!p.connected && this.now() - p.lastSeen >= RECONNECT_MS)
          room.players.delete(id);
      if (!room.players.size) this.rooms.delete(code);
    }
  }
  get(code) {
    this.sweep();
    return (
      this.rooms.get(code) ||
      fail("That restaurant is resting. Please create a new one.")
    );
  }
  create(input, socketId) {
    this.sweep();
    if (this.rooms.size >= 1000)
      fail("The restaurants are full. Please try again later.");
    let code;
    do {
      code = Array.from(
        { length: 4 },
        () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[randomInt(32)],
      ).join("");
    } while (this.rooms.has(code));
    const room = { code, players: new Map(), bounces: 0 };
    this.rooms.set(code, room);
    try {
      return this.add(room, input, socketId);
    } catch (error) {
      this.rooms.delete(code);
      throw error;
    }
  }
  join(input, socketId) {
    if (typeof input.code !== "string" || !/^[A-Z2-9]{4}$/.test(input.code))
      fail("Please check the four-letter room code.");
    return this.add(this.get(input.code), input, socketId);
  }
  add(room, { name, role }, socketId) {
    if (!NAMES.includes(name) || !Object.values(ROLES).includes(role))
      fail("Choose a player and a role.");
    if (room.players.size >= 2)
      fail("This restaurant already has two friends.");
    if ([...room.players.values()].some((p) => p.name === name))
      fail("That player is already here. Choose the other friend.");
    if ([...room.players.values()].some((p) => p.role === role))
      fail("That role is taken. Choose the other role.");
    const player = {
      id: randomUUID(),
      token: randomBytes(32).toString("hex"),
      name,
      role,
      socketId,
      connected: true,
      lastSeen: this.now(),
      actions: new Set(),
      lastBounce: -Infinity,
      lastHug: -Infinity,
    };
    room.players.set(player.id, player);
    return { room, player };
  }
  resume({ code, token }, socketId) {
    const room = this.get(code);
    const player = [...room.players.values()].find(
      (p) => typeof token === "string" && p.token === token,
    );
    if (!player) fail("Please join your restaurant again.");
    if (player.connected && player.socketId !== socketId)
      fail("This player is already connected.");
    Object.assign(player, { socketId, connected: true, lastSeen: this.now() });
    return { room, player };
  }
  disconnect(code, id, socketId) {
    const player = this.rooms.get(code)?.players.get(id);
    if (player?.socketId === socketId)
      Object.assign(player, { connected: false, lastSeen: this.now() });
  }
  snapshot(room) {
    return {
      code: room.code,
      bounces: room.bounces,
      game: room.game ? structuredClone(room.game) : null,
      players: [...room.players.values()].map(
        ({ id, name, role, connected }) => ({ id, name, role, connected }),
      ),
    };
  }
  action(room, player, input) {
    if (
      !input ||
      typeof input.actionId !== "string" ||
      input.actionId.length > 80 ||
      !input.actionId.length ||
      (!["BOUNCE", "HUG"].includes(input.type) && !GAME_ACTIONS.has(input.type))
    )
      fail("Try the bounce button again.");
    if (!player.connected || room.players.get(player.id) !== player)
      fail("Please reconnect first.");
    if (player.actions.has(input.actionId)) return false;
    if (input.type === "BOUNCE") {
      if (this.now() - player.lastBounce < 500)
        fail("Give Bubbles a tiny rest!");
      player.lastBounce = this.now();
      room.bounces++;
    } else if (input.type === "HUG") {
      if (this.now() - player.lastHug < HUG_COOLDOWN_MS)
        fail("Another hug in a little moment.");
      player.lastHug = this.now();
    } else {
      advanceTimers(room, this.now());
      applyGameAction(room, player, input, this.now());
    }
    player.actions.add(input.actionId);
    if (player.actions.size > 2048)
      player.actions.delete(player.actions.values().next().value);
    return true;
  }
}
