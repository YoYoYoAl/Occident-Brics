// Phase de guerre jouée (choix de l'utilisateur, 2 novembre 2026) : théâtre d'opérations à 3 objectifs et cartes de commandement
// (proposition 1), avec négociation (4), front intérieur (6), généraux (7) et diplomatie de guerre (10).
// Mécanique propre (demande : « ne pas trop copier Mémoire 44 ») : pas de cases, de secteurs ni de dés. Chaque saison, les deux
// états-majors engagent en secret des cartes payées en logistique sur 3 objectifs nommés, le ciel (supériorité aérienne) ou
// l'information (renseignement et communications). Chaque objectif se résout par la loi du carré (probabilité p² / (p² + q²),
// affichée en %). Les cartes perdues sortent du paquet : l'attrition se voit.
// Le paquet dépend de l'armée (scores Terrestre, Aérien, Naval, Cyber, Spatial du pays, qui évoluent avec sa force militaire),
// du général (2 cartes de son trait) et du budget de guerre engagé (logistique et cartes avancées).
// Toutes les valeurs sont des estimations, à calibrer. Le hasard de combat passe par le générateur de la partie (tirer).
import type { EtatV2, Camp } from "./moteur";
import * as M from "./moteur";
import * as CR from "./crises";
import scores from "../data/scores2000.json";

export const SANS_LITTORAL = ["ETH", "RWA", "ARM", "AZE", "AFG", "KGZ", "TJK", "UGA", "SSD", "BDI", "MLI", "NER", "TCD", "CAF", "ZMB", "ZWE", "BWA", "LSO", "SWZ", "MWI", "BFA", "LAO", "MNG", "NPL", "BTN", "KAZ", "UZB", "TKM", "BLR", "MDA", "SRB", "HUN", "AUT", "CHE", "CZE", "SVK", "MKD", "BOL", "PRY", "LIE", "AND", "SMR", "LUX", "XKX"];
export const NUCLEAIRES = (annee: number) => ["USA", "CHN", "RUS", "GBR", "FRA", "IND", "PAK", "ISR", ...(annee >= 2006 ? ["PRK"] : [])];
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const adv = (cote: "a" | "b") => (cote === "a" ? "b" : "a") as "a" | "b";
const sg = (cote: "a" | "b") => (cote === "a" ? 1 : -1);
export const SAISONS = ["Printemps", "Été", "Automne", "Hiver"];

// ---------- Profil d'armée (scores 2000 × évolution de la force militaire) ----------
const SC = (scores as any).pays as Record<string, { scores: Record<string, number> }>;
export type Domaine = "terre" | "air" | "mer" | "cyber" | "info" | "espace";
export function profilArmee(e: EtatV2, iso: string): Record<"terre" | "air" | "mer" | "cyber" | "espace", number> {
  const s = SC[iso]?.scores ?? {}, m0 = ["Terrestre", "Naval", "Aérien", "Cyber", "Nucléaire"].reduce((t, k) => t + (s[k] ?? 0), 0) / 5;
  const k = Math.max(0.2, Math.min(3, (e.pays[iso]?.militaire ?? m0) / Math.max(1, m0))); // la composition suit la force actuelle
  const v = (x: string) => Math.min(100, (s[x] ?? 0) * k);
  return { terre: Math.max(10, v("Terrestre")), air: v("Aérien"), mer: SANS_LITTORAL.includes(iso) ? 0 : v("Naval"), cyber: v("Cyber"), espace: v("Spatial") };
}

// ---------- Cartes de commandement ----------
export type Cible = "objectif" | "ciel" | "mer" | "info" | "logistique";
export type TypeCarte = "infanterie" | "mecanisee" | "robots" | "blindes" | "artillerie" | "helico" | "drones" | "chasseurs" | "bombardiers" | "corvettes" | "destroyers" | "croiseurs" | "sousmarins" | "porteavions"
  | "brouillage" | "sabotage" | "reconnaissance" | "ecoute" | "satellite" | "asat" | "missiles" | "rodeuses" | "guerre_elec" | "imagerie"
  | "coup_de_poing" | "defense_elastique" | "pont_logistique" | "raid_nocturne" | "debarquement" | "black_out" | "volontaires";
