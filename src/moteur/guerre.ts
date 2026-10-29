// Guerre, casus belli et expansion agressive (inspirés d'Europa Universalis IV, simplifiés).
// Casus belli : justification d'une intervention ; il réduit l'expansion agressive (multiplicateur). Sans casus belli : agression (×3, capital politique −10).
// Expansion agressive (0-100) par camp et par région : pleine dans la région visée, moitié dans les régions voisines, quart ailleurs.
// Seuils : 25 = actions d'influence −15 % dans la région ; 50 = l'adversaire y gagne +1 d'influence politique par trimestre.
// Coalitions (façon EU4) : chaque pays a sa méfiance envers chaque bloc ; il adhère au-dessus de 50 et part sous 35.
// Interventions : but de guerre, score de guerre (−100 à +100), batailles décisives en duels, paix achetée avec le score.
import { CAMPS, adversaire, type Camp } from "./types";
import type { EtatPartie } from "./partie";
import { outils, alignement, nomPays, prochesDe } from "./partie";
import { ZONES } from "./zones";
import { aTrait, bonusStrategie, multRisque } from "./dirigeants";
import type { IdDuel } from "../duels/catalogue";
import { REGIONS_CLES, type Region } from "../data/regions";
import { PROFILS } from "../data/commerce";
import { niveauAlliance, bonusAllies, ALLIANCE } from "./alliances";

export type TypeCB = "defense" | "incident" | "antiterrorisme" | "humanitaire" | "adm" | "regime" | "rivalite";
export const CASUS_BELLI: Record<TypeCB, { nom: string; mult: number; duree: number; aide: string }> = {
  defense: { nom: "Défense d'un allié", mult: 0.25, duree: 4, aide: "Un pays sous ta garantie, ou un allié (0,40), est attaqué : riposte sur l'agresseur ou ses voisins hostiles." },
  incident: { nom: "Incident frontalier", mult: 0.5, duree: 8, aide: "Un incident militaire a eu lieu dans ce pays au cours de l'année." },
  antiterrorisme: { nom: "Lutte antiterroriste", mult: 0.5, duree: 8, aide: "Un attentat de masse a frappé ce pays au cours de l'année." },
  humanitaire: { nom: "Intervention humanitaire", mult: 0.75, duree: 6, aide: "Guerre civile, famine ou répression dans ce pays au cours de l'année." },
  adm: { nom: "Armes de destruction massive (dossier fabriqué)", mult: 0.75, duree: 12, aide: "Dossier monté par tes services : budget 2, capital politique 3, 30 % de risque de scandale (moins avec un dirigeant intrigant)." },
  regime: { nom: "Changement de régime", mult: 1, duree: 1, aide: "Dirigeant belliciste et pays aligné sur l'adversaire (au moins 0,40)." },
  rivalite: { nom: "Rivalité ouverte", mult: 1, duree: 2, aide: "Tension d'au moins 80 : seule justification d'une guerre directe contre l'autre puissance." },
};
export const AE = { intervention: 20, putsch: 15, putschRate: 10, renverser: 15, guerre: 30, victoire: 0.3, agression: 3, cpAgression: 10, declin: 2, declinPaix: 4, seuils: [25, 50, 75], malus: 0.85, gainAdverse: 1, plafondAdverse: 70, coalition: 3, plans: 0.7 };
export interface CasusBelli { camp: Camp; iso: string; type: TypeCB; fin: number }
export interface Coalition { contre: Camp; zone: string; membres: string[]; depuis: number; chef?: string } // zone : région du chef (affichage)

// Régions voisines (pour l'expansion agressive) ; la Russie compte avec l'Europe, le Canada n'a pas de région.
const VOISINES: Record<string, string[]> = {
  europe: ["moyen_orient", "asie_sud_centre"], moyen_orient: ["europe", "afrique", "asie_sud_centre"], afrique: ["moyen_orient"],
  asie_sud_centre: ["moyen_orient", "europe", "asie_est", "asie_sud_est"], asie_sud_est: ["asie_est", "asie_sud_centre"], asie_est: ["asie_sud_est", "asie_sud_centre"], amerique_latine: [],
};
export const LISTE_ZONES = Object.keys(ZONES);
// Puissances nucléaires (hors leaders) : pas d'intervention armée chez elles ; la Corée du Nord à partir de son premier essai (2006).
export const nucleaire = (iso: string, annee: number) => ["RUS", "GBR", "FRA", "IND", "PAK", "ISR"].includes(iso) || (iso === "PRK" && annee >= 2006);
export function zoneDe(iso: string): string | null {
  if (iso === "RUS") return "europe";
  for (const z of LISTE_ZONES) if (ZONES[z].pays.includes(iso)) return z;
  return null;
}
const borne = (v: number, a: number, b: number) => outils.borne(v, a, b);
const vers = (e: EtatPartie, camp: Camp, iso: string) => (camp === "OCC" ? 1 : -1) * alignement(e, iso);
export const aeDe = (e: EtatPartie, camp: Camp, zone: string) => e.ae?.[camp]?.[zone] ?? 0;
export const aeDuPays = (e: EtatPartie, camp: Camp, iso: string) => { const z = zoneDe(iso); return z ? aeDe(e, camp, z) : 0; };
export const coalitionContre = (e: EtatPartie, camp: Camp, iso: string) => (e.coalitions ?? []).find(c => c.contre === camp && c.membres.includes(iso)) ?? null;
export const coalitionDe = (e: EtatPartie, camp: Camp) => (e.coalitions ?? []).find(c => c.contre === camp) ?? null;
// ---------- Méfiance et coalition (une coalition au plus contre chaque bloc) ----------
// Méfiance d'un pays envers un bloc (0-100) : expansion agressive de sa région, rancune (mémoire négative ×3), voisin d'un pays
// attaqué ou occupé (+15), penchant vers l'adversaire (+20 × alignement), moins le penchant vers ce bloc (−40 × alignement) et l'apaisement.
export const COALITION = { adhesion: 50, depart: 35, minimum: 3, declencheur: 25, apaise: 10, rancune: 3, voisin: 15, versAdv: 20, versMoi: 40, freinBase: 0.1, freinParMembre: 0.05, freinMax: 0.4,
  commerceDes: 4, commerce: 0.02, commerceMax: 0.2, riposte: 3, riposteParMembre: 1, riposteMax: 10, soutien: 1, plafondSoutien: 70,
  apaiser: { budget: 1, cp: 2, gain: 15, max: 30, declin: 2 } };
