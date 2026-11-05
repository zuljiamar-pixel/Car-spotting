import { getAllSpots, addSpot, deleteSpot, putSpots, clearSpots } from "./db.js";

// ---------- Spielregeln ----------

const RARITY = {
  common: { label: "Häufig", points: 10, rank: 0 },
  uncommon: { label: "Ungewöhnlich", points: 25, rank: 1 },
  rare: { label: "Selten", points: 50, rank: 2 },
  epic: { label: "Episch", points: 100, rank: 3 },
  legendary: { label: "Legendär", points: 250, rank: 4 },
};
const RARITY_KEYS = Object.keys(RARITY);
const NEW_BRAND_BONUS = 50;
const NEW_MODEL_BONUS = 20;

const BRAND_TIERS = [
  { min: 3, name: "Bronze", icon: "🥉" },
  { min: 5, name: "Silber", icon: "🥈" },
  { min: 10, name: "Gold", icon: "🥇" },
  { min: 25, name: "Diamant", icon: "💎" },
];

const LEVEL_TITLES = [
  "Neuling", "Gelegenheits-Spotter", "Spotter", "Auto-Fan", "Kenner",
  "Profi-Spotter", "Experte", "Meister-Spotter", "Legende",
];

const ACHIEVEMENTS = [
  { icon: "🚗", title: "Erster Spot", desc: "Dein erstes Auto gespottet", goal: 1, value: (s) => s.total },
  { icon: "🔟", title: "Zehner-Pack", desc: "10 Autos gespottet", goal: 10, value: (s) => s.total },
  { icon: "🏁", title: "Halbe Hundert", desc: "50 Autos gespottet", goal: 50, value: (s) => s.total },
  { icon: "💯", title: "Hunderter-Club", desc: "100 Autos gespottet", goal: 100, value: (s) => s.total },
  { icon: "🏷️", title: "Markenkenner", desc: "5 verschiedene Marken", goal: 5, value: (s) => s.brands.length },
  { icon: "🌟", title: "Markensammler", desc: "15 verschiedene Marken", goal: 15, value: (s) => s.brands.length },
  { icon: "🌍", title: "Weltenbummler", desc: "Autos aus 5 Ländern", goal: 5, value: (s) => s.countries },
  { icon: "❤️", title: "Markentreue", desc: "10 Autos einer Marke", goal: 10, value: (s) => s.brands[0]?.count ?? 0 },
  { icon: "💠", title: "Seltener Fund", desc: "Ein seltenes Auto gespottet", goal: 1, value: (s) => s.atLeastRarity(2) },
  { icon: "🔮", title: "Episch!", desc: "Ein episches Auto gespottet", goal: 1, value: (s) => s.atLeastRarity(3) },
  { icon: "👑", title: "Legende gesichtet", desc: "Ein legendäres Auto gespottet", goal: 1, value: (s) => s.atLeastRarity(4) },
  { icon: "⚡", title: "300er-Club", desc: "Ein Auto mit über 300 km/h", goal: 1, value: (s) => s.count((c) => c.specs?.top_speed_kmh >= 300) },
  { icon: "🐎", title: "Pferdestärken", desc: "Ein Auto mit über 500 PS", goal: 1, value: (s) => s.count((c) => c.specs?.power_hp >= 500) },
  { icon: "🔌", title: "Unter Strom", desc: "Ein Elektroauto gespottet", goal: 1, value: (s) => s.count((c) => /elektr/i.test(c.specs?.fuel_type ?? "")) },
];

// Häufige Schreibweisen auf eine Marke zusammenführen.
const BRAND_ALIASES = {
  vw: "Volkswagen",
  mercedes: "Mercedes-Benz",
  "mercedes benz": "Mercedes-Benz",
  "mercedes-amg": "Mercedes-Benz",
  "mercedes-maybach": "Mercedes-Benz",
  chevy: "Chevrolet",
  "alfa": "Alfa Romeo",
  "range rover": "Land Rover",
  "rolls royce": "Rolls-Royce",
};

// ---------- Hilfsfunktionen ----------

const $ = (sel) => document.querySelector(sel);

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

