// Frontière disputée (Schotten Totten remixé) : 3 bornes le long d'une frontière. Cartes 1 à 9 en 4 couleurs ;
// chacun pose une carte de son côté d'une borne (3 au plus). Quand les deux côtés sont complets, la meilleure
// combinaison prend la borne : suite de même couleur > brelan > même couleur > suite > somme. 2 bornes gagnent.
import { type DefDuel, type EtatBase, base, copie, hasard, choisir, distraction, noter, finir, verifier, melange } from "./moteur";

export const COULEURS_F = ["infanterie", "artillerie", "génie", "blindés"];
const B = 3, MAIN = 6;
interface Carte { c: number; v: number }
interface S extends EtatBase { pioche: Carte[]; mains: [Carte[], Carte[]]; bornes: [Carte[], Carte[]][]; gagnees: (number | null)[]; avantage: number; choix: number | null }
const nom = (k: Carte) => `${k.v} ${COULEURS_F[k.c]}`;
// Force d'une combinaison de 3 cartes : rang × 100 + somme.
function force(t: Carte[]): number {
  const v = t.map(k => k.v).sort((a, b) => a - b), memeC = t.every(k => k.c === t[0].c), suite = v[1] === v[0] + 1 && v[2] === v[1] + 1, brelan = v[0] === v[2];
  const rang = suite && memeC ? 4 : brelan ? 3 : memeC ? 2 : suite ? 1 : 0;
  return rang * 100 + v[0] + v[1] + v[2];
}
const NOMS_RANGS = ["somme", "suite", "même couleur", "brelan", "suite de même couleur"];
function resoudre(s: S, b: number, poseurDernier: number) {
  const [x, y] = s.bornes[b]; if (s.gagnees[b] !== null || x.length < 3 || y.length < 3) return;
  const fx = force(x), fy = force(y), g = fx > fy ? 0 : fy > fx ? 1 : 1 - poseurDernier; // égalité : celui qui a complété le premier
  s.gagnees[b] = g; noter(s, `Borne ${b + 1} ${g === 0 ? "prise" : "perdue"} (${NOMS_RANGS[Math.floor(Math.max(fx, fy) / 100)]}).`);
}
const nb = (s: S, j: number) => s.gagnees.filter(g => g === j).length;
function coupsDe(s: S, j: number): string[] { const out: string[] = []; s.mains[j].forEach((_, i) => s.bornes.forEach((bo, b) => { if (s.gagnees[b] === null && bo[j].length < 3) out.push(`${i}:${b}`); })); return out; }
function appliquer(s: S, j: number, coup: string) {
  const [i, b] = coup.split(":").map(Number), k = s.mains[j][i]; s.mains[j].splice(i, 1); s.bornes[b][j].push(k);
  noter(s, `${j === 0 ? "Tu poses" : "L'adversaire pose"} ${nom(k)} à la borne ${b + 1}.`);
  if (s.pioche.length) s.mains[j].push(s.pioche.shift()!);
  resoudre(s, b, j);
  if (nb(s, j) >= 2) finir(s, j === 0 ? "Deux bornes sur trois : la frontière est à toi." : "L'adversaire tient deux bornes : la frontière lui revient.");
  else if (!coupsDe(s, 0).length && !coupsDe(s, 1).length) finir(s, "Plus de cartes à poser.");
}
// Potentiel d'un côté de borne avec la carte ajoutée (complété au mieux par la moyenne des cartes restantes).
function potentiel(t: Carte[]): number {
  if (t.length === 3) return force(t);
  const memeC = t.every(k => k.c === t[0].c), v = t.map(k => k.v), proche = v.length < 2 || Math.max(...v) - Math.min(...v) <= 2, egal = v.every(x => x === v[0]);
  return (memeC && proche ? 330 : egal ? 260 : memeC ? 190 : proche ? 110 : 0) + v.reduce((a, b) => a + b, 0) * 1.5;
}
function iaCoup(s: S): string {
  const l = coupsDe(s, 1); if (hasard(s) < distraction(s.avantage)) return choisir(s, l);
  const v = (c: string) => { const [i, b] = c.split(":").map(Number), mien = [...s.bornes[b][1], s.mains[1][i]], lui = s.bornes[b][0];
    return potentiel(mien) - (lui.length === 3 ? force(lui) : potentiel(lui)) * 0.5 - mien.length * 5; };
  return l.map(c => ({ c, v: v(c) })).sort((a, b) => b.v - a.v)[0].c;
}
export const SCHOTTEN: DefDuel<S> = {
  id: "schotten",
  creer(graine, avantage) {
    const s: S = { ...base(graine), pioche: [], mains: [[], []], bornes: [...Array(B)].map(() => [[], []] as [Carte[], Carte[]]), gagnees: Array(B).fill(null), avantage, choix: null };
    const cartes: Carte[] = []; for (let c = 0; c < 4; c++) for (let v = 1; v <= 9; v++) cartes.push({ c, v });
    s.pioche = melange(s, cartes);
    const n = MAIN + Math.max(-1, Math.min(1, Math.round(avantage)));
    s.mains = [s.pioche.splice(0, n), s.pioche.splice(0, 2 * MAIN - n)];
    noter(s, `Trois bornes à tenir. Main de ${n} cartes pour toi, ${2 * MAIN - n} pour l'adversaire.`);
    return s;
  },
  coups(s) {
    if (s.fini) return [];
    const l = coupsDe(s, 0);
    if (s.choix === null) return [...new Set(l.map(c => `carte:${c.split(":")[0]}`))];
    return [...l.filter(c => +c.split(":")[0] === s.choix).map(c => `borne:${c.split(":")[1]}`), "annuler"];
  },
  jouer(s0, coup) {
    verifier(SCHOTTEN, s0, coup); const s = copie(s0);
    if (coup === "annuler") { s.choix = null; return s; }
    if (coup.startsWith("carte:")) { s.choix = +coup.slice(6); return s; }
    s.tour++; const c = `${s.choix}:${coup.slice(6)}`; s.choix = null;
    appliquer(s, 0, c);
    if (!s.fini) { const l = coupsDe(s, 1); if (l.length) appliquer(s, 1, iaCoup(s)); else if (!coupsDe(s, 0).length) finir(s, "Plus de cartes à poser."); }
    if (!s.fini && !coupsDe(s, 0).length) { while (!s.fini && coupsDe(s, 1).length) appliquer(s, 1, iaCoup(s)); if (!s.fini) finir(s, "Plus de cartes à poser."); }
    return s;
  },
  resultat(s) {
    const a = nb(s, 0), b = nb(s, 1); if (a >= 2) return 1; if (b >= 2) return 0;
    return 0.5 + 0.2 * (a - b);
  },
  vue(s) {
    const cs = SCHOTTEN.coups(s);
    return { statut: s.fini ? s.journal[s.journal.length - 1] : s.choix === null ? "Choisis une carte de ta main, puis la borne. Suite de même couleur > brelan > même couleur > suite > somme." : `${nom(s.mains[0][s.choix])} : sur quelle borne ?`,
      scores: [`${nb(s, 0)} borne${nb(s, 0) > 1 ? "s" : ""}`, `${nb(s, 1)}`],
      grille: { cols: B, c: "frontiere", cases: [
        ...s.bornes.map(([, y]) => ({ t: y.map(nom).join("\n") || "—", c: "lui" })),
        ...s.bornes.map((_, b) => ({ t: `Borne ${b + 1}${s.gagnees[b] === 0 ? " ✔ à toi" : s.gagnees[b] === 1 ? " ✖ perdue" : ""}`, c: s.gagnees[b] === 0 ? "moi" : s.gagnees[b] === 1 ? "lui" : "etiquette", coup: cs.includes(`borne:${b}`) ? `borne:${b}` : undefined })),
        ...s.bornes.map(([x], b) => ({ t: x.map(nom).join("\n") || "—", c: "moi", coup: cs.includes(`borne:${b}`) ? `borne:${b}` : undefined })),
      ] },
      rangees: [{ titre: "Ta main", cases: s.mains[0].map((k, i) => ({ t: nom(k), c: s.choix === i ? "choisi" : "carte", coup: cs.includes(`carte:${i}`) ? `carte:${i}` : undefined })) }],
      boutons: s.choix !== null ? [{ t: "Annuler", coup: "annuler" }] : [] };
  },
};