export interface CarteCmd { id: string; type: TypeCarte; nom: string; aide: string; domaine: Domaine; cout: number; puissance: number; cible: Cible; origine: "armee" | "general" | "budget" | "allie"; de?: string }
type Def = Omit<CarteCmd, "id" | "type" | "origine">;
const D = (nom: string, domaine: Domaine, cout: number, puissance: number, cible: Cible, aide: string): Def => ({ nom, domaine, cout, puissance, cible, aide });
export const CARTES: Record<TypeCarte, Def> = {
  infanterie: D("Infanterie", "terre", 1, 3, "objectif", "Prend et tient le terrain."),
  mecanisee: D("Infanterie mécanisée", "terre", 2, 4, "objectif", "Rapide et protégée : moins sensible au ciel adverse."),
  robots: D("Robots terrestres", "terre", 2, 4, "objectif", "Dès 2022, armées avancées : leur perte ne compte pas comme une perte humaine."),
  blindes: D("Percée blindée", "terre", 3, 6, "objectif", "Très forte en plaine, freinée sur les hauteurs (×0,6)."),
  artillerie: D("Barrage d'artillerie", "terre", 2, 4, "objectif", "Appui sûr, peu sensible au ciel."),
  helico: D("Assaut héliporté", "air", 2, 4, "objectif", "Ignore le relief ; vulnérable si l'ennemi tient le ciel."),
  drones: D("Essaim de drones", "air", 1, 3, "objectif", "Bon marché, ne dépend pas du ciel."),
  chasseurs: D("Patrouille de chasse", "air", 2, 3, "ciel", "Dispute la supériorité aérienne."),
  bombardiers: D("Frappe en profondeur", "air", 3, 6, "objectif", "Dévastatrice si tu tiens le ciel, divisée par 2 s'il est à l'ennemi."),
  corvettes: D("Corvettes", "mer", 1, 2, "mer", "Patrouille côtière : dispute la maîtrise de la mer."),
  destroyers: D("Destroyers", "mer", 2, 4, "mer", "Escorte et lutte antinavire : dispute la maîtrise de la mer."),
  croiseurs: D("Croiseur lance-missiles", "mer", 3, 5, "objectif", "Frappe la terre : pleine puissance sur un port, moitié ailleurs."),
  sousmarins: D("Sous-marins", "mer", 2, 4, "mer", "Dispute la mer et impose un blocus : l'ennemi perd 1 logistique la saison suivante."),
  porteavions: D("Groupe aéronaval", "mer", 3, 5, "ciel", "Pèse dans le ciel, et pour moitié dans la bataille navale."),
  brouillage: D("Brouillage", "cyber", 1, 2, "info", "Coupe les communications adverses."),
  sabotage: D("Sabotage logistique", "cyber", 2, 2, "logistique", "L'ennemi perd 2 logistique la saison suivante."),
  reconnaissance: D("Reconnaissance", "info", 1, 2, "info", "Renseignement de terrain."),
  ecoute: D("Écoutes et décryptage", "info", 1, 3, "info", "Lit les ordres adverses."),
  satellite: D("Satellite d'observation", "espace", 2, 5, "info", "Rare : voit tout le théâtre."),
  asat: D("Arme antisatellite", "espace", 3, 4, "info", "Rare : aveugle l'adversaire et annule ses satellites de la saison."),
  missiles: D("Missiles de croisière", "air", 2, 5, "objectif", "Achetés avec le budget ; ignorent le ciel."),
  rodeuses: D("Munitions rôdeuses", "air", 1, 3, "objectif", "Achetées avec le budget (dès 2010)."),
  guerre_elec: D("Guerre électronique", "cyber", 1, 3, "ciel", "Achetée avec le budget : aveugle les radars adverses."),
  imagerie: D("Imagerie commerciale", "info", 1, 2, "info", "Achetée avec le budget, pour qui n'a pas de satellite."),
  coup_de_poing: D("Coup de poing", "terre", 2, 5, "objectif", "Général audacieux : une victoire fait gagner 2 crans."),
  defense_elastique: D("Défense élastique", "terre", 1, 4, "objectif", "Général prudent : ×1,5 sur un objectif que tu tiens."),
  pont_logistique: D("Pont logistique", "terre", 0, 3, "logistique", "Général logisticien : +3 logistique tout de suite."),
  raid_nocturne: D("Raid nocturne", "air", 2, 5, "objectif", "Général aviateur : ignore le ciel."),
  debarquement: D("Débarquement", "mer", 3, 6, "objectif", "Amiral : pleine puissance sur un port, moitié ailleurs."),
  black_out: D("Black-out", "cyber", 2, 4, "info", "Cybernéticien : renseignement et l'ennemi perd 1 logistique."),
  volontaires: D("Volontaires", "terre", 0, 2, "objectif", "Général populaire : gratuite."),
};
export type TraitGeneral = "audacieux" | "prudent" | "logisticien" | "aviateur" | "amiral" | "cyber" | "populaire";
export const TRAITS_GENERAL: Record<TraitGeneral, string> = {
  audacieux: "Audacieux : blindés ×1,2, 2 cartes « Coup de poing », mais lassitude +5 par an.",
  prudent: "Prudent : défense ×1,5 au lieu de ×1,2, 2 cartes « Défense élastique ».",
  logisticien: "Logisticien : +1 logistique par saison, 2 cartes « Pont logistique ».",
  aviateur: "Aviateur : cartes aériennes ×1,2, 2 cartes « Raid nocturne ».",
  amiral: "Amiral : cartes navales ×1,2, 2 cartes « Débarquement ».",
  cyber: "Cybernéticien : 2 cartes « Black-out », +1 au départ dans la bataille de l'information.",
  populaire: "Populaire : lassitude −5 par an, 2 cartes « Volontaires » et 2 infanteries de plus.",
};
const CARTES_TRAIT: Record<TraitGeneral, TypeCarte> = { audacieux: "coup_de_poing", prudent: "defense_elastique", logisticien: "pont_logistique", aviateur: "raid_nocturne", amiral: "debarquement", cyber: "black_out", populaire: "volontaires" };
export interface General { nom: string; trait: TraitGeneral; portrait: string }
const PRENOMS = ["Adrian", "Selma", "Victor", "Nadia", "Ruben", "Ilse", "Tomas", "Mara", "Elias", "Ines", "Karel", "Lena"];
const NOMS = ["Varenne", "Holt", "Mercado", "Sorel", "Brandt", "Kessane", "Oduya", "Laskin", "Dravec", "Moreau-Lind", "Tanaro", "Weissel"];
const PORTRAITS: Record<Camp, number[]> = { OCC: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], CHN: [1, 2, 3, 4, 5, 6, 7, 10, 12] };
// Trois candidats par guerre, tirés d'un hachage (pas du générateur de la partie) : jamais deux fois le même nom ni le même portrait.
export function candidatsGeneraux(g: CR.Guerre, camp: Camp): General[] {
  const h = hash(g.id + camp), traits = Object.keys(TRAITS_GENERAL) as TraitGeneral[], P = PORTRAITS[camp];
  return [0, 1, 2].map(i => ({ nom: `${PRENOMS[(h + 5 * i) % PRENOMS.length]} ${NOMS[((h >>> 3) + i) % NOMS.length]}`, trait: traits[(h + 3 * i) % traits.length], portrait: `general_${camp.toLowerCase()}_${P[(h + i) % P.length]}` }));
}
// Budget de guerre : chaque tranche (1 unité du budget du camp) donne +1 logistique par saison et 1 carte avancée.
export const BUDGET_GUERRE = { max: 3, logistique: 1 };
export function engagerBudget(e: EtatV2, camp: Camp, n: number) { const k = Math.max(0, Math.min(n, BUDGET_GUERRE.max, e.budget[camp] - e.boostsUtilises[camp])); e.boostsUtilises[camp] += k; return k; }
// Nombre d'exemplaires d'une carte selon la puissance du domaine (0-100) : 1 dès le seuil, puis 1 par tranche de 25 points, 4 au plus.
const exemplaires = (v: number, seuil: number) => (v < seuil ? 0 : Math.min(4, 1 + Math.floor((v - seuil) / 25)));
export function paquetArmee(e: EtatV2, iso: string, cote: "a" | "b", gen?: General, tranches = 0, volontaires = 0): CarteCmd[] {
  const p = profilArmee(e, iso), an = e.annee, l: CarteCmd[] = []; let k = 0;
  const c = (type: TypeCarte, n: number, origine: CarteCmd["origine"] = "armee") => { for (let i = 0; i < n; i++) l.push({ id: `${cote}${k++}`, type, origine, ...CARTES[type] }); };
  c("infanterie", 3 + exemplaires(p.terre, 20) + volontaires + (gen?.trait === "populaire" ? 2 : 0)); c("mecanisee", exemplaires(p.terre, 35)); c("robots", an >= 2022 && p.cyber >= 60 ? Math.min(3, exemplaires(p.terre, 60)) : 0); c("blindes", exemplaires(p.terre, 30)); c("artillerie", exemplaires(p.terre, 25));
  c("helico", exemplaires(p.air, 8)); c("drones", an >= 2008 ? exemplaires(Math.max(p.air, p.cyber / 2), 10) : exemplaires(p.air, 70)); c("chasseurs", exemplaires(p.air, 12)); c("bombardiers", exemplaires(p.air, 50));
  c("corvettes", Math.min(2, exemplaires(p.mer, 3))); c("destroyers", exemplaires(p.mer, 15)); c("croiseurs", Math.min(2, exemplaires(p.mer, 40))); c("sousmarins", Math.min(3, exemplaires(p.mer, 20))); c("porteavions", Math.min(2, exemplaires(p.mer, 60)));
  c("brouillage", Math.min(2, exemplaires(p.cyber, 20))); c("sabotage", Math.min(2, exemplaires(p.cyber, 50)));
  c("reconnaissance", 1); c("ecoute", Math.min(2, exemplaires(Math.max(p.cyber, p.espace), 40)));
  c("satellite", p.espace >= 40 ? 1 : 0); c("asat", p.espace >= 80 && an >= 2007 ? 1 : 0); // le spatial reste rare : 1 exemplaire au plus
  if (gen) c(CARTES_TRAIT[gen.trait], 2, "general");
  const avancees: TypeCarte[] = ["missiles", an >= 2010 ? "rodeuses" : "missiles", p.espace >= 40 ? "guerre_elec" : "imagerie"];
  for (let i = 0; i < tranches; i++) c(avancees[i % 3], 1, "budget");
  c("infanterie", Math.max(0, BATAILLE.paquetMin - l.length)); // paquet minimal : conscrits et milices
  return l;
}

