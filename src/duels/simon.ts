// Intrusion (Simon remixé) : le réseau adverse fait clignoter une séquence de nœuds (3 × 3) ; rejoue-la avant la fin
// du chrono. 5 pare-feu de longueur croissante ; une erreur ou un dépassement fait échouer le pare-feu en cours.
// La préparation donne des vies ; la défense adverse rallonge les séquences.
import { type DefDuel, type EtatBase, base, copie, bonus, entier, noter, finir, verifier } from "./moteur";

export const NOEUDS = ["Routeur", "Banque", "Réseau électrique", "Satellite", "Ministère", "Port", "Bourse", "Radar", "Câble"];
const ETAPES = 5;
interface S extends EtatBase { seq: number[]; saisie: number[]; phase: "montrer" | "saisir"; etape: number; reussis: number; vies: number; long0: number }
function nouvelleSequence(s: S) { s.seq = [...Array(s.long0 + s.etape).keys()].map(() => entier(s, 9)); s.saisie = []; s.phase = "montrer"; }
function suite(s: S, ok: boolean) {
  if (ok) { s.reussis++; noter(s, `Pare-feu ${s.etape + 1} franchi.`); }
  else { s.vies--; noter(s, `Pare-feu ${s.etape + 1} : alerte déclenchée${s.vies >= 0 ? `, ${Math.max(0, s.vies)} vie${s.vies > 1 ? "s" : ""} restante${s.vies > 1 ? "s" : ""}` : ""}.`); }
  s.etape++; s.tour++;
  if (s.etape >= ETAPES || s.vies < 0) finir(s, s.reussis >= ETAPES ? "Intrusion complète : le réseau adverse est à toi." : `Intrusion interrompue : ${s.reussis} pare-feu franchi${s.reussis > 1 ? "s" : ""} sur ${ETAPES}.`);
  else nouvelleSequence(s);
}
export const SIMON: DefDuel<S> = {
  id: "simon",
  creer(graine, avantage) {
    const s: S = { ...base(graine), seq: [], saisie: [], phase: "montrer", etape: 0, reussis: 0, vies: 0, long0: 3 };
    s.vies = Math.max(0, 1 + bonus(s, avantage, 1)); s.long0 = avantage < -0.5 ? 4 : 3;
    nouvelleSequence(s); noter(s, `Mémorise la séquence. Vies : ${s.vies}.`);
    return s;
  },
  coups: s => s.fini ? [] : s.phase === "montrer" ? ["vu"] : [...[...Array(9).keys()].map(i => `n:${i}`), "temps"],
  jouer(s0, coup) {
    verifier(SIMON, s0, coup); const s = copie(s0);
    if (coup === "vu") { s.phase = "saisir"; return s; }
    if (coup === "temps") { suite(s, false); return s; }
    const n = +coup.slice(2); s.saisie.push(n);
    if (s.seq[s.saisie.length - 1] !== n) suite(s, false);
    else if (s.saisie.length === s.seq.length) suite(s, true);
    return s;
  },
  resultat: s => s.reussis / ETAPES,
  aide: s => s.phase === "montrer" ? "vu" : `n:${s.seq[s.saisie.length]}`,
  vue(s) {
    return { statut: s.fini ? s.journal[s.journal.length - 1] : s.phase === "montrer" ? `Pare-feu ${s.etape + 1}/${ETAPES} : mémorise ${s.seq.length} nœuds…` : `Rejoue la séquence (${s.saisie.length}/${s.seq.length}).`,
      scores: [`${s.reussis} franchi${s.reussis > 1 ? "s" : ""}`, `${Math.max(0, s.vies)} vie${s.vies > 1 ? "s" : ""}`],
      grille: { cols: 3, c: "reseau", cases: NOEUDS.map((t, i) => ({ t, c: "noeud", coup: !s.fini && s.phase === "saisir" ? `n:${i}` : undefined })) },
      flash: !s.fini && s.phase === "montrer" ? { sequence: s.seq, ms: Math.max(380, 650 - 50 * s.etape) } : undefined,
      chrono: !s.fini && s.phase === "saisir" ? 4 + s.seq.length * 1.2 : undefined };
  },
};
