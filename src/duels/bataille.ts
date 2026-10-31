// Chasse sous-marine (Bataille navale remixée) : chaque camp cache 3 sous-marins sur une grille 6 × 6.
// Chaque tir rapporte « touché » ou la distance (en cases) du sous-marin le plus proche. Couler les 3 gagne ;
// sinon, après 12 tirs chacun, on compare les sous-marins coulés.
import { type DefDuel, type EtatBase, base, copie, bonus, hasard, choisir, distraction, noter, finir, verifier, melange } from "./moteur";

const N = 6, NB = 3, MAX = 12;
interface S extends EtatBase { subs: [number[], number[]]; tirs: [Record<number, number>, Record<number, number>]; coules: [number, number]; nbTirs: [number, number]; avantage: number; bonusTirs: number }
const d = (a: number, b: number) => Math.max(Math.abs(a % N - b % N), Math.abs(Math.floor(a / N) - Math.floor(b / N))); // distance « sonar » : cases en diagonale comprises
// j tire sur la flotte de 1 − j : −1 = touché, sinon distance au sous-marin restant le plus proche
function tirer(s: S, j: number, i: number) {
  const cible = s.subs[1 - j], k = cible.indexOf(i);
  s.nbTirs[j]++;
  if (k >= 0) { cible.splice(k, 1); s.tirs[j][i] = -1; s.coules[j]++; noter(s, j === 0 ? "Touché ! Un sous-marin adverse coule." : "Un de tes sous-marins est coulé."); }
  else { const dist = Math.min(...cible.map(x => d(x, i))); s.tirs[j][i] = dist; noter(s, j === 0 ? `Sonar : sous-marin le plus proche à ${dist} case${dist > 1 ? "s" : ""}.` : `Tir adverse dans l'eau (sonar ${dist}).`); }
  if (s.coules[j] >= NB) finir(s, j === 0 ? "Escadre adverse coulée : la mer est à toi." : "Ta flottille est anéantie.");
  else if (s.nbTirs[0] >= MAX + s.bonusTirs && s.nbTirs[1] >= MAX) finir(s, "Fin de la patrouille : on compte les sous-marins coulés.");
}
// L'IA garde les cases compatibles avec tous les échos sonar reçus (raisonnement par élimination).
function iaCible(s: S): number {
  const libres = [...Array(N * N).keys()].filter(i => s.tirs[1][i] === undefined);
  if (hasard(s) < distraction(s.avantage) * 0.6) return choisir(s, libres);
  const echos = Object.entries(s.tirs[1]).filter(([, v]) => v > 0).map(([i, v]) => [+i, v]);
  const derniers = echos.slice(-3);
  const compat = libres.filter(c => derniers.every(([i, v]) => d(c, i) >= v) && derniers.some(([i, v]) => d(c, i) === v));
  return choisir(s, compat.length ? compat : libres);
}
export const BATAILLE: DefDuel<S> = {
  id: "bataille",
  creer(graine, avantage) {
    const s: S = { ...base(graine), subs: [[], []], tirs: [{}, {}], coules: [0, 0], nbTirs: [0, 0], avantage, bonusTirs: 0 };
    s.subs = [melange(s, [...Array(N * N).keys()]).slice(0, NB), melange(s, [...Array(N * N).keys()]).slice(0, NB)];
    s.bonusTirs = Math.max(-3, bonus(s, avantage, 3));
    noter(s, s.bonusTirs > 0 ? `Préparation : ${s.bonusTirs} tir${s.bonusTirs > 1 ? "s" : ""} de plus que l'adversaire.` : s.bonusTirs < 0 ? `L'adversaire est mieux préparé : ${-s.bonusTirs} tir${s.bonusTirs < -1 ? "s" : ""} de moins pour toi.` : "Tes 3 sous-marins plongent ; ceux de l'adversaire aussi.");
    return s;
  },
  coups: s => s.fini ? [] : [...Array(N * N).keys()].filter(i => s.tirs[0][i] === undefined).map(String),
  jouer(s0, coup) {
    verifier(BATAILLE, s0, coup); const s = copie(s0); s.tour++;
    tirer(s, 0, +coup);
    if (!s.fini && s.nbTirs[1] < MAX) tirer(s, 1, iaCible(s));
    while (!s.fini && s.nbTirs[0] >= MAX + s.bonusTirs) tirer(s, 1, iaCible(s));
    return s;
  },
  // Conseil honnête : seulement les échos sonar reçus (jamais la position réelle des sous-marins).
  aide(s) {
    const libres = [...Array(N * N).keys()].filter(i => s.tirs[0][i] === undefined), echos = Object.entries(s.tirs[0]).filter(([, v]) => v > 0).map(([i, v]) => [+i, v]);
    const note = (c: number) => echos.every(([i, v]) => d(c, i) >= v) ? 1 + echos.filter(([i, v]) => d(c, i) === v).length : 0;
    return String(libres.reduce((a, b) => note(b) > note(a) ? b : a, libres[0]));
  },
  resultat(s) { if (s.coules[0] >= NB) return 1; if (s.coules[1] >= NB) return 0; return Math.max(0, Math.min(1, 0.5 + (s.coules[0] - s.coules[1]) / (2 * NB))); },
  vue(s) {
    const cases = [...Array(N * N).keys()].map(i => { const v = s.tirs[0][i]; return { t: v === undefined ? "" : v === -1 ? "💥" : String(v), c: v === undefined ? "eau" : v === -1 ? "touche" : "sonar", coup: !s.fini && v === undefined ? String(i) : undefined }; });
    const mesSubs = s.subs[0].length;
    return { statut: s.fini ? s.journal[s.journal.length - 1] : `Tire dans la mer adverse (${MAX + s.bonusTirs - s.nbTirs[0]} tirs). Le chiffre donne la distance du sous-marin le plus proche, diagonales comprises.`,
      scores: [`${s.coules[0]}/${NB} coulés`, `${s.coules[1]}/${NB}`], grille: { cols: N, c: "sonar", cases },
      rangees: [{ titre: "Ta flottille", cases: [...Array(NB).keys()].map(k => ({ t: k < mesSubs ? "🔱 en plongée" : "✖ coulé", c: k < mesSubs ? "moi" : "vide" })) }] };
  },
};