// ---------- État d'une bataille ----------
export interface Objectif { nom: string; genre: "corridor" | "ville" | "port" | "hauteurs"; controle: number } // −3 (tenu par b) à +3 (tenu par a)
export interface Ordre { carte: CarteCmd; objectif?: number }
export interface Forces { iso: string; projection: number; baseAlliee?: string; pioche: CarteCmd[]; main: CarteCmd[]; defausse: CarteCmd[]; perdues: CarteCmd[]; plan: Ordre[]; ordres: number; logistique: number; base: number; malus: number; tranches: number; general?: General }
export interface Resolution { objectif: number; pA: number; pB: number; proba: number; gagnant?: "a" | "b"; crans: number }
export interface Bataille { guerre: string; annee: number; saison: number; saisons: number; objectifs: Objectif[]; ciel: number; mer: number; info: number; a: Forces; b: Forces; joueur: "a" | "b"; journal: string[]; finie?: boolean; nucleaire?: { menace?: "a" | "b"; tactique?: "a" | "b"; strategique?: "a" | "b" }; dernieres?: Resolution[] }
export const BATAILLE = { saisons: 4, main: 5, paquetMin: 10, ordres: 3, ordresGrande: 4, seuilGrande: 50, ordresCoupes: 2, logistique: 2, logistiqueTaille: 15, controleMax: 3, jauge: 3, defense: 1.2, defensePrudent: 1.5, cielTerre: 0.1, cielAir: 0.25, infoBonus: 0.1, menace: 1.15, trait: 1.2, hauteursBlindes: 0.6, merPort: 0.2, blocus: 2, horsPort: 0.5, perteVaincu: 0.6, perteVainqueur: 0.2, ecrasant: 2, cran: 3, poidsPertes: 1 };
function melangerDet<T>(l: T[], graine: number) { const r = l.slice(); let x = graine; for (let i = r.length - 1; i > 0; i--) { x = (Math.imul(x, 1103515245) + 12345) >>> 0; const j = x % (i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; }
const piocher = (b: Bataille, f: Forces) => { while (f.main.length < BATAILLE.main) { if (!f.pioche.length) { if (!f.defausse.length) return; f.pioche = melangerDet(f.defausse, hash(b.guerre) + b.saison); f.defausse = []; } f.main.push(f.pioche.shift()!); } };
const borneJ = (x: number) => Math.max(-BATAILLE.jauge, Math.min(BATAILLE.jauge, x));
// Jauges vues d'un côté : positif = avantage de ce côté.
export const ciel = (b: Bataille, cote: "a" | "b") => b.ciel * sg(cote);
export const info = (b: Bataille, cote: "a" | "b") => b.info * sg(cote);
export const mer = (b: Bataille, cote: "a" | "b") => b.mer * sg(cote);
export const voitPlanAdverse = (b: Bataille, cote: "a" | "b") => info(b, cote) >= 2; // renseignement : l'ordre adverse est révélé
// Taille de l'armée (moyenne terre, air, mer) : elle fixe la logistique (2 + 1 par tranche de 15) et le nombre d'ordres (4 dès 50).
export const tailleArmee = (e: EtatV2, iso: string) => { const p = profilArmee(e, iso); return (p.terre + p.air + p.mer) / 3; };
export const ordresMax = (b: Bataille, cote: "a" | "b") => (info(b, cote) <= -2 ? BATAILLE.ordresCoupes : b[cote].ordres); // communications coupées

export interface OptionsBataille { general?: General; tranches?: number; tranchesIA?: number; bonus?: Partial<Record<"a" | "b", { infanterie?: number; logistique?: number }>> }
export function preparerBataille(e: EtatV2, g: CR.Guerre, joueur: "a" | "b", o: OptionsBataille = {}): Bataille {
  const h = hash(g.id), littoral = !SANS_LITTORAL.includes(g.a) || !SANS_LITTORAL.includes(g.b);
  const net = (g.occ?.a ?? 0) - (g.occ?.b ?? 0), depart = Math.round(Math.max(-2, Math.min(2, net / 25)));
  const objectifs: Objectif[] = [{ nom: "Le corridor frontalier", genre: "corridor", controle: depart }, { nom: g.region && g.region !== "la région frontalière" ? g.region : "La ville-clé", genre: "ville", controle: depart },
    littoral ? { nom: "Le port", genre: "port", controle: depart } : { nom: "Les hauteurs", genre: "hauteurs", controle: depart }];
  const forces = (cote: "a" | "b"): Forces => { const iso = cote === "a" ? g.a : g.b, gen = cote === joueur ? o.general : undefined, tr = cote === joueur ? o.tranches ?? 0 : o.tranchesIA ?? 0;
    const base0 = baseAlliee(e, iso, g), proj = cote === "a" ? Math.min(1, projection(e, iso, g.b) + (base0 && projection(e, iso, g.b) < 1 ? BASE.projection : 0)) : 1, p = melangerDet([...projeter(paquetArmee(e, iso, cote, gen, tr, o.bonus?.[cote]?.infanterie ?? 0), proj), ...renforts(e, g, cote)], h + (cote === "a" ? 1 : 2));
    const taille = tailleArmee(e, iso), base = BATAILLE.logistique + Math.round(taille / BATAILLE.logistiqueTaille) + tr * BUDGET_GUERRE.logistique + (gen?.trait === "logisticien" ? 1 : 0) + (o.bonus?.[cote]?.logistique ?? 0) + (base0 ? BASE.logistique : 0);
    return { iso, projection: proj, baseAlliee: base0 ?? undefined, pioche: p, main: [], defausse: [], perdues: [], plan: [], ordres: taille >= BATAILLE.seuilGrande ? BATAILLE.ordresGrande : BATAILLE.ordres, logistique: base, base, malus: 0, tranches: tr, general: gen }; };
  const pa = profilArmee(e, g.a), pb = profilArmee(e, g.b), j = (x: number) => Math.round(Math.max(-2, Math.min(2, x / 30)));
  const b: Bataille = { guerre: g.id, annee: e.annee, saison: 1, saisons: BATAILLE.saisons, objectifs, ciel: j(pa.air - pb.air), mer: j(pa.mer - pb.mer), info: j((pa.cyber + pa.espace - pb.cyber - pb.espace) / 2), a: forces("a"), b: forces("b"), joueur, journal: [] };
  if (o.general?.trait === "cyber") b.info = borneJ(b.info + sg(joueur));
  piocher(b, b.a); piocher(b, b.b);
  return b;
}
// Capacité de projection (attaquant seulement, la guerre se livre chez le défenseur) : 100 % dans sa zone ; ailleurs 30 % + 40 % × marine + 30 % × aviation (sur 100), plafonnée à 100 %.
// Les cartes non projetées restent au pays, les plus lourdes d'abord (blindés, artillerie, mécanisée), au moins 6 cartes engagées.
export const PROJECTION = { base: 0.3, mer: 0.4, air: 0.3, minimum: 6, lourdes: ["blindes", "artillerie", "robots", "mecanisee", "croiseurs", "infanterie"] as TypeCarte[], blocusPib: -1 };
export function projection(e: EtatV2, iso: string, cible: string) {
  if (e.pays[iso]?.zone === e.pays[cible]?.zone) return 1;
  const p = profilArmee(e, iso); return Math.min(1, PROJECTION.base + PROJECTION.mer * p.mer / 100 + PROJECTION.air * p.air / 100);
}
// Base alliée : un pays de la zone du front (hors belligérants) dont la relation avec toi est ≥ 50. Elle donne +1 logistique
// par saison et, pour l'attaquant, +30 points de projection (estimation). On retient le meilleur allié.
export const BASE = { relation: 50, logistique: 1, projection: 0.3 };
export function baseAlliee(e: EtatV2, iso: string, g: CR.Guerre): string | null {
  const zone = e.pays[g.b]?.zone; let best: string | null = null, r0 = BASE.relation - 1;
  for (const p of Object.values(e.pays)) if (p.zone === zone && p.iso !== g.a && p.iso !== g.b) { const r = M.relation(e, iso, p.iso); if (r > r0) { r0 = r; best = p.iso; } }
  return best;
}
function projeter(l: CarteCmd[], proj: number) {
  let n = Math.min(l.length - PROJECTION.minimum, Math.round((1 - proj) * l.length)); if (n <= 0) return l;
  const r = l.slice();
  for (const ty of PROJECTION.lourdes) for (let i = r.length - 1; i >= 0 && n > 0; i--) if (r[i].type === ty && r[i].origine === "armee") { r.splice(i, 1); n--; }
  return r;
}
// Guerres sans le joueur : simulées en arrière-plan avec le même moteur, l'IA commande les deux camps (sans armes de destruction
// massive). Les alliés et garants envoient des renforts (voir renforts) ; chaque camp engage son budget de guerre selon ses moyens.
export function batailleAuto(e: EtatV2, g: CR.Guerre): number {
  const ca = campDuPays(e.pays[g.a]), cb = campDuPays(e.pays[g.b]);
  const b = preparerBataille(e, g, "a", { tranches: 0, tranchesIA: 0, bonus: { a: { logistique: ca !== cb ? tranchesIA(e, ca) : 0 }, b: { logistique: ca !== cb ? tranchesIA(e, cb) : 0 } } });
  while (!b.finie) { planIA(b, "a"); planIA(b, "b"); resoudreSaison(e, b); }
  return resultat(b).d;
}
// Renforts : les alliés engagés envoient 50 % de leur paquet, le leader garant 12 % (mêmes poids que la résolution automatique),
// multipliés par leur capacité de projection. Ils envoient d'abord air, mer, cyber, renseignement et spatial, puis des troupes.
export const RENFORTS = { allie: 0.5, garant: 0.12, ordre: ["air", "mer", "cyber", "info", "espace", "terre"] as Domaine[] };
export function soutiens(e: EtatV2, g: CR.Guerre, cote: "a" | "b"): { iso: string; part: number }[] {
  const iso = cote === "a" ? g.a : g.b, l = (g.allies?.[iso] ?? []).filter(i => e.pays[i]).map(i => ({ iso: i, part: RENFORTS.allie }));
  for (const c of ["OCC", "CHN"] as Camp[]) if (g.garants?.[c] === iso && e.pays[M.LEADER[c]] && M.LEADER[c] !== g.a && M.LEADER[c] !== g.b) l.push({ iso: M.LEADER[c], part: RENFORTS.garant });
  return l;
}
export function renforts(e: EtatV2, g: CR.Guerre, cote: "a" | "b"): CarteCmd[] {
  const r: CarteCmd[] = [];
  for (const s of soutiens(e, g, cote)) { const l = paquetArmee(e, s.iso, cote).filter(c => c.origine === "armee"), n = Math.round(s.part * projection(e, s.iso, g.b) * l.length);
    const tri = l.sort((x, y) => RENFORTS.ordre.indexOf(x.domaine) - RENFORTS.ordre.indexOf(y.domaine) || y.puissance - x.puissance);
    r.push(...tri.slice(0, n).map((c, k) => ({ ...c, id: `${cote}r${s.iso}${k}`, origine: "allie" as const, de: s.iso }))); }
  return r;
}
// IA : budget de guerre selon le budget libre de son camp (0 à 2 tranches).
export const tranchesIA = (e: EtatV2, camp: Camp) => Math.max(0, Math.min(2, Math.floor((e.budget[camp] - e.boostsUtilises[camp]) / 3)));

// ---------- Ordres de la saison ----------
export function planifier(b: Bataille, cote: "a" | "b", idCarte: string, objectif?: number): string | null {
  const f = b[cote], i = f.main.findIndex(x => x.id === idCarte); if (i < 0 || b.finie) return "Carte introuvable.";
  const c = f.main[i];
  if (f.plan.length >= ordresMax(b, cote)) return `Au plus ${ordresMax(b, cote)} ordres cette saison${ordresMax(b, cote) < BATAILLE.ordres ? " (communications coupées)" : ""}.`;
  if (c.cout > f.logistique) return `Logistique insuffisante (${f.logistique} pour un coût de ${c.cout}).`;
  if (c.cible === "objectif" && (objectif === undefined || !b.objectifs[objectif])) return "Choisis un objectif.";
  f.main.splice(i, 1); f.logistique -= c.cout; f.plan.push({ carte: c, objectif: c.cible === "objectif" ? objectif : undefined });
  if (c.type === "pont_logistique") f.logistique += 3;
  return null;
}
export function annulerOrdre(b: Bataille, cote: "a" | "b", idCarte: string) {
  const f = b[cote], i = f.plan.findIndex(o => o.carte.id === idCarte); if (i < 0) return;
  const [o] = f.plan.splice(i, 1); f.logistique += o.carte.cout - (o.carte.type === "pont_logistique" ? 3 : 0); f.main.push(o.carte);
}
// Puissance d'une carte engagée sur un objectif, avec tous ses modificateurs (affichés au joueur).
export function puissanceCarte(b: Bataille, cote: "a" | "b", c: CarteCmd, obj: Objectif) {
  const f = b[cote], cl = ciel(b, cote), t = f.general?.trait; let p = c.puissance;
  if (c.domaine === "terre") p *= 1 + BATAILLE.cielTerre * (c.type === "mecanisee" ? Math.max(0, cl) : cl);
  if (c.type === "helico" || c.type === "bombardiers") p *= Math.max(0.25, 1 + BATAILLE.cielAir * cl);
  if (c.type === "bombardiers" && cl < 0) p *= 0.5;
  if (c.type === "blindes" && obj.genre === "hauteurs") p *= BATAILLE.hauteursBlindes;
  if ((c.type === "croiseurs" || c.type === "debarquement") && obj.genre !== "port") p *= BATAILLE.horsPort;
  if (c.type === "debarquement" && mer(b, cote) < 1) p *= BATAILLE.horsPort; // débarquer exige la maîtrise de la mer
  if (obj.genre === "port") p *= Math.max(0.25, 1 + BATAILLE.merPort * mer(b, cote));
  const tient = obj.controle * sg(cote) > 0;
  if (tient) p *= c.type === "defense_elastique" || t === "prudent" ? BATAILLE.defensePrudent : BATAILLE.defense;
  if ((t === "audacieux" && c.type === "blindes") || (t === "aviateur" && c.domaine === "air") || (t === "amiral" && c.domaine === "mer")) p *= BATAILLE.trait;
  const inf = info(b, cote); if (inf >= 2) p *= 1 + BATAILLE.infoBonus; else if (inf <= -2) p *= 1 - BATAILLE.infoBonus;
  if (b.nucleaire?.menace === cote) p *= BATAILLE.menace;
  return p;
}
export const probaVictoire = (p: number, q: number) => (p + q <= 0 ? 0.5 : (p * p) / (p * p + q * q)); // loi du carré (Lanchester)
const somme = (b: Bataille, cote: "a" | "b", cible: Cible, objectif?: number) => b[cote].plan.filter(o => o.carte.cible === cible && (objectif === undefined || o.objectif === objectif))
  .reduce((s, o) => s + (cible === "objectif" ? puissanceCarte(b, cote, o.carte, b.objectifs[o.objectif!]) : o.carte.puissance), 0)
  + (cible === "mer" ? b[cote].plan.filter(o => o.carte.type === "porteavions").reduce((s, o) => s + o.carte.puissance / 2, 0) : 0); // le porte-avions compte pour moitié en mer
// Aperçu pour le joueur : sa puissance sur chaque objectif, et celle de l'adversaire seulement si son plan est révélé.
export function apercu(b: Bataille, cote: "a" | "b") {
  const voit = voitPlanAdverse(b, cote);
  return b.objectifs.map((o, i) => { const moi = somme(b, cote, "objectif", i), lui = voit ? somme(b, adv(cote), "objectif", i) : undefined; return { objectif: o.nom, moi, lui, proba: lui === undefined ? undefined : probaVictoire(moi, lui) }; });
}

// IA : d'abord le ciel et l'information s'ils sont perdus, puis concentration sur l'objectif le plus disputé.
export function planIA(b: Bataille, cote: "a" | "b") {
  const f = b[cote], cible = () => { let best = 0, w = -99; b.objectifs.forEach((o, i) => { const c = o.controle * sg(cote), v = 3 - Math.abs(c) + (c < 0 ? 1 : 0) + (c === 0 ? 0.5 : 0); if (v > w) { w = v; best = i; } }); return best; };
  const tri = f.main.slice().sort((x, y) => y.puissance / Math.max(1, y.cout) - x.puissance / Math.max(1, x.cout));
  for (const c of tri.filter(x => x.type === "pont_logistique")) planifier(b, cote, c.id);
  // Le ciel ne se dispute que si l'adversaire a une aviation (ou le tient déjà) ; l'information seulement s'il reste de quoi frapper au sol.
  const airAdverse = [...b[adv(cote)].pioche, ...b[adv(cote)].main, ...b[adv(cote)].defausse].filter(x => x.domaine === "air" || x.cible === "ciel").length;
  if (ciel(b, cote) < 0 || (ciel(b, cote) === 0 && airAdverse >= 2)) { const c = tri.find(x => x.cible === "ciel" && x.cout <= f.logistique - 1); if (c) planifier(b, cote, c.id); }
  const merAdverse = [...b[adv(cote)].pioche, ...b[adv(cote)].main, ...b[adv(cote)].defausse].filter(x => x.cible === "mer").length;
  if (mer(b, cote) < 0 || (mer(b, cote) < 2 && merAdverse >= 1)) { const c = tri.find(x => x.cible === "mer" && x.cout <= f.logistique - 1); if (c) planifier(b, cote, c.id); }
  if (info(b, cote) < 0 || (info(b, cote) < 2 && f.logistique >= 4)) { const c = tri.find(x => x.cible === "info" && x.cout <= f.logistique - 2 && f.plan.length < ordresMax(b, cote) - 1); if (c) planifier(b, cote, c.id); }
  for (const c of tri.filter(x => x.cible === "objectif")) if (c.cout <= f.logistique && f.plan.length < ordresMax(b, cote) && f.main.includes(c)) planifier(b, cote, c.id, cible());
  for (const c of tri.filter(x => x.cible === "logistique")) if (c.cout <= f.logistique && f.plan.length < ordresMax(b, cote) && f.main.includes(c)) planifier(b, cote, c.id);
}

// ---------- Résolution d'une saison (ordres simultanés) ----------
function perdre(b: Bataille, cote: "a" | "b", c: CarteCmd) { const f = b[cote]; f.plan = f.plan.filter(o => o.carte !== c); f.perdues.push(c); }
export function resoudreSaison(e: EtatV2, b: Bataille) {
  if (b.finie) return;
  const l = b.journal, S = SAISONS[(b.saison - 1) % 4];
  // 1. Espace : un tir antisatellite annule les satellites adverses de la saison.
  for (const cote of ["a", "b"] as const) if (b[cote].plan.some(o => o.carte.type === "asat")) for (const o of b[adv(cote)].plan.filter(o => o.carte.type === "satellite")) { b[adv(cote)].plan = b[adv(cote)].plan.filter(x => x !== o); b[adv(cote)].defausse.push(o.carte); l.push(`${S} : satellite de ${b[adv(cote)].iso} aveuglé par un tir antisatellite.`); }
  // 2. Ciel et information : la jauge bouge d'1 cran si l'écart dépasse 2, de 2 s'il dépasse 6.
  const pas = (d: number) => Math.sign(d) * (Math.abs(d) >= 6 ? 2 : Math.abs(d) >= 2 ? 1 : 0);
  const dm = pas(somme(b, "a", "mer") - somme(b, "b", "mer"));
  if (dm) { b.mer = borneJ(b.mer + dm); l.push(`${S} : bataille navale, ${dm * sg(b.joueur) > 0 ? "ta flotte l'emporte" : "ta flotte recule"} (maîtrise de la mer ${mer(b, b.joueur) > 0 ? "+" : ""}${mer(b, b.joueur)}).`); }
  for (const cote of ["a", "b"] as const) if (mer(b, cote) >= BATAILLE.blocus) b[adv(cote)].malus += 1; // blocus du vainqueur sur mer
  const dc = pas(somme(b, "a", "ciel") - somme(b, "b", "ciel")), di = pas(somme(b, "a", "info") - somme(b, "b", "info"));
  if (dc) { b.ciel = borneJ(b.ciel + dc); l.push(`${S} : ${dc * sg(b.joueur) > 0 ? "tu gagnes" : "tu perds"} du terrain dans le ciel (supériorité aérienne ${ciel(b, b.joueur) > 0 ? "+" : ""}${ciel(b, b.joueur)}).`); }
  if (di) { b.info = borneJ(b.info + di); l.push(`${S} : ${di * sg(b.joueur) > 0 ? "ton renseignement prend l'avantage" : "l'adversaire prend l'avantage du renseignement"} (information ${info(b, b.joueur) > 0 ? "+" : ""}${info(b, b.joueur)}).`); }
  // 3. Logistique adverse : blocus, sabotage, black-out (effet à la saison suivante).
  for (const cote of ["a", "b"] as const) for (const o of b[cote].plan) { const m = o.carte.type === "sousmarins" ? 1 : o.carte.type === "sabotage" ? 2 : o.carte.type === "black_out" ? 1 : 0;
    if (m) { b[adv(cote)].malus += m; l.push(`${S} : ${o.carte.nom} de ${b[cote].iso} : ${b[adv(cote)].iso} perd ${m} logistique à la saison suivante.`); } }
  // 4. Objectifs : loi du carré, puis pertes (la carte la plus chère du vaincu sort du paquet avec 60 % de chance, celle du vainqueur avec 20 %).
  b.dernieres = [];
  b.objectifs.forEach((obj, i) => {
    const pA = somme(b, "a", "objectif", i), pB = somme(b, "b", "objectif", i); if (pA + pB <= 0) return;
    const pr = probaVictoire(pA, pB), gagnant: "a" | "b" = M.tirer(e) < pr ? "a" : "b", pv = gagnant === "a" ? pA : pB, pp = gagnant === "a" ? pB : pA;
    const poing = b[gagnant].plan.some(o => o.objectif === i && o.carte.type === "coup_de_poing");
    const crans = pv >= BATAILLE.ecrasant * pp || poing ? 2 : 1;
    obj.controle = Math.max(-BATAILLE.controleMax, Math.min(BATAILLE.controleMax, obj.controle + crans * sg(gagnant)));
    b.dernieres!.push({ objectif: i, pA, pB, proba: pr, gagnant, crans });
    for (const [cote, q] of [[adv(gagnant), BATAILLE.perteVaincu], [gagnant, BATAILLE.perteVainqueur]] as const) {
      const eng = b[cote].plan.filter(o => o.objectif === i).sort((x, y) => y.carte.cout - x.carte.cout)[0];
      if (eng && M.tirer(e) < q) { perdre(b, cote, eng.carte); l.push(`${S} : ${cote === b.joueur ? "tu perds" : "l'adversaire perd"} ${eng.carte.nom.toLowerCase()} (${obj.nom}).`); }
    }
    const [pj, pe] = b.joueur === "a" ? [pA, pB] : [pB, pA];
    l.push(`${S} : ${obj.nom}, ta puissance ${Math.round(pj)} contre ${Math.round(pe)} (${Math.round(100 * (b.joueur === "a" ? pr : 1 - pr))} % de chances) : ${gagnant === b.joueur ? "victoire" : "revers"}${crans > 1 ? " écrasant" : ""}.`);
  });
  // 5. Fin de saison : défausse, logistique de la saison suivante, pioche.
  for (const cote of ["a", "b"] as const) { const f = b[cote]; f.defausse.push(...f.plan.map(o => o.carte)); f.plan = []; f.logistique = Math.max(1, f.base - f.malus); f.malus = 0; piocher(b, f); }
  b.saison++; if (b.saison > b.saisons) b.finie = true;
}
// Retire une part des cartes d'un camp (frappes de destruction massive) : d'abord la pioche, puis la défausse, puis la main.
function detruire(b: Bataille, cote: "a" | "b", part: number, domaines: Domaine[]) {
  const f = b[cote], tas = [f.pioche, f.defausse, f.main], n0 = tas.reduce((s, t) => s + t.filter(c => domaines.includes(c.domaine)).length, 0);
  let n = n0 ? Math.max(1, Math.round(part * n0)) : 0;
  for (const t of tas) for (let i = t.length - 1; i >= 0 && n > 0; i--) if (domaines.includes(t[i].domaine)) { f.perdues.push(...t.splice(i, 1)); n--; }
}

// ---------- Nucléaire : la non-utilisation se joue par la dissuasion et les risques (demandes du 2 novembre 2026) ----------
// Une frappe n'est jamais interdite, mais elle déclenche : riposte de la cible ou de son protecteur nucléaire, frappe préventive
// d'autres puissances hostiles, vaste coalition contre le tireur (attitude et sanctions) et, si les frappes se répètent, crise
// climatique (hiver nucléaire) dont le camp tireur est tenu responsable. Avant de tirer, le joueur voit ces risques chiffrés.
// La frappe stratégique isolée reste un choc très lourd, pas une fin de partie ; seul l'hiver nucléaire (seuil 7) fait perdre le camp responsable.
export const NUCLEAIRE = {
  menaceTension: 2, tactiqueStabTireur: -20, tactiquePibMonde: -3,
  strategique: { pibCible: -25, popCible: -5, stabCible: -40, pibMonde: -8, attitude: -20, stabTireur: -25 },
  hiver: { tactique: 1, strategique: 3, crise: 4, defaite: 7, crisePibMonde: -10, criseStab: -10 }, // jauge d'hiver nucléaire 0-10 (estimation)
  riposte: { tactique: 0.5, strategique: 0.9 },   // probabilité que la cible (ou son protecteur) riposte au même niveau
  preventive: 0.05,                                 // par frappe déjà tirée par ce camp, pour chaque puissance nucléaire hostile
  coalition: { seuilAttitude: 60, attitude: -10, eco: -20, stabLeader: -10, grande: 100 }, // par point d'hiver ajouté
};
const campDuPays = (p: EtatV2["pays"][string]): Camp => (M.partPays(p, "CHN") > M.partPays(p, "OCC") ? "CHN" : "OCC");
export const peutNucleaire = (e: EtatV2, g: CR.Guerre, cote: "a" | "b") => NUCLEAIRES(e.annee).includes(cote === "a" ? g.a : g.b);
// Qui peut riposter pour la cible : la cible elle-même si elle est nucléaire, sinon le leader de son camp (parapluie nucléaire).
export function riposteur(e: EtatV2, g: CR.Guerre, cote: "a" | "b"): string | null {
  const cible = cote === "a" ? g.b : g.a; if (NUCLEAIRES(e.annee).includes(cible)) return cible;
  const prot = M.LEADER[campDuPays(e.pays[cible])]; const tireur = cote === "a" ? g.a : g.b;
  return prot !== tireur && NUCLEAIRES(e.annee).includes(prot) && M.relation(e, prot, cible) >= 40 ? prot : null;
}
// Risques affichés avant de tirer (dissuasion) : tout est calculé, rien n'est caché.
export function risquesNucleaires(e: EtatV2, g: CR.Guerre, cote: "a" | "b", niveau: "tactique" | "strategique") {
  const tireur = e.pays[cote === "a" ? g.a : g.b], campT = campDuPays(tireur), dejaTirees = e.nucleaire?.frappes?.[campT] ?? 0;
  const hostiles = NUCLEAIRES(e.annee).filter(i => i !== tireur.iso && e.pays[i] && campDuPays(e.pays[i]) !== campT);
  const r = riposteur(e, g, cote), hiver = (e.nucleaire?.hiver ?? 0) + NUCLEAIRE.hiver[niveau];
  return { riposte: r ? NUCLEAIRE.riposte[niveau] : 0, riposteur: r, preventive: Math.min(0.9, 1 - Math.pow(1 - NUCLEAIRE.preventive * (dejaTirees + 1), hostiles.length)), hostiles,
    coalition: Object.values(e.pays).filter(p => p.iso !== tireur.iso && p.att[campT] < NUCLEAIRE.coalition.seuilAttitude).length, hiver, crise: hiver >= NUCLEAIRE.hiver.crise, defaite: hiver >= NUCLEAIRE.hiver.defaite };
}
function frappeSur(e: EtatV2, tireurIso: string, cibleIso: string, niveau: "tactique" | "strategique", l: string[]) {
  const tireur = e.pays[tireurIso], cible = e.pays[cibleIso], campT = campDuPays(tireur), S = NUCLEAIRE.strategique;
  if (niveau === "tactique") { tireur.stabilite = M.borne(tireur.stabilite + NUCLEAIRE.tactiqueStabTireur, 0, 100); cible.pib *= 0.9; cible.stabilite = M.borne(cible.stabilite - 15, 0, 100); for (const p of Object.values(e.pays)) p.pib *= 1 + NUCLEAIRE.tactiquePibMonde / 100; }
  else { cible.pib *= 1 + S.pibCible / 100; cible.population *= 1 + S.popCible / 100; cible.stabilite = M.borne(cible.stabilite + S.stabCible, 0, 100); tireur.stabilite = M.borne(tireur.stabilite + S.stabTireur, 0, 100);
    for (const p of Object.values(e.pays)) { p.pib *= 1 + S.pibMonde / 100; if (p.iso !== tireurIso) p.att[campT] = M.borne(p.att[campT] + S.attitude); } }
  e.tension = 10;
  const n = (e.nucleaire ??= { hiver: 0, frappes: {} }); n.hiver = Math.min(10, n.hiver + NUCLEAIRE.hiver[niveau]); n.frappes[campT] = (n.frappes[campT] ?? 0) + 1;
  n.points = { ...(n.points ?? {}), [campT]: (n.points?.[campT] ?? 0) + NUCLEAIRE.hiver[niveau] };
  // Coalition contre le tireur : tous les pays qui ne sont pas ses alliés s'en détournent et le sanctionnent.
  const membres = Object.values(e.pays).filter(p => p.iso !== tireurIso && p.att[campT] < NUCLEAIRE.coalition.seuilAttitude);
  for (const p of membres) { p.att[campT] = M.borne(p.att[campT] + NUCLEAIRE.coalition.attitude * NUCLEAIRE.hiver[niveau]); p.eco[campT] = M.borne(p.eco[campT] + NUCLEAIRE.coalition.eco); }
  if (membres.length >= NUCLEAIRE.coalition.grande) { const L = e.pays[M.LEADER[campT]]; L.stabilite = M.borne(L.stabilite + NUCLEAIRE.coalition.stabLeader, 0, 100); }
  l.push(`${tireur.nom} frappe ${cible.nom} (${niveau === "tactique" ? "arme tactique" : "frappe stratégique"}). Coalition de ${membres.length} pays contre ${M.NOM_CAMP[campT] === "BRICS" ? "les BRICS" : "l'Occident"} : attitude et sanctions. Hiver nucléaire ${n.hiver} sur 10.`);
}
export function nucleaire(e: EtatV2, b: Bataille, g: CR.Guerre, cote: "a" | "b", niveau: "menace" | "tactique" | "strategique", objectif = 1): string {
  if (!peutNucleaire(e, g, cote)) return "Pas de capacité nucléaire.";
  const tireurIso = cote === "a" ? g.a : g.b, cibleIso = cote === "a" ? g.b : g.a, tireur = e.pays[tireurIso];
  b.nucleaire ??= {};
  if (niveau === "menace") { b.nucleaire.menace = cote; e.tension = M.borne(e.tension + NUCLEAIRE.menaceTension, 0, 10); return `${tireur.nom} brandit la menace nucléaire : puissance +15 % sur tous les objectifs cette année, tension +${NUCLEAIRE.menaceTension}.`; }
  const l: string[] = [];
  const obj = b.objectifs[objectif] ?? b.objectifs[1];
  if (niveau === "tactique") { b.nucleaire.tactique = cote; obj.controle = BATAILLE.controleMax * sg(cote); detruire(b, adv(cote), 0.5, ["terre"]); l.push(`Frappe tactique sur ${obj.nom} : l'objectif tombe, la moitié des forces terrestres ennemies est détruite.`); }
  else { b.nucleaire.strategique = cote; for (const o of b.objectifs) o.controle = BATAILLE.controleMax * sg(cote); detruire(b, adv(cote), 0.6, ["terre", "air", "mer", "cyber", "info", "espace"]); }
  frappeSur(e, tireurIso, cibleIso, niveau, l);
  // Riposte de la cible ou de son protecteur, au même niveau.
  const r = riposteur(e, g, cote);
  if (r && M.tirer(e) < NUCLEAIRE.riposte[niveau]) { frappeSur(e, r, tireurIso, niveau, l); l.push(`Riposte de ${e.pays[r].nom}.`); if (niveau === "tactique") { obj.controle = 0; detruire(b, cote, 0.5, ["terre"]); } else detruire(b, cote, 0.6, ["terre", "air", "mer", "cyber", "info", "espace"]); }
  // Frappe préventive d'autres puissances nucléaires hostiles, plus probable à chaque frappe déjà tirée par ce camp.
  const campT = campDuPays(tireur);
  for (const i of NUCLEAIRES(e.annee)) if (i !== tireurIso && i !== r && e.pays[i] && campDuPays(e.pays[i]) !== campT && M.tirer(e) < NUCLEAIRE.preventive * (e.nucleaire!.frappes[campT] ?? 0)) { frappeSur(e, i, tireurIso, "tactique", l); l.push(`Frappe préventive de ${e.pays[i].nom} pour désarmer ${tireur.nom}.`); }
  verifierCatastrophe(e, l); // crise climatique puis hiver nucléaire : le camp qui a le plus tiré est tenu responsable
  return l.join(" ");
}

// ---------- Armes biologiques (même catégorie dangereuse, demande du 2 novembre 2026) ----------
// Un virus ou une bactérie affaiblit toutes les unités ennemies (−1 point de vie), mais l'arme peut échapper à tout contrôle
// (pandémie mondiale qui frappe aussi le tireur) et être attribuée au tireur (coalition et sanctions comme pour le nucléaire).
// Elle alimente la même jauge de catastrophe mondiale : crise à 4, défaite du camp responsable à 7 (estimation).
export const BIO = { fuite: 0.35, attribution: 0.6, jaugeFuite: 2, jaugeContenue: 1, pandemiePibMonde: -4, pandemieStab: -5, pandemiePop: -1, tireurPib: -3 };
export function risquesBio(e: EtatV2, g: CR.Guerre, cote: "a" | "b") {
  const tireur = e.pays[cote === "a" ? g.a : g.b], campT = campDuPays(tireur), hiver = e.nucleaire?.hiver ?? 0;
  return { fuite: BIO.fuite, attribution: BIO.attribution, coalition: Object.values(e.pays).filter(p => p.iso !== tireur.iso && p.att[campT] < NUCLEAIRE.coalition.seuilAttitude).length,
    jauge: hiver + BIO.jaugeFuite, crise: hiver + BIO.jaugeFuite >= NUCLEAIRE.hiver.crise, defaite: hiver + BIO.jaugeFuite >= NUCLEAIRE.hiver.defaite };
}
export function biologique(e: EtatV2, b: Bataille, g: CR.Guerre, cote: "a" | "b"): string {
  const tireurIso = cote === "a" ? g.a : g.b, tireur = e.pays[tireurIso], campT = campDuPays(tireur), l: string[] = [];
  detruire(b, adv(cote), 0.2, ["terre", "air", "mer"]);
  l.push("Arme biologique : un cinquième des forces ennemies est hors de combat.");
  const n = (e.nucleaire ??= { hiver: 0, frappes: {} }), fuite = M.tirer(e) < BIO.fuite, attribuee = M.tirer(e) < BIO.attribution;
  const pts = fuite ? BIO.jaugeFuite : BIO.jaugeContenue; n.hiver = Math.min(10, n.hiver + pts); n.points = { ...(n.points ?? {}), [campT]: (n.points?.[campT] ?? 0) + pts }; n.bio = (n.bio ?? 0) + 1;
  if (fuite) { for (const p of Object.values(e.pays)) { p.pib *= 1 + BIO.pandemiePibMonde / 100; p.population *= 1 + BIO.pandemiePop / 100; p.stabilite = M.borne(p.stabilite + BIO.pandemieStab, 0, 100); } tireur.pib *= 1 + BIO.tireurPib / 100; l.push(`L'agent échappe à tout contrôle : pandémie mondiale (PIB ${BIO.pandemiePibMonde} %, population ${BIO.pandemiePop} %, stabilité ${BIO.pandemieStab} partout ; ${tireur.nom} est touché lui aussi).`); }
  if (attribuee) { const membres = Object.values(e.pays).filter(p => p.iso !== tireurIso && p.att[campT] < NUCLEAIRE.coalition.seuilAttitude);
    for (const p of membres) { p.att[campT] = M.borne(p.att[campT] + NUCLEAIRE.coalition.attitude * pts); p.eco[campT] = M.borne(p.eco[campT] + NUCLEAIRE.coalition.eco); }
    e.tension = M.borne(e.tension + 3, 0, 10); l.push(`L'attaque est attribuée à ${tireur.nom} : coalition de ${membres.length} pays, sanctions, tension +3.`); }
  else l.push("L'origine de l'attaque reste incertaine.");
  l.push(`Jauge de catastrophe mondiale ${n.hiver} sur 10.`);
  verifierCatastrophe(e, l);
  return l.join(" ");
}
// Seuils communs aux armes de destruction massive : crise mondiale à 4, défaite du camp responsable à 7.
export function verifierCatastrophe(e: EtatV2, l: string[]) {
  const n = e.nucleaire; if (!n) return;
  if (n.hiver >= NUCLEAIRE.hiver.crise && !n.crise) { n.crise = true; for (const p of Object.values(e.pays)) { p.pib *= 1 + NUCLEAIRE.hiver.crisePibMonde / 100; p.stabilite = M.borne(p.stabilite + NUCLEAIRE.hiver.criseStab, 0, 100); } l.push(`Crise mondiale : ${n.bio && !n.frappes.OCC && !n.frappes.CHN ? "pandémie hors de contrôle" : "climat refroidi par les retombées, récoltes perdues"} (PIB mondial ${NUCLEAIRE.hiver.crisePibMonde} %, stabilité ${NUCLEAIRE.hiver.criseStab} partout).`); }
  if (n.hiver >= NUCLEAIRE.hiver.defaite && !e.defaite) { const pts = n.points ?? {}; const resp: Camp = (pts.OCC ?? 0) >= (pts.CHN ?? 0) ? "OCC" : "CHN"; e.defaite = { camp: resp, raison: "catastrophe mondiale (armes de destruction massive)" }; l.push(`Catastrophe mondiale : ${resp === "OCC" ? "l'Occident est tenu pour responsable et perd" : "les BRICS sont tenus pour responsables et perdent"} la partie.`); }
}

// ---------- Résultat : contrôle des objectifs et pertes → avancée du front (score de guerre, 3 points par cran) ----------
export function resultat(b: Bataille) {
  const humaines = (f: Forces) => f.perdues.filter(c => c.type !== "robots").length; // les robots perdus ne sont pas des pertes humaines
  const controle = b.objectifs.reduce((s, o) => s + o.controle, 0), pertesA = humaines(b.a), pertesB = humaines(b.b);
  const d = BATAILLE.cran * controle + BATAILLE.poidsPertes * (pertesB - pertesA) + (b.nucleaire?.strategique === "a" ? 100 : b.nucleaire?.strategique === "b" ? -100 : 0);
  return { d, controle, tenusA: b.objectifs.filter(o => o.controle > 0).length, tenusB: b.objectifs.filter(o => o.controle < 0).length, pertesA, pertesB };
}
// Enregistre la bataille jouée : la résolution de fin d'année utilisera ce résultat au lieu du calcul automatique.
export function enregistrer(g: CR.Guerre, b: Bataille, e?: EtatV2) {
  g.batailleJouee = { annee: b.annee, d: resultat(b).d };
  // Blocus tenu en fin d'année (maîtrise de la mer ≥ 2) : le pays bloqué perd 1 % de PIB (estimation).
  if (e) for (const cote of ["a", "b"] as const) if (mer(b, cote) >= BATAILLE.blocus) { const P = e.pays[b[adv(cote)].iso]; if (P) P.pib *= 1 + PROJECTION.blocusPib / 100; b.journal.push(`Blocus maintenu : ${P?.nom ?? b[adv(cote)].iso} perd ${-PROJECTION.blocusPib} % de PIB.`); }
  const t = b[b.joueur].general?.trait, dl = t === "audacieux" ? 5 : t === "populaire" ? -5 : 0; // lassitude due au général (par an)
  if (dl) { g.lassitude ??= { a: 0, b: 0 }; g.lassitude[b.joueur] = Math.max(0, g.lassitude[b.joueur] + dl); }
}

// ---------- Front intérieur (6) ----------
export type ChoixInterieur = { mobiliser: boolean; censurer: boolean; financement: "impots" | "dette" };
export const INTERIEUR = { mobilisation: { inf: 2, stab: -5 }, censure: { lassitude: -10, stab: -3 }, information: { stab: 2 }, impots: { stab: -4, logistique: 1 }, dette: { dette: 4, logistique: 1 } };
export function frontInterieur(e: EtatV2, g: CR.Guerre, cote: "a" | "b", camp: Camp, ch: ChoixInterieur) {
  const P = e.pays[cote === "a" ? g.a : g.b], l: string[] = []; g.lassitude ??= { a: 0, b: 0 };
  if (ch.mobiliser) { P.stabilite = M.borne(P.stabilite + INTERIEUR.mobilisation.stab, 0, 100); l.push(`mobilisation : +${INTERIEUR.mobilisation.inf} cartes d'infanterie, stabilité ${INTERIEUR.mobilisation.stab}`); }
  if (ch.censurer) { g.lassitude[cote] = Math.max(0, g.lassitude[cote] + INTERIEUR.censure.lassitude); P.stabilite = M.borne(P.stabilite + INTERIEUR.censure.stab, 0, 100); l.push(`censure : lassitude ${INTERIEUR.censure.lassitude}, stabilité ${INTERIEUR.censure.stab}`); }
  else { P.stabilite = M.borne(P.stabilite + INTERIEUR.information.stab, 0, 100); l.push(`information : stabilité +${INTERIEUR.information.stab}`); }
  if (ch.financement === "impots") { P.stabilite = M.borne(P.stabilite + INTERIEUR.impots.stab, 0, 100); l.push(`impôts de guerre : +1 logistique par saison, stabilité ${INTERIEUR.impots.stab}`); }
  else { if (e.monnaie) e.monnaie.dette[camp] += INTERIEUR.dette.dette; l.push(`emprunt : +1 logistique par saison, dette du camp +${INTERIEUR.dette.dette} pts`); }
  return { bonus: { infanterie: ch.mobiliser ? INTERIEUR.mobilisation.inf : 0, logistique: 1 }, lignes: l };
}

// ---------- Diplomatie de guerre (10) ----------
export const MEMBRES_ONU = ["USA", "CHN", "RUS", "GBR", "FRA"];
const NON_PERMANENTS = ["BRA", "IND", "JPN", "DEU", "NGA", "ZAF", "EGY", "IDN", "MEX", "ARG", "TUR", "SAU", "KOR", "CAN", "AUS", "PAK", "KEN", "VNM", "SEN", "CHL"];
export function membresConseil(annee: number) { const h = hash(String(annee)); const r = NON_PERMANENTS.slice(); for (let i = r.length - 1; i > 0; i--) { const j = (h >>> (i % 24)) % (i + 1); [r[i], r[j]] = [r[j], r[i]]; } return [...MEMBRES_ONU, ...r.slice(0, 10)]; }
// Vote de sanctions : chaque membre vote selon son attitude envers ton camp et sa relation avec la cible ; un permanent hostile met son veto.
export function voteSanctions(e: EtatV2, camp: Camp, cibleIso: string) {
  const votes = membresConseil(e.annee).filter(i => e.pays[i]).map(i => { const p = e.pays[i]; const pour = p.att[camp] - p.att[M.autre(camp)] - M.relation(e, i, cibleIso) / 2 > 0 || i === M.LEADER[camp]; return { iso: i, pour, veto: MEMBRES_ONU.includes(i) && !pour && (i === cibleIso || M.relation(e, i, cibleIso) > 30 || p.att[M.autre(camp)] > p.att[camp] + 20) }; });
  const oui = votes.filter(v => v.pour).length, veto = votes.find(v => v.veto);
  return { votes, oui, adopte: oui >= 9 && !veto, veto: veto?.iso };
}
export const DIPLO = { sanctionsPib: -1, sanctionsArmee: 0.9, allieEscadrilles: 2, allieTension: 0.5, cessezLassitude: 60, cessezScore: 25, refusLassitude: 5 };
// Sanctions adoptées : PIB −1 %, armée −10 % (embargo sur les armes), relations économiques avec le camp qui les porte −10.
export function appliquerSanctions(e: EtatV2, camp: Camp, cibleIso: string) {
  const P = e.pays[cibleIso]; if (!P) return; P.pib *= 1 + DIPLO.sanctionsPib / 100; P.militaire *= DIPLO.sanctionsArmee; P.eco[camp] = M.borne(P.eco[camp] - 10);
}
// Résolution de l'ONU pendant une guerre entre États (demande du 2 novembre 2026) : 1 chance sur 2 par an ; le camp auquel
// l'agresseur n'appartient pas propose des sanctions ; adoptée → sanctions, veto → tension +0,2 (estimation).
export const ONU = { proba: 0.5, tensionVeto: 0.2 };
export function resolutionONU(e: EtatV2, g: CR.Guerre): string | null {
  if (g.rebelles || M.tirer(e) >= ONU.proba || !e.pays[g.a]) return null;
  const camp = M.autre(campDuPays(e.pays[g.a])), v = voteSanctions(e, camp, g.a);
  if (v.adopte) { appliquerSanctions(e, camp, g.a); return `ONU : sanctions adoptées contre ${e.pays[g.a].nom} (${v.oui} voix sur 15)`; }
  if (v.veto) { e.tension = M.borne(e.tension + ONU.tensionVeto, 0, 10); return `ONU : résolution bloquée par le veto de ${e.pays[v.veto].nom}`; }
  return `ONU : résolution rejetée (${v.oui} voix sur 15, 9 requises)`;
}
export function cessezLeFeu(e: EtatV2, g: CR.Guerre, cote: "a" | "b"): boolean {
  const lui = adv(cote), s = cote === "a" ? g.score : -g.score;
  if ((g.lassitude?.[lui] ?? 0) >= DIPLO.cessezLassitude || s >= DIPLO.cessezScore) { g.fin = e.annee; g.issue = "cessez-le-feu négocié, retour aux frontières d'avant-guerre, casques bleus déployés"; CR.deployerCasquesBleus(e, g); return true; }
  g.lassitude ??= { a: 0, b: 0 }; g.lassitude[cote] += DIPLO.refusLassitude; return false;
}

// ---------- Négociation (4) ----------
// L'adversaire accepte si le score couvre le coût et s'il est las (lassitude ≥ 50) ou écrasé (score 100) ; un refus coûte 5 de lassitude.
export function proposerTraite(e: EtatV2, g: CR.Guerre, cote: "a" | "b", exigences: CR.Exigence[]): { accepte: boolean; texte: string } {
  const s = cote === "a" ? g.score : -g.score, cout = exigences.reduce((t, x) => t + CR.TRAITE[x].cout, 0), las = g.lassitude?.[adv(cote)] ?? 0;
  const occupe = cote === "a" ? g.occ?.a ?? 0 : g.occ?.b ?? 0;
  if (exigences.includes("annexer") && occupe < CR.SCORE.annexionOcc) return { accepte: false, texte: `Annexion impossible : il faut occuper au moins ${CR.SCORE.annexionOcc} % du territoire adverse (${Math.round(occupe)} % aujourd'hui).` };
  if (cout > s || (s < CR.SCORE.total && las < 50)) { g.lassitude ??= { a: 0, b: 0 }; g.lassitude[cote] += DIPLO.refusLassitude; return { accepte: false, texte: `Refusé : ces exigences coûtent ${cout} points, ton score est de ${Math.round(s)} et la lassitude adverse de ${las}. Ta lassitude +${DIPLO.refusLassitude}.` }; }
  const t = CR.traite(e, g, s, exigences); g.fin = e.annee; g.issue = t; return { accepte: true, texte: `Traité signé : ${t}.` };
}

// ---------- Qui joue quoi ----------
// Le joueur commande l'état-major du côté que son camp soutient : son pays leader en guerre, un pays qu'il garantit ou qu'il soutient.
export function coteJoueur(e: EtatV2, g: CR.Guerre, camp: Camp): "a" | "b" | null {
  if (g.rebelles || g.fin) return null;
  const iso = g.a === M.LEADER[camp] ? g.a : g.b === M.LEADER[camp] ? g.b : g.garants?.[camp] ?? (g.parCamp?.[camp] !== "rebelles" ? g.parCamp?.[camp] : undefined);
  return iso === g.a ? "a" : iso === g.b ? "b" : null;
}
export const guerresDuJoueur = (e: EtatV2) => (e.joueur ? CR.guerresEnCours(e).filter(g => coteJoueur(e, g, e.joueur!)) : []);
