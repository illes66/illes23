import "./attraction-page.js";

const gameRoot = document.querySelector("#comic-game");
if (!gameRoot) throw new Error("Comic Foreground game root was not found.");

const PULSE_INTERVAL_MS = 2500;
const SHOOT_EVERY_PULSES = 3;
const SHOOT_FLASH_MS = 650;
const CLOCK_REFRESH_MS = 100;
const RESULT_POINTS = { match: 10, read: 4, miss: 0 };
// Add each new character once, then set its mutual partnerId and shared familyId.
// Set image paths relative to this JS module when PNGs are uploaded. Null keeps
// the demo placeholder visible until the art is ready.
const CHARACTERS = [
  {
    id: "hotdog", name: "Hot dog", emoji: "🌭", color: "#e7a36c",
    partnerId: "fries", familyId: "hotdog-fries", familyName: "Merienda del puesto",
    clue: "Las patatas suelen acompañar al perrito caliente.",
    headImage: null, feetImage: null, costumeImage: null
  },
  {
    id: "fries", name: "Patatas fritas", emoji: "🍟", color: "#f0cf69",
    partnerId: "hotdog", familyId: "hotdog-fries", familyName: "Merienda del puesto",
    clue: "Las patatas suelen acompañar al perrito caliente.",
    headImage: null, feetImage: null, costumeImage: null
  },
  {
    id: "popcorn", name: "Palomitas", emoji: "🍿", color: "#f2d879",
    partnerId: "soda", familyId: "popcorn-soda", familyName: "Sesión de cine",
    clue: "Dos clásicos para disfrutar de una película.",
    headImage: null, feetImage: null, costumeImage: null
  },
  {
    id: "soda", name: "Refresco", emoji: "🥤", color: "#9bd0d1",
    partnerId: "popcorn", familyId: "popcorn-soda", familyName: "Sesión de cine",
    clue: "Dos clásicos para disfrutar de una película.",
    headImage: null, feetImage: null, costumeImage: null
  },
  {
    id: "churro", name: "Churro", emoji: "🥨", color: "#d99b58",
    partnerId: "chocolate", familyId: "churro-chocolate", familyName: "Churros con chocolate",
    clue: "El chocolate caliente pide algo para mojar.",
    headImage: null, feetImage: null, costumeImage: null
  },
  {
    id: "chocolate", name: "Chocolate caliente", emoji: "🍫", color: "#a97865",
    partnerId: "churro", familyId: "churro-chocolate", familyName: "Churros con chocolate",
    clue: "El chocolate caliente pide algo para mojar.",
    headImage: null, feetImage: null, costumeImage: null
  }
];

const CHARACTERS_BY_ID = new Map(CHARACTERS.map((character) => [character.id, character]));
for (const character of CHARACTERS) {
  const partner = CHARACTERS_BY_ID.get(character.partnerId);
  if (!partner || partner.partnerId !== character.id || partner.familyId !== character.familyId) {
    throw new Error(`Character ${character.id} must have a reciprocal partner in the same family.`);
  }
}

const COSTUMES = CHARACTERS.map((character) => ({
  id: character.id,
  characterId: character.id,
  name: `Disfraz de ${character.name}`,
  emoji: character.emoji,
  color: character.color,
  familyId: character.familyId,
  partnerId: character.partnerId,
  image: character.costumeImage
}));

const WHEELS = {
  feet: {
    sequence: ["hotdog", "popcorn", "churro", "fries", "soda", "chocolate"],
    initialIndex: 0,
    step: 1,
    everyPulses: 1
  },
  heads: {
    sequence: ["popcorn", "hotdog", "soda", "churro", "chocolate", "fries"],
    initialIndex: 0,
    step: 1,
    everyPulses: 2
  }
};

