import "./attraction-page.js";
import { loadDirectionalPadArtwork } from "../js/console-ui.js";

await loadDirectionalPadArtwork();

const game = document.querySelector("#lake-tour-game .lake-tour-game");
if (!game) throw new Error("Lake Tour game scene was not found.");

const world = game.querySelector(".lake-tour-world");
const boat = game.querySelector("#lake-boat");
const player = game.querySelector("#lake-player");
const phaseLabel = game.querySelector("#lake-tour-phase");
const stopLabel = game.querySelector("#lake-tour-stop");
const message = game.querySelector("#lake-tour-message");
const routeButtons = [...game.querySelectorAll("[data-lake-stop]")];
const interactButtons = [...game.querySelectorAll('[data-lake-action="interact"]')];

if (!world || !boat || !player || !phaseLabel || !stopLabel || !message || routeButtons.length !== 6) {
  throw new Error("Lake Tour scene is missing required game elements.");
}

const stops = [
  {
    name: "Embarcadero",
    detail: "La barca espera junto al embarcadero. Sube para comenzar el recorrido.",
  },
  {
    name: "Juncos",
    detail: "Los juncos se mecen con la brisa. Baja de la barca para explorar la orilla.",
  },
  {
    name: "Torres Blancas",
    detail: "Las torres se recortan contra el cielo cálido del atardecer.",
  },
  {
    name: "Jardín del Turia",
    detail: "Una parada tranquila entre la vegetación y el agua.",
  },
  {
    name: "Pagoda",
    detail: "La silueta de la pagoda es provisional: falta añadir el asset SVG.",
  },
  {
    name: "Atardecer",
    detail: "El viaje termina bajo los colores cambiantes del cielo.",
  },
];

const directions = {
  "walk-up": [0, -1],
  "walk-down": [0, 1],
  "walk-left": [-1, 0],
  "walk-right": [1, 0],
};

const state = {
  phase: "dock",
  currentStop: 0,
  progress: 0,
  targetStop: null,
  playerX: 78,
  playerY: 52,
  heldDirections: new Set(),
  frame: 0,
  lastFrameTime: 0,
};

function setMessage(title, text) {
  const heading = message.querySelector("strong");
  const detail = message.querySelector("span");
  if (!heading || !detail) throw new Error("Lake Tour message panel is incomplete.");
  heading.textContent = title;
  detail.textContent = text;
}

function nearestStop() {
  return Math.round(state.progress);
}

function isAtStop() {
  return state.targetStop === null && Math.abs(state.progress - Math.round(state.progress)) < 0.015;
}

function updatePhase() {
  game.dataset.phase = state.phase;
  const phaseText = {
    dock: "En el embarcadero",
    boat: "En la barca",
    shore: `Explorando · ${stops[state.currentStop].name}`,
  };
  phaseLabel.textContent = phaseText[state.phase];

  const buttonText = {
    dock: "Subir a la barca",
    boat: "Bajar a la orilla",
    shore: "Volver a la barca",
  };
  for (const button of interactButtons) button.textContent = buttonText[state.phase];
}

function updateRoute() {
  const activeStop = state.targetStop ?? nearestStop();
  stopLabel.textContent = `Parada ${activeStop + 1} de ${stops.length} · ${stops[activeStop].name}`;
  for (const button of routeButtons) {
    if (Number(button.dataset.lakeStop) === activeStop) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  }
}

function updateScene() {
  world.style.transform = `translate3d(-${state.progress * (100 / stops.length)}%, 0, 0)`;
  boat.style.transform = `translate3d(calc(-50% + ${state.progress * game.clientWidth}px), 0, 0)`;
  const playerStop = state.currentStop;
  player.style.left = `${((playerStop + state.playerX / 100) / stops.length) * 100}%`;
  player.style.bottom = `${20 + (100 - state.playerY) * 0.12}%`;
  updateRoute();
}

function showArrival() {
  state.currentStop = Math.round(state.progress);
  state.targetStop = null;
  game.removeAttribute("data-traveling");
  const stop = stops[state.currentStop];
  updatePhase();
  updateScene();
  setMessage(`Parada ${state.currentStop + 1} · ${stop.name}`, stop.detail);
}

function animate(now) {
  const elapsed = Math.min((now - state.lastFrameTime) / 1000, 0.05);
  state.lastFrameTime = now;
  let needsAnotherFrame = false;

  if (state.targetStop !== null) {
    const distance = state.targetStop - state.progress;
    const step = Math.sign(distance) * Math.min(Math.abs(distance), elapsed * 0.72);
    state.progress += step;
    needsAnotherFrame = Math.abs(state.targetStop - state.progress) > 0.001;
    if (!needsAnotherFrame) {
      state.progress = state.targetStop;
      showArrival();
    }
  }

  if (state.phase === "shore" && state.heldDirections.size > 0) {
    let dx = 0;
    let dy = 0;
    for (const direction of state.heldDirections) {
      const [x, y] = directions[direction];
      dx += x;
      dy += y;
    }
    const magnitude = Math.hypot(dx, dy) || 1;
    state.playerX = Math.max(7, Math.min(93, state.playerX + (dx / magnitude) * elapsed * 38));
    state.playerY = Math.max(18, Math.min(78, state.playerY + (dy / magnitude) * elapsed * 38));
    needsAnotherFrame = true;
    updateScene();
  }

  if (state.targetStop !== null || state.phase === "shore" && state.heldDirections.size > 0) updateScene();
  if (needsAnotherFrame) state.frame = requestAnimationFrame(animate);
  else {
    state.frame = 0;
    state.lastFrameTime = 0;
  }
}

