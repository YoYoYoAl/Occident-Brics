// Ressources (2 novembre 2026) : qui a ce qui manque à ton camp, qui veut tes ressources, effet sur le PIB, chantage.
// Chaque pays a un SOLDE par bien, de −100 (dépend fortement des importations) à +100 (gros exportateur net).
// Départ : indicateurs réels 2000 (Banque mondiale, FAO via WDI, OWID) ; échelles, seuils et effets : estimation.
// Les soldes évoluent chaque année : tendances crédibles, croissance du PIB, dérive, découvertes, épuisement.
import attributs from "../data/attributs2000.json";
import donnees from "../data/pays2000.json";
import scores from "../data/scores2000.json";
import type { Carte } from "../moteur/types";
import * as MN from "./monnaie";
import { type EtatV2, type Camp, type Ligne, partPays, tirer, niveau, autre, borne, LEADER, NOM_CAMP } from "./moteur";

export type Bien = "energie" | "alimentation" | "metaux" | "terres" | "industrie";
export const BIENS: { id: Bien; nom: string; de: string }[] = [
  { id: "energie", nom: "Énergie", de: "d'énergie" }, { id: "alimentation", nom: "Alimentation", de: "d'alimentation" },
  { id: "metaux", nom: "Métaux", de: "de métaux" }, { id: "terres", nom: "Terres rares", de: "de terres rares" },
  { id: "industrie", nom: "Industrie", de: "de produits industriels" },
];
const nomBien = (b: Bien) => BIENS.find(x => x.id === b)!;
export const SEUIL = 25; // solde ≥ 25 : en a (exportateur) ; ≤ −25 : en manque (estimation)

// ---------- Soldes de départ (2000) ----------
const VAL = (attributs as any).pays as Record<string, { valeurs: Record<string, { v: number } | null> }>;
const SC = (scores as any).pays as Record<string, { scores: Record<string, number> }>;
const IND = Object.fromEntries((donnees as any).pays.map((p: any) => [p.iso3, p.indicateurs])) as Record<string, Record<string, number>>;
const ATELIERS_2000 = ["CHN", "KOR", "TWN", "MEX", "MYS", "THA", "SGP"]; // estimation
const c100 = (x: number) => Math.max(-100, Math.min(100, x));
export function soldeInitial(iso: string): Record<Bien, number> {
  const v = (k: string) => VAL[iso]?.valeurs[k]?.v, ind = IND[iso] ?? {};
  const pop = v("population") ?? ind.population ?? 1, pibHab = (ind.pib ?? 0) / (ind.population || 1), rentes = v("rentesNaturelles") ?? 0;
  const industriel = (pibHab > 20000 && rentes < 10) || ATELIERS_2000.includes(iso);
  const imp = v("importsEnergie"), cer = v("prodCereales"), met = v("exportsMetaux"), tr = SC[iso]?.scores["Terres rares"] ?? 0;
  // énergie : importations nettes en % de la consommation (20 % → −25 ; exportateur net à 30 % → +25)
  const energie = imp === undefined ? 0 : c100(imp > 0 ? -imp * 1.25 : -imp * 0.83);
  // alimentation : céréales par habitant (200 kg → −25, 400 kg → +25)
  const alimentation = cer === undefined ? 0 : c100((cer * 1000 / pop - 300) / 4);
  // métaux : part des exportations (10 % → +25) ; un pays industriel qui en exporte peu en manque
  const metaux = met === undefined ? 0 : industriel && met < 3 ? -25 - (3 - met) * 5 : c100(Math.max(0, (met - 5) * 5));
  // terres rares : score de production (la Chine assure l'essentiel en 2000) ; les industriels sans gisement en manquent
  const terres = tr >= 10 ? c100(25 + (tr - 10) * 0.8) : industriel && tr < 5 ? -30 : tr * 2;
  // produits industriels : grands exportateurs (+) ; pays pauvres importateurs (−)
  const industrie = industriel ? c100(25 + Math.max(0, (pibHab - 20000) / 1000) + (ATELIERS_2000.includes(iso) ? 15 : 0)) : pibHab < 8000 ? c100(-25 - (8000 - pibHab) / 400) : 0;
  return { energie, alimentation, metaux, terres, industrie };
}

