// Replace files or change this manifest to swap artwork without touching gameplay.
export const ASSETS = Object.freeze({
  bubbles: "/assets/monsters/bubbles/idle.png",
});
export function preloadAssets(scene) {
  for (const [key, path] of Object.entries(ASSETS))
    if (!scene.textures.exists(key)) scene.load.image(key, path);
}
