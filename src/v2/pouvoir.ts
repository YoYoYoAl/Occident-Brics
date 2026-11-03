// Stabilité, élections et changements de gouvernement (demande du 2 novembre 2026).
// Règles différentes selon le régime de chaque pays ; le régime lui-même évolue (coup d'État, révolution, recul ou transition démocratique).
// Toutes les valeurs de départ et tous les taux sont des ESTIMATIONS (réalistes, pas factuelles) ; le calendrier réel ne sert qu'au début de partie.
import type { EtatV2, Camp, EvenementAnnee, PaysV2 } from "./moteur";
import * as M from "./moteur";
import { NON_DEMOCRATIES_2000 } from "../data/geographie";
import { TRAITS_DIRIGEANT, LISTE_TRAITS_DIRIGEANT, LISTE_APTITUDES, type Dirigeant, type Aptitude } from "../moteur/dirigeants";

export type Regime = "presidentiel" | "parlementaire" | "hybride" | "parti" | "monarchie" | "junte";
export const REGIMES: Record<Regime, { nom: string; aide: string; mandat: number }> = {
  presidentiel: { nom: "Démocratie présidentielle", aide: "Élection à date fixe ; le sortant peut perdre. Coup d'État possible si la stabilité s'effondre.", mandat: 5 },
  parlementaire: { nom: "Démocratie parlementaire", aide: "Élections régulières, anticipées si la stabilité passe sous 35.", mandat: 4 },
  hybride: { nom: "Régime hybride", aide: "Élections peu disputées (le pouvoir gagne presque toujours) ; révolution ou coup d'État si la stabilité baisse.", mandat: 6 },
  parti: { nom: "Parti unique", aide: "Congrès du Parti tous les 5 ans, succession au bout de 2 mandats ; révolution seulement en cas d'effondrement.", mandat: 5 },
  monarchie: { nom: "Monarchie", aide: "Succession dynastique ; révolte possible si la stabilité s'effondre.", mandat: 0 },
  junte: { nom: "Régime militaire", aide: "Contre-coup fréquent si la stabilité est basse ; transition vers des élections si elle remonte.", mandat: 0 },
};
export const LISTE_REGIMES = Object.keys(REGIMES) as Regime[];

// ---------- Régimes de 2000 (estimation) ----------
const PARTI = ["CHN", "VNM", "LAO", "CUB", "PRK"];
const MONARCHIE = ["SAU", "ARE", "QAT", "KWT", "OMN", "BHR", "BRN", "SWZ", "JOR", "MAR", "BTN"];
const JUNTE = ["PAK", "MMR", "CIV", "FJI", "AFG"];
const PRESIDENTIEL = ["USA", "MEX", "GTM", "HND", "SLV", "NIC", "CRI", "PAN", "DOM", "COL", "VEN", "ECU", "PER", "BOL", "BRA", "PRY", "URY", "ARG", "CHL", "GUY", "SUR",
  "FRA", "KOR", "TWN", "IDN", "PHL", "NGA", "KEN", "GHA", "SEN", "BEN", "MLI", "NER", "MWI", "MOZ", "NAM", "UKR", "GEO", "CYP", "ROU", "LTU", "POL", "MDG", "CPV", "STP", "SYC", "COM", "KIR", "PLW", "FSM", "LKA", "MNG"];
export function regime2000(iso: string): Regime {
  if (PARTI.includes(iso)) return "parti";
  if (MONARCHIE.includes(iso)) return "monarchie";
  if (JUNTE.includes(iso)) return "junte";
  if (NON_DEMOCRATIES_2000.includes(iso)) return "hybride";
  return PRESIDENTIEL.includes(iso) ? "presidentiel" : "parlementaire";
}

