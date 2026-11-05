// Auto-Erkennung mit Claude (Vision + Structured Outputs).
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

// Das Schema, in dem Claude antworten muss. Alle Felder sind Pflichtfelder;
// "unbekannt" wird bei Texten als leerer String und bei Zahlen als null
// ausgedrückt. (Die API erlaubt max. 16 Felder mit Union-Typen wie
// "number | null", deshalb sind nur die Zahlenwerte nullable.)
export const CarSchema = z.object({
  is_car: z
    .boolean()
    .describe("true, wenn auf dem Foto ein echtes Auto (PKW, SUV, Sportwagen, Pickup, Van) zu sehen ist."),
  not_car_reason: z
    .string()
    .describe("Nur wenn is_car=false: kurze Erklärung, was stattdessen zu sehen ist. Sonst leerer String."),
  make: z
    .string()
    .describe("Offizieller Markenname, z.B. 'Volkswagen' (nicht 'VW'), 'Mercedes-Benz', 'BMW', 'Porsche'."),
  model: z.string().describe("Modellname ohne Marke, z.B. 'Golf', '911', 'M3', 'Model 3'."),
  generation: z
    .string()
    .describe("Generation/Baureihe/interner Code, z.B. 'VIII (CD1)', '992', 'G80'. Leer, wenn unklar."),
  trim: z
    .string()
    .describe("Erkennbare Ausstattung/Variante, z.B. 'GTI Clubsport', 'Turbo S', 'Competition'. Leer, wenn nicht erkennbar."),
  production_years: z.string().describe("Bauzeitraum der Generation, z.B. '2019–heute' oder '1989–1994'."),
  body_type: z.string().describe("Karosserieform auf Deutsch, z.B. 'Coupé', 'Kombi', 'SUV', 'Limousine', 'Cabrio'."),
  color: z.string().describe("Farbe des Autos auf dem Foto, auf Deutsch."),
  confidence: z.number().describe("Wie sicher die Erkennung von Marke+Modell ist, 0 bis 100."),
  identifying_features: z
    .array(z.string())
    .describe("2–5 kurze Merkmale, an denen das Auto erkannt wurde (z.B. 'Doppelniere', 'Rundscheinwerfer')."),
  alternatives: z
    .array(z.string())
    .describe("0–3 andere Modelle, die es auch sein könnten (mit Marke). Leer, wenn eindeutig."),
  specs: z.object({
    specs_for: z
      .string()
      .describe("Für welche Motorisierung die Daten gelten, z.B. 'M3 Competition (510 PS)'."),
    engine: z.string().describe("Motor, z.B. '3,0-l-Reihensechszylinder Biturbo' oder 'Elektro, 2 Motoren'."),
    power_hp: z.number().nullable().describe("Leistung in PS."),
    torque_nm: z.number().nullable().describe("Drehmoment in Nm."),
    top_speed_kmh: z.number().nullable().describe("Höchstgeschwindigkeit in km/h."),
    acceleration_0_100_s: z.number().nullable().describe("Beschleunigung 0–100 km/h in Sekunden."),
    weight_kg: z.number().nullable().describe("Leergewicht in kg."),
    drivetrain: z.string().describe("Antrieb, z.B. 'Hinterradantrieb', 'Allrad', 'Frontantrieb'."),
    transmission: z.string().describe("Getriebe, z.B. '8-Gang-Automatik', '6-Gang-Schaltgetriebe'."),
    fuel_type: z.string().describe("Kraftstoff/Antriebsart, z.B. 'Benzin', 'Diesel', 'Elektro', 'Plug-in-Hybrid'."),
    price_new: z.string().describe("Ungefährer Neupreis in Euro, z.B. 'ab ca. 98.000 €'. Leer, wenn unbekannt."),
  }),
  origin_country: z.string().describe("Herkunftsland der Marke auf Deutsch, z.B. 'Deutschland', 'Italien', 'Japan'."),
  origin_country_code: z.string().describe("ISO-3166-1-Alpha-2-Code des Herkunftslandes, z.B. 'DE', 'IT', 'JP'."),
  rarity: z
    .enum(["common", "uncommon", "rare", "epic", "legendary"])
    .describe("Wie selten man dieses Auto in Mitteleuropa auf der Straße sieht."),
  description: z.string().describe("2–3 Sätze über das Auto auf Deutsch."),
  fun_fact: z.string().describe("Ein interessanter, kurzer Fakt über das Modell auf Deutsch."),
});