// ---------- Tendances crédibles (estimation, d'après les grandes évolutions connues ; le jeu peut ensuite diverger) ----------
export interface Tendance { iso: string; bien: Bien; de: number; a: number; pas: number; pourquoi: string }
export const TENDANCES: Tendance[] = [
  { iso: "USA", bien: "energie", de: 2007, a: 2019, pas: 5, pourquoi: "pétrole et gaz de schiste" },
  { iso: "CHN", bien: "energie", de: 2000, a: 2022, pas: -2, pourquoi: "demande industrielle" },
  { iso: "IND", bien: "energie", de: 2000, a: 2035, pas: -2, pourquoi: "demande croissante" },
  { iso: "BRA", bien: "energie", de: 2006, a: 2020, pas: 2, pourquoi: "pétrole en eaux profondes" },
  { iso: "CAN", bien: "energie", de: 2000, a: 2020, pas: 1.5, pourquoi: "sables bitumineux" },
  { iso: "GBR", bien: "energie", de: 2000, a: 2012, pas: -5, pourquoi: "déclin de la mer du Nord" },
  { iso: "IDN", bien: "energie", de: 2000, a: 2012, pas: -4, pourquoi: "déclin pétrolier" },
  { iso: "EGY", bien: "energie", de: 2005, a: 2015, pas: -3, pourquoi: "demande intérieure" },
  { iso: "MEX", bien: "energie", de: 2005, a: 2020, pas: -3, pourquoi: "déclin de Cantarell" },
  { iso: "QAT", bien: "energie", de: 2000, a: 2012, pas: 1, pourquoi: "gaz naturel liquéfié" },
  { iso: "AUS", bien: "terres", de: 2011, a: 2022, pas: 5, pourquoi: "nouvelles mines" },
  { iso: "MMR", bien: "terres", de: 2014, a: 2022, pas: 5, pourquoi: "mines du Kachin" },
  { iso: "USA", bien: "terres", de: 2018, a: 2026, pas: 3, pourquoi: "réouverture de mines" },
  { iso: "VNM", bien: "terres", de: 2015, a: 2030, pas: 2, pourquoi: "gisements exploités" },
  { iso: "CHN", bien: "alimentation", de: 2000, a: 2020, pas: -1.5, pourquoi: "hausse de la consommation" },
  { iso: "RUS", bien: "alimentation", de: 2005, a: 2020, pas: 3, pourquoi: "essor du blé" },
  { iso: "UKR", bien: "alimentation", de: 2005, a: 2020, pas: 2, pourquoi: "essor des céréales" },
  { iso: "CHN", bien: "metaux", de: 2000, a: 2015, pas: -3, pourquoi: "besoins de l'industrie" },
  { iso: "COD", bien: "metaux", de: 2008, a: 2025, pas: 2, pourquoi: "cobalt et cuivre" },
  { iso: "IDN", bien: "metaux", de: 2014, a: 2025, pas: 3, pourquoi: "nickel" },
  { iso: "VNM", bien: "industrie", de: 2005, a: 2025, pas: 3, pourquoi: "usines d'exportation" },
  { iso: "IND", bien: "industrie", de: 2005, a: 2035, pas: 2, pourquoi: "industrialisation" },
  { iso: "POL", bien: "industrie", de: 2004, a: 2020, pas: 2, pourquoi: "entrée dans l'UE" },
  { iso: "BGD", bien: "industrie", de: 2005, a: 2025, pas: 2, pourquoi: "textile" },
  { iso: "TUR", bien: "industrie", de: 2002, a: 2020, pas: 1.5, pourquoi: "industrialisation" },
];
export const EVOLUTION = { demande: 0.3, derive: 1, epuisement: 0.3, decouverte: 0.25, gainDecouverte: 20 }; // estimation

export interface Coupure { fournisseur: string; bien: Bien; camp: Camp; annee: number; source: "evenement" | "carte" }
export interface EtatRessources { soldes: Record<string, Record<Bien, number>>; pibPrec: Record<string, number>; coupures: Coupure[]; annonces: { titre: string; texte: string; pays: string }[] }
export function initialiser(e: EtatV2) {
  e.res = { soldes: Object.fromEntries(Object.keys(e.pays).map(i => [i, soldeInitial(i)])), pibPrec: Object.fromEntries(Object.values(e.pays).map(p => [p.iso, p.pib])), coupures: [], annonces: [] };
}
const R = (e: EtatV2) => { if (!e.res) initialiser(e); return e.res!; };
export const solde = (e: EtatV2, iso: string, b: Bien) => R(e).soldes[iso]?.[b] ?? 0;

