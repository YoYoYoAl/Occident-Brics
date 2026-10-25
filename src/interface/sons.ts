// Sons d'interface : packs « UI Audio » et « Interface Sounds » de Kenney (kenney.nl), licence CC0 (domaine public).
const fichiers = import.meta.glob("../sons/*.mp3", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const URLS: Record<string, string> = Object.fromEntries(Object.entries(fichiers).map(([k, v]) => [k.split("/").pop()!.replace(".mp3", ""), v]));
export type Son = "clic" | "carte" | "action" | "fin" | "ouvrir" | "fermer" | "briefing" | "evenement" | "erreur" | "reaction" | "victoire" | "defaite";
const CLE = "occident-brics-son";
let actif = (() => { try { return localStorage.getItem(CLE) !== "non"; } catch { return true; } })();
export const sonActif = () => actif;
export function basculerSon(): boolean {
  actif = !actif;
  try { localStorage.setItem(CLE, actif ? "oui" : "non"); } catch { /* stockage indisponible */ }
  return actif;
}
export function jouer(son: Son, volume = 0.5) {
  if (!actif || !URLS[son]) return;
  try { const a = new Audio(URLS[son]); a.volume = volume; void a.play().catch(() => {}); } catch { /* audio indisponible */ }
}
