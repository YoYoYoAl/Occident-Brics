// Plans pluriannuels et conseils (refonte du 28/10/2026, doc « Refonte du jeu »).
// Le joueur ne clique plus pays par pays : chaque année, il confie à 6 conseils des plans de 1 à 3 ans
// (quoi + où + durée + intensité). Les plans avancent seuls, déclenchent des moments forts à leurs jalons
// (duels contre l'autre bloc) et rapportent une grosse récompense à la fin. Les conseils dupliquent aussi
// l'instruction : leurs actions automatiques privilégient les pays visés.
import { type Camp, type Canal, type Effet, CAMPS, adversaire } from "./types";
import { date } from "./temps";
import { DETROITS } from "../data/flux";
import { DUELS, type IdDuel } from "../duels/catalogue";
import { gagnerAE, appliquerBataille, facteurPlanAE, AE, SCORE } from "./guerre";
import {
  type EtatPartie, type Domaine, type TypeAction, alignement, nomPays, ZONES, THEATRES, ZONES_STRATEGIQUES, RIVERAINS, electionProchaine,
  partFamille, arrondi, DOMAINE_ACTION, TECHNOLOGIES, SEUIL_TECHNO, outils,
} from "./partie";

// ---------- Conseils ----------
export type Conseil = "international" | "economie" | "militaire" | "politique" | "infrastructures" | "culture";
export const CONSEILS: Record<Conseil, { nom: string; texte: string; domaine: Domaine }> = {
  international: { nom: "Affaires internationales", texte: "Partenariats, alliances régionales, diplomatie.", domaine: "diplo" },
  economie: { nom: "Économie et commerce", texte: "Accords commerciaux, sanctions, guerre économique.", domaine: "eco" },
  militaire: { nom: "Conseil militaire", texte: "Présence armée, frontières, détroits, guerres.", domaine: "defense" },
  politique: { nom: "Politique et stabilité", texte: "Élections, coups d'État, contre-ingérence, renseignement.", domaine: "secret" },
  infrastructures: { nom: "Infrastructures et développement", texte: "Ports, routes, énergie, aide au développement.", domaine: "eco" },
  culture: { nom: "Éducation, culture et recherche", texte: "Universités, médias, soft power, course technologique.", domaine: "diplo" },
};
export const LISTE_CONSEILS = Object.keys(CONSEILS) as Conseil[];
export type Trait = "prudent" | "agressif" | "corrompu" | "brillant" | "loyal";
export const TRAITS: Record<Trait, { nom: string; texte: string }> = {
  prudent: { nom: "prudent", texte: "Risque de scandale divisé par deux, progression −5 %." },
  agressif: { nom: "agressif", texte: "Effets +20 %, mais la tension monte." },
  corrompu: { nom: "corrompu", texte: "Coûts −30 %, mais 5 % de risque de scandale par trimestre." },
  brillant: { nom: "brillant", texte: "Progression +15 %." },
  loyal: { nom: "loyal", texte: "Avantage +0,1 dans les duels." },
};
const LISTE_TRAITS = Object.keys(TRAITS) as Trait[];

// ---------- Objectifs ----------
export type TypeCible = "pays" | "zone" | "rival" | "detroit" | "theatre" | "strat";
export type ObjectifPlan = "commerce" | "sanctions" | "partenariat" | "influence" | "election" | "renverser" | "contrer" | "espionnage"
  | "presence" | "detroit" | "frontiere" | "infrastructures" | "rayonnement" | "techno";
export interface DefObjectif {
  nom: string; conseil: Conseil; cible: TypeCible; canal: Canal | null; duels: IdDuel[]; texte: string; recompense: string;
  secret?: boolean; conteste?: boolean; // secret : risque de scandale ; contesté : duel dès le premier jalon
}
export const OBJECTIFS: Record<ObjectifPlan, DefObjectif> = {
  commerce: { nom: "Développer le commerce", conseil: "economie", cible: "pays", canal: "e", duels: ["jaipur", "korsar"],
    texte: "Influence économique chaque trimestre dans le pays.", recompense: "Accord commercial : influence économique +12, croissance du pays +0,4 point pendant 2 ans." },
  sanctions: { nom: "Sanctionner", conseil: "economie", cible: "pays", canal: null, duels: ["korsar", "jaipur"], conteste: true,
    texte: "Freine l'économie du pays et l'influence adverse.", recompense: "Embargo : croissance du pays −1 point pendant 2 ans, influence économique adverse −8." },
  partenariat: { nom: "Nouer un partenariat stratégique", conseil: "international", cible: "pays", canal: "p", duels: ["quarto", "coup"],
    texte: "Influence politique chaque trimestre ; le conseil militaire suit.", recompense: "Partenariat signé : influence politique +8 et militaire +8 ; garantie de défense si le pays penche nettement vers toi." },
  influence: { nom: "S'étendre dans une région", conseil: "international", cible: "zone", canal: "p", duels: ["longhorn", "sept"],
    texte: "Influence politique dans tous les pays de la région.", recompense: "Influence politique +3 dans chaque pays de la région." },
  election: { nom: "Peser sur une élection", conseil: "politique", cible: "pays", canal: "p", duels: ["puissance4", "skull"], conteste: true,
    texte: "Campagne d'influence avant un scrutin.", recompense: "Le vainqueur te doit sa victoire : influence politique +10, adverse −5." },
  renverser: { nom: "Renverser le régime", conseil: "politique", cible: "pays", canal: "p", duels: ["echecs", "othello", "coup"], secret: true, conteste: true,
    texte: "Opposition financée, officiers approchés : le pays se fragilise.", recompense: "Régime ami : influence politique au moins 55, adverse au plus 20, stabilité −12." },
  contrer: { nom: "Contrer l'adversaire", conseil: "politique", cible: "pays", canal: null, duels: ["skull", "coup", "stratego"], secret: true, conteste: true,
    texte: "Fait reculer l'influence adverse chaque trimestre.", recompense: "Influence politique adverse −12 et économique −6." },
  espionnage: { nom: "Infiltrer le rival", conseil: "politique", cible: "rival", canal: null, duels: ["mastermind", "simon"], secret: true,
    texte: "Rapporte du budget et révèle les plans adverses.", recompense: "Budget +3, tous les plans adverses révélés pendant 2 ans." },
  presence: { nom: "Installer une présence militaire", conseil: "militaire", cible: "strat", canal: "m", duels: ["onitama", "bataille"],
    texte: "Présence croissante dans une zone stratégique.", recompense: "Présence +15 dans la zone." },
  detroit: { nom: "Contrôler un détroit", conseil: "militaire", cible: "detroit", canal: "m", duels: ["go", "bataille", "onitama"], conteste: true,
    texte: "Influence militaire chez les riverains.", recompense: "Blocage du détroit pendant 1 an (les flux qui le traversent sont coupés), tension +5." },
  frontiere: { nom: "Prendre l'avantage sur un front", conseil: "militaire", cible: "theatre", canal: "m", duels: ["memoire44", "schotten", "stratego", "streetfighter"], conteste: true,
    texte: "Influence militaire dans les pays du théâtre.", recompense: "Influence militaire +10 sur le théâtre, adverse −8, tension +4." },
  infrastructures: { nom: "Grands chantiers régionaux", conseil: "infrastructures", cible: "zone", canal: "e", duels: ["santorini", "sept"],
    texte: "Influence économique dans toute la région.", recompense: "Influence économique +2,5 et croissance +0,3 point pendant 1 an dans chaque pays de la région." },
  rayonnement: { nom: "Rayonner dans une région", conseil: "culture", cible: "zone", canal: "c", duels: ["sept", "skull"],
    texte: "Influence culturelle dans toute la région.", recompense: "Influence culturelle +3 et politique +1 dans chaque pays de la région." },
  techno: { nom: "Course technologique", conseil: "culture", cible: "rival", canal: null, duels: ["lostcities", "simon"],
    texte: "Points de recherche chaque trimestre.", recompense: "Percée technologique sur la piste la plus avancée." },
};
export const LISTE_OBJECTIFS = Object.keys(OBJECTIFS) as ObjectifPlan[];