function startAnimation() {
  if (state.frame) return;
  state.lastFrameTime = performance.now();
  state.frame = requestAnimationFrame(animate);
}

function goToStop(index) {
  if (!Number.isInteger(index) || index < 0 || index >= stops.length) return;
  if (state.phase !== "boat") {
    state.phase = "boat";
    state.heldDirections.clear();
    updatePhase();
  }
  state.targetStop = index;
  updateRoute();
  if (state.progress !== index) {
    game.dataset.traveling = "true";
    setMessage("En camino", `La barca se dirige a la parada ${index + 1} · ${stops[index].name}.`);
    startAnimation();
  } else {
    game.removeAttribute("data-traveling");
    state.progress = index;
    showArrival();
  }
}

function interact() {
  if (state.phase === "dock") {
    state.phase = "boat";
    updatePhase();
    setMessage("¡Comienza el Lake Tour!", "Usa izquierda o derecha para navegar hasta otra parada.");
    return;
  }
  if (state.phase === "shore") {
    state.phase = "boat";
    updatePhase();
    setMessage(`De vuelta en la barca · ${stops[state.currentStop].name}`, "Elige la siguiente parada con las flechas o los controles.");
    return;
  }
  if (!isAtStop()) {
    setMessage("Sigue navegando", "La barca puede atracar cuando llegue a una de las seis paradas.");
    return;
  }

  state.currentStop = nearestStop();
  state.playerX = 78;
  state.playerY = 52;
  state.phase = "shore";
  updatePhase();
  updateScene();
  setMessage(stops[state.currentStop].name, `${stops[state.currentStop].detail} Pulsa el centro para volver a la barca.`);
}

function requestNextStop(direction) {
  if (state.phase !== "boat") {
    goToStop(Math.max(0, Math.min(stops.length - 1, state.currentStop + direction)));
    return;
  }
  const anchor = state.targetStop ?? nearestStop();
  goToStop(Math.max(0, Math.min(stops.length - 1, anchor + direction)));
}

function nudgePlayer(action) {
  const [dx, dy] = directions[action];
  state.playerX = Math.max(7, Math.min(93, state.playerX + dx * 5));
  state.playerY = Math.max(18, Math.min(78, state.playerY + dy * 5));
  updateScene();
}

game.addEventListener("pointerdown", (event) => {
  if (event.target instanceof Element && event.target.closest("button, a")) return;
  game.focus({ preventScroll: true });
});

for (const button of document.querySelectorAll("[data-lake-action]")) {
  const action = button.dataset.lakeAction;
  button.addEventListener("pointerdown", () => {
    if (directions[action] && state.phase === "shore") {
      state.heldDirections.add(action);
      startAnimation();
    }
  });
  button.addEventListener("pointerup", () => state.heldDirections.delete(action));
  button.addEventListener("pointercancel", () => state.heldDirections.delete(action));
  button.addEventListener("pointerleave", () => state.heldDirections.delete(action));
  button.addEventListener("click", (event) => {
    if (action === "interact") interact();
    else if (action === "boat-next") requestNextStop(1);
    else if (action === "boat-previous") requestNextStop(-1);
    else if (directions[action] && state.phase === "shore" && event.detail === 0) nudgePlayer(action);
    else if (directions[action] && state.phase === "shore") nudgePlayer(action);
  });
}

for (const button of routeButtons) {
  button.addEventListener("click", () => goToStop(Number(button.dataset.lakeStop)));
}

function onKeyDown(event) {
  if (event.target instanceof Element && event.target.closest("button, a, input, textarea, select")) return;
  const key = event.key.toLowerCase();
  if (key === " " || key === "enter" || key === "e") {
    event.preventDefault();
    interact();
    return;
  }

  const direction = {
    arrowup: "walk-up",
    w: "walk-up",
    arrowdown: "walk-down",
    s: "walk-down",
    arrowleft: "walk-left",
    a: "walk-left",
    arrowright: "walk-right",
    d: "walk-right",
  }[key];
  if (!direction) return;
  event.preventDefault();
  if (state.phase === "boat" && (direction === "walk-left" || direction === "walk-right")) {
    if (!event.repeat) requestNextStop(direction === "walk-right" ? 1 : -1);
    return;
  }
  if (state.phase === "shore") {
    state.heldDirections.add(direction);
    startAnimation();
  }
}

function onKeyUp(event) {
  const key = event.key.toLowerCase();
  const direction = {
    arrowup: "walk-up",
    w: "walk-up",
    arrowdown: "walk-down",
    s: "walk-down",
    arrowleft: "walk-left",
    a: "walk-left",
    arrowright: "walk-right",
    d: "walk-right",
  }[key];
  if (direction) state.heldDirections.delete(direction);
}

game.addEventListener("keydown", onKeyDown);
game.addEventListener("keyup", onKeyUp);
window.addEventListener("pointerup", () => state.heldDirections.clear());
window.addEventListener("pointercancel", () => state.heldDirections.clear());
window.addEventListener("blur", () => state.heldDirections.clear());
window.addEventListener("resize", updateScene);

updatePhase();
updateScene();
