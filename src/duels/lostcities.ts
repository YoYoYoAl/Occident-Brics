// Course aux laboratoires (Lost Cities remixé) : 5 pistes de recherche (IA, puces, nucléaire, spatial, biotech),
// cartes 2 à 10 et une carte « pari » par piste. Sur une piste, on pose en ordre croissant ; le pari se pose avant
// tout chiffre et double la mise. Une piste ouverte coûte 15 : elle ne paie que si elle va assez loin.
// À ton tour : poser une carte sur ta piste, ou la défausser, puis piocher. 9 tours chacun.
import { type DefDuel, type EtatBase, base, copie, hasard, choisir, distraction, noter, finir, verifier, melange, ecart } from "./moteur";

export const PISTES = ["IA", "puces", "nucléaire", "spatial", "biotech"];
const COUT = 15, TOURS = 9, MAIN = 6;
interface Carte { p: number; v: number } // v = 0 : pari
interface S extends EtatBase { pioche: Carte[]; mains: [Carte[], Carte[]]; pistes: [Carte[][], Carte[][]]; tours: [number, number]; avantage: number }
const nom = (k: Carte) => `${PISTES[k.p]} ${k.v || "pari"}`;
function peutPoser(s: S, j: number, k: Carte): boolean { const t = s.pistes[j][k.p], d = t[t.length - 1]; return !d || (k.v === 0 ? d.v === 0 : k.v > d.v); }
function scorePiste(t: Carte[]): number { if (!t.length) return 0; const paris = t.filter(k => k.v === 0).length; return (t.reduce((a, k) => a + k.v, 0) - COUT) * (1 + paris) + (t.length >= 6 ? 10 : 0); }
const score = (s: S, j: number) => s.pistes[j].reduce((a, t) => a + scorePiste(t), 0);
function coupsDe(s: S, j: number): string[] { const out: string[] = []; s.mains[j].forEach((k, i) => { if (peutPoser(s, j, k)) out.push(`poser:${i}`); out.push(`defausser:${i}`); }); return out; }
function appliquer(s: S, j: number, coup: string) {
  const [t, v] = coup.split(":"), k = s.mains[j][+v]; s.mains[j].splice(+v, 1);
  if (t === "poser") { s.pistes[j][k.p].push(k); noter(s, `${j === 0 ? "Tu lances" : "L'adversaire lance"} ${nom(k)}.`); } else noter(s, `${j === 0 ? "Tu défausses" : "L'adversaire défausse"} ${nom(k)}.`);
  if (s.pioche.length) s.mains[j].push(s.pioche.shift()!);
  s.tours[j]++;
  if (s.tours[0] >= TOURS && s.tours[1] >= TOURS) finir(s, "Fin de la course : chaque piste ouverte compte sa somme moins 15.");
}
// L'IA estime ce que vaut une piste en comptant les cartes qu'elle tient encore pour elle.
function iaCoup(s: S): string {
  const l = coupsDe(s, 1); if (hasard(s) < distraction(s.avantage)) return choisir(s, l);
  const m = s.mains[1], reste = TOURS - s.tours[1];
  const v = (c: string) => { const [t, i] = c.split(":"), k = m[+i], piste = s.pistes[1][k.p];
    const potentiel = m.filter(x => x.p === k.p && x !== k && x.v > k.v).reduce((a, x) => a + x.v, 0);
    if (t === "poser") { const ouverte = piste.length > 0, somme = piste.reduce((a, x) => a + x.v, 0) + k.v;
      const ecartCarte = k.v - (piste[piste.length - 1]?.v ?? 1); // sauter des chiffres gâche la piste
      return ouverte ? 5 - ecartCarte * 0.6 + (somme >= COUT ? 1 : 0) : (somme + potentiel >= COUT + 4 && reste >= 3 ? 3 - ecartCarte * 0.3 : -6); }
    return -k.v * 0.2 - (potentiel ? 1 : 0); };
  return l.map(c => ({ c, v: v(c) })).sort((a, b) => b.v - a.v)[0].c;
}
export const LOSTCITIES: DefDuel<S> = {
  id: "lostcities",
  creer(graine, avantage) {
    const s: S = { ...base(graine), pioche: [], mains: [[], []], pistes: [[[], [], [], [], []], [[], [], [], [], []]], tours: [0, 0], avantage };
    const cartes: Carte[] = []; for (let p = 0; p < 5; p++) { cartes.push({ p, v: 0 }); for (let v = 2; v <= 10; v++) cartes.push({ p, v }); }
    s.pioche = melange(s, cartes);
    const n = MAIN + Math.max(-1, Math.min(1, Math.round(avantage)));
    s.mains = [s.pioche.splice(0, n), s.pioche.splice(0, 2 * MAIN - n)];
    noter(s, `Les laboratoires ouvrent. Main de ${n} cartes pour toi, ${2 * MAIN - n} pour l'adversaire.`);
    return s;
  },
  coups: s => s.fini ? [] : coupsDe(s, 0),
  jouer(s0, coup) { verifier(LOSTCITIES, s0, coup); const s = copie(s0); s.tour++; appliquer(s, 0, coup); if (!s.fini) appliquer(s, 1, iaCoup(s)); return s; },
  resultat: s => ecart(score(s, 0) - score(s, 1), 12),
  aide(s) {
    const l = coupsDe(s, 0), m = s.mains[0];
    const poses = l.filter(c => c.startsWith("poser")).map(c => ({ c, k: m[+c.split(":")[1]] })).filter(x => s.pistes[0][x.k.p].length || m.filter(y => y.p === x.k.p).reduce((a, y) => a + y.v, 0) >= COUT);
    if (poses.length) return poses.sort((a, b) => a.k.v - b.k.v)[0].c;
    return l.filter(c => c.startsWith("defausser")).sort((a, b) => m[+a.split(":")[1]].v - m[+b.split(":")[1]].v)[0];
  },
  vue(s) {
    const l = s.fini ? [] : coupsDe(s, 0);
    return { statut: s.fini ? s.journal[s.journal.length - 1] : `Pose une carte en ordre croissant sur sa piste, ou défausse-la. Une piste ouverte coûte 15. Tour ${s.tours[0] + 1}/${TOURS}.`,
      scores: [`${score(s, 0)} pts`, `${score(s, 1)} pts`],
      rangees: [
        ...PISTES.map((n, p) => ({ titre: `${n} : toi ${scorePiste(s.pistes[0][p])} · adversaire ${scorePiste(s.pistes[1][p])}`, cases: [
          { t: s.pistes[0][p].map(k => k.v || "pari").join(" › ") || "—", c: "moi" }, { t: s.pistes[1][p].map(k => k.v || "pari").join(" › ") || "—", c: "lui" }] })),
        { titre: "Ta main (clic : poser ; bouton : défausser)", cases: s.mains[0].map((k, i) => ({ t: nom(k), c: "carte", coup: l.includes(`poser:${i}`) ? `poser:${i}` : undefined })) },
      ],
      boutons: s.mains[0].map((k, i) => ({ t: `Défausser ${nom(k)}`, coup: l.includes(`defausser:${i}`) ? `defausser:${i}` : undefined })) };
  },
};
