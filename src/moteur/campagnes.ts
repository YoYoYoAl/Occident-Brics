// Campagnes électorales (refonte, maquette 5) : l'orientation « Peser sur une élection » ouvre une campagne jusqu'au scrutin.
// Le joueur répartit des points sur 4 leviers (rendement décroissant), suit les sondages et peut tricher (fraude) ;
// s'il perd, un coup d'État devient possible au trimestre suivant, sous conditions.
// Toutes les formules sont une première proposition à calibrer (estimations, pas des données).
import { type EtatPartie, alignement, nomPays, ELECTIONS_PAYS, outils, arrondi } from "./partie";
import { type Plan, planRival } from "./plans";
import { gagnerAE, nucleaire } from "./guerre";
import { bonusPutsch } from "./dirigeants";
import { date } from "./temps";
import { CAMPS, adversaire, type Camp } from "./types";

export type Levier = "medias" | "partis" | "terrain" | "promesses";
export const LEVIERS: Record<Levier, { nom: string; k: number; texte: string }> = {
  medias: { nom: "Médias et réseaux", k: 0.8, texte: "Rendement moyen, sans risque." },
  partis: { nom: "Financer les partis alliés", k: 0.95, texte: "Efficace, mais 3 % de risque de scandale par point et par trimestre." },
  terrain: { nom: "Terrain et diaspora", k: 0.65, texte: "Plus lent, mais résiste aux coups de l'adversaire (ses gains jusqu'à −50 %)." },
  promesses: { nom: "Promesses économiques", k: 1.2, texte: "Le plus rapide ; chaque point coûte 0,5 budget par trimestre pendant 1 an après le scrutin." },
};
export const LISTE_LEVIERS = Object.keys(LEVIERS) as Levier[];
export const CAMPAGNE = {
  pointsParIntensite: 2, maxLevier: 4, opposition: 2, fraude: 6, risqueFraude: 0.25, scandale: 0.03, dette: 0.5, dureeDette: 4, horizon: 12,
  coup: { influence: 40, stabilite: 45, base: 0.35, ae: 15, cp: 8, cpEchec: 12, perte: 20 },
};
export interface Campagne {
  scrutin: number; annee: number; nom: string; depart: number; sondage: number; leviers: Record<Levier, number>; fraude: boolean;
  resultat?: "gagne" | "perdu" | "annule";
}

