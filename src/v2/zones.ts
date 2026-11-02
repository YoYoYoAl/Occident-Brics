// Refonte v2 : les 12 zones et les 25 routes commerciales (règles du 2 novembre 2026).
// Répartition des 194 pays : géographique ; cas limites marqués « estimation » (Turquie, Afghanistan, Mexique, Chypre, Soudan).
export interface Zone { id: string; nom: string; court: string; couleur: string; pays: string[] }

export const ZONES: Zone[] = [
  { id: "AMN", nom: "Amérique du Nord", court: "Am. du Nord", couleur: "#5b8fd6", pays: ["USA", "CAN", "MEX"] }, // MEX : estimation
  { id: "AMC", nom: "Amérique centrale et Caraïbes", court: "Caraïbes", couleur: "#46b3a6", pays: ["CUB", "PAN", "ATG", "BHS", "BRB", "BLZ", "CRI", "DMA", "DOM", "SLV", "GRD", "GTM", "HTI", "HND", "JAM", "NIC", "KNA", "LCA", "VCT", "TTO"] },
  { id: "AMS", nom: "Amérique du Sud", court: "Am. du Sud", couleur: "#7cbf5a", pays: ["BRA", "ARG", "VEN", "COL", "CHL", "BOL", "ECU", "GUY", "PRY", "PER", "SUR", "URY"] },
  { id: "EUO", nom: "Europe de l'Ouest", court: "Europe Ouest", couleur: "#8a7fd0", pays: ["DEU", "GBR", "FRA", "ITA", "ESP", "NLD", "NOR", "AND", "AUT", "BEL", "CYP", "DNK", "FIN", "GRC", "ISL", "IRL", "LIE", "LUX", "MLT", "MCO", "PRT", "SMR", "SWE", "CHE"] }, // CYP : estimation
  { id: "EUE", nom: "Europe de l'Est et Balkans", court: "Europe Est", couleur: "#c08ad0", pays: ["POL", "UKR", "ALB", "BLR", "BIH", "BGR", "HRV", "CZE", "EST", "HUN", "LVA", "LTU", "MDA", "MNE", "MKD", "ROU", "SRB", "SVK", "SVN"] },
  { id: "RCA", nom: "Russie, Caucase et Asie centrale", court: "Russie et Asie centrale", couleur: "#d98a5f", pays: ["RUS", "KAZ", "ARM", "AZE", "GEO", "KGZ", "TJK", "TKM", "UZB"] },
  { id: "MOA", nom: "Moyen-Orient et Afrique du Nord", court: "Moyen-Orient", couleur: "#e0b54a", pays: ["TUR", "SAU", "IRN", "IRQ", "ISR", "EGY", "ARE", "QAT", "DZA", "BHR", "JOR", "KWT", "LBN", "OMN", "SYR", "YEM", "LBY", "MAR", "TUN"] }, // TUR : estimation
  { id: "AOC", nom: "Afrique de l'Ouest et centrale", court: "Afrique Ouest", couleur: "#c9a35e", pays: ["NGA", "COD", "BEN", "BFA", "CPV", "CMR", "CAF", "TCD", "COG", "CIV", "GNQ", "GAB", "GMB", "GHA", "GIN", "GNB", "LBR", "MLI", "MRT", "NER", "STP", "SEN", "SLE", "TGO"] },
  { id: "AEA", nom: "Afrique de l'Est et australe", court: "Afrique Est", couleur: "#a7b85a", pays: ["ZAF", "ETH", "KEN", "AGO", "BWA", "BDI", "COM", "DJI", "ERI", "SWZ", "LSO", "MDG", "MWI", "MUS", "MOZ", "NAM", "RWA", "SYC", "SOM", "SSD", "SDN", "TZA", "UGA", "ZMB", "ZWE"] }, // SDN : estimation
  { id: "ASS", nom: "Asie du Sud", court: "Asie du Sud", couleur: "#e07a8a", pays: ["IND", "PAK", "BGD", "AFG", "BTN", "MDV", "NPL", "LKA"] }, // AFG : estimation
  { id: "ASE", nom: "Asie de l'Est", court: "Asie de l'Est", couleur: "#d6605a", pays: ["CHN", "JPN", "KOR", "PRK", "TWN", "MNG"] },
  { id: "ASO", nom: "Asie du Sud-Est et Océanie", court: "Asie SE et Océanie", couleur: "#4fa3c9", pays: ["AUS", "IDN", "VNM", "THA", "MYS", "SGP", "PHL", "BRN", "KHM", "LAO", "MMR", "TLS", "FJI", "KIR", "MHL", "FSM", "NRU", "NZL", "PLW", "PNG", "WSM", "SLB", "TON", "TUV", "VUT"] },
];
export const ZONE_DE: Record<string, string> = Object.fromEntries(ZONES.flatMap(z => z.pays.map(p => [p, z.id])));
export const zone = (id: string) => ZONES.find(z => z.id === id)!;

