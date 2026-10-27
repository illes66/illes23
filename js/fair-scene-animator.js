const VISITED_ATTRACTIONS_KEY = "illes23-fair-visited-attractions";

// Add rules here when background artwork has a matching data-fair-asset hook.
// Triggers can be "time" (milliseconds on this fair page), "player-area" (PO ID),
// or "attraction-visited" (PO ID). Give each rule a CSS class to activate.
const SCENE_ANIMATION_RULES = [
  { trigger: "time", value: 30000, target: '[data-fair-asset="sun"]', className: "is-setting" },
  { trigger: "player-area", value: "PO04_LakeTour", target: '[data-fair-asset="ferris-wheel"]', className: "is-near" },
  { trigger: "attraction-visited", value: "PO03_CircusFishingGameArea", target: '[data-fair-asset="pagoda"]', className: "is-visited" }
];

function readVisitedAttractions() {
  const saved = sessionStorage.getItem(VISITED_ATTRACTIONS_KEY);
  if (!saved) return new Set();

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "string")) {
      throw new TypeError("Saved visited attractions must be an array of portal IDs.");
    }
    return new Set(parsed);
  } catch (error) {
    console.error("Could not restore visited fair attractions.", error);
    sessionStorage.removeItem(VISITED_ATTRACTIONS_KEY);
    return new Set();
  }
}

export class FairSceneAnimator {
  constructor({ viewport, world, rules = SCENE_ANIMATION_RULES }) {
    if (!viewport || !world) {
      throw new Error("Fair scene animator requires a viewport and world layer.");
    }

    this.viewport = viewport;
    this.world = world;
    this.rules = rules;
    this.startedAt = null;
    this.playerAreaId = null;
    this.visitedAttractions = readVisitedAttractions();
    this.firedTimeRules = new Set();
    this.active = false;
  }

  start(timestamp = performance.now()) {
    this.startedAt = timestamp;
    this.active = true;
    this.viewport.dataset.atmosphere = "active";

    this.visitedAttractions.forEach((portalId) => {
      this.applyRules("attraction-visited", portalId);
    });
  }

  update(timestamp, playerAreaId) {
    if (!this.active) return;

    this.rules.forEach((rule, index) => {
      if (rule.trigger !== "time" || timestamp - this.startedAt < rule.value) return;
      if (this.firedTimeRules.has(index)) return;
      this.firedTimeRules.add(index);
      this.applyRule(rule);
      this.dispatchEvent(rule);
    });

    if (playerAreaId === this.playerAreaId) return;
    if (this.playerAreaId) this.removeRules("player-area", this.playerAreaId);
    this.playerAreaId = playerAreaId;
    if (playerAreaId) this.applyRules("player-area", playerAreaId);
  }

  onAttractionVisited(portalId) {
    if (!portalId || this.visitedAttractions.has(portalId)) return;
    this.visitedAttractions.add(portalId);
    sessionStorage.setItem(VISITED_ATTRACTIONS_KEY, JSON.stringify([...this.visitedAttractions]));
    this.applyRules("attraction-visited", portalId);
  }

  applyRules(trigger, value) {
    this.rules
      .filter((rule) => rule.trigger === trigger && rule.value === value)
      .forEach((rule) => {
        this.applyRule(rule);
        this.dispatchEvent(rule);
      });
  }

  applyRule(rule) {
    this.world.querySelectorAll(rule.target).forEach((asset) => asset.classList.add(rule.className));
  }

  removeRules(trigger, value) {
    this.rules
      .filter((rule) => rule.trigger === trigger && rule.value === value)
      .forEach((rule) => {
        this.world.querySelectorAll(rule.target).forEach((asset) => asset.classList.remove(rule.className));
      });
  }

  dispatchEvent(rule) {
    this.world.dispatchEvent(new CustomEvent("fair:scene-event", {
      detail: { trigger: rule.trigger, value: rule.value, target: rule.target, className: rule.className }
    }));
  }

  destroy() {
    this.active = false;
  }
}
