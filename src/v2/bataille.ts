// Phase de guerre jouée (choix de l'utilisateur, 2 novembre 2026) : négociation (4), front intérieur (6), généraux (7), diplomatie (10)
// et un vrai champ de bataille (refonte du 2 novembre 2026 au soir, à la demande de l'utilisateur) : des unités sur une carte en
// hexagones, chacune avec son mouvement, sa portée et ses dés d'attaque ; on se déplace et on attaque avec des points de logistique ;
// chaque type a des bonus et malus contre les autres et le terrain joue (couvert, coût de mouvement). 4 saisons par an : l'attaquant
// joue, puis le défenseur. Brouillard de guerre : on ne voit l'ennemi qu'à portée de détection, de reconnaissance ou de satellite.
// Le résultat de l'année n'est pas plafonné : victoire foudroyante, progression lente ou enlisement.
// Genre du wargame à hexagones ; règles propres au jeu (pas de copie d'un jeu existant). Valeurs : estimations, à calibrer.
// Le hasard de combat passe par le générateur de la partie (tirer) ; la carte est tirée d'un hachage de la guerre.
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
export function profilArmee(e: EtatV2, iso: string): Record<"terre" | "air" | "mer" | "cyber" | "espace", number> {
  const s = SC[iso]?.scores ?? {}, m0 = ["Terrestre", "Naval", "Aérien", "Cyber", "Nucléaire"].reduce((t, k) => t + (s[k] ?? 0), 0) / 5;
  const k = Math.max(0.2, Math.min(3, (e.pays[iso]?.militaire ?? m0) / Math.max(1, m0))); // la composition suit la force actuelle
  const v = (x: string) => Math.min(100, (s[x] ?? 0) * k);
  return { terre: Math.max(10, v("Terrestre")), air: v("Aérien"), mer: SANS_LITTORAL.includes(iso) ? 0 : v("Naval"), cyber: v("Cyber"), espace: v("Spatial") };
}

// ---------- Unités (refonte du 2 novembre 2026 : « des unités sur un champ de bataille ; chaque type a un mouvement et une attaque ») ----------
// Chaque unité est une formation (division, escadre, flottille). Valeurs : estimation, à calibrer.
// pv : points de vie (formation entière) ; mouvement en points (le terrain coûte 1 à 3) ; portée en hexagones ; des : dés d'attaque à pleine force.
export type Domaine = "terre" | "air" | "mer";
export type Classe = "leger" | "blinde" | "artillerie" | "aerien" | "naval";
export type TypeUnite = "infanterie" | "mecanisee" | "robots" | "blindes" | "artillerie" | "helico" | "drones" | "chasseurs" | "bombardiers" | "corvettes" | "destroyers" | "croiseurs" | "sousmarins" | "porteavions";
export interface DefUnite { nom: string; classe: Classe; domaine: Domaine; pv: number; mouvement: number; portee: number; des: number; icone: string; aide: string }
const U = (nom: string, classe: Classe, domaine: Domaine, pv: number, mouvement: number, portee: number, des: number, icone: string, aide: string): DefUnite => ({ nom, classe, domaine, pv, mouvement, portee, des, icone, aide });
export const UNITES: Record<TypeUnite, DefUnite> = {
  infanterie: U("Infanterie", "leger", "terre", 4, 1, 1, 2, "⛊", "Lente mais tenace : la seule à tenir une ville ou une montagne sans perdre en efficacité. Faible contre les blindés."),
  mecanisee: U("Infanterie mécanisée", "blinde", "terre", 4, 2, 1, 2, "⛉", "Rapide et protégée, polyvalente."),
  robots: U("Robots terrestres", "leger", "terre", 3, 2, 1, 2, "⚙", "Dès 2022 pour les armées avancées : leur perte ne compte pas comme une perte humaine."),
  blindes: U("Blindés", "blinde", "terre", 3, 3, 1, 3, "◆", "Percée : +20 % en plaine, −30 % contre une ville, une forêt ou une montagne ; interdits en montagne."),
  artillerie: U("Artillerie", "artillerie", "terre", 2, 1, 3, 2, "✹", "Tire à 3 hexagones (4 depuis des collines), mais pas après avoir bougé. Vulnérable au contact."),
  helico: U("Hélicoptères d'attaque", "aerien", "air", 2, 4, 1, 3, "✚", "Tueurs de chars (+50 % contre les blindés), vulnérables à la chasse et à l'infanterie."),
  drones: U("Drones armés", "aerien", "air", 1, 5, 2, 2, "✦", "Bon marché, longue portée, voient loin (détection 4)."),
  chasseurs: U("Chasseurs", "aerien", "air", 2, 6, 2, 2, "✈", "Supériorité aérienne : +60 % contre les unités aériennes, faibles au sol."),
  bombardiers: U("Bombardiers", "aerien", "air", 2, 8, 1, 4, "✠", "Frappe lourde au sol, sans défense contre la chasse."),
  corvettes: U("Corvettes", "naval", "mer", 2, 3, 2, 1, "▲", "Patrouille côtière."),
  destroyers: U("Destroyers", "naval", "mer", 3, 3, 2, 2, "▼", "Escorte : bons contre les navires et l'aviation."),
  croiseurs: U("Croiseur lance-missiles", "naval", "mer", 3, 2, 3, 3, "⬢", "Frappe la côte à 3 hexagones."),
  sousmarins: U("Sous-marins", "naval", "mer", 2, 3, 1, 3, "◒", "Invisibles sauf au contact ; +60 % contre les navires."),
  porteavions: U("Groupe aéronaval", "naval", "mer", 4, 2, 4, 2, "⬣", "Son aviation frappe à 4 hexagones, sur mer comme sur terre."),
};
// Efficacité d'un type contre une classe (multiplie la chance de toucher). 0 : ne peut pas l'attaquer.
export const EFFICACITE: Record<TypeUnite, Record<Classe, number>> = {
  infanterie: { leger: 1, blinde: 0.5, artillerie: 1, aerien: 0.3, naval: 0 },
  mecanisee: { leger: 1.1, blinde: 0.8, artillerie: 1.1, aerien: 0.3, naval: 0 },
  robots: { leger: 1, blinde: 0.7, artillerie: 1, aerien: 0.2, naval: 0 },
  blindes: { leger: 1.2, blinde: 1, artillerie: 1.3, aerien: 0, naval: 0 },
  artillerie: { leger: 1.2, blinde: 0.6, artillerie: 1, aerien: 0, naval: 0.3 },
  helico: { leger: 1, blinde: 1.5, artillerie: 1.2, aerien: 0.2, naval: 0.5 },
  drones: { leger: 0.9, blinde: 1, artillerie: 1.2, aerien: 0.2, naval: 0.5 },
  chasseurs: { leger: 0.4, blinde: 0.4, artillerie: 0.4, aerien: 1.6, naval: 0.4 },
  bombardiers: { leger: 1.2, blinde: 1.1, artillerie: 1.3, aerien: 0, naval: 0.8 },
  corvettes: { leger: 0.3, blinde: 0.2, artillerie: 0.3, aerien: 0.6, naval: 1 },
  destroyers: { leger: 0.5, blinde: 0.4, artillerie: 0.5, aerien: 1, naval: 1.3 },
  croiseurs: { leger: 1, blinde: 0.8, artillerie: 1, aerien: 0.8, naval: 1 },
  sousmarins: { leger: 0, blinde: 0, artillerie: 0, aerien: 0, naval: 1.6 },
  porteavions: { leger: 0.9, blinde: 0.9, artillerie: 0.9, aerien: 1.2, naval: 0.8 },
};
export type Terrain = "plaine" | "foret" | "colline" | "montagne" | "ville" | "riviere" | "mer";
export const TERRAINS: Record<Terrain, { nom: string; cout: number; couvert: number; aide: string }> = {
  plaine: { nom: "Plaine", cout: 1, couvert: 1, aide: "Terrain découvert : les blindés y frappent à +20 %." },
  foret: { nom: "Forêt", cout: 2, couvert: 0.7, aide: "Mouvement 2 ; 30 % de coups subis en moins." },
  colline: { nom: "Collines", cout: 2, couvert: 0.75, aide: "Mouvement 2 ; 25 % de coups subis en moins ; l'artillerie y gagne 1 de portée." },
  montagne: { nom: "Montagne", cout: 3, couvert: 0.5, aide: "Mouvement 3, interdite aux blindés et à la mécanisée ; moitié moins de coups subis." },
  ville: { nom: "Ville", cout: 1, couvert: 0.6, aide: "40 % de coups subis en moins ; les blindés qui l'attaquent perdent 30 %." },
  riviere: { nom: "Rivière", cout: 2, couvert: 0.85, aide: "Mouvement 2 et arrêt ; attaquer depuis une rivière coûte 20 %." },
  mer: { nom: "Mer", cout: 1, couvert: 1, aide: "Navires et aviation seulement." },
};
const exemplaires = (v: number, seuil: number) => (v < seuil ? 0 : Math.min(4, 1 + Math.floor((v - seuil) / 25)));
export const CHAMP = { cols: 12, rows: 8, tours: 4, base: 0.5, pMin: 0.05, pMax: 0.9, logistique: 3, logistiqueTaille: 20, minTerre: 4, maxTerre: 14, maxAir: 6, maxMer: 4,
  plaineBlindes: 1.2, blindesCouvert: 0.7, riviere: 0.8, menace: 1.15, trait: 1.2, prudent: 0.8, audacieux: 1, detection: 2, detectionAir: 3, detectionDrones: 4, recon: 3,
  missiles: { des: 3, p: 0.6 }, brouillage: 2, coutSatellite: 2, coutBrouillage: 2, coutRecon: 1,
  // Résultat de l'année : objectifs (12 par objectif gagné), terrain (80 × part du terrain gagnée), pertes (40 × écart des parts perdues), déroute (±25 sous 35 % de forces).
  poidsObjectif: 12, poidsTerrain: 80, poidsPertes: 40, deroute: 0.35, bonusDeroute: 25 };
