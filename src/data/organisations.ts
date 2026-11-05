// Appartenance des 194 pays aux grandes organisations (faits, 2000-2008), selon l'avancement de la partie.
import type { EtatPartie } from "../moteur/partie";

const OTAN = ["USA", "CAN", "GBR", "FRA", "DEU", "ITA", "ESP", "NLD", "NOR", "TUR", "POL", "BEL", "DNK", "GRC", "ISL", "LUX", "PRT", "CZE", "HUN"];
const OTAN_2004 = ["BGR", "EST", "LVA", "LTU", "ROU", "SVK", "SVN"]; // adhésion le 29 mars 2004
const UE_2000 = ["DEU", "FRA", "ITA", "ESP", "NLD", "GBR", "AUT", "BEL", "DNK", "FIN", "GRC", "IRL", "LUX", "PRT", "SWE"];
const UE_2004 = ["POL", "CZE", "EST", "CYP", "LVA", "LTU", "HUN", "MLT", "SVK", "SVN"], UE_2007 = ["BGR", "ROU"];
const G7 = ["USA", "JPN", "DEU", "GBR", "FRA", "ITA", "CAN"];
const OPEP = ["SAU", "IRN", "IRQ", "ARE", "QAT", "NGA", "VEN", "DZA", "IDN", "KWT", "LBY"];
const OPEP_2007 = ["AGO", "ECU"]; // Angola (janvier 2007), retour de l'Équateur (fin 2007)
const ASEAN = ["IDN", "THA", "MYS", "SGP", "PHL", "VNM", "BRN", "KHM", "LAO", "MMR"];
const CEI = ["RUS", "UKR", "KAZ", "ARM", "AZE", "BLR", "GEO", "KGZ", "MDA", "TJK", "TKM", "UZB"];
const OCS = ["CHN", "RUS", "KAZ", "KGZ", "TJK", "UZB"];
const BRIC = ["BRA", "RUS", "IND", "CHN"];
const NUCLEAIRES = ["USA", "RUS", "CHN", "GBR", "FRA", "IND", "PAK", "ISR"]; // Israël : arsenal non déclaré

export const SIGLES: Record<string, string> = {
  OTAN: "Organisation du traité de l'Atlantique nord", UE: "Union européenne", G7: "Groupe des sept grandes économies",
  OPEP: "Organisation des pays exportateurs de pétrole", ASEAN: "Association des nations de l'Asie du Sud-Est",
  CEI: "Communauté des États indépendants (anciennes républiques soviétiques)",
  OCS: "Organisation de coopération de Shanghai (depuis juin 2001)", BRIC: "Brésil, Russie, Inde, Chine (depuis septembre 2006)", "☢": "Puissance nucléaire",
};

export function organisations(e: EtatPartie): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const ajoute = (sigle: string, isos: string[]) => { for (const i of isos) (out[i] ??= []).push(sigle); };
  ajoute("OTAN", e.round >= 17 ? [...OTAN, ...OTAN_2004] : OTAN);
  ajoute("UE", [...UE_2000, ...(e.historiquesFaits.includes("h_elargissement") ? UE_2004 : []), ...(e.round >= 28 ? UE_2007 : [])]);
  ajoute("CEI", CEI);
  ajoute("G7", G7);
  ajoute("OPEP", e.round >= 28 ? [...OPEP, ...OPEP_2007] : OPEP);
  ajoute("ASEAN", ASEAN);
  if (e.historiquesFaits.includes("h_ocs")) ajoute("OCS", OCS);
  if (e.drapeaux.includes("bloc_bric")) ajoute("BRIC", BRIC);
  ajoute("☢", e.historiquesFaits.includes("h_coree_nord_essai") ? [...NUCLEAIRES, "PRK"] : NUCLEAIRES);
  return out;
}
