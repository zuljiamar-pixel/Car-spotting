import { SCOOTERS } from "./scooters.js";

// ---------- Spielregeln ----------
const RARITY = {
  common: { label: "Häufig", points: 10, rank: 0 },
  uncommon: { label: "Ungewöhnlich", points: 25, rank: 1 },
  rare: { label: "Selten", points: 50, rank: 2 },
  epic: { label: "Episch", points: 100, rank: 3 },
};
const RARITY_KEYS = Object.keys(RARITY);
const NEW_BRAND_BONUS = 50;
const NEW_MODEL_BONUS = 20;
const SHARING_BRANDS = [...new Set(SCOOTERS.filter((s) => s.kind === "sharing").map((s) => s.brand))];
const BRANDS = [...new Set(SCOOTERS.map((s) => s.brand))];
const BY_ID = Object.fromEntries(SCOOTERS.map((s) => [s.id, s]));
const BRAND_TIERS = [
  { min: 3, name: "Bronze", icon: "🥉" },
  { min: 5, name: "Silber", icon: "🥈" },
  { min: 10, name: "Gold", icon: "🥇" },
  { min: 25, name: "Diamant", icon: "💎" },
];
const LEVEL_TITLES = ["Neuling", "Gelegenheits-Spotter", "Spotter", "Scooter-Fan", "Kenner", "Profi-Spotter", "Experte", "Meister-Spotter", "Legende"];
const ACHIEVEMENTS = [
  { icon: "🛴", title: "Erster Spot", desc: "Dein erster E-Scooter", goal: 1, value: (s) => s.total },
  { icon: "🔟", title: "Zehner-Pack", desc: "10 Scooter gespottet", goal: 10, value: (s) => s.total },
  { icon: "🏁", title: "Halbe Hundert", desc: "50 Scooter gespottet", goal: 50, value: (s) => s.total },
  { icon: "🏷️", title: "Markenkenner", desc: "5 verschiedene Marken", goal: 5, value: (s) => s.brands.length },
  { icon: "🌟", title: "Markensammler", desc: "10 verschiedene Marken", goal: 10, value: (s) => s.brands.length },
  { icon: "🔑", title: "Leih-Profi", desc: `Alle ${SHARING_BRANDS.length} Leih-Firmen gespottet`, goal: SHARING_BRANDS.length, value: (s) => s.sharingBrands },
  { icon: "📖", title: "Scooter-Dex", desc: "15 Modelle aus der Liste gespottet", goal: 15, value: (s) => s.dexSeen },
  { icon: "💠", title: "Seltener Fund", desc: "Ein seltener Scooter", goal: 1, value: (s) => s.atLeastRarity(2) },
  { icon: "🔮", title: "Episch!", desc: "Ein epischer Scooter", goal: 1, value: (s) => s.atLeastRarity(3) },
  { icon: "⚡", title: "Raser", desc: "Ein Scooter mit über 50 km/h", goal: 1, value: (s) => s.count((i) => i.speed >= 50) },
  { icon: "💪", title: "Kraftpaket", desc: "Ein Scooter mit über 2000 Watt", goal: 1, value: (s) => s.count((i) => i.motor >= 2000) },
  { icon: "🪶", title: "Leichtgewicht", desc: "Ein Scooter unter 13 kg", goal: 1, value: (s) => s.count((i) => i.weight != null && i.weight < 13) },
  { icon: "❤️", title: "Markentreue", desc: "10 Scooter einer Marke", goal: 10, value: (s) => s.brands[0]?.count ?? 0 },
];

// ---------- Hilfsfunktionen ----------
const $ = (sel) => document.querySelector(sel);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const num = (n, d = 0) => (n == null || !Number.isFinite(Number(n)) ? "–" : Number(n).toLocaleString("de-CH", { minimumFractionDigits: d, maximumFractionDigits: d }));
const formatDate = (ts) => new Date(ts).toLocaleDateString("de-CH", { day: "2-digit", month: "short", year: "numeric" });
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
const pct = (p) => Math.round(p * 100);

/** Infos zu einem Spot: aus der Datenbank oder selbst eingetragen. */
function infoOf(spot) {
  if (spot.scooterId && BY_ID[spot.scooterId]) return BY_ID[spot.scooterId];
  return {
    id: null, brand: String(spot.brand || "Unbekannt"), model: String(spot.model || "E-Scooter"), kind: "privat",
    years: "", speed: null, range: null, weight: null, motor: null, battery: null, wheel: null, price: "", rarity: "common", fact: "",
  };
}
const brandKey = (info) => info.brand.trim().toLowerCase();
const modelKey = (info) => info.id ?? `${brandKey(info)}|${info.model.trim().toLowerCase()}`;
const rarityKey = (info) => (Object.hasOwn(RARITY, info.rarity) ? info.rarity : "common");
const rarityOf = (info) => RARITY[rarityKey(info)];

