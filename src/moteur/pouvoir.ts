// Rester au pouvoir (refonte, maquette 7) : présidentielle américaine avec thèmes de campagne, mi-mandat et Congrès, destitution ;
// Comité permanent chinois (7 sièges, au moins 4 loyaux), nominations, anticorruption, plénum, limite des mandats ;
// conseillers nommés, renouvelés après un changement de dirigeant, jamais deux fois le même nom dans une partie.
// Ces mécaniques ne s'appliquent qu'au camp du joueur : l'IA garde l'ancien tirage, ce qui préserve le calibrage IA contre IA (40/20/40).
// Toutes les valeurs sont une première proposition à calibrer.
import { type EtatPartie, outils, partFamille, puissance } from "./partie";
import { type Conseil, type Trait, LISTE_CONSEILS, TRAITS } from "./plans";
import { succession } from "./dirigeants";
import { date } from "./temps";
import { CAMPS, type Camp } from "./types";

// ---------- Noms uniques ----------
const PRENOMS: Record<Camp, string[]> = {
  OCC: ["Daniel", "Margaret", "Robert", "Ellen", "Thomas", "Catherine", "Walter", "Laura", "Henry", "Diane", "Franklin", "Ruth", "Grant", "Helen", "Marcus", "Joan", "Russell", "Nora", "Elliott", "Paula",
    "Dwight", "Carol", "Vernon", "Sylvia", "Lucas", "Irene", "Gordon", "Martha", "Spencer", "Alice", "Wesley", "Lorraine", "Calvin", "Judith", "Owen", "Beatrice"],
  CHN: ["Weiguo", "Jianhua", "Mingde", "Xiaoling", "Haoran", "Zhiqiang", "Lihua", "Guoqing", "Yifan", "Shumin", "Dewei", "Ruolan", "Changfeng", "Huimin", "Jingyu", "Baolin", "Xiuying", "Tianming",
    "Yanping", "Zhenhua", "Lanfang", "Wenbo", "Chunhua", "Kaiwen", "Meiling", "Shaojun", "Hongwei", "Yuqing", "Junjie", "Fengyi", "Qiming", "Suhua", "Guangyu", "Lirong", "Anping", "Xinyue"],
};
const NOMS: Record<Camp, string[]> = {
  OCC: ["Whitmore", "Calloway", "Hendricks", "Brennan", "Ashford", "Delaney", "Harlan", "Prescott", "Thornbury", "Talbot", "Winslow", "Garrison", "Langford", "Osgood", "Okafor", "Marchetti",
    "Whitfield", "Castellano", "Lindqvist", "Abernathy", "Kowalczyk", "Moreland", "Nakamura", "Fairbanks", "Ridley", "Sorensen", "Holloway", "Quintero", "Blackwood", "Esposito", "Vance", "Merriweather"],
  CHN: ["Wang", "Li", "Zhang", "Liu", "Chen", "Yang", "Zhao", "Huang", "Zhou", "Wu", "Xu", "Sun", "Guo", "He", "Ma", "Lin", "Luo", "Gao", "Zheng", "Liang", "Xie", "Song", "Tang", "Han", "Feng", "Deng",
    "Cao", "Peng", "Zeng", "Xiao", "Tian", "Dong"],
};
const TITRES: Partial<Record<Conseil, Record<Camp, string>>> = { militaire: { OCC: "Gén.", CHN: "Gén." } };
// Un nom jamais vu dans la partie (dirigeants et conseillers des deux blocs) : tirage sans remise parmi plus de 1 100 combinaisons par bloc.
// Les noms sont cosmétiques : générateur à part (graine + rang du nom), sans toucher au hasard de la partie.
const hacher = (a: number, b: number) => { let x = (Math.imul(a ^ 0x9e3779b9, 2654435761) ^ Math.imul(b + 1, 2246822519)) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822507) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };
// Dirigeants (partie = true) : le 1er essai garde ses 2 tirages sur le hasard de la partie, comme avant la v31 (équilibrage inchangé).
export function nomUnique(e: EtatPartie, camp: Camp, partie = false): string {
  const pris = new Set(e.nomsPris ?? []), rang = pris.size;
  for (let k = 0; k < 200; k++) {
    const u = (j: number) => partie && k === 0 ? outils.tirer(e) : hacher(e.graine, rang * 401 + 2 * k + j);
    const x = u(0), y = u(1), [a, b] = camp === "OCC" ? [x, y] : [y, x]; // ordre d'origine : prénom puis nom (USA), nom puis prénom (Chine)
    const p = PRENOMS[camp][Math.floor(a * PRENOMS[camp].length)], n = NOMS[camp][Math.floor(b * NOMS[camp].length)];
    const nom = camp === "OCC" ? `${p} ${n}` : `${n} ${p}`;
    if (!pris.has(nom)) { (e.nomsPris ??= []).push(nom); return nom; }
  }
  const nom = `${PRENOMS[camp][0]} ${NOMS[camp][0]} ${(e.nomsPris ?? []).length}`; (e.nomsPris ??= []).push(nom); return nom;
}
export const marquerNomPris = (e: EtatPartie, nom: string) => { if (!(e.nomsPris ??= []).includes(nom)) e.nomsPris.push(nom); };

