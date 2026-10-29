// Guerre de l'ombre (Stratego remixé) : plateau 5 × 6, 7 unités cachées par camp. Rangs : drone 5 (va loin en ligne
// droite), mercenaires 4, milices 3, sapeur 2 (seul à désamorcer un piège), conseiller 1 (bat le drone s'il attaque).
// Piège et QG ne bougent pas. Une attaque révèle les deux pièces ; la plus forte reste. Prendre le QG gagne.
import { type DefDuel, type EtatBase, base, copie, bonus, hasard, choisir, distraction, noter, finir, verifier, melange } from "./moteur";

const C = 5, L = 6, MAX = 14;
type Rang = "qg" | "piege" | "conseiller" | "sapeur" | "milice" | "mercenaires" | "drone";
const FORCE: Record<Rang, number> = { qg: 0, piege: 0, conseiller: 1, sapeur: 2, milice: 3, mercenaires: 4, drone: 5 };
const NOM: Record<Rang, string> = { qg: "QG", piege: "piège", conseiller: "conseiller", sapeur: "sapeur", milice: "milice", mercenaires: "mercenaires", drone: "drone" };
const SYM: Record<Rang, string> = { qg: "⚑", piege: "✹", conseiller: "1", sapeur: "2", milice: "3", mercenaires: "4", drone: "5" };
const ARMEE: Rang[] = ["qg", "piege", "conseiller", "sapeur", "milice", "milice", "mercenaires", "drone"];
interface P { j: number; r: Rang; vu: boolean }
interface S extends EtatBase { g: (P | null)[]; coups0: number; gagnant: number | null; avantage: number; choix: number | null }
const mobile = (p: P) => p.r !== "qg" && p.r !== "piege";
function cibles(s: S, i: number): number[] {
  const p = s.g[i]!, x = i % C, y = Math.floor(i / C), out: number[] = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 1; k <= (p.r === "drone" ? 4 : 1); k++) {
    const a = x + k * dx, b = y + k * dy; if (a < 0 || b < 0 || a >= C || b >= L) break; const q = s.g[b * C + a];
    if (!q) { out.push(b * C + a); continue; } if (q.j !== p.j) out.push(b * C + a); break;
  }
  return out;
}
const coupsDe = (s: S, j: number) => s.g.flatMap((p, i) => p?.j === j && mobile(p) ? cibles(s, i).map(k => `${i}>${k}`) : []);
// issue d'un combat : 1 l'attaquant gagne, −1 il perd, 0 les deux tombent
function combat(a: Rang, d: Rang): number {
  if (d === "qg") return 1; if (d === "piege") return a === "sapeur" ? 1 : -1;
  if (a === "conseiller" && d === "drone") return 1;
  return FORCE[a] > FORCE[d] ? 1 : FORCE[a] < FORCE[d] ? -1 : 0;
}
function deplacer(s: S, j: number, c: string) {
  const [a, b] = c.split(">").map(Number), p = s.g[a]!, q = s.g[b], qui = j === 0 ? "Ton" : "Le";
  s.g[a] = null;
  if (!q) { s.g[b] = p; noter(s, `${j === 0 ? "Une de tes unités" : "Une unité adverse"} avance.`); return; }
  p.vu = q.vu = true; const r = combat(p.r, q.r);
  noter(s, `${qui} ${NOM[p.r]} attaque ${j === 0 ? "le" : "ton"} ${NOM[q.r]} : ${r > 0 ? "victoire" : r < 0 ? "échec" : "les deux tombent"}.`);
  if (r > 0) s.g[b] = p; else if (r < 0) s.g[b] = q; else s.g[b] = null;
  if (q.r === "qg") { s.gagnant = j; finir(s, j === 0 ? "QG adverse capturé : la guerre de l'ombre est gagnée !" : "Ton QG est tombé."); }
}
const materiel = (s: S, j: number) => s.g.reduce((a, p) => a + (p?.j === j ? FORCE[p.r] + (p.r === "qg" ? 0 : 1) : 0), 0);
function iaCoup(s: S): string {
  const l = coupsDe(s, 1); if (hasard(s) < distraction(s.avantage) * 0.7) return choisir(s, l);
  const v = (c: string) => { const [a, b] = c.split(">").map(Number), p = s.g[a]!, q = s.g[b];
    if (!q) return (Math.floor(b / C) - Math.floor(a / C)) * 0.6 + hasard(s) * 0.3 - (p.r === "drone" ? 0.2 : 0);
    if (!q.vu) return FORCE[p.r] >= 3 ? 1.5 : p.r === "sapeur" ? 1 : -0.5; // inconnu : y aller avec du solide
    const r = combat(p.r, q.r); return r > 0 ? 3 + FORCE[q.r] + (q.r === "qg" ? 100 : 0) : r < 0 ? -4 : 0.5; };
  return l.map(c => ({ c, v: v(c) })).sort((a, b) => b.v - a.v)[0].c;
}
export const STRATEGO: DefDuel<S> = {
  id: "stratego",
  creer(graine, avantage) {
    const s: S = { ...base(graine), g: Array(C * L).fill(null), coups0: 0, gagnant: null, avantage, choix: null };
    const placer = (j: number, armee: Rang[]) => {
      const lignes = j === 0 ? [5, 4] : [0, 1], fond = melange(s, [...Array(C).keys()]);
      const ordre = melange(s, armee.filter(r => r !== "qg" && r !== "piege"));
      s.g[lignes[0] * C + fond[0]] = { j, r: "qg", vu: false }; if (armee.includes("piege")) s.g[lignes[0] * C + fond[1]] = { j, r: "piege", vu: false };
      const libres = [...fond.slice(2).map(x => lignes[0] * C + x), ...[...Array(C).keys()].map(x => lignes[1] * C + x)];
      ordre.forEach((r, k) => { s.g[libres[k]] = { j, r, vu: false }; });
    };
    const n = bonus(s, avantage, 1);
    placer(0, n > 0 ? [...ARMEE, "mercenaires"] : ARMEE); placer(1, n < 0 ? [...ARMEE, "mercenaires"] : ARMEE);
    noter(s, n > 0 ? "Préparation : des mercenaires de plus dans ton camp." : n < 0 ? "L'adversaire a recruté des mercenaires de plus." : "Les deux réseaux se déploient dans l'ombre.");
    return s;
  },
  coups(s) {
    if (s.fini) return [];
    const l = coupsDe(s, 0);
    if (s.choix === null) return [...new Set(l.map(c => `unite:${c.split(">")[0]}`))];
    return [...l.filter(c => +c.split(">")[0] === s.choix).map(c => `vers:${c.split(">")[1]}`), "annuler"];
  },
  jouer(s0, coup) {
    verifier(STRATEGO, s0, coup); const s = copie(s0);
    if (coup === "annuler") { s.choix = null; return s; }
    if (coup.startsWith("unite:")) { s.choix = +coup.slice(6); return s; }
    s.tour++; s.coups0++; deplacer(s, 0, `${s.choix}>${coup.slice(5)}`); s.choix = null;
    if (!s.fini) { const l = coupsDe(s, 1); if (l.length) deplacer(s, 1, iaCoup(s)); }
    if (!s.fini && (s.coups0 >= MAX || !coupsDe(s, 0).length)) finir(s, "Cessez-le-feu : on compte les unités restantes.");
    return s;
  },
  resultat: s => s.gagnant === 0 ? 1 : s.gagnant === 1 ? 0 : Math.max(0.1, Math.min(0.9, 0.5 + (materiel(s, 0) - materiel(s, 1)) / 30)),
  vue(s) {
    const cs = s.fini ? [] : STRATEGO.coups(s);
    return { statut: s.fini ? s.journal[s.journal.length - 1] : s.choix === null ? `Choisis une unité (coup ${s.coups0 + 1}/${MAX}). Les unités adverses sont cachées jusqu'au contact.` : `Où va ton ${NOM[s.g[s.choix]!.r]} ?`,
      scores: [`${materiel(s, 0)} forces`, `${materiel(s, 1)}`],
      grille: { cols: C, cases: s.g.map((p, i) => ({ t: !p ? "" : p.j === 0 || p.vu ? SYM[p.r] : "?", titre: p && (p.j === 0 || p.vu) ? NOM[p.r] : "", c: !p ? (cs.includes(`vers:${i}`) ? "possible" : "vide") : p.j === 0 ? "moi" : "lui",
        coup: cs.includes(`unite:${i}`) ? `unite:${i}` : cs.includes(`vers:${i}`) ? `vers:${i}` : undefined })) },
      rangees: [{ titre: "Rangs", cases: [{ t: "5 drone (loin en ligne) · 4 mercenaires · 3 milice · 2 sapeur (désamorce ✹) · 1 conseiller (bat le drone en attaquant) · ⚑ QG", c: "etiquette" }] }],
      boutons: s.choix !== null ? [{ t: "Changer d'unité", coup: "annuler" }] : [] };
  },
};