function brandColor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${h % 360} 65% 52%)`;
}
function initials(name) {
  const parts = name.split(/[\s-]+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase();
}

let toastTimer;
function toast(message, ms = 2800) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), ms);
}

// ---------- Speicher (IndexedDB im Browser) ----------
const store = {
  dbp: null,
  memory: null, // Fallback, wenn der Browser nichts speichern darf
  open() {
    this.dbp ??= new Promise((resolve, reject) => {
      const req = indexedDB.open("escooter-spotter", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("spots", { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.dbp;
  },
  async tx(mode, fn) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const t = db.transaction("spots", mode);
      const r = fn(t.objectStore("spots"));
      t.oncomplete = () => resolve(r?.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  },
  async all() {
    try { return await this.tx("readonly", (s) => s.getAll()); }
    catch { this.memory = []; toast("Dieser Browser kann nichts speichern. Spots gehen beim Schliessen verloren.", 5000); return []; }
  },
  async put(spot) { if (this.memory) return; await this.tx("readwrite", (s) => s.put(spot)); },
  async remove(id) { if (this.memory) return; await this.tx("readwrite", (s) => s.delete(id)); },
  async clear() { if (this.memory) return; await this.tx("readwrite", (s) => s.clear()); },
};

const validSpot = (s) =>
  s && typeof s.id === "string" && s.id.length <= 100 && typeof s.createdAt === "number" &&
  typeof s.photo === "string" && s.photo.startsWith("data:image/") &&
  (typeof s.scooterId === "string" || typeof s.brand === "string");

// ---------- Zustand ----------
const state = { spots: [], pending: null, lastUpload: null, brandFilter: null };
let ai = null; // Modul ai.js, sobald geladen

// ---------- Statistik ----------
function pointsFor(info, seenBrands, seenModels) {
  const isNewBrand = !seenBrands.has(brandKey(info));
  const isNewModel = !seenModels.has(modelKey(info));
  return {
    points: rarityOf(info).points + (isNewBrand ? NEW_BRAND_BONUS : 0) + (isNewModel ? NEW_MODEL_BONUS : 0),
    isNewBrand, isNewModel,
  };
}
const seenSets = (spots) => ({
  brands: new Set(spots.map((s) => brandKey(infoOf(s)))),
  models: new Set(spots.map((s) => modelKey(infoOf(s)))),
});

function computeStats(spots) {
  const asc = [...spots].sort((a, b) => a.createdAt - b.createdAt);
  const seenBrands = new Set(), seenModels = new Set(), brands = new Map();
  const rarityCounts = Object.fromEntries(RARITY_KEYS.map((k) => [k, 0]));
  let points = 0;
  for (const spot of asc) {
    const info = infoOf(spot);
    points += pointsFor(info, seenBrands, seenModels).points;
    seenBrands.add(brandKey(info));
    seenModels.add(modelKey(info));
    rarityCounts[rarityKey(info)]++;
    const entry = brands.get(brandKey(info)) ?? { key: brandKey(info), name: info.brand, count: 0, models: new Set() };
    entry.count++;
    entry.models.add(modelKey(info));
    brands.set(entry.key, entry);
  }
  const infos = spots.map(infoOf);
  const maxBy = (fn) => spots.reduce((best, s) => (fn(infoOf(s)) != null && (!best || fn(infoOf(s)) > fn(infoOf(best))) ? s : best), null);
  return {
    total: spots.length, points, models: seenModels.size, rarityCounts,
    brands: [...brands.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "de")),
    sharingBrands: new Set(infos.filter((i) => i.kind === "sharing").map((i) => i.brand)).size,
    dexSeen: new Set(spots.map((s) => s.scooterId).filter((id) => BY_ID[id])).size,
    fastest: maxBy((i) => i.speed),
    strongest: maxBy((i) => i.motor),
    rarest: maxBy((i) => rarityOf(i).rank),
    count: (fn) => infos.filter(fn).length,
    atLeastRarity: (rank) => infos.filter((i) => rarityOf(i).rank >= rank).length,
  };
}
function levelFor(points) {
  let level = 1;
  while (points >= 50 * level * (level + 1)) level++;
  const floor = 50 * (level - 1) * level, next = 50 * level * (level + 1);
  return { level, title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)], progress: (points - floor) / (next - floor), next };
}
function tierFor(count) {
  let tier = null;
  for (const t of BRAND_TIERS) if (count >= t.min) tier = t;
  return { tier, next: BRAND_TIERS.find((t) => count < t.min) ?? null };
}
const unlocked = (stats) => ACHIEVEMENTS.filter((a) => a.value(stats) >= a.goal).map((a) => a.title);

// ---------- KI laden ----------
async function startAI() {
  const box = $("#ai-status");
  const text = $("#ai-status-text");
  try {
    ai = await import("./ai.js");
    await ai.loadAI((p) => {
      $("#ai-progress").style.width = `${pct(p)}%`;
      text.textContent = p < 1 ? `KI wird geladen … ${pct(p)} % (nur beim ersten Mal)` : "KI wird gestartet …";
    });
    box.classList.add("ready");
    box.innerHTML = `<span class="ai-dot"></span><span>KI bereit. Sie läuft direkt auf deinem Handy.</span>`;
  } catch {
    ai = null;
    box.classList.add("error");
    text.textContent = "Die KI konnte nicht geladen werden. Prüf deine Internetverbindung und lade die Seite neu. Du kannst Scooter trotzdem selbst auswählen.";
  }
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
function drawScaled(img, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c;
}
const toBlob = (canvas) => new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.9));

// ---------- Scannen ----------
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
    return toast("Dieses Bild kann der Browser nicht öffnen. Versuch ein JPG oder PNG.");
  }
  const blob = await toBlob(drawScaled(img, 768));
  const photo = drawScaled(img, 640).toDataURL("image/jpeg", 0.75);
  state.lastUpload = { blob, photo };
  await identify();
}

async function identify() {
  const { blob, photo } = state.lastUpload;
  $("#scan-preview").src = photo;
  showScanStep("progress");
  $("#scan-status-text").textContent = "KI schaut sich den Scooter an …";
  if (!ai) {
    state.pending = { photo, ai: null, brand: null, scooterId: null, manual: true };
    return renderResult();
  }
  try {
    const t0 = performance.now();
    const result = await ai.classify(blob);
    // kurze Mindestdauer, damit die Animation nicht nur aufblitzt
    await new Promise((r) => setTimeout(r, Math.max(0, 900 - (performance.now() - t0))));
    const top = result.brands[0];
    state.pending = { photo, ai: result, brand: top.brand, scooterId: top.best, manual: false };
  } catch {
    toast("Die KI hatte ein Problem. Wähl den Scooter selbst aus.", 4000);
    state.pending = { photo, ai: null, brand: null, scooterId: null, manual: true };
  }
  renderResult();
}

function renderResult() {
  const p = state.pending;
  const el = $("#scan-result");

  if (p.ai && !p.ai.isScooter && !p.forced) {
    el.innerHTML = `
      <div class="message-card">
        <img src="${esc(p.photo)}" alt="">
        <h2>Kein E-Scooter erkannt</h2>
        <p>Die KI sieht auf dem Foto eher etwas anderes. Versuch ein Foto, auf dem der ganze Scooter zu sehen ist.</p>
        <button class="btn btn-primary" data-action="new-scan">Neues Foto</button>
        <button class="btn btn-ghost" data-action="force">Ist doch ein Scooter</button>
      </div>`;
    return showScanStep("result");
  }

  const info = p.scooterId ? BY_ID[p.scooterId] : p.custom ? infoOf({ brand: p.custom.brand, model: p.custom.model }) : null;
  const parts = [];

  // 1) Foto + Infos zum ausgewählten Scooter
  if (info) {
    const seen = seenSets(state.spots);
    const { points, isNewBrand, isNewModel } = pointsFor(info, seen.brands, seen.models);
    const same = state.spots.filter((s) => modelKey(infoOf(s)) === modelKey(info)).length;
    parts.push(`
      <div class="result-pills">
        ${isNewBrand ? `<span class="pill pill-accent">Neue Marke!</span>` : isNewModel ? `<span class="pill pill-accent">Neues Modell!</span>` : `<span class="pill">Schon ${same}× gespottet</span>`}
        <span class="pill pill-points">+${points} Punkte</span>
      </div>
      ${cardHtml(info, p.photo)}`);
  } else {
    parts.push(`<div class="message-card"><img src="${esc(p.photo)}" alt=""></div>`);
  }

  // 2) KI-Vorschläge zum Korrigieren
  if (p.ai && !p.manual) {
    const [first, second] = p.ai.brands;
    const unsure = first.prob < 1.5 * (second?.prob ?? 0);
    const models = SCOOTERS.filter((s) => s.brand === p.brand);
    parts.push(`
      <div class="suggest">
        <h3>Stimmt die Marke?</h3>
        ${unsure ? `<p class="muted small">Die KI ist sich nicht ganz sicher. Tipp auf die richtige Marke.</p>` : ""}
        <div class="chips">${p.ai.brands.map((b, i) => `<button class="chip-btn ${b.brand === p.brand ? "active" : ""}" data-action="pick-brand" data-brand="${esc(b.brand)}">${esc(b.brand)}${i === 0 ? " · KI-Tipp" : ""}</button>`).join("")}</div>
        ${models.length > 1 ? `
          <div class="model-pick">
            <h4>Welches Modell?</h4>
            <div class="chips">${models.map((m) => `<button class="chip-btn ${m.id === p.scooterId ? "active" : ""}" data-action="pick-model" data-id="${m.id}">${esc(m.model)}</button>`).join("")}</div>
          </div>` : ""}
        <button class="link-btn" data-action="manual">Andere Marke? Selbst auswählen</button>
      </div>`);
  }
  if (p.manual) parts.push(manualFormHtml(p));

  // 3) Speichern
  parts.push(`
    <div class="action-bar">
      <button class="btn btn-ghost" data-action="discard">Verwerfen</button>
      <button class="btn btn-primary" data-action="save" ${info ? "" : "disabled"}>In Garage speichern</button>
    </div>`);

  el.innerHTML = parts.join("");
  showScanStep("result");
}

function manualFormHtml(p) {
  const brand = p.manualBrand ?? p.brand ?? "";
  const models = SCOOTERS.filter((s) => s.brand === brand);
  return `
    <div class="manual">
      <h3>Selbst auswählen</h3>
      ${!ai ? `<p class="muted small">Die KI ist gerade nicht verfügbar.</p>` : ""}
      <label>Marke
        <select id="manual-brand">
          <option value="">Bitte wählen …</option>
          ${BRANDS.map((b) => `<option ${b === brand ? "selected" : ""}>${esc(b)}</option>`).join("")}
          <option value="__other" ${brand === "__other" ? "selected" : ""}>Andere Marke …</option>
        </select>
      </label>
      ${brand === "__other" ? `
        <label>Marke<input id="custom-brand" maxlength="40" value="${esc(p.custom?.brand ?? "")}" placeholder="z. B. Ducati"></label>
        <label>Modell<input id="custom-model" maxlength="60" value="${esc(p.custom?.model ?? "")}" placeholder="z. B. Pro-II"></label>
        <button class="btn btn-ghost" data-action="custom-apply">Übernehmen</button>` : ""}
      ${models.length ? `<div class="chips">${models.map((m) => `<button class="chip-btn ${m.id === p.scooterId ? "active" : ""}" data-action="pick-model" data-id="${m.id}">${esc(m.model)}</button>`).join("")}</div>` : ""}
      ${p.ai ? `<button class="link-btn" data-action="back-to-ai">Zurück zum KI-Vorschlag</button>` : ""}
    </div>
