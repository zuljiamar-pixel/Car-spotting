# 🚗 Car Spotter

Eine Car-Spotting-Website mit KI: Du machst ein Foto von einem Auto, die KI (Claude) erkennt **Marke, Modell und Generation** und zeigt dir die wichtigsten Daten an, zum Beispiel PS, Höchstgeschwindigkeit, 0–100 km/h, Motor, Neupreis und Herkunftsland. Jedes Auto kannst du in deiner **Garage** speichern. Unter **Marken** siehst du, wie viele Autos du von welcher Marke schon gespottet hast.

## Funktionen

- **Scannen**: Foto direkt mit der Handykamera aufnehmen oder aus der Galerie wählen
- **KI-Erkennung**: Marke, Modell, Generation, Variante, Bauzeitraum, Karosserie und Farbe, dazu eine Angabe, wie sicher sich die KI ist, und woran sie das Auto erkannt hat
- **Auto-Infos**: PS, Drehmoment, Spitze, 0–100, Gewicht, Antrieb, Getriebe, Kraftstoff, Neupreis, Herkunft, eine kurze Beschreibung und ein Fun Fact
- **Seltenheit**: Jedes Auto bekommt eine Stufe von *Häufig* bis *Legendär*
- **Garage**: alle gespotteten Autos mit Suche und Sortierung (neueste, seltenste, meiste PS, schnellste, Marke)
- **Marken-Statistik**: Rangliste deiner Marken mit Anzahl, Modellen und Stufen (🥉 3 · 🥈 5 · 🥇 10 · 💎 25 Autos)
- **Punkte, Level und Erfolge**: Seltene Autos, neue Marken und neue Modelle geben Punkte. Dazu gibt es 14 Erfolge (z. B. „300er-Club“ oder „Legende gesichtet“) und Rekorde wie schnellstes oder stärkstes Auto
- **Backup**: Export und Import deiner Sammlung als JSON-Datei

## Schnellstart

Du brauchst:

- [Node.js](https://nodejs.org) **Version 22 oder neuer**
- einen **Anthropic-API-Key**, den du unter <https://console.anthropic.com/settings/keys> erstellst

```bash
git clone https://github.com/zuljiamar-pixel/Car-spotting.git
cd Car-spotting
npm install

cp .env.example .env
# .env öffnen und deinen Key eintragen: ANTHROPIC_API_KEY=sk-ant-...

npm start
```

Danach öffnest du **http://localhost:3000** im Browser.

### Auf dem Handy testen

Wenn Handy und Computer im selben WLAN sind, öffnest du auf dem Handy `http://<IP-deines-Computers>:3000`, zum Beispiel `http://192.168.0.42:3000`. Der Button „Foto aufnehmen“ öffnet dann direkt die Kamera. Über „Zum Startbildschirm hinzufügen“ fühlt sich die Seite fast wie eine App an.

## Online stellen

### Mit einem Klick (Render, kostenlos)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/zuljiamar-pixel/Car-spotting)

1. Klick auf den Button und melde dich bei Render mit GitHub an.
2. Füg bei `ANTHROPIC_API_KEY` deinen API-Key ein.
3. Klick auf **Apply** oder **Deploy**. Nach ein paar Minuten bekommst du einen Link wie `https://car-spotter-xxxx.onrender.com`, den jeder öffnen kann.

Falls der Button nicht geht: Im Render-Dashboard **New + → Blueprint** wählen und dieses Repo auswählen. Die Einstellungen stehen in `render.yaml`.

### Manuell

Die App ist ein normaler Node.js-Server und läuft z. B. auf [Render](https://render.com), [Railway](https://railway.app) oder [Fly.io](https://fly.io):

| Einstellung | Wert |
| --- | --- |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Umgebungsvariablen | `ANTHROPIC_API_KEY=sk-ant-...` und `TRUST_PROXY=1` |

> ⚠️ Jeder Scan kostet ein paar Cent API-Guthaben. Damit niemand dein Guthaben leer scannt, ist pro IP-Adresse ein Limit eingebaut (Standard: 60 Scans pro Stunde, einstellbar über `RATE_LIMIT_PER_HOUR`). Setz dir außerdem in der Anthropic Console ein monatliches Ausgabenlimit.

## Einstellungen (`.env`)

| Variable | Standard | Bedeutung |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | – | **Pflicht.** Dein API-Key |
| `PORT` | `3000` | Port des Servers |
| `CLAUDE_MODEL` | `claude-opus-5-5` | KI-Modell für die Erkennung |
| `RATE_LIMIT_PER_HOUR` | `60` | Maximale Scans pro IP-Adresse und Stunde |
| `TRUST_PROXY` | – | Hinter einem Hosting-Proxy auf `1` setzen, damit das Limit die echte IP sieht |

## So funktioniert's

```
Handy/Browser                       Server (Node.js)                 Claude API
─────────────                       ────────────────                 ──────────
Foto aufnehmen
→ wird verkleinert (max. 1568 px)
→ POST /api/identify  ───────────►  prüft Bild + Rate-Limit
                                    schickt Foto + Anweisungen ───►  erkennt das Auto,
                                                                     antwortet als JSON
                                    ◄──────────────────────────────  (festes Schema)
◄──────────────────────────────────  gibt die Auto-Daten zurück
Ergebnis anzeigen
→ „In Garage speichern“
→ IndexedDB im Browser
```

- **Dein API-Key bleibt auf dem Server** und wird nie an den Browser geschickt.
- Die KI antwortet über *Structured Outputs* immer im selben JSON-Format (siehe `lib/identify.js`). Die App kann die Antwort deshalb zuverlässig darstellen.
- Lehnt das Modell eine Anfrage aus Sicherheitsgründen ab, versucht die API es automatisch mit einem Ersatzmodell (`fallbacks: "default"`).
- **Deine Spots werden nur in deinem Browser gespeichert** (IndexedDB) und nicht auf dem Server. Wenn du die Browserdaten löschst oder das Gerät wechselst, sind sie weg. Mach also ab und zu ein Backup über ☰ → „Backup herunterladen“.

### Punkte

| Seltenheit | Punkte |
| --- | --- |
| Häufig | 10 |
| Ungewöhnlich | 25 |
| Selten | 50 |
| Episch | 100 |
| Legendär | 250 |

Dazu kommen **+50** für eine neue Marke und **+20** für ein neues Modell. Für Level 2 brauchst du 100 Punkte, für Level 3 300, für Level 4 600, für Level 5 1.000 und so weiter.

## Projektstruktur

```
server.js            Express-Server: liefert die Website aus, /api/identify, /api/status
lib/identify.js      KI-Erkennung: Prompt, JSON-Schema, Fehlerbehandlung
public/index.html    Aufbau der Seite (Scannen, Garage, Marken)
public/app.js        Logik der App: Scannen, Speichern, Statistik, Erfolge
public/db.js         Lokaler Speicher (IndexedDB)
public/styles.css    Design
```

Für die Entwicklung startest du den Server mit `npm run dev`. Er startet dann bei jeder Änderung automatisch neu.
