// Baut docs/embeddings.json:
//  - Text-Embeddings pro Scooter-Modell (MobileCLIP S0, Prompt-Ensemble)
//  - Gate-Embeddings (E-Scooter ja/nein)
//  - Bild-Embeddings echter Beispielfotos pro Marke (Few-Shot-Cache, Tip-Adapter-Stil)
// und misst die Genauigkeit per Leave-one-out.
// Aufruf: node build-embeddings.mjs <docsDir> <imgDir>...
import fs from "node:fs";
import path from "node:path";
import {
  AutoTokenizer, CLIPTextModelWithProjection, AutoProcessor, CLIPVisionModelWithProjection, RawImage,
} from "@huggingface/transformers";

const [, , docsDir, ...imgDirs] = process.argv;
const { SCOOTERS, GATE } = await import(path.resolve(docsDir, "scooters.js"));
const MODEL = "Xenova/mobileclip_s0";
const TEMPLATES = ["a photo of {}.", "a close-up photo of {}.", "a street photo of {}."];
const LABEL_BRAND = {
  lime: "Lime", voi: "Voi", tier: "Tier", dott: "Dott", bird: "Bird", bolt: "Bolt",
  xiaomi: "Xiaomi", "xiaomi-m365": "Xiaomi", "xiaomi-pro2": "Xiaomi",
  ninebot: "Segway-Ninebot", "ninebot-es": "Segway-Ninebot", "ninebot-f": "Segway-Ninebot", "ninebot-max": "Segway-Ninebot",
  dualtron: "Dualtron", kaabo: "Kaabo", niu: "NIU",
};

const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const norm = (v) => { const n = Math.hypot(...v); return v.map((x) => x / n); };
const mean = (vs) => norm(vs[0].map((_, i) => vs.reduce((a, v) => a + v[i], 0) / vs.length));
const round = (v, d = 4) => v.map((x) => Math.round(x * 10 ** d) / 10 ** d);
const softmax = (xs) => { const m = Math.max(...xs); const e = xs.map((x) => Math.exp(x - m)); const z = e.reduce((a, b) => a + b); return e.map((x) => x / z); };

// ---------- Text ----------
const tok = await AutoTokenizer.from_pretrained(MODEL);
const textModel = await CLIPTextModelWithProjection.from_pretrained(MODEL, { dtype: "fp32" });
async function embedTexts(texts) {
  const { text_embeds } = await textModel(tok(texts, { padding: "max_length", max_length: 77, truncation: true }));
  return text_embeds.normalize().tolist();
}
const classes = {};
for (const s of SCOOTERS) classes[s.id] = mean(await embedTexts(s.looks.flatMap((l) => TEMPLATES.map((t) => t.replace("{}", l)))));
const gate = { scooter: await embedTexts(GATE.scooter), other: await embedTexts(GATE.other) };

// ---------- Bilder ----------
const proc = await AutoProcessor.from_pretrained(MODEL);
const vis = await CLIPVisionModelWithProjection.from_pretrained(MODEL, { dtype: "fp16" });
const samples = []; // {file, label, brand|null, v}
for (const dir of imgDirs) {
  for (const f of fs.readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f)).sort()) {
    const label = f.split("__")[0];
    try {
      const { image_embeds } = await vis(await proc(await RawImage.read(path.join(dir, f))));
      samples.push({ file: f, label, brand: LABEL_BRAND[label] ?? null, v: image_embeds.normalize().tolist()[0] });
    } catch (e) { console.log("skip", f, e.message); }
  }
}
console.log("images:", samples.length, "positives:", samples.filter((s) => s.brand).length);