// ---------- Stabilité de départ en 2000 : DONNÉE RÉELLE ----------
// Banque mondiale, Worldwide Governance Indicators, « Stabilité politique et absence de violence » (−2,5 à +2,5), 2000, extrait de
// src/data/attributs2000.json. Conversion en 0-100 : 50 + 18 × indice, borné 2-98. Taïwan et Soudan du Sud (absents) : estimation.
export const WGI_STABILITE_2000: Record<string, number> = { AFG: -2.85, AGO: -2.46, ALB: -1.25, AND: 1.24, ARE: 0.98, ARG: -0.04, ARM: -0.81, ATG: 0.7, AUS: 1.43, AUT: 1.08, AZE: -0.95, BDI: -2.5, BEL: 1.19, BEN: 0.6, BFA: 0.08, BGD: -0.83, BGR: 0.43, BHR: 0.1, BHS: 1.06, BIH: -0.74, BLR: 0.27, BLZ: 0.09, BOL: -0.35, BRA: 0.4, BRB: 0.89, BRN: 1.34, BTN: 0.39, BWA: 1.13, CAF: -1.77, CAN: 1.26, CHE: 1.6, CHL: 0.59, CHN: -0.29, CIV: -1.36, CMR: -0.57, COD: -2.57, COG: -1.73, COL: -2.08, COM: -0.58, CPV: 1.2, CRI: 0.71, CUB: 0.35, CYP: 0.71, CZE: 0.62, DEU: 1.37, DJI: -0.5, DMA: 0.43, DNK: 1.44, DOM: -0.14, DZA: -1.58, ECU: -0.77, EGY: -0.42, ERI: -1.69, ESP: 0.34, EST: 0.91, ETH: -1.31, FIN: 1.67, FJI: 0.25, FRA: 0.85, FSM: 0.48, GAB: 0.32, GBR: 1.11, GEO: -1.61, GHA: -0.48, GIN: -2.04, GMB: 0.3, GNB: -0.63, GNQ: -0.07, GRC: 0.83, GRD: 0.7, GTM: -0.96, GUY: -0.73, HND: -0.38, HRV: 0.32, HTI: -1.02, HUN: 1.0, IDN: -1.94, IND: -0.95, IRL: 1.54, IRN: -0.64, IRQ: -1.43, ISL: 1.56, ISR: -0.85, ITA: 1.09, JAM: -0.3, JOR: -0.23, JPN: 1.35, KAZ: 0.07, KEN: -1.36, KGZ: -0.6, KHM: -1.04, KIR: 0.97, KNA: 0.97, KOR: 0.44, KWT: 0.66, LAO: -0.59, LBN: -0.66, LBR: -1.89, LBY: -0.38, LCA: 0.96, LIE: 1.24, LKA: -2.02, LSO: -0.5, LTU: 0.58, LUX: 1.54, LVA: 0.55, MAR: -0.39, MCO: 0.97, MDA: -0.35, MDG: 0.06, MDV: 1.12, MEX: -0.09, MHL: 0.97, MKD: -1.07, MLI: -0.2, MLT: 1.31, MMR: -1.69, MNE: 0.06, MNG: 0.6, MOZ: -0.26, MRT: -0.04, MUS: 0.68, MWI: -0.79, MYS: 0.0, NAM: -0.24, NER: -0.38, NGA: -1.65, NIC: -0.32, NLD: 1.7, NOR: 1.57, NPL: -1.43, NRU: 0.97, NZL: 1.43, OMN: 1.02, PAK: -1.2, PAN: 0.12, PER: -1.31, PHL: -1.44, PLW: 0.97, PNG: -0.3, POL: 0.48, PRK: 0.23, PRT: 1.39, PRY: -1.24, QAT: 1.07, ROU: -0.32, RUS: -1.31, RWA: -2.08, SAU: 0.1, SDN: -2.5, SEN: -0.63, SGP: 1.1, SLB: -0.81, SLE: -2.21, SLV: -0.0, SMR: 0.97, SOM: -2.38, SRB: -1.8, STP: 0.91, SUR: 0.18, SVK: 0.85, SVN: 1.1, SWE: 1.49, SWZ: -0.29, SYC: 1.0, SYR: -0.43, TCD: -1.49, TGO: -0.46, THA: 0.56, TJK: -1.84, TKM: 0.14, TLS: 0.24, TON: 0.48, TTO: -0.02, TUN: 0.24, TUR: -0.54, TUV: 0.97, TZA: -1.02, UGA: -1.63, UKR: -0.52, URY: 0.84, USA: 1.03, UZB: -1.23, VCT: 0.96, VEN: -0.74, VNM: 0.28, VUT: 0.91, WSM: 1.11, YEM: -1.65, ZAF: -0.31, ZMB: -0.02, ZWE: -1.4 };
const ESTIMATION_STAB: Record<string, number> = { TWN: 65, SSD: 15 };
export const stabiliteDeWgi = (w: number) => Math.round(M.borne(50 + 18 * w, 2, 98));
export function stabiliteDepart(p: { iso: string }): number {
  const w = WGI_STABILITE_2000[p.iso];
  return w !== undefined ? stabiliteDeWgi(w) : ESTIMATION_STAB[p.iso] ?? 50;
}