// ---------- Plans ----------
export type Intensite = 1 | 2 | 3;
export const NOMS_INTENSITE: Record<Intensite, string> = { 1: "discret", 2: "normal", 3: "massif" };
export const DUREES = [4, 6, 8, 12]; // trimestres : 1 an, 18 mois, 2 ans, 3 ans
export const PLANS = {
  max: 5, cout: { 1: 0.3, 2: 0.6, 3: 1.2 } as Record<Intensite, number>, coutZone: 1.5,
  effetPays: 2, effetZone: 0.5, jalons: [100 / 3, 200 / 3, 100], multConseil: 0.4,
  victoire: 0.6, defaite: 0.4, recul: 25, elan: 10, riposte: 33,
};
export interface Plan {
  id: string; camp: Camp; objectif: ObjectifPlan; cible: string; debut: number; duree: number; intensite: Intensite;
  progres: number; jalons: number; resultats: number[]; vuPar: Camp[]; dernierDuel?: IdDuel;
}
export interface Duel {
  id: string; plan: string; type: IdDuel; attaquant: Camp; defenseur: Camp; avantage: number; round: number; graine: number;
  motif: "jalon" | "riposte" | "bataille"; titre: string; // bataille : plan = « guerre:ISO »
}

const sens = (c: Camp) => (c === "OCC" ? 1 : -1);
const leader = (c: Camp) => (c === "OCC" ? "USA" : "CHN");
export const nomBlocPlan = (c: Camp) => (c === "OCC" ? "bloc USA" : "bloc Chine");

// Cibles possibles d'un objectif (identifiant → nom affiché).
export function ciblesPossibles(e: EtatPartie, camp: Camp, o: ObjectifPlan): { id: string; nom: string }[] {
  const def = OBJECTIFS[o], tous = Object.keys(e.pays).filter(i => i !== "USA" && i !== "CHN");
  const parNom = (l: { id: string; nom: string }[]) => l.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  if (def.cible === "zone") return Object.entries(ZONES).map(([id, z]) => ({ id, nom: z.nom }));
  if (def.cible === "rival") return [{ id: leader(adversaire(camp)), nom: adversaire(camp) === "OCC" ? "États-Unis (le rival)" : "Chine (le rival)" }];
  if (def.cible === "detroit") return DETROITS.filter(d => RIVERAINS[d.id]).map(d => ({ id: d.id, nom: d.nom }));
  if (def.cible === "theatre") return Object.entries(THEATRES).map(([id, t]) => ({ id, nom: t.nom[0].toUpperCase() + t.nom.slice(1) }));
  if (def.cible === "strat") return ZONES_STRATEGIQUES.map(z => ({ id: z.id, nom: z.nom }));
  const s = sens(camp);
  let l = tous;
  if (o === "election") l = tous.filter(i => electionDans(e, i, 12));
  if (o === "sanctions") l = tous.filter(i => s * alignement(e, i) < 0.1);
  if (o === "contrer") l = tous.filter(i => e.pays[i].influence[adversaire(camp)].p + e.pays[i].influence[adversaire(camp)].e >= 10);
  if (o === "renverser") l = tous.filter(i => s * alignement(e, i) < 0.2);
  return parNom(l.map(i => ({ id: i, nom: nomPays(i) })));
}
// Élection dans les n trimestres qui viennent.
function electionDans(e: EtatPartie, iso: string, n: number): boolean {
  for (let k = 0; k <= n; k += 4) if (electionProchaine({ ...e, round: e.round + k }, iso)) return true;
  return false;
}
export function paysDuPlan(p: Pick<Plan, "objectif" | "cible">): string[] {
  const t = OBJECTIFS[p.objectif].cible;
  if (t === "pays") return [p.cible];
  if (t === "zone") return ZONES[p.cible]?.pays ?? [];
  if (t === "detroit") return RIVERAINS[p.cible] ?? [];
  if (t === "theatre") return THEATRES[p.cible]?.pays ?? [];
  return [];
}
export function nomCible(p: Pick<Plan, "objectif" | "cible">): string {
  const t = OBJECTIFS[p.objectif].cible;
  if (t === "pays" || t === "rival") return nomPays(p.cible);
  if (t === "zone") return ZONES[p.cible]?.nom ?? p.cible;
  if (t === "detroit") return DETROITS.find(d => d.id === p.cible)?.nom ?? p.cible;
  if (t === "theatre") return THEATRES[p.cible]?.nom ?? p.cible;
  return ZONES_STRATEGIQUES.find(z => z.id === p.cible)?.nom ?? p.cible;
}
export const titrePlan = (p: Plan) => `${OBJECTIFS[p.objectif].nom} : ${nomCible(p)}`;
export const plansDe = (e: EtatPartie, camp: Camp) => (e.plans ?? []).filter(p => p.camp === camp);
export const plansVisibles = (e: EtatPartie, camp: Camp) => (e.plans ?? []).filter(p => p.camp === camp || p.vuPar.includes(camp));
export const coutPlan = (e: EtatPartie, p: Pick<Plan, "objectif" | "intensite" | "camp">) =>
  arrondi(PLANS.cout[p.intensite] * (OBJECTIFS[p.objectif].cible === "zone" ? PLANS.coutZone : 1) * (chefDe(e, p.camp, OBJECTIFS[p.objectif].conseil) === "corrompu" ? 0.7 : 1));