const elements = {
  currentFeet: document.querySelector("#current-feet"),
  currentFeetName: document.querySelector("#current-feet-name"),
  currentHead: document.querySelector("#current-head"),
  currentHeadName: document.querySelector("#current-head-name"),
  forecastFeet: document.querySelector("#forecast-feet"),
  forecastFeetName: document.querySelector("#forecast-feet-name"),
  forecastHead: document.querySelector("#forecast-head"),
  forecastHeadName: document.querySelector("#forecast-head-name"),
  feetShootPulse: document.querySelector("#feet-shoot-pulse"),
  headsShootPulse: document.querySelector("#heads-shoot-pulse"),
  photoLeftHead: document.querySelector("#photo-left-head"),
  photoLeftCostume: document.querySelector("#photo-left-costume"),
  photoLeftFeet: document.querySelector("#photo-left-feet"),
  photoRightHead: document.querySelector("#photo-right-head"),
  photoRightCostume: document.querySelector("#photo-right-costume"),
  photoRightFeet: document.querySelector("#photo-right-feet"),
  stage: document.querySelector("#photo-stage"),
  costumeWheels: document.querySelector(".costume-wheels"),
  stageCaption: document.querySelector("#stage-caption"),
  shootClue: document.querySelector("#shoot-clue"),
  resultMessage: document.querySelector("#result-message"),
  pulseCounter: document.querySelector("#pulse-counter"),
  score: document.querySelector("#score"),
  countdownLabel: document.querySelector("#shoot-countdown-label"),
  clockNote: document.querySelector("#clock-note"),
  progress: document.querySelector(".shoot-progress"),
  progressFill: document.querySelector("#shoot-progress-fill"),
  leftCostumePreview: document.querySelector("#costume-left-preview"),
  leftCostumeName: document.querySelector("#costume-left-name"),
  rightCostumePreview: document.querySelector("#costume-right-preview"),
  rightCostumeName: document.querySelector("#costume-right-name"),
  leftPrevious: document.querySelector("#costume-left-previous"),
  leftNext: document.querySelector("#costume-left-next"),
  rightPrevious: document.querySelector("#costume-right-previous"),
  rightNext: document.querySelector("#costume-right-next"),
  advancePulse: document.querySelector("#advance-round"),
  pause: document.querySelector("#pause-game"),
  restart: document.querySelector("#restart-game")
};

for (const [name, element] of Object.entries(elements)) {
  if (!element) throw new Error(`Comic Foreground game is missing its ${name} element.`);
}

for (const wheel of Object.values(WHEELS)) {
  if (wheel.sequence.some((characterId) => !CHARACTERS_BY_ID.has(characterId))) {
    throw new Error("A Comic Foreground wheel references an unknown character.");
  }
}

const state = {
  pulse: 0,
  feetIndex: WHEELS.feet.initialIndex,
  headsIndex: WHEELS.heads.initialIndex,
  leftCostumeIndex: 0,
  rightCostumeIndex: 2,
  heldCostumeSlots: new Set(),
  score: 0,
  paused: false,
  pausedRemainingMs: 0,
  shooting: false,
  deadline: performance.now() + PULSE_INTERVAL_MS,
  timerId: null,
  shotTimeoutId: null
};

function wrappedIndex(index, collectionLength) {
  return (index + collectionLength) % collectionLength;
}

function getCharacterAt(sequence, index) {
  return CHARACTERS_BY_ID.get(sequence[index]);
}

function getNextWheelIndex(index, wheel, pulse) {
  if (pulse % wheel.everyPulses !== 0) return index;
  return wrappedIndex(index + wheel.step, wheel.sequence.length);
}

function predictNextShoot() {
  const pulsesUntilShoot = SHOOT_EVERY_PULSES - (state.pulse % SHOOT_EVERY_PULSES);
  let feetIndex = state.feetIndex;
  let headsIndex = state.headsIndex;

  for (let offset = 1; offset <= pulsesUntilShoot; offset += 1) {
    const futurePulse = state.pulse + offset;
    feetIndex = getNextWheelIndex(feetIndex, WHEELS.feet, futurePulse);
    headsIndex = getNextWheelIndex(headsIndex, WHEELS.heads, futurePulse);
  }

  return {
    pulse: state.pulse + pulsesUntilShoot,
    feet: getCharacterAt(WHEELS.feet.sequence, feetIndex),
    head: getCharacterAt(WHEELS.heads.sequence, headsIndex)
  };
}