// ---------- Paliers de stabilité ----------
export const PALIERS = [
  { min: 0, nom: "Effondrement", aide: "Croissance −2 points, opérations de partenariat et de développement à 60 %, séparatisme et coups d'État très probables, émigration." },
  { min: 15, nom: "Crise", aide: "Opérations de partenariat et de développement à 80 %, coups d'État et révolutions possibles, émigration." },
  { min: 30, nom: "Tensions", aide: "Manifestations ; le gouvernement sortant perd plus souvent les élections." },
  { min: 50, nom: "Stable", aide: "Aucun effet particulier." },
  { min: 70, nom: "Très stable", aide: "Croissance +0,2 point ; coups d'État quasi impossibles." },
];
export const palier = (s: number) => (s < 15 ? 0 : s < 30 ? 1 : s < 50 ? 2 : s < 70 ? 3 : 4);
export const STAB = { pibTresStable: 0.2, pibEffondrement: -2, efficacite: [0.6, 0.8, 1, 1, 1] };
// Bonus ou malus de croissance du palier, compté par rapport au palier de départ du pays (la tendance de fond intègre déjà sa situation de 2000).
export const pibPalier = (s: number) => (s >= 70 ? STAB.pibTresStable : s < 15 ? STAB.pibEffondrement : 0);
export const efficaciteStab = (p: PaysV2) => STAB.efficacite[palier(p.stabilite)];

// ---------- Calendrier ----------
// Pays clés : dates réelles des grands scrutins (ou congrès) de 2000 à 2027 ; ensuite (ou après une élection anticipée), la durée du mandat.
export const CALENDRIER: Record<string, { dates: number[]; mandat: number }> = {
  USA: { dates: [2004, 2008, 2012, 2016, 2020, 2024, 2028], mandat: 4 }, CHN: { dates: [2002, 2007, 2012, 2017, 2022, 2027], mandat: 5 },
  RUS: { dates: [2004, 2008, 2012, 2018, 2024], mandat: 6 }, FRA: { dates: [2002, 2007, 2012, 2017, 2022, 2027], mandat: 5 },
  GBR: { dates: [2001, 2005, 2010, 2015, 2017, 2019, 2024], mandat: 5 }, DEU: { dates: [2002, 2005, 2009, 2013, 2017, 2021, 2025], mandat: 4 },
  JPN: { dates: [2000, 2003, 2005, 2009, 2012, 2014, 2017, 2021, 2024], mandat: 3 }, ITA: { dates: [2001, 2006, 2008, 2013, 2018, 2022], mandat: 5 },
  IND: { dates: [2004, 2009, 2014, 2019, 2024], mandat: 5 }, BRA: { dates: [2002, 2006, 2010, 2014, 2018, 2022, 2026], mandat: 4 },
  MEX: { dates: [2000, 2006, 2012, 2018, 2024], mandat: 6 }, ZAF: { dates: [2004, 2009, 2014, 2019, 2024], mandat: 5 },
  TUR: { dates: [2002, 2007, 2011, 2015, 2018, 2023], mandat: 5 }, IRN: { dates: [2001, 2005, 2009, 2013, 2017, 2021, 2024], mandat: 4 },
  KOR: { dates: [2002, 2007, 2012, 2017, 2022], mandat: 5 }, IDN: { dates: [2004, 2009, 2014, 2019, 2024], mandat: 5 },
  CAN: { dates: [2000, 2004, 2006, 2008, 2011, 2015, 2019, 2021, 2025], mandat: 4 }, AUS: { dates: [2001, 2004, 2007, 2010, 2013, 2016, 2019, 2022, 2025], mandat: 3 },
  ESP: { dates: [2000, 2004, 2008, 2011, 2015, 2016, 2019, 2023], mandat: 4 }, ARG: { dates: [2003, 2007, 2011, 2015, 2019, 2023], mandat: 4 },
  EGY: { dates: [2005, 2012, 2014, 2018, 2024], mandat: 6 }, NGA: { dates: [2003, 2007, 2011, 2015, 2019, 2023], mandat: 4 },
  UKR: { dates: [2004, 2010, 2014, 2019], mandat: 5 }, POL: { dates: [2001, 2005, 2007, 2011, 2015, 2019, 2023], mandat: 4 },
  ISR: { dates: [2001, 2003, 2006, 2009, 2013, 2015, 2019, 2021, 2022], mandat: 4 }, VEN: { dates: [2000, 2006, 2012, 2013, 2018, 2024], mandat: 6 },
  TWN: { dates: [2004, 2008, 2012, 2016, 2020, 2024], mandat: 4 },
};

export interface Gouv { regime: Regime; prochaine: number; depuis: number; mandats: number; basse: number; chef?: string }
export interface Changement { iso: string; annee: number; type: "alternance" | "reelection" | "succession" | "coup" | "revolution" | "transition" | "recul"; camp: Camp | null; regime: Regime }
export interface Campagne { theme: string; p: number }
export interface Alternance { camp: Camp; annee: number; ancien: string; nouveau: string; type: "alternance" | "succession" | "coup"; texte: string; vue?: boolean }

