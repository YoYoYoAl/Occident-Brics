import { EtatJeu, VERSION_ETAT } from "./etat";

export function serialiser(e: EtatJeu): string {
  return JSON.stringify(e);
}

export function charger(texte: string): EtatJeu {
  const e = JSON.parse(texte) as EtatJeu;
  if (e.version !== VERSION_ETAT) throw new Error(`Sauvegarde de version ${e.version}, version attendue ${VERSION_ETAT}`);
  if (typeof e.round !== "number" || typeof e.alea !== "number" || !e.pays) throw new Error("Sauvegarde invalide");
  return e;
}
