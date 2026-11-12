export function connectAudioSettings(audio) {
  const dialog = document.getElementById("audio-settings"),
    mute = document.getElementById("mute-audio"),
    narration = document.getElementById("narration"),
    volume = document.getElementById("volume");
  const sync = () => {
    mute.checked = audio.settings.muted;
    narration.checked = audio.settings.narration;
    volume.value = String(Math.round(audio.settings.volume * 100));
    document.getElementById("volume-value").textContent = `${volume.value}%`;
  };
  document.querySelectorAll("[data-audio-settings]").forEach((button) =>
    button.addEventListener("click", () => {
      sync();
      dialog.showModal();
    }),
  );
  mute.addEventListener("change", () => {
    audio.configure({ muted: mute.checked });
    audio.unlock();
    audio.play("tap");
  });
  narration.addEventListener("change", () => {
    audio.configure({ narration: narration.checked });
    audio.unlock();
  });
  volume.addEventListener("input", () => {
    audio.configure({ volume: Number(volume.value) / 100 });
    sync();
  });
  volume.addEventListener("change", () => {
    audio.unlock();
    audio.play("hug");
  });
  if (!audio.speech || !audio.Utterance)
    document.getElementById("voice-note").textContent =
      "This browser has no spoken voice. Glowing pictures will guide every step.";
}