// Taux (estimation, ajustés par simulation sur 200 parties).
export const POUVOIR = {
  sortant: 0.4, campagne: 1, stab: 0.05, croissance: 0.25, usure: 0.35, hybride: 2.5, // logit de réélection du gouvernement sortant
  anticipeeSous: 35, anticipee: 0.3,                                     // parlementaire : élection anticipée par an sous 35 de stabilité
  coup: { junte: 0.12, hybride: 0.08, presidentiel: 0.05, parlementaire: 0.02, parti: 0.01, monarchie: 0.03 } as Record<Regime, number>, // à stabilité 10
  revolution: { hybride: 0.05, parti: 0.02, monarchie: 0.03, junte: 0.04, presidentiel: 0, parlementaire: 0 } as Record<Regime, number>,
  succession: 0.05,                                                      // monarchie : succession par an
  transition: 0.1, transitionLongue: 0.15, recul: 0.15, democratisation: 0.03, // junte → élections (plus probable après 5 ans) ; démocratie → hybride ; hybride → démocratie
  coupCamp: 0.05,                                                        // crise de régime chez un leader de camp, à stabilité 10
  bascule: { election: [6, 10], coup: [15, 20] } as Record<string, number[]>, // degrés d'attitude gagnés par le camp favorisé : base + tirage
  effetStab: { alternance: 3, reelection: 1, coup: -8, revolution: -12, succession: 0 } as Record<string, number>,
  opGouv: 0.015,                                                          // + coup d'État par point « influencer le gouvernement » (plafond +15 %)
  allies: 4, grace: 1, leaderStab: 3,                                     // alternance d'un camp : confiance des alliés −4, +1 point d'opération l'année suivante, stabilité +3
  limiteOCC: 8, limiteCHN: 2,                                             // 8 ans à la Maison-Blanche ; 2 mandats au Congrès du Parti
};
const tir = (e: EtatV2) => M.tirer(e);
const logit = (z: number) => 1 / (1 + Math.exp(-z));
const croissance = (e: EtatV2, iso: string) => { const a = e.pibDebutAnnee?.[iso]; return a ? (e.pays[iso].pib / a - 1) * 100 : 2; };
const fragilite = (s: number) => Math.max(0, Math.min(1, (50 - s) / 40)) ** 2; // 0 au-dessus de 50, 1 à 10

export function initialiser(e: EtatV2) {
  e.gouv = {};
  for (const p of Object.values(e.pays)) {
    const r = regime2000(p.iso), cal = CALENDRIER[p.iso], m = REGIMES[r].mandat;
    const prochaine = cal ? cal.dates.find(a => a >= 2000)! : m ? 2000 + 1 + Math.floor(tir(e) * m) : 0;
    e.gouv[p.iso] = { regime: r, prochaine, depuis: 2000 - Math.floor(tir(e) * 4), mandats: 1, basse: 0 };
  }
  e.gouv.USA.depuis = 2000; e.gouv.CHN.depuis = 2000; e.gouv.USA.mandats = 1; e.gouv.CHN.mandats = 0; // le dirigeant de départ entame son premier mandat
  e.changements = [];
}
const suivante = (iso: string, g: Gouv, annee: number, decale = false) => {
  const cal = CALENDRIER[iso], m = REGIMES[g.regime].mandat || 5;
  if (cal && !decale) { const d = cal.dates.find(a => a > annee); if (d) return d; }
  return annee + m;
};

