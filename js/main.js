import { createInputHandler } from "./input-handler.js";
import { createPlayerController } from "./player-controller.js";
import { createPortals } from "./portals.js";

const body = document.body;
const viewport = document.querySelector("#fair-viewport");
const playerElement = document.querySelector("#player-marker");
const routePath = document.querySelector("#fair-route");
const welcomeOverlay = document.querySelector("#welcome-overlay");
const screenStatus = document.querySelector("#screen-status");
const promptElement = document.querySelector("#portal-prompt");
const devModeToggle = document.querySelector("#dev-mode-toggle");
const enterButton = document.querySelector("#enter-fair");
const appState = { screen: "welcome", mode: "fair" };

const player = createPlayerController({
  element: playerElement,
  viewport,
  routePath,
  // Change to "free" for open park exploration. The controller keeps all motion
  // inside the viewport and is ready for collision zones and transport mounting.
  movementMode: "path"
});
const portals = createPortals({ viewport, player, promptElement, statusElement: screenStatus });
let previousFrameTime = 0;

function enterFair() {
  if (appState.screen !== "welcome") return;
  appState.screen = "fair";
  body.dataset.entered = "true";
  welcomeOverlay.setAttribute("aria-hidden", "true");
  screenStatus.textContent = "The fair is open — find an attraction";

  // TODO: Attach a GSAP/Anime.js timeline here to move the flower SVG layers
  // outward from the screen edges. The CSS transition is a lightweight fallback;
  // animate #flower-left and #flower-right without blocking portal input.

  // TODO: Welcome/confetti effect choices:
  // 1. Canvas particles (recommended for many short-lived particles; clear/redraw one layer).
  // 2. SVG nodes (best for a small number of scalable, individually styled pieces).
  // 3. PNG sprite sheet (best when the hand-drawn confetti animation is already authored).
}

function toggleDevMode() {
  appState.mode = appState.mode === "dev" ? "fair" : "dev";
  const enabled = appState.mode === "dev";
  body.dataset.mode = appState.mode;
  devModeToggle.setAttribute("aria-pressed", String(enabled));
  screenStatus.textContent = enabled ? "Development asset dashboard" : "The fair is waiting for you";
}

function handleConfirm() {
  if (!hasEntered) {
    enterFair();
    return;
  }
  portals.enterSelected();
}

createInputHandler({
  root: document,
  onDirection(direction, pressed) {
    if (appState.screen === "fair") player.setDirection(direction, pressed);
  },
  onConfirm: handleConfirm
});

enterButton.addEventListener("click", enterFair);
devModeToggle.addEventListener("click", toggleDevMode);

function frame(timestamp) {
  if (previousFrameTime === 0) previousFrameTime = timestamp;
  const deltaSeconds = (timestamp - previousFrameTime) / 1000;
  previousFrameTime = timestamp;

  if (appState.screen === "fair") {
    player.update(deltaSeconds);
    portals.update();
  }
  window.requestAnimationFrame(frame);
}

window.requestAnimationFrame(frame);

/*
 * TODO: Connect tracker data through a small public, read-only endpoint with only
 * approved fields (time spent, status, description, asset type). Never expose Jira
 * tokens, private sheet URLs, personal data, or credentials in this browser bundle.
 */
