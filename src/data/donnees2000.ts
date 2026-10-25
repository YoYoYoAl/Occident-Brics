// Accès aux données réelles 2000 des 30 attributs (v0.2), générées par outils/collecter_attributs.py.
import brut from "./attributs2000.json";

export interface Valeur { v: number; a: number; s?: string; c?: string; e?: number } // e = 1 : estimation
export interface Indicateur { nom: string; unite: string; famille: string; attribut: string; source: string; code: string; note?: string }

export const DONNEES = brut as unknown as {
  annee: number; fenetre: number; collecte: string;
  sources: Record<string, { nom: string; url: string }>;
  indicateurs: Record<string, Indicateur>;
  sansSource: Record<string, string>;
  pays: Record<string, { nom: string; valeurs: Record<string, Valeur | null> }>;
};

export function valeur(iso3: string, cle: string): Valeur | null {
  return DONNEES.pays[iso3]?.valeurs[cle] ?? null;
}

export function indicateursDe(famille: string, attribut: string): string[] {
  return Object.keys(DONNEES.indicateurs).filter(k => DONNEES.indicateurs[k].famille === famille && DONNEES.indicateurs[k].attribut === attribut);
}

export function formater(cle: string, v: number): string {
  if (DONNEES.indicateurs[cle].unite.startsWith("1 = oui")) return v === 1 ? "oui" : "non";
  if (Math.abs(v) >= 1e6) return v.toLocaleString("fr-FR", { notation: "compact", maximumSignificantDigits: 3 });
  return v.toLocaleString("fr-FR", { maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 2 });
}
