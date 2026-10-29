// Nuit du putsch (échecs remixés) : la capitale en 5 × 5. Tes conjurés partent du bas : général (1 pas), 2 blindés
// (jusqu'à 2 cases en ligne droite), 2 commandos (saut du cavalier), radio (1 pas en diagonale). Les loyalistes
// défendent le palais (en haut au centre) : gardes (1 pas), police (jusqu'à 2 cases en ligne droite).
// Entrer dans le palais gagne ; perdre le général échoue. 8 coups au plus.
import { type DefDuel, type EtatBase, base, copie, bonus, hasard, choisir, distraction, noter, finir, verifier } from "./moteur";

const N = 5, PALAIS = 2, MAX = 8;
type Piece = "general" | "blinde" | "commando" | "radio" | "garde" | "police";
const NOMS: Record<Piece, string> = { general: "général", blinde: "blindé", commando: "commando", radio: "radio", garde: "garde", police: "police" };
const SYM: Record<Piece, string> = { general: "♚", blinde: "♜", commando: "♞", radio: "♝", garde: "♟", police: "♜" };
const VAL: Record<Piece, number> = { general: 9, blinde: 4, commando: 3, radio: 2, garde: 2, police: 3 };
interface P { t: Piece; j: number }
interface S extends EtatBase { g: (P | null)[]; coups0: number; avantage: number; choix: number | null; gagnant: number | null }
const xy = (i: number) => [i % N, Math.floor(i / N)];
const idx = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N ? y * N + x : -1;
function cibles(s: S, i: number): number[] {
  const p = s.g[i]!, [x, y] = xy(i), out: number[] = [];
  const ajoute = (k: number) => { if (k >= 0 && s.g[k]?.j !== p.j) out.push(k); };
  const ligne = (dx: number, dy: number, n: number) => { for (let k = 1; k <= n; k++) { const c = idx(x + k * dx, y + k * dy); if (c < 0) return; if (s.g[c]) { if (s.g[c]!.j !== p.j) out.push(c); return; } out.push(c); } };
  const pas = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  if (p.t === "general" || p.t === "garde") for (const [dx, dy] of pas) ajoute(idx(x + dx, y + dy));
  if (p.t === "blinde" || p.t === "police") for (const [dx, dy] of pas.slice(0, 4)) ligne(dx, dy, 2);
  if (p.t === "radio") for (const [dx, dy] of pas.slice(4)) ajoute(idx(x + dx, y + dy));
  if (p.t === "commando") for (const [dx, dy] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) ajoute(idx(x + dx, y + dy));
  // les loyalistes n'occupent pas le palais (ils le gardent autour)
  return p.j === 1 ? out.filter(k => k !== PALAIS) : out;
}
const mesPieces = (s: S, j: number) => s.g.map((p, i) => p?.j === j ? i : -1).filter(i => i >= 0);
const tousCoups = (s: S, j: number) => mesPieces(s, j).flatMap(i => cibles(s, i).map(k => `${i}>${k}`));
function deplacer(s: S, j: number, c: string) {
  const [a, b] = c.split(">").map(Number), p = s.g[a]!, pris = s.g[b];
  s.g[b] = p; s.g[a] = null;
  noter(s, `${j === 0 ? "Ton" : "Le"} ${NOMS[p.t]} ${pris ? `neutralise ${j === 0 ? "le" : "ton"} ${NOMS[pris.t]}` : "avance"}.`);
  if (pris?.t === "general") { s.gagnant = 1; finir(s, "Ton général est arrêté : le putsch échoue."); }
  else if (j === 0 && b === PALAIS) { s.gagnant = 0; finir(s, "Tes conjurés entrent dans le palais : le régime tombe !"); }
}
const distPalais = (i: number) => { const [x, y] = xy(i); return Math.max(Math.abs(x - 2), y); };
function iaCoup(s: S): string {
  const l = tousCoups(s, 1); if (!l.length) return "";
  if (hasard(s) < distraction(s.avantage) * 0.7) return choisir(s, l);
  const v = (c: string) => {
    const [, b] = c.split(">").map(Number), t = copie(s); const pris = t.g[b]; deplacer(t, 1, c);
    if (pris?.t === "general") return 1000;
    // menace du joueur après ce coup : peut-il entrer au palais ou prendre une pièce ?
    const rep = tousCoups(t, 0); if (rep.some(r => +r.split(">")[1] === PALAIS)) return -500 + (pris ? VAL[pris.t] : 0);
    const perte = Math.max(0, ...rep.map(r => { const k = +r.split(">")[1]; return t.g[k]?.j === 1 ? VAL[t.g[k]!.t] : 0; }));
    const proximite = mesPieces(t, 0).reduce((a, i) => a + (4 - distPalais(i)), 0);
    return (pris ? VAL[pris.t] * 2 : 0) - perte - proximite * 0.4 + (distPalais(b) <= 1 ? 1 : 0);
  };
  return l.map(c => ({ c, v: v(c) })).sort((a, b) => b.v - a.v)[0].c;
}
export const ECHECS: DefDuel<S> = {
  id: "echecs",
  creer(graine, avantage) {
    const s: S = { ...base(graine), g: Array(N * N).fill(null), coups0: 0, avantage, choix: null, gagnant: null };
    const bas = (x: number, y: number, t: Piece) => { s.g[idx(x, y)] = { t, j: 0 }; }, haut = (x: number, y: number, t: Piece) => { s.g[idx(x, y)] = { t, j: 1 }; };
    bas(2, 4, "general"); bas(0, 4, "blinde"); bas(4, 4, "blinde"); bas(1, 4, "commando"); bas(3, 4, "commando"); bas(2, 3, "radio");
    haut(1, 0, "garde"); haut(3, 0, "garde"); haut(2, 1, "police"); haut(0, 1, "police"); haut(4, 1, "garde");
    const n = bonus(s, avantage, 1);
    if (n > 0) { s.g[idx(4, 1)] = null; noter(s, "Préparation : une compagnie de la garde a été achetée."); }
    else if (n < 0 || avantage < -0.5) { s.g[idx(1, 1)] = { t: "police", j: 1 }; noter(s, "Le régime a renforcé la police autour du palais."); }
    else noter(s, "Minuit : les conjurés sortent des casernes.");
    return s;
  },
  coups(s) {
    if (s.fini) return [];
    if (s.choix === null) return mesPieces(s, 0).filter(i => cibles(s, i).length).map(i => `piece:${i}`);
    return [...cibles(s, s.choix).map(k => `vers:${k}`), "annuler"];
  },
  jouer(s0, coup) {
    verifier(ECHECS, s0, coup); const s = copie(s0);
    if (coup === "annuler") { s.choix = null; return s; }
    if (coup.startsWith("piece:")) { s.choix = +coup.slice(6); return s; }
    s.tour++; s.coups0++; deplacer(s, 0, `${s.choix}>${coup.slice(5)}`); s.choix = null;
    if (!s.fini) { const c = iaCoup(s); if (c) deplacer(s, 1, c); }
    if (!s.fini && (s.coups0 >= MAX || !tousCoups(s, 0).length)) finir(s, "L'aube se lève : le palais tient encore.");
    return s;
  },
  resultat(s) {
    if (s.gagnant !== null) return s.gagnant === 0 ? 1 : 0;
    const best = Math.min(...mesPieces(s, 0).map(distPalais)), mat = (j: number) => mesPieces(s, j).reduce((a, i) => a + VAL[s.g[i]!.t], 0);
    return Math.max(0, Math.min(0.45, 0.45 - best * 0.08 + 0.1 * (mat(0) - mat(1)) / 20));
  },
  vue(s) {
    const cs = s.fini ? [] : ECHECS.coups(s), dest = s.choix !== null ? cibles(s, s.choix) : [];
    return { statut: s.fini ? s.journal[s.journal.length - 1] : s.choix === null ? `Choisis un conjuré (coup ${s.coups0 + 1}/${MAX}). But : entrer dans le palais ⌂ en haut au centre.` : `Où va ton ${NOMS[s.g[s.choix]!.t]} ?`,
      scores: [`${MAX - s.coups0} coups`, ""],
      grille: { cols: N, cases: s.g.map((p, i) => ({ t: p ? SYM[p.t] : i === PALAIS ? "⌂" : "", titre: p ? NOMS[p.t] : i === PALAIS ? "palais" : "",
        c: p ? (p.j === 0 ? "moi" : "lui") : i === PALAIS ? "palais" : dest.includes(i) ? "possible" : "vide",
        coup: cs.includes(`piece:${i}`) ? `piece:${i}` : cs.includes(`vers:${i}`) ? `vers:${i}` : undefined })) },
      boutons: s.choix !== null ? [{ t: "Changer de pièce", coup: "annuler" }] : [] };
  },
};
