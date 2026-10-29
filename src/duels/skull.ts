// Guerre de l'information (Skull remixé) : chaque camp a 3 informations vraies et 1 fausse. À chaque manche, chacun
// pose 3 informations face cachée (avec ou sans la fausse), puis on enchérit sur le nombre de vraies qu'on peut
// révéler sans tomber sur un faux. Le meilleur enchérisseur révèle d'abord les siennes, puis celles de l'adversaire.
// Réussir marque un point ; tomber sur un faux coûte une information. 2 points gagnent ; 5 manches au plus.
import { type DefDuel, type EtatBase, base, copie, bonus, hasard, entier, distraction, noter, finir, verifier } from "./moteur";

interface S extends EtatBase {
  vraies: [number, number]; fausse: [boolean, boolean]; piles: [boolean[], boolean[]]; // true = vraie (révélée de haut en bas)
  phase: "poser" | "encherir"; mise: number; miseur: number; points: [number, number]; manche: number; avantage: number;
}
const MAX = 5;
const peutPoser = (s: S, j: number, avecFausse: boolean) => avecFausse ? s.fausse[j] && s.vraies[j] >= 2 : s.vraies[j] >= 3;
function poserPile(s: S, j: number, avecFausse: boolean, place = 0) {
  const n = 3, pile = Array(n).fill(true); if (avecFausse) pile[place] = false; s.piles[j] = pile;
}
function reveler(s: S, j: number) {
  const o = 1 - j, a = s.piles[j], b = s.piles[o]; let reste = s.mise, ok = true;
  for (const x of a) { if (!reste) break; if (!x) { ok = false; break; } reste--; }
  if (ok) for (const x of b) { if (!reste) break; if (!x) { ok = false; break; } reste--; }
  const qui = j === 0 ? "Tu" : "L'adversaire";
  if (ok) { s.points[j]++; noter(s, `${qui} ${j === 0 ? "révèles" : "révèle"} ${s.mise} informations vraies : point marqué.`); }
  else { // perte : la fausse si elle était dans sa propre pile, sinon une vraie au hasard
    if (!a.every(x => x) && s.fausse[j] && entier(s, 2) === 0) s.fausse[j] = false; else s.vraies[j] = Math.max(0, s.vraies[j] - 1);
    noter(s, `${qui} ${j === 0 ? "tombes" : "tombe"} sur une fausse information : ${j === 0 ? "tu perds" : "il perd"} une carte.`);
  }
  s.manche++; s.phase = "poser"; s.mise = 0;
  if (s.points[j] >= 2) finir(s, j === 0 ? "Deux révélations réussies : ta version des faits s'impose." : "L'adversaire impose sa version des faits.");
  else if (!peutPoser(s, j, false) && !peutPoser(s, j, true)) finir(s, j === 0 ? "Tu n'as plus assez de sources crédibles." : "L'adversaire n'a plus assez de sources.");
  else if (s.manche >= MAX) finir(s, "Fin de la campagne d'information.");
}
// Nombre de vraies que l'IA croit pouvoir révéler : les siennes, plus une estimation chez le joueur.
function iaEnchere(s: S): number | null {
  const miennes = s.piles[1].findIndex(x => !x), sures = miennes < 0 ? 3 : miennes;
  const estime = sures + (sures === 3 ? 1.6 - s.mise * 0.1 : 0) + (hasard(s) < distraction(s.avantage) ? 1 : 0);
  return s.mise + 1 <= Math.floor(estime) && s.mise < 6 ? s.mise + 1 : null;
}
export const SKULL: DefDuel<S> = {
  id: "skull",
  creer(graine, avantage) {
    const s: S = { ...base(graine), vraies: [3, 3], fausse: [true, true], piles: [[], []], phase: "poser", mise: 0, miseur: 0, points: [0, 0], manche: 0, avantage };
    const n = bonus(s, Math.abs(avantage), 1); if (n) s.vraies[avantage > 0 ? 1 : 0]--; // une source grillée : ce camp devra glisser sa fausse
    noter(s, n ? (avantage > 0 ? "Préparation : une source adverse est grillée, il devra jouer sa fausse." : "Une de tes sources est grillée : tu devras jouer ta fausse.") : "Pose 3 informations : avec ou sans ta fausse (et où), pour piéger une enchère trop gourmande.");
    return s;
  },
  coups(s) {
    if (s.fini) return [];
    if (s.phase === "poser") return [...(peutPoser(s, 0, false) ? ["vraies"] : []), ...(peutPoser(s, 0, true) ? ["fausse:0", "fausse:1", "fausse:2"] : [])];
    return [...(s.mise < 6 ? [`miser:${s.mise + 1}`] : []), ...(s.mise < 5 ? [`miser:${s.mise + 2}`] : []), ...(s.mise > 0 ? ["passer"] : [])];
  },
  jouer(s0, coup) {
    verifier(SKULL, s0, coup); const s = copie(s0);
    if (s.phase === "poser") {
      s.tour++;
      if (coup === "vraies") poserPile(s, 0, false); else poserPile(s, 0, true, +coup.split(":")[1]);
      const fausseIA = peutPoser(s, 1, true) && (hasard(s) < 0.45 || !peutPoser(s, 1, false));
      poserPile(s, 1, fausseIA, entier(s, 3)); s.phase = "encherir";
      // l'IA ouvre une manche sur deux
      if (s.manche % 2 === 1) { const m = iaEnchere(s); if (m) { s.mise = m; s.miseur = 1; noter(s, `L'adversaire mise ${m}.`); } else { s.mise = 1; s.miseur = 1; noter(s, "L'adversaire mise 1."); } }
      return s;
    }
    if (coup === "passer") { noter(s, "Tu passes : l'adversaire doit révéler."); reveler(s, s.miseur); return s; }
    s.mise = +coup.split(":")[1]; s.miseur = 0; noter(s, `Tu mises ${s.mise}.`);
    const m = iaEnchere(s);
    if (m && m > s.mise) { s.mise = m; s.miseur = 1; noter(s, `L'adversaire surenchérit : ${m}.`); }
    else { noter(s, "L'adversaire passe : à toi de révéler."); reveler(s, 0); }
    return s;
  },
  resultat: s => s.points[0] >= 2 ? 1 : s.points[1] >= 2 ? 0 : Math.max(0, Math.min(1, 0.5 + 0.25 * (s.points[0] - s.points[1]) + 0.08 * (s.vraies[0] + +s.fausse[0] - s.vraies[1] - +s.fausse[1]))),
  aide(s) { if (s.phase === "poser") return peutPoser(s, 0, true) ? "fausse:2" : "vraies"; const sures = s.piles[0].findIndex(x => !x); const n = sures < 0 ? 3 : sures; return s.mise < n || !s.mise ? `miser:${s.mise + 1}` : "passer"; },
  vue(s) {
    const cs = s.fini ? [] : SKULL.coups(s);
    return { statut: s.fini ? s.journal[s.journal.length - 1] : s.phase === "poser" ? `Manche ${s.manche + 1}/${MAX} : pose 3 informations. La fausse piège l'adversaire… mais aussi toi si tu dois révéler ta pile.` : `Enchère actuelle : ${s.mise} (${s.miseur === 0 ? "toi" : "l'adversaire"}). Surenchéris ou passe.`,
      scores: [`${s.points[0]} point${s.points[0] > 1 ? "s" : ""}`, `${s.points[1]}`],
      rangees: [
        { titre: "Ta pile (du haut vers le bas)", cases: s.phase === "encherir" ? s.piles[0].map(x => ({ t: x ? "✔ vraie" : "✖ fausse", c: x ? "moi" : "lui" })) : [{ t: `${s.vraies[0]} vraies${s.fausse[0] ? " + 1 fausse" : ""} en main`, c: "moi" }] },
        { titre: "Pile adverse", cases: s.phase === "encherir" ? [{ t: "? ? ?", c: "lui" }] : [{ t: `${s.vraies[1]} vraies${s.fausse[1] ? " + 1 fausse" : ""}`, c: "lui" }] },
      ],
      boutons: cs.map(c => ({ t: c === "vraies" ? "Poser 3 vraies" : c.startsWith("fausse") ? `Fausse en position ${+c.split(":")[1] + 1}` : c === "passer" ? "Passer" : `Miser ${c.split(":")[1]}`, coup: c })) };
  },
};
