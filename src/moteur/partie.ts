// Moteur de la tranche verticale (ère 1) : état de la partie, round, effets, événements, cartes,
// briefings, actions, élections, score. Règles : document « Règles chiffrées de la tranche 2000-2008 ».
// Chaque fonction publique prend un état et en rend un nouveau (l'état d'entrée n'est jamais modifié).
import donnees from "../data/pays2000.json";
import trajectoires from "../data/trajectoires.json";
import { EXPOSITION, SANCTIONNES_2000, ALLIES_2000, NON_DEMOCRATIES_2000 } from "../data/geographie";
import { HISTORIQUES_ERE1 } from "../contenu/historiques";
import { FAMILLES, MODELES_LOT1 } from "../contenu/generiques";
import { CARTES_ERE1 } from "../contenu/cartes";
import { BRIEFINGS_ERE1 } from "../contenu/briefings";
import { suivant } from "./alea";
import { date, libelle, NB_ROUNDS } from "./temps";
import {
  type Camp, type Canal, type Effet, type Condition, type CiblePays, type CampRel, type Carte, type Briefing,
  type ModeleGenerique, CAMPS, CANAUX, adversaire,
} from "./types";

export const VERSION_ETAT = 2;
export const ROUNDS_TRANCHE = 36; // 2000 T1 à 2008 T4
export const POIDS: Record<Canal, number> = { e: 0.35, p: 0.3, m: 0.2, c: 0.15 };
// Alignement linéaire : un point d'influence vaut autant pour les deux camps (la formule en ratio avantageait
// le camp en retard d'un facteur 1,4 à 1,6 et donnait 87 % de victoires chinoises en IA contre IA).
export const ECHELLE_ALIGNEMENT = 70;
const USURE = 0.02, DERIVE_E = 0.05, CIBLE_E = 70, MAX_PA_PAR_PAYS = 2;
const PART_CO2_50 = 0.886, PART_HORS_50 = 0.155, TCRE = 0.45 / 1000, ECART_2000 = 0.8;
const ELECTIONS_USA = [2000, 2004, 2008], CONGRES_CHINE = [2002, 2007];

export interface EtatPays {
  iso3: string; population: number; pib: number; stabilite: number;
  influence: Record<Camp, Record<Canal, number>>;
  ancre: Record<Camp, Record<Canal, number>>;          // valeur vers laquelle l'usure ramène p, m, c
  bonus: { points: number; reste: number }[];          // écarts de croissance (points annuels)
  co2Mod: { pourcent: number; reste: number }[];
}
export interface EtatCamp {
  cp: number; budget: number; main: string[]; pa: number; paParPays: Record<string, number>; paAchetes: number;
  carteJouee: boolean; briefing: string | null; doctrine: string;
}
export interface EntreeJournal {
  round: number; type: "historique" | "generique" | "carte" | "briefing" | "cache" | "politique" | "bilan" | "action";
  titre: string; texte: string; famille?: string; pays?: string[]; camp?: Camp; visiblePour: Camp[];
}
interface EffetPrevu { round: number; effet: Effet; joueur: Camp | null; paysTire?: string; source: string; cache: boolean; facteur: number }

export interface EtatPartie {
  version: number; graine: number; alea: number; round: number; joueur: Camp | null;
  pays: Record<string, EtatPays>; camps: Record<Camp, EtatCamp>;
  tension: number; co2Cumule: number; ecartTemp: number;
  drapeaux: string[]; historiquesFaits: string[]; briefingsFaits: string[];
  pioche: string[]; defausse: string[]; retirees: string[];
  attente: EffetPrevu[]; journal: EntreeJournal[];
  scoreDepart: number; termine: boolean; resultat: string | null;
  reglages: Reglages;
}
// Réglages de test : désactiver les génériques ou l'IA isole la trajectoire de référence.
export interface Reglages { generiques: boolean; ia: boolean }

