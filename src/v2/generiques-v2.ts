// Événements génériques pour les années projetées (après 2035), demande du 2 novembre 2026 : « monter à 10 à 12 événements par an ».
// Ils complètent les événements écrits (ruptures, projections) : chaque année, on tire assez d'événements génériques pour atteindre
// un total de 10 à 12. Familles pondérées par leur fréquence réelle (generiques.ts, ordre de grandeur 1900-2026), pays tirés selon
// leur exposition (pauvreté, instabilité, aléas, pétrole…), habillage avec une ville réelle et une cause (contextes.ts).
// Au plus un événement générique par pays et par an. Effets : ceux du modèle × gravité, tension et stabilité amorties (estimation).
import type { EvenementHistorique } from "../moteur/types";
import { FAMILLES, MODELES_LOT1 } from "../contenu/generiques";
import { CONTEXTES, VILLES, enPays, duPays, lePays } from "../contenu/contextes";
import { EXPOSITION, NON_DEMOCRATIES_2000 } from "../data/geographie";
import { type EtatV2, tirer, LEADER, partPays } from "./moteur";
import * as RS from "./ressources";
import * as SO from "./societe";
// Familles climatiques : leur fréquence croît avec le réchauffement (× 1 + 0,5 par degré au-dessus de +1 °C).
const CLIMATIQUES = new Set(["cyclone", "inondation", "tempete", "mega_incendie", "secheresse", "canicule", "record_climatique", "famine"]);

export const GEN = { debut: 2036, cibleMin: 10, cibleMax: 12, amortiTension: 0.3, amortiStab: 0.4 };
const GRAVITES: [number, number, string][] = [[0.5, 0.35, "mineur"], [1, 0.35, "modéré"], [1.5, 0.15, "sérieux"], [2, 0.1, "grave"], [3, 0.05, "majeur"]];
const choisir = <T>(e: EtatV2, l: T[], w: (x: T) => number): T => { const t = l.reduce((s, x) => s + w(x), 0); let r = tirer(e) * t; for (const x of l) { r -= w(x); if (r <= 0) return x; } return l[l.length - 1]; };

function poids(e: EtatV2, risque: string[], iso: string): number {
  const p = e.pays[iso], u = e.pays[LEADER.OCC], y = p.pib / Math.max(1, p.population), yU = u.pib / Math.max(1, u.population);
  let w = 1;
  for (const r of risque) {
    if (r === "pauvrete") w *= Math.sqrt(yU / Math.max(1e-9, y));
    else if (r === "richesse") w *= Math.sqrt(y / yU);
    else if (r === "instabilite") w *= ((100 - p.stabilite) / 50) ** 2;
    else if (r === "cyclone" || r === "seisme" || r === "volcan" || r === "secheresse") w *= (EXPOSITION as any)[r]?.includes(iso) ? 1 : 0.05;
    else if (r === "petrole") w *= RS.solde(e, iso, "energie") > 20 ? 1 : 0.05;
    else if (r === "population") w *= Math.sqrt(p.population / 3e7);
    else if (r === "democratie") w *= NON_DEMOCRATIES_2000.includes(iso) ? 0.1 : 1;
  }
  return w;
}
const remplir = (t: string, iso: string, nom: string, ville: string) => t.replace(/^\{pays\}/, lePays(iso, nom, true)).split("{ville}").join(ville).split("{en_pays}").join(enPays(iso, nom)).split("{du_pays}").join(duPays(iso, nom)).split("{pays}").join(nom);

export function generiquesAnnee(e: EtatV2, dejaPris: number): EvenementHistorique[] {
  if (e.annee < GEN.debut) return [];
  const cible = GEN.cibleMin + Math.floor(tirer(e) * (GEN.cibleMax - GEN.cibleMin + 1)), n = Math.max(0, cible - dejaPris);
  const out: EvenementHistorique[] = [], touches = new Set<string>(), isos = Object.keys(e.pays);
  for (let k = 0; k < n; k++) {
    const f = choisir(e, FAMILLES.filter(x => !x.monde), x => x.taux * (CLIMATIQUES.has(x.id) ? SO.multiplicateurClimat(e) : 1)), m = MODELES_LOT1.find(x => x.famille === f.id);
    if (!m) continue;
    const libres = isos.filter(i => !touches.has(i)), iso = choisir(e, libres, i => poids(e, m.risque as string[], i)); touches.add(iso);
    const [g, , nomG] = choisir(e, GRAVITES, x => x[1]), nom = e.pays[iso].nom, villes = VILLES[iso] ?? [nom], ville = villes[Math.floor(tirer(e) * villes.length)];
    const ctx = CONTEXTES[f.id], titre = ctx ? ctx.titres[Math.floor(tirer(e) * ctx.titres.length)] : m.titre, cause = ctx ? " " + ctx.causes[Math.floor(tirer(e) * ctx.causes.length)] : "";
    const effets = (m.effets as any[]).map(x => {
      const proche = partPays(e.pays[iso], "CHN") > partPays(e.pays[iso], "OCC") ? "CHN" : "OCC", loin = proche === "OCC" ? "CHN" : "OCC";
      const y = { ...x, pays: x.pays === "$pays" ? iso : x.pays, camp: x.camp === "$proche" ? proche : x.camp === "$lointain" ? loin : x.camp };
      if (y.type === "croissance") y.points *= g; else if (y.type === "stabilite") y.valeur = Math.round(y.valeur * g * GEN.amortiStab * 10) / 10;
      else if (y.type === "tension") y.valeur *= g * GEN.amortiTension; else if (typeof y.valeur === "number") y.valeur *= g;
      return y;
    });
    out.push({ id: `gen_${f.id}_${e.annee}_${k}`, annee: e.annee, trimestre: (1 + Math.floor(tirer(e) * 4)) as 1 | 2 | 3 | 4, titre: remplir(titre, iso, nom, ville) + (g >= 2 ? ` (${nomG})` : ""),
      texte: remplir(m.texte, iso, nom, ville) + remplir(cause, iso, nom, ville), pays: [iso], famille: f.id, deviable: true, conditions: [], effets });
  }
  return out;
}
