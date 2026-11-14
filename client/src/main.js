import Phaser from "phaser";
import { AudioManager } from "./managers/AudioManager.js";
import { connectAudioSettings } from "./managers/audioSettings.js";
import { HUG_COOLDOWN_MS } from "../../shared/constants.js";
import "./style.css";
import { livenLandingMonsters } from "./landingMonsters.js";
import { DiningScene } from "./scenes/DiningScene.js";
import { KitchenScene } from "./scenes/KitchenScene.js";
import { socket, request } from "./networking/connection.js";
import { EVENTS } from "../../shared/events.js";
import { WIDTH, HEIGHT } from "../../shared/constants.js";
const $ = (id) => document.getElementById(id);
const audio = new AudioManager();
connectAudioSettings(audio);
document.addEventListener("pointerdown", () => audio.unlock(), {
  capture: true,
});
document.addEventListener("keydown", () => audio.unlock(), { capture: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) audio.stop();
});
let hugUntil = 0,
  hugPending = false;
let session,
  state,
  game,
  busy = false;
try {
  session = JSON.parse(sessionStorage.getItem("monster-session"));
} catch {
  session = undefined;
}
const save = () => {
  try {
    session
      ? sessionStorage.setItem("monster-session", JSON.stringify(session))
      : sessionStorage.removeItem("monster-session");
  } catch {
    /* The current connection still works without storage. */
  }
};
const message = (text) => {
  $("message").textContent = text;
};
const inviteCode = new URL(location.href).searchParams.get("room");
if (inviteCode) $("room-code").value = inviteCode;
function render(next) {
  state = next;
  $("welcome").hidden = true;
  $("play").hidden = false;
  $("play").classList.toggle("in-game", Boolean(state.game));
  // Showing or hiding the room code changes the space left for the game.
  game?.scale.getParentBounds();
  game?.scale.refresh();
  $("code").textContent = state.code;
  $("connection").textContent = !socket.connected
    ? "Finding your friends…"
    : state.players.length < 2
      ? "Invite your friend — you can play while you wait."
      : state.players.every((p) => p.connected)
        ? ""
        : "Your friend will be back. Bubbles is here to play.";
  if (!game)
    game = new Phaser.Game({
      type: Phaser.CANVAS,
      fps: { target: 30, forceSetTimeOut: true },
      parent: "game",
      width: WIDTH,
      height: HEIGHT,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene:
        session &&
        state.players.find((p) => p.id === session.playerId)?.role === "kitchen"
          ? [KitchenScene]
          : [DiningScene],
      callbacks: {
        preBoot: (game) => {
          game.registry.set("snapshot", state);
          game.registry.set("online", socket.connected);
          game.registry.set("sendAction", sendAction);
          game.registry.set("sendHug", sendHug);
          game.registry.set("hugUntil", hugUntil);
          game.registry.set("audio", audio);
        },
      },
      render: { antialias: true },
    });
  else {
    game.registry.set("snapshot", state);
    game.registry.set("online", socket.connected);
    window.dispatchEvent(new Event("restaurant:state"));
  }
}
async function enter(event) {
  if (busy) return;
  busy = true;
  message("");
  const data = Object.fromEntries(new FormData($("room-form")));
  data.code = $("room-code").value.trim().toUpperCase();
  try {
    const result = await request(event, data);
    session = {
      code: result.state.code,
      token: result.token,
      playerId: result.playerId,
    };
    save();
    render(result.state);
  } catch (error) {
    message(error.message);
  } finally {
    busy = false;
  }
}
$("room-form").addEventListener("submit", (event) => {
  event.preventDefault();
  enter(EVENTS.CREATE);
});
$("join").onclick = () => enter(EVENTS.JOIN);
// Resolves true when the server accepted the action, false otherwise.
async function sendAction(type, payload = {}) {
  if (busy) return false;
  busy = true;
  try {
    await request(EVENTS.ACTION, {
      type,
      payload,
      actionId: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    });
    message("");
    return true;
  } catch (error) {
    message(error.message);
    window.dispatchEvent(
      new CustomEvent("restaurant:hint", { detail: error.message }),
    );
    return false;
  } finally {
    busy = false;
  }
}
async function sendHug() {
  if (!socket.connected || !session || hugPending || Date.now() < hugUntil)
    return;
  hugPending = true;
  hugUntil = Date.now() + HUG_COOLDOWN_MS;
  game.registry.set("hugUntil", hugUntil);
  window.dispatchEvent(
    new CustomEvent("restaurant:effect", {
      detail: { type: "HUG", playerId: session.playerId },
    }),
  );
  try {
    await request(EVENTS.ACTION, {
      type: "HUG",
      actionId: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    });
  } catch (error) {
    message(error.message);
  } finally {
    hugPending = false;
  }
}
$("leave").onclick = async () => {
  try {
    await request(EVENTS.LEAVE);
    session = undefined;
    save();
    location.href = location.pathname;
  } catch (error) {
    message(error.message);
  }
};
socket.on("connect", async () => {
  if (session) {
    try {
      const result = await request(EVENTS.RESUME, session);
      render(result.state);
      message("");
    } catch (error) {
      session = undefined;
      save();
      if (game) {
        game.destroy(true);
        game = undefined;
      }
      $("welcome").hidden = false;
      $("play").hidden = true;
      message(error.message);
    }
  }
});
socket.on(EVENTS.STATE, (next) => {
  if (session) render(next);
});
socket.on(EVENTS.EFFECT, (effect) => {
  if (effect.type === "HUG" && effect.playerId === session?.playerId) return;
  window.dispatchEvent(
    new CustomEvent("restaurant:effect", { detail: effect }),
  );
});
socket.on("disconnect", () => {
  if (state) render(state);
});
socket.on("connect_error", () =>
  message("Finding the restaurant… We’ll keep trying."),
);
socket.connect();

livenLandingMonsters();