// ---------- Données de référence ----------
const ISO = donnees.pays.map(p => p.iso3);
const NOMS: Record<string, string> = Object.fromEntries(donnees.pays.map(p => [p.iso3, p.nom]));
export const nomPays = (iso: string) => NOMS[iso] ?? iso;
const TRAJ = trajectoires.pays as Record<string, { pib: number[]; population: number[]; co2: number[] }>;
const PETROLE: Record<string, number> = Object.fromEntries(donnees.pays.map(p => [p.iso3, p.indicateurs.prodPetrole ?? 0]));
const POP_MOYENNE_2000 = ISO.reduce((s, i) => s + TRAJ[i].population[0], 0) / ISO.length;
const PETROLE_TOTAL = Object.values(PETROLE).reduce((a, b) => a + b, 0);
const CARTES: Record<string, Carte> = Object.fromEntries(CARTES_ERE1.map(c => [c.id, c]));
const BRIEFINGS: Record<string, Briefing> = Object.fromEntries(BRIEFINGS_ERE1.map(b => [b.id, b]));
export const carte = (id: string) => CARTES[id];
export const briefing = (id: string) => BRIEFINGS[id];
const MODELES_PAR_FAMILLE: Record<string, ModeleGenerique[]> = {};
for (const m of MODELES_LOT1) (MODELES_PAR_FAMILLE[m.famille] ??= []).push(m);

// L'IA travaille sur une seule copie de l'état : les actions qu'elle enchaîne la modifient sur place.
let SUR_PLACE = false;
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
const CONTAGION = 0.5, PAPILLON = 0.006; // écart-type du choc de niveau par trimestre : environ 3,6 % cumulés sur 2000-2008

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
const pibMonde = (e: EtatPartie) => ISO.reduce((s, i) => s + e.pays[i].pib, 0);

export function puissance(e: EtatPartie, camp: Camp): number {
  const signe = camp === "OCC" ? 1 : -1;
  // part du PIB des 48 autres pays alignée sur le camp : la croissance propre des leaders n'est pas une victoire d'influence
  const autres = ISO.filter(i => i !== "USA" && i !== "CHN");
  return autres.reduce((s, i) => s + e.pays[i].pib * Math.max(0, signe * alignement(e, i)), 0) / autres.reduce((s, i) => s + e.pays[i].pib, 0);
}
export function bilanBrut(e: EtatPartie): number {
  return 100 * (puissance(e, "OCC") - puissance(e, "CHN")) + (e.camps.OCC.cp - e.camps.CHN.cp) / 10;
}
// Compensation (komi, comme au go) : le monde de 2000-2008 avantage la Chine (essor économique, événements
// historiques) d'environ 12,5 points en IA contre IA. L'Occident la reçoit au fil des 36 trimestres, et le seuil
// d'égalité donne la cible validée : environ 40 % / 20 % / 40 %. À recalibrer à chaque lot de contenu (test 7).
export const KOMI = 12.5, SEUIL_EGALITE = 0.5;
export const bilan = (e: EtatPartie) => bilanBrut(e) - e.scoreDepart + KOMI * (e.termine ? e.round + 1 : e.round) / ROUNDS_TRANCHE; // progression depuis 2000, sans jugement sur l'écart à l'histoire

// ---------- Création ----------
function cibleEconomique(e: EtatPartie, iso: string, camp: Camp): number {
  const usa = e.pays.USA.pib, chn = e.pays.CHN.pib;
  const part = camp === "OCC" ? usa / (usa + chn) : chn / (usa + chn);
  const sanction = camp === "OCC" && SANCTIONNES_2000.includes(iso) ? 0.1 : 1;
  return CIBLE_E * part * sanction;
}

