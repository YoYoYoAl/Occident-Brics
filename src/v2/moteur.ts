// Refonte v2, moteur de la maquette d'une année (règles du 2 novembre 2026).
// Tous les coefficients sont des estimations à calibrer par simulation (cible IA contre IA : 45 % Chine, 10 % nul, 45 % USA).
import donnees from "../data/pays2000.json";
import scores from "../data/scores2000.json";
import { ALLIES_2000, SANCTIONNES_2000 } from "../data/geographie";
import { creerPartie } from "../moteur/partie";
import { femme } from "../moteur/pouvoir";
import { CARTES_ERE1 } from "../contenu/cartes";
import { HISTORIQUES_ERE1 } from "../contenu/historiques";
import { HISTORIQUES_ERE2 } from "../contenu/historiques2";
import { HISTORIQUES_RECENTS } from "../contenu/historiques3";
import { HISTORIQUES_COMPLEMENTS } from "../contenu/historiques4";
import { TRAITS_DIRIGEANT, type Dirigeant } from "../moteur/dirigeants";
import type { Carte } from "../moteur/types";
import { ZONES, ZONE_DE, ROUTES } from "./zones";
import { CARTES_ERE2 } from "../contenu/cartes2";
import { PROJECTIONS } from "../contenu/projections";
import * as RS from "./ressources";
import * as EV from "./evolution";
import * as MN from "./monnaie";
import { effetsEco } from "./evenements-eco";

export type Camp = "OCC" | "CHN";
export const autre = (c: Camp): Camp => (c === "OCC" ? "CHN" : "OCC");
export const LEADER: Record<Camp, string> = { OCC: "USA", CHN: "CHN" };
export const NOM_CAMP: Record<Camp, string> = { OCC: "Occident", CHN: "BRICS" };

// ---------- Échelles à 21 degrés (7 niveaux de 3 degrés), de −100 à +100 ----------
export const ATTITUDES = ["Haine", "Hostile", "Méfiance", "Neutre", "Coopération", "Amitié", "Alliance"];
export const ECONOMIES = ["Sanctions", "Boycott", "Protectionnisme", "Neutre", "Accords commerciaux", "Libre-échange", "Libre-échange et entraide"];
export const PAS_DEGRE = 200 / 21;
export const degre = (v: number) => Math.max(-10, Math.min(10, Math.round(v / PAS_DEGRE))); // −10 … +10
export const niveau = (v: number) => Math.max(0, Math.min(6, Math.floor((degre(v) + 10) / 3))); // 0 … 6 (Neutre = 3)
export const borne = (v: number, a = -100, b = 100) => Math.max(a, Math.min(b, v));
// Effet des niveaux d'attitude (tableau des règles) : coût des opérations du camp et risque d'être démasqué.
export const COUT_NIVEAU = [1.5, 1.3, 1.15, 1, 0.9, 0.8, 0.7];
export const RISQUE_NIVEAU = [15, 10, 5, 0, -5, -10, -15];
// Effet du fonctionnement économique sur le PIB, en % par an au maximum (dépendance 100 %).
export const PIB_NIVEAU = [-1.5, -1, -0.4, 0, 0.3, 0.6, 0.8];
// Part du poids d'un pays au décompte selon le niveau moyen (attitude + économie) : Coopération 40 %, Amitié 70 %, Alliance 100 %.
export const PART_DECOMPTE = [0, 0, 0, 0, 0.4, 0.7, 1];

// ---------- Opérations ----------
export type TypeOp = "influence" | "partenariat" | "developpement" | "infiltrer" | "gouvernement" | "saboter" | "reduire" | "eliminer" | "casusbelli" | "armee" | "exercice" | "armes" | "soutien" | "guerre";
export interface DefOp { id: TypeOp; nom: string; cat: "dev" | "secret" | "mil"; cible: "zone" | "pays" | "soi"; risque: number; icone: string; aide: string; min?: number }
export const OPERATIONS: DefOp[] = [
  { id: "influence", nom: "Développer l'influence", cat: "dev", cible: "zone", risque: 0, icone: "📣", aide: "Fait monter l'attitude des pays de la zone envers ton camp (poids : population et stabilité)." },
  { id: "partenariat", nom: "Partenariat économique", cat: "dev", cible: "zone", risque: 0, icone: "🤝", aide: "Fait monter le fonctionnement économique avec ton camp (poids : PIB et ressources ; priorité aux pays qui ont ce qui manque à ton camp). Améliore ton contrôle des routes et ton accès aux ressources." },
  { id: "developpement", nom: "Développement du pays", cat: "dev", cible: "zone", risque: 0, icone: "🏗", aide: "1/3 économie (PIB), 1/3 militaire, 1/3 ressources (industrie et production). Chez un autre pays, il gagne aussi de l'attitude envers toi." },
  { id: "infiltrer", nom: "Infiltrer le gouvernement", cat: "secret", cible: "pays", risque: 15, icone: "🕵", aide: "Bonus d'influence politique dans le pays ; révèle les points adverses de la zone." },
  { id: "gouvernement", nom: "Influencer le gouvernement", cat: "secret", cible: "pays", risque: 20, icone: "🗳", aide: "Pousse le gouvernement vers ton camp, jusqu'au coup d'État." },
  { id: "saboter", nom: "Saboter", cat: "secret", cible: "pays", risque: 25, icone: "💣", aide: "Réduit le PIB et la stabilité du pays, et abîme sa principale production (énergie, métaux…)." },
  { id: "reduire", nom: "Réduire l'influence adverse", cat: "secret", cible: "pays", risque: 20, icone: "✂", aide: "Retire de l'attitude et de l'économie envers le camp adverse : il perd du contrôle sur les routes et de l'accès aux ressources." },
  { id: "eliminer", nom: "Éliminer des points adverses", cat: "secret", cible: "pays", risque: 30, icone: "🎯", aide: "Déclenche la traque : tes équipes cherchent les points adverses dans la zone.", min: 2 },
  { id: "casusbelli", nom: "Fabriquer un casus belli", cat: "secret", cible: "pays", risque: 25, icone: "📜", aide: "Donne un casus belli contre le pays après 1 an. Fait monter la tension mondiale." },
  { id: "armee", nom: "Améliorer l'armée", cat: "mil", cible: "soi", risque: 0, icone: "🛡", aide: "Puissance militaire de ton pays leader. Financé en partie par la dette (+0,3 point par point engagé)." },
  { id: "exercice", nom: "Exercice conjoint", cat: "mil", cible: "zone", risque: 0, icone: "⚓", aide: "Rapproche tes amis et alliés de la zone ; les pays hostiles se méfient davantage et la tension monte un peu." },
  { id: "armes", nom: "Vente d'armes", cat: "mil", cible: "pays", risque: 0, icone: "🚀", aide: "Budget gagné et attitude du client ; renforce son armée." },
  { id: "soutien", nom: "Soutien dans un conflit", cat: "mil", cible: "pays", risque: 0, icone: "🎖", aide: "Ajoute du score de guerre au camp soutenu." },
  { id: "guerre", nom: "Déclarer la guerre", cat: "mil", cible: "pays", risque: 0, icone: "⚔", aide: "Ouvre une phase de conflit annuelle. Au moins 5 points et un casus belli.", min: 5 },
];
export const op = (id: TypeOp) => OPERATIONS.find(o => o.id === id)!;
// Étalement d'un point sur 3 ans : 50 %, 30 %, 20 % (part immédiate et part long terme).
export const ETALEMENT = [0.5, 0.3, 0.2];
// Effet d'un point sur une année pleine (100 %), en points d'échelle (−100…100) : estimation à calibrer.
export const EFFET = { influence: 12, partenariat: 12, devAttitude: 4, devPib: 0.15, infiltrer: 8, gouvernement: 10, saboterPib: 0.2, saboterStab: 2, reduireAtt: 8, reduireEco: 6, armee: 1.5, exercice: 4, exerciceHostile: 2, armesAtt: 6, armesBudget: 0.5,
  // liens avec ressources, routes, dette et tension (2 novembre 2026, estimation)
  devMil: 1, devRes: 3, saboterRes: 4, armeeDette: 0.3, casusTension: 0.3, exerciceTension: 0.1, partenariatManque: 1.5 };
export const BOOST = { parUnite: 0.1, max: 3 }; // +10 % par unité de budget, jusqu'à +30 %

