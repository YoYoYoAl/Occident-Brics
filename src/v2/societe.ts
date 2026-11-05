// Caractéristiques de chaque pays et leurs interactions (demandes du 2-3 novembre 2026) :
// éducation, santé, technologie, infrastructures, énergie bas-carbone, qualité de l'air, de l'eau et de la terre, culture, gestion publique ;
// climat mondial (émissions, réchauffement) ; migrations. Chaque caractéristique a sa TENDANCE propre (rattrapage vers ce que permet
// la richesse du pays) PLUS des effets d'interaction modérés et plafonnés par an (règle « pas de sur-interaction »).
// Départ : scores réels 2000 (src/data/scores2000.json, 0-100, formule sur données Banque mondiale et corrections documentées) ;
// technologie et part bas-carbone : estimation. Tous les coefficients : estimation, ordres de grandeur réalistes.
import scores from "../data/scores2000.json";
import donnees from "../data/pays2000.json";
import type { EtatV2, Camp, EvenementAnnee, PaysV2 } from "./moteur";
import * as M from "./moteur";
import * as RS from "./ressources";
import * as CR from "./crises";
import { EXPOSITION } from "../data/geographie";
import voisins from "../data/voisins.json";
import attributs from "../data/attributs2000.json";

export interface Carac { educ: number; sante: number; tech: number; infra: number; propre: number; air: number; eau: number; terre: number; culture: number; gestion: number; agri: number }
export type CleCarac = keyof Carac;
export const CARACS: { id: CleCarac; nom: string; aide: string }[] = [
  { id: "educ", nom: "Éducation", aide: "Scolarisation et années d'études. Fait progresser la santé et la technologie, baisse la pollution, soutient la croissance." },
  { id: "sante", nom: "Santé", aide: "Espérance de vie, soins. Fait croître la population ; la pollution la dégrade." },
  { id: "tech", nom: "Technologie", aide: "Recherche, numérique. Baisse l'intensité en énergie et en ressources, soutient la croissance." },
  { id: "infra", nom: "Infrastructures", aide: "Routes, réseaux, électricité. Augmente la production et la consommation d'énergie ; soutient la santé, la population, le PIB et l'armée." },
  { id: "propre", nom: "Énergie bas-carbone", aide: "Part du nucléaire, de l'hydraulique, de l'éolien et du solaire. Baisse les émissions et la pollution de l'air, et la dépendance aux importations." },
  { id: "air", nom: "Qualité de l'air", aide: "Dégradée par l'énergie fossile, l'industrie et l'urbanisation ; améliorée par la technologie et l'éducation." },
  { id: "eau", nom: "Qualité de l'eau", aide: "Dégradée par l'agriculture (engrais, irrigation), l'industrie et les mines." },
  { id: "terre", nom: "Qualité des sols et forêts", aide: "Dégradée par l'agriculture intensive, la déforestation et les mines ; elle conditionne les récoltes." },
  { id: "culture", nom: "Rayonnement culturel", aide: "Universités, médias, cinéma, diaspora. Renforce les opérations d'influence du camp." },
  { id: "gestion", nom: "Gestion publique", aide: "Efficacité de l'État, corruption. Soutient l'éducation et la croissance." },
  { id: "agri", nom: "Agriculture", aide: "Poids de la production agricole : nourrit le pays mais pèse sur l'eau, la terre et les émissions." },
];

// ---------- Départ 2000 ----------
const SC = (scores as any).pays as Record<string, { scores: Record<string, number> }>;
const IND = Object.fromEntries((donnees as any).pays.map((p: any) => [p.iso3, p.indicateurs])) as Record<string, Record<string, number>>;
// Part bas-carbone de l'énergie primaire en 2000 (nucléaire, hydraulique, éolien, solaire, biocarburants modernes) : ESTIMATION.
export const PROPRE_2000: Record<string, number> = { FRA: 45, SWE: 55, CHE: 50, NOR: 60, ISL: 75, BRA: 40, CAN: 25, FIN: 35, BEL: 22, JPN: 15, KOR: 14, DEU: 12, ESP: 14, USA: 12, GBR: 10, RUS: 8,
  CHN: 7, IND: 4, AUT: 25, NZL: 30, PRY: 80, COL: 15, VEN: 10, ARG: 12, CHL: 18, PRT: 15, ITA: 8, UKR: 18, CZE: 15, SVK: 25, HUN: 15, BGR: 20, LTU: 30, SVN: 25, MEX: 7, ZAF: 4, TWN: 12,
  PER: 15, ECU: 12, URY: 30, CRI: 45, GEO: 30, KGZ: 35, TJK: 50, LAO: 30, NPL: 10, ETH: 8, ZMB: 40, MOZ: 30, COD: 15, GHA: 15, EGY: 5, PAK: 12, VNM: 15, ARM: 30, CUB: 3 };
