export function createFairCamera({ viewport, world }) {
  if (!viewport || !world) {
    throw new Error("Fair camera requires a viewport and world layer.");
  }

  function showWorld() {
    viewport.style.setProperty("--camera-transition-duration", "900ms");
    viewport.style.setProperty("--camera-scale", "1");
    viewport.style.setProperty("--camera-offset-x", "0px");
    viewport.style.setProperty("--camera-offset-y", "0px");
    world.dataset.cameraState = "overview";
  }

  showWorld();

  /*
   * Future selective zoom, intentionally inactive:
   * - An area can opt in by checking portal.matches(".portal--lake.is-player-inside").
   * - A selected item can opt in via ".is-selected".
   * - A nearby interactive object can opt in via ".is-interactive-near".
   * Calculate a scale/offset around only that element and restore showWorld() when the
   * trigger ends. Keep the condition limited to the intended PO/object, not every player
   * movement or every selected portal, so the rest of the fair stays at overview scale.
   */

  return { showWorld };
}
