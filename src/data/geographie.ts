// Expositions géographiques des 50 pays aux aléas naturels : estimation qualitative (géographie physique),
// à remplacer par des données (EM-DAT, USGS) quand l'accès réseau le permettra.
export type Alea = "cyclone" | "seisme" | "volcan" | "secheresse";

export const EXPOSITION: Record<Alea, string[]> = {
  cyclone: ["USA", "CHN", "IND", "BGD", "PHL", "JPN", "MEX", "VNM", "TWN", "KOR", "AUS", "CUB", "THA", "PAK", "PRK", "MYS"],
  seisme: ["JPN", "IDN", "TUR", "IRN", "CHN", "PAK", "IND", "CHL", "MEX", "PHL", "TWN", "ITA", "COL", "USA", "DZA", "VEN", "KAZ"],
  volcan: ["IDN", "JPN", "PHL", "CHL", "ITA", "MEX", "USA", "COL", "ETH", "KEN", "RUS"],
  secheresse: ["AUS", "ETH", "KEN", "IND", "CHN", "USA", "BRA", "ARG", "ZAF", "NGA", "DZA", "EGY", "IRN", "PAK", "ESP", "MEX", "KAZ", "IRQ"],
};

// Pays sous sanctions ou embargo américains en 2000 (faits) : leur canal économique occidental est bloqué.
export const SANCTIONNES_2000 = ["CUB", "IRN", "IRQ", "PRK"];

// Alliés formels en 2000 (traités) : OTAN (membres parmi les 50 pays) et traités bilatéraux.
export const ALLIES_2000: Record<"OCC" | "CHN", string[]> = {
  OCC: ["CAN", "GBR", "FRA", "DEU", "ITA", "ESP", "NLD", "NOR", "POL", "TUR", "JPN", "KOR", "AUS", "PHL", "THA"],
  CHN: ["PRK"],
};

// Régimes non démocratiques en 2000 : estimation qualitative proche de la classification Polity IV (score < 6),
// à vérifier sur données. Ils ne connaissent presque pas d'élection de rupture (facteur « democratie »).
export const NON_DEMOCRATIES_2000 = ["CHN", "SAU", "IRN", "IRQ", "EGY", "ARE", "QAT", "PAK", "VNM", "PRK", "KAZ", "ETH", "DZA", "COD", "CUB", "SGP", "MYS", "RUS"];

// ---------- Les 144 autres membres de l'ONU (complements2000.json : faits 2000, sauf expositions et régimes = ESTIMATIONS) ----------
import complements from "./complements2000.json";
const C = complements as unknown as { exposition: Record<Alea, string[]>; sanctionnes2000: string[]; allies2000: Record<"OCC" | "CHN", string[]>; nonDemocraties2000: string[] };
for (const a of Object.keys(C.exposition) as Alea[]) EXPOSITION[a].push(...C.exposition[a].filter(i => !EXPOSITION[a].includes(i)));
SANCTIONNES_2000.push(...C.sanctionnes2000);
ALLIES_2000.OCC.push(...C.allies2000.OCC); ALLIES_2000.CHN.push(...C.allies2000.CHN);
NON_DEMOCRATIES_2000.push(...C.nonDemocraties2000);