function brandName(make) {
  const trimmed = String(make ?? "").trim();
  const alias = trimmed.toLowerCase();
  return Object.hasOwn(BRAND_ALIASES, alias) ? BRAND_ALIASES[alias] : trimmed;
}
const brandKey = (make) => brandName(make).toLowerCase();
const modelKey = (car) => `${brandKey(car.make)}|${String(car.model ?? "").trim().toLowerCase()}`;

function carTitle(car) {
  const model = String(car.model ?? "").trim();
  const trim = String(car.trim ?? "").trim();
  if (!trim) return model;
  return trim.toLowerCase().includes(model.toLowerCase()) ? trim : `${model} ${trim}`;
}

function flag(code) {
  if (!/^[A-Z]{2}$/.test(code ?? "")) return "";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function brandColor(name) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${hash % 360} 70% 58%)`;
}

function initials(name) {
  const parts = name.split(/[\s-]+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

const num = (n, digits = 0) =>
  n == null ? "–" : Number(n).toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const formatDate = (ts) =>
  new Date(ts).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });

const rarityKey = (car) => (Object.hasOwn(RARITY, car.rarity) ? car.rarity : "common");
const rarityOf = (car) => RARITY[rarityKey(car)];

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

let toastTimer;
function toast(message, ms = 2800) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), ms);
}

// ---------- Zustand ----------

const state = {
  spots: [],
  view: "scan",
  pending: null, // { car, photo } – Ergebnis, das noch nicht gespeichert ist
  lastUpload: null, // { apiImage, photo } – für "Nochmal versuchen"
  brandFilter: null,
};

// ---------- Statistik ----------

function pointsFor(car, seenBrands, seenModels) {
  let points = rarityOf(car).points;
  const isNewBrand = !seenBrands.has(brandKey(car.make));
  const isNewModel = !seenModels.has(modelKey(car));
  if (isNewBrand) points += NEW_BRAND_BONUS;
  if (isNewModel) points += NEW_MODEL_BONUS;
  return { points, isNewBrand, isNewModel };
}

function computeStats(spots) {
  const ascending = [...spots].sort((a, b) => a.createdAt - b.createdAt);
  const seenBrands = new Set();
  const seenModels = new Set();
  const countries = new Set();
  const brands = new Map();
  const rarityCounts = Object.fromEntries(RARITY_KEYS.map((k) => [k, 0]));
  let points = 0;

  for (const spot of ascending) {
    const car = spot.car;
    points += pointsFor(car, seenBrands, seenModels).points;
    seenBrands.add(brandKey(car.make));
    seenModels.add(modelKey(car));
    if (car.origin_country_code) countries.add(car.origin_country_code);
    rarityCounts[rarityKey(car)]++;

    const key = brandKey(car.make);
    const entry = brands.get(key) ?? { key, name: brandName(car.make), count: 0, models: new Set(), country: car.origin_country_code };
    entry.count++;
    entry.models.add(modelKey(car));
    brands.set(key, entry);
  }

  const cars = spots.map((s) => s.car);
  const maxBy = (fn) => spots.reduce((best, s) => (fn(s.car) != null && (!best || fn(s.car) > fn(best.car)) ? s : best), null);

  return {
    total: spots.length,
    points,
    models: seenModels.size,
    countries: countries.size,
    rarityCounts,
    brands: [...brands.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "de")),
    fastest: maxBy((c) => c.specs?.top_speed_kmh),
    strongest: maxBy((c) => c.specs?.power_hp),
    rarest: maxBy((c) => rarityOf(c).rank),
    count: (fn) => cars.filter(fn).length,
    atLeastRarity: (rank) => cars.filter((c) => rarityOf(c).rank >= rank).length,
  };
}

function levelFor(points) {
  // Level L+1 erreicht man bei 50 · L · (L+1) Punkten: 100, 300, 600, 1000, …
  let level = 1;
  while (points >= 50 * level * (level + 1)) level++;
  const floor = 50 * (level - 1) * level;
  const next = 50 * level * (level + 1);
  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    progress: (points - floor) / (next - floor),
    next,
  };
}

function tierFor(count) {
  let tier = null;
  for (const t of BRAND_TIERS) if (count >= t.min) tier = t;
  const next = BRAND_TIERS.find((t) => count < t.min) ?? null;
  return { tier, next };
}

function unlockedAchievements(stats) {
  return ACHIEVEMENTS.filter((a) => a.value(stats) >= a.goal).map((a) => a.title);
}

// ---------- Bilder ----------

async function loadImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function resizeToJpeg(img, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

// ---------- Scannen ----------

const STATUS_TEXTS = [
  "KI analysiert das Auto …",
  "Prüfe Scheinwerfer und Kühlergrill …",
  "Bestimme Modell und Generation …",
  "Suche die technischen Daten …",
];

function showScanStep(step) {
  $("#scan-start").hidden = step !== "start";
  $("#scan-progress").hidden = step !== "progress";
  $("#scan-result").hidden = step !== "result";
  window.scrollTo({ top: 0 });
}

async function handleFile(file) {
  if (!file) return;
  let img;
  try {
    img = await loadImage(file);
  } catch {
    toast("Dieses Bild kann der Browser nicht öffnen. Versuch ein JPG oder PNG.");
    return;
  }
  const apiImage = resizeToJpeg(img, 1568, 0.85).split(",")[1];
  const photo = resizeToJpeg(img, 900, 0.8);
  state.lastUpload = { apiImage, photo };
  await identify();
}

async function identify() {
  const { apiImage, photo } = state.lastUpload;
  $("#scan-preview").src = photo;
  showScanStep("progress");

  let i = 0;
  $("#scan-status-text").textContent = STATUS_TEXTS[0];
  const ticker = setInterval(() => {
    i = (i + 1) % STATUS_TEXTS.length;
    $("#scan-status-text").textContent = STATUS_TEXTS[i];
  }, 2600);

  try {
    let res;
    try {
      res = await fetch("api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: apiImage, mediaType: "image/jpeg" }),
      });
    } catch {
      throw new Error("Keine Verbindung zum Server. Bist du online?");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Serverfehler (${res.status}).`);
    state.pending = { car: data.car, photo };
    renderScanResult();
  } catch (err) {
    renderScanError(err.message);
  } finally {
    clearInterval(ticker);
  }
}