export function chefDe(e: EtatPartie, camp: Camp, c: Conseil): Trait { return e.chefs?.[camp]?.[c] ?? "loyal"; }
// Plan adverse qui vise la même cible (les deux plans s'affrontent).
export const planRival = (e: EtatPartie, p: Plan) => (e.plans ?? []).find(q => q.camp !== p.camp && q.cible === p.cible && OBJECTIFS[q.objectif].cible === OBJECTIFS[p.objectif].cible);

export function peutLancerPlan(e: EtatPartie, camp: Camp, o: ObjectifPlan, cible: string, duree: number, intensite: Intensite): string | null {
  const c = e.camps[camp], mes = plansDe(e, camp);
  if (!OBJECTIFS[o]) return "Objectif inconnu.";
  if (!DUREES.includes(duree)) return "Durée possible : 1 an, 18 mois, 2 ans ou 3 ans.";
  if (![1, 2, 3].includes(intensite)) return "Intensité : discret, normal ou massif.";
  if (mes.length >= PLANS.max) return `Au plus ${PLANS.max} plans en cours : termine ou abandonne un plan d'abord.`;
  if (!ciblesPossibles(e, camp, o).some(x => x.id === cible)) return "Cette cible n'est pas possible pour cet objectif en ce moment.";
  if (mes.some(p => p.objectif === o && p.cible === cible)) return "Un plan identique est déjà en cours.";
  if (date(e.round).trimestre !== 1 && c.ajustement === e.round) return "Hors séance annuelle (1er trimestre), un seul ajustement par trimestre.";
  if (c.budget < coutPlan(e, { objectif: o, intensite, camp })) return "Budget insuffisant pour le premier trimestre du plan.";
  return null;
}
export function lancerPlan(e0: EtatPartie, camp: Camp, o: ObjectifPlan, cible: string, duree: number, intensite: Intensite): EtatPartie {
  const err = peutLancerPlan(e0, camp, o, cible, duree, intensite); if (err) throw new Error(err);
  const e = structuredClone(e0);
  lancerSurPlace(e, camp, o, cible, duree, intensite);
  return e;
}
function lancerSurPlace(e: EtatPartie, camp: Camp, o: ObjectifPlan, cible: string, duree: number, intensite: Intensite) {
  const c = e.camps[camp];
  if (date(e.round).trimestre !== 1) c.ajustement = e.round;
  const p: Plan = { id: `p${e.round}_${camp}_${(e.plans ??= []).length}_${o}`, camp, objectif: o, cible, debut: e.round, duree, intensite, progres: 0, jalons: 0, resultats: [],
    vuPar: intensite === 3 ? [adversaire(camp)] : [] };
  e.plans.push(p);
  outils.noter(e, { type: "action", titre: `Plan lancé : ${titrePlan(p)}`, texte: `${CONSEILS[OBJECTIFS[o].conseil].nom}, ${duree / 4} an${duree > 4 ? "s" : ""}, intensité ${NOMS_INTENSITE[intensite]}.`,
    camp, pays: paysDuPlan(p), visiblePour: intensite === 3 ? [...CAMPS] : [camp] });
}
export function abandonnerPlan(e0: EtatPartie, camp: Camp, id: string): EtatPartie {
  const p = (e0.plans ?? []).find(x => x.id === id && x.camp === camp); if (!p) throw new Error("Plan introuvable.");
  if (date(e0.round).trimestre !== 1 && e0.camps[camp].ajustement === e0.round) throw new Error("Hors séance annuelle (1er trimestre), un seul ajustement par trimestre.");
  const e = structuredClone(e0), q = e.plans!.find(x => x.id === id)!;
  if (date(e.round).trimestre !== 1) e.camps[camp].ajustement = e.round;
  // un plan abandonné garde la moitié de sa récompense, au prorata de sa progression
  if (q.progres >= 50) recompenser(e, q, 0.5);
  e.plans = e.plans!.filter(x => x.id !== id);
  outils.noter(e, { type: "action", titre: `Plan abandonné : ${titrePlan(q)}`, texte: q.progres >= 50 ? "Avancé à plus de la moitié : la moitié de la récompense est acquise." : "Trop tôt : l'effort est perdu.", camp, visiblePour: [camp] });
  return e;
}
export function remplacerChef(e0: EtatPartie, camp: Camp, cs: Conseil): EtatPartie {
  if (date(e0.round).trimestre !== 1) throw new Error("On remplace un chef de conseil lors de la séance annuelle (1er trimestre).");
  if (e0.camps[camp].cp < 2) throw new Error("Capital politique insuffisant (2).");
  const e = structuredClone(e0), avant = chefDe(e, camp, cs), choix = LISTE_TRAITS.filter(t => t !== avant);
  e.camps[camp].cp -= 2;
  ((e.chefs ??= { OCC: {}, CHN: {} })[camp] ??= {})[cs] = choix[Math.floor(outils.tirer(e) * choix.length)];
  return e;
}

