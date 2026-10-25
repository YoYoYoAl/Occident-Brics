// Sons d'interface : packs « UI Audio » et « Interface Sounds » de Kenney (kenney.nl), licence CC0 (domaine public).
// Bruitages et musiques : CC0, détail dans public/musiques/LICENCES.md.
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

// Bruitages d'événements (CC0, OpenGameArt / Freesound via le fil « sons ») : un par famille d'événements.
const BRUITAGES: Record<string, string> = {
  attentat: "explosion", guerre_interetatique: "explosion", conflit_frontalier: "explosion", massacre_memorial: "explosion",
  manifestations: "foule", revolution: "foule", repression: "foule", poussee_ideologique: "foule", crise_migratoire: "foule",
  traite_majeur: "applaudissements", accord_commercial: "applaudissements", reconciliation: "applaudissements", sommet_reconciliation: "applaudissements",
  election_rupture: "applaudissements", adhesion_alliance: "applaudissements",
  cyclone: "tempete", tempete: "tempete", seisme: "seisme", eruption: "seisme",
  coup_etat: "fusillade", guerre_civile: "fusillade", assassinat_dirigeant: "fusillade", secession: "fusillade",
  crise_bancaire: "pieces", krach_boursier: "pieces", defaut_souverain: "pieces", crise_change: "pieces", hyperinflation: "pieces",
  bulle_immobiliere: "pieces", recession_mondiale: "pieces", guerre_commerciale: "pieces", nationalisation: "cloche", gisement_geant: "cloche",
  sanctions_embargo: "cloche", sortie_organisation: "cloche", scandale_dirigeant: "radio",
  blocage_detroit: "vagues", choc_petrolier: "vagues", inondation: "pluie", secheresse: "alarme", canicule: "alarme", record_climatique: "alarme",
  cyberattaque: "radio", proliferation_nucleaire: "radio", incident_militaire: "helico", exploit_spatial: "avion", percee_technologique: "machine",
  epidemie: "sirene", pandemie: "sirene", mega_incendie: "sirene", accident_industriel: "sirene", panne_infrastructure: "alarme",
  famine: "alarme", flambee_alimentaire: "alarme", alerte_environnementale: "alarme",
};
export const bruitage = (famille?: string) => (famille && BRUITAGES[famille] ? `ev_${BRUITAGES[famille]}` : null);
export function jouerEvenement(famille: string | undefined, volume = 0.4) {
  const nom = bruitage(famille);
  if (!actif || !nom || !URLS[nom]) return false;
  try { const a = new Audio(URLS[nom]); a.volume = volume; void a.play().catch(() => {}); return true; } catch { return false; }
}
export function jouerJingle(victoire: boolean) {
  if (!actif) return;
  const nom = victoire ? "jingle_victoire" : "jingle_defaite";
  try { const a = new Audio(URLS[nom]); a.volume = 0.5; void a.play().catch(() => {}); } catch { /* audio indisponible */ }
}

// Musiques (CC0, OpenGameArt) : fichiers à part (musiques/*.mp3), chargés seulement à l'écoute, en boucle à faible volume.
export type Musique = "menu" | "carte" | "calme" | "tension" | "victoire" | "defaite";
const CLE_MUSIQUE = "occident-brics-musique";
let musiqueActive = (() => { try { return localStorage.getItem(CLE_MUSIQUE) !== "non"; } catch { return true; } })();
let lecteur: HTMLAudioElement | null = null, morceau: Musique | null = null, voulu: Musique | null = null;
export const musiqueActivee = () => musiqueActive;
export function musique(m: Musique) {
  voulu = m;
  if (!musiqueActive || morceau === m) return;
  lecteur?.pause();
  try {
    lecteur = new Audio(`musiques/${m}.mp3`); lecteur.loop = m !== "victoire" && m !== "defaite"; lecteur.volume = 0.18; lecteur.preload = "none";
    morceau = m; void lecteur.play().catch(() => { morceau = null; }); // refusé avant un geste de l'utilisateur : on réessaiera
  } catch { morceau = null; }
}
export function basculerMusique(): boolean {
  musiqueActive = !musiqueActive;
  try { localStorage.setItem(CLE_MUSIQUE, musiqueActive ? "oui" : "non"); } catch { /* stockage indisponible */ }
  if (!musiqueActive) { lecteur?.pause(); morceau = null; } else if (voulu) musique(voulu);
  return musiqueActive;
}
// Le navigateur bloque l'audio avant le premier geste : on relance la musique voulue au premier clic.
export const relancerMusique = () => { if (musiqueActive && voulu && morceau !== voulu) musique(voulu); };
