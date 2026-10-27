// Ajusta este valor para acercar o alejar el zoom de la cámara.
const ZOOM_SCALE = 1.55;
// Punto del viewport donde queda el jugador; usa valores entre 0 y 1 para cambiar el POV.
const CAMERA_FOCUS_X = 0.5;
const CAMERA_FOCUS_Y = 0.5;
// Desplazamiento manual adicional del encuadre, en píxeles.
const CAMERA_POV_OFFSET_X = 0;
const CAMERA_POV_OFFSET_Y = 0;
// El seguimiento no interpola para evitar que la cámara se quede atrás al caminar.
const CAMERA_FOLLOW_TRANSITION_MS = 0;
const INACTIVITY_DELAY_MS = 5000;

export function createFairCamera({ viewport, world, player, delay = INACTIVITY_DELAY_MS, scale = ZOOM_SCALE }) {
  if (!viewport || !world || !player) {
    throw new Error("Fair camera requires a viewport, world layer, and player controller.");
  }

  let zoomed = false;
  let deadline = 0;
  let wasMoving = false;

  function showWorld(timestamp = performance.now()) {
    zoomed = false;
    deadline = timestamp + delay;
    world.style.transitionDuration = "";
    world.dataset.cameraState = "overview";
    world.style.setProperty("--camera-scale", "1");
    world.style.setProperty("--camera-offset-x", "0px");
    world.style.setProperty("--camera-offset-y", "0px");
  }

  function focusOnPlayer(following = false) {
    const bounds = viewport.getBoundingClientRect();
    const position = player.getPosition();
    const playerX = (position.x / 100) * bounds.width;
    const playerY = (position.y / 100) * bounds.height;

    world.style.transitionDuration = following
      ? `${CAMERA_FOLLOW_TRANSITION_MS}ms`
      : "";
    world.style.setProperty("--camera-scale", String(scale));
    world.style.setProperty(
      "--camera-offset-x",
      `${bounds.width * CAMERA_FOCUS_X - playerX * scale + CAMERA_POV_OFFSET_X}px`
    );
    world.style.setProperty(
      "--camera-offset-y",
      `${bounds.height * CAMERA_FOCUS_Y - playerY * scale + CAMERA_POV_OFFSET_Y}px`
    );
    world.dataset.cameraState = following ? "following" : "focused";
    zoomed = true;
  }

  function update(timestamp, moving = false) {
    if (zoomed) {
      focusOnPlayer(moving);
      return;
    }

    if (moving) {
      wasMoving = true;
      deadline = 0;
      return;
    }

    if (wasMoving) {
      deadline = timestamp + delay;
      wasMoving = false;
    }
    if (timestamp >= deadline && deadline > 0) focusOnPlayer();
  }

  function handleResize() {
    if (zoomed) focusOnPlayer();
  }

  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(viewport);
  showWorld();

  return {
    showWorld,
    update,
    destroy() {
      resizeObserver.disconnect();
    }
  };
}