export type Role = "offre" | "besoin" | "neutre";
export function role(e: EtatV2, iso: string, b: Bien): Role { const s = solde(e, iso, b); return s >= SEUIL ? "offre" : s <= -SEUIL ? "besoin" : "neutre"; }
export const coupe = (e: EtatV2, iso: string, b: Bien, c: Camp) => R(e).coupures.some(x => x.annee === e.annee && x.fournisseur === iso && x.bien === b && x.camp === c);

// Ouverture commerciale d'un pays envers un camp (0-1) : Sanctions 0, Neutre 0,5, Entraide 1. On commerce aussi avec un rival.
export const ouverture = (e: EtatV2, iso: string, c: Camp) => (iso === LEADER[c] ? 1 : Math.max(0, Math.min(1, 0.5 + e.pays[iso].eco[c] / 200)));
// Bilan d'un camp : volume offert et demandé par les pays qui commercent avec lui, pondérés par leur poids, leur ouverture et la force du solde.
export function bilan(e: EtatV2, c: Camp, b: Bien) {
  let offre = 0, besoin = 0;
  for (const p of Object.values(e.pays)) {
    const s = solde(e, p.iso, b), w = p.poids * ouverture(e, p.iso, c) * Math.abs(s) / 100;
    if (s >= SEUIL && !coupe(e, p.iso, b, c)) offre += w; else if (s <= -SEUIL) besoin += w;
  }
  return { offre, besoin, manque: besoin > offre, couverture: besoin > 0 ? Math.min(1, offre / besoin) : 1, debouche: offre > 0 ? Math.min(1, besoin / offre) : 1 };
}

export type Lecture = "fournisseur_ami" | "fournisseur" | "demandeur_ami" | "demandeur" | "neutre";
export function lecture(e: EtatV2, c: Camp, iso: string, b: Bien): Lecture {
  const r = role(e, iso, b); if (r === "neutre") return "neutre";
  const ami = partPays(e.pays[iso], c) >= 0.4; // 0,4 = début de Coopération
  return r === "offre" ? (ami ? "fournisseur_ami" : "fournisseur") : ami ? "demandeur_ami" : "demandeur";
}

// ---------- Effet sur le PIB (chaque année, après l'économie) ----------
// Un pays en manque gagne s'il est bien approvisionné par les camps dont il est proche, perd sinon ; un exportateur
// gagne s'il trouve des débouchés. Au plus ±0,3 % (manque) et ±0,2 % (export) par bien et par an (estimation).
export const EFFET_RES = { besoin: 0.6, offre: 0.4 };
export function effetPib(e: EtatV2, iso: string, b0?: Record<Bien, Record<Camp, ReturnType<typeof bilan>>>): number {
  const p = e.pays[iso];
  if (!b0) { b0 = {} as any; for (const { id } of BIENS) b0![id] = { OCC: bilan(e, "OCC", id), CHN: bilan(e, "CHN", id) }; }
  const po = ouverture(e, iso, "OCC"), pc = ouverture(e, iso, "CHN"), t = po + pc, wo = t > 0 ? po / t : 0.5, wc = 1 - wo;
  let pct = 0;
  for (const { id } of BIENS) {
    const r = role(e, iso, id);
    if (r === "besoin") {
      const acces = (c: Camp) => b0![id][c].couverture * (R(e).coupures.some(x => x.annee === e.annee && x.bien === id && x.camp === c) ? 0.5 + 0.5 * MN.amortisseur(e, c) : 1); // les réserves amortissent la coupure
      pct += EFFET_RES.besoin * ((wo * acces("OCC") + wc * acces("CHN")) - 0.5);
    } else if (r === "offre") {
      const deb = (c: Camp) => (coupe(e, iso, id, c) ? 0 : b0![id][c].debouche);
      pct += EFFET_RES.offre * ((wo * deb("OCC") + wc * deb("CHN")) - 0.5);
    }
  }
  return pct;
}
export function appliquer(e: EtatV2) {
  const b0 = {} as Record<Bien, Record<Camp, ReturnType<typeof bilan>>>;
  for (const { id } of BIENS) b0[id] = { OCC: bilan(e, "OCC", id), CHN: bilan(e, "CHN", id) };
  // Effet centré sur la moyenne mondiale : les ressources redistribuent la croissance, elles n'en créent pas.
  const l = Object.values(e.pays), x = Object.fromEntries(l.map(p => [p.iso, effetPib(e, p.iso, b0)]));
  const moy = l.reduce((s, p) => s + x[p.iso] * p.poids, 0) / (l.reduce((s, p) => s + p.poids, 0) || 1);
  for (const p of l) p.pib *= 1 + (x[p.iso] - moy) / 100;
}

