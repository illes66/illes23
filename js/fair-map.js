const ARTWORK_SELECTOR = "[data-art-src]";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
// Main fence animation: FLOWER_COUNT sets spacing, PATH_FLOWER_SIZE sets PNG size,
// PATH_FLOWER_SPEED sets travel speed in SVG units/ms, and FLOWER_ASSETS selects the PNGs.
const FLOWER_ASSETS = ["rosa.png.png"];
const FLOWER_COUNT = 8;
const PATH_FLOWER_SIZE = 96;
const PATH_FLOWER_SPEED = 0.025;
const PO_FLOWER_SIZE = 88;
// The walking-path SVG's yellow <use> references the fence path; update this selector if its export changes.
const WALKING_PATH_FENCE_SELECTOR = 'use[fill="#FDD423"]';
const PO_OUTLINE_FALLBACKS = {
  PO06_BenchArea: "M1290 510H1460V669H1290Z",
  PO07_FotoShootArea: "M605 75H763V232H605Z"
};

function addFlowerBackgroundFilter(svg) {
  const defs = document.createElementNS(SVG_NAMESPACE, "defs");
  const filter = document.createElementNS(SVG_NAMESPACE, "filter");
  filter.setAttribute("id", "flower-white-background");
  filter.setAttribute("color-interpolation-filters", "sRGB");

  const mask = document.createElementNS(SVG_NAMESPACE, "feColorMatrix");
  mask.setAttribute("in", "SourceGraphic");
  mask.setAttribute("type", "matrix");
  mask.setAttribute("values", "0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 -.299 -.587 -.114 0 1");
  mask.setAttribute("result", "white-mask");

  const composite = document.createElementNS(SVG_NAMESPACE, "feComposite");
  composite.setAttribute("in", "SourceGraphic");
  composite.setAttribute("in2", "white-mask");
  composite.setAttribute("operator", "arithmetic");
  composite.setAttribute("k1", "1");
  composite.setAttribute("k2", "0");
  composite.setAttribute("k3", "0");
  composite.setAttribute("k4", "0");

  filter.append(mask, composite);
  defs.append(filter);
  svg.prepend(defs);
}

function findReferencedPath(svg, useElement) {
  const href = useElement.getAttribute("href")
    ?? useElement.getAttributeNS("http://www.w3.org/1999/xlink", "href");
  if (!href?.startsWith("#")) {
    throw new Error(`Map artwork contains an unsupported SVG reference: ${href ?? "(missing)"}`);
  }

  const referencedElement = svg.getElementById(href.slice(1));
  if (!referencedElement || referencedElement.localName !== "path") {
    throw new Error(`Map artwork reference ${href} does not point to a path.`);
  }
  return referencedElement;
}

function copyPath(path, className, transform = "") {
  const copy = document.importNode(path, false);
  copy.removeAttribute("id");
  copy.setAttribute("class", className);
  copy.setAttribute("fill", "black");
  copy.setAttribute("opacity", "0");
  if (transform) copy.setAttribute("transform", transform);
  return copy;
}

async function fetchSvg(assetPath) {
  const response = await fetch(assetPath);
  if (!response.ok) {
    throw new Error(`Could not load map artwork ${assetPath}: ${response.status} ${response.statusText}`);
  }

  const document = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
  if (document.querySelector("parsererror")) {
    throw new Error(`Map artwork ${assetPath} is not valid SVG.`);
  }
  return document;
}