const eligible = (e: EtatPartie, camp: Camp, iso: string) => iso !== "USA" && iso !== "CHN" && !!e.pays[iso] && vers(e, camp, iso) < 0.4 && !e.garanties?.some(g => g.iso === iso && g.camp === camp);
function menaces(e: EtatPartie, camp: Camp): Set<string> {
  const l = new Set<string>(), cibles = [...e.interventions.filter(i => i.camp === camp).map(i => i.iso), ...(e.controles ?? []).filter(c => c.camp === camp).map(c => c.iso)];
  for (const i of cibles) for (const v of prochesDe(e, i).voisins) l.add(v);
  return l;
}
export function mefiance(e: EtatPartie, camp: Camp, iso: string, voisins = menaces(e, camp)): number {
  if (!eligible(e, camp, iso)) return 0;
  const a = vers(e, camp, iso), rancune = Math.max(0, -(e.memoire?.[iso]?.[camp] ?? 0));
  return borne(aeDuPays(e, camp, iso) + COALITION.rancune * rancune + (voisins.has(iso) ? COALITION.voisin : 0)
    + COALITION.versAdv * Math.max(0, -a) - COALITION.versMoi * Math.max(0, a) - (e.apaisement?.[iso]?.[camp] ?? 0) - (niveauAlliance(e, camp, iso) >= 1 ? ALLIANCE.mefiance : 0), 0, 100);
}
// Frein d'une coalition sur les actions et les plans du bloc visé chez ses membres : 10 % + 5 % par membre, au plus 40 %.
export const freinCoalition = (c: Coalition) => Math.min(COALITION.freinMax, COALITION.freinBase + COALITION.freinParMembre * c.membres.length);
// Multiplicateur des actions d'influence d'un camp dans un pays : expansion agressive ≥ 25 dans sa région, frein de coalition s'il en est membre.
export const facteurAE = (e: EtatPartie, camp: Camp, iso: string) => { const c = coalitionContre(e, camp, iso); return (aeDuPays(e, camp, iso) >= AE.seuils[0] ? AE.malus : 1) * (c ? 1 - freinCoalition(c) : 1); };
// Multiplicateur de vitesse d'un plan qui vise au moins un membre d'une coalition contre le camp.
export const facteurPlanAE = (e: EtatPartie, camp: Camp, pays: string[]) => { const c = coalitionDe(e, camp); return c && pays.some(i => c.membres.includes(i)) ? 1 - freinCoalition(c) : 1; };
export function peutApaiser(e: EtatPartie, camp: Camp, iso: string): string | null {
  if (!eligible(e, camp, iso)) return "Pays non concerné (allié, garanti ou leader).";
  const c = e.camps[camp], A = COALITION.apaiser;
  if (c.apaise?.[iso] === Math.floor(e.round / 4)) return "Un geste d'apaisement par pays et par an.";
  if (c.budget < A.budget) return "Budget insuffisant."; if (c.cp < A.cp) return "Capital politique insuffisant.";
  return null;
}
// Apaiser (« améliorer les relations ») : méfiance −15 (cumul 30 au plus, −2 par trimestre), gratitude +1.
export function apaiser(e0: EtatPartie, camp: Camp, iso: string, surPlace = false): EtatPartie {
  const err = peutApaiser(e0, camp, iso); if (err) throw new Error(err);
  const e = surPlace ? e0 : structuredClone(e0), c = e.camps[camp], A = COALITION.apaiser;
  c.budget -= A.budget; c.cp = borne(c.cp - A.cp, 0, 100); (c.apaise ??= {})[iso] = Math.floor(e.round / 4);
  const ap = ((e.apaisement ??= {})[iso] ??= { OCC: 0, CHN: 0 }); ap[camp] = Math.min(A.max, ap[camp] + A.gain); outils.memoriser(e, iso, camp, 1);
  outils.noter(e, { type: "action", titre: `Apaisement : ${nomPays(iso)}`, camp, pays: [iso], visiblePour: [...CAMPS], texte: `Visites, aides et garanties de bonne conduite : méfiance −${A.gain}.` });
  return e;
}

