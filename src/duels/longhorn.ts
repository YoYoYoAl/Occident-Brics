// Tournée des capitales (Longhorn remixé) : 9 pays en grille 3 × 3, chacun avec des jetons de 3 couleurs
// (élites, rue, argent). Ton agent prend TOUS les jetons d'une couleur du pays où il se trouve, puis saute
// à une distance égale au nombre de jetons pris. Certains pays cachent un scandale ou une prime.
// Fin : une couleur épuisée, ou 7 tours chacun. Valeur : élites 3, argent 2, rue 1 ; majorité d'une couleur +3.
import { type DefDuel, type EtatBase, base, copie, bonus, hasard, entier, choisir, distraction, noter, finir, verifier, part, melange } from "./moteur";

export const COULEURS = ["élites", "rue", "argent"] as const;
const VALEUR = [3, 1, 2], TOURS = 7;
interface S extends EtatBase { jetons: number[][]; secret: (null | "scandale" | "prime")[]; vu: boolean[]; pos: [number, number]; sacs: number[][]; tours: [number, number]; noms: string[]; avantage: number }
const dist = (a: number, b: number) => Math.abs((a % 3) - (b % 3)) + Math.abs(Math.floor(a / 3) - Math.floor(b / 3));
function destinations(s: S, de: number, n: number, autre: number): number[] {
  for (let d = Math.min(n, 4); d >= 1; d--) { const l = [...Array(9).keys()].filter(x => x !== autre && dist(de, x) === d); if (l.length) return l; }
  return [...Array(9).keys()].filter(x => x !== autre && x !== de);
}
const points = (s: S, j: number) => {
  let p = s.sacs[j].reduce((a, n, k) => a + n * VALEUR[k], 0);
  for (let k = 0; k < 3; k++) if (s.sacs[j][k] > s.sacs[1 - j][k]) p += 3;
  return p;
};
const epuisee = (s: S) => [0, 1, 2].some(k => s.jetons.every(c => c[k] === 0));
// coup : « k:dest » (couleur prise, pays d'arrivée)
function coupsDe(s: S, j: number): string[] {
  const ici = s.pos[j], out: string[] = [];
  for (let k = 0; k < 3; k++) { const n = s.jetons[ici][k]; if (!n) continue; for (const d of destinations(s, ici, n, s.pos[1 - j])) out.push(`${k}:${d}`); }
  if (!out.length) for (const d of destinations(s, ici, 1, s.pos[1 - j])) out.push(`-:${d}`); // pays vide : on repart sans rien prendre
  return out;
}
function appliquer(s: S, j: number, coup: string) {
  const [k, d] = coup.split(":"), qui = j === 0 ? "Ton agent" : "L'agent adverse";
  if (k !== "-") { const n = s.jetons[s.pos[j]][+k]; s.sacs[j][+k] += n; s.jetons[s.pos[j]][+k] = 0; noter(s, `${qui} rafle ${n} jeton${n > 1 ? "s" : ""} ${COULEURS[+k]} (${s.noms[s.pos[j]]}).`); }
  s.pos[j] = +d; s.tours[j]++;
  const sec = s.secret[+d];
  if (sec && !s.vu[+d]) { s.vu[+d] = true;
    if (sec === "prime") { s.sacs[j][0] += 1; noter(s, `${qui} trouve une prime à ${s.noms[+d]} : 1 jeton élites.`); }
    else { const k2 = s.sacs[j].indexOf(Math.max(...s.sacs[j])); s.sacs[j][k2] = Math.floor(s.sacs[j][k2] / 2); noter(s, `Scandale à ${s.noms[+d]} : ${j === 0 ? "tu perds" : "l'adversaire perd"} la moitié de ses jetons ${COULEURS[k2]}.`); } }
  if (epuisee(s) || s.tours[0] >= TOURS && s.tours[1] >= TOURS) finir(s, "Fin de la tournée : on compte les soutiens.");
}
function iaCoup(s: S): string {
  const l = coupsDe(s, 1); if (hasard(s) < distraction(s.avantage)) return choisir(s, l);
  const note = (c: string) => { const t = copie(s); appliquer(t, 1, c);
    // ce que le joueur pourrait rafler ensuite là où il est, et ce qui attend l'IA à l'arrivée
    const menace = Math.max(0, ...t.jetons[t.pos[0]].map((n, k) => n * VALEUR[k]));
    const suite = Math.max(0, ...t.jetons[t.pos[1]].map((n, k) => n * VALEUR[k]));
    return points(t, 1) - points(t, 0) + 0.4 * suite - 0.3 * menace };
  return l.map(c => ({ c, v: note(c) })).sort((a, b) => b.v - a.v)[0].c;
}
export const LONGHORN: DefDuel<S> = {
  id: "longhorn",
  creer(graine, avantage, ctx) {
    const s0 = base(graine);
    const noms = [...(ctx?.noms ?? []).slice(0, 9), ..."ABCDEFGHI".split("").map(x => `Pays ${x}`)].slice(0, 9);
    const s: S = { ...s0, jetons: [], secret: [], vu: Array(9).fill(false), pos: [0, 8], sacs: [[0, 0, 0], [0, 0, 0]], tours: [0, 0], noms, avantage };
    for (let i = 0; i < 9; i++) s.jetons.push([1 + entier(s, 3), 1 + entier(s, 4), 1 + entier(s, 3)]);
    s.secret = melange(s, [null, null, null, null, null, "scandale", "scandale", "prime", "prime"]);
    s.secret[0] = s.secret[8] = null;
    const n = bonus(s, Math.abs(avantage), 3); if (n) s.sacs[avantage > 0 ? 0 : 1][2] += n;
    noter(s, n ? `Préparation : ${n} jeton${n > 1 ? "s" : ""} argent d'avance ${avantage > 0 ? "pour toi" : "pour l'adversaire"}.` : "Les deux agents arrivent dans la région.");
    return s;
  },
  coups: s => s.fini ? [] : coupsDe(s, 0),
  jouer(s0, coup) { verifier(LONGHORN, s0, coup); const s = copie(s0); s.tour++; appliquer(s, 0, coup); if (!s.fini) appliquer(s, 1, iaCoup(s)); return s; },
  resultat: s => part(points(s, 0), points(s, 1)),
  vue(s) {
    const cs = s.fini ? [] : coupsDe(s, 0);
    const cases = [...Array(9).keys()].map(i => ({
      t: `${s.noms[i]}${i === s.pos[0] ? " ★" : ""}${i === s.pos[1] ? " ✪" : ""}\n${s.jetons[i].map((n, k) => `${COULEURS[k][0].toUpperCase()}${n}`).join(" ")}${s.vu[i] && s.secret[i] ? `\n(${s.secret[i]})` : ""}`,
      c: i === s.pos[0] ? "moi" : i === s.pos[1] ? "lui" : "vide",
    }));
    const boutons = cs.map(c => { const [k, d] = c.split(":"); return { t: k === "-" ? `Partir vers ${s.noms[+d]}` : `Prendre ${s.jetons[s.pos[0]][+k]} ${COULEURS[+k]}, aller à ${s.noms[+d]}`, coup: c }; });
    return { statut: s.fini ? s.journal[s.journal.length - 1] : `★ ton agent, ✪ l'agent adverse. Élites 3 pts, argent 2, rue 1 ; majorité d'une couleur +3. Tour ${s.tours[0] + 1}/${TOURS}.`,
      scores: [`${points(s, 0)} pts`, `${points(s, 1)} pts`], grille: { cols: 3, c: "tournee", cases },
      rangees: [{ titre: "Tes jetons", cases: s.sacs[0].map((n, k) => ({ t: `${COULEURS[k]} ${n}`, c: "moi" })) }, { titre: "Jetons adverses", cases: s.sacs[1].map((n, k) => ({ t: `${COULEURS[k]} ${n}`, c: "lui" })) }],
      boutons };
  },
};
