// Table de négociation (Quarto remixé) : 16 concessions à 4 traits (coût, durée, secret, symbole), table 4 × 4.
// Tu places la concession que l'adversaire t'a choisie, puis tu choisis celle qu'il devra placer. Celui qui
// complète une ligne de 4 concessions partageant un trait impose ses termes.
import { type DefDuel, type EtatBase, base, copie, hasard, choisir, distraction, noter, finir, verifier } from "./moteur";

export const TRAITS_Q = [["chère", "bon marché"], ["longue", "courte"], ["secrète", "publique"], ["forte", "symbolique"]];
const LIGNES = [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15], [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15], [0, 5, 10, 15], [3, 6, 9, 12]];
interface S extends EtatBase { table: number[]; reserve: number[]; enMain: number | null; phase: "placer" | "donner"; gagnant: number | null; avantage: number }
const desc = (p: number) => TRAITS_Q.map((t, k) => t[(p >> k) & 1]).join(", ");
const symbole = (p: number) => ["◆", "●"][p & 1] + ["▲", "▼"][(p >> 1) & 1] + ["▣", "□"][(p >> 2) & 1] + ["★", "☆"][(p >> 3) & 1];
function gagne(t: number[]): boolean {
  return LIGNES.some(l => { const v = l.map(i => t[i]); if (v.some(x => x < 0)) return false; for (let k = 0; k < 4; k++) { const b = v.map(x => (x >> k) & 1); if (b.every(y => y === b[0])) return true; } return false; });
}
const libresQ = (s: S) => s.table.map((v, i) => v < 0 ? i : -1).filter(i => i >= 0);
function placer(s: S, j: number, i: number) {
  s.table[i] = s.enMain!; s.enMain = null;
  noter(s, `${j === 0 ? "Tu places" : "L'adversaire place"} « ${desc(s.table[i])} ».`);
  if (gagne(s.table)) { s.gagnant = j; finir(s, j === 0 ? "Ligne complète : tu imposes tes termes !" : "L'adversaire complète une ligne et impose ses termes."); }
  else if (!libresQ(s).length) finir(s, "Table pleine sans accord décisif : compromis.");
}
const donneGagnante = (s: S, p: number) => libresQ(s).some(i => { const t = [...s.table]; t[i] = p; return gagne(t); });
function iaPlacer(s: S): number {
  const l = libresQ(s), gagnante = l.find(i => { const t = [...s.table]; t[i] = s.enMain!; return gagne(t); });
  if (gagnante !== undefined && hasard(s) > distraction(s.avantage) / 3) return gagnante;
  // place de façon à laisser au moins une concession sûre à donner
  const sures = l.filter(i => { const t = copie(s); t.table[i] = t.enMain!; t.enMain = null; return t.reserve.some(p => !donneGagnante(t, p)); });
  return choisir(s, sures.length && hasard(s) > distraction(s.avantage) ? sures : l);
}
function iaDonner(s: S): number {
  const sures = s.reserve.filter(p => !donneGagnante(s, p));
  return choisir(s, sures.length && hasard(s) > distraction(s.avantage) / 2 ? sures : s.reserve);
}
export const QUARTO: DefDuel<S> = {
  id: "quarto",
  creer(graine, avantage) {
    const s: S = { ...base(graine), table: Array(16).fill(-1), reserve: [...Array(16).keys()], enMain: null, phase: "placer", gagnant: null, avantage };
    // l'adversaire ouvre en te tendant une première concession ; la préparation en pose déjà une ou deux au centre
    const n = Math.max(0, Math.round(Math.abs(avantage) * 2));
    for (let k = 0; k < n; k++) { const p = s.reserve.splice(Math.floor(hasard(s) * s.reserve.length), 1)[0]; s.table[[5, 10][k]] = p; }
    s.enMain = s.reserve.splice(Math.floor(hasard(s) * s.reserve.length), 1)[0];
    noter(s, "L'adversaire te tend sa première concession : place-la.");
    return s;
  },
  coups: s => s.fini ? [] : s.phase === "placer" ? libresQ(s).map(i => `placer:${i}`) : s.reserve.map(p => `donner:${p}`),
  jouer(s0, coup) {
    verifier(QUARTO, s0, coup); const s = copie(s0);
    const [t, v] = coup.split(":");
    if (t === "placer") { s.tour++; placer(s, 0, +v); if (!s.fini) s.phase = "donner"; return s; }
    s.enMain = +v; s.reserve = s.reserve.filter(p => p !== +v);
    placer(s, 1, iaPlacer(s));
    if (!s.fini) { const p = iaDonner(s); s.enMain = p; s.reserve = s.reserve.filter(x => x !== p); s.phase = "placer"; }
    return s;
  },
  resultat: s => s.gagnant === 0 ? 1 : s.gagnant === 1 ? 0 : 0.5,
  aide(s) {
    if (s.phase === "placer") { const l = libresQ(s), g = l.find(i => { const t = [...s.table]; t[i] = s.enMain!; return gagne(t); }); return `placer:${g ?? l[0]}`; }
    return `donner:${s.reserve.find(p => !donneGagnante(s, p)) ?? s.reserve[0]}`;
  },
  vue(s) {
    const cs = s.fini ? [] : QUARTO.coups(s);
    return { statut: s.fini ? s.journal[s.journal.length - 1] : s.phase === "placer" ? `Place « ${desc(s.enMain!)} » (${symbole(s.enMain!)}). Une ligne de 4 qui partagent un trait gagne.` : "Choisis la concession que l'adversaire devra placer : évite de lui offrir une ligne gagnante.",
      grille: { cols: 4, cases: s.table.map((p, i) => ({ t: p < 0 ? "" : symbole(p), titre: p < 0 ? "" : desc(p), c: p < 0 ? "vide" : "piece", coup: cs.includes(`placer:${i}`) ? `placer:${i}` : undefined })) },
      rangees: [{ titre: s.phase === "donner" ? "Concessions disponibles : choisis-en une pour l'adversaire" : "Concessions restantes", cases: s.reserve.map(p => ({ t: symbole(p), titre: desc(p), c: "piece", coup: cs.includes(`donner:${p}`) ? `donner:${p}` : undefined })) },
        { titre: "Légende", cases: [{ t: "◆/● chère/bon marché · ▲/▼ longue/courte · ▣/□ secrète/publique · ★/☆ forte/symbolique", c: "etiquette" }] }] };
  },
};
