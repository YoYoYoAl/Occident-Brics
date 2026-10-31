// Complémentarité commerciale : ce que chaque pays a en trop (offre) ou en manque (besoin), d'après les données 2000.
// Seuils : choix de jeu (estimation), appliqués à des indicateurs réels (Banque mondiale, FAO via WDI, OWID).
//  - énergie : importations nettes > 20 % de la consommation = besoin ; < −30 % (exportateur net) = offre ;
//  - alimentation : production de céréales < 200 kg par habitant = besoin ; > 400 kg = offre ;
//  - métaux : métaux et minerais > 10 % des exportations de marchandises = offre ; pays industriel qui en exporte < 3 % = besoin ;
//  - produits industriels : PIB par habitant > 20 000 $ hors économies de rente (rentes naturelles < 10 % du PIB),
//    ou grands ateliers exportateurs de 2000 (liste, estimation) = offre ; PIB par habitant < 8 000 $ = besoin.
import attributs from "./attributs2000.json";
import donnees from "./pays2000.json";

export type Bien = "energie" | "alimentation" | "metaux" | "industrie";
export const NOMS_BIENS: Record<Bien, string> = { energie: "énergie", alimentation: "alimentation", metaux: "métaux", industrie: "produits industriels" };
export interface ProfilCommerce { offre: Bien[]; besoin: Bien[] }
const ATELIERS_2000 = ["CHN", "KOR", "TWN", "MEX", "MYS", "THA", "SGP"]; // estimation

type Valeurs = Record<string, { v: number } | null>;
const VAL = (attributs as unknown as { pays: Record<string, { valeurs: Valeurs }> }).pays;
export const PROFILS: Record<string, ProfilCommerce> = {};
for (const p of donnees.pays) {
  const v = (k: string) => VAL[p.iso3]?.valeurs[k]?.v, offre: Bien[] = [], besoin: Bien[] = [];
  const imp = v("importsEnergie"), cer = v("prodCereales"), pop = v("population") ?? p.indicateurs.population, met = v("exportsMetaux"), rentes = v("rentesNaturelles") ?? 0;
  const pibHab = p.indicateurs.pib / p.indicateurs.population;
  if (imp !== undefined) { if (imp > 20) besoin.push("energie"); else if (imp < -30) offre.push("energie"); }
  if (cer !== undefined && pop) { const kg = cer * 1000 / pop; if (kg < 200) besoin.push("alimentation"); else if (kg > 400) offre.push("alimentation"); }
  const industriel = (pibHab > 20000 && rentes < 10) || ATELIERS_2000.includes(p.iso3);
  if (industriel) offre.push("industrie"); else if (pibHab < 8000) besoin.push("industrie");
  if (met !== undefined) { if (met > 10) offre.push("metaux"); else if (industriel && met < 3) besoin.push("metaux"); }
  PROFILS[p.iso3] = { offre, besoin };
}
