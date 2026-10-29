// Place de la révolution (Othello remixé) : la capitale en 6 × 6 quartiers. Poser un rassemblement retourne les
// quartiers adverses encadrés ; la police retourne dans l'autre sens. 10 coups chacun au plus ; la majorité des
// quartiers décide si le régime tombe.
import { type DefDuel, type EtatBase, base, copie, bonus, hasard, choisir, distraction, noter, finir, verifier, part } from "./moteur";

const N = 6, MAX = 10, DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
interface S extends EtatBase { g: number[]; poses: [number, number]; avantage: number; passe: number }
const dans = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N;
function retournes(g: number[], i: number, j: number): number[] {
  if (g[i] >= 0) return [];
  const x0 = i % N, y0 = Math.floor(i / N), out: number[] = [];
  for (const [dx, dy] of DIRS) {
    const ligne: number[] = []; let x = x0 + dx, y = y0 + dy;
    while (dans(x, y) && g[y * N + x] === 1 - j) { ligne.push(y * N + x); x += dx; y += dy; }
    if (ligne.length && dans(x, y) && g[y * N + x] === j) out.push(...ligne);
  }
  return out;
}
const legaux = (s: S, j: number) => [...Array(N * N).keys()].filter(i => retournes(s.g, i, j).length);
const compte = (s: S, j: number) => s.g.filter(v => v === j).length;
function poser(s: S, i: number, j: number) {
  const r = retournes(s.g, i, j); s.g[i] = j; for (const k of r) s.g[k] = j; s.poses[j]++;
  noter(s, `${j === 0 ? "Ton rassemblement" : "La police"} ${j === 0 ? "rallie" : "reprend"} ${r.length} quartier${r.length > 1 ? "s" : ""}.`);
}
const POIDS = (i: number) => { const x = i % N, y = Math.floor(i / N), bord = x === 0 || y === 0 || x === N - 1 || y === N - 1, coin = (x === 0 || x === N - 1) && (y === 0 || y === N - 1);
  const presCoin = (x <= 1 || x >= N - 2) && (y <= 1 || y >= N - 2) && !coin; return coin ? 6 : presCoin ? -2 : bord ? 1.5 : 0; };
function iaTour(s: S) {
  const l = legaux(s, 1);
  if (!l.length) { s.passe++; noter(s, "La police ne peut rien reprendre."); return; }
  s.passe = 0;
  const i = hasard(s) < distraction(s.avantage) ? choisir(s, l) : l.map(i => ({ i, v: retournes(s.g, i, 1).length + POIDS(i) })).sort((a, b) => b.v - a.v)[0].i;
  poser(s, i, 1);
}
function verifierFin(s: S) {
  if (s.poses[0] >= MAX && s.poses[1] >= MAX || s.passe >= 2 || !s.g.includes(-1)) finir(s, compte(s, 0) > compte(s, 1) ? "La foule tient la majorité des quartiers : le régime vacille." : "La police tient la ville.");
}
export const OTHELLO: DefDuel<S> = {
  id: "othello",
  creer(graine, avantage) {
    const s: S = { ...base(graine), g: Array(N * N).fill(-1), poses: [0, 0], avantage, passe: 0 };
    const c = N / 2; s.g[(c - 1) * N + c - 1] = 0; s.g[c * N + c] = 0; s.g[(c - 1) * N + c] = 1; s.g[c * N + c - 1] = 1;
    // préparation : un ou deux quartiers de bord déjà acquis
    const n = bonus(s, Math.abs(avantage), 2), bords = [1, 4, 6, 11, 24, 29, 31, 34];
    for (let k = 0; k < n; k++) s.g[bords[Math.floor(hasard(s) * bords.length)]] = avantage > 0 ? 0 : 1;
    noter(s, n ? `Préparation : ${n} quartier${n > 1 ? "s" : ""} de bord déjà ${avantage > 0 ? "acquis à la foule" : "tenus par la police"}.` : "La foule se rassemble au centre.");
    return s;
  },
  coups: s => s.fini ? [] : legaux(s, 0).length ? legaux(s, 0).map(String) : ["passer"],
  jouer(s0, coup) {
    verifier(OTHELLO, s0, coup); const s = copie(s0); s.tour++;
    if (coup === "passer") { s.passe++; s.poses[0]++; noter(s, "Aucun rassemblement possible : tu patientes."); } else { s.passe = 0; poser(s, +coup, 0); }
    verifierFin(s); if (!s.fini) { iaTour(s); verifierFin(s); }
    return s;
  },
  resultat: s => part(compte(s, 0), compte(s, 1)),
  vue(s) {
    const l = s.fini ? [] : legaux(s, 0);
    return { statut: s.fini ? s.journal[s.journal.length - 1] : l.length ? `Pose un rassemblement (cases marquées) : il retourne les quartiers encadrés. ${MAX - s.poses[0]} coups restants.` : "Aucun coup : passe ton tour.",
      scores: [`${compte(s, 0)} quartiers`, `${compte(s, 1)}`],
      grille: { cols: N, cases: s.g.map((v, i) => ({ t: v === 0 ? "✊" : v === 1 ? "🛡" : l.includes(i) ? "·" : "", c: v === 0 ? "moi" : v === 1 ? "lui" : l.includes(i) ? "possible" : "vide", coup: l.includes(i) ? String(i) : undefined })) },
      boutons: !s.fini && !l.length ? [{ t: "Passer", coup: "passer" }] : [] };
  },
};