export function gagnerAE(e: EtatPartie, camp: Camp, iso: string, base: number) {
  const z = zoneDe(iso), k = base * (aTrait(e, camp, "belliciste") ? 1.1 : 1) * (aTrait(e, camp, "prudent") ? 0.8 : 1);
  const a = ((e.ae ??= { OCC: {}, CHN: {} })[camp] ??= {});
  for (const x of LISTE_ZONES) a[x] = borne((a[x] ?? 0) + k * (x === z ? 1 : z && VOISINES[z].includes(x) ? 0.5 : 0.25), 0, 100);
  return k;
}

// ---------- Casus belli ----------
export function casusBelliDe(e: EtatPartie, camp: Camp, iso: string): CasusBelli | null {
  const l = (e.casusBelli ?? []).filter(c => c.camp === camp && c.iso === iso && c.fin >= e.round);
  return l.sort((a, b) => CASUS_BELLI[a.type].mult - CASUS_BELLI[b.type].mult)[0] ?? null;
}
function accorder(e: EtatPartie, camp: Camp, iso: string, type: TypeCB) {
  const l = (e.casusBelli ??= []), fin = e.round + CASUS_BELLI[type].duree, x = l.find(c => c.camp === camp && c.iso === iso && c.type === type);
  if (x) x.fin = Math.max(x.fin, fin); else l.push({ camp, iso, type, fin });
}
const FAMILLES_HUMANITAIRES = ["guerre_civile", "famine", "repression", "crise_migratoire"];
// Mise à jour chaque trimestre : expiration, puis justifications tirées de la situation (journal de l'année, garanties, tension).
export function majCasusBelli(e: EtatPartie) {
  e.casusBelli = (e.casusBelli ?? []).filter(c => c.fin >= e.round);
  const recents = e.journal.filter(j => j.round > e.round - 4 && j.pays?.length === 1 && j.famille);
  for (const camp of CAMPS) {
    const adv = adversaire(camp);
    if (e.tension >= 80) accorder(e, camp, adv === "OCC" ? "USA" : "CHN", "rivalite");
    for (const j of recents) {
      const iso = j.pays![0]; if (iso === "USA" || iso === "CHN" || !e.pays[iso] || vers(e, camp, iso) >= 0.4) continue;
      if (j.famille === "attentat") accorder(e, camp, iso, "antiterrorisme");
      if (j.famille === "incident_militaire") accorder(e, camp, iso, "incident");
      if (FAMILLES_HUMANITAIRES.includes(j.famille!)) accorder(e, camp, iso, "humanitaire");
    }
    // un allié (garantie ou alignement ≥ 0,40) attaqué : casus belli sur l'autre puissance et sur les voisins hostiles de l'allié
    for (const it of e.interventions.filter(i => i.camp === adv)) {
      const allie = e.garanties?.some(g => g.iso === it.iso && g.camp === camp) || vers(e, camp, it.iso) >= 0.4;
      if (!allie) continue;
      accorder(e, camp, adv === "OCC" ? "USA" : "CHN", "defense");
      for (const v of prochesDe(e, it.iso).voisins) if (v !== "USA" && v !== "CHN" && e.pays[v] && vers(e, camp, v) <= -0.2) accorder(e, camp, v, "defense");
    }
    if (aTrait(e, camp, "belliciste")) for (const iso of Object.keys(e.pays)) if (iso !== "USA" && iso !== "CHN" && vers(e, camp, iso) <= -0.4) accorder(e, camp, iso, "regime");
  }
}
export const FABRIQUER = { budget: 2, cp: 3, risque: 0.3, scandaleCp: 8 };
export function peutFabriquer(e: EtatPartie, camp: Camp, iso: string): string | null {
  if (iso === "USA" || iso === "CHN" || !e.pays[iso]) return "Pays invalide.";
  if (vers(e, camp, iso) >= 0.4) return "On ne monte pas de dossier contre un allié.";
  if ((e.casusBelli ?? []).some(c => c.camp === camp && c.iso === iso && c.type === "adm" && c.fin >= e.round)) return "Dossier déjà monté contre ce pays.";
  const c = e.camps[camp];
  if (c.fabrique === Math.floor(e.round / 4)) return "Un dossier par an.";
  if (c.budget < FABRIQUER.budget) return "Budget insuffisant.";
  if (c.cp < FABRIQUER.cp) return "Capital politique insuffisant.";
  return null;
}
export function fabriquerCasusBelli(e0: EtatPartie, camp: Camp, iso: string): EtatPartie {
  const err = peutFabriquer(e0, camp, iso); if (err) throw new Error(err);
  const e = structuredClone(e0), c = e.camps[camp];
  c.budget -= FABRIQUER.budget; c.cp = borne(c.cp - FABRIQUER.cp, 0, 100); c.fabrique = Math.floor(e.round / 4);
  if (outils.tirer(e) < FABRIQUER.risque * multRisque(e, camp)) {
    c.cp = borne(c.cp - FABRIQUER.scandaleCp, 0, 100); e.tension = borne(e.tension + 3, 0, 100); outils.memoriser(e, iso, camp, -3);
    outils.noter(e, { type: "action", titre: `Scandale : un dossier d'armes de destruction massive fabriqué contre ${nomPays(iso)}`, famille: "scandale_dirigeant", camp, pays: [iso], visiblePour: [...CAMPS],
      texte: `Des fuites révèlent que les preuves ont été montées. Capital politique −${FABRIQUER.scandaleCp}, tension +3 ; aucun casus belli.` });
  } else {
    accorder(e, camp, iso, "adm");
    outils.noter(e, { type: "action", titre: `Dossier d'armes de destruction massive : ${nomPays(iso)}`, camp, pays: [iso], visiblePour: [camp], texte: `Casus belli pour ${CASUS_BELLI.adm.duree / 4} ans (expansion agressive ×${CASUS_BELLI.adm.mult}).` });
  }
  return e;
}
// Expansion agressive d'une intervention ou d'une guerre : base × multiplicateur du meilleur casus belli (consommé), ou agression.
export function justifier(e: EtatPartie, camp: Camp, iso: string, base: number): { cb: TypeCB | null; ae: number } {
  const cb = casusBelliDe(e, camp, iso);
  if (cb) e.casusBelli = e.casusBelli!.filter(x => x !== cb);
  else { e.camps[camp].cp = borne(e.camps[camp].cp - AE.cpAgression, 0, 100);
    for (const i of ZONES[zoneDe(iso) ?? ""]?.pays ?? []) if (e.pays[i] && i !== iso) outils.memoriser(e, i, camp, -1); }
  return { cb: cb?.type ?? null, ae: gagnerAE(e, camp, iso, base * (cb ? CASUS_BELLI[cb.type].mult : AE.agression)) };
}