const s = (iso: string, k: string) => SC[iso]?.scores[k] ?? 40;
export function caracDepart(iso: string): Carac {
  return { educ: s(iso, "Éducation"), sante: s(iso, "Santé"), infra: s(iso, "Infrastructure"), culture: s(iso, "Culture"), gestion: s(iso, "Gestion"),
    air: s(iso, "Air"), eau: s(iso, "Eau"), terre: s(iso, "Terre"), agri: s(iso, "Agriculture"),
    tech: Math.round(0.45 * s(iso, "Éducation") + 0.3 * s(iso, "Infrastructure") + 0.25 * s(iso, "Cyber")), propre: PROPRE_2000[iso] ?? 8 };
}

// ---------- Réglages ----------
// Chaque système peut être coupé (tests « séparément et conjointement »).
export const SYSTEMES = { societe: true, climat: true, migrations: true };
export const SOC = {
  rattrapage: 0.04,            // part de l'écart à la cible comblée chaque année (tendance propre)
  plafond: 2.5,                // variation maximale d'une caractéristique par an (points sur 100)
  guerre: 2,                   // un pays en guerre perd jusqu'à 2 points d'infrastructures, de santé et d'éducation par an
  progresTech: 0.3,            // diffusion mondiale du progrès technique (points par an)
  progresPropre: 0.15,         // diffusion du bas-carbone (points par an), + 0,3 % de la technologie
  pollution: 25,               // une pression doublée fait perdre environ 17 points de qualité à terme (25 × ln 2)
  // Effets sur le PIB, la population, l'armée : comptés depuis 2000 (la tendance de fond intègre la situation de départ), plafonnés.
  pib: { educ: 0.015, infra: 0.02, tech: 0.012, sante: 0.01, max: 1 },     // points de croissance par point d'écart à 2000 ; ±1 point par an au plus
  pop: { sante: 0.01, max: 0.3 },                                         // % de croissance démographique par point de santé gagné ; ±0,3 %/an
  mil: 0.01,                                                               // armée : +0,01 par point d'infrastructures gagné dans l'année
  besoins: { pop: 0.8, mil: 0.15, infra: 0.15, tech: 0.2, educ: 0.1, propre: 0.25, max: 2 }, // énergie : variation du solde par an (points sur ±100)
  ecoRessources: { terre: 0.04, eau: 0.03, climat: 1, max: 1.5 },        // écologie → récoltes : solde alimentaire par an
  stabPollution: 0.15,         // air sous 25 : −0,15 de stabilité par point sous 25 et par an (plafond −1,5)
};
// tcre : 0,45 °C par 1000 Gt de CO2 (GIEC AR6) + environ 20 % pour le méthane et les autres gaz ; efficacite : baisse de l'intensité carbone
// mondiale hors part bas-carbone (≈ 2 %/an observé 2000-2020, dont la part bas-carbone suivie à part) : estimation.
export const CLIMAT = { ecart2000: 0.8, tcre: 0.55 / 1000, efficacite: 0.015, seuilEffets: 1.2, pibMonde: 0.05, pibExposes: 0.1, defaite: 3, transition: { propre: 2.5, air: 1.5, coutPib: 0.15, attitude: 1.5 } };
export const MIGR = { taux: 0.004, max: 0.008, guerre: 0.8, seuilStab: 35, destinations: 12, pibTravail: 0.5, stabAccueil: 0.6, stabMax: 1.5, pibDepart: 0.2 };