// ---------- Conseillers ----------
export interface Conseiller { nom: string; trait: Trait; portrait: number; depuis: number } // portrait : numéro unique dans la partie (illustré ou généré)
const listeTraits = () => Object.keys(TRAITS) as Trait[]; // à l'appel : import circulaire avec plans.ts
export function nouveauConseiller(e: EtatPartie, camp: Camp, cs: Conseil, trait?: Trait): Conseiller {
  const l = listeTraits(), t = trait ?? l[Math.floor(outils.tirer(e) * l.length)];
  const titre = TITRES[cs]?.[camp];
  e.portraitsPris = (e.portraitsPris ?? 0) + 1;
  return { nom: `${titre ? titre + " " : ""}${nomUnique(e, camp)}`, trait: t, portrait: e.portraitsPris, depuis: e.round };
}
export const conseillerDe = (e: EtatPartie, camp: Camp, cs: Conseil): Conseiller | null => e.conseillers?.[camp]?.[cs] ?? null;
export function installer(e: EtatPartie, camp: Camp, cs: Conseil, c: Conseiller) {
  ((e.conseillers ??= { OCC: {}, CHN: {} })[camp] ??= {})[cs] = c;
  ((e.chefs ??= { OCC: {}, CHN: {} })[camp] ??= {})[cs] = c.trait;
}
// Début de partie : un conseiller nommé par siège, avec le trait déjà tiré ; les 6 premiers portraits sont les portraits illustrés.
export function nommerConseillers(e: EtatPartie) {
  for (const camp of CAMPS) for (const cs of LISTE_CONSEILS) if (!conseillerDe(e, camp, cs)) installer(e, camp, cs, nouveauConseiller(e, camp, cs, e.chefs?.[camp]?.[cs]));
}
export const RENOUVELLEMENT = { successeur: [3, 4], alternance: [0, 1], candidats: 3 };
// Après un changement de dirigeant : 3 à 4 conseillers restent avec un successeur, 0 ou 1 avec une alternance.
// Pour le joueur, chaque siège libre propose 3 candidats (le premier est installé d'office, il peut en choisir un autre).
export function renouvelerConseillers(e: EtatPartie, camp: Camp, alternance: boolean) {
  if (!e.conseillers?.[camp]) return;
  const [a, b] = alternance ? RENOUVELLEMENT.alternance : RENOUVELLEMENT.successeur, restent = a + Math.floor(outils.tirer(e) * (b - a + 1));
  const sieges = [...LISTE_CONSEILS].sort(() => outils.tirer(e) - 0.5).slice(restent);
  const rec: { conseil: Conseil; candidats: Conseiller[] }[] = [];
  for (const cs of sieges) {
    const cands = Array.from({ length: camp === e.joueur ? RENOUVELLEMENT.candidats : 1 }, () => nouveauConseiller(e, camp, cs));
    installer(e, camp, cs, cands[0]);
    if (camp === e.joueur) rec.push({ conseil: cs, candidats: cands });
  }
  if (camp === e.joueur) etatPouvoir(e).recrutement = rec;
  outils.noter(e, { type: "politique", titre: `${camp === "OCC" ? "Washington" : "Pékin"} : ${sieges.length} conseiller${sieges.length > 1 ? "s" : ""} remplacé${sieges.length > 1 ? "s" : ""}`, camp, visiblePour: [camp],
    texte: `${6 - sieges.length} restent en place. ${camp === e.joueur && sieges.length ? "Choisis les nouveaux dans la salle du conseil (3 candidats par siège)." : ""}` });
}
export function choisirConseiller(e0: EtatPartie, camp: Camp, cs: Conseil, k: number): EtatPartie {
  const r = e0.pouvoir?.recrutement?.find(x => x.conseil === cs); if (!r || !r.candidats[k]) throw new Error("Aucun siège à pourvoir ici.");
  const e = structuredClone(e0), rr = e.pouvoir!.recrutement!.find(x => x.conseil === cs)!;
  installer(e, camp, cs, rr.candidats[k]); e.pouvoir!.recrutement = e.pouvoir!.recrutement!.filter(x => x.conseil !== cs);
  return e;
}

