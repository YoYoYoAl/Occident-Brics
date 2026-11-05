// Alliances stratégiques à trois niveaux : 1 partenariat stratégique, 2 garantie de défense (action « garantie » existante),
// 3 alliance militaire intégrée (façon OTAN). Rompre coûte du capital politique et de la confiance ; une alliance intégrée oblige à répondre aux appels.
import { CAMPS, adversaire, type Camp } from "./types";
import type { EtatPartie } from "./partie";
import { outils, alignement, nomPays, prochesDe } from "./partie";
import { zoneDe, mefiance, peutApaiser, apaiser, type Intervention } from "./guerre";

export type Niveau = 1 | 3;
export interface Alliance { iso: string; camp: Camp; niveau: Niveau; depuis: number }
export const NIVEAUX: Record<1 | 2 | 3, { nom: string; seuil: number; budget: number; cp: number; aide: string }> = {
  1: { nom: "Partenariat stratégique", seuil: 0.2, budget: 2, cp: 3, aide: "Influence économique +4 et politique +3, puis +0,5 d'influence économique par trimestre (jusqu'à 70) ; méfiance du pays envers toi −15." },
  2: { nom: "Garantie de défense", seuil: 0.4, budget: 3, cp: 0, aide: "Action « garantie » : l'adversaire ne peut plus intervenir chez lui, et il n'entre jamais dans une coalition contre toi." },
  3: { nom: "Alliance militaire intégrée", seuil: 0.6, budget: 4, cp: 8, aide: "Influence militaire +10 et politique +5 ; tes interventions dans sa région gagnent +2 de score de guerre par trimestre (jusqu'à +6). Entretien 0,3 de budget par trimestre. Il t'appelle si l'adversaire attaque un voisin : sans réponse (soutien ou intervention dans ce pays) en 4 trimestres, capital politique −6 et confiance de tous tes alliés −1." },
};
export const ALLIANCE = { gainE: 0.5, plafondE: 70, mefiance: 15, entretien: 0.3, score: 2, scoreMax: 6, appel: 4, credibilite: 6, rupture: 8, ruptureMemoire: 4 };
const vers = (e: EtatPartie, camp: Camp, iso: string) => (camp === "OCC" ? 1 : -1) * alignement(e, iso);
export const garanti = (e: EtatPartie, camp: Camp, iso: string) => !!e.garanties?.some(g => g.iso === iso && g.camp === camp);
// Niveau d'alliance d'un pays avec un camp : 0 aucun, 1 partenariat, 2 garantie, 3 alliance intégrée.
export function niveauAlliance(e: EtatPartie, camp: Camp, iso: string): 0 | 1 | 2 | 3 {
  const a = e.alliances?.find(x => x.iso === iso && x.camp === camp);
  if (a?.niveau === 3) return 3; if (garanti(e, camp, iso)) return 2; return a ? 1 : 0;
}
export function peutSignerAlliance(e: EtatPartie, camp: Camp, iso: string, niveau: Niveau): string | null {
  if (iso === "USA" || iso === "CHN" || !e.pays[iso]) return "Pays invalide.";
  const n = NIVEAUX[niveau], actuel = niveauAlliance(e, camp, iso), c = e.camps[camp];
  if (actuel >= niveau) return "Ce niveau d'alliance est déjà atteint.";
  if (niveau === 3 && actuel < 2) return "Il faut d'abord une garantie de défense.";
  if (e.alliances?.some(x => x.iso === iso && x.camp === adversaire(camp)) || garanti(e, adversaire(camp), iso)) return "Ce pays est déjà allié de l'autre bloc.";
  if (vers(e, camp, iso) < n.seuil) return `Le pays doit pencher vers toi d'au moins ${String(n.seuil).replace(".", ",")}.`;
  if (c.budget < n.budget) return "Budget insuffisant."; if (c.cp < n.cp) return `Capital politique ${n.cp} requis.`;
  return null;
}
export function signerAlliance(e0: EtatPartie, camp: Camp, iso: string, niveau: Niveau, surPlace = false): EtatPartie {
  const err = peutSignerAlliance(e0, camp, iso, niveau); if (err) throw new Error(err);
  const e = surPlace ? e0 : structuredClone(e0), c = e.camps[camp], n = NIVEAUX[niveau], inf = e.pays[iso].influence[camp];
  c.budget -= n.budget; c.cp = outils.borne(c.cp - n.cp, 0, 100);
  const l = (e.alliances ??= []), a = l.find(x => x.iso === iso && x.camp === camp);
  if (a) { a.niveau = niveau; a.depuis = e.round; } else l.push({ iso, camp, niveau, depuis: e.round });
  if (niveau === 1) { inf.e = outils.borne(inf.e + 4, 0, 100); inf.p = outils.borne(inf.p + 3, 0, 100); }
  else { inf.m = outils.borne(inf.m + 10, 0, 100); inf.p = outils.borne(inf.p + 5, 0, 100); e.tension = outils.borne(e.tension + 2, 0, 100); }
  outils.noter(e, { type: "politique", titre: `${n.nom} : ${camp === "OCC" ? "États-Unis" : "Chine"} et ${nomPays(iso)}`, camp, pays: [iso], visiblePour: [...CAMPS], texte: n.aide });
  return e;
}
export function rompreAlliance(e0: EtatPartie, camp: Camp, iso: string): EtatPartie {
  if (!niveauAlliance(e0, camp, iso)) throw new Error("Aucune alliance avec ce pays.");
  const e = structuredClone(e0);
  e.alliances = (e.alliances ?? []).filter(x => !(x.iso === iso && x.camp === camp)); e.garanties = (e.garanties ?? []).filter(g => !(g.iso === iso && g.camp === camp));
  e.camps[camp].cp = outils.borne(e.camps[camp].cp - ALLIANCE.rupture, 0, 100); outils.memoriser(e, iso, camp, -ALLIANCE.ruptureMemoire);
  for (const x of alliesDe(e, camp)) outils.memoriser(e, x, camp, -1);
  outils.noter(e, { type: "politique", titre: `Rupture d'alliance : ${camp === "OCC" ? "États-Unis" : "Chine"} et ${nomPays(iso)}`, camp, pays: [iso], visiblePour: [...CAMPS],
    texte: `Capital politique −${ALLIANCE.rupture} ; rancune du pays, et les autres alliés doutent (confiance −1).` });
  return e;
}
export const alliesDe = (e: EtatPartie, camp: Camp) => [...new Set([...(e.alliances ?? []).filter(x => x.camp === camp).map(x => x.iso), ...(e.garanties ?? []).filter(g => g.camp === camp).map(g => g.iso)])];
// Score de guerre en plus par trimestre grâce aux alliances intégrées de la région de l'intervention.
export const bonusAllies = (e: EtatPartie, it: Intervention) => Math.min(ALLIANCE.scoreMax, ALLIANCE.score * (e.alliances ?? []).filter(a => a.camp === it.camp && a.niveau === 3 && a.iso !== it.iso && zoneDe(a.iso) === zoneDe(it.iso)).length);
// Fin de trimestre : gains des partenariats, entretien des alliances intégrées, appels à l'aide et crédibilité.
export function suiviAlliances(e: EtatPartie) {
  for (const a of e.alliances ?? []) {
    const inf = e.pays[a.iso]?.influence[a.camp]; if (!inf) continue;
    if (inf.e < ALLIANCE.plafondE) inf.e = Math.min(ALLIANCE.plafondE, inf.e + ALLIANCE.gainE);
    if (a.niveau === 3) e.camps[a.camp].budget = Math.max(0, e.camps[a.camp].budget - ALLIANCE.entretien);
  }
  for (const camp of CAMPS) for (const it of e.interventions.filter(i => i.camp === adversaire(camp)) as Intervention[]) {
    const appelant = (e.alliances ?? []).find(a => a.camp === camp && a.niveau === 3 && prochesDe(e, a.iso).voisins.includes(it.iso));
    if (!appelant || (it.appels ??= []).includes(camp) || e.round - (it.debut ?? e.round) < ALLIANCE.appel) continue;
    it.appels.push(camp);
    const repondu = e.journal.some(j => j.round >= (it.debut ?? 0) && j.camp === camp && j.pays?.includes(it.iso) && /Soutenir un camp|Intervention|Casus belli|Agression/.test(j.titre))
      || e.interventions.some(i => i.camp === camp && i.iso === it.iso);
    if (repondu) continue;
    e.camps[camp].cp = outils.borne(e.camps[camp].cp - ALLIANCE.credibilite, 0, 100);
    for (const x of alliesDe(e, camp)) outils.memoriser(e, x, camp, -1);
    outils.noter(e, { type: "politique", titre: `${nomPays(appelant.iso)} reproche au ${camp === "OCC" ? "bloc USA" : "bloc Chine"} son inaction`, camp, pays: [appelant.iso, it.iso], visiblePour: [...CAMPS],
      texte: `L'allié a appelé à l'aide face à l'intervention ${nomPays(it.iso) ? `chez son voisin (${nomPays(it.iso)})` : ""} : aucune réponse. Capital politique −${ALLIANCE.credibilite}, confiance de tous tes alliés −1.` });
  }
}
// IA : apaisement des pays méfiants, puis un partenariat par an avec le pays le plus proche qui n'en a pas encore (budget et capital suffisants).
export function iaAlliances(e: EtatPartie, camp: Camp) {
  // apaiser le pays le plus méfiant au bord de la coalition (≥ 45), si le capital politique le permet
  if (e.camps[camp].cp > 45) { const l = Object.keys(e.pays).map(i => [i, mefiance(e, camp, i)] as const).filter(([i, v]) => v >= 45 && !peutApaiser(e, camp, i)).sort((a, b) => b[1] - a[1]);
    if (l.length) apaiser(e, camp, l[0][0], true); }
  if (e.round % 4 !== 1) return;
  const l = Object.keys(e.pays).filter(i => !peutSignerAlliance(e, camp, i, 1)).sort((a, b) => vers(e, camp, b) - vers(e, camp, a));
  if (l.length && e.camps[camp].budget >= 6) signerAlliance(e, camp, l[0], 1, true);
}
