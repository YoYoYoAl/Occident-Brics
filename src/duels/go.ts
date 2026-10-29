// Encerclement maritime (Go remixé) : goban maritime 5 × 5, 8 navires chacun. Un groupe sans liberté est capturé ;
// à la fin, chaque camp compte ses navires et les eaux qu'il encercle seul.
import { type DefDuel, type EtatBase, base, copie, bonus, hasard, choisir, distraction, noter, finir, verifier, part } from "./moteur";

const N = 5, MAX = 8;
interface S extends EtatBase { g: number[]; poses: [number, number]; captures: [number, number]; avantage: number; }
const voisins = (i: number) => { const x = i % N, y = Math.floor(i / N), v: number[] = []; if (x > 0) v.push(i - 1); if (x < N - 1) v.push(i + 1); if (y > 0) v.push(i - N); if (y < N - 1) v.push(i + N); return v; };
function groupe(g: number[], i: number): { pierres: number[]; libertes: number } {
  const j = g[i], vu = new Set([i]), pile = [i], lib = new Set<number>();
  while (pile.length) { const k = pile.pop()!; for (const v of voisins(k)) { if (g[v] === -1) lib.add(v); else if (g[v] === j && !vu.has(v)) { vu.add(v); pile.push(v); } } }
  return { pierres: [...vu], libertes: lib.size };
}
// Pose en i : capture les groupes adverses sans liberté ; refuse le suicide.
function tenter(g0: number[], i: number, j: number): { g: number[]; pris: number } | null {
  if (g0[i] !== -1) return null;
  const g = [...g0]; g[i] = j; let pris = 0;
  for (const v of voisins(i)) if (g[v] === 1 - j) { const gr = groupe(g, v); if (!gr.libertes) { for (const p of gr.pierres) g[p] = -1; pris += gr.pierres.length; } }
  if (!groupe(g, i).libertes) return null;
  return { g, pris };
}
const legaux = (s: S, j: number) => [...Array(N * N).keys()].filter(i => tenter(s.g, i, j));
function territoire(g: number[]): [number, number] {
  const t: [number, number] = [0, 0], vu = new Set<number>();
  for (let i = 0; i < N * N; i++) {
    if (g[i] !== -1 || vu.has(i)) continue;
    const zone = [i], pile = [i], bords = new Set<number>(); vu.add(i);
    while (pile.length) { const k = pile.pop()!; for (const v of voisins(k)) { if (g[v] === -1 && !vu.has(v)) { vu.add(v); zone.push(v); pile.push(v); } else if (g[v] >= 0) bords.add(g[v]); } }
    if (bords.size === 1) t[[...bords][0]] += zone.length;
  }
  return t;
}
const score = (s: S): [number, number] => { const t = territoire(s.g); return [s.g.filter(v => v === 0).length + t[0], s.g.filter(v => v === 1).length + t[1]]; };
function poser(s: S, i: number, j: number) {
  const r = tenter(s.g, i, j)!; s.g = r.g; s.captures[j] += r.pris; s.poses[j]++;
  noter(s, `${j === 0 ? "Ton navire" : "Un navire adverse"} prend position${r.pris ? ` et capture ${r.pris} navire${r.pris > 1 ? "s" : ""}` : ""}.`);
}
function iaTour(s: S): boolean {
  const l = legaux(s, 1); if (!l.length || s.poses[1] >= MAX) return false;
  const note = (i: number) => { const r = tenter(s.g, i, 1)!, t = { ...s, g: r.g } as S; const [a, b] = score(t);
    const menace = voisins(i).filter(v => r.g[v] === 0 && groupe(r.g, v).libertes === 1).length; return b - a + 3 * r.pris + menace + groupe(r.g, i).libertes * 0.3; };
  poser(s, hasard(s) < distraction(s.avantage) ? choisir(s, l) : l.map(i => ({ i, v: note(i) })).sort((a, b) => b.v - a.v)[0].i, 1);
  return true;
}
function conclure(s: S) { const [a, b] = score(s); finir(s, a > b ? "Tes eaux encerclent le passage : le blocus tient." : a === b ? "Les deux flottes se neutralisent." : "La flotte adverse contrôle le passage."); }
export const GO: DefDuel<S> = {
  id: "go",
  creer(graine, avantage) {
    const s: S = { ...base(graine), g: Array(N * N).fill(-1), poses: [0, 0], captures: [0, 0], avantage };
    const n = bonus(s, Math.abs(avantage), 2), coins = [6, 8, 16, 18];
    for (let k = 0; k < n; k++) s.g[coins[k]] = avantage > 0 ? 0 : 1;
    noter(s, n ? `Préparation : ${n} position${n > 1 ? "s" : ""} déjà tenue${n > 1 ? "s" : ""} ${avantage > 0 ? "par ta flotte" : "par la flotte adverse"}.` : "Deux flottes entrent dans le détroit.");
    return s;
  },
  coups: s => s.fini ? [] : [...legaux(s, 0).map(String), "passer"],
  jouer(s0, coup) {
    verifier(GO, s0, coup); const s = copie(s0); s.tour++;
    const joue = coup !== "passer";
    if (joue) poser(s, +coup, 0); else { s.poses[0] = MAX; noter(s, "Tu tiens tes positions."); }
    const ia = iaTour(s);
    if (s.poses[0] >= MAX || !legaux(s, 0).length) { while (iaTour(s)); conclure(s); }
    else if (!joue && !ia) conclure(s);
    return s;
  },
  resultat: s => { const [a, b] = score(s); return part(a, b); },
  vue(s) {
    const l = s.fini ? [] : legaux(s, 0), [a, b] = score(s);
    return { statut: s.fini ? s.journal[s.journal.length - 1] : `Place un navire (${MAX - s.poses[0]} restants). Un groupe encerclé est capturé ; les eaux que tu entoures seul comptent pour toi.`,
      scores: [`${a} pts`, `${b} pts`],
      grille: { cols: N, cases: s.g.map((v, i) => ({ t: v === 0 ? "⛴" : v === 1 ? "🚢" : "", c: v === 0 ? "moi" : v === 1 ? "lui" : "eau", coup: l.includes(i) ? String(i) : undefined })) },
      boutons: s.fini ? [] : [{ t: "Passer (garder mes positions)", coup: "passer" }] };
  },
};
