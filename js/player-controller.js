const DIRECTION_VECTORS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0]
};

export function createPlayerController({
  element,
  viewport,
  walkableAreas,
  movementMode = "area",
  // Movement speed in viewport percentage units per second; raise/lower to tune pace.
  speed = 24
}) {
  const position = { x: 50, y: 50 };
  const heldDirections = new Set();
  let destination = null;
  const mapSvg = viewport.querySelector("#fair-art");
  if (!mapSvg) throw new Error("The fair map artwork is missing its coordinate reference.");

  function isWalkable(x, y) {
    if (movementMode === "free") return true;

    const bounds = viewport.getBoundingClientRect();
    if (!walkableAreas.length || bounds.width === 0 || bounds.height === 0) {
      throw new Error("The fair map has no usable walkable areas for collision checks.");
    }

    const viewBox = mapSvg.viewBox.baseVal;
    const mapPoint = new DOMPoint(
      viewBox.x + (x / 100) * viewBox.width,
      viewBox.y + (y / 100) * viewBox.height
    );
    const mapTransform = mapSvg.getScreenCTM();
    if (!mapTransform) throw new Error("The fair map coordinate transform is unavailable.");
    const screenPoint = mapPoint.matrixTransform(mapTransform);
    return walkableAreas.some((area) => {
      const transform = area.getScreenCTM();
      if (!transform) throw new Error("A walkable map shape is unavailable for collision checks.");
      const localPoint = screenPoint.matrixTransform(transform.inverse());
      return area.isPointInFill(localPoint);
    });
  }

  function clampPosition(x, y) {
    return {
      x: Math.max(2, Math.min(98, x)),
      y: Math.max(4, Math.min(96, y))
    };
  }

  function nearestWalkablePosition(target) {
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    // Keep restored positions on the main path or one of the PO's green walkable areas.
    for (let y = 4; y <= 96; y += 1) {
      for (let x = 2; x <= 98; x += 1) {
        if (!isWalkable(x, y)) continue;
        const distance = (x - target.x) ** 2 + (y - target.y) ** 2;
        if (distance < nearestDistance) {
          nearest = { x, y };
          nearestDistance = distance;
        }
      }
    }

    if (!nearest) throw new Error("The yellow walkable area contains no usable player positions.");
    return nearest;
  }

  function setDirection(direction, pressed) {
    if (!DIRECTION_VECTORS[direction]) return;
    if (pressed) destination = null;
    if (pressed) heldDirections.add(direction);
    else heldDirections.delete(direction);
  }

  function moveToScreenPoint(clientX, clientY) {
    const mapTransform = mapSvg.getScreenCTM();
    if (!mapTransform) throw new Error("The fair map coordinate transform is unavailable.");

    const viewBox = mapSvg.viewBox.baseVal;
    const mapPoint = new DOMPoint(clientX, clientY).matrixTransform(mapTransform.inverse());
    const target = clampPosition(
      ((mapPoint.x - viewBox.x) / viewBox.width) * 100,
      ((mapPoint.y - viewBox.y) / viewBox.height) * 100
    );
    if (!isWalkable(target.x, target.y)) return false;

    heldDirections.clear();
    destination = target;
    return true;
  }

  function update(deltaSeconds) {
    let horizontal = 0;
    let vertical = 0;
    for (const direction of heldDirections) {
      horizontal += DIRECTION_VECTORS[direction][0];
      vertical += DIRECTION_VECTORS[direction][1];
    }

    const targetDistance = destination && heldDirections.size === 0
      ? Math.hypot(destination.x - position.x, destination.y - position.y)
      : null;
    if (targetDistance !== null) {
      if (targetDistance < 0.05) {
        position.x = destination.x;
        position.y = destination.y;
        destination = null;
        render();
        return;
      }
      horizontal = (destination.x - position.x) / targetDistance;
      vertical = (destination.y - position.y) / targetDistance;
    }

    const magnitude = Math.hypot(horizontal, vertical);
    if (magnitude === 0) return;

    // The 0.05s delta cap prevents a long frame from causing a large movement jump.
    const distance = Math.min(
      speed * Math.min(deltaSeconds, 0.05),
      targetDistance ?? Number.POSITIVE_INFINITY
    ) / magnitude;
    const previousPosition = { ...position };
    const next = clampPosition(
      position.x + (horizontal / magnitude) * distance,
      position.y + (vertical / magnitude) * distance
    );

    if (isWalkable(next.x, next.y)) {
      position.x = next.x;
      position.y = next.y;
    } else {
      // Si el movimiento combinado choca, se prueban los ejes por separado para permitir
      // que el jugador se deslice junto al borde del camino en vez de quedar bloqueado.
      const horizontalStep = clampPosition(position.x + (horizontal / magnitude) * distance, position.y);
      if (horizontal && isWalkable(horizontalStep.x, horizontalStep.y)) {
        position.x = horizontalStep.x;
      }
      const verticalStep = clampPosition(position.x, position.y + (vertical / magnitude) * distance);
      if (vertical && isWalkable(verticalStep.x, verticalStep.y)) {
        position.y = verticalStep.y;
      }
    }

    if (destination && position.x === previousPosition.x && position.y === previousPosition.y) {
      destination = null;
    }
    render();
  }

  function render() {
    element.style.left = `${position.x}%`;
    element.style.top = `${position.y}%`;
  }

  function getPosition() {
    return { x: position.x, y: position.y };
  }

  function getBounds() {
    return element.getBoundingClientRect();
  }

  function setPosition(nextPosition) {
    const clamped = clampPosition(nextPosition.x, nextPosition.y);
    const validPosition = movementMode === "free" || isWalkable(clamped.x, clamped.y)
      ? clamped
      : nearestWalkablePosition(clamped);
    position.x = validPosition.x;
    position.y = validPosition.y;
    render();
  }

  render();
  return {
    setDirection,
    update,
    getPosition,
    getBounds,
    setPosition,
    moveToScreenPoint,
    isMoving: () => heldDirections.size > 0 || destination !== null
  };
}

/*
 * TODO: Static PNG mode: set the player marker's background-image to one transparent
 * idle PNG and use background-size: contain.
 *
 * TODO: Sprite-sheet mode: add a sprite renderer that maps facing/moving state to
 * frame coordinates (idle, walk_L, walk_R, walk_back, jump). Prefer CSS background
 * position or a small canvas crop helper; update frames from the main loop without
 * changing the movement API above. Do not load animation libraries until artwork exists.
 */
