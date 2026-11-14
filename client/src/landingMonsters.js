// The monsters above the title on the welcome screen stay put and come alive by
// blinking and glancing left and right. Each <img> shows one 400 × 400 frame of its
// sprite sheet (frames: 0 idle, 1 blink, 7 look left, 8 look right).
const IDLE = 0,
  BLINK = 1,
  LOOK_LEFT = 7,
  LOOK_RIGHT = 8;
const between = (min, max) => min + Math.random() * (max - min);

function show(img, frame) {
  // object-fit: cover scales the sheet so one frame fills the box; slide to the frame.
  img.style.objectPosition = `${-frame * img.clientWidth}px 0`;
}

function liven(img) {
  let frame = IDLE;
  const set = (f) => show(img, (frame = f));
  const next = () => {
    if (!img.isConnected) return;
    const roll = Math.random();
    if (roll < 0.5) {
      // Blink, sometimes twice.
      set(BLINK);
      setTimeout(() => set(IDLE), 140);
      if (roll < 0.12) {
        setTimeout(() => set(BLINK), 280);
        setTimeout(() => set(IDLE), 420);
      }
    } else {
      // Glance one way, maybe the other, then back.
      const first = Math.random() < 0.5 ? LOOK_LEFT : LOOK_RIGHT;
      set(first);
      if (roll < 0.75) {
        setTimeout(
          () => set(first === LOOK_LEFT ? LOOK_RIGHT : LOOK_LEFT),
          900,
        );
        setTimeout(() => set(IDLE), 1800);
      } else setTimeout(() => set(IDLE), 1100);
    }
    setTimeout(next, between(2200, 5200));
  };
  // The frame offset depends on the image's size, which changes with the screen.
  window.addEventListener("resize", () => show(img, frame));
  set(IDLE);
  setTimeout(next, between(600, 3200));
}

export function livenLandingMonsters() {
  document.querySelectorAll(".mascot img").forEach(liven);
}