// ---------- État ----------
export interface PaysV2 {
  iso: string; nom: string; zone: string; idCarte: string;
  population: number; pib: number; militaire: number; ressources: number; route: boolean; poids: number;
  att: Record<Camp, number>; eco: Record<Camp, number>; stabilite: number;
  infiltre: Record<Camp, boolean>; casusBelli: Record<Camp, number>; // année où le casus belli devient utilisable (0 = aucun)
}
export interface Operation { id: number; camp: Camp; type: TypeOp; zone: string; pays?: string; points: number; boost: number; annee: number; demasquee?: boolean; revelee?: boolean }
export interface CarteMain { carte: Carte; source: "propre" | "adverse" | "neutre"; points: number; ecartee: boolean }
export interface Conseiller { id: string; nom: string; domaine: Domaine; portrait: string; femme: boolean; bonus: Modificateur; malus: Modificateur }
export type Domaine = "international" | "interieur" | "economie" | "defense" | "renseignement";
export interface Modificateur { texte: string; effet?: Partial<Record<"dev" | "secret" | "mil" | "influence" | "partenariat", number>>; points?: number; risque?: number; budget?: number; stabilite?: number }
export interface EvenementAnnee { id: string; trimestre: number; titre: string; texte: string; pays: string[]; image?: string; resume: string }
export interface Ligne { texte: string; camp?: Camp; zone?: string; pays?: string; signe?: 1 | -1 }
export interface EtatV2 {
  graine: number; alea: number; annee: number; joueur: Camp;
  pays: Record<string, PaysV2>; ops: Operation[]; prochainId: number;
  main: Record<Camp, CarteMain[]>; points: Record<Camp, number>; budget: Record<Camp, number>; boostsUtilises: Record<Camp, number>;
  militaire: Record<Camp, number>; tension: number; jauge: number;
  dirigeants: Record<Camp, Dirigeant>; candidats: Record<Camp, Record<Domaine, Conseiller[]>>; cabinet: Record<Camp, Partial<Record<Domaine, Conseiller>>>;
  evenements: EvenementAnnee[]; journal: Ligne[]; imagesPrises: string[]; resolues?: number; decomptes?: Decompte[]; fin?: boolean; decompteDepart?: { OCC: number; CHN: number }; res?: RS.EtatRessources; pibDebutAnnee?: Record<string, number>; stabiliteDepart?: Record<string, number>; ressourcesDepart?: Record<string, number>; partEcoDepart?: Record<Camp, number>; revenu?: Record<Camp, number>; monnaie?: MN.EtatMonnaie; blocages?: { route: string; annee: number }[]; relationsDepart?: Record<string, { att: Record<Camp, number>; eco: Record<Camp, number> }>; depart?: Record<string, { att: Record<Camp, number>; eco: Record<Camp, number> }>;
}

