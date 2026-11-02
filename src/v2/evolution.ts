// Évolution de tout ce qui compte (règle du 2 novembre 2026 : « tout doit pouvoir évoluer »).
// L'historique fixe seulement le départ et une tendance crédible ; ensuite la partie diverge selon les événements,
// les choix des camps, leurs actes et les interactions entre pays. Coefficients : estimation, calibrés par simulation.
import trajectoires from "../data/trajectoires.json";
import voisins from "../data/voisins.json";
import { CROISSANCE_PROJETEE } from "../data/croissance-projetee";
import { type EtatV2, type Camp, type PaysV2, partPays, partContinue, tirer, borne, autre, LEADER, calculerPoids, appliquerEconomie, rivalite } from "./moteur";
import { ROUTES } from "./zones";
import * as RS from "./ressources";
import * as MN from "./monnaie";

const TRAJ = (trajectoires as any).pays as Record<string, { pib: number[]; population: number[] }>;
const VOISINS = voisins as Record<string, string[]>;
const CAMPS: Camp[] = ["OCC", "CHN"];

// ---------- Tendances de fond (crédibles, pas une copie de l'histoire) ----------
// PIB : croissance réelle lissée sur 5 ans (2000-2022, Maddison/OWID), puis FMI (2023-2025) et rythme de moyen terme.
// Les crises (2008, 2020…) ne sont PAS dans la tendance : elles viennent des événements du jeu.
const lisse = (s: number[] | undefined, i: number) => {
  if (!s || s.length < 3) return undefined;
  const a = Math.max(0, i - 2), b = Math.min(s.length - 1, i + 2);
  return b > a && s[a] > 0 ? Math.pow(s[b] / s[a], 1 / (b - a)) - 1 : undefined;
};
export function tendancePib(iso: string, annee: number): number {
  const i = annee - 2000, t = TRAJ[iso]?.pib;
  if (t && i < t.length - 2) { const g = lisse(t, i); if (g !== undefined) return Math.max(-0.05, Math.min(0.1, g)) * 100; }
  // Au-delà : rythme de moyen terme du FMI, qui converge ensuite vers 2 % (7 % de l'écart par an après 2030, estimation) :
  // une économie qui s'enrichit ralentit, et rien ne garantit les rythmes de 2025 jusqu'en 2050.
  const p = CROISSANCE_PROJETEE[iso], g = p ? Math.max(-3, Math.min(8, p.g[3])) : 3; // 3 % : estimation
  return 2 + (g - 2) * Math.pow(0.93, Math.max(0, annee - 2030));
}
export function tendancePop(iso: string, annee: number): number {
  const t = TRAJ[iso]?.population, i = annee - 2000;
  if (!t || t.length < 3) return 1;
  if (i < t.length - 2) return (lisse(t, i) ?? 0) * 100;
  const der = (Math.pow(t[t.length - 1] / t[t.length - 6], 1 / 5) - 1) * 100;
  return der * Math.pow(0.97, annee - 2021); // transition démographique : le rythme ralentit
}

// ---------- Coefficients (estimation) ----------
export const EVO = {
  stabPib: 0.02, tensionPib: 0.05,            // PIB : (stabilité − 50) × 0,02 % ; −0,05 % par point de tension mondiale
  emigration: 0.02,                           // population : −0,02 % par point de stabilité sous 30
  milPib: 0.4, milTension: 0.05,              // armée : suit l'économie relative ; course aux armements avec la tension
  stabCroissance: 0.3, stabRetour: 0.08, stabDerive: 1, // stabilité : récession = troubles ; retour lent vers son niveau de départ
  contagion: 0.15, contagionMax: 2,           // « ami d'un ami » : voisins entraînés, lentement et avec plafond
  rival: 0.2,                                 // un rival s'éloigne du camp dont l'autre se rapproche
  ecoSuitAtt: 0.05, attSuitEco: 0.02,         // l'économie suit l'attitude (et un peu l'inverse)
  attirance: 0.5,                             // un pays en manque se tourne vers le camp qui le fournit (par an)
  detente: 0.4,                               // la tension retombe d'elle-même (40 % par an)
  oubli: 0.04,                                // sans entretien, attitude et économie reviennent de 4 % par an vers leur niveau de 2000
  routes: 1,                                  // multiplicateur de l'effet des routes sur le PIB
};

