import test from "node:test";
import assert from "node:assert/strict";
import { AudioManager } from "../client/src/managers/AudioManager.js";
import { guidanceFor } from "../client/src/data/guidance.js";
function fixture(saved) {
  let stored = saved,
    oscillators = 0,
    cancelled = 0;
  const spoken = [];
  const parameter = {
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  };
  const context = {
    state: "running",
    currentTime: 1,
    destination: {},
    createGain: () => ({ gain: parameter, connect() {}, disconnect() {} }),
    resume: () => Promise.resolve(),
    suspend: () => Promise.resolve(),
    createOscillator: () => {
      oscillators++;
      return {
        frequency: parameter,
        connect() {},
        disconnect() {},
        start() {},
        stop() {},
      };
    },
  };
  const audio = new AudioManager({
    storage: {
      getItem: () => stored,
      setItem: (_key, value) => {
        stored = value;
      },
    },
    contextFactory: () => context,
    speech: {
      cancel: () => cancelled++,
      speak: (value) => spoken.push(value),
      getVoices: () => [],
    },
    Utterance: class {
      constructor(text) {
        this.text = text;
      }
    },
  });
  return {
    audio,
    context,
    spoken,
    get oscillators() {
      return oscillators;
    },
    get stored() {
      return stored;
    },
    get cancelled() {
      return cancelled;
    },
  };
}
test("audio and speech wait for a gesture, repeated snapshots do not repeat narration, and quiet mode stops both", () => {
  const f = fixture();
  f.audio.guide("Tap the cheese!");
  f.audio.play("bell");
  assert.equal(f.spoken.length, 0);
  assert.equal(f.oscillators, 0);
  f.audio.unlock();
  assert.equal(f.spoken[0].text, "Tap the cheese!");
  f.audio.guide("Tap the cheese!");
  assert.equal(f.spoken.length, 1);
  f.audio.play("hug");
  assert.equal(f.oscillators, 3);
  f.audio.configure({ muted: true });
  f.audio.guide("Tap the oven!");
  f.context.currentTime += 1;
  f.audio.play("oven");
  assert.equal(f.oscillators, 3);
  assert.equal(f.spoken.length, 1);
  assert.ok(f.cancelled > 0);
  f.audio.configure({ muted: false, volume: 0.3 });
  f.audio.unlock();
  assert.equal(f.spoken.at(-1).text, "Tap the oven!");
  assert.equal(f.spoken.at(-1).volume, 0.3);
  f.audio.repeat();
  assert.equal(f.spoken.length, 3);
  assert.equal(JSON.parse(f.stored).volume, 0.3);
});
test("preferences are validated; zero volume and narration-off are silent; missing APIs degrade gracefully", () => {
  const f = fixture('{"volume":9,"muted":false,"narration":false}');
  assert.equal(f.audio.settings.volume, 1);
  f.audio.guide("Hello!");
  f.audio.unlock();
  assert.equal(f.spoken.length, 0);
  f.audio.configure({ narration: true, volume: 0 });
  f.audio.repeat();
  f.audio.play("tap");
  assert.equal(f.spoken.length, 0);
  assert.equal(f.oscillators, 0);
  const unsupported = new AudioManager({
    storage: {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    },
    contextFactory: () => null,
    speech: null,
    Utterance: null,
  });
  assert.doesNotThrow(() => {
    unsupported.guide("Tap the picture!");
    unsupported.unlock();
    unsupported.play("hug");
    unsupported.repeat();
    unsupported.configure({ muted: true });
    unsupported.stop();
  });
});
test("spoken guidance follows the active role and the next ingredient", () => {
  const order = {
    id: "test",
    status: "ORDER_SENT",
    requiredIngredients: ["dough", "sauce", "cheese", "strawberry"],
    addedIngredients: [],
  };
  const snapshot = { game: { order } };
  assert.match(
    guidanceFor(snapshot, "kitchen"),
    /Drag the dough onto the pizza/,
  );
  assert.match(guidanceFor(snapshot, "dining"), /Pop some bubbles/);
  order.addedIngredients = ["dough", "sauce"];
  order.status = "PREPARING";
  assert.match(guidanceFor(snapshot, "kitchen"), /cheese/);
  order.addedIngredients = [...order.requiredIngredients];
  assert.match(guidanceFor(snapshot, "kitchen"), /oven/);
  order.status = "DELIVERED";
  assert.match(guidanceFor(snapshot, "dining"), /serve/);
  assert.match(guidanceFor(snapshot, "kitchen"), /friend is serving/);
  order.status = "COMPLETE";
  assert.match(guidanceFor(snapshot, "dining"), /another hungry visit/);
  assert.match(guidanceFor({ game: null }, "kitchen"), /hug/);
});

test("important effects are audible immediately after a tap without repeating identical sound bursts", () => {
  const f = fixture();
  f.audio.unlock();
  f.audio.play("tap");
  f.audio.play("hug");
  assert.equal(f.oscillators, 4);
  f.audio.play("hug");
  assert.equal(f.oscillators, 4);
  f.context.currentTime += 0.1;
  f.audio.play("hug");
  assert.equal(f.oscillators, 7);
});
