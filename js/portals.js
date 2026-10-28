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
  for (const portal of portals) {
    for (const [dataName, styleName] of [
      ["zoneX", "--zone-left"],
      ["zoneY", "--zone-top"],
      ["zoneWidth", "--zone-width"],
      ["zoneHeight", "--zone-height"]
    ]) {
      const value = Number(portal.dataset[dataName]);
      if (!Number.isFinite(value)) {
        throw new Error(`Portal ${portal.dataset.poId} has an invalid ${dataName}.`);
      }
      portal.style.setProperty(styleName, `${value}%`);
    }
  }

  let selectedPortal = portals.find((portal) => portal.dataset.portal === initialPortalId)
    ?? portals[0]
    ?? null;
  let selectedManually = false;
  let selectionHighlightActive = false;
  let navigationStarted = false;

  function portalName(portal) {
    return portal.querySelector(".portal-name")?.textContent?.trim()
      ?? portal.querySelector("span:last-child")?.textContent?.trim()
      ?? portal.dataset.portal;
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

  function setPOState(portal, state, enabled) {
    portal.classList.toggle(state, enabled);
    const poId = portal.dataset.poId;
    for (const layer of document.querySelectorAll(
      ".po-art[data-po-id], .po-outline[data-po-id], .po-fence-flower-track[data-po-id]"
    )) {
      if (layer.dataset.poId === poId) layer.classList.toggle(state, enabled);
    }
  }

  function updateSelectionHighlight() {
    for (const portal of portals) {
      setPOState(portal, "is-selected", selectionHighlightActive && portal === selectedPortal);
    }
  }

  function select(portal, manual = false) {
    selectedPortal = portal;
    selectedManually = manual;
    const portalLayer = portal.closest(".portal-layer");
    if (manual && portalLayer && portalLayer.scrollWidth > portalLayer.clientWidth) {
      portal.scrollIntoView({ block: "nearest", inline: "nearest" });
    }

    portals.forEach((item) => {
      const isSelected = item === selectedPortal;
      if (isSelected) item.setAttribute("aria-current", "location");
      else item.removeAttribute("aria-current");
    });
    updateSelectionHighlight();
  }

  function moveSelection(action) {
    if (portals.length === 0) return;
    selectionHighlightActive = true;
    const currentIndex = portals.indexOf(selectedPortal);
    const direction = action === "portal-previous" ? -1 : 1;
    const nextIndex = currentIndex === -1
      ? (direction < 0 ? portals.length - 1 : 0)
      : (currentIndex + direction + portals.length) % portals.length;
    select(portals[nextIndex], true);
    update();
  }

  function clearSelectionHighlight() {
    selectionHighlightActive = false;
    selectedManually = false;
    updateSelectionHighlight();
  }

  function update() {
    const position = player.getPosition();
    const insidePortal = portals.find((portal) => isPlayerInside(portal, position)) ?? null;
    for (const portal of portals) {
      setPOState(portal, "is-player-inside", isPlayerInside(portal, position));
    }

    if (insidePortal && !selectedManually) {
      select(insidePortal);
    }

    if (!selectedPortal) {
      if (promptElement) promptElement.textContent = "Use the left pad to choose an attraction.";
      statusElement.textContent = "The fair is waiting for you";
      return;
    }

    const name = portalName(selectedPortal);
    if (isPlayerInside(selectedPortal, position)) {
      if (promptElement) {
        promptElement.textContent = `${name} area. Click its highlighted entrance or press Space / the center button to enter.`;
      }
      statusElement.textContent = `Explore ${name}`;
    } else {
      if (promptElement) {
        promptElement.textContent = `${name} selected. Click its highlighted entrance or press Space / the center button to enter.`;
      }
      statusElement.textContent = `Selected: ${name}`;
    }
  }

  function navigate(portal) {
    if (navigationStarted) return;
    navigationStarted = true;
    onAttractionVisited(portal.dataset.poId);
    onBeforeNavigate(portal);
    document.body.classList.add("is-leaving");
    window.setTimeout(() => window.location.assign(portal.href), 560);
  }

  function enterSelected() {
    if (!selectedPortal) {
      statusElement.textContent = "Choose an attraction with the left pad first";
      return;
    }

    navigate(selectedPortal);
  }

  for (const portal of portals) {
    portal.addEventListener("click", (event) => {
      event.preventDefault();
      select(portal, true);
      navigate(portal);
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
    clearSelectionHighlight,
    enterSelected,
    getPlayerAreaId,
    getSelectedPortalId: () => selectedPortal?.dataset.portal ?? null
  };
}