// ---------- Campagne du joueur (ou de l'IA) ----------
export const THEMES: Record<Camp, { id: string; nom: string; aide: string; poids: (e: EtatV2) => number }[]> = {
  OCC: [
    { id: "economie", nom: "C'est l'économie !", aide: "Paie si la croissance américaine dépasse 2 %, coûte si elle est sous 1 %.", poids: e => (croissance(e, "USA") - 1.5) * 0.25 },
    { id: "securite", nom: "Sécurité et fermeté", aide: "Paie quand la tension mondiale est haute (au-dessus de 3).", poids: e => (e.tension - 3) * 0.2 },
    { id: "rassembler", nom: "Rassembler le pays", aide: "Paie si le pays est stable (au-dessus de 60), coûte s'il est en crise.", poids: e => (e.pays.USA.stabilite - 60) * 0.03 },
  ],
  CHN: [
    { id: "prosperite", nom: "Prospérité commune", aide: "Paie si la croissance chinoise dépasse 5 %.", poids: e => (croissance(e, "CHN") - 5) * 0.15 },
    { id: "discipline", nom: "Discipline du Parti", aide: "Purge anticorruption : paie si la stabilité est sous 55, mais coûte 2 de stabilité.", poids: e => (55 - e.pays.CHN.stabilite) * 0.03 },
    { id: "grandeur", nom: "Grandeur nationale", aide: "Paie quand la tension mondiale est haute ; fait monter la tension de 0,3.", poids: e => (e.tension - 2.5) * 0.2 },
  ],
};
const effetTheme = (e: EtatV2, c: Camp, id?: string) => { const t = THEMES[c].find(x => x.id === id); return t ? M.borne(t.poids(e), -0.6, 0.6) : 0; };
export const anneeElectionCamp = (e: EtatV2, c: Camp) => e.gouv?.[M.LEADER[c]]?.prochaine === e.annee;
export const limiteAtteinte = (e: EtatV2, c: Camp) => { const g = e.gouv![M.LEADER[c]]; return c === "OCC" ? e.annee - g.depuis + 1 > POUVOIR.limiteOCC - 1 : g.mandats >= POUVOIR.limiteCHN; };
// Chance que le camp garde le pouvoir (même dirigeant, ou même ligne avec un successeur si la limite est atteinte), thème compris.
export function chanceMaintien(e: EtatV2, c: Camp, theme?: string): number {
  const iso = M.LEADER[c], p = e.pays[iso], g = e.gouv![iso];
  const crois = croissance(e, iso) - (c === "CHN" ? 5 : 2);
  let z = POUVOIR.stab * (p.stabilite - 50) + POUVOIR.croissance * M.borne(crois, -4, 4) + effetTheme(e, c, theme);
  if (c === "OCC") z += limiteAtteinte(e, c) ? 0 : POUVOIR.sortant; // pas de prime au sortant pour un successeur
  else z += 2.2; // Congrès : la ligne en place se maintient le plus souvent
  return Math.max(0.03, Math.min(0.97, logit(z)));
}
export function choisirCampagne(e: EtatV2, c: Camp, theme: string) { (e.campagne ??= {})[c] = { theme, p: chanceMaintien(e, c, theme) }; }
export function campagneIA(e: EtatV2, c: Camp) {
  if (!anneeElectionCamp(e, c) || e.campagne?.[c]) return;
  const t = THEMES[c].slice().sort((a, b) => chanceMaintien(e, c, b.id) - chanceMaintien(e, c, a.id))[0];
  choisirCampagne(e, c, t.id);
}

// ---------- Nouveaux dirigeants (noms et portraits jamais repris dans une partie) ----------
export function nouveauDirigeant(e: EtatV2, c: Camp): Dirigeant {
  const choisir = <T>(l: T[]) => l[Math.floor(tir(e) * l.length)];
  const t1 = choisir(LISTE_TRAITS_DIRIGEANT);
  const t2 = choisir(LISTE_TRAITS_DIRIGEANT.filter(t => t !== t1 && t !== TRAITS_DIRIGEANT[t1].contraire && TRAITS_DIRIGEANT[t].contraire !== t1));
  const normale = () => Math.sqrt(-2 * Math.log(1 - tir(e) * 0.999999)) * Math.cos(2 * Math.PI * tir(e));
  const apt = Object.fromEntries(LISTE_APTITUDES.map(a => [a, Math.max(2, Math.min(10, Math.round(6 + 1.3 * normale())))])) as Record<Aptitude, number>;
  const pris = new Set<string>([...(e.nomsPris ?? []), e.dirigeants.OCC.nom, e.dirigeants.CHN.nom, ...Object.values(e.candidats).flatMap(r => Object.values(r).flat().map(x => x.nom))]);
  const femme = tir(e) < 0.35, nom = M.nomUniqueV2(e, c, femme, pris);
  const d: Dirigeant = { nom, naissance: e.annee - (48 + Math.floor(tir(e) * 20)), sante: 70 + Math.floor(tir(e) * 31), popularite: 50, aptitudes: apt, traits: [t1, t2], depuis: e.annee };
  const por = M.choisirChef(c, d, e.imagesPrises); if (por) { d.illustre = por; e.imagesPrises.push(por); }
  return d;
}
function changerDirigeant(e: EtatV2, c: Camp, type: Alternance["type"], texte: string) {
  const ancien = e.dirigeants[c].nom; (e.nomsPris ??= []).push(ancien);
  e.dirigeants[c] = nouveauDirigeant(e, c);
  e.candidats[c] = M.tirerCandidats(e, c); e.cabinet[c] = {};
  if (c !== e.joueur) M.cabinetIA(e, c);
  const g = e.gouv![M.LEADER[c]]; g.depuis = e.annee + 1; g.mandats = 1;
  if (type !== "succession") {
    for (const p of Object.values(e.pays)) if (p.iso !== M.LEADER[c] && p.att[c] >= 60) p.att[c] = M.borne(p.att[c] - POUVOIR.allies); // les alliés doutent
    e.pays[M.LEADER[c]].stabilite = M.borne(e.pays[M.LEADER[c]].stabilite + POUVOIR.leaderStab, 0, 100);
    (e.grace ??= {})[c] = e.annee + 1;
  }
  const a: Alternance = { camp: c, annee: e.annee, ancien, nouveau: e.dirigeants[c].nom, type, texte };
  (e.alternances ??= []).push(a);
  return a;
}
export const bonusGrace = (e: EtatV2, c: Camp) => (e.grace?.[c] === e.annee ? POUVOIR.grace : 0);

