const DIRECTION_KEYS = new Map([
  ["KeyW", "up"], ["ArrowUp", "up"],
  ["KeyA", "left"], ["ArrowLeft", "left"],
  ["KeyS", "down"], ["ArrowDown", "down"],
  ["KeyD", "right"], ["ArrowRight", "right"]
]);

const DIRECTION_ACTIONS = new Set(["up", "down", "left", "right"]);

export function createInputHandler({ onDirection, onConfirm, root = document }) {
  const heldSources = new Map();
  const pointerActions = new Map();
  const pressedConfirmKeys = new Set();

  function setDirection(action, source, pressed) {
    if (!DIRECTION_ACTIONS.has(action)) return;

    let sources = heldSources.get(action);
    if (!sources) {
      sources = new Set();
      heldSources.set(action, sources);
    }

    const wasPressed = sources.size > 0;
    if (pressed) sources.add(source);
    else sources.delete(source);

    const isPressed = sources.size > 0;
    if (wasPressed !== isPressed) onDirection(action, isPressed);
  }

  function pressConfirm(button) {
    onConfirm();
    button?.classList.add("is-pressed");
  }

  function releaseConfirm(button) {
    button?.classList.remove("is-pressed");
  }

  function onKeyDown(event) {
    const direction = DIRECTION_KEYS.get(event.code);
    if (direction) {
      event.preventDefault();
      setDirection(direction, `key:${event.code}`, true);
      return;
    }

    if ((event.code === "Space" || event.code === "Enter") && !event.repeat) {
      event.preventDefault();
      pressedConfirmKeys.add(event.code);
      pressConfirm(root.querySelector('[data-action="confirm"]'));
    }
  }

  function onKeyUp(event) {
    const direction = DIRECTION_KEYS.get(event.code);
    if (direction) {
      setDirection(direction, `key:${event.code}`, false);
      return;
    }

    if (pressedConfirmKeys.delete(event.code)) {
      releaseConfirm(root.querySelector('[data-action="confirm"]'));
    }
  }

  function onPointerDown(event) {
    const button = event.target.closest("[data-action]");
    if (!button || !root.contains(button)) return;
    event.preventDefault();

    const action = button.dataset.action;
    if (action === "confirm") {
      pointerActions.set(event.pointerId, { action, button });
      pressConfirm(button);
      return;
    }

    if (DIRECTION_ACTIONS.has(action)) {
      pointerActions.set(event.pointerId, { action, button });
      button.classList.add("is-pressed");
      setDirection(action, `pointer:${event.pointerId}`, true);
      button.setPointerCapture?.(event.pointerId);
    }
  }

  function onPointerUp(event) {
    const pressed = pointerActions.get(event.pointerId);
    if (!pressed) return;
    pointerActions.delete(event.pointerId);

    if (DIRECTION_ACTIONS.has(pressed.action)) {
      setDirection(pressed.action, `pointer:${event.pointerId}`, false);
      pressed.button.classList.remove("is-pressed");
    } else {
      releaseConfirm(pressed.button);
    }
  }

  function releaseAll() {
    for (const [action, sources] of heldSources) {
      if (sources.size) onDirection(action, false);
    }
    heldSources.clear();
    for (const { button } of pointerActions.values()) releaseConfirm(button);
    pointerActions.clear();
    pressedConfirmKeys.clear();
    root.querySelectorAll(".is-pressed").forEach((button) => button.classList.remove("is-pressed"));
  }

  root.addEventListener("keydown", onKeyDown);
  root.addEventListener("keyup", onKeyUp);
  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointerup", onPointerUp);
  root.addEventListener("pointercancel", onPointerUp);
  root.defaultView?.addEventListener("blur", releaseAll);

  return {
    destroy() {
      root.removeEventListener("keydown", onKeyDown);
      root.removeEventListener("keyup", onKeyUp);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointercancel", onPointerUp);
      root.defaultView?.removeEventListener("blur", releaseAll);
      releaseAll();
    }
  };
}
