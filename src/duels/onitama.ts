// Manœuvres navales (Onitama remixé) : plateau 5 × 5, un vaisseau amiral et 4 frégates de chaque côté. 5 cartes de
// mouvement : chacun en tient 2, la 5e attend. Tu joues une carte pour déplacer un navire selon l'un de ses vecteurs,
// puis elle passe… à l'adversaire (elle prend la place de la carte en attente). Couler l'amiral adverse ou amener
// ton amiral dans le port adverse gagne. 10 coups chacun.
import { type DefDuel, type EtatBase, base, copie, bonus, hasard, choisir, distraction, noter, finir, verifier, melange } from "./moteur";

const N = 5, MAX = 10;
// vecteurs (dx, dy) vus du joueur du bas : dy négatif = vers l'avant
const CARTES: { nom: string; v: [number, number][] }[] = [
  { nom: "Patrouille", v: [[0, -1], [0, 1]] }, { nom: "Débordement", v: [[-2, 0], [2, 0], [0, -1]] }, { nom: "Écran", v: [[-1, 0], [1, 0], [0, -1]] },
  { nom: "Percée", v: [[0, -2], [0, 1]] }, { nom: "Tenaille gauche", v: [[-1, -1], [1, 1], [1, 0]] }, { nom: "Tenaille droite", v: [[1, -1], [-1, 1], [-1, 0]] },
  { nom: "Esquive", v: [[-1, -1], [1, -1], [0, 1]] }, { nom: "Contournement", v: [[-1, 0], [1, -1], [1, 1]] },
];
interface P { j: number; amiral: boolean }
interface S extends EtatBase { g: (P | null)[]; mains: [number[], number[]]; attente: number; coups0: [number, number]; gagnant: number | null; avantage: number; choix: number | null }
const PORT = [22, 2]; // port de chaque camp (case de départ de son amiral)
function coupsDe(s: S, j: number): string[] {
  const out: string[] = [];
  s.g.forEach((p, i) => { if (p?.j !== j) return; const x = i % N, y = Math.floor(i / N);
    for (const c of s.mains[j]) for (const [dx, dy] of CARTES[c].v) { const a = x + (j === 0 ? dx : -dx), b = y + (j === 0 ? dy : -dy); if (a < 0 || b < 0 || a >= N || b >= N) continue; const k = b * N + a; if (s.g[k]?.j !== j) out.push(`${c}:${i}>${k}`); } });
  return out;
}
function jouerCoup(s: S, j: number, coup: string) {
  const [c, mv] = coup.split(":"), [a, b] = mv.split(">").map(Number), p = s.g[a]!, pris = s.g[b];
  s.g[b] = p; s.g[a] = null; s.coups0[j]++;
  const m = s.mains[j]; m[m.indexOf(+c)] = s.attente; s.attente = +c;
  noter(s, `${j === 0 ? "Tu joues" : "L'adversaire joue"} « ${CARTES[+c].nom} »${pris ? ` et coule ${pris.amiral ? "l'amiral" : "une frégate"}` : ""}.`);
  if (pris?.amiral) { s.gagnant = j; finir(s, j === 0 ? "L'amiral adverse est coulé : la mer est à toi." : "Ton amiral est coulé."); }
  else if (p.amiral && b === PORT[1 - j]) { s.gagnant = j; finir(s, j === 0 ? "Ton amiral entre dans le port adverse !" : "L'amiral adverse entre dans ton port."); }
  else if (s.coups0[0] >= MAX && s.coups0[1] >= MAX) finir(s, "Fin des manœuvres : on compte les navires.");
}
const valeur = (s: S, j: number) => s.g.reduce((a, p) => a + (p ? (p.j === j ? 1 : -1) * (p.amiral ? 10 : 1) : 0), 0);
function iaCoup(s: S): string {
  const l = coupsDe(s, 1); if (hasard(s) < distraction(s.avantage) * 0.7) return choisir(s, l);
  const v = (c: string) => { const t = copie(s); jouerCoup(t, 1, c); if (t.gagnant === 1) return 1000;
    const rep = coupsDe(t, 0); let pire = 0;
    for (const r of rep) { const u = copie(t); jouerCoup(u, 0, r); if (u.gagnant === 0) return -1000; pire = Math.min(pire, valeur(u, 1) - valeur(t, 1)); }
    const am = t.g.findIndex(p => p?.j === 1 && p.amiral);
    return valeur(t, 1) + pire * 0.9 + (Math.floor(am / N)) * 0.15;
  };
  return l.map(c => ({ c, v: v(c) })).sort((a, b) => b.v - a.v)[0].c;
}
export const ONITAMA: DefDuel<S> = {
  id: "onitama",
  creer(graine, avantage) {
    const s: S = { ...base(graine), g: Array(N * N).fill(null), mains: [[], []], attente: 0, coups0: [0, 0], gagnant: null, avantage, choix: null };
    for (let x = 0; x < N; x++) { s.g[20 + x] = { j: 0, amiral: x === 2 }; s.g[x] = { j: 1, amiral: x === 2 }; }
    const c = melange(s, [...CARTES.keys()]).slice(0, 5); s.mains = [[c[0], c[1]], [c[2], c[3]]]; s.attente = c[4];
    const n = bonus(s, Math.abs(avantage), 2);
    for (let k = 0; k < n; k++) s.g[avantage > 0 ? [0, 4][k] : [20, 24][k]] = null;
    noter(s, n ? `Préparation : ${n} frégate${n > 1 ? "s" : ""} ${avantage > 0 ? "adverse" : "à toi"}${n > 1 ? "s" : ""} retenue${n > 1 ? "s" : ""} au port.` : "Les deux escadres se font face.");
    return s;
  },
  coups(s) {
    if (s.fini) return [];
    const l = coupsDe(s, 0);
    if (s.choix === null) return [...new Set(l.map(c => `navire:${c.split(":")[1].split(">")[0]}`))];
    return [...l.filter(c => +c.split(":")[1].split(">")[0] === s.choix).map(c => `coup:${c}`), "annuler"];
  },
  jouer(s0, coup) {
    verifier(ONITAMA, s0, coup); const s = copie(s0);
    if (coup === "annuler") { s.choix = null; return s; }
    if (coup.startsWith("navire:")) { s.choix = +coup.slice(7); return s; }
    s.tour++; s.choix = null; jouerCoup(s, 0, coup.slice(5));
    if (!s.fini) { const l = coupsDe(s, 1); if (l.length) jouerCoup(s, 1, iaCoup(s)); else s.coups0[1]++; }
    if (!s.fini && !coupsDe(s, 0).length) finir(s, "Ton escadre est immobilisée.");
    return s;
  },
  resultat: s => s.gagnant === 0 ? 1 : s.gagnant === 1 ? 0 : Math.max(0.1, Math.min(0.9, 0.5 + 0.08 * valeur(s, 0))),
  vue(s) {
    const cs = s.fini ? [] : ONITAMA.coups(s), dest = new Map<number, string>();
    for (const c of cs) if (c.startsWith("coup:")) { const k = +c.split(">")[1]; if (!dest.has(k)) dest.set(k, c); }
    return { statut: s.fini ? s.journal[s.journal.length - 1] : s.choix === null ? `Choisis un navire (coup ${s.coups0[0] + 1}/${MAX}). La carte jouée passe à l'adversaire.` : "Choisis la destination (chaque case correspond à une carte).",
      scores: [`${s.g.filter(p => p?.j === 0).length} navires`, `${s.g.filter(p => p?.j === 1).length}`],
      grille: { cols: N, c: "mer", cases: s.g.map((p, i) => ({ t: p ? (p.amiral ? "⚓" : "⛵") : PORT.includes(i) ? "⌂" : "", c: p ? (p.j === 0 ? "moi" : "lui") : dest.has(i) ? "possible" : "eau",
        coup: s.choix === null ? (cs.includes(`navire:${i}`) ? `navire:${i}` : undefined) : dest.get(i) })) },
      rangees: [
        { titre: "Tes cartes", cases: s.mains[0].map(c => ({ t: `${CARTES[c].nom}\n${CARTES[c].v.map(([dx, dy]) => `${dx > 0 ? "→" : dx < 0 ? "←" : ""}${Math.abs(dx) > 1 ? "2" : ""}${dy < 0 ? "↑" : dy > 0 ? "↓" : ""}${Math.abs(dy) > 1 ? "2" : ""}`).join(" ")}`, c: "carte" })) },
        { titre: "En attente (ira à celui qui joue)", cases: [{ t: CARTES[s.attente].nom, c: "vide" }] },
        { titre: "Cartes adverses", cases: s.mains[1].map(c => ({ t: CARTES[c].nom, c: "lui" })) },
      ],
      boutons: s.choix !== null ? [{ t: "Changer de navire", coup: "annuler" }] : [] };
  },
};