const SYSTEM_PROMPT = `Du bist ein erfahrener Auto-Experte und hilfst Car-Spottern dabei, Autos auf Fotos zu identifizieren.

Bestimme so genau wie möglich Marke, Modell, Generation und – falls an Details erkennbar (Embleme, Schürzen, Endrohre, Felgen, Bremssättel, Spoiler, Scheinwerfer) – die konkrete Variante.

Regeln:
- Sind mehrere Autos zu sehen, beschreibe das, das am größten bzw. am zentralsten im Bild ist.
- Ist kein Auto zu sehen (z.B. Motorrad, LKW, Gegenstand, Person), setze is_car=false, erkläre kurz in not_car_reason, was zu sehen ist, und fülle die übrigen Textfelder mit leeren Strings, Zahlen mit null, confidence mit 0 und rarity mit "common".
- Verwende offizielle Markennamen. Bei Sub-Marken wie Mercedes-AMG, BMW M, Audi Sport oder Volkswagen R gib die Hauptmarke an (Mercedes-Benz, BMW, Audi, Volkswagen). Eigenständige Marken wie Cupra, Polestar, DS oder Genesis bleiben eigenständig.
- Technische Daten gelten für die erkannte Variante. Ist sie nicht eindeutig, nimm die gängigste Motorisierung der Generation und schreibe in specs_for, wofür die Werte gelten. Nutze Herstellerangaben. Erfinde nichts: Was du nicht weißt, bleibt null bzw. leer.
- Sei bei confidence ehrlich. Wenn das Foto unscharf ist oder nur ein Ausschnitt zu sehen ist, darf der Wert niedrig sein; nenne dann Alternativen.
- rarity – wie oft sieht man das Auto in Deutschland, Österreich oder der Schweiz auf der Straße?
  common = Alltagsauto (z.B. VW Golf, Opel Corsa, Toyota Yaris, Tesla Model 3)
  uncommon = nicht alltäglich (z.B. Porsche 911, BMW M3, Ford Mustang, ältere Youngtimer)
  rare = selten (z.B. Ferrari Roma, Lamborghini Huracán, Audi R8, gepflegte Oldtimer)
  epic = sehr selten (z.B. Ferrari SF90, McLaren 765LT, Porsche 911 GT2 RS, limitierte Sondermodelle)
  legendary = extrem selten oder ikonisch (z.B. Bugatti Chiron, Pagani, Koenigsegg, Ferrari F40, Porsche 918)
- Schreibe alle Texte auf Deutsch.`;

let client = null;
function getClient() {
  client ??= new Anthropic();
  return client;
}

export function hasApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

// Fehler, die direkt an die App weitergegeben werden.
export class IdentifyError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

/**
 * Schickt ein Foto an Claude und gibt die erkannten Auto-Daten zurück.
 * @param {string} imageBase64 Base64-Daten ohne "data:"-Präfix
 * @param {"image/jpeg"|"image/png"|"image/webp"|"image/gif"} mediaType
 */
export async function identifyCar(imageBase64, mediaType) {
  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: {
      effort: "medium",
      format: betaZodOutputFormat(CarSchema),
    },
    // Falls das Modell eine Anfrage aus Sicherheitsgründen ablehnt, versucht
    // die API es automatisch mit dem empfohlenen Ersatzmodell.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: "Welches Auto ist auf diesem Foto?" },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new IdentifyError("Die KI konnte dieses Foto nicht analysieren. Versuch es mit einem anderen Bild.", 422);
  }
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new IdentifyError("Die KI-Antwort war unvollständig. Bitte noch einmal versuchen.", 502);
  }

  const car = response.parsed_output;
  car.confidence = Math.round(Math.max(0, Math.min(100, car.confidence)));
  for (const key of ["power_hp", "torque_nm", "top_speed_kmh", "weight_kg"]) {
    if (car.specs[key] != null) car.specs[key] = Math.round(car.specs[key]);
  }
  car.origin_country_code = /^[A-Za-z]{2}$/.test(car.origin_country_code) ? car.origin_country_code.toUpperCase() : "";
  return car;
}

/** Übersetzt SDK-Fehler in verständliche Meldungen für die App. */
export function toIdentifyError(err) {
  if (err instanceof IdentifyError) return err;
  if (err instanceof Anthropic.AuthenticationError) {
    return new IdentifyError("Der API-Key des Servers ist ungültig. Prüfe ANTHROPIC_API_KEY.", 500);
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new IdentifyError("Die KI ist gerade ausgelastet. Warte kurz und versuch es nochmal.", 429);
  }
  if (err instanceof Anthropic.BadRequestError) {
    return new IdentifyError("Das Bild konnte nicht verarbeitet werden. Versuch ein anderes Foto.", 400);
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new IdentifyError("Keine Verbindung zur KI. Bitte später erneut versuchen.", 502);
  }
  if (err instanceof Anthropic.APIError) {
    return new IdentifyError(`Fehler bei der KI (${err.status ?? "?"}). Bitte erneut versuchen.`, 502);
  }
  if (err instanceof Anthropic.AnthropicError) {
    // z.B. Antwort passte nicht zum Schema
    return new IdentifyError("Die KI-Antwort konnte nicht gelesen werden. Bitte noch einmal versuchen.", 502);
  }
  return new IdentifyError("Unerwarteter Serverfehler.", 500);
}
