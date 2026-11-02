// Monnaie, version légère (choix du 2 novembre 2026 : dette, inflation, réserves).
// 3 chiffres par camp : dette (% du PIB du leader), inflation (%/an), réserves (stock en unités de budget, composition).
// Plus la répartition des réserves mondiales : devises occidentales (dollar, euro, autres), devises BRICS (yuan…), or.
// Départ 2000 : ordres de grandeur réels (dette publique États-Unis ≈ 55 %, Chine ≈ 23 % ; inflation ≈ 3,4 % et 0,4 % ;
// réserves mondiales ≈ 62 % dollar, 16 % euro, 8 % autres occidentales, 1 % autres, 13 % or) : estimation.
// Décisions (2 par an au plus, idée reprise d'EU4 : emprunt et inflation) : emprunter, rembourser, planche à billets, acheter de l'or.
import * as RS from "./ressources";
import { type EtatV2, type Camp, borne, autre, LEADER, NOM_CAMP, partEco, partPays, tirer, type Ligne } from "./moteur";

export interface Reserves { stock: number; occ: number; brics: number; or: number } // parts du stock (somme 1)
export interface EtatMonnaie {
  dette: Record<Camp, number>; inflation: Record<Camp, number>; reserves: Record<Camp, Reserves>;
  mondiales: { dollar: number; euro: number; autresOcc: number; brics: number; or: number };
  decisions: Record<Camp, number>; partEco0: number; defauts: Record<Camp, number>;
  detenteurs: Record<Camp, { interieur: number; allies: number; adverses: number }>; // qui détient la dette (parts, somme 1)
  prime: Record<Camp, number>; // surcoût de taux après une vente massive de titres par l'adversaire (retombe de moitié par an)
}
export const MON = {
  parUnite: 3,          // 1 unité empruntée = +3 points de dette
  tauxBase: 3,          // taux d'intérêt de base (%)
  tauxDette: 0.05,      // +0,05 point de taux par point de dette au-dessus de 60 %
  privilege: 4,         // « privilège exorbitant » : −4 points × (part de la monnaie du camp au-dessus de 25 %)
  plafond: 150,         // au-delà : défaut de paiement
  planche: 1.5,         // +1,5 point d'inflation par unité imprimée
  cibleInflation: 2, retourInflation: 0.3, // l'inflation revient de 30 % par an vers 2 %
  inflationPib: 0.1,    // −0,1 % de PIB par point d'inflation au-dessus de 4
  inflationStab: 0.4,   // −0,4 de stabilité par point au-dessus de 6
  amortisseur: 10,      // réserves : chaque unité réduit de 5 % l'effet d'une coupure (50 % au plus)
  gel: 0.25,            // risque annuel de gel des réserves en devises adverses quand la tension ≥ 7
  maxDecisions: 2,
};

export function initialiser(e: EtatV2) {
  e.monnaie = {
    dette: { OCC: 55, CHN: 23 }, inflation: { OCC: 3.4, CHN: 0.4 },
    reserves: { OCC: { stock: 2, occ: 0.35, brics: 0, or: 0.65 }, CHN: { stock: 3, occ: 0.95, brics: 0, or: 0.05 } },
    mondiales: { dollar: 0.62, euro: 0.16, autresOcc: 0.08, brics: 0.01, or: 0.13 },
    // Détenteurs de la dette (estimation) : en 2000, environ 30 % de la dette américaine est à l'étranger (Japon, Europe…), 2 % en Chine.
    detenteurs: { OCC: { interieur: 0.70, allies: 0.28, adverses: 0.02 }, CHN: { interieur: 0.97, allies: 0.02, adverses: 0.01 } }, prime: { OCC: 0, CHN: 0 },
    decisions: { OCC: 0, CHN: 0 }, partEco0: partEco(e, "CHN") / (partEco(e, "OCC") + partEco(e, "CHN")), defauts: { OCC: 0, CHN: 0 },
  };
}
const MN = (e: EtatV2) => { if (!e.monnaie) initialiser(e); return e.monnaie!; };
export const partOccidentale = (e: EtatV2) => { const m = MN(e).mondiales; return m.dollar + m.euro + m.autresOcc; };
const partMonnaie = (e: EtatV2, c: Camp) => (c === "OCC" ? partOccidentale(e) : MN(e).mondiales.brics);
export function taux(e: EtatV2, c: Camp) {
  const m = MN(e);
  return Math.max(0.5, MON.tauxBase + MON.tauxDette * Math.max(0, m.dette[c] - 60) + 0.5 * Math.max(0, m.inflation[c] - 2) + m.prime[c] - MON.privilege * Math.max(0, partMonnaie(e, c) - 0.25));
}
// Intérêts de l'année, en unités de budget : seulement sur la dette ajoutée depuis 2000 (l'ancienne est déjà dans le revenu).
export const interets = (e: EtatV2, c: Camp) => Math.max(0, MN(e).dette[c] - (c === "OCC" ? 55 : 23)) / MON.parUnite * taux(e, c) / 100;

