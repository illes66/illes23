const DIRECTION_VECTORS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0]
};

export function createPlayerController({
  element,
  viewport,
  routePath,
  movementMode = "path",
  speed = 24
}) {
  const position = { x: 8, y: 68 };
  const heldDirections = new Set();

  function routePointAt(distance) {
    if (!routePath) return { x: position.x, y: position.y };
    const svg = routePath.ownerSVGElement;
    const transform = routePath.getScreenCTM();
    const viewportBounds = viewport.getBoundingClientRect();
    const routeLength = routePath.getTotalLength();
    if (!svg || !transform || routeLength === 0 || viewportBounds.width === 0 || viewportBounds.height === 0) {
      return { x: position.x, y: position.y };
    }

    const point = routePath.getPointAtLength(Math.max(0, Math.min(routeLength, distance)));
    const screenPoint = new DOMPoint(point.x, point.y).matrixTransform(transform);
    return {
      x: ((screenPoint.x - viewportBounds.left) / viewportBounds.width) * 100,
      y: ((screenPoint.y - viewportBounds.top) / viewportBounds.height) * 100
    };
  }

  function findNearestRouteDistance(x, y) {
    if (!routePath || movementMode !== "path") return 0;
    const routeLength = routePath.getTotalLength();
    let nearestDistance = 0;
    let nearestSquaredDistance = Number.POSITIVE_INFINITY;

    for (let distance = 0; distance <= routeLength; distance += 0.5) {
      const point = routePointAt(distance);
      const deltaX = point.x - x;
      const deltaY = point.y - y;
      const squaredDistance = deltaX * deltaX + deltaY * deltaY;
      if (squaredDistance < nearestSquaredDistance) {
        nearestDistance = distance;
        nearestSquaredDistance = squaredDistance;
      }
    }

    return nearestDistance;
  }

  let routeDistance = findNearestRouteDistance(position.x, position.y);

  function setDirection(direction, pressed) {
    if (!DIRECTION_VECTORS[direction]) return;
    if (pressed) heldDirections.add(direction);
    else heldDirections.delete(direction);
  }

  function update(deltaSeconds) {
    let horizontal = 0;
    let vertical = 0;
    for (const direction of heldDirections) {
      horizontal += DIRECTION_VECTORS[direction][0];
      vertical += DIRECTION_VECTORS[direction][1];
    }

    const magnitude = Math.hypot(horizontal, vertical);
    if (magnitude > 0) {
      if (movementMode === "free") {
        // Free-walk mode allows exploring the park. Add collision zones or transport
        // interaction areas here, and keep the player inside the viewport bounds.
        const distance = (speed * Math.min(deltaSeconds, 0.05)) / magnitude;
        position.x = Math.max(2, Math.min(98, position.x + horizontal * distance));
        position.y = Math.max(4, Math.min(96, position.y + vertical * distance));
      } else {
        // Follow the route's local tangent so vertical/horizontal input can move along
        // a curved trail; projecting every tiny step directly onto the path can pin the
        // player at endpoints where the route initially points diagonally.
        const routeLength = routePath?.getTotalLength() ?? 0;
        const tangentOffset = 0.5;
        const before = routePointAt(routeDistance - tangentOffset);
        const after = routePointAt(routeDistance + tangentOffset);
        const tangentX = after.x - before.x;
        const tangentY = after.y - before.y;
        const tangentLength = Math.hypot(tangentX, tangentY);
        if (tangentLength > 0 && routeLength > 0) {
          const directionAlongRoute = (
            (horizontal / magnitude) * (tangentX / tangentLength)
            + (vertical / magnitude) * (tangentY / tangentLength)
          );
          routeDistance = Math.max(
            0,
            Math.min(routeLength, routeDistance + directionAlongRoute * speed * Math.min(deltaSeconds, 0.05))
          );
          const point = routePointAt(routeDistance);
          position.x = point.x;
          position.y = point.y;
        }
      }

      render();
    }
  }

  function render() {
    element.style.left = `${position.x}%`;
    element.style.top = `${position.y}%`;
  }

  function getPosition() {
    return { x: position.x, y: position.y };
  }

  render();
  return { setDirection, update, getPosition };
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