// ---------- État ----------
export interface EtatClimat { co2Cumule: number; ecart: number; emissions: number; emis2000: number }
export interface Flux { de: string; vers: string; part: number } // part de la population d'origine
const r100 = (x: number) => Math.max(0, Math.min(100, x));
const plafonne = (x: number, m: number) => Math.max(-m, Math.min(m, x));
export const richesse = (p: PaysV2) => r100(30 * Math.log10(Math.max(300, p.pib / Math.max(1, p.population)) / 300));
export function initialiser(e: EtatV2) {
  e.pibDepart = Object.fromEntries(Object.values(e.pays).map(p => [p.iso, p.pib])); e.popDepart = Object.fromEntries(Object.values(e.pays).map(p => [p.iso, p.population]));
  e.soc = Object.fromEntries(Object.keys(e.pays).map(i => [i, caracDepart(i)]));
  e.socDepart = JSON.parse(JSON.stringify(e.soc));
  const emis = Object.keys(e.pays).reduce((t, i) => t + (IND[i]?.co2 ?? 0), 0);
  e.climat = { co2Cumule: 0, ecart: CLIMAT.ecart2000, emissions: emis, emis2000: emis };
  e.pression0 = Object.fromEntries(Object.values(e.pays).map(p => [p.iso, pressions(e, p)]));
  e.migrations = [];
}
const S = (e: EtatV2) => { if (!e.soc) initialiser(e); return e.soc!; };
export const carac = (e: EtatV2, iso: string): Carac => S(e)[iso] ?? caracDepart(iso);
const depart = (e: EtatV2, iso: string): Carac => e.socDepart?.[iso] ?? caracDepart(iso);

// Pressions sur l'environnement (sans unité, comparées à celles de 2000) : énergie fossile (richesse × part fossile × intensité),
// agriculture, extraction (mines et hydrocarbures). L'éducation et la technologie baissent l'intensité.
export function pressions(e: EtatV2, p: PaysV2) {
  const c = carac(e, p.iso), R = 10 + richesse(p), intens = 1 - 0.4 * c.tech / 100 - 0.1 * c.educ / 100;
  const extraction = Math.max(0, RS.solde(e, p.iso, "energie")) + Math.max(0, RS.solde(e, p.iso, "metaux")) * 0.7;
  return { fossile: R * (1 - c.propre / 100) * intens, agri: 10 + c.agri * intens, extraction: 10 + extraction * intens };
}

