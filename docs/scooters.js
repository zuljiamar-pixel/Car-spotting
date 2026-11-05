// E-Scooter-Datenbank. Alle Zahlen sind ungefähre Herstellerangaben (EU-Versionen).
// null = unbekannt. "looks" sind englische Bildbeschreibungen für die KI.
export const SCOOTERS = [
  // ---------- Xiaomi ----------
  {
    id: "xiaomi-m365", brand: "Xiaomi", model: "Mi Electric Scooter M365", kind: "privat", years: "2016–2019",
    speed: 25, range: 30, weight: 12.5, motor: 250, battery: 280, wheel: "8,5 Zoll", price: "ca. 350 €", rarity: "common",
    fact: "Der M365 hat E-Scooter in Europa bekannt gemacht. Viele spätere Modelle sehen ihm sehr ähnlich.",
    looks: ["a Xiaomi M365 electric kick scooter", "a minimalist white or black Xiaomi electric scooter with small wheels and a red rear accent", "a Xiaomi Mijia folding electric scooter"],
  },
  {
    id: "xiaomi-pro2", brand: "Xiaomi", model: "Mi Electric Scooter Pro 2", kind: "privat", years: "2020–2021",
    speed: 25, range: 45, weight: 14.2, motor: 300, battery: 474, wheel: "8,5 Zoll", price: "ca. 450 €", rarity: "common",
    fact: "Der Pro 2 hat einen grösseren Akku als der M365 und deshalb ein dickeres Trittbrett.",
    looks: ["a black Xiaomi Mi Pro 2 electric scooter", "a Xiaomi Pro electric scooter with a display on the handlebar and a thick deck"],
  },
  {
    id: "xiaomi-1s", brand: "Xiaomi", model: "Mi Electric Scooter 1S / Essential", kind: "privat", years: "2020–2021",
    speed: 25, range: 30, weight: 12.5, motor: 250, battery: 275, wheel: "8,5 Zoll", price: "ca. 380 €", rarity: "common",
    fact: "Der 1S ist im Grunde ein M365 mit Display am Lenker.",
    looks: ["a Xiaomi 1S electric scooter", "a light Xiaomi electric scooter with a small display"],
  },
  {
    id: "xiaomi-3", brand: "Xiaomi", model: "Mi Electric Scooter 3", kind: "privat", years: "2021–2022",
    speed: 25, range: 30, weight: 13.2, motor: 300, battery: 275, wheel: "8,5 Zoll", price: "ca. 450 €", rarity: "common",
    fact: "Den Scooter 3 gab es auch in Grau und Blau, nicht nur in Schwarz.",
    looks: ["a Xiaomi Electric Scooter 3", "a grey or blue Xiaomi electric scooter"],
  },
  {
    id: "xiaomi-4", brand: "Xiaomi", model: "Electric Scooter 4", kind: "privat", years: "seit 2022",
    speed: 25, range: 35, weight: 17, motor: 300, battery: null, wheel: "10 Zoll", price: "ca. 500 €", rarity: "common",
    fact: "Ab der 4er-Serie hat Xiaomi auf grössere 10-Zoll-Reifen gewechselt.",
    looks: ["a Xiaomi Electric Scooter 4 with 10 inch tires", "a black Xiaomi scooter with large tires"],
  },
  {
    id: "xiaomi-4pro", brand: "Xiaomi", model: "Electric Scooter 4 Pro", kind: "privat", years: "seit 2022",
    speed: 25, range: 55, weight: 17, motor: 350, battery: 446, wheel: "10 Zoll", price: "ca. 700 €", rarity: "common",
    fact: "Der 4 Pro hat eine Trommelbremse vorne und eine Scheibenbremse hinten.",
    looks: ["a Xiaomi Electric Scooter 4 Pro", "a black Xiaomi electric scooter with a thick stem and large 10 inch tires"],
  },
  {
    id: "xiaomi-4ultra", brand: "Xiaomi", model: "Electric Scooter 4 Ultra", kind: "privat", years: "seit 2022",
    speed: 25, range: 70, weight: 24.5, motor: 500, battery: 690, wheel: "10 Zoll", price: "ca. 1.000 €", rarity: "uncommon",
    fact: "Der 4 Ultra ist der erste Xiaomi-Scooter mit Federung vorne und hinten.",
    looks: ["a Xiaomi Electric Scooter 4 Ultra with suspension", "a large dark grey Xiaomi electric scooter with dual suspension"],
  },

  // ---------- Segway-Ninebot ----------
  {
    id: "ninebot-es", brand: "Segway-Ninebot", model: "KickScooter ES2 / ES4", kind: "privat", years: "2018–2020",
    speed: 25, range: 25, weight: 12.5, motor: 300, battery: 187, wheel: "8 Zoll", price: "ca. 400 €", rarity: "common",
    fact: "Die ES-Serie war die Basis für viele frühe Leih-Scooter, zum Beispiel bei Bird.",
    looks: ["a Segway Ninebot ES2 electric scooter", "a dark grey Ninebot electric scooter with front suspension and a slim deck"],
  },
  {
    id: "ninebot-f", brand: "Segway-Ninebot", model: "KickScooter F-Serie (F2 / F40)", kind: "privat", years: "seit 2021",
    speed: 25, range: 45, weight: 17, motor: 400, battery: null, wheel: "10 Zoll", price: "ca. 600 €", rarity: "common",
    fact: "Die F-Serie hat schlauchlose Reifen, die seltener platt werden.",
    looks: ["a Segway Ninebot F2 electric scooter", "a Ninebot F40 electric kick scooter with 10 inch tires"],
  },
  {
    id: "ninebot-g30", brand: "Segway-Ninebot", model: "KickScooter Max G30", kind: "privat", years: "seit 2019",
    speed: 25, range: 65, weight: 19, motor: 350, battery: 551, wheel: "10 Zoll", price: "ca. 700 €", rarity: "common",
    fact: "Der Max G30 ist so robust, dass viele Leihfirmen ähnliche Modelle benutzen.",
    looks: ["a Segway Ninebot Max G30 electric scooter", "a dark grey Ninebot Max scooter with a wide deck and a thick stem"],
  },
  {
    id: "ninebot-g2", brand: "Segway-Ninebot", model: "KickScooter Max G2", kind: "privat", years: "seit 2023",
    speed: 25, range: 70, weight: 24, motor: 450, battery: 551, wheel: "10 Zoll", price: "ca. 800 €", rarity: "common",
    fact: "Der G2 hat als Nachfolger des G30 zusätzlich eine Federung.",
    looks: ["a Segway Ninebot Max G2 electric scooter", "a grey Ninebot scooter with front suspension and a large deck"],
  },
  {
    id: "segway-gt2", brand: "Segway-Ninebot", model: "SuperScooter GT2", kind: "privat", years: "seit 2022",
    speed: 70, range: 90, weight: 52, motor: 3000, battery: 1512, wheel: "11 Zoll", price: "ca. 3.500 €", rarity: "rare",
    fact: "Der GT2 hat zwei Motoren und schafft 0 auf 50 km/h in etwa 4 Sekunden. Auf Schweizer Strassen ist er so nicht erlaubt.",
    looks: ["a Segway GT2 superscooter", "a huge black performance electric scooter with dual suspension and thick tires"],
  },

  // ---------- Weitere Privat-Scooter ----------
  {
    id: "niu-kqi3", brand: "NIU", model: "KQi3 Pro", kind: "privat", years: "seit 2021",
    speed: 25, range: 50, weight: 20, motor: 350, battery: 486, wheel: "9,5 Zoll", price: "ca. 600 €", rarity: "common",
    fact: "NIU ist eigentlich für Elektro-Roller bekannt und baut erst seit 2021 E-Scooter.",
    looks: ["a NIU KQi3 electric scooter", "an electric scooter with a very wide deck and NIU logo"],
  },
  {
    id: "niu-kqi-air", brand: "NIU", model: "KQi Air", kind: "privat", years: "seit 2023",
    speed: 25, range: 50, weight: 11.9, motor: 350, battery: null, wheel: "9,5 Zoll", price: "ca. 1.000 €", rarity: "uncommon",
    fact: "Der Rahmen besteht aus Karbon. Deshalb wiegt der KQi Air nur etwa 12 kg.",
    looks: ["a NIU KQi Air carbon fiber electric scooter", "a very slim lightweight carbon electric scooter"],
  },
  {
    id: "pure-air", brand: "Pure Electric", model: "Pure Air", kind: "privat", years: "seit 2021",
    speed: 25, range: 40, weight: 16, motor: 500, battery: null, wheel: "10 Zoll", price: "ca. 600 €", rarity: "uncommon",
    fact: "Pure Electric kommt aus Grossbritannien und verbaut den Motor im Vorderrad.",
    looks: ["a Pure Air electric scooter", "a white electric scooter with a wide platform and a motor in the front wheel"],
  },
  {
    id: "egret-ten", brand: "Egret", model: "Ten", kind: "privat", years: "seit 2018",
    speed: 20, range: 45, weight: 24, motor: 500, battery: null, wheel: "10 Zoll", price: "ca. 1.200 €", rarity: "uncommon",
    fact: "Egret kommt aus Hamburg und war einer der ersten E-Scooter mit Strassenzulassung in Deutschland.",
    looks: ["an Egret Ten electric scooter", "a German Egret electric scooter with a wide aluminium deck"],
  },
  {
    id: "soflow-so4", brand: "SoFlow", model: "SO4", kind: "privat", years: "seit 2020",
    speed: 20, range: 35, weight: 16, motor: 350, battery: null, wheel: "10 Zoll", price: "ca. 500 €", rarity: "common",
    fact: "SoFlow ist ein Schweizer Unternehmen aus Baar im Kanton Zug.",
    looks: ["a SoFlow SO4 electric scooter", "a black SoFlow electric scooter"],
  },
  {
    id: "trittbrett-kalle", brand: "Trittbrett", model: "Kalle", kind: "privat", years: "seit 2020",
    speed: 20, range: 30, weight: 15, motor: 350, battery: null, wheel: "10 Zoll", price: "ca. 800 €", rarity: "uncommon",
    fact: "Trittbrett kommt aus Deutschland und benennt seine Scooter nach Vornamen wie Kalle, Paul und Fritz.",
    looks: ["a Trittbrett Kalle electric scooter", "a German Trittbrett electric scooter"],
  },
  {
    id: "unagi-one", brand: "Unagi", model: "Model One", kind: "privat", years: "seit 2019",
    speed: 25, range: 25, weight: 12, motor: 500, battery: null, wheel: "7,5 Zoll", price: "ca. 1.000 €", rarity: "uncommon",
    fact: "Den Unagi gibt es auch im Abo statt zum Kaufen. Er hat zwei Motoren und Vollgummireifen.",
    looks: ["an Unagi Model One electric scooter", "a sleek minimalist electric scooter with solid tires and a carbon stem"],
  },
  {
    id: "inmotion-s1", brand: "Inmotion", model: "S1", kind: "privat", years: "seit 2020",
    speed: 25, range: 95, weight: 23, motor: 1000, battery: 840, wheel: "10 Zoll", price: "ca. 900 €", rarity: "uncommon",
    fact: "Der S1 hat einen besonders grossen Akku und kommt sehr weit.",
    looks: ["an Inmotion S1 electric scooter", "a large black electric scooter with suspension and a long range battery"],
  },
  {
    id: "apollo-phantom", brand: "Apollo", model: "Phantom", kind: "privat", years: "seit 2020",
    speed: 61, range: 64, weight: 34, motor: 2400, battery: null, wheel: "10 Zoll", price: "ca. 2.000 €", rarity: "rare",
    fact: "Apollo kommt aus Kanada. Am Lenker des Phantom sitzt ein auffälliges Display mit Daumengas.",
    looks: ["an Apollo Phantom electric scooter", "a performance electric scooter with a hexagonal stem and dual motors"],
  },
  {
    id: "kaabo-mantis", brand: "Kaabo", model: "Mantis 10", kind: "privat", years: "seit 2019",
    speed: 60, range: 60, weight: 30, motor: 2000, battery: null, wheel: "10 Zoll", price: "ca. 1.500 €", rarity: "rare",
    fact: "Die Mantis hat zwei Motoren und eine Federung an beiden Rädern.",
    looks: ["a Kaabo Mantis electric scooter", "a fast dual motor electric scooter with swing arm suspension"],
  },
  {
    id: "kaabo-wolf", brand: "Kaabo", model: "Wolf Warrior 11", kind: "privat", years: "seit 2019",
    speed: 80, range: 80, weight: 46, motor: 2400, battery: null, wheel: "11 Zoll", price: "ca. 3.000 €", rarity: "epic",
    fact: "Der Wolf Warrior ist ein Offroad-Monster mit Stollenreifen. Auf öffentlichen Strassen ist er nicht erlaubt.",
    looks: ["a Kaabo Wolf Warrior electric scooter", "a huge off-road electric scooter with knobby tires and big suspension arms"],
  },
  {
    id: "dualtron-thunder", brand: "Dualtron", model: "Thunder 2", kind: "privat", years: "seit 2021",
    speed: 95, range: 120, weight: 46, motor: 5400, battery: null, wheel: "11 Zoll", price: "ca. 4.000 €", rarity: "epic",
    fact: "Dualtron kommt aus Südkorea und baut einige der schnellsten Serien-E-Scooter der Welt.",
    looks: ["a Dualtron Thunder electric scooter", "an extreme high-performance electric scooter with a wide deck, LED lights and dual motors"],
  },
  {
    id: "dualtron-mini", brand: "Dualtron", model: "Mini", kind: "privat", years: "seit 2019",
    speed: 45, range: 50, weight: 20, motor: 800, battery: null, wheel: "8 Zoll", price: "ca. 1.200 €", rarity: "rare",
    fact: "Der Mini ist der kleinste Dualtron, hat aber trotzdem eine Federung.",
    looks: ["a Dualtron Mini electric scooter", "a compact Dualtron scooter with rubber suspension"],
  },

  // ---------- Leih-Scooter ----------
  {
    id: "lime", brand: "Lime", model: "Leih-Scooter", kind: "sharing", years: "seit 2018",
    speed: 20, range: null, weight: null, motor: null, battery: null, wheel: null, price: "per App, pro Minute", rarity: "common",
    fact: "Lime kommt aus San Francisco und ist eine der grössten Leih-Scooter-Firmen der Welt.",
    looks: ["a green and white Lime rental electric scooter", "a Lime shared e-scooter parked on the sidewalk"],
  },
  {
    id: "voi", brand: "Voi", model: "Leih-Scooter", kind: "sharing", years: "seit 2018",
    speed: 20, range: null, weight: null, motor: null, battery: null, wheel: null, price: "per App, pro Minute", rarity: "common",
    fact: "Voi kommt aus Schweden. Die Scooter sind an ihrer korallroten Farbe gut zu erkennen.",
    looks: ["a coral red and pink Voi rental electric scooter", "a Voi shared e-scooter parked on the street"],
  },
  {
    id: "tier", brand: "Tier", model: "Leih-Scooter", kind: "sharing", years: "2018–2024",
    speed: 20, range: null, weight: null, motor: null, battery: null, wheel: null, price: "per App, pro Minute", rarity: "common",
    fact: "Tier kommt aus Berlin und hat sich 2024 mit Dott zusammengeschlossen. Die alten Tier-Scooter sind türkisgrün.",
    looks: ["a teal green Tier rental electric scooter", "a turquoise mint green Tier shared e-scooter"],
  },
  {
    id: "dott", brand: "Dott", model: "Leih-Scooter", kind: "sharing", years: "seit 2019",
    speed: 20, range: null, weight: null, motor: null, battery: null, wheel: null, price: "per App, pro Minute", rarity: "common",
    fact: "Dott kommt aus Amsterdam. Die Scooter sind weiss mit blauen Details.",
    looks: ["a white and blue Dott rental electric scooter", "a Dott shared e-scooter with blue accents"],
  },
  {
    id: "bird", brand: "Bird", model: "Leih-Scooter", kind: "sharing", years: "seit 2017",
    speed: 20, range: null, weight: null, motor: null, battery: null, wheel: null, price: "per App, pro Minute", rarity: "common",
    fact: "Bird hat 2017 die Leih-Scooter erfunden und in wenigen Monaten in vielen Städten verteilt.",
    looks: ["a black or white Bird rental electric scooter", "a Bird shared e-scooter on the sidewalk"],
  },
  {
    id: "bolt", brand: "Bolt", model: "Leih-Scooter", kind: "sharing", years: "seit 2019",
    speed: 20, range: null, weight: null, motor: null, battery: null, wheel: null, price: "per App, pro Minute", rarity: "common",
    fact: "Bolt kommt aus Estland und ist auch als Taxi-App bekannt. Die Scooter sind grün und schwarz.",
    looks: ["a green and black Bolt rental electric scooter", "a Bolt shared e-scooter parked on the street"],
  },
];

// Für die Vorprüfung: Ist überhaupt ein E-Scooter auf dem Foto?
export const GATE = {
  scooter: ["a photo of an electric kick scooter", "a photo of an e-scooter parked on the street", "a photo of a person riding an electric scooter"],
  other: [
    "a photo of a car", "a photo of a bicycle", "a photo of a motorcycle", "a photo of a moped",
    "a photo of a person", "a photo of a building", "a photo of an animal", "a photo of food",
    "a photo of a child's kick scooter without motor", "a photo of a room", "a photo of a landscape",
  ],
};