const sens = (c: Camp) => (c === "OCC" ? 1 : -1);
const roundDe = (annee: number, trimestre: number) => (annee - 2000) * 4 + trimestre - 1;
export const pointsCampagne = (p: Pick<Plan, "intensite">) => CAMPAGNE.pointsParIntensite * p.intensite;
// Prochain scrutin d'un pays dans les 3 ans (ce trimestre compris).
export function scrutinDe(e: EtatPartie, iso: string): { round: number; annee: number; nom: string } | null {
  const x = ELECTIONS_PAYS.filter(x => x.iso === iso).map(x => ({ round: roundDe(x.annee, x.trimestre), annee: x.annee, nom: x.nom }))
    .filter(x => x.round >= e.round && x.round <= e.round + CAMPAGNE.horizon).sort((a, b) => a.round - b.round)[0];
  return x ?? null;
}
export function nouvelleCampagne(e: EtatPartie, camp: Camp, iso: string, intensite: 1 | 2 | 3): Campagne | undefined {
  const s = scrutinDe(e, iso); if (!s) return undefined;
  const pts = CAMPAGNE.pointsParIntensite * intensite, demi = (x: number) => Math.round(2 * x) / 2;
  const leviers = { medias: demi(pts * 0.35), terrain: demi(pts * 0.25), partis: demi(pts * 0.2), promesses: 0 };
  leviers.promesses = Math.max(0, pts - leviers.medias - leviers.terrain - leviers.partis);
  const depart = Math.round(outils.borne(50 + 20 * sens(camp) * alignement(e, iso), 20, 80));
  return { scrutin: s.round, annee: s.annee, nom: s.nom, depart, sondage: depart, leviers, fraude: false };
}
export const gainLeviers = (l: Record<Levier, number>) => LISTE_LEVIERS.reduce((s, k) => s + LEVIERS[k].k * Math.sqrt(Math.max(0, l[k])), 0);
// Effort adverse par trimestre : sa propre campagne s'il en mène une, sinon l'opposition locale ; le terrain l'amortit.
export function effortAdverse(e: EtatPartie, p: Plan, l = p.campagne!.leviers): number {
  const r = planRival(e, p), base = r?.campagne ? gainLeviers(r.campagne.leviers) : CAMPAGNE.opposition;
  return base * (1 - 0.5 * Math.min(1, l.terrain / 2));
}
export const trimestresAvantScrutin = (e: EtatPartie, c: Campagne) => Math.max(0, c.scrutin - e.round + 1);
// Chance réelle au scrutin, avec la règle de resoudreElections : écart = soutiens + apport des campagnes + 2 × penchant + hasard uniforme (±1) ;
// victoire si l'écart dépasse 1 dans le sens du camp, donc P = (apport + 2 × penchant) / 2, borné à [0, 1]. La fraude démasquée (25 %) annule l'apport.
export function chanceScrutin(e: EtatPartie, p: Plan, sondage: number, fraude: boolean): number {
  const s = sens(p.camp), k = e.campagnesElectorales[`${p.cible}:${p.campagne!.annee}`] ?? { OCC: 0, CHN: 0 }, r = planRival(e, p);
  const fond = s * (k.OCC - k.CHN) + 2 * s * alignement(e, p.cible) - (r?.campagne && !r.campagne.resultat ? (r.campagne.sondage - 50) / 10 : 0);
  const P = (x: number) => outils.borne(x / 2, 0, 1), apport = (sondage + (fraude ? CAMPAGNE.fraude : 0) - 50) / 10;
  return fraude ? (1 - CAMPAGNE.risqueFraude) * P(fond + apport) + CAMPAGNE.risqueFraude * P(fond) : P(fond + apport);
}
// Projection au soir du scrutin avec une répartition donnée.
export function projection(e: EtatPartie, p: Plan, l: Record<Levier, number>, fraude: boolean) {
  const c = p.campagne!, n = trimestresAvantScrutin(e, c);
  const fin = outils.borne(c.sondage + n * (gainLeviers(l) - effortAdverse(e, p, l)), 20, 80);
  return { n, sondage: fin, chance: chanceScrutin(e, p, fin, fraude), scandale: 1 - Math.pow(1 - Math.min(0.9, CAMPAGNE.scandale * l.partis), n),
    dette: CAMPAGNE.dette * l.promesses * CAMPAGNE.dureeDette, risqueFraude: fraude ? CAMPAGNE.risqueFraude : 0 };
}
export function peutReglerCampagne(e: EtatPartie, camp: Camp, id: string, l: Record<Levier, number>): string | null {
  const p = e.plans?.find(x => x.id === id && x.camp === camp); if (!p?.campagne) return "Campagne introuvable.";
  if (p.campagne.resultat) return "Le scrutin a déjà eu lieu.";
  if (LISTE_LEVIERS.some(k => !(l[k] >= 0 && l[k] <= CAMPAGNE.maxLevier))) return `Chaque levier va de 0 à ${CAMPAGNE.maxLevier} points.`;
  const t = LISTE_LEVIERS.reduce((s, k) => s + l[k], 0);
  if (t > pointsCampagne(p) + 1e-9) return `Au plus ${pointsCampagne(p)} points par trimestre (intensité de l'orientation).`;
  return null;
}
export function reglerCampagne(e0: EtatPartie, camp: Camp, id: string, l: Record<Levier, number>, fraude: boolean): EtatPartie {
  const err = peutReglerCampagne(e0, camp, id, l); if (err) throw new Error(err);
  const e = structuredClone(e0), c = e.plans!.find(x => x.id === id)!.campagne!;
  c.leviers = { ...l }; c.fraude = fraude;
  return e;
}
// Un trimestre de campagne (appelé par avancerPlans) : sondage, scandale du financement des partis.
export function tourCampagne(e: EtatPartie, p: Plan) {
  const c = p.campagne; if (!c || c.resultat || e.round > c.scrutin) return;
  c.sondage = Math.round(10 * outils.borne(c.sondage + gainLeviers(c.leviers) - effortAdverse(e, p), 20, 80)) / 10;
  if (c.leviers.partis > 0 && outils.tirer(e) < CAMPAGNE.scandale * c.leviers.partis) {
    c.sondage = Math.max(20, c.sondage - 4); e.camps[p.camp].cp = outils.borne(e.camps[p.camp].cp - 3, 0, 100);
    outils.noter(e, { type: "action", titre: `Scandale : financement de partis ${enPays(p.cible)}`, famille: "scandale_dirigeant", texte: "Des versements occultes sont révélés : sondage −4, capital politique −3.", camp: p.camp, pays: [p.cible], visiblePour: [...CAMPS] });
  }
}
const enPays = (iso: string) => `${/^[AEIOUÉ]/.test(nomPays(iso)) ? "en" : "au"} ${nomPays(iso)}`;
// Dettes de campagne (promesses économiques) : payées chaque trimestre pendant un an après le scrutin.
export function payerDettes(e: EtatPartie) {
  for (const camp of CAMPS) { const d = e.camps[camp].dette; if (!d) continue;
    if (e.round <= d.fin) e.camps[camp].budget = arrondi(e.camps[camp].budget - d.parTrimestre); else delete e.camps[camp].dette; }
}
// Au scrutin : apport des campagnes à l'écart (positif = bloc USA), fraude démasquée ou non. Appelé par resoudreElections.
export function apportCampagnes(e: EtatPartie, iso: string): number {
  let d = 0;
  for (const p of (e.plans ?? []).filter(x => x.cible === iso && x.campagne && !x.campagne.resultat && x.campagne.scrutin === e.round)) {
    const c = p.campagne!;
    if (c.fraude && outils.tirer(e) < CAMPAGNE.risqueFraude) {
      c.resultat = "annule"; const k = e.camps[p.camp], inf = e.pays[iso].influence[p.camp];
      k.cp = outils.borne(k.cp - 10, 0, 100); inf.p = Math.max(0, inf.p - 15); gagnerAE(e, p.camp, iso, 20); outils.memoriser(e, iso, p.camp, -4);
      outils.noter(e, { type: "politique", titre: `Fraude démasquée ${enPays(iso)}`, famille: "revolution", texte: `Des observateurs prouvent le bourrage d'urnes du ${p.camp === "OCC" ? "bloc USA" : "bloc Chine"} : capital politique −10, influence politique −15, méfiance dans la région.`, camp: p.camp, pays: [iso], visiblePour: [...CAMPS] });
      continue;
    }
    d += sens(p.camp) * (c.sondage + (c.fraude ? CAMPAGNE.fraude : 0) - 50) / 10;
  }
  return d;
}
// Après le scrutin : issue de chaque campagne ; promesses à payer ; fenêtre de coup d'État si la campagne est perdue.
export function issueCampagnes(e: EtatPartie, iso: string, gagnant: Camp | null): Plan[] {
  const finies: Plan[] = [];
  for (const p of (e.plans ?? []).filter(x => x.cible === iso && x.campagne && x.campagne.scrutin === e.round)) {
    const c = p.campagne!;
    if (!c.resultat) c.resultat = gagnant === p.camp ? "gagne" : "perdu";
    if (c.leviers.promesses > 0) e.camps[p.camp].dette = { parTrimestre: arrondi((e.camps[p.camp].dette?.parTrimestre ?? 0) + CAMPAGNE.dette * c.leviers.promesses), fin: e.round + CAMPAGNE.dureeDette };
    if (c.resultat === "perdu") e.camps[p.camp].coup = { iso, fin: e.round + 1 };
    finies.push(p);
  }
  return finies;
}

