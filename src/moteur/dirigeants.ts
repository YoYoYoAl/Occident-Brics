// Dirigeants des deux blocs (inspirés de Crusader Kings 3, simplifiés) : 4 aptitudes de 0 à 10, 2 traits, âge, santé, popularité.
// Noms fictifs. Succession : 3 candidats ; le joueur choisit (le mieux noté est installé d'office en attendant), l'IA prend le mieux noté.
import { CAMPS, type Camp } from "./types";
import type { EtatPartie } from "./partie";
import { outils } from "./partie";
import { date } from "./temps";

export type Aptitude = "diplomatie" | "strategie" | "intendance" | "intrigue";
export const APTITUDES: Record<Aptitude, { nom: string; aide: string }> = {
  diplomatie: { nom: "Diplomatie", aide: "Gains d'influence politique, culturelle et économique : +3 % par point au-dessus de 5 (−3 % en dessous)." },
  strategie: { nom: "Stratégie militaire", aide: "Score de guerre : +1,5 par trimestre et par point au-dessus de 5 ; avantage de départ des batailles." },
  intendance: { nom: "Intendance", aide: "Budget trimestriel : +2 % par point au-dessus de 5." },
  intrigue: { nom: "Intrigue", aide: "Risque d'être démasqué : −5 % par point au-dessus de 5 ; réussite des putschs +2 points par point." },
};
export const LISTE_APTITUDES = Object.keys(APTITUDES) as Aptitude[];
export type TraitDirigeant = "belliciste" | "pacificateur" | "charismatique" | "paranoiaque" | "corrompu" | "reformateur" | "populiste" | "prudent" | "stratege" | "malade" | "batisseur" | "intrigant";
export const TRAITS_DIRIGEANT: Record<TraitDirigeant, { nom: string; aide: string; apt?: Partial<Record<Aptitude, number>>; popularite?: number; valeur: number; contraire?: TraitDirigeant }> = {
  belliciste: { nom: "Belliciste", aide: "Casus belli « changement de régime » contre les pays alignés sur l'adversaire ; intervention possible dès 45 de capital politique ; expansion agressive +10 %.", valeur: 1, contraire: "pacificateur" },
  pacificateur: { nom: "Pacificateur", aide: "Diplomatie +1 ; l'expansion agressive retombe d'1 point de plus par trimestre ; une intervention coûte 5 de capital politique de plus.", apt: { diplomatie: 1 }, valeur: 1, contraire: "belliciste" },
  charismatique: { nom: "Charismatique", aide: "Diplomatie +1 ; popularité d'équilibre +10.", apt: { diplomatie: 1 }, popularite: 10, valeur: 3 },
  paranoiaque: { nom: "Paranoïaque", aide: "Intrigue +2, diplomatie −1.", apt: { intrigue: 2, diplomatie: -1 }, valeur: 0 },
  corrompu: { nom: "Corrompu", aide: "Intendance −2, intrigue +1 ; popularité d'équilibre −5.", apt: { intendance: -2, intrigue: 1 }, popularite: -5, valeur: -2, contraire: "reformateur" },
  reformateur: { nom: "Réformateur", aide: "Intendance +2.", apt: { intendance: 2 }, valeur: 2, contraire: "corrompu" },
  populiste: { nom: "Populiste", aide: "Popularité d'équilibre +8, diplomatie −1.", apt: { diplomatie: -1 }, popularite: 8, valeur: 1 },
  prudent: { nom: "Prudent", aide: "Expansion agressive −20 %.", valeur: 1 },
  stratege: { nom: "Stratège", aide: "Stratégie militaire +2.", apt: { strategie: 2 }, valeur: 2 },
  malade: { nom: "Malade", aide: "Perd sa santé deux fois plus vite.", valeur: -2 },
  batisseur: { nom: "Bâtisseur", aide: "Intendance +1, popularité d'équilibre +3.", apt: { intendance: 1 }, popularite: 3, valeur: 2 },
  intrigant: { nom: "Intrigant", aide: "Intrigue +2.", apt: { intrigue: 2 }, valeur: 1 },
};
export const LISTE_TRAITS_DIRIGEANT = Object.keys(TRAITS_DIRIGEANT) as TraitDirigeant[];
export interface Dirigeant { nom: string; naissance: number; sante: number; popularite: number; aptitudes: Record<Aptitude, number>; traits: TraitDirigeant[]; depuis: number }