function renderAsset(container, asset, image, variant) {
  const key = `${asset.id}:${image ?? ""}:${variant}`;
  if (container.dataset.assetKey === key) return;

  container.dataset.assetKey = key;
  container.replaceChildren();
  container.style.setProperty("--asset-color", asset.color);
  container.classList.toggle("has-image", Boolean(image));

  const fallback = document.createElement("span");
  fallback.className = "asset-placeholder";
  fallback.textContent = asset.emoji;
  fallback.setAttribute("aria-hidden", "true");
  container.append(fallback);

  if (!image) return;

  const imageElement = document.createElement("img");
  imageElement.className = "asset-image";
  imageElement.src = image;
  imageElement.alt = "";
  imageElement.setAttribute("aria-hidden", "true");
  imageElement.addEventListener("load", () => fallback.remove(), { once: true });
  imageElement.addEventListener("error", () => {
    console.error(`Unable to load Comic Foreground PNG: ${image}`);
    imageElement.remove();
  }, { once: true });
  container.append(imageElement);
}

function renderWheelCharacter(container, nameElement, character, image, variant) {
  renderAsset(container, character, image, variant);
  nameElement.textContent = character.name;
}

function renderCostumeSelector(container, nameElement, costume) {
  renderAsset(container, costume, costume.image, "costume-preview");
  nameElement.textContent = costume.name;
}

function renderShootForecast() {
  const forecast = predictNextShoot();
  const familyMatches = forecast.feet.familyId === forecast.head.familyId;

  renderWheelCharacter(
    elements.forecastFeet,
    elements.forecastFeetName,
    forecast.feet,
    forecast.feet.feetImage,
    "feet-forecast"
  );
  renderWheelCharacter(
    elements.forecastHead,
    elements.forecastHeadName,
    forecast.head,
    forecast.head.headImage,
    "head-forecast"
  );

  const pulseLabel = `Shoot · pulso ${forecast.pulse}`;
  elements.feetShootPulse.textContent = pulseLabel;
  elements.headsShootPulse.textContent = pulseLabel;
  elements.shootClue.textContent = familyMatches
    ? `Pista para el shoot: ${forecast.feet.familyName}. ${forecast.feet.clue}`
    : `Pistas: ${forecast.feet.name} (${forecast.feet.familyName}) y ${forecast.head.name} (${forecast.head.familyName}). ¿Compartirán disfraz?`;
}

function renderPhoto() {
  const feet = getCharacterAt(WHEELS.feet.sequence, state.feetIndex);
  const head = getCharacterAt(WHEELS.heads.sequence, state.headsIndex);
  const leftCostume = COSTUMES[state.leftCostumeIndex];
  const rightCostume = COSTUMES[state.rightCostumeIndex];

  renderAsset(
    elements.photoLeftHead,
    feet,
    feet.headImage,
    "photo-head"
  );
  renderAsset(
    elements.photoLeftCostume,
    leftCostume,
    leftCostume.image,
    "photo-costume"
  );
  renderAsset(
    elements.photoLeftFeet,
    feet,
    feet.feetImage,
    "photo-feet"
  );
  renderAsset(
    elements.photoRightHead,
    head,
    head.headImage,
    "photo-head"
  );
  renderAsset(
    elements.photoRightCostume,
    rightCostume,
    rightCostume.image,
    "photo-costume"
  );
  renderAsset(
    elements.photoRightFeet,
    head,
    head.feetImage,
    "photo-feet"
  );
  renderCostumeSelector(elements.leftCostumePreview, elements.leftCostumeName, leftCostume);
  renderCostumeSelector(elements.rightCostumePreview, elements.rightCostumeName, rightCostume);
  elements.stageCaption.textContent = `${feet.name} + ${head.name}`;
}

function getSelectedCharacters() {
  return {
    feet: getCharacterAt(WHEELS.feet.sequence, state.feetIndex),
    head: getCharacterAt(WHEELS.heads.sequence, state.headsIndex)
  };
}

function charactersArePartners(feet, head) {
  return feet.partnerId === head.id
    && head.partnerId === feet.id
    && feet.familyId === head.familyId;
}