// ---------- Évolution annuelle (fin d'année) ----------
export function evoluer(e: EtatV2): EvenementAnnee[] {
  const ev: EvenementAnnee[] = [];
  if (SYSTEMES.societe) societeAnnee(e);
  if (SYSTEMES.climat) ev.push(...climatAnnee(e));
  if (SYSTEMES.migrations) ev.push(...migrationsAnnee(e));
  return ev;
}
function societeAnnee(e: EtatV2) {
  const k = SOC, x = (v: number) => plafonne(v, k.plafond);
  for (const p of Object.values(e.pays)) {
    const c = carac(e, p.iso), d = depart(e, p.iso), R = richesse(p), g = guerre(e, p.iso) ? 1 : 0, stab = p.stabilite;
    const avant = { ...c };
    // Tendances propres : rattrapage vers la valeur de 2000 corrigée de ce qui a changé depuis (richesse, autres caractéristiques).
    // Formulation relative : un pays ne « saute » pas vers une formule au premier tour, il suit l'évolution de ses moteurs.
    const R0 = richesse0(e, p), vers = (cur: number, v0: number, f: number, f0: number) => k.rattrapage * (v0 + f - f0 - cur);
    c.infra = r100(c.infra + x(vers(c.infra, d.infra, 0.8 * R, 0.8 * R0) + 0.02 * (stab - 50) / 5 - k.guerre * g));
    c.educ = r100(c.educ + x(vers(c.educ, d.educ, 0.5 * R + 0.3 * c.infra + 0.2 * c.gestion, 0.5 * R0 + 0.3 * d.infra + 0.2 * d.gestion) + 0.1 - 0.5 * k.guerre * g));
    c.tech = r100(c.tech + x(vers(c.tech, d.tech, 0.5 * c.educ + 0.3 * c.infra + 0.2 * R, 0.5 * d.educ + 0.3 * d.infra + 0.2 * R0) + k.progresTech));
    c.gestion = r100(c.gestion + x(0.02 * (stab - c.gestion) + 0.01 * (c.educ - c.gestion)));
    c.propre = r100(c.propre + x(k.progresPropre + 0.003 * c.tech + transitionAnnee(e, p.iso)));
    c.agri = r100(c.agri + x(0.02 * (d.agri * (0.8 + 0.2 * c.terre / Math.max(1, d.terre)) - c.agri))); // des sols dégradés font reculer l'agriculture
    // Pollution locale : la qualité converge vers sa valeur de 2000, corrigée de l'évolution des pressions (ln du rapport).
    const pr = pressions(e, p), p0 = e.pression0?.[p.iso] ?? pr, ln = (a: number, b: number) => Math.log(Math.max(0.3, Math.min(3, a / Math.max(1e-6, b))));
    const prime = 0.1 * (c.educ - d.educ); // l'éducation rend plus exigeant sur l'environnement
    c.air = r100(c.air + x(0.1 * (d.air - k.pollution * ln(pr.fossile, p0.fossile) + prime + CLIMAT.transition.air * transitionAnnee(e, p.iso) - c.air)));
    c.eau = r100(c.eau + x(0.1 * (d.eau - k.pollution * (0.6 * ln(pr.agri, p0.agri) + 0.4 * ln(pr.extraction, p0.extraction)) + prime - c.eau)));
    c.terre = r100(c.terre + x(0.1 * (d.terre - k.pollution * (0.5 * ln(pr.agri, p0.agri) + 0.5 * ln(pr.extraction, p0.extraction)) + prime - c.terre)));
    const fS = (r: number, q: Carac) => 0.35 * r + 0.25 * q.infra + 0.2 * q.educ + 0.2 * (q.air + q.eau) / 2;
    c.sante = r100(c.sante + x(vers(c.sante, d.sante, fS(R, c), fS(R0, d)) + 0.1 - k.guerre * g)); // +0,1/an : progrès médical diffus
    // Interactions vers les autres données (variations de l'année, plafonnées).
    // Variations depuis la fin de l'an dernier (y compris celles venues d'ailleurs : Banque mondiale, OMS, guerre...).
    const pr0 = e.socPrec?.[p.iso] ?? avant;
    p.militaire = Math.max(0, Math.min(100, p.militaire + k.mil * (c.infra - pr0.infra) * 10));
    const b = k.besoins, dPop = (e.popDebutAnnee?.[p.iso] ? (p.population / e.popDebutAnnee[p.iso] - 1) * 100 : 0);
    const besoins = plafonne(-b.pop * dPop - b.mil * Math.max(0, p.militaire - (e.milDebutAnnee?.[p.iso] ?? p.militaire)) - b.infra * (c.infra - pr0.infra)
      + b.tech * (c.tech - pr0.tech) + b.educ * (c.educ - pr0.educ) + b.propre * (c.propre - pr0.propre), b.max);
    RS.ajusterSolde(e, p.iso, "energie", besoins);
    if (RS.solde(e, p.iso, "energie") > 0) RS.ajusterSolde(e, p.iso, "energie", 0.1 * (c.infra - pr0.infra)); // les infrastructures font aussi produire (raffineries, réseaux)
    const eco = k.ecoRessources, exposes = EXPOSITION.secheresse.includes(p.iso) ? 1 : 0.4;
    RS.ajusterSolde(e, p.iso, "alimentation", plafonne(eco.terre * (c.terre - avant.terre) * 10 + eco.eau * (c.eau - avant.eau) * 10 - (SYSTEMES.climat ? eco.climat * exposes * Math.max(0, (e.climat?.ecart ?? 0.8) - CLIMAT.seuilEffets) * 0.1 : 0), eco.max));
    if (c.air < 25) p.stabilite = M.borne(p.stabilite - Math.min(1.5, k.stabPollution * (25 - c.air) / 10), 0, 100);
  }
  e.socPrec = JSON.parse(JSON.stringify(e.soc));
  e.popDebutAnnee = Object.fromEntries(Object.values(e.pays).map(p => [p.iso, p.population]));
  e.milDebutAnnee = Object.fromEntries(Object.values(e.pays).map(p => [p.iso, p.militaire]));
}
const richesse0 = (e: EtatV2, p: PaysV2) => { const pib0 = e.pibDepart?.[p.iso], pop0 = e.popDepart?.[p.iso]; return pib0 && pop0 ? r100(30 * Math.log10(Math.max(300, pib0 / pop0) / 300)) : richesse(p); };
const guerre = (e: EtatV2, iso: string) => CR.enGuerre(e, iso);
// Opération « Transition climatique » de l'année (points × part de l'effet), lue par la société.
const transitionAnnee = (e: EtatV2, iso: string) => e.transitions?.[iso] ?? 0;

