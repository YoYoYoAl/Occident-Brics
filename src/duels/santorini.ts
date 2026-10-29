// Grands chantiers (Santorini remixé) : plateau 5 × 5 de chantiers (niveaux 0 à 3, 4 = veto qui ferme le chantier).
// À ton tour, ton ingénieur se déplace d'une case (en montant d'un niveau au plus), puis construit un niveau sur une
// case voisine. Monter au niveau 3 inaugure : tu gagnes. 10 tours chacun ; sinon, le plus haut placé l'emporte.
import { type DefDuel, type EtatBase, base, copie, bonus, hasard, choisir, distraction, noter, finir, verifier } from "./moteur";

const N = 5, MAX = 10, NOMS_NIV = ["terrain", "fondations", "structure", "achèvement", "veto"];
interface S extends EtatBase { h: number[]; pos: [number, number]; phase: "bouger" | "construire"; gagnant: number | null; tours: [number, number]; avantage: number }
const vois = (i: number) => { const x = i % N, y = Math.floor(i / N), v: number[] = []; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { if (!dx && !dy) continue; const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < N && b < N) v.push(b * N + a); } return v; };
const libre = (s: S, i: number) => s.h[i] < 4 && !s.pos.includes(i);
const pas = (s: S, j: number) => vois(s.pos[j]).filter(k => libre(s, k) && s.h[k] <= s.h[s.pos[j]] + 1);
const constructions = (s: S, j: number) => vois(s.pos[j]).filter(k => libre(s, k));
function bouger(s: S, j: number, k: number) {
  s.pos[j] = k; noter(s, `${j === 0 ? "Ton ingénieur" : "L'ingénieur adverse"} passe sur un chantier au niveau ${s.h[k]} (${NOMS_NIV[s.h[k]]}).`);
  if (s.h[k] === 3) { s.gagnant = j; finir(s, j === 0 ? "Inauguration ! Le grand chantier porte ta signature." : "L'adversaire inaugure le chantier le premier."); }
}
function construire(s: S, j: number, k: number) {
  s.h[k]++; s.tours[j]++;
  noter(s, s.h[k] === 4 ? `${j === 0 ? "Tu poses" : "L'adversaire pose"} un veto : chantier fermé.` : `${j === 0 ? "Tu construis" : "L'adversaire construit"} (${NOMS_NIV[s.h[k]]}).`);
  if (s.tours[0] >= MAX && s.tours[1] >= MAX) finir(s, "Fin du mandat : chacun reste au niveau atteint.");
  else if (!pas(s, 1 - j).length) { s.gagnant = j; finir(s, j === 0 ? "L'ingénieur adverse est bloqué !" : "Ton ingénieur est bloqué."); }
}
function iaTour(s: S) {
  const l = pas(s, 1); if (!l.length) { s.gagnant = 0; finir(s, "L'ingénieur adverse est bloqué !"); return; }
  const gagne = l.find(k => s.h[k] === 3); if (gagne !== undefined) { bouger(s, 1, gagne); return; }
  const k = hasard(s) < distraction(s.avantage) ? choisir(s, l) : l.map(k => ({ k, v: s.h[k] * 2 + (vois(k).some(x => s.h[x] === 3 && x !== s.pos[0]) && s.h[k] === 2 ? 1.5 : 0) + (vois(k).some(x => s.h[x] === s.h[k] + 1 && s.h[x] < 4) ? 0.5 : 0) })).sort((a, b) => b.v - a.v)[0].k;
  bouger(s, 1, k); if (s.fini) return;
  const c = constructions(s, 1); if (!c.length) { s.tours[1]++; return; }
  // bloque : met un veto sur un niveau 3 que le joueur peut atteindre ; sinon construit sans lui offrir de marche
  const atteint = new Set(pas(s, 0));
  const danger = c.find(x => s.h[x] === 3 && atteint.has(x)); if (danger !== undefined) { construire(s, 1, danger); return; }
  const v = (x: number) => (s.h[x] === 2 && atteint.has(x) ? -10 : 0) + (s.h[x] + 1 <= s.h[s.pos[1]] + 1 && s.h[x] < 3 ? 2 : 0) - (atteint.has(x) && s.h[x] + 1 <= s.h[s.pos[0]] + 1 ? 1 : 0);
  construire(s, 1, hasard(s) < distraction(s.avantage) ? choisir(s, c) : c.map(x => ({ x, v: v(x) })).sort((a, b) => b.v - a.v)[0].x);
}
export const SANTORINI: DefDuel<S> = {
  id: "santorini",
  creer(graine, avantage) {
    const s: S = { ...base(graine), h: Array(N * N).fill(0), pos: [22, 2], phase: "bouger", gagnant: null, tours: [0, 0], avantage };
    const n = bonus(s, Math.abs(avantage), 2);
    for (let k = 0; k < n; k++) s.h[avantage > 0 ? [17, 16][k] : [7, 8][k]] = 1;
    noter(s, n ? `Préparation : ${n} fondation${n > 1 ? "s" : ""} déjà coulée${n > 1 ? "s" : ""} ${avantage > 0 ? "près de ton ingénieur" : "près de l'ingénieur adverse"}.` : "Les deux ingénieurs arrivent sur le site.");
    return s;
  },
  coups: s => s.fini ? [] : s.phase === "bouger" ? pas(s, 0).map(k => `bouger:${k}`) : constructions(s, 0).map(k => `construire:${k}`),
  jouer(s0, coup) {
    verifier(SANTORINI, s0, coup); const s = copie(s0);
    const [t, v] = coup.split(":");
    if (t === "bouger") { bouger(s, 0, +v); if (!s.fini) { s.phase = "construire"; if (!constructions(s, 0).length) { s.tours[0]++; s.phase = "bouger"; iaTour(s); } } return s; }
    s.tour++; construire(s, 0, +v); s.phase = "bouger";
    if (!s.fini) iaTour(s);
    if (!s.fini && !pas(s, 0).length) { s.gagnant = 1; finir(s, "Ton ingénieur est bloqué."); }
    return s;
  },
  resultat: s => s.gagnant === 0 ? 1 : s.gagnant === 1 ? 0 : Math.max(0.1, Math.min(0.9, 0.5 + 0.15 * (s.h[s.pos[0]] - s.h[s.pos[1]]))),
  vue(s) {
    const cs = s.fini ? [] : SANTORINI.coups(s);
    return { statut: s.fini ? s.journal[s.journal.length - 1] : s.phase === "bouger" ? `Déplace ton ingénieur ★ (une marche au plus). Monter au niveau 3 inaugure. Tour ${s.tours[0] + 1}/${MAX}.` : "Construis un niveau sur une case voisine (au 4e niveau, c'est un veto).",
      scores: [`niveau ${s.h[s.pos[0]]}`, `niveau ${s.h[s.pos[1]]}`],
      grille: { cols: N, cases: s.h.map((h, i) => ({ t: `${i === s.pos[0] ? "★ " : i === s.pos[1] ? "✪ " : ""}${h === 4 ? "⛔" : "▮".repeat(h) || "·"}`, titre: NOMS_NIV[h], c: i === s.pos[0] ? "moi" : i === s.pos[1] ? "lui" : `niv${h}`,
        coup: cs.find(c => +c.split(":")[1] === i) })) } };
  },
};