function addWalkableShapes(source, artLayer, walkableLayer, outlineLayer) {
  const poId = artLayer.dataset.poId;
  const isWalkingPath = artLayer.dataset.artSrc === "WalkingPath&Islandfence.svg";
  const greenUses = [...source.querySelectorAll('use[fill="#51743B"]')];
  const walkingPathFence = source.querySelector(WALKING_PATH_FENCE_SELECTOR);
  const uses = isWalkingPath ? [walkingPathFence].filter(Boolean) : greenUses;

  for (const useElement of uses) {
    const referencedPath = findReferencedPath(source, useElement);
    const useTransform = useElement.getAttribute("transform") ?? "";
    const walkableShape = copyPath(referencedPath, "walkable-area", useTransform);
    if (poId) walkableShape.dataset.poId = poId;
    walkableLayer.append(walkableShape);

    if (!poId) continue;
    const outlineShape = copyPath(referencedPath, "po-outline-shape", useTransform);
    outlineShape.removeAttribute("opacity");
    outlineShape.setAttribute("fill", "none");
    outlineShape.setAttribute("stroke", "currentColor");
    outlineShape.setAttribute("stroke-width", "5");
    outlineShape.setAttribute("stroke-linejoin", "round");
    const outlineGroup = outlineLayer.querySelector(`[data-po-id="${poId}"]`);
    outlineGroup.append(outlineShape);
  }

  if (poId && uses.length === 0 && PO_OUTLINE_FALLBACKS[poId]) {
    const outlineShape = document.createElementNS(SVG_NAMESPACE, "path");
    outlineShape.setAttribute("class", "po-outline-shape");
    outlineShape.setAttribute("d", PO_OUTLINE_FALLBACKS[poId]);
    outlineShape.setAttribute("fill", "none");
    outlineShape.setAttribute("stroke", "currentColor");
    outlineShape.setAttribute("stroke-width", "5");
    outlineLayer.querySelector(`[data-po-id="${poId}"]`).append(outlineShape);
  }
}

