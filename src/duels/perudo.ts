// Bord du gouffre (Perudo remixé) : chaque camp lance ses dés en secret (forces, alliés, opinion). On enchérit sur le
// total : « au moins N dés montrent F » (tous dés confondus). On monte (plus de dés, ou même nombre et face plus haute)
// ou on crie au bluff : le perdant de la vérification recule (perd un dé). Une enchère de 8 ou plus démentie touche
// les deux camps : la crise dégénère. 3 manches, ou jusqu'à ce qu'un camp n'ait plus de dés.
import { type DefDuel, type EtatBase, base, copie, bonus, hasard, entier, distraction, noter, finir, verifier, part } from "./moteur";

interface S extends EtatBase { des: [number[], number[]]; nb: [number, number]; mise: [number, number] | null; miseur: number; manche: number; ouvre: number; avantage: number; revele: boolean }
const MAX = 3, FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
function lancer(s: S) { s.des = [[...Array(s.nb[0])].map(() => 1 + entier(s, 6)), [...Array(s.nb[1])].map(() => 1 + entier(s, 6))]; s.mise = null; s.revele = false; }
const plusHaute = (a: [number, number], b: [number, number] | null) => !b || a[0] > b[0] || a[0] === b[0] && a[1] > b[1];
function coupsMise(s: S): string[] {
  const out: string[] = [], total = s.nb[0] + s.nb[1];
  for (let n = 1; n <= total; n++) for (let f = 1; f <= 6; f++) if (plusHaute([n, f], s.mise) && (!s.mise || n <= s.mise[0] + 2)) out.push(`${n}:${f}`);
  return out;
}
function verifierMise(s: S, accusateur: number) {
  const [n, f] = s.mise!, reel = [...s.des[0], ...s.des[1]].filter(x => x === f).length, vraie = reel >= n, perdant = vraie ? accusateur : 1 - accusateur;
  s.revele = true;
  noter(s, `${accusateur === 0 ? "Tu cries" : "L'adversaire crie"} au bluff sur « ${n} × ${FACES[f]} » : il y en a ${reel}. ${perdant === 0 ? "Tu recules" : "L'adversaire recule"}.`);
  s.nb[perdant]--; if (n >= 8 && !vraie) { s.nb[1 - perdant] = Math.max(0, s.nb[1 - perdant] - 1); noter(s, "La surenchère a fait déraper la crise : les deux camps reculent."); }
  s.manche++; s.ouvre = perdant;
  if (!s.nb[0] || !s.nb[1]) finir(s, !s.nb[1] ? "L'adversaire n'a plus de cartes à jouer : il cède." : "Tu n'as plus de leviers : tu cèdes.");
  else if (s.manche >= MAX) finir(s, "Fin de la crise : on compte les leviers restants.");
}
// L'IA compare l'enchère à son espérance : ses dés + un sixième de ceux du joueur.
function iaRepond(s: S): string {
  const [n, f] = s.mise ?? [0, 1], attendu = (g: number) => s.des[1].filter(x => x === g).length + s.nb[0] / 6;
  if (s.mise && n > attendu(f) + 1 - distraction(s.avantage) * 0.8 + 0.4) return "bluff";
  const options = coupsMise(s).map(c => { const [m, g] = c.split(":").map(Number); return { c, v: attendu(g) - m + hasard(s) * 0.6 }; }).sort((a, b) => b.v - a.v);
  return options.length ? options[0].c : "bluff";
}
function tourIA(s: S) {
  const r = iaRepond(s);
  if (r === "bluff") { verifierMise(s, 1); if (!s.fini) { lancer(s); if (s.ouvre === 1) tourIA(s); } return; }
  const [n, f] = r.split(":").map(Number); s.mise = [n, f]; s.miseur = 1; noter(s, `L'adversaire annonce : au moins ${n} × ${FACES[f]}.`);
}
export const PERUDO: DefDuel<S> = {
  id: "perudo",
  creer(graine, avantage) {
    const s: S = { ...base(graine), des: [[], []], nb: [5, 5], mise: null, miseur: 0, manche: 0, ouvre: 0, avantage, revele: false };
    const n = bonus(s, Math.abs(avantage), 2); s.nb[avantage > 0 ? 0 : 1] += n;
    lancer(s); noter(s, n ? `Préparation : ${n} levier${n > 1 ? "s" : ""} de plus ${avantage > 0 ? "pour toi" : "pour l'adversaire"}.` : "Les deux camps cachent leurs cartes.");
    return s;
  },
  coups: s => s.fini ? [] : [...coupsMise(s), ...(s.mise ? ["bluff"] : [])],
  jouer(s0, coup) {
    verifier(PERUDO, s0, coup); const s = copie(s0); s.tour++;
    if (coup === "bluff") { verifierMise(s, 0); if (!s.fini) { lancer(s); if (s.ouvre === 1) tourIA(s); } return s; }
    const [n, f] = coup.split(":").map(Number); s.mise = [n, f]; s.miseur = 0; noter(s, `Tu annonces : au moins ${n} × ${FACES[f]}.`);
    tourIA(s);
    return s;
  },
  resultat: s => !s.nb[1] ? 1 : !s.nb[0] ? 0 : part(s.nb[0], s.nb[1]),
  aide(s) {
    const attendu = (g: number) => s.des[0].filter(x => x === g).length + s.nb[1] / 6;
    if (s.mise && s.mise[0] > attendu(s.mise[1]) + 0.8) return "bluff";
    return coupsMise(s).sort((a, b) => { const [m, g] = a.split(":").map(Number), [m2, g2] = b.split(":").map(Number); return (attendu(g2) - m2) - (attendu(g) - m); })[0] ?? "bluff";
  },
  vue(s) {
    const cs = s.fini ? [] : PERUDO.coups(s), mises = cs.filter(c => c !== "bluff");
    return { statut: s.fini ? s.journal[s.journal.length - 1] : `Manche ${s.manche + 1}/${MAX}. ${s.mise ? `Enchère : au moins ${s.mise[0]} × ${FACES[s.mise[1]]} sur ${s.nb[0] + s.nb[1]} dés.` : "Ouvre l'enchère."} Monte ou crie au bluff.`,
      scores: [`${s.nb[0]} leviers`, `${s.nb[1]}`],
      rangees: [{ titre: "Tes dés", cases: s.des[0].map(x => ({ t: FACES[x], c: "moi" })) }, { titre: "Dés adverses", cases: s.des[1].map(x => ({ t: s.revele ? FACES[x] : "?", c: "lui" })) }],
      grille: s.fini ? undefined : { cols: 6, cases: mises.slice(0, 18).map(c => { const [n, f] = c.split(":").map(Number); return { t: `${n} × ${FACES[f]}`, c: "carte", coup: c }; }) },
      boutons: cs.includes("bluff") ? [{ t: "Bluff ! (vérifier)", coup: "bluff" }] : [] };
  },
};
