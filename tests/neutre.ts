// Dirigeants neutres (aptitudes 5, traits sans effet sur l'influence ni le budget) : pour les tests antérieurs à la v18.
import type { EtatPartie } from "../src/moteur/partie";
export function dirigeantsNeutres(e: EtatPartie): EtatPartie {
  for (const c of ["OCC", "CHN"] as const) { const d = e.dirigeants?.[c]; if (!d) continue; d.aptitudes = { diplomatie: 5, strategie: 5, intendance: 5, intrigue: 5 }; d.traits = ["prudent", "malade"]; }
  return e;
}
