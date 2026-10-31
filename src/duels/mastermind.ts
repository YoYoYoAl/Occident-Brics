// La taupe (Mastermind remixé) : le contre-espionnage adverse protège une combinaison de 4 éléments parmi 6 indices
// (lieu, contact, heure, moyen). 6 essais : chaque essai dit combien d'éléments sont bien placés et combien sont bons
// mais mal placés. Trouver vite rapporte plus ; sinon, le meilleur essai donne un résultat partiel.
import { type DefDuel, type EtatBase, base, copie, bonus, entier, noter, finir, verifier } from "./moteur";

export const INDICES = ["Port", "Ambassade", "Café", "Minuit", "Valise", "Chiffre"];
const L = 4, ESSAIS = 6;
interface S extends EtatBase { code: number[]; essais: { c: number[]; bien: number; mal: number }[]; saisie: number[]; max: number }
function noterEssai(code: number[], c: number[]) {
  const bien = c.filter((x, i) => x === code[i]).length;
  let commun = 0; for (let v = 0; v < INDICES.length; v++) commun += Math.min(code.filter(x => x === v).length, c.filter(x => x === v).length);
  return { bien, mal: commun - bien };
}
export const MASTERMIND: DefDuel<S> = {
  id: "mastermind",
  creer(graine, avantage) {
    const s: S = { ...base(graine), code: [], essais: [], saisie: [], max: ESSAIS };
    for (let i = 0; i < L; i++) s.code.push(entier(s, INDICES.length));
    s.max = Math.max(4, ESSAIS + bonus(s, avantage, 2));
    noter(s, `Le contre-espionnage adverse protège sa source. Tu as ${s.max} essais.`);
    return s;
  },
  coups: s => s.fini ? [] : s.saisie.length < L ? [...INDICES.keys()].map(i => `i:${i}`).concat(s.saisie.length ? ["effacer"] : []) : ["valider", "effacer"],
  jouer(s0, coup) {
    verifier(MASTERMIND, s0, coup); const s = copie(s0);
    if (coup === "effacer") { s.saisie.pop(); return s; }
    if (coup.startsWith("i:")) { s.saisie.push(+coup.slice(2)); return s; }
    {
      s.tour++; const r = noterEssai(s.code, s.saisie); s.essais.push({ c: s.saisie, ...r }); s.saisie = [];
      noter(s, `Essai ${s.essais.length} : ${r.bien} bien placé${r.bien > 1 ? "s" : ""}, ${r.mal} bon${r.mal > 1 ? "s" : ""} mais mal placé${r.mal > 1 ? "s" : ""}.`);
      if (r.bien === L) finir(s, `Taupe démasquée en ${s.essais.length} essai${s.essais.length > 1 ? "s" : ""} !`);
      else if (s.essais.length >= s.max) finir(s, `La source reste protégée. Combinaison : ${s.code.map(i => INDICES[i]).join(", ")}.`);
    }
    return s;
  },
  aide(s) {
    if (s.saisie.length === L) return "valider";
    // combinaison compatible avec tous les essais déjà notés (stratégie classique)
    for (let n = 0; n < 6 ** L; n++) {
      const c = [...Array(L).keys()].map(i => Math.floor(n / 6 ** i) % 6);
      if (s.saisie.some((x, i) => c[i] !== x)) continue;
      if (s.essais.every(e => { const r = noterEssai(c, e.c); return r.bien === e.bien && r.mal === e.mal; })) return `i:${c[s.saisie.length]}`;
    }
    return s.saisie.length ? "effacer" : "i:0";
  },
  resultat(s) {
    const k = s.essais.findIndex(e => e.bien === L);
    if (k >= 0) return Math.min(1, 1 - 0.08 * Math.max(0, k - 2));
    const best = Math.max(0, ...s.essais.map(e => e.bien + 0.5 * e.mal));
    return 0.4 * best / L;
  },
  vue(s) {
    return { statut: s.fini ? s.journal[s.journal.length - 1] : `Compose 4 indices (${s.saisie.length}/${L}), puis valide. Essai ${s.essais.length + 1}/${s.max}.`,
      scores: [`${s.essais.length}/${s.max} essais`, ""],
      rangees: [
        ...s.essais.map((e, k) => ({ titre: `Essai ${k + 1} : ${"●".repeat(e.bien)}${"○".repeat(e.mal)}`, cases: e.c.map(i => ({ t: INDICES[i], c: "vide" })) })),
        { titre: "Ta combinaison", cases: [...Array(L).keys()].map(k => ({ t: s.saisie[k] !== undefined ? INDICES[s.saisie[k]] : "?", c: "moi" })) },
      ],
      boutons: s.fini ? [] : [...(s.saisie.length < L ? INDICES.map((t, i) => ({ t, coup: `i:${i}` })) : [{ t: "Valider l'essai", coup: "valider" }]), ...(s.saisie.length ? [{ t: "Effacer", coup: "effacer" }] : [])] };
  },
};