`;
}

let saving = false;
async function savePending() {
  const p = state.pending;
  if (saving || !p || (!p.scooterId && !p.custom)) return;
  saving = true;
  const spot = {
    id: newId(), createdAt: Date.now(), photo: p.photo,
    scooterId: p.scooterId ?? null,
    brand: p.custom?.brand ?? null, model: p.custom?.model ?? null,
    aiTop: p.ai?.brands?.[0] ? { brand: p.ai.brands[0].brand, prob: Math.round(p.ai.brands[0].prob * 100) / 100 } : null,
  };
  const before = unlocked(computeStats(state.spots));
  const seen = seenSets(state.spots);
  const { points } = pointsFor(infoOf(spot), seen.brands, seen.models);
  try {
    await store.put(spot);
  } catch {
    saving = false;
    return toast("Speichern fehlgeschlagen. Ist der Speicher voll?", 4000);
  }
  state.spots = [spot, ...state.spots];
  state.pending = null;
  saving = false;
  const fresh = unlocked(computeStats(state.spots)).filter((t) => !before.includes(t));
  const msg = `Gespeichert! +${points} Punkte`;
  toast(fresh.length ? `${msg} · 🏆 ${fresh.join(", ")}` : msg, fresh.length ? 4500 : 2800);
  renderAll();
  showScanStep("start");
}

// ---------- Scooter-Karte ----------
function cardHtml(info, photo) {
  const r = rarityOf(info);
  const stats = [
    [info.speed, num(info.speed), "km/h Spitze"],
    [info.range, num(info.range), "km Reichweite"],
    [info.weight, info.weight == null ? "" : num(info.weight, info.weight % 1 ? 1 : 0), "kg Gewicht"],
    [info.motor, num(info.motor), "Watt Motor"],
  ].filter(([raw]) => raw != null);
  const sharing = info.kind === "sharing";
  const rows = [
    ["Akku", info.battery == null ? "" : `${num(info.battery)} Wh`],
    ["Reifen", info.wheel], ["Preis", info.price], ["Gebaut", info.years],
  ].filter(([, v]) => v);
  return `
    <article class="car-card rarity-${rarityKey(info)}">
      ${photo ? `<div class="car-photo"><img src="${esc(photo)}" alt="${esc(`${info.brand} ${info.model}`)}"><span class="rarity-badge">${r.label}</span></div>` : ""}
      <div class="car-body">
        <div class="spot-make">${sharing ? "Leih-Scooter" : esc(info.brand)}</div>
        <h2 class="car-title">${esc(sharing ? info.brand : info.model)}</h2>
        ${photo ? "" : `<span class="kind-tag">${r.label}</span>`}
        ${stats.length ? `<div class="stat-grid">${stats.map(([, v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("")}</div>` : ""}
        ${info.id ? "" : `<p class="muted">Für selbst eingetragene Scooter gibt es keine Daten.</p>`}
        ${rows.length ? `<dl class="spec-list">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
        ${info.speed > 20 ? `<p class="law-note">In der Schweiz sind mit E-Trottinetten auf der Strasse höchstens 20 km/h erlaubt.</p>` : ""}
        ${info.fact ? `<div class="fun-fact"><strong>Fun Fact</strong><p>${esc(info.fact)}</p></div>` : ""}
      </div>
    </article>`;
}

