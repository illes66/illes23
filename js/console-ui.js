export async function loadDirectionalPadArtwork(root = document) {
  const pads = [...root.querySelectorAll(".control-pad")];
  if (!pads.length) return;

  const response = await fetch(new URL("../UIConsolePadDirectionalButton.svg", import.meta.url));
  if (!response.ok) {
    throw new Error(`Could not load the directional pad artwork (${response.status}).`);
  }

  const source = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
  if (source.querySelector("parsererror") || source.documentElement.localName !== "svg") {
    throw new Error("The directional pad artwork is not a valid SVG document.");
  }

  const ownerDocument = root.nodeType === 9 ? root : root.ownerDocument;
  const artwork = pads.map((pad) => {
    const svg = ownerDocument.importNode(source.documentElement, true);
    svg.classList.add("direction-pad-art");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const vertical = svg.querySelector(".DirectionPadVertical");
    const horizontal = svg.querySelector(".DirectionPadHorizontal");
    if (!vertical || !horizontal) {
      throw new Error("The directional pad artwork is missing its horizontal or vertical shadow layer.");
    }

    return { pad, svg };
  });

  for (const { pad, svg } of artwork) pad.prepend(svg);
}
