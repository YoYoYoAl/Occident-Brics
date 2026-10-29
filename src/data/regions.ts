// Régions des 30 pays clés (estimation) : part de la population, ressources (biens du commerce), valeur stratégique 0-3, base notable.
// Les autres pays ne sont découpés qu'en cas de guerre (decoupageGenerique) : région de la capitale, nord, sud.
import type { Bien } from "./commerce";
export interface Region { id: string; nom: string; pop: number; ressources: Bien[]; strat: number; base?: string }
const r = (id: string, nom: string, pop: number, ressources: Bien[], strat: number, base?: string): Region => ({ id, nom, pop, ressources, strat, ...(base ? { base } : {}) });

export const REGIONS_CLES: Record<string, Region[]> = {
  UKR: [r("kiev", "Kiev et le centre", 0.35, ["industrie", "alimentation"], 2), r("donbass", "Est et Donbass", 0.25, ["metaux", "energie"], 3),
    r("sud", "Sud, Crimée et littoral", 0.15, ["alimentation"], 3, "Sébastopol (flotte de la mer Noire)"), r("ouest", "Ouest et Galicie", 0.25, ["alimentation"], 1)],
  GEO: [r("tbilissi", "Tbilissi et Kartlie", 0.6, ["industrie"], 2), r("ouest", "Ouest et Adjarie", 0.3, ["alimentation"], 1, "port de Batoumi"), r("separatistes", "Abkhazie et Ossétie du Sud", 0.1, [], 2)],
  TWN: [r("nord", "Nord et Taipei", 0.45, ["industrie"], 3), r("centre", "Centre et Taichung", 0.25, ["industrie"], 2), r("sud", "Sud et Kaohsiung", 0.3, ["industrie"], 2, "port de Kaohsiung")],
  KOR: [r("seoul", "Séoul et Gyeonggi", 0.5, ["industrie"], 3, "Osan et Humphreys (forces américaines)"), r("sudest", "Sud-Est et Busan", 0.3, ["industrie"], 2), r("sudouest", "Sud-Ouest et Jeolla", 0.2, ["alimentation"], 1)],
  PRK: [r("pyongyang", "Pyongyang et l'Ouest", 0.4, ["industrie"], 3), r("nordest", "Nord-Est et Hamgyong", 0.35, ["metaux"], 2), r("frontiere", "Zone frontalière du Sud", 0.25, ["alimentation"], 2)],
  VNM: [r("nord", "Nord et Hanoï", 0.4, ["industrie"], 2), r("centre", "Centre et Da Nang", 0.2, ["alimentation"], 2, "baie de Cam Ranh"), r("sud", "Sud, Hô Chi Minh-Ville et Mékong", 0.4, ["alimentation", "industrie", "energie"], 2)],
  PHL: [r("lucon", "Luçon et Manille", 0.55, ["industrie"], 3, "baie de Subic"), r("visayas", "Visayas", 0.2, ["alimentation"], 1), r("mindanao", "Mindanao", 0.25, ["alimentation", "metaux"], 2)],
  IDN: [r("java", "Java", 0.57, ["industrie", "alimentation"], 3), r("sumatra", "Sumatra", 0.22, ["energie", "alimentation"], 2), r("kalimantan", "Kalimantan", 0.06, ["energie", "metaux"], 1), r("est", "Sulawesi, Moluques et Papouasie", 0.15, ["metaux"], 1)],
  MMR: [r("plaine", "Plaine centrale, Yangon et Mandalay", 0.65, ["alimentation"], 2), r("arakan", "Arakan", 0.07, ["energie"], 2, "port de Kyaukphyu"), r("peripherie", "États shan et kachin", 0.28, ["metaux"], 1)],
  AFG: [r("kaboul", "Kaboul et l'Est", 0.4, [], 3, "base aérienne de Bagram"), r("sud", "Kandahar et Helmand", 0.25, ["alimentation"], 2), r("nord", "Nord et Mazar-e Charif", 0.25, ["energie"], 1), r("ouest", "Ouest et Hérat", 0.1, [], 1)],
  IRQ: [r("bagdad", "Bagdad et le centre", 0.4, ["industrie"], 3), r("bassora", "Sud et Bassora", 0.3, ["energie"], 3), r("kurdistan", "Kurdistan et Nord", 0.3, ["energie"], 2)],
  IRN: [r("teheran", "Téhéran et le Nord", 0.45, ["industrie"], 3), r("golfe", "Khouzistan et littoral du Golfe", 0.15, ["energie"], 3, "Bandar Abbas (détroit d'Ormuz)"), r("ouest", "Azerbaïdjan iranien et Ouest", 0.25, ["alimentation"], 1), r("est", "Khorassan et Est", 0.15, [], 1)],
  SYR: [r("damas", "Damas et le Sud", 0.4, [], 3), r("cote", "Côte, Lattaquié et Tartous", 0.15, [], 2, "Tartous et Hmeimim (Russie)"), r("alep", "Nord et Alep", 0.3, ["industrie", "alimentation"], 2), r("euphrate", "Est et vallée de l'Euphrate", 0.15, ["energie", "alimentation"], 2)],
  LBN: [r("beyrouth", "Beyrouth et Mont-Liban", 0.55, [], 2), r("sud", "Sud-Liban", 0.25, [], 2), r("bekaa", "Bekaa", 0.2, ["alimentation"], 1)],
  YEM: [r("sanaa", "Sanaa et le Nord", 0.55, [], 2), r("aden", "Aden et le Sud", 0.3, [], 3, "détroit de Bab el-Mandeb"), r("hadramaout", "Hadramaout et l'Est", 0.15, ["energie"], 1)],
  SAU: [r("riyad", "Riyad et Nadjd", 0.35, [], 2), r("est", "Province orientale", 0.2, ["energie"], 3, "Dhahran"), r("hedjaz", "Hedjaz, La Mecque et Djeddah", 0.35, [], 2), r("sud", "Asir et Sud", 0.1, [], 1)],
  LBY: [r("tripolitaine", "Tripolitaine", 0.6, ["energie"], 2), r("cyrenaique", "Cyrénaïque", 0.3, ["energie"], 2), r("fezzan", "Fezzan", 0.1, ["energie"], 1)],
  EGY: [r("caire", "Le Caire et le delta", 0.65, ["industrie", "alimentation"], 3), r("suez", "Canal de Suez et Sinaï", 0.08, ["energie"], 3), r("haute", "Haute-Égypte", 0.27, ["alimentation"], 1)],
  TUR: [r("marmara", "Marmara et Istanbul", 0.3, ["industrie"], 3, "détroits du Bosphore"), r("anatolie", "Anatolie centrale et Ankara", 0.25, ["industrie"], 2),
    r("egee", "Égée et Méditerranée", 0.25, ["alimentation"], 2, "base d'Incirlik"), r("est", "Est et Sud-Est", 0.2, ["energie"], 2)],
  SDN: [r("khartoum", "Khartoum et la vallée du Nil", 0.5, ["alimentation"], 2), r("darfour", "Darfour", 0.2, [], 1), r("kordofan", "Kordofan et Sud", 0.2, ["energie"], 2), r("est", "Est et Port-Soudan", 0.1, [], 2)],
  SOM: [r("mogadiscio", "Mogadiscio et le Sud", 0.5, [], 2), r("somaliland", "Somaliland", 0.3, [], 2, "port de Berbera"), r("puntland", "Puntland", 0.2, [], 1)],
  ETH: [r("addis", "Addis-Abeba et le centre", 0.45, ["industrie"], 2), r("nord", "Tigré et Amhara", 0.3, ["alimentation"], 2), r("sud", "Sud et Ogaden", 0.25, [], 1)],
  MLI: [r("bamako", "Bamako et le Sud", 0.7, ["alimentation", "metaux"], 2), r("centre", "Centre et Mopti", 0.2, ["alimentation"], 1), r("nord", "Nord et Azawad", 0.1, [], 2)],
  NGA: [r("lagos", "Lagos et le Sud-Ouest", 0.35, ["industrie"], 3), r("delta", "Delta du Niger", 0.25, ["energie"], 3), r("nord", "Nord", 0.4, ["alimentation"], 1)],
  COD: [r("kinshasa", "Kinshasa et l'Ouest", 0.35, [], 2), r("katanga", "Katanga (cobalt et cuivre)", 0.2, ["metaux"], 3), r("kivu", "Kivu et l'Est", 0.3, ["metaux"], 2), r("kasai", "Kasaï", 0.15, ["metaux"], 1)],
  VEN: [r("caracas", "Caracas et la côte", 0.5, ["industrie"], 2), r("zulia", "Zulia et Maracaibo", 0.2, ["energie"], 3), r("orenoque", "Orénoque et le Sud", 0.3, ["energie", "metaux"], 2)],
  COL: [r("andes", "Bogotá et les Andes", 0.6, ["industrie"], 2), r("caraibes", "Côte caraïbe", 0.2, ["energie"], 1), r("sud", "Pacifique et Sud amazonien", 0.2, ["alimentation"], 1)],
  CUB: [r("havane", "La Havane et l'Ouest", 0.4, [], 2), r("centre", "Centre", 0.3, ["alimentation"], 1), r("est", "Est et Santiago", 0.3, ["metaux"], 1, "Guantánamo (États-Unis)")],
  KAZ: [r("nord", "Nord et Astana", 0.35, ["alimentation"], 2), r("sud", "Sud et Almaty", 0.45, ["industrie"], 2), r("caspienne", "Ouest et Caspienne", 0.2, ["energie"], 3)],
  SRB: [r("belgrade", "Belgrade et Voïvodine", 0.5, ["alimentation", "industrie"], 2), r("centre", "Serbie centrale et du Sud", 0.35, [], 1), r("kosovo", "Kosovo", 0.15, ["metaux"], 2, "camp Bondsteel (États-Unis)")],
};