// ---------- Expansion agressive : effets de seuil, coalition, déclin ----------
const plusGros = (e: EtatPartie, zone: string, n: number, sauf: (i: string) => boolean) =>
  ZONES[zone].pays.filter(i => e.pays[i] && !sauf(i)).sort((a, b) => e.pays[b].pib - e.pays[a].pib).slice(0, n);
export function suiviExpansion(e: EtatPartie) {
  e.ae ??= { OCC: {}, CHN: {} }; e.coalitions ??= [];
  for (const camp of CAMPS) {
    const adv = adversaire(camp), a = (e.ae[camp] ??= {});
    for (const z of LISTE_ZONES) {
      const v = a[z] ?? 0;
      if (v >= AE.seuils[1]) for (const i of plusGros(e, z, 3, () => false)) { const p = e.pays[i].influence[adv]; if (p.p < AE.plafondAdverse) p.p = Math.min(AE.plafondAdverse, p.p + AE.gainAdverse); }
      const enGuerre = e.interventions.some(i => i.camp === camp && zoneDe(i.iso) === z);
      a[z] = Math.max(0, v - (enGuerre ? AE.declin : AE.declinPaix) - (aTrait(e, camp, "pacificateur") ? 1 : 0));
    }
    suiviCoalition(e, camp);
  }
  for (const iso of Object.keys(e.apaisement ?? {})) for (const c of CAMPS) e.apaisement![iso][c] = Math.max(0, e.apaisement![iso][c] - COALITION.apaiser.declin);
}
const nomBlocG = (c: Camp) => c === "OCC" ? "bloc USA" : "bloc Chine";
// Adhésions et départs selon la méfiance, chef (plus grande économie), soutien de l'autre bloc, commerce, riposte aux interventions.
function suiviCoalition(e: EtatPartie, camp: Camp) {
  // il faut un déclencheur : expansion agressive ≥ 25 dans la région du pays, ou un voisin attaqué ou occupé (pas de coalition par simple rancune)
  const adv = adversaire(camp), v = menaces(e, camp), declenche = (i: string) => v.has(i) || aeDuPays(e, camp, i) >= COALITION.declencheur;
  const m = (i: string) => mefiance(e, camp, i, v), entre = (i: string) => declenche(i) && m(i) >= COALITION.adhesion;
  let co = coalitionDe(e, camp);
  if (!co) {
    const candidats = Object.keys(e.pays).filter(entre);
    if (candidats.length < COALITION.minimum) return;
    co = { contre: camp, zone: "", membres: candidats, depuis: e.round }; e.coalitions!.push(co);
    outils.noter(e, { type: "politique", titre: `Coalition contre le ${nomBlocG(camp)}`, pays: candidats, visiblePour: [...CAMPS],
      texte: `${candidats.map(nomPays).join(", ")} s'engagent à se défendre mutuellement contre le ${nomBlocG(camp)}.` });
  } else {
    const partent = co.membres.filter(i => m(i) < COALITION.depart || (!v.has(i) && aeDuPays(e, camp, i) < COALITION.apaise)), entrent = Object.keys(e.pays).filter(i => !co!.membres.includes(i) && entre(i));
    co.membres = co.membres.filter(i => !partent.includes(i)).concat(entrent);
    if (entrent.length) outils.noter(e, { type: "politique", titre: `${entrent.map(nomPays).join(", ")} rejoin${entrent.length > 1 ? "nent" : "t"} la coalition contre le ${nomBlocG(camp)}`, pays: entrent, visiblePour: [...CAMPS], texte: `La coalition compte ${co.membres.length} membres.` });
    if (partent.length) outils.noter(e, { type: "politique", titre: `${partent.map(nomPays).join(", ")} quitte${partent.length > 1 ? "nt" : ""} la coalition contre le ${nomBlocG(camp)}`, pays: partent, visiblePour: [...CAMPS], texte: "La méfiance est retombée." });
    if (co.membres.length < 2) { e.coalitions = e.coalitions!.filter(c => c !== co);
      outils.noter(e, { type: "politique", titre: `La coalition contre le ${nomBlocG(camp)} se dissout`, pays: co.membres, visiblePour: [...CAMPS], texte: "Trop peu de pays la soutiennent encore." }); return; }
  }
  co.chef = co.membres.slice().sort((a, b) => e.pays[b].pib - e.pays[a].pib)[0]; co.zone = zoneDe(co.chef) ?? "";
  const n = co.membres.length;
  for (const i of co.membres) { const p = e.pays[i].influence[adv]; if (p.p < COALITION.plafondSoutien) p.p = Math.min(COALITION.plafondSoutien, p.p + COALITION.soutien); e.pays[i].influence[camp].p = Math.max(0, e.pays[i].influence[camp].p - 1); }
  if (n >= COALITION.commerceDes) e.pays[camp === "OCC" ? "USA" : "CHN"].bonus.push({ points: -Math.min(COALITION.commerceMax, COALITION.commerce * (n - COALITION.commerceDes + 1)), reste: 1 });
  // riposte : la coalition soutient le pays envahi s'il est membre, voisin d'un membre ou dans la région du chef
  for (const it of e.interventions.filter(i => i.camp === camp) as Intervention[]) {
    const proche = co.membres.includes(it.iso) || co.membres.some(i => prochesDe(e, i).voisins.includes(it.iso)) || zoneDe(it.iso) === co.zone;
    if (!proche) continue;
    const k = Math.min(COALITION.riposteMax, COALITION.riposte + COALITION.riposteParMembre * n); it.score = borne((it.score ?? 0) - k, -100, 100);
    if (!it.coalition) { it.coalition = true; outils.noter(e, { type: "action", titre: `La coalition entre en guerre aux côtés ${nomPays(it.iso) ? `de « ${nomPays(it.iso)} »` : ""}`, camp, pays: [it.iso, co.chef!], visiblePour: [...CAMPS], texte: `Armes, volontaires et renseignement : ton score de guerre baisse de ${k} par trimestre.` }); }
  }
}

