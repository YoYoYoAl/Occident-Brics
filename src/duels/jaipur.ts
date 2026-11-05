// Marché des contrats (Jaipur remixé) : 5 contrats visibles au marché (soja, pétrole, puces, armes, crédits).
// À ton tour : prendre un contrat (main de 6 au plus) ou vendre une série d'un même bien. Les jetons de vente
// valent de moins en moins : vendre tôt rapporte plus, attendre fait des séries plus grosses (bonus 3, 4, 5 cartes).
// Pétrole, puces et armes se vendent par 2 au moins. Fin : 2 biens épuisés, pioche vide ou 10 tours chacun.
import { type DefDuel, type EtatBase, base, copie, bonus, hasard, choisir, distraction, noter, finir, verifier, melange, part } from "./moteur";

export const BIENS = ["soja", "pétrole", "puces", "armes", "crédits"];
const JETONS = [[4, 3, 2, 2, 1, 1, 1], [7, 7, 5, 5, 5], [6, 6, 5, 5, 4], [5, 5, 5, 4, 4], [3, 3, 2, 2, 1, 1]];
const PAR_BIEN = [8, 6, 6, 6, 8], MIN_VENTE = [1, 2, 2, 2, 1], BONUS_SERIE = [0, 0, 0, 2, 4, 6], MAX_MAIN = 6, TOURS = 10;
interface S extends EtatBase { marche: number[]; pioche: number[]; mains: [number[], number[]]; jetons: number[][]; points: [number, number]; tours: [number, number]; avantage: number }
const nb = (m: number[], b: number) => m.filter(x => x === b).length;
function coupsDe(s: S, j: number): string[] {
  const out: string[] = [], m = s.mains[j];
  if (m.length < MAX_MAIN) for (const b of new Set(s.marche)) out.push(`prendre:${b}`);
  for (let b = 0; b < 5; b++) if (nb(m, b) >= MIN_VENTE[b]) out.push(`vendre:${b}`);
  return out.length ? out : ["passer"];
}
function appliquer(s: S, j: number, coup: string) {
  const [t, v] = coup.split(":"), b = +v, qui = j === 0 ? "Tu" : "L'adversaire";
  if (t === "prendre") { s.marche.splice(s.marche.indexOf(b), 1); s.mains[j].push(b); if (s.pioche.length) s.marche.push(s.pioche.shift()!); noter(s, `${qui} ${j === 0 ? "prends" : "prend"} un contrat ${BIENS[b]}.`); }
  if (t === "vendre") {
    const n = nb(s.mains[j], b); s.mains[j] = s.mains[j].filter(x => x !== b);
    let gain = 0; for (let k = 0; k < n; k++) gain += s.jetons[b].shift() ?? 0;
    gain += BONUS_SERIE[Math.min(5, n)]; s.points[j] += gain;
    noter(s, `${qui} ${j === 0 ? "vends" : "vend"} ${n} ${BIENS[b]} pour ${gain} points.`);
  }
  s.tours[j]++;
  const epuises = s.jetons.filter(x => !x.length).length;
  if (epuises >= 2 || !s.pioche.length && !s.marche.length || s.tours[0] >= TOURS && s.tours[1] >= TOURS) finir(s, "Le marché ferme : on compte les points.");
}
function iaCoup(s: S): string {
  const l = coupsDe(s, 1); if (hasard(s) < distraction(s.avantage)) return choisir(s, l);
  const val = (c: string) => {
    const [t, v] = c.split(":"), b = +v, m = s.mains[1];
    if (t === "vendre") { const n = nb(m, b); let g = 0; for (let k = 0; k < n; k++) g += s.jetons[b][k] ?? 0; g += BONUS_SERIE[Math.min(5, n)];
      return g * (n >= 3 || s.jetons[b].length <= n + 1 || m.length >= MAX_MAIN ? 1.2 : 0.55); }
    if (t === "prendre") return (s.jetons[b][nb(m, b)] ?? 0) * 0.5 + nb(m, b) * 0.8 + (nb(s.mains[0], b) >= 2 ? 1 : 0);
    return 0;
  };
  return l.map(c => ({ c, v: val(c) })).sort((a, b) => b.v - a.v)[0].c;
}
export const JAIPUR: DefDuel<S> = {
  id: "jaipur",
  creer(graine, avantage) {
    const s: S = { ...base(graine), marche: [], pioche: [], mains: [[], []], jetons: JETONS.map(x => [...x]), points: [0, 0], tours: [0, 0], avantage };
    s.pioche = melange(s, PAR_BIEN.flatMap((n, b) => Array(n).fill(b)));
    s.marche = s.pioche.splice(0, 5); s.mains = [s.pioche.splice(0, 3), s.pioche.splice(0, 3)];
    const n = bonus(s, Math.abs(avantage), 2); for (let k = 0; k < n; k++) s.mains[avantage > 0 ? 0 : 1].push(s.pioche.shift()!);
    noter(s, n ? `Préparation : ${n} contrat${n > 1 ? "s" : ""} d'avance ${avantage > 0 ? "pour toi" : "pour l'adversaire"}.` : "Le marché ouvre.");
    return s;
  },
  coups: s => s.fini ? [] : coupsDe(s, 0),
  jouer(s0, coup) {
    verifier(JAIPUR, s0, coup); const s = copie(s0); s.tour++;
    if (coup === "passer") s.tours[0]++; else appliquer(s, 0, coup);
    if (!s.fini) { const c = iaCoup(s); if (c === "passer") s.tours[1]++; else appliquer(s, 1, c); }
    return s;
  },
  resultat: s => part(s.points[0], s.points[1]),
  aide(s) {
    const l = coupsDe(s, 0), m = s.mains[0];
    const v = l.find(c => c.startsWith("vendre") && (nb(m, +c.split(":")[1]) >= 3 || m.length >= MAX_MAIN)); if (v) return v;
    return l.filter(c => c.startsWith("prendre")).sort((a, b) => nb(m, +b.split(":")[1]) - nb(m, +a.split(":")[1]) || +b.split(":")[1] % 4 - +a.split(":")[1] % 4)[0] ?? l[0];
  },
  vue(s) {
    const l = s.fini ? [] : coupsDe(s, 0);
    return { statut: s.fini ? s.journal[s.journal.length - 1] : `Prends un contrat au marché ou vends une série (main ${s.mains[0].length}/${MAX_MAIN}). Tour ${s.tours[0] + 1}/${TOURS}.`,
      scores: [`${s.points[0]} pts`, `${s.points[1]} pts`],
      rangees: [
        { titre: "Marché", cases: s.marche.map(b => ({ t: BIENS[b], c: "carte", coup: l.includes(`prendre:${b}`) ? `prendre:${b}` : undefined })) },
        { titre: "Valeur des prochaines ventes", cases: s.jetons.map((x, b) => ({ t: `${BIENS[b]} : ${x.slice(0, 3).join(" · ") || "épuisé"}`, c: "vide" })) },
        { titre: "Ta main", cases: [0, 1, 2, 3, 4].filter(b => nb(s.mains[0], b)).map(b => ({ t: `${BIENS[b]} ×${nb(s.mains[0], b)}`, c: "moi", coup: l.includes(`vendre:${b}`) ? `vendre:${b}` : undefined, titre: "Clique pour vendre la série" })) },
        { titre: "Main adverse", cases: [{ t: `${s.mains[1].length} contrat${s.mains[1].length > 1 ? "s" : ""}`, c: "lui" }] },
      ],
      boutons: l.includes("passer") ? [{ t: "Passer", coup: "passer" }] : [] };
  },
};