// ---------- Garage ----------
function renderGarage() {
  const q = $("#garage-search").value.trim().toLowerCase();
  const sort = $("#garage-sort").value;
  let list = state.spots;
  if (state.brandFilter) list = list.filter((s) => brandKey(infoOf(s)) === state.brandFilter);
  if (q) list = list.filter((s) => `${infoOf(s).brand} ${infoOf(s).model}`.toLowerCase().includes(q));
  const sorters = {
    new: (a, b) => b.createdAt - a.createdAt,
    rarity: (a, b) => rarityOf(infoOf(b)).rank - rarityOf(infoOf(a)).rank || b.createdAt - a.createdAt,
    speed: (a, b) => (infoOf(b).speed ?? -1) - (infoOf(a).speed ?? -1),
    brand: (a, b) => infoOf(a).brand.localeCompare(infoOf(b).brand, "de") || infoOf(a).model.localeCompare(infoOf(b).model, "de"),
  };
  list = [...list].sort(sorters[sort]);
  $("#garage-count").textContent = `${state.spots.length} ${state.spots.length === 1 ? "Scooter" : "Scooter"}`;
  const f = state.brandFilter && state.spots.find((s) => brandKey(infoOf(s)) === state.brandFilter);
  $("#brand-filter").innerHTML = f ? `<button class="filter-chip" data-action="clear-brand">Marke: ${esc(infoOf(f).brand)} <span aria-hidden="true">✕</span></button>` : "";

  const grid = $("#garage-grid");
  if (!state.spots.length) {
    grid.innerHTML = `
      <div class="empty">
        <h3>Deine Garage ist leer</h3>
        <p>Scanne deinen ersten E-Scooter. Jede neue Marke bringt ${NEW_BRAND_BONUS} Bonuspunkte.</p>
        <button class="btn btn-primary" data-action="go-scan">Jetzt scannen</button>
      </div>`;
    return;
  }
  if (!list.length) { grid.innerHTML = `<div class="empty"><p>Keine Treffer.</p></div>`; return; }
  grid.innerHTML = list.map((s) => {
    const i = infoOf(s);
    return `
      <button class="spot-card rarity-${rarityKey(i)}" data-spot="${esc(s.id)}">
        <img src="${esc(s.photo)}" alt="" loading="lazy">
        <span class="rarity-tag">${rarityOf(i).label}</span>
        <span class="spot-info">
          <span class="spot-make">${esc(i.brand)}</span>
          <strong>${esc(i.model)}</strong>
          <span class="spot-date">${formatDate(s.createdAt)}</span>
        </span>
      </button>`;
  }).join("");
}

