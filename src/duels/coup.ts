// Intrigue de palais (Coup remixé) : chaque camp tient 2 rôles cachés parmi banquier, chef des services, assassin et
// garde. Actions : revenu (+1), impôt (+3, banquier), extorsion (prend 2, chef des services), assassinat (paie 3,
// assassin : élimine une carte ; la garde le bloque), coup de force (paie 7 : élimine une carte). On peut annoncer un
// rôle qu'on n'a pas ; l'autre peut contester : le menteur perd une carte, sinon c'est le contestataire. 10 tours.
import { type DefDuel, type EtatBase, base, copie, hasard, choisir, distraction, noter, finir, verifier, melange } from "./moteur";

export const ROLES = ["banquier", "chef des services", "assassin", "garde"];
type Action = "revenu" | "impot" | "extorsion" | "assassinat" | "force";
const ROLE_ACTION: Partial<Record<Action, number>> = { impot: 0, extorsion: 1, assassinat: 2 };
const NOMS_A: Record<Action, string> = { revenu: "Revenu (+1)", impot: "Impôt (+3, banquier)", extorsion: "Extorsion (prend 2, chef des services)", assassinat: "Assassinat (3 pièces, assassin)", force: "Coup de force (7 pièces)" };
const MAX = 10;
interface S extends EtatBase {
  mains: [number[], number[]]; morts: [number[], number[]]; pieces: [number, number]; pioche: number[]; tours: number; avantage: number;
  attente: null | { type: "contester" | "bloquer" | "contesterBlocage"; action: Action; acteur: number }; // décision demandée au joueur
}
const vivant = (s: S, j: number) => s.mains[j].length > 0;
function perdreCarte(s: S, j: number, pref?: number) {
  if (!s.mains[j].length) return;
  const k = pref !== undefined && s.mains[j].includes(pref) ? s.mains[j].indexOf(pref) : j === 1 ? 0 : s.mains[j].length - 1;
  const r = s.mains[j].splice(k, 1)[0]; s.morts[j].push(r);
  noter(s, `${j === 0 ? "Tu perds" : "L'adversaire perd"} son ${ROLES[r]}.`);
  if (!vivant(s, j)) finir(s, j === 0 ? "Plus aucun allié au palais : l'intrigue est perdue." : "L'adversaire n'a plus d'alliés au palais : tu l'emportes.");
}
// Contestation : si l'annonceur a bien le rôle, il le remet dans la pioche et en tire un autre ; le contestataire perd une carte.
function contester(s: S, annonceur: number, role: number): boolean {
  const vrai = s.mains[annonceur].includes(role);
  noter(s, `${annonceur === 0 ? "L'adversaire conteste" : "Tu contestes"} : ${vrai ? "c'était vrai" : "c'était du bluff"} !`);
  if (vrai) { const i = s.mains[annonceur].indexOf(role); s.pioche.push(role); s.mains[annonceur][i] = s.pioche.shift()!; perdreCarte(s, 1 - annonceur); }
  else perdreCarte(s, annonceur);
  return vrai;
}
function effet(s: S, j: number, a: Action) {
  const o = 1 - j;
  if (a === "revenu") s.pieces[j] += 1;
  if (a === "impot") s.pieces[j] += 3;
  if (a === "extorsion") { const k = Math.min(2, s.pieces[o]); s.pieces[o] -= k; s.pieces[j] += k; }
  if (a === "assassinat" || a === "force") perdreCarte(s, o);
}
const actionsDe = (s: S, j: number): Action[] => s.pieces[j] >= 10 ? ["force"] : (["revenu", "impot", "extorsion", "assassinat", "force"] as Action[]).filter(a => a === "assassinat" ? s.pieces[j] >= 3 : a === "force" ? s.pieces[j] >= 7 : true);
// L'IA conteste quand l'annonce est peu probable vue sa propre main (ou au hasard).
function iaConteste(s: S, role: number): boolean { const tient = s.mains[1].filter(r => r === role).length + s.morts[0].concat(s.morts[1]).filter(r => r === role).length; return hasard(s) < (tient >= 2 ? 0.85 : tient === 1 ? 0.35 : 0.12) + distraction(s.avantage) * 0.1; }
function iaAction(s: S): Action {
  const l = actionsDe(s, 1); if (l.includes("force") && s.pieces[1] >= 7) return "force";
  const bluff = hasard(s) < 0.3 + distraction(s.avantage) * 0.3;
  if (l.includes("assassinat") && (s.mains[1].includes(2) || bluff)) return "assassinat";
  if (s.mains[1].includes(0) || bluff && hasard(s) < 0.5) return "impot";
  if (s.mains[1].includes(1) && s.pieces[0] >= 2) return "extorsion";
  return choisir(s, l.filter(a => a !== "assassinat" && a !== "force"));
}
// Tour de l'IA : peut demander une décision au joueur (contester, bloquer).
function tourIA(s: S) {
  if (s.fini) return;
  const a = iaAction(s); noter(s, `L'adversaire annonce : ${NOMS_A[a]}.`); if (a === "assassinat" || a === "force") s.pieces[1] -= a === "force" ? 7 : 3;
  if (ROLE_ACTION[a] !== undefined || a === "assassinat") { s.attente = { type: a === "assassinat" ? "bloquer" : "contester", action: a, acteur: 1 }; return; }
  effet(s, 1, a); finTour(s);
}
function finTour(s: S) { s.tours++; if (!s.fini && s.tours >= MAX) finir(s, "Le conseil se réunit : on compte les alliés restants et les pièces."); }
export const COUP: DefDuel<S> = {
  id: "coup",
  creer(graine, avantage) {
    const s: S = { ...base(graine), mains: [[], []], morts: [[], []], pieces: [2, 2], pioche: [], tours: 0, avantage, attente: null };
    s.pioche = melange(s, [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3]); s.mains = [s.pioche.splice(0, 2), s.pioche.splice(0, 2)];
    const n = Math.round(avantage * 2); s.pieces[n > 0 ? 0 : 1] += Math.abs(n);
    noter(s, `Tes rôles : ${s.mains[0].map(r => ROLES[r]).join(" et ")}. ${n ? `Préparation : ${Math.abs(n)} pièce${Math.abs(n) > 1 ? "s" : ""} d'avance ${n > 0 ? "pour toi" : "pour l'adversaire"}.` : ""}`);
    return s;
  },
  coups(s) {
    if (s.fini) return [];
    if (s.attente?.type === "contester" || s.attente?.type === "contesterBlocage") return ["contester", "accepter"];
    if (s.attente?.type === "bloquer") return ["bloquer", "contester", "accepter"];
    return actionsDe(s, 0);
  },
  jouer(s0, coup) {
    verifier(COUP, s0, coup); const s = copie(s0);
    if (s.attente) { // réponse du joueur à une annonce adverse, ou au blocage de son assassinat
      const { action, type } = s.attente; s.attente = null;
      if (type === "contesterBlocage") {
        if (coup === "contester") { const vrai = contester(s, 1, 3); if (!vrai && !s.fini) effet(s, 0, action); } else noter(s, "Ton assassinat est bloqué.");
        finTour(s); if (!s.fini) tourIA(s); return s;
      }
      if (coup === "accepter") effet(s, 1, action);
      else if (coup === "contester") { const vrai = contester(s, 1, ROLE_ACTION[action]!); if (vrai && !s.fini) effet(s, 1, action); }
      else if (coup === "bloquer") { noter(s, "Tu annonces ta garde pour bloquer."); if (iaConteste(s, 3)) { const vrai = contester(s, 0, 3); if (!vrai && !s.fini) effet(s, 1, action); } else noter(s, "L'assassinat est bloqué."); }
      finTour(s); s.tour++;
      return s;
    }
    const a = coup as Action; s.tour++;
    noter(s, `Tu annonces : ${NOMS_A[a]}.`);
    if (a === "assassinat") s.pieces[0] -= 3; if (a === "force") s.pieces[0] -= 7;
    let ok = true;
    if (ROLE_ACTION[a] !== undefined && iaConteste(s, ROLE_ACTION[a]!)) ok = contester(s, 0, ROLE_ACTION[a]!);
    if (ok && !s.fini && a === "assassinat" && (s.mains[1].includes(3) || hasard(s) < 0.2)) {
      noter(s, "L'adversaire annonce sa garde pour bloquer l'assassinat."); s.attente = { type: "contesterBlocage", action: a, acteur: 0 }; return s;
    }
    if (ok && !s.fini) effet(s, 0, a);
    finTour(s);
    if (!s.fini) tourIA(s);
    return s;
  },
  resultat(s) { const a = s.mains[0].length, b = s.mains[1].length; if (!b) return 1; if (!a) return 0; return Math.max(0, Math.min(1, 0.5 + 0.25 * (a - b) + 0.02 * (s.pieces[0] - s.pieces[1]))); },
  vue(s) {
    const cs = s.fini ? [] : COUP.coups(s);
    return { statut: s.fini ? s.journal[s.journal.length - 1] : s.attente ? (s.attente.type === "bloquer" ? "L'adversaire veut assassiner un de tes alliés : bloquer avec ta garde, contester son assassin, ou accepter ?" : s.attente.type === "contesterBlocage" ? "L'adversaire dit avoir une garde : le contester ?" : "L'adversaire annonce un rôle : le contester ?") : `Ton tour (${s.tours + 1}/${MAX}) : choisis une action. Tu peux bluffer.`,
      scores: [`${s.mains[0].length} allié${s.mains[0].length > 1 ? "s" : ""} · ${s.pieces[0]} pièces`, `${s.mains[1].length} · ${s.pieces[1]} pièces`],
      rangees: [
        { titre: "Tes rôles", cases: s.mains[0].map(r => ({ t: ROLES[r], c: "moi" })).concat(s.morts[0].map(r => ({ t: `✖ ${ROLES[r]}`, c: "vide" }))) },
        { titre: "Rôles adverses", cases: s.mains[1].map(() => ({ t: "?", c: "lui" })).concat(s.morts[1].map(r => ({ t: `✖ ${ROLES[r]}`, c: "vide" }))) },
      ],
      boutons: cs.map(c => ({ t: c === "contester" ? "Contester" : c === "accepter" ? "Laisser faire" : c === "bloquer" ? "Bloquer (garde)" : NOMS_A[c as Action], coup: c })) };
  },
};