// ---------- Coup d'État après un scrutin perdu ----------
export function conditionsCoup(e: EtatPartie, camp: Camp, iso: string) {
  const p = e.pays[iso], inf = p?.influence[camp].p ?? 0, st = p?.stabilite ?? 100, nuc = nucleaire(iso, date(e.round).annee);
  const lignes = [
    { ok: inf >= CAMPAGNE.coup.influence, texte: `Ton influence politique au moins ${CAMPAGNE.coup.influence} (actuelle : ${Math.round(inf)})` },
    { ok: st <= CAMPAGNE.coup.stabilite, texte: `Stabilité au plus ${CAMPAGNE.coup.stabilite} (actuelle : ${Math.round(st)})` },
    { ok: !nuc, texte: nuc ? "Puissance nucléaire : exclu" : "Pas une puissance nucléaire" },
  ];
  const chance = outils.borne(CAMPAGNE.coup.base + bonusPutsch(e, camp) + (CAMPAGNE.coup.stabilite - st) / 100, 0.05, 0.85);
  return { lignes, ok: lignes.every(x => x.ok), chance };
}
export function peutTenterCoup(e: EtatPartie, camp: Camp, iso: string): string | null {
  const w = e.camps[camp].coup;
  if (!w || w.iso !== iso || e.round > w.fin) return "Un coup d'État n'est proposé qu'au trimestre qui suit un scrutin perdu.";
  const k = conditionsCoup(e, camp, iso);
  if (!k.ok) return k.lignes.filter(x => !x.ok).map(x => x.texte).join(" ; ") + ".";
  if (e.camps[camp].cp < CAMPAGNE.coup.cp) return `Capital politique insuffisant (${CAMPAGNE.coup.cp}).`;
  return null;
}
export function tenterCoup(e0: EtatPartie, camp: Camp, iso: string): EtatPartie {
  const err = peutTenterCoup(e0, camp, iso); if (err) throw new Error(err);
  const e = structuredClone(e0), k = e.camps[camp], p = e.pays[iso], adv = adversaire(camp), { chance } = conditionsCoup(e, camp, iso);
  delete k.coup;
  if (outils.tirer(e) < chance) {
    p.influence[camp].p = Math.max(p.influence[camp].p, 55); p.influence[adv].p = Math.min(p.influence[adv].p, 20); p.stabilite = outils.borne(p.stabilite - 12, 0, 100);
    k.cp = outils.borne(k.cp - CAMPAGNE.coup.cp, 0, 100); gagnerAE(e, camp, iso, CAMPAGNE.coup.ae); e.tension = outils.borne(e.tension + 4, 0, 100);
    outils.noter(e, { type: "politique", titre: `Coup d'État ${enPays(iso)}`, famille: "coup_etat", texte: "L'armée renverse le vainqueur du scrutin ; le nouveau pouvoir se tourne vers ses soutiens étrangers (régime ami, expansion agressive, tension).", camp, pays: [iso], visiblePour: [...CAMPS] });
  } else {
    for (const ca of ["e", "p", "m", "c"] as const) p.influence[camp][ca] = Math.max(0, p.influence[camp][ca] - CAMPAGNE.coup.perte);
    k.cp = outils.borne(k.cp - CAMPAGNE.coup.cpEchec, 0, 100); outils.memoriser(e, iso, camp, -5);
    outils.noter(e, { type: "politique", titre: `Putsch manqué ${enPays(iso)}`, famille: "coup_etat", texte: `Les officiers sont arrêtés et avouent leurs soutiens : influence −${CAMPAGNE.coup.perte} partout dans le pays, capital politique −${CAMPAGNE.coup.cpEchec}.`, camp, pays: [iso], visiblePour: [...CAMPS] });
  }
  return e;
}