// Composition de l'armée : une formation par tranche de puissance (scores Terrestre, Aérien, Naval × évolution de la force militaire).
export function compositionArmee(e: EtatV2, iso: string, littoral: boolean, gen?: General, infanterie = 0): TypeUnite[] {
  const p = profilArmee(e, iso), an = e.annee;
  const terre: TypeUnite[] = [], air: TypeUnite[] = [], mer: TypeUnite[] = [];
  const t = (x: TypeUnite, n: number) => { for (let i = 0; i < n; i++) terre.push(x); }, a = (x: TypeUnite, n: number) => { for (let i = 0; i < n; i++) air.push(x); }, m = (x: TypeUnite, n: number) => { for (let i = 0; i < n; i++) mer.push(x); };
  t("infanterie", 2 + exemplaires(p.terre, 20) + infanterie + (gen?.trait === "populaire" ? 2 : 0)); t("blindes", exemplaires(p.terre, 30)); t("robots", an >= 2022 && p.cyber >= 60 ? Math.min(2, exemplaires(p.terre, 60)) : 0);
  t("mecanisee", exemplaires(p.terre, 35)); t("artillerie", Math.min(3, exemplaires(p.terre, 25)));
  a("chasseurs", Math.min(2, exemplaires(p.air, 12))); a("helico", Math.min(2, exemplaires(p.air, 8))); a("drones", an >= 2008 ? Math.min(2, exemplaires(Math.max(p.air, p.cyber / 2), 10)) : 0); a("bombardiers", Math.min(1, exemplaires(p.air, 50)));
  if (littoral) { m("destroyers", Math.min(2, exemplaires(p.mer, 15))); m("sousmarins", Math.min(1, exemplaires(p.mer, 20))); m("corvettes", Math.min(1, exemplaires(p.mer, 3))); m("croiseurs", Math.min(1, exemplaires(p.mer, 40))); m("porteavions", Math.min(1, exemplaires(p.mer, 60))); }
  while (terre.length < CHAMP.minTerre) terre.push("infanterie"); // milices et réservistes : au moins 4 formations au sol
  return [...terre.slice(0, CHAMP.maxTerre), ...air.slice(0, CHAMP.maxAir), ...mer.slice(0, CHAMP.maxMer)];
}

// ---------- État d'une bataille sur le champ ----------
export type Cote = "a" | "b";
export interface Unite { id: string; type: TypeUnite; cote: Cote; c: number; r: number; pv: number; pvMax: number; bouge: boolean; tire: boolean; origine: "armee" | "allie"; de?: string }
export interface Case { c: number; r: number; t: Terrain; tenu: Cote }
export interface Objectif { nom: string; genre: "corridor" | "ville" | "port" | "hauteurs"; c: number; r: number; tenu: Cote; tenuDepart: Cote }
export interface Forces { iso: string; projection: number; baseAlliee?: string; logistique: number; base: number; malus: number; tranches: number; general?: General; missiles: number; cyber: number; espace: number;
  pvDepart: number; pertes: number; detruites: string[]; reconnu: { c: number; r: number }[]; satellite: boolean; brouille: boolean; vus: Record<string, { c: number; r: number; type: TypeUnite; tour: number }> }
