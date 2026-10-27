// Control settings: edit these maps to reassign keyboard controls. Arrow keys move
// the character; WASD cycles portal selection; Space/Enter confirms the selected portal.
const MOVE_KEYS = new Map([
  ["ArrowUp", "up"],
  ["ArrowDown", "down"],
  ["ArrowLeft", "left"],
  ["ArrowRight", "right"]
]);

const PORTAL_KEYS = new Map([
  ["KeyW", { action: "portal-previous", direction: "up" }],
  ["KeyA", { action: "portal-previous", direction: "left" }],
  ["KeyS", { action: "portal-next", direction: "down" }],
  ["KeyD", { action: "portal-next", direction: "right" }]
]);

const MOVE_ACTIONS = new Set(["move-up", "move-down", "move-left", "move-right"]);

function setButtonPressed(button, pressed) {
  if (!button) return;
  button.classList.toggle("is-pressed", pressed);

  const pad = button.closest(".control-pad");
  const direction = button.dataset.padDirection;
  if (direction) pad?.classList.toggle(`is-${direction}-pressed`, pressed);
}

function selectPadDirection(button) {
  if (!button) return;
  const controller = button.closest(".console-controller");
  if (!controller) return;

  controller.querySelectorAll(".control-hit.is-selected").forEach((element) => {
    element.classList.remove("is-selected");
  });

  button.classList.add("is-selected");
}

export function createInputHandler({ onMove, onPortalNavigate, onConfirm, root = document }) {
  const heldMoves = new Map();
  const pointerActions = new Map();
  const pressedConfirmKeys = new Set();
  const view = root.defaultView ?? window;

  function updateMoveHighlight(direction) {
    const sources = heldMoves.get(direction);
    const button = root.querySelector(`[data-action="move-${direction}"]`);
    setButtonPressed(button, Boolean(sources?.size));
  }

  function setMove(direction, source, pressed) {
    let sources = heldMoves.get(direction);
    if (!sources) {
      sources = new Set();
      heldMoves.set(direction, sources);
    }

    const wasPressed = sources.size > 0;
    if (pressed) sources.add(source);
    else sources.delete(source);

    if (wasPressed !== (sources.size > 0)) onMove(direction, sources.size > 0);
    updateMoveHighlight(direction);
  }

  function pressConfirm(button) {
    onConfirm();
    setButtonPressed(button, true);
    view.setTimeout(() => setButtonPressed(button, false), 360);
  }

  function navigatePortals(action, direction) {
    onPortalNavigate(action);
    const button = root.querySelector(`[data-action="${action}"][data-pad-direction="${direction}"]`);
    selectPadDirection(button);
    setButtonPressed(button, true);
    view.setTimeout(() => setButtonPressed(button, false), 160);
  }

  function onKeyDown(event) {
    const moveDirection = MOVE_KEYS.get(event.code);
    if (moveDirection) {
      event.preventDefault();
      setMove(moveDirection, `key:${event.code}`, true);
      return;
    }

    const portalKey = PORTAL_KEYS.get(event.code);
    if (portalKey) {
      event.preventDefault();
      if (!event.repeat) navigatePortals(portalKey.action, portalKey.direction);
      return;
    }

    if ((event.code === "Space" || event.code === "Enter") && !event.repeat) {
      event.preventDefault();
      pressedConfirmKeys.add(event.code);
      pressConfirm(root.querySelector('[data-action="confirm"]'));
    }
  }

  function onKeyUp(event) {
    const moveDirection = MOVE_KEYS.get(event.code);
    if (moveDirection) {
      setMove(moveDirection, `key:${event.code}`, false);
      return;
    }

    if (pressedConfirmKeys.delete(event.code)) {
      setButtonPressed(root.querySelector('[data-action="confirm"]'), false);
    }
  }

  function onPointerDown(event) {
    const button = event.target.closest?.("[data-action]");
    if (!button || !root.contains(button)) return;

    const action = button.dataset.action;
    button.setPointerCapture?.(event.pointerId);

    if (action === "portal-previous" || action === "portal-next") {
      pointerActions.set(event.pointerId, { action, button });
      setButtonPressed(button, true);
      return;
    }

    if (action === "confirm") {
      pointerActions.set(event.pointerId, { action, button });
      setButtonPressed(button, true);
      return;
    }

    if (MOVE_ACTIONS.has(action)) {
      event.preventDefault();
      const direction = action.slice("move-".length);
      pointerActions.set(event.pointerId, { action, button });
      setMove(direction, `pointer:${event.pointerId}`, true);
    }
  }

  function onClick(event) {
    const button = event.target.closest?.('[data-action="confirm"], [data-action="portal-previous"], [data-action="portal-next"]');
    if (!button || !root.contains(button)) return;
    event.preventDefault();

    if (button.dataset.action === "confirm") {
      pressConfirm(button);
      return;
    }

    navigatePortals(button.dataset.action, button.dataset.padDirection);
  }

  function onPointerUp(event) {
    const pressed = pointerActions.get(event.pointerId);
    if (!pressed) return;
    pointerActions.delete(event.pointerId);
    setButtonPressed(pressed.button, false);

    if (MOVE_ACTIONS.has(pressed.action)) {
      setMove(pressed.action.slice("move-".length), `pointer:${event.pointerId}`, false);
    }
  }

  function releaseAll() {
    for (const [direction, sources] of heldMoves) {
      if (sources.size) onMove(direction, false);
    }
    heldMoves.clear();
    pointerActions.clear();
    pressedConfirmKeys.clear();
    root.querySelectorAll(".control-hit.is-pressed").forEach((button) => setButtonPressed(button, false));
  }

  root.addEventListener("keydown", onKeyDown);
  root.addEventListener("keyup", onKeyUp);
  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointerup", onPointerUp);
  root.addEventListener("pointercancel", onPointerUp);
  root.addEventListener("click", onClick);
  view.addEventListener("blur", releaseAll);

  return {
    destroy() {
      root.removeEventListener("keydown", onKeyDown);
      root.removeEventListener("keyup", onKeyUp);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointercancel", onPointerUp);
      root.removeEventListener("click", onClick);
      view.removeEventListener("blur", releaseAll);
      releaseAll();
    }
  };
}
