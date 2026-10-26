export function createPortals({ viewport, player, promptElement, statusElement }) {
  const links = [...viewport.querySelectorAll("[data-portal][href]")];
  let selectedPortal = null;
  let lastAnnouncedPortal = null;
  const activationRadius = 15;

  function selectNearest(position) {
    const viewportBounds = viewport.getBoundingClientRect();
    let nearest = null;

    for (const link of links) {
      const bounds = link.getBoundingClientRect();
      const portalX = ((bounds.left + bounds.width / 2 - viewportBounds.left) / viewportBounds.width) * 100;
      const portalY = ((bounds.top + bounds.height / 2 - viewportBounds.top) / viewportBounds.height) * 100;
      const distance = Math.hypot(portalX - position.x, portalY - position.y);
      if (!nearest || distance < nearest.distance) nearest = { link, distance };
    }

    selectedPortal = nearest && nearest.distance <= activationRadius ? nearest.link : null;
    links.forEach((link) => {
      const isSelected = link === selectedPortal;
      link.classList.toggle("is-selected", isSelected);
      if (isSelected) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });

    const portalName = selectedPortal?.querySelector("span:last-child")?.textContent ?? "";
    if (selectedPortal) {
      promptElement.textContent = `Press Space or the center button to enter ${portalName}.`;
      statusElement.textContent = `Nearby: ${portalName}`;
      if (lastAnnouncedPortal !== selectedPortal) {
        selectedPortal.focus({ preventScroll: true });
        lastAnnouncedPortal = selectedPortal;
      }
    } else {
      promptElement.textContent = "Move toward an attraction and press Space.";
      statusElement.textContent = "The fair is waiting for you";
      lastAnnouncedPortal = null;
    }
  }

  function navigate(link) {
    if (!link) return;
    document.body.classList.add("is-transitioning");
    window.setTimeout(() => {
      window.location.assign(link.href);
    }, 140);
  }

  function enterSelected() {
    if (selectedPortal) navigate(selectedPortal);
  }

  for (const link of links) {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      selectedPortal = link;
      navigate(link);
    });
    link.addEventListener("focus", () => {
      selectedPortal = link;
      link.classList.add("is-selected");
    });
  }

  return {
    update: () => selectNearest(player.getPosition()),
    enterSelected
  };
}