// ---------- Avancée trimestrielle ----------
// Vitesse : 100 % sur la durée choisie ; freinée par un plan adverse sur la même cible, par un pays qui penche vers l'adversaire,
// et par un conflit entre conseils (un plan militaire et un plan commercial ou culturel sur les mêmes pays).
export function vitesse(e: EtatPartie, p: Plan): number {
  const r = planRival(e, p), s = sens(p.camp), pays = paysDuPlan(p), chef = chefDe(e, p.camp, OBJECTIFS[p.objectif].conseil);
  let v = (100 / p.duree) * (0.85 + 0.075 * p.intensite);
  if (r) v *= 1 - 0.35 * r.intensite / (r.intensite + p.intensite);
  if (pays.length) v *= 1 - 0.3 * Math.max(0, -s * pays.reduce((a, i) => a + alignement(e, i), 0) / pays.length);
  if (chef === "brillant") v *= 1.15; if (chef === "prudent") v *= 0.95;
  if (conflitConseils(e, p)) v *= 0.8;
  v *= facteurPlanAE(e, p.camp, pays); // coalition contre le camp dans la région : −30 %
  return v;
}
const DURS: ObjectifPlan[] = ["sanctions", "renverser", "frontiere", "detroit", "presence", "contrer"], DOUX: ObjectifPlan[] = ["commerce", "partenariat", "rayonnement", "infrastructures"];
export function conflitConseils(e: EtatPartie, p: Plan): Plan | null {
  const a = DURS.includes(p.objectif), b = DOUX.includes(p.objectif); if (!a && !b) return null;
  const mes = paysDuPlan(p);
  return plansDe(e, p.camp).find(q => q.id !== p.id && (a ? DOUX : DURS).includes(q.objectif) && paysDuPlan(q).some(i => mes.includes(i))) ?? null;
}

// Effet continu d'un trimestre (la part « immédiate » d'un plan) ; facteur > 1 pour un élan après un duel gagné.
function effetTrimestre(e: EtatPartie, p: Plan, facteur = 1) {
  const def = OBJECTIFS[p.objectif], pays = paysDuPlan(p), adv = adversaire(p.camp);
  const k = p.intensite * facteur * (chefDe(e, p.camp, def.conseil) === "agressif" ? 1.2 : 1);
  const gain = (iso: string, canal: Canal, x: number) => { const inf = e.pays[iso]?.influence[p.camp]; if (inf) inf[canal] = outils.borne(inf[canal] + x * (1 - inf[canal] / 100), 0, 100); };
  const perte = (iso: string, canal: Canal, x: number) => { const inf = e.pays[iso]?.influence[adv]; if (inf) inf[canal] = Math.max(0, inf[canal] - x); };
  const unit = def.cible === "zone" ? PLANS.effetZone : PLANS.effetPays;
  if (def.canal) for (const iso of pays) gain(iso, def.canal, unit * k);
  if (p.objectif === "sanctions") { e.pays[p.cible].bonus.push({ points: -0.15 * k, reste: 1 }); perte(p.cible, "e", 0.6 * k); }
  if (p.objectif === "renverser") e.pays[p.cible].stabilite = outils.borne(e.pays[p.cible].stabilite - 0.8 * k, 0, 100);
  if (p.objectif === "contrer") { perte(p.cible, "p", 1.2 * k); perte(p.cible, "e", 0.5 * k); }
  if (p.objectif === "espionnage") e.camps[p.camp].budget = arrondi(e.camps[p.camp].budget + 0.15 * k);
  if (p.objectif === "presence") { const z = e.zones[p.cible]; if (z) z[p.camp] = outils.borne(z[p.camp] + 1.2 * k, 0, 100); }
  if (p.objectif === "techno") { const t = pisteTechno(e, p.camp); if (t) (e.camps[p.camp].recherche ??= {})[t] = ((e.camps[p.camp].recherche ?? {})[t] ?? 0) + 0.12 * k; }
  if (p.objectif === "partenariat") gain(p.cible, "m", 0.5 * unit * k);
  if (chefDe(e, p.camp, def.conseil) === "agressif") e.tension = outils.borne(e.tension + 0.15 * p.intensite, 0, 100);
}
function pisteTechno(e: EtatPartie, camp: Camp): string | null {
  const faites = e.camps[camp].technologies ?? [], r = e.camps[camp].recherche ?? {};
  return Object.keys(TECHNOLOGIES).filter(t => !faites.includes(t)).sort((a, b) => (r[b] ?? 0) - (r[a] ?? 0))[0] ?? null;
}