function addFenceFlowers(source, flowerLayer) {
  const fenceUse = source.querySelector(WALKING_PATH_FENCE_SELECTOR);
  if (!fenceUse) {
    throw new Error(`The walking-path SVG is missing its fence reference (${WALKING_PATH_FENCE_SELECTOR}).`);
  }
  const fencePath = findReferencedPath(source, fenceUse);

  const path = document.importNode(fencePath, false);
  path.setAttribute("class", "flower-motion-path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "none");
  flowerLayer.append(path);
  const length = path.getTotalLength();
  if (!Number.isFinite(length) || length <= 0) {
    throw new Error("The walking-path fence has no measurable length.");
  }

  const flowers = Array.from({ length: FLOWER_COUNT }, (_, index) => {
    const flower = document.createElementNS("http://www.w3.org/2000/svg", "image");
    flower.setAttribute("href", FLOWER_ASSETS[index % FLOWER_ASSETS.length]);
    flower.setAttribute("filter", "url(#flower-white-background)");
    flower.setAttribute("width", String(PATH_FLOWER_SIZE));
    flower.setAttribute("height", String(PATH_FLOWER_SIZE));
    flower.setAttribute("aria-hidden", "true");
    flower.dataset.flowerIndex = String(index);
    flowerLayer.append(flower);
    return flower;
  });

  return (timestamp) => {
    for (const flower of flowers) {
      const offset = Number(flower.dataset.flowerIndex) / flowers.length;
      const distance = (timestamp * PATH_FLOWER_SPEED + offset * length) % length;
      const point = path.getPointAtLength(distance);
      const halfSize = PATH_FLOWER_SIZE / 2;
      flower.setAttribute("x", String(point.x - halfSize));
      flower.setAttribute("y", String(point.y - halfSize));
    }
  };
}

function addPOFenceFlowers(outlineGroup, flowerLayer, poId, transform) {
  const candidatePaths = [...outlineGroup.querySelectorAll(".po-outline-shape")]
    .filter((path) => {
      const length = path.getTotalLength();
      return Number.isFinite(length) && length > 0;
    })
    .sort((first, second) => second.getTotalLength() - first.getTotalLength());
  const fencePath = candidatePaths[0];
  if (!fencePath) throw new Error(`The ${poId} attraction has no usable fence path.`);

  const path = document.importNode(fencePath, false);
  path.setAttribute("class", "flower-motion-path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "none");

  const track = document.createElementNS(SVG_NAMESPACE, "g");
  track.classList.add("po-fence-flower-track");
  track.dataset.poId = poId;
  track.setAttribute("transform", transform);
  track.append(path);

  const flower = document.createElementNS(SVG_NAMESPACE, "image");
  flower.setAttribute("href", FLOWER_ASSETS[0]);
  flower.setAttribute("filter", "url(#flower-white-background)");
  flower.setAttribute("width", String(PO_FLOWER_SIZE));
  flower.setAttribute("height", String(PO_FLOWER_SIZE));
  flower.setAttribute("transform", path.getAttribute("transform") ?? "");
  flower.setAttribute("aria-hidden", "true");
  track.append(flower);
  flowerLayer.append(track);

  const length = path.getTotalLength();
  return (timestamp) => {
    if (!track.classList.contains("is-player-inside")) return;
    const point = path.getPointAtLength((timestamp * 0.025) % length);
    const halfSize = PO_FLOWER_SIZE / 2;
    flower.setAttribute("x", String(point.x - halfSize));
    flower.setAttribute("y", String(point.y - halfSize));
  };
}

export async function loadFairMapArtwork() {
  const artworkLayers = [...document.querySelectorAll(ARTWORK_SELECTOR)];
  const fairArt = document.querySelector("#fair-art");
  const walkableLayer = document.querySelector("#walkable-areas");
  const outlineLayer = document.querySelector("#po-outlines");
  const flowerLayer = document.querySelector("#fence-flowers");
  const poFlowerLayer = document.querySelector("#po-fence-flowers");
  if (!fairArt || !walkableLayer || !outlineLayer || !flowerLayer || !poFlowerLayer) {
    throw new Error("The fair map is missing its collision, outline, or flower layer.");
  }
  addFlowerBackgroundFilter(fairArt);

  let updateFlowers = null;
  const updatePOFlowers = [];
  await Promise.all(artworkLayers.map(async (artLayer) => {
    const assetPath = artLayer.dataset.artSrc;
    const source = await fetchSvg(assetPath);
    const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
    image.setAttribute("href", assetPath);
    image.setAttribute("width", source.documentElement.getAttribute("width"));
    image.setAttribute("height", source.documentElement.getAttribute("height"));
    // Keep source artwork proportions; position/size are controlled by the parent SVG transform.
    image.setAttribute("preserveAspectRatio", "xMidYMid meet");
    artLayer.append(image);

    const poId = artLayer.dataset.poId;
    const walkableGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    walkableGroup.setAttribute("transform", artLayer.getAttribute("transform") ?? "");
    walkableLayer.append(walkableGroup);
    let outlineGroup = null;
    if (poId) {
      outlineGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      outlineGroup.setAttribute("class", "po-outline");
      outlineGroup.dataset.poId = poId;
      outlineGroup.setAttribute("transform", artLayer.getAttribute("transform") ?? "");
      outlineLayer.append(outlineGroup);
    }

    addWalkableShapes(source, artLayer, walkableGroup, outlineLayer);
    if (poId) {
      updatePOFlowers.push(addPOFenceFlowers(
        outlineGroup,
        poFlowerLayer,
        poId,
        artLayer.getAttribute("transform") ?? ""
      ));
    }

    if (assetPath === "WalkingPath&Islandfence.svg") {
      // Keep flowers in the same transformed SVG coordinates as the rendered path.
      // When the path moves or scales, change its transform in index.html only.
      flowerLayer.setAttribute("transform", artLayer.getAttribute("transform") ?? "");
      updateFlowers = addFenceFlowers(source, flowerLayer);
    }
  }));

  if (!updateFlowers) throw new Error("The fair map is missing its walking-path flower source.");
  return {
    updateFlowers(timestamp) {
      updateFlowers(timestamp);
      updatePOFlowers.forEach((updatePOFlower) => updatePOFlower(timestamp));
    }
  };
}
