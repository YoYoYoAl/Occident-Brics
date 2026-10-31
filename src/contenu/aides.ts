// Raccourcis d'écriture des événements historiques et projetés.
import type { EvenementHistorique, Effet, Camp, Canal } from "../moteur/types";

type T = 1 | 2 | 3 | 4;
export const H = (id: string, annee: number, trimestre: T, titre: string, texte: string, pays: string[], famille: string, effets: Effet[],
  o: Partial<EvenementHistorique> = {}): EvenementHistorique => ({ id, annee, trimestre, titre, texte, pays, famille, deviable: true, conditions: [], effets, ...o });
// Scénario projeté : texte préfixé, probabilité d'avoir lieu si les conditions sont réunies.
export const PJ = (id: string, annee: number, trimestre: T, probabilite: number, titre: string, texte: string, pays: string[], famille: string, effets: Effet[],
  o: Partial<EvenementHistorique> = {}): EvenementHistorique => H(id, annee, trimestre, titre, "Scénario projeté. " + texte, pays, famille, effets, { probabilite, ...o });
export const I = (pays: string | string[], camp: Camp, canal: Canal, valeur: number): Effet => ({ type: "influence", pays, camp, canal, valeur });
export const S = (pays: string | string[], valeur: number): Effet => ({ type: "stabilite", pays, valeur });
export const TN = (valeur: number): Effet => ({ type: "tension", valeur });
export const CP = (camp: Camp, valeur: number): Effet => ({ type: "cp", camp, valeur });
export const G = (pays: string | string[], points: number, duree: number): Effet => ({ type: "croissance", pays, points, duree });
export const CO2 = (pays: string | string[], pourcent: number, duree: number): Effet => ({ type: "co2", pays, pourcent, duree });
export const NAT = { deviable: false }; // catastrophe ou choc exogène : a toujours lieu
export const SI = (id: string) => ({ conditions: [{ type: "evenement" as const, id, fait: true }] });