const PRENOMS: Record<Camp, string[]> = {
  OCC: ["Daniel", "Margaret", "Robert", "Ellen", "Thomas", "Catherine", "Walter", "Laura", "Henry", "Diane", "Franklin", "Ruth", "Grant", "Helen"],
  CHN: ["Weiguo", "Jianhua", "Mingde", "Xiaoling", "Haoran", "Zhiqiang", "Lihua", "Guoqing", "Yifan", "Shumin", "Dewei", "Ruolan", "Changfeng", "Huimin"],
};
const NOMS: Record<Camp, string[]> = {
  OCC: ["Whitmore", "Calloway", "Hendricks", "Brennan", "Ashford", "Delaney", "Harlan", "Prescott", "Thornbury", "Talbot", "Winslow", "Garrison", "Langford", "Osgood"],
  CHN: ["Wang", "Li", "Zhang", "Liu", "Chen", "Yang", "Zhao", "Huang", "Zhou", "Wu", "Xu", "Sun", "Guo", "He"],
};
export const DIRIGEANT = { popularite: 50, rappel: 0.08, guerre: 2, intervention: 0.5, mandatOCC: 8, mandatCHN: 10, candidats: 3 };

const tirer = (e: EtatPartie) => outils.tirer(e);
function nouveau(e: EtatPartie, camp: Camp): Dirigeant {
  const { annee } = date(e.round), choisir = <T>(l: T[]) => l[Math.floor(tirer(e) * l.length)];
  const t1 = choisir(LISTE_TRAITS_DIRIGEANT);
  const t2 = choisir(LISTE_TRAITS_DIRIGEANT.filter(t => t !== t1 && t !== TRAITS_DIRIGEANT[t1].contraire && TRAITS_DIRIGEANT[t].contraire !== t1));
  const apt = Object.fromEntries(LISTE_APTITUDES.map(a => [a, 2 + Math.floor(tirer(e) * 7)])) as Record<Aptitude, number>; // 2 à 8
  const nom = camp === "OCC" ? `${choisir(PRENOMS.OCC)} ${choisir(NOMS.OCC)}` : `${choisir(NOMS.CHN)} ${choisir(PRENOMS.CHN)}`;
  return { nom, naissance: annee - (48 + Math.floor(tirer(e) * 20)), sante: 70 + Math.floor(tirer(e) * 31), popularite: 45 + Math.floor(tirer(e) * 16), aptitudes: apt, traits: [t1, t2], depuis: e.round };
}
export const noteDirigeant = (d: Dirigeant) => LISTE_APTITUDES.reduce((s, a) => s + d.aptitudes[a], 0) + d.traits.reduce((s, t) => s + TRAITS_DIRIGEANT[t].valeur, 0);
export function tirerDirigeants(e: EtatPartie) { e.dirigeants = { OCC: nouveau(e, "OCC"), CHN: nouveau(e, "CHN") }; e.succession = null; }
export function dirigeantDe(e: EtatPartie, camp: Camp): Dirigeant | null { return e.dirigeants?.[camp] ?? null; }
export const aTrait = (e: EtatPartie, camp: Camp, t: TraitDirigeant) => !!e.dirigeants?.[camp]?.traits.includes(t);
// Aptitude effective (base + traits), bornée de 0 à 10 ; 5 sans dirigeant (parties anciennes).
export function aptitude(e: EtatPartie, camp: Camp, a: Aptitude): number {
  const d = e.dirigeants?.[camp]; if (!d) return 5;
  return Math.max(0, Math.min(10, d.aptitudes[a] + d.traits.reduce((s, t) => s + (TRAITS_DIRIGEANT[t].apt?.[a] ?? 0), 0)));
}
export const ageDe = (e: EtatPartie, d: Dirigeant) => date(e.round).annee - d.naissance;
export const multDiplomatie = (e: EtatPartie, camp: Camp) => 1 + 0.03 * (aptitude(e, camp, "diplomatie") - 5);
export const multIntendance = (e: EtatPartie, camp: Camp) => 1 + 0.02 * (aptitude(e, camp, "intendance") - 5);
export const multRisque = (e: EtatPartie, camp: Camp) => 1 - 0.05 * (aptitude(e, camp, "intrigue") - 5);
export const bonusPutsch = (e: EtatPartie, camp: Camp) => 0.02 * (aptitude(e, camp, "intrigue") - 5);
export const bonusStrategie = (e: EtatPartie, camp: Camp) => aptitude(e, camp, "strategie") - 5;
export const equilibrePopularite = (e: EtatPartie, camp: Camp) => DIRIGEANT.popularite + (e.dirigeants?.[camp]?.traits.reduce((s, t) => s + (TRAITS_DIRIGEANT[t].popularite ?? 0), 0) ?? 0);
// Probabilité de maintien corrigée par la popularité : décalage logistique de (popularité − 50) / 20.
export function maintienAvecPopularite(e: EtatPartie, camp: Camp, p: number): number {
  const d = e.dirigeants?.[camp]; if (!d) return p;
  const q = Math.min(0.999, Math.max(0.001, p)), z = Math.log(q / (1 - q)) + (d.popularite - 50) / 20;
  return 1 / (1 + Math.exp(-z));
}