export function creerPartie(graine: number, joueur: Camp | null = "OCC", reglages: Reglages = { generiques: true, ia: true }): EtatPartie {
  const pays: Record<string, EtatPays> = {};
  for (const p of donnees.pays) {
    const t = TRAJ[p.iso3];
    const inf = { OCC: { e: 0, p: 15, m: 0, c: 30 }, CHN: { e: 0, p: 15, m: 0, c: 5 } } as Record<Camp, Record<Canal, number>>;
    for (const camp of CAMPS) if (ALLIES_2000[camp].includes(p.iso3)) { inf[camp].p = 50; inf[camp].m = 60; }
    if (SANCTIONNES_2000.includes(p.iso3)) inf.OCC.p = 0;
    pays[p.iso3] = { iso3: p.iso3, population: t.population[0], pib: t.pib[0], stabilite: 50, influence: inf,
      ancre: { OCC: { ...inf.OCC }, CHN: { ...inf.CHN } }, bonus: [], co2Mod: [] };
  }
  const e: EtatPartie = {
    version: VERSION_ETAT, graine, alea: graine | 0, round: 0, joueur, pays,
    camps: {
      OCC: { cp: 60, budget: 0, main: [], pa: 0, paParPays: {}, paAchetes: 0, carteJouee: false, briefing: null, doctrine: "internationaliste" },
      CHN: { cp: 70, budget: 0, main: [], pa: 0, paParPays: {}, paAchetes: 0, carteJouee: false, briefing: null, doctrine: "développement pacifique" },
    },
    tension: 15, co2Cumule: 0, ecartTemp: ECART_2000, drapeaux: [], historiquesFaits: [], briefingsFaits: [],
    pioche: [], defausse: [], retirees: [], attente: [], journal: [], scoreDepart: 0, termine: false, resultat: null, reglages,
  };
  for (const iso of ISO) for (const camp of CAMPS) {
    const v = cibleEconomique(e, iso, camp);
    e.pays[iso].influence[camp].e = v; e.pays[iso].ancre[camp].e = v;
  }
  e.pioche = melanger(e, CARTES_ERE1.map(c => c.id));
  for (const camp of CAMPS) e.camps[camp].budget = budgetAnnuel(e, camp);
  e.scoreDepart = bilanBrut(e);
  return debutRound(e, true);
}

const budgetAnnuel = (e: EtatPartie, camp: Camp) => Math.round(e.pays[camp === "OCC" ? "USA" : "CHN"].pib / 1e12);

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
  // 2. événements historiques du trimestre
  for (const h of HISTORIQUES_ERE1.filter(h => h.annee === annee && h.trimestre === trimestre)) {
    const ok = conditionsVraies(e, h.conditions);
    const p = !h.deviable ? 1 : ok ? 0.9 : 0.1;
    if (tirer(e) < p) {
      e.historiquesFaits.push(h.id);
      executer(e, h.effets, null, undefined, h.titre, () => 1);
      noter(e, { type: "historique", titre: h.titre, texte: h.texte, famille: h.famille, pays: h.pays, visiblePour: [...CAMPS] });
    } else {
      if (h.compensationSiAbsent) executer(e, h.compensationSiAbsent, null, undefined, h.titre, () => 1);
      noter(e, { type: "historique", titre: `L'histoire dévie : ${h.titre.toLowerCase()} n'a pas lieu`, texte: "Les conditions réelles de cet événement ne sont plus réunies dans votre partie.", famille: h.famille, pays: h.pays, visiblePour: [...CAMPS] });
    }
  }
  // 3. événements génériques calibrés
  if (e.reglages.generiques) tirerGeneriques(e);
  // 4. budget et main en début d'année
  if (trimestre === 1) for (const camp of CAMPS) {
    if (e.round > 0) e.camps[camp].budget = Math.min(e.camps[camp].budget, Math.floor(budgetAnnuel(e, camp) / 2)) + budgetAnnuel(e, camp);
    piocher(e, camp, 6 - e.camps[camp].main.length);
  }
  // 5. briefings déclenchés
  for (const camp of CAMPS) {
    const c = e.camps[camp]; c.pa = 0; c.paParPays = {}; c.paAchetes = 0; c.carteJouee = false;
    c.briefing = BRIEFINGS_ERE1.find(b => b.camp === camp && !e.briefingsFaits.includes(b.id) && declenche(e, b))?.id ?? null;
  }
  return e;
}