// ---------- Chantage : un fournisseur hostile coupe le robinet à un camp qui en manque ----------
export const CHANTAGE = { proba: 0.2, parTension: 0.02, attitude: -4, tension: 0.3 }; // estimation
const CRITIQUES: Bien[] = ["energie", "terres", "alimentation", "metaux"];
function couper(e: EtatV2, fournisseur: string, b: Bien, c: Camp, source: Coupure["source"]) {
  R(e).coupures.push({ fournisseur, bien: b, camp: c, annee: e.annee, source });
  const p = e.pays[fournisseur];
  p.att[c] = borne(p.att[c] + CHANTAGE.attitude); e.tension = borne(e.tension + CHANTAGE.tension, 0, 10);
}
export function evenementsChantage(e: EtatV2) {
  const ev: { id: string; trimestre: number; titre: string; texte: string; pays: string; resume: string }[] = [];
  for (const c of ["OCC", "CHN"] as Camp[]) {
    if (tirer(e) >= CHANTAGE.proba + CHANTAGE.parTension * e.tension) continue;
    const cands = CRITIQUES.filter(b => bilan(e, c, b).manque).flatMap(b => Object.values(e.pays)
      .filter(p => p.iso !== LEADER[c] && role(e, p.iso, b) === "offre" && niveau(p.att[c]) <= 2 && !coupe(e, p.iso, b, c))
      .map(p => ({ p, b, w: p.poids * solde(e, p.iso, b) })));
    if (!cands.length) continue;
    cands.sort((x, y) => y.w - x.w);
    const { p, b } = cands[Math.floor(tirer(e) * Math.min(3, cands.length))];
    couper(e, p.iso, b, c, "evenement");
    ev.push({ id: `chantage_${b}`, trimestre: 1 + Math.floor(tirer(e) * 4), titre: `${p.nom} coupe ses livraisons ${nomBien(b).de} ${c === "OCC" ? "à l'Occident" : "aux BRICS"}`,
      texte: `Pour peser sur ${NOM_CAMP[c]}, ${p.nom} suspend pendant un an ses exportations ${nomBien(b).de} vers les pays de ce camp.`, pays: p.iso,
      resume: `${NOM_CAMP[c]} : approvisionnement ${nomBien(b).de} réduit cette année · attitude de ${p.nom} ${CHANTAGE.attitude} · tension +${CHANTAGE.tension}` });
  }
  for (const a of R(e).annonces.splice(0)) ev.push({ id: "decouverte", trimestre: 1, titre: a.titre, texte: a.texte, pays: a.pays, resume: "Nouveau fournisseur possible (voir la vue Ressources)" });
  return ev;
}
// Coupure imposée par un événement (fournisseur nommé) : s'applique si le pays exporte encore ce bien.
export function couperPar(e: EtatV2, fournisseur: string, b: Bien, c: Camp): Ligne[] {
  if (!e.pays[fournisseur] || role(e, fournisseur, b) !== "offre" || coupe(e, fournisseur, b, c)) return [];
  couper(e, fournisseur, b, c, "evenement");
  return [{ texte: `${e.pays[fournisseur].nom} coupe ses livraisons ${nomBien(b).de} à ${NOM_CAMP[c]} pour un an`, camp: c, pays: fournisseur, signe: -1 }];
}
// Carte de chantage : le camp qui la joue fait couper un bien par son meilleur fournisseur proche, au détriment de l'autre camp.
export function chantageCarte(e: EtatV2, campJ: Camp, b: Bien): Ligne[] {
  const cible = autre(campJ);
  const f = Object.values(e.pays).filter(p => role(e, p.iso, b) === "offre" && partPays(p, campJ) >= 0.7 && !coupe(e, p.iso, b, cible))
    .sort((x, y) => y.poids * solde(e, y.iso, b) - x.poids * solde(e, x.iso, b))[0];
  if (!f) return [{ texte: `Aucun fournisseur ${nomBien(b).de} assez proche de ${NOM_CAMP[campJ]} : pas de coupure` }];
  couper(e, f.iso, b, cible, "carte");
  return [{ texte: `${f.nom} coupe ses livraisons ${nomBien(b).de} à ${NOM_CAMP[cible]} pour un an`, camp: campJ, pays: f.iso, signe: 1 }];
}