function renderScanResult() {
  const { car, photo } = state.pending;
  const el = $("#scan-result");

  if (!car.is_car) {
    el.innerHTML = `
      <div class="message-card">
        <img src="${esc(photo)}" alt="">
        <h2>Kein Auto erkannt</h2>
        <p>${esc(car.not_car_reason || "Auf dem Foto konnte kein Auto gefunden werden.")}</p>
        <button class="btn btn-primary" data-action="new-scan">Neues Foto</button>
      </div>`;
    showScanStep("result");
    return;
  }

  const seenBrands = new Set(state.spots.map((s) => brandKey(s.car.make)));
  const seenModels = new Set(state.spots.map((s) => modelKey(s.car)));
  const { points, isNewBrand, isNewModel } = pointsFor(car, seenBrands, seenModels);
  const sameModel = state.spots.filter((s) => modelKey(s.car) === modelKey(car)).length;

  const pills = [];
  if (isNewBrand) pills.push(`<span class="pill pill-accent">Neue Marke!</span>`);
  else if (isNewModel) pills.push(`<span class="pill pill-accent">Neues Modell!</span>`);
  else pills.push(`<span class="pill">Schon ${sameModel}× gespottet</span>`);
  pills.push(`<span class="pill pill-points">+${points} Punkte</span>`);

  el.innerHTML = `
    <div class="result-pills">${pills.join("")}</div>
    ${car.confidence < 45 ? `<div class="banner">Die KI ist sich unsicher. Ein Foto von vorne oder hinten mit sichtbarem Logo hilft.</div>` : ""}
    ${carCardHtml(car, photo)}
    <div class="action-bar">
      <button class="btn btn-ghost" data-action="discard">Verwerfen</button>
      <button class="btn btn-primary" data-action="save">In Garage speichern</button>
    </div>`;
  showScanStep("result");
}

function renderScanError(message) {
  $("#scan-result").innerHTML = `
    <div class="message-card">
      <img src="${esc(state.lastUpload.photo)}" alt="">
      <h2>Das hat nicht geklappt</h2>
      <p>${esc(message)}</p>
      <button class="btn btn-primary" data-action="retry">Nochmal versuchen</button>
      <button class="btn btn-ghost" data-action="new-scan">Anderes Foto</button>
    </div>`;
  showScanStep("result");
}

