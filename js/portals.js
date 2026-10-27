export function createPortals({
  viewport,
  player,
  promptElement,
  statusElement,
  initialPortalId,
  onBeforeNavigate,
  onAttractionVisited = () => {}
}) {
  const portals = [...viewport.querySelectorAll("[data-portal][data-po-id]")];
  const artworkLayers = [...viewport.querySelectorAll(".po-art[data-po-id]")];
  const gateRadius = 4.2;
  let selectedPortal = portals.find((portal) => portal.dataset.portal === initialPortalId)
    ?? portals[0]
    ?? null;
  let selectedManually = false;
  let navigationStarted = false;

  function portalName(portal) {
    return portal.querySelector("span:last-child")?.textContent?.trim() ?? portal.dataset.portal;
  }

  function getPlayerAreaId(position = player.getPosition()) {
    return portals.find((portal) => isPlayerInside(portal, position))?.dataset.poId ?? null;
  }

  function isPlayerInside(portal, position) {
    const left = Number(portal.dataset.zoneX);
    const top = Number(portal.dataset.zoneY);
    const right = left + Number(portal.dataset.zoneWidth);
    const bottom = top + Number(portal.dataset.zoneHeight);
    return position.x >= left && position.x <= right && position.y >= top && position.y <= bottom;
  }

  function isPlayerAtGate(portal, position = player.getPosition()) {
    const gateX = Number(portal.dataset.gateX);
    const gateY = Number(portal.dataset.gateY);
    return Math.hypot(gateX - position.x, gateY - position.y) <= gateRadius;
  }

  function setPOState(portal, state, enabled) {
    const poId = portal.dataset.poId;
    for (const layer of document.querySelectorAll(
      ".po-art[data-po-id], .po-outline[data-po-id], .po-fence-flower-track[data-po-id]"
    )) {
      if (layer.dataset.poId === poId) layer.classList.toggle(state, enabled);
    }
  }

  function select(portal, manual = false) {
    selectedPortal = portal;
    selectedManually = manual;
    portals.forEach((item) => {
      const isSelected = item === selectedPortal;
      item.classList.toggle("is-selected", isSelected);
      if (isSelected) item.setAttribute("aria-current", "location");
      else item.removeAttribute("aria-current");
      setPOState(item, "is-selected", isSelected);
    });
  }

  function moveSelection(action) {
    if (portals.length === 0) return;
    const currentIndex = portals.indexOf(selectedPortal);
    const direction = action === "portal-previous" ? -1 : 1;
    const nextIndex = currentIndex === -1
      ? (direction < 0 ? portals.length - 1 : 0)
      : (currentIndex + direction + portals.length) % portals.length;
    select(portals[nextIndex], true);
    update();
  }

  function update() {
    const position = player.getPosition();
    const insidePortal = portals.find((portal) => isPlayerInside(portal, position)) ?? null;
    for (const portal of portals) {
      setPOState(portal, "is-player-inside", isPlayerInside(portal, position));
    }

    if (insidePortal && (!selectedManually || insidePortal === selectedPortal)) {
      select(insidePortal);
    }

    if (!selectedPortal) {
      promptElement.textContent = "Use the left pad to choose an attraction.";
      statusElement.textContent = "The fair is waiting for you";
      return;
    }

    const name = portalName(selectedPortal);
    if (isPlayerAtGate(selectedPortal, position)) {
      promptElement.textContent = selectedPortal.matches("a[href]")
        ? `At the ${name} gate. Press Space or the center button to enter.`
        : `${name} is selected but not open yet.`;
      statusElement.textContent = `At the ${name} gate`;
    } else if (isPlayerInside(selectedPortal, position)) {
      promptElement.textContent = `${name} area. Walk through its Door / Portal gate to confirm entry.`;
      statusElement.textContent = `Explore ${name}`;
    } else {
      promptElement.textContent = `${name} selected. Walk to its Door / Portal gate, then confirm.`;
      statusElement.textContent = `Selected: ${name}`;
    }
  }

  function navigate(portal) {
    if (navigationStarted) return;
    navigationStarted = true;
    onAttractionVisited(portal.dataset.poId);
    onBeforeNavigate();
    document.body.classList.add("is-leaving");
    window.setTimeout(() => window.location.assign(portal.href), 560);
  }

  function enterSelected() {
    if (!selectedPortal) {
      statusElement.textContent = "Choose an attraction with the left pad first";
      return;
    }

    const name = portalName(selectedPortal);
    if (!isPlayerAtGate(selectedPortal)) {
      promptElement.textContent = `${name} selected. Walk through its Door / Portal gate before confirming.`;
      statusElement.textContent = `Walk to the ${name} gate to enter`;
      return;
    }

    if (!selectedPortal.matches("a[href]")) {
      promptElement.textContent = `${name} is still in development.`;
      statusElement.textContent = `${name} is not open yet`;
      return;
    }

    navigate(selectedPortal);
  }

  for (const portal of portals) {
    portal.addEventListener("click", (event) => {
      event.preventDefault();
      select(portal, true);
      update();
    });
    portal.addEventListener("focus", () => select(portal, true));
  }

  for (const artwork of artworkLayers) {
    artwork.addEventListener("click", () => {
      const portal = portals.find((item) => item.dataset.poId === artwork.dataset.poId);
      if (!portal) return;
      select(portal, true);
      update();
    });
  }

  if (selectedPortal) select(selectedPortal);

  return {
    update,
    moveSelection,
    enterSelected,
    getPlayerAreaId,
    getSelectedPortalId: () => selectedPortal?.dataset.portal ?? null
  };
}
