// Socle commun des duels : chaque duel est une machine pure (état sérialisable, hasard à graine) qui expose
// une « vue » générique (grille, rangées de cartes, boutons) que l'interface affiche sans connaître les règles.
// Convention : le joueur humain est toujours le camp 0, l'IA le camp 1 ; jouer() applique le coup du joueur
// puis les réponses de l'IA jusqu'à ce que le joueur doive décider de nouveau (ou que le duel finisse).
import { suivant } from "../moteur/alea";
import type { IdDuel } from "./catalogue";

export interface Case { t: string; c?: string; coup?: string; titre?: string }
export interface Rangee { titre?: string; cases: Case[]; c?: string }
export interface Vue {
  statut: string;
  scores?: [string, string];             // toi, l'adversaire
  grille?: { cols: number; cases: Case[]; c?: string };
  rangees?: Rangee[];
  boutons?: Case[];
  flash?: { sequence: number[]; ms: number }; // séquence à mémoriser (la saisie commence quand l'interface envoie « vu »)
  chrono?: number;                        // secondes pour jouer ; à zéro, l'interface envoie le coup « temps »
}
// Contexte d'affichage : noms des pays en jeu (régions, capitales), cible du plan.
export interface Contexte { noms?: string[]; cible?: string }
export interface EtatBase { alea: number; fini: boolean; journal: string[]; tour: number }
export interface DefDuel<S extends EtatBase = EtatBase> {
  id: IdDuel;
  creer(graine: number, avantage: number, ctx?: Contexte): S;
  vue(s: S): Vue;
  coups(s: S): string[];        // coups légaux du joueur (vide si duel fini)
  jouer(s: S, coup: string): S; // coup du joueur puis réponse de l'IA
  resultat(s: S): number;       // 0 à 1, du point de vue du joueur
  aide?(s: S): string;          // un bon coup pour le joueur (conseil affiché, joueur de test)
}

// ---------- Outils ----------
export function hasard(s: EtatBase): number { const r = suivant(s.alea); s.alea = r.etat; return r.valeur; }
export const entier = (s: EtatBase, n: number) => Math.floor(hasard(s) * n);
export function melange<T>(s: EtatBase, t: T[]): T[] { const u = [...t]; for (let i = u.length - 1; i > 0; i--) { const j = entier(s, i + 1); [u[i], u[j]] = [u[j], u[i]]; } return u; }
export const choisir = <T>(s: EtatBase, t: T[]): T => t[entier(s, t.length)];
export const base = (graine: number): EtatBase => ({ alea: graine | 0, fini: false, journal: [], tour: 0 });
export const copie = <S>(s: S): S => structuredClone(s);
export const borne01 = (x: number) => Math.max(0, Math.min(1, x));
// Partage d'un score : 0,5 à égalité, 1 si l'adversaire n'a rien.
export const part = (a: number, b: number) => (a + b <= 0 ? 0.5 : a / (a + b));
// Écart de points ramené entre 0 et 1 (sigmoïde, échelle en points).
export const ecart = (d: number, echelle: number) => 1 / (1 + Math.exp(-d / echelle));
// Nombre entier tiré de l'avantage : +1 donne k, −1 donne −k, arrondi aléatoire du reste.
export function bonus(s: EtatBase, avantage: number, k: number): number {
  const x = avantage * k, n = Math.floor(x); return n + (hasard(s) < x - n ? 1 : 0);
}
// L'IA joue moins bien quand le joueur a l'avantage : probabilité de jouer un coup au hasard.
export const distraction = (avantage: number) => Math.max(0.05, Math.min(0.6, 0.25 + 0.3 * avantage));
export function noter(s: EtatBase, t: string) { s.journal.push(t); if (s.journal.length > 6) s.journal.shift(); }
export function finir(s: EtatBase, t: string) { s.fini = true; noter(s, t); }
// Joue un coup légal et vérifie qu'il l'est (l'interface ne propose que des coups légaux, les tests aussi).
export function verifier(def: DefDuel<any>, s: EtatBase, coup: string) {
  if (s.fini) throw new Error("Duel terminé.");
  if (!def.coups(s as any).includes(coup)) throw new Error(`Coup impossible : ${coup}`);
}