function declenche(e: EtatPartie, b: Briefing): boolean {
  const d = b.declencheur, { annee, trimestre } = date(e.round);
  if (d.annee !== undefined && (annee < d.annee || (annee === d.annee && trimestre < (d.trimestre ?? 1)))) return false;
  if (d.evenement && !e.historiquesFaits.includes(d.evenement)) return false;
  if (d.evenement && d.annee === undefined) {
    const h = HISTORIQUES_ERE1.find(x => x.id === d.evenement)!;
    if (annee * 4 + trimestre - (h.annee * 4 + h.trimestre) > 4) return false; // briefing périmé après un an
  }
  return conditionsVraies(e, d.conditions);
}

function piocher(e: EtatPartie, camp: Camp, n: number) {
  for (let i = 0; i < n; i++) {
    if (e.pioche.length === 0) { e.pioche = melanger(e, e.defausse); e.defausse = []; }
    const id = e.pioche.pop(); if (id) e.camps[camp].main.push(id);
  }
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

function tirerGeneriques(e: EtatPartie) {
  for (const f of FAMILLES) {
    const modeles = MODELES_PAR_FAMILLE[f.id]; if (!modeles) continue;
    const n = poisson(e, (f.taux / 4) * (f.climat ? multiplicateurClimat(e) : 1));
    for (let k = 0; k < n; k++) {
      const m = modeles[Math.floor(tirer(e) * modeles.length)];
      const intensite = choisirPondere(e, [1, 2, 3], [0.6, 0.3, 0.1]);
      const avant = e.round < 92; // avant 2023 : la trajectoire réelle contient déjà les chocs, l'écart est temporaire
      if (f.monde || m.risque.includes("monde")) {
        executer(e, rebond(m.effets, avant, intensite), null, undefined, m.titre, () => intensite);
        noter(e, { type: "generique", titre: m.titre, texte: m.texte, famille: f.id, visiblePour: [...CAMPS] });
        continue;
      }
      if (tirer(e) < PART_HORS_50) {
        noter(e, { type: "generique", titre: `${f.nom} hors des pays suivis`, texte: "Un événement de ce type touche un pays non simulé.", famille: f.id, visiblePour: [] });
        continue;
      }
      const iso = choisirPondere(e, ISO, ISO.map(i => poidsRisque(e, m, i)));
      executer(e, rebond(m.effets, avant, intensite), null, iso, m.titre, () => intensite);
      noter(e, { type: "generique", titre: m.titre.replace("{pays}", nomPays(iso)) + (intensite > 1 ? ` (intensité ${intensite})` : ""),
        texte: m.texte.split("{pays}").join(nomPays(iso)), famille: f.id, pays: [iso], visiblePour: visibleDans(e, [iso]) });
    }
  }
}
// Avant 2023, un choc de croissance générique est suivi d'un rebond égal : le niveau du PIB revient sur la trajectoire réelle.
// Rebond b tel que (1 - a)(1 + b) = 1 sur la même durée (a = choc annuel × intensité) : le niveau revient exactement à l'écart de second ordre près.
// Les génériques sont un bruit de fond : sans amortissement, ils apportaient +6,7 de tension et -1,5 de stabilité
// par pays et par trimestre (tension 79/100 et stabilité moyenne 32 en 2008). Calibrage : équilibre vers tension 30, stabilité 42.
const AMORTI_GENERIQUE = { tension: 0.3, stabilite: 0.25 };
function rebond(effets0: Effet[], avant: boolean, intensite: number): Effet[] {
  const effets = effets0.map((ef): Effet => ef.type === "tension" ? { ...ef, valeur: ef.valeur * AMORTI_GENERIQUE.tension }
    : ef.type === "stabilite" ? { ...ef, valeur: ef.valeur * AMORTI_GENERIQUE.stabilite } : ef);
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
  if (!conditionsVraies(e, m.conditions, pays)) return "Conditions non réunies.";
  return null;
}

export function jouerCarte(e0: EtatPartie, camp: Camp, choix: ChoixCarte): EtatPartie {
  const e = copie(e0), c = e.camps[camp], carteJ = CARTES[choix.carte];
  if (c.carteJouee) throw new Error("Une carte a déjà été jouée ce trimestre.");
  if (!c.main.includes(choix.carte)) throw new Error("Carte absente de la main.");
  if (choix.usage === "evenement") {
    const err = peutJouerMode(e, camp, choix.carte, choix.mode ?? 0, choix.pays); if (err) throw new Error(err);
    declencherCarte(e, camp, carteJ, choix.mode ?? 0, choix.pays);
  } else {
    c.pa += carteJ.valeur;
    noter(e, { type: "carte", titre: `${carteJ.titre} jouée pour ${carteJ.valeur} point${carteJ.valeur > 1 ? "s" : ""}`, texte: carteJ.texte, camp, visiblePour: [camp] });
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
    texte: parAdversaire ? "Carte jouée pour ses points par l'adversaire : son événement se déclenche à votre profit." : c.texte,
    pays: pays ? [pays] : undefined, visiblePour: [...CAMPS] });
}