async function savePending() {
  const { car, photo } = state.pending;
  const before = unlockedAchievements(computeStats(state.spots));
  const seenBrands = new Set(state.spots.map((s) => brandKey(s.car.make)));
  const seenModels = new Set(state.spots.map((s) => modelKey(s.car)));
  const { points } = pointsFor(car, seenBrands, seenModels);

  const spot = { id: newId(), createdAt: Date.now(), photo, car };
  try {
    await addSpot(spot);
  } catch {
    toast("Speichern fehlgeschlagen – ist der Speicher voll?");
    return;
  }
  state.spots.unshift(spot);
  state.pending = null;

  const after = unlockedAchievements(computeStats(state.spots));
  const fresh = after.filter((t) => !before.includes(t));
  const message = `Gespeichert! +${points} Punkte`;
  toast(fresh.length ? `${message} · 🏆 ${fresh.join(", ")}` : message, fresh.length ? 4500 : 2800);

  renderAll();
  showScanStep("start");
}

// ---------- Auto-Karte (Ergebnis + Detailansicht) ----------

function carCardHtml(car, photo) {
  const rarity = rarityOf(car);
  const specs = car.specs ?? {};
  const sub = [car.generation, car.production_years, car.body_type, car.color].filter(Boolean).map(esc).join(" · ");
  const confClass = car.confidence >= 75 ? "good" : car.confidence >= 45 ? "ok" : "low";

  const stats = [
    [num(specs.power_hp), "PS"],
    [num(specs.top_speed_kmh), "km/h Spitze"],
    [specs.acceleration_0_100_s == null ? "–" : `${num(specs.acceleration_0_100_s, 1)} s`, "0–100 km/h"],
    [num(specs.torque_nm), "Nm"],
  ];

  const rows = [
    ["Motor", specs.engine],
    ["Antrieb", specs.drivetrain],
    ["Getriebe", specs.transmission],
    ["Kraftstoff", specs.fuel_type],
    ["Gewicht", specs.weight_kg == null ? "" : `${num(specs.weight_kg)} kg`],
    ["Neupreis", specs.price_new],
    ["Herkunft", car.origin_country ? `${flag(car.origin_country_code)} ${car.origin_country}` : ""],
  ].filter(([, v]) => v);

  return `
    <article class="car-card rarity-${rarityKey(car)}">
      <div class="car-photo">
        <img src="${esc(photo)}" alt="${esc(`${car.make} ${car.model}`)}">
        <span class="rarity-badge">${rarity.label}</span>
      </div>
      <div class="car-body">
        <div class="car-make">${flag(car.origin_country_code)} ${esc(brandName(car.make))}</div>
        <h2 class="car-title">${esc(carTitle(car))}</h2>
        ${sub ? `<div class="car-sub">${sub}</div>` : ""}

        <div class="confidence ${confClass}">
          <span>KI-Sicherheit</span>
          <div class="meter"><i style="width:${Number(car.confidence) || 0}%"></i></div>
          <b>${Number(car.confidence) || 0} %</b>
        </div>

        <div class="stat-grid">
          ${stats.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("")}
        </div>
        ${specs.specs_for ? `<p class="specs-for">Daten für: ${esc(specs.specs_for)}</p>` : ""}

        ${rows.length ? `<dl class="spec-list">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}

        ${car.description ? `<p class="description">${esc(car.description)}</p>` : ""}
        ${car.fun_fact ? `<div class="fun-fact"><span>💡</span><p>${esc(car.fun_fact)}</p></div>` : ""}

        ${car.identifying_features?.length ? `
          <div class="feature-block">
            <h4>Erkannt an</h4>
            <div class="chips">${car.identifying_features.map((f) => `<span class="chip">${esc(f)}</span>`).join("")}</div>
          </div>` : ""}
        ${car.alternatives?.length ? `<p class="alternatives">Könnte auch sein: ${car.alternatives.map(esc).join(", ")}</p>` : ""}
      </div>
    </article>`;
}

// ---------- Garage ----------

function renderGarage() {
  const query = $("#garage-search").value.trim().toLowerCase();
  const sort = $("#garage-sort").value;
  let list = state.spots;

  if (state.brandFilter) list = list.filter((s) => brandKey(s.car.make) === state.brandFilter);
  if (query) {
    list = list.filter((s) =>
      [brandName(s.car.make), s.car.model, s.car.trim, s.car.generation].join(" ").toLowerCase().includes(query),
    );
  }

  const sorters = {
    new: (a, b) => b.createdAt - a.createdAt,
    rarity: (a, b) => rarityOf(b.car).rank - rarityOf(a.car).rank || b.createdAt - a.createdAt,
    power: (a, b) => (b.car.specs?.power_hp ?? -1) - (a.car.specs?.power_hp ?? -1),
    speed: (a, b) => (b.car.specs?.top_speed_kmh ?? -1) - (a.car.specs?.top_speed_kmh ?? -1),
    brand: (a, b) => brandName(a.car.make).localeCompare(brandName(b.car.make), "de") || String(a.car.model).localeCompare(String(b.car.model), "de"),
  };
  list = [...list].sort(sorters[sort]);

  $("#garage-count").textContent = `${state.spots.length} ${state.spots.length === 1 ? "Auto" : "Autos"}`;

  const filterName = state.brandFilter && state.spots.find((s) => brandKey(s.car.make) === state.brandFilter);
  $("#brand-filter").innerHTML = filterName
    ? `<button class="filter-chip" data-action="clear-brand">Marke: ${esc(brandName(filterName.car.make))} <span aria-hidden="true">✕</span></button>`
    : "";

  const grid = $("#garage-grid");
  if (!state.spots.length) {
    grid.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🚘</div>
        <h3>Deine Garage ist noch leer</h3>
        <p>Scanne dein erstes Auto und starte deine Sammlung.</p>
        <button class="btn btn-primary" data-action="go-scan">Jetzt scannen</button>
      </div>`;
    return;
  }
  if (!list.length) {
    grid.innerHTML = `<div class="empty"><p>Keine Treffer.</p></div>`;
    return;
  }
  grid.innerHTML = list.map(spotCardHtml).join("");
}