// ---------- Interventions : but, score de guerre, batailles, paix ----------
export type ButGuerre = "regime" | "base" | "punitive";
export const BUTS: Record<ButGuerre, { nom: string; cout: number; aide: string }> = {
  regime: { nom: "Changement de régime", cout: 60, aide: "Installer un régime ami : influence politique au moins 60, adverse au plus 15." },
  base: { nom: "Base permanente", cout: 40, aide: "Base et garantie de défense : influence militaire +15." },
  punitive: { nom: "Expédition punitive", cout: 25, aide: "Briser l'influence adverse : influence militaire et politique adverses −15." },
};
export type TermeFixe = ButGuerre | "reparations" | "influence" | "demilitarisation";
export type TermePaix = TermeFixe | `region:${string}` | `annexe:${string}`; // garder une région occupée, ou l'annexer
export const TERMES: Record<TermeFixe, { nom: string; cout: number }> = {
  regime: { nom: "Régime ami", cout: 60 }, base: { nom: "Base militaire et garantie", cout: 40 }, punitive: { nom: "Influence adverse brisée", cout: 25 },
  reparations: { nom: "Réparations (budget +3)", cout: 20 }, influence: { nom: "Influence politique +10", cout: 15 }, demilitarisation: { nom: "Démilitarisation (militaire adverse −15)", cout: 20 },
};
export const SCORE = { base: 4, forces: 20, strategie: 1.5, alea: 16, usure: 3, bataille: 60, batailles: [1, 4], fin: 100 };
export const TYPES_BATAILLE: IdDuel[] = ["memoire44", "stratego", "streetfighter"];
export interface Intervention { iso: string; camp: Camp; fin: number; debut?: number; score?: number; but?: ButGuerre; cb?: TypeCB | null; occupees?: string[]; coalition?: boolean; appels?: Camp[] } // appels : alliés intégrés de l'autre camp qui ont appelé à l'aide