// ---------- Décisions du joueur (ou de l'IA) ----------
export type Decision = "emprunter" | "rembourser" | "planche" | "or" | "puiser";
export const DECISIONS: { id: Decision; nom: string; aide: string }[] = [
  { id: "emprunter", nom: "Emprunter", aide: "Bons du Trésor : +1 budget maintenant, +3 points de dette, des intérêts ensuite." },
  { id: "rembourser", nom: "Rembourser", aide: "−1 budget, −3 points de dette : moins d'intérêts, taux plus bas." },
  { id: "planche", nom: "Planche à billets", aide: "+1 budget maintenant, +1,5 point d'inflation (freine le PIB, puis la stabilité)." },
  { id: "or", nom: "Acheter de l'or", aide: "−1 budget, +1 réserve en or : amortit les coupures et ne peut pas être gelée." },
  { id: "puiser", nom: "Puiser dans les réserves", aide: "−1 réserve, +1 budget." },
];
export function possible(e: EtatV2, c: Camp, d: Decision): string | null {
  const m = MN(e), b = e.budget[c] - e.boostsUtilises[c];
  if (m.decisions[c] >= MON.maxDecisions) return "Deux décisions par an au plus";
  if ((d === "rembourser" || d === "or") && b < 1) return "Il faut 1 unité de budget libre";
  if (d === "rembourser" && m.dette[c] < 1) return "Plus de dette à rembourser";
  if (d === "puiser" && m.reserves[c].stock < 1) return "Réserves vides";
  return null;
}
export function decider(e: EtatV2, c: Camp, d: Decision): Ligne {
  const raison = possible(e, c, d); if (raison) throw new Error(raison);
  const m = MN(e), r = m.reserves[c]; m.decisions[c]++;
  if (d === "emprunter") { e.budget[c] += 1; m.dette[c] += MON.parUnite; }
  if (d === "rembourser") { e.budget[c] -= 1; m.dette[c] = Math.max(0, m.dette[c] - MON.parUnite); }
  if (d === "planche") { e.budget[c] += 1; m.inflation[c] += MON.planche; }
  if (d === "or") { e.budget[c] -= 1; const s = r.stock + 1; r.occ = r.occ * r.stock / s; r.brics = r.brics * r.stock / s; r.or = 1 - r.occ - r.brics; r.stock = s; }
  if (d === "puiser") { e.budget[c] += 1; r.stock -= 1; }
  return { texte: `${NOM_CAMP[c]} : ${DECISIONS.find(x => x.id === d)!.nom.toLowerCase()}`, camp: c, signe: 1 };
}
// IA prudente : emprunte si le budget manque et la dette est raisonnable, rembourse quand elle dérape, achète de l'or sous tension.
export function monnaieIA(e: EtatV2, c: Camp) {
  const m = MN(e), b = () => e.budget[c] - e.boostsUtilises[c];
  if (m.dette[c] > 100 && !possible(e, c, "rembourser")) decider(e, c, "rembourser");
  else if (b() < 2 && m.dette[c] < 90 && !possible(e, c, "emprunter")) decider(e, c, "emprunter");
  if (e.tension >= 6 && m.reserves[c].occ > 0.5 && c === "CHN" && !possible(e, c, "or")) decider(e, c, "or");
  else if (b() < 1 && m.inflation[c] < 3 && tirer(e) < 0.3 && !possible(e, c, "planche")) decider(e, c, "planche");
}

// Amortisseur des réserves : part d'une coupure de ressources effacée (0 à 0,5).
export const amortisseur = (e: EtatV2, c: Camp) => Math.min(0.5, MN(e).reserves[c].stock / MON.amortisseur);
// Effet de l'inflation sur le PIB (en %, négatif) : appliqué à tous les pays du camp selon leur alignement.
export const effetInflationPib = (e: EtatV2, c: Camp) => -MON.inflationPib * Math.max(0, MN(e).inflation[c] - 4);