function spotCardHtml(spot) {
  const car = spot.car;
  return `
    <button class="spot-card rarity-${rarityKey(car)}" data-spot="${esc(spot.id)}">
      <img src="${esc(spot.photo)}" alt="" loading="lazy">
      <span class="rarity-dot" title="${rarityOf(car).label}"></span>
      <span class="spot-info">
        <span class="spot-make">${esc(brandName(car.make))}</span>
        <strong>${esc(carTitle(car))}</strong>
        <span class="spot-date">${formatDate(spot.createdAt)}</span>
      </span>
    </button>`;
}

function openSpot(id) {
  const spot = state.spots.find((s) => s.id === id);
  if (!spot) return;
  $("#spot-dialog-body").innerHTML = `
    ${carCardHtml(spot.car, spot.photo)}
    <p class="spotted-at muted">Gespottet am ${formatDate(spot.createdAt)}</p>
    <button class="btn btn-danger" data-action="delete" data-id="${esc(spot.id)}">Aus Garage entfernen</button>`;
  $("#spot-dialog").showModal();
  $("#spot-dialog").scrollTop = 0;
}

// ---------- Marken & Statistik ----------

function renderBrands() {
  const stats = computeStats(state.spots);
  const lvl = levelFor(stats.points);

  const record = (label, spot, value) =>
    spot
      ? `<button class="record" data-spot="${esc(spot.id)}">
           <span class="muted">${label}</span>
           <strong>${esc(brandName(spot.car.make))} ${esc(carTitle(spot.car))}</strong>
           <span class="record-value">${value}</span>
         </button>`
      : "";

  const rarityBar = stats.total
    ? `<div class="rarity-bar">${RARITY_KEYS.filter((k) => stats.rarityCounts[k])
        .map((k) => `<i class="r-${k}" style="flex:${stats.rarityCounts[k]}"></i>`).join("")}</div>
       <div class="rarity-legend">${RARITY_KEYS.map((k) => `<span class="r-${k}"><i></i>${RARITY[k].label} <b>${stats.rarityCounts[k]}</b></span>`).join("")}</div>`
    : "";

  $("#stats-overview").innerHTML = `
    <div class="level-card">
      <div class="level-num"><small>Level</small>${lvl.level}</div>
      <div class="level-info">
        <strong>${lvl.title}</strong>
        <div class="meter"><i style="width:${Math.round(lvl.progress * 100)}%"></i></div>
        <span class="muted">${num(stats.points)} / ${num(lvl.next)} Punkte</span>
      </div>
    </div>
    <div class="tiles">
      <div class="tile"><b>${stats.total}</b><span>Autos</span></div>
      <div class="tile"><b>${stats.brands.length}</b><span>Marken</span></div>
      <div class="tile"><b>${stats.models}</b><span>Modelle</span></div>
      <div class="tile"><b>${stats.countries}</b><span>Länder</span></div>
    </div>
    ${rarityBar}
    ${stats.total ? `<div class="records">
      ${record("Schnellstes", stats.fastest, `${num(stats.fastest?.car.specs?.top_speed_kmh)} km/h`)}
      ${record("Stärkstes", stats.strongest, `${num(stats.strongest?.car.specs?.power_hp)} PS`)}
      ${record("Seltenstes", stats.rarest, stats.rarest ? rarityOf(stats.rarest.car).label : "")}
    </div>` : ""}`;

  $("#brand-count").textContent = stats.brands.length ? `${stats.brands.length} entdeckt` : "";
  const max = stats.brands[0]?.count ?? 1;
  $("#brand-list").innerHTML = stats.brands.length
    ? stats.brands.map((b, i) => {
        const { tier, next } = tierFor(b.count);
        const models = b.models.size;
        const hint = next ? `noch ${next.min - b.count} bis ${next.name}` : "Höchste Stufe!";
        return `
          <button class="brand-row" data-brand="${esc(b.key)}">
            <span class="brand-rank">${i + 1}</span>
            <span class="brand-badge" style="--c:${brandColor(b.name)}">${esc(initials(b.name))}</span>
            <span class="brand-main">
              <span class="brand-top">
                <strong>${flag(b.country)} ${esc(b.name)}</strong>
                ${tier ? `<span class="tier">${tier.icon} ${tier.name}</span>` : ""}
              </span>
              <span class="meter"><i style="width:${(b.count / max) * 100}%;background:${brandColor(b.name)}"></i></span>
              <span class="brand-meta">${models} ${models === 1 ? "Modell" : "Modelle"} · ${hint}</span>
            </span>
            <span class="brand-count">${b.count}</span>
          </button>`;
      }).join("")
    : `<div class="empty"><p>Noch keine Marken. Jede neue Marke bringt +${NEW_BRAND_BONUS} Bonuspunkte!</p></div>`;

  const unlocked = ACHIEVEMENTS.filter((a) => a.value(stats) >= a.goal).length;
  $("#achievement-count").textContent = `${unlocked} / ${ACHIEVEMENTS.length}`;
  $("#achievements").innerHTML = ACHIEVEMENTS.map((a) => {
    const value = Math.min(a.value(stats), a.goal);
    const done = value >= a.goal;
    return `
      <div class="achievement ${done ? "done" : ""}">
        <span class="a-icon">${a.icon}</span>
        <strong>${a.title}</strong>
        <span class="muted">${a.desc}</span>
        ${a.goal > 1 && !done ? `<span class="a-progress">${value} / ${a.goal}</span>` : ""}
      </div>`;
  }).join("");
}

