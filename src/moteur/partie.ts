// Moteur de la tranche verticale (ère 1) : état de la partie, round, effets, événements, cartes,
// briefings, actions, élections, score. Règles : document « Règles chiffrées de la tranche 2000-2008 ».
// Chaque fonction publique prend un état et en rend un nouveau (l'état d'entrée n'est jamais modifié).
import donnees from "../data/pays2000.json";
import trajectoires from "../data/trajectoires.json";
import { EXPOSITION, SANCTIONNES_2000, NON_DEMOCRATIES_2000 } from "../data/geographie";
import { INFLUENCE_2000 as INFLUENCE_50 } from "../data/influence2000";
import { INFLUENCE_2000_MONDE } from "../data/influence2000_monde";
const INFLUENCE_2000 = { ...INFLUENCE_50, ...INFLUENCE_2000_MONDE }; // 50 pays du jeu + 144 autres membres de l'ONU (estimation)
import { HISTORIQUES_ERE1 } from "../contenu/historiques";
import { HISTORIQUES_ERE2 } from "../contenu/historiques2";
import { HISTORIQUES_RECENTS } from "../contenu/historiques3";
import { PROJECTIONS } from "../contenu/projections";
import { CROISSANCE_PROJETEE } from "../data/croissance-projetee";
import { CARTES_ERE2 } from "../contenu/cartes2";
import { BRIEFINGS_ERE2 } from "../contenu/briefings2";
import { FAMILLES, MODELES_LOT1, EXPOSES_CLIMAT } from "../contenu/generiques";
import { CONTEXTES, MINEURS, VILLES, enPays, duPays } from "../contenu/contextes";
import { FLUX, DETROITS, type Flux } from "../data/flux";
import { hubsDe } from "../data/hubs";
import { PROFILS, type Bien } from "../data/commerce";
import VOISINS from "../data/voisins.json";
import { organisations } from "../data/organisations";
import { CARTES_ERE1 } from "../contenu/cartes";
import { BRIEFINGS_ERE1 } from "../contenu/briefings";
import { SCORES } from "../data/donnees2000";
import { FAMILLES as FAMILLES_ATTRIBUTS, type Famille } from "../data/attributs";
import { suivant } from "./alea";
import { date, libelle, NB_ROUNDS } from "./temps";
import {
  type Camp, type Canal, type Effet, type Condition, type CiblePays, type CampRel, type Carte, type Briefing,
  type ModeleGenerique, CAMPS, CANAUX, adversaire,
} from "./types";

export const VERSION_ETAT = 2;
export const ROUNDS_TRANCHE = 36; // ère 1 : 2000 T1 à 2008 T4
// Formules de partie : l'ère 1 seule, l'ère 1 prolongée jusqu'en 2025, ou un départ réel en 2008 jusqu'en 2025.
export type Format = "2000-2008" | "2000-2035" | "2008-2035";
export const FORMATS: Record<Format, { debut: number; fin: number; nom: string; komi: number; egalite: number }> = {
  "2000-2008": { debut: 0, fin: 35, nom: "Fin de l'unipolarité (2000-2008)", komi: 6.8, egalite: 0.35 }, // 200 parties IA : 39,5 / 19 / 41,5 %
  "2000-2035": { debut: 0, fin: 143, nom: "Partie longue (2000-2035)", komi: 18.9, egalite: 0.25 }, // 200 parties IA : 39 / 19,5 / 41,5 %, aucune défaite
  "2008-2035": { debut: 32, fin: 143, nom: "Montée des BRICS (2008-2035)", komi: 15.4, egalite: 0.25 }, // 200 parties IA : 38,5 / 20,5 / 41 %, aucune défaite
};
export const formatDe = (e: EtatPartie) => FORMATS[(e.reglages.format ?? "2000-2008").replace("2025", "2035") as Format]; // sauvegardes v14 : formats « -2025 » prolongés
// Part moyenne du komi dans le bilan : le décompte k (sur n) en compte k/n, la moyenne vaut (n + 1) / 2n.
export const partKomi = (f: { debut: number; fin: number }) => { const n = (f.fin - f.debut + 1) / 4; return (n + 1) / (2 * n); };
export const POIDS: Record<Canal, number> = { e: 0.35, p: 0.3, m: 0.2, c: 0.15 };
// Alignement linéaire : un point d'influence vaut autant pour les deux camps (la formule en ratio avantageait
// le camp en retard d'un facteur 1,4 à 1,6 et donnait 87 % de victoires chinoises en IA contre IA).
export const ECHELLE_ALIGNEMENT = 70;
const USURE = 0.02, DERIVE_E = 0.05, CIBLE_E = 70, MAX_PA_PAR_PAYS = 2;
const PART_CO2_50 = 1, PART_HORS_50 = 0, // 194 pays : tout le monde est simulé (plus de part hors jeu)
  TCRE = 0.45 / 1000, ECART_2000 = 0.8;
const ELECTIONS_USA = [2000, 2004, 2008, 2012, 2016, 2020, 2024, 2028, 2032], CONGRES_CHINE = [2002, 2007, 2012, 2017, 2022, 2027, 2032];

export interface EtatPays {
  iso3: string; population: number; pib: number; stabilite: number;
  influence: Record<Camp, Record<Canal, number>>;
  ancre: Record<Camp, Record<Canal, number>>;          // valeur vers laquelle l'usure ramène p, m, c
  bonus: { points: number; reste: number }[];          // écarts de croissance (points annuels)
  co2Mod: { pourcent: number; reste: number }[];
  environnement: number; // qualité de l'environnement local 0-100, dégradée par la pollution du pays lui-même
  pibMax: number;
}
export interface EtatCamp {
  cp: number; budget: number; main: string[]; pa: number; paParPays: Record<string, number>; paAchetes: number;
  carteJouee: boolean; briefing: string | null; doctrine: string;
  reactions: number[]; // indices du journal auxquels le camp a réagi ce trimestre
  typesJoues: TypeCarte[]; // types de cartes jouées cette année (au moins un de chaque)
  diplomatie?: number; // dernière année où le camp a pris une initiative diplomatique
  priorite?: Priorite | null; prioriteAnnee?: number; // priorité annuelle (bonus de 25 % sur une famille d'actions)
  suite?: Record<string, { round: number; n: number }>; // investissement durable : trimestres consécutifs d'action par pays
  sondage?: boolean; // le sondage d'alerte a déjà été publié
  fatigue?: number; // CACHÉ : lassitude de l'opinion face aux engagements militaires
  agenda?: { id: string; annee: number; depart: number } | null; // agenda secret de l'année
  renseigne?: number; // dernier trimestre de renseignement
  course?: number; // dernière année de course aux armements
  points?: Record<Domaine, number>; // points du trimestre par domaine (non reportés)
  modes?: Record<Domaine, ModeDomaine>; // automatique, conseiller ou manuel
  orientations?: Record<string, Orientation>; partOrientations?: number; // orientations permanentes et part du budget qui s'y applique
  crans?: Record<string, { coop: number; coer: number; round: number; rCoop?: number; rCoer?: number }>; // échelles militaires atteintes par pays
  recherche?: Record<string, number>; technologies?: string[]; // points investis par technologie, percées obtenues
}
export type TypeCarte = "camp" | "adverse" | "neutre";
export const NOMS_TYPES: Record<TypeCarte, string> = { camp: "de ton camp", adverse: "adverse", neutre: "neutre" };
export interface EntreeJournal {
  round: number; type: "historique" | "generique" | "carte" | "briefing" | "cache" | "politique" | "bilan" | "action" | "rumeur";
  titre: string; texte: string; famille?: string; pays?: string[]; camp?: Camp; visiblePour: Camp[];
  effets?: string[]; intensite?: number; mineur?: boolean; contestable?: boolean; ripostes?: Camp[]; joueParCamp?: Camp; reactif?: boolean; source?: string; // source : identifiant de l'événement historique ; reactif : événement négatif localisé, on peut y réagir (aider, exploiter) // joueParCamp : qui a posé la carte (≠ camp quand l'événement adverse se déclenche) // effets lisibles (« ce que ça change ») et gravité des événements génériques (0,5 mineur à 3 majeur)
}
interface EffetPrevu { round: number; effet: Effet; joueur: Camp | null; paysTire?: string; source: string; cache: boolean; facteur: number }

export interface EtatPartie {
  version: number; graine: number; alea: number; round: number; joueur: Camp | null;
  pays: Record<string, EtatPays>; camps: Record<Camp, EtatCamp>;
  tension: number; co2Cumule: number; ecartTemp: number;
  drapeaux: string[]; historiquesFaits: string[]; briefingsFaits: string[];
  pioche: string[]; defausse: string[]; retirees: string[];
  attente: EffetPrevu[]; journal: EntreeJournal[];
  scoreDepart: number; termine: boolean; resultat: string | null; decomptes: number[]; deficitDepart: Record<Camp, number>;
  reglages: Reglages;
  conflits: Conflit[]; // conflits armés en cours (symboles sur la carte)
  blocages: { detroit: string; fin: number }[]; // détroits fermés : les flux qui les traversent sont coupés
  concessions: { hub: string; iso: string; camp: Camp; fin: number }[];
  proposition?: { de: Camp; type: "sommet" | "accord" | "paix"; round: number } | null; // offre diplomatique en attente de réponse
  paliers: Record<string, number>;
  memoire: Record<string, Record<Camp, number>>;
  prets: { iso: string; camp: Camp; montant: number; echeance: number }[];
  interventions: { iso: string; camp: Camp; fin: number }[];
  campagnesElectorales: Record<string, Record<Camp, number>>; // « ISO:année » → soutiens de chaque bloc
  chaines: { iso: string; famille: string; round: number; source: string }[]; // crises en chaîne programmées
  onu?: { annee: number; theme: string; de: Camp; lobby: Record<Camp, number> } | null;
  blocus?: { detroit: string; camp: Camp; fin: number } | null;
  guerre?: { theatre: string; agresseur: Camp; debut: number } | null;
  garanties?: { iso: string; camp: Camp }[]; // garanties de défense accordées // guerre directe entre les deux leaders // CACHÉ : gratitude (+) ou rancune (−) de chaque pays envers chaque bloc, de −10 à +10
  rapprochements: { iso: string; camp: Camp; restant: number }[]; // entraînements en cours (trimestres restants)
  contagion: Record<string, Record<Camp, number>>; // influence politique cumulée reçue par rapprochement (plafonnée) // palier d'alignement de chaque pays (−2 allié Chine … +2 allié USA), pour l'effet « ami d'un ami »
  zones: Record<string, Record<Camp, number>>; // présence des blocs dans les zones stratégiques (0-100) // ports et aéroports sous concession d'un bloc
}
export interface Conflit { iso: string; titre: string; fin: number }
// Réglages de test : désactiver les génériques ou l'IA isole la trajectoire de référence.
export interface Reglages { generiques: boolean; ia: boolean; format?: Format }

// ---------- Données de référence ----------
const ISO = donnees.pays.map(p => p.iso3);
const NOMS: Record<string, string> = Object.fromEntries(donnees.pays.map(p => [p.iso3, p.nom]));
NOMS.SSD = "Sud-Soudan"; // région autonome en rébellion (SPLM), indépendante seulement en 2011
export const nomPays = (iso: string) => NOMS[iso] ?? iso;
const TRAJ = trajectoires.pays as Record<string, { pib: number[]; population: number[]; co2: number[] }>;
const PETROLE: Record<string, number> = Object.fromEntries(donnees.pays.map(p => [p.iso3, p.indicateurs.prodPetrole ?? 0]));
const POP_MOYENNE_2000 = ISO.reduce((s, i) => s + TRAJ[i].population[0], 0) / ISO.length;
const PETROLE_TOTAL = Object.values(PETROLE).reduce((a, b) => a + b, 0);
const CARTES: Record<string, Carte> = Object.fromEntries([...CARTES_ERE1, ...CARTES_ERE2].map(c => [c.id, c]));
const TOUS_BRIEFINGS = [...BRIEFINGS_ERE1, ...BRIEFINGS_ERE2];
const BRIEFINGS: Record<string, Briefing> = Object.fromEntries(TOUS_BRIEFINGS.map(b => [b.id, b]));
export const HISTORIQUES = [...HISTORIQUES_ERE1, ...HISTORIQUES_ERE2, ...HISTORIQUES_RECENTS, ...PROJECTIONS];
// Paquet de l'année : ère 1 jusqu'en 2008 ; ensuite les cartes de l'ère 2 et les cartes réutilisables de l'ère 1.
const paquet = (annee: number) => annee <= 2008 ? CARTES_ERE1.map(c => c.id) : [...CARTES_ERE1.filter(c => c.type === "reutilisable"), ...CARTES_ERE2].map(c => c.id);
export const carte = (id: string) => CARTES[id];
export const briefing = (id: string) => BRIEFINGS[id];
const MODELES_PAR_FAMILLE: Record<string, ModeleGenerique[]> = {};
for (const m of MODELES_LOT1) (MODELES_PAR_FAMILLE[m.famille] ??= []).push(m);

// L'IA travaille sur une seule copie de l'état : les actions qu'elle enchaîne la modifient sur place.
let SUR_PLACE = false, REJEU = false;
const copie = (e: EtatPartie) => SUR_PLACE ? e : structuredClone(e);

