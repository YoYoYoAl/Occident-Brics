// Vue Ressources (2 novembre 2026) : qui a ce qui manque à ton camp, qui veut tes ressources.
// Profils réels 2000 (commerce.ts, seuils : estimation) + terres rares tirées des scores 2000 (seuils : estimation).
import { PROFILS, type Bien as BienCommerce } from "../data/commerce";
import scores from "../data/scores2000.json";
import { type EtatV2, type Camp, partPays } from "./moteur";

export type Bien = BienCommerce | "terres";
export const BIENS: { id: Bien; nom: string }[] = [
  { id: "energie", nom: "Énergie" }, { id: "alimentation", nom: "Alimentation" }, { id: "metaux", nom: "Métaux" },
  { id: "terres", nom: "Terres rares" }, { id: "industrie", nom: "Industrie" },
];
const SC = (scores as any).pays as Record<string, { scores: Record<string, number> }>;
export const SEUIL_TERRES = { offre: 10, besoin: 5 }; // score 0-100 ; en 2000 la Chine assure l'essentiel de la production : seuils bas (estimation)

export type Role = "offre" | "besoin" | "neutre";
export function role(iso: string, b: Bien): Role {
  const p = PROFILS[iso];
  if (b === "terres") {
    const s = SC[iso]?.scores["Terres rares"] ?? 0;
    if (s >= SEUIL_TERRES.offre) return "offre";
    return p?.offre.includes("industrie") && s < SEUIL_TERRES.besoin ? "besoin" : "neutre"; // les industriels sans gisement en ont besoin
  }
  return p?.offre.includes(b) ? "offre" : p?.besoin.includes(b) ? "besoin" : "neutre";
}

// Bilan d'un camp pour un bien : poids des pays qui l'offrent et qui en ont besoin, pondérés par leur alignement (part continue 0-1).
export function bilan(e: EtatV2, c: Camp, b: Bien) {
  let offre = 0, besoin = 0;
  for (const p of Object.values(e.pays)) { const r = role(p.iso, b), w = p.poids * partPays(p, c); if (r === "offre") offre += w; else if (r === "besoin") besoin += w; }
  return { offre, besoin, manque: besoin > offre };
}

// Lecture d'un pays du point de vue du camp : 5 catégories pour la carte.
export type Lecture = "fournisseur_ami" | "fournisseur" | "demandeur_ami" | "demandeur" | "neutre";
export function lecture(e: EtatV2, c: Camp, iso: string, b: Bien): Lecture {
  const r = role(iso, b); if (r === "neutre") return "neutre";
  const ami = partPays(e.pays[iso], c) >= 0.4; // 0,4 = début de Coopération
  return r === "offre" ? (ami ? "fournisseur_ami" : "fournisseur") : ami ? "demandeur_ami" : "demandeur";
}