// Bonus de croissance (en points) et de population (en %) depuis 2000, lus par evolution.ts.
// Comptés RELATIVEMENT à la moyenne mondiale (pondérée par la population) : la tendance de fond intègre déjà le progrès moyen,
// seul l'écart d'un pays à ce progrès moyen accélère ou freine sa croissance (pas de double comptage).
function moyDelta(e: EtatV2): Carac { // recalculé à chaque appel (pas de cache : une partie reprise d'une sauvegarde doit rejouer à l'identique)
  const m: any = { educ: 0, sante: 0, tech: 0, infra: 0 }; let t = 0;
  for (const p of Object.values(e.pays)) { const a = carac(e, p.iso), d = depart(e, p.iso), w = p.population; t += w; for (const k of Object.keys(m)) m[k] += w * ((a as any)[k] - (d as any)[k]); }
  for (const k of Object.keys(m)) m[k] /= t || 1;
  return m;
}
export function bonusPib(e: EtatV2, iso: string): number {
  if (!SYSTEMES.societe || !e.soc) return 0;
  const c = carac(e, iso), d = depart(e, iso), k = SOC.pib, m = moyDelta(e);
  return plafonne(k.educ * (c.educ - d.educ - m.educ) + k.infra * (c.infra - d.infra - m.infra) + k.tech * (c.tech - d.tech - m.tech) + k.sante * (c.sante - d.sante - m.sante), k.max)
    - (SYSTEMES.climat ? climatPib(e, iso) : 0);
}
export function bonusPop(e: EtatV2, iso: string): number {
  if (!SYSTEMES.societe || !e.soc) return 0;
  return plafonne(SOC.pop.sante * (carac(e, iso).sante - depart(e, iso).sante - moyDelta(e).sante), SOC.pop.max);
}
// Rayonnement culturel du leader et proximité religieuse : multiplicateur des opérations d'influence (0,85 à 1,15).
export function multCulture(e: EtatV2, c: Camp): number {
  if (!SYSTEMES.societe || !e.soc) return 1;
  return 0.85 + 0.3 * carac(e, M.LEADER[c]).culture / 100;
}

// Proximité religieuse (demande du 2-3 novembre 2026 : « les religions pour la culture ») : parts réelles des religions
// (src/data/attributs2000.json, Pew Research, année 2020 faute de série 2000 complète). Profil d'un camp = moyenne des profils de
// ses pays pondérée par population × alignement, recalculée chaque année : il évolue avec la sphère d'influence.
// Similarité = somme des minimums des parts (0 à 1). Multiplicateur d'influence : 0,9 + 0,2 × similarité (estimation).
const RELIGIONS = ["chretiens", "musulmans", "sansReligion", "hindous", "bouddhistes", "juifs", "autresReligions"] as const;
const VAL = (attributs as any).pays as Record<string, { valeurs: Record<string, { v: number }> }>;
export function profilReligion(iso: string): number[] {
  const v = VAL[iso]?.valeurs ?? {}, l = RELIGIONS.map(k => Math.max(0, v[k]?.v ?? 0)), t = l.reduce((a, b) => a + b, 0);
  return t > 0 ? l.map(x => x / t) : RELIGIONS.map(() => 1 / RELIGIONS.length);
}
export function profilCamp(e: EtatV2, c: Camp): number[] { // sans cache (même raison que moyDelta)
  const p = {} as Record<Camp, number[]>;
  for (const k of [c]) { const acc = RELIGIONS.map(() => 0); let t = 0;
    for (const q of Object.values(e.pays)) { const w = q.population * M.partPays(q, k); if (w <= 0) continue; t += w; profilReligion(q.iso).forEach((x, i) => (acc[i] += w * x)); }
    p[k] = acc.map(x => x / (t || 1)); }
  return p[c];
}
export const similariteReligion = (e: EtatV2, c: Camp, iso: string) => { const a = profilReligion(iso), b = profilCamp(e, c); return a.reduce((s, x, i) => s + Math.min(x, b[i]), 0); };
export const multReligion = (e: EtatV2, c: Camp, iso: string) => (SYSTEMES.societe ? 0.9 + 0.2 * similariteReligion(e, c, iso) : 1);