// Générateur pseudo-aléatoire de la partie (mulberry32) ; le code cosmétique de l'interface ne l'utilise jamais.
export function tirer(e: EtatV2): number {
  let t = (e.alea = (e.alea + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const melanger = <T>(e: EtatV2, l: T[]) => { const r = l.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(tirer(e) * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

const moy = (l: number[]) => l.reduce((a, b) => a + b, 0) / l.length;
const SC = (scores as any).pays as Record<string, { scores: Record<string, number> }>;
const militaireDe = (iso: string) => { const s = SC[iso]?.scores ?? {}; return moy(["Terrestre", "Naval", "Aérien", "Cyber", "Nucléaire"].map(k => s[k] ?? 0)); };
const ressourcesDe = (iso: string) => { const s = SC[iso]?.scores ?? {}; return moy(["Énergie", "Agriculture", "Métaux", "Terres rares"].map(k => s[k] ?? 0)); };
const SUR_ROUTE = new Set(ROUTES.flatMap(r => r.pays));

// Relations de départ (estimation) tirées de l'influence 2000 du moteur actuel, puis corrigées par les alliances et sanctions connues.
export function attitudeDepart(inf: { e: number; p: number; m: number; c: number }) { return borne(1.4 * (0.4 * inf.p + 0.3 * inf.c + 0.3 * inf.m) + 0.3 * inf.e - 25); }
export function economieDepart(inf: { e: number }) { return borne(1.2 * inf.e - 20, -100, 40); }

export function creerPartieV2(graine: number, joueur: Camp): EtatV2 {
  const ancien = creerPartie(graine, joueur as any, {} as any) as any;
  const pays: Record<string, PaysV2> = {};
  const liste = (donnees as any).pays as { iso3: string; idCarte: string; nom: string; indicateurs: Record<string, number> }[];
  for (const p of liste) {
    const a = ancien.pays[p.iso3];
    pays[p.iso3] = {
      iso: p.iso3, nom: p.nom, zone: ZONE_DE[p.iso3], idCarte: String(p.idCarte), population: a.population, pib: a.pib,
      militaire: militaireDe(p.iso3), ressources: ressourcesDe(p.iso3), route: SUR_ROUTE.has(p.iso3), poids: 0,
      att: { OCC: attitudeDepart(a.influence.OCC), CHN: attitudeDepart(a.influence.CHN) },
      eco: { OCC: economieDepart(a.influence.OCC), CHN: economieDepart(a.influence.CHN) },
      stabilite: a.stabilite, infiltre: { OCC: false, CHN: false }, casusBelli: { OCC: 0, CHN: 0 },
    };
  }
  for (const c of ["OCC", "CHN"] as Camp[]) for (const iso of ALLIES_2000[c]) if (pays[iso]) { pays[iso].att[c] = Math.max(pays[iso].att[c], 75); pays[iso].eco[c] = Math.max(pays[iso].eco[c], 30); }
  for (const iso of SANCTIONNES_2000) if (pays[iso]) { pays[iso].att.OCC = Math.min(pays[iso].att.OCC, -50); pays[iso].eco.OCC = -90; }
  // Les deux leaders : pleine adhésion à leur camp ; méfiance réciproque en 2000 (estimation).
  for (const c of ["OCC", "CHN"] as Camp[]) { const l = pays[LEADER[c]]; l.att[c] = 100; l.eco[c] = 100; l.att[autre(c)] = -22; l.eco[autre(c)] = 20; }
  calculerPoids(pays);
  const e: EtatV2 = {
    graine, alea: graine * 7919 + 17, annee: 2000, joueur, pays, ops: [], prochainId: 1,
    main: { OCC: [], CHN: [] }, points: { OCC: 0, CHN: 0 }, budget: { OCC: 6, CHN: 5 }, boostsUtilises: { OCC: 0, CHN: 0 },
    militaire: { OCC: pays.USA.militaire, CHN: pays.CHN.militaire }, tension: 2, jauge: 0,
    dirigeants: ancien.dirigeants, candidats: { OCC: {} as any, CHN: {} as any }, cabinet: { OCC: {}, CHN: {} },
    evenements: [], journal: [], imagesPrises: [],
  };
  for (const c of ["OCC", "CHN"] as Camp[]) { const d = e.dirigeants[c], p = choisirChef(c, d, e.imagesPrises); if (p) d.illustre = p; else delete d.illustre; }
  for (const d of Object.values(e.dirigeants)) if (d.illustre) e.imagesPrises.push(d.illustre);
  for (const c of ["OCC", "CHN"] as Camp[]) e.candidats[c] = tirerCandidats(e, c);
  RS.initialiser(e);
  e.relationsDepart = Object.fromEntries(Object.values(pays).map(p => [p.iso, { att: { ...p.att }, eco: { ...p.eco } }]));
  e.stabiliteDepart = Object.fromEntries(Object.values(pays).map(p => [p.iso, p.stabilite]));
  e.ressourcesDepart = Object.fromEntries(Object.values(pays).map(p => [p.iso, p.ressources]));
  e.pibDebutAnnee = Object.fromEntries(Object.values(pays).map(p => [p.iso, p.pib]));
  e.partEcoDepart = { OCC: partEco(e, "OCC"), CHN: partEco(e, "CHN") }; e.revenu = { ...REVENU };
  MN.initialiser(e);
  e.resolues = 0; { const d = decompte(e); e.decompteDepart = { OCC: d.OCC, CHN: d.CHN }; }
  e.depart = Object.fromEntries(Object.values(pays).map(p => [p.iso, { att: { ...p.att }, eco: { ...p.eco } }]));
  return e;
}

// Poids d'un pays (total mondial = 100) : 40 % PIB, 20 % population, 15 % militaire, 15 % ressources, 10 % position sur une route.
export function calculerPoids(pays: Record<string, PaysV2>) {
  const l = Object.values(pays), s = (f: (p: PaysV2) => number) => l.reduce((a, p) => a + f(p), 0);
  const tP = s(p => p.pib), tPop = s(p => p.population), tM = s(p => p.militaire), tR = s(p => p.ressources), tRoute = s(p => (p.route ? 1 : 0));
  for (const p of l) p.poids = 100 * (0.4 * p.pib / tP + 0.2 * p.population / tPop + 0.15 * p.militaire / tM + 0.15 * p.ressources / tR + 0.1 * (p.route ? 1 : 0) / tRoute);
}

// ---------- Conseillers (5 domaines, 3 candidats chacun) ----------
export const DOMAINES: { id: Domaine; nom: string; aide: string }[] = [
  { id: "international", nom: "Affaires internationales", aide: "influence et partenariats" },
  { id: "interieur", nom: "Affaires intérieures", aide: "développement et stabilité" },
  { id: "economie", nom: "Économie et finances", aide: "budget et boosts" },
  { id: "defense", nom: "Défense", aide: "opérations militaires et guerre" },
  { id: "renseignement", nom: "Renseignement", aide: "opérations secrètes, discrétion, traque" },
];
// Chaque profil : 1 bonus et 1 malus de son domaine ; chaque bonus vaut au plus 5 % ou 1 point (règle « bonus, pas décisifs »).
const PROFILS: Record<Domaine, [Modificateur, Modificateur][]> = {
  international: [
    [{ texte: "+5 % d'effet en influence", effet: { influence: 0.05 } }, { texte: "−5 % d'effet en partenariat", effet: { partenariat: -0.05 } }],
    [{ texte: "+1 point d'opération par an", points: 1 }, { texte: "+5 de risque d'être démasqué", risque: 5 }],
    [{ texte: "+5 % d'effet en partenariat", effet: { partenariat: 0.05 } }, { texte: "−5 % d'effet militaire", effet: { mil: -0.05 } }],
    [{ texte: "+5 % d'effet en influence", effet: { influence: 0.05 } }, { texte: "−1 unité de budget par an", budget: -1 }],
  ],
  interieur: [
    [{ texte: "+5 % d'effet en développement", effet: { dev: 0.05 } }, { texte: "−5 % d'effet en influence", effet: { influence: -0.05 } }],
    [{ texte: "+2 de stabilité chez toi", stabilite: 2 }, { texte: "−5 % d'effet en développement", effet: { dev: -0.05 } }],
    [{ texte: "+1 point d'opération par an", points: 1 }, { texte: "−2 de stabilité chez toi", stabilite: -2 }],
    [{ texte: "+5 % d'effet en développement", effet: { dev: 0.05 } }, { texte: "−1 unité de budget par an", budget: -1 }],
  ],
  economie: [
    [{ texte: "+1 unité de budget par an", budget: 1 }, { texte: "−5 % d'effet en influence", effet: { influence: -0.05 } }],
    [{ texte: "+5 % d'effet en partenariat", effet: { partenariat: 0.05 } }, { texte: "−5 % d'effet en développement", effet: { dev: -0.05 } }],
    [{ texte: "+1 unité de budget par an", budget: 1 }, { texte: "−2 de stabilité chez toi", stabilite: -2 }],
    [{ texte: "+5 % d'effet en partenariat", effet: { partenariat: 0.05 } }, { texte: "+5 de risque d'être démasqué", risque: 5 }],
  ],
  defense: [
    [{ texte: "+5 % d'effet militaire", effet: { mil: 0.05 } }, { texte: "−5 % d'effet en influence", effet: { influence: -0.05 } }],
    [{ texte: "+1 point d'opération par an", points: 1 }, { texte: "−1 unité de budget par an", budget: -1 }],
    [{ texte: "+5 % d'effet militaire", effet: { mil: 0.05 } }, { texte: "−5 % d'effet en partenariat", effet: { partenariat: -0.05 } }],
    [{ texte: "+5 % d'effet militaire", effet: { mil: 0.05 } }, { texte: "+5 de risque d'être démasqué", risque: 5 }],
  ],
  renseignement: [
    [{ texte: "−5 de risque d'être démasqué", risque: -5 }, { texte: "−5 % d'effet secret", effet: { secret: -0.05 } }],
    [{ texte: "+5 % d'effet secret", effet: { secret: 0.05 } }, { texte: "+5 de risque d'être démasqué", risque: 5 }],
    [{ texte: "−5 de risque d'être démasqué", risque: -5 }, { texte: "−1 unité de budget par an", budget: -1 }],
    [{ texte: "+5 % d'effet secret", effet: { secret: 0.05 } }, { texte: "−5 % d'effet en développement", effet: { dev: -0.05 } }],
  ],
};
// Portraits disponibles par domaine (noms de fichiers sans extension). Remplacés par le lot ob_11 dès qu'il est intégré.
export const PORTRAITS: Record<Camp, Record<Domaine, { nom: string; femme: boolean }[]>> = { OCC: {} as any, CHN: {} as any };
// Portraits de dirigeants (lot ob_11, revus : sans faux texte ni ressemblance avec un dirigeant réel).
// Choix sans aléa : un portrait de son trait et de son genre d'abord, sinon un autre portrait libre du même genre.
const CHEFS: { nom: string; camp: Camp; trait: string; femme: boolean }[] = [];
export function enregistrerChefs(liste: { nom: string; femme: boolean }[]) {
  CHEFS.length = 0;
  for (const p of liste) { const [, c, t] = p.nom.split("_"); CHEFS.push({ nom: p.nom, camp: c.toUpperCase() as Camp, trait: t, femme: p.femme }); }
}
export function choisirChef(c: Camp, d: Dirigeant, pris: string[]): string | undefined {
  const f = femme(c, d.nom), libres = CHEFS.filter(p => p.camp === c && p.femme === f && !pris.includes(p.nom));
  return (d.traits.map(t => libres.find(p => p.trait === t)).find(Boolean) ?? libres[0])?.nom;
}
export function enregistrerPortraits(liste: { nom: string; femme: boolean }[]) {
  for (const c of ["OCC", "CHN"] as Camp[]) for (const d of DOMAINES) PORTRAITS[c][d.id] = liste.filter(p => p.nom.startsWith(`conseiller2_${c.toLowerCase()}_${d.id}_`));
}
const PRENOMS = {
  OCC: { h: ["Adam", "Victor", "Samuel", "Elliot", "Marcus", "Julian", "Owen", "Felix", "Lucas", "Martin", "Hugo", "Oscar", "Nathan", "Simon", "Arthur", "Leon", "Theo", "Patrick", "Gregory", "Isaac"],
    f: ["Claire", "Nora", "Alice", "Vera", "Iris", "Lena", "Julia", "Sophie", "Emma", "Anna", "Rose", "Hannah", "Clara", "Eva", "Lucy", "Grace", "Ingrid", "Paula", "Marion", "Elena"] },
  CHN: { h: ["Jun", "Wei", "Hao", "Bo", "Gang", "Lei", "Peng", "Tao", "Yong", "Qiang", "Bin", "Kai", "Long", "Ming", "Jie", "Xin", "Cheng", "Feng", "Hui", "Rong"],
    f: ["Mei", "Lan", "Jing", "Yan", "Hong", "Xia", "Fang", "Ling", "Qing", "Yun", "Hua", "Juan", "Na", "Ping", "Rui", "Shu", "Ting", "Wen", "Xiu", "Ying"] },
};
const NOMS = {
  OCC: ["Abbott", "Barrow", "Caldwell", "Dunmore", "Ellery", "Fairfax", "Graves", "Halloran", "Ingram", "Jessop", "Kendrick", "Lockwood", "Mercer", "Norwood", "Oakley", "Pembroke", "Quayle", "Radford", "Sterling", "Tolliver", "Upton", "Vance", "Wexler", "Yardley", "Ziegler", "Moreau", "Lindqvist", "Okafor", "Reyes", "Novak"],
  CHN: ["Ma", "Hu", "Lin", "Luo", "Zheng", "Liang", "Xie", "Song", "Tang", "Han", "Feng", "Deng", "Cao", "Peng", "Zeng", "Xiao", "Tian", "Dong", "Pan", "Yuan", "Cai", "Jiang", "Yu", "Du", "Ye", "Cheng", "Wei", "Su", "Lu", "Ding"],
};
export function nomUniqueV2(e: EtatV2, camp: Camp, femme: boolean, pris: Set<string>): string {
  for (let i = 0; i < 400; i++) {
    const p = PRENOMS[camp][femme ? "f" : "h"], n = NOMS[camp];
    const nom = camp === "CHN" ? `${n[Math.floor(tirer(e) * n.length)]} ${p[Math.floor(tirer(e) * p.length)]}` : `${p[Math.floor(tirer(e) * p.length)]} ${n[Math.floor(tirer(e) * n.length)]}`;
    const famille = camp === "CHN" ? nom.split(" ")[0] : nom.split(" ").slice(-1)[0];
    if (!pris.has(nom) && (i > 200 || !pris.has("§" + famille))) { pris.add(nom); pris.add("§" + famille); return nom; } // nom de famille unique aussi, tant que possible
  }
  throw new Error("plus de noms disponibles");
}
function tirerCandidats(e: EtatV2, camp: Camp): Record<Domaine, Conseiller[]> {
  const pris = new Set<string>([e.dirigeants.OCC.nom, e.dirigeants.CHN.nom]);
  const r = {} as Record<Domaine, Conseiller[]>;
  for (const d of DOMAINES) {
    const profils = melanger(e, PROFILS[d.id]).slice(0, 3);
    const portraits = melanger(e, (PORTRAITS[camp][d.id] ?? []).filter(p => !e.imagesPrises.includes(p.nom)));
    r[d.id] = profils.map((pr, i) => {
      const por = portraits[i];
      const femme = por ? por.femme : tirer(e) < 0.4;
      if (por) e.imagesPrises.push(por.nom); // jamais deux fois le même portrait dans une partie
      return { id: `${camp}_${d.id}_${i}`, nom: nomUniqueV2(e, camp, femme, pris), domaine: d.id, portrait: por?.nom ?? "", femme, bonus: pr[0], malus: pr[1] };
    });
  }
  return r;
}
export function nommerConseiller(e: EtatV2, camp: Camp, c: Conseiller) { e.cabinet[camp][c.domaine] = c; }
// Choix de l'IA : le profil dont le bonus est le plus utile (points, puis budget, puis le reste).
export function cabinetIA(e: EtatV2, camp: Camp) {
  for (const d of DOMAINES) if (!e.cabinet[camp][d.id]) {
    const note = (c: Conseiller) => (c.bonus.points ?? 0) * 3 + (c.bonus.budget ?? 0) * 2 + 1 - (c.malus.points ?? 0) * 3 - (c.malus.budget ?? 0) * 2;
    e.cabinet[camp][d.id] = e.candidats[camp][d.id].slice().sort((a, b) => note(b) - note(a))[0];
  }
}
const mods = (e: EtatV2, camp: Camp) => Object.values(e.cabinet[camp]).flatMap(c => (c ? [c.bonus, c.malus] : []));
// Somme dirigeant + conseillers plafonnée à ±15 % par caractéristique et à −1…+2 points d'opération par an.
export function multEffet(e: EtatV2, camp: Camp, cle: "dev" | "secret" | "mil" | "influence" | "partenariat") {
  return 1 + borne(mods(e, camp).reduce((s, m) => s + (m.effet?.[cle] ?? 0), 0), -0.15, 0.15);
}
export function bonusPoints(e: EtatV2, camp: Camp) {
  const d = e.dirigeants[camp], dip = d?.aptitudes?.diplomatie ?? 6;
  return borne(mods(e, camp).reduce((s, m) => s + (m.points ?? 0), 0) + (dip >= 8 ? 1 : dip <= 3 ? -1 : 0), -1, 2);
}
export const bonusRisque = (e: EtatV2, camp: Camp) => mods(e, camp).reduce((s, m) => s + (m.risque ?? 0), 0) - 2 * ((e.dirigeants[camp]?.aptitudes?.intrigue ?? 6) - 6);
export const bonusBudget = (e: EtatV2, camp: Camp) => mods(e, camp).reduce((s, m) => s + (m.budget ?? 0), 0);

// ---------- Effets génériques (cartes et événements du moteur actuel convertis en échelles v2) ----------
const ISO = () => Object.keys(ZONE_DE);
function resoudrePays(e: EtatV2, cible: unknown, beneficiaire: Camp): string[] {
  if (cible === "tous") return ISO();
  if (Array.isArray(cible)) return cible.filter(i => e.pays[i]);
  if (typeof cible === "string" && e.pays[cible]) return [cible];
  // « $pays » : le pays le plus lourd parmi ceux où le camp bénéficiaire a encore de la marge (tirage parmi les 5 premiers).
  const hors = Object.values(e.pays).filter(p => p.iso !== LEADER.OCC && p.iso !== LEADER.CHN);
  let l = hors.filter(p => Math.abs(p.att[beneficiaire]) < 45);
  if (!l.length) l = hors; // plus aucun pays avec de la marge (partie longue) : on reprend tous les pays
  l = l.sort((a, b) => b.poids - a.poids).slice(0, 5);
  return [l[Math.floor(tirer(e) * l.length)].iso];
}
export function appliquerEffets(e: EtatV2, effets: any[], campJ: Camp, source: string): Ligne[] {
  const lignes: Ligne[] = [];
  for (const f of effets) {
    const campCible: Camp = f.camp === "$adversaire" ? autre(campJ) : f.camp === "$joueur" || !f.camp ? campJ : f.camp;
    if (f.type === "influence") {
      const l = resoudrePays(e, f.pays, campCible), k = f.canal === "e" ? "eco" : "att", v = f.valeur * 1.5;
      for (const iso of l) e.pays[iso][k][campCible] = borne(e.pays[iso][k][campCible] + v);
      if (l.length <= 3) for (const iso of l) lignes.push({ texte: `${e.pays[iso].nom} : ${k === "eco" ? "économie" : "attitude"} envers ${NOM_CAMP[campCible]} ${v > 0 ? "+" : ""}${v.toFixed(1)}`, camp: campCible, pays: iso, signe: v > 0 ? 1 : -1 });
      else lignes.push({ texte: `${l.length} pays : ${k === "eco" ? "économie" : "attitude"} envers ${NOM_CAMP[campCible]} ${v > 0 ? "+" : ""}${v.toFixed(1)}`, camp: campCible, signe: v > 0 ? 1 : -1 });
    } else if (f.type === "stabilite") {
      const l = resoudrePays(e, f.pays, campJ);
      for (const iso of l) e.pays[iso].stabilite = borne(e.pays[iso].stabilite + f.valeur, 0, 100);
      lignes.push({ texte: `Stabilité ${l.map(i => e.pays[i].nom).join(", ")} ${f.valeur > 0 ? "+" : ""}${f.valeur}`, pays: l[0], signe: f.valeur > 0 ? 1 : -1 });
    } else if (f.type === "croissance") {
      const l = resoudrePays(e, f.pays, campJ), pct = f.points * Math.min(4, f.duree ?? 4) / 4;
      for (const iso of l) e.pays[iso].pib *= 1 + pct / 100;
      lignes.push({ texte: `PIB ${l.length > 3 ? l.length + " pays" : l.map(i => e.pays[i].nom).join(", ")} ${pct > 0 ? "+" : ""}${pct.toFixed(2)} %`, pays: l[0], signe: pct > 0 ? 1 : -1 });
    } else if (f.type === "tension") {
      const v = f.valeur / 4; // échelle v2 : tension 0-10, qui retombe de 40 % par an (évolution.ts)
      e.tension = borne(e.tension + v, 0, 10);
      lignes.push({ texte: `Tension mondiale ${v > 0 ? "+" : ""}${v.toFixed(1)}`, signe: v > 0 ? -1 : 1 });
    } else if (f.type === "coupure") {
      lignes.push(...(f.fournisseur ? RS.couperPar(e, f.fournisseur, f.bien, f.camp) : RS.chantageCarte(e, campJ, f.bien)));
    } else if (["dette", "inflation", "reserves", "prime", "mondiales", "solde", "blocage"].includes(f.type)) {
      lignes.push(...MN.effetEvenement(e, f));
    } else if (f.type === "cp" || f.type === "budget") {
      const c: Camp = f.camp === "OCC" || f.camp === "CHN" ? f.camp : campCible;
      const v = Math.round(f.valeur / 2);
      if (v) { e.budget[c] = Math.max(0, e.budget[c] + v); lignes.push({ texte: `Budget ${NOM_CAMP[c]} ${v > 0 ? "+" : ""}${v}`, camp: c, signe: v > 0 ? 1 : -1 }); }
    }
  }
  void source;
  return lignes;
}

// ---------- Étape 1 : événements automatiques de l'année ----------
// Tous les événements historiques connus, de 2000 à 2026 (au-delà : événements projetés, à brancher).
export const HISTORIQUES_V2 = [...HISTORIQUES_ERE1, ...HISTORIQUES_ERE2, ...HISTORIQUES_RECENTS, ...HISTORIQUES_COMPLEMENTS, ...PROJECTIONS];
export function jouerEvenements(e: EtatV2) {
  // Projections (après octobre 2026) : chacune n'a lieu qu'avec sa probabilité (conditions : à brancher).
  e.evenements = HISTORIQUES_V2.filter(h => h.annee === e.annee && (h.probabilite === undefined || tirer(e) < h.probabilite)).sort((a, b) => a.trimestre - b.trimestre).map(h => {
    const campDe = (iso: string): Camp => (e.pays[iso] && partPays(e.pays[iso], "CHN") > partPays(e.pays[iso], "OCC") ? "CHN" : "OCC");
    const eco = effetsEco(h).map(f => (f.camp === "$camp" ? { ...f, camp: campDe(h.pays[0]) } : f));
    const lignes = appliquerEffets(e, [...(h.effets as any[]), ...eco], "OCC", h.id);
    return { id: h.id, trimestre: h.trimestre, titre: h.titre, texte: h.texte, pays: h.pays, resume: lignes.map(l => l.texte).join(" · ") };
  });
  for (const x of RS.evenementsChantage(e)) e.evenements.push({ ...x, pays: [x.pays] });
  e.evenements.sort((a, b) => a.trimestre - b.trimestre);
}

// ---------- Étape 2 : la main de 6 cartes (2 de ton camp, 2 adverses, 2 neutres) ----------
// Plus l'événement t'est favorable, moins la carte rapporte : ton camp 1-2 points, neutre 2-3, adverse 3-4.
export const pointsCarte = (c: Carte, source: CarteMain["source"]) => ({ propre: 1, neutre: 2, adverse: 3 }[source] + (c.valeur >= 3 ? 1 : 0));
export function distribuerMains(e: EtatV2) {
  const pool = e.annee <= 2008 ? CARTES_ERE1 : [...CARTES_ERE1.filter(c => c.type === "reutilisable"), ...CARTES_ERE2]; // cartes de l'époque
  const parCamp = (c: Camp | "NEUTRE") => melanger(e, [...pool, ...RS.CARTES_CHANTAGE].filter(k => k.camp === c));
  const occ = parCamp("OCC"), chn = parCamp("CHN"), neu = parCamp("NEUTRE");
  const main = (moi: Camp): CarteMain[] => {
    const a = moi === "OCC" ? occ : chn, b = moi === "OCC" ? chn : occ;
    const l: [Carte, CarteMain["source"]][] = [[a.pop()!, "propre"], [a.pop()!, "propre"], [b.pop()!, "adverse"], [b.pop()!, "adverse"], [neu.pop()!, "neutre"], [neu.pop()!, "neutre"]];
    return l.map(([carte, source]) => ({ carte, source, points: pointsCarte(carte, source), ecartee: false }));
  };
  e.main = { OCC: main("OCC"), CHN: main("CHN") };
}
// Jouer la main : exactement 2 cartes écartées ; les 4 autres s'appliquent tout de suite et donnent leurs points.
export function jouerMain(e: EtatV2, camp: Camp, ecartees: number[]): Ligne[] {
  if (ecartees.length !== 2 || new Set(ecartees).size !== 2) throw new Error("il faut écarter exactement 2 cartes");
  const m = e.main[camp]; m.forEach((c, i) => (c.ecartee = ecartees.includes(i)));
  const lignes: Ligne[] = [];
  for (const c of m.filter(x => !x.ecartee)) {
    const campJ: Camp = c.source === "adverse" ? autre(camp) : camp;
    lignes.push(...appliquerEffets(e, c.carte.modes[0].effets as any[], campJ, c.carte.id));
  }
  e.points[camp] = Math.max(0, m.filter(x => !x.ecartee).reduce((s, c) => s + c.points, 0) + bonusPoints(e, camp));
  e.budget[camp] = Math.max(0, e.budget[camp] + bonusBudget(e, camp));
  return lignes;
}
// L'IA écarte les 2 cartes adverses les moins rentables… sauf si leurs points valent plus que le tort fait (estimation simple).
export function mainIA(e: EtatV2, camp: Camp) {
  const m = e.main[camp];
  const note = (c: CarteMain) => c.points + (c.source === "propre" ? 2.5 : c.source === "neutre" ? 0.5 : -1.5) + tirer(e) * 0.5;
  const ordre = m.map((c, i) => [i, note(c)] as const).sort((a, b) => a[1] - b[1]);
  return jouerMain(e, camp, [ordre[0][0], ordre[1][0]]);
}

// ---------- Étape 3 : la répartition des points ----------
export const pointsEngages = (e: EtatV2, camp: Camp) => e.ops.filter(o => o.camp === camp && o.annee === e.annee).reduce((s, o) => s + o.points, 0);
export const pointsLibres = (e: EtatV2, camp: Camp) => e.points[camp] - pointsEngages(e, camp);
export function raisonBlocage(e: EtatV2, camp: Camp, type: TypeOp, zone: string, pays?: string): string | null {
  const d = op(type);
  if (d.cible === "pays" && !pays) return "Choisis un pays de la zone.";
  if (pays && e.pays[pays]?.zone !== zone) return "Ce pays n'est pas dans la zone.";
  if (type === "guerre" && (!pays || !e.pays[pays].casusBelli[camp] || e.pays[pays].casusBelli[camp] > e.annee)) return "Il faut d'abord un casus belli contre ce pays (opération secrète, prête après 1 an).";
  if (type === "soutien") return "Aucun conflit en cours dans la zone.";
  if (pays && (type === "saboter" || type === "casusbelli") && pays === LEADER[camp]) return "Impossible contre ton propre pays leader.";
  if (pays && d.cat === "secret" && e.pays[pays].att[camp] >= 100) return "Ce pays est déjà entièrement acquis.";
  if (pointsLibres(e, camp) < (d.min ?? 1)) return d.min ? `Il faut au moins ${d.min} points libres.` : "Plus de points libres.";
  return null;
}
export function engager(e: EtatV2, camp: Camp, type: TypeOp, zone: string, points: number, pays?: string, boost = 0): Operation {
  const r = raisonBlocage(e, camp, type, zone, pays);
  if (r) throw new Error(r);
  const p = Math.max(op(type).min ?? 1, Math.min(points, pointsLibres(e, camp)));
  const b = Math.max(0, Math.min(boost, BOOST.max, e.budget[camp] - e.boostsUtilises[camp]));
  e.boostsUtilises[camp] += b;
  const o: Operation = { id: e.prochainId++, camp, type, zone, pays: op(type).cible === "soi" ? LEADER[camp] : pays, points: p, boost: b, annee: e.annee };
  e.ops.push(o);
  return o;
}
export function retirer(e: EtatV2, id: number) {
  const o = e.ops.find(x => x.id === id && x.annee === e.annee);
  if (!o) return;
  e.boostsUtilises[o.camp] -= o.boost;
  e.ops = e.ops.filter(x => x !== o);
}
// Proposition des conseillers (et répartition de l'IA) : zones lourdes et disputées d'abord.
export function propositionConseillers(e: EtatV2, camp: Camp): { type: TypeOp; zone: string; points: number; pays?: string; raison: string }[] {
  const adv = autre(camp), total = e.points[camp];
  const horsLeaders = (z: { pays: string[] }) => z.pays.map(i => e.pays[i]).filter(p => p.iso !== LEADER.OCC && p.iso !== LEADER.CHN);
  // Marge : poids des pays qui peuvent encore monter (ni acquis, ni hostiles au point d'être hors de portée).
  const margeAtt = (p: PaysV2) => p.att[camp] < -60 ? 0 : p.poids * Math.max(0, Math.min(1, (80 - p.att[camp]) / 100)) * (1 + Math.max(0, p.att[adv]) / 200);
  const margeEco = (p: PaysV2) => p.eco[camp] < -60 ? 0 : p.poids * Math.max(0, Math.min(1, (60 - p.eco[camp]) / 100));
  const noms = (l: PaysV2[], f: (p: PaysV2) => number) => l.slice().sort((a, b) => f(b) - f(a)).slice(0, 2).map(p => p.nom).join(" et ");
  const parAtt = ZONES.map(z => ({ z, l: horsLeaders(z), note: horsLeaders(z).reduce((s, p) => s + margeAtt(p), 0) })).sort((a, b) => b.note - a.note);
  const parEco = ZONES.map(z => ({ z, l: horsLeaders(z), note: horsLeaders(z).reduce((s, p) => s + margeEco(p), 0) })).sort((a, b) => b.note - a.note);
  const plan: { type: TypeOp; zone: string; points: number; pays?: string; raison: string }[] = [];
  let reste = total;
  const ajouter = (type: TypeOp, zone: string, pts: number, raison: string, pays?: string) => { const p = Math.min(pts, reste); if (p >= (op(type).min ?? 1)) { plan.push({ type, zone, points: p, pays, raison }); reste -= p; } };
  const [a1, a2] = parAtt, e1 = parEco.find(x => x.z.id !== a1.z.id)!;
  ajouter("influence", a1.z.id, Math.ceil(total * 0.3), `${a1.z.nom} : ${noms(a1.l, margeAtt)} peuvent encore basculer, et pèsent lourd.`);
  ajouter("partenariat", e1.z.id, Math.ceil(total * 0.2), `${e1.z.nom} : du commerce à prendre avec ${noms(e1.l, margeEco)}.`);
  ajouter("influence", a2.z.id, Math.ceil(total * 0.2), `${a2.z.nom} : ${noms(a2.l, margeAtt)}, encore indécis.`);
  // Infiltration : le pays lourd où l'adversaire devance le plus ton camp.
  const cible = Object.values(e.pays).filter(p => p.iso !== LEADER.OCC && p.iso !== LEADER.CHN && p.att[adv] > p.att[camp] && p.att[camp] > -60).sort((a, b) => b.poids * (b.att[adv] - b.att[camp]) - a.poids * (a.att[adv] - a.att[camp]))[0];
  if (cible) ajouter("infiltrer", cible.zone, 2, `${cible.nom} penche vers ${NOM_CAMP[adv] === "BRICS" ? "les BRICS" : "l'Occident"} : l'infiltrer révèle aussi les points adverses de sa zone.`, cible.iso);
  if (reste > 0) ajouter("developpement", ZONE_DE[LEADER[camp]], reste, "Le reste au développement chez toi : croissance et armée.");
  return plan;
}
export function repartitionIA(e: EtatV2, camp: Camp) {
  MN.monnaieIA(e, camp); // décisions de trésorerie de l'IA (emprunt, or, planche à billets)
  for (const p of propositionConseillers(e, camp)) if (!raisonBlocage(e, camp, p.type, p.zone, p.pays)) engager(e, camp, p.type, p.zone, p.points, p.pays, tirer(e) < 0.4 && e.budget[camp] - e.boostsUtilises[camp] > 0 ? 1 : 0);
}

// ---------- Étape 4 : la résolution ----------
export const ageOp = (e: EtatV2, o: Operation) => e.annee - o.annee; // 0, 1, 2 : année d'effet
export const opsActives = (e: EtatV2) => e.ops.filter(o => ageOp(e, o) >= 0 && ageOp(e, o) < 3);
export const anneesRestantes = (e: EtatV2, o: Operation) => 3 - ageOp(e, o);
export function risqueDemasque(e: EtatV2, o: Operation): number {
  const d = op(o.type); if (d.cat !== "secret" || !o.pays) return 0;
  const p = e.pays[o.pays], adv = autre(o.camp);
  const contre = Math.min(15, opsActives(e).filter(x => x.camp === adv && x.zone === o.zone).reduce((s, x) => s + x.points, 0)); // contre-espionnage adverse : +1 par point actif dans la zone, plafonné à 15
  return borne(d.risque + RISQUE_NIVEAU[niveau(p.att[o.camp])] + contre + bonusRisque(e, o.camp), 5, 60);
}
// Rendement décroissant : plus un pays est haut, moins un point le fait monter.
const rendement = (v: number, gain: number) => (gain > 0 ? gain * (1 - Math.max(0, v) / 130) : gain);
export function poidsDansZone(e: EtatV2, zone: string, type: TypeOp, camp?: Camp): [string, number][] {
  const l = ZONES.find(z => z.id === zone)!.pays.map(i => e.pays[i]);
  const f = (p: PaysV2) => type === "influence" ? Math.sqrt(p.population) * (0.5 + p.stabilite / 100)
    : type === "partenariat" ? (p.pib + 2e10 * p.ressources) * (camp && RS.BIENS.some(b => RS.role(e, p.iso, b.id) === "offre" && RS.bilan(e, camp, b.id).manque) ? EFFET.partenariatManque : 1)
    : type === "developpement" ? p.population / Math.max(1, p.pib / p.population) // besoins : PIB par habitant faible = poids fort
    : p.militaire + 5;
  const t = l.reduce((s, p) => s + f(p), 0);
  return l.map(p => [p.iso, f(p) / t]);
}
export interface Revelation { op: Operation; lignes: Ligne[]; demasquee: boolean; risque: number }
export function resoudreAnnee(e: EtatV2): Revelation[] {
  const res: Revelation[] = [];
  for (const o of opsActives(e)) {
    const age = ageOp(e, o), part = ETALEMENT[age], d = op(o.type), adv = autre(o.camp);
    const boost = 1 + BOOST.parUnite * o.boost;
    const cle = o.type === "influence" ? "influence" : o.type === "partenariat" ? "partenariat" : d.cat;
    const m = o.points * part * boost * multEffet(e, o.camp, cle as any);
    const lignes: Ligne[] = [];
    const eff = (iso: string) => 1 / COUT_NIVEAU[niveau(e.pays[iso].att[o.camp])]; // coût des opérations selon l'attitude (réduction plafonnée à −30 %)
    if (o.type === "influence" || o.type === "partenariat" || o.type === "developpement" || o.type === "exercice") {
      for (const [iso, w] of poidsDansZone(e, o.zone, o.type, o.camp)) {
        const p = e.pays[iso];
        if (o.type === "influence") p.att[o.camp] = borne(p.att[o.camp] + rendement(p.att[o.camp], EFFET.influence * m * w * eff(iso)));
        if (o.type === "partenariat") p.eco[o.camp] = borne(p.eco[o.camp] + rendement(p.eco[o.camp], EFFET.partenariat * m * w * eff(iso)));
        if (o.type === "developpement") { p.pib *= 1 + EFFET.devPib * m * w / 100 * 3; p.militaire = Math.min(100, p.militaire + EFFET.devMil * m * w); RS.ajusterSolde(e, iso, "industrie", EFFET.devRes * m * w); RS.ajusterSolde(e, iso, "alimentation", EFFET.devRes * m * w / 2); if (iso !== LEADER[o.camp]) p.att[o.camp] = borne(p.att[o.camp] + rendement(p.att[o.camp], EFFET.devAttitude * m * w * eff(iso) * 3)); }
        if (o.type === "exercice" && niveau(p.att[o.camp]) <= 2) e.tension = borne(e.tension + EFFET.exerciceTension * m * w, 0, 10);
        if (o.type === "exercice") { if (niveau(p.att[o.camp]) >= 5) p.att[o.camp] = borne(p.att[o.camp] + EFFET.exercice * m / 2); else if (niveau(p.att[o.camp]) <= 2) p.att[o.camp] = borne(p.att[o.camp] - EFFET.exerciceHostile * m / 2); }
      }
      lignes.push({ texte: `${op(o.type).nom} : ${o.points} pt${o.points > 1 ? "s" : ""}, ${Math.round(part * 100)} % de l'effet cette année`, camp: o.camp, zone: o.zone, signe: 1 });
    } else if (o.type === "armee") {
      e.militaire[o.camp] += EFFET.armee * m; e.pays[LEADER[o.camp]].militaire += EFFET.armee * m;
      if (e.monnaie) e.monnaie.dette[o.camp] += EFFET.armeeDette * m; // dépenses militaires financées en partie par la dette
      lignes.push({ texte: `Armée ${NOM_CAMP[o.camp]} +${(EFFET.armee * m).toFixed(1)}`, camp: o.camp, signe: 1 });
    } else if (o.pays) {
      const p = e.pays[o.pays];
      if (o.type === "infiltrer") { p.att[o.camp] = borne(p.att[o.camp] + rendement(p.att[o.camp], EFFET.infiltrer * m * eff(p.iso))); p.infiltre[o.camp] = true; }
      if (o.type === "gouvernement") p.att[o.camp] = borne(p.att[o.camp] + rendement(p.att[o.camp], EFFET.gouvernement * m * eff(p.iso)));
      if (o.type === "saboter") { p.pib *= 1 - EFFET.saboterPib * m / 100; p.stabilite = borne(p.stabilite - EFFET.saboterStab * m, 0, 100);
        const b = RS.BIENS.map(x => x.id).filter(x => x !== "industrie").sort((a, c) => RS.solde(e, p.iso, c) - RS.solde(e, p.iso, a))[0]; if (RS.solde(e, p.iso, b) > 0) RS.ajusterSolde(e, p.iso, b, -EFFET.saboterRes * m); } // infrastructures de sa principale production
      if (o.type === "reduire") { p.att[adv] = borne(p.att[adv] - EFFET.reduireAtt * m); p.eco[adv] = borne(p.eco[adv] - EFFET.reduireEco * m); }
      if (o.type === "casusbelli" && age === 0) { p.casusBelli[o.camp] = e.annee + 1; e.tension = borne(e.tension + EFFET.casusTension, 0, 10); }
      if (o.type === "armes") { p.att[o.camp] = borne(p.att[o.camp] + rendement(p.att[o.camp], EFFET.armesAtt * m)); p.militaire += m; if (age === 0) e.budget[o.camp] += Math.round(EFFET.armesBudget * o.points); }
      lignes.push({ texte: `${op(o.type).nom} : ${p.nom}`, camp: o.camp, pays: p.iso, zone: o.zone, signe: 1 });
    }
    // Risque d'être démasqué, tiré chaque année tant que l'opération secrète agit.
    let demasquee = false; const risque = risqueDemasque(e, o);
    if (risque && !o.demasquee && tirer(e) * 100 < risque) {
      demasquee = o.demasquee = true;
      const p = e.pays[o.pays!];
      p.att[o.camp] = borne(p.att[o.camp] - PAS_DEGRE); e.tension = borne(e.tension + 0.5, 0, 10);
      lignes.push({ texte: `Démasqué ! ${p.nom} descend d'un degré envers ${NOM_CAMP[o.camp]} ; tension +0,5`, camp: o.camp, pays: p.iso, signe: -1 });
    }
    if (d.cat === "secret") for (const x of opsActives(e)) if (x.camp === adv && x.zone === o.zone) x.revelee = true; // une opération secrète révèle les points adverses de la zone
    res.push({ op: o, lignes, demasquee, risque });
  }
  EV.croissanceAnnee(e); // économie, ressources, routes, tendance de fond, stabilité et tension
  e.resolues = (e.resolues ?? 0) + 1;
  return res;
}
// Fonctionnement économique : effet sur le PIB, dépendance estimée à 50 % du commerce du pays avec chaque camp.
export function appliquerEconomie(e: EtatV2) {
  for (const p of Object.values(e.pays)) for (const c of ["OCC", "CHN"] as Camp[]) if (p.iso !== LEADER[c]) p.pib *= 1 + PIB_NIVEAU[niveau(p.eco[c])] * 0.5 / 100;
}

// ---------- La traque (duel de renseignement, sans dé) ----------
// Le défenseur a réparti ses points actifs de la zone entre ses pays (en secret) et ajoute des leurres. L'attaquant envoie
// une équipe pour 2 points engagés. Une équipe qui tombe sur des points en élimine jusqu'à 2 ; sur un leurre ou un pays vide,
// elle augmente le risque d'être démasqué. Pays déjà infiltrés : révélés avant la traque. Limite : la moitié des points adverses.
export interface Traque { zone: string; attaquant: Camp; equipes: number; caches: Record<string, number>; leurres: string[]; reveles: string[]; limite: number }
export function preparerTraque(e: EtatV2, o: Operation): Traque {
  const adv = autre(o.camp), z = ZONES.find(x => x.id === o.zone)!;
  const actifs = opsActives(e).filter(x => x.camp === adv && x.zone === o.zone);
  const total = actifs.reduce((s, x) => s + x.points, 0);
  const caches: Record<string, number> = {};
  for (const x of actifs) {
    const iso = x.pays ?? poidsDansZone(e, o.zone, x.type).sort((a, b) => b[1] - a[1])[Math.floor(tirer(e) * 2)][0];
    caches[iso] = (caches[iso] ?? 0) + x.points;
  }
  const libres = melanger(e, z.pays.filter(i => !caches[i]));
  return { zone: o.zone, attaquant: o.camp, equipes: Math.max(1, Math.floor(o.points / 2)), caches, leurres: libres.slice(0, Math.min(2, libres.length)), reveles: z.pays.filter(i => e.pays[i].infiltre[o.camp]), limite: Math.floor(total / 2) };
}
export function resoudreTraque(e: EtatV2, t: Traque, choix: string[]): { elimines: number; fouilles: { iso: string; trouve: number; leurre: boolean }[]; risqueAjoute: number } {
  const adv = autre(t.attaquant);
  let elimines = 0, risqueAjoute = 0;
  const fouilles = choix.slice(0, t.equipes).map(iso => {
    const trouve = Math.min(2, t.caches[iso] ?? 0, t.limite - elimines);
    const leurre = t.leurres.includes(iso);
    if (trouve > 0) elimines += trouve; else risqueAjoute += 10;
    return { iso, trouve, leurre };
  });
  // Les points éliminés sont retirés des opérations adverses actives de la zone, les plus récentes d'abord.
  let reste = elimines;
  for (const x of opsActives(e).filter(x => x.camp === adv && x.zone === t.zone).sort((a, b) => b.annee - a.annee)) {
    if (!reste) break; const k = Math.min(reste, x.points); x.points -= k; reste -= k;
  }
  e.ops = e.ops.filter(x => x.points > 0);
  return { elimines, fouilles, risqueAjoute };
}

// ---------- Décompte (projection affichée en permanence ; réel tous les 5 ans) ----------
// Part continue (décision du 2026-11-02 : le décompte mesure la progression) : elle passe par les repères des niveaux
// (début de Coopération 40 %, d'Amitié 70 %, d'Alliance 100 %) et bouge dès le premier degré gagné.
const REPERES_PART: [number, number][] = [[0, 0], [-100 + 12 * PAS_DEGRE, 0.4], [-100 + 15 * PAS_DEGRE, 0.7], [-100 + 18 * PAS_DEGRE, 1]];
export function partContinue(x: number) {
  if (x <= 0) return 0;
  for (let i = 1; i < REPERES_PART.length; i++) { const [x1, y1] = REPERES_PART[i], [x0, y0] = REPERES_PART[i - 1]; if (x <= x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  return 1;
}
export const partPays = (p: PaysV2, c: Camp) => (p.iso === LEADER[c] ? 1 : partContinue((p.att[c] + p.eco[c]) / 2));
export function decompte(e: EtatV2) {
  const zones = ZONES.map(z => {
    const l = z.pays.map(i => e.pays[i]);
    return { id: z.id, nom: z.nom, OCC: l.reduce((s, p) => s + p.poids * partPays(p, "OCC"), 0), CHN: l.reduce((s, p) => s + p.poids * partPays(p, "CHN"), 0), poids: l.reduce((s, p) => s + p.poids, 0) };
  });
  return { zones, OCC: zones.reduce((s, z) => s + z.OCC, 0), CHN: zones.reduce((s, z) => s + z.CHN, 0) };
}
// Progression (décision du 2026-11-02) : chaque camp marque la part du terrain disponible qu'il a conquis depuis 2000
// (gain ÷ marge restante au départ ; une perte se mesure sur ce qu'il détenait). La jauge = écart de progression en points,
// plus un handicap (komi) qui grandit avec les années jouées, pour qu'aucun camp ne soit favorisé par sa position de départ.
// Calibrage (estimation, 200 parties IA contre IA sur 36 ans, 2000-2035, avec tous les événements historiques) : sans komi,
// avec l'évolution de tout (PIB, population, ressources, routes, interactions) : médiane +2,0 pour l'Occident (p10 −7,3, p90 +11,6) ;
// komi −2,0 et nul à ±1,3 visent 45 / 10 / 45 (Occident / nul / BRICS).
export const JAUGE = { komi: -2.0, nul: 1.3, annees: 36 }; // recalibré le 2 novembre 2026 (tout évolue + monnaie + événements reliés, 200 parties IA) : estimation
// ---------- Enchaînement des années ----------
// Décompte en fin d'année tous les 5 ans (2004, 2009 … 2034) et décompte final fin 2035.
export const ANNEE_DEBUT = 2000, ANNEE_FIN = 2035;
export const REVENU: Record<Camp, number> = { OCC: 6, CHN: 5 };
// Poids économique d'un camp : PIB de ses pays pondéré par leur alignement. Le budget suit (à moitié) son évolution depuis 2000.
export const partEco = (e: EtatV2, c: Camp) => Object.values(e.pays).reduce((s, p) => s + p.pib * partPays(p, c), 0);
export function revenuAnnee(e: EtatV2, c: Camp) {
  const r = partEco(e, c) / (e.partEcoDepart?.[c] || partEco(e, c)), autreR = partEco(e, autre(c)) / (e.partEcoDepart?.[autre(c)] || partEco(e, autre(c)));
  return Math.round(REVENU[c] * Math.max(0.75, Math.min(1.35, 1 + 0.25 * (r / autreR - 1)))); // relatif : seule l'avance sur l'autre camp compte
}
// Conseillers : leur bonus ou malus de stabilité s'applique chaque année au pays leader.
export function appliquerStabiliteCabinet(e: EtatV2) {
  for (const c of ["OCC", "CHN"] as Camp[]) { const v = mods(e, c).reduce((s, m) => s + (m.stabilite ?? 0), 0); const p = e.pays[LEADER[c]]; p.stabilite = borne(p.stabilite + v, 0, 100); }
} // budget versé chaque année (estimation) ; report plafonné à 2 ans
export interface Decompte { annee: number; OCC: number; CHN: number; jauge: number; tete: Camp | null; final: boolean }
export const estAnneeDecompte = (a: number) => a === ANNEE_FIN || (a - ANNEE_DEBUT) % 5 === 4;
export function anneeSuivante(e: EtatV2): Decompte | null {
  let d: Decompte | null = null;
  EV.evoluerFinAnnee(e); // population, armée, stabilité, ressources, interactions entre pays, poids
  appliquerStabiliteCabinet(e);
  if (estAnneeDecompte(e.annee)) {
    const g = progression(e);
    d = { annee: e.annee, OCC: g.OCC, CHN: g.CHN, jauge: g.jauge, tete: g.tete, final: e.annee === ANNEE_FIN };
    (e.decomptes ??= []).push(d);
  }
  if (e.annee >= ANNEE_FIN) { e.fin = true; return d; }
  for (const c of ["OCC", "CHN"] as Camp[]) {
    const rev = revenuAnnee(e, c); (e.revenu ??= { ...REVENU })[c] = rev;
    e.budget[c] = Math.min(2 * rev, Math.max(0, e.budget[c] - e.boostsUtilises[c]) + rev);
    e.boostsUtilises[c] = 0; e.points[c] = 0; e.main[c] = [];
  }
  e.ops = e.ops.filter(o => ageOp(e, o) < 2); // une opération agit 3 ans (âges 0, 1, 2)
  e.evenements = [];
  e.annee++;
  e.depart = Object.fromEntries(Object.values(e.pays).map(p => [p.iso, { att: { ...p.att }, eco: { ...p.eco } }]));
  return d;
}
const progres = (d: number, d0: number) => (d >= d0 ? (d - d0) / Math.max(1e-9, 100 - d0) : (d - d0) / Math.max(1e-9, d0));
export function progression(e: EtatV2) {
  const d = decompte(e), d0 = e.decompteDepart ?? { OCC: d.OCC, CHN: d.CHN };
  const OCC = 100 * progres(d.OCC, d0.OCC), CHN = 100 * progres(d.CHN, d0.CHN);
  const komi = JAUGE.komi * (e.resolues ?? 0) / JAUGE.annees, jauge = OCC - CHN + komi;
  return { OCC, CHN, komi, jauge, tete: Math.abs(jauge) < JAUGE.nul ? null : (jauge > 0 ? "OCC" : "CHN") as Camp | null };
}

// Récap de l'année : changements de niveau d'attitude ou d'économie envers chaque camp.
export function changementsNiveau(e: EtatV2) {
  const l: { iso: string; camp: Camp; echelle: "att" | "eco"; avant: number; apres: number }[] = [];
  for (const p of Object.values(e.pays)) for (const c of ["OCC", "CHN"] as Camp[]) for (const k of ["att", "eco"] as const) {
    const a = niveau(e.depart![p.iso][k][c]), b = niveau(p[k][c]);
    if (a !== b) l.push({ iso: p.iso, camp: c, echelle: k, avant: a, apres: b });
  }
  return l.sort((x, y) => e.pays[y.iso].poids - e.pays[x.iso].poids);
}

// ---------- Relations entre pays (mode « relations d'un pays ») : estimation tirée des attitudes envers les camps + rivalités connues ----------
const RIVALITES: [string, string, number][] = [["IND", "PAK", -75], ["ISR", "IRN", -85], ["ISR", "SYR", -80], ["KOR", "PRK", -70], ["CHN", "TWN", -60], ["GRC", "TUR", -25], ["ARM", "AZE", -85], ["ETH", "ERI", -85], ["RUS", "GEO", -40], ["CHN", "JPN", -30], ["CHN", "IND", -30], ["USA", "CUB", -60], ["USA", "IRN", -70], ["USA", "PRK", -80], ["IRN", "IRQ", -50], ["IRN", "SAU", -45], ["SAU", "QAT", -10], ["MAR", "DZA", -40], ["COL", "VEN", -20], ["PER", "ECU", -20], ["SDN", "SSD", -50], ["RUS", "UKR", 10], ["RUS", "BLR", 70], ["CHN", "PAK", 70], ["CHN", "PRK", 75], ["USA", "ISR", 85], ["GBR", "USA", 90], ["FRA", "DEU", 85], ["RUS", "IND", 45], ["CHN", "RUS", 25]];
export const rivalite = (iso: string): [string, number][] => RIVALITES.filter(([x, y]) => x === iso || y === iso).map(([x, y, f]) => [x === iso ? y : x, f]);
export function relation(e: EtatV2, a: string, b: string): number {
  if (a === b) return 100;
  const r = RIVALITES.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
  // Une rivalité s'apaise quand les deux pays se rangent fortement dans le même camp (jusqu'à moitié).
  if (r) { const A = e.pays[a], B = e.pays[b]; const meme = Math.max(...(["OCC", "CHN"] as Camp[]).map(c => Math.min(partPays(A, c), partPays(B, c)))); return Math.round(r[2] * (1 - 0.5 * meme)); }
  const A = e.pays[a], B = e.pays[b];
  const proche = A.zone === B.zone ? 10 : 0;
  return borne(0.5 * (A.att.OCC * B.att.OCC + A.att.CHN * B.att.CHN) / 100 + proche);
}

// ---------- Routes : tenue par un camp si tous ses pays sont au moins en accords commerciaux avec lui ----------
export function controleRoute(e: EtatV2, id: string): Camp | null {
  const r = ROUTES.find(x => x.id === id)!;
  for (const c of ["OCC", "CHN"] as Camp[]) if (r.pays.every(i => niveau(e.pays[i].eco[c]) >= 4)) return c;
  return null;
}

// Description courte d'un dirigeant (traits) pour l'interface.
export const traitsDe = (d: Dirigeant) => d.traits.map(t => TRAITS_DIRIGEANT[t].nom);
