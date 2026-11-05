// Grands flux d'échanges 2000-2008 : routes maritimes, terrestres (routes, rail, oléoducs) et aériennes, locales (régionales)
// ou mondiales (intercontinentales). Tracés simplifiés par points de passage [longitude, latitude] (géographie réelle).
// Volumes 1 à 5 : ESTIMATION d'ordre de grandeur (part du commerce ou du trafic), à remplacer par des données si besoin.
export type ModeFlux = "maritime" | "terrestre" | "aerien";
export type Portee = "local" | "mondial";
export interface Flux {
  id: string; nom: string; mode: ModeFlux; portee: Portee; volume: number;
  trace: [number, number][]; pays: string[]; detroits?: string[]; depuis?: number;
}
export interface Detroit { id: string; nom: string; position: [number, number]; poids: number } // poids : probabilité relative de blocage

type P = [number, number];
const SHANGHAI: P = [121.8, 31.0], SINGAPOUR: P = [103.8, 1.2], ROTTERDAM: P = [4.0, 52.0], NEW_YORK: P = [-73.8, 40.4], LOS_ANGELES: P = [-118.3, 33.6];

export const DETROITS: Detroit[] = [
  { id: "ormuz", nom: "Détroit d'Ormuz", position: [56.4, 26.5], poids: 3 },
  { id: "malacca", nom: "Détroit de Malacca", position: [100.5, 3.2], poids: 2 },
  { id: "suez", nom: "Canal de Suez", position: [32.4, 30.6], poids: 2 },
  { id: "bab", nom: "Détroit de Bab-el-Mandeb", position: [43.4, 12.6], poids: 2 },
  { id: "panama", nom: "Canal de Panama", position: [-79.7, 9.1], poids: 1 },
  { id: "bosphore", nom: "Détroit du Bosphore", position: [29.0, 41.1], poids: 1 },
  { id: "gibraltar", nom: "Détroit de Gibraltar", position: [-5.6, 35.95], poids: 0.5 },
];

const MER_ROUGE: [number, number][] = [[43.4, 12.6], [38.5, 20.5], [32.4, 30.6]];