function openSpot(id) {
  const spot = state.spots.find((s) => s.id === id);
  if (!spot) return;
  $("#spot-dialog-body").innerHTML = `
    ${cardHtml(infoOf(spot), spot.photo)}
    <p class="spotted-at muted">Gespottet am ${formatDate(spot.createdAt)}</p>
    <button class="btn btn-danger" data-action="delete" data-id="${esc(spot.id)}">Aus Garage entfernen</button>`;
  $("#spot-dialog").showModal();
  $("#spot-dialog").scrollTop = 0;
}

function openDex(id) {
  const info = BY_ID[id];
  if (!info) return;
  const mine = state.spots.filter((s) => s.scooterId === id);
  $("#spot-dialog-body").innerHTML = `
    ${cardHtml(info, mine[0]?.photo ?? null)}
    <p class="spotted-at muted">${mine.length ? `Du hast diesen Scooter ${mine.length}× gespottet.` : "Noch nicht gespottet."}</p>`;
  $("#spot-dialog").showModal();
  $("#spot-dialog").scrollTop = 0;
}

// ---------- Marken & Statistik ----------
function renderBrands() {
  const st = computeStats(state.spots);
  const lvl = levelFor(st.points);
  const record = (label, spot, value) => spot ? `
    <button class="record" data-spot="${esc(spot.id)}">
      <span class="muted">${label}</span>
      <strong>${esc(infoOf(spot).brand)} ${esc(infoOf(spot).model)}</strong>
      <span class="record-value">${value}</span>
    </button>` : "";
  const rarityBar = st.total ? `
    <div class="rarity-bar">${RARITY_KEYS.filter((k) => st.rarityCounts[k]).map((k) => `<i class="rarity-${k}" style="flex:${st.rarityCounts[k]}"></i>`).join("")}</div>
    <div class="rarity-legend">${RARITY_KEYS.map((k) => `<span class="rarity-${k}"><i></i>${RARITY[k].label} <b>${st.rarityCounts[k]}</b></span>`).join("")}</div>` : "";

  $("#stats-overview").innerHTML = `
    <div class="level-card">
      <div class="level-num"><small>Level</small>${lvl.level}</div>
      <div class="level-info">
        <strong>${lvl.title}</strong>
        <span class="meter"><i style="width:${Math.round(lvl.progress * 100)}%"></i></span>
        <span class="muted">${num(st.points)} / ${num(lvl.next)} Punkte</span>
      </div>
    </div>
    <div class="tiles">
      <div class="tile"><b>${st.total}</b><span>Scooter</span></div>
      <div class="tile"><b>${st.brands.length}</b><span>Marken</span></div>
      <div class="tile"><b>${st.models}</b><span>Modelle</span></div>
      <div class="tile"><b>${st.sharingBrands}/${SHARING_BRANDS.length}</b><span>Leih-Firmen</span></div>
    </div>
    ${rarityBar}
    ${st.total ? `<div class="records">
      ${record("Schnellster", st.fastest, `${num(infoOf(st.fastest ?? {}).speed)} km/h`)}
      ${record("Stärkster", st.strongest, `${num(infoOf(st.strongest ?? {}).motor)} W`)}
      ${record("Seltenster", st.rarest, st.rarest ? rarityOf(infoOf(st.rarest)).label : "")}
    </div>` : ""}`;

  $("#brand-count").textContent = st.brands.length ? `${st.brands.length} entdeckt` : "";
  const max = st.brands[0]?.count ?? 1;
  $("#brand-list").innerHTML = st.brands.length
    ? st.brands.map((b, i) => {
        const { tier, next } = tierFor(b.count);
        const m = b.models.size;
        return `
          <button class="brand-row" data-brand="${esc(b.key)}" style="--c:${brandColor(b.name)}">
            <span class="brand-rank">${i + 1}</span>
            <span class="brand-badge">${esc(initials(b.name))}</span>
            <span class="brand-main">
              <span class="brand-top"><strong>${esc(b.name)}</strong>${tier ? `<span class="tier">${tier.icon} ${tier.name}</span>` : ""}</span>
              <span class="meter"><i style="width:${(b.count / max) * 100}%"></i></span>
              <span class="brand-meta">${m} ${m === 1 ? "Modell" : "Modelle"} · ${next ? `noch ${next.min - b.count} bis ${next.name}` : "Höchste Stufe!"}</span>
            </span>
            <span class="brand-count">${b.count}</span>
          </button>`;
      }).join("")
    : `<div class="empty"><p>Noch keine Marken. Jede neue Marke bringt ${NEW_BRAND_BONUS} Bonuspunkte.</p></div>`;

  const done = ACHIEVEMENTS.filter((a) => a.value(st) >= a.goal).length;
  $("#achievement-count").textContent = `${done} / ${ACHIEVEMENTS.length}`;
  $("#achievements").innerHTML = ACHIEVEMENTS.map((a) => {
    const v = Math.min(a.value(st), a.goal);
    const ok = v >= a.goal;
    return `
      <div class="achievement ${ok ? "done" : ""}">
        <span class="a-icon" aria-hidden="true">${a.icon}</span>
        <strong>${a.title}</strong>
        <span class="muted">${a.desc}</span>
        ${a.goal > 1 && !ok ? `<span class="a-progress">${v} / ${a.goal}</span>` : ""}
      </div>`;
  }).join("");

  const counts = {};
  for (const s of state.spots) if (s.scooterId) counts[s.scooterId] = (counts[s.scooterId] ?? 0) + 1;
  $("#dex-count").textContent = `${Object.keys(counts).filter((id) => BY_ID[id]).length} / ${SCOOTERS.length}`;
  $("#dex").innerHTML = SCOOTERS.map((s) => `
    <button class="dex-row rarity-${rarityKey(s)} ${counts[s.id] ? "seen" : ""}" data-dex="${s.id}">
      <span class="dex-check">${counts[s.id] ? "✓" : ""}</span>
      <span><strong>${esc(s.brand)} ${esc(s.model)}</strong><br><span class="muted">${s.kind === "sharing" ? "Leih-Scooter" : `${num(s.speed)} km/h · ${num(s.range)} km`}</span></span>
      <span class="muted">${counts[s.id] ? `${counts[s.id]}×` : RARITY[s.rarity].label}</span>
    </button>`).join("");
}