// ---------- Startseite ----------

function renderScanStart() {
  const stats = computeStats(state.spots);
  const lvl = levelFor(stats.points);
  $("#mini-stats").innerHTML = stats.total
    ? `<span><b>${stats.total}</b> ${stats.total === 1 ? "Auto" : "Autos"}</span>
       <span><b>${stats.brands.length}</b> ${stats.brands.length === 1 ? "Marke" : "Marken"}</span>
       <span>Level <b>${lvl.level}</b></span>`
    : "";
  const recent = state.spots.slice(0, 8);
  $("#recent").innerHTML = recent.length
    ? `<h3>Zuletzt gespottet</h3>
       <div class="recent-row">${recent.map((s) => `
         <button class="recent-item" data-spot="${esc(s.id)}">
           <img src="${esc(s.photo)}" alt="" loading="lazy">
           <span>${esc(brandName(s.car.make))}</span>
         </button>`).join("")}</div>`
    : "";
}

function renderAll() {
  renderScanStart();
  renderGarage();
  renderBrands();
}

// ---------- Navigation ----------

function switchView(view) {
  state.view = view;
  for (const section of document.querySelectorAll(".view")) {
    section.classList.toggle("active", section.id === `view-${view}`);
  }
  for (const btn of document.querySelectorAll(".tabbar button")) {
    btn.classList.toggle("active", btn.dataset.view === view);
  }
  window.scrollTo({ top: 0 });
}