// ---------- Fin d'année ----------
export function finAnnee(e: EtatV2, croissance: Record<Camp, number>): { titre: string; texte: string; pays: string }[] {
  const m = MN(e), annonces: { titre: string; texte: string; pays: string }[] = [];
  for (const c of ["OCC", "CHN"] as Camp[]) {
    // Les intérêts se paient sur le budget de l'année suivante (arrondi au dixième, reporté).
    const i = interets(e, c); e.budget[c] = Math.max(0, e.budget[c] - Math.round(i));
    // La croissance et l'inflation font fondre le ratio de dette ; les intérêts non payés s'y ajoutent.
    m.dette[c] = Math.max(0, m.dette[c] * (1 - (croissance[c] + m.inflation[c]) / 100) + (i - Math.round(i)) * MON.parUnite + 2.0); // +2 : déficit courant moyen (estimation)
    m.inflation[c] = Math.max(-1, m.inflation[c] + MON.retourInflation * (MON.cibleInflation - m.inflation[c]));
    const p = e.pays[LEADER[c]];
    p.stabilite = borne(p.stabilite - MON.inflationStab * Math.max(0, m.inflation[c] - 6), 0, 100);
    const h = m.detenteurs[c], adv = autre(c);
    if (m.dette[c] > MON.plafond) { // défaut de paiement : chaque détenteur perd 40 %, et le choc tombe là où est la dette
      m.dette[c] *= 0.6; m.inflation[c] += 8; m.defauts[c]++; e.budget[c] = 0;
      p.stabilite = borne(p.stabilite - 5 - 20 * h.interieur, 0, 100); p.pib *= 1 - 0.03 * h.interieur; // crise bancaire intérieure
      for (const q of Object.values(e.pays)) if (q.iso !== p.iso && partPays(q, c) >= 0.7) { q.pib *= 1 - 0.02 * h.allies; q.att[c] = borne(q.att[c] - 10 * h.allies); } // alliés créanciers
      m.reserves[adv].stock *= 1 - 0.4 * Math.min(1, h.adverses * 3); e.pays[LEADER[adv]].pib *= 1 - 0.01 * h.adverses * 10; // l'adversaire perd ses titres
      annonces.push({ titre: `Défaut de paiement : ${p.nom}`, texte: `La dette de ${NOM_CAMP[c]} dépasse ${MON.plafond} % du PIB. Les créanciers perdent 40 % : ${Math.round(h.interieur * 100)} % de la dette était détenue chez soi, ${Math.round(h.allies * 100)} % par des alliés, ${Math.round(h.adverses * 100)} % par le camp adverse.`, pays: p.iso });
    }
    // Vente massive de titres par l'adversaire sous forte tension : les taux montent pour 2 ans environ.
    m.prime[c] *= 0.5;
    if (e.tension >= 7 && h.adverses >= 0.08 && tirer(e) < 0.2) {
      m.prime[c] += 1.5; const v = h.adverses * 0.4; h.adverses -= v; h.interieur += v;
      annonces.push({ titre: `${NOM_CAMP[adv]} vend des titres de dette de ${NOM_CAMP[c]}`, texte: `Les taux d'intérêt de ${NOM_CAMP[c]} montent de 1,5 point. La banque centrale rachète les titres vendus.`, pays: LEADER[adv] });
    }
    // Les réserves de l'adversaire en devises de ce camp se placent en titres de sa dette (dollars chinois en bons du Trésor).
    const ra = m.reserves[adv], expo = ra.stock * (c === "OCC" ? ra.occ : ra.brics);
    const cible = Math.min(0.35, 0.01 + 0.03 * expo); h.adverses += 0.1 * (cible - h.adverses);
    const t = h.interieur + h.allies + h.adverses; h.interieur /= t; h.allies /= t; h.adverses /= t;
    // Gel des réserves en devises du camp adverse quand la tension est forte.
    const r = m.reserves[c], exp = c === "CHN" ? r.occ : r.brics;
    if (e.tension >= 7 && exp > 0.2 && r.stock > 0 && tirer(e) < MON.gel) {
      const perte = r.stock * exp * 0.3; r.stock -= perte; if (c === "CHN") r.occ = (r.occ * (r.stock + perte) - perte) / r.stock; else r.brics = (r.brics * (r.stock + perte) - perte) / r.stock;
      r.or = 1 - r.occ - r.brics;
      annonces.push({ titre: `${NOM_CAMP[autre(c)]} gèle des réserves de ${NOM_CAMP[c]}`, texte: `Sur fond de tension, une partie des avoirs de ${NOM_CAMP[c]} en devises adverses est bloquée.`, pays: LEADER[c] });
    }
    // Excédents commerciaux recyclés en réserves, placées dans les devises de l'autre camp (dollars chinois en bons du Trésor).
    // Seul l'« atelier du monde » (la Chine, excédentaire) accumule ainsi ; les États-Unis sont déficitaires (estimation).
    const exc = c === "CHN" ? 0.15 * Math.max(0, RS.solde(e, LEADER[c], "industrie")) / 40 : 0;
    if (exc > 0) { const s0 = r.stock, s1 = s0 + exc; if (c === "CHN") r.occ = (r.occ * s0 + exc) / s1; else r.brics = (r.brics * s0 + exc) / s1; r.or = 1 - r.occ - r.brics; r.stock = s1; }
    m.decisions[c] = 0;
  }
  // Réserves mondiales : elles suivent lentement le poids économique, les sanctions, l'inflation et la tension (dédollarisation possible).
  const sCHN = partEco(e, "CHN") / (partEco(e, "OCC") + partEco(e, "CHN")), sanctions = Object.values(e.pays).filter(p => p.eco.OCC <= -60).length;
  const w = m.mondiales, occ0 = 0.86;
  const cibleOcc = Math.max(0.3, occ0 - 0.6 * Math.max(0, sCHN - m.partEco0) - 0.004 * sanctions - 0.02 * Math.max(0, m.inflation.OCC - 4));
  const cibleOr = Math.min(0.4, 0.13 + 0.01 * e.tension + 0.01 * m.defauts.OCC * 5);
  const cibleBrics = Math.max(0.01, 1 - cibleOcc - cibleOr);
  const k = 0.1, occ = partOccidentale(e), nOcc = occ + k * (cibleOcc - occ);
  w.dollar *= nOcc / occ; w.euro *= nOcc / occ; w.autresOcc *= nOcc / occ;
  w.or += k * (cibleOr - w.or); w.brics = Math.max(0, 1 - nOcc - w.or);
  void cibleBrics;
  return annonces;
}