export type TypeAction = "politique" | "culturelle" | "economique" | "militaire" | "contre" | "developpement";
export const ACTIONS: Record<TypeAction, { nom: string; pa: number; budget: number }> = {
  politique: { nom: "Influence politique", pa: 1, budget: 0 },
  culturelle: { nom: "Influence culturelle", pa: 1, budget: 0 },
  economique: { nom: "Influence économique", pa: 1, budget: 1 },
  militaire: { nom: "Présence militaire", pa: 2, budget: 1 },
  contre: { nom: "Contre-influence", pa: 2, budget: 0 },
  developpement: { nom: "Développement", pa: 2, budget: 2 },
};

export function peutAgir(e: EtatPartie, camp: Camp, type: TypeAction, iso: string): string | null {
  const a = ACTIONS[type], c = e.camps[camp];
  if (iso === "USA" || iso === "CHN") return "Les leaders ne sont pas des cibles.";
  if (c.pa < a.pa) return "Points d'action insuffisants.";
  if (c.budget < a.budget) return "Budget insuffisant.";
  if ((c.paParPays[iso] ?? 0) + a.pa > MAX_PA_PAR_PAYS) return "Maximum 2 points par pays et par trimestre.";
  if (type === "militaire" && (camp === "OCC" ? alignement(e, iso) < 0.2 : alignement(e, iso) > -0.2)) return "Présence militaire : le pays doit pencher vers toi (alignement 0,2).";
  return null;
}

