// Présentation des duels, sans DOM : illustration de chaque duel, coup joué par la démonstration animée
// (et par le bouton « Conseil »), et repérage des cases qui changent d'un coup à l'autre pour les animer.
import { type IdDuel, LISTE_DUELS } from "../duels/catalogue";
import type { DefDuel, EtatBase, Vue, Case } from "../duels/moteur";

// Illustration d'en-tête : une image existante du jeu qui montre la situation du duel.
// Bandeaux dédiés (lot ob_9, une scène par duel, sans texte) : duel_<id>.
export const IMAGE_DUEL = Object.fromEntries(LISTE_DUELS.map(k => [k, `duel_${k}`])) as Record<IdDuel, string>;

// Coup de démonstration : le conseil du duel s'il en a un, sinon le coup qui donne le meilleur résultat
// après la réponse de l'adversaire (un coup d'avance, au plus 24 essais et 200 ms ; égalités tirées au hasard).
// Testé sur les 22 duels dans tests/acceptation-v22.test.ts.
// Duels où l'essai d'un coup révélerait l'information cachée (choix simultané, cartes ou pièces cachées) et qui n'ont pas de conseil honnête.
export const INFO_CACHEE = ["streetfighter", "coup", "stratego"];
export function coupDemo(def: DefDuel<any>, s: EtatBase, hasard: () => number): string | null {
  const l = def.coups(s); if (!l.length) return null;
  if (def.aide) { try { const a = def.aide(s); if (l.includes(a)) return a; } catch { /* pas de conseil dans cette phase */ } }
  if (l.includes("vu")) return "vu";
  const c = l.filter(x => x !== "temps"); if (!c.length) return l[0];
  for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(hasard() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
  if (INFO_CACHEE.includes(def.id)) return c[0]; // jeu à information cachée : jouer le coup sur l'état réel dévoilerait les pièces adverses
  let meilleurs: string[] = [], max = -1; const t0 = Date.now();
  for (const x of c.slice(0, 24)) {
    if (Date.now() - t0 > 200 && meilleurs.length) break;
    // un vrai coup (le tour avance) passe devant une simple sélection ou un « changer de pièce »
    let v: number; try { const t = def.jouer(s, x); v = def.resultat(t) + (t.tour > s.tour ? 1 : 0); } catch { continue; }
    if (v > max + 1e-9) { max = v; meilleurs = [x]; } else if (Math.abs(v - max) <= 1e-9) meilleurs.push(x);
  }
  return meilleurs.length ? meilleurs[Math.floor(hasard() * meilleurs.length)] : c[0];
}

// Cases de la vue, repérées comme dans l'affichage : g<i> pour la grille, r<k>_<i> pour les rangées.
export function casesVue(v: Vue): Map<string, Case> {
  const m = new Map<string, Case>();
  v.grille?.cases.forEach((c, i) => m.set(`g${i}`, c));
  (v.rangees ?? []).forEach((r, k) => r.cases.forEach((c, i) => m.set(`r${k}_${i}`, c)));
  return m;
}
const camp = (c?: Case) => /\bmoi\b/.test(c?.c ?? "") ? 0 : /\blui\b/.test(c?.c ?? "") ? 1 : -1;
// Cases nouvelles ou modifiées (« neuf ») et cases passées d'un camp à l'autre (« bascule »).
export function changements(avant: Vue | null, apres: Vue): Map<string, "neuf" | "bascule"> {
  const r = new Map<string, "neuf" | "bascule">(); if (!avant) return r;
  const a = casesVue(avant);
  for (const [k, c] of casesVue(apres)) {
    const p = a.get(k); if (!p) continue;
    const ca = camp(p), cb = camp(c);
    if (ca >= 0 && cb >= 0 && ca !== cb) r.set(k, "bascule");
    else if (p.t !== c.t || ca !== cb) r.set(k, "neuf");
  }
  return r;
}
