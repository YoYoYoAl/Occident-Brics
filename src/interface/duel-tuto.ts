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

// ---------- Schémas génériques : plateau quadrillé, rangée de cartes, schéma « A bat B » ----------
type Piece = [number, number, 0 | 1 | 2, string?]; // colonne, rangée (0 = haut), camp (2 = neutre), symbole
interface OptPlateau { fond?: string; case?: string; damier?: string; fleches?: [number, number, number, number][]; zones?: [number, number, string][]; rond?: boolean }
function plateau(cols: number, rows: number, pieces: Piece[], o: OptPlateau = {}): string {
  const t = Math.min(30, Math.floor(176 / Math.max(cols, rows))), w = cols * t, h = rows * t, ox = (196 - w) / 2, oy = (170 - h) / 2;
  const X = (c: number) => ox + c * t + t / 2, Y = (r: number) => oy + r * t + t / 2;
  let s = `<svg viewBox="0 0 196 170" class="tuto-svg" aria-hidden="true"><rect x="${ox - 6}" y="${oy - 6}" width="${w + 12}" height="${h + 12}" rx="10" fill="${o.fond ?? "#25324a"}"/>`;
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) s += `<rect x="${ox + c * t + 1.5}" y="${oy + r * t + 1.5}" width="${t - 3}" height="${t - 3}" rx="${o.rond ? t / 2 : 4}" fill="${o.damier && (c + r) % 2 ? o.damier : o.case ?? "rgba(255,255,255,.10)"}"/>`;
  for (const [c, r, col] of o.zones ?? []) s += `<rect x="${ox + c * t + 1.5}" y="${oy + r * t + 1.5}" width="${t - 3}" height="${t - 3}" rx="4" fill="none" stroke="${col}" stroke-width="2.5"/>`;
  for (const [c, r, j, sym] of pieces) s += `<circle cx="${X(c)}" cy="${Y(r)}" r="${t * 0.4}" fill="${j === 0 ? BLEU : j === 1 ? ROUGE : "#e9e2d2"}" stroke="#fff" stroke-width="1.3"/>${sym ? `<text x="${X(c)}" y="${Y(r) + t * 0.15}" font-size="${t * 0.42}" text-anchor="middle" fill="${j === 2 ? "#1e2a36" : "#fff"}">${sym}</text>` : ""}`;
  for (const [c1, r1, c2, r2] of o.fleches ?? []) { const x2 = X(c2), y2 = Y(r2), a = Math.atan2(y2 - Y(r1), x2 - X(c1)), k = 7;
    s += `<line x1="${X(c1)}" y1="${Y(r1)}" x2="${x2 - Math.cos(a) * 6}" y2="${y2 - Math.sin(a) * 6}" stroke="#ffd166" stroke-width="3.5" stroke-linecap="round"/><path d="M${x2} ${y2} L${x2 - k * Math.cos(a - .5)} ${y2 - k * Math.sin(a - .5)} L${x2 - k * Math.cos(a + .5)} ${y2 - k * Math.sin(a + .5)} Z" fill="#ffd166"/>`; }
  return s + `</svg>`;
}
type Carte = [string, string?, string?]; // texte, couleur du liseré, note dessous
function cartes(l: Carte[], titre = ""): string {
  const n = l.length, w = Math.min(40, 180 / n - 4), ox = (196 - n * (w + 4)) / 2;
  let s = `<svg viewBox="0 0 196 170" class="tuto-svg" aria-hidden="true">${titre ? `<text x="98" y="30" font-size="12" font-weight="700" text-anchor="middle" fill="#5b6875">${titre}</text>` : ""}`;
  l.forEach(([t, c, note], i) => { const x = ox + i * (w + 4);
    s += `<rect x="${x}" y="48" width="${w}" height="62" rx="7" fill="#fff" stroke="#d9cfbe"/><rect x="${x}" y="48" width="${w}" height="8" rx="3" fill="${c ?? "#b5841f"}"/><text x="${x + w / 2}" y="${86}" font-size="${t.length > 3 ? 9 : 15}" font-weight="700" text-anchor="middle" fill="#1e2a36">${t}</text>${note ? `<text x="${x + w / 2}" y="128" font-size="9" text-anchor="middle" fill="#5b6875">${note}</text>` : ""}`; });
  return s + `</svg>`;
}
function cycle(noms: string[]): string { // chaque élément bat le suivant (et celui d'après)
  const n = noms.length, P = noms.map((_, i) => [98 + 62 * Math.sin(2 * Math.PI * i / n), 88 - 62 * Math.cos(2 * Math.PI * i / n)]);
  let s = `<svg viewBox="0 0 196 170" class="tuto-svg" aria-hidden="true">`;
  P.forEach(([x, y], i) => { const [x2, y2] = P[(i + 1) % n]; s += `<line x1="${x}" y1="${y}" x2="${(x + x2 * 2) / 3}" y2="${(y + y2 * 2) / 3}" stroke="#ffd166" stroke-width="3"/>`; });
  P.forEach(([x, y], i) => { s += `<circle cx="${x}" cy="${y}" r="18" fill="#25324a"/><text x="${x}" y="${y + 6}" font-size="16" text-anchor="middle">${noms[i]}</text>`; });
  return s + `</svg>`;
}
const MER = { fond: "#123a5a", case: "rgba(140,200,255,.14)" }, NUIT = { fond: "#2a2716", case: "rgba(224,178,92,.12)" };
export const TUTOS: Partial<Record<Duel["type"], Vignette[]>> = {
  echecs: [
    { titre: "Ton but", texte: "Fais entrer une de tes pièces dans le palais ⌂ (en haut au centre) en 8 coups au plus.", schema: plateau(5, 5, [[2, 0, 2, "⌂"], [1, 1, 1, "♙"], [3, 1, 1, "♙"], [2, 1, 1, "♖"], [2, 4, 0, "♚"], [1, 4, 0, "♜"], [0, 4, 0, "♞"]], { ...NUIT, damier: "rgba(224,178,92,.22)", zones: [[2, 0, "#ffd166"]] }) },
    { titre: "À ton tour", texte: "Clique une de tes pièces, puis sa destination. Chacune bouge à sa façon : le commando ♞ saute en L, le blindé ♜ fonce de 2 cases.", schema: plateau(5, 5, [[1, 4, 0, "♞"], [3, 4, 0, "♜"]], { ...NUIT, damier: "rgba(224,178,92,.22)", fleches: [[1, 4, 2, 2], [3, 4, 3, 2]] }) },
    { titre: "Comment gagner", texte: "Aller sur une pièce adverse la neutralise. Protège ton général ♚ : s'il est pris, tu perds. Sinon, plus tu finis près du palais, mieux c'est.", schema: plateau(5, 5, [[2, 2, 0, "♞"], [3, 0, 1, "♙"], [2, 4, 0, "♚"]], { ...NUIT, damier: "rgba(224,178,92,.22)", fleches: [[2, 2, 3, 0]] }) },
  ],
  othello: [
    { titre: "Ton but", texte: "Tiens la majorité des 36 quartiers de la capitale à la fin : tes rassemblements ✊ contre la police 🛡.", schema: plateau(6, 6, [[2, 2, 0, "✊"], [3, 3, 0, "✊"], [2, 3, 1, "🛡"], [3, 2, 1, "🛡"]], { fond: "#1d4a35", case: "rgba(255,255,255,.12)", rond: true }) },
    { titre: "À ton tour", texte: "Pose un rassemblement qui ENCADRE des quartiers de police, en ligne ou en diagonale, entre ta pose et un de tes quartiers. Les cases jouables s'allument.", schema: plateau(6, 6, [[1, 2, 0, "✊"], [2, 2, 1, "🛡"], [3, 2, 1, "🛡"]], { fond: "#1d4a35", case: "rgba(255,255,255,.12)", rond: true, zones: [[4, 2, "#ffd166"]] }) },
    { titre: "Comment gagner", texte: "Tous les quartiers encadrés passent de ton côté. Les coins et les bords sont précieux : on ne peut plus les reprendre.", schema: plateau(6, 6, [[1, 2, 0, "✊"], [2, 2, 0, "✊"], [3, 2, 0, "✊"], [4, 2, 0, "✊"]], { fond: "#1d4a35", case: "rgba(255,255,255,.12)", rond: true, fleches: [[4, 2, 2, 2]] }) },
  ],
  go: [
    { titre: "Ton but", texte: "Contrôle plus de cases que l'adversaire : tes navires plus les eaux que tu encercles seul.", schema: plateau(5, 5, [[1, 0, 0, "⛴"], [0, 1, 0, "⛴"], [2, 1, 0, "⛴"], [1, 2, 0, "⛴"], [4, 3, 1, "🚢"], [3, 4, 1, "🚢"]], { ...MER, zones: [[1, 1, "#ffd166"], [0, 0, "#ffd166"]] }) },
    { titre: "À ton tour", texte: "Pose un navire sur une case libre (8 au plus). « Passer » arrête tes poses quand tu ne veux plus jouer.", schema: plateau(5, 5, [[2, 2, 0, "⛴"], [3, 2, 1, "🚢"]], { ...MER, zones: [[2, 3, "#ffd166"]] }) },
    { titre: "Comment gagner", texte: "Un groupe ennemi sans aucune case libre autour (haut, bas, gauche, droite) est capturé. Encercle, mais garde toujours des libertés à tes navires.", schema: plateau(5, 5, [[2, 2, 1, "🚢"], [1, 2, 0, "⛴"], [3, 2, 0, "⛴"], [2, 1, 0, "⛴"]], { ...MER, zones: [[2, 3, "#ffd166"]] }) },
  ],
  santorini: [
    { titre: "Ton but", texte: "Monte ton ingénieur ★ sur un chantier de niveau 3 : il est inauguré et tu gagnes aussitôt.", schema: plateau(5, 5, [[2, 2, 0, "★"], [3, 1, 2, "3"], [1, 2, 2, "1"], [2, 1, 2, "2"]], { fond: "#4a3b2c", case: "rgba(255,240,210,.14)" }) },
    { titre: "À ton tour", texte: "1) Déplace-toi d'une case, en montant d'un niveau au plus. 2) Construis un niveau sur une case voisine.", schema: plateau(5, 5, [[1, 2, 0, "★"], [2, 2, 2, "1"], [2, 1, 2, "+1"]], { fond: "#4a3b2c", case: "rgba(255,240,210,.14)", fleches: [[1, 2, 2, 2]] }) },
    { titre: "Comment gagner", texte: "Construire sur un niveau 3 pose un veto ⛔ : bloque ainsi l'adversaire s'il est à une marche de gagner.", schema: plateau(5, 5, [[2, 2, 1, "✪"], [3, 2, 2, "⛔"], [1, 2, 0, "★"]], { fond: "#4a3b2c", case: "rgba(255,240,210,.14)" }) },
  ],
  onitama: [
    { titre: "Ton but", texte: "Coule l'amiral adverse ⚓, ou amène ton amiral dans le port adverse ⌂ (en haut au centre).", schema: plateau(5, 5, [[2, 0, 1, "⚓"], [0, 0, 1, "⛵"], [4, 0, 1, "⛵"], [2, 4, 0, "⚓"], [1, 4, 0, "⛵"], [3, 4, 0, "⛵"]], { ...MER }) },
    { titre: "À ton tour", texte: "Tu as 2 cartes de mouvement. Choisis un navire, puis un des déplacements permis par une carte. Les cases possibles s'allument.", schema: plateau(5, 5, [[2, 3, 0, "⛵"]], { ...MER, zones: [[1, 2, "#ffd166"], [3, 2, "#ffd166"], [2, 1, "#ffd166"]] }) },
    { titre: "Comment gagner", texte: "Attention : la carte que tu joues passe à l'adversaire au tour suivant. Ne lui offre pas le mouvement qui coule ton amiral.", schema: cartes([["↖↗", BLEU], ["↑↑", BLEU], ["⇄", "#b5841f", "en attente"], ["↙↘", ROUGE], ["←→", ROUGE]], "Toi · attente · lui") },
  ],
  stratego: [
    { titre: "Ton but", texte: "Capture le QG adverse ⚑. Ses unités sont cachées (?) jusqu'au premier contact.", schema: plateau(5, 6, [[0, 0, 1, "?"], [1, 0, 1, "?"], [2, 0, 1, "?"], [3, 0, 1, "?"], [4, 0, 1, "?"], [1, 5, 0, "⚑"], [2, 4, 0, "5"], [3, 4, 0, "2"]], { fond: "#2a2716", case: "rgba(224,178,92,.10)" }) },
    { titre: "À ton tour", texte: "Déplace une unité d'une case (le drone 5 va plus loin en ligne droite). Aller sur une unité ennemie l'attaque : la plus forte reste.", schema: plateau(5, 6, [[2, 3, 0, "4"], [2, 2, 1, "?"]], { fond: "#2a2716", case: "rgba(224,178,92,.10)", fleches: [[2, 3, 2, 2]] }) },
    { titre: "Comment gagner", texte: "Le piège ✹ tue tout le monde, sauf le sapeur 2. Le conseiller 1 bat le drone 5 s'il attaque. Garde ton sapeur pour le piège devant le QG.", schema: plateau(5, 6, [[2, 1, 1, "✹"], [2, 0, 1, "⚑"], [2, 2, 0, "2"]], { fond: "#2a2716", case: "rgba(224,178,92,.10)", fleches: [[2, 2, 2, 1]] }) },
  ],
  quarto: [
    { titre: "Ton but", texte: "Complète une ligne de 4 concessions qui partagent au moins un trait (◆ chère, ▲ longue, ▣ secrète, ★ forte…).", schema: plateau(4, 4, [[0, 1, 2, "◆"], [1, 1, 2, "◆"], [2, 1, 2, "◆"], [3, 1, 2, "◆"]], { fond: "#3b3355", case: "rgba(255,255,255,.12)", zones: [[0, 1, "#ffd166"], [1, 1, "#ffd166"], [2, 1, "#ffd166"], [3, 1, "#ffd166"]] }) },
    { titre: "À ton tour", texte: "1) Place sur la table la concession que l'adversaire t'a tendue. 2) Choisis dans la réserve celle qu'IL devra placer.", schema: cartes([["◆▲", "#6b4fc8"], ["●▼", "#6b4fc8"], ["◆▼", "#ffd166", "pour lui"], ["●▲", "#6b4fc8"]], "Réserve : tu choisis pour lui") },
    { titre: "Comment gagner", texte: "Le piège est dans l'étape 2 : ne lui tends jamais une concession qui complète une ligne. Table pleine sans ligne : compromis.", schema: plateau(4, 4, [[0, 0, 2, "●"], [1, 0, 2, "●"], [2, 0, 2, "●"]], { fond: "#3b3355", case: "rgba(255,255,255,.12)", zones: [[3, 0, "#ff5a4f"]] }) },
  ],
  bataille: [
    { titre: "Ton but", texte: "Coule les 3 sous-marins cachés de l'adversaire avant qu'il ne coule les tiens.", schema: plateau(6, 6, [[1, 1, 2, "💥"], [4, 3, 2, "?"], [2, 5, 2, "?"]], { fond: "#0b2a1d", case: "rgba(93,255,158,.12)" }) },
    { titre: "À ton tour", texte: "Tire sur une case. Raté : le sonar donne la distance du sous-marin le plus proche (1 = juste à côté, diagonales comprises).", schema: plateau(6, 6, [[2, 2, 2, "2"]], { fond: "#0b2a1d", case: "rgba(93,255,158,.12)", zones: [[0, 0, "#5dff9e"], [4, 4, "#5dff9e"], [0, 4, "#5dff9e"], [4, 0, "#5dff9e"]] }) },
    { titre: "Comment gagner", texte: "Croise les distances de plusieurs tirs : la cible est là où les cercles se rencontrent. 12 tirs chacun au plus.", schema: plateau(6, 6, [[0, 0, 2, "3"], [5, 0, 2, "2"], [3, 3, 2, "💥"]], { fond: "#0b2a1d", case: "rgba(93,255,158,.12)" }) },
  ],
  jaipur: [
    { titre: "Ton but", texte: "Gagne plus de points que l'adversaire en vendant des contrats (soja, pétrole, puces, armes, crédits) au bon moment.", schema: cartes([["🌾", "#7a9a2e"], ["🛢", "#333"], ["💾", "#2f6db5"], ["🎖", "#8a5a2b"], ["💶", "#b5841f"]], "Le marché : 5 contrats") },
    { titre: "À ton tour", texte: "UNE action : prendre un contrat du marché (6 en main au plus) ou vendre TOUS tes contrats d'un même bien. Pétrole, puces et armes : 2 au moins.", schema: cartes([["🛢", "#333"], ["🛢", "#333"], ["🛢", "#333", "vendre 3"], ["🌾", "#7a9a2e"]], "Ta main") },
    { titre: "Comment gagner", texte: "Le premier vendeur prend les jetons les plus chers. Vendre 3, 4 ou 5 cartes d'un coup ajoute +2, +4 ou +6. Tôt ou gros : à toi de choisir.", schema: cartes([["7", "#333", "1er"], ["5", "#333", "2e"], ["3", "#333", "3e"], ["+4", "#ffd166", "série de 4"]], "Jetons du pétrole") },
  ],
  longhorn: [
    { titre: "Ton but", texte: "Rafle plus de soutiens que l'agent adverse dans une tournée de 9 pays : élites (3 points), argent (2), rue (1).", schema: plateau(3, 3, [[0, 0, 0, "★"], [2, 2, 1, "★"], [1, 1, 2, "3"], [2, 0, 2, "2"], [0, 2, 2, "1"]], { fond: "#4a3b2c", case: "rgba(255,240,210,.16)" }) },
    { titre: "À ton tour", texte: "Prends TOUS les jetons d'une couleur dans ton pays, puis avance d'autant de cases que de jetons pris (4 au plus). Le bouton montre où tu arrives.", schema: plateau(3, 3, [[0, 0, 0, "★"]], { fond: "#4a3b2c", case: "rgba(255,240,210,.16)", fleches: [[0, 0, 2, 0]] }) },
    { titre: "Comment gagner", texte: "Chaque couleur où tu as la majorité rapporte +3. 4 pays cachent une prime ou un scandale. Regarde aussi ce que tu laisses à l'adversaire.", schema: cartes([["3", "#6b4fc8", "élites"], ["2", "#b5841f", "argent"], ["1", "#7a9a2e", "rue"], ["+3", "#ffd166", "majorité"]], "Valeur des soutiens") },
  ],
  sept: [
    { titre: "Ton but", texte: "Domine la région par l'économie, la culture ou la force militaire. Le pion militaire à 3 crans d'avance gagne tout de suite.", schema: cartes([["💶", "#b5841f", "points"], ["🎭", "#6b4fc8", "série +4"], ["⚔", "#c0392b", "pion"]], "3 façons de dominer") },
    { titre: "À ton tour", texte: "Prends une carte libre de la pyramide (rien ne la recouvre). Une carte du haut se libère, et se retourne, quand les 2 cartes dessous sont prises.", schema: plateau(4, 3, [[1, 0, 2, "?"], [2, 0, 2, "?"], [0, 2, 2, "💶"], [1, 2, 2, "⚔"], [2, 2, 2, "🎭"], [3, 2, 2, "💶"]], { fond: "#2a2716", case: "rgba(0,0,0,0)", zones: [[0, 2, "#ffd166"], [1, 2, "#ffd166"], [2, 2, "#ffd166"], [3, 2, "#ffd166"]] }) },
    { titre: "Comment gagner", texte: "Prendre une carte en découvre d'autres… pour l'adversaire. Ne lui libère pas une carte militaire s'il est proche des 3 crans.", schema: plateau(7, 1, [[3, 0, 2, "⚔"], [5, 0, 0, "▶"]], { fond: "#2a2716", case: "rgba(224,178,92,.18)", zones: [[0, 0, "#c0392b"], [6, 0, "#2f6db5"]] }) },
  ],
  lostcities: [
    { titre: "Ton but", texte: "Fais rapporter tes pistes de recherche (IA, puces, nucléaire, spatial, biotech) plus que celles de l'adversaire.", schema: cartes([["IA", "#2f6db5"], ["💾", "#7a9a2e"], ["☢", "#b5841f"], ["🚀", "#6b4fc8"], ["🧬", "#c0392b"]], "5 pistes") },
    { titre: "À ton tour", texte: "Pose une carte sur sa piste, toujours plus haute que la précédente, ou défausse-la. Le pari ×2 se pose seulement avant tout chiffre.", schema: cartes([["×2", "#2f6db5", "pari"], ["3", "#2f6db5"], ["6", "#2f6db5"], ["9", "#2f6db5", "croissant"]], "Ta piste IA") },
    { titre: "Comment gagner", texte: "Une piste vaut (somme − 15) × (1 + paris). Une piste ouverte trop faible fait perdre des points : ouvre-la seulement si tu peux dépasser 15.", schema: cartes([["4+5", "#c0392b", "−6"], ["18", "#7a9a2e", "+3"], ["25", "#2f6db5", "+20 si pari"]], "Somme − 15") },
  ],
  schotten: [
    { titre: "Ton but", texte: "Prends 2 des 3 bornes de la frontière en y alignant la meilleure combinaison de 3 cartes.", schema: plateau(3, 3, [[0, 1, 2, "⚑"], [1, 1, 2, "⚑"], [2, 1, 2, "⚑"], [0, 2, 0, "7"], [1, 0, 1, "5"]], { fond: "#1d4a35", case: "rgba(255,255,255,.10)" }) },
    { titre: "À ton tour", texte: "Choisis une carte de ta main, puis une borne : elle va de ton côté (3 cartes au plus par côté). Tu repioches.", schema: cartes([["4", BLEU], ["5", BLEU], ["6", BLEU, "suite couleur"], ["9", ROUGE]], "Ta main") },
    { titre: "Comment gagner", texte: "Du plus fort au plus faible : suite de même couleur, brelan, même couleur, suite, simple somme. Commence par 2 cartes proches de même couleur.", schema: cartes([["456", BLEU, "1"], ["777", "#b5841f", "2"], ["2·5·9", BLEU, "3"], ["345", "#7a9a2e", "4"], ["Σ", "#999", "5"]], "Classement") },
  ],
  korsar: [
    { titre: "Ton but", texte: "Encaisse plus de flux commerciaux (valeur 2 à 5) que l'adversaire.", schema: cartes([["2", "#b5841f"], ["5", "#b5841f"], ["3", "#b5841f"]], "3 flux sur la table") },
    { titre: "À ton tour", texte: "Pose une sanction sur un flux : une seule couleur par camp et par flux, et pas celle de l'adversaire. Les forces s'additionnent.", schema: cartes([["3", BLEU, "douanes"], ["2", BLEU, "douanes"], ["4", ROUGE, "finance"], ["⚓", "#333", "amiral"]], "Sur un même flux") },
    { titre: "Comment gagner", texte: "Si tu mènes encore un flux au début de ton tour, tu l'encaisses. L'amiral ⚓ te donne un flux d'office : garde-le pour un gros flux.", schema: cartes([["5", "#ffd166", "encaissé"], ["⚓", "#333", "prise"]], "Encaisser") },
  ],
  coup: [
    { titre: "Ton but", texte: "Élimine les 2 alliés adverses au palais, ou garde-en plus que l'adversaire après 10 tours.", schema: cartes([["?", ROUGE], ["?", ROUGE], ["🏦", BLEU, "toi"], ["🗡", BLEU, "toi"]], "2 rôles cachés chacun") },
    { titre: "À ton tour", texte: "Revenu (+1), Impôt (+3, banquier), Extorsion (2 pièces, services), Assassinat (3 pièces, assassin) ou Coup de force (7 pièces, imparable).", schema: cartes([["+1", "#999"], ["+3", "#b5841f"], ["⇄2", "#6b4fc8"], ["🗡", "#c0392b"], ["7", "#333"]], "Les actions") },
    { titre: "Comment gagner", texte: "Tu peux annoncer un rôle que tu n'as pas. Contesté : le menteur perd un allié. Conteste quand tu tiens toi-même 2 exemplaires du rôle annoncé.", schema: cartes([["🏦?", ROUGE, "il annonce"], ["✋", BLEU, "contester"]], "Bluff ou pas ?") },
  ],
  skull: [
    { titre: "Ton but", texte: "Réussis 2 révélations avant l'adversaire. Chacun a 3 informations vraies ✔ et 1 fausse ✖.", schema: cartes([["✔", "#7a9a2e"], ["✔", "#7a9a2e"], ["✔", "#7a9a2e"], ["✖", "#c0392b"]], "Tes 4 informations") },
    { titre: "À ton tour", texte: "Pose une pile de 3 informations, avec ou sans ta fausse. Puis enchéris : combien de vraies peux-tu révéler ? Surenchéris ou passe.", schema: cartes([["✔", "#7a9a2e", "1 = sommet"], ["✔", "#7a9a2e", "2"], ["✖", "#c0392b", "3"]], "Ta pile") },
    { titre: "Comment gagner", texte: "Le gagnant de l'enchère révèle d'abord SA pile, de haut en bas. Ta fausse en haut te piège toi-même : mets-la plus bas.", schema: cartes([["✔", "#7a9a2e", "toi"], ["✔", "#7a9a2e", "toi"], ["✔", "#7a9a2e", "lui"], ["✖", "#c0392b", "raté"]], "Révéler 4") },
  ],
  perudo: [
    { titre: "Ton but", texte: "Fais perdre ses dés à l'adversaire en démasquant ses bluffs. Chacun a 5 dés, cachés à l'autre.", schema: cartes([["⚃", BLEU], ["⚃", BLEU], ["⚀", BLEU], ["⚅", BLEU], ["⚁", BLEU]], "Tes 5 dés") },
    { titre: "À ton tour", texte: "Monte l'enchère « au moins N dés montrent F » (dés des deux camps) ou crie « Bluff ! ». Celui qui avait tort perd un dé.", schema: cartes([["4×⚃", ROUGE, "il dit"], ["5×⚃", BLEU, "monter"], ["Bluff", "#333", "crier"]], "Monter ou crier") },
    { titre: "Comment gagner", texte: "Compte tes dés de la face annoncée, puis ajoute environ un sixième de ses dés. Au-delà, l'enchère est sans doute un bluff.", schema: cartes([["2", BLEU, "chez toi"], ["+0,8", ROUGE, "chez lui"], ["≈3", "#ffd166", "attendu"]], "Calcul rapide") },
  ],
  mastermind: [
    { titre: "Ton but", texte: "Trouve la combinaison secrète de 4 indices en 6 essais. Un indice peut revenir plusieurs fois.", schema: cartes([["?"], ["?"], ["?"], ["?"]], "Code secret") },
    { titre: "À ton tour", texte: "Compose 4 indices parmi 6 (port, ambassade, café, minuit, valise, chiffre), puis Valider. « Effacer » retire le dernier.", schema: cartes([["⚓", "#2f6db5"], ["🏛", "#6b4fc8"], ["☕", "#8a5a2b"], ["🌙", "#333"]], "Ton essai") },
    { titre: "Comment gagner", texte: "● = bon indice bien placé, ○ = bon indice mal placé. Chaque essai doit rester compatible avec toutes les réponses reçues. 3 essais ou moins : 100 %.", schema: cartes([["●", "#333", "bien placé"], ["●", "#333"], ["○", "#999", "mal placé"], ["·", "#ddd", "absent"]], "La réponse") },
  ],
  simon: [
    { titre: "Ton but", texte: "Franchis 5 pare-feu en rejouant des séquences de plus en plus longues : 3, puis 4, 5, 6 et 7 nœuds.", schema: plateau(3, 3, [[0, 0, 2, "1"], [2, 1, 2, "2"], [1, 2, 2, "3"]], { fond: "#0b2a1d", case: "rgba(93,255,158,.14)", fleches: [[0, 0, 2, 1], [2, 1, 1, 2]] }) },
    { titre: "À ton tour", texte: "Regarde les nœuds s'allumer un par un, puis clique-les dans le même ordre avant la fin du chrono.", schema: plateau(3, 3, [[0, 0, 0, "✓"], [2, 1, 0, "✓"]], { fond: "#0b2a1d", case: "rgba(93,255,158,.14)", zones: [[1, 2, "#ffd166"]] }) },
    { titre: "Comment gagner", texte: "Une erreur ou le temps dépassé coûte une vie. Récite les nœuds à voix basse par paquets de 2 ou 3.", schema: cartes([["🛡", "#7a9a2e", "1"], ["🛡", "#7a9a2e", "2"], ["🛡", "#7a9a2e", "3"], ["🛡", "#999", "4"], ["🛡", "#999", "5"]], "5 pare-feu") },
  ],
  memoire44: [
    { titre: "Ton but", texte: "Prends 2 des 3 objectifs : gauche, centre, droite. Vider un secteur adverse prend son objectif.", schema: plateau(3, 3, [[0, 0, 1, "♟"], [1, 0, 1, "♟"], [2, 0, 1, "♟"], [0, 1, 2, "⚑"], [1, 1, 2, "⚑"], [2, 1, 2, "⚑"], [0, 2, 0, "♟"], [1, 2, 0, "♜"], [2, 2, 0, "♟"]], { fond: "#3b4a2a", case: "rgba(255,255,255,.10)" }) },
    { titre: "À ton tour", texte: "Joue une de tes 4 cartes d'ordre : attaque d'un secteur, assaut général, barrage d'artillerie ou renforts. Tu en repioches une.", schema: cartes([["◀", "#8a5a2b", "gauche"], ["▲", "#8a5a2b", "centre"], ["💥", "#c0392b", "barrage"], ["+♜", "#2f6db5", "renforts"]], "Tes ordres") },
    { titre: "Comment gagner", texte: "Infanterie 1 dé, blindé 2 dés ; une face sur deux touche. L'adversaire riposte avec la moitié des siens, sauf contre le barrage.", schema: cartes([["⚅", "#7a9a2e", "touché"], ["⚂", "#7a9a2e", "touché"], ["⚀", "#999", "raté"]], "Les dés") },
  ],
  streetfighter: [
    { titre: "Ton but", texte: "Mets le moral adverse à zéro (10 points chacun), ou garde-en plus après 8 échanges.", schema: cartes([["10", BLEU, "toi"], ["10", ROUGE, "lui"]], "Moral") },
    { titre: "À ton tour", texte: "Choisis en secret une manœuvre parmi 5, en 6 secondes. Chacune bat les 2 suivantes dans le cercle et perd contre les 2 autres.", schema: cycle(["✈", "💻", "🚜", "🚚", "🛡"]) },
    { titre: "Comment gagner", texte: "Gagner un échange inflige 2 points ; 2 victoires de suite avec 2 manœuvres différentes : combo à 3. Varie : l'adversaire repère tes habitudes.", schema: cartes([["−2", ROUGE, "échange"], ["−3", "#ffd166", "combo"]], "Dégâts") },
  ],
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
