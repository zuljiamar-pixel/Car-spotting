// Die KI läuft komplett im Browser (MobileCLIP S0 über transformers.js).
// Es werden keine Fotos an einen Server geschickt.
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
import { SCOOTERS } from "./scooters.js";

const MODEL = "Xenova/mobileclip_s0";
env.allowLocalModels = false;

const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
function softmax(xs) {
  const m = Math.max(...xs);
  const e = xs.map((x) => Math.exp(x - m));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / z);
}

let loading = null;

/** Lädt Modell + Daten (beim ersten Mal ca. 23 MB, danach aus dem Browser-Cache). */
export function loadAI(onProgress = () => {}) {
  loading ??= (async () => {
    const files = new Map();
    const progress_callback = (p) => {
      if (p.status === "progress" && p.total) {
        files.set(p.file, { loaded: p.loaded, total: p.total });
        let loaded = 0, total = 0;
        for (const f of files.values()) { loaded += f.loaded; total += f.total; }
        onProgress(loaded / total);
      }
    };
    const [processor, vision, data] = await Promise.all([
      AutoProcessor.from_pretrained(MODEL),
      loadVision(progress_callback),
      fetch("embeddings.json").then((r) => { if (!r.ok) throw new Error("embeddings"); return r.json(); }),
    ]);
    onProgress(1);
    return { processor, vision, data };
  })();
  loading.catch(() => { loading = null; });
  return loading;
}

async function loadVision(progress_callback) {
  try {
    return await CLIPVisionModelWithProjection.from_pretrained(MODEL, { dtype: "fp16", device: "wasm", progress_callback });
  } catch {
    // Ältere Geräte ohne fp16-Unterstützung: grössere fp32-Version.
    return await CLIPVisionModelWithProjection.from_pretrained(MODEL, { dtype: "fp32", device: "wasm", progress_callback });
  }
}

/**
 * Erkennt den E-Scooter auf einem Foto.
 * @returns {{isScooter: boolean, scooterProb: number, brands: {brand: string, prob: number, best: string}[]}}
 */
export async function classify(blob) {
  const { processor, vision, data } = await loadAI();
  const image = await RawImage.fromBlob(blob);
  const { image_embeds } = await vision(await processor(image));
  const v = image_embeds.normalize().tolist()[0];

  // 1) Ist es überhaupt ein E-Scooter?
  const gateLogits = [...data.gate.scooter, ...data.gate.other].map((t) => 100 * dot(v, t));
  const gp = softmax(gateLogits);
  const scooterProb = gp.slice(0, data.gate.scooter.length).reduce((a, b) => a + b, 0);

  // 2) Welche Marke? Text-Wissen der KI + Ähnlichkeit zu echten Beispielfotos.
  const brands = [...new Set(SCOOTERS.map((s) => s.brand))];
  const bestModel = {};
  const logits = brands.map((brand) => {
    let best = null, bestSim = -Infinity;
    for (const s of SCOOTERS) {
      if (s.brand !== brand) continue;
      const sim = dot(v, data.classes[s.id]);
      if (sim > bestSim) { bestSim = sim; best = s.id; }
    }
    bestModel[brand] = best;
    let logit = data.params.textScale * bestSim;
    const refs = data.refs[brand];
    if (refs) {
      // Mittelwert der K ähnlichsten Beispielfotos dieser Marke
      const aff = refs.map((r) => Math.exp(-data.params.beta * (1 - dot(v, r)))).sort((x, y) => y - x).slice(0, data.params.k);
      logit += data.params.alpha * (aff.reduce((x, y) => x + y, 0) / aff.length);
    }
    return logit;
  });
  const probs = softmax(logits);
  const ranked = brands
    .map((brand, i) => ({ brand, prob: probs[i], best: bestModel[brand] }))
    .sort((a, b) => b.prob - a.prob);

  return { isScooter: scooterProb >= data.params.gate, scooterProb, brands: ranked.slice(0, 3) };
}