// ---------- Climat mondial ----------
const IND_CO2 = (iso: string) => IND[iso]?.co2 ?? 0;
export function emissionsPays(e: EtatV2, p: PaysV2): number {
  const c = carac(e, p.iso), d = depart(e, p.iso), pib0 = e.pibDepart?.[p.iso] ?? p.pib;
  const fossile = (1 - c.propre / 100) / Math.max(0.05, 1 - d.propre / 100), intens = (1 - 0.4 * c.tech / 100) / Math.max(0.2, 1 - 0.4 * d.tech / 100);
  const agri = 0.1 * c.agri / Math.max(1, d.agri) + 0.9; // méthane agricole : environ 10 % du total (estimation)
  return IND_CO2(p.iso) * (p.pib / Math.max(1, pib0)) * fossile * intens * agri * Math.pow(1 - CLIMAT.efficacite, e.annee - 2000) * (e.co2Annee?.[p.iso] ?? 1);
}
function climatAnnee(e: EtatV2): EvenementAnnee[] {
  const k = e.climat!; const avant = k.ecart;
  k.emissions = Object.values(e.pays).reduce((t, p) => t + emissionsPays(e, p), 0); // Mt de CO2
  k.co2Cumule += k.emissions / 1000; k.ecart = CLIMAT.ecart2000 + CLIMAT.tcre * k.co2Cumule;
  const ev: EvenementAnnee[] = [];
  if (Math.floor(k.ecart * 10) > Math.floor(avant * 10) && k.ecart >= 1.3)
    ev.push({ id: `climat_${e.annee}`, trimestre: 4, titre: `Réchauffement : +${k.ecart.toFixed(1).replace(".", ",")} °C`, texte: `Les émissions mondiales atteignent ${Math.round(k.emissions / 1000)} milliards de tonnes de CO2 par an. Sécheresses, cyclones et récoltes perdues deviennent plus fréquents.${k.ecart >= CLIMAT.defaite - 0.3 ? " Le seuil de +3 °C approche : au-delà, le système international s'effondre." : ""}`, pays: [], resume: `+${k.ecart.toFixed(2).replace(".", ",")} °C depuis l'ère préindustrielle` });
  if (k.ecart >= CLIMAT.defaite && !e.defaite) e.defaite = { camp: "tous", raison: `catastrophe climatique (+${k.ecart.toFixed(2).replace(".", ",")} °C)` };
  e.transitions = {}; e.co2Annee = {};
  return ev;
}
// Effet « co2 » des cartes et des événements (COP, accord de Paris, Fukushima, Covid...), écrit pour l'ancien tour trimestriel :
// pourcent = variation des émissions, duree en trimestres. Durable (≥ 8 trimestres) → part bas-carbone déplacée d'autant
// (−2 % d'émissions = +2 % de la part fossile convertie) ; passager → émissions de l'année seulement (estimation).
export function effetCo2(e: EtatV2, pays: string[], pourcent: number, duree: number): { texte: string; signe: 1 | -1 }[] {
  if (!SYSTEMES.climat) return [];
  for (const iso of pays) {
    const c = e.soc?.[iso]; if (!c) continue;
    if (duree >= 8) c.propre = r100(c.propre - pourcent * (100 - c.propre) / 100);
    else (e.co2Annee ??= {})[iso] = (e.co2Annee[iso] ?? 1) * (1 + pourcent / 100);
  }
  const n = pays.length > 3 ? `${pays.length} pays` : pays.map(i => e.pays[i]?.nom ?? i).join(", ");
  return [{ texte: `Émissions ${n} ${pourcent > 0 ? "+" : ""}${String(pourcent).replace(".", ",")} %${duree >= 8 ? " (durable)" : " cette année"}`, signe: pourcent > 0 ? -1 : 1 }];
}
export function climatPib(e: EtatV2, iso: string): number {
  const t = Math.max(0, (e.climat?.ecart ?? 0.8) - CLIMAT.seuilEffets);
  const expose = EXPOSITION.secheresse.includes(iso) || EXPOSITION.cyclone.includes(iso);
  return t * (CLIMAT.pibMonde + (expose ? CLIMAT.pibExposes : 0));
}
// Multiplicateur de fréquence des catastrophes climatiques (lu par les événements génériques).
export const multiplicateurClimat = (e: EtatV2) => 1 + Math.max(0, (e.climat?.ecart ?? 0.8) - 1) * 0.5;