// ---------- État du pouvoir du joueur ----------
export type Theme = "economie" | "securite" | "emploi" | "valeurs" | "rang";
export type Ligne = "croissance" | "securite" | "ouverture";
export type Faction = "loyaux" | "securitaires" | "reformateurs";
export interface EtatPouvoir {
  themes?: Theme[]; themesAnnee?: number; congres?: "favorable" | "divise" | "hostile";
  comite?: Record<Faction, number>; ligne?: Ligne; ligneAnnee?: number; limiteAbolie?: boolean;
  recrutement?: { conseil: Conseil; candidats: Conseiller[] }[];
}
export const etatPouvoir = (e: EtatPartie) => (e.pouvoir ??= {});
export const ELECTIONS_USA = [2000, 2004, 2008, 2012, 2016, 2020, 2024, 2028, 2032], CONGRES_CHINE = [2002, 2007, 2012, 2017, 2022, 2027, 2032];
export const MI_MANDAT = (annee: number) => annee % 4 === 2;

// Présidentielle : 2 thèmes parmi 5, choisis aux 2e et 3e trimestres de l'année d'élection ; chacun pèse selon le contexte (en logit, ±0,6 au plus).
export const THEMES: Record<Theme, { nom: string; aide: string; poids: (e: EtatPartie) => number }> = {
  economie: { nom: "Économie", aide: "Porte si le bloc tient l'économie mondiale.", poids: e => 4 * (partFamille(e, "OCC", "economie") - 0.5) },
  securite: { nom: "Sécurité", aide: "Porte quand la tension est forte.", poids: e => (e.tension - 40) / 40 },
  emploi: { nom: "Emploi", aide: "Porte si l'économie va bien et que l'opinion n'est pas lasse des guerres.", poids: e => 2 * (partFamille(e, "OCC", "economie") - 0.5) - (e.camps.OCC.fatigue ?? 0) / 20 + 0.2 },
  valeurs: { nom: "Valeurs", aide: "Porte si le président est populaire.", poids: e => ((e.dirigeants?.OCC.popularite ?? 50) - 50) / 25 },
  rang: { nom: "Rang mondial", aide: "Porte si le bloc devance nettement la Chine.", poids: e => 3 * (puissance(e, "OCC") - puissance(e, "CHN")) },
};
export const LISTE_THEMES = Object.keys(THEMES) as Theme[];
export const effetTheme = (e: EtatPartie, t: Theme) => outils.borne(THEMES[t].poids(e), -0.6, 0.6);
export const fenetreThemes = (e: EtatPartie) => { const { annee, trimestre } = date(e.round); return ELECTIONS_USA.includes(annee) && (trimestre === 2 || trimestre === 3); };
export function choisirThemes(e0: EtatPartie, themes: Theme[]): EtatPartie {
  if (e0.joueur !== "OCC") throw new Error("Thèmes de campagne : réservé au bloc USA.");
  if (!fenetreThemes(e0)) throw new Error("Les thèmes se choisissent aux 2e et 3e trimestres d'une année de présidentielle.");
  if (themes.length !== 2 || new Set(themes).size !== 2 || themes.some(t => !THEMES[t])) throw new Error("Choisis 2 thèmes différents.");
  const e = structuredClone(e0), p = etatPouvoir(e); p.themes = themes; p.themesAnnee = date(e.round).annee;
  return e;
}
// Probabilité de réélection du camp au pouvoir (bloc USA joueur) : tirage habituel, décalé par les thèmes choisis cette année.
export function maintienUSA(e: EtatPartie, p0: number): number {
  const p = e.pouvoir; if (e.joueur !== "OCC" || !p?.themes || p.themesAnnee !== date(e.round).annee) return p0;
  const q = Math.min(0.999, Math.max(0.001, p0)), z = Math.log(q / (1 - q)) + p.themes.reduce((s, t) => s + effetTheme(e, t), 0);
  return 1 / (1 + Math.exp(-z));
}
// Mi-mandat : le Congrès suit la popularité du président.
export const CONGRES = { favorable: 55, hostile: 40, budget: 0.1, destitution: 0.05 };
export function miMandat(e: EtatPartie) {
  if (e.joueur !== "OCC" || !e.dirigeants) return;
  const pop = e.dirigeants.OCC.popularite + 10 * (outils.tirer(e) - 0.5), p = etatPouvoir(e);
  p.congres = pop >= CONGRES.favorable ? "favorable" : pop < CONGRES.hostile ? "hostile" : "divise";
  outils.noter(e, { type: "politique", titre: `Élections de mi-mandat : Congrès ${p.congres === "divise" ? "divisé" : p.congres}`, camp: "OCC", visiblePour: [...CAMPS],
    texte: p.congres === "favorable" ? "Budget +10 % jusqu'à la présidentielle." : p.congres === "hostile" ? "Budget −10 % jusqu'à la présidentielle ; un scandale grave peut mener à la destitution." : "Pas d'effet sur le budget ; il faudra négocier chaque engagement." });
}
export const facteurCongres = (e: EtatPartie, camp: Camp) => camp !== "OCC" || e.joueur !== "OCC" ? 1 : e.pouvoir?.congres === "favorable" ? 1 + CONGRES.budget : e.pouvoir?.congres === "hostile" ? 1 - CONGRES.budget : 1;
// Destitution : seulement avec un Congrès hostile, à chaque scandale (environ 5 %).
export function risqueDestitution(e: EtatPartie, camp: Camp) {
  if (camp !== "OCC" || e.joueur !== "OCC" || e.pouvoir?.congres !== "hostile") return;
  if (outils.tirer(e) < CONGRES.destitution) { succession(e, "OCC", "Le Congrès destitue le président après le scandale"); renouvelerConseillers(e, "OCC", false); }
}

