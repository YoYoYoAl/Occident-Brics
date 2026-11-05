// Frappe éclair (Street Fighter remixé) : combat au tour simultané. Chaque tour, les deux camps choisissent en secret
// une manœuvre parmi 5 ; chacune en bat deux et perd contre deux. Gagner un échange inflige 2 dégâts ; gagner deux
// échanges de suite avec deux manœuvres différentes déclenche un combo (+1). 6 secondes pour choisir.
// 8 échanges ou un K.-O. ; les barres de vie sont le territoire et le moral.
import { type DefDuel, type EtatBase, base, copie, bonus, hasard, entier, distraction, noter, finir, verifier, part } from "./moteur";

export const MANOEUVRES = ["Frappe aérienne", "Blindés", "Défense antiaérienne", "Cyberattaque", "Ravitaillement"];
const ICONES = ["✈", "🛡", "🎯", "💻", "📦"], VIE = 10, MAX = 8;
// i bat j si (j − i) mod 5 vaut 1 ou 3 (règle « pierre-feuille-ciseaux » à 5 coups)
export const bat = (i: number, j: number) => [1, 3].includes((j - i + 5) % 5);
interface S extends EtatBase { vie: [number, number]; historique: number[]; serie: [number, number, number, number]; avantage: number } // serie : [gains de suite J, dernière manœuvre gagnante J, idem IA]
const BATTUS = (i: number) => [0, 1, 2, 3, 4].filter(j => bat(i, j)).map(j => MANOEUVRES[j]).join(" et ");
// L'IA lit les habitudes : elle contre la manœuvre que le joueur choisit le plus souvent (avec du hasard).
function iaChoix(s: S): number {
  if (s.historique.length < 2 || hasard(s) < distraction(s.avantage) + 0.15) return entier(s, 5);
  const f = [0, 0, 0, 0, 0]; s.historique.slice(-4).forEach((m, k) => { f[m] += 1 + k * 0.3; });
  const probable = f.indexOf(Math.max(...f)), contres = [0, 1, 2, 3, 4].filter(i => bat(i, probable));
  return contres[entier(s, contres.length)];
}
export const STREETFIGHTER: DefDuel<S> = {
  id: "streetfighter",
  creer(graine, avantage) {
    const s: S = { ...base(graine), vie: [VIE, VIE], historique: [], serie: [0, -1, 0, -1], avantage };
    const n = bonus(s, Math.abs(avantage), 3); s.vie[avantage > 0 ? 1 : 0] -= n;
    noter(s, n ? `Préparation : ${avantage > 0 ? "l'adversaire" : "ton camp"} commence avec ${n} point${n > 1 ? "s" : ""} de moral en moins.` : "Les deux camps se jaugent.");
    return s;
  },
  coups: s => s.fini ? [] : [...MANOEUVRES.keys()].map(String).concat("temps"),
  jouer(s0, coup) {
    verifier(STREETFIGHTER, s0, coup); const s = copie(s0); s.tour++;
    const moi = coup === "temps" ? entier(s, 5) : +coup, lui = iaChoix(s);
    s.historique.push(moi);
    if (coup === "temps") noter(s, "Trop tard : ton état-major improvise.");
    const frappe = (j: number, m: number) => { const k = j * 2, combo = s.serie[k] >= 1 && s.serie[k + 1] !== m; s.serie[k]++; s.serie[k + 1] = m; s.serie[(1 - j) * 2] = 0; const d = 2 + (combo ? 1 : 0); s.vie[1 - j] -= d; return combo; };
    if (bat(moi, lui)) { const combo = frappe(0, moi); noter(s, `${ICONES[moi]} ${MANOEUVRES[moi]} bat ${MANOEUVRES[lui]} : −${combo ? 3 : 2} à l'adversaire${combo ? " (combo !)" : ""}.`); }
    else if (bat(lui, moi)) { const combo = frappe(1, lui); noter(s, `${MANOEUVRES[lui]} adverse bat ${MANOEUVRES[moi]} : −${combo ? 3 : 2} pour toi${combo ? " (combo)" : ""}.`); }
    else { s.serie[0] = s.serie[2] = 0; noter(s, `Même manœuvre (${MANOEUVRES[moi]}) : échange nul.`); }
    if (s.vie[0] <= 0 || s.vie[1] <= 0) finir(s, s.vie[1] <= 0 ? "K.-O. : l'adversaire plie !" : "K.-O. : ton camp plie.");
    else if (s.tour >= MAX) finir(s, "Fin des combats : on compare le moral.");
    return s;
  },
  resultat: s => s.vie[1] <= 0 ? 1 : s.vie[0] <= 0 ? 0 : part(Math.max(0, s.vie[0]), Math.max(0, s.vie[1])),
  vue(s) {
    return { statut: s.fini ? s.journal[s.journal.length - 1] : `Échange ${s.tour + 1}/${MAX} : choisis ta manœuvre. L'adversaire lit tes habitudes.`,
      scores: [`moral ${Math.max(0, s.vie[0])}`, `${Math.max(0, s.vie[1])}`],
      rangees: [{ titre: "Barres de moral", cases: [{ t: "█".repeat(Math.max(0, s.vie[0])) || "—", c: "moi" }, { t: "█".repeat(Math.max(0, s.vie[1])) || "—", c: "lui" }] }],
      boutons: s.fini ? [] : MANOEUVRES.map((t, i) => ({ t: `${ICONES[i]} ${t}`, coup: String(i), titre: `Bat : ${BATTUS(i)}` })),
      chrono: s.fini ? undefined : 6 };
  },
};