function renderScanStart() {
  const st = computeStats(state.spots);
  $("#mini-stats").innerHTML = st.total
    ? `<span><b>${st.total}</b> Scooter</span><span><b>${st.brands.length}</b> ${st.brands.length === 1 ? "Marke" : "Marken"}</span><span>Level <b>${levelFor(st.points).level}</b></span>`
    : "";
  const recent = state.spots.slice(0, 8);
  $("#recent").innerHTML = recent.length ? `
    <h3>Zuletzt gespottet</h3>
    <div class="recent-row">${recent.map((s) => `
      <button class="recent-item rarity-${rarityKey(infoOf(s))}" data-spot="${esc(s.id)}">
        <img src="${esc(s.photo)}" alt="" loading="lazy">
        <span>${esc(infoOf(s).brand)} ${esc(infoOf(s).model)}</span>
      </button>`).join("")}</div>` : "";
}

function renderAll() {
  renderScanStart();
  renderGarage();
  renderBrands();
}

function switchView(view) {
  for (const s of document.querySelectorAll(".view")) s.classList.toggle("active", s.id === `view-${view}`);
  for (const b of document.querySelectorAll(".tabbar button")) b.classList.toggle("active", b.dataset.view === view);
  window.scrollTo({ top: 0 });
}

function armed(btn, label) {
  if (btn.classList.contains("armed")) return true;
  btn.dataset.label = btn.textContent;
  btn.classList.add("armed");
  btn.textContent = label;
  setTimeout(() => {
    btn.classList.remove("armed");
    if (btn.dataset.label) btn.textContent = btn.dataset.label;
  }, 4000);
  return false;
}