function costumesArePartners(leftCostume, rightCostume) {
  return leftCostume.partnerId === rightCostume.characterId
    && rightCostume.partnerId === leftCostume.characterId
    && leftCostume.familyId === rightCostume.familyId;
}

function evaluatePhoto() {
  const { feet, head } = getSelectedCharacters();
  const leftCostume = COSTUMES[state.leftCostumeIndex];
  const rightCostume = COSTUMES[state.rightCostumeIndex];
  const characterMatch = charactersArePartners(feet, head);
  const costumeMatch = costumesArePartners(leftCostume, rightCostume);
  const costumesFitCharacters = leftCostume.characterId === feet.id
    && rightCostume.characterId === head.id;

  if (characterMatch && costumeMatch && costumesFitCharacters) {
    return {
      category: "match",
      title: "¡MATCH!",
      message: `¡${feet.name} y ${head.name} son pareja y llevan sus disfraces!`
    };
  }

  if (!characterMatch && !costumeMatch) {
    return {
      category: "read",
      title: "¡Buena lectura!",
      message: `No eran pareja: elegiste dos disfraces que tampoco forman pareja.`
    };
  }

  if (characterMatch) {
    return {
      category: "miss",
      title: "La pareja estaba ahí",
      message: `${feet.name} y ${head.name} sí son pareja, pero los dos disfraces no encajaban.`
    };
  }

  return {
    category: "miss",
    title: "¡Casi!",
    message: `Los personajes no eran pareja, pero elegiste dos disfraces emparejados.`
  };
}

function render() {
  const feet = getCharacterAt(WHEELS.feet.sequence, state.feetIndex);
  const head = getCharacterAt(WHEELS.heads.sequence, state.headsIndex);

  renderWheelCharacter(
    elements.currentFeet,
    elements.currentFeetName,
    feet,
    feet.feetImage,
    "feet-current"
  );
  renderWheelCharacter(
    elements.currentHead,
    elements.currentHeadName,
    head,
    head.headImage,
    "head-current"
  );
  renderShootForecast();
  renderPhoto();

  elements.pulseCounter.textContent = `Pulso ${state.pulse}`;
  elements.score.textContent = String(state.score);
  elements.pause.textContent = state.paused ? "Reanudar" : "Pausar";
  elements.pause.setAttribute("aria-pressed", String(state.paused));
  updateCountdown();
}

function updateCountdown() {
  const now = performance.now();
  const remainingPulses = SHOOT_EVERY_PULSES - (state.pulse % SHOOT_EVERY_PULSES);
  const timeToPulse = state.paused ? state.pausedRemainingMs : Math.max(0, state.deadline - now);
  const secondsToShoot = Math.ceil((timeToPulse + (remainingPulses - 1) * PULSE_INTERVAL_MS) / 1000);
  const progressWithinPulse = state.paused
    ? 0
    : 1 - Math.max(0, state.deadline - now) / PULSE_INTERVAL_MS;
  const progress = ((SHOOT_EVERY_PULSES - remainingPulses + progressWithinPulse)
    / SHOOT_EVERY_PULSES) * 100;

  elements.countdownLabel.textContent = state.paused
    ? "Photocall en pausa"
    : `Shoot en ${remainingPulses} ${remainingPulses === 1 ? "pulso" : "pulsos"}`;
  elements.clockNote.textContent = state.paused
    ? "Ruedas detenidas"
    : `Cuenta atrás: ${secondsToShoot} s`;
  elements.progressFill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
  elements.progress.setAttribute("aria-valuenow", String(Math.round(progress)));
}

function changeCostume(slot, direction) {
  if (state.shooting) return;

  const indexKey = slot === "left" ? "leftCostumeIndex" : "rightCostumeIndex";
  state[indexKey] = wrappedIndex(state[indexKey] + direction, COSTUMES.length);
  state.heldCostumeSlots.add(slot);
  elements.stage.dataset.result = "neutral";
  elements.resultMessage.textContent = `Disfraz del hueco ${slot === "left" ? "izquierdo" : "derecho"} cambiado. Quedará preparado para el próximo shoot.`;
  render();
}