export const FLUX: Flux[] = [
  // ---------- Maritime mondial ----------
  { id: "m_asie_europe", nom: "Route Asie-Europe (Malacca, Suez)", mode: "maritime", portee: "mondial", volume: 5,
    trace: [SHANGHAI, [114.5, 21.5], [109, 10], SINGAPOUR, [95, 6.5], [80, 5.5], [60, 13], ...MER_ROUGE, [25, 34], [12, 37.2], [-5.6, 35.95], [-10, 40], [-6, 48.5], ROTTERDAM],
    pays: ["CHN", "KOR", "JPN", "TWN", "VNM", "SGP", "MYS", "IND", "SAU", "EGY", "ITA", "ESP", "FRA", "NLD", "DEU", "GBR"], detroits: ["malacca", "bab", "suez", "gibraltar"] },
  { id: "m_transpacifique", nom: "Route transpacifique", mode: "maritime", portee: "mondial", volume: 5,
    trace: [SHANGHAI, [135, 33], [160, 42], [-170, 45], [-145, 40], LOS_ANGELES], pays: ["CHN", "JPN", "KOR", "TWN", "USA", "CAN"] },
  { id: "m_transatlantique", nom: "Route transatlantique", mode: "maritime", portee: "mondial", volume: 4,
    trace: [NEW_YORK, [-50, 44], [-25, 48], [-6, 49.5], ROTTERDAM], pays: ["USA", "CAN", "GBR", "NLD", "DEU", "FRA"] },
  { id: "m_petrole_asie", nom: "Route du pétrole Golfe-Asie", mode: "maritime", portee: "mondial", volume: 5,
    trace: [[50.2, 26.6], [56.4, 26.5], [62, 22], [75, 8], [95, 6.5], SINGAPOUR, [112, 15], [122, 28], [130, 33], [139.8, 35.4]],
    pays: ["SAU", "ARE", "QAT", "IRN", "IRQ", "IND", "SGP", "CHN", "KOR", "JPN", "TWN"], detroits: ["ormuz", "malacca"] },
  { id: "m_petrole_europe", nom: "Route du pétrole Golfe-Europe", mode: "maritime", portee: "mondial", volume: 3,
    trace: [[50.2, 26.6], [56.4, 26.5], [58, 20], [50, 13], ...MER_ROUGE, [25, 34], [15, 37.5], [5, 42.8]],
    pays: ["SAU", "ARE", "QAT", "IRN", "IRQ", "EGY", "ITA", "FRA", "ESP", "DEU"], detroits: ["ormuz", "bab", "suez"] },
  { id: "m_golfe_amerique", nom: "Route du pétrole Golfe-Amérique (cap de Bonne-Espérance)", mode: "maritime", portee: "mondial", volume: 2,
    trace: [[50.2, 26.6], [56.4, 26.5], [58, 18], [45, -10], [35, -30], [18.5, -35.5], [0, -15], [-30, 10], [-60, 25], [-89, 28.5]],
    pays: ["SAU", "ARE", "IRQ", "USA", "ZAF"], detroits: ["ormuz"] },
  { id: "m_minerai_bresil", nom: "Route du minerai Brésil-Chine", mode: "maritime", portee: "mondial", volume: 3,
    trace: [[-43.2, -23], [-20, -28], [18.5, -35.5], [50, -30], [80, -15], [105, -7], [110, 5], [114.5, 21.5], SHANGHAI], pays: ["BRA", "ZAF", "IDN", "CHN"] },
  { id: "m_australie_asie", nom: "Route Australie-Asie (fer, charbon, gaz)", mode: "maritime", portee: "mondial", volume: 4,
    trace: [[118.6, -20.3], [118, -8.5], [120, 5], [123, 20], SHANGHAI, [129, 34.5], [139.8, 35.4]], pays: ["AUS", "IDN", "PHL", "CHN", "KOR", "JPN"] },
  { id: "m_panama", nom: "Route Asie-côte est américaine (Panama)", mode: "maritime", portee: "mondial", volume: 3,
    trace: [SHANGHAI, [150, 25], [-160, 18], [-120, 12], [-79.7, 9.1], [-76, 17], [-74, 28], NEW_YORK], pays: ["CHN", "JPN", "KOR", "PAN", "USA", "COL"], detroits: ["panama"] },
  { id: "m_mer_noire", nom: "Route de la mer Noire (céréales, pétrole)", mode: "maritime", portee: "mondial", volume: 2,
    trace: [[37.8, 44.7], [33, 43.5], [29, 41.1], [26, 40], [24, 37], [15, 36], [-5.6, 35.95]], pays: ["RUS", "UKR", "TUR", "EGY", "ITA"], detroits: ["bosphore", "gibraltar"] },
  { id: "m_afrique_ouest", nom: "Route du pétrole d'Afrique de l'Ouest", mode: "maritime", portee: "mondial", volume: 2,
    trace: [[3.4, 6.2], [-5, 3], [-20, 12], [-45, 25], [-74, 38]], pays: ["NGA", "USA"] },
  // ---------- Maritime local ----------
  { id: "ml_asie_est", nom: "Cabotage d'Asie orientale", mode: "maritime", portee: "local", volume: 4,
    trace: [SINGAPOUR, [106.7, 10.5], [114.2, 22.2], [120.3, 22.6], SHANGHAI, [129, 35], [139.8, 35.4]], pays: ["SGP", "MYS", "VNM", "CHN", "TWN", "KOR", "JPN", "PHL"] },
  { id: "ml_mediterranee", nom: "Lignes de Méditerranée", mode: "maritime", portee: "local", volume: 3,
    trace: [[2.2, 41.3], [5.3, 43.3], [8.9, 44.4], [12.3, 41.8], [3, 36.8], [29.9, 31.2], [34.8, 32.1], [28.9, 41]], pays: ["ESP", "FRA", "ITA", "DZA", "EGY", "ISR", "TUR"] },
  { id: "ml_mer_du_nord", nom: "Mer du Nord et Baltique", mode: "maritime", portee: "local", volume: 3,
    trace: [[1.3, 51.5], ROTTERDAM, [9.9, 53.6], [10.7, 59.9], [18.6, 54.4], [30, 60]], pays: ["GBR", "NLD", "DEU", "NOR", "POL", "RUS"] },
  { id: "ml_golfe", nom: "Navettes du Golfe persique", mode: "maritime", portee: "local", volume: 2,
    trace: [[47.8, 30.4], [50.2, 26.6], [51.5, 25.3], [55.3, 25.3], [56.4, 26.5]], pays: ["IRQ", "SAU", "QAT", "ARE", "IRN"], detroits: ["ormuz"] },
  { id: "ml_caraibes", nom: "Lignes des Caraïbes", mode: "maritime", portee: "local", volume: 2,
    trace: [[-80.2, 25.8], [-82.4, 23.1], [-79.7, 9.1], [-75.5, 10.4], [-66.9, 10.6]], pays: ["USA", "CUB", "PAN", "COL", "VEN"] },
  // ---------- Terrestre mondial ----------
  { id: "t_transsiberien", nom: "Transsibérien", mode: "terrestre", portee: "mondial", volume: 2,
    trace: [[37.6, 55.7], [49.1, 55.8], [60.6, 56.8], [73.4, 55], [82.9, 55], [104.3, 52.3], [113.5, 52], [127.5, 50.3], [131.9, 43.1]], pays: ["RUS", "CHN"] },
  { id: "t_droujba", nom: "Oléoducs et gazoducs Russie-Europe", mode: "terrestre", portee: "mondial", volume: 4,
    trace: [[49.1, 55.8], [37.6, 55.7], [30.5, 50.4], [21, 52.2], [13.4, 52.5], [8.7, 50.1]], pays: ["RUS", "UKR", "POL", "DEU"] },
  { id: "t_kazakhstan_chine", nom: "Oléoduc Kazakhstan-Chine", mode: "terrestre", portee: "mondial", volume: 2, depuis: 2006,
    trace: [[51.9, 47.1], [66.9, 47.5], [74.6, 46.8], [82.6, 45.2], [87.6, 43.8]], pays: ["KAZ", "CHN"] },
  { id: "t_karakorum", nom: "Route du Karakorum", mode: "terrestre", portee: "mondial", volume: 1,
    trace: [[73.1, 33.7], [74.3, 35.9], [75.9, 39.5], [87.6, 43.8]], pays: ["PAK", "CHN"] },
  { id: "t_europe_turquie", nom: "Corridor Europe-Turquie-Proche-Orient", mode: "terrestre", portee: "mondial", volume: 2,
    trace: [[8.7, 50.1], [16.4, 48.2], [20.5, 44.8], [28.9, 41], [32.9, 39.9], [36.2, 37], [44.4, 33.3]], pays: ["DEU", "TUR", "IRQ"] },
  // ---------- Terrestre local ----------
  { id: "tl_alena", nom: "Corridor ALENA", mode: "terrestre", portee: "local", volume: 4,
    trace: [[-99.1, 19.4], [-100.3, 25.7], [-95.4, 29.8], [-90.2, 38.6], [-87.6, 41.9], [-79.4, 43.7], [-73.6, 45.5]], pays: ["MEX", "USA", "CAN"] },
  { id: "tl_europe", nom: "Grand corridor européen", mode: "terrestre", portee: "local", volume: 4,
    trace: [[-3.7, 40.4], [2.3, 48.9], [4.4, 50.8], [8.7, 50.1], [13.4, 52.5], [21, 52.2]], pays: ["ESP", "FRA", "NLD", "DEU", "POL"] },
  { id: "tl_chine", nom: "Axes Pékin-Shanghai-Canton", mode: "terrestre", portee: "local", volume: 4,
    trace: [[116.4, 39.9], [117.2, 34.3], [121.5, 31.2], [120.2, 30.3], [114.3, 30.6], [113.3, 23.1]], pays: ["CHN"] },
  { id: "tl_inde", nom: "Quadrilatère d'or indien", mode: "terrestre", portee: "local", volume: 2,
    trace: [[77.2, 28.6], [72.9, 19.1], [77.6, 13], [80.3, 13.1], [88.4, 22.6], [77.2, 28.6]], pays: ["IND"] },
  { id: "tl_mercosur", nom: "Axes du Mercosur", mode: "terrestre", portee: "local", volume: 2,
    trace: [[-46.6, -23.5], [-51.2, -30], [-58.4, -34.6], [-64.2, -31.4], [-70.6, -33.4]], pays: ["BRA", "ARG", "CHL"] },
  { id: "tl_afrique_est", nom: "Corridor nord d'Afrique de l'Est", mode: "terrestre", portee: "local", volume: 1,
    trace: [[39.7, -4], [36.8, -1.3], [32.6, 0.3], [29.2, -1.7], [25.2, 0.5]], pays: ["KEN", "COD"] },
  // ---------- Aérien mondial ----------
  { id: "a_atlantique_nord", nom: "Pont aérien Atlantique nord", mode: "aerien", portee: "mondial", volume: 5,
    trace: [NEW_YORK, [-0.45, 51.47]], pays: ["USA", "GBR", "FRA", "DEU", "CAN"] },
  { id: "a_paris_ny", nom: "Paris-New York", mode: "aerien", portee: "mondial", volume: 3, trace: [NEW_YORK, [2.55, 49]], pays: ["USA", "FRA"] },
  { id: "a_europe_golfe", nom: "Europe-Golfe", mode: "aerien", portee: "mondial", volume: 3, trace: [[-0.45, 51.47], [55.4, 25.25]], pays: ["GBR", "ARE", "QAT", "SAU"] },
  { id: "a_golfe_asie", nom: "Golfe-Asie du Sud-Est", mode: "aerien", portee: "mondial", volume: 3, trace: [[55.4, 25.25], [103.99, 1.36]], pays: ["ARE", "IND", "SGP", "THA", "MYS"] },
  { id: "a_pacifique", nom: "Pacifique nord", mode: "aerien", portee: "mondial", volume: 3, trace: [LOS_ANGELES, [140.4, 35.8]], pays: ["USA", "JPN", "KOR"] },
  { id: "a_europe_chine", nom: "Europe-Chine", mode: "aerien", portee: "mondial", volume: 2, trace: [[8.57, 50.03], [116.6, 40.08]], pays: ["DEU", "FRA", "GBR", "RUS", "CHN"] },
  { id: "a_londres_hongkong", nom: "Londres-Hong Kong", mode: "aerien", portee: "mondial", volume: 2, trace: [[-0.45, 51.47], [113.9, 22.3]], pays: ["GBR", "CHN"] },
  { id: "a_ameriques", nom: "Amérique du Nord-Amérique du Sud", mode: "aerien", portee: "mondial", volume: 2, trace: [[-80.3, 25.8], [-46.5, -23.4]], pays: ["USA", "BRA", "ARG", "COL", "VEN"] },
  { id: "a_europe_afrique", nom: "Europe-Afrique", mode: "aerien", portee: "mondial", volume: 1, trace: [[2.55, 49], [3.3, 6.6], [28.2, -26.1]], pays: ["FRA", "NGA", "ZAF"] },
  { id: "a_moscou_pekin", nom: "Moscou-Pékin", mode: "aerien", portee: "mondial", volume: 1, trace: [[37.4, 55.97], [116.6, 40.08]], pays: ["RUS", "CHN"] },
  // ---------- Aérien local ----------
  { id: "al_usa", nom: "Lignes intérieures américaines", mode: "aerien", portee: "local", volume: 5, trace: [NEW_YORK, [-87.9, 41.98], [-104.7, 39.86], LOS_ANGELES], pays: ["USA"] },
  { id: "al_europe", nom: "Lignes intra-européennes", mode: "aerien", portee: "local", volume: 4, trace: [[-3.57, 40.47], [2.55, 49], [-0.45, 51.47], [8.57, 50.03], [12.25, 41.8]], pays: ["ESP", "FRA", "GBR", "DEU", "ITA", "NLD"] },
  { id: "al_chine", nom: "Lignes intérieures chinoises", mode: "aerien", portee: "local", volume: 3, trace: [[116.6, 40.08], [121.8, 31.15], [113.3, 23.4], [104, 30.6]], pays: ["CHN"] },
  { id: "al_asie_est", nom: "Navettes Tokyo-Séoul-Taipei", mode: "aerien", portee: "local", volume: 3, trace: [[140.4, 35.8], [126.45, 37.46], [121.2, 25.08], [113.9, 22.3]], pays: ["JPN", "KOR", "TWN", "CHN"] },
  { id: "al_inde", nom: "Lignes intérieures indiennes", mode: "aerien", portee: "local", volume: 2, trace: [[77.1, 28.56], [72.87, 19.09], [77.7, 13.2]], pays: ["IND"] },
  { id: "al_bresil", nom: "Pont aérien Rio-São Paulo", mode: "aerien", portee: "local", volume: 2, trace: [[-43.2, -22.9], [-46.5, -23.4], [-47.9, -15.8]], pays: ["BRA"] },
];