// ---------- Routes : niveau de contrôle de chaque camp (0-100 %) et effet sur le PIB ----------
// Contrôle = moyenne, sur les pays de la route, de leur part économique envers le camp (Neutre = 0, Accords ≈ 40 %, Entraide = 100 %).
export function controle(e: EtatV2, id: string): Record<Camp, number> {
  const r = ROUTES.find(x => x.id === id)!;
  // Part de chaque camp dans le commerce de chaque pays de la route : un pays lié aux deux camps se partage (50/50).
  const k = { OCC: 0, CHN: 0 };
  for (const i of r.pays) {
    const o = i === LEADER.OCC ? 1 : i === LEADER.CHN ? 0 : partContinue(e.pays[i].eco.OCC), c = i === LEADER.CHN ? 1 : i === LEADER.OCC ? 0 : partContinue(e.pays[i].eco.CHN);
    const t = Math.max(1, o + c); k.OCC += o / t / r.pays.length; k.CHN += c / t / r.pays.length;
  }
  return k;
}
export const valeurRoute = (id: string, annee: number) => { const r = ROUTES.find(x => x.id === id)!; return id === "arctique" ? (annee < 2025 ? 0 : Math.min(r.valeur, r.valeur * (annee - 2024) / 10)) : r.valeur; };
// Effet annuel sur le PIB d'un pays (en %) : il gagne quand les camps dont il est proche tiennent les routes, il perd sinon
// (effet centré : les routes redistribuent la croissance, elles n'en créent pas). Les pays de passage touchent un péage.
const acces = (e: EtatV2, iso: string, k: Record<Camp, number>) => { const p = e.pays[iso], po = partPays(p, "OCC"), pc = partPays(p, "CHN"); return po * k.OCC + pc * k.CHN; };
export function effetsRoutes(e: EtatV2): Record<string, number> {
  const l = Object.values(e.pays), tot = l.reduce((s, p) => s + p.poids, 0) || 1, res: Record<string, number> = Object.fromEntries(l.map(p => [p.iso, 0]));
  for (const r of ROUTES) {
    const k = controle(e, r.id), v = valeurRoute(r.id, e.annee) * EVO.routes;
    if (e.blocages?.some(b => b.route === r.id && b.annee === e.annee)) { for (const p of l) res[p.iso] -= v * 0.5; continue; } // route bloquée : tout le monde perd, pas de péage
    const moy = l.reduce((s, p) => s + acces(e, p.iso, k) * p.poids, 0) / tot;
    for (const p of l) res[p.iso] += v * (acces(e, p.iso, k) - moy) + (r.pays.includes(p.iso) ? v * 0.3 : 0);
  }
  return res;
}
export const effetRoutes = (e: EtatV2, iso: string) => effetsRoutes(e)[iso];

// ---------- Pendant l'année (après les opérations) : le PIB ----------
export function croissanceAnnee(e: EtatV2) {
  appliquerEconomie(e);
  RS.appliquer(e);
  const rt = effetsRoutes(e);
  for (const p of Object.values(e.pays)) {
    const inf = CAMPS.reduce((s, c) => s + partPays(p, c) * MN.effetInflationPib(e, c) * (p.iso === LEADER[c] ? 1 : 0.5), 0); // l'inflation d'un camp freine ses pays
    const g = tendancePib(p.iso, e.annee) + rt[p.iso] + inf + EVO.stabPib * (p.stabilite - 50) - EVO.tensionPib * e.tension;
    p.pib *= 1 + g / 100;
  }
}