// Récompense de fin de plan, pondérée par la réussite des duels (0,5 à 1,5) et l'intensité.
function recompenser(e: EtatPartie, p: Plan, part = 1) {
  const f = part * (0.5 + (p.resultats.length ? p.resultats.reduce((a, b) => a + b, 0) / p.resultats.length : 0.5)) * p.intensite / 2;
  const adv = adversaire(p.camp), pays = paysDuPlan(p), s = sens(p.camp);
  const inf = (iso: string, c: Camp, canal: Canal, x: number) => { const v = e.pays[iso]?.influence[c]; if (v) v[canal] = outils.borne(v[canal] + x * (x > 0 ? 1 - v[canal] / 100 : 1), 0, 100); };
  const efs: Effet[] = [];
  switch (p.objectif) {
    case "commerce": inf(p.cible, p.camp, "e", 12 * f); e.pays[p.cible].bonus.push({ points: 0.4 * f, reste: 8 }); e.pays[leader(p.camp)].bonus.push({ points: 0.03 * f, reste: 8 }); break;
    case "sanctions": e.pays[p.cible].bonus.push({ points: -1 * f, reste: 8 }); inf(p.cible, adv, "e", -8 * f); e.tension = outils.borne(e.tension + 2, 0, 100); break;
    case "partenariat": inf(p.cible, p.camp, "p", 8 * f); inf(p.cible, p.camp, "m", 8 * f);
      if (s * alignement(e, p.cible) >= 0.4 && !e.garanties?.some(g => g.iso === p.cible)) (e.garanties ??= []).push({ iso: p.cible, camp: p.camp }); break;
    case "influence": for (const i of pays) inf(i, p.camp, "p", 3 * f); break;
    case "election": inf(p.cible, p.camp, "p", 10 * f); inf(p.cible, adv, "p", -5 * f); break;
    case "renverser": { const x = e.pays[p.cible]; if (f >= 0.5) { x.influence[p.camp].p = Math.max(x.influence[p.camp].p, 55); x.influence[adv].p = Math.min(x.influence[adv].p, 20); }
      x.stabilite = outils.borne(x.stabilite - 12, 0, 100); if (f >= 0.5) gagnerAE(e, p.camp, p.cible, AE.renverser * f);
      outils.noter(e, { type: "action", titre: `Coup d'État ${nomPays(p.cible).match(/^[AEIOUÉ]/) ? "en" : "au"} ${nomPays(p.cible)}`, famille: "coup_etat", texte: "Le régime tombe ; les nouveaux dirigeants restent discrets sur leurs soutiens étrangers.", pays: [p.cible], visiblePour: [...CAMPS] }); break; }
    case "contrer": inf(p.cible, adv, "p", -12 * f); inf(p.cible, adv, "e", -6 * f); break;
    case "espionnage": e.camps[p.camp].budget = arrondi(e.camps[p.camp].budget + 3 * f); e.camps[p.camp].revelation = e.round + 8; break;
    case "presence": { const z = e.zones[p.cible]; if (z) z[p.camp] = outils.borne(z[p.camp] + 15 * f, 0, 100); break; }
    case "detroit": if (f >= 0.5) { e.blocages.push({ detroit: p.cible, fin: e.round + 4 }); e.tension = outils.borne(e.tension + 5, 0, 100); } for (const i of pays) inf(i, p.camp, "m", 4 * f); break;
    case "frontiere": for (const i of pays) { inf(i, p.camp, "m", 10 * f); inf(i, adv, "m", -8 * f); } e.tension = outils.borne(e.tension + 4, 0, 100); break;
    case "infrastructures": for (const i of pays) { inf(i, p.camp, "e", 2.5 * f); e.pays[i].bonus.push({ points: 0.3 * f, reste: 4 }); } break;
    case "rayonnement": for (const i of pays) { inf(i, p.camp, "c", 3 * f); inf(i, p.camp, "p", 1 * f); } break;
    case "techno": { const t = pisteTechno(e, p.camp); if (t) { const r = (e.camps[p.camp].recherche ??= {}); r[t] = Math.max(r[t] ?? 0, SEUIL_TECHNO - 1); outils.percee(e, p.camp, t); } break; }
  }
  void efs;
}

// Avance tous les plans d'un trimestre (appelé en fin de round, après les actions des deux camps).
export function avancerPlans(e: EtatPartie) {
  if (!e.plans?.length) return;
  for (const p of [...e.plans]) {
    const c = e.camps[p.camp], cout = coutPlan(e, p), def = OBJECTIFS[p.objectif];
    if (c.budget < cout) { outils.noter(e, { type: "action", titre: `Plan à l'arrêt faute de budget : ${titrePlan(p)}`, texte: `Il faut ${String(cout).replace(".", ",")} de budget par trimestre.`, camp: p.camp, visiblePour: [p.camp] }); continue; }
    c.budget = arrondi(c.budget - cout);
    effetTrimestre(e, p);
    p.progres = Math.min(100, p.progres + vitesse(e, p));
    // détection par l'adversaire : un plan massif est vu tout de suite, un plan normal au premier jalon, un plan discret par le renseignement
    const adv = adversaire(p.camp);
    if (!p.vuPar.includes(adv)) {
      const r = e.camps[adv].renseigne !== undefined && e.round - e.camps[adv].renseigne! <= 4 || (e.camps[adv].revelation ?? -1) >= e.round;
      if (outils.tirer(e) < (p.intensite === 2 ? 0.25 : 0.08) * (r ? 3 : 1) || (p.intensite === 2 && p.jalons >= 1)) {
        p.vuPar.push(adv);
        outils.noter(e, { type: "action", titre: `Renseignement : le ${nomBlocPlan(p.camp)} prépare « ${titrePlan(p)} »`, texte: `Plan ${NOMS_INTENSITE[p.intensite]}, avancé à ${Math.round(p.progres)} %.`, camp: adv, pays: paysDuPlan(p), visiblePour: [adv] });
      }
    }
    // scandale pour les plans secrets
    const chef = chefDe(e, p.camp, def.conseil);
    if (def.secret && outils.tirer(e) < 0.03 * p.intensite * (chef === "prudent" ? 0.5 : 1) + (chef === "corrompu" ? 0.05 : 0)) {
      c.cp = outils.borne(c.cp - 4, 0, 100); if (!p.vuPar.includes(adv)) p.vuPar.push(adv);
      for (const i of paysDuPlan(p)) outils.memoriser(e, i, p.camp, -3);
      outils.noter(e, { type: "action", titre: `Scandale : un plan secret du ${nomBlocPlan(p.camp)} est révélé (${nomCible(p)})`, famille: "scandale_dirigeant", texte: `« ${def.nom} » étalé dans la presse : capital politique −4, rancune dans le pays.`, camp: p.camp, pays: paysDuPlan(p), visiblePour: [...CAMPS] });
    }
    while (p.jalons < 2 && p.progres >= PLANS.jalons[p.jalons]) { p.jalons++; momentFort(e, p); }
    if (p.progres >= 100) {
      recompenser(e, p);
      e.plans = e.plans.filter(x => x.id !== p.id);
      outils.noter(e, { type: "action", titre: `Plan accompli : ${titrePlan(p)}`, texte: def.recompense, camp: p.camp, pays: paysDuPlan(p), visiblePour: p.vuPar.length || p.intensite > 1 ? [...CAMPS] : [p.camp] });
    }
  }
}

