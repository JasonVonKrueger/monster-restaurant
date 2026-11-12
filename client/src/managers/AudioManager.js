const defaults = { muted: false, narration: true, volume: 0.45 };
const melodies = {
  tap: [[520, 0, 0.07]],
  pop: [
    [740, 0, 0.09],
    [1050, 0.05, 0.08],
  ],
  ingredient: [
    [440, 0, 0.08],
    [660, 0.07, 0.12],
  ],
  oven: [
    [130, 0, 0.18],
    [195, 0.15, 0.2],
    [260, 0.3, 0.15],
  ],
  ready: [
    [660, 0, 0.16],
    [880, 0.15, 0.25],
  ],
  bell: [
    [1046, 0, 0.35],
    [1318, 0.12, 0.4],
  ],
  chew: [
    [150, 0, 0.09],
    [190, 0.13, 0.09],
    [150, 0.26, 0.09],
  ],
  burp: [[160, 0, 0.4]],
  hug: [
    [523, 0, 0.18],
    [659, 0.12, 0.18],
    [784, 0.24, 0.28],
  ],
  reward: [
    [784, 0, 0.12],
    [988, 0.11, 0.12],
    [1175, 0.22, 0.25],
  ],
  celebration: [
    [523, 0, 0.18],
    [659, 0.16, 0.18],
    [784, 0.32, 0.18],
    [1046, 0.5, 0.4],
  ],
};
// Original sound effects are synthesized here; no third-party samples are used.
export class AudioManager {
  constructor({
    storage,
    contextFactory,
    speech = globalThis.speechSynthesis,
    Utterance = globalThis.SpeechSynthesisUtterance,
  } = {}) {
    try {
      storage ??= globalThis.localStorage;
    } catch {
      /* Storage can be disabled. */
    }
    this.storage = storage;
    this.speech = speech;
    this.Utterance = Utterance;
    this.contextFactory =
      contextFactory ||
      (() => {
        const Context =
          globalThis.AudioContext || globalThis.webkitAudioContext;
        return Context ? new Context() : null;
      });
    let saved;
    try {
      saved = JSON.parse(storage?.getItem("monster-audio"));
    } catch {
      /* Optional local preferences. */
    }
    this.settings = { ...defaults };
    if (saved && typeof saved === "object") {
      if (typeof saved.muted === "boolean") this.settings.muted = saved.muted;
      if (typeof saved.narration === "boolean")
        this.settings.narration = saved.narration;
      if (Number.isFinite(saved.volume))
        this.settings.volume = Math.max(0, Math.min(1, saved.volume));
    }
    this.activated = false;
    this.guidance = "";
    this.lastSpoken = "";
    this.lastSoundAt = -Infinity;
  }
  unlock() {
    this.activated = true;
    try {
      if (!this.context) {
        this.context = this.contextFactory();
        if (this.context) {
          this.master = this.context.createGain();
          this.master.connect(this.context.destination);
          this.syncVolume();
        }
      }
      const resumed = this.context?.resume();
      resumed?.catch(() => {});
    } catch {
      /* Audio may be unavailable; visual feedback still works. */
    }
    if (this.guidance && this.lastSpoken !== this.guidance)
      this.speak(this.guidance);
  }
  syncVolume() {
    if (this.master)
      this.master.gain.setValueAtTime(
        this.settings.muted ? 0 : this.settings.volume,
        this.context.currentTime,
      );
  }
  configure(changes) {
    const previousVolume = this.settings.volume;
    this.settings = { ...this.settings, ...changes };
    this.settings.volume = Math.max(
      0,
      Math.min(1, Number(this.settings.volume) || 0),
    );
    try {
      this.storage?.setItem("monster-audio", JSON.stringify(this.settings));
    } catch {
      /* Preferences can remain in memory. */
    }
    this.syncVolume();
    if (
      this.settings.muted ||
      !this.settings.narration ||
      !this.settings.volume ||
      this.settings.volume !== previousVolume
    ) {
      this.speech?.cancel();
      this.lastSpoken = "";
    }
  }
  play(name) {
    if (
      !this.activated ||
      this.settings.muted ||
      !this.settings.volume ||
      !this.context ||
      this.context.state !== "running"
    )
      return;
    const now = this.context.currentTime;
    if (
      now - this.lastSoundAt < 0.055 &&
      (name === this.lastSound || name === "tap")
    )
      return;
    this.lastSoundAt = now;
    this.lastSound = name;
    for (const [frequency, delay, duration] of melodies[name] || melodies.tap) {
      const oscillator = this.context.createOscillator(),
        envelope = this.context.createGain(),
        start = now + delay;
      oscillator.type = name === "burp" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      if (name === "burp")
        oscillator.frequency.exponentialRampToValueAtTime(45, start + duration);
      if (name === "pop")
        oscillator.frequency.exponentialRampToValueAtTime(
          frequency / 2,
          start + duration,
        );
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(0.12, start + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(envelope);
      envelope.connect(this.master);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
      oscillator.onended = () => {
        oscillator.disconnect();
        envelope.disconnect();
      };
    }
  }
  guide(text) {
    if (!text) return;
    const changed = this.guidance !== text;
    this.guidance = text;
    if (changed) this.speak(text);
  }
  repeat() {
    this.lastSpoken = "";
    this.speak(this.guidance);
  }
  speak(text) {
    if (
      !text ||
      !this.activated ||
      this.settings.muted ||
      !this.settings.narration ||
      !this.settings.volume ||
      !this.speech ||
      !this.Utterance ||
      text === this.lastSpoken
    )
      return;
    try {
      this.speech.cancel();
      const utterance = new this.Utterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.88;
      utterance.pitch = 1.12;
      utterance.volume = this.settings.volume;
      const voice = this.speech
        .getVoices?.()
        .find((voice) => voice.lang === "en-US" && voice.localService);
      if (voice) utterance.voice = voice;
      this.speech.speak(utterance);
      this.lastSpoken = text;
    } catch {
      /* Narration is optional. */
    }
  }
  stop() {
    this.speech?.cancel();
    this.lastSpoken = "";
    if (this.context?.state === "running")
      this.context.suspend()?.catch(() => {});
  }
}