// ---------- Régions : 30 pays clés découpés en permanence, les autres seulement en cas de guerre ----------
export interface Controle { iso: string; region: string; camp: Camp; depuis: number; annexion?: boolean } // annexion : définitive, la région compte pour le bloc dans le score
export const REGION = { budgetRessource: 0.1, budgetStrat: 0.05, stabilite: 1, revolte: 0.1, seuilRevolte: -0.2, baseM: 1, plafondM: 80, rendreAE: 10, rendreMemoire: 3, annexion: 1.5, aeAnnexion: 2 };
// Découpage générique : région de la capitale (50 % de la population), nord (30 %), sud (20 %) ; les ressources du pays réparties en tourniquet.
export function decoupageGenerique(iso: string): Region[] {
  const l: Region[] = [{ id: "capitale", nom: "Capitale et centre", pop: 0.5, ressources: [], strat: 2 }, { id: "nord", nom: "Nord", pop: 0.3, ressources: [], strat: 1 }, { id: "sud", nom: "Sud", pop: 0.2, ressources: [], strat: 1 }];
  (PROFILS[iso]?.offre ?? []).forEach((b, k) => l[(k + 1) % 3].ressources.push(b));
  return l;
}
export const regionsCles = (iso: string) => REGIONS_CLES[iso] ?? null;
export const regionsDe = (iso: string): Region[] => REGIONS_CLES[iso] ?? decoupageGenerique(iso);
export const regionDe = (iso: string, id: string) => regionsDe(iso).find(r => r.id === id) ?? null;
export const coutRegion = (r: Region) => Math.round(10 + 30 * r.pop + 5 * r.strat);
export const controleur = (e: EtatPartie, iso: string, id: string) => (e.controles ?? []).find(c => c.iso === iso && c.region === id)?.camp ?? null;
export const coutTerme = (t: TermePaix, iso: string) => t.startsWith("region:") ? coutRegion(regionDe(iso, t.slice(7))!) : t.startsWith("annexe:") ? Math.round(REGION.annexion * coutRegion(regionDe(iso, t.slice(7))!)) : TERMES[t as TermeFixe].cout;
export const nomTerme = (t: TermePaix, iso: string) => t.startsWith("region:") ? `occuper ${regionDe(iso, t.slice(7))?.nom ?? t.slice(7)}` : t.startsWith("annexe:") ? `annexer ${regionDe(iso, t.slice(7))?.nom ?? t.slice(7)}` : TERMES[t as TermeFixe].nom;
// Part de la population d'un pays annexée par un camp (somme des régions annexées).
export function partAnnexee(e: EtatPartie, camp: Camp, iso: string): number {
  if (!e.controles?.length) return 0;
  let s = 0; for (const c of e.controles) if (c.annexion && c.iso === iso && c.camp === camp) s += regionDe(iso, c.region)?.pop ?? 0;
  return Math.min(1, s);
}
// Occupation : la part des régions tenues suit le score de guerre (aucune à 0, toutes à 100), les plus stratégiques d'abord.
function majOccupation(e: EtatPartie, it: Intervention) {
  const l = regionsDe(it.iso).slice().sort((a, b) => b.strat - a.strat || b.pop - a.pop), k = Math.min(l.length, Math.floor(l.length * Math.max(0, it.score ?? 0) / 100 + 0.5));
  const avant = it.occupees ?? [], apres = l.slice(0, k).map(r => r.id);
  for (const id of apres.filter(x => !avant.includes(x))) outils.noter(e, { type: "action", titre: `${nomPays(it.iso)} : prise de la région « ${regionDe(it.iso, id)!.nom} »`, camp: it.camp, pays: [it.iso], visiblePour: [...CAMPS], texte: `Les troupes du ${it.camp === "OCC" ? "bloc USA" : "bloc Chine"} tiennent désormais cette région.` });
  for (const id of avant.filter(x => !apres.includes(x))) outils.noter(e, { type: "action", titre: `${nomPays(it.iso)} : la région « ${regionDe(it.iso, id)!.nom} » est reprise`, camp: it.camp, pays: [it.iso], visiblePour: [...CAMPS], texte: "Les défenseurs regagnent du terrain." });
  it.occupees = apres;
}
// Régions gardées après une paix : recettes (ressources, valeur stratégique), base, instabilité du pays, révolte possible.
export function suiviRegions(e: EtatPartie) {
  for (const c of [...(e.controles ?? [])]) {
    const r = regionDe(c.iso, c.region), p = e.pays[c.iso]; if (!r || !p) continue;
    e.camps[c.camp].budget += REGION.budgetRessource * r.ressources.length + REGION.budgetStrat * r.strat;
    p.stabilite = borne(p.stabilite - REGION.stabilite, 0, 100);
    if (r.base) p.influence[c.camp].m = Math.min(REGION.plafondM, p.influence[c.camp].m + REGION.baseM);
    if (!c.annexion && vers(e, c.camp, c.iso) < REGION.seuilRevolte && outils.tirer(e) < REGION.revolte) {
      e.controles = e.controles!.filter(x => x !== c);
      outils.noter(e, { type: "action", titre: `${nomPays(c.iso)} : révolte, la région « ${r.nom} » chasse l'occupant`, camp: c.camp, pays: [c.iso], visiblePour: [...CAMPS], texte: "Le pays penche trop vers l'autre bloc : l'occupation n'est plus tenable." });
    }
  }
}
// Annexion différée : une région occupée depuis 2 ans peut être annexée sans nouvelle guerre (capital politique, expansion agressive),
// si le pays ne penche pas vers l'adversaire (sinon la population résiste).
export const ANNEXION = { delai: 8, cp: 10, seuil: -0.2 };
export function peutAnnexerRegion(e: EtatPartie, camp: Camp, iso: string, id: string): string | null {
  const c = (e.controles ?? []).find(x => x.iso === iso && x.region === id && x.camp === camp);
  if (!c) return "Ton bloc n'occupe pas cette région.";
  if (c.annexion) return "Région déjà annexée.";
  const reste = c.depuis + ANNEXION.delai - e.round; if (reste > 0) return `Annexion possible après 2 ans d'occupation (encore ${reste} trimestre${reste > 1 ? "s" : ""}).`;
  if (e.camps[camp].cp < ANNEXION.cp) return `Capital politique ${ANNEXION.cp} requis.`;
  if (vers(e, camp, iso) < ANNEXION.seuil) return "Le pays penche trop vers l'adversaire : la population résiste à l'annexion.";
  return null;
}
export function annexerRegion(e0: EtatPartie, camp: Camp, iso: string, id: string): EtatPartie {
  const err = peutAnnexerRegion(e0, camp, iso, id); if (err) throw new Error(err);
  const e = structuredClone(e0), c = e.controles!.find(x => x.iso === iso && x.region === id)!, r = regionDe(iso, id)!;
  c.annexion = true; e.camps[camp].cp = borne(e.camps[camp].cp - ANNEXION.cp, 0, 100); outils.memoriser(e, iso, camp, -3);
  const k = gagnerAE(e, camp, iso, AE.victoire * coutRegion(r));
  outils.noter(e, { type: "action", titre: `${nomPays(iso)} : annexion de la région « ${r.nom} »`, camp, pays: [iso], visiblePour: [...CAMPS],
    texte: `Après 2 ans d'occupation, la région est rattachée au ${camp === "OCC" ? "bloc USA" : "bloc Chine"} : capital politique −${ANNEXION.cp}, expansion agressive +${Math.round(k)}, rancune du pays. Elle compte désormais pour ton bloc dans le score.` });
  return e;
}
export function rendreRegion(e0: EtatPartie, camp: Camp, iso: string, id: string): EtatPartie {
  if (controleur(e0, iso, id) !== camp) throw new Error("Ton bloc ne contrôle pas cette région.");
  const e = structuredClone(e0); e.controles = e.controles!.filter(c => !(c.iso === iso && c.region === id));
  outils.memoriser(e, iso, camp, REGION.rendreMemoire);
  const z = zoneDe(iso), a = e.ae?.[camp]; if (z && a) a[z] = Math.max(0, (a[z] ?? 0) - REGION.rendreAE);
  outils.noter(e, { type: "action", titre: `${nomPays(iso)} : la région « ${regionDe(iso, id)!.nom} » est rendue`, camp, pays: [iso], visiblePour: [...CAMPS], texte: `Geste de détente : gratitude du pays, expansion agressive −${REGION.rendreAE} dans la région.` });
  return e;
}
const forces = (e: EtatPartie, it: Intervention) => (e.pays[it.iso].influence[it.camp].m - e.pays[it.iso].influence[adversaire(it.camp)].m) / 100;
export const avantageBataille = (e: EtatPartie, it: Intervention) => borne(2 * forces(e, it) + 0.08 * (bonusStrategie(e, it.camp) - bonusStrategie(e, adversaire(it.camp))), -1, 1);