// Jalon : au 1er jalon, un élan (ou un duel si la cible est disputée) ; au 2e, toujours un duel contre l'autre bloc.
function momentFort(e: EtatPartie, p: Plan) {
  const r = planRival(e, p), def = OBJECTIFS[p.objectif];
  if (p.jalons === 1 && !r && !def.conteste) {
    effetTrimestre(e, p, 2);
    outils.noter(e, { type: "action", titre: `Jalon franchi : ${titrePlan(p)}`, texte: "Le plan prend de l'élan : double effet ce trimestre.", camp: p.camp, pays: paysDuPlan(p), visiblePour: [p.camp] });
    return;
  }
  ouvrirDuel(e, p, p.camp, adversaire(p.camp), "jalon");
}
export function avantageDuel(e: EtatPartie, p: Plan, attaquant: Camp): number {
  const r = planRival(e, p), def = OBJECTIFS[p.objectif], pays = paysDuPlan(p), s = sens(attaquant);
  const intA = attaquant === p.camp ? p.intensite : r?.intensite ?? 2, intD = attaquant === p.camp ? r?.intensite ?? 2 : p.intensite;
  let av = 0.15 * (intA - intD);
  if (pays.length) av += 0.4 * s * pays.reduce((a, i) => a + alignement(e, i), 0) / pays.length;
  const fam = def.conseil === "militaire" ? "militaire" : "economie";
  av += 2 * (partFamille(e, attaquant, fam) - partFamille(e, adversaire(attaquant), fam)) * 0.3;
  if (chefDe(e, attaquant, def.conseil) === "loyal") av += 0.1;
  if (attaquant === p.camp) av += 0.1 * Math.min(2, p.resultats.filter(x => x >= PLANS.victoire).length);
  return Math.max(-1, Math.min(1, av));
}
function ouvrirDuel(e: EtatPartie, p: Plan, attaquant: Camp, defenseur: Camp, motif: Duel["motif"]) {
  const def = OBJECTIFS[p.objectif], choix = def.duels.filter(d => d !== p.dernierDuel), type = choix[Math.floor(outils.tirer(e) * choix.length)] ?? def.duels[0];
  p.dernierDuel = type;
  const d: Duel = { id: `d${e.round}_${(e.duels ??= []).length}_${p.id}`, plan: p.id, type, attaquant, defenseur, avantage: avantageDuel(e, p, attaquant), round: e.round,
    graine: Math.floor(outils.tirer(e) * 2147483646) + 1, motif, titre: `${DUELS[type].nom} : ${titrePlan(p)}` };
  // le joueur humain joue le duel au trimestre suivant ; entre deux IA, il se règle tout de suite
  if (e.joueur && e.reglages.ia && (attaquant === e.joueur || defenseur === e.joueur)) { e.duels.push(d); if (!p.vuPar.includes(adversaire(p.camp))) p.vuPar.push(adversaire(p.camp)); }
  else appliquerDuel(e, d, resolutionAuto(e, d.avantage));
}
// Résolution automatique : 50 % à avantage nul, 92 % à avantage +1, avec une part de hasard.
export function resolutionAuto(e: EtatPartie, avantage: number): number {
  const p = 1 / (1 + Math.exp(-2.5 * avantage));
  return Math.max(0, Math.min(1, p + 0.35 * (outils.tirer(e) - 0.5)));
}
// Résultat r (0 à 1) du point de vue de l'attaquant.
function appliquerDuel(e: EtatPartie, d: Duel, r: number) {
  const p = e.plans?.find(x => x.id === d.plan);
  e.duels = (e.duels ?? []).filter(x => x.id !== d.id);
  if (d.motif === "bataille") { appliquerBataille(e, d.plan.slice(7), r);
    outils.noter(e, { type: "action", titre: `${d.titre} : ${r >= PLANS.victoire ? "victoire" : r < PLANS.defaite ? "défaite" : "issue indécise"} du ${nomBlocPlan(d.attaquant)}`, texte: `Score de guerre ${r >= 0.5 ? "+" : ""}${Math.round(60 * (r - 0.5))}.`, camp: d.attaquant, pays: [d.plan.slice(7)], visiblePour: [...CAMPS] }); return; }
  const issue = r >= PLANS.victoire ? "victoire" : r < PLANS.defaite ? "défaite" : "match nul";
  const ej = p ? enjeuxDuel(e, d, d.attaquant) : null, effet = ej ? (r >= PLANS.victoire ? ej.victoire : r < PLANS.defaite ? ej.defaite : ej.nul).replace(/^Ton plan/, "Plan").replace(/Ton capital/, "Capital") : "";
  outils.noter(e, { type: "action", titre: `Duel « ${DUELS[d.type].nom} » : ${issue} du ${nomBlocPlan(d.attaquant)}`, texte: p ? `${titrePlan(p)}. Effet : ${effet}` : d.titre, camp: d.attaquant, pays: p ? paysDuPlan(p) : [], visiblePour: [...CAMPS] });
  if (!p) return;
  if (d.motif === "riposte") {
    if (r >= PLANS.victoire) { p.progres = Math.max(0, p.progres - PLANS.riposte); p.jalons = PLANS.jalons.filter(j => p.progres >= j).length; p.resultats.push(0.3); }
    else if (r < PLANS.defaite) e.camps[d.attaquant].cp = outils.borne(e.camps[d.attaquant].cp - 3, 0, 100);
    return;
  }
  const rival = planRival(e, p);
  if (r >= PLANS.victoire) { p.progres = Math.min(99.9, p.progres + PLANS.elan); effetTrimestre(e, p, 1.5); if (rival) rival.progres = Math.max(0, rival.progres - PLANS.elan); }
  else if (r < PLANS.defaite) { p.progres = Math.max(0, p.progres - PLANS.recul); if (rival) { rival.progres = Math.min(99.9, rival.progres + PLANS.elan); effetTrimestre(e, rival, 1.5); } }
  p.resultats.push(r);
}
// Enjeux d'un duel vus par un camp, affichés avant de jouer : ce que changent une victoire, un nul et une défaite.
export interface Enjeux { victoire: string; nul: string; defaite: string }
export function enjeuxDuel(e: EtatPartie, d: Duel, camp: Camp): Enjeux {
  const moi = camp === d.attaquant, p = e.plans?.find(x => x.id === d.plan);
  if (d.motif === "bataille") {
    const g = Math.round(SCORE.bataille / 2), iso = d.plan.slice(7);
    const t = (x: number) => `score de guerre de l'intervention (${iso}) ${x >= 0 ? "+" : "−"}${Math.abs(x)} pour ${moi ? "toi" : "l'adversaire"}`;
    return { victoire: `Jusqu'à ${moi ? t(g) : t(-g)}.`, nul: "Score de guerre presque inchangé.", defaite: `Jusqu'à ${moi ? t(-g) : t(g)}.` };
  }
  if (!p) return { victoire: "Plan terminé : aucun effet.", nul: "Aucun effet.", defaite: "Aucun effet." };
  const r = planRival(e, p), nom = titrePlan(p), finale = "Le résultat compte aussi dans la récompense de fin du plan (×0,5 à ×1,5).";
  if (d.motif === "riposte") return moi
    ? { victoire: `Le plan adverse « ${nom} » recule de ${PLANS.riposte} % (un jalon).`, nul: "Aucun effet.", defaite: "Ton capital politique −3." }
    : { victoire: "Ton plan est protégé ; l'adversaire perd 3 de capital politique.", nul: "Aucun effet.", defaite: `Ton plan « ${nom} » recule de ${PLANS.riposte} % (un jalon).` };
  const pourPlan = `« ${nom} » avance de ${PLANS.elan} % et produit tout de suite 1,5 trimestre d'effets${r ? ` ; le plan rival recule de ${PLANS.elan} %` : ""}.`;
  const contrePlan = `« ${nom} » recule de ${PLANS.recul} %${r ? ` ; le plan rival avance de ${PLANS.elan} % et produit 1,5 trimestre d'effets` : ""}.`;
  return moi ? { victoire: `Ton plan ${pourPlan} ${finale}`, nul: `Pas d'élan ni de recul. ${finale}`, defaite: `Ton plan ${contrePlan} ${finale}` }
    : { victoire: `Le plan adverse ${contrePlan}`, nul: "Pas d'élan ni de recul pour le plan adverse.", defaite: `Le plan adverse ${pourPlan}` };
}
// Bilan d'un duel pour un camp : ce qui a vraiment changé entre l'état d'avant et celui d'après (affiché après le duel).
export function bilanDuel(av: EtatPartie, ap: EtatPartie, d: Duel, camp: Camp): string[] {
  const l: string[] = [], adv = adversaire(camp), f = (x: number, u = "") => `${x > 0 ? "+" : "−"}${String(Math.round(Math.abs(x) * 10) / 10).replace(".", ",")}${u}`;
  for (const q of ap.plans ?? []) { const a = av.plans?.find(x => x.id === q.id); if (a && Math.abs(q.progres - a.progres) >= 0.05)
    l.push(`${q.camp === camp ? "Ton plan" : "Plan adverse"} « ${titrePlan(q)} » : ${Math.round(a.progres)} % → ${Math.round(q.progres)} % (${f(q.progres - a.progres, " %")}).`); }
  for (const c of [camp, adv]) { const qui = c === camp ? "Ton" : "Capital politique adverse", dc = ap.camps[c].cp - av.camps[c].cp, db = ap.camps[c].budget - av.camps[c].budget;
    if (Math.abs(dc) >= 0.05) l.push(`${c === camp ? "Ton capital politique" : qui} : ${f(dc)}.`);
    if (Math.abs(db) >= 0.05) l.push(`${c === camp ? "Ton budget" : "Budget adverse"} : ${f(db)}.`); }
  const p = av.plans?.find(x => x.id === d.plan), pays = p ? paysDuPlan(p) : d.motif === "bataille" ? [d.plan.slice(7)] : [];
  for (const iso of pays) for (const c of [camp, adv]) {
    const a = av.pays[iso]?.influence[c], b = ap.pays[iso]?.influence[c]; if (!a || !b) continue;
    const x = (["e", "p", "m", "c"] as const).reduce((s, k) => s + b[k] - a[k], 0);
    if (Math.abs(x) >= 0.1) l.push(`${c === camp ? "Ton influence" : "Influence adverse"} en ${nomPays(iso)} : ${f(x)} (total des 4 canaux).`);
  }
  for (const it of ap.interventions) { const a = av.interventions.find(x => x.iso === it.iso && x.camp === it.camp) as { score?: number } | undefined, s = (it as { score?: number }).score ?? 0;
    if (a && Math.abs(s - (a.score ?? 0)) >= 0.5) l.push(`Score de guerre (${nomPays(it.iso)}, intervention ${it.camp === camp ? "à toi" : "adverse"}) : ${Math.round(a.score ?? 0)} → ${Math.round(s)}.`); }
  if (Math.abs(ap.tension - av.tension) >= 0.1) l.push(`Tension mondiale : ${f(ap.tension - av.tension)}.`);
  return l.length ? l : ["Aucun changement mesurable : le duel n'a rien fait basculer."];
}
// Le joueur a joué (ou délégué) un duel : r est son propre résultat (0 à 1).
export function conclureDuel(e0: EtatPartie, id: string, rJoueur: number | null): EtatPartie {
  const e = structuredClone(e0), d = e.duels?.find(x => x.id === id); if (!d) throw new Error("Duel introuvable.");
  const r = rJoueur === null ? resolutionAuto(e, d.avantage) : d.attaquant === e.joueur ? rJoueur : 1 - rJoueur;
  appliquerDuel(e, d, Math.max(0, Math.min(1, r)));
  return e;
}
// Duels du joueur non joués : réglés automatiquement avant que les plans n'avancent.
export function reglerDuelsEnSuspens(e: EtatPartie) {
  for (const d of [...(e.duels ?? [])]) if (d.round < e.round) appliquerDuel(e, d, resolutionAuto(e, d.avantage));
}

