// Portraits : illustrés (lot ob_8, attribués sans remise par le moteur) puis générés : un visage par numéro, jamais deux fois le même dans une partie.
import { image } from "./images";
const PEAUX = ["#f1c9a5", "#e0ac84", "#c68a62", "#a8704a", "#8a5434", "#5e3a24"];
const CHEVEUX = ["#1b1a1a", "#3b2a1e", "#6b4a2b", "#a0784a", "#c9c2b5", "#8a8a8a"];
const VESTES = ["#1f2a3a", "#2b2f36", "#3a2b2b", "#24364a", "#3d3a2c", "#2e3d33"];
const FONDS = ["#2c3e50", "#3b3355", "#2f4a46", "#4a3b2c", "#283a52", "#45343a"];
const CRAVATES = ["#8c2f2f", "#2f5c8c", "#7a6a2f", "#4b2f6a", "#2f6a4b", "#9a9a9a"];
// Générateur déterministe à partir du numéro (aucun effet sur le hasard de la partie).
function suite(n: number) { let x = (n * 2654435761) >>> 0; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const pick = <T>(r: () => number, l: T[]) => l[Math.floor(r() * l.length)];
export function portraitSvg(n: number, militaire = false): string {
  const r = suite(n + 7), peau = pick(r, PEAUX), cheveux = pick(r, CHEVEUX), veste = militaire ? "#3f4a2e" : pick(r, VESTES), fond = pick(r, FONDS), cravate = pick(r, CRAVATES);
  const coiffure = Math.floor(r() * 5), lunettes = r() < 0.3, barbe = r() < 0.18, w = 17 + Math.floor(r() * 4), h = 21 + Math.floor(r() * 4);
  const tete = `<ellipse cx="45" cy="40" rx="${w}" ry="${h}" fill="${peau}"/>`;
  const coif = [
    `<path d="M${45 - w} 36 Q45 ${8 - r() * 4} ${45 + w} 36 L${45 + w} 30 Q45 12 ${45 - w} 30 Z" fill="${cheveux}"/>`,
    `<path d="M${45 - w - 2} 44 Q${40} 6 ${45 + w + 2} 44 L${45 + w} 30 Q45 18 ${45 - w} 30 Z" fill="${cheveux}"/>`,
    `<path d="M${45 - w} 34 Q45 14 ${45 + w} 34 Q45 24 ${45 - w} 34 Z" fill="${cheveux}"/>`,
    `<path d="M${45 - w - 3} 60 Q${45 - w - 6} 14 45 15 Q${45 + w + 6} 14 ${45 + w + 3} 60 L${45 + w - 3} 40 Q45 22 ${45 - w + 3} 40 Z" fill="${cheveux}"/>`,
    `<path d="M${45 - w + 2} 30 Q45 20 ${45 + w - 2} 30" stroke="${cheveux}" stroke-width="3" fill="none"/>`,
  ][coiffure];
  const yeux = `<circle cx="38" cy="41" r="1.8" fill="#1b1b1b"/><circle cx="52" cy="41" r="1.8" fill="#1b1b1b"/>`;
  const verres = lunettes ? `<g fill="none" stroke="#1b1b1b" stroke-width="1.4"><circle cx="38" cy="41" r="5"/><circle cx="52" cy="41" r="5"/><path d="M43 41 L47 41"/></g>` : "";
  const bouche = `<path d="M40 ${51 + r() * 2} Q45 ${53 + r() * 3} 50 ${51 + r() * 2}" stroke="#6b3a2a" stroke-width="1.6" fill="none"/>`;
  const poils = barbe ? `<path d="M${45 - w + 3} 46 Q45 ${66 + r() * 4} ${45 + w - 3} 46 Q45 58 ${45 - w + 3} 46 Z" fill="${cheveux}" opacity=".85"/>` : "";
  const corps = `<path d="M6 100 C8 76 24 66 45 66 C66 66 82 76 84 100 Z" fill="${veste}"/><path d="M38 66 L45 80 L52 66 Z" fill="#e8e4dc"/>`
    + (militaire ? `<rect x="58" y="78" width="12" height="3" fill="#c9a43a"/><rect x="58" y="83" width="12" height="3" fill="#8c2f2f"/>` : `<path d="M44 68 L46 68 L48 86 L45 90 L42 86 Z" fill="${cravate}"/>`);
  return `<svg viewBox="0 0 90 100" class="portrait-gen" aria-hidden="true"><rect width="90" height="100" fill="${fond}"/>${corps}<rect x="40" y="56" width="10" height="12" fill="${peau}"/>${tete}${coif}${poils}${yeux}${verres}${bouche}</svg>`;
}
// Numéro stable pour un dirigeant (à partir de son nom, unique dans la partie).
// Dirigeant : portrait illustré s'il en a reçu un (lot ob_8), sinon généré d'après son nom.
export const visageDirigeant = (d: { nom: string; illustre?: string }) => { const s = d.illustre ? image(d.illustre) : undefined; return s ? `<img class="portrait-gen" src="${s}" alt="">` : portraitSvg(numeroNom(d.nom)); };
export const numeroNom = (nom: string) => { let h = 0; for (const c of nom) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 1000 + (h % 100000); };
