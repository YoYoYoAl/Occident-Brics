// Corsaires du commerce (Korsar remixé) : des flux commerciaux (valeur 2 à 5) arrivent sur la table. On les attaque
// avec des cartes de sanctions de 4 couleurs (force 1 à 4) ; sur un flux, chaque camp joue une seule couleur et
// cumule sa force. Un amiral (un allié) emporte le flux, sauf amiral adverse par-dessus. Au début de ton tour,
// tu encaisses chaque flux où tu mènes seul depuis un tour complet. 8 tours chacun.
import { type DefDuel, type EtatBase, base, copie, hasard, choisir, distraction, noter, finir, verifier, melange, part } from "./moteur";

export const COULEURS = ["douanes", "finance", "technologie", "énergie"];
type Carte = { c: number; f: number } | { amiral: true };
interface Flux { v: number; att: [{ c: number; f: number } | null, { c: number; f: number } | null]; amiral: number | null; meneur: number | null }
interface S extends EtatBase { flux: Flux[]; mains: [Carte[], Carte[]]; pioche: Carte[]; vagues: number[]; gains: [number, number]; tours: [number, number]; avantage: number; choix: number | null }
const TOURS = 8;
const meneurDe = (f: Flux) => f.amiral !== null ? f.amiral : (f.att[0]?.f ?? 0) > (f.att[1]?.f ?? 0) ? 0 : (f.att[1]?.f ?? 0) > (f.att[0]?.f ?? 0) ? 1 : null;
const estAmiral = (k: Carte): k is { amiral: true } => "amiral" in k;
function cartesJouables(s: S, j: number, fi: number): number[] {
  const f = s.flux[fi]; return s.mains[j].map((k, i) => ({ k, i })).filter(({ k }) => estAmiral(k) ? f.amiral === null || f.amiral !== j : f.amiral === null && (!f.att[j] || f.att[j]!.c === k.c) && f.att[1 - j]?.c !== k.c).map(x => x.i);
}
function coupsDe(s: S, j: number): string[] { const out: string[] = []; s.flux.forEach((_, fi) => cartesJouables(s, j, fi).forEach(i => out.push(`${i}:${fi}`))); return out.length ? out : ["defausser"]; }
function encaisser(s: S, j: number) {
  for (let fi = s.flux.length - 1; fi >= 0; fi--) { const f = s.flux[fi]; if (f.meneur === j && meneurDe(f) === j && (f.att[j] || f.amiral === j)) { s.gains[j] += f.v; s.flux.splice(fi, 1); noter(s, `${j === 0 ? "Tu encaisses" : "L'adversaire encaisse"} un flux de valeur ${f.v}.`); } }
  if (s.vagues.length && s.flux.length < 3) s.flux.push({ v: s.vagues.shift()!, att: [null, null], amiral: null, meneur: null });
}
function appliquer(s: S, j: number, coup: string) {
  if (coup === "defausser") { if (s.mains[j].length) s.mains[j].shift(); } else {
    const [i, fi] = coup.split(":").map(Number), k = s.mains[j][i], f = s.flux[fi];
    if (estAmiral(k)) { f.amiral = j; noter(s, `${j === 0 ? "Ton amiral" : "Un amiral adverse"} prend le flux ${f.v} sous sa protection.`); }
    else { f.att[j] = { c: k.c, f: (f.att[j]?.f ?? 0) + k.f }; noter(s, `${j === 0 ? "Tes" : "Des"} sanctions ${COULEURS[k.c]} (+${k.f}) sur le flux ${f.v}.`); }
    s.mains[j].splice(i, 1);
  }
  if (s.pioche.length) s.mains[j].push(s.pioche.shift()!);
  s.tours[j]++;
  for (const f of s.flux) f.meneur = meneurDe(f); // qui mène à la fin de ce coup
}
function iaCoup(s: S): string {
  const l = coupsDe(s, 1); if (hasard(s) < distraction(s.avantage)) return choisir(s, l);
  const v = (c: string) => { if (c === "defausser") return -1; const [i, fi] = c.split(":").map(Number), k = s.mains[1][i], f = s.flux[fi];
    if (estAmiral(k)) return f.v * (f.amiral === 0 ? 1.4 : 0.8) - 1; const apres = (f.att[1]?.f ?? 0) + k.f, lui = f.att[0]?.f ?? 0;
    return apres > lui ? f.v + 0.5 - k.f * 0.3 : 0.2 * f.v - k.f * 0.2; };
  return l.map(c => ({ c, v: v(c) })).sort((a, b) => b.v - a.v)[0].c;
}
const nomCarte = (k: Carte) => estAmiral(k) ? "Amiral" : `${COULEURS[k.c]} ${k.f}`;
export const KORSAR: DefDuel<S> = {
  id: "korsar",
  creer(graine, avantage) {
    const s: S = { ...base(graine), flux: [], mains: [[], []], pioche: [], vagues: [], gains: [0, 0], tours: [0, 0], avantage, choix: null };
    const cartes: Carte[] = []; for (let c = 0; c < 4; c++) for (const f of [1, 1, 2, 2, 3, 4]) cartes.push({ c, f }); cartes.push({ amiral: true }, { amiral: true }, { amiral: true });
    s.pioche = melange(s, cartes); s.vagues = melange(s, [2, 2, 3, 3, 3, 4, 4, 5, 5]);
    for (let k = 0; k < 3; k++) s.flux.push({ v: s.vagues.shift()!, att: [null, null], amiral: null, meneur: null });
    const n = 5 + Math.max(-1, Math.min(1, Math.round(avantage)));
    s.mains = [s.pioche.splice(0, n), s.pioche.splice(0, 5 - (n - 5))];
    noter(s, `Trois flux commerciaux sont en vue. Tu as ${n} cartes, l'adversaire ${s.mains[1].length}.`);
    return s;
  },
  coups(s) {
    if (s.fini) return [];
    if (s.choix === null) { const l = coupsDe(s, 0); return l[0] === "defausser" ? l : [...new Set(l.map(c => `carte:${c.split(":")[0]}`))]; }
    return [...s.flux.map((_, fi) => fi).filter(fi => cartesJouables(s, 0, fi).includes(s.choix!)).map(fi => `flux:${fi}`), "annuler"];
  },
  jouer(s0, coup) {
    verifier(KORSAR, s0, coup); const s = copie(s0);
    if (coup === "annuler") { s.choix = null; return s; }
    if (coup.startsWith("carte:")) { s.choix = +coup.slice(6); return s; }
    s.tour++;
    const c = coup === "defausser" ? "defausser" : `${s.choix}:${coup.slice(5)}`; s.choix = null;
    appliquer(s, 0, c);
    if (!s.fini) { encaisser(s, 1); appliquer(s, 1, iaCoup(s)); encaisser(s, 0); } // le joueur encaisse au début de son tour suivant
    if (s.tours[0] >= TOURS && s.tours[1] >= TOURS || !s.flux.length) { encaisser(s, 0); encaisser(s, 1); finir(s, "Fin de la campagne de sanctions : on compte les flux encaissés."); }
    return s;
  },
  resultat: s => part(s.gains[0] + 0.5 * s.flux.filter(f => meneurDe(f) === 0).reduce((a, f) => a + f.v, 0), s.gains[1] + 0.5 * s.flux.filter(f => meneurDe(f) === 1).reduce((a, f) => a + f.v, 0)),
  vue(s) {
    const cs = KORSAR.coups(s);
    return { statut: s.fini ? s.journal[s.journal.length - 1] : s.choix === null ? `Choisis une carte, puis le flux visé. Tu encaisses un flux si tu y mènes encore au début de ton tour suivant. Tour ${s.tours[0] + 1}/${TOURS}.` : `${nomCarte(s.mains[0][s.choix])} : sur quel flux ?`,
      scores: [`${s.gains[0]} encaissés`, `${s.gains[1]}`],
      rangees: [
        { titre: "Flux commerciaux", cases: s.flux.map((f, fi) => ({ t: `Valeur ${f.v}\nToi : ${f.amiral === 0 ? "amiral" : f.att[0] ? `${COULEURS[f.att[0].c]} ${f.att[0].f}` : "—"}\nAdversaire : ${f.amiral === 1 ? "amiral" : f.att[1] ? `${COULEURS[f.att[1].c]} ${f.att[1].f}` : "—"}`,
          c: meneurDe(f) === 0 ? "moi" : meneurDe(f) === 1 ? "lui" : "vide", coup: cs.includes(`flux:${fi}`) ? `flux:${fi}` : undefined })) },
        { titre: "Ta main", cases: s.mains[0].map((k, i) => ({ t: nomCarte(k), c: s.choix === i ? "choisi" : "carte", coup: cs.includes(`carte:${i}`) ? `carte:${i}` : undefined })) },
      ],
      boutons: [...(cs.includes("defausser") ? [{ t: "Défausser (aucune carte jouable)", coup: "defausser" }] : []), ...(s.choix !== null ? [{ t: "Annuler", coup: "annuler" }] : [])] };
  },
};