// ---------- Riposte : une fois par an, attaquer un plan adverse repéré ----------
export function peutRiposterPlan(e: EtatPartie, camp: Camp, id: string): string | null {
  const p = e.plans?.find(x => x.id === id);
  if (!p || p.camp === camp) return "Plan adverse introuvable.";
  if (!p.vuPar.includes(camp)) return "Ce plan n'a pas été repéré par tes services.";
  if (e.camps[camp].riposteAnnee === date(e.round).annee) return "Une riposte directe par an.";
  if (e.camps[camp].cp < 3) return "Capital politique insuffisant (3).";
  if ((e.duels ?? []).some(d => d.plan === id)) return "Un duel est déjà en cours sur ce plan.";
  return null;
}
export function riposterPlan(e0: EtatPartie, camp: Camp, id: string): EtatPartie {
  const err = peutRiposterPlan(e0, camp, id); if (err) throw new Error(err);
  const e = structuredClone(e0), p = e.plans!.find(x => x.id === id)!;
  e.camps[camp].riposteAnnee = date(e.round).annee; e.camps[camp].cp -= 3;
  // une riposte du joueur se joue tout de suite : le duel est daté du trimestre précédent pour rester au programme
  ouvrirDuel(e, p, camp, p.camp, "riposte");
  const d = e.duels?.find(x => x.plan === id && x.motif === "riposte"); if (d) d.round = e.round - 1;
  return e;
}

