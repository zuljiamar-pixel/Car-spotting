import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { identifyCar, toIdentifyError, hasApiKey, MODEL } from "./lib/identify.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const RATE_LIMIT_PER_HOUR = Number(process.env.RATE_LIMIT_PER_HOUR) || 60;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // Limit der Claude-API pro Bild

const app = express();

// Hinter einem Hosting-Proxy (Render, Railway, ...) TRUST_PROXY=1 setzen,
// damit das Rate-Limit die echte IP der Nutzer sieht.
if (process.env.TRUST_PROXY) {
  const v = process.env.TRUST_PROXY;
  app.set("trust proxy", /^\d+$/.test(v) ? Number(v) : v);
}

app.use(express.json({ limit: "8mb" }));
app.use(express.static(path.join(here, "public")));

// Einfaches Rate-Limit pro IP, damit niemand dein API-Guthaben leer scannt.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= RATE_LIMIT_PER_HOUR) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of hits) {
    if (times.every((t) => now - t >= 60 * 60 * 1000)) hits.delete(ip);
  }
}, 10 * 60 * 1000).unref();

app.get("/api/status", (_req, res) => {
  res.json({ ready: hasApiKey(), model: MODEL });
});

app.post("/api/identify", async (req, res) => {
  if (!hasApiKey()) {
    return res.status(503).json({
      error: "Auf dem Server ist kein ANTHROPIC_API_KEY eingetragen. Siehe README.",
    });
  }

  const { image, mediaType } = req.body ?? {};
  if (typeof image !== "string" || !ALLOWED_TYPES.has(mediaType)) {
    return res.status(400).json({ error: "Kein gültiges Bild übermittelt." });
  }
  const data = image.replace(/^data:[^;]+;base64,/, "");
  if (!/^[A-Za-z0-9+/]+=*$/.test(data) || data.length * 0.75 > MAX_IMAGE_BYTES) {
    return res.status(400).json({ error: "Das Bild ist ungültig oder zu groß (max. 5 MB)." });
  }

  if (rateLimited(req.ip)) {
    return res.status(429).json({ error: "Zu viele Scans in kurzer Zeit. Bitte später noch einmal versuchen." });
  }

  try {
    const car = await identifyCar(data, mediaType);
    res.json({ car });
  } catch (err) {
    const e = toIdentifyError(err);
    if (e.status >= 500) console.error("[identify]", err);
    res.status(e.status).json({ error: e.message });
  }
});

// Zu große Uploads u.ä. als JSON-Fehler zurückgeben.
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = status === 413 ? "Das Bild ist zu groß." : "Ungültige Anfrage.";
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`🚗 Car Spotter läuft auf http://localhost:${PORT}`);
  if (!hasApiKey()) {
    console.warn("⚠️  ANTHROPIC_API_KEY fehlt – die Auto-Erkennung funktioniert erst, wenn du ihn in .env einträgst.");
  }
});
