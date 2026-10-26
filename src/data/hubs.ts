// Grands ports à conteneurs et aéroports de 2000 : nœuds des flux, sur lesquels on peut investir.
// Volumes : ESTIMATIONS en ordre de grandeur pour l'an 2000 (ports : millions d'EVP ; aéroports : millions de passagers).
// Rang : « majeur » au-dessus de 4 M EVP ou 40 M passagers, sinon « secondaire » (secondaire ne veut pas dire petit).
export type TypeHub = "port" | "aeroport";
export interface Hub { id: string; nom: string; type: TypeHub; iso: string; position: [number, number]; volume: number; rang: "majeur" | "secondaire" }

const port = (id: string, nom: string, iso: string, position: [number, number], volume: number): Hub =>
  ({ id: `p_${id}`, nom, type: "port", iso, position, volume, rang: volume >= 4 ? "majeur" : "secondaire" });
const aero = (id: string, nom: string, iso: string, position: [number, number], volume: number): Hub =>
  ({ id: `a_${id}`, nom, type: "aeroport", iso, position, volume, rang: volume >= 40 ? "majeur" : "secondaire" });

export const HUBS: Hub[] = [
  // ---------- Ports (millions d'EVP, estimation 2000) ----------
  port("hong_kong", "Hong Kong", "CHN", [114.2, 22.3], 18), port("singapour", "Singapour", "SGP", [103.8, 1.26], 17),
  port("busan", "Busan", "KOR", [129.0, 35.1], 7.5), port("kaohsiung", "Kaohsiung", "TWN", [120.3, 22.6], 7.4),
  port("rotterdam", "Rotterdam", "NLD", [4.1, 51.95], 6.3), port("shanghai", "Shanghai", "CHN", [121.8, 31.2], 5.6),
  port("los_angeles", "Los Angeles et Long Beach", "USA", [-118.25, 33.75], 9.5), port("hambourg", "Hambourg", "DEU", [9.95, 53.55], 4.2),
  port("anvers", "Anvers", "BEL", [4.4, 51.25], 4.1), port("shenzhen", "Shenzhen", "CHN", [113.9, 22.5], 4.0),
  port("port_klang", "Port Klang", "MYS", [101.4, 3.0], 3.2), port("dubai", "Dubaï (Jebel Ali)", "ARE", [55.0, 25.0], 3.1),
  port("new_york", "New York et New Jersey", "USA", [-74.1, 40.65], 3.0), port("tokyo", "Tokyo et Yokohama", "JPN", [139.75, 35.5], 5.2),
  port("felixstowe", "Felixstowe", "GBR", [1.35, 51.95], 2.8), port("gioia_tauro", "Gioia Tauro", "ITA", [15.9, 38.45], 2.6),
  port("tanjung_priok", "Tanjung Priok (Jakarta)", "IDN", [106.9, -6.1], 2.5), port("laem_chabang", "Laem Chabang", "THA", [100.9, 13.1], 2.2),
  port("qingdao", "Qingdao", "CHN", [120.3, 36.05], 2.1), port("algesiras", "Algésiras", "ESP", [-5.45, 36.13], 2.0),
  port("manille", "Manille", "PHL", [120.95, 14.6], 2.9), port("chittagong", "Chittagong", "BGD", [91.8, 22.3], 0.4),
  port("djeddah", "Djeddah", "SAU", [39.15, 21.5], 1.6), port("le_havre", "Le Havre", "FRA", [0.1, 49.48], 1.5),
  port("valence", "Valence", "ESP", [-0.32, 39.45], 1.3), port("bombay", "Bombay (Nhava Sheva)", "IND", [72.95, 18.95], 1.2),
  port("istanbul", "Istanbul (Ambarli)", "TUR", [28.68, 40.97], 0.6), port("santos", "Santos", "BRA", [-46.3, -23.97], 1.0),
  port("durban", "Durban", "ZAF", [31.03, -29.87], 1.0), port("vancouver", "Vancouver", "CAN", [-123.1, 49.29], 1.2),
  port("ho_chi_minh", "Hô Chi Minh-Ville", "VNM", [106.75, 10.77], 0.8), port("panama", "Colón et Balboa", "PAN", [-79.9, 9.35], 0.9),
  port("novorossiisk", "Novorossiisk", "RUS", [37.8, 44.7], 0.2), port("lagos", "Lagos (Apapa)", "NGA", [3.37, 6.44], 0.3),
  port("mombasa", "Mombasa", "KEN", [39.65, -4.05], 0.2), port("alexandrie", "Alexandrie et Port-Saïd", "EGY", [29.9, 31.2], 0.9),
  port("sydney", "Sydney et Melbourne", "AUS", [144.9, -37.83], 1.6),
  port("karachi", "Karachi", "PAK", [66.98, 24.84], 0.7), port("bandar_abbas", "Bandar Abbas", "IRN", [56.2, 27.15], 0.6), port("san_antonio", "San Antonio et Valparaíso", "CHL", [-71.6, -33.58], 0.6), port("buenos_aires", "Buenos Aires", "ARG", [-58.37, -34.6], 0.7),
  // ---------- Aéroports (millions de passagers, estimation 2000) ----------
  aero("atlanta", "Atlanta", "USA", [-84.43, 33.64], 80), aero("chicago", "Chicago O'Hare", "USA", [-87.9, 41.98], 72),
  aero("los_angeles", "Los Angeles", "USA", [-118.41, 33.94], 68), aero("londres", "Londres Heathrow", "GBR", [-0.45, 51.47], 64),
  aero("tokyo", "Tokyo Haneda et Narita", "JPN", [139.78, 35.55], 83), aero("francfort", "Francfort", "DEU", [8.57, 50.04], 49),
  aero("paris", "Paris-Charles-de-Gaulle", "FRA", [2.55, 49.0], 48), aero("amsterdam", "Amsterdam Schiphol", "NLD", [4.76, 52.31], 39),
  aero("new_york", "New York JFK", "USA", [-73.78, 40.64], 32), aero("hong_kong", "Hong Kong", "CHN", [113.92, 22.31], 33),
  aero("seoul", "Séoul", "KOR", [126.45, 37.46], 36), aero("madrid", "Madrid", "ESP", [-3.57, 40.47], 33),
  aero("bangkok", "Bangkok", "THA", [100.75, 13.69], 29), aero("singapour", "Singapour Changi", "SGP", [103.99, 1.36], 28),
  aero("toronto", "Toronto", "CAN", [-79.63, 43.68], 28), aero("rome", "Rome Fiumicino", "ITA", [12.25, 41.8], 26),
  aero("sydney", "Sydney", "AUS", [151.18, -33.94], 25), aero("pekin", "Pékin", "CHN", [116.6, 40.08], 22),
  aero("mexico", "Mexico", "MEX", [-99.07, 19.44], 21), aero("djakarta", "Djakarta", "IDN", [106.65, -6.13], 10),
  aero("shanghai", "Shanghai", "CHN", [121.8, 31.15], 12), aero("dubai", "Dubaï", "ARE", [55.36, 25.25], 12),
  aero("johannesburg", "Johannesburg", "ZAF", [28.24, -26.13], 12), aero("moscou", "Moscou", "RUS", [37.41, 55.97], 12),
  aero("sao_paulo", "São Paulo", "BRA", [-46.47, -23.43], 13), aero("delhi", "Delhi et Bombay", "IND", [77.1, 28.56], 9),
  aero("istanbul", "Istanbul", "TUR", [28.81, 40.98], 14), aero("le_caire", "Le Caire", "EGY", [31.4, 30.12], 8),
  aero("riyad", "Riyad et Djeddah", "SAU", [46.7, 24.96], 10), aero("nairobi", "Nairobi", "KEN", [36.93, -1.32], 3),
  aero("lagos", "Lagos", "NGA", [3.32, 6.58], 4), aero("bogota", "Bogota", "COL", [-74.15, 4.7], 7),
];
export const hubsDe = (iso: string) => HUBS.filter(h => h.iso === iso);