// ---------- Backup ----------
function exportBackup() {
  if (!state.spots.length) return toast("Noch keine Spots zum Sichern.");
  const data = JSON.stringify({ app: "escooter-spotter", version: 1, exportedAt: new Date().toISOString(), spots: state.spots });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  a.download = `escooter-spotter-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importBackup(file) {
  let spots;
  try {
    const data = JSON.parse(await file.text());
    spots = (Array.isArray(data) ? data : data.spots ?? []).filter(validSpot).map((s) => ({
      id: s.id, createdAt: s.createdAt, photo: s.photo,
      scooterId: typeof s.scooterId === "string" ? s.scooterId : null,
      brand: typeof s.brand === "string" ? s.brand.slice(0, 40) : null,
      model: typeof s.model === "string" ? s.model.slice(0, 60) : null,
      aiTop: null,
    }));
    if (!spots.length) throw new Error();
  } catch {
    return toast("Das ist keine gültige Backup-Datei.");
  }
  try {
    for (const s of spots) await store.put(s);
  } catch {
    return toast("Import fehlgeschlagen.");
  }
  const ids = new Set(spots.map((s) => s.id));
  state.spots = [...spots, ...state.spots.filter((s) => !ids.has(s.id))].sort((a, b) => b.createdAt - a.createdAt);
  renderAll();
  $("#menu-dialog").close();
  toast(`${spots.length} Spots importiert.`);
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
$("#export-btn").addEventListener("click", exportBackup);
$("#clear-btn").addEventListener("click", async (e) => {
  if (!state.spots.length) return toast("Es gibt nichts zu löschen.");
  if (!armed(e.currentTarget, `Wirklich alle ${state.spots.length} löschen? Nochmal tippen`)) return;
  try { await store.clear(); } catch { return toast("Löschen fehlgeschlagen."); }
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
document.addEventListener("change", (e) => {
  if (e.target.id === "manual-brand" && state.pending) {
    state.pending.manualBrand = e.target.value;
    state.pending.scooterId = null;
    state.pending.custom = null;
    const models = SCOOTERS.filter((s) => s.brand === e.target.value);
    if (models.length === 1) state.pending.scooterId = models[0].id;
    renderResult();
  }
});

document.addEventListener("click", async (e) => {
  const tab = e.target.closest(".tabbar button");
  if (tab) return switchView(tab.dataset.view);
  const spotBtn = e.target.closest("[data-spot]");
  if (spotBtn) return openSpot(spotBtn.dataset.spot);
  const dexBtn = e.target.closest("[data-dex]");
  if (dexBtn) return openDex(dexBtn.dataset.dex);
  const brandRow = e.target.closest(".brand-row");
  if (brandRow) {
    state.brandFilter = brandRow.dataset.brand;
    $("#garage-search").value = "";
    renderGarage();
    return switchView("garage");
  }
  const el = e.target.closest("[data-action]");
  const p = state.pending;
  switch (el?.dataset.action) {
    case "save": return savePending();
    case "discard":
    case "new-scan":
      state.pending = null;
      return showScanStep("start");
    case "force":
      p.forced = true;
      return renderResult();
    case "pick-brand": {
      const b = p.ai.brands.find((x) => x.brand === el.dataset.brand);
      p.brand = b.brand;
      p.scooterId = b.best;
      return renderResult();
    }
    case "pick-model":
      p.scooterId = el.dataset.id;
      p.custom = null;
      if (!p.manual) p.brand = BY_ID[p.scooterId].brand;
      return renderResult();
    case "manual":
      p.manual = true;
      p.manualBrand = p.brand ?? "";
      return renderResult();
    case "back-to-ai": {
      const top = p.ai.brands[0];
      Object.assign(p, { manual: false, brand: top.brand, scooterId: top.best, custom: null });
      return renderResult();
    }
    case "custom-apply": {
      const brand = $("#custom-brand").value.trim();
      const model = $("#custom-model").value.trim();
      if (!brand || !model) return toast("Bitte Marke und Modell eintragen.");
      p.custom = { brand: brand.slice(0, 40), model: model.slice(0, 60) };
      p.scooterId = null;
      return renderResult();
    }
    case "go-scan": return switchView("scan");
    case "clear-brand":
      state.brandFilter = null;
      return renderGarage();
    case "delete": {
      if (!armed(el, "Wirklich entfernen? Nochmal tippen")) return;
      const id = el.dataset.id;
      try { await store.remove(id); } catch { return toast("Entfernen fehlgeschlagen."); }
      state.spots = state.spots.filter((s) => s.id !== id);
      if (state.brandFilter && !state.spots.some((s) => brandKey(infoOf(s)) === state.brandFilter)) state.brandFilter = null;
      $("#spot-dialog").close();
      renderAll();
      return toast("Entfernt.");
    }
  }
});

// ---------- Start ----------
state.spots = (await store.all()).filter(validSpot).sort((a, b) => b.createdAt - a.createdAt);
renderAll();
startAI();