// ---------- Aléa ----------
function tirer(e: EtatPartie): number { const s = suivant(e.alea); e.alea = s.etat; return s.valeur; }
function poisson(e: EtatPartie, lambda: number): number {
  const l = Math.exp(-lambda); let k = 0, p = 1;
  do { k++; p *= tirer(e); } while (p > l);
  return k - 1;
}
function choisirPondere<T>(e: EtatPartie, items: T[], poids: number[]): T {
  const total = poids.reduce((a, b) => a + b, 0); let r = tirer(e) * total;
  for (let i = 0; i < items.length; i++) { r -= poids[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
function melanger<T>(e: EtatPartie, t: T[]): T[] {
  const r = [...t];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(tirer(e) * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}
const borne = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
function normale(e: EtatPartie): number { return Math.sqrt(-2 * Math.log(1 - tirer(e))) * Math.cos(2 * Math.PI * tirer(e)); }
const CONTAGION = 0.5, PAPILLON = 0.005; // écart-type du choc de niveau par trimestre : environ 3 % cumulés sur 2000-2008

// ---------- Indicateurs dérivés ----------
export function influenceTotale(p: EtatPays, camp: Camp): number {
  return CANAUX.reduce((s, c) => s + POIDS[c] * p.influence[camp][c], 0);
}
export function alignement(e: EtatPartie, iso: string): number {
  if (iso === "USA") return 1;
  if (iso === "CHN") return -1;
  const p = e.pays[iso], o = influenceTotale(p, "OCC"), c = influenceTotale(p, "CHN");
  return borne((o - c) / ECHELLE_ALIGNEMENT, -1, 1);
}
export const cran = (e: EtatPartie) => Math.min(5, 1 + Math.floor(e.tension / 20));
const pibParHab = (p: EtatPays) => p.pib / p.population;
// PIB mondial, mis en cache par objet « pays » (une copie de l'état le recalcule) ; invalidé quand les PIB changent sur place.
let cacheMonde: { pays: object; v: number } | null = null;
const pibMonde = (e: EtatPartie) => cacheMonde?.pays === e.pays ? cacheMonde.v : (cacheMonde = { pays: e.pays, v: ISO.reduce((s, i) => s + e.pays[i].pib, 0) }).v;

// ---------- Score composite ----------
// Cinq familles de qualificatifs à poids égaux. Chaque camp compte son leader (poids 1) et les autres pays pondérés
// par leur alignement ; la part d'une famille est rapportée au total des 194 pays.
const moyenne = (iso: string, attributs: string[]) => attributs.reduce((s, a) => s + (SCORES.pays[iso]?.scores[a] ?? 50), 0) / attributs.length;
const QUALITE: Record<Famille, Record<string, number>> = Object.fromEntries((Object.keys(FAMILLES_ATTRIBUTS) as Famille[]).map(f =>
  [f, Object.fromEntries(ISO.map(i => [i, moyenne(i, f === "population" ? ["Éducation", "Santé", "Urbanisation"] : f === "environnement" ? ["Terre", "Eau", "Air", "Biodiversité", "Forêt"] : FAMILLES_ATTRIBUTS[f].attributs)]))])) as Record<Famille, Record<string, number>>;
const ENV_2000: Record<string, number> = QUALITE.environnement;
export const NOMS_FAMILLES: Record<Famille, string> = { economie: "Économie", population: "Population", ressources: "Matières premières", militaire: "Puissance militaire", environnement: "Environnement" };
function masse(e: EtatPartie, f: Famille, iso: string): number {
  const p = e.pays[iso];
  switch (f) {
    case "economie": return p.pib * QUALITE.economie[iso] / 100;      // PIB × commerce, gestion, finance, infrastructures
    case "population": return p.population * QUALITE.population[iso] / 100; // effectif × éducation, santé, urbanisation
    case "environnement": return p.environnement;                     // pollution locale du pays
    default: return QUALITE[f][iso];                                   // ressources et armée : scores 2000
  }
}
export const poidsCamp = (e: EtatPartie, camp: Camp, iso: string) =>
  iso === "USA" || iso === "CHN" ? (iso === (camp === "OCC" ? "USA" : "CHN") ? 1 : 0) : Math.max(0, (camp === "OCC" ? 1 : -1) * alignement(e, iso));
export function partFamille(e: EtatPartie, camp: Camp, f: Famille): number {
  let num = 0, den = 0;
  for (const i of ISO) { const m = masse(e, f, i); num += m * poidsCamp(e, camp, i); den += m; }
  if (f === "ressources" && e.zones) { // zones stratégiques : une part des ressources mondiales, au prorata de la présence
    const base = den;
    for (const z of ZONES_STRATEGIQUES) { const p = e.zones[z.id], m = z.poids * base; num += m * partZone(p, camp); den += m; }
  }
  return num / den;
}
// ---------- Zones stratégiques (hors des États) : présence de chaque bloc, de 0 à 100 ----------
// Poids : part des ressources mondiales qu'elles représentent, ESTIMATION d'ordre de grandeur (hydrocarbures et minerais
// non découverts de l'Arctique, pêche et minerais de l'Antarctique gelés par le traité, gaz et pêche de la mer de Chine
// méridionale, pétrole du golfe de Guinée). Présence de départ 2000 : estimation (flottes, bases, stations scientifiques).
export interface ZoneStrategique { id: string; nom: string; position: [number, number]; poids: number; depart: Record<Camp, number>; texte: string }
export const ZONES_STRATEGIQUES: ZoneStrategique[] = [
  { id: "arctique", nom: "Arctique", position: [40, 79], poids: 0.04, depart: { OCC: 40, CHN: 0 }, texte: "Routes maritimes polaires et hydrocarbures sous la banquise ; riverains : États-Unis, Canada, Russie, Norvège, Danemark." },
  { id: "antarctique", nom: "Antarctique", position: [60, -72], poids: 0.01, depart: { OCC: 30, CHN: 5 }, texte: "Continent gelé par le traité de 1959 : stations scientifiques, pêche, ressources minérales interdites d'exploitation." },
  { id: "mer_chine_sud", nom: "Mer de Chine méridionale", position: [114, 12], poids: 0.02, depart: { OCC: 30, CHN: 30 }, texte: "Îles Spratleys et Paracels disputées, gaz offshore, un tiers du commerce maritime mondial." },
  { id: "golfe_guinee", nom: "Golfe de Guinée", position: [3, 1], poids: 0.015, depart: { OCC: 20, CHN: 5 }, texte: "Pétrole offshore du Nigeria et de l'Angola, piraterie naissante." },
];
export const partZone = (p: Record<Camp, number> | undefined, camp: Camp) => p ? p[camp] / Math.max(100, p.OCC + p.CHN) : 0;
export const ACTIONS_ZONE = {
  mission: { nom: "Mission scientifique", pa: 1, budget: 1, gain: 6, tension: 0 },
  deploiement: { nom: "Déploiement naval", pa: 2, budget: 2, gain: 12, tension: 1 },
} as const;
export type ActionZone = keyof typeof ACTIONS_ZONE;
export function peutAgirZone(e: EtatPartie, camp: Camp, zone: string, type: ActionZone): string | null {
  const a = ACTIONS_ZONE[type], c = e.camps[camp];
  if (!e.zones[zone]) return "Zone inconnue.";
  if (dispo(c, "defense") < a.pa) return `Points défense insuffisants (${a.pa}).`;
  if (c.budget < a.budget) return `Budget insuffisant (${a.budget}).`;
  if (c.paParPays[`strat:${zone}`]) return "Une action par zone stratégique et par trimestre.";
  return null;
}
export function agirZone(e0: EtatPartie, camp: Camp, zone: string, type: ActionZone): EtatPartie {
  const err = peutAgirZone(e0, camp, zone, type); if (err) throw new Error(err);
  const e = copie(e0), c = e.camps[camp], a = ACTIONS_ZONE[type], z = ZONES_STRATEGIQUES.find(x => x.id === zone)!;
  depenser(c, "defense", a.pa); c.budget = arrondi(c.budget - a.budget); c.paParPays[`strat:${zone}`] = a.pa;
  if (type === "deploiement") c.fatigue = (c.fatigue ?? 0) + 1;
  e.zones[zone][camp] = borne(e.zones[zone][camp] + a.gain * (c.priorite === "securite" ? BONUS_PRIORITE : 1) * (c.technologies?.includes("satellites") ? 1.25 : 1), 0, 100); e.tension = borne(e.tension + a.tension, 0, 100);
  noter(e, { type: "action", titre: `${a.nom} : ${z.nom}`, texte: `Présence ${camp === "OCC" ? "du bloc USA" : "du bloc Chine"} +${arrondi(a.gain * (c.priorite === "securite" ? BONUS_PRIORITE : 1) * (c.technologies?.includes("satellites") ? 1.25 : 1))}.`, camp, visiblePour: [...CAMPS] });
  return e;
}
export function puissance(e: EtatPartie, camp: Camp): number {
  const fams = Object.keys(NOMS_FAMILLES) as Famille[];
  return fams.reduce((s, f) => s + partFamille(e, camp, f), 0) / fams.length;
}
export function bilanBrut(e: EtatPartie): number {
  return 100 * (puissance(e, "OCC") - puissance(e, "CHN")) + (e.camps.OCC.cp - e.camps.CHN.cp) / 10;
}
// Compensation (komi, comme au go) mesurée en IA contre IA pour viser 40 % / 20 % / 40 %. À recalibrer à chaque lot de contenu (test 7).
export const KOMI = FORMATS["2000-2008"].komi, SEUIL_EGALITE = FORMATS["2000-2008"].egalite;
// Progression depuis 2000 (sans jugement sur l'écart à l'histoire), komi au prorata du temps écoulé.
export const progression = (e: EtatPartie) => { const f = formatDe(e); return bilanBrut(e) - e.scoreDepart + f.komi * ((e.termine ? e.round + 1 : e.round) - f.debut) / (f.fin - f.debut + 1); };
// Bilan : moyenne des décomptes annuels (fin de chaque T4) ; avant le premier décompte, la progression courante.
export const bilan = (e: EtatPartie) => e.decomptes.length ? e.decomptes.reduce((a, b) => a + b, 0) / e.decomptes.length : progression(e);

// ---------- Création ----------
function cibleEconomique(e: EtatPartie, iso: string, camp: Camp): number {
  const usa = e.pays.USA.pib, chn = e.pays.CHN.pib;
  const part = camp === "OCC" ? usa / (usa + chn) : chn / (usa + chn);
  const sanction = camp === "OCC" && SANCTIONNES_2000.includes(iso) ? 0.1 : 1;
  const flux = 1 + BONUS_FLUX * Math.min(6, lienFlux(e, iso, camp));
  return Math.min(100, CIBLE_E * part * sanction * flux * (INFLUENCE_2000[iso]?.[camp].commerce ?? 1));
}

// ---------- Flux d'échanges ----------
// Un flux actif (ouvert à la date, sans détroit bloqué) qui relie un pays au leader d'un camp tire l'influence
// économique de ce camp vers le haut : +3 % par point de volume, plafonné à 6 points (+18 %).
const BONUS_FLUX = 0.03;
export function fluxActif(e: EtatPartie, f: Flux): boolean {
  if (f.depuis && date(e.round).annee < f.depuis) return false;
  return !(f.detroits ?? []).some(d => (e.blocages ?? []).some(b => b.detroit === d));
}
export function lienFlux(e: EtatPartie, iso: string, camp: Camp): number {
  const leader = camp === "OCC" ? "USA" : "CHN";
  return FLUX.filter(f => f.pays.includes(iso) && f.pays.includes(leader) && fluxActif(e, f)).reduce((s, f) => s + f.volume, 0)
    + 2 * (e.concessions ?? []).filter(c => c.iso === iso && c.camp === camp).length;
}
// Le plus gros port ou aéroport du pays qui n'est pas déjà sous concession.
export function hubLibre(e: EtatPartie, camp: Camp, iso: string) {
  return hubsDe(iso).filter(h => !(e.concessions ?? []).some(c => c.hub === h.id)).sort((a, b) => b.volume / (b.type === "port" ? 1 : 10) - a.volume / (a.type === "port" ? 1 : 10))[0];
}
// Blocage d'un détroit : les pays qui dépendent des routes qui le traversent perdent de la croissance, selon le volume.
function bloquerDetroit(e: EtatPartie, intensite: number, avant: boolean) {
  const d = choisirPondere(e, DETROITS, DETROITS.map(x => x.poids));
  e.blocages.push({ detroit: d.id, fin: e.round + intensite - 1 });
  const exposition: Record<string, number> = {};
  for (const f of FLUX.filter(f => f.detroits?.includes(d.id))) for (const iso of f.pays) exposition[iso] = Math.max(exposition[iso] ?? 0, f.volume);
  const efs: Effet[] = [{ type: "tension", valeur: 3 }, ...Object.entries(exposition).map(([iso, v]): Effet => ({ type: "croissance", pays: iso, points: -0.15 * v, duree: 2 }))];
  executer(e, rebond(efs, avant, intensite), null, undefined, d.nom, () => intensite);
  const causes = CONTEXTES.blocage_detroit.causes, cause = causes[Math.floor(tirer(e) * causes.length)];
  const routes = FLUX.filter(f => f.detroits?.includes(d.id)).map(f => f.nom.toLowerCase());
  noter(e, { type: "generique", titre: `${d.nom} : passage bloqué`, famille: "blocage_detroit", visiblePour: [...CAMPS], intensite,
    texte: `${cause} Le passage est fermé pour ${intensite} trimestre${intensite > 1 ? "s" : ""} ; routes coupées : ${routes.join(", ")}.`,
    effets: decrire(e, rebond(efs, false, intensite).map(ef => fois(ef, intensite)), null) });
}

export function creerPartie(graine: number, joueur: Camp | null = "OCC", reglages: Reglages = { generiques: true, ia: true }): EtatPartie {
  if (reglages.format === "2008-2035") return depart2008(graine, joueur, reglages);
  const pays: Record<string, EtatPays> = {};
  for (const p of donnees.pays) {
    const t = TRAJ[p.iso3];
    const d = INFLUENCE_2000[p.iso3]; // leaders absents : leur alignement est fixe
    const inf = { OCC: { e: 0, p: d?.OCC.p ?? 0, m: d?.OCC.m ?? 0, c: d?.OCC.c ?? 0 }, CHN: { e: 0, p: d?.CHN.p ?? 0, m: d?.CHN.m ?? 0, c: d?.CHN.c ?? 0 } } as Record<Camp, Record<Canal, number>>;
    pays[p.iso3] = { iso3: p.iso3, population: t.population[0], pib: t.pib[0], stabilite: 50, influence: inf,
      ancre: { OCC: { ...inf.OCC }, CHN: { ...inf.CHN } }, bonus: [], co2Mod: [], environnement: ENV_2000[p.iso3], pibMax: t.pib[0] };
  }
  const e: EtatPartie = {
    version: VERSION_ETAT, graine, alea: graine | 0, round: 0, joueur, pays,
    camps: {
      OCC: { cp: 60, budget: 0, main: [], pa: 0, paParPays: {}, paAchetes: 0, carteJouee: false, briefing: null, doctrine: "internationaliste", reactions: [], typesJoues: [] },
      CHN: { cp: 70, budget: 0, main: [], pa: 0, paParPays: {}, paAchetes: 0, carteJouee: false, briefing: null, doctrine: "développement pacifique", reactions: [], typesJoues: [] },
    },
    tension: 15, co2Cumule: 0, ecartTemp: ECART_2000, drapeaux: [], historiquesFaits: [], briefingsFaits: [],
    pioche: [], defausse: [], retirees: [], attente: [], journal: [], scoreDepart: 0, termine: false, resultat: null, decomptes: [], deficitDepart: { OCC: 0, CHN: 0 }, reglages, conflits: [], blocages: [], concessions: [], paliers: {}, rapprochements: [], contagion: {}, memoire: {}, prets: [], interventions: [], campagnesElectorales: {}, chaines: [], onu: null, blocus: null, guerre: null, zones: Object.fromEntries(ZONES_STRATEGIQUES.map(z => [z.id, { ...z.depart }])),
  };
  for (const iso of ISO) for (const camp of CAMPS) {
    const v = cibleEconomique(e, iso, camp);
    e.pays[iso].influence[camp].e = v; e.pays[iso].ancre[camp].e = v;
  }
  e.pioche = melanger(e, paquet(2000));
  for (const camp of CAMPS) e.camps[camp].budget = budgetTrimestre(e, camp);
  e.scoreDepart = bilanBrut(e);
  for (const camp of CAMPS) e.deficitDepart[camp] = deficitRessources(e, camp);
  return debutRound(e, true);
}

// ---------- Départ réel en 2008 ----------
// L'histoire 2000-2008 est rejouée sans joueur, sans IA ni événements génériques, et tous les événements historiques ont lieu.
// Les écarts que cette relecture ne produit pas sont corrigés par DELTAS_2008 (estimation de jeu, points d'influence ajoutés).
export const DELTAS_2008: { iso: string; camp: Camp; canal: Canal; d: number; raison: string }[] = [
  { iso: "VEN", camp: "OCC", canal: "p", d: -8, raison: "vague rose : Chávez" }, { iso: "BOL", camp: "OCC", canal: "p", d: -6, raison: "vague rose : Morales" },
  { iso: "ECU", camp: "OCC", canal: "p", d: -5, raison: "vague rose : Correa" }, { iso: "NIC", camp: "OCC", canal: "p", d: -4, raison: "vague rose : Ortega" },
  { iso: "VEN", camp: "CHN", canal: "e", d: 4, raison: "prêts contre pétrole" }, { iso: "AGO", camp: "CHN", canal: "e", d: 6, raison: "prêts contre pétrole" },
  { iso: "SDN", camp: "CHN", canal: "e", d: 6, raison: "pétrole soudanais" }, { iso: "ZMB", camp: "CHN", canal: "e", d: 4, raison: "cuivre" },
  { iso: "COD", camp: "CHN", canal: "e", d: 4, raison: "contrat mines contre infrastructures" }, { iso: "ZWE", camp: "CHN", canal: "p", d: 4, raison: "isolement occidental" },
  { iso: "GEO", camp: "OCC", canal: "p", d: 5, raison: "révolution des Roses" }, { iso: "UKR", camp: "OCC", canal: "p", d: 4, raison: "révolution orange" },
  { iso: "RUS", camp: "OCC", canal: "p", d: -6, raison: "discours de Munich" }, { iso: "PAK", camp: "CHN", canal: "m", d: 4, raison: "coopération militaire" },
  { iso: "IND", camp: "OCC", canal: "p", d: 4, raison: "accord nucléaire civil" }, { iso: "VNM", camp: "CHN", canal: "e", d: 3, raison: "commerce frontalier" },
];
let BASE_2008: EtatPartie | null = null;
function depart2008(graine: number, joueur: Camp | null, reglages: Reglages): EtatPartie {
  if (!BASE_2008) {
    let b = creerPartie(2008, null, { generiques: false, ia: false });
    REJEU = true; try { while (b.round < FORMATS["2008-2035"].debut && !b.termine) b = finRound(b); } finally { REJEU = false; }
    for (const x of DELTAS_2008) { const q = b.pays[x.iso]; if (!q) continue; const v = borne(q.influence[x.camp][x.canal] + x.d, 0, 100); q.influence[x.camp][x.canal] = v; q.ancre[x.camp][x.canal] = v; }
    BASE_2008 = b;
  }
  const e = structuredClone(BASE_2008);
  e.graine = graine; e.alea = graine | 0; e.joueur = joueur; e.reglages = reglages;
  e.journal = e.journal.filter(j => j.round === e.round); e.decomptes = [];
  for (const camp of CAMPS) { e.pioche.push(...e.camps[camp].main); e.camps[camp].main = []; }
  e.pioche = melanger(e, [...e.pioche, ...e.defausse]); e.defausse = [];
  for (const camp of CAMPS) { piocher(e, camp, camp, 2); piocher(e, camp, adversaire(camp), 2); piocher(e, camp, "NEUTRE", 2); tirerAgenda(e, camp); }
  // briefings datés d'avant 2008 : réglés par l'histoire réelle, ils ne sont plus proposés
  e.briefingsFaits.push(...TOUS_BRIEFINGS.filter(b => b.declencheur.annee !== undefined && b.declencheur.annee * 4 + (b.declencheur.trimestre ?? 1) < 2008 * 4 + 1 && !e.briefingsFaits.includes(b.id)).map(b => b.id));
  for (const camp of CAMPS) { const b = e.camps[camp].briefing; if (b && e.briefingsFaits.includes(b)) e.camps[camp].briefing = TOUS_BRIEFINGS.find(x => x.camp === camp && !e.briefingsFaits.includes(x.id) && declenche(e, x))?.id ?? null; }
  e.camps.OCC.cp = 50; e.camps.CHN.cp = 70; // estimation : usure de l'Irak et crise financière côté occidental
  for (const camp of CAMPS) e.camps[camp].budget = budgetTrimestre(e, camp);
  e.scoreDepart = bilanBrut(e);
  for (const camp of CAMPS) e.deficitDepart[camp] = deficitRessources(e, camp);
  return e;
}

// Budget versé chaque trimestre : socle + racine du PIB du leader (en milliers de milliards), estimation de jeu calée pour couvrir
// 4 à 5 des 7 actions du trimestre ; l'épargne est plafonnée à 2 trimestres de revenu, assez pour un levier lourd.
export const BUDGET = { socle: 3.5, k: 0.7, report: 2 };
export const budgetTrimestre = (e: EtatPartie, camp: Camp) => arrondi(BUDGET.socle + BUDGET.k * Math.sqrt(e.pays[camp === "OCC" ? "USA" : "CHN"].pib / 1e12));

// ---------- Conditions et effets ----------
function campReel(rel: CampRel, joueur: Camp | null, paysTire: string | undefined, e: EtatPartie): Camp {
  if (rel === "OCC" || rel === "CHN") return rel;
  if (rel === "$joueur") return joueur ?? "OCC";
  if (rel === "$adversaire") return adversaire(joueur ?? "OCC");
  const proche: Camp = paysTire && alignement(e, paysTire) < 0 ? "CHN" : "OCC";
  return rel === "$proche" ? proche : adversaire(proche);
}
function paysCibles(c: CiblePays, paysTire?: string): string[] {
  if (c === "tous") return ISO;
  if (c === "$pays") return paysTire ? [paysTire] : [];
  return (Array.isArray(c) ? c : [c]).filter(i => ISO.includes(i));
}

export function conditionVraie(e: EtatPartie, c: Condition, paysTire?: string): boolean {
  switch (c.type) {
    case "alignement": { const iso = c.pays === "$pays" ? paysTire : c.pays; if (!iso) return false;
      const a = alignement(e, iso); return (c.min === undefined || a >= c.min) && (c.max === undefined || a <= c.max); }
    case "cran": { const k = cran(e); return (c.min === undefined || k >= c.min) && (c.max === undefined || k <= c.max); }
    case "stabilite": { const s = e.pays[c.pays].stabilite; return (c.min === undefined || s >= c.min) && (c.max === undefined || s <= c.max); }
    case "evenement": return e.historiquesFaits.includes(c.id) === c.fait;
    case "drapeau": return e.drapeaux.includes(c.id) === c.present;
  }
}
// Explique une condition non réunie, avec la valeur actuelle (sans présenter un bloc comme « négatif »).
const cote = (x: number, d = 2) => Math.abs(x) < 0.005 ? "neutre" : `${x > 0 ? "USA" : "Chine"} ${Math.abs(x).toFixed(d).replace(".", ",")}`;
export function expliquerCondition(e: EtatPartie, c: Condition, paysTire?: string): string {
  const borne = (min?: number, max?: number, f = (x: number) => String(x)) => [min !== undefined ? `au moins ${f(min)}` : "", max !== undefined ? `au plus ${f(max)}` : ""].filter(Boolean).join(" et ");
  switch (c.type) {
    case "alignement": {
      const iso = c.pays === "$pays" ? paysTire : c.pays;
      if (!iso) return "choisis d'abord un pays cible";
      const a = alignement(e, iso), nom = nomPays(iso);
      const voulu = c.max !== undefined && c.min === undefined ? `${nom} ne doit pas pencher vers le bloc USA de plus de ${cote(c.max)}`
        : c.min !== undefined && c.max === undefined ? `${nom} doit pencher vers le bloc USA d'au moins ${cote(c.min)}` : `alignement de ${nom} entre ${cote(c.min ?? -1)} et ${cote(c.max ?? 1)}`;
      return `${voulu} (actuel : ${cote(a)})`;
    }
    case "cran": return `tension mondiale ${borne(c.min, c.max, x => `cran ${x}`)} (actuel : cran ${cran(e)})`;
    case "stabilite": return `stabilité de ${nomPays(c.pays)} ${borne(c.min, c.max)} (actuelle : ${Math.round(e.pays[c.pays].stabilite)})`;
    case "evenement": { const h = HISTORIQUES.find(x => x.id === c.id); return `${c.fait ? "il faut que" : "il ne faut pas que"} « ${h?.titre ?? c.id} » ait eu lieu`; }
    case "drapeau": return `${c.present ? "il faut" : "il ne faut pas"} avoir fait le choix « ${c.id.replace(/_/g, " ")} »`;
  }
}
export const conditionsManquantes = (e: EtatPartie, cs: Condition[] | undefined, paysTire?: string) =>
  (cs ?? []).filter(c => !conditionVraie(e, c, paysTire)).map(c => expliquerCondition(e, c, paysTire));
export const conditionsVraies = (e: EtatPartie, cs: Condition[] | undefined, paysTire?: string) => (cs ?? []).every(c => conditionVraie(e, c, paysTire));

// Applique un effet maintenant (facteur = intensité ou tirage dans la fourchette).
function appliquer(e: EtatPartie, ef: Effet, joueur: Camp | null, paysTire: string | undefined, facteur = 1) {
  switch (ef.type) {
    case "croissance": for (const i of paysCibles(ef.pays, paysTire)) e.pays[i].bonus.push({ points: ef.points * facteur, reste: ef.duree }); break;
    case "stabilite": for (const i of paysCibles(ef.pays, paysTire)) e.pays[i].stabilite = borne(e.pays[i].stabilite + ef.valeur * facteur, 0, 100); break;
    case "influence":
      for (const i of paysCibles(ef.pays, paysTire)) if (i !== "USA" && i !== "CHN") {
        const camp = campReel(ef.camp, joueur, i, e); // $proche / $lointain : selon le pays touché
        const p = e.pays[i]; p.influence[camp][ef.canal] = borne(p.influence[camp][ef.canal] + ef.valeur * facteur, 0, 100);
      } break;
    case "tension": e.tension = borne(e.tension + ef.valeur * facteur, 0, 100); break;
    case "cp": { const camp = campReel(ef.camp, joueur, paysTire, e); e.camps[camp].cp = borne(e.camps[camp].cp + ef.valeur * facteur, 0, 100); break; }
    case "budget": { const camp = campReel(ef.camp, joueur, paysTire, e); e.camps[camp].budget = Math.max(0, e.camps[camp].budget + ef.valeur * facteur); break; }
    case "co2": for (const i of paysCibles(ef.pays, paysTire)) e.pays[i].co2Mod.push({ pourcent: ef.pourcent * facteur, reste: ef.duree }); break;
    case "drapeau": if (!e.drapeaux.includes(ef.id)) e.drapeaux.push(ef.id); break;
  }
}

// Programme ou applique une liste d'effets ; les effets à délai partent dans la file d'attente.
function executer(e: EtatPartie, effets: Effet[], joueur: Camp | null, paysTire: string | undefined, source: string, facteur: () => number) {
  for (const ef of effets) {
    if (ef.delai && ef.delai > 0) e.attente.push({ round: e.round + ef.delai, effet: ef, joueur, paysTire, source, cache: !!ef.cache, facteur: facteur() });
    else appliquer(e, ef, joueur, paysTire, facteur());
  }
}
function programmerCaches(e: EtatPartie, caches: { probabilite: number; effets: Effet[] }[] | undefined, joueur: Camp, paysTire: string | undefined, source: string) {
  for (const c of caches ?? []) if (tirer(e) < c.probabilite)
    for (const ef of c.effets) e.attente.push({ round: e.round + Math.max(1, ef.delai ?? 1), effet: ef, joueur, paysTire, source, cache: true, facteur: 1 });
}

function noter(e: EtatPartie, j: Omit<EntreeJournal, "round">) { e.journal.push({ round: e.round, ...j }); }
const visibleDans = (e: EtatPartie, isos: string[]): Camp[] =>
  CAMPS.filter(c => isos.length === 0 || isos.some(i => i === "USA" || i === "CHN" || influenceTotale(e.pays[i], c) >= 20));

// ---------- Début de round : effets différés, événements, briefings, main ----------
export function debutRound(e0: EtatPartie, dejaCopie = false): EtatPartie {
  const e = dejaCopie ? e0 : structuredClone(e0);
  const { annee, trimestre } = date(e.round);
  // 1. effets différés arrivés à échéance
  const dus = e.attente.filter(a => a.round <= e.round);
  e.attente = e.attente.filter(a => a.round > e.round);
  for (const a of dus) {
    appliquer(e, a.effet, a.joueur, a.paysTire, a.facteur);
    if (a.cache) noter(e, { type: "cache", titre: `Conséquence : ${a.source}`, texte: decrireEffet(e, a.effet, a.joueur, a.paysTire), visiblePour: a.joueur ? [a.joueur] : [...CAMPS], camp: a.joueur ?? undefined });
  }
  e.conflits = e.conflits.filter(c => c.fin >= e.round);
  e.blocages = e.blocages.filter(b => b.fin >= e.round);
  e.concessions = e.concessions.filter(c => c.fin >= e.round);
  if (e.blocus && e.blocus.fin < e.round) e.blocus = null;
  for (const z of Object.values(e.zones)) for (const c of CAMPS) z[c] = Math.max(0, z[c] - 0.25); // usure : une présence s'entretient
  // 2. événements historiques du trimestre
  for (const h of HISTORIQUES.filter(h => h.annee === annee && h.trimestre === trimestre)) {
    const ok = conditionsVraies(e, h.conditions);
    const p = h.probabilite !== undefined ? (ok ? h.probabilite : 0) : !h.deviable || REJEU ? 1 : ok ? 0.9 : 0.1; // le départ 2008 rejoue l'histoire réelle
    if (tirer(e) < p) {
      e.historiquesFaits.push(h.id);
      executer(e, h.effets, null, undefined, h.titre, () => 1);
      if (h.conflit) for (const iso of h.conflit.pays) e.conflits.push({ iso, titre: h.titre, fin: e.round + h.conflit.duree - 1 });
      const reactif = h.pays.includes("USA") && h.pays.includes("CHN") || h.effets.some(ef => (ef.type === "stabilite" && ef.valeur < 0) || (ef.type === "croissance" && ef.points < 0));
      noter(e, { type: "historique", titre: h.titre, texte: h.texte, famille: h.famille, source: h.id, pays: h.pays, visiblePour: [...CAMPS], effets: decrire(e, h.effets, null), reactif });
    } else if (h.probabilite === undefined) { // une projection qui n'a pas lieu passe inaperçue
      if (h.compensationSiAbsent) executer(e, h.compensationSiAbsent, null, undefined, h.titre, () => 1);
      noter(e, { type: "historique", source: h.id, titre: `L'histoire dévie : ${h.titre.toLowerCase()} n'a pas lieu`, texte: ok ? "Le hasard en a décidé autrement (10 % de chances de déviation même quand les conditions sont réunies)." : `Condition réelle qui manque dans votre partie : ${conditionsManquantes(e, h.conditions).join(" ; ")}.`, famille: h.famille, pays: h.pays, visiblePour: [...CAMPS] });
    }
  }
  // 3. événements génériques calibrés, crises en chaîne, rumeurs, session de l'ONU
  if (e.reglages.generiques) { tirerGeneriques(e); declencherChaines(e); }
  rumeurs(e);
  if (trimestre === 2) ouvrirSessionOnu(e);
  // 4. budget du trimestre (épargne plafonnée) et main en début d'année
  if (e.round > 0) for (const camp of CAMPS) { const q = budgetTrimestre(e, camp); e.camps[camp].budget = arrondi(Math.min(e.camps[camp].budget, BUDGET.report * q) + q); }
  if (trimestre === 1 && annee === 2009) { e.pioche = melanger(e, paquet(2009).filter(id => !e.retirees.includes(id))); e.defausse = []; } // nouveau paquet de l'ère 2
  if (trimestre === 1) for (const camp of CAMPS) {
    // main annuelle : 2 cartes de son camp, 2 adverses, 2 neutres ; les cartes non jouées de l'an passé sont défaussées
    const c = e.camps[camp];
    e.defausse.push(...c.main); c.main = []; c.typesJoues = [];
    piocher(e, camp, camp, 2); piocher(e, camp, adversaire(camp), 2); piocher(e, camp, "NEUTRE", 2);
    tirerAgenda(e, camp);
  }
  // 5. briefings déclenchés
  for (const camp of CAMPS) {
    const c = e.camps[camp]; c.points = pointsDeBase(); c.pa = 0; c.paParPays = {}; c.paAchetes = 0; c.carteJouee = false; c.reactions = [];
    c.briefing = TOUS_BRIEFINGS.find(b => b.camp === camp && !e.briefingsFaits.includes(b.id) && declenche(e, b))?.id ?? null;
  }
  return e;
}

function declenche(e: EtatPartie, b: Briefing): boolean {
  const d = b.declencheur, { annee, trimestre } = date(e.round);
  if (d.annee !== undefined && (annee < d.annee || (annee === d.annee && trimestre < (d.trimestre ?? 1)))) return false;
  if (d.evenement && !e.historiquesFaits.includes(d.evenement)) return false;
  if (d.evenement && d.annee === undefined) {
    const h = HISTORIQUES.find(x => x.id === d.evenement)!;
    if (annee * 4 + trimestre - (h.annee * 4 + h.trimestre) > 4) return false; // briefing périmé après un an
  }
  return conditionsVraies(e, d.conditions);
}

// Pioche d'un type de cartes (bloc USA, bloc Chine ou neutre) ; la défausse de ce type est remélangée si besoin.
function piocher(e: EtatPartie, camp: Camp, type: Camp | "NEUTRE", n: number) {
  const indice = () => { for (let k = e.pioche.length - 1; k >= 0; k--) if (CARTES[e.pioche[k]].camp === type) return k; return -1; };
  for (let i = 0; i < n; i++) {
    let k = indice();
    if (k < 0) {
      const remises = e.defausse.filter(id => CARTES[id].camp === type);
      if (!remises.length) return;
      e.defausse = e.defausse.filter(id => CARTES[id].camp !== type);
      e.pioche.unshift(...melanger(e, remises)); k = indice();
    }
    e.camps[camp].main.push(e.pioche.splice(k, 1)[0]);
  }
}
export const typeCarte = (camp: Camp, id: string): TypeCarte => { const c = CARTES[id].camp; return c === camp ? "camp" : c === "NEUTRE" ? "neutre" : "adverse"; };
// Obligation annuelle : jouer au moins une carte de chaque type présent dans la main. Quand il reste autant de types
// manquants que de trimestres, la carte jouée doit être d'un type manquant.
export function typesManquants(e: EtatPartie, camp: Camp): TypeCarte[] {
  const c = e.camps[camp], dansMain = new Set(c.main.map(id => typeCarte(camp, id)));
  return (["camp", "adverse", "neutre"] as TypeCarte[]).filter(t => !c.typesJoues.includes(t) && dansMain.has(t));
}
export function carteObligatoire(e: EtatPartie, camp: Camp): boolean {
  const { trimestre } = date(e.round);
  return !e.camps[camp].carteJouee && typesManquants(e, camp).length >= 5 - trimestre;
}
export function peutJouerCarte(e: EtatPartie, camp: Camp, id: string): string | null {
  const c = e.camps[camp];
  if (c.carteJouee) return "Une carte a déjà été jouée ce trimestre.";
  if (!c.main.includes(id)) return "Carte absente de la main.";
  const manque = typesManquants(e, camp);
  if (carteObligatoire(e, camp) && !manque.includes(typeCarte(camp, id))) return `Cette année, il te faut encore jouer une carte ${manque.map(t => NOMS_TYPES[t]).join(" et une carte ")}.`;
  return null;
}

const multiplicateurClimat = (e: EtatPartie) => Math.max(0.5, 1 + 0.6 * (e.ecartTemp - 1));

function poidsRisque(e: EtatPartie, m: ModeleGenerique, iso: string): number {
  // Base : un poids par pays (les coups d'État ne suivent pas la population) ; « population » l'atténue en racine carrée.
  const p = e.pays[iso];
  let w = 1;
  const yUSA = pibParHab(e.pays.USA), y = pibParHab(p);
  for (const r of m.risque) switch (r) {
    case "pauvrete": w *= Math.sqrt(yUSA / y); break;
    case "richesse": w *= Math.sqrt(y / yUSA); break;
    case "instabilite": w *= ((100 - p.stabilite) / 50) ** 2; break;
    case "cyclone": case "seisme": case "volcan": case "secheresse": w *= EXPOSITION[r].includes(iso) ? 1 : 0.05; break;
    case "petrole": w *= PETROLE[iso] / PETROLE_TOTAL + 0.005; break;
    case "population": w *= Math.sqrt(p.population / POP_MOYENNE_2000); break;
    case "democratie": w *= NON_DEMOCRATIES_2000.includes(iso) ? 0.1 : 1; break;
    default: break;
  }
  return w;
}

// Cinq niveaux de gravité : coefficient appliqué aux effets du modèle.
export const GRAVITES = [0.5, 1, 1.5, 2, 3];
export const NOMS_GRAVITE: Record<number, string> = { 0.5: "mineur", 1: "modéré", 1.5: "sérieux", 2: "grave", 3: "majeur" };
// Plafond réaliste par pays et par an : 3 événements génériques au plus, et pas deux fois la même famille
// (le tirage passe alors à un autre pays ; la fréquence mondiale ne change pas).
export const MAX_GENERIQUES_PAYS_AN = 3;
function tirerGeneriques(e: EtatPartie) {
  const debutAn = e.round - (e.round % 4), deja: Record<string, string[]> = {};
  for (let i = e.journal.length - 1; i >= 0 && e.journal[i].round >= debutAn; i--) {
    const j = e.journal[i]; if (j.type === "generique" && j.pays?.length === 1 && j.famille) (deja[j.pays[0]] ??= []).push(j.famille);
  }
  for (const f of FAMILLES) {
    const modeles = MODELES_PAR_FAMILLE[f.id]; if (!modeles) continue;
    const n = poisson(e, (f.taux / 4) * (f.climat ? multiplicateurClimat(e) : 1));
    for (let k = 0; k < n; k++) {
      const m = modeles[Math.floor(tirer(e) * modeles.length)];
      // gravité : les incidents mineurs (½) sont les plus fréquents quand la famille en a une version ; les crises graves sont rares
      const intensite = MINEURS[f.id] && !(f.monde || m.risque.includes("monde")) ? choisirPondere(e, GRAVITES, [0.4, 0.3, 0.15, 0.1, 0.05]) : choisirPondere(e, GRAVITES.slice(1), [0.5, 0.25, 0.17, 0.08]);
      const avant = e.round < 92; // avant 2023 : la trajectoire réelle contient déjà les chocs, l'écart est temporaire
      if (f.id === "blocage_detroit") { bloquerDetroit(e, Math.ceil(intensite), avant); continue; }
      if (f.monde || m.risque.includes("monde")) {
        const h = habiller(e, f.id, m);
        executer(e, rebond(m.effets, avant, intensite), null, undefined, h.titre, () => intensite);
        noter(e, { type: "generique", titre: h.titre, texte: h.texte, famille: f.id, visiblePour: [...CAMPS], intensite,
          effets: decrire(e, rebond(m.effets, false, intensite).map(ef => fois(ef, intensite)), null) });
        continue;
      }
      if (tirer(e) < PART_HORS_50) {
        noter(e, { type: "generique", titre: `${f.nom} hors des pays suivis`, texte: "Un événement de ce type touche un pays non simulé.", famille: f.id, visiblePour: [] });
        continue;
      }
      const poids = ISO.map(i => (deja[i]?.length ?? 0) >= MAX_GENERIQUES_PAYS_AN || deja[i]?.includes(f.id) ? 0 : poidsRisque(e, m, i));
      if (!poids.some(x => x > 0)) continue;
      const iso = choisirPondere(e, ISO, poids);
      (deja[iso] ??= []).push(f.id);
      const h = habiller(e, f.id, m, iso, intensite < 1);
      executer(e, rebond(m.effets, avant, intensite, resilience(e, iso)), null, iso, h.titre, () => intensite);
      const reactif = intensite >= 1 && m.effets.some(ef => (ef.type === "stabilite" && ef.valeur < 0) || (ef.type === "croissance" && ef.points < 0));
      noter(e, { type: "generique", titre: h.titre + (intensite > 1 ? ` (${NOMS_GRAVITE[intensite]})` : ""), mineur: intensite < 1 || undefined,
        texte: h.texte, famille: f.id, pays: [iso], visiblePour: visibleDans(e, [iso]), intensite, reactif,
        effets: decrire(e, rebond(m.effets, false, intensite, resilience(e, iso)).map(ef => fois(ef, intensite)), null, iso) });
      const duree = DUREE_CONFLIT[f.id];
      if (duree && intensite >= 1) e.conflits.push({ iso, titre: h.titre, fin: e.round + Math.round(duree * intensite) - 1 });
    }
  }
}
// Conflits armés : durée en trimestres par point d'intensité (symbole ⚔ sur la carte).
const DUREE_CONFLIT: Record<string, number> = { guerre_civile: 4, guerre_interetatique: 2, conflit_frontalier: 1 };
// Habillage : un titre et une cause tirés pour la famille, une ville réelle du pays, des prépositions justes.
function habiller(e: EtatPartie, famille: string, m: ModeleGenerique, iso?: string, mineur = false): { titre: string; texte: string } {
  const ctx = mineur && MINEURS[famille] ? MINEURS[famille] : CONTEXTES[famille], villes = iso ? VILLES[iso] ?? [nomPays(iso)] : [];
  const ville = villes.length ? villes[Math.floor(tirer(e) * villes.length)] : "";
  const remplir = (t: string) => iso ? t.split("{ville}").join(ville).split("{en_pays}").join(enPays(iso, nomPays(iso)))
    .split("{du_pays}").join(duPays(iso, nomPays(iso))).split("{pays}").join(nomPays(iso)) : t;
  if (!ctx) return { titre: remplir(m.titre), texte: remplir(m.texte) };
  const titre = ctx.titres[Math.floor(tirer(e) * ctx.titres.length)], cause = ctx.causes[Math.floor(tirer(e) * ctx.causes.length)];
  if (mineur && MINEURS[famille]) return { titre: remplir(titre), texte: remplir(cause) };
  return { titre: remplir(titre), texte: `${remplir(m.texte)} ${remplir(cause)}` };
}
// Avant 2023, un choc de croissance générique est suivi d'un rebond égal : le niveau du PIB revient sur la trajectoire réelle.
// Rebond b tel que (1 - a)(1 + b) = 1 sur la même durée (a = choc annuel × intensité) : le niveau revient exactement à l'écart de second ordre près.
// Les génériques sont un bruit de fond : sans amortissement, ils apportaient +6,7 de tension et -1,5 de stabilité
// par pays et par trimestre (tension 79/100 et stabilité moyenne 32 en 2008). Calibrage : équilibre vers tension 30, stabilité 42.
const AMORTI_GENERIQUE = { tension: 0.3, stabilite: 0.25 };
// Résilience : une grande économie diversifiée encaisse mieux un choc local (racine quatrième du rapport au PIB moyen).
const resilience = (e: EtatPartie, iso: string) => Math.min(1, Math.pow(pibMonde(e) / ISO.length / e.pays[iso].pib, 0.25));
function rebond(effets0: Effet[], avant: boolean, intensite: number, amorti = 1): Effet[] {
  const effets = effets0.map((ef): Effet => ef.type === "tension" ? { ...ef, valeur: ef.valeur * AMORTI_GENERIQUE.tension }
    : ef.type === "stabilite" ? { ...ef, valeur: ef.valeur * AMORTI_GENERIQUE.stabilite }
    : ef.type === "croissance" ? { ...ef, points: ef.points * amorti } : ef);
  if (!avant) return effets;
  return effets.flatMap((ef): Effet[] => {
    if (ef.type !== "croissance") return [ef];
    const a = -ef.points * intensite / 100, retour = (100 * a / (1 - a)) / intensite;
    return [ef, { ...ef, points: retour, delai: (ef.delai ?? 0) + ef.duree }];
  });
}

// ---------- Actions du joueur (et de l'IA) ----------
export type Usage = "evenement" | "points";
export interface ChoixCarte { carte: string; usage: Usage; mode?: number; pays?: string }

export function peutJouerMode(e: EtatPartie, camp: Camp, idCarte: string, mode: number, pays?: string): string | null {
  const c = CARTES[idCarte], m = c.modes[mode];
  if (!m) return "Mode inconnu.";
  if (c.camp !== camp && c.camp !== "NEUTRE") return "Événement adverse : jouable seulement pour ses points.";
  if (m.cible === "pays" && (!pays || pays === "USA" || pays === "CHN")) return "Choisis un pays cible (hors leaders).";
  if ((m.cout.budget ?? 0) > e.camps[camp].budget) return "Budget insuffisant.";
  if ((m.cout.cp ?? 0) > e.camps[camp].cp) return "Capital politique insuffisant.";
  if (!conditionsVraies(e, m.conditions, pays)) return `Condition non réunie : ${conditionsManquantes(e, m.conditions, pays).join(" ; ")}.`;
  return null;
}

export function jouerCarte(e0: EtatPartie, camp: Camp, choix: ChoixCarte): EtatPartie {
  const e = copie(e0), c = e.camps[camp], carteJ = CARTES[choix.carte];
  const errCarte = peutJouerCarte(e, camp, choix.carte); if (errCarte) throw new Error(errCarte);
  c.typesJoues.push(typeCarte(camp, choix.carte));
  if (choix.usage === "evenement") {
    const err = peutJouerMode(e, camp, choix.carte, choix.mode ?? 0, choix.pays); if (err) throw new Error(err);
    declencherCarte(e, camp, carteJ, choix.mode ?? 0, choix.pays);
  } else {
    c.pa += carteJ.valeur;
    noter(e, { type: "carte", titre: `${carteJ.titre} jouée pour ${carteJ.valeur} point${carteJ.valeur > 1 ? "s" : ""} d'action`, texte: carteJ.texte, camp, visiblePour: [...CAMPS] });
    if (carteJ.camp === adversaire(camp)) { // l'événement adverse se déclenche quand même
      const best = meilleurMode(e, adversaire(camp), carteJ);
      if (best) declencherCarte(e, adversaire(camp), carteJ, best.mode, best.pays, true);
    }
  }
  c.main = c.main.filter(x => x !== choix.carte);
  if (carteJ.type === "unique" && choix.usage === "evenement") e.retirees.push(carteJ.id); else e.defausse.push(carteJ.id);
  c.carteJouee = true;
  return e;
}

function declencherCarte(e: EtatPartie, camp: Camp, c: Carte, mode: number, pays: string | undefined, parAdversaire = false) {
  const m = c.modes[mode], cc = e.camps[camp];
  cc.budget -= m.cout.budget ?? 0; cc.cp = borne(cc.cp - (m.cout.cp ?? 0), 0, 100);
  executer(e, m.effets, camp, pays, c.titre, () => 0.7 + 0.6 * tirer(e));
  programmerCaches(e, m.caches, camp, pays, c.titre);
  noter(e, { type: "carte", titre: `${c.titre} : ${m.nom}${pays ? ` (${nomPays(pays)})` : ""}`, camp,
    texte: parAdversaire ? "Carte jouée pour ses points par l'adversaire : son événement se déclenche quand même au profit de son camp." : c.texte,
    pays: pays ? [pays] : undefined, visiblePour: [...CAMPS], joueParCamp: parAdversaire ? adversaire(camp) : camp, effets: decrire(e, m.effets, camp, pays, 0.3).concat(m.caches?.length ? ["Conséquences cachées possibles"] : []) });
}

export type TypeAction = "politique" | "culturelle" | "economique" | "militaire" | "contre" | "developpement" | "armes" | "exercices" | "clandestin" | "destabiliser" | "espionnage" | "infrastructure"
  | "pret" | "electorale" | "intimidation" | "soutien" | "putsch" | "intervention" | "garantie";
export const ACTIONS: Record<TypeAction, { nom: string; pa: number; budget: number; famille?: "militaire" | "secret"; aide?: string }> = {
  politique: { nom: "Influence politique", pa: 1, budget: 0 },
  culturelle: { nom: "Influence culturelle", pa: 1, budget: 0 },
  economique: { nom: "Influence économique", pa: 1, budget: 1 },
  militaire: { nom: "Base militaire", pa: 2, budget: 1, famille: "militaire" },
  contre: { nom: "Contre-influence", pa: 2, budget: 0 },
  developpement: { nom: "Développement", pa: 2, budget: 2 },
  armes: { nom: "Vente d'armes", pa: 1, budget: 0, famille: "militaire", aide: "Influence militaire +6, économique +2 ; rapporte jusqu'à 1 de budget selon la taille de l'économie cliente ; tension +0,5. Le pays ne doit pas pencher vers l'adversaire." },
  exercices: { nom: "Exercices conjoints", pa: 1, budget: 1, famille: "militaire", aide: "Influence militaire +5, stabilité du pays +2 ; tension +1. Le pays doit pencher vers toi." },
  clandestin: { nom: "Soutien clandestin", pa: 1, budget: 1, famille: "secret", aide: "Influence politique +7, invisible pour l'adversaire. 25 % de risque d'être révélé : influence politique −10, capital politique −3, tension +1." },
  destabiliser: { nom: "Déstabilisation", pa: 2, budget: 2, famille: "secret", aide: "Stabilité −8, influence adverse politique −6 et économique −3. 35 % de risque d'être révélé : influence politique −8, capital politique −5, tension +2." },
  infrastructure: { nom: "Investir dans un port ou un aéroport", pa: 1, budget: 2, aide: "Concession de 4 ans sur le principal port ou aéroport du pays : influence économique +6 et lien de flux +2 avec ton bloc tant qu'elle dure." },
  pret: { nom: "Prêt d'État", pa: 1, budget: 4, aide: "Influence économique +6 et politique +3. Remboursé avec intérêts (budget +5) au bout de 3 ans, sauf défaut : le risque, caché, croît avec l'instabilité du pays ; un défaut se solde par une saisie d'actifs (concession, mais rancune) ou par une annulation (gratitude)." },
  electorale: { nom: "Soutenir une campagne électorale", pa: 1, budget: 1, aide: "Possible dans l'année qui précède une élection : chaque soutien pèse sur le résultat. Le gagnant du scrutin penche nettement vers le bloc qui a le plus soutenu (influence politique +6, −4 pour l'autre)." },
  intimidation: { nom: "Manœuvres d'intimidation", pa: 1, budget: 1, famille: "militaire", aide: "Démonstration de force : si le pays ne penche pas vers l'adversaire, il plie (influence politique +5) ; sinon il se braque (−2 et rancune). Capital politique adverse −2, tension +3, 15 % de risque d'incident. Il faut une influence militaire d'au moins 15 dans le pays ou un voisin." },
  soutien: { nom: "Soutenir un camp dans le conflit", pa: 2, budget: 2, famille: "militaire", aide: "Armes, conseillers, frappes : influence militaire +8 et politique +4, tension +2. Dans un pays en conflit : conflit raccourci de 2 trimestres, ou guerre par procuration si l'adversaire soutient aussi (tension +3, conflit rallongé). Sinon, soutien à l'opposition d'un pays qui ne penche pas vers toi : stabilité −4 et rancune." },
  putsch: { nom: "Fomenter un putsch", pa: 2, budget: 4, famille: "secret", aide: "Pays instable (stabilité < 40) seulement. 45 % de réussite : un régime ami (influence politique 60, adverse 15), stabilité −15. Échec : stabilité −5, et 70 % de risque d'être démasqué : scandale, capital politique −6, tension +5, rancune dans le pays et chez ses voisins. Il faut d'abord avoir intimidé le pays." },
  garantie: { nom: "Garantie de défense", pa: 2, budget: 3, famille: "militaire", aide: "Dernier cran de la coopération : alliance formelle. Influence militaire +10 et politique +6, ses voisins se rapprochent de toi ; l'adversaire ne peut plus y intervenir et toute pression sur ce pays lui coûte plus de tension. Le pays doit pencher vers toi d'au moins 0,40." },
  intervention: { nom: "Intervention armée", pa: 2, budget: 8, famille: "militaire", aide: "Capital politique 55 requis (−5). Conflit de 8 trimestres, coût 1 budget par trimestre, tension +10, stabilité −20, rancune ; influence militaire +15, influence militaire et politique adverses −10. Issue cachée selon le rapport des forces militaires : régime ami (politique +15) ou enlisement (politique −10, capital politique −8)." },
  espionnage: { nom: "Espionnage économique", pa: 1, budget: 0, famille: "secret", aide: "Influence économique +4 et adverse −3, rapporte 0,5 de budget. 20 % de risque d'être révélé : influence économique −6, capital politique −2." },
};
export const AIDES_ACTIONS: Partial<Record<TypeAction, string>> = {
  politique: "Influence politique +8 (moins si déjà forte).", culturelle: "Influence culturelle +4.", economique: "Influence économique +8.",
  militaire: "Base militaire : influence militaire +10, tension +1. Le pays doit pencher vers toi (0,2).", contre: "Influence politique adverse −5.",
  developpement: "Croissance du pays +0,5 pt pendant 4 trimestres, influence économique +3.",
};

export function peutAgir(e: EtatPartie, camp: Camp, type: TypeAction, iso: string): string | null {
  const a = ACTIONS[type], c = e.camps[camp];
  if (iso === "USA" || iso === "CHN") return "Les leaders ne sont pas des cibles.";
  const dom = DOMAINE_ACTION[type];
  if (dispo(c, dom) < a.pa) return `Points ${DOMAINES[dom].nom.toLowerCase()} insuffisants (${a.pa} requis ; reste ${c.points?.[dom] ?? 0} + ${c.pa} de crise).`;
  if (c.budget < a.budget) return "Budget insuffisant.";
  const ech = echelleDe(type);
  if (ech) { const k = ECHELLES[ech.echelle].indexOf(type), cr = c.crans?.[iso]?.[ech.echelle] ?? 0;
    if (k > cr) return `Échelle de ${ech.echelle === "coop" ? "coopération" : "coercition"} : il faut d'abord « ${ACTIONS[ECHELLES[ech.echelle][cr]].nom} » dans ce pays.`; }
  if (type === "putsch" && (c.crans?.[iso]?.coer ?? 0) < 1) return "Putsch : il faut d'abord avoir intimidé ce pays (échelle de coercition).";
  const garant = e.garanties?.find(g => g.iso === iso && g.camp !== camp);
  if (garant && (type === "intervention" || type === "putsch")) return "Ce pays est sous garantie de défense adverse : ce serait une guerre ouverte.";
  if (type === "garantie" && (camp === "OCC" ? 1 : -1) * alignement(e, iso) < 0.4) return "Garantie de défense : le pays doit pencher vers toi d'au moins 0,40.";
  if (type === "garantie" && e.garanties?.some(g => g.iso === iso && g.camp === camp)) return "Garantie déjà accordée.";
  if ((c.paParPays[iso] ?? 0) + a.pa > MAX_PA_PAR_PAYS) return "Maximum 2 points par pays et par trimestre.";
  const vers = (camp === "OCC" ? 1 : -1) * alignement(e, iso), nomA = camp === "OCC" ? "USA" : "Chine";
  if (type === "militaire" && vers < 0.2) return `Base militaire : le pays doit pencher vers ton bloc d'au moins 0,20 (actuel : ${vers >= 0 ? `${nomA} ${vers.toFixed(2).replace(".", ",")}` : `vers l'adversaire ${(-vers).toFixed(2).replace(".", ",")}`}).`;
  if (type === "exercices" && vers < 0.1) return `Exercices conjoints : le pays doit pencher vers ton bloc d'au moins 0,10 (actuel : ${vers >= 0 ? `${nomA} ${vers.toFixed(2).replace(".", ",")}` : `vers l'adversaire ${(-vers).toFixed(2).replace(".", ",")}`}).`;
  if (type === "infrastructure") {
    const h = hubLibre(e, camp, iso);
    if (!hubsDe(iso).length) return "Ce pays n'a pas de grand port ni de grand aéroport dans le jeu.";
    if (!h) return "Tous ses ports et aéroports sont déjà sous concession.";
    if (vers < -0.3) return "Le pays penche trop vers l'adversaire pour t'accorder une concession.";
  }
  if (type === "electorale") { const el = electionProchaine(e, iso); if (!el) return "Aucune élection dans ce pays dans l'année qui vient."; }
  if (type === "intimidation" && Math.max(e.pays[iso].influence[camp].m, ...prochesDe(e, iso).voisins.map(v => e.pays[v].influence[camp].m)) < 15) return "Intimidation : il faut une influence militaire d'au moins 15 dans le pays ou chez un voisin.";
  if (type === "soutien" && !e.conflits.some(x => x.iso === iso) && (camp === "OCC" ? 1 : -1) * alignement(e, iso) >= 0.1) return "Soutien armé : seulement dans un pays en conflit, ou à l'opposition d'un pays qui ne penche pas vers toi.";
  if (type === "putsch" && e.pays[iso].stabilite >= 40) return `Putsch : le pays doit être instable (stabilité < 40 ; actuelle : ${Math.round(e.pays[iso].stabilite)}).`;
  if (type === "intervention") {
    if (c.cp < 55) return `Intervention : capital politique 55 requis (actuel : ${Math.floor(c.cp)}).`;
    if (e.interventions.some(x => x.iso === iso)) return "Une intervention est déjà en cours dans ce pays.";
    if (vers >= 0.4) return "On n'envahit pas un allié.";
  }
  if (type === "armes" && vers < -0.2) return `Vente d'armes : le pays penche trop vers l'adversaire (${(-vers).toFixed(2).replace(".", ",")} ; limite 0,20).`;
  return null;
}

export function agir(e0: EtatPartie, camp: Camp, type: TypeAction, iso: string, apercu = false): EtatPartie {
  const err = peutAgir(e0, camp, type, iso); if (err) throw new Error(err);
  const e = copie(e0), c = e.camps[camp], a = ACTIONS[type], inf = e.pays[iso].influence[camp];
  depenser(c, DOMAINE_ACTION[type], a.pa); c.budget = arrondi(c.budget - a.budget); c.paParPays[iso] = (c.paParPays[iso] ?? 0) + a.pa;
  const ech = echelleDe(type);
  if (ech) { const cr = ((c.crans ??= {})[iso] ??= { coop: 0, coer: 0, round: e.round }); cr[ech.echelle] = Math.max(cr[ech.echelle], ECHELLES[ech.echelle].indexOf(type) + 1); cr.round = e.round; if (ech.echelle === "coop") cr.rCoop = e.round; else cr.rCoer = e.round; }
  if (type === "putsch") { const cr = ((c.crans ??= {})[iso] ??= { coop: 0, coer: 0, round: e.round }); cr.rCoer = e.round; }
  if ((type === "intimidation" || type === "soutien") && e.garanties?.some(g => g.iso === iso && g.camp !== camp)) e.tension = borne(e.tension + 3, 0, 100);
  const bonus = bonusPriorite(c, type) * boostCommerce(iso, camp, type), su = (c.suite ??= {})[iso];
  const n = !su ? 0 : su.round === e.round ? su.n : su.round === e.round - 1 ? Math.min(3, su.n + 1) : 0; // investissement durable
  c.suite[iso] = { round: e.round, n };
  const durable = 1 + DURABLE * n;
  if (a.famille === "militaire" && type !== "intervention") c.fatigue = (c.fatigue ?? 0) + (type === "armes" ? 0.5 : 1);
  if (type === "developpement") memoriser(e, iso, camp, 1);
  if (type === "destabiliser") memoriser(e, iso, camp, -2);
  // court et long terme : 2/3 du gain tout de suite, 1/3 étalé sur les 4 trimestres suivants (atténué comme le gain immédiat)
  const gain = (canal: Canal, k: number) => {
    const g = k * bonus * (1 - inf[canal] / 100);
    inf[canal] = borne(inf[canal] + g * PART_IMMEDIATE, 0, 100);
    for (let r = 1; r <= DIFFERE.duree; r++) e.attente.push({ round: e.round + r, effet: { type: "influence", pays: iso, camp, canal, valeur: g * durable * (1 - PART_IMMEDIATE) / DIFFERE.duree }, joueur: camp, source: a.nom, cache: false, facteur: 1 });
    // part cachée, d'espérance nulle : 10 % de chances d'un contrecoup, 10 % d'un succès inattendu (±1/3 du gain), au bout de 2 trimestres
    if (!apercu && a.famille !== "secret") { const t = tirer(e); if (t < 2 * DIFFERE.cache) e.attente.push({ round: e.round + 2, effet: { type: "influence", pays: iso, camp, canal, valeur: (t < DIFFERE.cache ? -1 : 1) * g / 3 }, joueur: camp, source: `${a.nom} (${nomPays(iso)}) : ${t < DIFFERE.cache ? "contrecoup" : "succès inattendu"}`, cache: true, facteur: 1 }); }
  };
  if (type === "politique") gain("p", 8);
  if (type === "culturelle") gain("c", 4);
  if (type === "economique") gain("e", 8);
  if (type === "militaire") { gain("m", 10); e.tension = borne(e.tension + 1, 0, 100); }
  if (type === "contre") { const adv = e.pays[iso].influence[adversaire(camp)]; adv.p = Math.max(0, adv.p - 5); }
  if (type === "developpement") { e.pays[iso].bonus.push({ points: 0.5, reste: 4 }); inf.e = borne(inf.e + 3, 0, 100); }
  if (type === "infrastructure") { const h = hubLibre(e, camp, iso)!; gain("e", 6); e.concessions.push({ hub: h.id, iso, camp, fin: e.round + 15 });
    noter(e, { type: "action", titre: `Concession : ${h.nom} (${nomPays(iso)})`, texte: "Concession de 4 ans : influence économique +6, lien de flux +2.", camp, pays: [iso], visiblePour: [...CAMPS], contestable: true }); return e; }
  if (type === "armes") { gain("m", 6); gain("e", 2); c.budget = arrondi(c.budget + Math.min(1, e.pays[iso].pib / 2e12)); /* recette selon la taille du client */ e.tension = borne(e.tension + 0.5, 0, 100); }
  if (type === "exercices") { gain("m", 5); e.pays[iso].stabilite = borne(e.pays[iso].stabilite + 2, 0, 100); e.tension = borne(e.tension + 1, 0, 100); }
  if (type === "pret") { gain("e", 6); gain("p", 3); e.prets.push({ iso, camp, montant: a.budget, echeance: e.round + 12 }); }
  if (type === "electorale") { const el = electionProchaine(e, iso)!; const k = `${iso}:${el.annee}`; (e.campagnesElectorales[k] ??= { OCC: 0, CHN: 0 })[camp] += 1; }
  if (type === "intimidation") {
    e.tension = borne(e.tension + 3, 0, 100); e.camps[adversaire(camp)].cp = borne(e.camps[adversaire(camp)].cp - 2, 0, 100);
    if ((camp === "OCC" ? 1 : -1) * alignement(e, iso) >= -0.1) gain("p", 5); else { inf.p = borne(inf.p - 2, 0, 100); memoriser(e, iso, camp, -2); }
    if (!apercu && tirer(e) < 0.15) { e.tension = borne(e.tension + 3, 0, 100); e.pays[iso].stabilite = borne(e.pays[iso].stabilite - 3, 0, 100);
      noter(e, { type: "action", titre: `Incident lors de manœuvres près ${duPays(iso, nomPays(iso))}`, famille: "incident_militaire", texte: "Un accrochage entre navires et avions fait monter la tension (+3) ; le pays s'inquiète (stabilité −3).", pays: [iso], visiblePour: [...CAMPS] }); }
  }
  if (type === "soutien") {
    gain("m", 8); gain("p", 4); memoriser(e, iso, camp, 1); e.tension = borne(e.tension + 2, 0, 100);
    const advSoutient = e.journal.some(j => j.titre === `${ACTIONS.soutien.nom} : ${nomPays(iso)}` && j.camp === adversaire(camp) && j.round >= e.round - 4);
    if (!e.conflits.some(x => x.iso === iso)) { e.pays[iso].stabilite = borne(e.pays[iso].stabilite - 4, 0, 100); memoriser(e, iso, camp, -1); }
    for (const x of e.conflits.filter(x => x.iso === iso)) x.fin = advSoutient ? x.fin + 2 : Math.max(e.round, x.fin - 2);
    if (advSoutient) e.tension = borne(e.tension + 3, 0, 100);
  }
  if (type === "garantie") {
    gain("m", 10); gain("p", 6); (e.garanties ??= []).push({ iso, camp }); e.rapprochements = e.rapprochements.filter(r => r.iso !== iso); e.rapprochements.push({ iso, camp, restant: RAPPROCHEMENT.duree });
    e.tension = borne(e.tension + 2, 0, 100);
  }
  if (type === "intervention") {
    c.cp = borne(c.cp - 5, 0, 100); gain("m", 15); const adv = e.pays[iso].influence[adversaire(camp)]; adv.m = Math.max(0, adv.m - 10); adv.p = Math.max(0, adv.p - 10);
    e.pays[iso].stabilite = borne(e.pays[iso].stabilite - 20, 0, 100); e.tension = borne(e.tension + 10, 0, 100); c.fatigue = (c.fatigue ?? 0) + 3;
    memoriser(e, iso, camp, -4); for (const v of prochesDe(e, iso).voisins) memoriser(e, v, camp, -1);
    e.conflits.push({ iso, titre: `Intervention ${camp === "OCC" ? "américaine" : "chinoise"} ${enPays(iso, nomPays(iso))}`, fin: e.round + 7 });
    e.interventions.push({ iso, camp, fin: e.round + 7 });
  }
  if (type === "putsch") {
    const reussi = !apercu && tirer(e) < 0.45, p = e.pays[iso], adv = p.influence[adversaire(camp)];
    if (apercu || reussi) { inf.p = Math.max(inf.p, 60); adv.p = Math.min(adv.p, 15); p.stabilite = borne(p.stabilite - 15, 0, 100); }
    const demasque = !apercu && !reussi && tirer(e) < 0.7 * (c.technologies?.includes("calcul") ? 0.5 : 1);
    if (!apercu && !reussi) p.stabilite = borne(p.stabilite - 5, 0, 100);
    noter(e, { type: "action", titre: `Opération secrète, putsch : ${nomPays(iso)}`, texte: reussi ? "Le nouveau régime t'est acquis." : apercu ? "" : "Le coup échoue.", camp, pays: [iso], visiblePour: [camp] });
    if (reussi) noter(e, { type: "action", titre: `Coup d'État ${enPays(iso, nomPays(iso))}`, famille: "coup_etat", texte: "L'armée renverse le gouvernement ; les nouveaux dirigeants restent discrets sur leurs soutiens étrangers.", pays: [iso], visiblePour: [...CAMPS] });
    if (demasque) {
      c.cp = borne(c.cp - 6, 0, 100); memoriser(e, iso, camp, -6); for (const v of prochesDe(e, iso).voisins) memoriser(e, v, camp, -2); e.tension = borne(e.tension + 5, 0, 100);
      noter(e, { type: "action", titre: `Scandale : un putsch ${camp === "OCC" ? "soutenu par Washington" : "soutenu par Pékin"} échoue ${enPays(iso, nomPays(iso))}`, texte: "Les conjurés arrêtés révèlent leurs commanditaires.", camp, pays: [iso], famille: "scandale_dirigeant", visiblePour: [...CAMPS] });
    }
    return e;
  }
  if (a.famille === "secret") {
    const adv = e.pays[iso].influence[adversaire(camp)], perte = (canal: Canal, k: number) => { inf[canal] = borne(inf[canal] - k, 0, 100); };
    const risque = { clandestin: 0.25, destabiliser: 0.35, espionnage: 0.2 }[type as "clandestin" | "destabiliser" | "espionnage"] * (c.technologies?.includes("calcul") ? 0.5 : 1);
    if (type === "clandestin") gain("p", 7);
    if (type === "destabiliser") { e.pays[iso].stabilite = borne(e.pays[iso].stabilite - 8, 0, 100); adv.p = Math.max(0, adv.p - 6); adv.e = Math.max(0, adv.e - 3); }
    if (type === "espionnage") { gain("e", 4); adv.e = Math.max(0, adv.e - 3); c.budget = arrondi(c.budget + 0.5); }
    const revele = !apercu && tirer(e) < risque;
    noter(e, { type: "action", titre: `Opération secrète, ${a.nom.toLowerCase()} : ${nomPays(iso)}`, texte: revele ? "" : "L'adversaire n'en sait rien.", camp, pays: [iso], visiblePour: [camp] });
    if (revele) {
      memoriser(e, iso, camp, -3);
      if (type === "clandestin") { perte("p", 10); c.cp = borne(c.cp - 3, 0, 100); e.tension = borne(e.tension + 1, 0, 100); }
      if (type === "destabiliser") { perte("p", 8); c.cp = borne(c.cp - 5, 0, 100); e.tension = borne(e.tension + 2, 0, 100); }
      if (type === "espionnage") { perte("e", 6); c.cp = borne(c.cp - 2, 0, 100); }
      noter(e, { type: "action", titre: `Scandale : une opération secrète ${camp === "OCC" ? "américaine" : "chinoise"} est révélée (${nomPays(iso)})`, texte: `${a.nom} démasquée par la presse et les services du pays.`, camp, pays: [iso], famille: "scandale_dirigeant", visiblePour: [...CAMPS] });
    }
    return e;
  }
  noter(e, { type: "action", titre: `${a.nom} : ${nomPays(iso)}`, texte: "", camp, pays: [iso], visiblePour: [...CAMPS], contestable: true });
  return e;
}

export const PART_IMMEDIATE = 2 / 3, DIFFERE = { duree: 4, cache: 0.1 };
// Aperçu d'une action : alignement et puissance du camp avant et après (effets certains seulement).
export function apercuAction(e: EtatPartie, camp: Camp, type: TypeAction, iso: string): { alignement: number; puissance: number; alignementDiffere: number } | null {
  // calculé même sans points d'action, pour que le joueur voie l'intérêt de chaque action ; sans le risque des opérations secrètes
  const e2 = structuredClone(e); e2.camps[camp].pa += 10; e2.camps[camp].budget += 10;
  if (peutAgir(e2, camp, type, iso)) return null;
  const apres = agir(e2, camp, type, iso, true), s = camp === "OCC" ? 1 : -1;
  const differe = (x: EtatPartie) => { const y = structuredClone(x); for (const a of y.attente.filter(a => !a.cache && a.round > e.round && a.joueur === camp && a.effet.type === "influence" && a.effet.pays === iso)) appliquer(y, a.effet, camp, iso, 1); return y; };
  const fin = differe(apres), base = differe(e); // le différé déjà programmé avant l'action ne compte pas
  return { alignement: s * (alignement(apres, iso) - alignement(e, iso)), puissance: 100 * (puissance(apres, camp) - puissance(e, camp)),
    alignementDiffere: s * ((alignement(fin, iso) - alignement(base, iso)) - (alignement(apres, iso) - alignement(e, iso))) };
}

// ---------- Campagnes régionales : impact diffus sur toute une zone ----------
export const ZONES: Record<string, { nom: string; pays: string[] }> = {
  afrique: { nom: "Afrique subsaharienne", pays: ["NGA", "ETH", "KEN", "COD", "ZAF", "AGO", "BEN", "BWA", "BFA", "BDI", "CPV", "CMR", "CAF", "TCD", "COM", "COG", "CIV", "DJI", "GNQ", "ERI", "SWZ", "GAB", "GMB", "GHA", "GIN", "GNB", "LSO", "LBR", "MDG", "MWI", "MLI", "MRT", "MUS", "MOZ", "NAM", "NER", "RWA", "STP", "SEN", "SYC", "SLE", "SOM", "SSD", "SDN", "TZA", "TGO", "UGA", "ZMB", "ZWE"] },
  moyen_orient: { nom: "Moyen-Orient et Afrique du Nord", pays: ["SAU", "ARE", "QAT", "IRN", "IRQ", "ISR", "EGY", "TUR", "DZA", "BHR", "JOR", "KWT", "LBN", "OMN", "SYR", "YEM", "LBY", "MAR", "TUN"] },
  asie_sud_est: { nom: "Asie du Sud-Est", pays: ["VNM", "THA", "MYS", "SGP", "PHL", "IDN", "BRN", "KHM", "LAO", "MMR", "TLS"] },
  amerique_latine: { nom: "Amérique latine et Caraïbes", pays: ["BRA", "ARG", "MEX", "COL", "CHL", "VEN", "CUB", "PAN", "BOL", "CRI", "DOM", "ECU", "SLV", "GTM", "GUY", "HTI", "HND", "JAM", "NIC", "PRY", "PER", "SUR", "TTO", "URY", "ATG", "BHS", "BRB", "BLZ", "DMA", "GRD", "KNA", "LCA", "VCT"] },
  europe: { nom: "Europe", pays: ["DEU", "GBR", "FRA", "ITA", "ESP", "NLD", "NOR", "POL", "UKR", "ALB", "AND", "AUT", "BLR", "BEL", "BIH", "BGR", "HRV", "CYP", "CZE", "DNK", "EST", "FIN", "GRC", "HUN", "ISL", "IRL", "LVA", "LIE", "LTU", "LUX", "MLT", "MDA", "MCO", "MNE", "MKD", "PRT", "ROU", "SMR", "SRB", "SVK", "SVN", "SWE", "CHE"] },
  asie_sud_centre: { nom: "Asie du Sud, Caucase et Asie centrale", pays: ["IND", "PAK", "BGD", "KAZ", "AFG", "ARM", "AZE", "BTN", "GEO", "KGZ", "MDV", "NPL", "LKA", "TJK", "TKM", "UZB", "MNG"] },
  asie_est: { nom: "Asie de l'Est et Pacifique", pays: ["JPN", "KOR", "TWN", "PRK", "AUS", "NZL", "PNG", "FJI", "KIR", "MHL", "FSM", "NRU", "PLW", "WSM", "SLB", "TON", "TUV", "VUT"] },
};
export const CAMPAGNE = { pa: 2, budget: 1, gain: { p: 3, e: 3, c: 2 } as Record<"p" | "e" | "c", number> };
export function peutCampagne(e: EtatPartie, camp: Camp, zone: string): string | null {
  const c = e.camps[camp];
  if (!ZONES[zone]) return "Zone inconnue.";
  if (dispo(c, "diplo") < CAMPAGNE.pa) return `Points diplomatie insuffisants (${CAMPAGNE.pa}).`;
  if (c.budget < CAMPAGNE.budget) return "Budget insuffisant (1).";
  if (c.paParPays[`zone:${zone}`]) return "Une campagne par zone et par trimestre.";
  return null;
}
export function campagne(e0: EtatPartie, camp: Camp, zone: string, canal: "p" | "e" | "c"): EtatPartie {
  const err = peutCampagne(e0, camp, zone); if (err) throw new Error(err);
  const e = copie(e0), c = e.camps[camp];
  depenser(c, "diplo", CAMPAGNE.pa); c.budget = arrondi(c.budget - CAMPAGNE.budget); c.paParPays[`zone:${zone}`] = CAMPAGNE.pa;
  for (const iso of ZONES[zone].pays) { const inf = e.pays[iso].influence[camp]; inf[canal] = borne(inf[canal] + CAMPAGNE.gain[canal] * (e.camps[camp].priorite === "rayonnement" ? BONUS_PRIORITE : 1) * (1 - inf[canal] / 100), 0, 100); }
  noter(e, { type: "action", titre: `Campagne ${NOMS_CANAUX[canal]} : ${ZONES[zone].nom}`, texte: `Influence ${NOMS_CANAUX[canal]} +${CAMPAGNE.gain[canal]} dans ${ZONES[zone].pays.length} pays.`, camp, pays: ZONES[zone].pays, visiblePour: [...CAMPS] });
  return e;
}

// ---------- Cartes : pays possibles et effet d'une carte adverse ----------
export function paysEligibles(e: EtatPartie, camp: Camp, idCarte: string, mode: number): string[] {
  const m = CARTES[idCarte]?.modes[mode];
  if (!m || m.cible !== "pays") return [];
  return ISO.filter(i => i !== "USA" && i !== "CHN" && conditionsVraies(e, m.conditions, i)).sort((a, b) => nomPays(a).localeCompare(nomPays(b), "fr"));
}
export function previsionAdverse(e: EtatPartie, camp: Camp, idCarte: string): { titre: string; effets: string[] } | null {
  const c = CARTES[idCarte], adv = adversaire(camp);
  if (c.camp !== adv) return null;
  const best = meilleurMode(e, adv, c); if (!best) return { titre: "Aucun effet possible pour l'adversaire en ce moment", effets: [] };
  const m = c.modes[best.mode];
  return { titre: `${m.nom}${best.pays ? ` (${nomPays(best.pays)})` : ""}`, effets: decrire(e, m.effets, adv, best.pays, 0.3).concat(m.caches?.length ? ["Conséquences cachées possibles"] : []) };
}

// Le budget achète des points d'action : la richesse du leader devient un levier (3 unités = 1 point, 2 par trimestre).
export const PRIX_PA = 3, MAX_PA_ACHETES = 2;
export function peutAcheterPA(e: EtatPartie, camp: Camp): string | null {
  const c = e.camps[camp];
  if (c.paAchetes >= MAX_PA_ACHETES) return "Maximum 2 points achetés par trimestre.";
  return c.budget < PRIX_PA ? "Budget insuffisant." : null;
}
export function acheterPA(e0: EtatPartie, camp: Camp): EtatPartie {
  const err = peutAcheterPA(e0, camp); if (err) throw new Error(err);
  const e = copie(e0), c = e.camps[camp];
  c.budget -= PRIX_PA; c.pa += 1; c.paAchetes += 1;
  return e;
}

// ---------- Réactions aux événements (aider un pays frappé, exploiter le malheur d'un pays du camp adverse) ----------
export type TypeReaction = "aider" | "exploiter" | "fermete" | "apaiser" | "riposter";
export const REACTIONS: Record<TypeReaction, { nom: string; budget: number; cp?: number; texte: string }> = {
  aider: { nom: "Envoyer de l'aide", budget: 2, texte: "Stabilité +3, influence politique +3 pour ton bloc dans le pays (sur ton leader : stabilité +3, capital politique +2)." },
  exploiter: { nom: "Exploiter la crise", budget: 2, texte: "Influence politique +2 pour ton bloc et −3 pour l'adversaire dans le pays (sur le leader adverse : son capital politique −3)." },
  // face-à-face entre les deux leaders (incident, crise bilatérale)
  fermete: { nom: "Fermeté", budget: 0, cp: 2, texte: "Exiger des excuses et montrer les muscles : capital politique de l'adversaire −3, influence politique +2 chez tes alliés, tension +2." },
  apaiser: { nom: "Apaisement", budget: 0, cp: 2, texte: "Désamorcer la crise : tension −3, influence politique +2 dans les pays neutres." },
  // riposte à une action annoncée de l'adversaire (ce trimestre ou le précédent)
  riposter: { nom: "Riposter", budget: 2, texte: "Contre-offensive diplomatique : influence politique −3 pour l'adversaire et +2 pour ton bloc dans le pays, tension +0,5." },
};
// Événement qui oppose directement les deux leaders : on peut y répondre par la fermeté ou l'apaisement.
export const faceAFace = (j: EntreeJournal) => !!j.pays?.includes("USA") && !!j.pays?.includes("CHN");
export const MAX_REACTIONS = 2;
const leaderDe = (c: Camp) => c === "OCC" ? "USA" : "CHN";
export function peutReagir(e: EtatPartie, camp: Camp, index: number, type: TypeReaction): string | null {
  const j = e.journal[index], c = e.camps[camp];
  if (type === "riposter" || j?.contestable) {
    if (!j?.contestable || j.camp !== adversaire(camp) || !j.pays?.length || j.round < e.round - 1) return "On ne riposte qu'à une action annoncée de l'adversaire, ce trimestre ou le précédent.";
    if (type !== "riposter") return "Action de l'adversaire : réponds par une riposte.";
    if (c.reactions.includes(index) || j.ripostes?.includes(camp)) return "Tu as déjà riposté à cette action.";
    if (c.reactions.length >= MAX_REACTIONS) return `${MAX_REACTIONS} réactions par trimestre au plus.`;
    if (c.budget < REACTIONS.riposter.budget) return `Budget insuffisant (${REACTIONS.riposter.budget} requis, tu as ${Math.floor(c.budget)}).`;
    if (e.journal.some(x => x.type === "action" && x.camp === camp && x.titre === `Riposte : ${nomPays(j.pays![0])}` && x.round === e.round)) return "Une riposte par pays et par trimestre.";
    return null;
  }
  if (!j || !j.reactif || !j.pays?.length || j.round !== e.round) return "On ne peut réagir qu'aux événements de ce trimestre.";
  if (c.reactions.includes(index)) return "Tu as déjà réagi à cet événement.";
  if (c.reactions.length >= MAX_REACTIONS) return `${MAX_REACTIONS} réactions par trimestre au plus.`;
  if (c.budget < REACTIONS[type].budget) return `Budget insuffisant (${REACTIONS[type].budget} requis, tu as ${Math.floor(c.budget)}).`;
  if (c.cp < (REACTIONS[type].cp ?? 0)) return `Capital politique insuffisant (${REACTIONS[type].cp} requis).`;
  if ((type === "fermete" || type === "apaiser") !== faceAFace(j)) return type === "fermete" || type === "apaiser" ? "Réservé aux crises entre les deux leaders." : "Crise entre les deux leaders : réponds par la fermeté ou l'apaisement.";
  const iso = j.pays[0], s = camp === "OCC" ? 1 : -1;
  if (type === "exploiter" && iso !== leaderDe(adversaire(camp)) && s * alignement(e, iso) > -0.1) return "On n'exploite que les malheurs d'un pays qui penche vers l'adversaire.";
  if (type === "aider" && iso === leaderDe(adversaire(camp))) return "Le leader adverse refuse ton aide.";
  return null;
}
export function reagir(e0: EtatPartie, camp: Camp, index: number, type: TypeReaction): EtatPartie {
  const err = peutReagir(e0, camp, index, type); if (err) throw new Error(err);
  const e = copie(e0), c = e.camps[camp], iso = e.journal[index].pays![0], adv = adversaire(camp);
  c.budget -= REACTIONS[type].budget; c.cp -= REACTIONS[type].cp ?? 0; c.reactions.push(index);
  if (type === "riposter") (e.journal[index].ripostes ??= []).push(camp);
  const s = camp === "OCC" ? 1 : -1, allies = ISO.filter(i => i !== "USA" && i !== "CHN" && s * alignement(e, i) >= 0.3), neutres = ISO.filter(i => Math.abs(alignement(e, i)) < 0.2 && i !== "USA" && i !== "CHN");
  const effets: Effet[] = type === "riposter" ? [{ type: "influence", pays: iso, camp: adv, canal: "p", valeur: -3 }, { type: "influence", pays: iso, camp, canal: "p", valeur: 2 }, { type: "tension", valeur: 0.5 }]
    : type === "fermete" ? [{ type: "cp", camp: adv, valeur: -3 }, { type: "influence", pays: allies, camp, canal: "p", valeur: 2 }, { type: "tension", valeur: 2 }]
    : type === "apaiser" ? [{ type: "tension", valeur: -3 }, { type: "influence", pays: neutres, camp, canal: "p", valeur: 2 }]
    : type === "aider"
    ? iso === leaderDe(camp) ? [{ type: "stabilite", pays: iso, valeur: 3 }, { type: "cp", camp, valeur: 2 }]
      : [{ type: "stabilite", pays: iso, valeur: 3 }, { type: "influence", pays: iso, camp, canal: "p", valeur: 3 }]
    : iso === leaderDe(adv) ? [{ type: "cp", camp: adv, valeur: -3 }]
      : [{ type: "influence", pays: iso, camp, canal: "p", valeur: 2 }, { type: "influence", pays: iso, camp: adv, canal: "p", valeur: -3 }];
  for (const ef of effets) appliquer(e, ef, camp, iso);
  if (type === "aider") memoriser(e, iso, camp, 2);
  if (type === "exploiter") memoriser(e, iso, camp, -1);
  noter(e, { type: "action", titre: `${type === "riposter" ? "Riposte" : REACTIONS[type].nom} : ${nomPays(iso)}`, texte: e.journal[index].titre, pays: [iso], camp, visiblePour: [...CAMPS], effets: decrire(e, effets, camp, iso) });
  return e;
}

export function repondreBriefing(e0: EtatPartie, camp: Camp, options: number[]): EtatPartie {
  const e = copie(e0), c = e.camps[camp], b = c.briefing ? BRIEFINGS[c.briefing] : null;
  if (!b) throw new Error("Aucun briefing en cours.");
  if (options.length < 1 || options.length > b.maxChoix) throw new Error(`Choisis entre 1 et ${b.maxChoix} option(s).`);
  const cout = options.reduce((s, i) => ({ budget: s.budget + (b.options[i].cout.budget ?? 0), cp: s.cp + (b.options[i].cout.cp ?? 0) }), { budget: 0, cp: 0 });
  if (cout.budget > c.budget || cout.cp > c.cp) throw new Error("Ressources insuffisantes pour ce choix.");
  c.budget -= cout.budget; c.cp -= cout.cp;
  for (const i of options) {
    const o = b.options[i];
    executer(e, o.effets, camp, undefined, b.titre, () => 0.5 + tirer(e));
    programmerCaches(e, o.caches, camp, undefined, b.titre);
  }
  noter(e, { type: "briefing", titre: b.titre, texte: `Décision : ${options.map(i => b.options[i].libelle).join(" + ")}.`, camp, visiblePour: [camp] });
  e.briefingsFaits.push(b.id); c.briefing = null;
  return e;
}

// ---------- IA simple ----------
// Valeur d'un effet pour un camp : gain de puissance attendu (PIB × alignement) et ressources.
function valeurEffet(e: EtatPartie, camp: Camp, ef: Effet, joueur: Camp, paysTire?: string): number {
  const s = camp === "OCC" ? 1 : -1; let m = -1; const monde = () => m < 0 ? (m = pibMonde(e)) : m; // calculé seulement si l'effet en a besoin
  switch (ef.type) {
    case "influence": { const cible = campReel(ef.camp, joueur, paysTire, e), signe = cible === camp ? 1 : -1;
      return paysCibles(ef.pays, paysTire).reduce((v, i) => v + signe * (e.pays[i].pib / monde()) * ef.valeur * POIDS[ef.canal] / 60 * 100, 0); }
    case "cp": return (campReel(ef.camp, joueur, paysTire, e) === camp ? 1 : -1) * ef.valeur * 0.1;
    case "budget": return (campReel(ef.camp, joueur, paysTire, e) === camp ? 1 : -1) * ef.valeur * 0.3;
    case "tension": return -ef.valeur * 0.03;
    case "stabilite": return paysCibles(ef.pays, paysTire).reduce((v, i) => v + s * Math.sign(alignement(e, i)) * ef.valeur * 0.01, 0);
    case "croissance": return paysCibles(ef.pays, paysTire).reduce((v, i) => v + s * alignement(e, i) * (e.pays[i].pib / monde()) * ef.points * ef.duree * 0.5, 0);
    default: return 0;
  }
}
// Le budget vaut d'autant moins qu'il abonde : une réserve de 6 unités ou moins garde son plein prix.
const prixBudget = (e: EtatPartie, camp: Camp) => 6 / Math.max(6, e.camps[camp].budget);
const valeurEffets = (e: EtatPartie, camp: Camp, effets: Effet[], joueur: Camp, pays?: string) => effets.reduce((v, ef) => v + valeurEffet(e, camp, ef, joueur, pays), 0);

function meilleurMode(e: EtatPartie, camp: Camp, c: Carte): { mode: number; pays?: string; valeur: number } | null {
  let best: { mode: number; pays?: string; valeur: number } | null = null;
  c.modes.forEach((m, i) => {
    const cibles = m.cible === "pays" ? ISO.filter(x => x !== "USA" && x !== "CHN") : [undefined];
    for (const p of cibles) {
      if ((m.cout.budget ?? 0) > e.camps[camp].budget || (m.cout.cp ?? 0) > e.camps[camp].cp || !conditionsVraies(e, m.conditions, p)) continue;
      const v = valeurEffets(e, camp, m.effets, camp, p) - (m.cout.budget ?? 0) * 0.3 * prixBudget(e, camp) - (m.cout.cp ?? 0) * 0.1;
      if (!best || v > best.valeur) best = { mode: i, pays: p, valeur: v };
    }
  });
  return best;
}

export function iaJouer(e0: EtatPartie, camp: Camp): EtatPartie {
  SUR_PLACE = true;
  try { return iaJouerSurPlace(structuredClone(e0), camp); } finally { SUR_PLACE = false; }
}
function iaJouerSurPlace(e: EtatPartie, camp: Camp): EtatPartie {
  const c = () => e.camps[camp];
  if (c().briefing) {
    const b = BRIEFINGS[c().briefing!];
    const notes = b.options.map((o, i) => ({ i, v: valeurEffets(e, camp, o.effets, camp) - (o.cout.budget ?? 0) * 0.3 * prixBudget(e, camp) - (o.cout.cp ?? 0) * 0.1,
      ok: (o.cout.budget ?? 0) <= c().budget && (o.cout.cp ?? 0) <= c().cp })).filter(x => x.ok).sort((a, b2) => b2.v - a.v);
    const choix = notes.length ? [notes[0].i] : [];
    if (choix.length) e = repondreBriefing(e, camp, choix);
    else { e.briefingsFaits.push(b.id); e.camps[camp].briefing = null; }
  }
  if (!c().carteJouee && c().main.length) {
    const options = c().main.filter(id => !peutJouerCarte(e, camp, id)).map(id => {
      const carteJ = CARTES[id], pts = carteJ.valeur * 0.6;
      const ev = carteJ.camp === camp || carteJ.camp === "NEUTRE" ? meilleurMode(e, camp, carteJ) : null;
      const malus = carteJ.camp === adversaire(camp) ? Math.max(0, meilleurMode(e, adversaire(camp), carteJ)?.valeur ?? 0) : 0;
      return { id, ev, vEv: ev ? ev.valeur : -Infinity, vPts: pts - malus };
    });
    options.sort((a, b) => Math.max(b.vEv, b.vPts) - Math.max(a.vEv, a.vPts));
    const o = options[0];
    if (o) e = o.ev && o.vEv > o.vPts ? jouerCarte(e, camp, { carte: o.id, usage: "evenement", mode: o.ev.mode, pays: o.ev.pays })
                                      : jouerCarte(e, camp, { carte: o.id, usage: "points" });
  }
  // réactions : aider ses alliés frappés (et son leader) si le budget le permet
  const s = camp === "OCC" ? 1 : -1;
  e.journal.forEach((j, i) => {
    if (!j.reactif || j.round !== e.round || !j.pays?.length || c().budget < 8) return;
    const iso = j.pays[0];
    if ((iso === leaderDe(camp) || s * alignement(e, iso) >= 0.3) && !peutReagir(e, camp, i, "aider")) e = reagir(e, camp, i, "aider");
  });
  // priorité annuelle : tirée au hasard parmi les trois (l'IA reste simple)
  if (!peutChoisirPriorite(e, camp)) e = choisirPriorite(e, camp, (["economie", "securite", "rayonnement"] as Priorite[])[Math.floor(tirer(e) * 3)]);
  // ripostes : contrer les actions annoncées de l'adversaire chez ses propres alliés
  e.journal.forEach((j, i) => {
    if (!j.contestable || j.camp !== adversaire(camp) || c().budget < 8 || s * alignement(e, j.pays![0]) < 0.3) return;
    if (!peutReagir(e, camp, i, "riposter")) e = reagir(e, camp, i, "riposter");
  });
  // diplomatie, au 2e trimestre : sommet si la tension est forte, sinon accord (50 %) ou sanctions (15 %)
  if (date(e.round).trimestre === 2) {
    const t: Diplomatie | null = e.tension > 45 ? "sommet" : tirer(e) < 0.5 ? "accord" : tirer(e) < 0.3 ? "sanctions" : null;
    if (t && !peutDiplomatie(e, camp, t)) e = diplomatie(e, camp, t);
  }
  // guerre : l'IA cherche la paix dès qu'elle y est
  if (e.guerre && !e.proposition) e = proposerPaix(e, camp);
  // ONU, élections, recherche, prêts : usage modéré
  if (e.onu && !peutLobbyOnu(e, camp) && tirer(e) < 0.4) e = lobbyOnu(e, camp);
  for (const x of ELECTIONS_PAYS) { if (dispo(c(), "diplo") < 1) break; const r = roundDe(x.annee, x.trimestre); if (r < e.round || r > e.round + 4 || !e.pays[x.iso] || peutAgir(e, camp, "electorale", x.iso) || Math.abs(alignement(e, x.iso)) > 0.5 || tirer(e) >= 0.3) continue; e = agir(e, camp, "electorale", x.iso); }
  if (c().budget >= 10 && tirer(e) < 0.3) { const t = Object.keys(TECHNOLOGIES).find(k => !peutRechercher(e, camp, k)); if (t) e = rechercher(e, camp, t); }
  if (c().budget >= 14 && dispo(c(), "eco") >= 1 && tirer(e) < 0.1) {
    const iso = ISO.filter(i => !peutAgir(e, camp, "pret", i) && s * alignement(e, i) > -0.1 && s * alignement(e, i) < 0.4).sort((a, b) => e.pays[b].pib - e.pays[a].pib)[0];
    if (iso) e = agir(e, camp, "pret", iso);
  }
  // achat de points d'action en gardant une réserve de 6 unités
  while (!peutAcheterPA(e, camp) && c().budget - PRIX_PA >= 6) e = acheterPA(e, camp);
  // zones stratégiques : une mission par trimestre dans 35 % des cas, là où le poids non tenu est le plus grand
  if (dispo(c(), "defense") >= 1 && c().budget >= 6 && tirer(e) < 0.35) {
    const z = ZONES_STRATEGIQUES.filter(x => !peutAgirZone(e, camp, x.id, "mission")).sort((a, b) => b.poids * (1 - partZone(e.zones[b.id], camp)) - a.poids * (1 - partZone(e.zones[a.id], camp)))[0];
    if (z) e = agirZone(e, camp, z.id, "mission");
  }
  // ministères : chaque domaine dépense ses points ; puis les points de crise au choix glouton ci-dessous
  if (date(e.round).trimestre === 1 || !c().orientations) iaOrienter(e, camp);
  for (const d of LISTE_DOMAINES) e = jouerDomaine(e, camp, d);
  // points de crise : choix glouton du meilleur gain de puissance, 10 % de hasard
  for (let garde = 0; garde < 12 && c().pa > 0; garde++) {
    const candidats: { type: TypeAction; iso: string; v: number }[] = [];
    for (const iso of ISO) for (const type of ["politique", "economique", "culturelle", "militaire"] as TypeAction[]) {
      if (peutAgir(e, camp, type, iso)) continue;
      const p = e.pays[iso], canal: Canal = type === "politique" ? "p" : type === "economique" ? "e" : type === "culturelle" ? "c" : "m";
      const k = { p: 8, e: 8, c: 4, m: 10 }[canal] * (1 - p.influence[camp][canal] / 100);
      const avant = alignement(e, iso);
      p.influence[camp][canal] += k; const apres = alignement(e, iso); p.influence[camp][canal] -= k;
      const s = camp === "OCC" ? 1 : -1;
      candidats.push({ type, iso, v: s * (apres - avant) * p.pib / ACTIONS[type].pa - ACTIONS[type].budget * 1e10 * prixBudget(e, camp) });
    }
    if (!candidats.length) break;
    candidats.sort((a, b) => b.v - a.v);
    const pris = tirer(e) < 0.1 ? candidats[Math.floor(tirer(e) * Math.min(10, candidats.length))] : candidats[0];
    e = agir(e, camp, pris.type, pris.iso);
  }
  return e;
}

// ---------- Interactions directes entre blocs ----------
// Bras de fer : les deux blocs ont dépensé des points d'action sur le même pays ce trimestre. Celui qui en a mis le plus
// l'emporte (influence politique +2 pour lui, −2 pour l'autre) ; le pays s'agite (stabilité −1) et la tension monte (+0,5).
export const BRAS_DE_FER = { gain: 2, stabilite: -1, tension: 0.5 };
function brasDeFer(e: EtatPartie) {
  for (const iso of ISO) {
    if (iso === "USA" || iso === "CHN") continue;
    const o = e.camps.OCC.paParPays[iso] ?? 0, c = e.camps.CHN.paParPays[iso] ?? 0;
    if (!o || !c) continue;
    const g: Camp | null = o > c ? "OCC" : c > o ? "CHN" : null, p = e.pays[iso];
    if (g) { p.influence[g].p = borne(p.influence[g].p + BRAS_DE_FER.gain, 0, 100); p.influence[adversaire(g)].p = borne(p.influence[adversaire(g)].p - BRAS_DE_FER.gain, 0, 100); }
    p.stabilite = borne(p.stabilite + BRAS_DE_FER.stabilite, 0, 100); e.tension = borne(e.tension + BRAS_DE_FER.tension, 0, 100);
    noter(e, { type: "action", titre: `Bras de fer : ${nomPays(iso)}`, pays: [iso], visiblePour: [...CAMPS],
      texte: `Les deux blocs se disputent le pays (${o} PA côté USA, ${c} PA côté Chine) : ${g ? `le bloc ${g === "OCC" ? "USA" : "Chine"} l'emporte (influence politique +${BRAS_DE_FER.gain}, −${BRAS_DE_FER.gain} pour l'autre)` : "match nul"} ; stabilité −1, tension +0,5.` });
  }
}
// Diplomatie : une initiative par camp et par an. Sommet et accord exigent l'accord de l'adversaire ; les sanctions non.
export type Diplomatie = "sommet" | "accord" | "sanctions";
export const DIPLOMATIE: Record<Diplomatie, { nom: string; cp: number; texte: string }> = {
  sommet: { nom: "Proposer un sommet", cp: 1, texte: "S'il accepte : tension −5, capital politique +2 pour chacun. S'il refuse : tension +1." },
  accord: { nom: "Proposer un accord commercial", cp: 1, texte: "S'il accepte : budget +2 pour chacun, tension −2. S'il refuse : tension +1." },
  sanctions: { nom: "Imposer des sanctions", cp: 2, texte: "Sans son accord : budget de l'adversaire −3, le tien de 1 à 4 selon la dépendance commerciale entre les deux blocs, ton capital politique +1, tension +4." },
};
const nomBloc = (c: Camp) => c === "OCC" ? "bloc USA" : "bloc Chine";
export function peutDiplomatie(e: EtatPartie, camp: Camp, type: Diplomatie): string | null {
  const c = e.camps[camp];
  if (c.diplomatie === date(e.round).annee) return "Une initiative diplomatique par an.";
  if (e.proposition) return "Une offre diplomatique attend déjà sa réponse.";
  if (c.cp < DIPLOMATIE[type].cp) return `Capital politique insuffisant (${DIPLOMATIE[type].cp} requis).`;
  return null;
}
function conclure(e: EtatPartie, de: Camp, type: "sommet" | "accord" | "paix", accepte: boolean) {
  const adv = adversaire(de);
  if (type === "paix") {
    if (accepte) { e.guerre = null; e.tension = 70; }
    noter(e, { type: "politique", titre: `Négociations de paix : ${accepte ? "cessez-le-feu signé" : "refusées"}`, visiblePour: [...CAMPS], camp: de,
      texte: `Proposées par le ${nomBloc(de)}, ${accepte ? "acceptées" : "refusées"} par le ${nomBloc(adv)}.${accepte ? " La guerre s'arrête ; la tension reste très forte (70)." : " La guerre continue."}` });
    return;
  }
  if (accepte && type === "sommet") { e.tension = borne(e.tension - 5, 0, 100); for (const c of CAMPS) e.camps[c].cp = borne(e.camps[c].cp + 2, 0, 100); }
  else if (accepte) { e.tension = borne(e.tension - 2, 0, 100); for (const c of CAMPS) e.camps[c].budget += 2; }
  else e.tension = borne(e.tension + 1, 0, 100);
  noter(e, { type: "politique", titre: `${type === "sommet" ? "Sommet" : "Accord commercial"} : ${accepte ? "accepté" : "refusé"}`, visiblePour: [...CAMPS], camp: de,
    texte: `Proposé par le ${nomBloc(de)}, ${accepte ? "accepté" : "refusé"} par le ${nomBloc(adv)}. ${accepte ? (type === "sommet" ? "Tension −5, capital politique +2 pour chacun." : "Budget +2 pour chacun, tension −2.") : "Tension +1."}` });
}
// L'IA accepte un sommet quand la tension est forte, un accord quand son budget ne dépasse pas celui de l'adversaire (sinon 40 % de chances).
function iaAccepte(e: EtatPartie, camp: Camp, type: "sommet" | "accord" | "paix"): boolean {
  if (type === "paix") return true; // l'IA ne veut pas d'une guerre entre puissances nucléaires
  return type === "sommet" ? e.tension >= 30 || tirer(e) < 0.4 : e.camps[camp].budget <= e.camps[adversaire(camp)].budget || tirer(e) < 0.4;
}
export function diplomatie(e0: EtatPartie, camp: Camp, type: Diplomatie): EtatPartie {
  const err = peutDiplomatie(e0, camp, type); if (err) throw new Error(err);
  const e = copie(e0), c = e.camps[camp], adv = adversaire(camp);
  c.cp -= DIPLOMATIE[type].cp; c.diplomatie = date(e.round).annee;
  if (type === "sanctions") {
    const coutPropre = coutSanctions(e);
    e.camps[adv].budget = Math.max(0, e.camps[adv].budget - 3); c.budget = Math.max(0, c.budget - coutPropre); c.cp = borne(c.cp + 1, 0, 100); e.tension = borne(e.tension + 4, 0, 100);
    noter(e, { type: "politique", titre: `Sanctions du ${nomBloc(camp)}`, texte: `Budget de l'adversaire −3, le sien −${coutPropre.toFixed(1).replace(".", ",")} (dépendance commerciale ${Math.round(100 * dependanceCommerciale(e))} %), capital politique +1, tension +4.`, camp, visiblePour: [...CAMPS] });
  } else if (adv === e.joueur && e.reglages.ia) e.proposition = { de: camp, type, round: e.round };
  else conclure(e, camp, type, iaAccepte(e, adv, type));
  return e;
}
export function repondreDiplomatie(e0: EtatPartie, camp: Camp, accepter: boolean): EtatPartie {
  const pr = e0.proposition;
  if (!pr || adversaire(pr.de) !== camp) throw new Error("Aucune offre diplomatique à ta destination.");
  const e = copie(e0); e.proposition = null; conclure(e, pr.de, pr.type, accepter);
  return e;
}

// ---------- Domaines d'action ----------
// Chaque trimestre : 2 actions en économie, 2 en diplomatie, 2 en défense, 1 pour les services secrets (non reportées).
// Les points des cartes deviennent des points de crise, utilisables dans n'importe quel domaine en complément.
export type Domaine = "eco" | "diplo" | "defense" | "secret";
export type ModeDomaine = "auto" | "conseiller" | "manuel";
export const DOMAINES: Record<Domaine, { nom: string; points: number }> = {
  eco: { nom: "Économie", points: 2 }, diplo: { nom: "Diplomatie", points: 2 }, defense: { nom: "Défense", points: 2 }, secret: { nom: "Services secrets", points: 1 },
};
export const LISTE_DOMAINES = Object.keys(DOMAINES) as Domaine[];
export const DOMAINE_ACTION: Record<TypeAction, Domaine> = {
  economique: "eco", developpement: "eco", infrastructure: "eco", pret: "eco",
  politique: "diplo", culturelle: "diplo", contre: "diplo", electorale: "diplo",
  militaire: "defense", armes: "defense", exercices: "defense", garantie: "defense", intimidation: "defense", soutien: "defense", intervention: "defense",
  clandestin: "secret", destabiliser: "secret", espionnage: "secret", putsch: "secret",
};
export const MODES_DEFAUT: Record<Domaine, ModeDomaine> = { eco: "auto", diplo: "conseiller", defense: "auto", secret: "manuel" };
const pointsDeBase = (): Record<Domaine, number> => Object.fromEntries(LISTE_DOMAINES.map(d => [d, DOMAINES[d].points])) as Record<Domaine, number>;
export const dispo = (c: EtatCamp, d: Domaine) => (c.points?.[d] ?? 0) + c.pa;
function depenser(c: EtatCamp, d: Domaine, n: number) { const pts = (c.points ??= pointsDeBase()), k = Math.min(n, pts[d]); pts[d] -= k; c.pa -= n - k; }
export const arrondi = (x: number) => Math.round(x * 10) / 10; // budget au dixième
export function reglerMode(e0: EtatPartie, camp: Camp, d: Domaine, m: ModeDomaine): EtatPartie {
  const e = copie(e0); (e.camps[camp].modes ??= { ...MODES_DEFAUT })[d] = m; return e;
}
export const modeDe = (e: EtatPartie, camp: Camp, d: Domaine) => e.camps[camp].modes?.[d] ?? MODES_DEFAUT[d];

// ---------- Complémentarité commerciale ----------
// Réciproque (il a ce qui manque à ton leader, et ton leader ce qui lui manque) : actions économiques +50 %.
// Il a besoin de toi (sens unique, ton levier) : +25 %. Tu as besoin de lui (sens unique, son levier) : +10 %. Sinon, normal.
export type Complementarite = "reciproque" | "il_a_besoin" | "tu_as_besoin" | "normal";
export const BOOST_COMMERCE: Record<Complementarite, number> = { reciproque: 1.5, il_a_besoin: 1.25, tu_as_besoin: 1.1, normal: 1 };
export function complementarite(iso: string, camp: Camp): { type: Complementarite; ilOffre: Bien[]; tuOffres: Bien[] } {
  const l = PROFILS[camp === "OCC" ? "USA" : "CHN"], x = PROFILS[iso] ?? { offre: [], besoin: [] };
  const ilOffre = x.offre.filter(b => l.besoin.includes(b)), tuOffres = l.offre.filter(b => x.besoin.includes(b));
  return { type: ilOffre.length && tuOffres.length ? "reciproque" : tuOffres.length ? "il_a_besoin" : ilOffre.length ? "tu_as_besoin" : "normal", ilOffre, tuOffres };
}
const boostCommerce = (iso: string, camp: Camp, type: TypeAction) => DOMAINE_ACTION[type] === "eco" && iso !== "USA" && iso !== "CHN" ? BOOST_COMMERCE[complementarite(iso, camp).type] : 1;

// ---------- Échelles militaires ----------
// Coopération (pays ami ou neutre) : vente d'armes, exercices, base, garantie de défense. Coercition (pays qui ne penche
// pas vers toi) : intimidation, soutien armé, intervention. On ne monte que cran par cran ; un cran non entretenu
// pendant 2 ans redescend d'un niveau en fin d'année.
export const ECHELLES: Record<"coop" | "coer", TypeAction[]> = { coop: ["armes", "exercices", "militaire", "garantie"], coer: ["intimidation", "soutien", "intervention"] };
export const echelleDe = (t: TypeAction): { echelle: "coop" | "coer" } | null => ECHELLES.coop.includes(t) ? { echelle: "coop" } : ECHELLES.coer.includes(t) ? { echelle: "coer" } : null;
function usureCrans(e: EtatPartie) {
  for (const camp of CAMPS) for (const cr of Object.values(e.camps[camp].crans ?? {})) {
    if (e.round - (cr.rCoop ?? cr.round) >= 8 && cr.coop) { cr.coop--; cr.rCoop = e.round - 4; }
    if (e.round - (cr.rCoer ?? cr.round) >= 8 && cr.coer) { cr.coer--; cr.rCoer = e.round - 4; }
  }
}
export const RIVERAINS: Record<string, string[]> = {
  ormuz: ["OMN", "ARE", "IRN"], malacca: ["SGP", "MYS", "IDN"], suez: ["EGY"], bab: ["DJI", "YEM", "ERI"], panama: ["PAN"], bosphore: ["TUR"], gibraltar: ["ESP", "MAR"],
};

// ---------- Candidats et conseillers ----------
// Valeur d'une action en points de score : variation des poids des deux camps dans le pays (comme le score le compte)
// × part mondiale du pays dans les 5 familles, moins le prix du budget dépensé ; bonus si le pays franchit un palier
// (il entraîne alors ses voisins) ou s'il est au bord de la bascule ; orientations et priorité la modulent.
// Réglages entraînés par parties IA contre IA (tests/acceptation-v13, essai 2) ; un jeu par camp pour l'entraînement.
const IMPACT: Partial<Record<TypeAction, [Canal, number, boolean?]>> = {
  economique: ["e", 8], developpement: ["e", 5], infrastructure: ["e", 6], pret: ["e", 7],
  politique: ["p", 8], culturelle: ["c", 4], contre: ["p", 5, true], electorale: ["p", 4],
  militaire: ["m", 10], armes: ["m", 7], exercices: ["m", 5], garantie: ["m", 14], intimidation: ["p", 3], soutien: ["m", 8],
  clandestin: ["p", 6], espionnage: ["e", 5], destabiliser: ["p", 6, true],
};
export const CONSEIL = { prixBudget: 0.04, palier: 1.5, bord: 2 }; // entraîné : 11 réglages × 60 parties IA contre IA (26/10/2026)
export const REGLAGES_CONSEIL: Record<Camp, typeof CONSEIL> = { OCC: { ...CONSEIL }, CHN: { ...CONSEIL } };
// Part mondiale de chaque pays, moyenne des 5 familles du score.
function poidsPays(e: EtatPartie): Record<string, number> {
  const fams = Object.keys(NOMS_FAMILLES) as Famille[], w: Record<string, number> = Object.fromEntries(ISO.map(i => [i, 0]));
  for (const f of fams) { let den = 0; for (const i of ISO) den += masse(e, f, i); for (const i of ISO) w[i] += masse(e, f, i) / den / fams.length; }
  return w;
}
export type Option = { type: TypeAction; iso: string; v: number; raison: string };
export function candidats(e: EtatPartie, camp: Camp, d: Domaine): Option[] {
  const c = e.camps[camp], s = sensDe(camp), out: Option[] = [], W = poidsPays(e), r = REGLAGES_CONSEIL[camp];
  const pos = (a: number) => Math.max(0, s * a) - Math.max(0, -s * a); // poids gagné par le camp, perdu par l'adversaire
  const types = (Object.keys(IMPACT) as TypeAction[]).filter(t => DOMAINE_ACTION[t] === d);
  for (const iso of ISO) {
    const types2 = types.filter(t => !peutAgir(e, camp, t, iso)); if (!types2.length) continue;
    const avant = alignement(e, iso), bord = auBord(e, iso)?.vers === camp, p = e.pays[iso], o = c.orientations?.[iso]; // une fois par pays
    for (const type of types2) {
    if (type === "intimidation" && s * avant < -0.1) continue; // il se braquerait : jamais un bon choix automatique
    const [canal, k0, adverse] = IMPACT[type]!, cible = adverse ? adversaire(camp) : camp;
    const k = (adverse ? -1 : 1) * k0 * (adverse ? 1 : 1 - p.influence[cible][canal] / 100) * bonusPriorite(c, type) * boostCommerce(iso, camp, type);
    const v0 = p.influence[cible][canal]; p.influence[cible][canal] = Math.max(0, v0 + k); const apres = alignement(e, iso); p.influence[cible][canal] = v0; // restauration exacte : l'état d'entrée reste intact
    const mult = o === "cultiver" && !adverse ? 1.5 : o === "contester" && (adverse || type === "clandestin") ? 1.5 : 1;
    const bascule = s * (palier(apres) - palier(avant)) > 0;
    const gain = 100 * W[iso] * (pos(apres) - pos(avant)) * mult * (bascule ? r.palier : bord ? r.bord : 1);
    const v = gain / ACTIONS[type].pa - ACTIONS[type].budget * r.prixBudget * prixBudget(e, camp);
    const raison = bascule ? "fait basculer le pays d'un palier" : bord ? "pays au bord de la bascule" : o ? `orientation : ${ORIENTATIONS[o].toLowerCase()}`
      : boostCommerce(iso, camp, type) >= BOOST_COMMERCE.reciproque ? "commerce complémentaire" : type === "electorale" ? "élection en vue"
      : adverse ? "fait reculer l'adversaire" : W[iso] >= 0.01 ? "pays de poids" : "gain sûr et bon marché";
    out.push({ type, iso, v, raison });
  } }
  return out.sort((a, b) => b.v - a.v);
}
// Les conseillers proposent 6 options variées (6 pays distincts, au plus 2 du même type) parmi les meilleures.
export const NB_CONSEILS = 6;
export function conseils(e: EtatPartie, camp: Camp, d: Domaine): Option[] {
  const res: Option[] = [], vusIso = new Set<string>(), vusType = new Map<string, number>();
  const reste = e.camps[camp].points?.[d] ?? 0;
  const liste = candidats(e, camp, d).filter(x => ACTIONS[x.type].pa <= reste && x.v > 0); // ni points de crise, ni action à perte
  for (const maxType of [2, NB_CONSEILS]) for (const x of liste) { // d'abord la variété des types, puis on complète
    if (res.length >= NB_CONSEILS) break;
    if (vusIso.has(x.iso) || (vusType.get(x.type) ?? 0) >= maxType) continue;
    res.push(x); vusIso.add(x.iso); vusType.set(x.type, (vusType.get(x.type) ?? 0) + 1);
  }
  return res;
}
// Un ministre en mode automatique dépense les points de son domaine (jamais les points de crise).
export function jouerDomaine(e0: EtatPartie, camp: Camp, d: Domaine): EtatPartie {
  let e = e0;
  const liste = candidats(e, camp, d).filter(x => x.v > 0); // évalué une fois par trimestre et par domaine
  for (let garde = 0; garde < 4; garde++) {
    const c = e.camps[camp], reste = c.points?.[d] ?? 0; if (reste <= 0) break;
    const best = liste.find(x => ACTIONS[x.type].pa <= reste && !peutAgir(e, camp, x.type, x.iso)); // le ministre ne touche pas aux points de crise
    if (!best) break;
    e = agir(e, camp, best.type, best.iso);
  }
  return e;
}

// ---------- Orientations permanentes par pays ----------
// Une part du budget (0 à 15 %, 5 % par défaut) se répartit chaque trimestre entre les pays orientés.
// Par unité de budget : cultiver = influence politique et économique +0,8 ; contester = influence politique adverse −1 ;
// surveiller = influence militaire +0,3 et une chance sur deux de démasquer chaque opération secrète adverse du trimestre.
export type Orientation = "cultiver" | "surveiller" | "contester";
export const ORIENTATIONS: Record<Orientation, string> = { cultiver: "Cultiver", surveiller: "Surveiller", contester: "Contester" };
export const PART_ORIENTATIONS = { defaut: 0.05, max: 0.15 };
export function orienter(e0: EtatPartie, camp: Camp, iso: string, o: Orientation | null): EtatPartie {
  const e = copie(e0), c = e.camps[camp]; c.orientations ??= {};
  if (o) c.orientations[iso] = o; else delete c.orientations[iso];
  return e;
}
export function reglerPartOrientations(e0: EtatPartie, camp: Camp, part: number): EtatPartie {
  const e = copie(e0); e.camps[camp].partOrientations = borne(part, 0, PART_ORIENTATIONS.max); return e;
}
function appliquerOrientations(e: EtatPartie) {
  for (const camp of CAMPS) {
    const c = e.camps[camp], liste = Object.entries(c.orientations ?? {}).filter(([i]) => e.pays[i] && i !== "USA" && i !== "CHN");
    if (!liste.length) continue;
    const montant = arrondi(Math.max(0, c.budget) * (c.partOrientations ?? PART_ORIENTATIONS.defaut)); if (montant <= 0) continue;
    c.budget = arrondi(c.budget - montant);
    const u = montant / liste.length, adv = adversaire(camp);
    for (const [iso, o] of liste) {
      const inf = e.pays[iso].influence;
      if (o === "cultiver") for (const k of ["p", "e"] as Canal[]) inf[camp][k] = borne(inf[camp][k] + 0.8 * u * (1 - inf[camp][k] / 100), 0, 100);
      if (o === "contester") inf[adv].p = borne(inf[adv].p - u, 0, 100);
      if (o === "surveiller") {
        inf[camp].m = borne(inf[camp].m + 0.3 * u, 0, 100);
        for (const j of e.journal) if (j.round === e.round && j.camp === adv && j.pays?.[0] === iso && j.titre.startsWith("Opération secrète") && !j.visiblePour.includes(camp) && tirer(e) < 0.5) j.visiblePour.push(camp);
      }
    }
  }
}
// L'IA oriente chaque année : cultiver les 3 plus grosses économies indécises, contester les 2 plus grosses qui penchent vers l'adversaire.
function iaOrienter(e: EtatPartie, camp: Camp) {
  const s = sensDe(camp), c = e.camps[camp], par = (l: string[]) => l.sort((a, b) => e.pays[b].pib - e.pays[a].pib);
  const pays = ISO.filter(i => i !== "USA" && i !== "CHN");
  c.orientations = {};
  for (const i of par(pays.filter(i => s * alignement(e, i) > -0.1 && s * alignement(e, i) < 0.4)).slice(0, 3)) c.orientations[i] = "cultiver";
  for (const i of par(pays.filter(i => s * alignement(e, i) <= -0.1 && s * alignement(e, i) > -0.4)).slice(0, 2)) c.orientations[i] = "contester";
}

// ---------- Priorité annuelle ----------
export type Priorite = "economie" | "securite" | "rayonnement";
export const BONUS_PRIORITE = 1.25, DURABLE = 0.25;
export const PRIORITES: Record<Priorite, { nom: string; actions: TypeAction[]; texte: string }> = {
  economie: { nom: "Puissance économique", actions: ["economique", "developpement", "infrastructure", "espionnage"], texte: "Influence économique, développement, ports et aéroports, espionnage économique : +25 %." },
  securite: { nom: "Sécurité", actions: ["militaire", "armes", "exercices"], texte: "Bases, ventes d'armes, exercices et zones stratégiques : +25 %." },
  rayonnement: { nom: "Rayonnement", actions: ["politique", "culturelle", "contre", "clandestin"], texte: "Influence politique et culturelle, contre-influence, soutien clandestin, campagnes régionales : +25 %." },
};
const bonusPriorite = (c: EtatCamp, type: TypeAction) => c.priorite && PRIORITES[c.priorite].actions.includes(type) ? BONUS_PRIORITE : 1;
export function peutChoisirPriorite(e: EtatPartie, camp: Camp): string | null {
  return e.camps[camp].prioriteAnnee === date(e.round).annee ? "Une priorité par an : tu pourras en changer l'an prochain." : null;
}
export function choisirPriorite(e0: EtatPartie, camp: Camp, p: Priorite): EtatPartie {
  const err = peutChoisirPriorite(e0, camp); if (err) throw new Error(err);
  const e = copie(e0), c = e.camps[camp]; c.priorite = p; c.prioriteAnnee = date(e.round).annee;
  noter(e, { type: "politique", titre: `Priorité de l'année : ${PRIORITES[p].nom}`, texte: PRIORITES[p].texte, camp, visiblePour: [camp] });
  return e;
}
// Investissement durable : rang de la série d'actions consécutives sur un pays (0 à 3) qui s'appliquera à la prochaine action.
export function serieDurable(e: EtatPartie, camp: Camp, iso: string): number {
  const su = e.camps[camp].suite?.[iso];
  return !su ? 0 : su.round === e.round ? su.n : su.round === e.round - 1 ? Math.min(3, su.n + 1) : 0;
}

// ---------- Pays au bord de la bascule ----------
const SEUILS_PALIERS = [-0.4, -0.1, 0.1, 0.4], MARGE_BORD = 0.03;
export function auBord(e: EtatPartie, iso: string): { seuil: number; vers: Camp } | null {
  if (iso === "USA" || iso === "CHN") return null;
  const a = alignement(e, iso), s = SEUILS_PALIERS.find(x => Math.abs(a - x) < MARGE_BORD);
  return s === undefined ? null : { seuil: s, vers: a < s ? "OCC" : "CHN" }; // vers : le bloc qui le ferait basculer en le poussant un peu
}

// ---------- Mémoire des pays (cachée) ----------
// Gratitude après une aide ou un projet de développement, rancune après une déstabilisation, un scandale ou une crise exploitée.
// Chaque trimestre, l'influence politique dérive de 0,05 × mémoire, et la mémoire s'efface de 5 %.
export const MEMOIRE = { derive: 0.05, oubli: 0.05, borne: 10 };
function memoriser(e: EtatPartie, iso: string, camp: Camp, v: number) {
  if (iso === "USA" || iso === "CHN") return;
  const m = (e.memoire[iso] ??= { OCC: 0, CHN: 0 }); m[camp] = borne(m[camp] + v, -MEMOIRE.borne, MEMOIRE.borne);
}
function effetMemoire(e: EtatPartie) {
  for (const [iso, m] of Object.entries(e.memoire)) for (const c of CAMPS) {
    const inf = e.pays[iso]?.influence[c]; if (!inf || !m[c]) continue;
    inf.p = borne(inf.p + MEMOIRE.derive * m[c], 0, 100); m[c] *= 1 - MEMOIRE.oubli; if (Math.abs(m[c]) < 0.05) m[c] = 0;
  }
}
// Ce que rapportent les ambassadeurs : une estimation bruitée (±1), jamais la valeur exacte.
export function estimationMemoire(e: EtatPartie, iso: string, camp: Camp): "gratitude" | "rancune" | "indifférence" {
  const v = (e.memoire[iso]?.[camp] ?? 0) + (((iso.charCodeAt(0) * 7 + iso.charCodeAt(2) * 3 + e.round * 5 + (camp === "OCC" ? 1 : 2)) % 5) - 2) / 2;
  return v >= 2.5 ? "gratitude" : v <= -2.5 ? "rancune" : "indifférence";
}

// ---------- Usure de l'opinion (cachée) ----------
// Chaque engagement militaire ajoute 1 de lassitude (0,5 pour une vente d'armes), qui s'efface de 10 % par trimestre.
// Au-delà de 3, le capital politique perd 0,3 par point et par trimestre. Seul un sondage signale le seuil franchi.
export const FATIGUE = { seuil: 3, cout: 0.3, oubli: 0.1 };
function usureOpinion(e: EtatPartie) {
  for (const camp of CAMPS) {
    const c = e.camps[camp], f = c.fatigue ?? 0;
    if (f > FATIGUE.seuil) c.cp = borne(c.cp - FATIGUE.cout * (f - FATIGUE.seuil), 0, 100);
    const apres = f * (1 - FATIGUE.oubli);
    if (f < FATIGUE.seuil) c.sondage = false;
    if (f > FATIGUE.seuil + 1 && !c.sondage) {
      c.sondage = true;
      noter(e, { type: "politique", titre: "Sondages : l'opinion se lasse des engagements militaires", texte: "Les enquêtes montrent une lassitude croissante ; ton capital politique s'en ressent.", camp, visiblePour: [camp] });
    }
    c.fatigue = apres;
  }
}

// ---------- Renseignement ----------
export const RENSEIGNEMENT = { pa: 1, budget: 1, recul: 4 };
export function peutRenseigner(e: EtatPartie, camp: Camp): string | null {
  const c = e.camps[camp];
  if (c.renseigne === e.round) return "Un rapport de renseignement par trimestre.";
  if (dispo(c, "secret") < RENSEIGNEMENT.pa) return `Points services secrets insuffisants (${RENSEIGNEMENT.pa}).`;
  if (c.budget < RENSEIGNEMENT.budget) return `Budget insuffisant (${RENSEIGNEMENT.budget}).`;
  return null;
}
export function renseigner(e0: EtatPartie, camp: Camp): EtatPartie {
  const err = peutRenseigner(e0, camp); if (err) throw new Error(err);
  const e = copie(e0), c = e.camps[camp], adv = adversaire(camp), ca = e.camps[adv];
  depenser(c, "secret", RENSEIGNEMENT.pa); c.budget = arrondi(c.budget - RENSEIGNEMENT.budget); c.renseigne = e.round;
  const ops = e.journal.filter(j => j.camp === adv && j.titre.startsWith("Opération secrète") && j.round >= e.round - RENSEIGNEMENT.recul && !j.visiblePour.includes(camp));
  for (const j of ops) j.visiblePour.push(camp);
  const ag = ca.agenda ? AGENDAS.find(a => a.id === ca.agenda!.id) : null;
  noter(e, { type: "action", titre: "Rapport de renseignement", camp, visiblePour: [camp],
    texte: `${ops.length ? `${ops.length} opération(s) secrète(s) adverse(s) découverte(s) : ${ops.map(j => j.titre.replace(/^Opération secrète, /, "")).join(" ; ")}.` : "Aucune opération secrète adverse décelée sur l'année écoulée."} Main adverse : ${ca.main.map(id => CARTES[id]?.titre ?? id).join(", ") || "vide"}.${ag ? ` Agenda adverse probable : ${ag.texte(adv)}.` : ""}` });
  return e;
}

// ---------- Agenda secret annuel ----------
// Tiré au 1er trimestre pour chaque bloc, révélé à tous en fin d'année. Atteint : capital politique +4, budget +3.
const sensDe = (camp: Camp) => camp === "OCC" ? 1 : -1;
const paliersZone = (e: EtatPartie, camp: Camp, z: string) => ZONES[z].pays.filter(i => e.pays[i]).reduce((s, i) => s + sensDe(camp) * palier(alignement(e, i)), 0);
export const AGENDAS: { id: string; texte: (camp: Camp) => string; mesure: (e: EtatPartie, camp: Camp) => number; cible: number }[] = [
  { id: "afrique", texte: () => "faire progresser de 2 paliers d'alignement l'Afrique subsaharienne", mesure: (e, c) => paliersZone(e, c, "afrique"), cible: 2 },
  { id: "asie_sud_est", texte: () => "faire progresser d'un palier un pays d'Asie du Sud-Est", mesure: (e, c) => paliersZone(e, c, "asie_sud_est"), cible: 1 },
  { id: "moyen_orient", texte: () => "faire progresser d'un palier un pays du Moyen-Orient", mesure: (e, c) => paliersZone(e, c, "moyen_orient"), cible: 1 },
  { id: "amerique_latine", texte: () => "faire progresser d'un palier un pays d'Amérique latine", mesure: (e, c) => paliersZone(e, c, "amerique_latine"), cible: 1 },
  { id: "zones", texte: () => "gagner 6 points de présence nets dans les zones stratégiques (l'érosion compte)", mesure: (e, c) => Object.values(e.zones).reduce((s, z) => s + z[c], 0), cible: 6 },
];
export const RECOMPENSE_AGENDA = { cp: 4, budget: 3 };
function tirerAgenda(e: EtatPartie, camp: Camp) {
  const a = AGENDAS[Math.floor(tirer(e) * AGENDAS.length)];
  e.camps[camp].agenda = { id: a.id, annee: date(e.round).annee, depart: a.mesure(e, camp) };
}
function bilanAgenda(e: EtatPartie, camp: Camp) {
  const ag = e.camps[camp].agenda; if (!ag) return;
  const a = AGENDAS.find(x => x.id === ag.id)!, progres = a.mesure(e, camp) - ag.depart, ok = progres >= a.cible - 1e-9;
  if (ok) { e.camps[camp].cp = borne(e.camps[camp].cp + RECOMPENSE_AGENDA.cp, 0, 100); e.camps[camp].budget += RECOMPENSE_AGENDA.budget; }
  noter(e, { type: "politique", titre: `Agenda secret du ${nomBloc(camp)} : ${ok ? "atteint" : "manqué"}`, camp, visiblePour: [...CAMPS],
    texte: `Objectif : ${a.texte(camp)}. Progrès : ${Math.round(progres * 10) / 10} sur ${a.cible}.${ok ? ` Récompense : capital politique +${RECOMPENSE_AGENDA.cp}, budget +${RECOMPENSE_AGENDA.budget}.` : ""}` });
  e.camps[camp].agenda = null;
}
export function progresAgenda(e: EtatPartie, camp: Camp): { texte: string; progres: number; cible: number } | null {
  const ag = e.camps[camp].agenda; if (!ag) return null;
  const a = AGENDAS.find(x => x.id === ag.id)!;
  return { texte: a.texte(camp), progres: a.mesure(e, camp) - ag.depart, cible: a.cible };
}

// ---------- Élections dans les pays clés (dates réelles jusqu'en 2026, projetées selon le calendrier légal ensuite) ----------
export interface ElectionPays { iso: string; annee: number; trimestre: 1 | 2 | 3 | 4; nom: string }
const el = (iso: string, annee: number, trimestre: 1 | 2 | 3 | 4, nom: string): ElectionPays => ({ iso, annee, trimestre, nom });
export const ELECTIONS_PAYS: ElectionPays[] = [
  el("RUS", 2000, 1, "présidentielle"), el("RUS", 2004, 1, "présidentielle"), el("RUS", 2008, 1, "présidentielle"),
  el("TWN", 2000, 1, "présidentielle"), el("TWN", 2004, 1, "présidentielle"), el("TWN", 2008, 1, "présidentielle"),
  el("ESP", 2000, 1, "législatives"), el("ESP", 2004, 1, "législatives"), el("ESP", 2008, 1, "législatives"),
  el("MEX", 2000, 3, "présidentielle"), el("MEX", 2006, 3, "présidentielle"), el("VEN", 2000, 3, "présidentielle"), el("VEN", 2006, 4, "présidentielle"),
  el("JPN", 2000, 2, "législatives"), el("JPN", 2003, 4, "législatives"), el("JPN", 2005, 3, "législatives"),
  el("CAN", 2000, 4, "fédérales"), el("CAN", 2004, 2, "fédérales"), el("CAN", 2006, 1, "fédérales"), el("CAN", 2008, 4, "fédérales"),
  el("IRN", 2001, 2, "présidentielle"), el("IRN", 2005, 2, "présidentielle"), el("GBR", 2001, 2, "législatives"), el("GBR", 2005, 2, "législatives"),
  el("ITA", 2001, 2, "législatives"), el("ITA", 2006, 2, "législatives"), el("ITA", 2008, 2, "législatives"),
  el("AUS", 2001, 4, "fédérales"), el("AUS", 2004, 4, "fédérales"), el("AUS", 2007, 4, "fédérales"),
  el("FRA", 2002, 2, "présidentielle"), el("FRA", 2007, 2, "présidentielle"), el("DEU", 2002, 3, "fédérales"), el("DEU", 2005, 3, "fédérales"),
  el("BRA", 2002, 4, "présidentielle"), el("BRA", 2006, 4, "présidentielle"), el("TUR", 2002, 4, "législatives"), el("TUR", 2007, 3, "législatives"),
  el("PAK", 2002, 4, "législatives"), el("PAK", 2008, 1, "législatives"), el("KOR", 2002, 4, "présidentielle"), el("KOR", 2007, 4, "présidentielle"),
  el("ARG", 2003, 2, "présidentielle"), el("ARG", 2007, 4, "présidentielle"), el("NGA", 2003, 2, "présidentielle"), el("NGA", 2007, 2, "présidentielle"),
  el("IND", 2004, 2, "législatives"), el("ZAF", 2004, 2, "législatives"), el("PHL", 2004, 2, "présidentielle"), el("IDN", 2004, 3, "présidentielle"),
  el("UKR", 2004, 4, "présidentielle"),
  // 2009-2025
  el("RUS", 2012, 1, "présidentielle"), el("RUS", 2018, 1, "présidentielle"), el("RUS", 2024, 1, "présidentielle"),
  el("TWN", 2012, 1, "présidentielle"), el("TWN", 2016, 1, "présidentielle"), el("TWN", 2020, 1, "présidentielle"), el("TWN", 2024, 1, "présidentielle"),
  el("ESP", 2011, 4, "législatives"), el("ESP", 2015, 4, "législatives"), el("ESP", 2016, 2, "législatives"), el("ESP", 2019, 4, "législatives"), el("ESP", 2023, 3, "législatives"),
  el("MEX", 2012, 3, "présidentielle"), el("MEX", 2018, 3, "présidentielle"), el("MEX", 2024, 2, "présidentielle"),
  el("VEN", 2012, 4, "présidentielle"), el("VEN", 2013, 2, "présidentielle"), el("VEN", 2018, 2, "présidentielle"), el("VEN", 2024, 3, "présidentielle"),
  el("JPN", 2009, 3, "législatives"), el("JPN", 2012, 4, "législatives"), el("JPN", 2014, 4, "législatives"), el("JPN", 2017, 4, "législatives"), el("JPN", 2021, 4, "législatives"), el("JPN", 2024, 4, "législatives"),
  el("CAN", 2011, 2, "fédérales"), el("CAN", 2015, 4, "fédérales"), el("CAN", 2019, 4, "fédérales"), el("CAN", 2021, 3, "fédérales"), el("CAN", 2025, 2, "fédérales"),
  el("IRN", 2009, 2, "présidentielle"), el("IRN", 2013, 2, "présidentielle"), el("IRN", 2017, 2, "présidentielle"), el("IRN", 2021, 2, "présidentielle"), el("IRN", 2024, 3, "présidentielle"),
  el("GBR", 2010, 2, "législatives"), el("GBR", 2015, 2, "législatives"), el("GBR", 2017, 2, "législatives"), el("GBR", 2019, 4, "législatives"), el("GBR", 2024, 3, "législatives"),
  el("ITA", 2013, 1, "législatives"), el("ITA", 2018, 1, "législatives"), el("ITA", 2022, 3, "législatives"),
  el("AUS", 2010, 3, "fédérales"), el("AUS", 2013, 3, "fédérales"), el("AUS", 2016, 3, "fédérales"), el("AUS", 2019, 2, "fédérales"), el("AUS", 2022, 2, "fédérales"), el("AUS", 2025, 2, "fédérales"),
  el("FRA", 2012, 2, "présidentielle"), el("FRA", 2017, 2, "présidentielle"), el("FRA", 2022, 2, "présidentielle"),
  el("DEU", 2009, 3, "fédérales"), el("DEU", 2013, 3, "fédérales"), el("DEU", 2017, 3, "fédérales"), el("DEU", 2021, 3, "fédérales"), el("DEU", 2025, 1, "fédérales"),
  el("BRA", 2010, 4, "présidentielle"), el("BRA", 2014, 4, "présidentielle"), el("BRA", 2018, 4, "présidentielle"), el("BRA", 2022, 4, "présidentielle"),
  el("TUR", 2011, 2, "législatives"), el("TUR", 2015, 4, "législatives"), el("TUR", 2018, 2, "présidentielle"), el("TUR", 2023, 2, "présidentielle"),
  el("PAK", 2013, 2, "législatives"), el("PAK", 2018, 3, "législatives"), el("PAK", 2024, 1, "législatives"),
  el("KOR", 2012, 4, "présidentielle"), el("KOR", 2017, 2, "présidentielle"), el("KOR", 2022, 1, "présidentielle"), el("KOR", 2025, 2, "présidentielle"),
  el("ARG", 2011, 4, "présidentielle"), el("ARG", 2015, 4, "présidentielle"), el("ARG", 2019, 4, "présidentielle"), el("ARG", 2023, 4, "présidentielle"),
  el("NGA", 2011, 2, "présidentielle"), el("NGA", 2015, 1, "présidentielle"), el("NGA", 2019, 1, "présidentielle"), el("NGA", 2023, 1, "présidentielle"),
  el("IND", 2009, 2, "législatives"), el("IND", 2014, 2, "législatives"), el("IND", 2019, 2, "législatives"), el("IND", 2024, 2, "législatives"),
  el("ZAF", 2009, 2, "législatives"), el("ZAF", 2014, 2, "législatives"), el("ZAF", 2019, 2, "législatives"), el("ZAF", 2024, 2, "législatives"),
  el("PHL", 2010, 2, "présidentielle"), el("PHL", 2016, 2, "présidentielle"), el("PHL", 2022, 2, "présidentielle"),
  el("IDN", 2009, 3, "présidentielle"), el("IDN", 2014, 3, "présidentielle"), el("IDN", 2019, 2, "présidentielle"), el("IDN", 2024, 1, "présidentielle"),
  el("UKR", 2010, 1, "présidentielle"), el("UKR", 2014, 2, "présidentielle"), el("UKR", 2019, 2, "présidentielle"),
  // 2026 (réel) puis projections selon la durée légale des mandats
  el("BRA", 2026, 4, "présidentielle"), el("BRA", 2030, 4, "présidentielle"), el("BRA", 2034, 4, "présidentielle"),
  el("FRA", 2027, 2, "présidentielle"), el("FRA", 2032, 2, "présidentielle"), el("KOR", 2030, 2, "présidentielle"), el("KOR", 2035, 2, "présidentielle"),
  el("TWN", 2028, 1, "présidentielle"), el("TWN", 2032, 1, "présidentielle"), el("RUS", 2030, 1, "présidentielle"),
  el("ESP", 2027, 3, "législatives"), el("ESP", 2031, 3, "législatives"), el("MEX", 2030, 2, "présidentielle"), el("VEN", 2030, 3, "présidentielle"),
  el("JPN", 2028, 3, "législatives"), el("JPN", 2032, 3, "législatives"), el("CAN", 2029, 4, "fédérales"), el("CAN", 2033, 4, "fédérales"),
  el("IRN", 2028, 2, "présidentielle"), el("IRN", 2032, 2, "présidentielle"), el("GBR", 2029, 2, "législatives"), el("GBR", 2034, 2, "législatives"),
  el("ITA", 2027, 3, "législatives"), el("ITA", 2032, 3, "législatives"), el("AUS", 2028, 2, "fédérales"), el("AUS", 2031, 2, "fédérales"), el("AUS", 2034, 2, "fédérales"),
  el("DEU", 2029, 1, "fédérales"), el("DEU", 2033, 1, "fédérales"), el("TUR", 2028, 2, "présidentielle"), el("TUR", 2033, 2, "présidentielle"),
  el("PAK", 2029, 1, "législatives"), el("PAK", 2034, 1, "législatives"), el("ARG", 2027, 4, "présidentielle"), el("ARG", 2031, 4, "présidentielle"), el("ARG", 2035, 4, "présidentielle"),
  el("NGA", 2027, 1, "présidentielle"), el("NGA", 2031, 1, "présidentielle"), el("NGA", 2035, 1, "présidentielle"),
  el("IND", 2029, 2, "législatives"), el("IND", 2034, 2, "législatives"), el("ZAF", 2029, 2, "législatives"), el("ZAF", 2034, 2, "législatives"),
  el("PHL", 2028, 2, "présidentielle"), el("PHL", 2034, 2, "présidentielle"), el("IDN", 2029, 1, "présidentielle"), el("IDN", 2034, 1, "présidentielle"),
];
const roundDe = (annee: number, trimestre: number) => (annee - 2000) * 4 + trimestre - 1;
// Prochaine élection d'un pays dans l'année qui vient (ce trimestre compris).
export function electionProchaine(e: EtatPartie, iso: string): ElectionPays | null {
  return ELECTIONS_PAYS.find(x => x.iso === iso && roundDe(x.annee, x.trimestre) >= e.round && roundDe(x.annee, x.trimestre) <= e.round + 4) ?? null;
}
// Scrutin : soutiens de campagne (1 point chacun), penchant actuel (×2) et hasard (±1). Écart sous 1 : continuité.
function resoudreElections(e: EtatPartie) {
  for (const x of ELECTIONS_PAYS.filter(x => roundDe(x.annee, x.trimestre) === e.round && e.pays[x.iso])) {
    const k = e.campagnesElectorales[`${x.iso}:${x.annee}`] ?? { OCC: 0, CHN: 0 };
    const d = k.OCC - k.CHN + 2 * alignement(e, x.iso) + (tirer(e) - 0.5) * 2, g: Camp | null = d >= 1 ? "OCC" : d <= -1 ? "CHN" : null;
    if (g) { const p = e.pays[x.iso]; p.influence[g].p = borne(p.influence[g].p + 6, 0, 100); p.influence[adversaire(g)].p = borne(p.influence[adversaire(g)].p - 4, 0, 100); }
    noter(e, { type: "politique", titre: `${x.nom === "présidentielle" ? "Élection" : "Élections"} ${x.nom} ${enPays(x.iso, nomPays(x.iso))}`, pays: [x.iso], visiblePour: [...CAMPS],
      texte: `${g ? `Le vainqueur penche vers le ${nomBloc(g)} (influence politique +6, −4 pour l'autre bloc).` : "Continuité : le résultat ne change pas l'orientation du pays."} Soutiens de campagne : bloc USA ${k.OCC}, bloc Chine ${k.CHN}.` });
  }
}

// ---------- Prêts et dette (issue cachée, à 3 ans) ----------
function echeancesPrets(e: EtatPartie) {
  for (const pr of e.prets.filter(x => x.echeance === e.round)) {
    const p = e.pays[pr.iso], c = e.camps[pr.camp], risque = borne(0.1 + (50 - p.stabilite) / 150, 0.05, 0.5);
    if (tirer(e) >= risque) { c.budget += pr.montant + 1; noter(e, { type: "action", titre: `Prêt remboursé : ${nomPays(pr.iso)}`, texte: `Budget +${pr.montant + 1} (intérêts compris).`, camp: pr.camp, pays: [pr.iso], visiblePour: [pr.camp] }); continue; }
    const h = hubLibre(e, pr.camp, pr.iso);
    if (tirer(e) < 0.5 && h) {
      e.concessions.push({ hub: h.id, iso: pr.iso, camp: pr.camp, fin: e.round + 15 }); p.influence[pr.camp].e = borne(p.influence[pr.camp].e + 6, 0, 100); memoriser(e, pr.iso, pr.camp, -3);
      noter(e, { type: "action", titre: `Piège de la dette : ${nomPays(pr.iso)} cède ${h.nom}`, texte: "Faute de pouvoir rembourser, le pays concède son port ou son aéroport pour 4 ans ; l'opinion locale le vit mal (rancune).", camp: pr.camp, pays: [pr.iso], visiblePour: [...CAMPS] });
    } else {
      memoriser(e, pr.iso, pr.camp, 2);
      noter(e, { type: "action", titre: `Dette annulée : ${nomPays(pr.iso)}`, texte: `Le pays fait défaut ; tu annules la créance (${pr.montant} de budget perdus), il s'en souviendra (gratitude).`, camp: pr.camp, pays: [pr.iso], visiblePour: [...CAMPS] });
    }
  }
  e.prets = e.prets.filter(x => x.echeance > e.round);
}

// ---------- Interventions armées (issue cachée) ----------
function suiviInterventions(e: EtatPartie) {
  for (const it of e.interventions) {
    const c = e.camps[it.camp]; c.budget = Math.max(0, c.budget - 1); c.fatigue = (c.fatigue ?? 0) + 0.5;
    if (it.fin !== e.round) continue;
    const p = e.pays[it.iso], pSucces = borne(0.5 + 0.4 * (p.influence[it.camp].m - p.influence[adversaire(it.camp)].m) / 100, 0.2, 0.85), ok = tirer(e) < pSucces;
    if (ok) p.influence[it.camp].p = borne(p.influence[it.camp].p + 15, 0, 100);
    else { p.influence[it.camp].p = borne(p.influence[it.camp].p - 10, 0, 100); c.cp = borne(c.cp - 8, 0, 100); }
    noter(e, { type: "action", titre: `Fin de l'intervention ${enPays(it.iso, nomPays(it.iso))} : ${ok ? "régime ami installé" : "enlisement et retrait"}`, camp: it.camp, pays: [it.iso], visiblePour: [...CAMPS],
      texte: ok ? "Le nouveau pouvoir est acquis à ton bloc (influence politique +15)." : "Les troupes se retirent sans avoir atteint leurs objectifs (influence politique −10, capital politique −8)." });
  }
  e.interventions = e.interventions.filter(x => x.fin > e.round);
}

// ---------- Crises en chaîne ----------
// Une crise laissée sans réponse (aucun bloc n'a réagi) a 35 % de chances d'en provoquer une autre, 2 à 4 trimestres plus tard.
export const CHAINES: Record<string, string> = {
  secheresse: "famine", famine: "crise_migratoire", guerre_civile: "crise_migratoire", flambee_alimentaire: "manifestations", manifestations: "election_rupture",
  hyperinflation: "manifestations", crise_change: "defaut_souverain", krach_boursier: "crise_bancaire", crise_bancaire: "defaut_souverain",
  coup_etat: "manifestations", repression: "guerre_civile", inondation: "epidemie", seisme: "crise_migratoire", attentat: "repression", defaut_souverain: "manifestations",
};
export const P_CHAINE = 0.35;
function programmerChaines(e: EtatPartie) {
  e.journal.forEach((j, i) => {
    if (j.round !== e.round || j.type !== "generique" || !j.reactif || !j.famille || !CHAINES[j.famille] || !j.pays?.length) return;
    if (CAMPS.some(c => e.camps[c].reactions.includes(i))) return;
    if (tirer(e) < P_CHAINE) e.chaines.push({ iso: j.pays[0], famille: CHAINES[j.famille], round: e.round + 2 + Math.floor(tirer(e) * 3), source: j.titre });
  });
}
function declencherChaines(e: EtatPartie) {
  const debutAn = e.round - (e.round % 4), deja = (iso: string) => e.journal.filter(j => j.round >= debutAn && j.type === "generique" && j.pays?.length === 1 && j.pays[0] === iso && j.famille).map(j => j.famille!);
  for (const ch of e.chaines.filter(x => x.round === e.round)) {
    const modeles = MODELES_PAR_FAMILLE[ch.famille]; if (!modeles?.length || !e.pays[ch.iso]) continue;
    const d = deja(ch.iso); if (d.length >= MAX_GENERIQUES_PAYS_AN || d.includes(ch.famille)) continue; // le plafond annuel vaut aussi pour les crises en chaîne
    const m = modeles[Math.floor(tirer(e) * modeles.length)], h = habiller(e, ch.famille, m, ch.iso), avant = e.round < 92;
    executer(e, rebond(m.effets, avant, 1, resilience(e, ch.iso)), null, ch.iso, h.titre, () => 1);
    noter(e, { type: "generique", titre: h.titre, texte: `${h.texte} Conséquence de : ${ch.source}.`, famille: ch.famille, pays: [ch.iso], visiblePour: visibleDans(e, [ch.iso]), intensite: 1,
      reactif: m.effets.some(ef => (ef.type === "stabilite" && ef.valeur < 0) || (ef.type === "croissance" && ef.points < 0)), effets: decrire(e, rebond(m.effets, false, 1, resilience(e, ch.iso)), null, ch.iso) });
    const duree = DUREE_CONFLIT[ch.famille]; if (duree) e.conflits.push({ iso: ch.iso, titre: h.titre, fin: e.round + duree - 1 });
  }
  e.chaines = e.chaines.filter(x => x.round > e.round);
}

// ---------- Rumeurs ----------
// La moitié des événements historiques du trimestre suivant sont précédés d'une rumeur vague ; 15 % des trimestres, une fausse rumeur.
function rumeurs(e: EtatPartie) {
  const { annee, trimestre } = date(e.round + 1), nomF = (f: string) => (FAMILLES.find(x => x.id === f)?.nom ?? f).toLowerCase();
  for (const h of HISTORIQUES.filter(h => h.annee === annee && h.trimestre === trimestre)) if (tirer(e) < 0.5)
    noter(e, { type: "rumeur", titre: `Rumeurs : ${nomF(h.famille)} en vue`, texte: `Les chancelleries bruissent de rumeurs autour ${h.pays.length ? `de ${h.pays.slice(0, 3).map(nomPays).join(", ")}` : "du monde"}. Rien n'est sûr.`, pays: h.pays.slice(0, 3), visiblePour: [...CAMPS] });
  if (tirer(e) < 0.15) {
    const iso = ISO[Math.floor(tirer(e) * ISO.length)], f = FAMILLES[Math.floor(tirer(e) * FAMILLES.length)];
    noter(e, { type: "rumeur", titre: `Rumeurs : ${nomF(f.id)} en vue`, texte: `Les chancelleries bruissent de rumeurs autour de ${nomPays(iso)}. Rien n'est sûr.`, pays: [iso], visiblePour: [...CAMPS] });
  }
}

// ---------- Votes à l'ONU (Assemblée générale, chaque automne) ----------
const THEMES_ONU: Record<Camp, string[]> = {
  OCC: ["les droits de l'homme en Iran", "la non-prolifération nucléaire en Corée du Nord", "la situation au Darfour", "la liberté de la presse"],
  CHN: ["la non-ingérence dans les affaires intérieures", "la levée de l'embargo contre Cuba", "le droit au développement", "la non-militarisation de l'espace"],
};
export const LOBBY_ONU = { pa: 1, budget: 1, max: 2, poids: 0.08 };
function ouvrirSessionOnu(e: EtatPartie) {
  const { annee } = date(e.round), de: Camp = annee % 2 === 0 ? "OCC" : "CHN", t = THEMES_ONU[de];
  e.onu = { annee, theme: t[Math.floor(annee / 2) % t.length], de, lobby: { OCC: 0, CHN: 0 } };
  noter(e, { type: "politique", titre: `ONU : le ${nomBloc(de)} dépose une résolution sur ${e.onu.theme}`, texte: "Vote de l'Assemblée générale à la fin du 3e trimestre. Chaque bloc peut faire campagne auprès des délégations.", visiblePour: [...CAMPS] });
}
export function peutLobbyOnu(e: EtatPartie, camp: Camp): string | null {
  const c = e.camps[camp];
  if (!e.onu) return "Aucune résolution en discussion (session ouverte au 2e trimestre).";
  if (e.onu.lobby[camp] >= LOBBY_ONU.max) return `${LOBBY_ONU.max} campagnes au plus par session.`;
  if (dispo(c, "diplo") < LOBBY_ONU.pa) return "Points diplomatie insuffisants.";
  if (c.budget < LOBBY_ONU.budget) return "Budget insuffisant.";
  return null;
}
export function lobbyOnu(e0: EtatPartie, camp: Camp): EtatPartie {
  const err = peutLobbyOnu(e0, camp); if (err) throw new Error(err);
  const e = copie(e0); depenser(e.camps[camp], "diplo", LOBBY_ONU.pa); e.camps[camp].budget = arrondi(e.camps[camp].budget - LOBBY_ONU.budget); e.onu!.lobby[camp]++;
  return e;
}
// Chaque délégation vote selon son alignement, la campagne de chaque bloc, sa mémoire et un peu de hasard.
export const voteOnu = (e: EtatPartie) => voterOnu(structuredClone(e)); // projection : ne touche pas au hasard de l'état réel
function voterOnu(e: EtatPartie): { pour: string[]; contre: string[] } {
  const o = e.onu!, s = sensDe(o.de), pour: string[] = [], contre: string[] = [];
  for (const iso of ISO) {
    if (iso === leaderDe(o.de)) { pour.push(iso); continue; } if (iso === leaderDe(adversaire(o.de))) { contre.push(iso); continue; }
    const m = e.memoire[iso] ?? { OCC: 0, CHN: 0 };
    const v = s * alignement(e, iso) + LOBBY_ONU.poids * (o.lobby[o.de] - o.lobby[adversaire(o.de)]) + (m[o.de] - m[adversaire(o.de)]) / 40 + (tirer(e) - 0.5) * 0.3;
    (v > 0 ? pour : contre).push(iso);
  }
  return { pour, contre };
}
function cloreSessionOnu(e: EtatPartie) {
  if (!e.onu) return;
  const o = e.onu, { pour, contre } = voterOnu(e), adoptee = pour.length > contre.length;
  if (adoptee) { e.camps[o.de].cp = borne(e.camps[o.de].cp + 3, 0, 100); e.camps[adversaire(o.de)].cp = borne(e.camps[adversaire(o.de)].cp - 2, 0, 100); for (const i of pour) if (i !== "USA" && i !== "CHN") e.pays[i].influence[o.de].p = borne(e.pays[i].influence[o.de].p + 1, 0, 100); }
  else e.camps[o.de].cp = borne(e.camps[o.de].cp - 2, 0, 100);
  noter(e, { type: "politique", titre: `ONU : résolution sur ${o.theme} ${adoptee ? "adoptée" : "rejetée"} (${pour.length} pour, ${contre.length} contre)`, visiblePour: [...CAMPS],
    texte: adoptee ? `Succès diplomatique du ${nomBloc(o.de)} : capital politique +3 (adversaire −2), influence politique +1 chez chaque pays qui a voté pour.` : `Revers pour le ${nomBloc(o.de)} : capital politique −2.` });
  e.onu = null;
}

// ---------- Technologies ----------
export const SEUIL_TECHNO = 5, COUT_RECHERCHE = 2;
export const TECHNOLOGIES: Record<string, { nom: string; texte: string }> = {
  renouvelables: { nom: "Énergies renouvelables", texte: "Croissance du leader +0,1 point par an, durablement." },
  telecoms: { nom: "Internet mobile (3G)", texte: "Influence économique +2 dans chaque pays qui penche vers ton bloc." },
  satellites: { nom: "Satellites et navigation", texte: "Présence dans les zones stratégiques +25 % par action." },
  calcul: { nom: "Supercalculateurs et chiffrement", texte: "Risque d'être démasqué divisé par deux pour les opérations secrètes." },
  biotech: { nom: "Biotechnologies", texte: "Stabilité du leader +3, capital politique +3." },
};
export function peutRechercher(e: EtatPartie, camp: Camp, t: string): string | null {
  const c = e.camps[camp];
  if (!TECHNOLOGIES[t]) return "Technologie inconnue.";
  if (c.technologies?.includes(t)) return "Percée déjà obtenue.";
  if (c.paParPays[`techno`]) return "Un investissement de recherche par trimestre.";
  if (c.budget < COUT_RECHERCHE) return `Budget insuffisant (${COUT_RECHERCHE}).`;
  return null;
}
export function rechercher(e0: EtatPartie, camp: Camp, t: string): EtatPartie {
  const err = peutRechercher(e0, camp, t); if (err) throw new Error(err);
  const e = copie(e0), c = e.camps[camp], r = (c.recherche ??= {});
  c.budget -= COUT_RECHERCHE; c.paParPays.techno = 1; r[t] = (r[t] ?? 0) + 1;
  if (r[t] >= SEUIL_TECHNO) {
    (c.technologies ??= []).push(t); const l = leaderDe(camp);
    if (t === "renouvelables") e.pays[l].bonus.push({ points: 0.1, reste: 9999 });
    if (t === "telecoms") for (const i of ISO) if (i !== "USA" && i !== "CHN" && sensDe(camp) * alignement(e, i) >= 0.1) e.pays[i].influence[camp].e = borne(e.pays[i].influence[camp].e + 2, 0, 100);
    if (t === "biotech") { e.pays[l].stabilite = borne(e.pays[l].stabilite + 3, 0, 100); c.cp = borne(c.cp + 3, 0, 100); }
    noter(e, { type: "politique", titre: `Percée technologique du ${nomBloc(camp)} : ${TECHNOLOGIES[t].nom}`, texte: TECHNOLOGIES[t].texte, camp, visiblePour: [...CAMPS] });
  }
  return e;
}

// ---------- Blocus naval et course aux armements ----------
export const BLOCUS = { pa: 2, budget: 3, cp: 3, duree: 4 };
export function peutBloquer(e: EtatPartie, camp: Camp, detroit: string): string | null {
  const c = e.camps[camp];
  if (!DETROITS.some(d => d.id === detroit)) return "Détroit inconnu.";
  if (e.blocus) return "Un blocus est déjà en cours.";
  if (dispo(c, "defense") < BLOCUS.pa) return "Points défense insuffisants.";
  const riv = RIVERAINS[detroit] ?? [];
  if (!riv.some(i => (c.crans?.[i]?.coop ?? 0) >= 3)) return `Blocus : il faut une base militaire chez un pays riverain (${riv.map(nomPays).join(", ")}).`; if (c.budget < BLOCUS.budget) return "Budget insuffisant."; if (c.cp < 40) return "Capital politique 40 requis.";
  return null;
}
export function bloquer(e0: EtatPartie, camp: Camp, detroit: string): EtatPartie {
  const err = peutBloquer(e0, camp, detroit); if (err) throw new Error(err);
  const e = copie(e0), c = e.camps[camp], d = DETROITS.find(x => x.id === detroit)!;
  depenser(c, "defense", BLOCUS.pa); c.budget = arrondi(c.budget - BLOCUS.budget); c.cp -= BLOCUS.cp; c.fatigue = (c.fatigue ?? 0) + 1;
  e.blocus = { detroit, camp, fin: e.round + BLOCUS.duree - 1 }; e.blocages.push({ detroit, fin: e.round + BLOCUS.duree - 1 });
  const touches = [...new Set(FLUX.filter(f => f.detroits?.includes(detroit)).flatMap(f => f.pays))].filter(i => e.pays[i]);
  for (const iso of touches) { if (iso !== leaderDe(camp)) e.pays[iso].bonus.push({ points: -0.3, reste: BLOCUS.duree }); memoriser(e, iso, camp, -1); }
  e.tension = borne(e.tension + 8, 0, 100);
  noter(e, { type: "action", titre: `Blocus naval : ${d.nom}`, texte: `Le ${nomBloc(camp)} ferme le passage pour ${BLOCUS.duree} trimestres : les routes qui l'empruntent sont coupées, la croissance des pays qui en dépendent ralentit, tension +8.`, camp, pays: touches.slice(0, 8), visiblePour: [...CAMPS] });
  return e;
}
export function peutArmer(e: EtatPartie, camp: Camp): string | null {
  const c = e.camps[camp];
  if (c.course === date(e.round).annee) return "Une course aux armements par an.";
  return c.budget < 4 ? "Budget insuffisant (4)." : null;
}
export function courseArmements(e0: EtatPartie, camp: Camp): EtatPartie {
  const err = peutArmer(e0, camp); if (err) throw new Error(err);
  const e = copie(e0), c = e.camps[camp]; c.budget -= 4; c.course = date(e.round).annee; c.fatigue = (c.fatigue ?? 0) + 0.5;
  for (const i of ISO) if (i !== "USA" && i !== "CHN" && sensDe(camp) * alignement(e, i) >= 0.3) e.pays[i].influence[camp].m = borne(e.pays[i].influence[camp].m + 2, 0, 100);
  e.tension = borne(e.tension + 2, 0, 100); e.camps[adversaire(camp)].cp = borne(e.camps[adversaire(camp)].cp - 1, 0, 100);
  noter(e, { type: "action", titre: `Course aux armements : le ${nomBloc(camp)} réarme`, texte: "Budget de défense en hausse : influence militaire +2 chez tous tes alliés, tension +2, capital politique adverse −1.", camp, visiblePour: [...CAMPS] });
  return e;
}

// ---------- Guerre entre les deux leaders ----------
// Branchée sur les seuils de défaite : chaque trimestre de guerre coûte 3 % du PIB des deux leaders (vers la banqueroute)
// et 0,2 % de leur population ; le risque d'escalade nucléaire (4 % puis +2 points par trimestre) mène à l'effondrement des deux.
export const THEATRES: Record<string, { nom: string; pays: string[] }> = {
  taiwan: { nom: "détroit de Taïwan", pays: ["TWN", "JPN", "KOR", "PHL"] },
  mer_chine_sud: { nom: "mer de Chine méridionale", pays: ["VNM", "PHL", "MYS", "IDN"] },
  coree: { nom: "péninsule coréenne", pays: ["KOR", "PRK", "JPN"] },
};
export const GUERRE = { tension: 80, cp: 60, pib: 0.03, population: 0.002, nucleaire: 0.04, escalade: 0.02 };
export function peutDeclarerGuerre(e: EtatPartie, camp: Camp, theatre: string): string | null {
  if (!THEATRES[theatre]) return "Théâtre inconnu.";
  if (e.guerre) return "La guerre est déjà déclarée.";
  if (e.tension < GUERRE.tension) return `Il faut une tension d'au moins ${GUERRE.tension} (actuelle : ${Math.round(e.tension)}).`;
  if (e.camps[camp].cp < GUERRE.cp) return `Capital politique ${GUERRE.cp} requis.`;
  return null;
}
export function declarerGuerre(e0: EtatPartie, camp: Camp, theatre: string): EtatPartie {
  const err = peutDeclarerGuerre(e0, camp, theatre); if (err) throw new Error(err);
  const e = copie(e0); e.guerre = { theatre, agresseur: camp, debut: e.round }; e.tension = 100; e.camps[camp].fatigue = (e.camps[camp].fatigue ?? 0) + 4;
  for (const i of ISO) if (i !== "USA" && i !== "CHN") memoriser(e, i, camp, -1);
  noter(e, { type: "historique", titre: `Guerre entre les États-Unis et la Chine : ${THEATRES[theatre].nom}`, pays: ["USA", "CHN", ...THEATRES[theatre].pays], visiblePour: [...CAMPS],
    texte: `Le ${nomBloc(camp)} ouvre les hostilités. Chaque trimestre de guerre ampute de ${GUERRE.pib * 100} % le PIB des deux puissances ; le risque d'escalade nucléaire grandit avec la durée.` });
  return e;
}
function suiviGuerre(e: EtatPartie): { titre: string; texte: string } | null {
  const g = e.guerre; if (!g) return null;
  const duree = e.round - g.debut, risque = GUERRE.nucleaire + GUERRE.escalade * duree;
  if (tirer(e) < risque) {
    for (const l of ["USA", "CHN"]) e.pays[l].population *= 0.85;
    for (const i of ISO) e.pays[i].stabilite = borne(e.pays[i].stabilite - 10, 0, 100);
    return { titre: "Guerre nucléaire : défaite des deux camps", texte: "L'escalade devient nucléaire. Les deux puissances perdent des dizaines de millions d'habitants ; famines et hiver nucléaire frappent le monde entier." };
  }
  cacheMonde = null; for (const l of ["USA", "CHN"]) { e.pays[l].pib *= 1 - GUERRE.pib; e.pays[l].population *= 1 - GUERRE.population; }
  for (const c of CAMPS) { e.camps[c].budget = Math.max(0, e.camps[c].budget - 2); e.camps[c].cp = borne(e.camps[c].cp - (c === g.agresseur ? 2 : 1), 0, 100); }
  const mo = partFamille(e, "OCC", "militaire"), mc = partFamille(e, "CHN", "militaire"), fort: Camp = mo >= mc ? "OCC" : "CHN";
  for (const i of THEATRES[g.theatre].pays) if (e.pays[i]) { const p = e.pays[i]; p.influence[fort].m = borne(p.influence[fort].m + 3, 0, 100); p.stabilite = borne(p.stabilite - 3, 0, 100); }
  e.tension = 100;
  noter(e, { type: "generique", titre: `Guerre dans le ${THEATRES[g.theatre].nom} : ${duree === 0 ? "1er" : `${duree + 1}e`} trimestre`, famille: "guerre_interetatique", pays: THEATRES[g.theatre].pays, visiblePour: [...CAMPS], intensite: 3,
    texte: `PIB des deux puissances −${GUERRE.pib * 100} %, budgets −2. Le ${nomBloc(fort)} prend l'avantage sur le terrain. Risque d'escalade nucléaire ce trimestre : ${Math.round(risque * 100)} %.` });
  return null;
}
export function proposerPaix(e0: EtatPartie, camp: Camp): EtatPartie {
  if (!e0.guerre) throw new Error("Aucune guerre en cours.");
  if (e0.proposition) throw new Error("Une offre attend déjà sa réponse.");
  const e = copie(e0), adv = adversaire(camp);
  if (adv === e.joueur && e.reglages.ia) e.proposition = { de: camp, type: "paix", round: e.round };
  else conclure(e, camp, "paix", iaAccepte(e, adv, "paix"));
  return e;
}
// Crise nucléaire sans guerre : une tension à 100 fait trembler le monde, puis les deux camps reculent.
function criseNucleaire(e: EtatPartie) {
  if (e.guerre || e.tension < 100) return;
  for (const c of CAMPS) e.camps[c].cp = borne(e.camps[c].cp - 8, 0, 100);
  for (const i of ISO) e.pays[i].stabilite = borne(e.pays[i].stabilite - 3, 0, 100);
  e.tension = 75;
  noter(e, { type: "generique", titre: "Crise nucléaire : le monde au bord du gouffre", famille: "proliferation_nucleaire", visiblePour: [...CAMPS], intensite: 3,
    texte: "Alertes nucléaires, flottes face à face : pendant quelques jours, le pire semble possible. Les deux camps reculent (capital politique −8 chacun, stabilité −3 partout, tension ramenée à 75)." });
}

// ---------- Dépendance commerciale ----------
// Part des routes d'échange qui relient directement les deux leaders (volume / 15, plafonné à 1) : les sanctions coûtent de 1 à 4.
export const dependanceCommerciale = (e: EtatPartie) => Math.min(1, lienFlux(e, "CHN", "OCC") / 15);
export const coutSanctions = (e: EtatPartie) => Math.round((1 + 3 * dependanceCommerciale(e)) * 10) / 10;

// ---------- Effet « ami d'un ami » ----------
// Quand un pays franchit un palier d'alignement (seuils ±0,1 et ±0,4, avec 0,02 d'hystérésis) vers un bloc, ses proches
// suivent EN DIFFÉRÉ et LENTEMENT : à partir du trimestre suivant et pendant 4 trimestres, ses voisins gagnent +0,5 d'influence
// politique par trimestre pour ce bloc (+2 au total), ses partenaires d'alliance régionale (UE, OTAN, ASEAN, CEI, OCS) +0,25 (+1),
// atténué par l'influence déjà acquise. Plafonds : +0,75 par pays et par trimestre, +6 cumulés par pays et par bloc sur la partie.
export const RAPPROCHEMENT = { voisin: 2, allie: 1, duree: 4, plafondTrimestre: 0.75, plafondTotal: 6, hysteresis: 0.02 };
const ORGS_PROCHES = ["UE", "OTAN", "ASEAN", "CEI", "OCS"];
const VOIS = VOISINS as Record<string, string[]>;
export const palier = (a: number) => a <= -0.4 ? -2 : a <= -0.1 ? -1 : a < 0.1 ? 0 : a < 0.4 ? 1 : 2;
export function prochesDe(e: EtatPartie, iso: string): { voisins: string[]; allies: string[] } {
  const voisins = (VOIS[iso] ?? []).filter(x => e.pays[x] && x !== "USA" && x !== "CHN"), orgs = organisations(e);
  const allies = [...new Set(ORGS_PROCHES.flatMap(o => orgs[o]?.includes(iso) ? orgs[o] : []))].filter(x => x !== iso && e.pays[x] && x !== "USA" && x !== "CHN" && !voisins.includes(x));
  return { voisins, allies };
}
function rapprochement(e: EtatPartie) {
  const R = RAPPROCHEMENT, recu: Record<string, number> = {};
  // 1. rapprochements en cours (lancés aux trimestres précédents)
  for (const r of e.rapprochements) {
    const { voisins, allies } = prochesDe(e, r.iso);
    for (const [liste, k] of [[voisins, R.voisin], [allies, R.allie]] as const) for (const x of liste) {
      const inf = e.pays[x].influence[r.camp], cumul = (e.contagion[x] ??= { OCC: 0, CHN: 0 });
      const g = Math.min(k / R.duree * (1 - inf.p / 100), R.plafondTrimestre - (recu[x] ?? 0), R.plafondTotal - cumul[r.camp]);
      if (g <= 0) continue;
      inf.p = borne(inf.p + g, 0, 100); recu[x] = (recu[x] ?? 0) + g; cumul[r.camp] += g;
    }
    r.restant--;
  }
  e.rapprochements = e.rapprochements.filter(r => r.restant > 0);
  // 2. nouvelles bascules : effet à partir du trimestre suivant
  for (const iso of ISO) {
    if (iso === "USA" || iso === "CHN") continue;
    const a = alignement(e, iso), ancien = e.paliers[iso], n = palier(a);
    if (ancien === undefined) { e.paliers[iso] = n; continue; }
    const camp: Camp | null = n > ancien && palier(a - R.hysteresis) === n ? "OCC" : n < ancien && palier(a + R.hysteresis) === n ? "CHN" : null;
    if (!camp) continue;
    e.paliers[iso] = n;
    e.rapprochements = e.rapprochements.filter(r => r.iso !== iso); // une bascule en sens inverse annule l'entraînement en cours
    const { voisins, allies } = prochesDe(e, iso);
    if (!voisins.length && !allies.length) continue;
    e.rapprochements.push({ iso, camp, restant: R.duree });
    noter(e, { type: "action", titre: `Rapprochement : ${nomPays(iso)} entraîne ses proches`, mineur: true, pays: [iso, ...voisins, ...allies], visiblePour: [...CAMPS],
      texte: `${nomPays(iso)} se rapproche du ${nomBloc(camp)}. Sur les 4 prochains trimestres, ses voisins (${voisins.map(nomPays).join(", ") || "aucun"}) gagnent jusqu'à +${R.voisin} d'influence politique pour ce bloc${allies.length ? `, ses alliés régionaux jusqu'à +${R.allie}` : ""} (plafond +${R.plafondTotal} par pays sur la partie).` });
  }
}

// ---------- Fin de round : simulation, fin d'année, fin d'ère ----------
function croissanceReference(iso: string, annee: number, e: EtatPartie): number {
  const t = TRAJ[iso].pib, k = annee - 2000;
  if (k + 1 < t.length && Number.isFinite(t[k + 1]) && Number.isFinite(t[k])) return t[k + 1] / t[k] - 1; // séries lacunaires (ERI, SSD, LIE) : rattrapage ci-dessous
  const fmi = tauxProjete(iso, annee); if (fmi !== null) return fmi;
  // au-delà des données : moitié tendance des dix dernières années connues, moitié rattrapage (estimation de jeu)
  const y = pibParHab(e.pays[iso]), yUSA = pibParHab(e.pays.USA);
  return Math.min(0.06, 0.5 * tendancePib(iso) + 0.5 * (0.015 + 0.01 * Math.max(0, Math.log(yUSA / y))));
}
// Trajectoire de référence sans chocs : données réelles, puis croissance tendancielle constante (estimation de jeu).
// Règle validée : le PIB suit la trajectoire de référence à 10 % près (35 % en 2035) ; au-delà, une force de rappel ramène vers la bande.
export const RAPPEL_PIB = 0.5, RAPPEL_INTERNE = 0.25; // rappel : 50 % par an de l'excès hors bande ; 25 % par an de l'écart dans la bande (corrige la dérive moyenne des chocs, estimation de jeu)
// Tolérance : 10 % jusqu'en 2026 (années réelles), puis élargie linéairement jusqu'à 35 % fin 2035 (années projetées).
export function tolerancePib(round: number): number { return 0.1 + 0.25 * Math.max(0, Math.min(1, (round / 4 - 27) / 9)); }
// Après 2022 : croissance projetée (FMI ou estimation) si le pays est renseigné et sa série complète jusqu'en 2022.
function tauxProjete(iso: string, annee: number): number | null {
  const c = CROISSANCE_PROJETEE[iso], t = TRAJ[iso].pib;
  if (!c || annee < 2022 || t.length !== 23 || !Number.isFinite(t[22])) return null;
  return c.g[Math.min(3, annee - 2022)] / 100;
}
export function pibReference(iso: string, round: number): number {
  const t = TRAJ[iso].pib; let last = t.length - 1; while (last > 0 && !Number.isFinite(t[last])) last--;
  const x = round / 4, k = Math.floor(x);
  if (k < last) return t[k] * Math.pow(t[k + 1] / t[k], x - k);
  if (tauxProjete(iso, 2022) !== null) { let v = t[last]; for (let a = 2022; a < 2000 + k; a++) v *= 1 + tauxProjete(iso, a)!; return v * Math.pow(1 + tauxProjete(iso, 2000 + k)!, x - k); }
  const yUSA = TRAJ.USA.pib[TRAJ.USA.pib.length - 1] / TRAJ.USA.population[TRAJ.USA.population.length - 1];
  const pop = TRAJ[iso].population[Math.min(last, TRAJ[iso].population.length - 1)], y = t[last] / pop;
  const g = Math.min(0.06, 0.5 * tendancePib(iso) + 0.5 * (0.015 + 0.01 * Math.max(0, Math.log(yUSA / y))));
  return t[last] * Math.pow(1 + g, x - last);
}
function rappel(iso: string, round: number, pib: number): number {
  const d = Math.log(pib / pibReference(iso, round)), tol = tolerancePib(round);
  return -RAPPEL_INTERNE * d - (Math.abs(d) <= tol ? 0 : RAPPEL_PIB * (d - Math.sign(d) * tol));
}
const TENDANCE: Record<string, number> = {};
function tendancePib(iso: string): number {
  if (TENDANCE[iso] !== undefined) return TENDANCE[iso];
  const t = TRAJ[iso].pib; let k = t.length - 1; while (k > 0 && !Number.isFinite(t[k])) k--;
  const k0 = Math.max(0, k - 10);
  return TENDANCE[iso] = k > k0 && Number.isFinite(t[k0]) ? Math.max(-0.01, Math.min(0.06, Math.pow(t[k] / t[k0], 1 / (k - k0)) - 1)) : 0.02;
}
function populationReference(iso: string, annee: number): number {
  const t = TRAJ[iso].population, k = Math.min(annee - 2000, t.length - 2);
  return t[k + 1] / t[k] - 1;
}
const EMIS_2000: Record<string, number> = Object.fromEntries(ISO.map(i => [i, TRAJ[i].co2[0]]));
function intensiteCo2(iso: string, annee: number): number {
  const t = TRAJ[iso]; let k = Math.min(annee - 2000, t.pib.length - 1);
  while (k > 0 && !(Number.isFinite(t.pib[k]) && Number.isFinite(t.co2[k]))) k--; // dernière année renseignée
  return (t.co2[k] / t.pib[k]) * Math.pow(0.98, Math.max(0, annee - 2022));
}

export function finRound(e0: EtatPartie): EtatPartie {
  if (e0.termine) return e0;
  let e = e0;
  if (e.proposition && e.proposition.round < e.round) { e = structuredClone(e); const pr = e.proposition!; e.proposition = null; conclure(e, pr.de, pr.type, false); } // sans réponse : refusée
  // Ministres automatiques du joueur puis IA, sur une seule copie de l'état (modifiée sur place) ; sans IA (bac à sable, tests), rien ne joue seul
  e = structuredClone(e);
  if (e.reglages.ia) { SUR_PLACE = true; try {
    const j = e.joueur; if (j) for (const d of LISTE_DOMAINES) if (modeDe(e, j, d) === "auto") e = jouerDomaine(e, j, d);
    for (const camp of CAMPS) if (camp !== e.joueur) e = iaJouerSurPlace(e, camp);
  } finally { SUR_PLACE = false; } }
  for (const c of CAMPS) e.camps[c].budget = arrondi(e.camps[c].budget);
  const { annee, trimestre } = date(e.round);
  brasDeFer(e); programmerChaines(e); criseNucleaire(e);
  // économie, population, émissions
  let emissions = 0;
  // globalisation : la moitié de l'écart de croissance moyen du monde (pondéré par le PIB) se transmet à chaque pays
  const ecart: Record<string, number> = Object.fromEntries(ISO.map(i => [i, e.pays[i].bonus.reduce((s, b) => s + b.points / 100, 0)]));
  const monde = pibMonde(e), contagion = CONTAGION * ISO.reduce((s, i) => s + ecart[i] * e.pays[i].pib / monde, 0);
  for (const iso of ISO) {
    const p = e.pays[iso];
    // une guerre entre leaders sort leurs économies de la trajectoire de référence : pas de force de rappel pour eux
    const g = croissanceReference(iso, annee, e) + ecart[iso] + contagion + (e.guerre && (iso === "USA" || iso === "CHN") ? 0 : rappel(iso, e.round, p.pib));
    p.pib *= Math.pow(1 + g, 0.25); cacheMonde = null;
    // effet papillon : petit choc de niveau permanent, sans rebond, qui fait diverger chaque partie de l'histoire
    if (e.reglages.generiques) p.pib *= Math.exp(PAPILLON * normale(e));
    p.population *= Math.pow(1 + populationReference(iso, annee), 0.25);
    p.bonus = p.bonus.map(b => ({ ...b, reste: b.reste - 1 })).filter(b => b.reste > 0);
    const mod = p.co2Mod.reduce((s, m) => s * (1 + m.pourcent / 100), 1);
    const emisPays = intensiteCo2(iso, annee) * p.pib * mod;
    emissions += emisPays / 4;
    // pollution locale : la qualité de l'environnement suit la racine quatrième de l'évolution des émissions du pays
    p.environnement = borne(ENV_2000[iso] * Math.pow(EMIS_2000[iso] / Math.max(1e-9, emisPays), 0.25), 0, 100);
    p.pibMax = Math.max(p.pibMax, p.pib); cacheMonde = null; // effet papillon compris
    p.co2Mod = p.co2Mod.map(m => ({ ...m, reste: m.reste - 1 })).filter(m => m.reste > 0);
  }
  e.co2Cumule += emissions / PART_CO2_50 / 1000; // Mt -> Gt
  e.ecartTemp = ECART_2000 + TCRE * e.co2Cumule;
  // influence : usure vers l'ancre et dérive économique
  for (const iso of ISO) for (const camp of CAMPS) {
    const p = e.pays[iso], inf = p.influence[camp];
    for (const canal of ["p", "m", "c"] as Canal[]) inf[canal] = borne(inf[canal] - USURE * (inf[canal] - p.ancre[camp][canal]), 0, 100);
    inf.e = borne(inf.e + DERIVE_E * (cibleEconomique(e, iso, camp) - inf.e), 0, 100);
  }
  appliquerOrientations(e); rapprochement(e); effetMemoire(e); usureOpinion(e); resoudreElections(e); echeancesPrets(e); suiviInterventions(e);
  if (trimestre === 3) cloreSessionOnu(e);
  // forces de rappel : la tension retombe de 8 % de son excès sur 10 par trimestre, la stabilité revient vers 50 (5 %),
  // le capital politique se reconstitue de 1 point ; sans elles, les événements génériques saturaient tension et instabilité.
  e.tension = borne(e.tension - 0.08 * (e.tension - 10), 0, 100);
  for (const iso of ISO) e.pays[iso].stabilite += 0.05 * (50 - e.pays[iso].stabilite);
  for (const camp of CAMPS) e.camps[camp].cp = borne(e.camps[camp].cp + 1, 0, 100);
  // pénurie de ressources : si l'écart entre le poids économique d'un camp et les ressources qu'il contrôle se creuse
  // par rapport à 2000 (déjà contenu dans la trajectoire réelle), la croissance de son leader est freinée
  for (const camp of CAMPS) {
    const deficit = Math.max(0, deficitRessources(e, camp) - e.deficitDepart[camp]);
    if (deficit > 0) e.pays[camp === "OCC" ? "USA" : "CHN"].bonus.push({ points: -PENURIE * deficit, reste: 1 });
  }
  // guerre entre leaders, crise nucléaire, puis seuils extrêmes : défaite immédiate
  const nucleaire = suiviGuerre(e);
  const defaite = nucleaire ?? seuilAtteint(e);
  if (defaite) {
    e.termine = true; e.resultat = defaite.titre;
    noter(e, { type: "bilan", titre: defaite.titre, texte: defaite.texte, visiblePour: [...CAMPS] });
    return e;
  }
  // fin d'année : main (2 cartes gardées au plus), élections, décompte
  if (trimestre === 4 && e.reglages.generiques) {
    // bulletin climatique annuel : le réchauffement touche tous les pays, davantage les plus exposés
    const efs: Effet[] = [{ type: "croissance", pays: "tous", points: -0.03 * e.ecartTemp, duree: 4 }, { type: "croissance", pays: EXPOSES_CLIMAT, points: -0.1 * e.ecartTemp, duree: 4 }];
    executer(e, efs, null, undefined, "Réchauffement climatique", () => 1);
    noter(e, { type: "generique", titre: `Réchauffement climatique : +${e.ecartTemp.toFixed(2).replace(".", ",")} °C`, famille: "record_climatique", visiblePour: [...CAMPS],
      texte: `Les relevés de ${annee} placent la planète à +${e.ecartTemp.toFixed(2).replace(".", ",")} °C au-dessus de l'ère préindustrielle. Sécheresses, tempêtes et canicules freinent un peu la croissance de tous les pays, davantage celle des ${EXPOSES_CLIMAT.length} pays exposés.`,
      effets: decrire(e, efs, null) });
  }
  if (trimestre === 4) {
    usureCrans(e);
    for (const camp of CAMPS) bilanAgenda(e, camp);
    e.decomptes.push(progression({ ...e, termine: true }));
    if (ELECTIONS_USA.includes(annee)) election(e, "OCC", 1 / (1 + Math.exp(-(e.camps.OCC.cp - 50) / 10)), "Élection présidentielle américaine");
    if (CONGRES_CHINE.includes(annee)) election(e, "CHN", 1 - 1 / (1 + Math.exp(-(40 - e.camps.CHN.cp) / 8)), "Congrès du Parti communiste chinois");
  }
  if (e.round >= formatDe(e).fin || e.round + 1 >= NB_ROUNDS) {
    e.termine = true;
    const b = bilan(e);
    e.resultat = Math.abs(b) < formatDe(e).egalite ? "Égalité" : b > 0 ? "Victoire du bloc USA" : "Victoire du bloc Chine";
    noter(e, { type: "bilan", titre: `Bilan ${formatDe(e).fin > 35 ? "de la partie" : "de l'ère 1"} : ${e.resultat}`, texte: `Avance ${b >= 0 ? "bloc USA" : "bloc Chine"} : ${Math.abs(b).toFixed(1).replace(".", ",")} points, moyenne de ${e.decomptes.length} décomptes annuels. Puissance bloc USA ${(100 * puissance(e, "OCC")).toFixed(1)} %, bloc Chine ${(100 * puissance(e, "CHN")).toFixed(1)} %.`, visiblePour: [...CAMPS] });
    return e;
  }
  e.round += 1;
  return debutRound(e, true);
}

// Prolonger une partie 2000-2008 terminée aux points jusqu'en 2025 : les décomptes passés sont convertis au komi du nouveau format.
export const peutProlonger = (e: EtatPartie) => e.termine && formatDe(e).fin === FORMATS["2000-2008"].fin && !/Défaite|Catastrophe/.test(e.resultat ?? "");
export function prolonger(e0: EtatPartie): EtatPartie {
  if (!peutProlonger(e0)) return e0;
  const e = structuredClone(e0), a = formatDe(e), b = FORMATS["2000-2035"];
  e.decomptes = e.decomptes.map((d, i) => d + (b.komi / (b.fin - b.debut + 1) - a.komi / (a.fin - a.debut + 1)) * (4 * i + 4));
  e.reglages = { ...e.reglages, format: "2000-2035" }; e.termine = false; e.resultat = null; e.round += 1;
  return debutRound(e, true);
}

const deficitRessources = (e: EtatPartie, camp: Camp) => Math.max(0, partFamille(e, camp, "economie") - partFamille(e, camp, "ressources"));
const PENURIE = 5; // points de croissance annuelle perdus par unité de déficit (part économique − part des ressources)
export const SEUILS = { population: 0.9, banqueroute: 0.8, climat: 3 };
function seuilAtteint(e: EtatPartie): { titre: string; texte: string } | null {
  if (e.ecartTemp >= SEUILS.climat) return { titre: "Catastrophe climatique : défaite des deux camps", texte: `Le réchauffement atteint ${e.ecartTemp.toFixed(2)} °C : le système international s'effondre.` };
  for (const camp of CAMPS) {
    const l = e.pays[camp === "OCC" ? "USA" : "CHN"], nom = camp === "OCC" ? "du bloc USA" : "du bloc Chine";
    if (l.population < SEUILS.population * TRAJ[l.iso3].population[0]) return { titre: `Défaite ${nom} : effondrement démographique`, texte: "La population du leader a perdu plus de 10 % depuis 2000." };
    if (l.pib < SEUILS.banqueroute * l.pibMax) return { titre: `Défaite ${nom} : banqueroute`, texte: "Le PIB du leader a chuté de plus de 20 % sous son sommet : l'État ne peut plus payer." };
  }
  return null;
}
const DOCTRINES: Record<Camp, string[]> = { OCC: ["internationaliste", "interventionniste", "isolationniste", "pro-commerce"], CHN: ["développement pacifique", "nationaliste", "réformatrice"] };
function election(e: EtatPartie, camp: Camp, pMaintien: number, titre: string) {
  if (tirer(e) < pMaintien) { noter(e, { type: "politique", titre: `${titre} : continuité`, texte: `Le pouvoir en place est reconduit (probabilité ${(100 * pMaintien).toFixed(0)} %).`, camp, visiblePour: [...CAMPS] }); return; }
  const c = e.camps[camp], doctrines = DOCTRINES[camp].filter(d => d !== c.doctrine);
  c.doctrine = doctrines[Math.floor(tirer(e) * doctrines.length)]; c.cp = 60;
  for (const iso of ISO) if ((camp === "OCC" ? 1 : -1) * alignement(e, iso) >= 0.4) e.pays[iso].influence[camp].p = Math.max(0, e.pays[iso].influence[camp].p - 5);
  noter(e, { type: "politique", titre: `${titre} : alternance`, texte: `Nouveau dirigeant, doctrine ${c.doctrine}. Les alliés doutent ; capital politique remis à 60.`, camp, visiblePour: [...CAMPS] });
}

// Un round complet sans intervention (IA pour les deux camps) : tests, avance rapide, IA contre IA.
export function roundAutomatique(e: EtatPartie): EtatPartie {
  let x = e;
  if (x.joueur && x.reglages.ia) x = iaJouer(x, x.joueur);
  return finRound(x);
}

// ---------- Description lisible d'un effet ----------
const fois = (ef: Effet, k: number): Effet => ef.type === "influence" || ef.type === "stabilite" || ef.type === "tension" || ef.type === "cp" || ef.type === "budget" ? { ...ef, valeur: ef.valeur * k }
  : ef.type === "croissance" ? { ...ef, points: ef.points * k } : ef.type === "co2" ? { ...ef, pourcent: ef.pourcent * k } : ef;
const decrire = (e: EtatPartie, efs: Effet[], joueur: Camp | null, paysTire?: string, fourchette = 0) =>
  efs.filter(ef => ef.type !== "drapeau").map(ef => decrireEffet(e, ef, joueur, paysTire, fourchette));
const NOMS_CANAUX: Record<Canal, string> = { e: "économique", p: "politique", m: "militaire", c: "culturelle" };
// fourchette : demi-amplitude du tirage (0,3 pour les cartes, 0,5 pour les briefings), 0 = valeur exacte.
export function decrireEffet(e: EtatPartie, ef: Effet, joueur: Camp | null, paysTire?: string, fourchette = 0): string {
  const v = (x: number) => fourchette ? `${signe(x * (1 - fourchette))} à ${signe(x * (1 + fourchette))}` : signe(x);
  const ou = (c: CiblePays) => c === "tous" ? "tous les pays" : paysCibles(c, paysTire).map(nomPays).join(", ");
  const qui = (c: CampRel) => campReel(c, joueur, paysTire, e) === "OCC" ? "bloc USA" : "bloc Chine";
  const apres = ef.delai ? ` (dans ${ef.delai} trimestre${ef.delai > 1 ? "s" : ""})` : "";
  switch (ef.type) {
    case "influence": return `Influence ${NOMS_CANAUX[ef.canal]} ${qui(ef.camp)} ${v(ef.valeur)} : ${ou(ef.pays)}${apres}`;
    case "croissance": return `Croissance ${v(ef.points)} pt pendant ${ef.duree} trimestres : ${ou(ef.pays)}${apres}`;
    case "stabilite": return `Stabilité ${v(ef.valeur)} : ${ou(ef.pays)}${apres}`;
    case "tension": return `Tension mondiale ${v(ef.valeur)}${apres}`;
    case "cp": return `Capital politique ${qui(ef.camp)} ${v(ef.valeur)}${apres}`;
    case "budget": return `Budget ${qui(ef.camp)} ${v(ef.valeur)}${apres}`;
    case "co2": return `Émissions de CO2 ${signe(ef.pourcent)} % pendant ${ef.duree} trimestres : ${ou(ef.pays)}${apres}`;
    case "drapeau": return "Engagement politique enregistré";
  }
}
const signe = (x: number) => (x >= 0 ? "+" : "") + (Math.abs(x) < 10 ? x.toFixed(1).replace(".", ",").replace(",0", "") : Math.round(x).toString());

export { libelle };

// ---------- Sauvegarde ----------
export function serialiserPartie(e: EtatPartie): string { return JSON.stringify(e); }
export function chargerPartie(texte: string): EtatPartie {
  const e = JSON.parse(texte) as EtatPartie;
  if (e.version !== VERSION_ETAT) throw new Error(`Sauvegarde de version ${e.version}, version attendue ${VERSION_ETAT}.`);
  if (typeof e.round !== "number" || typeof e.alea !== "number" || !e.pays || !e.camps) throw new Error("Sauvegarde invalide.");
  e.conflits ??= []; e.blocages ??= []; e.concessions ??= []; e.paliers ??= {}; for (const c of CAMPS) e.camps[c].points ??= pointsDeBase(); e.memoire ??= {}; e.prets ??= []; e.interventions ??= []; e.campagnesElectorales ??= {}; e.chaines ??= []; e.rapprochements ??= []; e.contagion ??= {}; e.zones ??= Object.fromEntries(ZONES_STRATEGIQUES.map(z => [z.id, { ...z.depart }])); for (const c of CAMPS) { e.camps[c].reactions ??= []; e.camps[c].typesJoues ??= []; }
  return e;
}
