const INTERACTIVE_OBJECT_SELECTOR = ".interactive-animated-object[data-interaction-x][data-interaction-y]";
const DEFAULT_INTERACTION_RADIUS = 8;

export function createInteractiveAnimatedObjects({ root, player }) {
  // Coordinates and radius use fair-map percentages. Add data-interaction-dialog for
  // a hover/proximity bubble; listen for the custom activation event to provide an action.
  const objects = [...root.querySelectorAll(INTERACTIVE_OBJECT_SELECTOR)];

  for (const object of objects) {
    const x = Number(object.dataset.interactionX);
    const y = Number(object.dataset.interactionY);
    const radius = Number(object.dataset.interactionRadius ?? DEFAULT_INTERACTION_RADIUS);
    if (![x, y, radius].every(Number.isFinite) || radius <= 0) {
      throw new Error(`Interactive object ${object.dataset.poId ?? object.id} has invalid map coordinates or radius.`);
    }
    object.dataset.interactionRadius = String(radius);
  }

  function update() {
    const position = player.getPosition();
    for (const object of objects) {
      const distance = Math.hypot(
        Number(object.dataset.interactionX) - position.x,
        Number(object.dataset.interactionY) - position.y
      );
      object.classList.toggle("is-interactive-near", distance <= Number(object.dataset.interactionRadius));
    }
  }

  function onClick(event) {
    const object = event.target.closest?.(INTERACTIVE_OBJECT_SELECTOR);
    if (!object || !root.contains(object)) return;
    object.dispatchEvent(new CustomEvent("interactive-object-activate", {
      bubbles: true,
      detail: {
        object,
        action: object.dataset.interactionAction ?? null
      }
    }));
  }

  root.addEventListener("click", onClick);
  update();

  return {
    update,
    destroy() {
      root.removeEventListener("click", onClick);
      for (const object of objects) object.classList.remove("is-interactive-near");
    }
  };
}
