// Sons d'interface : packs « UI Audio » et « Interface Sounds » de Kenney (kenney.nl), licence CC0 (domaine public).
// Bruitages et musiques : CC0, détail dans public/musiques/LICENCES.md.
import HYMNES from "../data/hymnes.json";
const fichiers = import.meta.glob("../sons/*.mp3", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const URLS: Record<string, string> = Object.fromEntries(Object.entries(fichiers).map(([k, v]) => [k.split("/").pop()!.replace(".mp3", ""), v]));
export type Son = "clic" | "carte" | "action" | "fin" | "ouvrir" | "fermer" | "briefing" | "evenement" | "erreur" | "reaction" | "victoire" | "defaite" | "etape"
  | "act_eco" | "act_diplo" | "act_defense" | "act_force" | "act_secret";
// Variantes : « nom », « nom_2 », « nom_3 »… tirées au hasard pour éviter la répétition.
const VARIANTES: Record<string, string[]> = {};
for (const k of Object.keys(URLS)) (VARIANTES[k.replace(/_\d+$/, "")] ??= []).push(URLS[k]);
// Tirage sans répétition immédiate : la variante jouée en dernier est exclue du tirage suivant.
const derniers: Record<string, string> = {};
export function tirer<T>(liste: readonly T[], cle: string, hasard = Math.random): T | null {
  if (!liste.length) return null;
  const dernier = derniers[cle], choix = liste.length > 1 ? liste.filter(x => String(x) !== dernier) : liste;
  const x = choix[Math.floor(hasard() * choix.length)];
  derniers[cle] = String(x); return x;
}
const variante = (nom: string) => tirer(VARIANTES[nom] ?? [], nom);
// Légère variation de hauteur (± ecart) et de volume (jusqu'à -15 %) pour qu'un même son ne sonne jamais deux fois pareil.
function lire(url: string, volume: number, ecart: number) {
  const a = new Audio(url);
  a.volume = Math.min(1, volume * (0.85 + 0.15 * Math.random()));
  a.preservesPitch = false; a.playbackRate = 1 + (Math.random() * 2 - 1) * ecart;
  void a.play().catch(() => {}); return a;
}
const CLE = "occident-brics-son";
let actif = (() => { try { return localStorage.getItem(CLE) !== "non"; } catch { return true; } })();
export const sonActif = () => actif;
export function basculerSon(): boolean {
  actif = !actif;
  try { localStorage.setItem(CLE, actif ? "oui" : "non"); } catch { /* stockage indisponible */ }
  return actif;
}
export function jouer(son: Son, volume = 0.5) {
  const url = actif ? variante(son) : null; if (!url) return;
  try { lire(url, volume, 0.04); } catch { /* audio indisponible */ }
}

// Bruitages d'événements (CC0, OpenGameArt / Freesound via le fil « sons ») : un par famille d'événements.
// Plusieurs bruitages par famille, tirés au hasard (puis une variante de chacun : ev_nom, ev_nom_2…).
const BRUITAGES: Record<string, string[]> = {
  attentat: ["explosion", "sirene"], guerre_interetatique: ["explosion", "avion", "naval", "helico"], conflit_frontalier: ["explosion", "fusillade"],
  massacre_memorial: ["explosion", "foule"],
  manifestations: ["foule"], revolution: ["foule", "fusillade"], repression: ["foule", "fusillade"], poussee_ideologique: ["foule"], crise_migratoire: ["foule", "vagues"],
  traite_majeur: ["applaudissements", "machine"], accord_commercial: ["applaudissements", "pieces"], reconciliation: ["applaudissements"], sommet_reconciliation: ["applaudissements"],
  election_rupture: ["applaudissements", "foule"], adhesion_alliance: ["applaudissements", "cloche"],
  cyclone: ["tempete", "pluie"], tempete: ["tempete", "pluie"], seisme: ["seisme"], eruption: ["seisme", "explosion"],
  coup_etat: ["fusillade", "helico"], guerre_civile: ["fusillade", "explosion"], assassinat_dirigeant: ["fusillade"], secession: ["fusillade", "foule"],
  crise_bancaire: ["pieces", "alarme"], krach_boursier: ["pieces", "alarme"], defaut_souverain: ["pieces"], crise_change: ["pieces"], hyperinflation: ["pieces"],
  bulle_immobiliere: ["pieces"], recession_mondiale: ["pieces", "cloche"], guerre_commerciale: ["pieces", "cloche"], nationalisation: ["cloche"], gisement_geant: ["cloche"],
  sanctions_embargo: ["cloche", "naval"], sortie_organisation: ["cloche"], scandale_dirigeant: ["radio", "machine"],
  blocage_detroit: ["vagues", "naval"], choc_petrolier: ["vagues", "pieces"], inondation: ["pluie", "tempete"], secheresse: ["alarme"], canicule: ["alarme"], record_climatique: ["alarme", "tempete"],
  cyberattaque: ["radio", "machine"], proliferation_nucleaire: ["radio", "alarme"], incident_militaire: ["helico", "avion", "naval"], exploit_spatial: ["avion"], percee_technologique: ["machine"],
  epidemie: ["sirene"], pandemie: ["sirene", "alarme"], mega_incendie: ["sirene"], accident_industriel: ["sirene", "explosion"], panne_infrastructure: ["alarme", "machine"],
  famine: ["alarme"], flambee_alimentaire: ["alarme", "pieces"], alerte_environnementale: ["alarme"],
};
export const bruitagesDe = (famille?: string) => (famille && BRUITAGES[famille] ? BRUITAGES[famille].map(n => `ev_${n}`) : []);
export const bruitage = (famille?: string) => tirer(bruitagesDe(famille), `famille:${famille}`);
export function jouerEvenement(famille: string | undefined, volume = 0.4) {
  const nom = bruitage(famille);
  const url = actif && nom ? variante(nom) : null; if (!url) return false;
  try { baisserMusique(lire(url, volume, 0.08)); return true; } catch { return false; }
}
export function jouerJingle(victoire: boolean) {
  if (!actif) return;
  const nom = victoire ? "jingle_victoire" : "jingle_defaite";
  try { const a = new Audio(URLS[nom]); a.volume = 0.5; void a.play().catch(() => {}); } catch { /* audio indisponible */ }
}

// Musiques (CC0, OpenGameArt) : fichiers à part (musiques/*.mp3), chargés seulement à l'écoute, à faible volume.
// Chaque situation a une liste de lecture : « nom », « nom_2 »… enchaînés au hasard sans répétition immédiate, avec fondu.
// ere1 à ere3 : thèmes de carte composés pour le jeu (Suno), un par ère (2000-2007, 2008-2019, 2020 et après).
export type Musique = "menu" | "carte" | "calme" | "ere1" | "ere2" | "ere3" | "tension" | "guerre" | "victoire" | "defaite";
export const MUSIQUES: Record<Musique, number> = { menu: 3, carte: 3, calme: 5, ere1: 2, ere2: 2, ere3: 2, tension: 10, guerre: 5, victoire: 3, defaite: 3 };
export const musiqueEre = (annee: number): Musique => (annee < 2008 ? "ere1" : annee < 2020 ? "ere2" : "ere3");
export const pisteMusique = (m: Musique, i: number) => `musiques/${m}${i > 1 ? `_${i}` : ""}.mp3`;
const FIN_DE_PARTIE = (m: Musique) => m === "victoire" || m === "defaite";
const VOLUME_MUSIQUE = 0.18, FONDU_MS = 1500;
let hymne: HTMLAudioElement | null = null;
const volumeMusique = () => (hymne ? VOLUME_MUSIQUE / 4 : VOLUME_MUSIQUE);
const CLE_MUSIQUE = "occident-brics-musique";
let musiqueActive = (() => { try { return localStorage.getItem(CLE_MUSIQUE) !== "non"; } catch { return true; } })();
let lecteur: HTMLAudioElement | null = null, morceau: Musique | null = null, voulu: Musique | null = null;
export const musiqueActivee = () => musiqueActive;
function fondu(a: HTMLAudioElement, vers: number, fin?: () => void) {
  const depart = a.volume, t0 = Date.now();
  const pas = setInterval(() => {
    const k = Math.min(1, (Date.now() - t0) / FONDU_MS); a.volume = depart + (vers - depart) * k;
    if (k >= 1) { clearInterval(pas); fin?.(); }
  }, 50);
}
function piste(m: Musique, debut: boolean) {
  const i = tirer(Array.from({ length: MUSIQUES[m] }, (_, k) => k + 1), `musique:${m}`) ?? 1;
  const a = new Audio(pisteMusique(m, i)); a.volume = 0; a.preload = "none";
  // à l'entrée dans une ambiance de carte, on démarre au hasard dans le premier tiers du morceau
  if (debut && !FIN_DE_PARTIE(m) && m !== "menu") a.addEventListener("loadedmetadata", () => { if (isFinite(a.duration)) a.currentTime = Math.random() * a.duration / 3; }, { once: true });
  // la liste de lecture continue ; les fins de partie s'arrêtent après un morceau
  a.addEventListener("ended", () => { if (lecteur === a && !FIN_DE_PARTIE(m)) { lecteur = piste(m, false); } });
  void a.play().then(() => fondu(a, volumeMusique())).catch(() => { if (lecteur === a) morceau = null; }); // refusé avant un geste : on réessaiera
  return a;
}
export function musique(m: Musique) {
  voulu = m;
  if (!musiqueActive || morceau === m) return;
  const ancien = lecteur; if (ancien) fondu(ancien, 0, () => ancien.pause());
  try { morceau = m; lecteur = piste(m, true); } catch { morceau = null; }
}
export function basculerMusique(): boolean {
  musiqueActive = !musiqueActive;
  try { localStorage.setItem(CLE_MUSIQUE, musiqueActive ? "oui" : "non"); } catch { /* stockage indisponible */ }
  if (!musiqueActive) { lecteur?.pause(); morceau = null; } else if (voulu) musique(voulu);
  return musiqueActive;
}
// Hymnes nationaux (Wikimedia Commons, surtout l'US Navy Band, domaine public ; licence par fichier dans public/hymnes/hymnes.csv).
// Chargés seulement à l'écoute ; la musique s'efface le temps de l'hymne. Un second appel arrête l'hymne en cours.
export const aUnHymne = (iso: string) => iso in (HYMNES as Record<string, string>);
export const titreHymne = (iso: string) => (HYMNES as Record<string, string>)[iso] ?? null;
export function jouerHymne(iso: string, volume = 0.45): boolean {
  if (hymne) { hymne.pause(); hymne = null; if (lecteur) lecteur.volume = VOLUME_MUSIQUE; return false; }
  if (!actif || !aUnHymne(iso)) return false;
  try {
    const a = new Audio(`hymnes/${iso}.mp3`); a.volume = volume; hymne = a;
    if (lecteur) lecteur.volume = VOLUME_MUSIQUE / 4;
    a.addEventListener("ended", () => { if (hymne === a) { hymne = null; if (lecteur) lecteur.volume = VOLUME_MUSIQUE; } });
    void a.play().catch(() => { hymne = null; });
    return true;
  } catch { return false; }
}
// La musique s'efface pendant un bruitage d'événement, puis revient.
function baisserMusique(a: HTMLAudioElement) {
  if (!lecteur) return;
  const l = lecteur; l.volume = VOLUME_MUSIQUE / 3;
  const remonter = () => { if (lecteur === l) l.volume = VOLUME_MUSIQUE; };
  a.addEventListener("ended", remonter); setTimeout(remonter, 6000);
}
// Le navigateur bloque l'audio avant le premier geste : on relance la musique voulue au premier clic.
export const relancerMusique = () => { if (musiqueActive && voulu && morceau !== voulu) musique(voulu); };
