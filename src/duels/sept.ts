// Pyramide d'influence (7 Wonders Duel remixé) : 10 cartes en pyramide (4 en bas, puis 3, 2, 1), une rangée sur deux
// face cachée. Une carte est libre quand les deux cartes qui la couvrent ont été prises ; la prendre en découvre
// d'autres… pour l'adversaire. Économie (points), culture (points, série de 3 = +4), militaire (le pion avance :
// 3 crans d'avance gagnent tout de suite).
import { type DefDuel, type EtatBase, base, copie, bonus, hasard, choisir, distraction, noter, finir, verifier, part } from "./moteur";

type Genre = "eco" | "culture" | "militaire";
interface Carte { g: Genre; v: number; nom: string }
const NOMS: Record<Genre, string[]> = { eco: ["Port franc", "Banque régionale", "Zone franche", "Raffinerie", "Bourse"], culture: ["Université", "Chaîne d'info", "Festival", "Bourses d'études", "Institut culturel"], militaire: ["Base aérienne", "Escadre", "Conseillers", "Radar"] };
// lignes de la pyramide : rangée 0 (bas, libre) … rangée 3 (sommet) ; une carte i de la rangée r est couverte par i et i+1 de la rangée r−1
const RANGS = [4, 3, 2, 1], CACHEE = [false, true, false, true];
interface S extends EtatBase { pyr: (Carte | null)[][]; vu: boolean[][]; tableaux: [Carte[], Carte[]]; pion: number; avantage: number }
const libre = (s: S, r: number, i: number) => s.pyr[r][i] !== null && (r === 0 || s.pyr[r - 1][i] === null && s.pyr[r - 1][i + 1] === null);
const libres = (s: S) => { const out: string[] = []; s.pyr.forEach((l, r) => l.forEach((_, i) => { if (libre(s, r, i)) out.push(`${r}:${i}`); })); return out; };
function points(s: S, j: number): number {
  const t = s.tableaux[j]; let p = t.filter(k => k.g !== "militaire").reduce((a, k) => a + k.v, 0);
  p += Math.floor(t.filter(k => k.g === "culture").length / 3) * 4;
  return p + Math.max(0, (j === 0 ? 1 : -1) * s.pion) * 2;
}
function prendre(s: S, j: number, c: string) {
  const [r, i] = c.split(":").map(Number), k = s.pyr[r][i]!; s.pyr[r][i] = null; s.tableaux[j].push(k);
  if (k.g === "militaire") s.pion += (j === 0 ? 1 : -1) * k.v;
  noter(s, `${j === 0 ? "Tu prends" : "L'adversaire prend"} ${k.nom} (${k.g === "eco" ? `économie ${k.v}` : k.g === "culture" ? `culture ${k.v}` : `militaire +${k.v}`}).`);
  s.pyr.forEach((l, r2) => l.forEach((_, i2) => { if (libre(s, r2, i2)) s.vu[r2][i2] = true; })); // les cartes libérées se retournent
  if (Math.abs(s.pion) >= 3) finir(s, s.pion > 0 ? "Suprématie militaire : la région est à toi." : "Suprématie militaire adverse.");
  else if (!libres(s).length) finir(s, "Pyramide vidée : on compte économie, culture et position militaire.");
}
function iaCoup(s: S): string {
  const l = libres(s); if (hasard(s) < distraction(s.avantage)) return choisir(s, l);
  const v = (c: string) => { const t = copie(s); prendre(t, 1, c); if (t.fini) return t.pion < 0 ? 100 : -100;
    // valeur prise moins la meilleure carte offerte à l'adversaire
    const offre = Math.max(0, ...libres(t).map(c2 => { const [r, i] = c2.split(":").map(Number), k = t.pyr[r][i]!; return t.vu[r][i] ? (k.g === "militaire" ? k.v * 2.5 + (t.pion >= 1 ? 6 : 0) : k.v) : 2.5; }));
    return points(t, 1) - points(t, 0) - (t.pion * 2) - offre * 0.8; };
  return l.map(c => ({ c, v: v(c) })).sort((a, b) => b.v - a.v)[0].c;
}
export const SEPT: DefDuel<S> = {
  id: "sept",
  creer(graine, avantage) {
    const s: S = { ...base(graine), pyr: [], vu: [], tableaux: [[], []], pion: 0, avantage };
    const tirer = (): Carte => { const x = hasard(s), g: Genre = x < 0.4 ? "eco" : x < 0.75 ? "culture" : "militaire"; return { g, v: g === "militaire" ? 1 + (hasard(s) < 0.3 ? 1 : 0) : 2 + Math.floor(hasard(s) * 4), nom: choisir(s, NOMS[g]) }; };
    s.pyr = RANGS.map(n => [...Array(n)].map(tirer)); s.vu = RANGS.map((n, r) => Array(n).fill(!CACHEE[r]));
    s.pion = Math.max(-1, Math.min(1, bonus(s, avantage, 1)));
    noter(s, s.pion ? `Préparation : le pion militaire part un cran ${s.pion > 0 ? "de ton côté" : "du côté adverse"}.` : "La pyramide est dressée.");
    return s;
  },
  coups: s => s.fini ? [] : libres(s),
  jouer(s0, coup) { verifier(SEPT, s0, coup); const s = copie(s0); s.tour++; prendre(s, 0, coup); if (!s.fini) prendre(s, 1, iaCoup(s)); return s; },
  resultat(s) { if (s.pion >= 3) return 1; if (s.pion <= -3) return 0; return part(points(s, 0), points(s, 1)); },
  vue(s) {
    const l = s.fini ? [] : libres(s);
    const carte = (r: number, i: number) => { const x = s.pyr[r][i];
      return { t: !x ? "·" : s.vu[r][i] ? `${x.nom}\n${x.g === "eco" ? `éco ${x.v}` : x.g === "culture" ? `culture ${x.v}` : `⚔ +${x.v}`}` : "?", c: !x ? "rien" : s.vu[r][i] ? x.g : "cachee", coup: l.includes(`${r}:${i}`) ? `${r}:${i}` : undefined }; };
    return { statut: s.fini ? s.journal[s.journal.length - 1] : `Prends une carte libre (en surbrillance). Militaire : pion à ${s.pion > 0 ? "+" : ""}${s.pion} (±3 gagne). 3 cartes culture = +4.`,
      scores: [`${points(s, 0)} pts`, `${points(s, 1)} pts`],
      rangees: [
        ...[3, 2, 1, 0].map(r => ({ c: "pyramide", cases: s.pyr[r].map((_, i) => carte(r, i)) })),
        { titre: "Ton tableau", cases: s.tableaux[0].map(k => ({ t: k.nom, c: k.g })) }, { titre: "Tableau adverse", cases: s.tableaux[1].map(k => ({ t: k.nom, c: k.g })) }] };
  },
};