// ---------- Fin d'année : élections, congrès, coups, révolutions ----------
// Influence de chaque camp sur le prochain gouvernement d'un pays : agents infiltrés, opérations secrètes et d'influence en cours.
export function pression(e: EtatV2, iso: string): Record<Camp, number> {
  const r = { OCC: 0, CHN: 0 } as Record<Camp, number>, p = e.pays[iso];
  for (const c of ["OCC", "CHN"] as Camp[]) {
    if (p.infiltre[c]) r[c] += 8;
    for (const o of M.opsActives(e)) if (o.camp === c) {
      if (o.pays === iso && (o.type === "gouvernement" || o.type === "infiltrer")) r[c] += 3 * o.points;
      else if (o.zone === p.zone && o.type === "influence") r[c] += 0.5 * o.points;
    }
  }
  return r;
}
function bascule(e: EtatV2, iso: string, type: "election" | "coup"): Camp | null {
  if (iso === M.LEADER.OCC || iso === M.LEADER.CHN) return null;
  const p = e.pays[iso], pr = pression(e, iso);
  // L'opposition penche plutôt à l'inverse du pouvoir sortant (retour vers le centre), corrigé par l'influence des camps.
  const z = (pr.OCC - pr.CHN) / 8 - (p.att.OCC - p.att.CHN) / 80;
  const c: Camp = tir(e) < logit(z) ? "OCC" : "CHN", [b, a] = POUVOIR.bascule[type];
  const x = (b + a * tir(e)) * M.PAS_DEGRE / 3; // en degrés d'attitude (un niveau = 3 degrés)
  p.att[c] = M.borne(p.att[c] + x); p.att[M.autre(c)] = M.borne(p.att[M.autre(c)] - 0.6 * x);
  p.eco[c] = M.borne(p.eco[c] + 0.3 * x);
  return c;
}
// Élection d'un pays : chance que le pouvoir sortant soit reconduit. Les campagnes des camps (opérations « influencer le gouvernement »,
// agents infiltrés, influence dans la zone) aident le sortant s'il penche vers leur camp, l'opposition sinon (comme les campagnes de l'ancienne version).
export function chanceReelection(e: EtatV2, iso: string): number {
  const p = e.pays[iso], g = e.gouv![iso], pr = pression(e, iso), proche: Camp = p.att.OCC >= p.att.CHN ? "OCC" : "CHN";
  const z = POUVOIR.sortant + POUVOIR.stab * (p.stabilite - 50) + POUVOIR.croissance * M.borne(croissance(e, iso) - 2, -4, 4) - POUVOIR.usure * (g.mandats - 1)
    + (g.regime === "hybride" ? POUVOIR.hybride : 0) + POUVOIR.campagne * (pr[proche] - pr[M.autre(proche)]) / 8;
  return logit(z);
}
// Sondage montré au joueur : probabilité que le gouvernement issu du prochain scrutin penche vers son camp.
export function sondage(e: EtatV2, iso: string, c: Camp): number {
  const p = e.pays[iso], pr = pression(e, iso), re = chanceReelection(e, iso), proche: Camp = p.att.OCC >= p.att.CHN ? "OCC" : "CHN";
  const versC = logit(((pr[c] - pr[M.autre(c)]) / 8) - (c === "OCC" ? 1 : -1) * (p.att.OCC - p.att.CHN) / 80);
  return (proche === c ? re : 0) + (1 - re) * versC;
}
// Voie offerte à « influencer le gouvernement » : campagne si un scrutin tombe pendant les 3 ans de l'opération, sinon coup d'État.
export function voieGouvernement(e: EtatV2, iso: string): { voie: "election" | "coup" | "aucune"; annee?: number; texte: string } {
  const g = e.gouv?.[iso], p = e.pays[iso]; if (!g || !p) return { voie: "aucune", texte: "" };
  if (iso === M.LEADER.OCC || iso === M.LEADER.CHN) return { voie: "aucune", texte: "Leader de camp : pas de campagne possible." };
  if (g.prochaine && g.prochaine <= e.annee + 2 && g.regime !== "parti") return { voie: "election", annee: g.prochaine, texte: `Élection en ${g.prochaine} : tes points financent une campagne et pèsent sur le scrutin.` };
  const pc = Math.round(100 * (POUVOIR.coup[g.regime] * fragilite(p.stabilite)));
  return { voie: "coup", texte: `Pas de scrutin avant ${g.prochaine && g.prochaine > e.annee ? g.prochaine : "longtemps"} (${REGIMES[g.regime].nom.toLowerCase()}) : tes points rapprochent le pouvoir de ton camp et rendent un coup d'État possible (risque actuel ${pc} %, +${Math.round(POUVOIR.opGouv * 100)} % par point si la stabilité est sous 60).` };
}
const NOMS_TYPE: Record<Changement["type"], string> = { alternance: "Alternance", reelection: "Réélection", succession: "Succession", coup: "Coup d'État", revolution: "Révolution", transition: "Retour aux urnes", recul: "Recul démocratique" };
export function politiqueAnnee(e: EtatV2): EvenementAnnee[] {
  if (!e.gouv) initialiser(e);
  const ev: EvenementAnnee[] = [], a = e.annee, notables = new Set(Object.values(e.pays).sort((x, y) => y.poids - x.poids).slice(0, 30).map(p => p.iso));
  const noter = (iso: string, type: Changement["type"], camp: Camp | null, texte: string) => {
    const g = e.gouv![iso]; (e.changements ??= []).push({ iso, annee: a, type, camp, regime: g.regime });
    const p = e.pays[iso], pire = type === "coup" || type === "revolution";
    if (pire || notables.has(iso) || e.ops.some(o => o.pays === iso && M.ageOp(e, o) < 3)) {
      const vers = camp ? ` Le nouveau pouvoir se rapproche ${camp === "OCC" ? "de l'Occident" : "des BRICS"}.` : "";
      ev.push({ id: `pol_${type}_${iso}_${a}`, trimestre: pire ? 1 + Math.floor(tir(e) * 4) : 4, titre: `${NOMS_TYPE[type]} : ${p.nom}`, texte: texte + vers, pays: [iso],
        resume: `Stabilité ${Math.round(p.stabilite)} · ${REGIMES[g.regime].nom}` });
    }
  };
  for (const p of Object.values(e.pays)) {
    const iso = p.iso, g = e.gouv![iso]; if (!g) continue;
    const camp = iso === M.LEADER.OCC ? "OCC" : iso === M.LEADER.CHN ? "CHN" : null;
    g.basse = p.stabilite < 25 ? g.basse + 1 : 0;
    if (camp) { electionCamp(e, camp, ev); continue; }
    const f = fragilite(p.stabilite), hab = p.pib / Math.max(1, p.population);
    // 1. Coup d'État (renforcé par l'opération « influencer le gouvernement »)
    const opG = e.ops.filter(o => o.pays === iso && o.type === "gouvernement" && M.ageOp(e, o) >= 0 && M.ageOp(e, o) < 3).reduce((s, o) => s + o.points, 0);
    const pCoup = POUVOIR.coup[g.regime] * f * (g.regime === "parlementaire" && hab > 15000 ? 0.1 : 1) + Math.min(0.15, POUVOIR.opGouv * opG) * (p.stabilite < 60 ? 1 : 0.3);
    if (tir(e) < pCoup) {
      const c = bascule(e, iso, "coup"); g.regime = "junte"; g.prochaine = 0; g.depuis = a + 1; g.mandats = 1;
      p.stabilite = M.borne(p.stabilite + POUVOIR.effetStab.coup, 0, 100);
      noter(iso, "coup", c, `L'armée prend le pouvoir à ${p.nom} après des mois de troubles.`); continue;
    }
    // 2. Révolution
    if (tir(e) < POUVOIR.revolution[g.regime] * f) {
      const c = bascule(e, iso, "coup"); g.regime = hab > 3000 || tir(e) < 0.4 ? "presidentiel" : "hybride"; g.prochaine = a + 1 + Math.floor(tir(e) * 2); g.depuis = a + 1; g.mandats = 1;
      p.stabilite = M.borne(p.stabilite + POUVOIR.effetStab.revolution, 0, 100);
      noter(iso, "revolution", c, `La rue renverse le pouvoir à ${p.nom} ; ${REGIMES[g.regime].nom.toLowerCase()} en vue.`); continue;
    }
    // 3. Évolution du régime
    if ((g.regime === "presidentiel" || g.regime === "parlementaire") && g.basse >= 3 && tir(e) < POUVOIR.recul) {
      g.regime = "hybride"; g.prochaine = a + REGIMES.hybride.mandat; noter(iso, "recul", null, `Pouvoirs d'exception et presse muselée : ${p.nom} glisse vers un régime hybride.`); continue;
    }
    if (g.regime === "junte" && (p.stabilite >= 40 || a - g.depuis >= 5) && tir(e) < (a - g.depuis >= 5 ? POUVOIR.transitionLongue : POUVOIR.transition)) {
      g.regime = "presidentiel"; g.prochaine = a + 1; noter(iso, "transition", null, `Les militaires rendent le pouvoir : ${p.nom} organise une élection.`); continue;
    }
    if (g.regime === "hybride" && p.stabilite >= 65 && hab > 8000 && tir(e) < POUVOIR.democratisation) {
      g.regime = "presidentiel"; g.prochaine = a + 1; noter(iso, "transition", null, `Ouverture politique : ${p.nom} se démocratise.`); continue;
    }
    // 4. Succession dynastique, congrès
    if (g.regime === "monarchie" && tir(e) < POUVOIR.succession) {
      g.depuis = a + 1; for (const c of ["OCC", "CHN"] as Camp[]) p.att[c] = M.borne(p.att[c] + (tir(e) * 2 - 1) * M.PAS_DEGRE);
      noter(iso, "succession", null, `Un nouveau souverain monte sur le trône de ${p.nom}.`); continue;
    }
    // 5. Élections (et anticipées en parlementaire)
    const anticipee = g.regime === "parlementaire" && p.stabilite < POUVOIR.anticipeeSous && g.prochaine > a && tir(e) < POUVOIR.anticipee;
    if (g.prochaine === a || anticipee) {
      if (g.regime === "parti") { // congrès : succession au bout de 2 mandats, sinon la ligne se maintient
        g.mandats++; if (g.mandats > 2) { g.mandats = 1; g.depuis = a + 1; noter(iso, "succession", null, `Le congrès de ${p.nom} désigne une nouvelle direction.`); }
        g.prochaine = suivante(iso, g, a); continue;
      }
      if (tir(e) < chanceReelection(e, iso)) { g.mandats++; p.stabilite = M.borne(p.stabilite + POUVOIR.effetStab.reelection, 0, 100);
        if (notables.has(iso)) noter(iso, "reelection", null, `${anticipee ? "Élections anticipées" : "Élections"} à ${p.nom} : le pouvoir sortant est reconduit.`); }
      else { const c = bascule(e, iso, "election"); g.mandats = 1; g.depuis = a + 1; p.stabilite = M.borne(p.stabilite + POUVOIR.effetStab.alternance, 0, 100);
        noter(iso, "alternance", c, `${anticipee ? "Élections anticipées" : "Élections"} à ${p.nom} : l'opposition l'emporte.`); }
      g.prochaine = suivante(iso, g, a, anticipee);
    }
  }
  e.campagne = {};
  return ev;
}
function electionCamp(e: EtatV2, c: Camp, ev: EvenementAnnee[]) {
  const iso = M.LEADER[c], g = e.gouv![iso], p = e.pays[iso], a = e.annee, nomC = c === "OCC" ? "Washington" : "Pékin";
  const pousser = (titre: string, texte: string) => ev.push({ id: `pol_camp_${c}_${a}`, trimestre: 4, titre, texte, pays: [iso], resume: `Stabilité ${Math.round(p.stabilite)}` });
  // Coup de faction ou crise de régime si la stabilité s'effondre, hors calendrier.
  if (tir(e) < POUVOIR.coupCamp * fragilite(p.stabilite)) {
    const x = changerDirigeant(e, c, "coup", c === "CHN" ? "Une faction rivale renverse la direction du Parti." : "Destitution et crise constitutionnelle : le président est démis.");
    p.stabilite = M.borne(p.stabilite - 5, 0, 100); g.prochaine = suivante(iso, g, a, true);
    pousser(`${nomC} : ${x.nouveau} remplace ${x.ancien}`, x.texte); return;
  }
  if (g.prochaine !== a) return;
  campagneIA(e, c);
  const th = e.campagne?.[c]?.theme, chance = chanceMaintien(e, c, th), limite = limiteAtteinte(e, c);
  if (th === "discipline") p.stabilite = M.borne(p.stabilite - 2, 0, 100);
  if (th === "grandeur") e.tension = M.borne(e.tension + 0.3, 0, 10);
  const garde = tir(e) < chance;
  g.prochaine = suivante(iso, g, a);
  if (garde && !limite) { g.mandats++; pousser(c === "OCC" ? `Présidentielle ${a} : ${e.dirigeants[c].nom} réélu(e)` : `Congrès ${a} : ${e.dirigeants[c].nom} reconduit(e)`, `La chance était de ${Math.round(chance * 100)} %.`); return; }
  const type: Alternance["type"] = garde ? "succession" : "alternance";
  const texte = c === "OCC" ? (garde ? "Le président atteint la limite de deux mandats ; son camp garde la Maison-Blanche avec un successeur." : "Le président sortant (ou son successeur) est battu : l'opposition prend la Maison-Blanche.")
    : (garde ? "Fin des deux mandats : le congrès installe le successeur désigné, la ligne est maintenue." : "Le congrès désavoue la direction : une autre faction prend la tête du Parti.");
  const x = changerDirigeant(e, c, type, texte);
  pousser(`${c === "OCC" ? "Présidentielle" : "Congrès"} ${a} : ${x.nouveau} succède à ${x.ancien}`, `${texte} (chance de maintien : ${Math.round(chance * 100)} %)`);
}
export const alternanceJoueur = (e: EtatV2) => (e.alternances ?? []).find(x => x.camp === e.joueur && x.annee === e.annee - 1 && !x.vue);