export function agir(e0: EtatPartie, camp: Camp, type: TypeAction, iso: string): EtatPartie {
  const err = peutAgir(e0, camp, type, iso); if (err) throw new Error(err);
  const e = copie(e0), c = e.camps[camp], a = ACTIONS[type], inf = e.pays[iso].influence[camp];
  c.pa -= a.pa; c.budget -= a.budget; c.paParPays[iso] = (c.paParPays[iso] ?? 0) + a.pa;
  const gain = (canal: Canal, k: number) => { inf[canal] = borne(inf[canal] + k * (1 - inf[canal] / 100), 0, 100); };
  if (type === "politique") gain("p", 8);
  if (type === "culturelle") gain("c", 4);
  if (type === "economique") gain("e", 8);
  if (type === "militaire") { gain("m", 10); e.tension = borne(e.tension + 1, 0, 100); }
  if (type === "contre") { const adv = e.pays[iso].influence[adversaire(camp)]; adv.p = Math.max(0, adv.p - 5); }
  if (type === "developpement") { e.pays[iso].bonus.push({ points: 0.5, reste: 4 }); inf.e = borne(inf.e + 3, 0, 100); }
  return e;
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
  const s = camp === "OCC" ? 1 : -1, monde = pibMonde(e);
  switch (ef.type) {
    case "influence": { const cible = campReel(ef.camp, joueur, paysTire, e), signe = cible === camp ? 1 : -1;
      return paysCibles(ef.pays, paysTire).reduce((v, i) => v + signe * (e.pays[i].pib / monde) * ef.valeur * POIDS[ef.canal] / 60 * 100, 0); }
    case "cp": return (campReel(ef.camp, joueur, paysTire, e) === camp ? 1 : -1) * ef.valeur * 0.1;
    case "budget": return (campReel(ef.camp, joueur, paysTire, e) === camp ? 1 : -1) * ef.valeur * 0.3;
    case "tension": return -ef.valeur * 0.03;
    case "stabilite": return paysCibles(ef.pays, paysTire).reduce((v, i) => v + s * Math.sign(alignement(e, i)) * ef.valeur * 0.01, 0);
    case "croissance": return paysCibles(ef.pays, paysTire).reduce((v, i) => v + s * alignement(e, i) * (e.pays[i].pib / monde) * ef.points * ef.duree * 0.5, 0);
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
    const options = c().main.map(id => {
      const carteJ = CARTES[id], pts = carteJ.valeur * 0.6;
      const ev = carteJ.camp === camp || carteJ.camp === "NEUTRE" ? meilleurMode(e, camp, carteJ) : null;
      const malus = carteJ.camp === adversaire(camp) ? Math.max(0, meilleurMode(e, adversaire(camp), carteJ)?.valeur ?? 0) : 0;
      return { id, ev, vEv: ev ? ev.valeur : -Infinity, vPts: pts - malus };
    });
    options.sort((a, b) => Math.max(b.vEv, b.vPts) - Math.max(a.vEv, a.vPts));
    const o = options[0];
    e = o.ev && o.vEv > o.vPts ? jouerCarte(e, camp, { carte: o.id, usage: "evenement", mode: o.ev.mode, pays: o.ev.pays })
                               : jouerCarte(e, camp, { carte: o.id, usage: "points" });
  }
  // achat de points d'action en gardant une réserve de 6 unités
  while (!peutAcheterPA(e, camp) && c().budget - PRIX_PA >= 6) e = acheterPA(e, camp);
  // points d'action : choix glouton du meilleur gain de puissance, 10 % de hasard
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

// ---------- Fin de round : simulation, fin d'année, fin d'ère ----------
function croissanceReference(iso: string, annee: number, e: EtatPartie): number {
  const t = TRAJ[iso].pib, k = annee - 2000;
  if (k + 1 < t.length) return t[k + 1] / t[k] - 1;
  const y = pibParHab(e.pays[iso]), yUSA = pibParHab(e.pays.USA);
  return Math.min(0.06, 0.015 + 0.01 * Math.max(0, Math.log(yUSA / y)));
}
function populationReference(iso: string, annee: number): number {
  const t = TRAJ[iso].population, k = Math.min(annee - 2000, t.length - 2);
  return t[k + 1] / t[k] - 1;
}
function intensiteCo2(iso: string, annee: number): number {
  const t = TRAJ[iso], k = Math.min(annee - 2000, t.pib.length - 1);
  return (t.co2[k] / t.pib[k]) * Math.pow(0.98, Math.max(0, annee - 2022));
}

export function finRound(e0: EtatPartie): EtatPartie {
  if (e0.termine) return e0;
  let e = e0;
  if (e.reglages.ia) for (const camp of CAMPS) if (camp !== e.joueur) e = iaJouer(e, camp);
  e = structuredClone(e);
  const { annee, trimestre } = date(e.round);
  // économie, population, émissions
  let emissions = 0;
  // globalisation : la moitié de l'écart de croissance moyen du monde (pondéré par le PIB) se transmet à chaque pays
  const ecart: Record<string, number> = Object.fromEntries(ISO.map(i => [i, e.pays[i].bonus.reduce((s, b) => s + b.points / 100, 0)]));
  const monde = pibMonde(e), contagion = CONTAGION * ISO.reduce((s, i) => s + ecart[i] * e.pays[i].pib / monde, 0);
  for (const iso of ISO) {
    const p = e.pays[iso];
    const g = croissanceReference(iso, annee, e) + ecart[iso] + contagion;
    p.pib *= Math.pow(1 + g, 0.25);
    // effet papillon : petit choc de niveau permanent, sans rebond, qui fait diverger chaque partie de l'histoire
    if (e.reglages.generiques) p.pib *= Math.exp(PAPILLON * normale(e));
    p.population *= Math.pow(1 + populationReference(iso, annee), 0.25);
    p.bonus = p.bonus.map(b => ({ ...b, reste: b.reste - 1 })).filter(b => b.reste > 0);
    const mod = p.co2Mod.reduce((s, m) => s * (1 + m.pourcent / 100), 1);
    emissions += intensiteCo2(iso, annee) * p.pib * mod / 4;
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
  // forces de rappel : la tension retombe de 8 % de son excès sur 10 par trimestre, la stabilité revient vers 50 (5 %),
  // le capital politique se reconstitue de 1 point ; sans elles, les événements génériques saturaient tension et instabilité.
  e.tension = borne(e.tension - 0.08 * (e.tension - 10), 0, 100);
  for (const iso of ISO) e.pays[iso].stabilite += 0.05 * (50 - e.pays[iso].stabilite);
  for (const camp of CAMPS) e.camps[camp].cp = borne(e.camps[camp].cp + 1, 0, 100);
  // fin d'année : main (2 cartes gardées au plus), élections
  if (trimestre === 4) {
    for (const camp of CAMPS) { const c = e.camps[camp]; while (c.main.length > 2) e.defausse.push(c.main.pop()!); }
    if (ELECTIONS_USA.includes(annee)) election(e, "OCC", 1 / (1 + Math.exp(-(e.camps.OCC.cp - 50) / 10)), "Élection présidentielle américaine");
    if (CONGRES_CHINE.includes(annee)) election(e, "CHN", 1 - 1 / (1 + Math.exp(-(40 - e.camps.CHN.cp) / 8)), "Congrès du Parti communiste chinois");
  }
  if (e.round + 1 >= ROUNDS_TRANCHE || e.round + 1 >= NB_ROUNDS) {
    e.termine = true;
    const b = bilan(e);
    e.resultat = Math.abs(b) < SEUIL_EGALITE ? "Égalité" : b > 0 ? "Victoire de l'Occident" : "Victoire de la Chine";
    noter(e, { type: "bilan", titre: `Bilan de l'ère 1 : ${e.resultat}`, texte: `Bilan ${b >= 0 ? "+" : ""}${b.toFixed(1)} points (positif = Occident). Puissance Occident ${(100 * puissance(e, "OCC")).toFixed(1)} %, Chine ${(100 * puissance(e, "CHN")).toFixed(1)} %.`, visiblePour: [...CAMPS] });
    return e;
  }
  e.round += 1;
  return debutRound(e, true);
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
const NOMS_CANAUX: Record<Canal, string> = { e: "économique", p: "politique", m: "militaire", c: "culturelle" };
// fourchette : demi-amplitude du tirage (0,3 pour les cartes, 0,5 pour les briefings), 0 = valeur exacte.
export function decrireEffet(e: EtatPartie, ef: Effet, joueur: Camp | null, paysTire?: string, fourchette = 0): string {
  const v = (x: number) => fourchette ? `${signe(x * (1 - fourchette))} à ${signe(x * (1 + fourchette))}` : signe(x);
  const ou = (c: CiblePays) => c === "tous" ? "tous les pays" : paysCibles(c, paysTire).map(nomPays).join(", ");
  const qui = (c: CampRel) => campReel(c, joueur, paysTire, e) === "OCC" ? "Occident" : "Chine";
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
  return e;
}