// ---------- Backup ----------

function exportBackup() {
  const data = { app: "car-spotter", version: 1, exportedAt: new Date().toISOString(), spots: state.spots };
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `car-spotter-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    const spots = (Array.isArray(data) ? data : data.spots ?? []).filter(
      (s) => s && typeof s.id === "string" && typeof s.createdAt === "number" &&
        typeof s.photo === "string" && s.photo.startsWith("data:image/") && s.car && typeof s.car.make === "string",
    );
    if (!spots.length) throw new Error();
    await putSpots(spots);
    state.spots = await getAllSpots();
    renderAll();
    toast(`${spots.length} Spots importiert.`);
    $("#menu-dialog").close();
  } catch {
    toast("Das ist keine gültige Backup-Datei.");
  }
}

// ---------- Server-Status ----------

async function checkServer() {
  const banner = $("#server-warning");
  try {
    const res = await fetch("api/status");
    const status = await res.json();
    $("#model-info").textContent = `KI-Modell: ${status.model}`;
    if (!status.ready) {
      banner.textContent = "Auf dem Server fehlt noch der ANTHROPIC_API_KEY – ohne ihn kann die KI keine Autos erkennen. Anleitung in der README.";
      banner.hidden = false;
    }
  } catch {
    banner.textContent = "Der Server ist nicht erreichbar. Starte die App mit „npm start“.";
    banner.hidden = false;
  }
}

// ---------- Events ----------

for (const id of ["#camera-input", "#gallery-input"]) {
  $(id).addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    handleFile(file);
  });
}

$("#import-input").addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (file) importBackup(file);
});

$("#garage-search").addEventListener("input", renderGarage);
$("#garage-sort").addEventListener("change", renderGarage);
$("#menu-btn").addEventListener("click", () => $("#menu-dialog").showModal());
$("#export-btn").addEventListener("click", () => {
  if (!state.spots.length) return toast("Noch keine Spots zum Sichern.");
  exportBackup();
});
$("#clear-btn").addEventListener("click", async () => {
  if (!state.spots.length) return toast("Es gibt nichts zu löschen.");
  if (!confirm(`Wirklich alle ${state.spots.length} Spots löschen? Das kann nicht rückgängig gemacht werden.`)) return;
  await clearSpots();
  state.spots = [];
  state.brandFilter = null;
  renderAll();
  $("#menu-dialog").close();
  toast("Alle Spots gelöscht.");
});

for (const dialog of document.querySelectorAll("dialog")) {
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog || e.target.closest("[data-close]")) dialog.close();
  });
}

document.addEventListener("click", async (e) => {
  const tab = e.target.closest(".tabbar button");
  if (tab) return switchView(tab.dataset.view);

  const spotBtn = e.target.closest("[data-spot]");
  if (spotBtn) return openSpot(spotBtn.dataset.spot);

  const brandBtn = e.target.closest("[data-brand]");
  if (brandBtn) {
    state.brandFilter = brandBtn.dataset.brand;
    $("#garage-search").value = "";
    renderGarage();
    return switchView("garage");
  }

  const action = e.target.closest("[data-action]")?.dataset.action;
  switch (action) {
    case "save":
      return savePending();
    case "discard":
    case "new-scan":
      state.pending = null;
      return showScanStep("start");
    case "retry":
      return identify();
    case "go-scan":
      return switchView("scan");
    case "clear-brand":
      state.brandFilter = null;
      return renderGarage();
    case "delete": {
      const id = e.target.closest("[data-id]").dataset.id;
      if (!confirm("Dieses Auto aus der Garage entfernen?")) return;
      await deleteSpot(id);
      state.spots = state.spots.filter((s) => s.id !== id);
      if (state.brandFilter && !state.spots.some((s) => brandKey(s.car.make) === state.brandFilter)) state.brandFilter = null;
      $("#spot-dialog").close();
      renderAll();
      return toast("Entfernt.");
    }
  }
});

// ---------- Start ----------

(async () => {
  try {
    state.spots = await getAllSpots();
  } catch {
    toast("Lokaler Speicher nicht verfügbar – Spots können nicht gespeichert werden.", 5000);
  }
  renderAll();
  checkServer();
})();