export function changerBut(e0: EtatPartie, camp: Camp, iso: string, but: ButGuerre): EtatPartie {
  const e = structuredClone(e0), it = e.interventions.find(i => i.iso === iso && i.camp === camp) as Intervention | undefined;
  if (!it) throw new Error("Aucune intervention de ton camp dans ce pays.");
  it.but = but; return e;
}
export function termesPossibles(e: EtatPartie, it: Intervention): number { return Math.max(0, Math.round(it.score ?? 0)); }
function appliquerTermes(e: EtatPartie, it: Intervention, termes: TermePaix[]) {
  const p = e.pays[it.iso], moi = p.influence[it.camp], adv = p.influence[adversaire(it.camp)];
  for (const t of termes) {
    if (t === "regime") { moi.p = Math.max(moi.p, 60); adv.p = Math.min(adv.p, 15); }
    if (t === "base") { moi.m = borne(moi.m + 15, 0, 100); if (!e.garanties?.some(g => g.iso === it.iso)) (e.garanties ??= []).push({ iso: it.iso, camp: it.camp }); }
    if (t === "punitive") { adv.m = Math.max(0, adv.m - 15); adv.p = Math.max(0, adv.p - 15); }
    if (t === "reparations") e.camps[it.camp].budget += 3;
    if (t === "influence") moi.p = borne(moi.p + 10, 0, 100);
    if (t === "demilitarisation") adv.m = Math.max(0, adv.m - 15);
    if (t.startsWith("region:")) (e.controles ??= []).push({ iso: it.iso, region: t.slice(7), camp: it.camp, depuis: e.round });
    if (t.startsWith("annexe:")) (e.controles ??= []).push({ iso: it.iso, region: t.slice(7), camp: it.camp, depuis: e.round, annexion: true });
  }
  const cout = termes.reduce((s, t) => s + coutTerme(t, it.iso) * (t.startsWith("annexe:") ? REGION.aeAnnexion : 1), 0); // une annexion pèse double
  if (cout) gagnerAE(e, it.camp, it.iso, AE.victoire * cout);
}
// Paix signée par le camp qui intervient : termes achetés avec le score de guerre (paix blanche toujours possible).
export function peutSignerPaix(e: EtatPartie, camp: Camp, iso: string, termes: TermePaix[]): string | null {
  const it = e.interventions.find(i => i.iso === iso && i.camp === camp) as Intervention | undefined;
  if (!it) return "Aucune intervention de ton camp dans ce pays.";
  if (new Set(termes).size !== termes.length) return "Un terme ne peut figurer qu'une fois.";
  const r = termes.find(t => (t.startsWith("region:") || t.startsWith("annexe:")) && !(it.occupees ?? []).includes(t.slice(7))); if (r) return "On ne peut garder ou annexer qu'une région occupée.";
  if (termes.some(t => t.startsWith("region:") && termes.includes(`annexe:${t.slice(7)}`))) return "Une région est soit occupée, soit annexée.";
  const cout = termes.reduce((s, t) => s + coutTerme(t, iso), 0);
  if (cout > termesPossibles(e, it)) return `Score de guerre insuffisant (${cout} demandés, ${termesPossibles(e, it)} disponibles).`;
  return null;
}
export function signerPaix(e0: EtatPartie, camp: Camp, iso: string, termes: TermePaix[]): EtatPartie {
  const err = peutSignerPaix(e0, camp, iso, termes); if (err) throw new Error(err);
  const e = structuredClone(e0), it = e.interventions.find(i => i.iso === iso && i.camp === camp) as Intervention;
  appliquerTermes(e, it, termes); terminer(e, it, termes.length ? `Paix signée : ${termes.map(t => nomTerme(t, iso).toLowerCase()).join(", ")}` : "Paix blanche : retrait sans conditions");
  return e;
}
function terminer(e: EtatPartie, it: Intervention, titre: string) {
  e.interventions = e.interventions.filter(i => i !== it); e.conflits = e.conflits.filter(c => c.iso !== it.iso);
  e.duels = (e.duels ?? []).filter(d => d.plan !== `guerre:${it.iso}`);
  outils.noter(e, { type: "action", titre: `${nomPays(it.iso)} : ${titre}`, camp: it.camp, pays: [it.iso], visiblePour: [...CAMPS], texte: `Score de guerre final : ${Math.round(it.score ?? 0)}.` });
}
// Termes que l'IA (ou les conseillers à l'échéance) exigent : le but d'abord, puis le reste par coût décroissant.
export function termesAuto(e: EtatPartie, it: Intervention): TermePaix[] {
  let reste = termesPossibles(e, it); const l: TermePaix[] = [];
  const regions = (it.occupees ?? []).map(id => `region:${id}` as TermePaix); // les régions occupées, les plus stratégiques d'abord
  for (const t of [it.but ?? "regime", "base", ...regions, "punitive", "demilitarisation", "reparations", "influence"] as TermePaix[]) if (!l.includes(t) && coutTerme(t, it.iso) <= reste) { l.push(t); reste -= coutTerme(t, it.iso); }
  return l;
}
// Bataille décisive : duel si le joueur intervient (attaquant) ou soutient la défense (influence militaire ≥ 20), sinon réglée d'office.
function bataille(e: EtatPartie, it: Intervention, resolution: (av: number) => number) {
  const j = e.joueur, adv = adversaire(it.camp), av = avantageBataille(e, it);
  const joueurConcerne = j && e.reglages.ia && (j === it.camp || (j === adv && e.pays[it.iso].influence[adv].m >= 20));
  if (joueurConcerne) {
    (e.duels ??= []).push({ id: `bataille_${it.iso}_${e.round}`, plan: `guerre:${it.iso}`, type: TYPES_BATAILLE[Math.floor(outils.tirer(e) * TYPES_BATAILLE.length)], attaquant: it.camp, defenseur: adv,
      avantage: av, round: e.round, graine: 1 + Math.floor(outils.tirer(e) * 2147483646), motif: "bataille", titre: `Bataille décisive ${nomPays(it.iso) === it.iso ? "" : `(${nomPays(it.iso)})`}`.trim() });
  } else appliquerBataille(e, it.iso, resolution(av));
}
export function appliquerBataille(e: EtatPartie, iso: string, r: number) {
  const it = e.interventions.find(i => i.iso === iso) as Intervention | undefined; if (!it) return;
  it.score = borne((it.score ?? 0) + SCORE.bataille * (r - 0.5), -100, 100);
}
export function suiviGuerres(e: EtatPartie, resolution: (av: number) => number) {
  for (const it of [...e.interventions] as Intervention[]) {
    it.debut ??= it.fin - 7; it.score ??= 0; it.but ??= "regime";
    const duree = e.round - it.debut;
    if (duree > 0) {
      const d = SCORE.base + bonusAllies(e, it) + SCORE.forces * forces(e, it) + SCORE.strategie * bonusStrategie(e, it.camp) + SCORE.alea * (outils.tirer(e) - 0.5) - (duree > 4 ? SCORE.usure * (duree - 4) : 0);
      it.score = borne(it.score + d, -100, 100);
    }
    if (SCORE.batailles.includes(duree)) bataille(e, it, resolution);
    majOccupation(e, it);
    const c = e.camps[it.camp]; c.budget = Math.max(0, c.budget - 1); c.fatigue = (c.fatigue ?? 0) + 0.5;
    if (Math.abs(it.score) >= SCORE.fin || it.fin <= e.round) {
      if (it.camp === e.joueur && it.score > 0 && it.fin > e.round) continue; // le joueur choisit lui-même ses termes tant que l'intervention dure
      if (it.score > 0) { const t = termesAuto(e, it); appliquerTermes(e, it, t); terminer(e, it, t.length ? `victoire, ${t.map(x => nomTerme(x, it.iso).toLowerCase()).join(", ")}` : "paix blanche"); }
      else { const p = e.pays[it.iso].influence[it.camp]; p.p = borne(p.p - 10, 0, 100); c.cp = borne(c.cp - 8, 0, 100); terminer(e, it, "enlisement et retrait (influence politique −10, capital politique −8)"); }
    }
  }
}
export const dansZone = (iso: string, zone: string) => zoneDe(iso) === zone;
export { vers as penche };
