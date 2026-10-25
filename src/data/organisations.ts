// Appartenance des 50 pays aux grandes organisations (faits, 2000-2008), selon l'avancement de la partie.
import type { EtatPartie } from "../moteur/partie";

const OTAN = ["USA", "CAN", "GBR", "FRA", "DEU", "ITA", "ESP", "NLD", "NOR", "TUR", "POL"];
const UE_2000 = ["DEU", "FRA", "ITA", "ESP", "NLD", "GBR"];
const G7 = ["USA", "JPN", "DEU", "GBR", "FRA", "ITA", "CAN"];
const OPEP = ["SAU", "IRN", "IRQ", "ARE", "QAT", "NGA", "VEN", "DZA", "IDN"];
const ASEAN = ["IDN", "THA", "MYS", "SGP", "PHL", "VNM"];
const OCS = ["CHN", "RUS", "KAZ"];
const BRIC = ["BRA", "RUS", "IND", "CHN"];
const NUCLEAIRES = ["USA", "RUS", "CHN", "GBR", "FRA", "IND", "PAK", "ISR"]; // Israël : arsenal non déclaré

export const SIGLES: Record<string, string> = {
  OTAN: "Organisation du traité de l'Atlantique nord", UE: "Union européenne", G7: "Groupe des sept grandes économies",
  OPEP: "Organisation des pays exportateurs de pétrole", ASEAN: "Association des nations de l'Asie du Sud-Est",
  OCS: "Organisation de coopération de Shanghai (depuis juin 2001)", BRIC: "Brésil, Russie, Inde, Chine (depuis septembre 2006)", "☢": "Puissance nucléaire",
};

export function organisations(e: EtatPartie): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const ajoute = (sigle: string, isos: string[]) => { for (const i of isos) (out[i] ??= []).push(sigle); };
  ajoute("OTAN", OTAN);
  ajoute("UE", e.historiquesFaits.includes("h_elargissement") ? [...UE_2000, "POL"] : UE_2000);
  ajoute("G7", G7);
  ajoute("OPEP", OPEP);
  ajoute("ASEAN", ASEAN);
  if (e.historiquesFaits.includes("h_ocs")) ajoute("OCS", OCS);
  if (e.drapeaux.includes("bloc_bric")) ajoute("BRIC", BRIC);
  ajoute("☢", e.historiquesFaits.includes("h_coree_nord_essai") ? [...NUCLEAIRES, "PRK"] : NUCLEAIRES);
  return out;
}