// ---------- Migrations ----------
const VOISINS = voisins as unknown as Record<string, string[]>;
export function migrationsAnnee(e: EtatV2): EvenementAnnee[] {
  const l = Object.values(e.pays), hab = (p: PaysV2) => p.pib / Math.max(1, p.population), flux: Flux[] = [], ev: EvenementAnnee[] = [];
  const accueil: Record<string, number> = {};
  const lourds = new Set(l.slice().sort((a, b) => b.poids - a.poids).slice(0, 40).map(p => p.iso));
  for (const o of l) {
    // Les trajectoires réelles de population incluent déjà les migrations « normales » : seul le SURCROÎT par rapport à la situation
    // de 2000 (stabilité plus basse qu'au départ, guerre, climat) crée des flux en plus.
    const s0 = e.stabiliteDepart?.[o.iso] ?? o.stabilite, crise = (s: number) => Math.max(0, (MIGR.seuilStab - s) / MIGR.seuilStab);
    const pousse = crise(o.stabilite) - crise(s0) + (guerre(e, o.iso) ? MIGR.guerre : 0) + (SYSTEMES.climat && EXPOSITION.secheresse.includes(o.iso) ? Math.max(0, (e.climat?.ecart ?? 0.8) - 1.5) * 0.3 : 0);
    if (pousse <= 0) continue;
    const part = Math.min(MIGR.max, MIGR.taux * pousse); // part de la population qui part cette année
    const dest = l.filter(d => d.iso !== o.iso && d.stabilite >= 55 && hab(d) > 1.5 * hab(o))
      .map(d => ({ d, w: Math.sqrt(hab(d) / hab(o)) * (VOISINS[o.iso]?.includes(d.iso) ? 5 : d.zone === o.zone ? 3 : 1) * Math.sqrt(d.population / 1e7) }))
      .sort((a, b) => b.w - a.w).slice(0, MIGR.destinations);
    const tw = dest.reduce((t, x) => t + x.w, 0); if (!tw) continue;
    const partants = o.population * part;
    o.population -= partants; o.pib *= 1 - MIGR.pibDepart * part; // départ de main-d'œuvre (en partie compensé par les envois de fonds)
    for (const { d, w } of dest) { const n = partants * w / tw; accueil[d.iso] = (accueil[d.iso] ?? 0) + n; flux.push({ de: o.iso, vers: d.iso, part: n / (o.population + partants) }); }
    if (part >= 0.004 && lourds.has(o.iso)) ev.push({ id: `exode_${o.iso}_${e.annee}`, trimestre: 3, titre: `Exode : ${o.nom}`, texte: `${Math.round(partants / 1000)} 000 personnes quittent ${o.nom} cette année, vers ${dest.slice(0, 3).map(x => x.d.nom).join(", ")}.`, pays: [o.iso], resume: `population −${(part * 100).toFixed(1).replace(".", ",")} %` });
  }
  for (const [iso, n] of Object.entries(accueil)) {
    const d = e.pays[iso], part = n / d.population;
    d.population += n; d.pib *= 1 + MIGR.pibTravail * part; // main-d'œuvre en plus
    d.stabilite = M.borne(d.stabilite - Math.min(MIGR.stabMax, MIGR.stabAccueil * part * 100 / 0.5), 0, 100); // tensions si l'afflux est fort
    RS.ajusterSolde(e, iso, "energie", -0.8 * part * 100); RS.ajusterSolde(e, iso, "alimentation", -0.5 * part * 100); // besoins en plus
  }
  e.migrations = flux.sort((a, b) => b.part - a.part).slice(0, 60);
  return ev;
}