function shootPhoto() {
  const result = evaluatePhoto();
  state.score += RESULT_POINTS[result.category];
  state.shooting = true;
  state.heldCostumeSlots.clear();
  elements.stage.dataset.result = result.category;
  elements.stage.classList.add("is-shooting");
  elements.costumeWheels.classList.add("is-stopped");
  elements.stageCaption.textContent = result.title;
  elements.resultMessage.textContent = `${result.message} (+${RESULT_POINTS[result.category]} puntos)`;
  render();

  state.shotTimeoutId = window.setTimeout(() => {
    state.shooting = false;
    elements.stage.classList.remove("is-shooting");
    elements.costumeWheels.classList.remove("is-stopped");
    render();
  }, SHOOT_FLASH_MS);
}

function advancePulse(manual = false) {
  if (state.shooting || (state.paused && !manual)) return;

  state.pulse += 1;
  state.feetIndex = getNextWheelIndex(state.feetIndex, WHEELS.feet, state.pulse);
  state.headsIndex = getNextWheelIndex(state.headsIndex, WHEELS.heads, state.pulse);
  state.deadline = performance.now() + PULSE_INTERVAL_MS;

  if (state.pulse % SHOOT_EVERY_PULSES === 0) {
    shootPhoto();
    return;
  }

  if (!state.heldCostumeSlots.has("left")) {
    state.leftCostumeIndex = wrappedIndex(state.leftCostumeIndex + 1, COSTUMES.length);
  }
  if (!state.heldCostumeSlots.has("right")) {
    state.rightCostumeIndex = wrappedIndex(state.rightCostumeIndex + 1, COSTUMES.length);
  }

  elements.stage.dataset.result = "neutral";
  elements.resultMessage.textContent = "Ruedas en marcha. Lee la próxima pista y prepara los dos disfraces.";
  render();
}

function togglePause() {
  if (state.shooting) return;
  if (state.paused) {
    state.paused = false;
    state.deadline = performance.now() + state.pausedRemainingMs;
  } else {
    state.paused = true;
    state.pausedRemainingMs = Math.max(0, state.deadline - performance.now());
  }
  render();
}

function restartGame() {
  window.clearTimeout(state.shotTimeoutId);
  state.pulse = 0;
  state.feetIndex = WHEELS.feet.initialIndex;
  state.headsIndex = WHEELS.heads.initialIndex;
  state.leftCostumeIndex = 0;
  state.rightCostumeIndex = 2;
  state.heldCostumeSlots.clear();
  state.score = 0;
  state.paused = false;
  state.pausedRemainingMs = 0;
  state.shooting = false;
  state.deadline = performance.now() + PULSE_INTERVAL_MS;
  elements.stage.classList.remove("is-shooting");
  elements.costumeWheels.classList.remove("is-stopped");
  elements.stage.dataset.result = "neutral";
  elements.resultMessage.textContent = "Adivina qué personajes coincidirán y prepara los dos disfraces.";
  render();
}

elements.leftPrevious.addEventListener("click", () => changeCostume("left", -1));
elements.leftNext.addEventListener("click", () => changeCostume("left", 1));
elements.rightPrevious.addEventListener("click", () => changeCostume("right", -1));
elements.rightNext.addEventListener("click", () => changeCostume("right", 1));
elements.advancePulse.addEventListener("click", () => advancePulse(true));
elements.pause.addEventListener("click", togglePause);
elements.restart.addEventListener("click", restartGame);
window.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
  if (event.target.matches("button, a, input, textarea, select")) return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    changeCostume("left", -1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    changeCostume("left", 1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    changeCostume("right", -1);
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    changeCostume("right", 1);
  } else if (event.code === "Space") {
    event.preventDefault();
    advancePulse(true);
  }
});

state.timerId = window.setInterval(() => {
  if (state.paused || state.shooting) {
    updateCountdown();
    return;
  }
  if (performance.now() >= state.deadline) advancePulse();
  else updateCountdown();
}, CLOCK_REFRESH_MS);

window.addEventListener("pagehide", () => {
  window.clearInterval(state.timerId);
  window.clearTimeout(state.shotTimeoutId);
}, { once: true });

render();
window.requestAnimationFrame(() => document.body.classList.add("is-arriving"));