// Cartes de chantage (2 par camp), inspirées de pratiques réelles (embargo céréalier, contrôle des exportations, quotas, coupures de gaz).
const carteChantage = (id: string, camp: Camp, titre: string, texte: string, bien: Bien): Carte =>
  ({ id, camp, ere: 1, titre, texte, valeur: 3, type: "reutilisable", modes: [{ nom: titre, cout: {}, effets: [{ type: "coupure", bien } as any] }] });
export const CARTES_CHANTAGE: Carte[] = [
  carteChantage("res_embargo_cereales", "OCC", "Embargo céréalier", "Les grands exportateurs de céréales proches de l'Occident suspendent leurs ventes aux BRICS pendant un an.", "alimentation"),
  carteChantage("res_controle_technologies", "OCC", "Contrôle des exportations de technologies", "Machines-outils et composants avancés ne sont plus vendus aux pays des BRICS pendant un an.", "industrie"),
  carteChantage("res_quotas_terres_rares", "CHN", "Quotas sur les terres rares", "Le premier producteur de terres rares réduit ses exportations vers l'Occident pendant un an.", "terres"),
  carteChantage("res_guerre_gaz", "CHN", "Guerre du gaz", "Un grand fournisseur proche des BRICS ferme ses gazoducs vers l'Occident pendant un an.", "energie"),
];

// ---------- Évolution annuelle des soldes (en fin d'année) ----------
// Variation imposée d'un solde (événement : sécheresse, gisement, sanctions…).
export function ajusterSolde(e: EtatV2, iso: string, b: Bien, v: number) { const s = R(e).soldes[iso]; if (s) s[b] = c100(s[b] + v); }
export function evoluer(e: EtatV2) {
  const r = R(e), l = Object.values(e.pays);
  const crois = (iso: string) => (e.pays[iso].pib / (r.pibPrec[iso] || e.pays[iso].pib) - 1) * 100;
  const tot = l.reduce((s, p) => s + p.poids, 0) || 1, moy = l.reduce((s, p) => s + crois(p.iso) * p.poids, 0) / tot;
  for (const p of l) {
    const s = r.soldes[p.iso], g = Math.max(-10, Math.min(10, crois(p.iso) - moy));
    for (const { id } of BIENS) {
      let d = EVOLUTION.derive * (tirer(e) * 2 - 1);
      if (id === "energie" || id === "metaux") d -= EVOLUTION.demande * g; // croissance plus rapide que le monde = besoins en hausse
      if (id === "industrie") d += EVOLUTION.demande * g;                  // … et industrie qui monte
      if ((id === "energie" || id === "metaux") && s[id] > 50) d -= EVOLUTION.epuisement; // gisements mûrs
      s[id] = c100(s[id] + d);
    }
    r.pibPrec[p.iso] = p.pib;
  }
  for (const t of TENDANCES) if (e.annee >= t.de && e.annee < t.a && r.soldes[t.iso]) r.soldes[t.iso][t.bien] = c100(r.soldes[t.iso][t.bien] + t.pas);
  if (tirer(e) < EVOLUTION.decouverte) { // découverte d'un gisement, annoncée l'année suivante
    const b: Bien = (["energie", "metaux", "terres"] as Bien[])[Math.floor(tirer(e) * 3)];
    const c = l.filter(p => r.soldes[p.iso][b] < SEUIL);
    const p = c[Math.floor(tirer(e) * c.length)];
    if (p) { r.soldes[p.iso][b] = c100(r.soldes[p.iso][b] + EVOLUTION.gainDecouverte);
      r.annonces.push({ titre: `Découverte d'un gisement ${nomBien(b).de} : ${p.nom}`, texte: `Les premières estimations font de ${p.nom} un fournisseur ${nomBien(b).de} à surveiller.`, pays: p.iso }); }
  }
  r.coupures = r.coupures.filter(x => x.annee > e.annee); // une coupure dure l'année où elle tombe
}
// Score « ressources » d'un pays (poids) : score 2000 corrigé par l'évolution de ses soldes positifs.
export function facteurRessources(e: EtatV2, iso: string) {
  const s0 = soldeInitial(iso), s = R(e).soldes[iso]; let d = 0;
  for (const b of ["energie", "alimentation", "metaux", "terres"] as Bien[]) d += Math.max(0, s[b]) - Math.max(0, s0[b]);
  return Math.max(0.2, 1 + d / 200);
}
