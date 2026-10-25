// Calendrier du jeu : un round = un trimestre, de 2000 T1 à 2050 T4 inclus.
export const ANNEE_DEBUT = 2000;
export const ANNEE_FIN = 2050;
export const NB_ROUNDS = (ANNEE_FIN - ANNEE_DEBUT + 1) * 4; // 204

export interface Ere { numero: number; nom: string; debut: number; fin: number } // années incluses
export const ERES: Ere[] = [
  { numero: 1, nom: "Fin de l'unipolarité", debut: 2000, fin: 2007 },
  { numero: 2, nom: "Montée des BRICS", debut: 2008, fin: 2019 },
  { numero: 3, nom: "Rivalité ouverte", debut: 2020, fin: 2034 },
  { numero: 4, nom: "Monde de 2050", debut: 2035, fin: 2050 },
];

export function date(round: number): { annee: number; trimestre: number } {
  if (!Number.isInteger(round) || round < 0 || round >= NB_ROUNDS) throw new RangeError(`round hors calendrier : ${round}`);
  return { annee: ANNEE_DEBUT + Math.floor(round / 4), trimestre: (round % 4) + 1 };
}

export function ere(round: number): Ere {
  const { annee } = date(round);
  return ERES.find(e => annee >= e.debut && annee <= e.fin)!;
}

export function libelle(round: number): string {
  const { annee, trimestre } = date(round);
  return `${annee} T${trimestre}`;
}
