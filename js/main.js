import { createInputHandler } from "./input-handler.js";
import { createPlayerController } from "./player-controller.js";
import { createPortals } from "./portals.js";
import { loadDirectionalPadArtwork } from "./console-ui.js";
import { loadFairMapArtwork } from "./fair-map.js";
import { createFairCamera } from "./fair-camera.js";
import { FairSceneAnimator } from "./fair-scene-animator.js";
import { createInteractiveAnimatedObjects } from "./interactive-animated-objects.js";

const FAIR_STATE_KEY = "illes23-fair-position";

function restoreFairState() {
  const savedState = sessionStorage.getItem(FAIR_STATE_KEY);
  if (!savedState) return null;

  let state;
  try {
    state = JSON.parse(savedState);
  } catch (error) {
    console.error("Could not restore the saved fair position.", error);
    sessionStorage.removeItem(FAIR_STATE_KEY);
    return null;
  }

  if (
    !Number.isFinite(state?.position?.x)
    || !Number.isFinite(state?.position?.y)
    || state.position.x < 0 || state.position.x > 100
    || state.position.y < 0 || state.position.y > 100
  ) {
    console.error("The saved fair position is invalid and has been discarded.");
    sessionStorage.removeItem(FAIR_STATE_KEY);
    return null;
  }

  sessionStorage.removeItem(FAIR_STATE_KEY);
  return state;
}

const body = document.body;
const viewport = document.querySelector("#fair-viewport");
const world = document.querySelector("#fair-world");
const playerElement = document.querySelector("#player-marker");
const welcomeOverlay = document.querySelector("#welcome-overlay");
const screenStatus = document.querySelector("#screen-status");
const promptElement = document.querySelector("#portal-prompt");
const devModeToggle = document.querySelector("#dev-mode-toggle");
const enterButton = document.querySelector("#enter-fair");
await loadDirectionalPadArtwork();
const fairMapArtwork = await loadFairMapArtwork();
const walkableAreas = [...document.querySelectorAll(".walkable-area")];
if (walkableAreas.length === 0) {
  throw new Error("The fair map did not load any walkable paths.");
}
const restoredState = restoreFairState();
const appState = { screen: restoredState ? "fair" : "welcome", mode: "fair" };

const player = createPlayerController({
  element: playerElement,
  viewport,
  walkableAreas,
  // Use "free" only if you want to remove all map boundaries for open exploration.
  movementMode: "area"
});
player.setPosition(restoredState?.position ?? player.getPosition());
const camera = createFairCamera({ viewport, world });
const sceneAnimator = new FairSceneAnimator({ viewport, world });

const portals = createPortals({
  viewport,
  player,
  promptElement,
  statusElement: screenStatus,
  initialPortalId: restoredState?.portalId,
  onAttractionVisited(portalId) {
    sceneAnimator.onAttractionVisited(portalId);
  },
  onBeforeNavigate(portal) {
    const position = {
      x: Number(portal.dataset.gateX),
      y: Number(portal.dataset.gateY)
    };
    if (
      !Number.isFinite(position.x) || position.x < 0 || position.x > 100
      || !Number.isFinite(position.y) || position.y < 0 || position.y > 100
    ) {
      throw new Error(`Portal ${portal.dataset.poId} has invalid return coordinates.`);
    }

    sessionStorage.setItem(FAIR_STATE_KEY, JSON.stringify({
      position,
      portalId: portal.dataset.portal
    }));
  }
});
const interactiveObjects = createInteractiveAnimatedObjects({ root: viewport, player });
let previousFrameTime = 0;

if (restoredState) {
  body.dataset.entered = "true";
  welcomeOverlay.setAttribute("aria-hidden", "true");
  body.classList.add("is-arriving");
  camera.showWorld();
  sceneAnimator.start();
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => body.classList.remove("is-arriving"));
  });
}

function enterFair() {
  if (appState.screen !== "welcome") return;
  appState.screen = "fair";
  body.dataset.entered = "true";
  welcomeOverlay.setAttribute("aria-hidden", "true");
  screenStatus.textContent = "The fair is open — find an attraction";
  camera.showWorld();
  sceneAnimator.start();

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
  if (appState.screen === "welcome") {
    enterFair();
    return;
  }
  portals.enterSelected();
}

createInputHandler({
  root: document,
  onMove(direction, pressed) {
    if (appState.screen === "fair") {
      if (pressed) portals.clearSelectionHighlight();
      player.setDirection(direction, pressed);
    }
  },
  onMapClick(event) {
    if (appState.screen === "fair") {
      portals.clearSelectionHighlight();
      player.moveToScreenPoint(event.clientX, event.clientY);
    }
  },
  onPortalNavigate(action) {
    portals.moveSelection(action);
  },
  onConfirm() {
    handleConfirm();
  }
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
    interactiveObjects.update();
    fairMapArtwork.updateFlowers(timestamp);
    sceneAnimator.update(timestamp, portals.getPlayerAreaId());
  }
  window.requestAnimationFrame(frame);
}

window.requestAnimationFrame(frame);
window.addEventListener("pagehide", () => {
  sceneAnimator.destroy();
  interactiveObjects.destroy();
}, { once: true });

/*
 * TODO: Connect tracker data through a small public, read-only endpoint with only
 * approved fields (time spent, status, description, asset type). Never expose Jira
 * tokens, private sheet URLs, personal data, or credentials in this browser bundle.
 */