export interface BilanTour { tour: number; cote: Cote; lignes: string[]; infligees: number; subies: number; pris: string[]; perdus: string[] }
export interface Bataille { guerre: string; annee: number; tour: number; tours: number; actif: Cote; premier: Cote; cols: number; rows: number; cases: Case[]; unites: Unite[]; objectifs: Objectif[]; a: Forces; b: Forces;
  joueur: Cote; journal: string[]; bilans: BilanTour[]; enCours: BilanTour; terrainDepart: number; finie?: boolean; nucleaire?: { menace?: Cote; tactique?: Cote; strategique?: Cote }; littoral: boolean }
export const adverse = adv;
// Hexagones en lignes décalées (lignes impaires décalées d'un demi-hexagone vers la droite).
export const voisins = (c: number, r: number) => (r % 2 ? [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]] : [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]]).map(([dc, dr]) => [c + dc, r + dr] as [number, number]);
const cube = (c: number, r: number) => { const x = c - (r - (r & 1)) / 2; return [x, -x - r, r]; };
export const distance = (c1: number, r1: number, c2: number, r2: number) => { const p = cube(c1, r1), q = cube(c2, r2); return Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])); };
export const caseEn = (b: Bataille, c: number, r: number) => (c >= 0 && r >= 0 && c < b.cols && r < b.rows ? b.cases[r * b.cols + c] : undefined);
export const uniteEn = (b: Bataille, c: number, r: number) => b.unites.find(u => u.pv > 0 && u.c === c && u.r === r);
export const vivantes = (b: Bataille, cote?: Cote) => b.unites.filter(u => u.pv > 0 && (!cote || u.cote === cote));
export const def = (u: Unite) => UNITES[u.type];
// Générateur local (hachage de la guerre et de l'année) : la carte ne consomme pas le hasard de la partie.
function alea(graine: number) { let x = graine >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
export function genererTerrain(g: CR.Guerre, annee: number, littoral: boolean, nomVille: string) {
  const R = alea(hash(g.id + annee)), cols = CHAMP.cols, rows = CHAMP.rows, cases: Case[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = R(); let t: Terrain = x < 0.16 ? "foret" : x < 0.27 ? "colline" : x < 0.31 ? "montagne" : x < 0.35 ? "ville" : "plaine";
    if (littoral && (r === 0 || (r === 1 && R() < 0.3 && c < cols - 3))) t = "mer";
    cases.push({ c, r, t, tenu: "a" });
  }
  const rc = 4 + Math.floor(R() * 3), ponts = [Math.floor(R() * rows), Math.floor(R() * rows)];
  for (let r = 0; r < rows; r++) { const k = r * cols + rc; if (cases[k].t !== "mer" && !ponts.includes(r)) cases[k].t = "riviere"; }
  const mil = Math.floor(rows / 2), at = (c: number, r: number) => cases[r * cols + c];
  const objectifs: Omit<Objectif, "tenu" | "tenuDepart">[] = [{ nom: "Le corridor frontalier", genre: "corridor", c: 5, r: mil }, { nom: nomVille, genre: "ville", c: 8, r: 3 + Math.floor(R() * (rows - 4)) },
    littoral ? { nom: "Le port", genre: "port", c: 9, r: 1 } : { nom: "Les hauteurs", genre: "hauteurs", c: 7, r: 1 + Math.floor(R() * 2) }];
  for (const o of objectifs) at(o.c, o.r).t = o.genre === "corridor" ? "plaine" : o.genre === "hauteurs" ? "colline" : "ville";
  if (littoral) { at(9, 0).t = "mer"; at(10, 0).t = "mer"; }
  return { cases, objectifs, cols, rows };
}

// ---------- Préparation ----------
export interface OptionsBataille { general?: General; tranches?: number; tranchesIA?: number; bonus?: Partial<Record<Cote, { infanterie?: number; logistique?: number }>> }
export function preparerBataille(e: EtatV2, g: CR.Guerre, joueur: Cote, o: OptionsBataille = {}): Bataille {
  const littoral = !SANS_LITTORAL.includes(g.a) || !SANS_LITTORAL.includes(g.b);
  const T = genererTerrain(g, e.annee, littoral, g.region && g.region !== "la région frontalière" ? g.region : `${e.pays[g.b]?.nom ?? "La ville-clé"} : la ville-clé`);
  // Ligne de front au départ : l'occupation déjà acquise la déplace (1 colonne par tranche de 20 % net, colonnes 1 à 9).
  const net = (g.occ?.a ?? 0) - (g.occ?.b ?? 0), front = Math.max(1, Math.min(T.cols - 3, 3 + Math.round(net / 20)));
  for (const k of T.cases) k.tenu = k.c < front ? "a" : "b";
  const objectifs: Objectif[] = T.objectifs.map(x => { const t = T.cases[x.r * T.cols + x.c].tenu; return { ...x, tenu: t, tenuDepart: t }; });
  const b: Bataille = { guerre: g.id, annee: e.annee, tour: 1, tours: CHAMP.tours, actif: "a", premier: "a", cols: T.cols, rows: T.rows, cases: T.cases, unites: [], objectifs, a: null as any, b: null as any, joueur, journal: [], bilans: [], enCours: { tour: 1, cote: "a", lignes: [], infligees: 0, subies: 0, pris: [], perdus: [] }, terrainDepart: 0, littoral };
  for (const cote of ["a", "b"] as const) {
    const iso = cote === "a" ? g.a : g.b, gen = cote === joueur ? o.general : undefined, tr = cote === joueur ? o.tranches ?? 0 : o.tranchesIA ?? 0, p = profilArmee(e, iso);
    const base0 = baseAlliee(e, iso, g), proj = cote === "a" ? Math.min(1, projection(e, iso, g.b) + (base0 && projection(e, iso, g.b) < 1 ? BASE.projection : 0)) : 1;
    const types = projeter(compositionArmee(e, iso, littoral, gen, o.bonus?.[cote]?.infanterie ?? 0), proj);
    const taille = tailleArmee(e, iso), base = CHAMP.logistique + Math.round(taille / CHAMP.logistiqueTaille) + tr * BUDGET_GUERRE.logistique + (gen?.trait === "logisticien" ? 1 : 0) + (o.bonus?.[cote]?.logistique ?? 0) + (base0 ? BASE.logistique : 0);
    b[cote] = { iso, projection: proj, baseAlliee: base0 ?? undefined, logistique: base, base, malus: 0, tranches: tr, general: gen, missiles: tr, cyber: p.cyber, espace: p.espace, pvDepart: 0, pertes: 0, detruites: [], reconnu: [], satellite: false, brouille: false, vus: {} };
    deployer(b, cote, [...types.map(t => ({ type: t, origine: "armee" as "armee" | "allie", de: undefined as string | undefined })), ...renforts(e, g, cote, littoral)], front);
    b[cote].pvDepart = vivantes(b, cote).reduce((s, u) => s + u.pv, 0);
  }
  b.terrainDepart = terrainTenu(b, "a");
  b.b.logistique = b.b.base; // le défenseur joue en second dans chaque saison
  memoriser(b, "a"); memoriser(b, "b");
  return b;
}
// Placement : troupes au contact de la ligne de front, artillerie en retrait, aviation à l'arrière, flotte sur la mer de son côté.
// Le défenseur met d'abord son infanterie sur les objectifs et à couvert.
function deployer(b: Bataille, cote: Cote, l: { type: TypeUnite; origine: "armee" | "allie"; de?: string }[], front: number) {
  const libre = (k: Case) => !uniteEn(b, k.c, k.r), mien = (k: Case) => k.tenu === cote, prof = (k: Case) => (cote === "a" ? front - 1 - k.c : k.c - front);
  const ordre: TypeUnite[] = ["infanterie", "mecanisee", "robots", "blindes", "artillerie", "helico", "drones", "chasseurs", "bombardiers", "destroyers", "sousmarins", "corvettes", "croiseurs", "porteavions"];
  l.sort((x, y) => ordre.indexOf(x.type) - ordre.indexOf(y.type));
  let n = 0;
  for (const x of l) {
    const d = UNITES[x.type], cands = b.cases.filter(k => mien(k) && libre(k) && (d.domaine === "mer" ? k.t === "mer" : d.domaine === "air" ? k.t !== "mer" : k.t !== "mer" && !(k.t === "montagne" && (x.type === "blindes" || x.type === "mecanisee"))));
    if (!cands.length) continue;
    const obj = (k: Case) => b.objectifs.some(o => o.c === k.c && o.r === k.r);
    const score = (k: Case) => {
      const p = prof(k);
      if (d.domaine === "air") return -Math.abs(p - 3) - k.r * 0.01;
      if (d.domaine === "mer") return -p;
      if (x.type === "artillerie") return -Math.abs(p - 2) + (k.t === "colline" ? 0.5 : 0);
      return -p + (cote === "b" && obj(k) ? 5 : 0) + (cote === "b" ? (1 - TERRAINS[k.t].couvert) * 2 : 0) - Math.abs(k.r - b.rows / 2) * 0.05;
    };
    const k = cands.sort((p, q) => score(q) - score(p))[0];
    b.unites.push({ id: `${cote}${n++}`, type: x.type, cote, c: k.c, r: k.r, pv: d.pv, pvMax: d.pv, bouge: false, tire: false, origine: x.origine, de: x.de });
  }
}
const terrainTenu = (b: Bataille, cote: Cote) => b.cases.filter(k => k.t !== "mer" && k.tenu === cote).length / Math.max(1, b.cases.filter(k => k.t !== "mer").length);

// ---------- Brouillard de guerre (demande : « une vue partielle de ce que fait l'ennemi ») ----------
// Tu vois une unité ennemie à 2 hexagones de tes troupes (3 depuis l'aviation, 4 depuis les drones), dans un rayon de 3 autour d'une
// reconnaissance, ou partout pendant la saison d'un satellite. Les sous-marins ne se voient qu'au contact. Les unités vues gardent
// une trace (dernière position connue).
export function visible(b: Bataille, cote: Cote, u: Unite) {
  if (u.cote === cote) return true;
  const f = b[cote], sm = u.type === "sousmarins";
  if (f.satellite && !sm) return true;
  if (!sm && f.reconnu.some(p => distance(p.c, p.r, u.c, u.r) <= CHAMP.recon)) return true;
  return vivantes(b, cote).some(m => distance(m.c, m.r, u.c, u.r) <= (sm ? 1 : m.type === "drones" ? CHAMP.detectionDrones : def(m).domaine === "air" ? CHAMP.detectionAir : CHAMP.detection));
}
export const ennemisVus = (b: Bataille, cote: Cote) => vivantes(b, adv(cote)).filter(u => visible(b, cote, u));
function memoriser(b: Bataille, cote: Cote) { const f = b[cote]; for (const u of ennemisVus(b, cote)) f.vus[u.id] = { c: u.c, r: u.r, type: u.type, tour: b.tour }; for (const id of Object.keys(f.vus)) if (!b.unites.find(u => u.id === id && u.pv > 0)) delete f.vus[id]; }

// ---------- Mouvement (1 point de logistique par unité déplacée) ----------
// Les troupes au sol s'arrêtent en entrant au contact d'une unité ennemie terrestre (zone de contrôle) et en entrant dans une rivière.
export function deplacements(b: Bataille, u: Unite): { c: number; r: number }[] {
  const d = def(u), res: { c: number; r: number }[] = [], cout = new Map<number, number>([[u.r * b.cols + u.c, 0]]), file = [[u.c, u.r]];
  const zoc = (c: number, r: number) => voisins(c, r).some(([x, y]) => { const v = uniteEn(b, x, y); return v && v.cote !== u.cote && def(v).domaine === "terre"; });
  while (file.length) {
    const [c, r] = file.shift()!, k0 = cout.get(r * b.cols + c)!;
    if (d.domaine === "terre" && (c !== u.c || r !== u.r) && (zoc(c, r) || caseEn(b, c, r)!.t === "riviere")) continue;
    for (const [x, y] of voisins(c, r)) {
      const k = caseEn(b, x, y); if (!k) continue;
      if (d.domaine === "mer" ? k.t !== "mer" : d.domaine === "terre" ? k.t === "mer" || (k.t === "montagne" && (u.type === "blindes" || u.type === "mecanisee")) : false) continue;
      const occ = uniteEn(b, x, y); if (occ && occ.cote !== u.cote) continue;
      const n = k0 + (d.domaine === "terre" ? TERRAINS[k.t].cout : 1); if (n > d.mouvement || (cout.get(y * b.cols + x) ?? 99) <= n) continue;
      cout.set(y * b.cols + x, n); file.push([x, y]); if (!occ) res.push({ c: x, r: y });
    }
  }
  return res.filter((p, i) => res.findIndex(q => q.c === p.c && q.r === p.r) === i);
}
const prendre = (b: Bataille, u: Unite) => {
  if (def(u).domaine !== "terre") return;
  const k = caseEn(b, u.c, u.r)!; k.tenu = u.cote;
  const o = b.objectifs.find(x => x.c === u.c && x.r === u.r);
  if (o && o.tenu !== u.cote) { o.tenu = u.cote; b.enCours.pris.push(o.nom); b.journal.push(`${SAISONS[b.tour - 1]} : ${nomCote(b, u.cote)} prend ${o.nom}.`); }
};
const nomCote = (b: Bataille, cote: Cote) => (cote === b.joueur ? "tu" : "l'ennemi");
export function deplacer(b: Bataille, cote: Cote, id: string, c: number, r: number): string | null {
  const u = b.unites.find(x => x.id === id && x.pv > 0 && x.cote === cote), f = b[cote];
  if (!u || b.actif !== cote || b.finie) return "Ce n'est pas ton tour.";
  if (u.bouge || u.tire) return "Cette unité a déjà agi.";
  if (f.logistique < 1) return "Plus de logistique ce tour.";
  if (!deplacements(b, u).some(p => p.c === c && p.r === r)) return "Case hors de portée.";
  u.c = c; u.r = r; u.bouge = true; f.logistique--; prendre(b, u); memoriser(b, cote);
  return null;
}

// ---------- Combat (1 point de logistique par attaque ; une unité peut bouger puis attaquer) ----------
// Chaque dé touche avec la chance affichée : 50 % × efficacité contre la classe visée × couvert du terrain × modificateurs. Chaque touche
// retire 1 point de vie. Une unité au contact qui survit riposte avec la moitié de ses dés. Une unité terrestre qui détruit sa cible au
// contact avance dans la case libérée (elle prend le terrain).
export function portee(b: Bataille, u: Unite) { const d = def(u); return d.portee + (u.type === "artillerie" && caseEn(b, u.c, u.r)!.t === "colline" ? 1 : 0); }
export function chance(b: Bataille, u: Unite, t: Unite) {
  const eff = EFFICACITE[u.type][def(t).classe]; if (!eff) return 0;
  const kt = caseEn(b, t.c, t.r)!, ku = caseEn(b, u.c, u.r)!, f = b[u.cote], tr = f.general?.trait, ft = b[t.cote].general?.trait;
  let p = CHAMP.base * eff;
  if (def(t).domaine === "terre") p *= def(u).domaine === "terre" ? TERRAINS[kt.t].couvert : Math.max(TERRAINS[kt.t].couvert, 0.85);
  if (u.type === "blindes" && kt.t === "plaine") p *= CHAMP.plaineBlindes;
  if (u.type === "blindes" && ["ville", "foret", "montagne"].includes(kt.t)) p *= CHAMP.blindesCouvert;
  if (ku.t === "riviere" && def(u).domaine === "terre") p *= CHAMP.riviere;
  if (b.nucleaire?.menace === u.cote) p *= CHAMP.menace;
  if ((tr === "aviateur" && def(u).domaine === "air") || (tr === "amiral" && def(u).domaine === "mer") || (tr === "audacieux" && u.type === "blindes")) p *= CHAMP.trait;
  if (ft === "prudent" && b.objectifs.some(o => o.c === t.c && o.r === t.r)) p *= CHAMP.prudent;
  return Math.max(CHAMP.pMin, Math.min(CHAMP.pMax, p));
}
export const desDe = (u: Unite) => Math.max(1, Math.round(def(u).des * u.pv / u.pvMax));
export function ciblesDe(b: Bataille, u: Unite) {
  if (u.tire || (u.type === "artillerie" && u.bouge)) return [];
  return vivantes(b, adv(u.cote)).filter(t => visible(b, u.cote, t) && distance(u.c, u.r, t.c, t.r) <= portee(b, u) && EFFICACITE[u.type][def(t).classe] > 0);
}
// Probabilités affichées avant d'attaquer : touches attendues et chance de détruire (loi binomiale).
export function previsionAttaque(b: Bataille, u: Unite, t: Unite) {
  const n = desDe(u), p = chance(b, u, t);
  const pk = (k: number) => { let s = 0; for (let i = k; i <= n; i++) s += comb(n, i) * p ** i * (1 - p) ** (n - i); return s; };
  const rip = t.pv > 0 && distance(u.c, u.r, t.c, t.r) === 1 && EFFICACITE[t.type][def(u).classe] > 0 && t.type !== "artillerie";
  return { des: n, p, attendu: n * p, detruire: t.pv > n ? 0 : pk(t.pv), riposte: rip ? Math.ceil(desDe(t) / 2) * chance(b, t, u) : 0 };
}
const comb = (n: number, k: number) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
function blesser(b: Bataille, t: Unite, n: number) {
  const avant = t.pv; t.pv = Math.max(0, t.pv - n); const perdu = avant - t.pv;
  if (t.type !== "robots") b[t.cote].pertes += perdu; // les robots détruits ne sont pas des pertes humaines
  if (t.cote === b.enCours.cote) b.enCours.subies += perdu; else b.enCours.infligees += perdu;
  if (t.pv === 0) { b[t.cote].detruites.push(t.type); b.enCours.perdus.push(`${t.cote === b.joueur ? "ton" : "son"} unité ${def(t).nom.toLowerCase()}`); }
}
export function lancer(e: EtatV2, n: number, p: number) { let k = 0; for (let i = 0; i < n; i++) if (M.tirer(e) < p) k++; return k; }
export function attaquer(e: EtatV2, b: Bataille, cote: Cote, id: string, cible: string): string | null {
  const u = b.unites.find(x => x.id === id && x.pv > 0 && x.cote === cote), t = b.unites.find(x => x.id === cible && x.pv > 0), f = b[cote];
  if (!u || !t || b.actif !== cote || b.finie) return "Ce n'est pas ton tour.";
  if (f.logistique < 1) return "Plus de logistique ce tour.";
  if (!ciblesDe(b, u).includes(t)) return u.tire ? "Cette unité a déjà attaqué." : u.type === "artillerie" && u.bouge ? "L'artillerie ne tire pas après avoir bougé." : "Cible hors de portée ou invisible.";
  f.logistique--; u.tire = true;
  const pr = previsionAttaque(b, u, t), touches = lancer(e, pr.des, pr.p); blesser(b, t, touches);
  const S = SAISONS[b.tour - 1], qui = cote === b.joueur ? "Ton unité" : "L'ennemi :", kt = caseEn(b, t.c, t.r)!;
  let txt = `${S} : ${qui} ${def(u).nom.toLowerCase()} attaque ${def(t).nom.toLowerCase()} (${TERRAINS[kt.t].nom.toLowerCase()}), ${pr.des} dés à ${Math.round(pr.p * 100)} % : ${touches} touche${touches > 1 ? "s" : ""}${t.pv === 0 ? ", unité détruite" : ""}.`;
  if (t.pv > 0 && pr.riposte > 0) { const n = Math.ceil(desDe(t) / 2), pp = chance(b, t, u), k = lancer(e, n, pp); blesser(b, u, k); txt += ` Riposte : ${k} touche${k > 1 ? "s" : ""}${u.pv === 0 ? ", l'attaquant est détruit" : ""}.`; }
  if (t.pv === 0 && u.pv > 0 && def(u).domaine === "terre" && def(u).portee === 1 && distance(u.c, u.r, t.c, t.r) === 1 && kt.t !== "mer" && !(kt.t === "montagne" && (u.type === "blindes" || u.type === "mecanisee"))) { u.c = t.c; u.r = t.r; prendre(b, u); txt += " Le terrain est pris."; }
  b.journal.push(txt); b.enCours.lignes.push(txt); memoriser(b, cote); memoriser(b, adv(cote));
  return null;
}

// ---------- Moyens spéciaux : renseignement, spatial, cyber et budget ----------
export function reconnaitre(b: Bataille, cote: Cote, c: number, r: number): string | null {
  const f = b[cote]; if (b.actif !== cote || b.finie) return "Ce n'est pas ton tour."; if (f.logistique < CHAMP.coutRecon) return "Plus de logistique ce tour.";
  f.logistique -= CHAMP.coutRecon; f.reconnu.push({ c, r }); memoriser(b, cote); b.enCours.lignes.push(`${SAISONS[b.tour - 1]} : reconnaissance (rayon ${CHAMP.recon}).`); return null;
}
export const peutSatellite = (b: Bataille, cote: Cote) => b[cote].espace >= 40 && !b[cote].satellite;
export function satellite(b: Bataille, cote: Cote): string | null {
  const f = b[cote]; if (b.actif !== cote || b.finie) return "Ce n'est pas ton tour."; if (!peutSatellite(b, cote)) return "Pas de satellite disponible."; if (f.logistique < CHAMP.coutSatellite) return "Logistique insuffisante.";
  f.logistique -= CHAMP.coutSatellite; f.satellite = true; memoriser(b, cote); b.journal.push(`${SAISONS[b.tour - 1]} : ${cote === b.joueur ? "ton satellite révèle" : "un satellite ennemi survole"} tout le théâtre.`); return null;
}
export const peutBrouiller = (b: Bataille, cote: Cote) => b[cote].cyber >= 20 && !b[cote].brouille;
export function brouiller(b: Bataille, cote: Cote): string | null {
  const f = b[cote], cout = f.general?.trait === "cyber" ? 0 : CHAMP.coutBrouillage; if (b.actif !== cote || b.finie) return "Ce n'est pas ton tour."; if (!peutBrouiller(b, cote)) return "Brouillage déjà utilisé ou cyber insuffisant."; if (f.logistique < cout) return "Logistique insuffisante.";
  f.logistique -= cout; f.brouille = true; b[adv(cote)].malus += CHAMP.brouillage; b.journal.push(`${SAISONS[b.tour - 1]} : brouillage : ${cote === b.joueur ? "l'ennemi perdra" : "tu perdras"} ${CHAMP.brouillage} logistique au prochain tour.`); return null;
}
export function missile(e: EtatV2, b: Bataille, cote: Cote, cible: string): string | null {
  const f = b[cote], t = b.unites.find(x => x.id === cible && x.pv > 0 && x.cote !== cote); if (b.actif !== cote || b.finie) return "Ce n'est pas ton tour."; if (f.missiles < 1) return "Plus de missiles (1 par tranche de budget).";
  if (!t || !visible(b, cote, t)) return "Cible invisible.";
  f.missiles--; const kt = caseEn(b, t.c, t.r)!, p = CHAMP.missiles.p * (def(t).domaine === "terre" ? Math.max(TERRAINS[kt.t].couvert, 0.8) : def(t).domaine === "mer" ? 0.8 : 0.5), k = lancer(e, CHAMP.missiles.des, p); blesser(b, t, k);
  const txt = `${SAISONS[b.tour - 1]} : frappe de missiles sur ${def(t).nom.toLowerCase()} : ${k} touche${k > 1 ? "s" : ""}${t.pv === 0 ? ", unité détruite" : ""}.`; b.journal.push(txt); b.enCours.lignes.push(txt); memoriser(b, cote); return null;
}

// ---------- Fin de tour : chaque saison, l'attaquant joue puis le défenseur (4 saisons par an) ----------
export function finTour(b: Bataille) {
  if (b.finie) return;
  b.bilans.push(b.enCours);
  const suivant = adv(b.actif);
  if (b.actif !== b.premier) { b.tour++; for (const f of [b.a, b.b]) { f.satellite = false; f.reconnu = []; f.brouille = false; } if (b.tour > b.tours) { b.finie = true; return; } }
  b.actif = suivant;
  const f = b[suivant]; f.logistique = Math.max(1, f.base - f.malus); f.malus = 0;
  for (const u of vivantes(b, suivant)) { u.bouge = false; u.tire = false; }
  b.enCours = { tour: b.tour, cote: suivant, lignes: [], infligees: 0, subies: 0, pris: [], perdus: [] };
  memoriser(b, "a"); memoriser(b, "b");
}

// ---------- IA : à chaque point de logistique, l'action la plus rentable (attaque, mouvement ou moyen spécial) ----------
// Elle ne voit que ce que son brouillard lui montre. L'attaquant marche sur les objectifs ; le défenseur les tient et contre-attaque.
const VALEUR: Record<Classe, number> = { leger: 1, blinde: 1.3, artillerie: 1.2, aerien: 1.2, naval: 1.1 };
function valeurCase(b: Bataille, u: Unite, c: number, r: number, vus: Unite[]) {
  const d = def(u), cote = u.cote, k = caseEn(b, c, r)!; let s = 0;
  if (d.domaine === "terre") {
    const visees = b.objectifs.filter(o => o.tenu !== cote), tenus = b.objectifs.filter(o => o.tenu === cote);
    const dObj = visees.length ? Math.min(...visees.map(o => distance(c, r, o.c, o.r))) : 0;
    s -= dObj * (cote === b.premier ? 1.5 : 0.8);
    if (b.objectifs.some(o => o.c === c && o.r === r)) s += cote === b.premier ? 6 : 8;
    if (tenus.some(o => o.c === c && o.r === r) && cote !== b.premier) s += 3;
    s += (1 - TERRAINS[k.t].couvert) * 3;
    // progression vers le camp adverse (l'attaquant avance vers la droite)
    s += (cote === "a" ? c : b.cols - 1 - c) * (cote === b.premier ? 0.4 : 0.1);
  }
  for (const v of vus) {
    const dist = distance(c, r, v.c, v.r), eff = EFFICACITE[u.type][def(v).classe], sub = EFFICACITE[v.type][d.classe];
    if (dist <= portee(b, u) && eff > 0) s += eff * 1.5;
    if (dist === 1) s -= sub * (u.type === "artillerie" ? 4 : 0.8);
    if (d.domaine === "air" && dist <= def(u).mouvement + def(u).portee) s += eff * 0.3;
  }
  return s;
}
export function jouerIA(e: EtatV2, b: Bataille, cote: Cote) {
  const f = b[cote]; let garde = 60;
  while (!b.finie && b.actif === cote && garde-- > 0) {
    const vus = ennemisVus(b, cote);
    if (f.missiles > 0 && vus.length) { const t = vus.slice().sort((x, y) => VALEUR[def(y).classe] * y.pv - VALEUR[def(x).classe] * x.pv)[0]; missile(e, b, cote, t.id); continue; }
    if (f.logistique < 1) break;
    if (peutBrouiller(b, cote) && f.logistique >= 5) { brouiller(b, cote); continue; }
    if (!vus.length && f.logistique >= 3) { if (peutSatellite(b, cote)) { satellite(b, cote); continue; }
      if (!f.reconnu.length) { const o = b.objectifs.find(x => x.tenu !== cote) ?? b.objectifs[0]; reconnaitre(b, cote, o.c, o.r); continue; } }
    let best: { s: number; run: () => void } | null = null;
    for (const u of vivantes(b, cote)) {
      for (const t of ciblesDe(b, u)) { const p = previsionAttaque(b, u, t); const s = (p.attendu + 2 * p.detruire) * VALEUR[def(t).classe] - p.riposte * 0.8 + 0.3; if (!best || s > best.s) best = { s, run: () => attaquer(e, b, cote, u.id, t.id) }; }
      if (!u.bouge && !u.tire) { const ici = valeurCase(b, u, u.c, u.r, vus);
        for (const p of deplacements(b, u)) { const s = (valeurCase(b, u, p.c, p.r, vus) - ici) * 0.5; if (s > 0.4 && (!best || s > best.s)) best = { s, run: () => deplacer(b, cote, u.id, p.c, p.r) }; } }
    }
    if (!best || best.s <= 0.3) break;
    best.run();
  }
  finTour(b);
}

// ---------- Résultat de l'année : rien n'est plafonné (victoire foudroyante, progression lente ou enlisement) ----------
export function resultat(b: Bataille) {
  const tenus = (c: Cote) => b.objectifs.filter(o => o.tenu === c).length, depart = (c: Cote) => b.objectifs.filter(o => o.tenuDepart === c).length;
  const dObj = (tenus("a") - depart("a")) - (tenus("b") - depart("b")), dTerr = terrainTenu(b, "a") - b.terrainDepart;
  const part = (c: Cote) => b[c].pertes / Math.max(1, b[c].pvDepart), reste = (c: Cote) => vivantes(b, c).reduce((s, u) => s + u.pv, 0) / Math.max(1, b[c].pvDepart);
  const deroute = reste("b") < CHAMP.deroute && reste("a") >= CHAMP.deroute ? CHAMP.bonusDeroute : reste("a") < CHAMP.deroute && reste("b") >= CHAMP.deroute ? -CHAMP.bonusDeroute : 0;
  let d = CHAMP.poidsObjectif * dObj / 2 + CHAMP.poidsTerrain * dTerr + CHAMP.poidsPertes * (part("b") - part("a")) + deroute;
  if (b.nucleaire?.strategique) d += b.nucleaire.strategique === "a" ? 100 : -100;
  d = Math.max(-100, Math.min(100, d));
  const a = Math.abs(d), issue = a >= 50 ? "victoire foudroyante" : a >= 25 ? "victoire nette" : a >= 8 ? "progression lente" : "enlisement";
  return { d, issue, tenusA: tenus("a"), tenusB: tenus("b"), terrain: dTerr, pertesA: b.a.pertes, pertesB: b.b.pertes, partA: part("a"), partB: part("b"), resteA: reste("a"), resteB: reste("b"), deroute, detruitesA: b.a.detruites.length, detruitesB: b.b.detruites.length };
}


// Enregistre la bataille jouée : la résolution de fin d'année utilisera ce résultat au lieu du calcul automatique.
export function enregistrer(g: CR.Guerre, b: Bataille, e?: EtatV2) {
  g.batailleJouee = { annee: b.annee, d: resultat(b).d };
  // Blocus : une flotte qui reste seule en mer en fin d'année coûte 1 % de PIB au pays bloqué (estimation).
  if (e && b.littoral) for (const cote of ["a", "b"] as const) { const nav = (c: Cote) => vivantes(b, c).some(u => def(u).domaine === "mer");
    if (nav(cote) && !nav(adv(cote))) { const P = e.pays[b[adv(cote)].iso]; if (P) { P.pib *= 1 + PROJECTION.blocusPib / 100; b.journal.push(`Blocus maintenu : ${P.nom} perd ${-PROJECTION.blocusPib} % de PIB.`); } } }
  const t = b[b.joueur].general?.trait, dl = t === "audacieux" ? 5 : t === "populaire" ? -5 : 0; // lassitude due au général (par an)
  if (dl) { g.lassitude ??= { a: 0, b: 0 }; g.lassitude[b.joueur] = Math.max(0, g.lassitude[b.joueur] + dl); }
}

// ---------- Généraux ----------
export type TraitGeneral = "audacieux" | "prudent" | "logisticien" | "aviateur" | "amiral" | "cyber" | "populaire";
export const TRAITS_GENERAL: Record<TraitGeneral, string> = {
  audacieux: "Audacieux : blindés +20 % de chance de toucher, mais lassitude +5 par an.",
  prudent: "Prudent : tes unités sur un objectif subissent 20 % de coups en moins.",
  logisticien: "Logisticien : +1 logistique par tour.",
  aviateur: "Aviateur : aviation +20 % de chance de toucher.",
  amiral: "Amiral : flotte +20 % de chance de toucher.",
  cyber: "Cybernéticien : brouillage gratuit (l'ennemi perd 2 logistique).",
  populaire: "Populaire : 2 divisions d'infanterie de plus et lassitude −5 par an.",
};
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
// Budget de guerre : chaque tranche (1 unité du budget du camp) donne +1 logistique par tour et 1 frappe de missiles.
export const BUDGET_GUERRE = { max: 3, logistique: 1 };
export function engagerBudget(e: EtatV2, camp: Camp, n: number) { const k = Math.max(0, Math.min(n, BUDGET_GUERRE.max, e.budget[camp] - e.boostsUtilises[camp])); e.boostsUtilises[camp] += k; return k; }
// Taille de l'armée (moyenne terre, air, mer) : elle fixe la logistique (3 + 1 par tranche de 20).
export const tailleArmee = (e: EtatV2, iso: string) => { const p = profilArmee(e, iso); return (p.terre + p.air + p.mer) / 3; };
// Capacité de projection (attaquant seulement, la guerre se livre chez le défenseur) : 100 % dans sa zone ; ailleurs 30 % + 40 % × marine + 30 % × aviation (sur 100), plafonnée à 100 %.
// Les formations non projetées restent au pays, les plus lourdes d'abord, au moins 4 formations engagées.
export const PROJECTION = { base: 0.3, mer: 0.4, air: 0.3, minimum: 4, lourdes: ["blindes", "artillerie", "robots", "mecanisee", "croiseurs", "infanterie"] as TypeUnite[], blocusPib: -1 };
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
function projeter(l: TypeUnite[], proj: number) {
  let n = Math.min(l.length - PROJECTION.minimum, Math.round((1 - proj) * l.length)); if (n <= 0) return l;
  const r = l.slice();
  for (const ty of PROJECTION.lourdes) for (let i = r.length - 1; i >= 0 && n > 0; i--) if (r[i] === ty) { r.splice(i, 1); n--; }
  return r;
}
// Guerres sans le joueur : simulées en arrière-plan avec le même moteur, l'IA commande les deux camps (sans armes de destruction
// massive). Les alliés et garants envoient des renforts ; chaque camp engage son budget de guerre selon ses moyens.
export function batailleAuto(e: EtatV2, g: CR.Guerre): number {
  const ca = campDuPays(e.pays[g.a]), cb = campDuPays(e.pays[g.b]);
  const b = preparerBataille(e, g, "a", { tranches: 0, tranchesIA: 0, bonus: { a: { logistique: ca !== cb ? tranchesIA(e, ca) : 0 }, b: { logistique: ca !== cb ? tranchesIA(e, cb) : 0 } } });
  while (!b.finie) jouerIA(e, b, b.actif);
  return resultat(b).d;
}
// Renforts : les alliés engagés envoient 50 % de leurs formations, le leader garant 12 %, multipliés par leur projection.
// Ils envoient d'abord l'aviation et la flotte, puis des troupes.
export const RENFORTS = { allie: 0.5, garant: 0.12, ordre: ["air", "mer", "terre"] as Domaine[] };
export function soutiens(e: EtatV2, g: CR.Guerre, cote: "a" | "b"): { iso: string; part: number }[] {
  const iso = cote === "a" ? g.a : g.b, l = (g.allies?.[iso] ?? []).filter(i => e.pays[i]).map(i => ({ iso: i, part: RENFORTS.allie }));
  for (const c of ["OCC", "CHN"] as Camp[]) if (g.garants?.[c] === iso && e.pays[M.LEADER[c]] && M.LEADER[c] !== g.a && M.LEADER[c] !== g.b) l.push({ iso: M.LEADER[c], part: RENFORTS.garant });
  return l;
}
export function renforts(e: EtatV2, g: CR.Guerre, cote: Cote, littoral = true): { type: TypeUnite; origine: "allie"; de: string }[] {
  const r: { type: TypeUnite; origine: "allie"; de: string }[] = [];
  for (const s of soutiens(e, g, cote)) { const l = compositionArmee(e, s.iso, littoral), n = Math.round(s.part * projection(e, s.iso, g.b) * l.length);
    const tri = l.sort((x, y) => RENFORTS.ordre.indexOf(UNITES[x].domaine) - RENFORTS.ordre.indexOf(UNITES[y].domaine) || UNITES[y].des - UNITES[x].des);
    r.push(...tri.slice(0, n).map(type => ({ type, origine: "allie" as const, de: s.iso }))); }
  return r;
}
// IA : budget de guerre selon le budget libre de son camp (0 à 2 tranches).
export const tranchesIA = (e: EtatV2, camp: Camp) => Math.max(0, Math.min(2, Math.floor((e.budget[camp] - e.boostsUtilises[camp]) / 3)));

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
  if (niveau === "tactique") { b.nucleaire.tactique = cote; obj.tenu = cote; zoneDetruite(b, adv(cote), obj.c, obj.r, 2); prendreZone(b, cote, obj.c, obj.r); l.push(`Frappe tactique sur ${obj.nom} : l'objectif tombe, toutes les unités ennemies à 2 hexagones sont anéanties.`); }
  else { b.nucleaire.strategique = cote; for (const o of b.objectifs) o.tenu = cote; detruire(b, adv(cote), 0.6, ["terre", "air", "mer"]); }
  frappeSur(e, tireurIso, cibleIso, niveau, l);
  // Riposte de la cible ou de son protecteur, au même niveau.
  const r = riposteur(e, g, cote);
  if (r && M.tirer(e) < NUCLEAIRE.riposte[niveau]) { frappeSur(e, r, tireurIso, niveau, l); l.push(`Riposte de ${e.pays[r].nom}.`); if (niveau === "tactique") zoneDetruite(b, cote, obj.c, obj.r, 3); else detruire(b, cote, 0.6, ["terre", "air", "mer"]); }
  // Frappe préventive d'autres puissances nucléaires hostiles, plus probable à chaque frappe déjà tirée par ce camp.
  const campT = campDuPays(tireur);
  for (const i of NUCLEAIRES(e.annee)) if (i !== tireurIso && i !== r && e.pays[i] && campDuPays(e.pays[i]) !== campT && M.tirer(e) < NUCLEAIRE.preventive * (e.nucleaire!.frappes[campT] ?? 0)) { frappeSur(e, i, tireurIso, "tactique", l); l.push(`Frappe préventive de ${e.pays[i].nom} pour désarmer ${tireur.nom}.`); }
  verifierCatastrophe(e, l); // crise climatique puis hiver nucléaire : le camp qui a le plus tiré est tenu responsable
  return l.join(" ");
}

// Destructions massives : une part des formations d'un camp (les plus fortes d'abord), ou tout ce qui est dans un rayon.
function detruire(b: Bataille, cote: Cote, part: number, domaines: Domaine[]) {
  const l = vivantes(b, cote).filter(u => domaines.includes(def(u).domaine)).sort((x, y) => y.pv - x.pv); let n = Math.round(part * l.length);
  for (const u of l) { if (n-- <= 0) break; blesser(b, u, u.pv); }
}
function zoneDetruite(b: Bataille, cote: Cote, c: number, r: number, rayon: number) { for (const u of vivantes(b, cote)) if (distance(u.c, u.r, c, r) <= rayon) blesser(b, u, u.pv); }
function prendreZone(b: Bataille, cote: Cote, c: number, r: number) { for (const k of b.cases) if (k.t !== "mer" && distance(k.c, k.r, c, r) <= 1) k.tenu = cote; }
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
  for (const u of vivantes(b, adv(cote))) blesser(b, u, 1);
  l.push("Arme biologique : chaque unité ennemie perd 1 point de vie.");
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