// ---------- En fin d'année : tout le reste ----------
export function evoluerFinAnnee(e: EtatV2) {
  const l = Object.values(e.pays), d = e.depart!, pib0 = e.pibDebutAnnee ?? {};
  const crois = (p: PaysV2) => (pib0[p.iso] ? (p.pib / pib0[p.iso] - 1) * 100 : 0);
  const tot = l.reduce((s, p) => s + p.poids, 0) || 1, moy = l.reduce((s, p) => s + crois(p) * p.poids, 0) / tot;
  // 1. Interactions entre pays : ami d'un ami (voisins), rivaux, économie qui suit l'attitude, dépendance aux ressources.
  const delta = Object.fromEntries(l.map(p => [p.iso, { OCC: p.att.OCC - d[p.iso].att.OCC, CHN: p.att.CHN - d[p.iso].att.CHN }]));
  for (const p of l) for (const c of CAMPS) {
    if (p.iso === LEADER.OCC || p.iso === LEADER.CHN) continue;
    let v = 0;
    for (const n of VOISINS[p.iso] ?? []) if (delta[n]) v += EVO.contagion * delta[n][c];
    for (const [r, force] of rivalite(p.iso)) if (delta[r]) v -= EVO.rival * delta[r][c] * Math.min(1, -force / 60);
    p.att[c] = borne(p.att[c] + Math.max(-EVO.contagionMax, Math.min(EVO.contagionMax, v)));
    p.eco[c] = borne(p.eco[c] + EVO.ecoSuitAtt * (p.att[c] - p.eco[c]));
    const r0 = e.relationsDepart?.[p.iso]; if (r0) { p.att[c] += EVO.oubli * (r0.att[c] - p.att[c]); p.eco[c] += EVO.oubli * (r0.eco[c] - p.eco[c]); }
    p.att[c] = borne(p.att[c] + EVO.attSuitEco * (p.eco[c] - p.att[c]));
  }
  for (const p of l) for (const { id } of RS.BIENS) if (RS.role(e, p.iso, id) === "besoin") {
    const bo = RS.bilan(e, "OCC", id), bc = RS.bilan(e, "CHN", id), c: Camp | null = bo.offre > 1.5 * bc.offre ? "OCC" : bc.offre > 1.5 * bo.offre ? "CHN" : null;
    if (c && p.iso !== LEADER[autre(c)]) p.eco[c] = borne(p.eco[c] + EVO.attirance / RS.BIENS.length);
  }
  // 2. Population, armée, stabilité.
  for (const p of l) {
    const g = crois(p), rel = Math.max(-10, Math.min(10, g - moy));
    p.population *= 1 + (tendancePop(p.iso, e.annee) - (p.stabilite < 30 ? EVO.emigration * (30 - p.stabilite) : 0)) / 100;
    p.militaire = Math.max(0, Math.min(100, p.militaire + EVO.milPib * rel + EVO.milTension * e.tension));
    const base = e.stabiliteDepart?.[p.iso] ?? 50;
    p.stabilite = borne(p.stabilite + EVO.stabCroissance * Math.max(-3, Math.min(3, g - 2)) + EVO.stabRetour * (base - p.stabilite) + EVO.stabDerive * (tirer(e) * 2 - 1), 0, 100);
  }
  for (const c of CAMPS) e.militaire[c] = e.pays[LEADER[c]].militaire;
  // 3. Monnaie (dette, inflation, réserves), ressources (soldes), tension, poids.
  const annonces = MN.finAnnee(e, { OCC: crois(e.pays[LEADER.OCC]), CHN: crois(e.pays[LEADER.CHN]) });
  RS.evoluer(e);
  e.res!.annonces.push(...annonces);
  for (const p of l) p.ressources = (e.ressourcesDepart?.[p.iso] ?? p.ressources) * RS.facteurRessources(e, p.iso);
  e.tension = borne(e.tension * (1 - EVO.detente), 0, 10);
  e.blocages = (e.blocages ?? []).filter(b => b.annee > e.annee);
  calculerPoids(e.pays);
  e.pibDebutAnnee = Object.fromEntries(l.map(p => [p.iso, p.pib]));
}