// ---------- Comité permanent chinois ----------
export const COMITE = { sieges: 7, majorite: 4, nomination: 3, anticorruption: 0.15, abolition: 15, abolitionDepuis: 2018 };
export const NOMS_FACTIONS: Record<Faction, string> = { loyaux: "ta faction", securitaires: "sécuritaires", reformateurs: "réformateurs" };
export const LIGNES: Record<Ligne, { nom: string; faction: Faction; aide: string }> = {
  croissance: { nom: "Croissance", faction: "loyaux", aide: "Rassure ta faction : +0,5 siège loyal au prochain Congrès." },
  securite: { nom: "Sécurité", faction: "securitaires", aide: "Ménage les sécuritaires : ils perdent moins de sièges, stabilité +2." },
  ouverture: { nom: "Ouverture", faction: "reformateurs", aide: "Séduit les réformateurs : influence économique +2 chez tes partenaires, mais −0,5 siège loyal." },
};
export const comiteDe = (e: EtatPartie) => (etatPouvoir(e).comite ??= { loyaux: 4, securitaires: 2, reformateurs: 1 });
const rivale = (c: Record<Faction, number>): Faction => (c.securitaires >= c.reformateurs ? "securitaires" : "reformateurs");
export function peutNommer(e: EtatPartie): string | null {
  if (e.joueur !== "CHN") return "Réservé au bloc Chine.";
  const c = comiteDe(e); if (c.loyaux >= COMITE.sieges) return "Tous les sièges sont déjà loyaux.";
  return e.camps.CHN.cp < COMITE.nomination ? `Capital politique insuffisant (${COMITE.nomination}).` : null;
}
export function nommer(e0: EtatPartie): EtatPartie {
  const err = peutNommer(e0); if (err) throw new Error(err);
  const e = structuredClone(e0), c = comiteDe(e); e.camps.CHN.cp -= COMITE.nomination; c[rivale(c)]--; c.loyaux++;
  return e;
}
export function anticorruption(e0: EtatPartie): EtatPartie {
  if (e0.joueur !== "CHN") throw new Error("Réservé au bloc Chine.");
  const c0 = comiteDe(structuredClone(e0)); if (c0.securitaires + c0.reformateurs === 0) throw new Error("Aucun siège rival à retirer.");
  const e = structuredClone(e0), c = comiteDe(e), f = rivale(c);
  c[f]--; c.loyaux++; e.pays.CHN.stabilite = outils.borne(e.pays.CHN.stabilite - 2, 0, 100);
  if (outils.tirer(e) < COMITE.anticorruption) {
    e.camps.CHN.cp = outils.borne(e.camps.CHN.cp - 5, 0, 100); if (e.dirigeants) e.dirigeants.CHN.popularite = Math.max(5, e.dirigeants.CHN.popularite - 5);
    outils.noter(e, { type: "politique", titre: "Pékin : la purge déclenche une crise interne", camp: "CHN", visiblePour: ["CHN"], texte: "Les réseaux visés résistent : capital politique −5, popularité −5." });
  }
  return e;
}
export function choisirLigne(e0: EtatPartie, l: Ligne): EtatPartie {
  if (e0.joueur !== "CHN") throw new Error("Réservé au bloc Chine.");
  if (e0.pouvoir?.ligneAnnee === date(e0.round).annee) throw new Error("Le plénum a déjà fixé la ligne cette année.");
  const e = structuredClone(e0), p = etatPouvoir(e); p.ligne = l; p.ligneAnnee = date(e.round).annee;
  if (l === "securite") e.pays.CHN.stabilite = outils.borne(e.pays.CHN.stabilite + 2, 0, 100);
  if (l === "ouverture") for (const i of Object.keys(e.pays)) if (i !== "CHN" && e.pays[i].influence.CHN.e >= 30) e.pays[i].influence.CHN.e = outils.borne(e.pays[i].influence.CHN.e + 2, 0, 100);
  return e;
}
export const peutAbolirLimite = (e: EtatPartie) => e.joueur !== "CHN" ? "Réservé au bloc Chine." : e.pouvoir?.limiteAbolie ? "Déjà abolie." : date(e.round).annee < COMITE.abolitionDepuis ? "Possible seulement après 2017." : e.camps.CHN.cp < COMITE.abolition ? `Capital politique insuffisant (${COMITE.abolition}).` : null;
export function abolirLimite(e0: EtatPartie): EtatPartie {
  const err = peutAbolirLimite(e0); if (err) throw new Error(err);
  const e = structuredClone(e0); e.camps.CHN.cp -= COMITE.abolition; etatPouvoir(e).limiteAbolie = true;
  for (const i of Object.keys(e.pays)) if (i !== "CHN" && e.pays[i].influence.OCC.p >= 40) outils.memoriser(e, i, "CHN", -1);
  outils.noter(e, { type: "politique", titre: "Pékin abolit la limite des mandats", camp: "CHN", visiblePour: [...CAMPS], texte: "Le dirigeant peut rester au-delà de dix ans ; méfiance accrue chez les alliés de Washington." });
  return e;
}
// Congrès du Parti (joueur chinois) : sièges redistribués selon le capital politique, la stabilité et la ligne du plénum ; sous 4 sièges loyaux, la faction majoritaire impose son successeur.
export function congresChine(e: EtatPartie): boolean {
  const c = comiteDe(e), p = etatPouvoir(e), anc = c.loyaux;
  const cible = 3 + (e.camps.CHN.cp - 50) / 15 + (e.pays.CHN.stabilite - 50) / 25 + (p.ligne === "croissance" ? 0.5 : p.ligne === "ouverture" ? -0.5 : 0) + (outils.tirer(e) - 0.5);
  const loyaux = Math.round(outils.borne((anc + cible) / 2, 1, COMITE.sieges)), reste = COMITE.sieges - loyaux;
  const sec = p.ligne === "securite" ? Math.ceil(reste / 2) : Math.round(reste * (c.securitaires + 0.5) / (c.securitaires + c.reformateurs + 1));
  p.comite = { loyaux, securitaires: sec, reformateurs: reste - sec };
  const garde = loyaux >= COMITE.majorite;
  outils.noter(e, { type: "politique", titre: `Congrès du Parti communiste chinois : ${loyaux} sièges loyaux sur 7`, camp: "CHN", visiblePour: [...CAMPS],
    texte: garde ? "Le dirigeant garde la main sur le Comité permanent." : `La faction ${NOMS_FACTIONS[rivale(p.comite)]} impose son candidat.` });
  return garde;
}