// ---------- Effets monétaires et économiques des événements (evenements-eco.ts) ----------
export function effetEvenement(e: EtatV2, f: any): Ligne[] {
  const m = MN(e), camps: Camp[] = f.camp === "tous" ? ["OCC", "CHN"] : f.camp === "OCC" || f.camp === "CHN" ? [f.camp] : [];
  const sg = (v: number) => (v > 0 ? "+" : "") + String(Math.round(v * 10) / 10).replace(".", ",");
  if (f.type === "dette") { for (const c of camps) m.dette[c] = Math.max(0, m.dette[c] + f.valeur); return camps.map(c => ({ texte: `Dette ${NOM_CAMP[c]} ${sg(f.valeur)} pts`, camp: c, signe: -1 as const })); }
  if (f.type === "inflation") { for (const c of camps) m.inflation[c] += f.valeur; return camps.map(c => ({ texte: `Inflation ${NOM_CAMP[c]} ${sg(f.valeur)} pt`, camp: c, signe: (f.valeur > 0 ? -1 : 1) as 1 | -1 })); }
  if (f.type === "prime") { for (const c of camps) m.prime[c] += f.valeur; return camps.map(c => ({ texte: `Taux d'intérêt ${NOM_CAMP[c]} ${sg(f.valeur)} pt`, camp: c, signe: -1 as const })); }
  if (f.type === "reserves") { for (const c of camps) m.reserves[c].stock = Math.max(0, m.reserves[c].stock + f.valeur); return camps.map(c => ({ texte: `Réserves ${NOM_CAMP[c]} ${sg(f.valeur)}`, camp: c, signe: (f.valeur > 0 ? 1 : -1) as 1 | -1 })); }
  if (f.type === "mondiales") {
    const w = m.mondiales, occ = partOccidentale(e), d = f.occ ?? 0, n = Math.max(0.3, occ + d);
    w.dollar *= n / occ; w.euro *= n / occ; w.autresOcc *= n / occ; w.or = Math.max(0, w.or + (f.or ?? 0)); w.brics = Math.max(0, 1 - n - w.or);
    return [{ texte: `Réserves mondiales : devises occidentales ${sg(d * 100)} pts`, camp: "OCC", signe: d < 0 ? -1 : 1 }];
  }
  if (f.type === "solde" && e.pays[f.pays]) { RS.ajusterSolde(e, f.pays, f.bien, f.valeur); return []; }
  if (f.type === "blocage") { (e.blocages ??= []).push({ route: f.route, annee: e.annee }); return [{ texte: `Route bloquée cette année : ${f.route}`, signe: -1 }]; }
  return [];
}
