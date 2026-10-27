const body = document.body;
const returnLink = document.querySelector(".back-to-fair");
const attractionName = document.querySelector("#attraction-title");
const attractionNumber = document.querySelector("#attraction-number");
const attractionScreen = document.querySelector("#fair-attraction");
const attractions = {
  PO02_ComicForeground: { number: "02", name: "Comic", theme: "comic" },
  PO05_TeatrinoArea: { number: "05", name: "Teatrino", theme: "teatrino" },
  PO06_BenchArea: { number: "06", name: "Bench", theme: "bench" },
  PO07_FotoShootArea: { number: "07", name: "Photo Shoot", theme: "photo-shoot" },
  PO08_CafeteriaArea: { number: "08", name: "Cafeteria", theme: "cafeteria" }
};

if (!returnLink) throw new Error("The attraction page is missing its Return to the fair link.");

const attraction = attractions[new URLSearchParams(window.location.search).get("po")];
if (attraction && attractionName && attractionNumber && attractionScreen) {
  attractionName.textContent = attraction.name;
  attractionNumber.textContent = `Portal ${attraction.number} · Attraction WIP`;
  attractionScreen.dataset.miniGame = attraction.theme;
  document.title = `${attraction.name} — Illes 23 Fair`;
}

window.requestAnimationFrame(() => body.classList.add("is-arriving"));

returnLink.addEventListener("click", (event) => {
  event.preventDefault();
  body.classList.remove("is-arriving");
  body.classList.add("is-leaving");
  // Match the map's 560ms navigation delay and keep it just above the curtain transition
  // in css/fair-map.css so the return animation finishes before loading the fair.
  window.setTimeout(() => window.location.assign(returnLink.href), 560);
});