// ---------- Bewertung ----------
const BRANDS = [...new Set(SCOOTERS.map((s) => s.brand))];
const K = 3;
function score(v, refs, p) {
  const logits = BRANDS.map((brand) => {
    let best = -Infinity;
    for (const s of SCOOTERS) if (s.brand === brand) best = Math.max(best, dot(v, classes[s.id]));
    let logit = p.textScale * best;
    if (refs[brand]) {
      // Mittelwert der K ähnlichsten Beispielfotos: unabhängig davon, wie viele Fotos eine Marke hat
      const aff = refs[brand].map((r) => Math.exp(-p.beta * (1 - dot(v, r)))).sort((x, y) => y - x).slice(0, K);
      logit += p.alpha * (aff.reduce((x, y) => x + y, 0) / aff.length);
    }
    return logit;
  });
  const probs = softmax(logits);
  return BRANDS.map((b, i) => [b, probs[i]]).sort((a, b) => b[1] - a[1]);
}
function gateProb(v) {
  const g = softmax([...gate.scooter, ...gate.other].map((t) => 100 * dot(v, t)));
  return g.slice(0, gate.scooter.length).reduce((a, b) => a + b, 0);
}
function evaluate(p, useRefs) {
  let top1 = 0, top3 = 0, n = 0;
  const pos = samples.filter((s) => s.brand);
  for (const s of pos) {
    const refs = {};
    if (useRefs) for (const o of pos) if (o !== s) (refs[o.brand] ??= []).push(o.v); // leave-one-out
    const ranked = score(s.v, refs, p);
    n++;
    if (ranked[0][0] === s.brand) top1++;
    if (ranked.slice(0, 3).some(([b]) => b === s.brand)) top3++;
  }
  return { top1, top3, n };
}

const base = { textScale: 100, alpha: 0, beta: 1 };
const textOnly = evaluate(base, false);
console.log(`text only: top1 ${textOnly.top1}/${textOnly.n}, top3 ${textOnly.top3}/${textOnly.n}`);
let best = null;
for (const textScale of [50, 100]) for (const alpha of [1, 2, 4, 8, 16, 32]) for (const beta of [3, 5.5, 8, 12]) {
  const r = evaluate({ textScale, alpha, beta }, true);
  console.log(`  grid ts=${textScale} a=${alpha} b=${beta}: top1 ${r.top1} top3 ${r.top3}`);
  if (!best || r.top1 > best.r.top1 || (r.top1 === best.r.top1 && r.top3 > best.r.top3)) best = { p: { textScale, alpha, beta }, r };
}
if (process.env.PARAMS) { const p = JSON.parse(process.env.PARAMS); best = { p, r: evaluate(p, true) }; }
console.log(`with photos (LOO): top1 ${best.r.top1}/${best.r.n}, top3 ${best.r.top3}/${best.r.n}`, best.p);

// Gate: E-Scooter ja/nein
const gateRes = samples.map((s) => ({ s, g: gateProb(s.v) }));
const gateThreshold = 0.35;
const gateOk = gateRes.filter(({ s, g }) => (s.brand ? g >= gateThreshold : g < gateThreshold)).length;
console.log(`gate: ${gateOk}/${samples.length} correct`);
for (const { s, g } of gateRes) if (s.brand ? g < gateThreshold : g >= gateThreshold) console.log("  gate miss:", s.file, g.toFixed(2));

// Fehler zeigen
const pos = samples.filter((s) => s.brand);
for (const s of pos) {
  const refs = {};
  for (const o of pos) if (o !== s) (refs[o.brand] ??= []).push(o.v);
  const r = score(s.v, refs, best.p);
  if (r[0][0] !== s.brand) console.log("  miss:", s.file.padEnd(24), "->", r.slice(0, 3).map(([b, q]) => `${b} ${(q * 100).toFixed(0)}%`).join(", "));
}

// ---------- Schreiben ----------
const refs = {};
for (const s of pos) (refs[s.brand] ??= []).push(round(s.v, 3));
const out = {
  model: MODEL,
  params: { ...best.p, k: K, gate: gateThreshold },
  classes: Object.fromEntries(Object.entries(classes).map(([k, v]) => [k, round(v)])),
  gate: { scooter: gate.scooter.map((v) => round(v)), other: gate.other.map((v) => round(v)) },
  refs,
};
fs.writeFileSync(path.join(docsDir, "embeddings.json"), JSON.stringify(out));
console.log("wrote embeddings.json", (fs.statSync(path.join(docsDir, "embeddings.json")).size / 1024).toFixed(0), "KB;",
  Object.entries(refs).map(([b, r]) => `${b}:${r.length}`).join(" "));