// ---------- Les conseils dupliquent l'instruction ----------
// Bonus appliqué à la valeur des actions automatiques d'un domaine dans les pays visés par un plan de ce domaine.
export function multPlan(e: EtatPartie, camp: Camp, iso: string, type: TypeAction): number {
  let m = 1;
  for (const p of e.plans ?? []) if (p.camp === camp && CONSEILS[OBJECTIFS[p.objectif].conseil].domaine === DOMAINE_ACTION[type] && paysDuPlan(p).includes(iso))
    m = Math.max(m, 1 + PLANS.multConseil * p.intensite);
  return m;
}

// ---------- Réserve d'opérations ciblées ----------
// +1 point par trimestre (6 au plus), débloqué en début et en fin d'année pour quelques opérations précises.
export const RESERVE = { gain: 1, max: 6, trimestres: [1, 4] };

// ---------- IA : séance annuelle ----------
export function iaPlans(e: EtatPartie, camp: Camp) {
  const c = e.camps[camp], s = sens(camp), adv = adversaire(camp), W = outils.poidsPays(e);
  const budgetLibre = () => c.budget - plansDe(e, camp).reduce((a, p) => a + coutPlan(e, p), 0) * 2;
  const val = (iso: string) => (W[iso] ?? 0) * (1 - Math.abs(alignement(e, iso)));
  const options: { o: ObjectifPlan; cible: string; v: number }[] = [];
  const tous = Object.keys(e.pays).filter(i => i !== "USA" && i !== "CHN");
  for (const i of tous) { const a = s * alignement(e, i);
    if (a > -0.3 && a < 0.5) options.push({ o: "commerce", cible: i, v: val(i) * 1.2 });
    if (a > 0 && a < 0.45) options.push({ o: "partenariat", cible: i, v: val(i) * 1.1 });
    if (a < -0.1 && e.pays[i].stabilite < 45) options.push({ o: "renverser", cible: i, v: (W[i] ?? 0) * 0.8 });
  }
  for (const z of Object.keys(ZONES)) { const l = ZONES[z].pays, v = l.reduce((a, i) => a + val(i), 0) / 3;
    options.push({ o: "influence", cible: z, v }, { o: "infrastructures", cible: z, v: v * 0.8 }, { o: "rayonnement", cible: z, v: v * 0.6 }); }
  for (const p of plansVisibles(e, adv).filter(p => p.camp === adv && OBJECTIFS[p.objectif].cible === "pays"))
    options.push({ o: "contrer", cible: p.cible, v: (W[p.cible] ?? 0) * 1.5 });
  options.push({ o: "techno", cible: leader(adv), v: 0.006 }, { o: "espionnage", cible: leader(adv), v: 0.004 });
  options.sort((a, b) => b.v - a.v);
  const conseilsPris = new Set(plansDe(e, camp).map(p => OBJECTIFS[p.objectif].conseil));
  for (const x of options) {
    if (plansDe(e, camp).length >= 4 || budgetLibre() < 2) break;
    const cs = OBJECTIFS[x.o].conseil; if (conseilsPris.has(cs)) continue;
    const intensite: Intensite = budgetLibre() > 8 ? 3 : budgetLibre() > 4 ? 2 : 1, duree = [4, 6, 8, 8, 12][Math.floor(outils.tirer(e) * 5)];
    if (peutLancerPlan(e, camp, x.o, x.cible, duree, intensite)) continue;
    lancerSurPlace(e, camp, x.o, x.cible, duree, intensite); conseilsPris.add(cs);
  }
  // riposte : une chance sur deux contre le plan adverse repéré le plus avancé
  const cible = (e.plans ?? []).filter(p => p.camp === adv && p.vuPar.includes(camp)).sort((a, b) => b.progres - a.progres)[0];
  if (cible && !peutRiposterPlan(e, camp, cible.id) && outils.tirer(e) < 0.5) { c.riposteAnnee = date(e.round).annee; c.cp -= 3; ouvrirDuel(e, cible, camp, adv, "riposte"); }
}
export function tirerChefs(e: EtatPartie) {
  e.chefs = { OCC: {}, CHN: {} };
  for (const camp of CAMPS) for (const cs of LISTE_CONSEILS) e.chefs[camp][cs] = LISTE_TRAITS[Math.floor(outils.tirer(e) * LISTE_TRAITS.length)];
}