// 25 routes : une route est « tenue » par un camp quand tous ses pays sont au moins en accords commerciaux avec lui (estimation des bonus).
export interface Route { id: string; nom: string; pays: string[]; bonus: string; trace: [number, number][]; etiq?: [number, number] } // etiq : position du nom quand la zone est chargée
export const ROUTES: Route[] = [
  { id: "malacca", nom: "Détroit de Malacca", pays: ["SGP", "MYS", "IDN"], bonus: "+1 point par an", trace: [[80, 6], [95, 5], [101, 3], [104, 1.3], [110, 4]] },
  { id: "suez", nom: "Canal de Suez", pays: ["EGY"], bonus: "+1 point par an", trace: [[28, 33], [32.3, 31.2], [32.5, 30], [34, 27]] },
  { id: "babelmandeb", nom: "Bab-el-Mandeb", pays: ["YEM", "DJI", "ERI"], bonus: "commerce Europe-Asie +10 %", trace: [[38, 20], [43.3, 12.6], [50, 12], [60, 12]] },
  { id: "ormuz", nom: "Détroit d'Ormuz", pays: ["IRN", "OMN", "ARE"], bonus: "pétrole garanti, +1 point", trace: [[50, 27.5], [56.4, 26.5], [58, 24.5], [62, 22]] },
  { id: "panama", nom: "Canal de Panama", pays: ["PAN", "COL"], bonus: "commerce Amériques-Asie +10 %", trace: [[-75, 14], [-79.6, 9.2], [-82, 6], [-90, 4]] },
  { id: "detroits", nom: "Détroits turcs", pays: ["TUR", "GRC"], bonus: "accès mer Noire, naval +5 %", trace: [[24, 38], [26.5, 40.2], [29, 41.1], [31, 43]], etiq: [21, 39.5] },
  { id: "cap", nom: "Cap de Bonne-Espérance", pays: ["ZAF", "NAM"], bonus: "route de secours de Suez", trace: [[5, -25], [14, -31], [18.5, -35], [25, -36], [35, -32]] },
  { id: "arctique", nom: "Route de l'Arctique", pays: ["RUS", "NOR", "CAN", "DNK"], bonus: "ouverte après 2025 si le climat se réchauffe", trace: [[20, 72], [45, 74], [80, 76], [120, 76], [170, 70]] },
  { id: "corridor", nom: "Corridor terrestre eurasien", pays: ["KAZ", "UZB", "PAK", "IRN"], bonus: "commerce Chine-Europe +10 %", trace: [[87, 43], [76, 43], [66, 41], [58, 37], [50, 35]], etiq: [74, 46] },
  { id: "gibraltar", nom: "Détroit de Gibraltar", pays: ["ESP", "MAR"], bonus: "accès Méditerranée, +1 point", trace: [[-12, 36], [-5.6, 36], [0, 37], [5, 38]] },
  { id: "merchine", nom: "Mer de Chine méridionale", pays: ["VNM", "PHL", "MYS", "BRN", "TWN"], bonus: "commerce Asie +10 %", trace: [[106, 3], [111, 9], [115, 15], [119, 21], [122, 25]] },
  { id: "atlantique", nom: "Atlantique Nord", pays: ["GBR", "IRL", "ISL", "PRT", "CAN"], bonus: "lien transatlantique, +1 point", trace: [[-9, 43], [-20, 50], [-40, 52], [-55, 47]] },
  // 13 routes ajoutées le 2 novembre 2026 (passages réels ; effets décrits : estimation).
  { id: "taiwan", nom: "Détroit de Taïwan", pays: ["TWN", "CHN"], bonus: "commerce Asie de l'Est +10 %", trace: [[117, 21], [119.5, 23.5], [120.5, 25], [122, 27]] },
  { id: "coree", nom: "Détroit de Corée", pays: ["KOR", "JPN"], bonus: "lien Japon-Corée, +1 point", trace: [[127, 32], [129, 34.3], [131, 36], [133, 38]] },
  { id: "sonde", nom: "Détroit de la Sonde", pays: ["IDN"], bonus: "route de secours de Malacca", trace: [[95, -9], [101, -7.5], [105.8, -6.2], [107, -5]], etiq: [97, -10] },
  { id: "manche", nom: "Manche et mer du Nord", pays: ["GBR", "FRA", "BEL", "NLD", "DEU"], bonus: "ports d'Europe du Nord, +1 point", trace: [[-6, 49], [-1.5, 50], [1.5, 51], [4, 52.5], [7, 54]] },
  { id: "danois", nom: "Détroits danois", pays: ["DNK", "SWE"], bonus: "accès Baltique, naval +5 %", trace: [[6, 57.5], [10.5, 57.8], [11.5, 56], [12.7, 55.6], [15, 55]] },
  { id: "mozambique", nom: "Canal du Mozambique", pays: ["MOZ", "MDG"], bonus: "gaz et commerce Afrique-Asie +10 %", trace: [[40, -11], [41.5, -17], [40, -22], [36, -27]] },
  { id: "guinee", nom: "Golfe de Guinée", pays: ["NGA", "GHA", "CIV", "CMR"], bonus: "pétrole africain, +1 point", trace: [[-15, 5], [-5, 3.5], [3, 3], [8, 3.5], [9, 2]] },
  { id: "btc", nom: "Oléoduc Bakou-Ceyhan", pays: ["AZE", "GEO", "TUR"], bonus: "pétrole de la Caspienne sans la Russie", trace: [[49.9, 40.4], [44.8, 41.7], [41, 40], [35.8, 36.9]], etiq: [31, 45.5] },
  { id: "droujba", nom: "Oléoduc Droujba", pays: ["RUS", "BLR", "UKR", "POL"], bonus: "pétrole russe vers l'Europe, +1 point", trace: [[52, 53], [40, 52], [30, 52.5], [24, 52], [19, 52]], etiq: [36, 56] },
  { id: "mexique", nom: "Golfe du Mexique", pays: ["USA", "MEX", "CUB"], bonus: "pétrole et ports du Golfe, +1 point", trace: [[-97, 26], [-90, 25], [-84, 23.5], [-80, 25]] },
  { id: "plata", nom: "Atlantique Sud (Río de la Plata)", pays: ["BRA", "URY", "ARG"], bonus: "exportations agricoles +10 %", trace: [[-43, -23], [-48, -28], [-56, -34.9], [-58, -36]] },
  { id: "magellan", nom: "Détroit de Magellan", pays: ["CHL", "ARG"], bonus: "route de secours de Panama", trace: [[-75, -52], [-70.5, -53], [-68, -54.5], [-63, -56]], etiq: [-30, -52] },
  { id: "nordsud", nom: "Corridor Nord-Sud (Inde-Iran-Russie)", pays: ["IND", "IRN", "AZE", "RUS"], bonus: "commerce Inde-Russie +10 %", trace: [[72.8, 19], [60, 23], [56.3, 27.2], [52, 32], [49.6, 37.5], [49.9, 40.4], [47, 43], [46, 48]], etiq: [62, 33] },
];
