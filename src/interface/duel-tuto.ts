// Tutoriels illustrés des mini-jeux (pilote 30/10 : « Soir d'élection ») : 3 vignettes avec un schéma chacune.
// Un jeu sans tutoriel garde l'écran d'ouverture texte.
import type { Duel } from "../moteur/plans";

export interface Vignette { titre: string; texte: string; schema: string }
const BLEU = "#2f6db5", ROUGE = "#c0392b";
// mini-plateau 6 × 5 : jetons donnés par [colonne, rangée depuis le bas, camp 0/1], options : ligne de victoire, flèche de chute, majorités
function urne(jetons: [number, number, 0 | 1][], o: { ligne?: [number, number, number, number]; chute?: number; majorites?: (0 | 1 | null)[] } = {}): string {
  const x = (c: number) => 22 + c * 28, y = (l: number) => 136 - l * 28;
  let s = `<svg viewBox="0 0 196 180" class="tuto-svg" aria-hidden="true"><rect x="6" y="10" width="184" height="144" rx="14" fill="#1f3f8f"/>`;
  for (let c = 0; c < 6; c++) for (let l = 0; l < 5; l++) s += `<circle cx="${x(c)}" cy="${y(l)}" r="10.5" fill="#0d1838"/>`;
  for (const [c, l, j] of jetons) s += `<circle cx="${x(c)}" cy="${y(l)}" r="10.5" fill="${j ? ROUGE : BLEU}" stroke="#fff" stroke-width="1.5"/><text x="${x(c)}" y="${y(l) + 4}" font-size="11" text-anchor="middle" fill="#fff">★</text>`;
  if (o.ligne) { const [c1, l1, c2, l2] = o.ligne; s += `<line x1="${x(c1)}" y1="${y(l1)}" x2="${x(c2)}" y2="${y(l2)}" stroke="#ffd166" stroke-width="5" stroke-linecap="round" opacity=".9"/>`; }
  if (o.chute !== undefined) { const c = o.chute; s += `<path d="M${x(c)} -2 L${x(c)} 90" stroke="#ffd166" stroke-width="3" stroke-dasharray="5 4"/><path d="M${x(c) - 7} 84 L${x(c)} 96 L${x(c) + 7} 84" fill="none" stroke="#ffd166" stroke-width="3" stroke-linecap="round"/>`; }
  if (o.majorites) o.majorites.forEach((m, c) => { s += `<rect x="${x(c) - 11}" y="160" width="22" height="12" rx="4" fill="${m === null ? "#c9c2b5" : m ? ROUGE : BLEU}"/>`; });
  return s + `</svg>`;
}
export const TUTOS: Partial<Record<Duel["type"], Vignette[]>> = {
  puissance4: [
    { titre: "Ton but", texte: "Aligne 4 de tes jetons bleus : en ligne, en colonne ou en diagonale. Le scrutin bascule aussitôt pour toi.",
      schema: urne([[0, 0, 1], [1, 0, 0], [2, 1, 0], [3, 2, 0], [4, 3, 0], [2, 0, 1], [3, 0, 1], [3, 1, 1], [4, 0, 1], [4, 1, 0], [4, 2, 1]], { ligne: [1, 0, 4, 3] }) },
    { titre: "À ton tour", texte: "Clique une colonne (un électorat) : ton jeton tombe tout en bas. L'adversaire répond aussitôt avec un jeton rouge.",
      schema: urne([[1, 0, 0], [2, 0, 1], [2, 1, 0]], { chute: 3 }) },
    { titre: "Comment gagner", texte: "Personne n'aligne 4 ? Après 9 jetons chacun, chaque électorat va au camp qui y a le plus de jetons. Bloque l'adversaire dès qu'il en aligne 3.",
      schema: urne([[0, 0, 0], [0, 1, 0], [1, 0, 1], [1, 1, 1], [2, 0, 0], [3, 0, 1], [3, 1, 0], [3, 2, 0], [4, 0, 1], [5, 0, 0], [5, 1, 1]], { majorites: [0, 1, 0, 0, 1, null] }) },
  ],
};
export const tutoHtml = (l: Vignette[]) => `<div class="tuto">${l.map((v, i) => `<section class="tuto-v"><span class="tuto-n">${i + 1}</span>${v.schema}<h4>${v.titre}</h4><p>${v.texte}</p></section>`).join("")}</div>`;
