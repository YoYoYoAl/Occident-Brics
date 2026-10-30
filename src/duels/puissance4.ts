// Soir d'élection (Puissance 4 remixé) : 6 électorats en colonnes, 5 rangées. Aligner 4 jetons emporte le scrutin ;
// sinon, après 9 jetons chacun, chaque électorat va au camp qui y a le plus de jetons.
import { type DefDuel, type EtatBase, base, copie, bonus, hasard, choisir, distraction, noter, finir, verifier, part } from "./moteur";

const C = 6, L = 5, MAX = 9;
export const ELECTORATS = ["Villes", "Banlieues", "Campagnes", "Jeunes", "Retraités", "Diaspora"];
interface S extends EtatBase { g: number[]; poses: [number, number]; avantage: number; gagnant: number | null }
const cell = (c: number, l: number) => l * C + c; // l = 0 en bas
const hauteur = (s: S, c: number) => { let l = 0; while (l < L && s.g[cell(c, l)] >= 0) l++; return l; };
const libre = (s: S) => [...Array(C).keys()].filter(c => hauteur(s, c) < L);
function aligne(g: number[], j: number): boolean {
  const v = (c: number, l: number) => c >= 0 && c < C && l >= 0 && l < L && g[cell(c, l)] === j;
  for (let c = 0; c < C; c++) for (let l = 0; l < L; l++) for (const [dc, dl] of [[1, 0], [0, 1], [1, 1], [1, -1]])
    if ([0, 1, 2, 3].every(k => v(c + k * dc, l + k * dl))) return true;
  return false;
}
function poser(s: S, c: number, j: number) {
  s.g[cell(c, hauteur(s, c))] = j; s.poses[j]++;
  if (aligne(s.g, j)) { s.gagnant = j; finir(s, j === 0 ? "Quatre électorats alignés : le scrutin bascule pour toi !" : "L'adversaire aligne quatre jetons : le scrutin t'échappe."); }
  else if (s.poses[0] >= MAX && s.poses[1] >= MAX || !libre(s).length) finir(s, "Dépouillement : chaque électorat va au camp le plus présent.");
}
function iaColonne(s: S): number {
  const l = libre(s), essai = (c: number, j: number) => { const t = copie(s); t.g[cell(c, hauteur(t, c))] = j; return aligne(t.g, j); };
  const gagne = l.find(c => essai(c, 1)); if (gagne !== undefined) return gagne;
  const bloque = l.find(c => essai(c, 0)); if (bloque !== undefined && hasard(s) > distraction(s.avantage) / 3) return bloque;
  if (hasard(s) < distraction(s.avantage)) return choisir(s, l);
  // évite d'offrir au joueur une case gagnante juste au-dessus ; préfère le centre
  const offre = (c: number) => { const t = copie(s); t.g[cell(c, hauteur(t, c))] = 1; if (hauteur(t, c) >= L) return false; t.g[cell(c, hauteur(t, c))] = 0; return aligne(t.g, 0); };
  const sures = l.filter(c => !offre(c));
  const pool = sures.length ? sures : l;
  return pool.sort((a, b) => Math.abs(a - 2.5) - Math.abs(b - 2.5))[hasard(s) < 0.6 ? 0 : Math.min(1, pool.length - 1)];
}
function majorites(s: S): [number, number] {
  const r: [number, number] = [0, 0];
  for (let c = 0; c < C; c++) { let a = 0, b = 0; for (let l = 0; l < L; l++) { const v = s.g[cell(c, l)]; if (v === 0) a++; if (v === 1) b++; } if (a > b) r[0]++; else if (b > a) r[1]++; else { r[0] += 0.5; r[1] += 0.5; } }
  return r;
}
export const PUISSANCE4: DefDuel<S> = {
  id: "puissance4",
  creer(graine, avantage) {
    const s: S = { ...base(graine), g: Array(C * L).fill(-1), poses: [0, 0], avantage, gagnant: null };
    // préparation de la campagne : jetons déjà acquis au camp qui a l'avantage
    const n = bonus(s, Math.abs(avantage), 2);
    for (let k = 0; k < n; k++) { const c = Math.floor(hasard(s) * C); s.g[cell(c, hauteur(s, c))] = avantage > 0 ? 0 : 1; }
    noter(s, n ? `Préparation : ${n} électorat${n > 1 ? "s" : ""} déjà acquis ${avantage > 0 ? "à toi" : "à l'adversaire"}.` : "Campagne ouverte : personne n'a d'avance.");
    return s;
  },
  coups: s => s.fini ? [] : libre(s).map(String),
  jouer(s0, coup) {
    verifier(PUISSANCE4, s0, coup); const s = copie(s0); s.tour++;
    poser(s, Number(coup), 0); noter(s, `Tu fais campagne : ${ELECTORATS[Number(coup)]}.`);
    if (!s.fini) { const c = iaColonne(s); poser(s, c, 1); if (!s.fini) noter(s, `L'adversaire répond : ${ELECTORATS[c]}.`); }
    return s;
  },
  resultat(s) { if (s.gagnant !== null) return s.gagnant === 0 ? 1 : 0; const [a, b] = majorites(s); return 0.15 + 0.7 * part(a, b); },
  vue(s) {
    const cases = [];
    for (let l = L - 1; l >= 0; l--) for (let c = 0; c < C; c++) { const v = s.g[cell(c, l)]; cases.push({ t: v < 0 ? "" : "★", c: v === 0 ? "moi" : v === 1 ? "lui" : "vide", coup: !s.fini && hauteur(s, c) < L ? String(c) : undefined, titre: ELECTORATS[c] }); }
    const [a, b] = majorites(s);
    return { statut: s.fini ? s.journal[s.journal.length - 1] : `Clique un électorat pour y lâcher un jeton (${MAX - s.poses[0]} restants). Aligne 4 jetons.`,
      scores: [`${a} électorat${a > 1 ? "s" : ""}`, `${b}`], grille: { cols: C, cases },
      rangees: [{ cases: ELECTORATS.map(t => ({ t, c: "etiquette" })) }] };
  },
};
