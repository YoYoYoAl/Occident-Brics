import donnees from "../data/pays2000.json";
import { NB_ROUNDS } from "./temps";
import { suivant } from "./alea";

export interface EtatPays { iso3: string; population: number }
export interface EtatJeu {
  version: number;
  graine: number;
  alea: number;
  round: number;
  pays: Record<string, EtatPays>;
}

export const VERSION_ETAT = 1;

export function creerEtat(graine: number): EtatJeu {
  const pays: Record<string, EtatPays> = {};
  for (const p of donnees.pays) pays[p.iso3] = { iso3: p.iso3, population: p.indicateurs.population ?? 0 };
  return { version: VERSION_ETAT, graine, alea: graine | 0, round: 0, pays };
}

export function estTermine(e: EtatJeu): boolean {
  return e.round >= NB_ROUNDS - 1;
}

// Avance d'un trimestre. v0.1 : seule la population évolue, selon la tendance réelle 1995-2000
// (provisoire, remplacée par le modèle démographique en v0.2). Le tirage aléatoire est consommé
// à chaque round pour que la suite reste identique quand les systèmes aléatoires arriveront.
export function avancer(e: EtatJeu): EtatJeu {
  if (estTermine(e)) return e;
  const croissance = Object.fromEntries(donnees.pays.map(p => [p.iso3, p.croissancePop9500 ?? 0]));
  const pays: Record<string, EtatPays> = {};
  for (const [iso, p] of Object.entries(e.pays)) {
    pays[iso] = { ...p, population: p.population * Math.pow(1 + croissance[iso], 0.25) };
  }
  return { ...e, alea: suivant(e.alea).etat, round: e.round + 1, pays };
}