// Succession : le mieux noté des 3 candidats est installé ; le joueur peut en choisir un autre jusqu'à la fin du trimestre.
export function succession(e: EtatPartie, camp: Camp, raison: string) {
  const c = Array.from({ length: DIRIGEANT.candidats }, () => nouveau(e, camp)).sort((a, b) => noteDirigeant(b) - noteDirigeant(a));
  const ancien = e.dirigeants?.[camp]?.nom;
  (e.dirigeants ??= { OCC: c[0], CHN: c[0] })[camp] = c[0];
  if (camp === e.joueur) e.succession = { camp, candidats: c, round: e.round }; else if (e.succession?.camp === camp) e.succession = null;
  outils.noter(e, { type: "politique", titre: `${camp === "OCC" ? "Washington" : "Pékin"} : ${c[0].nom} succède à ${ancien ?? "son prédécesseur"}`, camp, visiblePour: [...CAMPS],
    texte: `${raison}. Nouveau dirigeant : ${c[0].traits.map(t => TRAITS_DIRIGEANT[t].nom.toLowerCase()).join(" et ")}.` });
}
export function choisirSuccesseur(e0: EtatPartie, camp: Camp, k: number): EtatPartie {
  const s = e0.succession; if (!s || s.camp !== camp || !s.candidats[k]) throw new Error("Aucune succession à arbitrer.");
  const e = structuredClone(e0); e.dirigeants![camp] = { ...e.succession!.candidats[k], depuis: e.round }; e.succession = null;
  return e;
}
// Fin de trimestre : popularité (vers l'équilibre, moins en guerre), santé (au 1er trimestre), décès.
export function suiviDirigeants(e: EtatPartie) {
  if (!e.dirigeants) return;
  if (e.succession && e.succession.round < e.round) e.succession = null; // sans choix : le mieux noté reste
  const { trimestre } = date(e.round);
  for (const camp of CAMPS) {
    const d = e.dirigeants[camp];
    d.popularite += DIRIGEANT.rappel * (equilibrePopularite(e, camp) - d.popularite) - (e.guerre ? DIRIGEANT.guerre : 0) - DIRIGEANT.intervention * e.interventions.filter(i => i.camp === camp).length;
    d.popularite = Math.max(5, Math.min(95, d.popularite));
    if (trimestre !== 1) continue;
    const age = ageDe(e, d), perte = (age > 60 ? 0.6 * (age - 60) : 0.5) + 3 * tirer(e);
    d.sante = Math.max(0, d.sante - perte * (d.traits.includes("malade") ? 2 : 1));
    if (d.sante <= 0) succession(e, camp, `${d.nom} meurt à ${age} ans`);
  }
}
// Après un scrutin : alternance = nouveau dirigeant ; continuité = même dirigeant sauf fin de mandats (8 ans aux États-Unis, 10 en Chine).
export function apresScrutin(e: EtatPartie, camp: Camp, alternance: boolean) {
  const d = e.dirigeants?.[camp]; if (!d) return;
  if (alternance) { succession(e, camp, "Alternance au pouvoir"); return; }
  if (e.round - d.depuis >= 4 * (camp === "OCC" ? DIRIGEANT.mandatOCC : DIRIGEANT.mandatCHN)) succession(e, camp, "Fin des mandats, le camp au pouvoir désigne un successeur");
}
